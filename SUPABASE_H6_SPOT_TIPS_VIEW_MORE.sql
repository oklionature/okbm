-- H6: "다녀왔음" 팁 칩 풍경에 3개 추가 (2026-10-16)
-- 360도 파노라마 뷰 · 바다 뷰 · 호수 뷰  (화면 spot-tips.js GROUPS와 같아야 한다)
-- 한 사람이 고를 수 있는 최대 개수는 풍경 8 + 박지 크기 1 + 분위기 1 + 알아 둘 것 4 = 14라
-- 기존 제한(cardinality(tips) <= 14)은 그대로 둔다.
--
-- 실행: Supabase SQL 편집기에서 이 파일 전체를 한 번 실행한다(여러 번 실행해도 된다).
-- 화면(spot-tips.js?v=7)을 올리기 전에 먼저 실행한다. 안 하면 새 칩이 저장될 때 조용히 빠진다.

CREATE OR REPLACE FUNCTION public.okbm_spot_tip_allowed()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    '일출 명소', '일몰 명소', '운해', '야경', '별이 잘 보임',
    '360도 파노라마 뷰', '바다 뷰', '호수 뷰',
    '텐트 1~2동', '텐트 3~5동', '텐트 6동 이상',
    '조용함', '사람 많음',
    '바람 셈', '그늘 없음', '벌레 많음', '통신 약함'
  ]::text[];
$$;
