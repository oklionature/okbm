-- I13: 대표님(오라네) 가민 기록으로 박지 11곳 더 붙이기 (2026-11-16, I12에 이어서)
-- 대표님 11-16: 그림산·운무산·와룡산·병풍산·드름산·장령산·사명산·고리봉은 대표님이 실제로 출발한 곳(기록 시작점)부터 박지까지 넣는다.
-- 백족산 두 곳·마국산은 추천 기록 말고 다른 날 기록이 앱 들머리를 지나가서 그 들머리~박지로 넣는다. 감악산은 뺀다.
-- 검수함을 거치지 않아 포인트·랭킹·최근 등록 소식에는 들어가지 않는다. 이미 선이 있는 박지는 건드리지 않는다.
UPDATE public.spots s
SET gpx_url = v.url, gpx_credit = '오라네'
FROM (VALUES
  ('7', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/deac0bad-89fd-4459-a059-7f3c87e61d81.gpx'),  -- [신안군] 비금도 그림산 (정상 전망데크) 2024-10-16 기록 시작점~박지 2.9km
  ('248', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/bad7f109-5a39-406b-a2a4-768e3175e46f.gpx'),  -- 횡성 운무산 (정상 전망데크) 2026-05-30 기록 시작점~박지 2.8km
  ('70', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/3c96c2df-5b63-42ff-9ae5-ac2c828aa21c.gpx'),  -- 사천 와룡산 (민재봉 철쭉데크) 2026-03-23 기록 시작점~박지 6.7km
  ('353', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/3bc8e255-54b5-49d2-bd9f-911e448efe09.gpx'),  -- [담양군] 병풍산 (마당바위 천연 슬랩) 2026-05-04 기록 시작점~박지 4.1km
  ('316', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/61638b1b-8fb4-4c09-8551-1e09c06c6a43.gpx'),  -- [춘천시] 드름산 (의암봉 전망데크) 2025-04-17 기록 시작점~박지 0.7km
  ('432', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/adb6ed7c-3a37-4529-aa60-40a9e047ebf7.gpx'),  -- [옥천군] 장령산 (운무대 전망데크) 2026-05-12 기록 시작점~박지 0.4km
  ('388', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/cad96d2c-5f38-4392-bb2c-73a60c6aa94b.gpx'),  -- 양구 사명산 (정상 인근 헬기장) 2026-06-01 기록 시작점~박지 3.3km
  ('392', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/dd41a3f5-7bf3-41a0-98f9-14c231bf481c.gpx'),  -- 남원 고리봉 (정상) 2026-05-06 기록 시작점~박지 2.8km
  ('12', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/5043367d-6ef1-4262-ac32-c49d9543bbce.gpx'),  -- 백족산 (중턱 전망데크) 2024-07-24 앱 들머리~박지 2.1km
  ('67', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/dd131345-7b90-4b2c-a934-64d37debda56.gpx'),  -- 백족산 (지네굴 동굴비박) 2024-08-03 앱 들머리~박지 3.4km
  ('17', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/524a61d2-bdad-4488-8d05-a6e62eae3b8e.gpx')  -- 이천 마국산 (정상 3층 전망데크) 2025-05-14 앱 들머리~박지 1.2km
) AS v(id, url)
WHERE s.id = v.id AND COALESCE(s.gpx_url, '') = '';
