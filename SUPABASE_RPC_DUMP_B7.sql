-- =========================================================================
-- B-7 감사 스냅샷 (적용 금지)
--
-- 출처: 운영 DB qnumfecythtqtrxeasys, pg_get_functiondef, 2026-09-21
-- 현재 운영/형상관리 본문은 SUPABASE_RLS_POLICIES_MASTER.sql.
--
-- 스냅샷 요약
--   track_visit                     SECURITY DEFINER, search_path=public
--   okbm_append_direct_message      SECURITY INVOKER, search_path 미설정
--   okbm_hide_direct_thread         SECURITY INVOKER, search_path 미설정
--   okbm_mark_direct_thread_read    SECURITY INVOKER, search_path 미설정
--   okbm_unread_direct_count        SECURITY INVOKER, search_path 미설정
--
-- 공통: anon/authenticated/service_role EXECUTE 허용.
-- 쪽지 4종은 클라이언트 p_user_id/p_sender_id를 본문으로 신뢰.
-- RLS는 대화 참여자만 검사하므로 상대방 사칭·열람 조작이 가능했음.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_append_direct_message(p_sender_id text, p_sender_nick text, p_receiver_id text, p_receiver_nick text, p_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sender text := btrim(COALESCE(p_sender_id, ''));
  v_receiver text := btrim(COALESCE(p_receiver_id, ''));
  v_body text := btrim(COALESCE(p_body, ''));
  v_thread_id text;
  v_user_a text;
  v_user_b text;
  v_msg jsonb;
  v_row public.direct_threads%ROWTYPE;
  v_messages jsonb;
BEGIN
  IF v_sender = '' OR v_receiver = '' THEN
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

CREATE OR REPLACE FUNCTION public.okbm_hide_direct_thread(p_user_id text, p_thread_id text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.direct_threads
  SET hidden_a_at = CASE WHEN user_a = p_user_id THEN now() ELSE hidden_a_at END,
      hidden_b_at = CASE WHEN user_b = p_user_id THEN now() ELSE hidden_b_at END,
      unread_a = CASE WHEN user_a = p_user_id THEN 0 ELSE unread_a END,
      unread_b = CASE WHEN user_b = p_user_id THEN 0 ELSE unread_b END,
      updated_at = now()
  WHERE id = p_thread_id AND (user_a = p_user_id OR user_b = p_user_id);
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.okbm_mark_direct_thread_read(p_user_id text, p_thread_id text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.direct_threads
  SET unread_a = CASE WHEN user_a = p_user_id THEN 0 ELSE unread_a END,
      unread_b = CASE WHEN user_b = p_user_id THEN 0 ELSE unread_b END,
      updated_at = now()
  WHERE id = p_thread_id
    AND (user_a = p_user_id OR user_b = p_user_id)
    AND (
      (user_a = p_user_id AND COALESCE(unread_a, 0) > 0)
      OR (user_b = p_user_id AND COALESCE(unread_b, 0) > 0)
    );
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.okbm_unread_direct_count(p_user_id text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(SUM(
    CASE
      WHEN user_a = p_user_id AND (hidden_a_at IS NULL OR last_at > hidden_a_at) THEN unread_a
      WHEN user_b = p_user_id AND (hidden_b_at IS NULL OR last_at > hidden_b_at) THEN unread_b
      ELSE 0
    END
  ), 0)::integer
  FROM public.direct_threads
  WHERE p_user_id IS NOT NULL
    AND p_user_id <> ''
    AND (user_a = p_user_id OR user_b = p_user_id);
$function$;

CREATE OR REPLACE FUNCTION public.track_visit(p_visitor_id text, p_is_member boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_date text := to_char(timezone('Asia/Seoul', now()), 'YYYY-MM-DD');
  v_member boolean := coalesce(p_is_member, false);
  v_new boolean := false;
  v_guest_inc int := 0;
  v_member_inc int := 0;
begin
  if p_visitor_id is null or btrim(p_visitor_id) = '' then
    return;
  end if;

  with ins as (
    insert into public.visit_seen (visit_date, visitor_id, is_member)
    values (v_date, btrim(p_visitor_id), v_member)
    on conflict (visit_date, visitor_id) do nothing
    returning 1
  )
  select exists(select 1 from ins) into v_new;

  if v_new and v_member then
    v_member_inc := 1;
  elsif v_new and not v_member then
    v_guest_inc := 1;
  end if;

  insert into public.stats (
    date,
    total_pv,
    guest_uv,
    member_uv,
    guest_visits,
    member_visits,
    updated_at
  )
  values (
    v_date,
    1,
    v_guest_inc,
    v_member_inc,
    v_guest_inc,
    v_member_inc,
    now()
  )
  on conflict (date) do update
  set
    total_pv = coalesce(public.stats.total_pv, 0) + 1,
    guest_uv = coalesce(public.stats.guest_uv, 0) + excluded.guest_uv,
    member_uv = coalesce(public.stats.member_uv, 0) + excluded.member_uv,
    guest_visits = coalesce(public.stats.guest_visits, 0) + excluded.guest_visits,
    member_visits = coalesce(public.stats.member_visits, 0) + excluded.member_visits,
    updated_at = now();
end;
$function$;
