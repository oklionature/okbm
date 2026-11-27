-- I40 '엑스써름'을 '엑스썸'으로 고친다(대표님 11-27: 썰음이 아니라 썸). 옛 이름은 앱 별칭으로 남긴다.
UPDATE public.gears SET item_name = '써머레스트 네오에어 엑스썸 NXT', updated_at = '2026-11-27' WHERE id = 'gear_2531';
UPDATE public.gears SET item_name = '써머레스트 네오에어 엑스썸 NXT 맥스', updated_at = '2026-11-27' WHERE id = 'gear_3745';
SELECT id, item_name FROM public.gears WHERE id IN ('gear_2531','gear_3745');
