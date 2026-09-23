-- ==============================================================================
-- 낭만루트(OKBM) Supabase gears 테이블 카테고리 전수조사 정정 스크립트
-- ==============================================================================

-- 1. [wear -> other] 의류 내 소품류 (게이터 6종, 체인아이젠 1종) -> other(기타·소품) (7건)
UPDATE public.gears SET category_id = 'other' WHERE id IN ('gear_2675', 'gear_2676', 'gear_2677', 'gear_2681', 'gear_2706', 'gear_2707', 'gear_2708');

-- 2. [shelter -> sleep] 텐트 카테고리 내 침낭 -> sleep(침낭·매트) (3건)
UPDATE public.gears SET category_id = 'sleep' WHERE id IN ('gear_3138', 'gear_3139', 'gear_3140');

-- 3. [shelter -> kitchen] 텐트 카테고리 내 스토브/버너 -> kitchen(취사) (2건)
UPDATE public.gears SET category_id = 'kitchen' WHERE id IN ('gear_3583', 'gear_3584');

-- 4. [shelter -> electronics] 텐트 카테고리 내 코베아 파이어플라이 가스랜턴 -> electronics(기기·소품) (3건)
UPDATE public.gears SET category_id = 'electronics' WHERE id IN ('gear_3592', 'gear_3593', 'gear_3594');

-- 5. [kitchen -> electronics] 취사 카테고리 내 스노우피크 기가파워 천 오토 가스랜턴 -> electronics(기기·소품) (1건)
UPDATE public.gears SET category_id = 'electronics' WHERE id IN ('gear_1460');

-- 6. [sleep -> pack] 침낭 카테고리 내 방수 수납백 및 대형 더플백 -> pack(배낭) (2건)
UPDATE public.gears SET category_id = 'pack' WHERE id IN ('gear_2585', 'gear_2249');

-- 7. [other -> sleep] 소품 카테고리 내 니모 백패킹 베개(필로) -> sleep(침낭·매트) (2건)
UPDATE public.gears SET category_id = 'sleep' WHERE id IN ('gear_2405', 'gear_2407');

-- ==============================================================================
-- [기존 1차 정정 내역]
-- ==============================================================================
-- [camp -> other] 등산스틱/트레킹폴/우산 -> other(기타·소품) (12건)
UPDATE public.gears SET category_id = 'other' WHERE id IN ('gear_1011', 'gear_1016', 'gear_1025', 'gear_1029', 'gear_1059', 'gear_1060', 'gear_1061', 'gear_1076', 'gear_1077', 'gear_1078', 'gear_1079', 'gear_1081');

-- [camp -> kitchen] 인디언 행어 -> kitchen(취사) (1건)
UPDATE public.gears SET category_id = 'kitchen' WHERE id IN ('gear_1082');

-- [camp -> other] 캠핑 수납 컨테이너 -> other(기타·소품) (2건)
UPDATE public.gears SET category_id = 'other' WHERE id IN ('gear_1116', 'gear_1117');

-- [other -> sleep] 베개/침낭라이너/블랭킷 -> sleep(침낭·매트) (50건)
UPDATE public.gears SET category_id = 'sleep' WHERE id IN ('gear_2231', 'gear_2232', 'gear_2233', 'gear_2234', 'gear_2235', 'gear_2236', 'gear_2237', 'gear_2238', 'gear_2239', 'gear_2248', 'gear_2250', 'gear_2256', 'gear_2300', 'gear_2304', 'gear_2307', 'gear_2330', 'gear_2331', 'gear_2355', 'gear_2356', 'gear_2357', 'gear_2406', 'gear_2409', 'gear_2410', 'gear_2485', 'gear_2489', 'gear_2503', 'gear_2509', 'gear_2519', 'gear_2534', 'gear_2536', 'gear_2542', 'gear_2543', 'gear_2549', 'gear_2553', 'gear_2555', 'gear_2556', 'gear_2557', 'gear_2558', 'gear_2559', 'gear_2560', 'gear_2569', 'gear_2570', 'gear_2571', 'gear_2582', 'gear_2588', 'gear_2592', 'gear_2604', 'gear_2605', 'gear_2610', 'gear_2618');
