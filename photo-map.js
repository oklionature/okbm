// =========================================================================
// 사진 지도 (지도 종류 전환의 네 번째 칸: 일반 → 위성 → 지형도 → 사진)
//
// 전국은 시·도, 확대하면 시·군·구, 더 확대하면 박지 칸으로 잘게 나뉜다.
// 박지 칸은 그 시·군·구 모양을 "가장 가까운 박지" 기준으로 나눈 것이라 박지가 늘면 칸이 알아서 다시 잘린다.
// 칸마다 그곳 낭만피드 사진을 채운다.
//   모두:    좋아요가 가장 많은 후기 사진
//   내 지도: 내 후기 사진은 컬러, 다녀옴만 누른 곳은 남의 사진을 흑백으로(사진이 없으면 연초록), 나머지는 빈칸
//
// 경계: admdongkor ver20261001 행정동(CC BY 4.0, 원자료 통계청)을 시군구로 합친 photo-map/korea-sgg-202610.json
//       출처 표시는 terms.html "사용한 공개 자료"에 둔다(CC BY 4.0은 별도 안내 페이지 표시를 인정한다).
// 켤 때는 기본 지도가 보던 범위를 그대로 이어받고, 끌 때는 사진 지도가 보던 범위를 기본 지도에 돌려준다(둘 다 메르카토르).
// d3는 CSP 때문에 vendor/에 두고, 사진 모드를 처음 켤 때만 불러온다.
// 사진은 img.romanticroute.kr에서 Cloudflare가 줄여 준 것을 받고, 안 되면 원본을 받아 기기 안에서 줄인다(아래 "사진 줄이기").
// =========================================================================
(function () {
  'use strict';

  var GEO_URL = 'photo-map/korea-sgg-202610.json?v=2';
  var D3_URL = 'vendor/d3-7.9.0.min.js';
  // 처음부터 시·군·구 칸으로 보여 준다(시·도를 통째로 채우면 사진 한두 장에 도 전체가 차 버려 빈칸이 안 보인다).
  // LEVEL_SGG: 이보다 확대하면 시·군·구 이름과 '도' 단위 진행도를 보여 준다 / LEVEL_SPOT: 이보다 확대하면 박지 칸
  var LEVEL_SGG = 2.4, LEVEL_SPOT = 6;
  var METRO = { '11': 1, '26': 1, '27': 1, '28': 1, '29': 1, '30': 1, '31': 1, '36': 1 };
  var THUMB = { sido: 360, sgg: 360, spot: 720 };

  var host = null, svg = null, defs = null, root = null, L = {};
  // 화면 크기: 확대 중에 host.clientWidth를 읽으면 강제 레이아웃이 생겨서 열 때·resize 때만 잰다
  var hostW = 0, hostH = 0;
  function measure() { hostW = host.clientWidth || window.innerWidth; hostH = host.clientHeight || window.innerHeight; }
  var proj = null, gpath = null, zoom = null, k = 1;
  var geo = null, feedsAll = null, feedsMine = null;
  var sidos = [], sggs = [], spotList = [], bySpot = {};
  var mode = 'all', opened = false, uid = 0, freshSpotId = null, busy = null;
  var thumbs = new Map(), thumbQueue = [], thumbActive = 0;

  var CSS = [
    // 지도 색은 카카오 일반 지도(테마와 상관없이 밝은 바다·땅)에 맞추고, 위에 뜨는 버튼만 앱 테마를 따른다
    '.pm-host{position:absolute;inset:0;z-index:50;display:none;background:var(--pm-bg);--pm-bg:#aad3ea;--pm-empty:#f1efe9;--pm-green:#cfe6d5;--pm-accent:#2f8a62;--pm-line:#fff;--pm-sub:#3f4642;--pm-spot:#ff6a2b;--pm-ink:#fff;--pm-chip:#151b23;--pm-chip-sub:#94a3b8;}',
    'html[data-theme="light"] .pm-host{--pm-ink:#1d2320;--pm-chip:#fff;--pm-chip-sub:#6b726d;}',
    // 사진 모드에선 검색창·필터·확대 버튼을 숨기고, 진행도와 모두/내 지도를 검색창 자리로 올린다
    'body.pm-on #leftBottomFilterWrap,body.pm-on #rightBottomHudGroup,body.pm-on .floating-top-search-wrap{display:none!important;}',
    '.pm-svg{position:absolute;inset:0;width:100%;height:100%;touch-action:none;}',
    '.pm-region{stroke:var(--pm-line);stroke-width:1;vector-effect:non-scaling-stroke;cursor:pointer;}',
    '.pm-cellline{fill:none;stroke:var(--pm-line);stroke-width:1;vector-effect:non-scaling-stroke;pointer-events:none;}',
    '.pm-edge{fill:none;stroke:var(--pm-line);vector-effect:non-scaling-stroke;pointer-events:none;}',
    '.pm-edge-sido{stroke:#a9a59b;}',
    '.pm-img{pointer-events:none;opacity:0;transition:opacity .35s;}',
    // 박지 층은 칸마다 따로 뜨지 않고 사진이 준비되면 통째로 서서히 겹친다(revealSpots)
    '.pm-l-spot{transition:opacity .3s;}',
    '.pm-img.pm-in{opacity:1;}',
    '.pm-img.pm-gray{filter:grayscale(1) contrast(.9);opacity:.55;}',
    '.pm-img.pm-fresh{transition:filter 1.6s,opacity 1.6s;}',
    '.pm-dot{r:calc(6.5px / var(--pm-k,1));stroke-width:2.5;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));vector-effect:non-scaling-stroke;cursor:pointer;}',
    '.pm-lbl{stroke-width:calc(3px / var(--pm-k,1));font-weight:700;fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.6);stroke-linejoin:round;text-anchor:middle;pointer-events:none;font-family:var(--font-body,sans-serif);}',
    '.pm-lp{font-size:calc(13px / var(--pm-k,1));}',
    '.pm-lc{font-size:calc(11.5px / var(--pm-k,1));}',
    '.pm-ls{font-size:calc(11px / var(--pm-k,1));}',
    '.pm-empty-lbl{fill:var(--pm-sub);stroke:#fff;}',
    '.pm-stamp{font-size:calc(11px / var(--pm-k,1));stroke-width:calc(3px / var(--pm-k,1));font-weight:800;fill:var(--pm-accent);paint-order:stroke;stroke:#fff;stroke-linejoin:round;text-anchor:middle;pointer-events:none;}',
    '.pm-top{position:absolute;top:calc(var(--okbm-status-top, env(safe-area-inset-top, 0px)) + 8px);left:10px;right:10px;display:flex;gap:8px;align-items:center;justify-content:space-between;z-index:2;}',
    '.pm-seg{display:flex;background:var(--pm-chip);border-radius:999px;padding:3px;box-shadow:0 2px 10px rgba(0,0,0,.2);flex:none;}',
    '.pm-seg button{border:0;background:none;padding:6px 11px;border-radius:999px;font-size:12.5px;color:var(--pm-chip-sub);font-weight:600;}',
    '.pm-seg button.on{background:var(--pm-accent);color:#fff;}',
    '.pm-stat{min-width:0;font-size:12.5px;color:var(--pm-chip-sub);background:var(--pm-chip);padding:8px 13px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.pm-stat b{color:var(--pm-accent);font-size:14px;}',
    '.pm-loading,.pm-toast{position:absolute;left:0;right:0;text-align:center;font-size:13px;color:#1d2320;pointer-events:none;}',
    '.pm-loading{top:45%;}',
    '.pm-toast{display:none;bottom:calc(56px + env(safe-area-inset-bottom,0px) + 64px);}',
    '.pm-toast{font-weight:700;text-shadow:0 0 4px #fff,0 0 8px #fff;}',
    '.pm-dim{position:fixed;inset:0;z-index:960;background:rgba(0,0,0,.5);display:none;}',
    '.pm-sheet{position:fixed;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));margin:0 auto;max-width:520px;max-height:calc(100vh - 56px - env(safe-area-inset-bottom,0px) - 24px);overflow-y:auto;z-index:961;background:var(--bg-card,#fff);color:var(--text-primary,#111);border-radius:20px 20px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.3);display:none;padding-bottom:10px;animation:pmUp .25s ease-out;}',
    '@keyframes pmUp{from{transform:translateY(40px);opacity:.4;}}',
    '.pm-grab{width:40px;height:5px;border-radius:3px;background:rgba(128,128,128,.4);margin:8px auto 0;}',
    '.pm-x{position:absolute;top:14px;right:12px;border:0;border-radius:50%;width:34px;height:34px;background:rgba(0,0,0,.55);color:#fff;font-size:18px;z-index:2;}',
    '.pm-sheet-plain .pm-x{background:rgba(128,128,128,.2);color:inherit;}',
    '.pm-gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin-top:8px;scrollbar-width:none;}',
    '.pm-gal::-webkit-scrollbar{display:none;}',
    '.pm-gal img{flex:0 0 100%;width:100%;height:min(54vh,520px);object-fit:cover;scroll-snap-align:center;display:block;background:rgba(128,128,128,.2);}',
    '.pm-gal-gray img{filter:grayscale(1);opacity:.6;}',
    '.pm-gcount{position:relative;float:right;margin:-34px 12px 0 0;background:rgba(0,0,0,.55);color:#fff;font-size:12px;padding:3px 9px;border-radius:999px;}',
    '.pm-nophoto{height:34px;}',
    '.pm-sheet-t{padding:14px 16px 12px;clear:both;}',
    '.pm-sheet-t b{display:block;font-size:16px;}',
    '.pm-sheet-t small{display:block;margin-top:3px;font-size:13px;color:var(--text-secondary,#666);}',
    '.pm-sheet-t i{display:block;margin-top:4px;font-size:11.5px;font-style:normal;color:var(--text-secondary,#666);}',
    '.pm-btns{display:flex;gap:8px;padding:0 14px 6px;}',
    '.pm-btns button{flex:1;padding:12px 6px;border:0;border-radius:12px;font-size:14px;font-weight:700;background:#2f9e6a;color:#fff;}',
    '.pm-btns button.ghost{background:rgba(47,158,106,.14);color:#2f9e6a;}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('pmCss')) return;
    var st = document.createElement('style'); st.id = 'pmCss'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ 불러오기
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      if (window.d3 && window.d3.geoPath) return ok();
      var s = document.createElement('script');
      s.src = src; s.onload = function () { ok(); }; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function restHeaders() {
    var key = window.SUPABASE_ANON_KEY || '';
    return { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  }

  var FEED_COLS = 'id,user_id,spot,spot_id,photos,likes_count,created_at';
  // 피드 목록은 10분 동안 다시 쓴다(Supabase 전송량: 2026-10 무료 한도를 넘긴 적이 있다)
  var FEED_CACHE_KEY = 'okbm_pm_feeds_v1', FEED_CACHE_MS = 10 * 60 * 1000;

  function fetchPublicFeeds() {
    try {
      var c = JSON.parse(sessionStorage.getItem(FEED_CACHE_KEY) || 'null');
      if (c && Date.now() - c.at < FEED_CACHE_MS && Array.isArray(c.rows)) return Promise.resolve(c.rows);
    } catch (e) {}
    var base = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
    var url = base + '/rest/v1/feeds?select=' + FEED_COLS + '&is_published=eq.true&feed_type=neq.snap&order=created_at.desc&limit=3000';
    var p = typeof window.okbmPublicFetch === 'function' ? window.okbmPublicFetch(url) : fetch(url, { headers: restHeaders() });
    return p.then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      if (Array.isArray(rows) && rows.length) {
        try { sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ at: Date.now(), rows: rows })); } catch (e) {}
      }
      return rows;
    }).catch(function () { return []; });
  }

  // 내 후기는 공개 전 글도 넣는다(올리자마자 내 지도에 색이 들어가게)
  function fetchMyFeeds() {
    var uid = myId();
    if (!uid || !window.supabaseClient) return Promise.resolve([]);
    return window.supabaseClient.from('feeds').select(FEED_COLS).eq('user_id', uid).neq('feed_type', 'snap').limit(1000)
      .then(function (res) { return Array.isArray(res.data) ? res.data : []; }, function () { return []; });
  }

  function myId() {
    try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '') : ''; } catch (e) { return ''; }
  }
  function loggedIn() { return typeof window.isUserLoggedIn === 'function' && !!window.isUserLoggedIn(); }
  function visitedSet() { return window.userVisited instanceof Set ? window.userVisited : new Set(); }

  // ------------------------------------------------------------------ 데이터 묶기
  function realPhotos(f) {
    return (Array.isArray(f.photos) ? f.photos : []).filter(function (u) { return typeof u === 'string' && u.indexOf('https://') === 0; });
  }

  function buildGeo() {
    measure();
    var W = hostW, H = hostH;
    lastW = W;
    var fc = { type: 'FeatureCollection', features: geo.sido.map(function (s) { return { type: 'Feature', geometry: s.g }; }) };
    proj = d3.geoMercator().fitExtent([[6, 64], [W - 6, H - 64]], fc);
    gpath = d3.geoPath(proj);
    sidos = geo.sido.map(function (s) { return { code: s.c, name: s.n, geom: s.g, d: gpath(s.g), box: gpath.bounds(s.g), c: gpath.centroid(s.g), sggs: [] }; });
    var sidoBy = {}; sidos.forEach(function (s) { sidoBy[s.code] = s; });
    sggs = geo.sgg.map(function (g) {
      var o = { code: g.c, name: g.n, geom: g.g, d: gpath(g.g), box: gpath.bounds(g.g), c: gpath.centroid(g.g), spots: [], sido: sidoBy[g.c] };
      if (o.sido) o.sido.sggs.push(o);
      o.geoBox = d3.geoBounds(g.g);
      return o;
    });
  }

  // 박지가 들어 있는 시군구: 이름이 하나로 맞으면 그것, 아니면 좌표가 들어 있는 곳, 그래도 없으면 가장 가까운 곳.
  // (박지 cityName에는 '대전 서구', '울주군(경남)', 신설 '영종구'처럼 섞인 값이 있다)
  function findSgg(spot) {
    var ll = [Number(spot.lng), Number(spot.lat)];
    var nm = String(spot.cityName || '').trim().split(/\s+/).pop();
    var byName = sggs.filter(function (g) { return g.name === nm; });
    if (byName.length === 1) return byName[0];
    var inside = sggs.filter(function (g) {
      var b = g.geoBox;
      return ll[0] >= b[0][0] && ll[0] <= b[1][0] && ll[1] >= b[0][1] && ll[1] <= b[1][1] && d3.geoContains(g.geom, ll);
    });
    var both = inside.filter(function (g) { return byName.indexOf(g) !== -1; });
    if (both.length) return both[0];
    if (inside.length) return inside[0];
    var pool = byName.length ? byName : sggs, best = null, bestD = Infinity;
    pool.forEach(function (g) { var d = d3.geoDistance(ll, d3.geoCentroid(g.geom)); if (d < bestD) { bestD = d; best = g; } });
    return best;
  }

  function buildSpots() {
    sggs.forEach(function (g) { g.spots = []; });
    spotList = (Array.isArray(window.spots) ? window.spots : []).filter(function (s) {
      return s && isFinite(Number(s.lat)) && isFinite(Number(s.lng)) && Number(s.lat) && !(window.okbmBlockedSpotIds && window.okbmBlockedSpotIds.has(String(s.id).trim()));
    });
    spotList.forEach(function (s) {
      var g = findSgg(s);
      s.__pmSgg = g; s.__pmXY = proj([Number(s.lng), Number(s.lat)]);
      if (g) g.spots.push(s);
    });
  }

  var attachedFor = null;
  function attachFeeds() {
    bySpot = {};
    var uidMe = myId();
    attachedFor = uidMe;
    var list = feedsAll || [];
    if (typeof window.filterHiddenUgcFeeds === 'function') list = window.filterHiddenUgcFeeds(list);
    var mine = feedsMine || [];
    var seen = {};
    function spotFor(f) {
      var sid = String(f.spot_id || '').trim();
      if (sid) return spotList.find(function (s) { return String(s.id).trim() === sid; }) || null;
      if (typeof window.okbmFeedBelongsToMapSpot !== 'function' || !f.spot) return null;
      return spotList.find(function (s) { return window.okbmFeedBelongsToMapSpot(f.spot, s, ''); }) || null;
    }
    list.concat(mine).forEach(function (f) {
      if (!f || !f.id || seen[f.id]) return;
      seen[f.id] = 1;
      var ph = realPhotos(f);
      if (!ph.length) return;
      var s = spotFor(f);
      if (!s) return;
      var b = bySpot[s.id] || (bySpot[s.id] = { all: [], mine: [] });
      var item = { id: f.id, photos: ph, likes: Number(f.likes_count) || 0, at: f.created_at || '' };
      if (uidMe && String(f.user_id) === uidMe) b.mine.push(item);
      if (list.indexOf(f) !== -1) b.all.push(item);
    });
    Object.keys(bySpot).forEach(function (id) {
      bySpot[id].all.sort(function (a, b) { return (b.likes - a.likes) || String(b.at).localeCompare(String(a.at)); });
      bySpot[id].mine.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    });
  }

  // ------------------------------------------------------------------ 보이는 모양
  // url(사진) · gray(흑백) · green(사진 없는 다녀옴) · stamp(다녀옴 도장) · mine(내 사진) · likes
  function spotLook(s) {
    var b = bySpot[s.id] || { all: [], mine: [] };
    var top = b.all[0];
    if (mode === 'all') return top ? { url: top.photos[0], likes: top.likes } : {};
    if (b.mine.length) return { url: b.mine[0].photos[0], mine: true };
    if (visitedSet().has(String(s.id).trim())) return top ? { url: top.photos[0], gray: true, stamp: true } : { green: true, stamp: true };
    return {};
  }
  function groupLook(spots) {
    var looks = spots.map(spotLook);
    if (mode === 'all') {
      var best = null;
      looks.forEach(function (l) { if (l.url && (!best || l.likes > best.likes)) best = l; });
      return best || {};
    }
    var p = looks.find(function (l) { return l.mine; });
    if (p) return p;
    var v = looks.find(function (l) { return l.gray; }) || looks.find(function (l) { return l.green; });
    if (!v) return {};
    return v.gray ? { url: v.url, gray: true } : { green: true };
  }

  // ------------------------------------------------------------------ 사진 줄이기
  // 사진은 img.romanticroute.kr(R2 버킷에 붙인 우리 도메인, Cloudflare 캐시)에서 Cloudflare가 줄여 준 것을 받는다.
  //   https://img.romanticroute.kr/cdn-cgi/image/width=W,quality=70,fit=scale-down,format=auto/<원본 키>
  // 같은 사진·같은 크기는 한 번만 줄이고(월 5,000건 무료) 그다음부터는 캐시에서 나간다. 지도엔 피드 대표 사진만 나온다.
  // R2가 아닌 사진이나 실패하면 원본을 받아 기기에서 줄인다(thumb).
  var R2_BASE = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/';
  var IMG_BASE = 'https://img.romanticroute.kr/';
  // 새 주소가 한 번 실패하면(도메인 미연결·이미지 줄이기 꺼짐 등) 이번에 열린 동안은 바로 원본 쪽으로 간다.
  var cdnDown = false;
  function cdnUrl(url, w) {
    if (cdnDown || !url || url.indexOf(R2_BASE) !== 0) return null;
    return IMG_BASE + 'cdn-cgi/image/width=' + w + ',quality=70,fit=scale-down,format=auto/' + url.slice(R2_BASE.length).split('?')[0];
  }
  var cdnLoads = new Map();
  function bestThumb(url, size) {
    var c = cdnUrl(url, size);
    if (!c) return thumb(url, size);
    if (cdnLoads.has(c)) return cdnLoads.get(c);
    var p = new Promise(function (ok) {
      var img = new Image();
      // 다 풀린(decode) 뒤에 넘겨야 바꿔 끼울 때 잠깐 비지 않는다
      img.onload = function () { if (img.decode) img.decode().then(function () { ok(c); }, function () { ok(c); }); else ok(c); };
      img.onerror = function () { cdnDown = true; thumb(url, size).then(ok); };
      img.src = c;
    });
    cdnLoads.set(c, p);
    return p;
  }

  // 전국 화면이 뜬 뒤, 박지 칸 사진을 뒤에서 조용히 미리 받아 둔다(확대하면 바로 뜨게)
  var SPOT_PX = 640, preloadToken = 0;
  function preloadSpotPhotos() {
    var token = ++preloadToken;
    var urls = [];
    spotList.forEach(function (s) { var l = spotLook(s); if (l.url) urls.push(l.url); });
    urls = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
    var i = 0, active = 0;
    function next() {
      while (opened && token === preloadToken && active < 3 && i < urls.length) {
        active++;
        bestThumb(urls[i++], SPOT_PX).then(function () { active--; next(); });
      }
    }
    setTimeout(next, 1500);
  }

  function thumb(url, size) {
    var key = size + '|' + url;
    if (thumbs.has(key)) return thumbs.get(key);
    var p = new Promise(function (ok) { thumbQueue.push({ url: url, size: size, ok: ok }); pumpThumbs(); });
    thumbs.set(key, p);
    return p;
  }
  function pumpThumbs() {
    while (thumbActive < 4 && thumbQueue.length) {
      var job = thumbQueue.shift(); thumbActive++;
      (function (job) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        var done = function (out) { thumbActive--; job.ok(out); img.src = ''; pumpThumbs(); };
        img.onload = function () {
          try {
            var w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, job.size / Math.max(w, h));
            var c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            c.toBlob(function (b) { done(b ? URL.createObjectURL(b) : job.url); }, 'image/jpeg', 0.8);
          } catch (e) { done(job.url); }
        };
        // 앱의 다른 화면이 같은 사진을 <img>로 먼저 받으면 Access-Control 머리말 없는 응답이 캐시에 남는다(R2는 Origin 없는 요청에 그 머리말을 안 주고 Vary도 없다).
        // 그래서 꼬리표를 붙여 따로 받고, 그래도 안 되면 원본을 그대로 쓴다.
        img.onerror = function () { done(job.url); };
        img.src = job.url + (job.url.indexOf('?') === -1 ? '?' : '&') + 'pm=1';
      })(job);
    }
  }

  // ------------------------------------------------------------------ 그리기
  function bboxOfPath(d) {
    var t = svg.append('path').attr('d', d); var b = t.node().getBBox(); t.remove();
    return [[b.x, b.y], [b.x + b.width, b.y + b.height]];
  }

  // 모양으로 자른 사진 자리. 실제 사진은 화면에 보일 때 줄여서 넣는다(ensureImages).
  function photoSlot(g, d, box, url, size, cls) {
    var id = 'pmc' + (uid++);
    defs.append('clipPath').attr('id', id).append('path').attr('d', d);
    return g.append('image')
      .attr('x', box[0][0]).attr('y', box[0][1]).attr('width', box[1][0] - box[0][0]).attr('height', box[1][1] - box[0][1])
      .attr('preserveAspectRatio', 'xMidYMid slice').attr('clip-path', 'url(#' + id + ')')
      .attr('class', 'pm-img ' + (cls || '')).attr('data-src', url).attr('data-size', size)
      .attr('data-box', [box[0][0], box[0][1], box[1][0], box[1][1]].join(','));
  }

  function fillShape(g, d, box, look, size, onClick, cls) {
    g.append('path').attr('d', d).attr('class', 'pm-region').attr('fill', look.green ? 'var(--pm-green)' : 'var(--pm-empty)').on('click', onClick);
    if (look.url) return photoSlot(g, d, box, look.url, size, (look.gray ? 'pm-gray ' : '') + (cls || ''));
    return null;
  }

  function draw() {
    defs.selectAll('*').remove();
    ['sido', 'sgg', 'spot', 'edge', 'dot', 'lbl'].forEach(function (n) { L[n].selectAll('*').remove(); });
    uid = 0;

    // 시·도는 칸을 채우지 않고 굵은 경계선과 이름만 둔다
    sidos.forEach(function (s) {
      // 전국 화면에서 광역시 이름은 도 이름과 겹쳐서 뺀다
      if (METRO[s.code]) return;
      L.lbl.append('text').attr('class', 'pm-lbl pm-lp').attr('x', s.c[0]).attr('y', s.c[1]).text(s.name);
    });

    // 1단계: 시·군·구
    sggs.forEach(function (c) {
      var look = groupLook(c.spots); c.look = look;
      var g = L.sgg.append('g').attr('data-sgg', c.code + c.name);
      fillShape(g, c.d, c.box, look, THUMB.sgg, function () { zoomToBox(c.box, 0.86, LEVEL_SPOT + 0.3); }, 'pm-sggimg');
      L.lbl.append('text').attr('class', 'pm-lbl pm-lc' + (look.url || look.green ? '' : ' pm-empty-lbl'))
        .attr('x', c.c[0]).attr('y', c.c[1]).attr('data-w', c.box[1][0] - c.box[0][0]).text(c.name);
    });

    sggs.forEach(function (c) { L.edge.append('path').attr('d', c.d).attr('class', 'pm-edge pm-edge-sgg'); });
    sidos.forEach(function (c) { L.edge.append('path').attr('d', c.d).attr('class', 'pm-edge pm-edge-sido'); });
    spotDrawn = false; spotShown = false;
    update(true);
    // 박지 칸은 확대해야 보이니 처음 화면이 뜬 뒤 쉬는 틈에 그린다(그 전에 박지 단계로 들어가면 그때 바로 그린다)
    var token = ++spotDrawToken;
    setTimeout(function () {
      if (token !== spotDrawToken || spotDrawn) return;
      var go = function () { if (token === spotDrawToken && !spotDrawn) { drawSpotLayer(); update(true); } };
      if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else go();
    }, 300);
  }

  var spotDrawn = false, spotDrawToken = 0;
  function ensureSpotLayer() { if (!spotDrawn) drawSpotLayer(); }

  // 3단계: 박지 칸 (시군구 모양을 가장 가까운 박지 기준으로 나눔) + 실제 자리 점
  function drawSpotLayer() {
    spotDrawn = true;
    sggs.forEach(function (c) {
      if (!c.spots.length) return;
      var g = L.spot.append('g').attr('data-sgg', c.code + c.name);
      var cid = 'pmcc' + (uid++);
      defs.append('clipPath').attr('id', cid).append('path').attr('d', c.d);
      var inner = g.append('g').attr('clip-path', 'url(#' + cid + ')');
      var pts = c.spots.map(function (s) { return s.__pmXY; });
      var vor = d3.Delaunay.from(pts).voronoi([c.box[0][0], c.box[0][1], c.box[1][0], c.box[1][1]]);
      c.spots.forEach(function (s, i) {
        var poly = vor.cellPolygon(i); if (!poly) return;
        var d = 'M' + poly.join('L') + 'Z';
        var box = [[d3.min(poly, function (p) { return p[0]; }), d3.min(poly, function (p) { return p[1]; })], [d3.max(poly, function (p) { return p[0]; }), d3.max(poly, function (p) { return p[1]; })]];
        var cg = inner.append('g');
        var fresh = String(s.id) === String(freshSpotId);
        var img = fillShape(cg, d, box, spotLook(s), THUMB.spot, function () { openSheet(s); }, fresh ? 'pm-fresh pm-gray' : '');
        if (img && fresh) { img.attr('data-fresh', '1'); freshSpotId = null; }
        cg.append('path').attr('d', d).attr('class', 'pm-cellline');
      });
      c.spots.forEach(function (s) {
        var l = spotLook(s);
        // 사진 있는 박지: 흰 점·초록 테두리 / 다녀옴: 초록 점 / 아직 빈 박지: 주황 점(눈에 띄게)
        var filled = mode === 'mine' ? l.mine : !!l.url;
        var fill = filled ? '#fff' : (mode === 'mine' && l.stamp) ? 'var(--pm-accent)' : 'var(--pm-spot)';
        L.dot.append('circle').attr('class', 'pm-dot').attr('data-sgg', c.code + c.name).attr('cx', s.__pmXY[0]).attr('cy', s.__pmXY[1])
          .attr('fill', fill).attr('stroke', filled ? 'var(--pm-accent)' : '#fff')
          .on('click', function () { openSheet(s); });
        if (l.stamp) L.lbl.append('text').attr('class', 'pm-stamp').attr('data-sgg', c.code + c.name).attr('x', s.__pmXY[0]).attr('y', s.__pmXY[1]).attr('dy', '-0.818em').text('✓ 다녀옴');
        L.lbl.append('text').attr('class', 'pm-lbl pm-ls' + (l.url || l.green ? '' : ' pm-empty-lbl')).attr('data-sgg', c.code + c.name)
          .attr('x', s.__pmXY[0]).attr('y', s.__pmXY[1]).attr('dy', '1.545em').text(String(s.spot_main || s.name || '').trim());
      });
    });
  }

  // ------------------------------------------------------------------ 확대 단계
  function level() { return k < LEVEL_SPOT ? 1 : 2; }

  function centerLL() {
    var t = d3.zoomTransform(svg.node());
    var p = t.invert([hostW / 2, hostH / 2 + 20]);
    return proj.invert(p);
  }
  function containing(list, ll) {
    return list.find(function (g) { return d3.geoContains(g.geom, ll); }) || null;
  }

  // 손가락 이벤트가 한 프레임에 여러 번 와도 한 번만 돈다. 첫 번째는 바로 하고(다음 프레임으로 미루면 계산이 두 번 된다)
  // 같은 프레임에 또 오면 다음 프레임에 몰아서 한 번.
  var raf = 0, dirty = false;
  function requestUpdate() {
    if (raf) { dirty = true; return; }
    update();
    raf = requestAnimationFrame(function () { raf = 0; if (dirty) { dirty = false; update(); } });
  }

  var spotShown = false, revealToken = 0;
  function revealSpots() {
    var token = revealToken;
    var waits = ensureImages() || [];
    var show = function () {
      if (token !== revealToken || level() !== 2) return;
      spotShown = true;
      L.spot.style('opacity', 1);
      setTimeout(function () { if (token === revealToken && level() === 2) L.sgg.selectAll('.pm-sggimg').style('opacity', 0); }, 320);
    };
    if (spotShown || !waits.length) return show();
    // 오래 걸리면 0.7초 뒤엔 그냥 보인다
    Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, 700); })]).then(show);
  }

  // 단계(lv·wide)와 보고 있는 시군구가 바뀔 때만 스타일을 다시 쓴다. 글자·점 크기는 CSS 변수 --pm-k 하나로 맞춘다.
  var shown = { lv: 0, wide: null, sggKey: null, sidoKey: null };
  function update(force) {
    var lv = level();
    var wide = k < LEVEL_SGG; // 전국을 보는 중
    // 맨 위(root)에 걸면 사진·칸까지 수천 개 스타일을 다시 계산하므로 글자·점 묶음에만 건다
    L.lbl.style('--pm-k', k); L.dot.style('--pm-k', k);
    if (force || lv !== shown.lv || wide !== shown.wide) {
      shown.lv = lv; shown.wide = wide; shown.sggKey = null; shown.sidoKey = null; shown.lcHidden = false;
      if (lv === 2) ensureSpotLayer();
      L.sido.style('display', 'none');
      L.sgg.selectAll('.pm-region').style('pointer-events', lv === 1 ? null : 'none');
      // 박지 단계로 갈 때 시·군 사진은 박지 사진이 준비될 때까지 그대로 둔다(빈칸이 먼저 깔려 반짝이지 않게)
      revealToken++;
      if (lv === 2) { L.spot.style('display', null); if (!spotShown) L.spot.style('opacity', 0); revealSpots(); }
      else { spotShown = false; L.spot.style('display', 'none').style('opacity', 0); L.sgg.selectAll('.pm-sggimg').style('opacity', 1); }
      L.edge.selectAll('.pm-edge-sgg').attr('stroke-width', lv === 2 ? 3 : wide ? 0.5 : 1);
      L.edge.selectAll('.pm-edge-sido').attr('stroke-width', lv === 2 ? 0 : 2);
      L.lbl.selectAll('.pm-lp').style('display', wide ? null : 'none');
      L.lbl.selectAll('.pm-ls,.pm-stamp').style('display', lv === 2 ? null : 'none');
      L.dot.style('display', lv === 2 ? null : 'none');
      // CSS r을 못 쓰는 브라우저도 대강 맞게
      if (lv === 2) L.dot.selectAll('.pm-dot').attr('r', 6.5 / k);
    }
    // 시군구 이름은 칸이 화면에서 46px보다 넓을 때만(확대 정도에 따라 바뀌므로 시군구 단계에선 매번 본다)
    if (lv === 1 && !wide) {
      L.lbl.selectAll('.pm-lc').each(function () {
        var on = Number(this.getAttribute('data-w')) * k > 46;
        if (this.__pmOn !== on) { this.__pmOn = on; this.style.display = on ? '' : 'none'; }
      });
    } else if (shown.lcHidden !== true) {
      L.lbl.selectAll('.pm-lc').each(function () { this.__pmOn = false; this.style.display = 'none'; });
    }
    shown.lcHidden = !(lv === 1 && !wide);

    var ll = centerLL();
    var sido = containing(sidos, ll);
    var sgg = lv === 2 ? containing(sggs, ll) : null;
    var sggKey = sgg ? sgg.code + sgg.name : '', sidoKey = sido ? sido.code : '';
    // 박지 단계: 보고 있는 시군구만 또렷하게(중심 시군구가 바뀔 때만)
    if (lv === 2 && sggKey !== shown.sggKey) {
      L.spot.selectAll('g[data-sgg]').style('opacity', function () { return this.getAttribute('data-sgg') === sggKey ? 1 : 0.35; });
      L.dot.selectAll('.pm-dot').style('opacity', function () { return this.getAttribute('data-sgg') === sggKey ? 1 : 0.4; });
      L.lbl.selectAll('.pm-ls,.pm-stamp').style('opacity', function () { return this.getAttribute('data-sgg') === sggKey ? 1 : 0.4; });
    }
    if (sggKey !== shown.sggKey || sidoKey !== shown.sidoKey) setHeader(lv, sido, sgg);
    shown.sggKey = sggKey; shown.sidoKey = sidoKey;
    scheduleImages();
  }

  function countText(spots) {
    if (mode === 'mine') {
      var b = 0, v = 0, vs = visitedSet();
      spots.forEach(function (s) { var x = bySpot[s.id]; if (x && x.mine.length) b++; else if (vs.has(String(s.id).trim())) v++; });
      return '내 피드 박지 <b>' + b + '</b> / ' + spots.length + (v ? ' · 다녀옴 ' + v : '');
    }
    var n = spots.filter(function (s) { return bySpot[s.id] && bySpot[s.id].all.length; }).length;
    return '피드 등록 박지 <b>' + n + '</b> / ' + spots.length;
  }

  function setHeader(lv, sido, sgg) {
    var stat;
    if (k < LEVEL_SGG || !sido) {
      stat = countText(spotList);
    } else if (lv === 1 || !sgg) {
      var all = []; sido.sggs.forEach(function (g) { all = all.concat(g.spots); });
      stat = countText(all);
    } else {
      stat = sgg.spots.length ? countText(sgg.spots) : '아직 등록된 박지가 없어요';
    }
    host.querySelector('.pm-stat').innerHTML = stat;
  }

  // 화면에 보이는 칸의 사진만 줄여서 넣는다.
  // 확대해서 칸이 커지면 한 단계 큰 사진으로 바꿔 끼운다(다 받은 뒤에 바꿔서 깜빡이지 않게).
  // 크기는 단계로 고정한다: Cloudflare가 사진·크기마다 한 번씩 줄이므로(월 5,000건 무료) 단계가 적어야 건수가 안 는다.
  // 원본을 받아 기기에서 줄이는 쪽(thumb)은 무거워서 1080까지만.
  var SIZES = [120, 320, 640, 1080, 1600], THUMB_MAX = 1080;
  function sizeFor(need) {
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i] >= need) return SIZES[i];
    return SIZES[SIZES.length - 1];
  }
  var imgTimer = null;
  function scheduleImages() { clearTimeout(imgTimer); imgTimer = setTimeout(ensureImages, 120); }
  function ensureImages() {
    if (!opened) return;
    var t = d3.zoomTransform(svg.node());
    var x0 = t.invertX(0), y0 = t.invertY(0), x1 = t.invertX(hostW), y1 = t.invertY(hostH);
    var lv = level();
    var layer = lv === 1 ? L.sgg : L.spot;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var waits = [];
    layer.selectAll('image.pm-img').each(function () {
      var el = this;
      if (lv === 2 && el.classList.contains('pm-sggimg')) return;
      var b = el.getAttribute('data-box').split(',').map(Number);
      if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) return;
      // 화면에서 칸이 차지하는 크기만큼만 줄인다(전국에선 작은 칸이 많다). 박지 단계는 640부터.
      var src = el.getAttribute('data-src');
      var need = Math.max(b[2] - b[0], b[3] - b[1]) * t.k * dpr;
      var size = sizeFor(lv === 2 ? Math.max(SPOT_PX, need * 0.8) : need);
      if (!cdnUrl(src, size)) size = Math.min(size, THUMB_MAX);
      var have = Number(el.getAttribute('data-have')) || 0, want = Number(el.getAttribute('data-want')) || 0;
      if (have >= size || want >= size) return;
      el.setAttribute('data-want', size);
      if (!have) el.setAttribute('href', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
      var p = bestThumb(src, size).then(function (u) {
        if (!u || (Number(el.getAttribute('data-have')) || 0) >= size) return;
        el.setAttribute('href', u);
        el.setAttribute('data-have', size);
        el.classList.add('pm-in');
        if (el.getAttribute('data-fresh')) setTimeout(function () { el.classList.remove('pm-gray'); }, 120);
      });
      if (!have) waits.push(p);
    });
    return waits;
  }

  function zoomToBox(box, fit, minK) {
    var W = hostW, H = hostH;
    var dx = box[1][0] - box[0][0], dy = box[1][1] - box[0][1];
    var s = Math.min(80, fit / Math.max(dx / W, dy / (H - 200)));
    if (minK) s = Math.max(s, minK);
    svg.transition().duration(600).call(zoom.transform,
      d3.zoomIdentity.translate(W / 2, H / 2 + 24).scale(s).translate(-(box[0][0] + box[1][0]) / 2, -(box[0][1] + box[1][1]) / 2));
  }

  // ------------------------------------------------------------------ 박지 보기 창
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function sheetEls() {
    var dim = document.getElementById('pmDim');
    if (dim) return { dim: dim, card: document.getElementById('pmSheet') };
    dim = document.createElement('div'); dim.id = 'pmDim'; dim.className = 'pm-dim';
    var card = document.createElement('div'); card.id = 'pmSheet'; card.className = 'pm-sheet';
    document.body.appendChild(dim); document.body.appendChild(card);
    dim.addEventListener('click', closeSheet);
    return { dim: dim, card: card };
  }
  function closeSheet() {
    var dim = document.getElementById('pmDim'), card = document.getElementById('pmSheet');
    if (dim) dim.style.display = 'none';
    if (card) card.style.display = 'none';
  }

  function openSheet(s) {
    var e = sheetEls(), card = e.card;
    var look = spotLook(s), b = bySpot[s.id] || { all: [], mine: [] };
    var guest = !loggedIn();
    var photos = [];
    if (look.mine) b.mine.forEach(function (f) { photos = photos.concat(f.photos); });
    else if (look.url) b.all.forEach(function (f) { photos = photos.concat(f.photos); });
    photos = photos.slice(0, 12);
    var name = String(s.spot_main || s.name || '').trim();
    var sub = guest ? '' : String(s.spot_sub || '').trim();
    var place = String(s.cityName || '').trim();
    var st = mode === 'mine' ? (look.mine ? 'photo' : look.stamp ? 'visited' : 'none') : 'all';
    var line = '', note = '';
    if (st === 'all') line = b.all.length ? '후기 ' + b.all.length + '개' : '아직 후기가 없어요';
    else if (st === 'photo') line = '내 사진으로 채운 곳';
    else if (st === 'visited') { line = '✓ 다녀옴 · 아직 내 사진이 없어요'; note = look.url ? '흑백 사진: 다른 회원의 후기' : '이 박지는 아직 아무도 사진을 안 올렸어요. 첫 사진의 주인공이 되어 보세요!'; }
    else line = '아직 안 가 본 곳';

    var btns = [];
    if (guest) btns.push(['login', '로그인하고 박지 정보 보기', '']);
    else if (st === 'none') { btns.push(['visit', '✓ 다녀왔어요', 'ghost']); btns.push(['write', '📷 후기 올리기', '']); }
    else if (st === 'visited') { btns.push(['unvisit', '다녀옴 취소', 'ghost']); btns.push(['write', '📷 사진 올리고 색 입히기', '']); }
    else { btns.push(['info', '박지 정보 보기', 'ghost']); btns.push(['write', '📷 후기 올리기', '']); }

    card.innerHTML =
      '<div class="pm-grab"></div><button type="button" class="pm-x" data-pm="close" aria-label="닫기">×</button>' +
      (photos.length ? '<div class="pm-gal' + (look.gray ? ' pm-gal-gray' : '') + '">' + photos.map(function (u) { return '<img alt="" loading="lazy" data-orig="' + esc(u) + '" src="' + esc(cdnUrl(u, 1080) || u) + '">'; }).join('') + '</div>' +
        (photos.length > 1 ? '<div class="pm-gcount">1 / ' + photos.length + '</div>' : '') : '<div class="pm-nophoto"></div>') +
      '<div class="pm-sheet-t"><b>' + esc(name) + (sub ? ' · ' + esc(sub) : '') + '</b><small>' + esc(place) + ' · ' + esc(line) + '</small>' + (note ? '<i>' + esc(note) + '</i>' : '') + '</div>' +
      '<div class="pm-btns">' + btns.map(function (x) { return '<button type="button" class="' + x[2] + '" data-pm="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
    card.classList.toggle('pm-sheet-plain', !photos.length);
    e.dim.style.display = 'block'; card.style.display = 'block';
    card.style.animation = 'none'; void card.offsetHeight; card.style.animation = '';

    var gal = card.querySelector('.pm-gal'), gc = card.querySelector('.pm-gcount');
    // 새 주소 사진이 안 뜨면 원본으로 바꿔 끼운다
    if (gal) Array.prototype.forEach.call(gal.querySelectorAll('img[data-orig]'), function (im) {
      im.addEventListener('error', function () { var o = im.getAttribute('data-orig'); if (o && im.src !== o) { cdnDown = true; im.src = o; } });
    });
    if (gal && gc) gal.addEventListener('scroll', function () { gc.textContent = (Math.round(gal.scrollLeft / gal.clientWidth) + 1) + ' / ' + photos.length; });
    card.onclick = function (ev) {
      var btn = ev.target.closest('[data-pm]'); if (!btn) return;
      var act = btn.getAttribute('data-pm');
      if (act === 'close') return closeSheet();
      if (act === 'login') {
        try { sessionStorage.setItem('okbm_login_return_spot', String(s.id).trim()); } catch (er) {}
        closeSheet();
        if (typeof window.openLoginModal === 'function') window.openLoginModal({ message: '박지 세부 정보와 내 지도는 회원에게만 보여요.\n로그인하면 바로 볼 수 있어요.' });
        return;
      }
      if (act === 'visit' || act === 'unvisit') {
        if (window.RomanticVault && typeof window.RomanticVault.toggleVisited === 'function') window.RomanticVault.toggleVisited(s.id);
        draw(); openSheet(s);
        toast(act === 'visit' ? '다녀옴 표시! 사진을 올리면 색이 입혀져요' : '다녀옴을 지웠어요');
        return;
      }
      if (act === 'info') { closeSheet(); if (typeof window.okbmPhotoMapGoToSpot === 'function') window.okbmPhotoMapGoToSpot(s); return; }
      if (act === 'write') { closeSheet(); openWrite(s, ev); }
    };
  }

  // 지도에서 쓰는 "사진과 함께 올리기" 창을 그대로 연다. 창이 닫히면 내 후기를 다시 받아 색을 입힌다.
  function openWrite(s, ev) {
    if (typeof window.openPastTripRegisterModal !== 'function') return;
    window.openPastTripRegisterModal(ev);
    if (!document.getElementById('pastTripRegisterModal')) return; // 로그인 창이 뜬 경우
    var pool = typeof window._pastTripBuildSpotSearchPool === 'function' ? window._pastTripBuildSpotSearchPool() : [];
    var item = pool.find(function (p) { return String(p.id) === String(s.id); });
    if (item && typeof window.selectPastTripSpot === 'function') window.selectPastTripSpot(item, false);
    var before = (bySpot[s.id] && bySpot[s.id].mine.length) || 0;
    var timer = setInterval(function () {
      if (document.getElementById('pastTripRegisterModal')) return;
      clearInterval(timer);
      fetchMyFeeds().then(function (mine) {
        feedsMine = mine; attachFeeds();
        var after = (bySpot[s.id] && bySpot[s.id].mine.length) || 0;
        if (after > before) {
          if (mode !== 'mine') setMode('mine', true);
          freshSpotId = s.id; draw();
          toast(String(s.spot_main || '') + '에 내 사진으로 색을 입혔어요!');
        }
      });
    }, 800);
  }

  var toastTimer = null;
  function toast(t) {
    var h = host && host.querySelector('.pm-toast'); if (!h) return;
    h.textContent = t; h.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { h.style.display = 'none'; }, 2600);
  }

  // ------------------------------------------------------------------ 모드
  function setMode(m, silent) {
    if (m === 'mine' && !loggedIn()) {
      if (typeof window.openLoginModal === 'function') window.openLoginModal({ message: '내 지도는 로그인하면 볼 수 있어요.\n다녀온 박지가 사진으로 채워져요.' });
      return;
    }
    mode = m;
    if (m === 'mine' && myId() !== attachedFor) {
      // 사진 지도를 연 뒤 로그인했으면 내 후기를 새로 받는다
      fetchMyFeeds().then(function (mine) { feedsMine = mine; attachFeeds(); draw(); });
    }
    host.querySelectorAll('.pm-seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === m); });
    closeSheet();
    if (!silent) draw();
  }

  // ------------------------------------------------------------------ 열기·닫기
  function buildHost() {
    injectCss();
    var mapEl = document.getElementById('map');
    host = document.createElement('div');
    host.className = 'pm-host';
    host.innerHTML =
      '<svg class="pm-svg"></svg>' +
      '<div class="pm-top"><div class="pm-stat"></div>' +
      '<div class="pm-seg"><button type="button" data-mode="all">모두</button><button type="button" data-mode="mine">내 지도</button></div></div>' +
      '<div class="pm-loading">사진 지도를 불러오는 중…</div>' +
      '<div class="pm-toast"></div>';
    mapEl.appendChild(host);
    host.style.display = 'block'; // 크기를 재야 하므로 먼저 보이게
    host.querySelectorAll('.pm-seg button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    svg = d3.select(host.querySelector('.pm-svg'));
    defs = svg.append('defs');
    root = svg.append('g');
    ['sido', 'sgg', 'spot', 'edge', 'dot', 'lbl'].forEach(function (n) { L[n] = root.append('g').attr('class', 'pm-l-' + n); });
    zoom = d3.zoom().scaleExtent([0.3, 120]).on('zoom', function (e) { root.attr('transform', e.transform); k = e.transform.k; requestUpdate(); });
    svg.call(zoom).on('dblclick.zoom', null);
  }

  function setup() {
    if (busy) return busy;
    // 경계·피드는 d3가 필요 없으니 d3와 동시에 받는다
    busy = Promise.all([
      geo ? geo : fetch(GEO_URL).then(function (r) { return r.json(); }),
      fetchPublicFeeds(),
      fetchMyFeeds(),
      loadScript(D3_URL)
    ]).then(function (r) {
      geo = r[0]; feedsAll = r[1]; feedsMine = r[2];
      if (!host) buildHost();
      if (!opened) host.style.display = 'none';
      buildGeo(); buildSpots(); attachFeeds();
    });
    busy.catch(function () { busy = null; });
    return busy;
  }

  // 기본 지도가 보던 범위(위도·경도)를 사진 지도 확대 상태로 바꾼다
  function applyView(v) {
    if (!v || !proj) return;
    var W = hostW, H = hostH;
    var p0 = proj([v.minLng, v.maxLat]), p1 = proj([v.maxLng, v.minLat]);
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    if (!(dx > 0 && dy > 0)) return;
    var s = Math.max(0.3, Math.min(120, Math.min(W / dx, H / dy)));
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(s).translate(-(p0[0] + p1[0]) / 2, -(p0[1] + p1[1]) / 2));
  }
  // 사진 지도가 지금 보는 범위(위도·경도)
  function getView() {
    if (!opened || !host || !proj) return null;
    var t = d3.zoomTransform(svg.node());
    var a = proj.invert(t.invert([0, 0])), b = proj.invert(t.invert([hostW, hostH]));
    if (!a || !b) return null;
    return { minLat: b[1], maxLat: a[1], minLng: a[0], maxLng: b[0] };
  }

  function open(view) {
    opened = true;
    document.body.classList.add('pm-on');
    if (host) host.style.display = 'block';
    var first = !host;
    if (first && typeof window.showToast === 'function') window.showToast('사진 지도를 불러오는 중이에요');
    return setup().then(function () {
      if (!opened) return;
      host.style.display = 'block';
      host.querySelector('.pm-loading').style.display = 'none';
      if (first) {
        // 회원이고 내 기록이 있으면 내 지도부터
        var hasMine = loggedIn() && (Object.keys(bySpot).some(function (id) { return bySpot[id].mine.length; }) || visitedSet().size > 0);
        mode = hasMine ? 'mine' : 'all';
        host.querySelectorAll('.pm-seg button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mode); });
      }
      draw();
      applyView(view);
      preloadSpotPhotos();
    }).catch(function (err) {
      console.warn('[photo-map]', err);
      if (typeof window.showToast === 'function') window.showToast('사진 지도를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.');
    });
  }

  function close() {
    opened = false;
    document.body.classList.remove('pm-on');
    closeSheet();
    if (host) host.style.display = 'none';
  }

  // 다른 화면에서 다녀옴을 바꾸면 내 지도도 맞춘다
  window.addEventListener('okbm_visited_changed', function () { if (opened && host && mode === 'mine') draw(); });
  // 주소창이 숨거나 키보드가 뜨는 작은 변화는 그대로 두고, 가로·세로를 돌릴 때처럼 폭이 크게 바뀔 때만 다시 맞춘다
  var lastW = 0;
  window.addEventListener('resize', function () {
    if (!opened || !host || !geo) return;
    clearTimeout(window.__pmResize);
    window.__pmResize = setTimeout(function () {
      var w = host.clientWidth;
      if (Math.abs(w - lastW) < 120) { measure(); return; }
      lastW = w;
      buildGeo(); buildSpots(); svg.call(zoom.transform, d3.zoomIdentity); draw();
    }, 250);
  });

  window.okbmPhotoMap = { open: open, close: close, getView: getView, isOpen: function () { return opened; } };
})();
