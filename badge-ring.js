// =========================================================================
// 장착 배지 사진 링 + 플로깅 피드 테두리 (2026-10-29, SUPABASE_H20_EQUIPPED_BADGE.sql)
//
// · 받은 배지 중 하나를 장착하면(my-badges.js 배지 창) 프로필 사진 둘레에 링이 둘러진다. 장착 안 하면 지금 그대로.
//   얇은 링 색 = 단계(얼마나 했나: 철·동·은·금·무지개), 오른쪽 아래 작은 칩 = 종류(무엇을 했나: 텐트·잎·산·지도·도 모양·깃발·사계절·섬).
//   예전엔 금속 띠·리벳·보석·메달·바깥 장식을 다 얹어 게임 테두리처럼 보였다(10-29 대표님: 촌스럽다). 사진이 주인공이 되게 장식을 걷었다.
//   인스타 스토리 링처럼 색이 이어지고, 빛줄기가 지나가며 별이 깜빡인다(단계가 오를수록 별이 많다). 움직임 줄이기 설정이면 멈춘다.
// · 값은 '종류:단계:배지id'(users.equipped_badge). 남의 것은 피드를 그릴 때 이미 받는 get_public_profiles의 badge로 안다.
//   (그 함수는 로그인한 사람에게만 돌아서, 로그인 안 한 사람에게는 링이 안 보인다)
// · 사진 자리(img[data-user-avatar-id], img[data-user-avatar-small])를 찾아 그 동그라미 위에 링 그림을 얹는다.
//   화면마다 따로 고치지 않아도 사진이 나오는 곳에 다 붙는다.
// · 플로깅 피드 테두리(낭만피드 릴스 틀·정보창 카드)의 공용 CSS도 여기 둔다.
// 인라인 onclick 없음(CSP).
// =========================================================================
(function () {
  'use strict';
  if (window.okbmBadgeRing) return;

  var CATS = ['trips', 'plog', 'ever', 'reg', 'do', 'spot', 'season', 'island'];
  var TIERS = ['i', 'b', 's', 'g', 'r'];
  // 링 색 띠(인스타 스토리 링처럼 왼쪽 아래 → 오른쪽 위로 이어진다). [어두운 끝, 중간, 밝은 가운데, 오른쪽 위 끝]
  var BAND = { i: ['#5d636a', '#9aa1a9', '#e3e7ec', '#c7ccd2'], b: ['#b8622b', '#f0a066', '#ffd9b3', '#ffc28f'], s: ['#9fb0c3', '#e3e9f0', '#ffffff', '#f6f9fc'], g: ['#f2a20c', '#ffd84a', '#fff6c2', '#ffe680'] };
  // 무지개(백패킹 100회 등)는 인스타 그라데이션 색
  var RAINBOW = ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'];
  // 반짝이 별 [각도, 반지름, 크기, 시작 초]와 밝기. 단계가 오를수록 늘어난다(철 1 · 동 1 · 은 2 · 금 3 · 무지개 4)
  var SPARK = {
    i: [[[318, 50, 5.2, 0]], 0.7], b: [[[318, 50, 5.8, 0]], 0.9],
    s: [[[318, 50, 6.6, 0], [62, 49, 4.6, 1.1]], 1],
    g: [[[318, 50, 7.4, 0], [62, 49, 5.2, 0.9], [250, 49.5, 4.2, 1.8]], 1],
    r: [[[318, 50, 7.8, 0], [62, 49, 5.6, 0.7], [250, 49.5, 4.4, 1.4], [22, 50, 3.8, 2.1]], 1]
  };
  var CR = '#fff6e4';
  // 종류 칩: 바탕 [밝은, 어두운] + 그림(가운데 0,0, 대략 -11~11). c는 바탕의 어두운 색
  var KIND = {
    // 1인용 알파인 돔(3/4 시점), 머스타드: 엇갈린 검은 폴, 검은 바닥 띠, 걷어 만 문 안의 메시, 위쪽 벤트
    trips: { bg: ['#3f8a5c', '#1d4f33'], ic: function (c, id) {
      return '<defs><linearGradient id="' + id + 't" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f7c95a"/><stop offset="1" stop-color="#cf9622"/></linearGradient></defs>' +
        '<ellipse cx=".6" cy="6.4" rx="11" ry="1.3" fill="#000" opacity=".35"/>' +
        '<path d="M-2.2 -7.2 C2.6 -8.4 7.8 -5 10.4 2.6 L-6.4 5.2 C-5 .6 -3.8 -3.6 -2.2 -7.2Z" fill="url(#' + id + 't)"/>' +
        '<path d="M-9.8 3.6 C-8.8 -1.4 -6 -5.6 -2.2 -7.2 C-3.8 -3.6 -5 .6 -6.4 5.2 Z" fill="#b07d17"/>' +
        '<path d="M-8.7 2.8 C-7.8 -1 -5.8 -4 -3.3 -5.4 C-4.4 -2.4 -5.3 .6 -6.3 3.9 Z" fill="#d7dbde"/>' +
        '<path d="M-8.7 2.8 C-8.2 .8 -7.4 -.8 -6.6 -1.8 C-6.2 .2 -6.2 2 -6.3 3.9Z" fill="#aeb4b9"/>' +
        '<path d="M-9.2 3.2 L-6.6 4.4" stroke="#b07d17" stroke-width="1.5" stroke-linecap="round"/><path d="M-8.4 3.2 l.3 .9 M-7.1 3.8 l.3 .9" stroke="#222" stroke-width=".4"/>' +
        '<path d="M-9.8 3.6 L-6.4 5.2 L10.4 2.6 L10.8 3.6 L-6.6 6.6 L-10.3 4.6 Z" fill="#26282b"/>' +
        '<path d="M-.6 -6 L1.6 -6.5 L.7 -5.3Z M4.4 -5.9 L6.4 -5.8 L5.2 -4.9Z" fill="#000" opacity=".35"/>' +
        '<path d="M-.6 -7.2 C3 -7.6 6.4 -5.4 8.4 -2" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7" stroke-linecap="round"/>' +
        '<path d="M-10.4 4.4 C-8.6 -2 -5.2 -7.4 -.4 -7.8 C4.4 -8.2 8.6 -4.4 10.9 3.4" fill="none" stroke="#1d1f22" stroke-width=".8" stroke-linecap="round"/>' +
        '<path d="M-6.6 6.4 C-5.2 .6 -3.8 -3.8 -2 -7.4" fill="none" stroke="#1d1f22" stroke-width=".8" stroke-linecap="round"/>';
    } },
    // 눈 덮인 두 봉우리 + 정상 깃발
    ever: { bg: ['#566a8c', '#252f42'], ic: function () {
      return '<path d="M-10 6 L-4.6 -1.6 L-2 1 L2.8 -6.2 L10 6 Z" fill="#c9d5e6"/>' +
        '<path d="M2.8 -6.2 L10 6 L4.4 6 L5 -.4 Z M-4.6 -1.6 L-2 1 L-3.6 6 L-5.2 2Z" fill="#000" opacity=".22"/>' +
        '<path d="M2.8 -6.2 L5.4 -2 L4.2 -2.6 L3.2 -1.2 L2 -2.6 L.6 -1.6 L.4 -2.6 Z M-4.6 -1.6 L-3.4 -.4 L-4.2 -.6 L-5 .3 L-5.6 -.4Z" fill="#fff"/>' +
        '<path d="M2.8 -6.2 V-10.4" stroke="' + CR + '" stroke-width=".8" stroke-linecap="round"/><path d="M3 -10.4 L6.8 -9.2 L3 -8 Z" fill="#ff6b57"/>';
    } },
    // 소나무 선 섬 + 물결
    island: { bg: ['#22a3a6', '#0b4f5e'], ic: function () {
      return '<path d="M-7.6 3.4 C-5.6 -1.2 -1.8 -2.8 1.2 -2.6 C4.4 -2.4 6.8 .2 7.6 3.4 Z" fill="' + CR + '"/>' +
        '<path d="M1.2 -2.6 C4.4 -2.4 6.8 .2 7.6 3.4 L4 3.4 C3.8 .8 2.8 -1.4 1.2 -2.6Z" fill="#000" opacity=".16"/>' +
        '<path d="M0 -10.4 L2.6 -5.8 L1.4 -5.9 L3.4 -2.6 L-3.4 -2.6 L-1.4 -5.9 L-2.6 -5.8 Z" fill="#8fe0a4"/>' +
        '<path d="M-10.6 6.4 Q-8 4.2 -5.3 6.4 T0 6.4 T5.3 6.4 T10.6 6.4" fill="none" stroke="' + CR + '" stroke-width="1.4" stroke-linecap="round"/>';
    } },
    // 잎맥 있는 잎
    plog: { bg: ['#21b07a', '#0b5a3c'], ic: function (c) {
      return '<path d="M-6.4 6.6 C-7.6 -2 -1.6 -8.6 7.6 -8.8 C8.6 .4 2.4 6.8 -6.4 6.6 Z" fill="' + CR + '"/>' +
        '<path d="M-7.6 8.6 C-5 4 -1 -.6 5.6 -6.6" fill="none" stroke="' + c + '" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M-3 2.6 L-3.6 -1.6 M0 -.4 L-.2 -4.6 M2.8 -3.2 L3.2 -6.6 M-2.4 2.4 L1.6 3.6 M.6 -.2 L4.4 .2" stroke="' + c + '" stroke-width=".75" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M-7.6 8.6 C-8.2 9.6 -9 10 -9.8 10" stroke="' + CR + '" stroke-width="1.2" stroke-linecap="round"/>';
    } },
    // 폴라로이드 두 장: 뒤에 비스듬히 한 장, 앞 사진 안에 지도(바다·땅·길·점선 경로·빨간 핀). 다녀온 곳을 사진으로 채우는 포토맵
    reg: { bg: ['#c48a3a', '#6b4313'], ic: function (c, id) {
      var photo = function (inner) {
        return '<rect x="-7.6" y="-9" width="15.2" height="18" rx="1" fill="' + CR + '"/>' +
          '<rect x="-6.2" y="-7.6" width="12.4" height="11.6" fill="#2b2f33"/>' + (inner || '');
      };
      return '<g transform="scale(.84)"><g transform="translate(-2.2 .4) rotate(-14)" opacity=".85">' + photo() + '<rect x="-6.2" y="-7.6" width="12.4" height="11.6" fill="#000" opacity=".25"/></g>' +
        '<ellipse cx="1.8" cy="9.2" rx="7" ry="1" fill="#000" opacity=".3"/>' +
        '<g transform="translate(1.8 0) rotate(7)">' + photo(
          '<clipPath id="' + id + 'pm"><rect x="-6.2" y="-7.6" width="12.4" height="11.6"/></clipPath><g clip-path="url(#' + id + 'pm)">' +
          '<rect x="-6.2" y="-7.6" width="12.4" height="11.6" fill="#7cc4e4"/>' +
          '<path d="M-6.4 -7.8 H2.4 C1 -5.6 1.8 -3.8 3.6 -2.6 C5.4 -1.4 5.6 1 6.4 2 V4.2 H-6.4 Z" fill="#a8d8a0"/>' +
          '<path d="M-6.4 -3.4 C-3.6 -4 -1.6 -2.6 .6 -3.4 M-3.2 -7.8 C-3.4 -4.6 -2.2 -1 -3 4.2" fill="none" stroke="#fff6e4" stroke-width=".7" opacity=".85"/>' +
          '<path d="M-4.6 2.6 C-3 .4 -1 1.2 .2 -1.2 C.9 -2.6 1.6 -3.4 2.4 -4" fill="none" stroke="#e2392b" stroke-width=".8" stroke-dasharray="1.2 .9" stroke-linecap="round"/>' +
          '<g transform="translate(2.6 -3.6)"><path d="M0 0 C-.6 -1.2 -2.2 -2.4 -2.2 -4 A2.2 2.2 0 1 1 2.2 -4 C2.2 -2.4 .6 -1.2 0 0Z" fill="#ff5a47" stroke="#7a1a10" stroke-width=".35"/><circle cy="-4" r=".8" fill="#fff"/></g></g>') +
        '<path d="M-6.2 -7.6 H6.2" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/></g></g>';
    } },
    // 그 도의 실제 모양(my-badges.js SIL). 모양을 못 받으면 방패
    do: { bg: ['#4d6fe0', '#1d2f78'], ic: function (c, id, b) {
      var sil = doSil(b && b.id);
      return sil ? '<g transform="scale(.4) translate(-50 -41)"><path d="' + sil + '" fill="' + CR + '"/></g>'
        : '<path d="M0 -8 L7 -5.4 V0 C7 4.6 3.8 7 0 8.4 C-3.8 7 -7 4.6 -7 0 V-5.4 Z" fill="' + CR + '"/>';
    } },
    // 펄럭이는 깃발
    spot: { bg: ['#e0603f', '#7a1e10'], ic: function () {
      return '<path d="M-9 9 Q-4.8 5.6 -.6 9 Z" fill="' + CR + '" opacity=".55"/>' +
        '<path d="M-4.8 7.8 V-9" stroke="' + CR + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M-4.4 -8.6 C-1 -10.2 1.6 -6.8 5 -8 C6.2 -8.4 7.2 -8.4 8.2 -8.2 C7.4 -6 7.4 -3.8 8.2 -1.4 C6.8 -1.8 5.8 -1.8 5 -1.4 C1.6 -.2 -1 -3.6 -4.4 -2Z" fill="' + CR + '"/>';
    } },
    // 네 계절 꽃잎(봄 분홍 · 여름 초록 · 가을 주황 · 겨울 하늘)
    season: { bg: ['#3a4560', '#1a2030'], ic: function () {
      var cs = ['#ffb3cf', '#7fe08f', '#ff9a4a', '#bfe6ff'], s = '';
      for (var k = 0; k < 4; k++) s += '<path d="M0 -1 C-3 -3 -3.2 -7.6 0 -9.6 C3.2 -7.6 3 -3 0 -1Z" fill="' + cs[k] + '" transform="rotate(' + (45 + k * 90) + ')"/>';
      return s + '<circle r="1.8" fill="' + CR + '"/>';
    } }
  };
  // 도 클리어 배지 id(doJEONNAM 등) → 도 모양 경로
  var DO_KO = { GYEONGGI: '경기', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남', JEONBUK: '전북', JEONNAM: '전남', GYEONGBUK: '경북', GYEONGNAM: '경남', JEJU: '제주' };
  function doSil(id) {
    var ko = DO_KO[String(id || '').replace(/^do/, '')];
    var api = window.okbmBadges;
    return ko && api && typeof api.sil === 'function' ? api.sil(ko) : '';
  }
  // 움직임을 줄이라고 해 둔 기기에서는 빛줄기·반짝이를 멈춘다
  function still() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  // 그림 판: 가로 -6~126, 세로 -10~126. 사진 동그라미는 중심 (60,60) 반지름 40.5 (.okbm-ring 자리 CSS가 이 값에 맞춰져 있다)
  // 안쪽 그림은 0~100 판(사진 중심 50,50 반지름 43)으로 그려 이 판에 맞춰 줄인다
  var VB = { x: -6, y: -10, w: 132, h: 136 }, uid = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function parse(v) {
    var m = String(v || '').match(/^([a-z]+):([ibsgr]):([A-Za-z0-9]{1,24})$/);
    if (!m || CATS.indexOf(m[1]) < 0 || TIERS.indexOf(m[2]) < 0) return null;
    return { cat: m[1], tier: m[2], id: m[3], key: m[0] };
  }

  function star(x, y, r, op, begin, move) {
    var a = r * 0.22, d = 'M0 ' + (-r) + ' Q' + a + ' ' + (-a) + ' ' + r + ' 0 Q' + a + ' ' + a + ' 0 ' + r + ' Q' + (-a) + ' ' + a + ' ' + (-r) + ' 0 Q' + (-a) + ' ' + (-a) + ' 0 ' + (-r) + 'Z';
    return '<g transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"' + (move ? ' opacity="0"' : ' opacity="' + op + '"') + '>' +
      '<circle r="' + (r * 0.55) + '" fill="#fff8dc" opacity=".45"/><path d="' + d + '" fill="#fff"/>' +
      (move ? '<animate attributeName="opacity" values="0;' + op + ';0;0" keyTimes="0;.22;.5;1" dur="2.6s" begin="' + begin + 's" repeatCount="indefinite"/>' +
        '<animateTransform attributeName="transform" type="scale" additive="sum" values=".4;1;.4;.4" keyTimes="0;.22;.5;1" dur="2.6s" begin="' + begin + 's" repeatCount="indefinite"/>' : '') +
      '</g>';
  }

  // 링 그림(사진 없음). photoUrl을 주면 사진까지 넣은 그림(배지 창 미리보기용). opts.small: 작은 사진(피드 머리줄 등)이면 링·칩을 조금 굵게
  // 링 색 = 단계(철·동·은·금·무지개), 오른쪽 아래 칩 = 종류. 은·금처럼 반짝이게 빛줄기가 지나가고 별이 깜빡인다
  function ringSvg(badge, photoUrl, opts) {
    var b = typeof badge === 'string' ? parse(badge) : badge;
    if (!b) return '';
    var id = 'okbmRing' + (++uid), kind = KIND[b.cat], small = !!(opts && opts.small), move = !still();
    var W = small ? 5 : 3.8, CHIP = small ? 17 : 15;
    var band = b.tier === 'r'
      ? '<linearGradient id="' + id + 'm" x1="0" y1="1" x2="1" y2="0">' + RAINBOW.map(function (c, i) { return '<stop offset="' + (i / 4) + '" stop-color="' + c + '"/>'; }).join('') + '</linearGradient>'
      : (function (g) { return '<linearGradient id="' + id + 'm" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="' + g[0] + '"/><stop offset=".35" stop-color="' + g[1] + '"/><stop offset=".6" stop-color="' + g[2] + '"/><stop offset=".8" stop-color="' + g[1] + '"/><stop offset="1" stop-color="' + g[3] + '"/></linearGradient>'; })(BAND[b.tier]);
    // 빛줄기: 3.2초마다 왼쪽 위에서 오른쪽 아래로 한 번 지나간다
    var sheen = '<linearGradient id="' + id + 'sh" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="40" y2="40"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="' + (move ? '.85' : '0') + '"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>' +
      (move ? '<animateTransform attributeName="gradientTransform" type="translate" values="-50 -50;110 110;110 110" keyTimes="0;.45;1" dur="3.2s" repeatCount="indefinite"/>' : '') + '</linearGradient>';
    var defs = band + sheen +
      '<linearGradient id="' + id + 'hl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="' + id + 'b" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + kind.bg[0] + '"/><stop offset="1" stop-color="' + kind.bg[1] + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><circle cx="50" cy="50" r="43"/></clipPath>';
    var s = '<svg viewBox="' + VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>' + defs + '</defs>' +
      '<g transform="translate(60 60) scale(' + (40.5 / 43).toFixed(4) + ') translate(-50 -50)">';
    if (photoUrl) s += '<image href="' + esc(photoUrl) + '" x="7" y="7" width="86" height="86" clip-path="url(#' + id + 'c)" preserveAspectRatio="xMidYMid slice"/>';
    // 링: 색 띠 + 왼쪽 위 하이라이트 + 빛줄기
    s += '<circle cx="50" cy="50" r="48" fill="none" stroke="url(#' + id + 'm)" stroke-width="' + W + '"/>' +
      '<circle cx="50" cy="50" r="48" fill="none" stroke="url(#' + id + 'hl)" stroke-width="' + (W * 0.45) + '" transform="translate(-.6 -.6)"/>' +
      '<circle cx="50" cy="50" r="48" fill="none" stroke="url(#' + id + 'sh)" stroke-width="' + W + '"/>';
    // 오른쪽 아래 종류 칩: 바탕색 + 그림 + 위쪽 유리 광택 + 단계 색 테두리
    s += '<g transform="translate(83 83)"><circle r="' + (CHIP + 2.6) + '" fill="#000"/><circle r="' + CHIP + '" fill="url(#' + id + 'b)"/>' +
      '<g transform="scale(' + (CHIP / 12.4).toFixed(4) + ')">' + kind.ic(kind.bg[1], id, b) + '</g>' +
      '<circle r="' + (CHIP * 0.93) + '" fill="url(#' + id + 'gl)"/>' +
      '<circle r="' + CHIP + '" fill="none" stroke="url(#' + id + 'm)" stroke-width="' + (CHIP * 0.15) + '"/><circle r="' + CHIP + '" fill="none" stroke="url(#' + id + 'sh)" stroke-width="' + (CHIP * 0.15) + '"/></g>';
    // 반짝이 별
    var sp = SPARK[b.tier];
    sp[0].forEach(function (p) { var a = (p[0] - 90) * Math.PI / 180; s += star(50 + p[1] * Math.cos(a), 50 + p[1] * Math.sin(a), p[2], sp[1], p[3], move); });
    return s + '</g></svg>';
  }

  // ---------------------------------------------------------------- 누가 무엇을 장착했나
  function myId() {
    try { return String((typeof window.okbmGetCurrentUserId === 'function' && window.okbmGetCurrentUserId()) || '').trim(); } catch (e) { return ''; }
  }
  var MINE_KEY = 'okbm_equipped_badge:';
  function readMine() {
    var me = myId();
    if (!me) return '';
    try { return localStorage.getItem(MINE_KEY + me) || ''; } catch (e) { return ''; }
  }
  function writeMine(v) {
    var me = myId();
    if (!me) return;
    try { if (v) localStorage.setItem(MINE_KEY + me, v); else localStorage.removeItem(MINE_KEY + me); } catch (e) {}
    var cache = window.__okbmPublicProfileCache = window.__okbmPublicProfileCache || {};
    if (cache[me]) cache[me].badge = v || '';
  }
  function badgeOf(userId) {
    var u = String(userId || '').trim();
    if (!u) return '';
    var me = myId();
    var row = (window.__okbmPublicProfileCache || {})[u];
    if (u === me) {
      var local = readMine();
      if (row && typeof row.badge === 'string' && row.badge !== local) { writeMine(row.badge); return row.badge; }
      return local;
    }
    return row && typeof row.badge === 'string' ? row.badge : '';
  }

  // ---------------------------------------------------------------- 사진 위에 링 얹기
  var CSS = [
    // 사진 동그라미 밖으로 링이 나오게, 사진 자체를 동그랗게 자른다
    '.okbm-ringed{overflow:visible !important;border-color:transparent !important;box-shadow:none !important}',
    '.okbm-ringed>img,.okbm-ringed>div>img{border-radius:50%}',
    '.okbm-ringed>div{border-radius:50%;overflow:hidden}',
    '.okbm-ring{position:absolute;left:-31.48%;top:-36.42%;width:162.96%;height:167.9%;pointer-events:none;z-index:3}',
    '.okbm-ring>svg{display:block;width:100%;height:100%}',
    // 플로깅 피드 테두리
    // 앱은 화면이 상태바(시계 줄) 뒤까지 깔려 윗선이 가려진다: 머리줄처럼 상태바 높이만큼 내려 시작한다
    '.okbm-plog-frame{position:absolute;inset:0;top:var(--okbm-status-top, env(safe-area-inset-top, 0px));border:3px solid #34d399;border-radius:18px;pointer-events:none;z-index:399;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}',
    '.okbm-plog-chip{display:inline-flex;align-items:center;gap:3px;flex-shrink:0;padding:2px 8px 2px 6px;border-radius:999px;background:rgba(4,30,20,.82);border:1px solid rgba(52,211,153,.55);color:#a7f3d0;font-size:0.7rem;font-weight:800;line-height:1.2;text-shadow:none}',
    '.okbm-plog-chip svg{width:13px;height:13px;color:#34d399}',
    '.okbm-plog-rail{border:1.5px solid #34d399 !important}'
  ].join('');
  function ensureCss() {
    if (document.getElementById('okbmBadgeRingCss')) return;
    var st = document.createElement('style'); st.id = 'okbmBadgeRingCss'; st.textContent = CSS; document.head.appendChild(st);
  }

  // 사진을 감싼 동그라미 중 가장 바깥 것(안쪽 div가 꽉 차 있는 경우가 많다: 낭만피드 머리줄·프로필)
  function isCircle(el) {
    if (!el || el === document.body) return false;
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    return (cs.borderRadius.indexOf('50%') === 0 || parseFloat(cs.borderTopLeftRadius) >= r.width / 2 - 1) && r.width > 0 && Math.abs(r.width - r.height) < 2;
  }
  function holderOf(img) {
    var p = img.parentElement;
    if (!p) return null;
    for (var i = 0; i < 3; i++) {
      var up = p.parentElement;
      if (!up || !isCircle(up)) break;
      var a = p.getBoundingClientRect().width, b = up.getBoundingClientRect().width;
      if (b < a - 1 || b > a + 12) break;
      p = up;
    }
    return p;
  }
  function paintHolder(holder, userId) {
    var v = badgeOf(userId), b = parse(v);
    var cur = holder.getAttribute('data-okbm-ring') || '';
    if ((b ? b.key : '') === cur) return;
    var old = holder.querySelector(':scope > .okbm-ring');
    if (old) old.remove();
    if (!b) {
      holder.classList.remove('okbm-ringed');
      holder.removeAttribute('data-okbm-ring');
      holder.style.marginLeft = holder.style.marginRight = holder.style.marginTop = holder.style.marginBottom = '';
      return;
    }
    var w = holder.getBoundingClientRect().width || holder.offsetWidth || 0;
    // 아직 안 보이는 창(낭만리포트를 열기 전 등)이면 크기가 0이다. 보일 때 다시 칠한다
    if (w < 16) { retryLater(); return; }
    if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    holder.classList.add('okbm-ringed');
    holder.setAttribute('data-okbm-ring', b.key);
    // 링이 옆 글자에 닿지 않게, 가로로 늘어선 줄 안에서만 양옆을 조금 띄운다
    var par = holder.parentElement, pd = par ? getComputedStyle(par) : null;
    if (pd && /flex/.test(pd.display) && !/column/.test(pd.flexDirection)) {
      var gap = Math.round(w * 0.12) + 'px';
      holder.style.marginLeft = gap; holder.style.marginRight = gap;
    }
    // 프로필처럼 큰 사진은 반짝이 별·아래 칩이 위 글자·밑의 소개글에 닿지 않게 위아래도 조금 띄운다
    if (w >= 56) {
      holder.style.marginTop = Math.round(w * 0.1) + 'px';
      holder.style.marginBottom = Math.round(w * 0.1) + 'px';
    }
    var el = document.createElement('span');
    el.className = 'okbm-ring';
    el.innerHTML = ringSvg(b, '', { small: w < 56 });
    holder.appendChild(el);
  }
  // 사진은 피드에 따라온 주소로 바로 그려져 프로필을 따로 받지 않는 사람도 있다. 그런 사람만 모아 한 번에(50명씩) 받는다
  var ASKED = {};
  function askMissing(ids) {
    if (!ids.length || typeof window.okbmFetchPublicProfiles !== 'function') return;
    if (typeof window.isUserLoggedIn === 'function' && !window.isUserLoggedIn()) return;
    ids.forEach(function (u) { ASKED[u] = 1; });
    window.okbmFetchPublicProfiles(ids);
  }
  function paint(root) {
    ensureCss();
    var scope = root && root.querySelectorAll ? root : document;
    var imgs = scope.querySelectorAll('img[data-user-avatar-id], img[data-user-avatar-small]');
    var cache = window.__okbmPublicProfileCache || {}, me = myId(), missing = [];
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var u = img.getAttribute('data-user-avatar-id') || img.getAttribute('data-user-avatar-small') || '';
      var h = holderOf(img);
      if (h && u) paintHolder(h, u);
      // 내 것도 이 기기에 적어 둔 값이 없으면 서버에서 한 번 받는다. 로그아웃 뒤 청소·새 기기·앱 다시 설치로 기기 값이 지워지면
      // 서버엔 장착돼 있는데도 링이 사라져 '저절로 풀린' 것처럼 보였다(10-29 대표님).
      var need = u === me ? !readMine() : true;
      if (u && need && u !== 'guest' && !ASKED[u] && !(cache[u] && 'badge' in cache[u]) && missing.indexOf(u) < 0) missing.push(u);
    }
    askMissing(missing.slice(0, 50));
  }
  var retryTimer = 0, retries = 0;
  function retryLater() {
    if (retryTimer || retries > 20) return;
    retries++;
    retryTimer = setTimeout(function () { retryTimer = 0; paint(document); }, 400);
  }
  var timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { paint(document); }, 120); }

  // 공개 프로필을 받으면 다시 칠한다(링 값이 거기 들어 있다)
  function wrapFetchers() {
    ['okbmFetchPublicProfiles', 'okbmFetchPublicProfile'].forEach(function (name) {
      var orig = window[name];
      if (typeof orig !== 'function' || orig.__okbmRing) return;
      var wrapped = function () {
        var out = orig.apply(this, arguments);
        Promise.resolve(out).then(function (rows) {
          var cache = window.__okbmPublicProfileCache = window.__okbmPublicProfileCache || {};
          (Array.isArray(rows) ? rows : (rows ? [rows] : [])).forEach(function (r) { if (r && r.id) cache[String(r.id)] = Object.assign(cache[String(r.id)] || {}, r); });
          schedule();
        }, function () {});
        return out;
      };
      wrapped.__okbmRing = true;
      window[name] = wrapped;
    });
  }

  // ---------------------------------------------------------------- 장착·풀기
  function equip(value) {
    var v = value ? (parse(value) || {}).key || '' : '';
    if (value && !v) return Promise.reject(new Error('bad badge'));
    var c = window.supabaseClient;
    if (!c || typeof c.rpc !== 'function') return Promise.reject(new Error('no client'));
    return Promise.resolve(c.rpc('okbm_set_equipped_badge', { p_badge: v || null })).then(function (res) {
      if (res && res.error) throw res.error;
      writeMine(v);
      paint(document);
      return v;
    });
  }
  // 내 장착 값을 서버에서 한 번 맞춘다(다른 기기에서 바꾼 경우)
  function syncMine() {
    var me = myId();
    if (!me || typeof window.okbmFetchPublicProfile !== 'function') return Promise.resolve(readMine());
    return Promise.resolve(window.okbmFetchPublicProfile(me)).then(function (row) {
      if (row && typeof row.badge === 'string') writeMine(row.badge);
      return readMine();
    }).catch(function () { return readMine(); });
  }

  function start() {
    ensureCss();
    wrapFetchers();
    paint(document);
    // 탭·창을 열면 숨어 있던 사진이 보이게 된다. 누른 뒤 한 번 더 칠한다
    document.addEventListener('click', function () { retries = 0; setTimeout(schedule, 350); }, true);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var nodes = list[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType === 1 && (n.matches('img[data-user-avatar-id], img[data-user-avatar-small]') || n.querySelector('img[data-user-avatar-id], img[data-user-avatar-small]'))) { schedule(); return; }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  // 앞서 실린 파일이 늦게 함수를 만들 수도 있어 한 번 더 감싼다
  window.addEventListener('load', wrapFetchers, { once: true });

  window.okbmBadgeRing = { icon: function (cat, c, id) { var k = KIND[cat]; return k ? k.ic(c || k.bg[1], id || 'okbmIc' + (++uid), null) : ''; }, parse: parse, svg: ringSvg, badgeOf: badgeOf, mine: readMine, equip: equip, syncMine: syncMine, paint: paint };
})();
