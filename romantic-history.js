
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

  // 💾 [인스타급 단일 트랜잭션 창구]: 복합 고유 지문 기반 무한 복제 방지 & 단일 동기화
  window.savePackingHistoryRecord = function(record) {
    if (!record) return null;

    var normalized = window.normalizeHistoryRecord(record, 0);
    var normDate = String(normalized.date || '').replace(/[-/]/g, '.').trim();
    var normSpot = String(normalized.spot || '').trim();

    var profile = safeGetJSON('user_profile', null);
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    if (!normalized.author || normalized.author === '낭만루터') {
      normalized.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
    }

    var list = window.safeGetStorage('okbm_packing_history', []) || [];

    // 🛡️ [멱등성 고유 지문]: (ID 일치) OR (동일 유저 + 동일 날짜 + 동일 박지) 매칭 시 무조건 기존 카드 갱신(Upsert)
    var existIdx = list.findIndex(function(it) {
      var itIdMatch = (it && it.id && normalized.id && String(it.id).trim() === String(normalized.id).trim());
      var itDate = String((it && it.date) || '').replace(/[-/]/g, '.').trim();
      var itSpot = String((it && it.spot) || '').trim();
      var itMatch = (itDate === normDate && itSpot === normSpot);
      return itIdMatch || itMatch;
    });

    if (existIdx !== -1) {
      normalized.id = list[existIdx].id; // 기존 발급된 고유 ID 영구 계승
      
      // 🛡️ [스마트 병합]: 템플릿에서 넘어와 새 메모/사진이 비어있는 경우, 기존 카드의 사진과 메모를 안전하게 보존
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
      if (!normalized.id || normalized.id.startsWith('pack_temp_')) {
        normalized.id = 'pack_' + userId.replace(/[^a-zA-Z0-9]/g, '') + '_' + normDate.replace(/\D/g, '') + '_' + Date.now().toString(36);
      }
      list.unshift(normalized);
    }

    // 🌐 사진 CDN 링크 1순위 정규화 수집
    var rawPhotos = [];
    if (Array.isArray(record.photos) && record.photos.length > 0) rawPhotos = record.photos.filter(Boolean);
    else if (record.photo_url) rawPhotos = [record.photo_url];
    else if (record.photo) rawPhotos = [record.photo];
    else if (record.fieldPhoto) rawPhotos = [record.fieldPhoto];
    else if (normalized.photos && normalized.photos.length > 0) rawPhotos = normalized.photos.filter(Boolean);

    var cleanCloudUrls = rawPhotos.map(function(u) {
      if (typeof u !== 'string') return '';
      var clean = u.replace(/^["']|["']$/g, '').trim();
      if (clean.includes('drive.google.com')) {
        var idMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) return 'https://lh3.googleusercontent.com/d/' + idMatch[1] + '=w1200';
      }
      return clean;
    }).filter(function(u) { return u.length > 10; });

    if (cleanCloudUrls.length > 0) {
      normalized.photos = cleanCloudUrls;
      normalized.photo = cleanCloudUrls[0];
      normalized.fieldPhoto = cleanCloudUrls[0];
      normalized.photo_url = cleanCloudUrls[0];

      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      savedPhotosMap[String(normalized.id)] = cleanCloudUrls;
      savedPhotosMap[String(normalized.date)] = cleanCloudUrls;
      savedPhotosMap[normDate] = cleanCloudUrls;
      window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);
    }

    window.interactiveHistory = list.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;

    // 🏛️ 단일 금고 매니저를 통해 로컬스토리지, IndexedDB, 메모리에 완벽 원자적 저장
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packing_history', list, true);
    } else {
      window.safeSetStorage('okbm_packing_history', list);
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
    }

    // 🚀 공용 피드 등록 시 단 1회만 단일 파이프라인에서 직통 전송 (중복 호출 원천 봉쇄)
    if (normalized.isPublished === true && typeof window.shareFeedToCommunity === 'function') {
      window.shareFeedToCommunity(normalized);
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
// 📷 [폰 내장 DB(IndexedDB)에서 사진을 100% 안전하게 꺼내오는 탐색기 & R2 글로벌 CDN 1순위 보장]
  function getRecordPhotos(record) {
    if (!record) return [];
    var rawList = [];

    // ⚡ [1순위 확정]: 클라우드/R2 글로벌 CDN 고화질 웹 주소를 절대 우선 인출
    if (Array.isArray(record.photos) && record.photos.length > 0) {
      rawList = record.photos.filter(function(u) { return typeof u === 'string' && u.trim().length > 10; });
    } else if (record.photo_url && String(record.photo_url).trim().length > 10) {
      rawList = [String(record.photo_url).trim()];
    } else if (record.photo && String(record.photo).trim().length > 10 && !record.photo.startsWith('data:')) {
      rawList = [String(record.photo).trim()];
    } else if (record.fieldPhoto && String(record.fieldPhoto).trim().length > 10 && !record.fieldPhoto.startsWith('data:')) {
      rawList = [String(record.fieldPhoto).trim()];
    }

    // 📡 [2순위 폴백]: 서버에 사진이 없고 오프라인 기기 로컬에만 사진이 남아있을 때만 제한적 인출
    if (rawList.length === 0) {
      var rId = String(record.id || '').trim();
      var cleanPureId = rId.split(';')[0].trim();
      var rDate = String(record.date || '').trim();
      var altDate = rDate.replace(/[-/]/g, '.');
      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
      if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
        savedPhotosMap = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], savedPhotosMap);
      }

      var localPhotos = (cleanPureId && savedPhotosMap[cleanPureId]) || 
                        (rId && savedPhotosMap[rId]) || 
                        (rDate && savedPhotosMap[rDate]) || 
                        (altDate && savedPhotosMap[altDate]);

      if (Array.isArray(localPhotos) && localPhotos.length > 0) rawList = localPhotos.filter(Boolean);
      else if (typeof localPhotos === 'string' && localPhotos.trim().length > 10) rawList = [localPhotos.trim()];
      else if (record.photo && String(record.photo).trim().length > 10) rawList = [String(record.photo).trim()];
      else if (record.fieldPhoto && String(record.fieldPhoto).trim().length > 10) rawList = [String(record.fieldPhoto).trim()];
    }

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
            <button type="button" onclick="window.closePastTripsListModal(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">기록된 활동 목록</span>
          </div>
          ${headerRightHtml}
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
          ${cardsHtml}
        </div>

        <div id="pastTripsBatchDeleteBar" style="display:none; position:fixed; bottom:calc(56px + env(safe-area-inset-bottom, 0px)); left:0; right:0; max-width:440px; margin:0 auto; padding:10px 14px; background:rgba(15,23,42,0.95); backdrop-filter:blur(10px); border-top:1.5px solid #f43f5e; box-sizing:border-box; z-index:1000004;">
          <button type="button" onclick="window.executeBatchDeletePastTrips();" style="width:100%; height:44px; background:linear-gradient(135deg, #f43f5e, #be123c); border:none; border-radius:10px; color:#fff; font-size:0.84rem; font-weight:900; cursor:pointer; box-shadow:0 4px 14px rgba(244,63,94,0.4); display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#ffffff; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span id="pastTripsBatchDeleteCountText">선택한 기록 영구 삭제</span>
          </button>
        </div>

        <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000005 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
            <span>낭만플랜</span>
          </button>
          <button type="button" class="dock-item active" onclick="window.closePastTripsListModal(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="window.closePastTripsListModal(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
            <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>마이리포트</span>
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

    var rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    if (window.interactiveHistory && window.interactiveHistory.length > 0) {
      rawList = window.interactiveHistory;
    }

    var target = rawList.find(function(r) { return String(r.id).trim() === sId; });
    if (!target) {
      target = rawList.find(function(r, idx) {
        return String(idx) === sId || (r.date && String(r.date).replace(/[-/]/g, '') === sId);
      });
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
      return;
    }

    // 1. 상태 즉시 반전 (0.001초 로컬 확정)
    var nextStatus = !(target.isPublished === true);
    target.isPublished = nextStatus;

    // 2. 4대 로컬 캐시 즉각 동기화
    window.interactiveHistory = rawList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    if (window.__memoryStore) {
      window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
    }
    window.safeSetStorage('okbm_packing_history', rawList);

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

    // 🚀 삭제 직후 끝낸 자리(다음 카드)로 뷰포트 즉시 복원
    if (targetScrollId) {
      setTimeout(function() {
        var targetCardEl = document.getElementById(targetScrollId);
        if (targetCardEl) {
          targetCardEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 40);
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('기록이 삭제되었습니다.', 'info');
  };
// 👤 [특정 작성자 피드 모아보기 전담 모달 엔진]
  window.openUserFeedCollectionModal = function(authorName, userId) {
    if (!authorName && !userId) return;
    triggerHaptic(12);

    var old = document.getElementById('userFeedCollectionModal');
    if (old) old.remove();

    var targetAuthor = String(authorName || '').trim();
    var targetUserId = String(userId || '').trim();

    // 전체 피드 소스 풀 수집 (공용 피드 + 로컬 보관함)
    var feedPool = [];
    if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
      feedPool = window.__allLoadedFeeds;
    } else {
      feedPool = safeGetJSON('okbm_cached_community_feeds', []) || [];
    }

    if (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0) {
      window.interactiveHistory.forEach(function(myRec) {
        if (!feedPool.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
          feedPool.push(myRec);
        }
      });
    }

    // 대상 작성자의 피드만 정밀 필터링
    var matchedFeeds = feedPool.filter(function(f) {
      if (!f) return false;
      var fUserId = String(f.userId || '').trim();
      var fAuthor = String(f.author || f.nick || '').trim();
      if (targetUserId && fUserId && targetUserId === fUserId) return true;
      if (targetAuthor && fAuthor && targetAuthor === fAuthor) return true;
      return false;
    });

    matchedFeeds.sort(function(a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    var totalCount = matchedFeeds.length;
    var repInsta = '';
    matchedFeeds.forEach(function(f) {
      if (!repInsta && f.instagram) repInsta = String(f.instagram).replace(/[@\s]/g, '').trim();
    });

   window.__currentUserScopedFeeds = matchedFeeds;
    window.__currentUserScopedAuthor = targetAuthor;

    var modalEl = document.createElement('div');
    modalEl.id = 'userFeedCollectionModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000015; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    var cardsHtml = '';
    if (totalCount === 0) {
      cardsHtml = `
        <div style="width:100%; padding:60px 20px; text-align:center; color:#94a3b8; font-size:0.80rem;">
          공개된 피드가 없습니다.
        </div>
      `;
    } else {
      cardsHtml = matchedFeeds.map(function(f) {
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(f) : (f.photos || []);
        var thumb = (photos && photos.length > 0 && photos[0]) ? photos[0] : (f.photo || f.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80');
        var fSpot = escapeHtml(f.spot || '나의 힐링 스팟');
        var fDate = escapeHtml(f.date || '');
        var fWeight = escapeHtml(String(f.weightKg || '0.00'));
        var fMemo = escapeHtml((f.memo || f.oneLineMemo || '').slice(0, 60));
        var safeId = escapeHtml(String(f.id || ''));

        return `
          <div data-feed-id="${safeId}" onclick="document.getElementById('userFeedCollectionModal').remove(); window.openSingleTripDualFeedModal(this.dataset.feedId, window.__currentUserScopedFeeds, window.__currentUserScopedAuthor);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; gap:12px; align-items:center; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;">
            <div style="width:58px; height:58px; border-radius:8px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.14);">
              <img src="${thumb}" style="width:100%; height:100%; object-fit:cover; display:block;" />
            </div>
            <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${fSpot}
                </span>
                <span style="font-size:0.75rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">
                  ${fWeight}kg
                </span>
              </div>
              <span style="font-size:0.62rem; color:#64748b; font-family:'JetBrains Mono', monospace;">
                ${fDate}
              </span>
              ${fMemo ? `
                <span style="font-size:0.68rem; color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">
                  “${fMemo}”
                </span>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="document.getElementById('userFeedCollectionModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">
              [${escapeHtml(targetAuthor)}] 님의 피드
            </span>
            <span style="font-size:0.60rem; color:#38bdf8; font-weight:700;">
              전체 발행 기록 (${totalCount}개)
            </span>
          </div>
        </div>
        ${repInsta ? `
          <a href="https://instagram.com/${repInsta}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#fda4af; padding:3px 7px; border-radius:12px; font-size:0.62rem; font-weight:800; text-decoration:none;">
            <span>@${escapeHtml(repInsta)}</span>
            <span style="font-size:0.55rem; color:#94a3b8;">↗</span>
          </a>
        ` : ''}
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${cardsHtml}
      </div>

      <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000016 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
        <a href="index.html" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>낭만루터</span>
        </a>
        <a href="map.html" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
          <span>전국지도</span>
        </a>
        <button type="button" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
          <span>낭만플랜</span>
        </button>
        <button type="button" class="dock-item active" onclick="document.getElementById('userFeedCollectionModal').remove(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          <span>낭만보관함</span>
        </button>
        <button type="button" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>마이리포트</span>
        </button>
      </div>
    `;

    document.body.appendChild(modalEl);
  };
// 📖 [단일 피드 카드 마크업 생성기]
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

    var memo100 = (log.memo || log.oneLineMemo || '').slice(0, 100);
    var cleanInsta = String(log.instagram || '').replace(/[@\s]/g, '').trim();

    var packingSheetMarkup = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (genFn) {
      packingSheetMarkup = genFn(tmplId, log, items, log.spot, memo100 || (log.spot + ' 패킹'), photosList[0]);
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

    return '<div class="single-feed-block" data-record-id="' + escapeHtml(String(log.id)) + '" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.12); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 16px 45px rgba(0,0,0,0.95); flex-shrink:0; margin-bottom:24px; box-sizing:border-box;">' +
      '<div style="padding:12px 14px; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">' +
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span style="font-size:0.92rem; font-weight:900; color:#ffffff;">' + escapeHtml(log.spot || '낭만 스팟') + '</span>' +
          (cleanInsta ? ('<a href="https://instagram.com/' + cleanInsta + '" target="_blank" rel="noopener noreferrer" style="color:#fda4af; font-size:0.58rem; font-weight:800; text-decoration:none;">@' + escapeHtml(cleanInsta) + '</a>') : '') +
        '</div>' +
        '<span style="font-size:0.68rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace;">' + escapeHtml(log.date || '') + '</span>' +
      '</div>' +
      (memo100 ? ('<div style="padding:10px 14px; background:rgba(255,255,255,0.025); font-size:0.78rem; color:#f1f5f9; line-height:1.5;">“' + escapeHtml(memo100) + '”</div>') : '') +
      '<div style="display:flex; flex-direction:column; padding:8px 8px 0 8px; background:#000;">' +
        photosList.map(function(pUrl) {
          return '<div style="width:100%; aspect-ratio:4/5; overflow:hidden; border-radius:12px; margin-bottom:8px; background:#05070a;"><img src="' + pUrl + '" style="width:100%; height:100%; object-fit:cover; display:block;" /></div>';
        }).join('') +
      '</div>' +
      '<div style="padding:10px 14px 14px 14px; background:#07090e; border-top:1px solid rgba(255,255,255,0.08);">' +
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
      if (typeof showToast === 'function') showToast('관심피드 저장은 로그인 후 이용하실 수 있습니다.', 'info', 2200);
      if (typeof openLoginModal === 'function') openLoginModal();
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
        if (!allFeeds.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
          allFeeds.push(myRec);
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
      if (typeof showToast === 'function') showToast('이웃 추가는 로그인 후 이용하실 수 있습니다.', 'info', 2200);
      if (typeof openLoginModal === 'function') openLoginModal();
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

  // 👤 [작성자 피드 전체 한눈에 모아보기 모달 엔진]
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
        if (!feedPool.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
          feedPool.push(myRec);
        }
      });
    }

    // 해당 유저의 피드만 엄격 필터링
    var matchedFeeds = feedPool.filter(function(f) {
      if (!f) return false;
      var fUserId = String(f.userId || '').trim();
      var fAuthor = String(f.author || f.nick || '').trim();
      if (targetUserId && fUserId && targetUserId === fUserId) return true;
      if (targetAuthor && fAuthor && targetAuthor === fAuthor) return true;
      return false;
    });

    matchedFeeds.sort(function(a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    window.__scopedUserFeedsMap = window.__scopedUserFeedsMap || {};
    window.__scopedUserFeedsMap[targetAuthor] = matchedFeeds;

    var totalCount = matchedFeeds.length;
    var repInsta = '';
    matchedFeeds.forEach(function(f) {
      if (!repInsta && f.instagram) repInsta = String(f.instagram).replace(/[@\s]/g, '').trim();
    });

    // 이웃 여부 판별
    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var followKey = targetUserId || targetAuthor;
    var followingList = safeGetJSON('okbm_following_users', []);
    var isFollowing = followingList.includes(followKey);
    var isSelf = (myUserId && targetUserId && myUserId === targetUserId);

    var followBtnHtml = '';
    if (!isSelf) {
      followBtnHtml = isFollowing
        ? '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.15); border:1px solid #34d399; color:#34d399; padding:4px 9px; border-radius:14px; font-size:0.65rem; font-weight:900; cursor:pointer; display:inline-flex; align-items:center; gap:3px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>이웃</span></button>'
        : '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:4px 9px; border-radius:14px; font-size:0.65rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>이웃추가</span></button>';
    }

    var modalEl = document.createElement('div');
    modalEl.id = 'userFeedCollectionModal';
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000015; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    var cardsHtml = '';
    if (totalCount === 0) {
      cardsHtml = '<div style="width:100%; padding:60px 20px; text-align:center; color:#94a3b8; font-size:0.80rem;">공개된 피드가 없습니다.</div>';
    } else {
      cardsHtml = matchedFeeds.map(function(f) {
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(f) : (f.photos || []);
        var thumb = (photos && photos.length > 0 && photos[0]) ? photos[0] : (f.photo || f.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80');
        var fSpot = escapeHtml(f.spot || '나의 힐링 스팟');
        var fDate = escapeHtml(f.date || '');
        var fWeight = escapeHtml(String(f.weightKg || '0.00'));
        var fMemo = escapeHtml((f.memo || f.oneLineMemo || '').slice(0, 60));
        var safeId = escapeHtml(String(f.id || ''));

        return '<div data-feed-id="' + safeId + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.openSingleTripDualFeedModal(this.dataset.feedId, window.__scopedUserFeedsMap[this.dataset.author], this.dataset.author);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; gap:12px; align-items:center; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;">' +
          '<div style="width:58px; height:58px; border-radius:8px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.14);">' +
            '<img src="' + thumb + '" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
          '</div>' +
          '<div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
              '<span style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fSpot + '</span>' +
              '<span style="font-size:0.75rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + fWeight + 'kg</span>' +
            '</div>' +
            '<span style="font-size:0.62rem; color:#64748b; font-family:\'JetBrains Mono\', monospace;">' + fDate + '</span>' +
            (fMemo ? ('<span style="font-size:0.68rem; color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">“' + fMemo + '”</span>') : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="document.getElementById('userFeedCollectionModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <div style="display:flex; flex-direction:column;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">[${escapeHtml(targetAuthor)}]</span>
              ${followBtnHtml}
            </div>
            <span style="font-size:0.60rem; color:#38bdf8; font-weight:700;">전체 발행 기록 (${totalCount}개)</span>
          </div>
        </div>
        ${repInsta ? `
          <a href="https://instagram.com/${repInsta}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#fda4af; padding:3px 7px; border-radius:12px; font-size:0.62rem; font-weight:800; text-decoration:none;">
            <span>@${escapeHtml(repInsta)}</span>
            <span style="font-size:0.55rem; color:#94a3b8;">↗</span>
          </a>
        ` : ''}
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${cardsHtml}
      </div>

      <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000016 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
        <a href="index.html" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>낭만루터</span>
        </a>
        <a href="map.html" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-decoration:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
          <span>전국지도</span>
        </a>
        <button type="button" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
          <span>낭만플랜</span>
        </button>
        <button type="button" class="dock-item active" onclick="document.getElementById('userFeedCollectionModal').remove(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/>
          <path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          <span>낭만보관함</span>
        </button>
        <button type="button" class="dock-item" onclick="document.getElementById('userFeedCollectionModal').remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>마이리포트</span>
        </button>
      </div>
    `;

    document.body.appendChild(modalEl);
  };
  // 📖 [백패킹/캠핑 피드 상세 듀얼 뷰 - 아웃도어 매거진 규격 동기화]
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

    var old = document.getElementById('singleTripFeedModal');
    if (old) old.remove();

    var headerTitleText = contextTitle ? ('[' + escapeHtml(contextTitle) + '] 님의 피드 (' + logs.length + '개)') : '필드 상세 피드';

    // 해당 작성자의 피드들만 트랙에 순차 렌더링 (타인 피드 원천 차단)
    var allCardsHtml = logs.map(function(item) {
      return window.buildSingleFeedCardHtml(item);
    }).join('');

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    feedModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000020; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    feedModal.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.92rem; font-weight:900; color:#fff;">${headerTitleText}</span>
        </div>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); triggerHaptic(10);" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>

      <div id="dualFeedScrollContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(70px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${allCardsHtml}
        </div>
      </div>

      <div style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:1000021 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
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
          <span>낭만플랜</span>
        </button>
        <button type="button" class="dock-item active" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.renderHistoryStage(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#ffffff !important; font-size:0.67rem; font-weight:900; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          <span>낭만보관함</span>
        </button>
        <button type="button" class="dock-item" onclick="var s=document.getElementById('singleTripFeedModal'); if(s) s.remove(); window.closeHistoryModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background:none; border:none; color:#94a3b8; font-size:0.67rem; font-weight:700; min-height:48px; gap:3px; cursor:pointer;">
          <svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span>마이리포트</span>
        </button>
      </div>
    `;
    document.body.appendChild(feedModal);

    // 선택된 해당 피드로 즉시 스크롤 이동
    setTimeout(function() {
      var targetCard = feedModal.querySelector('[data-record-id="' + recordId + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 40);

    triggerHaptic(12);
  };

/// [대형 사진 스와이프 뷰어 & 사진별 120자 캡션 동기화 엔진]
  window.__handleRichMultiPhotoUpload = async function(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;

    window.__tempUploadedPhotos = window.__tempUploadedPhotos || [];
    window.__tempPhotoMemos = window.__tempPhotoMemos || [];

    var maxSlots = 10 - window.__tempUploadedPhotos.length;
    if (maxSlots <= 0) {
      if (typeof showToast === 'function') showToast('사진은 최대 10장까지만 등록 가능합니다.', 'warn');
      return;
    }

    var filesToProcess = Array.from(files).slice(0, maxSlots);
    triggerHaptic(10);

    for (var i = 0; i < filesToProcess.length; i++) {
      var file = filesToProcess[i];
      var base64 = '';

      if (typeof window.processSinglePhotoSmart === 'function') {
        base64 = await window.processSinglePhotoSmart(file);
      } else {
        base64 = await new Promise(function(resolve) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
              var canvas = document.createElement('canvas');
              var ctx = canvas.getContext('2d');
              var MAX_WIDTH = 1200;
              var scale = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
              canvas.width = Math.round(img.width * scale);
              canvas.height = Math.round(img.height * scale);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = function() { resolve(''); };
            img.src = e.target.result;
          };
          reader.onerror = function() { resolve(''); };
          reader.readAsDataURL(file);
        });
      }

      if (base64 && base64.length > 50) {
        window.__tempUploadedPhotos.push(base64);
        window.__tempPhotoMemos.push('');
      }
    }

    window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
    window.__renderRichPhotoStage();
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
    if (memoInput && window.__tempPhotoMemos) {
      var curIdx = window.__currentSwipePhotoIndex || 0;
      window.__tempPhotoMemos[curIdx] = memoInput.value.slice(0, 120);
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

    var currentText = memos[curIdx] || '';
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
    var curIdx = window.__currentSwipePhotoIndex || 0;
    window.__tempPhotoMemos = window.__tempPhotoMemos || [];
    window.__tempPhotoMemos[curIdx] = text.slice(0, 120);
    var charCounter = document.getElementById('richMemoCharCounter');
    if (charCounter) charCounter.innerText = window.__tempPhotoMemos[curIdx].length + '/120자';
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
          <span style="font-size:0.90rem; font-weight:900; color:#38bdf8; letter-spacing:-0.02em;">현장 사진 추가하기 (최대 10장)</span>
          <span style="font-size:0.68rem; color:#64748b;">터치하여 사진을 등록하세요</span>
        </div>
      `;
    } else {
      var slidesHtml = photos.map(function(url, pIdx) {
        return `
          <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">
            <img src="${url}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(22px) brightness(0.32); transform:scale(1.15); pointer-events:none;" />
            <img src="${url}" style="position:relative; z-index:2; width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />
            <button type="button" onclick="event.stopPropagation(); window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:10px; right:10px; z-index:10; width:30px; height:30px; border-radius:50%; background:rgba(0,0,0,0.75); color:#ffffff; border:1.5px solid rgba(255,255,255,0.3); font-size:14px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px);">✕</button>
          </div>
        `;
      }).join('');

      var dotsHtml = '';
      if (count > 1) {
        var dotsItems = Array.from({ length: count }).map(function(_, dIdx) {
          var isCur = (dIdx === (window.__currentSwipePhotoIndex || 0));
          var dotW = isCur ? '14px' : '5px';
          var dotBg = isCur ? '#38bdf8' : 'rgba(255,255,255,0.3)';
          var dotShadow = isCur ? 'box-shadow:0 0 8px rgba(56,189,248,0.8);' : '';
          return '<div style="width:' + dotW + '; height:4px; border-radius:2px; background:' + dotBg + '; ' + dotShadow + ' transition:all 0.2s ease;"></div>';
        }).join('');
        dotsHtml = '<div id="richSwipeDotsWrapper" style="display:flex; justify-content:center; align-items:center; gap:4px; height:10px; margin-top:8px;">' + dotsItems + '</div>';
      }

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
        ${dotsHtml}
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

    // 🌐 [3중 하이브리드 박지 풀 엔진]: 전역 변수 + 로컬 캐시 + 피드 풀 전방위 통합 수집
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

    // 🏙️ [지능형 2단계 도시 파서]: 시/군 도시명 1순위 추출 ➔ 미분류 시 도 단위(충청 등) 안전 폴백
    function extractSmartCityName(item) {
      if (!item) return '';
      if (item.city && typeof item.city === 'string' && item.city.trim().length > 0) {
        return item.city.replace(/(시|군|구)$/, '').trim();
      }
      if (item.district && typeof item.district === 'string' && item.district.trim().length > 0) {
        return item.district.replace(/(시|군|구)$/, '').trim();
      }

      var fullAddr = String(item.address || item.addr || item.roadAddress || item.location || '').trim();
      var regText = String(item.region || '').trim();

      // 1순위: 주소 내 전국 대표 시/군 직접 매칭
      var cityMatch = fullAddr.match(/(단양|충주|제천|가평|양평|춘천|원주|영월|정선|인제|화천|양구|평창|태백|삼척|강릉|동해|속초|고성|양양|포천|연천|동두천|파주|남양주|광주|용인|안성|이천|여주|평택|화성|오산|시흥|안산|수원|성남|하남|구리|의정부|고양|김포|부천|광명|과천|안양|군포|의왕|보은|옥천|영동|증평|진천|괴산|음성|천안|공주|보령|아산|서산|논산|계룡|당진|금산|부여|서천|청양|홍성|예산|태안|전주|군산|익산|정읍|남원|김제|완주|진안|무주|장수|임실|순창|고창|부안|목포|여수|순천|나주|광양|담양|곡성|구례|고흥|보성|화순|장흥|강진|해남|영암|무안|함평|영광|장성|완도|진도|신안|포항|경주|김천|안동|구미|영주|영천|상주|문경|경산|군위|의성|청송|영양|영덕|청도|고령|성주|칠곡|예천|봉화|울진|울릉|창원|진주|통영|사천|김해|밀양|거제|양산|의령|함안|창녕|남해|하동|산청|함양|거창|합천|제주|서귀포)(?:시|군)?/);
      if (cityMatch && cityMatch[1]) {
        return cityMatch[1];
      }

      // 2순위: 일반 주소 어절 내 OO시/OO군 파싱
      var parts = fullAddr.split(/\s+/).filter(Boolean);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (/(시|군)$/.test(p) && p.length <= 5) {
          return p.replace(/(시|군)$/, '');
        }
      }

      // 3순위 (폴백): 세부 도시가 없는 경우 광역 도/지역명(충청, 경기, 강원 등) 사용
      if (regText) {
        return regText.slice(0, 4);
      }
      if (parts[0]) {
        return parts[0].slice(0, 4);
      }
      return '';
    }

    // 중복 제거 및 [도시명 + 박지명] 정규화
    var spotsMap = new Map();
    rawPool.forEach(function(s) {
      if (!s) return;
      var rawName = String(s.name || s.spotName || s.spot || s.title || '').trim();
      if (!rawName || rawName === '나의 힐링 스팟' || rawName === '힐링 박지') return;

      var cityName = extractSmartCityName(s);

      // 이미 이름 앞에 도시명이 붙어있지 않다면 결합 (예: 단양 올산, 충주 고봉)
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

    var spotsSource = Array.from(spotsMap.values());

    var searchModal = document.createElement('div');
    searchModal.id = 'richTripSpotSearchModal';
    searchModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000025; display:flex; justify-content:center; align-items:flex-end; box-sizing:border-box;';
    searchModal.onclick = function(e) { if (e.target === searchModal) window.__closeRichSpotSearch(); };

    searchModal.innerHTML = `
      <div style="width:100%; max-width:440px; height:78vh; max-height:640px; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.4); border-radius:20px 20px 0 0; padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 -12px 35px rgba(0,0,0,0.9);" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" style="width:16px; height:16px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">방문 박지 검색 및 변경</span>
          </div>
          <button type="button" onclick="window.__closeRichSpotSearch();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="position:relative; width:100%;">
          <input type="text" id="richSpotSearchInput" placeholder="도시명 또는 박지명 입력 (예: 천마산 관음봉, 단양 올산)" oninput="window.__handleRichSpotFilter(this.value);" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); border-radius:10px; color:#ffffff; padding:0 38px 0 14px; font-size:0.86rem; outline:none; box-sizing:border-box;" />
          <button type="button" onclick="document.getElementById('richSpotSearchInput').value=''; window.__handleRichSpotFilter('');" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; font-size:0.9rem; cursor:pointer;">✕</button>
        </div>

        <div id="richSpotCustomApplyWrap" style="display:none; padding:8px 12px; background:rgba(56,189,248,0.12); border:1px dashed rgba(56,189,248,0.4); border-radius:8px; justify-content:space-between; align-items:center;">
          <span id="richSpotCustomTargetText" style="font-size:0.75rem; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;"></span>
          <button type="button" id="richSpotCustomApplyBtn" style="background:#38bdf8; border:none; color:#000; font-size:0.72rem; font-weight:900; padding:5px 10px; border-radius:6px; cursor:pointer; flex-shrink:0;">직접 입력 적용</button>
        </div>

        <div id="richSpotSearchResultsList" style="flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:6px; padding-right:2px;">
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

  // [모바일 풀스크린 힐링 기록 & 대형 스와이프 에디터]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;
    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;
    var currentPhotos = getRecordPhotos(record);
    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    // 사진별 120자 메모 맵 정밀 복원 및 길이 동기화 패딩
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
    var savedInsta = localStorage.getItem('okbm_user_instagram') || record.instagram || '';

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000010; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    formModal.innerHTML = `
      <!-- 1. 상단 고정 헤더: 닫기 + [터치 시 검색 변경 가능한 장소·날짜 뱃지] + 발행 버튼 -->
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <button type="button" onclick="document.getElementById('modalRichAfterTrip').remove(); triggerHaptic(10);" style="background:none; border:none; color:#cbd5e1; font-size:1.1rem; cursor:pointer; padding:0 4px; min-width:32px; min-height:32px;">✕</button>
        
        <button type="button" onclick="window.openSpotSearchModalForRichTrip();" style="display:flex; align-items:center; gap:5px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); padding:4px 10px; border-radius:20px; cursor:pointer; min-height:32px; transition:background 0.15s ease;" title="터치하여 박지 검색 및 변경">
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span id="richHeaderSpotNameText" style="font-size:0.80rem; font-weight:900; color:#38bdf8; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(record.spot)}</span>
          <span style="font-size:0.65rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">· ${escapeHtml(record.date)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" style="width:10px; height:10px; flex-shrink:0; margin-left:1px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>

        <button type="button" onclick="window.__saveRichAfterTrip('${record.id}')" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:none; color:#fff; font-size:0.80rem; font-weight:900; padding:6px 14px; border-radius:8px; cursor:pointer; box-shadow:0 2px 10px rgba(2,132,199,0.4); display:flex; align-items:center; gap:3px; min-height:32px;">
          <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>발행</span>
        </button>
      </div>

      <!-- 2. 중앙 스크롤 뷰포트 (대형 사진 스와이프 뷰어 ➔ 하단 메모창 ➔ SNS창) -->
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 14px calc(40px + env(safe-area-inset-bottom, 0px)) 14px; display:flex; flex-direction:column; gap:16px; box-sizing:border-box;">
        
        <!-- 대형 사진 스와이프 무대 섹션 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span id="richPhotoCountLabel" style="font-size:0.82rem; color:#ffffff; font-weight:900;">
                등록된 사진 (${window.__tempUploadedPhotos.length}장 / 최대 10장)
              </span>
              <span id="richPhotoActiveIndexBadge" style="font-size:0.62rem; color:#38bdf8; background:rgba(56,189,248,0.14); padding:1px 6px; border-radius:10px; font-weight:900; font-family:'Space Grotesk', sans-serif;">1 / 1</span>
            </div>
            <button type="button" onclick="window.__clearAllRichPhotos();" style="background:none; border:none; color:#fda4af; font-size:0.68rem; font-weight:800; cursor:pointer;">전체삭제</button>
          </div>

          <div id="richLargePhotoStageContainer" style="width:100%; display:flex; flex-direction:column; align-items:center;">
            <!-- __renderRichPhotoStage를 통해 대형 스와이프 트랙 렌더링 -->
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event)" />
        </div>

        <!-- 하단 배치: 현재 활성 사진 전용 120자 팁 & 후기 작성 영역 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:5px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span style="font-size:0.82rem; color:#ffffff; font-weight:900;">사진별 120자 현장 기록</span>
            </div>
            <span id="richMemoCharCounter" style="font-size:0.70rem; color:#38bdf8; font-family:'Space Grotesk', sans-serif; font-weight:800;">0/120자</span>
          </div>
          <textarea id="richFormMemoInput" maxlength="120" placeholder="해당 사진에 대한 지형 상태, 실전 팁 등 현장 기록을 120자 이내로 남겨보세요. (사진 스와이프 시 사진별로 자동 전환됩니다)" oninput="window.__handleRichMemoInput(this.value);" style="width:100%; height:95px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:12px; padding:12px 14px; font-size:0.84rem; line-height:1.55; box-sizing:border-box; outline:none; resize:none; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.02em;"></textarea>
        </div>

        <!-- 하단 배치: 인스타그램 계정 연동 영역 -->
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:#fda4af;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              <span style="font-size:0.75rem; color:#fda4af; font-weight:800;">인스타그램 계정 (선택)</span>
            </div>
            <span style="font-size:0.60rem; color:#64748b;">피드 상세에 프로필 링크 노출</span>
          </div>
          <input type="text" id="richInputInstagram" value="${escapeHtml(savedInsta)}" placeholder="@인스타아이디 (예: @romantic_route)" style="width:100%; height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:8px; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />
        </div>

      </div>
    `;

    document.body.appendChild(formModal);
    window.__renderRichPhotoStage();
  };

  // [박지 후기 및 사진별 120자 영구 각인 단일 저장 엔진]
  window.__saveRichAfterTrip = async function(recordId) {
    var target = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!target) return;

    window.__commitCurrentMemoInput();

    var instaInput = document.getElementById('richInputInstagram');
    var profile = safeGetJSON('user_profile', null);
    target.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'guest');
    target.userId = userId;

    if (instaInput) {
      var cleanInsta = instaInput.value.replace(/[@\s]/g, '').trim();
      target.instagram = cleanInsta ? ('@' + cleanInsta) : '';
      if (cleanInsta) localStorage.setItem('okbm_user_instagram', '@' + cleanInsta);
    }

    var photosToProcess = Array.isArray(window.__tempUploadedPhotos) ? window.__tempUploadedPhotos.slice(0, 10) : [];
    var memosToProcess = Array.isArray(window.__tempPhotoMemos) ? window.__tempPhotoMemos.slice(0, Math.max(1, photosToProcess.length)) : [];

    target.photoMemos = memosToProcess;
    target.memo = memosToProcess[0] || (memosToProcess.filter(Boolean).join(' ') || '');
    target.oneLineMemo = target.memo.slice(0, 120);
    target.isPublished = true;
    target.isDraft = false;

    // 🚀 Base64 사진의 클라우드 영구 URL 승격 파이프라인
    var finalCloudPhotos = [];
    if (photosToProcess.length > 0) {
      if (typeof window.showPhotoLoadingModal === 'function') {
        window.showPhotoLoadingModal(1, photosToProcess.length);
      }

      for (var i = 0; i < photosToProcess.length; i++) {
        var pItem = photosToProcess[i];
        if (typeof pItem === 'string' && pItem.startsWith('data:') && typeof window.uploadSinglePhotoToDrive === 'function') {
          try {
            if (typeof window.showPhotoLoadingModal === 'function') {
              window.showPhotoLoadingModal(i + 1, photosToProcess.length);
            }
            var dUrl = await window.uploadSinglePhotoToDrive(pItem, 'trip_' + target.id + '_' + i + '.jpg');
            finalCloudPhotos.push((dUrl && dUrl.startsWith('http')) ? dUrl : pItem);
          } catch (upErr) {
            finalCloudPhotos.push(pItem);
          }
        } else if (typeof pItem === 'string' && pItem.startsWith('http')) {
          finalCloudPhotos.push(pItem);
        }
      }

      if (typeof window.hidePhotoLoadingModal === 'function') {
        window.hidePhotoLoadingModal();
      }
    }

    var mainPhotoUrl = finalCloudPhotos.length > 0 ? finalCloudPhotos[0] : '';
    target.photos = finalCloudPhotos;
    target.fieldPhoto = mainPhotoUrl;
    target.photo = mainPhotoUrl;
    target.photo_url = mainPhotoUrl;
    target.photos_json = JSON.stringify(finalCloudPhotos);

    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {}) || {};
    savedPhotosMap[String(target.id)] = finalCloudPhotos;
    savedPhotosMap[String(target.date)] = finalCloudPhotos;
    window.__memoryStore['okbm_phone_photos_map'] = savedPhotosMap;
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB('okbm_phone_photos_map', savedPhotosMap);
    }

    // 🏛️ [1단계]: 로컬 보관함 원자적 영구 저장
    if (typeof window.savePackingHistoryRecord === 'function') {
      window.savePackingHistoryRecord(target);
    } else {
      window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    }

    // 🌐 [2단계]: 구글 스프레드시트(feeds 시트) 직통 갱신 & R2 feeds.json 전파
    (async function syncFeedDirectToSheet() {
      try {
        var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SHARE_PUBLIC_FEED',
            feed: {
              id: target.id,
              userId: target.userId || userId,
              author: target.author,
              instagram: target.instagram || '',
              spot: target.spot,
              elevation: target.elevation || '',
              weightKg: target.weightKg || '0.00',
              date: target.date,
              memo: target.memo,
              photoMemos: target.photoMemos || [],
              photo_memos_json: JSON.stringify(target.photoMemos || []),
              photo: mainPhotoUrl,
              photo_url: mainPhotoUrl,
              photos: finalCloudPhotos,
              photos_json: JSON.stringify(finalCloudPhotos),
              items: target.items || [],
              items_json: JSON.stringify(target.items || []),
              templateId: target.templateId || 1
            }
          })
        });
      } catch (err) {
        console.warn('[RomanticHistory] 시트 직통 갱신 대기:', err);
      }
    })();

    // ☁️ [3단계]: 유저 개인 금고 전체 백업
    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(true);
    }

    var m = document.getElementById('modalRichAfterTrip');
    if (m) m.remove();

    window.renderHistoryStage();
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 사진과 일지가 피드 및 시트에 완벽히 저장되었습니다!', 'success', 2200);
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
  // 🏕️ [핵심 복원] 아웃도어 필드 매거진 렌더러 & R2 0.03초 실시간 피드 인출기
  // =========================================================================
  window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'my';

 // ⚡ [0.03초 단일 진실 공급원]: Cloudflare R2 feeds.json 전용 초고속 인출 엔진
 window.fetchCommunityFeeds = async function(isForce) {
    var r2Domain = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
    var r2Url = r2Domain.replace(/\/+$/, '') + '/feeds.json?_t=' + Date.now();

    var updateLocalStarsFromFeeds = function(feedList) {
      if (!Array.isArray(feedList)) return;
      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      feedList.forEach(function(f) {
        if (f && f.id) {
          var sId = String(f.id).trim();
          var serverLikes = Number(f.likes) || 0;
          // 서버의 공식 별점 카운트를 단일 진실 공급원(SSOT)으로 병합
          starCounts[sId] = Math.max(Number(starCounts[sId]) || 0, serverLikes);
        }
      });
      localStorage.setItem('okbm_feed_stars_counts', JSON.stringify(starCounts));

      // 🚀 [스마트폰 자동 내 글 복구]: 시트/R2 피드 중 '오라네' 글을 로컬 보관함에 전체공개로 자동 등록
      var profile = safeGetJSON('user_profile', null);
      var myNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '오라네');
      var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || 'kakao_5060259862');

      var myFeeds = feedList.filter(function(f) {
        var fNick = String(f.author || f.nick || f.nickname || '').trim();
        var fId = String(f.user_id || f.userId || '').trim();
        return fNick === myNick || fNick === '오라네' || fId.includes('5060259862');
      }).map(function(f, idx) {
        var norm = window.normalizeHistoryRecord(f, idx);
        norm.userId = myId;
        norm.author = myNick;
        norm.isPublished = true; // 🌐 전체공개 유지!
        return norm;
      });

      if (myFeeds.length > 0) {
        window.safeSetStorage('okbm_packing_history', myFeeds);
        window.interactiveHistory = myFeeds;
        window.packingHistoryList = myFeeds;
      }
    };

    // 1순위: Cloudflare 글로벌 엣지 CDN 번개 인출 (30ms)
    try {
      var r2Res = await fetch(r2Url, { cache: 'no-store' });
      if (r2Res.ok) {
        var r2Feeds = await r2Res.json();
        if (Array.isArray(r2Feeds)) {
          window.__allLoadedFeeds = r2Feeds;
          localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(r2Feeds));
          updateLocalStarsFromFeeds(r2Feeds);
          return r2Feeds;
        }
      }
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
    window.activeHistoryFeedTab = tab;
    triggerHaptic(10);

    if (tab === 'explore') {
      if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage(true);
      await window.fetchCommunityFeeds(true);
    }

    if (typeof window.renderHistoryStage === 'function') window.renderHistoryStage();
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

  window.toggleFeedMode = function(e) {
    window.toggleFeedStreamMode(e);
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

 window.renderHistoryStage = function(isLoading) {
    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) return;

    var content = modal.querySelector('.romantic-history-content');
    if (!content) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;

    // 🌟 [최신순 내림차순 정렬]: 최신 날짜가 맨 위, 오래된 날짜는 맨 마지막으로 이동
    var sortDescFn = function(list) {
      if (!Array.isArray(list)) return [];
      return list.slice().sort(function(a, b) {
        return window.getRecordDateNum(b) - window.getRecordDateNum(a);
      });
    };

    window.interactiveHistory = sortDescFn(window.interactiveHistory || []);

    if (!window.activeHistoryFeedTab) {
      window.activeHistoryFeedTab = (isLogged && window.interactiveHistory.length > 0) ? 'my' : 'explore';
    }
    if (!isLogged && window.activeHistoryFeedTab === 'my') {
      window.activeHistoryFeedTab = 'explore';
    }

    var isMyTab = (window.activeHistoryFeedTab === 'my');
    var rawListSource = isMyTab
      ? (window.interactiveHistory || [])
      : ((Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
          ? window.__allLoadedFeeds
          : (window.safeGetStorage('okbm_cached_community_feeds', []) || []));

    // 🌟 전체피드/내보관함 모두 최신순 강제 정렬
    var currentList = sortDescFn(rawListSource);

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var savedNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만루터');
    var savedInsta = localStorage.getItem('okbm_user_instagram') || '';
    var starsMap = safeGetJSON('okbm_feed_stars_map', {});
    var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
    var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);

    var streamToggleBtnHtml = isMyTab
      ? '<button type="button" onclick="window.toggleFeedStreamMode(event);" style="background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.67rem; font-weight:900; padding:4px 9px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>내 보관함</span><svg viewBox="0 0 24 24" style="width:8px; height:8px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>'
      : '<button type="button" onclick="window.toggleFeedStreamMode(event);" style="background:rgba(52,211,153,0.14); border:1px solid rgba(52,211,153,0.35); color:#34d399; font-size:0.67rem; font-weight:900; padding:4px 9px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg><span>전체피드</span><svg viewBox="0 0 24 24" style="width:8px; height:8px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>';

    var reelSlidesHtml = '';
    if (isLoading) {
      reelSlidesHtml = '<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:#38bdf8;">' +
        '<svg viewBox="0 0 24 24" style="width:36px; height:36px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>' +
        '<div style="font-size:0.86rem; font-weight:800; color:#e2e8f0; letter-spacing:-0.02em;">최신 피드 동기화 중...</div>' +
      '</div>';
    } else if (currentList.length === 0) {
      var emptyMsg = isMyTab ? '아직 등록된 내 기록이 없습니다.' : '둘러볼 수 있는 피드가 없습니다.';
      var emptySubMsg = isMyTab ? '다녀온 장소의 사진과 팁을 남겨 첫 번째 기록을 완성해보세요.' : '전국 캠퍼들의 최신 피드를 준비 중입니다.';

      reelSlidesHtml = '<div class="reel-page-snap" style="width:100% !important; height:100% !important; height:100dvh !important; display:flex !important; flex-direction:column !important; justify-content:flex-start !important; align-items:stretch !important; padding-top:calc(env(safe-area-inset-top, 0px)) !important; padding-bottom:calc(56px + env(safe-area-inset-bottom, 0px)) !important; box-sizing:border-box !important; background:#000000; overflow:hidden !important;">' +
        '<div style="height:48px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; background:#000000; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="font-size:0.84rem; color:#ffffff; font-weight:900;">' + escapeHtml(savedNick) + '</span>' +
          '</div>' +
          '<div style="flex-shrink:0;">' +
            streamToggleBtnHtml +
          '</div>' +
        '</div>' +
        '<div style="flex:1 1 0%; min-height:0; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:30px; text-align:center; box-sizing:border-box;">' +
          '<div style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#64748b;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:24px; height:24px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
          '</div>' +
          '<div style="font-size:0.95rem; font-weight:800; color:#ffffff;">' + emptyMsg + '</div>' +
          '<div style="font-size:0.75rem; color:#94a3b8; line-height:1.5;">' + emptySubMsg + '</div>' +
          '<button type="button" onclick="window.activeHistoryFeedTab=\'explore\'; window.renderHistoryStage(); triggerHaptic(10);" style="margin-top:6px; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:10px; color:#ffffff; font-size:0.78rem; font-weight:900; padding:9px 16px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(2,132,199,0.35);"><svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg><span>전체 피드 둘러보기</span></button>' +
        '</div>' +
      '</div>';
    } else {
      reelSlidesHtml = currentList.map(function(item, idx) {
        var record = isMyTab ? item : window.normalizeHistoryRecord(item, idx);
        var cardId = escapeHtml(String(record.id || idx));
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(record) : (record.photos || []);
        var spotName = record.spot || '나의 힐링 스팟';
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

        var recordUserId = String(record.userId || '').trim();
        var recordAuthor = String(record.author || record.nick || '').trim();
        var isMyRecord = isMyTab || (myUserId && recordUserId && myUserId === recordUserId) || (savedNick && recordAuthor && savedNick === recordAuthor);

       /// 📷 [낭만보관함 피드]: 가로/세로 원본 비율 100% 무손실 보존 렌더러
        var horizontalSlidesHtml = '';
        if (totalPhotosCount === 0) {
          horizontalSlidesHtml = '<div style="flex:0 0 100% !important; width:100% !important; height:100% !important; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; box-sizing:border-box; text-align:center;">' +
            '<div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.04); border:1.5px dashed rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; color:#38bdf8;">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
            '</div>' +
            '<div style="font-size:0.82rem; font-weight:800; color:#cbd5e1;">등록된 현장 사진이 없습니다</div>' +
            '<div style="font-size:0.65rem; color:#64748b; line-height:1.4;">관리 메뉴에서 현장 사진을 추가해보세요</div>' +
          '</div>';
        } else {
          horizontalSlidesHtml = mediaItems.map(function(pUrl) {
            return '<div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">' +
              '<!-- 배경 앰비언트 블러 (가로 사진 여백을 자연스럽게 채움) -->' +
              '<img src="' + pUrl + '" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(22px) brightness(0.38); transform:scale(1.15); pointer-events:none;" />' +
              '<!-- 전면 원본 무손실 뷰 (가로/세로 잘림 0% 보존) -->' +
              '<img src="' + pUrl + '" style="position:relative; z-index:2; width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />' +
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
          dotsHtml = '<div id="dotsWrap_' + cardId + '" style="display:flex; justify-content:center; align-items:center; gap:4px; height:10px; pointer-events:none;">' + dotsItemsHtml + '</div>';
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
              '<div style="font-size:0.72rem; color:#cbd5e1; margin-top:10px; line-height:1.5;">' +
                '장비 <strong style="color:#38bdf8;">' + itemsCount + '개</strong> 세팅 · 고도 <span style="color:#fde047;">' + escapeHtml(record.elevation || '-') + '</span>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<button type="button" onclick="event.stopPropagation(); window.openHistoryStudioModal(window.interactiveHistory.find(function(r){return String(r.id)===\'' + cardId + '\';})); triggerHaptic(10);" style="width:100%; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:8px; color:#fff; font-size:0.78rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 6 4-6 4Z"/></svg>' +
                '<span>20종 감성 엽서 인출</span>' +
              '</button>' +
              '<div style="font-size:0.58rem; color:#64748b; text-align:center; margin-top:5px;">터치 시 사진으로 복귀</div>' +
            '</div>' +
          '</div>';
        }

        var isPublished = Boolean(record.isPublished === true);
        var instaOfficialSvg = '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:currentColor; flex-shrink:0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

        var instaBadgeHtml = '';
        if (isPublished && cleanInsta) {
          instaBadgeHtml = '<a href="https://instagram.com/' + cleanInsta + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="display:inline-flex; align-items:center; gap:2.5px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#cbd5e1; padding:1px 5px; border-radius:10px; font-size:0.58rem; font-weight:600; text-decoration:none;">' +
            instaOfficialSvg +
            '<span>@' + escapeHtml(cleanInsta) + '</span>' +
          '</a>';
        }

        var followingList = safeGetJSON('okbm_following_users', []);
        var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);
        var followKey = recordUserId || authorName;
        var isFollowingThisAuthor = followingList.includes(followKey);

        var followHeaderBtn = '';
        if (!isMyRecord) {
          followHeaderBtn = isFollowingThisAuthor
            ? '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorName) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.14); border:1px solid #34d399; color:#34d399; font-size:0.64rem; font-weight:900; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;"><svg viewBox="0 0 24 24" style="width:9px; height:9px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>관심루터</span></button>'
            : '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorName) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.64rem; font-weight:800; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:9px; height:9px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>관심</span></button>';
        }

        var lockButtonHtml = '';
        if (isMyRecord) {
          if (isPublished) {
            lockButtonHtml = '<button type="button" data-record-id="' + cardId + '" data-lock-btn-id="' + cardId + '" onclick="window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="background:none; border:none; padding:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform 0.15s ease;" title="전체 공개 중"><svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#34d399;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg></button>';
          } else {
            lockButtonHtml = '<button type="button" data-record-id="' + cardId + '" data-lock-btn-id="' + cardId + '" onclick="window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="background:none; border:none; padding:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform 0.15s ease;" title="비공개 (나만보기)"><svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></button>';
          }
        }

        // 📝 [사진별 120자 메모 맵 정밀 추출]: 0번 인덱스 초기 바인딩
        var photoMemosArr = (Array.isArray(record.photoMemos) && record.photoMemos.length > 0) ? record.photoMemos : [memo120];
        var initialPhotoMemo = photoMemosArr[0] || memo120 || '';
        var cleanMemoContentHtml = initialPhotoMemo.trim()
          ? escapeHtml(initialPhotoMemo.trim())
          : '<span style="color:#475569;">등록된 일지 메모가 없습니다.</span>';

        var isSavedFeed = savedFeedsList.includes(String(record.id || '').trim());

        return '<div id="feedSnapCard_' + cardId + '" class="reel-page-snap" data-photo-memos="' + escapeHtml(JSON.stringify(photoMemosArr)) + '" data-default-memo="' + escapeHtml(memo120) + '" style="width:100% !important; height:100% !important; height:100dvh !important; scroll-snap-align:start !important; position:relative; overflow:hidden !important; display:flex !important; flex-direction:column !important; justify-content:flex-start !important; align-items:stretch !important; padding-top:calc(env(safe-area-inset-top, 0px)) !important; padding-bottom:calc(56px + env(safe-area-inset-bottom, 0px)) !important; box-sizing:border-box !important; flex-shrink:0 !important; contain:strict !important; touch-action:pan-y !important; background:#000000;">' +
          '<!-- 상단 헤더 (48px 고정) -->' +
          '<div style="height:48px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; background:#000000; flex-shrink:0; border-bottom:1px solid rgba(255,255,255,0.06); box-sizing:border-box;">' +
            '<div style="display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1; padding-right:8px;">' +
              '<div style="display:flex; align-items:center; gap:6px;">' +
                '<button type="button" data-author="' + escapeHtml(authorName) + '" data-user-id="' + escapeHtml(recordUserId) + '" onclick="event.stopPropagation(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId);" style="background:none; border:none; padding:0; font-size:0.92rem; color:#ffffff; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; text-align:left; display:inline-flex; align-items:center; gap:4px;">' +
                  '<span>' + escapeHtml(authorName) + '</span>' +
                  '<svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:#38bdf8; fill:none; stroke-width:2.5;"><polyline points="9 18 15 12 9 6"/></svg>' +
                '</button>' +
                followHeaderBtn +
                instaBadgeHtml +
              '</div>' +
              '<span style="font-size:0.72rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">' + escapeHtml(tripDate) + ' · ' + escapeHtml(spotName) + '</span>' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">' +
              lockButtonHtml +
              '<button type="button" data-record-id="' + cardId + '" onclick="window.openTripActionMenu(this.dataset.recordId, event);" style="background:none; border:none; padding:4px; cursor:pointer; color:#cbd5e1; display:flex; align-items:center; justify-content:center; min-width:32px; min-height:32px;" title="메뉴">' +
                '<svg viewBox="0 0 24 24" style="width:18px; height:18px;" fill="currentColor"><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><circle cx="5" cy="12" r="1.8"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<!-- 중앙 미디어 스테이지 (소형폰 자동 축소: flex: 1 1 0% & min-height: 0) -->' +
          '<div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; align-items:center; justify-content:center; background:#000000; overflow:hidden; padding:4px 0; box-sizing:border-box;">' +
            '<div style="height:100%; max-height:100%; aspect-ratio:3/4; position:relative; overflow:hidden; border-radius:6px; box-shadow:0 8px 24px rgba(0,0,0,0.85); background:#05070a;">' +
              '<div class="postcard-3d-wrapper" onclick="this.classList.toggle(\'flipped\'); triggerHaptic(10);" style="width:100% !important; height:100% !important; position:relative; cursor:pointer; background:#000;">' +
                '<div class="postcard-face-front" style="width:100%; height:100%; position:absolute; inset:0; overflow:hidden; background:#000;">' +
                  '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \'' + cardId + '\');" style="display:flex !important; width:100% !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important;">' +
                    horizontalSlidesHtml +
                  '</div>' +
                '</div>' +
                '<div class="postcard-face-back" style="width:100%; height:100%; position:absolute; inset:0; overflow:hidden; background:#000;">' +
                  backTemplateCardHtml +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- 하단 인터랙션바 + 고정 3줄 메모장 (flex-shrink: 0 고정 규격) -->' +
          '<div style="padding:6px 14px 10px 14px; box-sizing:border-box; display:flex; flex-direction:column; gap:6px; flex-shrink:0 !important; background:#000000; border-top:1px solid rgba(255,255,255,0.04);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; position:relative; min-height:28px;">' +
              '<div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">' +
                '<button type="button" onclick="window.toggleFeedStar(\'' + cardId + '\', event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:4px;">' +
                  '<svg id="feedStarIcon_' + cardId + '" viewBox="0 0 24 24" style="width:19px; height:19px; filter:' + (isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none') + '; transition:transform 0.2s ease;" fill="' + (isStarred ? '#fde047' : 'none') + '" stroke="' + (isStarred ? '#fde047' : '#ffffff') + '" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                  '<span id="feedStarCountText_' + cardId + '" style="font-size:0.75rem; font-weight:800; color:#fde047; font-family:\'Space Grotesk\', sans-serif;">' + starCount + '</span>' +
                '</button>' +
                '<button type="button" data-feed-id="' + cardId + '" data-spot="' + escapeHtml(spotName) + '" data-memo="' + escapeHtml(memo120) + '" onclick="if(typeof window.shareCurrentFeed===\'function\'){ window.shareCurrentFeed(this.dataset.feedId, this.dataset.spot, this.dataset.memo); } else { triggerHaptic(10); if(navigator.clipboard){ navigator.clipboard.writeText(location.href); if(typeof showToast===\'function\') showToast(\'🔗 피드 링크가 복사되었습니다!\',\'success\'); } }" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:#cbd5e1;" title="공유">' +
                  '<svg viewBox="0 0 24 24" style="width:17px; height:17px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
                '</button>' +
                '<button type="button" data-feed-id="' + cardId + '" onclick="window.toggleSaveFeed(this.dataset.feedId, event);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:' + (isSavedFeed ? '#c084fc' : '#cbd5e1') + ';" title="관심피드 저장">' +
                  '<svg viewBox="0 0 24 24" style="width:17px; height:17px;" fill="' + (isSavedFeed ? '#c084fc' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                '</button>' +
              '</div>' +

              '<div style="position:absolute; left:50%; transform:translateX(-50%); pointer-events:none;">' +
                dotsHtml +
              '</div>' +

              '<div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">' +
                '<button type="button" onclick="window.openRomanticInterestModal(\'routers\'); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#e2e8f0; font-size:0.76rem; font-weight:800; padding:4px 9px; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="관심루터 및 관심피드 모아보기">' +
                  '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#c084fc;" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
                  '<span>관심</span>' +
                '</button>' +
                streamToggleBtnHtml +
              '</div>' +
            '</div>' +

            '<!-- 📐 고정 3줄 메모장 (CLS 0% 보장 / 사진 스와이프 시 120자 실시간 교체) -->' +
            '<div id="feedPhotoMemoText_' + cardId + '" style="height:4.35em; min-height:4.35em; max-height:4.35em; line-height:1.45em; font-family:\'Pretendard Variable\', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; font-size:0.78rem; font-weight:450; color:#e2e8f0; word-break:break-all; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; letter-spacing:-0.01em; box-sizing:border-box;">' +
              cleanMemoContentHtml +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    content.innerHTML = '<div id="reelsVerticalContainer" style="flex:1 1 0% !important; width:100% !important; height:100% !important; height:100dvh !important; overflow-y:auto !important; overflow-x:hidden !important; scroll-snap-type:y mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; position:relative; z-index:10; overscroll-behavior-y:none !important; overscroll-behavior-x:none !important; touch-action:pan-y !important;">' +
      reelSlidesHtml +
    '</div>' +

    '<div style="position:absolute !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.95) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; flex-shrink:0 !important; z-index:30 !important; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">' +
      '<a href="index.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">' +
        '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>' +
        '<span>낭만루터</span>' +
      '</a>' +
      '<a href="map.html" class="dock-item" onclick="window.closeHistoryModal(); triggerHaptic(10);" style="text-decoration:none; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; flex:1; min-height:48px;">' +
        '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>' +
        '<span>전국지도</span>' +
      '</a>' +
      '<button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof openPlanModal===\'function\') openPlanModal(\'calendar\'); triggerHaptic(12);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">' +
          '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
          '<line x1="16" y1="2" x2="16" y2="6"/>' +
          '<line x1="8" y1="2" x2="8" y2="6"/>' +
          '<line x1="3" y1="10" x2="21" y2="10"/>' +
          '<path d="M9 16l2 2 4-4"/>' +
        '</svg>' +
        '<span>낭만플랜</span>' +
      '</button>' +
      '<button type="button" class="dock-item active" onclick="if(typeof window.renderHistoryStage===\'function\') window.renderHistoryStage(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ffffff !important; font-size:0.67rem; font-weight:900; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;">' +
          '<path d="M21 8v13H3V8"/>' +
          '<path d="M1 3h22v5H1z"/>' +
          '<path d="M10 12h4"/>' +
        '</svg>' +
        '<span>낭만보관함</span>' +
      '</button>' +
      '<button type="button" class="dock-item" onclick="window.closeHistoryModal(); if(typeof handleAuthBtnClick===\'function\') handleAuthBtnClick(); triggerHaptic(10);" style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:0.67rem; font-weight:700; gap:3px; background:none; border:none; cursor:pointer; flex:1; min-height:48px;">' +
        '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' +
        '<span>마이리포트</span>' +
      '</button>' +
    '</div>';
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

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      window.activeHistoryFeedTab = 'explore';
    }

    // ⚡ 공용 피드가 비어있다면 즉시 백그라운드에서 Cloudflare R2 0.03초 인출
    if (!window.__allLoadedFeeds || window.__allLoadedFeeds.length === 0) {
      window.fetchCommunityFeeds().then(function() {
        if (typeof window.renderHistoryStage === 'function') {
          window.renderHistoryStage();
        }
      });
    }

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