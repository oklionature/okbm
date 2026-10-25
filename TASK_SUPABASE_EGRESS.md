# Supabase 다운로드 양(Egress) 줄이기

작성 2026-10-25. 다음 창에서 이 문서만 보고 바로 이어서 할 수 있게 적었다.

## 왜 하나
- Supabase 무료 한도: Egress 5GB, Cached Egress 5GB (결제 기간마다, 지금 기간 10/13~11/13).
- 지난 기간에 Cached Egress를 넘어 **유예 기간이 시작됐고 11/20에 끝난다.** 유예는 한 번뿐이라 이후에 또 넘으면 바로 제한된다(모든 요청 402 → 앱이 빈 화면).
- Cached Egress가 넘은 원인(10/16~21 Storage 사진)은 10/21 R2 이전으로 이미 해결됐다. 그 뒤로는 0이다.
- **남은 위험은 일반 Egress다.** 10/25 기준 1.90GB, 하루 평균 약 140MB라서 기간이 끝날 때 4.5GB 안팎으로 예상된다. 다음 기간부터는 5GB를 넘으면 바로 막힐 수 있다.

## 잰 숫자 (2026-10-25, curl gzip 전송 크기)
| 요청 | 크기 | 언제 |
|---|---|---|
| `spots` 목록(SPOTS_GUEST_SELECT, 431곳) | **100KB** (원본 370KB) | 지도 열 때마다 + 홈 첫 방문 |
| └ 그중 `view_brief`만 | **67KB** | |
| └ id·이름·지역 열 | 16KB | |
| └ 나머지 숫자·상태 열 | 약 7KB | |
| 포토맵 피드 목록(photo-map.js `fetchPublicFeeds`) | 22KB | 지도 들어오고 4초 뒤 미리 받기, 같은 방문 동안 sessionStorage 재사용 |
| 홈 피드 `limit=40` | 20KB | 홈 |
| 홈 피드 `likes_count` 순 `limit=30` | 12KB | 홈 |
| 홈 피드 `limit=10` | 5KB | 홈 |
| `lounge_guides` | 18KB | 홈 |
| `lounge_events` | 12KB | 홈 |
| `lounge_deals` | 3.5KB | 홈 |

- 홈 첫 방문 약 180KB, 다시 방문 약 80KB(박지 목록은 localStorage 캐시를 씀).
- **지도는 열 때마다 박지 목록 100KB를 새로 받는다.** 캐시를 안 쓴다. 가장 큰 원인으로 본다.
- `spots`에는 `updated_at` 열이 없다(`created_at`만 있음).

## 코드 위치
- 지도 목록 받기: `map-main.js` `loadSpotsMasterEngine()` (약 216줄) → 늘 `window.okbmFetchSpotRows()`를 부른다. 캐시 없음.
- 공용 목록 받기: `romantic-sync.js` `window.okbmFetchSpotRows` (약 3867줄). 회원은 `SPOTS_MAP_SELECT`(좌표 포함), 비회원은 `SPOTS_GUEST_SELECT` + `okbmFetchSpotPins`(get_spot_pins).
- 캐시를 쓰는 쪽: `romantic-sync.js` `window.fetchMasterSpotsFromSupabase` (약 3924줄). 메모리 5분 → localStorage(`okbm_master_spots`/`okbm_spots_cache`) → IndexedDB. **캐시가 있으면 새로 받지 않고 그대로 쓴다(새로 고침 규칙 없음).** 홈은 `index-main.js` `loadPortalSpotData()` (약 4445줄)에서 이걸 쓴다.
- 선택 열 정의: `romantic-sync.js` `SPOTS_MAP_SELECT`·`SPOTS_GUEST_SELECT` (약 3565줄).
- `view_brief`를 쓰는 곳:
  - 목록 정리: `romantic-sync.js` `stripSpotDetailFields`, `normalizeSpotMapRow` (desc·desc_summary로 복사)
  - 지도 검색: `map-main.js` 약 1895줄 `combinedDesc` (소개 글 속 단어로 찾기)
  - 홈 카드 설명: `index-main.js` 약 845·1922·2667·3750줄 (`desc_summary || desc`)
  - 정보창: `map-main.js` 약 650~665줄에서 박지 하나의 상세를 따로 받아 `desc_summary`를 덮는다 → 목록의 view_brief가 없어도 정보창은 괜찮다.

## 할 일
### 1. 지도도 박지 목록 캐시를 쓰고, 바뀌었을 때만 새로 받기 (효과 가장 큼)
- `loadSpotsMasterEngine()`이 `fetchMasterSpotsFromSupabase()` 캐시를 함께 쓰게 한다. 비회원 대략 좌표 캐시를 회원 화면에 쓰지 않는 `okbmSpotListFitsViewer` 규칙은 지킨다.
- 새로 받을지 판단하는 작은 요청을 둔다. 예: `spots`에 `updated_at` 열 + 트리거를 더하고(SQL), `select=updated_at&order=updated_at.desc&limit=1`(수십 바이트)만 먼저 묻는다. 캐시 때와 다르면 전체를 다시 받는다. 지운 박지까지 잡으려면 개수(`count`)도 같이 비교한다.
- 홈 캐시도 같은 판단을 쓰게 해서, 지금처럼 "한 번 받으면 영영 안 바뀌는" 문제도 같이 고친다.
- 관리자가 박지를 고치거나 지우면 바로 반영되는지 확인한다(관리자 기기는 저장 뒤 캐시를 비우거나 강제로 새로 받기).
- 예상: 지도를 다시 열 때 100KB → 거의 0.

### 2. 목록에서 긴 소개 글 빼기
- 목록에는 짧은 소개만 넣는다. 방법은 둘 중 하나:
  - SQL로 `view_brief_short`(앞 60~80자) 생성 열을 만들고, `SPOTS_MAP_SELECT`·`SPOTS_GUEST_SELECT`에서 `view_brief` 대신 쓴다.
  - 또는 목록에서 빼고, 홈 카드처럼 꼭 필요한 곳만 따로 받는다.
- 지도 검색(`combinedDesc`)은 짧은 소개 + 이름으로만 찾게 된다. 사용자에게 이미 알렸다.
- 기존 캐시에 긴 글이 들어 있는 기기도 있으니 캐시 판정(`spotCacheHasFullEssay`)과 충돌하지 않는지 본다.
- 예상: 박지 목록 100KB → 약 35KB.
- SQL 파일은 기존 이름 규칙대로 `SUPABASE_H14_...sql`로 만들고, 사용자가 SQL Editor에서 실행한다(파일 링크를 바로 주고 옆 창에 띄운다).

### 3. (나중에) 공개 목록을 Cloudflare가 대신 나눠 주기
- 박지 공개 목록·라운지·홈 피드처럼 누구나 보는 GET 요청을 Cloudflare Worker가 Supabase에서 몇 분에 한 번만 받아 캐시하고 나눠 준다. `workers/`에 upload Worker가 이미 있다.
- 회원 전용 좌표(H9로 막혀 있음)는 캐시하면 안 된다. 회원은 공개 목록(캐시) + 좌표만 담은 작은 목록(Supabase)을 따로 받게 나눈다.
- 효과: 방문자가 늘어도 Supabase Egress는 거의 그대로다.

## 확인할 것
- 각 작업 뒤 브라우저 개발 도구 Network에서 `supabase.co/rest/v1/spots` 요청 횟수와 크기를 본다(지도를 두 번 열어 두 번째에 안 받는지).
- 비회원 확인 주의: 같은 IP로 여러 번 열면 `get_spot_pins`가 하루 한도(400, code `rate`)에 걸린다. 그러면 `okbmFetchSpotRows`가 목록 100KB를 받은 뒤 실패해서 다시 받기를 되풀이한다. 이것도 고칠 거리다(핀이 실패하면 목록 받기를 건너뛰거나, 받은 목록이라도 캐시하기).
- 며칠 뒤 Supabase 사용량 화면(조직 → Usage → Egress per day)에서 하루 양이 줄었는지 본다.

## 날짜
- 11/13: 새 결제 기간 시작. 다음 날쯤 Cached Egress가 0 근처로 돌아갔는지 본다.
- 11/20: 유예 끝. 앱 지도·피드가 정상으로 뜨는지 본다. 막혔으면 Pro로 올리면 바로 풀린다(한 달 25달러, 나중에 내릴 수 있음).
