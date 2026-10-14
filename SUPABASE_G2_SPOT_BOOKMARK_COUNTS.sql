-- =========================================================================
-- G2 박지별 찜 수 (2026-10-14)
-- 찜은 회원마다 public.users.bookmarks(jsonb 배열, 박지 id)에 들어 있다.
-- 누가 찜했는지는 내보내지 않고 박지별 숫자만 돌려준다. 비로그인 방문자도 부른다(홈 인기 스팟 카드).
--
-- 부르기:
--   select * from okbm_spot_bookmark_counts(array['1','10']);  -- 고른 박지만 (최대 500개)
--   select * from okbm_spot_bookmark_counts();                 -- 찜 많은 순 전체 (최대 500줄)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_spot_bookmark_counts(p_spot_ids text[] DEFAULT NULL)
RETURNS TABLE (spot_id text, bookmarks bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_spot_ids IS NOT NULL AND cardinality(p_spot_ids) > 500 THEN
    RAISE EXCEPTION 'too many spot ids' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT b.sid, count(DISTINCT u.id)::bigint
    FROM public.users u
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(u.bookmarks) = 'array' THEN u.bookmarks ELSE '[]'::jsonb END
    ) AS e(v)
    CROSS JOIN LATERAL (SELECT btrim(e.v) AS sid) b
    WHERE b.sid <> ''
      AND (p_spot_ids IS NULL OR b.sid = ANY (p_spot_ids))
    GROUP BY b.sid
    ORDER BY 2 DESC, 1
    LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_spot_bookmark_counts(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_spot_bookmark_counts(text[]) TO anon, authenticated;

-- 확인: 찜 많은 박지 10곳
SELECT * FROM public.okbm_spot_bookmark_counts() LIMIT 10;
