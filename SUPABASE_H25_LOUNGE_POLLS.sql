-- H25: 라운지 자유게시판 '투표' (2026-10-31)
-- 왜: '사는이야기' 칸(글 0개)을 '투표'로 바꾼다. 회원 누구나 질문과 보기 2~5개로 투표를 올리고, 회원이 하나를 고른다.
-- 어떻게:
--   · lounge_posts에 category 'poll'과 보기(poll_options, 문자열 배열)·마감(poll_ends_at, 없으면 마감 없음)을 더한다.
--     보기·마감은 올린 뒤 못 바꾼다(투표가 쌓인 뒤 보기가 바뀌면 결과가 어긋난다). 제목·본문은 지금처럼 고칠 수 있다.
--   · 표는 lounge_poll_votes. 한 사람이 한 번, 고른 뒤엔 못 바꾼다. 클라이언트는 표를 직접 못 읽고 함수로만 쓴다.
--   · okbm_poll_vote(글, 보기 번호): 투표하고 결과를 돌려준다. 회원만, 마감 전만.
--   · okbm_poll_results(글 id 배열): 참여 수는 누구나, 보기별 수는 내가 투표했거나 마감된 투표만. 누가 뭘 골랐는지는 안 준다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: DROP FUNCTION public.okbm_poll_vote(uuid, integer); DROP FUNCTION public.okbm_poll_results(uuid[]);
--   DROP TABLE public.lounge_poll_votes; DROP TRIGGER trg_lounge_posts_guard_poll ON public.lounge_posts;
--   (poll 글을 지운 뒤) 분류 CHECK를 예전 셋으로 되돌리고 poll_options·poll_ends_at 칼럼을 지운다.

-- 1. 글 표: 분류 'poll' + 보기·마감 칼럼
ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_category_check;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_category_check
  CHECK (category IN ('backpacking', 'life', 'poll', 'suggestion'));
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS poll_options jsonb;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS poll_ends_at timestamptz;
ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_poll_shape;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_poll_shape CHECK (
  (category = 'poll') = (poll_options IS NOT NULL)
  AND (poll_options IS NULL OR (jsonb_typeof(poll_options) = 'array' AND jsonb_array_length(poll_options) BETWEEN 2 AND 5))
  AND (poll_ends_at IS NULL OR category = 'poll')
);

-- 보기는 앞뒤 공백을 떼고 1~40자, 겹치면 안 된다. 마감은 1시간 뒤~31일 안.
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_poll()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_opts jsonb := '[]'::jsonb;
  v text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.poll_options := OLD.poll_options;
    NEW.poll_ends_at := OLD.poll_ends_at;
    RETURN NEW;
  END IF;
  IF NEW.category IS DISTINCT FROM 'poll' THEN
    NEW.poll_options := NULL;
    NEW.poll_ends_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.poll_options IS NULL OR jsonb_typeof(NEW.poll_options) <> 'array' THEN
    RAISE EXCEPTION 'invalid_poll' USING ERRCODE = 'P0001';
  END IF;
  FOR v IN SELECT CASE WHEN jsonb_typeof(e) = 'string' THEN btrim(e #>> '{}') END FROM jsonb_array_elements(NEW.poll_options) AS e LOOP
    IF v IS NULL OR char_length(v) NOT BETWEEN 1 AND 40 OR v_opts ? v THEN
      RAISE EXCEPTION 'invalid_poll' USING ERRCODE = 'P0001';
    END IF;
    v_opts := v_opts || to_jsonb(v);
  END LOOP;
  IF jsonb_array_length(v_opts) NOT BETWEEN 2 AND 5 THEN
    RAISE EXCEPTION 'invalid_poll' USING ERRCODE = 'P0001';
  END IF;
  NEW.poll_options := v_opts;
  IF NEW.poll_ends_at IS NOT NULL AND (NEW.poll_ends_at < now() + interval '1 hour' OR NEW.poll_ends_at > now() + interval '31 days') THEN
    RAISE EXCEPTION 'invalid_poll_end' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_poll() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_lounge_posts_guard_poll ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard_poll
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_poll();

-- 2. 표 (글이 지워지면 같이 지워진다)
CREATE TABLE IF NOT EXISTS public.lounge_poll_votes (
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  choice smallint NOT NULL CHECK (choice BETWEEN 0 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.lounge_poll_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lounge_poll_votes FROM PUBLIC, anon, authenticated;

-- 3. 결과: [{post_id, total, counts(보기 순서, 못 보면 null), mine(내 보기 번호|null), closed}]
CREATE OR REPLACE FUNCTION public.okbm_poll_results(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_uid text := CASE WHEN auth.uid() IS NOT NULL THEN public.okbm_uid() END;
  v_actor text;
  v_out jsonb;
BEGIN
  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'poll_results', 120) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'post_id', x.id, 'total', x.total, 'mine', x.mine, 'closed', x.closed,
    'counts', CASE WHEN x.mine IS NOT NULL OR x.closed OR v_is_service THEN x.counts END
  )), '[]'::jsonb) INTO v_out FROM (
    SELECT p.id,
      (p.poll_ends_at IS NOT NULL AND p.poll_ends_at <= now()) AS closed,
      (SELECT count(*) FROM public.lounge_poll_votes v WHERE v.post_id = p.id)::int AS total,
      (SELECT v.choice FROM public.lounge_poll_votes v WHERE v.post_id = p.id AND v.user_id = v_uid)::int AS mine,
      (SELECT jsonb_agg((SELECT count(*) FROM public.lounge_poll_votes v WHERE v.post_id = p.id AND v.choice = g.i)::int ORDER BY g.i)
         FROM generate_series(0, jsonb_array_length(p.poll_options) - 1) AS g(i)) AS counts
    FROM public.lounge_posts p
    WHERE p.id = ANY ((p_ids)[1:50]) AND p.category = 'poll'
  ) x;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_poll_results(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_poll_results(uuid[]) TO anon, authenticated, service_role;

-- 4. 투표: 회원(익명 로그인 제외)만, 마감 전, 한 번. 이미 했으면 그대로 두고 결과만 준다.
CREATE OR REPLACE FUNCTION public.okbm_poll_vote(p_post_id uuid, p_choice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_post record;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'login_required' USING ERRCODE = 'P0001';
  END IF;
  v_uid := public.okbm_uid();
  PERFORM public.okbm_rpc_rate_limit('poll_vote', 30);
  SELECT id, poll_options, poll_ends_at INTO v_post FROM public.lounge_posts WHERE id = p_post_id AND category = 'poll';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_post.poll_ends_at IS NOT NULL AND v_post.poll_ends_at <= now() THEN
    RAISE EXCEPTION 'poll_closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= jsonb_array_length(v_post.poll_options) THEN
    RAISE EXCEPTION 'invalid_choice' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.lounge_poll_votes (post_id, user_id, choice)
  VALUES (p_post_id, v_uid, p_choice)
  ON CONFLICT (post_id, user_id) DO NOTHING;
  RETURN public.okbm_poll_results(ARRAY[p_post_id]) -> 0;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_poll_vote(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_poll_vote(uuid, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT public.okbm_poll_results(ARRAY[]::uuid[]) AS sample;
