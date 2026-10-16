// =========================================================================
// 박지 후기 칸 합치기 (2026-10-14, 시안 "3. 박지 상세", DB: SUPABASE_G3_SPOT_TIPS.sql + 기존 comments 별점 후기)
// 기존 정보창(map-main.js)은 그대로 두고, 찜하기·다녀왔음·공유 줄 아래에 "박지 후기" 칸 하나를 붙인다.
// · 칸: ★ 평균 · 후기 N · N명 다녀옴 / 많이 고른 팁 / 최근 글(별점 후기 + 팁 한 줄) / 내 후기 / 남기기 버튼
// · 원래 있던 별점 후기 칸([data-okbm-review-box], romantic-sync.js)은 숨긴다(데이터·기능은 그대로).
// · 남기는 창 하나: 별점(선택) + 팁 칩 + 한 줄(선택).
//   별점이 있으면 기존 별점 후기(comments)에 글과 함께 저장하고, 칩은 팁(okbm_spot_tips)으로 저장한다.
//   별점이 없으면 칩·한 줄 모두 팁으로만 저장한다. 피드 글은 만들지 않는다.
// · 로그인한 사람이 "다녀왔음"을 켜면 이 창이 자동으로 올라온다.
// · 인라인 핸들러 없음(이벤트 위임) → csp-extract 대상 아님. 정보창 태그와 겹치는 팁(바닥·어프로치)은 두지 않는다.
// =========================================================================
(function () {
  'use strict';
  if (window.__okbmSpotTipsLoaded) return;
  window.__okbmSpotTipsLoaded = true;

  // 백패킹 박지 기준 팁. one=true 묶음은 하나만 고른다 (DB okbm_spot_tip_allowed와 같아야 한다)
  var GROUPS = [
    { key: 'view', label: '풍경', tips: ['일출 명소', '일몰 명소', '운해', '야경', '별이 잘 보임', '360도 파노라마 뷰', '바다 뷰', '호수 뷰'] },
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
  var myId = function () { try { return String((window.okbmGetCurrentUserId && window.okbmGetCurrentUserId()) || '').trim(); } catch (e) { return ''; } };
  var isAdmin = function () { return window.__okbmIsAdmin === true; };
  var isMine = function (uid) { return !!uid && typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(uid); };
  var hiddenUgc = function (id, uid) { return typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc({ id: String(id), user_id: uid }); };
  var stars = function (n) { n = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>'; };
  var spotOf = function (id) {
    var list = (Array.isArray(window.spots) && window.spots.length) ? window.spots
      : (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) ? registeredSpots : []);
    return list.find(function (s) { return String(s.id) === String(id); }) || null;
  };
  var shortName = function (s) { return String((s && (s.spot_main || s.name || s.fullName)) || '이 박지').replace(/\s*\(.*?\)/g, '').trim(); };
  var md = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : (d.getMonth() + 1) + '.' + d.getDate(); };

  // ---------- 서버 ----------
  var store = {}; // id → { at, tips, rev, error }
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
    if (!force && hit && hit.tips && Date.now() - hit.at < TTL) return Promise.resolve(hit);
    if (inflight[id]) return inflight[id];
    inflight[id] = Promise.all([
      rpc('okbm_spot_tips_summary', { p_spot_id: id }).catch(function (e) { console.warn('[spot-tips:tips]', e); return null; }),
      rpc('get_spot_reviews', { p_spot_id: id, p_limit: 5 }).catch(function (e) { console.warn('[spot-tips:rev]', e); return null; })
    ]).then(function (r) {
      store[id] = { at: Date.now(), tips: r[0] || (hit && hit.tips) || null, rev: r[1] || (hit && hit.rev) || null, error: !r[0] && !r[1] };
      delete inflight[id];
      repaint(id);
      return store[id];
    });
    return inflight[id];
  }

  function injectCss() {
    if (document.getElementById('okbmSpotTipsCss')) return;
    var css = document.createElement('style');
    css.id = 'okbmSpotTipsCss';
    css.textContent = [
      // 원래 별점 후기 칸은 합친 칸으로 대신한다 (지도 정보창 안에서만)
      '#mobileSheetContent [data-okbm-review-box],#pcSlidingDrawer [data-okbm-review-box]{display:none !important}',
      '.stp-box{background:var(--bg-card,#0e121a);border:1px solid var(--border-hairline,rgba(255,255,255,0.08));border-radius:7px;padding:9px 10px;margin:6px 0 2px}',
      '.stp-h{display:flex;align-items:baseline;justify-content:space-between;gap:6px}',
      '.stp-h b{font-size:0.78rem;color:#e2e8f0;font-weight:800;flex:none}.stp-h b em{font-style:normal;color:#fcd34d}',
      '.stp-meta{font-size:0.66rem;color:#94a3b8;font-weight:700;text-align:right;min-width:0}.stp-meta strong{color:#fcd34d}.stp-meta u{text-decoration:none;color:#6ee7b7}',
      '.stp-line{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}',
      '.stp-line span{font-size:0.64rem;font-weight:800;color:#cbd5e1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:3px 8px}',
      '.stp-empty{font-size:0.68rem;color:#94a3b8;margin-top:6px;line-height:1.45}',
      '.stp-item{padding:7px 0 1px;border-top:1px solid rgba(255,255,255,0.06);margin-top:7px}',
      '.stp-who{display:flex;align-items:center;gap:6px;font-size:0.66rem;color:#64748b;min-width:0}',
      '.stp-who b{color:#e2e8f0;font-weight:800;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.stp-who .st{color:#fcd34d;letter-spacing:1px}.stp-who .st i{font-style:normal;color:#334155}',
      '.stp-who button{margin-left:auto;background:none;border:0;color:#64748b;font-size:0.60rem;font-weight:800;cursor:pointer;padding:0 0 0 8px;font-family:inherit}',
      '.stp-who button.red{color:#ff6b6b}',
      '.stp-txt{font-size:0.73rem;color:#cbd5e1;line-height:1.45;margin-top:3px;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.stp-mine{display:flex;align-items:center;gap:6px;font-size:0.66rem;color:#94a3b8;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.06)}',
      '.stp-mine span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.stp-btns{display:flex;gap:6px;margin-top:9px}',
      '.stp-btns button{flex:1;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.05);color:#e2e8f0;font-size:0.70rem;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap}',
      '.stp-btns button.p{border-color:#5bb8f0;background:#5bb8f0;color:#001521}',
      '.stp-all{width:100%;margin-top:6px;background:none;border:0;color:#94a3b8;font-size:0.68rem;font-weight:800;cursor:pointer;padding:4px 0 0;font-family:inherit}',
      '.stp-dim{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:2147483644}',
      '.stp-sheet{position:fixed;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483645;max-width:480px;margin:0 auto;background:#10141c;border-radius:18px 18px 0 0;border-top:1px solid rgba(255,255,255,0.1);padding:18px 16px 16px;transform:translateY(110%);transition:transform .3s cubic-bezier(.16,1,.3,1)}',
      '.stp-sheet.on{transform:none}',
      '.stp-sheet h6{margin:0;font-size:1rem;font-weight:900;color:#fff}.stp-sheet p{margin:4px 0 12px;font-size:0.74rem;color:#94a3b8}',
      '.stp-body{max-height:min(54vh,460px);overflow-y:auto;scrollbar-width:none}',
      '.stp-g{margin-top:10px}.stp-g:first-of-type{margin-top:0}.stp-g small{display:block;font-size:0.68rem;font-weight:800;color:#94a3b8;margin-bottom:6px}.stp-g small i{font-style:normal;font-weight:700;color:#64748b}',
      '.stp-stars{display:flex;gap:4px}.stp-stars button{width:36px;height:36px;border:0;background:none;font-size:1.5rem;line-height:1;color:#334155;cursor:pointer;padding:0}.stp-stars button.on{color:#fcd34d}',
      '.stp-chips{display:flex;flex-wrap:wrap;gap:6px}',
      '.stp-chip{height:32px;padding:0 12px;border-radius:999px;border:1px solid #262c3b;background:#141824;color:#cfd4df;font-size:0.76rem;font-weight:800;cursor:pointer;font-family:inherit}',
      '.stp-chip.on{background:#fff;color:#000;border-color:#fff}',
      '.stp-inp{width:100%;box-sizing:border-box;min-height:64px;margin-top:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);color:#fff;padding:10px 12px;font-size:0.84rem;font-family:inherit;outline:none;resize:none;line-height:1.45}',
      '.stp-row{display:flex;gap:8px;margin-top:14px}.stp-row button{flex:1;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:0.84rem;font-weight:900;cursor:pointer;font-family:inherit}',
      '.stp-row button.p{background:#5bb8f0;border-color:#5bb8f0;color:#001521}.stp-row button:disabled{opacity:.55}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ---------- 정보창 칸 ----------
  function boxHtml(id) {
    var hit = store[id];
    var btns = '<div class="stp-btns"><button type="button" class="p" data-stp="open" data-spot="' + esc(id) + '">후기 남기기</button>' +
      '<button type="button" data-stp="write" data-spot="' + esc(id) + '">사진과 함께 올리기</button></div>';
    if (!hit) return '<div class="stp-h"><b><em>★</em> 박지 후기</b></div><div class="stp-empty">불러오는 중…</div>' + btns;
    if (hit.error) return '<div class="stp-h"><b><em>★</em> 박지 후기</b></div><div class="stp-empty">후기를 불러오지 못했어요</div>' + btns;
    var t = hit.tips || {}, r = hit.rev || {};
    var sum = r.summary || {};
    var revCount = Number(sum.review_count) || 0;
    var avg = Number(sum.avg_rating) || 0;
    var visits = Number(t.visits) || 0;
    var member = r.tier === 'member' || t.tier === 'member';
    var tipMap = t.tips || {};
    var top = Object.keys(tipMap).sort(function (a, b) { return tipMap[b] - tipMap[a]; }).slice(0, 8);

    var meta = [];
    if (revCount) meta.push('<strong>★ ' + avg.toFixed(1) + '</strong> · 후기 ' + revCount);
    if (visits) meta.push('<u>' + visits + '명 다녀옴</u>');
    var h = '<div class="stp-h"><b><em>★</em> 박지 후기</b><span class="stp-meta">' + meta.join(' · ') + '</span></div>';
    if (top.length) h += '<div class="stp-line">' + top.map(function (k) { return '<span>' + esc(k) + ' ' + tipMap[k] + '</span>'; }).join('') + '</div>';

    // 최근 글: 별점 후기 + 팁 한 줄 (같은 사람 것은 별점 후기만)
    var reviews = (Array.isArray(r.reviews) ? r.reviews : []).filter(function (x) { return x && !hiddenUgc(x.id, x.user_id); });
    var revUsers = {};
    reviews.forEach(function (x) { revUsers[x.user_id] = true; });
    var notes = (Array.isArray(t.notes) ? t.notes : []).filter(function (n) { return n && n.note && !revUsers[n.user_id] && !hiddenUgc('tip_' + id + '_' + n.user_id, n.user_id); });
    var items = reviews.map(function (x) { return { kind: 'rev', at: x.created_at, x: x }; })
      .concat(notes.map(function (n) { return { kind: 'tip', at: n.updated_at, x: n }; }))
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 3);

    if (!member && (revCount || visits)) {
      h += '<div class="stp-empty">후기 글은 로그인하면 볼 수 있어요.</div>';
    } else if (!items.length && !top.length) {
      h += '<div class="stp-empty">' + (visits ? '아직 남긴 후기가 없어요. 다녀왔다면 첫 후기를 남겨 주세요.' : '아직 후기가 없어요. 다녀왔다면 "다녀왔음"을 누르고 남겨 주세요.') + '</div>';
    }
    h += items.map(function (it) {
      var x = it.x;
      var own = isMine(x.user_id);
      var right = '';
      if (it.kind === 'rev') {
        right = own ? '' : '<button type="button" data-act="ugc" data-spot="' + esc(id) + '" data-id="' + esc(x.id) + '" data-uid="' + esc(x.user_id) + '" data-nick="' + esc(x.nickname) + '">신고</button>';
      } else if (isAdmin()) {
        right = '<button type="button" class="red" data-stp="del" data-spot="' + esc(id) + '" data-uid="' + esc(x.user_id) + '">삭제 (운영팀)</button>';
      }
      return '<div class="stp-item"><div class="stp-who"><b>' + esc(x.nickname || '백패커') + '</b>' +
        (it.kind === 'rev' ? '<span class="st">' + stars(x.rating) + '</span>' : '') +
        '<span>' + esc(md(it.at)) + '</span>' + right + '</div>' +
        (it.kind === 'rev' ? (x.text ? '<div class="stp-txt">' + esc(x.text) + '</div>' : '') : '<div class="stp-txt">' + esc(x.note) + '</div>') + '</div>';
    }).join('');
    if (revCount > 2) h += '<button type="button" class="stp-all" data-stp="all" data-spot="' + esc(id) + '">후기 ' + revCount + '개 모두 보기 ›</button>';

    var mineRev = r.mine, mineTip = t.mine;
    if (mineRev || mineTip) {
      var parts = [];
      if (mineRev && mineRev.rating) parts.push('★' + mineRev.rating);
      if (mineTip && mineTip.tips && mineTip.tips.length) parts.push(mineTip.tips.join(', '));
      h += '<div class="stp-mine"><span>내 후기 · ' + esc(parts.join(' · ') || '한 줄 남김') + '</span></div>';
      btns = btns.replace('>후기 남기기<', '>내 후기 고치기<');
    }
    return h + btns;
  }
  function repaint(id) {
    document.querySelectorAll('[data-okbm-tips-box]').forEach(function (b) {
      if (b.getAttribute('data-okbm-tips-box') === String(id)) b.innerHTML = boxHtml(String(id));
    });
  }
  // 찜하기·다녀왔음·공유 줄 바로 아래에 붙인다
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

  // ---------- 남기는 창 ----------
  var sheet = null, dim = null, sheetSpot = '', sheetStar = 0;
  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('on');
    var s = sheet, d = dim;
    sheet = null; dim = null;
    setTimeout(function () { if (s) s.remove(); if (d) d.remove(); }, 300);
  }
  function openSheet(id, fromVisit) {
    if (!loggedIn()) { if (typeof window.openLoginModal === 'function') window.openLoginModal(); return; }
    injectCss();
    closeSheet();
    sheetSpot = String(id);
    var hit = store[id] || {};
    var mineTip = hit.tips && hit.tips.mine;
    var mineRev = hit.rev && hit.rev.mine;
    var picked = mineTip && Array.isArray(mineTip.tips) ? mineTip.tips : [];
    sheetStar = mineRev && mineRev.rating ? Number(mineRev.rating) : 0;
    var text = mineRev ? (mineRev.text || '') : (mineTip ? (mineTip.note || '') : '');
    var name = shortName(spotOf(id));
    dim = document.createElement('div');
    dim.className = 'stp-dim';
    sheet = document.createElement('div');
    sheet.className = 'stp-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', name + ' 후기 남기기');
    sheet.innerHTML = '<h6>' + esc(fromVisit ? name + ' 다녀오셨군요!' : name + ' 후기') + '</h6>' +
      '<p>해당하는 것만 눌러 주세요. 다음 사람에게 큰 도움이 돼요.</p>' +
      '<div class="stp-body">' +
        '<div class="stp-g"><small>별점 <i>선택</i></small><div class="stp-stars">' +
          [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-stp-star="' + n + '" aria-label="' + n + '점"' + (n <= sheetStar ? ' class="on"' : '') + '>★</button>'; }).join('') +
        '</div></div>' +
        GROUPS.map(function (g) {
          return '<div class="stp-g"><small>' + esc(g.label) + (g.one ? '' : ' <i>여러 개</i>') + '</small><div class="stp-chips" data-stp-group="' + g.key + '"' + (g.one ? ' data-one="1"' : '') + '>' +
            g.tips.map(function (k) { return '<button type="button" class="stp-chip' + (picked.indexOf(k) !== -1 ? ' on' : '') + '" data-stp-chip="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>';
        }).join('') +
        '<textarea class="stp-inp" maxlength="300" rows="2" placeholder="한 줄 남기기 (안 써도 돼요)">' + esc(text) + '</textarea>' +
      '</div>' +
      '<div class="stp-row"><button type="button" data-stp="skip">다음에</button><button type="button" class="p" data-stp="save">남기기</button></div>';
    document.body.appendChild(dim);
    document.body.appendChild(sheet);
    void sheet.offsetHeight; // 처음 자리를 잡은 뒤 올린다
    setTimeout(function () { if (sheet) sheet.classList.add('on'); }, 20);
    dim.addEventListener('click', closeSheet);
    sheet.addEventListener('click', onSheetClick);
  }
  function paintStars() {
    if (!sheet) return;
    sheet.querySelectorAll('[data-stp-star]').forEach(function (b) { b.classList.toggle('on', Number(b.getAttribute('data-stp-star')) <= sheetStar); });
  }
  function onSheetClick(e) {
    var st = e.target.closest('[data-stp-star]');
    if (st) {
      var n = Number(st.getAttribute('data-stp-star'));
      sheetStar = (sheetStar === n) ? 0 : n; // 같은 별을 다시 누르면 별점 없음
      paintStars();
      return;
    }
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
  // 별점 후기(comments): 있으면 고치고 없으면 새로 (lounge.js saveReview와 같은 방식)
  function saveReview(id, star, text) {
    var c = window.supabaseClient, me = myId();
    if (!c || !me) return Promise.reject(new Error('not authenticated'));
    var mine = store[id] && store[id].rev && store[id].rev.mine;
    var q = (mine && mine.id != null)
      ? c.from('comments').update({ rating: star, text: text }).eq('id', mine.id).select('id')
      : c.from('comments').insert([{ spot_id: id, user_id: me, rating: star, text: text }]).select('id');
    return Promise.resolve(q).then(function (res) {
      if (res.error && res.error.code === '23505') {
        return c.from('comments').update({ rating: star, text: text }).eq('spot_id', id).eq('user_id', me).select('id');
      }
      return res;
    }).then(function (res) {
      if (res.error) throw res.error;
      if (!Array.isArray(res.data) || !res.data.length) throw new Error('no_rows');
      if (typeof window.okbmLoadSpotReviewBox === 'function') { try { window.okbmLoadSpotReviewBox({ id: id }, true); } catch (e) {} }
    });
  }
  function save(btn) {
    var id = sheetSpot;
    var tips = Array.prototype.map.call(sheet.querySelectorAll('.stp-chip.on'), function (c) { return c.getAttribute('data-stp-chip'); });
    var text = String((sheet.querySelector('.stp-inp') || {}).value || '').trim();
    var star = sheetStar;
    if (!tips.length && !text && !star) { toast('별점이나 팁을 하나 고르거나 한 줄을 적어 주세요.', 'warn'); return; }
    btn.disabled = true;
    var jobs = [];
    if (star) {
      jobs.push(saveReview(id, star, text.slice(0, 1000)));
      if (tips.length) jobs.push(rpc('okbm_save_spot_tips', { p_spot_id: id, p_tips: tips, p_note: '' }));
    } else {
      jobs.push(rpc('okbm_save_spot_tips', { p_spot_id: id, p_tips: tips, p_note: text.slice(0, 60) }));
    }
    Promise.all(jobs).then(function () {
      closeSheet();
      if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(12); } catch (err) {} }
      toast('고마워요! ' + shortName(spotOf(id)) + ' 후기에 쌓였어요.');
      load(id, true);
      // 라운지 "박지 후기" 탭 등 다른 화면도 새로 받게 알린다
      try { window.dispatchEvent(new CustomEvent('okbm_spot_review_saved', { detail: { spotId: id } })); } catch (e2) {}
    }).catch(function (err) {
      console.warn('[spot-tips:save]', err);
      var m = String((err && err.message) || '');
      btn.disabled = false;
      if (m.indexOf('not authenticated') !== -1) { closeSheet(); if (typeof window.openLoginModal === 'function') window.openLoginModal(); return; }
      toast(m.indexOf('rate limit') !== -1 ? '잠시 뒤에 다시 남겨 주세요.' : '남기지 못했어요. 잠시 뒤 다시 해 주세요.', 'warn');
      load(id, true);
    });
  }

  // 로그인한 사람이 "다녀왔음"을 켤 때 창을 연다 (기존 표시 동작이 끝난 뒤)
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
      if (nowOn) { clearInterval(timer); load(id, true).then(function () { openSheet(id, true); }); }
      else if (tries > 30) clearInterval(timer);
    }, 100);
  }, true);

  // 태그 줄의 "★ 4.5 · 후기 N" 칩은 숨긴 옛 칸 대신 합친 칸으로 내린다
  document.addEventListener('click', function (e) {
    var chip = e.target && e.target.closest ? e.target.closest('[data-act="scroll"][data-spot]') : null;
    if (!chip) return;
    var root = chip.closest('#mobileSheetContent, #pcSlidingDrawer');
    var box = root && root.querySelector('[data-okbm-tips-box="' + chip.getAttribute('data-spot') + '"]');
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, true);

  // 칸 안의 버튼. 지도 아래 시트(mobileBottomSheet)가 누름을 위로 올려 보내지 않아서 잡기 단계에서 듣는다
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-okbm-tips-box] [data-stp], [data-okbm-tips-box] [data-act="ugc"]') : null;
    if (!b) return;
    var id = b.getAttribute('data-spot');
    if (b.getAttribute('data-act') === 'ugc') {
      if (typeof window.okbmSpotReviewAction === 'function') window.okbmSpotReviewAction(b, e);
      return;
    }
    var act = b.getAttribute('data-stp');
    if (act === 'open') {
      load(id, false).then(function () { openSheet(id, false); });
    } else if (act === 'all') {
      if (typeof window.openLoungeSpotReviews === 'function') window.openLoungeSpotReviews(id);
    } else if (act === 'write') {
      if (typeof window.openPastTripRegisterModal !== 'function') return;
      window.openPastTripRegisterModal(e);
      if (!document.getElementById('pastTripRegisterModal')) return; // 로그인 창이 뜬 경우
      var pool = typeof window._pastTripBuildSpotSearchPool === 'function' ? window._pastTripBuildSpotSearchPool() : [];
      var item = pool.find(function (p) { return String(p.id) === String(id); });
      if (item && typeof window.selectPastTripSpot === 'function') window.selectPastTripSpot(item, false);
    } else if (act === 'del' && isAdmin()) {
      if (!window.confirm('이 팁을 지울까요?')) return;
      rpc('okbm_admin_delete_spot_tip', { p_spot_id: id, p_user_id: b.getAttribute('data-uid') })
        .then(function () { toast('지웠어요.'); load(id, true); })
        .catch(function (err) { console.warn('[spot-tips:del]', err); toast('지우지 못했어요.', 'warn'); });
    }
  }, true);

  // 신고·차단·관리자 삭제 뒤 다시 그린다
  ['okbm_ugc_report_result', 'okbm_ugc_blocked', 'okbm_lounge_content_deleted'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      document.querySelectorAll('[data-okbm-tips-box]').forEach(function (bx) { load(bx.getAttribute('data-okbm-tips-box'), true); });
    });
  });

  // 라운지(lounge.js)의 "후기 쓰기"도 이 창을 쓴다
  window.okbmOpenSpotReviewSheet = function (spotId) {
    var id = String(spotId || '').trim();
    if (!id) return;
    load(id, true).then(function () { openSheet(id, false); });
  };

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
