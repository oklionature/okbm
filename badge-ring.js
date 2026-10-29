// =========================================================================
// 장착 배지 사진 링 + 플로깅 피드 테두리 (2026-10-29, SUPABASE_H20_EQUIPPED_BADGE.sql)
//
// · 받은 배지 중 하나를 장착하면(my-badges.js 배지 창) 프로필 사진 둘레에 링이 둘러진다. 장착 안 하면 지금 그대로.
//   링 무늬·모양 = 배지 종류(무엇을 했나), 띠 재질 = 단계(얼마나 했나: 철·동·은·금·무지개).
//   플로깅은 금속 띠 가운데 초록 줄 + 오른쪽 위 잎 가지 하나로 구분한다(잎 화환은 과해서 뺐다).
// · 값은 '종류:단계:배지id'(users.equipped_badge). 남의 것은 피드를 그릴 때 이미 받는 get_public_profiles의 badge로 안다.
//   (그 함수는 로그인한 사람에게만 돌아서, 로그인 안 한 사람에게는 링이 안 보인다)
// · 사진 자리(img[data-user-avatar-id], img[data-user-avatar-small])를 찾아 그 동그라미 위에 링 그림을 얹는다.
//   화면마다 따로 고치지 않아도 사진이 나오는 곳에 다 붙는다. 움직임은 없다.
// · 플로깅 피드 테두리(낭만피드 릴스 틀·정보창 카드)의 공용 CSS도 여기 둔다.
// 인라인 onclick 없음(CSP).
// =========================================================================
(function () {
  'use strict';
  if (window.okbmBadgeRing) return;

  var CATS = ['trips', 'plog', 'ever', 'reg', 'do', 'spot', 'season', 'island'];
  var TIERS = ['i', 'b', 's', 'g', 'r'];
  // [어두운, 밝은, 중간]
  var METAL = { i: ['#24272b', '#b9c0c8', '#4d5259'], b: ['#6b3a17', '#f2b27a', '#b06a35'], s: ['#7d838c', '#ffffff', '#b4bac2'], g: ['#7d5c0c', '#ffe58f', '#c79b22'] };
  var FILL = { trips: '#24473a', plog: '#0f4a36', ever: '#2a323d', reg: '#5a4120', do: '#1b2f4d', spot: '#5e2a22', season: '#2d4466', island: '#16545b' };
  var ICON = {
    trips: '<path d="M33 52 L50 26 L67 52 Z M50 26 V52 M45 52 L50 43 L55 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    plog: '<path d="M38.5 34h23l3.6 19.5a3 3 0 0 1-3 3.5H37.9a3 3 0 0 1-3-3.5z M43.5 34c-1.8-3.6-.8-8 2.8-10 M56.5 34c1.8-3.6.8-8-2.8-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M43.5 45.5l4.4 4.4 8.4-8.9" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
    ever: '<path d="M28 54 L44 32 L51 41 L60 28 L74 54 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    reg: '<path d="M50 24c-8 0-14 6-14 13.5C36 48 50 56 50 56s14-8 14-18.5C64 30 58 24 50 24z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="37.5" r="4.5" fill="currentColor"/>',
    do: '<path d="M50 24 L64 29 V40 C64 49 57 54 50 57 C43 54 36 49 36 40 V29 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M44 41 L48.5 45.5 L57 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    spot: '<path d="M40 56 V26 M40 27 C48 23 54 31 62 27 V41 C54 45 48 37 40 41" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    season: '<circle cx="50" cy="40" r="14" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 26 V54 M36 40 H64" stroke="currentColor" stroke-width="2.2"/>',
    island: '<path d="M30 52 Q40 46 50 52 T70 52" fill="none" stroke="currentColor" stroke-width="3"/><path d="M42 47 Q50 36 58 47" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 42 V28 M50 29 Q43 26 40 31 M50 29 Q57 26 60 31" fill="none" stroke="currentColor" stroke-width="2.6"/>'
  };
  var R = 45.5, PHOTO_R = 40.5, uid = 0;
  // 그림 판: 가로 -6~126, 세로 -10~126. 사진 동그라미는 중심 (60,60) 반지름 40.5
  var VB = { x: -6, y: -10, w: 132, h: 136 };

  function pt(r, deg) { var a = (deg - 90) * Math.PI / 180; return [60 + r * Math.cos(a), 60 + r * Math.sin(a)]; }
  function f(v) { return v.toFixed(2); }
  function arc(r, a0, a1) { var p0 = pt(r, a0), p1 = pt(r, a1); return 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + f(p1[0]) + ' ' + f(p1[1]); }
  function line(r0, a0, r1, a1, col, w, op) { var p = pt(r0, a0), q = pt(r1, a1); return '<line x1="' + f(p[0]) + '" y1="' + f(p[1]) + '" x2="' + f(q[0]) + '" y2="' + f(q[1]) + '" stroke="' + col + '" stroke-width="' + w + '"' + (op ? ' stroke-opacity="' + op + '"' : '') + ' stroke-linecap="round"/>'; }
  function dot(r, a, rad, fill, stroke) { var p = pt(r, a); return '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + rad + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width=".9"' : '') + '/>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function parse(v) {
    var m = String(v || '').match(/^([a-z]+):([ibsgr]):([A-Za-z0-9]{1,24})$/);
    if (!m || CATS.indexOf(m[1]) < 0 || TIERS.indexOf(m[2]) < 0) return null;
    return { cat: m[1], tier: m[2], id: m[3], key: m[0] };
  }

  // 링 그림(사진 없음). photoUrl을 주면 사진까지 넣은 그림(배지 창 미리보기용)
  // 플로깅 링 장식: sprig(오른쪽 위 잎 가지 하나, 기본) · wreath(잎 화환, 처음 것) · pair(메달 양옆 새싹 두 장) · stripe(초록 줄만)
  var PLOG_STYLE = 'sprig'; // 2026-10-29 대표님: 잎 화환은 과해서 잎 가지 하나로
  function ringSvg(badge, photoUrl, opts) {
    var b = typeof badge === 'string' ? parse(badge) : badge;
    if (!b) return '';
    var id = 'okbmRing' + (++uid), cat = b.cat, tier = b.tier, rainbow = tier === 'r', m = METAL[rainbow ? 'g' : tier];
    var s = '<svg viewBox="' + VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    s += '<defs><clipPath id="' + id + 'c"><circle cx="60" cy="60" r="' + PHOTO_R + '"/></clipPath>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[1] + '"/><stop offset=".42" stop-color="' + m[2] + '"/><stop offset=".58" stop-color="' + m[0] + '"/><stop offset="1" stop-color="' + m[2] + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" y1="0" x2="1" y2="1">' + ['#ff5e7a', '#ffb347', '#ffe66d', '#7ee081', '#5ec8ff', '#8f7bff', '#ff7ad9'].map(function (c, i) { return '<stop offset="' + (i / 6).toFixed(2) + '" stop-color="' + c + '"/>'; }).join('') + '</linearGradient>' +
      '<linearGradient id="' + id + 'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bbf7d0"/><stop offset=".5" stop-color="#34d399"/><stop offset="1" stop-color="#047857"/></linearGradient>' +
      '<radialGradient id="' + id + 'g1"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#7dd3fc"/><stop offset="1" stop-color="#1d4ed8"/></radialGradient>' +
      '<radialGradient id="' + id + 'g2"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fda4af"/><stop offset="1" stop-color="#be123c"/></radialGradient>' +
      '<radialGradient id="' + id + 'g3"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#6ee7b7"/><stop offset="1" stop-color="#047857"/></radialGradient>' +
    '</defs>';
    var band = rainbow ? 'url(#' + id + 'r)' : 'url(#' + id + 'm)';

    // 띠 바깥으로 나오는 모양 (띠 뒤)
    var plogStyle = (opts && opts.plog) || PLOG_STYLE;
    if (cat === 'plog') {
      var leaf = function (r, a, tilt, rx, ry) {
        var c = pt(r, a), rot = a - 90 + tilt;
        var tip = [c[0] + (rx - 1.5) * Math.cos(rot * Math.PI / 180), c[1] + (rx - 1.5) * Math.sin(rot * Math.PI / 180)];
        return '<ellipse cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + f(rot) + ' ' + f(c[0]) + ' ' + f(c[1]) + ')" fill="url(#' + id + 'l)" stroke="#063d2a" stroke-width=".9"/>' +
          '<line x1="' + f(c[0]) + '" y1="' + f(c[1]) + '" x2="' + f(tip[0]) + '" y2="' + f(tip[1]) + '" stroke="#063d2a" stroke-opacity=".55" stroke-width=".6"/>';
      };
      if (plogStyle === 'wreath') {
        // 초록 잎 화환: 아래 메달에서 시작해 양쪽으로 올라가 위에서 만난다
        for (var la = 158; la >= 14; la -= 16) s += leaf(53.2, la, 52, 6.2, 2.7);
        for (var lb = 202; lb <= 346; lb += 16) s += leaf(53.2, lb, 128, 6.2, 2.7);
        s += '<circle cx="60" cy="1.5" r="3.6" fill="url(#' + id + 'g3)" stroke="#063d2a" stroke-width="1"/>';
      } else if (plogStyle === 'sprig') {
        // 오른쪽 위에 잎 달린 가지 하나
        s += '<path d="' + arc(52, 22, 68) + '" fill="none" stroke="#065f46" stroke-width="1.6" stroke-linecap="round"/>' +
          leaf(56.5, 30, 20, 6.4, 2.9) + leaf(56.5, 46, 20, 6.4, 2.9) + leaf(49.8, 38, 160, 5.2, 2.5) + leaf(56.5, 62, 20, 5.4, 2.6);
      } else if (plogStyle === 'pair') {
        // 아래 메달에서 양옆으로 돋은 새싹 두 장
        s += leaf(55, 156, 70, 7.6, 3.3) + leaf(55, 204, 110, 7.6, 3.3);
      }
    }
    if (cat === 'ever') {
      s += '<path d="M31 24 L42 3 L50 14 L60 -7 L70 14 L78 3 L89 24 Z" fill="' + band + '" stroke="#0b0b0d" stroke-width="1.3" stroke-linejoin="round"/>' +
        '<path d="M55.6 2 L60 -7 L64.4 2 L62 1 L60 3.5 L58 1Z M39.6 8 L42 3 L44.6 8 L42 7Z M75.4 8 L78 3 L80.6 8 L78 7Z" fill="#fff"/>';
    }
    if (cat === 'island') {
      var w = '';
      for (var k = 0; k < 20; k++) { var a0 = k * 18, p0 = pt(49, a0), pm = pt(59, a0 + 9), p1 = pt(49, a0 + 18); w += (k ? ' Q' : 'M' + f(p0[0]) + ' ' + f(p0[1]) + ' Q') + f(pm[0]) + ' ' + f(pm[1]) + ' ' + f(p1[0]) + ' ' + f(p1[1]); }
      s += '<path d="' + w + 'Z" fill="' + band + '" stroke="#0b0b0d" stroke-width="1.2"/>';
      for (var k2 = 0; k2 < 20; k2++) s += '<path d="' + arc(53.5, k2 * 18 + 4, k2 * 18 + 14) + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" stroke-linecap="round"/>';
    }
    if (cat === 'spot') {
      var fp = pt(49, 40), ft = pt(68, 40);
      s += '<line x1="' + f(fp[0]) + '" y1="' + f(fp[1]) + '" x2="' + f(ft[0]) + '" y2="' + f(ft[1]) + '" stroke="#0b0b0d" stroke-width="4.6" stroke-linecap="round"/>' +
        '<line x1="' + f(fp[0]) + '" y1="' + f(fp[1]) + '" x2="' + f(ft[0]) + '" y2="' + f(ft[1]) + '" stroke="' + band + '" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M' + f(ft[0]) + ' ' + f(ft[1]) + ' l15 5 l-12 8 z" fill="#ef4444" stroke="#0b0b0d" stroke-width="1.2" stroke-linejoin="round"/>';
    }
    if (cat === 'reg') s += '<path d="M60 -4 L66 10 L60 7 L54 10 Z" fill="#ef4444" stroke="#0b0b0d" stroke-width="1.2" stroke-linejoin="round"/>';

    if (photoUrl) s += '<image href="' + esc(photoUrl) + '" x="19.5" y="19.5" width="81" height="81" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + 'c)"/>';

    // 띠
    s += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#0b0b0d" stroke-width="11"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="' + band + '" stroke-width="9"/>';
    // 재질 (단계)
    if (tier === 'i') for (var a = 0; a < 360; a += 22.5) s += '<path d="' + arc(R, a + 1, a + 11) + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="9"/>';
    if (tier === 'b') {
      s += '<circle cx="60" cy="60" r="42.6" fill="none" stroke="#3d1f0a" stroke-opacity=".7" stroke-width=".9"/><circle cx="60" cy="60" r="48.4" fill="none" stroke="#3d1f0a" stroke-opacity=".7" stroke-width=".9"/>';
      [[28, 2.2], [150, 1.8], [205, 2.6], [320, 1.6], [250, 1.4]].forEach(function (p) { s += dot(R + (p[0] % 3 - 1), p[0], p[1], '#4fb39a', null); });
    }
    // 무늬 (종류)
    if (cat === 'trips') for (var t = 0; t < 360; t += 7.5) s += line(41.5, t, 49.5, t + 6, '#0b0b0d', 1.4, 0.5) + line(41.8, t + 1.2, 49.2, t + 7, '#fff', 0.8, 0.35);
    if (cat === 'plog') {
      // 띠 가운데 초록 줄 (금속 띠 안에서도 플로깅인 게 보이게)
      s += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#063d2a" stroke-width="3.6"/><circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#34d399" stroke-width="2.2"/>';
    }
    if (cat === 'ever') for (var t2 = 0; t2 < 360; t2 += 10) { var big = t2 % 30 === 0; s += line(big ? 46 : 47.6, t2, 49.6, t2, '#0b0b0d', big ? 1.3 : 0.9, 0.75); }
    if (cat === 'reg') for (var t3 = 0; t3 < 360; t3 += 15) { var card = t3 % 90 === 0; s += line(card ? 41.5 : 46.5, t3, 49.6, t3, '#0b0b0d', card ? 1.8 : 1, 0.8); }
    if (cat === 'do') for (var t4 = 0; t4 < 360; t4 += 40) s += line(40.5, t4 + 20, 50.5, t4 + 20, '#0b0b0d', 2.2);
    if (cat === 'spot') s += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="#0b0b0d" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray=".1 4.2" stroke-linecap="round"/>';
    if (cat === 'season') {
      [['#f9a8d4', 0], ['#4ade80', 90], ['#fb923c', 180], ['#bae6fd', 270]].forEach(function (q) {
        s += '<path d="' + arc(R, q[1] + 5, q[1] + 85) + '" fill="none" stroke="#0b0b0d" stroke-width="6.4" stroke-linecap="round"/>' +
          '<path d="' + arc(R, q[1] + 5, q[1] + 85) + '" fill="none" stroke="' + q[0] + '" stroke-width="4.6" stroke-linecap="round"/>';
      });
    }
    // 위쪽 반사광 / 아래쪽 그늘
    s += '<path d="' + arc(48.6, 285, 355) + '" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="' + arc(42.4, 105, 175) + '" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1.4" stroke-linecap="round"/>';
    // 리벳(철) / 옆 장식(은) / 보석(금 이상) / 별(무지개)
    if (tier === 'i') [45, 135, 225, 315].forEach(function (d) { var p = pt(R, d); s += dot(R, d, 2.6, '#9aa1a9', '#0b0b0d') + '<circle cx="' + f(p[0] - 0.8) + '" cy="' + f(p[1] - 0.8) + '" r="1" fill="#fff"/>'; });
    if (tier === 's') [90, 270].forEach(function (d) { s += dot(R, d, 3.4, '#ffffff', '#0b0b0d'); });
    if (tier === 'g' || rainbow) s += dot(R, 90, 4.4, 'url(#' + id + 'g1)', '#0b0b0d') + dot(R, 270, 4.4, 'url(#' + id + 'g2)', '#0b0b0d');
    if (rainbow) [[-40, 60, 3.8], [38, 62, 5], [-24, 64, 2.8]].forEach(function (q) {
      var c = pt(q[1], q[0]), r = q[2];
      s += '<path d="M' + f(c[0]) + ' ' + f(c[1] - r) + ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[0] + r) + ' ' + f(c[1]) + ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[0]) + ' ' + f(c[1] + r) + ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[0] - r) + ' ' + f(c[1]) + ' Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(c[0]) + ' ' + f(c[1] - r) + 'Z" fill="#fff"/>';
    });
    // 아래 메달
    s += '<circle cx="60" cy="106" r="13" fill="#0b0b0d"/><circle cx="60" cy="106" r="12" fill="' + band + '"/><circle cx="60" cy="106" r="9" fill="' + FILL[cat] + '"/>' +
      '<g transform="translate(60 106) scale(.31) translate(-51 -40)" style="color:#f4efe2">' + ICON[cat] + '</g>';
    return s + '</svg>';
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
    '.okbm-plog-frame{position:absolute;inset:0;border:3px solid #34d399;border-radius:18px;pointer-events:none;z-index:399;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}',
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
      var gap = Math.round(w * 0.24) + 'px';
      holder.style.marginLeft = gap; holder.style.marginRight = gap;
    }
    // 프로필처럼 큰 사진은 아래 메달·위 장식이 밑의 소개글·위 글자를 가리지 않게 위아래도 띄운다
    if (w >= 56) {
      holder.style.marginTop = Math.round(w * (b.cat === 'ever' || b.cat === 'plog' || b.cat === 'reg' ? 0.26 : 0.14)) + 'px';
      holder.style.marginBottom = Math.round(w * 0.26) + 'px';
    }
    var el = document.createElement('span');
    el.className = 'okbm-ring';
    el.innerHTML = ringSvg(b);
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
      if (u && u !== me && u !== 'guest' && !ASKED[u] && !(cache[u] && 'badge' in cache[u]) && missing.indexOf(u) < 0) missing.push(u);
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

  window.okbmBadgeRing = { setPlogStyle: function (v) { PLOG_STYLE = v; }, parse: parse, svg: ringSvg, badgeOf: badgeOf, mine: readMine, equip: equip, syncMine: syncMine, paint: paint };
})();
