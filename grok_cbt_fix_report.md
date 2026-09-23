# CBT 23단계 수정 보고

작성: 2026-09-23  
프로젝트: `qnumfecythtqtrxeasys`  
기준 플랜: CBT 보안·성능 점검 23단계 (전부 코드 반영 완료)

로컬 변경은 커밋·푸시 전이다. 원격에 올라간 것은 SQL 1·3·4·5·6·7과 `place-research` 함수뿐이다. JS/HTML 14개 단계는 저장소 working tree에만 있다.

## 원격 상태 (2026-09-23 확인)

| 대상 | 상태 |
| --- | --- |
| DB `feeds_select_public` | 적용됨. `is_published` 이거나 작성자 또는 관리자 |
| DB `trg_okbm_guard_proposals_decision` | 적용됨 |
| DB `trg_okbm_guard_spot_corrections_decision` | 적용됨 |
| DB `direct_threads` INSERT/UPDATE | 적용됨. `WITH CHECK (false)` / `USING (false)` |
| DB `okbm_append_direct_message` | 적용됨. `SECURITY DEFINER` |
| DB `merge_spot_media_urls` | 적용됨. 유튜브·네이버 블로그 호스트, `SECURITY DEFINER` |
| DB `track_visit` | 적용됨. `visit_seen`으로 하루 1회, `SECURITY DEFINER` |
| DB `stats_select_admin` | 적용됨. `okbm_is_admin()` |
| Edge Function `place-research` | 배포됨. version 15, `verify_jwt=true` |
| Git 커밋 / 푸시 / 프론트 배포 | 하지 않음 |

함수 확인:

- 로그인 없는 POST → 401
- `Origin: https://evil.example` OPTIONS → 허용 출처 없음
- `Origin: https://okbm.kr` OPTIONS → `Access-Control-Allow-Origin: https://okbm.kr`
- 배포 소스는 로컬 `supabase/functions/place-research/index.ts`와 같음

## 로컬 변경 파일 (9, 미커밋)

`git diff --stat`: 9 files, +396 / −143

- `SUPABASE_RLS_POLICIES_MASTER.sql`
- `romantic-sync.js`
- `romantic-history.js`
- `romantic-plan.js`
- `map.html`
- `templates.js`
- `feed-register.html`
- `naver-callback.html`
- `supabase/functions/place-research/index.ts`

## 23단계

### 1. 나만보기 피드 잠금 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql` `feeds_select_public`
- 읽기는 함께보기(`is_published`), 작성자, 관리자만.
- 원격 `using`: `(COALESCE(is_published, false) = true) OR (user_id = okbm_uid()) OR okbm_is_admin()`

### 2. 로그인 실패 시 손님 키로 재시도하지 않음 — 로컬만

- 파일: `romantic-sync.js` `okbmPublicFetch`
- 401/403이면 anon key로 다시 열지 않고 실패를 그대로 반환한다.
- 공개 산 목록처럼 처음부터 손님 키를 쓰는 경로는 그대로다.
- 실사용자 반영은 프론트 배포 후.

### 3. 장소 제보·수정 건의 도장 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql`
- `trg_okbm_guard_proposals_decision`, `trg_okbm_guard_spot_corrections_decision`
- 관리자가 아니면 반영완료/채택/승인/반려를 대기 중으로 되돌리고 `approved_spot_id`를 비운다.

### 4. 쪽지 서랍 직접 수정 금지 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql`
- `direct_threads` INSERT/UPDATE는 거부. 보내기는 `okbm_append_direct_message` (`SECURITY DEFINER`).

### 5. 산 핀 영상·블로그 링크 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql` `merge_spot_media_urls`
- 로그인 필요. 허용 호스트는 `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `www.youtu.be`, `*.youtube.com`, `blog.naver.com`, `m.blog.naver.com`.

### 6. 방문 수 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql` `track_visit`
- `visit_seen`에 없으면 그 날짜·손님의 PV를 1만 올린다. 이미 있으면 증가하지 않는다.
- 로그인 회원은 분당 20회 상한(`okbm_rpc_rate_limit`). 손님은 `guest_` + 길이 14자 이상만 집계.

### 7. 방문 통계 표 — 원격 DB 적용

- 파일: `SUPABASE_RLS_POLICIES_MASTER.sql` `stats_select_admin`
- SELECT는 `okbm_is_admin()`. anon/authenticated의 무조건 조회는 거둔다. `authenticated`에 GRANT는 남아 있고, 통과는 관리자 정책이 가른다.

### 8. 같은 날 일지 — 로컬만

- 파일: `romantic-history.js` `savePackingHistoryRecord`
- 같은 날짜여도 글 번호가 같을 때만 수정한다. 새 산행은 새 번호로 저장한다.

### 9. 전체 기록 삭제 — 로컬만

- 파일: `romantic-sync.js` `executeCleanSlateMasterReset`
- 서버가 삭제를 확인한 뒤에만 폰 기록을 지운다. 실패하면 폰 데이터를 유지하고 성공 안내를 띄우지 않는다.

### 10. 서버 주소가 없을 때의 글 삭제 — 로컬만

- 파일: `romantic-history.js` `deleteTripRecord`
- 서버 주소가 없으면 폰에서만 지우지 않고 중단한다. 주소가 있을 때는 서버 확인 후 삭제하는 기존 경로를 유지한다.

### 11. 일정·배낭이 서버를 되돌리지 않음 — 로컬만

- 파일: `romantic-sync.js`, `romantic-plan.js`
- 서버에서 받아오기가 성공하면 그 스냅샷이 기준이다. 그보다 오래된 폰 메모를 다시 올리지 않는다.

### 12. 홈 최근 15장 — 로컬만

- 파일: `romantic-plan.js` `okbm_cached_community_feeds`
- 캐시는 서버에 아직 있는 글만 남긴다. 삭제가 성공하면 이 복사본에서도 뺀다.

### 13. 지도 관리 버튼 — 로컬만

- 파일: `romantic-sync.js` `okbmPersistAdminFlag`, `map.html`, `feed-register.html`
- 서버가 관리자라고 답한 뒤에만 수정·핀 이동·삭제·검수 도구를 연다. 폰에 적어 둔 관리자 표시만으로는 버튼을 켜지 않는다.

### 14. 폰 메모장의 이메일·로그인 열쇠 — 로컬만

- 파일: `romantic-sync.js`
- 로그인 열쇠는 Supabase 세션만 쓴다. 이메일과 관리자 표시의 별도 복사본은 쓰지 않는다. 닉네임·사진 캐시는 남긴다.

### 15. 네이버 로그인 주소창 — 로컬만

- 파일: `naver-callback.html`
- 열쇠를 세션에 넣은 뒤 `history.replaceState`로 주소창 hash를 지운다. `access_token`이 hash에 남아 있으면 바로 제거한다.

### 16. 장소 조사 — 함수 배포됨 (version 15)

- 파일: `supabase/functions/place-research/index.ts`
- `verify_jwt=true`. 함수 안에서도 사용자 확인, 분당 12회, 허용 출처만 CORS.
- 기본 허용: `https://oklionature.github.io`, `https://okbm.kr`, `https://www.okbm.kr`, Capacitor/Ionic localhost, `localhost` / `127.0.0.1`. 추가 출처는 `OKBM_ALLOWED_ORIGINS`.

### 17. 지도 산 목록 카드 재사용 — 로컬만

- 파일: `map.html` `renderSpots`, `createSpotCardElement`
- 이미 있는 카드는 남기고 찜·클리어·관리 버튼만 갱신한다.

### 18. 산 이름표 — 로컬만

- 파일: `map.html` `updateLODLabels`
- 드래그가 끝난 뒤(`moveend` / `zoomend`)에만 계산한다. 화면 안 핀의 글자만 바꾼다.

### 19. 상세 시트 높이 — 로컬만

- 파일: `map.html` `getInfoWindowAdjustedCenter`
- 시트가 열리거나 닫힐 때 높이를 기억하고, 핀 위치 계산은 그 값만 쓴다.

### 20. 릴스 사진 넘김 — 로컬만

- 파일: `romantic-history.js` `updateCarouselFeedState`
- 몇 번째 사진인지만 계산하고 하단 점은 클래스로 바꾼다.

### 21. 릴스 화면 높이 — 로컬만

- 파일: `romantic-history.js` `okbmApplyVisibleViewportToOverlay`
- 화면 크기·키보드가 바뀔 때만 높이를 다시 잰다. 스크롤 중에는 위쪽 위치만 맞춘다.

### 22. 전국 핀·랭킹 다시 받기 — 로컬만

- 파일: `romantic-sync.js` 부팅·`online`
- 산 목록은 짧은 시간 메모리에 재사용하고, 겹치는 요청은 한 번만 보낸다. 방문 수는 켤 때 한 번만 올린다.

### 23. 포토 카드 글자 변환 — 로컬만

- 파일: `templates.js` `escapeHtml`
- 이 파일 안에서 `& < > " '`를 직접 변환한다. 공통 함수가 없을 때 원문을 그대로 넣지 않는다.

## 아직 남은 것

- 위 9개 파일 커밋·푸시. 그 전까지 2·8·9·10·11·12·13·14·15·17·18·19·20·21·22·23은 실사용자 화면에 없다.
- 프론트 배포 뒤 스모크: 나만보기 글의 타인 조회, 로그인 만료 후 anon 재오픈, 쪽지 RPC, 관리 버튼의 서버 확인 전 미표시, 같은 날 일지 두 장, 전체 초기화 실패 시 로컬 유지.
