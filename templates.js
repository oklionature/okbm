// =========================================================================
// 🚀 [templates.js] 6종 정예 템플릿 엔진 & 포토 카드 스튜디오 마스터 (v2.6.1)
// =========================================================================
(function(window) {
var escapeHtml = function(t) {
  if (t === null || t === undefined) return '';
  if (typeof window.escapeHtml === 'function' && window.escapeHtml !== escapeHtml) {
    return window.escapeHtml(t);
  }
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
var okbmSafeImageUrl = function(url) {
  var raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  // 세션 미리보기 blob만 화면 표시 허용. DB/로컬 영구 저장은 https만.
  if (raw.indexOf('blob:') === 0) {
    if (raw === window.__readyShotPreviewBlobUrl
        || raw === window.currentSharePhoto
        || raw === window.currentSharePhotoRaw) {
      return raw;
    }
    return '';
  }
  // 빈 사진 자리표시 SVG. 전역 okbmSafeImageUrl은 data: 를 막아 깨진 이미지 아이콘이 뜸.
  if (raw.indexOf('data:image/svg+xml,') === 0 && raw.length < 800) return raw;
  return (typeof window.okbmSafeImageUrl === 'function') ? window.okbmSafeImageUrl(raw) : '';
};
var okbmSafeExternalUrl = function(url) {
  return (typeof window.okbmSafeExternalUrl === 'function') ? window.okbmSafeExternalUrl(url) : '#';
};

var SVG_ICONS = window.SVG_ICONS || { brandLogo: '' };

var showToast = window.showToast || function(m) { console.warn('[templates.js]', m); };
var triggerHaptic = window.triggerHaptic || function() {};
var initCardSwipeGesture = window.initCardSwipeGesture || function() {};

if (!document.getElementById('tmpl-spin-anim-style')) {
  var spinStyle = document.createElement('style');
  spinStyle.id = 'tmpl-spin-anim-style';
  spinStyle.textContent = '@keyframes tmplSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(spinStyle);
}

window.currentSharePhoto = window.currentSharePhoto || '';
window.currentSharePhotoRaw = window.currentSharePhotoRaw || '';
window.currentPhotoTextColor = window.currentPhotoTextColor || 'white';
window.currentCardRatio = '3/4';
window.currentPhotoPosX = 50;
window.currentPhotoPosY = 50;
var currentCustomRatioVal = 0.75;
var currentAutoRatioVal = '3/4';
var currentPhotoScaleVal = 1.0;

// 🛡️ [메모리 누수 패치] window/target 드래그 리스너 일괄 해제
var __studioDragAbort = null;
var __studioDragCleanup = null;

function teardownStudioPhotoDrag() {
  if (__studioDragAbort) {
    try { __studioDragAbort.abort(); } catch (e) {}
    __studioDragAbort = null;
  }
  if (typeof __studioDragCleanup === 'function') {
    try { __studioDragCleanup(); } catch (e) {}
    __studioDragCleanup = null;
  }
}

function setupStudioPhotoDrag(targetEl) {
  teardownStudioPhotoDrag();
  if (!targetEl) return;

  var ac = (typeof AbortController === 'function') ? new AbortController() : null;
  __studioDragAbort = ac;
  var signal = ac ? ac.signal : undefined;

  var isDragging = false;
  var isPinching = false;
  var startX = 0, startY = 0;
  var startPosX = 50, startPosY = 50;
  var startDist = 0;
  var startScale = 1.0;
  var touchStartTime = 0;
  var studioModes = ['balance', 'kuchi', 'issue', 'spread', 'magazine', 'overlay', 'minimal', 'chic', 'essay', 'sage', 'editorial'];

  function getDistance(touches) {
    var dx = touches[0].clientX - touches[1].clientX;
    var dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function getMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  function updateTransform() {
    var img = document.getElementById('readyShotFrameImg') || document.getElementById('photoStudioBgImage');
    if (!img) return;
    var posX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
    var posY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
    var scale = currentPhotoScaleVal || 1.0;
    img.style.objectPosition = posX + '% ' + posY + '%';
    img.style.transformOrigin = posX + '% ' + posY + '%';
    img.style.transform = 'scale(' + scale + ')';
  }

  function onPointerDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
    var rect = targetEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (e.touches && e.touches.length >= 2) {
      isPinching = true;
      isDragging = false;
      startDist = getDistance(e.touches);
      startScale = currentPhotoScaleVal || 1.0;
      var mid = getMidpoint(e.touches);
      startX = mid.x;
      startY = mid.y;
      startPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
      startPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
      if (e.cancelable) e.preventDefault();
      return;
    }

    isDragging = true;
    isPinching = false;
    touchStartTime = Date.now();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    startPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
    startPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
    targetEl.style.cursor = 'grabbing';
    if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging && !isPinching) return;
    var rect = targetEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    if (isPinching && e.touches && e.touches.length >= 2) {
      var curDist = getDistance(e.touches);
      if (startDist > 0) {
        var scaleRatio = curDist / startDist;
        currentPhotoScaleVal = Math.max(1.0, Math.min(2.5, +(startScale * scaleRatio).toFixed(2)));
      }
      var mid = getMidpoint(e.touches);
      var deltaX = mid.x - startX;
      var deltaY = mid.y - startY;
      window.currentPhotoPosX = Math.max(0, Math.min(100, Math.round(startPosX - (deltaX / rect.width) * 100)));
      window.currentPhotoPosY = Math.max(0, Math.min(100, Math.round(startPosY - (deltaY / rect.height) * 100)));
      updateTransform();
      if (e.cancelable) e.preventDefault();
      return;
    }

    if (isDragging) {
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var clientY = e.touches ? e.touches[0].clientY : e.clientY;
      var deltaX = clientX - startX;
      var deltaY = clientY - startY;
      window.currentPhotoPosX = Math.max(0, Math.min(100, Math.round(startPosX - (deltaX / rect.width) * 100)));
      window.currentPhotoPosY = Math.max(0, Math.min(100, Math.round(startPosY - (deltaY / rect.height) * 100)));
      updateTransform();
      if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
    }
  }

  function onPointerEnd(e) {
    if (isPinching && e.touches && e.touches.length < 2) {
      isPinching = false;
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
        startPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
      }
    }
    if (!e.touches || e.touches.length === 0) {
      var clientX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : e.clientX;
      var clientY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : e.clientY;
      var diffX = clientX - startX;
      var diffY = clientY - startY;
      var absX = Math.abs(diffX);
      var absY = Math.abs(diffY);
      var duration = Date.now() - touchStartTime;

      if (!isPinching && (currentPhotoScaleVal || 1.0) <= 1.05 && absX > 45 && absX > absY * 1.5 && duration < 350) {
        var frameOpen = document.getElementById('readyShotFrameOverlay');
        var frameVisible = frameOpen && frameOpen.style.display !== 'none';
        if (!frameVisible) {
          window.currentPhotoPosX = startPosX;
          window.currentPhotoPosY = startPosY;
          updateTransform();

          var curMode = window.currentStudioCardMode || 'minimal';
          var curIdx = studioModes.indexOf(curMode);
          if (curIdx === -1) curIdx = 0;

          var nextIdx = 0;
          if (diffX < 0) {
            nextIdx = (curIdx + 1) % studioModes.length;
          } else {
            nextIdx = (curIdx - 1 + studioModes.length) % studioModes.length;
          }
          window.switchStudioMode(studioModes[nextIdx]);
        }
      }

      isDragging = false;
      isPinching = false;
      targetEl.style.cursor = 'grab';
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.05 : 0.05;
    currentPhotoScaleVal = Math.max(1.0, Math.min(2.5, +(currentPhotoScaleVal + delta).toFixed(2)));
    updateTransform();
  }

  var mouseOpts = signal ? { signal: signal } : false;
  var touchOpts = signal ? { passive: false, signal: signal } : { passive: false };
  var wheelOpts = signal ? { passive: false, signal: signal } : { passive: false };

  targetEl.style.cursor = 'grab';
  targetEl.addEventListener('mousedown', onPointerDown, mouseOpts);
  window.addEventListener('mousemove', onPointerMove, mouseOpts);
  window.addEventListener('mouseup', onPointerEnd, mouseOpts);
  targetEl.addEventListener('touchstart', onPointerDown, touchOpts);
  window.addEventListener('touchmove', onPointerMove, touchOpts);
  window.addEventListener('touchend', onPointerEnd, mouseOpts);
  window.addEventListener('touchcancel', onPointerEnd, mouseOpts);
  targetEl.addEventListener('wheel', onWheel, wheelOpts);

  __studioDragCleanup = function() {
    targetEl.removeEventListener('mousedown', onPointerDown);
    window.removeEventListener('mousemove', onPointerMove);
    window.removeEventListener('mouseup', onPointerEnd);
    targetEl.removeEventListener('touchstart', onPointerDown);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerEnd);
    window.removeEventListener('touchcancel', onPointerEnd);
    targetEl.removeEventListener('wheel', onWheel);
  };
}

function ensurePhotoStudioDOM() {
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) return studio;

  studio = document.createElement('div');
  studio.id = 'photoStudioOverlay';
  studio.style.cssText = 'display:none; position:fixed; inset:0; z-index:2147483647 !important; background:#000000; justify-content:center; align-items:center; overflow:hidden; box-sizing:border-box; overscroll-behavior:none !important; touch-action:none !important;';
  
  studio.innerHTML = `
    <div id="photoStudioStage" style="position:relative; width:100%; height:100%; max-width:440px; display:flex; justify-content:center; align-items:center; padding:env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px) 0; box-sizing:border-box;">
      <div id="photoStudioCardTarget" style="width:100%; max-height:calc(100% - 8px); overflow:visible; position:relative; display:flex; justify-content:center; align-items:center;"></div>
      
      <div style="position:absolute; top:calc(10px + env(safe-area-inset-top, 0px)); left:12px; right:12px; display:flex; flex-direction:column; gap:8px; z-index:100;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <button type="button" style="background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:0.75rem; font-weight:800; padding:5px 11px; border-radius:20px; cursor:pointer;" onclick="window.closePhotoStudio()">◀ 뒤로</button>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" id="btnStudioResetTop" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#ffffff; font-size:0.72rem; font-weight:800; padding:5px 10px; border-radius:20px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.resetStudioPhotoFraming()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              <span>초기화</span>
            </button>
            <button type="button" id="btnStudioSaveCard" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:#ffffff; font-size:0.72rem; font-weight:800; padding:5px 10px; border-radius:20px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.saveStudioCardToPhone()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>저장</span>
            </button>
            <button type="button" id="btnStudioApplyCard" style="background:#ffffff; color:#000000; font-size:0.75rem; font-weight:900; padding:5px 13px; border-radius:20px; border:none; cursor:pointer; box-shadow:0 2px 10px rgba(255,255,255,0.2); display:inline-flex; align-items:center; gap:4px;" onclick="window.applyStudioCardToTemplate()">확인 ✓</button>
          </div>
        </div>
        <style>
          #photoStudioOverlay .studio-mode-bar::-webkit-scrollbar,
          #photoStudioOverlay .studio-ratio-bar::-webkit-scrollbar,
          #photoStudioOverlay *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        </style>
        <div id="studioModeBar" class="studio-mode-bar" style="display:flex; justify-content:flex-start; gap:5px; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; padding:2px 2px; -webkit-overflow-scrolling:touch;">
          <button type="button" id="btnStudioModeBalance" style="background:#ffffff; color:#000000; border:none; padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:900; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('balance')">발란스</button>
          <button type="button" id="btnStudioModeKuchi" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('kuchi')">쿠치</button>
          <button type="button" id="btnStudioModeIssue" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('issue')">이슈</button>
          <button type="button" id="btnStudioModeSpread" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('spread')">스프레드</button>
          <button type="button" id="btnStudioModeMagazine" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('magazine')">매거진</button>
          <button type="button" id="btnStudioModeOverlay" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('overlay')">저널</button>
          <button type="button" id="btnStudioModeMinimal" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('minimal')">미니멀 갤러리</button>
          <button type="button" id="btnStudioModeChic" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('chic')">시크 갤러리</button>
          <button type="button" id="btnStudioModeEssay" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('essay')">감성 에세이</button>
          <button type="button" id="btnStudioModeSage" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('sage')">내추럴 카메라</button>
          <button type="button" id="btnStudioModeEditorial" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('editorial')">에디토리얼</button>
        </div>
      </div>

      <div id="studioFreeRatioSliderContainer" style="display:none !important; position:absolute; bottom:calc(85px + env(safe-area-inset-bottom, 0px)); left:20px; right:20px; background:#0c1017; border:1px solid rgba(255,255,255,0.2); border-radius:14px; padding:8px 12px; z-index:100; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:#94a3b8; font-weight:700;">
          <span>자유 비율 조절</span>
          <span id="freeRatioValLabel" style="color:#ffffff; font-family:'Space Grotesk', sans-serif; font-weight:900;">3 : 4</span>
        </div>
        <input type="range" id="studioFreeRatioSlider" min="0.52" max="1.0" step="0.01" value="0.75" style="width:100%; accent-color:#ffffff; cursor:pointer;" oninput="window.handleFreeRatioChange(this.value)" />
      </div>

      <div class="studio-ratio-bar" style="display:none !important; position:absolute; bottom:calc(14px + env(safe-area-inset-bottom, 0px)); background:#0c1017; border:1px solid rgba(255,255,255,0.2); border-radius:24px; padding:3px 6px; gap:3px; z-index:100; overflow-x:auto; max-width:92%; scrollbar-width:none; -ms-overflow-style:none; contain:content;">
        <button type="button" id="btnStudioRatio34" class="modal-btn" style="font-size:0.65rem; font-weight:900; padding:4px 9px; border-radius:14px; background:#ffffff; color:#000000; white-space:nowrap;" onclick="window.setStudioRatio('3/4')">3:4 기본</button>
        <button type="button" id="btnStudioRatio11" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('1/1')">1:1</button>
        <button type="button" id="btnStudioRatio45" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('4/5')">4:5</button>
        <button type="button" id="btnStudioRatio916" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('9/16')">9:16</button>
        <button type="button" id="btnStudioRatioFree" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#ffffff; border:1px dashed rgba(255,255,255,0.4); white-space:nowrap;" onclick="window.setStudioRatio('free')">자유 🎚️</button>
      </div>
    </div>
  `;
  document.body.appendChild(studio);
  return studio;
}

function ensureStudioExtraModeButtons() {
  var bar = document.getElementById('studioModeBar');
  if (!bar) return;
  var leftoverPack = document.getElementById('btnStudioModePacking');
  if (leftoverPack) leftoverPack.remove();
  if (!document.getElementById('btnStudioModeBalance')) {
    var balanceBtn = document.createElement('button');
    balanceBtn.type = 'button';
    balanceBtn.id = 'btnStudioModeBalance';
    balanceBtn.style.cssText = 'background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;';
    balanceBtn.setAttribute('onclick', "window.switchStudioMode('balance')");
    balanceBtn.textContent = '발란스';
    bar.insertBefore(balanceBtn, bar.firstChild);
  }
  if (!document.getElementById('btnStudioModeKuchi')) {
    var kuchiBtn = document.createElement('button');
    kuchiBtn.type = 'button';
    kuchiBtn.id = 'btnStudioModeKuchi';
    kuchiBtn.style.cssText = 'background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;';
    kuchiBtn.setAttribute('onclick', "window.switchStudioMode('kuchi')");
    kuchiBtn.textContent = '쿠치';
    bar.insertBefore(kuchiBtn, bar.firstChild);
  }
  if (!document.getElementById('btnStudioModeIssue')) {
    var issueBtn = document.createElement('button');
    issueBtn.type = 'button';
    issueBtn.id = 'btnStudioModeIssue';
    issueBtn.style.cssText = 'background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;';
    issueBtn.setAttribute('onclick', "window.switchStudioMode('issue')");
    issueBtn.textContent = '이슈';
    bar.insertBefore(issueBtn, bar.firstChild);
  }
  if (!document.getElementById('btnStudioModeSpread')) {
    var spreadBtn = document.createElement('button');
    spreadBtn.type = 'button';
    spreadBtn.id = 'btnStudioModeSpread';
    spreadBtn.style.cssText = 'background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;';
    spreadBtn.setAttribute('onclick', "window.switchStudioMode('spread')");
    spreadBtn.textContent = '스프레드';
    bar.insertBefore(spreadBtn, bar.firstChild);
  }
  var order = ['btnStudioModeBalance', 'btnStudioModeKuchi', 'btnStudioModeIssue', 'btnStudioModeSpread', 'btnStudioModeMagazine', 'btnStudioModeOverlay', 'btnStudioModeMinimal', 'btnStudioModeChic', 'btnStudioModeEssay', 'btnStudioModeSage', 'btnStudioModeEditorial'];
  order.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) bar.appendChild(el);
  });
}

window.resetStudioPhotoFraming = function() {
  window.currentPhotoPosX = 50;
  window.currentPhotoPosY = 50;
  currentPhotoScaleVal = 1.0;
  var img = document.getElementById('readyShotFrameImg') || document.getElementById('photoStudioBgImage');
  if (img) {
    img.style.objectPosition = '50% 50%';
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = '50% 50%';
  }
  if (typeof isReadyShotFrameModalOpen === 'function' && isReadyShotFrameModalOpen() && typeof window.refreshReadyShotFramePreview === 'function') {
    window.refreshReadyShotFramePreview(false);
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(8);
};

window.openPhotoStudio = function() {
  var photo = window.currentSharePhotoRaw || window.currentSharePhoto;
  if (!photo || String(photo).indexOf('https://') !== 0) {
    if (typeof showToast === 'function') showToast('먼저 사진을 넣어주세요.', 'warn');
    return;
  }
  document.body.classList.add('pack-share-open');
  var shareModal = document.getElementById('packShareModalOverlay');
  if (shareModal) shareModal.style.setProperty('display', 'none', 'important');
  var studio = ensurePhotoStudioDOM();
  if (studio) studio.style.setProperty('display', 'flex', 'important');
  window.currentCardRatio = '3/4';
  window.currentStudioCardMode = window.currentStudioCardMode || 'spread';
  if (window.currentStudioCardMode === 'nrc') window.currentStudioCardMode = 'overlay';
  if (window.currentStudioCardMode === 'packing') window.currentStudioCardMode = 'magazine';
  if (window.currentShareRecord) {
    if (window.currentShareRecord.readyShotPosX !== undefined) window.currentPhotoPosX = window.currentShareRecord.readyShotPosX;
    if (window.currentShareRecord.readyShotPosY !== undefined) window.currentPhotoPosY = window.currentShareRecord.readyShotPosY;
    if (window.currentShareRecord.readyShotScale !== undefined) currentPhotoScaleVal = window.currentShareRecord.readyShotScale;
    window.currentShareRecord.readyShotRatio = '3/4';
  }
  var leftoverNrc = document.getElementById('btnStudioModeNrc');
  if (leftoverNrc) leftoverNrc.remove();
  var leftoverTheme = document.getElementById('btnStudioOverlayTheme');
  if (leftoverTheme) leftoverTheme.remove();
  ensureStudioExtraModeButtons();
  window.updateStudioUI();
  syncStudioModeButtons(window.currentStudioCardMode);
  window.updateStudioCardLive();
  var target = document.getElementById('photoStudioCardTarget');
  if (target) setupStudioPhotoDrag(target);
  if (typeof triggerHaptic === 'function') triggerHaptic(15);
};

window.syncGlobalModalScrollLock = function() {
  var studio = document.getElementById('photoStudioOverlay');
  var shareModal = document.getElementById('packShareModalOverlay');
  var planModal = document.getElementById('romanticPlanModal');
  var histModal = document.getElementById('romanticHistoryModal');

  var isStudioOpen = studio && studio.style.display !== 'none';
  var isShareOpen = shareModal && shareModal.style.display !== 'none';
  var isPlanOpen = planModal && planModal.style.display !== 'none';
  var isHistOpen = histModal && histModal.style.display !== 'none';

  if (!isStudioOpen && !isShareOpen) {
    document.body.classList.remove('pack-share-open');
  }
  if (!isPlanOpen) {
    document.body.classList.remove('plan-modal-open');
  }
  if (!isHistOpen) {
    document.body.classList.remove('history-modal-open');
  }

  if (!isStudioOpen && !isShareOpen && !isPlanOpen && !isHistOpen && !document.body.classList.contains('trip-modal-open')) {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.touchAction = '';
  }
};

window.closePhotoStudio = function() {
  teardownStudioPhotoDrag();
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) studio.style.setProperty('display', 'none', 'important');
  var modal = document.getElementById('packShareModalOverlay');
  if (modal) {
    modal.style.setProperty('display', 'flex', 'important');
    document.body.classList.add('pack-share-open');
  }
  if (typeof window.updateShareCardLive === 'function') window.updateShareCardLive();
  syncReadyShotPhotoButtons();
  initCardSwipeGesture();
  window.syncGlobalModalScrollLock();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.applyStudioCardToTemplate = async function() {
  var card = document.getElementById('photoStudioCardTarget');
  if (!card) return;
  if (typeof triggerHaptic === 'function') triggerHaptic(12);

  var btn = document.getElementById('btnStudioApplyCard');
  var prevHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.75';
    btn.innerHTML = '<span style="width:11px; height:11px; border:2px solid rgba(0,0,0,0.3); border-top-color:#000000; border-radius:50%; display:inline-block; animation:tmplSpin 0.7s linear infinite;"></span><span>적용 중...</span>';
  }

  try {
    var rawPhoto = resolveReadyShotPhotoUrl();
    if ((!rawPhoto || String(rawPhoto).indexOf('https://') !== 0) && window.__readyShotUploadPromise) {
      try {
        rawPhoto = await window.__readyShotUploadPromise;
      } catch (eWaitApply) {}
    }
    if (!rawPhoto || String(rawPhoto).indexOf('https://') !== 0) {
      if (typeof showToast === 'function') showToast('사진 업로드가 끝나지 않았습니다. 잠시 후 다시 시도해주세요.', 'warn');
      return;
    }

    window.currentCardRatio = '3/4';
    window.currentShareRecord = window.currentShareRecord || {};
    window.currentShareRecord.readyShotPhoto = rawPhoto;
    window.currentShareRecord.ready_shot_photo = rawPhoto;
    window.currentShareRecord.readyShotMode = window.currentStudioCardMode || 'spread';
    window.currentShareRecord.readyShotPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
    window.currentShareRecord.readyShotPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
    window.currentShareRecord.readyShotScale = currentPhotoScaleVal || 1.0;
    window.currentShareRecord.readyShotRatio = '3/4';
    if (!isReadyShotSessionBlob(window.currentSharePhoto)) {
      window.currentSharePhoto = resolveReadyShotDisplayUrl() || rawPhoto;
      window.currentSharePhotoRaw = window.currentSharePhoto;
    }
    window.readyShotFamily = 'photo';
    persistReadyShotPhotoNow(rawPhoto);
    try {
      localStorage.setItem('romantic_ready_shot_family', 'photo');
      localStorage.setItem('romantic_studio_mode', window.currentStudioCardMode || 'spread');
    } catch (e) {}

    teardownStudioPhotoDrag();
    var studio = document.getElementById('photoStudioOverlay');
    if (studio) studio.style.setProperty('display', 'none', 'important');
    var shareModal = document.getElementById('packShareModalOverlay');
    if (shareModal) {
      shareModal.style.setProperty('display', 'flex', 'important');
      document.body.classList.add('pack-share-open');
    }
    syncReadyShotFamilyToggle();
    syncReadyShotPhotoButtons();
    renderTemplateChips();
    if (typeof window.updateShareCardLive === 'function') window.updateShareCardLive();
    setTimeout(function() { initCardSwipeGesture(); }, 40);
    window.syncGlobalModalScrollLock();
    if (typeof showToast === 'function') showToast('사진 구도가 적용되었습니다.', 'success', 1600);
  } catch (err) {
    console.warn('[templates.js:applyStudioCardToTemplate]', err);
    if (typeof showToast === 'function') showToast('적용 중 오류가 발생했습니다.', 'warn');
  } finally {
    if (btn) {
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.innerHTML = prevHtml;
    }
  }
};

window.setStudioRatio = function(ratio) {
  window.currentCardRatio = '3/4';
  var sliderContainer = document.getElementById('studioFreeRatioSliderContainer');
  if (sliderContainer) sliderContainer.style.display = 'none';
  var ratioBar = document.querySelector('#photoStudioOverlay .studio-ratio-bar');
  if (ratioBar) ratioBar.style.display = 'none';
  window.updateStudioUI();
  window.updateStudioCardLive();
};

window.handleFreeRatioChange = function() {
  window.currentCardRatio = '3/4';
  window.updateStudioCardLive();
};

function syncStudioModeButtons(mode) {
  var map = { 'balance': 'btnStudioModeBalance', 'kuchi': 'btnStudioModeKuchi', 'issue': 'btnStudioModeIssue', 'spread': 'btnStudioModeSpread', 'magazine': 'btnStudioModeMagazine', 'overlay': 'btnStudioModeOverlay', 'minimal': 'btnStudioModeMinimal', 'chic': 'btnStudioModeChic', 'essay': 'btnStudioModeEssay', 'sage': 'btnStudioModeSage', 'editorial': 'btnStudioModeEditorial' };
  var activeBtn = null;
  Object.keys(map).forEach(function(k) {
    var btn = document.getElementById(map[k]);
    if (!btn) return;
    if (k === mode) {
      btn.style.background = '#ffffff';
      btn.style.color = '#000000';
      btn.style.fontWeight = '900';
      btn.style.border = 'none';
      activeBtn = btn;
    } else {
      btn.style.background = 'rgba(0,0,0,0.65)';
      btn.style.color = '#cbd5e1';
      btn.style.fontWeight = '800';
      btn.style.border = '1px solid rgba(255,255,255,0.25)';
    }
  });
  if (!activeBtn) return;
  requestAnimationFrame(function() {
    var bar = document.getElementById('studioModeBar') || (activeBtn.parentElement);
    if (!bar) return;
    var barRect = bar.getBoundingClientRect();
    var btnRect = activeBtn.getBoundingClientRect();
    if (!barRect.width || !btnRect.width) return;
    var delta = (btnRect.left + btnRect.width / 2) - (barRect.left + barRect.width / 2);
    var maxLeft = Math.max(0, bar.scrollWidth - bar.clientWidth);
    var nextLeft = Math.max(0, Math.min(maxLeft, bar.scrollLeft + delta));
    if (typeof bar.scrollTo === 'function') {
      bar.scrollTo({ left: nextLeft, behavior: 'smooth' });
    } else {
      bar.scrollLeft = nextLeft;
    }
  });
}

window.switchStudioMode = function(mode) {
  if (mode === 'nrc') mode = 'overlay';
  if (mode === 'packing') mode = 'magazine';
  window.currentStudioCardMode = mode;
  try { localStorage.setItem('romantic_studio_mode', mode); } catch (e) {}
  if (window.currentShareRecord) {
    window.currentShareRecord.readyShotMode = mode;
  }
  var leftoverTheme = document.getElementById('btnStudioOverlayTheme');
  if (leftoverTheme) leftoverTheme.remove();
  if ((mode === 'overlay' || mode === 'editorial' || mode === 'magazine' || mode === 'spread' || mode === 'issue' || mode === 'kuchi' || mode === 'balance') && (!window.currentCardRatio || window.currentCardRatio === '4/5')) {
    window.currentCardRatio = '3/4';
    window.updateStudioUI();
  }
  syncStudioModeButtons(mode);
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.updateStudioUI = function() {
  window.currentCardRatio = '3/4';
  var sliderContainer = document.getElementById('studioFreeRatioSliderContainer');
  if (sliderContainer) sliderContainer.style.display = 'none';
  var ratioBar = document.querySelector('#photoStudioOverlay .studio-ratio-bar');
  if (ratioBar) ratioBar.style.display = 'none';
};

function getStudioAspectRatio() {
  return 0.75;
}

function getStudioCardBoxCss() {
  return 'container-type:inline-size; aspect-ratio:3/4; width:100%; max-width:340px; height:auto; max-height:calc(100vh - 168px); max-height:calc(100dvh - 168px); margin:0 auto;';
}

function getStudioExportSize(cardW, cardH) {
  var ratio = (cardW > 0 && cardH > 0) ? (cardW / cardH) : getStudioAspectRatio();
  if (!ratio || !isFinite(ratio)) ratio = 0.75;
  var maxSide = 1440;
  var width;
  var height;
  if (ratio >= 1) {
    width = maxSide;
    height = Math.round(maxSide / ratio);
  } else {
    height = maxSide;
    width = Math.round(maxSide * ratio);
  }
  return { width: width, height: height };
}

function resolveStudioCardEl(card) {
  if (!card || !card.querySelector) return card;
  return card.querySelector('.photo-overlay-card')
    || card.querySelector('.ready-shot-card-vector')
    || card.querySelector('.tmpl-card-base')
    || card.firstElementChild
    || card;
}

function loadCorsImage(src) {
  return new Promise(function(resolve) {
    var url = String(src || '').trim();
    if (!url) return resolve(null);
    var img = new Image();
    if (url.indexOf('https://') === 0 || url.indexOf('http://') === 0) {
      img.crossOrigin = 'anonymous';
    }
    var settled = false;
    var finish = function(el) {
      if (settled) return;
      settled = true;
      resolve(el || null);
    };
    var timer = setTimeout(function() { finish(null); }, 8000);
    img.onload = function() { clearTimeout(timer); finish(img); };
    img.onerror = function() { clearTimeout(timer); finish(null); };
    if (url.indexOf('r2.dev') !== -1 || url.indexOf('workers.dev') !== -1) {
      img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'okbmcc=1';
    } else {
      img.src = url;
    }
  });
}

function readPhotoFit(img) {
  var posX = 50;
  var posY = 50;
  var zoom = 1;
  if (!img) return { posX: posX, posY: posY, scale: zoom };
  var inline = img.getAttribute('style') || '';
  var op = inline.match(/object-position\s*:\s*([\d.]+)%\s+([\d.]+)%/i);
  if (op) {
    posX = parseFloat(op[1]);
    posY = parseFloat(op[2]);
  }
  var sc = inline.match(/transform\s*:\s*scale\(([\d.]+)\)/i);
  if (sc) zoom = parseFloat(sc[1]) || 1;
  try {
    var st = window.getComputedStyle(img);
    var parts = String(st.objectPosition || '').split(/\s+/);
    if (parts[0] && parts[0].indexOf('%') !== -1) posX = parseFloat(parts[0]);
    if (parts[1] && parts[1].indexOf('%') !== -1) posY = parseFloat(parts[1]);
    if (st.transform && st.transform !== 'none') {
      var m = st.transform.match(/matrix\(([^)]+)\)/);
      if (m) {
        var a = parseFloat(m[1].split(',')[0]);
        if (a && isFinite(a)) zoom = a;
      }
    }
  } catch (e) {}
  if (isNaN(posX)) posX = 50;
  if (isNaN(posY)) posY = 50;
  if (!zoom || zoom <= 0 || !isFinite(zoom)) zoom = 1;
  return { posX: posX, posY: posY, scale: zoom };
}

function paintPhotoKeepRatio(sourceImg, boxW, boxH, posX, posY, zoom) {
  var w = Math.max(1, Math.round(boxW));
  var h = Math.max(1, Math.round(boxH));
  var c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, w, h);
  var iw = sourceImg && sourceImg.naturalWidth;
  var ih = sourceImg && sourceImg.naturalHeight;
  if (!iw || !ih) return c;
  zoom = zoom && zoom > 0 ? zoom : 1;
  posX = isNaN(posX) ? 50 : posX;
  posY = isNaN(posY) ? 50 : posY;
  var cover = Math.max(w / iw, h / ih) * zoom;
  var dw = iw * cover;
  var dh = ih * cover;
  var dx = (w - dw) * (posX / 100);
  var dy = (h - dh) * (posY / 100);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImg, dx, dy, dw, dh);
  return c;
}

function flattenCaptureInsets(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[style]').forEach(function(el) {
    var s = el.getAttribute('style') || '';
    if (/inset\s*:\s*0/.test(s)) {
      el.style.top = '0px';
      el.style.right = '0px';
      el.style.bottom = '0px';
      el.style.left = '0px';
    }
  });
}

async function captureStudioCardCanvas(card) {
  var h2c = (typeof html2canvas === 'function') ? html2canvas : (typeof window !== 'undefined' ? window.html2canvas : null);
  if (typeof h2c !== 'function') {
    if (typeof showToast === 'function') showToast('이미지 처리 엔진을 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'warn');
    throw new Error('html2canvas not loaded');
  }
  var source = resolveStudioCardEl(card);
  if (!source) throw new Error('no studio card');
  var rect = source.getBoundingClientRect();
  var capW = Math.max(280, Math.round(rect.width || 340));
  var capH = Math.max(280, Math.round(rect.height || (capW / 0.75)));
  var exportSize = getStudioExportSize(capW, capH);
  var exportScale = (capW > 0) ? (exportSize.width / capW) : 3;
  if (!isFinite(exportScale) || exportScale < 1) exportScale = 1;
  var paintedUrls = [];
  var host = document.createElement('div');
  host.style.cssText = 'position:fixed; left:0; top:0; width:' + capW + 'px; height:' + capH + 'px; overflow:hidden; opacity:0.01; z-index:2147483000; pointer-events:none; background:#000000;';
  var clone = source.cloneNode(true);
  clone.querySelectorAll('label[for="shareCardPhotoInput"], label[for="studioPhotoUpload"], #readyShotEmptyPhotoHit, input[type="file"]').forEach(function(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  clone.style.width = capW + 'px';
  clone.style.height = capH + 'px';
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.aspectRatio = String(capW) + ' / ' + String(capH);
  clone.style.margin = '0';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';
  clone.style.overflow = 'hidden';
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    flattenCaptureInsets(clone);
    var liveImgs = source.querySelectorAll('img');
    var cloneImgs = clone.querySelectorAll('img');
    await Promise.all(Array.prototype.map.call(cloneImgs, function(img, idx) {
      var src = img.getAttribute('src') || img.currentSrc || '';
      var isLogo = src.toLowerCase().indexOf('logo') !== -1;
      if (isLogo) return Promise.resolve();
      var live = liveImgs[idx];
      var parent = img.parentElement;
      var box = parent ? parent.getBoundingClientRect() : img.getBoundingClientRect();
      var fit = readPhotoFit(live || img);
      var applyFitted = function(loaded) {
        if (!loaded || !loaded.naturalWidth) return Promise.resolve();
        var paintW = Math.max(1, Math.round((box.width || capW) * exportScale));
        var paintH = Math.max(1, Math.round((box.height || capH) * exportScale));
        var painted = paintPhotoKeepRatio(loaded, paintW, paintH, fit.posX, fit.posY, fit.scale);
        if (parent && box.width >= 40 && box.height >= 40) {
          parent.style.width = Math.round(box.width) + 'px';
          parent.style.height = Math.round(box.height) + 'px';
          parent.style.minHeight = Math.round(box.height) + 'px';
          parent.style.flex = 'none';
          parent.style.position = parent.style.position || 'relative';
          parent.style.overflow = 'hidden';
        }
        img.style.position = 'absolute';
        img.style.top = '0px';
        img.style.right = '0px';
        img.style.bottom = '0px';
        img.style.left = '0px';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'fill';
        img.style.transform = 'none';
        img.style.display = 'block';
        img.removeAttribute('crossorigin');
        return new Promise(function(resolvePaint) {
          var finish = function(url) {
            img.onload = function() { resolvePaint(); };
            img.onerror = function() { resolvePaint(); };
            img.src = url;
            setTimeout(resolvePaint, 900);
          };
          painted.toBlob(function(b) {
            if (b) {
              var u = URL.createObjectURL(b);
              paintedUrls.push(u);
              finish(u);
              return;
            }
            finish(painted.toDataURL('image/png'));
          }, 'image/png');
        });
      };
      if (src.indexOf('https://') === 0 || src.indexOf('http://') === 0) {
        return loadCorsImage(src).then(applyFitted);
      }
      if (live && live.naturalWidth) return applyFitted(live);
      return Promise.resolve();
    }));
    await Promise.all(Array.prototype.map.call(cloneImgs, function(img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise(function(res) {
        img.onload = function() { res(); };
        img.onerror = function() { res(); };
        setTimeout(res, 800);
      });
    }));
    await new Promise(function(res) { requestAnimationFrame(function() { requestAnimationFrame(res); }); });
    var scale = exportScale;
    if (scale > 4) scale = 4;
    if (scale < 2) scale = 2;
    var canvas = await h2c(clone, {
      backgroundColor: '#000000',
      scale: scale,
      width: capW,
      height: capH,
      windowWidth: capW,
      windowHeight: capH,
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0
    });
    if (canvas.width === exportSize.width && canvas.height === exportSize.height) return canvas;
    if (canvas.width > exportSize.width || canvas.height > exportSize.height) {
      var out = document.createElement('canvas');
      out.width = exportSize.width;
      out.height = exportSize.height;
      var ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, out.width, out.height);
      return out;
    }
    return canvas;
  } finally {
    paintedUrls.forEach(function(u) {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

async function captureReadyShotShareCanvas() {
  var container = document.getElementById('packShareCaptureArea');
  if (!container) throw new Error('no pack share capture area');
  return captureStudioCardCanvas(container);
}

function canvasToShareBlob(canvas) {
  return new Promise(function(resolve, reject) {
    canvas.toBlob(function(b) { b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/jpeg', 0.92);
  });
}
function canvasToPngBlob(canvas) {
  return canvasToShareBlob(canvas);
}

function downloadReadyShotBlob(blob, fileName) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  var ext = (blob && blob.type === 'image/png') ? '.png' : '.jpg';
  link.download = fileName || ('낭만루트_레디샷_' + Date.now() + ext);
  link.href = url;
  link.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 2500);
}

async function uploadReadyShotBlob(blob) {
  var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';
  var isPng = blob && blob.type === 'image/png';
  var safeFileName = 'ready_share_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + (isPng ? '.png' : '.jpg');
  var cfRes = await fetch(CF_WORKER_UPLOAD_URL + '?file=' + encodeURIComponent(safeFileName), {
    method: 'POST',
    headers: { 'Content-Type': isPng ? 'image/png' : 'image/jpeg' },
    body: blob
  });
  if (!cfRes.ok) throw new Error('upload failed');
  var cfData = await cfRes.json();
  if (!(cfData && cfData.status === 'SUCCESS' && cfData.url && String(cfData.url).indexOf('https://') === 0)) {
    throw new Error('upload invalid');
  }
  return cfData.url;
}

function closeReadyShotShareSheet() {
  var sheet = document.getElementById('readyShotShareSheet');
  if (sheet) sheet.style.setProperty('display', 'none', 'important');
}

function positionReadyShotSharePanel(sheet) {
  if (!sheet) return;
  var panel = sheet.querySelector('[data-share-panel]');
  var anchor = document.getElementById('btnShareCardShareTop');
  if (!panel) return;
  panel.style.position = 'fixed';
  panel.style.zIndex = '2';
  panel.style.width = 'auto';
  panel.style.maxWidth = '220px';
  panel.style.minWidth = '196px';
  if (!anchor) {
    panel.style.left = '50%';
    panel.style.top = '50%';
    panel.style.transform = 'translate(-50%, -50%)';
    return;
  }
  var rect = anchor.getBoundingClientRect();
  var panelW = 196;
  var left = Math.round(rect.right - panelW);
  var top = Math.round(rect.bottom + 6);
  var pad = 10;
  var vw = window.innerWidth || document.documentElement.clientWidth || 360;
  var vh = window.innerHeight || document.documentElement.clientHeight || 640;
  if (left < pad) left = pad;
  if (left + panelW > vw - pad) left = Math.max(pad, vw - pad - panelW);
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.style.transform = 'none';
  panel.style.visibility = 'hidden';
  panel.style.display = 'block';
  var ph = panel.offsetHeight || 120;
  if (top + ph > vh - pad) {
    top = Math.max(pad, Math.round(rect.top - ph - 6));
    panel.style.top = top + 'px';
  }
  panel.style.visibility = 'visible';
}

function openInstagramApp() {
  var ua = navigator.userAgent || '';
  var isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  if (!isMobile) {
    try { window.open('https://www.instagram.com/', '_blank', 'noopener'); } catch (e) {}
    return;
  }
  var opened = false;
  try {
    var link = document.createElement('a');
    link.href = 'instagram://app';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) link.parentNode.removeChild(link);
    opened = true;
  } catch (e1) {}
  if (!opened) {
    try { window.location.href = 'instagram://app'; } catch (e2) {}
  }
  if (/Android/i.test(ua)) {
    setTimeout(function() {
      try {
        window.location.href = 'intent://instagram.com/#Intent;scheme=https;package=com.instagram.android;end';
      } catch (e3) {}
    }, 450);
  }
}

function ensureReadyShotShareSheetDOM() {
  var existing = document.getElementById('readyShotShareSheet');
  if (existing) existing.remove();
  var sheet = document.createElement('div');
  sheet.id = 'readyShotShareSheet';
  sheet.style.cssText = 'display:none; position:fixed; inset:0; z-index:2147483600 !important; background:transparent; box-sizing:border-box;';
  var cellBtn =
    'flex:1; min-width:0; height:58px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#e2e8f0; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:6px 4px; box-sizing:border-box;';
  sheet.innerHTML =
    '<div data-share-act="close" style="position:absolute; inset:0;"></div>' +
    '<div data-share-panel style="background:#0c1017; border:1px solid rgba(255,255,255,0.14); border-radius:12px; padding:10px; box-sizing:border-box; box-shadow:0 10px 28px rgba(0,0,0,0.55);">' +
      '<div style="text-align:left; font-size:0.72rem; font-weight:900; color:#94a3b8; margin-bottom:8px; letter-spacing:0.2px;">공유</div>' +
      '<div style="display:flex; gap:6px; width:100%;">' +
        '<button type="button" data-share-act="instagram" style="' + cellBtn + '">' +
          '<svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
          '<span style="font-size:0.62rem; font-weight:800; color:#cbd5e1;">인스타</span>' +
        '</button>' +
        '<button type="button" data-share-act="kakao" style="' + cellBtn + '">' +
          '<svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:#e2e8f0;"><path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.33 4.66 6.73-.15.55-.95 3.45-.98 3.69 0 0-.2.13.01.25.08.05.18.01.18.01.24-.03 3.94-2.6 4.56-3.02.5.07 1.02.11 1.57.11 5.52 0 10-3.58 10-8S17.52 3 12 3z"/></svg>' +
          '<span style="font-size:0.62rem; font-weight:800; color:#cbd5e1;">카카오</span>' +
        '</button>' +
        '<button type="button" data-share-act="save" style="' + cellBtn + '">' +
          '<svg viewBox="0 0 24 24" style="width:18px; height:18px;" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
          '<span style="font-size:0.62rem; font-weight:800; color:#cbd5e1;">저장</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  sheet.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-share-act]') : null;
    var act = btn ? btn.getAttribute('data-share-act') : null;
    if (!act) return;
    if (act === 'close') {
      closeReadyShotShareSheet();
      return;
    }
    if (typeof window.handleReadyShotShareAction === 'function') window.handleReadyShotShareAction(act);
  });
  document.body.appendChild(sheet);
  return sheet;
}

window.closeReadyShotShareSheet = closeReadyShotShareSheet;

window.openReadyShotShareSheet = function(blob) {
  window.__readyShotShareBlob = blob;
  var sheet = ensureReadyShotShareSheetDOM();
  sheet.style.setProperty('display', 'block', 'important');
  positionReadyShotSharePanel(sheet);
};

window.handleReadyShotShareAction = async function(act) {
  var blob = window.__readyShotShareBlob;
  if (!blob) {
    if (typeof showToast === 'function') showToast('공유할 이미지가 없습니다.', 'warn');
    return;
  }
  var ext = (blob && blob.type === 'image/png') ? '.png' : '.jpg';
  var fileName = '낭만루트_레디샷_' + Date.now() + ext;
  closeReadyShotShareSheet();

  try {
    if (act === 'save') {
      downloadReadyShotBlob(blob, fileName);
      if (typeof showToast === 'function') showToast('사진이 입혀진 레디샷이 저장되었습니다.', 'success', 2200);
      return;
    }

    if (act === 'instagram') {
      openInstagramApp();
      downloadReadyShotBlob(blob, fileName);
      if (typeof showToast === 'function') showToast('이미지를 저장했습니다. 인스타를 엽니다.', 'success', 2200);
      return;
    }

    if (act === 'kakao') {
      if (typeof showToast === 'function') showToast('카카오 공유 이미지를 준비 중입니다...', 'info', 1600);
      var imageUrl = await uploadReadyShotBlob(blob);
      var rec = window.currentShareRecord || {};
      var title = '낭만루트 READY SHOT';
      var desc = String(rec.spot || rec.oneLineMemo || '패킹 카드').slice(0, 80);
      var sendKakao = function() {
        if (typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized()) {
          var shareFn = (Kakao.Share && Kakao.Share.sendDefault) ? Kakao.Share.sendDefault : (Kakao.Link && Kakao.Link.sendDefault ? Kakao.Link.sendDefault : null);
          if (shareFn) {
            shareFn({
              objectType: 'feed',
              content: {
                title: title,
                description: desc,
                imageUrl: imageUrl,
                imageWidth: 1080,
                imageHeight: 1440,
                link: { mobileWebUrl: location.href, webUrl: location.href }
              },
              buttons: [
                { title: '앱에서 보기', link: { mobileWebUrl: location.href, webUrl: location.href } }
              ],
              installTalk: true
            });
            return true;
          }
        }
        return false;
      };
      if (typeof window.okbmEnsureKakaoSdk === 'function') {
        try { await window.okbmEnsureKakaoSdk(); } catch (eKakao) {}
      }
      if (sendKakao()) return;
      downloadReadyShotBlob(blob, fileName);
      if (typeof showToast === 'function') showToast('카카오 공유를 열 수 없어 이미지를 저장했습니다.', 'warn', 2200);
    }
  } catch (err) {
    console.warn('[templates.js:handleReadyShotShareAction]', err);
    if (typeof showToast === 'function') showToast('공유 중 오류가 발생했습니다.', 'warn');
  }
};

window.saveStudioCardToPhone = async function() {
  var card = document.getElementById('photoStudioCardTarget');
  var h2c = (typeof html2canvas === 'function') ? html2canvas : (typeof window !== 'undefined' ? window.html2canvas : null);
  if (!card || typeof h2c !== 'function') {
    if (typeof showToast === 'function') showToast('이미지 처리 엔진을 불러오는 중입니다. 잠시 후 다시 시도해주세요.', 'warn');
    return;
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(15);

  var btn = document.getElementById('btnStudioSaveCard');
  var prevHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
    btn.innerHTML = '<span style="width:11px; height:11px; border:2px solid rgba(255,255,255,0.3); border-top-color:#ffffff; border-radius:50%; display:inline-block; animation:tmplSpin 0.7s linear infinite;"></span><span>저장 중...</span>';
  }
  if (typeof showToast === 'function') showToast('⏳ 인스타 공유용 고화질 레디샷 카드를 저장 중입니다...', 'info', 1800);

  try {
    var canvas = await captureStudioCardCanvas(card);
    var blob = await canvasToShareBlob(canvas);
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.download = '낭만루트_레디샷_' + Date.now() + '.jpg';
    link.href = url;
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 2500);
    if (typeof showToast === 'function') showToast('📸 인스타 공유용 고화질 레디샷이 저장되었습니다!', 'success', 2400);
  } catch (e) {
    console.error('saveStudioCardToPhone error:', e);
    if (typeof showToast === 'function') showToast('저장 중 오류가 발생했습니다.', 'warn');
  } finally {
    if (btn) {
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      btn.innerHTML = prevHtml;
    }
  }
};

window.updateStudioCardLive = function() {
  var container = document.getElementById('photoStudioCardTarget');
  if (!container || !window.currentSharePhoto) return;

  var memoInput = document.getElementById('shareCardMemoInput');

  var rawSpot = (window.currentShareRecord && window.currentShareRecord.spot)
    ? String(window.currentShareRecord.spot).trim()
    : '';
  var spotVal = (rawSpot && rawSpot !== '나의 힐링 스팟') ? rawSpot : '';
  var spotDisplay = spotVal || '나의 힐링 스팟';
  var memoVal = (memoInput && memoInput.value.trim()) ? memoInput.value.trim() : (window.currentShareRecord && window.currentShareRecord.oneLineMemo ? window.currentShareRecord.oneLineMemo : '');

  var now = new Date();
  var dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
  if (window.currentShareRecord && window.currentShareRecord.date) {
    dateStr = window.currentShareRecord.date;
  }

  var items = (Array.isArray(window.currentShareItems) && window.currentShareItems.length > 0) ? window.currentShareItems : (window.currentShareRecord ? (window.currentShareRecord.items || []) : []);
  if (items.length === 0 && window.selectedGearMap) {
    Object.keys(window.selectedGearMap).forEach(function(cId) {
      (window.selectedGearMap[cId] || []).forEach(function(it) {
        if (it && (it.name || it.itemName)) {
          items.push({ name: it.name || it.itemName, weight: Number(it.weight || it.weight_g || 0), categoryId: cId, brand: it.brand || '' });
        }
      });
    });
  }
  var totalCount = items.length > 0 ? items.length : 18;
  var totalGrams = items.reduce(function(sum, g) { return sum + Number(g.weight || 0); }, 0);
  var weightKg = (totalGrams > 0) ? (totalGrams / 1000).toFixed(2) : (window.currentShareRecord ? (window.currentShareRecord.weightKg || '12.89') : '12.89');

  var svgWhitePin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; display:inline-block; vertical-align:-1px; margin-right:4px; opacity:0.9;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  var svgShield = '<svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; display:inline-block; vertical-align:-1px; margin-right:3px; flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';
  var svgDot = '<span style="display:inline-block; width:3px; height:3px; background:#94a3b8; border-radius:50%; margin-right:3px; vertical-align:middle; flex-shrink:0;"></span>';

  var mode = window.currentStudioCardMode || 'minimal';
  var cardRatioCss = getStudioCardBoxCss();

  var posX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
  var posY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
  var scale = currentPhotoScaleVal || 1.0;

  var brandSvgWhite = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#ffffff', '#ffffff') : '';
  var brandSvgDark = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#0f172a', '#475569') : '';

  if (mode === 'minimal') {
    var minimalMemoLive = readyShotOneLineMemo(memoVal);
    container.innerHTML = `
      <div style="position:relative; ${cardRatioCss} overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img id="photoStudioBgImage" src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        
        <!-- 상단 헤더 (위치 및 일자) -->
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:12px 14px 24px 14px; background:linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:70%; min-width:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.68rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(spotDisplay || 'COLLECTION')}</span>
          </div>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.54rem; font-weight:700; color:#cbd5e1; letter-spacing:0.8px; flex-shrink:0; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(dateStr)}</span>
        </div>

        <!-- 하단 바 (한줄메모 → 아이템줄) -->
        <div style="position:relative; z-index:10; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-end; padding:24px 14px 12px 14px; background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%); box-sizing:border-box; gap:6px;">
          ${minimalMemoLive ? '<div style="text-align:center; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.62rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.9);">' + escapeHtml(minimalMemoLive) + '</div>' : ''}
          <div style="display:flex; align-items:flex-end; justify-content:space-between;">
          <div style="flex:1; min-width:0;"></div>
          <div style="flex-shrink:0; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Space Grotesk', sans-serif; font-size:0.64rem; font-weight:900; color:#ffffff; letter-spacing:0.8px; text-shadow:0 2px 6px rgba(0,0,0,0.95);">
            <span>${totalCount} ITEMS</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.76rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.55rem; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:#6ee7b7; font-weight:800;">LNT</span>
          </div>
          <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center;">
            ${renderIssueStyleBrandMark()}
          </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (mode === 'sage') {
    var maxDisplay = 14;
    var displayedItems = items.slice(0, maxDisplay);
    var remainingCount = items.length - maxDisplay;

    var sageGears = displayedItems.map(function(it) {
      var rawN = (typeof it === 'string') ? it : (it.name || '');
      var cName = rawN.replace(/\s*\(\d+g\)$/, '');
      var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
      var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; min-width:0; box-sizing:border-box; line-height:1.2;">
          <span style="font-size:0.62rem; font-weight:700; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-shadow:0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8); display:flex; align-items:center;">
            <span style="display:inline-block; width:3px; height:3px; background:#ffffff; border-radius:50%; margin-right:4px; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.8);"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:800; color:#ffffff; flex-shrink:0; margin-left:6px; text-shadow:0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8);">${wStr}</span>
        </div>
      `;
    }).join('');

    if (remainingCount > 0) {
      sageGears += `
        <div style="display:flex; align-items:center; font-size:0.56rem; font-weight:800; color:#e2e8f0; text-shadow:0 1px 3px rgba(0,0,0,0.9); line-height:1.2;">
          <span>+외 ${remainingCount}개 장비</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="position:relative; ${cardRatioCss} overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img id="photoStudioBgImage" src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        <div style="position:absolute; inset:0; z-index:3; pointer-events:none; display:grid; grid-template-columns:1fr 1fr 1fr; grid-template-rows:1fr 1fr 1fr; opacity:0.65;">
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4);"></div>
          <div></div>
        </div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:44px; height:44px; border:1px solid rgba(255,255,255,0.85); z-index:4; pointer-events:none;">
          <div style="position:absolute; top:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; left:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
          <div style="position:absolute; right:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
        </div>
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:10px 12px 4px 12px; box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center;">
            ${renderIssueStyleBrandMark()}
          </div>
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:55%; min-width:0; font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.58rem; font-weight:700; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.9);">
            ${readyShotOneLineMemo(memoVal) ? '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.6); padding:1px 6px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.8);">' + escapeHtml(readyShotOneLineMemo(memoVal)) + '</span>' : ''}
          </div>
        </div>
        <div style="position:relative; z-index:10; width:100%; padding:0 10px; box-sizing:border-box; margin-top:auto; margin-bottom:2px; display:flex; flex-direction:column; justify-content:flex-end;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:inline-flex; align-items:center; gap:3px; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" style="width:11px; height:11px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.72rem; font-weight:900; color:#ffffff;">${escapeHtml(spotDisplay)}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:4px; font-family:'Space Grotesk', sans-serif; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
              <span style="font-size:0.78rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
              <span style="font-size:0.5rem; color:rgba(255,255,255,0.7);">|</span>
              <span style="font-size:0.60rem; font-weight:800; color:#cbd5e1;">${escapeHtml(dateStr)}</span>
            </div>
          </div>
          <div style="background:transparent; border:none; padding:0; display:grid; grid-template-columns:1fr 1fr; column-gap:12px; row-gap:4px; box-sizing:border-box;">
            ${sageGears}
          </div>
        </div>
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:2px 12px 8px 12px; font-family:'Space Grotesk', sans-serif; font-size:0.55rem; font-weight:800; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.9);">
          <span>3:4 FRAME</span>
          <div style="display:inline-flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block; box-shadow:0 0 3px #000;"></span>
            <span style="color:#ffffff; font-weight:900;">PACKING COMPLETE</span>
          </div>
          <span>LNT · BPL</span>
        </div>
      </div>
    `;
    return;
  }

  if (mode === 'chic') {
    var chicMemoLive = readyShotOneLineMemo(memoVal);
    container.innerHTML = `
      <div style="position:relative; ${cardRatioCss} overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#000000;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#000000; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.3); padding:9px 9px 12px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; border:1px solid rgba(255,255,255,0.22);">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:0 2px 5px 2px; box-sizing:border-box; margin-bottom:6px; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.15);">
            <div style="display:flex; align-items:center; gap:4px; max-width:65%; min-width:0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:10px; height:10px; flex-shrink:0; opacity:0.85;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.56rem; font-weight:800; color:#ffffff; letter-spacing:0.4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal || 'COLLECTION')}</span>
            </div>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.8px; flex-shrink:0;">${escapeHtml(dateStr)}</span>
          </div>
          <div class="rs-photo-host" style="width:100%; aspect-ratio:4/3; border-radius:4px; overflow:hidden; background:#000; box-shadow:0 4px 14px rgba(0,0,0,0.6); flex-shrink:0; position:relative;">
            <img id="photoStudioBgImage" src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; min-height:0; box-sizing:border-box;">
            <div style="display:flex; justify-content:center; align-items:center; gap:6px; font-family:'Space Grotesk', sans-serif; letter-spacing:0.6px;">
              <span style="color:#ffffff; font-weight:800; font-size:0.74rem;">${totalCount} ITEMS</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.86rem;">${weightKg} KG</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#e2e8f0; font-weight:800; font-size:0.55rem; padding:1px 4px; border-radius:3px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);">LNT</span>
            </div>
            <div style="position:absolute; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="flex:1; min-width:0; font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.85); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${chicMemoLive ? escapeHtml(chicMemoLive) : ''}</span>
              <div style="display:flex; align-items:center; flex-shrink:0;">
                ${renderIssueStyleBrandMark()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (mode === 'essay') {
    var essayMemoLive = readyShotOneLineMemo(memoVal) || '그럼에도 불구하고 자연에서 하루를 찾는다';
    var memoLines = essayMemoLive.split('\n').map(function(line) {
      return `<div style="margin:1px 0;">${escapeHtml(line)}</div>`;
    }).join('');

    var essayGearRows = items.slice(0, 12).map(function(it) {
      var rawN = (typeof it === 'string') ? it : (it.name || '');
      var cName = rawN.replace(/\s*\(\d+g\)$/, '');
      var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
      var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; line-height:1.2; min-width:0; box-sizing:border-box;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:600; color:#334155; display:flex; align-items:center;">
            ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-weight:700; color:#1e293b; flex-shrink:0; font-size:0.92em; margin-left:2px;">${wStr}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="position:relative; ${cardRatioCss} overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#07090e;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:absolute; inset:14px; border:1px solid rgba(255,255,255,0.35); pointer-events:none; z-index:2; border-radius:2px;"></div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#fdfcf9; border-radius:6px; box-shadow:0 18px 45px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4); padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1c1917;">
          <div style="flex:1 1 0%; min-height:0; width:100%; border-radius:4px; overflow:hidden; background:#000; box-shadow:inset 0 0 4px rgba(0,0,0,0.3); margin-bottom:6px;">
            <img id="photoStudioBgImage" src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px;">
            <div style="text-align:center; padding:0 2px;">
              <div style="font-family:'Gowun Batang', 'Noto Serif KR', serif; font-size:0.68rem; font-weight:700; color:#1c1917; line-height:1.35; letter-spacing:-0.2px; word-break:keep-all;">
                ${memoLines}
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; column-gap:8px; row-gap:3px !important; align-content:start !important; width:100%; box-sizing:border-box; padding:4px 0 2px 0; border-top:1px dashed #d6cfc4;">
              ${essayGearRows}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #d6cfc4; padding-top:3px; font-size:0.46rem; color:#78716c; font-family:'Pretendard Variable', -apple-system, sans-serif;">
              <div style="display:flex; align-items:center; gap:4px;">
                ${renderIssueStyleBrandMark()}
                <span>·</span>
                <span style="font-family:'Space Grotesk', sans-serif;">${escapeHtml(dateStr)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-weight:800; color:#1e293b;">${weightKg}kg</span>
                <span>·</span>
                <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center;">
                  ${svgShield}<span>LNT</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (mode === 'nrc') {
    container.innerHTML = renderNrcCertShotMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      items: items,
      brand: brandSvgWhite,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'overlay') {
    container.innerHTML = renderPhotoOverlayMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      itemCount: items.length,
      items: items,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'editorial') {
    container.innerHTML = renderEditorialOverlayMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      itemCount: items.length,
      items: items,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'balance') {
    container.innerHTML = renderBalanceMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      itemCount: items.length,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'kuchi') {
    container.innerHTML = renderKuchiMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      itemCount: items.length,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'issue') {
    container.innerHTML = renderIssueMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      itemCount: items.length,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'spread') {
    container.innerHTML = renderSpreadMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotDisplay,
      date: dateStr,
      weightKg: weightKg,
      items: items,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  if (mode === 'magazine') {
    container.innerHTML = renderMagazineCoverMarkup({
      photo: window.currentSharePhoto,
      imgId: 'photoStudioBgImage',
      posX: posX,
      posY: posY,
      scale: scale,
      weightKg: weightKg,
      itemCount: items.length,
      memo: memoVal,
      wrapCss: cardRatioCss
    });
    return;
  }

  var isTwoCol = items.length >= 8;
  var fontSize = items.length >= 18 ? '0.48rem' : (items.length >= 12 ? '0.52rem' : '0.56rem');

  var gearRows = items.slice(0, 16).map(function(it) {
    var rawN = (typeof it === 'string') ? it : (it.name || '');
    var cName = rawN.replace(/\s*\(\d+g\)$/, '');
    var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
    var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:${fontSize}; line-height:1.2; padding:0; gap:2px; min-width:0; box-sizing:border-box;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:700; color:#1e293b; display:flex; align-items:center;">
          ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
        </span>
        <span style="font-family:'Space Grotesk', sans-serif; font-weight:800; color:#334155; flex-shrink:0; font-size:0.92em; letter-spacing:-0.2px;">${wStr}</span>
      </div>
    `;
  }).join('');

  if (items.length > 16) {
    gearRows += `
      <div style="display:flex; align-items:center; font-size:0.50rem; font-weight:800; color:#64748b; line-height:1.2;">
        <span>+외 ${items.length - 16}개 장비</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="${cardRatioCss} background:#fbfaf7; box-shadow:0 16px 36px rgba(0,0,0,0.85); border-radius:10px; padding:7px 7px 8px 7px; display:flex; flex-direction:column; justify-content:space-between; gap:6px; box-sizing:border-box; color:#1e293b; font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;">
      <div style="position:relative; width:100%; flex:1 1 0%; min-height:100px; border-radius:6px; overflow:hidden; background:#000; box-shadow:inset 0 0 3px rgba(0,0,0,0.3);">
        <img id="photoStudioBgImage" src="${escapeHtml(okbmSafeImageUrl(window.currentSharePhoto))}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; pointer-events:none;" />
      </div>
      <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px; width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
          <div style="font-size:0.82rem; font-weight:900; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; display:flex; align-items:center;">
            ${SVG_ICONS.pin}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotDisplay)}</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:4px; flex-shrink:0; margin-left:6px;">
            <span style="font-size:0.46rem; font-weight:800; color:#64748b;">PACKING</span>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:1.02rem; font-weight:900; color:#0f172a; line-height:1;">${weightKg}kg</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:${isTwoCol ? '1fr 1fr' : '1fr'}; column-gap:8px; row-gap:4px; width:100%; box-sizing:border-box; padding:2px 0 1px 0;">
          ${gearRows}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:3px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${renderIssueStyleBrandMark()}
            <span style="font-family:'Space Grotesk', sans-serif; font-weight:600; color:#94a3b8; font-size:0.92em;">${escapeHtml(dateStr)}</span>
          </div>
          <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center;">
            ${svgShield}<span>LNT를 꼭 지킵니다.</span>
          </span>
        </div>
      </div>
    </div>
  `;
};

// 🎨 [템플릿 칩 바 전용 스타일시트 자동 주입 - map.html 등 외부 화면 깨짐 100% 방어]
if (!document.getElementById('template-chips-core-style')) {
  var chipStyle = document.createElement('style');
  chipStyle.id = 'template-chips-core-style';
  chipStyle.innerHTML = `
    .template-selector-bar {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      gap: 5px !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 4px 2px 6px 2px !important;
      scrollbar-width: none !important;
      flex-shrink: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .template-selector-bar::-webkit-scrollbar { display: none !important; }

    .tmpl-chip-btn {
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.16) !important;
      color: #cbd5e1 !important;
      font-size: 0.70rem !important;
      font-weight: 800 !important;
      padding: 5px 10px !important;
      border-radius: 16px !important;
      white-space: nowrap !important;
      word-break: keep-all !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px !important;
      flex-shrink: 0 !important;
      box-sizing: border-box !important;
      user-select: none !important;
      height: 28px !important;
      line-height: 1 !important;
    }
    .tmpl-chip-btn.active {
      background: #ffffff !important;
      color: #000000 !important;
      border-color: #ffffff !important;
      font-weight: 900 !important;
      box-shadow: 0 2px 8px rgba(255, 255, 255, 0.3) !important;
    }

    .ready-shot-family-toggle {
      display: flex !important;
      width: 100% !important;
      gap: 4px !important;
      padding: 3px !important;
      background: rgba(255, 255, 255, 0.06) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 10px !important;
      box-sizing: border-box !important;
    }
    .ready-shot-family-btn {
      flex: 1 !important;
      height: 30px !important;
      border: none !important;
      border-radius: 8px !important;
      background: transparent !important;
      color: #94a3b8 !important;
      font-size: 0.74rem !important;
      font-weight: 800 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
    }
    .ready-shot-family-btn.active {
      background: #ffffff !important;
      color: #000000 !important;
      font-weight: 900 !important;
      box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2) !important;
    }
  `;
  document.head.appendChild(chipStyle);
}

(function removeReadyShotDockHideStyle() {
  var old = document.getElementById('ready-shot-dock-hide-style');
  if (old) old.remove();
})();

var TEMPLATE_ORDER = [1, 8, 2, 18, 14, 6];
var TEMPLATE_NAMES = {
  1: '🧾 영수증',
  8: '☁️ 솜사탕',
  2: '🎫 보딩패스',
  18: '🍋 레몬버터',
  14: '🏷️ 다꾸스티커',
  6: '📸 코닥 슬라이드'
};

var STUDIO_MODE_ORDER = ['balance', 'kuchi', 'issue', 'spread', 'magazine', 'overlay', 'minimal', 'chic', 'essay', 'sage', 'editorial'];
var STUDIO_MODE_NAMES = {
  balance: '발란스',
  kuchi: '쿠치',
  issue: '이슈',
  spread: '스프레드',
  magazine: '매거진',
  overlay: '저널',
  minimal: '미니멀',
  chic: '시크',
  essay: '에세이',
  sage: '내추럴',
  editorial: '에디토리얼'
};

function normalizeReadyShotMode(mode) {
  var m = String(mode || '').trim();
  if (m === 'nrc') return 'overlay';
  if (m === 'packing') return 'magazine';
  return m;
}
window.normalizeReadyShotMode = normalizeReadyShotMode;

window.recordUsesPhotoTemplate = function(record) {
  var mode = normalizeReadyShotMode(record && (record.readyShotMode || record.ready_shot_mode));
  if (!mode || mode === 'pamphlet') return false;
  if (STUDIO_MODE_ORDER.indexOf(mode) === -1) return false;
  if (mode === 'minimal') {
    var photo = String((record && (record.readyShotPhoto || record.ready_shot_photo)) || '').trim();
    return photo.indexOf('https://') === 0;
  }
  return true;
};

var READY_SHOT_PLACEHOLDER_PHOTO = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#111111"/></svg>'
);

window.readyShotFamily = window.readyShotFamily || 'photo';
window.currentStudioCardMode = window.currentStudioCardMode || 'spread';
window.selectedTemplateId = (typeof window.selectedTemplateId === 'number')
  ? window.selectedTemplateId
  : parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
var selectedTemplateId = window.selectedTemplateId;

function isReadyShotSessionBlob(url) {
  var raw = String(url || '').trim();
  if (raw.indexOf('blob:') !== 0) return false;
  return raw === window.__readyShotPreviewBlobUrl
    || raw === window.currentSharePhoto
    || raw === window.currentSharePhotoRaw;
}

function resolveReadyShotPhotoUrl() {
  var rec = (window.currentShareRecord && typeof window.currentShareRecord.then !== 'function')
    ? window.currentShareRecord
    : {};
  var candidates = [
    window.currentSharePhotoRaw,
    window.currentSharePhoto,
    rec.readyShotPhoto,
    rec.ready_shot_photo
  ];
  for (var i = 0; i < candidates.length; i++) {
    var url = String(candidates[i] || '').trim();
    if (url.indexOf('https://') === 0) return url;
  }
  return '';
}
window.resolveReadyShotPhotoUrl = resolveReadyShotPhotoUrl;

function resolveReadyShotDisplayUrl() {
  var previewCandidates = [
    window.__readyShotPreviewBlobUrl,
    window.currentSharePhotoRaw,
    window.currentSharePhoto
  ];
  for (var i = 0; i < previewCandidates.length; i++) {
    var url = String(previewCandidates[i] || '').trim();
    if (isReadyShotSessionBlob(url)) return url;
  }
  return resolveReadyShotPhotoUrl();
}
window.resolveReadyShotDisplayUrl = resolveReadyShotDisplayUrl;

function decodeReadyShotImage(url) {
  return new Promise(function(resolve) {
    var src = String(url || '').trim();
    if (!src) {
      resolve(false);
      return;
    }
    var img = new Image();
    var done = function(ok) {
      resolve(!!ok);
    };
    img.onload = function() {
      if (typeof img.decode === 'function') {
        img.decode().then(function() { done(true); }).catch(function() { done(true); });
      } else {
        done(true);
      }
    };
    img.onerror = function() { done(false); };
    img.src = src;
  });
}

function commitReadyShotHttpsUrl(url) {
  var photoUrl = String(url || '').trim();
  if (photoUrl.indexOf('https://') !== 0) return;
  var rec = (window.currentShareRecord && typeof window.currentShareRecord.then !== 'function')
    ? window.currentShareRecord
    : {};
  window.currentShareRecord = rec;
  rec.readyShotPhoto = photoUrl;
  rec.ready_shot_photo = photoUrl;
  rec.readyShotMode = window.currentStudioCardMode || rec.readyShotMode || 'spread';
  rec.readyShotPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : (rec.readyShotPosX !== undefined ? rec.readyShotPosX : 50);
  rec.readyShotPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : (rec.readyShotPosY !== undefined ? rec.readyShotPosY : 50);
  rec.readyShotScale = currentPhotoScaleVal || rec.readyShotScale || 1.0;
  rec.readyShotRatio = '3/4';
  persistReadyShotPhotoNow(photoUrl);
}

function persistReadyShotPhotoNow(url) {
  var photoUrl = String(url || '').trim();
  if (photoUrl.indexOf('https://') !== 0) return;
  var rec = (window.currentShareRecord && typeof window.currentShareRecord.then !== 'function')
    ? window.currentShareRecord
    : {};
  window.currentShareRecord = rec;
  rec.readyShotPhoto = photoUrl;
  rec.ready_shot_photo = photoUrl;
  rec.readyShotMode = window.currentStudioCardMode || rec.readyShotMode || 'spread';
  rec.readyShotPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : (rec.readyShotPosX !== undefined ? rec.readyShotPosX : 50);
  rec.readyShotPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : (rec.readyShotPosY !== undefined ? rec.readyShotPosY : 50);
  rec.readyShotScale = currentPhotoScaleVal || rec.readyShotScale || 1.0;
  rec.readyShotRatio = '3/4';
  if (Array.isArray(window.currentShareItems) && window.currentShareItems.length) {
    rec.items = window.currentShareItems;
  }
  if (window.__isSavingCardLock) return;
  if (typeof window.savePackingHistoryRecord === 'function') {
    window.savePackingHistoryRecord(rec).catch(function(err) {
      console.warn('[templates.js:persistReadyShotPhotoNow]', err);
    });
  }
}
// 🎨 [내장 SVG 아이콘 팩 - 참조 에러 원천 방지]
SVG_ICONS = window.SVG_ICONS || {
  brandLogo: function(color, stroke) {
    var isDarkBg = (!color || color === '#ffffff' || color === '#fff' || color === 'white');
    var shadow = isDarkBg
      ? 'filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));'
      : 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));';
    return '<img src="logo.png" alt="낭만루트 로고" style="width:20px; height:20px; object-fit:contain; display:block; flex-shrink:0; ' + shadow + '" />';
  },
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:11px; height:11px; display:inline-block; vertical-align:-2px; margin-right:3px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px; display:inline-block; vertical-align:-1px; margin-right:3px; flex-shrink:0;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="19" y1="10" y2="10"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:10px; height:10px; display:inline-block; vertical-align:-1px; margin-right:3px; flex-shrink:0; opacity:0.85;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bullet: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:3.5px; height:3.5px; display:inline-block; vertical-align:middle; margin-right:3px; opacity:0.7; flex-shrink:0;"><circle cx="12" cy="12" r="6"/></svg>',
  lntShield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px; display:inline-block; vertical-align:-2px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
};

window.currentOverlayTheme = window.currentOverlayTheme || 'dark';

var OVERLAY_GEAR_ICON_PATHS = {
  tent: '<path d="M12 48.5C12 31 19.5 16.5 32 13.5C44.5 16.5 52 31 52 48.5" stroke-width="2.3"/><path d="M8 48.5H56" stroke-width="2.25"/><path d="M12 48.5L7.5 48.5L11 39.5C12 35.5 16 34.5 18 38" stroke-width="2.15"/><path d="M29 48.5C29 33 38 26.5 45.5 35.5C47.5 39.5 47.5 48.5 47.5 48.5" stroke-width="1.7"/><path d="M38 30C40.2 37 40.2 43.5 37 48.5" stroke-width="1.6"/><path d="M18 48.5C22 32 28 16.5 32 13.5" stroke-width="1.55"/><path d="M20 48.5C24 43.5 40 43.5 44 48.5" stroke-width="1.55"/><path d="M8 48.5L6 53.5" stroke-width="1.6"/><path d="M56 48.5L58 53.5" stroke-width="1.6"/>',
  tarp: '<path d="M8 46L32 14L56 46" stroke-width="2.3"/><path d="M12 46H52" stroke-width="2.2"/><path d="M32 14V52" stroke-width="1.7"/><path d="M20 46L32 28L44 46" stroke-width="1.55"/><path d="M8 46L4 56" stroke-width="1.6"/><path d="M56 46L60 56" stroke-width="1.6"/><path d="M32 52L28 58M32 52L36 58" stroke-width="1.5"/>',
  'sleeping-bag': '<path d="M27 9.5C20.5 9.5 15.5 14.5 15.5 21.5C15.5 25.5 17.5 29 19.5 33L17.5 49C16.5 56 23 59 32 59C43 59 49 55 49 48L47 33C49 29 51 25.5 51 21.5C51 14.5 46 9.5 39.5 9.5C37.2 9.5 35 11.2 32 12.2C29 11.2 26.8 9.5 27 9.5Z" stroke-width="2.3"/><ellipse cx="32" cy="20.5" rx="8" ry="6.2" stroke-width="1.7"/><path d="M29 17.5C30.2 18.8 33.8 18.8 35 17.5" stroke-width="1.5"/><path d="M41.5 26.5L45.5 50" stroke-width="1.7"/><path d="M40 31C43 37 44.2 44 43 50.5" stroke-width="1.5"/><path d="M22 53.5C27.5 51.2 36.5 51.2 42 53.5" stroke-width="1.55"/>',
  mat: '<ellipse cx="19.5" cy="32" rx="10.5" ry="16" stroke-width="2.3"/><ellipse cx="19.5" cy="32" rx="4" ry="6.5" stroke-width="1.6"/><path d="M22 16.2H49.5C53.5 16.2 54.8 19.2 51.8 21.4H24" stroke-width="2.15"/><path d="M22 47.8H49.5C53.5 47.8 54.8 44.8 51.8 42.6H24" stroke-width="2.15"/><path d="M51.8 21.4V42.6" stroke-width="2.05"/><path d="M29.5 21.4V42.6" stroke-width="1.5"/><path d="M37.5 21.4V42.6" stroke-width="1.5"/><path d="M44.8 21.4V42.6" stroke-width="1.5"/><path d="M13 26C25.5 23.5 25.5 40.5 13 38" stroke-width="1.7"/>',
  backpack: '<path d="M22 21H42C45.8 21 47 23 47 26.5V47.5C47 51.8 44 54.5 40 54.5H24C20 54.5 17 51.8 17 47.5V26.5C17 23 18.2 21 22 21Z" stroke-width="2.3"/><path d="M20 22C20 14.5 25.5 11.5 32 11.5C38.5 11.5 44 14.5 44 22" stroke-width="2.2"/><path d="M24 18H40" stroke-width="1.65"/><path d="M24.5 27C17 31 15.5 40 20 51" stroke-width="1.75"/><path d="M39.5 27C47 31 48.5 40 44 51" stroke-width="1.75"/><path d="M14 45.5C11.8 45.8 11 48 12.2 50.2H19" stroke-width="1.8"/><path d="M50 45.5C52.2 45.8 53 48 51.8 50.2H45" stroke-width="1.8"/><path d="M19 48.2H45" stroke-width="1.8"/><path d="M47 30.5C51.2 31.5 51.4 42 47 44" stroke-width="1.65"/><path d="M25.5 34.5H38.5V47.5H25.5Z" stroke-width="1.6"/><path d="M22 32.5H28M36 32.5H42" stroke-width="1.55"/>',
  cooking: '<path d="M16 30.5H48V45C48 51.5 42.5 54.5 32 54.5C21.5 54.5 16 51.5 16 45V30.5Z" stroke-width="2.3"/><path d="M14 30.5H50C50 24 44.5 21.5 32 21.5C19.5 21.5 14 24 14 30.5Z" stroke-width="2.2"/><circle cx="32" cy="21.5" r="2.6" stroke-width="1.7"/><path d="M18.5 31C18.5 15.5 45.5 15.5 45.5 31" stroke-width="1.9"/><path d="M21 38.5H27" stroke-width="1.55"/><path d="M48 34.5C51.5 34.5 53.5 36.5 53.5 39.5C53.5 42.5 51.5 44.5 48 44.5" stroke-width="1.7"/>',
  clothing: '<path d="M26 16C26 9.5 28.8 7 32 7C35.2 7 38 9.5 38 16V18.5" stroke-width="2.2"/><path d="M22 21L16.5 36L14.5 50C14.5 53.8 17.5 56 22 56H42C46.5 56 49.5 53.8 49.5 50L47.5 36L42 21C40 18.8 36.2 17.8 32 17.8C27.8 17.8 24 18.8 22 21Z" stroke-width="2.3"/><path d="M16.5 36H22.5M47.5 36H41.5" stroke-width="1.6"/><path d="M32 20.5V50.5" stroke-width="1.7"/><path d="M21.5 39H29.5V49H21.5Z" stroke-width="1.55"/><path d="M28.5 16.5C29.6 18.2 34.4 18.2 35.5 16.5" stroke-width="1.5"/>',
  food: '<path d="M16.5 20H38.5L41 49C41 53.2 37.2 55.5 29 55.5C20.8 55.5 17 53.2 17 49L16.5 20Z" stroke-width="2.3"/><path d="M18 20V15.5H37V20" stroke-width="1.85"/><path d="M35.5 13L39.5 17.5" stroke-width="1.55"/><rect x="21.5" y="29" width="14" height="11" rx="1.6" stroke-width="1.6"/><path d="M48.5 16.5C51.2 16.5 52.8 18.6 52.8 21.2V32.5C54 34.8 52.2 37.2 49.4 37.2C46.6 37.2 44.8 34.8 46 32.5V21.2C46 18.6 47.6 16.5 48.5 16.5Z" stroke-width="1.9"/><path d="M46.6 16.5H50.4" stroke-width="1.55"/><path d="M47.2 16.5V13.8M48.5 16.5V13.2M49.8 16.5V13.8" stroke-width="1.5"/>',
  other: '<path d="M25 13C16 13 13.5 20.5 13.5 31C13.5 43.5 17.5 51 27 51C35 51 38.5 46 38.5 38.5V25" stroke-width="2.3"/><path d="M25 13C32 13 37.5 16.5 38.5 25" stroke-width="2.15"/><path d="M38.5 24.5C38.5 21.8 36.4 20 33.8 20" stroke-width="1.7"/><rect x="40.5" y="29" width="13.5" height="16.5" rx="2.2" stroke-width="2.1"/><path d="M47.2 29V25.2" stroke-width="1.7"/><circle cx="47.2" cy="37.2" r="3.4" stroke-width="1.65"/><path d="M47.2 32.2V30.8M47.2 43.6V42.2" stroke-width="1.5"/>'
};

function renderOverlayGearIcon(iconId, sizePx) {
  var key = OVERLAY_GEAR_ICON_PATHS[iconId] ? iconId : 'other';
  var size = sizePx || 36;
  return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block; width:' + size + 'px; height:' + size + 'px; flex-shrink:0;">' + OVERLAY_GEAR_ICON_PATHS[key] + '</svg>';
}

function overlayResolveCategoryId(it) {
  if (!it || typeof it !== 'object') return '';
  var direct = it.categoryId || it.category_id || it.category || '';
  if (direct && direct !== 'fav' && direct !== 'all') return String(direct);
  var name = String(it.name || it.itemName || '');
  if (window.selectedGearMap) {
    var cats = Object.keys(window.selectedGearMap);
    for (var i = 0; i < cats.length; i++) {
      var list = window.selectedGearMap[cats[i]] || [];
      for (var j = 0; j < list.length; j++) {
        var g = list[j];
        if (g && (g.name === name || g.itemName === name)) return cats[i];
      }
    }
  }
  return '';
}

function overlayIconIdFromItem(it) {
  var cat = overlayResolveCategoryId(it);
  var name = String((typeof it === 'string') ? it : (it && (it.name || it.itemName)) || '').toLowerCase();
  var isTent = /텐트|tent|shelter|돔텐트|자립/.test(name);
  var isTarp = /실타프|타프|tarp/.test(name) && !isTent;
  var isMat = /매트|패드|pad|mat|tensor|xtherm|neoair/.test(name) && !/침낭|sleeping/.test(name);
  var isBag = /침낭|sleeping|quilt|spark/.test(name);
  if (isTarp) return 'tarp';
  if (isTent || (cat === 'shelter' && !isTarp)) return 'tent';
  if (cat === 'pack' || /배낭|백팩|backpack|pack\b|exos|osprey/.test(name)) return 'backpack';
  if (isMat) return 'mat';
  if (isBag || (cat === 'sleep' && !isMat)) return 'sleeping-bag';
  if (cat === 'kitchen' || /취사|스토브|버너|코펠|stove|pot|windmaster/.test(name)) return 'cooking';
  if (cat === 'wear' || /의류|자켓|재킷|바지|셔츠|jacket|pants|shell/.test(name)) return 'clothing';
  if (cat === 'food' || /식량|음식|라면|햇반|리필|meal|food|pasta/.test(name)) return 'food';
  return 'other';
}

function overlayDisplayName(raw, brand) {
  var src = String(raw || '').replace(/\s*\(\d+\s*g\)\s*$/i, '').trim();
  if (!src) return '';
  var model = src;
  var paren = src.match(/\(([^)]+)\)\s*$/);
  if (paren && /[A-Za-z]/.test(paren[1])) model = paren[1];
  model = model.replace(/^(The North Face|Arc'?teryx|Sea to Summit|NEMO|Osprey|SOTO|Petzl|Mountain Hardwear|Big Agnes|MSR|Hilleberg|Zpacks|Hyperlite|Cumulus|Peak Refuel|REI Co-op|GSI Outdoors|KOMPERDELL)\s+/i, '');
  model = model.replace(/\s*-\s*Men'?s.*$/i, '');
  model = model.replace(/\s+with Footprint.*$/i, '');
  model = model.replace(/\s+GORE-TEX.*$/i, '');
  var tokens = model.split(/\s+/).filter(Boolean);
  var stop = /^(Tent|Sleeping|Bag|Pad|Pack|Headlamp|Stove|Down|Ultralight|Insulated|All-Season|Men'?s|Women'?s|Pair|Poles?|Chair|Table|with|Footprint|SOD-\d+|KP\d+)$/i;
  var kept = [];
  for (var i = 0; i < tokens.length; i++) {
    if (stop.test(tokens[i]) && kept.length) {
      if (/^Jacket$/i.test(tokens[i])) kept.push('Jacket');
      break;
    }
    kept.push(tokens[i]);
    if (kept.length >= 3) break;
  }
  model = kept.join(' ').replace(/\s+/g, ' ').trim();
  var brandKo = overlayBrandKo(brand, src);
  if (brandKo && model.indexOf(brandKo) === 0) {
    model = model.slice(brandKo.length).replace(/^[\s·\-]+/, '').trim();
  }
  return model || src;
}

function overlayBrandKo(brand, raw) {
  var brandKo = '';
  if (brand) {
    brandKo = String(brand).replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (brandKo.length > 8) brandKo = brandKo.split(/\s+/)[0];
    if (/^(The|A|An)$/i.test(brandKo)) brandKo = '';
  } else {
    var kb = String(raw || '').match(/^([가-힣A-Za-z][가-힣A-Za-z0-9 ]{1,10})/);
    if (kb) brandKo = kb[1].trim().split(/\s+/)[0];
  }
  return brandKo;
}

function overlayNormalizeItems(items) {
  return (Array.isArray(items) ? items : []).map(function(it) {
    if (typeof it === 'string') {
      return { rawName: it, brand: overlayBrandKo('', it), name: overlayDisplayName(it), weight: 0, icon: overlayIconIdFromItem({ name: it }) };
    }
    var raw = it.name || it.itemName || '';
    return {
      rawName: raw,
      brand: overlayBrandKo(it.brand, raw),
      name: overlayDisplayName(raw, it.brand),
      weight: Number(it.weight || it.weight_g || 0),
      icon: overlayIconIdFromItem(it)
    };
  }).filter(function(it) { return it.rawName; });
}

function overlayGroupItems(items) {
  var groups = [];
  var index = {};
  (items || []).forEach(function(it) {
    var key = it.icon || 'other';
    if (index[key] === undefined) {
      index[key] = groups.length;
      groups.push({ icon: key, items: [] });
    }
    groups[index[key]].items.push(it);
  });
  return groups;
}

function overlayPickShowcaseItems(items, limit) {
  limit = limit || 8;
  var normalized = overlayNormalizeItems(items);
  var buckets = {};
  normalized.forEach(function(it) {
    var key = it.icon || 'other';
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(it);
  });
  Object.keys(buckets).forEach(function(key) {
    buckets[key].sort(function(a, b) { return (Number(b.weight) || 0) - (Number(a.weight) || 0); });
  });
  var order = ['tent', 'tarp', 'backpack', 'mat', 'sleeping-bag', 'cooking', 'clothing', 'other', 'food'];
  var picked = [];
  order.forEach(function(key) {
    if (picked.length >= limit) return;
    if (buckets[key] && buckets[key][0]) picked.push(buckets[key][0]);
  });
  return picked;
}

function ensureJournalFonts() {
  if (!document.getElementById('journal-font-link')) {
    var link = document.createElement('link');
    link.id = 'journal-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Bodoni+Moda:opsz,wght@6..96,400;6..96,600;6..96,700;6..96,800&family=Libre+Baskerville:ital,wght@0,400;0,700&display=swap';
    document.head.appendChild(link);
  }
  if (!document.getElementById('issue-font-link')) {
    var issueLink = document.createElement('link');
    issueLink.id = 'issue-font-link';
    issueLink.rel = 'stylesheet';
    issueLink.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@600;700&family=Barlow+Condensed:wght@500;600;700;800&family=Oswald:wght@500;600;700&display=swap';
    document.head.appendChild(issueLink);
  }
  if (!document.getElementById('kuchi-font-link')) {
    var kuchiLink = document.createElement('link');
    kuchiLink.id = 'kuchi-font-link';
    kuchiLink.rel = 'stylesheet';
    kuchiLink.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Oswald:wght@500;600;700&display=swap';
    document.head.appendChild(kuchiLink);
  }
  if (!document.getElementById('balance-font-link')) {
    var balanceLink = document.createElement('link');
    balanceLink.id = 'balance-font-link';
    balanceLink.rel = 'stylesheet';
    balanceLink.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap';
    document.head.appendChild(balanceLink);
  }
}

function ensureJournalStyles() {
  var style = document.getElementById('journal-overlay-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'journal-overlay-style';
    document.head.appendChild(style);
  }
  style.textContent =
    '.photo-overlay-card .jr-grain{position:absolute;inset:0;pointer-events:none;opacity:.42;' +
    'background:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(80,60,40,.06) 28px),' +
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'180\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.45\'/%3E%3C/svg%3E");}' +
    '.photo-overlay-card,.ready-shot-card-vector{container-type:inline-size;}' +
    '.rs-brand-mark{height:7.92cqw;width:auto;max-width:none;display:block;object-fit:contain;mix-blend-mode:screen;pointer-events:none;flex-shrink:0;filter:none;}' +
    '.photo-overlay-card.magazine-cover{container-type:inline-size; isolation:isolate; background:#111;}' +
    '.photo-overlay-card.magazine-cover .mag-photo{position:absolute;inset:0;z-index:1;pointer-events:none;}' +
    '.photo-overlay-card.magazine-cover .mag-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}' +
    '.photo-overlay-card.magazine-cover .mag-type{position:absolute;inset:0;pointer-events:none;}' +
    '.photo-overlay-card.magazine-cover .mag-type-dark{z-index:4;color:#111111;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.magazine-cover .mag-type-light{z-index:5;color:#ffffff;mix-blend-mode:screen;}' +
    '.photo-overlay-card.magazine-cover .mag-kg{position:absolute;left:3%;right:3%;top:10%;font-family:\'Bodoni Moda\',Georgia,serif;font-weight:700;font-size:4.4rem;font-size:22cqw;letter-spacing:-0.06em;line-height:0.78;text-align:center;white-space:nowrap;}' +
    '.photo-overlay-card.magazine-cover .mag-kg b{font-size:0.38em;font-weight:600;letter-spacing:0.04em;margin-left:0.08em;}' +
    '.photo-overlay-card.magazine-cover .mag-items{position:absolute;left:2%;right:2%;bottom:6%;font-family:\'Bodoni Moda\',Georgia,serif;font-weight:700;font-size:4rem;font-size:18cqw;letter-spacing:-0.05em;line-height:0.8;text-align:center;white-space:nowrap;}' +
    '.photo-overlay-card.magazine-cover .mag-memo{position:absolute;left:4%;right:4%;bottom:16.5%;z-index:6;font-family:\'Bodoni Moda\',Georgia,serif;font-weight:600;font-size:4.2cqw;letter-spacing:-.02em;line-height:1.1;text-align:center;color:#ffffff;text-shadow:0 1px 6px rgba(0,0,0,.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;}' +
    '.photo-overlay-card.magazine-cover .mag-logo{position:absolute;top:12px;right:12px;left:auto;z-index:12;pointer-events:none;}' +
    '.photo-overlay-card.spread-card{container-type:inline-size; display:flex; flex-direction:column; background:#f7f4ee; color:#1b2430;}' +
    '#readyShotEmptyPhotoHit{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(7,9,14,0.55);border:0;border-radius:0;cursor:grab;color:#fff;padding:16px;box-sizing:border-box;-webkit-appearance:none;appearance:none;touch-action:pan-y;user-select:none;-webkit-user-select:none;}' +
    '#readyShotEmptyPhotoHit svg,#readyShotEmptyPhotoHit span{pointer-events:none;}' +
    '#packShareCaptureArea input[type="file"]{display:none!important;}' +
    '.photo-overlay-card.spread-card .sp-photo{position:relative; flex:1 1 40%; min-height:36%; overflow:hidden; background:#111;}' +
    '.photo-overlay-card.spread-card .sp-photo img:not(.rs-brand-mark){position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}' +
    '.photo-overlay-card.spread-card .sp-fade{position:absolute;left:0;right:0;bottom:0;height:38%;pointer-events:none;background:linear-gradient(180deg,transparent 0%,rgba(0,0,0,.22) 50%,rgba(0,0,0,.5) 100%);}' +
    '.photo-overlay-card.spread-card .sp-title{position:absolute;left:5%;right:5%;bottom:3%;z-index:4;font-family:\'Bodoni Moda\',Georgia,serif;font-weight:700;font-size:9cqw;letter-spacing:-.04em;line-height:.86;color:#fff;text-transform:uppercase;text-shadow:0 2px 14px rgba(0,0,0,.35);}' +
    '.photo-overlay-card.spread-card .sp-paper{position:relative;flex:0 0 auto;padding:3.6% 5% 3.8%;box-sizing:border-box;}' +
    '.photo-overlay-card.spread-card .sp-kg-row{display:flex;justify-content:flex-end;align-items:baseline;gap:8px;margin-bottom:3.2%;}' +
    '.photo-overlay-card.spread-card .sp-memo{flex:1;min-width:0;font-family:\'Pretendard Variable\',-apple-system,sans-serif;font-size:3.2cqw;font-weight:700;letter-spacing:-.02em;color:#1b2430;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.photo-overlay-card.spread-card .sp-kg{font-family:\'Bodoni Moda\',Georgia,serif;font-size:8.6cqw;font-weight:700;letter-spacing:-.04em;line-height:.88;color:#1a2744;margin-bottom:0;flex-shrink:0;}' +
    '.photo-overlay-card.spread-card .sp-byline{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:2.4%;border-bottom:1px solid rgba(27,36,48,.18);margin-bottom:3.4%;}' +
    '.photo-overlay-card.spread-card .sp-spot{font-family:\'Pretendard Variable\',-apple-system,sans-serif;font-size:3.4cqw;font-weight:800;letter-spacing:-.02em;}' +
    '.photo-overlay-card.spread-card .sp-date{font-family:\'Space Grotesk\',sans-serif;font-size:2.6cqw;font-weight:600;color:#5c6570;}' +
    '.photo-overlay-card.spread-card .sp-cols{display:grid;grid-template-columns:1fr 1fr;column-gap:6%;row-gap:2.2%;}' +
    '.photo-overlay-card.spread-card .sp-brand{font-family:\'Space Grotesk\',sans-serif;font-size:2cqw;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#5c6570;}' +
    '.photo-overlay-card.spread-card .sp-name{margin-top:1px;font-family:\'Libre Baskerville\',\'Pretendard Variable\',Georgia,serif;font-size:3cqw;font-weight:700;line-height:1.2;word-break:keep-all;}' +
    '.photo-overlay-card.spread-card .sp-w{margin-top:1px;font-family:\'Space Grotesk\',sans-serif;font-size:2.3cqw;font-weight:600;color:#5c6570;}' +
    '.photo-overlay-card.spread-card .sp-logo{position:absolute;top:12px;right:12px;left:auto;bottom:auto;z-index:8;}' +
    '.photo-overlay-card.issue-card{container-type:inline-size; background:#fff; color:#fff; padding:3.6%; box-sizing:border-box;}' +
    '.photo-overlay-card.issue-card .iss-sheet{position:relative;width:100%;height:100%;overflow:hidden;background:#000;background-image:linear-gradient(180deg,rgba(255,255,255,.06) 0%,transparent 38%,rgba(0,0,0,.35) 100%),linear-gradient(rgba(255,255,255,.22) 1.4px,transparent 1.4px),linear-gradient(90deg,rgba(255,255,255,.22) 1.4px,transparent 1.4px),linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:auto,14.2% 10.6%,14.2% 10.6%,2.84% 2.12%,2.84% 2.12%;box-shadow:inset 0 0 28px rgba(0,0,0,.55);}' +
    '.photo-overlay-card.issue-card .iss-sheet::before{content:\'\';position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.28;mix-blend-mode:overlay;background:radial-gradient(circle at 18% 12%,rgba(255,214,150,.18),transparent 36%),radial-gradient(circle at 88% 82%,rgba(0,0,0,.55),transparent 40%);}' +
    '.photo-overlay-card.issue-card .iss-kg{position:absolute;left:0;right:0;top:.4%;z-index:6;font-family:Anton,Impact,sans-serif;font-size:28cqw;letter-spacing:-.045em;line-height:.76;text-align:center;text-transform:uppercase;}' +
    '.photo-overlay-card.issue-card .iss-kg .iss-num{display:inline-block;}' +
    '.photo-overlay-card.issue-card .iss-kg b{position:absolute;right:5%;top:.32em;font-size:.28em;font-weight:400;letter-spacing:.06em;white-space:nowrap;}' +
    '.photo-overlay-card.issue-card .iss-frame{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:60%;aspect-ratio:1/1;background:#f6f1e6;padding:0;z-index:3;box-shadow:0 10px 22px rgba(0,0,0,.35);box-sizing:border-box;overflow:hidden;}' +
    '.photo-overlay-card.issue-card .iss-clip{position:absolute;inset:2.4%;overflow:hidden;transform:translateZ(0);isolation:isolate;}' +
    '.photo-overlay-card.issue-card .iss-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}' +
    '.photo-overlay-card.issue-card .iss-note{position:absolute;z-index:5;color:#fff;font-weight:700;line-height:1.05;white-space:nowrap;}' +
    '.photo-overlay-card.issue-card .iss-date{left:3.2%;top:34%;font-family:Caveat,cursive;font-size:5.6cqw;letter-spacing:.02em;transform:rotate(-10deg);line-height:.95;}' +
    '.photo-overlay-card.issue-card .iss-spot{right:3.6%;top:36%;font-family:\'Nanum Pen Script\',cursive;font-size:6.8cqw;transform:rotate(8deg);}' +
    '.photo-overlay-card.issue-card .iss-arrow{position:absolute;z-index:5;pointer-events:none;stroke:#f4fbff;fill:none;stroke-width:2;stroke-linecap:round;}' +
    '.photo-overlay-card.issue-card .iss-a1{left:16%;top:44%;width:8%;height:8%;}' +
    '.photo-overlay-card.issue-card .iss-a2{right:16%;top:48%;width:8%;height:7%;}' +
    '.photo-overlay-card.issue-card .iss-count{position:absolute;left:0;right:0;bottom:-1%;z-index:6;font-family:Anton,Impact,sans-serif;font-size:32cqw;letter-spacing:-.06em;line-height:.72;text-align:center;text-transform:uppercase;}' +
    '.photo-overlay-card.issue-card .iss-count .iss-num{display:inline-block;}' +
    '.photo-overlay-card.issue-card .iss-count b{position:absolute;right:5%;top:.28em;font-size:.28em;font-weight:400;letter-spacing:.06em;white-space:nowrap;}' +
    '.photo-overlay-card.issue-card .iss-memo{position:absolute;left:8%;right:8%;top:72%;z-index:6;font-family:\'Pretendard Variable\',-apple-system,sans-serif;font-size:3.2cqw;font-weight:700;letter-spacing:-.02em;text-align:center;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.75);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.photo-overlay-card.issue-card .iss-logo{position:absolute;right:3.2%;bottom:2.4%;z-index:7;}' +
    '.photo-overlay-card.kuchi-card{container-type:inline-size; isolation:isolate; background:#fff; padding:2.8%; box-sizing:border-box;}' +
    '.photo-overlay-card.kuchi-card .kc-sheet{position:relative;width:100%;height:100%;overflow:hidden;background:#111;isolation:isolate;}' +
    '.photo-overlay-card.kuchi-card .kc-photo{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}' +
    '.photo-overlay-card.kuchi-card .kc-rail{position:absolute;left:0;top:0;bottom:0;width:6.8%;background:#e6e05c;z-index:4;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:7% 0 8%;}' +
    '.photo-overlay-card.kuchi-card .kc-block{display:flex;flex-direction:row;align-items:center;gap:8px;writing-mode:vertical-rl;text-orientation:mixed;color:#1a1a12;}' +
    '.photo-overlay-card.kuchi-card .kc-block.spot{text-orientation:upright;}' +
    '.photo-overlay-card.kuchi-card .kc-lab{font-family:\'Pretendard Variable\',sans-serif;font-size:2.4cqw;font-weight:700;letter-spacing:.12em;opacity:.72;}' +
    '.photo-overlay-card.kuchi-card .kc-val{font-family:\'Barlow Condensed\',\'Oswald\',sans-serif;font-size:3.5cqw;font-weight:700;letter-spacing:.08em;white-space:nowrap;}' +
    '.photo-overlay-card.kuchi-card .kc-mast{position:absolute;left:8%;right:2%;top:52%;text-align:center;pointer-events:none;}' +
    '.photo-overlay-card.kuchi-card .kc-mast-dark{z-index:5;color:#2a2710;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.kuchi-card .kc-mast-light{z-index:6;color:#e7de6a;mix-blend-mode:screen;}' +
    '.photo-overlay-card.kuchi-card .kc-kg{font-family:\'Barlow Condensed\',\'Oswald\',sans-serif;font-weight:500;font-size:38cqw;letter-spacing:.01em;line-height:.72;text-transform:uppercase;white-space:nowrap;}' +
    '.photo-overlay-card.kuchi-card .kc-items{margin-top:2.2%;font-family:\'Barlow Condensed\',\'Oswald\',sans-serif;font-weight:600;font-size:5.2cqw;letter-spacing:.32em;text-transform:lowercase;}' +
    '.photo-overlay-card.kuchi-card .kc-mark{position:absolute;right:3.4%;bottom:3.2%;z-index:7;pointer-events:none;}' +
    '.photo-overlay-card.balance-card{container-type:inline-size; isolation:isolate; background:#fff; padding:1.6%; box-sizing:border-box;}' +
    '.photo-overlay-card.balance-card .bl-sheet{position:relative;width:100%;height:100%;overflow:hidden;background:#111;isolation:isolate;}' +
    '.photo-overlay-card.balance-card .bl-photo{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-copy{position:absolute;left:6.2%;top:5.4%;z-index:6;width:42%;font-family:\'Pretendard Variable\',sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.18;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-copy-dark{color:#111;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.balance-card .bl-copy-light{color:#fff;mix-blend-mode:screen;}' +
    '.photo-overlay-card.balance-card .bl-lead{font-size:3.7cqw;font-weight:900;margin-bottom:4.6%;}' +
    '.photo-overlay-card.balance-card .bl-mid{font-size:2.3cqw;font-weight:700;letter-spacing:.01em;line-height:1.32;margin-bottom:5.4%;}' +
    '.photo-overlay-card.balance-card .bl-end{font-size:2.7cqw;font-weight:800;letter-spacing:.08em;}' +
    '.photo-overlay-card.balance-card .bl-logo{position:absolute;right:1.4%;top:1.2%;z-index:7;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-rule{position:absolute;left:5.5%;right:5.5%;top:48.6%;height:0;z-index:5;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-rule-dark{border-top:1.6px solid #111;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.balance-card .bl-rule-light{border-top:1.6px solid #fff;mix-blend-mode:screen;}' +
    '.photo-overlay-card.balance-card .bl-word{position:absolute;left:6%;bottom:4.2%;z-index:6;text-align:left;font-family:Fraunces,\'Libre Baskerville\',Georgia,serif;font-weight:600;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-word-dark{color:#111;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.balance-card .bl-word-light{color:#fff;mix-blend-mode:screen;}' +
    '.photo-overlay-card.balance-card .bl-kg{font-size:13.2cqw;letter-spacing:-.035em;line-height:.84;}' +
    '.photo-overlay-card.balance-card .bl-kg b{font-size:.38em;font-weight:600;margin-left:.08em;letter-spacing:.02em;vertical-align:.22em;}' +
    '.photo-overlay-card.balance-card .bl-count{margin-top:1.6%;font-size:4.6cqw;font-weight:600;letter-spacing:.04em;line-height:1;}' +
    '.photo-overlay-card.balance-card .bl-meta{position:absolute;right:5.5%;bottom:4.8%;z-index:6;text-align:right;font-family:\'Pretendard Variable\',sans-serif;font-weight:800;line-height:1.25;pointer-events:none;}' +
    '.photo-overlay-card.balance-card .bl-meta-dark{color:#111;mix-blend-mode:multiply;}' +
    '.photo-overlay-card.balance-card .bl-meta-light{color:#fff;mix-blend-mode:screen;}' +
    '.photo-overlay-card.balance-card .bl-date{font-size:2.8cqw;letter-spacing:.04em;}' +
    '.photo-overlay-card.balance-card .bl-memo{margin-top:3px;margin-bottom:1px;font-size:2.8cqw;font-weight:700;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42cqw;}' +
    '.photo-overlay-card.balance-card .bl-spot{margin-top:2px;font-size:3.4cqw;letter-spacing:-.02em;}' +
    '.photo-overlay-card.kuchi-card .kc-memo{margin-top:2.4%;font-family:\'Pretendard Variable\',-apple-system,sans-serif;font-size:2.8cqw;font-weight:700;letter-spacing:-.02em;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:88%;margin-left:auto;margin-right:auto;}';
}

function renderIssueStyleBrandMark(extraClass) {
  var cls = extraClass ? ('rs-brand-mark ' + extraClass) : 'rs-brand-mark';
  return '<img class="' + cls + '" src="fulllogo.png" alt="낭만루트" />';
}

function renderOutlinedBrandMark() {
  return renderIssueStyleBrandMark();
}

function renderPhotoOverlayMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var allItems = overlayNormalizeItems(opts.items);
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : allItems.length;
  var shown = overlayPickShowcaseItems(opts.items, 8);
  var n = shown.length;
  var iconPx = n > 8 ? 13 : 16;
  var makerSize = n > 8 ? '0.32rem' : '0.38rem';
  var nameSize = n > 8 ? '0.38rem' : '0.44rem';
  var wSize = n > 8 ? '0.34rem' : '0.40rem';
  var ink = '#2a241c';
  var mute = '#7a7166';
  var paper = '#f3eee4';
  var memoText = readyShotOneLineMemo(opts.memo);
  var cells = shown.map(function(it) {
    var wStr = it.weight > 0 ? (it.weight / 1000).toFixed(2) + ' kg' : '';
    return '' +
      '<div style="display:flex; flex-direction:column; align-items:flex-start; text-align:left; min-width:0; color:' + ink + ';">' +
        '<span style="color:' + ink + '; line-height:0; margin-bottom:5px;">' + renderOverlayGearIcon(it.icon, iconPx) + '</span>' +
        (it.brand ? '<div style="width:100%; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:' + makerSize + '; font-weight:600; color:' + mute + '; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(it.brand) + '</div>' : '') +
        '<div style="width:100%; margin-top:1px; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:' + nameSize + '; font-weight:800; color:' + ink + '; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(it.name) + '</div>' +
        (wStr ? '<div style="width:100%; margin-top:2px; font-family:\'Space Grotesk\', sans-serif; font-size:' + wSize + '; font-weight:600; color:' + ink + ';">' + wStr + '</div>' : '') +
      '</div>';
  }).join('');
  var tear = '' +
    '<svg viewBox="0 0 1080 80" preserveAspectRatio="none" aria-hidden="true" style="position:absolute; left:-2px; right:-2px; bottom:-2px; width:calc(100% + 4px); height:28px; display:block; z-index:4; filter:drop-shadow(0 -3px 4px rgba(0,0,0,0.22));">' +
      '<path fill="' + paper + '" d="M0 34C28 12 52 58 86 36C118 16 142 60 176 38C208 18 236 62 274 40C308 20 334 64 372 42C410 18 438 66 478 40C514 18 540 64 580 38C616 16 646 62 686 40C722 20 748 64 786 38C822 16 850 62 888 40C924 20 952 64 988 38C1020 18 1048 54 1080 32V80H0Z"/>' +
      '<path fill="none" stroke="rgba(70,55,40,0.18)" stroke-width="2" d="M0 34C28 12 52 58 86 36C118 16 142 60 176 38C208 18 236 62 274 40C308 20 334 64 372 42C410 18 438 66 478 40C514 18 540 64 580 38C616 16 646 62 686 40C722 20 748 64 786 38C822 16 850 62 888 40C924 20 952 64 988 38C1020 18 1048 54 1080 32"/>' +
    '</svg>';

  return '' +
    '<div class="photo-overlay-card" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#111111; box-sizing:border-box; user-select:none; color:#ffffff; display:flex; flex-direction:column;">' +
      '<div class="rs-photo-host" style="position:relative; flex:1 1 56%; min-height:52%; overflow:hidden; z-index:1;">' +
        '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%; display:block; pointer-events:none;" />' +
        '<div style="position:absolute; left:0; right:0; top:0; height:34%; pointer-events:none; background:linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.10) 58%, transparent 100%);"></div>' +
        tear +
        '<div style="position:absolute; top:12px; left:16px; z-index:6;">' +
          '<div style="font-family:\'Space Grotesk\', sans-serif; font-size:1.85rem; font-weight:700; letter-spacing:-1.1px; line-height:0.86; color:#ffffff; text-shadow:0 2px 10px rgba(0,0,0,0.45);">' + escapeHtml(String(weightKg)) + '<span style="font-size:0.36em; font-weight:600; margin-left:3px;">KG</span></div>' +
          '<div style="margin-top:5px; font-family:\'Space Grotesk\', sans-serif; font-size:0.72rem; font-weight:600; letter-spacing:0.4px; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.5);">' + totalCount + ' ITEMS</div>' +
        '</div>' +
        '<div style="position:absolute; top:12px; right:12px; z-index:6; text-align:right;">' +
          '<div style="font-family:\'Space Grotesk\', sans-serif; font-size:0.62rem; font-weight:600; letter-spacing:0.6px; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.55);">' + escapeHtml(dateStr) + '</div>' +
          (spot ? '<div style="margin-top:4px; display:flex; align-items:center; justify-content:flex-end; gap:4px; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.60rem; font-weight:700; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.55);">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="width:10px; height:10px; flex-shrink:0;"><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.2"/></svg>' +
            '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">' + escapeHtml(spot) + '</span></div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="position:relative; flex:0 0 auto; background:' + paper + '; color:' + ink + '; z-index:3; padding:14px 12px 12px 14px; box-sizing:border-box;">' +
        '<div class="jr-grain"></div>' +
        '<div style="position:absolute; left:14px; right:14px; top:12px; bottom:8px; pointer-events:none; background:repeating-linear-gradient(180deg, transparent 0, transparent 17px, rgba(90,70,50,0.08) 18px);"></div>' +
        '<div style="position:relative; z-index:2; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;">' +
          '<div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); column-gap:8px; row-gap:8px; align-items:start; min-width:0;">' + cells + '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-end; gap:10px;">' +
            '<div style="font-family:\'Nanum Pen Script\', cursive; font-size:0.92rem; color:#4a433a; line-height:1.15; min-width:0; flex:1;">불편함<br>그럼에도 불구하고' +
              (memoText ? '<span style="display:inline; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.62rem; font-weight:700; color:#5c5348; margin-left:6px; vertical-align:middle; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"> · ' + escapeHtml(memoText) + '</span>' : '') +
            '</div>' +
            renderIssueStyleBrandMark() +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.renderPhotoOverlayMarkup = renderPhotoOverlayMarkup;

function renderEditorialOverlayMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var allItems = overlayNormalizeItems(opts.items);
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : allItems.length;
  var shown = overlayPickShowcaseItems(opts.items, 8);
  var memoText = readyShotOneLineMemo(opts.memo);
  var n = shown.length;
  var iconPx = n > 6 ? 15 : 17;
  var makerSize = n > 6 ? '0.34rem' : '0.38rem';
  var nameSize = n > 6 ? '0.40rem' : '0.46rem';
  var wSize = n > 6 ? '0.36rem' : '0.40rem';
  var cells = shown.map(function(it) {
    var wStr = it.weight > 0 ? (it.weight / 1000).toFixed(2) + ' kg' : '';
    return '' +
      '<div style="display:flex; flex-direction:column; align-items:flex-start; text-align:left; min-width:0; color:#ffffff;">' +
        '<span style="color:#ffffff; line-height:0; margin-bottom:5px; filter:drop-shadow(0 1px 4px rgba(0,0,0,0.7));">' + renderOverlayGearIcon(it.icon, iconPx) + '</span>' +
        (it.brand ? '<div style="width:100%; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:' + makerSize + '; font-weight:600; color:rgba(255,255,255,0.78); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 4px rgba(0,0,0,0.7);">' + escapeHtml(it.brand) + '</div>' : '') +
        '<div style="width:100%; margin-top:1px; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:' + nameSize + '; font-weight:800; color:#ffffff; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 4px rgba(0,0,0,0.7);">' + escapeHtml(it.name) + '</div>' +
        (wStr ? '<div style="width:100%; margin-top:2px; font-family:\'Space Grotesk\', sans-serif; font-size:' + wSize + '; font-weight:600; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.7);">' + wStr + '</div>' : '') +
      '</div>';
  }).join('');
  var lntSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; flex-shrink:0;"><path d="M12 21c0-6 3.2-9.2 8-11-1.2 5.4-4.4 8.2-8 11z"/><path d="M12 21C12 15 8.8 11.8 4 10c1.2 5.4 4.4 8.2 8 11z"/><path d="M12 21V8"/><path d="M12 8c1.6-2.8 4.2-4 7-4"/></svg>';

  return '' +
    '<div class="photo-overlay-card editorial-pack" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#000000; box-sizing:border-box; user-select:none; color:#ffffff;">' +
      '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%; display:block; z-index:1; pointer-events:none;" />' +
      '<div style="position:absolute; left:0; right:0; top:0; height:38%; z-index:2; pointer-events:none; background:linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 55%, transparent 100%);"></div>' +
      '<div style="position:absolute; left:0; right:0; bottom:0; height:46%; z-index:2; pointer-events:none; background:linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.08) 18%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.86) 78%, rgba(0,0,0,0.94) 100%);"></div>' +
      '<div style="position:absolute; inset:0; z-index:3; pointer-events:none;">' +
        '<div style="position:absolute; top:14px; left:16px; right:16px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
          '<div style="min-width:0;">' +
            '<div style="font-family:\'Space Grotesk\', sans-serif; font-size:0.48rem; font-weight:600; letter-spacing:2.2px; color:rgba(255,255,255,0.78); text-shadow:0 1px 6px rgba(0,0,0,0.55);">BACKPACKING RECORD</div>' +
            '<div style="margin-top:4px; font-family:\'Space Grotesk\', sans-serif; font-size:1.72rem; font-weight:700; letter-spacing:-1.4px; line-height:0.88; color:#ffffff; text-shadow:0 2px 10px rgba(0,0,0,0.45);">' + escapeHtml(String(weightKg)) + '<span style="font-size:0.36em; font-weight:600; letter-spacing:0.4px; margin-left:3px;">KG</span></div>' +
            '<div style="margin-top:5px; font-family:\'Space Grotesk\', sans-serif; font-size:0.78rem; font-weight:600; letter-spacing:0.4px; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.5);">' + totalCount + ' ITEMS</div>' +
            '<div style="margin-top:6px; display:flex; align-items:center; gap:4px; font-family:\'Space Grotesk\', sans-serif; font-size:0.48rem; font-weight:600; letter-spacing:0.4px; color:rgba(255,255,255,0.86); text-shadow:0 1px 6px rgba(0,0,0,0.55);">' + lntSvg + 'Leave No Trace</div>' +
          '</div>' +
          '<div style="text-align:right; flex-shrink:0;">' +
            '<div style="font-family:\'Space Grotesk\', sans-serif; font-size:0.64rem; font-weight:600; letter-spacing:0.8px; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.55);">' + escapeHtml(dateStr) + '</div>' +
            (spot ? '<div style="margin-top:4px; display:flex; align-items:center; justify-content:flex-end; gap:4px; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.62rem; font-weight:700; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.55);">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; flex-shrink:0;"><path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.2"/></svg>' +
              '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">' + escapeHtml(spot) + '</span></div>' : '') +
            (memoText ? '<div style="margin-top:4px; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.56rem; font-weight:700; color:rgba(255,255,255,0.9); text-shadow:0 1px 6px rgba(0,0,0,0.55); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px; margin-left:auto;">' + escapeHtml(memoText) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="position:absolute; left:16px; right:8px; bottom:10px; display:grid; grid-template-columns:minmax(0,1fr) auto; column-gap:8px; align-items:end;">' +
          '<div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); row-gap:10px; column-gap:8px; align-items:start; min-width:0;">' + cells + '</div>' +
          '<div style="flex-shrink:0; display:flex; justify-content:flex-end; align-items:flex-end;">' + renderIssueStyleBrandMark() + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.renderEditorialOverlayMarkup = renderEditorialOverlayMarkup;

function readyShotOneLineMemo(memo) {
  return String(memo || '').trim().replace(/\s+/g, ' ');
}

function readyShotMemoBlock(memo, styleCss) {
  var text = readyShotOneLineMemo(memo);
  if (!text) return '';
  return '<div class="rs-one-line-memo" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; ' + (styleCss || '') + '">' + escapeHtml(text) + '</div>';
}

function renderMagazineCoverMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var weightKg = opts.weightKg || '0.00';
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : 0;
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var memoText = readyShotOneLineMemo(opts.memo);

  var typeHtml =
    '<div class="mag-kg">' + escapeHtml(String(weightKg)) + '<b>KG</b></div>' +
    '<div class="mag-items">' + totalCount + ' ITEMS</div>';
  var memoHtml = memoText
    ? ('<div class="mag-memo">' + escapeHtml(memoText) + '</div>')
    : '';

  return '' +
    '<div class="photo-overlay-card magazine-cover" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#111111; box-sizing:border-box; user-select:none;">' +
      '<div class="mag-photo rs-photo-host">' +
        '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="width:100%; height:100%; object-fit:cover; object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%; display:block;" />' +
      '</div>' +
      '<div class="mag-type mag-type-dark">' + typeHtml + '</div>' +
      '<div class="mag-type mag-type-light">' + typeHtml + '</div>' +
      memoHtml +
      renderIssueStyleBrandMark('mag-logo') +
    '</div>';
}

window.renderMagazineCoverMarkup = renderMagazineCoverMarkup;

function renderSpreadMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var memoText = readyShotOneLineMemo(opts.memo);
  var shown = overlayNormalizeItems(opts.items).slice(0, 8);
  var cells = shown.map(function(it) {
    var wStr = it.weight > 0 ? (it.weight / 1000).toFixed(2) + ' kg' : '';
    return '' +
      '<div class="sp-item">' +
        (it.brand ? '<div class="sp-brand">' + escapeHtml(it.brand) + '</div>' : '') +
        '<div class="sp-name">' + escapeHtml(it.name) + '</div>' +
        (wStr ? '<div class="sp-w">' + wStr + '</div>' : '') +
      '</div>';
  }).join('');

  return '' +
    '<div class="photo-overlay-card spread-card" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#f7f4ee; box-sizing:border-box; user-select:none;">' +
      '<div class="sp-photo rs-photo-host">' +
        '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="width:100%; height:100%; object-fit:cover; object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%; display:block; pointer-events:none;" />' +
        '<div class="sp-fade"></div>' +
        '<div class="sp-title">THE PACK</div>' +
        renderIssueStyleBrandMark('sp-logo') +
      '</div>' +
      '<div class="sp-paper">' +
        '<div class="sp-kg-row">' +
          (memoText ? '<div class="sp-memo">' + escapeHtml(memoText) + '</div>' : '<div class="sp-memo"></div>') +
          '<div class="sp-kg">' + escapeHtml(String(weightKg)) + ' KG</div>' +
        '</div>' +
        '<div class="sp-byline">' +
          '<div class="sp-spot">' + escapeHtml(spot || '나의 힐링 스팟') + '</div>' +
          '<div class="sp-date">' + escapeHtml(dateStr) + '</div>' +
        '</div>' +
        '<div class="sp-cols">' + cells + '</div>' +
      '</div>' +
    '</div>';
}

window.renderSpreadMarkup = renderSpreadMarkup;

function issueDateLines(dateStr) {
  var s = String(dateStr || '').trim();
  var m = s.match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  if (m) {
    return escapeHtml(m[1]) + '<br>' + escapeHtml(String(m[2]).padStart(2, '0') + '.' + String(m[3]).padStart(2, '0'));
  }
  return escapeHtml(s).replace(/\s+/g, '<br>');
}

function renderIssueMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '나의 힐링 스팟';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : (Array.isArray(opts.items) ? opts.items.length : 0);
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var memoText = readyShotOneLineMemo(opts.memo);

  return '' +
    '<div class="photo-overlay-card issue-card" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#ffffff; box-sizing:border-box; user-select:none;">' +
      '<div class="iss-sheet">' +
        '<div class="iss-kg"><span class="iss-num">' + escapeHtml(String(weightKg)) + '</span><b>KG</b></div>' +
        '<div class="iss-note iss-date">' + issueDateLines(dateStr) + '</div>' +
        '<svg class="iss-arrow iss-a1" viewBox="0 0 80 50" aria-hidden="true"><path d="M8 28 C 28 8, 48 18, 74 22"/></svg>' +
        '<div class="iss-frame">' +
          '<div class="iss-clip rs-photo-host">' +
            '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%;" />' +
          '</div>' +
        '</div>' +
        (memoText ? '<div class="iss-memo">' + escapeHtml(memoText) + '</div>' : '') +
        '<div class="iss-note iss-spot">' + escapeHtml(spot) + '</div>' +
        '<svg class="iss-arrow iss-a2" viewBox="0 0 70 50" aria-hidden="true"><path d="M62 18 C 40 8, 22 22, 6 28"/></svg>' +
        '<div class="iss-count"><span class="iss-num">' + escapeHtml(String(totalCount)) + '</span><b>ITEM</b></div>' +
        renderIssueStyleBrandMark('iss-logo') +
      '</div>' +
    '</div>';
}

window.renderIssueMarkup = renderIssueMarkup;

function renderKuchiMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '나의 힐링 스팟';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : (Array.isArray(opts.items) ? opts.items.length : 0);
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var memoText = readyShotOneLineMemo(opts.memo);
  var mastInner =
    '<div class="kc-kg">' + escapeHtml(String(weightKg)) + '</div>' +
    '<div class="kc-items">' + totalCount + ' items</div>' +
    (memoText ? '<div class="kc-memo">' + escapeHtml(memoText) + '</div>' : '');

  return '' +
    '<div class="photo-overlay-card kuchi-card" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:18px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#ffffff; box-sizing:border-box; user-select:none;">' +
        '<div class="kc-sheet rs-photo-host">' +
        '<img class="kc-photo"' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%;" />' +
        '<div class="kc-rail">' +
          '<div class="kc-block"><span class="kc-lab">date</span><span class="kc-val">' + escapeHtml(dateStr) + '</span></div>' +
          '<div class="kc-block spot"><span class="kc-lab">spot</span><span class="kc-val">' + escapeHtml(spot) + '</span></div>' +
        '</div>' +
        '<div class="kc-mast kc-mast-dark">' + mastInner + '</div>' +
        '<div class="kc-mast kc-mast-light">' + mastInner + '</div>' +
        renderIssueStyleBrandMark('kc-mark') +
      '</div>' +
    '</div>';
}

window.renderKuchiMarkup = renderKuchiMarkup;

function renderBalanceMarkup(opts) {
  opts = opts || {};
  ensureJournalFonts();
  ensureJournalStyles();
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '나의 힐링 스팟';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var totalCount = (opts.itemCount !== undefined) ? opts.itemCount : (Array.isArray(opts.items) ? opts.items.length : 0);
  var wrapCss = opts.wrapCss || 'width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var memoText = readyShotOneLineMemo(opts.memo);
  var copyInner =
    '<div class="bl-lead">불편함을<br>감수하고</div>' +
    '<div class="bl-mid">자연에서<br>하룻밤을<br>보내는 사람들</div>' +
    '<div class="bl-end">낭만루터</div>';
  var wordInner =
    '<div class="bl-kg">' + escapeHtml(String(weightKg)) + '<b>kg</b></div>' +
    '<div class="bl-count">' + totalCount + ' items</div>';
  var metaInner =
    '<div class="bl-date">' + escapeHtml(dateStr) + '</div>' +
    (memoText ? '<div class="bl-memo">' + escapeHtml(memoText) + '</div>' : '') +
    '<div class="bl-spot">' + escapeHtml(spot) + '</div>';

  return '' +
    '<div class="photo-overlay-card balance-card" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:18px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#ffffff; box-sizing:border-box; user-select:none;">' +
      '<div class="bl-sheet rs-photo-host">' +
        '<img class="bl-photo"' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%;" />' +
        '<div class="bl-copy bl-copy-dark">' + copyInner + '</div>' +
        '<div class="bl-copy bl-copy-light">' + copyInner + '</div>' +
        renderIssueStyleBrandMark('bl-logo') +
        '<div class="bl-rule bl-rule-dark"></div>' +
        '<div class="bl-rule bl-rule-light"></div>' +
        '<div class="bl-word bl-word-dark">' + wordInner + '</div>' +
        '<div class="bl-word bl-word-light">' + wordInner + '</div>' +
        '<div class="bl-meta bl-meta-dark">' + metaInner + '</div>' +
        '<div class="bl-meta bl-meta-light">' + metaInner + '</div>' +
      '</div>' +
    '</div>';
}

window.renderBalanceMarkup = renderBalanceMarkup;

async function exportPhotoOverlayPng(card) {
  var canvas = await captureStudioCardCanvas(card);
  var blob = await canvasToShareBlob(canvas);
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.download = '낭만루트_저널_' + Date.now() + '.jpg';
  link.href = url;
  link.click();
  setTimeout(function() { URL.revokeObjectURL(url); }, 2500);
}

function renderNrcCertShotMarkup(opts) {
  opts = opts || {};
  var photoUrl = opts.photo || '';
  var posX = (opts.posX !== undefined) ? opts.posX : 50;
  var posY = (opts.posY !== undefined) ? opts.posY : 50;
  var scale = opts.scale || 1.0;
  var spot = opts.spot || '나의 힐링 스팟';
  var dateStr = opts.date || '';
  var weightKg = opts.weightKg || '0.00';
  var items = Array.isArray(opts.items) ? opts.items : [];
  var brand = opts.brand || '';
  var wrapCss = opts.wrapCss || 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;';
  var imgIdAttr = opts.imgId ? ' id="' + opts.imgId + '"' : '';
  var imgErr = opts.onerror || '';
  var n = items.length;
  var twoCol = n >= 7;
  var size = n >= 12 ? '0.46rem' : (n >= 8 ? '0.50rem' : '0.54rem');
  var rows = items.map(function(it) {
    var rawN = (typeof it === 'string') ? it : (it.name || '');
    var cName = rawN.replace(/\s*\(\d+g\)$/, '');
    var wG = (typeof it === 'object' && it.weight) ? Number(it.weight) : 0;
    var wStr = wG > 0 ? (wG / 1000).toFixed(2) : '';
    return '<div style="display:flex; justify-content:space-between; align-items:center; gap:4px; min-width:0; line-height:1.2;">' +
      '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:' + size + '; font-weight:700; color:#ffffff; text-shadow:0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8);">' +
        '<span style="display:inline-block; width:3px; height:3px; border-radius:50%; background:#ffffff; margin-right:4px; vertical-align:middle; box-shadow:0 1px 2px rgba(0,0,0,0.8);"></span>' +
        escapeHtml(cName) +
      '</span>' +
      (wStr ? '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:0.48rem; font-weight:800; color:#ffffff; flex-shrink:0; text-shadow:0 1px 3px rgba(0,0,0,0.9);">' + wStr + '</span>' : '') +
    '</div>';
  }).join('');

  return '' +
    '<div class="ready-shot-card-vector" style="position:relative; ' + wrapCss + ' overflow:hidden; border-radius:14px; box-shadow:0 8px 24px rgba(0,0,0,0.45); background:#000000; box-sizing:border-box; user-select:none;">' +
      '<img' + imgIdAttr + ' src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" ' + imgErr + ' style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:' + posX + '% ' + posY + '%; transform:scale(' + scale + '); transform-origin:' + posX + '% ' + posY + '%; display:block; z-index:1; pointer-events:none;" />' +
      '<div style="position:absolute; inset:auto 0 0 0; height:58%; z-index:2; pointer-events:none; background:linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.22) 40%, rgba(0,0,0,0.62) 100%);"></div>' +
      '<div style="position:absolute; top:12px; left:14px; right:14px; z-index:5; display:flex; justify-content:space-between; align-items:center;">' +
        '<div style="display:inline-flex; align-items:center; gap:4px; min-width:0; max-width:70%;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" style="width:11px; height:11px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span style="font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.68rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8);">' + escapeHtml(spot) + '</span>' +
        '</div>' +
        '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:0.54rem; font-weight:700; color:#cbd5e1; letter-spacing:0.8px; flex-shrink:0; text-shadow:0 1px 4px rgba(0,0,0,0.8);">' + escapeHtml(dateStr) + '</span>' +
      '</div>' +
      '<div style="position:absolute; left:12px; right:12px; bottom:10px; z-index:5; display:flex; flex-direction:column; justify-content:flex-end; max-height:62%;">' +
        '<div style="display:grid; grid-template-columns:' + (twoCol ? '1fr 1fr' : '1fr') + '; column-gap:10px; row-gap:3px; align-content:end; min-height:0;">' + rows + '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:7px; gap:8px;">' +
          '<div style="font-family:\'Space Grotesk\', \'Pretendard Variable\', sans-serif; font-size:1.18rem; font-weight:900; letter-spacing:-0.6px; line-height:1; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.85);">' + escapeHtml(String(weightKg)) + '<span style="font-family:\'Pretendard Variable\', sans-serif; font-size:0.48em; font-weight:800; margin-left:2px;">kg</span></div>' +
          '<div style="display:flex; align-items:center;">' +
            renderIssueStyleBrandMark() +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.generateReadyShotMarkup = function(record, options) {
  options = options || {};
  record = record || {};

  var photoUrl = options.photo || record.readyShotPhoto || '';
  var mode = options.mode || record.readyShotMode || 'minimal';
  var posX = (options.posX !== undefined) ? options.posX : ((record.readyShotPosX !== undefined) ? record.readyShotPosX : 50);
  var posY = (options.posY !== undefined) ? options.posY : ((record.readyShotPosY !== undefined) ? record.readyShotPosY : 50);
  var scale = (options.scale !== undefined) ? options.scale : (record.readyShotScale || 1.0);
  var rawSpot = options.spot || record.spot || '나의 힐링 스팟';
  var spotVal = (rawSpot && rawSpot !== '나의 힐링 스팟') ? rawSpot : '나의 힐링 스팟';
  var dateStr = options.date || record.date || '';
  var weightKg = options.weightKg || record.weightKg || '0.00';
  var items = options.items || record.items || [];
  var memo = options.memo || record.oneLineMemo || record.memo || '';

  var totalCount = items.length > 0 ? items.length : 0;
  var brandSvgWhite = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#ffffff', '#ffffff') : '';
  var brandSvgDark = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#0f172a', '#475569') : '';
  var svgDot = '<span style="display:inline-block; width:3px; height:3px; background:#94a3b8; border-radius:50%; margin-right:3px; vertical-align:middle; flex-shrink:0;"></span>';
  var svgShield = (SVG_ICONS && SVG_ICONS.lntShield) || '<svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" style="width:11px; height:11px; display:inline-block; vertical-align:-1px; margin-right:3px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';

  if (mode === 'minimal') {
    var minimalMemo = readyShotOneLineMemo(memo);
    return `
      <div class="ready-shot-card-vector ready-shot-minimal" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        
        <!-- 상단 헤더 (위치 및 일자) -->
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:12px 14px 24px 14px; background:linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:70%; min-width:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.68rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(spotVal || 'COLLECTION')}</span>
          </div>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.54rem; font-weight:700; color:#cbd5e1; letter-spacing:0.8px; flex-shrink:0; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(dateStr)}</span>
        </div>

        <!-- 하단 바 (중앙 스펙 강조 + 우측하단 은은한 낭만루트 워터마크) -->
        <div style="position:relative; z-index:10; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-end; padding:24px 14px 12px 14px; background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%); box-sizing:border-box; gap:6px;">
          ${minimalMemo ? '<div style="text-align:center; font-family:\'Pretendard Variable\', -apple-system, sans-serif; font-size:0.62rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.9);">' + escapeHtml(minimalMemo) + '</div>' : ''}
          <div style="display:flex; align-items:flex-end; justify-content:space-between;">
          <div style="flex:1; min-width:0;"></div>
          <div style="flex-shrink:0; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Space Grotesk', sans-serif; font-size:0.64rem; font-weight:900; color:#ffffff; letter-spacing:0.8px; text-shadow:0 2px 6px rgba(0,0,0,0.95);">
            <span>${totalCount} ITEMS</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.76rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.55rem; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:#6ee7b7; font-weight:800;">LNT</span>
          </div>
          <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center;">
            ${renderIssueStyleBrandMark()}
          </div>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === 'sage') {
    var maxDisplaySage = 14;
    var displayedItemsSage = items.slice(0, maxDisplaySage);
    var remainingCountSage = items.length - maxDisplaySage;

    var sageGearsMarkup = displayedItemsSage.map(function(it) {
      var rawN = (typeof it === 'string') ? it : (it.name || '');
      var cName = rawN.replace(/\s*\(\d+g\)$/, '');
      var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
      var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; min-width:0; box-sizing:border-box; line-height:1.2;">
          <span style="font-size:0.62rem; font-weight:700; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-shadow:0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8); display:flex; align-items:center;">
            <span style="display:inline-block; width:3px; height:3px; background:#ffffff; border-radius:50%; margin-right:4px; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.8);"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:800; color:#ffffff; flex-shrink:0; margin-left:6px; text-shadow:0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8);">${wStr}</span>
        </div>
      `;
    }).join('');

    if (remainingCountSage > 0) {
      sageGearsMarkup += `
        <div style="display:flex; align-items:center; font-size:0.56rem; font-weight:800; color:#e2e8f0; text-shadow:0 1px 3px rgba(0,0,0,0.9); line-height:1.2;">
          <span>+외 ${remainingCountSage}개 장비</span>
        </div>
      `;
    }

    return `
      <div class="ready-shot-card-vector ready-shot-sage" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        <div style="position:absolute; inset:0; z-index:3; pointer-events:none; display:grid; grid-template-columns:1fr 1fr 1fr; grid-template-rows:1fr 1fr 1fr; opacity:0.65;">
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4); border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-bottom:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4);"></div>
          <div style="border-right:1px solid rgba(255,255,255,0.4);"></div>
          <div></div>
        </div>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:44px; height:44px; border:1px solid rgba(255,255,255,0.85); z-index:4; pointer-events:none;">
          <div style="position:absolute; top:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; left:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
          <div style="position:absolute; right:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
        </div>
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:10px 12px 4px 12px; box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center;">
            ${renderIssueStyleBrandMark()}
          </div>
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:55%; min-width:0; font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.58rem; font-weight:700; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.9);">
            ${readyShotOneLineMemo(memo) ? '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.6); padding:1px 6px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.8);">' + escapeHtml(readyShotOneLineMemo(memo)) + '</span>' : ''}
          </div>
        </div>
        <div style="position:relative; z-index:10; width:100%; padding:0 10px; box-sizing:border-box; margin-top:auto; margin-bottom:2px; display:flex; flex-direction:column; justify-content:flex-end;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:inline-flex; align-items:center; gap:3px; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" style="width:11px; height:11px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.72rem; font-weight:900; color:#ffffff;">${escapeHtml(spotVal)}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:4px; font-family:'Space Grotesk', sans-serif; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
              <span style="font-size:0.78rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
              <span style="font-size:0.5rem; color:rgba(255,255,255,0.7);">|</span>
              <span style="font-size:0.60rem; font-weight:800; color:#cbd5e1;">${escapeHtml(dateStr)}</span>
            </div>
          </div>
          <div style="background:transparent; border:none; padding:0; display:grid; grid-template-columns:1fr 1fr; column-gap:12px; row-gap:4px; box-sizing:border-box;">
            ${sageGearsMarkup}
          </div>
        </div>
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:2px 12px 8px 12px; font-family:'Space Grotesk', sans-serif; font-size:0.55rem; font-weight:800; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.9);">
          <span>3:4 FRAME</span>
          <div style="display:inline-flex; align-items:center; gap:6px;">
            <span style="width:6px; height:6px; border-radius:50%; background:#22c55e; display:inline-block; box-shadow:0 0 3px #000;"></span>
            <span style="color:#ffffff; font-weight:900;">PACKING COMPLETE</span>
          </div>
          <span>LNT · BPL</span>
        </div>
      </div>
    `;
  }

  if (mode === 'chic') {
    var chicMemo = readyShotOneLineMemo(memo);
    return `
      <div class="ready-shot-card-vector ready-shot-chic" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#000000; user-select:none;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#000000; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.3); padding:9px 9px 12px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; border:1px solid rgba(255,255,255,0.22);">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:0 2px 5px 2px; box-sizing:border-box; margin-bottom:6px; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.15);">
            <div style="display:flex; align-items:center; gap:4px; max-width:65%; min-width:0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:10px; height:10px; flex-shrink:0; opacity:0.85;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.56rem; font-weight:800; color:#ffffff; letter-spacing:0.4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal || 'COLLECTION')}</span>
            </div>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.8px; flex-shrink:0;">${escapeHtml(dateStr)}</span>
          </div>
          <div class="rs-photo-host" style="width:100%; aspect-ratio:4/3; border-radius:4px; overflow:hidden; background:#000; box-shadow:0 4px 14px rgba(0,0,0,0.6); flex-shrink:0; position:relative;">
            <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; min-height:0; box-sizing:border-box;">
            <div style="display:flex; justify-content:center; align-items:center; gap:6px; font-family:'Space Grotesk', sans-serif; letter-spacing:0.6px;">
              <span style="color:#ffffff; font-weight:800; font-size:0.74rem;">${totalCount} ITEMS</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.86rem;">${weightKg} KG</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#e2e8f0; font-weight:800; font-size:0.55rem; padding:1px 4px; border-radius:3px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25);">LNT</span>
            </div>
            <div style="position:absolute; left:0; right:0; bottom:0; display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <span style="flex:1; min-width:0; font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.85); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${chicMemo ? escapeHtml(chicMemo) : ''}</span>
              <div style="display:flex; align-items:center; flex-shrink:0;">
                ${renderIssueStyleBrandMark()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === 'essay') {
    var essayMemoSrc = readyShotOneLineMemo(memo) || '그럼에도 불구하고 자연에서 하루를 찾는다';
    var memoLines = essayMemoSrc.split('\n').map(function(line) {
      return `<div style="margin:1px 0;">${escapeHtml(line)}</div>`;
    }).join('');

    var essayGearRows = items.slice(0, 12).map(function(it) {
      var rawN = (typeof it === 'string') ? it : (it.name || '');
      var cName = rawN.replace(/\s*\(\d+g\)$/, '');
      var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
      var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; line-height:1.2; min-width:0; box-sizing:border-box;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:600; color:#334155; display:flex; align-items:center;">
            ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-weight:700; color:#1e293b; flex-shrink:0; font-size:0.92em; margin-left:2px;">${wStr}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="ready-shot-card-vector ready-shot-essay" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#07090e; user-select:none;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:absolute; inset:14px; border:1px solid rgba(255,255,255,0.35); pointer-events:none; z-index:2; border-radius:2px;"></div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#fdfcf9; border-radius:6px; box-shadow:0 18px 45px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4); padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1c1917;">
          <div style="flex:1 1 0%; min-height:0; width:100%; border-radius:4px; overflow:hidden; background:#000; box-shadow:inset 0 0 4px rgba(0,0,0,0.3); margin-bottom:6px;">
            <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px;">
            <div style="text-align:center; padding:0 2px;">
              <div style="font-family:'Gowun Batang', 'Noto Serif KR', serif; font-size:0.68rem; font-weight:700; color:#1c1917; line-height:1.35; letter-spacing:-0.2px; word-break:keep-all;">
                ${memoLines}
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; column-gap:8px; row-gap:3px !important; align-content:start !important; width:100%; box-sizing:border-box; padding:4px 0 2px 0; border-top:1px dashed #d6cfc4;">
              ${essayGearRows}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed #d6cfc4; padding-top:3px; font-size:0.46rem; color:#78716c; font-family:'Pretendard Variable', -apple-system, sans-serif;">
              <div style="display:flex; align-items:center; gap:4px;">
                ${renderIssueStyleBrandMark()}
                <span>·</span>
                <span style="font-family:'Space Grotesk', sans-serif;">${escapeHtml(dateStr)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-weight:800; color:#1e293b;">${weightKg}kg</span>
                <span>·</span>
                <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center;">
                  ${svgShield}<span>LNT</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === 'nrc') {
    return renderNrcCertShotMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      items: items,
      brand: brandSvgWhite,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'overlay') {
    return renderPhotoOverlayMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      itemCount: totalCount,
      items: items,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'editorial') {
    return renderEditorialOverlayMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      itemCount: totalCount,
      items: items,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'balance') {
    return renderBalanceMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      itemCount: totalCount,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'kuchi') {
    return renderKuchiMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      itemCount: totalCount,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'issue') {
    return renderIssueMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      itemCount: totalCount,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'spread') {
    return renderSpreadMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: dateStr,
      weightKg: weightKg,
      items: items,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  if (mode === 'magazine') {
    return renderMagazineCoverMarkup({
      photo: photoUrl,
      onerror: 'onerror="this.onerror=null; window.handleFeedImageError && window.handleFeedImageError(this);"',
      posX: posX,
      posY: posY,
      scale: scale,
      weightKg: weightKg,
      itemCount: totalCount,
      memo: memo,
      wrapCss: 'width:100%; max-width:330px; aspect-ratio:3/4; margin:auto;'
    });
  }

  // mode === 'packing' (default)
  var maxP = 14;
  var pItems = items.slice(0, maxP);
  var pRemain = items.length - maxP;
  var pRows = pItems.map(function(it) {
    var rawN = (typeof it === 'string') ? it : (it.name || '');
    var cName = rawN.replace(/\s*\(\d+g\)$/, '');
    var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
    var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.56rem; line-height:1.2; padding:0; gap:2px; min-width:0;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:700; color:#1e293b; display:flex; align-items:center;">
          ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
        </span>
        <span style="font-family:'Space Grotesk', sans-serif; font-weight:800; color:#334155; flex-shrink:0; font-size:0.95em;">${wStr}</span>
      </div>
    `;
  }).join('');

  if (pRemain > 0) {
    pRows += `
      <div style="display:flex; align-items:center; font-size:0.54rem; font-weight:800; color:#64748b; line-height:1.2;">
        <span>+외 ${pRemain}개 장비</span>
      </div>
    `;
  }

  return `
    <div class="ready-shot-card-vector ready-shot-packing" style="width:100%; max-width:330px; aspect-ratio:3/4; margin:auto; background:#fbfaf7; box-shadow:0 12px 30px rgba(0,0,0,0.9); border-radius:12px; padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; gap:6px; box-sizing:border-box; color:#1e293b; font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; user-select:none;">
      <div style="position:relative; width:100%; flex:1 1 0%; min-height:100px; border-radius:6px; overflow:hidden; background:#000; box-shadow:inset 0 0 3px rgba(0,0,0,0.3);">
        <img src="${escapeHtml(okbmSafeImageUrl(photoUrl))}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block;" />
      </div>
      <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px; width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
          <div style="font-size:0.80rem; font-weight:900; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; display:flex; align-items:center;">
            ${SVG_ICONS.pin}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal)}</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:4px; flex-shrink:0; margin-left:6px;">
            <span style="font-size:0.46rem; font-weight:800; color:#64748b;">PACKING</span>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:1.02rem; font-weight:900; color:#0f172a; line-height:1;">${weightKg}kg</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; column-gap:8px; row-gap:4px; width:100%; box-sizing:border-box; padding:2px 0 1px 0;">
          ${pRows}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:3px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${renderIssueStyleBrandMark()}
            <span style="font-family:'Space Grotesk', sans-serif; font-weight:600; color:#94a3b8; font-size:0.92em;">${escapeHtml(dateStr)}</span>
          </div>
          <span style="color:#059669; font-weight:800; display:inline-flex; align-items:center;">
            ${svgShield}<span>LNT 실천</span>
          </span>
        </div>
      </div>
    </div>
  `;
};

// 🧰 [적응형 장비 리스트 엔진] - 20개까지 1열(1Col) 유지, 21개 이상부터 2열 적용
function renderAdaptiveGearList(items, options) {
  options = options || {};
  var list = (items && items.length > 0) ? items : [];
  var total = list.length;
  if (total === 0) {
    return '<div style="font-size:0.65rem; color:' + (options.subColor || '#94a3b8') + '; text-align:center; padding:6px 0;">세팅된 장비가 없습니다.</div>';
  }
  
  var isTwoCol = total >= 21;
  var displayItems = list; 

  var fontSize = options.fontSize || '0.62rem';
  var paddingY = options.paddingY || '0.8px';
  if (total >= 19) { fontSize = '0.46rem'; paddingY = '0.2px'; }
  else if (total >= 17) { fontSize = '0.50rem'; paddingY = '0.3px'; }
  else if (total >= 11) { fontSize = '0.54rem'; paddingY = '0.5px'; }
  else if (total >= 8) { fontSize = '0.60rem'; paddingY = '0.7px'; }

  var nameColor = options.nameColor || 'inherit';
  var wtColor = options.wtColor || '#38bdf8';
  var rowsHtml = displayItems.map(function(it) {
    var rawName = (typeof it === 'string') ? it : (it.name || '');
    var cleanName = rawName.replace(/\s*\(\d+g\)$/, '');
    var weightGrams = (typeof it === 'object' && it.weight) ? it.weight : 0;
    var weightStr = weightGrams > 0 ? (weightGrams / 1000).toFixed(2) + 'kg' : '';
    return '<div style="display:flex; justify-content:space-between; align-items:center; font-size:' + fontSize + '; padding:' + paddingY + ' 0; gap:2px; min-width:0; box-sizing:border-box;">' +
      '<span style="color:' + nameColor + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:700; display:flex; align-items:center;">' +
        (options.bullet !== undefined ? options.bullet : SVG_ICONS.bullet) + '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(cleanName) + '</span>' +
      '</span>' +
      '<span style="font-family:\'JetBrains Mono\', monospace; font-weight:800; color:' + wtColor + '; flex-shrink:0; font-size:0.92em; letter-spacing:0px;">' + weightStr + '</span>' +
    '</div>';
  }).join('');

  return '<div style="display:grid; grid-template-columns:' + (isTwoCol ? '1fr 1fr' : '1fr') + '; column-gap:6px; row-gap:0px; width:100%; box-sizing:border-box;">' + rowsHtml + '</div>';
}

window.saveCurrentPackingRecord = function() {
  var allItems = [];
  if (typeof CATEGORIES !== 'undefined' && typeof selectedGearMap !== 'undefined') {
    CATEGORIES.forEach(function(c) {
      (selectedGearMap[c.id] || []).forEach(function(it) {
        if (it && it.weight > 0) allItems.push(it);
      });
    });
  }

  if (allItems.length === 0) {
    if (typeof showToast === 'function') showToast('선택된 장비가 없습니다. 배낭에 장비를 담아주세요!', 'warn');
    return;
  }

  var totalGrams = allItems.reduce(function(sum, g) { return sum + Number(g.weight || 0); }, 0);
  var totalKg = (totalGrams / 1000).toFixed(2);
  var now = new Date();
  var timeStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

  var newRecord = {
    id: 'pack_' + Date.now(),
    date: timeStr,
    weightKg: totalKg,
    weightGrams: totalGrams,
    itemCount: allItems.length,
    items: allItems.map(function(g) { return { id: g.id || ('item_' + Math.random()), name: g.name, weight: g.weight }; }),
    photos: []
  };

  if (typeof window.savePackingHistoryRecord === 'function') {
    window.savePackingHistoryRecord(newRecord).catch(function(err) {
      console.warn('[templates.js:saveCurrentPackingRecord]', err);
    });
  }

  window.openPackShareModal(newRecord, allItems, false);
};
var saveCurrentPackingRecord = window.saveCurrentPackingRecord;

// 🏷️ [지능형 상단 템플릿 칩 컨테이너 탐색 및 자동 렌더링 엔진]
function findTemplateChipContainer() {
  var direct = document.getElementById('templateSelectorBar') ||
               document.querySelector('.share-card-tmpl-chips') || 
               document.getElementById('shareCardTmplChips') || 
               document.getElementById('packCardTmplScroll') ||
               document.querySelector('.tmpl-chips-container') ||
               document.querySelector('.tmpl-chips-scroll');
  if (direct) return direct;

  var modal = document.getElementById('packShareModalOverlay');
  if (!modal) return null;

  var buttons = Array.from(modal.querySelectorAll('button, div'));
  var matched = buttons.find(function(el) {
    var txt = el.textContent || '';
    return (txt.includes('영수증') || txt.includes('보딩패스') || el.classList.contains('tmpl-chip-btn')) && el.children.length <= 1;
  });

  return matched ? matched.parentElement : null;
}

function renderTemplateChips() {
  var chipContainer = findTemplateChipContainer();
  if (!chipContainer) return;

  var family = window.readyShotFamily || 'photo';
  var html = '';

  if (family === 'photo') {
    var activeMode = window.currentStudioCardMode || 'spread';
    if (STUDIO_MODE_ORDER.indexOf(activeMode) === -1) activeMode = 'spread';
    html = STUDIO_MODE_ORDER.map(function(mode) {
      var isActive = (mode === activeMode);
      var name = STUDIO_MODE_NAMES[mode] || mode;
      return '<button type="button" class="tmpl-chip-btn' + (isActive ? ' active' : '') + '" onclick="window.switchStudioModeFromReadyShot(\'' + mode + '\')" data-studio-mode="' + mode + '">' +
        escapeHtml(name) +
      '</button>';
    }).join('');
  } else {
    html = TEMPLATE_ORDER.map(function(tId) {
      var isActive = (Number(tId) === Number(selectedTemplateId));
      var name = TEMPLATE_NAMES[tId] || ('테마 ' + tId);
      return '<button type="button" class="tmpl-chip-btn' + (isActive ? ' active' : '') + '" onclick="switchShareCardTemplate(' + tId + ')" data-tmpl="' + tId + '">' +
        escapeHtml(name) +
      '</button>';
    }).join('');
  }

  chipContainer.innerHTML = html;
  scrollActiveReadyShotChipIntoView();
}

function scrollActiveReadyShotChipIntoView() {
  var bar = document.getElementById('templateSelectorBar') || findTemplateChipContainer();
  if (!bar) return;
  var active = bar.querySelector('.tmpl-chip-btn.active');
  if (!active) return;
  requestAnimationFrame(function() {
    var barRect = bar.getBoundingClientRect();
    var btnRect = active.getBoundingClientRect();
    if (!barRect.width || !btnRect.width) {
      if (typeof active.scrollIntoView === 'function') {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      return;
    }
    var delta = (btnRect.left + btnRect.width / 2) - (barRect.left + barRect.width / 2);
    var maxLeft = Math.max(0, bar.scrollWidth - bar.clientWidth);
    var nextLeft = Math.max(0, Math.min(maxLeft, bar.scrollLeft + delta));
    if (typeof bar.scrollTo === 'function') {
      bar.scrollTo({ left: nextLeft, behavior: 'smooth' });
    } else {
      bar.scrollLeft = nextLeft;
    }
  });
}

function syncReadyShotFamilyToggle() {
  var family = window.readyShotFamily || 'photo';
  var photoBtn = document.getElementById('btnReadyShotFamilyPhoto');
  var pamphletBtn = document.getElementById('btnReadyShotFamilyPamphlet');
  if (photoBtn) photoBtn.classList.toggle('active', family === 'photo');
  if (pamphletBtn) pamphletBtn.classList.toggle('active', family === 'pamphlet');
}

function syncReadyShotPhotoButtons() {
  // 사진 넣기/바꾸기는 카드 탭으로만 처리. 액션 줄 버튼은 유지하지 않음.
}

function scrollReadyShotCardIntoView() {
  var modal = document.getElementById('packShareModalOverlay');
  var card = document.getElementById('packShareCaptureArea');
  if (!modal || !card) return;
  try {
    var modalRect = modal.getBoundingClientRect();
    var cardRect = card.getBoundingClientRect();
    var cardCenter = cardRect.top + (cardRect.height / 2);
    // 화면 중앙보다 약간 아래(뷰포트 높이의 ~8%)에 카드 중심이 오도록
    var targetY = modalRect.top + (modalRect.height * 0.58);
    var nextTop = modal.scrollTop + (cardCenter - targetY);
    if (typeof modal.scrollTo === 'function') {
      modal.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
    } else {
      modal.scrollTop = Math.max(0, nextTop);
    }
  } catch (e) {
    try {
      card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch (e2) {}
  }
}

var __readyShotPickerOpenedAt = 0;
window.triggerReadyShotPhotoPicker = function() {
  var now = Date.now();
  if (now - __readyShotPickerOpenedAt < 700) return;
  __readyShotPickerOpenedAt = now;
  var input = document.getElementById('shareCardPhotoInput');
  if (input) {
    try { input.value = ''; } catch (e) {}
    input.click();
    return;
  }
  var label = document.getElementById('shareCardPhotoInputLabel');
  if (label) label.click();
};

function attachReadyShotEmptyPhotoHit(container) {
  if (!container) return;
  var old = container.querySelector('#readyShotEmptyPhotoHit');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var host = container.querySelector('.rs-photo-host, .iss-clip, .sp-photo, .iss-frame, .mag-photo, .kc-sheet, .bl-sheet');
  if (!host) host = container.querySelector('.photo-overlay-card, .ready-shot-card-vector');
  if (!host) host = container.firstElementChild;
  if (!host) return;
  try {
    var pos = window.getComputedStyle(host).position;
    if (!pos || pos === 'static') host.style.position = 'relative';
  } catch (ePos) {
    host.style.position = 'relative';
  }
  var overlay = document.createElement('div');
  overlay.id = 'readyShotEmptyPhotoHit';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:28px; height:28px; opacity:0.9;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
    '<span style="font-size:0.88rem; font-weight:900; letter-spacing:-0.2px;">사진 넣기</span>' +
    '<span style="font-size:0.68rem; font-weight:700; color:#cbd5e1;"></span>';
  host.appendChild(overlay);
}

var __readyShotFrameSnapshot = null;

function isReadyShotFrameModalOpen() {
  var el = document.getElementById('readyShotFrameOverlay');
  if (!el) return false;
  var d = el.style.display || '';
  return d === 'flex' || (d !== 'none' && d !== '');
}

function bindReadyShotFramePhotoImg(host) {
  if (!host) return null;
  var existing = host.querySelector('#readyShotFrameImg');
  if (existing) return existing;
  var imgs = host.querySelectorAll('img');
  var main = null;
  for (var i = 0; i < imgs.length; i++) {
    var el = imgs[i];
    var src = (el.getAttribute('src') || '').toLowerCase();
    if (src.indexOf('logo') !== -1 || src.indexOf('fulllogo') !== -1) continue;
    var st = ((el.getAttribute('style') || '') + ' ' + (el.className || '')).toLowerCase();
    if (st.indexOf('blur(') !== -1) continue;
    if (
      el.classList.contains('kc-photo') ||
      el.classList.contains('bl-photo') ||
      st.indexOf('object-fit:cover') !== -1 ||
      st.indexOf('object-fit: cover') !== -1 ||
      (el.closest && (el.closest('.iss-frame') || el.closest('.sp-photo') || el.closest('.mag-frame') || el.closest('.mag-photo')))
    ) {
      main = el;
      break;
    }
    if (!main) main = el;
  }
  if (!main) {
    for (var j = imgs.length - 1; j >= 0; j--) {
      var s2 = (imgs[j].getAttribute('src') || '').toLowerCase();
      if (s2.indexOf('logo') === -1) { main = imgs[j]; break; }
    }
  }
  if (main) main.id = 'readyShotFrameImg';
  return main;
}

function ensureReadyShotFrameModalDOM() {
  var overlay = document.getElementById('readyShotFrameOverlay');
  if (overlay && overlay.getAttribute('data-frame-v') !== '3') {
    try { overlay.remove(); } catch (e) {}
    overlay = null;
  }
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'readyShotFrameOverlay';
  overlay.setAttribute('data-frame-v', '3');
  // 불투명 단색 배경 (투명/블러 합성 없음)
  overlay.style.cssText = 'display:none; position:fixed; inset:0; z-index:2147483000 !important; background:#0b0f14; justify-content:center; align-items:center; box-sizing:border-box; overscroll-behavior:none; touch-action:none;';
  overlay.innerHTML =
    '<div style="width:100%; max-width:440px; height:100%; margin:0 auto; display:flex; flex-direction:column; box-sizing:border-box; padding:calc(12px + env(safe-area-inset-top, 0px)) 14px calc(14px + env(safe-area-inset-bottom, 0px) + 56px) 14px;">' +
      '<div style="flex-shrink:0; display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">' +
        '<button type="button" onclick="window.closeReadyShotFrameModal(true)" style="height:34px; padding:0 12px; border-radius:17px; background:#1a2230; border:1px solid #334155; color:#e2e8f0; font-size:0.74rem; font-weight:800; cursor:pointer;">닫기</button>' +
        '<span style="font-family:\'Space Grotesk\',sans-serif; font-size:0.78rem; font-weight:900; color:#fff; letter-spacing:0.4px;">사진 위치</span>' +
        '<button type="button" onclick="window.applyReadyShotFrameModal()" style="height:34px; padding:0 14px; border-radius:17px; background:#fff; border:none; color:#000; font-size:0.74rem; font-weight:900; cursor:pointer;">확인</button>' +
      '</div>' +
      '<div id="readyShotFrameStage" style="flex:1; min-height:0; display:flex; align-items:center; justify-content:center; touch-action:none;">' +
        '<div id="readyShotFrameCard" style="position:relative; width:100%; max-width:340px; aspect-ratio:3/4; max-height:100%; border-radius:14px; overflow:hidden; background:#111; box-shadow:0 12px 28px #000000;"></div>' +
      '</div>' +
      '<div style="flex-shrink:0; margin-top:12px; display:flex; gap:8px; width:100%;">' +
        '<button type="button" onclick="window.resetStudioPhotoFraming()" style="flex:1; height:40px; border-radius:10px; background:#1a2230; border:1px solid #334155; color:#e2e8f0; font-size:0.74rem; font-weight:800; cursor:pointer;">초기화</button>' +
        '<button type="button" onclick="window.triggerReadyShotPhotoPicker()" style="flex:1.3; height:40px; border-radius:10px; background:#123048; border:1px solid #38bdf8; color:#7dd3fc; font-size:0.74rem; font-weight:900; cursor:pointer;">사진 바꾸기</button>' +
      '</div>' +
      '<div style="flex-shrink:0; margin-top:8px; text-align:center; font-size:0.62rem; font-weight:700; color:#94a3b8;">템플릿 기준으로 드래그 · 핀치/휠 확대</div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

window.refreshReadyShotFramePreview = function(forceRerender) {
  var host = document.getElementById('readyShotFrameCard');
  if (!host) return;
  var photo = resolveReadyShotDisplayUrl();
  if (!photo) return;

  var mode = window.currentStudioCardMode || 'spread';
  if (STUDIO_MODE_ORDER.indexOf(mode) === -1) mode = 'spread';
  var posX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
  var posY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
  var scale = currentPhotoScaleVal || 1.0;
  var needRerender = !!forceRerender ||
    host.getAttribute('data-frame-mode') !== mode ||
    host.getAttribute('data-frame-photo') !== String(photo) ||
    !host.querySelector('#readyShotFrameImg');

  if (needRerender && typeof window.generateReadyShotMarkup === 'function') {
    var rec = window.currentShareRecord || {};
    var items = window.currentShareItems || rec.items || [];
    var spotVal = (document.getElementById('shareCardSpotInput') || {}).value || rec.spot || '';
    var memoVal = (document.getElementById('shareCardMemoInput') || {}).value || rec.oneLineMemo || rec.memo || '';
    var markup = window.generateReadyShotMarkup(rec, {
      photo: photo,
      mode: mode,
      posX: posX,
      posY: posY,
      scale: scale,
      spot: spotVal,
      date: rec.date || '',
      weightKg: rec.weightKg || '0.00',
      items: items,
      memo: memoVal
    });
    host.innerHTML = markup;
    host.setAttribute('data-frame-mode', mode);
    host.setAttribute('data-frame-photo', String(photo));
    var root = host.firstElementChild;
    if (root && root.style) {
      root.style.maxWidth = '100%';
      root.style.width = '100%';
      root.style.height = '100%';
      root.style.maxHeight = '100%';
      root.style.margin = '0';
      root.style.boxShadow = 'none';
      root.style.borderRadius = '14px';
    }
    bindReadyShotFramePhotoImg(host);
  }

  var img = document.getElementById('readyShotFrameImg') || bindReadyShotFramePhotoImg(host);
  if (!img) return;
  if (img.getAttribute('src') !== photo) img.src = photo;
  img.style.objectPosition = posX + '% ' + posY + '%';
  img.style.transformOrigin = posX + '% ' + posY + '%';
  img.style.transform = 'scale(' + scale + ')';
  img.style.pointerEvents = 'none';
};

window.openReadyShotFrameModal = function() {
  var photo = resolveReadyShotDisplayUrl();
  if (!photo) {
    if (typeof window.triggerReadyShotPhotoPicker === 'function') window.triggerReadyShotPhotoPicker();
    return;
  }
  if (window.currentShareRecord) {
    if (window.currentShareRecord.readyShotPosX !== undefined) window.currentPhotoPosX = window.currentShareRecord.readyShotPosX;
    if (window.currentShareRecord.readyShotPosY !== undefined) window.currentPhotoPosY = window.currentShareRecord.readyShotPosY;
    if (window.currentShareRecord.readyShotScale !== undefined) currentPhotoScaleVal = window.currentShareRecord.readyShotScale;
  }
  __readyShotFrameSnapshot = {
    posX: (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50,
    posY: (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50,
    scale: currentPhotoScaleVal || 1.0,
    photo: window.currentSharePhotoRaw || window.currentSharePhoto || ''
  };
  window.currentCardRatio = '3/4';
  var overlay = ensureReadyShotFrameModalDOM();
  overlay.style.setProperty('display', 'flex', 'important');
  window.refreshReadyShotFramePreview(true);
  var stage = document.getElementById('readyShotFrameCard') || document.getElementById('readyShotFrameStage');
  if (stage) setupStudioPhotoDrag(stage);
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.closeReadyShotFrameModal = function(cancel) {
  teardownStudioPhotoDrag();
  if (cancel && __readyShotFrameSnapshot) {
    window.currentPhotoPosX = __readyShotFrameSnapshot.posX;
    window.currentPhotoPosY = __readyShotFrameSnapshot.posY;
    currentPhotoScaleVal = __readyShotFrameSnapshot.scale;
    if (__readyShotFrameSnapshot.photo) {
      window.currentSharePhoto = __readyShotFrameSnapshot.photo;
      window.currentSharePhotoRaw = __readyShotFrameSnapshot.photo;
    }
  }
  __readyShotFrameSnapshot = null;
  var overlay = document.getElementById('readyShotFrameOverlay');
  if (overlay) overlay.style.setProperty('display', 'none', 'important');
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
  setTimeout(function() { initCardSwipeGesture(); }, 40);
};

window.applyReadyShotFrameModal = function() {
  window.currentShareRecord = window.currentShareRecord || {};
  var persistPhoto = resolveReadyShotPhotoUrl();
  if (persistPhoto) {
    window.currentShareRecord.readyShotPhoto = persistPhoto;
    window.currentShareRecord.ready_shot_photo = persistPhoto;
  } else if (String(window.currentShareRecord.readyShotPhoto || '').indexOf('https://') !== 0) {
    window.currentShareRecord.readyShotPhoto = '';
    window.currentShareRecord.ready_shot_photo = '';
  }
  window.currentShareRecord.readyShotPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
  window.currentShareRecord.readyShotPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
  window.currentShareRecord.readyShotScale = currentPhotoScaleVal || 1.0;
  window.currentShareRecord.readyShotRatio = '3/4';
  window.currentCardRatio = '3/4';
  __readyShotFrameSnapshot = null;
  window.closeReadyShotFrameModal(false);
  if (typeof showToast === 'function') showToast('사진 위치가 적용되었습니다.', 'success', 1400);
  if (typeof triggerHaptic === 'function') triggerHaptic(12);
};

window.switchReadyShotFamily = function(family) {
  var next = (family === 'pamphlet') ? 'pamphlet' : 'photo';
  window.readyShotFamily = next;
  try { localStorage.setItem('romantic_ready_shot_family', next); } catch (e) {}
  syncReadyShotFamilyToggle();
  renderTemplateChips();
  updateShareCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.switchStudioModeFromReadyShot = function(mode) {
  if (mode === 'nrc') mode = 'overlay';
  if (mode === 'packing') mode = 'magazine';
  if (STUDIO_MODE_ORDER.indexOf(mode) === -1) mode = 'spread';
  window.currentStudioCardMode = mode;
  try { localStorage.setItem('romantic_studio_mode', mode); } catch (e) {}
  window.readyShotFamily = 'photo';
  try { localStorage.setItem('romantic_ready_shot_family', 'photo'); } catch (e) {}
  if (window.currentShareRecord) {
    window.currentShareRecord.readyShotMode = mode;
  }
  syncReadyShotFamilyToggle();
  renderTemplateChips();
  updateShareCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(12);
};

window.openReadyShotCropEditor = function() {
  var photo = window.currentSharePhotoRaw || window.currentSharePhoto;
  if (!photo || String(photo).indexOf('https://') !== 0) {
    if (typeof showToast === 'function') showToast('먼저 사진을 넣어주세요.', 'warn');
    return;
  }
  window.openPhotoStudio();
};

// 🔍 [박지 실시간 검색 & 자동완성 전담 엔진 (신규 삽입)]
window.handleSpotSearchInput = function(val) {
  val = val || '';
  var clearBtn = document.getElementById('btnSpotInputClear');
  var dropdown = document.getElementById('spotSearchDropdown');
  if (clearBtn) clearBtn.style.display = (val.trim().length > 0) ? 'flex' : 'none';
  if (!dropdown) return;

  var cleanQ = val.trim().toLowerCase();
  if (!cleanQ) {
    dropdown.style.display = 'none';
    return;
  }

  // 전국지도(map.html), 메인(index.html), 로컬스토리지 전체에서 박지 데이터 확보
  var spotList = [];
  if (typeof spots !== 'undefined' && Array.isArray(spots) && spots.length > 0) spotList = spots;
  else if (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0) spotList = registeredSpots;
  else if (typeof safeGetJSON === 'function') spotList = safeGetJSON('okbm_spots_cache', []);

  var filtered = spotList.filter(function(s) {
    if (!s) return false;
    var sName = (s.name || s.fullName || s.spot_main || '').toLowerCase();
    var sReg = (s.region || s.cityName || '').toLowerCase();
    var sSub = (s.spot_sub || '').toLowerCase();
    return sName.includes(cleanQ) || sReg.includes(cleanQ) || sSub.includes(cleanQ);
  });

  window.selectSpotFromDropdown = function(spotName, elevation) {
    var input = document.getElementById('shareCardSpotInput');
    var clearBtn = document.getElementById('btnSpotInputClear');
    var dropdown = document.getElementById('spotSearchDropdown');

    if (input) {
      input.value = spotName || '';
    }
    if (clearBtn) {
      clearBtn.style.display = (spotName && spotName.trim().length > 0) ? 'flex' : 'none';
    }
    if (dropdown) {
      dropdown.style.display = 'none';
    }

    if (window.currentShareRecord) {
      window.currentShareRecord.spot = spotName || '';
      if (elevation) window.currentShareRecord.elevation = elevation;
    }

    if (typeof updateShareCardLive === 'function') {
      updateShareCardLive();
    }
    if (typeof triggerHaptic === 'function') {
      triggerHaptic(10);
    }
  };

  window.handleSpotSearchItemClick = function(el) {
    if (!el) return;
    var spotName = el.dataset.spot || '';
    var elev = el.dataset.elevation || '';
    window.selectSpotFromDropdown(spotName, elev);
  };

  if (!window.__okbmTemplateSpotClickBound) {
    window.__okbmTemplateSpotClickBound = true;
    document.addEventListener('click', function(e) {
      var item = e.target.closest('#spotSearchDropdown .spot-dropdown-item');
      if (!item) return;
      window.handleSpotSearchItemClick(item);
    }, true);
  }

  dropdown.innerHTML = filtered.slice(0, 12).map(function(s) {
    var displayName = s.fullName || s.name || s.spot_main || '';
    var elevText = s.elevation ? (String(s.elevation).includes('m') ? s.elevation : s.elevation + 'm') : '';
    var regionText = s.region || s.cityName || '전국';
    var safeName = escapeHtml(displayName);
    var safeElev = escapeHtml(elevText);

    return '<div class="spot-dropdown-item" data-spot="' + safeName + '" data-elevation="' + safeElev + '" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; cursor:pointer; box-sizing:border-box;">' +
      '<div style="display:flex; align-items:center; gap:5px; font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; pointer-events:none;">' +
        SVG_ICONS.pin + '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + safeName + '</span>' +
      '</div>' +
      '<div style="font-size:0.62rem; color:#38bdf8; font-weight:700; flex-shrink:0; margin-left:6px; pointer-events:none;">' + escapeHtml(regionText) + (safeElev ? ' · ' + safeElev : '') + '</div>' +
    '</div>';
  }).join('');

  dropdown.style.display = 'block';
};

window.toggleSpotDropdownList = function() {
  var dropdown = document.getElementById('spotSearchDropdown');
  var input = document.getElementById('shareCardSpotInput');
  if (!dropdown) return;
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
  } else {
    window.handleSpotSearchInput(input ? input.value : '');
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.clearSpotSearchInput = function() {
  var input = document.getElementById('shareCardSpotInput');
  var clearBtn = document.getElementById('btnSpotInputClear');
  var dropdown = document.getElementById('spotSearchDropdown');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.style.display = 'none';
  if (dropdown) dropdown.style.display = 'none';
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.sharePackCardDirect = async function() {
  var btn = document.getElementById('btnShareCardShareTop');
  var prevHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.7';
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(15);
  if (typeof showToast === 'function') showToast('레디샷 이미지를 준비 중입니다...', 'info', 1600);

  try {
    var canvas = await captureReadyShotShareCanvas();
    var blob = await canvasToShareBlob(canvas);
    window.openReadyShotShareSheet(blob);
  } catch (err) {
    console.warn('[templates.js:sharePackCardDirect]', err);
    if (typeof showToast === 'function') showToast('카드 생성 중 오류가 발생했습니다.', 'warn');
  } finally {
    if (btn) {
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
      if (prevHtml) btn.innerHTML = prevHtml;
    }
  }
};

window.saveCardToVaultAndOpenBasecamp = async function() {
  if (window.__isSavingCardLock) return;

  window.__isSavingCardLock = true;

  var vaultBtn = document.getElementById('btnSaveCardToVault');
  var prevVaultHtml = vaultBtn ? vaultBtn.innerHTML : '';
  if (vaultBtn) {
    vaultBtn.style.pointerEvents = 'none';
    vaultBtn.style.opacity = '0.75';
    vaultBtn.innerHTML = '<span>보관함 등록 중...</span>';
  }

  try {
    var hadPendingPhoto = Boolean(window.__readyShotUploadPromise || window.__readyShotPreviewBlobUrl);

    // 압축+업로드가 끝날 때까지 모달을 유지하고 HTTPS만 확보. 화면 사진은 건드리지 않음.
    if (window.__readyShotUploadPromise && typeof window.__readyShotUploadPromise.then === 'function') {
      try {
        var pendingUrl = await window.__readyShotUploadPromise;
        if (pendingUrl && String(pendingUrl).indexOf('https://') === 0 &&
            window.currentShareRecord && typeof window.currentShareRecord.then !== 'function') {
          window.currentShareRecord.readyShotPhoto = pendingUrl;
          window.currentShareRecord.ready_shot_photo = pendingUrl;
        }
      } catch (waitErr) {
        console.warn('[templates.js:saveCardToVault wait upload]', waitErr);
      }
    }

    var memoInput = document.getElementById('shareCardMemoInput');

    var liveSpot = (window.currentShareRecord && window.currentShareRecord.spot)
      ? String(window.currentShareRecord.spot).trim()
      : '';

    var liveMemo = (memoInput && memoInput.value.trim().length > 0)
      ? memoInput.value.trim()
      : (window.currentShareRecord && window.currentShareRecord.oneLineMemo ? window.currentShareRecord.oneLineMemo : '');

    var now = new Date();
    var cleanDateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

    var rec = window.currentShareRecord || {};
    var items = (Array.isArray(window.currentShareItems) && window.currentShareItems.length > 0) ? window.currentShareItems : (rec.items || []);

    if (items.length === 0 && window.selectedGearMap) {
      Object.keys(window.selectedGearMap).forEach(function(catId) {
        (window.selectedGearMap[catId] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) {
            items.push({
              name: it.name || it.itemName,
              weight: Number(it.weight || it.weight_g || 0)
            });
          }
        });
      });
    }

    var totalGrams = items.reduce(function(sum, g) { return sum + Number(g.weight || 0); }, 0);
    var weightKg = (totalGrams > 0) ? (totalGrams / 1000).toFixed(2) : (rec.weightKg || '0.00');

    var fieldPhotos = [];
    if (Array.isArray(rec.photos) && rec.photos.length > 0) {
      fieldPhotos = rec.photos.filter(function(u) {
        return typeof u === 'string' && u.startsWith('https://');
      });
    }

    var finalReadyShot = resolveReadyShotPhotoUrl();
    if (!finalReadyShot && rec.readyShotPhoto && String(rec.readyShotPhoto).indexOf('https://') === 0) {
      finalReadyShot = String(rec.readyShotPhoto).trim();
    }

    if ((window.readyShotFamily || 'photo') === 'photo' && hadPendingPhoto && !finalReadyShot) {
      if (typeof showToast === 'function') {
        showToast('사진 업로드가 끝나지 않았습니다. 잠시 후 다시 시도해주세요.', 'warn', 2400);
      }
      return;
    }

    var newRecord = {
      id: rec.id || ('pack_' + Date.now()),
      date: rec.date || cleanDateStr,
      spot: liveSpot,
      memo: rec.memo || liveMemo || '',
      oneLineMemo: liveMemo || (liveSpot ? (liveSpot + ' 패킹') : '기록 준비 완료'),
      photoMemos: Array.isArray(rec.photoMemos) ? rec.photoMemos : [],
      elevation: rec.elevation || '',
      weightKg: weightKg,
      weightGrams: totalGrams || rec.weightGrams || 0,
      itemCount: items.length,
      items: items,
      photos: fieldPhotos,
      readyShotPhoto: finalReadyShot,
      readyShotMode: (window.readyShotFamily === 'pamphlet')
        ? 'pamphlet'
        : (window.currentStudioCardMode || rec.readyShotMode || 'spread'),
      readyShotPosX: (rec.readyShotPosX !== undefined) ? rec.readyShotPosX : ((window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50),
      readyShotPosY: (rec.readyShotPosY !== undefined) ? rec.readyShotPosY : ((window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50),
      readyShotScale: rec.readyShotScale || currentPhotoScaleVal || 1.0,
      readyShotRatio: rec.readyShotRatio || window.currentCardRatio || '3/4',
      templateId: window.selectedTemplateId || selectedTemplateId || rec.templateId || 1,
      isPublished: false,
      unregisteredSpot: false
    };

    if (typeof window.okbmCanPublishFeed === 'function') {
      newRecord.isPublished = window.okbmCanPublishFeed(newRecord, { skipDate: true });
      if (!newRecord.isPublished && typeof window.isSpotRegisteredInMasterDB === 'function' &&
          !window.isSpotRegisteredInMasterDB(String(newRecord.spot || '').trim())) {
        newRecord.unregisteredSpot = true;
      }
    } else if (fieldPhotos.length > 0 && typeof window.isSpotRegisteredInMasterDB === 'function' &&
        window.isSpotRegisteredInMasterDB(String(newRecord.spot || '').trim())) {
      newRecord.isPublished = true;
    }

    var savedRec = null;
    if (typeof window.savePackingHistoryRecord === 'function') {
      savedRec = await window.savePackingHistoryRecord(newRecord);
    }
    if (savedRec && savedRec.__serverSaveFailed) {
      if (typeof showToast === 'function') {
        showToast('보관함 저장에 실패했습니다. 네트워크를 확인하고 다시 시도해주세요.', 'warn', 2600);
      }
      return;
    }

    window.__studioMultiPhotos = null;

    if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
    if (typeof closePackShareModal === 'function') closePackShareModal();

    if (typeof showToast === 'function') {
      showToast('✓ 보관함에 등록되었습니다.', 'success', 2200);
    }
    if (typeof triggerHaptic === 'function') triggerHaptic(15);
  } catch (err) {
    console.warn('[templates.js:saveCardToVaultAndOpenBasecamp]', err);
    if (typeof showToast === 'function') {
      showToast('보관함 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'warn', 2400);
    }
  } finally {
    if (vaultBtn) {
      vaultBtn.style.pointerEvents = '';
      vaultBtn.style.opacity = '';
      vaultBtn.innerHTML = prevVaultHtml || '<span>낭만보관함에 저장</span>';
    }
    setTimeout(function() { window.__isSavingCardLock = false; }, 1200);
  }
};

function safeGetJSON(key, defaultVal) {
  try {
    var v = localStorage.getItem(key);
    return v ? JSON.parse(v) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function ensurePackShareModalDOM() {
  var modal = document.getElementById('packShareModalOverlay');
  if (modal && document.getElementById('packShareCaptureArea') && document.getElementById('readyShotFamilyToggle') && document.getElementById('readyShotSpotVaultRow') && document.getElementById('shareCardPhotoInput') && document.getElementById('shareCardPhotoInputLabel') && document.getElementById('btnShareCardShareTop') && document.getElementById('btnSaveCardToVault') && document.getElementById('readyShotBottomSpacer')) {
    // 독 높이와 하단 여백을 항상 동기화 (기존 모달 재사용 시 틈 방지)
    modal.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 0px))', 'important');
    var reuseInput = document.getElementById('shareCardPhotoInput');
    if (reuseInput) {
      reuseInput.style.cssText = 'position:fixed; left:-100vw; top:0; width:1px; height:1px; opacity:0; overflow:hidden; pointer-events:none;';
    }
    return modal;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'packShareModalOverlay';
    modal.className = 'custom-modal-overlay active';
    document.body.appendChild(modal);
  }

  modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 0px)) !important; width:100%; background:#07090e; z-index:2000010 !important; justify-content:center; align-items:stretch; padding:0 !important; margin:0 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; box-sizing:border-box; transform:translateZ(0); -webkit-transform:translateZ(0);';

  modal.innerHTML = `
    <div style="width:100%; max-width:440px; margin:0 auto; min-height:100%; display:flex; flex-direction:column; justify-content:flex-start; gap:10px; padding:calc(8px + env(safe-area-inset-top, 0px)) 12px 0 12px; box-sizing:border-box; position:relative;">
      
      <div style="flex-shrink:0; display:flex; flex-direction:column; gap:5px; width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; height:32px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px; display:block; flex-shrink:0;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/><line x1="3" x2="21" y1="9" y2="9"/></svg>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff; font-family:'Space Grotesk', -apple-system, sans-serif; letter-spacing:0.5px;">READY SHOT</span>
          </div>
          <button type="button" onclick="window.closePackShareModal();" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
        </div>

        <div id="readyShotSpotVaultRow" style="display:flex; gap:5px; width:100%; align-items:center; box-sizing:border-box;">
          <div style="flex:7; min-width:0; position:relative; display:flex; align-items:center;">
            <div style="position:absolute; left:9px; pointer-events:none; display:flex; align-items:center; justify-content:center; z-index:2;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div id="shareCardSpotLabel" style="width:100%; height:32px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:8px; color:#e2e8f0; font-size:0.75rem; font-weight:800; padding:0 10px 0 26px; box-sizing:border-box; display:flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="장소는 패킹계획에서 설정됩니다">장소 미설정</div>
          </div>
          <button type="button" id="btnSaveCardToVault" onclick="window.saveCardToVaultAndOpenBasecamp();" style="flex:3; min-width:0; height:32px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:1px solid #38bdf8; color:#ffffff; font-size:0.68rem; font-weight:900; padding:0 6px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(2,132,199,0.35); box-sizing:border-box; white-space:nowrap;">
            <span>낭만보관함에 저장</span>
          </button>
        </div>

        <div style="display:flex; gap:5px; width:100%; align-items:center; min-width:0;">
          <input type="text" id="shareCardMemoInput" placeholder="한줄 메모 (선택)" oninput="if(typeof updateShareCardLive==='function') updateShareCardLive();" style="flex:1; min-width:0; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:0.75rem; padding:0 10px; outline:none; box-sizing:border-box;" />
          <button type="button" id="btnShareCardShareTop" onclick="window.sharePackCardDirect();" style="height:32px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.72rem; font-weight:900; padding:0 10px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0; white-space:nowrap; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>공유하기</span>
          </button>
        </div>

        <div id="readyShotFamilyToggle" class="ready-shot-family-toggle">
          <button type="button" id="btnReadyShotFamilyPhoto" class="ready-shot-family-btn active" onclick="window.switchReadyShotFamily('photo')">사진</button>
          <button type="button" id="btnReadyShotFamilyPamphlet" class="ready-shot-family-btn" onclick="window.switchReadyShotFamily('pamphlet')">팜플렛</button>
        </div>

        <div id="templateSelectorBar" class="template-selector-bar"></div>
        <input type="file" id="shareCardPhotoInput" accept="image/*,.heic,.heif" style="position:fixed; left:-100vw; top:0; width:1px; height:1px; opacity:0; overflow:hidden; pointer-events:none;" onchange="window.handleShareCardPhotoUpload(event)" />
        <label id="shareCardPhotoInputLabel" for="shareCardPhotoInput" style="position:absolute; width:1px; height:1px; overflow:hidden;">사진 선택</label>
      </div>

      <div style="flex-shrink:0; width:100%; display:flex; align-items:center; justify-content:center; padding:2px 0; box-sizing:border-box;">
        <div id="packShareCaptureArea" style="width:100%; max-width:330px; display:flex; align-items:center; justify-content:center; transition:transform 0.2s ease, opacity 0.2s ease;"></div>
      </div>

      <div id="readyShotBottomSpacer" style="flex-shrink:0; width:100%; height:calc(28px + env(safe-area-inset-bottom, 0px)); pointer-events:none;" aria-hidden="true"></div>
    </div>
  `;

  return modal;
}

window.handleShareCardPhotoUpload = async function(e) {
  var files = e.target.files;
  if (!files || files.length === 0) return;

  var file = files[0];
  e.target.value = '';

  var jobId = (window.__readyShotJobId = (window.__readyShotJobId || 0) + 1);
  if (typeof window.__readyShotUploadResolve === 'function') {
    try { window.__readyShotUploadResolve(''); } catch (ePrevGate) {}
    window.__readyShotUploadResolve = null;
  }
  var gateResolve;
  window.__readyShotUploadPromise = new Promise(function(resolve) {
    gateResolve = resolve;
  });
  window.__readyShotUploadResolve = gateResolve;

  function finishReadyShotGate(url) {
    if (jobId !== window.__readyShotJobId) return;
    var out = (url && String(url).indexOf('https://') === 0) ? String(url) : '';
    if (window.__readyShotUploadResolve === gateResolve) {
      window.__readyShotUploadResolve = null;
      window.__readyShotUploadPromise = null;
    }
    try { gateResolve(out); } catch (eGate) {}
  }

  if (typeof window.showPhotoLoadingModal === 'function') {
    window.showPhotoLoadingModal(1, 1);
  }

  function applyReadyShotLocalPreview(url) {
    window.__studioMultiPhotos = null;
    window.currentSharePhoto = url;
    window.currentSharePhotoRaw = url;
    window.currentPhotoPosX = 50;
    window.currentPhotoPosY = 50;
    currentPhotoScaleVal = 1.0;
    window.currentCardRatio = '3/4';
    if (!window.currentShareRecord || typeof window.currentShareRecord.then === 'function') {
      window.currentShareRecord = {
        id: 'pack_' + Date.now(),
        date: '',
        spot: '',
        items: window.currentShareItems || [],
        photos: []
      };
    }
    window.currentShareRecord.readyShotPhoto = '';
    window.currentShareRecord.ready_shot_photo = '';
    window.currentShareRecord.readyShotMode = window.currentStudioCardMode || 'spread';
    window.currentShareRecord.readyShotPosX = 50;
    window.currentShareRecord.readyShotPosY = 50;
    window.currentShareRecord.readyShotScale = 1.0;
    window.currentShareRecord.readyShotRatio = '3/4';
    window.readyShotFamily = 'photo';
    try { localStorage.setItem('romantic_ready_shot_family', 'photo'); } catch (e2) {}
    syncReadyShotFamilyToggle();
    if (typeof updateShareCardLive === 'function') updateShareCardLive();
    if (typeof isReadyShotFrameModalOpen === 'function' && isReadyShotFrameModalOpen()) {
      if (__readyShotFrameSnapshot) {
        __readyShotFrameSnapshot.photo = url;
        __readyShotFrameSnapshot.posX = 50;
        __readyShotFrameSnapshot.posY = 50;
        __readyShotFrameSnapshot.scale = 1.0;
      }
      if (typeof window.refreshReadyShotFramePreview === 'function') window.refreshReadyShotFramePreview(true);
      var frameStage = document.getElementById('readyShotFrameCard') || document.getElementById('readyShotFrameStage');
      if (frameStage) setupStudioPhotoDrag(frameStage);
    } else {
      setTimeout(function() {
        initCardSwipeGesture();
        scrollReadyShotCardIntoView();
      }, 100);
    }
  }

  try {
    var blob = null;
    if (typeof window.processSinglePhotoSmart === 'function') {
      blob = await window.processSinglePhotoSmart(file, { maxDim: 1200, quality: 0.82 });
    }
    if (!blob && file && typeof createImageBitmap === 'function') {
      try {
        var bmp = await createImageBitmap(file);
        var maxLen = Math.max(bmp.width || 1, bmp.height || 1);
        var fit = Math.min(1, 1200 / maxLen);
        var cw = Math.max(1, Math.round((bmp.width || 1) * fit));
        var ch = Math.max(1, Math.round((bmp.height || 1) * fit));
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(bmp, 0, 0, cw, ch);
          blob = await new Promise(function(resolve) {
            canvas.toBlob(function(out) { resolve(out || null); }, 'image/jpeg', 0.82);
          });
        }
        if (bmp && typeof bmp.close === 'function') {
          try { bmp.close(); } catch (eCloseBmp) {}
        }
      } catch (eBmp) {}
    }
    if (jobId !== window.__readyShotJobId) return;
    if (!blob) {
      if (typeof window.hidePhotoLoadingModal === 'function') window.hidePhotoLoadingModal();
      if (typeof showToast === 'function') showToast('사진 변환에 실패했습니다.', 'warn');
      finishReadyShotGate('');
      return;
    }

    if (window.__readyShotPreviewBlobUrl) {
      try { URL.revokeObjectURL(window.__readyShotPreviewBlobUrl); } catch (eRev0) {}
      window.__readyShotPreviewBlobUrl = '';
    }
    var previewBlobUrl = URL.createObjectURL(blob);
    window.__readyShotPreviewBlobUrl = previewBlobUrl;
    await decodeReadyShotImage(previewBlobUrl);
    if (jobId !== window.__readyShotJobId) {
      try { URL.revokeObjectURL(previewBlobUrl); } catch (eRevJob) {}
      return;
    }

    applyReadyShotLocalPreview(previewBlobUrl);
    if (typeof window.hidePhotoLoadingModal === 'function') window.hidePhotoLoadingModal();
    if (typeof showToast === 'function') showToast('사진이 적용되었습니다.', 'success', 1600);

    var uploadFn = (typeof window.uploadCompressedPhotoToR2 === 'function')
      ? window.uploadCompressedPhotoToR2
      : null;
    var uploadedUrl = uploadFn ? await uploadFn(blob, 'ready') : '';
    if (jobId !== window.__readyShotJobId) return;

    if (uploadedUrl && uploadedUrl.indexOf('https://') === 0) {
      commitReadyShotHttpsUrl(uploadedUrl);
      finishReadyShotGate(uploadedUrl);
    } else {
      if (typeof showToast === 'function') {
        showToast('업로드에 실패했습니다. 미리보기만 유지됩니다. 다시 선택해 주세요.', 'warn', 2800);
      }
      finishReadyShotGate('');
    }
  } catch (upErr) {
    console.warn('[templates.js:handleShareCardPhotoUpload]', upErr);
    finishReadyShotGate('');
    if (typeof window.hidePhotoLoadingModal === 'function') window.hidePhotoLoadingModal();
    if (typeof showToast === 'function') showToast('사진 업로드에 실패했습니다. 네트워크를 확인해주세요.', 'warn');
  }
};

window.closePackShareModal = function() {
  teardownCardSwipeGesture();
  teardownStudioPhotoDrag();
  closeReadyShotShareSheet();
  if (window.__readyShotPreviewBlobUrl) {
    try { URL.revokeObjectURL(window.__readyShotPreviewBlobUrl); } catch (eRevClose) {}
    window.__readyShotPreviewBlobUrl = '';
  }
  if (typeof window.__readyShotUploadResolve === 'function') {
    try { window.__readyShotUploadResolve(resolveReadyShotPhotoUrl() || ''); } catch (eGateClose) {}
    window.__readyShotUploadResolve = null;
  }
  window.__readyShotUploadPromise = null;
  var frameOverlay = document.getElementById('readyShotFrameOverlay');
  if (frameOverlay) frameOverlay.style.setProperty('display', 'none', 'important');
  var modal = document.getElementById('packShareModalOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
  }
  document.body.classList.remove('pack-share-open');
  window.syncGlobalModalScrollLock();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.openPackShareModal = function(record, items, forceStudio) {
  if (record && typeof record.then === 'function') {
    record = (window.currentShareRecord && typeof window.currentShareRecord.then !== 'function')
      ? window.currentShareRecord
      : null;
  }
  var modal = ensurePackShareModalDOM();
  if (modal) {
    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2000010', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    modal.style.setProperty('opacity', '1', 'important');
    modal.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 0px))', 'important');
  }
  document.body.style.overflow = 'hidden';

  currentShareRecord = record || {
    id: 'pack_' + Date.now(),
    date: new Date().toLocaleDateString(),
    weightKg: '0.00',
    weightGrams: 0,
    items: []
  };
  window.currentShareRecord = currentShareRecord;

  var candidateItems = (Array.isArray(items) && items.length > 0) ? items : (currentShareRecord.items || currentShareRecord.gears || []);
  currentShareItems = candidateItems.map(function(item) {
    if (typeof item === 'object' && item !== null) {
      return {
        name: item.name || item.itemName || '',
        weight: Number(item.weight || item.weight_g || 0),
        categoryId: item.categoryId || item.category_id || item.category || '',
        brand: item.brand || ''
      };
    }
    var str = String(item || '');
    var m = str.match(/^(.*?)\s*\((\d+)g\)$/);
    return m ? { name: m[1], weight: parseInt(m[2], 10) } : { name: str, weight: 0 };
  });

  if (currentShareItems.length === 0 && window.selectedGearMap) {
    Object.keys(window.selectedGearMap).forEach(function(catId) {
      (window.selectedGearMap[catId] || []).forEach(function(it) {
        if (it && (it.name || it.itemName)) {
          currentShareItems.push({
            name: it.name || it.itemName,
            weight: Number(it.weight || it.weight_g || 0),
            categoryId: catId,
            brand: it.brand || ''
          });
        }
      });
    });
  }

  var totalGramsCalc = currentShareItems.reduce(function(sum, g) { return sum + Number(g.weight || 0); }, 0);
  window.currentShareItems = currentShareItems;
  if (!currentShareRecord.weightKg || currentShareRecord.weightKg === 'undefined' || currentShareRecord.weightKg === '0.00') {
    currentShareRecord.weightKg = (totalGramsCalc > 0) ? (totalGramsCalc / 1000).toFixed(2) : '0.00';
  }
  if (!currentShareRecord.weightGrams) {
    currentShareRecord.weightGrams = totalGramsCalc;
  }

  currentSharePhoto = currentShareRecord.readyShotPhoto || currentShareRecord.ready_shot_photo || '';
  window.currentSharePhoto = currentSharePhoto;
  window.currentSharePhotoRaw = currentSharePhoto;
  currentPhotoTextColor = currentShareRecord.textColor || 'white';
  currentCardRatio = '3/4';
  window.currentCardRatio = '3/4';
  currentShareRecord.readyShotRatio = '3/4';

  if (currentShareRecord.readyShotPosX !== undefined) window.currentPhotoPosX = currentShareRecord.readyShotPosX;
  if (currentShareRecord.readyShotPosY !== undefined) window.currentPhotoPosY = currentShareRecord.readyShotPosY;
  if (currentShareRecord.readyShotScale !== undefined) currentPhotoScaleVal = currentShareRecord.readyShotScale;

  var savedMode = '';
  try { savedMode = localStorage.getItem('romantic_studio_mode') || ''; } catch (e) {}
  var recordMode = currentShareRecord.readyShotMode || currentShareRecord.ready_shot_mode || '';
  var modeCandidate = recordMode || savedMode || 'spread';
  if (modeCandidate === 'nrc') modeCandidate = 'overlay';
  if (modeCandidate === 'packing') modeCandidate = 'magazine';
  if (STUDIO_MODE_ORDER.indexOf(modeCandidate) === -1) modeCandidate = 'spread';
  window.currentStudioCardMode = modeCandidate;

  var savedFamily = '';
  try { savedFamily = localStorage.getItem('romantic_ready_shot_family') || ''; } catch (e) {}
  window.readyShotFamily = (savedFamily === 'pamphlet') ? 'pamphlet' : 'photo';

  var spotLabel = document.getElementById('shareCardSpotLabel');
  var memoInput = document.getElementById('shareCardMemoInput');

 // 🛡️ [하드코딩 박멸]: 박지 미입력 시 '나의 힐링 스팟', 각오/메모 미입력 시 완전 공백('')
  var autoSpot = currentShareRecord.spot || '';
  var targetDateStr = currentShareRecord.date || window.activeSelectedDateKey || '';

  if (!autoSpot && window.currentLuckySpot && window.currentLuckySpot.name) {
    autoSpot = window.currentLuckySpot.name;
    if (window.currentLuckySpot.elevation) currentShareRecord.elevation = window.currentLuckySpot.elevation;
  }
  if (!autoSpot && targetDateStr) {
    var pSpots = (typeof safeGetJSON === 'function') ? safeGetJSON('okbm_plan_spots', {}) : {};
    var planEntry = pSpots[targetDateStr];
    if (Array.isArray(planEntry) && planEntry[0] && planEntry[0].name) {
      autoSpot = planEntry[0].name;
      if (planEntry[0].elevation) currentShareRecord.elevation = planEntry[0].elevation;
    } else if (planEntry && planEntry.name) {
      autoSpot = planEntry.name;
      if (planEntry.elevation) currentShareRecord.elevation = planEntry.elevation;
    }
  }
  if (!autoSpot && targetDateStr) {
    var pMemos = (typeof safeGetJSON === 'function') ? safeGetJSON('okbm_plan_memos', {}) : {};
    var rawM = String(pMemos[targetDateStr] || '').trim();
    if (rawM) {
      var mMatch = rawM.match(/(?:📍|\[목적지\]|목적지:\s*|장소:\s*)?([^\n\r()]+)(?:\(([^)]+)\))?/);
      if (mMatch && mMatch[1] && mMatch[1].trim().length > 1) {
        autoSpot = mMatch[1].trim();
        if (mMatch[2]) currentShareRecord.elevation = mMatch[2].trim();
      }
    }
  }

  currentShareRecord.spot = autoSpot || '나의 힐링 스팟';
  currentShareRecord.oneLineMemo = currentShareRecord.oneLineMemo || '';
  currentShareRecord.readyShotMode = window.currentStudioCardMode;

  if (spotLabel) {
    spotLabel.textContent = currentShareRecord.spot;
  }
  if (memoInput) {
    memoInput.value = currentShareRecord.oneLineMemo || '';
  }

  var savedTmpl = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
  selectedTemplateId = TEMPLATE_ORDER.indexOf(savedTmpl) !== -1 ? savedTmpl : TEMPLATE_ORDER[0];
  window.selectedTemplateId = selectedTemplateId;

  document.body.classList.add('pack-share-open');
  syncReadyShotFamilyToggle();
  syncReadyShotPhotoButtons();
  renderTemplateChips();
  updateShareCardLive();

  if (__cardSwipeInitTimer) {
    clearTimeout(__cardSwipeInitTimer);
    __cardSwipeInitTimer = null;
  }
  __cardSwipeInitTimer = setTimeout(function() {
    __cardSwipeInitTimer = null;
    initCardSwipeGesture();
  }, 60);
};

var openPackShareModal = window.openPackShareModal;
// 🏷️ 3. 템플릿 전환 & 상단 칩/이름 실시간 동기화
function switchShareCardTemplate(tmplId, isSwipe) {
  var targetId = Number(tmplId);
  if (TEMPLATE_ORDER.indexOf(targetId) === -1) {
    targetId = TEMPLATE_ORDER[0];
  }

  selectedTemplateId = targetId;
  window.selectedTemplateId = targetId;
  localStorage.setItem('romantic_selected_template', targetId);
  window.readyShotFamily = 'pamphlet';
  try { localStorage.setItem('romantic_ready_shot_family', 'pamphlet'); } catch (e) {}
  syncReadyShotFamilyToggle();

  var chips = document.querySelectorAll('.tmpl-chip-btn, [data-tmpl]');
  if (chips.length === 0) {
    renderTemplateChips();
    chips = document.querySelectorAll('.tmpl-chip-btn, [data-tmpl]');
  }

  chips.forEach(function(btn) {
    var bId = Number(btn.getAttribute('data-tmpl'));
    var isActive = (bId === selectedTemplateId);
    btn.classList.toggle('active', isActive);
  });
  scrollActiveReadyShotChipIntoView();

  // 🛡️ 헤더 타이틀은 항상 READY SHOT으로 고정 (템플릿 이름 덮어쓰기 완전 제거)

  updateShareCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(12);
}

// 🖼️ 4. 카드 실시간 화면 갱신
function updateShareCardLive() {
  var container = document.getElementById('packShareCaptureArea');
  if (!container) return;
  container.style.transition = 'none';
  container.style.transform = 'translateX(0px) rotate(0deg)';
  container.style.opacity = '1';
  var memoInput = document.getElementById('shareCardMemoInput');
  var spotVal = (window.currentShareRecord && window.currentShareRecord.spot)
    ? String(window.currentShareRecord.spot).trim()
    : '';
  var memoVal = (memoInput && memoInput.value) ? memoInput.value.trim() : '';
  var family = window.readyShotFamily || 'photo';

  container.className = 'share-card-container';
  syncReadyShotPhotoButtons();

  if (family === 'photo') {
    var rec = window.currentShareRecord || currentShareRecord || {};
    var items = (Array.isArray(window.currentShareItems) && window.currentShareItems.length > 0)
      ? window.currentShareItems
      : (rec.items || []);
    var photoUrl = resolveReadyShotDisplayUrl();
    var hasPhoto = !!photoUrl;
    if (!photoUrl) photoUrl = READY_SHOT_PLACEHOLDER_PHOTO;
    var mode = window.currentStudioCardMode || rec.readyShotMode || 'spread';
    if (STUDIO_MODE_ORDER.indexOf(mode) === -1) mode = 'spread';

    var markup = window.generateReadyShotMarkup(rec, {
      photo: photoUrl,
      mode: mode,
      posX: (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : (rec.readyShotPosX !== undefined ? rec.readyShotPosX : 50),
      posY: (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : (rec.readyShotPosY !== undefined ? rec.readyShotPosY : 50),
      scale: currentPhotoScaleVal || rec.readyShotScale || 1.0,
      spot: spotVal,
      date: rec.date || '',
      weightKg: rec.weightKg || '0.00',
      items: items,
      memo: memoVal
    });

    container.innerHTML = markup;
    if (!hasPhoto) attachReadyShotEmptyPhotoHit(container);
    setTimeout(function() { initCardSwipeGesture(); }, 30);
    return;
  }

  container.innerHTML = generateCardMarkup(selectedTemplateId, currentShareRecord, currentShareItems, spotVal, memoVal);
  setTimeout(function() { initCardSwipeGesture(); }, 30);
}

// 🖐️ 5. 카드 좌우 스와이프 제스처 인터랙션 엔진 (확정 순서에 따른 이전/다음 순환)
var cardTouchStartX = 0;
var cardTouchStartY = 0;
var cardTouchStartTime = 0;
var isCardSwiping = false;
var isCardPointerDown = false;
var __cardIgnoreMouseUntil = 0;
var __cardSkipClickUntil = 0;

var __cardSwipeAbort = null;
var __cardSwipeCleanup = null;
var __cardSwipeInitTimer = null;

function teardownCardSwipeGesture() {
  if (__cardSwipeInitTimer) {
    clearTimeout(__cardSwipeInitTimer);
    __cardSwipeInitTimer = null;
  }
  if (__cardSwipeAbort) {
    try { __cardSwipeAbort.abort(); } catch (e) {}
    __cardSwipeAbort = null;
  }
  if (typeof __cardSwipeCleanup === 'function') {
    try { __cardSwipeCleanup(); } catch (e) {}
    __cardSwipeCleanup = null;
  }
  isCardPointerDown = false;
  isCardSwiping = false;
}

initCardSwipeGesture = function() {
  var card = document.getElementById('packShareCaptureArea');
  teardownCardSwipeGesture();
  if (!card) return;

  var ac = (typeof AbortController === 'function') ? new AbortController() : null;
  __cardSwipeAbort = ac;
  var swipeSignal = ac ? ac.signal : undefined;

  card.style.userSelect = 'none';
  card.style.webkitUserSelect = 'none';
  card.style.touchAction = 'pan-y';
  card.style.cursor = 'grab';

  function eventFromPhotoLabel(e) {
    var t = e && e.target;
    if (!t) return false;
    if (t.closest) {
      return !!(
        t.closest('label[for="shareCardPhotoInput"]') ||
        t.closest('input[type="file"]') ||
        t.closest('label[for="studioPhotoUpload"]') ||
        t.closest('#shareCardPhotoInput') ||
        t.closest('#studioPhotoUpload')
      );
    }
    return false;
  }

  function eventFromInteractive(e) {
    var t = e && e.target;
    if (!t || !t.closest) return false;
    if (t.closest('#readyShotEmptyPhotoHit')) return false;
    return !!(t.closest('button, a, input, textarea, select, label, [role="button"]'));
  }

  function resetCardMotion() {
    card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';
    card.style.transform = 'translateX(0px) rotate(0deg)';
    card.style.opacity = '1';
    card.style.cursor = 'grab';
  }

  function handleStart(x, y) {
    if (typeof isReadyShotFrameModalOpen === 'function' && isReadyShotFrameModalOpen()) return;
    isCardPointerDown = true;
    isCardSwiping = false;
    cardTouchStartX = x;
    cardTouchStartY = y;
    cardTouchStartTime = Date.now();
    card.style.transition = 'none';
    card.style.cursor = 'grabbing';
  }

  function handleMove(x, y) {
    if (!isCardPointerDown) return;
    var dx = x - cardTouchStartX;
    var dy = y - cardTouchStartY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      isCardPointerDown = false;
      isCardSwiping = false;
      resetCardMotion();
      return;
    }
    if (!isCardSwiping && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      isCardSwiping = true;
    }
    if (isCardSwiping) {
      card.style.transform = 'translateX(' + (dx * 0.42) + 'px) rotate(' + (dx * 0.02) + 'deg)';
      card.style.opacity = String(Math.max(0.55, 1 - (Math.abs(dx) / 520)));
    }
  }

  function handleEnd(x, y) {
    if (!isCardPointerDown && !isCardSwiping) return;
    isCardPointerDown = false;
    var dx = x - cardTouchStartX;
    var dy = y - cardTouchStartY;
    var absDx = Math.abs(dx);
    var absDy = Math.abs(dy);
    var elapsed = Date.now() - cardTouchStartTime;
    var wasSwipe = isCardSwiping;
    isCardSwiping = false;
    card.style.cursor = 'grab';
    card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';

    if (wasSwipe && (absDx > 36 || (absDx > 18 && elapsed < 280)) && absDx > absDy * 1.1) {
      __cardSkipClickUntil = Date.now() + 600;
      card.style.transition = 'none';
      card.style.transform = 'translateX(0px) rotate(0deg)';
      card.style.opacity = '1';
      var family = window.readyShotFamily || 'photo';
      if (family === 'photo') {
        var modeIdx = STUDIO_MODE_ORDER.indexOf(window.currentStudioCardMode || 'spread');
        if (modeIdx === -1) modeIdx = 0;
        var nextMode = (dx < 0)
          ? STUDIO_MODE_ORDER[(modeIdx + 1) % STUDIO_MODE_ORDER.length]
          : STUDIO_MODE_ORDER[(modeIdx - 1 + STUDIO_MODE_ORDER.length) % STUDIO_MODE_ORDER.length];
        window.switchStudioModeFromReadyShot(nextMode);
      } else {
        var tmplIdx = TEMPLATE_ORDER.indexOf(selectedTemplateId);
        if (tmplIdx === -1) tmplIdx = 0;
        var nextTmpl = (dx < 0)
          ? TEMPLATE_ORDER[(tmplIdx + 1) % TEMPLATE_ORDER.length]
          : TEMPLATE_ORDER[(tmplIdx - 1 + TEMPLATE_ORDER.length) % TEMPLATE_ORDER.length];
        switchShareCardTemplate(nextTmpl, true);
      }
      return;
    }

    resetCardMotion();

    if (!wasSwipe && absDx < 10 && absDy < 10 && elapsed < 450) {
      if ((window.readyShotFamily || 'photo') !== 'photo') return;
      if (resolveReadyShotDisplayUrl()) {
        __cardSkipClickUntil = Date.now() + 600;
        if (typeof openReadyShotFrameModal === 'function') openReadyShotFrameModal();
      }
    }
  }

  function onCardClick(e) {
    if (Date.now() < __cardSkipClickUntil) return;
    if (eventFromPhotoLabel(e) || eventFromInteractive(e)) return;
    if (typeof isReadyShotFrameModalOpen === 'function' && isReadyShotFrameModalOpen()) return;
    if ((window.readyShotFamily || 'photo') !== 'photo') return;
    if (resolveReadyShotDisplayUrl()) return;
    if (typeof window.triggerReadyShotPhotoPicker === 'function') window.triggerReadyShotPhotoPicker();
  }

  function onTouchStart(e) {
    if (eventFromPhotoLabel(e) || eventFromInteractive(e)) return;
    if (!e.touches || e.touches.length !== 1) return;
    __cardIgnoreMouseUntil = Date.now() + 800;
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }
  function onTouchMove(e) {
    if (!isCardPointerDown || !e.touches || e.touches.length !== 1) return;
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
    if (isCardSwiping && e.cancelable) e.preventDefault();
  }
  function onTouchEnd(e) {
    var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : cardTouchStartX;
    var endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : cardTouchStartY;
    handleEnd(endX, endY);
  }
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (Date.now() < __cardIgnoreMouseUntil) return;
    if (eventFromPhotoLabel(e) || eventFromInteractive(e)) return;
    handleStart(e.clientX, e.clientY);
  }
  function onWindowMouseMove(e) {
    if (Date.now() < __cardIgnoreMouseUntil) return;
    if (isCardPointerDown) handleMove(e.clientX, e.clientY);
  }
  function onWindowMouseUp(e) {
    if (Date.now() < __cardIgnoreMouseUntil) return;
    if (isCardPointerDown || isCardSwiping) handleEnd(e.clientX, e.clientY);
  }

  var swipeMouseOpts = swipeSignal ? { signal: swipeSignal } : false;
  var swipeTouchOpts = swipeSignal ? { passive: false, signal: swipeSignal } : { passive: false };
  var swipeClickOpts = swipeSignal ? { signal: swipeSignal } : false;

  card.addEventListener('touchstart', onTouchStart, swipeTouchOpts);
  card.addEventListener('touchmove', onTouchMove, swipeTouchOpts);
  card.addEventListener('touchend', onTouchEnd, swipeTouchOpts);
  card.addEventListener('touchcancel', onTouchEnd, swipeTouchOpts);
  card.addEventListener('mousedown', onMouseDown, swipeMouseOpts);
  card.addEventListener('click', onCardClick, swipeClickOpts);
  window.addEventListener('mousemove', onWindowMouseMove, swipeMouseOpts);
  window.addEventListener('mouseup', onWindowMouseUp, swipeMouseOpts);

  __cardSwipeCleanup = function() {
    card.removeEventListener('touchstart', onTouchStart);
    card.removeEventListener('touchmove', onTouchMove);
    card.removeEventListener('touchend', onTouchEnd);
    card.removeEventListener('touchcancel', onTouchEnd);
    card.removeEventListener('mousedown', onMouseDown);
    card.removeEventListener('click', onCardClick);
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  };
};

if (!document.getElementById('template-cards-core-style')) {
  var cardCoreStyle = document.createElement('style');
  cardCoreStyle.id = 'template-cards-core-style';
  cardCoreStyle.innerHTML = `
    .tmpl-card-base {
      width: 100% !important;
      max-width: 330px !important;
      aspect-ratio: 3 / 4 !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      border-radius: 14px !important;
      box-shadow: none !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      overflow: hidden !important;
      position: relative !important;
      touch-action: pan-y !important;
      flex-shrink: 0 !important;
      container-type: inline-size !important;
    }
    #packShareCaptureArea,
    #photoStudioCardTarget,
    .photo-overlay-card,
    .ready-shot-card-vector {
      container-type: inline-size;
    }
    .rs-brand-mark {
      height: 7.92cqw !important;
      width: auto !important;
      max-width: none !important;
      display: block !important;
      object-fit: contain !important;
      mix-blend-mode: screen;
      pointer-events: none !important;
      flex-shrink: 0 !important;
      filter: none !important;
    }
    .tmpl-pledge-wrap {
      margin-top: 4px !important;
      padding: 4px 6px !important;
      border-radius: 6px !important;
      border-style: dashed !important;
      border-width: 1px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 1px !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
    .tmpl-pledge-title {
      font-size: 0.65rem !important;
      font-weight: 900 !important;
      letter-spacing: 0.5px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 3px !important;
      line-height: 1.2 !important;
    }
    .tmpl-pledge-sub {
      font-size: 0.46rem !important;
      line-height: 1.2 !important;
    }
    .tmpl-row-between {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.appendChild(cardCoreStyle);
}

function generateCardMarkup(tmplId, record, items, spot, memo) {
  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var nick = profile ? profile.nickname : '낭만탐험가';
  var list = items || [];
  var fallbackWeightGrams = list.reduce(function(sum, it) {
    var w = (typeof it === 'object' && it !== null) ? Number(it.weight || it.weight_g || 0) : 0;
    return sum + w;
  }, 0);
  var weight = '0.00';
  if (record && record.weightKg && record.weightKg !== 'undefined') {
    weight = String(record.weightKg);
  } else if (fallbackWeightGrams > 0) {
    weight = (fallbackWeightGrams / 1000).toFixed(2);
  } else if (record && record.weightGrams) {
    weight = (Number(record.weightGrams) / 1000).toFixed(2);
  }
  var dateStr = (record && record.date) ? record.date : (function() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  })();

  var targetSpot = (spot !== undefined && spot !== null) ? String(spot).trim() : '';
  var targetMemo = (memo !== undefined && memo !== null) ? String(memo).trim() : '';

  // 🛡️ [박지 비공개 & 여백 레이아웃 보존 헬퍼]
  var spotText = targetSpot ? escapeHtml(targetSpot) : '&nbsp;';
  var spotPinText = targetSpot ? (SVG_ICONS.pin + escapeHtml(targetSpot)) : '&nbsp;';
  var memoQuotes = targetMemo ? ('“' + escapeHtml(targetMemo) + '”') : '';

  var logoWhite = SVG_ICONS.brandLogo('#ffffff', '#ffffff');
  var logoPink = SVG_ICONS.brandLogo('#f43f5e', '#fde047');
  var logoSunset = SVG_ICONS.brandLogo('#ea580c', '#fb7185');

  var makePledge = function(color, bg, border, sub) {
    return '<div class="tmpl-pledge-wrap" style="background:' + bg + '; border-color:' + border + ';">' +
      '<span class="tmpl-pledge-title" style="color:' + color + ';">' +
        SVG_ICONS.lntShield + ' <span>[' + escapeHtml(nick) + ']님은 LNT를 준수합니다</span>' +
      '</span>' +
      '<span class="tmpl-pledge-sub" style="color:' + sub + ';">머문 자리는 처음처럼 · 비화식 실천 · 흔적 없는 머무름</span>' +
    '</div>';
  };

  switch (Number(tmplId)) {
    case 1:
      return '<div class="tmpl-card-base" style="background:#f4f1ea; color:#1c1917; padding:12px 11px; font-family:\'JetBrains Mono\', monospace; border:1.5px solid #78716c; border-top:3px dashed #78716c; border-bottom:3px dashed #78716c;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="text-align:center; border-bottom:1.2px dashed #78716c; padding-bottom:3px;">' +
            '<div style="font-size:0.85rem; font-weight:900; letter-spacing:1px;">* ROMANTIC ROUTE POS *</div>' +
            '<div style="font-size:0.46rem; color:#78716c;">REG: #2026 // EXPLORER: ' + escapeHtml(nick) + '</div>' +
          '</div>' +
          '<div style="font-size:0.58rem; color:#44403c;">' +
            '<div>DEST : <strong>' + spotText + '</strong></div>' +
            '<div>DATE : ' + escapeHtml(dateStr) + ' | ID: <strong style="color:#000;">' + escapeHtml(nick) + '</strong></div>' +
            (targetMemo ? '<div style="font-style:italic; margin-top:1px; color:#000;">MEMO : "' + escapeHtml(targetMemo) + '"</div>' : '') +
          '</div>' +
          '<div class="tmpl-row-between" style="border-top:1px dashed #78716c; border-bottom:1px dashed #78716c; padding:2px 0; font-size:0.50rem; font-weight:900;">' +
            '<span>[ITEM NAME]</span><span>[WEIGHT]</span>' +
          '</div>' +
          '<div style="flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#1c1917', wtColor: '#000000', bullet: '' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="border-top:1.5px solid #000; padding-top:3px; display:flex; justify-content:space-between; align-items:baseline;">' +
            '<span style="font-weight:900; font-size:0.70rem;">TOTAL WEIGHT</span>' +
            '<span style="font-weight:900; font-size:1.38rem; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' KG</span>' +
          '</div>' +
          '<div class="tmpl-row-between" style="margin-top:3px; background:#e7e2d7; padding:3px 5px; border-radius:4px; border:1px solid #d6cfc4;">' +
            '<div style="height:15px; width:75px; background:repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 8px);"></div>' +
            '<div style="border:1.2px solid #1e3a8a; color:#1e3a8a; padding:2px 5px; border-radius:3px; font-size:0.55rem; font-weight:900;">' +
              '★ [' + escapeHtml(nick) + ']님은 LNT를 준수합니다 ★' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    case 2:
      return '<div class="tmpl-card-base" style="background:#0f172a; border:1.5px solid #334155; padding:12px 11px; font-family:\'Space Grotesk\', sans-serif; color:#ffffff;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px dashed #38bdf8; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:4px;">' + logoWhite + '<span style="font-size:0.75rem; font-weight:900; letter-spacing:1px;">ROMANTIC AIRWAYS</span></div>' +
            '<span style="background:#0284c7; color:#fff; font-size:0.46rem; font-weight:900; padding:1px 5px; border-radius:3px;">FIRST CLASS</span>' +
          '</div>' +
          '<div style="display:grid; grid-template-columns:1fr auto 1fr; gap:4px; align-items:center; background:#1e293b; border-radius:5px; padding:4px 7px; border:1px solid #334155;">' +
            '<div><small style="font-size:0.40rem; color:#94a3b8; display:block;">DEPARTURE</small><strong style="font-size:0.80rem; color:#fff;">SEL</strong><small style="font-size:0.42rem; color:#cbd5e1; display:block;">CITY</small></div>' +
            '<div style="text-align:center; color:#38bdf8;"><div style="font-size:0.62rem;">✈ RR-832</div><small style="font-size:0.40rem; color:#64748b;">' + escapeHtml(dateStr) + '</small></div>' +
            '<div style="text-align:right;"><small style="font-size:0.40rem; color:#94a3b8; display:block;">DESTINATION</small><strong style="font-size:0.80rem; color:#34d399;">' + (targetSpot ? 'SZR' : 'SECRET') + '</strong><small style="font-size:0.42rem; color:#34d399; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + spotText + '</small></div>' +
          '</div>' +
          '<div style="display:grid; grid-template-columns:1.2fr 1fr 1fr; gap:2px; background:#1e293b; padding:2px 5px; border-radius:3px; font-size:0.46rem; color:#94a3b8; border:1px solid #334155;">' +
            '<div>PAX: <strong style="color:#fff;">' + escapeHtml(nick) + '</strong></div>' +
            '<div>GATE: <strong style="color:#38bdf8;">LNT-01</strong></div>' +
            '<div style="text-align:right;">SEAT: <strong style="color:#34d399;">01A</strong></div>' +
          '</div>' +
          (targetMemo ? '<div style="font-size:0.56rem; color:#94a3b8; font-style:italic;">REMARKS: "' + escapeHtml(targetMemo) + '"</div>' : '') +
          '<div style="border-top:1px dashed #334155; padding-top:2px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#cbd5e1', wtColor: '#38bdf8' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1.2px dashed #38bdf8; padding-top:2px;">' +
            '<span style="font-size:0.56rem; color:#94a3b8;">BAGGAGE WEIGHT</span>' +
            '<span style="font-size:1.35rem; font-weight:900; color:#34d399;">' + weight + ' KG</span>' +
          '</div>' +
          '<div style="font-size:0.55rem; color:#38bdf8; text-align:center; font-weight:900; background:#1e293b; border:1px solid #334155; padding:3px; border-radius:3px; margin-top:2px;">' +
            '✈ [' + escapeHtml(nick) + ']님은 LNT를 준수합니다' +
          '</div>' +
        '</div>' +
      '</div>';

    case 6:
      return '<div class="tmpl-card-base" style="background:#f5f4ef; color:#18181b; padding:9px 8px 10px 8px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #a1a1aa;">' +
        '<div style="background:#030303; color:#ffffff; padding:5px 6px 4px 6px; border-radius:5px; border:1.2px solid #27272a; flex:1; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;">' +
          '<div>' +
            '<div class="tmpl-row-between" style="font-size:0.40rem; color:#a1a1aa; font-family:\'JetBrains Mono\', monospace; border-bottom:1px solid #27272a; padding-bottom:1px; margin-bottom:2px;">' +
              '<span>■ ■ 낭만루트 EKT 100</span><span>▶ 24A ■ ■</span>' +
            '</div>' +
            '<div style="font-size:0.90rem; font-weight:900; color:#ffffff; font-family:\'SUIT\', sans-serif; line-height:1.2; min-height:1.2em;">' +
              spotPinText +
            '</div>' +
            (targetMemo ? '<div style="font-size:0.56rem; color:#fde047; font-family:\'JetBrains Mono\', monospace;">"' + escapeHtml(targetMemo) + '"</div>' : '') +
          '</div>' +
          '<div style="margin-top:2px; border-top:1px dashed #27272a; padding-top:2px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#f4f4f5', wtColor: '#38bdf8', bullet: '· ' }) +
          '</div>' +
        '</div>' +
        '<div style="padding-top:3px; margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; padding:0 2px;">' +
            '<span style="font-size:0.48rem; color:#71717a; font-family:\'JetBrains Mono\', monospace;">SLIDE // ' + escapeHtml(dateStr) + '</span>' +
            '<span style="font-size:1.25rem; font-weight:900; color:#09090b; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' KG</span>' +
          '</div>' +
          '<div style="border:1.2px solid #065f46; color:#065f46; background:#ecfdf5; font-weight:900; text-align:center; padding:3px; border-radius:4px; font-size:0.62rem; margin-top:2px; font-family:\'SUIT\', sans-serif;">' +
            '🌿 [' + escapeHtml(nick) + ']님은 LNT를 준수합니다' +
          '</div>' +
        '</div>' +
      '</div>';

    case 8:
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #fff0f5 0%, #f0f9ff 100%); color:#334155; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fbcfe8;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.5px dashed #f472b6; padding-bottom:2px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoPink +
              '<span style="font-size:0.90rem; font-weight:700; color:#db2777;">낭만루트 구름다이어리 ☁️</span>' +
            '</div>' +
            '<span style="font-size:0.58rem; font-weight:700; background:#f472b6; color:#fff; padding:1px 4px; border-radius:5px;">힐링 🌸</span>' +
          '</div>' +
          '<div style="background:#ffffff; border-radius:6px; padding:4px 6px; border:1px solid #fbcfe8; min-height:1.4em;">' +
            '<div style="font-size:0.92rem; font-weight:700; color:#831843;">' + spotText + '</div>' +
            '<div style="font-size:0.62rem; color:#db2777;">기록 : <strong>' + escapeHtml(nick) + '</strong> (' + dateStr + ')</div>' +
          '</div>' +
          '<div style="background:rgba(255,255,255,0.85); border-radius:6px; padding:4px 6px; border:1px dashed #fbcfe8; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#475569', wtColor: '#db2777', subColor: '#f472b6' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div class="tmpl-row-between" style="background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #fbcfe8; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#be185d;">배낭 무게</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ec4899;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#be185d', '#fce7f3', '#fbcfe8', '#db2777') +
        '</div>' +
      '</div>';

    case 14:
      return '<div class="tmpl-card-base" style="background:#faf7f2; color:#292524; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fed7aa;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.5px dashed #d6cfc4; padding-bottom:2px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoSunset +
              '<span style="font-size:0.90rem; font-weight:700; color:#c2410c;">다꾸스티커 🏷️</span>' +
            '</div>' +
            '<span style="font-size:0.58rem; font-weight:700; background:#fed7aa; color:#9a3412; padding:1px 3px; border-radius:3px;">MY TRAIL</span>' +
          '</div>' +
          '<div style="background:#ffffff; border-radius:5px; padding:4px 6px; border:1px solid #e7e2d7; min-height:1.4em;">' +
            '<div style="font-size:0.90rem; font-weight:700; color:#431407;">' + spotText + '</div>' +
          '</div>' +
          '<div style="background:#fcfaf5; border-radius:5px; padding:4px 6px; border:1px dashed #d6cfc4; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#44403c', wtColor: '#c2410c', subColor: '#a8a29e' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div class="tmpl-row-between" style="background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #e7e2d7; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#854d0e;">배낭 무게:</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ca8a04;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#c2410c', '#fff7ed', '#fed7aa', '#9a3412') +
        '</div>' +
      '</div>';

    case 18:
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #fefce8 0%, #fef9c3 100%); color:#713f12; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fde047;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.5px dashed #fde047; padding-bottom:2px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoSunset +
              '<span style="font-size:0.90rem; font-weight:700; color:#ca8a04;">레몬버터 🍋</span>' +
            '</div>' +
            '<span style="font-size:0.58rem; font-weight:700; background:#fef08a; color:#854d0e; padding:1px 3px; border-radius:3px;">SUNNY</span>' +
          '</div>' +
          '<div style="background:#ffffff; border-radius:5px; padding:4px 6px; border:1px solid #fef08a; min-height:1.4em;">' +
            '<div style="font-size:0.90rem; font-weight:700; color:#713f12;">' + spotText + '</div>' +
          '</div>' +
          '<div style="background:#fffef0; border-radius:5px; padding:4px 6px; border:1px dashed #fde047; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#713f12', wtColor: '#ca8a04', subColor: '#a16207' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div class="tmpl-row-between" style="background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #fef08a; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#854d0e;">배낭 무게:</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ca8a04;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#ca8a04', '#fef9c3', '#fde047', '#854d0e') +
        '</div>' +
      '</div>';
    default:
      return generateCardMarkup(1, record, items, spot, memo);
  }
}

window.generateCardMarkup = generateCardMarkup;
window.switchShareCardTemplate = switchShareCardTemplate;
window.updateShareCardLive = updateShareCardLive;
window.initCardSwipeGesture = initCardSwipeGesture;
window.renderTemplateChips = renderTemplateChips;
window.scrollActiveReadyShotChipIntoView = scrollActiveReadyShotChipIntoView;
window.syncReadyShotFamilyToggle = syncReadyShotFamilyToggle;
window.syncReadyShotPhotoButtons = syncReadyShotPhotoButtons;
})(window);