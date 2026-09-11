
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
        transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1) !important;
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
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .postcard-face-front {
        transform: rotateY(0deg) !important;
        z-index: 2 !important;
      }
      .postcard-face-back {
        transform: rotateY(180deg) !important;
        z-index: 1 !important;
      }

      /* 🎬 [릴스 피드 최적화 고속 렌더링 클래스군] */
      .reel-vertical-container {
        flex: 1 1 0% !important;
        width: 100% !important;
        height: 100% !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scroll-snap-type: y mandatory !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        position: relative !important;
        z-index: 10 !important;
        overscroll-behavior: none !important;
        touch-action: pan-y !important;
      }
      .reel-vertical-container::-webkit-scrollbar { display: none !important; }

      .reel-page-snap {
        width: 100% !important;
        height: 100% !important;
        scroll-snap-align: start !important;
        scroll-snap-stop: always !important;
        position: relative !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: stretch !important;
        padding-top: calc(env(safe-area-inset-top, 0px)) !important;
        padding-bottom: 2px !important; /* 🛡️ 이중 패딩 110px 완전 제거: 하단 독바 위 초밀착 */
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        contain: strict !important;
        content-visibility: auto !important;
        contain-intrinsic-size: 100% 100% !important;
        touch-action: pan-y !important;
        background: #000000 !important;
      }

      .reel-header-row {
        height: 48px !important;
        padding: 0 12px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: #000000 !important;
        flex-shrink: 0 !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
        box-sizing: border-box !important;
      }

   .reel-media-stage {
        flex: 1 1 0% !important;
        min-height: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        background: #000000 !important;
        overflow: hidden !important;
        padding: 0 !important; /* 🛡️ 공백 0%: 좌우 여백 없이 화면 폭 100% 풀밀착 */
        box-sizing: border-box !important;
      }

      .reel-media-stage > div,
      .postcard-3d-wrapper,
      .postcard-face-front,
      .postcard-face-back {
        border-radius: 14px !important; /* 부드러운 모서리 라운드 유지 */
      }

     /* 📷 [가로 슬라이더 사진 규격 - 세로 스크롤 간섭 0% 보장] */
      .reel-horizontal-track {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        width: 100% !important;
        height: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scroll-snap-type: x mandatory !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        box-sizing: border-box !important;
        touch-action: pan-x pan-y !important;
        overscroll-behavior-x: contain !important;
      }
      .reel-horizontal-track::-webkit-scrollbar { display: none !important; }

      .reel-horizontal-track > div {
        flex: 0 0 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        height: 100% !important;
        scroll-snap-align: start !important;
        scroll-snap-stop: always !important;
        position: relative !important;
        overflow: hidden !important;
        display: block !important;
        box-sizing: border-box !important;
      }

      /* 📐 검은 여백 0% 원천 박멸: 풀스크린 꽉 채우기(Cover) 표준 확정 */
      .reel-photo-target {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important; /* 빈틈없이 100% 꽉 채움 */
        object-position: center !important;
        display: block !important;
        pointer-events: none !important;
      }

      .reel-bottom-interactive-bar {
        padding: 4px 16px 8px 16px !important; /* 상하는 4px로 초밀착, 좌우 프레임만 16px 여백 확보 */
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important; /* 별점과 메모 간격 콤팩트화 */
        flex-shrink: 0 !important;
        background: #000000 !important;
        border-top: none !important;
      }

      .reel-memo-fixed-box {
        height: 4.1em !important;
        min-height: 4.1em !important;
        max-height: 4.1em !important;
        line-height: 1.4em !important;
        font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-size: 0.78rem !important;
        font-weight: 450 !important;
        color: #e2e8f0 !important;
        word-break: break-all !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 3 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        letter-spacing: -0.01em !important;
        box-sizing: border-box !important;
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

  // 📐 [가로/세로 스마트 판별 안전 가드 - 214개 콘솔 에러 원천 차단]
  window.applySmartPhotoFit = function(img) {
    if (!img) return;
    var nw = img.naturalWidth;
    var nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      if (nh >= nw) {
        img.classList.add('is-portrait');
        img.style.setProperty('object-fit', 'cover', 'important');
      } else {
        img.classList.remove('is-portrait');
        img.style.setProperty('object-fit', 'contain', 'important');
      }
    }
  };

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
    if (window.RomanticVault && typeof window.RomanticVault.read === 'function') {
      return window.RomanticVault.read(key, defaultVal);
    }
    if (window.__memoryStore && window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
      return window.__memoryStore[key];
    }
    return safeGetJSON(key, defaultVal);
  };

  window.safeSetStorage = function(key, value) {
    var rawObj = (typeof value === 'string' ? JSON.parse(value) : value);
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write(key, rawObj, false);
      return;
    }
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore[key] = rawObj;
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB(key, rawObj);
    }
    if (key !== 'okbm_phone_photos_map' && key !== 'okbm_trip_photos_map') {
      try {
        localStorage.setItem(key, JSON.stringify(rawObj));
      } catch (e) {}
    }
  };

 // 💾 [낭만루트(배낭패킹) 전용 저장 창구]: okbm_router_snaps에는 절대 접근하지 않음
  window.savePackingHistoryRecord = function(record) {
    if (!record) return null;

    var normalized = window.normalizeHistoryRecord(record, 0);
    normalized.feedType = 'route';

    var profile = safeGetJSON('user_profile', null);
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    
    if (!normalized.author || normalized.author === '낭만루터') {
      normalized.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    }
    normalized.userId = userId;

    var list = window.safeGetStorage('okbm_packing_history', []) || [];
    var isExplicitNew = Boolean(record.isNewPost || normalized.isNewPost);

    var existIdx = -1;
    if (!isExplicitNew && normalized.id && !String(normalized.id).startsWith('pack_temp_')) {
      existIdx = list.findIndex(function(it) {
        return it && it.id && String(it.id).trim() === String(normalized.id).trim();
      });
    }

    if (existIdx !== -1 && !isExplicitNew) {
      normalized.id = list[existIdx].id;
      if ((!normalized.photoMemos || normalized.photoMemos.length === 0) && list[existIdx].photoMemos) {
        normalized.photoMemos = list[existIdx].photoMemos;
      }
      if (!normalized.memo && list[existIdx].memo) {
        normalized.memo = list[existIdx].memo;
      }
      if ((!normalized.photos || normalized.photos.length === 0) && list[existIdx].photos) {
        normalized.photos = list[existIdx].photos;
        normalized.photo = list[existIdx].photo || list[existIdx].photos[0];
        normalized.fieldPhoto = normalized.photo;
        normalized.photo_url = normalized.photo;
      }
      list[existIdx] = Object.assign({}, list[existIdx], normalized);
    } else {
      if (!normalized.id || isExplicitNew || normalized.id.startsWith('pack_temp_')) {
        normalized.id = 'pack_' + userId.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      }
      normalized.isNewPost = false;
      list.unshift(normalized);
    }

    // 낭만루터 스냅이 섞여있다면 100% 영구 소거
    list = list.filter(function(it) {
      return it && it.feedType !== 'router' && !String(it.id).startsWith('snap_');
    });

    window.interactiveHistory = list.slice();
    window.packingHistoryList = window.interactiveHistory;
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_packing_history'] = list.slice();

    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_packing_history', list.slice());
    }

    var safeStorageList = list.map(function(item) {
      var cloned = Object.assign({}, item);
      if (cloned.customTemplatePhoto && typeof cloned.customTemplatePhoto === 'string' && cloned.customTemplatePhoto.startsWith('data:')) {
        cloned.customTemplatePhoto = '';
      }
      if (cloned.photo && typeof cloned.photo === 'string' && cloned.photo.startsWith('data:')) {
        cloned.photo = '';
      }
      if (cloned.fieldPhoto && typeof cloned.fieldPhoto === 'string' && cloned.fieldPhoto.startsWith('data:')) {
        cloned.fieldPhoto = '';
      }
      if (cloned.photo_url && typeof cloned.photo_url === 'string' && cloned.photo_url.startsWith('data:')) {
        cloned.photo_url = '';
      }
      if (Array.isArray(cloned.photos)) {
        cloned.photos = cloned.photos.filter(function(u) {
          return typeof u === 'string' && !u.startsWith('data:');
        });
      }
      return cloned;
    });

    try {
      localStorage.setItem('okbm_packing_history', JSON.stringify(safeStorageList));
    } catch (e) {}

    return normalized;
  };

  // 📸 [낭만루터(일상스냅) 전용 독립 저장 창구]: okbm_packing_history에는 절대 진입하지 않음
  window.saveRouterSnapRecord = function(record) {
    if (!record) return null;

    var normalized = window.normalizeHistoryRecord(record, 0);
    normalized.feedType = 'router';

    // 🛑 [루터 다이어트]: 템플릿 및 패킹 스펙 영구 제거 (순수 사진+캡션 규격)
    delete normalized.templateId;
    delete normalized.customTemplatePhoto;
    delete normalized.items;
    delete normalized.weightKg;
    delete normalized.weightGrams;
    delete normalized.itemCount;
    delete normalized.elevation;

    var profile = safeGetJSON('user_profile', null);
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    
    if (!normalized.author || normalized.author === '낭만루터') {
      normalized.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    }
    normalized.userId = userId;

    var snapList = window.safeGetStorage('okbm_router_snaps', []) || [];
    var isExplicitNew = Boolean(record.isNewPost || normalized.isNewPost);

    var existIdx = -1;
    if (!isExplicitNew && normalized.id && !String(normalized.id).startsWith('pack_temp_')) {
      existIdx = snapList.findIndex(function(it) {
        return it && it.id && String(it.id).trim() === String(normalized.id).trim();
      });
    }

    if (existIdx !== -1 && !isExplicitNew) {
      normalized.id = snapList[existIdx].id;
      snapList[existIdx] = Object.assign({}, snapList[existIdx], normalized);
    } else {
      if (!normalized.id || isExplicitNew || normalized.id.startsWith('pack_temp_')) {
        normalized.id = 'snap_' + userId.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      }
      normalized.isNewPost = false;
      snapList.unshift(normalized);
    }

    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_router_snaps'] = snapList.slice();

    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_router_snaps', snapList.slice());
    }

    var safeSnapList = snapList.map(function(item) {
      var cloned = Object.assign({}, item);
      if (cloned.photo && typeof cloned.photo === 'string' && cloned.photo.startsWith('data:')) cloned.photo = '';
      if (cloned.fieldPhoto && typeof cloned.fieldPhoto === 'string' && cloned.fieldPhoto.startsWith('data:')) cloned.fieldPhoto = '';
      if (cloned.photo_url && typeof cloned.photo_url === 'string' && cloned.photo_url.startsWith('data:')) cloned.photo_url = '';
      if (Array.isArray(cloned.photos)) {
        cloned.photos = cloned.photos.filter(function(u) { return typeof u === 'string' && !u.startsWith('data:'); });
      }
      return cloned;
    });

    try {
      localStorage.setItem('okbm_router_snaps', JSON.stringify(safeSnapList));
    } catch (e) {}

    return normalized;
  };
  // 🔄 [앱 구동 즉시 폰의 IndexedDB 사진 맵 및 R2 공용 스냅/피드 초고속 선제 장전]
  (async function preloadIndexedDbToMemory() {
    // ⚡ [0.03초 선제 인출]: 비로그인 게스트 접속 즉시 R2 router_snaps.json 메모리 직통 장전
    try {
      var r2Base = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
      fetch(r2Base.replace(/\/+$/, '') + '/router_snaps.json?_t=' + Date.now())
        .then(function(res) { return res.ok ? res.json() : []; })
        .then(function(snaps) {
          if (Array.isArray(snaps) && snaps.length > 0) {
            window.__allLoadedRouterSnaps = snaps;
            localStorage.setItem('okbm_cached_router_snaps', JSON.stringify(snaps));
            if (window.activeHistoryFeedTab === 'router' && typeof window.renderHistoryStage === 'function') {
              window.renderHistoryStage();
            }
          }
        }).catch(function() {});
    } catch (e) {}

    try {
      var idbPhotosMap = await window.loadFromIndexedDB('okbm_phone_photos_map');
      if (idbPhotosMap && typeof idbPhotosMap === 'object') {
        window.__memoryStore['okbm_phone_photos_map'] = idbPhotosMap;
      }

      var idbTmplMap = await window.loadFromIndexedDB('okbm_custom_templates_map');
      if (idbTmplMap && typeof idbTmplMap === 'object') {
        window.__memoryStore['okbm_custom_templates_map'] = idbTmplMap;
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
          if (!norm.customTemplatePhoto && idbTmplMap) {
            var foundTmpl = idbTmplMap[String(norm.id)] || idbTmplMap[String(norm.date)] || idbTmplMap[String(norm.date).replace(/[-/]/g, '.')];
            if (foundTmpl) norm.customTemplatePhoto = foundTmpl;
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
// 📷 [폰 내장 DB(IndexedDB)에서 사진을 100% 안전하게 꺼내오는 탐색기 - R2 글로벌 CDN 1순위 보장]
  function getRecordPhotos(record) {
    if (!record) return [];
    var rawList = [];

    // ⚡ [0순위 확정]: 서버 DB에서 문자열(photos_json)로 넘어온 경우 즉시 JSON.parse 복원
    if (typeof record.photos === 'string' && record.photos.trim().startsWith('[')) {
      try { record.photos = JSON.parse(record.photos); } catch(e) {}
    }
    if (typeof record.photos_json === 'string' && record.photos_json.trim().startsWith('[')) {
      try {
        var parsedPhotos = JSON.parse(record.photos_json);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          rawList = parsedPhotos.filter(function(u) { return typeof u === 'string' && u.trim().length > 10; });
        }
      } catch(e) {}
    }

    // ⚡ [1순위 확정]: 레코드 자체의 클라우드/R2 CDN 주소 인출
    if (rawList.length === 0 && Array.isArray(record.photos) && record.photos.length > 0) {
      rawList = record.photos.filter(function(u) { return typeof u === 'string' && u.trim().length > 10; });
    }
    if (rawList.length === 0 && record.photo_url && String(record.photo_url).trim().length > 10) {
      rawList = [String(record.photo_url).trim()];
    }
    if (rawList.length === 0 && record.photo && String(record.photo).trim().length > 10) {
      rawList = [String(record.photo).trim()];
    }
    if (rawList.length === 0 && record.fieldPhoto && String(record.fieldPhoto).trim().length > 10) {
      rawList = [String(record.fieldPhoto).trim()];
    }

    // 📡 [2순위 폴백]: 오프라인 기기 로컬 캐시 및 IndexedDB 메모리 맵 전방위 탐색
    if (rawList.length === 0) {
      var rId = String(record.id || '').trim();
      var cleanPureId = rId.split(';')[0].trim();
      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
        savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
      }

      var localPhotos = (cleanPureId && savedPhotosMap[cleanPureId]) || 
                        (rId && savedPhotosMap[rId]) ||
                        (record.date && savedPhotosMap[String(record.date)]) ||
                        (record.date && savedPhotosMap[String(record.date).replace(/[-/]/g, '.')]);

      if (Array.isArray(localPhotos) && localPhotos.length > 0) rawList = localPhotos.filter(Boolean);
      else if (typeof localPhotos === 'string' && localPhotos.trim().length > 10) rawList = [localPhotos.trim()];
    }

    // 🌟 [전 브라우저 엑박 원천 차단 & 고화질 링크 정규화]
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

 // 🔄 [히스토리 레코드 정규화 엔진 - 한국 표준시/GMT/ISO 정밀 파서 및 스팟 표준화]
  window.normalizeHistoryRecord = function(r, idx) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();

    if (r && r.date) {
      var dateStr = String(r.date).trim();
      var parsedDate = new Date(dateStr);

      if (!isNaN(parsedDate.getTime()) && (dateStr.includes('GMT') || dateStr.includes('T') || dateStr.includes('-') || /[a-zA-Z]/.test(dateStr))) {
        y = parsedDate.getFullYear();
        m = parsedDate.getMonth() + 1;
        d = parsedDate.getDate();
      } else {
        var parts = dateStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            y = parseInt(parts[2], 10);
            m = parseInt(parts[0], 10);
            d = parseInt(parts[1], 10);
          }
        }
      }
    } else if (r && r.year && r.month && r.day) {
      y = parseInt(r.year, 10);
      m = parseInt(r.month, 10);
      d = parseInt(r.day, 10);
    }

    // 🛡️ [미래 날짜 작성 원천 차단 가드]: 오늘 자정을 초과하는 미래 날짜는 현재 오늘 날짜로 강제 정규화
    var checkDateObj = new Date(y, m - 1, d);
    var todayLimit = new Date();
    todayLimit.setHours(23, 59, 59, 999);

    if (checkDateObj.getTime() > todayLimit.getTime()) {
      var realNow = new Date();
      y = realNow.getFullYear();
      m = realNow.getMonth() + 1;
      d = realNow.getDate();
    }

    var cleanDate = y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0');
    var recordId = (r && r.id) ? String(r.id) : ('pack_' + cleanDate.replace(/\D/g, '') + '_' + idx);
    var savedTmplPhoto = (r && r.customTemplatePhoto) ? String(r.customTemplatePhoto).trim() : '';
    if (!savedTmplPhoto && window.__memoryStore && window.__memoryStore['okbm_custom_templates_map']) {
      savedTmplPhoto = window.__memoryStore['okbm_custom_templates_map'][recordId] || window.__memoryStore['okbm_custom_templates_map'][cleanDate] || '';
    }

   var rawPhotos = getRecordPhotos(r);
    // 🛡️ 스튜디오 뒷면 카드가 존재하는 경우: 현장 일지(photoMemos)가 작성되기 전까지는 앞면 사진을 100% 비움
    if (savedTmplPhoto) {
      if (!r.photoMemos || r.photoMemos.length === 0) {
        rawPhotos = [];
      } else {
        rawPhotos = rawPhotos.filter(function(u) { return u && u !== savedTmplPhoto; });
      }
    }

    var rawList = Array.isArray(r.items) ? r.items : (Array.isArray(r.gears) ? r.gears : []);

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

    // 🏷️ [낭만루트 vs 낭만루터 절대 철칙 판별 엔진 - R2 정본 완벽 포용]
    var isSnapRecord = Boolean(
      (recordId && String(recordId).startsWith('snap_')) ||
      (r && (r.feedType === 'router' || r.isRouterSnap === true))
    );
    var resolvedFeedType = isSnapRecord ? 'router' : 'route';

    var resolvedAuthorPhoto = (r && (r.authorPhoto || r.author_photo || r.photoUrl || r.user_photo || r.userPhoto)) ? String(r.authorPhoto || r.author_photo || r.photoUrl || r.user_photo || r.userPhoto).trim() : '';
    return {
      id: recordId,
      feedType: resolvedFeedType,
      author: currentAuthor,
      authorPhoto: resolvedAuthorPhoto,
      templateId: (r && r.templateId !== undefined && r.templateId !== null) ? parseInt(r.templateId, 10) : savedTmplId,
      customTemplatePhoto: savedTmplPhoto,
      date: cleanDate,
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
      photoMemos: (r && Array.isArray(r.photoMemos)) ? r.photoMemos : [],
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

  // 👤 [마이데이터 유저 프로필 SSOT 맵 & 실시간 백그라운드 인출기]
  window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};

  window.resolveUserMasterPhoto = function(userId, authorName, fallbackPhoto) {
    var uId = String(userId || '').trim();
    if (!uId || uId === 'guest') return fallbackPhoto || '';

    if (window.__userProfilePhotoMap[uId]) {
      return window.__userProfilePhotoMap[uId];
    }

    var profile = safeGetJSON('user_profile', null);
    var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    if (myId && uId === myId) {
      var myCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
      if (myCover && String(myCover).startsWith('http')) {
        window.__userProfilePhotoMap[uId] = myCover;
        return myCover;
      }
    }

    if (fallbackPhoto && String(fallbackPhoto).startsWith('http')) {
      window.__userProfilePhotoMap[uId] = fallbackPhoto;
    }

    // 비로그인 상태: R2 유저 정본(users/user_{id}.json) 백그라운드 0.03초 인출 및 아바타 DOM 즉시 주입
    var r2Domain = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
    fetch(r2Domain + '/users/user_' + encodeURIComponent(uId) + '.json?_t=' + Date.now())
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(uData) {
        if (uData && (uData.heroCoverUrl || uData.photoUrl)) {
          var remoteUrl = uData.heroCoverUrl || uData.photoUrl;
          window.__userProfilePhotoMap[uId] = remoteUrl;
          document.querySelectorAll('[data-user-avatar-id="' + uId + '"]').forEach(function(imgEl) {
            imgEl.src = remoteUrl;
            imgEl.style.display = 'block';
            var placeholder = imgEl.parentElement ? imgEl.parentElement.querySelector('.avatar-placeholder-svg') : null;
            if (placeholder) placeholder.style.display = 'none';
          });
        }
      }).catch(function() {});

    return window.__userProfilePhotoMap[uId] || fallbackPhoto || '';
  };

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

    // 🌟 [뒷면 포토 카드 우선 바인딩]: 스튜디오 완성 사진이 있으면 뒷면에 1:1 풀프레임 렌더링
    var customTmplImg = cur.customTemplatePhoto;
    if (!customTmplImg && window.__memoryStore && window.__memoryStore['okbm_custom_templates_map']) {
      customTmplImg = window.__memoryStore['okbm_custom_templates_map'][String(cur.id)] || window.__memoryStore['okbm_custom_templates_map'][String(cur.date)];
    }

    var backTemplateContentHtml = '';
    if (customTmplImg && String(customTmplImg).trim().length > 10) {
      backTemplateContentHtml = `<div style="position:absolute; inset:0; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <img src="${escapeHtml(customTmplImg)}" style="width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />
      </div>`;
    } else {
      backTemplateContentHtml = hasValidPhoto
        ? `<img src="${rawPhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.88);" />
           <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%);"></div>`
      : `<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; box-sizing:border-box; text-align:center;">
            <div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px dashed rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div style="font-size:0.80rem; font-weight:900; color:#e2e8f0;">등록된 현장 사진이 없습니다.</div>
            <div style="font-size:0.60rem; color:#94a3b8; line-height:1.4;">하단 [···] 메뉴에서<br>현장 사진을 추가해보세요!</div>
          </div>`;
    }

    return `
      <div id="swipePostcardTarget" class="postcard-3d-wrapper ${isFlipped ? 'flipped' : ''}" style="width:100%; max-width:280px; aspect-ratio:3/4; position:relative; cursor:pointer; touch-action:pan-y; overscroll-behavior:contain; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; padding:2px; border-radius:15px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.85); box-sizing:border-box;">
        <div class="postcard-face-front" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; overflow:hidden; border-radius:13px; background:#0b0f19;">
          ${frontContentHtml}
        </div>
        <div class="postcard-face-back" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; background:#000; border-radius:13px; overflow:hidden; position:relative;">
          ${backTemplateContentHtml}
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

  // 📱 [지난 피드 목록 모달 & 다중 체크 일괄 삭제 통합 엔진 - 낭만일지 3단 필터 & 영수증 뱃지 완전 제거]
  window.__isPastTripsSelectMode = false;
  window.__selectedPastTripIds = new Set();
  window.__pastTripsPublishFilter = window.__pastTripsPublishFilter || 'all';

  window.togglePastTripsPublishFilter = function(targetFilter) {
    if (window.__pastTripsPublishFilter === targetFilter) {
      window.__pastTripsPublishFilter = 'all';
    } else {
      window.__pastTripsPublishFilter = targetFilter;
    }
    triggerHaptic(10);
    window.openPastTripsListModal();
  };

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
    var confirmMsg = '선택한 ' + selectedCount + '개의 출발 기록을 삭제하시겠습니까?\n' +
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

    // 🛡️ 영구 삭제 블랙리스트 갱신
    var deletedIds = safeGetJSON('okbm_deleted_record_ids', []);
    idsToDelete.forEach(function(delId) {
      if (!deletedIds.includes(delId)) deletedIds.push(delId);
    });
    localStorage.setItem('okbm_deleted_record_ids', JSON.stringify(deletedIds));

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
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

    // 🗑️ 스냅 전용 금고(메모리, localStorage, IndexedDB)에서도 일괄 영구 소거
    var currentSnaps = window.safeGetStorage('okbm_router_snaps', []) || [];
    var remainingSnaps = currentSnaps.filter(function(s) { return s && !idsToDelete.has(String(s.id).trim()); });
    if (window.__memoryStore) window.__memoryStore['okbm_router_snaps'] = remainingSnaps;
    window.safeSetStorage('okbm_router_snaps', remainingSnaps);
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_router_snaps', remainingSnaps);
    }

    window.__tombstoneHistoryQueue = remainingList.concat(tombstones);

    window.interactiveHistory = remainingList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', remainingList);

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

      // 🔍 [나만보기 / 함께보기 / 전체보기 필터링]
      var currentFilter = window.__pastTripsPublishFilter || 'all';
      if (currentFilter === 'private') {
        logs = logs.filter(function(r) { return r && r.isPublished !== true; });
      } else if (currentFilter === 'public') {
        logs = logs.filter(function(r) { return r && r.isPublished === true; });
      }

      var isSelectMode = Boolean(window.__isPastTripsSelectMode);

      var modalEl = document.createElement('div');
      modalEl.id = 'pastTripsListModal';
      modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); width:100%; max-width:100%; background:#000000; z-index:1000010 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

      if (typeof window.ensureMasterBottomDock === 'function') {
        window.ensureMasterBottomDock('history');
      }

      var cardsHtml = '';
      if (logs.length === 0) {
        cardsHtml = '<div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem;">기록이 없습니다.</div>';
      } else {
        cardsHtml = logs.map(function(r) {
          if (!r) return '';
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
                '</div>' +
                '<div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">' + dateText + (elevText ? ' · ' + elevText : '') + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="text-align:right; flex-shrink:0; margin-left:8px;">' +
              '<span style="font-size:0.86rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightStr + 'kg</span>' +
              (!isSelectMode ? '<span style="font-size:0.60rem; color:#38bdf8; font-weight:800; display:block; margin-top:2px;">' : '') +
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

      var isPrivateActive = (currentFilter === 'private');
      var isPublicActive = (currentFilter === 'public');

      modalEl.innerHTML = `
        <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="window.closePastTripsListModal(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">낭만일지</span>
          </div>
          ${headerRightHtml}
        </div>

        <!-- 🔒 나만보기 / 🌐 함께보기 토글 바 (둘 다 끄면 전체보기) -->
        <div style="flex-shrink:0; padding:8px 14px; background:#000000; display:flex; gap:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <button type="button" onclick="window.togglePastTripsPublishFilter('private');" style="flex:1; height:32px; border-radius:8px; font-size:0.74rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; transition:all 0.15s ease; background:${isPrivateActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isPrivateActive ? '#38bdf8' : 'rgba(255,255,255,0.12)'}; color:${isPrivateActive ? '#38bdf8' : '#94a3b8'};">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px;" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>나만보기</span>
          </button>
          <button type="button" onclick="window.togglePastTripsPublishFilter('public');" style="flex:1; height:32px; border-radius:8px; font-size:0.74rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; transition:all 0.15s ease; background:${isPublicActive ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isPublicActive ? '#34d399' : 'rgba(255,255,255,0.12)'}; color:${isPublicActive ? '#34d399' : '#94a3b8'};">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px;" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>함께보기</span>
          </button>
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
          ${cardsHtml}
        </div>

        <div id="pastTripsBatchDeleteBar" style="display:none; position:fixed; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); left:0; right:0; max-width:440px; margin:0 auto; padding:10px 14px; background:rgba(15,23,42,0.95); backdrop-filter:blur(10px); border-top:1.5px solid #f43f5e; box-sizing:border-box; z-index:1000004;">
          <button type="button" onclick="window.executeBatchDeletePastTrips();" style="width:100%; height:44px; background:linear-gradient(135deg, #f43f5e, #be123c); border:none; border-radius:10px; color:#fff; font-size:0.84rem; font-weight:900; cursor:pointer; box-shadow:0 4px 14px rgba(244,63,94,0.4); display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#ffffff; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span id="pastTripsBatchDeleteCountText">선택한 기록 영구 삭제</span>
          </button>
        </div>
      `;

      document.body.appendChild(modalEl);
      triggerHaptic(12);
    } catch (err) {
      console.error('[OpenPastTripsListModal Error]', err);
    }
  };

// 🌟 [1. 낭만별(좋아요) 실시간 토글 & 클라우드 백엔드 연동 엔진]
  window.toggleFeedStar = function(cardId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!cardId) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      triggerHaptic(12);
      if (typeof showToast === 'function') showToast('🔒 낭만별(좋아요)은 카카오 로그인 후 누르실 수 있습니다.', 'info', 2200);
      if (typeof openLoginModal === 'function') openLoginModal();
      return;
    }

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

    // 🌟 낭만루트(route)인 경우에만 홈 화면 히어로 랭킹 큐에 실시간 반영 (낭만루터 일상스냅은 연동 차단)
    var targetCard = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === sId; });
    if (!targetCard && Array.isArray(window.__allLoadedFeeds)) {
      targetCard = window.__allLoadedFeeds.find(function(r) { return String(r.id).trim() === sId; });
    }
    if (targetCard && targetCard.feedType !== 'router' && Array.isArray(window.heroTopRecords)) {
      var hItem = window.heroTopRecords.find(function(h) { return String(h.id).trim() === sId; });
      if (hItem) {
        hItem.likes = currentCount;
        if (typeof window.renderCurrentHeroCard === 'function') window.renderCurrentHeroCard();
      }
    }

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

    // ⚡ [별점 신호 정밀 전송]: 반전된 최종 상태(!isStarred)를 정확한 true/false 불리언으로 전달
    var nextStarState = !isStarred;

    (async function syncStarToCloud() {
      try {
        var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'TOGGLE_FEED_STAR',
            feedId: sId,
            id: sId,
            isStarred: nextStarState,
            userId: localStorage.getItem('okbm_user_id') || 'guest'
          })
        }).catch(function() {});
      } catch (err) {
        console.warn('[RomanticHistory] 별점 동기화 예외:', err);
      }
    })();
  };

// 🔗 [2. 스마트 멀티 공유 모달 엔진 - 3대 핵심 채널 최적화]
  window.shareCurrentFeed = function(recordId, spotName, memoText) {
    triggerHaptic(10);
    var cleanId = String(recordId || '').trim();
    var cleanSpot = String(spotName || '자연 속 힐링 기록').split('(')[0].trim();
    var shareUrl = location.origin + location.pathname + '?feed=' + encodeURIComponent(cleanId);
    var shareTitle = '🏕️ 낭만루트 - ' + cleanSpot;
    var shareDesc = (memoText && memoText.trim().length > 0) ? memoText.trim().slice(0, 100) : '배낭을 메고 자연으로 떠난 낭만 기록을 확인해보세요.';

    var old = document.getElementById('feedCustomShareModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'feedCustomShareModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000080; display:flex; justify-content:center; align-items:flex-end; box-sizing:border-box;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div style="width:100%; max-width:440px; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.35); border-radius:20px 20px 0 0; padding:18px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 -15px 40px rgba(0,0,0,0.85);" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">피드 공유하기</span>
            <span style="font-size:0.68rem; color:#38bdf8; font-weight:800; margin-top:2px;">[${escapeHtml(cleanSpot)}]</span>
          </div>
          <button type="button" onclick="document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:10px 0 6px 0;">
          <!-- 1. 카카오톡 -->
          <button type="button" onclick="window.sendFeedToKakaoTalk('${escapeHtml(shareTitle)}', '${escapeHtml(shareDesc)}', '${shareUrl}'); document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:#fee500; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(254,229,0,0.25);">
              <svg viewBox="0 0 24 24" style="width:26px; height:26px; fill:#191919;"><path d="M12 3c-5.52 0-10 3.48-10 7.78 0 2.76 1.84 5.18 4.62 6.55l-1.18 4.34c-.11.4.34.73.69.5l5.06-3.34c.27.03.54.04.81.04 5.52 0 10-3.48 10-7.78 0-4.3-4.48-7.78-10-7.78z"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">카카오톡</span>
          </button>

          <!-- 2. 인스타그램 -->
          <button type="button" onclick="window.sendFeedToInstagram('${shareUrl}'); document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(220,39,67,0.3);">
              <svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:#ffffff;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">인스타그램</span>
          </button>

          <!-- 3. 링크 복사 -->
          <button type="button" onclick="window.copyShareLinkFallback('${shareUrl}'); document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.4);">
              <svg viewBox="0 0 24 24" style="width:22px; height:22px; stroke:#38bdf8; fill:none; stroke-width:2.2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">링크 복사</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  // 🔗 [최신 웹 표준 스마트 공유 엔진]
  window.copyShareLinkFallback = function(url) {
    if (!url) return;
    triggerHaptic(12);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function() {
        if (typeof showToast === 'function') showToast('✓ 피드 링크가 복사되었습니다!', 'success', 2200);
      }).catch(function() {
        fallbackExecCopy(url);
      });
    } else {
      fallbackExecCopy(url);
    }
  };

  function fallbackExecCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (typeof showToast === 'function') showToast('✓ 피드 링크가 복사되었습니다!', 'success', 2200);
    } catch (err) {}
    document.body.removeChild(ta);
  }

  window.sendFeedToKakaoTalk = function(title, desc, url) {
    triggerHaptic(12);
    if (typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized() && Kakao.Share) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'text',
          text: title + '\n\n“' + desc + '”\n\n낭만루트에서 확인하기 ➔',
          link: { mobileWebUrl: url, webUrl: url }
        });
        return;
      } catch (e) {}
    }
    window.copyShareLinkFallback(url);
  };

  window.sendFeedToInstagram = function(url) {
    triggerHaptic(12);
    window.copyShareLinkFallback(url);
    if (typeof showToast === 'function') {
      showToast('📸 피드 링크 복사 완료! 인스타그램으로 이동합니다.', 'success', 2400);
    }
    setTimeout(function() {
      // 모바일 기기 감지: 앱 설치 시 인스타 앱 실행, 미설치 또는 PC 시 인스타 웹 오픈
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'instagram://app';
        setTimeout(function() {
          window.open('https://www.instagram.com', '_blank');
        }, 1200);
      } else {
        window.open('https://www.instagram.com', '_blank');
      }
    }, 400);
  };

  window.triggerNativeShare = function(title, desc, url) {
    triggerHaptic(10);
    if (navigator.share) {
      navigator.share({
        title: title,
        text: desc,
        url: url
      }).catch(function(err) {
        if (err && err.name !== 'AbortError') {
          window.copyShareLinkFallback(url);
        }
      });
    } else {
      window.copyShareLinkFallback(url);
    }
  };

 // ⚙️ [방탄 디바운스 락 & 스크롤 튕김 0% 엔진]: 공개/비공개 다중 클릭 충돌 원천 차단
  window.__publishDebounceTimers = window.__publishDebounceTimers || {};

  window.toggleFeedPublishStatus = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!recordId) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      triggerHaptic(12);
      if (typeof showToast === 'function') showToast('🔒 기록 관리는 로그인 후 이용하실 수 있습니다.', 'info', 2200);
      if (typeof openLoginModal === 'function') openLoginModal();
      return;
    }

    var sId = String(recordId).trim();
    var isSnap = sId.startsWith('snap_');

    var rawList = [];
    var snapList = [];
    var target = null;

    if (isSnap) {
      snapList = window.safeGetStorage('okbm_router_snaps', []) || [];
      target = snapList.find(function(r) { return r && String(r.id).trim() === sId; });
    } else {
      rawList = window.safeGetStorage('okbm_packing_history', []) || [];
      if (window.interactiveHistory && window.interactiveHistory.length > 0) {
        rawList = window.interactiveHistory;
      }
      target = rawList.find(function(r) { return r && String(r.id).trim() === sId; });
      if (!target) {
        target = rawList.find(function(r, idx) {
          return String(idx) === sId || (r.date && String(r.date).replace(/[-/]/g, '') === sId);
        });
      }
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
      return;
    }

    // 1. 상태 즉시 반전 (0.001초 로컬 확정)
    var nextStatus = !(target.isPublished === true);
    target.isPublished = nextStatus;

    // 2. 해당 전용 저장소(스냅 vs 루트)에 즉시 격리 동기화
    if (isSnap) {
      if (window.__memoryStore) window.__memoryStore['okbm_router_snaps'] = snapList.slice();
      window.safeSetStorage('okbm_router_snaps', snapList.slice());
      try { localStorage.setItem('okbm_router_snaps', JSON.stringify(snapList)); } catch(e) {}
    } else {
      window.interactiveHistory = rawList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
      window.packingHistoryList = window.interactiveHistory;
      if (window.__memoryStore) {
        window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
      }
      window.safeSetStorage('okbm_packing_history', rawList);
    }

    // 공용 피드 캐시 즉시 반영 (비공개 시 제거, 공개 시 등록)
    if (Array.isArray(window.__allLoadedFeeds)) {
      if (!nextStatus) {
        window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) { return String(f.id).trim() !== sId; });
      } else {
        if (!window.__allLoadedFeeds.some(function(f) { return String(f.id).trim() === sId; })) {
          window.__allLoadedFeeds.unshift(target);
        }
      }
      localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(window.__allLoadedFeeds));
    }

    // 3. 🎯 [스크롤 튕김 제로]: 전체 화면을 다시 그리지 않고 해당 카드의 아이콘만 그 자리에서 교체
    var lockBtn = document.querySelector('[data-lock-btn-id="' + sId + '"]');
    if (lockBtn) {
      if (nextStatus) {
        lockBtn.setAttribute('title', '공개 중');
        lockBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#34d399;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>';
      } else {
        lockBtn.setAttribute('title', '비공개 (나만보기)');
        lockBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      }
      lockBtn.style.transform = 'scale(1.25)';
      setTimeout(function() { if (lockBtn) lockBtn.style.transform = 'scale(1)'; }, 150);
    }

    // 점점점 액션시트가 열려있다면 내부 버튼 UI도 즉시 교체
    var actionSheetBtn = document.getElementById('sheetTogglePublishBtn_' + sId);
    if (actionSheetBtn) {
      actionSheetBtn.style.color = nextStatus ? '#38bdf8' : '#cbd5e1';
      actionSheetBtn.style.borderColor = nextStatus ? '#38bdf8' : 'rgba(255,255,255,0.15)';
      actionSheetBtn.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><span>' + (nextStatus ? '🌐' : '🔒') + '</span><span>' + (nextStatus ? '전체 피드에 공개 중' : '현재 나만보기 (비공개)') + '</span></div><span style="font-size:0.68rem; color:' + (nextStatus ? '#38bdf8' : '#fde047') + '; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">' + (nextStatus ? '비공개 전환 ➔' : '전체 공개하기 ➔') + '</span>';
    }

    triggerHaptic(12);
    if (typeof showToast === 'function') {
      showToast(nextStatus ? '🌐 [전체공개]로 전환되었습니다.' : '🔒 [나만보기]로 전환되었습니다.', 'info', 1600);
    }

    // 4. 🛡️ [디바운스 락 600ms]: 사용자가 10번 연타해도 마지막 최종 1회만 서버로 전송
    clearTimeout(window.__publishDebounceTimers[sId]);
    window.__publishDebounceTimers[sId] = setTimeout(function() {
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
        <button type="button" id="sheetTogglePublishBtn_${log.id}" onclick="document.getElementById('tripActionActionSheet').remove(); window.toggleFeedPublishStatus('${log.id}', event);" style="width:100%; height:42px; background:${isPub ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isPub ? '#38bdf8' : 'rgba(255,255,255,0.15)'}; border-radius:10px; color:${isPub ? '#38bdf8' : '#cbd5e1'}; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:0 14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${isPub ? '🌐' : '🔒'}</span>
            <span>${isPub ? '전체 피드에 공개 중' : '현재 나만보기 (비공개)'}</span>
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
    // 🎯 [끝낸 자리 스크롤 유지]: 삭제 전 현재 보고 있던 카드의 다음 또는 이전 카드 ID 확보
    var container = document.getElementById('reelsVerticalContainer');
    var targetScrollId = null;
    if (container) {
      var allSnapCards = Array.from(container.querySelectorAll('.reel-page-snap'));
      var sTargetId = 'feedSnapCard_' + String(recordId).trim();
      var curIdx = allSnapCards.findIndex(function(el) { return el.id === sTargetId; });
      if (curIdx !== -1) {
        var nextEl = allSnapCards[curIdx + 1] || allSnapCards[curIdx - 1];
        if (nextEl) targetScrollId = nextEl.id;
      }
    }

    var sId = String(recordId).trim();
    if (!sId) return;

    // 🛡️ [제6헌법 준수]: 삭제 즉시 영구 블랙리스트(툼스톤)에 각인 (새로고침 시 R2 캐시 유입 원천 차단)
    var deletedIds = safeGetJSON('okbm_deleted_record_ids', []);
    if (!deletedIds.includes(sId)) {
      deletedIds.push(sId);
      localStorage.setItem('okbm_deleted_record_ids', JSON.stringify(deletedIds));
      if (window.__memoryStore) window.__memoryStore['okbm_deleted_record_ids'] = deletedIds;
    }

    var rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    var target = rawList.find(function(r) { return r && String(r.id).trim() === sId; });
    var targetDate = target ? target.date : '';

    // 1. 스마트폰 내부 IndexedDB 및 메모리 사진 맵 영구 소거
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
      savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
    }
    if (sId && savedPhotosMap[sId]) delete savedPhotosMap[sId];
    if (targetDate && savedPhotosMap[targetDate]) delete savedPhotosMap[targetDate];
    if (targetDate && savedPhotosMap[targetDate.replace(/[-/]/g, '.')]) delete savedPhotosMap[targetDate.replace(/[-/]/g, '.')];
    
    window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

    // 2. 보관함 및 일상 스냅 금고 영구 소거
    var filtered = rawList.filter(function(r) { return r && String(r.id).trim() !== sId; });
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

    // 🗑️ 루터 스냅 전용 저장소(메모리, 로컬, IndexedDB) 완전 영구 파기 및 툼스톤 등록
    // 🗑️ 루터 스냅 전용 저장소(메모리, 로컬, IndexedDB) 완전 영구 파기 및 툼스톤 등록
    var currentSnaps = window.safeGetStorage('okbm_router_snaps', []) || [];
    var filteredSnaps = currentSnaps.filter(function(s) { return s && String(s.id).trim() !== sId; });
    if (window.__memoryStore) window.__memoryStore['okbm_router_snaps'] = filteredSnaps;
    window.safeSetStorage('okbm_router_snaps', filteredSnaps);
    try { localStorage.setItem('okbm_router_snaps', JSON.stringify(filteredSnaps)); } catch(e) {}
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_router_snaps', filteredSnaps);
    }

    // 🛑 공용 피드 캐시에서도 해당 스냅 즉각 제거
    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) { return f && String(f.id).trim() !== sId; });
      localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(window.__allLoadedFeeds));
    }

    // ☁️ R2 유저 파일(users/user_...json)에서도 삭제 상태를 즉시 덮어쓰도록 강제 동기화
    if (sId.startsWith('snap_') && typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(false);
    }

    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) { return f && String(f.id).trim() !== sId; });
      localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(window.__allLoadedFeeds));
    }
    if (Array.isArray(window.heroTopRecords)) {
      window.heroTopRecords = window.heroTopRecords.filter(function(f) { return f && String(f.id).trim() !== sId; });
      window.currentHeroCardIndex = 0;
      if (typeof window.renderCurrentHeroCard === 'function') {
        window.renderCurrentHeroCard();
      }
    }

    // 3. 서버(시트 및 R2)로 영구 삭제 비동기 전파 (큐를 즉시 비우지 않고 안전 지연)
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
    setTimeout(function() { window.__tombstoneHistoryQueue = null; }, 4000);

    if (typeof window.deleteFeedFromCommunity === 'function') {
      window.deleteFeedFromCommunity(sId, targetDate);
    }

   var hadPastModal = Boolean(document.getElementById('pastTripsListModal'));
    var single = document.getElementById('singleTripFeedModal');
    if (single) single.remove();

    // 🎯 [화면 고정]: 삭제된 대상이 루터 스냅이면 루터 탭 유지
    if (sId.startsWith('snap_')) {
      window.activeHistoryFeedTab = 'router';
    }

    if (hadPastModal) {
      if (typeof window.openPastTripsListModal === 'function') {
        window.openPastTripsListModal();
      }
    } else {
      window.renderHistoryStage();
      // 🚀 삭제 직후 끝낸 자리(다음 카드)로 뷰포트 즉시 복원
      if (targetScrollId) {
        setTimeout(function() {
          var targetCardEl = document.getElementById(targetScrollId);
          if (targetCardEl) {
            targetCardEl.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }, 40);
      }
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('기록이 삭제되었습니다.', 'info');
  };
// 🗺️ [전국 마스터 박지 DB 실시간 대조 & 지도 직통 이동 엔진]
  window.isSpotRegisteredInMasterDB = function(rawSpotName) {
    if (!rawSpotName) return false;
    var clean = String(rawSpotName)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase()
      .trim();

    if (!clean || clean === '나의힐링스팟' || clean === '힐링박지' || clean === '방문스팟') return false;

    var pool = [];
    if (Array.isArray(window.campingSpots)) pool = pool.concat(window.campingSpots);
    if (Array.isArray(window.spotsData)) pool = pool.concat(window.spotsData);
    if (Array.isArray(window.allSpots)) pool = pool.concat(window.allSpots);
    if (Array.isArray(window.masterSpots)) pool = pool.concat(window.masterSpots);
    if (Array.isArray(window.CAMPING_SPOTS)) pool = pool.concat(window.CAMPING_SPOTS);
    if (Array.isArray(window.SPOTS_DB)) pool = pool.concat(window.SPOTS_DB);

    ['okbm_spots_cache', 'okbm_master_spots', 'camping_spots', 'okbm_spots'].forEach(function(k) {
      try {
        var item = localStorage.getItem(k);
        if (item) {
          var parsed = JSON.parse(item);
          if (Array.isArray(parsed)) pool = pool.concat(parsed);
        }
      } catch (e) {}
    });

    return pool.some(function(s) {
      if (!s) return false;
      var sName = String(s.name || s.spotName || s.spot || s.title || '').replace(/\s+/g, '').toLowerCase().trim();
      if (!sName || sName === '나의힐링스팟' || sName === '힐링박지') return false;
      return (sName === clean || clean.includes(sName) || sName.includes(clean));
    });
  };

  window.navigateToSpotMap = function(rawSpotName, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!rawSpotName) return;
    triggerHaptic(12);

    var cleanSpot = String(rawSpotName)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpot || cleanSpot === '나의 힐링 스팟' || cleanSpot === '힐링 박지') {
      if (typeof showToast === 'function') showToast('정확한 박지 위치 정보가 등록되지 않았습니다.', 'info', 1800);
      return;
    }

    try {
      localStorage.setItem('okbm_target_map_spot', cleanSpot);
      sessionStorage.setItem('okbm_last_feed_return', location.href);
    } catch (err) {}

    if (typeof showToast === 'function') {
      showToast('📍 [' + cleanSpot + '] 지도로 이동합니다.', 'info', 1200);
    }

    setTimeout(function() {
      if (typeof window.closeHistoryModal === 'function') window.closeHistoryModal();
      location.href = 'map.html?spot=' + encodeURIComponent(cleanSpot);
    }, 120);
  };

 // 👤 [특정 작성자 피드 모아보기 전담 모달 엔진 - 하단 단일 진실 공급원(SSOT) 통합 완료]
// 📖 [단일 피드 카드 마크업 생성기 - 각 사진별 120자 캡션 1:1 결합 렌더러]
  window.buildSingleFeedCardHtml = function(log) {
    if (!log) return '';
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = log.templateId || savedTmplId;
    var items = Array.isArray(log.items) ? log.items : [];
    var borderGrad = (typeof window.getCardStableBorderGradient === 'function') ? window.getCardStableBorderGradient(log, 0) : 'linear-gradient(135deg, #10b981, #047857)';

    var photosList = (typeof getRecordPhotos === 'function') ? getRecordPhotos(log) : (log.photos || []);
    if (!photosList || photosList.length === 0) {
      photosList = ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];
    }

    var photoMemos = Array.isArray(log.photoMemos) ? log.photoMemos : [];
    var fallbackMemo = (log.memo || log.oneLineMemo || '').trim();

    var packingSheetMarkup = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (genFn) {
      packingSheetMarkup = genFn(tmplId, log, items, log.spot, fallbackMemo || (log.spot + ' 패킹'), photosList[0]);
    } else {
      packingSheetMarkup = '<div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">' +
        '<div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">' +
            '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:0.75rem; font-weight:900;">ROMANTIC PACK</span>' +
            '<span style="font-size:0.52rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 5px; border-radius:3px;">#0' + tmplId + '</span>' +
          '</div>' +
          '<div style="margin-top:6px; font-size:0.95rem; font-weight:900; color:#0f172a;">' + escapeHtml(log.spot || '낭만 스팟') + '</div>' +
        '</div>' +
        '<div style="border-top:1.5px dashed #000; padding-top:5px; display:flex; justify-content:space-between; align-items:baseline;">' +
          '<span style="font-size:0.68rem; font-weight:900; color:#64748b;">TOTAL</span>' +
          '<span style="font-size:1.35rem; font-weight:900; color:#000; font-family:\'Space Grotesk\', sans-serif;">' + (log.weightKg || '0.00') + ' KG</span>' +
        '</div>' +
      '</div>';
    }

    var photoSectionsHtml = photosList.map(function(pUrl, pIdx) {
      var curMemo = (photoMemos[pIdx] !== undefined && photoMemos[pIdx] !== null) ? String(photoMemos[pIdx]).trim() : '';
      if (!curMemo && pIdx === 0 && fallbackMemo) {
        curMemo = fallbackMemo;
      }

      var memoMarkup = curMemo ? (
        '<div style="padding:10px 14px 14px 14px; background:#080b11; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:4px;">' +
          '<div style="display:flex; align-items:center; gap:5px;">' +
            '<span style="font-size:0.58rem; color:#38bdf8; background:rgba(56,189,248,0.12); padding:1px 5px; border-radius:4px; font-weight:900; font-family:\'Space Grotesk\', sans-serif;">#' + String(pIdx + 1).padStart(2, '0') + '</span>' +
            '<span style="font-size:0.62rem; color:#64748b; font-weight:700;"></span>' +
          '</div>' +
          '<div style="font-size:0.82rem; color:#e2e8f0; line-height:1.55; word-break:break-all; font-family:\'Pretendard Variable\', -apple-system, sans-serif; letter-spacing:-0.01em;">“' + escapeHtml(curMemo) + '”</div>' +
        '</div>'
      ) : '';

      return '<div style="width:100%; display:flex; flex-direction:column; background:#000000;">' +
        '<div style="width:100%; aspect-ratio:4/5; overflow:hidden; background:#05070a; position:relative;">' +
          '<img src="' + pUrl + '" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
          (photosList.length > 1 ? '<span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); color:#ffffff; font-size:0.62rem; font-weight:800; font-family:\'Space Grotesk\', sans-serif; padding:2px 7px; border-radius:10px; border:1px solid rgba(255,255,255,0.15);">' + (pIdx + 1) + ' / ' + photosList.length + '</span>' : '') +
        '</div>' +
        memoMarkup +
      '</div>';
    }).join('');

    return '<div class="single-feed-block" data-record-id="' + escapeHtml(String(log.id)) + '" style="background:#000000; border-bottom:2px solid rgba(255,255,255,0.12); overflow:hidden; display:flex; flex-direction:column; flex-shrink:0; margin-bottom:28px; box-sizing:border-box;">' +
      '<div style="padding:14px 16px 10px 16px; background:#000000; display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="font-size:1.05rem; font-weight:900; color:#ffffff; letter-spacing:-0.02em;">' + escapeHtml(log.spot || '낭만 스팟') + (log.elevation ? (' <span style="font-size:0.75rem; color:#fde047; font-weight:800;">(' + escapeHtml(log.elevation) + ')</span>') : '') + '</div>' +
        '<span style="font-size:0.72rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace;">' + escapeHtml(log.date || '') + '</span>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; width:100%;">' +
        photoSectionsHtml +
      '</div>' +
      '<div style="padding:18px 16px 20px 16px; background:#000000;">' +
        '<div style="width:100%; aspect-ratio:3/4; border-radius:14px; padding:2px; background:' + borderGrad + ';"><div style="width:100%; height:100%; border-radius:12px; overflow:hidden;">' + packingSheetMarkup + '</div></div>' +
      '</div>' +
    '</div>';
  };
// 🔖 [관심피드 북마크 저장/해제 토글 엔진]
 window.toggleSaveFeed = function(feedId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(12);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      if (typeof showToast === 'function') showToast('🔒 관심피드 저장은 카카오 로그인 후 이용하실 수 있습니다.', 'info', 2000);
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
      } else if (typeof openLoginModal === 'function') {
        openLoginModal();
      }
      return;
    }

    var sId = String(feedId || '').trim();
    if (!sId) return;

    var savedFeeds = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_saved_feeds', [])
      : safeGetJSON('okbm_saved_feeds', []);

    var isSaved = savedFeeds.includes(sId);

    if (isSaved) {
      savedFeeds = savedFeeds.filter(function(id) { return id !== sId; });
      if (typeof showToast === 'function') showToast('관심피드 저장 목록에서 삭제되었습니다.', 'info', 1800);
    } else {
      savedFeeds.unshift(sId);
      if (typeof showToast === 'function') showToast('관심피드로 저장되었습니다.', 'success', 2000);
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_saved_feeds', savedFeeds, false);
    } else {
      localStorage.setItem('okbm_saved_feeds', JSON.stringify(savedFeeds));
    }

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
  };

 // 👥 [관심루터 & 관심피드 통합 모아보기 모달 엔진]
  window.openRomanticInterestModal = function(initialTab) {
    triggerHaptic(12);
    var old = document.getElementById('romanticInterestModal');
    if (old) old.remove();

    var activeTab = (initialTab === 'feeds') ? 'feeds' : 'routers';

    var followingList = safeGetJSON('okbm_following_users', []);
    var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);

    var allFeeds = (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
      ? window.__allLoadedFeeds
      : (window.safeGetStorage('okbm_cached_community_feeds', []) || []);

   if (Array.isArray(window.interactiveHistory)) {
      window.interactiveHistory.forEach(function(myRec) {
        // 🔒 공개(isPublished === true)된 기록만 공용 모아보기 풀에 안전하게 병합
        if (myRec && myRec.isPublished === true) {
          if (!allFeeds.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
            allFeeds.push(myRec);
          }
        }
      });
    }

    var modalEl = document.createElement('div');
    modalEl.id = 'romanticInterestModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000030; display:flex; justify-content:center; align-items:flex-end; box-sizing:border-box;';

    window.__renderInterestModalContent = function(tabName) {
      activeTab = tabName;
      var tabRoutersBtn = document.getElementById('interestTabBtnRouters');
      var tabFeedsBtn = document.getElementById('interestTabBtnFeeds');
      var bodyContainer = document.getElementById('interestModalBodyContent');
      if (!bodyContainer) return;

      if (tabRoutersBtn && tabFeedsBtn) {
        if (activeTab === 'routers') {
          tabRoutersBtn.style.background = 'rgba(52,211,153,0.18)';
          tabRoutersBtn.style.borderColor = '#34d399';
          tabRoutersBtn.style.color = '#34d399';
          tabFeedsBtn.style.background = 'rgba(255,255,255,0.04)';
          tabFeedsBtn.style.borderColor = 'rgba(255,255,255,0.1)';
          tabFeedsBtn.style.color = '#94a3b8';
        } else {
          tabFeedsBtn.style.background = 'rgba(192,132,252,0.18)';
          tabFeedsBtn.style.borderColor = '#c084fc';
          tabFeedsBtn.style.color = '#c084fc';
          tabRoutersBtn.style.background = 'rgba(255,255,255,0.04)';
          tabRoutersBtn.style.borderColor = 'rgba(255,255,255,0.1)';
          tabRoutersBtn.style.color = '#94a3b8';
        }
      }

      if (activeTab === 'routers') {
        if (followingList.length === 0) {
          bodyContainer.innerHTML = '<div style="text-align:center; padding:50px 14px; color:#94a3b8; font-size:0.80rem; line-height:1.6;">' +
            '등록된 관심루터가 없습니다.<br>피드 상단의 [+관심] 버튼을 눌러 관심루터를 등록해보세요.' +
          '</div>';
          return;
        }

        bodyContainer.innerHTML = followingList.map(function(authorKey) {
          var cleanKey = String(authorKey).trim();
          var userFeeds = allFeeds.filter(function(f) {
            return f && (String(f.userId || '').trim() === cleanKey || String(f.author || f.nick || '').trim() === cleanKey);
          });
          var latestFeed = userFeeds[0] || null;
          var thumbPhoto = (latestFeed && latestFeed.photos && latestFeed.photos[0]) ? latestFeed.photos[0] : 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80';
          var latestSpot = latestFeed ? (latestFeed.spot || '활동 기록') : '기록 없음';
          var latestDate = latestFeed ? (latestFeed.date || '') : '';
          var safeKey = escapeHtml(cleanKey);

          return '<div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">' +
            '<div data-author="' + safeKey + '" onclick="document.getElementById(\'romanticInterestModal\').remove(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.author);" style="display:flex; align-items:center; gap:10px; cursor:pointer; min-width:0; flex:1;">' +
              '<div style="width:44px; height:44px; border-radius:10px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.15);">' +
                '<img src="' + thumbPhoto + '" style="width:100%; height:100%; object-fit:cover;" />' +
              '</div>' +
              '<div style="min-width:0; flex:1;">' +
                '<div style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + safeKey + '</div>' +
                '<div style="font-size:0.64rem; color:#94a3b8; margin-top:2px;">' + escapeHtml(latestSpot) + (latestDate ? ' · ' + escapeHtml(latestDate) : '') + '</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" data-author="' + safeKey + '" onclick="window.toggleFollowUser(this.dataset.author, this.dataset.author, event); window.openRomanticInterestModal(\'routers\');" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.64rem; font-weight:800; padding:4px 9px; border-radius:8px; cursor:pointer; flex-shrink:0; margin-left:8px;">해제</button>' +
          '</div>';
        }).join('');
      } else {
        var matchedSavedFeeds = allFeeds.filter(function(f) {
          return f && f.id && savedFeedsList.includes(String(f.id).trim());
        });

        if (matchedSavedFeeds.length === 0) {
          bodyContainer.innerHTML = '<div style="text-align:center; padding:50px 14px; color:#94a3b8; font-size:0.80rem; line-height:1.6;">' +
            '저장된 관심피드가 없습니다.<br>마음에 드는 피드 하단의 북마크 아이콘을 눌러 저장해보세요.' +
          '</div>';
          return;
        }

        bodyContainer.innerHTML = '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">' +
          matchedSavedFeeds.map(function(f) {
            var fId = escapeHtml(String(f.id));
            var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(f) : (f.photos || []);
            var thumb = (photos && photos[0]) ? photos[0] : (f.photo || f.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80');
            var fSpot = escapeHtml(f.spot || '나의 힐링 스팟');
            var fWeight = escapeHtml(String(f.weightKg || '0.00'));
            var fAuthor = escapeHtml(f.author || f.nick || '루터');

            return '<div style="position:relative; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden; display:flex; flex-direction:column;">' +
              '<div data-feed-id="' + fId + '" onclick="document.getElementById(\'romanticInterestModal\').remove(); window.openSingleTripDualFeedModal(this.dataset.feedId);" style="width:100%; aspect-ratio:4/3; position:relative; cursor:pointer; background:#05070a;">' +
                '<img src="' + thumb + '" style="width:100%; height:100%; object-fit:cover;" />' +
                '<span style="position:absolute; top:6px; left:6px; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); font-size:0.55rem; color:#fff; font-weight:800; padding:2px 5px; border-radius:4px;">' + fAuthor + '</span>' +
              '</div>' +
              '<div style="padding:8px 10px; display:flex; justify-content:space-between; align-items:center;">' +
                '<div style="min-width:0; flex:1; padding-right:4px;">' +
                  '<div style="font-size:0.75rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fSpot + '</div>' +
                  '<div style="font-size:0.62rem; color:#34d399; font-family:\'Space Grotesk\', sans-serif; font-weight:900; margin-top:1px;">' + fWeight + 'kg</div>' +
                '</div>' +
                '<button type="button" data-feed-id="' + fId + '" onclick="window.toggleSaveFeed(this.dataset.feedId, event); window.openRomanticInterestModal(\'feeds\');" style="background:none; border:none; padding:2px; cursor:pointer; color:#c084fc;" title="저장 취소">' +
                  '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                '</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }
    };

    modalEl.innerHTML = '<div style="width:100%; max-width:440px; max-height:82vh; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.35); border-radius:20px 20px 0 0; padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; overflow:hidden;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<button type="button" id="interestTabBtnRouters" onclick="window.__renderInterestModalContent(\'routers\'); triggerHaptic(8);" style="border:1px solid #34d399; background:rgba(52,211,153,0.18); color:#34d399; font-size:0.75rem; font-weight:900; padding:5px 10px; border-radius:10px; cursor:pointer; transition:all 0.15s ease;">' +
            '관심루터 (' + followingList.length + ')' +
          '</button>' +
          '<button type="button" id="interestTabBtnFeeds" onclick="window.__renderInterestModalContent(\'feeds\'); triggerHaptic(8);" style="border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:#94a3b8; font-size:0.75rem; font-weight:900; padding:5px 10px; border-radius:10px; cursor:pointer; transition:all 0.15s ease;">' +
            '관심피드 (' + savedFeedsList.length + ')' +
          '</button>' +
        '</div>' +
        '<button type="button" onclick="document.getElementById(\'romanticInterestModal\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>' +
      '</div>' +
      '<div id="interestModalBodyContent" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-bottom:10px;">' +
      '</div>' +
    '</div>';

    document.body.appendChild(modalEl);
    window.__renderInterestModalContent(activeTab);
  };

  // 하위 호환
  window.openFollowedRoutersModal = function() {
    window.openRomanticInterestModal('routers');
  };
  window.openSavedFeedsModal = function() {
    window.openRomanticInterestModal('feeds');
  };
 // 👥 [단방향 관심루터/크루 팔로우 토글 엔진]
 window.toggleFollowUser = function(targetUserId, targetAuthor, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(12);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      if (typeof showToast === 'function') showToast('🔒 관심루터 등록은 카카오 로그인 후 이용하실 수 있습니다.', 'info', 2000);
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
      } else if (typeof openLoginModal === 'function') {
        openLoginModal();
      }
      return;
    }

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var sTargetId = String(targetUserId || '').trim();
    var sTargetAuthor = String(targetAuthor || '').trim();

    if (!sTargetId && !sTargetAuthor) return;
    if (myUserId && sTargetId && myUserId === sTargetId) {
      if (typeof showToast === 'function') showToast('본인 계정은 이웃으로 등록할 수 없습니다.', 'warn');
      return;
    }

    var followKey = sTargetId || sTargetAuthor;
    var followingList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_following_users', [])
      : safeGetJSON('okbm_following_users', []);

    var isFollowing = followingList.includes(followKey);

    if (isFollowing) {
      followingList = followingList.filter(function(id) { return id !== followKey; });
      if (typeof showToast === 'function') showToast('[' + sTargetAuthor + '] 님과 이웃을 취소했습니다.', 'info', 1800);
    } else {
      followingList.push(followKey);
      if (typeof showToast === 'function') showToast('[' + sTargetAuthor + '] 님을 이웃으로 등록했습니다.', 'success', 2000);
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_following_users', followingList, true);
    } else {
      localStorage.setItem('okbm_following_users', JSON.stringify(followingList));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(false);
    }

    if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage();
    var modalEl = document.getElementById('userFeedCollectionModal');
    if (modalEl && typeof window.openUserFeedCollectionModal === 'function') {
      window.openUserFeedCollectionModal(sTargetAuthor, sTargetId);
    }
  };

 window.openUserFeedCollectionModal = function(authorName, userId) {
    if (!authorName && !userId) return;
    triggerHaptic(12);

    var old = document.getElementById('userFeedCollectionModal');
    if (old) old.remove();

    var targetAuthor = String(authorName || '').trim();
    var targetUserId = String(userId || '').trim();

    var feedPool = [];
    if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
      feedPool = window.__allLoadedFeeds;
    } else {
      feedPool = safeGetJSON('okbm_cached_community_feeds', []) || [];
    }

    if (Array.isArray(window.interactiveHistory)) {
      window.interactiveHistory.forEach(function(myRec) {
        if (myRec && myRec.isPublished === true) {
          if (!feedPool.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
            feedPool.push(myRec);
          }
        }
      });
    }

    var matchedFeeds = feedPool.filter(function(f) {
      if (!f) return false;
      var fUserId = String(f.userId || f.user_id || '').trim();
      var fAuthor = String(f.author || f.nick || f.nickname || '').trim();
      if (targetUserId && fUserId && targetUserId === fUserId) return true;
      if (targetAuthor && fAuthor && targetAuthor === fAuthor) return true;
      return false;
    });

    matchedFeeds.sort(function(a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    window.__scopedUserFeedsMap = window.__scopedUserFeedsMap || {};
    window.__scopedUserFeedsMap[targetAuthor] = matchedFeeds;
    window.__currentUserModalTab = window.__currentUserModalTab || 'route';

    var repSnsUrl = '';
    var repSnsType = '';

    matchedFeeds.forEach(function(f) {
      if (!repSnsUrl) {
        var raw = String(f.instagram || f.youtube || f.youtubeUrl || '').trim();
        if (raw.includes('youtube.com') || raw.includes('youtu.be')) {
          var cleanYt = raw.replace(/^@+/, '').split('?')[0].trim();
          var m = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
          repSnsUrl = (m && m[1]) ? ('https://www.youtube.com/@' + m[1].replace(/^@/, '')) : (cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt));
          repSnsType = 'youtube';
        } else if (raw) {
          var pureId = raw.replace(/^@+/, '').replace(/instagram\.com\//, '').replace(/[@\s]/g, '').split('?')[0].trim();
          if (pureId) {
            repSnsUrl = 'https://instagram.com/' + pureId;
            repSnsType = 'instagram';
          }
        }
      }
    });

    var repSnsBadgeHtml = '';
    if (repSnsUrl) {
      if (repSnsType === 'youtube') {
        repSnsBadgeHtml = '<a href="' + repSnsUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="유튜브 채널">' +
          '<svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none">' +
            '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#f43f5e"/>' +
            '<path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff"/>' +
          '</svg>' +
        '</a>';
      } else {
        repSnsBadgeHtml = '<a href="' + repSnsUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="인스타그램 프로필">' +
          '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
        '</a>';
      }
    }

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var followKey = targetUserId || targetAuthor;
    var followingList = safeGetJSON('okbm_following_users', []);
    var isFollowing = followingList.includes(followKey);
    var isSelf = (myUserId && targetUserId && myUserId === targetUserId);

  var followBtnHtml = '';
    if (!isSelf) {
      followBtnHtml = isFollowing
        ? '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.15); border:1px solid #34d399; color:#34d399; padding:4px 10px; border-radius:14px; font-size:0.68rem; font-weight:900; cursor:pointer; display:inline-flex; align-items:center; gap:3px; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>관심</span></button>'
        : '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:4px 10px; border-radius:14px; font-size:0.68rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>관심</span></button>';
    }

    var modalEl = document.createElement('div');
    modalEl.id = 'userFeedCollectionModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000015; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    window.__renderUserModalCards = function() {
      var container = document.getElementById('userModalCardsContainer');
      var btnRoute = document.getElementById('userModalTabBtnRoute');
      var btnRouter = document.getElementById('userModalTabBtnRouter');
      if (!container) return;

      var currentTab = window.__currentUserModalTab || 'route';
      var routeCount = matchedFeeds.filter(function(f) {
        return f && !(f.feedType === 'router' || (f.id && String(f.id).startsWith('snap_')));
      }).length;
      var routerCount = matchedFeeds.filter(function(f) {
        return f && (f.feedType === 'router' || (f.id && String(f.id).startsWith('snap_')));
      }).length;

      if (btnRoute) btnRoute.innerText = '낭만루트 (' + routeCount + ')';
      if (btnRouter) btnRouter.innerText = '낭만루터 (' + routerCount + ')';

      var filteredFeeds = matchedFeeds.filter(function(f) {
        if (!f) return false;
        var isSnap = Boolean(f.feedType === 'router' || (f.id && String(f.id).startsWith('snap_')));
        return currentTab === 'route' ? !isSnap : isSnap;
      });

      if (filteredFeeds.length === 0) {
        container.innerHTML = '<div style="width:100%; padding:60px 20px; text-align:center; color:#94a3b8; font-size:0.80rem;">' + (currentTab === 'route' ? '등록된 낭만루트 기록이 없습니다.' : '등록된 낭만루터 일상 스냅이 없습니다.') + '</div>';
        return;
      }

      container.innerHTML = filteredFeeds.map(function(f) {
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(f) : (f.photos || []);
        var thumb = (photos && photos.length > 0 && photos[0]) ? photos[0] : (f.photo || f.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80');
        var fSpot = escapeHtml(f.spot || '나의 힐링 스팟');
        var fDate = escapeHtml(f.date || '');
        var fWeight = escapeHtml(String(f.weightKg || '0.00'));
        var fMemo = escapeHtml((f.memo || f.oneLineMemo || '').slice(0, 60));
        var safeId = escapeHtml(String(f.id || ''));

        return '<div data-feed-id="' + safeId + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="document.getElementById(\'userFeedCollectionModal\').remove(); window.openSingleTripDualFeedModal(this.dataset.feedId, window.__scopedUserFeedsMap[this.dataset.author], this.dataset.author);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; gap:12px; align-items:center; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;">' +
          '<div style="width:58px; height:58px; border-radius:8px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.14);">' +
            '<img src="' + thumb + '" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
          '</div>' +
          '<div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
              '<span style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fSpot + '</span>' +
              (currentTab === 'route' ? '<span style="font-size:0.75rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + fWeight + 'kg</span>' : '') +
            '</div>' +
            '<span style="font-size:0.62rem; color:#64748b; font-family:\'JetBrains Mono\', monospace;">' + fDate + '</span>' +
            (fMemo ? ('<span style="font-size:0.68rem; color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">“' + fMemo + '”</span>') : '') +
          '</div>' +
        '</div>';
      }).join('');
    };

    window.__switchUserModalTab = function(tab) {
      window.__currentUserModalTab = tab;
      var btnRoute = document.getElementById('userModalTabBtnRoute');
      var btnRouter = document.getElementById('userModalTabBtnRouter');
      if (btnRoute && btnRouter) {
        if (tab === 'route') {
          btnRoute.style.background = '#38bdf8';
          btnRoute.style.color = '#000000';
          btnRoute.style.fontWeight = '900';
          btnRouter.style.background = 'transparent';
          btnRouter.style.color = '#94a3b8';
          btnRouter.style.fontWeight = '700';
        } else {
          btnRouter.style.background = '#38bdf8';
          btnRouter.style.color = '#000000';
          btnRouter.style.fontWeight = '900';
          btnRoute.style.background = 'transparent';
          btnRoute.style.color = '#94a3b8';
          btnRoute.style.fontWeight = '700';
        }
      }
      window.__renderUserModalCards();
      triggerHaptic(8);
    };

    var isRouteActive = (window.__currentUserModalTab === 'route');

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1; padding-right:8px;">
            <button type="button" onclick="document.getElementById('userFeedCollectionModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">◀</button>
            <div style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;">
              <span style="font-size:0.92rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">[${escapeHtml(targetAuthor)}]</span>
              ${repSnsBadgeHtml}
            </div>
          </div>
          <div style="flex-shrink:0;">
            ${followBtnHtml}
          </div>
        </div>

        <div style="display:flex; width:100%;">
          <div style="display:flex; gap:3px; background:rgba(255,255,255,0.06); padding:2px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); flex:1;">
            <button type="button" id="userModalTabBtnRoute" onclick="window.__switchUserModalTab('route');" style="flex:1; border:none; cursor:pointer; font-size:0.68rem; padding:5px 8px; border-radius:6px; background:${isRouteActive?'#38bdf8':'transparent'}; color:${isRouteActive?'#000000':'#94a3b8'}; font-weight:${isRouteActive?'900':'700'}; transition:all 0.15s ease;">낭만루트</button>
            <button type="button" id="userModalTabBtnRouter" onclick="window.__switchUserModalTab('router');" style="flex:1; border:none; cursor:pointer; font-size:0.68rem; padding:5px 8px; border-radius:6px; background:${!isRouteActive?'#38bdf8':'transparent'}; color:${!isRouteActive?'#000000':'#94a3b8'}; font-weight:${!isRouteActive?'900':'700'}; transition:all 0.15s ease;">낭만루터</button>
          </div>
        </div>
      </div>

  

      <div id="userModalCardsContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 8px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
      </div>
    `;

    document.body.appendChild(modalEl);
    window.__renderUserModalCards();
  };

  
// 📖 [백패킹/캠핑 피드 상세 듀얼 뷰 - 현재 스크롤 피드 실시간 추적 & 수정 100% 바인딩]
  window.openSingleTripDualFeedModal = function(recordId, scopedFeedList, contextTitle) {
    var logs = (Array.isArray(scopedFeedList) && scopedFeedList.length > 0)
      ? scopedFeedList
      : (window.interactiveHistory || []);

    if (logs.length === 0) {
      if (typeof showToast === 'function') showToast('선택한 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    var startIdx = logs.findIndex(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (startIdx === -1) startIdx = 0;

    window.__currentActiveDualFeedId = String(logs[startIdx].id);

    var old = document.getElementById('singleTripFeedModal');
    if (old) old.remove();

    var allCardsHtml = logs.map(function(item) {
      return window.buildSingleFeedCardHtml(item);
    }).join('');

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    feedModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000020; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    feedModal.innerHTML = `
      <!-- 극투명 미니멀 플로팅 네비게이션: 본문을 가리지 않는 초경량 글래스모피즘 -->
      <div style="position:fixed; top:calc(10px + env(safe-area-inset-top, 0px)); left:0; right:0; max-width:440px; margin:0 auto; padding:0 12px; display:flex; justify-content:space-between; align-items:center; z-index:1000025; pointer-events:none;">
        <button type="button" onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="pointer-events:auto; background:rgba(0,0,0,0.22); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.12); color:#ffffff; width:32px; height:32px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); padding:0;">◀</button>
        
        <button type="button" id="btnFloatEditTripLog" onclick="window.__triggerEditCurrentActiveFeed();" style="pointer-events:auto; background:rgba(0,0,0,0.22); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.12); color:#fde047; width:32px; height:32px; border-radius:50%; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); padding:0;" title="현재 피드 수정">
          <svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
      </div>

      <div id="dualFeedScrollContainer" onscroll="window.__onDualFeedContainerScroll(this);" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:calc(env(safe-area-inset-top, 0px)) 0 calc(76px + env(safe-area-inset-bottom, 8px)) 0; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${allCardsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(feedModal);

   window.__onDualFeedContainerScroll = function(container) {
      if (!container) return;
      var cards = container.querySelectorAll('.single-feed-block');
      var containerCenter = container.scrollTop + (container.clientHeight / 2);
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (containerCenter >= c.offsetTop && containerCenter <= (c.offsetTop + c.offsetHeight)) {
          var fId = c.dataset.recordId;
          if (fId) {
            window.__currentActiveDualFeedId = String(fId);
            // 🛡️ [보안 가드 2]: 스크롤 중인 카드가 내 글일 때만 수정 버튼 노출
            var curRecord = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(fId).trim(); });
            if (!curRecord && Array.isArray(scopedFeedList)) {
              curRecord = scopedFeedList.find(function(r) { return String(r.id).trim() === String(fId).trim(); });
            }
            var editBtn = document.getElementById('btnFloatEditTripLog');
            if (editBtn) {
              editBtn.style.display = (curRecord && window.isRecordOwner(curRecord)) ? 'flex' : 'none';
            }
          }
          break;
        }
      }
    };

    window.__triggerEditCurrentActiveFeed = function() {
      triggerHaptic(10);
      var curId = window.__currentActiveDualFeedId;
      var targetLog = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(curId).trim(); });
      if (!targetLog && Array.isArray(scopedFeedList)) {
        targetLog = scopedFeedList.find(function(r) { return String(r.id).trim() === String(curId).trim(); });
      }
      if (targetLog) {
        if (!window.isRecordOwner(targetLog)) {
          if (typeof showToast === 'function') showToast('🔒 본인이 작성한 기록만 수정할 수 있습니다.', 'warn', 2200);
          return;
        }
        window.openRichAfterTripModal(targetLog);
      } else {
        if (typeof showToast === 'function') showToast('수정할 대상을 찾을 수 없습니다.', 'warn');
      }
    };

    setTimeout(function() {
      var targetCard = feedModal.querySelector('[data-record-id="' + recordId + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 40);

    triggerHaptic(12);
  };

/// [대형 사진 스와이프 뷰어 & 모바일 createObjectURL 초고속 1200px 다중 압축 엔진 - 상태 머신 락 적용]
  window.__isPhotoCompressing = false;

  window.__handleRichMultiPhotoUpload = async function(event) {
    var inputEl = event.target;
    var files = inputEl.files;
    if (!files || files.length === 0) return;

    window.__tempUploadedPhotos = window.__tempUploadedPhotos || [];
    window.__tempPhotoMemos = window.__tempPhotoMemos || [];

    var curFeedType = (window.__richCurrentRecord && window.__richCurrentRecord.feedType) ? window.__richCurrentRecord.feedType : 'route';
    var photoLimit = (curFeedType === 'router') ? 7 : 10;
    var currentCount = window.__tempUploadedPhotos.length;
    var maxSlots = photoLimit - currentCount;

    if (maxSlots <= 0) {
      if (typeof showToast === 'function') showToast(curFeedType === 'router' ? '낭만루터 일상 스냅은 최대 7장까지 등록 가능합니다.' : '낭만루트는 최대 10장까지 등록 가능합니다.', 'warn');
      inputEl.value = '';
      return;
    }

    var filesToProcess = Array.from(files).slice(0, maxSlots);
    triggerHaptic(10);

    // 🔒 [비동기 락 활성화]: 압축 중에는 저장 버튼 비활성화 (타이밍 역전 100% 차단)
    window.__isPhotoCompressing = true;
    var submitBtn = document.getElementById('btnSubmitRichTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.innerText = '사진 준비 중...';
    }

    var stageContainer = document.getElementById('richLargePhotoStageContainer');
    var loaderEl = null;

    if (stageContainer) {
      loaderEl = document.createElement('div');
      loaderEl.id = 'richPhotoProcessingLoader';
      loaderEl.style.cssText = 'position:absolute; inset:0; z-index:99; background:rgba(6,9,14,0.85); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border-radius:14px; pointer-events:all;';
      loaderEl.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:34px; height:34px; animation:spin 1s linear infinite;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" stroke="rgba(56,189,248,0.2)" stroke-width="2.2"/>
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <div id="richPhotoLoadingStatusText" style="font-size:0.80rem; font-weight:800; color:#e2e8f0; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.01em;">
          사진 0/${filesToProcess.length}장 최적화 중...
        </div>
      `;
      var currentStageBox = stageContainer.firstElementChild;
      if (currentStageBox) {
        currentStageBox.style.position = 'relative';
        currentStageBox.appendChild(loaderEl);
      } else {
        stageContainer.style.position = 'relative';
        stageContainer.appendChild(loaderEl);
      }
    }

    var compressSingleFile = function(file, idx) {
      return new Promise(function(resolve) {
        var blobUrl = '';
        try {
          blobUrl = URL.createObjectURL(file);
        } catch (e) {
          resolve('');
          return;
        }

        var img = new Image();
        var isFinished = false;

        var timer = setTimeout(function() {
          if (!isFinished) {
            isFinished = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            resolve('');
          }
        }, 8000);

        img.onload = function() {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(timer);

          try {
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

            var compressedData = canvas.toDataURL('image/jpeg', 0.82);
            if (blobUrl) URL.revokeObjectURL(blobUrl);

            var statusText = document.getElementById('richPhotoLoadingStatusText');
            if (statusText) {
              statusText.innerText = '사진 ' + (idx + 1) + '/' + filesToProcess.length + '장 완료';
            }
            resolve(compressedData);
          } catch (err) {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            resolve('');
          }
        };

        img.onerror = function() {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(timer);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          resolve('');
        };

        img.src = blobUrl;
      });
    };

    try {
      var compressPromises = filesToProcess.map(function(file, i) {
        return compressSingleFile(file, i);
      });
      var results = await Promise.all(compressPromises);

      results.forEach(function(base64) {
        if (base64 && base64.length > 100) {
          window.__tempUploadedPhotos.push(base64);
          window.__tempPhotoMemos.push('');
        }
      });
    } finally {
      window.__isPhotoCompressing = false;
      if (loaderEl && loaderEl.parentNode) {
        loaderEl.remove();
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; flex-shrink:0;" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>저장</span>';
      }
      inputEl.value = '';
    }

    window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
    window.__renderRichPhotoStage();
    triggerHaptic(12);
  };

  window.__removeRichSinglePhoto = function(index) {
    if (window.__tempUploadedPhotos && window.__tempUploadedPhotos[index] !== undefined) {
      window.__tempUploadedPhotos.splice(index, 1);
      if (window.__tempPhotoMemos) window.__tempPhotoMemos.splice(index, 1);
      if (window.__currentSwipePhotoIndex >= window.__tempUploadedPhotos.length) {
        window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
      }
      window.__renderRichPhotoStage();
      triggerHaptic(8);
    }
  };

  window.__clearAllRichPhotos = function() {
    window.__tempUploadedPhotos = [];
    window.__tempPhotoMemos = [];
    window.__currentSwipePhotoIndex = 0;
    window.__renderRichPhotoStage();
    triggerHaptic(10);
  };

 window.__commitCurrentMemoInput = function() {
    var memoInput = document.getElementById('richFormMemoInput');
    if (memoInput) {
      var val = memoInput.value.slice(0, 120);
      window.__tempSingleMemo = val;
      window.__tempPhotoMemos = window.__tempPhotoMemos || [];
      var curIdx = window.__currentSwipePhotoIndex || 0;
      window.__tempPhotoMemos[curIdx] = val;
    }
  };

  window.__onSwipePhotoTrackScroll = function(trackEl) {
    if (!trackEl) return;
    var scrollLeft = trackEl.scrollLeft;
    var width = trackEl.offsetWidth;
    if (!width) return;
    var newIdx = Math.round(scrollLeft / width);
    if (newIdx !== window.__currentSwipePhotoIndex && window.__tempUploadedPhotos[newIdx] !== undefined) {
      window.__commitCurrentMemoInput();
      window.__currentSwipePhotoIndex = newIdx;
      window.__syncActivePhotoMemoUI();
    }
  };

  window.__syncActivePhotoMemoUI = function() {
    var curIdx = window.__currentSwipePhotoIndex || 0;
    var memos = window.__tempPhotoMemos || [];
    var memoInput = document.getElementById('richFormMemoInput');
    var charCounter = document.getElementById('richMemoCharCounter');
    var photoLabel = document.getElementById('richPhotoCountLabel');
    var photoIndexBadge = document.getElementById('richPhotoActiveIndexBadge');

    var currentText = (window.__tempMemoMode === 'single') ? (window.__tempSingleMemo || '') : (memos[curIdx] || '');
    if (memoInput) memoInput.value = currentText;
    if (charCounter) charCounter.innerText = currentText.length + '/120자';
    if (photoIndexBadge) photoIndexBadge.innerText = (window.__tempUploadedPhotos.length > 0) ? ((curIdx + 1) + ' / ' + window.__tempUploadedPhotos.length) : '0 / 0';
    if (photoLabel) photoLabel.innerText = '등록된 사진 (' + (window.__tempUploadedPhotos ? window.__tempUploadedPhotos.length : 0) + '장 / 최대 10장)';

    var dotsWrap = document.getElementById('richSwipeDotsWrapper');
    if (dotsWrap) {
      var dots = dotsWrap.children;
      for (var d = 0; d < dots.length; d++) {
        if (d === curIdx) {
          dots[d].style.width = '14px';
          dots[d].style.background = '#38bdf8';
          dots[d].style.boxShadow = '0 0 8px rgba(56,189,248,0.8)';
        } else {
          dots[d].style.width = '5px';
          dots[d].style.background = 'rgba(255,255,255,0.3)';
          dots[d].style.boxShadow = 'none';
        }
      }
    }
  };

  window.__handleRichMemoInput = function(text) {
    var cleanText = String(text || '').slice(0, 120);
    window.__tempSingleMemo = cleanText;
    var curIdx = window.__currentSwipePhotoIndex || 0;
    window.__tempPhotoMemos = window.__tempPhotoMemos || [];
    window.__tempPhotoMemos[curIdx] = cleanText;
    var charCounter = document.getElementById('richMemoCharCounter');
    if (charCounter) charCounter.innerText = cleanText.length + '/120자';
  };

 // 🔄 [모바일 터치 & PC 마우스 듀얼 드래그 순서 재배치 엔진]
  window.__draggedThumbIdx = null;

  window.__handleThumbDragStart = function(e, idx) {
    window.__draggedThumbIdx = idx;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
    triggerHaptic(10);
  };

  window.__handleThumbDragOver = function(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    return false;
  };

  window.__handleThumbDrop = function(e, dropIdx) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();

    var fromIdx = window.__draggedThumbIdx;
    if (fromIdx !== null && fromIdx !== undefined && fromIdx !== dropIdx) {
      window.__commitCurrentMemoInput();

      var movedPhoto = window.__tempUploadedPhotos.splice(fromIdx, 1)[0];
      window.__tempUploadedPhotos.splice(dropIdx, 0, movedPhoto);

      if (window.__tempPhotoMemos) {
        var movedMemo = window.__tempPhotoMemos.splice(fromIdx, 1)[0] || '';
        window.__tempPhotoMemos.splice(dropIdx, 0, movedMemo);
      }

      window.__currentSwipePhotoIndex = dropIdx;
      window.__renderRichPhotoStage();
      triggerHaptic(14);
    }
    window.__draggedThumbIdx = null;
    return false;
  };

  window.__handleThumbDragEnd = function() {
    window.__draggedThumbIdx = null;
  };

  // 📱 [300ms 롱프레스 안전 락 모바일 터치 드래그 엔진]
  window.__touchStartThumbIdx = null;
  window.__isLongPressActive = false;
  window.__thumbLongPressTimer = null;
  window.__touchTargetThumbEl = null;

  window.__handleTouchThumbStart = function(e, idx) {
    window.__touchStartThumbIdx = idx;
    window.__isLongPressActive = false;
    window.__touchTargetThumbEl = e.currentTarget;

    var touch = e.touches[0];
    window.__touchStartX = touch.clientX;
    window.__touchStartY = touch.clientY;

    clearTimeout(window.__thumbLongPressTimer);
    window.__thumbLongPressTimer = setTimeout(function() {
      window.__isLongPressActive = true;
      triggerHaptic(25);

      if (window.__touchTargetThumbEl) {
        window.__touchTargetThumbEl.style.transform = 'scale(1.15)';
        window.__touchTargetThumbEl.style.borderColor = '#38bdf8';
        window.__touchTargetThumbEl.style.boxShadow = '0 0 16px rgba(56,189,248,0.9)';
        window.__touchTargetThumbEl.style.zIndex = '99';
      }
    }, 300);
  };

  window.__handleTouchThumbMove = function(e) {
    var touch = e.touches[0];
    var deltaX = Math.abs(touch.clientX - window.__touchStartX);
    var deltaY = Math.abs(touch.clientY - window.__touchStartY);

    if (!window.__isLongPressActive) {
      if (deltaX > 8 || deltaY > 8) {
        clearTimeout(window.__thumbLongPressTimer);
      }
      return;
    }

    if (e.cancelable) e.preventDefault();
  };

 // 🌊 [실크처럼 부드러운 스무스 사진 전환 & 깜빡임 0% 엔진]
  window.__switchToPhotoSmooth = function(targetIdx) {
    if (window.__currentSwipePhotoIndex === targetIdx) return;
    window.__commitCurrentMemoInput();
    window.__currentSwipePhotoIndex = targetIdx;

    var track = document.getElementById('richPhotoSwipeTrack');
    if (track) {
      var targetLeft = targetIdx * track.offsetWidth;
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    var thumbNodes = document.querySelectorAll('[data-thumb-idx]');
    thumbNodes.forEach(function(node) {
      var nIdx = parseInt(node.dataset.thumbIdx, 10);
      var isCur = (nIdx === targetIdx);
      node.style.border = isCur ? '2.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.18)';
      node.style.boxShadow = isCur ? '0 0 12px rgba(56,189,248,0.85)' : 'none';
      node.style.transform = isCur ? 'scale(1.08)' : 'scale(1)';
      node.style.opacity = isCur ? '1' : '0.65';
      node.style.zIndex = isCur ? '3' : '1';
    });

    window.__syncActivePhotoMemoUI();
    triggerHaptic(8);
  };

  window.__handleTouchThumbEnd = function(e) {
    clearTimeout(window.__thumbLongPressTimer);

    var fromIdx = window.__touchStartThumbIdx;
    var wasLongPress = window.__isLongPressActive;

    if (window.__touchTargetThumbEl) {
      window.__touchTargetThumbEl.style.transform = '';
      window.__touchTargetThumbEl.style.boxShadow = '';
      window.__touchTargetThumbEl.style.zIndex = '';
    }

    if (wasLongPress && fromIdx !== null && fromIdx !== undefined) {
      var touch = e.changedTouches[0];
      var elem = document.elementFromPoint(touch.clientX, touch.clientY);
      var thumbCard = elem ? elem.closest('[data-thumb-idx]') : null;

      if (thumbCard && thumbCard.dataset.thumbIdx !== undefined) {
        var toIdx = parseInt(thumbCard.dataset.thumbIdx, 10);
        if (fromIdx !== toIdx) {
          window.__commitCurrentMemoInput();

          var movedPhoto = window.__tempUploadedPhotos.splice(fromIdx, 1)[0];
          window.__tempUploadedPhotos.splice(toIdx, 0, movedPhoto);

          if (window.__tempPhotoMemos) {
            var movedMemo = window.__tempPhotoMemos.splice(fromIdx, 1)[0] || '';
            window.__tempPhotoMemos.splice(toIdx, 0, movedMemo);
          }

          window.__currentSwipePhotoIndex = toIdx;
          window.__renderRichPhotoStage();
          triggerHaptic(16);
          window.__touchStartThumbIdx = null;
          window.__isLongPressActive = false;
          window.__touchTargetThumbEl = null;
          return;
        }
      }
      window.__renderRichPhotoStage();
    } else if (fromIdx !== null && fromIdx !== undefined) {
      window.__switchToPhotoSmooth(fromIdx);
    }

    window.__touchStartThumbIdx = null;
    window.__isLongPressActive = false;
    window.__touchTargetThumbEl = null;
  };

  // 🗑️ [수정 화면 내부 직통 일지 & 피드 영구 삭제 파이프라인]
  window.__deleteCurrentRichTrip = function(recordId) {
    if (!recordId) return;
    triggerHaptic(14);

    var confirmMsg = '정말로 이 일지(기록)를 삭제하시겠습니까?\n' +
      '• 공용 피드 및 모든 저장소에서 즉시 영구 삭제됩니다.\n' +
      '• 삭제된 기록은 다시 복구되지 않습니다.';

    if (!confirm(confirmMsg)) return;

    var editModal = document.getElementById('modalRichAfterTrip');
    if (editModal) editModal.remove();

    if (typeof window.deleteTripRecord === 'function') {
      window.deleteTripRecord(recordId);
    }
  };

  window.__renderRichPhotoStage = function() {
    var stageContainer = document.getElementById('richLargePhotoStageContainer');
    if (!stageContainer) return;

    var photos = window.__tempUploadedPhotos || [];
    var count = photos.length;

    if (count === 0) {
      stageContainer.innerHTML = `
        <div onclick="document.getElementById('richMultiPhotoInput').click();" style="width:100%; aspect-ratio:3/4; max-height:420px; border:1.5px dashed rgba(56,189,248,0.35); border-radius:14px; background:radial-gradient(circle at 50% 40%, #0e1726 0%, #06090e 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; cursor:pointer; box-sizing:border-box;">
          <div style="width:52px; height:52px; border-radius:50%; background:rgba(56,189,248,0.12); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px; height:26px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span style="font-size:0.90rem; font-weight:900; color:#38bdf8; letter-spacing:-0.02em;">현장 사진 추가하기</span>
        </div>
      `;
    } else {
      var slidesHtml = photos.map(function(url, pIdx) {
        return `
          <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">
            <img src="${url}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(22px) brightness(0.32); transform:scale(1.15); pointer-events:none;" />
            <img src="${url}" style="position:relative; z-index:2; width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />
            
            <button type="button" onclick="event.stopPropagation(); window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:10px; right:10px; z-index:10; width:28px; height:28px; border-radius:50%; background:rgba(0,0,0,0.7); color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); font-size:13px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">✕</button>
          </div>
        `;
      }).join('');

      // 📸 [선택 사진 명확한 고대비 외곽선 & 터치/마우스 드래그 썸네일 스트립]
      var dragThumbsHtml = photos.map(function(tUrl, tIdx) {
        var isCurrentView = (window.__currentSwipePhotoIndex === tIdx);
        var activeBorderStyle = isCurrentView
          ? 'border:2.5px solid #38bdf8; box-shadow:0 0 12px rgba(56,189,248,0.85); transform:scale(1.08); z-index:3;'
          : 'border:1px solid rgba(255,255,255,0.18); opacity:0.65;';

        return `
          <div data-thumb-idx="${tIdx}"
               draggable="true"
               ondragstart="window.__handleThumbDragStart(event, ${tIdx});"
               ondragover="window.__handleThumbDragOver(event);"
               ondrop="window.__handleThumbDrop(event, ${tIdx});"
               ondragend="window.__handleThumbDragEnd(event);"
               ontouchstart="window.__handleTouchThumbStart(event, ${tIdx});"
               ontouchmove="window.__handleTouchThumbMove(event);"
               ontouchend="window.__handleTouchThumbEnd(event);"
               onclick="window.__commitCurrentMemoInput(); window.__currentSwipePhotoIndex = ${tIdx}; window.__renderRichPhotoStage(); triggerHaptic(8);" 
               style="width:54px; height:54px; border-radius:9px; overflow:hidden; position:relative; flex-shrink:0; cursor:grab; background:#000; box-sizing:border-box; transition:all 0.18s cubic-bezier(0.16, 1, 0.3, 1); user-select:none; -webkit-user-select:none; touch-action:none; ${activeBorderStyle}">
            <img src="${tUrl}" style="width:100%; height:100%; object-fit:cover; pointer-events:none; display:block;" />
            ${isCurrentView ? '<div style="position:absolute; inset:0; border:1px solid rgba(255,255,255,0.4); pointer-events:none; border-radius:7px;"></div>' : ''}
          </div>
        `;
      }).join('');

      stageContainer.innerHTML = `
        <div style="width:100%; aspect-ratio:3/4; max-height:420px; position:relative; overflow:hidden; border-radius:14px; background:#000000; border:1px solid rgba(255,255,255,0.12); box-shadow:0 12px 30px rgba(0,0,0,0.9);">
          <div id="richPhotoSwipeTrack" onscroll="window.__onSwipePhotoTrackScroll(this);" style="display:flex !important; width:100% !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important;">
            ${slidesHtml}
          </div>
          ${count < 10 ? `
            <button type="button" onclick="document.getElementById('richMultiPhotoInput').click();" style="position:absolute; bottom:12px; right:12px; z-index:10; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.5); color:#38bdf8; font-size:0.72rem; font-weight:800; padding:6px 12px; border-radius:20px; cursor:pointer; display:flex; align-items:center; gap:4px; backdrop-filter:blur(6px);">
              <svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:#38bdf8; fill:none; stroke-width:2.5;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>사진추가</span>
            </button>
          ` : ''}
        </div>

        <div style="width:100%; display:flex; gap:9px; overflow-x:auto; padding:10px 4px 6px 4px; -webkit-overflow-scrolling:touch; scrollbar-width:none; box-sizing:border-box;">
          ${dragThumbsHtml}
        </div>
      `;

      setTimeout(function() {
        var track = document.getElementById('richPhotoSwipeTrack');
        if (track) {
          var targetLeft = (window.__currentSwipePhotoIndex || 0) * track.offsetWidth;
          track.scrollLeft = targetLeft;
        }
      }, 30);
    }

    window.__syncActivePhotoMemoUI();
  };

  // 하위 호환성 영구 보존 알리아스
// 🔍 [기록 작성 모달 전용 박지 검색 & 실시간 연관검색어 엔진]
  window.openSpotSearchModalForRichTrip = function() {
    triggerHaptic(10);
    var old = document.getElementById('richTripSpotSearchModal');
    if (old) old.remove();

    // 🎯 [스크롤 튕김 0%]: 수정 전 부모 모달의 뷰포트 스크롤 좌표 즉시 백업
    var parentScrollContainer = document.querySelector('#modalRichAfterTrip > div:nth-child(2)');
    var savedParentScrollTop = parentScrollContainer ? parentScrollContainer.scrollTop : 0;

  // 🌐 [3중 하이브리드 박지 풀 메모이제이션 엔진]: 1회 정규화 후 메모리 캐시로 0.001초 즉시 인출
    var spotsSource = [];
    if (window.__masterSpotsSearchCache && window.__masterSpotsSearchCache.length > 0) {
      spotsSource = window.__masterSpotsSearchCache;
    } else {
      var rawPool = [];
      if (Array.isArray(window.campingSpots)) rawPool = rawPool.concat(window.campingSpots);
      if (Array.isArray(window.spotsData)) rawPool = rawPool.concat(window.spotsData);
      if (Array.isArray(window.allSpots)) rawPool = rawPool.concat(window.allSpots);
      if (Array.isArray(window.masterSpots)) rawPool = rawPool.concat(window.masterSpots);
      if (Array.isArray(window.CAMPING_SPOTS)) rawPool = rawPool.concat(window.CAMPING_SPOTS);
      if (Array.isArray(window.SPOTS_DB)) rawPool = rawPool.concat(window.SPOTS_DB);

      ['okbm_spots_cache', 'okbm_master_spots', 'camping_spots', 'okbm_spots', 'okbm_bookmarks'].forEach(function(k) {
        try {
          var item = localStorage.getItem(k);
          if (item) {
            var parsed = JSON.parse(item);
            if (Array.isArray(parsed)) rawPool = rawPool.concat(parsed);
          }
        } catch (e) {}
      });

      if (Array.isArray(window.__allLoadedFeeds)) {
        window.__allLoadedFeeds.forEach(function(f) {
          if (f && f.spot) rawPool.push({ name: f.spot, elevation: f.elevation || '', address: f.address || f.region || '' });
        });
      }
      if (Array.isArray(window.interactiveHistory)) {
        window.interactiveHistory.forEach(function(h) {
          if (h && h.spot) rawPool.push({ name: h.spot, elevation: h.elevation || '', address: h.address || h.region || '' });
        });
      }

 var spotsMap = new Map();
      rawPool.forEach(function(s) {
        if (!s) return;
        var rawName = String(s.name || s.spotName || s.spot || s.title || '').trim();
        if (!rawName || rawName === '나의 힐링 스팟' || rawName === '힐링 박지') return;

        var cityName = '';
        if (typeof window.extractSmartCityName === 'function') {
          cityName = window.extractSmartCityName(s);
        } else {
          var addrStr = String(s.address || s.addr || s.region || '').trim();
          var match = addrStr.match(/([가-힣]+(?:시|군|구))/);
          cityName = match ? match[1] : '';
        }

        var combinedName = rawName;
        if (cityName && !rawName.includes(cityName)) {
          combinedName = cityName + ' ' + rawName;
        }

        var cleanKey = combinedName.replace(/\s+/g, '').toLowerCase();
        if (!spotsMap.has(cleanKey)) {
          spotsMap.set(cleanKey, {
            name: combinedName,
            rawName: rawName,
            cityName: cityName,
            elevation: s.elevation || s.alt || s.height || '',
            address: s.address || s.addr || s.region || ''
          });
        }
      });

      spotsSource = Array.from(spotsMap.values());
      window.__masterSpotsSearchCache = spotsSource;
    }

  var searchModal = document.createElement('div');
    searchModal.id = 'richTripSpotSearchModal';
    searchModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:1000090 !important; display:flex; justify-content:center; align-items:flex-start; box-sizing:border-box; overflow:hidden;';
    searchModal.onclick = function(e) { if (e.target === searchModal) window.__closeRichSpotSearch(); };

    searchModal.innerHTML = `
      <div style="width:100%; max-width:440px; height:100%; height:100dvh; max-height:100dvh; background:#0c1017; border-bottom:1px solid rgba(255,255,255,0.08); padding:calc(12px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" style="width:16px; height:16px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">방문 박지 검색 및 변경</span>
          </div>
          <button type="button" onclick="window.__closeRichSpotSearch();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="position:relative; width:100%; flex-shrink:0;">
          <input type="text" id="richSpotSearchInput" placeholder="도시명 또는 박지명 입력 (예: 천마산 관음봉, 단양 올산)" oninput="window.__handleRichSpotFilter(this.value);" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); border-radius:10px; color:#ffffff; padding:0 38px 0 14px; font-size:0.86rem; outline:none; box-sizing:border-box;" />
          <button type="button" onclick="document.getElementById('richSpotSearchInput').value=''; window.__handleRichSpotFilter('');" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; font-size:0.9rem; cursor:pointer;">✕</button>
        </div>

        <div id="richSpotCustomApplyWrap" style="display:none; padding:8px 12px; background:rgba(56,189,248,0.12); border:1px dashed rgba(56,189,248,0.4); border-radius:8px; justify-content:space-between; align-items:center; flex-shrink:0;">
          <span id="richSpotCustomTargetText" style="font-size:0.75rem; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;"></span>
          <button type="button" id="richSpotCustomApplyBtn" style="background:#38bdf8; border:none; color:#000; font-size:0.72rem; font-weight:900; padding:5px 10px; border-radius:6px; cursor:pointer; flex-shrink:0;">직접 입력 적용</button>
        </div>

        <div id="richSpotSearchResultsList" style="flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:6px; padding-right:2px; overscroll-behavior-y:contain;">
        </div>
      </div>
    `;

    document.body.appendChild(searchModal);

    window.__closeRichSpotSearch = function() {
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.blur();
      var modal = document.getElementById('richTripSpotSearchModal');
      if (modal) modal.remove();

      // 🎯 [스크롤 복원]: 닫을 때도 부모 컨테이너 위치 100% 보존
      if (parentScrollContainer) {
        parentScrollContainer.scrollTop = savedParentScrollTop;
      }
    };

    // ⚡ [유사 단어 다중 토큰 매칭 & 가중치(Score) 정렬 엔진]
    window.__handleRichSpotFilter = function(query) {
      var listEl = document.getElementById('richSpotSearchResultsList');
      var customWrap = document.getElementById('richSpotCustomApplyWrap');
      var customText = document.getElementById('richSpotCustomTargetText');
      var customBtn = document.getElementById('richSpotCustomApplyBtn');
      if (!listEl) return;

      var rawQ = String(query || '').trim();
      var tokens = rawQ.toLowerCase().split(/\s+/).filter(Boolean);

      if (rawQ.length > 0) {
        if (customWrap && customText && customBtn) {
          customWrap.style.display = 'flex';
          customText.innerText = '“' + rawQ + '” (으)로 직접 설정';
          customBtn.onclick = function() {
            window.__selectSpotForRichTrip(rawQ, '');
          };
        }
      } else if (customWrap) {
        customWrap.style.display = 'none';
      }

      var matchedList = [];

      if (tokens.length === 0) {
        // 검색어 없을 때는 기본 40개 제공
        matchedList = spotsSource.slice(0, 40);
      } else {
        var lastToken = tokens[tokens.length - 1]; // 사용자가 핵심으로 지목한 마지막 키워드 (예: '관음봉')
        var scoredItems = [];

        spotsSource.forEach(function(s) {
          var sName = String(s.name || '').toLowerCase();
          var rawName = String(s.rawName || '').toLowerCase();
          var sAddr = String(s.address || '').toLowerCase();
          var sCity = String(s.cityName || '').toLowerCase();

          var score = 0;
          var matchedTokenCount = 0;

          // 1. 전체 검색어 완전/부분 일치 (최우선)
          var wholeSearch = rawQ.replace(/\s+/g, '').toLowerCase();
          var cleanSName = sName.replace(/\s+/g, '');
          if (cleanSName === wholeSearch) {
            score += 2000;
          } else if (cleanSName.includes(wholeSearch)) {
            score += 1000;
          }

          // 2. 사용자가 노린 마지막 핵심 단어(예: '관음봉') 일치 가중치
          if (lastToken) {
            if (rawName === lastToken || rawName.includes(lastToken)) {
              score += 600; // '관음봉'이 박지 순수 명칭에 직접 포함 시 최상단 우선권
            } else if (sName.includes(lastToken)) {
              score += 400;
            } else if (sAddr.includes(lastToken)) {
              score += 100;
            }
          }

          // 3. 각 토큰별 포용적(OR) 매칭 스코어링 (천마산, 관음봉 각각 일치해도 일단 등장)
          tokens.forEach(function(t) {
            var tokenMatched = false;
            if (rawName.includes(t)) {
              score += 250;
              tokenMatched = true;
            } else if (sName.includes(t)) {
              score += 180;
              tokenMatched = true;
            } else if (sCity.includes(t) || sAddr.includes(t)) {
              score += 80;
              tokenMatched = true;
            }
            if (tokenMatched) matchedTokenCount++;
          });

          // 다중 토큰을 모두 포함하고 있을수록 보너스 가산
          if (matchedTokenCount > 1) {
            score += (matchedTokenCount * 150);
          }

          // 단 하나라도 일치하여 score가 있는 항목은 모두 살려서 수집
          if (score > 0) {
            scoredItems.push({
              item: s,
              score: score
            });
          }
        });

        // 🌟 가중치 점수(Score) 내림차순 정렬: '관음봉' 일치 항목이 최상단, 그 외 연관 항목이 하단 순차 정렬
        scoredItems.sort(function(a, b) {
          return b.score - a.score;
        });

        matchedList = scoredItems.map(function(wrapper) {
          return wrapper.item;
        }).slice(0, 45);
      }

      if (matchedList.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:40px 10px; color:#64748b; font-size:0.76rem;">일치하는 등록 박지가 없습니다.<br>상단 "직접 입력 적용"을 눌러 원하는 이름을 설정하세요.</div>';
        return;
      }

      listEl.innerHTML = matchedList.map(function(s) {
        var sName = s.name || '힐링 박지';
        var rawElev = String(s.elevation || '').trim();
        // 📐 [고도 단위(m) 표준화 부착]
        var elevFormatted = '';
        if (rawElev) {
          var cleanNum = rawElev.replace(/[^\d.]/g, '');
          if (cleanNum) elevFormatted = '(' + cleanNum + 'm)';
        }
        var sRegion = s.address || s.cityName || '';
        var safeName = escapeHtml(sName);
        var safeElev = escapeHtml(elevFormatted);

        return `
          <div data-name="${safeName}" data-elev="${safeElev}" onclick="window.__selectSpotForRichTrip(this.dataset.name, this.dataset.elev);" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.15s ease;">
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
              <div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
                ${HISTORY_VEC_ICONS.pin}
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
                ${safeElev ? `<span style="font-size:0.65rem; color:#fde047; font-weight:800; font-family:'Space Grotesk', sans-serif;">${safeElev}</span>` : ''}
              </div>
              ${sRegion ? `<span style="font-size:0.65rem; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(sRegion)}</span>` : ''}
            </div>
            <span style="font-size:0.70rem; color:#38bdf8; font-weight:800; flex-shrink:0; margin-left:8px;">선택 ➔</span>
          </div>
        `;
      }).join('');
    };

    window.__selectSpotForRichTrip = function(spotName, elevation) {
      if (!spotName) return;
      triggerHaptic(12);

      // 인풋 포커스 먼저 해제하여 브라우저 강제 스크롤 차단
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.blur();

      if (window.__richCurrentRecord) {
        window.__richCurrentRecord.spot = spotName;
        if (elevation) {
          window.__richCurrentRecord.elevation = elevation.replace(/[()]/g, '');
        }
      }

      // 메모리 캐시 원본 객체도 즉시 동기화 (발행 시 영구 반영)
      var targetInHistory = (window.interactiveHistory || []).find(function(r) {
        return window.__richCurrentRecord && String(r.id).trim() === String(window.__richCurrentRecord.id).trim();
      });
      if (targetInHistory) {
        targetInHistory.spot = spotName;
        if (elevation) targetInHistory.elevation = elevation.replace(/[()]/g, '');
      }

      var badgeTextEl = document.getElementById('richHeaderSpotNameText');
      if (badgeTextEl) {
        badgeTextEl.innerText = spotName;
      }

      var modal = document.getElementById('richTripSpotSearchModal');
      if (modal) modal.remove();

      // 🎯 [카메라/작업 자리 100% 고정]: 선택 직후 스크롤 좌표 완벽 복원
      if (parentScrollContainer) {
        parentScrollContainer.scrollTop = savedParentScrollTop;
        setTimeout(function() {
          if (parentScrollContainer) parentScrollContainer.scrollTop = savedParentScrollTop;
        }, 30);
      }

      if (typeof showToast === 'function') {
        showToast('📍 박지가 [' + spotName + '](으)로 변경되었습니다.', 'success', 1800);
      }
    };

    window.__handleRichSpotFilter('');
    setTimeout(function() {
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.focus();
    }, 150);
  };

 window.isRecordOwner = function(record) {
    if (!record) return false;

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    var myNick = (profile && profile.nickname) ? String(profile.nickname).trim() : (localStorage.getItem('okbm_user_nick') || '');

    var rUserId = String(record.userId || record.user_id || '').trim();
    var rAuthor = String(record.author || record.nick || record.nickname || '').trim();

    // 1. 카카오 고유 ID 1:1 일치
    if (myUserId && rUserId && myUserId === rUserId) return true;

    // 2. 닉네임 1:1 일치 (단, 공용 기본 닉네임은 탈취 차단)
    var isGeneric = (!rAuthor || rAuthor === '낭만루터' || rAuthor === '낭만백패커' || rAuthor === '게스트' || rAuthor === 'guest');
    if (!isGeneric && myNick && rAuthor && myNick === rAuthor) return true;

    // 3. 비로그인 오프라인 임시글만 허용
    if (!record.isPublished && record.id && String(record.id).startsWith('pack_temp_')) {
      return true;
    }

    return false;
  };

  // [모바일 풀스크린 힐링 기록 & 대형 스와이프 에디터 - 본인 소유권 100% 검증 가드 탑재]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;

    // 🛡️ [보안 가드 1]: 타인의 글 수정 원천 차단
    if (!window.isRecordOwner(record)) {
      triggerHaptic(15);
      if (typeof showToast === 'function') {
        showToast('🔒 본인이 작성한 기록만 수정할 수 있습니다.', 'warn', 2200);
      }
      return;
    }

    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;
    var currentPhotos = getRecordPhotos(record);
    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    window.__tempPhotoMemos = [];
    if (Array.isArray(record.photoMemos) && record.photoMemos.length > 0) {
      window.__tempPhotoMemos = record.photoMemos.slice();
    } else {
      var initMemo = (record.memo || record.oneLineMemo || '').slice(0, 120);
      window.__tempPhotoMemos.push(initMemo);
    }

    while (window.__tempPhotoMemos.length < Math.max(1, window.__tempUploadedPhotos.length)) {
      window.__tempPhotoMemos.push('');
    }
window.__currentSwipePhotoIndex = 0;
    var savedSns = localStorage.getItem('okbm_user_instagram') || record.instagram || record.youtube || '';

    // 🌟 [메모 모드 판별: 한 번에 쓰기(single) vs 사진별 쓰기(per_photo)]
    var hasMultiMemos = Array.isArray(record.photoMemos) && record.photoMemos.filter(function(m) { return m && m.trim().length > 0; }).length > 1;
    window.__tempMemoMode = record.memoMode || (hasMultiMemos ? 'per_photo' : 'single');
    window.__tempSingleMemo = (record.memo || record.oneLineMemo || (record.photoMemos && record.photoMemos[0]) || '').slice(0, 120);

    window.__switchMemoMode = function(mode) {
      triggerHaptic(8);
      window.__commitCurrentMemoInput();
      window.__tempMemoMode = mode;

      var btnSingle = document.getElementById('btnMemoModeSingle');
      var btnPerPhoto = document.getElementById('btnMemoModePerPhoto');
      var helperLabel = document.getElementById('richMemoModeHelperLabel');
      var memoInput = document.getElementById('richFormMemoInput');

      if (btnSingle && btnPerPhoto) {
        if (mode === 'single') {
          btnSingle.style.background = '#38bdf8';
          btnSingle.style.color = '#000000';
          btnSingle.style.fontWeight = '900';
          btnPerPhoto.style.background = 'transparent';
          btnPerPhoto.style.color = '#94a3b8';
          btnPerPhoto.style.fontWeight = '700';
          if (helperLabel) helperLabel.innerText = '모든 사진에 공통으로 표시되는 대표 일지입니다.';
          if (memoInput) memoInput.value = window.__tempSingleMemo;
        } else {
          btnPerPhoto.style.background = '#38bdf8';
          btnPerPhoto.style.color = '#000000';
          btnPerPhoto.style.fontWeight = '900';
          btnSingle.style.background = 'transparent';
          btnSingle.style.color = '#94a3b8';
          btnSingle.style.fontWeight = '700';
          if (helperLabel) helperLabel.innerText = '사진을 넘길 때마다 해당 사진의 메모가 바뀝니다.';
          window.__syncActivePhotoMemoUI();
        }
      }
    };

   var curFeedType = record.feedType || 'route';
    var maxPhotoLimit = (curFeedType === 'router') ? 7 : 10;

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000050; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    formModal.innerHTML = `
      <!-- 1. 상단 고정 헤더: 뒤로가기 + 박지/일상 뱃지 + 수정 완료 -->
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:10px 14px; padding-top:calc(10px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10; gap:8px;">
        <button type="button" onclick="document.getElementById('modalRichAfterTrip').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">◀</button>
        
        <button type="button" onclick="window.openSpotSearchModalForRichTrip();" style="display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); padding:4px 10px; border-radius:20px; cursor:pointer; min-height:32px; transition:background 0.15s ease; min-width:0; flex:1; justify-content:center;" title="터치하여 박지 검색 및 변경">
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span id="richHeaderSpotNameText" style="font-size:0.80rem; font-weight:900; color:#38bdf8; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(record.spot)}</span>
          <span style="font-size:0.65rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; flex-shrink:0;">· ${escapeHtml(record.date)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" style="width:10px; height:10px; flex-shrink:0; margin-left:1px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>

        <button type="button" id="btnSubmitRichTrip" onclick="window.__saveRichAfterTrip('${record.id}')" style="white-space:nowrap !important; flex-shrink:0 !important; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; color:#ffffff; font-size:0.78rem; font-weight:900; height:32px; padding:0 12px; border-radius:8px; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4); display:inline-flex; align-items:center; justify-content:center; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:13px; height:13px; flex-shrink:0;" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>저장</span>
        </button>
      </div>

      <!-- 2. 중앙 스크롤 뷰포트 (독바 높이 완벽 대응 패딩 88px 확보) -->
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 14px calc(88px + env(safe-area-inset-bottom, 8px)) 14px; display:flex; flex-direction:column; gap:16px; box-sizing:border-box;">
        
     <!-- 대형 사진 스와이프 무대 섹션 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span id="richPhotoCountLabel" style="font-size:0.82rem; color:#ffffff; font-weight:900;">
                등록된 사진 (${window.__tempUploadedPhotos.length}장 / 최대 ${maxPhotoLimit}장)
              </span>
              <span id="richPhotoActiveIndexBadge" style="font-size:0.62rem; color:#38bdf8; background:rgba(56,189,248,0.14); padding:1px 6px; border-radius:10px; font-weight:900; font-family:'Space Grotesk', sans-serif;">1 / 1</span>
            </div>
            <button type="button" data-record-id="${escapeHtml(String(record.id))}" onclick="window.__deleteCurrentRichTrip(this.dataset.recordId);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); color:#fda4af; font-size:0.68rem; font-weight:800; padding:3px 8px; border-radius:5px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
              <svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:currentColor; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>일지삭제</span>
            </button>
          </div>

          <div id="richLargePhotoStageContainer" style="width:100%; display:flex; flex-direction:column; align-items:center;">
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple="multiple" style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event);" />
        </div>

       <!-- 하단 배치: 한 번에 작성 vs 사진별 작성 듀얼 모드 토글 & 메모 작성 영역 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:3px; background:rgba(255,255,255,0.06); padding:2px; border-radius:8px; border:1px solid rgba(255,255,255,0.12);">
              <button type="button" id="btnMemoModeSingle" onclick="window.__switchMemoMode('single');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:${window.__tempMemoMode==='single'?'#38bdf8':'transparent'}; color:${window.__tempMemoMode==='single'?'#000000':'#94a3b8'}; font-weight:${window.__tempMemoMode==='single'?'900':'700'}; transition:all 0.15s ease;">한 번에 쓰기</button>
              <button type="button" id="btnMemoModePerPhoto" onclick="window.__switchMemoMode('per_photo');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:${window.__tempMemoMode==='per_photo'?'#38bdf8':'transparent'}; color:${window.__tempMemoMode==='per_photo'?'#000000':'#94a3b8'}; font-weight:${window.__tempMemoMode==='per_photo'?'900':'700'}; transition:all 0.15s ease;">사진별 쓰기</button>
            </div>
            <span id="richMemoCharCounter" style="font-size:0.70rem; color:#38bdf8; font-family:'Space Grotesk', sans-serif; font-weight:800;">0/120자</span>
          </div>
          <div id="richMemoModeHelperLabel" style="font-size:0.62rem; color:#64748b; margin-top:-2px;">
            ${window.__tempMemoMode==='single' ? '모든 사진에 공통으로 표시되는 대표 일지입니다.' : '사진을 넘길 때마다 해당 사진의 메모가 바뀝니다.'}
          </div>
          <textarea id="richFormMemoInput" maxlength="120" placeholder="지형 상태, 뷰, 실전 팁 등 현장 기록을 120자 이내로 남겨보세요." oninput="window.__handleRichMemoInput(this.value);" style="width:100%; height:95px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:12px; padding:12px 14px; font-size:0.84rem; line-height:1.55; box-sizing:border-box; outline:none; resize:none; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.02em;"></textarea>
        </div>

        <!-- 하단 배치: 화이트 모노톤 SNS / 채널 링크 입력 영역 -->
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:#e2e8f0; fill:none; stroke-width:2.2;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span style="font-size:0.75rem; color:#e2e8f0; font-weight:800;">SNS / 채널 링크 (선택)</span>
            </div>
            <span style="font-size:0.60rem; color:#64748b;">인스타 ID 또는 유튜브 채널 링크</span>
          </div>
          <input type="text" id="richInputInstagram" value="${escapeHtml(savedSns)}" placeholder="@아이디 또는 채널 주소 (예: @user 또는 youtube.com/@ch)" style="width:100%; height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:8px; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />
        </div>

      </div>
    `;

    document.body.appendChild(formModal);
    window.__renderRichPhotoStage();
  };

 // [박지 후기 및 사진별 120자 영구 각인 단일 저장 엔진 - Await 완전 동기화]
  window.__saveRichAfterTrip = async function(recordId) {
    if (window.__isPhotoCompressing) {
      if (typeof showToast === 'function') showToast('사진 최적화가 진행 중입니다. 잠시만 기다려주세요.', 'info');
      return;
    }

    var sId = String(recordId || '').trim();
    var isSnapTarget = sId.startsWith('snap_') || (window.__richCurrentRecord && window.__richCurrentRecord.feedType === 'router');
    var target = null;
    if (isSnapTarget) {
      var snapPool = window.safeGetStorage('okbm_router_snaps', []) || [];
      target = snapPool.find(function(r) { return r && String(r.id).trim() === sId; });
    } else {
      target = (window.interactiveHistory || []).find(function(r) { return r && String(r.id).trim() === sId; });
    }
    if (!target && window.__richCurrentRecord) {
      target = window.__richCurrentRecord;
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('저장 대상을 찾을 수 없습니다.', 'warn');
      return;
    }

    var photosToProcess = Array.isArray(window.__tempUploadedPhotos) ? window.__tempUploadedPhotos.slice(0, 10) : [];
    if (photosToProcess.length === 0) {
      triggerHaptic(14);
      if (typeof showToast === 'function') showToast('📸 현장 사진을 1장 이상 추가해주세요.', 'warn', 2200);
      return;
    }

    var submitBtn = document.getElementById('btnSubmitRichTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.innerText = '☁️ 클라우드 저장 중...';
    }

    window.__commitCurrentMemoInput();

    var memoInputEl = document.getElementById('richFormMemoInput');
    var finalTypedMemo = memoInputEl ? memoInputEl.value.trim().slice(0, 120) : (window.__tempSingleMemo || '').trim();

    // 🛡️ [저장 시점 미래 날짜 재검증]: 미래 일정이 보관함으로 넘어왔더라도 오늘 날짜로 확정
    var chkDateParts = String(target.date || '').match(/\d+/g);
    if (chkDateParts && chkDateParts.length >= 3) {
      var tY = parseInt(chkDateParts[0], 10);
      var tM = parseInt(chkDateParts[1], 10);
      var tD = parseInt(chkDateParts[2], 10);
      var tObj = new Date(tY, tM - 1, tD);
      var nowLimit = new Date();
      nowLimit.setHours(23, 59, 59, 999);
      if (tObj.getTime() > nowLimit.getTime()) {
        var nD = new Date();
        target.year = nD.getFullYear();
        target.month = nD.getMonth() + 1;
        target.day = nD.getDate();
        target.date = target.year + '.' + String(target.month).padStart(2, '0') + '.' + String(target.day).padStart(2, '0');
      }
    }

    target.memo = finalTypedMemo;
    target.oneLineMemo = finalTypedMemo;

    var instaInput = document.getElementById('richInputInstagram');
    var profile = safeGetJSON('user_profile', null);
    target.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    target.userId = userId;
    var curMasterCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
    if (curMasterCover && String(curMasterCover).startsWith('http')) {
      target.authorPhoto = curMasterCover;
    }

    if (instaInput) {
      var rawSnsVal = instaInput.value.trim();
      if (rawSnsVal) {
        localStorage.setItem('okbm_user_sns_channel', rawSnsVal);
        if (rawSnsVal.includes('youtube.com') || rawSnsVal.includes('youtu.be')) {
          var cleanYt = rawSnsVal.replace(/^@+/, '').split('?')[0].trim();
          var channelMatch = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
          target.youtube = (channelMatch && channelMatch[1]) ? ('https://www.youtube.com/@' + channelMatch[1].replace(/^@/, '')) : (cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt));
          target.instagram = '';
        } else {
          var cleanInsta = rawSnsVal.replace(/^@+/, '').trim();
          target.instagram = cleanInsta ? ('@' + cleanInsta) : '';
          target.youtube = '';
          if (cleanInsta) localStorage.setItem('okbm_user_instagram', '@' + cleanInsta);
        }
      } else {
        localStorage.removeItem('okbm_user_sns_channel');
        localStorage.removeItem('okbm_user_instagram');
        target.instagram = '';
        target.youtube = '';
      }
    }

    var isSingle = (window.__tempMemoMode === 'single');
    target.memoMode = isSingle ? 'single' : 'per_photo';

    if (isSingle) {
      target.memo = finalTypedMemo;
      target.oneLineMemo = finalTypedMemo;
      target.photoMemos = [finalTypedMemo];
    } else {
      var memosToProcess = Array.isArray(window.__tempPhotoMemos) ? window.__tempPhotoMemos.slice(0, Math.max(1, photosToProcess.length)) : [];
      if (memosToProcess.length === 0 || !memosToProcess[0]) {
        memosToProcess[0] = finalTypedMemo;
      }
      target.photoMemos = memosToProcess;
      target.memo = memosToProcess[0] || finalTypedMemo;
      target.oneLineMemo = target.memo.slice(0, 120);
    }

    target.isPublished = true;
    target.isDraft = false;

    // ⚡ 1. [사진 100% 즉시 바인딩]: 업로드 전이라도 메모리/화면에 사진 강제 안착
    var localPhotos = photosToProcess.slice();
    var mainLocalPhoto = localPhotos[0] || '';
    target.photos = localPhotos;
    target.fieldPhoto = mainLocalPhoto;
    target.photo = mainLocalPhoto;
    target.photo_url = mainLocalPhoto;

    var isSnap = Boolean(target.feedType === 'router' || (target.id && String(target.id).startsWith('snap_')));
    target.feedType = isSnap ? 'router' : (target.feedType || 'route');

    // 🔒 [절대 격리]: 사진 맵에 고유 ID 기준으로 즉시 영구 각인
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    savedPhotosMap[String(target.id)] = localPhotos;
    window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

   // 🏛️ 단일 진실 공급원(SSOT): 루트와 루터 저장소를 물리적으로 완전 분리하여 적재
    if (isSnap) {
      if (typeof window.saveRouterSnapRecord === 'function') {
        target = window.saveRouterSnapRecord(target);
      }
    } else {
      if (typeof window.savePackingHistoryRecord === 'function') {
        target = window.savePackingHistoryRecord(target);
      }
    }

    // 🌐 [중요]: 클라우드(R2 + 시트) 전송이 완전히 끝날 때까지 대기
    try {
      if (typeof window.shareFeedToCommunity === 'function') {
        await window.shareFeedToCommunity(target);
      }
      if (typeof syncUserDataToCloud === 'function') {
        syncUserDataToCloud(true);
      }
    } catch (err) {
      console.warn('[RomanticHistory] 클라우드 배포 예외:', err);
    }

    // 🚀 2. 저장이 완전히 확정된 후에만 모달을 닫음
    var editModal = document.getElementById('modalRichAfterTrip');
    if (editModal) editModal.remove();

    var hasPastModal = Boolean(document.getElementById('pastTripsListModal'));
    var singleFeedModal = document.getElementById('singleTripFeedModal');
    if (singleFeedModal) {
      singleFeedModal.remove();
      if (typeof window.openSingleTripDualFeedModal === 'function') {
        window.openSingleTripDualFeedModal(target.id);
      }
    }

    window.activeHistoryFeedTab = (target.feedType === 'router') ? 'router' : 'route';
    if (hasPastModal && typeof window.openPastTripsListModal === 'function') {
      window.openPastTripsListModal();
    } else if (!singleFeedModal && typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') {
      showToast('✓ 클라우드 보관이 완료되었습니다.', 'success', 2000);
    }
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

// 🌐 [제5헌법 준수] Cloudflare R2 글로벌 CDN 1순위 & 구글 드라이브 2순위 듀얼 업로드 엔진
  async function uploadSinglePhotoSmart(base64Data, fileName) {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:')) {
      return base64Data;
    }
    var safeFileName = fileName || ('photo_' + Date.now() + '.jpg');
    var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';

    // ⚡ 1순위: Cloudflare R2 글로벌 CDN 직통 업로드 (초고속 0.2~0.4초)
    try {
      var r2Res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPLOAD_PHOTO_R2',
          base64: base64Data,
          fileName: safeFileName
        })
      });
      if (r2Res.ok) {
        var r2Data = await r2Res.json();
        if (r2Data && r2Data.status === 'SUCCESS' && r2Data.url) {
          return r2Data.url;
        }
      }
    } catch (r2Err) {
      console.warn('[RomanticHistory] R2 업로드 예외, 구글 드라이브 예비망 가동:', r2Err);
    }

    // 🛡️ 2순위: 구글 드라이브 자동 전환 (Failover)
    try {
      var driveRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPLOAD_PHOTO',
          base64: base64Data,
          fileName: safeFileName
        })
      });
      if (driveRes.ok) {
        var dData = await driveRes.json();
        if (dData && dData.status === 'SUCCESS' && dData.url) {
          return dData.url;
        }
      }
    } catch (err) {
      console.warn('[RomanticHistory] 구글 드라이브 예비망 업로드 예외:', err);
    }

    return base64Data;
  }
  window.uploadSinglePhotoSmart = uploadSinglePhotoSmart;
  window.uploadSinglePhotoToDrive = uploadSinglePhotoSmart;

  /// 🏕️ [피드 스트림 전역 탭 상태: 낭만루트(route) vs 낭만루터(router)]
  window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'route';

  window.toggleFeedStreamMode = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var currentMode = window.activeHistoryFeedTab || 'route';
    if (currentMode === 'route') {
      window.switchHistoryFeedTab('router');
      if (typeof showToast === 'function') showToast('🏕️ [낭만루터] 일상 아웃도어 피드를 봅니다.', 'info', 1600);
    } else {
      window.switchHistoryFeedTab('route');
      if (typeof showToast === 'function') showToast('🧭 [낭만루트] 정규 루트 기록을 봅니다.', 'info', 1600);
    }
  };

  window.toggleFeedMode = function(e) {
    window.toggleFeedStreamMode(e);
  };

 // ⚡ [0.03초 듀얼 병렬 인출]: R2 feeds.json(루트) + router_snaps.json(루터) 동시 인출 (제5헌법 준수)
 window.fetchCommunityFeeds = async function(isForce) {
    var r2Domain = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
    var cleanDomain = r2Domain.replace(/\/+$/, '');

    var updateLocalStarsFromFeeds = function(feedList) {
      if (!Array.isArray(feedList)) return;
      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      feedList.forEach(function(f) {
        if (f && f.id) {
          var sId = String(f.id).trim();
          var serverLikes = Number(f.likes) || 0;
          starCounts[sId] = Math.max(Number(starCounts[sId]) || 0, serverLikes);
        }
      });
      localStorage.setItem('okbm_feed_stars_counts', JSON.stringify(starCounts));

      var deletedIds = safeGetJSON('okbm_deleted_record_ids', []);
      var profile = safeGetJSON('user_profile', null);
      var myNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '');
      var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');

      if (!myId || myId === 'guest') return;

      var myFeeds = feedList.filter(function(f) {
        if (!f || !f.id) return false;
        var sFid = String(f.id).trim();
        if (deletedIds.includes(sFid)) return false;
        var fNick = String(f.author || f.nick || f.nickname || '').trim();
        var fId = String(f.user_id || f.userId || '').trim();
        return (fId && fId === myId) || (myNick && fNick === myNick);
      }).map(function(f, idx) {
        var norm = window.normalizeHistoryRecord(f, idx);
        norm.userId = myId;
        norm.author = myNick;
        norm.isPublished = true;
        return norm;
      });

      var currentLocal = window.safeGetStorage('okbm_packing_history', []) || [];
      var mergedList = myFeeds.slice();
      currentLocal.forEach(function(loc) {
        if (loc && loc.id && !deletedIds.includes(String(loc.id).trim())) {
          if (!mergedList.some(function(m) { return String(m.id).trim() === String(loc.id).trim(); })) {
            mergedList.unshift(loc);
          }
        }
      });

      if (mergedList.length > 0) {
        window.safeSetStorage('okbm_packing_history', mergedList);
        window.interactiveHistory = mergedList;
        window.packingHistoryList = mergedList;
      }
    };

    // 🚀 [듀얼 병렬 인출]: feeds.json(루트)과 router_snaps.json(루터) 동시 호출 (30ms)
    try {
      var reqFeeds = fetch(cleanDomain + '/feeds.json?_t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });
      var reqSnaps = fetch(cleanDomain + '/router_snaps.json?_t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : []; }).catch(function(){ return []; });

      var results = await Promise.all([reqFeeds, reqSnaps]);
      var r2Feeds = Array.isArray(results[0]) ? results[0] : [];
      var r2Snaps = Array.isArray(results[1]) ? results[1] : [];

      if (r2Feeds.length > 0) {
        window.__allLoadedFeeds = r2Feeds;
        localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(r2Feeds));
        updateLocalStarsFromFeeds(r2Feeds);
      }
      if (r2Snaps.length > 0) {
        window.__allLoadedRouterSnaps = r2Snaps;
        localStorage.setItem('okbm_cached_router_snaps', JSON.stringify(r2Snaps));
        updateLocalStarsFromFeeds(r2Snaps);
      }

      return window.activeHistoryFeedTab === 'router' ? r2Snaps : r2Feeds;
    } catch (r2Err) {
      console.warn('📡 [History] R2 피드 조회 대기, 구글 시트 백업망 전환:', r2Err.message);
    }

    // 2순위: 구글 시트 백업망 폴백
    try {
      var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
      var res = await fetch(gasUrl + '?action=GET_COMMUNITY_FEEDS&_t=' + Date.now());
      if (res.ok) {
        var cloudFeeds = await res.json();
        if (Array.isArray(cloudFeeds)) {
          window.__allLoadedFeeds = cloudFeeds;
          localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(cloudFeeds));
          updateLocalStarsFromFeeds(cloudFeeds);
          return cloudFeeds;
        }
      }
    } catch (e) {}

    return window.__allLoadedFeeds || [];
  };

  window.switchHistoryFeedTab = async function(tab) {
    if (window.activeHistoryFeedTab === tab) return;
    window.activeHistoryFeedTab = tab;
    triggerHaptic(10);

    // 🌊 [부드러운 크로스페이드 1단계]: 기존 화면을 80ms 동안 자연스럽게 페이드아웃
    var container = document.getElementById('reelsVerticalContainer');
    if (container) {
      container.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
      container.style.opacity = '0.2';
      container.style.transform = 'scale(0.99)';
    }

    // 깜빡이는 로딩 스피너를 띄우지 않고 메모리/로컬 캐시로 즉각 렌더링
    setTimeout(function() {
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
      // 🌊 [부드러운 크로스페이드 2단계]: 새 탭 화면을 실크처럼 스르륵 페이드인
      var newContainer = document.getElementById('reelsVerticalContainer');
      if (newContainer) {
        newContainer.style.opacity = '0.2';
        newContainer.style.transform = 'scale(0.99)';
        newContainer.offsetHeight; // Reflow 강제하여 트랜지션 보장
        newContainer.style.transition = 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        newContainer.style.opacity = '1';
        newContainer.style.transform = 'scale(1)';
      }
    }, 80);

    // 백그라운드에서 최신 R2 피드를 조용히 동기화
    window.fetchCommunityFeeds(true).then(function() {
      // 추가 로드된 피드가 있을 때만 렌더러 부드럽게 갱신
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
    }).catch(function() {});
  };
// 🔄 [피드 스트림 2단 직통 토글]: 전체피드 ⇄ 내 보관함 1:1 스위치 (뺑뺑이 영구 제거)
  window.toggleFeedStreamMode = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    var currentMode = window.activeHistoryFeedTab || 'explore';

    if (currentMode === 'explore') {
      if (!isLogged) {
        if (typeof showToast === 'function') showToast('🔒 내 보관함은 로그인 후 이용하실 수 있습니다.', 'info', 2200);
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
      }
      window.switchHistoryFeedTab('my');
      if (typeof showToast === 'function') showToast('🔒 [내 보관함] 기록을 봅니다.', 'info', 1600);
    } else {
      window.switchHistoryFeedTab('explore');
      if (typeof showToast === 'function') showToast('🌐 [전체 피드]를 둘러봅니다.', 'info', 1600);
    }
  };

 // 📸 [낭만루터 전용: 복잡한 패킹 없이 5초 만에 올리는 일상 스냅 등록 엔진 - 완전 초기화 캔버스]
  window.openNewRouterSnapModal = function() {
    triggerHaptic(12);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      if (typeof showToast === 'function') showToast('🔒 일상 스냅 등록은 카카오 로그인 후 이용하실 수 있습니다.', 'info', 2000);
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
      } else if (typeof openLoginModal === 'function') {
        openLoginModal();
      }
      return;
    }

    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var todayStr = y + '.' + m + '.' + d;

    var profile = safeGetJSON('user_profile', null);
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    var authorNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');

    // 🧹 [잔류 캐시 오염 100% 완전 초기화]
    window.__tempUploadedPhotos = [];
    window.__tempPhotoMemos = [''];
    window.__tempSingleMemo = '';
    window.__currentSwipePhotoIndex = 0;

   // 🌟 [절대 중복 방지 고유 ID 생성 및 신규 등록 확정 증표 각인]
    var uniqueSnapId = 'snap_' + userId.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

    var newSnapRecord = {
      id: uniqueSnapId,
      isNewPost: true, // 🚀 신규 등록 증표 (기존 글 검색 및 덮어쓰기 완전 차단)
      feedType: 'router',
      author: authorNick,
      userId: userId,
      date: todayStr,
      year: y,
      month: parseInt(m, 10),
      day: parseInt(d, 10),
      spot: '나의 아웃도어',
      elevation: '',
      weightKg: '0.00',
      items: [],
      photos: [],
      photo: '',
      fieldPhoto: '',
      photoMemos: [''],
      memo: '',
      oneLineMemo: '',
      isPublished: true,
      instagram: localStorage.getItem('okbm_user_instagram') || ''
    };

    window.__richCurrentRecord = newSnapRecord;
    window.openRichAfterTripModal(newSnapRecord);
  };
 // 🔘 [인스타그램 가로 슬라이더 도트 & 사진별 120자 고정 3줄 메모 실시간 동기화]
  window.updateCarouselFeedState = function(container, cardId) {
    if (!container || !cardId) return;

    var scrollLeft = container.scrollLeft;
    var width = container.offsetWidth;
    if (!width) return;
    var curIdx = Math.round(scrollLeft / width);

    // 1. 도트 인디케이터 실시간 업데이트
    var wrap = document.getElementById('dotsWrap_' + cardId);
    if (wrap) {
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
    }

    // 2. 하단 고정 3줄 메모장 실시간 동기화 (레이아웃 시프트 0%)
    var memoEl = document.getElementById('feedPhotoMemoText_' + cardId);
    var cardRoot = document.getElementById('feedSnapCard_' + cardId);
    if (memoEl && cardRoot && cardRoot.dataset.photoMemos) {
      try {
        var memos = JSON.parse(cardRoot.dataset.photoMemos);
        var curText = (Array.isArray(memos) && memos[curIdx] !== undefined) ? memos[curIdx] : '';
        if (!curText && curIdx === 0 && cardRoot.dataset.defaultMemo) {
          curText = cardRoot.dataset.defaultMemo;
        }
        memoEl.innerHTML = (curText && curText.trim().length > 0)
          ? escapeHtml(curText.trim())
          : '<span style="color:#475569;">등록된 사진 메모가 없습니다.</span>';
      } catch (err) {}
    }
  };

 // 하위 호환성 유지 알리아스
  window.updateCarouselDots = window.updateCarouselFeedState;

  // 📐 [가로/세로 스마트 자동 판별]: 세로는 꽉 채우고(Cover), 가로는 100% 비율 보존(Contain + 위아래 블랙)
  window.applySmartPhotoFit = function(img) {
    if (!img) return;
    var nw = img.naturalWidth;
    var nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      if (nh >= nw) {
        img.classList.add('is-portrait');
        img.style.setProperty('object-fit', 'cover', 'important');
      } else {
        img.classList.remove('is-portrait');
        img.style.setProperty('object-fit', 'contain', 'important');
      }
    }
  };

window.renderHistoryStage = function(isLoading) {
    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) return;

    var content = modal.querySelector('.romantic-history-content');
    if (!content) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;

    // 🛡️ [하위 호환 및 런타임 ReferenceError 100% 방탄 선언]
    var isMyTab = false;

    // 🌟 최신순 내림차순 정렬
    var sortDescFn = function(list) {
      if (!Array.isArray(list)) return [];
      return list.slice().sort(function(a, b) {
        return window.getRecordDateNum(b) - window.getRecordDateNum(a);
      });
    };

   window.interactiveHistory = sortDescFn(window.interactiveHistory || []);

    if (window.activeHistoryFeedTab !== 'route' && window.activeHistoryFeedTab !== 'router') {
      window.activeHistoryFeedTab = 'route';
    }

    var isRouteTab = (window.activeHistoryFeedTab === 'route');

    // 🔒 [원천 차단]: 메인 피드에서는 비공개('나만보기') 글을 무조건 제외 (보관함 모달에서만 확인)
    var allPublicList = [];
    if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
      allPublicList = window.__allLoadedFeeds.filter(function(f) { return f && f.isPublished !== false; });
    } else {
      allPublicList = (window.safeGetStorage('okbm_cached_community_feeds', []) || []).filter(function(f) { return f && f.isPublished !== false; });
    }

   // 내 공개 루트 글 병합
    (window.interactiveHistory || []).forEach(function(myRec) {
      if (myRec && myRec.isPublished === true) {
        if (!allPublicList.some(function(p) { return String(p.id).trim() === String(myRec.id).trim(); })) {
          allPublicList.push(myRec);
        }
      }
    });

    // 내 일상 스냅 글 병합 (저장 즉시 0.001초 만에 화면에 실시간 노출)
    var mySnaps = window.safeGetStorage('okbm_router_snaps', []) || [];
    mySnaps.forEach(function(mySnap) {
      if (mySnap && mySnap.isPublished === true) {
        if (!allPublicList.some(function(p) { return String(p.id).trim() === String(mySnap.id).trim(); })) {
          allPublicList.push(mySnap);
        }
      }
    });

  // 🧭 [낭만루트 vs 낭만루터 정밀 필터링 - 사진 0개 유령 카드 자동 소거 및 정본 렌더링]
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
      savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
    }

    // 🛡️ [공개 피드 단일 공급원]: 메인 릴스 피드에는 오직 공개(isPublished === true) 피드만 진입 (나만보기는 보관함 모아보기에서만 확인)
    var sourceList = [];
    if (isRouteTab) {
      // 🧭 낭만루트: 내 로컬 공개글 + R2 공용 루트 피드
      sourceList = (window.safeGetStorage('okbm_packing_history', []) || []).filter(function(r) {
        return r && r.isPublished === true && r.feedType !== 'router' && !String(r.id).startsWith('snap_');
      });
      allPublicList.forEach(function(p) {
        if (p && p.isPublished === true && p.feedType !== 'router' && !String(p.id).startsWith('snap_')) {
          if (!sourceList.some(function(s) { return String(s.id).trim() === String(p.id).trim(); })) {
            sourceList.push(p);
          }
        }
      });
    } else {
      // 🏕️ 낭만루터: 내 로컬 공개 스냅 + R2 공용 루터 스냅 (비로그인 방문자도 전체 공개 스냅 100% 감상)
      sourceList = (window.safeGetStorage('okbm_router_snaps', []) || []).filter(function(r) {
        return r && r.isPublished !== false;
      });
      allPublicList.forEach(function(p) {
        if (p && p.isPublished !== false && (p.feedType === 'router' || String(p.id).startsWith('snap_'))) {
          if (!sourceList.some(function(s) { return String(s.id).trim() === String(p.id).trim(); })) {
            sourceList.push(p);
          }
        }
      });
   // 🌟 [비로그인/로그인 공통]: R2 router_snaps.json 정본 스냅 100% 최우선 직통 바인딩
      var r2Snaps = Array.isArray(window.__allLoadedRouterSnaps) && window.__allLoadedRouterSnaps.length > 0
        ? window.__allLoadedRouterSnaps
        : (safeGetJSON('okbm_cached_router_snaps', []) || []);

      // 메모리가 비어있을 경우 R2 즉시 인출 비동기 백업 트리거
      if (r2Snaps.length === 0 && !window.__isSnapsFetching) {
        window.__isSnapsFetching = true;
        var r2DomainStr = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
        fetch(r2DomainStr.replace(/\/+$/, '') + '/router_snaps.json?_t=' + Date.now())
          .then(function(r){ return r.ok ? r.json() : []; })
          .then(function(liveSnaps){
            window.__isSnapsFetching = false;
            if (Array.isArray(liveSnaps) && liveSnaps.length > 0) {
              window.__allLoadedRouterSnaps = liveSnaps;
              localStorage.setItem('okbm_cached_router_snaps', JSON.stringify(liveSnaps));
              if (window.activeHistoryFeedTab === 'router' && typeof window.renderHistoryStage === 'function') {
                window.renderHistoryStage();
              }
            }
          }).catch(function(){ window.__isSnapsFetching = false; });
      }

      r2Snaps.forEach(function(af) {
        if (af && af.isPublished !== false) {
          if (!sourceList.some(function(s) { return String(s.id).trim() === String(af.id).trim(); })) {
            sourceList.push(af);
          }
        }
      });

      // feeds.json 내 혹시 포함된 보조 스냅도 합집합 병합
      var r2Pool = Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : [];
      r2Pool.forEach(function(af) {
        if (af && af.isPublished !== false) {
          var isSnapItem = Boolean(af.feedType === 'router' || (af.id && String(af.id).startsWith('snap_')));
          if (isSnapItem && !sourceList.some(function(s) { return String(s.id).trim() === String(af.id).trim(); })) {
            sourceList.push(af);
          }
        }
      });
    }

    // 🛡️ [제6헌법 준수]: 삭제 목록(okbm_deleted_record_ids) 배제 및 비로그인 게스트 뷰 100% 보장
    var deletedRecordIds = safeGetJSON('okbm_deleted_record_ids', []);

    var normalizedPublicList = sourceList.map(function(rawItem, rIdx) {
      var norm = window.normalizeHistoryRecord(rawItem, rIdx);
      var sId = String(norm.id || '').trim();
      var foundPhotos = savedPhotosMap[sId] || (norm.date && savedPhotosMap[String(norm.date)]) || (norm.date && savedPhotosMap[String(norm.date).replace(/[-/]/g, '.')]);
      
      if ((!norm.photos || norm.photos.length === 0) && foundPhotos && foundPhotos.length > 0) {
        norm.photos = Array.isArray(foundPhotos) ? foundPhotos : [foundPhotos];
        norm.photo = norm.photos[0];
        norm.fieldPhoto = norm.photos[0];
      }
      return norm;
    }).filter(function(norm) {
      if (!norm || !norm.id || norm.isPublished === false) return false;
      return !deletedRecordIds.includes(String(norm.id).trim());
    });

    var currentList = normalizedPublicList.filter(function(norm) {
      if (!norm || !norm.id) return false;
      // 비공개(isPublished === false) 명시 건만 배제하고 R2 공용 스냅은 100% 통과
      if (norm.isPublished === false) return false;

      var isSnap = Boolean(
        norm.feedType === 'router' ||
        (norm.id && String(norm.id).startsWith('snap_')) ||
        norm.isRouterSnap === true
      );

      // 사진 0개 시 글을 증발시키던 가드 원천 삭제 ➔ 기본 사진으로 방어
      if (isSnap && (!norm.photos || norm.photos.length === 0)) {
        var fallbackPhoto = norm.photo || norm.fieldPhoto || norm.photo_url || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
        norm.photos = [fallbackPhoto];
        norm.photo = fallbackPhoto;
        norm.fieldPhoto = fallbackPhoto;
      }

      return isRouteTab ? !isSnap : isSnap;
    });

    // 🌟 [스마트폰 비로그인 구제]: R2에 스냅이 있는데 0개로 걸러졌을 경우 R2 원본 2개 무조건 직통 바인딩
    if (!isRouteTab && currentList.length === 0 && Array.isArray(window.__allLoadedRouterSnaps) && window.__allLoadedRouterSnaps.length > 0) {
      currentList = window.__allLoadedRouterSnaps.map(function(s, idx) {
        var n = window.normalizeHistoryRecord(s, idx);
        n.feedType = 'router';
        if (!n.photos || n.photos.length === 0) {
          var fb = n.photo || n.fieldPhoto || n.photo_url || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
          n.photos = [fb];
          n.photo = fb;
          n.fieldPhoto = fb;
        }
        return n;
      });
    }

    currentList = sortDescFn(currentList);

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var savedNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    var savedInsta = localStorage.getItem('okbm_user_instagram') || '';
    var starsMap = safeGetJSON('okbm_feed_stars_map', {});
    var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
    var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);

    // 🎨 [낭만루트 헌법 준수: 눈부심 0% 순수 매트블랙 단일 테마 통일]
    var stageBg = '#000000';
    var headerBg = '#000000';
    var headerBorder = '1px solid rgba(255,255,255,0.06)';

   var reelSlidesHtml = '';
    if (isLoading) {
      reelSlidesHtml = '<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:#38bdf8;">' +
        '<svg viewBox="0 0 24 24" style="width:36px; height:36px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>' +
        '<div style="font-size:0.86rem; font-weight:800; color:#e2e8f0;">최신 피드 동기화 중...</div>' +
      '</div>';
  } else if (currentList.length === 0) {
      var emptyMsg = isRouteTab ? '등록된 낭만루트 기록이 없습니다.' : '등록된 낭만루터 일상 스냅이 없습니다.';
      var emptySubMsg = isRouteTab ? '플랜에서 패킹 완료 후 보관함에 저장된 루트 기록이 표시됩니다.' : '자연 속 멋진 사진과 함께 일상 스냅을 남겨보세요.';

      var actionButtonsHtml = isRouteTab ? (
        '<button type="button" onclick="window.activeHistoryFeedTab=\'router\'; window.renderHistoryStage(); triggerHaptic(10);" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:10px; color:#ffffff; font-size:0.78rem; font-weight:900; padding:9px 16px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(2,132,199,0.35);">' +
          '<svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>' +
          '<span>낭만루터 둘러보기</span>' +
        '</button>'
      ) : (
        '<div style="display:flex; flex-direction:column; gap:8px; width:100%; max-width:260px;">' +
          '<button type="button" onclick="window.openNewRouterSnapModal();" style="width:100%; background:linear-gradient(135deg, #38bdf8, #0284c7); border:none; border-radius:10px; color:#000000; font-size:0.82rem; font-weight:900; padding:11px 16px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(56,189,248,0.35);">' +
            '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            '<span>일상 스냅 올리기</span>' +
          '</button>' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'route\'; window.renderHistoryStage(); triggerHaptic(10);" style="width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:10px; color:#cbd5e1; font-size:0.75rem; font-weight:800; padding:9px 16px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:6px;">' +
            '<span>낭만루트 둘러보기 ➔</span>' +
          '</button>' +
        '</div>'
      );

      reelSlidesHtml = '<div class="reel-page-snap" style="width:100% !important; height:100% !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:14px; padding:30px; text-align:center; box-sizing:border-box;">' +
        '<div style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8;">' +
          (isRouteTab
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:24px; height:24px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:26px; height:26px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
          ) +
        '</div>' +
        '<div style="font-size:0.95rem; font-weight:800; color:#ffffff;">' + emptyMsg + '</div>' +
        '<div style="font-size:0.75rem; color:#94a3b8; line-height:1.5;">' + emptySubMsg + '</div>' +
        actionButtonsHtml +
      '</div>';
    } else {
    reelSlidesHtml = currentList.map(function(item, idx) {
        var record = window.normalizeHistoryRecord(item, idx);
        var cardId = escapeHtml(String(record.id || idx));
        var tmplPhoto = record.customTemplatePhoto || (item && item.customTemplatePhoto) || '';
        if (!tmplPhoto && window.__memoryStore && window.__memoryStore['okbm_custom_templates_map']) {
          tmplPhoto = window.__memoryStore['okbm_custom_templates_map'][String(record.id)] || window.__memoryStore['okbm_custom_templates_map'][String(record.date)] || '';
        }

       var rawPhotosList = (typeof getRecordPhotos === 'function') ? getRecordPhotos(record) : (record.photos || []);
        var photos = rawPhotosList;

        // 🛡️ [낭만루트 전용 가드]: 오직 낭만루트(배낭패킹)일 때만 뒷면 템플릿 검사 적용, 낭만루터(스냅)는 100% 사진 그대로 표출
        if (isRouteTab && tmplPhoto && String(tmplPhoto).trim().length > 10) {
          var hasUserFieldLog = Boolean(record.photoMemos && record.photoMemos.length > 0 && record.photoMemos.some(function(m) { return m && m.trim().length > 0; }));
          if (!hasUserFieldLog) {
            photos = [];
          } else {
            photos = rawPhotosList.filter(function(p) { return p && p !== tmplPhoto; });
          }
        }

       var spotName = record.spot || '나의 힐링 스팟';
        var tripDate = record.date || '';
        var weightKg = record.weightKg || '0.00';
        var memo120 = (record.memo || record.oneLineMemo || '').slice(0, 120);
        var authorName = record.author || record.nick || '낭만루터';
        var instaId = record.instagram || record.instaId || '';
        var cleanInsta = String(instaId).replace(/[@\s]/g, '').trim();
        var itemsCount = Array.isArray(record.items) ? record.items.length : 0;

        var isStarred = Boolean(starsMap[cardId]);
        var starCount = Number(starCounts[cardId] || 0);
        var mediaItems = (photos && photos.length > 0) ? photos : [];
        var totalPhotosCount = mediaItems.length;

       var recordUserId = String(record.userId || '').trim();
        var cardPureId = String(record.id || '').trim();

       // 🛡️ [절대 보안 헌법]: 비로그인 상태면 무조건 타인의 글로 취급 (수정/삭제/서랍 버튼 원천 배제)
        var isMyRecord = false;
        if (isLogged) {
          isMyRecord = (typeof window.isRecordOwner === 'function')
            ? window.isRecordOwner(record)
            : (myUserId && recordUserId && myUserId === recordUserId);
        }

        var followingList = safeGetJSON('okbm_following_users', []);

        var followingList = safeGetJSON('okbm_following_users', []);
        var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);
       var followKey = recordUserId || authorName;
        var isFollowingThisAuthor = followingList.includes(followKey);

        // 🌐 [지능형 SNS/채널 자동 감지기]
        var rawSnsText = String(record.instagram || record.youtube || record.youtubeUrl || '').trim();
        var instaTargetUrl = '';
        var youtubeTargetUrl = '';

        if (rawSnsText.includes('youtube.com') || rawSnsText.includes('youtu.be')) {
          var cleanYt = rawSnsText.replace(/^@+/, '').split('?')[0].trim();
          var channelMatch = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
          if (channelMatch && channelMatch[1]) {
            youtubeTargetUrl = 'https://www.youtube.com/@' + channelMatch[1].replace(/^@/, '');
          } else {
            youtubeTargetUrl = cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt);
          }
        } else if (rawSnsText) {
          if (rawSnsText.includes('instagram.com')) {
            var cleanInstaUrl = rawSnsText.replace(/^@+/, '').split('?')[0].trim();
            instaTargetUrl = cleanInstaUrl.startsWith('http') ? cleanInstaUrl : ('https://' + cleanInstaUrl);
          } else {
            var pureInstaId = rawSnsText.replace(/[@\s]/g, '').trim();
            if (pureInstaId) instaTargetUrl = 'https://instagram.com/' + pureInstaId;
          }
        }

        if (!youtubeTargetUrl && record.youtube) {
          var yStr = String(record.youtube).replace(/^@+/, '').split('?')[0].trim();
          var m = yStr.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)?([\w\-\_\.]+)/i);
          if (m && m[1]) {
            youtubeTargetUrl = 'https://www.youtube.com/@' + m[1].replace(/^@/, '');
          }
        }

        var socialBadgesHtml = '';
        if (instaTargetUrl) {
          socialBadgesHtml += '<a href="' + instaTargetUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0; transition:all 0.15s ease;" title="인스타그램 프로필">' +
            '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
          '</a>';
        }
        if (youtubeTargetUrl) {
          socialBadgesHtml += '<a href="' + youtubeTargetUrl + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0; transition:all 0.15s ease;" title="유튜브 채널">' +
            '<svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none">' +
              '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#f43f5e"/>' +
              '<path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff"/>' +
            '</svg>' +
          '</a>';
        }

        // 👥 [이웃/관심 버튼]
        var followHeaderBtn = '';
        if (!isMyRecord) {
          followHeaderBtn = isFollowingThisAuthor
            ? '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorName) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.14); border:1px solid #34d399; color:#34d399; font-size:0.62rem; font-weight:900; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:8px; height:8px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>관심</span></button>'
            : '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorName) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.62rem; font-weight:800; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:8px; height:8px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>관심</span></button>';
        }

        // 🔘 [낭만루트 카드 상단 우측 전용 세그먼트 스위치]
        var routeCardToggleHtml = '<div style="display:flex; align-items:center; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:2px; box-sizing:border-box;">' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'route\'; window.renderHistoryStage(); triggerHaptic(8);" style="background:#38bdf8; border:none; color:#000000; font-size:0.65rem; font-weight:900; padding:3px 8px; border-radius:12px; cursor:pointer;">낭만루트</button>' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'router\'; window.renderHistoryStage(); triggerHaptic(8);" style="background:transparent; border:none; color:#94a3b8; font-size:0.65rem; font-weight:700; padding:3px 8px; border-radius:12px; cursor:pointer;">낭만루터</button>' +
        '</div>';

        // 🏷️ [낭만루트 vs 낭만루터 헤더/메타 완벽 분리]
        var isRegisteredSpot = window.isSpotRegisteredInMasterDB(spotName);
        var routeOriginalHeaderHtml = '';
        var routerBottomMetaHtml = '';

if (isRouteTab) {
          // 🧭 [낭만루트]: 등록자 프로필 사진(SSOT) 100% 범용 직통 바인딩
          var myMasterCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
          var authorAvatarUrl = isMyRecord
            ? (myMasterCover || record.authorPhoto || '')
            : (record.authorPhoto || '');

          var hasValidImg = Boolean(authorAvatarUrl && String(authorAvatarUrl).startsWith('http'));

          var avatarMarkup = hasValidImg
            ? '<img src="' + escapeHtml(authorAvatarUrl) + '" style="width:100%; height:100%; object-fit:cover; display:block;" />'
            : '<div style="width:100%; height:100%; background:#090d14; display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" style="width:18px; height:18px;" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';

          routeOriginalHeaderHtml = '<div class="reel-header-row" style="height:56px !important; padding:0 14px !important;">' +
            '<div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">' +
              '<button type="button" data-author="' + escapeHtml(authorName) + '" data-user-id="' + escapeHtml(recordUserId) + '" onclick="event.stopPropagation(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId);" style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b; border:1.5px solid rgba(186,230,253,0.35); padding:0; cursor:pointer; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.6);" title="' + escapeHtml(authorName) + '님의 피드 모아보기">' +
                avatarMarkup +
              '</button>' +
              '<div style="display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1;">' +
                '<span style="font-size:0.68rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace; line-height:1.2;">' + escapeHtml(tripDate) + '</span>' +
                (isRegisteredSpot ? (
                  '<button type="button" data-spot="' + escapeHtml(spotName) + '" onclick="window.navigateToSpotMap(this.dataset.spot, event);" style="background:none; border:none; padding:0; display:inline-flex; align-items:center; gap:2px; cursor:pointer; text-align:left; min-width:0; overflow:hidden;" title="지도에서 박지 위치 확인">' +
                    '<span style="font-size:0.82rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-decoration:underline; text-decoration-color:rgba(56,189,248,0.45); text-underline-offset:2px; line-height:1.3;">' + escapeHtml(spotName) + '</span>' +
                    '<span style="font-size:0.60rem; color:#38bdf8; font-weight:900; flex-shrink:0;">↗</span>' +
                  '</button>'
                ) : (
                  '<span style="font-size:0.82rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.3;">' + escapeHtml(spotName) + '</span>'
                )) +
              '</div>' +
            '</div>' +
            '<div style="display:flex; align-items:center; flex-shrink:0;">' +
              routeCardToggleHtml +
            '</div>' +
          '</div>';
        } else {
          // 🏕️ [낭만루터]: 닉네임 옆 불필요한 관심 버튼 제거 ➔ 닉네임 클릭 모달로 일원화
          routerBottomMetaHtml = '<div style="display:flex; align-items:center; justify-content:space-between; gap:6px; min-width:0; margin-bottom:4px;">' +
            '<div style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;">' +
              '<button type="button" data-author="' + escapeHtml(authorName) + '" data-user-id="' + escapeHtml(recordUserId) + '" onclick="event.stopPropagation(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId);" style="background:none; border:none; padding:0; font-size:0.86rem; color:#ffffff; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; text-align:left; display:inline-flex; align-items:center; gap:3px;">' +
                '<span>' + escapeHtml(authorName) + '</span>' +
                '<svg viewBox="0 0 24 24" style="width:9px; height:9px; stroke:#38bdf8; fill:none; stroke-width:2.5;"><polyline points="9 18 15 12 9 6"/></svg>' +
              '</button>' +
              socialBadgesHtml +
              '<span style="font-size:0.68rem; color:#cbd5e1; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">· ' + escapeHtml(spotName) + '</span>' +
            '</div>' +
            '<span style="font-size:0.65rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace; flex-shrink:0;">' + escapeHtml(tripDate) + '</span>' +
          '</div>';
        }

        // 🧰 [하단 4대 도구 인라인 슬라이드 서랍 토글]
        window.toggleFeedBottomTools = function(cardId, e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          triggerHaptic(10);

          var drawer = document.getElementById('bottomToolsDrawer_' + cardId);
          var triggerBtn = document.getElementById('btnToggleBottomTools_' + cardId);
          if (!drawer || !triggerBtn) return;

          var isOpen = drawer.dataset.opened === 'true';

          document.querySelectorAll('[id^="bottomToolsDrawer_"]').forEach(function(d) {
            if (d !== drawer) {
              d.style.maxWidth = '0px';
              d.style.opacity = '0';
              d.style.transform = 'scale(0.85) translateX(12px)';
              d.style.pointerEvents = 'none';
              d.dataset.opened = 'false';
              var bId = d.id.replace('bottomToolsDrawer_', 'btnToggleBottomTools_');
              var btn = document.getElementById(bId);
              if (btn) {
                btn.style.transform = 'rotate(0deg)';
                btn.style.color = '#94a3b8';
                btn.style.borderColor = 'rgba(255,255,255,0.15)';
              }
            }
          });

          if (isOpen) {
            drawer.style.maxWidth = '0px';
            drawer.style.opacity = '0';
            drawer.style.transform = 'scale(0.85) translateX(12px)';
            drawer.style.pointerEvents = 'none';
            drawer.dataset.opened = 'false';
            triggerBtn.style.transform = 'rotate(0deg)';
            triggerBtn.style.color = '#94a3b8';
            triggerBtn.style.borderColor = 'rgba(255,255,255,0.15)';
          } else {
            drawer.style.maxWidth = '210px';
            drawer.style.opacity = '1';
            drawer.style.transform = 'scale(1) translateX(0px)';
            drawer.style.pointerEvents = 'auto';
            drawer.dataset.opened = 'true';
            triggerBtn.style.transform = 'rotate(90deg)';
            triggerBtn.style.color = '#38bdf8';
            triggerBtn.style.borderColor = '#38bdf8';
          }
        };

        // 🛠️ [하단 우측 슬라이딩 도구 서랍: 해당 글 관리 전담]
        var isPub = Boolean(record.isPublished === true);
        var bottomToolsHtml = '';

        if (isMyRecord) {
          bottomToolsHtml = '<div style="display:flex; align-items:center; justify-content:flex-end; position:relative; flex-shrink:0;">' +
            '<div id="bottomToolsDrawer_' + cardId + '" data-opened="false" style="display:flex; align-items:center; gap:6px; max-width:0px; opacity:0; transform:scale(0.85) translateX(12px); transform-origin:right center; overflow:hidden; transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1); pointer-events:none; margin-right:6px; box-sizing:border-box;">' +
              '<button type="button" onclick="window.openPastTripsListModal(); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#38bdf8; flex-shrink:0;" title="보관함 모아보기">' +
                '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
              '</button>' +
              '<button type="button" data-record-id="' + cardId + '" data-lock-btn-id="' + cardId + '" onclick="window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:' + (isPub ? '#34d399' : '#38bdf8') + '; flex-shrink:0;" title="' + (isPub ? '전체 공개 중' : '비공개 (나만보기)') + '">' +
                (isPub
                  ? '<svg viewBox="0 0 24 24" style="width:16px; height:16px; color:#34d399;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>'
                  : '<svg viewBox="0 0 24 24" style="width:16px; height:16px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
                ) +
              '</button>' +
              '<button type="button" data-record-id="' + cardId + '" onclick="window.openRichAfterTripModal(window.interactiveHistory.find(function(r){return String(r.id)===\'' + cardId + '\';})); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fde047; flex-shrink:0;" title="일지 및 사진 수정">' +
                '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
              '</button>' +
              '<button type="button" data-record-id="' + cardId + '" onclick="if(confirm(\'이 기록을 영구 삭제하시겠습니까?\')){ window.deleteTripRecord(this.dataset.recordId); } triggerHaptic(14);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#f43f5e; flex-shrink:0;" title="기록 삭제">' +
                '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
              '</button>' +
            '</div>' +
            '<button type="button" id="btnToggleBottomTools_' + cardId + '" data-card-id="' + cardId + '" onclick="window.toggleFeedBottomTools(this.dataset.cardId, event);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#94a3b8; transition:all 0.2s ease; flex-shrink:0;" title="관리 도구 열기">' +
              '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
            '</button>' +
          '</div>';
        } else if (isLogged) {
          // 👥 [로그인 회원 전용]: 로그인한 유저가 타인의 글을 볼 때만 '관심 모아보기' 버튼 활성화
          bottomToolsHtml = '<div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">' +
            '<button type="button" onclick="window.openRomanticInterestModal(\'routers\'); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#c084fc;" title="관심 모아보기">' +
              '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
            '</button>' +
          '</div>';
        } else {
          // 🚫 [비로그인 게스트]: 불필요한 개인화 관리 버튼 일체 100% 완전 은닉
          bottomToolsHtml = '';
        }

        // 📷 [인스타그램 규격 순수 매트블랙 사진 트랙]
        var horizontalSlidesHtml = '';
        if (totalPhotosCount === 0) {
          horizontalSlidesHtml = '<div style="flex:0 0 100% !important; width:100% !important; height:100% !important; background:#000000; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:10px; padding:24px; box-sizing:border-box; text-align:center;">' +
            '<div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.04); border:1.5px dashed rgba(56,189,248,0.35); display:flex; align-items:center; justify-content:center; color:#38bdf8;">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:24px; height:24px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
            '</div>' +
            '<div style="font-size:0.86rem; font-weight:800; color:#cbd5e1;">등록된 현장 사진이 없습니다</div>' +
            '<div style="font-size:0.68rem; color:#64748b; line-height:1.4;">하단 [···] 도구에서 사진을 추가해보세요</div>' +
          '</div>';
        } else {
          horizontalSlidesHtml = mediaItems.map(function(pUrl) {
            return '<div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000000; display:flex; align-items:center; justify-content:center;">' +
              '<img class="reel-photo-target" src="' + pUrl + '" loading="eager" decoding="async" />' +
            '</div>';
          }).join('');
        }

        var dotsHtml = '';
        if (totalPhotosCount > 1) {
          var dotsItemsHtml = Array.from({ length: totalPhotosCount }).map(function(_, dIdx) {
            var dotW = (dIdx === 0) ? '12px' : '4px';
            var dotBg = (dIdx === 0) ? '#ffffff' : 'rgba(255,255,255,0.3)';
            var dotShadow = (dIdx === 0) ? 'box-shadow:0 0 6px rgba(255,255,255,0.8);' : '';
            return '<div class="carousel-dot-item" style="width:' + dotW + '; height:3.5px; border-radius:2px; background:' + dotBg + '; ' + dotShadow + ' transition:all 0.2s ease;"></div>';
          }).join('');
          dotsHtml = '<div id="dotsWrap_' + cardId + '" style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); z-index:5; display:flex; justify-content:center; align-items:center; gap:4px; height:14px; padding:0 8px; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); border-radius:10px; border:1px solid rgba(255,255,255,0.15); pointer-events:none;">' + dotsItemsHtml + '</div>';
        }

        var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
        var tmplId = record.templateId || savedTmplId;
        var rawPhoto = mediaItems[0] || '';
        var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);
        var backTemplateCardHtml = '';

        if (genFn) {
          backTemplateCardHtml = genFn(tmplId, record, record.items || [], spotName, memo120 || spotName, rawPhoto);
        } else {
          backTemplateCardHtml = '<div style="width:100%; height:100%; background:#090d15; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">' +
            '<div>' +
              '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(255,255,255,0.18); padding-bottom:6px;">' +
                '<span style="font-size:0.90rem; font-weight:800; color:#38bdf8; display:flex; align-items:center; gap:4px;">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>' +
                  '<span>' + escapeHtml(spotName) + '</span>' +
                '</span>' +
                '<span style="font-size:0.65rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace;">' + escapeHtml(tripDate) + '</span>' +
              '</div>' +
              '<div style="margin-top:12px; display:flex; justify-content:space-between; align-items:baseline; background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">' +
                '<span style="font-size:0.72rem; color:#94a3b8; font-weight:700;">총 패킹 무게</span>' +
                '<span style="font-size:1.45rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightKg + ' KG</span>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:0.58rem; color:#64748b; text-align:center; margin-top:5px;">터치 시 사진으로 복귀</div>' +
          '</div>';
        }

        // 스튜디오 합성 완성 카드가 있을 때는 해당 이미지를 템플릿 면에 풀프레임 매핑
        var studioCardMarkup = (tmplPhoto && String(tmplPhoto).trim().length > 10)
          ? '<div style="width:100%; height:100%; position:relative; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center;">' +
              '<img class="reel-photo-target" src="' + escapeHtml(tmplPhoto) + '" style="width:100% !important; height:100% !important; object-fit:cover !important; display:block;" />' +
            '</div>'
          : backTemplateCardHtml;

        var photoMemosArr = (Array.isArray(record.photoMemos) && record.photoMemos.length > 0) ? record.photoMemos : [memo120];
        var initialPhotoMemo = photoMemosArr[0] || memo120 || '';
        var cleanMemoContentHtml = initialPhotoMemo.trim()
          ? escapeHtml(initialPhotoMemo.trim())
          : '<span style="color:#475569;">등록된 일지 메모가 없습니다.</span>';

        var isSavedFeed = savedFeedsList.includes(String(record.id || '').trim());

        var cardSnapPaddingTop = isRouteTab
          ? 'calc(env(safe-area-inset-top, 0px))'
          : 'calc(56px + env(safe-area-inset-top, 0px))';

        return '<div id="feedSnapCard_' + cardId + '" class="reel-page-snap" data-reel-idx="' + idx + '" data-photo-memos="' + escapeHtml(JSON.stringify(photoMemosArr)) + '" style="position:relative; padding-top:' + cardSnapPaddingTop + ' !important;">' +
          (isRouteTab ? routeOriginalHeaderHtml : '') +
          '<!-- 미디어 스테이지 (낭만루터는 엽서 없이 100% 순수 사진만 출력) -->' +
          '<div class="reel-media-stage">' +
            '<div style="width:100%; height:100%; max-height:100%; position:relative; overflow:hidden; background:#000000; display:flex; align-items:center; justify-content:center;">' +
              (isRouteTab ? (
                '<!-- 🧭 낭만루트: 개인 사진이 있으면 사진 우선(앞면), 터치 시 템플릿 스펙 시트(뒷면) -->' +
                '<div class="postcard-3d-wrapper" onclick="this.classList.toggle(\'flipped\'); triggerHaptic(10);" style="width:100% !important; height:100% !important; position:relative; cursor:pointer; background:#000000; border-radius:0 !important;">' +
                  (totalPhotosCount > 0 ? (
                    '<!-- 1. 개인 사진 있는 경우: 앞면(개인 사진 풀스크린) ⇄ 뒷면(패킹 템플릿) -->' +
                    '<div class="postcard-face-front" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:0 !important; border-radius:0 !important; box-sizing:border-box;">' +
                      '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \'' + cardId + '\');">' + horizontalSlidesHtml + '</div>' + dotsHtml +
                    '</div>' +
                    '<div class="postcard-face-back" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:12px; border-radius:0 !important; box-sizing:border-box;">' +
                      studioCardMarkup +
                    '</div>'
                  ) : (
                    '<!-- 2. 개인 사진 없는 경우: 앞면(패킹 템플릿) ⇄ 뒷면(사진 등록 안내) -->' +
                    '<div class="postcard-face-front" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:12px; border-radius:0 !important; box-sizing:border-box;">' +
                      studioCardMarkup +
                    '</div>' +
                    '<div class="postcard-face-back" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:0 !important; border-radius:0 !important; box-sizing:border-box;">' +
                      '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \'' + cardId + '\');">' + horizontalSlidesHtml + '</div>' + dotsHtml +
                    '</div>'
                  )) +
                '</div>'
              ) : (
                '<!-- 🏕️ 낭만루터: 엽서 일체 없는 100% 순수 인스타그램형 사진 슬라이더 -->' +
                '<div style="width:100% !important; height:100% !important; position:relative; background:#000000; overflow:hidden;">' +
                  '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \'' + cardId + '\');">' +
                    horizontalSlidesHtml +
                  '</div>' +
                  dotsHtml +
                '</div>'
              )) +
            '</div>' +
          '</div>' +

          '<!-- 하단 인터랙션바 -->' +
          '<div class="reel-bottom-interactive-bar">' +
            (!isRouteTab ? routerBottomMetaHtml : '') +
            '<div style="display:flex; justify-content:space-between; align-items:center; min-height:32px;">' +
              '<div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">' +
                '<button type="button" onclick="window.toggleFeedStar(\'' + cardId + '\', event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:4px;">' +
                  '<svg id="feedStarIcon_' + cardId + '" viewBox="0 0 24 24" style="width:18px; height:18px; filter:' + (isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none') + '; transition:transform 0.2s ease;" fill="' + (isStarred ? '#fde047' : 'none') + '" stroke="' + (isStarred ? '#fde047' : '#ffffff') + '" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                  '<span id="feedStarCountText_' + cardId + '" style="font-size:0.75rem; font-weight:800; color:#fde047; font-family:\'Space Grotesk\', sans-serif;">' + starCount + '</span>' +
                '</button>' +
                '<button type="button" data-feed-id="' + cardId + '" data-spot="' + escapeHtml(spotName) + '" data-memo="' + escapeHtml(memo120) + '" onclick="if(typeof window.shareCurrentFeed===\'function\'){ window.shareCurrentFeed(this.dataset.feedId, this.dataset.spot, this.dataset.memo); } else { triggerHaptic(10); if(navigator.clipboard){ navigator.clipboard.writeText(location.href); if(typeof showToast===\'function\') showToast(\'🔗 피드 링크가 복사되었습니다!\',\'success\'); } }" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:#cbd5e1;" title="공유">' +
                  '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
                '</button>' +
                '<button type="button" data-feed-id="' + cardId + '" onclick="window.toggleSaveFeed(this.dataset.feedId, event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:' + (isSavedFeed ? '#c084fc' : '#cbd5e1') + ';" title="관심피드 즐겨찾기 저장">' +
                  '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="' + (isSavedFeed ? '#c084fc' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                '</button>' +
              '</div>' +

              bottomToolsHtml +
            '</div>' +

            '<!-- 📐 고정 3줄 메모장 (CLS 0% 보장) -->' +
            '<div id="feedPhotoMemoText_' + cardId + '" class="reel-memo-fixed-box">' +
              cleanMemoContentHtml +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    // 🌟 [낭만루터 전용 상단 고정 헤더: 56px 규격 통일로 전환 시 덜컹거림 0%]
    var routerFixedHeaderHtml = '';
    if (!isRouteTab) {
      routerFixedHeaderHtml = '<div style="position:absolute !important; top:0 !important; left:0 !important; right:0 !important; height:calc(56px + env(safe-area-inset-top, 0px)) !important; padding-top:env(safe-area-inset-top, 0px) !important; background:rgba(0,0,0,0.92) !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; border-bottom:1px solid rgba(255,255,255,0.06) !important; display:flex !important; justify-content:space-between !important; align-items:center !important; padding-left:14px !important; padding-right:14px !important; z-index:40 !important; box-sizing:border-box !important;">' +
        '<!-- 좌측: 큼직하고 시인성 높은 순백색(+) 단독 버튼 -->' +
        '<button type="button" onclick="window.openNewRouterSnapModal(); triggerHaptic(12);" style="background:rgba(255,255,255,0.12); border:1.2px solid rgba(255,255,255,0.25); border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#ffffff; padding:0; flex-shrink:0; transition:all 0.15s ease; box-shadow:0 2px 8px rgba(0,0,0,0.4);" title="새 사진 올리기">' +
          '<svg viewBox="0 0 24 24" style="width:19px; height:19px; stroke:#ffffff; fill:none; stroke-width:2.4; stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '</button>' +
        '<!-- 우측: 낭만루트 ⇄ 낭만루터 전환 세그먼트 스위치 -->' +
        '<div style="display:flex; align-items:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:2.5px; box-sizing:border-box;">' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'route\'; window.renderHistoryStage(); triggerHaptic(8);" style="background:transparent; border:none; color:#94a3b8; font-size:0.68rem; font-weight:700; padding:3px 9px; border-radius:12px; cursor:pointer; transition:all 0.15s ease;">낭만루트</button>' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'router\'; window.renderHistoryStage(); triggerHaptic(8);" style="background:#38bdf8; border:none; color:#000000; font-size:0.68rem; font-weight:900; padding:3px 9px; border-radius:12px; cursor:pointer; transition:all 0.15s ease;">낭만루터</button>' +
        '</div>' +
      '</div>';
    }

    content.innerHTML = routerFixedHeaderHtml +
    '<div id="reelsVerticalContainer" class="reel-vertical-container">' +
      reelSlidesHtml +
    '</div>';

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }

    // ⚡ [세로 사진 100% 꽉 채우기 복원]: 캐시/네트워크 로드 완벽 감지 엔진
    var allReelImgs = content.querySelectorAll('.reel-photo-target');
    allReelImgs.forEach(function(img) {
      var applyFit = function() {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          if (img.naturalHeight >= img.naturalWidth) {
            img.classList.add('is-portrait');
            img.style.setProperty('object-fit', 'cover', 'important');
          } else {
            img.classList.remove('is-portrait');
            img.style.setProperty('object-fit', 'contain', 'important');
          }
        }
      };

      if (img.complete) {
        applyFit();
      } else {
        img.addEventListener('load', applyFit, { once: true });
      }
    });

    // ⚡ [인스타그램 방식 C++ 백그라운드 7개 슬라이딩 윈도우]: CPU 부하 0% VRAM 릴리즈 엔진
    if (window.IntersectionObserver) {
      if (window.__reelWindowObserver) {
        window.__reelWindowObserver.disconnect();
      }
      var reelContainer = document.getElementById('reelsVerticalContainer');
      if (reelContainer) {
        var allReelCards = Array.from(reelContainer.querySelectorAll('.reel-page-snap'));
        window.__reelWindowObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
              var curIdx = parseInt(entry.target.dataset.reelIdx, 10);
              if (!isNaN(curIdx)) {
                allReelCards.forEach(function(cardEl) {
                  var cIdx = parseInt(cardEl.dataset.reelIdx, 10);
                  var mediaStage = cardEl.querySelector('.postcard-3d-wrapper');
                  if (mediaStage) {
                    // 앞뒤 3개(총 7개) 윈도우 내는 활성화, 벗어난 카드는 GPU 텍스처 즉시 반환
                    if (Math.abs(cIdx - curIdx) <= 3) {
                      mediaStage.style.visibility = 'visible';
                    } else {
                      mediaStage.style.visibility = 'hidden';
                    }
                  }
                });
              }
            }
          });
        }, { root: reelContainer, threshold: 0.5 });

        allReelCards.forEach(function(card) {
          window.__reelWindowObserver.observe(card);
        });
      }
    }
  };

  // 🚀 [낭만보관함 모달 오픈 / 클로즈 - 마스터 독바와 1:1 결합 & 최상위 레이어 보장]
  window.openHistoryModal = function() {
    var modal = document.getElementById('romanticHistoryModal');
    var isAlreadyOpen = Boolean(modal && modal.style.display === 'flex');

    // 🔄 [하단 독바 재터치 토글]: 이미 보관함이 열려 있으면 토스트 없이 낭만루트 ⇄ 낭만루터 즉각 전환
    if (isAlreadyOpen) {
      triggerHaptic(10);
      var currentTab = window.activeHistoryFeedTab || 'route';
      var nextTab = (currentTab === 'route') ? 'router' : 'route';
      window.switchHistoryFeedTab(nextTab);
      return;
    }

    var planModal = document.getElementById('romanticPlanModal');
    if (planModal) planModal.style.setProperty('display', 'none', 'important');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'romanticHistoryModal';
      modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); background:#000000; z-index:1000005 !important; justify-content:center; align-items:stretch; width:100% !important; max-width:100% !important; height:auto !important; overflow:hidden !important; touch-action:pan-y !important; transform:translateZ(0); -webkit-transform:translateZ(0); contain:paint layout !important; box-sizing:border-box; overscroll-behavior:none !important;';
      modal.innerHTML = '<div class="romantic-history-content" style="width:100% !important; max-width:480px !important; margin:0 auto; height:100%; max-height:100%; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
    } else {
      modal.style.setProperty('top', '0', 'important');
      modal.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 8px))', 'important');
      modal.style.setProperty('height', 'auto', 'important');
      modal.style.setProperty('overscroll-behavior', 'none', 'important');
    }

    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '1000005', 'important');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }

    // ⚡ [R2 공용 단일 진실 공급원 인출]: 로그인 여부와 무관하게 feeds.json을 인출하여 모바일/PC 즉시 렌더링
    window.fetchCommunityFeeds().then(function() {
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
    });

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
    var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock(isMap ? 'map' : 'router');
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

  // 🔄 마이리포트 프로필 사진 변경 시 보관함 피드 아바타 실시간 리렌더링
  window.addEventListener('okbm_profile_photo_changed', function() {
    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
  });
})();