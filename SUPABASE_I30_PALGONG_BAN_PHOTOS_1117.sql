-- I30 팔공산(502) 야영금지 근거 사진 지우기 (2026-11-17, 대표님)
-- 근거 사진 두 장이 금지 표지가 아니었다: 한 장은 지도 앱 화면, 한 장은 유튜브 검색 결과(그것도 전북 장수 팔공산).
-- 사진만 지우고 야영금지 상태·사유·제보자(camp_status_credit)는 그대로 둔다. R2 파일은 남겨 둔다.
-- 목록 칸이 바뀌므로 H14 트리거가 판 번호를 올려 앱 목록도 새로 받는다.
-- 여러 번 실행해도 안전.

UPDATE public.spots
SET camp_status_photos = NULL
WHERE id::text = '502' AND camp_status = 'banned';

SELECT id, spot_main, spot_sub, camp_status, camp_status_photos, camp_status_credit
FROM public.spots WHERE id::text = '502';
