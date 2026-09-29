-- =========================================================================
-- E1: 박지 상세(들머리 주소·코스/피칭/팁 본문·작성자 SNS)를 로그인 회원에게만
-- 기존: get_spot_detail이 anon에게도 전체 상세를 돌려줌 → 화면만 잠기고 API로는 열려 있었음
-- 변경: 로그인하지 않은 호출(anon, 익명 로그인)은 화면에 원래 보이던 값만 받는다.
--   guest  → desc_summary = '[뷰/특징] ' || view_brief, mediaUrls(유튜브/블로그 탭용)
--            trailhead_addr = '', author_sns_url = ''
--   member → 기존과 같은 전체 상세
--   응답에 tier('guest' | 'member')를 붙여 클라이언트가 로그인 후 다시 받게 한다.
-- 적용: Supabase SQL Editor에서 이 파일 전체 실행. 여러 번 실행해도 안전(CREATE OR REPLACE).
-- 되돌리기: SUPABASE_RLS_POLICIES_MASTER.sql의 이전 get_spot_detail 정의(git 기록) 재실행.
-- SUPABASE_RLS_POLICIES_MASTER.sql의 get_spot_detail도 같은 내용으로 맞춰 두었다.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_actor text;
  v_member boolean;
BEGIN
  v_member := auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );

  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_spot_detail', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  IF v_member THEN
    SELECT jsonb_build_object(
      'tier', 'member',
      'trailhead_addr', s.trailhead_addr,
      'desc_summary', s.desc_summary,
      'mediaUrls', s."mediaUrls",
      'author_sns_url', s.author_sns_url
    )
    INTO result
    FROM public.spots s
    WHERE s.id = btrim(p_id)
    LIMIT 1;
  ELSE
    SELECT jsonb_build_object(
      'tier', 'guest',
      'trailhead_addr', '',
      'desc_summary', CASE
        WHEN COALESCE(btrim(s.view_brief), '') = '' THEN ''
        ELSE '[뷰/특징] ' || btrim(s.view_brief)
      END,
      'mediaUrls', s."mediaUrls",
      'author_sns_url', ''
    )
    INTO result
    FROM public.spots s
    WHERE s.id = btrim(p_id)
    LIMIT 1;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO anon, authenticated, service_role;
