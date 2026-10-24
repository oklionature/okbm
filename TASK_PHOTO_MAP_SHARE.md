# 사진 지도 공유 이미지 (인스타용)

2026-10-25에 시작했다. 다음 창에서는 이 문서를 읽고 **"다음에 할 일"** 부터 한다.
답변·커밋은 한국어(`CLAUDE.md`). 배포는 PR 없이 `main`에 커밋·push.

## 지금 상태 (2026-10-25 디자인 확정)

- 공유 이미지 기능은 `photo-map.js`의 `exportImage(opt)`에 있다. **아직 버튼은 없고, 커밋만 하고 push는 안 했다(사이트에 안 올라감).**
  - `okbmPhotoMap.exportImage({ width, height, bg, style })`가 캔버스를 돌려준다. 기본 1080×1350(인스타 피드), `bg` 기본 `sky`(하늘색, 확정), `style` 기본 `'a'`(확정).
  - 그리기는 `render()`를 그대로 쓰고, 그동안만 캔버스·크기·확대 상태를 바꿔 끼운다(`exporting`, `exportPart`).
  - 판 세 개(`exportPartOf(c)`): 본토(`main`, 오른쪽에 세로로 꽉), 제주(`jeju`, 왼쪽 아래 바다로 옮김), 울릉도(`ulleung`, 제 위도 그대로 오른쪽 끝 동해 바다에 1.6배, 밑에 '울릉도'). 옹진군은 범위에서 뺀다. **독도는 넣지 않는다**(사용자 결정, 경계 파일에도 없음).
  - 시군구 이름만 칸 크기에 맞춰 5.5~8.5px로 넣는다(16px보다 작은 칸은 뺀다). **시·도 이름은 없다**(경계선으로만 구분).
  - 글자 크기는 400px 폭 기준(`LW = 400`), 실제 픽셀은 `S = 1080 / 400`배.
- 제목·숫자·주소는 `drawExportHeader()`. 확정 디자인 = 시안 A(잡지 표지형):
  - 맨 위 작은 영문(글자 사이 넓게): `ROMANTIC ROUTE · BACKPACKING PHOTO MAP`
  - 세리프 제목(Noto Serif KR 900, 폭 160px 넘으면 줄임): 모두 **"낭만루트 백패킹 포토맵"**, 내 지도 **"나의 백패킹 포토맵"**
  - 짧은 초록 줄, 그 밑 큰 숫자(Space Grotesk): 모두 **`431 SPOTS`**, 내 지도 **`72 / 431`**(가 본 박지 = 내 피드 박지 + 다녀옴 / 전체 박지). 숫자 앞뒤에 '박지'·'곳' 같은 한글은 붙이지 않는다(사용자 결정).
  - 오른쪽 아래 `romanticroute.kr` + 글씨 높이에 맞춘 남색 동그라미 로고(`/logo.png`).
  - 글꼴·로고는 `loadExportAssets()`가 한 번 불러 둔다(구글 글꼴 link를 붙임, 4초 넘으면 기본 글꼴로).
  - 시안 B(로고 배지형)·C(떠 있는 카드형)는 `style: 'b' | 'c'`로 남아 있다(안 씀).
- 사진을 캔버스에서 꺼내려면 `crossOrigin`이 필요해서 `loadImg`의 `fromUrl`에 `im.crossOrigin = 'anonymous'`를 넣었다(R2 원본엔 `?pm=1` 꼬리표). `img.romanticroute.kr`(`cdn-cgi/image` 포함)과 R2 모두 `Access-Control-Allow-Origin: *`를 늘 준다(2026-10-25 curl로 확인).
- 시안 뽑기:
  - `scripts/photo-map-bench/export.js`: 바탕색 세 가지(`img/share-*.jpg`).
  - `scripts/photo-map-bench/export-styles.js <출력폴더>`: 시안 a·b·c. `MINE=1`이면 '내 지도'(로그인 없이 모드를 바꾸고 박지 여섯 곳 중 한 곳을 다녀옴으로 넣음).
  ```bash
  NODE_PATH=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules MINE=1 node scripts/photo-map-bench/export-styles.js scripts/photo-map-bench/img
  ```

## 다음에 할 일

1. **스토리 크기(1080×1920)**: 세로가 길어 지도를 더 크게. 위 제목, 아래 큰 숫자·로고. `exportImage({ width: 1080, height: 1920 })`로 먼저 뽑아 보고 제주·울릉도·제목 자리를 맞춘다.
2. **공유 버튼**: 사진 지도 위쪽 "모두 / 내 지도" 옆. 누르면 `exportImage` → `canvas.toBlob` → `navigator.share({ files: [File] })`(되는 곳: 휴대폰), 안 되면 이미지 내려받기. 만드는 데 4~5초 걸리니(사진을 크게 다시 받음) "이미지 만드는 중…" 표시를 띄운다. 피드/스토리 중 고르게 할지 사용자에게 묻는다.
   - 앱(Capacitor) 안에서 `navigator.share`에 파일이 되는지 확인한다. 안 되면 앱 공유 플러그인을 쓴다.
3. 배포 전 확인: `?v=` 올리기(`map.html`의 `photo-map.js?v=14` → 15), 크롬·WebKit으로 사진 지도 기본 동작(확대·누르기·정보창)이 그대로인지(`crossOrigin` 바꾼 영향), 그리고 공유 이미지.

## 참고

- 사진 지도 캔버스판 설명과 측정: `TASK_PHOTO_MAP_PERF.md`.
- '내 지도' 상태 흉내(로그인·내 피드·다녀옴 가짜로 넣기)는 이 창에서 임시 스크립트로 했다. 필요하면 `scripts/photo-map-bench/harness.html`에 `window.isUserLoggedIn`, `okbmGetCurrentUserId`, `supabaseClient`, `userVisited`를 가짜로 넣으면 된다.
