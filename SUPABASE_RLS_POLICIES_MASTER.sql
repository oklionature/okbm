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
-- 3) users 이메일은 본인만, 공개 프로필은 user_public_profiles 뷰만 노출
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
WITH (security_invoker = false) AS
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

GRANT SELECT ON public.user_public_profiles TO anon, authenticated, service_role;

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
-- B-7 쪽지/방문 RPC: 세션 행위자만 처리 (apply_feed_like와 동일 가드)
-- 시그니처는 호환 유지. 본문은 okbm_uid()만 행위자로 사용.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_append_direct_message(p_sender_id text, p_sender_nick text, p_receiver_id text, p_receiver_nick text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
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
    v_member := false;
  END IF;

  WITH ins AS (
    INSERT INTO public.visit_seen (visit_date, visitor_id, is_member)
    VALUES (v_date, v_visitor, v_member)
    ON CONFLICT (visit_date, visitor_id) DO NOTHING
    RETURNING 1
  )
  SELECT exists(SELECT 1 FROM ins) INTO v_new;

  IF v_new AND v_member THEN
    v_member_inc := 1;
  ELSIF v_new AND NOT v_member THEN
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

-- 핀용 경량 SELECT만 허용. 상세(trailhead_addr/desc_summary/mediaUrls/author_sns_url)는
-- get_spot_detail(p_id) RPC로 1건씩만 조회.
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
  created_at
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

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO anon, authenticated;

CREATE POLICY gears_select_public ON public.gears
  FOR SELECT USING (true);
CREATE POLICY gears_admin_insert ON public.gears
  FOR INSERT WITH CHECK (public.okbm_is_admin());
CREATE POLICY gears_admin_update ON public.gears
  FOR UPDATE USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());
CREATE POLICY gears_admin_delete ON public.gears
  FOR DELETE USING (public.okbm_is_admin());

-- -------------------------------------------------------------------------
-- 3. feeds / likes / notifications
-- -------------------------------------------------------------------------
CREATE POLICY feeds_select_public ON public.feeds
  FOR SELECT USING (true);
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
CREATE POLICY user_notifications_insert_auth ON public.user_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY user_notifications_update_own ON public.user_notifications
  FOR UPDATE USING (user_id = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (user_id = public.okbm_uid() OR public.okbm_is_admin());
CREATE POLICY user_notifications_delete_own ON public.user_notifications
  FOR DELETE USING (user_id = public.okbm_uid() OR public.okbm_is_admin());

-- -------------------------------------------------------------------------
-- 4. users : 본인만 전체 행, 공개 프로필은 뷰
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

CREATE POLICY ranking_stats_select_public ON public.ranking_stats
  FOR SELECT USING (true);
CREATE POLICY ranking_stats_admin_write ON public.ranking_stats
  FOR ALL USING (public.okbm_is_admin()) WITH CHECK (public.okbm_is_admin());

CREATE POLICY featured_videos_select_public ON public.featured_videos
  FOR SELECT USING (true);
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
CREATE POLICY direct_threads_insert_own ON public.direct_threads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_a = public.okbm_uid() OR user_b = public.okbm_uid()));
CREATE POLICY direct_threads_update_own ON public.direct_threads
  FOR UPDATE USING (user_a = public.okbm_uid() OR user_b = public.okbm_uid() OR public.okbm_is_admin())
  WITH CHECK (user_a = public.okbm_uid() OR user_b = public.okbm_uid() OR public.okbm_is_admin());
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

CREATE POLICY stats_select_public ON public.stats
  FOR SELECT USING (true);

-- visit_seen: 클라이언트 직접 쓰기 금지. track_visit(SECURITY DEFINER)만 사용.
CREATE POLICY visit_seen_deny_client ON public.visit_seen
  FOR ALL USING (false) WITH CHECK (false);

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
