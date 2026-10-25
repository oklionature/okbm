-- H13: 기능 사용 기록 넓히기 (2026-10-25)
-- 1) 한 기기가 하루에 남길 수 있는 줄 수를 120 → 300으로 올린다.
--    기능 이름(feat_*)이 약 150개로 늘어, 많이 쓰는 사람이 하루에 이것저것 누르면 120에서 끊길 수 있다.
--    한 줄 = (날짜, 기기, 이름, 종류) 하나라 같은 버튼을 여러 번 눌러도 한 줄이다. 나머지는 H8과 같다.
-- 2) 180일 지난 기록은 매일 밤 지운다(운영 화면은 길어야 몇십 일만 본다). pg_cron이 켜져 있어야 한다(SUPABASE_OPS_CRON.sql과 같은 전제).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

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
  IF (SELECT count(*) FROM public.okbm_home_metrics m WHERE m.day = v_day AND m.visitor = v_visitor) >= 300 THEN
    RETURN;
  END IF;

  FOR v_e IN SELECT value FROM jsonb_array_elements(p_events) LOOP
    CONTINUE WHEN jsonb_typeof(v_e) <> 'object';
    v_section := v_e->>'s';
    v_kind := v_e->>'k';
    CONTINUE WHEN v_kind IS NULL OR v_kind NOT IN ('view', 'click', 'event');
    CONTINUE WHEN v_section IS NULL OR (v_section !~ '^feat_[a-z0-9_]{2,40}$' AND v_section NOT IN (
      -- 지금 홈 칸
      'home', 'hero', 'hero_detail', 'hero_gear', 'theme', 'video', 'tripjoin', 'lounge', 'ready',
      -- 하단 탭
      'dock_home', 'dock_map', 'dock_plan', 'dock_history', 'dock_report',
      -- 새 홈 칸 (홈 개편 후)
      'quick_guide', 'quick_event', 'quick_join', 'quick_board', 'quick_write',
      'recent_reviews', 'events', 'guides', 'together',
      -- 낭만피드
      'feed_write', 'feed_spot_change',
      -- 기기 종류 (하루 한 번)
      'device_ios', 'device_ios_home', 'device_android', 'device_app', 'device_other',
      -- 아이폰 홈 화면 추가 안내
      'home_guide', 'home_guide_close',
      -- 후기 저장 결과
      'publish_ok', 'publish_private', 'publish_unregistered', 'publish_nophoto'
    ));

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

-- 오래된 기록 정리: 180일 지난 줄 삭제 (매일 04:30 UTC = 한국 13:30)
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'okbm_home_metrics_gc',
  '30 4 * * *',
  $$DELETE FROM public.okbm_home_metrics WHERE day < current_date - 180$$
);
