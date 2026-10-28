// =========================================================================
// 낭만리포트 탭과 리포트 카드 (2026-10-28)
//
// 화면 뼈대는 romantic-sync.js(userProfileModalOverlay)에 있고, 여기서는
//   · 맨 위 쪽지·알림·설정 아이콘, 소개·SNS 편집, 숫자 한 줄, 탭(내 기록·저장·리포트) 누름을 받는다(data-mr-act / data-mr-tab).
//   · 내 기록: 서버의 내 피드를 연도별로 보여 준다. 예전 '올해 활동' 목록은 이 기기 기록만 보여 줘서
//     숫자(서버 17회)와 목록(1건)이 어긋났다.
//   · 리포트: 내 포토맵(박지가 있는 시·군 중 채운 곳), 클리어한 박지·받은 별·대표 사진·오른 고도,
//     다음 백패킹(낭만플랜), 달마다 다녀온 횟수. 그 아래 예전 지형·시즌·지역·장비 펼침 칸을 옮겨 둔다.
// 낭만리포트를 열 때 romantic-sync.js openUserProfileModal이 window.okbmMyReportOpened()를 부른다.
// 인라인 onclick을 쓰지 않는다(CSP 해시가 필요 없게).
// =========================================================================
(function () {
  'use strict';

  var R2_PUBLIC = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/';
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var PAGE = 4; // 내 기록은 처음 4개, '더 보기'를 누르면 전부

  var CSS = [
    '#userProfileModalOverlay{--mr-line:var(--line,rgba(255,255,255,.08));--mr-card:var(--bg-1,#0f0f11);--mr-tx2:var(--tx-2,#d1d1d6);--mr-tx3:var(--tx-3,#8b8b93);--mr-acc:var(--accent,#4c94f8)}',
    '.mr-icons{display:flex;gap:2px;margin-right:-8px}',
    '.mr-ib{position:relative;width:40px;height:40px;border:0;border-radius:12px;background:none;color:#f2f2f3;display:grid;place-items:center;cursor:pointer}',
    '.mr-ib:active{opacity:.6}',
    '.mr-ib svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.mr-badge{position:absolute;top:4px;right:3px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#e11d48;color:#fff;font-size:11px;font-weight:800;align-items:center;justify-content:center;box-shadow:0 0 0 2px #000;box-sizing:border-box}',
    // 프로필
    '.mr-prof-card{flex-shrink:0;padding:10px 16px 0;box-sizing:border-box}',
    '.mr-prof{display:flex;gap:18px;align-items:center}',
    '.mr-stats-slot{flex:1;min-width:0}',
    '.mr-av{flex:none;position:relative;width:80px;height:80px;border-radius:50%;padding:2px;background:rgba(255,255,255,.12);box-sizing:border-box;cursor:pointer}',
    '.mr-pinfo{margin-top:12px;display:flex;flex-direction:column;gap:3px}',
    '.mr-stats-slot .mr-nick{display:block;margin:0 0 10px;font-size:18px}',
    '.mr-nick{font-size:17px;font-weight:800;letter-spacing:-.02em;color:#f2f2f3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mr-bio{cursor:pointer}',
    '.mr-bio span{font-size:15px;line-height:1.5;word-break:keep-all;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.mr-sns{display:flex;align-items:center;gap:6px;margin-top:6px}',
    '.mr-sns:empty{display:none}',
    // SNS 고치기는 아래 'SNS 편집' 버튼 하나로: 배지 옆 연필은 숨긴다(renderUserSnsBadgesHtml가 붙인다)
    '.mr-sns button[onclick*="openSnsEditorModal"]{display:none!important}',
    '.mr-edit{margin-top:14px}',
    '.mr-edit button{width:100%;height:36px;border-radius:10px;border:1px solid var(--mr-line);background:var(--bg-2,#17171b);color:#f2f2f3;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}',
    '.mr-edit button:active,.mr-row:active,.mr-st:active,.mr-tr:active{opacity:.6}',
    // 숫자 한 줄
    '.mr-stats{flex-shrink:0;display:grid;grid-template-columns:repeat(3,1fr);margin:16px 16px 0;padding:12px 0;border-top:1px solid var(--mr-line);border-bottom:1px solid var(--mr-line)}',
    '.mr-st{background:none;border:0;color:#f2f2f3;font:inherit;padding:0;cursor:pointer;min-width:0}',
    '.mr-st+.mr-st{border-left:1px solid var(--mr-line)}',
    '.mr-stats-slot .mr-stats{margin:0;padding:0;border:0;text-align:left}',
    '.mr-stats-slot .mr-st{text-align:left}',
    '.mr-stats-slot .mr-st+.mr-st{border-left:0}',
    '.mr-stats-slot .mr-st b{font-size:19px}',
    '.mr-st b{display:block;font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
    '.mr-st small{display:block;margin-top:2px;font-size:12px;color:var(--mr-tx3);font-weight:600}',
    // 탭
    '.mr-tabs{position:sticky;top:0;z-index:5;flex-shrink:0;display:flex;background:#000;border-bottom:1px solid var(--mr-line);margin-top:8px}',
    '.mr-tab{flex:1;height:46px;background:none;border:0;color:var(--mr-tx3);font:inherit;font-size:14px;font-weight:700;position:relative;cursor:pointer}',
    '.mr-tab.on{color:#f2f2f3}',
    '.mr-tab.on::after{content:"";position:absolute;left:28%;right:28%;bottom:-1px;height:2px;border-radius:2px;background:#f2f2f3}',
    '.mr-pane{display:none;flex-direction:column;gap:8px;padding:14px 12px 8px}',
    '.mr-pane.on{display:flex}',
    // 줄·칩
    '.mr-row{display:flex;align-items:center;gap:10px;width:100%;min-height:50px;padding:0 14px;border-radius:14px;background:var(--mr-card);border:1px solid var(--mr-line);color:#f2f2f3;font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer;box-sizing:border-box}',
    '.mr-r{margin-left:auto;color:var(--mr-tx3);font-size:13px;font-weight:600}',
    '.mr-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 2px}',
    '.mr-chips::-webkit-scrollbar{display:none}',
    '.mr-chip{flex:none;height:32px;padding:0 13px;border-radius:999px;border:1px solid var(--line-strong,rgba(255,255,255,.16));background:none;color:var(--mr-tx2);font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    '.mr-chip.on{background:#f2f2f3;color:#000;border-color:#f2f2f3}',
    '.mr-cap{margin:10px 4px 0;font-size:13px;font-weight:800;color:var(--mr-tx2)}',
    '.mr-empty{padding:26px 8px;text-align:center;font-size:13px;color:var(--mr-tx3);line-height:1.6}',
    // 내 기록 줄
    '.mr-tr{display:flex;gap:12px;align-items:center;width:100%;padding:9px 4px;border:0;border-bottom:1px solid var(--mr-line);background:none;color:#f2f2f3;font:inherit;text-align:left;cursor:pointer}',
    '.mr-th{flex:none;width:52px;height:52px;border-radius:10px;background:var(--bg-3,#2a2a30) center/cover no-repeat}',
    '.mr-tt{flex:1;min-width:0}',
    '.mr-tt b{display:block;font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mr-tt small{display:block;margin-top:3px;font-size:12px;color:var(--mr-tx3);font-variant-numeric:tabular-nums}',
    '.mr-more{height:40px;border-radius:12px;border:1px solid var(--mr-line);background:none;color:var(--mr-tx2);font:inherit;font-size:13px;font-weight:700;cursor:pointer}',
    // 리포트
    '.mr-card{background:var(--mr-card);border:1px solid var(--mr-line);border-radius:14px;padding:14px;box-sizing:border-box}',
    '.mr-h{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.mr-k{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--mr-tx3);font-weight:600}',
    '.mr-k svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.mr-go{border:0;background:none;padding:4px 0;font:inherit;font-size:12px;font-weight:700;color:var(--mr-acc);cursor:pointer}',
    '.mr-pmn{display:flex;align-items:baseline;gap:6px;margin-top:6px}',
    '.mr-pmn b{font-size:30px;font-weight:800;letter-spacing:-.03em;color:#f2f2f3;font-variant-numeric:tabular-nums}',
    '.mr-pmn em{font-style:normal;font-size:14px;color:var(--mr-tx2);font-weight:600}',
    '.mr-pmn i{margin-left:auto;font-style:normal;font-size:15px;font-weight:800;color:#fbbf24}',
    '.mr-bar{height:8px;border-radius:4px;background:var(--bg-3,#2a2a30);margin-top:8px;overflow:hidden}',
    '.mr-bar i,.mr-mini i{display:block;height:100%;background:#fbbf24;border-radius:4px}',
    '.mr-pr{margin-top:12px;display:flex;flex-direction:column;gap:7px}',
    '.mr-pr div{display:grid;grid-template-columns:60px 1fr 46px;gap:8px;align-items:center;font-size:12.5px;color:var(--mr-tx2)}',
    '.mr-pr b{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}',
    '.mr-mini{height:5px;border-radius:3px;background:var(--bg-3,#2a2a30);overflow:hidden}',
    '.mr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.mr-c{display:flex;flex-direction:column;min-height:104px;text-align:left;color:#f2f2f3;font:inherit}',
    'button.mr-c{cursor:pointer}',
    '.mr-c .v{margin-top:auto;padding-top:10px;font-size:24px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}',
    '.mr-c .v em{font-style:normal;font-size:14px;font-weight:700;color:var(--mr-tx2);margin-left:2px}',
    '.mr-c .s{margin-top:2px;font-size:12px;color:var(--mr-tx3)}',
    '.mr-bars{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;align-items:end;height:64px;margin-top:12px}',
    '.mr-bars span{background:var(--bg-3,#2a2a30);border-radius:3px;min-height:3px}',
    '.mr-bars span.now{background:var(--mr-acc)}',
    '.mr-ml{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;margin-top:5px;text-align:center;font-size:11px;color:var(--mr-tx3)}',
    // 옮겨 온 예전 펼침 칸: 탭 안에서는 위아래 간격만 맞춘다
    '.mr-more2{display:block;margin-top:8px}',
    '.mr-sec{display:flex;justify-content:space-between;align-items:center;margin:14px 4px 0;font-size:15px;font-weight:800;color:#f2f2f3}',
    '.mr-sel select{height:32px;padding:0 28px 0 12px;border-radius:8px;border:1px solid var(--line-strong,rgba(255,255,255,.16));background:var(--bg-2,#17171b) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23d1d1d6%27 stroke-width=%273%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E") no-repeat right 10px center;color:#f2f2f3;font:inherit;font-size:13px;font-weight:700;-webkit-appearance:none;appearance:none}',
    '.mr-4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}',
    '.mr-4.two{grid-template-columns:1fr 1fr}',
    '.mr-4.three{grid-template-columns:repeat(3,1fr)}',
    '.mr-4.three b{font-size:15px}',
    '.mr-cap2{margin-top:12px;font-size:12px;font-weight:700;color:var(--mr-tx3)}',
    '.mr-4 div{padding:9px 0;border-radius:10px;background:var(--bg-2,#17171b);text-align:center}',
    '.mr-4 div.on{background:var(--accent-soft,rgba(76,148,248,.16))}',
    '.mr-4 b{display:block;font-size:17px;font-weight:800;color:#f2f2f3;font-variant-numeric:tabular-nums}',
    '.mr-4 small{display:block;margin-top:2px;font-size:12px;color:var(--mr-tx3);font-weight:600}',
    '.mr-4 div.on small{color:var(--mr-acc)}',
    '.mr-note{margin-top:10px;font-size:12.5px;color:var(--mr-tx2);line-height:1.5}',
    '.mr-note b{color:#f2f2f3}',
    '.mr-top{margin-top:10px;display:flex;flex-direction:column}',
    '.mr-top div{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--mr-line);font-size:13px;color:var(--mr-tx2)}',
    '.mr-top i{flex:none;width:20px;height:20px;border-radius:6px;background:var(--bg-2,#17171b);display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:800;color:#f2f2f3}',
    '.mr-top span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.mr-top b{flex:none;color:#f2f2f3;font-weight:700;font-variant-numeric:tabular-nums}',
    // 남겨 둔 예전 '장비 & 세팅 무게' 칸: 새 카드와 같은 겉모양
    '.mr-pane .report-minimal-card{margin:0!important;background:var(--mr-card)!important;border:1px solid var(--mr-line)!important;border-radius:14px!important;box-shadow:none!important}',
    '.mr-pane .report-minimal-card>[data-sec]{min-height:50px;padding:0 14px!important;box-sizing:border-box}',
    '.mr-pane .report-minimal-card>[data-sec] span{font-size:14px!important}'
  ].join('');

  // ---------------------------------------------------------------- 도구
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(id) { return document.getElementById(id); }
  function metric(name) { if (typeof window.okbmMetric === 'function') window.okbmMetric(name); }
  function myId() {
    try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { return ''; }
  }
  function vault(key, dflt) {
    try {
      if (window.RomanticVault && typeof window.RomanticVault.read === 'function') return window.RomanticVault.read(key, dflt);
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : dflt;
    } catch (e) { return dflt; }
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function curYear() { return String(new Date().getFullYear()); }
  // 피드 날짜 '2026.05.09' · '2026-05-09' → Date
  function feedDate(f) {
    var m = String((f && f.date) || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function spotList() {
    if (Array.isArray(window.registeredSpots) && window.registeredSpots.length) return window.registeredSpots;
    return Array.isArray(window.spots) ? window.spots : [];
  }
  // R2 사진은 img.romanticroute.kr에서 작게 받는다(romantic-history.js okbmSmallAvatarUrl과 같은 규칙)
  function thumb(u) {
    u = String(u || '');
    if (u.indexOf('http://') === 0) u = 'https://' + u.slice(7);
    if (u.indexOf('https://') !== 0) return '';
    if (u.indexOf(R2_PUBLIC) === 0) return 'https://img.romanticroute.kr/cdn-cgi/image/width=120,quality=70,fit=cover,format=auto/' + u.slice(R2_PUBLIC.length);
    return u;
  }
  function photosOf(f) {
    var p = f && f.photos;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = []; } }
    return (Array.isArray(p) ? p : []).filter(function (u) { return typeof u === 'string' && u.indexOf('http') === 0; });
  }
  function api() {
    var url = window.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '');
    var key = window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '');
    if (!url || !key) return null;
    var tok = (typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || key;
    return { url: url, headers: { apikey: key, Authorization: 'Bearer ' + tok } };
  }
  function ownerFilter(uid) {
    return typeof window.okbmFeedOwnerFilter === 'function' ? window.okbmFeedOwnerFilter(uid) : 'user_id=eq.' + encodeURIComponent(uid);
  }
  function myIdVariants(uid) {
    var v = typeof window.okbmFeedOwnerIdVariants === 'function' ? window.okbmFeedOwnerIdVariants(uid) : [uid];
    var set = {};
    (v || []).forEach(function (x) { set[String(x)] = 1; });
    return set;
  }

  // ---------------------------------------------------------------- 데이터
  // 내 피드: 낭만리포트를 열 때 한 번 받고 1분 안에 다시 열면 그대로 쓴다
  var S = { uid: '', feeds: null, at: 0, loading: null, year: null, shown: PAGE, rep: null, repFor: '' };
  function loadFeeds(force) {
    var uid = myId(), a = api();
    if (!uid || !a) return Promise.resolve([]);
    if (!force && S.uid === uid && S.feeds && Date.now() - S.at < 60000) return Promise.resolve(S.feeds);
    if (S.loading && S.uid === uid) return S.loading;
    S.uid = uid;
    var q = a.url + '/rest/v1/feeds?' + ownerFilter(uid) +
      '&select=id,spot,spot_id,date,photos,likes_count,comments_count,elevation,created_at&order=date.desc&limit=1000';
    S.loading = fetch(q, { headers: a.headers }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      if (S.uid !== uid) return S.feeds || [];
      S.feeds = Array.isArray(rows) ? rows : [];
      S.at = Date.now();
      return S.feeds;
    }).catch(function () { return S.feeds || []; }).then(function (v) { S.loading = null; return v; });
    return S.loading;
  }

  // 박지 찾기: spot_id, 없으면 '[시군] 이름 (부제)' 글자, 지도 페이지면 지도의 맞추기 함수
  var spotIdx = null, spotIdxFor = null;
  function spotIndex() {
    var list = spotList();
    if (spotIdx && spotIdxFor === list && list.length) return spotIdx;
    var byId = {}, byName = {};
    list.forEach(function (s) {
      if (!s || s.id == null) return;
      byId[String(s.id).trim()] = s;
      var city = String(s.cityName || s.city_name || '').trim();
      var main = String(s.spot_main || s.name || '').trim();
      var sub = String(s.spot_sub || '').trim();
      byName[('[' + city + '] ' + main + (sub ? ' (' + sub + ')' : '')).replace(/\s+/g, ' ')] = s;
    });
    spotIdx = { byId: byId, byName: byName, list: list };
    spotIdxFor = list;
    return spotIdx;
  }
  function spotOfFeed(f) {
    var ix = spotIndex();
    var sid = String((f && f.spot_id) || '').trim();
    if (sid && ix.byId[sid]) return ix.byId[sid];
    var name = String((f && f.spot) || '').replace(/\s+/g, ' ').trim();
    if (name && ix.byName[name]) return ix.byName[name];
    if (name && typeof window.okbmFeedBelongsToMapSpot === 'function') {
      for (var i = 0; i < ix.list.length; i++) if (window.okbmFeedBelongsToMapSpot(name, ix.list[i], '')) return ix.list[i];
    }
    return null;
  }
  function sggKey(s) { return String(s.region || '').trim() + '|' + String(s.cityName || s.city_name || '').trim(); }

  // 내 포토맵: 박지가 있는 시·군 중 내 피드 박지나 클리어(다녀옴)한 박지가 하나라도 있는 곳(photo-map.js '내 지도'와 같은 기준)
  function photoMapStats(feeds) {
    var ix = spotIndex();
    var visited = vault('okbm_visited', []);
    var mine = {};
    (Array.isArray(visited) ? visited : []).forEach(function (id) { mine[String(id).trim()] = 1; });
    feeds.forEach(function (f) { var s = spotOfFeed(f); if (s) mine[String(s.id).trim()] = 1; });
    var sgg = {}, sido = {};
    ix.list.forEach(function (s) {
      var k = sggKey(s);
      if (!k || k === '|') return;
      var c = sgg[k] || (sgg[k] = { key: k, region: String(s.region || '').trim(), city: String(s.cityName || s.city_name || '').trim(), spots: [], filled: false });
      c.spots.push(s);
      if (mine[String(s.id).trim()]) c.filled = true;
    });
    var total = 0, filled = 0;
    Object.keys(sgg).forEach(function (k) {
      var c = sgg[k], r = c.region || '기타';
      var d = sido[r] || (sido[r] = { name: r, total: 0, filled: 0 });
      d.total++; total++;
      if (c.filled) { d.filled++; filled++; }
    });
    var rows = Object.keys(sido).map(function (k) { return sido[k]; })
      .sort(function (a, b) { return (b.filled - a.filled) || (b.filled / b.total - a.filled / a.total) || (b.total - a.total); });
    // 다음 빈칸: 가장 많이 채운 도에서 박지가 가장 많은 빈 시·군
    var next = null;
    for (var i = 0; i < rows.length && !next; i++) {
      Object.keys(sgg).forEach(function (k) {
        var c = sgg[k];
        if (c.filled || c.region !== rows[i].name) return;
        if (!next || c.spots.length > next.spots.length) next = c;
      });
    }
    var filledKeys = {};
    Object.keys(sgg).forEach(function (k) { if (sgg[k].filled) filledKeys[k] = 1; });
    return { total: total, filled: filled, rows: rows, next: next, mineIds: mine, filledKeys: filledKeys };
  }

  // ---------------------------------------------------------------- 그리기
  var ICON = {
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    mount: '<svg viewBox="0 0 24 24"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M15 5.1 9 3 3 5v16l6-2 6 2 6-2V3z"/><path d="M9 3v16M15 5v16"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
  };
  // 높이 '480.8m' · '1,466m' → 정수 m. 소수점 아래는 버린다(예전엔 숫자만 이어 붙여 480.8m가 4,808m가 됐다)
  function elevOf(f) {
    var m = String((f && f.elevation) || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    var n = m ? Math.round(parseFloat(m[0])) : 0;
    return n > 0 && n < 2000 ? n : 0; // 남한에서 가장 높은 한라산이 1,947m
  }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  // 지형 묶음(예전 '필드 지형 테마'와 같은 넷): 박지 terrain 글자로 가른다
  function themeOf(s) {
    var t = String((s && s.terrain) || '');
    if (/섬/.test(t)) return 'island';
    if (/해변|바다/.test(t)) return 'sea';
    if (/계곡|숲|솔밭|수변/.test(t)) return 'forest';
    return 'mount';
  }
  var THEMES = [['mount', '산·능선'], ['island', '섬'], ['sea', '바다·해변'], ['forest', '숲·계곡']];
  function season(m) { return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3; }
  function yearOptions(feeds) {
    var ys = {};
    feeds.forEach(function (f) { var d = feedDate(f); if (d) ys[d.getFullYear()] = 1; });
    return Object.keys(ys).sort(function (a, b) { return b - a; });
  }

  // ---------------------------------------------------------------- 배지 (모양·창은 my-badges.js)
  // 받은 날은 피드 날짜로 계산한다: n번째 피드, 높이 합이 넘은 피드, 그 시·군을 처음 채운 피드.
  // 클리어(다녀옴)만 누른 박지는 시·군 수에는 들어가지만 날짜가 없다.
  var EVEREST = 8849;
  var DO_ROMAN = [['경기', 'GYEONGGI'], ['강원', 'GANGWON'], ['충북', 'CHUNGBUK'], ['충남', 'CHUNGNAM'], ['전북', 'JEONBUK'], ['전남', 'JEONNAM'], ['경북', 'GYEONGBUK'], ['경남', 'GYEONGNAM'], ['제주', 'JEJU']];
  function buildBadges(feeds) {
    var asc = feeds.map(function (f) { return { f: f, d: feedDate(f), s: spotOfFeed(f) }; })
      .sort(function (a, b) { return (a.d ? a.d.getTime() : 9e15) - (b.d ? b.d.getTime() : 9e15); });
    var nameOf = function (x) { return x ? String((x.s && (x.s.fullName || x.s.spot_main)) || x.f.spot || '').replace(/^\[[^\]]*\]\s*/, '') : ''; };
    var list = [];
    var add = function (o) { list.push(o); };
    // 기록
    [[1, 'i'], [10, 'b'], [50, 's'], [100, 'g']].forEach(function (t) {
      var x = asc[t[0] - 1];
      add({ id: 'trips' + t[0], group: 'trips', ladder: 'trips', shape: 'circle', fill: '#24473a', metal: t[1], icon: 'tent', num: t[0], ribbon: 'BACKPACKING',
        ko: t[0] === 1 ? '첫 백패킹' : '백패킹 ' + t[0] + '회', title: t[0] + ' BACKPACKING', desc: t[0] === 1 ? '첫 백패킹 피드를 올렸어요' : '백패킹 피드를 ' + t[0] + '번 올렸어요',
        got: !!x, date: x && x.d, spot: nameOf(x), cur: Math.min(feeds.length, t[0]), goal: t[0], unit: '회' });
    });
    // 누적 높이
    var sum = 0, cross = {};
    asc.forEach(function (x) {
      var e = elevOf(x.f) || (x.s ? elevOf({ elevation: x.s.elevation }) : 0);
      sum += e;
      [1, 3, 5].forEach(function (n) { if (!cross[n] && sum >= EVEREST * n) cross[n] = x; });
    });
    [[1, 'b'], [3, 's'], [5, 'g']].forEach(function (t) {
      var x = cross[t[0]];
      add({ id: 'ever' + t[0], group: 'ever', ladder: 'ever', shape: 'peak', fill: '#2a323d', metal: t[1], icon: 'peak', num: t[0], ribbon: 'EVEREST',
        ko: '에베레스트 ' + t[0] + '번', title: t[0] + ' EVEREST', desc: '다녀온 박지 높이를 더해 ' + num(EVEREST * t[0]) + 'm를 넘었어요',
        got: !!x, date: x && x.d, spot: nameOf(x), cur: Math.min(sum, EVEREST * t[0]), goal: EVEREST * t[0], unit: 'm' });
    });
    // 포토맵: 시·군을 처음 채운 피드 (클리어만 한 곳은 날짜 없이 수에 더한다)
    var pm = photoMapStats(feeds), firstAt = {}, order = [];
    asc.forEach(function (x) {
      if (!x.s) return;
      var k = sggKey(x.s);
      if (firstAt[k]) return;
      firstAt[k] = x; order.push(k);
    });
    var filledN = pm.filled;
    [[30, 'b', 30], [70, 's', 70], ['ALL', 'g', pm.total]].forEach(function (t) {
      var goal = t[2], x = order.length >= goal ? firstAt[order[goal - 1]] : null;
      add({ id: 'reg' + t[0], group: 'reg', ladder: 'reg', shape: 'hex', fill: '#5a4120', metal: t[1], icon: 'pin', num: t[0], ribbon: t[0] === 'ALL' ? 'KOREA' : 'REGIONS',
        ko: t[0] === 'ALL' ? '전국 완주' : '시·군 ' + t[0] + '곳', title: t[0] === 'ALL' ? 'ALL KOREA' : t[0] + ' REGIONS',
        desc: t[0] === 'ALL' ? '박지가 있는 시·군을 모두 채웠어요' : '포토맵에서 시·군 ' + t[0] + '곳을 채웠어요',
        got: goal > 0 && filledN >= goal, date: x && x.d, spot: nameOf(x), cur: Math.min(filledN, goal), goal: goal, unit: '곳' });
    });
    // 도 완주
    var byDo = {};
    spotList().forEach(function (sp) {
      var r = String(sp.region || '').trim(), k = sggKey(sp);
      var o = byDo[r] || (byDo[r] = { keys: {} });
      o.keys[k] = 1;
    });
    DO_ROMAN.forEach(function (dr) {
      var keys = Object.keys((byDo[dr[0]] || { keys: {} }).keys), done = 0, last = null, allDated = true;
      keys.forEach(function (k) {
        var hit = !!firstAt[k] || pm.filledKeys[k];
        if (hit) done++;
        if (firstAt[k]) { if (!last || (firstAt[k].d && last.d && firstAt[k].d > last.d)) last = firstAt[k]; } else allDated = false;
      });
      var got = keys.length > 0 && done === keys.length;
      add({ id: 'do' + dr[1], group: 'do', shape: 'shield', fill: '#1b2f4d', metal: 'g', sil: dr[0], ribbon: dr[1],
        ko: dr[0] + ' 완주', title: dr[1] + ' COMPLETE', desc: dr[0] + '에서 박지가 있는 시·군 ' + keys.length + '곳을 모두 채웠어요',
        got: got, date: got && allDated && last ? last.d : null, spot: got && allDated ? nameOf(last) : '', cur: done, goal: keys.length, unit: '곳' });
    });
    // 제보 채택(새 박지 제보만)
    var props = vault('okbm_my_proposals', []);
    var acc = (Array.isArray(props) ? props : []).filter(function (p) {
      if (!p || p.is_correction || p.isCorrection || p.type === 'correction') return false;
      return typeof window.okbmProposalStatusKind === 'function' && window.okbmProposalStatusKind(p) === 'accepted';
    }).length;
    [[1, 'b', 'FIRST SPOT', '첫 제보 채택'], [10, 'g', 'SPOTS', '제보 채택 10개']].forEach(function (t) {
      add({ id: 'spot' + t[0], group: 'etc', ladder: 'spot', shape: 'circle', fill: '#5e2a22', metal: t[1], icon: 'flag', num: t[0], ribbon: t[2],
        ko: t[3], title: t[0] === 1 ? 'FIRST SPOT' : '10 SPOTS', desc: '제보한 박지가 ' + t[0] + '곳 채택됐어요',
        got: acc >= t[0], date: null, spot: '', cur: Math.min(acc, t[0]), goal: t[0], unit: '개' });
    });
    // 한 해 사계절
    var bySeason = {}, seasonAt = null;
    asc.forEach(function (x) {
      if (!x.d || seasonAt) return;
      var y = x.d.getFullYear(), o = bySeason[y] || (bySeason[y] = {});
      o[season(x.d.getMonth())] = 1;
      if (Object.keys(o).length === 4) seasonAt = x;
    });
    var bestSeason = Object.keys(bySeason).reduce(function (m, y) { return Math.max(m, Object.keys(bySeason[y]).length); }, 0);
    add({ id: 'season4', group: 'etc', shape: 'circle', fill: '#2d4466', metal: 'g', icon: 'season', num: 4, ribbon: 'SEASONS',
      ko: '한 해 사계절', title: '4 SEASONS', desc: '한 해에 봄·여름·가을·겨울을 모두 다녀왔어요',
      got: !!seasonAt, date: seasonAt && seasonAt.d, spot: nameOf(seasonAt), cur: bestSeason, goal: 4, unit: '계절' });
    // 섬 10곳
    var isl = {}, islN = 0, islAt = null;
    asc.forEach(function (x) {
      if (!x.s || themeOf(x.s) !== 'island') return;
      var k = String(x.s.id);
      if (isl[k]) return;
      isl[k] = 1; islN++;
      if (islN === 10) islAt = x;
    });
    add({ id: 'island10', group: 'etc', shape: 'circle', fill: '#16545b', metal: 'g', icon: 'island', num: 10, ribbon: 'ISLANDS',
      ko: '섬 10곳', title: '10 ISLANDS', desc: '섬 박지 10곳을 다녀왔어요',
      got: islN >= 10, date: islAt && islAt.d, spot: nameOf(islAt), cur: Math.min(islN, 10), goal: 10, unit: '곳' });
    return list;
  }

  function renderReport() {
    var box = $('mrReport');
    if (!box) return;
    var feeds = S.feeds || [];
    var pm = photoMapStats(feeds);
    var visited = vault('okbm_visited', []), marks = vault('okbm_bookmarks', []);
    var vset = {};
    (Array.isArray(visited) ? visited : []).forEach(function (id) { vset[String(id).trim()] = 1; });
    var wish = (Array.isArray(marks) ? marks : []).filter(function (id) { return !vset[String(id).trim()]; }).length;
    var stars = 0, comments = 0;
    feeds.forEach(function (f) { stars += Number(f.likes_count) || 0; comments += Number(f.comments_count) || 0; });
    var pc = pm.total ? Math.round(pm.filled / pm.total * 100) : 0;
    var h = '';
    // 내 포토맵 (예전 '지역 분포'를 대신한다: 도별 진행을 다 펼쳐 볼 수 있다)
    h += '<div class="mr-card"><div class="mr-h"><span class="mr-k">' + ICON.map + '내 포토맵</span><button type="button" class="mr-go" data-mr-act="photomap">포토맵 열기 ›</button></div>';
    if (pm.total) {
      h += '<div class="mr-pmn"><b>' + pm.filled + '</b><em>/ ' + pm.total + ' 시·군</em><i>' + pc + '%</i></div>' +
        '<div class="mr-bar"><i style="width:' + Math.max(pm.filled ? 2 : 0, pc) + '%"></i></div>';
      var rows = S.allSido ? pm.rows : pm.rows.filter(function (r) { return r.filled; }).slice(0, 3);
      if (!rows.length) rows = pm.rows.slice(0, 3);
      h += '<div class="mr-pr">' + rows.map(function (r) {
        return '<div><span>' + esc(r.name) + '</span><span class="mr-mini"><i style="width:' + Math.round(r.filled / r.total * 100) + '%"></i></span><b>' + r.filled + '/' + r.total + '</b></div>';
      }).join('') + '</div>';
      if (pm.rows.length > 3) h += '<button type="button" class="mr-go mr-more2" data-mr-act="sido">' + (S.allSido ? '접기' : '모든 도 보기 (' + pm.rows.length + ')') + '</button>';
    } else {
      h += '<div class="mr-empty">박지 정보를 받는 중이에요</div>';
    }
    h += '</div>';
    // 배지 칸 (my-badges.js가 채운다)
    h += '<div class="mr-card" id="mrBadges"></div>';
    // 카드 2개
    h += '<div class="mr-grid">' +
      '<div class="mr-card mr-c"><span class="mr-k">' + ICON.check + '클리어한 박지</span><span class="v">' + num(Object.keys(vset).length) + '<em>곳</em></span><span class="s">찜만 한 곳 ' + num(wish) + '곳</span></div>' +
      '<div class="mr-card mr-c"><span class="mr-k">' + ICON.star + '받은 별</span><span class="v">' + num(stars) + '<em>개</em></span><span class="s">댓글 ' + num(comments) + ' · 피드 ' + num(feeds.length) + '개</span></div>' +
      '</div>';
    // ----- 기록 분석: 예전 시즌·지형 칸을 서버 기록으로 다시 그린다. 해를 고를 수 있다
    var ys = yearOptions(feeds);
    // 기록이 오기 전에는 해를 정하지 않는다(빈 목록으로 '전체'가 굳지 않게)
    if (!S.ryear && ys.length) S.ryear = ys.indexOf(curYear()) >= 0 ? curYear() : ys[0];
    if (!ys.length && S.feeds === null) { box.innerHTML = h; return; }
    var y = S.ryear || 'all';
    var list = y === 'all' ? feeds : feeds.filter(function (f) { var d = feedDate(f); return d && String(d.getFullYear()) === y; });
    h += '<div class="mr-sec"><span>기록 분석</span><span class="mr-sel"><select data-mr-ryear aria-label="분석할 해">' +
      ys.map(function (yy) { return '<option value="' + yy + '"' + (yy === y ? ' selected' : '') + '>' + yy + '년</option>'; }).join('') +
      '<option value="all"' + (y === 'all' ? ' selected' : '') + '>전체</option></select></span></div>';
    if (!list.length) {
      h += '<div class="mr-card"><div class="mr-empty">' + (feeds.length ? '이 해에는 기록이 없어요' : '피드를 올리면 계절·지형·높이 분석이 생겨요') + '</div></div>';
    } else {
      // 계절과 달마다 (예전 '시즌 밸런스')
      var months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], seasons = [0, 0, 0, 0];
      list.forEach(function (f) { var d = feedDate(f); if (d) { months[d.getMonth()]++; seasons[season(d.getMonth())]++; } });
      var maxM = Math.max.apply(null, months) || 1, nowM = y === curYear() ? new Date().getMonth() : -1;
      var sName = ['봄', '여름', '가을', '겨울'], topS = seasons.indexOf(Math.max.apply(null, seasons));
      h += '<div class="mr-card"><div class="mr-h"><span class="mr-k">' + ICON.cal + '계절과 달마다 다녀온 횟수</span><span class="mr-k">' + list.length + '회</span></div>' +
        '<div class="mr-bars">' + months.map(function (n, i) { return '<span' + (i === nowM ? ' class="now"' : '') + ' style="height:' + Math.round(n / maxM * 100) + '%" title="' + (i + 1) + '월 ' + n + '회"></span>'; }).join('') + '</div>' +
        '<div class="mr-ml">' + months.map(function (n, i) { return '<span>' + (i + 1) + '</span>'; }).join('') + '</div>' +
        '<div class="mr-4">' + seasons.map(function (n, i) { return '<div' + (i === topS && n ? ' class="on"' : '') + '><b>' + n + '</b><small>' + sName[i] + '</small></div>'; }).join('') + '</div></div>';
      // 어떤 곳에 갔나 (예전 '필드 지형 테마'·'장소 개척 성향'·'단골 랭킹')
      var th = { mount: 0, island: 0, sea: 0, forest: 0 }, per = {}, uniq = 0, again = 0;
      var tops = [];
      list.forEach(function (f) {
        var sp = spotOfFeed(f);
        th[themeOf(sp)]++;
        var k = sp ? 's' + sp.id : 'n' + String(f.spot || '');
        per[k] = per[k] || { n: 0, name: sp ? (sp.fullName || sp.spot_main || f.spot) : f.spot };
        per[k].n++;
        var e = elevOf(f) || (sp ? elevOf({ elevation: sp.elevation }) : 0);
        if (e) tops.push({ name: sp ? (sp.fullName || f.spot) : f.spot, e: e, d: feedDate(f) });
      });
      Object.keys(per).forEach(function (k) { uniq++; again += per[k].n - 1; });
      var fav = Object.keys(per).map(function (k) { return per[k]; }).filter(function (x) { return x.n > 1; }).sort(function (a, b) { return b.n - a.n; })[0];
      h += '<div class="mr-card"><div class="mr-h"><span class="mr-k">' + ICON.mount + '어떤 곳에 다녀왔나</span></div><div class="mr-pr">' +
        THEMES.map(function (t) {
          var n = th[t[0]];
          return '<div><span>' + t[1] + '</span><span class="mr-mini"><i style="width:' + Math.round(n / list.length * 100) + '%"></i></span><b>' + n + '회</b></div>';
        }).join('') + '</div>' +
        '<div class="mr-4 two"><div><b>' + uniq + '</b><small>새로 간 박지</small></div><div><b>' + again + '</b><small>다시 간 횟수</small></div></div>' +
        (fav ? '<div class="mr-note">가장 자주 간 곳 · <b>' + esc(fav.name) + '</b> ' + fav.n + '번</div>' : '') + '</div>';
      // 높이 (예전 '총 누적 획득 고도': 이번 달 · 올해 · 역대 셋으로 나눠 보여 줬다).
      // 가운데 칸과 높이 TOP 3은 위에서 고른 해를 따른다('전체'를 고르면 가운데는 올해). 이번 달·전체는 늘 같다
      tops.sort(function (a, b) { return b.e - a.e; });
      // 같은 곳을 여러 번 갔으면 TOP 3에는 한 번만
      var seenTop = {};
      tops = tops.filter(function (t) { var k = String(t.name || ''); if (seenTop[k]) return false; seenTop[k] = 1; return true; });
      var now = new Date(), midY = y === 'all' ? curYear() : y, hMonth = 0, hYear = 0, hAll = 0;
      feeds.forEach(function (f) {
        var sp = spotOfFeed(f), e = elevOf(f) || (sp ? elevOf({ elevation: sp.elevation }) : 0), d = feedDate(f);
        hAll += e;
        if (d && String(d.getFullYear()) === midY) hYear += e;
        if (d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) hMonth += e;
      });
      h += '<div class="mr-card"><div class="mr-h"><span class="mr-k">' + ICON.mount + '다녀온 높이</span><span class="mr-k">박지 높이를 더한 값</span></div>' +
        '<div class="mr-4 three"><div><b>+' + num(hMonth) + '</b><small>이번 달</small></div><div><b>+' + num(hYear) + '</b><small>' + (midY === curYear() ? '올해' : midY + '년') + '</small></div><div class="on"><b>+' + num(hAll) + '</b><small>전체</small></div></div>' +
        (tops.length ? '<div class="mr-cap2">높이 TOP 3</div><div class="mr-top">' + tops.slice(0, 3).map(function (t, i) {
          return '<div><i>' + (i + 1) + '</i><span>' + esc(t.name) + '</span><b>' + num(t.e) + 'm</b></div>';
        }).join('') + '</div>' : '') + '</div>';
    }
    box.innerHTML = h;
    if (window.okbmBadges && S.feeds) {
      window.okbmBadges.set(buildBadges(feeds));
      window.okbmBadges.card($('mrBadges'));
      // 새 배지는 낭만리포트를 열 때마다 한 번 본다
      if (!S.badgeChecked) { S.badgeChecked = true; window.okbmBadges.checkNew(S.uid); }
    } else {
      var bb = $('mrBadges');
      if (bb) bb.style.display = 'none';
    }
  }

  // 내 기록: 연도 칩 + 피드 줄
  function renderRecords() {
    var chips = $('mrYearChips'), list = $('mrRecList');
    if (!chips || !list) return;
    var feeds = S.feeds;
    if (!feeds) { list.innerHTML = '<div class="mr-empty">기록을 불러오는 중이에요</div>'; return; }
    var years = {};
    feeds.forEach(function (f) { var d = feedDate(f); if (d) years[d.getFullYear()] = (years[d.getFullYear()] || 0) + 1; });
    var ys = Object.keys(years).sort(function (a, b) { return b - a; });
    if (!S.year) S.year = years[curYear()] ? curYear() : (ys[0] || 'all');
    chips.innerHTML = ys.map(function (yy) {
      return '<button type="button" class="mr-chip' + (S.year === yy ? ' on' : '') + '" data-mr-year="' + yy + '">' + yy + ' · ' + years[yy] + '</button>';
    }).join('') + '<button type="button" class="mr-chip' + (S.year === 'all' ? ' on' : '') + '" data-mr-year="all">전체 · ' + feeds.length + '</button>';
    var rows = S.year === 'all' ? feeds : feeds.filter(function (f) { var d = feedDate(f); return d && String(d.getFullYear()) === S.year; });
    if (!rows.length) { list.innerHTML = '<div class="mr-empty">' + (feeds.length ? '이 해에는 기록이 없어요' : '아직 올린 기록이 없어요.<br>다녀온 백패킹을 피드로 남겨 보세요.') + '</div>'; return; }
    list.innerHTML = rows.slice(0, S.shown).map(function (f) {
      var d = feedDate(f), ph = photosOf(f)[0];
      var name = String(f.spot || '').trim() || '이름 없는 기록';
      var meta = (d ? d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) : '') +
        (Number(f.likes_count) ? ' · ★ ' + num(f.likes_count) : '') + (Number(f.comments_count) ? ' · 댓글 ' + num(f.comments_count) : '');
      var t = thumb(ph);
      return '<button type="button" class="mr-tr" data-mr-act="feed" data-v="' + esc(f.id) + '"><span class="mr-th"' + (t ? ' style="background-image:url(&quot;' + esc(t) + '&quot;)"' : '') + '></span>' +
        '<span class="mr-tt"><b>' + esc(name) + '</b><small>' + esc(meta) + '</small></span></button>';
    }).join('') + (rows.length > S.shown ? '<button type="button" class="mr-more" data-mr-act="more">' + (rows.length - S.shown) + '개 더 보기</button>' : '');
  }

  function renderCounts() {
    var follow = vault('okbm_following_users', []);
    var n = Array.isArray(follow) ? follow.length : 0;
    var a = $('mrFollowCount'), b = $('mrFollowCount2');
    if (a) a.textContent = String(n);
    if (b) b.textContent = n ? n + '명' : '';
  }

  // ---------------------------------------------------------------- 탭
  function setTab(t) {
    var root = $('userProfileModalOverlay');
    if (!root) return;
    if (['rec', 'save', 'rep'].indexOf(t) < 0) t = 'rep';
    root.querySelectorAll('.mr-tab').forEach(function (b) { var on = b.getAttribute('data-mr-tab') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    root.querySelectorAll('.mr-pane').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-mr-pane') === t); });
  }
  // 예전 펼침 칸(지형·시즌·지역·장비·제보)을 탭 안으로 옮긴다(한 번만)
  function placeLegacy() {
    var rep = document.querySelector('#userProfileModalOverlay [data-mr-pane="rep"]');
    var rec = document.querySelector('#userProfileModalOverlay [data-mr-pane="rec"]');
    if (!rep || !rec || rep.getAttribute('data-mr-placed')) return;
    rep.setAttribute('data-mr-placed', '1');
    // 지형·시즌·지역은 '기록 분석' 카드가 서버 기록으로 대신 보여 준다. 예전 칸은 숨겨 두고(함수들이 찾는 칸), 장비만 맨 아래로
    var hold = document.createElement('div');
    hold.hidden = true;
    rep.appendChild(hold);
    ['terrain', 'season', 'region', 'gear'].forEach(function (k) {
      var h = document.querySelector('#userProfileModalOverlay [data-sec="' + k + '"]');
      var card = h && h.closest('.report-minimal-card');
      if (card) (k === 'gear' ? rep : hold).appendChild(card);
    });
    var mp = document.querySelector('#userProfileModalOverlay [data-sec="myprops"]');
    var mpc = mp && mp.closest('.report-minimal-card');
    if (mpc) rec.insertBefore(mpc, rec.querySelector('[data-mr-act="trips"]'));
  }

  function refresh(force) {
    renderCounts();
    renderRecords();
    renderReport();
    loadFeeds(force).then(function () { renderRecords(); renderReport(); });
  }

  window.okbmMyReportOpened = function () {
    if (!document.getElementById('okbmMyReportCss')) {
      var st = document.createElement('style'); st.id = 'okbmMyReportCss'; st.textContent = CSS; document.head.appendChild(st);
    }
    placeLegacy();
    // 인스타처럼 닉네임을 사진 오른쪽 숫자 줄 위에 둔다(맨 위 제목은 '낭만루트' 그대로)
    var nickEl = document.querySelector('#userProfileModalOverlay .mr-pinfo .mr-nick'), slot0 = document.querySelector('#userProfileModalOverlay .mr-stats-slot');
    if (nickEl && slot0) slot0.insertBefore(nickEl, slot0.firstChild);
    // 숫자 줄을 사진 오른쪽으로 (프로필은 열 때마다 새로 그려진다)
    var slot = document.querySelector('#userProfileModalOverlay .mr-stats-slot'), stats = document.querySelector('#userProfileModalOverlay .mr-stats');
    if (slot && stats && stats.parentNode !== slot) slot.appendChild(stats);
    setTab('rep'); // 열 때는 늘 리포트부터
    if (myId() !== S.uid) { S.feeds = null; S.year = null; S.ryear = null; }
    S.shown = PAGE;
    S.badgeChecked = false;
    refresh(false);
  };


  // ---------------------------------------------------------------- 프로필 편집 (소개 + SNS 한 화면)
  // 예전엔 소개(editReportUserBio)와 SNS(openSnsEditorModal)를 따로 열었다. 저장하는 곳·방법은 그 둘과 같다.
  var PE_CSS = [
    '.mr-pe{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}',
    '.mr-pe-box{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:var(--bg-1,#0f0f11);border-top:1px solid var(--line,rgba(255,255,255,.08));border-radius:18px 18px 0 0;padding:18px 16px calc(16px + env(safe-area-inset-bottom,0px));box-sizing:border-box;color:#f2f2f3}',
    '.mr-pe-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}',
    '.mr-pe-h b{font-size:17px;font-weight:800}',
    '.mr-pe-x{width:36px;height:36px;border:0;border-radius:10px;background:none;color:var(--tx-2,#d1d1d6);font-size:20px;cursor:pointer}',
    '.mr-pe label{display:flex;justify-content:space-between;margin:14px 2px 6px;font-size:13px;font-weight:700;color:var(--tx-2,#d1d1d6)}',
    '.mr-pe label small{font-weight:600;color:var(--tx-3,#8b8b93);font-variant-numeric:tabular-nums}',
    '.mr-pe textarea,.mr-pe input{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--line-strong,rgba(255,255,255,.16));background:var(--bg-2,#17171b);color:#f2f2f3;font:inherit;font-size:15px;padding:10px 12px;outline:none}',
    '.mr-pe textarea{height:92px;resize:none;line-height:1.5}',
    '.mr-pe input{height:44px}',
    '.mr-pe textarea:focus,.mr-pe input:focus{border-color:var(--accent,#4c94f8)}',
    '.mr-pe-sub{margin:18px 2px 0;font-size:12px;color:var(--tx-3,#8b8b93)}',
    '.mr-pe-sub button{border:0;background:none;padding:0;font:inherit;color:var(--accent,#4c94f8);font-weight:700;cursor:pointer}',
    '.mr-pe-btns{display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:18px}',
    '.mr-pe-btns button{height:46px;border-radius:12px;border:0;font:inherit;font-size:15px;font-weight:800;cursor:pointer}',
    '.mr-pe-btns .c{background:var(--bg-2,#17171b);color:var(--tx-2,#d1d1d6)}',
    '.mr-pe-btns .s{background:var(--accent-fill,#2b6fd6);color:#fff}'
  ].join('');
  function bioMax() { return typeof OKBM_USER_BIO_MAX === 'number' ? OKBM_USER_BIO_MAX : 100; }
  function normBio(t) { return typeof okbmNormalizeUserBio === 'function' ? okbmNormalizeUserBio(t) : String(t || '').trim(); }
  function openProfileEditor() {
    metric('feat_profile_edit');
    if (!document.getElementById('okbmMyReportPeCss')) {
      var st = document.createElement('style'); st.id = 'okbmMyReportPeCss'; st.textContent = PE_CSS; document.head.appendChild(st);
    }
    var old = document.getElementById('mrProfileEditor');
    if (old) old.remove();
    var ls = function (k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
    var bio = normBio(ls('okbm_user_bio'));
    var wrap = document.createElement('div');
    wrap.id = 'mrProfileEditor';
    wrap.className = 'mr-pe';
    wrap.innerHTML = '<div class="mr-pe-box" role="dialog" aria-modal="true" aria-label="프로필 편집">' +
      '<div class="mr-pe-h"><b>프로필 편집</b><button type="button" class="mr-pe-x" data-pe="close" aria-label="닫기">✕</button></div>' +
      '<label for="mrPeBio">소개<small id="mrPeCount">' + bio.length + '/' + bioMax() + '</small></label>' +
      '<textarea id="mrPeBio" maxlength="' + bioMax() + '" placeholder="어떤 백패킹을 다니는지 소개해 보세요">' + esc(bio) + '</textarea>' +
      '<label for="mrPeInsta">인스타그램</label><input id="mrPeInsta" type="text" autocomplete="off" placeholder="@아이디" value="' + esc(ls('okbm_user_instagram')) + '">' +
      '<label for="mrPeYt">유튜브 채널</label><input id="mrPeYt" type="text" autocomplete="off" inputmode="url" placeholder="youtube.com/@채널" value="' + esc(ls('okbm_user_youtube')) + '">' +
      '<label for="mrPeBlog">네이버 블로그</label><input id="mrPeBlog" type="text" autocomplete="off" inputmode="url" placeholder="blog.naver.com/아이디" value="' + esc(ls('okbm_user_blog')) + '">' +
      '<p class="mr-pe-sub">사진·닉네임은 <button type="button" data-pe="settings">설정</button>에서 바꿔요.</p>' +
      '<div class="mr-pe-btns"><button type="button" class="c" data-pe="close">취소</button><button type="button" class="s" data-pe="save">저장</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    var ta = wrap.querySelector('#mrPeBio');
    ta.addEventListener('input', function () { wrap.querySelector('#mrPeCount').textContent = ta.value.length + '/' + bioMax(); });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { wrap.remove(); return; }
      var b = e.target.closest('[data-pe]');
      if (!b) return;
      var a = b.getAttribute('data-pe');
      if (a === 'close') wrap.remove();
      else if (a === 'save') saveProfile(wrap);
      else if (a === 'settings') { wrap.remove(); openSettings(); }
    });
  }
  function saveProfile(wrap) {
    var val = function (id) { var el = wrap.querySelector('#' + id); return el ? el.value.trim() : ''; };
    var bio = normBio(val('mrPeBio'));
    var insta = val('mrPeInsta'), yt = val('mrPeYt'), blog = val('mrPeBlog');
    var put = function (k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} };
    try { localStorage.setItem('okbm_user_bio', bio); } catch (e) {}
    put('okbm_user_instagram', insta); put('okbm_user_youtube', yt); put('okbm_user_blog', blog);
    var profile = (typeof safeGetJSON === 'function' ? safeGetJSON('user_profile', null) : null) || {};
    profile.bio = bio; profile.instagram = insta; profile.youtube = yt; profile.blog = blog;
    try {
      localStorage.setItem('user_profile', JSON.stringify(profile));
      if (profile.id) localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
    } catch (e) {}
    // 화면 곳곳의 소개·SNS를 바로 바꾼다
    document.querySelectorAll('.user-profile-bio-span').forEach(function (span) {
      span.innerText = bio || '소개글을 작성해보세요.';
      span.style.color = bio ? '' : '#64748b';
    });
    if (typeof window.renderUserSnsBadgesHtml === 'function') {
      var badges = window.renderUserSnsBadgesHtml(insta, yt, blog, true);
      document.querySelectorAll('.user-profile-sns-wrap').forEach(function (w) { w.innerHTML = badges; });
      var coll = document.getElementById('userCollectionSnsWrap');
      if (coll) coll.innerHTML = badges;
    }
    if (typeof okbmMarkUserDataDirty === 'function') okbmMarkUserDataDirty(['__profile_bio', '__profile_sns']);
    if (typeof window.saveUserToSupabase === 'function') {
      window.saveUserToSupabase(profile).catch(function (e) { console.warn('[my-report.js:saveProfile]', e); });
    }
    if (typeof triggerHaptic === 'function') triggerHaptic(15);
    wrap.remove();
    if (typeof showToast === 'function') showToast('프로필을 저장했어요.', 'success', 1500);
  }
  function openSettings() {
    // 계정 관리의 뒤로(◀)가 낭만리포트로 돌아오게: 계정 관리를 열면 낭만리포트 창을 새로 만들므로 다시 여는 길을 남긴다
    if (typeof window.recordModalHistoryStep === 'function') {
      window.recordModalHistoryStep('userProfileModalOverlay', function () { if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal(); });
    }
    if (typeof window.openAccountSettingsModal === 'function') window.openAccountSettingsModal();
    if (typeof window.okbmApplyActivityPrivacyButtons === 'function') window.okbmApplyActivityPrivacyButtons();
  }

  // ---------------------------------------------------------------- 누름
  document.addEventListener('change', function (e) {
    var sel = e.target && e.target.closest && e.target.closest('#userProfileModalOverlay [data-mr-ryear]');
    if (!sel) return;
    metric('feat_report_year');
    S.ryear = sel.value;
    renderReport();
  });
  function closeReportThen(fn) {
    var el = $('userProfileModalOverlay');
    if (el) el.style.setProperty('display', 'none', 'important');
    fn();
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('#userProfileModalOverlay [data-mr-act], #userProfileModalOverlay [data-mr-tab], #userProfileModalOverlay [data-mr-year]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    var act = el.getAttribute('data-mr-act'), tab = el.getAttribute('data-mr-tab'), yr = el.getAttribute('data-mr-year'), v = el.getAttribute('data-v');
    if (tab) {
      metric('feat_report_tab');
      setTab(tab);
      if (yr) { S.year = yr === 'cur' ? curYear() : yr; S.shown = PAGE; renderRecords(); }
      if (el.getAttribute('data-mr-go') === 'myprops') {
        var body = $('accBody_myprops');
        if (body && body.style.display !== 'flex' && typeof window.handleReportSecClick === 'function') window.handleReportSecClick('myprops');
        var h = document.querySelector('#userProfileModalOverlay [data-sec="myprops"]');
        if (h) h.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }
    if (yr) {
      S.year = yr; S.shown = PAGE;
      renderRecords();
      return;
    }
    switch (act) {
      case 'note': if (typeof window.openUserNotificationInbox === 'function') window.openUserNotificationInbox('note', e); break;
      case 'notif': if (typeof window.openUserNotificationInbox === 'function') window.openUserNotificationInbox('notif', e); break;
      case 'settings': openSettings(); break;
      case 'profile': openProfileEditor(); break;
      case 'bio': if (typeof window.editReportUserBio === 'function') window.editReportUserBio(); break;
      case 'sns': if (typeof window.openSnsEditorModal === 'function') window.openSnsEditorModal(); break;
      case 'routers': if (typeof window.openRoutersInterestFromReport === 'function') window.openRoutersInterestFromReport(e); break;
      case 'feeds': if (typeof window.openFeedsInterestFromReport === 'function') window.openFeedsInterestFromReport(e); break;
      case 'trips': if (typeof window.openMyPastTripsFromReport === 'function') window.openMyPastTripsFromReport(e); break;
      case 'feed': if (v && typeof window.openReportActivityFeed === 'function') window.openReportActivityFeed(v); break;
      case 'more': S.shown = 1e9; renderRecords(); break;
      case 'sido': S.allSido = !S.allSido; renderReport(); break;
      case 'photomap':
        metric('feat_report_photomap');
        if (typeof window.okbmOpenPhotoMap === 'function') {
          closeReportThen(function () { if (typeof window.closeUserProfileModal === 'function') window.closeUserProfileModal(); window.okbmOpenPhotoMap(); });
        } else {
          window.location.assign('map.html?pm=open');
        }
        break;
    }
  }, true);
})();
