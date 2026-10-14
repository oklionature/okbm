-- 홈 바로가기 "자유게시판"(quick_board) 누름도 세도록 기록 함수 허용 목록만 바꾼다 (2026-10-14)
-- SUPABASE_G1_HOME_METRICS.sql의 okbm_log_home_metrics 부분과 같다. 표·정리 예약은 건드리지 않는다.

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

SELECT prosrc LIKE '%quick_board%' AS has_quick_board FROM pg_proc WHERE proname = 'okbm_log_home_metrics';
