-- H1: 기록(feeds)에 글자로 저장된 장소 이름을 등록된 박지 이름으로 맞춘다.
--
-- 기록에는 박지 번호(spot_id)와 별개로 장소 이름(spot)이 글자로 복사돼 저장된다.
-- 그래서 같은 박지가 "둔덕산"·"둔덕산 복주머니바위"처럼 다른 이름으로 남아 홈에서 따로 보였다.
--   A. 박지 번호가 있는 기록: 이름을 그 박지의 현재 이름으로 바꾼다.
--   B. 박지 번호가 없는 기록: 이름(괄호·띄어쓰기 무시)이 박지 하나의 이름과 정확히 같을 때만 번호와 이름을 붙인다.
--      비슷하기만 한 이름은 건드리지 않는다(앞으로 저장되는 기록은 앱이 저장할 때 연결한다).
--
-- 실행 방법: Supabase SQL 편집기에서 1) 미리보기 두 개를 먼저 실행해 바뀔 기록을 확인하고,
--            2) 맨 아래 "적용" 블록을 실행한다.

-- 박지의 현재 이름: fullName이 있으면 그것, 없으면 "spot_main spot_sub"
-- 비교용 키: 괄호 안 내용과 띄어쓰기를 빼고 소문자로

-- ---------------------------------------------------------------
-- 1) 미리보기 A: 박지 번호가 있는데 이름이 다른 기록
-- ---------------------------------------------------------------
SELECT f.id AS feed_id, f.spot AS 지금_이름,
       COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), '')))) AS 바뀔_이름,
       s.id AS spot_id
FROM public.feeds f
JOIN public.spots s ON s.id::text = f.spot_id::text
WHERE f.spot IS DISTINCT FROM COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), ''))))
ORDER BY s.id, f.created_at;

-- ---------------------------------------------------------------
-- 2) 미리보기 B: 박지 번호가 없는데 이름이 박지 하나와 정확히 같은 기록
-- ---------------------------------------------------------------
WITH spot_keys AS (
  SELECT s.id::text AS spot_id,
         COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), '')))) AS canonical,
         k.key
  FROM public.spots s
  CROSS JOIN LATERAL (VALUES
    (lower(regexp_replace(regexp_replace(COALESCE(s."fullName", ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'))),
    (lower(regexp_replace(regexp_replace(COALESCE(s.spot_main, ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'))),
    (lower(regexp_replace(regexp_replace(concat_ws(' ', s.spot_main, s.spot_sub), '\(.*?\)', '', 'g'), '\s+', '', 'g')))
  ) AS k(key)
  WHERE k.key <> ''
),
unique_keys AS (
  SELECT key, min(spot_id) AS spot_id, min(canonical) AS canonical
  FROM (SELECT DISTINCT key, spot_id, canonical FROM spot_keys) d
  GROUP BY key
  HAVING count(DISTINCT spot_id) = 1
)
SELECT f.id AS feed_id, f.spot AS 지금_이름, u.canonical AS 바뀔_이름, u.spot_id
FROM public.feeds f
JOIN unique_keys u
  ON u.key = lower(regexp_replace(regexp_replace(COALESCE(f.spot, ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'))
WHERE f.spot_id IS NULL OR btrim(f.spot_id::text) = ''
ORDER BY u.spot_id, f.created_at;

-- ---------------------------------------------------------------
-- 적용 (미리보기를 확인한 뒤 실행)
-- ---------------------------------------------------------------
BEGIN;

UPDATE public.feeds f
SET spot = COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), ''))))
FROM public.spots s
WHERE s.id::text = f.spot_id::text
  AND f.spot IS DISTINCT FROM COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), ''))));

WITH spot_keys AS (
  SELECT s.id::text AS spot_id,
         COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), '')))) AS canonical,
         k.key
  FROM public.spots s
  CROSS JOIN LATERAL (VALUES
    (lower(regexp_replace(regexp_replace(COALESCE(s."fullName", ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'))),
    (lower(regexp_replace(regexp_replace(COALESCE(s.spot_main, ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'))),
    (lower(regexp_replace(regexp_replace(concat_ws(' ', s.spot_main, s.spot_sub), '\(.*?\)', '', 'g'), '\s+', '', 'g')))
  ) AS k(key)
  WHERE k.key <> ''
),
unique_keys AS (
  SELECT key, min(spot_id) AS spot_id, min(canonical) AS canonical
  FROM (SELECT DISTINCT key, spot_id, canonical FROM spot_keys) d
  GROUP BY key
  HAVING count(DISTINCT spot_id) = 1
)
UPDATE public.feeds f
SET spot_id = u.spot_id, spot = u.canonical
FROM unique_keys u
WHERE (f.spot_id IS NULL OR btrim(f.spot_id::text) = '')
  AND u.key = lower(regexp_replace(regexp_replace(COALESCE(f.spot, ''), '\(.*?\)', '', 'g'), '\s+', '', 'g'));

COMMIT;
