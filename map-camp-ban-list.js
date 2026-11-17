// 야영 금지 목록(대표님 11-17). 지도 오른쪽 위(필터 밑) 손잡이를 누르면 오른쪽에서 창이 나온다.
// 목록은 열 때마다 spots에서 camp_status='banned'인 곳을 새로 받는다. 박지를 야영금지로 바꾸면 따로 손대지 않아도 들어간다.
// 지도 이동·정보창 열기는 map-main.js의 window.okbmCampBanFocus를 쓴다.
// 인라인 onclick은 CSP(unsafe-hashes)에 걸리므로 쓰지 않고 이벤트를 붙인다.
(function () {
  'use strict';
  if (window.__okbmCampBanList) return;
  window.__okbmCampBanList = true;

  var SUPA_URL = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
  var SUPA_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_PKEidTwAKB7cuXReKSEnKw_VgNvSojA';
  var COLS = 'id,region,cityName,spot_main,spot_sub,camp_status_note,camp_status_at,camp_status_credit,camp_status_photos';
  var NEW_DAYS = 7;
  var GROUPS = [
    ['전체', null],
    ['수도권', ['서울', '경기', '인천', '서울/인천']],
    ['강원', ['강원']],
    ['충청', ['충남', '충북', '대전', '세종']],
    ['전라', ['전북', '전남', '광주']],
    ['경상', ['경북', '경남', '대구', '부산', '울산']],
    ['제주', ['제주']]
  ];
  var BAN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>';

  var state = { rows: [], grp: '전체', exp: null, loaded: false, loading: null };
  var els = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeImg(u) {
    if (typeof window.okbmSafeImageUrl === 'function') return window.okbmSafeImageUrl(u) || '';
    return /^https:\/\//.test(String(u || '')) ? String(u) : '';
  }
  function photosOf(r) {
    return (Array.isArray(r.camp_status_photos) ? r.camp_status_photos : []).map(safeImg).filter(Boolean).slice(0, 3);
  }
  function monthDay(at) {
    var m = String(at || '').match(/^\d{4}-(\d{2})-(\d{2})/);
    return m ? (+m[1]) + '월 ' + (+m[2]) + '일' : '';
  }
  function monthKey(at) {
    var m = String(at || '').match(/^(\d{4})-(\d{2})/);
    return m ? m[1] + '-' + m[2] : '';
  }
  function todayKst() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  function isNew(at) {
    if (!at) return false;
    var d = new Date(String(at).slice(0, 10) + 'T00:00:00+09:00').getTime();
    var t = new Date(todayKst() + 'T00:00:00+09:00').getTime();
    return t - d <= NEW_DAYS * 86400000;
  }
  function regionLabel(r) { return r === '서울/인천' ? '인천' : r; }
  function groupOf(region) {
    for (var i = 1; i < GROUPS.length; i++) if (GROUPS[i][1].indexOf(region) >= 0) return GROUPS[i][0];
    return '';
  }

  function css() {
    if (document.getElementById('okbmBanCss')) return;
    var st = document.createElement('style');
    st.id = 'okbmBanCss';
    st.textContent = [
      '.okbm-ban-handle{position:fixed;right:0;top:calc(var(--okbm-status-top,0px) + 62px);z-index:var(--z-hud,100);width:34px;padding:10px 0 9px;border-radius:12px 0 0 12px;background:rgba(15,15,17,.94);border:1px solid rgba(255,255,255,.14);border-right:none;display:flex;flex-direction:column;align-items:center;gap:6px;box-shadow:-4px 4px 14px rgba(0,0,0,.4);color:#f4f4f5;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}',
      '.okbm-ban-handle[hidden]{display:none}',
      '.okbm-ban-handle svg{width:16px;height:16px;color:#fb7185}',
      '.okbm-ban-handle .vt{writing-mode:vertical-rl;font-size:12px;font-weight:800;letter-spacing:.08em}',
      '.okbm-ban-handle .cnt{font-size:11px;font-weight:900;color:#fb7185;font-variant-numeric:tabular-nums}',
      // 지도를 열고 3초 뒤 얇은 탭으로 접힌다(대표님 11-17: 항상 떠 있으면 보기 안 좋다). 누르는 범위는 왼쪽으로 넓혀 둔다.
      '.okbm-ban-handle{transition:width .3s ease,padding .3s ease,gap .3s ease}',
      '.okbm-ban-handle .vt,.okbm-ban-handle .cnt{transition:opacity .2s ease;overflow:hidden}',
      '.okbm-ban-handle.fold{width:14px;padding:12px 0;gap:0;border-radius:8px 0 0 8px}',
      '.okbm-ban-handle.fold svg{width:10px;height:10px}',
      '.okbm-ban-handle.fold .vt,.okbm-ban-handle.fold .cnt{opacity:0;width:0;height:0}',
      '.okbm-ban-handle.fold::before{content:"";position:absolute;top:-8px;bottom:-8px;left:-26px;right:0}',
      '@media (prefers-reduced-motion:reduce){.okbm-ban-handle{transition:none}}',
      '.okbm-ban-dim{position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.5);opacity:0;pointer-events:none;transition:opacity .28s}',
      '.okbm-ban-panel{position:fixed;right:0;top:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));width:min(340px,88vw);z-index:1501;background:#0f0f11;border-left:1px solid rgba(255,255,255,.14);transform:translateX(102%);transition:transform .32s cubic-bezier(.32,.72,0,1);display:flex;flex-direction:column;box-shadow:-12px 0 30px rgba(0,0,0,.5);color:#f4f4f5;padding-top:var(--okbm-status-top,0px);box-sizing:border-box;word-break:keep-all;visibility:hidden}',
      '.okbm-ban-open .okbm-ban-dim{opacity:1;pointer-events:auto}',
      '.okbm-ban-open .okbm-ban-panel{transform:none;visibility:visible}',
      '.okbm-ban-drag .okbm-ban-panel{transition:none}',
      '.okbm-ban-ph{padding:14px 16px 10px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.okbm-ban-row1{display:flex;align-items:center;gap:8px}',
      '.okbm-ban-ph h2{margin:0;font-size:17px;font-weight:900;flex:1;display:flex;align-items:center;gap:7px}',
      '.okbm-ban-n{font-size:13px;font-weight:900;color:#fb7185;background:rgba(244,63,94,.16);border:1px solid rgba(244,63,94,.45);border-radius:10px;padding:1px 8px}',
      '.okbm-ban-x{width:32px;height:32px;border:none;background:none;color:#a1a1aa;border-radius:8px;display:grid;place-items:center;cursor:pointer}',
      '.okbm-ban-x svg{width:18px;height:18px}',
      '.okbm-ban-copy{margin:0;font-size:12px;color:#a1a1aa;line-height:1.55}',
      '.okbm-ban-chips{display:flex;gap:6px;overflow-x:auto;padding:4px 0 2px;scrollbar-width:none}',
      '.okbm-ban-chips::-webkit-scrollbar{display:none}',
      '.okbm-ban-chip{flex:0 0 auto;font-size:12px;font-weight:700;padding:5px 11px;border-radius:14px;background:#17171b;color:#a1a1aa;border:1px solid rgba(255,255,255,.08);cursor:pointer;font-family:inherit}',
      '.okbm-ban-chip small{font-size:11px;color:#71717a;margin-left:3px;font-weight:500}',
      '.okbm-ban-chip.on{background:#f4f4f5;color:#111;border-color:#f4f4f5}',
      '.okbm-ban-chip.on small{color:#52525b}',
      '.okbm-ban-list{flex:1;overflow-y:auto;padding:0 0 16px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
      '.okbm-ban-mh{position:sticky;top:0;z-index:1;background:rgba(15,15,17,.96);font-size:11.5px;font-weight:700;color:#71717a;padding:12px 16px 6px;letter-spacing:.04em}',
      '.okbm-ban-cards{padding:4px 12px 0;display:flex;flex-direction:column;gap:8px}',
      '.okbm-ban-card{display:flex;gap:11px;padding:10px;border-radius:12px;background:#17171b;border:1px solid rgba(255,255,255,.08);width:100%;text-align:left;color:inherit;font-family:inherit;cursor:pointer;box-sizing:border-box}',
      '.okbm-ban-thumb{flex:0 0 72px;width:72px;height:72px;border-radius:9px;overflow:hidden;background:#222228;position:relative;display:flex;align-items:center;justify-content:center}',
      '.okbm-ban-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;display:block}',
      '.okbm-ban-thumb .pc{z-index:1;position:absolute;right:4px;bottom:4px;font-size:10px;font-weight:700;background:rgba(0,0,0,.65);color:#fff;padding:1px 5px;border-radius:5px}',
      '.okbm-ban-nophoto{font-size:10px;color:#71717a;display:flex;flex-direction:column;align-items:center;gap:4px}',
      '.okbm-ban-nophoto svg{width:14px;height:14px;color:#fb7185}',
      '.okbm-ban-rb{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.okbm-ban-t{font-size:14px;font-weight:800;line-height:1.35}',
      '.okbm-ban-new{display:inline-block;font-size:10px;font-weight:900;color:#fb7185;border:1px solid rgba(244,63,94,.45);border-radius:4px;padding:0 4px;margin-left:5px;vertical-align:1px}',
      '.okbm-ban-sub{font-size:11.5px;color:#a1a1aa}',
      '.okbm-ban-meta{font-size:11.5px;color:#71717a;margin-top:auto;font-variant-numeric:tabular-nums}',
      '.okbm-ban-why{font-size:12px;color:#a1a1aa;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}',
      '.okbm-ban-card.exp .okbm-ban-why{display:none}',
      '.okbm-ban-det{display:none;padding:2px 4px 8px;flex-direction:column;gap:10px}',
      '.okbm-ban-det.on{display:flex}',
      '.okbm-ban-det p{margin:0;font-size:12.5px;line-height:1.6;color:#f4f4f5}',
      '.okbm-ban-imgs{display:grid;gap:6px}',
      '.okbm-ban-imgs button{padding:0;border:1px solid rgba(244,63,94,.35);border-radius:8px;overflow:hidden;background:#1f1115;cursor:zoom-in;aspect-ratio:4/3}',
      '.okbm-ban-imgs img{width:100%;height:100%;object-fit:cover;display:block}',
      '.okbm-ban-who{font-size:11.5px;color:#71717a}',
      '.okbm-ban-btns{display:flex;gap:6px}',
      '.okbm-ban-btns button{flex:1;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#222228;color:#f4f4f5;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer}',
      '.okbm-ban-btns button.pri{background:#2b6fd6;border-color:#2b6fd6;color:#fff}',
      '.okbm-ban-empty{padding:40px 16px;text-align:center;color:#71717a;font-size:12.5px;line-height:1.6}',
      '@media (prefers-reduced-motion:reduce){.okbm-ban-panel,.okbm-ban-dim{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function build() {
    css();
    var h = document.createElement('button');
    h.type = 'button';
    h.className = 'okbm-ban-handle';
    h.setAttribute('aria-label', '야영 금지된 곳 목록 열기');
    h.setAttribute('data-metric-click', 'feat_camp_ban_list');
    h.innerHTML = BAN_SVG + '<span class="vt">야영금지</span><span class="cnt" data-ban-count></span>';
    h.hidden = true;
    h.addEventListener('click', open);
    document.body.appendChild(h);
    els.handle = h;

    var wrap = document.createElement('div');
    wrap.className = 'okbm-ban-root';
    wrap.innerHTML =
      '<div class="okbm-ban-dim"></div>' +
      '<aside class="okbm-ban-panel" role="dialog" aria-modal="true" aria-label="야영 금지된 곳">' +
        '<div class="okbm-ban-ph">' +
          '<div class="okbm-ban-row1"><h2>야영 금지된 곳 <span class="okbm-ban-n"><span data-ban-count></span>곳</span></h2>' +
          '<button type="button" class="okbm-ban-x" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
          '<p class="okbm-ban-copy">우리가 조금 더 LNT를 신경 써야 하는 이유예요.<br>아니 온 듯 다녀가요.<br>우리가 아끼는 박지가 다음엔 갈 수 없는 곳이 될지 몰라요.</p>' +
          '<div class="okbm-ban-chips"></div>' +
        '</div>' +
        '<div class="okbm-ban-list"></div>' +
      '</aside>';
    document.body.appendChild(wrap);
    els.root = wrap;
    els.panel = wrap.querySelector('.okbm-ban-panel');
    els.chips = wrap.querySelector('.okbm-ban-chips');
    els.list = wrap.querySelector('.okbm-ban-list');
    wrap.querySelector('.okbm-ban-dim').addEventListener('click', close);
    wrap.querySelector('.okbm-ban-x').addEventListener('click', close);
    els.chips.addEventListener('click', onChip);
    els.list.addEventListener('click', onList);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) close(); });
    swipeToClose();
  }

  function isOpen() { return els.root && els.root.classList.contains('okbm-ban-open'); }

  function load() {
    if (state.loading) return state.loading;
    var url = SUPA_URL + '/rest/v1/spots?select=' + COLS + '&camp_status=eq.banned&order=camp_status_at.desc.nullslast,id.desc';
    state.loading = fetch(url, { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (rows) {
        state.rows = Array.isArray(rows) ? rows : [];
        state.loaded = true;
        updateCount();
        if (isOpen()) render();
      })
      .catch(function (e) { console.warn('[camp-ban-list]', e); if (isOpen() && !state.loaded) renderError(); })
      .then(function () { state.loading = null; });
    return state.loading;
  }

  function updateCount() {
    var n = state.rows.length;
    document.querySelectorAll('[data-ban-count]').forEach(function (el) { el.textContent = n; });
    if (!els.handle) return;
    var wasHidden = els.handle.hidden;
    els.handle.hidden = n === 0;
    if (wasHidden && n > 0) {
      els.handle.classList.remove('fold');
      clearTimeout(state.foldTimer);
      state.foldTimer = setTimeout(function () { els.handle.classList.add('fold'); }, 3000);
    }
  }

  function filtered() {
    if (state.grp === '전체') return state.rows;
    return state.rows.filter(function (r) { return groupOf(r.region) === state.grp; });
  }

  function renderChips() {
    els.chips.innerHTML = GROUPS.map(function (g) {
      var n = g[1] ? state.rows.filter(function (r) { return groupOf(r.region) === g[0]; }).length : state.rows.length;
      if (!n) return '';
      return '<button type="button" class="okbm-ban-chip' + (state.grp === g[0] ? ' on' : '') + '" data-g="' + esc(g[0]) + '" aria-pressed="' + (state.grp === g[0]) + '">' + esc(g[0]) + '<small>' + n + '</small></button>';
    }).join('');
  }

  function cardHtml(r) {
    var id = esc(String(r.id).trim());
    var exp = state.exp === String(r.id).trim();
    var ph = photosOf(r);
    var thumb = ph.length
      ? '<img src="' + esc(ph[0]) + '" alt="" loading="lazy">' + (ph.length > 1 ? '<span class="pc">+' + (ph.length - 1) + '</span>' : '')
      : '<span class="okbm-ban-nophoto">' + BAN_SVG + '<span>사진 없음</span></span>';
    var note = String(r.camp_status_note || '').trim();
    var meta = esc(regionLabel(r.region || '')) + ' ' + esc(r.cityName || '') + (r.camp_status_at ? ' · ' + monthDay(r.camp_status_at) : '');
    var credit = String(r.camp_status_credit || '').trim();
    var det =
      '<div class="okbm-ban-det' + (exp ? ' on' : '') + '">' +
        '<p>' + esc(note || '현장에 야영 금지 안내가 있다는 제보를 받았어요.') + '</p>' +
        (ph.length ? '<div class="okbm-ban-imgs" style="grid-template-columns:repeat(' + ph.length + ',1fr)">' + ph.map(function (u, i) {
          return '<button type="button" data-photo="' + id + '" data-idx="' + i + '" aria-label="금지 근거 사진 ' + (i + 1) + ' 크게 보기"><img src="' + esc(u) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' : '') +
        '<div class="okbm-ban-who">' + (credit ? '제보 ' + esc(credit) + '님 · ' : '') + (r.camp_status_at ? monthDay(r.camp_status_at) + ' 반영' : '') + '</div>' +
        '<div class="okbm-ban-btns"><button type="button" class="pri" data-go="' + id + '">지도에서 보기</button><button type="button" data-info="' + id + '">정보창 열기</button></div>' +
      '</div>';
    return '<div><button type="button" class="okbm-ban-card' + (exp ? ' exp' : '') + '" data-id="' + id + '" aria-expanded="' + exp + '">' +
      '<span class="okbm-ban-thumb">' + thumb + '</span>' +
      '<span class="okbm-ban-rb">' +
        '<span class="okbm-ban-t">' + esc(r.spot_main || '') + (isNew(r.camp_status_at) ? '<span class="okbm-ban-new">새로</span>' : '') + '</span>' +
        (r.spot_sub ? '<span class="okbm-ban-sub">' + esc(r.spot_sub) + '</span>' : '') +
        (note ? '<span class="okbm-ban-why">' + esc(note) + '</span>' : '') +
        '<span class="okbm-ban-meta">' + meta + '</span>' +
      '</span></button>' + det + '</div>';
  }

  function render() {
    renderChips();
    var rows = filtered();
    if (!rows.length) { els.list.innerHTML = '<div class="okbm-ban-empty">이 지역에는 야영 금지된 곳이 없어요.</div>'; return; }
    var groups = [], byKey = {};
    rows.forEach(function (r) {
      var k = monthKey(r.camp_status_at) || '기타';
      if (!byKey[k]) { byKey[k] = []; groups.push(k); }
      byKey[k].push(r);
    });
    els.list.innerHTML = groups.map(function (k) {
      var label = k === '기타' ? '날짜 없음' : (+k.slice(5)) + '월';
      return '<div class="okbm-ban-mh">' + label + ' · ' + byKey[k].length + '곳</div><div class="okbm-ban-cards">' + byKey[k].map(cardHtml).join('') + '</div>';
    }).join('');
  }
  function renderError() {
    els.list.innerHTML = '<div class="okbm-ban-empty">목록을 불러오지 못했어요.<br>잠시 뒤 다시 열어 주세요.</div>';
  }

  function open() {
    if (!els.root) return;
    state.exp = null;
    if (state.loaded) render(); else els.list.innerHTML = '<div class="okbm-ban-empty">불러오는 중이에요.</div>';
    els.root.classList.add('okbm-ban-open');
    els.list.scrollTop = 0;
    load();
  }
  function close() { if (els.root) els.root.classList.remove('okbm-ban-open'); }

  function onChip(e) {
    var c = e.target.closest('.okbm-ban-chip');
    if (!c) return;
    state.grp = c.getAttribute('data-g');
    state.exp = null;
    render();
    els.list.scrollTop = 0;
  }

  function onList(e) {
    var t = e.target;
    var photo = t.closest('[data-photo]');
    if (photo) {
      var pr = state.rows.find(function (r) { return String(r.id).trim() === photo.getAttribute('data-photo'); });
      if (pr && typeof window.okbmOpenPhotoViewer === 'function') {
        var cr = String(pr.camp_status_credit || '').trim();
        window.okbmOpenPhotoViewer(photosOf(pr), Number(photo.getAttribute('data-idx')) || 0, '야영금지 근거' + (cr ? ' · 사진 제보 ' + cr + '님' : ''));
      }
      return;
    }
    var go = t.closest('[data-go]'), info = t.closest('[data-info]');
    if (go || info) {
      var id = (go || info).getAttribute(go ? 'data-go' : 'data-info');
      var row = state.rows.find(function (r) { return String(r.id).trim() === id; });
      close();
      var ok = typeof window.okbmCampBanFocus === 'function' && window.okbmCampBanFocus(id, go ? 'pan' : 'open');
      if (go && typeof window.showToast === 'function') {
        window.showToast(ok ? (row ? row.spot_main : '') + ' 자리로 옮겼어요' : '지도에서 이 박지를 찾지 못했어요');
      }
      return;
    }
    var card = t.closest('.okbm-ban-card');
    if (!card) return;
    var cid = card.getAttribute('data-id');
    state.exp = state.exp === cid ? null : cid;
    var top = els.list.scrollTop;
    render();
    els.list.scrollTop = top;
  }

  // 오른쪽으로 밀어서 닫기
  function swipeToClose() {
    var x0 = null, y0 = 0, dx = 0, horiz = null;
    els.panel.addEventListener('touchstart', function (e) {
      if (e.target.closest('.okbm-ban-chips')) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horiz = null;
    }, { passive: true });
    els.panel.addEventListener('touchmove', function (e) {
      if (x0 === null) return;
      var mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my) && mx > 0;
      if (!horiz) return;
      dx = Math.max(0, mx);
      els.root.classList.add('okbm-ban-drag');
      els.panel.style.transform = 'translateX(' + dx + 'px)';
    }, { passive: true });
    els.panel.addEventListener('touchend', function () {
      if (x0 === null) return;
      els.root.classList.remove('okbm-ban-drag');
      els.panel.style.transform = '';
      if (horiz && dx > 80) close();
      x0 = null;
    });
  }

  function start() {
    if (!document.getElementById('map')) return;
    build();
    load();
  }
  window.okbmOpenCampBanList = open;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
