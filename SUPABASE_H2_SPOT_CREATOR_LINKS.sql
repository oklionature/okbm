-- H2: 정보창 크리에이터 콘텐츠 (유튜브·네이버 블로그·인스타그램 게시물)
--
-- 다녀온 사람이 박지 정보창에서 자기 콘텐츠 링크를 바로 등록한다. 등록하면 바로 공개한다.
-- 순서: 신고 3건 이상은 맨 아래 → 추천 많은 순 → 최근 등록 순.
-- 쓰기는 모두 아래 함수로만(표에 직접 접근 불가). 관리자는 숨김·삭제할 수 있다.
--
-- 실행: Supabase SQL 편집기에서 이 파일 전체를 한 번 실행한다(여러 번 실행해도 된다).

CREATE TABLE IF NOT EXISTS public.spot_creator_links (
  id bigserial PRIMARY KEY,
  spot_id text NOT NULL,
  url text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('yt', 'blog', 'insta')),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 120),
  user_id text NOT NULL,
  author text NOT NULL DEFAULT '',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, url)
);
CREATE INDEX IF NOT EXISTS spot_creator_links_spot_idx ON public.spot_creator_links (spot_id);
CREATE INDEX IF NOT EXISTS spot_creator_links_user_idx ON public.spot_creator_links (user_id, created_at);

-- 한 사람이 한 링크에 추천(up) 또는 신고(report) 하나
CREATE TABLE IF NOT EXISTS public.spot_creator_link_votes (
  link_id bigint NOT NULL REFERENCES public.spot_creator_links (id) ON DELETE CASCADE,
  user_id text NOT NULL,
  vote text NOT NULL CHECK (vote IN ('up', 'report')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (link_id, user_id)
);

ALTER TABLE public.spot_creator_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_creator_link_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spot_creator_links FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.spot_creator_link_votes FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS spot_creator_links_no_client ON public.spot_creator_links;
CREATE POLICY spot_creator_links_no_client ON public.spot_creator_links FOR ALL USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS spot_creator_link_votes_no_client ON public.spot_creator_link_votes;
CREATE POLICY spot_creator_link_votes_no_client ON public.spot_creator_link_votes FOR ALL USING (false) WITH CHECK (false);

-- 주소 → 종류. 맞지 않으면 NULL
CREATE OR REPLACE FUNCTION public.okbm_creator_link_kind(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_url ~* '^https://(www\.|m\.)?youtube\.com/(watch\?([^#\s]*&)?v=|shorts/|live/)[A-Za-z0-9_-]{11}' THEN 'yt'
    WHEN p_url ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}' THEN 'yt'
    WHEN p_url ~* '^https://(m\.)?blog\.naver\.com/[A-Za-z0-9_-]+/[0-9]+' THEN 'blog'
    WHEN p_url ~* '^https://(m\.)?blog\.naver\.com/PostView\.naver\?.*logNo=[0-9]+' THEN 'blog'
    WHEN p_url ~* '^https://(www\.)?instagram\.com/(p|reel|reels|tv)/[A-Za-z0-9_-]+' THEN 'insta'
    ELSE NULL
  END;
$$;

-- 목록. 비회원도 볼 수 있다. 내 추천·신고 상태(my_vote)는 로그인했을 때만.
CREATE OR REPLACE FUNCTION public.get_spot_creator_links(p_spot_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_uid text;
  v_admin boolean := false;
  v_actor text;
BEGIN
  IF v_spot IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_spot_creator_links', 120) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    v_uid := public.okbm_uid();
    v_admin := COALESCE(public.okbm_is_admin(), false);
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sunk, x.ups DESC, x.created_at DESC)
    FROM (
      SELECT l.id, l.url, l.kind, l.title, l.author, l.user_id, l.created_at, l.hidden,
             COALESCE(v.ups, 0) AS ups,
             COALESCE(v.reports, 0) AS reports,
             COALESCE(v.reports, 0) >= 3 AS sunk,
             (SELECT mv.vote FROM public.spot_creator_link_votes mv
               WHERE mv.link_id = l.id AND v_uid IS NOT NULL AND mv.user_id = v_uid) AS my_vote,
             (v_uid IS NOT NULL AND l.user_id = v_uid) AS mine
      FROM public.spot_creator_links l
      LEFT JOIN LATERAL (
        SELECT count(*) FILTER (WHERE vt.vote = 'up') AS ups,
               count(*) FILTER (WHERE vt.vote = 'report') AS reports
        FROM public.spot_creator_link_votes vt
        WHERE vt.link_id = l.id
      ) v ON true
      WHERE l.spot_id = v_spot AND (NOT l.hidden OR v_admin)
    ) x
  ), '[]'::jsonb);
END;
$$;

-- 등록. 로그인 회원만. 박지당 1인 3개, 하루 10개, 같은 박지에 같은 주소는 한 번.
CREATE OR REPLACE FUNCTION public.add_spot_creator_link(p_spot_id text, p_url text, p_title text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_url text := btrim(COALESCE(p_url, ''));
  v_title text := left(btrim(regexp_replace(COALESCE(p_title, ''), '\s+', ' ', 'g')), 120);
  v_kind text;
  v_uid text;
  v_admin boolean;
  v_author text;
  v_id bigint;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  v_uid := public.okbm_uid();
  IF v_uid IS NULL OR btrim(v_uid) = '' THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  v_admin := COALESCE(public.okbm_is_admin(), false);
  IF NOT public.okbm_actor_rate_limit(v_uid, 'add_spot_creator_link', 10) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- http → https, 주소 뒤 공백·따옴표 정리
  v_url := regexp_replace(v_url, '^http://', 'https://', 'i');
  IF length(v_url) > 400 OR v_url ~ '[\s"''<>]' THEN
    RAISE EXCEPTION 'bad_url';
  END IF;
  v_kind := public.okbm_creator_link_kind(v_url);
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'bad_url';
  END IF;
  IF v_spot IS NULL OR NOT EXISTS (SELECT 1 FROM public.spots s WHERE s.id = v_spot) THEN
    RAISE EXCEPTION 'no_spot';
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_creator_links l WHERE l.spot_id = v_spot AND l.url = v_url) THEN
    RAISE EXCEPTION 'duplicate';
  END IF;
  IF NOT v_admin THEN
    IF (SELECT count(*) FROM public.spot_creator_links l WHERE l.spot_id = v_spot AND l.user_id = v_uid) >= 3 THEN
      RAISE EXCEPTION 'spot_limit';
    END IF;
    IF (SELECT count(*) FROM public.spot_creator_links l
        WHERE l.user_id = v_uid AND l.created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul') >= 10 THEN
      RAISE EXCEPTION 'day_limit';
    END IF;
  END IF;

  SELECT COALESCE(NULLIF(btrim(u.nickname), ''), '백패커') INTO v_author FROM public.users u WHERE u.id = v_uid;
  INSERT INTO public.spot_creator_links (spot_id, url, kind, title, user_id, author)
  VALUES (v_spot, v_url, v_kind, v_title, v_uid, COALESCE(v_author, '백패커'))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'kind', v_kind);
END;
$$;

-- 추천·신고. 같은 것을 다시 누르면 취소, 다른 것을 누르면 바꾼다. 내 링크에는 못 누른다.
CREATE OR REPLACE FUNCTION public.vote_spot_creator_link(p_link_id bigint, p_vote text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_vote text := lower(btrim(COALESCE(p_vote, '')));
  v_owner text;
  v_prev text;
  v_now text;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  v_uid := public.okbm_uid();
  IF v_uid IS NULL OR btrim(v_uid) = '' THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  IF v_vote NOT IN ('up', 'report') THEN
    RAISE EXCEPTION 'bad_vote';
  END IF;
  IF NOT public.okbm_actor_rate_limit(v_uid, 'vote_spot_creator_link', 30) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  SELECT l.user_id INTO v_owner FROM public.spot_creator_links l WHERE l.id = p_link_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF v_owner = v_uid THEN
    RAISE EXCEPTION 'own_link';
  END IF;

  SELECT vt.vote INTO v_prev FROM public.spot_creator_link_votes vt WHERE vt.link_id = p_link_id AND vt.user_id = v_uid;
  IF v_prev = v_vote THEN
    DELETE FROM public.spot_creator_link_votes WHERE link_id = p_link_id AND user_id = v_uid;
    v_now := NULL;
  ELSE
    INSERT INTO public.spot_creator_link_votes (link_id, user_id, vote) VALUES (p_link_id, v_uid, v_vote)
    ON CONFLICT (link_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, created_at = now();
    v_now := v_vote;
  END IF;

  RETURN jsonb_build_object(
    'my_vote', v_now,
    'ups', (SELECT count(*) FROM public.spot_creator_link_votes WHERE link_id = p_link_id AND vote = 'up'),
    'reports', (SELECT count(*) FROM public.spot_creator_link_votes WHERE link_id = p_link_id AND vote = 'report')
  );
END;
$$;

-- 삭제(올린 사람 또는 관리자)·숨김(관리자). p_action: 'delete' | 'hide' | 'show'
CREATE OR REPLACE FUNCTION public.manage_spot_creator_link(p_link_id bigint, p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_admin boolean;
  v_owner text;
  v_action text := lower(btrim(COALESCE(p_action, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;
  v_uid := public.okbm_uid();
  v_admin := COALESCE(public.okbm_is_admin(), false);
  SELECT l.user_id INTO v_owner FROM public.spot_creator_links l WHERE l.id = p_link_id;
  IF v_owner IS NULL THEN
    RETURN false;
  END IF;
  IF v_action = 'delete' AND (v_admin OR v_owner = v_uid) THEN
    DELETE FROM public.spot_creator_links WHERE id = p_link_id;
    RETURN true;
  END IF;
  IF v_action IN ('hide', 'show') AND v_admin THEN
    UPDATE public.spot_creator_links SET hidden = (v_action = 'hide') WHERE id = p_link_id;
    RETURN true;
  END IF;
  RAISE EXCEPTION 'forbidden';
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_creator_link_kind(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_creator_link_kind(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_spot_creator_links(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_creator_links(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_spot_creator_link(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_spot_creator_link(text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.vote_spot_creator_link(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_spot_creator_link(bigint, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.manage_spot_creator_link(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_spot_creator_link(bigint, text) TO authenticated, service_role;
