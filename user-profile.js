// =========================================================================
// 등록자 정보창(낭만피드에서 남의 아이디를 눌러 여는 userFeedCollectionModal) (2026-10-29)
//
// 창 뼈대와 첫 목록은 romantic-history.js openUserFeedCollectionModal이 만들고, 여기서는
//   · 머리(사진 + 이름·숫자 한 줄 + 소개·SNS + 관심·쪽지): 낭만리포트(my-report.js)와 같은 틀
//   · 탭 '기록 | 발자취'. 기록은 연도 칩으로 고르고, 발자취는 포토맵(그 사람 사진으로 채운 시·군)과 받은 배지
//   · 숫자·연도 칩·발자취는 기록 목록 한 번(박지·날짜·첫 사진 주소, 91개에 약 6KB)으로 만든다.
//     예전에는 기록 수·올해 수를 HEAD 요청 두 번으로 셌다.
//   · 숫자 칸은 기록 · 올해 · 플로깅(공개 피드 중 플로깅 사진 있는 것, H19). 예전 '다녀온 박지'는 뜻이 안 읽혀 뺐다
//   · 관심 버튼 '+ 관심 루터 24': 그 사람을 관심 루터로 둔 사람 수만(okbm_follower_count). 누가 했는지는 안 보인다
//   · 기록을 보고 뒤로 오거나 관심을 눌러 창이 다시 그려져도 보던 탭·연도·스크롤을 이어 간다
// 인라인 onclick을 쓰지 않는다(data-up-act로 받는다. CSP 해시가 필요 없게).
// =========================================================================
(function () {
  'use strict';

  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  var D3_URL = 'vendor/d3-7.9.0.min.js';
  var GEO_URL = 'photo-map/korea-sgg-202610.json?v=2';
  // 박지 region → 경계 파일 시·도 번호(전남·광주는 12 하나로 합쳐져 있다). 경계를 넘는 시·군은 이름으로 다시 찾는다
  var SIDO = { '서울': ['11'], '서울/인천': ['11', '28'], '인천': ['28'], '부산': ['26'], '대구': ['27'], '광주': ['12'], '전남': ['12'],
    '대전': ['30'], '울산': ['31'], '세종': ['36'], '경기': ['41'], '강원': ['51'], '충북': ['43'], '충남': ['44', '30'],
    '경북': ['47', '27'], '경남': ['48', '31'], '제주': ['50'], '전북': ['52'] };

  var CSS = [
    '#userFeedCollectionModal .up-top{flex-shrink:0;height:calc(47px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 16px 0;box-sizing:border-box;background:#000}',
    '#userFeedCollectionModal .up-top>div{height:47px;max-width:480px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}',
    '#userFeedCollectionModal .up-logo{height:47px;display:inline-flex;align-items:center;gap:8px;background:none;border:0;padding:0;cursor:pointer;color:#fff;font:inherit;font-size:1.2rem;font-weight:900;letter-spacing:-.035em}',
    '#userFeedCollectionModal .up-logo img{width:28px;height:28px;object-fit:contain;display:block}',
    '#userFeedCollectionModal .up-scroll{flex:1 1 0%;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}',
    '#userFeedCollectionModal .up-in{max-width:480px;margin:0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}',
    '#userFeedCollectionModal .up-head{padding:6px 16px 0}',
    '#userFeedCollectionModal .mr-av{cursor:default}',
    '#userFeedCollectionModal .mr-av[data-up-act]{cursor:pointer}',
    '#userFeedCollectionModal .mr-st{cursor:default}',
    '#userFeedCollectionModal .up-bio{margin-top:12px;font-size:15px;line-height:1.5;color:var(--tx-2,#d1d1d6);word-break:keep-all;overflow-wrap:anywhere;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}',
    '#userFeedCollectionModal .up-sns{display:flex;align-items:center;gap:6px;margin-top:8px}',
    '#userFeedCollectionModal .up-sns:empty{display:none}',
    '#userFeedCollectionModal .up-btns{display:flex;gap:6px;margin-top:14px}',
    '#userFeedCollectionModal .up-btn{flex:1;height:36px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.08));background:var(--bg-2,#17171b);color:#f2f2f3;font:inherit;font-size:13.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:4px;cursor:pointer}',
    '#userFeedCollectionModal .up-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
    '#userFeedCollectionModal .up-btn.up-follow{background:var(--accent-fill,#2b6fd6);border-color:var(--accent-fill,#2b6fd6);color:#fff}',
    '#userFeedCollectionModal .up-btn em{font-style:normal;font-weight:800;margin-left:3px;font-variant-numeric:tabular-nums}',
    '#userFeedCollectionModal .mr-st small .okbm-plog-ic{width:12px;height:12px;color:#34d399;vertical-align:-2px;margin-right:2px}',
    '#userModalCardsContainer .mr-tt b .okbm-plog-ic{width:14px;height:14px;color:#34d399;vertical-align:-2px;margin-left:4px}',
    '#userFeedCollectionModal .up-btn:active,#userFeedCollectionModal .mr-tr:active{opacity:.6}',
    '#userFeedCollectionModal .up-pane{display:none}',
    '#userFeedCollectionModal .up-pane.on{display:block}',
    '#userFeedCollectionModal .up-years{padding:12px 14px 2px}',
    '#userFeedCollectionModal .up-years:empty{display:none}',
    '#userFeedCollectionModal .mr-chip em{font-style:normal;font-weight:600;margin-left:5px;color:var(--tx-3,#8b8b93)}',
    '#userFeedCollectionModal .mr-chip.on em{color:#55555d}',
    '#userModalCardsContainer{padding:0 12px}',
    '#userModalCardsContainer .mr-tt small.up-memo{color:var(--tx-2,#d1d1d6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}',
    '#userModalCardsContainer .mr-tt small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#userModalCardsContainer .mr-th{width:56px;height:56px}',
    '#upFoot{display:flex;flex-direction:column;gap:8px;padding:14px 12px 8px}',
    '#upFoot .up-map{display:block;width:100%;height:auto;margin-top:12px}',
    '#upFoot .up-map-wait{height:220px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--tx-3,#8b8b93)}'
  ].join('');

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function kit() { return window.okbmReportKit || null; }
  function modal() { return $('userFeedCollectionModal'); }
  function keyOf(m) { return m ? (String(m.dataset.userId || '').trim() || String(m.dataset.author || '').trim()) : ''; }
  function flag(v) { return v === '1' || v === 'true'; }

  function ensureCss() {
    if (kit()) kit().ensureCss();
    if ($('okbmUserProfileCss')) return;
    var st = document.createElement('style'); st.id = 'okbmUserProfileCss'; st.textContent = CSS; document.head.appendChild(st);
  }

  function thumb(u) {
    u = String(u || '');
    if (kit()) return kit().thumb(u);
    return u.indexOf('https://') === 0 ? u : '';
  }
  function firstPhoto(f) {
    if (!f) return '';
    if (f.ph) return String(f.ph);
    var p = f.photos;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = []; } }
    if (Array.isArray(p) && p.length && typeof p[0] === 'string') return p[0];
    return String(f.photo || f.readyShotPhoto || f.customTemplatePhoto || '');
  }
  function api() {
    var url = window.SUPABASE_URL || '', key = window.SUPABASE_ANON_KEY || '';
    if (!url || !key) return null;
    var auth = typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + key);
    return { url: url, headers: { apikey: key, Authorization: auth, 'Content-Type': 'application/json' } };
  }
  function myId() {
    try { return String((typeof window.okbmGetCurrentUserId === 'function' && window.okbmGetCurrentUserId()) || localStorage.getItem('okbm_user_id') || '').trim(); } catch (e) { return ''; }
  }

  // ---------------------------------------------------------------- 기록 목록(가벼운 것) 한 번
  // 박지·날짜·첫 사진 주소만. 숫자 한 줄, 연도 칩, 발자취가 같이 쓴다. 앱을 켜 둔 동안 사람마다 한 번만 받는다
  var LOGS = {}, WAIT = {};
  function filterOf(m) {
    var uid = String(m.dataset.userId || '').trim();
    return uid ? ('user_id=eq.' + encodeURIComponent(uid)) : ('author=eq.' + encodeURIComponent(String(m.dataset.author || '').trim()));
  }
  function loadLogs(m) {
    var k = keyOf(m);
    if (!k) return Promise.resolve([]);
    if (LOGS[k]) return Promise.resolve(LOGS[k]);
    if (WAIT[k]) return WAIT[k];
    var a = api();
    if (!a) return Promise.resolve([]);
    var self = flag(m.dataset.isSelf);
    var base = a.url + '/rest/v1/feeds?' + filterOf(m) + (self ? '' : '&is_published=eq.true') + '&order=date.desc,created_at.desc&limit=2000&select=';
    var get = function (sel) {
      return fetch(base + encodeURIComponent(sel), { headers: a.headers }).then(function (r) { if (!r.ok) throw new Error('logs ' + r.status); return r.json(); });
    };
    WAIT[k] = get('id,user_id,author,spot,spot_id,date,photo,is_published,plogging_photo,ph:photos->0')
      .catch(function () { return get('id,user_id,author,spot,spot_id,date,photo,ph:photos->0'); })
      .catch(function () { return get('id,user_id,author,spot,spot_id,date,photo'); })
      .then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];
        if (typeof window.okbmApplyUgcSafetyFilter === 'function') rows = window.okbmApplyUgcSafetyFilter(rows);
        LOGS[k] = rows;
        return rows;
      })
      .catch(function () { return null; })
      .then(function (rows) { delete WAIT[k]; return rows; });
    return WAIT[k];
  }

  // ---------------------------------------------------------------- 머리
  function avatarHtml(uid, photo) {
    var safe = typeof window.okbmSafeImageUrl === 'function' ? window.okbmSafeImageUrl(photo) : photo;
    return '<div style="position:relative;width:100%;height:100%;border-radius:50%;background:#121212;overflow:hidden;">' +
      '<img class="user-profile-avatar-img" data-user-avatar-id="' + esc(uid) + '" src="' + esc(safe || '') + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:' + (safe ? 'block' : 'none') + ';" />' +
      '<svg class="avatar-placeholder-svg" viewBox="0 0 24 24" style="position:absolute;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%);display:' + (safe ? 'none' : 'block') + ';" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '</div>';
  }

  function statsOf(rows) {
    if (!rows) return null;
    var y = String(new Date().getFullYear()), year = 0, plog = 0;
    rows.forEach(function (r) {
      if (String(r.date || '').indexOf(y) === 0) year++;
      if (r.plogging_photo && r.is_published !== false) plog++;
    });
    return { total: rows.length, year: year, plog: plog };
  }

  // 관심 루터 수: 사람마다 한 번 받고, 이 창에서 관심을 누르면 1을 더하거나 빼서 보여 준다(서버 반영을 기다리지 않게)
  var FOLLOWERS = {};
  function followersOf(m) {
    var uid = String(m.dataset.userId || '').trim(), on = flag(m.dataset.following);
    if (!uid) return null;
    var f = FOLLOWERS[uid];
    if (!f) {
      FOLLOWERS[uid] = f = { n: null, on: on };
      if (typeof window.okbmFollowerCount === 'function') {
        window.okbmFollowerCount(uid, m.dataset.author || '').then(function (n) {
          if (n === null) return;
          f.n = n; f.on = on; // 받은 수는 물을 때 상태 기준. 그 뒤에 누른 것은 아래에서 더하고 뺀다
          var mm = modal();
          if (mm && String(mm.dataset.userId || '').trim() === uid) paintHeader(mm);
        });
      }
    }
    if (f.n !== null && f.on !== on) { f.n = Math.max(0, f.n + (on ? 1 : -1)); f.on = on; }
    return f.n;
  }

  function headerHtml(m) {
    var d = m.dataset, uid = String(d.userId || '').trim(), self = flag(d.isSelf);
    var hideYear = !self && flag(d.hideYear), hideTotal = !self && flag(d.hideTotal);
    var st = statsOf(LOGS[keyOf(m)]);
    var cell = function (id, n, label) {
      return '<div class="mr-st"><b' + (id ? ' id="' + id + '"' : '') + '>' + (st ? num(n) : '–') + '</b><small>' + label + '</small></div>';
    };
    var cells = (hideTotal ? '' : cell('userModalRouteCountBadge', st && st.total, '기록')) +
      (hideYear ? '' : cell('userModalYearCount', st && st.year, '올해')) +
      (hideTotal ? '' : cell('', st && st.plog, (window.okbmPlogIcon ? window.okbmPlogIcon() : '') + '플로깅'));
    var sns = typeof window.renderUserSnsBadgesHtml === 'function' ? window.renderUserSnsBadgesHtml(d.insta || '', d.yt || '', d.blog || '', false, '') : '';
    var photo = String(d.photo || '');
    var btns = '';
    if (!self && uid) {
      var fc = followersOf(m), fcHtml = fc === null ? '' : '<em>' + num(fc) + '</em>';
      btns = '<div class="up-btns">' +
        (flag(d.following)
          ? '<button type="button" class="up-btn" data-up-act="follow" aria-pressed="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>관심 루터' + fcHtml + '</button>'
          : '<button type="button" class="up-btn up-follow" data-up-act="follow" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>관심 루터' + fcHtml + '</button>') +
        (flag(d.canMessage) ? '<button type="button" class="up-btn" data-up-act="note">쪽지</button>' : '') +
      '</div>';
    }
    return '<div class="up-head">' +
      '<div class="mr-prof">' +
        '<div class="mr-av"' + (photo ? ' data-up-act="photo"' : '') + '>' + avatarHtml(uid, photo) + '</div>' +
        '<div class="mr-stats-slot"><span class="mr-nick">' + esc(d.author || '') + '</span>' +
          (cells ? '<div class="mr-stats">' + cells + '</div>' : '') +
        '</div>' +
      '</div>' +
      (d.bio ? '<div class="up-bio">' + esc(d.bio) + '</div>' : '') +
      '<div class="up-sns">' + sns + '</div>' +
      btns +
    '</div>';
  }

  function paintHeader(m) {
    m = m || modal();
    var wrap = m && $('userCollectionHeaderWrapper');
    if (!wrap) return;
    wrap.innerHTML = headerHtml(m);
    var foot = m.querySelector('[data-up-tab="foot"]');
    var hideTotal = !flag(m.dataset.isSelf) && flag(m.dataset.hideTotal);
    if (foot) foot.style.display = hideTotal ? 'none' : '';
    if (hideTotal && view(m).tab === 'foot') setTab(m, 'rec');
  }

  // ---------------------------------------------------------------- 보던 자리
  var VIEW = {};
  function view(m) { var k = keyOf(m); return VIEW[k] || (VIEW[k] = { tab: 'rec', year: '', top: 0, count: 0 }); }

  // ---------------------------------------------------------------- 기록: 연도 칩과 목록
  function yearsHtml(m) {
    var rows = LOGS[keyOf(m)];
    if (!rows || !rows.length) return '';
    var self = flag(m.dataset.isSelf);
    var showN = self || !flag(m.dataset.hideYear);
    var by = {};
    rows.forEach(function (r) { var y = String(r.date || '').slice(0, 4); if (/^\d{4}$/.test(y)) by[y] = (by[y] || 0) + 1; });
    var ys = Object.keys(by).sort().reverse();
    if (ys.length < 2) return '';
    var cur = view(m).year;
    var chip = function (y, label, n) {
      return '<button type="button" class="mr-chip' + (cur === y ? ' on' : '') + '" data-up-act="year" data-year="' + esc(y) + '">' + label + (showN ? '<em>' + num(n) + '</em>' : '') + '</button>';
    };
    return chip('', '전체', rows.length) + ys.map(function (y) { return chip(y, y, by[y]); }).join('');
  }
  function paintYears(m) {
    var box = $('upYearChips');
    if (box) box.innerHTML = yearsHtml(m);
  }

  // 고른 연도(없으면 전체)의 기록을 처음부터 limit개 받아 목록을 다시 그린다
  function reloadList(m, limit) {
    var a = api(), list = $('userModalCardsContainer'), st = window.__userCollectionPagingState;
    if (!a || !list || !st) return Promise.resolve();
    var v = view(m), self = flag(m.dataset.isSelf), lim = Math.max(10, limit || 10);
    st.year = v.year; st.skipInitial = true; st.isLoading = true; st.hasMore = true; st.offset = 0;
    var q = a.url + '/rest/v1/feeds?' + filterOf(m) + (v.year ? '&date=like.' + encodeURIComponent(v.year + '*') : '') +
      (self ? '' : '&is_published=eq.true') + '&order=date.desc,created_at.desc&offset=0&limit=' + lim;
    var author = String(m.dataset.author || ''), uid = String(m.dataset.userId || '');
    return fetch(q, { headers: a.headers }).then(function (r) { return r.ok ? r.json() : []; }).then(function (rows) {
      if (modal() !== m) return;
      rows = Array.isArray(rows) ? rows : [];
      var norm = rows.map(function (row, i) { var n = window.normalizeHistoryRecord(row, i); n._isLocalOwner = self; return n; });
      norm = window.okbmApplyUgcSafetyFilter ? window.okbmApplyUgcSafetyFilter(norm) : norm;
      window.__scopedUserFilteredFeedsMap = window.__scopedUserFilteredFeedsMap || {};
      window.__scopedUserFilteredFeedsMap[author] = norm;
      st.offset = rows.length; st.hasMore = rows.length >= lim;
      list.innerHTML = norm.length ? norm.map(function (f) { return window.__buildUserCollectionFeedRowHtml(f, author, uid); }).join('')
        : '<div class="mr-empty">' + (v.year ? v.year + '년에는 올린 기록이 없어요' : '아직 올린 기록이 없어요') + '</div>';
    }).catch(function () {}).then(function () { st.isLoading = false; });
  }

  // ---------------------------------------------------------------- 발자취: 포토맵 + 받은 배지
  var GEO = null, GEO_JOB = null;
  function loadMapTools() {
    if (GEO && window.d3) return Promise.resolve(GEO);
    if (GEO_JOB) return GEO_JOB;
    var d3Job = window.d3 && window.d3.geoPath ? Promise.resolve() : new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = D3_URL; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
    GEO_JOB = Promise.all([d3Job, fetch(GEO_URL).then(function (r) { if (!r.ok) throw new Error('geo'); return r.json(); })])
      .then(function (res) { GEO = res[1]; return GEO; })
      .catch(function (e) { GEO_JOB = null; throw e; });
    return GEO_JOB;
  }
  function spotList() {
    if (Array.isArray(window.registeredSpots) && window.registeredSpots.length) return window.registeredSpots;
    return Array.isArray(window.spots) ? window.spots : [];
  }
  function polyOf(key, byName) {
    var p = key.split('|'), cs = SIDO[p[0]] || [], c = String(p[1] || '').replace(/^대전\s+/, '');
    var hit = (byName[c] || []).filter(function (g) { return cs.indexOf(g.c) >= 0; });
    if (!hit.length) hit = byName[c] || [];
    return hit[0] || null;
  }
  function drawMap(rows, pm) {
    var box = $('upMap');
    if (!box) return;
    loadMapTools().then(function (geo) {
      var K = kit(), d3 = window.d3;
      if (!$('upMap') || !K) return;
      var byName = {};
      geo.sgg.forEach(function (g) { (byName[g.n] || (byName[g.n] = [])).push(g); });
      var hasSpot = {}, photoOf = {};
      spotList().forEach(function (s) { var g = polyOf(K.sggKey(s), byName); if (g) hasSpot[g.c + g.n] = 1; });
      // 시·군마다 그 사람이 가장 최근에 올린 사진(작게 줄인 것)
      rows.forEach(function (f) {
        var s = K.spotOfFeed(f); if (!s) return;
        var g = polyOf(K.sggKey(s), byName); if (!g) return;
        var id = g.c + g.n, u = thumb(firstPhoto(f));
        if (!(id in photoOf) || (!photoOf[id] && u)) photoOf[id] = u;
      });
      Object.keys(pm.filledKeys || {}).forEach(function (k) { var g = polyOf(k, byName); if (g && !(g.c + g.n in photoOf)) photoOf[g.c + g.n] = ''; });
      var W = 330, H = 430;
      // 본토+제주에 맞춘다(서해 끝 섬·울릉도까지 넣으면 본토가 한쪽으로 쏠리고 작아진다)
      var proj = d3.geoMercator().fitExtent([[4, 4], [W - 4, H - 4]], { type: 'Feature', geometry: { type: 'MultiPoint', coordinates: [[126.05, 38.62], [129.6, 33.15]] } });
      var path = d3.geoPath(proj), defs = '', shapes = '', n = 0;
      geo.sgg.forEach(function (g) {
        var id = g.c + g.n, d = path(g.g);
        if (!d) return;
        if (id in photoOf) {
          var u = photoOf[id];
          if (!u) { shapes += '<path d="' + d + '" fill="#fbbf24" fill-opacity=".55" stroke="#0f0f11" stroke-width=".6"/>'; return; }
          var b = path.bounds(g.g), w = Math.max(1, b[1][0] - b[0][0]), h = Math.max(1, b[1][1] - b[0][1]), pid = 'upP' + (n++);
          defs += '<pattern id="' + pid + '" patternUnits="userSpaceOnUse" x="' + b[0][0] + '" y="' + b[0][1] + '" width="' + w + '" height="' + h + '"><image href="' + esc(u) + '" width="' + w + '" height="' + h + '" preserveAspectRatio="xMidYMid slice"/></pattern>';
          shapes += '<path d="' + d + '" fill="url(#' + pid + ')" stroke="#0f0f11" stroke-width=".6"/>';
        } else {
          shapes += '<path d="' + d + '" fill="' + (hasSpot[id] ? '#3a3a42' : '#202025') + '" stroke="#0f0f11" stroke-width=".6"/>';
        }
      });
      var outline = geo.sido.map(function (s) { return '<path d="' + path(s.g) + '" fill="none" stroke="#0f0f11" stroke-width="1.4"/>'; }).join('');
      $('upMap').outerHTML = '<svg class="up-map" id="upMap" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="다녀온 시·군 지도"><defs>' + defs + '</defs>' + shapes + outline + '</svg>';
    }).catch(function () {
      var b = $('upMap'); if (b) b.innerHTML = '지도를 불러오지 못했어요';
    });
  }

  var MAP_ICON = '<svg viewBox="0 0 24 24"><path d="M15 5.1 9 3 3 5v16l6-2 6 2 6-2V3z"/><path d="M9 3v16M15 5v16"/></svg>';
  function renderFoot(m) {
    var box = $('upFoot');
    if (!box) return;
    var rows = LOGS[keyOf(m)], K = kit();
    if (!rows || !K) { box.innerHTML = '<div class="mr-card"><div class="mr-empty">' + (rows === null ? '기록을 불러오지 못했어요' : '불러오는 중이에요') + '</div></div>'; return; }
    if (!rows.length) { box.innerHTML = '<div class="mr-card"><div class="mr-empty">아직 올린 기록이 없어요</div></div>'; return; }
    var pm = K.photoMapStats(rows), pc = pm.total ? Math.round(pm.filled / pm.total * 100) : 0, all = view(m).allSido;
    var sido = all ? pm.rows : pm.rows.filter(function (r) { return r.filled; }).slice(0, 3);
    var h = '<div class="mr-card"><div class="mr-h"><span class="mr-k">' + MAP_ICON + '포토맵</span></div>';
    if (pm.total) {
      h += '<div class="mr-pmn"><b>' + pm.filled + '</b><em>/ ' + pm.total + ' 시·군</em><i>' + pc + '%</i></div>' +
        '<div class="mr-bar"><i style="width:' + Math.max(pm.filled ? 2 : 0, pc) + '%"></i></div>' +
        '<div class="up-map-wait" id="upMap">지도를 그리는 중이에요</div>' +
        '<div class="mr-pr">' + sido.map(function (r) {
          return '<div><span>' + esc(r.name) + '</span><span class="mr-mini"><i style="width:' + Math.round(r.filled / r.total * 100) + '%"></i></span><b>' + r.filled + '/' + r.total + '</b></div>';
        }).join('') + '</div>' +
        (pm.rows.length > 3 ? '<button type="button" class="mr-go mr-more2" data-up-act="sido">' + (all ? '접기' : '모든 도 보기 (' + pm.rows.length + ')') + '</button>' : '');
    } else {
      h += '<div class="mr-empty">박지 정보를 받는 중이에요</div>';
    }
    h += '</div><div class="mr-card" id="upBadges"></div>';
    box.innerHTML = h;
    if (pm.total) drawMap(rows, pm);
    // 배지: 낭만리포트와 같은 카드(my-badges.js). 남의 화면이라 '다음 배지까지' 줄은 뺀다. 새 배지 알림(checkNew)은 부르지 않는다
    if (window.okbmBadges) {
      window.okbmBadges.set(K.buildBadges(rows));
      window.okbmBadges.card($('upBadges'));
      box.querySelectorAll('#upBadges .bdg-nx').forEach(function (e) { e.remove(); });
      var k = box.querySelector('#upBadges .mr-k');
      if (k && k.firstChild && k.firstChild.nodeType === 3) k.firstChild.textContent = '받은 배지 ';
    }
  }

  // ---------------------------------------------------------------- 탭
  function setTab(m, tab) {
    view(m).tab = tab;
    m.querySelectorAll('[data-up-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-up-tab') === tab); });
    m.querySelectorAll('[data-up-pane]').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-up-pane') === tab); });
    if (tab === 'foot') renderFoot(m);
  }

  // ---------------------------------------------------------------- 창이 그려진 뒤 (romantic-history.js가 부른다)
  // keep: 기록을 보고 뒤로 왔거나 같은 사람 창을 다시 그린 경우. 아니면 보던 자리를 지우고 처음부터
  window.okbmUserCollMounted = function (m, keep) {
    if (!m) return;
    ensureCss();
    var k = keyOf(m);
    if (!keep) delete VIEW[k];
    var v = view(m);
    var sc = $('userCollScroll');
    paintHeader(m);
    paintYears(m);
    if (v.tab === 'foot' && !(!flag(m.dataset.isSelf) && flag(m.dataset.hideTotal))) setTab(m, 'foot');
    var restoreTop = keep ? v.top : 0;
    var putTop = function () { if (sc && restoreTop) { sc.scrollTop = restoreTop; restoreTop = 0; } };
    if (keep && (v.year || v.count > 10)) reloadList(m, v.count).then(putTop);
    else if (keep && v.tab === 'foot') setTimeout(putTop, 0);
    else window.__okbmUserCollPutTop = putTop; // 첫 목록이 서버에서 오면 romantic-history.js가 부른다
    if (sc) {
      sc.addEventListener('scroll', function () {
        var vv = view(m);
        vv.top = sc.scrollTop;
        if (vv.tab === 'rec') {
          var list = $('userModalCardsContainer');
          vv.count = list ? list.querySelectorAll('.js-open-user-feed-row').length : 0;
          if (typeof window.__handleUserCollectionScroll === 'function') window.__handleUserCollectionScroll(sc);
        }
      }, { passive: true });
    }
    loadLogs(m).then(function () {
      if (modal() !== m) return;
      paintHeader(m);
      paintYears(m);
      if (view(m).tab === 'foot') renderFoot(m);
    });
  };
  window.okbmUserCollPaintHeader = function () { var m = modal(); if (m) paintHeader(m); };

  // ---------------------------------------------------------------- 누름
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('#userFeedCollectionModal [data-up-act], #userFeedCollectionModal [data-up-tab]');
    if (!el) return;
    var m = modal();
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();
    var uid = String(m.dataset.userId || ''), author = String(m.dataset.author || '');
    var tab = el.getAttribute('data-up-tab');
    if (tab) {
      if (tab === view(m).tab) return;
      if (tab === 'foot' && typeof window.okbmMetric === 'function') window.okbmMetric('feat_report_visitor'); // 기능 사용 세기 (H8)
      setTab(m, tab);
      return;
    }
    switch (el.getAttribute('data-up-act')) {
      case 'follow':
        if (typeof window.toggleFollowUser === 'function') window.toggleFollowUser(uid, author, e);
        break;
      case 'note':
        if (typeof window.openDirectMessageThread === 'function') window.openDirectMessageThread(uid, author);
        break;
      case 'more':
        if (typeof window.openRouterProfileMoreMenu === 'function') window.openRouterProfileMoreMenu(uid, author, String(m.dataset.feedId || ''), e);
        break;
      case 'photo':
        if (m.dataset.photo && typeof window.previewUserPhotoLarge === 'function') window.previewUserPhotoLarge(m.dataset.photo);
        break;
      case 'home':
        if (typeof window.navigateToDockTab === 'function') window.navigateToDockTab('router');
        break;
      case 'year':
        var y = String(el.getAttribute('data-year') || '');
        if (y === view(m).year) return;
        view(m).year = y;
        paintYears(m);
        reloadList(m, 10);
        break;
      case 'sido':
        view(m).allSido = !view(m).allSido;
        renderFoot(m);
        break;
    }
  }, true);

  // 기록 줄 날짜: 올해는 '6월 1일 (월)', 다른 해는 '2025년 6월 1일 (월)'
  window.okbmUserCollDateLabel = function (s) {
    var mm = String(s || '').match(/(\d{4})\D(\d{1,2})\D(\d{1,2})/);
    if (!mm) return String(s || '');
    var d = new Date(+mm[1], +mm[2] - 1, +mm[3]);
    return (String(d.getFullYear()) === String(new Date().getFullYear()) ? '' : d.getFullYear() + '년 ') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')';
  };
  window.okbmUserCollThumb = function (u) { return thumb(u); };
})();
