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
--
-- !! 적용 완료·실행 차단 (2026-09-30, FILE_AUDIT F3) !!
-- 이 파일의 get_spot_detail은 옛 버전(회원 분당 60, 하루 한도 없음)이다. 지금 원본은
-- SUPABASE_RLS_POLICIES_MASTER.sql(= E2 적용본: 회원 분당 20·하루 100곳). 실수로 실행하면 한도가 풀린다.
-- 그래서 맨 앞에서 트랜잭션을 열고 바로 오류를 낸다(SQL Editor는 전체 중단, psql은 뒤 문장 모두 거부 후 ROLLBACK).
-- 기록용으로만 둔다.
-- =========================================================================

BEGIN;
DO $$ BEGIN RAISE EXCEPTION 'SUPABASE_E1_SPOT_DETAIL_MEMBER_ONLY.sql is superseded (old get_spot_detail limits). Do not run. Use SUPABASE_RLS_POLICIES_MASTER.sql.'; END $$;
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

-- 실행 차단: 위 BEGIN과 짝. 여기까지 왔다면 앞 문장은 모두 거부된 상태다.
ROLLBACK;
