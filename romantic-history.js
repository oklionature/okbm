/**
 * 🏕️ 낭만루트 낭만보관함(History) 전담 코어 엔진 (romantic-history.js)
 * - 스마트폰 대용량 IndexedDB(okbm_vault_db) 사진 영구 저장 & 텍스트 분리 하이브리드 캐시 엔진
 * - 3D 엽서 ↔ 피드 목록 ↔ 피드 상세 ↔ 낭만 일지 100% 실시간 사진 & 글 동기화
 * - 야영 캘린더 (연/월 이동, 보관함 완료일 ★ / 계획일 ⚑ 완벽 분리 표시)
 * - 박지명 / 날짜 / 고도 / 일지 본문 / 사진 10장 전방위 수정 지원
 * - 에어비앤비형 56px 전폭 단일 액션 독 탑재
 */

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

  // 🧰 [공통 유틸리티]
  function safeGetJSON(key, defaultVal) {
    try {
      var item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function triggerHaptic(duration) {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
          navigator.vibrate(duration || 12);
        }
      } catch (e) {}
    }
  }

  var HISTORY_VEC_ICONS = {
    stars: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; vertical-align:-1px; margin-right:2px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    flag: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f43f5e; vertical-align:-2px;" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f59e0b; vertical-align:-2px;" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    backpack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>'
  };

  if (!document.getElementById('basecamp-soft-ambient-fx-style')) {
    var fxStyle = document.createElement('style');
    fxStyle.id = 'basecamp-soft-ambient-fx-style';
    fxStyle.innerHTML = `
      @keyframes card_edge_sharp_pulse {
        0% { opacity: 0; box-shadow: 0 0 0px var(--edge-color), inset 0 0 0px var(--edge-color); }
        35% { opacity: 1; box-shadow: 0 0 6px 1px var(--edge-color), inset 0 0 3px var(--edge-color); }
        100% { opacity: 0; box-shadow: 0 0 10px 2px var(--edge-color), inset 0 0 5px var(--edge-color); }
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

  window.EDGE_05MM_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#c084fc', '#fb923c', '#a3e635', '#ffffff'];

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

  // 💾 [스마트폰 내장 대용량 영구 저장소(IndexedDB) & 텍스트/사진 분리형 하이브리드 캐시 엔진 원본 복원]
  var DB_NAME = 'okbm_vault_db';
  var DB_VERSION = 1;
  var STORE_NAME = 'packing_vault';
  window.__memoryStore = window.__memoryStore || {};

  function getIndexedDBInstance() {
    return new Promise(function(resolve) {
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
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function() { resolve(null); };
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
        req.onsuccess = function() { resolve(req.result ? req.result.data : null); };
        req.onerror = function() { resolve(null); };
      });
    } catch (e) {
      return null;
    }
  };

  window.safeGetStorage = function(key, defaultVal) {
    try {
      var item = localStorage.getItem(key);
      if (item !== null) {
        var parsed = JSON.parse(item);
        window.__memoryStore[key] = parsed;
        return parsed;
      }
    } catch (e) {}
    if (window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
      return window.__memoryStore[key];
    }
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

  // 💾 [피드 목록 & 보관함 완벽 동기화 단일 저장 엔진]
  window.savePackingHistoryRecord = function(record) {
    if (!record) return null;
    var normalized = window.normalizeHistoryRecord(record, 0);
    var list = window.safeGetStorage('okbm_packing_history', []) || [];
    var existIdx = list.findIndex(function(it) { return String(it.id) === String(normalized.id); });
    if (existIdx !== -1) {
      list[existIdx] = Object.assign({}, list[existIdx], normalized);
    } else {
      list.unshift(normalized);
    }
    window.interactiveHistory = list.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', list);

    if (normalized.photos && normalized.photos.length > 0) {
      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      savedPhotosMap[String(normalized.id)] = normalized.photos;
      savedPhotosMap[String(normalized.date)] = normalized.photos;
      window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);
    }

    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    return normalized;
  };

  // 🔄 [앱 구동 즉시 폰의 IndexedDB 사진 맵 및 히스토리 메모리로 사전 복원]
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
        if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage();
      } else {
        var rawLocal = localStorage.getItem('okbm_packing_history');
        if (rawLocal) {
          var parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            window.__memoryStore['okbm_packing_history'] = parsed;
            window.interactiveHistory = parsed.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
            window.packingHistoryList = window.interactiveHistory;
            await window.saveToIndexedDB('okbm_packing_history', parsed);
            if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage();
          }
        }
      }
    } catch (e) {}
  })();

  // 📷 [폰 내장 DB(IndexedDB)에서 사진을 100% 안전하게 꺼내오는 탐색기]
  function getRecordPhotos(record) {
    if (!record) return [];
    var rId = String(record.id || '').trim();
    var rDate = String(record.date || '').trim();
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};

    var localPhotos = (rId && savedPhotosMap[rId]) || (rDate && savedPhotosMap[rDate]);
    if (Array.isArray(localPhotos) && localPhotos.length > 0) return localPhotos.filter(Boolean);
    if (typeof localPhotos === 'string' && localPhotos.trim().length > 10) return [localPhotos.trim()];

    if (Array.isArray(record.photos) && record.photos.length > 0) return record.photos.filter(Boolean);
    if (record.fieldPhoto && String(record.fieldPhoto).trim().length > 10) return [String(record.fieldPhoto).trim()];
    if (record.photo && String(record.photo).trim().length > 10) return [String(record.photo).trim()];

    return [];
  }

  // 🎨 [3D 엽서 테두리 팔레트]
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

  // 🌌 [0.5mm 엣지 앰비언트 글로우 FX]
  window.EDGE_05MM_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#c084fc', '#fb923c', '#a3e635', '#ffffff'];

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

  // 🔄 [히스토리 레코드 정규화 엔진 - 작성 글 원본 보존]
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

    var recordId = (r && r.id) ? String(r.id) : ('pack_' + (r && r.date ? r.date.replace(/\D/g, '') : Date.now()) + '_' + idx);
    var rawPhotos = getRecordPhotos(r);

    var rawList = Array.isArray(r.items) ? r.items : (Array.isArray(r.gears) ? r.gears : []);
    var cleanItems = rawList.map(function(it) {
      if (typeof it === 'string') {
        var match = it.match(/^(.*?)\s*\((\d+)g\)$/);
        return match ? { name: match[1], weight: parseInt(match[2], 10) } : { name: it, weight: 0 };
      }
      return {
        name: it.name || it.itemName || '장비',
        weight: Number(it.weight || it.weight_g || 0)
      };
    });

    var totalGrams = cleanItems.reduce(function(sum, it) { return sum + it.weight; }, 0);
    var firstGearName = cleanItems[0] ? cleanItems[0].name : '';
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);

    // 작성 글 보존
    var userMemo = (r && r.memo !== undefined && r.memo !== null) ? String(r.memo).trim() : '';

    return {
      id: recordId,
      templateId: (r && r.templateId !== undefined && r.templateId !== null) ? parseInt(r.templateId, 10) : savedTmplId,
      date: (r && r.date) || (y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0')),
      year: y,
      month: m,
      day: d,
      spot: (r && (r.spot || r.spotName)) ? (r.spot || r.spotName) : (firstGearName ? (firstGearName + ' 패킹') : '선자령 백패킹'),
      elevation: (r && r.elevation) ? r.elevation : '832m',
      weightKg: (r && r.weightKg !== undefined && r.weightKg !== '0.00') ? r.weightKg : (totalGrams > 0 ? (totalGrams / 1000).toFixed(2) : '0.00'),
      weightGrams: (r && r.weightGrams) ? r.weightGrams : totalGrams,
      itemCount: cleanItems.length,
      hardText: (r && r.hardText) ? r.hardText : '',
      goodText: (r && r.goodText) ? r.goodText : '',
      memoryText: (r && r.memoryText) ? r.memoryText : '',
      memo: userMemo,
      oneLineMemo: (r && r.oneLineMemo) ? r.oneLineMemo : '',
      items: cleanItems,
      photos: rawPhotos,
      photo: rawPhotos[0] || '',
      fieldPhoto: rawPhotos[0] || ''
    };
  };

  // 🔄 [전역 상태 초기화]
  window.currentCardIndex = 0;
  window.currentViewMode = 'card';
  window.activeHistorySubFilter = 'all';
  window.isPostcardFlipped = false;

  window.interactiveHistory = (window.safeGetStorage('okbm_packing_history', []) || []).map(function(r, i) {
    return window.normalizeHistoryRecord(r, i);
  });
  window.packingHistoryList = window.interactiveHistory;

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

  // 🗂️ [3D 엽서 카드 렌더링 - 폰 IndexedDB 사진 & 글 100% 반영]
  window.render3DPostcardElement = function(cur, index) {
    if (!cur) return '';
    var items = Array.isArray(cur.items) ? cur.items : [];
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = cur.templateId || savedTmplId;
    var borderGrad = window.getCardStableBorderGradient(cur, index);
    var shortCardMemo = cur.oneLineMemo || (cur.spot ? (cur.spot + ' 백패킹') : '자연 속 힐링 백패킹');

    var isCompleted = Boolean(cur.memo && cur.memo.trim().length > 0);
    var statusBadgeHtml = isCompleted
      ? '<span style="font-size:0.52rem; background:rgba(52,211,153,0.18); border:1px solid #34d399; color:#6ee7b7; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">✍️ 일지작성됨</span>'
      : '<span style="font-size:0.52rem; background:rgba(251,146,60,0.18); border:1px solid #fb923c; color:#fdba74; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">⏳ 일지 미작성</span>';

    var photosList = getRecordPhotos(cur);
    var rawPhoto = photosList[0] || '';
    var hasValidPhoto = Boolean(rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 10);

    var frontContentHtml = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (genFn) {
      frontContentHtml = genFn(tmplId, cur, items, cur.spot, cur.memo || shortCardMemo, rawPhoto);
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
              ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(cur.spot)} (${escapeHtml(cur.elevation)})</span>
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
      ? `<img src="${rawPhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.88);" />
         <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%);"></div>`
      : `<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; box-sizing:border-box; text-align:center;">
          <div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px dashed rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <div style="font-size:0.80rem; font-weight:900; color:#e2e8f0;">등록된 현장 사진이 없습니다.</div>
          <div style="font-size:0.60rem; color:#94a3b8; line-height:1.4;">하단의 [일지 수정하기]에서<br>현장 사진을 추가해보세요!</div>
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
                  ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(cur.spot)}</span>
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

  // 📱 [지난 피드 목록 모달]
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
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000000; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="document.getElementById('pastTripsListModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.95rem; font-weight:900; color:#fff;">📱 지난 백패킹 피드 목록</span>
        </div>
        <span style="font-size:0.65rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3);">총 ${logs.length}개</span>
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${logs.length === 0 ? `
          <div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem;">
            기록된 백패킹이 없습니다.<br>배낭을 패킹하고 보관함에 저장해보세요!
          </div>
        ` : logs.map(function(r) {
          var tId = r.templateId || 1;
          var tName = (typeof TEMPLATE_NAMES !== 'undefined' && TEMPLATE_NAMES[tId]) ? TEMPLATE_NAMES[tId] : ('테마 ' + tId);
          var photos = getRecordPhotos(r);
          var thumbPhoto = photos[0] || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
          var safeId = escapeHtml(String(r.id));
          return `
            <div onclick="window.openSingleTripDualFeedModal('${safeId}')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                <div style="width:44px; height:44px; border-radius:8px; overflow:hidden; background:#1e293b; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">
                  <img src="${thumbPhoto}" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <div style="min-width:0;">
                  <div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(r.spot)}</span>
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

      <!-- 🏛️ 인덱스 일치 5대 하단독 듀얼 시스템 -->
      <div id="pastTripsDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(7,9,14,0.98) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000002 !important; user-select:none !important; overscroll-behavior:none !important; touch-action:none !important;">
        
        <div onclick="window.togglePastTripsDockDeck(); triggerHaptic(10);" style="position:absolute; top:2px; left:50%; transform:translateX(-50%); width:44px; height:8px; display:flex; align-items:center; justify-content:center; z-index:115; cursor:pointer;">
          <div style="width:28px; height:3.5px; border-radius:2px; background:rgba(255,255,255,0.35);"></div>
        </div>

        <!-- 1. 5대 도구 데크 (피드목록 / 일지수정 / 클리어 / 비밀메모 / 랜덤보기) -->
        <div id="pastTripsSubToolsDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:translateY(0); z-index:105; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          <button type="button" class="dock-item active" onclick="var c=document.querySelector('#pastTripsListModal > div:nth-child(2)'); if(c) c.scrollTo({top:0, behavior:'smooth'}); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#38bdf8 !important; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect width="18" height="18" x="3" y="3" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>피드목록</span>
          </button>
          
          <button type="button" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); if(window.interactiveHistory && window.interactiveHistory[0]){ window.openRichAfterTripModal(window.interactiveHistory[0]); } triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#cbd5e1; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>일지수정</span>
          </button>

          <button type="button" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.activeHistorySubFilter='visited'; window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#34d399; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <span>클리어</span>
          </button>

          <button type="button" class="dock-item" onclick="window.openHistorySecretMemoModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#fde047; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>비밀메모</span>
          </button>

          <button type="button" class="dock-item" onclick="window.openRandomFeedTrip(); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#cbd5e1; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>
            <span>랜덤보기</span>
          </button>
        </div>

        <!-- 2. 인덱스 일치 메인 5대 네비게이션 독 -->
        <div id="pastTripsMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:translateY(100%); z-index:104; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; background:rgba(7,9,14,0.98); box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M9 16l2 2 4-4"/>
            </svg>
            <span>낭만계획</span>
          </button>
          <button type="button" class="dock-item active" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.renderHistoryStage(); triggerHaptic(12);" style="color:#38bdf8 !important;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 8v13H3V8"/>
              <path d="M1 3h22v5H1z"/>
              <path d="M10 12h4"/>
            </svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="var p=document.getElementById('pastTripsListModal'); if(p) p.remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>내정보</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    // 듀얼독 토글 및 제스처 바인딩
    window.__pastTripsDockMode = 'tools';
    window.togglePastTripsDockDeck = function(forceMode) {
      if (forceMode) window.__pastTripsDockMode = forceMode;
      else window.__pastTripsDockMode = (window.__pastTripsDockMode === 'tools') ? 'main' : 'tools';
      var sub = document.getElementById('pastTripsSubToolsDeck');
      var main = document.getElementById('pastTripsMainNavDeck');
      if (!sub || !main) return;
      if (window.__pastTripsDockMode === 'tools') {
        sub.style.transform = 'translateY(0)';
        main.style.transform = 'translateY(100%)';
      } else {
        sub.style.transform = 'translateY(100%)';
        main.style.transform = 'translateY(0)';
      }
    };

    var dock = document.getElementById('pastTripsDualDockContainer');
    if (dock) {
      var startX = 0, startY = 0;
      dock.addEventListener('touchstart', function(e) {
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      dock.addEventListener('touchend', function(e) {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        var diffX = e.changedTouches[0].clientX - startX;
        var diffY = e.changedTouches[0].clientY - startY;
        if (diffY > 18 && Math.abs(diffY) > Math.abs(diffX)) {
          triggerHaptic(10);
          window.togglePastTripsDockDeck('main');
        } else if (diffY < -18 && Math.abs(diffY) > Math.abs(diffX)) {
          triggerHaptic(10);
          window.togglePastTripsDockDeck('tools');
        } else if (Math.abs(diffX) > 28) {
          triggerHaptic(10);
          window.togglePastTripsDockDeck();
        }
      }, { passive: true });
    }

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

  // 📖 [백패킹 피드 상세 듀얼 뷰 - 랜덤보기 및 피드 상세 하단독 일치화]
  window.openSingleTripDualFeedModal = function(recordId) {
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

    window.buildSingleFeedCardHtml = function(log) {
      var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
      var tmplId = log.templateId || savedTmplId;
      var items = Array.isArray(log.items) ? log.items : [];
      var borderGrad = window.getCardStableBorderGradient(log, 0);

      var photosList = getRecordPhotos(log);
      if (photosList.length === 0) {
        photosList = ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];
      }

      var shortCardMemo = log.oneLineMemo || (log.spot ? (log.spot + ' 백패킹') : '자연 속 힐링 백패킹');

      var packingSheetMarkup = '';
      var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

      if (genFn) {
        packingSheetMarkup = genFn(tmplId, log, items, log.spot, log.memo || shortCardMemo, photosList[0]);
      } else {
        packingSheetMarkup = `
          <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">
                <span style="font-family:'Space Grotesk', sans-serif; font-size:0.75rem; font-weight:900;">ROMANTIC PACK</span>
                <span style="font-size:0.52rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 5px; border-radius:3px;">#0${tmplId} 패킹지</span>
              </div>
              <div style="margin-top:6px; font-size:0.95rem; font-weight:900; display:flex; align-items:center; gap:3px;">
                ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(log.spot)} (${escapeHtml(log.elevation)})</span>
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
              ${HISTORY_VEC_ICONS.pin}
              <span>${escapeHtml(log.spot)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.68rem; color:#94a3b8; font-weight:700; font-family:'JetBrains Mono', monospace;">${escapeHtml(log.date)}</span>
              <button onclick="window.shareSingleTripDualFeed('${escapeHtml(String(log.id))}')" style="background:rgba(255,255,255,0.08); border:none; color:#38bdf8; font-size:0.65rem; font-weight:800; padding:2px 7px; border-radius:4px; cursor:pointer;">공유</button>
            </div>
          </div>

          ${log.memo ? `
            <div style="padding:16px 18px 14px 18px; background:rgba(255,255,255,0.025); border-bottom:1px solid rgba(226,232,240,0.12); position:relative;">
              <div style="font-family:'Arita-buri-SemiBold', 'Noto Serif KR', serif; font-size:0.78rem; font-weight:300; color:#f1f5f9; line-height:1.65; word-break:keep-all; text-shadow:0 0 8px rgba(255,255,255,0.22); letter-spacing:-0.01em;">
                “${escapeHtml(log.memo)}”
              </div>
            </div>
          ` : ''}

          <div style="display:flex; flex-direction:column; padding:8px 8px 0 8px; background:#000;">
            ${photosList.map(function(pUrl) {
              return `
                <div style="width:100%; aspect-ratio:3/4; overflow:hidden; position:relative; background:#05070a; border:1px solid rgba(255,255,255,0.12); border-radius:10px; margin-bottom:8px; box-sizing:border-box; cursor:pointer;" onclick="if(typeof window.triggerSoftAmbientFX==='function') window.triggerSoftAmbientFX(this);">
                  <img src="${pUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
                </div>
              `;
            }).join('')}
          </div>

          <div style="padding:10px 14px 14px 14px; background:#07090e; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
              ${HISTORY_VEC_ICONS.backpack}
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
    };

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    feedModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000002; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    feedModal.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <span style="font-size:0.95rem; font-weight:900; color:#fff;">📖 백패킹 피드 상세</span>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>

      <div id="dualFeedScrollContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${window.buildSingleFeedCardHtml(logs[startIdx])}
        </div>
        
        <div id="infiniteFeedLoaderTrigger" style="padding:16px 0 24px 0; text-align:center; color:#64748b; font-size:0.70rem; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
          ${(logs.length > 1) ? '<span>⚡ 아래로 스크롤 시 이전 기록이 계속 이어집니다</span>' : '<span>마지막 기록입니다 ✨</span>'}
        </div>
      </div>

      <!-- 🏛️ 인덱스 일치 5대 하단독 듀얼 시스템 -->
      <div id="singleFeedDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(7,9,14,0.98) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000003 !important; user-select:none !important; overscroll-behavior:none !important; touch-action:none !important;">
        
        <div onclick="window.toggleSingleFeedDockDeck(); triggerHaptic(10);" style="position:absolute; top:2px; left:50%; transform:translateX(-50%); width:44px; height:8px; display:flex; align-items:center; justify-content:center; z-index:115; cursor:pointer;">
          <div style="width:28px; height:3.5px; border-radius:2px; background:rgba(255,255,255,0.35);"></div>
        </div>

        <!-- 1. 5대 도구 데크 (피드목록 / 일지수정 / 클리어 / 비밀메모 / 랜덤보기) -->
        <div id="singleFeedSubToolsDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:translateY(0); z-index:105; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.openPastTripsListModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#cbd5e1; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect width="18" height="18" x="3" y="3" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>피드목록</span>
          </button>
          
          <button type="button" class="dock-item" onclick="var targetLog = (window.interactiveHistory||[]).find(function(r){return String(r.id).trim()===String(window.__currentVisibleFeedId).trim();}); if(targetLog){ window.openRichAfterTripModal(targetLog); } triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#38bdf8; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>일지수정</span>
          </button>

          <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.activeHistorySubFilter='visited'; window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#34d399; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <span>클리어</span>
          </button>

          <button type="button" class="dock-item" onclick="window.openHistorySecretMemoModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#fde047; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>비밀메모</span>
          </button>

          <button type="button" class="dock-item active" onclick="window.openRandomFeedTrip(); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#38bdf8 !important; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>
            <span>랜덤보기</span>
          </button>
        </div>

        <!-- 2. 인덱스 일치 메인 5대 네비게이션 독 -->
        <div id="singleFeedMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:translateY(100%); z-index:104; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; background:rgba(7,9,14,0.98); box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M9 16l2 2 4-4"/>
            </svg>
            <span>낭만계획</span>
          </button>
          <button type="button" class="dock-item active" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.renderHistoryStage(); triggerHaptic(12);" style="color:#38bdf8 !important;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 8v13H3V8"/>
              <path d="M1 3h22v5H1z"/>
              <path d="M10 12h4"/>
            </svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>내정보</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(feedModal);

    // 듀얼독 토글 및 제스처 바인딩
    window.__singleFeedDockMode = 'tools';
    window.toggleSingleFeedDockDeck = function(forceMode) {
      if (forceMode) window.__singleFeedDockMode = forceMode;
      else window.__singleFeedDockMode = (window.__singleFeedDockMode === 'tools') ? 'main' : 'tools';
      var sub = document.getElementById('singleFeedSubToolsDeck');
      var main = document.getElementById('singleFeedMainNavDeck');
      if (!sub || !main) return;
      if (window.__singleFeedDockMode === 'tools') {
        sub.style.transform = 'translateY(0)';
        main.style.transform = 'translateY(100%)';
      } else {
        sub.style.transform = 'translateY(100%)';
        main.style.transform = 'translateY(0)';
      }
    };

    var dock = document.getElementById('singleFeedDualDockContainer');
    if (dock) {
      var startX = 0, startY = 0;
      dock.addEventListener('touchstart', function(e) {
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });
      dock.addEventListener('touchend', function(e) {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        var diffX = e.changedTouches[0].clientX - startX;
        var diffY = e.changedTouches[0].clientY - startY;
        if (diffY > 18 && Math.abs(diffY) > Math.abs(diffX)) {
          triggerHaptic(10);
          window.toggleSingleFeedDockDeck('main');
        } else if (diffY < -18 && Math.abs(diffY) > Math.abs(diffX)) {
          triggerHaptic(10);
          window.toggleSingleFeedDockDeck('tools');
        } else if (Math.abs(diffX) > 28) {
          triggerHaptic(10);
          window.toggleSingleFeedDockDeck();
        }
      }, { passive: true });
    }

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
              var tempDiv = document.createElement('div');
              tempDiv.innerHTML = window.buildSingleFeedCardHtml(nextLog);
              while (tempDiv.firstChild) {
                cardsWrapper.appendChild(tempDiv.firstChild);
              }
              nextLoadPointer = (nextLoadPointer + 1) % logs.length;

              if (window.__currentFeedLoadedIndices.size >= logs.length && loaderTrigger) {
                loaderTrigger.innerHTML = '<span>모든 기록을 불러왔습니다 ✨</span>';
              }
            }

            setTimeout(function() { isAppendingNext = false; }, 300);
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
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
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
      }
    }
    triggerHaptic(10);
  };

  // 📝 [낭만 일지 작성 모달 - 박지명/날짜/글/사진 전방위 수정 및 폰 IndexedDB 연동]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;
    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;

    var currentPhotos = getRecordPhotos(record);
    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:1000005; display:flex; justify-content:center; align-items:center; padding:14px; box-sizing:border-box;';

    formModal.innerHTML = `
      <div style="width:100%; max-width:440px; max-height:92vh; background:#080b11; border:1.5px solid #38bdf8; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:10px; box-shadow:0 24px 60px rgba(0,0,0,0.95); box-sizing:border-box; overflow-y:auto;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:8px;">
          <span style="font-size:1.12rem; font-weight:900; color:#fff;">✍️ 낭만 일지 & 기록 수정</span>
          <button onclick="document.getElementById('modalRichAfterTrip').remove()" style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="display:flex; gap:6px;">
          <div style="flex:1.5; display:flex; flex-direction:column; gap:2px;">
            <label style="font-size:0.68rem; color:#38bdf8; font-weight:800;">📍 박지 이름</label>
            <input type="text" id="richInputSpotName" value="${escapeHtml(record.spot)}" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.75rem; outline:none; box-sizing:border-box;" />
          </div>
          <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
            <label style="font-size:0.68rem; color:#38bdf8; font-weight:800;">📅 출정 일자</label>
            <input type="text" id="richInputTripDate" value="${escapeHtml(record.date)}" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.75rem; outline:none; box-sizing:border-box;" />
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <label id="richPhotoCountLabel" style="font-size:0.70rem; color:#38bdf8; font-weight:900;">현장 사진 (${window.__tempUploadedPhotos.length} / 10장)</label>
            <button type="button" onclick="window.__clearAllRichPhotos();" style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.4); color:#fda4af; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:4px; cursor:pointer;">전체 해제</button>
          </div>
          <div id="richPhotoThumbnailsGrid" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:6px;">
            ${window.__tempUploadedPhotos.map(function(url, pIdx) {
              return `
                <div style="position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid rgba(56,189,248,0.4); flex-shrink:0;">
                  <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
                  <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:none; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                </div>
              `;
            }).join('')}
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event)" />
          <button type="button" onclick="document.getElementById('richMultiPhotoInput').click()" style="width:100%; height:34px; background:rgba(56,189,248,0.08); border:1px dashed #38bdf8; color:#7dd3fc; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; margin-top:2px;">+ 사진 추가 (최대 10장)</button>
        </div>

        <div>
          <label style="font-size:0.72rem; color:#34d399; font-weight:900;">📖 낭만 일지 본문</label>
          <textarea id="richFormMemoInput" placeholder="이날의 백패킹 이야기와 감상을 자유롭게 남겨보세요." style="width:100%; height:120px; background:rgba(255,255,255,0.06); border:1.2px solid rgba(52,211,153,0.5); color:#fff; border-radius:10px; padding:10px 12px; font-size:0.80rem; line-height:1.6; box-sizing:border-box; outline:none; resize:none; font-family:'SUIT', sans-serif; margin-top:4px;">${escapeHtml(record.memo || '')}</textarea>
        </div>

        <button onclick="window.__saveRichAfterTrip('${record.id}')" style="width:100%; height:44px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.88rem; font-weight:900; border-radius:10px; cursor:pointer; flex-shrink:0;">
          낭만 저장하기 ✓
        </button>
      </div>
    `;
    document.body.appendChild(formModal);
  };

  window.__renderRichPhotoThumbnails = function() {
    var grid = document.getElementById('richPhotoThumbnailsGrid');
    var label = document.getElementById('richPhotoCountLabel');
    if (grid && Array.isArray(window.__tempUploadedPhotos)) {
      grid.innerHTML = window.__tempUploadedPhotos.map(function(url, pIdx) {
        return `
          <div style="position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid rgba(56,189,248,0.4); flex-shrink:0;">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
            <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:2px; right:2px; width:16px; height:16px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:none; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>
        `;
      }).join('');
    }
    if (label && Array.isArray(window.__tempUploadedPhotos)) {
      label.innerText = `현장 사진 (${window.__tempUploadedPhotos.length} / 10장)`;
    }
  };

  window.__removeRichSinglePhoto = function(pIdx) {
    if (!Array.isArray(window.__tempUploadedPhotos)) return;
    window.__tempUploadedPhotos.splice(pIdx, 1);
    window.__renderRichPhotoThumbnails();
    triggerHaptic(8);
  };

  window.__clearAllRichPhotos = function() {
    window.__tempUploadedPhotos = [];
    window.__renderRichPhotoThumbnails();
    triggerHaptic(10);
  };

  window.__handleRichMultiPhotoUpload = function(e) {
    var files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!Array.isArray(window.__tempUploadedPhotos)) window.__tempUploadedPhotos = [];
    var currentCount = window.__tempUploadedPhotos.length;
    var availableSlots = 10 - currentCount;
    if (availableSlots <= 0) {
      if (typeof showToast === 'function') showToast('사진은 최대 10장까지만 등록 가능합니다.', 'warn');
      e.target.value = '';
      return;
    }

    var filesToProcess = files.slice(0, availableSlots);
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
            canvas.width = width; canvas.height = height;
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
      window.__tempUploadedPhotos = window.__tempUploadedPhotos.concat(compressedUrls.filter(Boolean)).slice(0, 10);
      window.__renderRichPhotoThumbnails();
      e.target.value = '';
      if (typeof showToast === 'function') showToast('🌟 사진이 추가되었습니다!', 'success');
    });
  };

  window.__saveRichAfterTrip = async function(recordId) {
    var target = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!target) return;

    var spotInput = document.getElementById('richInputSpotName');
    var dateInput = document.getElementById('richInputTripDate');
    var memoInput = document.getElementById('richFormMemoInput');

    if (spotInput && spotInput.value.trim()) target.spot = spotInput.value.trim();
    if (dateInput && dateInput.value.trim()) target.date = dateInput.value.trim();
    target.memo = memoInput ? memoInput.value.trim() : '';

    if (Array.isArray(window.__tempUploadedPhotos)) {
      target.photos = window.__tempUploadedPhotos.slice(0, 10);
      target.fieldPhoto = target.photos[0] || '';
      target.photo = target.photos[0] || '';

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      savedPhotosMap[String(target.id)] = target.photos;
      savedPhotosMap[String(target.date)] = target.photos;
      window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
      await window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    var m = document.getElementById('modalRichAfterTrip');
    if (m) m.remove();

    window.renderHistoryStage();

    var feedWrapper = document.getElementById('dualFeedCardsWrapper');
    if (feedWrapper && typeof window.buildSingleFeedCardHtml === 'function') {
      feedWrapper.innerHTML = window.buildSingleFeedCardHtml(target);
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 낭만 일지와 사진이 폰에 안전하게 저장되었습니다!', 'success');
  };

  // 🗓️ [달력 월 변경 엔진]
  window.changeHistoryMonth = function(delta) {
    var now = new Date();
    var curYear = window.calViewYear || now.getFullYear();
    var curMonth = window.calViewMonth || (now.getMonth() + 1);

    curMonth += delta;
    if (curMonth < 1) { curMonth = 12; curYear--; }
    else if (curMonth > 12) { curMonth = 1; curYear++; }

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

    window.renderHistoryStage();
    triggerHaptic(8);
  };

  // 🔒 [비밀메모 모달 엔진]
  window.openHistorySecretMemoModal = function() {
    var old = document.getElementById('historySecretMemoModal');
    if (old) old.remove();

    var memoObj = safeGetJSON('okbm_memos', {});
    var spotList = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) ? registeredSpots : safeGetJSON('okbm_spots_cache', []);
    var keys = Object.keys(memoObj).filter(function(k) { return memoObj[k] && String(memoObj[k]).trim().length > 0; });

    var memoList = keys.map(function(sId) {
      var found = spotList.find(function(s) { return String(s.id).trim() === String(sId).trim(); });
      return {
        id: sId,
        name: found ? (found.fullName || found.name) : ('박지 #' + sId),
        region: found ? found.region : '전국',
        elevation: found && found.elevation ? (found.elevation + 'm') : '',
        memo: String(memoObj[sId]).trim()
      };
    });

    var modalEl = document.createElement('div');
    modalEl.id = 'historySecretMemoModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000000; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;';

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="document.getElementById('historySecretMemoModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.95rem; font-weight:900; color:#fff;">🔒 나만의 박지 비밀메모</span>
        </div>
        <span style="font-size:0.65rem; color:#fde047; font-weight:800; background:rgba(253,224,71,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(253,224,71,0.3);">총 ${memoList.length}개</span>
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px 20px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${memoList.length === 0 ? `
          <div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem; line-height:1.6;">
            작성된 비밀메모가 없습니다.<br>
            전국지도 박지 상세화면에서 나만의 비밀 메모를 남겨보세요!
          </div>
        ` : memoList.map(function(item) {
          return `
            <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(253,224,71,0.3); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px;">
                  <span style="color:#fde047;">🔒</span>
                  <span>${escapeHtml(item.name)}</span>
                </div>
                <button type="button" onclick="location.href='map.html?spot=' + encodeURIComponent('${escapeHtml(item.name)}');" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#7dd3fc; font-size:0.62rem; font-weight:800; padding:2px 7px; border-radius:5px; cursor:pointer;">지도로 가기 ➔</button>
              </div>
              <div style="font-size:0.75rem; color:#e2e8f0; font-family:'SUIT', sans-serif; line-height:1.5; background:rgba(0,0,0,0.4); padding:8px 10px; border-radius:8px; border:1px dashed rgba(255,255,255,0.1); word-break:keep-all;">
                “${escapeHtml(item.memo)}”
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="flex-shrink:0 !important; width:100%; height:calc(56px + env(safe-area-inset-bottom, 0px)); padding:6px 14px calc(8px + env(safe-area-inset-bottom, 0px)) 14px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:1000001 !important; display:flex; align-items:center;">
        <button type="button" onclick="document.getElementById('historySecretMemoModal').remove(); triggerHaptic(10);" style="width:100%; height:44px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.84rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
          <span>확인 닫기 ✓</span>
        </button>
      </div>
    `;
    document.body.appendChild(modalEl);
    triggerHaptic(12);
  };

  // 🔄 [하단 독 모드 전환 및 스와이프 제스처 바인딩 엔진]
  window.__historyDockDeckMode = 'tools';

  window.toggleHistoryDockDeckMode = function(forceMode) {
    if (forceMode) {
      window.__historyDockDeckMode = forceMode;
    } else {
      window.__historyDockDeckMode = (window.__historyDockDeckMode === 'tools') ? 'main' : 'tools';
    }
    var sub = document.getElementById('historySubToolsDeck');
    var main = document.getElementById('historyMainNavDeck');
    if (!sub || !main) return;
    if (window.__historyDockDeckMode === 'tools') {
      sub.style.transform = 'translateY(0)';
      main.style.transform = 'translateY(100%)';
    } else {
      sub.style.transform = 'translateY(100%)';
      main.style.transform = 'translateY(0)';
    }
  };

  window.bindHistoryDualDockGestures = function() {
    var dock = document.getElementById('historyDualDockContainer');
    if (!dock || dock._swipeBound) return;
    dock._swipeBound = true;

    var startX = 0, startY = 0;
    dock.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    dock.addEventListener('touchend', function(e) {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      var diffX = e.changedTouches[0].clientX - startX;
      var diffY = e.changedTouches[0].clientY - startY;

      // 아래로 쓸기 ➔ 기본 5대 독
      if (diffY > 18 && Math.abs(diffY) > Math.abs(diffX)) {
        if (window.__historyDockDeckMode === 'tools') {
          triggerHaptic(10);
          window.toggleHistoryDockDeckMode('main');
        }
      }
      // 위로 쓸기 ➔ 보관함 5대 도구
      else if (diffY < -18 && Math.abs(diffY) > Math.abs(diffX)) {
        if (window.__historyDockDeckMode === 'main') {
          triggerHaptic(10);
          window.toggleHistoryDockDeckMode('tools');
        }
      }
      // 좌우 쓸기 ➔ 양방향 토글
      else if (Math.abs(diffX) > 28) {
        triggerHaptic(10);
        window.toggleHistoryDockDeckMode();
      }
    }, { passive: true });
  };
// 🏛️ [낭만보관함 메인 스테이지 렌더링 엔진 - 완벽 복원]
  window.renderHistoryStage = function() {
    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) return;

    window.interactiveHistory = window.sortHistoryByDateAsc(window.interactiveHistory || []);
    var allHistory = window.interactiveHistory;
    var totalCount = allHistory.length;

    var hasRecord = (window.currentCardIndex >= 0 && window.currentCardIndex < allHistory.length);
    var cur = hasRecord ? allHistory[window.currentCardIndex] : null;

    // 🗓️ [핵심] 현재 카드의 날짜에 맞춰 달력 연/월(Month) 자동 동기화 추적!
    var now = new Date();
    if (cur && cur.year && cur.month) {
      window.calViewYear = Number(cur.year);
      window.calViewMonth = Number(cur.month);
      window.activeSelectedDateKey = cur.date;
    }

    var viewYear = window.calViewYear || now.getFullYear();
    var viewMonth = window.calViewMonth || (now.getMonth() + 1);

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

    if (cur) window.activeSelectedDateKey = cur.date;
    var activeDateStr = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var dateParts = activeDateStr.match(/\d+/g) || [viewYear, viewMonth, 1];
    var activeDay = (parseInt(dateParts[0], 10) === viewYear && parseInt(dateParts[1], 10) === viewMonth) ? parseInt(dateParts[2], 10) : -1;

    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:18px !important; line-height:18px !important;"></div>';
    }

    for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var dayRecord = monthHistory.find(function(h) { return Number(h.day) === Number(d); });
      var isRecorded = !!dayRecord;
      var isCompleted = isRecorded && Boolean(dayRecord.memo && dayRecord.memo.trim().length > 0);

      var dayStyle = 'position:relative; height:18px !important; line-height:18px !important; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.64rem; font-weight:800; border-radius:4px; cursor:pointer; user-select:none;';
      if (isSelected) {
        dayStyle += 'background:#00bcd4 !important; color:#000000 !important; font-weight:900 !important; box-shadow:0 0 8px rgba(0,188,212,0.85);';
      } else if (isCompleted) {
        dayStyle += 'color:#fde047; font-weight:900;';
      } else if (isRecorded) {
        dayStyle += 'color:#38bdf8; font-weight:900;';
      } else {
        dayStyle += 'color:#cbd5e1;';
      }

      var dotOrStar = '';
      if (isCompleted) {
        dotOrStar = '<span style="position:absolute; bottom:0px; font-size:7px; color:' + (isSelected ? '#000' : '#f59e0b') + '; font-weight:900;">★</span>';
      } else if (isRecorded) {
        dotOrStar = '<span style="position:absolute; bottom:1px; width:3px; height:3px; background:' + (isSelected ? '#000' : '#38bdf8') + '; border-radius:50%;"></span>';
      }

      calendarDaysHtml += '<div style="' + dayStyle + '" onclick="window.handleHistoryCalendarClick(' + d + ', ' + viewMonth + ', ' + viewYear + ')">' + d + dotOrStar + '</div>';
    }

    var totalRenderedCells = firstDayIndex + lastDayOfMonth;
    for (var te = 0; te < (42 - totalRenderedCells); te++) {
      calendarDaysHtml += '<div style="height:18px !important; line-height:18px !important;"></div>';
    }

    // 중앙 콘텐츠 (3D 카드 vs 클리어 목록)
    var centerContentHtml = '';
    if (window.activeHistorySubFilter === 'visited') {
      var visitedIds = new Set(safeGetJSON('okbm_visited', []));
      var memoObj = safeGetJSON('okbm_memos', {});
      var spotList = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) ? registeredSpots : safeGetJSON('okbm_spots_cache', []);

      var clearedSpots = Array.from(visitedIds).map(function(sId) {
        var found = spotList.find(function(s) { return String(s.id).trim() === String(sId).trim(); });
        return {
          id: sId,
          name: found ? (found.fullName || found.name) : ('박지 #' + sId),
          elevation: found && found.elevation ? (found.elevation + 'm') : (found ? found.region : '전국'),
          memo: memoObj[sId] ? String(memoObj[sId]).trim() : ''
        };
      });

      centerContentHtml = `
        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; padding:4px 0; overflow-y:auto; box-sizing:border-box;">
          <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; padding:2px 4px; display:flex; justify-content:space-between; align-items:center;">
            <span>🚩 내가 정복한 클리어 박지 (${clearedSpots.length}개)</span>
            <button type="button" onclick="window.activeHistorySubFilter='all'; window.renderHistoryStage(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.62rem; font-weight:800; padding:2px 7px; border-radius:5px; cursor:pointer;">엽서 카드 ➔</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; flex:1; overflow-y:auto;">
            ${clearedSpots.length === 0 ? `
              <div style="text-align:center; padding:50px 0; color:#94a3b8; font-size:0.78rem;">
                아직 클리어한 박지가 없습니다.<br>
                전국지도에서 다녀온 박지에 🚩 클리어를 남겨보세요!
              </div>
            ` : clearedSpots.map(function(s) {
              return `
                <div onclick="location.href='map.html?spot=' + encodeURIComponent('${escapeHtml(s.name)}');" style="background:rgba(255,255,255,0.035); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                  <div>
                    <div style="font-size:0.84rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px;">
                      <span>🚩</span> <span>${escapeHtml(s.name)}</span>
                    </div>
                    <div style="font-size:0.64rem; color:#94a3b8; margin-top:2px;">고도/위치: ${escapeHtml(s.elevation)}</div>
                    ${s.memo ? `<div style="font-size:0.68rem; color:#cbd5e1; margin-top:3px; font-style:italic;">🔒 “${escapeHtml(s.memo)}”</div>` : ''}
                  </div>
                  <span style="font-size:0.62rem; color:#38bdf8; font-weight:800;">지도로 보기 ➔</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      if (hasRecord) {
        centerContentHtml = window.render3DPostcardElement(cur, window.currentCardIndex);
      } else {
        centerContentHtml = `
          <div style="width:100%; max-width:280px; aspect-ratio:3/4; background:linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); color:#ffffff; border:1.5px dashed rgba(56,189,248,0.4); border-radius:14px; padding:16px 12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center; box-sizing:border-box;">
            <span style="font-size:0.62rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">ROMANTIC ARCHIVE</span>
            <div>
              <div style="font-size:2.2rem; margin-bottom:4px;">🏕️</div>
              <div style="font-size:0.95rem; font-weight:900; color:#fff; line-height:1.35;">[${activeDateStr}]<br>출정 기록이 없습니다</div>
              <div style="font-size:0.65rem; color:#94a3b8; margin-top:6px; line-height:1.45;">이 날짜에 떠날 계획을 세우시겠습니까?</div>
            </div>
            <button onclick="window.closeHistoryModal(); if(typeof window.openPlanModal==='function') window.openPlanModal(); triggerHaptic(12);" style="width:100%; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:8px; color:#fff; font-size:0.78rem; font-weight:900; cursor:pointer;">
              <span>🗓️ 낭만계획 세우기 ➔</span>
            </button>
          </div>
        `;
      }
    }

    var isHistoryToolsActive = (window.__historyDockDeckMode !== 'main');

    // 🌟 [인덱스 일치 메인 5대 독 + 보관함 전용 5대 도구 듀얼독]
    var bottomDualDockHtml = `
      <div id="historyDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(7,9,14,0.98) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000 !important; user-select:none !important; overscroll-behavior:none !important; touch-action:none !important;">
        
        <div onclick="window.toggleHistoryDockDeckMode(); triggerHaptic(10);" style="position:absolute; top:2px; left:50%; transform:translateX(-50%); width:44px; height:8px; display:flex; align-items:center; justify-content:center; z-index:115; cursor:pointer;">
          <div style="width:28px; height:3.5px; border-radius:2px; background:rgba(255,255,255,0.35);"></div>
        </div>

        <!-- 1. 낭만보관함 5대 도구 데크 (피드목록 / 일지수정 / 클리어 / 비밀메모 / 랜덤보기) -->
        <div id="historySubToolsDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:${isHistoryToolsActive ? 'translateY(0)' : 'translateY(100%)'}; z-index:105; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          
          <button type="button" class="dock-item" onclick="window.openPastTripsListModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#cbd5e1; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect width="18" height="18" x="3" y="3" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>피드목록</span>
          </button>
          
          <button type="button" class="dock-item" onclick="if(window.interactiveHistory && window.interactiveHistory[window.currentCardIndex]){ window.openRichAfterTripModal(window.interactiveHistory[window.currentCardIndex]); } else { if(typeof showToast==='function') showToast('수정할 백패킹 기록이 없습니다.', 'warn'); } triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#38bdf8; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>일지수정</span>
          </button>

          <button type="button" class="dock-item ${window.activeHistorySubFilter === 'visited' ? 'active' : ''}" onclick="window.activeHistorySubFilter = (window.activeHistorySubFilter === 'visited' ? 'all' : 'visited'); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activeHistorySubFilter === 'visited' ? '#38bdf8 !important' : '#34d399'}; font-size:0.67rem; font-weight:900; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2.2;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            <span>클리어</span>
          </button>

          <button type="button" class="dock-item" onclick="window.openHistorySecretMemoModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#fde047; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>비밀메모</span>
          </button>

          <button type="button" class="dock-item" onclick="window.openRandomFeedTrip(); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:#cbd5e1; font-size:0.67rem; font-weight:800; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/></svg>
            <span>랜덤보기</span>
          </button>
        </div>

        <!-- 2. 인덱스 일치 메인 5대 네비게이션 독 -->
        <div id="historyMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); transform:${isHistoryToolsActive ? 'translateY(100%)' : 'translateY(0)'}; z-index:104; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; background:rgba(7,9,14,0.98); box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M9 16l2 2 4-4"/>
            </svg>
            <span>낭만계획</span>
          </button>
          <button type="button" class="dock-item active" onclick="window.toggleHistoryDockDeckMode(); triggerHaptic(12);" style="color:#38bdf8 !important;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 8v13H3V8"/>
              <path d="M1 3h22v5H1z"/>
              <path d="M10 12h4"/>
            </svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>내정보</span>
          </button>
        </div>
      </div>
    `;

    var content = modal.querySelector('.romantic-history-content');
    if (!content) return;

    // 상단 헤더 완전히 제거하고 시원하게 배치
    content.innerHTML = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; justify-content:space-between; padding:calc(10px + env(safe-area-inset-top, 0px)) 12px 0 12px; margin:0 !important; gap:6px !important; box-sizing:border-box; overflow:hidden;">
        <!-- 상단 통계 요약 바 -->
        <div style="flex-shrink:0 !important; display:flex; flex-direction:column; gap:4px;">
          <div style="height:38px; background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:4px 8px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
            <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">2026 힐링</div><div style="font-size:0.92rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">${totalCount}회</div></div>
            <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
            <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">누적 고도</div><div style="font-size:0.92rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${accumElevStr}</div></div>
            <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
            <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">평균 무게</div><div style="font-size:0.92rem; font-weight:900; color:#fde047; font-family:'Space Grotesk', sans-serif;">${avgWeightStr}</div></div>
          </div>

          <!-- 6주 캘린더 -->
          <div style="height:162px; background:rgba(255,255,255,0.035); border:1px solid rgba(226,232,240,0.16); border-radius:8px; padding:4px 6px; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="display:flex; justify-content:space-between; align-items:center; height:20px;">
              <div style="display:flex; align-items:center; gap:3px;">
                <button type="button" onclick="window.changeHistoryMonth(-1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">◀</button>
                <span style="font-size:0.72rem; font-weight:900; color:#fff;">${viewYear}년 ${viewMonth}월</span>
                <button type="button" onclick="window.changeHistoryMonth(1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">▶</button>
              </div>
              <div style="display:flex; align-items:center; gap:4px;">
                <span style="font-size:0.54rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif;">${viewMonth}월 ${monthCount}회</span>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.50rem; font-weight:800; color:#64748b; height:14px; line-height:14px;">
              <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#38bdf8;">토</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:repeat(6, 18px); gap:1px; text-align:center; height:114px;">
              ${calendarDaysHtml}
            </div>
          </div>
        </div>

        <!-- 중앙 콘텐츠 슬롯 -->
        <div id="basecampCenterContentSlot" style="flex:1 1 0% !important; width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:0 !important; position:relative; padding:2px 0; overflow:hidden;">
          ${centerContentHtml}
        </div>
      </div>

      <!-- 🏛️ 듀얼 하단독 -->
      ${bottomDualDockHtml}
    `;

    if (typeof window.bindHistoryDualDockGestures === 'function') {
      window.bindHistoryDualDockGestures();
    }

    // 3D 엽서 제스처 바인딩 (터치 캔슬 방어 & 달력 월간 연동 넘김)
    var cardTarget = document.getElementById('swipePostcardTarget');
    if (cardTarget && hasRecord && window.activeHistorySubFilter !== 'visited') {
      cardTarget.style.touchAction = 'none';
      var startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false, isHorizontalSwipe = false;

      cardTarget.onpointerdown = function(e) {
        isDragging = true;
        isHorizontalSwipe = false;
        startX = e.clientX;
        startY = e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        cardTarget.style.transition = 'none';
        try { cardTarget.setPointerCapture(e.pointerId); } catch (err) {}
      };

      cardTarget.onpointermove = function(e) {
        if (!isDragging) return;
        currentX = e.clientX;
        currentY = e.clientY;
        var diffX = currentX - startX;
        var diffY = Math.abs(currentY - startY);
        var absX = Math.abs(diffX);

        if (absX > 7 && absX > diffY) {
          isHorizontalSwipe = true;
        }

        if (isHorizontalSwipe) {
          var baseRot = window.isPostcardFlipped ? 180 : 0;
          cardTarget.style.transform = 'translate3d(' + (diffX * 0.55) + 'px, 0, 0) rotateY(' + baseRot + 'deg)';
        }
      };

      cardTarget.onpointerup = function(e) {
        if (!isDragging) return;
        isDragging = false;
        try { cardTarget.releasePointerCapture(e.pointerId); } catch (err) {}
        cardTarget.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
        var diffX = currentX - startX;
        var absX = Math.abs(diffX);

        if (!isHorizontalSwipe || absX < 30) {
          // 탭 또는 단순 클릭: 엽서 앞뒤 회전
          window.isPostcardFlipped = !window.isPostcardFlipped;
          cardTarget.classList.toggle('flipped', window.isPostcardFlipped);
          cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
          window.triggerSoftAmbientFX(cardTarget);
          triggerHaptic(8);
        } else {
          // 수평 스와이프: 카드 넘기기 및 달(Month) 자동 전환
          var total = window.interactiveHistory.length;
          if (total > 1) {
            if (diffX > -30) {
              // 왼쪽으로 밀기 -> 다음 카드 
              window.currentCardIndex = (window.currentCardIndex + 1) % total;
            } else if (diffX < 30) {
              // 오른쪽으로 밀기 -> 이전 카드 
              window.currentCardIndex = (window.currentCardIndex - 1 + total) % total;
            }
            var nextRecord = window.interactiveHistory[window.currentCardIndex];
            if (nextRecord) {
              window.calViewYear = Number(nextRecord.year);
              window.calViewMonth = Number(nextRecord.month);
              window.activeSelectedDateKey = nextRecord.date;
            }
            window.isPostcardFlipped = false;
            window.renderHistoryStage();
            triggerHaptic(12);
          } else {
            cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
          }
        }
      };

      cardTarget.onpointercancel = function() {
        isDragging = false;
        isHorizontalSwipe = false;
        if (cardTarget) {
          cardTarget.style.transition = 'transform 0.35s ease';
          cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
        }
      };
    }
  };
  

  window.handleHistoryCalendarClick = function(day, month, year) {
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;

    var foundIdx = (window.interactiveHistory || []).findIndex(function(h) {
      if (Number(h.year) === Number(year) && Number(h.month) === Number(month) && Number(h.day) === Number(day)) return true;
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : '';
      return hDate === dateKey;
    });

    window.currentCardIndex = foundIdx !== -1 ? foundIdx : -1;
    window.activeHistorySubFilter = 'all';
    window.renderHistoryStage();
    triggerHaptic(10);
  };

  // 🚀 [낭만보관함 모달 오픈 / 클로즈]
  window.openHistoryModal = function() {
    var planModal = document.getElementById('romanticPlanModal');
    if (planModal) {
      planModal.style.setProperty('display', 'none', 'important');
    }

    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'romanticHistoryModal';
      modal.style.cssText = 'display:none; position:fixed; inset:0; background:#000000; z-index:99999; justify-content:center; align-items:stretch; transform:translateZ(0); -webkit-transform:translateZ(0); contain:strict; overscroll-behavior:contain;';
      modal.innerHTML = '<div class="romantic-history-content" style="width:100%; max-width:480px; margin:0 auto; height:100dvh; max-height:100dvh; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
    }

    modal.style.setProperty('display', 'flex', 'important');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    window.renderHistoryStage();
    triggerHaptic(10);
  };

  window.closeHistoryModal = function() {
    var modal = document.getElementById('romanticHistoryModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    triggerHaptic(10);
  };

  // 하위 호환 매핑
  window.openMyInfoModal = function(tab) {
    if (tab === 'plan') {
      if (typeof window.openPlanModal === 'function') window.openPlanModal('calendar');
    } else {
      window.openHistoryModal();
    }
  };
  window.closeMyInfoModal = function() {
    window.closeHistoryModal();
    if (typeof window.closePlanModal === 'function') window.closePlanModal();
  };
})();