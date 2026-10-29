// =========================================================================
// 낭만리포트 배지 (2026-10-28): 모양 그리기 · 리포트 배지 칸 · 전체 보기 · 새 배지 창 · 이미지 저장
//
// 배지 수는 사람마다 조금 다르다(시·군 수·첫 기록 해에 따라). 받는 조건 계산은 my-report.js buildBadges:
//   기록 1·5·10·20·30·40·50·60·70·80·90·100회(BACKPACKING, 공개 피드만) · 누적 높이 1·3·5 EVEREST · 포토맵 10곳 단위 REGIONS·ALL KOREA
//   도 클리어 9개(그 도 모양 방패) · 섬 10·20…70회 · 연도별 사계절(첫 기록 해~올해) · 제보 채택 1·10
// 단계형은 같은 모양에 테두리만 철 → 동 → 은 → 금. 도 클리어 모양은 photo-map/korea-sgg-202610.json의 시도 경계를
// 방패 안(40×42)에 맞춰 줄인 것(가장 큰 덩어리만, 0.8 단위로 점을 솎음).
// 새 배지 창은 낭만리포트를 열 때 지난번 본 뒤 새로 받은 배지가 있으면 띄운다. 처음 여는 계정은 띄우지 않고 지금 것을 '본 것'으로 둔다.
// 인라인 onclick을 쓰지 않는다(CSP).
// =========================================================================
(function () {
  'use strict';

  var METAL = { i: ['#4a4d52', '#8e939a'], b: ['#8a5a32', '#c88b57'], s: ['#8d939c', '#dfe3e8'], g: ['#a8801c', '#f1cf6a'] };
  var SHAPE = {
    circle: 'M50 6 a44 44 0 1 0 0.01 0Z',
    hex: 'M50 5 L90 27 L90 73 L50 95 L10 73 L10 27 Z',
    shield: 'M50 4 L91 15 L91 50 C91 75 72 90 50 97 C28 90 9 75 9 50 L9 15 Z',
    peak: 'M50 4 L92 38 L92 88 Q92 95 85 95 L15 95 Q8 95 8 88 L8 38 Z'
  };
  var ICON = {
    tent: '<path d="M33 52 L50 26 L67 52 Z M50 26 V52 M45 52 L50 43 L55 52" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
    peak: '<path d="M28 54 L44 32 L51 41 L60 28 L74 54 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M60 28 L64.5 34.5 L61.5 33 L58.5 35.5 L56 33.5 Z" fill="currentColor"/>',
    pin: '<path d="M50 24c-8 0-14 6-14 13.5C36 48 50 56 50 56s14-8 14-18.5C64 30 58 24 50 24z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="50" cy="37.5" r="4.5" fill="currentColor"/>',
    flag: '<path d="M40 56 V26 M40 27 C48 23 54 31 62 27 V41 C54 45 48 37 40 41" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
    season: '<circle cx="50" cy="40" r="14" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M50 26 V54 M36 40 H64" stroke="currentColor" stroke-width="1.6"/>',
    bag: '<path d="M38.5 34h23l3.6 19.5a3 3 0 0 1-3 3.5H37.9a3 3 0 0 1-3-3.5z M43.5 34c-1.8-3.6-.8-8 2.8-10 M56.5 34c1.8-3.6.8-8-2.8-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M43.5 45.5l4.4 4.4 8.4-8.9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    island: '<path d="M30 52 Q40 46 50 52 T70 52" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M42 47 Q50 36 58 47" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M50 42 V28 M50 29 Q43 26 40 31 M50 29 Q57 26 60 31" fill="none" stroke="currentColor" stroke-width="2"/>'
  };
  var FILL = { trips: '#24473a', plog: '#0f4a36', ever: '#2a323d', reg: '#5a4120', do: '#1b2f4d', spot: '#5e2a22', season: '#2d4466', island: '#16545b' };
  // 도 모양 (방패 안 30~70 × 20~62)
  var SIL = {"전남":"M35.1 43.5L35.6 42.7L35.8 41.7L36.0 40.4L35.6 39.4L35.1 38.1L35.3 39.1L34.5 40.4L33.3 38.8L34.3 38.7L34.9 38.1L35.6 37.0L34.9 36.6L34.5 35.7L33.9 35.2L33.8 36.2L32.5 36.2L32.4 37.4L31.9 36.5L30.6 36.1L30.1 35.3L30.7 34.4L32.2 34.9L32.5 33.4L34.1 33.8L34.6 33.0L34.5 34.2L34.3 35.0L35.1 35.7L36.0 35.7L35.9 36.8L36.9 36.1L37.1 35.2L36.4 34.6L36.0 33.7L35.1 32.8L34.3 32.1L33.6 32.4L33.4 31.0L33.7 30.1L34.0 29.1L34.9 29.1L35.4 27.9L35.8 26.7L37.1 27.3L36.5 26.7L36.0 25.6L37.1 24.9L38.2 25.5L38.3 26.6L38.7 27.8L39.1 28.6L40.6 28.4L41.4 28.1L42.3 27.7L43.3 27.3L44.0 26.4L44.6 25.3L44.2 24.3L45.1 23.7L46.1 23.7L47.0 23.8L48.1 24.3L48.7 25.4L49.7 25.9L49.9 24.9L50.7 23.9L51.6 24.8L51.8 25.6L51.6 26.4L52.4 26.8L52.2 27.7L53.0 28.7L54.3 28.3L55.2 27.7L55.9 28.3L56.8 28.3L57.7 28.4L58.6 28.6L59.4 28.1L60.1 28.7L61.0 27.2L62.2 26.8L63.3 27.2L64.7 28.4L65.3 29.7L65.9 30.7L65.9 32.1L66.5 33.0L67.7 33.9L67.7 34.7L68.3 35.3L69.1 36.1L69.8 37.0L69.8 38.1L69.3 38.8L68.4 39.4L67.6 40.1L66.4 41.2L65.7 40.2L65.7 41.0L65.6 42.2L66.1 42.9L66.9 42.5L67.8 42.0L69.4 41.9L69.7 42.7L69.6 43.6L69.0 44.5L69.0 45.4L68.2 46.0L67.4 45.8L66.9 45.1L66.4 46.1L66.0 47.4L66.5 49.0L65.8 48.5L64.7 48.5L64.2 47.7L64.4 46.8L64.9 45.8L64.9 45.0L64.3 43.6L63.5 43.5L64.0 42.5L63.3 41.4L62.8 42.4L60.9 42.8L60.3 44.1L60.4 45.1L60.1 46.1L60.8 46.6L61.8 47.0L61.6 47.9L62.4 47.6L62.3 48.6L63.1 49.7L62.4 50.5L60.9 50.3L61.2 51.5L61.1 52.3L60.2 52.6L59.8 53.4L58.9 53.4L58.5 54.5L58.0 53.6L57.6 52.8L56.8 52.1L56.0 51.8L55.2 51.8L54.0 52.1L53.4 51.4L54.5 50.0L54.9 49.0L55.6 48.6L55.6 49.9L55.8 48.9L56.4 47.4L56.9 46.4L57.7 47.0L58.5 47.7L58.9 46.5L58.7 45.2L57.9 45.8L56.9 45.5L56.6 44.5L55.8 45.7L55.3 46.9L54.2 47.0L53.3 47.5L52.4 47.9L51.8 48.7L50.9 49.0L49.8 49.0L50.6 49.6L50.3 50.7L50.2 51.6L50.1 52.5L49.1 54.3L48.2 54.1L47.6 54.7L46.8 54.2L45.7 53.7L45.4 52.4L45.6 50.7L45.3 49.1L45.0 50.0L45.0 51.1L44.7 52.0L44.7 52.9L44.1 54.1L43.2 54.5L42.4 55.0L41.4 55.5L41.3 56.9L40.8 58.3L39.8 58.1L38.8 58.8L39.0 57.7L38.8 56.9L38.0 56.7L38.1 55.5L38.6 54.6L37.8 54.9L37.3 54.3L37.3 53.5L37.7 52.5L37.0 51.9L36.4 51.1L35.6 51.3L34.6 50.7L33.8 50.2L32.9 49.9L32.6 48.5L32.5 47.2L32.8 46.4L33.2 45.0L34.3 45.6L34.7 46.7L34.5 47.5L34.9 48.3L35.2 49.6L36.1 49.7L37.0 50.2L36.6 49.4L35.7 49.0L34.5 47.0L35.6 45.9L35.4 44.8L37.1 44.3L36.2 44.1L35.4 44.4L35.1 43.5ZM41.4 48.8L40.3 48.6L39.3 47.8L38.7 47.3L38.1 46.3L37.3 45.9L35.9 45.6L37.2 46.6L37.7 48.0L38.6 48.3L39.4 48.1L40.3 48.7L41.4 48.8Z","경기":"M48.4 45.1L49.4 44.2L49.1 43.4L49.5 42.6L49.9 41.9L49.1 41.8L48.4 42.1L48.3 41.3L48.5 40.4L47.9 39.5L48.0 38.2L46.9 38.3L46.0 37.8L45.5 38.5L45.3 39.7L44.6 39.2L43.6 39.5L43.3 40.5L42.7 41.5L41.7 41.3L41.0 40.8L40.0 41.3L39.1 41.1L38.2 40.2L37.5 39.7L36.8 40.7L35.5 41.3L34.9 40.1L34.5 39.3L34.4 38.3L34.3 36.9L34.1 35.9L35.1 35.8L36.0 36.1L37.1 35.5L37.9 33.9L38.3 32.8L38.0 31.7L37.8 30.5L38.6 29.6L40.0 29.3L40.9 29.1L41.5 28.5L42.2 27.9L42.5 26.4L42.9 25.3L43.4 24.7L44.8 24.7L44.9 23.7L45.3 22.4L46.2 21.4L47.3 20.8L48.3 20.0L48.4 20.8L48.4 21.6L49.2 21.6L49.7 22.4L49.9 23.3L51.0 24.4L51.9 23.7L52.5 24.2L52.3 25.0L53.1 25.3L53.7 26.1L54.5 25.5L55.6 25.7L56.3 26.4L56.3 27.3L56.6 28.3L57.6 28.8L58.5 28.8L58.6 29.8L60.0 30.2L60.4 31.7L60.1 32.6L58.7 33.5L58.2 34.1L58.1 35.1L58.6 36.0L57.9 36.7L58.5 37.3L58.8 38.2L58.4 39.6L59.5 39.9L60.6 39.6L61.2 40.2L62.2 40.9L63.3 41.3L64.3 41.5L65.0 41.9L65.9 42.3L64.9 42.8L64.1 43.7L64.6 45.0L64.8 45.8L64.2 47.7L63.7 48.5L63.9 49.8L63.7 50.9L63.4 52.0L63.0 53.4L62.2 54.3L61.6 54.8L60.6 54.2L60.7 55.9L60.0 56.3L59.2 57.0L57.9 57.2L56.8 57.3L56.6 58.1L55.9 58.8L55.1 58.9L55.1 59.9L54.0 60.2L53.0 60.9L52.6 62.0L51.5 61.3L50.7 60.7L49.9 60.0L48.5 59.8L47.4 60.7L46.4 61.0L45.3 60.8L44.3 61.3L43.5 61.7L43.1 60.8L42.1 60.5L41.5 59.2L40.5 58.7L39.7 58.0L40.0 57.0L40.2 55.8L40.5 54.8L40.8 53.2L40.4 53.9L39.2 54.7L38.3 55.3L38.1 54.1L37.7 53.2L38.0 52.2L38.2 51.0L39.9 51.2L40.5 51.8L40.7 50.9L41.2 50.1L42.0 50.9L41.3 49.9L40.3 50.2L39.1 49.8L37.8 49.0L38.6 48.3L39.2 47.3L39.8 46.4L40.4 45.4L40.0 44.6L39.5 43.7L40.0 42.8L40.8 42.8L41.5 43.2L41.3 43.9L42.0 44.7L42.5 44.0L43.0 44.9L43.3 45.8L44.4 45.7L45.4 45.1L46.4 44.9L46.8 46.0L47.8 45.5Z","충북":"M54.5 34.4L53.8 35.3L52.5 35.0L52.4 35.8L51.8 37.3L52.8 38.2L51.5 38.0L50.5 38.3L49.8 37.7L49.5 38.7L47.9 39.2L48.6 39.7L49.3 40.6L49.1 41.7L47.9 41.3L47.5 40.4L46.8 41.1L46.1 41.8L45.6 42.9L47.2 43.4L47.5 44.4L48.3 44.7L47.7 45.9L47.6 46.7L47.5 47.6L47.2 48.9L47.8 49.7L47.7 50.8L46.9 51.3L46.9 53.2L47.8 53.2L48.3 52.3L49.0 53.1L49.5 53.8L50.4 53.6L51.2 53.3L52.1 53.9L52.3 55.5L51.3 55.4L50.2 56.1L50.8 57.3L50.6 58.1L50.1 58.8L49.9 60.1L49.1 60.7L48.3 61.1L47.6 61.7L46.8 61.1L46.0 61.5L45.2 61.9L43.3 61.4L42.7 60.4L41.6 60.6L40.6 59.2L39.8 57.9L40.1 57.0L39.9 55.9L39.7 54.7L38.6 54.7L37.9 54.3L37.0 53.7L37.3 52.8L37.4 51.1L38.1 49.4L38.8 49.2L38.5 48.3L37.5 48.7L37.1 47.9L36.8 47.1L35.4 47.1L34.8 46.2L34.8 45.1L34.7 44.2L34.1 43.4L32.6 42.9L32.0 41.7L31.5 41.1L32.1 40.0L31.6 39.2L32.4 38.1L32.9 37.1L34.3 36.9L35.2 37.0L34.5 36.0L34.2 35.1L32.9 34.5L32.2 33.5L31.7 32.4L32.1 31.6L33.1 30.6L34.0 30.5L34.3 29.3L35.5 28.7L36.3 27.9L36.5 27.0L37.7 26.9L39.1 27.2L39.4 26.3L41.0 25.4L41.1 24.0L41.9 24.1L42.7 23.6L43.3 22.5L43.8 21.6L44.3 22.8L45.2 23.9L46.2 23.6L47.5 23.2L48.2 23.7L48.9 23.2L49.2 22.4L48.8 21.1L50.5 20.0L51.4 20.5L52.0 21.5L52.0 22.4L53.0 22.2L53.9 21.7L55.4 21.5L56.3 20.3L57.2 21.1L58.2 21.7L59.1 21.4L59.8 22.0L58.9 22.6L58.1 23.3L59.0 24.2L60.4 23.4L61.3 23.4L61.6 24.4L62.3 25.3L63.1 24.9L63.9 25.0L64.8 24.9L65.5 25.7L66.9 26.1L67.9 26.2L68.0 27.4L66.7 27.3L66.3 28.3L64.8 29.2L64.0 30.2L63.4 31.0L62.8 32.1L62.4 32.9L63.1 33.9L62.3 35.1L61.2 35.0L59.9 34.9L58.9 34.4L58.5 33.6L57.4 33.1L56.7 33.9L56.8 35.1L55.1 34.7Z","충남":"M58.6 34.4L57.4 34.2L56.6 35.0L57.4 35.4L57.3 36.4L57.4 37.4L57.3 38.3L58.2 38.7L57.8 40.6L57.7 41.5L58.4 42.1L58.6 43.1L58.8 43.9L59.6 44.4L60.7 44.6L60.6 45.6L60.6 46.7L60.1 47.4L60.1 48.4L60.9 49.5L61.0 50.8L62.0 52.1L62.7 51.1L62.8 50.1L63.0 49.2L63.4 50.4L64.0 51.1L64.9 51.7L65.5 50.8L66.2 50.3L67.2 49.9L68.2 50.5L69.0 51.0L69.0 52.0L68.8 53.7L69.5 54.5L70.0 55.8L69.5 56.7L69.1 57.7L67.2 56.7L67.4 57.7L67.0 58.5L66.1 58.7L65.2 58.6L64.7 57.4L63.8 57.8L63.1 56.6L62.7 55.1L62.1 53.8L61.2 54.0L60.4 54.5L59.7 55.0L58.7 54.8L57.7 55.3L56.9 55.2L55.9 55.6L54.9 55.0L54.9 54.1L54.5 53.4L53.4 53.2L52.1 53.0L51.1 53.5L49.9 54.4L49.9 55.8L49.2 56.3L48.4 56.9L46.9 57.2L46.3 58.0L44.4 57.7L44.4 56.7L43.6 56.3L43.6 55.4L43.0 54.6L42.6 53.9L41.6 53.9L40.4 52.8L41.0 51.7L41.9 51.9L41.1 51.5L40.9 50.3L41.4 49.3L40.7 48.4L40.2 47.5L41.3 47.0L40.4 45.7L39.6 45.5L40.1 44.1L39.7 43.3L39.5 41.7L38.9 40.0L38.8 38.9L39.5 38.3L39.0 37.6L39.2 35.7L38.7 37.1L38.2 38.5L37.4 37.9L36.6 37.6L36.5 36.2L36.1 34.5L36.0 36.1L36.2 37.5L34.7 39.0L34.5 37.9L34.5 36.5L33.9 35.3L34.2 34.3L33.2 34.7L32.6 35.5L31.6 35.9L30.4 36.2L30.9 35.1L31.9 34.7L32.8 34.5L32.2 34.0L31.4 33.4L31.0 34.1L30.2 34.4L30.0 33.1L30.8 32.3L31.2 31.0L32.1 30.3L32.2 29.1L33.5 28.3L32.8 29.3L33.5 29.8L34.5 28.6L34.7 27.8L34.5 26.4L35.3 26.9L35.2 27.7L35.4 28.9L34.8 30.2L34.5 31.4L35.8 31.5L35.5 30.7L36.1 30.0L36.7 29.3L37.5 29.3L37.8 27.9L37.0 27.2L35.8 26.7L35.6 25.6L36.7 25.0L38.2 24.9L39.6 26.4L39.8 27.5L39.6 28.3L39.9 27.6L39.7 26.4L39.6 25.5L38.9 24.6L40.1 23.3L40.9 24.0L42.7 24.8L43.8 25.5L45.5 25.4L47.6 26.2L48.0 27.8L48.5 28.8L48.9 29.9L50.1 29.1L51.0 29.0L51.8 28.1L52.9 27.6L53.7 27.5L54.9 27.4L56.0 26.5L57.4 26.5L58.6 27.0L59.7 28.1L60.9 28.9L61.3 30.0L62.0 30.9L63.3 31.5L63.6 32.5L64.3 33.3L63.4 33.3L62.1 33.5L61.6 34.4L60.8 35.5L59.8 35.4L58.7 34.6Z","경북":"M69.0 49.7L68.4 50.9L67.9 52.3L67.9 53.3L67.9 54.2L67.5 55.2L67.2 57.1L66.9 57.9L66.8 58.9L66.2 59.8L65.4 59.4L64.6 59.3L63.5 59.5L62.4 59.8L62.2 58.7L61.2 58.1L60.0 58.1L58.5 58.4L58.0 59.5L56.7 60.6L55.3 60.2L53.9 60.6L53.2 61.4L52.3 61.5L51.3 61.9L50.5 61.7L49.3 61.2L48.2 61.6L47.2 61.0L46.5 58.9L46.5 58.1L47.3 57.5L48.4 57.5L48.5 58.4L49.4 57.9L50.1 57.3L49.8 56.1L50.6 55.7L50.7 54.7L51.5 54.1L51.4 52.8L51.2 52.0L50.9 50.7L50.1 50.1L50.2 49.1L50.7 48.2L52.1 48.3L53.0 47.8L53.4 46.9L54.3 46.8L54.4 46.0L53.4 44.9L52.4 45.0L51.7 45.4L50.8 45.2L49.4 44.7L48.7 44.2L47.9 43.2L47.0 43.3L45.3 42.3L44.4 42.6L44.1 43.7L44.6 44.8L45.4 44.4L45.8 45.3L47.1 45.8L46.9 47.1L47.4 48.2L48.6 48.4L48.7 49.2L48.9 50.3L48.1 50.9L47.1 51.3L46.6 52.3L46.0 53.1L45.2 53.2L45.4 52.2L44.3 52.5L43.8 53.5L43.5 54.5L45.0 54.7L45.5 55.4L44.2 55.6L43.5 56.8L44.1 57.5L44.5 58.4L43.2 58.4L43.4 59.7L43.5 60.8L42.8 60.0L41.6 59.6L40.8 60.0L39.5 60.0L38.7 59.7L39.6 58.5L39.4 57.5L38.7 56.6L38.0 56.1L37.9 55.2L36.9 54.8L35.9 54.9L34.8 54.3L33.8 54.1L33.3 53.4L32.8 52.8L33.3 51.9L32.9 51.0L32.6 50.0L33.4 49.1L34.4 48.7L34.5 47.7L34.9 46.6L34.7 45.6L35.5 45.0L36.5 45.3L35.8 44.2L35.5 43.4L34.5 43.9L33.7 43.2L33.2 42.5L32.7 43.3L31.9 42.2L32.7 41.4L32.7 40.5L32.7 39.3L32.6 38.2L33.2 37.1L32.5 36.3L32.2 35.5L31.4 35.4L30.9 34.6L32.0 34.3L32.5 33.1L33.3 33.9L33.9 33.3L33.3 32.5L33.7 31.8L34.4 31.0L35.3 31.5L36.2 31.8L35.9 30.7L36.4 29.5L37.5 29.1L38.1 28.4L39.8 28.9L39.8 28.0L40.4 27.3L41.2 27.8L41.8 28.5L43.0 29.3L44.2 29.0L44.8 28.0L44.3 27.2L44.7 25.9L45.4 25.1L46.2 24.5L47.1 24.0L47.3 23.1L48.7 22.9L49.2 22.2L49.9 22.5L50.9 22.9L51.6 22.2L52.4 21.6L53.3 22.5L54.4 22.7L54.9 21.5L55.7 21.9L57.3 21.9L58.2 21.5L59.1 21.4L59.9 22.1L60.6 22.8L61.4 22.7L61.5 21.9L62.3 21.2L63.0 20.6L64.4 20.0L64.7 21.2L65.7 22.2L65.4 23.1L65.6 24.1L65.6 25.2L65.5 26.3L65.6 27.4L66.4 28.9L66.8 30.1L66.8 32.0L66.0 32.8L65.4 34.0L65.7 35.5L66.1 37.0L65.9 38.1L65.8 39.7L64.9 41.1L64.7 43.4L64.9 44.2L64.6 45.1L65.1 46.1L65.1 47.0L65.7 47.5L65.5 48.4L64.7 49.1L65.5 50.2L66.2 50.8L66.7 50.2L67.4 49.6L68.2 48.8L69.0 49.7Z","경남":"M51.0 56.4L50.9 57.6L50.2 58.2L49.4 57.1L49.0 56.4L50.1 56.1L49.5 55.6L50.5 55.3L49.7 55.1L48.3 54.8L47.6 54.0L48.9 53.8L48.7 53.0L48.0 52.3L47.6 53.1L47.2 54.0L46.6 53.3L45.7 52.7L45.1 53.7L44.3 54.2L43.5 54.5L43.2 53.5L42.4 53.3L41.6 53.2L41.1 52.4L41.2 51.4L41.2 50.0L41.4 49.1L40.9 50.2L39.9 49.8L40.8 50.8L39.9 51.8L39.0 51.8L38.4 50.7L38.1 51.6L37.7 52.4L36.6 52.7L35.1 52.9L34.6 52.0L35.1 50.6L34.7 49.6L33.9 48.8L32.9 48.1L32.2 46.6L31.2 45.7L31.0 44.1L30.4 43.2L30.0 41.9L31.0 41.2L30.8 40.2L31.4 39.2L32.2 37.8L31.4 37.4L31.8 36.7L31.2 35.3L30.2 34.6L30.8 33.7L31.1 32.8L31.0 32.0L31.5 31.1L32.0 30.0L32.0 29.1L32.2 28.1L33.0 27.6L33.9 26.4L35.5 25.5L36.4 25.2L37.6 23.8L37.7 24.6L38.5 24.8L39.6 25.7L40.6 26.4L41.5 26.4L42.5 26.3L43.3 26.6L43.4 27.6L44.3 27.9L44.9 28.7L45.3 30.3L44.7 31.1L45.2 31.9L46.2 31.6L47.0 31.8L48.9 32.0L49.1 32.9L49.9 32.8L50.8 32.5L51.5 32.0L52.6 32.1L52.7 31.0L53.4 32.5L53.9 33.1L54.7 33.7L56.3 33.3L57.1 33.4L58.0 33.8L59.5 34.3L60.3 33.4L61.5 32.6L62.4 32.2L63.2 32.3L64.3 33.0L65.2 32.8L65.1 33.7L63.9 34.4L64.6 35.0L66.0 35.3L67.0 36.3L67.9 37.5L68.7 38.3L69.6 38.3L69.6 39.6L69.4 40.4L68.0 40.2L67.3 42.1L66.4 42.5L65.0 43.0L64.7 43.9L63.4 44.4L62.5 44.5L61.5 45.1L61.7 46.0L60.5 46.5L59.6 46.5L60.1 47.2L60.8 47.9L60.0 48.7L59.5 48.0L58.8 49.0L58.2 48.4L57.3 47.0L56.1 47.1L55.2 46.7L54.7 46.0L55.4 44.8L54.6 44.9L54.1 45.6L54.7 46.4L54.3 47.2L55.0 48.1L55.8 49.1L55.0 49.5L53.9 48.9L53.3 47.7L52.2 48.0L51.5 49.0L50.6 49.5L49.4 49.7L48.9 50.9L49.8 50.6L51.1 49.6L52.0 49.2L52.0 50.3L51.9 51.4L50.2 51.3L51.0 51.7L50.8 52.4L50.5 54.3L51.5 54.0L51.5 54.9L51.2 55.7Z","제주":"M32.6 41.3L35.0 38.9L35.2 37.5L36.9 36.9L37.8 35.5L39.0 35.7L41.4 34.4L42.2 34.6L43.3 34.1L44.7 33.7L45.5 33.4L46.6 32.9L47.2 32.3L48.1 32.6L49.4 31.7L51.2 32.1L52.7 31.5L54.2 31.0L55.0 30.2L55.9 30.9L57.9 30.3L59.1 29.8L60.8 29.9L61.8 29.5L62.8 30.1L64.2 29.9L65.8 32.0L67.6 31.9L68.3 32.4L68.8 33.5L68.1 34.7L68.8 35.2L69.8 35.3L69.1 37.0L69.8 38.0L68.8 38.3L68.1 39.6L67.2 40.8L66.3 42.0L65.4 43.7L65.3 44.7L64.6 45.4L63.2 45.9L61.6 45.7L60.0 47.3L57.6 47.8L55.3 47.8L54.6 48.6L53.8 48.9L53.3 49.6L50.5 49.5L49.6 49.8L48.5 49.6L47.7 50.3L46.8 50.3L45.9 50.7L45.2 49.7L43.9 50.1L43.1 49.5L41.5 50.2L40.6 50.2L38.1 49.7L36.9 50.9L36.7 51.8L35.5 52.5L35.2 51.5L33.7 50.0L32.0 49.3L30.9 48.3L30.4 47.1L30.0 44.5L30.3 43.1L31.0 42.3L32.6 41.3Z","강원":"M37.1 43.4L37.6 42.7L37.3 41.7L37.5 40.7L38.3 40.0L39.0 39.2L38.8 38.1L37.7 37.8L37.0 37.1L36.2 36.7L36.0 35.9L35.9 34.6L34.8 34.4L34.1 34.8L33.1 34.4L33.2 33.6L32.0 33.8L31.4 32.8L30.9 31.8L30.1 31.7L30.0 30.5L30.8 30.2L31.9 29.8L33.1 29.7L34.1 29.6L34.9 29.4L36.1 29.9L37.1 30.2L38.5 29.4L39.4 29.6L40.3 29.6L41.3 29.2L42.1 29.6L43.0 30.5L43.8 30.1L44.8 30.2L45.4 30.7L46.0 29.9L47.3 29.8L48.0 29.4L49.4 28.5L50.1 28.0L50.8 27.2L51.4 24.3L51.5 23.3L53.0 24.5L53.3 25.6L54.0 26.8L54.3 28.0L55.0 28.7L55.3 29.5L55.7 30.5L56.3 31.6L56.3 32.4L56.6 33.4L57.1 34.4L57.8 35.5L58.3 36.2L59.0 37.2L59.5 38.1L60.2 38.9L60.7 39.8L61.3 40.6L62.0 41.6L62.7 42.3L63.3 42.9L63.8 43.6L64.6 44.4L64.5 45.6L65.5 46.5L65.5 47.4L66.1 48.5L66.9 49.4L67.6 50.7L68.3 51.9L68.9 52.9L69.9 54.2L69.6 55.1L70.0 56.2L68.8 56.7L68.0 57.3L67.6 58.2L66.8 58.5L66.3 57.9L65.6 57.4L64.8 57.4L63.4 57.6L62.6 57.3L61.9 57.9L60.8 58.3L60.0 57.5L59.4 58.0L59.1 58.8L58.0 58.3L56.9 57.8L55.8 57.4L54.9 57.1L53.8 56.9L52.8 56.6L52.0 55.9L51.1 56.4L50.5 55.9L51.6 55.0L50.6 54.8L49.7 54.1L48.9 54.3L48.0 54.5L47.2 55.1L46.3 54.9L46.1 54.0L44.7 54.1L44.7 55.2L44.0 56.1L43.1 56.0L42.1 56.2L41.4 55.5L41.3 54.6L41.5 53.5L41.7 52.7L41.5 51.7L42.2 50.0L42.2 49.1L41.5 48.5L42.4 47.5L43.1 47.1L42.1 46.4L41.2 46.3L40.4 46.0L39.7 45.6L38.7 44.9L38.0 45.4L37.8 44.1L38.0 43.2L37.1 43.4Z","전북":"M37.7 35.7L36.7 35.5L35.0 35.6L34.9 34.8L35.0 33.9L33.2 33.9L32.5 32.9L33.3 32.8L35.8 32.7L36.9 32.2L37.9 32.1L38.5 31.4L39.7 31.0L41.2 30.2L41.9 29.7L42.0 28.2L42.4 27.3L43.8 26.9L44.7 27.0L46.2 27.4L47.0 28.0L47.1 28.9L47.9 29.6L48.9 29.8L49.5 29.0L50.7 29.1L52.1 28.8L52.8 28.4L53.6 27.8L54.5 27.6L55.0 28.4L55.1 30.2L55.6 31.2L56.2 31.7L56.9 31.1L57.7 32.5L58.6 32.7L59.6 32.5L60.0 31.6L59.7 30.6L61.4 31.2L62.3 30.9L62.1 29.9L63.1 30.2L64.2 30.0L64.8 31.0L66.0 31.2L66.9 31.1L68.3 30.7L69.1 31.2L69.0 32.1L69.8 33.5L69.2 34.4L68.4 35.6L68.1 36.4L67.3 36.9L65.8 37.4L64.8 38.7L63.7 39.7L63.2 40.7L63.2 41.6L62.6 43.0L62.1 43.9L62.6 44.7L61.8 45.5L61.2 46.8L62.3 47.5L62.6 48.3L63.0 49.1L62.6 49.9L63.5 50.4L63.2 51.5L62.6 51.9L62.2 52.8L62.2 53.8L61.7 54.6L61.0 54.9L59.7 54.0L58.8 53.2L57.0 53.3L56.2 54.4L55.8 55.1L55.0 54.5L54.1 54.9L53.2 54.8L52.2 54.7L51.4 54.0L50.5 54.5L49.4 54.7L48.5 55.2L47.2 54.9L46.8 53.9L47.3 53.0L46.5 52.6L46.7 51.7L46.4 50.8L46.3 49.7L45.5 49.8L44.6 51.0L44.8 51.8L43.6 52.1L42.8 51.2L42.6 50.3L41.9 49.9L40.7 49.1L39.3 49.7L38.3 50.3L38.8 51.4L37.9 52.0L37.8 53.1L36.9 53.8L35.8 54.3L34.7 54.0L34.3 54.8L33.5 54.8L32.3 54.2L32.3 53.4L31.3 52.4L31.7 51.6L30.5 50.9L30.9 49.2L31.5 48.0L32.4 47.5L33.7 47.2L34.5 47.4L35.1 46.3L35.9 46.3L35.3 45.5L33.9 45.6L33.0 45.7L31.7 45.8L30.9 44.8L31.5 43.4L32.7 42.7L33.8 42.1L34.6 41.3L35.3 40.4L35.2 39.0L37.3 38.7L38.1 38.8L39.2 39.6L39.4 38.6L38.2 38.0L37.0 37.3L38.1 36.4L39.7 36.5L40.0 35.5L41.0 34.9L40.2 35.0L39.2 35.7L38.3 35.6Z"};
  // 배지 숫자·리본 글꼴: Oswald(구글 폰트). 못 받으면 좁은 기본 글꼴
  var NUMFONT = "Oswald, 'Avenir Next Condensed', 'Arial Narrow', sans-serif";
  function loadFont() {
    if (document.getElementById('okbmOswald')) return;
    var l = document.createElement('link');
    l.id = 'okbmOswald'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&display=swap';
    document.head.appendChild(l);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var uid = 0;
  // 배지 가운데 그림은 장착 링 칩(badge-ring.js)과 같은 그림을 쓴다(머스타드 돔 텐트·잎·눈 봉우리·지도·깃발·사계절·섬). 못 받은 배지는 흑백으로 흐리게
  var ART = { tent: 'trips', bag: 'plog', peak: 'ever', pin: 'reg', flag: 'spot', season: 'season', island: 'island' };
  function art(b, id, locked) {
    var r = window.okbmBadgeRing, g = r && typeof r.icon === 'function' ? r.icon(ART[b.icon], locked ? '#2a2a30' : b.fill, id + 'a') : '';
    return g ? '<g transform="translate(50 39) scale(1.75)"' + (locked ? ' filter="url(#' + id + 'gs)" opacity=".45"' : '') + '>' + g + '</g>' : '';
  }
  // b: { shape, fill, metal, icon|sil, num, ribbon, got }
  function svg(b) {
    var id = 'okbmBdg' + (++uid), d = SHAPE[b.shape];
    var locked = !b.got;
    var m = locked ? ['#2a2a30', '#3a3a42'] : METAL[b.metal || 'g'];
    var fill = locked ? '#121215' : b.fill;
    var ink = locked ? '#8b8b93' : '#f4efe2';
    // 무지개(metal 'r', 백패킹 100회): 테두리·리본이 무지개색으로 천천히 돌고 테두리에 별이 반짝인다
    var rainbow = !locked && b.metal === 'r';
    var grad = rainbow
      ? '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
        ['#ff5e7a', '#ffb347', '#ffe66d', '#7ee081', '#5ec8ff', '#8f7bff', '#ff7ad9', '#ff5e7a'].map(function (c, i) { return '<stop offset="' + (i / 7).toFixed(3) + '" stop-color="' + c + '"/>'; }).join('') +
        '<animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="6s" repeatCount="indefinite"/></linearGradient>'
      : '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[1] + '"/><stop offset=".5" stop-color="' + m[0] + '"/><stop offset="1" stop-color="' + m[1] + '"/></linearGradient>';
    if (rainbow) m = ['url(#' + id + ')', '#fff'];
    // 금속 빛줄기: 받은 동·은·금 테두리에 빛이 비스듬히 지나간다. 동은 은은하고 느리게, 은은 차갑고 또렷하게, 금은 밝고 빠르게(+반짝이 둘)
    var GLINT = { b: [0.32, 5.2, '#ffe2c4'], s: [0.55, 3.8, '#ffffff'], g: [0.75, 3, '#fff6d6'] };
    var gl = !locked && GLINT[b.metal];
    if (gl) {
      grad += '<linearGradient id="' + id + 'g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="34" y2="34">' +
        '<stop offset="0" stop-color="' + gl[2] + '" stop-opacity="0"/><stop offset=".5" stop-color="' + gl[2] + '" stop-opacity="' + gl[0] + '"/><stop offset="1" stop-color="' + gl[2] + '" stop-opacity="0"/>' +
        '<animateTransform attributeName="gradientTransform" type="translate" values="-60 -60;110 110;110 110" keyTimes="0;.55;1" dur="' + gl[1] + 's" repeatCount="indefinite"/></linearGradient>';
    }
    var s = '<svg viewBox="0 0 100 114" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(b.ko) + '" style="color:' + ink + '">' +
      '<defs>' + grad + '<filter id="' + id + 'gs"><feColorMatrix type="saturate" values="0"/></filter></defs>' +
      '<path d="' + d + '" fill="url(#' + id + ')"/>' +
      (gl ? '<path d="' + d + '" fill="url(#' + id + 'g)"/>' : '') +
      '<path d="' + d + '" fill="' + fill + '" transform="translate(50 50) scale(.86) translate(-50 -50)"/>' +
      '<path d="' + d + '" fill="none" stroke="' + ink + '" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2.4 2.2" transform="translate(50 50) scale(.78) translate(-50 -50)"/>';
    if (b.sil && SIL[b.sil]) s += '<path d="' + SIL[b.sil] + '" fill="' + ink + '" fill-opacity="' + (locked ? '.4' : '.92') + '"/>';
    else if (b.icon) s += art(b, id, locked) || ICON[b.icon];
    if (b.num != null) s += '<text x="50" y="76" text-anchor="middle" font-family="' + NUMFONT + '" font-weight="700" font-size="' + (String(b.num).length > 3 ? 15 : 22) + '" fill="' + ink + '">' + esc(b.num) + '</text>';
    s += '<path d="M4 92 H96 L91 101 L96 110 H4 L9 101 Z" fill="' + (locked ? '#2a2a30' : m[0]) + '"/>' +
      '<text x="50" y="104.6" text-anchor="middle" font-family="' + NUMFONT + '" font-weight="600" font-size="13" letter-spacing=".3" fill="' + (locked ? '#a1a1a9' : '#fff') + '"' + (rainbow ? ' stroke="#000" stroke-opacity=".35" stroke-width=".6" paint-order="stroke"' : '') + '>' + esc(b.ribbon) + '</text>';
    // 반짝이: 무지개는 넷, 금은 둘
    var sparks = rainbow ? [[18, 20, 0], [84, 26, 0.7], [90, 66, 1.4], [12, 70, 2.1]] : (!locked && b.metal === 'g' ? [[82, 22, 0.4], [16, 68, 1.8]] : []);
    if (sparks.length) {
      sparks.forEach(function (p) {
        s += '<path d="M' + p[0] + ' ' + (p[1] - 5) + ' L' + (p[0] + 1.3) + ' ' + (p[1] - 1.3) + ' L' + (p[0] + 5) + ' ' + p[1] + ' L' + (p[0] + 1.3) + ' ' + (p[1] + 1.3) + ' L' + p[0] + ' ' + (p[1] + 5) + ' L' + (p[0] - 1.3) + ' ' + (p[1] + 1.3) + ' L' + (p[0] - 5) + ' ' + p[1] + ' L' + (p[0] - 1.3) + ' ' + (p[1] - 1.3) + ' Z" fill="#fff" opacity="0">' +
          '<animate attributeName="opacity" values="0;1;0" dur="2.8s" begin="' + p[2] + 's" repeatCount="indefinite"/></path>';
      });
    }
    return s + '</svg>';
  }

  var CSS = [
    '.bdg-row{display:flex;justify-content:space-between;margin-top:12px}',
    '.bdg-it{display:flex;flex-direction:column;align-items:center;gap:6px;width:74px;padding:0;border:0;background:none;color:inherit;font:inherit;cursor:pointer;text-align:center}',
    '.bdg-it svg{width:72px;height:82px;display:block}',
    '.bdg-it span{font-size:12px;color:var(--tx-2,#d1d1d6);line-height:1.3}',
    '.bdg-it span small{display:block;margin-top:1px;font-size:11px;color:var(--tx-3,#8b8b93);font-variant-numeric:tabular-nums}',
    '.bdg-nx{margin-top:12px;padding-top:12px;border-top:1px solid var(--line,rgba(255,255,255,.08))}',
    '.bdg-nx+.bdg-nx{border-top:0;padding-top:0}',
    '.bdg-nx div{display:flex;justify-content:space-between;gap:8px;font-size:13px}',
    '.bdg-nx b{font-weight:700;color:#f2f2f3}.bdg-nx em{font-style:normal;color:var(--tx-3,#8b8b93);font-variant-numeric:tabular-nums}',
    '.bdg-nx i{display:block;height:6px;border-radius:3px;background:var(--bg-3,#2a2a30);margin-top:7px;overflow:hidden}',
    '.bdg-nx i u{display:block;height:100%;border-radius:3px;background:#c88b57}',
    '.bdg-empty{margin-top:10px;font-size:13px;color:var(--tx-3,#8b8b93);line-height:1.5}',
    // 남의 프로필: 받은 배지만 네 칸씩, 누르지 않는다
    '.bdg-ro{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 4px;justify-items:center;margin-top:12px}.bdg-ro .bdg-it{cursor:default}',
    // 전체 보기
    '.bdg-all{position:fixed;inset:0 0 calc(56px + env(safe-area-inset-bottom,8px)) 0;z-index:2147483647;background:#000;color:#f2f2f3;display:flex;flex-direction:column}',
    '.bdg-all-h{flex:none;display:flex;align-items:center;gap:6px;height:calc(52px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 12px 0 4px;border-bottom:1px solid var(--line,rgba(255,255,255,.08))}',
    '.bdg-all-h button{width:44px;height:44px;border:0;background:none;color:#fff;display:grid;place-items:center;cursor:pointer}',
    '.bdg-all-h button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2}',
    '.bdg-all-h b{font-size:17px;font-weight:800}.bdg-all-h em{margin-left:auto;font-style:normal;font-size:13px;color:var(--tx-3,#8b8b93)}',
    '.bdg-all-b{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 0 calc(28px + env(safe-area-inset-bottom,0px))}',
    '.bdg-grp{padding:18px 10px 4px}',
    '.bdg-grp h2{margin:0 6px 2px;font-size:14px;font-weight:800}.bdg-grp p{margin:0 6px 14px;font-size:12px;color:var(--tx-3,#8b8b93)}',
    '.bdg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px 4px;justify-items:center}',
    '.bdg-grid .bdg-it{width:112px}.bdg-grid .bdg-it svg{width:104px;height:118px}.bdg-grid .bdg-it span{font-size:13px}.bdg-grid .bdg-it span small{font-size:12px}',
    // 배지 창(새 배지·자세히)
    '.bdg-pop{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.bdg-box{width:100%;max-width:330px;background:var(--bg-1,#0f0f11);border:1px solid var(--line,rgba(255,255,255,.08));border-radius:22px;padding:26px 20px 18px;display:flex;flex-direction:column;align-items:center;text-align:center;color:#f2f2f3}',
    '.bdg-box .eb{font-size:12px;font-weight:700;color:#fbbf24;letter-spacing:.04em}',
    '.bdg-box h2{margin:6px 0 14px;font-size:19px;font-weight:800}',
    '.bdg-box svg{width:170px;height:194px}',
    '.bdg-box .ko{margin-top:12px;font-size:16px;font-weight:800}',
    '.bdg-box .dt{margin-top:4px;font-size:13px;color:var(--tx-3,#8b8b93);line-height:1.5}',
    '.bdg-box .nx{margin-top:14px;width:100%;padding:11px 12px;border-radius:12px;background:var(--bg-2,#17171b);font-size:13px;color:var(--tx-2,#d1d1d6);text-align:left;box-sizing:border-box}',
    '.bdg-box .nx b{color:#f2f2f3}',
    '.bdg-box .btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:14px}',
    '.bdg-box .btns button{height:46px;border-radius:12px;border:0;font:inherit;font-size:15px;font-weight:800;cursor:pointer}',
    '.bdg-box .btns .c{background:var(--bg-2,#17171b);color:var(--tx-2,#d1d1d6)}.bdg-box .btns .s{background:var(--accent-fill,#2b6fd6);color:#fff}',
    '.bdg-box .btns.one{grid-template-columns:1fr}',
    // 장착 (badge-ring.js 사진 링)
    '.bdg-it{position:relative}.bdg-on{position:absolute;top:-4px;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:999px;background:#f1cf6a;color:#1c1405;font-size:11px;font-weight:800;white-space:nowrap;z-index:1}',
    '.bdg-eq{display:flex;align-items:center;gap:12px;width:100%;margin-top:14px;padding:12px;border-radius:14px;background:var(--bg-2,#17171b);box-sizing:border-box;text-align:left}',
    '.bdg-eq .rg{flex:none;width:64px;height:66px}.bdg-eq .rg svg{display:block;width:100%;height:100%}',
    '.bdg-eq span{font-size:13px;color:var(--tx-2,#d1d1d6);line-height:1.45}.bdg-eq b{display:block;color:#f2f2f3;font-size:14px}',
    '.bdg-box .btns .eq{grid-column:1 / -1;background:#f1cf6a;color:#1c1405}.bdg-box .btns .uq{grid-column:1 / -1;background:var(--bg-2,#17171b);color:#f1cf6a;border:1px solid rgba(241,207,106,.45)}',
    // 피드 완료 화면
    '.ptw-badge{width:100%;max-width:300px}',
    '.ptw-badge:empty{display:none}',
    '.bdg-dn-note{margin:0;font-size:12.5px;color:#8b8b93}',
    '.bdg-dn-prog{display:flex;gap:12px;align-items:center;width:100%;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#f2f2f3;font:inherit;text-align:left;cursor:pointer}',
    '.bdg-dn-prog svg{width:46px;height:52px;flex:none}',
    '.bdg-dn-prog span{flex:1;min-width:0}.bdg-dn-prog b{display:block;font-size:13.5px}.bdg-dn-prog small{display:block;margin-top:2px;font-size:12px;color:#8b8b93}',
    '.bdg-dn-prog i{display:block;height:6px;border-radius:3px;background:#2a2a30;margin-top:8px;overflow:hidden}.bdg-dn-prog i u{display:block;height:100%;border-radius:3px;background:#c88b57}',
    '.bdg-dn-got{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}',
    '.bdg-dn-got::-webkit-scrollbar{display:none}',
    '.bdg-dn-one{flex:0 0 100%;scroll-snap-align:center;box-sizing:border-box;padding:16px 14px 14px;border-radius:16px;background:linear-gradient(180deg,rgba(241,207,106,.10),rgba(241,207,106,0) 70%);border:1px solid rgba(241,207,106,.35);display:flex;flex-direction:column;align-items:center;text-align:center}',
    '.bdg-dn-got.many .bdg-dn-one{flex-basis:88%}',
    '.bdg-dn-one .eb{font-size:12px;font-weight:700;color:#fbbf24;letter-spacing:.04em}',
    '.bdg-dn-one svg{width:120px;height:137px;margin-top:8px}',
    '.bdg-dn-one b{margin-top:8px;font-size:16px;font-weight:800;color:#f2f2f3}',
    '.bdg-dn-one small{margin-top:3px;font-size:12.5px;color:#8b8b93;line-height:1.45}',
    '.bdg-dn-one button{margin-top:10px;height:34px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:none;color:#d1d1d6;font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    // 처음 한 번 소개
    '.bdg-intro{position:relative}',
    '.bdg-intro .lead{margin:6px 0 0;font-size:14px;color:var(--tx-2,#d1d1d6);line-height:1.55}',
    '.bdg-intro .irow{display:flex;justify-content:space-between;width:100%;margin:16px 0 4px}',
    '.bdg-intro .irow div{width:72px;display:flex;flex-direction:column;align-items:center;gap:4px}',
    '.bdg-intro .irow svg{width:68px;height:78px}.bdg-intro .irow span{font-size:11.5px;color:var(--tx-3,#8b8b93);line-height:1.3}',
    '.bdg-intro ul{width:100%;margin:12px 0 0;padding:0;list-style:none;text-align:left;font-size:13.5px;color:var(--tx-2,#d1d1d6);line-height:1.5}',
    '.bdg-intro li{display:flex;gap:8px;padding:8px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}.bdg-intro li b{flex:none;width:64px;color:#f2f2f3}',
    '.bdg-intro .have{margin:10px 0 0;font-size:13px;color:var(--tx-3,#8b8b93)}.bdg-intro .have b{color:#f2f2f3}',
    '.bdg-x{position:absolute;top:8px;right:8px;width:36px;height:36px;border:0;border-radius:10px;background:none;color:#8b8b93;font-size:18px;cursor:pointer}'
  ].join('');
  function ensureCss() {
    loadFont();
    if (document.getElementById('okbmBadgeCss')) return;
    var st = document.createElement('style'); st.id = 'okbmBadgeCss'; st.textContent = CSS; document.head.appendChild(st);
  }
  function fmtDate(d) { return d ? d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) : ''; }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function metric(n) { if (typeof window.okbmMetric === 'function') window.okbmMetric(n); }

  // 리스트를 기억해 두고 칸·창에서 같이 쓴다
  var LIST = [], OWN = false;
  function find(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return null; }
  // 장착 값 '종류:단계:배지id' (badge-ring.js, users.equipped_badge). 제보 배지는 묶음이 etc라 종류는 spot
  function ringKey(b) { return (b.group === 'etc' ? 'spot' : b.group) + ':' + (b.metal || 'g') + ':' + b.id; }
  function equippedId() {
    var r = window.okbmBadgeRing, p = r && r.parse(r.mine());
    return OWN && p ? p.id : '';
  }
  function item(b, big) {
    var sub = b.got ? fmtDate(b.date) : (b.goal ? num(b.cur) + ' / ' + num(b.goal) + (b.unit || '') : '');
    var on = b.got && equippedId() === b.id;
    return '<button type="button" class="bdg-it" data-bdg="' + esc(b.id) + '">' + (on ? '<i class="bdg-on">장착 중</i>' : '') + svg(b) + '<span>' + esc(b.ko) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></button>';
  }
  // 다음으로 가까운 배지(진행 비율 높은 순)
  function nextOnes(n) {
    return LIST.filter(function (b) { return !b.got && b.goal && b.cur > 0; })
      .sort(function (a, b) { return b.cur / b.goal - a.cur / a.goal; }).slice(0, n);
  }
  // 같은 줄(ladder)에서 이 배지 다음 단계
  function nextInLadder(b) {
    var same = LIST.filter(function (x) { return x.ladder && x.ladder === b.ladder && !x.got; });
    return same[0] || null;
  }

  // 리포트 탭 배지 칸
  function card(box) {
    if (!box) return;
    ensureCss();
    var got = LIST.filter(function (b) { return b.got; });
    // 남의 프로필(발자취): 받은 배지만 모두 보인다. 못 받은 배지·전체 보기·다음 배지·눌러서 자세히 보기는 없다
    if (!OWN) {
      var mine = got.slice().sort(function (a, b) { return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0); });
      box.innerHTML = '<div class="mr-h"><span class="mr-k">받은 배지 <b style="color:#f2f2f3;font-size:14px;margin-left:3px">' + mine.length + '</b></span></div>' +
        (mine.length ? '<div class="bdg-ro">' + mine.map(function (b) {
          return '<div class="bdg-it">' + svg(b) + '<span>' + esc(b.ko) + (b.date ? '<small>' + esc(fmtDate(b.date)) + '</small>' : '') + '</span></div>';
        }).join('') + '</div>' : '<p class="bdg-empty">아직 받은 배지가 없어요.</p>');
      return;
    }
    var recent = got.slice().sort(function (a, b) { return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0); }).slice(0, 4);
    var h = '<div class="mr-h"><span class="mr-k">배지 <b style="color:#f2f2f3;font-size:14px;margin-left:3px">' + got.length + '</b> / ' + LIST.length + '</span><button type="button" class="mr-go" data-bdg-all="1">전체 보기 ›</button></div>';
    if (recent.length) h += '<div class="bdg-row">' + recent.map(function (b) { return item(b); }).join('') + (recent.length < 4 ? new Array(4 - recent.length + 1).join('<span style="width:74px"></span>') : '') + '</div>';
    else h += '<p class="bdg-empty">다녀온 백패킹을 피드로 올리면 첫 배지를 받아요.</p>';
    nextOnes(2).forEach(function (b) {
      var p = Math.min(100, Math.round(b.cur / b.goal * 100));
      h += '<div class="bdg-nx"><div><b>다음 · ' + esc(b.title) + '</b><em>' + num(b.cur) + ' / ' + num(b.goal) + esc(b.unit || '') + '</em></div><i><u style="width:' + p + '%;background:' + (METAL[b.metal] || METAL.g)[1] + '"></u></i></div>';
    });
    box.innerHTML = h;
  }

  // 전체 보기
  var GROUPS = [['plog', '플로깅', '박지 주변 쓰레기를 주워 사진으로 인증한 횟수'], ['trips', '기록', '다녀온 백패킹 횟수'], ['ever', '누적 높이', '다녀온 박지 높이를 더해 에베레스트(8,849m)를 넘을 때마다'], ['reg', '포토맵', '채운 시·군'],
    ['do', '도 클리어', '그 도에서 박지가 있는 시·군을 모두 채우면'], ['island', '섬', '섬 박지에 다녀온 횟수'], ['season', '연도별 사계절', '그해에 봄·여름·가을·겨울을 모두 다녀오면'], ['etc', '제보', '제보한 박지가 채택되면']];
  function openAll() {
    ensureCss();
    metric('feat_badge_all');
    var old = document.getElementById('okbmBadgeAll');
    if (old) old.remove();
    var got = LIST.filter(function (b) { return b.got; }).length;
    var el = document.createElement('div');
    el.id = 'okbmBadgeAll';
    el.className = 'bdg-all';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '배지');
    el.innerHTML = '<div class="bdg-all-h"><button type="button" data-bdg-close="1" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><b>배지</b><em>' + got + ' / ' + LIST.length + '</em></div>' +
      '<div class="bdg-all-b">' + GROUPS.map(function (g) {
        var list = LIST.filter(function (b) { return b.group === g[0]; });
        return '<section class="bdg-grp"><h2>' + g[1] + '</h2><p>' + g[2] + '</p><div class="bdg-grid">' + list.map(function (b) { return item(b, true); }).join('') + '</div></section>';
      }).join('') + '</div>';
    document.body.appendChild(el);
    // 다른 기기에서 바꾼 장착을 맞춘 뒤 '장착 중' 표시를 다시 그린다
    if (OWN && window.okbmBadgeRing) window.okbmBadgeRing.syncMine().then(refreshMarks);
  }
  function refreshMarks() {
    var on = equippedId();
    document.querySelectorAll('#okbmBadgeAll .bdg-it, #mrBadges .bdg-it').forEach(function (el) {
      var has = el.querySelector('.bdg-on'), want = on && el.getAttribute('data-bdg') === on;
      if (want && !has) el.insertAdjacentHTML('afterbegin', '<i class="bdg-on">장착 중</i>');
      if (!want && has) has.remove();
    });
  }
  function myPhoto() {
    var me = currentUid();
    var u = (window.__userProfilePhotoMap && window.__userProfilePhotoMap[me]) ||
      (typeof window.resolveUserMasterPhoto === 'function' ? window.resolveUserMasterPhoto(me, '', '') : '') || '';
    return String(u).indexOf('https://') === 0 ? u : '';
  }
  function equipHtml(b) {
    if (!OWN || !b.got || !window.okbmBadgeRing) return '';
    var on = equippedId() === b.id;
    var photo = myPhoto();
    return '<div class="bdg-eq"><span class="rg">' + window.okbmBadgeRing.svg(ringKey(b), photo || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3Crect width=%221%22 height=%221%22 fill=%22%231e293b%22/%3E%3C/svg%3E') + '</span>' +
      '<span><b>' + (on ? '지금 장착 중이에요' : '장착하면 내 사진이 이렇게 보여요') + '</b>피드·프로필·댓글의 내 사진 둘레에 둘러져요.</span></div>';
  }

  // 배지 창: 새로 받은 것(isNew)이면 차례로 넘긴다
  var queue = [];
  function showPop(b, isNew) {
    ensureCss();
    var old = document.getElementById('okbmBadgePop');
    if (old) old.remove();
    var nx = nextInLadder(b);
    var el = document.createElement('div');
    el.id = 'okbmBadgePop';
    el.className = 'bdg-pop';
    var dt = b.got ? [fmtDate(b.date), b.spot].filter(Boolean).join(' · ') : (b.goal ? '지금 ' + num(b.cur) + ' / ' + num(b.goal) + (b.unit || '') : '');
    el.innerHTML = '<div class="bdg-box" role="dialog" aria-modal="true" aria-label="' + esc(b.ko) + '">' +
      (isNew ? '<span class="eb">NEW BADGE</span><h2>새 배지를 받았어요</h2>' : '') +
      svg(b) +
      '<div class="ko">' + esc(b.ko) + '</div>' +
      '<div class="dt">' + esc(b.desc) + (dt ? '<br>' + esc(dt) : '') + '</div>' +
      (b.got && nx && nx.goal ? '<div class="nx">다음 <b>' + esc(nx.title) + '</b>까지 ' + num(Math.max(0, nx.goal - nx.cur)) + esc(nx.unit || '') + ' 남았어요</div>' : '') +
      equipHtml(b) +
      '<div class="btns' + (b.got ? '' : ' one') + '">' +
        (OWN && b.got && window.okbmBadgeRing ? (equippedId() === b.id
          ? '<button type="button" class="uq" data-bdg-unequip="1">장착 풀기</button>'
          : '<button type="button" class="eq" data-bdg-equip="' + esc(b.id) + '">이 배지 장착하기</button>') : '') +
        (b.got ? '<button type="button" class="c" data-bdg-save="' + esc(b.id) + '">이미지 저장</button>' : '') + '<button type="button" class="s" data-bdg-ok="1">확인</button></div>' +
      '</div>';
    document.body.appendChild(el);
  }
  function nextInQueue() {
    var b = queue.shift();
    if (b) showPop(b, true);
  }

  // 이미지 저장: 1080×1080, 배지 + 이름 + 받은 날 + 닉네임
  function saveImage(b) {
    metric('feat_badge_save');
    var size = 1080, c = document.createElement('canvas');
    c.width = size; c.height = size;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(0, 0, size, size);
    var img = new Image();
    var url = URL.createObjectURL(new Blob([svg(b)], { type: 'image/svg+xml' }));
    img.onload = function () {
      var w = 520, h = 520 * 1.14;
      ctx.drawImage(img, (size - w) / 2, 150, w, h);
      URL.revokeObjectURL(url);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f2f2f3';
      ctx.font = "800 58px 'Pretendard Variable', Pretendard, sans-serif";
      ctx.fillText(b.ko, size / 2, 150 + h + 96);
      ctx.fillStyle = '#8b8b93';
      ctx.font = "600 34px 'Pretendard Variable', Pretendard, sans-serif";
      ctx.fillText([fmtDate(b.date), b.spot].filter(Boolean).join(' · '), size / 2, 150 + h + 150);
      var nick = '';
      try { nick = localStorage.getItem('okbm_user_nick') || ''; } catch (e) {}
      ctx.fillStyle = '#d1d1d6';
      ctx.font = "700 32px 'Pretendard Variable', Pretendard, sans-serif";
      ctx.fillText((nick ? nick + ' · ' : '') + '낭만루트', size / 2, size - 70);
      c.toBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], 'romanticroute-badge.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).catch(function () {});
          return;
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'romanticroute-badge.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, 'image/png');
    };
    img.src = url;
  }

  // 배지 기록(소개를 봤는지·이미 본 배지)은 계정 데이터 okbm_badge_state { intro, seen }로 서버에 저장한다(romantic-sync.js).
  // 기기를 바꿔도 한 번만 뜨게. 서버에 아직 없으면 이 기기의 예전 기록(계정별 열쇠)을 이어 쓰고, 그것도 함께 적어 둔다.
  function vaultOk(userId) {
    return !!(userId && window.RomanticVault && typeof window.RomanticVault.read === 'function' && userId === currentUid());
  }
  function readState(userId) {
    var st = null;
    if (vaultOk(userId)) { try { st = window.RomanticVault.read('okbm_badge_state', null); } catch (e) { st = null; } }
    return (st && typeof st === 'object' && !Array.isArray(st)) ? st : {};
  }
  function writeState(userId, patch) {
    if (!vaultOk(userId)) return;
    var st = readState(userId);
    var next = { intro: !!(patch.intro || st.intro), seen: Array.isArray(patch.seen) ? patch.seen : (Array.isArray(st.seen) ? st.seen : null) };
    if (JSON.stringify(next) === JSON.stringify({ intro: !!st.intro, seen: Array.isArray(st.seen) ? st.seen : null })) return;
    try { window.RomanticVault.write('okbm_badge_state', next, true); } catch (e) {}
  }
  // 서버 계정 데이터를 다 받은 뒤에 판단한다(먼저 판단하면 새 기기에서 소개가 또 뜬다). 늦어지면 6초 뒤 이 기기 기록으로
  var readyQ = [];
  function whenReady(fn) {
    readyQ.push(fn);
    if (readyQ.length > 1) return;
    var t0 = Date.now();
    (function tick() {
      var v = window.RomanticVault;
      if (!v || v.isHydrated || Date.now() - t0 > 6000) {
        var q = readyQ; readyQ = [];
        q.forEach(function (f) { try { f(); } catch (e) {} });
        return;
      }
      setTimeout(tick, 300);
    })();
  }

  // 지난번 본 배지와 비교해 새로 받은 것을 띄운다. 처음 여는 계정은 띄우지 않고 지금 것을 기억만 한다
  function checkNew(userId) {
    if (!userId) return;
    whenReady(function () { checkNowNew(userId); });
  }
  function checkNowNew(userId) {
    var seen = readSeen(userId);
    writeSeen(userId);
    if (!Array.isArray(seen)) return;
    var fresh = LIST.filter(function (b) { return b.got && seen.indexOf(b.id) < 0; });
    if (!fresh.length) return;
    metric('feat_badge_new');
    queue = fresh;
    nextInQueue();
  }

  // v2: 기록 배지를 12단계로 늘리며 새로 기억한다(예전 목록을 쓰면 지난 배지가 '새 배지'로 줄줄이 뜬다)
  function seenKey(userId) { return 'okbm_badges_seen_v2:' + userId; }
  function readSeen(userId) {
    var st = readState(userId);
    if (Array.isArray(st.seen)) return st.seen;
    try { return JSON.parse(localStorage.getItem(seenKey(userId)) || 'null'); } catch (e) { return null; }
  }
  function writeSeen(userId) {
    var got = LIST.filter(function (b) { return b.got; }).map(function (b) { return b.id; });
    // 다른 기기에서 본 배지(지금 목록에 없는 것)도 지우지 않고 남긴다
    var prev = readSeen(userId);
    if (Array.isArray(prev)) prev.forEach(function (id) { if (got.indexOf(id) < 0) got.push(id); });
    try { localStorage.setItem(seenKey(userId), JSON.stringify(got)); } catch (e) {}
    writeState(userId, { seen: got });
  }
  function currentUid() {
    try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { return ''; }
  }
  function leftText(b) {
    var n = Math.max(0, (b.goal || 0) - (b.cur || 0));
    return num(n) + (b.unit || '') + ' 남았어요';
  }

  // 피드 완료 화면(romantic-sync.js _ptwShowDone의 #ptwBadge): 새로 받은 배지는 크게, 없으면 가장 가까운 다음 배지 한 줄
  function done(el, record) {
    if (!el || typeof window.okbmComputeBadges !== 'function') return;
    ensureCss();
    if (!record || record.isPublished !== true) {
      el.innerHTML = '<p class="bdg-dn-note">나만 보기 피드는 배지에 세지 않아요.</p>';
      return;
    }
    var userId = currentUid();
    el.innerHTML = '<p class="bdg-dn-note">배지를 확인하는 중…</p>';
    window.okbmComputeBadges().then(function (list) {
      LIST = Array.isArray(list) ? list : [];
      OWN = true;
      var seen = readSeen(userId);
      var day = String(record.date || '').replace(/\D/g, '').slice(0, 8);
      // 기억한 목록이 없으면(처음) 이 피드 날짜에 받은 배지만 새 배지로 본다
      var fresh = LIST.filter(function (b) {
        if (!b.got) return false;
        if (Array.isArray(seen)) return seen.indexOf(b.id) < 0;
        return !!(b.date && fmtDate(b.date).replace(/\D/g, '') === day);
      });
      if (userId) writeSeen(userId);
      if (fresh.length) {
        metric('feat_badge_new');
        el.innerHTML = '<div class="bdg-dn-got' + (fresh.length > 1 ? ' many' : '') + '">' + fresh.map(function (b) {
          return '<div class="bdg-dn-one"><span class="eb">NEW BADGE</span>' + svg(b) + '<b>' + esc(b.ko) + '</b><small>' + esc(b.desc) + '</small>' +
            '<button type="button" data-bdg-save="' + esc(b.id) + '">이미지 저장</button></div>';
        }).join('') + '</div>' + (fresh.length > 1 ? '<p class="bdg-dn-note">배지 ' + fresh.length + '개를 받았어요 · 옆으로 넘겨 보세요</p>' : '');
        return;
      }
      var nx = nextOnes(1)[0];
      if (!nx) { el.innerHTML = ''; return; }
      var p = Math.min(100, Math.round(nx.cur / nx.goal * 100));
      el.innerHTML = '<button type="button" class="bdg-dn-prog" data-bdg-all="1">' + svg(nx) +
        '<span><b>다음 배지 · ' + esc(nx.title) + '</b><small>' + esc(leftText(nx)) + ' · ' + num(nx.cur) + ' / ' + num(nx.goal) + esc(nx.unit || '') + '</small>' +
        '<i><u style="width:' + p + '%"></u></i></span></button>';
    }).catch(function () { el.innerHTML = ''; });
  }

  // 처음 한 번 배지 소개 (계정마다 한 번, 낭만리포트를 열 때)
  function intro(userId) {
    if (!userId) return;
    whenReady(function () { introNow(userId); });
  }
  function introNow(userId) {
    var key = 'okbm_badge_intro_v1:' + userId;
    if (document.getElementById('okbmBadgePop')) return false; // 새 배지 창이 떠 있으면 다음에
    var seenHere = false;
    try { seenHere = !!localStorage.getItem(key); } catch (e) { return false; }
    if (readState(userId).intro || seenHere) {
      writeState(userId, { intro: true }); // 이 기기에서만 봤던 기록도 계정에 올린다
      return false;
    }
    try { localStorage.setItem(key, '1'); } catch (e) { return false; }
    writeState(userId, { intro: true });
    ensureCss();
    var got = LIST.filter(function (b) { return b.got; });
    var RANK = { r: 5, g: 4, s: 3, b: 2, i: 1 };
    var pick = got.slice().sort(function (a, b) { return (RANK[b.metal] || 0) - (RANK[a.metal] || 0); });
    // 묶음마다 하나씩, 모자라면 못 받은 배지로 채운다
    var shown = [], groups = {};
    pick.concat(LIST.filter(function (b) { return !b.got; })).forEach(function (b) {
      if (shown.length < 4 && !groups[b.group]) { groups[b.group] = 1; shown.push(b); }
    });
    var el = document.createElement('div');
    el.id = 'okbmBadgePop';
    el.className = 'bdg-pop';
    el.innerHTML = '<div class="bdg-box bdg-intro" role="dialog" aria-modal="true" aria-label="배지 소개">' +
      '<h2 style="margin-top:0">낭만리포트에 배지가 생겼어요</h2>' +
      '<p class="lead">다녀온 백패킹을 공개 피드로 남기면<br>쌓인 기록만큼 배지를 받아요.</p>' +
      '<div class="irow">' + shown.map(function (b) { return '<div>' + svg(b) + '<span>' + esc(b.ko) + '</span></div>'; }).join('') + '</div>' +
      '<ul><li><b>기록</b><span>공개 피드 1 · 5 · 10 · 20 … 100회</span></li><li><b>누적 높이</b><span>다녀온 박지 높이를 더해 에베레스트만큼</span></li><li><b>포토맵</b><span>시·군을 채우고, 도를 클리어하면</span></li></ul>' +
      (got.length ? '<p class="have">이미 다녀온 기록으로 받은 배지가 <b>' + got.length + '개</b> 있어요.</p>' : '') +
      '<div class="btns one"><button type="button" class="s" data-bdg-intro="all">내 배지 보기</button></div>' +
      '<button type="button" class="bdg-x" data-bdg-ok="1" aria-label="닫기">✕</button>' +
      '</div>';
    document.body.appendChild(el);
    metric('feat_badge_intro');
    return true;
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var x;
    if ((x = t.closest('[data-bdg-intro]'))) { var ip = document.getElementById('okbmBadgePop'); if (ip) ip.remove(); openAll(); return; }
    if ((x = t.closest('[data-bdg-all]'))) { e.preventDefault(); openAll(); return; }
    if ((x = t.closest('[data-bdg-close]'))) { var a = document.getElementById('okbmBadgeAll'); if (a) a.remove(); return; }
    if ((x = t.closest('[data-bdg-equip]')) || (x = t.closest('[data-bdg-unequip]'))) {
      var eb = x.hasAttribute('data-bdg-equip') ? find(x.getAttribute('data-bdg-equip')) : null;
      if (!window.okbmBadgeRing || (x.hasAttribute('data-bdg-equip') && !eb)) return;
      metric(eb ? 'feat_badge_equip' : 'feat_badge_unequip');
      x.disabled = true;
      window.okbmBadgeRing.equip(eb ? ringKey(eb) : '').then(function () {
        if (typeof window.showToast === 'function') window.showToast(eb ? eb.ko + ' 배지를 장착했어요' : '배지 장착을 풀었어요', 'success', 1800);
        refreshMarks();
        if (eb) showPop(eb, false); else { var pp = document.getElementById('okbmBadgePop'); if (pp) pp.remove(); }
      }).catch(function (err) {
        x.disabled = false;
        console.warn('[my-badges:equip]', err);
        if (typeof window.showToast === 'function') window.showToast('장착하지 못했어요. 잠시 뒤 다시 해 주세요.', 'warn', 2200);
      });
      return;
    }
    if ((x = t.closest('[data-bdg-save]'))) { var bs = find(x.getAttribute('data-bdg-save')); if (bs) saveImage(bs); return; }
    if ((x = t.closest('[data-bdg-ok]')) || t.id === 'okbmBadgePop') { var p = document.getElementById('okbmBadgePop'); if (p) p.remove(); nextInQueue(); return; }
    if ((x = t.closest('[data-bdg]'))) { var b = find(x.getAttribute('data-bdg')); if (b) { metric('feat_badge_open'); showPop(b, false); } }
  });

  window.okbmBadges = {
    // own: 내 배지면 true(장착 버튼을 보인다). 남의 프로필 발자취는 안 넘긴다
    set: function (list, own) { LIST = Array.isArray(list) ? list : []; OWN = own === true; },
    card: card,
    openAll: openAll,
    checkNew: checkNew,
    done: done,
    intro: intro,
    svg: svg,
    // 도 모양 경로(badge-ring.js 도 클리어 칩이 쓴다)
    sil: function (ko) { return SIL[ko] || ''; }
  };
})();
