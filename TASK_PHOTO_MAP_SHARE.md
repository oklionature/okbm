# 사진 지도 공유 이미지 (인스타용)

2026-10-25에 시작했다. 다음 창에서는 이 문서를 읽고 **"다음에 할 일"** 부터 한다.
답변·커밋은 한국어(`CLAUDE.md`). 배포는 PR 없이 `main`에 커밋·push.

## 지금 상태 (2026-10-25 배포: `photo-map.js?v=15`)

- 공유 이미지 기능은 `photo-map.js`의 `exportImage(opt)`에 있다. 사진 지도 '한눈에 보기' 버튼으로 사이트에 올라갔다.
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

## 화면 (배포됨)

- 사진 지도 위쪽 왼쪽: 예전 숫자 칩(`피드 등록 박지 102 / 431`) 대신 공유 이미지와 같은 제목(`.pm-head`: `ROMANTIC ROUTE · PHOTO MAP`, 세리프 제목, 큰 숫자). 숫자·제목은 `headInfo()` 하나로 화면과 이미지가 같이 쓴다. 확대하면(`pm-zoomed`, `k >= LEVEL_SGG`) 제목은 숨긴다.
- 위쪽 오른쪽: `모두 / 내 지도`(높이 30px로 얇게) 밑에 4px 띄워 **한눈에 보기** 버튼(`.pm-cardbtn`). 사용자가 '공유'·'포토맵 카드'라는 말은 싫다고 했다(자주 눌러 보게).
- 누르면 `.pm-card`가 화면 전체를 덮는다(아래 탭 줄 `#romanticMasterBottomDock`이 z-index 최댓값이라 같은 값 + 나중에 붙여 덮음). "한 장으로 만드는 중…" → 이미지 → `이미지 저장`·`보내기`(`navigator.canShare` 되는 곳만 보임). 같은 모드·숫자면 만든 이미지를 다시 쓴다(`cardCache`).
- **피드·스토리 고르기는 없다**(사용자 결정: 스토리판이 배경만 늘린 거라 의미 없음). 이미지는 1080×1350 한 장.

## 다음에 할 일

1. 휴대폰(로그인한 상태)에서 확인: 한눈에 보기 → 이미지가 나오는지, `보내기`로 인스타·카톡 공유가 되는지, `이미지 저장`이 되는지.
2. 앱(Capacitor) 안: `navigator.share`에 파일이 안 되거나 `a.download` 저장이 안 되면 앱 공유·저장 플러그인을 붙인다.
3. (나중) 피드를 올리거나 '다녀옴'을 누른 직후 "내 포토맵에 한 칸 채워졌어요 · 한눈에 보기" 안내.

## 시험할 때 조심

- 비회원 박지 핀(`get_spot_pins`)은 **IP당 분당 30회·하루 200회**(`SUPABASE_H9A_GUEST_SPOT_PINS.sql`). 실제 사이트를 playwright로 수십 번 열면 그날은 그 IP의 비회원 지도가 빈다(2026-10-25에 걸림, 한국 시간 자정에 풀림). 화면 확인은 가짜 박지로 도는 `scripts/photo-map-bench/run.js`·`harness.html` 쪽으로 한다.

## 참고

- 사진 지도 캔버스판 설명과 측정: `TASK_PHOTO_MAP_PERF.md`.
- '내 지도' 상태 흉내(로그인·내 피드·다녀옴 가짜로 넣기)는 이 창에서 임시 스크립트로 했다. 필요하면 `scripts/photo-map-bench/harness.html`에 `window.isUserLoggedIn`, `okbmGetCurrentUserId`, `supabaseClient`, `userVisited`를 가짜로 넣으면 된다.
