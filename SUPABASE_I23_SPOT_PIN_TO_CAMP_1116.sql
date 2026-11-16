-- I23: 박지 핀이 정상에 찍혀 있던 4곳을 대표님이 실제로 밤을 보낸 자리로 옮기고, GPX도 출발점~그 자리로 다시 자른다 (2026-11-16)
-- 대표님 11-16: 박지는 산 정상이 아니다. 가민 원래 기록에서 저녁에 멈춰 다음 날 아침 같은 자리에서 다시 시작한 곳(또는 첫날 끝·둘째 날 시작)을 밤 보낸 자리로 본다.
--   사랑산 5/3 19:55~5/4 07:37(15m) · 마복산 9/22 17:17 끝~9/23 07:40 시작(63m) · 그림산 10/16 18:30~10/17 08:57(54m) · 민둥산 9/15 17:26~9/16 08:08(8m)
-- 해발은 가민 기록 높이. 올산(24)은 핀이 이미 다른 자리(등산로 위 550m)로 옮겨져 있어 대표님께 여쭙고 따로 한다.
-- 핀: 지금 핀이 정상(옛 좌표)일 때만 옮긴다.
UPDATE public.spots s SET campsite_lat = v.lat, campsite_lng = v.lng, elevation = v.ele
FROM (VALUES
  ('25', 36.691380, 127.840229, 566, 36.6912462, 127.8344881),  -- 괴산 사랑산 (코뿔소바위) 정상 648m → 밤 보낸 자리 566m, 513m 옮김
  ('558', 34.533957, 127.385717, 521, 34.5372805, 127.3875943),  -- [고흥군] 마복산 (정상 너머 절벽 암릉) 정상 535m → 밤 보낸 자리 521m, 406m 옮김
  ('7', 34.743801, 125.922025, 214, 34.74088612, 125.9227329),  -- [신안군] 비금도 그림산 (정상 전망데크) 정상 220m → 밤 보낸 자리 214m, 329m 옮김
  ('378', 37.269195, 128.774577, 1083, 37.27106606, 128.77485717)  -- 정선 민둥산 (정상 부근 데크·능선) 정상 1119m → 밤 보낸 자리 1083m, 208m 옮김
) AS v(id, lat, lng, ele, old_lat, old_lng)
WHERE s.id = v.id AND abs(s.campsite_lat - v.old_lat) < 0.00001 AND abs(s.campsite_lng - v.old_lng) < 0.00001;

-- 선: 출발점~밤 보낸 자리
UPDATE public.spot_gpx_tracks t SET gpx_url = v.new_url, km = v.km
FROM (VALUES
  (18, 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/76912d92-0d70-4d1e-bc6f-56cad887d402.gpx', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/5805af49-2334-4fe6-adde-8a1e8a15ae48.gpx', 5.3),  -- 괴산 사랑산 (코뿔소바위) 용추슈퍼 주차장 4.2→5.3km
  (28, 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f6e2a32f-a063-4b7e-9e89-d4cc209efa71.gpx', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/cfb8f306-6567-4cc8-bb5f-6ee61b814ac9.gpx', 1.7),  -- [고흥군] 마복산 (정상 너머 절벽 암릉) 마복사 입구 1.4→1.7km
  (29, 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/deac0bad-89fd-4459-a059-7f3c87e61d81.gpx', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/fd1ec975-b4c7-48e8-8e38-c5cb4c9a25b5.gpx', 3.8),  -- [신안군] 비금도 그림산 (정상 전망데크) 상암마을주차장 2.9→3.8km
  (71, 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/05167416-10ab-4df2-b394-ea094e9de411.gpx', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/ac70a456-38da-40c9-96da-e824ac4d5ba2.gpx', 3.0),  -- 정선 민둥산 (정상 부근 데크·능선) 무릉리 쪽 2 2.3→3.0km
  (72, 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/8f7a70c7-a707-4d0d-8e6f-50b0296a84d5.gpx', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/0a100ce4-546b-4df7-be7b-0add30a17dc1.gpx', 2.2)  -- 정선 민둥산 (정상 부근 데크·능선) 무릉리 쪽 1 1.5→2.2km
) AS v(id, old_url, new_url, km)
WHERE t.id = v.id AND t.gpx_url = v.old_url;
UPDATE public.spots s SET gpx_url = t.gpx_url
FROM public.spot_gpx_tracks t
WHERE t.spot_id = s.id AND t.id = (SELECT min(id) FROM public.spot_gpx_tracks x WHERE x.spot_id = s.id) AND s.id IN ('25','558','7','378');

SELECT s.id, s."fullName", s.campsite_lat, s.campsite_lng, s.elevation, (SELECT string_agg(t.trailhead || ' ' || t.km || 'km', ', ' ORDER BY t.id) FROM public.spot_gpx_tracks t WHERE t.spot_id = s.id) AS tracks
FROM public.spots s WHERE s.id IN ('25','558','7','378') ORDER BY s.id;
