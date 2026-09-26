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

-- 확인
SELECT jobname, schedule, command, active FROM cron.job WHERE jobname LIKE 'okbm_%' ORDER BY jobname;
