// =========================================================================
// 🚀 [templates.js] 19종 템플릿 엔진 & 포토 카드 스튜디오 마스터 (v2.6.0)
// =========================================================================
if (!document.getElementById('romantic-hand-font-loader')) {
  var fLink = document.createElement('link');
  fLink.id = 'romantic-hand-font-loader';
  fLink.rel = 'stylesheet';
  fLink.href = 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap';
  document.head.appendChild(fLink);
}

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

function setupStudioPhotoDrag(targetEl) {
  if (!targetEl || targetEl.__dragSetup) return;
  targetEl.__dragSetup = true;

  var isDragging = false;
  var isPinching = false;
  var startX = 0, startY = 0;
  var startPosX = 50, startPosY = 50;
  var startDist = 0;
  var startScale = 1.0;

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
    var img = document.getElementById('photoStudioBgImage');
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
      isDragging = false;
      isPinching = false;
      targetEl.style.cursor = 'grab';
    }
  }

  targetEl.style.cursor = 'grab';
  targetEl.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerEnd);

  targetEl.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerEnd);
  window.addEventListener('touchcancel', onPointerEnd);

  targetEl.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.05 : 0.05;
    currentPhotoScaleVal = Math.max(1.0, Math.min(2.5, +(currentPhotoScaleVal + delta).toFixed(2)));
    updateTransform();
  }, { passive: false });
}

function ensurePhotoStudioDOM() {
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) return studio;

  studio = document.createElement('div');
  studio.id = 'photoStudioOverlay';
  studio.style.cssText = 'display:none; position:fixed; inset:0; z-index:2147483647 !important; background:#000000; justify-content:center; align-items:center; overflow:hidden; box-sizing:border-box; overscroll-behavior:none !important; touch-action:none !important;';
  
  studio.innerHTML = `
    <div id="photoStudioStage" style="position:relative; width:100%; height:100%; max-width:440px; display:flex; justify-content:center; align-items:center; padding:env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px) 0; box-sizing:border-box;">
      <div id="photoStudioCardTarget" style="width:100%; max-height:100%; overflow:hidden; position:relative; display:flex; justify-content:center; align-items:center;"></div>
      
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
        <div class="studio-mode-bar" style="display:flex; justify-content:flex-start; gap:5px; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none; padding:2px 2px; -webkit-overflow-scrolling:touch;">
          <button type="button" id="btnStudioModeMinimal" style="background:#ffffff; color:#000000; border:none; padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:900; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('minimal')">미니멀 갤러리</button>
          <button type="button" id="btnStudioModeChic" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('chic')">시크 갤러리</button>
          <button type="button" id="btnStudioModePacking" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('packing')">장비 폴라로이드</button>
          <button type="button" id="btnStudioModeEssay" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('essay')">감성 에세이</button>
          <button type="button" id="btnStudioModeSage" style="background:rgba(0,0,0,0.65); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); padding:4px 9px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; white-space:nowrap;" onclick="window.switchStudioMode('sage')">내추럴 카메라</button>
        </div>
      </div>

      <div id="studioFreeRatioSliderContainer" style="display:none; position:absolute; bottom:calc(85px + env(safe-area-inset-bottom, 0px)); left:20px; right:20px; background:rgba(0,0,0,0.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.2); border-radius:14px; padding:8px 12px; z-index:100; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:#94a3b8; font-weight:700;">
          <span>자유 비율 조절</span>
          <span id="freeRatioValLabel" style="color:#ffffff; font-family:'Space Grotesk', sans-serif; font-weight:900;">3 : 4</span>
        </div>
        <input type="range" id="studioFreeRatioSlider" min="0.52" max="1.0" step="0.01" value="0.75" style="width:100%; accent-color:#ffffff; cursor:pointer;" oninput="window.handleFreeRatioChange(this.value)" />
      </div>

      <div class="studio-ratio-bar" style="position:absolute; bottom:calc(14px + env(safe-area-inset-bottom, 0px)); display:flex; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:24px; padding:3px 6px; gap:3px; z-index:100; overflow-x:auto; max-width:92%; scrollbar-width:none; -ms-overflow-style:none;">
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

window.resetStudioPhotoFraming = function() {
  window.currentPhotoPosX = 50;
  window.currentPhotoPosY = 50;
  currentPhotoScaleVal = 1.0;
  var img = document.getElementById('photoStudioBgImage');
  if (img) {
    img.style.objectPosition = '50% 50%';
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = '50% 50%';
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(8);
};

window.openPhotoStudio = function() {
  document.body.classList.add('pack-share-open');
  if (typeof window.closePackShareModal === 'function') window.closePackShareModal();
  var studio = ensurePhotoStudioDOM();
  if (studio) studio.style.setProperty('display', 'flex', 'important');
  window.currentCardRatio = '3/4';
  window.currentStudioCardMode = window.currentStudioCardMode || 'minimal';
  window.updateStudioUI();
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
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) studio.style.setProperty('display', 'none', 'important');
  var modal = document.getElementById('packShareModalOverlay');
  if (modal) modal.style.setProperty('display', 'flex', 'important');
  if (typeof window.updateShareCardLive === 'function') window.updateShareCardLive();
  window.syncGlobalModalScrollLock();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.setStudioRatio = function(ratio) {
  window.currentCardRatio = ratio;
  var sliderContainer = document.getElementById('studioFreeRatioSliderContainer');
  if (sliderContainer) sliderContainer.style.display = (ratio === 'free') ? 'flex' : 'none';
  window.updateStudioUI();
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.handleFreeRatioChange = function(val) {
  currentCustomRatioVal = parseFloat(val);
  var label = document.getElementById('freeRatioValLabel');
  if (label) label.innerText = '1 : ' + (1 / currentCustomRatioVal).toFixed(2);
  window.updateStudioCardLive();
};

window.handlePhotoScaleChange = function(val) {
  currentPhotoScaleVal = parseFloat(val);
  var label = document.getElementById('freePhotoScaleLabel');
  if (label) label.innerText = Math.round(currentPhotoScaleVal * 100) + '%';
  var liveLabel = document.getElementById('studioLiveScaleLabel');
  if (liveLabel) liveLabel.innerText = Math.round(currentPhotoScaleVal * 100) + '%';
  var liveSlider = document.getElementById('studioLiveScaleSlider');
  if (liveSlider && liveSlider.value !== val) liveSlider.value = val;
  var img = document.getElementById('photoStudioBgImage');
  if (img) {
    var posX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
    var posY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
    img.style.transform = 'scale(' + currentPhotoScaleVal + ')';
    img.style.transformOrigin = posX + '% ' + posY + '%';
  }
};

window.switchStudioMode = function(mode) {
  window.currentStudioCardMode = mode;
  var map = { 'minimal': 'btnStudioModeMinimal', 'chic': 'btnStudioModeChic', 'packing': 'btnStudioModePacking', 'essay': 'btnStudioModeEssay', 'sage': 'btnStudioModeSage' };
  Object.keys(map).forEach(function(k) {
    var btn = document.getElementById(map[k]);
    if (btn) {
      if (k === mode) {
        btn.style.background = '#ffffff';
        btn.style.color = '#000000';
        btn.style.fontWeight = '900';
        btn.style.border = 'none';
      } else {
        btn.style.background = 'rgba(0,0,0,0.65)';
        btn.style.color = '#cbd5e1';
        btn.style.fontWeight = '800';
        btn.style.border = '1px solid rgba(255,255,255,0.25)';
      }
    }
  });
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.setStudioTextColor = function(color) {
  window.currentPhotoTextColor = color;
  window.updateStudioUI();
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.updateStudioUI = function() {
  var mapBtns = { '1/1': 'btnStudioRatio11', '4/5': 'btnStudioRatio45', '3/4': 'btnStudioRatio34', '9/16': 'btnStudioRatio916', 'free': 'btnStudioRatioFree' };
  Object.keys(mapBtns).forEach(function(r) {
    var btn = document.getElementById(mapBtns[r]);
    if (!btn) return;
    if (r === window.currentCardRatio) { btn.style.background = '#ffffff'; btn.style.color = '#000000'; btn.style.fontWeight = '900'; }
    else { btn.style.background = 'transparent'; btn.style.color = '#cbd5e1'; btn.style.fontWeight = '800'; }
  });
  var btnW = document.getElementById('btnStudioColorWhite');
  var btnB = document.getElementById('btnStudioColorBlack');
  if (btnW && btnB) {
    btnW.style.boxShadow = (window.currentPhotoTextColor === 'white') ? '0 0 0 2px #ffffff' : 'none';
    btnB.style.boxShadow = (window.currentPhotoTextColor === 'black') ? '0 0 0 2px #ffffff' : 'none';
  }
};

window.saveStudioCardToPhone = async function() {
  var card = document.getElementById('photoStudioCardTarget');
  if (!card || typeof html2canvas === 'undefined') return;
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
    var canvas = await html2canvas(card, {
      backgroundColor: '#000000',
      scale: 3.0,
      useCORS: true,
      allowTaint: false,
      logging: false
    });
    var link = document.createElement('a');
    link.download = '낭만루트_레디샷_' + Date.now() + '.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.94);
    link.click();
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

window.applyStudioCardToTemplate = async function() {
  var card = document.getElementById('photoStudioCardTarget');
  if (!card) return;
  if (typeof triggerHaptic === 'function') triggerHaptic(12);

  var btn = document.getElementById('btnStudioApplyCard');
  var prevHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.75';
    btn.innerHTML = '<span style="width:11px; height:11px; border:2px solid rgba(0,0,0,0.3); border-top-color:#000000; border-radius:50%; display:inline-block; animation:tmplSpin 0.7s linear infinite;"></span><span>등록 중...</span>';
  }

  try {
    var rawPhoto = window.currentSharePhotoRaw || window.currentSharePhoto;
    if (!rawPhoto || !rawPhoto.startsWith('https://')) {
      if (typeof showToast === 'function') showToast('정상적인 사진 URL이 확보되지 않았습니다.', 'warn');
      return;
    }

    window.currentShareRecord = window.currentShareRecord || {};
    window.currentShareRecord.readyShotPhoto = rawPhoto;
    window.currentShareRecord.readyShotMode = window.currentStudioCardMode || 'minimal';
    window.currentShareRecord.readyShotPosX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
    window.currentShareRecord.readyShotPosY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
    window.currentShareRecord.readyShotScale = currentPhotoScaleVal || 1.0;
    window.currentShareRecord.readyShotRatio = window.currentCardRatio || '3/4';

    var studio = document.getElementById('photoStudioOverlay');
    if (studio) studio.style.setProperty('display', 'none', 'important');
    var shareModal = document.getElementById('packShareModalOverlay');
    if (shareModal) shareModal.style.setProperty('display', 'none', 'important');
    document.body.classList.remove('pack-share-open');
    window.syncGlobalModalScrollLock();

    if (typeof window.saveCardToVaultAndOpenBasecamp === 'function') {
      await window.saveCardToVaultAndOpenBasecamp();
    }
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

window.updateStudioCardLive = function() {
  var container = document.getElementById('photoStudioCardTarget');
  if (!container || !window.currentSharePhoto) return;

  var spotInput = document.getElementById('shareCardSpotInput');
  var memoInput = document.getElementById('shareCardMemoInput');

  var rawSpot = (spotInput && spotInput.value.trim()) ? spotInput.value.trim() : (window.currentShareRecord && window.currentShareRecord.spot ? window.currentShareRecord.spot.trim() : '');
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
          items.push({ name: it.name || it.itemName, weight: Number(it.weight || it.weight_g || 0) });
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
  var ratioVal = window.currentCardRatio || '3/4';
  var cardRatioCss = 'aspect-ratio:3/4; max-width:340px;';
  if (ratioVal === '1/1') cardRatioCss = 'aspect-ratio:1/1; max-width:340px;';
  else if (ratioVal === '4/5') cardRatioCss = 'aspect-ratio:4/5; max-width:340px;';
  else if (ratioVal === '9/16') cardRatioCss = 'aspect-ratio:9/16; max-width:320px;';
  else if (ratioVal === 'free') cardRatioCss = 'aspect-ratio:' + currentCustomRatioVal + '; max-width:340px;';

  var posX = (window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50;
  var posY = (window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50;
  var scale = currentPhotoScaleVal || 1.0;

  var brandSvgWhite = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#ffffff', '#ffffff') : '';
  var brandSvgDark = (SVG_ICONS && typeof SVG_ICONS.brandLogo === 'function') ? SVG_ICONS.brandLogo('#0f172a', '#475569') : '';

  if (mode === 'minimal') {
    container.innerHTML = `
      <div style="position:relative; width:100%; ${cardRatioCss} max-height:calc(100dvh - 130px); margin:0 auto; overflow:hidden; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.95); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        
        <!-- 상단 헤더 (위치 및 일자) -->
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:12px 14px 24px 14px; background:linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:70%; min-width:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.68rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(spotDisplay || 'COLLECTION')}</span>
          </div>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.54rem; font-weight:700; color:#cbd5e1; letter-spacing:0.8px; flex-shrink:0; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(dateStr)}</span>
        </div>

        <!-- 하단 바 (중앙 스펙 강조 + 우측하단 은은한 낭만루트 워터마크) -->
        <div style="position:relative; z-index:10; display:flex; align-items:flex-end; justify-content:space-between; padding:24px 14px 12px 14px; background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%); box-sizing:border-box;">
          <div style="flex:1; min-width:0;"></div>
          <div style="flex-shrink:0; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Space Grotesk', sans-serif; font-size:0.64rem; font-weight:900; color:#ffffff; letter-spacing:0.8px; text-shadow:0 2px 6px rgba(0,0,0,0.95);">
            <span>${totalCount} ITEMS</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.76rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.55rem; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:#6ee7b7; font-weight:800;">LNT</span>
          </div>
          <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center; gap:4px; opacity:0.65;">
            <div style="transform:scale(0.85); transform-origin:right center;">${brandSvgWhite}</div>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.46rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px; text-shadow:0 1px 3px rgba(0,0,0,0.8);">낭만루트</span>
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
        <div style="display:flex; justify-content:space-between; align-items:center; min-width:0; padding:1.5px 0; box-sizing:border-box;">
          <span style="font-size:0.62rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000; display:flex; align-items:center;">
            <span style="display:inline-block; width:3.5px; height:3.5px; background:#ffffff; border-radius:50%; margin-right:4px; flex-shrink:0; box-shadow:0 0 2px #000;"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:900; color:#ffffff; flex-shrink:0; margin-left:4px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">${wStr}</span>
        </div>
      `;
    }).join('');

    if (remainingCount > 0) {
      sageGears += `
        <div style="display:flex; align-items:center; font-size:0.56rem; font-weight:900; color:#e2e8f0; padding:1.5px 0; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.25px #000;">
          <span>+외 ${remainingCount}개 장비</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="position:relative; width:100%; ${cardRatioCss} max-height:calc(100dvh - 130px); margin:0 auto; overflow:hidden; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.95); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
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
          <div style="display:inline-flex; align-items:center; gap:5px;">
            ${brandSvgWhite}
            <span style="font-family:'Space Grotesk', -apple-system, sans-serif; font-size:0.72rem; font-weight:800; color:#ffffff; letter-spacing:0.8px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.3px #000;">낭만루트</span>
          </div>
          <div style="display:inline-flex; align-items:center; gap:5px; font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:700; color:#ffffff; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.25px #000;">
            <span style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.6); padding:1px 6px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.8);">READY SHOT</span>
          </div>
        </div>
        <div style="position:relative; z-index:10; width:100%; padding:0 10px; box-sizing:border-box; margin-top:auto; margin-bottom:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:inline-flex; align-items:center; gap:3px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" style="width:11px; height:11px; filter:drop-shadow(0 1px 2px #000);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.72rem; font-weight:900; color:#ffffff;">${escapeHtml(spotDisplay)}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:4px; font-family:'Space Grotesk', sans-serif; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">
              <span style="font-size:0.78rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
              <span style="font-size:0.5rem; color:rgba(255,255,255,0.7);">|</span>
              <span style="font-size:0.60rem; font-weight:800; color:#cbd5e1;">${escapeHtml(dateStr)}</span>
            </div>
          </div>
          <div style="background:transparent; border:none; padding:2px 2px; display:grid; grid-template-columns:1fr 1fr; column-gap:12px; row-gap:3px; box-sizing:border-box;">
            ${sageGears}
          </div>
        </div>
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:3px 12px 10px 12px; font-family:'Space Grotesk', sans-serif; font-size:0.55rem; font-weight:800; color:#ffffff; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.25px #000;">
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
    container.innerHTML = `
      <div style="position:relative; width:100%; ${cardRatioCss} max-height:calc(100dvh - 130px); margin:0 auto; overflow:hidden; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.95); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#000000;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${window.currentSharePhoto}" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:rgba(18, 18, 22, 0.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-radius:10px; box-shadow:0 24px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.35); padding:9px 9px 12px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; border:1px solid rgba(255,255,255,0.2);">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:0 2px 5px 2px; box-sizing:border-box; margin-bottom:6px; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.12);">
            <div style="display:flex; align-items:center; gap:4px; max-width:65%; min-width:0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:10px; height:10px; flex-shrink:0; opacity:0.85;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.56rem; font-weight:800; color:#ffffff; letter-spacing:0.4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal || 'COLLECTION')}</span>
            </div>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.8px; flex-shrink:0;">${escapeHtml(dateStr)}</span>
          </div>
          <div style="width:100%; aspect-ratio:4/3; border-radius:4px; overflow:hidden; background:#000; box-shadow:0 4px 14px rgba(0,0,0,0.6); flex-shrink:0; position:relative;">
            <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex-shrink:0; display:flex; align-items:flex-end; justify-content:space-between; padding-top:6px;">
            <div style="flex:1; min-width:0;"></div>
            <div style="flex-shrink:0; display:flex; justify-content:center; align-items:center; gap:5px; font-family:'Space Grotesk', sans-serif; font-size:0.60rem; font-weight:800; color:#ffffff; letter-spacing:0.6px;">
              <span>${totalCount} ITEMS</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.70rem;">${weightKg} KG</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#e2e8f0; font-weight:800;">LNT</span>
            </div>
            <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center; gap:3px; opacity:0.65;">
              <div style="transform:scale(0.8); transform-origin:right center;">${brandSvgWhite}</div>
              <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.46rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px;">낭만루트</span>
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (mode === 'essay') {
    var rawText = memoVal || 'Omnia mea\nmecum porto.';
    var memoLines = rawText.split('\n').map(function(line) {
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
      <div style="position:relative; width:100%; ${cardRatioCss} max-height:calc(100dvh - 130px); margin:0 auto; overflow:hidden; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.95); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#07090e;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${window.currentSharePhoto}" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:absolute; inset:14px; border:1px solid rgba(255,255,255,0.35); pointer-events:none; z-index:2; border-radius:2px;"></div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#fdfcf9; border-radius:6px; box-shadow:0 18px 45px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4); padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1c1917;">
          <div style="flex:1 1 0%; min-height:0; width:100%; border-radius:4px; overflow:hidden; background:#000; box-shadow:inset 0 0 4px rgba(0,0,0,0.3); margin-bottom:6px;">
            <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
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
                ${brandSvgDark}
                <span style="font-weight:800; color:#1e293b;">낭만루트</span>
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

  var isTwoCol = items.length >= 8;
  var fontSize = items.length >= 18 ? '0.48rem' : (items.length >= 12 ? '0.52rem' : '0.56rem');

  var gearRows = items.slice(0, 16).map(function(it) {
    var rawN = (typeof it === 'string') ? it : (it.name || '');
    var cName = rawN.replace(/\s*\(\d+g\)$/, '');
    var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
    var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:${fontSize}; line-height:1.2; padding:0.5px 0; gap:2px; min-width:0; box-sizing:border-box;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:700; color:#1e293b; display:flex; align-items:center;">
          ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
        </span>
        <span style="font-family:'Space Grotesk', sans-serif; font-weight:800; color:#334155; flex-shrink:0; font-size:0.92em; letter-spacing:-0.2px;">${wStr}</span>
      </div>
    `;
  }).join('');

  if (items.length > 16) {
    gearRows += `
      <div style="display:flex; align-items:center; font-size:0.50rem; font-weight:800; color:#64748b; padding:0.5px 0;">
        <span>+외 ${items.length - 16}개 장비</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="width:100%; ${cardRatioCss} max-height:calc(100dvh - 130px); margin:0 auto; background:#fbfaf7; box-shadow:0 16px 36px rgba(0,0,0,0.85); border-radius:10px; padding:7px 7px 8px 7px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1e293b; font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;">
      <div style="position:relative; width:100%; aspect-ratio:4/3; border-radius:6px; overflow:hidden; background:#000; box-shadow:inset 0 0 3px rgba(0,0,0,0.3); flex-shrink:0;">
        <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; pointer-events:none;" />
      </div>
      <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; padding-top:6px; min-height:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
          <div style="font-size:0.82rem; font-weight:900; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; display:flex; align-items:center;">
            ${SVG_ICONS.pin}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotDisplay)}</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:4px; flex-shrink:0; margin-left:6px;">
            <span style="font-size:0.46rem; font-weight:800; color:#64748b;">PACKING</span>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:1.02rem; font-weight:900; color:#0f172a; line-height:1;">${weightKg}kg</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:${isTwoCol ? '1fr 1fr' : '1fr'}; column-gap:8px; row-gap:1px; width:100%; box-sizing:border-box; padding:3px 0; flex:1; min-height:0; overflow:hidden;">
          ${gearRows}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${brandSvgDark}
            <span style="font-weight:900; color:#334155; letter-spacing:0.8px;">낭만루트</span>
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
  `;
  document.head.appendChild(chipStyle);
}

var TEMPLATE_ORDER = [1, 8, 2, 18, 14, 6];
var TEMPLATE_NAMES = {
  1: '🧾 영수증',
  8: '☁️ 솜사탕',
  2: '🎫 보딩패스',
  18: '🍋 레몬버터',
  14: '🏷️ 다꾸스티커',
  6: '📸 코닥 슬라이드'
};
// 🎨 [내장 SVG 아이콘 팩 - 참조 에러 원천 방지]
var SVG_ICONS = window.SVG_ICONS || {
  brandLogo: function(color, stroke) {
    color = color || '#ffffff';
    stroke = stroke || '#ffffff';
    return '<svg viewBox="0 0 32 32" fill="none" style="width:20px; height:20px; display:block; flex-shrink:0;">' +
      '<circle cx="21" cy="6" r="9" fill="rgba(255,255,255,0.08)"/>' +
      '<circle cx="21" cy="6" r="6" fill="rgba(255,255,255,0.12)"/>' +
      '<circle cx="21" cy="6" r="3.8" fill="rgba(255,255,255,0.2)"/>' +
      '<circle cx="2" cy="24" r="1.8" fill="' + stroke + '"/>' +
      '<circle cx="9" cy="12" r="2.2" fill="' + stroke + '"/>' +
      '<circle cx="14" cy="16" r="1.8" fill="' + stroke + '"/>' +
      '<circle cx="13" cy="24" r="1.8" fill="' + stroke + '"/>' +
      '<path d="M2 24L9 12H12.5L14 16L10 16M10 16L13 24" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="21" cy="6" r="2.8" fill="#ffffff"/>' +
      '<circle cx="27" cy="13" r="2.2" fill="' + color + '"/>' +
      '<circle cx="30" cy="24" r="2.4" fill="' + color + '"/>' +
      '<path d="M13 24L21 6H25L27 13L22 13M22 13L30 24" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="21" cy="6" r="1" fill="' + color + '"/>' +
    '</svg>';
  },
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:11px; height:11px; display:inline-block; vertical-align:-2px; margin-right:3px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px; display:inline-block; vertical-align:-1px; margin-right:3px; flex-shrink:0;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="19" y1="10" y2="10"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:10px; height:10px; display:inline-block; vertical-align:-1px; margin-right:3px; flex-shrink:0; opacity:0.85;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  bullet: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:3.5px; height:3.5px; display:inline-block; vertical-align:middle; margin-right:3px; opacity:0.7; flex-shrink:0;"><circle cx="12" cy="12" r="6"/></svg>',
  lntShield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px; height:12px; display:inline-block; vertical-align:-2px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
};

// 🧰 [공통 유틸] HTML 특수문자 이스케이프
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    return `
      <div class="ready-shot-card-vector ready-shot-minimal" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        
        <!-- 상단 헤더 (위치 및 일자) -->
        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:12px 14px 24px 14px; background:linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center; gap:5px; max-width:70%; min-width:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.68rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(spotVal || 'COLLECTION')}</span>
          </div>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.54rem; font-weight:700; color:#cbd5e1; letter-spacing:0.8px; flex-shrink:0; text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(dateStr)}</span>
        </div>

        <!-- 하단 바 (중앙 스펙 강조 + 우측하단 은은한 낭만루트 워터마크) -->
        <div style="position:relative; z-index:10; display:flex; align-items:flex-end; justify-content:space-between; padding:24px 14px 12px 14px; background:linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%); box-sizing:border-box;">
          <div style="flex:1; min-width:0;"></div>
          <div style="flex-shrink:0; display:flex; align-items:center; justify-content:center; gap:6px; font-family:'Space Grotesk', sans-serif; font-size:0.64rem; font-weight:900; color:#ffffff; letter-spacing:0.8px; text-shadow:0 2px 6px rgba(0,0,0,0.95);">
            <span>${totalCount} ITEMS</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.76rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
            <span style="color:rgba(255,255,255,0.35);">·</span>
            <span style="font-size:0.55rem; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:#6ee7b7; font-weight:800;">LNT</span>
          </div>
          <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center; gap:4px; opacity:0.65;">
            <div style="transform:scale(0.85); transform-origin:right center;">${brandSvgWhite}</div>
            <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.46rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px; text-shadow:0 1px 3px rgba(0,0,0,0.8);">낭만루트</span>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === 'sage') {
    var maxDisplay = 14;
    var displayedItems = items.slice(0, maxDisplay);
    var remainingCount = items.length - maxDisplay;

    var sageGearsHtml = displayedItems.map(function(it) {
      var rawN = (typeof it === 'string') ? it : (it.name || '');
      var cName = rawN.replace(/\s*\(\d+g\)$/, '');
      var wG = (typeof it === 'object' && it.weight) ? it.weight : 0;
      var wStr = wG > 0 ? (wG / 1000).toFixed(2) + 'kg' : '';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; min-width:0; padding:1.5px 0; box-sizing:border-box;">
          <span style="font-size:0.62rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000; display:flex; align-items:center;">
            <span style="display:inline-block; width:3.5px; height:3.5px; background:#ffffff; border-radius:50%; margin-right:4px; flex-shrink:0; box-shadow:0 0 2px #000;"></span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
          </span>
          <span style="font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:900; color:#ffffff; flex-shrink:0; margin-left:4px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">${wStr}</span>
        </div>
      `;
    }).join('');

    if (remainingCount > 0) {
      sageGearsHtml += `
        <div style="display:flex; align-items:center; font-size:0.56rem; font-weight:900; color:#e2e8f0; padding:1.5px 0; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.25px #000;">
          <span>+외 ${remainingCount}개 장비</span>
        </div>
      `;
    }

    return `
      <div class="ready-shot-card-vector ready-shot-sage" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#000000; user-select:none;">
        <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block; z-index:1; pointer-events:none;" />
        
        <div style="position:absolute; inset:0; z-index:2; pointer-events:none; display:grid; grid-template-columns:1fr 1fr 1fr; grid-template-rows:1fr 1fr 1fr; opacity:0.65;">
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

        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:44px; height:44px; border:1px solid rgba(255,255,255,0.85); z-index:3; pointer-events:none;">
          <div style="position:absolute; top:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; bottom:-1px; left:50%; transform:translateX(-50%); width:6px; height:1px; background:#000;"></div>
          <div style="position:absolute; left:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
          <div style="position:absolute; right:-1px; top:50%; transform:translateY(-50%); width:1px; height:6px; background:#000;"></div>
        </div>

        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:10px 12px 4px 12px; box-sizing:border-box;">
          <div style="display:inline-flex; align-items:center; gap:5px;">
            ${brandSvgWhite}
            <span style="font-family:'Space Grotesk', -apple-system, sans-serif; font-size:0.72rem; font-weight:800; color:#ffffff; letter-spacing:0.8px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.3px #000;">낭만루트</span>
          </div>
          <div style="display:inline-flex; align-items:center; gap:5px; font-family:'Space Grotesk', sans-serif; font-size:0.58rem; font-weight:700; color:#ffffff; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.25px #000;">
            <span style="background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.6); padding:1px 6px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.8);">READY SHOT</span>
          </div>
        </div>

        <div style="position:relative; z-index:10; width:100%; padding:0 10px; box-sizing:border-box; margin-top:auto; margin-bottom:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:inline-flex; align-items:center; gap:4px; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" style="width:11px; height:11px; filter:drop-shadow(0 1px 2px #000);"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.72rem; font-weight:900; color:#ffffff;">${escapeHtml(spotVal)}</span>
            </div>
            <div style="display:inline-flex; align-items:center; gap:4px; font-family:'Space Grotesk', sans-serif; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 5px rgba(0,0,0,0.95); -webkit-text-stroke:0.35px #000;">
              <span style="font-size:0.78rem; font-weight:900; color:#ffffff;">${weightKg} KG</span>
              <span style="font-size:0.50rem; color:rgba(255,255,255,0.7);">|</span>
              <span style="font-size:0.60rem; font-weight:800; color:#cbd5e1;">${escapeHtml(dateStr)}</span>
            </div>
          </div>
          <div style="background:transparent; border:none; padding:2px 2px; display:grid; grid-template-columns:1fr 1fr; column-gap:12px; row-gap:3px; box-sizing:border-box;">
            ${sageGearsHtml}
          </div>
        </div>

        <div style="position:relative; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:3px 12px 10px 12px; font-family:'Space Grotesk', sans-serif; font-size:0.55rem; font-weight:800; color:#ffffff; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9); -webkit-text-stroke:0.25px #000;">
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
    return `
      <div class="ready-shot-card-vector ready-shot-chic" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#000000; user-select:none;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:rgba(18, 18, 22, 0.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-radius:10px; box-shadow:0 24px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.35); padding:9px 9px 12px 9px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; border:1px solid rgba(255,255,255,0.2);">
          <div style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:0 2px 5px 2px; box-sizing:border-box; margin-bottom:6px; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.12);">
            <div style="display:flex; align-items:center; gap:4px; max-width:65%; min-width:0;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:10px; height:10px; flex-shrink:0; opacity:0.85;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="font-size:0.56rem; font-weight:800; color:#ffffff; letter-spacing:0.4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal || 'COLLECTION')}</span>
            </div>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:0.48rem; font-weight:700; color:rgba(255,255,255,0.7); letter-spacing:0.8px; flex-shrink:0;">${escapeHtml(dateStr)}</span>
          </div>
          <div style="width:100%; aspect-ratio:4/3; border-radius:4px; overflow:hidden; background:#000; box-shadow:0 4px 14px rgba(0,0,0,0.6); flex-shrink:0; position:relative;">
            <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
          </div>
          <div style="flex-shrink:0; display:flex; align-items:flex-end; justify-content:space-between; padding-top:6px;">
            <div style="flex:1; min-width:0;"></div>
            <div style="flex-shrink:0; display:flex; justify-content:center; align-items:center; gap:5px; font-family:'Space Grotesk', sans-serif; font-size:0.60rem; font-weight:800; color:#ffffff; letter-spacing:0.6px;">
              <span>${totalCount} ITEMS</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.70rem;">${weightKg} KG</span>
              <span style="color:rgba(255,255,255,0.35);">·</span>
              <span style="color:#e2e8f0; font-weight:800;">LNT</span>
            </div>
            <div style="flex:1; min-width:0; display:flex; justify-content:flex-end; align-items:center; gap:3px; opacity:0.65;">
              <div style="transform:scale(0.8); transform-origin:right center;">${brandSvgWhite}</div>
              <span style="font-family:'Pretendard Variable', -apple-system, sans-serif; font-size:0.46rem; font-weight:700; color:#ffffff; letter-spacing:-0.2px;">낭만루트</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (mode === 'essay') {
    var rawText = memo || 'Omnia mea\nmecum porto.';
    var memoLines = rawText.split('\n').map(function(line) {
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
      <div class="ready-shot-card-vector ready-shot-essay" style="position:relative; width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; overflow:hidden; border-radius:14px; box-shadow:0 12px 30px rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; box-sizing:border-box; background:#07090e; user-select:none;">
        <div style="position:absolute; inset:0; overflow:hidden; z-index:1; pointer-events:none;">
          <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:112%; height:112%; object-fit:cover; object-position:${posX}% ${posY}%; filter:blur(9px) brightness(0.82); transform:scale(1.06); display:block; margin:-6%;" />
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.28);"></div>
        </div>
        <div style="position:absolute; inset:14px; border:1px solid rgba(255,255,255,0.35); pointer-events:none; z-index:2; border-radius:2px;"></div>
        <div style="position:relative; z-index:3; width:88%; max-width:290px; aspect-ratio:3/4; background:#fdfcf9; border-radius:6px; box-shadow:0 18px 45px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.4); padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1c1917;">
          <div style="flex:1 1 0%; min-height:0; width:100%; border-radius:4px; overflow:hidden; background:#000; box-shadow:inset 0 0 4px rgba(0,0,0,0.3); margin-bottom:6px;">
            <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; display:block; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; pointer-events:none;" />
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
                ${brandSvgDark}
                <span style="font-weight:800; color:#1e293b;">낭만루트</span>
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
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.56rem; line-height:1.2; padding:0.5px 0; gap:2px; min-width:0;">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-weight:700; color:#1e293b; display:flex; align-items:center;">
          ${svgDot}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(cName)}</span>
        </span>
        <span style="font-family:'Space Grotesk', sans-serif; font-weight:800; color:#334155; flex-shrink:0; font-size:0.95em;">${wStr}</span>
      </div>
    `;
  }).join('');

  if (pRemain > 0) {
    pRows += `
      <div style="display:flex; align-items:center; font-size:0.54rem; font-weight:800; color:#64748b; padding:0.5px 0;">
        <span>+외 ${pRemain}개 장비</span>
      </div>
    `;
  }

  return `
    <div class="ready-shot-card-vector ready-shot-packing" style="width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; background:#fbfaf7; box-shadow:0 12px 30px rgba(0,0,0,0.9); border-radius:12px; padding:8px 8px 10px 8px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; color:#1e293b; font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; user-select:none;">
      <div style="position:relative; width:100%; aspect-ratio:4/3; border-radius:6px; overflow:hidden; background:#000; box-shadow:inset 0 0 3px rgba(0,0,0,0.3); flex-shrink:0;">
        <img src="${escapeHtml(photoUrl)}" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%; transform:scale(${scale}); transform-origin:${posX}% ${posY}%; display:block;" />
      </div>
      <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between; padding-top:6px; min-height:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:3px;">
          <div style="font-size:0.80rem; font-weight:900; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; display:flex; align-items:center;">
            ${SVG_ICONS.pin}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(spotVal)}</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:4px; flex-shrink:0; margin-left:6px;">
            <span style="font-size:0.46rem; font-weight:800; color:#64748b;">PACKING</span>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:1.02rem; font-weight:900; color:#0f172a; line-height:1;">${weightKg}kg</span>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; column-gap:8px; row-gap:2px; width:100%; box-sizing:border-box; padding:3px 0; flex:1; min-height:0; overflow:hidden;">
          ${pRows}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.48rem; color:#64748b; border-top:1px dashed #cbd5e1; padding-top:4px;">
          <div style="display:flex; align-items:center; gap:5px;">
            ${brandSvgDark}
            <span style="font-weight:900; color:#334155; letter-spacing:0.8px;">낭만루트</span>
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

// 🚪 1. 배낭 패킹 저장 & 카드 생성 모달 호출 (보관함 및 클라우드 엔진 단일화)
function saveCurrentPackingRecord() {
  if (typeof window.saveCurrentPackingRecord === 'function' && window.saveCurrentPackingRecord !== saveCurrentPackingRecord) {
    window.saveCurrentPackingRecord();
    return;
  }

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
    window.savePackingHistoryRecord(newRecord);
  } else {
    if (!window.interactiveHistory) window.interactiveHistory = [];
    window.interactiveHistory.push(newRecord);
    window.packingHistoryList = window.interactiveHistory;
  }

  openPackShareModal(newRecord, allItems, false);
}

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

  var html = TEMPLATE_ORDER.map(function(tId) {
    var isActive = (Number(tId) === Number(selectedTemplateId));
    var name = TEMPLATE_NAMES[tId] || ('테마 ' + tId);
    return '<button type="button" class="tmpl-chip-btn' + (isActive ? ' active' : '') + '" onclick="switchShareCardTemplate(' + tId + ')" data-tmpl="' + tId + '">' +
      escapeHtml(name) +
    '</button>';
  }).join('');

  chipContainer.innerHTML = html;
}

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

  dropdown.innerHTML = filtered.slice(0, 12).map(function(s) {
    var displayName = s.fullName || s.name || s.spot_main || '';
    var elevText = s.elevation ? (String(s.elevation).includes('m') ? s.elevation : s.elevation + 'm') : '';
    var regionText = s.region || s.cityName || '전국';
    var safeName = escapeHtml(displayName);
    var safeElev = escapeHtml(elevText);

    return '<div class="spot-dropdown-item" data-spot="' + safeName + '" data-elevation="' + safeElev + '" onclick="window.handleSpotSearchItemClick(this)" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; cursor:pointer; box-sizing:border-box;">' +
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
    var spotInput = document.getElementById('shareCardSpotInput');
    var memoInput = document.getElementById('shareCardMemoInput');

    var liveSpot = (spotInput && spotInput.value.trim().length > 0)
      ? spotInput.value.trim()
      : (window.currentShareRecord && window.currentShareRecord.spot ? window.currentShareRecord.spot : '');

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

    var finalReadyShot = rec.readyShotPhoto || (typeof window.currentSharePhoto === 'string' && window.currentSharePhoto.startsWith('https://') ? window.currentSharePhoto : '');

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
      readyShotMode: rec.readyShotMode || window.currentStudioCardMode || 'minimal',
      readyShotPosX: (rec.readyShotPosX !== undefined) ? rec.readyShotPosX : ((window.currentPhotoPosX !== undefined) ? window.currentPhotoPosX : 50),
      readyShotPosY: (rec.readyShotPosY !== undefined) ? rec.readyShotPosY : ((window.currentPhotoPosY !== undefined) ? window.currentPhotoPosY : 50),
      readyShotScale: rec.readyShotScale || currentPhotoScaleVal || 1.0,
      readyShotRatio: rec.readyShotRatio || window.currentCardRatio || '3/4',
      templateId: window.selectedTemplateId || rec.templateId || 1,
      isPublished: fieldPhotos.length > 0
    };

    if (typeof window.savePackingHistoryRecord === 'function') {
      await window.savePackingHistoryRecord(newRecord);
    }

    window.__studioMultiPhotos = null;

    if (typeof closePackShareModal === 'function') closePackShareModal();

    setTimeout(function() {
      if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
    }, 40);

    if (typeof showToast === 'function') {
      showToast('✓ 보관함에 등록되었습니다.', 'success', 2200);
    }
    if (typeof triggerHaptic === 'function') triggerHaptic(15);
  } catch (err) {
    console.warn('[templates.js:saveCardToVaultAndOpenBasecamp]', err);
    if (typeof closePackShareModal === 'function') closePackShareModal();
    if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
  } finally {
    if (vaultBtn) {
      vaultBtn.style.pointerEvents = '';
      vaultBtn.style.opacity = '';
      vaultBtn.innerHTML = prevVaultHtml || '<span>보관함에 출발 등록 ✓</span>';
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
  if (modal && document.getElementById('packShareCaptureArea')) {
    return modal;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'packShareModalOverlay';
    modal.className = 'custom-modal-overlay active';
    document.body.appendChild(modal);
  }

  modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:calc(60px + env(safe-area-inset-bottom, 0px)) !important; width:100%; background:#07090e; z-index:2000010 !important; justify-content:center; align-items:stretch; padding:0 !important; margin:0 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; box-sizing:border-box; transform:translateZ(0); -webkit-transform:translateZ(0);';

  modal.innerHTML = `
    <div style="width:100%; max-width:440px; margin:0 auto; min-height:100%; display:flex; flex-direction:column; justify-content:flex-start; gap:10px; padding:calc(8px + env(safe-area-inset-top, 0px)) 12px calc(16px + env(safe-area-inset-bottom, 0px)) 12px; box-sizing:border-box; position:relative;">
      
      <div style="flex-shrink:0; display:flex; flex-direction:column; gap:5px; width:100%; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; height:32px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <!-- 📷 순수 SVG 렌즈/셔터 프레임 벡터 아이콘 -->
            <svg viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px; display:block; flex-shrink:0;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/><line x1="3" x2="21" y1="9" y2="9"/></svg>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff; font-family:'Space Grotesk', -apple-system, sans-serif; letter-spacing:0.5px;">READY SHOT</span>
          </div>
          <button type="button" onclick="window.closePackShareModal();" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.95rem; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
        </div>

       <div style="position:relative; width:100%; display:flex; align-items:center;">
          <div style="position:absolute; left:9px; pointer-events:none; display:flex; align-items:center; justify-content:center; z-index:2;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; display:block;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <input type="text" id="shareCardSpotInput" placeholder="장소명 입력 (자동완성)" oninput="window.handleSpotSearchInput(this.value); if(typeof updateShareCardLive==='function') updateShareCardLive();" style="width:100%; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:0.75rem; padding:0 30px 0 26px; outline:none; box-sizing:border-box;" />
          <button type="button" id="btnSpotInputClear" onclick="window.clearSpotSearchInput();" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.15); border:none; color:#cbd5e1; width:18px; height:18px; border-radius:50%; font-size:0.65rem; font-weight:900; cursor:pointer; align-items:center; justify-content:center; padding:0;">✕</button>
          <div id="spotSearchDropdown" style="display:none; position:absolute; top:36px; left:0; right:0; max-height:180px; overflow-y:auto; background:#0f172a; border:1px solid rgba(56,189,248,0.4); border-radius:8px; z-index:100; box-shadow:0 8px 24px rgba(0,0,0,0.8);"></div>
        </div>

        <div style="display:flex; gap:5px; width:100%; align-items:center;">
          <input type="text" id="shareCardMemoInput" placeholder="한줄 메모 (선택)" oninput="if(typeof updateShareCardLive==='function') updateShareCardLive();" style="flex:1; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:0.75rem; padding:0 10px; outline:none; box-sizing:border-box;" />
          
          <input type="file" id="shareCardPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.handleShareCardPhotoUpload(event)" />
          <button type="button" onclick="document.getElementById('shareCardPhotoInput').click()" style="height:32px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.72rem; font-weight:900; padding:0 10px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0; white-space:nowrap; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>스튜디오</span>
          </button>
        </div>

        <div id="templateSelectorBar" class="template-selector-bar"></div>
      </div>

      <div style="flex-shrink:0; width:100%; display:flex; align-items:center; justify-content:center; padding:2px 0; box-sizing:border-box;">
        <div id="packShareCaptureArea" style="width:100%; max-width:330px; display:flex; align-items:center; justify-content:center; transition:transform 0.2s ease, opacity 0.2s ease;"></div>
      </div>

      <div style="display:flex; gap:6px; width:100%; flex-shrink:0; box-sizing:border-box; margin-top:auto; padding-top:4px;">
        <button type="button" onclick="window.closePackShareModal();" style="flex:0.8; height:42px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.76rem; font-weight:800; border-radius:10px; cursor:pointer;">
          닫기
        </button>
        <button type="button" onclick="window.sharePackCardDirect();" style="flex:1.1; height:42px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.78rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>공유하기</span>
        </button>
        <button type="button" id="btnSaveCardToVault" onclick="window.saveCardToVaultAndOpenBasecamp();" style="flex:1.8; height:42px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:1px solid #38bdf8; color:#ffffff; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 4px 14px rgba(2,132,199,0.4);">
          <span>보관함에 출발 등록 ✓</span>
        </button>
      </div>

    </div>
  `;

  return modal;
}

window.handleShareCardPhotoUpload = async function(e) {
  var files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  var filesToProcess = files.slice(0, 10);
  if (typeof window.showPhotoLoadingModal === 'function') {
    window.showPhotoLoadingModal(1, filesToProcess.length);
  }

  var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';
  var validList = [];

  for (var i = 0; i < filesToProcess.length; i++) {
    if (typeof window.showPhotoLoadingModal === 'function') {
      window.showPhotoLoadingModal(i + 1, filesToProcess.length);
    }
    var file = filesToProcess[i];
    var blob = await new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(evt) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          var MAX_DIM = 1200;
          var maxLen = Math.max(img.width, img.height);
          var scale = maxLen > MAX_DIM ? (MAX_DIM / maxLen) : 1;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function(b) { resolve(b); }, 'image/jpeg', 0.82);
        };
        img.onerror = function() { resolve(null); };
        img.src = evt.target.result;
      };
      reader.onerror = function() { resolve(null); };
      reader.readAsDataURL(file);
    });

    if (blob) {
      try {
        var safeFileName = 'ready_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 7) + '.jpg';
        var cfRes = await fetch(CF_WORKER_UPLOAD_URL + '?file=' + encodeURIComponent(safeFileName), {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob
        });
        if (cfRes.ok) {
          var cfData = await cfRes.json();
          if (cfData && cfData.status === 'SUCCESS' && cfData.url && cfData.url.startsWith('https://')) {
            validList.push(cfData.url);
          }
        }
      } catch (upErr) {
        console.warn('[templates.js:handleShareCardPhotoUpload]', upErr);
      }
    }
  }

  if (typeof window.hidePhotoLoadingModal === 'function') {
    window.hidePhotoLoadingModal();
  }

  if (validList.length > 0) {
    window.__studioMultiPhotos = validList;
    window.currentSharePhoto = validList[0];
    window.currentSharePhotoRaw = validList[0];
    window.openPhotoStudio();
  } else {
    if (typeof showToast === 'function') showToast('사진 업로드에 실패했습니다. 네트워크를 확인해주세요.', 'warn');
  }
  e.target.value = '';
};

window.closePackShareModal = function() {
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
  var modal = ensurePackShareModalDOM();
  if (modal) {
    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '2000010', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    modal.style.setProperty('opacity', '1', 'important');
  }
  document.body.style.overflow = 'hidden';

  currentShareRecord = record || {
    id: 'pack_' + Date.now(),
    date: new Date().toLocaleDateString(),
    weightKg: '0.00',
    weightGrams: 0,
    items: []
  };

  var candidateItems = (Array.isArray(items) && items.length > 0) ? items : (currentShareRecord.items || currentShareRecord.gears || []);
  currentShareItems = candidateItems.map(function(item) {
    if (typeof item === 'object' && item !== null) {
      return { name: item.name || item.itemName || '', weight: Number(item.weight || item.weight_g || 0) };
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
            weight: Number(it.weight || it.weight_g || 0)
          });
        }
      });
    });
  }

  currentSharePhoto = currentShareRecord.photo || '';
  currentPhotoTextColor = currentShareRecord.textColor || 'white';
  currentCardRatio = currentShareRecord.ratio || '9/16';

  var spotInput = document.getElementById('shareCardSpotInput');
  var memoInput = document.getElementById('shareCardMemoInput');
  var clearBtn = document.getElementById('btnSpotInputClear');

 // 🛡️ [하드코딩 박멸]: 박지 미입력 시 '나의 힐링 스팟', 각오/메모 미입력 시 완전 공백('')
  var autoSpot = currentShareRecord.spot || '';
  var targetDateStr = currentShareRecord.date || window.activeSelectedDateKey || '';

  if (!autoSpot && window.currentLuckySpot && window.currentLuckySpot.name) {
    autoSpot = window.currentLuckySpot.name;
    if (window.currentLuckySpot.elevation) currentShareRecord.elevation = window.currentLuckySpot.elevation;
  }
  if (!autoSpot && targetDateStr) {
    var pSpots = (typeof safeGetJSON === 'function') ? safeGetJSON('okbm_plan_spots', {}) : {};
    if (pSpots[targetDateStr] && pSpots[targetDateStr].name) {
      autoSpot = pSpots[targetDateStr].name;
      if (pSpots[targetDateStr].elevation) currentShareRecord.elevation = pSpots[targetDateStr].elevation;
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

  if (spotInput) {
    spotInput.value = autoSpot;
    if (clearBtn) clearBtn.style.display = autoSpot ? 'flex' : 'none';
  }
  if (memoInput) {
    memoInput.value = currentShareRecord.oneLineMemo || '';
  }

  var savedTmpl = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
  selectedTemplateId = TEMPLATE_ORDER.indexOf(savedTmpl) !== -1 ? savedTmpl : TEMPLATE_ORDER[0];

  renderTemplateChips();
  switchShareCardTemplate(selectedTemplateId);

  setTimeout(function() { initCardSwipeGesture(); }, 60);
};

function openPackShareModal(record, items, forceStudio) {
  window.openPackShareModal(record, items, forceStudio);
}
// 🏷️ 3. 템플릿 전환 & 상단 칩/이름 실시간 동기화
function switchShareCardTemplate(tmplId, isSwipe) {
  var targetId = Number(tmplId);
  if (TEMPLATE_ORDER.indexOf(targetId) === -1) {
    targetId = TEMPLATE_ORDER[0];
  }

  selectedTemplateId = targetId;
  localStorage.setItem('romantic_selected_template', targetId);

  var chips = document.querySelectorAll('.tmpl-chip-btn, [data-tmpl]');
  if (chips.length === 0) {
    renderTemplateChips();
    chips = document.querySelectorAll('.tmpl-chip-btn, [data-tmpl]');
  }

  chips.forEach(function(btn) {
    var bId = Number(btn.getAttribute('data-tmpl'));
    var isActive = (bId === selectedTemplateId);
    btn.classList.toggle('active', isActive);
    if (isActive && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });

  // 🛡️ 헤더 타이틀은 항상 READY SHOT으로 고정 (템플릿 이름 덮어쓰기 완전 제거)

  updateShareCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(12);
}

// 🖼️ 4. 카드 실시간 화면 갱신
function updateShareCardLive() {
  var container = document.getElementById('packShareCaptureArea');
  if (!container) return;
  var spotInput = document.getElementById('shareCardSpotInput');
  var memoInput = document.getElementById('shareCardMemoInput');
  var spotVal = (spotInput && spotInput.value) ? spotInput.value.trim() : '';
  var memoVal = (memoInput && memoInput.value) ? memoInput.value.trim() : '';

  container.className = 'share-card-container';
  container.innerHTML = generateCardMarkup(selectedTemplateId, currentShareRecord, currentShareItems, spotVal, memoVal);
}

// 🖐️ 5. 카드 좌우 스와이프 제스처 인터랙션 엔진 (확정 순서에 따른 이전/다음 순환)
var cardTouchStartX = 0;
var cardTouchStartY = 0;
var cardTouchStartTime = 0;
var isCardSwiping = false;
var isCardPointerDown = false;

function initCardSwipeGesture() {
  var card = document.getElementById('packShareCaptureArea');
  if (!card) return;

  card.style.userSelect = 'none';
  card.style.cursor = 'grab';

  if (card.dataset.swipeBound === 'true') return;
  card.dataset.swipeBound = 'true';

  function handleStart(clientX, clientY) {
    cardTouchStartX = clientX;
    cardTouchStartY = clientY;
    cardTouchStartTime = Date.now();
    isCardSwiping = false;
    isCardPointerDown = true;
    card.style.transition = 'none';
    card.style.cursor = 'grabbing';
  }

  function handleMove(clientX, clientY) {
    if (!isCardPointerDown) return;
    var diffX = clientX - cardTouchStartX;
    var diffY = clientY - cardTouchStartY;
    var absX = Math.abs(diffX);
    var absY = Math.abs(diffY);

    if (absY > absX && absY > 6) {
      isCardPointerDown = false;
      isCardSwiping = false;
      card.style.transform = 'translateX(0px) rotate(0deg)';
      card.style.opacity = '1';
      return;
    }

    if (absX > 10 && absX > absY) {
      isCardSwiping = true;
      card.style.transform = 'translateX(' + (diffX * 0.4) + 'px) rotate(' + (diffX * 0.02) + 'deg)';
      card.style.opacity = String(Math.max(0.6, 1 - (absX / 500)));
    }
  }

  function handleEnd(clientX, clientY) {
    if (!isCardPointerDown) return;
    isCardPointerDown = false;
    card.style.cursor = 'grab';
    card.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease';

    var diffX = clientX - cardTouchStartX;
    var diffY = clientY - cardTouchStartY;
    var absX = Math.abs(diffX);
    var absY = Math.abs(diffY);
    var duration = Date.now() - cardTouchStartTime;

    var curIdx = TEMPLATE_ORDER.indexOf(selectedTemplateId);
    if (curIdx === -1) curIdx = 0;

    if (isCardSwiping && (absX > 30 || (absX > 15 && duration < 250)) && absX > absY) {
      if (diffX < 0) {
        card.style.transform = 'translateX(-40px)';
        card.style.opacity = '0.3';
        setTimeout(function() {
          var prevIdx = (curIdx - 1 + TEMPLATE_ORDER.length) % TEMPLATE_ORDER.length;
          switchShareCardTemplate(TEMPLATE_ORDER[prevIdx], true);
          card.style.transform = 'translateX(0px)';
          card.style.opacity = '1';
        }, 70);
      } else {
        card.style.transform = 'translateX(40px)';
        card.style.opacity = '0.3';
        setTimeout(function() {
          var nextIdx = (curIdx + 1) % TEMPLATE_ORDER.length;
          switchShareCardTemplate(TEMPLATE_ORDER[nextIdx], true);
          card.style.transform = 'translateX(0px)';
          card.style.opacity = '1';
        }, 70);
      }
    } else {
      card.style.transform = 'translateX(0px) rotate(0deg)';
      card.style.opacity = '1';
    }
    isCardSwiping = false;
  }

  card.addEventListener('touchstart', function(e) {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  card.addEventListener('touchmove', function(e) {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  card.addEventListener('touchend', function(e) {
    var endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : cardTouchStartX;
    var endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : cardTouchStartY;
    handleEnd(endX, endY);
  }, { passive: true });

  card.addEventListener('mousedown', function(e) {
    handleStart(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', function(e) {
    if (isCardPointerDown) handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', function(e) {
    if (isCardPointerDown) handleEnd(e.clientX, e.clientY);
  });
}

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
  var weight = record ? record.weightKg : '0.00';
  var dateStr = (record && record.date) ? record.date : (function() {
    var d = new Date();
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  })();

  var targetSpot = (spot !== undefined && spot !== null) ? String(spot).trim() : '';
  var targetMemo = (memo !== undefined && memo !== null) ? String(memo).trim() : '';
  var list = items || [];

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