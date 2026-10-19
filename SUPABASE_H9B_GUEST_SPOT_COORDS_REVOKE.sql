-- =========================================================================
-- H9B: 비회원(anon)은 spots 표에서 좌표·들머리 이름을 직접 읽지 못하게 (2026-10-19)
--
-- 전제: H9A(get_spot_pins)를 실행했고, 새 화면 코드(비회원은 좌표 없이 목록을 받고 핀은 get_spot_pins로)가
--       배포된 뒤다. 순서를 바꾸면 옛 화면을 쓰는 비회원 지도에 박지가 안 뜬다.
-- 회원(authenticated)은 지금과 같다. 좌표·들머리 이름까지 목록으로 받는다.
-- 되돌리기: GRANT SELECT (campsite_lat, campsite_lng, trailhead_name) ON public.spots TO anon;
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- =========================================================================

REVOKE SELECT (campsite_lat, campsite_lng, trailhead_name) ON public.spots FROM anon;

-- 확인: anon이 읽을 수 있는 spots 칸. campsite_lat·campsite_lng·trailhead_name이 없어야 한다.
SELECT column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'spots'
  AND grantee = 'anon' AND privilege_type = 'SELECT'
ORDER BY column_name;
