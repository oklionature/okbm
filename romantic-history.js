
/**
 * 🏕️ 낭만루트 낭만보관함(History) 전담 코어 엔진 (romantic-history.js)
 * - 스마트폰 대용량 IndexedDB(okbm_vault_db) 사진 영구 저장 & 텍스트 분리 하이브리드 캐시 엔진
 * - 3D 엽서 ↔ 피드 목록 ↔ 피드 상세 ↔ 낭만 일지 100% 실시간 사진 & 글 동기화
 * - 야영 캘린더 (연/월 이동, 보관함 완료일 ★ / 계획일 ⚑ 완벽 분리 표시)
 * - 박지명 / 날짜 / 고도 / 일지 본문 / 사진 10장 전방위 수정 지원
 * - [5대 하단독 완성 체계]: 낭만기록 · 피드 · 스튜디오 · 클리어맵 · 마이리포트
 * - 피드 카드 상단 [···] 액션바 (1초 일지수정, 스튜디오 인출, 공유, 삭제) 탑재
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

  // 💾 [스마트폰 내장 대용량 영구 저장소(IndexedDB) & 텍스트/사진 분리형 하이브리드 캐시 엔진]
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
    if (window.__memoryStore && window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
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

    if (key === 'okbm_phone_photos_map' || key === 'okbm_trip_photos_map') {
      return;
    }

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

 // ⚠️ [중복 등록 차단 안내 팝업창 엔진]
  window.showDuplicateRecordAlertModal = function(spotName, dateStr, weightStr) {
    var old = document.getElementById('duplicateRecordAlertModal');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'duplicateRecordAlertModal';
    el.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000030; display:flex; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';
    el.innerHTML = `
      <div style="width:100%; max-width:295px; background:#0e121a; border:1.5px solid #f59e0b; border-radius:18px; padding:22px 18px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; box-shadow:0 20px 50px rgba(0,0,0,0.95); box-sizing:border-box;">
        <div style="font-size:2.4rem; line-height:1;">⚠️</div>
        <div style="font-size:1.02rem; font-weight:900; color:#ffffff; margin-top:2px;">이미 등록된 기록입니다</div>
        <div style="font-size:0.80rem; font-weight:800; color:#fde047; margin-top:2px;">[${dateStr}] ${escapeHtml(spotName)}</div>
        <div style="font-size:0.72rem; color:#94a3b8; line-height:1.45; margin-top:2px;">
          동일한 날짜에 같은 장비(${weightStr ? weightStr + 'kg' : ''})로<br>
          이미 보관함에 저장된 기록이 있어 중복 등록되지 않습니다.
        </div>
        <button type="button" onclick="document.getElementById('duplicateRecordAlertModal').remove(); triggerHaptic(10);" style="width:100%; height:38px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; border-radius:10px; color:#fff; font-size:0.82rem; font-weight:900; cursor:pointer; margin-top:6px; box-shadow:0 4px 12px rgba(245,158,11,0.35);">
          확인
        </button>
      </div>
    `;
    document.body.appendChild(el);
  };

  // 💾 [피드 목록 & 보관함 완벽 동기화 단일 저장 엔진]
  // 💾 [피드 목록 & 보관함 완벽 동기화 단일 저장 엔진]
  window.savePackingHistoryRecord = function(record) {
    if (!record) return null;

    var nowTime = Date.now();
    if (window.__lastPackingSaveTime && (nowTime - window.__lastPackingSaveTime < 500)) {
      return null;
    }
    window.__lastPackingSaveTime = nowTime;

    var normalized = window.normalizeHistoryRecord(record, 0);
    var normDate = String(normalized.date || '').replace(/[-/]/g, '.').trim();
    var normSpot = String(normalized.spot || '').trim();

    var list = window.safeGetStorage('okbm_packing_history', []) || [];

    // 🛡️ ID 매칭 또는 (동일 날짜 + 동일 장소) 기존 기록 탐색
    var existIdx = list.findIndex(function(it) { 
      return String(it.id).trim() === String(normalized.id).trim(); 
    });

    if (existIdx === -1 && normDate && normSpot) {
      existIdx = list.findIndex(function(it) {
        var itDate = String(it.date || '').replace(/[-/]/g, '.').trim();
        var itSpot = String(it.spot || '').trim();
        return itDate === normDate && itSpot === normSpot;
      });
    }

    // 🛡️ 같은 날, 같은 장소의 기록이 이미 있으면 새 카드를 복제하지 않고 기존 카드를 업데이트
    if (existIdx !== -1) {
      normalized.id = list[existIdx].id; // 기존 고유 ID 보존 (새 카드로 증식 방지)
      list[existIdx] = Object.assign({}, list[existIdx], normalized);
    } else {
      // 🚀 [등록순서 변경]: 최근 등록은 제일 뒤로 등록 (push)
      list.push(normalized);
    }

    var rawPhotos = [];
    if (Array.isArray(record.photos) && record.photos.length > 0) rawPhotos = record.photos;
    else if (record.photo) rawPhotos = [record.photo];
    else if (record.fieldPhoto) rawPhotos = [record.fieldPhoto];
    else if (normalized.photos && normalized.photos.length > 0) rawPhotos = normalized.photos;

    if (rawPhotos.length > 0) {
      normalized.photos = rawPhotos;
      normalized.photo = rawPhotos[0];
      normalized.fieldPhoto = rawPhotos[0];

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
        savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
      }
      savedPhotosMap[String(normalized.id)] = rawPhotos;
      savedPhotosMap[String(normalized.date)] = rawPhotos;
      savedPhotosMap[String(normalized.date).replace(/[-/]/g, '.')] = rawPhotos;

      window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
      window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);
    }

    window.interactiveHistory = list.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', list);

   // 🚀 [클라우드 일원화]: 영구 URL 보존 및 구글 시트/R2 피드 100% 직통 동기화
    var hasBase64Photo = rawPhotos.some(function(p) { return typeof p === 'string' && p.startsWith('data:'); });
    if (hasBase64Photo && typeof window.uploadSinglePhotoToDrive === 'function') {
      (async function elevatePhotosToCloud() {
        var finalCloudUrls = [];
        for (var i = 0; i < rawPhotos.length; i++) {
          var pItem = rawPhotos[i];
          if (typeof pItem === 'string' && pItem.startsWith('data:')) {
            var cUrl = await window.uploadSinglePhotoToDrive(pItem, 'pack_' + normalized.id + '_' + i + '.jpg');
            finalCloudUrls.push(cUrl || pItem);
            await new Promise(function(res) { setTimeout(res, 200); });
          } else {
            finalCloudUrls.push(pItem);
          }
        }

        normalized.photos = finalCloudUrls;
        normalized.photo = finalCloudUrls[0] || '';
        normalized.fieldPhoto = finalCloudUrls[0] || '';
        normalized.photo_url = finalCloudUrls[0] || '';

        var pMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
        pMap[String(normalized.id)] = finalCloudUrls;
        pMap[String(normalized.date)] = finalCloudUrls;
        window.__memoryStore['okbm_phone_photos_map'] = pMap;
        window.safeSetStorage('okbm_phone_photos_map', pMap);
        window.safeSetStorage('okbm_packing_history', window.interactiveHistory);

        if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
        if (normalized.isPublished === true && typeof window.shareFeedToCommunity === 'function') {
          window.shareFeedToCommunity(normalized);
        }
      })();
    } else {
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
      if (normalized.isPublished === true && typeof window.shareFeedToCommunity === 'function') {
        window.shareFeedToCommunity(normalized);
      }
    }
    return normalized;
  };
  // 🔄 [앱 구동 즉시 폰의 IndexedDB 사진 맵 및 히스토리 메모리로 사전 복원 & 사진 유실 방어]
  (async function preloadIndexedDbToMemory() {
    try {
      var idbPhotosMap = await window.loadFromIndexedDB('okbm_phone_photos_map');
      if (idbPhotosMap && typeof idbPhotosMap === 'object') {
        window.__memoryStore['okbm_phone_photos_map'] = idbPhotosMap;
      }

      var rawList = await window.loadFromIndexedDB('okbm_packing_history');
      if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
        var localRaw = localStorage.getItem('okbm_packing_history');
        if (localRaw) {
          try { rawList = JSON.parse(localRaw); } catch(e) {}
        }
      }

      if (rawList && Array.isArray(rawList) && rawList.length > 0) {
        window.interactiveHistory = rawList.map(function(r, i) {
          var norm = window.normalizeHistoryRecord(r, i);
          if ((!norm.photos || norm.photos.length === 0) && idbPhotosMap) {
            var found = idbPhotosMap[String(norm.id)] || idbPhotosMap[String(norm.date)] || idbPhotosMap[String(norm.date).replace(/[-/]/g, '.')];
            if (found && found.length > 0) {
              norm.photos = found;
              norm.photo = found[0];
              norm.fieldPhoto = found[0];
            }
          }
          return norm;
        });
        window.packingHistoryList = window.interactiveHistory;
        window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
        if (typeof window.renderHistoryStage === 'function') {
          window.renderHistoryStage();
        }
      }
    } catch (e) {
      console.warn('[RomanticHistory] 사진 사전 복원 경고:', e);
    }
  })();

// 📷 [폰 내장 DB(IndexedDB)에서 사진을 100% 안전하게 꺼내오는 탐색기 & 1200px 화질 승격]
  function getRecordPhotos(record) {
    if (!record) return [];
    var rId = String(record.id || '').trim();
    var cleanPureId = rId.split(';')[0].trim();
    var rDate = String(record.date || '').trim();
    var altDate = rDate.replace(/[-/]/g, '.');
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
      savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
    }

    var localPhotos = (cleanPureId && savedPhotosMap[cleanPureId]) || (rId && savedPhotosMap[rId]) || (rDate && savedPhotosMap[rDate]) || (altDate && savedPhotosMap[altDate]);
    var rawList = [];
    if (Array.isArray(localPhotos) && localPhotos.length > 0) rawList = localPhotos.filter(Boolean);
    else if (typeof localPhotos === 'string' && localPhotos.trim().length > 10) rawList = [localPhotos.trim()];
    else if (Array.isArray(record.photos) && record.photos.length > 0) rawList = record.photos.filter(Boolean);
    else if (record.photo_url && String(record.photo_url).trim().length > 10) rawList = [String(record.photo_url).trim()];
    else if (record.fieldPhoto && String(record.fieldPhoto).trim().length > 10) rawList = [String(record.fieldPhoto).trim()];
    else if (record.photo && String(record.photo).trim().length > 10) rawList = [String(record.photo).trim()];

    // 🌟 [전 브라우저 엑박 원천 차단 & 1200px 고화질 링크 정규화]
    return rawList.map(function(url) {
      if (typeof url !== 'string') return '';
      var clean = url.replace(/^["']|["']$/g, '').trim();
      if (clean.includes('drive.google.com')) {
        var idMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          return 'https://lh3.googleusercontent.com/d/' + idMatch[1] + '=w1200';
        }
      }
      return clean;
    }).filter(function(u) { return u.length > 10; });
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

  // 🔄 [히스토리 레코드 정규화 엔진 - 장비명 강제 제목 치환 원천 차단 & 힐링 스팟 표준화]
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

    var recordId = (r && r.id) ? String(r.id) : ('pack_' + (r && r.date ? String(r.date).replace(/\D/g, '') : Date.now()) + '_' + idx);
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
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var userMemo = (r && r.memo !== undefined && r.memo !== null) ? String(r.memo).trim() : '';

    // 🌿 특정 종목 및 장비명 제목 치환 배제 ➔ 순수 스팟명 또는 '나의 힐링 스팟'
    var spotTitle = (r && (r.spot || r.spotName)) ? String(r.spot || r.spotName).trim() : '나의 힐링 스팟';

    // 👤 카카오 로그인 프로필 닉네임 1순위 바인딩
    var profile = safeGetJSON('user_profile', null);
    var currentAuthor = (r && r.author) ? r.author : ((profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터'));

    return {
      id: recordId,
      author: currentAuthor,
      templateId: (r && r.templateId !== undefined && r.templateId !== null) ? parseInt(r.templateId, 10) : savedTmplId,
      date: (r && r.date) || (y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0')),
      year: y,
      month: m,
      day: d,
      spot: spotTitle,
      elevation: (r && r.elevation) ? r.elevation : '832m',
      weightKg: (r && r.weightKg !== undefined && r.weightKg !== '0.00') ? r.weightKg : (totalGrams > 0 ? (totalGrams / 1000).toFixed(2) : '0.00'),
      weightGrams: (r && r.weightGrams) ? r.weightGrams : totalGrams,
      itemCount: cleanItems.length,
      hardText: (r && r.hardText) ? r.hardText : '',
      goodText: (r && r.goodText) ? r.goodText : '',
      memoryText: (r && r.memoryText) ? r.memoryText : '',
      memo: userMemo,
      oneLineMemo: (r && r.oneLineMemo) ? r.oneLineMemo : '',
      isPublished: Boolean(r && r.isPublished === true),
      instagram: (r && r.instagram) ? r.instagram : '',
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
              ${items.slice(0, 6).map(function(it) {
                return '<div style="display:flex; justify-content:space-between;"><span>• ' + escapeHtml(it.name) + '</span><span>' + ((it.weight||0)/1000).toFixed(2) + 'kg</span></div>';
              }).join('')}
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
          <div style="font-size:0.60rem; color:#94a3b8; line-height:1.4;">상단 [···] 메뉴에서<br>현장 사진을 추가해보세요!</div>
        </div>`;

    return `
      <div id="swipePostcardTarget" class="postcard-3d-wrapper ${isFlipped ? 'flipped' : ''}" style="width:100%; max-width:280px; aspect-ratio:3/4; position:relative; cursor:pointer; touch-action:pan-y; overscroll-behavior:contain; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; padding:2px; border-radius:15px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.85); box-sizing:border-box;">
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
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
              <button data-record-id="${escapeHtml(String(cur.id))}" onclick="event.stopPropagation(); var self=this; window.openRichAfterTripModal(window.interactiveHistory.find(function(r){return String(r.id)===String(self.dataset.recordId);}));" style="background:linear-gradient(135deg, #0d9488, #059669); border:1px solid #14b8a6; color:#fff; border-radius:6px; font-size:0.75rem; font-weight:900; padding:4px 10px; cursor:pointer; box-shadow:0 2px 8px rgba(13,148,136,0.4); touch-action:manipulation; min-height:36px;">
                ✍️ 일지 & 현장사진 남기기
              </button>
              <button data-record-id="${escapeHtml(String(cur.id))}" onclick="window.openTripActionMenu(this.dataset.recordId, event)" style="background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.25); color:#cbd5e1; border-radius:6px; font-size:0.75rem; font-weight:900; padding:4px 8px; cursor:pointer; touch-action:manipulation; min-height:36px; min-width:36px;">···</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // 🌐 [핵심 누락 해결] templates.js 사진 업로드 연동을 위한 전역 스코프 노출
  if (typeof uploadSinglePhotoToDrive === 'function') {
    window.uploadSinglePhotoToDrive = uploadSinglePhotoToDrive;
  }

  // 📱 [지난 피드 목록 모달 & 다중 체크 일괄 삭제 통합 엔진]
  window.__isPastTripsSelectMode = false;
  window.__selectedPastTripIds = new Set();

  window.togglePastTripsSelectMode = function() {
    window.__isPastTripsSelectMode = !window.__isPastTripsSelectMode;
    window.__selectedPastTripIds.clear();
    triggerHaptic(12);
    window.openPastTripsListModal();
  };

  window.togglePastTripItemSelection = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var sId = String(recordId).trim();
    if (window.__selectedPastTripIds.has(sId)) {
      window.__selectedPastTripIds.delete(sId);
      triggerHaptic(8);
    } else {
      window.__selectedPastTripIds.add(sId);
      triggerHaptic(12);
    }
    window.updatePastTripsSelectionUI();
  };

  window.toggleAllPastTripsSelection = function() {
    var logs = (window.interactiveHistory || []).filter(Boolean);
    if (window.__selectedPastTripIds.size === logs.length) {
      window.__selectedPastTripIds.clear();
      triggerHaptic(8);
    } else {
      logs.forEach(function(r) {
        if (r && r.id) window.__selectedPastTripIds.add(String(r.id).trim());
      });
      triggerHaptic(12);
    }
    window.updatePastTripsSelectionUI();
  };

  window.updatePastTripsSelectionUI = function() {
    var logs = (window.interactiveHistory || []).filter(Boolean);
    var selectedCount = window.__selectedPastTripIds.size;

    var headerCountEl = document.getElementById('pastTripsSelectedCountText');
    if (headerCountEl) {
      headerCountEl.innerText = selectedCount > 0 ? (selectedCount + '개 선택됨') : '선택 없음';
    }

    var selectAllBtn = document.getElementById('btnPastTripsSelectAll');
    if (selectAllBtn) {
      selectAllBtn.innerText = (selectedCount === logs.length && logs.length > 0) ? '전체해제' : '전체선택';
    }

    var deleteActionBar = document.getElementById('pastTripsBatchDeleteBar');
    var deleteBtnText = document.getElementById('pastTripsBatchDeleteCountText');
    if (deleteActionBar && deleteBtnText) {
      if (selectedCount > 0) {
        deleteActionBar.style.display = 'flex';
        deleteBtnText.innerText = '선택한 ' + selectedCount + '개 기록 영구 삭제 🗑️';
      } else {
        deleteActionBar.style.display = 'none';
      }
    }

    logs.forEach(function(r) {
      var sId = String(r.id).trim();
      var cardEl = document.getElementById('pastTripRowCard_' + sId);
      var checkboxEl = document.getElementById('pastTripCheckbox_' + sId);
      var isChecked = window.__selectedPastTripIds.has(sId);

      if (cardEl) {
        cardEl.style.borderColor = isChecked ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
        cardEl.style.background = isChecked ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)';
      }
      if (checkboxEl) {
        checkboxEl.style.background = isChecked ? '#38bdf8' : 'transparent';
        checkboxEl.style.borderColor = isChecked ? '#38bdf8' : 'rgba(255, 255, 255, 0.35)';
        checkboxEl.innerHTML = isChecked ? '<span style="color:#000000; font-size:12px; font-weight:900; line-height:1;">✓</span>' : '';
      }
    });
  };

 window.executeBatchDeletePastTrips = function() {
    var selectedCount = window.__selectedPastTripIds.size;
    if (selectedCount === 0) return;

    triggerHaptic(20);
    var confirmMsg = '선택한 ' + selectedCount + '개의 출정 기록을 삭제하시겠습니까?\n' +
      '• 모든 기기에서 즉시 삭제되며 부활하지 않습니다.\n' +
      '• 공용 피드 및 구글 클라우드에서 안전하게 정리됩니다.';
    
    if (!confirm(confirmMsg)) return;

    var rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
      savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
    }

    var idsToDelete = new Set(window.__selectedPastTripIds);
    var targetRecordsToDelete = [];
    var tombstones = [];

    var remainingList = rawList.filter(function(r) {
      var rId = String(r.id).trim();
      if (idsToDelete.has(rId)) {
        targetRecordsToDelete.push(r);
        tombstones.push({
          id: rId,
          date: r.date || '',
          isDeleted: true,
          deletedAt: Date.now()
        });
        return false;
      }
      return true;
    });

    targetRecordsToDelete.forEach(function(delItem) {
      var dId = String(delItem.id || '').trim();
      var dDate = String(delItem.date || '').trim();
      var altDate = dDate.replace(/[-/]/g, '.');

      if (dId && savedPhotosMap[dId]) delete savedPhotosMap[dId];
      if (dDate && savedPhotosMap[dDate]) delete savedPhotosMap[dDate];
      if (altDate && savedPhotosMap[altDate]) delete savedPhotosMap[altDate];

      if (typeof window.deleteFeedFromCommunity === 'function') {
        window.deleteFeedFromCommunity(dId, dDate);
      }
    });

    window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

   // 🪦 툼스톤을 포함한 전체 큐를 클라우드 전송용으로 등록
    window.__tombstoneHistoryQueue = remainingList.concat(tombstones);

    window.interactiveHistory = remainingList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', remainingList);

    // 홈 피드 캐시에서도 즉시 말소
    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) { return !idsToDelete.has(String(f.id).trim()); });
    }
    if (Array.isArray(window.heroTopRecords)) {
      window.heroTopRecords = window.heroTopRecords.filter(function(f) { return !idsToDelete.has(String(f.id).trim()); });
      window.currentHeroCardIndex = 0;
      if (typeof window.renderCurrentHeroCard === 'function') {
        window.renderCurrentHeroCard();
      }
    }

    // 🚀 툼스톤을 클라우드(R2/드라이브)로 전송하여 타 기기 부활을 영구 차단
    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(true);
    }
    setTimeout(function() { window.__tombstoneHistoryQueue = null; }, 3000);

    window.__selectedPastTripIds.clear();
    window.__isPastTripsSelectMode = false;

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }

    window.openPastTripsListModal();
    triggerHaptic(15);
    if (typeof showToast === 'function') {
      showToast('🗑️ 총 ' + selectedCount + '개의 기록이 삭제되었습니다.', 'info', 2500);
    }
  };

  window.closePastTripsListModal = function() {
    window.__isPastTripsSelectMode = false;
    window.__selectedPastTripIds.clear();
    if (typeof window.unregisterModalClose === 'function') {
      window.unregisterModalClose('pastTripsListModal');
    }
    var modalEl = document.getElementById('pastTripsListModal');
    if (modalEl) modalEl.remove();
    triggerHaptic(10);
  };

  window.openPastTripsListModal = function() {
    try {
      var old = document.getElementById('pastTripsListModal');
      if (old) old.remove();

      var singleModal = document.getElementById('singleTripFeedModal');
      if (singleModal) singleModal.remove();

      var clearModal = document.getElementById('clearMapModal');
      if (clearModal) clearModal.remove();

      var reportModal = document.getElementById('myReportModal');
      if (reportModal) reportModal.remove();

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
        savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
      }

      var rawLogs = (window.interactiveHistory && Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0)
        ? window.interactiveHistory
        : (window.safeGetStorage('okbm_packing_history', []) || []);

      if (Array.isArray(rawLogs) && rawLogs.length > 0) {
        window.interactiveHistory = rawLogs.filter(Boolean).map(function(r, i) {
          var norm = window.normalizeHistoryRecord(r, i);
          if (!norm.photos || norm.photos.length === 0) {
            var matched = savedPhotosMap[String(norm.id)] || savedPhotosMap[String(norm.date)] || savedPhotosMap[String(norm.date || '').replace(/[-/]/g, '.')];
            if (Array.isArray(matched) && matched.length > 0) {
              norm.photos = matched;
              norm.photo = matched[0];
              norm.fieldPhoto = matched[0];
            }
          }
          return norm;
        });
      }
      var logs = (window.interactiveHistory || []).filter(Boolean);
      var isSelectMode = Boolean(window.__isPastTripsSelectMode);

      var modalEl = document.createElement('div');
      modalEl.id = 'pastTripsListModal';
      modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000000; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

      var cardsHtml = '';
      if (logs.length === 0) {
        cardsHtml = '<div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem;">기록된 출정이 없습니다.<br>배낭을 패킹하고 보관함에 저장해보세요!</div>';
      } else {
        cardsHtml = logs.map(function(r) {
          if (!r) return '';
          var tId = r.templateId || 1;
          var tName = (typeof TEMPLATE_NAMES !== 'undefined' && TEMPLATE_NAMES[tId]) ? TEMPLATE_NAMES[tId] : ('테마 ' + tId);
          var photos = getRecordPhotos(r);
          var thumbPhoto = (photos && photos.length > 0 && photos[0]) ? photos[0] : 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
          var safeId = escapeHtml(String(r.id || ''));
          var spotTitle = escapeHtml(r.spot || '방문 스팟');
          var elevText = escapeHtml(r.elevation || '');
          var dateText = escapeHtml(r.date || '');
          var weightStr = escapeHtml(String(r.weightKg || '0.00'));
          var isChecked = window.__selectedPastTripIds.has(String(r.id).trim());

         return '<div id="pastTripRowCard_' + safeId + '" data-record-id="' + safeId + '" onclick="window.__isPastTripsSelectMode ? window.togglePastTripItemSelection(this.dataset.recordId, event) : window.openSingleTripDualFeedModal(this.dataset.recordId)" style="background:' + (isChecked ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)') + '; border:1px solid ' + (isChecked ? '#38bdf8' : 'rgba(255,255,255,0.12)') + '; border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; flex-shrink:0; user-select:none;">' +
            '<div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">' +
              (isSelectMode ? (
                '<div id="pastTripCheckbox_' + safeId + '" style="width:22px; height:22px; border-radius:6px; border:1.8px solid ' + (isChecked ? '#38bdf8' : 'rgba(255,255,255,0.35)') + '; background:' + (isChecked ? '#38bdf8' : 'transparent') + '; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s ease;">' +
                  (isChecked ? '<span style="color:#000000; font-size:12px; font-weight:900; line-height:1;">✓</span>' : '') +
                '</div>'
              ) : '') +
              '<div style="width:44px; height:44px; border-radius:8px; overflow:hidden; background:#1e293b; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">' +
                '<img src="' + thumbPhoto + '" style="width:100%; height:100%; object-fit:cover;" />' +
              '</div>' +
              '<div style="min-width:0; flex:1;">' +
                '<div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                  HISTORY_VEC_ICONS.pin + ' <span>' + spotTitle + '</span>' +
                  '<span style="font-size:0.55rem; color:#fde047; font-weight:800; background:rgba(253,224,71,0.15); border:1px solid rgba(253,224,71,0.3); padding:1px 5px; border-radius:4px; flex-shrink:0;">' + escapeHtml(tName) + '</span>' +
                '</div>' +
                '<div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">' + dateText + (elevText ? ' · ' + elevText : '') + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="text-align:right; flex-shrink:0; margin-left:8px;">' +
              '<span style="font-size:0.86rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightStr + 'kg</span>' +
              (!isSelectMode ? '<span style="font-size:0.60rem; color:#38bdf8; font-weight:800; display:block; margin-top:2px;">피드 보기 ➔</span>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      }

      var headerRightHtml = isSelectMode ? (
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span id="pastTripsSelectedCountText" style="font-size:0.65rem; color:#38bdf8; font-weight:800;">선택 없음</span>' +
          '<button type="button" id="btnPastTripsSelectAll" onclick="window.toggleAllPastTripsSelection()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:800; cursor:pointer;">전체선택</button>' +
          '<button type="button" onclick="window.togglePastTripsSelectMode()" style="background:#38bdf8; border:none; color:#000; padding:4px 9px; border-radius:6px; font-size:0.68rem; font-weight:900; cursor:pointer;">완료</button>' +
        '</div>'
      ) : (
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span style="font-size:0.65rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3);">총 ' + logs.length + '개</span>' +
          (logs.length > 0 ? (
            '<button type="button" onclick="window.togglePastTripsSelectMode()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e2e8f0; padding:4px 9px; border-radius:6px; font-size:0.70rem; font-weight:800; cursor:pointer;">선택</button>'
          ) : '') +
        '</div>'
      );

      modalEl.innerHTML = `
        <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button onclick="window.closePastTripsListModal();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.95rem; font-weight:900; color:#fff;">📱 지난 피드 목록</span>
          </div>
          ${headerRightHtml}
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(85px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
          ${cardsHtml}
        </div>

        <!-- 🗑️ 다중 선택 삭제 전용 플로팅 액션 바 -->
        <div id="pastTripsBatchDeleteBar" style="display:none; position:fixed; bottom:calc(64px + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%); width:calc(100% - 28px); max-width:420px; z-index:1000005; box-sizing:border-box;">
          <button type="button" onclick="window.executeBatchDeletePastTrips()" style="width:100%; height:46px; background:linear-gradient(135deg, #e11d48, #be123c); border:1.5px solid #f43f5e; border-radius:12px; color:#ffffff; font-size:0.86rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 8px 24px rgba(225,29,72,0.65);">
            <svg viewBox="0 0 24 24" style="width:17px; height:17px; stroke:currentColor; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span id="pastTripsBatchDeleteCountText">선택한 기록 영구 삭제 🗑️</span>
          </button>
        </div>

  <div id="pastTripsDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000002 !important; user-select:none !important; box-sizing:border-box;">
          <div id="pastTripsMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; z-index:105; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
            <a href="index.html" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span>낭만루터</span>
            </a>
            <a href="map.html" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
              <span>전국지도</span>
            </a>
            <button type="button" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M9 16l2 2 4-4"/>
              </svg>
              <span>낭만계획</span>
            </button>
            <button type="button" class="dock-item active" onclick="window.closePastTripsListModal(); window.renderHistoryStage(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff !important; font-size:0.67rem; font-weight:900; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
                <path d="M21 8v13H3V8"/>
                <path d="M1 3h22v5H1z"/>
                <path d="M10 12h4"/>
              </svg>
              <span>낭만보관함</span>
            </button>
            <button type="button" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>내정보</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);

      // 🔔 안드로이드 물리 백버튼 & ESC 탈출 스택 등록
      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('pastTripsListModal', window.closePastTripsListModal);
      }

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

      if (isSelectMode) {
        window.updatePastTripsSelectionUI();
      }

      triggerHaptic(12);
    } catch (err) {
      console.error('[OpenPastTripsModal Error]', err);
      if (typeof showToast === 'function') showToast('피드 목록을 여는 중 오류가 발생했습니다: ' + err.message, 'warn');
    }
  };

// [3번 스튜디오: 20종 감성 템플릿 인출 스튜디오 연결]
  window.openHistoryStudioModal = function(targetRecord) {
    var cur = targetRecord || (window.interactiveHistory && window.interactiveHistory[window.currentCardIndex]) || (window.interactiveHistory && window.interactiveHistory[0]);
    if (!cur) {
      if (typeof showToast === 'function') showToast('스튜디오로 인출할 기록이 없습니다.', 'warn');
      return;
    }
    triggerHaptic(12);

    ['pastTripsListModal', 'singleTripFeedModal', 'clearMapModal', 'myReportModal'].forEach(function(mId) {
      var el = document.getElementById(mId);
      if (el) el.remove();
    });

    if (typeof window.closeHistoryModal === 'function') {
      window.closeHistoryModal();
    }

    if (typeof openPackShareModal === 'function') {
      openPackShareModal(cur, cur.items || [], false);
    } else {
      if (typeof showToast === 'function') showToast('템플릿 스튜디오 엔진을 불러오는 중입니다.', 'info');
    }
  };

  // 🗺️ [4번 클리어맵: 블랙야크 완등 지도 스타일 - 전국 8도 도장깨기 컬러링 지도 뷰]
  window.openClearMapModal = function() {
    try {
      var old = document.getElementById('clearMapModal');
      if (old) old.remove();

      var planModal = document.getElementById('romanticPlanModal');
      if (planModal) planModal.style.setProperty('display', 'none', 'important');

      var pastList = document.getElementById('pastTripsListModal');
      if (pastList) pastList.remove();

      var singleModal = document.getElementById('singleTripFeedModal');
      if (singleModal) singleModal.remove();

      var reportModal = document.getElementById('myReportModal');
      if (reportModal) reportModal.remove();

      var visitedIds = new Set(safeGetJSON('okbm_visited', []));
      var spotList = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) ? registeredSpots : safeGetJSON('okbm_spots_cache', []);

      var clearedSpots = Array.from(visitedIds).map(function(sId) {
        var found = spotList.find(function(s) { return String(s.id).trim() === String(sId).trim(); });
        var cleanRegion = found ? String(found.cityName || found.region || '기타').trim() : '기타';
        return {
          id: sId,
          name: found ? String(found.fullName || found.name || ('스팟 #' + sId)).trim() : ('스팟 #' + sId),
          region: cleanRegion || '기타',
          elevation: found && found.elevation ? (found.elevation + 'm') : ''
        };
      });

      var regions = ['서울/인천', '경기', '강원', '충청', '전라', '경상', '제주'];
      var regionStats = {};
      regions.forEach(function(reg) { regionStats[reg] = 0; });
      clearedSpots.forEach(function(sp) {
        var reg = String(sp.region || '');
        if (reg.includes('서울') || reg.includes('인천')) regionStats['서울/인천'] = (regionStats['서울/인천'] || 0) + 1;
        else if (reg.includes('경기')) regionStats['경기'] = (regionStats['경기'] || 0) + 1;
        else if (reg.includes('강원')) regionStats['강원'] = (regionStats['강원'] || 0) + 1;
        else if (reg.includes('충')) regionStats['충청'] = (regionStats['충청'] || 0) + 1;
        else if (reg.includes('전')) regionStats['전라'] = (regionStats['전라'] || 0) + 1;
        else if (reg.includes('경')) regionStats['경상'] = (regionStats['경상'] || 0) + 1;
        else if (reg.includes('제주')) regionStats['제주'] = (regionStats['제주'] || 0) + 1;
      });

      var modalEl = document.createElement('div');
      modalEl.id = 'clearMapModal';
      modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000020 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

      modalEl.innerHTML = `
        <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="document.getElementById('clearMapModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.95rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:5px;">
              <svg viewBox="0 0 24 24" style="width:17px; height:17px; fill:none; stroke:#34d399; stroke-width:2.2;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              <span>클리어맵 (완등 도감)</span>
            </span>
          </div>
          <span style="font-size:0.65rem; color:#34d399; font-weight:900; background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.3); padding:2px 8px; border-radius:12px;">정복 ${clearedSpots.length}곳</span>
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;">
          <div style="background:linear-gradient(135deg, rgba(52,211,153,0.15), rgba(6,182,212,0.08)); border:1.5px solid rgba(52,211,153,0.35); border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.75rem; font-weight:900; color:#34d399;">전국 8도 완등 컬러링 현황</span>
              <span style="font-size:0.62rem; color:#94a3b8; font-weight:700;">방문 시 색상이 채워집니다</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:6px;">
              ${regions.map(function(reg) {
                var cnt = regionStats[reg] || 0;
                var isUnlocked = cnt > 0;
                return `
                  <div style="background:${isUnlocked ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isUnlocked ? '#34d399' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:6px 4px; text-align:center;">
                    <div style="font-size:0.65rem; font-weight:800; color:${isUnlocked ? '#6ee7b7' : '#64748b'};">${reg}</div>
                    <div style="font-size:0.82rem; font-weight:900; color:${isUnlocked ? '#ffffff' : '#475569'}; font-family:'Space Grotesk', sans-serif; margin-top:2px;">${cnt}곳</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0 2px;">
              <span style="font-size:0.75rem; font-weight:900; color:#ffffff;">정복된 스팟 도감 (${clearedSpots.length}곳)</span>
              <span style="font-size:0.60rem; color:#94a3b8;">터치 시 전국지도로 바로 이동</span>
            </div>
            ${clearedSpots.length === 0 ? `
              <div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.76rem; line-height:1.5;">
                아직 정복된 스팟이 없습니다.<br>전국지도에서 다녀온 곳에 클리어 깃발을 꽂아보세요!
              </div>
            ` : clearedSpots.map(function(sp) {
              return `
                <div onclick="location.href='map.html?spot=' + encodeURIComponent('${escapeHtml(sp.name)}');" style="background:rgba(255,255,255,0.035); border:1px solid rgba(52,211,153,0.25); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                  <div style="min-width:0; flex:1; padding-right:8px;">
                    <div style="font-size:0.84rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:#34d399; stroke:#34d399; flex-shrink:0;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                      <span>${escapeHtml(sp.name)}</span>
                    </div>
                    <div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">${escapeHtml(sp.region)} ${sp.elevation ? ' · ' + escapeHtml(sp.elevation) : ''}</div>
                  </div>
                  <span style="font-size:0.60rem; color:#34d399; font-weight:800; background:rgba(52,211,153,0.12); padding:3px 7px; border-radius:5px; border:1px solid rgba(52,211,153,0.3); flex-shrink:0;">지도로 보기 ➔</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

  <div id="clearMapDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000025 !important; user-select:none !important; box-sizing:border-box;">
          <div id="clearMapMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; z-index:105; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
            <a href="index.html" class="dock-item" onclick="document.getElementById('clearMapModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
              <span>낭만루터</span>
            </a>
            <a href="map.html" class="dock-item" onclick="document.getElementById('clearMapModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
              <span>전국지도</span>
            </a>
            <button type="button" class="dock-item" onclick="document.getElementById('clearMapModal').remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M9 16l2 2 4-4"/>
              </svg>
              <span>낭만계획</span>
            </button>
            <button type="button" class="dock-item active" onclick="document.getElementById('clearMapModal').remove(); window.renderHistoryStage(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff !important; font-size:0.67rem; font-weight:900; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
                <path d="M21 8v13H3V8"/>
                <path d="M1 3h22v5H1z"/>
                <path d="M10 12h4"/>
              </svg>
              <span>낭만보관함</span>
            </button>
            <button type="button" class="dock-item" onclick="document.getElementById('clearMapModal').remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
              <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>내정보</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modalEl);

      window.__clearMapDockMode = 'tools';
      window.toggleClearMapDockDeck = function(forceMode) {
        if (forceMode) window.__clearMapDockMode = forceMode;
        else window.__clearMapDockMode = (window.__clearMapDockMode === 'tools') ? 'main' : 'tools';
        var sub = document.getElementById('clearMapSubToolsDeck');
        var main = document.getElementById('clearMapMainNavDeck');
        if (!sub || !main) return;
        var isTools = (window.__clearMapDockMode === 'tools');
        sub.style.opacity = isTools ? '1' : '0';
        sub.style.pointerEvents = isTools ? 'auto' : 'none';
        sub.style.zIndex = isTools ? '105' : '100';

        main.style.opacity = isTools ? '0' : '1';
        main.style.pointerEvents = isTools ? 'none' : 'auto';
        main.style.zIndex = isTools ? '100' : '105';
      };

      var cDock = document.getElementById('clearMapDualDockContainer');
      if (cDock) {
        var cStartX = 0, cStartY = 0;
        cDock.addEventListener('touchstart', function(e) {
          if (!e.touches || e.touches.length !== 1) return;
          cStartX = e.touches[0].clientX;
          cStartY = e.touches[0].clientY;
        }, { passive: true });
        cDock.addEventListener('touchmove', function(e) {
          if (!e.touches || e.touches.length !== 1) return;
          var diffX = Math.abs(e.touches[0].clientX - cStartX);
          var diffY = Math.abs(e.touches[0].clientY - cStartY);
          if (diffX > diffY && e.cancelable) e.preventDefault();
        }, { passive: false });
        cDock.addEventListener('touchend', function(e) {
          if (!e.changedTouches || e.changedTouches.length !== 1) return;
          var diffX = e.changedTouches[0].clientX - cStartX;
          var diffY = e.changedTouches[0].clientY - cStartY;
          if (Math.abs(diffX) > 24 && Math.abs(diffX) > Math.abs(diffY)) {
            triggerHaptic(10);
            window.toggleClearMapDockDeck();
          }
        }, { passive: true });
      }
      triggerHaptic(12);
    } catch (err) {
      console.error('[OpenClearMapModal Error]', err);
      if (typeof showToast === 'function') showToast('클리어맵을 여는 중 오류가 발생했습니다: ' + err.message, 'warn');
    }
  };

  // 📈 [5번 마이리포트: 내 아웃도어 라이프 성취와 총결산 리포트]
  window.openMyReportModal = function() {
    try {
      var old = document.getElementById('myReportModal');
      if (old) old.remove();

      var planModal = document.getElementById('romanticPlanModal');
      if (planModal) planModal.style.setProperty('display', 'none', 'important');

      var clearModal = document.getElementById('clearMapModal');
      if (clearModal) clearModal.remove();

      var pastList = document.getElementById('pastTripsListModal');
      if (pastList) pastList.remove();

      var singleModal = document.getElementById('singleTripFeedModal');
      if (singleModal) singleModal.remove();

      var logs = (window.interactiveHistory || []).filter(Boolean);
      var count = logs.length;
      var totalGrams = logs.reduce(function(sum, r) { return sum + (r.weightGrams || Math.round((parseFloat(r.weightKg) || 0) * 1000)); }, 0);
      var avgWeightStr = count > 0 ? (totalGrams / count / 1000).toFixed(2) : '0.00';
      var avgTier = parseFloat(avgWeightStr) <= 6.0 ? 'UL 초경량' : (parseFloat(avgWeightStr) <= 12.0 ? '스탠다드' : '헤비');

      var totalElev = 0, maxElev = 0, maxSpot = '-', minWeight = 999, maxWeight = 0, gearCounts = {};
      logs.forEach(function(r) {
        var el = parseInt(String(r.elevation || '0').replace(/\D/g, ''), 10) || 0;
        totalElev += el;
        if (el > maxElev) { maxElev = el; maxSpot = r.spot || '-'; }
        var w = parseFloat(r.weightKg) || 0;
        if (w > 0 && w < minWeight) minWeight = w;
        if (w > maxWeight) maxWeight = w;
        (r.items || []).forEach(function(it) {
          var gName = (it && (it.name || it.itemName)) ? String(it.name || it.itemName).replace(/\s*\(.*?\)/, '').trim() : '';
          if (gName) gearCounts[gName] = (gearCounts[gName] || 0) + 1;
        });
      });
      if (minWeight === 999) minWeight = 0;

      var topGear = '-', topGearCount = 0;
      Object.keys(gearCounts).forEach(function(k) {
        if (gearCounts[k] > topGearCount) { topGearCount = gearCounts[k]; topGear = k; }
      });

      var everestPercent = Math.min(100, Math.round((totalElev / 8848) * 100));

      var modalEl = document.createElement('div');
      modalEl.id = 'myReportModal';
      modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000020 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

      modalEl.innerHTML = `
        <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="document.getElementById('myReportModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.95rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:5px;">
              <svg viewBox="0 0 24 24" style="width:17px; height:17px; stroke:#38bdf8; fill:none; stroke-width:2.2;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>마이리포트 (총결산)</span>
            </span>
          </div>
          <button type="button" onclick="document.getElementById('myReportModal').remove(); triggerHaptic(10);" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;">
          
          <div style="background:linear-gradient(135deg, rgba(56,189,248,0.14), rgba(16,185,129,0.08)); border:1.5px solid rgba(56,189,248,0.35); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.80rem; font-weight:900; color:#38bdf8;">나의 아웃도어 라이프 마일스톤</span>
              <span style="font-size:0.62rem; color:#fde047; font-weight:800; background:rgba(253,224,71,0.15); padding:2px 6px; border-radius:4px;">${avgTier}</span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px;">
                <div style="font-size:0.62rem; color:#94a3b8; font-weight:700;">텐트 밖에서 보낸 밤</div>
                <div style="font-size:1.35rem; font-weight:900; color:#ffffff; font-family:'Space Grotesk', sans-serif; margin-top:2px;">총 ${count}회</div>
              </div>
              <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px;">
                <div style="font-size:0.62rem; color:#94a3b8; font-weight:700;">평균 패킹 무게</div>
                <div style="font-size:1.35rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif; margin-top:2px;">${avgWeightStr}kg</div>
              </div>
            </div>

            <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.65rem; color:#94a3b8; font-weight:800;">누적 오른 고도 (에베레스트 8,848m 기준)</span>
                <span style="font-size:0.75rem; color:#fde047; font-weight:900; font-family:'Space Grotesk', sans-serif;">+${totalElev.toLocaleString()}m (${everestPercent}%)</span>
              </div>
              <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                <div style="width:${everestPercent}%; height:100%; background:linear-gradient(90deg, #38bdf8, #fde047);"></div>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.65rem; color:#cbd5e1; border-top:1px dashed rgba(255,255,255,0.12); padding-top:8px;">
              <div>미니멀 패킹: <strong style="color:#34d399;">${minWeight > 0 ? minWeight.toFixed(2) + 'kg' : '-'}</strong></div>
              <div>맥스 패킹: <strong style="color:#f43f5e;">${maxWeight > 0 ? maxWeight.toFixed(2) + 'kg' : '-'}</strong></div>
              <div style="grid-column:1 / -1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">최고도 스팟: <strong style="color:#38bdf8;">${escapeHtml(maxSpot)} (${maxElev}m)</strong></div>
              <div style="grid-column:1 / -1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">원픽 기어: <strong style="color:#fde047;">${escapeHtml(topGear)} (${topGearCount}회)</strong></div>
            </div>
          </div>

          <button type="button" onclick="window.openHistoryStudioModal();" style="width:100%; height:46px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:12px; color:#ffffff; font-size:0.86rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(2,132,199,0.35);">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>나의 아웃도어 결산 카드 만들기 (스튜디오 ➔)</span>
          </button>
        </div>

        <!-- 🏛️ [하단독 공식 5대 메인 독 단일화]: 이상한 서브독 영구 제거 -->
        <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000005 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="var m=document.getElementById('myReportModal'); if(m) m.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="var m=document.getElementById('myReportModal'); if(m) m.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="var m=document.getElementById('myReportModal'); if(m) m.remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
            <span>낭만계획</span>
          </button>
          <button type="button" class="dock-item active" onclick="var m=document.getElementById('myReportModal'); if(m) m.remove(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="var m=document.getElementById('myReportModal'); if(m) m.remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>내정보</span>
          </button>
        </div>
      `;

      document.body.appendChild(modalEl);

      window.__myReportDockMode = 'tools';
      window.toggleMyReportDockDeck = function(forceMode) {
        if (forceMode) window.__myReportDockMode = forceMode;
        else window.__myReportDockMode = (window.__myReportDockMode === 'tools') ? 'main' : 'tools';
        var sub = document.getElementById('myReportSubToolsDeck');
        var main = document.getElementById('myReportMainNavDeck');
        if (!sub || !main) return;
        if (window.__myReportDockMode === 'tools') {
          sub.style.transform = 'translateY(0)';
          main.style.transform = 'translateY(100%)';
        } else {
          sub.style.transform = 'translateY(100%)';
          main.style.transform = 'translateY(0)';
        }
      };
      triggerHaptic(12);
    } catch (err) {
      console.error('[OpenMyReportModal Error]', err);
      if (typeof showToast === 'function') showToast('마이리포트를 여는 중 오류가 발생했습니다: ' + err.message, 'warn');
    }
  };

// 🌟 [1. 낭만별(좋아요) 실시간 토글 & 클라우드 백엔드 연동 엔진]
  window.toggleFeedStar = function(cardId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!cardId) return;

    var sId = String(cardId).trim();
    var starsMap = safeGetJSON('okbm_feed_stars_map', {});
    var starCounts = safeGetJSON('okbm_feed_stars_counts', {});

    var isStarred = Boolean(starsMap[sId]);
    var currentCount = Number(starCounts[sId] || 0);

    if (isStarred) {
      delete starsMap[sId];
      currentCount = Math.max(0, currentCount - 1);
      triggerHaptic(8);
    } else {
      starsMap[sId] = true;
      currentCount += 1;
      triggerHaptic(14);
    }

    starCounts[sId] = currentCount;
    localStorage.setItem('okbm_feed_stars_map', JSON.stringify(starsMap));
    localStorage.setItem('okbm_feed_stars_counts', JSON.stringify(starCounts));

    // UI 즉시 업데이트 (0.01초 반응)
    var starIcon = document.getElementById('feedStarIcon_' + sId);
    var starText = document.getElementById('feedStarCountText_' + sId);
    if (starIcon) {
      starIcon.setAttribute('fill', !isStarred ? '#fde047' : 'none');
      starIcon.setAttribute('stroke', !isStarred ? '#fde047' : '#ffffff');
      starIcon.style.filter = !isStarred ? 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' : 'none';
      starIcon.style.transform = 'scale(1.25)';
      setTimeout(function() { if (starIcon) starIcon.style.transform = 'scale(1)'; }, 200);
    }
    if (starText) {
      starText.innerText = currentCount;
    }

    // 백그라운드 클라우드 전파 (GAS / R2)
    (async function syncStarToCloud() {
      try {
        var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'TOGGLE_FEED_STAR',
            feedId: sId,
            isStarred: !isStarred,
            userId: localStorage.getItem('okbm_user_id') || 'guest'
          })
        });
      } catch (err) {
        console.warn('[RomanticHistory] 별점 동기화 예외:', err);
      }
    })();
  };

  // 🔗 [2. 스마트 멀티 공유하기 엔진 (카톡 / 인스타 / Web Share / 클립보드)]
  window.shareCurrentFeed = function(recordId, spotName, memoText) {
    triggerHaptic(10);
    var shareUrl = location.origin + location.pathname + '?feed=' + encodeURIComponent(recordId);
    var shareTitle = '🏕️ 낭만루트 - ' + (spotName || '자연 속 힐링 기록');
    var shareDesc = memoText || '배낭을 메고 자연으로 떠난 낭만 기록을 확인해보세요.';

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareDesc + '\n\n',
        url: shareUrl
      }).catch(function(err) {
        if (err.name !== 'AbortError') {
          copyShareLinkFallback(shareUrl);
        }
      });
    } else {
      copyShareLinkFallback(shareUrl);
    }
  };

  function copyShareLinkFallback(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function() {
        if (typeof showToast === 'function') showToast('🔗 피드 링크가 복사되었습니다! 원하는 곳에 붙여넣기 하세요.', 'success', 2500);
      }).catch(function() {
        prompt('아래 링크를 복사하여 공유하세요:', url);
      });
    } else {
      prompt('아래 링크를 복사하여 공유하세요:', url);
    }
  }

 // ⚙️ [3. 피드 공개 / 비공개 원터치 실시간 토글 & 4중 캐시 동기화 엔진]
  window.toggleFeedPublishStatus = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!recordId) return;
    var sId = String(recordId).trim();

    var rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    if (window.interactiveHistory && window.interactiveHistory.length > 0) {
      rawList = window.interactiveHistory;
    }

    var target = rawList.find(function(r) { 
      return String(r.id).trim() === sId; 
    });

    if (!target) {
      target = rawList.find(function(r, idx) {
        return String(idx) === sId || (r.date && String(r.date).replace(/[-/]/g, '') === sId);
      });
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
      return;
    }

    var nextStatus = !(target.isPublished === true);
    target.isPublished = nextStatus;

    // 1. 화면 및 4중 로컬 캐시 0.01초 즉시 갱신 (Optimistic UI)
    window.interactiveHistory = rawList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    if (window.__memoryStore) {
      window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
    }
    window.safeSetStorage('okbm_packing_history', rawList);

    triggerHaptic(14);
    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }

    if (nextStatus) {
      if (typeof showToast === 'function') showToast('🌐 함께보기(전체 공개)로 전환되었습니다!', 'success', 2000);
    } else {
      if (typeof showToast === 'function') showToast('🔒 나만보기(비공개)로 전환되었습니다.', 'info', 2000);
    }

    // 2. 백그라운드 클라우드 전송 (디바운스 600ms 적용으로 구글 시트 락 충돌 원천 차단)
    clearTimeout(window.__cloudPublishDebounceTimer);
    window.__cloudPublishDebounceTimer = setTimeout(function() {
      if (nextStatus) {
        if (typeof window.shareFeedToCommunity === 'function') window.shareFeedToCommunity(target);
      } else {
        if (typeof window.deleteFeedFromCommunity === 'function') window.deleteFeedFromCommunity(target.id, target.date);
      }
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
    }, 600);
  };

  window.openTripActionMenu = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);
    var log = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!log) return;

    var old = document.getElementById('tripActionActionSheet');
    if (old) old.remove();

    var isPub = Boolean(log.isPublished);

    var sheet = document.createElement('div');
    sheet.id = 'tripActionActionSheet';
    sheet.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:1000009; display:flex; justify-content:center; align-items:flex-end; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);';

    sheet.innerHTML = `
      <div style="width:100%; max-width:440px; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.35); border-radius:18px 18px 0 0; padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <span style="font-size:0.86rem; font-weight:900; color:#fff;">[${escapeHtml(log.spot)}] 기록 관리</span>
          <button type="button" onclick="document.getElementById('tripActionActionSheet').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>

        <!-- 🌐 공개 / 🔒 비공개 전환 버튼 -->
        <button type="button" onclick="document.getElementById('tripActionActionSheet').remove(); window.toggleFeedPublishStatus('${log.id}');" style="width:100%; height:42px; background:${isPub ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isPub ? '#38bdf8' : 'rgba(255,255,255,0.15)'}; border-radius:10px; color:${isPub ? '#38bdf8' : '#cbd5e1'}; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:0 14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${isPub ? '🌐' : '🔒'}</span>
            <span>${isPub ? '전국 피드에 공개 중' : '현재 나만보기 (비공개)'}</span>
          </div>
          <span style="font-size:0.68rem; color:${isPub ? '#38bdf8' : '#fde047'}; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">
            ${isPub ? '비공개 전환 ➔' : '전체 공개하기 ➔'}
          </span>
        </button>

        <!-- ✍️ 100자 후기 및 사진 수정 -->
        <button type="button" onclick="document.getElementById('tripActionActionSheet').remove(); window.openRichAfterTripModal(window.interactiveHistory.find(r=>r.id==='${log.id}'));" style="width:100%; height:42px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#fff; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; padding:0 14px;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#38bdf8; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>✍️ 박지 팁 & 현장 사진 수정</span>
        </button>

        <!-- 🎨 20종 템플릿 스튜디오 -->
        <button type="button" onclick="document.getElementById('tripActionActionSheet').remove(); window.openHistoryStudioModal(window.interactiveHistory.find(r=>r.id==='${log.id}'));" style="width:100%; height:42px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#fff; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; padding:0 14px;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#fde047; fill:none; stroke-width:2.2;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>🎨 20종 템플릿 스튜디오로 인출</span>
        </button>

        <!-- 🗑️ 기록 영구 삭제 -->
        <button type="button" onclick="if(confirm('이 기록을 보관함에서 삭제하시겠습니까?')){ window.deleteTripRecord('${log.id}'); document.getElementById('tripActionActionSheet').remove(); }" style="width:100%; height:42px; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); border-radius:10px; color:#fda4af; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; padding:0 14px;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#f43f5e; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>🗑️ 기록 삭제</span>
        </button>
      </div>
    `;

    document.body.appendChild(sheet);
  };

  window.deleteTripRecord = function(recordId) {
    var rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    var target = rawList.find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    var targetDate = target ? target.date : '';
    var sId = String(recordId).trim();

    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
      savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
    }
    if (sId && savedPhotosMap[sId]) delete savedPhotosMap[sId];
    if (targetDate && savedPhotosMap[targetDate]) delete savedPhotosMap[targetDate];
    if (targetDate && savedPhotosMap[targetDate.replace(/[-/]/g, '.')]) delete savedPhotosMap[targetDate.replace(/[-/]/g, '.')];
    window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

    var filtered = rawList.filter(function(r) { return String(r.id).trim() !== sId; });
    var tombstone = {
      id: sId,
      date: targetDate,
      isDeleted: true,
      deletedAt: Date.now()
    };

    window.__tombstoneHistoryQueue = filtered.concat([tombstone]);

    window.interactiveHistory = filtered.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', filtered);

    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) { return String(f.id).trim() !== sId; });
    }
    if (Array.isArray(window.heroTopRecords)) {
      window.heroTopRecords = window.heroTopRecords.filter(function(f) { return String(f.id).trim() !== sId; });
      window.currentHeroCardIndex = 0;
      if (typeof window.renderCurrentHeroCard === 'function') {
        window.renderCurrentHeroCard();
      }
    }

    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
    window.__tombstoneHistoryQueue = null;

    if (typeof window.deleteFeedFromCommunity === 'function') {
      window.deleteFeedFromCommunity(recordId, targetDate);
    }

    var single = document.getElementById('singleTripFeedModal');
    if (single) single.remove();
    var past = document.getElementById('pastTripsListModal');
    if (past) past.remove();

    window.renderHistoryStage();
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('기록이 삭제되었습니다.', 'info');
  };

  // 📖 [백패킹/캠핑 피드 상세 듀얼 뷰 - 아웃도어 매거진 규격 동기화]
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

      var memo100 = (log.memo || log.oneLineMemo || '').slice(0, 100);
      var cleanInsta = String(log.instagram || localStorage.getItem('okbm_user_instagram') || '').replace(/[@\s]/g, '').trim();

      var packingSheetMarkup = '';
      var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

      if (genFn) {
        packingSheetMarkup = genFn(tmplId, log, items, log.spot, memo100 || (log.spot + ' 패킹'), photosList[0]);
      } else {
        packingSheetMarkup = `
          <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">
                <span style="font-family:'Space Grotesk', sans-serif; font-size:0.75rem; font-weight:900;">ROMANTIC PACK</span>
                <span style="font-size:0.52rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 5px; border-radius:3px;">#0${tmplId} 패킹지</span>
              </div>
              <div style="margin-top:6px; font-size:0.95rem; font-weight:900; display:flex; align-items:center; gap:3px;">
                ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(log.spot)} (${escapeHtml(log.elevation || '')})</span>
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
        <div class="single-feed-block" data-record-id="${escapeHtml(String(log.id))}" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.12); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 16px 45px rgba(0,0,0,0.95); flex-shrink:0; margin-bottom:24px; box-sizing:border-box;">
          
          <!-- 상단 헤더 & 개척자 인스타 배지 -->
          <div style="padding:12px 14px; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
            <div style="min-width:0; flex:1; padding-right:8px;">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:0.92rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(log.spot)}
                </span>
                <button type="button" onclick="window.openSpotInMap('${escapeHtml(log.spot)}', event);" style="background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.60rem; font-weight:800; padding:2px 6px; border-radius:5px; cursor:pointer; flex-shrink:0;">
                  🗺️ 지도
                </button>
              </div>

              ${cleanInsta ? `
                <a href="https://instagram.com/${cleanInsta}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:3px; background:linear-gradient(135deg, rgba(225,48,108,0.18), rgba(245,96,64,0.18)); border:1px solid rgba(225,48,108,0.4); color:#fda4af; padding:1.5px 6px; border-radius:4px; font-size:0.58rem; font-weight:800; text-decoration:none; margin-top:3px;">
                  <span>📸 @${escapeHtml(cleanInsta)}</span>
                  <span style="font-size:0.52rem; opacity:0.8;">↗</span>
                </a>
              ` : ''}
            </div>

            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <span style="font-size:0.68rem; color:#94a3b8; font-weight:700; font-family:'JetBrains Mono', monospace;">${escapeHtml(log.date)}</span>
              <button onclick="window.openTripActionMenu('${escapeHtml(String(log.id))}', event)" style="background:rgba(255,255,255,0.08); border:none; color:#38bdf8; font-size:0.85rem; font-weight:900; padding:2px 8px; border-radius:4px; cursor:pointer;">···</button>
            </div>
          </div>

          <!-- 100자 핵심 팁 -->
          ${memo100 ? `
            <div style="padding:12px 16px; background:rgba(255,255,255,0.025); border-bottom:1px solid rgba(226,232,240,0.1); border-left:3px solid #38bdf8;">
              <div style="font-size:0.78rem; font-weight:600; color:#f1f5f9; line-height:1.55; word-break:keep-all;">
                “${escapeHtml(memo100)}”
              </div>
            </div>
          ` : ''}

          <!-- 고화질 현장 사진 리스트 -->
          <div style="display:flex; flex-direction:column; padding:8px 8px 0 8px; background:#000;">
            ${photosList.map(function(pUrl) {
              return `
                <div style="width:100%; aspect-ratio:4/5; overflow:hidden; position:relative; background:#05070a; border:1px solid rgba(255,255,255,0.12); border-radius:12px; margin-bottom:8px; box-sizing:border-box;">
                  <img src="${pUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
                </div>
              `;
            }).join('')}
          </div>

          <!-- 배낭 패킹 명세서 엽서 -->
          <div style="padding:10px 14px 14px 14px; background:#07090e; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
              ${HISTORY_VEC_ICONS.backpack}
              <span>이날의 배낭 패킹 명세서</span>
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
        <span style="font-size:0.95rem; font-weight:900; color:#fff;">📖 필드 상세 피드</span>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>

      <div id="dualFeedScrollContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${window.buildSingleFeedCardHtml(logs[startIdx])}
        </div>
      </div>

      <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000003 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
        <a href="index.html" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>낭만루터</span>
        </a>
        <a href="map.html" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
          <span>전국지도</span>
        </a>
        <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
          <span>낭만계획</span>
        </button>
        <button type="button" class="dock-item active" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          <span>낭만보관함</span>
        </button>
        <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>내정보</span>
        </button>
      </div>
    `;
    document.body.appendChild(feedModal);
    triggerHaptic(12);
  };

// 📸 [사진 업로드 파일 핸들러 엔진]
  window.__handleRichMultiPhotoUpload = function(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;

    var maxSlots = 10 - (window.__tempUploadedPhotos ? window.__tempUploadedPhotos.length : 0);
    if (maxSlots <= 0) {
      if (typeof showToast === 'function') showToast('사진은 최대 10장까지만 등록 가능합니다.', 'warn');
      return;
    }

    var filesToProcess = Array.from(files).slice(0, maxSlots);
    triggerHaptic(10);

    filesToProcess.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          var MAX_WIDTH = 1200;
          var scale = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          window.__tempUploadedPhotos.push(compressedBase64);
          window.__renderRichPhotoThumbnails();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  window.__removeRichSinglePhoto = function(index) {
    if (window.__tempUploadedPhotos && window.__tempUploadedPhotos[index] !== undefined) {
      window.__tempUploadedPhotos.splice(index, 1);
      window.__renderRichPhotoThumbnails();
      triggerHaptic(8);
    }
  };

  window.__clearAllRichPhotos = function() {
    window.__tempUploadedPhotos = [];
    window.__renderRichPhotoThumbnails();
    triggerHaptic(10);
  };

  window.__renderRichPhotoThumbnails = function() {
    var grid = document.getElementById('richPhotoThumbnailsGrid');
    var label = document.getElementById('richPhotoCountLabel');
    if (!grid) return;

    var count = window.__tempUploadedPhotos ? window.__tempUploadedPhotos.length : 0;
    if (label) label.innerText = '등록된 사진 (' + count + '장 / 최대 10장)';

    if (count === 0) {
      grid.innerHTML = `
        <div onclick="document.getElementById('richMultiPhotoInput').click();" style="width:100%; height:160px; border:1.5px dashed rgba(56,189,248,0.4); border-radius:14px; background:rgba(255,255,255,0.02); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer;">
          <div style="width:44px; height:44px; border-radius:50%; background:rgba(56,189,248,0.12); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px; height:22px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span style="font-size:0.84rem; font-weight:800; color:#38bdf8;">현장 사진 추가하기 (최대 10장)</span>
          <span style="font-size:0.65rem; color:#94a3b8;">터치하여 사진을 선택하세요</span>
        </div>
      `;
    } else {
      var photosHtml = window.__tempUploadedPhotos.map(function(url, pIdx) {
        return `
          <div style="position:relative; width:120px; aspect-ratio:3/4; border-radius:10px; overflow:hidden; border:1.5px solid rgba(255,255,255,0.2); flex-shrink:0; background:#000;">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
            <button type="button" onclick="window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:rgba(0,0,0,0.75); color:#fff; border:1px solid rgba(255,255,255,0.3); font-size:12px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">✕</button>
            <div style="position:absolute; bottom:4px; left:4px; background:rgba(0,0,0,0.6); padding:1px 5px; border-radius:4px; font-size:0.55rem; color:#fff; font-weight:800;">#${pIdx + 1}</div>
          </div>
        `;
      }).join('');

      if (count < 10) {
        photosHtml += `
          <div onclick="document.getElementById('richMultiPhotoInput').click();" style="width:90px; aspect-ratio:3/4; border:1.5px dashed rgba(56,189,248,0.5); border-radius:10px; background:rgba(56,189,248,0.06); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; flex-shrink:0;">
            <span style="font-size:1.4rem; color:#38bdf8; line-height:1;">+</span>
            <span style="font-size:0.62rem; color:#38bdf8; font-weight:800;">추가</span>
          </div>
        `;
      }
      grid.innerHTML = photosHtml;
    }
  };

  // 📝 [시원한 모바일 풀스크린 힐링 기록 & 사진 작성 뷰어]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;
    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;
    var currentPhotos = getRecordPhotos(record);
    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    var savedInsta = localStorage.getItem('okbm_user_instagram') || record.instagram || '';
    var initialMemo = (record.memo || record.oneLineMemo || '').slice(0, 120);

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000010; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    formModal.innerHTML = `
      <!-- 1. 상단 헤더: 닫기 + [📍 장소 · 날짜 고정 뱃지] + 발행 버튼 -->
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <button type="button" onclick="document.getElementById('modalRichAfterTrip').remove(); triggerHaptic(10);" style="background:none; border:none; color:#cbd5e1; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        
        <!-- 고정 메타 뱃지 (입력창 전면 제거) -->
        <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); padding:3px 10px; border-radius:20px;">
          <span style="font-size:0.80rem; font-weight:900; color:#38bdf8;">📍 ${escapeHtml(record.spot)}</span>
          <span style="font-size:0.65rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">· ${escapeHtml(record.date)}</span>
        </div>

        <button type="button" onclick="window.__saveRichAfterTrip('${record.id}')" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:none; color:#fff; font-size:0.80rem; font-weight:900; padding:6px 14px; border-radius:8px; cursor:pointer; box-shadow:0 2px 10px rgba(2,132,199,0.4);">
          발행 ✓
        </button>
      </div>

      <!-- 2. 중앙 풀스크린 작업 영역 (시원한 사진 갤러리 + 120자 트렌디 팁) -->
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:16px 14px calc(30px + env(safe-area-inset-bottom, 0px)) 14px; display:flex; flex-direction:column; gap:16px; box-sizing:border-box;">
        
        <!-- 📸 대형 사진 프리뷰 & 추가 섹션 -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span id="richPhotoCountLabel" style="font-size:0.82rem; color:#ffffff; font-weight:900;">
              등록된 사진 (${window.__tempUploadedPhotos.length}장 / 최대 10장)
            </span>
            <button type="button" onclick="window.__clearAllRichPhotos();" style="background:none; border:none; color:#fda4af; font-size:0.68rem; font-weight:800; cursor:pointer;">전체삭제</button>
          </div>

          <div id="richPhotoThumbnailsGrid" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; min-height:160px; align-items:center; scrollbar-width:none;">
            <!-- __renderRichPhotoThumbnails에서 자동 렌더링 -->
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event)" />
        </div>

        <!-- ✍️ 딱 120자 실전 팁 & 후기 작성 영역 (풀스크린 에디터) -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.82rem; color:#ffffff; font-weight:900;">📖 120자 힐링 팁 & 후기</span>
            <span id="richMemoCharCounter" style="font-size:0.70rem; color:#38bdf8; font-family:'Space Grotesk', sans-serif; font-weight:800;">${initialMemo.length}/120자</span>
          </div>
          <textarea id="richFormMemoInput" maxlength="120" placeholder="바람 세기, 지형 상태, 실전 꿀팁 등 자유로운 기록을 120자 이내로 남겨보세요." oninput="document.getElementById('richMemoCharCounter').innerText = this.value.length + '/120자';" style="width:100%; height:110px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:12px; padding:12px 14px; font-size:0.85rem; line-height:1.6; box-sizing:border-box; outline:none; resize:none; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.02em;">${escapeHtml(initialMemo)}</textarea>
        </div>

        <!-- 📸 인스타그램 계정 (선택 홍보) -->
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; color:#fda4af; font-weight:800;">📸 내 인스타그램 계정 (선택)</span>
            <span style="font-size:0.60rem; color:#94a3b8;">피드에 링크가 함께 노출됩니다</span>
          </div>
          <input type="text" id="richInputInstagram" value="${escapeHtml(savedInsta)}" placeholder="@인스타아이디 (예: @romantic_route)" style="width:100%; height:38px; background:rgba(225,48,108,0.06); border:1px solid rgba(225,48,108,0.3); color:#ffffff; border-radius:8px; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />
        </div>

      </div>
    `;

    document.body.appendChild(formModal);
    window.__renderRichPhotoThumbnails();
  };

  // 💾 [박지 후기 저장 및 120자 압축 / 닉네임 영구 각인 엔진]
  window.__saveRichAfterTrip = function(recordId) {
    var target = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!target) return;

    var spotInput = document.getElementById('richInputSpotName');
    var dateInput = document.getElementById('richInputTripDate');
    var instaInput = document.getElementById('richInputInstagram');
    var memoInput = document.getElementById('richFormMemoInput');

    if (spotInput && spotInput.value.trim()) target.spot = spotInput.value.trim();
    if (dateInput && dateInput.value.trim()) target.date = dateInput.value.trim();
    
    // 👤 현재 로그인된 카카오 닉네임 1순위 확정 각인
    var profile = safeGetJSON('user_profile', null);
    target.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');

    // 📸 인스타 아이디 저장
    if (instaInput) {
      var cleanInsta = instaInput.value.replace(/[@\s]/g, '').trim();
      target.instagram = cleanInsta ? ('@' + cleanInsta) : '';
      if (cleanInsta) localStorage.setItem('okbm_user_instagram', '@' + cleanInsta);
    }

    // ✂️ 딱 120자 제한 적용
    var rawMemo = memoInput ? memoInput.value.trim() : '';
    target.memo = rawMemo.slice(0, 120);
    target.oneLineMemo = target.memo;
    target.isPublished = true;
    target.isDraft = false;

    var photosToProcess = Array.isArray(window.__tempUploadedPhotos) ? window.__tempUploadedPhotos.slice(0, 10) : [];
    if (photosToProcess.length > 0) {
      target.photos = photosToProcess;
      target.fieldPhoto = photosToProcess[0] || '';
      target.photo = photosToProcess[0] || '';

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      savedPhotosMap[String(target.id)] = target.photos;
      savedPhotosMap[String(target.date)] = target.photos;
      window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
      window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

    // 1. 단일 저장 코어 엔진을 통해 로컬/IndexedDB/메모리 100% 안전 저장
    if (typeof window.savePackingHistoryRecord === 'function') {
      window.savePackingHistoryRecord(target);
    } else {
      window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    }

    // 2. 모달 즉시 닫기
    var m = document.getElementById('modalRichAfterTrip');
    if (m) m.remove();

    window.renderHistoryStage();

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🏕️ 후기가 성공적으로 저장되었습니다!', 'success', 2000);

    // 3. 백그라운드 클라우드 전파 (구글 시트 & R2)
    (async function runBackgroundUpload() {
      var hasBase64 = photosToProcess.some(function(p) { return typeof p === 'string' && p.startsWith('data:'); });
      if (hasBase64) {
        var finalDriveUrls = [];
        for (var i = 0; i < photosToProcess.length; i++) {
          var pItem = photosToProcess[i];
          if (typeof pItem === 'string' && pItem.startsWith('data:')) {
            var dUrl = await uploadSinglePhotoToDrive(pItem, 'trip_' + target.id + '_' + i + '.jpg');
            finalDriveUrls.push(dUrl || pItem);
            await new Promise(function(res) { setTimeout(res, 250); });
          } else {
            finalDriveUrls.push(pItem);
          }
        }

        target.photos = finalDriveUrls;
        target.fieldPhoto = finalDriveUrls[0] || '';
        target.photo = finalDriveUrls[0] || '';

        var updatedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
        updatedPhotosMap[String(target.id)] = target.photos;
        updatedPhotosMap[String(target.date)] = target.photos;
        window.__memoryStore['okbm_phone_photos_map'] = updatedPhotosMap;
        window.saveToIndexedDB('okbm_phone_photos_map', updatedPhotosMap);
        window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
      }

      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
      if (typeof window.shareFeedToCommunity === 'function') window.shareFeedToCommunity(target);
    })();
  };

  // 🔗 [공유 링크 딥링크 다이렉트 자동 오픈 엔진]
  document.addEventListener('DOMContentLoaded', function() {
    try {
      var params = new URLSearchParams(window.location.search);
      var sharedFeedId = params.get('feed');
      if (sharedFeedId) {
        setTimeout(function() {
          if (typeof window.openHistoryModal === 'function') {
            window.openHistoryModal();
            setTimeout(function() {
              var targetCard = document.querySelector('[data-record-id="' + sharedFeedId + '"]');
              if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 300);
          }
        }, 500);
      }
    } catch (e) {}
  });

// 🌐 [핵심 누락 복원] 구글 클라우드 단일 사진 업로드 백엔드 엔진
  async function uploadSinglePhotoToDrive(base64Data, fileName) {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:')) {
      return base64Data;
    }
    try {
      var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
      var res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPLOAD_PHOTO',
          base64: base64Data,
          fileName: fileName || ('photo_' + Date.now() + '.jpg')
        })
      });
      if (res.ok) {
        var data = await res.json();
        if (data && data.status === 'SUCCESS' && data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('[RomanticHistory] 드라이브 사진 업로드 예외:', err);
    }
    return base64Data;
  }
  window.uploadSinglePhotoToDrive = uploadSinglePhotoToDrive;

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

  window.changeHistoryYear = function(year) {
    window.calViewYear = Number(year);
    window.renderHistoryStage();
    triggerHaptic(10);
    var oldPicker = document.getElementById('historyYearPickerOverlay');
    if (oldPicker) oldPicker.remove();
  };

  window.jumpToHistoryToday = function() {
    var now = new Date();
    window.calViewYear = now.getFullYear();
    window.calViewMonth = now.getMonth() + 1;
    window.activeSelectedDateKey = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    window.renderHistoryStage();
    triggerHaptic(10);
  };

  window.openYearSelectPicker = function(e) {
    if (e) e.stopPropagation();
    triggerHaptic(10);
    var oldPicker = document.getElementById('historyYearPickerOverlay');
    if (oldPicker) { oldPicker.remove(); return; }

    var now = new Date();
    var curYear = window.calViewYear || now.getFullYear();

    var picker = document.createElement('div');
    picker.id = 'historyYearPickerOverlay';
    picker.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:1000050; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
    picker.onclick = function(evt) { if (evt.target === picker) picker.remove(); };

    var startY = curYear - 4;
    var endY = curYear + 4;
    var yearsHtml = '';
    for (var y = startY; y <= endY; y++) {
      var isCurrent = (y === curYear);
      yearsHtml += '<button type="button" onclick="window.changeHistoryYear(' + y + ')" style="height:38px; border-radius:8px; font-size:0.84rem; font-weight:' + (isCurrent ? '900' : '700') + '; background:' + (isCurrent ? '#38bdf8' : 'rgba(255,255,255,0.06)') + '; color:' + (isCurrent ? '#000000' : '#ffffff') + '; border:1px solid ' + (isCurrent ? '#38bdf8' : 'rgba(255,255,255,0.12)') + '; cursor:pointer;">' + y + '년</button>';
    }

    picker.innerHTML = `
      <div style="width:100%; max-width:280px; background:#0c1018; border:1.5px solid rgba(56,189,248,0.4); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 16px 40px rgba(0,0,0,0.9); box-sizing:border-box;" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.88rem; font-weight:900; color:#ffffff;">연도 선택</span>
          <button type="button" onclick="document.getElementById('historyYearPickerOverlay').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
          ${yearsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(picker);
  };

  // =========================================================================
// [수정 코드 1] romantic-history.js : 불필요한 제스처/토글 핸들러 제거 및 표준화
// =========================================================================
  window.handleHistoryDockTabClick = function(targetMode, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }

    if (targetMode === 'feed') {
      window.openPastTripsListModal();
    } else if (targetMode === 'studio') {
      window.openHistoryStudioModal();
    } else if (targetMode === 'clearmap') {
      window.openClearMapModal();
    } else if (targetMode === 'report') {
      window.openMyReportModal();
    }
    triggerHaptic(10);
  };

// =========================================================================
  // 🏕️ [아웃도어 필드 아카이브] 개척자 SNS 홍보 · 낭만별 & 감사 스탬프 · 지도 연동
  // =========================================================================
  window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'my';

  window.handleHistoryCalendarClick = function(day, month, year) {
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');

    var foundIdx = (window.interactiveHistory || []).findIndex(function(h) {
      if (Number(h.year) === Number(year) && Number(h.month) === Number(month) && Number(h.day) === Number(day)) return true;
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : '';
      return hDate === dateKey;
    });

    if (foundIdx === -1) {
      triggerHaptic(5);
      return;
    }

    window.activeSelectedDateKey = dateKey;
    window.currentCardIndex = foundIdx;
    window.activeHistorySubFilter = 'all';
    window.renderHistoryStage();
    triggerHaptic(10);
  };

  // =========================================================================
  // 🏕️ [핵심 복원] 아웃도어 필드 매거진 렌더러 & 낭만보관함 모달 엔진
  // =========================================================================
  window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'my';

  window.switchHistoryFeedTab = async function(tab) {
    window.activeHistoryFeedTab = tab;
    triggerHaptic(10);

    if (tab === 'explore' && (!window.__allLoadedFeeds || window.__allLoadedFeeds.length === 0)) {
      if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage(true);
      if (typeof window.fetchCommunityFeeds === 'function') await window.fetchCommunityFeeds(true);
    }

    if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage();
  };
// =========================================================================
  // 🏕️ [증명사진 화이트 프레임 & 3D 템플릿 플립] 군더더기 제로 펄 릴스 뷰어
  // =========================================================================
  window.toggleFeedMode = function() {
    var nextTab = (window.activeHistoryFeedTab === 'my') ? 'explore' : 'my';
    window.switchHistoryFeedTab(nextTab);
  };

  // 🔘 [인스타그램 가로 슬라이더 도트 인디케이터 실시간 동기화]
  window.updateCarouselDots = function(container, cardId) {
    var wrap = document.getElementById('dotsWrap_' + cardId);
    if (!wrap || !container) return;

    var scrollLeft = container.scrollLeft;
    var width = container.offsetWidth;
    var curIdx = Math.round(scrollLeft / width);

    var dots = wrap.children;
    for (var i = 0; i < dots.length; i++) {
      if (i === curIdx) {
        dots[i].style.width = '14px';
        dots[i].style.background = '#ffffff';
        dots[i].style.boxShadow = '0 0 8px rgba(255,255,255,0.9)';
      } else {
        dots[i].style.width = '5px';
        dots[i].style.background = 'rgba(255,255,255,0.35)';
        dots[i].style.boxShadow = 'none';
      }
    }
  };

  window.renderHistoryStage = function(isLoading) {
    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) return;

    var content = modal.querySelector('.romantic-history-content');
    if (!content) return;

    window.interactiveHistory = window.sortHistoryByDateAsc(window.interactiveHistory || []).reverse();
    var isMyTab = (window.activeHistoryFeedTab === 'my');

    var currentList = [];
    if (isMyTab) {
      currentList = window.interactiveHistory || [];
    } else {
      currentList = (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
        ? window.__allLoadedFeeds
        : (window.safeGetStorage('okbm_cached_community_feeds', []) || []);
    }

    var profile = safeGetJSON('user_profile', null);
    var savedNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    var savedInsta = localStorage.getItem('okbm_user_instagram') || '';
    var starsMap = safeGetJSON('okbm_feed_stars_map', {});
    var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
    var bookmarks = safeGetJSON('okbm_bookmarks', []);

    var reelSlidesHtml = '';
    if (isLoading) {
      reelSlidesHtml = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#38bdf8;">
          <div style="font-size:2.2rem; animation:spin 1s linear infinite;">⏳</div>
          <div style="font-size:0.90rem; font-weight:900; color:#e2e8f0; text-shadow:0 0 10px rgba(255,255,255,0.4);">전국 최신 박지 릴스 동기화 중...</div>
        </div>
      `;
    } else if (currentList.length === 0) {
      reelSlidesHtml = `
        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:30px; text-align:center; box-sizing:border-box;">
          <div style="font-size:3rem; line-height:1;">🏕️</div>
          <div style="font-size:1.05rem; font-weight:900; color:#ffffff; text-shadow:0 0 10px rgba(255,255,255,0.4);">
            ${isMyTab ? '아직 등록된 릴스 기록이 없습니다.' : '둘러볼 수 있는 필드 릴스가 없습니다.'}
          </div>
          <div style="font-size:0.75rem; color:#94a3b8; line-height:1.5;">
            ${isMyTab ? '다녀온 박지의 사진과 100자 팁을 남겨 첫 번째 릴스를 완성해보세요!' : '새로운 박지 개척 기록을 기다리는 중입니다.'}
          </div>
        </div>
      `;
    } else {
      reelSlidesHtml = currentList.map(function(item, idx) {
        var record = isMyTab ? item : window.normalizeHistoryRecord(item, idx);
        var cardId = escapeHtml(String(record.id || idx));
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(record) : (record.photos || []);
        var spotName = record.spot || '이름 없는 박지';
        var tripDate = record.date || '';
        var weightKg = record.weightKg || '0.00';
   var memo120 = (record.memo || record.oneLineMemo || '').slice(0, 120);
        var authorName = isMyTab ? savedNick : (record.author || record.nick || '개척 캠퍼');
        var instaId = isMyTab ? savedInsta : (record.instagram || record.instaId || '');
        var cleanInsta = String(instaId).replace(/[@\s]/g, '').trim();
        var itemsCount = Array.isArray(record.items) ? record.items.length : 0;

        var isStarred = Boolean(starsMap[cardId]);
        var starCount = Number(starCounts[cardId] || 0);

       var mediaItems = (photos && photos.length > 0) ? photos : [];
        var totalPhotosCount = mediaItems.length;

        // 🖼️ 앞면: 3:4 세로 사진은 100% 꽉 찬 화보 & 가로 사진은 무손실 앰비언트 뷰어
        var horizontalSlidesHtml = '';
        if (totalPhotosCount === 0) {
          horizontalSlidesHtml = `
            <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:20px; box-sizing:border-box; text-align:center;">
              <div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px dashed rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:24px; height:24px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <div style="font-size:0.86rem; font-weight:900; color:#e2e8f0;">등록된 현장 사진이 없습니다.</div>
              <div style="font-size:0.68rem; color:#94a3b8; line-height:1.4;">하단 [···] 관리 메뉴에서<br>현장 사진을 추가해보세요!</div>
            </div>
          `;
        } else {
          horizontalSlidesHtml = mediaItems.map(function(pUrl) {
            return `
              <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">
                <!-- 🌌 가로 사진 대비 앰비언트 블러 배경 -->
                <img src="${pUrl}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(24px) brightness(0.4); transform:scale(1.2); pointer-events:none;" />
                
                <!-- 📸 3:4 비율은 꽉 차게, 가로는 온전하게 표시하는 스마트 뷰어 -->
                <img src="${pUrl}" style="position:relative; z-index:2; width:100%; height:100%; object-fit:cover; display:block; pointer-events:none;" />
              </div>
            `;
          }).join('');
        }

        // 🔘 하단 도트 인디케이터 (인스타그램 스타일)
        var dotsHtml = (totalPhotosCount > 1) ? `
          <div id="dotsWrap_${cardId}" style="display:flex; justify-content:center; align-items:center; gap:5px; height:12px; pointer-events:none;">
            ${Array.from({ length: totalPhotosCount }).map(function(_, dIdx) {
              return `<div class="carousel-dot-item" style="width:${dIdx === 0 ? '14px' : '5px'}; height:4px; border-radius:2px; background:${dIdx === 0 ? '#ffffff' : 'rgba(255,255,255,0.35)'}; ${dIdx === 0 ? 'box-shadow:0 0 8px rgba(255,255,255,0.9);' : ''} transition:all 0.2s ease;"></div>`;
            }).join('')}
          </div>
        ` : '';

        // 🎒 뒷면: templates.js 20종 감성 엽서 엔진과 100% 실시간 연동
        var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
        var tmplId = record.templateId || savedTmplId;
        var rawPhoto = mediaItems[0] || '';

        var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);
        var backTemplateCardHtml = '';

        if (genFn) {
          backTemplateCardHtml = genFn(tmplId, record, record.items || [], spotName, memo120 || spotName, rawPhoto);
        } else {
          backTemplateCardHtml = `
            <div style="width:100%; height:100%; background:#090d15; padding:20px 18px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed rgba(255,255,255,0.2); padding-bottom:8px;">
                  <span style="font-size:0.95rem; font-weight:900; color:#38bdf8; text-shadow:0 0 8px rgba(56,189,248,0.5);">🎒 ${escapeHtml(spotName)}</span>
                  <span style="font-size:0.68rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${escapeHtml(tripDate)}</span>
                </div>
                <div style="margin-top:16px; display:flex; justify-content:space-between; align-items:baseline; background:rgba(255,255,255,0.03); padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08);">
                  <span style="font-size:0.78rem; color:#94a3b8; font-weight:700;">총 패킹 무게</span>
                  <span style="font-size:1.6rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif; text-shadow:0 0 10px rgba(52,211,153,0.5);">${weightKg} KG</span>
                </div>
                <div style="font-size:0.78rem; color:#cbd5e1; margin-top:14px; line-height:1.6;">
                  장비 <strong style="color:#38bdf8;">${itemsCount}개</strong> 세팅 완료<br>
                  고도: <span style="color:#fde047;">${escapeHtml(record.elevation || '정보 없음')}</span>
                </div>
              </div>
              <div>
                <button type="button" onclick="event.stopPropagation(); window.openHistoryStudioModal(window.interactiveHistory.find(function(r){return String(r.id)==='${cardId}';})); triggerHaptic(10);" style="width:100%; height:42px; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:8px; color:#fff; font-size:0.82rem; font-weight:900; cursor:pointer; box-shadow:0 4px 14px rgba(2,132,199,0.4);">
                  🎨 20종 감성 엽서로 인출하기 ➔
                </button>
                <div style="font-size:0.60rem; color:#64748b; text-align:center; margin-top:6px;">
                  🔄 다시 터치하면 사진으로 돌아갑니다
                </div>
              </div>
            </div>
          `;
        }

 var isPublished = Boolean(record.isPublished === true); // 공개/비공개 상태

        // 📸 세련된 공식 인스타그램 SVG 벡터 아이콘 (이모지 완전 배제)
        var instaOfficialSvg = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:url(#instaGrad); flex-shrink:0;"><defs><linearGradient id="instaGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="25%" stop-color="#e6683c"/><stop offset="50%" stop-color="#dc2743"/><stop offset="75%" stop-color="#cc2366"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

        // 🛡️ 100% 순수 SVG 미니멀 상단 상태 뱃지 (이모지 0%)
        var statusBadgeHtml = isPublished
          ? '<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.62rem; font-weight:800; color:#34d399; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); padding:2px 7px; border-radius:12px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>함께보기</span>'
          : '<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.62rem; font-weight:800; color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); padding:2px 7px; border-radius:12px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>나만보기</span>';

        return `
          <!-- 인스타그램 피드 게시물 규격 1개 단위 (화면 꽉 찬 3:4 화보) -->
          <div class="reel-page-snap" style="width:100% !important; min-height:100% !important; height:100dvh !important; scroll-snap-align:start !important; position:relative; overflow:hidden !important; display:flex !important; flex-direction:column !important; justify-content:flex-start !important; align-items:stretch !important; padding-top:calc(env(safe-area-inset-top, 0px)) !important; padding-bottom:calc(56px + env(safe-area-inset-bottom, 0px) + 12px) !important; box-sizing:border-box !important; flex-shrink:0 !important; contain:strict !important; touch-action:pan-y !important;">
            
            <!-- 1. 상단 프로필 헤더 + 우측 순수 SVG 상태 뱃지 ([함께보기] / [나만보기]) -->
            <div style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; background:#000; flex-shrink:0;">
              <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; padding-right:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:0.86rem; color:#ffffff; font-weight:800; letter-spacing:-0.01em;">${escapeHtml(authorName)}</span>
                  
                  <!-- 📸 전체 공개일 때만 세련되게 노출되는 공식 인스타그램 뱃지 -->
                  ${(isPublished && cleanInsta) ? `
                    <a href="https://instagram.com/${cleanInsta}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; padding:1.5px 6px; border-radius:12px; font-size:0.62rem; font-weight:700; text-decoration:none;">
                      ${instaOfficialSvg}
                      <span>@${escapeHtml(cleanInsta)}</span>
                    </a>
                  ` : ''}
                </div>
                <span style="font-size:0.65rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${escapeHtml(tripDate)} · ${escapeHtml(spotName)}</span>
              </div>

              <!-- 우측 상단: 100% 순수 SVG 상태 뱃지 -->
              <div style="flex-shrink:0;">
                ${statusBadgeHtml}
              </div>
            </div>

            <!-- 2. 중단: 좌우 여백 0px 화면 100% 꽉 찬 3:4 무손실 대형 사진 프레임 -->
            <div style="width:100% !important; aspect-ratio:3 / 4 !important; max-height:58vh !important; flex-shrink:0 !important; position:relative; background:#000; touch-action:pan-y !important;">
              <div class="postcard-3d-wrapper" onclick="this.classList.toggle('flipped'); triggerHaptic(10);" style="width:100% !important; height:100% !important; position:relative; cursor:pointer; background:#000; touch-action:pan-y !important;">
                
                <!-- 앞면: 3:4 가로 슬라이더 -->
                <div class="postcard-face-front" style="width:100%; height:100%; position:absolute; inset:0; overflow:hidden; background:#000;">
                  <div class="reel-horizontal-track" onscroll="window.updateCarouselDots(this, '${cardId}');" style="display:flex !important; width:100% !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important;">
                    ${horizontalSlidesHtml}
                  </div>
                </div>

                <!-- 뒷면: 3D 플립 패킹 명세서 -->
                <div class="postcard-face-back" style="width:100%; height:100%; position:absolute; inset:0; overflow:hidden; background:#000;">
                  ${backTemplateCardHtml}
                </div>

              </div>
            </div>

            <!-- 3. 하단: 완벽히 바로잡힌 리액션 바 & 도트 & 120자 트렌디 팁 -->
            <div style="padding:8px 14px; box-sizing:border-box; display:flex; flex-direction:column; gap:6px; flex-shrink:0; background:#000;">
              
              <!-- 리액션 바: [⭐+숫자, 🔗공유] --- [🔘도트] --- [🔓공개/🔒비공개, ···관리] -->
              <div style="display:flex; justify-content:space-between; align-items:center; position:relative;">
                
                <!-- 좌측: 별 + 공유하기 -->
                <div style="display:flex; align-items:center; gap:12px;">
                  <!-- ⭐ 낭만별 순수 SVG 벡터 + 미니멀 숫자 -->
                  <button type="button" onclick="window.toggleFeedStar('${cardId}', event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:4px;">
                    <svg id="feedStarIcon_${cardId}" viewBox="0 0 24 24" style="width:22px; height:22px; filter:${isStarred ? 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' : 'none'}; transition:transform 0.2s ease;" fill="${isStarred ? '#fde047' : 'none'}" stroke="${isStarred ? '#fde047' : '#ffffff'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span id="feedStarCountText_${cardId}" style="font-size:0.78rem; font-weight:900; color:#fde047; font-family:'Space Grotesk', sans-serif; text-shadow:0 0 8px rgba(253,224,71,0.6);">${starCount}</span>
                  </button>

                  <!-- 🔗/✈️ 공유하기 버튼 (별 바로 오른쪽) -->
                  <button type="button" onclick="if(navigator.share){navigator.share({title:'${escapeHtml(spotName)}',text:'${escapeHtml(memo120)}',url:location.href});}else{navigator.clipboard.writeText(location.href);if(typeof showToast==='function')showToast('🔗 피드 링크가 복사되었습니다!','info');}triggerHaptic(10);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:#ffffff;" title="공유하기">
                    <svg viewBox="0 0 24 24" style="width:20px; height:20px; color:#ffffff;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>

                <!-- 중앙: 도트 인디케이터 -->
                <div style="position:absolute; left:50%; transform:translateX(-50%);">
                  ${dotsHtml}
                </div>

                <!-- 우측: 자물쇠(🔓공개 ⇄ 🔒비공개 원터치 토글) + [···] 관리 메뉴 -->
                <div style="display:flex; align-items:center; gap:12px;">
                  <!-- 원터치 공개/비공개 전환 (100% 순수 SVG) -->
                  <button type="button" data-record-id="${cardId}" onclick="window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center;" title="${isPublished ? '함께보기(공개 중)' : '나만보기(비공개)'}">
                    ${isPublished ? `
                      <svg viewBox="0 0 24 24" style="width:21px; height:21px; color:#34d399; filter:drop-shadow(0 0 6px rgba(52,211,153,0.7));" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    ` : `
                      <svg viewBox="0 0 24 24" style="width:21px; height:21px; color:#38bdf8; filter:drop-shadow(0 0 6px rgba(56,189,248,0.7));" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    `}
                  </button>

                  <!-- ··· 관리 메뉴 (우측 끝) -->
                  <button type="button" data-record-id="${cardId}" onclick="window.openTripActionMenu(this.dataset.recordId, event);" style="background:none; border:none; padding:0; cursor:pointer; color:#cbd5e1; font-size:1.15rem; line-height:1; letter-spacing:1px;">
                    ···
                  </button>
                </div>

              </div>

              <!-- 🌌 딱 120자 트렌디 감성 타이포그래피 (Pretendard 기반, 칼같은 좌측 정렬) -->
              <div style="font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif; font-size:0.84rem; font-weight:450; color:#f1f5f9; line-height:1.55; word-break:break-all; margin-top:3px; text-shadow:0 0 10px rgba(226,232,240,0.3); letter-spacing:-0.02em;">${memo120.trim() ? `“${escapeHtml(memo120.trim())}”` : '<span style="color:#64748b; font-style:italic;">등록된 실전 팁이 없습니다.</span>'}</div>

            </div>

          </div>
        `;
      }).join('');
    }

    // 📱 [울렁거림 0% 세로 스냅 컨테이너]
    content.innerHTML = `
      <div id="reelsVerticalContainer" style="flex:1 1 0% !important; width:100% !important; height:100% !important; height:100dvh !important; overflow-y:auto !important; overflow-x:hidden !important; scroll-snap-type:y mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; position:relative; z-index:10; overscroll-behavior-y:none !important; overscroll-behavior-x:none !important; touch-action:pan-y !important;">
        ${reelSlidesHtml}
      </div>

      <!-- 하단 메인 네비독 -->
      <div style="position:absolute !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.95) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:30 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
        <a href="index.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>낭만루터</span>
        </a>
        <a href="map.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
          <span>전국지도</span>
        </a>
        <button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
            <path d="M9 16l2 2 4-4"/>
          </svg>
          <span>낭만계획</span>
        </button>
        <button type="button" class="dock-item active" onclick="if(typeof window.renderHistoryStage==='function') window.renderHistoryStage(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff !important; font-size:0.67rem; font-weight:900; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">
            <path d="M21 8v13H3V8"/>
            <path d="M1 3h22v5H1z"/>
            <path d="M10 12h4"/>
          </svg>
          <span>낭만보관함</span>
        </button>
        <button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>내정보</span>
        </button>
      </div>
    `;
  };

  // 🚀 [낭만보관함 모달 오픈 / 클로즈 - 100% 에러 방어]
  window.openHistoryModal = function() {
    var planModal = document.getElementById('romanticPlanModal');
    if (planModal) planModal.style.setProperty('display', 'none', 'important');

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

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
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