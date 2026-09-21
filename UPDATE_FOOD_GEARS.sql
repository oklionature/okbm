-- ==============================================================================
-- 낭만루트(OKBM) Supabase gears 테이블 음식(food) 카테고리 품목명 간결화 및 부연설명 정리
-- '백패킹' 중복 단어 제거 및 괄호 내 과도한 설명(소형페트, 원샷캔, 16oz 등) 제거
-- ==============================================================================

-- 1. 식수 / 보틀
UPDATE gears SET item_name = '생수병 500ml (페트병 포함)' WHERE id = 'gear_2812' OR gear_id = 'gear_2812';
UPDATE gears SET item_name = '생수병 1.0L (페트병 포함)' WHERE id = 'gear_2813' OR gear_id = 'gear_2813';
UPDATE gears SET item_name = '미니 생수병 300ml' WHERE id = 'gear_2814' OR gear_id = 'gear_2814';
UPDATE gears SET item_name = '날진 트라이탄 보틀 500ml (식수 포함)' WHERE id = 'gear_2856' OR gear_id = 'gear_2856';
UPDATE gears SET item_name = '날진 트라이탄 보틀 1.0L (식수 포함)' WHERE id = 'gear_2857' OR gear_id = 'gear_2857';
UPDATE gears SET item_name = '날진 울트라라이트 HDPE 보틀 1.0L (식수 포함)' WHERE id = 'gear_2858' OR gear_id = 'gear_2858';

-- 2. 소주 (Soju)
UPDATE gears SET item_name = '팩소주 (200ml)' WHERE id = 'gear_2838' OR gear_id = 'gear_2838';
UPDATE gears SET item_name = '포켓소주 (200ml)' WHERE id = 'gear_2839' OR gear_id = 'gear_2839';
UPDATE gears SET item_name = '페트소주 (400ml)' WHERE id = 'gear_2840' OR gear_id = 'gear_2840';
UPDATE gears SET item_name = '페트소주 (500ml)' WHERE id = 'gear_2841' OR gear_id = 'gear_2841';
UPDATE gears SET item_name = '페트소주 (640ml)' WHERE id = 'gear_2842' OR gear_id = 'gear_2842';
UPDATE gears SET item_name = '페트소주 (1.8L)' WHERE id = 'gear_2843' OR gear_id = 'gear_2843';
UPDATE gears SET item_name = '병소주 (360ml)' WHERE id = 'gear_2844' OR gear_id = 'gear_2844';
UPDATE gears SET item_name = '증류식 소주 (375ml)' WHERE id = 'gear_2845' OR gear_id = 'gear_2845';

-- 3. 맥주 (Beer)
UPDATE gears SET item_name = '캔맥주 (135ml)' WHERE id = 'gear_2846' OR gear_id = 'gear_2846';
UPDATE gears SET item_name = '캔맥주 (250ml)' WHERE id = 'gear_2847' OR gear_id = 'gear_2847';
UPDATE gears SET item_name = '캔맥주 (355ml)' WHERE id = 'gear_2848' OR gear_id = 'gear_2848';
UPDATE gears SET item_name = '캔맥주 (330ml)' WHERE id = 'gear_2849' OR gear_id = 'gear_2849';
UPDATE gears SET item_name = '캔맥주 (500ml)' WHERE id = 'gear_2850' OR gear_id = 'gear_2850';
UPDATE gears SET item_name = '수제맥주 캔 (473ml)' WHERE id = 'gear_2851' OR gear_id = 'gear_2851';
UPDATE gears SET item_name = '점보 캔맥주 (740ml)' WHERE id = 'gear_2852' OR gear_id = 'gear_2852';
UPDATE gears SET item_name = '맥주 피처 (1.0L)' WHERE id = 'gear_2853' OR gear_id = 'gear_2853';
UPDATE gears SET item_name = '맥주 피처 (1.6L)' WHERE id = 'gear_2854' OR gear_id = 'gear_2854';
UPDATE gears SET item_name = '병맥주 (500ml)' WHERE id = 'gear_2855' OR gear_id = 'gear_2855';

-- 4. 행동식 / 기호식품
UPDATE gears SET item_name = '에너지바 / 프로틴바 1개 (200kcal)' WHERE id = 'gear_2815' OR gear_id = 'gear_2815';
UPDATE gears SET item_name = '파워젤 / 미니 양갱 1개' WHERE id = 'gear_2816' OR gear_id = 'gear_2816';
UPDATE gears SET item_name = '소포장 육포 / 견과류 1봉' WHERE id = 'gear_2817' OR gear_id = 'gear_2817';
UPDATE gears SET item_name = '드립백 커피 / 분말 스틱 1포' WHERE id = 'gear_2818' OR gear_id = 'gear_2818';

-- 5. 비화식 발열도시락 / 건조밥
UPDATE gears SET item_name = '핫앤쿡 라면애밥 (발열도시락)' WHERE id = 'gear_2805' OR gear_id = 'gear_2805';
UPDATE gears SET item_name = '핫앤쿡 비빔밥 (발열도시락)' WHERE id = 'gear_2806' OR gear_id = 'gear_2806';
UPDATE gears SET item_name = '핫앤쿡 떡라면애밥 (발열도시락)' WHERE id = 'gear_2807' OR gear_id = 'gear_2807';
UPDATE gears SET item_name = '더온 플러스 발열도시락' WHERE id = 'gear_2808' OR gear_id = 'gear_2808';
UPDATE gears SET item_name = '이지밥 바로비빔밥 (건조밥)' WHERE id = 'gear_2809' OR gear_id = 'gear_2809';
UPDATE gears SET item_name = '바로쿡 사각 발열도시락 850ml' WHERE id = 'gear_2810' OR gear_id = 'gear_2810';
UPDATE gears SET item_name = '바로쿡 전용 발열팩 50g (1개)' WHERE id = 'gear_2811' OR gear_id = 'gear_2811';

