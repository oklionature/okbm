# 사진 지도 공유 이미지 (인스타용)

2026-10-25에 시작했다. 다음 창에서는 이 문서를 읽고 **"다음에 할 일"** 부터 한다.
답변·커밋은 한국어(`CLAUDE.md`). 배포는 PR 없이 `main`에 커밋·push.

## 지금 상태

- 공유 이미지 기능은 `photo-map.js`의 `exportImage(opt)`에 있다. **아직 버튼은 없고, 커밋만 하고 push는 안 했다(사이트에 안 올라감).**
  - `okbmPhotoMap.exportImage({ width, height, bg })`가 캔버스를 돌려준다. 기본 1080×1350(인스타 피드), `bg`는 `sky`·`white`·`navy`(`EXPORT_BG`).
  - 그리기는 `render()`를 그대로 쓰고, 그동안만 캔버스·크기·확대 상태를 바꿔 끼운다(`exporting`, `exportPart`).
  - 본토(제주·울릉군·옹진군 뺀 범위)를 세로로 꽉 채워 오른쪽에 붙이고, 제주는 왼쪽 아래 빈 바다로 옮겨 따로 한 번 더 그린다(`exportPart = 'main' | 'jeju'`, `exportPaths`).
  - 글자 크기는 400px 폭 기준(`LW = 400`), 실제 픽셀은 `S = 1080 / 400`배.
  - 시군구 이름은 칸 크기에 맞춰 5.5~8.5px로 다 넣는다(칸이 16px보다 작으면 뺀다). 시·도 이름은 노란 글씨로 크게 넣었다.
  - 왼쪽 위 제목 "낭만루트 / 사진 지도"와 `countText` 숫자, 오른쪽 아래 `romanticroute.kr`.
- 사진을 캔버스에서 꺼내려면 `crossOrigin`이 필요해서 `loadImg`의 `fromUrl`에 `im.crossOrigin = 'anonymous'`를 넣었다(R2 원본엔 `?pm=1` 꼬리표). `img.romanticroute.kr`(`cdn-cgi/image` 포함)과 R2 모두 `Access-Control-Allow-Origin: *`를 늘 준다(2026-10-25 curl로 확인).
- 시안 뽑기: `scripts/photo-map-bench/export.js`. 실제 사이트에 로컬 `photo-map.js`를 끼워 세 가지 바탕색 이미지를 `scripts/photo-map-bench/img/share-*.jpg`로 저장한다.
  ```bash
  NODE_PATH=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/photo-map-bench/export.js
  ```

## 다음에 할 일 (사용자 요청, 2026-10-25)

1. **시·도 이름은 뺀다.** 시·도는 경계선(지금 회색 굵은 선 `COLOR.sido`)으로만 구분한다. `render()`의 `exporting` 갈래에서 "시·도 이름은 크게, 노란 글씨로" 부분을 지운다.
2. **울릉도를 넣는다.** 지금은 범위(`mb`)에서 울릉군을 빼서 안 보인다. 제주처럼 따로 옮겨 그리면 된다: 오른쪽 위(강원 동해 바다 쪽)나 오른쪽 가운데 빈 바다에 작은 칸으로. `exportPart`에 `'ulleung'`을 추가하고 `inc()`·`exportPaths`를 맞춘다(울릉군 `name === '울릉군'`, 경북 `code === '47'`). 독도는 경계 파일에 울릉군으로 같이 들어 있는지 먼저 확인한다.
3. **제목 "사진 지도"를 바꾼다.** 사용자가 어색하다고 했다. 이름 후보를 몇 개 보여 주고 고르게 한다. 예: "낭만루트 박지 지도", "내가 다녀온 박지", "나의 백패킹 지도", "낭만루트 전국 박지".
4. **"피드 등록 박지 102 / 431" 문구를 없애거나 바꾼다.** 사용자 생각: 공유는 보통 '내 지도'일 때 할 것이니, '모두'의 "피드 등록 박지"는 필요 없다. '내 지도'는 "가 본 곳 73곳" 같은 말로. 이름 후보를 보여 주고 고르게 한다. 예: "가 본 박지 73 / 431", "다녀온 곳 73곳", "73곳에 텐트를 쳤어요".
   - '모두'일 때 공유하면 숫자 줄을 아예 빼거나 "전국 박지 431곳" 정도로.
5. 고친 시안을 다시 뽑아 보여 준다(바탕색도 그때 고른다: 하늘색·흰색·남색 중).
6. 정해지면 **공유 버튼**을 단다: 사진 지도 위쪽 "모두 / 내 지도" 옆. 누르면 `exportImage` → `canvas.toBlob` → `navigator.share({ files: [File] })`(되는 곳: 휴대폰), 안 되면 이미지 내려받기. 만드는 데 4~5초 걸리니(사진을 크게 다시 받음) "이미지 만드는 중…" 표시를 띄운다.
   - 앱(Capacitor) 안에서 `navigator.share`에 파일이 되는지 확인한다. 안 되면 앱 공유 플러그인을 쓴다.
7. 배포 전 확인: `?v=` 올리기(`map.html`의 `photo-map.js?v=14` → 15), 크롬·WebKit으로 사진 지도 기본 동작(확대·누르기·정보창)이 그대로인지(`crossOrigin` 바꾼 영향), 그리고 공유 이미지.

## 참고

- 사진 지도 캔버스판 설명과 측정: `TASK_PHOTO_MAP_PERF.md`.
- '내 지도' 상태 흉내(로그인·내 피드·다녀옴 가짜로 넣기)는 이 창에서 임시 스크립트로 했다. 필요하면 `scripts/photo-map-bench/harness.html`에 `window.isUserLoggedIn`, `okbmGetCurrentUserId`, `supabaseClient`, `userVisited`를 가짜로 넣으면 된다.
