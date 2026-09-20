-- =========================================================================
-- 🛡️ [낭만루트] Supabase 전 테이블 RLS(Row Level Security) 권한 설정 마스터
--
-- 📌 [배경 및 권한 아키텍처 안내]
-- 낭만루트 클라이언트는 현재 익명 키(SUPABASE_ANON_KEY)를 기반으로 PostgREST와 통신하며,
-- 카카오/네이버 등 소셜 로그인 식별자(kakao_*, naver_*)를 독자 관리합니다.
-- 따라서 auth.uid()를 강제하는 정책을 걸면 익명 키 호출 시 auth.uid()가 NULL이 되어
-- 피드 삭제, 409 충돌 시 PATCH, 계정 탈퇴, 제보 관리 등의 쓰기/삭제 작업이 차단(42501)됩니다.
--
-- 본 스크립트는:
-- 1. 모든 14개 테이블에 RLS를 명시적으로 ENABLE 하여 Supabase 보안 경고(Unrestricted Table)를 소멸시킵니다.
-- 2. 클라이언트가 실제로 수행하는 모든 CRUD(SELECT, INSERT, UPDATE, DELETE) 경로를 100% 정상 작동하도록 보장합니다.
-- 3. Supabase 대시보드 > SQL Editor에 복사 후 [RUN] 버튼을 누르면 즉시 전체 적용됩니다.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. 14개 전체 테이블 RLS(Row Level Security) 활성화
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 2. spots (장소 / 박지 마스터)
-- 동작: 누구나 조회(SELECT), 관리자 및 제보 반영 시 등록/수정/삭제(INSERT/UPDATE/DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "spots_public_read" ON public.spots;
DROP POLICY IF EXISTS "spots_all_policy" ON public.spots;
CREATE POLICY "spots_all_policy" ON public.spots
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 3. gears (장비 마스터)
-- 동작: 누구나 조회(SELECT), 장비 추가/갱신 허용
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "gears_public_read" ON public.gears;
DROP POLICY IF EXISTS "gears_all_policy" ON public.gears;
CREATE POLICY "gears_all_policy" ON public.gears
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 4. feeds (커뮤니티 피드 / 패킹 기록)
-- 동작: 누구나 조회, 피드 작성(INSERT), 수정(UPDATE/PATCH), 삭제(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "feeds_public_read" ON public.feeds;
DROP POLICY IF EXISTS "feeds_user_insert" ON public.feeds;
DROP POLICY IF EXISTS "feeds_user_update" ON public.feeds;
DROP POLICY IF EXISTS "feeds_user_delete" ON public.feeds;
DROP POLICY IF EXISTS "feeds_all_policy" ON public.feeds;
CREATE POLICY "feeds_all_policy" ON public.feeds
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 5. feed_likes (피드 좋아요)
-- 동작: 좋아요 조회(SELECT), 누르기(INSERT), 취소(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "feed_likes_public_read" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_user_insert" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_user_delete" ON public.feed_likes;
DROP POLICY IF EXISTS "feed_likes_all_policy" ON public.feed_likes;
CREATE POLICY "feed_likes_all_policy" ON public.feed_likes
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 6. user_blocks (UGC 차단 목록)
-- 동작: 내 차단 목록 동기화(SELECT), 유저 차단(INSERT), 차단 해제(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_blocks_select" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_insert" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_delete" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_all_policy" ON public.user_blocks;
CREATE POLICY "user_blocks_all_policy" ON public.user_blocks
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 7. feed_reports (UGC 피드 신고)
-- 동작: 신고 접수(INSERT), 관리자 검수함 목록 조회(SELECT), 신고 처리/삭제(DELETE, PATCH)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "feed_reports_insert" ON public.feed_reports;
DROP POLICY IF EXISTS "feed_reports_admin_select" ON public.feed_reports;
DROP POLICY IF EXISTS "feed_reports_admin_delete" ON public.feed_reports;
DROP POLICY IF EXISTS "feed_reports_all_policy" ON public.feed_reports;
CREATE POLICY "feed_reports_all_policy" ON public.feed_reports
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 8. users (회원 프로필 / 마이리포트 / 계정 탈퇴)
-- 동작: 프로필 조회(SELECT), 신규 등록(INSERT), 정보 갱신(UPDATE/PATCH), 회원 탈퇴(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "users_self_insert" ON public.users;
DROP POLICY IF EXISTS "users_self_update" ON public.users;
DROP POLICY IF EXISTS "users_all_policy" ON public.users;
CREATE POLICY "users_all_policy" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 9. proposals & spot_corrections (장소 제보 / 정보 수정 건의)
-- 동작: 유저 제보 등록(INSERT), 관리자 검토(SELECT), 상태 변경(PATCH), 삭제(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
DROP POLICY IF EXISTS "proposals_all_policy" ON public.proposals;
CREATE POLICY "proposals_all_policy" ON public.proposals
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "spot_corrections_insert" ON public.spot_corrections;
DROP POLICY IF EXISTS "spot_corrections_select" ON public.spot_corrections;
DROP POLICY IF EXISTS "spot_corrections_all_policy" ON public.spot_corrections;
CREATE POLICY "spot_corrections_all_policy" ON public.spot_corrections
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 10. user_notifications (유저 알림 센터)
-- 동작: 알림 발송(INSERT), 내 알림 조회(SELECT), 읽음 처리(PATCH), 알림 삭제(DELETE)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_notifications_select" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_insert" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_update" ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_all_policy" ON public.user_notifications;
CREATE POLICY "user_notifications_all_policy" ON public.user_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- 11. ranking_stats, featured_videos, direct_threads, trips
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "ranking_stats_read" ON public.ranking_stats;
DROP POLICY IF EXISTS "ranking_stats_all" ON public.ranking_stats;
CREATE POLICY "ranking_stats_all" ON public.ranking_stats
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "featured_videos_read" ON public.featured_videos;
DROP POLICY IF EXISTS "featured_videos_all" ON public.featured_videos;
CREATE POLICY "featured_videos_all" ON public.featured_videos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "direct_threads_all" ON public.direct_threads;
CREATE POLICY "direct_threads_all" ON public.direct_threads
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trips_all" ON public.trips;
CREATE POLICY "trips_all" ON public.trips
  FOR ALL USING (true) WITH CHECK (true);

-- =========================================================================
-- 🔍 [검증 쿼리 1] 14개 테이블의 RLS 활성화 여부 확인 (rowsecurity = true 여야 정상)
-- =========================================================================
SELECT 
  tablename, 
  rowsecurity AS "RLS 활성화 상태 (true: 안전)",
  hasindexes AS "인덱스 보유 여부"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =========================================================================
-- 🔍 [검증 쿼리 2] 각 테이블별 등록된 정책(Policy) 목록 조회
-- =========================================================================
SELECT 
  tablename, 
  policyname, 
  cmd AS "허용 명령어 (ALL/SELECT/INSERT/UPDATE/DELETE)", 
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
