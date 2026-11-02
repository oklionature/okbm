// =========================================================================
// 낭만 포인트 1단계 — 쌓기만 (2026-11-02, SUPABASE_H31_ROMANTIC_POINTS.sql, 설계 TASK_POINTS.md)
//
// · 점수는 서버 트리거가 준다(피드·댓글·별·제보). 여기서는 보여 주기만 한다.
//   - 낭만리포트 '리포트' 탭 맨 위 카드: 잔액, 오늘 받은 점수 / 하루 최대 (my-report.js renderReport가 card()를 부른다)
//   - 카드를 누르면 '낭만 포인트' 창: 받는 법(오늘 채운 만큼 막대) · 쓰는 곳(접힘) · 내역
//   - 받는 순간 '+10 낭만 포인트' 작은 알림: 피드 저장·별 누름(window 함수를 감싼다)·댓글(feed-comments.js가 check를 부른다) 뒤에
//     잔액을 다시 받아 늘어난 만큼 알린다. 상한을 채웠으면 '오늘 피드 포인트는 다 받았어요'.
// · 출석: 로그인한 채 앱을 연 날 한 번 okbm_points_attend를 부른다(이 기기에서 그날 이미 불렀으면 안 부름).
// · 쓰는 곳(닉네임·피드 테두리·프로필 테두리·굴업도 입장권)은 2단계라 '포인트는 어디에 쓰나요?'를 눌러야 펼쳐지고 Coming soon으로만 보인다.
// 인라인 onclick 없음(CSP).
// =========================================================================
(function () {
  'use strict';
  if (window.okbmPoints) return;

  // [까닭, 이름, 점수 글자, 하루 상한(점수, 없으면 0)] — 11-02 대표님 조정
  var RULES = [
    ['feed', '피드 올리기', '10', 30],
    ['plog', '플로깅 피드', '+20', 40],
    ['comment', '댓글 쓰기', '5', 30],
    ['star_give', '별 누르기', '2', 20],
    ['star_get', '별 받기', '1', 20],
    ['attend', '매일 출석', '10', 10],
    ['attend7', '7일 연속 출석', '+100', 0],
    ['correction', '수정 건의 채택', '30', 0],
    ['proposal', '박지 제보 반영', '100', 0]
  ];
  // 설명은 옆 사람한테 말하듯(대표님 11-02: AI 말투 말고)
  var NOTE = {
    feed: '다녀온 박지 사진을 올려 주세요. 하루 3개까지 쌓여요.',
    plog: '주운 쓰레기 사진도 같이 올리면 더 드려요. 하루 2개까지예요.',
    comment: '다른 분 피드에 댓글을 달아 주세요. 피드 하나에 한 번만, 하루 6개까지 쌓여요.',
    star_give: '피드가 좋으면 별을 눌러 주세요. 게시물당 한 번만 체크돼요. 하루 10개까지예요.',
    star_get: '내 피드에 별이 달리면 쌓여요.',
    attend: '로그인하고 앱만 열어도 쌓여요.',
    attend7: '7일 동안 하루도 안 빠지고 들어오면 드려요.',
    correction: '박지 정보가 틀렸으면 알려 주세요. 고쳐지면 드려요.',
    proposal: '나만 아는 박지를 알려 주세요. 등록되면 드려요.'
  };
  var DAY_MAX = 150; // 피드 30 + 플로깅 40 + 댓글 30 + 별 20 + 받은 별 20 + 출석 10
  var SPEND = [
    ['닉네임 바꾸기', '300점', '처음 한 번은 무료예요'],
    ['피드 테두리', '', 'Coming soon'],
    ['프로필 테두리', '', 'Coming soon'],
    ['굴업도 체험 입장권', '', 'Coming soon']
  ];
  var NAME = {};
  RULES.forEach(function (r) { NAME[r[0]] = r[1]; });
  var CAP = {};
  RULES.forEach(function (r) { if (r[3]) CAP[r[0]] = r[3]; });

  var S = { data: null, at: 0, loading: null, balance: null, uid: '', capShown: {}, spendOpen: false };

  var CSS = [
    '.pt-card{display:block;width:100%;text-align:left;color:#f2f2f3;font:inherit;cursor:pointer}',
    '.pt-card:active{opacity:.6}',
    '.pt-hd{display:flex;justify-content:space-between;align-items:center;gap:8px}',
    '.pt-k{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx-3,#8b8b93);font-weight:600}',
    '.pt-k svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}',
    '.pt-go{padding:4px 0;font-size:12px;font-weight:700;color:var(--accent,#4c94f8)}',
    '.pt-row{display:flex;align-items:baseline;gap:6px;margin-top:6px}',
    '.pt-row b{font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}',
    '.pt-row em{font-style:normal;font-size:14px;font-weight:700;color:var(--tx-2,#d1d1d6)}',
    '.pt-row i{margin-left:auto;font-style:normal;font-size:13px;font-weight:700;color:#fbbf24;font-variant-numeric:tabular-nums}',
    '.pt-bar{height:6px;border-radius:3px;background:var(--bg-3,#2a2a30);margin-top:8px;overflow:hidden}',
    '.pt-bar u{display:block;height:100%;border-radius:3px;background:#fbbf24}',
    '.pt-sub{margin-top:6px;font-size:12px;color:var(--tx-3,#8b8b93)}',
    '.pt-all{position:fixed;inset:0 0 calc(56px + env(safe-area-inset-bottom,8px)) 0;z-index:2147483647;background:#000;color:#f2f2f3;display:flex;flex-direction:column}',
    '.pt-all-h{flex:none;display:flex;align-items:center;gap:6px;height:calc(52px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 14px 0 4px;border-bottom:1px solid var(--line,rgba(255,255,255,.08))}',
    '.pt-all-h button{width:44px;height:44px;border:0;background:none;color:#fff;display:grid;place-items:center;cursor:pointer}',
    '.pt-all-h button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2}',
    '.pt-all-h b{font-size:17px;font-weight:800}',
    '.pt-all-h em{margin-left:auto;font-style:normal;font-size:15px;font-weight:800;color:#fbbf24;font-variant-numeric:tabular-nums}',
    '.pt-all-b{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 16px calc(28px + env(safe-area-inset-bottom,0px))}',
    '.pt-sec{margin:20px 0 8px;display:flex;justify-content:space-between;align-items:baseline;font-size:15px;font-weight:800}',
    '.pt-sec small{font-size:12px;font-weight:600;color:var(--tx-3,#8b8b93);font-variant-numeric:tabular-nums}',
    '.pt-li{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:11px 0;border-top:1px solid var(--line,rgba(255,255,255,.08))}',
    '.pt-li b{font-size:14px;font-weight:700}',
    '.pt-li .p{grid-row:span 2;align-self:center;font-size:15px;font-weight:800;color:#fbbf24;font-variant-numeric:tabular-nums;text-align:right}',
    '.pt-li .p small{display:block;font-size:11px;font-weight:600;color:var(--tx-3,#8b8b93)}',
    '.pt-li span{font-size:12px;color:var(--tx-3,#8b8b93);line-height:1.45}',
    '.pt-li .pt-bar{grid-column:1 / -1;height:4px;margin-top:6px}',
    '.pt-li.soon .p{color:var(--tx-3,#8b8b93)}',
    '.pt-li.soon .p small{color:var(--tx-3,#8b8b93)}',
    '.pt-h{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line,rgba(255,255,255,.08));font-size:13.5px}',
    '.pt-h span{flex:1;min-width:0;color:var(--tx-2,#d1d1d6)}',
    '.pt-h small{flex:none;font-size:12px;color:var(--tx-3,#8b8b93);font-variant-numeric:tabular-nums}',
    '.pt-h b{flex:none;width:52px;text-align:right;font-weight:800;font-variant-numeric:tabular-nums;color:#fbbf24}',
    '.pt-h b.m{color:var(--tx-3,#8b8b93)}',
    '.pt-empty{padding:18px 0;text-align:center;font-size:13px;color:var(--tx-3,#8b8b93);line-height:1.6}',
    '.pt-fold{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:20px;padding:13px 0;border:0;border-top:1px solid var(--line,rgba(255,255,255,.08));border-bottom:1px solid var(--line,rgba(255,255,255,.08));background:none;color:var(--tx-2,#d1d1d6);font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer}',
    '.pt-fold i{font-style:normal;font-size:13px;color:var(--tx-3,#8b8b93)}',
    '.pt-spend .pt-li:first-child{border-top:0}',
    '.pt-lead{margin:14px 0 0;font-size:13px;color:var(--tx-2,#d1d1d6);line-height:1.55}'
  ].join('');

  function ensureCss() {
    if (document.getElementById('okbmPointsCss')) return;
    var st = document.createElement('style'); st.id = 'okbmPointsCss'; st.textContent = CSS; document.head.appendChild(st);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function metric(n) { if (typeof window.okbmMetric === 'function') window.okbmMetric(n); }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg, 'success', 1800); }
  function myId() {
    try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { return ''; }
  }
  function client() {
    var c = window.supabaseClient;
    return c && typeof c.rpc === 'function' ? c : null;
  }
  function kstDay() {
    var d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function todaySum(t) {
    var s = 0;
    Object.keys(t || {}).forEach(function (k) { s += Number(t[k]) || 0; });
    return s;
  }
  function label(r) {
    var x = /_x$/.test(r);
    var base = x ? r.slice(0, -2) : r;
    return (NAME[base] || '낭만 포인트') + (x ? ' 취소' : '');
  }
  function fmtTime(t) {
    var d = new Date(t);
    if (isNaN(d.getTime())) return '';
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // 서버에서 내 포인트를 받는다. 다른 사람으로 바뀌면 처음부터
  function load(force) {
    var uid = myId(), c = client();
    if (!uid || !c) return Promise.resolve(null);
    if (uid !== S.uid) { S.uid = uid; S.data = null; S.balance = null; S.at = 0; }
    if (!force && S.data && Date.now() - S.at < 15000) return Promise.resolve(S.data);
    if (S.loading) return S.loading;
    S.loading = Promise.resolve(c.rpc('okbm_my_points', { p_limit: 50 })).then(function (res) {
      if (res && res.error) throw res.error;
      S.data = res && res.data ? res.data : null;
      S.at = Date.now();
      return S.data;
    }).catch(function (e) {
      console.warn('[romantic-points:load]', e);
      return S.data;
    }).then(function (v) { S.loading = null; return v; });
    return S.loading;
  }

  // 활동 뒤: 늘어난 만큼 알린다. hint는 방금 한 활동의 까닭(상한 안내용)
  function check(hint) {
    if (!myId()) return Promise.resolve();
    var before = S.balance;
    // 트리거는 저장과 함께 끝나지만, 별 누름은 서버 응답보다 먼저 올 수 있어 조금 기다린다
    return new Promise(function (ok) { setTimeout(ok, 400); }).then(function () { return load(true); }).then(function (d) {
      if (!d) return;
      var bal = Number(d.balance) || 0;
      if (before != null && bal > before) toast('+' + num(bal - before) + ' 낭만 포인트');
      else if (before != null && hint && CAP[hint] && (Number((d.today || {})[hint]) || 0) >= CAP[hint] && S.capShown[hint] !== kstDay()) {
        // 상한 안내는 그 활동마다 하루 한 번만
        S.capShown[hint] = kstDay();
        toast('오늘 ' + NAME[hint] + ' 포인트는 다 받았어요');
      }
      S.balance = bal;
      repaint();
    });
  }

  // 출석: 이 기기에서 그날 한 번만
  var attendTries = 0;
  function attend() {
    var uid = myId(), c = client();
    if (!uid || !c) {
      if (attendTries++ < 20) setTimeout(attend, 1500);
      return;
    }
    var key = 'okbm_pt_attend:' + uid;
    var day = kstDay();
    try { if (localStorage.getItem(key) === day) { load(false).then(syncBalance); return; } } catch (e) {}
    Promise.resolve(c.rpc('okbm_points_attend')).then(function (res) {
      if (res && res.error) throw res.error;
      try { localStorage.setItem(key, day); } catch (e) {}
      var g = res && res.data ? res.data : {};
      if (Number(g.streak_bonus) > 0) toast('7일 연속 출석! +' + num(g.gained) + ' 낭만 포인트');
      else if (Number(g.attend) > 0) toast('출석 +' + num(g.attend) + ' 낭만 포인트');
      return load(true).then(syncBalance);
    }).catch(function (e) { console.warn('[romantic-points:attend]', e); });
  }
  function syncBalance(d) { if (d) { S.balance = Number(d.balance) || 0; repaint(); } }

  // ---------------------------------------------------------------- 리포트 카드
  var cardBox = null;
  function cardHtml(d) {
    var bal = d ? Math.max(0, Number(d.balance) || 0) : null;
    var today = d ? todaySum(d.today) : 0;
    return '<div class="pt-hd"><span class="pt-k"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2 3-2s3 .7 3 2-1.3 1.8-3 2.3-3 1-3 2.3 1.3 2.2 3 2.2 3-.7 3-2"/></svg>낭만 포인트</span><span class="pt-go">자세히 ›</span></div>' +
      '<div class="pt-row"><b>' + (bal == null ? '-' : num(bal)) + '</b><em>점</em><i>오늘 +' + num(today) + ' / ' + DAY_MAX + '</i></div>' +
      '<div class="pt-bar"><u style="width:' + Math.min(100, Math.round(today / DAY_MAX * 100)) + '%"></u></div>' +
      '<div class="pt-sub">피드·댓글·별·출석으로 모여요</div>';
  }
  function card(box) {
    if (!box) return;
    ensureCss();
    if (!myId()) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.classList.add('pt-card');
    box.setAttribute('role', 'button');
    box.setAttribute('tabindex', '0');
    box.setAttribute('data-pt-open', '1');
    box.setAttribute('aria-label', '낭만 포인트 자세히 보기');
    cardBox = box;
    box.innerHTML = cardHtml(S.data);
    load(false).then(function (d) { syncBalance(d); });
  }

  // ---------------------------------------------------------------- 전체 창
  function sheetHtml(d) {
    var today = d ? (d.today || {}) : {};
    var h = '<p class="pt-lead">피드 올리고, 댓글 달고, 별 누르면 포인트가 쌓여요. 글을 지우거나 별을 취소하면 그만큼 빠져요. 매일 밤 12시에 새로 시작해요.</p>';
    h += '<div class="pt-sec">받는 법<small>오늘 +' + num(todaySum(today)) + ' / ' + DAY_MAX + '</small></div>';
    h += RULES.map(function (r) {
      var got = Number(today[r[0]]) || 0;
      var capTxt = r[3] ? '오늘 ' + got + '/' + r[3] : (got ? '오늘 +' + got : '');
      return '<div class="pt-li"><b>' + esc(r[1]) + '</b><span class="p">' + esc(r[2]) + '<small>' + esc(capTxt) + '</small></span><span>' + esc(NOTE[r[0]]) + '</span>' +
        (r[3] ? '<div class="pt-bar"><u style="width:' + Math.min(100, Math.round(got / r[3] * 100)) + '%"></u></div>' : '') + '</div>';
    }).join('');
    // 쓰는 곳은 접어 두고 누르면 펼친다(대표님 11-02: 대놓고 보여 주지 말 것)
    h += '<button type="button" class="pt-fold" data-pt-spend="1" aria-expanded="' + (S.spendOpen ? 'true' : 'false') + '">포인트는 어디에 쓰나요?<i>' + (S.spendOpen ? '접기' : '›') + '</i></button>';
    if (S.spendOpen) {
      h += '<div class="pt-spend">' + SPEND.map(function (x) {
        return '<div class="pt-li soon"><b>' + esc(x[0]) + '</b><span class="p">' + esc(x[1]) + '</span><span>' + esc(x[2]) + '</span></div>';
      }).join('') + '</div>';
    }
    var hist = d && Array.isArray(d.history) ? d.history : [];
    h += '<div class="pt-sec">내역</div>';
    h += hist.length ? hist.map(function (x) {
      var dl = Number(x.d) || 0;
      return '<div class="pt-h"><span>' + esc(label(String(x.r || ''))) + '</span><small>' + esc(fmtTime(x.t)) + '</small><b' + (dl < 0 ? ' class="m"' : '') + '>' + (dl > 0 ? '+' : '') + num(dl) + '</b></div>';
    }).join('') : '<div class="pt-empty">' + (d ? '아직 받은 포인트가 없어요.<br>피드를 올리거나 댓글·별을 남겨 보세요.' : '포인트를 받는 중이에요') + '</div>';
    return h;
  }
  function openSheet() {
    ensureCss();
    metric('feat_points_open');
    var old = document.getElementById('okbmPointsAll');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'okbmPointsAll';
    el.className = 'pt-all';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '낭만 포인트');
    el.innerHTML = '<div class="pt-all-h"><button type="button" data-pt-close="1" aria-label="뒤로"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><b>낭만 포인트</b><em id="okbmPointsBal"></em></div>' +
      '<div class="pt-all-b" id="okbmPointsBody"></div>';
    document.body.appendChild(el);
    repaint();
    load(true).then(syncBalance);
  }

  function repaint() {
    var d = S.data;
    if (cardBox && document.body.contains(cardBox)) cardBox.innerHTML = cardHtml(d);
    var b = document.getElementById('okbmPointsBody');
    if (b) b.innerHTML = sheetHtml(d);
    var bal = document.getElementById('okbmPointsBal');
    if (bal) bal.textContent = d ? num(Math.max(0, Number(d.balance) || 0)) + '점' : '';
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-pt-spend]')) { S.spendOpen = !S.spendOpen; if (S.spendOpen) metric('feat_points_spend'); repaint(); return; }
    if (t.closest('[data-pt-close]')) { var a = document.getElementById('okbmPointsAll'); if (a) a.remove(); return; }
    if (t.closest('[data-pt-open]')) { e.preventDefault(); openSheet(); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-pt-open')) { e.preventDefault(); openSheet(); }
  });

  // 피드 저장·별 누름 뒤에 확인한다(두 함수는 romantic-history.js가 window에 만든다)
  function wrap(name, hintOf) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__okbmPoints) return typeof orig === 'function';
    var w = function () {
      var args = arguments;
      var out = orig.apply(this, args);
      Promise.resolve(out).then(function (res) {
        var hint = hintOf(args, res);
        if (hint) check(hint);
      }, function () {});
      return out;
    };
    w.__okbmPoints = true;
    window[name] = w;
    return true;
  }
  var wrapTries = 0;
  function wrapAll() {
    var a = wrap('submitFeedPayload', function (args, res) { return res && res.ok ? 'feed' : ''; });
    var b = wrap('okbmSyncFeedLikeAction', function (args, res) { return args[2] && res && res.success !== false ? 'star_give' : ''; });
    if ((!a || !b) && wrapTries++ < 40) setTimeout(wrapAll, 500);
  }

  // 다른 날이 되어 앱으로 돌아오면 출석을 다시 본다
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { attendTries = 0; attend(); }
  });

  window.okbmPoints = { card: card, open: openSheet, check: check, load: load };

  function start() { wrapAll(); attend(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
