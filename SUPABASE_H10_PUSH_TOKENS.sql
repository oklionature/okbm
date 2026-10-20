-- =========================================================================
-- H10: 앱 푸시 알림 — 기기 토큰 저장과 공지 발송 기록 (2026-10-20)
--
-- 아이폰 앱(Capacitor)이 푸시 권한을 받으면 APNs 기기 토큰을 register_push_token으로 저장한다.
-- 로그인하지 않은 사람도 공지는 받아야 하므로 비회원도 저장할 수 있다(user_id는 비워 둔다).
-- 공지 발송은 Edge Function send-notice-push가 service_role로 토큰을 읽어 APNs로 보낸다.
--   - push_tokens·push_notices 표는 클라이언트가 직접 읽거나 쓸 수 없다(RLS 켜고 정책 없음).
--   - 관리자가 보낸 공지는 push_notices에 남는다(제목·내용·보낸 수·실패 수).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  token text PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.push_tokens TO service_role;

CREATE TABLE IF NOT EXISTS public.push_notices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_notices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_notices FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.push_notices TO service_role;

-- 기기 토큰 저장. 같은 토큰이면 로그인한 사람·시각만 바꾼다.
-- APNs 토큰은 16진수 64자(기기에 따라 더 길 수 있어 64~200자 허용). IP·사용자당 분당 10회.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := lower(btrim(COALESCE(p_token, '')));
  v_platform text := lower(btrim(COALESCE(p_platform, '')));
  v_actor text;
  v_uid text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'register_push_token', 10) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  IF v_platform <> 'ios' THEN
    RAISE EXCEPTION 'unsupported platform';
  END IF;
  IF v_token !~ '^[0-9a-f]{64,200}$' THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  v_uid := public.okbm_uid();

  INSERT INTO public.push_tokens AS t (token, platform, user_id)
  VALUES (v_token, v_platform, v_uid)
  ON CONFLICT (token) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, t.user_id),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO anon, authenticated, service_role;
