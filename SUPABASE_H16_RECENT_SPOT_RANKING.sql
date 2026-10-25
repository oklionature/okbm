-- =========================================================================
-- H16: 지도 검색창 인기 박지 TOP 5를 '최근 7일' 기준으로 (2026-10-25)
--
-- 왜: 검색창을 누르면 뜨는 인기 장소 TOP 5가 ranking_stats의 누적 숫자(9월부터)로 순위를 매겨
--     요즘 많이 보는 박지가 올라오지 못했다(2026-10-25 기준 최근 7일 상위 5곳 중 겹치는 곳 1곳).
-- 어떻게: 회원이 정보창을 열 때 쌓이는 okbm_spot_detail_views(사람·날짜·박지마다 한 줄, E2)에서
--         최근 p_days일 동안 그 박지를 본 회원 수를 세어 많은 순으로 p_limit개만 돌려준다.
--         검색 결과를 눌러 열든 지도 핀을 눌러 열든 같이 들어가고, 검색어만 치는 것은 세지 않는다.
--         이 표는 앱에서 바로 읽지 못하게 막혀 있어 숫자만 돌려주는 함수를 둔다. 누가 봤는지는 돌려주지 않는다.
-- 화면: map-main.js fetchRecentSpotRankings가 부르고, 함수가 없거나 실패하면 예전 누적 순위를 쓴다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP FUNCTION IF EXISTS public.get_recent_spot_ranking(integer, integer);
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_recent_spot_ranking(p_days integer DEFAULT 7, p_limit integer DEFAULT 5)
RETURNS TABLE (spot_id text, viewers bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.spot_id, count(DISTINCT v.actor_id) AS viewers
  FROM public.okbm_spot_detail_views v
  JOIN public.spots s ON s.id::text = v.spot_id
  WHERE v.view_day >= (now() AT TIME ZONE 'Asia/Seoul')::date - (least(greatest(coalesce(p_days, 7), 1), 30) - 1)
  GROUP BY v.spot_id
  ORDER BY viewers DESC, v.spot_id
  LIMIT least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_recent_spot_ranking(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_spot_ranking(integer, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인: 박지 번호와 본 회원 수가 5줄 나오면 된다.
SELECT * FROM public.get_recent_spot_ranking(7, 5);
