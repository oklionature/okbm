-- I25: 사랑산(코뿔소바위, 25번) GPX를 첫날 올라간 길로 다시 자른다 (2026-11-16)
-- 대표님 11-16: 코뿔소바위는 30~40분이면 올라가는데 5.3km는 말이 안 된다.
-- I23에서 둘째 날 정상을 돌아 내려온 길을 거꾸로 써서 5.3km가 됐다. 2024-05-03 17:10 용추슈퍼 쪽 출발~18:53 밤 보낸 자리 2.65km로 바꾼다.
UPDATE public.spot_gpx_tracks
SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/ede10779-025f-49ef-aab6-1202ed64823e.gpx', km = 2.6, start_lat = 36.701481, start_lng = 127.843268
WHERE id = 18 AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/5805af49-2334-4fe6-adde-8a1e8a15ae48.gpx';
UPDATE public.spots SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/ede10779-025f-49ef-aab6-1202ed64823e.gpx'
WHERE id = '25' AND gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/5805af49-2334-4fe6-adde-8a1e8a15ae48.gpx';
SELECT t.id, t.trailhead, t.km, (s.gpx_url = t.gpx_url) AS main_line, s.campsite_lat, s.campsite_lng FROM public.spot_gpx_tracks t JOIN public.spots s ON s.id = t.spot_id WHERE t.spot_id = '25';
