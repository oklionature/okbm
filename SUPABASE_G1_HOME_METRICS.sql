-- =========================================================================
-- 낭만루트 홈 칸별 노출·누름 기록 (G1)
--
-- 적용 위치: Supabase Dashboard > SQL Editor > RUN
-- 전제: SUPABASE_RLS_POLICIES_MASTER.sql 적용 완료 (okbm_is_admin 있음)
--       pg_cron 활성화 (SUPABASE_OPS_CRON.sql과 같음)
--
-- 남기는 것: 날짜(Asia/Seoul), 기기별 무작위 번호, 칸 이름, 종류(view/click/event), 횟수, 로그인 여부.
-- 남기지 않는 것: 계정 id, 닉네임, IP, 위치.
-- 쓰기: okbm_log_home_metrics RPC로만 (anon·authenticated). 표 직접 접근은 막는다.
-- 읽기: okbm_home_metrics_summary RPC로만, 관리자만.
-- 여러 번 실행해도 된다.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.okbm_home_metrics (
  day date NOT NULL,
  visitor text NOT NULL,
  section text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('view', 'click', 'event')),
  hits integer NOT NULL DEFAULT 1,
  logged_in boolean NOT NULL DEFAULT false,
  PRIMARY KEY (day, visitor, section, kind)
);
CREATE INDEX IF NOT EXISTS okbm_home_metrics_day_idx ON public.okbm_home_metrics (day);

ALTER TABLE public.okbm_home_metrics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_home_metrics FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS okbm_home_metrics_no_client ON public.okbm_home_metrics;
CREATE POLICY okbm_home_metrics_no_client ON public.okbm_home_metrics
  FOR ALL USING (false) WITH CHECK (false);

-- 기록: p_events = [{"s":"hero","k":"view"}, ...] 한 번에 최대 40개.
-- view는 하루 한 번만 센다(hits 1 고정). click·event는 하루 50까지 더한다.
CREATE OR REPLACE FUNCTION public.okbm_log_home_metrics(p_visitor text, p_events jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (timezone('Asia/Seoul', now()))::date;
  v_logged boolean := auth.uid() IS NOT NULL;
  v_visitor text := btrim(COALESCE(p_visitor, ''));
  v_e jsonb;
  v_section text;
  v_kind text;
BEGIN
  IF v_visitor !~ '^[a-z0-9]{12,40}$' THEN
    RETURN;
  END IF;
  IF p_events IS NULL OR jsonb_typeof(p_events) <> 'array' OR jsonb_array_length(p_events) > 40 THEN
    RETURN;
  END IF;
  -- 한 기기가 하루에 만들 수 있는 행 수 상한 (도배 방지)
  IF (SELECT count(*) FROM public.okbm_home_metrics m WHERE m.day = v_day AND m.visitor = v_visitor) >= 120 THEN
    RETURN;
  END IF;

  FOR v_e IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    CONTINUE WHEN jsonb_typeof(v_e) <> 'object';
    v_section := v_e->>'s';
    v_kind := v_e->>'k';
    CONTINUE WHEN v_kind IS NULL OR v_kind NOT IN ('view', 'click', 'event');
    CONTINUE WHEN v_section IS NULL OR v_section NOT IN (
      -- 지금 홈 칸
      'home', 'hero', 'hero_detail', 'hero_gear', 'theme', 'video', 'tripjoin', 'lounge', 'ready',
      -- 하단 탭
      'dock_home', 'dock_map', 'dock_plan', 'dock_history', 'dock_report',
      -- 새 홈 칸 (홈 개편 후)
      'quick_guide', 'quick_event', 'quick_join', 'quick_board', 'quick_write',
      'recent_reviews', 'events', 'guides', 'together',
      -- 후기 저장 결과
      'publish_ok', 'publish_private', 'publish_unregistered', 'publish_nophoto'
    );

    INSERT INTO public.okbm_home_metrics AS m (day, visitor, section, kind, hits, logged_in)
    VALUES (v_day, v_visitor, v_section, v_kind, 1, v_logged)
    ON CONFLICT (day, visitor, section, kind) DO UPDATE SET
      hits = CASE WHEN m.kind = 'view' THEN 1 ELSE LEAST(m.hits + 1, 50) END,
      logged_in = m.logged_in OR EXCLUDED.logged_in;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_log_home_metrics(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_log_home_metrics(text, jsonb) TO anon, authenticated;

-- 읽기: 최근 p_days일(1~180) 날짜·칸·종류별 합계. 관리자만.
CREATE OR REPLACE FUNCTION public.okbm_home_metrics_summary(p_days integer DEFAULT 14)
RETURNS TABLE (day date, section text, kind text, visitors bigint, hits bigint, members bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := GREATEST(LEAST(COALESCE(p_days, 14), 180), 1);
BEGIN
  IF NOT COALESCE(public.okbm_is_admin(), false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
    SELECT m.day, m.section, m.kind,
           count(*)::bigint AS visitors,
           sum(m.hits)::bigint AS hits,
           (count(*) FILTER (WHERE m.logged_in))::bigint AS members
    FROM public.okbm_home_metrics m
    WHERE m.day > (timezone('Asia/Seoul', now()))::date - v_days
    GROUP BY m.day, m.section, m.kind
    ORDER BY m.day DESC, m.section, m.kind;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_home_metrics_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_home_metrics_summary(integer) TO authenticated;

-- 정리: 180일 지난 기록 삭제 (매일 04:40 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'okbm_home_metrics_gc',
  '40 4 * * *',
  $$DELETE FROM public.okbm_home_metrics WHERE day < (timezone('Asia/Seoul', now()))::date - 180$$
);

-- 확인
SELECT 'okbm_home_metrics' AS table_name, count(*) FROM public.okbm_home_metrics;
