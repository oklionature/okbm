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
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. 헬퍼 함수
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_find_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE p_email IS NOT NULL
    AND btrim(p_email) <> ''
    AND lower(email) = lower(btrim(p_email))
  LIMIT 1;
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
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', '')
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
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', '')
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
    CASE WHEN v_user_a = v_sender THEN COALESCE(p_sender_nick, '') ELSE COALESCE(p_receiver_nick, '') END,
    CASE WHEN v_user_b = v_sender THEN COALESCE(p_sender_nick, '') ELSE COALESCE(p_receiver_nick, '') END,
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
    nick_a = CASE WHEN direct_threads.user_a = v_sender THEN COALESCE(p_sender_nick, direct_threads.nick_a) WHEN direct_threads.user_a = v_receiver THEN COALESCE(p_receiver_nick, direct_threads.nick_a) ELSE direct_threads.nick_a END,
    nick_b = CASE WHEN direct_threads.user_b = v_sender THEN COALESCE(p_sender_nick, direct_threads.nick_b) WHEN direct_threads.user_b = v_receiver THEN COALESCE(p_receiver_nick, direct_threads.nick_b) ELSE direct_threads.nick_b END,
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
    -- guest_ 뒤가 너무 짧은/조작용 난수 남용 완화: 전체 14자 이상.
    IF length(v_visitor) < 14 THEN
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
           NULLIF(btrim(COALESCE(r.orig_spot_id, '')), '')
      INTO v_user_id, v_name, v_row_approved, v_orig_spot
    FROM public.spot_corrections r
    WHERE r.id = v_id
    LIMIT 1;
  ELSE
    SELECT NULLIF(btrim(COALESCE(r.user_id, '')), ''),
           COALESCE(NULLIF(btrim(COALESCE(r.spot_main, '')), ''), '제보한 장소'),
           NULLIF(btrim(COALESCE(r.approved_spot_id, '')), ''),
           NULL
      INTO v_user_id, v_name, v_row_approved, v_orig_spot
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
    v_body := '[' || v_name || ']이(가) 지도에 반영되었습니다. 이후 내용 변경은 수정문의로만 신청할 수 있습니다.';
  ELSE
    v_title := CASE WHEN COALESCE(p_is_correction, false)
      THEN '수정 건의가 반려되었습니다'
      ELSE '장소 제보가 반려되었습니다'
    END;
    v_body := '[' || v_name || '] 제보가 반려되었습니다. 마이리포트에서 확인할 수 있습니다.';
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
  FOR INSERT WITH CHECK (public.okbm_is_admin());
CREATE POLICY spots_admin_update ON public.spots
  FOR UPDATE USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());
CREATE POLICY spots_admin_delete ON public.spots
  FOR DELETE USING (public.okbm_is_admin());

-- 홈/지도 핀용 공개 SELECT: 이름·좌표·기본 소개·미디어.
-- 들머리 상세 주소(trailhead_addr)·author_sns_url은 컬럼 SELECT 불허.
-- 해당 민감 필드는 get_spot_detail(p_id) RPC로 로그인 유저만 1건씩 조회.
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
  desc_summary,
  "mediaUrls"
) ON TABLE public.spots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.spots TO authenticated;

CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('get_spot_detail', 60);
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'trailhead_addr', s.trailhead_addr,
    'desc_summary', s.desc_summary,
    'mediaUrls', s."mediaUrls",
    'author_sns_url', s.author_sns_url
  )
  INTO result
  FROM public.spots s
  WHERE s.id = btrim(p_id)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO authenticated, service_role;

-- 인증된 사용자만 mediaUrls에 youtube/네이버 블로그 http(s) URL을 append하는 RPC.
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
  v_url text;
  v_norm text;
  v_host text;
  v_appended integer := 0;
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
      IF v_appended >= 20 THEN
        EXIT;
      END IF;
      v_seen := array_append(v_seen, v_norm);
      v_appended := v_appended + 1;
    END LOOP;
  END IF;

  v_next := array_to_string(v_seen, E'\n');

  UPDATE public.spots
  SET "mediaUrls" = v_next
  WHERE id = btrim(p_spot_id);

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
  FOR INSERT WITH CHECK (public.okbm_is_admin());
CREATE POLICY gears_admin_update ON public.gears
  FOR UPDATE USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());
CREATE POLICY gears_admin_delete ON public.gears
  FOR DELETE USING (public.okbm_is_admin());

-- -------------------------------------------------------------------------
-- 3. feeds / likes / notifications
-- -------------------------------------------------------------------------
-- 함께보기만 공개. 나만보기는 작성자 또는 관리자만.
CREATE POLICY feeds_select_public ON public.feeds
  FOR SELECT USING (
    COALESCE(is_published, false) = true
    OR user_id = public.okbm_uid()
    OR public.okbm_is_admin()
  );
GRANT SELECT ON TABLE public.feeds TO anon, authenticated;
CREATE POLICY feeds_insert_own ON public.feeds
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
CREATE POLICY feeds_update_own ON public.feeds
  FOR UPDATE USING (user_id = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY feeds_delete_own ON public.feeds
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY feed_likes_select_public ON public.feed_likes
  FOR SELECT USING (true);
CREATE POLICY feed_likes_insert_own ON public.feed_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
CREATE POLICY feed_likes_delete_own ON public.feed_likes
  FOR DELETE USING (user_id = public.okbm_uid());

CREATE POLICY user_notifications_select_own ON public.user_notifications
  FOR SELECT USING (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY user_notifications_insert_admin ON public.user_notifications
  FOR INSERT WITH CHECK (public.okbm_is_admin());
CREATE POLICY user_notifications_update_own ON public.user_notifications
  FOR UPDATE USING (user_id = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY user_notifications_delete_own ON public.user_notifications
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

-- -------------------------------------------------------------------------
-- 4. users : 본인만 전체 행, 공개 프로필은 get_public_profile RPC
-- -------------------------------------------------------------------------
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND id = public.okbm_uid());
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = public.okbm_uid())
  WITH CHECK (id = public.okbm_uid());
CREATE POLICY users_delete_own ON public.users
  FOR DELETE USING (id = public.okbm_uid() OR public.okbm_is_admin());

-- -------------------------------------------------------------------------
-- 5. 나머지 테이블
-- -------------------------------------------------------------------------
CREATE POLICY user_blocks_select_own ON public.user_blocks
  FOR SELECT USING (blocker_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY user_blocks_insert_own ON public.user_blocks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND blocker_id = public.okbm_uid());
CREATE POLICY user_blocks_delete_own ON public.user_blocks
  FOR DELETE USING (blocker_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY feed_reports_insert_auth ON public.feed_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = public.okbm_uid());
CREATE POLICY feed_reports_select_admin ON public.feed_reports
  FOR SELECT USING (reporter_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY feed_reports_update_admin ON public.feed_reports
  FOR UPDATE USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());
CREATE POLICY feed_reports_delete_admin ON public.feed_reports
  FOR DELETE USING (public.okbm_is_admin());

CREATE POLICY proposals_select_own ON public.proposals
  FOR SELECT USING (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY proposals_insert_own ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
-- 작성자는 본문만 수정 가능. status/approved_spot_id는 트리거가 비관리자 변경을 되돌림.
CREATE POLICY proposals_update_admin ON public.proposals
  FOR UPDATE USING (public.okbm_is_admin() OR user_id = public.okbm_uid())
  WITH CHECK (public.okbm_is_admin() OR user_id = public.okbm_uid());
CREATE POLICY proposals_delete_own ON public.proposals
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY spot_corrections_select_own ON public.spot_corrections
  FOR SELECT USING (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY spot_corrections_insert_own ON public.spot_corrections
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
CREATE POLICY spot_corrections_update_admin ON public.spot_corrections
  FOR UPDATE USING (public.okbm_is_admin() OR user_id = public.okbm_uid())
  WITH CHECK (public.okbm_is_admin() OR user_id = public.okbm_uid());
CREATE POLICY spot_corrections_delete_own ON public.spot_corrections
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

-- 제보/수정건의: 비관리자는 status·approved_spot_id를 바꿀 수 없음.
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
  FOR ALL USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());

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
  v_name text := btrim(COALESCE(p_spot_name, ''));
  v_exists boolean := false;
BEGIN
  IF v_id = '' THEN
    RETURN;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    BEGIN
      PERFORM public.okbm_rpc_rate_limit('increment_spot_ranking', 30);
    EXCEPTION WHEN OTHERS THEN
      RETURN;
    END;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.spots s WHERE s.id = v_id LIMIT 1
  ) INTO v_exists;

  IF NOT v_exists THEN
    RETURN;
  END IF;

  IF v_name = '' THEN
    SELECT COALESCE(NULLIF(btrim(s."fullName"), ''), NULLIF(btrim(s.spot_main), ''), v_id)
      INTO v_name
    FROM public.spots s
    WHERE s.id = v_id
    LIMIT 1;
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
  FOR ALL USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());

CREATE POLICY trips_select_public ON public.trips
  FOR SELECT USING (true);
CREATE POLICY trips_insert_own ON public.trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND host_id = public.okbm_uid());
CREATE POLICY trips_update_own ON public.trips
  FOR UPDATE USING (host_id = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (host_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY trips_delete_own ON public.trips
  FOR DELETE USING (host_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY direct_threads_select_own ON public.direct_threads
  FOR SELECT USING (user_a = public.okbm_uid() OR user_b = public.okbm_uid() OR public.okbm_is_admin());
-- INSERT/UPDATE는 okbm_append_direct_message / hide / mark_read (SECURITY DEFINER)만.
-- 클라이언트 REST PATCH로 말풍선·참여자를 고치지 못함.
CREATE POLICY direct_threads_insert_deny ON public.direct_threads
  FOR INSERT WITH CHECK (false);
CREATE POLICY direct_threads_update_deny ON public.direct_threads
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY direct_threads_delete_own ON public.direct_threads
  FOR DELETE USING (user_a = public.okbm_uid() OR user_b = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY comments_select_public ON public.comments
  FOR SELECT USING (true);
CREATE POLICY comments_insert_own ON public.comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE USING (user_id = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY comments_delete_own ON public.comments
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY talks_select_public ON public.talks
  FOR SELECT USING (true);
CREATE POLICY talks_insert_own ON public.talks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = public.okbm_uid());
CREATE POLICY talks_delete_own ON public.talks
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

CREATE POLICY stats_select_admin ON public.stats
  FOR SELECT USING (public.okbm_is_admin());
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
