-- H4: 정보창 링크 순서와 숏츠 막기
--
-- 1) 크리에이터 등록에서 유튜브 숏츠(youtube.com/shorts/…) 주소를 받지 않는다.
-- 2) 박지 링크 칸(mediaUrls) 중 사용자가 기록 저장으로 덧붙인 주소 목록을 돌려준다.
--    정보창은 이 목록으로 "관리자가 넣은 링크"와 구분해 순서를 정한다:
--    관리자 → 크리에이터 → 기록에서 들어온 링크 → 자동 검색
-- 필요: SUPABASE_H2_SPOT_CREATOR_LINKS.sql 실행 후
--
-- 실행: Supabase SQL 편집기에서 이 파일 전체를 한 번 실행한다(여러 번 실행해도 된다).

CREATE OR REPLACE FUNCTION public.okbm_creator_link_kind(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_url ~* 'youtube\.com/shorts/' THEN NULL
    WHEN p_url ~* '^https://(www\.|m\.)?youtube\.com/(watch\?([^#\s]*&)?v=|live/)[A-Za-z0-9_-]{11}' THEN 'yt'
    WHEN p_url ~* '^https://youtu\.be/[A-Za-z0-9_-]{11}' THEN 'yt'
    WHEN p_url ~* '^https://(m\.)?blog\.naver\.com/[A-Za-z0-9_-]+/[0-9]+' THEN 'blog'
    WHEN p_url ~* '^https://(m\.)?blog\.naver\.com/PostView\.naver\?.*logNo=[0-9]+' THEN 'blog'
    WHEN p_url ~* '^https://(www\.)?instagram\.com/(p|reel|reels|tv)/[A-Za-z0-9_-]+' THEN 'insta'
    ELSE NULL
  END;
$$;

-- 기록 저장으로 덧붙은 주소(spot_media_contributions). 주소는 이미 공개된 mediaUrls의 일부라 비회원도 읽는다.
CREATE OR REPLACE FUNCTION public.get_spot_contributed_media(p_spot_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
BEGIN
  IF v_spot IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(c.url ORDER BY c.created_at)
    FROM public.spot_media_contributions c
    WHERE c.spot_id = v_spot
  ), '[]'::jsonb);
EXCEPTION WHEN undefined_table THEN
  RETURN '[]'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_contributed_media(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_contributed_media(text) TO anon, authenticated, service_role;
