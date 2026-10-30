// 빠른 레디샷 (2026-10-31). 홈 '레디샷' 칸을 누르면 길을 고른다.
//   무게만 빠르게: 저울에 잰 무게 + 사진 한 장(+ 장소·한줄 메모 선택) → 레디샷 창(templates.js)을 무게형 템플릿 6개로 연다
//   장비로 계산하기: 예전처럼 패킹 계산기(openPlanModal('calculator'))
// 9일 기록(10/23~31)에서 레디샷 칸 누른 54명 중 레디샷을 만든 사람이 0명이었다. 장비를 하나씩 담고 장소·저장을 거쳐야 해서.
// 시안: .claude/mockups/readyshot-quick/1-readyshot-quick-flow.png
(function () {
  'use strict';
  if (window.__okbmReadyShotQuickBooted) return;
  window.__okbmReadyShotQuickBooted = true;

  var KG_KEY = 'okbm_quick_ready_kg';
  var CHIPS = [5, 6, 7, 8, 10, 12];
  var S = { kg: 7, file: null, url: '', spot: '', elev: '', picked: '' };
  var sheetEl = null, formEl = null;

  function metric(name) { if (typeof window.okbmMetric === 'function') window.okbmMetric(name); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg, 'info', 2200); }
  function lock() { if (typeof window.lockHomeScrollForTripModal === 'function') window.lockHomeScrollForTripModal(); else document.documentElement.style.overflow = 'hidden'; }
  function unlock() { if (typeof window.unlockHomeScrollForTripModal === 'function') window.unlockHomeScrollForTripModal(); else document.documentElement.style.overflow = ''; }
  function register(id, fn) { if (typeof window.registerModalOpen === 'function') window.registerModalOpen(id, fn); }
  function unregister(id) { if (typeof window.unregisterModalClose === 'function') window.unregisterModalClose(id); }

  // 계산기(romantic-plan.js)와 같은 등급: 6kg 이하 UL 초경량, 14kg 넘으면 헤비
  function grade(kg) {
    if (kg <= 6) return { t: 'UL 초경량 (≤6kg)', c: '#2dd4bf' };
    if (kg > 14) return { t: '헤비 (14kg+)', c: '#f87171' };
    return { t: '스탠다드 (6~14kg)', c: '#f59e0b' };
  }
  function clampKg(v) { v = Math.round(Number(v) * 10) / 10; if (!isFinite(v)) v = 7; return Math.min(40, Math.max(0.5, v)); }
  function fmtKg(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
  function today() { var d = new Date(); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); }
  // 등록 박지 목록: romantic-sync.js가 받아 둔 캐시(okbmReadSpotsCache)
  function spotPool() {
    try {
      var c = typeof window.okbmReadSpotsCache === 'function' ? window.okbmReadSpotsCache() : null;
      if (Array.isArray(c) && c.length) return c;
      if (Array.isArray(window.registeredSpots) && window.registeredSpots.length) return window.registeredSpots;
      return typeof window.safeGetJSON === 'function' ? (window.safeGetJSON('okbm_spots_cache', []) || []) : [];
    } catch (e) { return []; }
  }

  function ensureCss() {
    if (document.getElementById('okbmRsqCss')) return;
    var st = document.createElement('style');
    st.id = 'okbmRsqCss';
    st.textContent = [
      '.rsq-scrim{position:fixed;inset:0;z-index:2000004;background:rgba(0,0,0,.6);opacity:0;transition:opacity .25s}',
      '.rsq-scrim.on{opacity:1}',
      '.rsq-sheet{position:fixed;left:0;right:0;bottom:0;z-index:2000005;max-width:480px;margin:0 auto;background:#141418;border-radius:22px 22px 0 0;padding:10px 18px calc(18px + 56px + env(safe-area-inset-bottom,0px));color:#fff;transform:translateY(100%);transition:transform .3s cubic-bezier(.16,1,.3,1);box-sizing:border-box}',
      '.rsq-sheet.on{transform:none}',
      '.rsq-grab{width:40px;height:4px;border-radius:9px;background:#3a3a42;margin:0 auto 16px}',
      '.rsq-sheet h3{font-size:20px;font-weight:900;margin:0}',
      '.rsq-sheet .rsq-s{margin:6px 0 0;font-size:13.5px;color:#a1a1aa}',
      '.rsq-opt{display:flex;gap:14px;align-items:center;width:100%;margin-top:12px;padding:15px;border-radius:16px;background:#1d1d22;border:1px solid #2a2a31;color:#fff;text-align:left;cursor:pointer;box-sizing:border-box;font:inherit}',
      '.rsq-opt.main{background:linear-gradient(135deg,#2a2412,#1d1d22 70%);border-color:#FFC83D}',
      '.rsq-opt .ic{width:52px;height:52px;border-radius:12px;flex:none;background:#26262c;display:flex;align-items:center;justify-content:center;color:#e4e4e7}',
      '.rsq-opt.main .ic{background:#3a3016;color:#FFC83D}',
      '.rsq-opt b{display:block;font-size:16.5px;font-weight:800}',
      '.rsq-opt b i{font-style:normal;margin-left:6px;padding:2px 7px;border-radius:99px;background:#FFC83D;color:#1a1206;font-size:11px;font-weight:800;vertical-align:2px}',
      '.rsq-opt span{display:block;margin-top:4px;font-size:13px;line-height:1.45;color:#a1a1aa}',
      '.rsq-form{position:fixed;inset:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));z-index:2000005;background:#0b0b0d;color:#fff;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
      '.rsq-in{max-width:480px;margin:0 auto;padding:calc(10px + env(safe-area-inset-top,0px)) 18px 96px;box-sizing:border-box}',
      '.rsq-top{display:flex;align-items:center;gap:10px;height:44px;font-size:17px;font-weight:800}',
      '.rsq-back{width:34px;height:34px;border-radius:50%;border:0;background:#1d1d22;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
      '.rsq-q{margin-top:8px;font-size:23px;font-weight:900}',
      '.rsq-qs{margin-top:6px;font-size:13.5px;color:#a1a1aa}',
      '.rsq-kg{margin-top:16px;display:flex;align-items:center;justify-content:space-between;padding:16px;border-radius:18px;background:#17171b;border:1px solid #2a2a31}',
      '.rsq-step{width:46px;height:46px;border-radius:50%;border:0;background:#26262c;color:#fff;font-size:24px;font-weight:700;cursor:pointer;flex:none}',
      '.rsq-num{display:flex;align-items:baseline;justify-content:center;gap:4px;min-width:0}',
      '.rsq-num input{width:150px;background:none;border:0;outline:none;text-align:right;color:#FFC83D;font-size:54px;font-weight:900;letter-spacing:-1.5px;padding:0;font-family:inherit}',
      '.rsq-num small{font-size:22px;font-weight:800}',
      '.rsq-chips{display:flex;gap:7px;margin-top:12px}',
      '.rsq-chips button{flex:1;padding:10px 0;border-radius:10px;border:0;background:#1d1d22;color:#d4d4d8;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}',
      '.rsq-chips button.on{background:#3a3016;color:#FFC83D;box-shadow:inset 0 0 0 1px #FFC83D}',
      '.rsq-grade{margin-top:14px;font-size:13px;font-weight:700}',
      '.rsq-bar{position:relative;height:8px;border-radius:9px;margin-top:8px;background:linear-gradient(90deg,#2dd4bf 0 15%,#f59e0b 15% 35%,#f87171 35%)}',
      '.rsq-bar i{position:absolute;top:-5px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff;border:3px solid #0b0b0d;transition:left .2s}',
      '.rsq-bl{display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;color:#8b8b93}',
      '.rsq-lab{margin-top:20px;font-size:15px;font-weight:800}',
      '.rsq-lab em{font-style:normal;font-size:12px;font-weight:500;color:#8b8b93;margin-left:6px}',
      '.rsq-pick{display:flex;gap:10px;margin-top:10px}',
      '.rsq-pick button,.rsq-thumb{width:86px;height:86px;border-radius:14px;flex:none;box-sizing:border-box}',
      '.rsq-pick button{background:#17171b;border:1.5px dashed #3a3a42;color:#a1a1aa;font-size:12px;font-weight:700;line-height:1.4;cursor:pointer;font-family:inherit}',
      '.rsq-thumb{object-fit:cover;outline:2px solid #FFC83D;outline-offset:-2px}',
      '.rsq-field{width:100%;margin-top:10px;height:46px;padding:0 14px;border-radius:12px;background:#17171b;border:1px solid #2a2a31;color:#fff;font-size:15px;outline:none;box-sizing:border-box;font-family:inherit}',
      '.rsq-field:focus{border-color:#52525b}',
      '.rsq-sug{margin-top:6px;border-radius:12px;background:#17171b;border:1px solid #2a2a31;overflow:hidden}',
      '.rsq-sug button{display:block;width:100%;padding:11px 14px;border:0;border-top:1px solid #222228;background:none;color:#e4e4e7;text-align:left;font-size:14px;cursor:pointer;font-family:inherit}',
      '.rsq-sug button:first-child{border-top:0}',
      '.rsq-sug small{color:#8b8b93;margin-left:6px}',
      '.rsq-go{position:fixed;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));z-index:2000006;padding:10px 18px 12px;background:linear-gradient(transparent,#0b0b0d 30%)}',
      '.rsq-go button{display:block;width:100%;max-width:444px;margin:0 auto;height:54px;border-radius:14px;border:0;background:#FFC83D;color:#1a1206;font-size:17px;font-weight:900;cursor:pointer;font-family:inherit}'
    ].join('');
    document.head.appendChild(st);
  }

  var IC_BOLT = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  var IC_LIST = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>';
  var IC_BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

  // ----- 길 고르기 -----
  function closeChooser(instant) {
    if (!sheetEl) return;
    var s = sheetEl;
    sheetEl = null;
    unregister('okbmRsqSheet');
    unlock();
    var sc = s.previousElementSibling;
    if (instant === true) { s.remove(); if (sc) sc.remove(); return; }
    s.classList.remove('on');
    if (sc) sc.classList.remove('on');
    setTimeout(function () { s.remove(); if (sc) sc.remove(); }, 300);
  }
  function openChooser() {
    ensureCss();
    closeChooser(true);
    metric('feat_readyshot_choose');
    var sc = document.createElement('div');
    sc.className = 'rsq-scrim';
    sc.setAttribute('data-rsq', 'shut');
    var s = document.createElement('div');
    s.className = 'rsq-sheet';
    s.id = 'okbmRsqSheet';
    s.setAttribute('role', 'dialog');
    s.setAttribute('aria-modal', 'true');
    s.setAttribute('aria-labelledby', 'okbmRsqTitle');
    s.innerHTML = '<div class="rsq-grab" aria-hidden="true"></div>' +
      '<h3 id="okbmRsqTitle">레디샷 만들기</h3><p class="rsq-s">배낭 무게를 사진 위에 입혀 인증샷으로 남겨요</p>' +
      '<button type="button" class="rsq-opt main" data-rsq="quick"><span class="ic">' + IC_BOLT + '</span><span><b>무게만 빠르게<i>30초</i></b><span>저울에 잰 숫자와 사진 한 장이면 끝.<br>무게 템플릿 6개</span></span></button>' +
      '<button type="button" class="rsq-opt" data-rsq="gear"><span class="ic">' + IC_LIST + '</span><span><b>장비로 계산하기</b><span>장비를 담으면 무게가 자동으로 더해져요.<br>장비 목록 템플릿까지 17개 전부</span></span></button>';
    document.body.appendChild(sc);
    document.body.appendChild(s);
    sheetEl = s;
    lock();
    register('okbmRsqSheet', closeChooser);
    void s.offsetHeight;
    sc.classList.add('on');
    s.classList.add('on');
  }

  // ----- 무게·사진 -----
  function paintKg() {
    if (!formEl) return;
    var inp = formEl.querySelector('#rsqKgInput');
    if (inp && document.activeElement !== inp) inp.value = fmtKg(S.kg);
    var g = grade(S.kg);
    var gEl = formEl.querySelector('.rsq-grade');
    if (gEl) { gEl.textContent = g.t; gEl.style.color = g.c; }
    var dot = formEl.querySelector('.rsq-bar i');
    // 막대: 0~6 / 6~14 / 14~40kg를 15% / 20% / 65%에 나눠 둔다(색 띠와 같은 비율)
    var p = S.kg <= 6 ? S.kg / 6 * 15 : (S.kg <= 14 ? 15 + (S.kg - 6) / 8 * 20 : 35 + Math.min(1, (S.kg - 14) / 26) * 65);
    if (dot) dot.style.left = Math.max(2, Math.min(98, p)) + '%';
    formEl.querySelectorAll('.rsq-chips button').forEach(function (b) { b.classList.toggle('on', Number(b.getAttribute('data-kg')) === S.kg); });
  }
  function paintPhoto() {
    if (!formEl) return;
    var box = formEl.querySelector('.rsq-pick');
    if (!box) return;
    box.innerHTML = (S.url ? '<img class="rsq-thumb" src="' + esc(S.url) + '" alt="고른 사진">' : '') +
      '<button type="button" data-rsq="album">앨범에서<br>고르기</button>' +
      '<button type="button" data-rsq="camera">카메라로<br>찍기</button>';
  }
  function paintSug(q) {
    var box = formEl && formEl.querySelector('.rsq-sug');
    if (!box) return;
    q = String(q || '').trim().toLowerCase();
    if (!q || (S.picked && q === S.picked.toLowerCase())) { box.hidden = true; box.innerHTML = ''; return; }
    var list = spotPool().filter(function (s) {
      var n = String((s && (s.fullName || s.name)) || '').toLowerCase();
      var a = String((s && (s.address || s.region)) || '').toLowerCase();
      return n.indexOf(q) !== -1 || a.indexOf(q) !== -1;
    }).slice(0, 6);
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = list.map(function (s) {
      var n = s.fullName || s.name, e = s.elevation ? (String(s.elevation).indexOf('m') !== -1 ? s.elevation : s.elevation + 'm') : '';
      return '<button type="button" data-rsq="spot" data-name="' + esc(n) + '" data-elev="' + esc(e) + '">' + esc(n) + (e ? '<small>' + esc(e) + '</small>' : '') + '</button>';
    }).join('');
  }
  function closeForm() {
    if (!formEl) return;
    var f = formEl, go = f.nextElementSibling;
    formEl = null;
    unregister('okbmRsqForm');
    unlock();
    f.remove();
    if (go && go.classList.contains('rsq-go')) go.remove();
  }
  function openForm() {
    ensureCss();
    closeForm();
    metric('feat_readyshot_quick_form');
    try { var saved = parseFloat(localStorage.getItem(KG_KEY) || ''); if (saved > 0) S.kg = clampKg(saved); } catch (e) {}
    S.file = null; S.url = ''; S.spot = ''; S.elev = ''; S.picked = '';
    var f = document.createElement('div');
    f.className = 'rsq-form';
    f.id = 'okbmRsqForm';
    f.setAttribute('role', 'dialog');
    f.setAttribute('aria-modal', 'true');
    f.setAttribute('aria-labelledby', 'okbmRsqFormTitle');
    f.innerHTML = '<div class="rsq-in">' +
      '<div class="rsq-top"><button type="button" class="rsq-back" data-rsq="close" aria-label="뒤로">' + IC_BACK + '</button><span id="okbmRsqFormTitle">무게만 빠르게</span></div>' +
      '<div class="rsq-q">배낭 무게는?</div>' +
      '<div class="rsq-qs">체중계나 손저울로 잰 숫자를 그대로 넣어 주세요</div>' +
      '<div class="rsq-kg"><button type="button" class="rsq-step" data-rsq="minus" aria-label="0.1kg 빼기">−</button>' +
        '<label class="rsq-num"><input id="rsqKgInput" type="text" inputmode="decimal" autocomplete="off" aria-label="배낭 무게(kg)"><small>kg</small></label>' +
        '<button type="button" class="rsq-step" data-rsq="plus" aria-label="0.1kg 더하기">+</button></div>' +
      '<div class="rsq-chips">' + CHIPS.map(function (k) { return '<button type="button" data-rsq="chip" data-kg="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
      '<div class="rsq-grade"></div><div class="rsq-bar" aria-hidden="true"><i></i></div>' +
      '<div class="rsq-bl" aria-hidden="true"><span>초경량 ~6</span><span>스탠다드 6~14</span><span>헤비 14~</span></div>' +
      '<div class="rsq-lab">사진 한 장</div><div class="rsq-pick"></div>' +
      '<input type="file" id="rsqAlbum" accept="image/*" hidden><input type="file" id="rsqCamera" accept="image/*" capture="environment" hidden>' +
      '<div class="rsq-lab">어디 가요?<em>선택</em></div>' +
      '<input class="rsq-field" id="rsqSpot" type="text" placeholder="장소 검색 (안 골라도 돼요)" autocomplete="off"><div class="rsq-sug" hidden></div>' +
      '<div class="rsq-lab">한줄 메모<em>선택 · 카드에 찍혀요</em></div>' +
      '<input class="rsq-field" id="rsqMemo" type="text" maxlength="40" placeholder="예: 사명산 야경 보러 가는 길" autocomplete="off">' +
      '</div>';
    var go = document.createElement('div');
    go.className = 'rsq-go';
    go.innerHTML = '<button type="button" data-rsq="make">레디샷 만들기</button>';
    document.body.appendChild(f);
    document.body.appendChild(go);
    formEl = f;
    lock();
    register('okbmRsqForm', closeForm);
    paintKg();
    paintPhoto();
    f.addEventListener('change', onFormChange);
    f.addEventListener('input', onFormInput);
    f.querySelector('#rsqKgInput').addEventListener('blur', function () { paintKg(); });
  }
  function onFormInput(e) {
    var t = e.target;
    if (t.id === 'rsqKgInput') {
      var v = parseFloat(String(t.value).replace(',', '.'));
      if (v > 0) { S.kg = clampKg(v); paintKg(); }
    } else if (t.id === 'rsqSpot') {
      S.spot = String(t.value || '').trim(); S.elev = ''; S.picked = '';
      paintSug(t.value);
    }
  }
  function onFormChange(e) {
    var t = e.target;
    if ((t.id === 'rsqAlbum' || t.id === 'rsqCamera') && t.files && t.files[0]) {
      if (S.url) { try { URL.revokeObjectURL(S.url); } catch (e2) {} }
      S.file = t.files[0];
      try { S.url = URL.createObjectURL(S.file); } catch (e3) { S.url = ''; }
      t.value = '';
      paintPhoto();
    }
  }

  function make() {
    if (!S.file) { toast('사진 한 장을 골라 주세요'); return; }
    var memoEl = formEl && formEl.querySelector('#rsqMemo');
    var memo = memoEl ? String(memoEl.value || '').trim() : '';
    var kg = S.kg, file = S.file, spot = S.spot, elev = S.elev;
    try { localStorage.setItem(KG_KEY, String(kg)); } catch (e) {}
    metric('feat_readyshot_quick_make');
    var ensure = typeof window.okbmEnsureTemplates === 'function' ? window.okbmEnsureTemplates() : Promise.resolve();
    Promise.resolve(ensure).then(function () {
      if (typeof window.openPackShareModal !== 'function') throw new Error('templates');
      closeForm();
      var rec = {
        id: 'pack_' + Date.now(),
        date: today(),
        spot: spot,
        elevation: elev,
        weightKg: kg.toFixed(2),
        weightGrams: Math.round(kg * 1000),
        itemCount: 0,
        items: [],
        oneLineMemo: memo,
        readyShotMode: 'poster' // 처음엔 블랙 포스터(글자 안에 사진)로 보인다
      };
      window.openPackShareModal(rec, [], true, { quick: true });
      // 사진은 레디샷 창의 올리기 함수에 그대로 넘긴다(미리보기·압축·R2 업로드를 같이 한다)
      if (typeof window.handleShareCardPhotoUpload === 'function') window.handleShareCardPhotoUpload({ target: { files: [file], value: '' } });
    }).catch(function () { toast('잠시 후 다시 눌러 주세요'); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-rsq], #btnReadyShotQuickToGear');
    if (!t) return;
    if (t.id === 'btnReadyShotQuickToGear') {
      metric('feat_readyshot_quick_to_gear');
      if (typeof window.closePackShareModal === 'function') window.closePackShareModal();
      if (typeof window.openPlanModal === 'function') window.openPlanModal('calculator');
      return;
    }
    var a = t.getAttribute('data-rsq');
    if (a === 'shut') closeChooser();
    else if (a === 'quick') { closeChooser(true); openForm(); }
    else if (a === 'gear') { closeChooser(true); if (typeof window.openPlanModal === 'function') window.openPlanModal('calculator'); }
    else if (a === 'close') closeForm();
    else if (a === 'minus') { S.kg = clampKg(S.kg - 0.1); paintKg(); }
    else if (a === 'plus') { S.kg = clampKg(S.kg + 0.1); paintKg(); }
    else if (a === 'chip') { S.kg = clampKg(t.getAttribute('data-kg')); paintKg(); }
    else if (a === 'album') { var al = document.getElementById('rsqAlbum'); if (al) al.click(); }
    else if (a === 'camera') { var cm = document.getElementById('rsqCamera'); if (cm) cm.click(); }
    else if (a === 'spot') {
      S.spot = S.picked = t.getAttribute('data-name') || ''; S.elev = t.getAttribute('data-elev') || '';
      var inp = document.getElementById('rsqSpot'); if (inp) inp.value = S.spot;
      paintSug('');
    }
    else if (a === 'make') make();
  });

  window.okbmOpenReadyShot = openChooser;
})();
