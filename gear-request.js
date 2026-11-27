// 목록에 없는 장비 등록 요청(대표님 11-27, 이종 님 건의). SUPABASE_I35_GEAR_REQUESTS.sql
// · window.okbmOpenGearRequest({ name, categoryId }): 낭만루터가 브랜드·이름·종류·무게·링크를 보낸다 → gear_requests '검토중'
// · window.okbmRenderGearRequestInbox(): 관리자 검수. 지도 검수함 '장비 요청' 칸에 그린다.
//   값을 고쳐 승인하면 gears에 들어가고 요청한 분에게 30점, 반려는 사유만
// 부르는 곳: 낭만플랜 장비 고르기(romantic-plan.js), 라운지 장비 후기·질문 장비 찾기(lounge.js)
// 인라인 onclick 없음(CSP).
(function () {
  'use strict';
  if (window.okbmOpenGearRequest) return;

  var CATS = [
    ['shelter', '텐트 · 타프'], ['sleep', '침낭 · 매트'], ['pack', '배낭'], ['kitchen', '취사'], ['food', '식량'],
    ['wear', '의류'], ['electronics', '전자기기'], ['camp', '캠핑 용품'], ['other', '기타']
  ];
  var ERR = {
    gear_request_daily_limit: '하루에 5개까지 보낼 수 있어요. 내일 다시 보내 주세요.',
    gear_requests_len_chk: '링크는 http로 시작하는 주소로 적어 주세요.'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, type) { if (typeof window.showToast === 'function') window.showToast(msg, type || 'success', 2200); else alert(msg); }
  function myId() { try { return typeof window.okbmGetCurrentUserId === 'function' ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { return ''; } }
  function client() { var c = window.supabaseClient; return c && typeof c.from === 'function' ? c : null; }
  function catTitle(id) {
    var c = (window.CATEGORIES || []).find(function (x) { return x && x.id === id; });
    if (c && c.title) return c.title;
    var d = CATS.find(function (x) { return x[0] === id; });
    return d ? d[1] : id;
  }
  function metric(n) { if (typeof window.okbmMetric === 'function') window.okbmMetric(n); }

  var CSS = [
    '.grq-dim{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}',
    '.grq{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:#121215;border-radius:18px 18px 0 0;border-top:1px solid rgba(255,255,255,.12);color:#f4f4f5;padding:18px 16px calc(16px + env(safe-area-inset-bottom,0px));box-sizing:border-box;font-family:inherit;word-break:keep-all;overscroll-behavior:contain}',
    '.grq-h{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
    '.grq-h b{flex:1;font-size:17px;font-weight:900}',
    '.grq-x{width:36px;height:36px;border:0;background:none;color:#a1a1aa;cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.grq-x svg{width:18px;height:18px}',
    '.grq-note{margin:0 0 14px;padding:10px 12px;border-radius:10px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.28);font-size:12.5px;line-height:1.55;color:#e4e4e7}',
    '.grq-f{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}',
    '.grq-f label{font-size:12.5px;font-weight:800;color:#d4d4d8}',
    '.grq-f label small{font-weight:600;color:#71717a;margin-left:4px}',
    '.grq-f input,.grq-f select,.grq-f textarea{width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#1a1a1f;color:#f4f4f5;font-family:inherit;font-size:16px;padding:10px 12px;outline:none}',
    '.grq-f input:focus,.grq-f select:focus,.grq-f textarea:focus{border-color:rgba(255,255,255,.45)}',
    '.grq-f textarea{min-height:64px;resize:vertical;line-height:1.5}',
    '.grq-2{display:flex;gap:8px}',
    '.grq-2>.grq-f{flex:1;min-width:0}',
    '.grq-go{width:100%;height:48px;border:0;border-radius:12px;background:#2b6fd6;color:#fff;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer}',
    '.grq-go:disabled{opacity:.5}',
    '.grq-card{padding:12px;border-radius:12px;background:#1a1a1f;border:1px solid rgba(255,255,255,.1);margin-bottom:10px}',
    '.grq-meta{font-size:12px;color:#a1a1aa;margin-bottom:8px;line-height:1.5}',
    '.grq-meta a{color:#7cb3ff;word-break:break-all}',
    '.grq-btns{display:flex;gap:6px}',
    '.grq-btns button{flex:1;height:40px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:#222228;color:#f4f4f5;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer}',
    '.grq-btns .ok{background:#2b6fd6;border-color:#2b6fd6}',
    '.grq-sec{font-size:12px;font-weight:800;color:#a7f3d0;margin:0 0 8px}',
    '.grq-done summary{font-size:12px;font-weight:800;color:#94a3b8;cursor:pointer;margin:14px 0 8px}',
    '.grq-empty{padding:30px 0;text-align:center;color:#71717a;font-size:13px}',
    '.okbm-grq-link{display:block;width:100%;margin-top:6px;padding:9px 0;border:0;background:none;color:#fbbf24;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;text-align:center}'
  ].join('\n');
  function ensureCss() {
    if (document.getElementById('okbmGearReqCss')) return;
    var st = document.createElement('style'); st.id = 'okbmGearReqCss'; st.textContent = CSS; document.head.appendChild(st);
  }
  var X_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function sheet(title, inner) {
    ensureCss();
    var old = document.getElementById('okbmGearReq'); if (old) old.remove();
    var dim = document.createElement('div');
    dim.id = 'okbmGearReq';
    dim.className = 'grq-dim';
    dim.innerHTML = '<div class="grq" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grq-h"><b>' + esc(title) + '</b><button type="button" class="grq-x" aria-label="닫기">' + X_SVG + '</button></div>' + inner + '</div>';
    document.body.appendChild(dim);
    dim.addEventListener('click', function (e) { if (e.target === dim || e.target.closest('.grq-x')) dim.remove(); });
    return dim;
  }
  function catOptions(sel) {
    return CATS.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === sel ? ' selected' : '') + '>' + esc(catTitle(c[0])) + '</option>'; }).join('');
  }

  // ---------------------------------------------------------------- 요청 보내기
  window.okbmOpenGearRequest = function (opts) {
    opts = opts || {};
    metric('feat_gear_request_open');
    if (!myId()) {
      toast('장비 등록 요청은 로그인 후 보낼 수 있어요.', 'info');
      if (typeof window.openLoginModal === 'function') window.openLoginModal();
      return;
    }
    var cat = CATS.some(function (c) { return c[0] === opts.categoryId; }) ? opts.categoryId : 'shelter';
    var dim = sheet('장비 등록 요청',
      '<p class="grq-note">목록에 없는 장비를 알려 주세요. 확인한 뒤 모두의 장비 목록에 올려요. 등록되면 낭만 포인트 30점을 드려요.</p>' +
      '<div class="grq-f"><label for="grqCat">종류</label><select id="grqCat">' + catOptions(cat) + '</select></div>' +
      '<div class="grq-f"><label for="grqBrand">브랜드</label><input id="grqBrand" maxlength="60" placeholder="예: 니모" autocomplete="off"></div>' +
      '<div class="grq-f"><label for="grqName">장비 이름</label><input id="grqName" maxlength="120" placeholder="예: 호넷 오스모 1P" autocomplete="off" value="' + esc(opts.name || '') + '"></div>' +
      '<div class="grq-f"><label for="grqW">무게<small>g, 제조사 표기</small></label><input id="grqW" type="number" inputmode="numeric" min="1" max="50000" placeholder="예: 879"></div>' +
      '<div class="grq-f"><label for="grqLink">제조사·판매처 링크<small>무게를 확인할 수 있는 곳</small></label><input id="grqLink" type="url" inputmode="url" maxlength="500" placeholder="https://"></div>' +
      '<div class="grq-f"><label for="grqNote">하고 싶은 말<small>선택</small></label><textarea id="grqNote" maxlength="500" placeholder="예: 2025년형이에요. 색상마다 무게가 같아요."></textarea></div>' +
      '<button type="button" class="grq-go">요청 보내기</button>');
    var $ = function (id) { return dim.querySelector('#' + id); };
    if (!opts.name) setTimeout(function () { var b = $('grqBrand'); if (b) b.focus(); }, 50);
    dim.querySelector('.grq-go').addEventListener('click', function () {
      var btn = this;
      var brand = $('grqBrand').value.trim(), name = $('grqName').value.trim();
      var w = parseInt($('grqW').value, 10), link = $('grqLink').value.trim(), note = $('grqNote').value.trim();
      if (!brand) { toast('브랜드를 적어 주세요.', 'info'); $('grqBrand').focus(); return; }
      if (!name) { toast('장비 이름을 적어 주세요.', 'info'); $('grqName').focus(); return; }
      if (!(w > 0)) { toast('무게를 g로 적어 주세요.', 'info'); $('grqW').focus(); return; }
      if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
      var c = client();
      if (!c) { toast('잠시 뒤 다시 보내 주세요.', 'error'); return; }
      btn.disabled = true;
      Promise.resolve(c.from('gear_requests').insert({
        user_id: myId(), category_id: $('grqCat').value, brand: brand, item_name: name,
        weight_g: w, link: link || null, note: note || null
      })).then(function (res) {
        if (res && res.error) throw res.error;
        metric('feat_gear_request_send');
        dim.remove();
        toast('장비 등록 요청을 보냈어요. 확인한 뒤 목록에 올릴게요.');
      }).catch(function (e) {
        btn.disabled = false;
        var m = String((e && e.message) || '');
        var key = Object.keys(ERR).find(function (k) { return m.indexOf(k) !== -1; });
        toast(key ? ERR[key] : '보내지 못했어요. 잠시 뒤 다시 보내 주세요.', 'error');
        console.warn('[gear-request]', e);
      });
    });
  };

  // ---------------------------------------------------------------- 관리자 검수
  // 지도 검수함(map-main.js)의 '장비 요청' 칸이 부른다. 대기 줄을 받아 오고, 칸 안에 그린다
  window.okbmFetchGearRequests = function () {
    var c = client();
    if (!c) return Promise.resolve([]);
    return Promise.resolve(c.from('gear_requests').select('*').order('created_at', { ascending: true }).limit(200)).then(function (res) {
      if (res && res.error) throw res.error;
      return (res && res.data) || [];
    });
  };
  window.okbmRenderGearRequestInbox = function (box, rows, onChange) {
    ensureCss();
    var c = client();
    rows = Array.isArray(rows) ? rows : [];
    var pending = rows.filter(function (r) { return r.status === '검토중'; });
    var done = rows.filter(function (r) { return r.status !== '검토중'; }).reverse();
    var meta = function (r) {
      return '<div class="grq-meta">' + esc(r.nickname || '낭만루터') + ' · ' + esc(String(r.created_at || '').slice(5, 16).replace('T', ' ')) +
        (r.link ? '<br><a href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">' + esc(r.link) + '</a>' : '<br>링크 없음') +
        (r.note ? '<br>' + esc(r.note) : '') +
        (r.reject_reason ? '<br>반려 사유: ' + esc(r.reject_reason) : '') + '</div>';
    };
    var card = function (r) {
      return '<div class="grq-card" data-id="' + esc(r.id) + '">' + meta(r) +
        '<div class="grq-f"><label>종류</label><select data-k="cat">' + catOptions(r.category_id) + '</select></div>' +
        '<div class="grq-2"><div class="grq-f"><label>브랜드</label><input data-k="brand" value="' + esc(r.brand) + '"></div>' +
        '<div class="grq-f"><label>무게(g)</label><input data-k="w" type="number" inputmode="numeric" value="' + esc(r.weight_g || '') + '"></div></div>' +
        '<div class="grq-f"><label>장비 이름</label><input data-k="name" value="' + esc(r.item_name) + '"></div>' +
        '<div class="grq-btns"><button type="button" data-act="no">반려</button><button type="button" class="ok" data-act="ok">승인 · 목록에 올리기</button></div>' +
      '</div>';
    };
    var doneCard = function (r) {
      return '<div class="grq-card"><div class="grq-meta"><b style="color:' + (r.status === '승인' ? '#6ee7b7' : '#fda4af') + '">' + esc(r.status) + '</b> · ' +
        esc(catTitle(r.category_id)) + '</div><b>' + esc(r.brand) + ' ' + esc(r.item_name) + '</b>' + (r.weight_g ? ' · ' + esc(r.weight_g) + 'g' : '') + meta(r) + '</div>';
    };
    box.innerHTML = '<div class="grq-sec">장비 요청 대기 ' + pending.length + '건 · 오래된 것부터</div>' +
      (pending.length ? pending.map(card).join('') : '<div class="grq-empty">검토할 장비 요청이 없어요.</div>') +
      (done.length ? '<details class="grq-done"><summary>처리됨 ' + done.length + '건</summary>' + done.map(doneCard).join('') + '</details>' : '');
    box.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || !c) return;
      var cardEl = b.closest('.grq-card');
      var v = function (k) { var el = cardEl.querySelector('[data-k="' + k + '"]'); return el ? el.value.trim() : ''; };
      var ok = b.getAttribute('data-act') === 'ok';
      var reason = null;
      if (!ok) {
        reason = window.prompt('반려 사유를 적어 주세요. (선택, 300자 이내)', '');
        if (reason === null) return;
      }
      b.disabled = true;
      Promise.resolve(c.rpc('okbm_gear_request_review', {
        p_id: Number(cardEl.getAttribute('data-id')), p_approve: ok,
        p_brand: ok ? v('brand') : null, p_name: ok ? v('name') : null, p_category: ok ? v('cat') : null,
        p_weight: ok ? (parseInt(v('w'), 10) || null) : null, p_link: null, p_reason: reason
      })).then(function (res) {
        if (res && res.error) throw res.error;
        toast(ok ? '목록에 올렸어요. 요청한 분에게 30점이 들어갔어요.' : '반려했어요.');
        if (typeof onChange === 'function') onChange();
      }).catch(function (err) { b.disabled = false; toast('처리하지 못했어요: ' + ((err && err.message) || ''), 'error'); });
    };
  };

  ensureCss();
})();
