-- I17: 고봉 (바위틈 비박지, 36번)에 대표님(오라네) 가민 기록을 붙인다 (2026-11-16)
-- 대표님 11-16: 고봉 기록 중 해발이 낮은 것은 바위틈 비박지, 높은 것은 파노라마 능선(2번)에 붙인다.
-- 2024-05-06~07 기록 하나뿐이고 가장 높은 곳이 해발 375m(바위틈 비박지 핀과 7m)라 36번에 붙인다. 파노라마 능선(약 418m)까지 간 기록은 없다.
-- 기록 시작점(서운리 산자락)~박지 1.05km. 검수함을 거치지 않아 포인트·랭킹·최근 등록 소식에는 들어가지 않는다(user_id 없음).
INSERT INTO public.spot_gpx_tracks (spot_id, gpx_url, trailhead, start_lat, start_lng, km, credit)
VALUES ('36', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/b68bfd97-c556-46bd-ba64-ab4716550aa1.gpx',
        '서운리 쪽', 36.986567, 128.064102, 1.1, '오라네')
ON CONFLICT (spot_id, gpx_url) DO NOTHING;

UPDATE public.spots
SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/b68bfd97-c556-46bd-ba64-ab4716550aa1.gpx',
    gpx_credit = '오라네'
WHERE id = '36' AND COALESCE(gpx_url, '') = '';
