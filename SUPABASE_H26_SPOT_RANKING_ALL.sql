-- H26: 박지 랭킹에 모든 박지가 나오게 (2026-10-31)
-- 왜: get_top_reviewed_spots가 평점 높은 순으로 50곳까지만 돌려줘서, 후기 달린 박지 65곳 중 3점대 15곳이
--     라운지 박지 후기 탭에 한 번도 안 나왔다(그래서 '다 5점대'로 보였다). 후기 많은 순 탭도 같은 목록을 쓴다.
-- 어떻게: 상한만 50 → 500으로 올린다. 나머지(정렬·후기 수 조건·속도 제한)는 그대로. 한 줄이 박지 id·평균·개수뿐이라 가볍다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: SUPABASE_F1_LOUNGE.sql의 get_top_reviewed_spots를 다시 실행(상한 50).

CREATE OR REPLACE FUNCTION public.get_top_reviewed_spots(
  p_min_count integer DEFAULT 3,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_top_reviewed_spots', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.avg_rating DESC, t.review_count DESC, t.spot_id), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT c.spot_id,
           round(avg(c.rating)::numeric, 1) AS avg_rating,
           count(*)::integer AS review_count
    FROM public.comments c
    JOIN public.spots s ON s.id = c.spot_id
    WHERE c.rating BETWEEN 1 AND 5
    GROUP BY c.spot_id
    HAVING count(*) >= GREATEST(COALESCE(p_min_count, 3), 1)
    ORDER BY avg_rating DESC, review_count DESC, c.spot_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 500)
  ) t;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_reviewed_spots(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_reviewed_spots(integer, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT jsonb_array_length(public.get_top_reviewed_spots(1, 500)) AS spots;
