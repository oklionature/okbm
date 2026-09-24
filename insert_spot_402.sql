INSERT INTO public.spots (
  id, region, "cityName", spot_main, spot_sub, "fullName",
  elevation, campsite_lat, campsite_lng, terrain,
  trailhead_name, trailhead_addr, difficulty, distance_km,
  desc_summary, "droneStatus", "mediaUrls", course_type,
  author_sns_url, author, user_id, created_at
) VALUES (
  '402',
  '대구',
  '군위군',
  '아미산',
  '4봉·5봉 나무데크',
  '[군위군] 아미산 (4봉·5봉 나무데크)',
  377,
  36.16922794,
  128.8452339,
  '데크,암릉',
  '아미산등산로 주차장',
  '대구 군위군 삼국유사면 양지리 61',
  '3',
  1.0,
  '[뷰/특징]
대구 군위군 삼국유사면의 아미산입니다. 정상은 737m이며, 들머리 쪽에는 다섯 개의 암봉이 이어지는 작은 공룡능선이 펼쳐집니다. 1봉 송곳바위, 3봉 앵기랑바위(365m)가 대표 기암이고, 4봉과 5봉을 잇는 나무데크에서 암릉 조망이 열립니다. 앵기랑바위는 아래에서 보면 애기동자승 모양이라 불리며, 바위를 훼손하면 마을에 좋지 않은 일이 생긴다는 전설이 전해집니다.

[접근/코스]
들머리는 아미산등산로 주차장(대구 군위군 삼국유사면 양지리 61, 도로명 삼국유사로 1122)입니다. 주차는 무료이며 화장실이 있습니다. 다리를 건너 데크 계단으로 오르며, 송곳바위(1봉)→2봉→앵기랑바위(3봉) 우회길→4봉·5봉 나무데크로 이어지는 편도 약 1.0km의 최단 암릉 코스입니다. 거리는 짧지만 가파른 암릉과 계단이 이어지니 접지력 좋은 등산화를 권합니다.

[장소/피칭]
박지는 4봉과 5봉을 잇는 나무데크입니다. 데크가 협소하고, 세로로 피칭하면 텐트 가장자리가 마사토 쪽으로 나갈 수 있어 데크팩을 챙기시면 좋습니다. 아미산 정상(737m)까지는 암릉 이후 숲길이 더 이어지며, 조망의 핵심은 들머리 암릉 구간에 있습니다.

[주의/팁]
앵기랑바위는 우회길을 이용하고 울타리를 넘지 마세요. 낙석 주의 안내가 있는 구간이니 바위 아래에서 오래 머물지 않는 편이 안전합니다. 쓰레기는 전량 반출하고, 산불조심기간 입산통제는 출발 전 확인하세요.',
  '',
  'https://www.youtube.com/watch?v=l33zICeD1FI
https://www.youtube.com/watch?v=rwBNGsTgBog
https://blog.naver.com/yxxjxxu/224065523398
https://blog.naver.com/smilehaena/224277393688',
  '최단',
  '',
  '관리자',
  '',
  now()
) ON CONFLICT (id) DO UPDATE SET
  region = EXCLUDED.region,
  "cityName" = EXCLUDED."cityName",
  spot_main = EXCLUDED.spot_main,
  spot_sub = EXCLUDED.spot_sub,
  "fullName" = EXCLUDED."fullName",
  elevation = EXCLUDED.elevation,
  campsite_lat = EXCLUDED.campsite_lat,
  campsite_lng = EXCLUDED.campsite_lng,
  terrain = EXCLUDED.terrain,
  trailhead_name = EXCLUDED.trailhead_name,
  trailhead_addr = EXCLUDED.trailhead_addr,
  difficulty = EXCLUDED.difficulty,
  distance_km = EXCLUDED.distance_km,
  desc_summary = EXCLUDED.desc_summary,
  "droneStatus" = EXCLUDED."droneStatus",
  "mediaUrls" = EXCLUDED."mediaUrls",
  course_type = EXCLUDED.course_type;
