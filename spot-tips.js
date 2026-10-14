// =========================================================================
// 박지 "다녀왔음" → 팁 칩 (2026-10-14, 시안 "3. 박지 상세", DB: SUPABASE_G3_SPOT_TIPS.sql)
// 기존 정보창(map-main.js)은 그대로 두고 덧붙이기만 한다.
// · 찜하기·다녀왔음·공유 줄 아래에 "다녀온 사람들" 칸: N명 다녀옴, 많이 고른 팁, 회원에게 최근 한 줄.
// · 로그인한 사람이 "다녀왔음"을 켜면 아래에서 짧은 창이 올라와 팁 칩·한 줄을 받는다(박지 정보로만 쌓임).
// · "사진과 함께 후기 올리기"는 그 박지가 채워진 후기 올리기 화면을 연다.
// · 인라인 핸들러 없음(이벤트 위임) → csp-extract 대상 아님. 정보창 태그와 겹치는 팁(바닥·어프로치)은 두지 않는다.
// =========================================================================
(function () {
  'use strict';
  if (window.__okbmSpotTipsLoaded) return;
  window.__okbmSpotTipsLoaded = true;

  // 백패킹 박지 기준 팁. one=true 묶음은 하나만 고른다 (DB okbm_spot_tip_allowed와 같아야 한다)
  var GROUPS = [
    { key: 'view', label: '풍경', tips: ['일출 명소', '일몰 명소', '운해', '야경', '별이 잘 보임'] },
    { key: 'size', label: '박지 크기', one: true, tips: ['텐트 1~2동', '텐트 3~5동', '텐트 6동 이상'] },
    { key: 'mood', label: '분위기', one: true, tips: ['조용함', '사람 많음'] },
    { key: 'note', label: '알아 둘 것', tips: ['바람 셈', '그늘 없음', '벌레 많음', '통신 약함'] }
  ];
  var TTL = 2 * 60 * 1000;

  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var toast = function (msg, kind) { if (typeof window.showToast === 'function') window.showToast(msg, kind || 'success', 2400); };
  var loggedIn = function () { return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn(); };
  var isAdmin = function () { return window.__okbmIsAdmin === true; };
  var spotOf = function (id) {
    var list = (Array.isArray(window.spots) && window.spots.length) ? window.spots
      : (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) ? registeredSpots : []);
    return list.find(function (s) { return String(s.id) === String(id); }) || null;
  };
  var shortName = function (s) { return String((s && (s.spot_main || s.name || s.fullName)) || '이 박지').replace(/\s*\(.*?\)/g, '').trim(); };

  // ---------- 서버 ----------
  var store = {}; // id → { at, data, error }
  var inflight = {};
  function rpc(name, args) {
    var c = window.supabaseClient;
    if (c && typeof c.rpc === 'function') {
      return Promise.resolve(c.rpc(name, args)).then(function (res) {
        if (res && res.error) throw res.error;
        return res ? res.data : null;
      });
    }
    var base = window.SUPABASE_URL;
    if (!base || typeof window.okbmPublicFetch !== 'function') return Promise.reject(new Error('no client'));
    return window.okbmPublicFetch(base + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args)
    }).then(function (r) { if (!r.ok) throw new Error(name + ' ' + r.status); return r.json(); });
  }
  function load(id, force) {
    var hit = store[id];
    if (!force && hit && hit.data && Date.now() - hit.at < TTL) return Promise.resolve(hit.data);
    if (inflight[id]) return inflight[id];
    inflight[id] = rpc('okbm_spot_tips_summary', { p_spot_id: id }).then(function (d) {
      store[id] = { at: Date.now(), data: d };
    }).catch(function (e) {
      console.warn('[spot-tips:load]', e);
      store[id] = { at: Date.now(), data: hit ? hit.data : null, error: true };
    }).then(function () {
      delete inflight[id];
      repaint(id);
      return store[id].data;
    });
    return inflight[id];
  }

  function injectCss() {
    if (document.getElementById('okbmSpotTipsCss')) return;
    var css = document.createElement('style');
    css.id = 'okbmSpotTipsCss';
    css.textContent = [
      '.stp-box{background:var(--bg-card,#0e121a);border:1px solid var(--border-hairline,rgba(255,255,255,0.08));border-radius:7px;padding:8px 9px;margin:6px 0 2px}',
      '.stp-h{display:flex;align-items:center;justify-content:space-between;gap:6px;font-weight:800}',
      '.stp-h b{font-size:0.76rem;color:#e2e8f0}.stp-h span{font-size:0.66rem;color:#6ee7b7;font-weight:800}',
      '.stp-line{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}',
      '.stp-line span{font-size:0.64rem;font-weight:800;color:#cbd5e1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:3px 8px}',
      '.stp-empty{font-size:0.68rem;color:#94a3b8;margin-top:5px;line-height:1.45}',
      '.stp-note{display:flex;gap:6px;align-items:baseline;font-size:0.70rem;color:#cbd5e1;margin-top:6px;line-height:1.45}',
      '.stp-note b{flex:none;color:#e2e8f0;font-weight:800;max-width:35%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.stp-note span{min-width:0;overflow-wrap:anywhere}',
      '.stp-note button{flex:none;margin-left:auto;background:none;border:0;color:#ff6b6b;font-size:0.60rem;font-weight:800;cursor:pointer;padding:0 0 0 6px;font-family:inherit}',
      '.stp-mine{display:flex;align-items:center;gap:6px;font-size:0.66rem;color:#94a3b8;margin-top:6px}',
      '.stp-mine button{flex:none;margin-left:auto;background:none;border:0;color:#5bb8f0;font-size:0.64rem;font-weight:800;cursor:pointer;padding:0;font-family:inherit}',
      '.stp-write{width:100%;margin-top:8px;height:32px;border-radius:8px;border:1px solid rgba(91,184,240,0.45);background:rgba(91,184,240,0.1);color:#5bb8f0;font-size:0.72rem;font-weight:800;cursor:pointer;font-family:inherit}',
      '.stp-dim{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2147483644}',
      '.stp-sheet{position:fixed;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483645;max-width:480px;margin:0 auto;background:#10141c;border-radius:18px 18px 0 0;border-top:1px solid rgba(255,255,255,0.1);padding:18px 16px 16px;transform:translateY(110%);transition:transform .3s cubic-bezier(.16,1,.3,1)}',
      '.stp-sheet.on{transform:none}',
      '.stp-sheet h6{margin:0;font-size:1rem;font-weight:900;color:#fff}.stp-sheet p{margin:4px 0 12px;font-size:0.74rem;color:#94a3b8}',
      '.stp-body{max-height:min(52vh,420px);overflow-y:auto;scrollbar-width:none}',
      '.stp-g{margin-top:10px}.stp-g:first-of-type{margin-top:0}.stp-g small{display:block;font-size:0.68rem;font-weight:800;color:#94a3b8;margin-bottom:6px}.stp-g small i{font-style:normal;font-weight:700;color:#64748b}',
      '.stp-chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.stp-chip{height:32px;padding:0 12px;border-radius:999px;border:1px solid #262c3b;background:#141824;color:#cfd4df;font-size:0.76rem;font-weight:800;cursor:pointer;font-family:inherit}',
      '.stp-chip.on{background:#fff;color:#000;border-color:#fff}',
      '.stp-inp{width:100%;box-sizing:border-box;height:42px;margin-top:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);color:#fff;padding:0 12px;font-size:0.84rem;font-family:inherit;outline:none}',
      '.stp-row{display:flex;gap:8px;margin-top:14px}.stp-row button{flex:1;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:0.84rem;font-weight:900;cursor:pointer;font-family:inherit}',
      '.stp-row button.p{background:#5bb8f0;border-color:#5bb8f0;color:#001521}.stp-row button:disabled{opacity:.55}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ---------- 정보창 칸 ----------
  function boxHtml(id) {
    var hit = store[id];
    var write = '<button type="button" class="stp-write" data-stp="write" data-spot="' + esc(id) + '">사진과 함께 후기 올리기</button>';
    if (!hit) return '<div class="stp-h"><b>다녀온 사람들</b></div><div class="stp-empty">불러오는 중…</div>' + write;
    var d = hit.data;
    if (!d) return '<div class="stp-h"><b>다녀온 사람들</b></div><div class="stp-empty">정보를 불러오지 못했어요</div>' + write;
    var tips = d.tips || {};
    var top = Object.keys(tips).sort(function (a, b) { return tips[b] - tips[a]; }).slice(0, 8);
    var visits = Number(d.visits) || 0;
    var notes = (Array.isArray(d.notes) ? d.notes : []).filter(function (n) {
      return n && !(typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc({ id: 'tip_' + id + '_' + n.user_id, user_id: n.user_id }));
    }).slice(0, 2);
    var h = '<div class="stp-h"><b>다녀온 사람들</b>' + (visits ? '<span>' + visits + '명 다녀옴</span>' : '') + '</div>';
    if (top.length) {
      h += '<div class="stp-line">' + top.map(function (t) { return '<span>' + esc(t) + ' ' + tips[t] + '</span>'; }).join('') + '</div>';
    } else {
      h += '<div class="stp-empty">' + (visits ? '아직 남긴 팁이 없어요. 다녀왔다면 첫 팁을 남겨 주세요.' : '아직 다녀온 사람이 없어요. 다녀왔다면 "다녀왔음"을 눌러 주세요.') + '</div>';
    }
    h += notes.map(function (n) {
      return '<div class="stp-note"><b>' + esc(n.nickname || '백패커') + '</b><span>' + esc(n.note) + '</span>' +
        (isAdmin() ? '<button type="button" data-stp="del" data-spot="' + esc(id) + '" data-uid="' + esc(n.user_id) + '">삭제 (운영팀)</button>' : '') + '</div>';
    }).join('');
    if (d.mine) {
      var mineText = [].concat(d.mine.tips || []).join(', ') || d.mine.note || '';
      h += '<div class="stp-mine"><span>내가 남긴 팁: ' + esc(mineText) + '</span><button type="button" data-stp="edit" data-spot="' + esc(id) + '">고치기</button></div>';
    }
    return h + write;
  }
  function repaint(id) {
    document.querySelectorAll('[data-okbm-tips-box]').forEach(function (b) {
      if (b.getAttribute('data-okbm-tips-box') === String(id)) b.innerHTML = boxHtml(String(id));
    });
  }
  // 찜하기·다녀왔음·공유 줄 바로 아래에 붙인다 (기존 별점 후기 칸은 그 자리 그대로)
  function attachBoxes(root) {
    (root || document).querySelectorAll('.user-action-grid-3').forEach(function (row) {
      var vb = row.querySelector('.btn-action-visited');
      var id = vb && vb.getAttribute('data-id');
      if (!id) return;
      var next = row.nextElementSibling;
      if (next && next.getAttribute && next.getAttribute('data-okbm-tips-box') === id) return;
      var box = document.createElement('div');
      box.className = 'stp-box';
      box.setAttribute('data-okbm-tips-box', id);
      box.innerHTML = boxHtml(id);
      row.parentNode.insertBefore(box, row.nextSibling);
      load(id, false);
    });
  }

  // ---------- 아래에서 올라오는 창 ----------
  var sheet = null, dim = null, sheetSpot = '';
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('on');
    var s = sheet, d = dim;
    sheet = null; dim = null;
    setTimeout(function () { if (s) s.remove(); if (d) d.remove(); }, 300);
  }
  function openSheet(id) {
    injectCss();
    closeSheet();
    sheetSpot = String(id);
    var mine = (store[id] && store[id].data && store[id].data.mine) || null;
    var picked = mine && Array.isArray(mine.tips) ? mine.tips : [];
    dim = document.createElement('div');
    dim.className = 'stp-dim';
    sheet = document.createElement('div');
    sheet.className = 'stp-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', '다녀온 박지 팁 남기기');
    sheet.innerHTML = '<h6>' + esc(shortName(spotOf(id))) + ' 다녀오셨군요!</h6>' +
      '<p>해당하는 것만 눌러 주세요. 다음 사람에게 큰 도움이 돼요.</p>' +
      '<div class="stp-body">' + GROUPS.map(function (g) {
        return '<div class="stp-g"><small>' + esc(g.label) + (g.one ? '' : ' <i>여러 개</i>') + '</small><div class="stp-chips" data-stp-group="' + g.key + '"' + (g.one ? ' data-one="1"' : '') + '>' +
          g.tips.map(function (t) { return '<button type="button" class="stp-chip' + (picked.indexOf(t) !== -1 ? ' on' : '') + '" data-stp-chip="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div></div>';
      }).join('') +
      '<input class="stp-inp" maxlength="60" placeholder="한 줄 남기기 (안 써도 돼요)" value="' + esc(mine ? mine.note : '') + '"></div>' +
      '<div class="stp-row"><button type="button" data-stp="skip">다음에</button><button type="button" class="p" data-stp="save">남기기</button></div>';
    document.body.appendChild(dim);
    document.body.appendChild(sheet);
    void sheet.offsetHeight; // 처음 자리를 잡은 뒤 올린다
    setTimeout(function () { if (sheet) sheet.classList.add('on'); }, 20);
    dim.addEventListener('click', closeSheet);
    sheet.addEventListener('click', onSheetClick);
  }
  function onSheetClick(e) {
    var chip = e.target.closest('[data-stp-chip]');
    if (chip) {
      var grp = chip.closest('[data-stp-group]');
      var turnOn = !chip.classList.contains('on');
      if (grp && grp.getAttribute('data-one') === '1') grp.querySelectorAll('.stp-chip').forEach(function (c) { c.classList.remove('on'); });
      chip.classList.toggle('on', turnOn);
      return;
    }
    var b = e.target.closest('[data-stp]');
    if (!b) return;
    if (b.getAttribute('data-stp') === 'skip') { closeSheet(); return; }
    if (b.getAttribute('data-stp') === 'save') save(b);
  }
  function save(btn) {
    var id = sheetSpot;
    var tips = Array.prototype.map.call(sheet.querySelectorAll('.stp-chip.on'), function (c) { return c.getAttribute('data-stp-chip'); });
    var note = String((sheet.querySelector('.stp-inp') || {}).value || '').trim();
    if (!tips.length && !note) { toast('팁을 하나 고르거나 한 줄을 적어 주세요.', 'warn'); return; }
    btn.disabled = true;
    rpc('okbm_save_spot_tips', { p_spot_id: id, p_tips: tips, p_note: note }).then(function (d) {
      store[id] = { at: Date.now(), data: d };
      repaint(id);
      closeSheet();
      if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(12); } catch (err) {} }
      toast('고마워요! ' + shortName(spotOf(id)) + ' 정보에 쌓였어요.');
    }).catch(function (err) {
      console.warn('[spot-tips:save]', err);
      var m = String((err && err.message) || '');
      btn.disabled = false;
      if (m.indexOf('not authenticated') !== -1) { closeSheet(); if (typeof window.openLoginModal === 'function') window.openLoginModal(); return; }
      toast(m.indexOf('rate limit') !== -1 ? '잠시 뒤에 다시 남겨 주세요.' : '남기지 못했어요. 잠시 뒤 다시 해 주세요.', 'warn');
    });
  }

  // 로그인한 사람이 "다녀왔음"을 켤 때만 창을 연다 (기존 표시 동작이 끝난 뒤)
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.btn-action-visited') : null;
    if (!btn || !loggedIn()) return;
    var id = btn.getAttribute('data-id');
    if (btn.classList.contains('visited')) return; // 다녀옴을 끄는 경우는 창을 띄우지 않는다
    // 기존 표시 동작은 서버 동기화를 기다려 늦게 끝날 수 있어, 버튼이 켜질 때까지 잠깐 지켜본다
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var nowOn = !!document.querySelector('.btn-action-visited.visited[data-id="' + id + '"]');
      if (nowOn) { clearInterval(timer); load(id, true); openSheet(id); }
      else if (tries > 30) clearInterval(timer);
    }, 100);
  }, true);

  // 칸 안의 버튼: 후기 올리기 / 고치기 / 운영팀 삭제
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-okbm-tips-box] [data-stp]') : null;
    if (!b) return;
    var id = b.getAttribute('data-spot');
    var act = b.getAttribute('data-stp');
    if (act === 'write') {
      if (typeof window.openPastTripRegisterModal !== 'function') return;
      window.openPastTripRegisterModal(e);
      if (!document.getElementById('pastTripRegisterModal')) return; // 로그인 창이 뜬 경우
      var pool = typeof window._pastTripBuildSpotSearchPool === 'function' ? window._pastTripBuildSpotSearchPool() : [];
      var item = pool.find(function (p) { return String(p.id) === String(id); });
      if (item && typeof window.selectPastTripSpot === 'function') window.selectPastTripSpot(item, false);
    } else if (act === 'edit') {
      openSheet(id);
    } else if (act === 'del' && isAdmin()) {
      if (!window.confirm('이 팁을 지울까요?')) return;
      rpc('okbm_admin_delete_spot_tip', { p_spot_id: id, p_user_id: b.getAttribute('data-uid') })
        .then(function () { toast('지웠어요.'); load(id, true); })
        .catch(function (err) { console.warn('[spot-tips:del]', err); toast('지우지 못했어요.', 'warn'); });
    }
  });

  function start() {
    injectCss();
    attachBoxes(document);
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; attachBoxes(document); }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
