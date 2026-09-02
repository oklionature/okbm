/**
 * 낭만루트 힐링 보관함 & 피드 엔진 (romantic-basecamp.js v2.3.0)
 * - 20종 템플릿 연동 3D 양면 엽서 카드 (앞면 패킹지 ↔ 뒷면 엽서)
 * - 상단 스탯 & 실시간 연동 슬림 미니 달력
 * - 다녀온 기록 작성 (8대 항목 칩 + 직접 입력 + 지능형 감성 문장 실시간 조합)
 * - 세로 3:4 인스타그램 듀얼 피드 뷰어 (스크롤 잠금 완전 해결)
 * - 배낭 세팅 1초 복제 & HTML2Canvas 실물 갤러리 이미지 다운로드
 * - 박지 실시간 검색 & 짐 검수 체크리스트 내장
 */

(function() {
  // 3D 플립 카드 전용 60fps GPU 하드웨어 가속 스타일 자동 주입
  if (!document.getElementById('basecamp-flip-core-style')) {
    var style = document.createElement('style');
    style.id = 'basecamp-flip-core-style';
    style.innerHTML = `
      .postcard-3d-wrapper {
        perspective: 1200px !important;
        transform-style: preserve-3d !important;
        will-change: transform !important;
        transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      .postcard-3d-wrapper.flipped {
        transform: rotateY(180deg) !important;
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
        transform: translate3d(0, 0, 1px) !important;
        box-sizing: border-box !important;
      }
      .postcard-face-front {
        transform: rotateY(0deg) translateZ(1px) !important;
      }
      .postcard-face-back {
        transform: rotateY(180deg) translateZ(1px) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 전역 상태 정의
  window.currentCardIndex = 0;
  window.activeBasecampTab = 'history';
  window.archiveFilter = 'all';
  window.currentViewMode = 'card';
  window.selectedRecordIds = new Set();
  window.activeSelectedDateKey = '';
  window.__memoryStore = window.__memoryStore || {};
  window.packedCheckSet = window.packedCheckSet || new Set();

  // 🎨 [100% 순수 SVG 컬러 벡터 라이브러리]
  window.VEC_ICONS = {
    stars: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M12 2v4M4.93 10.93l2.83 2.83M19.07 10.93l-2.83 2.83M2 18h20M7 18a5 5 0 0 1 10 0"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M12 2v6M4.93 10.93l2.83 2.83M19.07 10.93l-2.83 2.83M2 18h20M7 18a5 5 0 0 1 10 0M12 10l-2 4h4l-2-4z"/></svg>',
    sunny: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    clouds: '<svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
    fog: '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M4 14h16M4 18h16M4 10h16M4 6h16"/></svg>',
    rain: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>',
    snow: '<svg viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M12 2v20M2 12h20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>',
    cold: '<svg viewBox="0 0 24 24" fill="none" stroke="#a5f3fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
    gale: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>',
    peak: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><polygon points="2 20 8.5 7 15 17 22 20 2 20"/><polygon points="8.5 7 10.5 11 6.5 11" fill="#34d399"/></svg>',
    deck: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M3 7h18M3 12h18M3 17h18M7 3v18M17 3v18"/></svg>',
    forest: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><polygon points="12 2 2 22 22 22 12 2"/><polygon points="12 6 5 22 19 22 12 6" fill="#34d399"/></svg>',
    beach: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M2 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2M2 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/></svg>',
    island: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M2 19c4 0 5-2 10-2s6 2 10 2"/><path d="M12 4v9M8 7l4-3 4 3"/></svg>',
    valley: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M3 4l7 16M21 4l-7 16"/></svg>',
    rock: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><polygon points="4 20 2 12 8 4 17 6 22 14 19 20 4 20"/></svg>',
    lawn: '<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M3 20h18M5 20l2-8 3 8M14 20l2-8 3 8"/></svg>',
    hotmeal: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
    thermos: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><rect x="7" y="6" width="10" height="15" rx="3"/><path d="M10 2h4v4h-4zM7 11h10"/></svg>',
    sandwich: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="m3 11 18-5v12L3 14v-3zM3 11h18"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 2v3M10 2v3M14 2v3"/></svg>',
    solo: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    duo: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    crew: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    pet: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><circle cx="12" cy="14" r="4"/><circle cx="6.5" cy="8.5" r="2.5"/><circle cx="17.5" cy="8.5" r="2.5"/><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/></svg>',
    windCalm: '<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M8 8h8M4 12h16M7 16h10"/></svg>',
    windBreeze: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/></svg>',
    windGale: '<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; vertical-align:-2px; margin-right:3px; flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; vertical-align:-1px; margin-right:2px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" style="width:15px; height:15px; vertical-align:-2px;" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    flag: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f43f5e; vertical-align:-2px;" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f59e0b; vertical-align:-2px;" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#38bdf8; vertical-align:-2px;" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
  };

  // 💾 [스토리지 유틸 엔진]
 // 💾 [스마트폰 내장 대용량 영구 저장소(IndexedDB) & 하이브리드 캐시 엔진]
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

  // 🔄 [기존 localStorage 데이터 ➔ IndexedDB 대용량 저장소 자동 이관]
  (async function autoMigrateToIndexedDB() {
    try {
      var idbHistory = await window.loadFromIndexedDB('okbm_packing_history');
      if (!idbHistory || !Array.isArray(idbHistory) || idbHistory.length === 0) {
        var rawLocal = localStorage.getItem('okbm_packing_history');
        if (rawLocal) {
          var parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await window.saveToIndexedDB('okbm_packing_history', parsed);
            window.__memoryStore['okbm_packing_history'] = parsed;
          }
        }
      } else {
        window.__memoryStore['okbm_packing_history'] = idbHistory;
        window.interactiveHistory = idbHistory.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
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
    window.__memoryStore[key] = (typeof value === 'string' ? JSON.parse(value) : value);
    window.saveToIndexedDB(key, window.__memoryStore[key]);
    try {
      var str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, str);
    } catch (e) {
      // 5MB 초과 시에도 스마트폰 IndexedDB에 영구 저장되므로 안전함
    }
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

  // 🔄 [히스토리 레코드 정규화 - 메모 자동 채우기 완전 제거 & 순수 빈칸 보장]
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
          : [r.fieldPhoto || r.photo || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80']);

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
    if (rawMemo.includes('비화식으로') || rawMemo.includes('칼각 피칭') || rawMemo.includes('도착! 더블월') || rawMemo.includes('에서 보낸 조용한 하룻밤') || rawMemo.includes('자리를 털고 일어나는 순간까지')) {
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
      photo: rawPhotos[0],
      fieldPhoto: rawPhotos[0]
    };

    return norm;
  };

  // 🎒 [패킹 저장 및 공유 카드 호출 - 기본 메모 완전 빈칸]
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
    var defPhoto = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
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
      photos: [window.currentSharePhoto || defPhoto],
      photo: window.currentSharePhoto || defPhoto,
      fieldPhoto: window.currentSharePhoto || defPhoto
    };

    window.currentShareRecord = newRecord;
    window.currentShareItems = packedItems;

    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    savedPhotosMap[recordId] = newRecord.photos;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

    if (!window.interactiveHistory) window.interactiveHistory = [];
    window.interactiveHistory.unshift(newRecord);
    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    if (typeof closePackingModal === 'function') closePackingModal();
    if (typeof openPackShareModal === 'function') openPackShareModal(newRecord, packedItems, false);
    
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 [' + cleanDateStr + '] 배낭 패킹이 저장되었습니다!', 'success');
  };

  // 💾 [공유 모달에서 보관함으로 저장 - 기본 메모 완전 빈칸]
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
    var defPhoto = 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
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
        items: liveItems, photos: [window.currentSharePhoto || defPhoto], photo: window.currentSharePhoto || defPhoto, fieldPhoto: window.currentSharePhoto || defPhoto
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
      if (!Array.isArray(window.currentShareRecord.photos) || window.currentShareRecord.photos.length === 0) {
        window.currentShareRecord.photos = [window.currentSharePhoto || window.currentShareRecord.fieldPhoto || defPhoto];
      }
    }

    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    savedPhotosMap[recordId] = window.currentShareRecord.photos;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

    if (!window.interactiveHistory) window.interactiveHistory = [];
    var existingIdx = window.interactiveHistory.findIndex(function(r) { return String(r.id) === String(recordId); });
    if (existingIdx !== -1) window.interactiveHistory[existingIdx] = window.currentShareRecord;
    else window.interactiveHistory.unshift(window.currentShareRecord);

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

  // 🔤 [한글 종성/조사 연산기]
  function getJosa(word, josaType) {
    if (!word) return '';
    var str = String(word).trim().replace(/[\(\)\[\]"']/g, '');
    if (!str) return '';
    var lastChar = str.charCodeAt(str.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) {
      if (josaType === '이/가') return str + '이';
      if (josaType === '을/를') return str + '를';
      if (josaType === '은/는') return str + '은';
      if (josaType === '과/와') return str + '와';
      if (josaType === '으로/로') return str + '로';
      return str;
    }
    var jong = (lastChar - 0xAC00) % 28;
    var hasJong = (jong > 0);

    if (josaType === '이/가') return str + (hasJong ? '이' : '가');
    if (josaType === '을/를') return str + (hasJong ? '을' : '를');
    if (josaType === '은/는') return str + (hasJong ? '은' : '는');
    if (josaType === '과/와') return str + (hasJong ? '과' : '와');
    if (josaType === '으로/로') {
      return str + ((hasJong && jong !== 8) ? '으로' : '로');
    }
    return str;
  }

  // 🧠 [지능형 감성 문장 생성기 - 사용자 입력값 최우선 & 완전 랜덤 페르소나/MBTI 다형성 엔진]
  window.composePoeticBackpackingStory = function(record, forcedTone, forcedMbti) {
    if (!record) return '자연 속에서 비화식으로 즐긴 조용한 하룻밤.';

    var pickRandom = function(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      return arr[Math.floor(Math.random() * arr.length)];
    };

    var spot = record.spot || '선자령';
    var weight = record.weightKg || '5.4';

    // ✍️ 사용자가 직접 입력한 3대 핵심 상황 데이터 추출
    var hard = (record.hardText || (window.__richState && window.__richState.hardText) || '').trim();
    var good = (record.goodText || (window.__richState && window.__richState.goodText) || '').trim();
    var memory = (record.memoryText || (window.__richState && window.__richState.memoryText) || '').trim();

    var style = forcedTone || (window.__richState && window.__richState.selectedTone) || 'insta';
    var mbti = forcedMbti || (window.__richState && window.__richState.selectedMbti) || 'INFP';

    // 🧬 16종 MBTI별 2~3가지 다형성 심리 풀
    var mbtiPools = {
      INTJ: [
        `배낭 ${weight}kg 오차 없이 세팅하고 계획된 동선대로 움직여서 완벽히 뇌 용량 정리함.`,
        `불필요한 생각과 군더더기 짐을 전부 덜어내고 오롯이 통제된 고요함을 만끽함.`
      ],
      INTP: [
        `침낭에 누워 온갖 생각의 나래를 펼치며 혼자 멍때리니 복잡했던 머리가 싹 비워짐.`,
        `자연의 소리를 배경음악 삼아 끊임없이 상상에 잠기며 나만의 우주를 탐구함.`
      ],
      ENTJ: [
        `목표 시간 단축해서 완벽 주파하고 정상에서 마주한 뷰 덕분에 확실한 성취감 얻음.`,
        `한계를 넘어서는 쾌감과 정상 피칭의 짜릿한 성취로 다음 주를 살아갈 에너지를 완충함.`
      ],
      ENTP: [
        `남들 안 하는 신박한 세팅으로 1박 즐기니까 캠핑이 두 배로 스릴 있고 재밌었음ㅋㅋ`,
        `예상 밖의 돌발 변수마저 하나의 놀이처럼 유쾌하게 즐기며 완벽한 도파민 충전 완료!`
      ],
      INFJ: [
        `세상의 소란스러움을 벗어나 산의 품에서 마주한 풍경이 깊은 마음의 위로를 주었습니다.`,
        `자연이 건네는 무언의 위로 속에서 내면의 깊은 소리에 귀를 기울인 뜻깊은 밤이었습니다.`
      ],
      INFP: [
        `노을빛에 왠지 모르게 뭉클해져서 좋아하는 노래 들으며 작은 우주에 혼자 떠 있는 기분이었음✨`,
        `바람 소리와 별빛 하나하나에 감성이 몽글몽글 차올라 가슴 깊이 위로받은 밤이었음🌙`
      ],
      ENFJ: [
        `모두 다치지 않고 즐겁게 완주해서 너무 감사했고 따뜻한 밥 한 그릇의 온기가 참 훈훈했음^^`,
        `함께한 온기와 자연이 준 벅찬 감동을 가슴에 품고 내려가는 따뜻하고 풍요로운 여정.`
      ],
      ENFP: [
        `진짜 텐트 치는 것도 재밌고 뷰도 레전드라 텐션 폭발함ㅠㅠ 백패킹 평생 할 거야 완전 힐링!💕`,
        `눈길 닿는 모든 순간이 선물 같아서 감탄사만 오백 번 외치며 신나게 즐기고 온 1박!`
      ],
      ISTJ: [
        `가이라인 45도 각도 칼각 팩다운 및 주변 정리 수칙 3회 점검 완료. 군더더기 없는 정석 1박.`,
        `패킹 리스트 체크부터 LNT 수칙 이행까지 오차 없이 정석대로 수행한 무결점 백패킹.`
      ],
      ISFJ: [
        `주변에 방해 안 되게 조용히 텐트 안에서 온기를 느끼며 편안하게 힐링하고 왔습니다.`,
        `머문 자리 하나 흐트러짐 없이 정돈하고 소소한 일상의 온기를 되찾은 평온한 하룻밤.`
      ],
      ESTJ: [
        `코스 주파부터 피칭, 비화식 식사까지 타임테이블대로 일사천리 진행 완료. 깔끔한 일정.`,
        `출발부터 복귀까지 철저한 계획하에 완벽히 통제된 깔끔하고 생산적인 백패킹.`
      ],
      ESFJ: [
        `다 같이 모여 맛있는 거 나눠 먹고 예쁜 풍경 보며 추억 쌓아서 너무 행복하고 뿌듯했음ㅎㅎ`,
        `좋은 사람들과 따뜻한 정을 나누고 아름다운 풍경을 공유해서 배로 행복했던 시간!`
      ],
      ISTP: [
        `바람 셌지만 텐트 치고 밥 먹고 푹 잠. 뷰 좋았고 생존 세팅 완벽했음. 하산 끝.`,
        `장비 성능 확실히 테스트 완료. 군더더기 없이 깔끔하게 먹고 자고 내려옴.`
      ],
      ISFP: [
        `피칭 끝나자마자 침낭 속으로 쏙 들어가서 텐트 지퍼 열고 뷰 감상.. 이게 진짜 극락이지~`,
        `아무것도 안 하고 텐트 문 열어둔 채 멍하니 흘러가는 구름만 봐도 세상 부러울 게 없음.`
      ],
      ESTP: [
        `바람 살벌했지만 팩 짱짱하게 박고 정면 승부 갈김ㅋㅋ 역시 이 스릴에 백패킹 옴!`,
        `야생 그대로의 자연과 거침없이 부딪히며 온몸으로 만끽한 짜릿한 액티비티!`
      ],
      ESFP: [
        `노을 텐풍 인생샷 대성공 📸 텐트 색감이랑 하늘 조합 미쳤음! 밤하늘 아래서 신나게 즐김!`,
        `시시각각 변하는 하늘 색감에 반해서 셔터만 수백 장 누름! 흥 넘치고 행복했던 1박!`
      ]
    };

    var mbtiPoint = pickRandom(mbtiPools[mbti] || mbtiPools.INFP);

    // 🎭 문체(페르소나)별 다형성 랜덤 빌더
    var story = '';

    if (style === 'insta') {
      var intro = pickRandom([
        `${spot} 백패킹 피칭 완료! 🔥`,
        `드디어 와본 ${spot}, 소문대로 뷰 터졌다 ✨`,
        `오늘 밤 우리 집은 ${spot} 꼭대기 🏕️`,
        `도시 소음 탈출해서 ${spot}으로 순간이동 완료 🚀`
      ]);
      var partHard = hard ? pickRandom([
        `올라갈 때 ${hard} 때문에 살짝 멘붕 올 뻔했지만,`,
        `오르는 길에 ${hard}으로 고비가 있었지만,`,
        `${hard}의 매서운 순간을 뚫고 올라와,`
      ]) : `거친 숨을 몰아쉬며 오른 정상,`;

      var partGood = good ? pickRandom([
        ` 피칭 끝내고 ${good} 즐기니까 피로가 싹 날아감..`,
        ` 텐트 안에서 ${good} 누리는데 진짜 극락 그 자체..`,
        ` ${good} 맛보는 순간 올라온 보람 200% 느낌..`
      ]) : ` 눈앞에 펼쳐진 파노라마 뷰에 피로가 싹 녹아내림..`;

      var partMemory = memory ? pickRandom([
        ` 특히 ${memory}은(는) 평생 못 잊을 인생 명장면이었음✨`,
        ` 무엇보다 ${memory} 마주한 순간엔 진심으로 멍하니 감탄만 나옴✨`,
        ` 밤하늘과 어우러진 ${memory}의 여운은 오래갈 듯✨`
      ]) : ` 온 세상을 붉게 물들이던 풍경은 단연 레전드였음✨`;

      var partLnt = pickRandom([
        `배낭 ${weight}kg 싹 챙겨서 클린 LNT 하산 완료!`,
        `머문 자리는 처음보다 깨끗하게 정리하고 ${weight}kg 배낭 메고 하산!`,
        `쓰레기 하나 남기지 않고 클린하게 ${weight}kg 패킹 철수 완료!`
      ]);

      story = `${intro} ${partHard}${partGood}${partMemory} ${mbtiPoint} ${partLnt}`;

    } else if (style === 'diary') {
      var intro = pickRandom([
        `주말을 맞아 ${spot}으로 백패킹을 다녀왔다.`,
        `복잡한 마음을 비워내고자 ${spot}의 품을 찾았다.`,
        `계절의 숨결을 오롯이 느끼려 ${spot}으로 발걸음을 옮겼다.`
      ]);
      var partHard = hard ? pickRandom([
        ` 오르는 길에 ${hard}으로 꽤나 고생했지만,`,
        ` 산행 중 ${hard}의 고비를 마주하며 숨이 턱까지 찼지만,`,
        ` ${hard}의 매서움에 체력적 한계를 느끼기도 했지만,`
      ]) : ` 오르는 길은 땀으로 젖었지만,`;

      var partGood = good ? pickRandom([
        ` 단단히 텐트를 치고 ${good} 시간을 보내며 큰 위로를 받았다.`,
        ` 피칭을 마치고 ${good} 누리니 비로소 마음에 평온이 찾아왔다.`,
        ` 고요 속에서 ${good} 음미하며 참된 휴식을 맛보았다.`
      ]) : ` 조용히 머물며 큰 마음의 쉼을 얻었다.`;

      var partMemory = memory ? pickRandom([
        ` 가만히 마주했던 ${memory}의 짙은 여운이 가슴 깊이 남는다.`,
        ` 특히 두 눈에 담았던 ${memory}의 순간은 오래도록 잊히지 않을 것 같다.`,
        ` 어둠 속에서 빛나던 ${memory}의 찰나는 이번 여정의 가장 큰 선물이었다.`
      ]) : ` 고요한 밤하늘의 여운이 길게 맴돈다.`;

      var partLnt = pickRandom([
        `배낭 ${weight}kg 가볍게 정리하고 머문 자리를 정갈히 치운 뒤 산을 내려왔다.`,
        `자연에 감사하며 작은 흔적 하나 남기지 않고 ${weight}kg 배낭과 함께 귀가했다.`
      ]);

      story = `${intro}${partHard}${partGood}${partMemory} ${mbtiPoint} ${partLnt}`;

    } else if (style === 'essay') {
      var intro = pickRandom([
        `마침내 닿은 ${spot}의 고요한 품.`,
        `바람의 결을 따라 닿은 ${spot}의 능선 위에서.`,
        `세상의 경계를 넘어 마주한 ${spot}의 광활한 침묵.`
      ]);
      var partHard = hard ? pickRandom([
        ` ${hard}의 고단함마저 산길에 묻어두고 오롯이 나에게 집중했다.`,
        ` ${hard}이라는 자연의 무게 앞에서도 묵묵히 한 걸음을 내디뎠다.`,
        ` 스쳐 지나간 ${hard}의 고통은 정직하게 살아있음을 일깨워주었다.`
      ]) : ` 발걸음 끝에 오롯이 나 자신과 마주했다.`;

      var partGood = good ? pickRandom([
        ` 자연이 내어준 침묵 속에서 ${good} 온기를 음미하던 찰나,`,
        ` 가만히 ${good} 품어 안으며 메말랐던 마음에 온기가 차올랐다.`,
        ` 온전한 고립 속에서 ${good} 느끼던 순간은 더없이 평화로웠다.`
      ]) : ` 자연이 내어준 고요 속에서 따스한 온기를 음미하던 찰나,`;

      var partMemory = memory ? pickRandom([
        ` 눈앞에 번져가던 ${memory}의 찰나는 길고 짙은 영혼의 울림을 주었다.`,
        ` 아스라이 흩어지던 ${memory}의 풍경은 메마른 가슴을 촉촉이 적셨다.`,
        ` 영원처럼 멈춰 선 ${memory}의 경이로움 앞에 말을 잃고 서 있었다.`
      ]) : ` 눈앞의 풍경은 짙은 울림을 주었다.`;

      var partLnt = pickRandom([
        `${weight}kg의 작은 짐을 챙겨 머문 자리엔 단 하나의 발자국도 남기지 않고 길을 나선다.`,
        `머문 흔적을 모두 지우고 ${weight}kg의 배낭과 함께 자연 속으로 스며들듯 하산한다.`
      ]);

      story = `${intro}${partHard}${partGood}${partMemory} ${mbtiPoint} ${partLnt}`;

    } else if (style === 'senior') {
      var intro = pickRandom([
        `호젓한 ${spot}에 올라서니 가슴이 확 트입니다^^`,
        `기분 좋은 땀 흘리며 닿은 ${spot}, 경치가 기가 막힙니다!`,
        `사방이 탁 트인 ${spot}에 둥지를 트니 신선이 따로 없네요^^`
      ]);
      var partHard = hard ? pickRandom([
        ` 올라올 때 ${hard}으로 숨이 턱까지 차올랐지만,`,
        ` 오는 길에 ${hard}으로 땀 꽤나 흘렸지만,`,
        ` ${hard}의 험난한 고비를 무사히 넘기고 나니,`
      ]) : ` 땀 흘려 능선에 올라서니,`;

      var partGood = good ? pickRandom([
        ` 텐트 단단히 치고 ${good} 즐기는 이 맛에 산에 오릅니다.`,
        ` 시원한 바람맞으며 ${good} 곁들이니 신선놀음이 부럽지 않네요.`,
        ` 꿀맛 같은 ${good} 나누며 산이 주는 행복을 듬뿍 느낍니다.`
      ]) : ` 시원한 바람맞으며 힐링하는 이 맛에 산에 오릅니다.`;

      var partMemory = memory ? pickRandom([
        ` 특히 눈앞에 펼쳐진 ${memory}의 절경은 두 눈에 평생 담아갑니다.`,
        ` 장엄하게 빛나던 ${memory}의 풍경은 정말 장관이었습니다.`,
        ` 밤하늘 수놓은 ${memory}의 장관에 가슴 뭉클한 감동을 받았습니다.`
      ]) : ` 눈앞에 펼쳐진 절경에 감사한 마음입니다.`;

      var partLnt = pickRandom([
        `배낭 ${weight}kg 챙겨 머문 자리 흔적 없이 클린 하산 완료! 안산즐산!`,
        `머물다 간 자리 깨끗하게 정리하고 ${weight}kg 짊어지고 기분 좋게 하산했습니다. 안산즐산!`
      ]);

      story = `${intro}${partHard}${partGood}${partMemory} ${mbtiPoint} ${partLnt}`;

    } else if (style === 'docu') {
      var intro = pickRandom([
        `해발 고지대, 거친 바람을 뚫고 도달한 ${spot}.`,
        `문명의 소음이 잦아든 곳, 척박한 야생의 ${spot}.`,
        `자연의 민낯과 조우하는 해발 능선, ${spot}.`
      ]);
      var partHard = hard ? pickRandom([
        ` 하이커는 ${hard}의 거친 고비를 넘기며 묵묵히 발걸음을 옮겼다.`,
        ` 산행 내내 몰아친 ${hard}은 인간의 인내심을 시험했다.`,
        ` 험준한 지형과 ${hard}의 무게를 온몸으로 견뎌내야 했다.`
      ]) : ` 하이커는 묵묵히 정상을 향해 나아갔다.`;

      var partGood = good ? pickRandom([
        ` 비박지에 텐트를 세우고 ${good} 마주하며 짧은 평온을 찾는다.`,
        ` 안식처를 완성한 뒤 ${good} 누리며 지친 몸을 달랜다.`,
        ` 야생 속에서 마주한 ${good} 그에게 작은 위안이 되어준다.`
      ]) : ` 비박지에 텐트를 세우고 짧은 평온을 찾는다.`;

      var partMemory = memory ? pickRandom([
        ` 야생의 밤, 그의 기억에 가장 깊이 각인된 장면은 바로 ${memory}.`,
        ` 장엄한 침묵 속에서 마주한 ${memory}은 경이로운 대자연의 실체를 드러낸다.`,
        ` 어둠 속을 꿰뚫는 ${memory}의 순간, 하이커는 자연에 대한 경외감을 느낀다.`
      ]) : ` 야생의 밤, 자연의 경이로움이 가슴 깊이 각인된다.`;

      var partLnt = pickRandom([
        `배낭 ${weight}kg을 짊어지고 그는 흔적 하나 남기지 않은 채 산을 내려간다.`,
        `자연이 내어준 자리를 본래의 모습대로 되돌려놓은 뒤, ${weight}kg의 배낭과 함께 침묵 속으로 퇴장한다.`
      ]);

      story = `${intro}${partHard}${partGood}${partMemory} ${mbtiPoint} ${partLnt}`;
    }

    return story;
  };
// 🗂️ [3D 엽서 카드 렌더링 - 작성완료/미작성 스탬프 뱃지 & 동적 0.5mm 엣지 연동]
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

    var frontContentHtml = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (genFn) {
      frontContentHtml = genFn(tmplId, cur, items, cur.spot, shortCardMemo, cur.photo || cur.fieldPhoto || '');
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
    var mainPhoto = (cur.photos && cur.photos[0]) || cur.fieldPhoto;

   return `
      <div id="swipePostcardTarget" class="postcard-3d-wrapper ${isFlipped ? 'flipped' : ''}" style="width:100%; max-width:280px; aspect-ratio:3/4; position:relative; cursor:pointer; touch-action:pan-y; padding:2px; border-radius:15px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.85); box-sizing:border-box;">
        <div class="postcard-face-front" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; overflow:hidden; border-radius:13px; background:#0b0f19;">
          ${frontContentHtml}
        </div>
        <div class="postcard-face-back" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; background:#000; border-radius:13px; overflow:hidden;">
          <img src="${mainPhoto}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.92);" />
          <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.65) 100%);"></div>
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
      <!-- 🧭 최상단: index.html 100% 동일 규격 표준 GNB -->
      <div style="position:relative !important; flex-shrink:0 !important; width:100% !important; height:52px !important; min-height:52px !important; border-bottom:1px solid rgba(255,255,255,0.08) !important; background:rgba(0, 0, 0, 0.94) !important; backdrop-filter:blur(25px) !important; -webkit-backdrop-filter:blur(25px) !important; padding:0 14px !important; padding-top:env(safe-area-inset-top, 0px) !important; margin:0 !important; box-sizing:content-box !important; z-index:10 !important; user-select:none !important;">
        <div style="height:52px !important; min-height:52px !important; display:flex !important; align-items:center !important; justify-content:flex-start !important; width:100% !important; max-width:480px !important; margin:0 auto !important;">
          <div class="brand-line" style="height:52px !important; display:inline-flex !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; margin:0 !important; flex-shrink:0 !important;">
            <div class="brand-sym-box" style="width:34px !important; height:34px !important; display:flex !important; align-items:center !important; justify-content:center !important; position:relative !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;">
              <svg viewBox="0 0 32 32" fill="none" style="width:30px !important; height:30px !important; display:block !important; margin:0 !important;">
                <circle cx="21" cy="6" r="9" fill="rgba(244,114,182,0.12)"/>
                <circle cx="21" cy="6" r="6" fill="rgba(245,158,11,0.18)"/>
                <circle cx="21" cy="6" r="3.8" fill="rgba(251,191,36,0.28)"/>
                <circle cx="2" cy="24" r="1.8" fill="#fda4af"/>
                <circle cx="9" cy="12" r="2.2" fill="#fda4af"/>
                <circle cx="14" cy="16" r="1.8" fill="#fda4af"/>
                <circle cx="13" cy="24" r="1.8" fill="#fda4af"/>
                <path d="M2 24L9 12H12.5L14 16L10 16M10 16L13 24" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="2.8" fill="#f59e0b"/>
                <circle cx="27" cy="13" r="2.2" fill="#e2e8f0"/>
                <circle cx="30" cy="24" r="2.4" fill="#e2e8f0"/>
                <path d="M13 24L21 6H25L27 13L22 13M22 13L30 24" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="1" fill="#ffffff"/>
              </svg>
            </div>
            <span class="brand-title" style="font-family:'SUIT', sans-serif !important; font-size:1.12rem !important; font-weight:900 !important; color:#ffffff !important; line-height:1 !important; display:inline-flex !important; align-items:center !important; letter-spacing:-0.02em !important; text-shadow:0 0 16px rgba(255, 255, 255, 0.35) !important; margin:0 !important; padding:0 !important;">낭만루트</span>
            <span class="brand-dot" style="width:3px !important; height:3px !important; background:radial-gradient(circle at 30% 30%, #ffffff 0%, #94a3b8 70%, #475569 100%) !important; box-shadow:0 0 6px rgba(255, 255, 255, 0.8), 0 0 8px rgba(56, 189, 248, 0.3) !important; border-radius:50% !important; display:inline-block !important; flex-shrink:0 !important; margin:0 !important; transform:translateY(0.5px) !important;"></span>
            <span class="brand-en" style="display:inline-flex !important; align-items:center !important; gap:7px !important; white-space:nowrap !important; line-height:1 !important;">
              <span class="word-romantic" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.68rem !important; font-weight:800 !important; letter-spacing:0.09em !important; transform:translateY(-1.6px) !important; opacity:0.96 !important;">ROMANTIC</span>
              <span class="word-route" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.74rem !important; font-weight:900 !important; letter-spacing:0.06em !important; transform:translateY(2.2px) !important;">ROUTE</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 📌 서브헤더: 지난 백패킹 피드 목록 & 뱃지 (안내 문구 완전 삭제) -->
      <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:10px 16px; box-sizing:border-box;">
        <span style="font-size:0.92rem; font-weight:900; color:#fff;">📱 지난 백패킹 피드 목록</span>
        <span style="font-size:0.62rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3);">총 ${logs.length}개</span>
      </div>

      <!-- 🗂️ 피드 카드 리스트 -->
      <div style="flex:1 1 0%; min-height:0; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px 20px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
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

      <!-- 🚪 하단 5:5 듀얼 바: [🎲 랜덤 추억 보기] + [◀ 뒤로] -->
      <div style="flex-shrink:0; display:flex; gap:8px; padding:10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:10;">
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

  // 🎲 [랜덤 추억 피드 직행 헬퍼]
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
// 📝 [낭만 일지 작성 모달 - 사진 썸네일 관리 / 개별 캡션 / 100% 백지 보장]
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

    window.__tempUploadedPhotos = (Array.isArray(record.photos) && record.photos.length > 0)
      ? record.photos.slice(0, 10)
      : [record.fieldPhoto || record.photo || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];

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
        
        <!-- 🌅 모달 헤더: 낭만 일지 (폰트 1.18rem 스케일업 & 노을빛 SVG) -->
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

        <!-- 📷 사진 관리 그리드 & 전체 해제 / 추가 -->
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

          <!-- 썸네일 리스트 -->
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

        <!-- ✍️ 3대 직접 입력창 (현장 언어) -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <label style="font-size:0.70rem; color:#fb923c; font-weight:900;">1. 힘들었던 점 (선택)</label>
            </div>
            <input type="text" id="richInputHard" value="${escapeHtml(window.__richState.hardText)}" placeholder="예: 정상 전 숨이 턱 막히던 오르막, 능선에서 때려 박히던 똥바람, 너덜길에 털린 무릎..." oninput="window.__handleRichDirectInputChange('hardText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(251,146,60,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>

          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <label style="font-size:0.70rem; color:#34d399; font-weight:900;">2. 좋았던 점 (선택)</label>
            </div>
            <input type="text" id="richInputGood" value="${escapeHtml(window.__richState.goodText)}" placeholder="예: 텐트 지퍼 열었을 때 터진 운해, 뻐근한 다리 뻗고 침낭 속 들어간 순간, 발열팩 데워먹던 저녁..." oninput="window.__handleRichDirectInputChange('goodText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(52,211,153,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>

          <div>
            <div style="display:flex; align-items:center; gap:4px; margin-bottom:3px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <label style="font-size:0.70rem; color:#fde047; font-weight:900;">3. 기억에 남는 것 (선택)</label>
            </div>
            <input type="text" id="richInputMemory" value="${escapeHtml(window.__richState.memoryText)}" placeholder="예: 붉게 타오르다 순식간에 저문 노을, 밤새 텐트 때리던 바람 소리, 새벽에 쏟아진 별..." oninput="window.__handleRichDirectInputChange('memoryText', this.value)" style="width:100%; height:32px; background:rgba(255,255,255,0.06); border:1px solid rgba(253,224,71,0.4); color:#fff; border-radius:6px; padding:0 8px; font-size:0.74rem; box-sizing:border-box; outline:none;" />
          </div>
        </div>

        <!-- 🎨 작성 스타일 선택 -->
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

        <!-- 🧬 MBTI 16종 선택 -->
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

        <!-- 📝 본문창 및 AI 작성 버튼 -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <label style="font-size:0.72rem; color:#34d399; font-weight:900;">낭만 본문</label>
            </div>
            <button type="button" id="btnTriggerAiStory" onclick="window.__refreshAutoStoryMemo(true)" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; padding:4px 11px; border-radius:6px; font-size:0.66rem; font-weight:900; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4); display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>AI 감성 글 작성하기</span>
            </button>
          </div>
          <textarea id="richFormMemoInput" placeholder="글을 작성해보세요!" style="width:100%; height:110px; background:rgba(255,255,255,0.06); border:1.2px solid rgba(52,211,153,0.5); color:#fff; border-radius:10px; padding:10px 12px; font-size:0.80rem; line-height:1.6; box-sizing:border-box; outline:none; resize:none; font-family:'SUIT', sans-serif;">${escapeHtml(rawMemo)}</textarea>
        </div>

        <!-- 🎒 낭만 저장하기 최종 버튼 -->
        <button onclick="window.__saveRichAfterTrip('${record.id}')" style="width:100%; height:44px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.88rem; font-weight:900; border-radius:10px; cursor:pointer; flex-shrink:0; box-shadow:0 4px 14px rgba(13,148,136,0.35); margin-top:2px; display:flex; align-items:center; justify-content:center; gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>낭만 저장하기</span>
        </button>

      </div>
    `;
    document.body.appendChild(formModal);
  };

  // 📷 [사진 개별 삭제 & 전체 해제 헬퍼]
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
// 🤖 [Google Gemini 3.1 Flash-Lite 백엔드 안전 연동]
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
      console.error('[Gemini 3.1 Flash-Lite Backend Error]', err);
    }

    return null;
  };

  // ⏱️ [1분(60초) 쿨다운 타이머 & 명시적 AI 글짓기 엔진]
  window.__lastAiStoryCallTime = 0;
  window.__aiCooldownTimerId = null;

  window.__refreshAutoStoryMemo = async function(isUserTriggered) {
    if (!window.__richState) return;
    var memoArea = document.getElementById('richFormMemoInput');
    if (!memoArea) return;

    var triggerBtn = document.getElementById('btnTriggerAiStory');

    if (isUserTriggered) {
      var now = Date.now();
      var elapsed = (now - window.__lastAiStoryCallTime) / 1000;
      if (elapsed < 60) {
        var remainSec = Math.ceil(60 - elapsed);
        if (typeof showToast === 'function') {
          showToast(`⏳ AI 호출 보호 중입니다. ${remainSec}초 후에 다시 작성할 수 있습니다!`, 'warn');
        }
        triggerHaptic(20);
        return;
      }

      window.__lastAiStoryCallTime = now;

      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.style.opacity = '0.5';
        triggerBtn.style.cursor = 'not-allowed';

        if (window.__aiCooldownTimerId) clearInterval(window.__aiCooldownTimerId);

        var countdown = 60;
        triggerBtn.innerText = `⏳ 60초 대기`;

        window.__aiCooldownTimerId = setInterval(function() {
          countdown--;
          if (countdown > 0) {
            if (triggerBtn) triggerBtn.innerText = `⏳ ${countdown}초 대기`;
          } else {
            clearInterval(window.__aiCooldownTimerId);
            window.__aiCooldownTimerId = null;
            if (triggerBtn) {
              triggerBtn.disabled = false;
              triggerBtn.style.opacity = '1';
              triggerBtn.style.cursor = 'pointer';
              triggerBtn.innerText = '↺ 다시 조합';
            }
          }
        }, 1000);
      }

      memoArea.value = '✨ "낭만라이터가 소중한 추억을 글로 담아내는 중입니다.. ✍️"';
      memoArea.style.opacity = '0.6';
    }

    var cur = window.__richCurrentRecord || (window.interactiveHistory && window.interactiveHistory[window.currentCardIndex || 0]) || {};
    var spot = cur.spot || '선자령';
    var elevation = cur.elevation || '832m';
    var weight = cur.weightKg || '5.4';
    var hard = (window.__richState.hardText || '').trim();
    var good = (window.__richState.goodText || '').trim();
    var memory = (window.__richState.memoryText || '').trim();
    var tone = window.__richState.selectedTone || 'insta';
    var mbti = window.__richState.selectedMbti || 'INFP';

    var aiStory = await window.callGeminiFlashLiteAi(spot, elevation, weight, hard, good, memory, tone, mbti);

    memoArea.style.opacity = '1';

    if (aiStory) {
      memoArea.value = aiStory;
      if (isUserTriggered && typeof showToast === 'function') {
        showToast('✨ AI가 맞춤 감성 글을 완성했습니다!', 'success');
      }
    } else {
      var tempRecord = {
        spot: spot,
        elevation: elevation,
        hardText: hard,
        goodText: good,
        memoryText: memory,
        weightKg: weight
      };
      memoArea.value = window.composePoeticBackpackingStory(tempRecord, tone, mbti);
    }

    if (isUserTriggered) {
      triggerHaptic(10);
    }
  };
// 📷 [사진 누적(Append) 등록 - 최대 10장 한도 제어]
  window.__handleRichMultiPhotoUpload = function(e) {
    var files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!Array.isArray(window.__tempUploadedPhotos)) {
      window.__tempUploadedPhotos = [];
    }

    var currentCount = window.__tempUploadedPhotos.length;
    var availableSlots = 10 - currentCount;

    if (availableSlots <= 0) {
      if (typeof showToast === 'function') showToast('⚠️ 사진은 최대 10장까지만 등록할 수 있습니다.', 'warn');
      return;
    }

    var filesToProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      if (typeof showToast === 'function') showToast(`최대 10장 한도로 ${availableSlots}장의 사진만 추가됩니다.`, 'info');
    } else {
      if (typeof showToast === 'function') showToast('⚡ ' + filesToProcess.length + '장의 사진을 최적화하는 중...', 2000);
    }

    var compressSingle = function(file) {
      return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function(evt) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            var MAX_SIZE = 1080;
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
            resolve(canvas.toDataURL('image/jpeg', 0.80));
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(filesToProcess.map(compressSingle)).then(function(compressedUrls) {
      window.__tempUploadedPhotos = window.__tempUploadedPhotos.concat(compressedUrls).slice(0, 10);
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
      if (typeof showToast === 'function') showToast('🌟 사진 ' + compressedUrls.length + '장이 추가되었습니다!', 2000);
    });
  };
 // 💾 [낭만 일지 & 멀티 사진 최종 저장]
  // 💾 [낭만 일지 & 멀티 사진 IndexedDB 대용량 영구 저장]
  window.__saveRichAfterTrip = async function(recordId) {
    var rawLogs = window.safeGetStorage('okbm_packing_history', []);
    if (Array.isArray(rawLogs) && rawLogs.length > 0) {
      window.interactiveHistory = rawLogs.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    } else if (!window.interactiveHistory) {
      window.interactiveHistory = [];
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
    var userTypedMemo = memoInput ? memoInput.value.trim() : '';

    target.memo = userTypedMemo;
    target.oneLineMemo = target.spot ? (target.spot + ' 백패킹') : '자연 속 힐링 백패킹';

    if (Array.isArray(window.__tempUploadedPhotos) && window.__tempUploadedPhotos.length > 0) {
      target.photos = window.__tempUploadedPhotos.slice(0, 10);
      target.fieldPhoto = target.photos[0];
      target.photo = target.photos[0];
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

    // 📱 [내 스마트폰 대용량 IndexedDB에 고화질 사진 및 일지 영구 저장]
    window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
    await window.saveToIndexedDB('okbm_packing_history', window.interactiveHistory);

    try {
      localStorage.setItem('okbm_packing_history', JSON.stringify(window.interactiveHistory));
    } catch (e) {
      // 5MB 용량 한도 초과 시에도 IndexedDB에 100% 안전 저장 완료
    }

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
    if (typeof showToast === 'function') showToast('🎒 스마트폰에 낭만 일지가 안전하게 저장되었습니다!', 'success');
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

    // 개별 피드 카드 렌더러 함수 (액자형 사진 베젤, 슬림 명조 폰트, 정교한 배낭 벡터)
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
          
          <!-- 카드 헤더 (박지명 & 날짜) -->
          <div style="padding:12px 14px; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.88rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
              ${window.VEC_ICONS.pin}
              <span>${escapeHtml(log.spot)}</span>
            </div>
            <span style="font-size:0.68rem; color:#94a3b8; font-weight:700; font-family:'JetBrains Mono', monospace;">${escapeHtml(log.date)}</span>
          </div>

          <!-- 📖 [아리따부리 0.74rem 슬림 가독성 폰트 + 은은한 펄 섀도우] -->
          ${log.memo ? `
            <div style="padding:16px 18px 14px 18px; background:rgba(255,255,255,0.025); border-bottom:1px solid rgba(226,232,240,0.12); position:relative;">
              <div style="font-family:'Arita-buri-SemiBold', 'Noto Serif KR', serif; font-size:0.74rem; font-weight:300; color:#f1f5f9; line-height:1.65; word-break:keep-all; text-shadow:0 0 8px rgba(255,255,255,0.22); letter-spacing:-0.01em;">
                “${escapeHtml(log.memo)}”
              </div>
            </div>
          ` : ''}

          <!-- 📷 3:4 현장 사진들 (액자형 슬림 베젤 & 마진 분리 마감) -->
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

          <!-- 🎒 3:4 배낭 패킹 세팅지 (정교한 배낭 백터 아이콘 + '이날의 배낭 패킹.') -->
          <div style="padding:10px 14px 14px 14px; background:#07090e; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>
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
      <!-- 🧭 최상단: index.html 100% 동일 규격 표준 GNB -->
      <div style="position:relative !important; flex-shrink:0 !important; width:100% !important; height:52px !important; min-height:52px !important; border-bottom:1px solid rgba(255,255,255,0.08) !important; background:rgba(0, 0, 0, 0.94) !important; backdrop-filter:blur(25px) !important; -webkit-backdrop-filter:blur(25px) !important; padding:0 14px !important; padding-top:env(safe-area-inset-top, 0px) !important; margin:0 !important; box-sizing:content-box !important; z-index:10 !important; user-select:none !important;">
        <div style="height:52px !important; min-height:52px !important; display:flex !important; align-items:center !important; justify-content:flex-start !important; width:100% !important; max-width:480px !important; margin:0 auto !important;">
          <div class="brand-line" style="height:52px !important; display:inline-flex !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; margin:0 !important; flex-shrink:0 !important;">
            <div class="brand-sym-box" style="width:34px !important; height:34px !important; display:flex !important; align-items:center !important; justify-content:center !important; position:relative !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;">
              <svg viewBox="0 0 32 32" fill="none" style="width:30px !important; height:30px !important; display:block !important; margin:0 !important;">
                <circle cx="21" cy="6" r="9" fill="rgba(244,114,182,0.12)"/>
                <circle cx="21" cy="6" r="6" fill="rgba(245,158,11,0.18)"/>
                <circle cx="21" cy="6" r="3.8" fill="rgba(251,191,36,0.28)"/>
                <circle cx="2" cy="24" r="1.8" fill="#fda4af"/>
                <circle cx="9" cy="12" r="2.2" fill="#fda4af"/>
                <circle cx="14" cy="16" r="1.8" fill="#fda4af"/>
                <circle cx="13" cy="24" r="1.8" fill="#fda4af"/>
                <path d="M2 24L9 12H12.5L14 16L10 16M10 16L13 24" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="2.8" fill="#f59e0b"/>
                <circle cx="27" cy="13" r="2.2" fill="#e2e8f0"/>
                <circle cx="30" cy="24" r="2.4" fill="#e2e8f0"/>
                <path d="M13 24L21 6H25L27 13L22 13M22 13L30 24" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="1" fill="#ffffff"/>
              </svg>
            </div>
            <span class="brand-title" style="font-family:'SUIT', sans-serif !important; font-size:1.12rem !important; font-weight:900 !important; color:#ffffff !important; line-height:1 !important; display:inline-flex !important; align-items:center !important; letter-spacing:-0.02em !important; text-shadow:0 0 16px rgba(255, 255, 255, 0.35) !important; margin:0 !important; padding:0 !important;">낭만루트</span>
            <span class="brand-dot" style="width:3px !important; height:3px !important; background:radial-gradient(circle at 30% 30%, #ffffff 0%, #94a3b8 70%, #475569 100%) !important; box-shadow:0 0 6px rgba(255, 255, 255, 0.8), 0 0 8px rgba(56, 189, 248, 0.3) !important; border-radius:50% !important; display:inline-block !important; flex-shrink:0 !important; margin:0 !important; transform:translateY(0.5px) !important;"></span>
            <span class="brand-en" style="display:inline-flex !important; align-items:center !important; gap:7px !important; white-space:nowrap !important; line-height:1 !important;">
              <span class="word-romantic" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.68rem !important; font-weight:800 !important; letter-spacing:0.09em !important; transform:translateY(-1.6px) !important; opacity:0.96 !important;">ROMANTIC</span>
              <span class="word-route" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.74rem !important; font-weight:900 !important; letter-spacing:0.06em !important; transform:translateY(2.2px) !important;">ROUTE</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 📖 메인 피드 스크롤 컨테이너 (60fps 부드러운 관성 스크롤 복구) -->
      <div id="dualFeedScrollContainer" style="flex:1 1 0%; min-height:0; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 20px)) 12px; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${buildSingleFeedCardHtml(logs[startIdx])}
        </div>
        
        <div id="infiniteFeedLoaderTrigger" style="padding:16px 0 24px 0; text-align:center; color:#64748b; font-size:0.70rem; font-weight:800; display:flex; align-items:center; justify-content:center; gap:6px;">
          ${(logs.length > 1) ? '<span>⚡ 아래로 스크롤 시 이전 기록이 계속 이어집니다</span>' : '<span>마지막 기록입니다 ✨</span>'}
        </div>
      </div>

      <!-- 🛠️ 하단 4단 슬림 바: [🔗 공유] │ [💾 갤러리 저장] │ [✏️ 일지 수정] │ [◀ 뒤로] -->
      <div style="flex-shrink:0; display:flex; gap:6px; padding:10px 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:10;">
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

    // ⚡ [피드 끝 도달 시 45ms 브레이크 햅틱 & 다음 피드 무한 연속 로딩]
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

              // 🛑 피드 끝 완충 지대 통과 시 묵직한 45ms 브레이크 햅틱 ("덜컥")
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

  // 🔗 [인스타그램 / 카카오톡 / 네이티브 Web Share API 공유 엔진]
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

 // 🛡️ [보관함 화면 상단 GNB 고정 & 메인 스테이지 - 캘린더 별/점 구분 & 하단 상태 분기]
  window.renderFullBasecampStage = function(animType) {
    var content = document.querySelector('.my-basecamp-content');
    if (!content) return;

    content.style.cssText = 'width: 100% !important; max-width: 480px !important; height: 100dvh !important; max-height: 100dvh !important; margin: 0 auto !important; padding: 0 !important; gap: 0 !important; background: #000000 !important; border: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; overflow: hidden !important; box-sizing: border-box !important; overscroll-behavior: none !important; -webkit-overscroll-behavior: none !important; touch-action: pan-y !important;';

    var now = new Date();
    var viewYear = window.calViewYear || now.getFullYear();
    var viewMonth = window.calViewMonth || (now.getMonth() + 1);

    var allHistory = window.interactiveHistory || [];
    var totalCount = allHistory.length;
    var monthHistory = allHistory.filter(function(h) { return h.year === viewYear && h.month === viewMonth; });
    var monthCount = monthHistory.length;

    var totalGramsSum = allHistory.reduce((sum, h) => sum + (h.weightGrams || 0), 0);
    var avgWeightStr = totalCount > 0 ? (totalGramsSum / totalCount / 1000).toFixed(2) + 'kg' : '0.00kg';

    var totalAccumElevNum = 0;
    allHistory.forEach(h => {
      var num = parseInt(String(h.elevation).replace(/\D/g, ''), 10) || 0;
      totalAccumElevNum += num;
    });
    var accumElevStr = totalAccumElevNum > 0 ? `${totalAccumElevNum.toLocaleString()}m` : '0m';

    var hasRecord = (window.currentCardIndex >= 0 && window.currentCardIndex < allHistory.length);
    var cur = hasRecord ? allHistory[window.currentCardIndex] : null;

    if (cur) {
      window.activeSelectedDateKey = cur.date;
    }

    var dateParts = String(window.activeSelectedDateKey).match(/\d+/g) || [viewYear, viewMonth, 1];
    var activeDay = (parseInt(dateParts[0], 10) === viewYear && parseInt(dateParts[1], 10) === viewMonth) ? parseInt(dateParts[2], 10) : -1;

    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    // 💡 달력 날짜별 [황금별: 작성완료] vs [하늘색점: 미작성] 분기 렌더링
    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:17px;"></div>';
    }

    for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var dayRecord = monthHistory.find(function(h) { return h.day === d; });
      var isRecorded = !!dayRecord;
      var isCompleted = isRecorded && Boolean(dayRecord.memo && dayRecord.memo.trim().length > 0);

      var dayStyle = 'position:relative; height:17px; line-height:17px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.64rem; font-weight:800; border-radius:3px; cursor:pointer; transition:all 0.15s ease;';
      
      if (isSelected) {
        dayStyle += 'background:#00bcd4; color:#000000; font-weight:900; box-shadow:0 0 6px rgba(0,188,212,0.9); transform:scale(1.12);';
      } else if (isCompleted) {
        dayStyle += 'color:#fde047; font-weight:900;'; // 작성완료 날짜는 황금색
      } else if (isRecorded) {
        dayStyle += 'color:#38bdf8; font-weight:900;'; // 미작성 패킹 날짜는 하늘색
      } else {
        dayStyle += 'color:#cbd5e1;';
      }

      var dotOrStar = '';
      if (isCompleted) {
        dotOrStar = `<span style="position:absolute; bottom:0.5px; font-size:7px; color:${isSelected ? '#000' : '#f59e0b'}; line-height:1; font-weight:900;">★</span>`;
      } else if (isRecorded) {
        dotOrStar = `<span style="position:absolute; bottom:1px; width:3px; height:3px; background:${isSelected ? '#000' : '#38bdf8'}; border-radius:50%;"></span>`;
      }

      calendarDaysHtml += `<div style="${dayStyle}" onclick="window.handleCalendarDateClick(${d}, ${viewMonth}, ${viewYear})">${d}${dotOrStar}</div>`;
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
          <div style="width:100%; max-width:275px; aspect-ratio:3/4; background:linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); color:#ffffff; border:1px dashed rgba(226,232,240,0.3); border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; align-items:center; text-align:center;">
            <span style="font-size:0.62rem; font-weight:800; color:#38bdf8;">ROMANTIC ROUTE</span>
            <div>
              <div style="font-size:2.2rem;">🏕️</div>
              <div style="font-size:0.86rem; font-weight:900; margin-top:4px;">기록된 백패킹이 없습니다</div>
              <div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">계산기에서 장비를 담고 패킹을 저장해보세요!</div>
            </div>
            <button onclick="window.closeMyInfoModal(); if(typeof openPackingModal==='function') openPackingModal();" style="width:100%; height:34px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:6px; color:#fff; font-size:0.72rem; font-weight:900; cursor:pointer;">
              + 배낭 패킹하러 가기
            </button>
          </div>
        `;
      }
    }

    var bookmarks = new Set(window.safeGetStorage('okbm_bookmarks', []));
    var visited = new Set(window.safeGetStorage('okbm_visited', []));
    var archiveItems = [];
    visited.forEach(function(id) { archiveItems.push({ id: id, type: 'visited' }); });
    bookmarks.forEach(function(id) { archiveItems.push({ id: id, type: 'fav' }); });

    var filteredArchive = archiveItems.filter(function(b) {
      if (window.archiveFilter === 'visited') return b.type === 'visited';
      if (window.archiveFilter === 'fav') return b.type === 'fav';
      return true;
    });

    var recordTabHtml = `
      <div style="flex:1; width:100%; display:flex; flex-direction:column; gap:6px; padding:4px 0; overflow-y:auto; -webkit-overflow-scrolling:touch;">
        <div style="display:flex; gap:4px; background:rgba(255,255,255,0.05); border:1px solid rgba(226,232,240,0.18); border-radius:8px; padding:2px; flex-shrink:0;">
          <button onclick="window.archiveFilter = 'all'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'all' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'all' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:4px 0; font-size:0.68rem; font-weight:900; cursor:pointer;">전체 (${archiveItems.length})</button>
          <button onclick="window.archiveFilter = 'visited'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'visited' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'visited' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:4px 0; font-size:0.68rem; font-weight:900; cursor:pointer;">🚩 클리어</button>
          <button onclick="window.archiveFilter = 'fav'; window.renderFullBasecampStage();" style="flex:1; background:${window.archiveFilter === 'fav' ? '#38bdf8' : 'transparent'}; color:${window.archiveFilter === 'fav' ? '#000' : '#94a3b8'}; border:none; border-radius:6px; padding:4px 0; font-size:0.68rem; font-weight:900; cursor:pointer;">⭐ 찜</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${filteredArchive.length === 0 ? '<div style="font-size:0.72rem; color:var(--text-muted); padding:35px 0; text-align:center;">저장된 박지 아카이브가 없습니다.<br>전국 지도에서 찜이나 클리어를 눌러보세요!</div>' :
            filteredArchive.map(function(item) {
              var foundSpot = (window.registeredSpots || []).find(function(s) { return String(s.id).trim() === String(item.id).trim(); });
              var spotDisplayName = foundSpot ? (foundSpot.fullName || foundSpot.name) : ('박지 #' + item.id);
              var spotElev = foundSpot && foundSpot.elevation ? (foundSpot.elevation + 'm') : (foundSpot ? foundSpot.region : '전국');
              return `
                <div onclick="location.href='map.html?spot=${encodeURIComponent(spotDisplayName)}';" style="background:rgba(255,255,255,0.035); border:1px solid rgba(226,232,240,0.14); border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                  <div>
                    <div style="font-size:0.75rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:4px;">
                      ${item.type === 'visited' ? window.VEC_ICONS.flag : window.VEC_ICONS.star}
                      <span>${escapeHtml(spotDisplayName)}</span>
                    </div>
                    <div style="font-size:0.55rem; color:#94a3b8; margin-top:2px;">고도/지역: ${escapeHtml(spotElev)}</div>
                  </div>
                  <span style="font-size:0.62rem; color:#38bdf8; font-weight:800;">지도로 보기 ➔</span>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    `;

    var memoObj = window.safeGetStorage('okbm_memos', {});
    var memoKeys = Object.keys(memoObj).filter(function(k) { return !k.startsWith('__'); });

    var memoTabHtml = `
      <div style="flex:1; width:100%; display:flex; flex-direction:column; gap:6px; padding:4px 0; overflow-y:auto; -webkit-overflow-scrolling:touch;">
        <div style="font-size:0.66rem; color:#94a3b8; line-height:1.4;">지도 화면에서 기록해둔 나만의 비밀 꿀팁과 현장 메모 모음입니다.</div>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${memoKeys.length === 0 ? '<div style="font-size:0.72rem; color:var(--text-muted); padding:35px 0; text-align:center;">작성된 비밀 메모가 없습니다.<br>지도 화면에서 나만의 현장 꿀팁을 기록해보세요!</div>' :
            memoKeys.map(function(k) {
              var foundSpot = (window.registeredSpots || []).find(function(s) { return String(s.id).trim() === String(k).trim(); });
              var spotDisplayName = foundSpot ? (foundSpot.fullName || foundSpot.name) : ('박지 #' + k);
              return `
                <div onclick="location.href='map.html?spot=${encodeURIComponent(spotDisplayName)}';" style="background:rgba(255,255,255,0.035); border:1px dashed rgba(56,189,248,0.3); border-radius:8px; padding:8px 10px; cursor:pointer;">
                  <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:4px;">
                      ${window.VEC_ICONS.lock} <span>${escapeHtml(spotDisplayName)}</span>
                    </div>
                    <span style="font-size:0.58rem; color:#94a3b8;">지도로 이동 ➔</span>
                  </div>
                  <div style="font-size:0.68rem; color:#e2e8f0; line-height:1.45; margin-top:3px;">
                    “${escapeHtml(memoObj[k])}”
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>
    `;

    var tabContentHtml = historyMiddleHtml;
    if (window.activeBasecampTab === 'record') {
      tabContentHtml = recordTabHtml;
    } else if (window.activeBasecampTab === 'memo') {
      tabContentHtml = memoTabHtml;
    }

    // 💡 작성완료 여부에 따른 하단 메인 액션 버튼 분기 제어
    var isCurCompleted = cur && Boolean(cur.memo && cur.memo.trim().length > 0);
    var mainActionButtonHtml = '';

    if (!hasRecord) {
      mainActionButtonHtml = `
        <button onclick="showToast('기록을 먼저 선택해주세요.', 'warn')" style="flex:1.2; height:38px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer;">
          📸 다녀온 기록 작성
        </button>
      `;
    } else if (isCurCompleted) {
      // 작성 완료된 기록 ➔ 보관함에서는 수정 불가 & 작성완료 뱃지 노출 (피드 목록에서만 수정 가능)
      mainActionButtonHtml = `
        <div style="flex:1.2; height:38px; background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.4); color:#6ee7b7; font-size:0.74rem; font-weight:900; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:4px; user-select:none; box-sizing:border-box;">
          <span>✅ 낭만 일지 작성완료</span>
        </div>
      `;
    } else {
      // 미작성 기록 ➔ 다녀온 기록 작성 버튼 생성
      mainActionButtonHtml = `
        <button onclick="window.openRichAfterTripModal(window.interactiveHistory[window.currentCardIndex])" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
          <span>📸 다녀온 기록 작성</span>
        </button>
      `;
    }

    content.innerHTML = `
      <!-- 🧭 보관함 최상단 고정 GNB -->
      <div style="position:relative !important; flex-shrink:0 !important; width:100% !important; height:52px !important; min-height:52px !important; border-bottom:1px solid rgba(255,255,255,0.08) !important; background:rgba(0, 0, 0, 0.94) !important; backdrop-filter:blur(25px) !important; -webkit-backdrop-filter:blur(25px) !important; padding:0 14px !important; padding-top:env(safe-area-inset-top, 0px) !important; margin:0 !important; box-sizing:content-box !important; z-index:10 !important; user-select:none !important;">
        <div style="height:52px !important; min-height:52px !important; display:flex !important; align-items:center !important; justify-content:flex-start !important; width:100% !important; max-width:480px !important; margin:0 auto !important;">
          <div class="brand-line" style="height:52px !important; display:inline-flex !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; margin:0 !important; flex-shrink:0 !important;">
            <div class="brand-sym-box" style="width:34px !important; height:34px !important; display:flex !important; align-items:center !important; justify-content:center !important; position:relative !important; flex-shrink:0 !important; margin:0 !important; padding:0 !important;">
              <svg viewBox="0 0 32 32" fill="none" style="width:30px !important; height:30px !important; display:block !important; margin:0 !important;">
                <circle cx="21" cy="6" r="9" fill="rgba(244,114,182,0.12)"/>
                <circle cx="21" cy="6" r="6" fill="rgba(245,158,11,0.18)"/>
                <circle cx="21" cy="6" r="3.8" fill="rgba(251,191,36,0.28)"/>
                <circle cx="2" cy="24" r="1.8" fill="#fda4af"/>
                <circle cx="9" cy="12" r="2.2" fill="#fda4af"/>
                <circle cx="14" cy="16" r="1.8" fill="#fda4af"/>
                <circle cx="13" cy="24" r="1.8" fill="#fda4af"/>
                <path d="M2 24L9 12H12.5L14 16L10 16M10 16L13 24" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="2.8" fill="#f59e0b"/>
                <circle cx="27" cy="13" r="2.2" fill="#e2e8f0"/>
                <circle cx="30" cy="24" r="2.4" fill="#e2e8f0"/>
                <path d="M13 24L21 6H25L27 13L22 13M22 13L30 24" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/>
                <circle cx="21" cy="6" r="1" fill="#ffffff"/>
              </svg>
            </div>
            <span class="brand-title" style="font-family:'SUIT', sans-serif !important; font-size:1.12rem !important; font-weight:900 !important; color:#ffffff !important; line-height:1 !important; display:inline-flex !important; align-items:center !important; letter-spacing:-0.02em !important; text-shadow:0 0 16px rgba(255, 255, 255, 0.35) !important; margin:0 !important; padding:0 !important;">낭만루트</span>
            <span class="brand-dot" style="width:3px !important; height:3px !important; background:radial-gradient(circle at 30% 30%, #ffffff 0%, #94a3b8 70%, #475569 100%) !important; box-shadow:0 0 6px rgba(255, 255, 255, 0.8), 0 0 8px rgba(56, 189, 248, 0.3) !important; border-radius:50% !important; display:inline-block !important; flex-shrink:0 !important; margin:0 !important; transform:translateY(0.5px) !important;"></span>
            <span class="brand-en" style="display:inline-flex !important; align-items:center !important; gap:7px !important; white-space:nowrap !important; line-height:1 !important;">
              <span class="word-romantic" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.68rem !important; font-weight:800 !important; letter-spacing:0.09em !important; transform:translateY(-1.6px) !important; opacity:0.96 !important;">ROMANTIC</span>
              <span class="word-route" style="font-family:'Space Grotesk', -apple-system, sans-serif !important; text-transform:uppercase !important; line-height:1 !important; display:inline-block !important; background:linear-gradient(180deg, #ffffff 0%, #f1f5f9 25%, #cbd5e1 50%, #94a3b8 75%, #e2e8f0 100%) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; filter:drop-shadow(0 0 8px rgba(226, 232, 240, 0.45)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important; font-size:0.74rem !important; font-weight:900 !important; letter-spacing:0.06em !important; transform:translateY(2.2px) !important;">ROUTE</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 본문 영역 -->
      <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:space-between; padding:1px 12px 0 12px; margin:0 !important; gap:0 !important; box-sizing:border-box; overflow:hidden;">
        
        <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px; margin:0 !important; padding:0 !important;">
          <div style="display:flex; background:rgba(255,255,255,0.08); padding:2.5px; border-radius:9px; gap:2.5px; border:1px solid rgba(226,232,240,0.2); margin:0 !important;">
            <button onclick="window.switchBasecampTab('history')" style="flex:1; background:${window.activeBasecampTab==='history' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='history' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:900; cursor:pointer;">📸 힐링 기록</button>
            <button onclick="window.switchBasecampTab('record')" style="flex:1; background:${window.activeBasecampTab==='record' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='record' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:800; cursor:pointer;">🚩 클리어 & 찜</button>
            <button onclick="window.switchBasecampTab('memo')" style="flex:1; background:${window.activeBasecampTab==='memo' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='memo' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:800; cursor:pointer;">📝 비밀 메모</button>
          </div>

          ${window.activeBasecampTab === 'history' ? `
            <div style="display:flex; flex-direction:column; gap:4px; margin-top:2px;">
              <div style="background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:5px 8px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
                <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">2026 힐링</div><div style="font-size:0.92rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">${totalCount}회</div></div>
                <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
                <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">누적 고도</div><div style="font-size:0.92rem; font-weight:900; color:#34d399; font-family:'Space Grotesk', sans-serif;">${accumElevStr}</div></div>
                <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
                <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">평균 무게</div><div style="font-size:0.92rem; font-weight:900; color:#fde047; font-family:'Space Grotesk', sans-serif;">${avgWeightStr}</div></div>
              </div>

              <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(226,232,240,0.16); border-radius:8px; padding:4px 6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                  <div style="display:flex; align-items:center; gap:3px;">
                    <button onclick="window.changeBasecampMonth(-1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">◀</button>
                    <span style="font-size:0.72rem; font-weight:900; color:#fff;">${viewYear}년 ${viewMonth}월</span>
                    <button onclick="window.changeBasecampMonth(1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:3px; font-size:0.55rem; cursor:pointer;">▶</button>
                  </div>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <div style="font-size:0.54rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif;">총 ${totalCount}회 | ${viewMonth}월 ${monthCount}회</div>
                    <div style="display:inline-flex; background:rgba(255,255,255,0.08); border-radius:10px; padding:1px; gap:1px;">
                      <button onclick="window.currentViewMode='card'; window.renderFullBasecampStage();" style="background:${window.currentViewMode==='card'?'#38bdf8':'transparent'}; color:${window.currentViewMode==='card'?'#000':'#94a3b8'}; border:none; border-radius:8px; padding:1px 6px; font-size:0.55rem; font-weight:900; cursor:pointer;">카드</button>
                      <button onclick="window.currentViewMode='list'; window.renderFullBasecampStage();" style="background:${window.currentViewMode==='list'?'#38bdf8':'transparent'}; color:${window.currentViewMode==='list'?'#000':'#94a3b8'}; border:none; border-radius:8px; padding:1px 6px; font-size:0.55rem; font-weight:900; cursor:pointer;">목록</button>
                    </div>
                  </div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.50rem; font-weight:800; color:#64748b; margin-bottom:1px;">
                  <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#38bdf8;">토</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; text-align:center;">
                  ${calendarDaysHtml}
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:0; position:relative; padding:2px 0;">
          ${tabContentHtml}
        </div>

      </div>

      <!-- 🚪 최하단 바 (미작성 시 작성 버튼 / 작성 완료 시 뱃지 표기) -->
      <div style="flex-shrink:0; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; min-height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; display:flex; align-items:center; gap:6px; padding:0 12px env(safe-area-inset-bottom, 0px) 12px !important; background:rgba(0,0,0,0.96); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:10;">
        ${mainActionButtonHtml}
        <button onclick="window.openPastTripsListModal()" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(2,132,199,0.35);">
          <span>📱 피드 목록 ➔</span>
        </button>
        <button onclick="${hasRecord ? `window.deleteSingleLogRecord('${(cur && cur.id) ? cur.id : ''}')` : `showToast('삭제할 기록이 없습니다.', 'warn')`}" style="height:38px; background:rgba(244,63,94,0.15); border:1px solid #f43f5e; color:#fda4af; border-radius:8px; padding:0 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          ${window.VEC_ICONS.trash}
        </button>
        <button onclick="window.closeMyInfoModal()" style="height:38px; padding:0 10px; background:transparent; border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          ✕ 닫기
        </button>
      </div>
    `;

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
          if (typeof window.openPackChecklistModal === 'function') {
            window.openPackChecklistModal(window.interactiveHistory[window.currentCardIndex]);
          }
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
          cardTarget.style.transform = 'translateX(' + (diffX * 0.45) + 'px) rotateY(' + baseRot + 'deg) rotateZ(' + (diffX * 0.015) + 'deg)';
        }
      };

      cardTarget.onpointerup = function(e) {
        clearTimeout(longPressTimer);
        if (!isDragging) return;
        isDragging = false;
        try { cardTarget.releasePointerCapture(e.pointerId); } catch (err) {}

        cardTarget.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
        var diffX = currentX - startX;

        if (!isSwipeMoved) {
          window.isPostcardFlipped = !window.isPostcardFlipped;
          if (window.isPostcardFlipped) cardTarget.classList.add('flipped');
          else cardTarget.classList.remove('flipped');
          cardTarget.style.transform = window.isPostcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
          
          window.triggerSoftAmbientFX(cardTarget);
          triggerHaptic(8);
        } else {
          if (diffX < -50) {
            window.navigateCardRecord('next');
          } else if (diffX > 50) {
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

    var rawList = window.safeGetStorage('okbm_packing_history', []);
    if (Array.isArray(rawList) && rawList.length > 0) {
      window.interactiveHistory = rawList.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
      window.interactiveHistory.sort(function(a, b) { return a.day - b.day; });
    } else {
      window.interactiveHistory = [];
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

  window.handleCalendarDateClick = function(day, month, year) {
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;

    // 연, 월, 일 숫자를 1:1 직통 대조하여 기록 보유 여부 100% 정밀 판별
    var foundIdx = window.interactiveHistory.findIndex(function(h) {
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

    window.currentCardIndex = foundIdx;
    window.renderFullBasecampStage('fade');
    triggerHaptic(10);
  };

  window.navigateCardRecord = function(direction) {
    var total = window.interactiveHistory.length;
    if (total <= 1) return;

    if (direction === 'next' && window.currentCardIndex < total - 1) {
      window.currentCardIndex++;
      var cur = window.interactiveHistory[window.currentCardIndex];
      if (cur) window.activeSelectedDateKey = cur.date;
      window.renderFullBasecampStage('slide-left');
      triggerHaptic(8);
    } else if (direction === 'prev' && window.currentCardIndex > 0) {
      window.currentCardIndex--;
      var cur = window.interactiveHistory[window.currentCardIndex];
      if (cur) window.activeSelectedDateKey = cur.date;
      window.renderFullBasecampStage('slide-right');
      triggerHaptic(8);
    } else {
      window.renderFullBasecampStage();
    }
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
