-- =========================================================================
-- 낭만루트 운영 정리 작업 (pg_cron)
--
-- 적용 위치: Supabase Dashboard > SQL Editor > RUN
-- 전제: SUPABASE_RLS_POLICIES_MASTER.sql 적용 완료
--       Dashboard > Database > Extensions 에서 pg_cron 활성화
--       (아래 CREATE EXTENSION이 권한 오류를 내면 대시보드에서 켠 뒤 다시 실행)
--
-- cron.schedule은 같은 이름이면 기존 작업을 덮어쓰므로 여러 번 실행해도 된다.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) rate limit 행 정리: 익명 IP 키가 계속 쌓이지 않도록 1시간 지난 창은 삭제 (15분마다)
SELECT cron.schedule(
  'okbm_rate_limit_gc',
  '*/15 * * * *',
  $$DELETE FROM public.okbm_rpc_rate_limits WHERE window_start < now() - interval '1 hour'$$
);

-- 2) place-research 캐시 정리: 7일 지난 결과 삭제 (매일 04:10 UTC)
SELECT cron.schedule(
  'okbm_place_research_cache_gc',
  '10 4 * * *',
  $$DELETE FROM public.place_research_cache WHERE created_at < now() - interval '7 days'$$
);

-- 3) 박지 상세 조회 기록(E2 하루 한도용) 정리: 3일 지난 기록 삭제 (매일 04:20 UTC)
SELECT cron.schedule(
  'okbm_spot_detail_views_gc',
  '20 4 * * *',
  $$DELETE FROM public.okbm_spot_detail_views WHERE view_day < current_date - 3$$
);

-- 4) 방문자 하루 1회 기록(track_visit용) 정리: 90일 지난 기록 삭제 (매일 04:30 UTC)
--    visit_seen은 "오늘 이미 셌는지"만 판단한다. 날짜별 합계는 stats에 따로 남아 통계에는 영향 없음.
--    track_visit은 visit_date에 'YYYY-MM-DD'(Asia/Seoul)를 넣는다. 칸 타입이 text든 date든 되도록 문자열로 비교한다.
SELECT cron.schedule(
  'okbm_visit_seen_gc',
  '30 4 * * *',
  $$DELETE FROM public.visit_seen WHERE visit_date::text < to_char(timezone('Asia/Seoul', now()) - interval '90 days', 'YYYY-MM-DD')$$
);

-- 확인
SELECT jobname, schedule, command, active FROM cron.job WHERE jobname LIKE 'okbm_%' ORDER BY jobname;
