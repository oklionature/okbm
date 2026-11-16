// =========================================================================
// 박지 정보창 5점 (2026-11-16 대표님, 설계 TASK_POINTS_1116.md, 서버 SUPABASE_I16_POINTS_SPOT_OPEN_1116.sql)
//
// · map-main.js focusSpotOnMap이 정보창을 열기 전에 window.okbmSpotOpenGate(spot, 열기)를 부른다.
//   true를 돌려주면 바로 연다. false면 여기서 확인·결제를 마친 뒤 열기()를 부른다.
// · 지도 핀·검색·목록·공유 링크 모두 focusSpotOnMap을 지나서 다 같이 걸린다.
// · 한 번 연 박지는 계속 무료(서버 spot_opens). 관리자는 무료. 비회원은 여기 오기 전에 로그인 안내로 갈린다.
// · 처음 한 번만 '5점 쓰고 열기' 창으로 묻고, 그 뒤로는 바로 열고 아래에 '−5 낭만 포인트 · 남은 N점'.
// · 모자라면 열지 않고 모으는 법을 안내한다.
// · 서버 함수가 없거나 연결이 안 되면 그냥 연다(정보창이 막혀 앱을 못 쓰는 일이 없게).
// 인라인 onclick 없음(CSP).
// =========================================================================
(function () {
  'use strict';
  if (window.okbmSpotOpenGate) return;

  var PRICE = 5;
  var S = { uid: '', admin: false, opened: null, loading: null, busy: false, off: false };

  function myId() {
    try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { return ''; }
  }
  function client() {
    var c = window.supabaseClient;
    return c && typeof c.rpc === 'function' ? c : null;
  }
  function loggedIn() {
    try { return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn(); } catch (e) { return false; }
  }
  function okKey() { return 'okbm_spot_open_ok_' + S.uid; }
  function toast(msg) {
    if (typeof window.showToast === 'function') window.showToast(msg);
  }
  function metric(name) {
    if (typeof window.okbmMetric === 'function') window.okbmMetric(name, 'event');
  }
  // 서버 함수가 아직 없으면(SQL 실행 전) 이 기능을 끈다
  function missing(err) {
    var m = String((err && (err.code || '')) + ' ' + (err && (err.message || ''))).toLowerCase();
    return m.indexOf('pgrst202') >= 0 || m.indexOf('could not find the function') >= 0 || m.indexOf('404') >= 0;
  }
  function rpc(name, args) {
    var c = client();
    if (!c) return Promise.reject(new Error('no client'));
    return Promise.resolve(c.rpc(name, args || {})).then(function (res) {
      if (res && res.error) throw res.error;
      return res ? res.data : null;
    });
  }

  // 내가 연 박지 목록. 사람이 바뀌면 다시 받는다
  function loadOpened() {
    var uid = myId();
    if (uid !== S.uid) { S.uid = uid; S.opened = null; S.admin = false; S.loading = null; }
    if (S.opened) return Promise.resolve(S.opened);
    if (S.loading) return S.loading;
    S.loading = rpc('okbm_my_spot_opens').then(function (d) {
      S.admin = !!(d && d.admin);
      S.opened = new Set(((d && d.spots) || []).map(function (x) { return String(x).trim(); }));
      return S.opened;
    }).catch(function (e) {
      if (missing(e)) S.off = true;
      console.warn('[spot-open-points:load]', e);
      return null;
    }).then(function (v) { S.loading = null; return v; });
    return S.loading;
  }

  // ---------- 모양 (홈 굴업도 안내 창 .gq와 같은 결) ----------
  function injectCss() {
    if (document.getElementById('okbmSpotOpenCss')) return;
    var st = document.createElement('style');
    st.id = 'okbmSpotOpenCss';
    st.textContent = [
      '.so-wrap{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);padding:0 12px calc(env(safe-area-inset-bottom) + 84px)}',
      '.so{width:100%;max-width:420px;border-radius:18px;background:#16171b;border:1px solid rgba(255,255,255,.08);color:#F2F3F5;padding:20px 18px 16px;word-break:keep-all}',
      '.so h3{margin:0 0 8px;font-size:17px;font-weight:800;letter-spacing:-.02em}',
      '.so p{margin:0 0 8px;font-size:14px;line-height:1.55;color:#C8CCD3}',
      '.so p b{color:#e0b45a}',
      '.so .so-s{font-size:12.5px;color:#8e8e93}',
      '.so-b{display:flex;gap:8px;margin-top:14px}',
      '.so-b button{flex:1;height:46px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#202227;color:#F2F3F5;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}',
      '.so-b button.on{background:#e0b45a;border-color:#e0b45a;color:#16171b}',
      '.so-b button:disabled{opacity:.6}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }

  function sheet(html, onClick) {
    injectCss();
    var old = document.getElementById('okbmSpotOpenSheet');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'okbmSpotOpenSheet';
    wrap.className = 'so-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = '<div class="so">' + html + '</div>';
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) { wrap.remove(); return; }
      var b = e.target && e.target.closest ? e.target.closest('[data-so]') : null;
      if (b) onClick(b.getAttribute('data-so'), wrap, b);
    });
    document.body.appendChild(wrap);
    return wrap;
  }

  // 처음 한 번: 5점 쓰고 열지 묻는다
  function askFirst(spot, bal, open) {
    metric('feat_spot_open_ask');
    sheet(
      '<h3>박지 정보창을 열까요?</h3>' +
      '<p>박지 정보창을 열 때 낭만 포인트 <b>' + PRICE + '점</b>이 들어요.<br>한 번 연 곳은 계속 볼 수 있어요.</p>' +
      '<p class="so-s">지금 ' + num(bal) + '점 · 출석만 해도 매일 10점이 쌓여요</p>' +
      '<div class="so-b"><button type="button" data-so="no">다음에</button><button type="button" class="on" data-so="pay">' + PRICE + '점 쓰고 열기</button></div>',
      function (what, wrap, btn) {
        if (what === 'no') { wrap.remove(); return; }
        if (what !== 'pay') return;
        btn.disabled = true;
        try { localStorage.setItem(okKey(), '1'); } catch (e) {}
        pay(spot, open).then(function () { wrap.remove(); });
      }
    );
  }

  // 모자랄 때
  function askShort(bal) {
    metric('feat_spot_open_short');
    sheet(
      '<h3>낭만 포인트가 모자라요</h3>' +
      '<p>박지 정보창을 열려면 ' + PRICE + '점이 필요해요.<br>지금 <b>' + num(bal) + '점</b>이에요.</p>' +
      '<p class="so-s">출석 10점 · 댓글·후기 10점 · 피드 20점이 쌓여요</p>' +
      '<div class="so-b"><button type="button" data-so="no">닫기</button><button type="button" class="on" data-so="how">모으는 법 보기</button></div>',
      function (what, wrap) {
        wrap.remove();
        if (what === 'how' && window.okbmPoints && typeof window.okbmPoints.open === 'function') window.okbmPoints.open();
      }
    );
  }

  function pay(spot, open) {
    var sid = String(spot.id).trim();
    return rpc('okbm_spot_open', { p_spot_id: sid, p_mode: 'pay' }).then(function (d) {
      if (d && d.ok) {
        if (S.opened) S.opened.add(sid);
        if (d.paid) {
          metric('feat_spot_open_paid');
          toast('−' + PRICE + ' 낭만 포인트 · 남은 ' + num(d.balance) + '점');
          if (window.okbmPoints && typeof window.okbmPoints.load === 'function') window.okbmPoints.load(true);
        }
        open();
        return;
      }
      if (d && d.short) return askShort(d.balance);
      toast('잠시 뒤 다시 눌러 주세요.');
    }).catch(function (e) {
      console.warn('[spot-open-points:pay]', e);
      if (missing(e)) { S.off = true; open(); return; }
      toast('잠시 뒤 다시 눌러 주세요.');
    });
  }

  function decide(spot, open) {
    var sid = String(spot.id).trim();
    return loadOpened().then(function (set) {
      if (S.off || !set || S.admin || set.has(sid)) { open(); return; }   // 못 받았으면 그냥 연다
      var confirmed = false;
      try { confirmed = localStorage.getItem(okKey()) === '1'; } catch (e) {}
      if (confirmed) return pay(spot, open);
      return rpc('okbm_spot_open', { p_spot_id: sid, p_mode: 'check' }).then(function (d) {
        if (d && d.ok) { if (S.opened) S.opened.add(sid); open(); return; }
        if (d && d.short) return askShort(d.balance);
        askFirst(spot, d ? d.balance : 0, open);
      }).catch(function (e) {
        console.warn('[spot-open-points:check]', e);
        if (missing(e)) S.off = true;
        open();
      });
    });
  }

  // true: 지금 바로 열어도 됨 / false: 여기서 처리한 뒤 open()을 부른다
  window.okbmSpotOpenGate = function (spot, open) {
    if (!spot || spot.id == null || S.off || !loggedIn() || !client() || !myId()) return true;
    if (myId() === S.uid && S.opened && (S.admin || S.opened.has(String(spot.id).trim()))) return true;
    if (S.busy) return false;
    S.busy = true;
    decide(spot, open).catch(function (e) { console.warn('[spot-open-points]', e); open(); }).then(function () { S.busy = false; });
    return false;
  };
  // 로그인한 채 들어오면 미리 받아 두어 처음 누를 때 기다리지 않게
  setTimeout(function () { if (loggedIn() && client() && myId()) loadOpened(); }, 1500);
})();
