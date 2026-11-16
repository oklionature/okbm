-- I24: 올산(천연 바위박지, 24번) 핀을 대표님이 밤을 보낸 자리로 옮기고 GPX를 미노교~그 자리로 다시 자른다 (2026-11-16)
-- 대표님 11-16: 박지는 정상이 아니다, 밤 보낸 자리(607m)가 바위박지.
-- 2024-05-17 기록이 17:04에 멈추고 5/18 08:17에 20m 옆에서 다시 시작. 핀은 오늘 등산로 위 550m 점(36.857251, 128.366273)에 있던 것을 옮긴다.
-- 선: 첫날 미노교 출발~밤 보낸 자리 4.7km(예전 선은 둘째 날 정상까지 5.0km).
UPDATE public.spots SET campsite_lat = 36.858517, campsite_lng = 128.356292, elevation = 607
WHERE id = '24' AND abs(campsite_lat - 36.857251) < 0.00001 AND abs(campsite_lng - 128.366273) < 0.00001;

UPDATE public.spot_gpx_tracks
SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/6c4d2b21-aeac-4bad-9be0-4db63a16e5d9.gpx',
    km = 4.7, start_lat = 36.871581, start_lng = 128.369220
WHERE id = 42 AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c002a9f0-3255-43e2-8c9e-00b68d1a0909.gpx';
UPDATE public.spots SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/6c4d2b21-aeac-4bad-9be0-4db63a16e5d9.gpx'
WHERE id = '24' AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c002a9f0-3255-43e2-8c9e-00b68d1a0909.gpx';

SELECT s.id, s.campsite_lat, s.campsite_lng, s.elevation, t.trailhead, t.km, (s.gpx_url = t.gpx_url) AS main_line
FROM public.spots s JOIN public.spot_gpx_tracks t ON t.spot_id = s.id WHERE s.id = '24';
