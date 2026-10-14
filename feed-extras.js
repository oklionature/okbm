// 낭만피드 보탬 (2026-10-14)
// 1) 피드 오른쪽 위 "후기 올리기" 버튼. 첫 안내 화면에서는 안내 문구 아래로 옮긴다.
//    누르면 홈 바로가기와 같은 후기 올리기 창을 열고, 닫거나 올린 뒤에도 피드에 머문다.
// 2) 내 글 수정 화면 위쪽 장소를 눌러 등록된 박지로 바꾸기.
//    저장할 때 공개 여부는 기존 규칙(등록된 박지 + 현장 사진)대로 다시 정한다.
// 새 버튼은 onclick 속성 없이 이벤트로 단다(CSP 해시).
(function () {
  'use strict';
  if (window.__okbmFeedExtrasBooted) return;
  window.__okbmFeedExtrasBooted = true;

  var ICON_PLUS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind, ms) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info', ms || 2600);
  }

  function injectStyle() {
    if (document.getElementById('okbmFeedExtrasStyle')) return;
    var st = document.createElement('style');
    st.id = 'okbmFeedExtrasStyle';
    st.textContent =
      '.okbm-feed-write{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;z-index:40;height:34px;padding:0 13px 0 11px;border-radius:17px;' +
        'background:rgba(12,16,23,0.82);border:1px solid rgba(255,255,255,0.22);color:#fff;font-size:0.76rem;font-weight:900;font-family:inherit;' +
        'display:inline-flex;align-items:center;gap:5px;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
        'box-shadow:0 4px 14px rgba(0,0,0,0.45);transition:opacity .25s ease,transform .25s ease;}' +
      // 긴 장소 이름은 버튼 앞에서 말줄임 (글쓴이 사진 72px + 버튼 111px + 여백 8px)
      '#romanticHistoryModal .js-feed-spot-map{max-width:calc(100vw - 191px) !important;}' +
      '.okbm-feed-write.is-off{opacity:0;transform:translateY(-6px);pointer-events:none;}' +
      '.okbm-feed-write-intro{margin-top:6px;height:44px;padding:0 22px;border-radius:22px;border:0;background:#ffffff;color:#000;font-size:0.86rem;font-weight:900;' +
        'font-family:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer;}' +
      '.okbm-spot-change{flex-shrink:0;height:22px;padding:0 8px;border-radius:11px;border:1px solid rgba(91,184,240,0.55);background:rgba(91,184,240,0.12);' +
        'color:#5bb8f0;font-size:0.64rem;font-weight:900;font-family:inherit;cursor:pointer;margin-left:2px;}' +
      '#okbmSpotChangeSheet{position:fixed;top:0;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483646;background:rgba(0,0,0,0.78);display:flex;align-items:flex-end;justify-content:center;}' +
      '#okbmSpotChangeSheet .sc-box{width:100%;max-width:440px;height:72vh;height:72dvh;max-height:100%;background:#0c1017;border-top:1px solid rgba(255,255,255,0.14);' +
        'border-radius:18px 18px 0 0;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;}' +
      '#okbmSpotChangeSheet .sc-h{display:flex;justify-content:space-between;align-items:center;}' +
      '#okbmSpotChangeSheet .sc-h b{font-size:0.92rem;color:#fff;font-weight:900;}' +
      '#okbmSpotChangeSheet .sc-x{background:none;border:0;color:#94a3b8;font-size:1.1rem;cursor:pointer;}' +
      '#okbmSpotChangeSheet .sc-sub{margin:0;font-size:0.70rem;color:#8b93a5;line-height:1.5;}' +
      '#okbmSpotChangeSheet input{height:44px;border-radius:10px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.05);color:#fff;' +
        'padding:0 12px;font-size:0.9rem;outline:none;box-sizing:border-box;width:100%;font-family:inherit;}' +
      '#okbmSpotChangeSheet .sc-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;}' +
      '#okbmSpotChangeSheet .sc-item{text-align:left;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);' +
        'color:#e2e8f0;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:2px;}' +
      '#okbmSpotChangeSheet .sc-item b{font-size:0.84rem;font-weight:900;color:#fff;}' +
      '#okbmSpotChangeSheet .sc-item small{font-size:0.66rem;color:#8b93a5;}' +
      '#okbmSpotChangeSheet .sc-empty{padding:18px 8px;text-align:center;font-size:0.74rem;color:#64748b;line-height:1.6;}';
    document.head.appendChild(st);
  }

  // ---------- 1) 후기 올리기 ----------
  function openWrite(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(8); } catch (err) {} }
    if (typeof window.openPastTripRegisterModal !== 'function') return;
    // 홈 바로가기와 같은 처리: 닫거나 올린 뒤 마이리포트로 넘어가지 않고 피드에 남는다.
    if (typeof isUserLoggedIn !== 'function' || isUserLoggedIn()) window.__pastTripOpenedFromPlan = true;
    window.openPastTripRegisterModal(e);
  }

  function introVisible(modal) {
    var intro = modal.querySelector('[data-vault-intro="1"]');
    if (!intro) return false;
    var r = intro.getBoundingClientRect();
    var m = modal.getBoundingClientRect();
    // 안내 화면이 절반 넘게 보이면 안내 화면으로 친다
    var visible = Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top);
    return visible > m.height * 0.5;
  }

  function syncWriteButton(modal) {
    var btn = modal.querySelector('.okbm-feed-write');
    if (!btn) return;
    btn.classList.toggle('is-off', introVisible(modal));
  }

  function ensureIntroButton(modal) {
    var intro = modal.querySelector('[data-vault-intro="1"]');
    if (!intro || intro.querySelector('.okbm-feed-write-intro')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'okbm-feed-write-intro';
    b.setAttribute('data-feed-write', '1');
    b.setAttribute('data-metric-click', 'feed_write');
    b.innerHTML = ICON_PLUS + '<span>후기 올리기</span>';
    var next = intro.querySelector('.vault-intro-next');
    if (next) intro.insertBefore(b, next);
    else intro.appendChild(b);
  }

  function ensureWriteButton(modal) {
    if (!modal) return;
    injectStyle();
    if (!modal.querySelector('.okbm-feed-write')) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'okbm-feed-write';
      b.setAttribute('data-feed-write', '1');
      b.setAttribute('data-metric-click', 'feed_write');
      b.setAttribute('aria-label', '후기 올리기');
      b.innerHTML = ICON_PLUS + '<span>후기 올리기</span>';
      modal.appendChild(b);
    }
    ensureIntroButton(modal);
    syncWriteButton(modal);
    if (!modal.__okbmFeedWriteBound) {
      modal.__okbmFeedWriteBound = true;
      // 피드 넘김은 안쪽 스크롤이라 잡기 단계에서 듣는다
      modal.addEventListener('scroll', function () { syncWriteButton(modal); }, true);
      // 피드를 다시 그리면 안내 화면도 새로 생기므로 버튼을 다시 붙인다
      new MutationObserver(function () {
        ensureIntroButton(modal);
        syncWriteButton(modal);
      }).observe(modal, { childList: true, subtree: true });
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-feed-write]') : null;
    if (t) openWrite(e);
  });

  // ---------- 2) 수정 화면 장소 바꾸기 ----------
  var pending = null; // { recordId, spot, elevation, spotId }

  function registeredMatches(q) {
    if (typeof window._pastTripScoreSpotMatches !== 'function') return [];
    return window._pastTripScoreSpotMatches(q).filter(function (s) { return s && s.id; }).slice(0, 15);
  }

  function spotLabel(s) {
    if (typeof window._pastTripComposeSpotLabel === 'function') {
      return window._pastTripComposeSpotLabel(s.name || s.rawName || '', String(s.cityName || s.region || '').trim());
    }
    return String(s.name || s.rawName || '').trim();
  }

  function closeSheet() {
    var old = document.getElementById('okbmSpotChangeSheet');
    if (old) old.remove();
  }

  function renderList(listEl, q, pick) {
    var query = String(q || '').trim();
    if (!query) {
      listEl.innerHTML = '<div class="sc-empty">다녀온 박지 이름을 입력해 주세요.</div>';
      return;
    }
    var hits = registeredMatches(query);
    if (!hits.length) {
      listEl.innerHTML = '<div class="sc-empty">일치하는 등록 박지가 없어요.<br>지도에서 박지 제보를 하면 등록 후 고를 수 있어요.</div>';
      return;
    }
    listEl.innerHTML = hits.map(function (s, i) {
      var sub = [s.cityName || s.region || '', s.elevation ? String(s.elevation).replace(/[^\d.]/g, '') + 'm' : ''].filter(Boolean).join(' · ');
      return '<button type="button" class="sc-item" data-i="' + i + '"><b>' + esc(spotLabel(s)) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
    }).join('');
    listEl.__hits = hits;
    listEl.onclick = function (ev) {
      var it = ev.target.closest('.sc-item');
      if (!it) return;
      var s = listEl.__hits[Number(it.getAttribute('data-i'))];
      if (s) pick(s);
    };
  }

  function openSpotSheet(recordId) {
    injectStyle();
    closeSheet();
    var sheet = document.createElement('div');
    sheet.id = 'okbmSpotChangeSheet';
    sheet.innerHTML =
      '<div class="sc-box">' +
        '<div class="sc-h"><b>장소 바꾸기</b><button type="button" class="sc-x" aria-label="닫기">✕</button></div>' +
        '<p class="sc-sub">등록된 박지로 바꾸면 피드에 공개할 수 있어요. 저장을 눌러야 바뀌어요.</p>' +
        '<input type="search" placeholder="박지 이름 검색 (예: 선자령)" enterkeyhint="search" autocomplete="off">' +
        '<div class="sc-list"></div>' +
      '</div>';
    sheet.addEventListener('click', function (ev) {
      if (ev.target === sheet || (ev.target.closest && ev.target.closest('.sc-x'))) closeSheet();
    });
    document.body.appendChild(sheet);
    var input = sheet.querySelector('input');
    var listEl = sheet.querySelector('.sc-list');
    var pick = function (s) {
      var elev = String(s.elevation || '').trim().replace(/[^\d.]/g, '');
      pending = { recordId: String(recordId || ''), spot: spotLabel(s), elevation: elev ? elev + 'm' : '', spotId: String(s.id || '').trim() };
      var label = document.getElementById('richHeaderSpotNameText');
      if (label) {
        label.textContent = pending.spot;
        label.style.color = '#5bb8f0';
      }
      closeSheet();
      toast('저장을 누르면 장소가 바뀌어요.', 'info', 2200);
    };
    input.addEventListener('input', function () { renderList(listEl, input.value, pick); });
    renderList(listEl, '', pick);
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
  }

  function ensureSpotChange(formModal) {
    if (!formModal || formModal.__okbmSpotChange) return;
    var label = formModal.querySelector('#richHeaderSpotNameText');
    var saveBtn = formModal.querySelector('#btnSubmitRichTrip');
    if (!label || !saveBtn) return;
    formModal.__okbmSpotChange = true;
    pending = null;
    injectStyle();
    var recordId = saveBtn.getAttribute('data-record-id') || '';
    var pill = label.parentNode;
    if (pill) {
      pill.setAttribute('title', '장소를 눌러 바꿀 수 있어요');
      pill.style.cursor = 'pointer';
    }
    // 장소 이름이 120px에서 잘리던 것을 남는 폭까지 쓰게 한다
    label.style.maxWidth = 'none';
    label.style.minWidth = '0';
    label.style.flex = '0 1 auto';
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'okbm-spot-change';
    chip.textContent = '바꾸기';
    label.insertAdjacentElement('afterend', chip);
    (pill || chip).addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openSpotSheet(recordId);
    });
    wrapRichSave();
  }

  function findRichTarget(recordId) {
    var sId = String(recordId || '').trim();
    var t = (window.interactiveHistory || []).find(function (r) { return r && String(r.id).trim() === sId; });
    return t || window.__richCurrentRecord || null;
  }

  function wrapRichSave() {
    var orig = window.__saveRichAfterTrip;
    if (typeof orig !== 'function' || orig.__okbmSpotWrapped) return;
    var wrapped = async function (recordId) {
      var change = pending && String(pending.recordId) === String(recordId || '') ? pending : null;
      var target = change ? findRichTarget(recordId) : null;
      if (change && target && !window.__isSubmittingRichTrip && !window.__isPhotoCompressing) {
        target.spot = change.spot;
        target.spotName = change.spot;
        if (change.elevation) target.elevation = change.elevation;
        target.spotId = change.spotId;
        target.spot_id = change.spotId;
        // 등록된 박지를 골랐으니 "등록 안 된 장소" 표시를 지운다. 공개 여부는 원래 저장 흐름이 다시 정한다.
        target.unregisteredSpot = false;
        target.unregistered_spot = false;
      }
      var res = await orig.apply(this, arguments);
      if (change && target && !document.getElementById('modalRichAfterTrip')) {
        pending = null;
        if (typeof window.okbmMetric === 'function') { try { window.okbmMetric('feed_spot_change', 'event'); } catch (e) {} }
        var pub = target.isPublished === true || target.is_published === true;
        var can = typeof window.okbmCanPublishFeed === 'function' && window.okbmCanPublishFeed(target);
        if (!pub && can) {
          setTimeout(function () {
            toast('장소를 바꿨어요.\n⋯ 메뉴에서 함께보기를 켜면 피드에 올라가요.', 'success', 3800);
          }, 400);
        }
      }
      return res;
    };
    wrapped.__okbmSpotWrapped = true;
    window.__saveRichAfterTrip = wrapped;
  }

  // ---------- 화면 감시 ----------
  function scan() {
    var modal = document.getElementById('romanticHistoryModal');
    if (modal) ensureWriteButton(modal);
    var rich = document.getElementById('modalRichAfterTrip');
    if (rich) ensureSpotChange(rich);
  }

  function boot() {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
