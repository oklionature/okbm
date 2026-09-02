



(function() {
  if (!document.getElementById('basecamp-flip-core-style')) {
    var style = document.createElement('style');
    style.id = 'basecamp-flip-core-style';
    style.innerHTML = `
      .postcard-3d-wrapper {
        perspective: 1200px !important;
        transform-style: preserve-3d !important;
        will-change: transform !important;
        transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1) !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        transform: translateZ(0) !important;
      }
      .postcard-3d-wrapper.flipped {
        transform: rotateY(180deg) translateZ(0) !important;
      }
      .postcard-face-front, .postcard-face-back {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
        transform-style: preserve-3d !important;
        box-sizing: border-box !important;
        contain: layout paint;
      }
      .postcard-face-front {
        transform: rotateY(0deg) !important;
        z-index: 2 !important;
      }
      .postcard-face-back {
        transform: rotateY(180deg) !important;
        z-index: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 전역 상태 정의
  window.currentCardIndex = 0;
  window.activeBasecampTab = 'history'; // 'history' | 'plan' | 'notes'
  window.archiveFilter = 'all';
  window.currentViewMode = 'card';
  window.selectedRecordIds = new Set();
  window.activeSelectedDateKey = '';
  window.__memoryStore = window.__memoryStore || {};
  window.packedCheckSet = new Set(JSON.parse(localStorage.getItem('okbm_packed_checks') || '[]'));

  // 🎨 [100% 순수 SVG 컬러 벡터 라이브러리]
  window.VEC_ICONS = {
    stars: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; vertical-align:-1px; margin-right:2px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" style="width:15px; height:15px; vertical-align:-2px;" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    flag: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f43f5e; vertical-align:-2px;" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f59e0b; vertical-align:-2px;" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#38bdf8; vertical-align:-2px;" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    backpack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  // 💾 [스마트폰 내장 대용량 영구 저장소(IndexedDB) & 텍스트/사진 분리형 하이브리드 캐시 엔진]
  var DB_NAME = 'okbm_vault_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'packing_vault';

  function getIndexedDBInstance() {
    return new Promise(function(resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = function(e) {
        resolve(e.target.result);
      };
      request.onerror = function() {
        resolve(null);
      };
    });
  }

  window.saveToIndexedDB = async function(key, value) {
    try {
      var db = await getIndexedDBInstance();
      if (!db) return false;
      return new Promise(function(resolve) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.put({ key: key, data: value, updatedAt: Date.now() });
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { resolve(false); };
      });
    } catch (e) {
      return false;
    }
  };

  window.loadFromIndexedDB = async function(key) {
    try {
      var db = await getIndexedDBInstance();
      if (!db) return null;
      return new Promise(function(resolve) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.get(key);
        req.onsuccess = function() {
          resolve(req.result ? req.result.data : null);
        };
        req.onerror = function() { resolve(null); };
      });
    } catch (e) {
      return null;
    }
  };

  // 🔄 [앱 구동 즉시 IndexedDB 사진 맵 및 히스토리 메모리로 사전 복원 (사진 유실 원천 차단)]
  (async function preloadIndexedDbToMemory() {
    try {
      var idbPhotosMap = await window.loadFromIndexedDB('okbm_phone_photos_map');
      if (idbPhotosMap && typeof idbPhotosMap === 'object') {
        window.__memoryStore['okbm_phone_photos_map'] = idbPhotosMap;
      }

      var idbHistory = await window.loadFromIndexedDB('okbm_packing_history');
      if (idbHistory && Array.isArray(idbHistory) && idbHistory.length > 0) {
        window.__memoryStore['okbm_packing_history'] = idbHistory;
        window.interactiveHistory = idbHistory.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
        window.packingHistoryList = window.interactiveHistory;
      } else {
        var rawLocal = localStorage.getItem('okbm_packing_history');
        if (rawLocal) {
          var parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            window.__memoryStore['okbm_packing_history'] = parsed;
            window.interactiveHistory = parsed.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
            window.packingHistoryList = window.interactiveHistory;
            await window.saveToIndexedDB('okbm_packing_history', parsed);
          }
        }
      }
    } catch (e) {}
  })();

  window.safeGetStorage = function(key, defaultVal) {
    if (window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
      return window.__memoryStore[key];
    }
    try {
      var item = localStorage.getItem(key);
      if (item !== null) {
        var parsed = JSON.parse(item);
        window.__memoryStore[key] = parsed;
        return parsed;
      }
    } catch (e) {}
    return defaultVal;
  };

  window.safeSetStorage = function(key, value) {
    var rawObj = (typeof value === 'string' ? JSON.parse(value) : value);
    window.__memoryStore[key] = rawObj;
    window.saveToIndexedDB(key, rawObj);

    try {
      var cleanObj = rawObj;
      if (key === 'okbm_packing_history' && Array.isArray(rawObj)) {
        cleanObj = rawObj.map(function(item) {
          var clone = Object.assign({}, item);
          delete clone.photos;
          delete clone.photo;
          delete clone.fieldPhoto;
          return clone;
        });
      }
      localStorage.setItem(key, JSON.stringify(cleanObj));
    } catch (e) {}
  };

  window.fieldDiaries = window.safeGetStorage('okbm_field_diaries', {});

  window.NATURAL_BORDER_PALETTES = [
    'linear-gradient(135deg, #10b981, #047857)',
    'linear-gradient(135deg, #059669, #064e3b)',
    'linear-gradient(135deg, #0284c7, #1e3a8a)',
    'linear-gradient(135deg, #6366f1, #312e81)',
    'linear-gradient(135deg, #64748b, #334155)',
    'linear-gradient(135deg, #78716c, #44403c)',
    'linear-gradient(135deg, #b45309, #78350f)',
    'linear-gradient(135deg, #d97706, #92400e)',
    'linear-gradient(135deg, #8b5cf6, #4c1d95)',
    'linear-gradient(135deg, #be123c, #4c0519)'
  ];

  window.getCardStableBorderGradient = function(record, idx) {
    if (!record) return window.NATURAL_BORDER_PALETTES[0];
    var str = String(record.id || record.spot || idx || '0');
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    var paletteIdx = Math.abs(hash) % window.NATURAL_BORDER_PALETTES.length;
    return window.NATURAL_BORDER_PALETTES[paletteIdx];
  };

  // 🌌 [0.5mm 정밀 사각 테두리 엣지 글로우 FX - 8대 네온 컬러 랜덤 발광]
  if (!document.getElementById('basecamp-soft-ambient-fx-style')) {
    var fxStyle = document.createElement('style');
    fxStyle.id = 'basecamp-soft-ambient-fx-style';
    fxStyle.innerHTML = `
      @keyframes card_edge_sharp_pulse {
        0% {
          opacity: 0;
          box-shadow: 0 0 0px var(--edge-color), inset 0 0 0px var(--edge-color);
        }
        35% {
          opacity: 1;
          box-shadow: 0 0 6px 1px var(--edge-color), inset 0 0 3px var(--edge-color);
        }
        100% {
          opacity: 0;
          box-shadow: 0 0 10px 2px var(--edge-color), inset 0 0 5px var(--edge-color);
        }
      }
      .card-05mm-edge-layer {
        position: absolute !important;
        inset: -1px !important;
        width: calc(100% + 2px) !important;
        height: calc(100% + 2px) !important;
        border-radius: 16px !important;
        border: 1.5px solid var(--edge-color) !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        box-sizing: border-box !important;
        opacity: 0;
      }
    `;
    document.head.appendChild(fxStyle);
  }

  window.EDGE_05MM_COLORS = [
    '#38bdf8', '#34d399', '#fbbf24', '#f43f5e',
    '#c084fc', '#fb923c', '#a3e635', '#ffffff'
  ];

  window.triggerSoftAmbientFX = function(cardEl) {
    if (!cardEl) cardEl = document.getElementById('swipePostcardTarget');
    if (!cardEl) return;

    var layer = cardEl.querySelector('.card-05mm-edge-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'card-05mm-edge-layer';
      cardEl.appendChild(layer);
    }

    var randomColor = window.EDGE_05MM_COLORS[Math.floor(Math.random() * window.EDGE_05MM_COLORS.length)];
    layer.style.setProperty('--edge-color', randomColor);
    layer.style.animation = 'none';
    layer.offsetHeight;
    layer.style.animation = 'card_edge_sharp_pulse 0.65s cubic-bezier(0.2, 0.8, 0.25, 1) forwards';
  };

  // 🔄 [히스토리 레코드 정규화 - 사진 원본 100% 보존 및 더미 덮어쓰기 차단]
  window.normalizeHistoryRecord = function(r, idx) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    if (r && r.date) {
      var parts = String(r.date).match(/\d+/g);
      if (parts && parts.length >= 3) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
    } else if (r && r.year && r.month && r.day) {
      y = r.year; m = r.month; d = r.day;
    }

    var recordId = (r && r.id) ? String(r.id) : ('pack_' + (r && r.date ? r.date.replace(/\D/g,'') : Date.now()) + '_' + idx);
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    var localPhotos = savedPhotosMap[recordId];

    var rawPhotos = (Array.isArray(localPhotos) && localPhotos.length > 0)
      ? localPhotos
      : ((Array.isArray(r.photos) && r.photos.length > 0)
          ? r.photos
          : (r.fieldPhoto || r.photo ? [r.fieldPhoto || r.photo] : []));

    var rawList = Array.isArray(r.items) ? r.items : (Array.isArray(r.gears) ? r.gears : []);
    var cleanItems = rawList.map(function(it) {
      if (typeof it === 'string') {
        var match = it.match(/^(.*?)\s*\((\d+)g\)$/);
        return match ? { name: match[1], weight: parseInt(match[2], 10), categoryId: '' } : { name: it, weight: 0, categoryId: '' };
      }
      return {
        id: it.id || ('item_' + Math.random()),
        name: it.name || it.itemName || '장비',
        weight: Number(it.weight || it.weight_g || 0),
        categoryId: it.categoryId || it.category_id || ''
      };
    });

    var totalGrams = cleanItems.reduce(function(sum, it){ return sum + it.weight; }, 0);
    var firstGearName = cleanItems[0] ? cleanItems[0].name : '';
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);

    var rawMemo = (r && r.memo !== undefined && r.memo !== null) ? String(r.memo) : '';
    if (
      rawMemo.includes('비화식으로') || 
      rawMemo.includes('칼각 피칭') || 
      rawMemo.includes('도착! 더블월') || 
      rawMemo.includes('에서 보낸 조용한 하룻밤') || 
      rawMemo.includes('자리를 털고 일어나는 순간까지') ||
      rawMemo.includes('오차 없이 세팅하고') ||
      rawMemo.includes('LNT 하산 완료') ||
      (rawMemo.includes('배낭') && rawMemo.includes('kg'))
    ) {
      rawMemo = '';
    }

    var norm = {
      id: recordId,
      templateId: (r && r.templateId !== undefined && r.templateId !== null) ? parseInt(r.templateId, 10) : (window.selectedTemplateId || savedTmplId || 1),
      date: (r && r.date) || (y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0')),
      year: y,
      month: m,
      day: d,
      spot: (r && (r.spot || r.spotName)) ? (r.spot || r.spotName) : (firstGearName ? (firstGearName + ' 패킹') : '선자령 백패킹'),
      elevation: (r && r.elevation) ? r.elevation : '832m',
      weightKg: (r && r.weightKg !== undefined && r.weightKg !== '0.00') ? r.weightKg : (totalGrams > 0 ? (totalGrams / 1000).toFixed(2) : '0.00'),
      weightGrams: (r && r.weightGrams) ? r.weightGrams : totalGrams,
      itemCount: cleanItems.length,
      weather: (r && r.weather) ? r.weather : 'stars',
      weatherText: (r && r.weatherText) ? r.weatherText : '은하수·별밤',
      terrain: (r && r.terrain) ? r.terrain : 'peak',
      terrainText: (r && r.terrainText) ? r.terrainText : '능선·정상',
      meal: (r && r.meal) ? r.meal : 'hotmeal',
      mealText: (r && r.mealText) ? r.mealText : '발열식',
      companion: (r && r.companion) ? r.companion : 'solo',
      companionText: (r && r.companionText) ? r.companionText : '솔캠',
      wind: (r && r.wind) ? r.wind : 'windGale',
      windText: (r && r.windText) ? r.windText : '돌풍',
      hardText: (r && r.hardText) ? r.hardText : '',
      goodText: (r && r.goodText) ? r.goodText : '',
      memoryText: (r && r.memoryText) ? r.memoryText : '',
      memo: rawMemo,
      oneLineMemo: (r && r.oneLineMemo && !r.oneLineMemo.includes('비화식')) ? r.oneLineMemo : '',
      items: cleanItems,
      photos: rawPhotos,
      photo: rawPhotos[0] || '',
      fieldPhoto: rawPhotos[0] || ''
    };

    return norm;
  };

  // 🎒 [패킹 저장 및 공유 카드 호출]
  window.saveCurrentPackingRecord = function() {
    var packedItems = [];
    var totalGrams = 0;
    if (typeof CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      CATEGORIES.forEach(function(cat) {
        var list = window.selectedGearMap[cat.id] || [];
        list.forEach(function(it) {
          if (it && (it.name || it.itemName)) {
            var gName = it.name || it.itemName;
            var gWeight = Number(it.weight || it.weight_g || 0);
            packedItems.push({
              id: it.id || ('item_' + Date.now() + '_' + Math.random()),
              name: gName,
              weight: gWeight,
              categoryId: cat.id
            });
            totalGrams += gWeight;
          }
        });
      });
    }

    if (packedItems.length === 0) {
      if (typeof showToast === 'function') showToast('장비를 1개 이상 추가해주세요.', 'warn');
      return;
    }

    var now = new Date();
    var targetDateStr = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var parts = targetDateStr.match(/\d+/g) || [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    var tYear = parseInt(parts[0], 10);
    var tMonth = parseInt(parts[1], 10);
    var tDay = parseInt(parts[2], 10);
    var cleanDateStr = tYear + '.' + String(tMonth).padStart(2, '0') + '.' + String(tDay).padStart(2, '0');
    var totalKg = (totalGrams / 1000).toFixed(2);
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var recordId = 'pack_' + Date.now();
    var spotTitle = (window.currentLuckySpot && window.currentLuckySpot.name) ? window.currentLuckySpot.name : '대관령 선자령';
    var spotElev = (window.currentLuckySpot && window.currentLuckySpot.elevation) ? `${window.currentLuckySpot.elevation}m` : '832m';

    var newRecord = {
      id: recordId,
      templateId: window.selectedTemplateId || savedTmplId || 1,
      date: cleanDateStr,
      year: tYear,
      month: tMonth,
      day: tDay,
      spot: spotTitle,
      elevation: spotElev,
      weightKg: totalKg,
      weightGrams: totalGrams,
      itemCount: packedItems.length,
      weather: 'stars', weatherText: '은하수·별밤',
      terrain: 'peak', terrainText: '능선·정상',
      meal: 'hotmeal', mealText: '발열식',
      companion: 'solo', companionText: '솔캠',
      wind: 'windGale', windText: '돌풍',
      hardText: '',
      goodText: '',
      memoryText: '',
      memo: '',
      oneLineMemo: `${spotTitle} 백패킹`,
      items: packedItems,
      photos: [],
      photo: '',
      fieldPhoto: ''
    };

    window.currentShareRecord = newRecord;
    window.currentShareItems = packedItems;

    if (!window.interactiveHistory) window.interactiveHistory = [];
    window.interactiveHistory.unshift(newRecord);
    window.packingHistoryList = window.interactiveHistory;

    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    if (typeof closePackingModal === 'function') closePackingModal();
    if (typeof openPackShareModal === 'function') openPackShareModal(newRecord, packedItems, false);
    
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 [' + cleanDateStr + '] 배낭 패킹이 저장되었습니다!', 'success');
  };

  // 💾 [공유 모달에서 보관함으로 저장]
  window.saveCardToVaultAndOpenBasecamp = function() {
    var spotInput = document.getElementById('shareCardSpotInput');
    var memoInput = document.getElementById('shareCardMemoInput');
    var liveSpot = (spotInput && spotInput.value.trim()) ? spotInput.value.trim() : (window.currentShareRecord ? window.currentShareRecord.spot : '대관령 선자령');
    var liveMemo = (memoInput && memoInput.value.trim()) ? memoInput.value.trim() : '';

    var now = new Date();
    var targetDateStr = window.activeSelectedDateKey || (window.currentShareRecord ? window.currentShareRecord.date : (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0')));
    var parts = targetDateStr.match(/\d+/g) || [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    var tYear = parseInt(parts[0], 10);
    var tMonth = parseInt(parts[1], 10);
    var tDay = parseInt(parts[2], 10);
    var cleanDateStr = tYear + '.' + String(tMonth).padStart(2, '0') + '.' + String(tDay).padStart(2, '0');
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var recordId = window.currentShareRecord ? window.currentShareRecord.id : ('pack_' + Date.now());

    if (!window.currentShareRecord) {
      var totalGrams = 0;
      var liveItems = [];
      if (typeof CATEGORIES !== 'undefined') {
        CATEGORIES.forEach(function(cat) {
          (window.selectedGearMap[cat.id] || []).forEach(function(it) {
            liveItems.push({ id: it.id || ('item_' + Date.now()), name: it.name || it.itemName || '장비', weight: Number(it.weight || it.weight_g || 0), categoryId: cat.id });
            totalGrams += Number(it.weight || it.weight_g || 0);
          });
        });
      }
      window.currentShareRecord = {
        id: recordId,
        templateId: window.selectedTemplateId || savedTmplId || 1,
        date: cleanDateStr,
        year: tYear, month: tMonth, day: tDay,
        spot: liveSpot, elevation: '832m', weightKg: (totalGrams / 1000).toFixed(2), weightGrams: totalGrams,
        itemCount: liveItems.length, memo: liveMemo, oneLineMemo: `${liveSpot} 백패킹`, weather: 'stars', weatherText: '은하수·별밤', terrain: 'peak', terrainText: '능선·정상', meal: 'hotmeal', mealText: '발열식', companion: 'solo', companionText: '솔캠', wind: 'windGale', windText: '돌풍',
        items: liveItems, photos: [window.currentSharePhoto || ''], photo: window.currentSharePhoto || '', fieldPhoto: window.currentSharePhoto || ''
      };
    } else {
      window.currentShareRecord.date = cleanDateStr;
      window.currentShareRecord.year = tYear;
      window.currentShareRecord.month = tMonth;
      window.currentShareRecord.day = tDay;
      window.currentShareRecord.spot = liveSpot;
      window.currentShareRecord.memo = liveMemo;
      window.currentShareRecord.oneLineMemo = `${liveSpot} 백패킹`;
      window.currentShareRecord.templateId = window.selectedTemplateId || window.currentShareRecord.templateId || savedTmplId || 1;
      if (window.currentSharePhoto) {
        window.currentShareRecord.photos = [window.currentSharePhoto];
        window.currentShareRecord.photo = window.currentSharePhoto;
        window.currentShareRecord.fieldPhoto = window.currentSharePhoto;
      }
    }

    if (!window.interactiveHistory) window.interactiveHistory = [];
    var existingIdx = window.interactiveHistory.findIndex(function(r) { return String(r.id) === String(recordId); });
    if (existingIdx !== -1) window.interactiveHistory[existingIdx] = window.currentShareRecord;
    else window.interactiveHistory.unshift(window.currentShareRecord);

    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    if (typeof closePackShareModal === 'function') closePackShareModal();
    window.activeSelectedDateKey = cleanDateStr;
    window.openMyInfoModal('history');
    if (typeof showToast === 'function') showToast('✅ [' + cleanDateStr + '] 보관함에 안전하게 저장되었습니다!', 'success');
    triggerHaptic(15);
  };

  // 📸 [피드 이미지 다운로드 캡처]
  window.captureAndSaveSingleTripCard = function(targetElementId, filenamePrefix) {
    var target = document.getElementById(targetElementId);
    if (!target || typeof html2canvas === 'undefined') {
      showToast('이미지 저장 엔진을 초기화 중입니다.', 'warn');
      return;
    }
    triggerHaptic(15);
    showToast('📸 고화질 피드 이미지를 생성하고 있습니다...', 'info');

    html2canvas(target, {
      backgroundColor: '#000000',
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0
    }).then(function(canvas) {
      try {
        var link = document.createElement('a');
        var now = new Date();
        var pad = function(n) { return String(n).padStart(2, '0'); };
        var ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        link.download = `${filenamePrefix || '낭만루트_피드'}_${ts}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('💾 고화질 사진이 갤러리에 저장되었습니다!', 'download');
      } catch (err) {
        window.open(canvas.toDataURL('image/png'), '_blank');
        showToast('이미지를 길게 눌러 저장하세요.', 'info');
      }
    }).catch(function() {
      showToast('이미지 저장에 실패했습니다. 다시 시도해주세요.', 'warn');
    });
  };

  // 🏷️ [멀티 뱃지 렌더링 헬퍼]
  window.renderMultiBadgeHtml = function(textList, iconKey, borderColor, bgColor, textColor) {
    if (!textList) return '';
    var arr = Array.isArray(textList) ? textList : String(textList).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    return arr.map(function(txt) {
      var icon = (window.VEC_ICONS && window.VEC_ICONS[iconKey]) ? window.VEC_ICONS[iconKey] : '';
      return '<span style="font-size:0.60rem; background:' + (bgColor || 'rgba(255,255,255,0.08)') + '; backdrop-filter:blur(6px); border:1px solid ' + (borderColor || 'rgba(255,255,255,0.2)') + '; color:' + (textColor || '#fff') + '; padding:2.5px 6px; border-radius:5px; font-weight:800; display:inline-flex; align-items:center; gap:2px;">' +
        icon + ' ' + (typeof escapeHtml === 'function' ? escapeHtml(txt) : txt) +
      '</span>';
    }).join(' ');
  };

  window.isPostcardFlipped = window.isPostcardFlipped || false;

  // [정밀 한글 종성/조사 연산기]
  function cleanKoreanTerm(term) {
    if (!term) return '';
    return String(term).trim().replace(/[.,~!?^"'\(\)\[\]{}#]/g, '').trim();
  }

  function getJosa(word, josaType) {
    if (!word) return '';
    var clean = cleanKoreanTerm(word);
    if (!clean) return word;
    var lastChar = clean.charCodeAt(clean.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) {
      if (josaType === '이/가') return word + '이';
      if (josaType === '을/를') return word + '를';
      if (josaType === '은/는') return word + '은';
      if (josaType === '과/와') return word + '와';
      if (josaType === '으로/로') return word + '로';
      if (josaType === '에서') return word + '에서';
      if (josaType === '에') return word + '에';
      return word;
    }
    var jong = (lastChar - 0xAC00) % 28;
    var hasJong = (jong > 0);

    if (josaType === '이/가') return word + (hasJong ? '이' : '가');
    if (josaType === '을/를') return word + (hasJong ? '을' : '를');
    if (josaType === '은/는') return word + (hasJong ? '은' : '는');
    if (josaType === '과/와') return word + (hasJong ? '과' : '와');
    if (josaType === '으로/로') {
      return word + ((hasJong && jong !== 8) ? '으로' : '로');
    }
    if (josaType === '에서') return word + '에서';
    if (josaType === '에') return word + '에';
    return word;
  }

 // 🗂️ [3D 엽서 카드 렌더링 - 핸드폰 저장 사진 100% 즉시 복원 연결]
  window.render3DPostcardElement = function(cur, index) {
    if (!cur) return '';
    var items = Array.isArray(cur.items) ? cur.items : [];
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = cur.templateId || window.selectedTemplateId || savedTmplId || 1;
    var borderGrad = window.getCardStableBorderGradient(cur, index);
    var shortCardMemo = cur.oneLineMemo || (cur.spot ? (cur.spot + ' 백패킹') : '자연 속 힐링 백패킹');

    var isCompleted = Boolean(cur.memo && cur.memo.trim().length > 0);
    var statusBadgeHtml = isCompleted
      ? '<span style="font-size:0.52rem; background:rgba(52,211,153,0.18); border:1px solid #34d399; color:#6ee7b7; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">✍️ 작성완료</span>'
      : '<span style="font-size:0.52rem; background:rgba(251,146,60,0.18); border:1px solid #fb923c; color:#fdba74; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">⏳ 일지 미작성</span>';

    // 📷 [핸드폰 로컬에 저장된 사진 전방위 전수 탐색]
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    var mapPhotos = (cur.id && savedPhotosMap[cur.id]) ? savedPhotosMap[cur.id] : (cur.date && savedPhotosMap[cur.date] ? savedPhotosMap[cur.date] : null);
    var firstMapPhoto = (Array.isArray(mapPhotos) && mapPhotos.length > 0) ? mapPhotos[0] : (typeof mapPhotos === 'string' ? mapPhotos : '');

    var rawPhoto = firstMapPhoto ||
      (Array.isArray(cur.photos) && cur.photos.length > 0 ? cur.photos[0] : '') ||
      cur.fieldPhoto ||
      cur.photo ||
      '';

    var hasValidPhoto = Boolean(rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 10);

    var frontContentHtml = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (genFn) {
      frontContentHtml = genFn(tmplId, cur, items, cur.spot, shortCardMemo, rawPhoto);
    } else {
      frontContentHtml = `
        <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">
              <span style="font-family:'Space Grotesk', sans-serif; font-size:0.72rem; font-weight:900;">ROMANTIC PACK</span>
              <div style="display:flex; align-items:center; gap:4px;">
                ${statusBadgeHtml}
                <span style="font-size:0.5rem; background:#0284c7; color:#fff; font-weight:900; padding:1.5px 4px; border-radius:3px;">#0${index+1}</span>
              </div>
            </div>
            <div style="margin-top:5px; font-size:0.88rem; font-weight:900; display:flex; align-items:center; gap:3px;">
              ${window.VEC_ICONS.pin} <span>${escapeHtml(cur.spot)} (${escapeHtml(cur.elevation)})</span>
            </div>
            <div style="font-size:0.56rem; color:#64748b; font-family:'JetBrains Mono', monospace; margin-top:2px;">${cur.date} · 배낭 ${items.length}개 장비</div>
            <div style="margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:4px; font-size:0.58rem; display:flex; flex-direction:column; gap:2px; max-height:125px; overflow:hidden;">
              ${items.slice(0, 6).map(it => `
                <div style="display:flex; justify-content:space-between;"><span>• ${escapeHtml(it.name)}</span><span>${(it.weight/1000).toFixed(2)}kg</span></div>
              `).join('')}
            </div>
          </div>
          <div>
            <div style="border-top:1.5px dashed #000; padding-top:3px; display:flex; justify-content:space-between; align-items:baseline;">
              <span style="font-size:0.6rem; font-weight:900; color:#64748b;">TOTAL WEIGHT</span>
              <span style="font-size:1.25rem; font-weight:900; color:#000; font-family:'Space Grotesk', sans-serif;">${cur.weightKg} KG</span>
            </div>
            <div style="font-size:0.50rem; color:#0284c7; text-align:center; font-weight:900; background:#e0f2fe; border-radius:4px; padding:2.5px; margin-top:4px;">
              🔄 톡 터치 시 사진 엽서로 회전
            </div>
          </div>
        </div>
      `;
    }

    var isFlipped = !!window.isPostcardFlipped;

    var backPhotoLayerHtml = hasValidPhoto
      ? `<img src="${rawPhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.92);" />
         <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.65) 100%);"></div>`
      : `<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; box-sizing:border-box; text-align:center;">
          <div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px dashed rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div style="font-size:0.80rem; font-weight:900; color:#e2e8f0;">등록된 사진이 없습니다.</div>
          <div style="font-size:0.60rem; color:#94a3b8; line-height:1.4;">하단의 [다녀온 기록 작성]에서<br>현장 사진을 추가해보세요!</div>
        </div>`;

    return `
      <div id="swipePostcardTarget" class="postcard-3d-wrapper ${isFlipped ? 'flipped' : ''}" style="width:100%; max-width:280px; aspect-ratio:3/4; position:relative; cursor:pointer; touch-action:pan-y; padding:2px; border-radius:15px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.85); box-sizing:border-box;">
        <div class="postcard-face-front" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; overflow:hidden; border-radius:13px; background:#0b0f19;">
          ${frontContentHtml}
        </div>
        <div class="postcard-face-back" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; background:#000; border-radius:13px; overflow:hidden; position:relative;">
          ${backPhotoLayerHtml}
          <div style="position:relative; z-index:2; width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:12px 14px; box-sizing:border-box;">
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:4px; font-size:0.95rem; font-weight:900; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
                  ${window.VEC_ICONS.pin} <span>${escapeHtml(cur.spot)}</span>
                </div>
                ${statusBadgeHtml}
              </div>
              <div style="font-size:0.62rem; color:#e2e8f0; font-family:'JetBrains Mono', monospace; font-weight:700; text-shadow:0 1px 3px rgba(0,0,0,0.95); margin-left:14px;">
                ${escapeHtml(cur.elevation)} · ${cur.date}
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.52rem; font-weight:900; color:#fff; font-family:'Space Grotesk', sans-serif; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.25); padding:2px 6px; border-radius:4px;">
                BPL ${cur.weightKg}kg
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // 📱 지난 피드 목록 모달 (표준 GNB 탑재 & 상단 안내문구 완전 삭제 & 하단 5:5 듀얼 바)
 // 📱 지난 피드 목록 모달 (상단 GNB 완전 삭제 & 최하단 듀얼 바 고정)
  window.openPastTripsListModal = function() {
    var old = document.getElementById('pastTripsListModal');
    if (old) old.remove();

    var rawLogs = window.safeGetStorage('okbm_packing_history', []);
    if (Array.isArray(rawLogs) && rawLogs.length > 0) {
      window.interactiveHistory = rawLogs.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    }
    var logs = window.interactiveHistory || [];

    var modalEl = document.createElement('div');
    modalEl.id = 'pastTripsListModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000000; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;';

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <span style="font-size:0.95rem; font-weight:900; color:#fff;">📱 지난 백패킹 피드 목록</span>
        <span style="font-size:0.65rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3);">총 ${logs.length}개</span>
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px 20px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${logs.length === 0 ? `
          <div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem;">
            기록된 백패킹이 없습니다.<br>배낭을 패킹하고 보관함에 저장해보세요!
          </div>
        ` : logs.map(function(r, idx) {
          var tId = r.templateId || 1;
          var tName = (typeof TEMPLATE_NAMES !== 'undefined' && TEMPLATE_NAMES[tId]) ? TEMPLATE_NAMES[tId] : ('테마 ' + tId);
          var thumbPhoto = (r.photos && r.photos[0]) || r.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
          var safeId = escapeHtml(String(r.id));
          return `
            <div onclick="window.openSingleTripDualFeedModal('${safeId}')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <div style="width:44px; height:44px; border-radius:8px; overflow:hidden; background:#1e293b; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">
                  <img src="${thumbPhoto}" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <div style="min-width:0;">
                  <div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${window.VEC_ICONS.pin} <span>${escapeHtml(r.spot)}</span>
                    <span style="font-size:0.55rem; color:#fde047; font-weight:800; background:rgba(253,224,71,0.15); border:1px solid rgba(253,224,71,0.3); padding:1px 5px; border-radius:4px; flex-shrink:0;">${escapeHtml(tName)}</span>
                  </div>
                  <div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">${r.date} · ${r.elevation}</div>
                </div>
              </div>
              <div style="text-align:right; flex-shrink:0; margin-left:8px;">
                <span style="font-size:0.86rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${r.weightKg}kg</span>
                <span style="font-size:0.60rem; color:#38bdf8; font-weight:800; display:block; margin-top:2px;">피드 보기 ➔</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="flex-shrink:0 !important; display:flex; gap:8px; padding:10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:1000001 !important;">
        <button onclick="window.openRandomFeedTrip();" style="flex:1; height:44px; background:linear-gradient(135deg, rgba(56,189,248,0.15), rgba(2,132,199,0.25)); border:1px solid #38bdf8; color:#38bdf8; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
          <span>🎲 랜덤 추억 보기</span>
        </button>
        <button onclick="document.getElementById('pastTripsListModal').remove(); triggerHaptic(10);" style="flex:1; height:44px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#f1f5f9; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
          <span>◀ 뒤로</span>
        </button>
      </div>
    `;
    document.body.appendChild(modalEl);
    triggerHaptic(12);
  };

  window.openRandomFeedTrip = function() {
    var logs = window.interactiveHistory || [];
    if (logs.length === 0) {
      if (typeof showToast === 'function') showToast('저장된 백패킹 기록이 없습니다.', 'warn');
      return;
    }
    var randomIdx = Math.floor(Math.random() * logs.length);
    var picked = logs[randomIdx];
    if (picked) {
      var modal = document.getElementById('pastTripsListModal');
      if (modal) modal.remove();
      window.openSingleTripDualFeedModal(String(picked.id));
      triggerHaptic(15);
      if (typeof showToast === 'function') showToast('🎲 [' + picked.spot + '] 추억 피드를 불러왔습니다!', 'info');
    }
  };

  // 📝 [낭만 일지 작성 모달]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;
    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;

    window.__richState = {
      selectedTone: 'insta',
      selectedMbti: 'INFP',
      hardText: record.hardText || '',
      goodText: record.goodText || '',
      memoryText: record.memoryText || ''
    };

    var rawMemo = (record.memo || '').trim();
    if (rawMemo.includes('비화식으로') || rawMemo.includes('칼각 피칭') || rawMemo.includes('도착! 더블월') || rawMemo.includes('에서 보낸 조용한 하룻밤') || rawMemo.includes('자리를 털고 일어나는 순간까지')) {
      rawMemo = '';
    }

    var currentPhotos = (Array.isArray(record.photos) && record.photos.length > 0)
      ? record.photos.slice(0, 10)
      : (record.fieldPhoto || record.photo ? [record.fieldPhoto || record.photo] : []);

    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    window.__tempPhotoCaptions = Array.isArray(record.photoCaptions)
      ? record.photoCaptions.slice(0, 10)
      : new Array(window.__tempUploadedPhotos.length).fill('');

    var mainStyles = [
      { id: 'insta', name: '🔥 인스타 피드' },
      { id: 'diary', name: '☕ 담백한 일기' },
      { id: 'cozy', name: '🌷 감성 몽글' },
      { id: 'essay', name: '🖋️ 산악 수필' },
      { id: 'senior', name: '🌿 베테랑 산꾼' },
      { id: 'docu', name: '🎙️ 다큐 내레이션' },
      { id: 'bpl', name: '🎒 BPL 미니멀로그' }
    ];

    var mbtiList = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:1000005; display:flex; justify-content:center; align-items:center; padding:14px; box-sizing:border-box;';

    formModal.innerHTML = `
      <div style="width:100%; max-width:440px; max-height:92vh; background:#080b11; border:1.5px solid #38bdf8; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 24px 60px rgba(0,0,0,0.95); box-sizing:border-box; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:8px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" fill="none" style="width:22px; height:22px; flex-shrink:0;">
              <defs>
                <linearGradient id="sunsetSkyGradModal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f43f5e"/>
                  <stop offset="50%" stop-color="#f97316"/>
                  <stop offset="100%" stop-color="#f59e0b"/>
                </linearGradient>
              </defs>
              <circle cx="12" cy="9" r="4" fill="url(#sunsetSkyGradModal)"/>
              <path d="M12 2v2M4.93 4.93l1.41 1.41M19.07 4.93l-1.41 1.41M2 19h20" stroke="url(#sunsetSkyGradModal)" stroke-width="2" stroke-linecap="round"/>
              <path d="M3 19l4.5-5.5 3.5 4 4.5-6.5 5.5 8" stroke="#fdba74" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span style="font-size:1.18rem; font-weight:900; color:#fff; letter-spacing:-0.02em; text-shadow:0 2px 10px rgba(249,115,22,0.3);">낭만 일지</span>
          </div>
          <button onclick="document.getElementById('modalRichAfterTrip').remove()" style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer; padding:2px 6px;">✕</button>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
              <label style="font-size:0.70rem; color:#38bdf8; font-weight:900;">현장 사진 관리</label>
              <span id="photoCountNotice" style="font-size:0.62rem; color:#86efac; font-weight:800;">(${window.__tempUploadedPhotos.length} / 10장)</span>
            </div>
            <button type="button" onclick="window.__clearAllRichPhotos()" style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#fda4af; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:4px; cursor:pointer;">
              전체 해제
            </button>
          </div>

          <div id="richPhotoThumbnailsGrid" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none;">
            ${window.__tempUploadedPhotos.map(function(url, pIdx) {
              return `
                <div style="position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid rgba(56,189,248,0.4); flex-shrink:0;">
                  <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
                  <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx})" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:none; font-size:10px; line-height:1; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
                </div>
              `;
            }).join('')}
          </div>

          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event)" />
          <button type="button" id="btnUploadMultiPhotoNotice" onclick="document.getElementById('richMultiPhotoInput').click()" style="width:100%; height:34px; background:rgba(56,189,248,0.08); border:1px dashed #38bdf8; color:#7dd3fc; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:2px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>사진 추가하기 (최대 10장)</span>
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <label style="font-size:0.70rem; color:#fb923c; font-weight:900;">1. 힘들었던 점 (선택)</label>
            </div>
            <input type="text" id="richInputHard" value="${escapeHtml(window.__richState.hardText)}" placeholder="예: 정상 전 숨이 턱 막히던 오르막, 능선에서 때려 박히던 똥바람..." oninput="window.__handleRichDirectInputChange('hardText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(251,146,60,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>

          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <label style="font-size:0.70rem; color:#34d399; font-weight:900;">2. 좋았던 점 (선택)</label>
            </div>
            <input type="text" id="richInputGood" value="${escapeHtml(window.__richState.goodText)}" placeholder="예: 텐트 지퍼 열었을 때 터진 운해, 침낭 속 들어간 순간의 안도감..." oninput="window.__handleRichDirectInputChange('goodText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(52,211,153,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>

          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <label style="font-size:0.70rem; color:#fde047; font-weight:900;">3. 기억에 남는 것 (선택)</label>
            </div>
            <input type="text" id="richInputMemory" value="${escapeHtml(window.__richState.memoryText)}" placeholder="예: 붉게 타오르다 순식간에 저문 노을, 새벽녘 쏟아진 별빛..." oninput="window.__handleRichDirectInputChange('memoryText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(253,224,71,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>
        </div>

        <div style="margin-top:2px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.15);">
          <div style="display:flex; align-items:center; gap:4px; margin-bottom:5px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            <label style="font-size:0.70rem; color:#f43f5e; font-weight:900;">작성 스타일 선택</label>
          </div>
          <div style="display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none;">
            ${mainStyles.map(function(t) {
              var isSelected = (window.__richState.selectedTone === t.id);
              return `
                <button type="button" class="tone-style-btn" onclick="window.__selectToneStyle('${t.id}', this)" style="flex-shrink:0; background:${isSelected ? '#f43f5e' : 'rgba(255,255,255,0.06)'}; color:${isSelected ? '#fff' : '#cbd5e1'}; border:${isSelected ? '1px solid #fda4af' : '1px solid rgba(255,255,255,0.12)'}; padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:${isSelected ? '900' : '800'}; cursor:pointer;">
                  ${t.name}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="display:flex; align-items:center; gap:4px; margin-bottom:5px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/></svg>
            <label style="font-size:0.70rem; color:#38bdf8; font-weight:900;">내 MBTI 선택 (사고방식 & 시선 반영)</label>
          </div>
          <div style="display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none;">
            ${mbtiList.map(function(m) {
              var isSelected = (window.__richState.selectedMbti === m);
              return `
                <button type="button" class="mbti-chip-btn" onclick="window.__selectMbtiType('${m}', this)" style="flex-shrink:0; background:${isSelected ? '#0284c7' : 'rgba(255,255,255,0.06)'}; color:${isSelected ? '#fff' : '#cbd5e1'}; border:${isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)'}; padding:4px 8px; border-radius:6px; font-size:0.62rem; font-weight:${isSelected ? '900' : '800'}; cursor:pointer;">
                  ${m}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <label style="font-size:0.72rem; color:#34d399; font-weight:900;">낭만 본문</label>
            </div>
            <button type="button" id="btnTriggerAiStory" onclick="window.__refreshAutoStoryMemo(true)" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; padding:4px 11px; border-radius:6px; font-size:0.66rem; font-weight:900; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4); display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>낭만작가 글 작성하기</span>
            </button>
          </div>

          <div style="position:relative; width:100%; height:110px;">
            <textarea id="richFormMemoInput" placeholder="직접 글을 작성해보거나 상단의 [낭만작가 글 작성하기]를 눌러보세요!" style="width:100%; height:100%; background:rgba(255,255,255,0.06); border:1.2px solid rgba(52,211,153,0.5); color:#fff; border-radius:10px; padding:10px 12px; font-size:0.80rem; line-height:1.6; box-sizing:border-box; outline:none; resize:none; font-family:'SUIT', sans-serif;">${escapeHtml(rawMemo)}</textarea>

            <div id="memoWritingInlineOverlay" style="display:none; position:absolute; inset:0; background:rgba(7,10,17,0.88); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1.2px solid #38bdf8; border-radius:10px; flex-direction:column; align-items:center; justify-content:center; gap:6px; z-index:10; box-sizing:border-box;">
              <div style="width:26px; height:26px; border-radius:50%; background:rgba(56,189,248,0.15); border:1.5px solid #38bdf8; display:flex; align-items:center; justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; animation:spin 1.5s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              </div>
              <div style="font-size:0.75rem; font-weight:900; color:#ffffff; letter-spacing:-0.02em;">낭만작가가 글을 짓는 중입니다... ✍️</div>
              <div style="font-size:0.58rem; color:#94a3b8;">위에서 사진을 추가하거나 수정하실 수 있습니다</div>
            </div>
          </div>
        </div>

        <button onclick="window.__saveRichAfterTrip('${record.id}')" style="width:100%; height:44px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.88rem; font-weight:900; border-radius:10px; cursor:pointer; flex-shrink:0; box-shadow:0 4px 14px rgba(13,148,136,0.35); margin-top:2px; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>낭만 저장하기</span>
        </button>

      </div>
    `;
    document.body.appendChild(formModal);
    window.__syncAiButtonTimer();
  };

  window.__removeRichSinglePhoto = function(idx) {
    if (!Array.isArray(window.__tempUploadedPhotos)) return;
    window.__tempUploadedPhotos.splice(idx, 1);
    if (Array.isArray(window.__tempPhotoCaptions)) window.__tempPhotoCaptions.splice(idx, 1);

    var grid = document.getElementById('richPhotoThumbnailsGrid');
    var countNotice = document.getElementById('photoCountNotice');
    if (grid) {
      grid.innerHTML = window.__tempUploadedPhotos.map(function(url, pIdx) {
        return `
          <div style="position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid rgba(56,189,248,0.4); flex-shrink:0;">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
            <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx})" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:none; font-size:10px; line-height:1; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
          </div>
        `;
      }).join('');
    }
    if (countNotice) countNotice.innerText = `(${window.__tempUploadedPhotos.length} / 10장)`;
    triggerHaptic(8);
  };

  window.__clearAllRichPhotos = function() {
    window.__tempUploadedPhotos = [];
    window.__tempPhotoCaptions = [];
    var grid = document.getElementById('richPhotoThumbnailsGrid');
    var countNotice = document.getElementById('photoCountNotice');
    if (grid) grid.innerHTML = '';
    if (countNotice) countNotice.innerText = `(0 / 10장)`;
    if (typeof showToast === 'function') showToast('모든 사진 선택이 해제되었습니다.', 'info');
    triggerHaptic(10);
  };

  window.__handleRichDirectInputChange = function(fieldKey, val) {
    if (!window.__richState) return;
    window.__richState[fieldKey] = val;
  };

  window.__selectToneStyle = function(toneId, btnEl) {
    if (!window.__richState) return;
    window.__richState.selectedTone = toneId;

    document.querySelectorAll('.tone-style-btn').forEach(function(b) {
      b.style.background = 'rgba(255,255,255,0.06)';
      b.style.color = '#cbd5e1';
      b.style.border = '1px solid rgba(255,255,255,0.12)';
      b.style.fontWeight = '800';
    });

    if (btnEl) {
      btnEl.style.background = '#f43f5e';
      btnEl.style.color = '#ffffff';
      btnEl.style.border = '1px solid #fda4af';
      btnEl.style.fontWeight = '900';
    }

    triggerHaptic(8);
  };

  window.__selectMbtiType = function(mbti, btnEl) {
    if (!window.__richState) return;
    window.__richState.selectedMbti = mbti;

    document.querySelectorAll('.mbti-chip-btn').forEach(function(b) {
      b.style.background = 'rgba(255,255,255,0.06)';
      b.style.color = '#cbd5e1';
      b.style.border = '1px solid rgba(255,255,255,0.12)';
      b.style.fontWeight = '800';
    });

    if (btnEl) {
      btnEl.style.background = '#0284c7';
      btnEl.style.color = '#ffffff';
      btnEl.style.border = '1px solid #38bdf8';
      btnEl.style.fontWeight = '900';
    }

    triggerHaptic(8);
  };

  window.callGeminiFlashLiteAi = async function(spot, elevation, weight, hard, good, memory, style, mbti) {
    var gasUrl = window.OKBM_GAS_URL || window.GAS_API_URL || window.GAS_URL || 'https://script.google.com/macros/s/AKfycbz_구글시트_배포_URL/exec';

    try {
      var response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'GENERATE_BASECAMP_LOG',
          spot: spot,
          elevation: elevation,
          weight: weight,
          hard: hard,
          good: good,
          memory: memory,
          style: style,
          mbti: mbti
        })
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      var data = await response.json();
      if (data && data.status === 'SUCCESS' && data.text) {
        return data.text.trim().replace(/,\s*$/, '.');
      } else if (data && data.message) {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error('[Romantic Writer Engine Error]:', err);
    }

    return null;
  };

  window.__lastAiStoryCallTime = window.__lastAiStoryCallTime || 0;
  window.__globalAiCooldownTimerId = null;

  window.__syncAiButtonTimer = function() {
    var btn = document.getElementById('btnTriggerAiStory');
    if (!btn) return;

    var now = Date.now();
    var elapsed = (now - (window.__lastAiStoryCallTime || 0)) / 1000;

    if (elapsed < 60) {
      var remainSec = Math.ceil(60 - elapsed);
      btn.disabled = true;
      btn.style.opacity = '0.55';
      btn.style.cursor = 'not-allowed';
      btn.innerHTML = `<span>⏳ ${remainSec}초 대기</span>`;

      if (!window.__globalAiCooldownTimerId) {
        window.__globalAiCooldownTimerId = setInterval(function() {
          var curNow = Date.now();
          var curElapsed = (curNow - (window.__lastAiStoryCallTime || 0)) / 1000;
          var curBtn = document.getElementById('btnTriggerAiStory');

          if (curElapsed < 60) {
            var curRemainSec = Math.ceil(60 - curElapsed);
            if (curBtn) {
              curBtn.disabled = true;
              curBtn.style.opacity = '0.55';
              curBtn.style.cursor = 'not-allowed';
              curBtn.innerHTML = `<span>⏳ ${curRemainSec}초 대기</span>`;
            }
          } else {
            clearInterval(window.__globalAiCooldownTimerId);
            window.__globalAiCooldownTimerId = null;
            if (curBtn) {
              curBtn.disabled = false;
              curBtn.style.opacity = '1';
              curBtn.style.cursor = 'pointer';
              curBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span>낭만작가 글 작성하기</span>`;
            }
          }
        }, 1000);
      }
    } else {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span>낭만작가 글 작성하기</span>`;
    }
  };

  window.__refreshAutoStoryMemo = async function(isUserTriggered) {
    var overlay = document.getElementById('memoWritingInlineOverlay');
    var triggerBtn = document.getElementById('btnTriggerAiStory');
    var memoArea = document.getElementById('richFormMemoInput');

    var now = Date.now();
    var elapsed = (now - (window.__lastAiStoryCallTime || 0)) / 1000;

    if (elapsed < 60) {
      triggerHaptic(8);
      return;
    }

    if (overlay) overlay.style.display = 'flex';
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.style.opacity = '0.5';
      triggerBtn.style.cursor = 'not-allowed';
    }

    var cur = window.__richCurrentRecord || (window.interactiveHistory && window.interactiveHistory[window.currentCardIndex || 0]) || {};
    var spot = cur.spot || '선자령';
    var elevation = cur.elevation || '832m';
    var weight = cur.weightKg || '5.4';
    var hard = (window.__richState && window.__richState.hardText) ? window.__richState.hardText.trim() : '';
    var good = (window.__richState && window.__richState.goodText) ? window.__richState.goodText.trim() : '';
    var memory = (window.__richState && window.__richState.memoryText) ? window.__richState.memoryText.trim() : '';
    var tone = (window.__richState && window.__richState.selectedTone) ? window.__richState.selectedTone : 'insta';
    var mbti = (window.__richState && window.__richState.selectedMbti) ? window.__richState.selectedMbti : 'INFP';

    try {
      var aiStory = await window.callGeminiFlashLiteAi(spot, elevation, weight, hard, good, memory, tone, mbti);

      if (overlay) overlay.style.display = 'none';

      if (aiStory && aiStory.trim().length > 10) {
        window.__lastAiStoryCallTime = Date.now();
        if (memoArea) memoArea.value = aiStory.trim();
        window.__syncAiButtonTimer();

        if (isUserTriggered && typeof showToast === 'function') {
          showToast('✨ 낭만작가가 맞춤 글을 완성했습니다!', 'success');
        }
      } else {
        throw new Error('API_FAIL');
      }
    } catch (err) {
      if (overlay) overlay.style.display = 'none';
      window.__syncAiButtonTimer();

      if (typeof showToast === 'function') {
        showToast('⚠️ 낭만작가가 일시 지연 중입니다. 잠시 후 다시 이용해주세요.', 'warn');
      }
    }
  };

  // 📷 [사진 누적 등록 - 10장 한도 완벽 지원 및 파일 입력기 초기화]
  window.__handleRichMultiPhotoUpload = function(e) {
    var files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!Array.isArray(window.__tempUploadedPhotos)) {
      window.__tempUploadedPhotos = [];
    }

    window.__tempUploadedPhotos = window.__tempUploadedPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    var currentCount = window.__tempUploadedPhotos.length;
    var availableSlots = 10 - currentCount;

    if (availableSlots <= 0) {
      if (typeof showToast === 'function') showToast('⚠️ 사진은 최대 10장까지만 등록할 수 있습니다.', 'warn');
      e.target.value = '';
      return;
    }

    var filesToProcess = files.slice(0, availableSlots);
    if (typeof showToast === 'function') showToast('⚡ 사진 ' + filesToProcess.length + '장을 최적화하는 중...', 'info', 1500);

    var compressSingle = function(file) {
      return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var MAX_SIZE = 1200;
            var width = img.width, height = img.height;
            if (width > height) {
              if (width > MAX_SIZE) { height = Math.round(height * (MAX_SIZE / width)); width = MAX_SIZE; }
            } else {
              if (height > MAX_SIZE) { width = Math.round(width * (MAX_SIZE / height)); height = MAX_SIZE; }
            }
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = function() { resolve(''); };
          img.src = evt.target.result;
        };
        reader.onerror = function() { resolve(''); };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(filesToProcess.map(compressSingle)).then(function(compressedUrls) {
      var validUrls = compressedUrls.filter(Boolean);
      window.__tempUploadedPhotos = window.__tempUploadedPhotos.concat(validUrls).slice(0, 10);
      
      var grid = document.getElementById('richPhotoThumbnailsGrid');
      var countNotice = document.getElementById('photoCountNotice');
      if (grid) {
        grid.innerHTML = window.__tempUploadedPhotos.map(function(url, pIdx) {
          return `
            <div style="position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid rgba(56,189,248,0.4); flex-shrink:0;">
              <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
              <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx})" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:none; font-size:10px; line-height:1; display:flex; align-items:center; justify-content:center; cursor:pointer;">✕</button>
            </div>
          `;
        }).join('');
      }
      if (countNotice) countNotice.innerText = `(${window.__tempUploadedPhotos.length} / 10장)`;
      if (typeof showToast === 'function') showToast('🌟 사진 ' + validUrls.length + '장이 추가되었습니다!', 'success', 2000);
      e.target.value = '';
    });
  };

  // 💾 [낭만 일지 & 멀티 사진 IndexedDB 대용량 영구 저장 - 스마트폰 로컬 100% 보존]
  window.__saveRichAfterTrip = async function(recordId) {
    if (!window.interactiveHistory || window.interactiveHistory.length === 0) {
      window.interactiveHistory = (await window.loadFromIndexedDB('okbm_packing_history')) || [];
    }

    var target = (window.interactiveHistory || []).find(function(r) {
      return String(r.id).trim() === String(recordId).trim();
    });

    if (!target && window.__richCurrentRecord) {
      target = (window.interactiveHistory || []).find(function(r) {
        return String(r.id).trim() === String(window.__richCurrentRecord.id).trim();
      });
    }

    if (!target && window.interactiveHistory && window.interactiveHistory.length > 0) {
      var fallbackIdx = (typeof window.currentCardIndex === 'number' && window.currentCardIndex >= 0) ? window.currentCardIndex : 0;
      target = window.interactiveHistory[fallbackIdx];
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('저장할 대상 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    if (window.__richState) {
      target.hardText = window.__richState.hardText || '';
      target.goodText = window.__richState.goodText || '';
      target.memoryText = window.__richState.memoryText || '';
    }

    var memoInput = document.getElementById('richFormMemoInput');
    target.memo = memoInput ? memoInput.value.trim() : '';
    target.oneLineMemo = target.spot ? (target.spot + ' 백패킹') : '자연 속 힐링 백패킹';

    // 📷 [스마트폰 로컬 IndexedDB에 사진 10장 100% 영구 반영]
    if (Array.isArray(window.__tempUploadedPhotos) && window.__tempUploadedPhotos.length > 0) {
      target.photos = window.__tempUploadedPhotos.slice(0, 10);
      target.fieldPhoto = target.photos[0];
      target.photo = target.photos[0];

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
      savedPhotosMap[String(target.id)] = target.photos;
      window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
      await window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);

      window.__tempUploadedPhotos = null;
    }

    if (Array.isArray(window.__tempPhotoCaptions)) {
      target.photoCaptions = window.__tempPhotoCaptions.slice(0, 10);
      window.__tempPhotoCaptions = null;
    }

    var existingIndex = window.interactiveHistory.findIndex(function(r) {
      return String(r.id).trim() === String(target.id).trim();
    });
    if (existingIndex !== -1) {
      window.interactiveHistory[existingIndex] = target;
    } else {
      window.interactiveHistory.unshift(target);
    }
    window.packingHistoryList = window.interactiveHistory;

    // 핸드폰 내장 IndexedDB 영구 저장
    window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
    await window.saveToIndexedDB('okbm_packing_history', window.interactiveHistory);

    // 순수 텍스트만 클라우드 구글 드라이브로 백업
    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud();
    }

    var m = document.getElementById('modalRichAfterTrip');
    if (m) m.remove();

    if (typeof window.renderFullBasecampStage === 'function') {
      window.renderFullBasecampStage();
    }

    if (document.getElementById('singleTripFeedModal')) {
      window.openSingleTripDualFeedModal(target.id);
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 낭만 일지와 사진이 핸드폰에 안전하게 저장되었습니다!', 'success');
  };

  window.openSingleTripDualFeedModal = function(recordId) {
    if (!window.interactiveHistory || window.interactiveHistory.length === 0) {
      var rawLogs = window.safeGetStorage('okbm_packing_history', []);
      if (Array.isArray(rawLogs) && rawLogs.length > 0) {
        window.interactiveHistory = rawLogs.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
      }
    }

    var logs = window.interactiveHistory || [];
    if (logs.length === 0) {
      if (typeof showToast === 'function') showToast('선택한 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    var startIdx = logs.findIndex(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (startIdx === -1) startIdx = 0;

    var old = document.getElementById('singleTripFeedModal');
    if (old) old.remove();

    window.__currentFeedLoadedIndices = new Set([startIdx]);
    window.__currentVisibleFeedId = String(logs[startIdx].id);

    function buildSingleFeedCardHtml(log) {
      var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
      var tmplId = log.templateId || window.selectedTemplateId || savedTmplId || 1;
      var items = Array.isArray(log.items) ? log.items : [];
      var borderGrad = (typeof window.getCardStableBorderGradient === 'function') 
        ? window.getCardStableBorderGradient(log, 0) 
        : 'linear-gradient(135deg, #10b981, #047857)';

      var photosList = (Array.isArray(log.photos) && log.photos.length > 0)
        ? log.photos 
        : [log.fieldPhoto || log.photo || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];

      var shortCardMemo = log.oneLineMemo || (log.spot ? (log.spot + ' 백패킹') : '자연 속 힐링 백패킹');

      var packingSheetMarkup = '';
      var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

      if (genFn) {
        packingSheetMarkup = genFn(tmplId, log, items, log.spot, shortCardMemo, photosList[0]);
      } else {
        packingSheetMarkup = `
          <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">
                <span style="font-family:'Space Grotesk', sans-serif; font-size:0.75rem; font-weight:900;">ROMANTIC PACK</span>
                <span style="font-size:0.52rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 5px; border-radius:3px;">#0${tmplId} 패킹지</span>
              </div>
              <div style="margin-top:6px; font-size:0.95rem; font-weight:900; display:flex; align-items:center; gap:3px;">
                ${window.VEC_ICONS.pin} <span>${escapeHtml(log.spot)} (${escapeHtml(log.elevation)})</span>
              </div>
              <div style="font-size:0.60rem; color:#64748b; font-family:'JetBrains Mono', monospace; margin-top:2px;">${log.date} · 장비 ${items.length}개 세팅</div>
              <div style="margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:5px; font-size:0.65rem; display:flex; flex-direction:column; gap:2.5px; max-height:160px; overflow-y:auto;">
                ${items.map(function(it) { return '<div style="display:flex; justify-content:space-between;"><span>• ' + escapeHtml(it.name) + '</span><span style="font-weight:700;">' + ((it.weight||0)/1000).toFixed(2) + 'kg</span></div>'; }).join('')}
              </div>
            </div>
            <div style="border-top:1.5px dashed #000; padding-top:5px; display:flex; justify-content:space-between; align-items:baseline;">
              <span style="font-size:0.68rem; font-weight:900; color:#64748b;">TOTAL WEIGHT</span>
              <span style="font-size:1.4rem; font-weight:900; color:#000; font-family:'Space Grotesk', sans-serif;">${log.weightKg} KG</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="single-feed-block" data-record-id="${escapeHtml(String(log.id))}" style="background:#000000; border:1px solid rgba(255,255,255,0.14); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 16px 45px rgba(0,0,0,0.95); flex-shrink:0; margin-bottom:36px;">
          <div style="padding:12px 14px; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.88rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
              ${window.VEC_ICONS.pin}
              <span>${escapeHtml(log.spot)}</span>
            </div>
            <span style="font-size:0.68rem; color:#94a3b8; font-weight:700; font-family:'JetBrains Mono', monospace;">${escapeHtml(log.date)}</span>
          </div>

          ${log.memo ? `
            <div style="padding:16px 18px 14px 18px; background:rgba(255,255,255,0.025); border-bottom:1px solid rgba(226,232,240,0.12); position:relative;">
              <div style="font-family:'Arita-buri-SemiBold', 'Noto Serif KR', serif; font-size:0.74rem; font-weight:300; color:#f1f5f9; line-height:1.65; word-break:keep-all; text-shadow:0 0 8px rgba(255,255,255,0.22); letter-spacing:-0.01em;">
                “${escapeHtml(log.memo)}”
              </div>
            </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; padding:8px 8px 0 8px; background:#000;">
            ${photosList.map(function(pUrl, pIdx) {
              var caption = (log.photoCaptions && log.photoCaptions[pIdx]) ? log.photoCaptions[pIdx].trim() : '';
              return `
                <div style="width:100%; aspect-ratio:3/4; overflow:hidden; position:relative; background:#05070a; border:1px solid rgba(255,255,255,0.12); border-radius:10px; margin-bottom:8px; box-sizing:border-box; cursor:pointer;" onclick="if(typeof window.triggerSoftAmbientFX==='function') window.triggerSoftAmbientFX(this);">
                  <img src="${pUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
                  ${caption ? `
                    <div style="position:absolute; bottom:0; left:0; right:0; padding:28px 14px 10px 14px; background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%); pointer-events:none; box-sizing:border-box;">
                      <div style="font-size:0.74rem; color:#ffffff; font-weight:700; line-height:1.45; text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.8); font-family:'SUIT', sans-serif;">
                        ${escapeHtml(caption)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div style="padding:10px 14px 14px 14px; background:#07090e; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
              ${window.VEC_ICONS.backpack}
              <span>이날의 배낭 패킹.</span>
            </div>
            <div style="width:100%; aspect-ratio:3/4; border-radius:14px; padding:2px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.8); box-sizing:border-box;">
              <div style="width:100%; height:100%; border-radius:12px; overflow:hidden; background:#0b0f19;">
                ${packingSheetMarkup}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    feedModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000002; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;';

    feedModal.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <span style="font-size:0.95rem; font-weight:900; color:#fff;">📖 백패킹 피드 상세</span>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>

      <div id="dualFeedScrollContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 20px)) 12px; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${buildSingleFeedCardHtml(logs[startIdx])}
        </div>
        
        <div id="infiniteFeedLoaderTrigger" style="padding:16px 0 24px 0; text-align:center; color:#64748b; font-size:0.70rem; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
          ${(logs.length > 1) ? '<span>⚡ 아래로 스크롤 시 이전 기록이 계속 이어집니다</span>' : '<span>마지막 기록입니다 ✨</span>'}
        </div>
      </div>

      <div style="flex-shrink:0 !important; display:flex; gap:6px; padding:10px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:1000003 !important;">
        <button onclick="window.shareSingleTripDualFeed(window.__currentVisibleFeedId)" style="flex:1; height:42px; background:linear-gradient(135deg, #f43f5e, #be123c); border:1px solid #fda4af; color:#fff; font-size:0.76rem; font-weight:900; border-radius:9px; cursor:pointer; box-shadow:0 4px 12px rgba(244,63,94,0.35); display:flex; align-items:center; justify-content:center; gap:3px;">
          🔗 공유
        </button>
        <button onclick="window.captureAndSaveSingleTripCard('dualFeedCardsWrapper', '낭만루트_피드')" style="flex:1.2; height:42px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.76rem; font-weight:900; border-radius:9px; cursor:pointer; box-shadow:0 4px 12px rgba(2,132,199,0.35); display:flex; align-items:center; justify-content:center; gap:3px;">
          💾 저장
        </button>
        <button onclick="var targetLog = (window.interactiveHistory||[]).find(function(r){return String(r.id).trim()===String(window.__currentVisibleFeedId).trim();}); if(targetLog) window.openRichAfterTripModal(targetLog);" style="flex:1.3; height:42px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.76rem; font-weight:900; border-radius:9px; cursor:pointer; box-shadow:0 4px 12px rgba(13,148,136,0.35); display:flex; align-items:center; justify-content:center; gap:3px;">
          ✏️ 일지 수정
        </button>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="flex:1; height:42px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; font-size:0.76rem; font-weight:900; border-radius:9px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
          ◀ 뒤로
        </button>
      </div>
    `;
    document.body.appendChild(feedModal);

    var scrollContainer = document.getElementById('dualFeedScrollContainer');
    var cardsWrapper = document.getElementById('dualFeedCardsWrapper');
    var loaderTrigger = document.getElementById('infiniteFeedLoaderTrigger');
    var nextLoadPointer = (startIdx + 1) % logs.length;
    var isAppendingNext = false;

    if (scrollContainer && cardsWrapper) {
      scrollContainer.addEventListener('scroll', function() {
        var scrollTop = scrollContainer.scrollTop;
        var scrollHeight = scrollContainer.scrollHeight;
        var clientHeight = scrollContainer.clientHeight;

        var feedBlocks = cardsWrapper.querySelectorAll('.single-feed-block');
        feedBlocks.forEach(function(block) {
          var rect = block.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            var activeId = block.getAttribute('data-record-id');
            if (activeId && window.__currentVisibleFeedId !== activeId) {
              window.__currentVisibleFeedId = activeId;
            }
          }
        });

        if (!isAppendingNext && (scrollTop + clientHeight >= scrollHeight - 70)) {
          if (window.__currentFeedLoadedIndices.size < logs.length) {
            isAppendingNext = true;

            while (window.__currentFeedLoadedIndices.has(nextLoadPointer) && window.__currentFeedLoadedIndices.size < logs.length) {
              nextLoadPointer = (nextLoadPointer + 1) % logs.length;
            }

            if (!window.__currentFeedLoadedIndices.has(nextLoadPointer)) {
              var nextLog = logs[nextLoadPointer];
              window.__currentFeedLoadedIndices.add(nextLoadPointer);

              if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                try { navigator.vibrate(45); } catch (e) {}
              }

              var tempDiv = document.createElement('div');
              tempDiv.innerHTML = buildSingleFeedCardHtml(nextLog);
              while (tempDiv.firstChild) {
                cardsWrapper.appendChild(tempDiv.firstChild);
              }

              nextLoadPointer = (nextLoadPointer + 1) % logs.length;

              if (window.__currentFeedLoadedIndices.size >= logs.length && loaderTrigger) {
                loaderTrigger.innerHTML = '<span>모든 기록을 불러왔습니다 ✨</span>';
              }
            }

            setTimeout(function() {
              isAppendingNext = false;
            }, 300);
          }
        }
      }, { passive: true });
    }

    triggerHaptic(12);
  };

  window.shareSingleTripDualFeed = async function(recordId) {
    var log = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!log) return;

    var shareTitle = `[낭만루트] ${log.spot} 백패킹 일지`;
    var shareText = log.memo ? `${log.memo}\n\n📍 ${log.spot} (${log.elevation}) · ${log.date}` : `📍 ${log.spot} (${log.elevation}) · ${log.date} 백패킹 기록`;
    var shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        if (typeof showToast === 'function') showToast('🌟 공유창이 열렸습니다!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError' && typeof showToast === 'function') {
          showToast('공유 링크가 클립보드에 복사되었습니다.', 'info');
        }
      }
    } else {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareText + '\n' + shareUrl);
        if (typeof showToast === 'function') showToast('📋 낭만 일지가 클립보드에 복사되었습니다!', 'success');
      } else {
        if (typeof showToast === 'function') showToast('공유 기능을 지원하지 않는 브라우저입니다.', 'warn');
      }
    }
    triggerHaptic(10);
  };

  // 🗓️ [달력 월 변경 ◀ / ▶ 네비게이션 엔진]
  window.changeBasecampMonth = function(delta) {
    var now = new Date();
    var curYear = window.calViewYear || now.getFullYear();
    var curMonth = window.calViewMonth || (now.getMonth() + 1);

    curMonth += delta;
    if (curMonth < 1) {
      curMonth = 12;
      curYear--;
    } else if (curMonth > 12) {
      curMonth = 1;
      curYear++;
    }

    window.calViewYear = curYear;
    window.calViewMonth = curMonth;

    var monthRecord = (window.interactiveHistory || []).find(function(h) {
      return Number(h.year) === Number(curYear) && Number(h.month) === Number(curMonth);
    });

    if (monthRecord) {
      window.activeSelectedDateKey = monthRecord.date;
      var foundIdx = window.interactiveHistory.findIndex(function(h) { return String(h.id) === String(monthRecord.id); });
      window.currentCardIndex = foundIdx !== -1 ? foundIdx : 0;
    }

    window.renderFullBasecampStage('fade');
    triggerHaptic(8);
  };

  // 🛡️ [보관함 메인 스테이지 - 화면 번쩍임 0% 부분 렌더링 최적화 엔진]
  window.renderFullBasecampStage = function(animType) {
    var content = document.querySelector('.my-basecamp-content');
    if (!content) return;

    content.style.cssText = 'width: 100% !important; max-width: 480px !important; height: 100dvh !important; max-height: 100dvh !important; margin: 0 auto !important; padding: 0 !important; gap: 0 !important; background: #000000 !important; border: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; overflow: hidden !important; box-sizing: border-box !important; overscroll-behavior: none !important; -webkit-overscroll-behavior: none !important; touch-action: pan-y !important;';

    var now = new Date();
    var viewYear = window.calViewYear || now.getFullYear();
    var viewMonth = window.calViewMonth || (now.getMonth() + 1);

    if (window.interactiveHistory) {
      window.interactiveHistory = window.sortHistoryByDateAsc(window.interactiveHistory);
    }
    var allHistory = window.interactiveHistory || [];
    var totalCount = allHistory.length;
    var monthHistory = allHistory.filter(function(h) { return Number(h.year) === Number(viewYear) && Number(h.month) === Number(viewMonth); });
    var monthCount = monthHistory.length;

    var totalGramsSum = allHistory.reduce(function(sum, h) { return sum + (h.weightGrams || 0); }, 0);
    var avgWeightStr = totalCount > 0 ? (totalGramsSum / totalCount / 1000).toFixed(2) + 'kg' : '0.00kg';

    var totalAccumElevNum = 0;
    allHistory.forEach(function(h) {
      var num = parseInt(String(h.elevation).replace(/\D/g, ''), 10) || 0;
      totalAccumElevNum += num;
    });
    var accumElevStr = totalAccumElevNum > 0 ? (totalAccumElevNum.toLocaleString() + 'm') : '0m';

    var hasRecord = (window.currentCardIndex >= 0 && window.currentCardIndex < allHistory.length);
    var cur = hasRecord ? allHistory[window.currentCardIndex] : null;

    if (cur && window.activeBasecampTab === 'history') {
      window.activeSelectedDateKey = cur.date;
    }

    var activeDateStr = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var dateParts = activeDateStr.match(/\d+/g) || [viewYear, viewMonth, 1];
    var activeDay = (parseInt(dateParts[0], 10) === viewYear && parseInt(dateParts[1], 10) === viewMonth) ? parseInt(dateParts[2], 10) : -1;

    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    // 🗓️ 6주(총 42칸) 18px 정밀 고정 렌더링 (서브픽셀 덜컹거림 0% 원천 차단)
    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:18px !important; line-height:18px !important; box-sizing:border-box;"></div>';
    }

    for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var dayRecord = monthHistory.find(function(h) { return Number(h.day) === Number(d); });
      var isRecorded = !!dayRecord;
      var isCompleted = isRecorded && Boolean(dayRecord.memo && dayRecord.memo.trim().length > 0);

      var dayStyle = 'position:relative; height:18px !important; max-height:18px !important; line-height:18px !important; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.64rem; font-weight:800; border-radius:4px; cursor:pointer; box-sizing:border-box; user-select:none;';
      
      if (isSelected) {
        dayStyle += 'background:#00bcd4 !important; color:#000000 !important; font-weight:900 !important; box-shadow:0 0 8px rgba(0,188,212,0.85) !important;';
      } else if (isCompleted) {
        dayStyle += 'color:#fde047; font-weight:900;';
      } else if (isRecorded) {
        dayStyle += 'color:#38bdf8; font-weight:900;';
      } else {
        dayStyle += 'color:#cbd5e1;';
      }

      var dotOrStar = '';
      if (isCompleted) {
        dotOrStar = '<span style="position:absolute; bottom:0px; font-size:7px; color:' + (isSelected ? '#000' : '#f59e0b') + '; line-height:1; font-weight:900; pointer-events:none;">★</span>';
      } else if (isRecorded) {
        dotOrStar = '<span style="position:absolute; bottom:1px; width:3px; height:3px; background:' + (isSelected ? '#000' : '#38bdf8') + '; border-radius:50%; pointer-events:none;"></span>';
      }

      calendarDaysHtml += '<div style="' + dayStyle + '" onclick="window.handleCalendarDateClick(' + d + ', ' + viewMonth + ', ' + viewYear + ')">' + d + dotOrStar + '</div>';
    }

    var totalRenderedCells = firstDayIndex + lastDayOfMonth;
    var trailingEmptyCells = 42 - totalRenderedCells;
    for (var te = 0; te < trailingEmptyCells; te++) {
      calendarDaysHtml += '<div style="height:18px !important; line-height:18px !important; box-sizing:border-box;"></div>';
    }

    var historyMiddleHtml = '';
    if (window.currentViewMode === 'list') {
      historyMiddleHtml = `
        <div style="width:100%; height:100%; max-height:clamp(250px, 46vh, 360px); background:#080b11; border:1px solid rgba(226, 232, 240, 0.2); border-radius:12px; padding:8px 10px; box-shadow:0 10px 25px rgba(0,0,0,0.85); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; flex-shrink:0;">
            <span style="font-size:0.68rem; font-weight:900; color:#38bdf8;">총 ${allHistory.length}개의 지난 백패킹 기록</span>
            <button onclick="window.currentViewMode='card'; window.renderFullBasecampStage();" style="background:#38bdf8; color:#000; border:none; padding:2px 8px; border-radius:4px; font-size:0.62rem; font-weight:900; cursor:pointer;">카드 뷰 ➔</button>
          </div>
          <div style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:4px; padding:4px 0;">
            ${allHistory.map(function(h, i) {
              var isCurrent = (i === window.currentCardIndex);
              var isItemCompleted = Boolean(h.memo && h.memo.trim().length > 0);
              return `
                <div onclick="window.currentCardIndex = ${i}; window.activeSelectedDateKey = '${h.date}'; window.currentViewMode = 'card'; window.renderFullBasecampStage();" style="width:100%; min-height:42px; background:${isCurrent ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.035)'}; border:1px solid ${isCurrent ? '#38bdf8' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:0 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; box-sizing:border-box;">
                  <div>
                    <div style="font-size:0.76rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:4px;">
                      ${window.VEC_ICONS.pin} <span>${escapeHtml(h.spot)}</span>
                      ${isItemCompleted ? `<span style="font-size:0.52rem; color:#6ee7b7; background:rgba(52,211,153,0.2); border:1px solid #34d399; padding:0 4px; border-radius:3px;">완료</span>` : `<span style="font-size:0.52rem; color:#fdba74; background:rgba(251,146,60,0.2); border:1px solid #fb923c; padding:0 4px; border-radius:3px;">미작성</span>`}
                    </div>
                    <div style="font-size:0.56rem; color:#94a3b8; margin-top:1px;">${h.date} · ${h.elevation} · 장비 ${h.items ? h.items.length : 0}개</div>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:0.72rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${h.weightKg}kg</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      if (hasRecord) {
        historyMiddleHtml = window.render3DPostcardElement(cur, window.currentCardIndex);
      } else {
        historyMiddleHtml = `
          <div style="width:100%; max-width:280px; aspect-ratio:3/4; background:linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); color:#ffffff; border:1.5px dashed rgba(56,189,248,0.4); border-radius:14px; padding:16px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center; box-sizing:border-box;">
            <span style="font-size:0.62rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">PLANNING BASECAMP</span>
            <div>
              <div style="font-size:2.2rem; margin-bottom:4px;">🎒</div>
              <div style="font-size:0.95rem; font-weight:900; color:#fff; line-height:1.35;">[${activeDateStr}]<br>낭만을 계획하시겠습니까?</div>
              <div style="font-size:0.65rem; color:#94a3b8; margin-top:6px; line-height:1.45;">이 날짜에 떠날 백패킹 장비를 패킹하고<br>실전 체크리스트를 준비해보세요!</div>
            </div>
            <button onclick="window.switchBasecampTab('plan')" style="width:100%; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:8px; color:#fff; font-size:0.78rem; font-weight:900; cursor:pointer; box-shadow:0 4px 12px rgba(2,132,199,0.35); display:flex; align-items:center; justify-content:center; gap:4px;">
              <span>🗓️ 낭만 계획 세우기 ➔</span>
            </button>
          </div>
        `;
      }
    }

    var activePlanRecord = cur || {
      spot: (window.currentLuckySpot && window.currentLuckySpot.name) ? window.currentLuckySpot.name : '대관령 선자령',
      elevation: (window.currentLuckySpot && window.currentLuckySpot.elevation) ? `${window.currentLuckySpot.elevation}m` : '832m',
      weightKg: '0.00',
      items: []
    };

    var planItems = [];
    if (cur && Array.isArray(cur.items) && cur.items.length > 0) {
      planItems = cur.items;
    } else if (typeof CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) {
            planItems.push({ id: it.id || ('item_' + Math.random()), name: it.name || it.itemName, weight: Number(it.weight || it.weight_g || 0) });
          }
        });
      });
    }

    var packedCount = 0;
    planItems.forEach(function(it) {
      var checkKey = activeDateStr + '__' + (it.name || it.itemName);
      if (window.packedCheckSet.has(checkKey)) packedCount++;
    });
    var planProgressPct = planItems.length > 0 ? Math.round((packedCount / planItems.length) * 100) : 0;

    var planTabHtml = `
      <div style="flex:1; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0; overflow-y:auto; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        <div style="background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1.5px solid rgba(56,189,248,0.35); border-radius:10px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
          <div>
            <div style="font-size:0.56rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif;">PLANNING FOR [${activeDateStr}]</div>
            <div style="font-size:0.90rem; font-weight:900; color:#ffffff; margin-top:2px; display:flex; align-items:center; gap:4px;">
              ${window.VEC_ICONS.pin} <span>${escapeHtml(activePlanRecord.spot)} (${escapeHtml(activePlanRecord.elevation)})</span>
            </div>
          </div>
          <button onclick="window.closeMyInfoModal(); if(typeof openPackingModal==='function') openPackingModal();" style="background:#0284c7; border:1px solid #38bdf8; color:#fff; font-size:0.65rem; font-weight:900; padding:4px 8px; border-radius:6px; cursor:pointer;">
            + 배낭 패킹
          </button>
        </div>

        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:8px 10px; flex-shrink:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.72rem; font-weight:900; color:#34d399; display:flex; align-items:center; gap:4px;">
              <span>🎒 실전 패킹 체크리스트</span>
              <span style="font-size:0.60rem; color:#cbd5e1; font-family:'Space Grotesk', sans-serif;">(${packedCount}/${planItems.length}개)</span>
            </div>
            <div style="display:flex; gap:4px;">
              <button onclick="window.toggleAllPackCheckItems(true, '${activeDateStr}')" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.54rem; font-weight:800; padding:2px 5px; border-radius:3px; cursor:pointer;">전체 체크</button>
              <button onclick="window.toggleAllPackCheckItems(false, '${activeDateStr}')" style="background:rgba(255,255,255,0.08); border:none; color:#94a3b8; font-size:0.54rem; font-weight:800; padding:2px 5px; border-radius:3px; cursor:pointer;">전체 해제</button>
            </div>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
            <div style="width:${planProgressPct}%; height:100%; background:linear-gradient(90deg, #38bdf8, #34d399); transition:width 0.25s ease;"></div>
          </div>
        </div>

        <div style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:4px; padding-right:2px;">
          ${planItems.length === 0 ? `
            <div style="text-align:center; padding:35px 0; color:#94a3b8; font-size:0.74rem; line-height:1.5;">
              담긴 장비가 없습니다.<br>
              <button onclick="window.closeMyInfoModal(); if(typeof openPackingModal==='function') openPackingModal();" style="margin-top:8px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.72rem; font-weight:900; padding:5px 12px; border-radius:6px; cursor:pointer;">
                + 계산기에서 장비 담기
              </button>
            </div>
          ` : planItems.map(function(it) {
            var checkKey = activeDateStr + '__' + (it.name || it.itemName);
            var isChecked = window.packedCheckSet.has(checkKey);
            var gName = it.name || it.itemName || '장비';
            var gWeightKg = ((Number(it.weight || 0)) / 1000).toFixed(2);
            return `
              <div onclick="window.togglePackCheckItem('${escapeHtml(checkKey)}')" style="background:${isChecked ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.035)'}; border:1px solid ${isChecked ? '#10b981' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; transition:all 0.15s ease;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                  <div style="width:18px; height:18px; border-radius:4px; border:1.5px solid ${isChecked ? '#10b981' : 'rgba(255,255,255,0.3)'}; background:${isChecked ? '#10b981' : 'transparent'}; display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; flex-shrink:0;">
                    ${isChecked ? '✓' : ''}
                  </div>
                  <span style="font-size:0.76rem; font-weight:800; color:${isChecked ? '#e2e8f0' : '#ffffff'}; text-decoration:${isChecked ? 'line-through' : 'none'}; opacity:${isChecked ? '0.7' : '1'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(gName)}
                  </span>
                </div>
                <span style="font-size:0.68rem; font-weight:800; color:#34d399; font-family:'Space Grotesk', sans-serif; flex-shrink:0;">
                  ${gWeightKg}kg
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    var bookmarks = new Set(window.safeGetStorage('okbm_bookmarks', []));
    var visited = new Set(window.safeGetStorage('okbm_visited', []));
    var memoObj = window.safeGetStorage('okbm_memos', {});

    var allSpotIds = new Set();
    bookmarks.forEach(function(id) { allSpotIds.add(String(id).trim()); });
    visited.forEach(function(id) { allSpotIds.add(String(id).trim()); });
    Object.keys(memoObj).forEach(function(id) { if (!id.startsWith('__')) allSpotIds.add(String(id).trim()); });

    var unifiedNotesList = [];
    allSpotIds.forEach(function(sId) {
      var isFav = bookmarks.has(sId);
      var isDone = visited.has(sId);
      var memo = memoObj[sId] ? String(memoObj[sId]).trim() : '';
      var foundSpot = (window.registeredSpots || []).find(function(s) { return String(s.id).trim() === sId; });
      var spotName = foundSpot ? (foundSpot.fullName || foundSpot.name) : ('박지 #' + sId);
      var spotElev = foundSpot && foundSpot.elevation ? (foundSpot.elevation + 'm') : (foundSpot ? foundSpot.region : '전국');

      unifiedNotesList.push({ id: sId, name: spotName, elevation: spotElev, isFav: isFav, isDone: isDone, memo: memo });
    });

    var filteredNotes = unifiedNotesList.filter(function(item) {
      if (window.archiveFilter === 'visited') return item.isDone;
      if (window.archiveFilter === 'fav') return item.isFav;
      if (window.archiveFilter === 'memo') return Boolean(item.memo && item.memo.length > 0);
      return true;
    });

    var notesTabHtml = `
      <div style="flex:1; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0; overflow-y:auto; -webkit-overflow-scrolling:touch; box-sizing:border-box;">
        <div style="display:flex; gap:3px; background:rgba(255,255,255,0.05); border:1px solid rgba(226,232,240,0.18); border-radius:8px; padding:2px; flex-shrink:0;">
          <button onclick="window.archiveFilter = 'all'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'all' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'all' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:5px 0; font-size:0.65rem; font-weight:900; cursor:pointer;">전체 (${unifiedNotesList.length})</button>
          <button onclick="window.archiveFilter = 'visited'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'visited' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'visited' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:5px 0; font-size:0.65rem; font-weight:900; cursor:pointer;">🚩 클리어 (${visited.size})</button>
          <button onclick="window.archiveFilter = 'fav'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'fav' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'fav' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:5px 0; font-size:0.65rem; font-weight:900; cursor:pointer;">⭐ 찜 (${bookmarks.size})</button>
          <button onclick="window.archiveFilter = 'memo'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'memo' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'memo' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:5px 0; font-size:0.65rem; font-weight:900; cursor:pointer;">🔒 메모</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:5px; flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch;">
          ${filteredNotes.length === 0 ? `
            <div style="font-size:0.74rem; color:#94a3b8; padding:35px 0; text-align:center; line-height:1.5;">
              저장된 박지 노트가 없습니다.<br>전국지도에서 박지를 찜하거나 비밀 메모를 남겨보세요!
            </div>
          ` : filteredNotes.map(function(item) {
            return `
              <div onclick="location.href='map.html?spot=' + encodeURIComponent('${escapeHtml(item.name)}');" style="background:rgba(255,255,255,0.035); border:1px solid ${item.memo ? 'rgba(56,189,248,0.3)' : 'rgba(226,232,240,0.12)'}; border-radius:10px; padding:8px 10px; display:flex; flex-direction:column; gap:4px; cursor:pointer; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:0.80rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${item.isDone ? window.VEC_ICONS.flag : ''}
                    ${item.isFav ? window.VEC_ICONS.star : ''}
                    <span>${escapeHtml(item.name)}</span>
                  </div>
                  <span style="font-size:0.58rem; color:#38bdf8; font-weight:800; flex-shrink:0;">지도로 보기 ➔</span>
                </div>
                <div style="font-size:0.58rem; color:#94a3b8;">고도/지역: ${escapeHtml(item.elevation)}</div>
                ${item.memo ? `
                  <div style="background:rgba(0,0,0,0.4); border-left:2px solid #38bdf8; border-radius:0 4px 4px 0; padding:4px 7px; margin-top:2px;">
                    <div style="font-size:0.68rem; color:#cbd5e1; line-height:1.4; font-family:'SUIT', sans-serif;">
                      🔒 “${escapeHtml(item.memo)}”
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    var tabContentHtml = historyMiddleHtml;
    if (window.activeBasecampTab === 'plan') tabContentHtml = planTabHtml;
    else if (window.activeBasecampTab === 'notes') tabContentHtml = notesTabHtml;

    var isCurCompleted = cur && Boolean(cur.memo && cur.memo.trim().length > 0);
    var mainActionButtonHtml = '';
    if (window.activeBasecampTab === 'plan') {
      mainActionButtonHtml = `
        <button onclick="window.closeMyInfoModal(); if(typeof openPackingModal==='function') openPackingModal();" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
          <span>🎒 배낭 패킹 계산기 열기</span>
        </button>
      `;
    } else if (!hasRecord) {
      mainActionButtonHtml = `
        <button onclick="window.switchBasecampTab('plan')" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
          <span>🗓️ 출정 계획 세우기</span>
        </button>
      `;
    } else if (isCurCompleted) {
      mainActionButtonHtml = `
        <div style="flex:1.2; height:38px; background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.4); color:#6ee7b7; font-size:0.74rem; font-weight:900; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:4px; user-select:none; box-sizing:border-box;">
          <span>✅ 낭만 일지 작성완료</span>
        </div>
      `;
    } else {
      mainActionButtonHtml = `
        <button onclick="window.openRichAfterTripModal(window.interactiveHistory[window.currentCardIndex])" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
          <span>📸 다녀온 기록 작성</span>
        </button>
      `;
    }

    var cardSlotEl = document.getElementById('basecampCenterContentSlot');
    var calGridEl = document.getElementById('basecampCalGridSlot');
    var calTitleEl = document.getElementById('basecampCalTitleSlot');
    var calCountEl = document.getElementById('basecampCalCountSlot');
    var statSlotEl = document.getElementById('basecampStatSummarySlot');
    var btnSlotEl = document.getElementById('basecampMainActionBtnSlot');
    var deleteBtnSlotEl = document.getElementById('basecampDeleteBtnSlot');

    if (cardSlotEl && calGridEl && btnSlotEl && window.__basecampMountedTab === window.activeBasecampTab) {
      cardSlotEl.innerHTML = tabContentHtml;
      calGridEl.innerHTML = calendarDaysHtml;
      btnSlotEl.innerHTML = mainActionButtonHtml;
      if (calTitleEl) calTitleEl.innerText = viewYear + '년 ' + viewMonth + '월';
      if (calCountEl) calCountEl.innerText = viewMonth + '월 ' + monthCount + '회';
      if (statSlotEl) {
        statSlotEl.innerHTML = `
          <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">2026 힐링</div><div style="font-size:0.92rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">${totalCount}회</div></div>
          <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
          <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">누적 고도</div><div style="font-size:0.92rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${accumElevStr}</div></div>
          <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
          <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">평균 무게</div><div style="font-size:0.92rem; font-weight:900; color:#fde047; font-family:'Space Grotesk', sans-serif;">${avgWeightStr}</div></div>
        `;
      }
      if (deleteBtnSlotEl) {
        deleteBtnSlotEl.setAttribute('onclick', hasRecord ? `window.deleteSingleLogRecord('${(cur && cur.id) ? cur.id : ''}')` : `showToast('삭제할 기록이 없습니다.', 'warn')`);
      }
    } else {
      window.__basecampMountedTab = window.activeBasecampTab;
      content.innerHTML = `
        <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:space-between; padding:calc(6px + env(safe-area-inset-top, 0px)) 12px 0 12px; margin:0 !important; gap:0 !important; box-sizing:border-box; overflow:hidden;">
          <div style="flex-shrink:0 !important; display:flex; flex-direction:column; gap:4px; margin:0 !important; padding:0 !important;">
            <div style="display:flex; background:rgba(255,255,255,0.08); padding:2.5px; border-radius:9px; gap:2.5px; border:1px solid rgba(226,232,240,0.2); margin:0 !important; height:34px !important; min-height:34px !important; box-sizing:border-box; flex-shrink:0 !important;">
              <button onclick="window.switchBasecampTab('history')" style="flex:1; background:${window.activeBasecampTab==='history' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='history' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:900; cursor:pointer;">📸 힐링 기록</button>
              <button onclick="window.switchBasecampTab('plan')" style="flex:1; background:${window.activeBasecampTab==='plan' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='plan' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:900; cursor:pointer;">🎒 낭만 계획</button>
              <button onclick="window.switchBasecampTab('notes')" style="flex:1; background:${window.activeBasecampTab==='notes' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='notes' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:900; cursor:pointer;">⭐ 내 박지 노트</button>
            </div>

            ${window.activeBasecampTab === 'history' ? `
              <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px; flex-shrink:0 !important;">
                <div id="basecampStatSummarySlot" style="height:38px !important; min-height:38px !important; box-sizing:border-box; flex-shrink:0 !important; background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:4px 8px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
                  <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">2026 힐링</div><div style="font-size:0.92rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">${totalCount}회</div></div>
                  <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
                  <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">누적 고도</div><div style="font-size:0.92rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${accumElevStr}</div></div>
                  <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
                  <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">평균 무게</div><div style="font-size:0.92rem; font-weight:900; color:#fde047; font-family:'Space Grotesk', sans-serif;">${avgWeightStr}</div></div>
                </div>

                <div style="height:162px !important; min-height:162px !important; max-height:162px !important; flex-shrink:0 !important; box-sizing:border-box; background:rgba(255,255,255,0.035); border:1px solid rgba(226,232,240,0.16); border-radius:8px; padding:4px 6px; display:flex; flex-direction:column; justify-content:space-between;">
                  <div style="display:flex; justify-content:space-between; align-items:center; height:20px; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:3px;">
                      <button onclick="window.changeBasecampMonth(-1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">◀</button>
                      <span id="basecampCalTitleSlot" style="font-size:0.72rem; font-weight:900; color:#fff;">${viewYear}년 ${viewMonth}월</span>
                      <button onclick="window.changeBasecampMonth(1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">▶</button>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <div id="basecampCalCountSlot" style="font-size:0.54rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif;">${viewMonth}월 ${monthCount}회</div>
                      <div style="display:inline-flex; background:rgba(255,255,255,0.08); border-radius:10px; padding:1px; gap:1px;">
                        <button onclick="window.currentViewMode='card'; window.renderFullBasecampStage();" style="background:${window.currentViewMode==='card'?'#38bdf8':'transparent'}; color:${window.currentViewMode==='card'?'#000':'#94a3b8'}; border:none; border-radius:8px; padding:1px 6px; font-size:0.55rem; font-weight:900; cursor:pointer;">카드</button>
                        <button onclick="window.currentViewMode='list'; window.renderFullBasecampStage();" style="background:${window.currentViewMode==='list'?'#38bdf8':'transparent'}; color:${window.currentViewMode==='list'?'#000':'#94a3b8'}; border:none; border-radius:8px; padding:1px 6px; font-size:0.55rem; font-weight:900; cursor:pointer;">목록</button>
                      </div>
                    </div>
                  </div>
                  <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.50rem; font-weight:800; color:#64748b; height:14px; line-height:14px; flex-shrink:0;">
                    <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#38bdf8;">토</span>
                  </div>
                  <div id="basecampCalGridSlot" style="display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:repeat(6, 18px) !important; gap:1px; text-align:center; height:114px !important; min-height:114px !important; max-height:114px !important; flex-shrink:0 !important; box-sizing:border-box;">
                    ${calendarDaysHtml}
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <div id="basecampCenterContentSlot" style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:0; position:relative; padding:2px 0;">
            ${tabContentHtml}
          </div>
        </div>

        <div style="flex-shrink:0; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; min-height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; display:flex; align-items:center; gap:6px; padding:0 12px env(safe-area-inset-bottom, 0px) 12px !important; background:rgba(0,0,0,0.96); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:10;">
          <div id="basecampMainActionBtnSlot" style="flex:1.2; display:flex;">
            ${mainActionButtonHtml}
          </div>
          <button onclick="window.openPastTripsListModal()" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(2,132,199,0.35);">
            <span>📱 피드 목록 ➔</span>
          </button>
          <button id="basecampDeleteBtnSlot" onclick="${hasRecord ? `window.deleteSingleLogRecord('${(cur && cur.id) ? cur.id : ''}')` : `showToast('삭제할 기록이 없습니다.', 'warn')`}" style="height:38px; background:rgba(244,63,94,0.15); border:1px solid #f43f5e; color:#fda4af; border-radius:8px; padding:0 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            ${window.VEC_ICONS.trash}
          </button>
          <button onclick="window.closeMyInfoModal()" style="height:38px; padding:0 10px; background:transparent; border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
            ✕ 닫기
          </button>
        </div>
      `;
    }

    var cardTarget = document.getElementById('swipePostcardTarget');
    if (cardTarget && hasRecord && window.activeBasecampTab === 'history' && window.currentViewMode === 'card') {
      var startX = 0, startY = 0, currentX = 0, isDragging = false;
      var longPressTimer = null;
      var isSwipeMoved = false;

      cardTarget.style.touchAction = 'none';

      cardTarget.onpointerdown = function(e) {
        if (e.cancelable) e.preventDefault();
        isDragging = true;
        isSwipeMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        cardTarget.style.transition = 'none';
        try { cardTarget.setPointerCapture(e.pointerId); } catch (err) {}

        longPressTimer = setTimeout(function() {
          triggerHaptic(30);
          window.switchBasecampTab('plan');
        }, 450);
      };

      cardTarget.onpointermove = function(e) {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        var diffX = e.clientX - startX;
        var diffY = e.clientY - startY;
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          isSwipeMoved = true;
          clearTimeout(longPressTimer);
        }
        currentX = e.clientX;
        if (isSwipeMoved) {
          var baseRot = window.isPostcardFlipped ? 180 : 0;
          cardTarget.style.transform = 'translate3d(' + (diffX * 0.5) + 'px, 0, 0) rotateY(' + baseRot + 'deg)';
        }
      };

      cardTarget.onpointerup = function(e) {
        clearTimeout(longPressTimer);
        if (!isDragging) return;
        isDragging = false;
        try { cardTarget.releasePointerCapture(e.pointerId); } catch (err) {}

        cardTarget.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        var diffX = currentX - startX;

        if (!isSwipeMoved) {
          window.isPostcardFlipped = !window.isPostcardFlipped;
          if (window.isPostcardFlipped) cardTarget.classList.add('flipped');
          else cardTarget.classList.remove('flipped');
          cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
          
          window.triggerSoftAmbientFX(cardTarget);
          triggerHaptic(8);
        } else {
          if (diffX > 50) {
            window.navigateCardRecord('next');
          } else if (diffX < -50) {
            window.navigateCardRecord('prev');
          } else {
            cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
          }
        }
      };

      cardTarget.onpointercancel = function(e) {
        clearTimeout(longPressTimer);
        isDragging = false;
        if (cardTarget) {
          cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
        }
      };
    }
  };

  // 🗂️ [보관함 모달 오픈/클로즈]
  window.openMyInfoModal = function(tab) {
    var modal = document.getElementById('myInfoModal');
    if (modal) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('background', '#000000', 'important');
      modal.style.setProperty('align-items', 'stretch', 'important');
      document.body.style.overflow = 'hidden';
    }

    if (!window.interactiveHistory || window.interactiveHistory.length === 0) {
      var rawList = window.__memoryStore['okbm_packing_history'] || window.safeGetStorage('okbm_packing_history', []);
      if (Array.isArray(rawList) && rawList.length > 0) {
        window.interactiveHistory = window.sortHistoryByDateAsc(rawList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); }));
      } else {
        window.interactiveHistory = [];
      }
    } else {
      window.interactiveHistory = window.sortHistoryByDateAsc(window.interactiveHistory);
    }

    var now = new Date();
    if (!window.activeSelectedDateKey) {
      var first = window.interactiveHistory[0];
      window.activeSelectedDateKey = first ? first.date : (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    }

    var initialIdx = window.interactiveHistory.findIndex(function(h) {
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : (h.year + '.' + String(h.month).padStart(2, '0') + '.' + String(h.day).padStart(2, '0'));
      var parts = hDate.match(/\d+/g);
      if (parts && parts.length >= 3) {
        hDate = parts[0] + '.' + String(parts[1]).padStart(2, '0') + '.' + String(parts[2]).padStart(2, '0');
      }
      return hDate === window.activeSelectedDateKey;
    });
    window.currentCardIndex = initialIdx !== -1 ? initialIdx : (window.interactiveHistory.length > 0 ? 0 : -1);

    var activeParts = String(window.activeSelectedDateKey).match(/\d+/g);
    if (activeParts && activeParts.length >= 2) {
      window.calViewYear = parseInt(activeParts[0], 10);
      window.calViewMonth = parseInt(activeParts[1], 10);
    } else {
      window.calViewYear = now.getFullYear();
      window.calViewMonth = now.getMonth() + 1;
    }

    window.fieldDiaries = window.safeGetStorage('okbm_field_diaries', {});
    window.activeBasecampTab = tab || 'history';
    window.renderFullBasecampStage();
    triggerHaptic(10);
  };

  window.closeMyInfoModal = function() {
    var modal = document.getElementById('myInfoModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      document.body.style.overflow = '';
    }
    triggerHaptic(10);
  };

  window.switchBasecampTab = function(tabId) {
    window.activeBasecampTab = tabId || 'history';
    window.renderFullBasecampStage();
    triggerHaptic(8);
  };

  // 📅 [달력 날짜 클릭 ➔ 기록 있는 날: 3D 엽서 즉시 활성화 / 빈 날: 1번 탭 유지하며 계획 안내 카드 노출]
  window.handleCalendarDateClick = function(day, month, year) {
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;

    var foundIdx = (window.interactiveHistory || []).findIndex(function(h) {
      if (Number(h.year) === Number(year) && Number(h.month) === Number(month) && Number(h.day) === Number(day)) {
        return true;
      }
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : (h.year + '.' + String(h.month).padStart(2, '0') + '.' + String(h.day).padStart(2, '0'));
      var parts = hDate.match(/\d+/g);
      if (parts && parts.length >= 3) {
        hDate = parseInt(parts[0], 10) + '.' + String(parseInt(parts[1], 10)).padStart(2, '0') + '.' + String(parseInt(parts[2], 10)).padStart(2, '0');
      }
      return hDate === dateKey;
    });

    if (foundIdx !== -1) {
      // 기록이 있는 날짜: 1번 탭 3D 엽서 카드 활성화
      window.currentCardIndex = foundIdx;
      window.currentViewMode = 'card';
      window.activeBasecampTab = 'history';
    } else {
      // 기록이 없는 날짜: 1번 탭 유지하며 "낭만을 계획하시겠습니까?" 카드 표시
      window.currentCardIndex = -1;
      window.currentViewMode = 'card';
      window.activeBasecampTab = 'history';
    }

    window.renderFullBasecampStage();
    triggerHaptic(10);
  };

  window.getRecordDateNum = function(r) {
    if (!r) return 0;
    var y = Number(r.year), m = Number(r.month), d = Number(r.day);
    if (!y || !m || !d) {
      var parts = String(r.date || '').match(/\d+/g);
      if (parts && parts.length >= 3) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
    }
    return (y && m && d) ? new Date(y, m - 1, d).getTime() : 0;
  };

  window.sortHistoryByDateAsc = function(list) {
    if (!Array.isArray(list)) return [];
    return list.slice().sort(function(a, b) {
      return window.getRecordDateNum(a) - window.getRecordDateNum(b);
    });
  };

  window.navigateCardRecord = function(direction) {
    if (!window.interactiveHistory || window.interactiveHistory.length === 0) return;
    window.interactiveHistory = window.sortHistoryByDateAsc(window.interactiveHistory);
    var total = window.interactiveHistory.length;
    if (total <= 1) {
      if (typeof showToast === 'function') showToast('기록이 1개만 있어 이동할 카드가 없습니다.', 'info');
      return;
    }

    // 👈 좌측 Swipe: 날짜가 낮은 날 (과거 방향, 0 도달 시 마지막 카드로 순환)
    if (direction === 'prev') {
      window.currentCardIndex = (window.currentCardIndex - 1 + total) % total;
    // 👉 우측 Swipe: 날짜가 높은 날 (미래 방향, 끝 도달 시 첫 번째 카드로 순환)
    } else if (direction === 'next') {
      window.currentCardIndex = (window.currentCardIndex + 1) % total;
    }

    var cur = window.interactiveHistory[window.currentCardIndex];
    if (cur) {
      window.activeSelectedDateKey = cur.date;
      window.calViewYear = cur.year || window.calViewYear;
      window.calViewMonth = cur.month || window.calViewMonth;
    }

    // 현재 보고 있는 면(사진 뒷면 vs 기록지 앞면) 상태를 그대로 유지하여 렌더링
    window.renderFullBasecampStage();
    triggerHaptic(10);
  };

  window.deleteSingleLogRecord = function(id, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var target = window.interactiveHistory.find(function(h) { return h.id === id; });
    var spotName = target ? target.spot : '기록';

    if (confirm('[' + spotName + '] 기록을 삭제할까요?')) {
      window.interactiveHistory = window.interactiveHistory.filter(function(h) { return h.id !== id; });
      window.packingHistoryList = window.interactiveHistory;
      if (window.selectedRecordIds) window.selectedRecordIds.delete(id);
      
      window.currentCardIndex = Math.max(0, window.interactiveHistory.length - 1);
      var cur = window.interactiveHistory[window.currentCardIndex];
      if (cur) window.activeSelectedDateKey = cur.date;
      
      window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
      localStorage.setItem('okbm_packing_history', JSON.stringify(window.interactiveHistory));
      
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
      triggerHaptic(15);
      showToast('야영 기록이 삭제되었습니다.', 'info');
      window.renderFullBasecampStage('fade');
    }
  };

  // 🎒 [실전 패킹 체크리스트 토글 헬퍼]
  window.togglePackCheckItem = function(checkKey) {
    if (!checkKey) return;
    if (window.packedCheckSet.has(checkKey)) {
      window.packedCheckSet.delete(checkKey);
    } else {
      window.packedCheckSet.add(checkKey);
    }
    localStorage.setItem('okbm_packed_checks', JSON.stringify(Array.from(window.packedCheckSet)));
    window.renderFullBasecampStage();
    triggerHaptic(10);
  };

  window.toggleAllPackCheckItems = function(isCheckAll, dateStr) {
    var cur = (window.currentCardIndex >= 0 && window.interactiveHistory) ? window.interactiveHistory[window.currentCardIndex] : null;
    var planItems = (cur && cur.items) ? cur.items : [];
    if (planItems.length === 0 && typeof CATEGORIES !== 'undefined') {
      CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) planItems.push(it);
        });
      });
    }

    planItems.forEach(function(it) {
      var key = dateStr + '__' + (it.name || it.itemName);
      if (isCheckAll) window.packedCheckSet.add(key);
      else window.packedCheckSet.delete(key);
    });

    localStorage.setItem('okbm_packed_checks', JSON.stringify(Array.from(window.packedCheckSet)));
    window.renderFullBasecampStage();
    triggerHaptic(12);
  };

  window.renderPackingHistoryList = function() {
    if (typeof window.renderFullBasecampStage === 'function') window.renderFullBasecampStage();
  };
  window.renderBasecampRecordData = function() {
    if (typeof window.renderFullBasecampStage === 'function') window.renderFullBasecampStage();
  };
  window.renderBasecampMemos = function() {
    if (typeof window.renderFullBasecampStage === 'function') window.renderFullBasecampStage();
  };

  document.addEventListener('click', function(e) {
    var dropdown = document.getElementById('spotSearchDropdown');
    var input = document.getElementById('shareCardSpotInput');
    if (dropdown && dropdown.style.display === 'block') {
      if (!dropdown.contains(e.target) && e.target !== input && !e.target.closest('.modal-btn')) {
        dropdown.style.display = 'none';
      }
    }
  });
})();

