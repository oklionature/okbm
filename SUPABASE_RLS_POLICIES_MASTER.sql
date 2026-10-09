-- =========================================================================
-- 낭만루트 철통 RLS + 네이버/카카오 Auth 브릿지 지원 스크립트
--
-- 적용 위치: Supabase Dashboard > SQL Editor > RUN
-- 전제: auth-naver / auth-kakao / delete-account Edge Function이 배포되어
--       클라이언트가 supabase.auth.setSession()으로 정식 JWT를 갖게 됨.
--
-- 핵심:
-- 1) 기존 FOR ALL USING (true) 정책을 전부 폐기
-- 2) auth.jwt() app_metadata.okbm_user_id / {provider}_id 또는 auth.identities로 본인만 쓰기
-- 3) users 이메일은 본인만, 공개 프로필은 get_public_profile(p_id) 단건 RPC만
-- 4) okbm_stamp_okbm_user_id는 authenticated에서 회수. 네이버/카카오는
--    issueSocialSession이 app_metadata.okbm_user_id를 심으므로 클라이언트 스탬프 불필요.
-- 5) 정책 안의 okbm_uid()/okbm_is_admin()/auth.uid()는 (SELECT ...)로 감싸
--    쿼리당 1회만 평가(initPlan)되게 한다. 행마다 재실행하지 않음.
--
-- 전체를 한 트랜잭션으로 실행한다. 중간에 오류가 나면 전부 롤백되어
-- "정책이 모두 DROP된 상태"로 남지 않는다.
-- pg_cron 작업은 SUPABASE_OPS_CRON.sql에서 따로 실행한다.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 0. 헬퍼 함수
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_find_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  -- 1순위: email 원본 비교 (auth.users 이메일 인덱스 사용. GoTrue는 소문자로 저장하며
  -- 2026-09-27 기준 대소문자 섞인 이메일 0건). 못 찾을 때만 lower() 전체 비교로 보완.
  SELECT COALESCE(
    (SELECT u.id FROM auth.users u WHERE u.email = lower(btrim(p_email)) LIMIT 1),
    (SELECT u.id FROM auth.users u WHERE lower(u.email) = lower(btrim(p_email)) LIMIT 1)
  )
  WHERE p_email IS NOT NULL
    AND btrim(p_email) <> '';
$$;

REVOKE ALL ON FUNCTION public.okbm_find_auth_user_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_find_auth_user_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.okbm_find_auth_user_by_provider(p_provider text, p_provider_id text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE NULLIF(btrim(p_provider), '') IS NOT NULL
    AND NULLIF(btrim(p_provider_id), '') IS NOT NULL
    AND lower(btrim(p_provider)) IN ('kakao', 'naver', 'apple', 'google')
    AND (
      raw_app_meta_data ->> (lower(btrim(p_provider)) || '_id') = btrim(p_provider_id)
      OR raw_app_meta_data ->> (lower(btrim(p_provider)) || '_id')
         = lower(btrim(p_provider)) || '_' || btrim(p_provider_id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.okbm_find_auth_user_by_provider(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_find_auth_user_by_provider(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.okbm_uid()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_okbm text;
  uid uuid;
  found_id text;
  jwt_provider text;
  jwt_provider_id text;
  ident_provider text;
  ident_provider_id text;
  scoped_id text;
BEGIN
  jwt_okbm := NULLIF(btrim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'okbm_user_id', '')), '');
  IF jwt_okbm IS NOT NULL THEN
    SELECT u.id INTO found_id FROM public.users u WHERE u.id = jwt_okbm LIMIT 1;
    IF found_id IS NOT NULL THEN
      RETURN found_id;
    END IF;
    IF jwt_okbm LIKE 'kakao_%' THEN
      SELECT u.id INTO found_id FROM public.users u WHERE u.id = substr(jwt_okbm, 7) LIMIT 1;
      IF found_id IS NOT NULL THEN
        RETURN found_id;
      END IF;
    ELSIF jwt_okbm ~ '^[0-9]+$' THEN
      SELECT u.id INTO found_id FROM public.users u WHERE u.id = 'kakao_' || jwt_okbm LIMIT 1;
      IF found_id IS NOT NULL THEN
        RETURN found_id;
      END IF;
    END IF;
    RETURN jwt_okbm;
  END IF;

  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.id INTO found_id FROM public.users u WHERE u.id = uid::text LIMIT 1;
  IF found_id IS NOT NULL THEN
    RETURN found_id;
  END IF;

  jwt_provider := NULLIF(lower(btrim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'provider', ''))), '');
  IF jwt_provider IN ('kakao', 'naver', 'apple', 'google') THEN
    jwt_provider_id := NULLIF(btrim(COALESCE(auth.jwt() -> 'app_metadata' ->> (jwt_provider || '_id'), '')), '');
    IF jwt_provider_id IS NOT NULL THEN
      scoped_id := CASE
        WHEN jwt_provider_id LIKE jwt_provider || '_%' THEN jwt_provider_id
        ELSE jwt_provider || '_' || jwt_provider_id
      END;
      SELECT u.id INTO found_id FROM public.users u WHERE u.id = scoped_id LIMIT 1;
      IF found_id IS NOT NULL THEN
        RETURN found_id;
      END IF;
      RETURN scoped_id;
    END IF;
  END IF;

  SELECT i.provider, i.provider_id
    INTO ident_provider, ident_provider_id
  FROM auth.identities i
  WHERE i.user_id = uid
    AND i.provider IN ('google', 'apple', 'kakao', 'naver')
  ORDER BY i.updated_at DESC NULLS LAST
  LIMIT 1;

  ident_provider := NULLIF(lower(btrim(COALESCE(ident_provider, ''))), '');
  ident_provider_id := NULLIF(btrim(COALESCE(ident_provider_id, '')), '');
  IF ident_provider IS NOT NULL AND ident_provider_id IS NOT NULL THEN
    scoped_id := CASE
      WHEN ident_provider_id LIKE ident_provider || '_%' THEN ident_provider_id
      ELSE ident_provider || '_' || ident_provider_id
    END;
    SELECT u.id INTO found_id FROM public.users u WHERE u.id = scoped_id LIMIT 1;
    IF found_id IS NOT NULL THEN
      RETURN found_id;
    END IF;
    RETURN scoped_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_uid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_uid() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.okbm_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = public.okbm_uid()
      AND is_admin IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.okbm_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_is_admin() TO anon, authenticated, service_role;

-- RPC 분당 호출 제한. Data API로는 읽기/쓰기 불가.
CREATE TABLE IF NOT EXISTS public.okbm_rpc_rate_limits (
  actor_id text NOT NULL,
  rpc_name text NOT NULL,
  window_start timestamptz NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (actor_id, rpc_name)
);

ALTER TABLE public.okbm_rpc_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_rpc_rate_limits FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS okbm_rpc_rate_limits_no_client ON public.okbm_rpc_rate_limits;
CREATE POLICY okbm_rpc_rate_limits_no_client ON public.okbm_rpc_rate_limits
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.okbm_rpc_rate_limit(p_rpc_name text, p_max_per_minute integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_window timestamptz := date_trunc('minute', now());
  v_limit integer := COALESCE(p_max_per_minute, 60);
  v_count integer;
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    RETURN;
  END IF;
  v_actor := COALESCE(auth.uid()::text, '');
  IF v_actor = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_rpc_name IS NULL OR btrim(p_rpc_name) = '' THEN
    RAISE EXCEPTION 'rpc name required';
  END IF;
  IF v_limit < 1 THEN
    v_limit := 60;
  END IF;

  INSERT INTO public.okbm_rpc_rate_limits AS r (actor_id, rpc_name, window_start, call_count)
  VALUES (v_actor, btrim(p_rpc_name), v_window, 1)
  ON CONFLICT (actor_id, rpc_name)
  DO UPDATE SET
    call_count = CASE
      WHEN r.window_start IS NOT DISTINCT FROM EXCLUDED.window_start THEN r.call_count + 1
      ELSE 1
    END,
    window_start = EXCLUDED.window_start
  RETURNING r.call_count INTO v_count;

  IF v_count > v_limit THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_rpc_rate_limit(text, integer) FROM PUBLIC, anon, authenticated;

-- 요청 IP (익명 rate limit 키). 클라이언트 직접 호출 불가, DEFINER 함수 안에서만 사용.
-- x-forwarded-for 첫 값은 게이트웨이가 정리하지 않으면 위조 가능하므로
-- Cloudflare가 덮어쓰는 cf-connecting-ip를 우선한다. "마지막 값"은 공용 프록시 IP일 수 있어
-- 모든 익명 사용자가 한 버킷을 공유할 위험이 있어 쓰지 않는다.
-- C5-1 확인(2026-09-27): 운영 요청에 cf-connecting-ip가 실제 클라이언트 IP로 들어오고,
-- 클라이언트가 CF-Connecting-IP를 직접 넣으면 Cloudflare가 403(1000)으로 거부한다.
CREATE OR REPLACE FUNCTION public.okbm_request_ip()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_headers text := current_setting('request.headers', true);
  v_ip text := '';
BEGIN
  IF v_headers IS NOT NULL AND btrim(v_headers) <> '' THEN
    BEGIN
      v_ip := btrim(COALESCE(
        NULLIF(btrim((v_headers::json)->>'cf-connecting-ip'), ''),
        NULLIF(btrim(split_part(COALESCE((v_headers::json)->>'x-forwarded-for', ''), ',', 1)), ''),
        NULLIF(btrim((v_headers::json)->>'x-real-ip'), ''),
        ''
      ));
    EXCEPTION WHEN others THEN
      v_ip := '';
    END;
  END IF;
  RETURN left(COALESCE(NULLIF(v_ip, ''), 'anon'), 80);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_request_ip() FROM PUBLIC, anon, authenticated;

-- 행위자 키를 직접 받는 분당 제한. 익명(IP)·Edge Function(사용자 id)용.
-- true = 허용, false = 초과. 클라이언트 직접 호출 불가(service_role 전용).
CREATE OR REPLACE FUNCTION public.okbm_actor_rate_limit(p_actor text, p_name text, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := left(btrim(COALESCE(p_actor, '')), 120);
  v_name text := left(btrim(COALESCE(p_name, '')), 80);
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
BEGIN
  IF v_actor = '' OR v_name = '' THEN
    RETURN false;
  END IF;
  INSERT INTO public.okbm_rpc_rate_limits AS r (actor_id, rpc_name, window_start, call_count)
  VALUES (v_actor, v_name, v_window, 1)
  ON CONFLICT (actor_id, rpc_name)
  DO UPDATE SET
    call_count = CASE
      WHEN r.window_start IS NOT DISTINCT FROM EXCLUDED.window_start THEN r.call_count + 1
      ELSE 1
    END,
    window_start = EXCLUDED.window_start
  RETURNING r.call_count INTO v_count;
  RETURN v_count <= GREATEST(COALESCE(p_max, 60), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_actor_rate_limit(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_actor_rate_limit(text, text, integer) TO service_role;

-- 오래된 제한 행 정리 (SUPABASE_OPS_CRON.sql의 pg_cron 작업이 호출)
CREATE INDEX IF NOT EXISTS okbm_rpc_rate_limits_window_idx
  ON public.okbm_rpc_rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.okbm_stamp_okbm_user_id(p_okbm_user_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_id text := btrim(COALESCE(p_okbm_user_id, ''));
  v_provider text;
  v_provider_id text;
  v_expected text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF v_id IS NULL OR v_id = '' THEN
    RAISE EXCEPTION 'okbm_user_id required';
  END IF;

  v_provider := NULLIF(lower(btrim(COALESCE(auth.jwt() -> 'app_metadata' ->> 'provider', ''))), '');
  IF v_provider IS NULL OR v_provider NOT IN ('kakao', 'naver', 'apple', 'google') THEN
    RAISE EXCEPTION 'provider missing';
  END IF;

  v_provider_id := NULLIF(btrim(COALESCE(auth.jwt() -> 'app_metadata' ->> (v_provider || '_id'), '')), '');
  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'provider id missing';
  END IF;

  v_expected := CASE
    WHEN v_provider_id LIKE v_provider || '_%' THEN v_provider_id
    ELSE v_provider || '_' || v_provider_id
  END;
  IF v_id IS DISTINCT FROM v_expected AND v_id IS DISTINCT FROM v_provider_id THEN
    RAISE EXCEPTION 'okbm_user_id does not match provider id';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('okbm_user_id', v_expected)
  WHERE id = auth.uid();

  RETURN v_expected;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_stamp_okbm_user_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_stamp_okbm_user_id(text) TO service_role;

CREATE OR REPLACE FUNCTION public.okbm_guard_users_admin_col()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  IF TG_OP = 'INSERT' AND auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.is_admin := COALESCE(NEW.is_admin, false);
    IF NEW.is_admin IS TRUE THEN
      NEW.is_admin := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_okbm_guard_users_admin_col ON public.users;
CREATE TRIGGER trg_okbm_guard_users_admin_col
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_users_admin_col();

CREATE OR REPLACE VIEW public.user_public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  nickname,
  photo_url,
  hero_cover_url,
  bio,
  created_at,
  COALESCE(my_gears -> 'sns' ->> 'instagram', '') AS instagram,
  COALESCE(my_gears -> 'sns' ->> 'youtube', '') AS youtube,
  COALESCE(my_gears -> 'sns' ->> 'blog', '') AS blog
FROM public.users;

-- 목록 SELECT는 Data API에서 차단. 공개 프로필은 get_public_profile 단건 RPC만.
REVOKE ALL ON TABLE public.user_public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_public_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    PERFORM public.okbm_rpc_rate_limit('get_public_profile', 120);
  END IF;
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', u.id,
    'nickname', u.nickname,
    'photo_url', u.photo_url,
    'hero_cover_url', u.hero_cover_url,
    'bio', u.bio,
    'created_at', u.created_at,
    'instagram', COALESCE(u.my_gears -> 'sns' ->> 'instagram', ''),
    'youtube', COALESCE(u.my_gears -> 'sns' ->> 'youtube', ''),
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', ''),
    'hide_year_activity', COALESCE((u.my_gears ->> 'hide_year_activity')::boolean, false),
    'hide_total_activity', COALESCE((u.my_gears ->> 'hide_total_activity')::boolean, false)
  )
  INTO result
  FROM public.users u
  WHERE u.id = btrim(p_id)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO authenticated, service_role;

-- 비로그인 피드 아바타용. 사진 주소만 돌려준다. 소개·SNS·활동 숨김은 get_public_profile(로그인)에 남긴다.
CREATE OR REPLACE FUNCTION public.get_public_avatar(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_actor text;
  v_photo text;
  v_cover text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_public_avatar', 120) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT NULLIF(btrim(COALESCE(u.photo_url, '')), ''),
         NULLIF(btrim(COALESCE(u.hero_cover_url, '')), '')
  INTO v_photo, v_cover
  FROM public.users u
  WHERE u.id = btrim(p_id)
  LIMIT 1;

  IF v_photo IS NULL AND v_cover IS NULL THEN
    RETURN NULL;
  END IF;

  result := jsonb_build_object(
    'id', btrim(p_id),
    'photo_url', COALESCE(v_photo, ''),
    'hero_cover_url', COALESCE(v_cover, '')
  );
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_avatar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_avatar(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_profiles(p_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids text[];
  result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    PERFORM public.okbm_rpc_rate_limit('get_public_profiles', 30);
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT btrim(x)
    FROM unnest(COALESCE(p_ids, ARRAY[]::text[])) AS x
    WHERE btrim(COALESCE(x, '')) <> ''
    LIMIT 50
  ) INTO v_ids;

  IF v_ids IS NULL OR coalesce(array_length(v_ids, 1), 0) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'nickname', u.nickname,
    'photo_url', u.photo_url,
    'hero_cover_url', u.hero_cover_url,
    'bio', u.bio,
    'created_at', u.created_at,
    'instagram', COALESCE(u.my_gears -> 'sns' ->> 'instagram', ''),
    'youtube', COALESCE(u.my_gears -> 'sns' ->> 'youtube', ''),
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', ''),
    'hide_year_activity', COALESCE((u.my_gears ->> 'hide_year_activity')::boolean, false),
    'hide_total_activity', COALESCE((u.my_gears ->> 'hide_total_activity')::boolean, false)
  )), '[]'::jsonb)
  INTO result
  FROM public.users u
  WHERE u.id = ANY (v_ids);

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.okbm_is_nickname_taken(p_nickname text, p_exclude_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nick text := btrim(COALESCE(p_nickname, ''));
  v_exclude text := NULLIF(btrim(COALESCE(p_exclude_id, '')), '');
  v_taken boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    PERFORM public.okbm_rpc_rate_limit('okbm_is_nickname_taken', 30);
  END IF;
  IF v_nick = '' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE lower(btrim(COALESCE(u.nickname, ''))) = lower(v_nick)
      AND (v_exclude IS NULL OR u.id <> v_exclude)
  ) INTO v_taken;

  RETURN v_taken;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_is_nickname_taken(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_is_nickname_taken(text, text) TO authenticated, service_role;

-- 사용자 데이터 "바뀐 항목만" 저장 (D3). 원본: SUPABASE_D3_PATCH_USER_DATA.sql
-- SECURITY INVOKER라 users_update_own RLS가 그대로 적용된다. my_gears는 하위 키 단위로 병합.
CREATE OR REPLACE FUNCTION public.okbm_patch_user_data(
  p_columns jsonb DEFAULT '{}'::jsonb,
  p_my_gears jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_cols jsonb := COALESCE(p_columns, '{}'::jsonb);
  v_gears jsonb := COALESCE(p_my_gears, '{}'::jsonb);
  v_updated timestamptz;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = '' THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF jsonb_typeof(v_cols) <> 'object' OR jsonb_typeof(v_gears) <> 'object' THEN
    RAISE EXCEPTION 'invalid payload' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users u SET
    bookmarks = CASE WHEN jsonb_typeof(v_cols -> 'bookmarks') = 'array' THEN v_cols -> 'bookmarks' ELSE u.bookmarks END,
    visited = CASE WHEN jsonb_typeof(v_cols -> 'visited') = 'array' THEN v_cols -> 'visited' ELSE u.visited END,
    memos = CASE WHEN jsonb_typeof(v_cols -> 'memos') = 'object' THEN v_cols -> 'memos' ELSE u.memos END,
    saved_feeds = CASE WHEN jsonb_typeof(v_cols -> 'saved_feeds') = 'array' THEN v_cols -> 'saved_feeds' ELSE u.saved_feeds END,
    following = CASE WHEN jsonb_typeof(v_cols -> 'following') = 'array' THEN v_cols -> 'following' ELSE u.following END,
    bio = CASE WHEN v_cols ? 'bio' THEN COALESCE(v_cols ->> 'bio', '') ELSE u.bio END,
    hero_cover_url = CASE WHEN v_cols ? 'hero_cover_url' THEN NULLIF(btrim(COALESCE(v_cols ->> 'hero_cover_url', '')), '') ELSE u.hero_cover_url END,
    photo_url = CASE WHEN v_cols ? 'photo_url' THEN NULLIF(btrim(COALESCE(v_cols ->> 'photo_url', '')), '') ELSE u.photo_url END,
    my_gears = CASE WHEN v_gears = '{}'::jsonb THEN u.my_gears ELSE COALESCE(u.my_gears, '{}'::jsonb) || v_gears END,
    updated_at = now()
  WHERE u.id = v_uid
  RETURNING u.updated_at INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_row');
  END IF;
  RETURN jsonb_build_object('ok', true, 'updated_at', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_patch_user_data(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_patch_user_data(jsonb, jsonb) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 좋아요 RPC: 호출자 본인만 자신의 user_id로 처리
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_feed_like(p_feed_id text, p_user_id text, p_adding boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rowcount integer := 0;
  v_likes integer := 0;
  v_starred boolean := false;
  v_actor text := public.okbm_uid();
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_feed_id IS NULL OR btrim(p_feed_id) = '' OR p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RAISE EXCEPTION 'feed_id and user_id required';
  END IF;
  IF btrim(p_user_id) <> v_actor THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_adding THEN
    INSERT INTO public.feed_likes (feed_id, user_id, created_at)
    VALUES (p_feed_id, v_actor, now())
    ON CONFLICT (feed_id, user_id) DO NOTHING;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_starred := true;
  ELSE
    DELETE FROM public.feed_likes
    WHERE feed_id = p_feed_id
      AND user_id = v_actor;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_starred := false;
  END IF;

  SELECT COALESCE(likes_count, 0)
    INTO v_likes
  FROM public.feeds
  WHERE id = p_feed_id;

  IF v_likes IS NULL THEN
    v_likes := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_starred', v_starred,
    'likes_count', v_likes,
    'changed', v_rowcount > 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_feed_like(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_feed_like(text, text, boolean) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- feeds.likes_count: 클라이언트 임의 설정 금지.
-- service_role과 handle_feed_like_sync(SECURITY DEFINER, postgres)만 갱신 허용.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_guard_feeds_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    RETURN NEW;
  END IF;
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  NEW.likes_count := COALESCE(OLD.likes_count, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_okbm_guard_feeds_likes_count ON public.feeds;
CREATE TRIGGER trg_okbm_guard_feeds_likes_count
  BEFORE INSERT OR UPDATE ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_feeds_likes_count();

-- -------------------------------------------------------------------------
-- B-7 쪽지/방문 RPC: 세션 행위자만 처리 (apply_feed_like와 동일 가드)
-- 시그니처는 호환 유지. 본문은 okbm_uid()만 행위자로 사용.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_append_direct_message(p_sender_id text, p_sender_nick text, p_receiver_id text, p_receiver_nick text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
  v_sender text;
  v_receiver text := btrim(COALESCE(p_receiver_id, ''));
  v_body text := btrim(COALESCE(p_body, ''));
  v_thread_id text;
  v_user_a text;
  v_user_b text;
  v_msg jsonb;
  v_row public.direct_threads%ROWTYPE;
  -- 닉네임은 클라이언트 값(p_sender_nick/p_receiver_nick)을 쓰지 않고 users에서 읽는다.
  v_sender_nick text;
  v_receiver_nick text;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_sender_id IS NULL OR btrim(p_sender_id) = '' THEN
    RAISE EXCEPTION 'sender_id required';
  END IF;
  IF btrim(p_sender_id) <> v_actor THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('okbm_append_direct_message', 20);
  v_sender := v_actor;

  IF v_receiver = '' THEN
    RAISE EXCEPTION 'invalid_direct_message' USING ERRCODE = 'P0001';
  END IF;
  IF v_sender = v_receiver THEN
    RAISE EXCEPTION 'self_direct_message' USING ERRCODE = 'P0001';
  END IF;
  IF v_body = '' THEN
    RAISE EXCEPTION 'empty_direct_message' USING ERRCODE = 'P0001';
  END IF;
  -- 본문 상한(클라이언트 sendDirectMessage와 같은 500자): 대화 1행에 최대 200개가
  -- 쌓이므로 행 크기 폭증을 막는다.
  IF char_length(v_body) > 500 THEN
    RAISE EXCEPTION 'direct_message_too_long' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(btrim(u.nickname), ''), '낭만백패커')
    INTO v_receiver_nick
  FROM public.users u
  WHERE u.id = v_receiver
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'receiver_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(NULLIF(btrim(u.nickname), ''), '낭만백패커')
    INTO v_sender_nick
  FROM public.users u
  WHERE u.id = v_sender
  LIMIT 1;
  v_sender_nick := COALESCE(v_sender_nick, '낭만백패커');
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_sender AND blocked_id = v_receiver)
       OR (blocker_id = v_receiver AND blocked_id = v_sender)
  ) THEN
    RAISE EXCEPTION 'blocked_direct_message' USING ERRCODE = 'P0001';
  END IF;

  IF v_sender < v_receiver THEN
    v_user_a := v_sender;
    v_user_b := v_receiver;
  ELSE
    v_user_a := v_receiver;
    v_user_b := v_sender;
  END IF;
  v_thread_id := v_user_a || '__' || v_user_b;
  v_msg := jsonb_build_object(
    'id', 'dm_' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint || '_' || substr(md5(random()::text), 1, 6),
    'sender_id', v_sender,
    'body', v_body,
    'created_at', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  INSERT INTO public.direct_threads (
    id, user_a, user_b, nick_a, nick_b, messages, last_body, last_at, last_sender_id, unread_a, unread_b, updated_at
  ) VALUES (
    v_thread_id, v_user_a, v_user_b,
    CASE WHEN v_user_a = v_sender THEN v_sender_nick ELSE v_receiver_nick END,
    CASE WHEN v_user_b = v_sender THEN v_sender_nick ELSE v_receiver_nick END,
    jsonb_build_array(v_msg), v_body, now(), v_sender,
    CASE WHEN v_user_a = v_receiver THEN 1 ELSE 0 END,
    CASE WHEN v_user_b = v_receiver THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    messages = (
      CASE
        WHEN jsonb_array_length(COALESCE(direct_threads.messages, '[]'::jsonb) || jsonb_build_array(v_msg)) > 200 THEN (
          SELECT jsonb_agg(elem ORDER BY ord)
          FROM (
            SELECT elem, ord
            FROM jsonb_array_elements(COALESCE(direct_threads.messages, '[]'::jsonb) || jsonb_build_array(v_msg)) WITH ORDINALITY AS t(elem, ord)
            WHERE ord > (jsonb_array_length(COALESCE(direct_threads.messages, '[]'::jsonb) || jsonb_build_array(v_msg)) - 200)
          ) s
        )
        ELSE COALESCE(direct_threads.messages, '[]'::jsonb) || jsonb_build_array(v_msg)
      END
    ),
    nick_a = CASE WHEN direct_threads.user_a = v_sender THEN v_sender_nick WHEN direct_threads.user_a = v_receiver THEN v_receiver_nick ELSE direct_threads.nick_a END,
    nick_b = CASE WHEN direct_threads.user_b = v_sender THEN v_sender_nick WHEN direct_threads.user_b = v_receiver THEN v_receiver_nick ELSE direct_threads.nick_b END,
    last_body = v_body,
    last_at = now(),
    last_sender_id = v_sender,
    unread_a = CASE WHEN direct_threads.user_a = v_receiver THEN COALESCE(direct_threads.unread_a, 0) + 1 ELSE direct_threads.unread_a END,
    unread_b = CASE WHEN direct_threads.user_b = v_receiver THEN COALESCE(direct_threads.unread_b, 0) + 1 ELSE direct_threads.unread_b END,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$function$;

REVOKE ALL ON FUNCTION public.okbm_append_direct_message(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_append_direct_message(text, text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.okbm_hide_direct_thread(p_user_id text, p_thread_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_user_id IS NULL OR btrim(p_user_id) = '' OR p_thread_id IS NULL OR btrim(p_thread_id) = '' THEN
    RAISE EXCEPTION 'user_id and thread_id required';
  END IF;
  IF btrim(p_user_id) <> v_actor THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.direct_threads
  SET hidden_a_at = CASE WHEN user_a = v_actor THEN now() ELSE hidden_a_at END,
      hidden_b_at = CASE WHEN user_b = v_actor THEN now() ELSE hidden_b_at END,
      unread_a = CASE WHEN user_a = v_actor THEN 0 ELSE unread_a END,
      unread_b = CASE WHEN user_b = v_actor THEN 0 ELSE unread_b END,
      updated_at = now()
  WHERE id = p_thread_id AND (user_a = v_actor OR user_b = v_actor);
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.okbm_hide_direct_thread(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_hide_direct_thread(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.okbm_mark_direct_thread_read(p_user_id text, p_thread_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_user_id IS NULL OR btrim(p_user_id) = '' OR p_thread_id IS NULL OR btrim(p_thread_id) = '' THEN
    RAISE EXCEPTION 'user_id and thread_id required';
  END IF;
  IF btrim(p_user_id) <> v_actor THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.direct_threads
  SET unread_a = CASE WHEN user_a = v_actor THEN 0 ELSE unread_a END,
      unread_b = CASE WHEN user_b = v_actor THEN 0 ELSE unread_b END,
      updated_at = now()
  WHERE id = p_thread_id
    AND (user_a = v_actor OR user_b = v_actor)
    AND (
      (user_a = v_actor AND COALESCE(unread_a, 0) > 0)
      OR (user_b = v_actor AND COALESCE(unread_b, 0) > 0)
    );
  RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.okbm_mark_direct_thread_read(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_mark_direct_thread_read(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.okbm_unread_direct_count(p_user_id text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RAISE EXCEPTION 'user_id required';
  END IF;
  IF btrim(p_user_id) <> v_actor THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN user_a = v_actor AND (hidden_a_at IS NULL OR last_at > hidden_a_at) THEN unread_a
      WHEN user_b = v_actor AND (hidden_b_at IS NULL OR last_at > hidden_b_at) THEN unread_b
      ELSE 0
    END
  ), 0)::integer
    INTO v_count
  FROM public.direct_threads
  WHERE user_a = v_actor OR user_b = v_actor;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.okbm_unread_direct_count(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_unread_direct_count(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.track_visit(p_visitor_id text, p_is_member boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
  v_date text := to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD');
  v_member boolean := COALESCE(p_is_member, false);
  v_visitor text := btrim(COALESCE(p_visitor_id, ''));
  v_new boolean := false;
  v_guest_inc int := 0;
  v_member_inc int := 0;
BEGIN
  -- 로그인 회원만 분당 상한. 손님은 아래 visit_seen(하루 1회)로 제한.
  IF v_actor IS NOT NULL AND btrim(v_actor) <> '' AND auth.role() IS DISTINCT FROM 'service_role' THEN
    BEGIN
      PERFORM public.okbm_rpc_rate_limit('track_visit', 20);
    EXCEPTION WHEN OTHERS THEN
      RETURN;
    END;
  END IF;

  IF v_actor IS NOT NULL AND btrim(v_actor) <> '' THEN
    IF v_visitor <> '' AND v_visitor <> v_actor THEN
      RAISE EXCEPTION 'not authorized';
    END IF;
    v_visitor := v_actor;
    v_member := true;
  ELSE
    IF v_visitor = '' OR v_visitor NOT LIKE 'guest_%' THEN
      RETURN;
    END IF;
    -- guest_ 뒤가 너무 짧은/조작용 난수 남용 완화: 전체 14~64자, 영숫자·_·-만.
    -- 클라이언트 형식: 'guest_' + base36 시각 + base36 난수 8자(romantic-sync.js okbmGetVisitorId).
    IF length(v_visitor) < 14 OR length(v_visitor) > 64 OR v_visitor !~ '^guest_[A-Za-z0-9_-]+$' THEN
      RETURN;
    END IF;
    -- F2(9/30): 비회원은 IP당 분당 30회. 임의 guest_ id로 visit_seen·방문 통계를 부풀리는 것을 막는다.
    -- 통신사 공용 IP(CGNAT) 뒤 여러 사람을 고려해 넉넉히 둔다. 초과분은 조용히 집계하지 않는다.
    IF auth.role() IS DISTINCT FROM 'service_role'
       AND NOT public.okbm_actor_rate_limit('ip:' || public.okbm_request_ip(), 'track_visit_guest', 30) THEN
      RETURN;
    END IF;
    v_member := false;
  END IF;

  WITH ins AS (
    INSERT INTO public.visit_seen (visit_date, visitor_id, is_member)
    VALUES (v_date, v_visitor, v_member)
    ON CONFLICT (visit_date, visitor_id) DO NOTHING
    RETURNING 1
  )
  SELECT exists(SELECT 1 FROM ins) INTO v_new;

  -- 같은 visitor는 하루 1회만 PV/UV 증가 (호출마다 total_pv+1 금지).
  IF NOT v_new THEN
    RETURN;
  END IF;

  IF v_member THEN
    v_member_inc := 1;
  ELSE
    v_guest_inc := 1;
  END IF;

  INSERT INTO public.stats (
    date,
    total_pv,
    guest_uv,
    member_uv,
    guest_visits,
    member_visits,
    updated_at
  )
  VALUES (
    v_date,
    1,
    v_guest_inc,
    v_member_inc,
    v_guest_inc,
    v_member_inc,
    now()
  )
  ON CONFLICT (date) DO UPDATE
  SET
    total_pv = COALESCE(public.stats.total_pv, 0) + 1,
    guest_uv = COALESCE(public.stats.guest_uv, 0) + excluded.guest_uv,
    member_uv = COALESCE(public.stats.member_uv, 0) + excluded.member_uv,
    guest_visits = COALESCE(public.stats.guest_visits, 0) + excluded.guest_visits,
    member_visits = COALESCE(public.stats.member_visits, 0) + excluded.member_visits,
    updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.track_visit(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_visit(text, boolean) TO anon, authenticated, service_role;

-- -------------------------------------------------------------------------
-- 제보 승인/반려 알림: 관리자만, 제목/본문/수신자는 DB 행에서만 구성
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_notify_proposal_decision(
  p_item_id text,
  p_is_correction boolean,
  p_status text,
  p_approved_spot_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id text := btrim(COALESCE(p_item_id, ''));
  v_status text := btrim(COALESCE(p_status, ''));
  v_approved text := btrim(COALESCE(p_approved_spot_id, ''));
  v_user_id text;
  v_name text;
  v_row_approved text;
  v_orig_spot text;
  v_reason text;
  v_accepted boolean := false;
  v_rejected boolean := false;
  v_kind text;
  v_title text;
  v_body text;
  v_notif_id text;
  v_related_spot text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.okbm_is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_id = '' THEN
    RAISE EXCEPTION 'item_id required';
  END IF;

  v_accepted := (position('반영완료' IN v_status) > 0)
             OR (position('채택' IN v_status) > 0)
             OR (position('승인' IN v_status) > 0);
  v_rejected := position('반려' IN v_status) > 0;
  IF NOT v_accepted AND NOT v_rejected THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  IF COALESCE(p_is_correction, false) THEN
    SELECT NULLIF(btrim(COALESCE(r.user_id, '')), ''),
           COALESCE(NULLIF(btrim(COALESCE(r.spot_main, '')), ''), '제보한 장소'),
           NULLIF(btrim(COALESCE(r.approved_spot_id, '')), ''),
           NULLIF(btrim(COALESCE(r.orig_spot_id, '')), ''),
           NULLIF(btrim(COALESCE(r.reject_reason, '')), '')
      INTO v_user_id, v_name, v_row_approved, v_orig_spot, v_reason
    FROM public.spot_corrections r
    WHERE r.id = v_id
    LIMIT 1;
  ELSE
    SELECT NULLIF(btrim(COALESCE(r.user_id, '')), ''),
           COALESCE(NULLIF(btrim(COALESCE(r.spot_main, '')), ''), '제보한 장소'),
           NULLIF(btrim(COALESCE(r.approved_spot_id, '')), ''),
           NULL,
           NULLIF(btrim(COALESCE(r.reject_reason, '')), '')
      INTO v_user_id, v_name, v_row_approved, v_orig_spot, v_reason
    FROM public.proposals r
    WHERE r.id = v_id
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  v_kind := (CASE WHEN COALESCE(p_is_correction, false) THEN 'correction_' ELSE 'proposal_' END)
         || (CASE WHEN v_accepted THEN 'accepted' ELSE 'rejected' END);
  v_notif_id := left('pn_' || v_kind || '_' || v_id, 180);
  v_related_spot := COALESCE(NULLIF(v_approved, ''), v_row_approved, v_orig_spot, '');

  IF v_accepted THEN
    v_title := CASE WHEN COALESCE(p_is_correction, false)
      THEN '수정 건의가 채택되었습니다'
      ELSE '장소 제보가 채택되었습니다'
    END;
    v_body := '[' || v_name || ']이(가) 지도에 반영되었습니다. '
           || CASE WHEN COALESCE(p_is_correction, false) THEN '수정 건의해주셔서' ELSE '제보해주셔서' END
           || ' 감사합니다. 많은 낭만루터들에게 큰 도움이 됩니다. 이후 내용 변경은 수정문의로만 신청할 수 있습니다.';
  ELSE
    v_title := CASE WHEN COALESCE(p_is_correction, false)
      THEN '수정 건의가 반려되었습니다'
      ELSE '장소 제보가 반려되었습니다'
    END;
    v_body := '[' || v_name || '] 제보가 반려되었습니다.'
           || CASE WHEN v_reason IS NOT NULL THEN ' 사유: ' || v_reason ELSE '' END
           || ' 마이리포트에서 확인할 수 있습니다.';
  END IF;

  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  ) VALUES (
    v_notif_id, v_user_id, v_kind, v_title, v_body, v_id, v_related_spot, v_name, false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'id', v_notif_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.okbm_notify_proposal_decision(text, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_notify_proposal_decision(text, boolean, text, text) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 1. 기존 정책 전부 폐기 + RLS 활성화
-- -------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE IF EXISTS public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gears ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.okbm_rpc_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spot_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ranking_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.featured_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.direct_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.visit_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS okbm_rpc_rate_limits_no_client ON public.okbm_rpc_rate_limits;
CREATE POLICY okbm_rpc_rate_limits_no_client ON public.okbm_rpc_rate_limits
  FOR ALL USING (false) WITH CHECK (false);

-- -------------------------------------------------------------------------
-- 2. spots / gears : 조회만, 쓰기는 관리자
-- -------------------------------------------------------------------------
CREATE POLICY spots_select_public ON public.spots
  FOR SELECT USING (true);
CREATE POLICY spots_admin_insert ON public.spots
  FOR INSERT WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY spots_admin_update ON public.spots
  FOR UPDATE USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY spots_admin_delete ON public.spots
  FOR DELETE USING ((SELECT public.okbm_is_admin()));

-- 목록용 특징 한 줄. 본문(desc_summary)·링크(mediaUrls)·들머리 주소는 목록에서 제외.
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS view_brief text;

-- 야영금지 표시: 삭제하지 않고 지도·상세에 금지 상태로 남긴다. 쓰기는 spots_admin_update RLS로 관리자만.
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_status text;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_status_note text;
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_status_at date;
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_camp_status_chk;
ALTER TABLE public.spots ADD CONSTRAINT spots_camp_status_chk CHECK (camp_status IS NULL OR camp_status IN ('banned'));
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_camp_status_note_len;
ALTER TABLE public.spots ADD CONSTRAINT spots_camp_status_note_len CHECK (camp_status_note IS NULL OR char_length(camp_status_note) <= 200);
GRANT SELECT (camp_status, camp_status_note, camp_status_at) ON public.spots TO anon, authenticated;
GRANT INSERT (camp_status, camp_status_note, camp_status_at), UPDATE (camp_status, camp_status_note, camp_status_at) ON public.spots TO authenticated;

CREATE OR REPLACE FUNCTION public.okbm_spot_view_brief(p_desc text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  src text := replace(COALESCE(p_desc, ''), E'\\n', E'\n');
  start_pos int;
  tag_len int;
  rest text;
  tags text[] := ARRAY[
    '[접근/코스]', '[접근]', '[코스]',
    '[장소/피칭]', '[박지/피칭]', '[박지]', '[장소]', '[피칭]',
    '[주의/팁]', '[주의]', '[팁]',
    '[현장 메모]', '[현장메모]'
  ];
  i int;
  found int;
  next_pos int := 0;
BEGIN
  start_pos := position('[뷰/특징]' IN src);
  tag_len := char_length('[뷰/특징]');
  IF start_pos = 0 THEN
    start_pos := position('[특징]' IN src);
    tag_len := char_length('[특징]');
  END IF;
  IF start_pos = 0 THEN
    start_pos := position('[뷰]' IN src);
    tag_len := char_length('[뷰]');
  END IF;
  IF start_pos = 0 THEN
    RETURN '';
  END IF;
  rest := substr(src, start_pos + tag_len);
  FOR i IN 1..array_length(tags, 1) LOOP
    found := position(tags[i] IN rest);
    IF found > 0 AND (next_pos = 0 OR found < next_pos) THEN
      next_pos := found;
    END IF;
  END LOOP;
  IF next_pos > 0 THEN
    rest := substr(rest, 1, next_pos - 1);
  END IF;
  RETURN btrim(rest);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_spot_view_brief(text) FROM PUBLIC, anon, authenticated;

-- okbm_spot_view_brief는 authenticated에 EXECUTE가 없으므로 트리거는 소유자 권한으로 실행해야 저장이 막히지 않음.
CREATE OR REPLACE FUNCTION public.okbm_spots_fill_view_brief()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.view_brief := public.okbm_spot_view_brief(NEW.desc_summary);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_spots_fill_view_brief() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS spots_fill_view_brief ON public.spots;
CREATE TRIGGER spots_fill_view_brief
  BEFORE INSERT OR UPDATE OF desc_summary ON public.spots
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_spots_fill_view_brief();

UPDATE public.spots
SET view_brief = public.okbm_spot_view_brief(desc_summary)
WHERE view_brief IS DISTINCT FROM public.okbm_spot_view_brief(desc_summary);

-- 홈/지도 목록: 이름·좌표·들머리 이름·특징 한 줄.
-- 본문·미디어 링크·들머리 상세 주소·작성자 SNS는 get_spot_detail로 1건씩.
REVOKE SELECT ON TABLE public.spots FROM anon, authenticated;
GRANT SELECT (
  id,
  region,
  "cityName",
  spot_main,
  spot_sub,
  "fullName",
  elevation,
  campsite_lat,
  campsite_lng,
  terrain,
  trailhead_name,
  difficulty,
  distance_km,
  "droneStatus",
  course_type,
  author,
  user_id,
  created_at,
  view_brief
) ON TABLE public.spots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.spots TO authenticated;

-- E1/E2: 상세(들머리·코스/피칭/팁·작성자 SNS)는 로그인 회원에게만.
-- 회원은 분당 20회·하루 서로 다른 박지 100곳, 비회원은 IP당 분당 60회로 [뷰/특징]만.
CREATE TABLE IF NOT EXISTS public.okbm_spot_detail_views (
  actor_id text NOT NULL,
  view_day date NOT NULL,
  spot_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, view_day, spot_id)
);
CREATE INDEX IF NOT EXISTS okbm_spot_detail_views_day_idx
  ON public.okbm_spot_detail_views (view_day);
ALTER TABLE public.okbm_spot_detail_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_spot_detail_views FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS okbm_spot_detail_views_no_client ON public.okbm_spot_detail_views;
CREATE POLICY okbm_spot_detail_views_no_client ON public.okbm_spot_detail_views
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_member_per_minute constant integer := 20;
  c_guest_per_minute constant integer := 60;
  c_member_per_day constant integer := 100;
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_admin boolean := false;
  v_actor text;
  v_uid text;
  v_day date;
  v_seen integer;
  v_limited text := '';
  s record;
BEGIN
  v_member := v_is_service
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );
  IF v_member AND NOT v_is_service THEN
    v_admin := COALESCE(public.okbm_is_admin(), false);
  END IF;

  -- 분당 제한
  IF NOT v_is_service AND NOT v_admin THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(
      v_actor, 'get_spot_detail',
      CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END
    ) THEN
      IF v_member THEN
        v_limited := 'minute';
      ELSE
        RAISE EXCEPTION 'rate limit exceeded';
      END IF;
    END IF;
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls,
         sp.author_sns_url, sp.view_brief
    INTO s
  FROM public.spots sp
  WHERE sp.id = btrim(p_id)
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 하루 제한: 서로 다른 박지 수. 이미 오늘 연 박지는 세지 않고 계속 열어 준다.
  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN
    v_uid := auth.uid()::text;
    v_day := (now() AT TIME ZONE 'Asia/Seoul')::date;
    PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid));
    IF NOT EXISTS (
      SELECT 1 FROM public.okbm_spot_detail_views
      WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id
    ) THEN
      SELECT count(*) INTO v_seen
      FROM public.okbm_spot_detail_views
      WHERE actor_id = v_uid AND view_day = v_day;
      IF v_seen >= c_member_per_day THEN
        v_limited := 'daily';
      ELSE
        INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id)
        VALUES (v_uid, v_day, s.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF v_member AND v_limited = '' THEN
    RETURN jsonb_build_object(
      'tier', 'member',
      'trailhead_addr', s.trailhead_addr,
      'desc_summary', s.desc_summary,
      'mediaUrls', s.media_urls,
      'author_sns_url', s.author_sns_url
    );
  END IF;

  RETURN jsonb_build_object(
    'tier', 'guest',
    'trailhead_addr', '',
    'desc_summary', CASE
      WHEN COALESCE(btrim(s.view_brief), '') = '' THEN ''
      ELSE '[뷰/특징] ' || btrim(s.view_brief)
    END,
    'mediaUrls', s.media_urls,
    'author_sns_url', ''
  ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO anon, authenticated, service_role;

-- mediaUrls에 누가 어떤 링크를 붙였는지 기록. 사용자별 장소당 추가 개수 제한과
-- 관리자 정리(스팸 링크 제거)에 쓴다. 클라이언트 직접 접근 불가.
CREATE TABLE IF NOT EXISTS public.spot_media_contributions (
  spot_id text NOT NULL,
  url text NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, url)
);
CREATE INDEX IF NOT EXISTS spot_media_contributions_actor_idx
  ON public.spot_media_contributions (spot_id, actor_id);
ALTER TABLE public.spot_media_contributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spot_media_contributions FROM PUBLIC, anon, authenticated;
CREATE POLICY spot_media_contributions_no_client ON public.spot_media_contributions
  FOR ALL USING (false) WITH CHECK (false);

-- 인증된 사용자만 mediaUrls에 youtube/네이버 블로그 http(s) URL을 append하는 RPC.
-- 일반 사용자는 장소당 최대 6개(누적)까지만 추가 가능. 관리자는 기존 한도(호출당 20) 유지.
CREATE OR REPLACE FUNCTION public.merge_spot_media_urls(p_spot_id text, p_urls text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor text := public.okbm_uid();
  v_existing text;
  v_parts text[];
  v_seen text[] := ARRAY[]::text[];
  v_added text[] := ARRAY[]::text[];
  v_url text;
  v_norm text;
  v_host text;
  v_appended integer := 0;
  v_quota integer := 20;
  v_prior integer := 0;
  v_next text;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('merge_spot_media_urls', 30);
  IF p_spot_id IS NULL OR btrim(p_spot_id) = '' THEN
    RAISE EXCEPTION 'spot_id required';
  END IF;

  SELECT s."mediaUrls" INTO v_existing
  FROM public.spots s
  WHERE s.id = btrim(p_spot_id)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'spot not found';
  END IF;

  IF NOT public.okbm_is_admin() THEN
    SELECT count(*) INTO v_prior
    FROM public.spot_media_contributions c
    WHERE c.spot_id = btrim(p_spot_id) AND c.actor_id = v_actor;
    v_quota := GREATEST(6 - v_prior, 0);
  END IF;

  IF v_existing IS NOT NULL AND btrim(v_existing) <> '' THEN
    v_parts := regexp_split_to_array(v_existing, E'[\r\n,]+');
    FOREACH v_url IN ARRAY v_parts LOOP
      v_norm := btrim(v_url);
      IF v_norm <> '' AND NOT (v_norm = ANY (v_seen)) THEN
        v_seen := array_append(v_seen, v_norm);
      END IF;
    END LOOP;
  END IF;

  IF p_urls IS NOT NULL THEN
    FOREACH v_url IN ARRAY p_urls LOOP
      v_norm := btrim(COALESCE(v_url, ''));
      IF v_norm = '' THEN
        CONTINUE;
      END IF;
      IF v_norm !~* '^https?://' THEN
        CONTINUE;
      END IF;
      IF v_norm ~* '^(javascript:|data:|blob:|vbscript:)' THEN
        CONTINUE;
      END IF;
      -- 브라우저가 호스트 경계로 해석하는 \ # @ 가 섞이면 호스트 판별이 어긋나므로 거부.
      IF position(E'\\' IN v_norm) > 0 THEN
        CONTINUE;
      END IF;
      v_host := lower(COALESCE(substring(v_norm from '^[A-Za-z]+://([^/?#]*)'), ''));
      IF v_host = '' OR position('@' IN v_host) > 0 THEN
        CONTINUE;
      END IF;
      v_host := split_part(v_host, ':', 1);
      IF v_host !~ '^[a-z0-9.-]+$' THEN
        CONTINUE;
      END IF;
      -- 유튜브·네이버 블로그만 허용 (관리자도 동일).
      IF v_host NOT IN (
        'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be',
        'blog.naver.com', 'm.blog.naver.com'
      ) AND v_host NOT LIKE '%.youtube.com' THEN
        CONTINUE;
      END IF;
      IF v_norm = ANY (v_seen) THEN
        CONTINUE;
      END IF;
      IF coalesce(array_length(v_seen, 1), 0) >= 40 THEN
        EXIT;
      END IF;
      IF v_appended >= v_quota THEN
        EXIT;
      END IF;
      v_seen := array_append(v_seen, v_norm);
      v_added := array_append(v_added, v_norm);
      v_appended := v_appended + 1;
    END LOOP;
  END IF;

  v_next := array_to_string(v_seen, E'\n');

  IF v_appended > 0 THEN
    UPDATE public.spots
    SET "mediaUrls" = v_next
    WHERE id = btrim(p_spot_id);

    INSERT INTO public.spot_media_contributions (spot_id, url, actor_id)
    SELECT btrim(p_spot_id), u, v_actor FROM unnest(v_added) AS u
    ON CONFLICT (spot_id, url) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'spot_id', btrim(p_spot_id),
    'mediaUrls', v_next,
    'appended', v_appended
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_spot_media_urls(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_spot_media_urls(text, text[]) TO authenticated;

CREATE POLICY gears_select_public ON public.gears
  FOR SELECT USING (true);
GRANT SELECT ON TABLE public.gears TO anon, authenticated;
CREATE POLICY gears_admin_insert ON public.gears
  FOR INSERT WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY gears_admin_update ON public.gears
  FOR UPDATE USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY gears_admin_delete ON public.gears
  FOR DELETE USING ((SELECT public.okbm_is_admin()));

-- -------------------------------------------------------------------------
-- 3. feeds / likes / notifications
-- -------------------------------------------------------------------------
-- 함께보기만 공개. 나만보기는 작성자 또는 관리자만.
CREATE POLICY feeds_select_public ON public.feeds
  FOR SELECT USING (
    COALESCE(is_published, false) = true
    OR user_id = (SELECT public.okbm_uid())
    OR (SELECT public.okbm_is_admin())
  );
GRANT SELECT ON TABLE public.feeds TO anon, authenticated;
CREATE POLICY feeds_insert_own ON public.feeds
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
CREATE POLICY feeds_update_own ON public.feeds
  FOR UPDATE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY feeds_delete_own ON public.feeds
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 동명 산 오부착 방지: 등록 박지 id (nullable, 레거시는 이름+지역 fallback)
ALTER TABLE public.feeds
  ADD COLUMN IF NOT EXISTS spot_id text;
CREATE INDEX IF NOT EXISTS feeds_spot_id_idx
  ON public.feeds (spot_id)
  WHERE spot_id IS NOT NULL;

-- F2(9/30): 누가 어떤 피드에 좋아요를 눌렀는지는 본인·관리자만. 좋아요 수는 feeds.likes_count로 공개.
-- 클라이언트 조회는 모두 user_id로 거른다(romantic-history.js fetchUserFeedLikesFromServer).
-- 옛 변형 id(kakao_ 접두 유무)로 남은 행은 DELETE 정책(본인 id 일치)상 이미 지울 수 없었고 이제 보이지도 않는다.
-- 정책 이름은 기존 이름(feed_likes_select_public)을 쓰면 뜻이 틀리므로 바꾼다. 마스터가 public 정책을 모두 지우고 다시 만들어 옛 이름은 남지 않는다.
CREATE POLICY feed_likes_select_own ON public.feed_likes
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY feed_likes_insert_own ON public.feed_likes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
CREATE POLICY feed_likes_delete_own ON public.feed_likes
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()));

CREATE POLICY user_notifications_select_own ON public.user_notifications
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY user_notifications_insert_admin ON public.user_notifications
  FOR INSERT WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY user_notifications_update_own ON public.user_notifications
  FOR UPDATE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY user_notifications_delete_own ON public.user_notifications
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- -------------------------------------------------------------------------
-- 4. users : 본인만 전체 행, 공개 프로필은 get_public_profile RPC
-- -------------------------------------------------------------------------
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND id = (SELECT public.okbm_uid()));
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = (SELECT public.okbm_uid()))
  WITH CHECK (id = (SELECT public.okbm_uid()));
CREATE POLICY users_delete_own ON public.users
  FOR DELETE USING (id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- -------------------------------------------------------------------------
-- 5. 나머지 테이블
-- -------------------------------------------------------------------------
CREATE POLICY user_blocks_select_own ON public.user_blocks
  FOR SELECT USING (blocker_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY user_blocks_insert_own ON public.user_blocks
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND blocker_id = (SELECT public.okbm_uid()));
CREATE POLICY user_blocks_delete_own ON public.user_blocks
  FOR DELETE USING (blocker_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

CREATE POLICY feed_reports_insert_auth ON public.feed_reports
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND reporter_id = (SELECT public.okbm_uid()));
CREATE POLICY feed_reports_select_admin ON public.feed_reports
  FOR SELECT USING (reporter_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY feed_reports_update_admin ON public.feed_reports
  FOR UPDATE USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));
CREATE POLICY feed_reports_delete_admin ON public.feed_reports
  FOR DELETE USING ((SELECT public.okbm_is_admin()));

CREATE POLICY proposals_select_own ON public.proposals
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY proposals_insert_own ON public.proposals
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
-- 작성자는 본문만 수정 가능. status/approved_spot_id는 트리거가 비관리자 변경을 되돌림.
CREATE POLICY proposals_update_admin ON public.proposals
  FOR UPDATE USING ((SELECT public.okbm_is_admin()) OR user_id = (SELECT public.okbm_uid()))
  WITH CHECK ((SELECT public.okbm_is_admin()) OR user_id = (SELECT public.okbm_uid()));
CREATE POLICY proposals_delete_own ON public.proposals
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

CREATE POLICY spot_corrections_select_own ON public.spot_corrections
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY spot_corrections_insert_own ON public.spot_corrections
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
CREATE POLICY spot_corrections_update_admin ON public.spot_corrections
  FOR UPDATE USING ((SELECT public.okbm_is_admin()) OR user_id = (SELECT public.okbm_uid()))
  WITH CHECK ((SELECT public.okbm_is_admin()) OR user_id = (SELECT public.okbm_uid()));
CREATE POLICY spot_corrections_delete_own ON public.spot_corrections
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE public.spot_corrections ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_reject_reason_len;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_reject_reason_len CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 300);
ALTER TABLE public.spot_corrections DROP CONSTRAINT IF EXISTS spot_corrections_reject_reason_len;
ALTER TABLE public.spot_corrections ADD CONSTRAINT spot_corrections_reject_reason_len CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 300);

-- 제보/수정건의: 비관리자는 status·approved_spot_id·reject_reason을 바꿀 수 없음.
CREATE OR REPLACE FUNCTION public.okbm_guard_proposal_decision_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' OR public.okbm_is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- 반영 완료된 건은 작성자도 본문을 고칠 수 없음 (반려 건은 재제출용 수정 허용).
    IF position('반영완료' IN COALESCE(OLD.status, '')) > 0
       OR position('채택' IN COALESCE(OLD.status, '')) > 0
       OR position('승인' IN COALESCE(OLD.status, '')) > 0 THEN
      RAISE EXCEPTION 'proposal_locked' USING ERRCODE = 'P0001';
    END IF;
    NEW.status := OLD.status;
    NEW.approved_spot_id := OLD.approved_spot_id;
    NEW.reject_reason := OLD.reject_reason;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.status := COALESCE(NULLIF(btrim(COALESCE(NEW.status, '')), ''), 'pending');
    IF position('반영완료' IN NEW.status) > 0
       OR position('채택' IN NEW.status) > 0
       OR position('승인' IN NEW.status) > 0
       OR position('반려' IN NEW.status) > 0
       OR position('거절' IN NEW.status) > 0 THEN
      NEW.status := 'pending';
    END IF;
    NEW.approved_spot_id := NULL;
    NEW.reject_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_okbm_guard_proposals_decision ON public.proposals;
CREATE TRIGGER trg_okbm_guard_proposals_decision
  BEFORE INSERT OR UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_proposal_decision_cols();

DROP TRIGGER IF EXISTS trg_okbm_guard_spot_corrections_decision ON public.spot_corrections;
CREATE TRIGGER trg_okbm_guard_spot_corrections_decision
  BEFORE INSERT OR UPDATE ON public.spot_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_proposal_decision_cols();

CREATE POLICY ranking_stats_select_public ON public.ranking_stats
  FOR SELECT USING (true);
GRANT SELECT ON TABLE public.ranking_stats TO anon, authenticated;
CREATE POLICY ranking_stats_admin_write ON public.ranking_stats
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

-- 맵 박지 인기(포커스) 집계: 클라이언트 직접 INSERT/UPDATE 금지, RPC만 허용.
CREATE UNIQUE INDEX IF NOT EXISTS ranking_stats_spot_id_uidx
  ON public.ranking_stats (spot_id);

CREATE OR REPLACE FUNCTION public.increment_spot_ranking(
  p_spot_id text,
  p_spot_name text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id text := btrim(COALESCE(p_spot_id, ''));
  -- p_spot_name은 시그니처 호환용으로만 받고 쓰지 않는다. 표시 이름은 spots에서만 읽는다.
  v_name text := '';
  v_actor text;
BEGIN
  IF v_id = '' THEN
    RETURN;
  END IF;

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    -- 익명도 IP 기준으로 분당 30회 제한 (초과 시 조용히 무시)
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'increment_spot_ranking', 30) THEN
      RETURN;
    END IF;
  END IF;

  SELECT COALESCE(NULLIF(btrim(s."fullName"), ''), NULLIF(btrim(s.spot_main), ''), v_id)
    INTO v_name
  FROM public.spots s
  WHERE s.id = v_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.ranking_stats (spot_id, spot_name, usage_count, created_at, updated_at)
  VALUES (v_id, COALESCE(NULLIF(v_name, ''), v_id), 1, now(), now())
  ON CONFLICT (spot_id)
  DO UPDATE SET
    usage_count = COALESCE(public.ranking_stats.usage_count, 0) + 1,
    spot_name = CASE
      WHEN EXCLUDED.spot_name IS NOT NULL AND btrim(EXCLUDED.spot_name) <> ''
        THEN EXCLUDED.spot_name
      ELSE public.ranking_stats.spot_name
    END,
    updated_at = now();
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_spot_ranking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_spot_ranking(text, text) TO anon, authenticated, service_role;

CREATE POLICY featured_videos_select_public ON public.featured_videos
  FOR SELECT USING (true);
GRANT SELECT ON TABLE public.featured_videos TO anon, authenticated;
CREATE POLICY featured_videos_admin_write ON public.featured_videos
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

CREATE POLICY trips_select_public ON public.trips
  FOR SELECT USING (true);
CREATE POLICY trips_insert_own ON public.trips
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND host_id = (SELECT public.okbm_uid()));
CREATE POLICY trips_update_own ON public.trips
  FOR UPDATE USING (host_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (host_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY trips_delete_own ON public.trips
  FOR DELETE USING (host_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

CREATE POLICY direct_threads_select_own ON public.direct_threads
  FOR SELECT USING (user_a = (SELECT public.okbm_uid()) OR user_b = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
-- INSERT/UPDATE는 okbm_append_direct_message / hide / mark_read (SECURITY DEFINER)만.
-- 클라이언트 REST PATCH로 말풍선·참여자를 고치지 못함.
CREATE POLICY direct_threads_insert_deny ON public.direct_threads
  FOR INSERT WITH CHECK (false);
CREATE POLICY direct_threads_update_deny ON public.direct_threads
  FOR UPDATE USING (false) WITH CHECK (false);
-- F2(9/30): 한쪽이 REST DELETE로 상대 대화 기록까지 지우지 못하게 관리자만.
-- 앱의 "대화 삭제"는 okbm_hide_direct_thread(내 쪽만 숨김), 탈퇴는 service_role(delete-account)이라 영향 없음.
CREATE POLICY direct_threads_delete_admin ON public.direct_threads
  FOR DELETE USING ((SELECT public.okbm_is_admin()));

-- comments SELECT 정책은 7절(백패커 라운지 박지 후기)에 있다: 본인·관리자만.
-- 남의 후기는 get_spot_reviews(회원은 글까지, 비회원은 평균·개수만).
CREATE POLICY comments_insert_own ON public.comments
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
CREATE POLICY comments_delete_own ON public.comments
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

CREATE POLICY talks_select_public ON public.talks
  FOR SELECT USING (true);
CREATE POLICY talks_insert_own ON public.talks
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
CREATE POLICY talks_delete_own ON public.talks
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

CREATE POLICY stats_select_admin ON public.stats
  FOR SELECT USING ((SELECT public.okbm_is_admin()));
REVOKE SELECT ON TABLE public.stats FROM anon, authenticated;
GRANT SELECT ON TABLE public.stats TO authenticated;

-- visit_seen: 클라이언트 직접 쓰기 금지. track_visit(SECURITY DEFINER)만 사용.
CREATE POLICY visit_seen_deny_client ON public.visit_seen
  FOR ALL USING (false) WITH CHECK (false);

-- -------------------------------------------------------------------------
-- 레거시 RPC 정리
-- -------------------------------------------------------------------------
-- join_trip(uuid, text, text): 인증 없이 임의 UUID 멤버를 넣던 구버전. 앱은 join_trip(uuid)만 사용.
DROP FUNCTION IF EXISTS public.join_trip(uuid, text, text);
REVOKE ALL ON FUNCTION public.join_trip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_trip(uuid) TO authenticated, service_role;

-- 앱에서 호출하지 않는 집계 함수: 클라이언트 실행 차단, search_path 고정.
ALTER FUNCTION public.record_daily_visit(text, boolean) SET search_path = public;
REVOKE ALL ON FUNCTION public.record_daily_visit(text, boolean) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.increment_ranking_usage(text, text, text) SET search_path = public;
REVOKE ALL ON FUNCTION public.increment_ranking_usage(text, text, text) FROM PUBLIC, anon, authenticated;

-- 트리거 전용 함수: RPC로 노출하지 않음 (트리거 발화에는 EXECUTE 권한이 필요 없음).
ALTER FUNCTION public.handle_feed_like_sync() SET search_path = public;
REVOKE ALL ON FUNCTION public.handle_feed_like_sync() FROM PUBLIC, anon, authenticated;

-- RLS를 우회하는 TRUNCATE는 클라이언트 역할에 필요 없음.
REVOKE TRUNCATE ON TABLE public.stats, public.direct_threads, public.visit_seen FROM anon, authenticated;

-- -------------------------------------------------------------------------
-- 6. 2026-09 보안·성능 점검 반영
-- -------------------------------------------------------------------------

-- 6-1. 정책·조회에 쓰이는 컬럼 인덱스 (C2, P8)
-- direct_threads(user_a/user_b, last_at), proposals/spot_corrections/trips/user_blocks/
-- feed_reports/user_notifications의 사용자 컬럼 인덱스는 운영 DB에 이미 있어서 만들지 않는다.
CREATE INDEX IF NOT EXISTS feeds_user_date_idx
  ON public.feeds (user_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS feeds_published_likes_idx
  ON public.feeds (likes_count DESC, created_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS feed_likes_user_id_idx ON public.feed_likes (user_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS talks_user_id_idx ON public.talks (user_id);
CREATE INDEX IF NOT EXISTS proposals_created_idx ON public.proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS spot_corrections_created_idx ON public.spot_corrections (created_at DESC);
-- 2026-09-27 첫 적용 때 기존 인덱스와 중복으로 만들었던 것 정리 (Advisors duplicate_index)
DROP INDEX IF EXISTS public.direct_threads_user_a_idx;
DROP INDEX IF EXISTS public.direct_threads_user_b_idx;
DROP INDEX IF EXISTS public.user_notifications_user_created_idx;
DROP INDEX IF EXISTS public.proposals_user_id_idx;
DROP INDEX IF EXISTS public.spot_corrections_user_id_idx;
DROP INDEX IF EXISTS public.trips_host_id_idx;
DROP INDEX IF EXISTS public.user_blocks_blocker_idx;
DROP INDEX IF EXISTS public.user_blocks_blocked_idx;
DROP INDEX IF EXISTS public.feed_reports_reporter_idx;

-- view_brief 함수 search_path 고정 (Advisors function_search_path_mutable)
ALTER FUNCTION public.okbm_spot_view_brief(text) SET search_path = public;
ALTER FUNCTION public.okbm_spots_fill_view_brief() SET search_path = public;

-- 6-2. 부분 일치 검색(ilike '*X*') 인덱스 (P1)
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS feeds_spot_trgm_idx
  ON public.feeds USING gin (spot gin_trgm_ops);
CREATE INDEX IF NOT EXISTS spots_spot_main_trgm_idx
  ON public.spots USING gin (spot_main gin_trgm_ops);

-- 6-3. 닉네임 중복 검사 인덱스 (P9). okbm_is_nickname_taken의 식과 동일해야 탄다.
CREATE INDEX IF NOT EXISTS users_nickname_lower_idx
  ON public.users (lower(btrim(COALESCE(nickname, ''))));

-- 6-4. 오픈채팅 링크는 카카오 오픈채팅만 (S4).
-- CHECK 제약 대신 트리거를 쓴다. CHECK(NOT VALID)는 링크가 그대로인 기존 행도
-- 상태 변경 등 모든 UPDATE에서 다시 검사해 실패시킨다. 트리거는 링크가
-- 새로 들어오거나 바뀔 때만 검사하므로 기존 원정대를 미리 정리할 필요가 없다.
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_open_chat_url_chk;

CREATE OR REPLACE FUNCTION public.okbm_guard_trips_open_chat_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.open_chat_url IS NULL OR btrim(NEW.open_chat_url) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.open_chat_url IS NOT DISTINCT FROM OLD.open_chat_url THEN
    RETURN NEW;
  END IF;
  IF NEW.open_chat_url !~ '^https://open\.kakao\.com/' THEN
    RAISE EXCEPTION 'invalid_open_chat_url' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_guard_trips_open_chat_url() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_guard_trips_open_chat_url ON public.trips;
CREATE TRIGGER trg_okbm_guard_trips_open_chat_url
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_trips_open_chat_url();

-- 6-5. spots.id 서버 발급 (P3). id 없이 INSERT하면 숫자 id 최댓값+1을 붙인다.
-- advisory lock으로 동시 등록 시 같은 id가 나오지 않게 한다. 명시한 id는 그대로 둔다.
CREATE OR REPLACE FUNCTION public.okbm_spots_assign_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL OR btrim(NEW.id) = '' THEN
    PERFORM pg_advisory_xact_lock(hashtext('okbm_spots_assign_id'));
    SELECT (COALESCE(max(s.id::bigint), 0) + 1)::text
      INTO NEW.id
    FROM public.spots s
    WHERE s.id ~ '^[0-9]{1,18}$';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_spots_assign_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_spots_assign_id ON public.spots;
CREATE TRIGGER trg_okbm_spots_assign_id
  BEFORE INSERT ON public.spots
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_spots_assign_id();

-- 6-6. 회원 탈퇴 데이터 삭제를 한 트랜잭션으로 (P4). delete-account Edge Function 전용.
CREATE OR REPLACE FUNCTION public.okbm_delete_account_data(p_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids text[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT btrim(x) FROM unnest(COALESCE(p_ids, ARRAY[]::text[])) AS x
    WHERE btrim(COALESCE(x, '')) <> ''
  ) INTO v_ids;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.feed_likes WHERE user_id = ANY (v_ids);
  DELETE FROM public.feeds WHERE user_id = ANY (v_ids);
  DELETE FROM public.proposals WHERE user_id = ANY (v_ids);
  DELETE FROM public.spot_corrections WHERE user_id = ANY (v_ids);
  DELETE FROM public.trips WHERE host_id = ANY (v_ids);
  DELETE FROM public.user_notifications WHERE user_id = ANY (v_ids);
  DELETE FROM public.user_blocks WHERE blocker_id = ANY (v_ids) OR blocked_id = ANY (v_ids);
  DELETE FROM public.feed_reports WHERE reporter_id = ANY (v_ids);
  DELETE FROM public.comments WHERE user_id = ANY (v_ids);
  DELETE FROM public.talks WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_post_likes WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_post_comments WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_posts WHERE user_id = ANY (v_ids);
  DELETE FROM public.direct_threads WHERE user_a = ANY (v_ids) OR user_b = ANY (v_ids);
  DELETE FROM public.spot_media_contributions WHERE actor_id = ANY (v_ids);
  DELETE FROM public.users WHERE id = ANY (v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_delete_account_data(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_delete_account_data(text[]) TO service_role;

-- 6-7. place-research 결과 캐시 (P6). Edge Function(service_role)만 읽고 쓴다.
CREATE TABLE IF NOT EXISTS public.place_research_cache (
  query text PRIMARY KEY,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS place_research_cache_created_idx
  ON public.place_research_cache (created_at);
ALTER TABLE public.place_research_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.place_research_cache FROM PUBLIC, anon, authenticated;
CREATE POLICY place_research_cache_no_client ON public.place_research_cache
  FOR ALL USING (false) WITH CHECK (false);

-- 6-8. users 프로필 값 검사 + 닉네임 중복·사칭 방지 (F2, 9/30)
-- users_update_own은 is_admin 말고 모든 칸을 바꿀 수 있고, okbm_patch_user_data·직접 upsert 모두
-- 크기·형식 검사가 없었다. 닉네임은 DM·라운지·후기에 그대로 나가므로 중복·운영자 사칭을 막는다.
-- 값이 "바뀔 때만" 검사한다 → 기존 행(옛 중복 닉네임, 긴 소개글 등)은 그대로 두고 다음 변경부터 적용.
-- UNIQUE 인덱스 대신 트리거: 기존 중복을 먼저 정리하지 않아도 되고, 대소문자·앞뒤 공백을
-- okbm_is_nickname_taken과 같은 식(lower(btrim()))으로 비교한다. 인덱스 users_nickname_lower_idx(6-3)를 탄다.
--   INSERT(신규 가입): 겹치거나 예약어면 뒤에 숫자 4자리를 붙여 가입은 성공시킨다
--     (클라이언트 okbmResolveUniqueNickname이 조회 실패 시 확인 없이 숫자를 붙이는 경로 대비).
--   UPDATE(닉네임 변경): 겹치면 23505, 예약어면 22023으로 거부.
--   upsert(INSERT … ON CONFLICT DO UPDATE)로 이미 있는 행을 고치는 경우 INSERT 단계는 건너뛰고 UPDATE 단계에서 본다.
-- 사진 URL은 오류 대신 정리한다(가입 실패 방지): http:// → https://, 그 밖의 스킴·1000자 초과는 NULL.
-- service_role(Edge Function·SQL Editor)은 검사하지 않는다. 단 닉네임 형식(아래 10/10 규칙)은 service_role도 정리한다.
--
-- 닉네임 형식 규칙 (10/10): 한글 완성형·영문·숫자만 2~12자. 띄어쓰기·특수문자·이모지·자음/모음 단독 불가.
--   기존 닉네임은 그대로 둔다(값이 바뀔 때만 검사).
--   INSERT(신규 가입, 소셜 이름이 그대로 들어옴): 거부하지 않고 허용 문자만 남겨 12자로 자른다. 2자 미만이면 '백패커####'.
--   UPDATE(닉네임 변경): 형식이 틀리면 거부하지 않고 기존 닉네임을 유지한다.
--     → 옛 닉네임이 남은 기기에서 프로필 전체를 저장할 때 북마크 등 다른 칸 저장까지 실패하지 않게.
--     앱 설정 화면은 저장 전에 같은 규칙으로 막고 안내한다(romantic-sync.js okbmIsValidNickname).
--   service_role(카카오·네이버 로그인 Edge Function): 신규 행만 같은 방식으로 정리 + 중복이면 숫자 4자리.
CREATE OR REPLACE FUNCTION public.okbm_nickname_is_valid(p_nick text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_nick, '') ~ '^[가-힣A-Za-z0-9]{2,12}$';
$$;

CREATE OR REPLACE FUNCTION public.okbm_nickname_sanitize(p_nick text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v text := left(regexp_replace(COALESCE(p_nick, ''), '[^가-힣A-Za-z0-9]', '', 'g'), 12);
BEGIN
  IF char_length(v) < 2 THEN
    v := '백패커' || (1000 + floor(random() * 9000))::int::text;
  END IF;
  RETURN v;
END;
$$;

-- 겹치면 앞 8자 + 숫자 4자리(최대 12자). 20번 안에 못 찾으면 23505.
CREATE OR REPLACE FUNCTION public.okbm_nickname_unique(p_nick text, p_user_id text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nick text := p_nick;
  v_try integer := 0;
BEGIN
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE lower(btrim(COALESCE(u.nickname, ''))) = lower(v_nick)
        AND u.id <> p_user_id
    );
    v_try := v_try + 1;
    IF v_try > 20 THEN
      RAISE EXCEPTION 'nickname_taken' USING ERRCODE = '23505';
    END IF;
    v_nick := left(regexp_replace(p_nick, '[0-9]{4}$', ''), 8) || (1000 + floor(random() * 9000))::int::text;
  END LOOP;
  RETURN v_nick;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_nickname_unique(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.okbm_guard_users_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nick text;
  v_bad_nick boolean;
  v_taken boolean;
  v_try integer := 0;
BEGIN
  -- upsert가 기존 행을 고치는 경우: BEFORE INSERT도 먼저 발화하므로 여기서는 넘기고 UPDATE 트리거에 맡긴다.
  -- (service_role 분기보다 먼저 둔다: 로그인마다 upsert하는 Edge Function이 기존 회원 닉네임을 바꾸지 않게)
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- service_role(카카오·네이버 Edge Function): 신규 가입 닉네임만 형식 정리. 그 밖의 검사는 건너뛴다.
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    IF TG_OP = 'INSERT' AND btrim(COALESCE(NEW.nickname, '')) <> '' THEN
      v_nick := btrim(NEW.nickname);
      IF NOT public.okbm_nickname_is_valid(v_nick) THEN
        v_nick := public.okbm_nickname_sanitize(v_nick);
      END IF;
      NEW.nickname := public.okbm_nickname_unique(v_nick, NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  -- JWT 없는 호출(SQL Editor 등)은 건너뛴다. 비회원은 users RLS가 쓰기를 막는다.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 소개글: 클라이언트 상한 100자(OKBM_USER_BIO_MAX). 서버는 여유를 두고 300자.
  IF NEW.bio IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.bio IS DISTINCT FROM OLD.bio)
     AND char_length(NEW.bio) > 300 THEN
    RAISE EXCEPTION 'bio_too_long' USING ERRCODE = '22001';
  END IF;

  -- 사진 URL (get_public_avatar로 남에게 나간다)
  IF TG_OP = 'INSERT' OR NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
    NEW.photo_url := NULLIF(btrim(COALESCE(NEW.photo_url, '')), '');
    IF NEW.photo_url IS NOT NULL THEN
      IF NEW.photo_url ~* '^http://' THEN
        NEW.photo_url := 'https://' || substr(NEW.photo_url, 8);
      END IF;
      IF NEW.photo_url !~* '^https://[^\s"''<>]+$' OR char_length(NEW.photo_url) > 1000 THEN
        NEW.photo_url := NULL;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.hero_cover_url IS DISTINCT FROM OLD.hero_cover_url THEN
    NEW.hero_cover_url := NULLIF(btrim(COALESCE(NEW.hero_cover_url, '')), '');
    IF NEW.hero_cover_url IS NOT NULL THEN
      IF NEW.hero_cover_url ~* '^http://' THEN
        NEW.hero_cover_url := 'https://' || substr(NEW.hero_cover_url, 8);
      END IF;
      IF NEW.hero_cover_url !~* '^https://[^\s"''<>]+$' OR char_length(NEW.hero_cover_url) > 1000 THEN
        NEW.hero_cover_url := NULL;
      END IF;
    END IF;
  END IF;

  -- 크기 상한 (값이 바뀔 때만). 적용 전 audit/f2_precheck.sql로 현재 최댓값이 상한보다 충분히 작은지 확인할 것.
  IF NEW.my_gears IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.my_gears IS DISTINCT FROM OLD.my_gears)
     AND octet_length(NEW.my_gears::text) > 2097152 THEN
    RAISE EXCEPTION 'my_gears_too_large' USING ERRCODE = '54000';
  END IF;
  IF NEW.memos IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.memos IS DISTINCT FROM OLD.memos)
     AND octet_length(NEW.memos::text) > 524288 THEN
    RAISE EXCEPTION 'memos_too_large' USING ERRCODE = '54000';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.bookmarks IS DISTINCT FROM OLD.bookmarks)
     AND jsonb_typeof(NEW.bookmarks) = 'array' AND jsonb_array_length(NEW.bookmarks) > 3000 THEN
    RAISE EXCEPTION 'bookmarks_too_many' USING ERRCODE = '54000';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.visited IS DISTINCT FROM OLD.visited)
     AND jsonb_typeof(NEW.visited) = 'array' AND jsonb_array_length(NEW.visited) > 3000 THEN
    RAISE EXCEPTION 'visited_too_many' USING ERRCODE = '54000';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.saved_feeds IS DISTINCT FROM OLD.saved_feeds)
     AND jsonb_typeof(NEW.saved_feeds) = 'array' AND jsonb_array_length(NEW.saved_feeds) > 3000 THEN
    RAISE EXCEPTION 'saved_feeds_too_many' USING ERRCODE = '54000';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.following IS DISTINCT FROM OLD.following)
     AND jsonb_typeof(NEW.following) = 'array' AND jsonb_array_length(NEW.following) > 3000 THEN
    RAISE EXCEPTION 'following_too_many' USING ERRCODE = '54000';
  END IF;

  -- 닉네임
  IF TG_OP = 'UPDATE' AND NEW.nickname IS NOT DISTINCT FROM OLD.nickname THEN
    RETURN NEW;
  END IF;
  v_nick := regexp_replace(btrim(COALESCE(NEW.nickname, '')), '\s+', ' ', 'g');
  IF v_nick = '' THEN
    RETURN NEW;
  END IF;
  -- 형식 규칙(10/10): 한글 완성형·영문·숫자 2~12자
  IF NOT public.okbm_nickname_is_valid(v_nick) THEN
    IF TG_OP = 'UPDATE' THEN
      -- 거부 대신 기존 닉네임 유지(다른 칸 저장은 성공시킨다). 설정 화면은 앱에서 먼저 막는다.
      NEW.nickname := OLD.nickname;
      RETURN NEW;
    END IF;
    v_nick := public.okbm_nickname_sanitize(v_nick);
  END IF;
  -- 운영자 사칭: 관리자 계정만 쓸 수 있다
  v_bad_nick := NOT COALESCE(public.okbm_is_admin(), false) AND (
    v_nick ~ '(관리자|운영자|운영팀)'
    OR lower(replace(v_nick, ' ', '')) IN ('낭만루트', 'romanticroute', 'admin', 'administrator')
  );
  IF v_bad_nick THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'nickname_reserved' USING ERRCODE = '22023';
    END IF;
    v_nick := '낭만백패커';
  END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.users u
      WHERE lower(btrim(COALESCE(u.nickname, ''))) = lower(v_nick)
        AND u.id <> NEW.id
    ) INTO v_taken;
    EXIT WHEN NOT v_taken;
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION 'nickname_taken' USING ERRCODE = '23505';
    END IF;
    v_try := v_try + 1;
    IF v_try > 20 THEN
      RAISE EXCEPTION 'nickname_taken' USING ERRCODE = '23505';
    END IF;
    v_nick := left(regexp_replace(v_nick, '[0-9]{4}$', ''), 8) || (1000 + floor(random() * 9000))::int::text;
  END LOOP;

  NEW.nickname := v_nick;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_guard_users_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_guard_users_profile ON public.users;
CREATE TRIGGER trg_okbm_guard_users_profile
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_users_profile();

-- 기존 http:// 사진 주소(9/30 점검 6명)를 트리거와 같은 규칙으로 https://로 맞춘다.
-- 화면(okbmSafeImageUrl)은 이미 https로 바꿔 보여 주므로 보이는 것은 달라지지 않는다. 다시 실행해도 안전.
-- SQL Editor(JWT 없음)에서는 위 트리거가 건너뛰므로 이 UPDATE가 닉네임 등 다른 칸을 건드리지 않는다.
UPDATE public.users
SET photo_url = CASE WHEN photo_url ~* '^http://' THEN 'https://' || substr(photo_url, 8) ELSE photo_url END,
    hero_cover_url = CASE WHEN hero_cover_url ~* '^http://' THEN 'https://' || substr(hero_cover_url, 8) ELSE hero_cover_url END
WHERE photo_url ~* '^http://' OR hero_cover_url ~* '^http://';

-- -------------------------------------------------------------------------
-- 6-9. 클라이언트 역할 테이블 권한 정리 (F2, 9/30)
-- TRUNCATE·REFERENCES·TRIGGER는 RLS를 거치지 않거나 앱에 필요 없다. PostgREST로 노출되지 않지만 권한 자체를 뺀다.
-- 앞으로 만드는 테이블도 같게(postgres가 만드는 테이블 기본 권한). supabase_admin 기본값은 이 역할로 못 바꾼다.
-- anon 쓰기: 9/30 점검(audit/f2_precheck.sql)에서 anon이 거의 모든 테이블에 INSERT/UPDATE/DELETE를 갖고 있었다(Supabase 기본값).
-- 이 파일의 쓰기 정책은 전부 로그인(auth.uid()/okbm_uid()) 또는 관리자를 요구하고, 비회원이 쓰는 경로
-- (track_visit, get_spot_detail, increment_spot_ranking)는 모두 SECURITY DEFINER라 테이블 권한이 필요 없다.
-- → anon의 쓰기 권한을 전부 회수한다(RLS 한 겹 → 두 겹). 로그인 회원(authenticated)은 그대로.
-- -------------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon;

-- -------------------------------------------------------------------------
-- 7. 백패커 라운지 (원본은 이 마스터. SUPABASE_F1_LOUNGE.sql은 9/29 적용 기록으로만 보관)
--    탈퇴 삭제(F1 9절)는 위 6-6 okbm_delete_account_data에 합쳐 두었다.
-- -------------------------------------------------------------------------


-- -------------------------------------------------------------------------
-- 7-0. 공통 트리거 함수
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_lounge_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 작성자 닉네임 (users 기준). SECURITY DEFINER: 관리자가 남의 글을 고칠 때도 읽을 수 있게.
CREATE OR REPLACE FUNCTION public.okbm_lounge_author_nickname(p_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(COALESCE(u.nickname, '')), '') FROM public.users u WHERE u.id = p_user_id LIMIT 1),
    '낭만백패커'
  );
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_author_nickname(text) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 7-1. lounge_events (관리자 게시)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 80),
  start_date date NOT NULL,
  end_date date,
  place text NOT NULL DEFAULT '' CHECK (char_length(place) <= 80),
  spot_id text REFERENCES public.spots(id) ON DELETE SET NULL,
  host text NOT NULL DEFAULT '' CHECK (char_length(host) <= 60),
  fee text NOT NULL DEFAULT '' CHECK (char_length(fee) <= 60),
  apply_url text NOT NULL DEFAULT ''
    CHECK (apply_url = '' OR (apply_url ~ '^https://' AND apply_url !~ '[[:space:]<>"'']')),
  poster_url text NOT NULL DEFAULT ''
    CHECK (poster_url = '' OR (poster_url ~ '^https://' AND poster_url !~ '[[:space:]<>"'']')),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lounge_events_dates_chk CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS lounge_events_start_idx ON public.lounge_events (start_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS lounge_events_spot_idx ON public.lounge_events (spot_id) WHERE spot_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_lounge_events_touch ON public.lounge_events;
CREATE TRIGGER trg_lounge_events_touch
  BEFORE UPDATE ON public.lounge_events
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_touch_updated_at();

-- -------------------------------------------------------------------------
-- 7-2. lounge_guides (관리자 게시: 입문 장비 kit / 백패킹 팁 tip)
--    kit은 영상·글 하나가 게시물 하나. title은 원문 제목, note는 채널 이름.
--    tip은 note가 팁 / 주의점 / 기본상식.
--    body: kit은 「본문 --- 채널 소개」. 맨 끝 주소 하나는 유튜브 썸네일 또는 블로그 링크가 되고, 글자로는 안 보인다.
--    items: [{ "gear_id": "", "category_id": "pack", "name": "...", "about": "한 줄 설명", "weight_g": 0, "price_krw": 0, "link_url": "https://..." }]
--    link_url(선택): 구매 링크. 화면은 장비 줄 전체가 okbmSafeExternalUrl + noopener로 연다.
--    price_krw: 매장 가격(원). 이름에 「· 000원」이 붙어 있던 예전 글은 화면이 가격 칸으로 나눠 보여 준다.
--    2026-09-30 운영 DB 제약을 items 80개, body 4000자로 올렸다.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('kit', 'tip')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 4000),
  items jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 80),
  sort integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_guides_kind_sort_idx ON public.lounge_guides (kind, sort) WHERE is_active;

DROP TRIGGER IF EXISTS trg_lounge_guides_touch ON public.lounge_guides;
CREATE TRIGGER trg_lounge_guides_touch
  BEFORE UPDATE ON public.lounge_guides
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_touch_updated_at();

-- -------------------------------------------------------------------------
-- 7-3. 박지 후기 = 기존 comments (2026-09-26 백업 기준 0행, 클라이언트 사용처 없음)
--    spots FK는 걸지 않는다: 관리자 도구가 박지를 자유롭게 지우므로 RESTRICT면 삭제가 막히고
--    CASCADE면 후기가 조용히 사라진다. 박지가 없어진 후기는 화면에 안 나올 뿐 해가 없다.
-- -------------------------------------------------------------------------
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.comments ALTER COLUMN rating DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_rating_chk') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_rating_chk CHECK (rating IS NOT NULL AND rating BETWEEN 1 AND 5) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_text_len_chk') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_text_len_chk CHECK (char_length(text) <= 1000) NOT VALID;
  END IF;
END $$;

-- 1인 1박지 1후기 (클라이언트는 on_conflict=spot_id,user_id 로 upsert). 중복 행이 있으면 여기서 실패하고 전체 롤백.
CREATE UNIQUE INDEX IF NOT EXISTS comments_spot_user_uidx ON public.comments (spot_id, user_id);
CREATE INDEX IF NOT EXISTS comments_created_idx ON public.comments (created_at DESC);

CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.spot_id := OLD.spot_id;
    NEW.created_at := OLD.created_at;
  ELSE
    IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      PERFORM public.okbm_rpc_rate_limit('lounge_review', 10);
    END IF;
    NEW.created_at := now();
  END IF;
  NEW.text := btrim(COALESCE(NEW.text, ''));
  NEW.updated_at := now();
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_comments_guard ON public.comments;
CREATE TRIGGER trg_lounge_comments_guard
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_review();

-- 후기 직접 조회는 본인·관리자만(수정용). 남의 후기는 아래 RPC로만 본다.
-- 마스터 5절의 comments_select_public(USING true)도 P1 적용 때 이것으로 바꿔야 한다
-- (마스터는 실행 때마다 정책을 다시 만든다).
DROP POLICY IF EXISTS comments_select_public ON public.comments;
DROP POLICY IF EXISTS comments_select_own ON public.comments;
CREATE POLICY comments_select_own ON public.comments
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 박지 후기 조회 (지도 정보창·라운지 공용, 요청 1번).
--   회원(로그인, 익명 로그인 제외): 요약 + 후기 글 + 내 후기
--   비회원: 요약(평균·개수)만. E1(들머리·코스는 회원 전용)과 같은 기준.
--   p_spot_id NULL = 모든 박지의 최근 후기(라운지 "최근 후기"). 이때 요약·내 후기는 없음.
--   p_before = 더 보기 커서(이 시각 이전), p_limit 1~20.
--   차단·신고한 사용자의 후기는 클라이언트가 isFeedHiddenByUgc로 거른다(user_id를 돌려줌).
CREATE OR REPLACE FUNCTION public.get_spot_reviews(
  p_spot_id text DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_actor text;
  v_uid text;
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
  v_summary jsonb := NULL;
  v_reviews jsonb := '[]'::jsonb;
  v_mine jsonb := NULL;
BEGIN
  v_member := v_is_service
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );

  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_spot_reviews', CASE WHEN v_member THEN 60 ELSE 120 END) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  IF v_spot IS NOT NULL THEN
    SELECT jsonb_build_object(
             'avg_rating', round(avg(c.rating)::numeric, 1),
             'review_count', count(*)::integer
           )
      INTO v_summary
    FROM public.comments c
    WHERE c.spot_id = v_spot AND c.rating BETWEEN 1 AND 5;
  END IF;

  IF v_member THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC, r.id DESC), '[]'::jsonb)
      INTO v_reviews
    FROM (
      SELECT c.id, c.spot_id, c.user_id, c.nickname, c.rating, c.text, c.created_at, c.updated_at
      FROM public.comments c
      WHERE c.rating BETWEEN 1 AND 5
        AND (v_spot IS NOT NULL AND c.spot_id = v_spot
             OR v_spot IS NULL AND EXISTS (SELECT 1 FROM public.spots s WHERE s.id = c.spot_id))
        AND (p_before IS NULL OR c.created_at < p_before)
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT v_limit
    ) r;

    v_uid := public.okbm_uid();
    IF v_spot IS NOT NULL AND v_uid IS NOT NULL AND btrim(v_uid) <> '' THEN
      SELECT to_jsonb(m) INTO v_mine
      FROM (
        SELECT c.id, c.rating, c.text, c.updated_at
        FROM public.comments c
        WHERE c.spot_id = v_spot AND c.user_id = v_uid
        LIMIT 1
      ) m;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'tier', CASE WHEN v_member THEN 'member' ELSE 'guest' END,
    'spot_id', v_spot,
    'summary', v_summary,
    'reviews', v_reviews,
    'mine', v_mine
  );
END;
$$;

-- 평점 높은 박지 (누구나). 후기가 p_min_count개 이상인 박지만, 지워진 박지는 제외.
CREATE OR REPLACE FUNCTION public.get_top_reviewed_spots(
  p_min_count integer DEFAULT 3,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_top_reviewed_spots', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.avg_rating DESC, t.review_count DESC, t.spot_id), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT c.spot_id,
           round(avg(c.rating)::numeric, 1) AS avg_rating,
           count(*)::integer AS review_count
    FROM public.comments c
    JOIN public.spots s ON s.id = c.spot_id
    WHERE c.rating BETWEEN 1 AND 5
    GROUP BY c.spot_id
    HAVING count(*) >= GREATEST(COALESCE(p_min_count, 3), 1)
    ORDER BY avg_rating DESC, review_count DESC, c.spot_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  ) t;
  RETURN v_result;
END;
$$;

-- -------------------------------------------------------------------------
-- 7-4. lounge_posts (자유게시판)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('backpacking', 'life', 'suggestion')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 3000),
  photos jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) <= 5),
  is_private boolean GENERATED ALWAYS AS (category = 'suggestion') STORED,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_posts_created_idx ON public.lounge_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_posts_category_created_idx ON public.lounge_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_posts_user_idx ON public.lounge_posts (user_id);

-- 작성자·카테고리·작성 시각은 수정으로 못 바꿈. 닉네임은 users에서. 사진은 https 문자열만.
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.category := OLD.category;
    NEW.created_at := OLD.created_at;
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.photos IS DISTINCT FROM OLD.photos THEN
      NEW.updated_at := now();
    ELSE
      NEW.updated_at := OLD.updated_at;
    END IF;
  ELSE
    IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      PERFORM public.okbm_rpc_rate_limit('lounge_post', 5);
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.photos, '[]'::jsonb)) AS e(v)
    WHERE jsonb_typeof(e.v) <> 'string'
       OR (e.v #>> '{}') !~ '^https://'
       OR (e.v #>> '{}') ~ '[[:space:]<>"'']'
  ) THEN
    RAISE EXCEPTION 'invalid_photos' USING ERRCODE = 'P0001';
  END IF;
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post() FROM PUBLIC, anon, authenticated;

-- 좋아요·댓글 수: 클라이언트 임의 설정 금지. SECURITY DEFINER 동기화 트리거(postgres)와 service_role만.
-- (이 함수는 DEFINER가 아니어야 current_user로 호출자를 구분할 수 있다.)
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    RETURN NEW;
  END IF;
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.likes_count := 0;
    NEW.comments_count := 0;
  ELSE
    NEW.likes_count := OLD.likes_count;
    NEW.comments_count := OLD.comments_count;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_counts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_posts_guard ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post();
DROP TRIGGER IF EXISTS trg_lounge_posts_guard_counts ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard_counts
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post_counts();

-- -------------------------------------------------------------------------
-- 7-5. lounge_post_comments (+ 댓글 수, 알림)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_post_comments_post_idx ON public.lounge_post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS lounge_post_comments_user_idx ON public.lounge_post_comments (user_id);

CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM public.okbm_rpc_rate_limit('lounge_comment', 20);
  END IF;
  NEW.body := btrim(NEW.body);
  NEW.created_at := now();
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_comments_guard ON public.lounge_post_comments;
CREATE TRIGGER trg_lounge_post_comments_guard
  BEFORE INSERT ON public.lounge_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_comment();

-- 댓글 수 +1/−1, 글쓴이(본인 제외)에게 알림. 알림 id는 댓글 id로 정해져 중복되지 않는다.
CREATE OR REPLACE FUNCTION public.okbm_lounge_after_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_owner text;
  v_title text;
  v_category text;
  v_kind text;
  v_is_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.lounge_posts
      SET comments_count = GREATEST(0, comments_count - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  UPDATE public.lounge_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id
    RETURNING id, user_id, title, category INTO v_post_id, v_owner, v_title, v_category;
  IF NOT FOUND OR v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.is_admin IS TRUE)
    INTO v_is_admin;
  v_kind := CASE WHEN v_category = 'suggestion' AND v_is_admin THEN 'lounge_reply' ELSE 'lounge_comment' END;

  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  ) VALUES (
    left('ln_c_' || NEW.id::text, 180),
    v_owner,
    v_kind,
    CASE WHEN v_kind = 'lounge_reply' THEN '건의에 운영팀 답변이 달렸습니다' ELSE '내 글에 댓글이 달렸습니다' END,
    '[' || left(COALESCE(v_title, ''), 40) || '] ' || left(NEW.body, 80),
    v_post_id::text,
    '',
    '',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_after_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_comments_after ON public.lounge_post_comments;
CREATE TRIGGER trg_lounge_post_comments_after
  AFTER INSERT OR DELETE ON public.lounge_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_after_comment();

-- -------------------------------------------------------------------------
-- 7-6. lounge_post_likes (+ 좋아요 수)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_post_likes (
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS lounge_post_likes_user_idx ON public.lounge_post_likes (user_id);

CREATE OR REPLACE FUNCTION public.okbm_lounge_after_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.lounge_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.lounge_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_after_like() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_likes_after ON public.lounge_post_likes;
CREATE TRIGGER trg_lounge_post_likes_after
  AFTER INSERT OR DELETE ON public.lounge_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_after_like();

-- -------------------------------------------------------------------------
-- 7-7. RLS · 권한
--    Supabase 기본 권한은 새 테이블에 anon까지 전부 준다 → 먼저 회수하고 필요한 것만 준다.
-- -------------------------------------------------------------------------
ALTER TABLE public.lounge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_post_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts,
  public.lounge_post_comments, public.lounge_post_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts,
  public.lounge_post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts TO authenticated;
GRANT INSERT, DELETE ON TABLE public.lounge_post_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.lounge_post_likes TO authenticated;

REVOKE ALL ON FUNCTION public.get_spot_reviews(text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_reviews(text, integer, timestamptz) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_top_reviewed_spots(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_reviewed_spots(integer, integer) TO anon, authenticated, service_role;

-- RLS를 우회하는 TRUNCATE는 클라이언트 역할에 필요 없음 (기존 comments·talks·feed_reports 포함, 9/29 점검에서 남아 있음 확인)
REVOKE TRUNCATE ON TABLE public.comments, public.talks, public.feed_reports FROM anon, authenticated;

-- 행사·가이드: 공개(숨김은 관리자만), 쓰기는 관리자
DROP POLICY IF EXISTS lounge_events_select ON public.lounge_events;
CREATE POLICY lounge_events_select ON public.lounge_events
  FOR SELECT USING (is_active OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_events_admin_write ON public.lounge_events;
CREATE POLICY lounge_events_admin_write ON public.lounge_events
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

DROP POLICY IF EXISTS lounge_guides_select ON public.lounge_guides;
CREATE POLICY lounge_guides_select ON public.lounge_guides
  FOR SELECT USING (is_active OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_guides_admin_write ON public.lounge_guides;
CREATE POLICY lounge_guides_admin_write ON public.lounge_guides
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

-- 글: 건의는 작성자·관리자만 보임
DROP POLICY IF EXISTS lounge_posts_select ON public.lounge_posts;
CREATE POLICY lounge_posts_select ON public.lounge_posts
  FOR SELECT USING (
    NOT is_private
    OR user_id = (SELECT public.okbm_uid())
    OR (SELECT public.okbm_is_admin())
  );
DROP POLICY IF EXISTS lounge_posts_insert_own ON public.lounge_posts;
CREATE POLICY lounge_posts_insert_own ON public.lounge_posts
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
DROP POLICY IF EXISTS lounge_posts_update_own ON public.lounge_posts;
CREATE POLICY lounge_posts_update_own ON public.lounge_posts
  FOR UPDATE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_posts_delete_own ON public.lounge_posts;
CREATE POLICY lounge_posts_delete_own ON public.lounge_posts
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 댓글: 부모 글이 보이는 사람만 보고 쓴다 (하위 쿼리에 lounge_posts RLS가 적용됨)
DROP POLICY IF EXISTS lounge_post_comments_select ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_select ON public.lounge_post_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id));
DROP POLICY IF EXISTS lounge_post_comments_insert_own ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_insert_own ON public.lounge_post_comments
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT public.okbm_uid())
    AND EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id)
  );
DROP POLICY IF EXISTS lounge_post_comments_delete_own ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_delete_own ON public.lounge_post_comments
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 좋아요: 본인 것만. 건의 글에는 좋아요 없음
DROP POLICY IF EXISTS lounge_post_likes_select_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_select_own ON public.lounge_post_likes
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()));
DROP POLICY IF EXISTS lounge_post_likes_insert_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_insert_own ON public.lounge_post_likes
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT public.okbm_uid())
    AND EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id AND NOT p.is_private)
  );
DROP POLICY IF EXISTS lounge_post_likes_delete_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_delete_own ON public.lounge_post_likes
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()));

-- -------------------------------------------------------------------------
-- 7-8. 신고: 대상 종류 구분. 피드 신고는 기본값 'feed'라 기존 코드 그대로 동작.
--    고유 키 (feed_id, reporter_id) → (target_type, feed_id, reporter_id). 피드끼리는 의미가 같다.
-- -------------------------------------------------------------------------
ALTER TABLE public.feed_reports ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'feed';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_reports_target_type_chk') THEN
    ALTER TABLE public.feed_reports
      ADD CONSTRAINT feed_reports_target_type_chk
      CHECK (target_type IN ('feed', 'lounge_post', 'lounge_comment', 'spot_review'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS feed_reports_target_reporter_uidx
  ON public.feed_reports (target_type, feed_id, reporter_id)
  WHERE reporter_id IS NOT NULL AND reporter_id <> '';
DROP INDEX IF EXISTS public.feed_reports_feed_reporter_uidx;

COMMIT;

-- =========================================================================
-- 검증
-- =========================================================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
