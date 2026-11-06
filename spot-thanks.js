// =========================================================================
// 고마워요 단추 (2026-11-07, 대표님. 설계 TASK_CONTRIBUTOR_LNT.md E, 서버 SUPABASE_I5_SPOT_THANKS.sql)
//
// 정보창에 새 칸을 만들지 않고, 사람들이 이미 쓰는 순간에만 한 줄을 붙인다.
//   ① GPX 선을 켰을 때 '내 등산 앱으로 보내기' 밑: "○○님이 올려 준 길이에요 [고마워요]" (map-main.js)
//   ② 금색 '제보 ○○'로 연 프로필의 관심 루터·쪽지 밑: "△△을 알려 준 분이에요" (user-profile.js)
//   ③ '다녀왔음'·후기 창 맨 위: "○○님이 알려 준 박지예요 [고마워요]" (spot-tips.js)
// 받을 사람은 박지 등록자와 GPX 올린 사람. 관리자·공식 계정이면 서버가 빼서 줄이 안 생긴다. 내 박지면 안 보인다.
// 같은 박지·같은 사람에게 한 번. 받은 사람에게만 보낸 사람이 알림으로 가고, 남에게는 숫자만 보인다.
// 인라인 onclick을 쓰지 않는다(data-okbm-thanks-send로 받는다. CSP 해시가 필요 없게).
// =========================================================================
(function () {
  'use strict';

  var TTL = 60000;
  var store = {};      // 박지 id → { at, list: [{user_id, nick, kind, n, sent, self}] }
  var inflight = {};
  var counts = {};     // 사람 id → { at, job } 받은 고마워요 합계(프로필 숫자 줄)

  var HEART = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var CSS = [
    '.okbm-thx{display:flex;align-items:center;gap:8px;margin-top:6px;padding:6px 8px 6px 10px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);box-sizing:border-box}',
    '.okbm-thx:empty{display:none}',
    '.okbm-thx-t{flex:1;min-width:0;font-size:0.7rem;color:#d1d1d6;line-height:1.4;word-break:keep-all}',
    '.okbm-thx-t b{color:#f2f2f3;font-weight:800}',
    '.okbm-thx-b{display:inline-flex;align-items:center;gap:4px;height:28px;padding:0 11px;border-radius:14px;border:1px solid rgba(255,255,255,0.16);background:transparent;color:#f2f2f3;font:inherit;font-size:0.68rem;font-weight:800;cursor:pointer;flex-shrink:0;white-space:nowrap}',
    '.okbm-thx-b.on{border-color:rgba(251,191,36,0.45);background:rgba(251,191,36,0.10);color:#fde047;cursor:default}',
    '.okbm-thx-b:disabled{opacity:.6}',
    '.stp-sheet .okbm-thx{margin:10px 0 2px;padding:8px 10px;border-radius:10px;border-color:rgba(255,255,255,0.10)}',
    '.stp-sheet .okbm-thx-t{font-size:13px}',
    '.stp-sheet .okbm-thx-t b{color:#fde047}',
    '.stp-sheet .okbm-thx-b{height:30px;font-size:12px}',
    '#userFeedCollectionModal .okbm-thx{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.30)}',
    '#userFeedCollectionModal .okbm-thx-t{font-size:13px;color:#8b8b93}',
    '#userFeedCollectionModal .okbm-thx-t b{display:block;font-size:13px;color:#f2f2f3;font-weight:700}',
    '#userFeedCollectionModal .okbm-thx-b{height:32px;padding:0 12px;border-radius:16px;border-color:rgba(251,191,36,0.55);color:#fde047;font-size:13px}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('okbmThanksCss')) return;
    var st = document.createElement('style');
    st.id = 'okbmThanksCss';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function loggedIn() { return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn(); }
  function rpc(name, args) {
    var client = window.supabaseClient;
    if (!client || typeof client.rpc !== 'function') return Promise.reject(new Error('no_client'));
    return Promise.resolve(client.rpc(name, args)).then(function (res) {
      if (res && res.error) throw res.error;
      return res ? res.data : null;
    });
  }
  function spotName(sId) {
    var list = Array.isArray(window.spots) && window.spots.length ? window.spots : (Array.isArray(window.registeredSpots) ? window.registeredSpots : []);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id).trim() === sId) {
        return String(list[i].spot_main || list[i].name || '').replace(/\s*[\(\[（].*?[\)\]）]/g, '').trim() || '이 박지';
      }
    }
    return '이 박지';
  }

  function load(sId, force) {
    var hit = store[sId];
    if (!force && hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.list);
    if (inflight[sId]) return inflight[sId];
    inflight[sId] = rpc('okbm_spot_thanks_info', { p_spot_id: sId }).then(function (list) {
      store[sId] = { at: Date.now(), list: Array.isArray(list) ? list : [] };
      return store[sId].list;
    }).catch(function () {
      return hit ? hit.list : [];
    }).finally(function () { delete inflight[sId]; });
    return inflight[sId];
  }

  // 자리마다 누구를 보여 줄지: gpx는 GPX 올린 사람만, review는 등록자 먼저(없으면 GPX 올린 사람), profile은 그 사람
  function pick(list, where, uid) {
    list = (list || []).filter(function (p) { return p && !p.self; });
    if (where === 'gpx') return list.filter(function (p) { return p.kind === 'gpx'; })[0] || null;
    if (where === 'profile') return list.filter(function (p) { return p.user_id === uid; })[0] || null;
    return list.filter(function (p) { return p.kind === 'spot'; })[0] || list[0] || null;
  }
  function buttonHtml(sId, p, act) {
    var attr = act ? ' data-up-act="thanks"' : ' data-okbm-thanks-send="1"';
    return p.sent
      ? '<button type="button" class="okbm-thx-b on" aria-pressed="true">' + CHECK + '고마워했어요</button>'
      : '<button type="button" class="okbm-thx-b"' + attr + ' data-spot="' + esc(sId) + '" data-to="' + esc(p.user_id) + '" aria-pressed="false">' + HEART + '고마워요</button>';
  }
  function lineInner(sId, where, p) {
    if (!p) return '';
    var text;
    if (where === 'gpx') text = '<b>' + esc(p.nick) + '</b>님이 올려 준 길이에요';
    else if (where === 'profile') text = '<b>' + esc(spotName(sId)) + (p.kind === 'gpx' ? ' 길을 올려 준 분이에요' : '을 알려 준 분이에요') + '</b>' + (p.n > 0 ? p.n + '명이 고마워했어요' : '');
    else text = '<b>' + esc(p.nick) + '</b>님이 ' + (p.kind === 'gpx' ? '올려 준 길이 있는 박지예요' : '알려 준 박지예요');
    return '<span class="okbm-thx-t">' + text + '</span>' + buttonHtml(sId, p, where === 'profile');
  }

  // 빈 자리를 먼저 두고(정보창·후기 창은 바로 그려야 해서) 받아 온 뒤 채운다
  function slotHtml(sId, where, uid) {
    injectCss();
    sId = String(sId || '').trim();
    if (!sId) return '';
    var hit = store[sId];
    var inner = hit ? lineInner(sId, where, pick(hit.list, where, uid)) : '';
    return '<div class="okbm-thx" data-okbm-thanks-slot="' + esc(sId) + '" data-where="' + esc(where) + '"' + (uid ? ' data-uid="' + esc(uid) + '"' : '') + '>' + inner + '</div>';
  }
  function paint(sId) {
    var hit = store[sId];
    if (!hit) return;
    document.querySelectorAll('[data-okbm-thanks-slot]').forEach(function (el) {
      if (el.getAttribute('data-okbm-thanks-slot') !== sId) return;
      el.innerHTML = lineInner(sId, el.getAttribute('data-where') || '', pick(hit.list, el.getAttribute('data-where'), el.getAttribute('data-uid') || ''));
    });
  }
  function fill(sId, force) {
    sId = String(sId || '').trim();
    if (!sId) return Promise.resolve([]);
    return load(sId, force).then(function (list) { paint(sId); return list; });
  }

  function send(el) {
    var sId = String(el.getAttribute('data-spot') || '').trim();
    var to = String(el.getAttribute('data-to') || '').trim();
    if (!sId || !to || el.disabled) return;
    if (!loggedIn()) {
      if (typeof window.openLoginModal === 'function') window.openLoginModal();
      return;
    }
    el.disabled = true;
    rpc('okbm_send_thanks', { p_spot_id: sId, p_to_user: to }).then(function (res) {
      var hit = store[sId];
      var p = hit && hit.list.filter(function (x) { return x.user_id === to; })[0];
      if (p) { p.sent = true; p.n = Number(res && res.n) || (p.n + 1); }
      if (res && res.new && counts[to]) delete counts[to];
      paint(sId);
      if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_spot_thanks'); // 기능 사용 세기 (H8)
      if (typeof window.showToast === 'function') window.showToast((p ? p.nick + '님께 ' : '') + '고마움을 전했어요', 'success', 2000);
      if (typeof window.okbmThanksAfterSend === 'function') window.okbmThanksAfterSend(to);
    }).catch(function () {
      el.disabled = false;
      if (typeof window.showToast === 'function') window.showToast('보내지 못했어요. 잠시 뒤 다시 눌러 주세요.', 'error', 2200);
    });
  }

  // 휴대폰 정보창(#mobileBottomSheet)이 onclick에서 stopPropagation을 해서 버블 단계로는 못 받는다. 캡처 단계로 받는다
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-okbm-thanks-send]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    send(el);
  }, true);

  window.okbmThanksSlotHtml = slotHtml;
  window.okbmThanksFill = fill;
  window.okbmThanksSend = send;
  window.okbmThanksFor = function (sId, uid) {
    var hit = store[String(sId || '').trim()];
    return hit ? pick(hit.list, 'profile', uid) : null;
  };
  // 프로필 숫자 줄: 받은 고마워요 합계. 사람마다 1분 동안 한 번만 묻는다
  window.okbmUserThanksCount = function (uid) {
    uid = String(uid || '').trim();
    if (!uid) return Promise.resolve(null);
    var hit = counts[uid];
    if (hit && Date.now() - hit.at < TTL) return hit.job;
    var job = rpc('okbm_user_thanks_count', { p_user_id: uid }).then(function (n) {
      return (n === null || isNaN(Number(n))) ? null : Number(n);
    }).catch(function () { return null; });
    counts[uid] = { at: Date.now(), job: job };
    return job;
  };
})();
