-- =========================================================================
-- H11: 신고가 들어오면 운영자 카카오톡(나에게 보내기)으로 알림 (2026-10-20)
--
-- 앱스토어 심사 메모에 "신고는 24시간 안에 확인"을 약속했다. 운영자가 놓치지 않도록
--   1) feed_reports에 새 신고가 들어오면 Edge Function admin-kakao-alert를 부른다(pg_net).
--   2) 매일 오전 9시(한국)에 카카오 토큰을 갱신하고, 처리 안 한 신고가 있으면 한 번 더 알린다.
-- 카카오 토큰과 함수 호출 비밀값은 okbm_admin_alert_settings 한 줄에만 둔다.
--   - 클라이언트는 이 표를 읽거나 쓸 수 없다(RLS 켜고 정책 없음). Edge Function만 service_role로 쓴다.
--   - 토큰은 운영 화면(ops.html)의 「카카오톡 알림 연결」에서 운영자가 카카오로 동의하면 저장된다.
-- 트리거가 실패해도 신고 저장은 막지 않는다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.okbm_admin_alert_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hook_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  kakao_access_token text,
  kakao_access_expires_at timestamptz,
  kakao_refresh_token text,
  kakao_refresh_expires_at timestamptz,
  linked_by text,
  linked_at timestamptz
);

ALTER TABLE public.okbm_admin_alert_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_admin_alert_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.okbm_admin_alert_settings TO service_role;

INSERT INTO public.okbm_admin_alert_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Edge Function 호출. 비밀값은 x-okbm-hook 헤더로 보내고 함수가 같은 표에서 대조한다.
CREATE OR REPLACE FUNCTION public.okbm_call_admin_alert(p_body jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT hook_secret INTO v_secret FROM public.okbm_admin_alert_settings WHERE id = 1;
  IF v_secret IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://qnumfecythtqtrxeasys.supabase.co/functions/v1/admin-kakao-alert',
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-okbm-hook', v_secret),
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN others THEN
  RAISE WARNING 'okbm_call_admin_alert failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_call_admin_alert(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.okbm_feed_reports_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.okbm_call_admin_alert(jsonb_build_object('action', 'report', 'report_id', to_jsonb(NEW) -> 'id'));
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_feed_reports_alert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS feed_reports_admin_alert ON public.feed_reports;
CREATE TRIGGER feed_reports_admin_alert
  AFTER INSERT ON public.feed_reports
  FOR EACH ROW EXECUTE FUNCTION public.okbm_feed_reports_alert();

-- 매일 00:00 UTC(한국 오전 9시): 카카오 토큰 갱신 + 미처리 신고가 있으면 알림.
-- 카카오 refresh 토큰은 두 달짜리라 매일 갱신해 두면 끊기지 않는다.
SELECT cron.schedule(
  'okbm-admin-kakao-daily',
  '0 0 * * *',
  $$SELECT public.okbm_call_admin_alert('{"action":"daily"}'::jsonb)$$
);
