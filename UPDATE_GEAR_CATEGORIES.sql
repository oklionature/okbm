-- ==============================================================================
-- 낭만루트(OKBM) Supabase gears 테이블 카테고리 전수조사 정정 스크립트
-- 총 65개 품목 카테고리 재분류
-- ==============================================================================

-- [camp -> other] 등산스틱/트레킹폴/우산 -> other(기타·소품) (12건)
UPDATE public.gears SET category_id = 'other' WHERE id IN ('gear_1011', 'gear_1016', 'gear_1025', 'gear_1029', 'gear_1059', 'gear_1060', 'gear_1061', 'gear_1076', 'gear_1077', 'gear_1078', 'gear_1079', 'gear_1081');

-- [camp -> kitchen] 인디언 행어 -> kitchen(취사) (1건)
UPDATE public.gears SET category_id = 'kitchen' WHERE id IN ('gear_1082');

-- [camp -> other] 캠핑 수납 컨테이너 -> other(기타·소품) (2건)
UPDATE public.gears SET category_id = 'other' WHERE id IN ('gear_1116', 'gear_1117');

-- [other -> sleep] 베개/침낭라이너/블랭킷 -> sleep(침낭·매트) (50건)
UPDATE public.gears SET category_id = 'sleep' WHERE id IN ('gear_2231', 'gear_2232', 'gear_2233', 'gear_2234', 'gear_2235', 'gear_2236', 'gear_2237', 'gear_2238', 'gear_2239', 'gear_2248', 'gear_2250', 'gear_2256', 'gear_2300', 'gear_2304', 'gear_2307', 'gear_2330', 'gear_2331', 'gear_2355', 'gear_2356', 'gear_2357', 'gear_2406', 'gear_2409', 'gear_2410', 'gear_2485', 'gear_2489', 'gear_2503', 'gear_2509', 'gear_2519', 'gear_2534', 'gear_2536', 'gear_2542', 'gear_2543', 'gear_2549', 'gear_2553', 'gear_2555', 'gear_2556', 'gear_2557', 'gear_2558', 'gear_2559', 'gear_2560', 'gear_2569', 'gear_2570', 'gear_2571', 'gear_2582', 'gear_2588', 'gear_2592', 'gear_2604', 'gear_2605', 'gear_2610', 'gear_2618');
