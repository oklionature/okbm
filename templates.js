// =========================================================================
// 🚀 [templates.js] 20종 템플릿 엔진 & 스와이프 제스처 시스템 (v2.0.6 Auto-Sync Master)
// =========================================================================

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

// 🔀 [템플릿 확정 정렬 순서 및 명칭 정의 (영수증-솜사탕 선두 / 살구↔블러썸 / 스카이↔레몬 교체)]
var TEMPLATE_ORDER = [1, 8, 15, 2, 12, 3, 18, 4, 14, 5, 11, 6, 16, 7, 17, 13, 9, 19, 10, 20];
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
  10: '🌿 세이지',
  20: '🎋 젠(Zen)'
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
    photo: ''
  };

 if (!window.interactiveHistory) window.interactiveHistory = [];
  // 🚀 [등록순서 변경]: 최근 등록은 제일 뒤로 등록 (push)
  window.interactiveHistory.push(newRecord);
  window.packingHistoryList = window.interactiveHistory;

  if (typeof window.saveToIndexedDB === 'function') {
    window.saveToIndexedDB('okbm_packing_history', window.interactiveHistory);
  }
  if (typeof syncUserDataToCloud === 'function') {
    syncUserDataToCloud();
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

// =========================================================================
// [수정 코드 1-1] templates.js : 출발 전 패킹 카드 즉시 보관함 등록 파이프라인
// =========================================================================
window.saveCardToVaultAndOpenBasecamp = async function() {
  var token = localStorage.getItem('user_auth_token');
  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var isLogged = !!(token && token.trim().length > 0 && profile && profile.id && String(profile.id).startsWith('kakao_'));
  if (!isLogged) {
    if (typeof triggerHaptic === 'function') triggerHaptic(10);
    if (typeof showToast === 'function') showToast('🔒 낭만보관함 저장은 로그인 후 이용하실 수 있습니다.');
    if (typeof openLoginModal === 'function') openLoginModal();
    return;
  }

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

  var gearPhoto = window.currentSharePhoto || rec.photo || '';
  var photosToSave = (gearPhoto && typeof gearPhoto === 'string' && gearPhoto.length > 10) ? [gearPhoto] : [];

  var newRecord = {
    id: rec.id || ('pack_' + Date.now()),
    date: rec.date || cleanDateStr,
    spot: liveSpot,
    memo: '',
    oneLineMemo: liveMemo || (liveSpot ? (liveSpot + ' 패킹') : '출정 준비 완료'),
    elevation: rec.elevation || '',
    weightKg: weightKg,
    weightGrams: totalGrams || rec.weightGrams || 0,
    itemCount: items.length,
    items: items,
    photo: photosToSave[0] || '',
    photos: photosToSave,
    fieldPhoto: photosToSave[0] || '',
    templateId: window.selectedTemplateId || rec.templateId || 1
  };

  // 🚀 1. 스마트폰 내장 IndexedDB에 0.05초 만에 즉시 보관
  if (typeof window.savePackingHistoryRecord === 'function') {
    window.savePackingHistoryRecord(newRecord);
  }

  if (typeof closePackShareModal === 'function') closePackShareModal();
  if (typeof window.openHistoryModal === 'function') window.openHistoryModal();
  if (typeof showToast === 'function') showToast('🎒 출정 패킹이 보관함에 등록되었습니다!', 'success', 2500);
  if (typeof triggerHaptic === 'function') triggerHaptic(15);

  // ☁️ 2. 클라우드 동기화 비동기 백업
  if (typeof syncUserDataToCloud === 'function') {
    syncUserDataToCloud(true);
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

  modal.style.cssText = 'display:none; position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#07090e; z-index:2000010 !important; justify-content:center; align-items:stretch; padding:0 !important; margin:0 !important; overflow:hidden; box-sizing:border-box; transform:translateZ(0); -webkit-transform:translateZ(0);';

  modal.innerHTML = `
    <div style="width:100%; max-width:440px; margin:0 auto; height:100dvh; display:flex; flex-direction:column; justify-content:space-between; padding:calc(10px + env(safe-area-inset-top, 0px)) 14px calc(14px + env(safe-area-inset-bottom, 0px)) 14px; box-sizing:border-box; position:relative;">
      
      <div style="display:flex; justify-content:space-between; align-items:center; height:36px; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:1.05rem;">📸</span>
          <span id="currentTmplNameTitle" style="font-size:0.92rem; font-weight:900; color:#ffffff; font-family:'Pretendard Variable', sans-serif;">공유 카드 스튜디오</span>
        </div>
        <button type="button" onclick="window.closePackShareModal();" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:1.0rem; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
      </div>

      <div id="templateSelectorBar" class="template-selector-bar"></div>

      <div style="flex:1 1 0%; min-height:0; display:flex; align-items:center; justify-content:center; width:100%; padding:4px 0; overflow:hidden; box-sizing:border-box;">
        <div id="packShareCaptureArea" style="width:100%; max-width:320px; transition:transform 0.2s ease, opacity 0.2s ease;"></div>
      </div>

      <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0; width:100%; box-sizing:border-box; margin-top:4px;">
        <div style="position:relative; width:100%; display:flex; align-items:center;">
          <input type="text" id="shareCardSpotInput" placeholder="📍 박지/장소명 입력 (자동완성)" oninput="window.handleSpotSearchInput(this.value); if(typeof updateShareCardLive==='function') updateShareCardLive();" style="width:100%; height:36px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:0.78rem; padding:0 30px 0 10px; outline:none; box-sizing:border-box;" />
          <button type="button" id="btnSpotInputClear" onclick="window.clearSpotSearchInput();" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.15); border:none; color:#cbd5e1; width:18px; height:18px; border-radius:50%; font-size:0.65rem; font-weight:900; cursor:pointer; align-items:center; justify-content:center; padding:0;">✕</button>
          <div id="spotSearchDropdown" style="display:none; position:absolute; bottom:42px; left:0; right:0; max-height:180px; overflow-y:auto; background:#0f172a; border:1px solid rgba(56,189,248,0.4); border-radius:8px; z-index:100; box-shadow:0 8px 24px rgba(0,0,0,0.8);"></div>
        </div>

        <input type="text" id="shareCardMemoInput" placeholder="💬 출정 각오 또는 한줄 메모 (선택사항)" oninput="if(typeof updateShareCardLive==='function') updateShareCardLive();" style="width:100%; height:36px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:0.78rem; padding:0 10px; outline:none; box-sizing:border-box;" />
      </div>

      <div style="display:flex; gap:8px; width:100%; flex-shrink:0; margin-top:8px; box-sizing:border-box;">
        <button type="button" onclick="window.closePackShareModal();" style="flex:0.8; height:42px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.78rem; font-weight:800; border-radius:10px; cursor:pointer;">
          닫기
        </button>
        <button type="button" onclick="window.saveCardToVaultAndOpenBasecamp();" style="flex:2; height:42px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:1px solid #38bdf8; color:#ffffff; font-size:0.85rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(2,132,199,0.4);">
          <span>🎒 보관함에 출정 등록 ✓</span>
        </button>
      </div>

    </div>
  `;

  return modal;
}

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

  if (spotInput) {
    spotInput.value = currentShareRecord.spot || '';
    if (clearBtn) clearBtn.style.display = spotInput.value ? 'flex' : 'none';
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

  var nameDisplay = document.getElementById('currentTmplNameTitle') || document.querySelector('.share-card-tmpl-title');
  if (nameDisplay) {
    nameDisplay.textContent = TEMPLATE_NAMES[selectedTemplateId] || '';
  }

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

  var baseStyle = 'width:100%; aspect-ratio:3/4; max-width:330px; margin:0 auto; box-sizing:border-box; border-radius:14px; box-shadow:none; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; position:relative; touch-action:pan-y;';

  var makePledge = function(color, bg, border, sub) {
    return '<div style="margin-top:4px; padding:4px 6px; border:1px dashed ' + border + '; background:' + bg + '; border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; text-align:center;">' +
      '<span style="font-size:0.65rem; font-weight:900; color:' + color + '; letter-spacing:0.5px; display:inline-flex; align-items:center; gap:3px;">' +
        SVG_ICONS.lntShield + ' <span>[' + escapeHtml(nick) + ']님은 LNT를 준수합니다</span>' +
      '</span>' +
      '<span style="font-size:0.46rem; color:' + sub + ';">머문 자리는 처음처럼 · 비화식 실천 · 흔적 없는 여정</span>' +
    '</div>';
  };

  switch (Number(tmplId)) {
    case 1: // 🧾 영수증
      return '<div style="' + baseStyle + ' background:#f4f1ea; color:#1c1917; padding:12px 11px; font-family:\'JetBrains Mono\', monospace; border:1.5px solid #78716c; border-top:3px dashed #78716c; border-bottom:3px dashed #78716c;">' +
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
          '<div style="border-top:1px dashed #78716c; border-bottom:1px dashed #78716c; padding:2px 0; font-size:0.50rem; font-weight:900; display:flex; justify-content:space-between;">' +
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
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:3px; background:#e7e2d7; padding:3px 5px; border-radius:4px; border:1px solid #d6cfc4;">' +
            '<div style="height:15px; width:75px; background:repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 8px);"></div>' +
            '<div style="border:1.2px solid #1e3a8a; color:#1e3a8a; padding:2px 5px; border-radius:3px; font-size:0.55rem; font-weight:900;">' +
              '★ [' + escapeHtml(nick) + ']님은 LNT를 준수합니다 ★' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    case 2: // 🎫 보딩패스
      return '<div style="' + baseStyle + ' background:#0f172a; border:1.5px solid #334155; padding:12px 11px; font-family:\'Space Grotesk\', sans-serif; color:#ffffff;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px dashed #38bdf8; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:#fcfbf7; color:#1e293b; padding:12px 10px; font-family:\'Noto Serif KR\', serif; border:4px solid #1e3a8a;">' +
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
      return '<div style="' + baseStyle + ' background:#f4f6f4; color:#1c1917; padding:12px 11px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #1c1917;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #1c1917; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:#0a0d14; border:1.5px solid #d4ff00; padding:12px 11px; font-family:\'JetBrains Mono\', monospace; color:#f8fafc; position:relative;">' +
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
      return '<div style="' + baseStyle + ' background:#f5f4ef; color:#18181b; padding:9px 8px 10px 8px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #a1a1aa;">' +
        '<div style="background:#030303; color:#ffffff; padding:5px 6px 4px 6px; border-radius:5px; border:1.2px solid #27272a; flex:1; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;">' +
          '<div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.40rem; color:#a1a1aa; font-family:\'JetBrains Mono\', monospace; border-bottom:1px solid #27272a; padding-bottom:1px; margin-bottom:2px;">' +
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
      return '<div style="' + baseStyle + ' background:#f4f1ea; color:#1a1918; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #1a1918;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #1a1918; padding-bottom:2px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #fff0f5 0%, #f0f9ff 100%); color:#334155; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fbcfe8;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #f472b6; padding-bottom:2px;">' +
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
          '<div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #fbcfe8; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#be185d;">배낭 무게</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ec4899;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#be185d', '#fce7f3', '#fbcfe8', '#db2777') +
        '</div>' +
      '</div>';

    case 9: // 🧈 버터
      return '<div style="' + baseStyle + ' background:#fffdf5; color:#292524; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fed7aa;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f5eedc; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #f0fdf4 0%, #e6f4ea 100%); color:#14532d; padding:11px 10px; font-family:\'Playfair Display\', serif; border:1.5px solid #86efac;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px solid #bbf7d0; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:#ffffff; color:#1c1917; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fda4af;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ffe4e6; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #faf5ff 0%, #f3e8ff 100%); color:#581c87; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #d8b4fe;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px solid #e9d5ff; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%); color:#0c4a6e; padding:11px 10px; font-family:\'Space Grotesk\', sans-serif; border:1.5px solid #7dd3fc;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px solid #bae6fd; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:#faf7f2; color:#292524; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fed7aa;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #d6cfc4; padding-bottom:2px;">' +
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
          '<div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #e7e2d7; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#854d0e;">배낭 무게:</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ca8a04;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#c2410c', '#fff7ed', '#fed7aa', '#9a3412') +
        '</div>' +
      '</div>';

    case 15: // 🍑 살구노을
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); color:#431407; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #fdba74;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px solid #fed7aa; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:radial-gradient(circle at 80% 20%, #2e0825 0%, #0d020f 70%, #000000 100%); color:#ffffff; padding:11px 10px; font-family:\'Cinzel\', serif; border:1.5px solid rgba(244,114,182,0.6);">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(244,114,182,0.25); padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%); color:#064e3b; padding:11px 10px; font-family:\'Pretendard Variable\', sans-serif; border:1.5px solid #6ee7b7;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.2px solid #a7f3d0; padding-bottom:3px;">' +
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
      return '<div style="' + baseStyle + ' background:linear-gradient(180deg, #fefce8 0%, #fef9c3 100%); color:#713f12; padding:11px 10px; font-family:\'Gaegu\', cursive; border:1.5px solid #fde047;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #fde047; padding-bottom:2px;">' +
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
          '<div style="display:flex; justify-content:space-between; align-items:center; background:#ffffff; border-radius:5px; padding:2px 6px; border:1px solid #fef08a; margin-bottom:2px;">' +
            '<span style="font-size:0.70rem; font-weight:700; color:#854d0e;">배낭 무게:</span>' +
            '<span style="font-size:1.25rem; font-weight:700; color:#ca8a04;">' + weight + ' kg</span>' +
          '</div>' +
          makePledge('#ca8a04', '#fef9c3', '#fde047', '#854d0e') +
        '</div>' +
      '</div>';

    case 19: // ✨ 럭셔리
      return '<div style="' + baseStyle + ' background:#121214; color:#f4f4f5; padding:11px 10px; font-family:\'Noto Serif KR\', serif; border:1.5px solid #eab308;">' +
        '<div style="display:flex; flex-direction:column; gap:4px; flex:1;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #27272a; padding-bottom:3px;">' +
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

    case 20: // 🎋 젠 (Zen)
    default:
      return '<div style="' + baseStyle + ' background:#18181b; padding:11px 10px; border:1.5px solid #3f3f46; display:flex; flex-direction:row; gap:6px; font-family:\'Noto Serif KR\', serif; color:#ffffff;">' +
        '<div style="writing-mode:vertical-rl; font-size:0.46rem; color:#71717a; letter-spacing:1px; border-left:1px solid #27272a; padding-left:2px; flex-shrink:0;">' +
          'LNT 머문 자리는 처음처럼 — 흔적 없는 클린 백패킹' +
        '</div>' +
        '<div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between;">' +
          '<div>' +
            '<div style="display:flex; align-items:center; gap:3px; margin-bottom:2px;">' +
              logoWhite +
              '<span style="font-size:0.62rem; font-weight:900; color:#fff; font-family:\'Space Grotesk\', sans-serif;">ROMANTIC ROUTE</span>' +
            '</div>' +
            '<div style="font-size:0.78rem; font-weight:900; color:#e4e4e7; line-height:1.2; word-break:keep-all; min-height:1.2em;">' +
              spotText +
            '</div>' +
            '<div style="font-size:0.68rem; font-weight:900; color:#38bdf8; margin:1px 0;">' +
              escapeHtml(nick) +
            '</div>' +
            '<div style="height:1px; background:#27272a; margin:2px 0;"></div>' +
            '<div style="flex:1; overflow:hidden;">' +
              renderAdaptiveGearList(list, { nameColor: '#d4d4d8', wtColor: '#a1a1aa', subColor: '#71717a' }) +
            '</div>' +
          '</div>' +
          '<div style="margin-top:auto;">' +
            makePledge('#34d399', 'rgba(52,211,153,0.08)', 'rgba(52,211,153,0.3)', '#71717a') +
          '</div>' +
        '</div>' +
      '</div>';
  }
}
