# 사진 지도: 늦게 뜨고 확대하면 끊기고 깨지는 문제

2026-10-24에 원인을 측정했다. 다음 창에서는 이 문서를 읽고 **1번(새 사진 주소 확인)** 부터 하고, 그다음 **2~5번 코드 수정**을 한다.
대상 파일은 거의 `photo-map.js` 하나다. 답변·커밋은 한국어로 쓴다(`CLAUDE.md`).

## 지금 상태

- 브랜치 `claude/affectionate-curie-jv8ie1`에 커밋 2개가 있고 **아직 `main`에 안 합쳤다**.
  - `7969d16` 새 사진 주소가 한 번 실패하면 이번에 연 동안은 바로 원본으로 간다(`cdnDown`), 박지 카드 사진도 실패하면 원본으로 바꿔 끼운다.
  - `b373bfd` `CLAUDE.md`: 모든 답변·안내·커밋을 한국어로.
- 사진 지도는 사진을 `https://img.romanticroute.kr/cdn-cgi/image/width=W,quality=70,fit=scale-down,format=auto/<원본 키>`에서 받고, 실패하면 R2 원본(`https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/<키>`)을 받아 기기에서 줄인다(`photo-map.js`의 `bestThumb` → `thumb`).
- 사용자가 확인해 보니 **모든 사진이 기존 방식(원본을 받아 기기에서 줄이기)으로 받아졌다.** 새 주소가 실패하고 있다.
- 사용자는 Cloudflare에 연결했다고 한다. 아직 확인은 못 했다(클라우드 세션은 네트워크가 막혀 바깥 주소를 못 연다).

## 1. 새 사진 주소 확인 (가장 먼저)

Mac 브라우저(ego lite 등)나 터미널에서 확인한다.

```bash
dig +short img.romanticroute.kr            # Mac이 보는 주소
dig +short img.romanticroute.kr @1.1.1.1   # 공개 DNS가 보는 주소
curl -sI "https://img.romanticroute.kr/<원본 키>"
curl -sI "https://img.romanticroute.kr/cdn-cgi/image/width=480,quality=70,fit=scale-down,format=auto/<원본 키>"
```

`<원본 키>`는 피드 사진 주소에서 `https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/` 뒷부분이다.

| 결과 | 원인 | 할 일 |
|---|---|---|
| `@1.1.1.1`만 주소가 나옴 | Mac DNS 캐시 | `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` |
| 둘 다 주소가 안 나옴 | 도메인 미연결 | Cloudflare → R2 버킷 → Settings → Custom Domains에서 `img.romanticroute.kr`이 Active인지 |
| 원본 키는 200, `cdn-cgi/image`는 실패 | 이미지 줄이기 꺼짐 | Cloudflare → `romanticroute.kr` → Images → Transformations 켜기 |
| 둘 다 200 | 주소는 정상 | 실제 사이트 사진 지도에서 개발자 도구 Network로 `cdn-cgi` 요청이 왜 실패하는지 본다 |

CSP는 원인이 아니다. `map.html`, `index.html` 둘 다 `img-src ... https:`라 모든 https 이미지를 허용한다.

**이게 "늦게 뜸"의 가장 큰 원인이다.** 새 주소가 실패하면 원본(첫 화면 약 18.7MB)을 받고, 기기가 canvas로 줄이며 `toBlob`(JPEG 인코딩)을 메인 스레드에서 돌린다. 측정에서 이것만 약 2초였다.

## 측정 결과 (2026-10-24)

`scripts/photo-map-bench/`의 측정 도구로 쟀다. Chromium, 390x780, 기기 배율 2, **CPU 4배 느리게**, 가짜 박지 431곳 중 102곳에 사진, 새 주소는 실패로 흉내 냈다.

| 항목 | 값 |
|---|---|
| 사진 지도 열기 | 약 1.2~3.2초 |
| 처음 그리는 SVG 요소 / clipPath | 4,430개 / 370개 |
| 시·군·구 칸 눌러 박지 단계로 가는 600ms 전환 | 6프레임만 그려짐, 한 번에 1.3~1.6초 멈춤 |
| 박지 단계에서 휠 확대 프레임 간격 | 중간값 120~150ms(약 7~8fps), 부드러우려면 16ms |
| 받은 사진 용량 | 약 31MB(가짜 원본 3000x2000) |
| 확대한 박지 칸 크기 vs 받은 사진 | 칸 약 1,530 기기 px, 사진 640px → 2.4배 늘어나 흐림 |
| 프로파일 상위 | `centerLL`(강제 레이아웃, 약 2초), `toBlob` 약 2초, GC 약 1초 |

`d3.geoContains` 자체는 1,912번에 228ms라 주범이 아니다. `centerLL`에 잡힌 시간은 `update()`가 스타일을 잔뜩 바꾼 직후 `host.clientWidth/clientHeight`를 읽어 생기는 **강제 레이아웃**이다.

## 2. 확대할 때마다 하는 일 줄이기 (끊김의 주원인)

`photo-map.js`의 `zoom.on('zoom')` → `update()`가 손가락이 움직일 때마다 모든 글자·점·칸의 `font-size`, `stroke-width`, `r`, `opacity`, `display`를 다시 쓰고, 이어서 `centerLL()`이 `host.clientWidth`를 읽는다.

고칠 것:
- `update()`를 `requestAnimationFrame`으로 묶어 한 프레임에 한 번만 돈다. `root` transform 적용만 즉시 한다.
- 단계(`level()`, `wide`)가 바뀔 때만 `display`/`opacity`/`pointer-events`/선 굵기를 바꾼다.
- 글자 크기·외곽선·점 반지름(`px / k`)은 요소마다 attr로 쓰지 말고 한 곳에서 바꾼다. 예: `root`에 CSS 변수 `--pm-k`를 두고 `.pm-lbl{font-size:calc(11px / var(--pm-k))}`. SVG `r`은 CSS로 못 바꾸니 점 크기는 `vector-effect`나 그룹 `scale(1/k)` 방식을 검토한다.
- `host.clientWidth/clientHeight`는 열 때와 `resize` 때만 재서 변수에 둔다(`centerLL`, `ensureImages`, `zoomToBox`, `getView`).
- 박지 단계의 "보고 있는 시군구만 또렷하게"(`opacity` 일괄 설정)와 `setHeader`(`innerHTML`)는 중심 시군구가 바뀔 때만 한다.

## 3. 확대한 만큼 큰 사진으로 다시 받기 (깨짐의 주원인)

- `ensureImages()`는 `href`가 이미 있으면 건너뛴다. 그래서 전국 화면에서 받은 작은 사진(120~640px)을 확대해도 계속 늘려 보인다.
- 박지 칸은 `SPOT_PX = 640` 고정이다. 확대하면 칸이 1,500px가 넘는다.

고칠 것:
- 요소에 지금 들어간 크기(`data-have`)를 적어 두고, 화면에서 필요한 크기(`need = 칸 크기 × k × dpr`)가 그보다 크면 한 단계 큰 사진(예: 320 → 640 → 1080 → 1600)으로 바꿔 끼운다. 새 사진이 다 받아진 뒤에 바꿔서 깜빡이지 않게 한다.
- 새 주소(Cloudflare 줄이기)가 되면 크기별 요청이 싸다. 같은 사진·크기는 캐시된다(월 5,000건 무료 변환). 단계를 몇 개로 고정해야 변환 건수가 안 늘어난다.
- 새 주소가 실패하는 경우의 기기 줄이기(`thumb`)도 큰 단계로 다시 만들 수 있게 하되, 비용이 크니 1080까지만.

## 4. 처음 뜨는 시간 줄이기

- `setup()`이 `loadScript(D3_URL)`를 다 받은 뒤에야 `fetch(GEO_URL)`(448KB), `fetchPublicFeeds()`, `fetchMyFeeds()`를 시작한다. 이 셋은 d3가 필요 없으니 d3와 **동시에** 시작한다.
- 박지 칸(`draw()`의 "3단계", Voronoi + 박지마다 clipPath)은 확대해야 보인다. 처음에는 시·군·구만 그리고, 박지 층은 처음 박지 단계에 들어갈 때 그리거나 화면에 보이는 시군구 것만 그린다. 박지 단계로 넘어갈 때 1.3초 멈추는 것도 이걸로 줄어든다.
- 같은 시군구 경로(`c.d`)가 칸·사진 clipPath·박지 clipPath·경계선으로 네 번 들어간다. clipPath는 `<path id>` 하나를 `<use>`로 재사용하는 방법을 검토한다.

## 5. 덜 급한 것

- **경계선이 각져 보임:** `photo-map/korea-sgg-202610.json`은 시군구 230개, 꼭짓점 약 1.8만 개로 단순화돼 있다. 박지 단계(k≈18~40)에서는 해안선·경계가 직선 조각으로 보인다. 이웃 시군구끼리 꼭짓점은 공유하니 틈은 없다. 확대용으로 더 촘촘한 파일을 박지 단계에서만 받는 방법이 있지만, 파일이 커지니 효과를 보고 정한다.
- **단계 바뀔 때 빈칸:** 박지 단계로 넘어가면 시·군·구 사진이 바로 `opacity 0`이 되는데 박지 사진은 아직 안 들어와 잠깐 비어 보인다. 박지 사진이 들어올 때까지 시·군·구 사진을 남겨 두거나 겹쳐서 페이드한다.
- `.pm-img.pm-gray`의 CSS `filter: grayscale()`는 SVG 이미지에서 비싸다. 흑백 사진이 많으면 확대가 더 느려진다.

## 측정 도구 쓰는 법

```bash
cd scripts/photo-map-bench
python3 make-images.py        # img/에 가짜 사진 12장(커밋 안 함)
node run.js                   # 새 주소 실패 상태로 측정
CDN_OK=1 node run.js          # 새 주소가 되는 상태로 측정
```

- `harness.html`에 `photo-map.js`만 올리고 `window.spots`, 피드(`window.okbmPublicFetch`)를 가짜로 넣는다. R2·새 주소 요청은 Playwright `route`로 로컬 사진을 돌려준다.
- 출력: 열기 시간, 요소 수, 전환·휠 확대 프레임 간격(중간값·p90·최대), 프로파일 상위 함수, 보이는 박지 칸 크기 vs 받은 사진 크기. 스크린샷은 `img/z1.png`(전국), `img/z3.png`(박지 단계).
- 고친 뒤 같은 명령으로 다시 재서 위 표와 비교한다. 목표: 휠 확대 중간값 30ms 이하, 박지 단계 전환 중 멈춤 300ms 이하, 확대한 칸의 사진 크기 ≥ 칸 크기의 0.8배.
- 컴퓨터 브라우저로 휴대폰을 흉내 낸 것이라, 마지막에 실제 아이폰 사파리에서 확인한다.
