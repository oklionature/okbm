-- H52 자유게시판 글 맨 위 고정 (2026-11-05, 대표님: '낭만루트 무료 여행 카테고리 1등' 글을 게시판 맨 위에 고정하려 했는데 기능이 없었음)
-- lounge_posts.is_pinned: 고정한 글은 게시판(전체·그 분류)과 홈 게시판 칸 맨 위에 '고정' 표시와 함께 뜬다.
-- 고정·풀기는 운영팀만. 글쓴이가 자기 글을 고칠 때 이 칸을 바꾸면 트리거가 원래 값으로 되돌린다.
-- 클라이언트: lounge.js POST_COLS·loadPosts(고정 글 따로 받기)·visiblePosts(고정 먼저)·pin-post.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행해야 목록이 안 깨진다.

ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS lounge_posts_pinned_idx ON public.lounge_posts (is_pinned) WHERE is_pinned;

-- 운영팀이 아니면 고정 칸을 못 바꾼다(새 글은 늘 false). DEFINER가 아니어야 호출자를 가린다.
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post_pin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF public.okbm_is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_pinned := false;
  ELSE
    NEW.is_pinned := OLD.is_pinned;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_pin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_posts_guard_pin ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard_pin
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post_pin();

NOTIFY pgrst, 'reload schema';
