// =========================================================================
// 🚀 [templates.js] 19종 템플릿 엔진 & 포토 카드 스튜디오 마스터 (v2.6.0)
// =========================================================================
window.currentSharePhoto = window.currentSharePhoto || '';
window.currentPhotoTextColor = window.currentPhotoTextColor || 'white';
window.currentCardRatio = window.currentCardRatio || '9/16';
var currentCustomRatioVal = 0.75;
var currentPhotoScaleVal = 1.0;

function ensurePhotoStudioDOM() {
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) return studio;

  studio = document.createElement('div');
  studio.id = 'photoStudioOverlay';
  studio.style.cssText = 'display:none; position:fixed; inset:0; z-index:2000085 !important; background:#000000; justify-content:center; align-items:center; overflow:hidden; box-sizing:border-box; overscroll-behavior:none !important; touch-action:pan-y !important;';
  
  studio.innerHTML = `
    <div id="photoStudioStage" style="position:relative; width:100%; height:100%; max-width:440px; display:flex; justify-content:center; align-items:center; padding:env(safe-area-inset-top, 0px) 0 env(safe-area-inset-bottom, 0px) 0; box-sizing:border-box;">
      <div id="photoStudioCardTarget" style="width:100%; max-height:100%; overflow:hidden; position:relative; display:flex; justify-content:center; align-items:center;"></div>
      
      <div style="position:absolute; top:calc(12px + env(safe-area-inset-top, 0px)); left:14px; right:14px; display:flex; justify-content:space-between; align-items:center; z-index:100;">
        <button type="button" style="background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.25); color:#fff; font-size:0.75rem; font-weight:800; padding:6px 12px; border-radius:20px; cursor:pointer;" onclick="window.closePhotoStudio()">◀ 뒤로</button>
        <div style="display:flex; gap:5px; align-items:center;">
          <div style="display:flex; background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.25); border-radius:20px; padding:3px 4px; gap:3px;">
            <button type="button" id="btnStudioColorWhite" style="background:#ffffff; color:#000; border:none; width:22px; height:22px; border-radius:50%; font-size:0.65rem; font-weight:900; cursor:pointer;" onclick="window.setStudioTextColor('white')">W</button>
            <button type="button" id="btnStudioColorBlack" style="background:#111111; color:#fff; border:1px solid rgba(255,255,255,0.3); width:22px; height:22px; border-radius:50%; font-size:0.65rem; font-weight:900; cursor:pointer;" onclick="window.setStudioTextColor('black')">B</button>
          </div>
          <!-- 📥 고품질 SVG 벡터 다운로드 [저장] 버튼 -->
          <button type="button" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.25); color:#ffffff; font-size:0.75rem; font-weight:800; padding:6px 10px; border-radius:20px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" onclick="window.saveStudioCardToPhone()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>저장</span>
          </button>
          <!-- 템플릿 화면으로 적용 복귀 [확인] 버튼 -->
          <button type="button" style="background:#ffffff; color:#000000; font-size:0.76rem; font-weight:900; padding:6px 13px; border-radius:20px; border:none; cursor:pointer; box-shadow:0 2px 10px rgba(255,255,255,0.2);" onclick="window.applyStudioCardToTemplate()">확인 ✓</button>
        </div>
      </div>

      <div id="studioFreeRatioSliderContainer" style="display:none; position:absolute; bottom:calc(58px + env(safe-area-inset-bottom, 0px)); left:20px; right:20px; background:rgba(0,0,0,0.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.2); border-radius:14px; padding:8px 12px; z-index:100; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:#94a3b8; font-weight:700;">
          <span>비율 조절</span>
          <span id="freeRatioValLabel" style="color:#ffffff; font-family:'Space Grotesk', sans-serif; font-weight:900;">3 : 4</span>
        </div>
        <input type="range" id="studioFreeRatioSlider" min="0.52" max="1.0" step="0.01" value="0.75" style="width:100%; accent-color:#ffffff; cursor:pointer;" oninput="window.handleFreeRatioChange(this.value)" />

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.65rem; color:#94a3b8; font-weight:700; border-top:1px dashed rgba(255,255,255,0.15); padding-top:4px;">
          <span>사진 확대</span>
          <span id="freePhotoScaleLabel" style="color:#34d399; font-family:'Space Grotesk', sans-serif; font-weight:900;">100%</span>
        </div>
        <input type="range" id="studioPhotoScaleSlider" min="1.0" max="1.6" step="0.02" value="1.0" style="width:100%; accent-color:#34d399; cursor:pointer;" oninput="window.handlePhotoScaleChange(this.value)" />
      </div>

      <div style="position:absolute; bottom:calc(12px + env(safe-area-inset-bottom, 0px)); display:flex; background:rgba(0,0,0,0.65); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2); border-radius:24px; padding:4px 6px; gap:3px; z-index:100; overflow-x:auto; max-width:92%;">
        <button type="button" id="btnStudioRatioAuto" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('auto')">자동</button>
        <button type="button" id="btnStudioRatio11" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('1/1')">1:1</button>
        <button type="button" id="btnStudioRatio45" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('4/5')">4:5</button>
        <button type="button" id="btnStudioRatio34" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#cbd5e1; white-space:nowrap;" onclick="window.setStudioRatio('3/4')">3:4</button>
        <button type="button" id="btnStudioRatio916" class="modal-btn" style="font-size:0.65rem; font-weight:900; padding:4px 8px; border-radius:14px; background:#ffffff; color:#000; white-space:nowrap;" onclick="window.setStudioRatio('9/16')">9:16</button>
        <button type="button" id="btnStudioRatioFree" class="modal-btn" style="font-size:0.65rem; font-weight:800; padding:4px 8px; border-radius:14px; background:transparent; color:#ffffff; border:1px dashed rgba(255,255,255,0.4); white-space:nowrap;" onclick="window.setStudioRatio('free')">자유 🎚️</button>
      </div>
    </div>
  `;
  document.body.appendChild(studio);
  return studio;
}

window.openPhotoStudio = function() {
  document.body.classList.add('pack-share-open');
  if (typeof window.closePackShareModal === 'function') window.closePackShareModal();
  var studio = ensurePhotoStudioDOM();
  if (studio) studio.style.setProperty('display', 'flex', 'important');
  window.updateStudioUI();
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(15);
};

window.closePhotoStudio = function() {
  var studio = document.getElementById('photoStudioOverlay');
  if (studio) studio.style.setProperty('display', 'none', 'important');
  var modal = document.getElementById('packShareModalOverlay');
  if (modal) modal.style.setProperty('display', 'flex', 'important');
  if (typeof window.updateShareCardLive === 'function') window.updateShareCardLive();
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
  var img = document.getElementById('photoStudioBgImage');
  if (img) img.style.transform = 'scale(' + currentPhotoScaleVal + ')';
};

window.setStudioTextColor = function(color) {
  window.currentPhotoTextColor = color;
  window.updateStudioUI();
  window.updateStudioCardLive();
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
};

window.updateStudioUI = function() {
  var mapBtns = { 'auto': 'btnStudioRatioAuto', '1/1': 'btnStudioRatio11', '4/5': 'btnStudioRatio45', '3/4': 'btnStudioRatio34', '9/16': 'btnStudioRatio916', 'free': 'btnStudioRatioFree' };
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

  try {
    var canvas = await html2canvas(card, { backgroundColor: '#000000', scale: 2.5, useCORS: true, allowTaint: true, logging: false });
    var link = document.createElement('a');
    link.download = '낭만루트_포토카드_' + Date.now() + '.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.88);
    link.click();
    if (typeof showToast === 'function') showToast('포토 카드가 폰 갤러리에 저장되었습니다!', 'success', 2200);
  } catch (e) {
    if (typeof showToast === 'function') showToast('저장 중 오류가 발생했습니다.', 'warn');
  }
};

window.applyStudioCardToTemplate = async function() {
  var card = document.getElementById('photoStudioCardTarget');
  if (!card || typeof html2canvas === 'undefined') return;
  if (typeof triggerHaptic === 'function') triggerHaptic(12);

  try {
    var canvas = await html2canvas(card, { backgroundColor: '#000000', scale: 2.0, useCORS: true, allowTaint: true, logging: false });
    
    // 📐 1200px 초과 방어 및 150KB 내외 레티나 최적 압축 (용량 폭탄 원천 차단)
    var targetCanvas = canvas;
    var maxDim = Math.max(canvas.width, canvas.height);
    if (maxDim > 1200) {
      var s = 1200 / maxDim;
      var rCanvas = document.createElement('canvas');
      rCanvas.width = Math.round(canvas.width * s);
      rCanvas.height = Math.round(canvas.height * s);
      var ctx = rCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, rCanvas.width, rCanvas.height);
      targetCanvas = rCanvas;
    }
    var finalPhotoUrl = targetCanvas.toDataURL('image/jpeg', 0.78);

    window.currentSharePhoto = finalPhotoUrl;
    if (window.currentShareRecord) {
      window.currentShareRecord.customTemplatePhoto = finalPhotoUrl; // 🌟 뒷면 템플릿 대체 키로 직통 바인딩
      window.currentShareRecord.isPhotoCardMode = true;
    }

    var captureArea = document.getElementById('packShareCaptureArea');
    if (captureArea) {
      captureArea.innerHTML = `
        <div style="width:100%; aspect-ratio:3/4; border-radius:14px; overflow:hidden; position:relative; background:#000;">
          <img src="${finalPhotoUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
        </div>
      `;
    }

    var studio = document.getElementById('photoStudioOverlay');
    if (studio) studio.style.setProperty('display', 'none', 'important');
    var shareModal = document.getElementById('packShareModalOverlay');
    if (shareModal) shareModal.style.setProperty('display', 'flex', 'important');

    if (typeof showToast === 'function') showToast('포토 카드가 템플릿 뒷면으로 장착되었습니다!', 'info', 2000);
  } catch (err) {
    if (typeof showToast === 'function') showToast('적용 중 오류가 발생했습니다.', 'warn');
  }
};
window.updateStudioCardLive = function() {
  var container = document.getElementById('photoStudioCardTarget');
  if (!container || !window.currentSharePhoto) return;

  var spotInput = document.getElementById('shareCardSpotInput');
  var memoInput = document.getElementById('shareCardMemoInput');
  
  var spotVal = (spotInput && spotInput.value.trim()) ? spotInput.value.trim() : (window.currentShareRecord && window.currentShareRecord.spot ? window.currentShareRecord.spot : '나의 힐링 스팟');
  var memoVal = (memoInput && memoInput.value.trim()) ? memoInput.value.trim() : (window.currentShareRecord && window.currentShareRecord.oneLineMemo ? window.currentShareRecord.oneLineMemo : '');

  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var nick = (profile && profile.nickname) ? profile.nickname : '낭만백패커';
  var isDarkText = (window.currentPhotoTextColor === 'black');
  
  var colorPrimary = isDarkText ? '#0f172a' : '#ffffff';
  var colorSub = isDarkText ? '#334155' : '#e2e8f0';
  var glassBg = isDarkText ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.28)';
  var glassBorder = isDarkText ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.22)';
  var textShadow = isDarkText ? 'text-shadow: 0 1px 2px rgba(255,255,255,0.6);' : 'text-shadow: 0 1px 3px rgba(0,0,0,0.85);';

  var items = (Array.isArray(window.currentShareItems) && window.currentShareItems.length > 0) ? window.currentShareItems : (window.currentShareRecord ? (window.currentShareRecord.items || []) : []);
  var totalGrams = items.reduce(function(sum, g) { return sum + Number(g.weight || 0); }, 0);
  var weightKg = (totalGrams > 0) ? (totalGrams / 1000).toFixed(2) : (window.currentShareRecord ? (window.currentShareRecord.weightKg || '0.00') : '0.00');

  var gearListHtml = renderAdaptiveGearList(items, {
    nameColor: colorPrimary,
    wtColor: isDarkText ? '#0284c7' : '#38bdf8',
    bullet: '· ',
    fontSize: '0.55rem'
  });

  var ratioVal = (window.currentCardRatio === 'free') 
    ? currentCustomRatioVal 
    : (window.currentCardRatio === '1/1' ? '1/1' : (window.currentCardRatio === '4/5' ? '4/5' : (window.currentCardRatio === '3/4' ? '3/4' : '9/16')));

  container.innerHTML = `
    <div style="position:relative; width:100%; max-width:370px; aspect-ratio:${ratioVal}; max-height:84vh; margin:0 auto; border-radius:16px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.95); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
      <img id="photoStudioBgImage" src="${window.currentSharePhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transform:scale(${currentPhotoScaleVal}); pointer-events:none; z-index:1;" />
      <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.65) 100%); pointer-events:none; z-index:2;"></div>
      
      <div style="position:relative; z-index:3; width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:12px 10px; box-sizing:border-box;">
        
        <div style="background:${glassBg}; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid ${glassBorder}; border-radius:10px; padding:7px 10px; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.88rem; font-weight:900; color:${colorPrimary}; ${textShadow} overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              ${SVG_ICONS.pin} ${escapeHtml(spotVal)}
            </div>
            <span style="font-family:'Space Grotesk', sans-serif; font-size:0.88rem; font-weight:900; color:#34d399; ${textShadow} flex-shrink:0; margin-left:6px;">${weightKg}kg</span>
          </div>
          ${memoVal ? `<div style="font-size:0.56rem; color:${colorSub}; ${textShadow} font-style:italic; margin-top:2px;">“${escapeHtml(memoVal)}”</div>` : ''}
        </div>

        <div style="background:${glassBg}; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid ${glassBorder}; border-radius:10px; padding:6px 10px; max-height:48%; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; margin:auto 0 6px 0; box-sizing:border-box;">
          <div style="font-size:0.54rem; font-weight:900; color:${colorPrimary}; ${textShadow} letter-spacing:1px; margin-bottom:3px; border-bottom:1px solid ${glassBorder}; padding-bottom:2px; display:flex; justify-content:space-between;">
            <span>PACKING LIST</span>
            <span>${items.length} ITEMS</span>
          </div>
          <div style="flex:1; overflow:hidden; ${textShadow}">
            ${gearListHtml}
          </div>
        </div>

        <div style="background:${glassBg}; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid ${glassBorder}; border-radius:8px; padding:4px 8px; text-align:center; box-sizing:border-box;">
          <span style="font-size:0.60rem; font-weight:900; color:#34d399; ${textShadow} display:inline-flex; align-items:center; gap:3px;">
            ${SVG_ICONS.lntShield} <span>[${escapeHtml(nick)}]님은 LNT를 준수합니다</span>
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
      background: #38bdf8 !important;
      color: #000000 !important;
      border-color: #38bdf8 !important;
      font-weight: 900 !important;
      box-shadow: 0 2px 8px rgba(56, 189, 248, 0.45) !important;
    }
  `;
  document.head.appendChild(chipStyle);
}

// 🔀 [템플릿 확정 정렬 순서 및 명칭 정의 (19종 체제 - 젠 제거)]
var TEMPLATE_ORDER = [1, 8, 15, 2, 12, 3, 18, 4, 14, 5, 11, 6, 16, 7, 17, 13, 9, 19, 10];
var TEMPLATE_NAMES = {
  1: '🧾 영수증',
  8: '☁️ 솜사탕',
  15: '🍑 살구노을',
  2: '🎫 보딩패스',
  12: '🌸 라벤더',
  3: '📮 에어메일',
  18: '🍋 레몬버터',
  4: '🏛️ 뮤지엄',
  14: '🏷️ 다꾸스티커',
  5: '⚡ CAD 도면',
  11: '💖 블러썸',
  6: '📸 코닥 슬라이드',
  16: '🌙 핑크문',
  7: '📖 매거진',
  17: '🍦 민트젤라또',
  13: '☁️ 스카이블루',
  9: '🧈 버터',
  19: '✨ 럭셔리',
  10: '🌿 세이지'
};
// 🎨 [내장 SVG 아이콘 팩 - 참조 에러 원천 방지]
var SVG_ICONS = window.SVG_ICONS || {
  brandLogo: function(color, stroke) {
    color = color || '#ffffff';
    stroke = stroke || '#fda4af';
    return '<svg viewBox="0 0 32 32" fill="none" style="width:20px; height:20px; display:block; flex-shrink:0;">' +
      '<circle cx="21" cy="6" r="9" fill="rgba(244,114,182,0.15)"/>' +
      '<circle cx="21" cy="6" r="6" fill="rgba(245,158,11,0.2)"/>' +
      '<circle cx="21" cy="6" r="3.8" fill="rgba(251,191,36,0.35)"/>' +
      '<circle cx="2" cy="24" r="1.8" fill="' + stroke + '"/>' +
      '<circle cx="9" cy="12" r="2.2" fill="' + stroke + '"/>' +
      '<circle cx="14" cy="16" r="1.8" fill="' + stroke + '"/>' +
      '<circle cx="13" cy="24" r="1.8" fill="' + stroke + '"/>' +
      '<path d="M2 24L9 12H12.5L14 16L10 16M10 16L13 24" stroke="' + stroke + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="21" cy="6" r="2.8" fill="#f59e0b"/>' +
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
    photo: '',
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

    return '<div class="spot-dropdown-item" data-spot="' + safeName + '" data-elevation="' + safeElev + '" onclick="window.handleSpotSearchItemClick(this)">' +
      '<div style="font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; pointer-events:none;">📍 ' + safeName + '</div>' +
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
  
  var token = localStorage.getItem('user_auth_token');
  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var isLogged = !!(token && token.trim().length > 0 && profile && profile.id && String(profile.id).startsWith('kakao_'));

  // 🔒 [비회원 감지 시]: 안내 토스트 출력 + 모달 닫기 + 로그인 창 표출
  if (!isLogged) {
    if (typeof triggerHaptic === 'function') triggerHaptic(12);
    if (typeof showToast === 'function') {
      showToast('🔒 보관함 등록 및 피드 공유는 카카오 1초 로그인 후 이용하실 수 있습니다.', 'info', 3000);
    }
    
    var currentSpot = document.getElementById('shareCardSpotInput')?.value || '';
    var currentMemo = document.getElementById('shareCardMemoInput')?.value || '';
    if (currentSpot) localStorage.setItem('okbm_pending_vault_spot', currentSpot);
    if (currentMemo) localStorage.setItem('okbm_pending_vault_memo', currentMemo);

    if (typeof closePackShareModal === 'function') closePackShareModal();

    setTimeout(function() {
      if (typeof openLoginModal === 'function') {
        openLoginModal();
        var loginModal = document.getElementById('loginModalOverlay');
        if (loginModal) {
          loginModal.style.setProperty('z-index', '2000050', 'important');
        }
      }
    }, 150);
    return;
  }

  window.__isSavingCardLock = true;

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

    // 🌟 [스튜디오 포토 카드 vs 일반 현장 사진 분리 엔진]
    var studioTmplPhoto = rec.customTemplatePhoto || (rec.isPhotoCardMode ? window.currentSharePhoto : '');
    var photosToSave = [];

    if (studioTmplPhoto) {
      // 🛡️ 스튜디오 완성 카드는 오직 뒷면에만 장착되며, 앞면은 향후 출정 현장 사진 등록을 위해 100% 비워둠
      photosToSave = [];
    } else {
      if (Array.isArray(window.__studioMultiPhotos) && window.__studioMultiPhotos.length > 0) {
        photosToSave = window.__studioMultiPhotos.slice(0, 10);
      } else if (Array.isArray(rec.photos) && rec.photos.length > 0) {
        photosToSave = rec.photos.slice(0, 10);
      } else if (rec.photo && typeof rec.photo === 'string' && rec.photo.length > 10) {
        photosToSave = [rec.photo];
      }
    }

   // ⚡ 1. 0.01초 낙관적 로컬 즉시 확정 (블로킹 없는 즉각 보관)
    var localMainPhoto = photosToSave.length > 0 ? photosToSave[0] : '';
    var existingPhotoMemos = Array.isArray(rec.photoMemos) && rec.photoMemos.length > 0 ? rec.photoMemos : [];
    var existingFullMemo = rec.memo || (existingPhotoMemos[0] || '');

    var newRecord = {
      id: rec.id || ('pack_' + Date.now()),
      date: rec.date || cleanDateStr,
      spot: liveSpot,
      memo: existingFullMemo,
      oneLineMemo: liveMemo || (liveSpot ? (liveSpot + ' 패킹') : '기록 준비 완료'),
      photoMemos: existingPhotoMemos,
      elevation: rec.elevation || '',
      weightKg: weightKg,
      weightGrams: totalGrams || rec.weightGrams || 0,
      itemCount: items.length,
      items: items,
      customTemplatePhoto: studioTmplPhoto,
      photo: localMainPhoto,
      photos: photosToSave,
      fieldPhoto: localMainPhoto,
      photo_url: localMainPhoto,
      photos_json: JSON.stringify(photosToSave),
      templateId: window.selectedTemplateId || rec.templateId || 1,
      isPublished: true
    };

    if (typeof window.savePackingHistoryRecord === 'function') {
      window.savePackingHistoryRecord(newRecord);
    }

    window.__studioMultiPhotos = null;

    // 🚀 2. 모달 즉시 닫고 보관함으로 0.01초 만에 화면 전환
    if (typeof closePackShareModal === 'function') closePackShareModal();
    
    setTimeout(function() {
      if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
    }, 40);

    if (typeof showToast === 'function') showToast('✓ 보관함에 등록되었습니다. (클라우드 동기화 중)', 'success', 2200);
    if (typeof triggerHaptic === 'function') triggerHaptic(15);

    // 🌐 3. 무중단 백그라운드 워커: 3장 단위 병렬 청크로 클라우드 영구 CDN 승격
    (async function runBackgroundUpload() {
      var finalCloudPhotos = new Array(photosToSave.length);
      var uploadTasks = [];

      for (var i = 0; i < photosToSave.length; i++) {
        (function(idx) {
          var pItem = photosToSave[idx];
          if (typeof pItem === 'string' && pItem.startsWith('data:')) {
            uploadTasks.push(async function() {
              var fnName = 'pack_' + (newRecord.id || Date.now()) + '_' + idx + '.jpg';
              var uUrl = pItem;
              if (typeof window.uploadSinglePhotoSmart === 'function') {
                uUrl = await window.uploadSinglePhotoSmart(pItem, fnName);
              } else if (typeof window.uploadSinglePhotoToDrive === 'function') {
                uUrl = await window.uploadSinglePhotoToDrive(pItem, fnName);
              }
              finalCloudPhotos[idx] = (uUrl && uUrl.startsWith('http')) ? uUrl : pItem;
            });
          } else {
            finalCloudPhotos[idx] = pItem;
          }
        })(i);
      }

      var CHUNK_SIZE = 3;
      for (var c = 0; c < uploadTasks.length; c += CHUNK_SIZE) {
        var chunk = uploadTasks.slice(c, c + CHUNK_SIZE);
        await Promise.allSettled(chunk.map(function(t) { return t(); }));
      }

      var mainCloudPhoto = finalCloudPhotos.length > 0 ? finalCloudPhotos[0] : '';
      newRecord.photo = mainCloudPhoto;
      newRecord.photos = finalCloudPhotos;
      newRecord.fieldPhoto = mainCloudPhoto;
      newRecord.photo_url = mainCloudPhoto;
      newRecord.photos_json = JSON.stringify(finalCloudPhotos);

      if (typeof window.savePackingHistoryRecord === 'function') {
        window.savePackingHistoryRecord(newRecord);
      }
    })();
  } catch (err) {
    console.error('[SaveCard Error]', err);
    if (typeof closePackShareModal === 'function') closePackShareModal();
    if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
  } finally {
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

  modal.style.cssText = 'display:none; position:fixed; inset:0; width:100%; height:100% !important; background:#07090e; z-index:2000010 !important; justify-content:center; align-items:stretch; padding:0 !important; margin:0 !important; overflow:hidden; box-sizing:border-box; transform:translateZ(0); -webkit-transform:translateZ(0); overscroll-behavior:none !important;';

  modal.innerHTML = `
    <div style="width:100%; max-width:440px; margin:0 auto; height:100% !important; display:flex; flex-direction:column; justify-content:space-between; padding:calc(8px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px; box-sizing:border-box; position:relative; overscroll-behavior:none !important;">
      
  <!-- 1. 상단 고정 제어 영역: 헤더 + 박지/메모 폼 + 스튜디오 버튼 + 템플릿 바 -->
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
          <input type="text" id="shareCardMemoInput" placeholder="💬 출발 각오 또는 한줄 메모 (선택사항)" oninput="if(typeof updateShareCardLive==='function') updateShareCardLive();" style="flex:1; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; font-size:0.75rem; padding:0 10px; outline:none; box-sizing:border-box;" />
          
          <input type="file" id="shareCardPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.handleShareCardPhotoUpload(event)" />
          <button type="button" onclick="document.getElementById('shareCardPhotoInput').click()" style="height:32px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.72rem; font-weight:900; padding:0 10px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0; white-space:nowrap; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>스튜디오 ➔</span>
          </button>
        </div>

        <div id="templateSelectorBar" class="template-selector-bar"></div>
      </div>

      <!-- 2. 중앙 엽서 카드 렌더링 영역 (시원하게 확장) -->
      <div style="flex:1 1 0%; min-height:0; display:flex; align-items:center; justify-content:center; width:100%; padding:4px 0; overflow:hidden; box-sizing:border-box;">
        <div id="packShareCaptureArea" style="width:100%; max-width:320px; transition:transform 0.2s ease, opacity 0.2s ease;"></div>
      </div>

   <!-- 3. 하단 액션 버튼 바 (3분할 균형 배치: 닫기 / 공유하기 / 보관함 등록) -->
      <div style="display:flex; gap:6px; width:100%; flex-shrink:0; box-sizing:border-box;">
        <button type="button" onclick="window.closePackShareModal();" style="flex:0.8; height:42px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.76rem; font-weight:800; border-radius:10px; cursor:pointer;">
          닫기
        </button>
        <button type="button" onclick="window.sharePackCardDirect();" style="flex:1.1; height:42px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.78rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span>공유하기</span>
        </button>
        <button type="button" onclick="window.saveCardToVaultAndOpenBasecamp();" style="flex:1.8; height:42px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:1px solid #38bdf8; color:#ffffff; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 14px rgba(2,132,199,0.4);">
          <span>보관함에 출발 등록 ✓</span>
        </button>
      </div>

    </div>
  `;

  return modal;
}

// 📷 [출발 패킹 포토 스튜디오 사진 업로드 핸들러 - templates.js 단독 관리]
window.handleShareCardPhotoUpload = async function(e) {
  var files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  var filesToProcess = files.slice(0, 10);
  if (typeof window.showPhotoLoadingModal === 'function') {
    window.showPhotoLoadingModal(1, filesToProcess.length);
  }

  var validList = [];
  for (var i = 0; i < filesToProcess.length; i++) {
    if (typeof window.showPhotoLoadingModal === 'function') {
      window.showPhotoLoadingModal(i + 1, filesToProcess.length);
    }
    var file = filesToProcess[i];
    var b64 = await new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function(e) {
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
          resolve(canvas.toDataURL('image/jpeg', 0.76));
        };
        img.onerror = function() { resolve(''); };
        img.src = e.target.result;
      };
      reader.onerror = function() { resolve(''); };
      reader.readAsDataURL(file);
    });

    if (b64 && b64.length > 50) validList.push(b64);
  }

  if (typeof window.hidePhotoLoadingModal === 'function') {
    window.hidePhotoLoadingModal();
  }

  if (validList.length > 0) {
    window.__studioMultiPhotos = validList;
    window.currentSharePhoto = validList[0];
    window.openPhotoStudio();
  } else {
    if (typeof showToast === 'function') showToast('사진을 변환하지 못했습니다. 다른 사진으로 시도해주세요.', 'warn');
  }
  e.target.value = '';
};

window.closePackShareModal = function() {
  var modal = document.getElementById('packShareModalOverlay');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
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
  currentShareRecord.oneLineMemo = currentShareRecord.oneLineMemo || ''; // 출정 준비 완료 영구 삭제

  if (spotInput) {
    spotInput.value = autoSpot; // 인풋창은 힌트를 위해 빈칸 유지 또는 자동박지
    if (clearBtn) clearBtn.style.display = autoSpot ? 'flex' : 'none';
  }
  if (memoInput) {
    memoInput.value = currentShareRecord.oneLineMemo || ''; // 인풋창도 완전한 공백 유지
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

    if (absX > 8 && absX > absY) {
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

// 🎨 [엽서 카드 공통 뼈대 전용 스타일시트 자동 주입 - map.html 등 외부 화면 및 캡처 깨짐 100% 방어]
if (!document.getElementById('template-cards-core-style')) {
  var cardCoreStyle = document.createElement('style');
  cardCoreStyle.id = 'template-cards-core-style';
  cardCoreStyle.innerHTML = `
    .tmpl-card-base {
      width: 100% !important;
      aspect-ratio: 3 / 4 !important;
      max-width: 330px !important;
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

  var logoDark = SVG_ICONS.brandLogo('#000000', '#0284c7');
  var logoWhite = SVG_ICONS.brandLogo('#ffffff', '#38bdf8');
  var logoNavy = SVG_ICONS.brandLogo('#1e3a8a', '#b91c1c');
  var logoPink = SVG_ICONS.brandLogo('#f43f5e', '#fde047');
  var logoSunset = SVG_ICONS.brandLogo('#ea580c', '#fb7185');
  var logoSage = SVG_ICONS.brandLogo('#15803d', '#86efac');
  var logoTeal = SVG_ICONS.brandLogo('#0d9488', '#5eead4');

  var makePledge = function(color, bg, border, sub) {
    return '<div class="tmpl-pledge-wrap" style="background:' + bg + '; border-color:' + border + ';">' +
      '<span class="tmpl-pledge-title" style="color:' + color + ';">' +
        SVG_ICONS.lntShield + ' <span>[' + escapeHtml(nick) + ']님은 LNT를 준수합니다</span>' +
      '</span>' +
      '<span class="tmpl-pledge-sub" style="color:' + sub + ';">머문 자리는 처음처럼 · 비화식 실천 · 흔적 없는 여정</span>' +
    '</div>';
  };

  switch (Number(tmplId)) {
    case 1: // 🧾 영수증
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

    case 2: // 🎫 보딩패스
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

    case 3: // 📮 에어메일
      return '<div class="tmpl-card-base" style="background:#fcfbf7; color:#1e293b; padding:12px 10px; font-family:\'Noto Serif KR\', serif; border:4px solid #1e3a8a;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1.2px solid #cbd5e1; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:4px;">' +
              logoNavy +
              '<div>' +
                '<div style="font-family:\'SUIT\', sans-serif; font-size:0.85rem; font-weight:900; color:#1e3a8a; line-height:1;">낭만루트 PAR AVION</div>' +
                '<div style="font-size:0.44rem; color:#64748b; font-family:\'Space Grotesk\', sans-serif;">ROMANTIC POSTCARD</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              '<div style="width:20px; height:20px; border-radius:50%; border:1.2px solid #64748b; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.32rem; color:#64748b; font-family:\'Space Grotesk\', sans-serif;">' +
                '<span>SEL</span>' +
              '</div>' +
              '<div style="width:26px; height:32px; border:1.2px dashed #1e3a8a; background:#f1f5f9; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:0.36rem; font-weight:900; color:#1e3a8a; font-family:\'SUIT\', sans-serif;">' +
                '<span>LNT</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.90rem; font-weight:900; color:#0f172a; font-family:\'SUIT\', sans-serif; line-height:1.2; min-height:1.2em;">' +
              spotPinText +
            '</div>' +
            (targetMemo ? '<div style="font-size:0.58rem; color:#334155; font-style:italic; margin-top:1px;">' + memoQuotes + '</div>' : '') +
          '</div>' +
          '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:5px; padding:4px 6px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#1e293b', wtColor: '#1e3a8a', bullet: '· ' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #cbd5e1; padding-top:2px;">' +
            '<span style="font-size:0.54rem; color:#64748b; font-family:\'Space Grotesk\', sans-serif;">AIRMAIL TOTAL SCALE</span>' +
            '<span style="font-size:1.32rem; font-weight:900; color:#1e3a8a; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          '<div style="font-size:0.62rem; color:#1e3a8a; text-align:center; font-weight:900; background:#f1f5f9; border:1.2px solid #1e3a8a; padding:3px; border-radius:4px; margin-top:2px; font-family:\'SUIT\', sans-serif;">' +
            '📮 [' + escapeHtml(nick) + ']님은 LNT를 준수합니다' +
          '</div>' +
        '</div>' +
      '</div>';

    case 4: // 🏛️ 뮤지엄
      return '<div class="tmpl-card-base" style="background:#f4f6f4; color:#1c1917; padding:12px 11px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #1c1917;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.5px solid #1c1917; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:4px;">' +
              logoDark +
              '<span style="font-family:\'SUIT\', sans-serif; font-size:0.85rem; font-weight:900; letter-spacing:-0.02em;">낭만루트 // EXHIBITION</span>' +
            '</div>' +
            '<span style="font-family:\'JetBrains Mono\', monospace; font-size:0.48rem; color:#52525b;">' + escapeHtml(dateStr) + '</span>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.44rem; font-weight:800; color:#52525b; letter-spacing:1px; font-family:\'Space Grotesk\', sans-serif;">EXPEDITION OBJECT</div>' +
            '<div style="font-size:1.0rem; font-weight:900; color:#1c1917; line-height:1.15; font-family:\'SUIT\', sans-serif; min-height:1.15em;">' +
              spotText +
            '</div>' +
            (targetMemo ? '<div style="font-size:0.60rem; color:#44403c; font-style:italic; margin-top:1px; border-left:2px solid #1c1917; padding-left:4px;">' + memoQuotes + '</div>' : '') +
          '</div>' +
          '<div style="background:#ffffff; border:1px solid #d1d5db; border-radius:5px; padding:4px 6px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#27272a', wtColor: '#059669', bullet: '■ ' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #1c1917; padding-top:2px;">' +
            '<span style="font-size:0.54rem; color:#52525b; font-family:\'Space Grotesk\', sans-serif; font-weight:800;">TOTAL PAYLOAD</span>' +
            '<span style="font-size:1.35rem; font-weight:900; color:#1c1917; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' <small style="font-size:0.65rem;">KG</small></span>' +
          '</div>' +
          '<div style="font-size:0.65rem; color:#ffffff; background:#1c1917; text-align:center; font-weight:900; padding:4px; border-radius:3px; margin-top:2px; font-family:\'SUIT\', sans-serif;">' +
            '🏛️ [' + escapeHtml(nick) + ']님은 LNT를 준수합니다' +
          '</div>' +
        '</div>' +
      '</div>';

    case 5: // ⚡ CAD 도면
      return '<div class="tmpl-card-base" style="background:#0a0d14; border:1.5px solid #d4ff00; padding:12px 11px; font-family:\'JetBrains Mono\', monospace; color:#f8fafc; position:relative;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1.2px solid #334155; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:4px;">' +
              logoWhite +
              '<div>' +
                '<div style="font-family:\'Space Grotesk\', sans-serif; font-size:0.78rem; font-weight:900; letter-spacing:1px; color:#ffffff;">낭만루트 // CAD_SCHEMA</div>' +
                '<div style="font-size:0.42rem; color:#94a3b8;">DIAGNOSTIC v2.6</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:0.46rem; font-weight:900; color:#d4ff00;">37°41\'N</div>' +
          '</div>' +
          '<div style="background:rgba(212,255,0,0.06); border-left:2.5px solid #d4ff00; border:1px solid #1e293b; padding:3px 5px; border-radius:0 4px 4px 0; min-height:1.4em;">' +
            '<div style="font-size:0.88rem; font-weight:900; color:#ffffff; font-family:\'SUIT\', sans-serif;">' + spotText + '</div>' +
            (targetMemo ? '<div style="font-size:0.52rem; color:#38bdf8; font-style:italic;">&gt;&gt; LOG: "' + escapeHtml(targetMemo) + '"</div>' : '') +
          '</div>' +
          '<div style="background:#07090e; border:1px solid #1e293b; border-radius:4px; padding:3px 5px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#e2e8f0', wtColor: '#d4ff00', bullet: '<span style="color:#d4ff00; margin-right:2px;">+</span>' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #334155; padding-top:2px;">' +
            '<span style="font-size:0.50rem; color:#94a3b8;">NET MASS</span>' +
            '<span style="font-size:1.35rem; font-weight:900; color:#ffffff; font-family:\'JetBrains Mono\', monospace;">' + weight + '<span style="font-size:0.62rem; color:#d4ff00; margin-left:2px;">KG</span></span>' +
          '</div>' +
          '<div style="font-size:0.65rem; color:#0a0d14; background:#d4ff00; text-align:center; font-weight:900; padding:4px; border-radius:4px; margin-top:2px; font-family:\'SUIT\', sans-serif;">' +
            '⚡ [' + escapeHtml(nick) + ']님은 LNT를 준수합니다' +
          '</div>' +
        '</div>' +
      '</div>';

    case 6: // 📸 코닥 슬라이드
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

    case 7: // 📖 매거진
      return '<div class="tmpl-card-base" style="background:#f4f1ea; color:#1a1918; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #1a1918;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.5px solid #1a1918; padding-bottom:2px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoDark +
              '<span style="font-family:\'SUIT\', sans-serif; font-size:0.82rem; font-weight:900;">낭만루트 MAGAZINE</span>' +
            '</div>' +
            '<span style="font-size:0.44rem; font-weight:900; background:#000; color:#fff; padding:1px 3px; border-radius:2px;">ISSUE 08</span>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:0.85rem; font-weight:900; color:#1a1918; line-height:1.2; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' +
              spotPinText +
            '</div>' +
            '<div style="font-size:0.56rem; font-weight:800; color:#57534e;">' +
              'Story by <strong>' + escapeHtml(nick) + '</strong> (' + dateStr + ')' +
            '</div>' +
          '</div>' +
          '<div style="background:#e8e4dc; padding:4px 5px; border-radius:5px; border:1px solid #d6d0c4; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#292524', wtColor: '#000000', subColor: '#78716c' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; padding:0 2px;">' +
            '<span style="font-size:0.54rem; font-weight:800; color:#78716c;">TOTAL WEIGHT</span>' +
            '<span style="font-size:1.32rem; font-weight:900; color:#000; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' KG</span>' +
          '</div>' +
          makePledge('#059669', '#e8e4dc', '#d6d0c4', '#78716c') +
        '</div>' +
      '</div>';

    case 8: // ☁️ 솜사탕
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

    case 9: // 🧈 버터
      return '<div class="tmpl-card-base" style="background:#fffdf5; color:#292524; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fed7aa;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1px solid #f5eedc; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoSunset +
              '<span style="font-weight:900; font-size:0.75rem; color:#ea580c; font-family:\'SUIT\', sans-serif;">낭만루트 🧈 BUTTER</span>' +
            '</div>' +
            '<span style="font-family:\'Caveat\', cursive; font-size:0.80rem; color:#ea580c; font-weight:700;">Sunny Moments</span>' +
          '</div>' +
          '<div style="background:#ffffff; border:1px solid #f5eedc; border-radius:6px; padding:4px 6px; min-height:1.4em;">' +
            '<div style="font-size:0.85rem; font-weight:900; color:#431407; line-height:1.2; font-family:\'SUIT\', sans-serif;">' + spotPinText + '</div>' +
            '<div style="font-size:0.56rem; color:#78716c; margin-top:1px;">Explorer. <strong style="color:#ea580c;">' + escapeHtml(nick) + '</strong> (' + dateStr + ')</div>' +
          '</div>' +
          '<div style="background:#fcfaf5; border:1px dashed #d6cfc4; border-radius:6px; padding:4px 6px; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#44403c', wtColor: '#ea580c', subColor: '#a8a29e' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; padding:0 2px;">' +
            '<span style="font-family:\'Caveat\', cursive; font-size:0.80rem; color:#78716c; font-weight:700;">Total Weight:</span>' +
            '<span style="font-size:1.32rem; font-weight:900; color:#ea580c; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#c2410c', '#fff7ed', '#fed7aa', '#9a3412') +
        '</div>' +
      '</div>';

    case 10: // 🌿 세이지
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #f0fdf4 0%, #e6f4ea 100%); color:#14532d; padding:11px 10px; font-family:\'Playfair Display\', serif; border:1.5px solid #86efac;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px solid #bbf7d0; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoSage +
              '<span style="font-size:0.75rem; font-weight:900; color:#15803d; font-style:italic;">낭만 Botanical</span>' +
            '</div>' +
            '<span style="font-size:0.44rem; font-weight:900; background:#16a34a; color:#fff; padding:1px 3px; border-radius:3px;">NATURE</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#14532d; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(255,255,255,0.75); border-radius:5px; padding:4px 6px; border:1px solid #bbf7d0; flex:1; overflow:hidden; font-family:\'Pretendard Variable\', sans-serif;">' +
            renderAdaptiveGearList(list, { nameColor: '#14532d', wtColor: '#16a34a', subColor: '#166534' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed #bbf7d0; padding-top:2px;">' +
            '<span style="font-size:0.58rem; color:#166534; font-style:italic;">Total Weight</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#15803d; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#15803d', 'rgba(21,128,61,0.08)', 'rgba(21,128,61,0.3)', '#166534') +
        '</div>' +
      '</div>';

    case 11: // 💖 블러썸
      return '<div class="tmpl-card-base" style="background:#ffffff; color:#1c1917; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fda4af;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1px solid #ffe4e6; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoPink +
              '<span style="font-family:\'Playfair Display\', serif; font-size:0.75rem; font-weight:900; color:#be185d;">낭만 Blossom</span>' +
            '</div>' +
            '<span style="font-size:0.65rem; color:#f43f5e;">♥</span>' +
          '</div>' +
          '<div style="background:#fff1f2; border-radius:5px; padding:4px 6px; border:1px solid #fecdd3; min-height:1.4em;">' +
            '<div style="font-size:0.85rem; font-weight:900; color:#881337; font-family:\'SUIT\', sans-serif;">' + spotPinText + '</div>' +
            '<div style="font-size:0.56rem; color:#e11d48; font-weight:800;">Explorer. ' + escapeHtml(nick) + '</div>' +
          '</div>' +
          '<div style="background:#fafafa; border-radius:5px; padding:4px 6px; border:1px solid #f4f4f5; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#3f3f46', wtColor: '#e11d48', subColor: '#fb7185' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline;">' +
            '<span style="font-family:\'Playfair Display\', serif; font-size:0.65rem; font-weight:900; color:#881337;">TOTAL</span>' +
            '<span style="font-family:\'Playfair Display\', serif; font-size:1.35rem; font-weight:900; color:#f43f5e;">♥ ' + weight + ' KG</span>' +
          '</div>' +
          makePledge('#be185d', '#ffe4e6', '#fda4af', '#e11d48') +
        '</div>' +
      '</div>';

    case 12: // 🌸 라벤더
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%); color:#581c87; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #d8b4fe;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px solid #e9d5ff; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              SVG_ICONS.brandLogo('#9333ea', '#c084fc') +
              '<span style="font-family:\'Dancing Script\', cursive; font-size:0.90rem; font-weight:700; color:#7e22ce;">Twilight 🌸</span>' +
            '</div>' +
            '<span style="font-size:0.42rem; font-weight:900; background:#9333ea; color:#fff; padding:1px 3px; border-radius:3px;">DREAMY</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#581c87; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(255,255,255,0.85); border-radius:5px; padding:4px 6px; border:1px solid #e9d5ff; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#581c87', wtColor: '#9333ea', subColor: '#6b21a8' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed #e9d5ff; padding-top:2px;">' +
            '<span style="font-size:0.56rem; font-weight:900; color:#6b21a8;">TOTAL WEIGHT</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#7e22ce; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#7e22ce', 'rgba(126,34,206,0.08)', 'rgba(126,34,206,0.3)', '#6b21a8') +
        '</div>' +
      '</div>';

    case 13: // ☁️ 스카이
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%); color:#0c4a6e; padding:11px 10px; font-family:\'Space Grotesk\', sans-serif; border:1.5px solid #7dd3fc;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px solid #bae6fd; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoDark +
              '<span style="font-weight:900; font-size:0.70rem; color:#0284c7;">AZURE TRAIL</span>' +
            '</div>' +
            '<span style="font-size:0.42rem; font-weight:900; background:#0284c7; color:#fff; padding:1px 3px; border-radius:3px;">CLEAN</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#0c4a6e; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(255,255,255,0.85); border-radius:5px; padding:4px 6px; border:1px solid #bae6fd; flex:1; overflow:hidden; font-family:\'Pretendard Variable\', sans-serif;">' +
            renderAdaptiveGearList(list, { nameColor: '#0c4a6e', wtColor: '#0284c7', subColor: '#0369a1' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed #bae6fd; padding-top:2px;">' +
            '<span style="font-size:0.56rem; font-weight:900; color:#0369a1;">TOTAL WEIGHT</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#0284c7;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#0284c7', 'rgba(2,132,199,0.08)', 'rgba(2,132,199,0.3)', '#0369a1') +
        '</div>' +
      '</div>';

    case 14: // 🏷️ 다꾸
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

    case 15: // 🍑 살구노을
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); color:#431407; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fdba74;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px solid #fed7aa; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoSunset +
              '<span style="font-family:\'Caveat\', cursive; font-size:1.0rem; font-weight:700; color:#c2410c;">Sunset 🍑</span>' +
            '</div>' +
            '<span style="font-size:0.46rem; color:#9a3412; font-family:\'JetBrains Mono\', monospace;">' + dateStr + '</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#7c2d12; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(255,255,255,0.75); border-radius:5px; padding:4px 6px; border:1px solid #fed7aa; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#7c2d12', wtColor: '#ea580c', subColor: '#9a3412' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed #fed7aa; padding-top:2px;">' +
            '<span style="font-size:0.56rem; font-weight:900; color:#9a3412;">TOTAL WEIGHT</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#c2410c; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#c2410c', 'rgba(234,88,12,0.08)', 'rgba(234,88,12,0.3)', '#9a3412') +
        '</div>' +
      '</div>';

    case 16: // 🌙 핑크문
      return '<div class="tmpl-card-base" style="background:radial-gradient(circle at 80% 20%, #2e0825 0%, #0d020f 70%, #000000 100%); color:#ffffff; padding:11px 10px; font-family:\'Cinzel\', serif; border:1.5px solid rgba(244,114,182,0.6);">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1px solid rgba(244,114,182,0.25); padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoPink +
              '<span style="font-size:0.72rem; font-weight:900; color:#fb7185;">ROMANTIC ROUTE</span>' +
            '</div>' +
            '<span style="font-size:0.42rem; font-weight:900; background:#e11d48; color:#fff; padding:1px 3px; border-radius:4px;">STARLIGHT</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#ffffff; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(0,0,0,0.55); border-radius:5px; padding:4px 6px; border:1px solid rgba(244,114,182,0.15); flex:1; overflow:hidden; font-family:\'Pretendard Variable\', sans-serif;">' +
            renderAdaptiveGearList(list, { nameColor: '#fce7f3', wtColor: '#f472b6', subColor: '#f43f5e' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed rgba(244,114,182,0.3); padding-top:2px;">' +
            '<span style="font-size:0.56rem; color:#fbcfe8;">TOTAL BPL</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#fb7185; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' KG</span>' +
          '</div>' +
          makePledge('#fb7185', 'rgba(244,63,94,0.15)', 'rgba(244,63,94,0.4)', '#fbcfe8') +
        '</div>' +
      '</div>';

    case 17: // 🍦 민트
      return '<div class="tmpl-card-base" style="background:linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%); color:#064e3b; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #6ee7b7;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1.2px solid #a7f3d0; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoTeal +
              '<span style="font-family:\'Caveat\', cursive; font-size:0.90rem; font-weight:700; color:#0d9488;">Mint Gelato 🍦</span>' +
            '</div>' +
            '<span style="font-size:0.46rem; color:#047857; font-family:\'JetBrains Mono\', monospace;">' + dateStr + '</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#064e3b; font-family:\'SUIT\', sans-serif; min-height:1.2em;">' + spotPinText + '</div>' +
          '<div style="background:rgba(255,255,255,0.8); border-radius:5px; padding:4px 6px; border:1px solid #a7f3d0; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#064e3b', wtColor: '#0d9488', subColor: '#047857' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px dashed #a7f3d0; padding-top:2px;">' +
            '<span style="font-size:0.56rem; font-weight:900; color:#047857;">TOTAL WEIGHT</span>' +
            '<span style="font-size:1.30rem; font-weight:900; color:#0d9488; font-family:\'Space Grotesk\', sans-serif;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#0d9488', 'rgba(13,148,136,0.08)', 'rgba(13,148,136,0.3)', '#047857') +
        '</div>' +
      '</div>';

    case 18: // 🍋 레몬
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

   case 19: // ✨ 럭셔리
      return '<div class="tmpl-card-base" style="background:#121214; color:#f4f4f5; padding:11px 10px; font-family:\'Noto Serif KR\', serif; border:1.5px solid #eab308;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div class="tmpl-row-between" style="border-bottom:1px solid #27272a; padding-bottom:3px;">' +
            '<div style="display:flex; align-items:center; gap:3px;">' +
              logoWhite +
              '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:0.60rem; font-weight:900; color:#fde047;">ARCHIVE</span>' +
            '</div>' +
            '<span style="font-size:0.40rem; color:#71717a; font-family:\'JetBrains Mono\', monospace;">SPEC</span>' +
          '</div>' +
          '<div style="font-size:0.85rem; font-weight:900; color:#ffffff; line-height:1.25; min-height:1.25em;">' + spotText + '</div>' +
          '<div style="background:#18181b; padding:4px 6px; border-radius:5px; border:1px solid #27272a; flex:1; overflow:hidden;">' +
            renderAdaptiveGearList(list, { nameColor: '#d4d4d8', wtColor: '#fde047', subColor: '#71717a' }) +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; border-top:1px solid #27272a; padding-top:2px;">' +
            '<span style="font-size:0.52rem; color:#a1a1aa; font-family:\'Space Grotesk\', sans-serif;">TOTAL WEIGHT</span>' +
            '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:1.30rem; font-weight:900; color:#fde047;">' + weight + ' <small style="font-size:0.55rem; color:#fff;">KG</small></span>' +
          '</div>' +
          '<div style="border:1px solid #3f3f46; background:#18181b; border-radius:4px; padding:3px 4px; text-align:center; margin-top:2px;">' +
            '<span style="font-size:0.60rem; font-weight:900; color:#fde047; display:inline-flex; align-items:center; gap:2px; font-family:\'Pretendard Variable\', sans-serif;">' +
              SVG_ICONS.lntShield + ' <span>[' + escapeHtml(nick) + ']님은 LNT를 준수합니다</span>' +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    default:
      return generateCardMarkup(1, record, items, spot, memo);
  }
}