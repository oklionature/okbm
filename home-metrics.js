// 홈 칸별 노출·누름 기록 (DB: SUPABASE_G1_HOME_METRICS.sql)
// - 칸은 index.html의 data-metric="이름", 버튼은 data-metric-click="이름"으로 표시한다.
// - 기기마다 무작위 번호 하나만 보낸다. 계정 id·닉네임은 보내지 않는다.
// - 관리자 계정과 ?qa=1 접속은 세지 않는다.
// - 다른 파일에서는 window.okbmMetric('publish_ok', 'event')처럼 부른다.
(function () {
  'use strict';
  if (window.__okbmHomeMetricsBooted) return;
  window.__okbmHomeMetricsBooted = true;

  var VID_KEY = 'okbm_metric_vid';
  var RPC = 'okbm_log_home_metrics';
  var DOCK_SECTIONS = {
    '낭만루터': 'dock_home',
    '낭만루트': 'dock_map',
    '낭만플랜': 'dock_plan',
    '낭만피드': 'dock_history',
    '낭만보관함': 'dock_history',
    '마이리포트': 'dock_report'
  };

  // 지도(map.html)에서도 기능 사용(feat_*)을 센다. 홈 노출은 홈에서만, 지도에서 누른 하단 탭은 feat_mapdock_*로 센다.
  var onHome = !/map\.html/i.test(location.pathname || '');
  var queue = [];
  var seenViews = {};
  var flushTimer = null;
  var vid = '';

  function noop() {}

  function isQa() {
    return /(?:^|[?&])qa=1(?:&|$)/.test(location.search || '');
  }

  function isAdmin() {
    try {
      return typeof window.okbmIsCurrentUserAdmin === 'function' && window.okbmIsCurrentUserAdmin() === true;
    } catch (e) {
      return false;
    }
  }

  function randomId() {
    var bytes = new Uint8Array(10);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var out = '';
    for (var j = 0; j < bytes.length; j++) out += ('0' + bytes[j].toString(16)).slice(-2);
    return out;
  }

  function visitorId() {
    if (vid) return vid;
    var v = '';
    try { v = localStorage.getItem(VID_KEY) || ''; } catch (e) {}
    if (!/^[a-z0-9]{12,40}$/.test(v)) {
      v = randomId();
      try { localStorage.setItem(VID_KEY, v); } catch (e) {}
    }
    vid = v;
    return vid;
  }

  function publicHeaders() {
    if (typeof window.okbmPublicRestHeaders === 'function') return window.okbmPublicRestHeaders();
    var key = window.SUPABASE_ANON_KEY || '';
    return { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' };
  }

  function flush(onLeave) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!queue.length) return;
    if (isQa() || isAdmin()) { queue = []; return; }
    var batch = queue.splice(0, 40);
    var payload = { p_visitor: visitorId(), p_events: batch };
    try {
      // 평소에는 로그인 세션이 실린 클라이언트로 보내 로그인 여부가 함께 남게 한다.
      // 페이지를 떠날 때는 끊기지 않게 keepalive fetch로 보낸다.
      if (!onLeave && window.supabaseClient && typeof window.supabaseClient.rpc === 'function') {
        Promise.resolve(window.supabaseClient.rpc(RPC, payload)).then(noop, noop);
      } else if (window.SUPABASE_URL) {
        fetch(window.SUPABASE_URL + '/rest/v1/rpc/' + RPC, {
          method: 'POST',
          keepalive: true,
          headers: publicHeaders(),
          body: JSON.stringify(payload)
        }).catch(noop);
      }
    } catch (e) {}
    if (queue.length) scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () { flush(false); }, 4000);
  }

  function log(section, kind) {
    if (!section) return;
    kind = kind || 'click';
    if (kind === 'view') {
      if (seenViews[section]) return;
      seenViews[section] = true;
    }
    queue.push({ s: String(section), k: kind });
    if (queue.length >= 40) flush(false);
    else scheduleFlush();
  }

  window.okbmMetric = log;

  function observeSections() {
    var nodes = document.querySelectorAll('[data-metric]');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        log(entry.target.getAttribute('data-metric'), 'view');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  function onClick(e) {
    var t = e.target;
    if (!t || typeof t.closest !== 'function') return;
    var dock = t.closest('#romanticMasterBottomDock .dock-item');
    if (dock) {
      // 지도에서 누른 하단 탭은 홈 것과 섞이지 않게 feat_mapdock_*로 센다
      var d = DOCK_SECTIONS[dock.getAttribute('title') || ''];
      if (d) log(onHome ? d : 'feat_map' + d, 'click');
      return;
    }
    var btn = t.closest('[data-metric-click]');
    if (btn) log(btn.getAttribute('data-metric-click'), 'click');
    var sec = t.closest('[data-metric]');
    if (sec) log(sec.getAttribute('data-metric'), 'click');
  }

  function start() {
    // 낭만플랜·보관함으로 바로 열린 경우(open=/tab=)는 홈을 본 게 아니므로 칸 노출을 세지 않는다.
    var direct = !onHome || /[?&](open|tab)=/.test(location.search || '');
    if (!direct) {
      log('home', 'view');
      observeSections();
    }
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(true);
    });
    window.addEventListener('pagehide', function () { flush(true); });
  }

  // 로그인·관리자 상태가 정해진 뒤에 시작한다.
  function boot() { setTimeout(start, 2500); }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
