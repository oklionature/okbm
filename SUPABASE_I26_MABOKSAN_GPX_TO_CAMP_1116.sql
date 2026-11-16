-- I26: 마복산(정상 너머 절벽 암릉, 558번) GPX가 밤 보낸 자리까지 닿게 고친다 (2026-11-16)
-- 대표님 11-16: 마복산은 정상을 지나서 간다. 핀은 무조건 하룻밤 잔 곳.
-- 마복사 입구~정상은 2023-09-23 내려온 길(거꾸로), 정상~밤 보낸 자리는 2023-09-22 첫날 걸은 길. 정상에서 두 길이 5m 안에서 만난다. 1.9km.
UPDATE public.spot_gpx_tracks SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c1c998a7-f743-40ac-a727-43c071299190.gpx', km = 1.9
WHERE id = 28 AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/cfb8f306-6567-4cc8-bb5f-6ee61b814ac9.gpx';
UPDATE public.spots SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c1c998a7-f743-40ac-a727-43c071299190.gpx'
WHERE id = '558' AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/cfb8f306-6567-4cc8-bb5f-6ee61b814ac9.gpx';
SELECT t.id, t.trailhead, t.km, (s.gpx_url = t.gpx_url) AS main_line FROM public.spot_gpx_tracks t JOIN public.spots s ON s.id = t.spot_id WHERE t.spot_id = '558';
