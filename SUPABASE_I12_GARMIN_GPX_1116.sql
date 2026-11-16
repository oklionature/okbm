-- I12: 대표님(오라네) 가민 기록으로 박지 32곳에 GPX 붙이기 (2026-11-16)
-- 가민 GPS 기록 652개를 박지 좌표(100m 안)·들머리(300m 안)와 대조해 맞는 것만 골라,
-- 들머리~박지 구간만 잘라 좌표만 남긴 GPX를 R2 gpx/<오라네 uid>/에 올렸다.
-- 검수함(spot_gpx_submissions)을 거치지 않아 포인트·라운지 GPX 랭킹·최근 등록 소식에는 들어가지 않는다(대표님 11-16).
-- 이미 선이 있는 박지는 건드리지 않는다. 여러 번 실행해도 된다.
UPDATE public.spots s
SET gpx_url = v.url, gpx_credit = '오라네'
FROM (VALUES
  ('9', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/eebf8a8d-0c59-4b58-8a6b-6274d80962a9.gpx'),  -- 여주 자산 (합수머리 강변노지) 2.0km
  ('11', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/44b304a6-7a6d-466a-802b-c8459ba48528.gpx'),  -- [광주시] 태화산 (정상 데크) 3.4km
  ('13', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f2bf1300-10ab-4097-b5b1-eb266ff7a1c5.gpx'),  -- 용인 시궁산 (정상 넓은 데크) 2.3km
  ('16', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c8da34d6-f0ea-41f8-951f-befe1fb273b1.gpx'),  -- 양평 추읍산 (정상 전망데크) 1.6km
  ('24', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c002a9f0-3255-43e2-8c9e-00b68d1a0909.gpx'),  -- 단양 올산 (천연 바위박지) 5.0km
  ('25', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/76912d92-0d70-4d1e-bc6f-56cad887d402.gpx'),  -- 괴산 사랑산 (코뿔소바위) 4.2km
  ('26', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/b97d6daa-70dc-4586-bc6b-62ac5d1eba2f.gpx'),  -- [완도군] 완도 상왕산 (백운봉 암릉돌침대) 10.8km
  ('30', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/413906ff-1b48-402d-9942-60b280ad8a33.gpx'),  -- 해남 달마산 (문바위 공룡능선) 1.4km
  ('42', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/bfdc6c50-619a-4d8c-bdcd-a909c565010d.gpx'),  -- [삼척시] 쉰움산 (오십정 돌침대) 4.6km
  ('74', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f4e848f2-2870-48ce-a773-58a62e8b990a.gpx'),  -- 보성 일림산 (철쭉군락지 전망데크) 3.2km
  ('113', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/e27cf9b0-9c96-4d3a-abda-d4b8c34608c0.gpx'),  -- 포천 왕방산 (관모봉 전망정자)옆 공터 3.8km
  ('118', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/c1c0e8a9-9097-434b-98a9-50c74a6f211d.gpx'),  -- 화성 태행산 (정상 전망데크) 1.3km
  ('272', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/54636aa6-c95f-4660-a45d-be13a204bb23.gpx'),  -- 수원 광교산 (시루봉·능선 데크) 6.2km
  ('273', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/73f0862b-1801-47cf-80d1-fd70d171a289.gpx'),  -- 의왕 모락산 (국기봉 데크) 1.6km
  ('283', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/32ba8707-8b4d-42e0-9aed-51abb5f64d08.gpx'),  -- 용인 조비산 (정상 데크·공터) 1.3km
  ('284', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/1ad86f52-f13e-4cee-9036-362f3add0ab6.gpx'),  -- 용인 마구산 (정상 데크) 2.9km
  ('286', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/35b01057-7826-447e-bccb-1e7d2c20e626.gpx'),  -- 광주 미역산 (정상·하산 데크) 1.7km
  ('307', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/fd21d6fb-f495-4c1d-b702-7c234500c7ad.gpx'),  -- [군산시] 대각산 (신시도 3층 전망타워 데크) 1.5km
  ('315', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/a0691d65-cce4-4174-bb32-acbe10d3a9ca.gpx'),  -- [가평군] 울업산 (신선봉 제2전망대 데크) 7.7km
  ('367', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/961401c6-6379-4785-af88-4513299d4ac8.gpx'),  -- [순창군] 회문산 (작은지붕 헬기장 및 큰지붕 데크) 4.0km
  ('376', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/75dd3263-51ca-4471-b31b-47eecad4a485.gpx'),  -- 화순 백아산 (마당바위) 2.4km
  ('377', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/4f18d1c9-2744-4eff-a9c3-521d9d76dd84.gpx'),  -- 영월 구봉대산 (정상) 4.3km
  ('383', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/bbfcf5cd-dd3f-4674-906b-1ac70171e126.gpx'),  -- [진도군] 진도 동석산 (정상 암릉) 10.2km
  ('387', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/a42525bc-8a2a-40d5-9297-c885a9d3512b.gpx'),  -- 화순 모후산 (정상 헬기장) 4.2km
  ('393', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/bcf5ec01-8286-46af-a040-3593649a706e.gpx'),  -- 남원 만행산 (정상 천황봉) 5.0km
  ('395', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/924989c1-c2cc-46f8-ac95-efbbb0f27ccd.gpx'),  -- 장수 팔공산 (헬기장) 2.3km
  ('397', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/2e6ca03e-cc17-4bd1-be3b-d65314cccfeb.gpx'),  -- 보성 초암산 (정상 헬기장) 3.0km
  ('398', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f6a8920e-50c7-4863-a471-3581c287d49b.gpx'),  -- 보성 오봉산 (정상 전망데크) 2.6km
  ('400', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f62bbc26-c2e1-44ba-8505-ea1c1194f03c.gpx'),  -- 금산 진악산 (정상 전망데크) 2.3km
  ('558', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/f6e2a32f-a063-4b7e-9e89-d4cc209efa71.gpx'),  -- [고흥군] 마복산 (정상 너머 절벽 암릉) 1.4km
  ('570', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/2130d7dd-a3c4-4323-81ff-4dc2a32091c3.gpx'),  -- [양주시] 불곡산 (임꺽정봉 절벽 박지) 3.0km
  ('577', 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/d96b165d-32f5-41d1-830c-010d1307fe2a/402b2937-92a6-48c0-aba4-7aa5656c1a3a.gpx')  -- [충남] 팔봉산 (정상테크, 정상 미투2봉가는길 용굴 속 노지) 5.1km
) AS v(id, url)
WHERE s.id = v.id AND COALESCE(s.gpx_url, '') = '';
