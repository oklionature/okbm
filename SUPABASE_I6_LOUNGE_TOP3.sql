-- I6 라운지 'TOP 3' 설문 (2026-11-07, 대표님: 보기를 정하지 않고 참여자가 1·2·3위를 직접 적게)
-- 왜: 지금 설문은 올리는 사람이 보기를 2~5개 정해야 해서 올리기 힘들다. 질문만 올리고 답은 참여자가 고르거나 적는다.
-- 어떻게:
--   · lounge_posts에 poll_kind('top3', 없으면 지금 같은 보기 고르기)와 poll_source(답을 어디서 고르나: spot 박지 목록 · gear 장비 목록 · free 직접 적기).
--     TOP 3 설문은 poll_options 없이 분류 'poll'로 올린다. 종류·답 고르는 곳·마감은 올린 뒤 못 바꾼다.
--   · 답은 lounge_top3_answers. 한 사람이 1위만 적어도 되고 2·3위는 선택. 같은 답을 두 칸에 못 넣는다. 마감 전엔 고쳐 쓸 수 있다.
--     답 열쇠(item_key): 박지 s:<spots.id>, 장비 g:<gears.id>, 직접 적은 글 t:<소문자·띄어쓰기 뺀 글>(같은 글은 같은 답으로 묶인다).
--     박지·장비 이름은 서버가 spots·gears 표에서 다시 읽어 적는다(화면이 보낸 이름을 믿지 않음).
--   · okbm_top3_submit(글, 답 배열): 내 답을 통째로 바꾸고 결과를 돌려준다. 회원만, 마감 전만. 처음 답하면 투표 참여와 같은 낭만 포인트(2점, 하루 10점).
--   · okbm_top3_results(글 id 배열): 참여 수·지금 1위는 누구나. 전체 순위(1위 3점·2위 2점·3위 1점 합, 같으면 1위로 꼽은 수)는
--     내가 답했거나 마감됐거나 관리자일 때만. 누가 뭘 적었는지는 안 준다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전. 화면(lounge.js) 배포 전에 먼저 실행해야 한다(POST_COLS에 새 칸이 들어감).
-- 되돌리기: (TOP 3 글을 지운 뒤) DROP FUNCTION public.okbm_top3_submit(uuid, jsonb), public.okbm_top3_results(uuid[]);
--   DROP TABLE public.lounge_top3_answers; SUPABASE_H25의 lounge_posts_poll_shape·okbm_lounge_guard_poll을 다시 실행하고 poll_kind·poll_source 칼럼을 지운다.

-- 1. 글 표: TOP 3 종류·답 고르는 곳
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS poll_kind text;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS poll_source text;

ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_poll_shape;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_poll_shape CHECK (
  (category = 'poll') = (poll_options IS NOT NULL OR poll_kind IS NOT NULL)
  AND (poll_options IS NULL OR (jsonb_typeof(poll_options) = 'array' AND jsonb_array_length(poll_options) BETWEEN 2 AND 5))
  AND (poll_ends_at IS NULL OR category = 'poll')
  AND (poll_kind IS NULL OR (poll_kind = 'top3' AND category = 'poll' AND poll_options IS NULL))
  AND ((poll_kind IS NOT NULL) = (poll_source IS NOT NULL))
  AND (poll_source IS NULL OR poll_source IN ('spot', 'gear', 'free'))
);

-- 보기 고르기: 보기는 앞뒤 공백을 떼고 1~40자, 겹치면 안 된다(H25 그대로). TOP 3: 보기 없이 답 고르는 곳만. 마감은 1시간 뒤~31일 안.
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
    NEW.poll_kind := OLD.poll_kind;
    NEW.poll_source := OLD.poll_source;
    RETURN NEW;
  END IF;
  IF NEW.category IS DISTINCT FROM 'poll' THEN
    NEW.poll_options := NULL;
    NEW.poll_ends_at := NULL;
    NEW.poll_kind := NULL;
    NEW.poll_source := NULL;
    RETURN NEW;
  END IF;
  IF NEW.poll_ends_at IS NOT NULL AND (NEW.poll_ends_at < now() + interval '1 hour' OR NEW.poll_ends_at > now() + interval '31 days') THEN
    RAISE EXCEPTION 'invalid_poll_end' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.poll_kind IS NOT NULL THEN
    IF NEW.poll_kind <> 'top3' OR NEW.poll_source IS NULL OR NEW.poll_source NOT IN ('spot', 'gear', 'free') THEN
      RAISE EXCEPTION 'invalid_poll' USING ERRCODE = 'P0001';
    END IF;
    NEW.poll_options := NULL;
    RETURN NEW;
  END IF;
  NEW.poll_source := NULL;
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
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_poll() FROM PUBLIC, anon, authenticated;

-- 2. 답 표 (글이 지워지면 같이 지워진다). 화면은 표를 직접 못 읽고 함수로만 쓴다
CREATE TABLE IF NOT EXISTS public.lounge_top3_answers (
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  rank smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  item_key text NOT NULL CHECK (char_length(item_key) BETWEEN 3 AND 80),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, rank),
  UNIQUE (post_id, user_id, item_key)
);
CREATE INDEX IF NOT EXISTS lounge_top3_answers_post_key ON public.lounge_top3_answers (post_id, item_key);
ALTER TABLE public.lounge_top3_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lounge_top3_answers FROM PUBLIC, anon, authenticated;

-- 3. 결과: [{post_id, total, closed, mine([{rank,key,label}]|null), leader({key,label,score,firsts}|null), top([...]|null)}]
CREATE OR REPLACE FUNCTION public.okbm_top3_results(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_uid text := CASE WHEN auth.uid() IS NOT NULL THEN public.okbm_uid() END;
  v_admin boolean := false;
  v_actor text;
  v_out jsonb;
BEGIN
  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'top3_results', 120) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
    IF auth.uid() IS NOT NULL THEN v_admin := COALESCE(public.okbm_is_admin(), false); END IF;
  END IF;
  WITH posts AS (
    SELECT p.id, (p.poll_ends_at IS NOT NULL AND p.poll_ends_at <= now()) AS closed
    FROM public.lounge_posts p
    WHERE p.id = ANY ((p_ids)[1:50]) AND p.category = 'poll' AND p.poll_kind = 'top3'
  ), ranked AS (
    SELECT a.post_id, a.item_key,
      (array_agg(a.label ORDER BY a.created_at DESC))[1] AS label,
      sum(4 - a.rank)::int AS score,
      count(*) FILTER (WHERE a.rank = 1)::int AS firsts
    FROM public.lounge_top3_answers a
    WHERE a.post_id IN (SELECT id FROM posts)
    GROUP BY a.post_id, a.item_key
  ), ordered AS (
    SELECT r.*, row_number() OVER (PARTITION BY r.post_id ORDER BY r.score DESC, r.firsts DESC, r.label) AS n
    FROM ranked r
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'post_id', x.id, 'closed', x.closed, 'total', x.total, 'mine', x.mine, 'leader', x.leader,
    'top', CASE WHEN x.mine IS NOT NULL OR x.closed OR v_is_service OR v_admin THEN x.top END
  )), '[]'::jsonb) INTO v_out FROM (
    SELECT p.id, p.closed,
      (SELECT count(DISTINCT a.user_id) FROM public.lounge_top3_answers a WHERE a.post_id = p.id)::int AS total,
      (SELECT jsonb_agg(jsonb_build_object('rank', a.rank, 'key', a.item_key, 'label', a.label) ORDER BY a.rank)
         FROM public.lounge_top3_answers a WHERE a.post_id = p.id AND a.user_id = v_uid) AS mine,
      (SELECT jsonb_build_object('key', o.item_key, 'label', o.label, 'score', o.score, 'firsts', o.firsts)
         FROM ordered o WHERE o.post_id = p.id AND o.n = 1) AS leader,
      (SELECT jsonb_agg(jsonb_build_object('key', o.item_key, 'label', o.label, 'score', o.score, 'firsts', o.firsts) ORDER BY o.n)
         FROM ordered o WHERE o.post_id = p.id AND o.n <= 50) AS top
    FROM posts p
  ) x;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_top3_results(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_top3_results(uuid[]) TO anon, authenticated, service_role;

-- 4. 답하기: 회원(익명 로그인 제외)만, 마감 전. p_answers = [{key, label}, …] 1위부터 1~3개. 내 답을 통째로 바꾼다.
CREATE OR REPLACE FUNCTION public.okbm_top3_submit(p_post_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_post record;
  v_rank int := 0;
  v_e jsonb;
  v_key text;
  v_label text;
  v_id text;
  v_keys text[] := ARRAY[]::text[];
  v_first boolean;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'login_required' USING ERRCODE = 'P0001';
  END IF;
  v_uid := public.okbm_uid();
  PERFORM public.okbm_rpc_rate_limit('top3_submit', 30);
  SELECT id, poll_source, poll_ends_at INTO v_post FROM public.lounge_posts
   WHERE id = p_post_id AND category = 'poll' AND poll_kind = 'top3';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_post.poll_ends_at IS NOT NULL AND v_post.poll_ends_at <= now() THEN
    RAISE EXCEPTION 'poll_closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' OR jsonb_array_length(p_answers) NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'invalid_answer' USING ERRCODE = 'P0001';
  END IF;

  v_first := NOT EXISTS (SELECT 1 FROM public.lounge_top3_answers WHERE post_id = p_post_id AND user_id = v_uid);
  DELETE FROM public.lounge_top3_answers WHERE post_id = p_post_id AND user_id = v_uid;

  FOR v_e IN SELECT e FROM jsonb_array_elements(p_answers) AS e LOOP
    v_rank := v_rank + 1;
    v_key := btrim(COALESCE(v_e ->> 'key', ''));
    v_label := btrim(regexp_replace(COALESCE(v_e ->> 'label', ''), '\s+', ' ', 'g'));
    v_id := substr(v_key, 3);
    IF v_post.poll_source = 'spot' AND v_key ~ '^s:[A-Za-z0-9_-]{1,40}$' THEN
      SELECT btrim(s.spot_main) INTO v_label FROM public.spots s WHERE s.id::text = v_id;
      IF v_label IS NULL OR v_label = '' THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE = 'P0001'; END IF;
    ELSIF v_post.poll_source = 'gear' AND v_key ~ '^g:[A-Za-z0-9_-]{1,40}$' THEN
      SELECT btrim(g.item_name) INTO v_label FROM public.gears g WHERE g.id::text = v_id;
      IF v_label IS NULL OR v_label = '' THEN RAISE EXCEPTION 'invalid_answer' USING ERRCODE = 'P0001'; END IF;
    ELSE
      -- 직접 적은 글: 1~40자. 소문자로 바꾸고 띄어쓰기를 빼서 같은 글을 한 답으로 묶는다
      IF char_length(v_label) NOT BETWEEN 1 AND 40 THEN
        RAISE EXCEPTION 'invalid_answer' USING ERRCODE = 'P0001';
      END IF;
      v_key := 't:' || lower(regexp_replace(v_label, '\s+', '', 'g'));
    END IF;
    IF v_key = ANY (v_keys) THEN
      RAISE EXCEPTION 'duplicate_answer' USING ERRCODE = 'P0001';
    END IF;
    v_keys := v_keys || v_key;
    INSERT INTO public.lounge_top3_answers (post_id, user_id, rank, item_key, label)
    VALUES (p_post_id, v_uid, v_rank, v_key, left(v_label, 60));
  END LOOP;

  IF v_first THEN
    PERFORM public.okbm_point_award(v_uid, 'vote', p_post_id::text, 2, 10);
  END IF;
  RETURN public.okbm_top3_results(ARRAY[p_post_id]) -> 0;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_top3_submit(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_top3_submit(uuid, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT public.okbm_top3_results(ARRAY[]::uuid[]) AS sample;
