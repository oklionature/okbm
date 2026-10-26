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
// 그리기는 캔버스 한 장(아래 "그리기"). 예전 SVG 판은 photo-map-svg.js로 남겨 두고 주소 끝에 ?pm=svg를 붙이면 그걸 쓴다.
// 사진은 img.romanticroute.kr에서 Cloudflare가 줄여 준 것을 받고, 안 되면 원본을 받아 기기 안에서 줄인다(아래 "사진 줄이기").
// =========================================================================
(function () {
  'use strict';

  // 예전 판(SVG)으로 보기: 주소 끝 ?pm=svg (그 파일이 window.okbmPhotoMap을 만든다)
  if (/[?&]pm=svg\b/.test(location.search)) {
    var old = document.createElement('script'); old.src = 'photo-map-svg.js?v=12'; document.head.appendChild(old);
    return;
  }

  var GEO_URL = 'photo-map/korea-sgg-202610.json?v=2';
  var D3_URL = 'vendor/d3-7.9.0.min.js';
  // 처음부터 시·군·구 칸으로 보여 준다(시·도를 통째로 채우면 사진 한두 장에 도 전체가 차 버려 빈칸이 안 보인다).
  // LEVEL_SGG: 이보다 확대하면 시·군·구 이름과 '도' 단위 진행도를 보여 준다 / LEVEL_SPOT: 이보다 확대하면 박지 칸
  var LEVEL_SGG = 2.4, LEVEL_SPOT = 6;
  var METRO = { '11': 1, '26': 1, '27': 1, '28': 1, '29': 1, '30': 1, '31': 1, '36': 1 };

  var host = null;
  // 화면 크기: 확대 중에 host.clientWidth를 읽으면 강제 레이아웃이 생겨서 열 때·resize 때만 잰다
  var hostW = 0, hostH = 0, OVER = 0.3;
  function measure() { hostW = host.clientWidth || window.innerWidth; hostH = host.clientHeight || window.innerHeight; }
  // 확대 상태는 손가락 받는 판(stage)에 있다. 그림에 실제로 적용된 건 committed.
  var stage = null, committed = null;
  function zt() { return d3.zoomTransform(stage.node()); }
  // t 상태로 다시 그린다. 같은 순간에 CSS로 옮겨 둔 것을 풀어야 한 장도 튀지 않는다.
  function commit(t) {
    committed = t; k = t.k;
    update();
    render();
    canvas.style.transform = '';
  }
  // 그린 그림을 통째로 키우고 옮기기만(그래픽 칩이 해서 가볍다): 마지막으로 그린 상태에서 바뀐 만큼
  function moveCanvas(t) {
    var c = committed || d3.zoomIdentity, sc = t.k / c.k;
    canvas.style.transform = 'translate(' + (t.x - sc * c.x) + 'px,' + (t.y - sc * c.y) + 'px) scale(' + sc + ')';
  }
  var proj = null, gpath = null, zoom = null, k = 1;
  var geo = null, feedsAll = null, feedsMine = null;
  var sidos = [], sggs = [], spotList = [], bySpot = {};
  var mode = 'all', opened = false, freshSpotId = null, busy = null;
  var thumbs = new Map(), thumbQueue = [], thumbActive = 0;

  var CSS = [
    // 지도 색은 카카오 일반 지도(테마와 상관없이 밝은 바다·땅)에 맞추고, 위에 뜨는 버튼만 앱 테마를 따른다
    '.pm-host{position:absolute;inset:0;z-index:50;display:none;background:var(--pm-bg);--pm-bg:#aad3ea;--pm-empty:#f1efe9;--pm-green:#cfe6d5;--pm-accent:#2f8a62;--pm-line:#fff;--pm-sub:#3f4642;--pm-spot:#ff6a2b;--pm-ink:#fff;--pm-chip:#151b23;--pm-chip-sub:#94a3b8;}',
    'html[data-theme="light"] .pm-host{--pm-ink:#1d2320;--pm-chip:#fff;--pm-chip-sub:#6b726d;}',
    // 사진 모드에선 검색창·필터·확대 버튼을 숨기고, 진행도와 모두/내 지도를 검색창 자리로 올린다
    'body.pm-on #leftBottomFilterWrap,body.pm-on #rightBottomHudGroup,body.pm-on .floating-top-search-wrap{display:none!important;}',
    // 손가락 받는 판(pm-stage)은 화면 크기, 캔버스는 사방으로 30%씩 더 크게 그려 둔다(움직이는 동안 가장자리가 비지 않게).
    '.pm-stage{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:pointer;}',
    '.pm-canvas{position:absolute;left:-30%;top:-30%;width:160%;height:160%;transform-origin:18.75% 18.75%;will-change:transform;}',
    '.pm-top{position:absolute;top:calc(var(--okbm-status-top, env(safe-area-inset-top, 0px)) + 8px);left:10px;right:10px;display:flex;gap:8px;align-items:center;justify-content:space-between;z-index:2;}',
    // 모두/내 지도와 한눈에 보기는 같은 높이(30px)
    '.pm-seg{display:flex;height:30px;box-sizing:border-box;background:var(--pm-chip);border-radius:999px;padding:2px;box-shadow:0 2px 10px rgba(0,0,0,.2);flex:none;}',
    '.pm-seg button{border:0;background:none;height:26px;padding:0 11px;border-radius:999px;font-size:12.5px;line-height:26px;color:var(--pm-chip-sub);font-weight:600;}',
    '.pm-seg button.on{background:var(--pm-accent);color:#fff;}',
    // 위쪽 왼쪽 제목: 공유 이미지(포토맵 카드)와 같은 모양. 바다(밝은 하늘색) 위라 늘 짙은 글씨, 지도에 걸려도 읽히게 흰 테두리
    '.pm-top{align-items:flex-start;}',
    '.pm-head{min-width:0;color:#1d2320;text-shadow:0 0 3px #aad3ea,0 0 6px #aad3ea;transition:opacity .25s;pointer-events:none;}',
    '.pm-head .e{font:700 9px/1 "Space Grotesk",sans-serif;letter-spacing:.2em;color:#2f5d48;margin-top:4px;white-space:nowrap;}',
    '.pm-head .t{font-family:"Noto Serif KR",serif;font-weight:600;font-size:20px;line-height:1.2;margin-top:7px;white-space:nowrap;}',
    '.pm-head .r{width:22px;height:2px;background:#2f5d48;margin:8px 0 6px;}',
    '.pm-head .n{font:700 36px/1 "Space Grotesk",sans-serif;letter-spacing:-.02em;}',
    '.pm-head .n small{font:500 14px/1 "Space Grotesk",sans-serif;color:#2f5d48;letter-spacing:0;margin-left:4px;}',
    // 숫자를 누르면 시·군 ↔ 박지. 단위 글씨 옆 ⇄로 바뀐다는 걸 보인다
    '.pm-head button.n{pointer-events:auto;display:block;border:0;background:none;padding:2px 0;margin:0;color:inherit;text-shadow:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
    '.pm-head button.n:active{opacity:.6;}',
    '.pm-head .n .sw{display:inline-block;margin-left:4px;font-size:12px;color:#2f5d48;}',
    // 확대하면 제목은 지도를 가리지 않게 숨긴다
    '.pm-zoomed .pm-head{opacity:0;}',
    // 오른쪽: 모두/내 지도 밑에 한눈에 보기(사이 4px)
    '.pm-side{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none;}',
    '.pm-cardbtn{border:0;display:flex;align-items:center;gap:6px;height:30px;box-sizing:border-box;background:var(--pm-chip);color:var(--pm-ink);font-size:12.5px;font-weight:700;padding:0 13px 0 11px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.2);}',
    '.pm-cardbtn svg{width:14px;height:14px;}',
    // 포토맵 카드: 화면 전체에 공유 이미지를 크게, 밑에 저장·보내기
    '.pm-card{position:fixed;inset:0;z-index:2147483647;background:rgba(12,17,24,.94);display:none;flex-direction:column;align-items:center;justify-content:center;padding:calc(var(--okbm-status-top, env(safe-area-inset-top, 0px)) + 52px) 16px calc(env(safe-area-inset-bottom,0px) + 20px);gap:16px;}',
    '.pm-card.on{display:flex;animation:pmFade .2s ease-out;}',
    '@keyframes pmFade{from{opacity:0;}}',
    '.pm-card .x{position:absolute;top:calc(var(--okbm-status-top, env(safe-area-inset-top, 0px)) + 10px);right:12px;border:0;border-radius:50%;width:36px;height:36px;background:rgba(255,255,255,.14);color:#fff;font-size:20px;}',
    '.pm-card .img{flex:none;width:min(100%, calc((100dvh - var(--okbm-status-top, env(safe-area-inset-top, 0px)) - env(safe-area-inset-bottom,0px) - 160px) * .8));aspect-ratio:4/5;border-radius:10px;overflow:hidden;background:#aad3ea;box-shadow:0 10px 40px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}',
    // 아이폰은 그림을 길게 눌러 사진 앱에 저장할 수 있게 둔다(지도 쪽은 길게 누르기 메뉴를 막아 두었다)
    '.pm-card .img img{width:100%;height:100%;object-fit:contain;display:block;-webkit-touch-callout:default;-webkit-user-select:auto;}',
    '.pm-card .hint{flex:none;margin:-6px 0 -4px;font-size:13px;line-height:1.4;color:#d9e2ea;text-align:center;}',
    '.pm-card .wait{font-size:13px;color:#1d2320;font-weight:700;}',
    '.pm-card .acts{display:flex;gap:10px;width:100%;max-width:420px;flex:none;}',
    '.pm-card .acts button{flex:1;border:0;border-radius:12px;padding:13px 6px;font-size:14.5px;font-weight:700;background:rgba(255,255,255,.14);color:#fff;}',
    '.pm-card .acts button.go{background:#2f9e6a;}',
    '.pm-card .acts button:disabled{opacity:.4;}',
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
  var scriptJobs = {};
  function loadScript(src) {
    if (scriptJobs[src]) return scriptJobs[src];
    var job = scriptJobs[src] = new Promise(function (ok, fail) {
      if (window.d3 && window.d3.geoPath) return ok();
      var s = document.createElement('script');
      s.src = src; s.onload = function () { ok(); }; s.onerror = fail;
      document.head.appendChild(s);
    });
    job.catch(function () { delete scriptJobs[src]; });
    return job;
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

  // 같은 걸 두 번 받지 않게: 미리 받기(prefetch)와 열기(setup)가 겹쳐도 한 번만 받는다
  var geoJob = null, pubFeedsJob = null;
  function loadGeo() {
    if (geo) return Promise.resolve(geo);
    if (!geoJob) { geoJob = fetch(GEO_URL).then(function (r) { return r.json(); }); geoJob.catch(function () { geoJob = null; }); }
    return geoJob;
  }
  function loadPublicFeeds() {
    if (!pubFeedsJob) pubFeedsJob = fetchPublicFeeds().then(function (rows) { pubFeedsJob = null; return rows; });
    return pubFeedsJob;
  }
  // 박지 지도에 들어오고 잠시 뒤, 사진 지도에 쓸 경계·d3·피드 목록(약 230KB)을 뒤에서 미리 받아 둔다.
  // 그러면 사진지도를 누를 때 받는 시간 없이 바로 그린다. 사진은 미리 받지 않는다(데이터 아끼기).
  function prefetch() {
    if (geo || opened) return;
    var c = navigator.connection; if (c && c.saveData) return;
    loadGeo().catch(function () {}); loadPublicFeeds(); loadScript(D3_URL).catch(function () {});
  }
  function schedulePrefetch() {
    setTimeout(function () {
      if (window.requestIdleCallback) requestIdleCallback(prefetch, { timeout: 3000 }); else prefetch();
    }, 4000);
  }
  if (document.readyState === 'complete') schedulePrefetch(); else window.addEventListener('load', schedulePrefetch);

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
    sidos = geo.sido.map(function (s) { var d = gpath(s.g) || ''; return { code: s.c, name: s.n, geom: s.g, d: d, p: new Path2D(d), box: gpath.bounds(s.g), c: gpath.centroid(s.g), sggs: [] }; });
    var sidoBy = {}; sidos.forEach(function (s) { sidoBy[s.code] = s; });
    sggs = geo.sgg.map(function (g) {
      var d = gpath(g.g) || '';
      var o = { code: g.c, name: g.n, geom: g.g, d: d, p: new Path2D(d), box: gpath.bounds(g.g), c: gpath.centroid(g.g), spots: [], sido: sidoBy[g.c] };
      o.bb = bb(o.box);
      if (o.sido) o.sido.sggs.push(o);
      o.geoBox = d3.geoBounds(g.g);
      return o;
    });    allSggPath = new Path2D(sggs.map(function (c) { return c.d; }).join(''));
    allSidoPath = new Path2D(sidos.map(function (c) { return c.d; }).join(''));
    sizeCanvas();
    committed = zt(); k = committed.k;
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
  // ------------------------------------------------------------------ 사진 받기(캔버스에 그릴 그림으로)
  // 같은 사진·크기는 한 번만 받는다. 다 풀린(decode) 그림을 넘겨야 그릴 때 비지 않는다.
  var imgCache = new Map();
  function loadImg(url, size) {
    var key = size + '|' + url;
    if (imgCache.has(key)) return imgCache.get(key);
    var p = new Promise(function (ok) {
      function ready(im) { if (im.decode) im.decode().then(function () { ok(im); }, function () { ok(im); }); else ok(im); }
      // crossOrigin: 공유 이미지로 꺼낼 수 있게(img.romanticroute.kr·R2 모두 Access-Control-Allow-Origin: * 를 준다)
      function fromUrl(u, onFail) {
        var im = new Image(); im.decoding = 'async';
        if (u.indexOf('blob:') !== 0) { im.crossOrigin = 'anonymous'; if (u.indexOf(R2_BASE) === 0) u += (u.indexOf('?') === -1 ? '?' : '&') + 'pm=1'; }
        im.onload = function () { ready(im); }; im.onerror = onFail; im.src = u;
      }
      function fallback() { thumb(url, size).then(function (u) { if (!u) return ok(null); fromUrl(u, function () { ok(null); }); }); }
      var c = cdnUrl(url, size);
      if (!c) return fallback();
      fromUrl(c, function () { cdnDown = true; fallback(); });
    });
    imgCache.set(key, p);
    p.then(function (im) { p.img = im; }); // 메모리 정리(trimImages)에서 바로 꺼내 보려고
    return p;
  }

  // 전국 화면이 뜬 뒤, 박지 칸 사진을 뒤에서 조용히 미리 받아 둔다(확대하면 바로 뜨게).
  // 파일만 받아 브라우저 캐시에 넣고 그림으로 풀지는 않는다: 다 풀어 두면 640px 사진 100여 장이 메모리 230MB를 차지해
  // 아이폰(한 페이지가 쓸 수 있는 메모리가 빡빡하다)이 버벅이거나 페이지를 새로 불러왔다. 풀기는 화면에 보일 때만(ensureImages).
  var SPOT_PX = 640, preloadToken = 0;
  function preloadSpotPhotos() {
    var token = ++preloadToken;
    var c = navigator.connection; if (c && c.saveData) return;
    var urls = [];
    spotList.forEach(function (s) { var l = spotLook(s); var u = l.url && cdnUrl(l.url, SPOT_PX); if (u) urls.push(u); });
    urls = urls.filter(function (u, i) { return urls.indexOf(u) === i; });
    var i = 0, active = 0;
    // <img crossorigin="anonymous">와 같은 요청(CORS, 쿠키 없음)이라 나중에 그림으로 받을 때 캐시에서 꺼낸다
    function next() {
      while (opened && token === preloadToken && !cdnDown && active < 3 && i < urls.length) {
        active++;
        fetch(urls[i++], { mode: 'cors', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.arrayBuffer() : null; })
          .catch(function () {}).then(function () { active--; next(); });
      }
    }
    setTimeout(next, 1500);
  }

  // R2가 아니거나 새 주소가 안 될 때: 원본을 받아 기기에서 줄인다
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

  // ------------------------------------------------------------------ 그리기 (캔버스)
  // 지도는 캔버스 한 장에 직접 그린다. SVG(칸마다 사진을 모양대로 오려 붙이기)는 확대가 바뀔 때마다 휴대폰이 전부 다시 그리느라
  // 다 그리기 전엔 바탕(바다색)이 비쳐 보였다. 캔버스는 새 그림을 다 그릴 때까지 이전 그림이 그대로 남는다.
  // 예전 판은 photo-map-svg.js(주소 끝 ?pm=svg).
  // 좌표: 세계 좌표(전국을 화면에 맞춘 메르카토르 px) → 확대 상태 t → 판(stage) 좌표 → +여분(OVER) → 캔버스 좌표
  // none: 박지가 하나도 없는 시·군(채울 수 없는 곳). 아직 비어 있는 칸(empty)과 구분되게 회색
  var COLOR = { sea: '#aad3ea', empty: '#f1efe9', none: '#d6d3cc', green: '#cfe6d5', accent: '#2f8a62', line: '#fff', sub: '#3f4642', spot: '#ff6a2b', sido: '#a9a59b' };
  var canvas = null, ctx = null, hitCtx = null, dpr = 1, fontFamily = 'sans-serif';
  var allSggPath = null, allSidoPath = null;
  var slots = [];

  function sizeCanvas() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(hostW * (1 + 2 * OVER) * dpr);
    canvas.height = Math.round(hostH * (1 + 2 * OVER) * dpr);
  }
  function bb(box) { return [box[0][0], box[0][1], box[1][0], box[1][1]]; }

  // 사진 자리: 화면에 보일 때 크기에 맞춰 받는다(ensureImages)
  function mkSlot(url, box, lv, gray) {
    var sl = { url: url, bb: bb(box), lv: lv, gray: !!gray, have: 0, want: 0, img: null, at: 0, fresh: false };
    slots.push(sl);
    return sl;
  }

  function draw() {
    slots = [];
    // 1단계: 시·군·구
    sggs.forEach(function (c) {
      var look = groupLook(c.spots); c.look = look;
      c.slot = look.url ? mkSlot(look.url, c.box, 1, look.gray) : null;
    });
    // 3단계: 박지 칸 (시군구 모양을 가장 가까운 박지 기준으로 나눔)
    sggs.forEach(function (c) {
      c.cells = null; c.delaunay = null;
      if (!c.spots.length) return;
      var pts = c.spots.map(function (s) { return s.__pmXY; });
      c.delaunay = d3.Delaunay.from(pts);
      var vor = c.delaunay.voronoi([c.box[0][0], c.box[0][1], c.box[1][0], c.box[1][1]]);
      c.cells = c.spots.map(function (s, i) {
        var poly = vor.cellPolygon(i);
        var look = spotLook(s);
        var cell = { s: s, look: look, p: null, bb: null, slot: null };
        if (!poly) return cell;
        cell.p = new Path2D('M' + poly.join('L') + 'Z');
        var box = [[d3.min(poly, function (p) { return p[0]; }), d3.min(poly, function (p) { return p[1]; })], [d3.max(poly, function (p) { return p[0]; }), d3.max(poly, function (p) { return p[1]; })]];
        cell.bb = bb(box);
        if (look.url) cell.slot = mkSlot(look.url, box, 2, look.gray);
        // 방금 올린 내 사진: 흑백에서 컬러로 물든다
        if (cell.slot && String(s.id) === String(freshSpotId)) { cell.slot.fresh = true; freshSpotId = null; }
        return cell;
      });
    });
    spotShown = false; spotFadeAt = 0;
    update(true);
    requestRender();
  }

  // 사진을 칸 모양 안에 꽉 차게(가운데 맞춤, 넘치는 건 잘림)
  function paintSlot(sl, path, now) {
    if (!sl.img) return false;
    var anim = false;
    var a = exporting ? 1 : Math.min(1, (now - sl.at) / 350); if (a < 1) anim = true;
    // 흑백 정도(1=흑백)와 진하기
    var g = sl.gray ? 1 : 0, op = sl.gray ? 0.55 : 1;
    if (sl.fresh) {
      var f = Math.max(0, Math.min(1, (now - sl.at - 120) / 1600));
      g = 1 - f; op = 0.55 + 0.45 * f;
      if (f < 1) anim = true; else sl.fresh = false;
    }
    var b = sl.bb, bw = b[2] - b[0], bh = b[3] - b[1];
    var im = sl.img, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    if (!iw || !ih) return anim;
    var sc = Math.max(bw / iw, bh / ih), dw = iw * sc, dh = ih * sc;
    var base = ctx.globalAlpha;
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = base * a * op;
    ctx.drawImage(im, b[0] + (bw - dw) / 2, b[1] + (bh - dh) / 2, dw, dh);
    if (g > 0) {
      // 채도를 빼서 흑백으로(캔버스 filter는 예전 사파리에 없다)
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = base * a * g;
      ctx.fillStyle = '#808080';
      ctx.fillRect(b[0], b[1], bw, bh);
    }
    ctx.restore();
    return anim;
  }

  var renderRaf = 0, lastRenderMs = 0;
  function requestRender() { if (!renderRaf) renderRaf = requestAnimationFrame(function () { renderRaf = 0; render(); }); }
  function render() {
    if (!ctx || !opened || !committed) return;
    if (renderRaf) { cancelAnimationFrame(renderRaf); renderRaf = 0; }
    var t0 = performance.now(), now = t0, anim = false;
    var t = committed, kk = t.k, ox = hostW * OVER, oy = hostH * OVER;
    var lv = level(), wide = kk < LEVEL_SGG, px = 1 / kk;
    var view = [t.invertX(-ox), t.invertY(-oy), t.invertX(hostW + ox), t.invertY(hostH + oy)];
    var vis = function (b) { return b && !(b[2] < view[0] || b[0] > view[2] || b[3] < view[1] || b[1] > view[3]); };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!exportPart || exportPart === 'main') { ctx.fillStyle = COLOR.sea; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    var inc = function (c) { return !exportPart || exportPartOf(c) === exportPart; };
    ctx.setTransform(dpr * kk, 0, 0, dpr * kk, dpr * (ox + t.x), dpr * (oy + t.y));
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

    // 박지 단계로 넘어갈 땐 박지 사진이 준비돼 다 덮을 때까지 시·군 사진을 밑에 둔다
    var spotA = 0;
    if (lv === 2 && spotShown) { spotA = Math.min(1, (now - spotFadeAt) / 300); if (spotA < 1) anim = true; }
    var sggPhotos = lv === 1 || spotA < 1;
    sggs.forEach(function (c) {
      if (!vis(c.bb) || !inc(c)) return;
      var look = c.look || {};
      ctx.fillStyle = !c.spots.length ? COLOR.none : look.green ? COLOR.green : COLOR.empty;
      ctx.fill(c.p);
      if (sggPhotos && c.slot && paintSlot(c.slot, c.p, now)) anim = true;
    });
    if (lv === 2 && spotA > 0) {
      ctx.globalAlpha = spotA;
      ctx.lineWidth = px; ctx.strokeStyle = COLOR.line;
      sggs.forEach(function (c) {
        if (!c.cells || !vis(c.bb)) return;
        ctx.save();
        ctx.clip(c.p);
        c.cells.forEach(function (cell) {
          if (!cell.p || !vis(cell.bb)) return;
          ctx.fillStyle = cell.look.green ? COLOR.green : COLOR.empty;
          ctx.fill(cell.p);
          if (cell.slot && paintSlot(cell.slot, cell.p, now)) anim = true;
        });
        c.cells.forEach(function (cell) { if (cell.p && vis(cell.bb)) ctx.stroke(cell.p); });
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }
    // 경계선
    ctx.strokeStyle = COLOR.line; ctx.lineJoin = 'round';
    var ep = exportPart ? exportPaths[exportPart] : null;
    ctx.lineWidth = (lv === 2 ? 3 : wide ? 0.5 : 1) * px; ctx.stroke(ep ? ep.sgg : allSggPath);
    if (lv !== 2) { ctx.strokeStyle = COLOR.sido; ctx.lineWidth = 2 * px; ctx.stroke(ep ? ep.sido : allSidoPath); }

    // 점·글자는 화면 좌표로(또렷하게)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W2 = hostW + 2 * ox, H2 = hostH + 2 * oy;
    var X = function (x) { return ox + t.x + kk * x; }, Y = function (y) { return oy + t.y + kk * y; };
    var onScreen = function (x, y) { return x > -60 && x < W2 + 60 && y > -30 && y < H2 + 30; };
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
    function label(text, x, y, size, weight, empty) {
      ctx.font = weight + ' ' + size + 'px ' + fontFamily;
      ctx.lineWidth = Math.min(3, size * 0.3);
      ctx.strokeStyle = empty ? '#fff' : 'rgba(0,0,0,.6)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = empty ? COLOR.sub : '#fff';
      ctx.fillText(text, x, y);
    }
    if (lv === 2) {
      // 사진 있는 박지: 흰 점·초록 테두리 / 다녀옴: 초록 점 / 아직 빈 박지: 주황 점(눈에 띄게)
      var marks = [];
      sggs.forEach(function (c) {
        if (!c.cells || !vis(c.bb)) return;
        c.cells.forEach(function (cell) {
          var x = X(cell.s.__pmXY[0]), y = Y(cell.s.__pmXY[1]);
          if (onScreen(x, y)) marks.push({ x: x, y: y, cell: cell });
        });
      });
      marks.forEach(function (m) {
        var l = m.cell.look, filled = mode === 'mine' ? l.mine : !!l.url;
        ctx.beginPath(); ctx.arc(m.x, m.y, 6.5, 0, Math.PI * 2);
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2 * dpr; ctx.shadowOffsetY = dpr;
        ctx.fillStyle = filled ? '#fff' : (mode === 'mine' && l.stamp) ? COLOR.accent : COLOR.spot;
        ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.lineWidth = 2.5; ctx.strokeStyle = filled ? COLOR.accent : '#fff'; ctx.stroke();
      });
      marks.forEach(function (m) {
        var l = m.cell.look, s = m.cell.s;
        if (l.stamp) {
          ctx.font = '800 11px ' + fontFamily; ctx.lineWidth = 3; ctx.strokeStyle = '#fff';
          ctx.strokeText('✓ 다녀옴', m.x, m.y - 9); ctx.fillStyle = COLOR.accent; ctx.fillText('✓ 다녀옴', m.x, m.y - 9);
        }
        label(String(s.spot_main || s.name || '').trim(), m.x, m.y + 17, 11, 700, !(l.url || l.green));
      });
    } else if (exporting) {
      // 공유 이미지: 시군구 이름을 칸 크기에 맞춰 다 넣는다(너무 작은 칸은 뺀다)
      sggs.forEach(function (c) {
        var w = (c.box[1][0] - c.box[0][0]) * kk;
        if (!inc(c) || c.name === '옹진군') return;
        var look = c.look || {};
        // 울릉도는 섬이 작아 이름을 섬 밑에 둔다
        if (exportPart === 'ulleung') return label('울릉도', X(c.c[0]), Y(c.box[1][1]) + 9, 7, 700, !(look.url || look.green));
        if (w < 16) return;
        label(c.name, X(c.c[0]), Y(c.c[1]) + 2, Math.max(5.5, Math.min(8.5, w / 4.2)), 700, !(look.url || look.green));
      });
    } else if (wide) {
      // 전국: 도 이름(광역시 이름은 도 이름과 겹쳐서 뺀다)
      sidos.forEach(function (s) {
        if (METRO[s.code]) return;
        var x = X(s.c[0]), y = Y(s.c[1]);
        if (onScreen(x, y)) label(s.name, x, y, 13, 700, false);
      });
    } else {
      // 시군구 이름은 칸이 화면에서 46px보다 넓을 때만
      sggs.forEach(function (c) {
        if ((c.box[1][0] - c.box[0][0]) * kk <= 46) return;
        var x = X(c.c[0]), y = Y(c.c[1]);
        var look = c.look || {};
        if (onScreen(x, y)) label(c.name, x, y, 11.5, 700, !(look.url || look.green));
      });
    }
    lastRenderMs = performance.now() - t0;
    if (window.__pmTrace) window.__pmTrace.push(['render', Math.round(t0), Math.round(lastRenderMs), lv, Math.round(kk * 10) / 10]);
    if (anim) requestRender();
  }

  // ------------------------------------------------------------------ 공유 이미지
  // 전국을 한 장(기본 1080×1350, 인스타 피드)에 꽉 채워 시군구 이름까지 넣어 그린다.
  // 그리기는 render()를 그대로 쓰고, 그동안만 캔버스·크기·확대 상태를 바꿔 끼운다.
  var exporting = false, exportPart = null, exportPaths = {};
  // 공유 이미지에서 이 칸을 어느 판에 그리나: 본토 / 제주(왼쪽 아래로 옮김) / 울릉도(오른쪽 동해로 옮김)
  function exportPartOf(c) { return c.code === '50' ? 'jeju' : c.name === '울릉군' ? 'ulleung' : 'main'; }
  var EXPORT_BG = { sky: { sea: '#aad3ea', ink: '#1d2320', sub: '#2f5d48', foot: 'rgba(29,35,32,.7)' }, white: { sea: '#ffffff', ink: '#1d2320', sub: '#2f8a62', foot: 'rgba(29,35,32,.6)' }, navy: { sea: '#0f1d33', ink: '#ffffff', sub: '#8fe0b5', foot: 'rgba(255,255,255,.7)' } };
  // 제목 글꼴(세리프·영문)과 로고를 한 번만 불러 둔다(못 불러도 기본 글꼴로 그린다)
  var EXPORT_SERIF = "'Noto Serif KR', serif", EXPORT_EN = "'Space Grotesk', sans-serif", exportAssets = null;
  function loadExportAssets() {
    if (exportAssets) return exportAssets;
    if (!document.querySelector('link[data-pm-font]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-pm-font', '1');
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@600;700;900&family=Space+Grotesk:wght@500;700&display=swap';
      document.head.appendChild(l);
    }
    var fonts = document.fonts ? Promise.all([
      document.fonts.load("900 20px 'Noto Serif KR'", '낭만루트 나의 백패킹 포토맵'),
      document.fonts.load("700 20px 'Space Grotesk'", 'ROMANTIC ROUTE 0123456789/'),
      document.fonts.load("500 20px 'Space Grotesk'", 'ROMANTIC ROUTE 0123456789/')
    ]).catch(function () {}) : Promise.resolve();
    var logo = new Promise(function (r) { var im = new Image(); im.onload = function () { r(im); }; im.onerror = function () { r(null); }; im.src = '/logo.png'; });
    exportAssets = Promise.race([Promise.all([fonts, logo]), new Promise(function (r) { setTimeout(r, 4000); })]).then(function (v) { return { logo: v ? v[1] : null }; });
    return exportAssets;
  }
  // 글자 사이를 벌려 쓴다(캔버스 letterSpacing이 없는 기기도 있어 한 글자씩)
  function spacedText(c, text, x, y, gap) {
    for (var i = 0; i < text.length; i++) { c.fillText(text[i], x, y); x += c.measureText(text[i]).width + gap; }
    return x;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  // 남색 동그라미 안에 산·해 로고
  function logoBadge(c, logo, x, y, d) {
    c.save();
    c.beginPath(); c.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); c.fillStyle = '#16233a'; c.fill();
    if (logo) c.drawImage(logo, x + d * 0.14, y + d * 0.1, d * 0.72, d * 0.72);
    c.restore();
  }
  // 공유 이미지의 제목·숫자·주소. 시안 세 가지: a 잡지 표지, b 로고 배지, c 떠 있는 카드
  function drawExportHeader(c, style, o) {
    var bg = o.bg, LW = o.LW, LH = o.LH, title = o.mine ? '나의 백패킹 포토맵' : '낭만루트 백패킹 포토맵';
    c.setTransform(o.S, 0, 0, o.S, 0, 0);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    // 제목이 지도 글자에 닿지 않게 폭(maxW)을 넘으면 글자를 줄인다
    function fitFont(weight, size, family, text, maxW) {
      c.font = weight + ' ' + size + 'px ' + family;
      var w = c.measureText(text).width;
      if (w > maxW) { size = Math.floor(size * maxW / w * 10) / 10; c.font = weight + ' ' + size + 'px ' + family; }
      return size;
    }
    // 큰 숫자 + 작은 꼬리말
    function bigNum(x, y, size, ink, sub) {
      c.font = '700 ' + size + 'px ' + EXPORT_EN; c.fillStyle = ink;
      var n = String(o.went); c.fillText(n, x, y);
      x += c.measureText(n).width + 4;
      c.font = '700 ' + Math.round(size * 0.36) + 'px ' + fontFamily; c.fillStyle = sub;
      c.fillText('/ ' + o.total + ' ' + o.unit, x, y);
    }
    if (style === 'b') {
      logoBadge(c, o.logo, 14, 12, 44);
      c.font = '900 13px ' + fontFamily; c.fillStyle = bg.ink; c.fillText('낭만루트', 64, 32);
      c.font = '500 7px ' + EXPORT_EN; c.fillStyle = bg.sub; spacedText(c, 'ROMANTIC ROUTE', 64, 44, 1.2);
      fitFont(900, 18, fontFamily, title, 160); c.fillStyle = bg.ink; c.fillText(title, 14, 80);
      bigNum(14, 108, 24, bg.sub, bg.sub);
    } else if (style === 'c') {
      // 카드 폭은 제목 길이에 맞춘다
      fitFont(900, 15, fontFamily, title, 140);
      var cw = Math.max(110, c.measureText(title).width + 22);
      c.save();
      c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
      roundRect(c, 10, 10, cw, 82, 12); c.fillStyle = 'rgba(255,255,255,.92)'; c.fill();
      c.restore();
      logoBadge(c, o.logo, 20, 19, 18);
      c.font = '700 7px ' + EXPORT_EN; c.fillStyle = '#5b6b62'; spacedText(c, 'ROMANTIC ROUTE', 43, 31, 1.2);
      fitFont(900, 15, fontFamily, title, 140); c.fillStyle = '#16233a'; c.fillText(title, 21, 56);
      bigNum(20, 82, 20, '#2f8a62', '#5b6b62');
    } else {
      c.font = '700 7px ' + EXPORT_EN; c.fillStyle = bg.sub; spacedText(c, 'ROMANTIC ROUTE · BACKPACKING PHOTO MAP', 14, 22, 1.6);
      fitFont(900, 19, EXPORT_SERIF, title, 160); c.fillStyle = bg.ink; c.fillText(title, 14, 46);
      c.fillStyle = bg.sub; c.fillRect(14, 54, 22, 1.5);
      // 큰 숫자 = 채운 시·군(또는 박지), 뒤에 '/ 전체'(숫자와 같은 영문 글꼴) + 단위
      c.font = '700 30px ' + EXPORT_EN; c.fillStyle = bg.ink;
      var n = String(o.went); c.fillText(n, 14, 90);
      var nx = 14 + c.measureText(n).width + 3;
      c.font = '500 13px ' + EXPORT_EN; c.fillStyle = bg.sub; c.fillText('/ ' + o.total, nx + 1, 90);
      var ux = nx + 1 + c.measureText('/ ' + o.total).width + 3;
      c.font = '700 11px ' + fontFamily; c.fillText(o.unit, ux, 90);
    }
    // 오른쪽 아래: 작은 로고 + 주소(로고는 글씨 높이에 맞추고 글씨 가운데 줄에 붙인다)
    var fy = LH - 12, fs = 9.5, d = 11.5;
    c.textAlign = 'right'; c.font = '700 ' + fs + 'px ' + EXPORT_EN; c.fillStyle = bg.foot;
    c.fillText('romanticroute.kr', LW - 12, fy);
    var w = c.measureText('romanticroute.kr').width;
    logoBadge(c, o.logo, LW - 12 - w - 4 - d, fy - fs * 0.36 - d / 2, d);
  }

  function exportImage(opt) {
    opt = opt || {};
    var OW = opt.width || 1080, OH = opt.height || 1350, bg = EXPORT_BG[opt.bg] || EXPORT_BG.sky;
    var LW = 400, LH = Math.round(LW * OH / OW), S = OW / LW; // 글자 크기는 휴대폰 화면 기준(400px 폭)으로
    var M = 6; // 가장자리 여백
    // 본토(제주·울릉·옹진 빼고) 범위와 제주 범위
    function boxOf(test) {
      var b = [Infinity, Infinity, -Infinity, -Infinity];
      sggs.forEach(function (c) { if (!test(c)) return; b[0] = Math.min(b[0], c.box[0][0]); b[1] = Math.min(b[1], c.box[0][1]); b[2] = Math.max(b[2], c.box[1][0]); b[3] = Math.max(b[3], c.box[1][1]); });
      return b;
    }
    var mb = boxOf(function (c) { return exportPartOf(c) === 'main' && c.name !== '옹진군'; });
    var jb = boxOf(function (c) { return c.code === '50'; });
    var ub = boxOf(function (c) { return c.name === '울릉군'; });
    // 본토를 세로로 꽉 채우고 오른쪽에 붙인다(왼쪽 위는 제목, 왼쪽 아래는 제주)
    var sc = Math.min((LH - 2 * M) / (mb[3] - mb[1]), (LW - 2 * M) / (mb[2] - mb[0]));
    var tMain = d3.zoomIdentity.translate(LW - M - sc * mb[2], M - sc * mb[1]).scale(sc);
    var tJeju = d3.zoomIdentity.translate(M + 6 - sc * jb[0], LH - M - 22 - sc * jb[3]).scale(sc);
    // 울릉도는 제 위도 그대로, 오른쪽 끝 동해 바다에(섬이 작아 1.6배로)
    var su = sc * 1.6, uy = tMain.applyY((ub[1] + ub[3]) / 2);
    var tUll = d3.zoomIdentity.translate(LW - M - 8 - su * ub[2], uy - su * (ub[1] + ub[3]) / 2).scale(su);
    if (!exportPaths.main) {
      var pick = function (list, part) { return new Path2D(list.filter(function (c) { return exportPartOf(c) === part; }).map(function (c) { return c.d; }).join('')); };
      // 시·도 경계: 경북에는 울릉도가 같이 들어 있어 본토 판에선 제 자리(그림 밖)에 그려지고, 울릉도 판에선 섬 테두리를 쓴다
      var sidoMain = new Path2D(sidos.filter(function (c) { return c.code !== '50'; }).map(function (c) { return c.d; }).join(''));
      exportPaths = { main: { sgg: pick(sggs, 'main'), sido: sidoMain }, jeju: { sgg: pick(sggs, 'jeju'), sido: pick(sidos, 'jeju') }, ulleung: { sgg: pick(sggs, 'ulleung'), sido: pick(sggs, 'ulleung') } };
    }
    // 칸 크기에 맞는 사진을 받는다(이 크기 이미지에서 선명하게)
    var jobs = [];
    slots.forEach(function (sl) {
      if (sl.lv !== 1) return;
      var need = Math.max(sl.bb[2] - sl.bb[0], sl.bb[3] - sl.bb[1]) * sc * S;
      var size = sizeFor(need); if (!cdnUrl(sl.url, size)) size = Math.min(size, THUMB_MAX);
      if (sl.have >= size) return;
      jobs.push(loadImg(sl.url, size).then(function (im) { if (im && sl.have < size) { if (!sl.img) sl.at = 0; sl.img = im; sl.have = size; } }));
    });
    var assets = {};
    var wait = Promise.all([
      Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, 8000); })]),
      loadExportAssets().then(function (a) { assets = a; })
    ]);
    return wait.then(function () {
      var out = document.createElement('canvas'); out.width = OW; out.height = OH;
      var keep = { canvas: canvas, ctx: ctx, dpr: dpr, hostW: hostW, hostH: hostH, OVER: OVER, committed: committed, k: k, sea: COLOR.sea };
      canvas = out; ctx = out.getContext('2d'); dpr = S; hostW = LW; hostH = LH; OVER = 0; exporting = true; COLOR.sea = bg.sea;
      try {
        exportPart = 'main'; committed = tMain; k = sc; render();
        exportPart = 'jeju'; committed = tJeju; render();
        exportPart = 'ulleung'; committed = tUll; k = su; render();
      } finally {
        exporting = false; exportPart = null; COLOR.sea = keep.sea;
        canvas = keep.canvas; ctx = keep.ctx; dpr = keep.dpr; hostW = keep.hostW; hostH = keep.hostH; OVER = keep.OVER; committed = keep.committed; k = keep.k;
      }
      var h = headInfo();
      drawExportHeader(out.getContext('2d'), opt.style || 'a', { S: S, LW: LW, LH: LH, bg: bg, mine: h.mine, went: h.went, total: h.total, unit: h.unit, logo: assets.logo });
      return out;
    });
  }

  // ------------------------------------------------------------------ 눌렀을 때
  function sggAt(w) {
    for (var i = 0; i < sggs.length; i++) {
      var c = sggs[i], b = c.bb;
      if (w[0] < b[0] || w[0] > b[2] || w[1] < b[1] || w[1] > b[3]) continue;
      if (hitCtx.isPointInPath(c.p, w[0], w[1])) return c;
    }
    return null;
  }
  function onTap(ev) {
    if (!opened || !committed) return;
    var p = d3.pointer(ev, stage.node()), t = committed, w = t.invert(p);
    if (level() === 2) {
      // 점을 먼저(화면에서 14px 안), 아니면 그 칸의 박지
      var best = null, bestD = 14 * 14;
      sggs.forEach(function (c) {
        if (!c.cells) return;
        c.cells.forEach(function (cell) {
          var dx = (cell.s.__pmXY[0] - w[0]) * t.k, dy = (cell.s.__pmXY[1] - w[1]) * t.k, d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = cell.s; }
        });
      });
      if (best) return openSheet(best);
      var c = sggAt(w);
      if (c && c.delaunay) openSheet(c.spots[c.delaunay.find(w[0], w[1])]);
      return;
    }
    var g = sggAt(w);
    if (g) zoomToBox(g.box, 0.86, LEVEL_SPOT + 0.3);
  }

  // ------------------------------------------------------------------ 확대 단계
  function level() { return k < LEVEL_SPOT ? 1 : 2; }

  var spotShown = false, spotFadeAt = 0, revealToken = 0, gesture = false;
  // 박지 단계로 갈 때: 보이는 박지 사진이 준비되면(최대 0.7초) 박지 칸을 0.3초에 걸쳐 시·군 사진 위로 겹친다
  function revealSpots() {
    var token = revealToken;
    var waits = ensureImages() || [];
    var show = function () {
      if (token !== revealToken || level() !== 2 || spotShown) return;
      spotShown = true; spotFadeAt = performance.now();
      requestRender();
    };
    if (!waits.length) return show();
    Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, 700); })]).then(show);
  }

  // 단계(lv·wide)가 바뀌면 박지 칸 보이기를 정한다
  var shown = { lv: 0, wide: null };
  function update(force) {
    var lv = level();
    var wide = k < LEVEL_SGG; // 전국을 보는 중
    host.classList.toggle('pm-zoomed', !wide);
    if (force || lv !== shown.lv || wide !== shown.wide) {
      shown.lv = lv; shown.wide = wide;
      revealToken++;
      if (lv === 2) revealSpots(); else spotShown = false;
    }
    // 위쪽 숫자는 늘 전국 기준(움직일 때마다 바뀌지 않게)
    if (force) setHeader();
    scheduleImages();
  }

  // 위쪽 제목·숫자(포토맵 카드와 같은 말): 모두는 전체 박지 수, 내 지도는 가 본 박지(내 피드 박지 + 다녀옴) / 전체 박지
  // 숫자는 둘 다 '채워진 박지 / 전체': 모두는 누군가 피드 사진을 올린 박지, 내 지도는 내가 가 본 박지(내 피드 + 다녀옴).
  // 아직 다 안 찼다는 게 보여야 "내가 채워야지"가 된다.
  // 시·군 단위(전국 지도에서 보이는 칸과 같다): 박지가 있는 시·군 중 박지 하나라도 채운 곳. 박지가 없는 시·군은 채울 수 없으니 뺀다.
  // 박지 단위: 채운 박지 / 전체 박지
  // 세는 단위: 'sgg'(시·군) | 'spot'(박지). 위쪽 숫자를 누르면 바뀌고 이 기기에 기억한다
  var UNIT_KEY = 'okbm_pm_unit';
  var unit = 'sgg';
  try { if (localStorage.getItem(UNIT_KEY) === 'spot') unit = 'spot'; } catch (e) {}
  function toggleUnit() {
    unit = unit === 'sgg' ? 'spot' : 'sgg';
    try { localStorage.setItem(UNIT_KEY, unit); } catch (e) {}
    metric('feat_pm_unit');
    setHeader();
  }
  function unitLabel() { return unit === 'spot' ? '박지' : '시·군'; }

  function headInfo() {
    var vs = mode === 'mine' ? visitedSet() : null;
    function filled(s) {
      var x = bySpot[s.id];
      return vs ? ((x && x.mine.length) || vs.has(String(s.id).trim())) : !!(x && x.all.length);
    }
    var total = 0, went = 0, spotWent = 0;
    spotList.forEach(function (s) { if (filled(s)) spotWent++; });
    sggs.forEach(function (c) {
      if (!c.spots.length) return;
      total++;
      if (c.spots.some(filled)) went++;
    });
    if (unit === 'spot') { went = spotWent; total = spotList.length; }
    return { mine: mode === 'mine', went: went, total: total, unit: unitLabel(),
      title: mode === 'mine' ? '나의 백패킹 포토맵' : '낭만루트 백패킹 포토맵' };
  }

  function setHeader() {
    var h = headInfo();
    host.querySelector('.pm-head').innerHTML =
      '<div class="e">ROMANTIC ROUTE · PHOTO MAP</div><div class="t">' + h.title + '</div><div class="r"></div>' +
      (h.total ? '<button type="button" class="n" aria-label="' + h.went + ' / ' + h.total + ' ' + h.unit + ', 누르면 ' + (unit === 'sgg' ? '박지' : '시·군') + '로 세기">' +
        h.went + '<small>/ ' + h.total + ' ' + h.unit + '</small><span class="sw" aria-hidden="true">⇄</span></button>' : ''); // 박지를 아직 못 받았으면 숫자는 뺀다
  }

  // 기능 사용 세기 (H8). 손가락으로 움직이는 동작은 세지 않고 버튼·칸 누름만 센다.
  function metric(name) { if (typeof window.okbmMetric === 'function') window.okbmMetric(name); }

  // ------------------------------------------------------------------ 한눈에 보기(공유 이미지 카드)
  // 누르면 화면 전체에 공유 이미지를 띄운다(만드는 데 몇 초). 같은 모드·숫자면 만든 걸 다시 쓴다.
  var cardEl = null, cardCache = {}, cardBlob = null, cardToken = 0;
  function openCard() {
    metric('feat_pm_card');
    if (!cardEl) {
      cardEl = document.createElement('div'); cardEl.className = 'pm-card';
      cardEl.innerHTML = '<button type="button" class="x" aria-label="닫기">×</button><div class="img"></div><div class="hint" hidden></div>' +
        '<div class="acts"><button type="button" data-a="save">이미지 저장</button><button type="button" class="go" data-a="send">보내기</button></div>';
      document.body.appendChild(cardEl); // 아래 탭 줄(z-index 최댓값)보다 나중에 붙여 그 위로 덮는다
      cardEl.querySelector('.x').addEventListener('click', closeCard);
      cardEl.querySelector('[data-a="save"]').addEventListener('click', saveCard);
      cardEl.querySelector('[data-a="send"]').addEventListener('click', sendCard);
    }
    var h = headInfo(), key = mode + ':' + unit + ':' + h.went + ':' + h.total, token = ++cardToken, box = cardEl.querySelector('.img');
    cardEl.classList.add('on');
    cardEl.querySelectorAll('.acts button').forEach(function (b) { b.disabled = true; });
    cardEl.querySelector('.hint').hidden = true;
    box.innerHTML = '<div class="wait">한 장으로 만드는 중…</div>';
    var made = cardCache[key] ? Promise.resolve(cardCache[key]) : exportImage().then(function (c) {
      return new Promise(function (r) { c.toBlob(function (b) { r(b); }, 'image/jpeg', 0.92); });
    }).then(function (b) { if (b) cardCache[key] = b; return b; });
    made.then(function (b) {
      if (token !== cardToken || !b) return;
      cardBlob = b;
      box.innerHTML = '<img alt="낭만루트 백패킹 포토맵" src="' + URL.createObjectURL(b) + '">';
      cardEl.querySelectorAll('.acts button').forEach(function (x) { x.disabled = false; });
      // 파일 보내기가 안 되는 곳(컴퓨터 등)에선 보내기를 숨긴다
      cardEl.querySelector('[data-a="send"]').style.display = canSendFile() ? '' : 'none';
    }).catch(function (err) {
      console.warn('[photo-map] card', err);
      if (token === cardToken) box.innerHTML = '<div class="wait">카드를 만들지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>';
    });
  }
  function closeCard() { cardToken++; if (cardEl) cardEl.classList.remove('on'); }
  function cardFile() { return new File([cardBlob], 'romanticroute-photomap.jpg', { type: 'image/jpeg' }); }
  function canSendFile() {
    try { return !!(navigator.canShare && cardBlob && navigator.canShare({ files: [cardFile()] })); } catch (e) { return false; }
  }
  // 아이폰·아이패드(아이패드는 컴퓨터인 척하는 경우도 있다)
  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function saveCard() {
    if (!cardBlob) return;
    metric('feat_pm_card_save');
    // 아이폰에서 내려받기는 사진 앱이 아니라 파일 앱(다운로드)으로 가서 "저장이 안 된다"로 보인다.
    // 공유 창을 열면 맨 위 줄에 '이미지 저장'(사진 앱)이 있다. 공유 창이 없는 앱 안 브라우저는 길게 눌러 저장하라고 알려 준다.
    if (isIOS()) {
      var hint = cardEl.querySelector('.hint');
      if (canSendFile()) {
        hint.textContent = "열린 창에서 '이미지 저장'을 누르면 사진 앱에 들어가요";
        hint.hidden = false;
        navigator.share({ files: [cardFile()] }).catch(function () {});
      } else {
        hint.textContent = "그림을 길게 누른 뒤 '사진 앱에 저장'을 눌러 주세요";
        hint.hidden = false;
      }
      return;
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(cardBlob); a.download = 'romanticroute-photomap.jpg';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function sendCard() {
    if (!cardBlob) return;
    metric('feat_pm_card_send');
    navigator.share({ files: [cardFile()], title: '낭만루트 백패킹 포토맵' }).catch(function () {});
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
    if (!opened || !committed) return [];
    var t = committed, lv = level();
    // 사방 여분까지 미리 넣는다
    var x0 = t.invertX(-hostW * OVER), y0 = t.invertY(-hostH * OVER), x1 = t.invertX(hostW * (1 + OVER)), y1 = t.invertY(hostH * (1 + OVER));
    var waits = [];
    slots.forEach(function (sl) {
      if (sl.lv !== lv) return;
      var b = sl.bb;
      if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) return;
      // 화면에서 칸이 차지하는 크기만큼만 받는다(전국에선 작은 칸이 많다). 박지 단계는 640부터.
      var need = Math.max(b[2] - b[0], b[3] - b[1]) * t.k * dpr;
      var size = sizeFor(lv === 2 ? Math.max(SPOT_PX, need * 0.8) : need);
      if (!cdnUrl(sl.url, size)) size = Math.min(size, THUMB_MAX);
      if (sl.have >= size || sl.want >= size) return;
      sl.want = size;
      var p = loadImg(sl.url, size).then(function (im) {
        if (!im || sl.have >= size) return;
        if (window.__pmTrace) window.__pmTrace.push(['img', Math.round(performance.now()), size]);
        if (!sl.img) sl.at = performance.now();
        // 작은 판은 더 안 쓰니 캐시에서 뺀다(다른 칸이 아직 쥐고 있으면 그 칸이 놓을 때 풀린다)
        if (sl.have) imgCache.delete(sl.have + '|' + sl.url);
        sl.img = im; sl.have = size;
        requestRender();
        trimImages();
      });
      if (!sl.have) waits.push(p);
    });
    trimImages();
    return waits;
  }

  // 풀린 사진(가로×세로×4바이트)이 이만큼 넘으면 화면에서 먼 칸부터 놓는다. 다시 보이면 브라우저 캐시에서 금방 다시 뜬다.
  // 아이폰 사파리는 한 페이지 메모리 한도가 빡빡해 넘으면 버벅이거나 페이지를 새로 불러온다.
  var IMG_BUDGET = 120e6;
  function trimImages() {
    if (!opened || !committed || exporting) return;
    var t = committed, lv = level();
    var x0 = t.invertX(-hostW * OVER), y0 = t.invertY(-hostH * OVER), x1 = t.invertX(hostW * (1 + OVER)), y1 = t.invertY(hostH * (1 + OVER));
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var refs = new Map(), total = 0, far = [];
    slots.forEach(function (sl) {
      if (!sl.img) return;
      var n = refs.get(sl.img) || 0;
      if (!n) total += (sl.img.naturalWidth || sl.img.width || 0) * (sl.img.naturalHeight || sl.img.height || 0) * 4;
      refs.set(sl.img, n + 1);
      var b = sl.bb, off = b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1;
      // 시·군 사진은 박지 칸이 다 덮은 뒤에만(그 전엔 밑에 깔려 보인다), 박지 사진은 시·군 단계에선 안 보인다
      var unused = sl.lv !== lv && (lv === 1 || spotShown);
      if (off || unused) far.push({ sl: sl, d: Math.hypot((b[0] + b[2]) / 2 - cx, (b[1] + b[3]) / 2 - cy) + (unused ? 1e9 : 0) });
    });
    // 어느 칸도 안 쓰는 캐시 사진(모두↔내 지도를 바꾸기 전 칸 등)도 센다
    var loose = [];
    imgCache.forEach(function (p, key) {
      if (p.img && !refs.has(p.img)) { loose.push(key); total += (p.img.naturalWidth || p.img.width || 0) * (p.img.naturalHeight || p.img.height || 0) * 4; }
    });
    if (total <= IMG_BUDGET) return;
    loose.forEach(function (key) { var im = imgCache.get(key).img; total -= (im.naturalWidth || im.width || 0) * (im.naturalHeight || im.height || 0) * 4; imgCache.delete(key); });
    far.sort(function (a, b) { return b.d - a.d; });
    for (var i = 0; i < far.length && total > IMG_BUDGET; i++) {
      var sl = far[i].sl, im = sl.img, n = refs.get(im) - 1;
      refs.set(im, n);
      if (!n) { total -= (im.naturalWidth || im.width || 0) * (im.naturalHeight || im.height || 0) * 4; imgCache.delete(sl.have + '|' + sl.url); }
      sl.img = null; sl.have = 0; sl.want = 0;
    }
  }

  function zoomToBox(box, fit, minK) {
    var W = hostW, H = hostH;
    var dx = box[1][0] - box[0][0], dy = box[1][1] - box[0][1];
    var s = Math.min(80, fit / Math.max(dx / W, dy / (H - 200)));
    if (minK) s = Math.max(s, minK);
    stage.transition().duration(600).call(zoom.transform,
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

  // justVisited: 방금 '다녀왔어요'를 눌렀으면 후기 남기기로 넘어갈지 묻는다
  function openSheet(s, justVisited) {
    if (justVisited === undefined) metric('feat_pm_spot'); // 칸·점을 눌러 연 것만(다녀옴 뒤 다시 그리는 건 빼고)
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
    var ask = justVisited && st === 'visited';
    if (ask) { line = '✓ 다녀왔어요!'; note = '이 박지 후기도 남길까요? 사진을 올리면 내 지도에 이 칸이 내 사진으로 채워져요.'; }

    var btns = [];
    if (guest) btns.push(['login', '로그인하고 박지 정보 보기', '']);
    else if (st === 'none') { btns.push(['visit', '✓ 다녀왔어요', 'ghost']); btns.push(['write', '📷 후기 올리기', '']); }
    else if (ask) { btns.push(['later', '나중에', 'ghost']); btns.push(['write', '📷 후기 남기기', '']); }
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
      metric('feat_pm_' + act); // visit · unvisit · later · info · write · login
      if (act === 'login') {
        try { sessionStorage.setItem('okbm_login_return_spot', String(s.id).trim()); } catch (er) {}
        closeSheet();
        if (typeof window.openLoginModal === 'function') window.openLoginModal({ message: '박지 세부 정보와 내 지도는 회원에게만 보여요.\n로그인하면 바로 볼 수 있어요.' });
        return;
      }
      if (act === 'visit' || act === 'unvisit') {
        if (window.RomanticVault && typeof window.RomanticVault.toggleVisited === 'function') window.RomanticVault.toggleVisited(s.id);
        draw(); openSheet(s, act === 'visit');
        if (act === 'unvisit') toast('다녀옴을 지웠어요');
        return;
      }
      if (act === 'later') { closeSheet(); toast('다녀옴 표시했어요. 사진은 언제든 올릴 수 있어요'); return; }
      if (act === 'info') { closeSheet(); if (typeof window.okbmPhotoMapGoToSpot === 'function') window.okbmPhotoMapGoToSpot(s); return; }
      if (act === 'write') { closeSheet(); openWrite(s, ev); }
    };
  }

  // 지도에서 쓰는 "사진과 함께 올리기" 창을 그대로 연다. 창이 닫히면 내 후기를 다시 받아 색을 입힌다.
  function openWrite(s, ev) {
    if (typeof window.openPastTripRegisterModal !== 'function') return;
    window.__pastTripStayOnClose = true; // 닫거나 다 올리면 마이리포트가 아니라 사진 지도로 돌아온다
    window.openPastTripRegisterModal(ev);
    window.__pastTripStayOnClose = false; // 로그인 창이 떠서 안 열린 경우를 위해
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
    if (!silent) metric(m === 'mine' ? 'feat_pm_mine' : 'feat_pm_all');
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
      '<div class="pm-stage"><canvas class="pm-canvas"></canvas></div>' +
      '<div class="pm-top"><div class="pm-head"></div><div class="pm-side">' +
      '<div class="pm-seg"><button type="button" data-mode="all">모두</button><button type="button" data-mode="mine">내 지도</button></div>' +
      '<button type="button" class="pm-cardbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 15l4.5-4.5L13 15l2.5-2.5L20 17"/><circle cx="15.5" cy="8" r="1.5"/></svg>한눈에 보기</button>' +
      '</div></div>' +
      '<div class="pm-loading">포토맵을 불러오는 중…</div>' +
      '<div class="pm-toast"></div>';
    mapEl.appendChild(host);
    host.style.display = 'block'; // 크기를 재야 하므로 먼저 보이게
    host.querySelectorAll('.pm-seg button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
    host.querySelector('.pm-cardbtn').addEventListener('click', openCard);
    host.querySelector('.pm-head').addEventListener('click', function (e) { if (e.target.closest('button.n')) toggleUnit(); });
    loadExportAssets(); // 위쪽 제목 글꼴(세리프·영문)을 미리
    canvas = host.querySelector('.pm-canvas');
    ctx = canvas.getContext('2d');
    hitCtx = document.createElement('canvas').getContext('2d');
    fontFamily = (getComputedStyle(host).getPropertyValue('--font-body') || '').trim() || 'sans-serif';
    stage = d3.select(host.querySelector('.pm-stage'));
    // 움직이는 동안: 그리기가 빠르면 프레임마다 다시 그려 또렷하게, 느리면 그린 그림을 통째로 키우고 옮기고 손을 떼면 다시 그린다.
    // 느린지는 JS 시간(lastRenderMs)과 실제 장 사이 간격(그래픽 칩 몫까지)으로 본다. 간격이 두 번 30ms를 넘으면 이 기기에선 계속 옮기기만 한다.
    var pending = null, gestRaf = 0, lastCommitAt = 0, slowHits = 0, slowDevice = false;
    zoom = d3.zoom().scaleExtent([0.3, 120])
      .on('start', function () { gesture = true; lastCommitAt = 0; })
      .on('zoom', function (e) {
        if (!gesture) { commit(e.transform); return; }
        pending = e.transform;
        if (!slowDevice && lastRenderMs < 12) {
          if (!gestRaf) gestRaf = requestAnimationFrame(function (now) {
            gestRaf = 0;
            if (!pending || !gesture) return;
            if (lastCommitAt && now - lastCommitAt > 30 && ++slowHits >= 2) slowDevice = true;
            lastCommitAt = now;
            commit(pending);
          });
        } else moveCanvas(e.transform);
      })
      .on('end', function (e) {
        gesture = false; pending = null;
        if (gestRaf) { cancelAnimationFrame(gestRaf); gestRaf = 0; }
        commit(e.transform);
      });
    stage.on('click.pm', onTap);
    stage.call(zoom).on('dblclick.zoom', null);
  }

  function setup() {
    if (busy) return busy;
    // 경계·피드는 d3가 필요 없으니 d3와 동시에 받는다
    busy = Promise.all([
      loadGeo(),
      loadPublicFeeds(),
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
    stage.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(s).translate(-(p0[0] + p1[0]) / 2, -(p0[1] + p1[1]) / 2));
  }
  // 사진 지도가 지금 보는 범위(위도·경도)
  function getView() {
    if (!opened || !host || !proj) return null;
    var t = zt();
    var a = proj.invert(t.invert([0, 0])), b = proj.invert(t.invert([hostW, hostH]));
    if (!a || !b) return null;
    return { minLat: b[1], maxLat: a[1], minLng: a[0], maxLng: b[0] };
  }

  function open(view) {
    opened = true;
    document.body.classList.add('pm-on');
    if (host) host.style.display = 'block';
    var first = !host; // 처음 열 때 안내 문구(2.5초 고정)는 띄우지 않는다: 준비는 0.5초 남짓이라 오히려 오래 걸리는 것처럼 보였다
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
      if (typeof window.showToast === 'function') window.showToast('포토맵을 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.');
    });
  }

  function close() {
    opened = false;
    closeCard();
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
      if (Math.abs(w - lastW) < 120) { measure(); sizeCanvas(); render(); return; }
      lastW = w;
      buildGeo(); buildSpots(); stage.call(zoom.transform, d3.zoomIdentity); draw();
    }, 250);
  });

  // _debug: 측정 도구(scripts/photo-map-bench)가 쓴다
  window.okbmPhotoMap = {
    open: open, close: close, getView: getView, isOpen: function () { return opened; },
    exportImage: function (opt) { return opened ? exportImage(opt) : Promise.reject(new Error('closed')); },
    _hit: function (x, y) { var c = committed && sggAt(committed.invert([x, y])); return c ? c.name : null; },
    _debug: function () {
      var t = committed || { k: 0 };
      return { k: t.k, level: level(), renderMs: lastRenderMs, slots: slots.length, loaded: slots.filter(function (x) { return x.img; }).length, spotShown: spotShown,
        // 화면 좌표: 사진 있는 시군구 가운데, 박지 점
        sggAt: sggs.filter(function (c) { return c.slot && c.spots.length; }).map(function (c) { return { name: c.name, x: t.applyX ? t.applyX(c.c[0]) : 0, y: t.applyY ? t.applyY(c.c[1]) : 0, w: (c.box[1][0] - c.box[0][0]) * t.k }; }),
        spotAt: spotList.map(function (x) { return { name: x.spot_main, x: t.applyX ? t.applyX(x.__pmXY[0]) : 0, y: t.applyY ? t.applyY(x.__pmXY[1]) : 0 }; }),
        visibleSpot: slots.filter(function (x) { return x.lv === 2 && x.have; }).map(function (x) { return { cellPx: Math.round(Math.max(x.bb[2] - x.bb[0], x.bb[3] - x.bb[1]) * t.k * dpr), have: x.have }; }) };
    }
  };
})();
