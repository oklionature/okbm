(function okbmStashNaverOAuthCode() {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var code = String(params.get('code') || '').trim();
    var state = String(params.get('state') || '').trim();
    var savedState = '';
    try { savedState = sessionStorage.getItem('okbm_naver_oauth_state') || ''; } catch (e) {}
    if (!code || !state || !savedState || state !== savedState) return;
    try { sessionStorage.setItem('okbm_naver_oauth_code', code); } catch (e) {}
    try { sessionStorage.removeItem('okbm_naver_oauth_token'); } catch (e) {}
    params.delete('code');
    params.delete('state');
    var nextSearch = params.toString();
    if (window.history && typeof history.replaceState === 'function') {
      history.replaceState(null, '', window.location.pathname + (nextSearch ? '?' + nextSearch : ''));
    }
  } catch (e) {}
})();

window.OKBM_PACKING_HISTORY_LIMIT = 30;
window.OKBM_SPOT_VIEWS_LRU_LIMIT = 200;
window.OKBM_SPOTS_IDB_NAME = 'okbm_spots_idb';
window.OKBM_SPOTS_IDB_STORE = 'cache';
window.OKBM_SPOTS_IDB_KEY = 'okbm_master_spots';

(function okbmInstallSafeStorage() {
  if (window.__okbmSafeStorageInstalled) return;
  window.__okbmSafeStorageInstalled = true;

  var rawSetItem = Storage.prototype.setItem;
  var rawRemoveItem = Storage.prototype.removeItem;
  var spotsIdb = null;
  var spotsIdbOpening = null;

  window.__okbmRawSetItem = function(storage, key, value) {
    return rawSetItem.call(storage, key, value == null ? '' : String(value));
  };
  window.__okbmRawRemoveItem = function(storage, key) {
    return rawRemoveItem.call(storage, key);
  };

  function isQuotaExceeded(err) {
    if (!err) return false;
    return err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014;
  }

  function capJsonArray(value, limit) {
    var parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); } catch (e) { return value; }
    }
    if (!Array.isArray(parsed)) {
      return typeof value === 'string' ? value : JSON.stringify(parsed);
    }
    if (parsed.length <= limit) {
      return typeof value === 'string' ? value : JSON.stringify(parsed);
    }
    return JSON.stringify(parsed.slice(0, limit));
  }

  function capSpotViewsMap(value) {
    var map = value;
    if (typeof value === 'string') {
      try { map = JSON.parse(value); } catch (e) { return value; }
    }
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      return typeof value === 'string' ? value : JSON.stringify(map || {});
    }
    var keys = Object.keys(map);
    var limit = window.OKBM_SPOT_VIEWS_LRU_LIMIT || 200;
    if (keys.length <= limit) return JSON.stringify(map);
    var keep = keys.slice(-limit);
    var next = {};
    keep.forEach(function(k) { next[k] = map[k]; });
    return JSON.stringify(next);
  }

  function evictLowPriorityCaches() {
    var removed = 0;
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      keys.forEach(function(k) {
        if (!k) return;
        if (k.indexOf('okbm_views_') === 0 ||
            k.indexOf('okbm_weather_') === 0 ||
            k === 'okbm_spots_cache' ||
            k === 'okbm_master_spots' ||
            k === 'okbm_global_spot_views') {
          try {
            rawRemoveItem.call(localStorage, k);
            removed += 1;
          } catch (e) {}
        }
      });
    } catch (e) {}
    return removed;
  }
  window.okbmEvictLowPriorityCaches = evictLowPriorityCaches;

  function openSpotsIdb() {
    if (spotsIdb) return Promise.resolve(spotsIdb);
    if (spotsIdbOpening) return spotsIdbOpening;
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('indexedDB unavailable'));
    }
    spotsIdbOpening = new Promise(function(resolve, reject) {
      try {
        var req = indexedDB.open(window.OKBM_SPOTS_IDB_NAME, 1);
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(window.OKBM_SPOTS_IDB_STORE)) {
            db.createObjectStore(window.OKBM_SPOTS_IDB_STORE);
          }
        };
        req.onsuccess = function(e) {
          spotsIdb = e.target.result;
          spotsIdbOpening = null;
          resolve(spotsIdb);
        };
        req.onerror = function() {
          spotsIdbOpening = null;
          reject(req.error);
        };
      } catch (e) {
        spotsIdbOpening = null;
        reject(e);
      }
    });
    return spotsIdbOpening;
  }

  function hydrateSpotsMemory(list) {
    if (!Array.isArray(list)) return;
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_master_spots'] = list;
    window.__memoryStore['okbm_spots_cache'] = list;
    window.SPOTS_MASTER = list;
  }

  window.okbmSpotsIdbSet = function(key, value) {
    return openSpotsIdb().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(window.OKBM_SPOTS_IDB_STORE, 'readwrite');
        tx.objectStore(window.OKBM_SPOTS_IDB_STORE).put(value, key || window.OKBM_SPOTS_IDB_KEY);
        tx.oncomplete = function() { resolve(true); };
        tx.onerror = function() { reject(tx.error); };
      });
    }).catch(function(e) {
      console.warn('[okbmSpotsIdbSet]', e);
      return false;
    });
  };

  window.okbmSpotsIdbGet = function(key) {
    return openSpotsIdb().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction(window.OKBM_SPOTS_IDB_STORE, 'readonly');
        var req = tx.objectStore(window.OKBM_SPOTS_IDB_STORE).get(key || window.OKBM_SPOTS_IDB_KEY);
        req.onsuccess = function() { resolve(req.result == null ? null : req.result); };
        req.onerror = function() { reject(req.error); };
      });
    }).catch(function(e) {
      console.warn('[okbmSpotsIdbGet]', e);
      return null;
    });
  };

  function dropSpotsLocalStorage() {
    try {
      rawRemoveItem.call(localStorage, 'okbm_spots_cache');
      rawRemoveItem.call(localStorage, 'okbm_master_spots');
    } catch (e) {}
  }

  function redirectSpotsToIdb(value) {
    var parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); } catch (e) { return; }
    }
    if (!Array.isArray(parsed)) return;
    hydrateSpotsMemory(parsed);
    if (typeof window.okbmSpotsIdbSet === 'function') {
      window.okbmSpotsIdbSet(window.OKBM_SPOTS_IDB_KEY, parsed);
    }
    dropSpotsLocalStorage();
  }

  window.okbmReadSpotsCache = function() {
    var mem = window.__memoryStore && (
      window.__memoryStore['okbm_master_spots'] ||
      window.__memoryStore['okbm_spots_cache']
    );
    if (Array.isArray(mem) && mem.length) return mem;
    if (Array.isArray(window.SPOTS_MASTER) && window.SPOTS_MASTER.length) return window.SPOTS_MASTER;
    try {
      var raw = localStorage.getItem('okbm_master_spots') || localStorage.getItem('okbm_spots_cache');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return [];
  };

  window.okbmCapPackingHistoryList = function(list) {
    if (!Array.isArray(list)) return [];
    var limit = window.OKBM_PACKING_HISTORY_LIMIT || 30;
    return list.length > limit ? list.slice(0, limit) : list;
  };

  window.okbmSafeSetItem = function(key, value, storage) {
    storage = storage || localStorage;
    var strVal = value == null ? '' : String(value);

    if (storage === localStorage) {
      if (key === 'okbm_packing_history') {
        strVal = capJsonArray(strVal, window.OKBM_PACKING_HISTORY_LIMIT || 30);
      }
      if (key === 'okbm_spots_cache' || key === 'okbm_master_spots') {
        redirectSpotsToIdb(strVal);
        return true;
      }
      if (typeof key === 'string' && key.indexOf('okbm_views_') === 0) {
        return true;
      }
      if (key === 'okbm_global_spot_views') {
        strVal = capSpotViewsMap(strVal);
        try {
          rawSetItem.call(sessionStorage, key, strVal);
          try { rawRemoveItem.call(localStorage, key); } catch (e0) {}
          return true;
        } catch (e) {
          console.warn('[okbmSafeSetItem:session views]', e);
          return false;
        }
      }
    }

    try {
      rawSetItem.call(storage, key, strVal);
      return true;
    } catch (e) {
      if (isQuotaExceeded(e) && storage === localStorage) {
        evictLowPriorityCaches();
        try {
          rawSetItem.call(storage, key, strVal);
          return true;
        } catch (e2) {
          console.warn('[okbmSafeSetItem] QuotaExceeded after eviction', key, e2);
          return false;
        }
      }
      console.warn('[okbmSafeSetItem]', key, e);
      return false;
    }
  };

  Storage.prototype.setItem = function(key, value) {
    var isLocal = false;
    try { isLocal = (this === localStorage); } catch (e) {}
    if (isLocal) {
      window.okbmSafeSetItem(key, value, localStorage);
      return;
    }
    try {
      rawSetItem.call(this, key, value == null ? '' : String(value));
    } catch (e) {
      console.warn('[Storage.setItem]', key, e);
    }
  };

  (function purgeLegacyViewKeysAndTrimHistory() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach(function(k) {
        if (k && k.indexOf('okbm_views_') === 0) {
          try { rawRemoveItem.call(localStorage, k); } catch (e) {}
        }
      });
      var lsViews = localStorage.getItem('okbm_global_spot_views');
      var ssViews = sessionStorage.getItem('okbm_global_spot_views');
      if (lsViews && !ssViews) {
        try { rawSetItem.call(sessionStorage, 'okbm_global_spot_views', capSpotViewsMap(lsViews)); } catch (e) {}
      }
      try { rawRemoveItem.call(localStorage, 'okbm_global_spot_views'); } catch (e) {}
    } catch (e) {}
    try {
      var rawHist = localStorage.getItem('okbm_packing_history');
      if (!rawHist) return;
      var list = JSON.parse(rawHist);
      var limit = window.OKBM_PACKING_HISTORY_LIMIT || 30;
      if (Array.isArray(list) && list.length > limit) {
        window.okbmSafeSetItem('okbm_packing_history', JSON.stringify(list.slice(0, limit)));
      }
    } catch (e) {}
  })();
})();

// 🧹 [캐시 정리 엔진] SSOT 중앙 집중식 레거시 캐시 정리
function purgeIfStale(epochKey, epochValue, keysToRemove, options) {
  try {
    if (localStorage.getItem(epochKey) !== epochValue) {
      if (Array.isArray(keysToRemove)) {
        keysToRemove.forEach(function(k) { localStorage.removeItem(k); });
      }
      if (options && typeof options.customPurge === 'function') {
        options.customPurge();
      }
      if (!options || options.updateEpoch !== false) {
        localStorage.setItem(epochKey, epochValue);
      }
    }
  } catch (e) {
    console.warn('[purgeIfStale]', e);
  }
}
window.purgeIfStale = purgeIfStale;

(function autoPurgeStaleGearCache() {
  try {
    localStorage.removeItem('okbm_master_gears');
    localStorage.removeItem('okbm_master_gears_cache');
  } catch (e) {}
})();

(function autoPurgeLegacyAuthCopies() {
  try {
    localStorage.removeItem('user_auth_token');
    localStorage.removeItem('okbm_user_email');
    ['user_profile'].concat(
      localStorage.getItem('okbm_user_id') ? ['user_profile_' + localStorage.getItem('okbm_user_id')] : []
    ).forEach(function(key) {
      var raw = localStorage.getItem(key);
      if (!raw) return;
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return;
      if (!('email' in p) && !('isAdmin' in p) && !('is_admin' in p) && !('role' in p)) return;
      delete p.email;
      delete p.isAdmin;
      delete p.is_admin;
      delete p.role;
      localStorage.setItem(key, JSON.stringify(p));
    });
  } catch (e) {}
})();

(function autoPurgeLegacyClientCache() {
  // 20260921: 풀덤프 spots 캐시 제거 → 경량 핀 목록만 재적재
  var CLEAN_EPOCH = '20260921_SPOTS_LIGHTWEIGHT';
  var keepKeys = [
    'okbm_gear_version',
    'user_auth_token',
    'user_profile',
    'okbm_user_id',
    'okbm_user_nick',
    'okbm_bookmarks',
    'okbm_visited',
    'okbm_memos',
    'okbm_plan_memos',
    'okbm_plan_spots',
    'okbm_packing_history',
    'okbm_selected_gears_multi',
    'okbm_favorite_gears',
    'okbm_custom_gears',
    'okbm_gear_presets',
    'okbm_gear_meta',
    'okbm_hero_cover_url',
    'okbm_my_proposals'
  ];
  purgeIfStale('okbm_client_epoch', CLEAN_EPOCH, [
    'okbm_deleted_record_ids',
    'okbm_phone_photos_map',
    'okbm_trip_photos_map',
    'okbm_spots_cache',
    'okbm_master_spots'
  ], {
    customPurge: function() {
      Object.keys(localStorage).forEach(function(k) {
        if (!keepKeys.includes(k) && !k.startsWith('user_profile_')) {
          localStorage.removeItem(k);
        }
      });
    }
  });
})();

var SUPABASE_URL = window.SUPABASE_URL || '';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
if (SUPABASE_URL) window.SUPABASE_URL = SUPABASE_URL;
if (SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
var NAVER_CLIENT_ID = 'FKh1hhDec4_gsz8O90Fm';
window.NAVER_CLIENT_ID = NAVER_CLIENT_ID;
var R2_PUBLIC_DOMAIN = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
window.R2_PUBLIC_DOMAIN = R2_PUBLIC_DOMAIN;

if (window.supabase && typeof window.supabase.createClient === 'function' && !window.supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
  var okbmLoopbackHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: !window.__okbmNativeOAuthBounce,
      persistSession: true,
      flowType: (window.isSecureContext || okbmLoopbackHost) ? 'pkce' : 'implicit'
    }
  });
}

if (typeof window.isCloudDataLoaded === 'undefined') {
  window.isCloudDataLoaded = false;
}

function safeGetJSON(key, defaultVal) {
  try {
    if (key === 'okbm_spots_cache' || key === 'okbm_master_spots') {
      var spotsCached = (typeof window.okbmReadSpotsCache === 'function')
        ? window.okbmReadSpotsCache()
        : [];
      if (Array.isArray(spotsCached) && spotsCached.length) return spotsCached;
      return defaultVal;
    }
    if (key === 'okbm_global_spot_views') {
      var viewsRaw = sessionStorage.getItem(key) || localStorage.getItem(key);
      return viewsRaw ? JSON.parse(viewsRaw) : defaultVal;
    }
    var item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    console.warn('[romantic-sync.js:safeGetJSON]', e);
    return defaultVal;
  }
}

// [공통 유틸] 안전한 햅틱 피드백 트리거
function triggerHaptic(duration) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
        navigator.vibrate(duration || 12);
      }
    } catch (e) { console.warn('[romantic-sync.js:triggerHaptic]', e); }
  }
}

window.safeGetJSON = safeGetJSON;
window.triggerHaptic = triggerHaptic;
window.escapeHtml = function(t) {
  if (t === null || t === undefined) return '';
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

var OKBM_USER_BIO_MAX = 100;

function okbmNormalizeUserBio(text) {
  var s = String(text == null ? '' : text);
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  if (s.length > OKBM_USER_BIO_MAX) s = s.slice(0, OKBM_USER_BIO_MAX);
  return s;
}

function okbmSafeImageUrl(url) {
  var raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  if (/[\u0000-\u001F\u007F<>"'\\\s]/.test(raw)) return '';
  try {
    var parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    if (parsed.username || parsed.password) return '';
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    var href = String(parsed.href || '').trim();
    if (!href || href.indexOf('https://') !== 0) return '';
    if (/[\u0000-\u001F\u007F<>"'\\]/.test(href)) return '';
    return href;
  } catch (e) {
    return '';
  }
}

function okbmSafeExternalUrl(url) {
  var raw = String(url == null ? '' : url).trim();
  if (!raw) return '#';
  if (/[\u0000-\u001F\u007F<>"'\\\s]/.test(raw)) return '#';
  try {
    var parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
    if (parsed.username || parsed.password) return '#';
    var href = String(parsed.href || '').trim();
    if (!href || (href.indexOf('https://') !== 0 && href.indexOf('http://') !== 0)) return '#';
    if (/[\u0000-\u001F\u007F<>"'\\]/.test(href)) return '#';
    return href;
  } catch (e) {
    return '#';
  }
}

window.okbmNormalizeUserBio = okbmNormalizeUserBio;
window.okbmSafeImageUrl = okbmSafeImageUrl;
window.okbmSafeExternalUrl = okbmSafeExternalUrl;

window.applySmartPhotoFit = window.applySmartPhotoFit || function(img) {
  if (!img) return;
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    var ratio = img.naturalWidth / img.naturalHeight;
    if (ratio < 0.98) {
      img.classList.remove('is-landscape', 'is-square', 'is-keep-ratio');
      img.classList.add('is-portrait', 'is-portrait-crop');
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('height', '100%', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('max-height', '100%', 'important');
      img.style.setProperty('object-fit', 'cover', 'important');
      img.style.removeProperty('aspect-ratio');
    } else {
      img.classList.remove('is-portrait', 'is-portrait-crop');
      img.classList.add('is-keep-ratio');
      img.style.setProperty('object-fit', 'contain', 'important');
    }
  }
};

function okbmStripClientTombstoneFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.filter(function(item) {
      return item && item._memDeleted !== true && item.isDeleted !== true && item.is_deleted !== true;
    }).map(okbmStripClientTombstoneFields);
  }
  var copy = Object.assign({}, obj);
  delete copy.isDeleted;
  delete copy._memDeleted;
  delete copy.is_deleted;
  return copy;
}
window.okbmStripClientTombstoneFields = okbmStripClientTombstoneFields;

window.__okbmSessionCache = window.__okbmSessionCache || {
  session: null,
  user: null,
  synced: false,
  updatedAt: 0
};

function okbmWriteSessionCache(session) {
  window.__okbmSessionCache = {
    session: session || null,
    user: (session && session.user) ? session.user : null,
    synced: true,
    updatedAt: Date.now()
  };
}

window.SVG_ICONS = window.SVG_ICONS || {
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

window.autoPurgeStaleGearCache = window.autoPurgeStaleGearCache || function() {
  try {
    localStorage.removeItem('okbm_master_gears');
    localStorage.removeItem('okbm_master_gears_cache');
  } catch (e) {
    console.warn('[romantic-sync.js:autoPurgeStaleGearCache]', e);
  }
};

window.autoPurgeLegacyClientCache = window.autoPurgeLegacyClientCache || function() {
  var CLEAN_EPOCH = '20260921_SPOTS_LIGHTWEIGHT';
  var keepKeys = [
    'okbm_gear_version', 'user_auth_token', 'user_profile', 'okbm_user_id', 'okbm_user_nick',
    'okbm_bookmarks', 'okbm_visited', 'okbm_memos', 'okbm_plan_memos', 'okbm_plan_spots',
    'okbm_packing_history', 'okbm_selected_gears_multi', 'okbm_favorite_gears', 'okbm_custom_gears',
    'okbm_gear_presets', 'okbm_gear_meta', 'okbm_hero_cover_url', 'okbm_my_proposals'
  ];
  try {
    if (typeof window.purgeIfStale === 'function') {
      window.purgeIfStale('okbm_client_epoch', CLEAN_EPOCH, [
        'okbm_deleted_record_ids',
        'okbm_phone_photos_map',
        'okbm_trip_photos_map',
        'okbm_spots_cache',
        'okbm_master_spots'
      ], {
        customPurge: function() {
          Object.keys(localStorage).forEach(function(k) {
            if (keepKeys.indexOf(k) === -1 && k.indexOf('user_profile_') !== 0) {
              localStorage.removeItem(k);
            }
          });
        }
      });
      return;
    }
    if (localStorage.getItem('okbm_client_epoch') !== CLEAN_EPOCH) {
      Object.keys(localStorage).forEach(function(k) {
        if (keepKeys.indexOf(k) === -1 && k.indexOf('user_profile_') !== 0) {
          localStorage.removeItem(k);
        }
      });
      localStorage.removeItem('okbm_deleted_record_ids');
      localStorage.removeItem('okbm_phone_photos_map');
      localStorage.removeItem('okbm_trip_photos_map');
      localStorage.removeItem('okbm_spots_cache');
      localStorage.removeItem('okbm_master_spots');
      localStorage.setItem('okbm_client_epoch', CLEAN_EPOCH);
    }
  } catch (e) {
    console.warn('[romantic-sync.js:autoPurgeLegacyClientCache]', e);
  }
};

window.applySmartPhotoFit = function(img) {
  if (!img) return;
  if (img.closest && (img.closest('.postcard-template-container') || img.closest('.postcard-face-back'))) return;
  var fit = function() {
    var w = img.naturalWidth || img.videoWidth || 0;
    var h = img.naturalHeight || img.videoHeight || 0;
    if (w <= 0 || h <= 0) return;
    var ratio = w / h;
    var inReel = !!(img.closest && img.closest('.reel-horizontal-track'));
    img.classList.remove('is-landscape', 'is-square', 'is-portrait', 'is-portrait-crop', 'is-keep-ratio');
    img.style.setProperty('border-radius', '0', 'important');
    img.style.setProperty('box-shadow', 'none', 'important');
    img.style.setProperty('object-position', 'center center', 'important');
    img.style.setProperty('background-color', '#000000', 'important');
    img.style.setProperty('min-width', '0', 'important');
    img.style.setProperty('min-height', '0', 'important');
    if (ratio < 0.98) {
      // 📱 [세로사진]: 상단 안전바까지 100% 화면 꽉차게 (width: 100%, height: 100%, object-fit: cover)
      img.classList.add('is-portrait', 'is-portrait-crop');
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('height', '100%', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('max-height', '100%', 'important');
      img.style.setProperty('object-fit', 'cover', 'important');
      img.style.removeProperty('aspect-ratio');
    } else {
      // 🖼️ [나머지들 (가로/정사각형)]: 기존 비율 및 contain 유지
      img.style.setProperty('width', inReel ? 'auto' : '100%', 'important');
      img.style.setProperty('height', 'auto', 'important');
      img.style.setProperty('max-width', '100%', 'important');
      img.style.setProperty('max-height', inReel ? '100%' : 'none', 'important');
      img.style.setProperty('aspect-ratio', w + ' / ' + h, 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      if (ratio > 1.02) {
        img.classList.add('is-landscape', 'is-keep-ratio');
      } else {
        img.classList.add('is-square', 'is-keep-ratio');
      }
    }
  };
  if (img.complete && (img.naturalWidth || img.videoWidth)) {
    fit();
    return;
  }
  img.addEventListener('load', fit, { once: true });
  if (typeof img.decode === 'function') {
    img.decode().then(fit).catch(function() {});
  }
};

try {
  window.autoPurgeStaleGearCache();
  window.autoPurgeLegacyClientCache();
} catch (purgeErr) {
  console.warn('[romantic-sync.js:autoPurge boot]', purgeErr);
}

function fillToastBody(el, msg, html) {
  if (!el) return;
  var text = msg == null ? '' : String(msg);
  if (typeof html === 'string' && html) {
    el.textContent = '';
    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0;line-height:0;';
    icon.innerHTML = html;
    el.appendChild(icon);
    var span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    return;
  }
  el.textContent = text;
}

function renderCenteredToast(msg, toastType, dur, html) {
  var existing = document.getElementById('okbmCenterToast');
  if (existing) {
    clearTimeout(existing._timer);
    existing.remove();
  }

  var borderColor = 'rgba(186, 230, 253, 0.45)';
  if (toastType === 'warn' || toastType === 'error') {
    borderColor = 'rgba(254, 205, 211, 0.55)';
  } else if (toastType === 'success') {
    borderColor = 'rgba(167, 243, 208, 0.5)';
  }

  var wrap = document.createElement('div');
  wrap.id = 'okbmCenterToast';
  wrap.style.cssText = 'position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; pointer-events:none; padding:28px; box-sizing:border-box;';

  var toast = document.createElement('div');
  toast.style.cssText = 'background:rgba(10, 14, 20, 0.96); border:1.5px solid ' + borderColor + '; color:#f1f5f9; font-size:0.88rem; font-weight:800; padding:14px 22px; border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,0.72); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); display:inline-flex; align-items:center; justify-content:center; gap:6px; text-align:center; word-break:keep-all; line-height:1.45; max-width:min(360px, calc(100vw - 48px)); opacity:0; transform:translateY(8px) scale(0.98);';
  fillToastBody(toast, msg, html);
  wrap.appendChild(toast);
  document.body.appendChild(wrap);

  requestAnimationFrame(function() {
    toast.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });

  wrap._timer = setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px) scale(0.98)';
    setTimeout(function() { if (wrap.parentNode) wrap.remove(); }, 240);
  }, dur || 2500);
}

// [공통 유틸] 안전한 토스트 메시지 출력 (매개변수 타입 자동 감지 보정 & 눈부심 제로 파스텔 규격)
function showToast(msg, typeOrDuration, maybeDuration, maybePosition) {
  var dur = 2500;
  var toastType = 'info';
  var position = 'default';
  var html = '';

  function applyToastOpts(opts) {
    if (!opts || typeof opts !== 'object') return;
    if (typeof opts.type === 'string') toastType = opts.type;
    if (typeof opts.duration === 'number') dur = opts.duration;
    if (opts.position === 'center') position = 'center';
    if (typeof opts.html === 'string' && opts.html) html = opts.html;
  }

  if (typeof typeOrDuration === 'number') {
    dur = typeOrDuration;
    applyToastOpts(maybeDuration);
    applyToastOpts(maybePosition);
  } else if (typeof typeOrDuration === 'string') {
    toastType = typeOrDuration;
    if (typeof maybeDuration === 'number') dur = maybeDuration;
    else if (maybeDuration === 'center') position = 'center';
    else applyToastOpts(maybeDuration);
    if (maybePosition === 'center') position = 'center';
    else applyToastOpts(maybePosition);
  } else if (typeOrDuration && typeof typeOrDuration === 'object') {
    applyToastOpts(typeOrDuration);
    if (typeof maybeDuration === 'number') dur = maybeDuration;
    else if (maybeDuration === 'center') position = 'center';
    else applyToastOpts(maybeDuration);
    if (maybePosition === 'center') position = 'center';
    else applyToastOpts(maybePosition);
  } else if (typeof maybeDuration === 'number') {
    dur = maybeDuration;
    applyToastOpts(maybePosition);
  } else {
    applyToastOpts(maybeDuration);
    applyToastOpts(maybePosition);
  }

  var writeModalOpen = document.getElementById('modalRichAfterTrip') || document.getElementById('pastTripRegisterModal');
  if (writeModalOpen) position = 'center';

  if (position === 'center') {
    renderCenteredToast(msg, toastType, dur, html);
    return;
  }

  var toastEl = document.getElementById('appToast');
  if (toastEl) {
    fillToastBody(toastEl, msg, html);
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(function() {
      toastEl.classList.remove('show');
    }, dur);
    return;
  }

  var container = document.getElementById('romanticToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'romanticToastContainer';
    container.style.cssText = 'position:fixed; bottom:calc(64px + env(safe-area-inset-bottom, 0px)); left:50%; transform:translateX(-50%); z-index:9999999; display:flex; flex-direction:column; align-items:center; gap:8px; pointer-events:none; width:90%; max-width:380px;';
    document.body.appendChild(container);
  }

  var borderColor = 'rgba(186, 230, 253, 0.35)'; // 기본 파스텔 스카이블루
  if (toastType === 'warn' || toastType === 'error') {
    borderColor = 'rgba(254, 205, 211, 0.4)'; // 파스텔 로즈
  } else if (toastType === 'success') {
    borderColor = 'rgba(167, 243, 208, 0.4)'; // 파스텔 에메랄드
  }

  var toast = document.createElement('div');
  toast.style.cssText = 'background:rgba(10, 14, 20, 0.96); border:1px solid ' + borderColor + '; color:#f1f5f9; font-size:0.75rem; font-weight:800; padding:9px 15px; border-radius:20px; box-shadow:0 8px 30px rgba(0,0,0,0.85); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:inline-flex; align-items:center; justify-content:center; gap:6px; text-align:center; pointer-events:auto; word-break:keep-all; line-height:1.35;';
  fillToastBody(toast, msg, html);
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(function() { toast.remove(); }, 260);
  }, dur);
}
window.showToast = showToast;

// [공통 유틸] 브라우저 표준 한국 시간 타임스탬프 생성기
function getFormattedNow() {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '. ' + pad(d.getMonth() + 1) + '. ' + pad(d.getDate()) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
window.getFormattedNow = getFormattedNow;

// 🛡️ [UGC 안전] 피드 신고 / 유저 차단 (Apple 1.2 · Google Play UGC)
window.OKBM_SOCIAL_PREFIX_RE = /^(kakao_|naver_|apple_|google_)/;

window.okbmHasSocialUserId = function(id) {
  return window.OKBM_SOCIAL_PREFIX_RE.test(String(id || '').trim());
};

window.okbmCanonicalUserId = function(id) {
  var s = String(id || '').trim();
  if (!s || s === 'guest' || s === 'null' || s === 'undefined') return '';
  if (window.okbmHasSocialUserId(s) || s.indexOf('user_') === 0 || s.indexOf('guest_') === 0) return s;
  return 'kakao_' + s;
};

window.okbmNormalizeEmail = function(email) {
  return String(email || '').trim().toLowerCase();
};

window.okbmSameAccountId = function(a, b) {
  var left = String(a || '').trim();
  var right = String(b || '').trim();
  if (!left || !right || left === 'guest' || right === 'guest') return false;
  if (left === right) return true;
  if (/^(naver_|apple_|google_)/.test(left) || /^(naver_|apple_|google_)/.test(right)) return false;
  var strip = function(v) {
    return String(v || '').replace(/^(kakao_|guest_|user_)/, '').trim();
  };
  var cleanL = strip(left);
  var cleanR = strip(right);
  return Boolean(cleanL && cleanR && cleanL === cleanR);
};

function okbmNormalizeUgcUserId(id) {
  return String(id || '').replace(/^kakao_/, '').trim();
}

function okbmGetIdList(key) {
  var list = safeGetJSON(key, []);
  if (!Array.isArray(list)) return [];
  var seen = {};
  var out = [];
  list.forEach(function(v) {
    var s = String(v || '').trim();
    if (!s || seen[s]) return;
    seen[s] = true;
    out.push(s);
  });
  return out;
}

function okbmSaveIdList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {
    console.warn('[romantic-sync.js:okbmSaveIdList]', e);
  }
}

function okbmEscapeUgcAttr(str) {
  return window.escapeHtml(str);
}

function okbmGetJwtOkbmUserId() {
  function plantedFromSession(session) {
    if (!session) return '';
    var user = session.user || null;
    var meta = (user && user.app_metadata) || {};
    return String(meta.okbm_user_id || '').trim();
  }
  var planted = '';
  try {
    var cache = window.__okbmSessionCache || {};
    planted = plantedFromSession(cache.session);
    if (!planted && cache.user && cache.user.app_metadata) {
      planted = String(cache.user.app_metadata.okbm_user_id || '').trim();
    }
  } catch (e) {}
  if (planted) return planted;
  try {
    planted = plantedFromSession(okbmReadPersistedSupabaseSession());
  } catch (e2) {}
  return planted;
}

function okbmGetCurrentUserId() {
  var myId = okbmGetJwtOkbmUserId();
  if (!myId) {
    var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
    myId = (profile && profile.id) ? String(profile.id).trim() : String(localStorage.getItem('okbm_user_id') || '').trim();
  }
  if (!myId || myId === 'guest' || myId === 'null' || myId === 'undefined') return '';
  return myId;
}
window.okbmGetCurrentUserId = okbmGetCurrentUserId;

function okbmRequireCurrentUserId() {
  var myId = okbmGetCurrentUserId();
  if (myId) return myId;
  if (typeof showToast === 'function') showToast('다시 로그인해 주세요.');
  if (typeof window.openLoginModal === 'function') {
    window.openLoginModal();
  } else if (typeof openLoginModal === 'function') {
    openLoginModal();
  }
  return '';
}
window.okbmRequireCurrentUserId = okbmRequireCurrentUserId;

function okbmReadPersistedSupabaseSession() {
  try {
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.indexOf('sb-') !== 0 || k.indexOf('auth-token') === -1) continue;
      var parsed = JSON.parse(localStorage.getItem(k) || 'null');
      if (!parsed || typeof parsed !== 'object') continue;
      var session = parsed.currentSession || parsed.session || parsed;
      if (session && session.access_token) return session;
    }
  } catch (e) {}
  return null;
}

window.okbmAccessToken = function() {
  try {
    var session = window.__okbmSessionCache && window.__okbmSessionCache.session;
    if (session && session.access_token) return session.access_token;
  } catch (e) {}
  var persisted = okbmReadPersistedSupabaseSession();
  if (persisted && persisted.access_token) {
    if (!window.__okbmSessionCache || !window.__okbmSessionCache.session) {
      okbmWriteSessionCache(persisted);
    }
    return persisted.access_token;
  }
  return '';
};

function okbmPromptLogin() {
  if (typeof showToast === 'function') showToast('다시 로그인해 주세요.');
  if (typeof window.openLoginModal === 'function') {
    window.openLoginModal();
  } else if (typeof openLoginModal === 'function') {
    openLoginModal();
  }
}

function okbmRequireAccessToken() {
  var tok = window.okbmAccessToken();
  if (tok) return tok;
  okbmPromptLogin();
  return '';
}
window.okbmRequireAccessToken = okbmRequireAccessToken;

function okbmUgcRestHeaders(extra) {
  return okbmPublicRestHeaders(extra);
}
window.okbmAuthHeaders = okbmUgcRestHeaders;

function okbmSessionExpired(session) {
  var exp = Number(session && session.expires_at);
  if (!exp) return false;
  return (exp * 1000) <= (Date.now() + 30000);
}

function okbmKickSessionRefresh() {
  if (window.__okbmSessionRefreshing) return;
  var client = window.supabaseClient;
  if (!client || !client.auth || typeof client.auth.getSession !== 'function') return;
  window.__okbmSessionRefreshing = true;
  client.auth.getSession().then(function(res) {
    var s = res && res.data ? res.data.session : null;
    if (s && s.access_token) okbmWriteSessionCache(s);
  }).catch(function() {}).finally(function() {
    window.__okbmSessionRefreshing = false;
  });
}

// 공개 조회용: 만료된 세션 토큰은 보내지 않는다(만료 JWT는 anon 대상 행까지 401).
function okbmFreshSessionToken() {
  var session = (window.__okbmSessionCache && window.__okbmSessionCache.session) || okbmReadPersistedSupabaseSession();
  if (!session || !session.access_token) return '';
  if (okbmSessionExpired(session)) {
    okbmKickSessionRefresh();
    return '';
  }
  return session.access_token;
}

function okbmPublicRestHeaders(extra) {
  var anon = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || '';
  var tok = anon;
  if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
    var sessionTok = okbmFreshSessionToken();
    if (sessionTok) tok = sessionTok;
  }
  var headers = {
    'apikey': anon,
    'Authorization': 'Bearer ' + tok,
    'Content-Type': 'application/json'
  };
  if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach(function(k) { headers[k] = extra[k]; });
  }
  return headers;
}
window.okbmPublicRestHeaders = okbmPublicRestHeaders;
window.okbmPublicBearer = function() {
  return okbmPublicRestHeaders().Authorization;
};

window.okbmPublicFetch = function(url, options) {
  options = options || {};
  var headers = okbmPublicRestHeaders(options.headers);
  var opts = Object.assign({}, options, { headers: headers });
  // 401/403은 실패로 그대로 반환. anon key로 재시도하지 않음 (비공개 행 우회 방지).
  return fetch(url, opts);
};

function okbmWriteRestHeaders(extra) {
  var tok = okbmRequireAccessToken();
  if (!tok) return null;
  var anon = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY || '';
  if (!anon) return null;
  var headers = {
    'apikey': anon,
    'Authorization': 'Bearer ' + tok,
    'Content-Type': 'application/json'
  };
  if (extra && typeof extra === 'object') {
    Object.keys(extra).forEach(function(k) { headers[k] = extra[k]; });
  }
  return headers;
}
window.okbmWriteHeaders = okbmWriteRestHeaders;

window.okbmInvokeFunction = async function(name, body) {
  var fnName = String(name || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  if (!fnName || !targetUrl) throw new Error('function url missing');
  var isPublicAuth = fnName === 'auth-kakao' || fnName === 'auth-naver';
  var headers = isPublicAuth ? okbmUgcRestHeaders() : okbmWriteRestHeaders();
  if (!headers) {
    var loginErr = new Error('login required');
    loginErr.status = 401;
    throw loginErr;
  }
  var res = await fetch(targetUrl + '/functions/v1/' + fnName, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body || {})
  });
  var json = null;
  var text = '';
  try { text = await res.text(); } catch (e) {}
  if (text) {
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  }
  if (!res.ok) {
    var err = new Error((json && (json.message || json.error)) || (fnName + ' ' + res.status));
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
};

window.okbmSetSupabaseSession = async function(accessToken, refreshToken) {
  if (!window.supabaseClient || !window.supabaseClient.auth || typeof window.supabaseClient.auth.setSession !== 'function') {
    throw new Error('supabase client missing');
  }
  var res = await window.supabaseClient.auth.setSession({
    access_token: String(accessToken || '').trim(),
    refresh_token: String(refreshToken || '').trim()
  });
  if (res && res.error) throw res.error;
  var session = res && res.data ? res.data.session : null;
  okbmWriteSessionCache(session);
  return session;
};

function okbmWriteBlockedUsersCache(ids, meta) {
  var seen = {};
  var clean = [];
  (Array.isArray(ids) ? ids : []).forEach(function(v) {
    var s = String(v || '').trim();
    if (!s || seen[s]) return;
    seen[s] = true;
    clean.push(s);
  });
  window.__okbmBlockedUsersCache = clean;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    window.__okbmBlockedUsersMetaCache = meta;
  }
  okbmSaveIdList('okbm_blocked_users', clean);
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    try { localStorage.setItem('okbm_blocked_users_meta', JSON.stringify(meta)); } catch (e) {
      console.warn('[romantic-sync.js:okbmWriteBlockedUsersCache meta]', e);
    }
  }
}

window.getBlockedUserIds = function() {
  if (Array.isArray(window.__okbmBlockedUsersCache)) return window.__okbmBlockedUsersCache.slice();
  return okbmGetIdList('okbm_blocked_users');
};

window.getReportedFeedIds = function() {
  return okbmGetIdList('okbm_reported_feeds');
};

window.getBlockedUsersMeta = function() {
  if (window.__okbmBlockedUsersMetaCache && typeof window.__okbmBlockedUsersMetaCache === 'object') {
    return window.__okbmBlockedUsersMetaCache;
  }
  var meta = safeGetJSON('okbm_blocked_users_meta', {});
  return (meta && typeof meta === 'object' && !Array.isArray(meta)) ? meta : {};
};

window.isUserBlocked = function(userId) {
  var target = String(userId || '').trim();
  if (!target) return false;
  var cleanTarget = okbmNormalizeUgcUserId(target);
  var list = window.getBlockedUserIds();
  for (var i = 0; i < list.length; i++) {
    var item = String(list[i] || '').trim();
    if (!item) continue;
    if (item === target) return true;
    var cleanItem = okbmNormalizeUgcUserId(item);
    if (cleanItem && cleanTarget && cleanItem === cleanTarget) return true;
  }
  return false;
};

window.isFeedReported = function(feedId) {
  var target = String(feedId || '').trim();
  if (!target) return false;
  return window.getReportedFeedIds().indexOf(target) !== -1;
};

function okbmIsInspectingBlockedUser(userId) {
  var allow = String(window.__okbmInspectBlockedUserId || '').trim();
  var target = String(userId || '').trim();
  if (!allow || !target) return false;
  if (allow === target) return true;
  var cleanAllow = okbmNormalizeUgcUserId(allow);
  var cleanTarget = okbmNormalizeUgcUserId(target);
  return Boolean(cleanAllow && cleanTarget && cleanAllow === cleanTarget);
}

window.isFeedHiddenByUgc = function(feed) {
  if (!feed) return true;
  var feedId = String(feed.id || '').trim();
  if (feedId && window.isFeedReported(feedId)) return true;
  var userId = String(feed.userId || feed.user_id || '').trim();
  if (userId && window.isUserBlocked(userId) && !okbmIsInspectingBlockedUser(userId)) return true;
  return false;
};

window.filterHiddenUgcFeeds = function(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function(item) {
    return item && !window.isFeedHiddenByUgc(item);
  });
};

function okbmRememberBlockedNickname(userId, nickname) {
  var id = String(userId || '').trim();
  var nick = String(nickname || '').trim();
  if (!id || !nick) return;
  var meta = window.getBlockedUsersMeta();
  meta[id] = nick;
  okbmWriteBlockedUsersCache(window.getBlockedUserIds(), meta);
}

window.resolveBlockedUserNickname = function(userId) {
  var id = String(userId || '').trim();
  if (!id) return '차단된 사용자';
  var meta = window.getBlockedUsersMeta();
  if (meta[id]) return String(meta[id]).trim();
  var pools = []
    .concat(Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : [])
    .concat(Array.isArray(window.interactiveHistory) ? window.interactiveHistory : [])
    .concat((typeof safeGetJSON === 'function' ? (safeGetJSON('okbm_cached_community_feeds', []) || []) : []));
  for (var i = 0; i < pools.length; i++) {
    var f = pools[i];
    if (!f) continue;
    var fUid = String(f.userId || f.user_id || '').trim();
    if (!fUid) continue;
    if (fUid === id || okbmNormalizeUgcUserId(fUid) === okbmNormalizeUgcUserId(id)) {
      var nick = String(f.author || f.nick || f.nickname || '').trim();
      if (nick) return nick;
    }
  }
  return id.indexOf('kakao_') === 0 ? '낭만루터' : id;
};

window.isCurrentUserId = function(userId) {
  var target = String(userId || '').trim();
  if (!target) return false;
  var myId = okbmGetCurrentUserId();
  if (!myId || myId === 'guest') return false;
  if (myId === target) return true;
  if (/^(naver_|apple_|google_)/.test(myId) || /^(naver_|apple_|google_)/.test(target)) return false;
  var cleanMy = okbmNormalizeUgcUserId(myId);
  var cleanTarget = okbmNormalizeUgcUserId(target);
  return Boolean(cleanMy && cleanTarget && cleanMy === cleanTarget);
};

window.closeOpenUgcFeedModals = function(options) {
  options = options || {};
  [
    'singleTripFeedModal',
    'mapSpotFeedDetailModal',
    'secretSpotHeroModal',
    'feedReportReasonModal',
    'ugcSafetyMenuSheet',
    'tripUserProfileModal'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
  if (typeof window.closeDirectMessageModals === 'function') {
    window.closeDirectMessageModals({ blockedUserId: options.blockedUserId });
  }
  var coll = document.getElementById('userFeedCollectionModal');
  if (coll && options.blockedUserId) {
    var collUid = String(coll.dataset.userId || '').trim();
    if (collUid && window.isUserBlocked(collUid)) {
      coll.remove();
    }
  }
};

window.rerenderCommunityFeedsNow = function() {
  if (typeof window.renderHistoryStage === 'function') {
    try { window.renderHistoryStage(); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow history]', e); }
  }
  if (document.getElementById('savedFeedsListModal') && typeof window.openSavedFeedsModal === 'function') {
    try { window.openSavedFeedsModal(true); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow saved]', e); }
  }
  if (document.getElementById('followedRoutersModal') && typeof window.openFollowedRoutersModal === 'function') {
    try { window.openFollowedRoutersModal(true); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow routers]', e); }
  }
  var coll = document.getElementById('userFeedCollectionModal');
  if (coll && typeof window.openUserFeedCollectionModal === 'function') {
    var collAuthor = coll.dataset.author || '';
    var collUid = coll.dataset.userId || '';
    if (collUid && window.isUserBlocked(collUid) && !okbmIsInspectingBlockedUser(collUid)) {
      coll.remove();
    } else {
      try { window.openUserFeedCollectionModal(collAuthor, collUid, 'route', true); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow collection]', e); }
    }
  }
  if (typeof window.refreshCurrentSpotPopup === 'function') {
    try { window.refreshCurrentSpotPopup(); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow map]', e); }
  }
  if (typeof renderSecretSpotTrailerRail === 'function') {
    try { renderSecretSpotTrailerRail(); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow rail]', e); }
  }
  if (typeof window.renderThemeSpotAllGrid === 'function' && document.getElementById('themeSpotAllGridContainer')) {
    try { window.renderThemeSpotAllGrid(window.currentThemeSpotAllTab || 'all'); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow theme]', e); }
  }
  if (typeof window.renderBlockedUsersSettingsList === 'function') {
    try { window.renderBlockedUsersSettingsList(); } catch (e) { console.warn('[romantic-sync.js:rerenderCommunityFeedsNow settings]', e); }
  }
};

window.syncMyUserBlocksFromServer = async function() {
  var blockerId = okbmGetCurrentUserId();
  if (!blockerId) return false;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;

  try {
    var res = await fetch(targetUrl + '/rest/v1/user_blocks?blocker_id=eq.' + encodeURIComponent(blockerId) + '&select=blocked_id,blocked_nickname', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) {
      console.warn('[romantic-sync.js:syncMyUserBlocksFromServer] status=' + res.status);
      return false;
    }
    var rows = await res.json();
    var serverIds = [];
    var serverMeta = {};
    (Array.isArray(rows) ? rows : []).forEach(function(r) {
      var id = String((r && r.blocked_id) || '').trim();
      if (!id) return;
      if (serverIds.indexOf(id) === -1) serverIds.push(id);
      if (r.blocked_nickname) serverMeta[id] = String(r.blocked_nickname).trim();
    });

    var prev = window.getBlockedUserIds().join('|');
    if (serverIds.length === 0) {
      okbmWriteBlockedUsersCache([], {});
      return prev !== '';
    }

    var mergedMeta = window.getBlockedUsersMeta();
    Object.keys(serverMeta).forEach(function(k) { mergedMeta[k] = serverMeta[k]; });
    okbmWriteBlockedUsersCache(serverIds, mergedMeta);
    return prev !== serverIds.join('|');
  } catch (e) {
    console.warn('[romantic-sync.js:syncMyUserBlocksFromServer]', e);
    return false;
  }
};

window.okbmSyncUgcSafetyFromServer = async function() {
  var blocksChanged = false;
  var reportsChanged = false;
  if (typeof window.syncMyUserBlocksFromServer === 'function') {
    try { blocksChanged = await window.syncMyUserBlocksFromServer(); } catch (e) {
      console.warn('[romantic-sync.js:okbmSyncUgcSafetyFromServer blocks]', e);
    }
  }
  if (typeof window.syncMyFeedReportsFromServer === 'function') {
    try { reportsChanged = await window.syncMyFeedReportsFromServer(); } catch (e) {
      console.warn('[romantic-sync.js:okbmSyncUgcSafetyFromServer reports]', e);
    }
  }
  return Boolean(blocksChanged || reportsChanged);
};

window.blockCommunityUser = async function(userId, nickname) {
  triggerHaptic(12);
  var targetId = String(userId || '').trim();
  if (!targetId) {
    if (typeof showToast === 'function') showToast('차단할 사용자를 확인할 수 없습니다.', 'warn');
    return false;
  }
  if (window.isCurrentUserId(targetId)) {
    if (typeof showToast === 'function') showToast('본인 계정은 차단할 수 없습니다.', 'warn');
    return false;
  }
  var blockerId = okbmGetCurrentUserId();
  if (!blockerId) {
    if (typeof showToast === 'function') showToast('차단은 로그인 후 이용할 수 있습니다.', 'info', 2000);
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return false;
  }
  if (!confirm('이 사용자를 차단하시겠습니까? 해당 사용자의 모든 피드가 더 이상 보이지 않습니다.')) {
    return false;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) {
    if (typeof showToast === 'function') showToast('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'error', 2200);
    return false;
  }

  var serverOk = false;
  try {
    var blockHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
    if (!blockHeaders) return false;
    var postRes = await fetch(targetUrl + '/rest/v1/user_blocks', {
      method: 'POST',
      headers: blockHeaders,
      body: JSON.stringify({
        blocker_id: blockerId,
        blocked_id: targetId,
        blocked_nickname: String(nickname || '').trim() || null
      })
    });
    if (postRes.ok || postRes.status === 409) {
      serverOk = true;
    } else {
      var errBody = '';
      try { errBody = await postRes.text(); } catch (readErr) {}
      console.error('[romantic-sync.js:blockCommunityUser] status=' + postRes.status, errBody);
    }
  } catch (e) {
    console.error('[romantic-sync.js:blockCommunityUser]', e);
  }

  if (!serverOk) {
    if (typeof showToast === 'function') showToast('차단에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.', 'error', 2600);
    return false;
  }

  await window.syncMyUserBlocksFromServer();
  okbmRememberBlockedNickname(targetId, nickname);
  window.closeOpenUgcFeedModals({ blockedUserId: targetId });
  window.rerenderCommunityFeedsNow();
  triggerHaptic(15);
  if (typeof showToast === 'function') showToast('사용자가 차단되었습니다.', 'success', 2200);
  return true;
};

window.unblockCommunityUser = async function(userId) {
  triggerHaptic(10);
  var targetId = String(userId || '').trim();
  if (!targetId) return false;
  if (!confirm('이 사용자의 차단을 해제할까요?')) return false;
  var blockerId = okbmGetCurrentUserId();
  if (!blockerId) {
    if (typeof showToast === 'function') showToast('차단 해제는 로그인 후 이용할 수 있습니다.', 'info', 2000);
    return false;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) {
    if (typeof showToast === 'function') showToast('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', 'error', 2200);
    return false;
  }

  var serverOk = false;
  try {
    var unblockHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
    if (!unblockHeaders) return false;
    var delRes = await fetch(
      targetUrl + '/rest/v1/user_blocks?blocker_id=eq.' + encodeURIComponent(blockerId) + '&blocked_id=eq.' + encodeURIComponent(targetId),
      {
        method: 'DELETE',
        headers: unblockHeaders
      }
    );
    if (delRes.ok) {
      serverOk = true;
    } else {
      var delBody = '';
      try { delBody = await delRes.text(); } catch (readErr) {}
      console.error('[romantic-sync.js:unblockCommunityUser] status=' + delRes.status, delBody);
    }
  } catch (e) {
    console.error('[romantic-sync.js:unblockCommunityUser]', e);
  }

  if (!serverOk) {
    if (typeof showToast === 'function') showToast('차단 해제에 실패했습니다. 다시 시도해주세요.', 'error', 2200);
    return false;
  }

  await window.syncMyUserBlocksFromServer();
  var meta = window.getBlockedUsersMeta();
  Object.keys(meta).forEach(function(key) {
    if (key === targetId || okbmNormalizeUgcUserId(key) === okbmNormalizeUgcUserId(targetId)) {
      delete meta[key];
    }
  });
  okbmWriteBlockedUsersCache(window.getBlockedUserIds(), meta);
  window.rerenderCommunityFeedsNow();
  if (typeof showToast === 'function') showToast('차단이 해제되었습니다.', 'success', 1800);
  return true;
};

window.openFeedReportModal = function(feedId, userId) {
  triggerHaptic(10);
  var sFeedId = String(feedId || '').trim();
  if (!sFeedId) return;
  if (window.isFeedReported(sFeedId)) {
    if (typeof showToast === 'function') showToast('이미 신고한 피드입니다.', 'info', 1800);
    return;
  }
  var old = document.getElementById('feedReportReasonModal');
  if (old) old.remove();

  var reasons = [
    { id: 'spam', label: '스팸/홍보' },
    { id: 'sexual', label: '음란/선정성' },
    { id: 'abuse', label: '욕설/비방' },
    { id: 'other', label: '기타' }
  ];

  var modal = document.createElement('div');
  modal.id = 'feedReportReasonModal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  var reasonBtns = reasons.map(function(r) {
    return '<button type="button" data-reason="' + okbmEscapeUgcAttr(r.id) + '" data-label="' + okbmEscapeUgcAttr(r.label) + '" data-feed-id="' + okbmEscapeUgcAttr(sFeedId) + '" data-user-id="' + okbmEscapeUgcAttr(userId) + '" onclick="window.submitFeedReport(this.dataset.feedId, this.dataset.reason, this.dataset.label, this.dataset.userId);" style="width:100%; height:42px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#e2e8f0; font-size:0.82rem; font-weight:800; cursor:pointer; text-align:left; padding:0 14px;">' + okbmEscapeUgcAttr(r.label) + '</button>';
  }).join('');

  modal.innerHTML = '<div style="width:100%; max-width:340px; background:#080b11; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:16px; box-sizing:border-box; display:flex; flex-direction:column; gap:10px;" onclick="event.stopPropagation();">' +
    '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<span style="font-size:0.90rem; font-weight:900; color:#ffffff;">피드 신고</span>' +
      '<button type="button" onclick="document.getElementById(\'feedReportReasonModal\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1rem; cursor:pointer;">✕</button>' +
    '</div>' +
    '<p style="font-size:0.72rem; color:#94a3b8; line-height:1.45; margin:0;">신고 사유를 선택해주세요. 접수된 내용은 24시간 이내에 검토됩니다.</p>' +
    '<div style="display:flex; flex-direction:column; gap:6px;">' + reasonBtns + '</div>' +
  '</div>';

  document.body.appendChild(modal);
};

window.syncMyFeedReportsFromServer = async function() {
  var reporterId = okbmGetCurrentUserId();
  if (!reporterId) return false;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;

  try {
    var res = await fetch(targetUrl + '/rest/v1/feed_reports?reporter_id=eq.' + encodeURIComponent(reporterId) + '&select=feed_id,status', {
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey)
      }
    });
    if (!res.ok) {
      console.warn('[romantic-sync.js:syncMyFeedReportsFromServer] status=' + res.status);
      return false;
    }
    var rows = await res.json();
    var serverIds = [];
    (Array.isArray(rows) ? rows : []).forEach(function(r) {
      var id = String((r && r.feed_id) || '').trim();
      var status = String((r && r.status) || 'pending').trim();
      if (!id || status === 'dismissed') return;
      if (serverIds.indexOf(id) === -1) serverIds.push(id);
    });
    var prev = window.getReportedFeedIds().join('|');
    okbmSaveIdList('okbm_reported_feeds', serverIds);
    return prev !== serverIds.join('|');
  } catch (e) {
    console.warn('[romantic-sync.js:syncMyFeedReportsFromServer]', e);
    return false;
  }
};

window.submitFeedReport = async function(feedId, reasonCode, reasonLabel, userId) {
  triggerHaptic(12);
  var sFeedId = String(feedId || '').trim();
  if (!sFeedId) return;

  var reasonModal = document.getElementById('feedReportReasonModal');
  if (reasonModal) reasonModal.remove();

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  var reporterId = okbmRequireCurrentUserId();
  if (!reporterId) return;
  var originUrl = window.location.origin;
  var pathName = window.location.pathname;
  var basePath = pathName.substring(0, pathName.lastIndexOf('/') + 1);
  var directFeedUrl = originUrl + basePath + 'index.html?feed=' + encodeURIComponent(sFeedId);
  var payload = {
    feed_id: sFeedId,
    reporter_id: reporterId || null,
    reported_user_id: String(userId || '').trim() || null,
    reason: String(reasonCode || 'other'),
    reason_label: String(reasonLabel || reasonCode || '기타'),
    feed_url: directFeedUrl,
    status: 'pending'
  };

  var serverOk = false;
  if (targetUrl && targetKey) {
    try {
      var reportHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
      if (!reportHeaders) return false;
      var postRes = await fetch(targetUrl + '/rest/v1/feed_reports', {
        method: 'POST',
        headers: reportHeaders,
        body: JSON.stringify(payload)
      });
      if (postRes.ok) {
        serverOk = true;
      } else if (postRes.status === 409 && reporterId) {
        var patchRes = await fetch(
          targetUrl + '/rest/v1/feed_reports?feed_id=eq.' + encodeURIComponent(sFeedId) + '&reporter_id=eq.' + encodeURIComponent(reporterId),
          {
            method: 'PATCH',
            headers: reportHeaders,
            body: JSON.stringify({
              reason: payload.reason,
              reason_label: payload.reason_label,
              feed_url: payload.feed_url,
              status: 'pending'
            })
          }
        );
        serverOk = patchRes.ok;
        if (!serverOk) {
          var patchBody = '';
          try { patchBody = await patchRes.text(); } catch (readErr) {}
          console.error('[romantic-sync.js:submitFeedReport] patch status=' + patchRes.status, patchBody);
        }
      } else {
        var errBody = '';
        try { errBody = await postRes.text(); } catch (readErr) {}
        console.error('[romantic-sync.js:submitFeedReport] status=' + postRes.status, errBody);
      }
    } catch (e) {
      console.error('[romantic-sync.js:submitFeedReport]', e);
    }
  }

  if (!serverOk) {
    if (typeof showToast === 'function') {
      showToast('신고 접수에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.', 'error', 2600);
    }
    return;
  }

  var list = window.getReportedFeedIds();
  if (list.indexOf(sFeedId) === -1) {
    list.push(sFeedId);
    okbmSaveIdList('okbm_reported_feeds', list);
  }

  window.closeOpenUgcFeedModals({});
  window.rerenderCommunityFeedsNow();
  if (typeof showToast === 'function') {
    showToast('신고가 접수되었습니다. 24시간 이내에 검토 및 조치됩니다.', 'success', 2800);
  }
};

window.okbmIsCurrentUserAdmin = function() {
  return window.__okbmIsAdmin === true;
};

function okbmPersistAdminFlag(isAdmin) {
  window.__okbmIsAdmin = !!isAdmin;
  // 폰 프로필에 isAdmin/role을 쓰지 않음. 권한은 메모리 플래그 + 서버 갱신만.
  try {
    window.dispatchEvent(new CustomEvent('okbm_admin_flag', { detail: { isAdmin: window.__okbmIsAdmin } }));
  } catch (e2) {}
  return window.__okbmIsAdmin === true;
}

window.okbmRefreshAdminFlagFromServer = async function() {
  var userId = okbmGetCurrentUserId();
  if (!userId) {
    return okbmPersistAdminFlag(false);
  }
  try {
    var row = await okbmFindUserById(userId);
    return okbmPersistAdminFlag(!!(row && row.is_admin === true));
  } catch (e) {
    return okbmPersistAdminFlag(false);
  }
};

window.okbmFetchFeedById = async function(feedId) {
  var sId = String(feedId || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!sId || !targetUrl || !targetKey) return null;
  try {
    var res = await (typeof window.okbmPublicFetch === 'function'
      ? window.okbmPublicFetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId) + '&select=*&limit=1')
      : fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId) + '&select=*&limit=1', {
          headers: { 'apikey': targetKey, 'Authorization': 'Bearer ' + targetKey, 'Content-Type': 'application/json' }
        }));
    if (!res.ok) return null;
    var rows = await res.json();
    var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) return null;
    if (typeof window.normalizeHistoryRecord === 'function') {
      return window.normalizeHistoryRecord(row, 0);
    }
    return row;
  } catch (e) {
    console.warn('[romantic-sync.js:okbmFetchFeedById]', e);
    return null;
  }
};

window.okbmOpenDirectFeed = async function(feedId, adminMode) {
  var sId = String(feedId || '').trim();
  if (!sId) return false;
  var rec = (typeof window.okbmFindFeedRecord === 'function') ? window.okbmFindFeedRecord(sId) : null;
  if (!rec) rec = await window.okbmFetchFeedById(sId);
  if (!rec) {
    if (typeof showToast === 'function') showToast('피드를 찾을 수 없습니다.', 'warn');
    return false;
  }
  if (typeof window.openSingleTripDualFeedModal === 'function') {
    window.openSingleTripDualFeedModal(sId, [rec], adminMode ? '__admin' : undefined);
    return true;
  }
  return false;
};

function okbmFormatReportTime(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  var hh = String(d.getHours()).padStart(2, '0');
  var mi = String(d.getMinutes()).padStart(2, '0');
  return mm + '.' + dd + ' ' + hh + ':' + mi;
}
window.okbmFormatReportTime = okbmFormatReportTime;

function okbmMountAdminReportInspectorEntry() {
  var old = document.getElementById('adminReportInspectorEntry');
  if (old) old.remove();
  if (!window.okbmIsCurrentUserAdmin()) return;
  var modal = document.getElementById('userAccountSettingsModal');
  if (!modal) return;
  var logoutBtn = modal.querySelector('button[onclick*="logoutUser"]');
  if (!logoutBtn || !logoutBtn.parentNode) return;
  var entry = document.createElement('button');
  entry.id = 'adminReportInspectorEntry';
  entry.type = 'button';
  entry.textContent = '신고 검수함';
  entry.style.cssText = 'background:none; border:none; color:#e2e8f0; font-size:0.78rem; font-weight:700; text-align:left; padding:8px 0 2px 0; cursor:pointer;';
  entry.onclick = function() { window.openAdminReportInspector(); };
  logoutBtn.parentNode.insertBefore(entry, logoutBtn);

  var oldSpot = document.getElementById('adminSpotInboxEntry');
  if (oldSpot) oldSpot.remove();
  var spotEntry = document.createElement('button');
  spotEntry.id = 'adminSpotInboxEntry';
  spotEntry.type = 'button';
  spotEntry.textContent = '장소 검수함';
  spotEntry.style.cssText = 'background:none; border:none; color:#e2e8f0; font-size:0.78rem; font-weight:700; text-align:left; padding:8px 0 2px 0; cursor:pointer;';
  spotEntry.onclick = function() {
    if (typeof window.openAdminSpotInbox === 'function') {
      window.openAdminSpotInbox();
      return;
    }
    window.location.assign('map.html?open=admin_inbox');
  };
  logoutBtn.parentNode.insertBefore(spotEntry, logoutBtn);
}

window.openAdminReportInspector = async function() {
  triggerHaptic(10);
  if (!(await window.okbmRefreshAdminFlagFromServer())) return;

  var old = document.getElementById('adminReportInspectorModal');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'adminReportInspectorModal';
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); z-index:2147483645 !important; background:#000000; display:flex; justify-content:center; align-items:stretch;';
  overlay.innerHTML = '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; background:#0c1017; display:flex; flex-direction:column; box-sizing:border-box;">' +
    '<div style="flex-shrink:0; display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); border-bottom:1px solid rgba(255,255,255,0.08);">' +
      '<button type="button" onclick="document.getElementById(\'adminReportInspectorModal\').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer;">◀</button>' +
      '<span style="font-size:0.95rem; font-weight:900; color:#ffffff;">신고 검수함</span>' +
      '<div style="width:30px;"></div>' +
    '</div>' +
    '<div id="adminReportInspectorList" style="flex:1; min-height:0; overflow-y:auto; padding:12px 16px 16px; color:#94a3b8; font-size:0.78rem;">불러오는 중</div>' +
  '</div>';
  document.body.appendChild(overlay);
  await window.okbmRenderAdminReportInspectorList();
};

window.okbmRenderAdminReportInspectorList = async function() {
  var listEl = document.getElementById('adminReportInspectorList');
  if (!listEl) return;
  if (!window.okbmIsCurrentUserAdmin()) {
    listEl.textContent = '';
    return;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) {
    listEl.textContent = '서버에 연결할 수 없습니다.';
    return;
  }

  try {
    var res = await fetch(targetUrl + '/rest/v1/feed_reports?status=eq.pending&select=id,feed_id,reason,reason_label,created_at,feed_url&order=created_at.desc', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) {
      listEl.textContent = '목록을 불러오지 못했습니다.';
      return;
    }
    var rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      listEl.innerHTML = '<div style="color:#64748b; font-size:0.74rem; padding:8px 0;">대기 중인 신고가 없습니다.</div>';
      return;
    }

    var feedIds = [];
    rows.forEach(function(r) {
      var id = String((r && r.feed_id) || '').trim();
      if (id && feedIds.indexOf(id) === -1) feedIds.push(id);
    });
    var spotMap = {};
    if (feedIds.length) {
      var inList = feedIds.map(function(id) { return '"' + String(id).replace(/"/g, '') + '"'; }).join(',');
      var feedRes = await fetch(targetUrl + '/rest/v1/feeds?id=in.(' + inList + ')&select=id,spot', {
        headers: okbmUgcRestHeaders()
      });
      if (feedRes.ok) {
        var feedRows = await feedRes.json();
        (Array.isArray(feedRows) ? feedRows : []).forEach(function(f) {
          if (f && f.id) spotMap[String(f.id)] = String(f.spot || '').trim();
        });
      }
    }

    var btn = 'height:32px; padding:0 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:8px; color:#e2e8f0; font-size:0.62rem; font-weight:800; cursor:pointer;';
    listEl.innerHTML = rows.map(function(r) {
      var rid = String((r && r.id) || '').trim();
      var fid = String((r && r.feed_id) || '').trim();
      var reason = String((r && (r.reason_label || r.reason)) || '').trim();
      var spot = spotMap[fid] || '';
      var title = spot || fid;
      var when = okbmFormatReportTime(r && r.created_at);
      return '<div style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="font-size:0.80rem; font-weight:800; color:#e2e8f0;">' + okbmEscapeUgcAttr(reason) + '</div>' +
        '<div style="font-size:0.68rem; color:#94a3b8; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + okbmEscapeUgcAttr(title) + '</div>' +
        (spot && fid ? '<div style="font-size:0.58rem; color:#64748b; margin-top:2px; font-family:var(--font-mono);">' + okbmEscapeUgcAttr(fid) + '</div>' : '') +
        (when ? '<div style="font-size:0.62rem; color:#64748b; margin-top:4px;">' + when + '</div>' : '') +
        '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-top:10px;">' +
          '<button type="button" data-feed-id="' + okbmEscapeUgcAttr(fid) + '" onclick="window.okbmAdminInspectOpenFeed(this.dataset.feedId);" style="' + btn + '">피드 열람</button>' +
          '<button type="button" data-feed-id="' + okbmEscapeUgcAttr(fid) + '" onclick="window.okbmAdminInspectDeleteFeed(this.dataset.feedId);" style="' + btn + '">게시글 즉시 삭제</button>' +
          '<button type="button" data-report-id="' + okbmEscapeUgcAttr(rid) + '" onclick="window.okbmAdminInspectDismissReport(this.dataset.reportId);" style="' + btn + '">신고 기각</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (e) {
    console.warn('[romantic-sync.js:okbmRenderAdminReportInspectorList]', e);
    listEl.textContent = '목록을 불러오지 못했습니다.';
  }
};

window.okbmAdminInspectOpenFeed = async function(feedId) {
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
  if (!window.okbmIsCurrentUserAdmin()) return;
  var sId = String(feedId || '').trim();
  if (!sId) return;

  var inspector = document.getElementById('adminReportInspectorModal');
  if (inspector) inspector.style.display = 'none';
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('adminReportInspectorModal', function() {
      var el = document.getElementById('adminReportInspectorModal');
      if (el) el.style.display = 'flex';
    });
  }

  var opened = false;
  if (typeof window.okbmOpenDirectFeed === 'function') {
    opened = await window.okbmOpenDirectFeed(sId, true);
  } else if (typeof window.openSingleTripDualFeedModal === 'function') {
    window.openSingleTripDualFeedModal(sId, null, '__admin');
    opened = !!document.getElementById('singleTripFeedModal');
  }

  if (!opened) {
    if (inspector) inspector.style.display = 'flex';
  }
};

window.okbmAdminInspectDeleteFeed = async function(feedId) {
  if (!(await window.okbmRefreshAdminFlagFromServer())) return;
  var sId = String(feedId || '').trim();
  if (!sId) return;
  if (!confirm('이 피드를 삭제할까요?')) return;

  var del = { ok: false };
  if (typeof window.deleteFeedFromCommunity === 'function') {
    del = await window.deleteFeedFromCommunity(sId);
  } else {
    var fallbackUrl = window.SUPABASE_URL || SUPABASE_URL;
    var fallbackKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
    if (!fallbackUrl || !fallbackKey) {
      if (typeof showToast === 'function') showToast('삭제에 실패했습니다.', 'error');
      return;
    }
    try {
      var delHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
      if (!delHeaders) return;
      var delRes = await fetch(fallbackUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId), {
        method: 'DELETE',
        headers: delHeaders
      });
      if (!delRes.ok) {
        del = { ok: false, status: delRes.status };
      } else {
        var deletedRows = [];
        try { deletedRows = await delRes.json(); } catch (parseErr) {}
        if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
          del = { ok: false, error: 'ZERO_ROWS_DELETED' };
        } else {
          del = { ok: true, data: deletedRows };
        }
      }
    } catch (delErr) {
      console.warn('[romantic-sync.js:okbmAdminInspectDeleteFeed fallback]', delErr);
      del = { ok: false, error: String(delErr) };
    }
  }
  if (!del.ok && del.error !== 'ZERO_ROWS_DELETED') {
    if (typeof showToast === 'function') showToast('삭제에 실패했습니다.', 'error');
    return;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (targetUrl && targetKey) {
    try {
      var resolveHeaders = okbmWriteRestHeaders({ Prefer: 'return=minimal' });
      if (!resolveHeaders) return;
      await fetch(targetUrl + '/rest/v1/feed_reports?feed_id=eq.' + encodeURIComponent(sId) + '&status=eq.pending', {
        method: 'PATCH',
        headers: resolveHeaders,
        body: JSON.stringify({ status: 'resolved' })
      });
    } catch (e) {
      console.warn('[romantic-sync.js:okbmAdminInspectDeleteFeed status]', e);
    }
  }

  if (Array.isArray(window.__allLoadedFeeds)) {
    window.__allLoadedFeeds = window.__allLoadedFeeds.filter(function(f) {
      return f && String(f.id || '').trim() !== sId;
    });
  }
  window.closeOpenUgcFeedModals({});
  if (typeof window.rerenderCommunityFeedsNow === 'function') window.rerenderCommunityFeedsNow();
  await window.okbmRenderAdminReportInspectorList();
  if (typeof showToast === 'function') showToast('삭제했습니다.', 'success', 1600);
};

window.okbmAdminInspectDismissReport = async function(reportId) {
  if (!(await window.okbmRefreshAdminFlagFromServer())) return;
  var sId = String(reportId || '').trim();
  if (!sId) return;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return;

  try {
    var dismissHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
    if (!dismissHeaders) return;
    var res = await fetch(targetUrl + '/rest/v1/feed_reports?id=eq.' + encodeURIComponent(sId), {
      method: 'PATCH',
      headers: dismissHeaders,
      body: JSON.stringify({ status: 'dismissed' })
    });
    if (!res.ok) {
      if (typeof showToast === 'function') showToast('기각에 실패했습니다.', 'error');
      return;
    }
  } catch (e) {
    console.warn('[romantic-sync.js:okbmAdminInspectDismissReport]', e);
    if (typeof showToast === 'function') showToast('기각에 실패했습니다.', 'error');
    return;
  }

  await window.okbmRenderAdminReportInspectorList();
  if (typeof window.syncMyFeedReportsFromServer === 'function') {
    try { await window.syncMyFeedReportsFromServer(); } catch (e) {}
  }
  if (typeof window.rerenderCommunityFeedsNow === 'function') window.rerenderCommunityFeedsNow();
};

window.buildUgcSafetyButtonsHtml = function(feedId, userId, nickname, layout) {
  var sFeedId = String(feedId || '').trim();
  var sUserId = String(userId || '').trim();
  var sNick = String(nickname || '').trim();
  if (sUserId && window.isCurrentUserId(sUserId)) return '';
  if (!sFeedId && !sUserId) return '';

  var compact = layout === 'compact';
  var btnBase = compact
    ? 'background:#0c1017; border:1px solid rgba(255,255,255,0.2); color:#ffffff; height:28px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0 9px;'
    : 'background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; height:32px; padding:0 9px; font-size:0.64rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px;';

  var reportBtn = sFeedId
    ? '<button type="button" data-feed-id="' + okbmEscapeUgcAttr(sFeedId) + '" data-user-id="' + okbmEscapeUgcAttr(sUserId) + '" onclick="event.preventDefault(); event.stopPropagation(); window.openFeedReportModal(this.dataset.feedId, this.dataset.userId);" style="' + btnBase + ' color:#fda4af;" title="신고">신고</button>'
    : '';
  var blockBtn = sUserId
    ? '<button type="button" data-user-id="' + okbmEscapeUgcAttr(sUserId) + '" data-author="' + okbmEscapeUgcAttr(sNick) + '" onclick="event.preventDefault(); event.stopPropagation(); window.blockCommunityUser(this.dataset.userId, this.dataset.author);" style="' + btnBase + ' color:#cbd5e1;" title="유저 차단">차단</button>'
    : '';

  if (!reportBtn && !blockBtn) return '';
  return '<div class="ugc-safety-actions" style="display:inline-flex; align-items:center; gap:6px; flex-shrink:0;">' + reportBtn + blockBtn + '</div>';
};

window.openUgcSafetyMenu = function(feedId, userId, nickname, e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (typeof triggerHaptic === 'function') triggerHaptic(10);

  var sFeedId = String(feedId || '').trim();
  var sUserId = String(userId || '').trim();
  var sNick = String(nickname || '').trim();
  if (sUserId && window.isCurrentUserId(sUserId)) return;
  if (!sFeedId && !sUserId) return;

  var old = document.getElementById('ugcSafetyMenuSheet');
  if (old) old.remove();

  var sheet = document.createElement('div');
  sheet.id = 'ugcSafetyMenuSheet';
  sheet.style.cssText = 'position:fixed; inset:0; z-index:2147483645 !important; background:rgba(0,0,0,0.78); display:flex; justify-content:center; align-items:flex-end; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);';
  sheet.onclick = function(ev) { if (ev.target === sheet) sheet.remove(); };

  var rowBtn = 'width:100%; height:46px; background:#111111; border:none; border-radius:10px; color:#e2e8f0; font-size:0.84rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:10px; padding:0 14px;';
  var reportRow = sFeedId
    ? '<button type="button" data-feed-id="' + okbmEscapeUgcAttr(sFeedId) + '" data-user-id="' + okbmEscapeUgcAttr(sUserId) + '" onclick="document.getElementById(\'ugcSafetyMenuSheet\') && document.getElementById(\'ugcSafetyMenuSheet\').remove(); window.openFeedReportModal(this.dataset.feedId, this.dataset.userId);" style="' + rowBtn + '">' +
        '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' +
        '<span>신고하기</span>' +
      '</button>'
    : '';
  var blockRow = sUserId
    ? '<button type="button" data-user-id="' + okbmEscapeUgcAttr(sUserId) + '" data-author="' + okbmEscapeUgcAttr(sNick) + '" onclick="document.getElementById(\'ugcSafetyMenuSheet\') && document.getElementById(\'ugcSafetyMenuSheet\').remove(); window.blockCommunityUser(this.dataset.userId, this.dataset.author);" style="' + rowBtn + '">' +
        '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h.5"/><path d="M16 16l5 5"/><path d="M21 16l-5 5"/></svg>' +
        '<span>이 사용자 차단</span>' +
      '</button>'
    : '';

  sheet.innerHTML = '<div style="width:100%; max-width:440px; background:#000000; border:none; border-radius:18px 18px 0 0; padding:16px 16px calc(72px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;" onclick="event.stopPropagation();">' +
    '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">' +
      '<span style="font-size:0.86rem; font-weight:900; color:#ffffff;">더보기</span>' +
      '<button type="button" onclick="document.getElementById(\'ugcSafetyMenuSheet\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>' +
    '</div>' +
    reportRow +
    blockRow +
    '<button type="button" onclick="document.getElementById(\'ugcSafetyMenuSheet\').remove();" style="width:100%; height:42px; background:#111111; border:none; border-radius:10px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer; margin-top:2px;">취소</button>' +
  '</div>';

  document.body.appendChild(sheet);
};

window.renderBlockedUsersSettingsList = function() {
  var ids = window.getBlockedUserIds();
  var countEl = document.getElementById('settingsBlockedUsersCount');
  if (countEl) countEl.innerText = ids.length ? (ids.length + '명') : '없음';

  var wrap = document.getElementById('blockedUsersModalList');
  if (!wrap) return;
  if (ids.length === 0) {
    wrap.innerHTML = '<div style="font-size:0.74rem; color:#64748b; padding:12px 0;">차단한 사용자가 없습니다.</div>';
    return;
  }

  wrap.innerHTML = ids.map(function(id) {
    var nick = window.resolveBlockedUserNickname(id);
    var safeNick = okbmEscapeUgcAttr(nick);
    var safeId = okbmEscapeUgcAttr(id);
    var maskedId = okbmEscapeUgcAttr(okbmMaskUserId(id));
    var photo = '';
    if (typeof window.resolveUserMasterPhoto === 'function') {
      photo = String(window.resolveUserMasterPhoto(id, nick, '') || '').trim();
    }
    var hasImg = Boolean(photo && photo.indexOf('http') === 0);
    var avatar = '<div style="width:40px; height:40px; border-radius:50%; background:#090d14; border:1px solid rgba(255,255,255,0.1); overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center;">' +
      '<img data-user-avatar-id="' + safeId + '" src="' + escapeHtml(okbmSafeImageUrl(hasImg ? photo : '')) + '" alt="" style="width:100%; height:100%; object-fit:cover; display:' + (hasImg ? 'block' : 'none') + ';" onerror="this.style.display=\'none\'; var p=this.parentElement && this.parentElement.querySelector(\'.avatar-placeholder-svg\'); if(p) p.style.display=\'block\';" />' +
      '<svg class="avatar-placeholder-svg" viewBox="0 0 24 24" style="width:18px; height:18px; display:' + (hasImg ? 'none' : 'block') + ';" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '</div>';
    return '<div style="display:flex; align-items:center; gap:10px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
      '<button type="button" data-user-id="' + safeId + '" onclick="window.openBlockedUserProfile(this.dataset.userId);" style="display:flex; align-items:center; gap:10px; min-width:0; flex:1; background:none; border:none; padding:0; margin:0; cursor:pointer; text-align:left; -webkit-tap-highlight-color:transparent;">' +
        avatar +
        '<div style="min-width:0; flex:1;">' +
          '<div style="font-size:0.82rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + safeNick + '</div>' +
          '<div style="font-size:0.62rem; color:#64748b; font-family:var(--font-mono); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + maskedId + '</div>' +
        '</div>' +
      '</button>' +
      '<button type="button" data-user-id="' + safeId + '" onclick="window.unblockCommunityUser(this.dataset.userId);" style="flex-shrink:0; height:30px; padding:0 10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#e2e8f0; font-size:0.66rem; font-weight:800; cursor:pointer;">차단 해제</button>' +
    '</div>';
  }).join('');
};

function okbmMaskUserId(id) {
  var s = String(id || '').trim();
  if (!s) return '';
  if (s.length <= 10) return s;
  return s.slice(0, 10) + '****';
}

function okbmCloseAccountLayerModals() {
  var blocked = document.getElementById('blockedUsersManageModal');
  if (blocked) blocked.remove();
  var admin = document.getElementById('adminReportInspectorModal');
  if (admin) admin.remove();
  var settings = document.getElementById('userAccountSettingsModal');
  if (settings) settings.style.display = 'none';
}

window.openBlockedUserProfile = function(userId) {
  var id = String(userId || '').trim();
  if (!id) return;
  if (typeof triggerHaptic === 'function') triggerHaptic(10);

  window.__okbmInspectBlockedUserId = id;
  var nick = (typeof window.resolveBlockedUserNickname === 'function')
    ? window.resolveBlockedUserNickname(id)
    : '';

  var blocked = document.getElementById('blockedUsersManageModal');
  if (blocked) {
    if (typeof window.recordModalHistoryStep === 'function') {
      window.recordModalHistoryStep('blockedUsersManageModal', function() {
        window.__okbmInspectBlockedUserId = '';
        var settings = document.getElementById('userAccountSettingsModal');
        if (settings) settings.style.display = 'flex';
        if (typeof window.openBlockedUsersModal === 'function') window.openBlockedUsersModal();
      });
    }
    blocked.remove();
  }

  var settings = document.getElementById('userAccountSettingsModal');
  if (settings) settings.style.display = 'none';

  if (typeof window.openUserFeedCollectionModal !== 'function') {
    if (typeof showToast === 'function') showToast('프로필을 열 수 없습니다.', 'error');
    return;
  }

  window.openUserFeedCollectionModal(nick, id, 'route');
  var coll = document.getElementById('userFeedCollectionModal');
  if (coll) {
    coll.dataset.fromBlocked = '1';
    coll.style.zIndex = '2147483645';
    coll.style.setProperty('z-index', '2147483645', 'important');
  }
};

window.openBlockedUsersModal = function() {
  triggerHaptic(10);
  var old = document.getElementById('blockedUsersManageModal');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'blockedUsersManageModal';
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); z-index:2147483644 !important; background:#000000; display:flex; justify-content:center; align-items:stretch;';
  overlay.innerHTML = '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; background:#0c1017; display:flex; flex-direction:column; box-sizing:border-box;">' +
    '<div style="flex-shrink:0; display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); border-bottom:1px solid rgba(255,255,255,0.08);">' +
      '<button type="button" onclick="document.getElementById(\'blockedUsersManageModal\').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer;">◀</button>' +
      '<span style="font-size:0.95rem; font-weight:900; color:#ffffff;">차단한 사용자</span>' +
      '<div style="width:30px;"></div>' +
    '</div>' +
    '<div id="blockedUsersModalList" style="flex:1; min-height:0; overflow-y:auto; padding:8px 16px 16px;"></div>' +
  '</div>';
  document.body.appendChild(overlay);

  if (typeof window.renderBlockedUsersSettingsList === 'function') {
    window.renderBlockedUsersSettingsList();
  }
  if (typeof window.okbmSyncUgcSafetyFromServer === 'function') {
    window.okbmSyncUgcSafetyFromServer().then(function() {
      if (typeof window.renderBlockedUsersSettingsList === 'function') window.renderBlockedUsersSettingsList();
    }).catch(function() {});
  }
};

// UtilitiesFormattedNow removed

window.executeCleanSlateMasterReset = async function() {
  if (!confirm('주의: 모든 활동 기록이 영구 삭제됩니다.\n정말 초기화하시겠습니까?')) {
    return;
  }

  var userId = okbmRequireCurrentUserId();
  if (!userId) return;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) {
    if (typeof showToast === 'function') {
      showToast('서버에 연결할 수 없어 초기화하지 못했습니다.', 'error', 2600);
    }
    return;
  }

  var deletedOk = false;
  try {
    var writeHeaders = (typeof window.okbmWriteHeaders === 'function')
      ? window.okbmWriteHeaders({ Prefer: 'return=representation' })
      : null;
    if (!writeHeaders) {
      if (typeof showToast === 'function') {
        showToast('다시 로그인한 뒤 초기화해 주세요.', 'error', 2600);
      }
      return;
    }
    var resetRes = await fetch(targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(userId), {
      method: 'DELETE',
      headers: writeHeaders
    });
    if (!resetRes.ok) {
      console.error('[executeCleanSlateMasterReset] 서버 일괄 삭제 실패 status=' + resetRes.status);
      if (typeof showToast === 'function') {
        showToast('서버 삭제에 실패했습니다. 기록을 유지합니다.', 'error', 2800);
      }
      return;
    }
    var deletedRows = [];
    try { deletedRows = await resetRes.json(); } catch (e) { deletedRows = []; }
    // 0건이어도 사용자 피드가 원래 없었으면 성공으로 본다.
    deletedOk = true;
    void deletedRows;
  } catch (resetErr) {
    console.error('[executeCleanSlateMasterReset] 서버 일괄 삭제 네트워크 예외:', resetErr);
    if (typeof showToast === 'function') {
      showToast('네트워크 오류로 초기화하지 못했습니다.', 'error', 2600);
    }
    return;
  }

  if (!deletedOk) return;

  window.__memoryStore = window.__memoryStore || {};
  window.__memoryStore['okbm_packing_history'] = [];
  window.packingHistoryList = [];
  window.interactiveHistory = [];
  window.heroTopRecords = [];
  window.__allLoadedFeeds = [];

  localStorage.removeItem('okbm_packing_history');
  localStorage.removeItem('okbm_cached_community_feeds');
  localStorage.removeItem('okbm_hero_cover_url');
  localStorage.removeItem('okbm_card_likes_count');

  if (isUserLoggedIn()) {
    syncUserDataToCloud(true, true);
  }

  triggerHaptic(20);
  showToast('모든 기록이 초기화되었습니다.', 1500);

  setTimeout(function() {
    var url = new URL(window.location.href);
    url.searchParams.delete('clean_slate');
    window.location.href = url.pathname + (url.search ? url.search : '');
  }, 300);
};

async function loadUserDataFromCloud(userId) {
  if (!userId) return { status: 'error', data: null, reason: 'no_user' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'error', data: null, reason: 'offline' };
  }
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return { status: 'error', data: null, reason: 'no_config' };

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
    var queryColumns = 'id,nickname,bio,hero_cover_url,photo_url,bookmarks,visited,memos,saved_feeds,following,my_gears,created_at,last_nickname_changed_at,is_admin';
    var res = await fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(String(userId).trim()) + '&select=' + queryColumns, {
      method: 'GET',
      headers: okbmUgcRestHeaders(),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { status: 'error', data: null, reason: 'http_' + res.status };
    }
    var rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      var row = rows[0];
      var data = row.user_data || row.data || row;
      if (typeof okbmRepairKnownOwnerProfile === 'function') {
        data = okbmRepairKnownOwnerProfile(userId, data);
      }
      if (typeof okbmPersistAdminFlag === 'function') {
        okbmPersistAdminFlag(data && data.is_admin === true);
      } else {
        window.__okbmIsAdmin = data && data.is_admin === true;
      }
      return { status: 'ok', data: data };
    }
    return { status: 'empty', data: null };
  } catch (e) {
    console.warn('[romantic-sync.js:loadUserDataFromCloud]', e);
    return { status: 'error', data: null, reason: (e && e.name) || 'fetch_failed' };
  }
}

// 2. 로그인 상태 검증 및 세션 체크
function isUserLoggedIn() {
  var cache = window.__okbmSessionCache || {};
  var sessionUser = cache.session && cache.session.user;
  if (sessionUser && sessionUser.id) {
    if (typeof authState !== 'undefined') {
      authState.isLoggedIn = true;
      authState.userProfile = safeGetJSON('user_profile', null);
    }
    return true;
  }

  // user_auth_token 평문 의존 제거. supabase 세션이 없으면 비로그인.
  var profile = safeGetJSON('user_profile', null);
  if (!profile || !profile.id) {
    if (typeof authState !== 'undefined') {
      authState.isLoggedIn = false;
      authState.userProfile = null;
    }
    return false;
  }

  var persisted = null;
  try { persisted = okbmReadPersistedSupabaseSession(); } catch (e) {}
  var hasSession = !!(persisted && persisted.access_token && persisted.user);
  if (!hasSession) {
    if (typeof authState !== 'undefined') {
      authState.isLoggedIn = false;
      authState.userProfile = null;
    }
    return false;
  }

  var idStr = String(profile.id).trim();
  var hasValid = (typeof window.okbmHasSocialUserId === 'function') ? window.okbmHasSocialUserId(idStr) : !!idStr;
  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = hasValid;
    authState.userProfile = hasValid ? profile : null;
  }
  return hasValid;
}
window.isUserLoggedIn = isUserLoggedIn;

function okbmSeoulDateKey() {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (e) {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 10);
  }
}

function okbmGetVisitorId() {
  if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
    var uid = okbmGetCurrentUserId();
    if (uid) {
      return (typeof window.okbmCanonicalUserId === 'function') ? window.okbmCanonicalUserId(uid) : uid;
    }
  }
  var guestId = String(localStorage.getItem('okbm_visitor_id') || '').trim();
  if (!guestId) {
    guestId = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('okbm_visitor_id', guestId);
  }
  return guestId;
}

function trackDailyVisit(force) {
  var visitorId = okbmGetVisitorId();
  if (!visitorId) return;

  var todayDateStr = okbmSeoulDateKey();
  var isMember = typeof isUserLoggedIn === 'function' && isUserLoggedIn();
  var sessionKey = 'okbm_visit_recorded_' + todayDateStr + '_' + visitorId;
  if (!force && sessionStorage.getItem(sessionKey)) return;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return;

  sessionStorage.setItem(sessionKey, 'pending');
  fetch(targetUrl + '/rest/v1/rpc/track_visit', {
    method: 'POST',
    headers: (typeof window.okbmPublicRestHeaders === 'function')
      ? window.okbmPublicRestHeaders()
      : {
      'apikey': targetKey,
      'Authorization': 'Bearer ' + targetKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_visitor_id: visitorId,
      p_is_member: Boolean(isMember)
    })
  }).then(function(res) {
    if (res.ok) sessionStorage.setItem(sessionKey, 'true');
    else sessionStorage.removeItem(sessionKey);
  }).catch(function() {
    sessionStorage.removeItem(sessionKey);
  });
}
window.trackDailyVisit = trackDailyVisit;

window.okbmNormalizeDateKey = function(dateStr) {
  if (!dateStr) return '';
  var s = String(dateStr).trim();
  var match = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    var y = match[1];
    var m = String(match[2]).padStart(2, '0');
    var d = String(match[3]).padStart(2, '0');
    return y + '.' + m + '.' + d;
  }
  return s;
};

window.okbmUnescapePlanText = function(text) {
  var s = String(text == null ? '' : text);
  if (s.indexOf('&') === -1) return s;
  var prev = '';
  var n = 0;
  while (s !== prev && n < 3) {
    prev = s;
    s = s.replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&');
    n += 1;
  }
  return s;
};

window.okbmIsXssProbeSpotName = function(name) {
  var s = window.okbmUnescapePlanText(name);
  return /alert\s*\(|javascript\s*:|onerror\s*=|<\s*script|payload\s*'?\s*\)|XSS\s*'?\s*\)/i.test(s);
};

window.okbmSanitizePlanSpotsMap = function(raw) {
  var src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  var out = {};
  var changed = false;
  Object.keys(src).forEach(function(dateKey) {
    var rawVal = src[dateKey];
    var arr = Array.isArray(rawVal) ? rawVal : (rawVal && rawVal.name ? [rawVal] : []);
    var kept = [];
    arr.forEach(function(item) {
      if (!item || typeof item !== 'object') {
        changed = true;
        return;
      }
      var name = window.okbmUnescapePlanText(item.name || '');
      var elev = window.okbmUnescapePlanText(item.elevation || '');
      if (!name.trim() || window.okbmIsXssProbeSpotName(name)) {
        changed = true;
        return;
      }
      if (window.okbmIsXssProbeSpotName(elev)) {
        elev = '';
        changed = true;
      }
      if (name !== item.name || elev !== (item.elevation || '')) changed = true;
      var copy = {};
      Object.keys(item).forEach(function(k) { copy[k] = item[k]; });
      copy.name = name;
      copy.elevation = elev;
      kept.push(copy);
    });
    if (kept.length) out[dateKey] = kept;
    else if (arr.length) changed = true;
  });
  if (Object.keys(src).length !== Object.keys(out).length) changed = true;
  return { spots: out, changed: changed };
};

window.RomanticVault = window.RomanticVault || {
  isHydrated: false,
  isHydrating: false,
  _syncTimer: null,

  read: function(key, defaultVal) {
    if (window.__memoryStore && window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
      return window.__memoryStore[key];
    }
    var val = safeGetJSON(key, defaultVal);
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore[key] = val;
    return val;
  },

  write: function(key, val, shouldSyncCloud) {
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore[key] = val;

    if (this.isHydrating && !this._applyingServerHydration && (
      key === 'okbm_selected_gears_multi' ||
      key === 'okbm_custom_gears' ||
      key === 'okbm_favorite_gears' ||
      key === 'okbm_gear_presets' ||
      key === 'okbm_gear_meta'
    )) {
      this._localGearsModifiedDuringHydration = true;
    }

    if (typeof window.okbmSafeSetItem === 'function') {
      window.okbmSafeSetItem(key, JSON.stringify(val));
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) { console.warn('[romantic-sync.js:RomanticVault.write]', e); }
    }

    if (shouldSyncCloud && typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(key === 'okbm_packing_history');
    }
  },

  // [찜 토글 일원화 API - 새로고침 0% 즉시 반영]
  toggleBookmark: function(spotId) {
    var sId = String(spotId).trim();
    if (!sId) return false;
    var list = this.read('okbm_bookmarks', []);
    var bSet = new Set(list.map(function(s) { return String(s).trim(); }));
    var isNowBookmarked = false;

    if (bSet.has(sId)) {
      bSet.delete(sId);
      isNowBookmarked = false;
    } else {
      bSet.add(sId);
      isNowBookmarked = true;
    }

    var resultList = Array.from(bSet);
    this.write('okbm_bookmarks', resultList, true);
    if (window.userBookmarks) window.userBookmarks = bSet;

    try {
      if (typeof window.renderPlanBookmarks === 'function') window.renderPlanBookmarks();
      if (typeof window.renderBookmarksTab === 'function') window.renderBookmarksTab();
      if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
      if (typeof window.renderSpots === 'function') window.renderSpots();
      if (typeof window.refreshCurrentSpotPopup === 'function') window.refreshCurrentSpotPopup();
      window.dispatchEvent(new CustomEvent('okbm_bookmark_changed', { detail: { spotId: sId, isBookmarked: isNowBookmarked, bookmarks: resultList } }));
    } catch(err) {}

    return isNowBookmarked;
  },

  // [클리어 토글 일원화 API - 새로고침 0% 즉시 반영]
  toggleVisited: function(spotId) {
    var sId = String(spotId).trim();
    if (!sId) return false;
    var vList = this.read('okbm_visited', []);
    var vSet = new Set(vList.map(function(s) { return String(s).trim(); }));
    var isNowVisited = false;

    if (vSet.has(sId)) {
      vSet.delete(sId);
      isNowVisited = false;
    } else {
      vSet.add(sId);
      isNowVisited = true;
    }

    var resultVisited = Array.from(vSet);
    this.write('okbm_visited', resultVisited, true);
    if (window.userVisited) window.userVisited = vSet;

    try {
      if (typeof window.renderPlanBookmarks === 'function') window.renderPlanBookmarks();
      if (typeof window.renderBookmarksTab === 'function') window.renderBookmarksTab();
      if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
      if (typeof window.renderSpots === 'function') window.renderSpots();
      if (typeof window.refreshCurrentSpotPopup === 'function') window.refreshCurrentSpotPopup();
      window.dispatchEvent(new CustomEvent('okbm_visited_changed', { detail: { spotId: sId, isVisited: isNowVisited, visited: resultVisited } }));
    } catch(err) {}

    return isNowVisited;
  },

  // [비밀 메모 저장 일원화 API]
  saveMemo: function(spotId, memoText) {
    var sId = String(spotId).trim();
    if (!sId) return;
    var memos = this.read('okbm_memos', {});
    memos[sId] = String(memoText || '').trim();
    this.write('okbm_memos', memos, true);
    if (window.userMemos) window.userMemos = memos;
  },

  hydrateProtectedStoreCollections: async function(userId) {
    return null;
  },

  hydrateFromServer: async function(userId) {
    if (window.__okbmAccountPurging) return null;
    if (!userId || this.isHydrating) return null;
    this.isHydrating = true;
    this.lastHydrateStatus = 'pending';
    this._localGearsModifiedDuringHydration = false;
    var hydrationStartTime = Date.now();
    try {
      var currentSessionId = String(userId).trim();
      var storedUserId = localStorage.getItem('okbm_user_id') || '';

      if (storedUserId && storedUserId !== currentSessionId) {
        window.__memoryStore = {};
        window.packingHistoryList = [];
        window.interactiveHistory = [];
      }

      var fetched = await loadUserDataFromCloud(userId);
      var fetchStatus = (fetched && fetched.status) ? fetched.status : 'error';
      this.lastHydrateStatus = fetchStatus;

      if (fetchStatus === 'error') {
        this.isHydrated = false;
        return null;
      }

      if (fetchStatus === 'empty' || !fetched.data) {
        this.isHydrated = true;
        return null;
      }

      var cloudData = fetched.data;
        var serverBookmarks = (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) ? cloudData.bookmarks : [];
        var cleanBookmarks = serverBookmarks.map(function(s) { return String(s).trim(); }).filter(Boolean);
        this.write('okbm_bookmarks', cleanBookmarks, false);
        window.userBookmarks = new Set(cleanBookmarks);

        var serverVisited = (cloudData.visited && Array.isArray(cloudData.visited)) ? cloudData.visited : [];
        var cleanVisited = serverVisited.map(function(s) { return String(s).trim(); }).filter(Boolean);
        this.write('okbm_visited', cleanVisited, false);
        window.userVisited = new Set(cleanVisited);

        var serverMemos = (cloudData.memos && typeof cloudData.memos === 'object') ? cloudData.memos : {};
        this.write('okbm_memos', serverMemos, false);
        window.userMemos = serverMemos;

        // [제1조 SSOT] 서버 데이터가 단방향으로 로컬을 덮어씁니다.
        // 로컬 배열과 비교 후 로컬→서버 역전송(Merge)하던 양방향 루프를 완전 제거합니다.
        if (cloudData.saved_feeds !== undefined && Array.isArray(cloudData.saved_feeds)) {
          var cleanSavedFeeds = cloudData.saved_feeds.map(function(s) { return String(s).trim(); }).filter(Boolean);
          this.write('okbm_saved_feeds', cleanSavedFeeds, false);
        }

        var rawFollowing = cloudData.following || cloudData.following_users;
        if (rawFollowing !== undefined && Array.isArray(rawFollowing)) {
          var cleanFollowing = rawFollowing.map(function(s) { return String(s).trim(); }).filter(Boolean);
          this.write('okbm_following_users', cleanFollowing, false);
        }

        // [헌법 제1조: SSOT 원칙] 글/피드의 절대 진실 공급원은 feeds 테이블 하나뿐입니다.
        // users 테이블의 pack_history는 예전 백업용 잔재이며, 여기서 이를 읽어
        // window.interactiveHistory/packingHistoryList를 덮어쓰면 feeds 테이블에서
        // 이미 삭제된 글이 이 낡은 백업에서 되살아나 로컬을 오염시킵니다.
        // 활동 히스토리 복원은 feeds 테이블을 조회하는 fetchCommunityFeeds에
        // 전적으로 위임하고, 여기서는 더 이상 pack_history를 로컬에 반영하지 않습니다.

        var rawMyGears = cloudData.my_gears || cloudData.myGears;
        if (rawMyGears && typeof rawMyGears === 'object') {
          var mg = rawMyGears;
          var skipServerGears = !!this._localGearsModifiedDuringHydration;
          if (!skipServerGears) {
            this._applyingServerHydration = true;
            try {
              if (mg.selectedGears || mg.selected_gears) {
                var serverSelected = mg.selectedGears || mg.selected_gears;
                this.write('okbm_selected_gears_multi', serverSelected, false);
                window.selectedGearMap = serverSelected && typeof serverSelected === 'object' ? serverSelected : {};
              }
              var serverFav = mg.favoriteGears || mg.favorite_gears;
              if (Array.isArray(serverFav)) {
                this.write('okbm_favorite_gears', serverFav, false);
                window.favoriteGearSet = new Set(serverFav);
              }
              var serverCustom = mg.customGears || mg.custom_gears;
              if (Array.isArray(serverCustom)) {
                this.write('okbm_custom_gears', serverCustom, false);
              }
              var serverPresets = mg.gearPresets || mg.gear_presets;
              if (Array.isArray(serverPresets)) {
                this.write('okbm_gear_presets', serverPresets, false);
              }
              var serverGearMeta = mg.gearMeta || mg.gear_meta;
              if (serverGearMeta && typeof serverGearMeta === 'object') {
                this.write('okbm_gear_meta', serverGearMeta, false);
              }
            } finally {
              this._applyingServerHydration = false;
            }
          }

          var serverPlanMemos = mg.planMemos || mg.plan_memos;
          if (serverPlanMemos && typeof serverPlanMemos === 'object') {
            this.write('okbm_plan_memos', serverPlanMemos, false);
          }

          var serverPlanSpots = mg.planSpots || mg.plan_spots;
          if (serverPlanSpots && typeof serverPlanSpots === 'object') {
            var sanitizedSpots = (typeof window.okbmSanitizePlanSpotsMap === 'function')
              ? window.okbmSanitizePlanSpotsMap(serverPlanSpots)
              : { spots: serverPlanSpots, changed: false };
            this.write('okbm_plan_spots', sanitizedSpots.spots, sanitizedSpots.changed);
          }

          var serverSns = mg.sns || {};
          var instaVal = String(cloudData.instagram || serverSns.instagram || '').trim();
          var ytVal = String(cloudData.youtube || serverSns.youtube || '').trim();
          var blogVal = String(cloudData.blog || serverSns.blog || '').trim();

          if (instaVal) localStorage.setItem('okbm_user_instagram', instaVal);

          if (ytVal) localStorage.setItem('okbm_user_youtube', ytVal);

          if (blogVal) localStorage.setItem('okbm_user_blog', blogVal);

          var curSnsProf = safeGetJSON('user_profile_' + userId, null) || safeGetJSON('user_profile', null);
          if (curSnsProf) {
            curSnsProf.instagram = instaVal;
            curSnsProf.youtube = ytVal;
            curSnsProf.blog = blogVal;
            localStorage.setItem('user_profile', JSON.stringify(curSnsProf));
            if (curSnsProf.id) localStorage.setItem('user_profile_' + curSnsProf.id, JSON.stringify(curSnsProf));
          }
        }

        var curP = safeGetJSON('user_profile_' + userId, null) || safeGetJSON('user_profile', null);
        if (curP) {
          if (cloudData.nickname && cloudData.nickname !== '낭만백패커') {
            curP.nickname = cloudData.nickname;
            localStorage.setItem('okbm_user_nick', cloudData.nickname);
            if (curP.id) localStorage.setItem('okbm_custom_nickname_' + curP.id, cloudData.nickname);
          }
          if (cloudData.last_nickname_changed_at) {
            curP.lastNicknameChangedAt = Number(cloudData.last_nickname_changed_at);
          }
          if (cloudData.created_at) {
            var sCreated = String(cloudData.created_at).trim();
            var cMatch = sCreated.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (cMatch) {
              var normCreated = cMatch[1] + '.' + String(cMatch[2]).padStart(2, '0') + '.' + String(cMatch[3]).padStart(2, '0');
              curP.createdAt = normCreated;
              var jEl = document.getElementById('settingsModalJoinDate');
              if (jEl) jEl.innerText = normCreated;
            }
          }
          localStorage.setItem('user_profile', JSON.stringify(curP));
          if (curP.id) localStorage.setItem('user_profile_' + curP.id, JSON.stringify(curP));
        }

        var mainPhotoUrl = cloudData.hero_cover_url || cloudData.photo_url || cloudData.heroCoverUrl || cloudData.photoUrl;
        if (mainPhotoUrl && mainPhotoUrl.startsWith('https://')) {
          localStorage.setItem('okbm_hero_cover_url', mainPhotoUrl);
          var curProf = safeGetJSON('user_profile', null);
          if (curProf) {
            curProf.heroCoverUrl = mainPhotoUrl;
            curProf.photoUrl = mainPhotoUrl;
            localStorage.setItem('user_profile', JSON.stringify(curProf));
          }
          if (typeof window.applyMasterCoverPhotoToAllUI === 'function') {
            window.applyMasterCoverPhotoToAllUI(mainPhotoUrl);
          }
        }

        var userBio = cloudData.bio || cloudData.description || '';
        if (userBio) {
          localStorage.setItem('okbm_user_bio', userBio);
          var profBio = safeGetJSON('user_profile', null);
          if (profBio) {
            profBio.bio = userBio;
            localStorage.setItem('user_profile', JSON.stringify(profBio));
          }
        }

        var serverProps = cloudData.my_proposals || cloudData.myProposals;
        if (serverProps && Array.isArray(serverProps)) {
          this.write('okbm_my_proposals', serverProps, false);
          try { localStorage.setItem('okbm_my_proposals', JSON.stringify(serverProps)); } catch(e) { console.warn('[romantic-sync.js:RomanticVault.hydrate proposals]', e); }
        }

        this.isHydrated = true;

        if (typeof window.fetchUserFeedLikesFromServer === 'function') {
          window.fetchUserFeedLikesFromServer().catch(function() {});
        }

        try {
          if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
          if (typeof window.renderPlanBookmarks === 'function') window.renderPlanBookmarks();
          if (typeof window.renderSpots === 'function') window.renderSpots();
          if (typeof window.refreshCurrentSpotPopup === 'function') window.refreshCurrentSpotPopup();
          window.dispatchEvent(new CustomEvent('okbm_bookmark_changed', { detail: { bookmarks: cleanBookmarks } }));
          window.dispatchEvent(new CustomEvent('okbm_visited_changed', { detail: { visited: cleanVisited } }));
        } catch(renderErr) { console.warn('[romantic-sync.js:RomanticVault.hydrate render]', renderErr); }
      this.lastHydrateStatus = 'ok';
      return cloudData;
    } catch(e) {
      console.warn('[romantic-sync.js:RomanticVault.hydrateFromServer]', e);
      this.lastHydrateStatus = 'error';
      this.isHydrated = false;
      return null;
    } finally {
      this.isHydrating = false;
      if (this._pendingCloudSync) {
        // 서버 스냅샷을 받은 직후 폰 메모를 다시 올리면 서버가 되돌아간다. 대기분 폐기.
        this._pendingCloudSync = false;
      }
    }
  }
};

window.okbmStopNotifPoll = function() {
  if (window.__okbmNotifPollTimer) {
    clearInterval(window.__okbmNotifPollTimer);
    window.__okbmNotifPollTimer = null;
  }
};

window.okbmStartNotifPoll = function() {
  if (window.__okbmNotifPollTimer) return;
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) return;
  if (document.visibilityState && document.visibilityState !== 'visible') return;
  if (typeof window.pollUserNotifications !== 'function') return;
  window.__okbmNotifPollTimer = setInterval(function() {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
      window.pollUserNotifications(true).catch(function() {});
    }
  }, 60000);
};

window.okbmCleanupModalWatchers = function() {
  window.okbmStopNotifPoll();
  if (typeof window.okbmReleaseReelFeedObserver === 'function') {
    window.okbmReleaseReelFeedObserver();
  } else {
    if (window.__reelWindowObserver) {
      try { window.__reelWindowObserver.disconnect(); } catch (e) {}
      window.__reelWindowObserver = null;
    }
    if (window.__reelsScrollDebounceTimer) {
      clearTimeout(window.__reelsScrollDebounceTimer);
      window.__reelsScrollDebounceTimer = null;
    }
  }
};

if (typeof window !== 'undefined' && !window.__okbmWatcherPageBind) {
  window.__okbmWatcherPageBind = true;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      window.okbmCleanupModalWatchers();
    } else if (document.visibilityState === 'visible') {
      window.okbmStartNotifPoll();
      if (window.__okbmHistoryModalOpen && typeof window.okbmBindReelFeedObserver === 'function') {
        window.okbmBindReelFeedObserver();
      }
    }
  });
  window.addEventListener('pagehide', function() {
    window.okbmCleanupModalWatchers();
  });
}

if (typeof window !== 'undefined') {
  window.__okbmBlockedUsersCache = okbmGetIdList('okbm_blocked_users');
  window.__okbmBlockedUsersMetaCache = (function() {
    var meta = safeGetJSON('okbm_blocked_users_meta', {});
    return (meta && typeof meta === 'object' && !Array.isArray(meta)) ? meta : {};
  })();
  setTimeout(function() {
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
      var uId = okbmGetCurrentUserId();
      if (!uId) {
        okbmRequireCurrentUserId();
      } else if (window.RomanticVault) {
        window.RomanticVault.hydrateFromServer(uId).catch(function(err) {
          console.warn('[RomanticSync] 초기 동기화 보류:', err);
        });
      }
      if (typeof window.okbmSyncUgcSafetyFromServer === 'function') {
        window.okbmSyncUgcSafetyFromServer().then(function(changed) {
          if (changed && typeof window.rerenderCommunityFeedsNow === 'function') {
            window.rerenderCommunityFeedsNow();
          }
        }).catch(function(err) {
          console.warn('[RomanticSync] UGC 안전 동기화 보류:', err);
        });
      }
      if (typeof window.okbmRefreshAdminFlagFromServer === 'function') {
        window.okbmRefreshAdminFlagFromServer().catch(function() {});
      }
      if (typeof window.refreshProposalInboxForUser === 'function') {
        window.refreshProposalInboxForUser().catch(function() {});
      }
      if (typeof window.okbmBindNoteLiveRefresh === 'function') {
        window.okbmBindNoteLiveRefresh();
      }
      if (typeof window.okbmNoteRealtimeStartInbox === 'function') {
        window.okbmNoteRealtimeStartInbox();
      }
      if (typeof window.pollUserNotifications === 'function') {
        window.pollUserNotifications(false).catch(function() {});
        window.okbmStartNotifPoll();
      }
    }
  }, 100);
}

function syncUserDataToCloud(isPackHistoryUpdated, immediate) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = okbmGetCurrentUserId();
  if (!userId) return;

  if (window.RomanticVault && window.RomanticVault.isHydrating === true) {
    window.RomanticVault._pendingCloudSync = true;
    return;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    localStorage.setItem('okbm_pending_cloud_sync', 'true');
    updateHeaderAuthUI();
    return;
  }

  clearTimeout(window.RomanticVault._syncTimer);
  var executeCloudSync = function() {
    if (typeof window.saveUserToSupabase === 'function') {
      window.saveUserToSupabase(profile)
        .then(function(ok) {
          if (ok) {
            localStorage.removeItem('okbm_pending_cloud_sync');
            updateHeaderAuthUI();
          }
        })
        .catch(function() {});
    }
  };

  if (immediate) {
    executeCloudSync();
  } else {
    window.RomanticVault._syncTimer = setTimeout(executeCloudSync, 300);
  }
}
window.syncUserDataToCloud = syncUserDataToCloud;

// 홈/지도 핀용 공개 컬럼. 들머리 주소(trailhead_addr)·author_sns_url은 제외.
window.SPOTS_MAP_SELECT = 'id,region,cityName,spot_main,spot_sub,fullName,elevation,campsite_lat,campsite_lng,terrain,trailhead_name,difficulty,distance_km,droneStatus,course_type,author,user_id,created_at,desc_summary,mediaUrls';
window.FEEDS_HOME_SELECT = 'id,user_id,spot,spot_id,elevation,weight_kg,date,memo,photos,photo_memos_json,author,likes_count,is_published,feed_type,created_at,items,template_id';

window.stripSpotDetailFields = function(spot) {
  if (!spot || typeof spot !== 'object') return spot;
  var out = Object.assign({}, spot);
  delete out.trailhead_addr;
  delete out.entryPoint;
  delete out.author_sns_url;
  delete out.authorSnsUrl;
  return out;
};

window.normalizeSpotMapRow = function(row) {
  if (!row || typeof row !== 'object') return null;
  var rawLat = row.campsite_lat !== undefined && row.campsite_lat !== null ? row.campsite_lat : row.lat;
  var rawLng = row.campsite_lng !== undefined && row.campsite_lng !== null ? row.campsite_lng : row.lng;
  var lat = parseFloat(rawLat) || 0;
  var lng = parseFloat(rawLng) || 0;
  if (lat > 100 && lng < 50 && lng > 0) {
    var tmp = lat;
    lat = lng;
    lng = tmp;
  }
  var name = String(row.spot_main || row.name || '').trim();
  var sub = String(row.spot_sub || '').trim();
  var sheetRegion = String(row.region || '').trim();
  var sheetCity = String(row.cityName || row.city_name || '').trim();
  var finalCity = sheetCity || sheetRegion || '전국';
  var tArr = Array.isArray(row.terrain)
    ? row.terrain
    : (typeof row.terrain === 'string' ? row.terrain.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : []);
  var derivedFullName = row.fullName || row.fullname || (finalCity
    ? '[' + finalCity + '] ' + name + (sub ? ' (' + sub + ')' : '')
    : (sub ? name + ' (' + sub + ')' : name));
  var out = {
    id: String(row.id || name).trim(),
    name: name,
    spot_main: name,
    spot_sub: sub,
    fullName: derivedFullName,
    fullname: derivedFullName,
    lat: lat,
    lng: lng,
    campsite_lat: lat,
    campsite_lng: lng,
    elevation: String(row.elevation != null ? row.elevation : '').trim(),
    trailhead_name: String(row.trailhead_name || '').trim(),
    region: sheetRegion || finalCity,
    cityName: finalCity,
    city_name: finalCity,
    terrain: tArr,
    difficulty: String(row.difficulty || '3').trim(),
    distance: String(row.distance_km != null ? row.distance_km : (row.distance || '')).trim(),
    distance_km: row.distance_km != null ? row.distance_km : null,
    droneStatus: String(row.droneStatus || row.drone_status || '').trim(),
    courseType: String(row.course_type || '일반').trim(),
    course_type: String(row.course_type || '').trim(),
    author: String(row.author || row.nickname || '').trim(),
    nickname: String(row.author || row.nickname || '').trim(),
    user_id: String(row.user_id || row.userId || '').trim(),
    userId: String(row.user_id || row.userId || '').trim(),
    created_at: row.created_at || null,
    desc_summary: String(row.desc_summary || row.desc || '').trim(),
    desc: String(row.desc_summary || row.desc || '').trim(),
    mediaUrls: row.mediaUrls || row.mediaurls || ''
  };
  var media = window.parseSpotMediaUrls(out.mediaUrls);
  out.youtubeUrls = media.youtubeUrls;
  out.blogUrls = media.blogUrls;
  return out;
};

window.parseSpotMediaUrls = function(mediaUrls) {
  var ytUrls = [];
  var blogUrls = [];
  if (mediaUrls && typeof mediaUrls === 'string') {
    mediaUrls.split(/[\r\n,]+/).map(function(u) { return u.trim(); }).filter(Boolean).forEach(function(u) {
      if (u.indexOf('youtube.com') !== -1 || u.indexOf('youtu.be') !== -1) ytUrls.push(u);
      else if (u.indexOf('blog.naver.com') !== -1) blogUrls.push(u);
    });
  }
  return { youtubeUrls: ytUrls, blogUrls: blogUrls };
};

window.mergeSpotDetailInto = function(spot, detail) {
  if (!spot || !detail || typeof detail !== 'object') return spot;
  var entry = String(detail.trailhead_addr || '').trim();
  var summary = String(detail.desc_summary || '').trim();
  var media = window.parseSpotMediaUrls(detail.mediaUrls || '');
  spot.trailhead_addr = entry;
  spot.entryPoint = entry;
  spot.desc_summary = summary;
  spot.desc = summary;
  spot.mediaUrls = detail.mediaUrls || '';
  spot.youtubeUrls = media.youtubeUrls;
  spot.blogUrls = media.blogUrls;
  spot.author_sns_url = String(detail.author_sns_url || '').trim();
  spot.authorSnsUrl = spot.author_sns_url;
  spot.__detailLoaded = true;
  return spot;
};

window.persistLightweightSpotsCache = function(spots) {
  if (!Array.isArray(spots)) return;
  var light = spots.map(function(s) {
    return (typeof window.stripSpotDetailFields === 'function') ? window.stripSpotDetailFields(s) : s;
  });
  window.__memoryStore = window.__memoryStore || {};
  window.__memoryStore['okbm_master_spots'] = light;
  window.__memoryStore['okbm_spots_cache'] = light;
  window.SPOTS_MASTER = light;
  if (typeof window.okbmSpotsIdbSet === 'function') {
    window.okbmSpotsIdbSet(window.OKBM_SPOTS_IDB_KEY || 'okbm_master_spots', light);
  }
  try {
    if (typeof window.__okbmRawRemoveItem === 'function') {
      window.__okbmRawRemoveItem(localStorage, 'okbm_spots_cache');
      window.__okbmRawRemoveItem(localStorage, 'okbm_master_spots');
    } else {
      localStorage.removeItem('okbm_spots_cache');
      localStorage.removeItem('okbm_master_spots');
    }
  } catch (e) {
    console.warn('[romantic-sync.js:persistLightweightSpotsCache]', e);
  }
};

window.__okbmSpotsIdbReady = (function() {
  var readIdb = (typeof window.okbmSpotsIdbGet === 'function')
    ? window.okbmSpotsIdbGet(window.OKBM_SPOTS_IDB_KEY || 'okbm_master_spots')
    : Promise.resolve(null);
  return readIdb.then(function(idbSpots) {
    if (Array.isArray(idbSpots) && idbSpots.length) {
      window.__memoryStore = window.__memoryStore || {};
      window.__memoryStore['okbm_master_spots'] = idbSpots;
      window.__memoryStore['okbm_spots_cache'] = idbSpots;
      window.SPOTS_MASTER = idbSpots;
      try {
        localStorage.removeItem('okbm_spots_cache');
        localStorage.removeItem('okbm_master_spots');
      } catch (e) {}
      return idbSpots;
    }
    var ls = [];
    try {
      var raw = localStorage.getItem('okbm_master_spots') || localStorage.getItem('okbm_spots_cache');
      ls = raw ? JSON.parse(raw) : [];
    } catch (e) { ls = []; }
    if (Array.isArray(ls) && ls.length) {
      window.persistLightweightSpotsCache(ls);
      return ls;
    }
    return [];
  }).catch(function() { return []; });
})();

window.__spotDetailCache = window.__spotDetailCache || {};
window.__spotDetailInflight = window.__spotDetailInflight || {};

window.fetchSpotDetailById = async function(spotId) {
  var id = String(spotId || '').trim();
  if (!id) return null;
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) return null;
  if (window.__spotDetailCache[id]) return window.__spotDetailCache[id];
  if (window.__spotDetailInflight[id]) return window.__spotDetailInflight[id];

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return null;

  var request = (async function() {
    try {
      var res = await fetch(targetUrl + '/rest/v1/rpc/get_spot_detail', {
        method: 'POST',
        headers: {
          'apikey': targetKey,
          'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_id: id })
      });
      if (!res.ok) return null;
      var detail = await res.json();
      if (!detail || typeof detail !== 'object') return null;
      window.__spotDetailCache[id] = detail;
      return detail;
    } catch (e) {
      console.warn('[romantic-sync.js:fetchSpotDetailById]', e);
      return null;
    } finally {
      delete window.__spotDetailInflight[id];
    }
  })();

  window.__spotDetailInflight[id] = request;
  return request;
};

window.fetchMasterSpotsFromSupabase = async function(isForce) {
  var TTL_MS = 5 * 60 * 1000;
  var now = Date.now();
  if (!isForce && window.__okbmSpotsMemoryCache && Array.isArray(window.__okbmSpotsMemoryCache) &&
      window.__okbmSpotsFetchedAt && (now - window.__okbmSpotsFetchedAt) < TTL_MS) {
    window.SPOTS_MASTER = window.__okbmSpotsMemoryCache;
    return window.__okbmSpotsMemoryCache;
  }
  if (!isForce && window.__okbmSpotsInflight) {
    try { return await window.__okbmSpotsInflight; } catch (e) {}
  }

  var run = (async function() {
  var cached = safeGetJSON('okbm_master_spots', null) || safeGetJSON('okbm_spots_cache', null);
  if (!(Array.isArray(cached) && cached.length > 0) && window.__okbmSpotsIdbReady) {
    try { cached = await window.__okbmSpotsIdbReady; } catch (e) { cached = cached || []; }
  }
  if (!isForce && Array.isArray(cached) && cached.length > 0) {
    var lightCached = cached.map(function(s) { return window.stripSpotDetailFields(s); });
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_master_spots'] = lightCached;
    window.SPOTS_MASTER = lightCached;
    window.__okbmSpotsMemoryCache = lightCached;
    window.__okbmSpotsFetchedAt = Date.now();
    return lightCached;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return cached;

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 6000);
    var select = encodeURIComponent(window.SPOTS_MAP_SELECT);
    var res = await (typeof window.okbmPublicFetch === 'function'
      ? window.okbmPublicFetch(targetUrl + '/rest/v1/spots?select=' + select + '&order=id.asc', { method: 'GET', signal: controller.signal })
      : fetch(targetUrl + '/rest/v1/spots?select=' + select + '&order=id.asc', {
      method: 'GET',
      headers: (typeof window.okbmPublicRestHeaders === 'function')
        ? window.okbmPublicRestHeaders()
        : {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    }));
    clearTimeout(timeoutId);

    if (res.ok) {
      var rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        var spots = rows.map(function(row) { return window.normalizeSpotMapRow(row); }).filter(function(s) {
          return s && s.name && s.lat && s.lng;
        });
        if (spots.length > 0) {
          window.persistLightweightSpotsCache(spots);
          window.__okbmSpotsMemoryCache = spots;
          window.__okbmSpotsFetchedAt = Date.now();
          if (typeof window.renderSpots === 'function') {
            window.renderSpots();
          }
          return spots;
        }
      }
    }
  } catch (e) { console.warn('[romantic-sync.js:fetchMasterSpotsFromSupabase]', e); }

  return cached;
  })();

  window.__okbmSpotsInflight = run;
  try {
    return await run;
  } finally {
    if (window.__okbmSpotsInflight === run) window.__okbmSpotsInflight = null;
  }
};

window.fetchMasterGearsFromSupabase = async function(isForce) {
  if (typeof window.ensureAllGearCategoriesLoaded === 'function') {
    return window.ensureAllGearCategoriesLoaded(isForce);
  }
  if (typeof window.loadGearDbFromGoogleSheet === 'function') {
    return window.loadGearDbFromGoogleSheet(isForce);
  }

  var CURRENT_GEAR_VERSION = '20260922_GEAR_FULL2540';
  try {
    localStorage.removeItem('okbm_master_gears');
    localStorage.removeItem('okbm_master_gears_cache');
  } catch (e) {}

  var cachedGears = (window.__memoryStore && window.__memoryStore['okbm_master_gears']) || window.GEARS_MASTER || null;
  if (!isForce && Array.isArray(cachedGears) && cachedGears.length > 0) {
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_master_gears'] = cachedGears;
    window.GEARS_MASTER = cachedGears;
    return cachedGears;
  }

  // 1차 시도: 정적 JSON 파일 로드 (Supabase API 호출 0건)
  try {
    var sRes = await fetch('gears_master.json?v=' + CURRENT_GEAR_VERSION, { cache: 'force-cache' });
    if (sRes.ok) {
      var sData = await sRes.json();
      if (Array.isArray(sData) && sData.length > 0) {
        // 🛡️ [헌법 제1조 & 5MB 초과 방지] localStorage에 장비 마스터를 절대 저장하지 않고 메모리에만 수화(Hydrate)
        window.__memoryStore = window.__memoryStore || {};
        window.__memoryStore['okbm_master_gears'] = sData;
        window.GEARS_MASTER = sData;
        if (typeof window.renderPlanCategorySlots === 'function') {
          window.renderPlanCategorySlots();
        }
        return sData;
      }
    }
  } catch(e) {}

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return cachedGears;

  try {
    var allGears = [];
    var page = 0;
    var pageSize = 1000;
    while (true) {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 8000);
      var res = await fetch(targetUrl + '/rest/v1/gears?select=id,name,item_name,weight_g,weight,brand,category_id,specs_detail,specs,verified,weight_type,evidence&order=id.asc&offset=' + (page * pageSize) + '&limit=' + pageSize, {
        method: 'GET',
        headers: (typeof window.okbmPublicRestHeaders === 'function')
          ? window.okbmPublicRestHeaders()
          : {
          'apikey': targetKey,
          'Authorization': 'Bearer ' + targetKey,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) break;
      var chunk = await res.json();
      if (!Array.isArray(chunk) || chunk.length === 0) break;
      allGears = allGears.concat(chunk);
      if (chunk.length < pageSize) break;
      page++;
    }

    if (allGears.length > 0) {
      // 🛡️ [헌법 제1조 & 5MB 초과 방지] localStorage에 장비 마스터를 절대 저장하지 않고 메모리에만 수화(Hydrate)
      window.__memoryStore = window.__memoryStore || {};
      window.__memoryStore['okbm_master_gears'] = allGears;
      window.GEARS_MASTER = allGears;
      if (typeof window.renderPlanCategorySlots === 'function') {
        window.renderPlanCategorySlots();
      }
      return allGears;
    }
  } catch (e) { console.warn('[romantic-sync.js:fetchMasterGearsFromSupabase]', e); }

  return cachedGears;
};

window.fetchRankingsFromSupabase = async function(isForce) {
  var TTL_MS = 5 * 60 * 1000;
  if (!isForce && window.__cachedRankings && window.__okbmRankingsFetchedAt &&
      (Date.now() - window.__okbmRankingsFetchedAt) < TTL_MS) {
    return window.__cachedRankings;
  }
  if (!isForce && window.__okbmRankingsInflight) {
    try { return await window.__okbmRankingsInflight; } catch (e) {}
  }
  var run = okbmFetchRankingsNow();
  window.__okbmRankingsInflight = run;
  try {
    return await run;
  } finally {
    if (window.__okbmRankingsInflight === run) window.__okbmRankingsInflight = null;
  }
};

async function okbmFetchRankingsNow() {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return null;

  var result = {
    topSpots: [],
    topUsers: []
  };

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 5000);

    var usersRes = await fetch(targetUrl + '/rest/v1/ranking_stats?select=spot_id,spot_name,usage_count&order=usage_count.desc&limit=10', {
      headers: (typeof window.okbmPublicRestHeaders === 'function')
        ? window.okbmPublicRestHeaders()
        : {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (usersRes.ok) {
      result.topUsers = await usersRes.json();
      window.__okbmRankingsFetchedAt = Date.now();
    }

    window.__cachedRankings = result;
    window.dispatchEvent(new CustomEvent('okbm_rankings_updated', { detail: result }));
  } catch (e) { console.warn('[romantic-sync.js:fetchRankingsFromSupabase]', e); }

  return result;
}

if (typeof window !== 'undefined') {
  setTimeout(function() {
    window.fetchMasterSpotsFromSupabase();
    window.fetchRankingsFromSupabase();
    if (typeof trackDailyVisit === 'function') trackDailyVisit();
  }, 350);

  window.addEventListener('online', function() {
    updateHeaderAuthUI();
    window.fetchMasterSpotsFromSupabase(false);
    window.fetchRankingsFromSupabase(false);
    // 오늘 이미 기록됐으면 sessionStorage 가드로 요청하지 않는다(오프라인 부팅 때만 재시도).
    if (typeof trackDailyVisit === 'function') trackDailyVisit();
    if (localStorage.getItem('okbm_pending_cloud_sync') === 'true' && isUserLoggedIn()) {
      syncUserDataToCloud(true);
    }
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn() && typeof window.okbmSyncUgcSafetyFromServer === 'function') {
      window.okbmSyncUgcSafetyFromServer().then(function(changed) {
        if (changed && typeof window.rerenderCommunityFeedsNow === 'function') window.rerenderCommunityFeedsNow();
      }).catch(function() {});
    }
  });
  window.addEventListener('offline', function() {
    updateHeaderAuthUI();
  });
}

// 5. 상단 헤더 및 보관함 로그인 상태 UI 업데이트
function updateHeaderAuthUI() {
  var btn = document.getElementById('headerAuthBtn');
  var text = document.getElementById('headerAuthText');
  var icon = document.getElementById('headerAuthIcon');
  var statusBanner = document.getElementById('cloudStatusBanner');
  var statusText = document.getElementById('cloudStatusText');
  var statusAction = document.getElementById('cloudStatusAction');

  var isLogged = isUserLoggedIn();
  var isOnline = (typeof navigator === 'undefined') || navigator.onLine;
  var hasPending = localStorage.getItem('okbm_pending_cloud_sync') === 'true';
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var starIconSvg = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; margin-right:2px; fill:#fde047; color:#fde047; flex-shrink:0; display:inline-block; vertical-align:-1px;"><path d="M12,1 Q12,12 1,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,1 Z"/><circle cx="12" cy="1.5" r="1.5" fill="#ffffff"/></svg>';

  if (btn && text) {
    if (icon) icon.innerHTML = starIconSvg;
    if (isLogged && profile && profile.nickname) {
      btn.classList.add('logged-in');
      text.innerText = profile.nickname;
    } else {
      btn.classList.remove('logged-in');
      text.innerText = '로그인';
    }
  }

  if (statusBanner && statusText && statusAction) {
    if (!isOnline || hasPending) {
      statusBanner.className = 'cloud-status-banner cloud-status-guest';
      statusText.innerText = '기기 로컬 보관 중 (통신 연결 시 자동 백업)';
      statusAction.innerText = hasPending ? '대기 중' : '오프라인';
    } else if (isLogged) {
      statusBanner.className = 'cloud-status-banner cloud-status-member';
      statusText.innerText = '낭만 클라우드 실시간 안전 백업 중';
      statusAction.innerText = '동기화됨';
    } else {
      statusBanner.className = 'cloud-status-banner cloud-status-guest';
      statusText.innerText = '기기 임시 보관 중 (캐시 삭제 시 초기화 주의)';
      statusAction.innerText = '카카오 1초 연동';
    }
  }
}

// 마이데이터 연도 전역 상태
window._selectedReportYear = String(new Date().getFullYear());

window._getRomanticRouteOutdoorLogs = function() {
  var curUserId = okbmGetCurrentUserId();
  var curPureId = curUserId.replace(/\D/g, '');

  var sourcePool = [];
  if (Array.isArray(window.packingHistoryList) && window.packingHistoryList.length > 0) {
    sourcePool = sourcePool.concat(window.packingHistoryList);
  }
  if (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0) {
    sourcePool = sourcePool.concat(window.interactiveHistory);
  }
  if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
    sourcePool = sourcePool.concat(window.__allLoadedFeeds);
  }
  if (typeof window.safeGetStorage === 'function') {
    var localHistory = window.safeGetStorage('okbm_packing_history', []);
    if (Array.isArray(localHistory) && localHistory.length > 0) {
      sourcePool = sourcePool.concat(localHistory);
    }
  }

  var dedupMap = new Map();
  sourcePool.forEach(function(r) {
    if (!r || r._memDeleted === true) return;
    if (r.isDeleted === true) {
      r._memDeleted = true;
      delete r.isDeleted;
      return;
    }
    var rId = String(r.id || '').trim();
    if (!rId || rId.startsWith('pack_temp_')) return;
    if (!dedupMap.has(rId)) {
      dedupMap.set(rId, r);
    }
  });

  var logs = Array.from(dedupMap.values());

  return logs.filter(function(r) {
    var rUid = String(r.userId || r.user_id || '').trim();
    var rPureId = rUid.replace(/\D/g, '');

    if (curPureId && rPureId && curPureId !== rPureId) {
      return false;
    }

    var photosList = [];
    if (Array.isArray(r.photos)) {
      photosList = r.photos;
    } else if (typeof r.photos === 'string' && r.photos.trim().startsWith('[')) {
      try { photosList = JSON.parse(r.photos); } catch (e) { photosList = []; }
    }

    var tmplPhoto = String(r.readyShotPhoto || r.ready_shot_photo || r.customTemplatePhoto || '').trim();
    var validFieldPhotos = photosList.filter(function(u) {
      return typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://')) && !u.includes('unsplash.com') && u !== tmplPhoto;
    });

    if (validFieldPhotos.length === 0) {
      return false;
    }

    return Boolean(r.date);
  });
};

// [마이리포트 오픈 시 가벼운 핵심 카운터 즉시 갱신 엔진 (상세 아코디언은 온디맨드 계산 유지)]
window.refreshMyReportFullStats = function() {
  window.__reportRenderCache = {};

  var applyLocalCounts = function() {
    var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
      ? window._getRomanticRouteOutdoorLogs()
      : [];

    var curYear = window._selectedReportYear || String(new Date().getFullYear());
    var actualCurYear = String(new Date().getFullYear());

    var yearLogs = validLogs.filter(function(r) {
      return String(r.date || '').includes(curYear);
    });
    var yEl = document.getElementById('reportYearCountNumber');
    if (yEl) yEl.innerText = yearLogs.length;

    var tEl = document.getElementById('reportTotalCountNumber');
    if (tEl) tEl.innerText = validLogs.length;

    var badgeText = document.getElementById('reportYearBadge');
    if (badgeText) badgeText.innerText = curYear;

    var labelText = document.getElementById('reportYearCardLabel');
    if (labelText) labelText.innerText = (curYear === actualCurYear) ? '올해 활동' : curYear + '년 활동';

    return { validLogs: validLogs, curYear: curYear, yEl: yEl, tEl: tEl };
  };

  var paint = applyLocalCounts();
  var validLogs = paint.validLogs;
  var curYear = paint.curYear;
  var yEl = paint.yEl;
  var tEl = paint.tEl;

  var curUserId = okbmGetCurrentUserId();
  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  if (!profile && curUserId && typeof safeGetJSON === 'function') {
    profile = safeGetJSON('user_profile_' + curUserId, null);
  }
  if (!profile && typeof authState !== 'undefined') {
    profile = authState.userProfile || null;
  }
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  var syncFromServer = function() {
    if (!(curUserId && targetUrl && targetKey)) return;
    fetch(targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(curUserId) + '&select=id,date', {
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey),
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
      }
    }).then(function(res) {
      if (res.ok) {
        var contentRange = res.headers.get('content-range');
        var serverTotal = 0;
        if (contentRange && contentRange.includes('/')) {
          var parsedCount = parseInt(contentRange.split('/')[1], 10);
          if (!isNaN(parsedCount)) serverTotal = parsedCount;
        }
        return res.json().then(function(rows) {
          return { rows: Array.isArray(rows) ? rows : [], total: serverTotal };
        });
      }
      return { rows: [], total: 0 };
    }).then(function(data) {
      var localAgain = applyLocalCounts();
      yEl = localAgain.yEl;
      tEl = localAgain.tEl;
      curYear = localAgain.curYear;

      var serverRows = data.rows;
      var serverTotalCount = (typeof data.total === 'number') ? data.total : serverRows.length;
      // 서버 총건수 기준으로 맞춤 (슈퍼베이스 삭제 시 감소 반영)
      if (tEl) tEl.innerText = String(serverTotalCount);
      if (yEl && Array.isArray(serverRows) && serverRows.length > 0
          && (serverRows.length >= serverTotalCount || serverTotalCount === 0)) {
        yEl.innerText = String(serverRows.filter(function(r) {
          return String(r.date || '').includes(curYear);
        }).length);
      }
    }).catch(function() {});
  };
  if (typeof window.okbmReconcileLocalFeedsWithServer === 'function') {
    window.okbmReconcileLocalFeedsWithServer().then(function() {
      applyLocalCounts();
      syncFromServer();
    }).catch(function() {
      syncFromServer();
    });
  } else {
    syncFromServer();
  }

  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  if (!Array.isArray(myProps)) myProps = [];
  var hStat = document.getElementById('reportHeaderMyPropsStat');
  if (hStat) hStat.innerText = myProps.length + '곳';

  var bioVal = (profile && profile.bio) ? profile.bio : (localStorage.getItem('okbm_user_bio') || '');
  var bioEl = document.getElementById('reportProfileBioText');
  if (bioEl) {
    bioEl.innerText = bioVal || '소개글을 작성해보세요.';
    bioEl.style.color = bioVal ? '#cbd5e1' : '#64748b';
  }

  var snsWrap = document.getElementById('reportHeaderSnsWrap');
  if (snsWrap) {
    var rawInsta = localStorage.getItem('okbm_user_instagram') || (profile && profile.instagram) || '';
    var rawYt = localStorage.getItem('okbm_user_youtube') || (profile && profile.youtube) || '';
    var rawBlog = localStorage.getItem('okbm_user_blog') || (profile && profile.blog) || '';
    var rawSns = localStorage.getItem('okbm_user_sns_channel') || (profile && (profile.snsChannel || profile.sns_channel)) || '';

    var instaTarget = '';
    var pureInsta = rawInsta.replace(/[@\s]/g, '').trim();
    if (pureInsta) {
      instaTarget = 'https://instagram.com/' + pureInsta;
    } else if (rawSns.includes('instagram.com')) {
      instaTarget = rawSns.startsWith('http') ? rawSns : ('https://' + rawSns);
    }

    var ytTarget = '';
    var checkYt = rawYt || (rawSns.includes('youtube.com') || rawSns.includes('youtu.be') ? rawSns : '');
    if (checkYt) {
      var cleanYt = checkYt.replace(/^@+/, '').split('?')[0].trim();
      var mYt = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
      ytTarget = (mYt && mYt[1]) ? ('https://www.youtube.com/@' + mYt[1].replace(/^@/, '')) : (cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt));
    }

    var blogTarget = '';
    var checkBlog = rawBlog || (rawSns.includes('blog.naver.com') ? rawSns : '');
    if (checkBlog) {
      var cleanBlog = checkBlog.trim();
      blogTarget = cleanBlog.startsWith('http') ? cleanBlog : ('https://' + cleanBlog);
    }

    snsWrap.innerHTML = window.renderUserSnsBadgesHtml(rawInsta, rawYt, rawBlog, true, rawSns);
  }
};

window.renderUserSnsBadgesHtml = function(rawInsta, rawYt, rawBlog, isOwner, rawSns) {
  rawInsta = rawInsta || '';
  rawYt = rawYt || '';
  rawBlog = rawBlog || '';
  rawSns = rawSns || '';

  var instaTarget = '';
  var pureInsta = rawInsta.replace(/[@\s]/g, '').trim();
  if (pureInsta) {
    instaTarget = 'https://instagram.com/' + pureInsta;
  } else if (rawSns.includes('instagram.com')) {
    instaTarget = rawSns.startsWith('http') ? rawSns : ('https://' + rawSns);
  }

  var ytTarget = '';
  var checkYt = rawYt || (rawSns.includes('youtube.com') || rawSns.includes('youtu.be') ? rawSns : '');
  if (checkYt) {
    var cleanYt = checkYt.replace(/^@+/, '').split('?')[0].trim();
    var mYt = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
    ytTarget = (mYt && mYt[1]) ? ('https://www.youtube.com/@' + mYt[1].replace(/^@/, '')) : (cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt));
  }

  var blogTarget = '';
  var checkBlog = rawBlog || (rawSns.includes('blog.naver.com') ? rawSns : '');
  if (checkBlog) {
    var cleanBlog = checkBlog.trim();
    blogTarget = cleanBlog.startsWith('http') ? cleanBlog : ('https://' + cleanBlog);
  }

  var badges = [];
  if (instaTarget && okbmSafeExternalUrl(instaTarget) !== '#') {
    badges.push('<a href="' + escapeHtml(okbmSafeExternalUrl(instaTarget)) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="인스타그램"><svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>');
  }

  if (ytTarget && okbmSafeExternalUrl(ytTarget) !== '#') {
    badges.push('<a href="' + escapeHtml(okbmSafeExternalUrl(ytTarget)) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="유튜브"><svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#f43f5e"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff"/></svg></a>');
  }

  if (blogTarget && okbmSafeExternalUrl(blogTarget) !== '#') {
    badges.push('<a href="' + escapeHtml(okbmSafeExternalUrl(blogTarget)) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="네이버 블로그"><svg viewBox="0 0 24 24" style="width:12px; height:12px;" fill="none"><path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" fill="#03c75a"/></svg></a>');
  }

  if (isOwner) {
    var editActionBtn = '<button type="button" onclick="window.openSnsEditorModal(); triggerHaptic(8);" style="height:24px; padding:0 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:#94a3b8; font-size:0.65rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">' +
      (badges.length > 0 ? '<svg viewBox="0 0 24 24" style="width:10px; height:10px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' : '<span style="color:#38bdf8; font-size:0.8rem; line-height:1;">+</span><span>SNS 등록</span>') +
    '</button>';
    badges.push(editActionBtn);
  }

  return badges.join('');
};

window.renderUserProfileHeaderSection = function(config) {
  var uid = String((config && config.userId) || '').trim();
  var me = '';
  try { me = (typeof okbmGetCurrentUserId === 'function') ? String(okbmGetCurrentUserId() || '').trim() : ''; } catch (e) { me = ''; }
  var isOwner = Boolean(config && config.isOwner);
  if (uid && me && uid !== me) isOwner = false;
  var nick = String((config && config.nickname) || (isOwner ? '야영자' : '루터')).trim();
  var bio = okbmNormalizeUserBio((config && config.bio) || '');
  var photoUrl = okbmSafeImageUrl(config && config.photoUrl);
  var feedCount = (config && typeof config.feedCount === 'number') ? config.feedCount : 0;

  var snsHtml = '';
  if (typeof window.renderUserSnsBadgesHtml === 'function') {
    snsHtml = window.renderUserSnsBadgesHtml(
      config && config.instagram,
      config && config.youtube,
      config && config.blog,
      isOwner,
      config && config.snsChannel
    );
  }

  var bioClickAttr = isOwner ? 'onclick="window.editReportUserBio();"' : '';
  var bioCursor = isOwner ? 'cursor:pointer; ' : '';
  var bioText = bio || (isOwner ? '소개글을 작성해보세요.' : '소개글이 없습니다.');
  var bioColor = bio ? '#e2e8f0' : '#64748b';

  var safePhotoAttr = photoUrl ? _escapeReportPropHtml(photoUrl) : '';
  var avatarClickAttr = isOwner
    ? 'onclick="triggerHaptic(12); window.openAccountSettingsModal();" title="설정"'
    : (photoUrl ? 'data-photo-url="' + safePhotoAttr + '" onclick="triggerHaptic(10); window.previewUserPhotoLarge(this.getAttribute(\'data-photo-url\'));" title="사진 보기"' : '');
  var avatarCursor = (isOwner || photoUrl) ? 'cursor:pointer; ' : '';

  var avatarImgHtml = photoUrl
    ? '<div class="user-profile-avatar-img" style="width:100%; height:100%; border-radius:50%; background:#121212; background-size:cover; background-position:center; background-repeat:no-repeat; background-image:url(\'' + escapeHtml(photoUrl) + '\'); display:flex; align-items:center; justify-content:center; overflow:hidden;"></div>'
    : '<div class="user-profile-avatar-img" style="width:100%; height:100%; border-radius:50%; background:#121212; display:flex; align-items:center; justify-content:center; overflow:hidden;"><svg viewBox="0 0 24 24" style="width:34px; height:34px;" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';

  var actionGridHtml = '';
  if (isOwner) {
    actionGridHtml = '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr 1fr; gap:6px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">' +
      '<button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.openMyPastTripsFromReport(event);" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.80rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>모아보기</span>' +
      '</button>' +
      '<button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.openRoutersInterestFromReport(event);" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.80rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>관심루터</span>' +
      '</button>' +
      '<button type="button" onclick="event.preventDefault(); event.stopPropagation(); window.openFeedsInterestFromReport(event);" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.80rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>관심피드</span>' +
      '</button>' +
      '<button type="button" onclick="event.preventDefault(); event.stopPropagation(); triggerHaptic(8); window.openUserNotificationInbox(\'note\', event);" style="position:relative; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.80rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>쪽지</span>' +
        '<span id="reportNoteCountBadge" style="display:none; position:absolute; top:3px; right:8px; min-width:14px; height:14px; padding:0 4px; border-radius:8px; background:#f43f5e; color:#fff; font-size:0.62rem; font-weight:900; align-items:center; justify-content:center;"></span>' +
      '</button>' +
      '<button type="button" onclick="event.preventDefault(); event.stopPropagation(); triggerHaptic(8); window.openUserNotificationInbox(\'notif\', event);" style="position:relative; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.80rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>알림</span>' +
        '<span id="reportNotifCountBadge" style="display:none; position:absolute; top:3px; right:8px; min-width:14px; height:14px; padding:0 4px; border-radius:8px; background:#f43f5e; color:#fff; font-size:0.62rem; font-weight:900; align-items:center; justify-content:center;"></span>' +
      '</button>' +
    '</div>';
  } else if (uid) {
    actionGridHtml = '<div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">' +
      '<button type="button" data-user-id="' + _escapeReportPropHtml(uid) + '" data-author="' + _escapeReportPropHtml(nick) + '" onclick="event.preventDefault(); event.stopPropagation(); triggerHaptic(8); window.openDirectMessageThread(this.dataset.userId, this.dataset.author);" style="width:100%; height:36px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); border-radius:8px; color:#7dd3fc; font-size:0.78rem; font-weight:900; cursor:pointer;">쪽지 보내기</button>' +
    '</div>';
  }

  var cardPaddingBottom = actionGridHtml ? '14px' : '16px';
  var cardGap = actionGridHtml ? '12px' : '0px';

  return '<div class="unified-user-profile-header-card" style="flex-shrink:0; width:100%; background:#000000; border-bottom:1px solid rgba(255,255,255,0.08); padding:16px 16px ' + cardPaddingBottom + ' 16px; box-sizing:border-box; z-index:50; display:flex; flex-direction:column; gap:' + cardGap + ';">' +
    '<div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">' +
      '<div style="flex:1 1 0%; min-width:0; display:flex; flex-direction:column; gap:6px;">' +
        '<div ' + bioClickAttr + ' style="' + bioCursor + 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:9px 10px; min-height:68px; box-sizing:border-box; display:flex; align-items:flex-start;">' +
          '<span class="user-profile-bio-span" style="font-size:0.87rem; color:' + bioColor + '; line-height:1.45; word-break:break-all; min-height:4.35em; display:-webkit-box; -webkit-line-clamp:5; line-clamp:5; -webkit-box-orient:vertical; overflow:hidden;">' + _escapeReportPropHtml(bioText) + '</span>' +
        '</div>' +
        '<div class="user-profile-sns-wrap" style="display:flex; align-items:center; gap:6px; min-height:26px;">' +
          snsHtml +
        '</div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0;">' +
        '<div ' + avatarClickAttr + ' style="' + avatarCursor + 'position:relative; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.12); padding:1.5px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.7);">' +
          avatarImgHtml +
        '</div>' +
        '<span class="user-profile-nick-span" style="font-size:0.88rem; font-weight:800; color:#ffffff; letter-spacing:-0.02em; max-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center;">' + _escapeReportPropHtml(nick) + '</span>' +
      '</div>' +
    '</div>' +
    actionGridHtml +
  '</div>';
};

window.openSnsEditorModal = function() {
  triggerHaptic(10);
  var curInsta = localStorage.getItem('okbm_user_instagram') || '';
  var curYt = localStorage.getItem('okbm_user_youtube') || '';
  var curBlog = localStorage.getItem('okbm_user_blog') || '';

  var old = document.getElementById('reportSnsEditorModalOverlay');
  if (old) old.remove();

  var modal = document.createElement('div');
  modal.id = 'reportSnsEditorModalOverlay';
  modal.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div style="width:100%; max-width:340px; background:#080b11; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:16px; box-sizing:border-box; display:flex; flex-direction:column; gap:12px;" onclick="event.stopPropagation();">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<span style="font-size:0.90rem; font-weight:900; color:#ffffff;">SNS 채널 관리</span>' +
        '<button type="button" onclick="document.getElementById(\'reportSnsEditorModalOverlay\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1rem; cursor:pointer;">✕</button>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; gap:8px;">' +
        '<div>' +
          '<span style="font-size:0.68rem; color:#94a3b8; font-weight:700;">인스타그램 ID</span>' +
          '<input type="text" id="snsInputInsta" value="' + curInsta + '" placeholder="@아이디 (예: @user)" style="width:100%; height:36px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:0 10px; color:#fff; font-size:0.78rem; outline:none; box-sizing:border-box; margin-top:2px;" />' +
        '</div>' +
        '<div>' +
          '<span style="font-size:0.68rem; color:#94a3b8; font-weight:700;">유튜브 채널</span>' +
          '<input type="text" id="snsInputYt" value="' + curYt + '" placeholder="채널 주소 (예: youtube.com/@ch)" style="width:100%; height:36px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:0 10px; color:#fff; font-size:0.78rem; outline:none; box-sizing:border-box; margin-top:2px;" />' +
        '</div>' +
        '<div>' +
          '<span style="font-size:0.68rem; color:#94a3b8; font-weight:700;">네이버 블로그</span>' +
          '<input type="text" id="snsInputBlog" value="' + curBlog + '" placeholder="블로그 주소 (예: blog.naver.com/id)" style="width:100%; height:36px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:6px; padding:0 10px; color:#fff; font-size:0.78rem; outline:none; box-sizing:border-box; margin-top:2px;" />' +
        '</div>' +
      '</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">' +
        '<button type="button" onclick="document.getElementById(\'reportSnsEditorModalOverlay\').remove();" style="height:38px; background:rgba(255,255,255,0.06); border:none; border-radius:6px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer;">취소</button>' +
        '<button type="button" onclick="window.saveSnsFromEditorModal();" style="height:38px; background:#38bdf8; border:none; border-radius:6px; color:#000000; font-size:0.78rem; font-weight:900; cursor:pointer;">저장</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
};

window.saveSnsFromEditorModal = function() {
  triggerHaptic(12);
  var inInsta = document.getElementById('snsInputInsta');
  var inYt = document.getElementById('snsInputYt');
  var inBlog = document.getElementById('snsInputBlog');

  var valInsta = inInsta ? inInsta.value.trim() : '';
  var valYt = inYt ? inYt.value.trim() : '';
  var valBlog = inBlog ? inBlog.value.trim() : '';

  if (valInsta) localStorage.setItem('okbm_user_instagram', valInsta);
  else localStorage.removeItem('okbm_user_instagram');

  if (valYt) localStorage.setItem('okbm_user_youtube', valYt);
  else localStorage.removeItem('okbm_user_youtube');

  if (valBlog) localStorage.setItem('okbm_user_blog', valBlog);
  else localStorage.removeItem('okbm_user_blog');

  var profile = safeGetJSON('user_profile', null) || {};
  profile.instagram = valInsta;
  profile.youtube = valYt;
  profile.blog = valBlog;
  localStorage.setItem('user_profile', JSON.stringify(profile));
  if (profile.id) {
    localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
  }

  if (typeof window.saveUserToSupabase === 'function') {
    window.saveUserToSupabase(profile).catch(function(e) {
      console.warn('[romantic-sync.js:saveSnsFromEditorModal]', e);
    });
  }

  var m = document.getElementById('reportSnsEditorModalOverlay');
  if (m) m.remove();

  if (typeof window.refreshMyReportFullStats === 'function') {
    window.refreshMyReportFullStats();
  }

  var collSnsWrap = document.getElementById('userCollectionSnsWrap');
  if (collSnsWrap && typeof window.renderUserSnsBadgesHtml === 'function') {
    collSnsWrap.innerHTML = window.renderUserSnsBadgesHtml(valInsta, valYt, valBlog, true);
  }
  document.querySelectorAll('.user-profile-sns-wrap').forEach(function(wrap) {
    if (typeof window.renderUserSnsBadgesHtml === 'function') {
      wrap.innerHTML = window.renderUserSnsBadgesHtml(valInsta, valYt, valBlog, true);
    }
  });

  showToast('SNS 채널이 저장되었습니다.', 'success', 1500);
};

var _okbmReportYearDdClickHandler = null;
var _okbmReportYearDdClickTimer = null;
var _okbmModuleCustomDdClickHandler = null;
var _okbmModuleCustomDdClickTimer = null;

function _okbmUnbindReportYearDdClick() {
  if (_okbmReportYearDdClickTimer) {
    clearTimeout(_okbmReportYearDdClickTimer);
    _okbmReportYearDdClickTimer = null;
  }
  if (_okbmReportYearDdClickHandler) {
    document.removeEventListener('click', _okbmReportYearDdClickHandler);
    _okbmReportYearDdClickHandler = null;
  }
}

function _okbmUnbindModuleCustomDdClick() {
  if (_okbmModuleCustomDdClickTimer) {
    clearTimeout(_okbmModuleCustomDdClickTimer);
    _okbmModuleCustomDdClickTimer = null;
  }
  if (_okbmModuleCustomDdClickHandler) {
    document.removeEventListener('click', _okbmModuleCustomDdClickHandler);
    _okbmModuleCustomDdClickHandler = null;
  }
}

function _okbmCloseReportYearDropdown() {
  var menu = document.getElementById('reportYearDropdownMenu');
  if (menu) menu.style.display = 'none';
  _okbmUnbindReportYearDdClick();
}

function _okbmCloseModuleCustomDropdowns() {
  document.querySelectorAll('[id^="customDropdownMenu_"]').forEach(function(m) {
    m.style.display = 'none';
  });
  _okbmUnbindModuleCustomDdClick();
}

// [상단 듀얼 카운터] 연도 선택 팝오버 토글러
window.toggleReportYearDropdown = function(e) {
  if (e) e.stopPropagation();
  triggerHaptic(8);
  var menu = document.getElementById('reportYearDropdownMenu');
  if (!menu) return;
  var isOpen = menu.style.display === 'flex';
  if (isOpen) {
    _okbmCloseReportYearDropdown();
    return;
  }

  var validLogs = window._getRomanticRouteOutdoorLogs();
  var curYearNum = new Date().getFullYear();
  var yearSet = new Set([String(curYearNum)]);
  validLogs.forEach(function(r) {
    var y = String(r.date || '').slice(0, 4);
    if (y.length === 4 && !isNaN(parseInt(y, 10))) yearSet.add(y);
  });
  var sortedYears = Array.from(yearSet).sort().reverse();

  menu.innerHTML = sortedYears.map(function(y) {
    var isSel = (window._selectedReportYear === y);
    return '<button type="button" onclick="window.selectReportYear(\'' + y + '\', event)" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(186,230,253,0.12)' : 'transparent') + '; color:' + (isSel ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 8px; font-size:0.74rem; font-weight:800; font-family:var(--font-en); border-radius:4px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">' +
      '<span>' + y + '년</span>' +
      (isSel ? '<span style="color:#bae6fd; font-size:0.67rem;">✓</span>' : '') +
    '</button>';
  }).join('');

  menu.style.display = 'flex';

  _okbmUnbindReportYearDdClick();
  _okbmReportYearDdClickHandler = function(ev) {
    if (!menu.contains(ev.target)) {
      _okbmCloseReportYearDropdown();
    }
  };
  _okbmReportYearDdClickTimer = setTimeout(function() {
    _okbmReportYearDdClickTimer = null;
    if (_okbmReportYearDdClickHandler) {
      document.addEventListener('click', _okbmReportYearDdClickHandler);
    }
  }, 10);
};

// [선택 연도 활동 메모 인라인 인출 & 토글 엔진]
window.toggleReportYearActivities = function(e) {
  if (e) e.stopPropagation();
  triggerHaptic(8);
  var container = document.getElementById('reportYearActivityContainer');
  var arrow = document.getElementById('reportYearListArrow');
  if (!container) return;

  var isOpen = container.style.display === 'flex';
  if (isOpen) {
    container.style.display = 'none';
    if (arrow) arrow.innerText = '기록보기 ▼';
    return;
  }

  container.style.display = 'flex';
  if (arrow) arrow.innerText = '접기 ▲';
  window.renderReportYearActivityList();
};

window.renderReportYearActivityList = function() {
  var listEl = document.getElementById('reportYearActivityList');
  var titleEl = document.getElementById('reportYearActivityTitle');
  if (!listEl) return;

  var curYear = window._selectedReportYear || String(new Date().getFullYear());

  // 순수 낭만루트(아웃도어 정식 등록물) 단일 인출
  var validLogs = window._getRomanticRouteOutdoorLogs();

  // 선택 연도 필터링 및 최신 날짜순 정렬 (상단 카운터 숫자와 100% 일치)
  var yearLogs = validLogs.filter(function(r) {
    return String(r.date || '').includes(curYear);
  }).sort(function(a, b) {
    var ta = new Date(String(a.date || '').replace(/\./g, '-')).getTime() || 0;
    var tb = new Date(String(b.date || '').replace(/\./g, '-')).getTime() || 0;
    return tb - ta;
  });

  if (titleEl) {
    titleEl.innerText = curYear + '년 활동 (' + yearLogs.length + ')';
  }

  if (yearLogs.length === 0) {
    listEl.innerHTML = '<div style="font-size:0.66rem; color:#64748b; text-align:center; padding:10px 0;">기록이 없습니다.</div>';
    return;
  }

  listEl.innerHTML = yearLogs.map(function(r, idx) {
    var spotName = r.spot || r.spotName || '-';
    var dStr = String(r.date || '').slice(0, 10);

    return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:5px 6px; border-radius:4px; background:rgba(255,255,255,0.02); min-width:0;">' +
      '<div style="display:flex; align-items:center; gap:5px; min-width:0; flex:1;">' +
        '<span style="font-size:0.64rem; color:#bae6fd; font-family:var(--font-en); font-weight:800; flex-shrink:0;">' + (idx + 1) + '.</span>' +
        '<span style="font-size:0.72rem; color:#e2e8f0; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;">' + _escapeReportPropHtml(spotName) + '</span>' +
      '</div>' +
      '<span style="font-size:0.64rem; color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + _escapeReportPropHtml(dStr) + '</span>' +
    '</div>';
  }).join('');
};

window.selectReportYear = function(yearStr, e) {
  if (e) e.stopPropagation();
  triggerHaptic(10);
  window._selectedReportYear = yearStr;

  _okbmCloseReportYearDropdown();

  if (typeof window.refreshMyReportFullStats === 'function') {
    window.refreshMyReportFullStats();
  }

  window.__reportRenderCache = {};

  var container = document.getElementById('reportYearActivityContainer');
  if (container && container.style.display === 'flex') {
    window.renderReportYearActivityList();
  }

  // 현재 펼쳐져 있는 아코디언이 있다면 새 연도 컨텍스트로 실시간 재계산
  ['myprops', 'gear', 'terrain', 'season', 'region'].forEach(function(secKey) {
    var body = document.getElementById('accBody_' + secKey);
    if (body && body.style.display === 'flex') {
      var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
        ? window._getRomanticRouteOutdoorLogs()
        : [];
      if (secKey === 'gear') window._renderGearModule(validLogs, body);
      else if (secKey === 'terrain') window._renderTerrainModule(validLogs, body);
      else if (secKey === 'season') window._renderSeasonModule(validLogs, body);
      else if (secKey === 'region') window._renderRegionModule(validLogs, body);
      else if (secKey === 'myprops') window._renderMyPropsModule(body);
      window.__reportRenderCache[secKey] = true;
    }
  });
};

// [지형/시즌/지역 커스텀 다크 팝오버 셀렉터 토글러]
window.toggleModuleCustomDropdown = function(moduleKey, e) {
  if (e) e.stopPropagation();
  triggerHaptic(8);
  var menu = document.getElementById('customDropdownMenu_' + moduleKey);
  if (!menu) return;
  var isOpen = menu.style.display === 'flex';
  if (isOpen) {
    _okbmCloseModuleCustomDropdowns();
    return;
  }

  _okbmCloseModuleCustomDropdowns();
  menu.style.display = 'flex';

  _okbmModuleCustomDdClickHandler = function(ev) {
    if (!menu.contains(ev.target)) {
      _okbmCloseModuleCustomDropdowns();
    }
  };
  _okbmModuleCustomDdClickTimer = setTimeout(function() {
    _okbmModuleCustomDdClickTimer = null;
    if (_okbmModuleCustomDdClickHandler) {
      document.addEventListener('click', _okbmModuleCustomDdClickHandler);
    }
  }, 10);
};

// 마이데이터 & 인증 모달 일원화 DOM 마운터
function ensureMyReportAndAuthModalsInDOM() {
  _okbmCloseReportYearDropdown();
  _okbmCloseModuleCustomDropdowns();
  var oldBundle = document.getElementById('romanticAuthDomBundle');
  if (oldBundle) oldBundle.remove();
  var oldOverlay = document.getElementById('userProfileModalOverlay');
  if (oldOverlay) oldOverlay.remove();
  var oldLogin = document.getElementById('loginModalOverlay');
  if (oldLogin) oldLogin.remove();

  var container = document.createElement('div');
  container.id = 'romanticAuthDomBundle';
  container.innerHTML = `
   <!-- 1. 소셜 로그인 모달 (Apple / 카카오 / 네이버 / Google) -->
    <div class="custom-modal-overlay" id="loginModalOverlay" onclick="if(event.target===this) closeLoginModal();" style="display:none; position:fixed; inset:0; background:#000000; z-index:99999; justify-content:center; align-items:center; width:100%; height:100%; overscroll-behavior:none !important; padding:0; overflow:hidden;">
      <div style="width:100%; max-width:320px; margin:0 auto; display:flex; flex-direction:column; justify-content:center; align-items:center; box-sizing:border-box; position:relative; padding:0 16px; transform:translateY(-20%); -webkit-transform:translateY(-20%);">
        <div style="width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:10px; text-align:center; box-sizing:border-box;">
          <img src="logo.png" alt="낭만루트 로고" style="width:64px; height:64px; object-fit:contain; display:block;" />
          <div>
            <h3 style="color:#ffffff; font-size:1.02rem; font-weight:900; letter-spacing:-0.02em; margin:0;">낭만루트 로그인</h3>
            <p style="font-size:0.72rem; color:#94a3b8; line-height:1.4; margin-top:5px; margin-bottom:0; word-break:keep-all;">
              로그인후 낭만루트의 모든 기능을 이용하실수 있습니다.
            </p>
          </div>
          <div style="width:100%; display:flex; flex-direction:column; gap:7px; margin-top:6px;">
            <button type="button" class="modal-btn btn-social-apple" onclick="loginWithApple()" style="display:none !important; width:100%; height:34px !important; min-height:34px !important; border-radius:8px !important; font-size:0.76rem !important; font-weight:800 !important; padding:0 10px !important; cursor:pointer; align-items:center; justify-content:center; gap:6px; background:#ffffff; color:#000000; border:none;">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#000000" aria-hidden="true"><path d="M16.365 1.43c0 1.14-.422 2.198-1.164 3.01-.85.93-2.02 1.552-3.215 1.462-.146-1.09.41-2.247 1.154-3.11C14.03 1.79 15.27 1.16 16.365 1.43zM20.52 17.39c-.55 1.275-.81 1.84-1.52 2.97-1.01 1.57-2.43 3.52-4.18 3.535-1.555.02-1.96-1.01-4.08-.995-2.12.015-2.57 1.02-4.125.995-1.75-.02-3.09-1.78-4.1-3.35C.74 17.06.27 12.2 2.05 9.42c1.23-1.95 3.17-3.09 5.01-3.09 1.87 0 3.045 1.02 4.595 1.02 1.51 0 2.43-1.03 4.6-1.03 1.64 0 3.37.89 4.6 2.43-4.04 2.22-3.39 8.01.665 8.64z"/></svg>
              <span>Apple로 계속하기</span>
            </button>
            <button type="button" class="modal-btn btn-social-kakao" onclick="loginWithKakao()" style="width:100%; height:34px !important; min-height:34px !important; border-radius:8px !important; font-size:0.76rem !important; font-weight:800 !important; padding:0 10px !important; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; background:#fee500; color:#191919; border:none;">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="#191919" d="M12 4C6.48 4 2 7.58 2 12.02c0 2.9 1.94 5.45 4.84 6.9-.15.56-.54 2.03-.62 2.35-.09.33.12.46.38.27.16-.07 2.55-1.73 3.58-2.44.6.09 1.21.13 1.82.13 5.52 0 10-3.58 10-8.02C22 7.58 17.52 4 12 4z"/></svg>
              <span>카카오 1초 간편 로그인</span>
            </button>
            <button type="button" class="modal-btn btn-social-naver" onclick="loginWithNaver()" style="width:100%; height:34px !important; min-height:34px !important; border-radius:8px !important; font-size:0.76rem !important; font-weight:800 !important; padding:0 10px !important; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; background:#03c75a; color:#ffffff; border:none;">
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path fill="#ffffff" d="M15.5 4v8.35L8.55 4H4v16h4.5v-8.35L15.45 20H20V4h-4.5z"/></svg>
              <span>네이버로 시작하기</span>
            </button>
            <button type="button" class="modal-btn btn-social-google" onclick="loginWithGoogle()" style="width:100%; height:34px !important; min-height:34px !important; border-radius:8px !important; font-size:0.76rem !important; font-weight:800 !important; padding:0 10px !important; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; background:#ffffff; color:#1f2937; border:1px solid rgba(255,255,255,0.2);">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              <span>Google로 계속하기</span>
            </button>
            <button type="button" class="modal-btn" style="width:100%; height:34px; min-height:34px; background:rgba(255,255,255,0.06); color:#cbd5e1; font-weight:800; font-size:0.72rem; border-radius:8px; border:none; cursor:pointer;" onclick="closeLoginModal()">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>

  <!-- 2. 마이데이터(마이리포트) 대시보드 모달 (인스타그램 프로필 스타일 개편) -->
    <div class="custom-modal-overlay" id="userProfileModalOverlay" onclick="if(event.target===this) closeUserProfileModal();" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:#000000; z-index:3000000; margin:0; padding:0; overflow:hidden;">
      <div style="position:relative; width:100%; max-width:480px; height:100%; margin:0 auto; background:#000000; overflow:hidden; display:flex; flex-direction:column; box-sizing:border-box;">
        
        <header style="position:relative !important; width:100% !important; height:calc(47px + env(safe-area-inset-top, 0px)) !important; min-height:calc(47px + env(safe-area-inset-top, 0px)) !important; max-height:calc(47px + env(safe-area-inset-top, 0px)) !important; background:#000000 !important; border-bottom:none !important; padding:0 16px !important; padding-top:env(safe-area-inset-top, 0px) !important; flex-shrink:0 !important; z-index:60 !important; overflow:hidden !important; box-sizing:border-box !important;">
          <div style="position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:1;">
            <svg viewBox="0 0 24 24" style="position:absolute; top:30%; left:26%; width:5.5px; height:5.5px; fill:#fde047;"><path d="M12,2 Q12,12 2,12 Q12,12 12,22 Q12,12 22,12 Q12,12 12,2 Z"/><circle cx="12" cy="12" r="1.5" fill="#ffffff"/></svg>
            <svg viewBox="0 0 24 24" style="position:absolute; top:42%; left:67%; width:6.0px; height:6.0px; fill:#e2e8f0;"><path d="M12,2 Q12,12 2,12 Q12,12 12,22 Q12,12 22,12 Q12,12 12,2 Z"/><circle cx="12" cy="12" r="1.5" fill="#ffffff"/></svg>
            <div style="position:absolute; top:65%; left:14%; width:1.2px; height:1.2px; border-radius:50%; background:#ffffff;"></div>
            <div style="position:absolute; top:24%; left:45%; width:1.0px; height:1.0px; border-radius:50%; background:#fde047;"></div>
            <div style="position:absolute; top:70%; left:53%; width:1.6px; height:1.6px; border-radius:50%; background:#cbd5e1;"></div>
            <div style="position:absolute; top:25%; left:82%; width:1.2px; height:1.2px; border-radius:50%; background:#ffffff;"></div>
            <div style="position:absolute; top:68%; left:93%; width:1.0px; height:1.0px; border-radius:50%; background:#fde047;"></div>
          </div>
          <div style="height:47px !important; display:flex !important; align-items:center !important; justify-content:space-between !important; max-width:480px !important; margin:0 auto !important; position:relative !important; z-index:2 !important;">
            <div style="height:47px !important; display:inline-flex !important; align-items:center !important; gap:8px !important; text-decoration:none !important; cursor:default !important;">
              <div style="width:30px !important; height:30px !important; min-width:30px !important; min-height:30px !important; max-width:30px !important; max-height:30px !important; display:flex !important; align-items:center !important; justify-content:center !important; flex-shrink:0 !important; overflow:hidden !important;">
                <img src="logo.png" alt="낭만루트 로고" style="width:28px !important; height:28px !important; object-fit:contain !important; display:block !important;" />
              </div>
              <span style="font-size:1.2rem !important; font-weight:900 !important; letter-spacing:-0.035em !important; line-height:1 !important; color:#ffffff !important; display:inline-block !important;">낭만루트</span>
            </div>
          </div>
        </header>

        <div id="reportProfileHeaderContainer" style="flex-shrink:0; width:100%; box-sizing:border-box;"></div>

        <!-- 2단 본문 (헤더와 독 사이를 정확히 꽉 채우는 안전 스크롤 바디) -->
        <div id="userProfileScrollBody" style="flex:1 1 0%; min-height:0; width:100%; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:contain; padding:12px 12px 20px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; z-index:10;">
          
          <!-- 올해 vs 누적 활동 듀얼 카운터 -->
          <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px; flex-shrink:0;">
            <div role="button" onclick="window.toggleReportYearActivities(event)" style="cursor:pointer; position:relative; min-width:0; background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; user-select:none; box-sizing:border-box;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; min-width:0;">
                <span id="reportYearCardLabel" style="font-size:0.77rem; color:#64748b; font-weight:700;">올해 활동</span>
                <button type="button" id="reportYearBadgeBtn" onclick="event.stopPropagation(); window.toggleReportYearDropdown(event);" style="font-size:0.70rem; color:#bae6fd; font-family:var(--font-en); font-weight:800; background:rgba(186,230,253,0.08); border:1px solid rgba(186,230,253,0.25); padding:2px 7px; border-radius:5px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; outline:none; flex-shrink:0;">
                  <span id="reportYearBadge">2026</span>
                  <svg viewBox="0 0 24 24" style="width:9px; height:9px; stroke:#bae6fd; fill:none; stroke-width:2.5;"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
              <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:flex-end; gap:6px; min-width:0;">
                <div>
                  <span id="reportYearCountNumber" style="font-size:1.72rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1;">0</span>
                  <span style="font-size:0.87rem; font-weight:700; color:#7dd3fc; margin-left:2px;">회</span>
                </div>
                <span id="reportYearListArrow" style="font-size:0.64rem; color:#64748b; font-weight:800; margin-bottom:2px; flex-shrink:0;">기록보기 ▼</span>
              </div>
              <div id="reportYearDropdownMenu" style="display:none; position:absolute; top:36px; right:10px; min-width:86px; max-height:180px; overflow-y:auto; background:#0d121d; border:1px solid rgba(186,230,253,0.25); border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.85); z-index:100; padding:4px; box-sizing:border-box; flex-direction:column; gap:2px;"></div>
            </div>

            <div style="min-width:0; background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; box-sizing:border-box;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span style="font-size:0.77rem; color:#64748b; font-weight:700;">누적 총 활동</span>
                <span style="font-size:0.68rem; color:#fde68a; font-weight:700; background:rgba(253,230,138,0.08); border:1px solid rgba(253,230,138,0.2); padding:1px 5px; border-radius:4px; flex-shrink:0;">전체</span>
              </div>
              <div style="margin-top:4px;">
                <span id="reportTotalCountNumber" style="font-size:1.72rem; font-weight:900; color:#fde68a; font-family:var(--font-en); line-height:1;">0</span>
                <span style="font-size:0.87rem; font-weight:700; color:#fef08a; margin-left:2px;">회</span>
              </div>
            </div>
          </div>

          <!-- 선택 연도 활동 인라인 아코디언 패널 -->
          <div id="reportYearActivityContainer" style="display:none; flex-direction:column; gap:4px; background:#080b11; border:1px solid rgba(186,230,253,0.15); border-radius:10px; padding:8px 10px; box-sizing:border-box; flex-shrink:0; min-width:0; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span id="reportYearActivityTitle" style="font-size:0.70rem; color:#bae6fd; font-weight:800; font-family:var(--font-en);">활동 기록</span>
            </div>
            <div id="reportYearActivityList" style="display:flex; flex-direction:column; gap:2px; max-height:200px; overflow-y:auto; -webkit-overflow-scrolling:touch; padding-right:2px;"></div>
          </div>

          <!-- 1. 장비 & 세팅 무게 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0; min-width:0;">
            <div role="button" data-sec="gear" onclick="window.handleReportSecClick('gear')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(167,243,208,0.08); display:flex; align-items:center; justify-content:center; color:#a7f3d0; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v6H6zM4 8h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/></svg>
                </div>
                <span style="font-size:0.90rem; font-weight:700; color:#e2e8f0;">장비 & 세팅 무게</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderGearStat" style="font-size:0.76rem; color:#a7f3d0; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_gear" style="font-size:0.70rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_gear" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px; min-width:0; box-sizing:border-box;"></div>
          </div>

          <!-- 2. 고도 & 필드 지형 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0; min-width:0;">
            <div role="button" data-sec="terrain" onclick="window.handleReportSecClick('terrain')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(186,230,253,0.08); display:flex; align-items:center; justify-content:center; color:#bae6fd; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                </div>
                <span style="font-size:0.90rem; font-weight:700; color:#e2e8f0;">고도 & 필드 지형</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderTerrainStat" style="font-size:0.76rem; color:#bae6fd; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_terrain" style="font-size:0.70rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_terrain" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px; min-width:0; box-sizing:border-box;"></div>
          </div>

          <!-- 3. 시즌 밸런스 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0; min-width:0;">
            <div role="button" data-sec="season" onclick="window.handleReportSecClick('season')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(253,230,138,0.08); display:flex; align-items:center; justify-content:center; color:#fde68a; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>
                </div>
                <span style="font-size:0.90rem; font-weight:700; color:#e2e8f0;">시즌 밸런스</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderSeasonStat" style="font-size:0.76rem; color:#fde68a; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_season" style="font-size:0.70rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_season" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px; min-width:0; box-sizing:border-box;"></div>
          </div>

          <!-- 4. 지역 분포 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0; min-width:0;">
            <div role="button" data-sec="region" onclick="window.handleReportSecClick('region')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(233,213,255,0.08); display:flex; align-items:center; justify-content:center; color:#e9d5ff; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span style="font-size:0.90rem; font-weight:700; color:#e2e8f0;">지역 분포</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderRegionStat" style="font-size:0.76rem; color:#e9d5ff; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_region" style="font-size:0.70rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_region" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px; min-width:0; box-sizing:border-box;"></div>
          </div>

          <!-- 5. 내가 제보한 장소 (등록 전 수정 기능) -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0; min-width:0;">
            <div role="button" data-sec="myprops" onclick="window.handleReportSecClick('myprops')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <span style="font-size:0.90rem; font-weight:700; color:#e2e8f0;">내가 제보한 장소</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderMyPropsStat" style="font-size:0.76rem; color:#38bdf8; font-weight:700; font-family:var(--font-en);">0곳</span>
                <span id="accArrow_myprops" style="font-size:0.70rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_myprops" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px; min-width:0; box-sizing:border-box;"></div>
          </div>

          <!-- 과거 추억 등록 -->
          <button type="button" onclick="window.openPastTripRegisterModal(event);" style="width:100%; height:44px; background:#080b11; border:1.5px solid rgba(186,230,253,0.3); border-radius:10px; color:#f1f5f9; font-size:0.92rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px; margin-bottom:12px; flex-shrink:0; box-shadow:0 4px 15px rgba(0,0,0,0.8);">
            <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:#bae6fd; fill:none; stroke-width:2;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
            <span>과거 추억 등록</span>
          </button>

        </div>

       </div>
    </div>

    <!-- 3. 계정 관리 모달 -->
    <div class="custom-modal-overlay" id="userAccountSettingsModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); background:#000000; z-index:2147483642 !important; justify-content:center; align-items:stretch; width:100%; height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); padding:0; overflow:hidden;">
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
        <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box;">
          <button type="button" onclick="document.getElementById('userAccountSettingsModal').style.display='none'; if(typeof window.goBackModal==='function'){ window.goBackModal(event); } else { openUserProfileModal(); }" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.95rem; font-weight:900; color:#ffffff;">계정 관리</span>
          <div style="width:30px;"></div>
        </div>

       <div style="flex:1 1 0%; min-height:0; overflow-y:auto; padding:20px 16px; display:flex; flex-direction:column; gap:14px; box-sizing:border-box;">
          <!-- 메인 대표 사진 설정 카드 (SSOT: 마이리포트 아바타 & 낭만보관함 배경 연동) -->
          <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="color:#ffffff; font-size:0.78rem; font-weight:900;">메인 대표 사진</span>
                <p style="color:#64748b; font-size:0.62rem; margin-top:2px;">마이리포트 아바타 및 낭만보관함 배경에 즉시 반영됩니다.</p>
              </div>
              <div id="settingsModalCoverPreviewWrap" onclick="window.previewMasterUserCoverPhotoLarge();" title="터치하여 사진 크게 보기" style="width:48px; height:48px; border-radius:50%; border:1.5px solid rgba(186,230,253,0.4); background:#090d14; background-size:cover; background-position:center; background-repeat:no-repeat; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.6);">
                <svg id="settingsModalCoverDefaultSvg" viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="#64748b" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>
        
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:2px;">
              <button type="button" id="btnTriggerUploadCover" onclick="document.getElementById('masterUserCoverFileInput').click();" style="height:38px; min-height:38px; background:rgba(186,230,253,0.12); border:1px solid rgba(186,230,253,0.35); color:#bae6fd; font-size:0.74rem; font-weight:800; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>사진 변경</span>
              </button>
              <button type="button" onclick="window.resetMasterUserCoverPhoto();" style="height:38px; min-height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; font-size:0.74rem; font-weight:800; border-radius:8px; cursor:pointer;">
                기본값 복원
              </button>
            </div>
            <input type="file" id="masterUserCoverFileInput" accept="image/*" style="display:none;" onchange="window.uploadMasterUserCoverPhoto(event);" />
          </div>

          <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:6px;">
            <label style="color:#94a3b8; font-size:0.75rem; font-weight:800;">활동 닉네임 변경 (14일 쿨다운)</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="settingsModalNicknameInput" class="modal-input" placeholder="새 닉네임 입력" style="flex:1; height:42px; font-size:0.86rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:8px; padding:0 10px; outline:none;" />
              <button type="button" class="modal-btn" style="background:#ffffff; color:#000000; font-weight:900; padding:0 16px; height:42px; border-radius:8px; border:none; cursor:pointer;" onclick="saveNicknameFromSettingsModal()">변경</button>
            </div>
            <div id="settingsModalCooldownNotice" style="font-size:0.68rem; margin-top:4px; font-weight:800; display:flex; align-items:center; gap:4px;"></div>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.12); border-radius:12px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#94a3b8; font-size:0.75rem; font-weight:700;">가입날짜</span>
            <span id="settingsModalJoinDate" style="color:#e2e8f0; font-family:var(--font-mono); font-size:0.80rem; font-weight:800;">2026.01.01</span>
          </div>

          <button type="button" onclick="window.openBlockedUsersModal();" style="width:100%; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; text-align:left; box-sizing:border-box;">
            <span style="color:#ffffff; font-size:0.78rem; font-weight:900;">차단한 사용자 관리</span>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              <span id="settingsBlockedUsersCount" style="font-size:0.66rem; color:#94a3b8; font-weight:800; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:8px;">없음</span>
              <span style="color:#64748b; font-size:1rem; font-weight:700; line-height:1;">›</span>
            </div>
          </button>

          <div id="settingsSocialLinkCard" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px;">
            <span style="color:#ffffff; font-size:0.78rem; font-weight:900;">소셜 계정 연결</span>
            <p style="color:#64748b; font-size:0.62rem; margin:0; line-height:1.45;">이미 로그인한 상태에서만 다른 소셜 로그인을 같은 계정에 연결합니다. 이메일만 같다고 자동으로 합치지 않습니다.</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <button type="button" id="settingsLinkKakaoBtn" onclick="window.okbmLinkKakaoAccount && window.okbmLinkKakaoAccount();" style="height:38px; background:#fee500; border:none; color:#191919; font-size:0.74rem; font-weight:800; border-radius:8px; cursor:pointer;">카카오 연결</button>
              <button type="button" id="settingsLinkNaverBtn" onclick="window.okbmLinkNaverAccount && window.okbmLinkNaverAccount();" style="height:38px; background:#03c75a; border:none; color:#ffffff; font-size:0.74rem; font-weight:800; border-radius:8px; cursor:pointer;">네이버 연결</button>
            </div>
          </div>

          <button type="button" class="modal-btn" style="background:rgba(244,63,94,0.15); border:1px solid #f43f5e; color:#fda4af; font-weight:800; height:42px; border-radius:10px; margin-top:6px; font-size:0.82rem; cursor:pointer;" onclick="document.getElementById('userAccountSettingsModal').style.display='none'; closeUserProfileModal(); logoutUser();">
            로그아웃
          </button>
          <button type="button" id="settingsModalDeleteAccountBtn" class="modal-btn" style="background:transparent; border:1px solid rgba(251,113,133,0.42); color:#fb7185; font-weight:800; height:42px; border-radius:10px; margin-top:2px; font-size:0.82rem; cursor:pointer;" onclick="if(typeof window.confirmUserAccountDeletion==='function'){ window.confirmUserAccountDeletion(); }">
            회원 탈퇴
          </button>
        </div>
        <div></div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
}

window.__reportRenderCache = {};

function _escapeReportPropHtml(str) {
  return window.escapeHtml(str);
}

window.handleReportSecClick = function(secKey) {
  triggerHaptic(8);
  var body = document.getElementById('accBody_' + secKey);
  var arrow = document.getElementById('accArrow_' + secKey);
  if (!body) return;

  var isCurrentlyOpen = (body.style.display === 'flex');

  if (isCurrentlyOpen) {
    body.style.display = 'none';
    if (arrow) arrow.innerText = '▼';
    return;
  }

  body.style.display = 'flex';
  if (arrow) arrow.innerText = '▲';

  if (secKey !== 'myprops' && window.__reportRenderCache[secKey] && body.children.length > 0) return;

  // 순수 낭만루트(아웃도어 정식 등록물) 단일 정본 인출
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];

  if (secKey === 'myprops') {
    window._renderMyPropsModule(body);
  } else if (secKey === 'gear') {
    window._renderGearModule(validLogs, body);
  } else if (secKey === 'terrain') {
    window._renderTerrainModule(validLogs, body);
  } else if (secKey === 'season') {
    window._renderSeasonModule(validLogs, body);
  } else if (secKey === 'region') {
    window._renderRegionModule(validLogs, body);
  }

  window.__reportRenderCache[secKey] = true;
};

window.okbmProposalStatusKind = function(p) {
  var s = String((p && p.status) || '').trim();
  if (s.indexOf('반려') !== -1 || s.indexOf('거절') !== -1) return 'rejected';
  if (s.indexOf('반영완료') !== -1 || s.indexOf('채택') !== -1 || s.indexOf('승인') !== -1) return 'accepted';
  if (s.indexOf('반영실패') !== -1) return 'pending';
  return 'pending';
};

window.okbmResolveProposalSpotId = function(p, spotsList) {
  if (!p) return '';
  var id = String(p.approved_spot_id || p.approvedSpotId || '').trim();
  if (id) return id;
  if (p.is_correction || p.isCorrection || p.type === 'correction') {
    var orig = String(p.orig_spot_id || p.origSpotId || '').trim();
    if (orig) return orig;
  }
  var list = spotsList || window.spots || [];
  if (!Array.isArray(list) || !list.length) return '';
  var name = String(p.spot_main || p.name || '').trim();
  var plat = parseFloat(p.lat || p.campsite_lat);
  var plng = parseFloat(p.lng || p.campsite_lng);
  var hit = list.find(function(s) {
    if (!s) return false;
    if (name && String(s.spot_main || s.name || '').trim() === name) return true;
    if (isFinite(plat) && isFinite(plng) && plat && plng) {
      return Math.abs(parseFloat(s.lat) - plat) < 0.003 && Math.abs(parseFloat(s.lng) - plng) < 0.003;
    }
    return false;
  });
  return hit ? String(hit.id || '').trim() : '';
};

// 0. 내가 제보한 장소 목록 렌더러 및 등록 전 수정/삭제 모듈
window._renderMyPropsModule = function(el) {
  if (!el) return;
  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  if (!Array.isArray(myProps)) myProps = [];

  var validProps = myProps.filter(Boolean);

  var hStat = document.getElementById('reportHeaderMyPropsStat');
  if (hStat) hStat.innerText = validProps.length + '곳';

  if (validProps.length === 0) {
    el.innerHTML = '<div style="font-size:0.74rem; color:#64748b; text-align:center; padding:12px 0;">아직 제보한 박지가 없습니다. 소중한 박지를 제보해주세요!</div>';
    return;
  }

  var listHtml = validProps.map(function(p, idx) {
    var isCorr = Boolean(p.is_correction || p.isCorrection || p.type === 'correction');
    var kind = window.okbmProposalStatusKind(p);
    var rawMainName = p.spot_main || p.name || '무명 장소';
    var mainName = _escapeReportPropHtml(rawMainName);
    var subName = p.spot_sub ? ('(' + _escapeReportPropHtml(p.spot_sub) + ')') : '';
    var dateStr = _escapeReportPropHtml(String(p.date || p.created_at || '').slice(0, 10));
    var rawEntry = p.trailhead_addr || p.entry || '들머리 미기재';
    var entryStr = _escapeReportPropHtml(rawEntry);
    var safeId = _escapeReportPropHtml(String(p.id || ''));
    var statusHtml = kind === 'accepted'
      ? '<span style="font-size:0.62rem; background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(52,211,153,0.35); border-radius:3px; padding:1px 4px; font-weight:800;">채택</span>'
      : (kind === 'rejected'
        ? '<span style="font-size:0.62rem; background:rgba(244,63,94,0.15); color:#fb7185; border:1px solid rgba(244,63,94,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">반려</span>'
        : '<span style="font-size:0.62rem; background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">검수중</span>');
    var actionsHtml = '';
    if (kind === 'accepted') {
      actionsHtml = '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerCorrectionFromMyProposal(this.getAttribute(\'data-prop-id\'))" style="background:rgba(251,191,36,0.12); border:1px solid #fbbf24; color:#fde047; font-size:0.74rem; font-weight:800; border-radius:5px; padding:4px 8px; cursor:pointer;">수정문의</button>';
    } else if (kind === 'rejected') {
      actionsHtml = '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerDeleteProposalFromReport(this.getAttribute(\'data-prop-id\'))" style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.74rem; font-weight:800; border-radius:5px; padding:4px 8px; cursor:pointer;">삭제</button>';
    } else {
      actionsHtml =
        '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerEditProposalFromReport(this.getAttribute(\'data-prop-id\'))" style="background:rgba(56,189,248,0.12); border:1px solid #38bdf8; color:#38bdf8; font-size:0.74rem; font-weight:800; border-radius:5px; padding:4px 8px; cursor:pointer;">수정</button>' +
        '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerDeleteProposalFromReport(this.getAttribute(\'data-prop-id\'))" style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.74rem; font-weight:800; border-radius:5px; padding:4px 8px; cursor:pointer;">삭제</button>';
    }

    return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 9px; min-width:0; box-sizing:border-box;">' +
      '<div style="display:flex; flex-direction:column; min-width:0; flex:1; padding-right:4px;">' +
        '<div style="display:flex; align-items:center; gap:4px; min-width:0;">' +
          '<span style="font-size:0.70rem; color:#38bdf8; font-weight:900; flex-shrink:0;">' + (idx + 1) + '.</span>' +
          '<span style="font-size:0.84rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;">' + mainName + ' ' + subName + '</span>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:4px; margin-top:3px; flex-wrap:wrap;">' +
          (isCorr
            ? '<span style="font-size:0.62rem; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">수정건의</span>'
            : '<span style="font-size:0.62rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">신규제보</span>') +
          statusHtml +
        '</div>' +
        '<span style="font-size:0.66rem; color:#64748b; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + entryStr + ' · ' + dateStr + '</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">' +
        actionsHtml +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = '<div style="font-size:0.68rem; color:#94a3b8; margin:4px 0 4px 2px; line-height:1.4;">검수 중에는 수정·삭제가 가능하고, 채택되면 수정문의만 할 수 있습니다.</div>' +
    '<div style="display:flex; flex-direction:column; gap:4px;">' +
      listHtml +
    '</div>';
};

window.triggerEditProposalFromReport = function(propId) {
  triggerHaptic(12);
  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  var target = (Array.isArray(myProps) ? myProps : []).find(function(p) { return p && String(p.id) === String(propId); });
  if (target && window.okbmProposalStatusKind(target) === 'accepted') {
    if (typeof showToast === 'function') showToast('채택된 제보는 수정할 수 없습니다. 수정문의로 신청해주세요.', 'warn');
    return;
  }
  closeUserProfileModal();
  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  if (isMapPage && typeof window.openEditMyProposal === 'function') {
    window.openEditMyProposal(propId);
  } else {
    window.location.assign('map.html?edit_proposal=' + encodeURIComponent(propId));
  }
};

window.triggerCorrectionFromMyProposal = function(propId) {
  triggerHaptic(12);
  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  var target = (Array.isArray(myProps) ? myProps : []).find(function(p) { return p && String(p.id) === String(propId); });
  if (!target) {
    if (typeof showToast === 'function') showToast('해당 제보 내역을 찾을 수 없습니다.', 'warn');
    return;
  }
  try { sessionStorage.setItem('okbm_pending_correction_proposal', JSON.stringify(target)); } catch (e) {}
  if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  if (isMapPage && typeof window.openSpotCorrectionFromProposal === 'function') {
    window.openSpotCorrectionFromProposal(target);
    return;
  }
  var spotId = window.okbmResolveProposalSpotId(target);
  var url = 'map.html?correction_proposal=' + encodeURIComponent(String(target.id || ''));
  if (spotId) url += '&correction_spot=' + encodeURIComponent(spotId);
  window.location.assign(url);
};

window.triggerDeleteProposalFromReport = function(propId) {
  if (!propId) return;
  triggerHaptic(12);
  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  if (!Array.isArray(myProps)) myProps = [];

  var targetItem = myProps.find(function(p) { return p && String(p.id) === String(propId); });
  if (targetItem && window.okbmProposalStatusKind(targetItem) === 'accepted') {
    if (typeof showToast === 'function') showToast('채택된 제보는 삭제할 수 없습니다. 수정문의로 신청해주세요.', 'warn');
    return;
  }
  if (!confirm('이 제보 내역을 삭제하시겠습니까?')) return;

  var isCorr = targetItem ? Boolean(targetItem.is_correction || targetItem.isCorrection || targetItem.type === 'correction') : false;

  var filtered = myProps.filter(function(p) { return p && String(p.id) !== String(propId); });

  if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
    window.RomanticVault.write('okbm_my_proposals', filtered, true);
  }
  if (typeof window.safeSetStorage === 'function') {
    window.safeSetStorage('okbm_my_proposals', filtered);
  }
  try { localStorage.setItem('okbm_my_proposals', JSON.stringify(filtered)); } catch(e) {}

  if (window.__reportRenderCache && window.__reportRenderCache['myprops']) {
    delete window.__reportRenderCache['myprops'];
  }

  if (typeof window.deleteProposalFromSupabase === 'function') {
    window.deleteProposalFromSupabase(propId, isCorr).catch(function() {});
  }

  if (typeof syncUserDataToCloud === 'function') {
    syncUserDataToCloud(true);
  }

  var body = document.getElementById('accBody_myprops');
  if (body) {
    window._renderMyPropsModule(body);
  }
  var hStat = document.getElementById('reportHeaderMyPropsStat');
  if (hStat) hStat.innerText = filtered.length + '곳';

  if (typeof showToast === 'function') {
    showToast('제보 내역이 삭제되었습니다.', 'info');
  }
};
// 1. 장비 & 세팅 무게 연산 모듈 (낭만루트 정본 단일 연동)
window._gearModuleState = window._gearModuleState || {
  season: 'all',
  dietMode: 'month',
  activeSlot: null
};

window._setGearSeasonFilter = function(seasonKey) {
  triggerHaptic(8);
  window._gearModuleState.season = seasonKey;
  var body = document.getElementById('accBody_gear');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderGearModule(validLogs, body);
};

window._setGearDietMode = function(modeKey) {
  triggerHaptic(8);
  window._gearModuleState.dietMode = modeKey;
  var body = document.getElementById('accBody_gear');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderGearModule(validLogs, body);
};

window._toggleGearSlotTop5 = function(slotName) {
  triggerHaptic(10);
  window._gearModuleState.activeSlot = (window._gearModuleState.activeSlot === slotName) ? null : slotName;
  var body = document.getElementById('accBody_gear');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderGearModule(validLogs, body);
};

window._renderGearModule = function(validLogs, el) {
  var state = window._gearModuleState;
  var now = Date.now();
  var MS_30D = 30 * 24 * 60 * 60 * 1000;
  var curYear = String(new Date().getFullYear());
  var curMonthStr = curYear + '.' + String(new Date().getMonth() + 1).padStart(2, '0');

  var isConsumable = function(name) {
    return /생수|삼다수|스파클|아이시스|백산수|에비앙|물|water|이소가스|부탄|가스|연료|fuel|gas|핫팩|라면|햇반|음식|food|김치|얼음|ice|커피|티백|맥주|소주|음료|장작|숯|연탄/i.test(name);
  };

  var absoluteMonthWeight = 0;
  var absoluteYearWeight = 0;
  var absoluteTotalWeight = 0;

  validLogs.forEach(function(r) {
    var dStr = String(r.date || '');
    var pTime = new Date(dStr.replace(/\./g, '-')).getTime();
    var isThisYear = dStr.includes(curYear);
    var isThisMonth = dStr.replace(/\s+/g, '').includes(curMonthStr.replace(/\s+/g, '')) || (!isNaN(pTime) && (now - pTime <= MS_30D));
    var w = parseFloat(r.weightKg) || 0;

    if (w > 0) {
      absoluteTotalWeight += w;
      if (isThisYear) absoluteYearWeight += w;
      if (isThisMonth) absoluteMonthWeight += w;
    }
  });

  var filteredLogs = validLogs.filter(function(r) {
    if (state.season === 'all') return true;
    var m = parseInt((String(r.date || '').match(/\d+/g) || [])[1] || '0', 10);
    var isWinter = (m === 12 || m === 1 || m === 2);
    return state.season === 'winter' ? isWinter : !isWinter;
  });

  var allW = [];
  var sumM = 0, cM = 0;
  var sumY = 0, cY = 0;
  var sumFiltered = 0, cFiltered = 0;
  var minC = 0, stdC = 0, hvyC = 0;

  var allHardwareCounts = {};
  var slotDataMap = {};

  var STANDARD_SLOTS = [
    { key: '텐트/쉘터', regex: /텐트|쉘터|타프|비비|폴대|그라운드시트|tent|shelter|tarp/i, color: '#bae6fd' },
    { key: '침낭/매트', regex: /침낭|매트|필로우|베개|에어매트|우경|quilt|mat|sleeping/i, color: '#a7f3d0' },
    { key: '배낭/패킹', regex: /배낭|백팩|디팩|패킹|배낭커버|스탭색|사이드백|pack|backpack/i, color: '#fde68a' },
    { key: '취사/스토브', regex: /버너|스토브|코펠|그리들|쿠커|팬|시에라|주전자|칼|수저|stove|burner|pot/i, color: '#fed7aa' },
    { key: '체어/테이블', regex: /체어|테이블|의자|체어원|롤테이블|체어제로|chair|table/i, color: '#e9d5ff' },
    { key: '조명/전자', regex: /조명|랜턴|헤드랜턴|파워뱅크|보조배터리|크레모아|골제로|lantern|light/i, color: '#fef08a' },
    { key: '의류/방한', regex: /패딩|자켓|우의|장갑|모자|넥워머|바지|jacket|down/i, color: '#cbd5e1' },
    { key: '소품/안전', regex: /구급함|정수기|스틱|나침반|타이벡|비너|소품|firstaid/i, color: '#fecdd3' }
  ];

  STANDARD_SLOTS.forEach(function(s) {
    slotDataMap[s.key] = { color: s.color, counts: {} };
  });

  filteredLogs.forEach(function(r) {
    var dStr = String(r.date || '');
    var pTime = new Date(dStr.replace(/\./g, '-')).getTime();
    var isThisYear = dStr.includes(curYear);
    var isThisMonth = dStr.replace(/\s+/g, '').includes(curMonthStr.replace(/\s+/g, '')) || (!isNaN(pTime) && (now - pTime <= MS_30D));

    var w = parseFloat(r.weightKg) || 0;
    if (w > 0) {
      allW.push({ weight: w, date: dStr });
      sumFiltered += w;
      cFiltered++;

      if (w <= 7.0) minC++;
      else if (w <= 14.0) stdC++;
      else hvyC++;

      if (isThisMonth) { sumM += w; cM++; }
      if (isThisYear) { sumY += w; cY++; }
    }

    var items = Array.isArray(r.items) ? r.items : [];
    items.forEach(function(it) {
      var rawName = String(it.name || it.itemName || '').trim();
      var cleanName = rawName.replace(/\s*\(.*?\)/g, '').trim();
      if (!cleanName || isConsumable(cleanName)) return;

      allHardwareCounts[cleanName] = (allHardwareCounts[cleanName] || 0) + 1;

      var itCat = String(it.category || '').trim();
      var matchedSlot = null;

      for (var i = 0; i < STANDARD_SLOTS.length; i++) {
        var slotDef = STANDARD_SLOTS[i];
        if (itCat && (itCat.includes(slotDef.key) || slotDef.key.includes(itCat))) {
          matchedSlot = slotDef.key;
          break;
        }
      }

      if (!matchedSlot) {
        var textForCheck = cleanName + ' ' + itCat;
        for (var j = 0; j < STANDARD_SLOTS.length; j++) {
          if (STANDARD_SLOTS[j].regex.test(textForCheck)) {
            matchedSlot = STANDARD_SLOTS[j].key;
            break;
          }
        }
      }

      if (matchedSlot && slotDataMap[matchedSlot]) {
        var sObj = slotDataMap[matchedSlot].counts;
        sObj[cleanName] = (sObj[cleanName] || 0) + 1;
      }
    });
  });

  allW.sort(function(a, b) { return a.weight - b.weight; });
  var topMin = allW.slice(0, 3);
  var topMax = allW.slice().reverse().slice(0, 3);

  var sortedHardwareTop5 = Object.keys(allHardwareCounts).map(function(k) {
    return { name: k, count: allHardwareCounts[k] };
  }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

  var pMin = cFiltered > 0 ? Math.round((minC / cFiltered) * 100) : 0;
  var pStd = cFiltered > 0 ? Math.round((stdC / cFiltered) * 100) : 0;
  var pHvy = Math.max(0, 100 - pMin - pStd);

  var hStat = document.getElementById('reportHeaderGearStat');
  if (hStat) hStat.innerText = cFiltered > 0 ? (sumFiltered / cFiltered).toFixed(2) + 'kg' : '0kg';

  var chronoLogs = validLogs.slice().sort(function(a, b) {
    return (new Date(String(a.date || '').replace(/\./g, '-')).getTime() || 0) - (new Date(String(b.date || '').replace(/\./g, '-')).getTime() || 0);
  });

  var dietHtml = '';
  if (state.dietMode === 'year') {
    var yearMap = {};
    chronoLogs.forEach(function(r) {
      var y = String(r.date || '').slice(0, 4);
      var w = parseFloat(r.weightKg) || 0;
      if (y.length === 4 && w > 0) {
        yearMap[y] = yearMap[y] || { sum: 0, count: 0 };
        yearMap[y].sum += w;
        yearMap[y].count++;
      }
    });
    dietHtml = Object.keys(yearMap).sort().map(function(yk) {
      var avgY = (yearMap[yk].sum / yearMap[yk].count).toFixed(2);
      return '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:4px 8px; border-radius:4px; font-size:0.70rem; min-width:0;"><span style="color:#94a3b8; font-family:var(--font-en);">' + yk + '년</span><span style="font-weight:800; color:#bae6fd; font-family:var(--font-en);">' + avgY + 'kg <span style="font-size:0.62rem; color:#64748b; font-weight:normal;">(' + yearMap[yk].count + '회)</span></span></div>';
    }).join('') || '<div style="color:#475569; font-size:0.66rem;">연도별 기록이 없습니다.</div>';
  } else {
    var monthMap = {};
    chronoLogs.forEach(function(r) {
      var ym = String(r.date || '').slice(0, 7).replace(/\.\s*/g, '-');
      var w = parseFloat(r.weightKg) || 0;
      if (ym.length >= 6 && w > 0) {
        monthMap[ym] = monthMap[ym] || { sum: 0, count: 0 };
        monthMap[ym].sum += w;
        monthMap[ym].count++;
      }
    });
    var mKeys = Object.keys(monthMap).sort().slice(-6);
    dietHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(76px, 1fr)); gap:4px;">' +
      mKeys.map(function(mk) {
        var avgM = (monthMap[mk].sum / monthMap[mk].count).toFixed(1);
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 3px; text-align:center; min-width:0;"><div style="font-size:0.62rem; color:#64748b; font-family:var(--font-en);">' + mk.slice(2) + '</div><div style="font-size:0.80rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en); margin-top:1px;">' + avgM + 'kg</div></div>';
      }).join('') + '</div>';
  }

  var activeSlotCardsHtml = '';
  var activeSlotDetailHtml = '';

  var availableSlots = STANDARD_SLOTS.filter(function(s) {
    return Object.keys(slotDataMap[s.key].counts).length > 0;
  });

  if (availableSlots.length > 0) {
    activeSlotCardsHtml = availableSlots.map(function(s) {
      var counts = slotDataMap[s.key].counts;
      var sortedKeys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
      var top1Name = sortedKeys[0] || '-';
      var top1Count = counts[top1Name] || 0;
      var isActive = (state.activeSlot === s.key);
      var safeSlotKey = _escapeReportPropHtml(s.key);
      var safeTop1 = _escapeReportPropHtml(top1Name);

      return '<div onclick="window._toggleGearSlotTop5(\'' + s.key + '\')" style="cursor:pointer; width:100%; min-width:0; overflow:hidden; background:' + (isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + '; border:1px solid ' + (isActive ? s.color : 'rgba(255,255,255,0.06)') + '; border-radius:8px; padding:8px 10px; box-sizing:border-box;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">' +
          '<span style="font-size:0.64rem; color:#94a3b8; font-weight:800; flex-shrink:0;">' + safeSlotKey + '</span>' +
          '<span style="font-size:0.60rem; color:' + s.color + '; font-weight:700; flex-shrink:0;">' + (isActive ? '닫기 ▲' : 'Top 5 ▼') + '</span>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-top:4px; min-width:0;">' +
          '<span style="font-size:0.74rem; font-weight:800; color:' + s.color + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;">' + safeTop1 + '</span>' +
          '<span style="font-size:0.62rem; color:#64748b; font-weight:700; flex-shrink:0;">' + top1Count + '회</span>' +
        '</div>' +
      '</div>';
    }).join('');

    if (state.activeSlot && slotDataMap[state.activeSlot]) {
      var curSlotDef = availableSlots.find(function(s) { return s.key === state.activeSlot; }) || { key: state.activeSlot, color: '#bae6fd' };
      var curCounts = slotDataMap[state.activeSlot].counts;
      var curSorted = Object.keys(curCounts).map(function(k) { return { name: k, count: curCounts[k] }; }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

      activeSlotDetailHtml = '<div style="background:#000000; border:1px dashed ' + curSlotDef.color + '; border-radius:8px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
        '<div style="font-size:0.66rem; color:' + curSlotDef.color + '; font-weight:800; margin-bottom:6px;">' + _escapeReportPropHtml(curSlotDef.key) + ' Top 5</div>' +
        curSorted.map(function(item, idx) {
          return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.70rem; padding:3px 0; min-width:0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:' + curSlotDef.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + _escapeReportPropHtml(item.name) + '</span><span style="color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + item.count + '회</span></div>';
        }).join('') +
      '</div>';
    }
  } else {
    activeSlotCardsHtml = '<div style="color:#475569; font-size:0.66rem; padding:4px;">등록된 하드웨어 장비 데이터가 없습니다.</div>';
  }

  var topMinListHtml = topMin.map(function(m, i) {
    return '<div style="display:flex; justify-content:space-between; gap:6px; font-size:0.70rem; color:#cbd5e1; line-height:1.45; min-width:0;"><span>' + (i + 1) + '. <strong style="color:#bae6fd;">' + m.weight.toFixed(2) + 'kg</strong></span><span style="color:#64748b; flex-shrink:0;">' + _escapeReportPropHtml(m.date.slice(2, 10)) + '</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.66rem;">-</div>';

  var topMaxListHtml = topMax.map(function(m, i) {
    return '<div style="display:flex; justify-content:space-between; gap:6px; font-size:0.70rem; color:#cbd5e1; line-height:1.45; min-width:0;"><span>' + (i + 1) + '. <strong style="color:#fecdd3;">' + m.weight.toFixed(2) + 'kg</strong></span><span style="color:#64748b; flex-shrink:0;">' + _escapeReportPropHtml(m.date.slice(2, 10)) + '</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.66rem;">-</div>';

  var sortedGearsListHtml = sortedHardwareTop5.map(function(g, i) {
    return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.72rem; padding:3px 0; min-width:0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:#a7f3d0; margin-right:4px;">' + (i + 1) + '</strong>' + _escapeReportPropHtml(g.name) + '</span><span style="color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + g.count + '회</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.66rem;">하드웨어 장비 기록이 없습니다.</div>';

  el.innerHTML = `
    <!-- 1. 총 누적 적재 무게 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.72rem; color:#94a3b8; font-weight:800;">총 누적 적재 무게</span>
        <span style="font-size:0.62rem; color:#64748b; flex-shrink:0;">누적 통계</span>
      </div>
      <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr); gap:6px; align-items:center; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px; padding:6px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b; font-weight:700;">이번 달</div>
          <div style="font-size:0.97rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">${Math.round(absoluteMonthWeight)}<span style="font-size:0.67rem; color:#7dd3fc; margin-left:1px;">kg</span></div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px; padding:6px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b; font-weight:700;">올해 누적</div>
          <div style="font-size:0.97rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">${Math.round(absoluteYearWeight)}<span style="font-size:0.67rem; color:#fef08a; margin-left:1px;">kg</span></div>
        </div>
        <div style="background:rgba(167,243,208,0.04); border:1px solid rgba(167,243,208,0.2); border-radius:6px; padding:6px 2px; min-width:0;">
          <div style="font-size:0.64rem; color:#a7f3d0; font-weight:800;">역대 총 누적</div>
          <div style="font-size:1.27rem; font-weight:900; color:#a7f3d0; font-family:var(--font-en); line-height:1; margin-top:2px;">${Math.round(absoluteTotalWeight)}<span style="font-size:0.74rem; color:#6ee7b7; margin-left:1px;">kg</span></div>
        </div>
      </div>
    </div>

    <!-- 2. 평균 세팅 무게 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#64748b; font-weight:700;">평균 1회 세팅 무게</span>
        <div style="display:flex; gap:2px; background:rgba(255,255,255,0.04); padding:2px; border-radius:4px; flex-shrink:0;">
          <button type="button" onclick="window._setGearSeasonFilter('all')" style="border:none; cursor:pointer; font-size:0.58rem; padding:3px 6px; border-radius:3px; background:${state.season==='all'?'#ffffff':'transparent'}; color:${state.season==='all'?'#000':'#64748b'}; font-weight:800;">전체</button>
          <button type="button" onclick="window._setGearSeasonFilter('winter')" style="border:none; cursor:pointer; font-size:0.58rem; padding:3px 6px; border-radius:3px; background:${state.season==='winter'?'#bae6fd':'transparent'}; color:${state.season==='winter'?'#000':'#64748b'}; font-weight:800;">동계</button>
          <button type="button" onclick="window._setGearSeasonFilter('three')" style="border:none; cursor:pointer; font-size:0.58rem; padding:3px 6px; border-radius:3px; background:${state.season==='three'?'#fde68a':'transparent'}; color:${state.season==='three'?'#000':'#64748b'}; font-weight:800;">3계절</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:4px; text-align:center;">
        <div style="min-width:0;">
          <div style="font-size:0.64rem; color:#64748b;">30일 평균</div>
          <div style="font-size:0.87rem; font-weight:800; color:#bae6fd; font-family:var(--font-en);">${cM > 0 ? (sumM / cM).toFixed(2) + 'kg' : '-'}</div>
        </div>
        <div style="min-width:0;">
          <div style="font-size:0.64rem; color:#64748b;">올해 평균</div>
          <div style="font-size:0.87rem; font-weight:800; color:#fde68a; font-family:var(--font-en);">${cY > 0 ? (sumY / cY).toFixed(2) + 'kg' : '-'}</div>
        </div>
        <div style="min-width:0;">
          <div style="font-size:0.64rem; color:#64748b;">선택구간 평균</div>
          <div style="font-size:0.87rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en);">${cFiltered > 0 ? (sumFiltered / cFiltered).toFixed(2) + 'kg' : '0kg'}</div>
        </div>
      </div>
    </div>

    <!-- 3. 무게 다이어트 추이 -->
    <div style="background:#000000; border:1px solid rgba(186,230,253,0.12); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#94a3b8; font-weight:700;">무게 다이어트 추이</span>
        <div style="display:flex; gap:3px; flex-shrink:0;">
          <button type="button" onclick="window._setGearDietMode('month')" style="border:none; cursor:pointer; font-size:0.60rem; padding:3px 6px; border-radius:3px; background:${state.dietMode==='month'?'#bae6fd':'rgba(255,255,255,0.06)'}; color:${state.dietMode==='month'?'#000':'#94a3b8'}; font-weight:800;">월단위</button>
          <button type="button" onclick="window._setGearDietMode('year')" style="border:none; cursor:pointer; font-size:0.60rem; padding:3px 6px; border-radius:3px; background:${state.dietMode==='year'?'#bae6fd':'rgba(255,255,255,0.06)'}; color:${state.dietMode==='year'?'#000':'#94a3b8'}; font-weight:800;">연단위</button>
        </div>
      </div>
      ${dietHtml}
    </div>

    <!-- 4. 슬롯별 최다 사용 장비 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#64748b; font-weight:700;">슬롯별 최다 장비</span>
        <span style="font-size:0.62rem; color:#94a3b8; flex-shrink:0;">소모품 제외</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; min-width:0; width:100%;">
        ${activeSlotCardsHtml}
      </div>
      ${activeSlotDetailHtml}
    </div>

    <!-- 5. 세팅 비율 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; gap:8px; font-size:0.68rem; color:#64748b; margin-bottom:4px;">
        <span>세팅 비율 (경량/스탠다드/헤비)</span>
        <span style="color:#94a3b8; font-weight:700; flex-shrink:0;">${pMin}% / ${pStd}% / ${pHvy}%</span>
      </div>
      <div style="display:flex; width:100%; height:4px; border-radius:2px; overflow:hidden; background:rgba(255,255,255,0.04);">
        <div style="width:${pMin}%; background:#bae6fd;"></div>
        <div style="width:${pStd}%; background:#a7f3d0;"></div>
        <div style="width:${pHvy}%; background:#fecdd3;"></div>
      </div>
    </div>

    <!-- 6. 최경량 Top 3 vs 최대 중량 Top 3 -->
    <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px;">
      <div style="background:#000000; border:1px solid rgba(186,230,253,0.12); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
        <div style="font-size:0.68rem; color:#bae6fd; font-weight:700; margin-bottom:4px;">최경량 Top 3</div>
        ${topMinListHtml}
      </div>
      <div style="background:#000000; border:1px solid rgba(254,205,211,0.12); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
        <div style="font-size:0.68rem; color:#fecdd3; font-weight:700; margin-bottom:4px;">최대 중량 Top 3</div>
        ${topMaxListHtml}
      </div>
    </div>

    <!-- 7. 최다 동행 하드웨어 Top 5 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
        <span style="font-size:0.68rem; color:#64748b; font-weight:700;">최다 동행 하드웨어 Top 5</span>
        <span style="font-size:0.62rem; color:#64748b; flex-shrink:0;">순수 장비</span>
      </div>
      ${sortedGearsListHtml}
    </div>
  `;
};

// 2. 고도 & 필드 지형 연산 모듈 (낭만루트 정본 단일 연동 & 현재 연도 기본값)
window._terrainModuleState = window._terrainModuleState || {
  selectedYear: String(new Date().getFullYear()),
  elevDetailMode: null,
  expandedTheme: null,
  showTopElevation: false
};

window._setTerrainYearSelect = function(yearVal) {
  triggerHaptic(8);
  _okbmCloseModuleCustomDropdowns();
  window._terrainModuleState.selectedYear = yearVal;
  var body = document.getElementById('accBody_terrain');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderTerrainModule(validLogs, body);
};

window._toggleTerrainElevDetail = function(mode) {
  triggerHaptic(8);
  var st = window._terrainModuleState;
  st.elevDetailMode = (st.elevDetailMode === mode) ? null : mode;
  var body = document.getElementById('accBody_terrain');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderTerrainModule(validLogs, body);
};

window._toggleTerrainThemeTop5 = function(themeKey) {
  triggerHaptic(10);
  var st = window._terrainModuleState;
  st.expandedTheme = (st.expandedTheme === themeKey) ? null : themeKey;
  var body = document.getElementById('accBody_terrain');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderTerrainModule(validLogs, body);
};

window._toggleTopElevationRank = function() {
  triggerHaptic(10);
  var st = window._terrainModuleState;
  st.showTopElevation = !st.showTopElevation;
  var body = document.getElementById('accBody_terrain');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderTerrainModule(validLogs, body);
};

window._renderTerrainModule = function(validLogs, el) {
  var state = window._terrainModuleState;
  var now = Date.now();
  var MS_30D = 30 * 24 * 60 * 60 * 1000;
  var curYear = String(new Date().getFullYear());
  var curMonthStr = curYear + '.' + String(new Date().getMonth() + 1).padStart(2, '0');

  var isIsland = function(s) { return /섬|도$|도\s|비양도|굴업도|자월도|승봉도|덕적도|대마도|제주|울릉/i.test(s); };
  var isBeach = function(s) { return /해변|해수욕장|비치|해안|바다|모래|포구|항$|항\s|갯벌/i.test(s); };
  var isMountain = function(s) { return /산$|산\s|봉$|봉\s|령$|령\s|대$|고개|능선|정상|고지|악$|악\s/i.test(s); };

  var parseElevation = function(elev) {
    if (elev == null || elev === '') return 0;
    // 소수점까지 지우면 "480.8m"가 4808m가 되어 누적·최고봉이 함께 틀린다.
    var match = String(elev).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    if (!match) return 0;
    var num = Math.round(parseFloat(match[0]));
    return isFinite(num) && num > 0 ? num : 0;
  };

  var monthElevation = 0;
  var yearElevation = 0;
  var totalElevation = 0;

  var monthElevMap = {};
  var yearElevMap = {};
  var allElevationRank = [];

  var elevTier = { high: 0, mid: 0, low: 0 };
  var yearSet = new Set([curYear]);

  validLogs.forEach(function(r) {
    var dStr = String(r.date || '');
    var pTime = new Date(dStr.replace(/\./g, '-')).getTime();
    var y = dStr.slice(0, 4);
    var ym = dStr.slice(0, 7).replace(/\.\s*/g, '-');
    if (y.length === 4 && !isNaN(parseInt(y, 10))) yearSet.add(y);

    var isThisYear = dStr.includes(curYear);
    var isThisMonth = dStr.replace(/\s+/g, '').includes(curMonthStr.replace(/\s+/g, '')) || (!isNaN(pTime) && (now - pTime <= MS_30D));

    var elev = parseElevation(r.elevation);
    if (elev > 0) {
      totalElevation += elev;
      if (isThisYear) yearElevation += elev;
      if (isThisMonth) monthElevation += elev;

      if (ym.length >= 6) {
        monthElevMap[ym] = (monthElevMap[ym] || 0) + elev;
      }
      if (y.length === 4) {
        yearElevMap[y] = (yearElevMap[y] || 0) + elev;
      }

      allElevationRank.push({
        spot: r.spot || '-',
        elevation: elev,
        date: dStr.slice(0, 10)
      });
    }

    if (elev >= 800) elevTier.high++;
    else if (elev >= 300) elevTier.mid++;
    else elevTier.low++;
  });

  allElevationRank.sort(function(a, b) { return b.elevation - a.elevation; });
  var top5Elevations = allElevationRank.slice(0, 5);
  var maxElevItem = top5Elevations[0] || { spot: '-', elevation: 0, date: '-' };

  var hStat = document.getElementById('reportHeaderTerrainStat');
  if (hStat) hStat.innerText = '+' + totalElevation.toLocaleString() + 'm';

  var hallasanMultiple = (totalElevation / 1947).toFixed(1);

  var elevDetailHtml = '';
  if (state.elevDetailMode === 'month') {
    var mKeys = Object.keys(monthElevMap).sort().slice(-6);
    elevDetailHtml = '<div style="background:#000000; border:1px dashed #bae6fd; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:#bae6fd; font-weight:800; margin-bottom:4px;">최근 월별 획득 고도</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(72px, 1fr)); gap:4px;">' +
      mKeys.map(function(mk) {
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 3px; text-align:center; min-width:0;"><div style="font-size:0.60rem; color:#64748b; font-family:var(--font-en);">' + mk.slice(2) + '</div><div style="font-size:0.77rem; font-weight:800; color:#bae6fd; font-family:var(--font-en); margin-top:1px;">+' + monthElevMap[mk].toLocaleString() + 'm</div></div>';
      }).join('') + '</div></div>';
  } else if (state.elevDetailMode === 'year') {
    var yKeys = Object.keys(yearElevMap).sort();
    elevDetailHtml = '<div style="background:#000000; border:1px dashed #fde68a; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:#fde68a; font-weight:800; margin-bottom:4px;">연도별 획득 고도 합계</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(76px, 1fr)); gap:4px;">' +
      yKeys.map(function(yk) {
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 3px; text-align:center; min-width:0;"><div style="font-size:0.60rem; color:#64748b; font-family:var(--font-en);">' + yk + '년</div><div style="font-size:0.77rem; font-weight:800; color:#fde68a; font-family:var(--font-en); margin-top:1px;">+' + yearElevMap[yk].toLocaleString() + 'm</div></div>';
      }).join('') + '</div></div>';
  }

  var sortedYears = Array.from(yearSet).sort().reverse();
  var filteredLogs = validLogs.filter(function(r) {
    if (state.selectedYear === 'all') return true;
    return String(r.date || '').startsWith(state.selectedYear);
  });

  var themeCounts = { mountain: 0, island: 0, beach: 0, forest: 0 };
  var themeSpotMap = { mountain: {}, island: {}, beach: {}, forest: {} };
  var spotVisitMap = {};

  filteredLogs.forEach(function(r) {
    var spotName = String(r.spot || '').trim();
    if (!spotName) return;

    spotVisitMap[spotName] = (spotVisitMap[spotName] || 0) + 1;

    var tKey = 'forest';
    if (isIsland(spotName)) tKey = 'island';
    else if (isBeach(spotName)) tKey = 'beach';
    else if (isMountain(spotName)) tKey = 'mountain';

    themeCounts[tKey]++;
    themeSpotMap[tKey][spotName] = (themeSpotMap[tKey][spotName] || 0) + 1;
  });

  var totalThemeLogs = themeCounts.mountain + themeCounts.island + themeCounts.beach + themeCounts.forest;
  var pMountain = totalThemeLogs > 0 ? Math.round((themeCounts.mountain / totalThemeLogs) * 100) : 0;
  var pIsland = totalThemeLogs > 0 ? Math.round((themeCounts.island / totalThemeLogs) * 100) : 0;
  var pBeach = totalThemeLogs > 0 ? Math.round((themeCounts.beach / totalThemeLogs) * 100) : 0;
  var pForest = Math.max(0, 100 - pMountain - pIsland - pBeach);

  var totalVisitedSpots = Object.keys(spotVisitMap).length;
  var totalTripCount = filteredLogs.length;
  var reVisitCount = 0;
  Object.keys(spotVisitMap).forEach(function(sName) {
    if (spotVisitMap[sName] > 1) {
      reVisitCount += (spotVisitMap[sName] - 1);
    }
  });

  var newExploreRate = totalTripCount > 0 ? Math.round((totalVisitedSpots / totalTripCount) * 100) : 0;
  var reVisitRate = Math.max(0, 100 - newExploreRate);
  var exploreTypeTitle = newExploreRate >= 65 ? '새로운 박지를 찾는 [탐험가형]' : '검증된 아지트를 즐기는 [정착형]';

  var getTopSpotList = function(themeObj) {
    return Object.keys(themeObj).map(function(k) {
      return { name: k, count: themeObj[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);
  };

  var themeData = {
    mountain: { label: '산 원픽', list: getTopSpotList(themeSpotMap.mountain), color: '#bae6fd' },
    island: { label: '섬 원픽', list: getTopSpotList(themeSpotMap.island), color: '#a7f3d0' },
    beach: { label: '바다 원픽', list: getTopSpotList(themeSpotMap.beach), color: '#fde68a' },
    forest: { label: '숲·계곡 원픽', list: getTopSpotList(themeSpotMap.forest), color: '#e9d5ff' }
  };

  var themeCardsHtml = Object.keys(themeData).map(function(tKey) {
    var item = themeData[tKey];
    var top1 = item.list[0] || { name: '-', count: 0 };
    var isExp = (state.expandedTheme === tKey);
    return '<div onclick="window._toggleTerrainThemeTop5(\'' + tKey + '\')" style="cursor:pointer; min-width:0; overflow:hidden; background:' + (isExp ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.04)') + '; border-radius:6px; padding:6px 8px; box-sizing:border-box;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; gap:6px; min-width:0;">' +
        '<span style="font-size:0.62rem; color:#64748b; font-weight:700; flex-shrink:0;">' + item.label + '</span>' +
        '<span style="font-size:0.58rem; color:' + item.color + '; flex-shrink:0;">' + (isExp ? '닫기 ▲' : 'Top 5 ▼') + '</span>' +
      '</div>' +
      '<div style="font-size:0.70rem; font-weight:800; color:' + item.color + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:3px; min-width:0;">' + _escapeReportPropHtml(top1.name) + ' <span style="font-size:0.62rem; color:#64748b; font-weight:normal;">(' + top1.count + '회)</span></div>' +
    '</div>';
  }).join('');

  var themeDetailHtml = '';
  if (state.expandedTheme && themeData[state.expandedTheme]) {
    var curT = themeData[state.expandedTheme];
    themeDetailHtml = '<div style="background:#000000; border:1px dashed ' + curT.color + '; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:' + curT.color + '; font-weight:800; margin-bottom:4px;">[' + curT.label + '] 방문 랭킹 Top 5</div>' +
      (curT.list.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.70rem; padding:3px 0; min-width:0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:' + curT.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + _escapeReportPropHtml(it.name) + '</span><span style="color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.64rem;">해당 지형의 기록이 없습니다.</div>') +
    '</div>';
  }

  var topElevDetailHtml = '';
  if (state.showTopElevation) {
    topElevDetailHtml = '<div style="background:#000000; border:1px dashed #bae6fd; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:#bae6fd; font-weight:800; margin-bottom:4px;">역대 등정 최고봉 랭킹 Top 5</div>' +
      top5Elevations.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.70rem; padding:3px 0; min-width:0;">' +
          '<span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:#bae6fd; margin-right:4px;">' + (idx + 1) + '.</strong>' + _escapeReportPropHtml(it.spot) + ' <span style="font-size:0.62rem; color:#64748b;">(' + _escapeReportPropHtml(it.date) + ')</span></span>' +
          '<span style="color:#bae6fd; font-weight:800; font-family:var(--font-en); flex-shrink:0;">' + it.elevation.toLocaleString() + 'm</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  var selectedYearLabel = state.selectedYear === 'all' ? '전체 활동 기간' : state.selectedYear + '년 활동 기준';
  var customDropdownItemsHtml = '<button type="button" onclick="window._setTerrainYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_terrain\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(186,230,253,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setTerrainYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_terrain\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(186,230,253,0.1)' : 'transparent') + '; color:' + (isSel ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 활동 기준</button>';
    }).join('');

  el.innerHTML = `
    <!-- 1. 총 누적 획득 고도 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.72rem; color:#94a3b8; font-weight:800;">총 누적 획득 고도</span>
        <span style="font-size:0.62rem; color:#bae6fd; font-weight:700; flex-shrink:0;">한라산 ${hallasanMultiple}회 등정 높이</span>
      </div>
      <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr); gap:6px; align-items:center; text-align:center;">
        <div onclick="window._toggleTerrainElevDetail('month')" style="cursor:pointer; min-width:0; background:${state.elevDetailMode==='month'?'rgba(186,230,253,0.08)':'rgba(255,255,255,0.02)'}; border:1px solid ${state.elevDetailMode==='month'?'#bae6fd':'rgba(255,255,255,0.04)'}; border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.62rem; color:#64748b; font-weight:700;">이번 달 <span style="font-size:0.56rem; color:#bae6fd;">월별▼</span></div>
          <div style="font-size:0.97rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">+${monthElevation.toLocaleString()}<span style="font-size:0.67rem; color:#7dd3fc; margin-left:1px;">m</span></div>
        </div>
        <div onclick="window._toggleTerrainElevDetail('year')" style="cursor:pointer; min-width:0; background:${state.elevDetailMode==='year'?'rgba(253,230,138,0.08)':'rgba(255,255,255,0.02)'}; border:1px solid ${state.elevDetailMode==='year'?'#fde68a':'rgba(255,255,255,0.04)'}; border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.62rem; color:#64748b; font-weight:700;">올해 누적 <span style="font-size:0.56rem; color:#fde68a;">연별▼</span></div>
          <div style="font-size:0.97rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">+${yearElevation.toLocaleString()}<span style="font-size:0.67rem; color:#fef08a; margin-left:1px;">m</span></div>
        </div>
        <div style="min-width:0; background:rgba(186,230,253,0.04); border:1px solid rgba(186,230,253,0.2); border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.64rem; color:#bae6fd; font-weight:800;">역대 총 누적</div>
          <div style="font-size:1.27rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1; margin-top:2px;">+${totalElevation.toLocaleString()}<span style="font-size:0.74rem; color:#7dd3fc; margin-left:1px;">m</span></div>
        </div>
      </div>
      ${elevDetailHtml}
    </div>

    <!-- 2. 인터랙티브 연도 선택 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 10px; min-width:0;">
      <span style="font-size:0.66rem; color:#94a3b8; font-weight:700;">지형 분석 기준 기간</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('terrain', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.66rem; font-weight:800; border-radius:4px; padding:4px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none; flex-shrink:0;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.56rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_terrain" style="display:none; position:absolute; top:32px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:128px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 3. 필드 지형 테마 점유율 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#64748b; font-weight:700;">필드 지형 테마 비중</span>
        <span style="font-size:0.62rem; color:#94a3b8; flex-shrink:0;">${state.selectedYear==='all'?'전체 기간':state.selectedYear+'년'} 기준</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:4px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">산·능선</div>
          <div style="font-size:0.87rem; font-weight:800; color:#bae6fd; font-family:var(--font-en); margin-top:1px;">${pMountain}%</div>
          <div style="font-size:0.60rem; color:#64748b;">${themeCounts.mountain}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">섬</div>
          <div style="font-size:0.87rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en); margin-top:1px;">${pIsland}%</div>
          <div style="font-size:0.60rem; color:#64748b;">${themeCounts.island}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">바다·해변</div>
          <div style="font-size:0.87rem; font-weight:800; color:#fde68a; font-family:var(--font-en); margin-top:1px;">${pBeach}%</div>
          <div style="font-size:0.60rem; color:#64748b;">${themeCounts.beach}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">숲·계곡</div>
          <div style="font-size:0.87rem; font-weight:800; color:#e9d5ff; font-family:var(--font-en); margin-top:1px;">${pForest}%</div>
          <div style="font-size:0.60rem; color:#64748b;">${themeCounts.forest}회</div>
        </div>
      </div>
    </div>

    <!-- 4. 장소 개척 성향 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#64748b; font-weight:700; flex-shrink:0;">장소 개척 성향</span>
        <span style="font-size:0.64rem; color:#a7f3d0; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; text-align:right;">${exploreTypeTitle}</span>
      </div>
      <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:6px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">미지 개척 확률</div>
          <div style="font-size:0.97rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">${newExploreRate}%</div>
          <div style="font-size:0.60rem; color:#64748b;">고유 장소 ${totalVisitedSpots}곳</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:6px 2px; min-width:0;">
          <div style="font-size:0.62rem; color:#64748b;">단골 재방문 확률</div>
          <div style="font-size:0.97rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">${reVisitRate}%</div>
          <div style="font-size:0.60rem; color:#64748b;">재방문 ${reVisitCount}회</div>
        </div>
      </div>
    </div>

    <!-- 5. 지형별 부동의 1위 아지트 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;">
        <span style="font-size:0.70rem; color:#64748b; font-weight:700;">지형별 최다 방문 아지트</span>
        <span style="font-size:0.60rem; color:#64748b; flex-shrink:0;">단골 랭킹</span>
      </div>
      <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px;">
        ${themeCardsHtml}
      </div>
      ${themeDetailHtml}
    </div>

    <!-- 6. 내가 밟은 가장 높은 곳 -->
    <div onclick="window._toggleTopElevationRank()" style="cursor:pointer; background:#000000; border:1px solid rgba(186,230,253,0.25); border-radius:6px; padding:8px 10px; min-width:0; overflow:hidden; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; min-width:0;">
        <div style="min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:6px; min-width:0;">
            <span style="font-size:0.64rem; color:#64748b; font-weight:700;">내가 밟은 가장 높은 곳</span>
            <span style="font-size:0.58rem; color:#bae6fd; font-weight:800; flex-shrink:0;">${state.showTopElevation?'Top 5 닫기 ▲':'Top 5 순위 ▼'}</span>
          </div>
          <div style="font-size:0.87rem; font-weight:800; color:#ffffff; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${_escapeReportPropHtml(maxElevItem.spot)}</div>
          <div style="font-size:0.62rem; color:#64748b; margin-top:1px;">${_escapeReportPropHtml(maxElevItem.date)}</div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:1.27rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1;">${maxElevItem.elevation.toLocaleString()}m</div>
        </div>
      </div>
    </div>
    ${topElevDetailHtml}
  `;
};

// 3. 시즌 밸런스 연산 모듈 (낭만루트 정본 단일 연동 & 현재 연도 기본값)
window._seasonModuleState = window._seasonModuleState || {
  selectedYear: String(new Date().getFullYear()),
  expandedSeason: null
};

window._setSeasonYearSelect = function(yearVal) {
  triggerHaptic(8);
  _okbmCloseModuleCustomDropdowns();
  window._seasonModuleState.selectedYear = yearVal;
  var body = document.getElementById('accBody_season');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderSeasonModule(validLogs, body);
};

window._toggleSeasonDetail = function(seasonKey) {
  triggerHaptic(10);
  var st = window._seasonModuleState;
  st.expandedSeason = (st.expandedSeason === seasonKey) ? null : seasonKey;
  var body = document.getElementById('accBody_season');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderSeasonModule(validLogs, body);
};

window._renderSeasonModule = function(validLogs, el) {
  var state = window._seasonModuleState;
  var curYear = String(new Date().getFullYear());
  var yearSet = new Set([curYear]);

  validLogs.forEach(function(r) {
    var y = String(r.date || '').slice(0, 4);
    if (y.length === 4 && !isNaN(parseInt(y, 10))) yearSet.add(y);
  });
  var sortedYears = Array.from(yearSet).sort().reverse();

  var filteredLogs = validLogs.filter(function(r) {
    if (state.selectedYear === 'all') return true;
    return String(r.date || '').startsWith(state.selectedYear);
  });

  var s = {
    spring: { label: '봄 (3-5월)', count: 0, spots: {}, color: '#a7f3d0' },
    summer: { label: '여름 (6-8월)', count: 0, spots: {}, color: '#bae6fd' },
    autumn: { label: '가을 (9-11월)', count: 0, spots: {}, color: '#fde68a' },
    winter: { label: '동계 (12-2월)', count: 0, spots: {}, color: '#e2e8f0' }
  };

  filteredLogs.forEach(function(r) {
    var m = parseInt((String(r.date || '').match(/\d+/g) || [])[1] || '0', 10);
    var spotName = String(r.spot || '').trim();
    var target = null;

    if (m >= 3 && m <= 5) target = s.spring;
    else if (m >= 6 && m <= 8) target = s.summer;
    else if (m >= 9 && m <= 11) target = s.autumn;
    else if (m === 12 || m === 1 || m === 2) target = s.winter;

    if (target) {
      target.count++;
      if (spotName) {
        target.spots[spotName] = (target.spots[spotName] || 0) + 1;
      }
    }
  });

  var total = filteredLogs.length;
  var pct = function(c) { return total > 0 ? Math.round((c / total) * 100) : 0; };

  var topSeasonKey = 'autumn';
  var maxCount = -1;
  ['spring', 'summer', 'autumn', 'winter'].forEach(function(k) {
    if (s[k].count > maxCount) {
      maxCount = s[k].count;
      topSeasonKey = k;
    }
  });

  var hStat = document.getElementById('reportHeaderSeasonStat');
  if (hStat) {
    hStat.innerText = s[topSeasonKey].label.split(' ')[0] + ' ' + pct(s[topSeasonKey].count) + '%';
  }

  var selectedYearLabel = state.selectedYear === 'all' ? '전체 활동 기간' : state.selectedYear + '년 시즌 기준';
  var customDropdownItemsHtml = '<button type="button" onclick="window._setSeasonYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_season\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(253,230,138,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#fde68a' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setSeasonYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_season\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(253,230,138,0.1)' : 'transparent') + '; color:' + (isSel ? '#fde68a' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 시즌 기준</button>';
    }).join('');

  var seasonCardsHtml = ['spring', 'summer', 'autumn', 'winter'].map(function(k) {
    var item = s[k];
    var p = pct(item.count);
    var isExp = (state.expandedSeason === k);
    return '<div onclick="window._toggleSeasonDetail(\'' + k + '\')" style="cursor:pointer; min-width:0; overflow:hidden; background:' + (isExp ? 'rgba(255,255,255,0.06)' : '#000000') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.06)') + '; border-radius:6px; padding:8px 2px; text-align:center; box-sizing:border-box;">' +
      '<div style="font-size:0.62rem; color:#64748b;">' + item.label.split(' ')[0] + '</div>' +
      '<div style="font-size:0.87rem; font-weight:800; color:' + item.color + '; font-family:var(--font-en); margin-top:1px;">' + p + '%</div>' +
      '<div style="font-size:0.58rem; color:#64748b; margin-top:1px;">' + item.count + '회 ' + (isExp ? '▲' : '▼') + '</div>' +
    '</div>';
  }).join('');

  var seasonDetailHtml = '';
  if (state.expandedSeason && s[state.expandedSeason]) {
    var curS = s[state.expandedSeason];
    var sortedSpots = Object.keys(curS.spots).map(function(k) {
      return { name: k, count: curS.spots[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

    seasonDetailHtml = '<div style="background:#000000; border:1px dashed ' + curS.color + '; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:' + curS.color + '; font-weight:800; margin-bottom:4px;">[' + curS.label + '] 방문 장소 Top 5</div>' +
      (sortedSpots.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.70rem; padding:3px 0; min-width:0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:' + curS.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + _escapeReportPropHtml(it.name) + '</span><span style="color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.64rem;">해당 시즌 기록이 없습니다.</div>') +
    '</div>';
  }

  el.innerHTML = `
    <!-- 시즌 연도 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 10px; margin-top:6px; min-width:0;">
      <span style="font-size:0.66rem; color:#94a3b8; font-weight:700;">시즌 분석 기준</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('season', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.66rem; font-weight:800; border-radius:4px; padding:4px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none; flex-shrink:0;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.56rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_season" style="display:none; position:absolute; top:32px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:128px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 4계절 밸런스 그리드 (터치 시 Top 5 확장) -->
    <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px; margin-top:4px;">
      ${seasonCardsHtml}
    </div>
    ${seasonDetailHtml}
  `;
};

// 4. 지역 분포 연산 모듈 (낭만루트 정본 단일 연동 & 현재 연도 기본값)
window._regionModuleState = window._regionModuleState || {
  selectedYear: String(new Date().getFullYear()),
  expandedRegion: null
};

window._setRegionYearSelect = function(yearVal) {
  triggerHaptic(8);
  _okbmCloseModuleCustomDropdowns();
  window._regionModuleState.selectedYear = yearVal;
  var body = document.getElementById('accBody_region');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderRegionModule(validLogs, body);
};

window._toggleRegionDetail = function(regionKey) {
  triggerHaptic(10);
  var st = window._regionModuleState;
  st.expandedRegion = (st.expandedRegion === regionKey) ? null : regionKey;
  var body = document.getElementById('accBody_region');
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];
  if (body) window._renderRegionModule(validLogs, body);
};

window._renderRegionModule = function(validLogs, el) {
  var state = window._regionModuleState;
  var curYear = String(new Date().getFullYear());
  var yearSet = new Set([curYear]);

  validLogs.forEach(function(r) {
    var y = String(r.date || '').slice(0, 4);
    if (y.length === 4 && !isNaN(parseInt(y, 10))) yearSet.add(y);
  });
  var sortedYears = Array.from(yearSet).sort().reverse();

  var filteredLogs = validLogs.filter(function(r) {
    if (state.selectedYear === 'all') return true;
    return String(r.date || '').startsWith(state.selectedYear);
  });

  var regMap = {
    '강원': { count: 0, spots: {}, color: '#bae6fd' },
    '경기/수도권': { count: 0, spots: {}, color: '#a7f3d0' },
    '충청': { count: 0, spots: {}, color: '#fde68a' },
    '전라': { count: 0, spots: {}, color: '#fed7aa' },
    '경상': { count: 0, spots: {}, color: '#e9d5ff' },
    '제주': { count: 0, spots: {}, color: '#fecdd3' },
    '섬/해안': { count: 0, spots: {}, color: '#7dd3fc' },
    '기타': { count: 0, spots: {}, color: '#94a3b8' }
  };

  filteredLogs.forEach(function(r) {
    var spot = String(r.spot || r.spotName || '미등록 노지').trim();

    var matchedKey = '기타';
    if (/강원|태백|정선|삼척|강릉|동해|속초|고성|양양|인제|원주|평창|홍천|춘천|화천|양구|영월/i.test(spot)) {
      matchedKey = '강원';
    } else if (/경기|서울|인천|이천|가평|양평|포천|연천|파주|남양주|수원|용인|안성/i.test(spot)) {
      matchedKey = '경기/수도권';
    } else if (/충청|충남|충북|천안|공주|보령|아산|서산|논산|당진|부여|청양|홍성|예산|태안|청주|충주|제천|보은|옥천|영동|증평|진천|괴산|단양/i.test(spot)) {
      matchedKey = '충청';
    } else if (/전라|전남|전북|군산|익산|정읍|남원|김제|완주|진안|무주|장수|임실|순창|고창|부안|목포|여수|순천|나주|광양|담양|곡성|구례|고흥|보성|화순|장흥|강진|해남|영암|무안|함평|영광|장성|완도|진도|신안/i.test(spot)) {
      matchedKey = '전라';
    } else if (/경상|경북|경남|포항|경주|김천|안동|구미|영주|영천|상주|문경|경산|의성|청송|영양|영덕|청도|고령|성주|칠곡|예천|봉화|울진|울릉|창원|진주|통영|사천|김해|밀양|거제|양산|의령|함안|창녕|고성|남해|하동|산청|함양|거창|합천|부산|울산|대구/i.test(spot)) {
      matchedKey = '경상';
    } else if (/제주|서귀포|한라|우도|성산/i.test(spot)) {
      matchedKey = '제주';
    } else if (/섬|도$|도\s|비양도|굴업도|자월도|승봉도|덕적도|대마도/i.test(spot)) {
      matchedKey = '섬/해안';
    }

    regMap[matchedKey].count++;
    regMap[matchedKey].spots[spot] = (regMap[matchedKey].spots[spot] || 0) + 1;
  });

  var total = filteredLogs.length;
  var topRegKey = '강원';
  var maxRegCount = -1;
  Object.keys(regMap).forEach(function(k) {
    if (regMap[k].count > maxRegCount) {
      maxRegCount = regMap[k].count;
      topRegKey = k;
    }
  });

  var hStat = document.getElementById('reportHeaderRegionStat');
  if (hStat) {
    var pTop = total > 0 ? Math.round((maxRegCount / total) * 100) : 0;
    hStat.innerText = topRegKey + ' (' + pTop + '%)';
  }

  var selectedYearLabel = state.selectedYear === 'all' ? '전체 활동 기간' : state.selectedYear + '년 지역 기준';
  var customDropdownItemsHtml = '<button type="button" onclick="window._setRegionYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_region\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(233,213,255,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#e9d5ff' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setRegionYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_region\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(233,213,255,0.1)' : 'transparent') + '; color:' + (isSel ? '#e9d5ff' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.70rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 지역 기준</button>';
    }).join('');

  var regionCardsHtml = Object.keys(regMap).map(function(k) {
    var item = regMap[k];
    var isExp = (state.expandedRegion === k);
    return '<div onclick="window._toggleRegionDetail(\'' + k + '\')" style="cursor:pointer; min-width:0; overflow:hidden; background:' + (isExp ? 'rgba(255,255,255,0.06)' : '#000000') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.06)') + '; border-radius:6px; min-height:48px; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:5px 2px; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:#64748b; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; padding:0 2px;">' + k + '</div>' +
      '<div style="font-size:0.87rem; font-weight:800; color:' + item.color + '; font-family:var(--font-en); margin-top:2px; line-height:1;">' + item.count + '<span style="font-size:0.58rem; color:#64748b; margin-left:1px;">회</span></div>' +
    '</div>';
  }).join('');

  var regionDetailHtml = '';
  if (state.expandedRegion && regMap[state.expandedRegion]) {
    var curR = regMap[state.expandedRegion];
    var sortedSpots = Object.keys(curR.spots).map(function(k) {
      return { name: k, count: curR.spots[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

    regionDetailHtml = '<div style="background:#000000; border:1px dashed ' + curR.color + '; border-radius:6px; padding:8px 10px; margin-top:6px; min-width:0; overflow:hidden; box-sizing:border-box;">' +
      '<div style="font-size:0.64rem; color:' + curR.color + '; font-weight:800; margin-bottom:4px;">[' + state.expandedRegion + '] 권역 방문 장소 Top 5</div>' +
      (sortedSpots.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:0.70rem; padding:3px 0; min-width:0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; flex:1;"><strong style="color:' + curR.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + _escapeReportPropHtml(it.name) + '</span><span style="color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.64rem;">해당 권역 기록이 없습니다.</div>') +
    '</div>';
  }

  el.innerHTML = `
    <!-- 지역 연도 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 10px; margin-top:6px; min-width:0;">
      <span style="font-size:0.66rem; color:#94a3b8; font-weight:700;">지역 분석 기준</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('region', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.66rem; font-weight:800; border-radius:4px; padding:4px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none; flex-shrink:0;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.56rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_region" style="display:none; position:absolute; top:32px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:128px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 8대 권역 분포 그리드 (터치 시 Top 5 확장) -->
    <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px; margin-top:4px;">
      ${regionCardsHtml}
    </div>
    ${regionDetailHtml}
  `;
};

// 6. 마이데이터(마이리포트) & 로그인 모달 제어
function handleAuthBtnClick() {
  triggerHaptic(12);
  ensureMyReportAndAuthModalsInDOM();
  if (isUserLoggedIn()) {
    openUserProfileModal();
  } else {
    openLoginModal();
  }
}
window.handleAuthBtnClick = handleAuthBtnClick;
window.openMyReportModal = handleAuthBtnClick;

function openLoginModal() {
  try {
    if (typeof window.okbmEnsureKakaoSdk === 'function') {
      window.okbmEnsureKakaoSdk().catch(function() {});
    }
    ensureMyReportAndAuthModalsInDOM();
    var modal = document.getElementById('loginModalOverlay');
    if (modal) modal.style.setProperty('display', 'flex', 'important');
    triggerHaptic(12);
  } catch (e) {}
}
window.openLoginModal = openLoginModal;

function closeLoginModal() {
  try {
    var modal = document.getElementById('loginModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // 🛡️ [블랙아웃 방어 가드]: 상위 모달들이 모두 닫혔는데 plan-modal-open만 남아 화면이 먹통되는 현상 원천 차단
    var shareModal = document.getElementById('packShareModalOverlay');
    var isShareOpen = shareModal && shareModal.style.display !== 'none';
    var histModal = document.getElementById('romanticHistoryModal');
    var isHistOpen = histModal && histModal.style.display !== 'none';
    var planModal = document.getElementById('romanticPlanModal');
    var isPlanOpen = planModal && planModal.style.display !== 'none';

    if (!isShareOpen && !isHistOpen && !isPlanOpen && document.body.classList.contains('plan-modal-open')) {
      if (planModal) {
        planModal.style.setProperty('display', 'flex', 'important');
      } else if (typeof window.openPlanModal === 'function') {
        window.openPlanModal();
      }
    }
  } catch (e) {}
}
window.closeLoginModal = closeLoginModal;

// 🏛️ [전역 유일 마스터 하단 독바 엔진 - DOM 파괴 0% 초고속 스위칭]
window.ensureMasterBottomDock = function(activeTabId) {
  var curPage = (typeof window.location !== 'undefined') ? window.location.pathname : '';
  var isMap = curPage.includes('map.html');
  var s = (typeof window.location !== 'undefined') ? window.location.search : '';

  // URL 파라미터 및 현재 상태를 완벽히 반영하여 기본 탭 결정
  var autoTab = isMap ? 'map' : 'router';
  if (s.includes('open=plan') || s.includes('tab=plan') || s.includes('open=basecamp') || document.getElementById('romanticPlanModal')) {
    autoTab = 'plan';
  } else if (s.includes('open=history') || s.includes('tab=history') || document.getElementById('romanticHistoryModal')) {
    autoTab = 'history';
  } else if (document.getElementById('userProfileModalOverlay') && document.getElementById('userProfileModalOverlay').style.display === 'flex') {
    autoTab = 'report';
  }

  var activeTab = activeTabId || autoTab;
  var dock = document.getElementById('romanticMasterBottomDock');

  if (!dock) {
    var existingDocks = document.querySelectorAll('.mobile-bottom-dock');
    if (existingDocks.length > 0) {
      dock = existingDocks[0];
      dock.id = 'romanticMasterBottomDock';
    } else {
      dock = document.createElement('div');
      dock.id = 'romanticMasterBottomDock';
      dock.className = 'mobile-bottom-dock notranslate';
      document.body.appendChild(dock);
    }
  }

  if (dock.parentElement !== document.body) {
    document.body.appendChild(dock);
  } else if (dock !== document.body.lastElementChild) {
    document.body.appendChild(dock);
  }

  dock.style.cssText = 'position:fixed !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; max-width:480px !important; margin:0 auto !important; height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; min-height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; padding:0 0 env(safe-area-inset-bottom, 8px) 0 !important; background:#000000 !important; border-top:1px solid rgba(255,255,255,0.1) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; z-index:2147483647 !important; box-sizing:border-box !important; pointer-events:auto !important; transform:translateZ(0) !important; -webkit-transform:translateZ(0) !important; contain:paint !important; overscroll-behavior:none !important;';

  var tabs = [
    { id: 'router', name: '낭만루터', svg: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>', action: "window.navigateToDockTab('router')" },
    { id: 'map', name: '낭만루트', svg: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>', action: "window.navigateToDockTab('map')" },
    { id: 'plan', name: '낭만플랜', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>', action: "window.navigateToDockTab('plan')" },
    { id: 'history', name: '낭만보관함', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:19px; height:19px;"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>', action: "window.navigateToDockTab('history')" },
    { id: 'report', name: '마이리포트', svg: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>', action: "window.navigateToDockTab('report')" }
  ];

  // ⚡ innerHTML 파괴 없이 오직 색상 및 폰트 두께만 0ms로 스위칭하여 깜빡임 원천 차단
  var buttons = dock.querySelectorAll('button');
  if (buttons.length === tabs.length) {
    for (var i = 0; i < tabs.length; i++) {
      var btn = buttons[i];
      var isAct = (tabs[i].id === activeTab);
      btn.classList.toggle('active', isAct);
      btn.style.setProperty('color', isAct ? '#38bdf8' : '#94a3b8', 'important');
      btn.style.fontWeight = isAct ? '900' : '700';
    }
  } else {
    dock.innerHTML = tabs.map(function(t) {
      var isAct = (t.id === activeTab);
      var col = isAct ? '#38bdf8' : '#94a3b8';
      var fw = isAct ? '900' : '700';
      return '<button type="button" class="dock-item ' + (isAct ? 'active' : '') + '" title="' + t.name + '" onclick="' + t.action + '" style="background:none; border:none; padding:0; margin:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:' + col + ' !important; font-size:0.67rem; font-weight:' + fw + '; gap:3px; flex:1; height:56px; cursor:pointer; outline:none; -webkit-tap-highlight-color:transparent;">' +
        t.svg +
        '<span>' + t.name + '</span>' +
      '</button>';
    }).join('');
  }

  dock.style.display = 'flex';
  if (typeof window.okbmPaintNotifBadge === 'function') window.okbmPaintNotifBadge();
};

// 🧭 [5대 탭 전역 중앙 네비게이션 디스패처 - 선제적 탭 색상 고정 & DOM 파괴 없는 초고속 라우팅]
window.navigateToDockTab = function(tabId) {
  triggerHaptic(10);
  window.__okbmInspectBlockedUserId = '';
  if (Array.isArray(window.__modalHistoryStack)) {
    window.__modalHistoryStack = [];
  }
  var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');

  // 0. 누르자마자 0초 만에 해당 탭 색상 선제 고정 (핑퐁 점멸 완전 차단)
  window.ensureMasterBottomDock(tabId === 'route' ? 'router' : tabId);
  // 1. 영상 재생 중단 및 안전 닫기
  if (typeof closeVideoDetailModal === 'function') closeVideoDetailModal();
  if (typeof closeSecretSpotHeroModal === 'function') closeSecretSpotHeroModal();
  if (typeof closeThemeSpotAllModal === 'function') closeThemeSpotAllModal();
  if (typeof window.closePastTripRegisterModal === 'function') {
    try { window.closePastTripRegisterModal({ silent: true }); } catch (e) {}
  }

  // 2. 화면을 가로막고 있는 모든 테마스팟, 영상, 원정대, 수정창 일괄 소거
  [
    'secretSpotHeroModal',
    'themeSpotAllModal',
    'videoDetailModal',
    'tripDetailSheetModal',
    'tripCreateModal',
    'tripJoinListModal',
    'tripUserProfileModal',
    'tripDatePickerModal',
    'mapSpotFeedDetailModal',
    'templateCardModalOverlay',
    'modalRichAfterTrip',
    'pastTripsListModal',
    'pastTripRegisterModal',
    'pastTripDatePickerModal',
    'pastTripSpotChoiceOverlay',
    'pastTripSpotSearchModal',
    'richSpotRegisterChoiceOverlay',
    'planSpotRegisterChoiceOverlay',
    'singleTripFeedModal',
    'userFeedCollectionModal',
    'clearMapModal',
    'tripActionActionSheet',
    'feedCustomShareModal',
    'romanticInterestModal',
    'richTripSpotSearchModal',
    'gearPresetModal',
    'gearDetailModal',
    'quickGearDetailModal',
    'calcSpotSearchModal',
    'gearMetaEditSheet',
    'followedRoutersModal',
    'savedFeedsEmptyModal',
    'savedFeedsListModal',
    'blockedUsersManageModal',
    'adminReportInspectorModal',
    'feedReportReasonModal',
    'ugcSafetyMenuSheet',
    'reportSnsEditorModalOverlay',
    'reportBioEditorModalOverlay',
    'masterCoverLargeViewerModal',
    'coverPhotoCropperModal',
    'packShareModalOverlay',
    'photoStudioOverlay',
    'romanticConfirmModal',
    'romanticDatePickerModal',
    'presetActionModal',
    'planYearPickerOverlay',
    'datePickGuideHud',
    'userNotificationInboxModal',
    'directMessageThreadModal'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });
  okbmCloseAccountLayerModals();
  var loginOverlay = document.getElementById('loginModalOverlay');
  if (loginOverlay) loginOverlay.style.display = 'none';
  if (typeof window.unlockHomeScrollForTripModal === 'function') {
    window.unlockHomeScrollForTripModal();
  } else {
    document.body.classList.remove('trip-modal-open');
    document.body.style.top = '';
  }

  // 3. 5대 탭별 정밀 라우팅 (현 위치 스크롤 카메라 100% 유지)
  if (tabId === 'router' || tabId === 'route') {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof closeHistoryModal === 'function') closeHistoryModal();
    if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
    
    if (isMap) {
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('index.html');
      else window.location.assign('index.html');
      return;
    }
    // 🎯 홈 화면에서는 위로 튕기지 않고 내가 보던 그 자리 그대로 편안하게 유지
  } else if (tabId === 'map') {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof closeHistoryModal === 'function') closeHistoryModal();
    if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
    if (!isMap) {
      var mapUrl = 'map.html';
      try {
        sessionStorage.setItem('okbm_entered_via_index', '1');
        var pendingId = sessionStorage.getItem('okbm_pending_map_id');
        var pendingSpot = sessionStorage.getItem('okbm_pending_map_spot');
        var mapParams = [];
        if (pendingId) mapParams.push('id=' + encodeURIComponent(pendingId));
        if (pendingSpot) mapParams.push('spot=' + encodeURIComponent(pendingSpot));
        if (mapParams.length) mapUrl += '?' + mapParams.join('&');
        sessionStorage.removeItem('okbm_pending_map_id');
        sessionStorage.removeItem('okbm_pending_map_spot');
        sessionStorage.removeItem('okbm_target_spot');
        sessionStorage.removeItem('okbm_target_map_spot');
        localStorage.removeItem('okbm_target_spot');
        localStorage.removeItem('okbm_target_map_spot');
      } catch (e) {}
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate(mapUrl);
      else window.location.assign(mapUrl);
      return;
    }
    if (typeof setMobileSidebarCollapsed === 'function') {
      setMobileSidebarCollapsed(true);
    } else {
      var mapSidebar = document.getElementById('sidebar');
      if (mapSidebar) mapSidebar.classList.add('collapsed');
    }
    if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
    if (typeof closePcSlidingDrawer === 'function') closePcSlidingDrawer();
  } else if (tabId === 'plan') {
    if (typeof closeHistoryModal === 'function') closeHistoryModal();
    if (typeof closeUserProfileModal === 'function') closeUserProfileModal();

    // 🗺️ 지도 화면에서 플랜을 누르면 파라미터를 들고 index.html로 즉시 이동
    if (isMap) {
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('index.html?open=plan');
      else window.location.assign('index.html?open=plan');
      return;
    }
    if (typeof openPlanModal === 'function') {
      openPlanModal('calendar');
    }
  } else if (tabId === 'history') {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
    if (isMap) {
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('index.html?open=history');
      else window.location.assign('index.html?open=history');
      return;
    }
    if (typeof openHistoryModal === 'function') {
      openHistoryModal();
    }
  } else if (tabId === 'report') {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof closeHistoryModal === 'function') closeHistoryModal();
    if (!isUserLoggedIn()) {
      openLoginModal();
      return;
    }
    if (isMap) {
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('index.html?open=report');
      else window.location.assign('index.html?open=report');
      return;
    }
    if (typeof openUserProfileModal === 'function') {
      openUserProfileModal();
    }
  }

  window.ensureMasterBottomDock(tabId);
};

// 앱 초기 마운트 시 마스터 독 스마트 초기화 (상태 보존)
if (typeof window !== 'undefined') {
  window.ensureMasterBottomDock();
}

window.editReportUserBio = function() {
  triggerHaptic(10);
  var currentBio = okbmNormalizeUserBio(localStorage.getItem('okbm_user_bio') || '');
  var oldModal = document.getElementById('reportBioEditorModalOverlay');
  if (oldModal) oldModal.remove();

  var modal = document.createElement('div');
  modal.id = 'reportBioEditorModalOverlay';
  modal.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div style="width:100%; max-width:340px; background:#080b11; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:16px; box-sizing:border-box; display:flex; flex-direction:column; gap:12px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<span style="font-size:0.90rem; font-weight:900; color:#ffffff;">소개글</span>' +
        '<span id="bioEditorCharCount" style="font-size:0.68rem; color:#64748b; font-family:var(--font-mono);">' + currentBio.length + '/' + OKBM_USER_BIO_MAX + '</span>' +
      '</div>' +
      '<textarea id="bioEditorTextarea" maxlength="' + OKBM_USER_BIO_MAX + '" placeholder="소개글을 작성해보세요." style="width:100%; height:90px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px; color:#ffffff; font-size:0.78rem; line-height:1.45; resize:none; outline:none; box-sizing:border-box; font-family:inherit;"></textarea>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">' +
        '<button type="button" id="bioEditorCancelBtn" style="height:38px; background:rgba(255,255,255,0.06); border:none; border-radius:6px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer;">취소</button>' +
        '<button type="button" id="bioEditorSaveBtn" style="height:38px; background:#38bdf8; border:none; border-radius:6px; color:#000000; font-size:0.78rem; font-weight:900; cursor:pointer;">저장</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);

  var textarea = document.getElementById('bioEditorTextarea');
  var countEl = document.getElementById('bioEditorCharCount');
  var cancelBtn = document.getElementById('bioEditorCancelBtn');
  var saveBtn = document.getElementById('bioEditorSaveBtn');

  textarea.value = currentBio;
  setTimeout(function() {
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, 100);

  textarea.oninput = function() {
    var s = String(textarea.value || '');
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (s.length > OKBM_USER_BIO_MAX) s = s.slice(0, OKBM_USER_BIO_MAX);
    if (s !== textarea.value) textarea.value = s;
    countEl.innerText = s.length + '/' + OKBM_USER_BIO_MAX;
  };

  cancelBtn.onclick = function() {
    triggerHaptic(8);
    modal.remove();
  };

  saveBtn.onclick = function() {
    triggerHaptic(12);
    var clean = okbmNormalizeUserBio(textarea.value);
    localStorage.setItem('okbm_user_bio', clean);

    var profile = safeGetJSON('user_profile', null) || {};
    profile.bio = clean;
    localStorage.setItem('user_profile', JSON.stringify(profile));
    if (profile.id) localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));

    var bioEl = document.getElementById('reportProfileBioText');
    if (bioEl) {
      bioEl.innerText = clean || '소개글을 작성해보세요.';
      bioEl.style.color = clean ? '#cbd5e1' : '#64748b';
    }

    var collBioEl = document.getElementById('userCollectionBioText');
    if (collBioEl) {
      collBioEl.innerText = clean || '소개글을 작성해보세요.';
      collBioEl.style.color = clean ? '#cbd5e1' : '#64748b';
    }
    document.querySelectorAll('.user-profile-bio-span').forEach(function(span) {
      span.innerText = clean || '소개글을 작성해보세요.';
      span.style.color = clean ? '#cbd5e1' : '#64748b';
    });

    if (typeof window.saveUserToSupabase === 'function') {
      window.saveUserToSupabase(profile).catch(function(e) {
        console.warn('[romantic-sync.js:editReportUserBio]', e);
      });
    }

    modal.remove();
    showToast('소개글이 저장되었습니다.', 'success', 1500);
  };
};

window.__pastTripRegisterState = window.__pastTripRegisterState || {
  photos: [],
  photoMemos: [],
  presetId: '',
  items: [],
  elev: '',
  region: '',
  spotId: '',
  spotName: '',
  spotPath: '',
  memoMode: 'single',
  singleMemo: '',
  photoIndex: 0
};

window.closePastTripRegisterModal = function(opts) {
  opts = opts || {};
  var silent = !!(opts.silent || opts.skipBack);
  if (window.__pastTripProposalObserver) {
    try { window.__pastTripProposalObserver.disconnect(); } catch (e) {}
    window.__pastTripProposalObserver = null;
  }
  var choice = document.getElementById('pastTripSpotChoiceOverlay');
  if (choice) choice.remove();
  var el = document.getElementById('pastTripRegisterModal');
  if (el) el.remove();
  var search = document.getElementById('pastTripSpotSearchModal');
  if (search) search.remove();
  var picker = document.getElementById('pastTripDatePickerModal');
  if (picker) picker.remove();
  if (silent) return;
  if (typeof window.goBackModal === 'function') {
    try { window.goBackModal(); } catch (e) {}
  } else if (typeof window.openUserProfileModal === 'function') {
    window.openUserProfileModal();
  }
};

window._pastTripFormatDateKey = function(isoDate) {
  var parts = String(isoDate || '').match(/\d+/g);
  if (!parts || parts.length < 3) return '';
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  if (!y || !m || !d) return '';
  return y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0');
};

window._pastTripYesterdayIso = function() {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

window._pastTripIsoToDisplay = function(isoDate) {
  var key = window._pastTripFormatDateKey(isoDate);
  return key || '';
};

window._pastTripSyncDateDisplay = function() {
  var hidden = document.getElementById('pastTripDateInput');
  var display = document.getElementById('pastTripDateDisplay');
  if (!hidden || !display) return;
  var iso = String(hidden.value || '').trim() || window._pastTripYesterdayIso();
  hidden.value = iso;
  display.textContent = window._pastTripIsoToDisplay(iso);
};

window.openPastTripDatePicker = function() {
  triggerHaptic(10);
  var old = document.getElementById('pastTripDatePickerModal');
  if (old) old.remove();
  var hidden = document.getElementById('pastTripDateInput');
  var iso = hidden ? String(hidden.value || '').trim() : window._pastTripYesterdayIso();
  var parts = String(iso).match(/\d+/g) || [];
  window.__pastTripPickerYear = parseInt(parts[0], 10) || new Date().getFullYear();
  window.__pastTripPickerMonth = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
  window.__pastTripPickerView = 'days';

  var overlay = document.createElement('div');
  overlay.id = 'pastTripDatePickerModal';
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:2147483646; display:flex; justify-content:center; align-items:center; padding:16px; box-sizing:border-box;';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div style="width:100%; max-width:336px; background:#0c1017; border-radius:14px; border:1px solid rgba(255,255,255,0.12); padding:12px 12px 14px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; max-height:min(78dvh, 520px); overflow:auto; box-shadow:0 16px 40px rgba(0,0,0,0.55);" onclick="event.stopPropagation();">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<span style="font-size:0.82rem; font-weight:900; color:#fff;">날짜 선택</span>' +
        '<button type="button" onclick="document.getElementById(\'pastTripDatePickerModal\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1rem; cursor:pointer;">✕</button>' +
      '</div>' +
      '<div style="display:flex; gap:6px;">' +
        '<button type="button" id="pastTripPickerYearBtn" onclick="window.setPastTripPickerView(\'years\');" style="flex:1; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#fff; font-size:0.80rem; font-weight:900; cursor:pointer;"></button>' +
        '<button type="button" id="pastTripPickerMonthBtn" onclick="window.setPastTripPickerView(\'months\');" style="flex:1; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#fff; font-size:0.80rem; font-weight:900; cursor:pointer;"></button>' +
      '</div>' +
      '<div id="pastTripPickerBody"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  window.renderPastTripDatePicker();
};

window.setPastTripPickerView = function(view) {
  triggerHaptic(8);
  window.__pastTripPickerView = view || 'days';
  window.renderPastTripDatePicker();
};

window.selectPastTripPickerYear = function(year) {
  triggerHaptic(8);
  var y = parseInt(year, 10);
  var maxY = new Date().getFullYear();
  if (!y || y > maxY || y < 2000) return;
  window.__pastTripPickerYear = y;
  var now = new Date();
  if (y === now.getFullYear() && window.__pastTripPickerMonth > now.getMonth() + 1) {
    window.__pastTripPickerMonth = now.getMonth() + 1;
  }
  window.__pastTripPickerView = 'days';
  window.renderPastTripDatePicker();
};

window.selectPastTripPickerMonth = function(month) {
  triggerHaptic(8);
  var m = parseInt(month, 10);
  if (!m || m < 1 || m > 12) return;
  var y = Number(window.__pastTripPickerYear) || new Date().getFullYear();
  var now = new Date();
  if (y === now.getFullYear() && m > now.getMonth() + 1) return;
  window.__pastTripPickerMonth = m;
  window.__pastTripPickerView = 'days';
  window.renderPastTripDatePicker();
};

window.selectPastTripPickerDay = function(day) {
  triggerHaptic(10);
  var y = Number(window.__pastTripPickerYear);
  var m = Number(window.__pastTripPickerMonth);
  var d = parseInt(day, 10);
  if (!y || !m || !d) return;
  var iso = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  var today = new Date();
  var todayNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var targetNum = y * 10000 + m * 100 + d;
  if (targetNum >= todayNum) {
    if (typeof showToast === 'function') showToast('오늘 이전 날짜만 선택할 수 있습니다.', 'warn');
    return;
  }
  var hidden = document.getElementById('pastTripDateInput');
  if (hidden) hidden.value = iso;
  window._pastTripSyncDateDisplay();
  var picker = document.getElementById('pastTripDatePickerModal');
  if (picker) picker.remove();
};

window.renderPastTripDatePicker = function() {
  var y = Number(window.__pastTripPickerYear) || new Date().getFullYear();
  var m = Number(window.__pastTripPickerMonth) || 1;
  var view = window.__pastTripPickerView || 'days';
  var yearBtn = document.getElementById('pastTripPickerYearBtn');
  var monthBtn = document.getElementById('pastTripPickerMonthBtn');
  var body = document.getElementById('pastTripPickerBody');
  if (yearBtn) yearBtn.textContent = y + '년';
  if (monthBtn) monthBtn.textContent = m + '월';
  if (!body) return;

  var now = new Date();
  now.setHours(0, 0, 0, 0);
  var curYear = now.getFullYear();
  var curMonth = now.getMonth() + 1;
  var selectedIso = (document.getElementById('pastTripDateInput') || {}).value || '';
  var onCss = 'border:1px solid rgba(226,232,240,0.55); background:rgba(226,232,240,0.16); color:#fff;';
  var offCss = 'border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:#cbd5e1;';
  var disCss = 'border:1px solid transparent; background:transparent; color:#475569;';

  if (view === 'years') {
    var years = [];
    for (var yy = curYear; yy >= Math.max(2000, curYear - 24); yy--) years.push(yy);
    body.innerHTML = '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px; max-height:220px; overflow-y:auto;">' +
      years.map(function(yy) {
        var on = yy === y;
        return '<button type="button" onclick="window.selectPastTripPickerYear(' + yy + ');" style="height:32px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer; ' + (on ? onCss : offCss) + '">' + yy + '</button>';
      }).join('') + '</div>';
    return;
  }

  if (view === 'months') {
    body.innerHTML = '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px;">' +
      [1,2,3,4,5,6,7,8,9,10,11,12].map(function(mm) {
        var disabled = (y > curYear) || (y === curYear && mm > curMonth);
        var on = mm === m;
        return '<button type="button" ' + (disabled ? 'disabled' : 'onclick="window.selectPastTripPickerMonth(' + mm + ');"') +
          ' style="height:32px; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:' + (disabled ? 'default' : 'pointer') + '; ' +
          (disabled ? disCss : (on ? onCss : offCss)) + '">' + mm + '월</button>';
      }).join('') + '</div>';
    return;
  }

  var firstDay = new Date(y, m - 1, 1).getDay();
  var lastDay = new Date(y, m, 0).getDate();
  var html = '<div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.56rem; font-weight:800; color:#64748b; margin-bottom:4px;">' +
    '<span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>' +
    '<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:3px;">';
  for (var b = 0; b < firstDay; b++) html += '<div style="height:32px;"></div>';
  for (var day = 1; day <= lastDay; day++) {
    var cell = new Date(y, m - 1, day);
    cell.setHours(0, 0, 0, 0);
    var disabled = cell.getTime() >= now.getTime();
    var iso = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var on = iso === selectedIso;
    html += '<button type="button" ' + (disabled ? 'disabled' : 'onclick="window.selectPastTripPickerDay(' + day + ');"') +
      ' style="height:32px; border-radius:8px; font-size:0.74rem; font-weight:800; cursor:' + (disabled ? 'default' : 'pointer') + '; ' +
      (disabled ? disCss : (on ? onCss : 'border:1px solid transparent; background:transparent; color:#e2e8f0;')) + '">' + day + '</button>';
  }
  html += '</div>';
  body.innerHTML = html;
};

window._pastTripNormSpotKey = function(name) {
  return String(name || '').replace(/\s+/g, '').toLowerCase();
};

window._pastTripStripCityPrefix = function(name, city) {
  var n = String(name || '').trim();
  var c = String(city || '').trim();
  if (!n) return '';
  n = n.replace(/^\[\s*[^\]]+\s*\]\s*/, '');
  n = n.replace(/([가-힣]+(?:시|군|구))\s+\1\b/g, '$1');
  if (!c) return n.trim();
  var esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  n = n.replace(new RegExp('^\\[\\s*' + esc + '\\s*\\]\\s*', 'i'), '');
  var base = c.replace(/(시|군|구)$/, '');
  [c, base, base + '시', base + '군', base + '구'].forEach(function(v) {
    if (!v) return;
    var re = new RegExp('^' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+', 'i');
    n = n.replace(re, '');
  });
  n = n.replace(/([가-힣]+(?:시|군|구))\s+\1\b/g, '$1');
  return n.trim();
};

window._pastTripComposeSpotLabel = function(rawName, cityName) {
  var clean = window._pastTripStripCityPrefix(rawName, cityName);
  return clean || String(rawName || '').replace(/^\[\s*[^\]]+\s*\]\s*/, '').trim();
};

window._pastTripMergeSpotRegion = function(spot, region) {
  var s = String(spot || '').trim();
  var r = String(region || '').trim();
  if (!s) return r || '';
  if (!r) return s;
  var stripped = window._pastTripStripCityPrefix(s, r);
  if (s.indexOf(r) !== -1 || stripped !== s) return stripped || s;
  return r + ' ' + stripped;
};

window._pastTripGenericSpotKeys = {
  '자유일정': true,
  '나의해힐링스팟': true,
  '힐링박지': true
};

window._pastTripInvalidateSpotsSearchCache = function() {
  window.__pastTripSpotsSearchCache = null;
};

window._pastTripCollectSpotNameKeys = function(spot) {
  var keys = {};
  if (!spot) return keys;
  var city = String(spot.cityName || spot.city_name || '').trim();
  var main = String(spot.spot_main || spot.name || spot.spotName || '').trim();
  var names = [
    spot.fullName, spot.name, spot.spot_main, spot.spotName, spot.rawName,
    main,
    city ? (city + ' ' + main) : '',
    city ? (city + ' ' + String(spot.fullName || '')) : ''
  ];
  names.forEach(function(n) {
    var k = window._pastTripNormSpotKey(n);
    if (k && !window._pastTripGenericSpotKeys[k]) keys[k] = true;
  });
  return keys;
};

window._pastTripHasValidFieldPhotos = function(r) {
  if (!r) return false;
  var photosList = [];
  if (Array.isArray(r.photos)) {
    photosList = r.photos;
  } else if (typeof r.photos === 'string' && r.photos.trim().startsWith('[')) {
    try { photosList = JSON.parse(r.photos); } catch (e) { photosList = []; }
  }
  var tmplPhoto = String(r.readyShotPhoto || r.ready_shot_photo || r.customTemplatePhoto || '').trim();
  return photosList.some(function(u) {
    return typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://')) && u.indexOf('unsplash.com') === -1 && u !== tmplPhoto;
  });
};

window._pastTripIsOwnHistoryRecord = function(r) {
  if (!r) return false;
  var curUserId = okbmGetCurrentUserId();
  var rUid = String(r.userId || r.user_id || '').trim();
  if (curUserId && rUid) {
    if (curUserId === rUid) return true;
    var curPure = curUserId.replace(/\D/g, '');
    var rPure = rUid.replace(/\D/g, '');
    return Boolean(curPure && rPure && curPure === rPure);
  }
  return Boolean(r._isLocalOwner);
};

window._pastTripRecordMatchesAdoptedSpot = function(r, nameKeys) {
  if (!r || r._memDeleted === true || r.isDeleted === true || r.is_deleted === true) return false;
  if (!(r.unregisteredSpot === true || r.unregistered_spot === true)) return false;
  if (!window._pastTripIsOwnHistoryRecord(r)) return false;
  var nameKey = window._pastTripNormSpotKey(r.spot || r.spotName || '');
  if (!nameKey || window._pastTripGenericSpotKeys[nameKey]) return false;
  return Boolean(nameKeys && nameKeys[nameKey]);
};

window._pastTripPersistHistoryPools = function(list) {
  var next = Array.isArray(list) ? list.slice() : [];
  window.interactiveHistory = next.slice();
  window.packingHistoryList = window.interactiveHistory;
  window.__memoryStore = window.__memoryStore || {};
  window.__memoryStore['okbm_packing_history'] = next.slice();
  var persistHist = (typeof window.okbmCapPackingHistoryList === 'function')
    ? window.okbmCapPackingHistoryList(next)
    : next.slice(0, 30);
  if (typeof window.okbmSafeSetItem === 'function') {
    window.okbmSafeSetItem('okbm_packing_history', JSON.stringify(persistHist));
  } else {
    try {
      localStorage.setItem('okbm_packing_history', JSON.stringify(persistHist));
    } catch (e) {
      console.warn('[romantic-sync.js:_pastTripPersistHistoryPools]', e);
    }
  }
  if (typeof window.safeSetStorage === 'function') {
    try { window.safeSetStorage('okbm_packing_history', next); } catch (e2) {}
  }
};

window._pastTripLinkUnregisteredRecordsToSpot = async function(spot, spotId, nameKeys) {
  var id = String(spotId || (spot && spot.id) || '').trim();
  if (!id) return 0;
  var keys = nameKeys || window._pastTripCollectSpotNameKeys(spot);
  if (!keys || !Object.keys(keys).length) return 0;

  var applyLink = function(r) {
    if (!window._pastTripRecordMatchesAdoptedSpot(r, keys)) return false;
    r.spotId = id;
    r.spot_id = id;
    r.unregisteredSpot = false;
    r.unregistered_spot = false;
    var nextPublished = window._pastTripHasValidFieldPhotos(r);
    r.isPublished = nextPublished;
    r.is_published = nextPublished;
    return true;
  };

  var linkedIds = [];
  var seen = {};
  var extraRecords = [];
  var list = [];
  if (typeof window.safeGetStorage === 'function') {
    list = window.safeGetStorage('okbm_packing_history', []) || [];
  } else if (typeof safeGetJSON === 'function') {
    list = safeGetJSON('okbm_packing_history', []) || [];
  }
  if (!Array.isArray(list)) list = [];

  list.forEach(function(r) {
    if (!applyLink(r)) return;
    var recId = String(r.id || '').trim();
    if (!recId || seen[recId]) return;
    seen[recId] = true;
    linkedIds.push({ id: recId, published: Boolean(r.isPublished) });
  });

  var patchPool = function(pool) {
    if (!Array.isArray(pool)) return;
    pool.forEach(function(r) {
      if (!applyLink(r)) return;
      var recId = String(r.id || '').trim();
      if (!recId || seen[recId]) return;
      seen[recId] = true;
      linkedIds.push({ id: recId, published: Boolean(r.isPublished) });
      extraRecords.push(r);
    });
  };
  patchPool(window.interactiveHistory);
  patchPool(window.packingHistoryList);
  patchPool(window.__allLoadedFeeds);
  if (window.__memoryStore) patchPool(window.__memoryStore['okbm_packing_history']);

  if (!linkedIds.length) return 0;

  extraRecords.forEach(function(r) { list.unshift(r); });
  window._pastTripPersistHistoryPools(list);

  if (Array.isArray(window.__allLoadedFeeds) && typeof window.okbmWriteCachedCommunityFeeds === 'function') {
    try { window.okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds); } catch (e) {}
  }

  if (typeof window.patchFeedPublishStatus === 'function') {
    for (var i = 0; i < linkedIds.length; i++) {
      if (!linkedIds[i].published) continue;
      try {
        await window.patchFeedPublishStatus(linkedIds[i].id, linkedIds[i].published);
      } catch (pubErr) {
        console.warn('[romantic-sync.js:_pastTripLinkUnregisteredRecordsToSpot publish]', pubErr);
      }
    }
  }

  if (typeof window.refreshMyReportFullStats === 'function') {
    window.refreshMyReportFullStats();
  }
  if (typeof syncUserDataToCloud === 'function') {
    try { syncUserDataToCloud(true); } catch (syncErr) {}
  }
  return linkedIds.length;
};

window._pastTripReadPresets = function() {
  var presets = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_gear_presets', [])
    : (typeof safeGetJSON === 'function' ? safeGetJSON('okbm_gear_presets', []) : []);
  return Array.isArray(presets) ? presets : [];
};

window._pastTripFlattenPresetItems = function(preset) {
  var items = [];
  var totalGrams = 0;
  if (!preset || !preset.gears || typeof preset.gears !== 'object') {
    return { items: items, totalGrams: 0 };
  }
  Object.keys(preset.gears).forEach(function(catId) {
    (preset.gears[catId] || []).forEach(function(it) {
      if (!it || !(it.name || it.itemName)) return;
      var gName = it.name || it.itemName;
      var gWeight = Number(it.weight || it.weight_g || 0);
      items.push({
        id: it.id || ('item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        name: gName,
        weight: gWeight,
        categoryId: catId
      });
      totalGrams += gWeight;
    });
  });
  return { items: items, totalGrams: totalGrams };
};

window._pastTripBuildSpotSearchPool = function() {
  if (window.__pastTripSpotsSearchCache && window.__pastTripSpotsSearchCache.length > 0) {
    return window.__pastTripSpotsSearchCache;
  }
  var rawPool = [];
  if (Array.isArray(window.spots)) rawPool = rawPool.concat(window.spots);
  if (Array.isArray(window.campingSpots)) rawPool = rawPool.concat(window.campingSpots);
  if (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) rawPool = rawPool.concat(registeredSpots);
  ['okbm_spots_cache', 'okbm_master_spots', 'camping_spots', 'okbm_spots'].forEach(function(k) {
    try {
      var item = localStorage.getItem(k);
      if (!item) return;
      var parsed = JSON.parse(item);
      if (Array.isArray(parsed)) rawPool = rawPool.concat(parsed);
    } catch (e) {}
  });
  var spotsMap = new Map();
  rawPool.forEach(function(s) {
    if (!s) return;
    var rawName = String(s.fullName || s.spot_main || s.name || s.spotName || s.spot || '').trim();
    if (!rawName || rawName === '나의 힐링 스팟' || rawName === '힐링 장소') return;
    var spotId = String(s.id || s.spot_id || '').trim();
    var cityName = '';
    if (typeof window.extractSmartCityName === 'function') {
      cityName = window.extractSmartCityName(s) || '';
    } else {
      var addrStr = String(s.address || s.addr || s.region || s.city_name || s.cityName || '').trim();
      var match = addrStr.match(/([가-힣]+(?:시|군|구))/);
      cityName = match ? match[1] : String(s.city_name || s.cityName || '').trim();
    }
    var placeLabel = window._pastTripComposeSpotLabel(rawName, cityName);
    var searchName = cityName ? (cityName + ' ' + placeLabel) : placeLabel;
    var cleanKey = searchName.replace(/\s+/g, '').toLowerCase();
    var existing = spotsMap.get(cleanKey);
    if (!existing || (!existing.id && spotId)) {
      spotsMap.set(cleanKey, {
        id: spotId,
        name: placeLabel,
        searchName: searchName,
        rawName: rawName,
        cityName: cityName,
        elevation: s.elevation || s.alt || s.height || '',
        region: cityName || s.region || s.city_name || s.cityName || '',
        address: s.address || s.addr || s.roadAddress || ''
      });
    }
  });
  window.__pastTripSpotsSearchCache = Array.from(spotsMap.values());
  return window.__pastTripSpotsSearchCache;
};

window._pastTripCleanYoutubeUrl = function(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  var id = '';
  var m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/|music\/)|[?&]v=)([a-zA-Z0-9_-]{11})/i);
  if (m) id = m[1];
  if (!id) {
    var only = s.match(/\b([a-zA-Z0-9_-]{11})\b/);
    if (only && /youtu/i.test(s)) id = only[1];
  }
  if (!id && /^[a-zA-Z0-9_-]{11}$/.test(s)) id = '';
  return id ? ('https://www.youtube.com/watch?v=' + id) : '';
};

window._pastTripCleanNaverBlogUrl = function(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  var m = s.match(/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{8,})/i);
  if (m) return 'https://blog.naver.com/' + m[1] + '/' + m[2];
  var q = s.match(/(?:blogId|blogid)=([A-Za-z0-9_-]+)[\s\S]*?(?:logNo|logno)=(\d{8,})/i);
  if (q) return 'https://blog.naver.com/' + q[1] + '/' + q[2];
  var q2 = s.match(/(?:logNo|logno)=(\d{8,})[\s\S]*?(?:blogId|blogid)=([A-Za-z0-9_-]+)/i);
  if (q2) return 'https://blog.naver.com/' + q2[2] + '/' + q2[1];
  return '';
};

window.onPastTripLinkBlur = function(kind) {
  var el = document.getElementById(kind === 'yt' ? 'pastTripYoutubeInput' : 'pastTripNaverInput');
  if (!el) return;
  var raw = String(el.value || '').trim();
  if (!raw) return;
  var clean = kind === 'yt' ? window._pastTripCleanYoutubeUrl(raw) : window._pastTripCleanNaverBlogUrl(raw);
  if (clean) el.value = clean;
};

window._pastTripCoerceUrlList = function(v) {
  if (Array.isArray(v)) return v.slice();
  if (typeof v === 'string' && v.trim()) {
    return v.split(/[\r\n,]+/).map(function(u) { return String(u || '').trim(); }).filter(Boolean);
  }
  return [];
};

window._pastTripNormalizeMediaUrl = function(url, kind) {
  var s = String(url || '').trim();
  if (!s) return '';
  if (kind === 'yt') return window._pastTripCleanYoutubeUrl(s) || '';
  if (kind === 'blog') return window._pastTripCleanNaverBlogUrl(s) || '';
  return s;
};

window._pastTripMergeUniqueUrls = function(baseList, extra, opts) {
  opts = opts || {};
  var kind = opts.kind || '';
  var preferNew = !!opts.preferNew;
  var max = Number(opts.max) > 0 ? Number(opts.max) : 0;
  var normalize = function(u) {
    var raw = String(u || '').trim();
    if (!raw) return '';
    if (kind === 'yt' || kind === 'blog') {
      return window._pastTripNormalizeMediaUrl(raw, kind) || raw;
    }
    return raw;
  };
  var base = window._pastTripCoerceUrlList(baseList).map(normalize).filter(Boolean);
  var add = window._pastTripCoerceUrlList(Array.isArray(extra) ? extra : [extra]).map(normalize).filter(Boolean);
  var out = [];
  var seen = {};
  var push = function(u) {
    var key = String(u).trim().toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push(u);
  };
  if (preferNew) {
    add.forEach(push);
    base.forEach(push);
  } else {
    base.forEach(push);
    add.forEach(push);
  }
  if (max) out = out.slice(0, max);
  return out;
};

window._pastTripInvalidateSpotMediaCache = function(spotId) {
  var id = String(spotId || '').trim();
  if (!id) return;
  try {
    if (window.__spotYtCardsCache) delete window.__spotYtCardsCache[id];
    if (window.__spotYtPrefetch) delete window.__spotYtPrefetch[id];
    if (window.__spotBlogCardsCache) delete window.__spotBlogCardsCache[id];
    if (window.__spotBlogPrefetch) delete window.__spotBlogPrefetch[id];
  } catch (e) {}
};

window._pastTripReadPendingMedia = function() {
  var raw = (typeof safeGetJSON === 'function') ? safeGetJSON('okbm_pending_spot_media', {}) : {};
  return (raw && typeof raw === 'object') ? raw : {};
};

window._pastTripWritePendingMedia = function(map) {
  try {
    localStorage.setItem('okbm_pending_spot_media', JSON.stringify(map || {}));
  } catch (e) {}
  if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
    window.RomanticVault.write('okbm_pending_spot_media', map || {}, true);
  }
};

window._pastTripSavePendingMedia = function(spotName, ytUrl, blogUrl) {
  var key = window._pastTripNormSpotKey(spotName);
  if (!key) return;
  var map = window._pastTripReadPendingMedia();
  var row = map[key] || { spotName: spotName, youtube: [], blog: [] };
  row.spotName = spotName;
  if (ytUrl) row.youtube = window._pastTripMergeUniqueUrls(row.youtube, ytUrl);
  if (blogUrl) row.blog = window._pastTripMergeUniqueUrls(row.blog, blogUrl);
  map[key] = row;
  window._pastTripWritePendingMedia(map);
};

window.flushPendingSpotMediaForSpot = async function(spot) {
  if (!spot) return false;
  var spotId = String(spot.id || '').trim();
  if (!spotId) return false;

  window._pastTripInvalidateSpotsSearchCache();

  var nameKeys = window._pastTripCollectSpotNameKeys(spot);
  var map = window._pastTripReadPendingMedia();
  var ytAdd = [];
  var blogAdd = [];
  var matchedKeys = [];
  Object.keys(map || {}).forEach(function(k) {
    if (!k || !nameKeys[k] || !map[k]) return;
    matchedKeys.push(k);
    ytAdd = window._pastTripMergeUniqueUrls(ytAdd, map[k].youtube);
    blogAdd = window._pastTripMergeUniqueUrls(blogAdd, map[k].blog);
  });

  var mediaOk = false;
  if (ytAdd.length || blogAdd.length) {
    mediaOk = await window._pastTripMergeSpotMediaUrls(spotId, ytAdd, blogAdd);
    if (mediaOk && matchedKeys.length) {
      matchedKeys.forEach(function(k) { delete map[k]; });
      window._pastTripWritePendingMedia(map);
    }
  }

  var linked = 0;
  try {
    linked = await window._pastTripLinkUnregisteredRecordsToSpot(spot, spotId, nameKeys);
  } catch (linkErr) {
    console.warn('[romantic-sync.js:flushPendingSpotMediaForSpot link]', linkErr);
  }
  if (linked > 0 && typeof showToast === 'function') {
    showToast('같은 이름 비등록 기록 ' + linked + '건을 이 장소에 연결했습니다.', 'success', 2400);
  }
  return mediaOk || linked > 0;
};

window.okbmRpcMergeSpotMediaUrls = async function(spotId, urls) {
  var id = String(spotId || '').trim();
  var list = (Array.isArray(urls) ? urls : []).map(function(u) { return String(u || '').trim(); }).filter(function(u) {
    return /^https?:\/\//i.test(u);
  });
  if (!id || !list.length) return null;
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL || '';
  if (!targetUrl) return null;
  try {
    var mergeHeaders = okbmWriteRestHeaders();
    if (!mergeHeaders) return null;
    var res = await fetch(targetUrl + '/rest/v1/rpc/merge_spot_media_urls', {
      method: 'POST',
      headers: mergeHeaders,
      body: JSON.stringify({ p_spot_id: id, p_urls: list })
    });
    if (!res.ok) return null;
    var payload = await res.json();
    if (payload && payload.ok === true) return payload;
    return null;
  } catch (e) {
    console.warn('[romantic-sync.js:okbmRpcMergeSpotMediaUrls]', e);
    return null;
  }
};

window._pastTripMergeSpotMediaUrls = async function(spotId, ytUrls, blogUrls) {
  var id = String(spotId || '').trim();
  if (!id) return false;
  var incoming = window._pastTripMergeUniqueUrls(
    window._pastTripCoerceUrlList(ytUrls),
    window._pastTripCoerceUrlList(blogUrls)
  ).filter(function(u) { return /^https?:\/\//i.test(String(u || '').trim()); });
  if (!incoming.length) return false;

  var rpcResult = await window.okbmRpcMergeSpotMediaUrls(id, incoming);
  if (!rpcResult) return false;

  var nextMedia = String(rpcResult.mediaUrls || '').trim();
  var parsed = window.parseSpotMediaUrls(nextMedia);
  var nextYt = parsed.youtubeUrls || [];
  var nextBlog = parsed.blogUrls || [];

  var syncLocal = function(list) {
    if (!Array.isArray(list)) return;
    list.forEach(function(s) {
      if (!s || String(s.id).trim() !== id) return;
      s.youtubeUrls = nextYt.slice();
      s.blogUrls = nextBlog.slice();
      s.youtube_urls = nextYt.slice();
      s.blog_urls = nextBlog.slice();
      s.mediaUrls = nextMedia;
    });
  };
  syncLocal(window.spots);
  syncLocal(window.campingSpots);
  syncLocal(typeof registeredSpots !== 'undefined' ? registeredSpots : null);
  try {
    var cache = (typeof window.okbmReadSpotsCache === 'function')
      ? window.okbmReadSpotsCache()
      : (safeGetJSON('okbm_spots_cache', []) || []);
    if (Array.isArray(cache) && cache.length) {
      syncLocal(cache);
      if (typeof window.persistLightweightSpotsCache === 'function') {
        window.persistLightweightSpotsCache(cache);
      }
    }
  } catch (e) {}
  if (typeof window._pastTripInvalidateSpotsSearchCache === 'function') {
    window._pastTripInvalidateSpotsSearchCache();
  }
  if (typeof window._pastTripInvalidateSpotMediaCache === 'function') {
    window._pastTripInvalidateSpotMediaCache(id);
  }
  return true;
};

window._pastTripEnsurePhotoMemos = function() {
  var st = window.__pastTripRegisterState || { photos: [], photoMemos: [] };
  st.photoMemos = Array.isArray(st.photoMemos) ? st.photoMemos : [];
  var photos = st.photos || [];
  while (st.photoMemos.length < Math.max(1, photos.length)) st.photoMemos.push('');
  if (st.photoMemos.length > Math.max(1, photos.length)) {
    st.photoMemos.length = Math.max(1, photos.length);
  }
  window.__pastTripRegisterState = st;
};

window._pastTripEsc = function(t) {
  return (typeof window.escapeHtml === 'function') ? window.escapeHtml(t) : String(t == null ? '' : t);
};

window._pastTripRenderPhotoStage = function() {
  window._pastTripEnsurePhotoMemos();
  var st = window.__pastTripRegisterState;
  var photos = st.photos || [];
  var idx = Math.max(0, Math.min(Number(st.photoIndex) || 0, Math.max(0, photos.length - 1)));
  st.photoIndex = idx;
  var stage = document.getElementById('pastTripPhotoStage');
  var countEl = document.getElementById('pastTripPhotoCountLabel');
  var badgeEl = document.getElementById('pastTripPhotoIndexBadge');
  if (countEl) countEl.textContent = '등록된 사진 (' + photos.length + '장 / 최대 10장)';
  if (badgeEl) badgeEl.textContent = photos.length ? ((idx + 1) + ' / ' + photos.length) : '0 / 0';
  if (stage) {
    if (!photos.length) {
      stage.innerHTML =
        '<div onclick="document.getElementById(\'pastTripPhotoInput\').click();" style="width:100%; aspect-ratio:3/4; max-height:420px; border:1.5px dashed rgba(255,255,255,0.16); border-radius:14px; background:#0b0f17; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; cursor:pointer; box-sizing:border-box;">' +
          '<div style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; color:#cbd5e1;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px; height:26px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
          '</div>' +
          '<span style="font-size:0.88rem; font-weight:800; color:#e2e8f0;">사진 추가</span>' +
          '<span style="font-size:0.68rem; color:#64748b; text-align:center; line-height:1.45;">최대 10장</span>' +
        '</div>';
    } else {
      var esc = window._pastTripEsc;
      var slidesHtml = photos.map(function(url, pIdx) {
        return '<div style="flex:0 0 100%; width:100%; height:100%; scroll-snap-align:start; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(url)) + '" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(22px) brightness(0.32); transform:scale(1.15); pointer-events:none;" />' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(url)) + '" alt="" style="position:relative; z-index:2; width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />' +
          '<button type="button" onclick="event.stopPropagation(); window.removePastTripPhoto(' + pIdx + ');" style="position:absolute; top:10px; right:10px; z-index:10; width:28px; height:28px; border-radius:50%; background:#0c1017; color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); font-size:13px; font-weight:900; cursor:pointer;">✕</button>' +
        '</div>';
      }).join('');
      var thumbsHtml = photos.map(function(tUrl, tIdx) {
        var on = tIdx === idx;
        var border = on
          ? 'border:2.5px solid #94a3b8; box-shadow:0 0 10px rgba(148,163,184,0.45); transform:scale(1.06); z-index:3; opacity:1;'
          : 'border:1px solid rgba(255,255,255,0.16); opacity:0.65;';
        return '<div data-past-thumb-idx="' + tIdx + '" draggable="true"' +
          ' ondragstart="window._pastTripThumbDragStart(event,' + tIdx + ');"' +
          ' ondragover="window._pastTripThumbDragOver(event);"' +
          ' ondrop="window._pastTripThumbDrop(event,' + tIdx + ');"' +
          ' ondragend="window._pastTripThumbDragEnd();"' +
          ' ontouchstart="window._pastTripThumbTouchStart(event,' + tIdx + ');"' +
          ' ontouchmove="window._pastTripThumbTouchMove(event);"' +
          ' ontouchend="window._pastTripThumbTouchEnd(event);"' +
          ' onclick="window.focusPastTripPhoto(' + tIdx + ');"' +
          ' style="width:54px; height:54px; border-radius:9px; overflow:hidden; position:relative; flex-shrink:0; cursor:grab; background:#000; box-sizing:border-box; user-select:none; -webkit-user-select:none; touch-action:none; ' + border + '">' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(tUrl)) + '" alt="" style="width:100%; height:100%; object-fit:cover; pointer-events:none; display:block;" />' +
        '</div>';
      }).join('');
      stage.innerHTML =
        '<div style="width:100%; aspect-ratio:3/4; max-height:420px; position:relative; overflow:hidden; border-radius:14px; background:#000; border:1px solid rgba(255,255,255,0.12);">' +
          '<div id="pastTripPhotoSwipeTrack" onscroll="window._pastTripOnPhotoSwipeScroll(this);" style="display:flex; width:100%; height:100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; touch-action:pan-x;">' +
            slidesHtml +
          '</div>' +
          (photos.length < 10
            ? '<button type="button" onclick="document.getElementById(\'pastTripPhotoInput\').click();" style="position:absolute; bottom:12px; right:12px; z-index:10; background:#0c1017; border:1px solid rgba(255,255,255,0.22); color:#e2e8f0; font-size:0.72rem; font-weight:800; padding:6px 12px; border-radius:20px; cursor:pointer;">사진 추가</button>'
            : '') +
        '</div>' +
        '<div id="pastTripPhotoThumbs" style="width:100%; display:flex; flex-wrap:wrap; gap:8px; padding:10px 0 6px 0; box-sizing:border-box;">' +
          thumbsHtml +
        '</div>';
      setTimeout(function() {
        var track = document.getElementById('pastTripPhotoSwipeTrack');
        if (track) track.scrollLeft = idx * track.offsetWidth;
      }, 30);
    }
  }
  window._pastTripSyncMemoInput();
};

window._pastTripOnPhotoSwipeScroll = function(trackEl) {
  if (!trackEl) return;
  var width = trackEl.offsetWidth;
  if (!width) return;
  var newIdx = Math.round(trackEl.scrollLeft / width);
  var st = window.__pastTripRegisterState || { photos: [] };
  if (newIdx === (Number(st.photoIndex) || 0) || !(st.photos && st.photos[newIdx])) return;
  window._pastTripCommitMemoInput();
  st.photoIndex = newIdx;
  window.__pastTripRegisterState = st;
  window._pastTripSyncPhotoThumbs();
  window._pastTripSyncMemoInput();
};

window._pastTripSyncPhotoThumbs = function() {
  var st = window.__pastTripRegisterState || { photos: [] };
  var idx = Number(st.photoIndex) || 0;
  var badgeEl = document.getElementById('pastTripPhotoIndexBadge');
  var photos = st.photos || [];
  if (badgeEl) badgeEl.textContent = photos.length ? ((idx + 1) + ' / ' + photos.length) : '0 / 0';
  var nodes = document.querySelectorAll('#pastTripPhotoStage [data-past-thumb-idx]');
  nodes.forEach(function(node) {
    var nIdx = parseInt(node.getAttribute('data-past-thumb-idx'), 10);
    var on = nIdx === idx;
    node.style.border = on ? '2.5px solid #94a3b8' : '1px solid rgba(255,255,255,0.16)';
    node.style.boxShadow = on ? '0 0 10px rgba(148,163,184,0.45)' : 'none';
    node.style.transform = on ? 'scale(1.06)' : 'scale(1)';
    node.style.opacity = on ? '1' : '0.65';
    node.style.zIndex = on ? '3' : '1';
  });
};

window.focusPastTripPhoto = function(idx) {
  window._pastTripCommitMemoInput();
  var st = window.__pastTripRegisterState || { photos: [] };
  st.photoIndex = Number(idx) || 0;
  window.__pastTripRegisterState = st;
  var track = document.getElementById('pastTripPhotoSwipeTrack');
  if (track && track.offsetWidth) {
    track.scrollTo({ left: st.photoIndex * track.offsetWidth, behavior: 'smooth' });
    window._pastTripSyncPhotoThumbs();
    window._pastTripSyncMemoInput();
    triggerHaptic(8);
    return;
  }
  window._pastTripRenderPhotoStage();
};

window.shiftPastTripPhoto = function(delta) {
  var st = window.__pastTripRegisterState || { photos: [] };
  var n = (st.photos || []).length;
  if (!n) return;
  var next = (Number(st.photoIndex) || 0) + delta;
  if (next < 0) next = n - 1;
  if (next >= n) next = 0;
  window.focusPastTripPhoto(next);
};

window._pastTripThumbDragStart = function(e, idx) {
  window.__pastTripDragThumbIdx = idx;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  triggerHaptic(10);
};

window._pastTripThumbDragOver = function(e) {
  if (e.preventDefault) e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  return false;
};

window._pastTripMovePhoto = function(fromIdx, toIdx) {
  var st = window.__pastTripRegisterState || { photos: [], photoMemos: [] };
  if (fromIdx === toIdx || fromIdx == null || toIdx == null) return;
  if (!st.photos || fromIdx < 0 || toIdx < 0 || fromIdx >= st.photos.length || toIdx >= st.photos.length) return;
  window._pastTripCommitMemoInput();
  var movedPhoto = st.photos.splice(fromIdx, 1)[0];
  st.photos.splice(toIdx, 0, movedPhoto);
  st.photoMemos = Array.isArray(st.photoMemos) ? st.photoMemos : [];
  var movedMemo = st.photoMemos.splice(fromIdx, 1)[0] || '';
  st.photoMemos.splice(toIdx, 0, movedMemo);
  st.photoIndex = toIdx;
  window.__pastTripRegisterState = st;
  window._pastTripRenderPhotoStage();
  triggerHaptic(14);
};

window._pastTripThumbDrop = function(e, dropIdx) {
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();
  window._pastTripMovePhoto(window.__pastTripDragThumbIdx, dropIdx);
  window.__pastTripDragThumbIdx = null;
  return false;
};

window._pastTripThumbDragEnd = function() {
  window.__pastTripDragThumbIdx = null;
};

window._pastTripThumbTouchStart = function(e, idx) {
  window.__pastTripTouchThumbIdx = idx;
  window.__pastTripThumbLongPress = false;
  window.__pastTripTouchThumbEl = e.currentTarget;
  var touch = e.touches && e.touches[0];
  if (!touch) return;
  window.__pastTripTouchX = touch.clientX;
  window.__pastTripTouchY = touch.clientY;
  clearTimeout(window.__pastTripThumbTimer);
  window.__pastTripThumbTimer = setTimeout(function() {
    window.__pastTripThumbLongPress = true;
    triggerHaptic(25);
    if (window.__pastTripTouchThumbEl) {
      window.__pastTripTouchThumbEl.style.transform = 'scale(1.15)';
      window.__pastTripTouchThumbEl.style.borderColor = '#94a3b8';
      window.__pastTripTouchThumbEl.style.zIndex = '99';
    }
  }, 300);
};

window._pastTripThumbTouchMove = function(e) {
  var touch = e.touches && e.touches[0];
  if (!touch) return;
  var dx = Math.abs(touch.clientX - window.__pastTripTouchX);
  var dy = Math.abs(touch.clientY - window.__pastTripTouchY);
  if (!window.__pastTripThumbLongPress) {
    if (dx > 8 || dy > 8) clearTimeout(window.__pastTripThumbTimer);
    return;
  }
  if (e.cancelable) e.preventDefault();
};

window._pastTripThumbTouchEnd = function(e) {
  clearTimeout(window.__pastTripThumbTimer);
  var fromIdx = window.__pastTripTouchThumbIdx;
  var wasLong = window.__pastTripThumbLongPress;
  if (window.__pastTripTouchThumbEl) {
    window.__pastTripTouchThumbEl.style.transform = '';
    window.__pastTripTouchThumbEl.style.zIndex = '';
  }
  if (wasLong && fromIdx != null) {
    var touch = e.changedTouches && e.changedTouches[0];
    var elem = touch ? document.elementFromPoint(touch.clientX, touch.clientY) : null;
    var card = elem && elem.closest ? elem.closest('[data-past-thumb-idx]') : null;
    if (card) {
      var toIdx = parseInt(card.getAttribute('data-past-thumb-idx'), 10);
      if (fromIdx !== toIdx) {
        window._pastTripMovePhoto(fromIdx, toIdx);
        window.__pastTripTouchThumbIdx = null;
        window.__pastTripThumbLongPress = false;
        window.__pastTripTouchThumbEl = null;
        return;
      }
    }
    window._pastTripRenderPhotoStage();
  } else if (fromIdx != null) {
    window.focusPastTripPhoto(fromIdx);
  }
  window.__pastTripTouchThumbIdx = null;
  window.__pastTripThumbLongPress = false;
  window.__pastTripTouchThumbEl = null;
};

window._pastTripCommitMemoInput = function() {
  var input = document.getElementById('pastTripMemoInput');
  if (!input) return;
  var st = window.__pastTripRegisterState || {};
  var val = String(input.value || '').slice(0, 120);
  if (input.value !== val) input.value = val;
  if (st.memoMode === 'per_photo') {
    window._pastTripEnsurePhotoMemos();
    var idx = Number(st.photoIndex) || 0;
    st.photoMemos[idx] = val;
  } else {
    st.singleMemo = val;
  }
  window.__pastTripRegisterState = st;
};

window._pastTripSyncMemoInput = function() {
  var input = document.getElementById('pastTripMemoInput');
  if (!input) return;
  var st = window.__pastTripRegisterState || { memoMode: 'single' };
  if (st.memoMode === 'per_photo') {
    window._pastTripEnsurePhotoMemos();
    input.value = st.photoMemos[Number(st.photoIndex) || 0] || '';
  } else {
    input.value = st.singleMemo || '';
  }
  window.updatePastTripMemoCount();
};

window.switchPastTripMemoMode = function(mode) {
  triggerHaptic(8);
  window._pastTripCommitMemoInput();
  var st = window.__pastTripRegisterState || {};
  st.memoMode = (mode === 'per_photo') ? 'per_photo' : 'single';
  window.__pastTripRegisterState = st;
  var btnSingle = document.getElementById('pastTripMemoModeSingle');
  var btnPer = document.getElementById('pastTripMemoModePerPhoto');
  var helper = document.getElementById('pastTripMemoModeHelper');
  if (btnSingle && btnPer) {
    var isSingle = st.memoMode === 'single';
    btnSingle.style.background = isSingle ? '#38bdf8' : 'transparent';
    btnSingle.style.color = isSingle ? '#000000' : '#94a3b8';
    btnSingle.style.fontWeight = isSingle ? '900' : '700';
    btnPer.style.background = !isSingle ? '#38bdf8' : 'transparent';
    btnPer.style.color = !isSingle ? '#000000' : '#94a3b8';
    btnPer.style.fontWeight = !isSingle ? '900' : '700';
  }
  if (helper) {
    helper.textContent = st.memoMode === 'single'
      ? '대표 일지 30자 이상, 최대 120자'
      : '사진별 메모는 선택, 최대 120자';
  }
  window._pastTripSyncMemoInput();
};

window._pastTripRenderGearList = function() {
  var wrap = document.getElementById('pastTripGearList');
  var hint = document.getElementById('pastTripPresetHint');
  if (!wrap) return;
  var st = window.__pastTripRegisterState || {};
  var items = Array.isArray(st.items) ? st.items : [];
  var esc = window._pastTripEsc;
  if (!items.length) {
    wrap.innerHTML = '';
    if (hint) hint.textContent = '';
    return;
  }
  var grams = 0;
  wrap.innerHTML = items.map(function(it, i) {
    grams += Number(it.weight || 0);
    return '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:7px 10px;">' +
      '<div style="min-width:0; flex:1;">' +
        '<div style="font-size:0.78rem; font-weight:800; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(it.name) + '</div>' +
        '<div style="font-size:0.62rem; color:#64748b; margin-top:1px;">' + Number(it.weight || 0) + 'g</div>' +
      '</div>' +
      '<button type="button" onclick="window.removePastTripGearItem(' + i + ');" style="width:26px; height:26px; border-radius:6px; border:1px solid rgba(244,63,94,0.3); background:rgba(244,63,94,0.12); color:#fda4af; font-size:0.78rem; font-weight:900; cursor:pointer;">−</button>' +
    '</div>';
  }).join('');
  if (hint) hint.textContent = items.length + '개 · ' + (grams / 1000).toFixed(2) + 'kg (이 기록에만 반영)';
};

window._pastTripCollectGearPool = function() {
  var pool = [];
  var seen = {};
  var pushGear = function(g, catId) {
    if (!g || !g.name) return;
    var key = String(g.name).replace(/\s+/g, '').toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    pool.push({
      name: g.name,
      brand: g.brand || '',
      weight: Number(g.weight || g.weight_g || 0),
      categoryId: catId || g.category_id || g.categoryId || ''
    });
  };
  (window.CATEGORIES || []).forEach(function(cat) {
    if (!cat) return;
    (cat.db || []).forEach(function(g) { pushGear(g, cat.id); });
  });
  var custom = [];
  try {
    custom = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_custom_gears', [])
      : (typeof safeGetJSON === 'function' ? safeGetJSON('okbm_custom_gears', []) : []);
  } catch (e) { custom = []; }
  (Array.isArray(custom) ? custom : []).forEach(function(g) {
    pushGear(g, g && (g.category_id || g.categoryId));
  });
  return pool;
};

window._pastTripRenderGearSuggest = function(rawQ) {
  var listEl = document.getElementById('pastTripGearSuggest');
  if (!listEl) return;
  var q = String(rawQ || '').trim().toLowerCase();
  if (!q) {
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }
  var matched = window._pastTripCollectGearPool().filter(function(g) {
    var name = String(g.name || '').toLowerCase();
    var brand = String(g.brand || '').toLowerCase();
    return name.indexOf(q) !== -1 || brand.indexOf(q) !== -1;
  }).slice(0, 30);
  var esc = window._pastTripEsc;
  if (!matched.length) {
    listEl.style.display = 'block';
    listEl.innerHTML = '<div style="padding:12px; color:#64748b; font-size:0.74rem; text-align:center;">일치하는 장비가 없습니다.</div>';
    return;
  }
  listEl.style.display = 'block';
  listEl.innerHTML = matched.map(function(g, i) {
    return '<button type="button" class="js-past-add-gear" data-idx="' + i + '" style="width:100%; text-align:left; background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,0.06); padding:9px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
      '<span style="font-size:0.80rem; font-weight:800; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(g.name) + '</span>' +
      '<span style="font-size:0.68rem; color:#94a3b8; flex-shrink:0;">' + (g.weight / 1000).toFixed(2) + 'kg</span>' +
    '</button>';
  }).join('');
  listEl.querySelectorAll('.js-past-add-gear').forEach(function(btn) {
    btn.onclick = function() {
      var item = matched[Number(btn.getAttribute('data-idx'))];
      if (item) window.addPastTripGearItem(item);
    };
  });
};

window.onPastTripGearTyped = function() {
  var input = document.getElementById('pastTripGearSearchInput');
  window._pastTripRenderGearSuggest(input ? input.value : '');
};

window.addPastTripGearItem = function(gear) {
  if (!gear || !gear.name) return;
  triggerHaptic(8);
  var st = window.__pastTripRegisterState || {};
  st.items = Array.isArray(st.items) ? st.items : [];
  var exists = st.items.some(function(it) { return String(it.name) === String(gear.name); });
  if (exists) {
    if (typeof showToast === 'function') showToast('이미 담긴 장비입니다.', 'info', 1400);
    return;
  }
  st.items.push({
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name: gear.name,
    weight: Number(gear.weight || 0),
    categoryId: gear.categoryId || ''
  });
  window.__pastTripRegisterState = st;
  var input = document.getElementById('pastTripGearSearchInput');
  if (input) input.value = '';
  window._pastTripRenderGearSuggest('');
  window._pastTripRenderGearList();
};

window.removePastTripGearItem = function(idx) {
  triggerHaptic(8);
  var st = window.__pastTripRegisterState || {};
  st.items = Array.isArray(st.items) ? st.items : [];
  st.items = st.items.filter(function(_, i) { return i !== idx; });
  window.__pastTripRegisterState = st;
  window._pastTripRenderGearList();
};

window._pastTripRenderPresetChips = function() {
  window._pastTripRenderGearList();
};

window.togglePastTripPresetSheet = function() {
  triggerHaptic(8);
  var sheet = document.getElementById('pastTripPresetSheet');
  if (!sheet) return;
  var opening = sheet.style.display === 'none' || !sheet.style.display;
  if (!opening) {
    sheet.style.display = 'none';
    return;
  }
  var presets = window._pastTripReadPresets();
  var esc = window._pastTripEsc;
  if (!presets.length) {
    sheet.innerHTML = '<div style="padding:14px; color:#64748b; font-size:0.74rem; text-align:center;">저장된 장비세트가 없습니다.</div>';
  } else {
    sheet.innerHTML = presets.map(function(p) {
      if (!p || !p.id) return '';
      var flat = window._pastTripFlattenPresetItems(p);
      return '<button type="button" class="js-past-add-preset" data-preset-id="' + esc(String(p.id)) + '" style="width:100%; text-align:left; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:9px 12px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
        '<span style="min-width:0;">' +
          '<span style="display:block; font-size:0.80rem; font-weight:800; color:#e2e8f0;">' + esc(p.name || '세트') + '</span>' +
          '<span style="display:block; font-size:0.62rem; color:#64748b; margin-top:2px;">' + flat.items.length + '개 · ' + (flat.totalGrams / 1000).toFixed(2) + 'kg</span>' +
        '</span>' +
        '<span style="font-size:0.70rem; color:#cbd5e1; font-weight:800; flex-shrink:0;">추가</span>' +
      '</button>';
    }).join('');
    sheet.querySelectorAll('.js-past-add-preset').forEach(function(btn) {
      btn.onclick = function() { window.selectPastTripPreset(btn.getAttribute('data-preset-id') || ''); };
    });
  }
  sheet.style.display = 'flex';
};

window.selectPastTripPreset = function(presetId) {
  triggerHaptic(8);
  var st = window.__pastTripRegisterState || {};
  st.items = Array.isArray(st.items) ? st.items : [];
  var presets = window._pastTripReadPresets();
  var target = presets.find(function(p) { return String(p.id) === String(presetId); });
  var flat = window._pastTripFlattenPresetItems(target);
  var added = 0;
  flat.items.forEach(function(it) {
    if (!it || !it.name) return;
    if (st.items.some(function(ex) { return String(ex.name) === String(it.name); })) return;
    st.items.push(it);
    added++;
  });
  st.presetId = String(presetId || '');
  window.__pastTripRegisterState = st;
  var sheet = document.getElementById('pastTripPresetSheet');
  if (sheet) sheet.style.display = 'none';
  window._pastTripRenderGearList();
  if (typeof showToast === 'function') {
    showToast(added ? (added + '개 장비를 담았습니다.') : '이미 담긴 세트입니다.', added ? 'success' : 'info', 1600);
  }
};

window.removePastTripPhoto = function(idx) {
  triggerHaptic(8);
  window._pastTripCommitMemoInput();
  var st = window.__pastTripRegisterState || { photos: [], photoMemos: [] };
  st.photos = (st.photos || []).filter(function(_, i) { return i !== idx; });
  st.photoMemos = (st.photoMemos || []).filter(function(_, i) { return i !== idx; });
  if (st.photoIndex >= st.photos.length) st.photoIndex = Math.max(0, st.photos.length - 1);
  window.__pastTripRegisterState = st;
  window._pastTripRenderPhotoStage();
};

window.handlePastTripPhotoUpload = async function(event) {
  var inputEl = event && event.target;
  var files = inputEl && inputEl.files;
  if (!files || !files.length) return;
  var st = window.__pastTripRegisterState || { photos: [], photoMemos: [] };
  var photos = st.photos || [];
  var maxSlots = 10 - photos.length;
  if (maxSlots <= 0) {
    if (typeof showToast === 'function') showToast('사진은 최대 10장까지 등록 가능합니다.', 'warn');
    inputEl.value = '';
    return;
  }
  var filesToProcess = Array.from(files).slice(0, maxSlots);
  var rejectedCount = 0;
  filesToProcess = filesToProcess.filter(function(file) {
    if (typeof window.okbmIsSupportedPhotoFile === 'function' && !window.okbmIsSupportedPhotoFile(file)) {
      rejectedCount++;
      return false;
    }
    return true;
  });
  if (rejectedCount && typeof showToast === 'function') {
    showToast('지원하는 파일형식이 아닙니다.', 'warn', 2200);
  }
  if (!filesToProcess.length) {
    inputEl.value = '';
    return;
  }
  var statusEl = document.getElementById('pastTripPhotoStatus');
  var submitBtn = document.getElementById('pastTripSubmitBtn');
  if (typeof showToast === 'function') showToast('사진추가중', 'info', 1800);
  if (statusEl) statusEl.textContent = '사진추가중';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.55'; }
  triggerHaptic(10);

  function withPastPhotoTimeout(promise, ms) {
    return new Promise(function(resolve) {
      var settled = false;
      var timer = setTimeout(function() {
        if (settled) return;
        settled = true;
        resolve('');
      }, ms);
      Promise.resolve(promise).then(function(url) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(url && String(url).indexOf('https://') === 0 ? url : '');
      }).catch(function() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve('');
      });
    });
  }

  function uploadPastPhotoFile(file) {
    if (typeof window.processSinglePhotoSmart === 'function' && typeof window.uploadCompressedPhotoToR2 === 'function') {
      return window.processSinglePhotoSmart(file, { maxDim: 1200, quality: 0.82 }).then(function(blob) {
        if (!blob) return '';
        return window.uploadCompressedPhotoToR2(blob, 'past');
      });
    }
    return new Promise(function(resolve) {
      var blobUrl = '';
      try { blobUrl = URL.createObjectURL(file); } catch (e) { resolve(''); return; }
      var img = new Image();
      img.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          var maxLen = Math.max(img.width, img.height);
          var scale = maxLen > 1200 ? (1200 / maxLen) : 1;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(function(blob) {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            if (!blob || typeof window.uploadSinglePhotoSmart !== 'function') { resolve(''); return; }
            var reader = new FileReader();
            reader.onload = function() {
              Promise.resolve(window.uploadSinglePhotoSmart(String(reader.result || ''), 'past_' + Date.now() + '.jpg')).then(function(url) {
                resolve(url || '');
              }).catch(function() { resolve(''); });
            };
            reader.onerror = function() { resolve(''); };
            reader.readAsDataURL(blob);
          }, 'image/jpeg', 0.82);
        } catch (err) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          resolve('');
        }
      };
      img.onerror = function() {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        resolve('');
      };
      img.src = blobUrl;
    });
  }

  var results = new Array(filesToProcess.length);
  var cursor = 0;
  var doneCount = 0;
  var concurrency = Math.min(3, filesToProcess.length);

  function runPastPhotoSlot() {
    if (cursor >= filesToProcess.length) return Promise.resolve();
    var index = cursor++;
    if (statusEl) statusEl.textContent = '사진 ' + (doneCount + 1) + '/' + filesToProcess.length + ' 업로드 중...';
    return withPastPhotoTimeout(uploadPastPhotoFile(filesToProcess[index]), 12000).then(function(url) {
      results[index] = url || '';
      doneCount++;
      if (statusEl) statusEl.textContent = '사진 ' + doneCount + '/' + filesToProcess.length + ' 처리됨';
      return runPastPhotoSlot();
    });
  }

  var workers = [];
  for (var w = 0; w < concurrency; w++) workers.push(runPastPhotoSlot());
  try {
    await Promise.all(workers);
  } catch (poolErr) {
    console.warn('[romantic-sync.js:handlePastTripPhotoUpload]', poolErr);
  }

  st.photoMemos = st.photoMemos || [];
  for (var r = 0; r < results.length; r++) {
    if (!results[r]) continue;
    photos.push(results[r]);
    st.photoMemos.push('');
  }
  st.photos = photos;
  st.photoIndex = Math.max(0, photos.length - 1);
  window.__pastTripRegisterState = st;
  inputEl.value = '';
  if (statusEl) statusEl.textContent = photos.length ? (photos.length + '장 준비됨') : '';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  window._pastTripRenderPhotoStage();
};

window._pastTripHideSpotSuggest = function() {
  var listEl = document.getElementById('pastTripSpotSuggest');
  if (listEl) {
    listEl.style.display = 'none';
    listEl.innerHTML = '';
  }
};

window._pastTripShowSpotChoice = function(show) {
  var existing = document.getElementById('pastTripSpotChoiceOverlay');
  if (!show) {
    if (existing) existing.remove();
    return;
  }
  if (existing) existing.remove();
  var st = window.__pastTripRegisterState || {};
  var name = String(st.spotName || '').trim();
  var input = document.getElementById('pastTripSpotInput');
  if (input && input.value) name = String(input.value || '').trim();
  var esc = window._pastTripEsc || function(s) { return String(s || ''); };
  var ov = document.createElement('div');
  ov.id = 'pastTripSpotChoiceOverlay';
  ov.style.cssText = 'position:fixed; inset:0; z-index:2147483647; background:rgba(0,0,0,0.72); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
  ov.onclick = function(e) { if (e.target === ov) window._pastTripShowSpotChoice(false); };
  ov.innerHTML =
    '<div style="width:100%; max-width:320px; background:#0c1017; border-radius:14px; border:1px solid rgba(255,255,255,0.12); padding:16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 16px 40px rgba(0,0,0,0.55);" onclick="event.stopPropagation();">' +
      '<div style="font-size:0.92rem; font-weight:900; color:#fff; text-align:center;">장소를 등록하시겠습니까?</div>' +
      (name ? ('<div style="font-size:0.78rem; font-weight:800; color:#e2e8f0; text-align:center; word-break:break-all;">' + esc(name) + '</div>') : '') +
      '<div style="font-size:0.68rem; color:#94a3b8; line-height:1.5; text-align:center;">등록하기를 선택하시면 제보창으로 연결됩니다.<br>등록하지 않기를 선택하시면 나만보기와 이 기록에 저장됩니다.</div>' +
      '<div style="display:flex; gap:8px;">' +
        '<button type="button" onclick="window.choosePastTripSpotRegister();" style="flex:1; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:#e2e8f0; color:#000; font-size:0.78rem; font-weight:900; cursor:pointer;">등록하기</button>' +
        '<button type="button" onclick="window.choosePastTripSpotSkip();" style="flex:1; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#cbd5e1; font-size:0.78rem; font-weight:800; cursor:pointer;">등록하지 않기</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
};

window._pastTripShowSpotDetail = function(show) {
  var el = document.getElementById('pastTripSpotDetailPanel');
  if (el) el.style.display = show ? 'flex' : 'none';
};

window._pastTripSetSpotBadge = function(kind) {
  var badge = document.getElementById('pastTripSpotStatusBadge');
  if (!badge) return;
  if (kind === 'registered') {
    badge.textContent = '등록 장소 · 마이데이터 합산 가능';
    badge.style.color = '#34d399';
    badge.style.fontSize = '0.62rem';
    badge.style.lineHeight = '1.35';
  } else if (kind === 'unregistered') {
    badge.textContent = '비등록 장소는 나만보기에 저장됩니다. 추후 등록될경우 노출됩니다.';
    badge.style.color = '#34d399';
    badge.style.fontSize = 'calc(0.62rem + 3pt)';
    badge.style.lineHeight = '1.35';
  } else {
    badge.textContent = '등록 장소를 선택하면 마이데이터에 합산됩니다.';
    badge.style.color = '#64748b';
    badge.style.fontSize = '0.62rem';
    badge.style.lineHeight = '1.35';
  }
};

window._pastTripScoreSpotMatches = function(q) {
  var spotsSource = window._pastTripBuildSpotSearchPool();
  var tokens = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  var lastToken = tokens[tokens.length - 1];
  var whole = String(q || '').replace(/\s+/g, '').toLowerCase();
  var scored = [];
  spotsSource.forEach(function(s) {
    var sName = String(s.searchName || s.name || '').toLowerCase();
    var rawName = String(s.rawName || s.name || '').toLowerCase();
    var sAddr = String(s.address || '').toLowerCase();
    var sCity = String(s.cityName || s.region || '').toLowerCase();
    var score = 0;
    var matched = 0;
    var clean = sName.replace(/\s+/g, '');
    if (clean === whole) score += 2000;
    else if (clean.indexOf(whole) !== -1) score += 1000;
    if (lastToken) {
      if (rawName === lastToken || rawName.indexOf(lastToken) !== -1) score += 600;
      else if (sName.indexOf(lastToken) !== -1) score += 400;
      else if (sAddr.indexOf(lastToken) !== -1) score += 100;
    }
    tokens.forEach(function(t) {
      var hit = false;
      if (rawName.indexOf(t) !== -1) { score += 250; hit = true; }
      else if (sName.indexOf(t) !== -1) { score += 180; hit = true; }
      else if (sCity.indexOf(t) !== -1 || sAddr.indexOf(t) !== -1) { score += 80; hit = true; }
      if (hit) matched++;
    });
    if (matched > 1) score += matched * 150;
    if (score > 0) scored.push({ item: s, score: score });
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.map(function(w) { return w.item; }).slice(0, 20);
};

window._pastTripRenderSpotSuggest = function(rawQ) {
  var listEl = document.getElementById('pastTripSpotSuggest');
  var confirmBtn = document.getElementById('pastTripSpotConfirmBtn');
  if (!listEl) return;
  var q = String(rawQ || '').trim();
  if (!q) {
    listEl.style.display = 'none';
    listEl.innerHTML = '';
    if (confirmBtn) confirmBtn.style.display = 'none';
    return;
  }
  var matchedList = window._pastTripScoreSpotMatches(q);
  var esc = window._pastTripEsc;
  if (confirmBtn) confirmBtn.style.display = matchedList.length ? 'none' : 'inline-flex';
  if (!matchedList.length) {
    listEl.style.display = 'block';
    listEl.innerHTML = '<div style="padding:12px; color:#64748b; font-size:0.74rem; text-align:center; line-height:1.5;">일치하는 등록 장소가 없습니다.<br>확인을 누르면 이 이름으로 진행합니다.</div>';
    return;
  }
  listEl.style.display = 'block';
  listEl.innerHTML = matchedList.map(function(s, i) {
    var elev = String(s.elevation || '').replace(/[^\d.]/g, '');
    elev = elev ? (elev + 'm') : '';
    var title = s.name || s.rawName || '';
    var sub = s.cityName || s.region || '';
    if (sub && title.indexOf(sub) !== -1) sub = '';
    if (!sub && s.address) sub = s.address;
    return '<button type="button" class="js-past-select-spot" data-idx="' + i + '" style="width:100%; text-align:left; background:transparent; border:none; border-bottom:1px solid rgba(255,255,255,0.06); padding:9px 12px; cursor:pointer;">' +
      '<div style="font-size:0.82rem; font-weight:800; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(title) + (elev ? (' <span style="color:#cbd5e1; font-size:0.68rem;">(' + esc(elev) + ')</span>') : '') + '</div>' +
      (sub ? ('<div style="font-size:0.64rem; color:#94a3b8; margin-top:2px;">' + esc(sub) + '</div>') : '') +
    '</button>';
  }).join('');
  listEl.querySelectorAll('.js-past-select-spot').forEach(function(row) {
    row.addEventListener('click', function() {
      var item = matchedList[Number(row.getAttribute('data-idx'))];
      if (item) window.selectPastTripSpot(item, !item.id);
    });
  });
};

window.openSpotSearchModalForPastTrip = function() {
  var input = document.getElementById('pastTripSpotInput');
  if (input) {
    input.focus();
    window._pastTripRenderSpotSuggest(input.value);
  }
};

window.confirmPastTripCustomSpot = function() {
  var input = document.getElementById('pastTripSpotInput');
  var name = input ? String(input.value || '').trim() : '';
  if (!name) {
    if (typeof showToast === 'function') showToast('장소 이름을 입력해주세요.', 'warn');
    return;
  }
  triggerHaptic(10);
  var st = window.__pastTripRegisterState || {};
  st.spotName = name;
  st.spotId = '';
  st.spotPath = 'choice';
  st.elev = '';
  st.region = '';
  window.__pastTripRegisterState = st;
  window._pastTripHideSpotSuggest();
  var confirmBtn = document.getElementById('pastTripSpotConfirmBtn');
  if (confirmBtn) confirmBtn.style.display = 'none';
  var elevInput = document.getElementById('pastTripElevInput');
  var regionInput = document.getElementById('pastTripRegionInput');
  if (elevInput) elevInput.value = '';
  if (regionInput) regionInput.value = '';
  window._pastTripSetSpotBadge('unregistered');
  window._pastTripShowSpotDetail(false);
  if (typeof showToast === 'function') {
    showToast('등록된 장소가 아닌 경우 나만보기로 이동됩니다.', 'info', 2600);
  }
  window._pastTripShowSpotChoice(true);
};

window._pastTripParkForProposal = function() {
  var past = document.getElementById('pastTripRegisterModal');
  if (past) past.style.display = 'none';
  if (window.__pastTripProposalObserver) {
    try { window.__pastTripProposalObserver.disconnect(); } catch (e) {}
    window.__pastTripProposalObserver = null;
  }
  var check = function() {
    var live = document.getElementById('pastTripRegisterModal');
    if (!live) {
      if (window.__pastTripProposalObserver) {
        try { window.__pastTripProposalObserver.disconnect(); } catch (e2) {}
        window.__pastTripProposalObserver = null;
      }
      return;
    }
    var ov = document.getElementById('customModalOverlay');
    var banner = document.getElementById('pinPickerBanner');
    var overlayOn = !!(ov && window.getComputedStyle(ov).display !== 'none');
    var bannerOn = !!(banner && window.getComputedStyle(banner).display !== 'none');
    if (overlayOn || bannerOn) return;
    live.style.display = 'flex';
    if (window.__pastTripProposalObserver) {
      try { window.__pastTripProposalObserver.disconnect(); } catch (e3) {}
      window.__pastTripProposalObserver = null;
    }
  };
  var observer = new MutationObserver(check);
  window.__pastTripProposalObserver = observer;
  var overlay = document.getElementById('customModalOverlay');
  var banner = document.getElementById('pinPickerBanner');
  if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
  if (banner) observer.observe(banner, { attributes: true, attributeFilter: ['style', 'class'] });
};

window.choosePastTripSpotRegister = function() {
  triggerHaptic(10);
  window._pastTripShowSpotChoice(false);
  var st = window.__pastTripRegisterState || {};
  var name = st.spotName || '';
  var input = document.getElementById('pastTripSpotInput');
  if (input && input.value) name = String(input.value || '').trim();
  st.spotName = name;
  st.spotId = '';
  st.spotPath = 'proposal';
  window.__pastTripRegisterState = st;
  window._pastTripShowSpotDetail(true);
  window._pastTripSetSpotBadge('unregistered');

  if (typeof window.openUserProposalModal === 'function') {
    window.openUserProposalModal(name, 0, 0, '');
    var overlay = document.getElementById('customModalOverlay');
    if (overlay) overlay.style.setProperty('z-index', '2147483646', 'important');
    window._pastTripParkForProposal();
    return;
  }

  // index 등 map 제보 모달이 없는 페이지 → 지도로 이동 후 제보 창 오픈
  try {
    sessionStorage.setItem('okbm_pending_past_trip_register', JSON.stringify(window._pastTripBuildDraft()));
  } catch (e) {}
  var url = 'map.html?propose_spot=' + encodeURIComponent(name || '') + '&from_past_trip=1';
  window.location.assign(url);
};

window.choosePastTripSpotSkip = function() {
  triggerHaptic(8);
  window._pastTripShowSpotChoice(false);
  var st = window.__pastTripRegisterState || {};
  st.spotPath = 'skip';
  st.spotId = '';
  window.__pastTripRegisterState = st;
  window._pastTripShowSpotDetail(true);
  window._pastTripSetSpotBadge('unregistered');
  var regionInput = document.getElementById('pastTripRegionInput');
  if (regionInput) regionInput.focus();
};

window._pastTripBuildDraft = function() {
  var st = window.__pastTripRegisterState || {};
  var dateInput = document.getElementById('pastTripDateInput');
  var spotInput = document.getElementById('pastTripSpotInput');
  var elevInput = document.getElementById('pastTripElevInput');
  var regionInput = document.getElementById('pastTripRegionInput');
  var ytInput = document.getElementById('pastTripYoutubeInput');
  var naverInput = document.getElementById('pastTripNaverInput');
  return {
    date: dateInput ? String(dateInput.value || '').trim() : '',
    spotName: spotInput ? String(spotInput.value || '').trim() : String(st.spotName || ''),
    spotId: String(st.spotId || ''),
    spotPath: String(st.spotPath || 'proposal'),
    elev: elevInput ? String(elevInput.value || '').trim() : String(st.elev || ''),
    region: regionInput ? String(regionInput.value || '').trim() : String(st.region || ''),
    items: Array.isArray(st.items) ? st.items : [],
    photos: Array.isArray(st.photos) ? st.photos.filter(function(u) {
      return typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://'));
    }) : [],
    photoMemos: Array.isArray(st.photoMemos) ? st.photoMemos : [],
    memoMode: st.memoMode || 'single',
    singleMemo: String(st.singleMemo || ''),
    photoIndex: Number(st.photoIndex) || 0,
    youtube: ytInput ? String(ytInput.value || '').trim() : '',
    blog: naverInput ? String(naverInput.value || '').trim() : ''
  };
};

window._pastTripApplyDraft = function(draft) {
  if (!draft || typeof draft !== 'object') return;
  var st = window.__pastTripRegisterState || {};
  st.spotId = String(draft.spotId || '');
  st.spotName = String(draft.spotName || '');
  st.spotPath = String(draft.spotPath || '');
  st.elev = String(draft.elev || '');
  st.region = String(draft.region || '');
  st.items = Array.isArray(draft.items) ? draft.items : [];
  st.photos = Array.isArray(draft.photos) ? draft.photos : [];
  st.photoMemos = Array.isArray(draft.photoMemos) ? draft.photoMemos : [];
  st.memoMode = draft.memoMode || 'single';
  st.singleMemo = String(draft.singleMemo || '');
  st.photoIndex = Number(draft.photoIndex) || 0;
  window.__pastTripRegisterState = st;

  var dateInput = document.getElementById('pastTripDateInput');
  if (dateInput && draft.date) dateInput.value = draft.date;
  if (typeof window._pastTripSyncDateDisplay === 'function') window._pastTripSyncDateDisplay();

  var spotInput = document.getElementById('pastTripSpotInput');
  if (spotInput) spotInput.value = st.spotName;

  var elevInput = document.getElementById('pastTripElevInput');
  if (elevInput) elevInput.value = st.elev;

  var regionInput = document.getElementById('pastTripRegionInput');
  if (regionInput) regionInput.value = st.region;

  var ytInput = document.getElementById('pastTripYoutubeInput');
  if (ytInput && draft.youtube) ytInput.value = draft.youtube;
  var naverInput = document.getElementById('pastTripNaverInput');
  if (naverInput && draft.blog) naverInput.value = draft.blog;

  if (st.spotPath === 'proposal' || st.spotPath === 'skip' || !st.spotId) {
    window._pastTripShowSpotDetail(true);
    window._pastTripSetSpotBadge(st.spotId ? 'registered' : 'unregistered');
  } else {
    window._pastTripSetSpotBadge('registered');
  }

  if (typeof window._pastTripRenderGearList === 'function') window._pastTripRenderGearList();
  if (typeof window._pastTripRenderPhotoStage === 'function') window._pastTripRenderPhotoStage();
  if (typeof window.updatePastTripMemoCount === 'function') window.updatePastTripMemoCount();
};

window.okbmMaybeReopenPastTripRegister = function() {
  try {
    var params = new URLSearchParams(location.search || '');
    if (params.get('reopen_past_trip') !== '1') return;
    var draft = null;
    try { draft = JSON.parse(sessionStorage.getItem('okbm_pending_past_trip_register') || 'null'); } catch (e) { draft = null; }
    params.delete('reopen_past_trip');
    var q = params.toString();
    if (typeof history !== 'undefined' && history.replaceState) {
      history.replaceState({}, '', location.pathname + (q ? ('?' + q) : '') + (location.hash || ''));
    }
    setTimeout(function() {
      if (typeof window.openUserProfileModal === 'function') {
        try { window.openUserProfileModal(); } catch (e2) {}
      }
      if (typeof window.openPastTripRegisterModal === 'function') {
        window.openPastTripRegisterModal();
        if (draft) window._pastTripApplyDraft(draft);
      }
      try { sessionStorage.removeItem('okbm_pending_past_trip_register'); } catch (e3) {}
    }, 500);
  } catch (e) {
    console.warn('[romantic-sync.js:okbmMaybeReopenPastTripRegister]', e);
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof window.okbmMaybeReopenPastTripRegister === 'function') window.okbmMaybeReopenPastTripRegister();
    });
  } else {
    setTimeout(function() {
      if (typeof window.okbmMaybeReopenPastTripRegister === 'function') window.okbmMaybeReopenPastTripRegister();
    }, 0);
  }
}

window.selectPastTripSpot = function(spot, isUnregistered) {
  triggerHaptic(10);
  var st = window.__pastTripRegisterState || {};
  var region = String((spot && (spot.cityName || spot.region)) || '').trim();
  var name = window._pastTripComposeSpotLabel(
    (spot && (spot.name || spot.rawName)) || '',
    region
  );
  var elev = String((spot && spot.elevation) || '').trim().replace(/[^\d.]/g, '');
  if (elev && !/m$/i.test(elev)) elev = elev + 'm';
  st.spotName = name;
  st.elev = elev;
  st.region = region;
  st.spotId = (!isUnregistered && spot && spot.id) ? String(spot.id).trim() : '';
  st.spotPath = st.spotId ? 'registered' : 'choice';
  window.__pastTripRegisterState = st;

  var spotInput = document.getElementById('pastTripSpotInput');
  var elevInput = document.getElementById('pastTripElevInput');
  var regionInput = document.getElementById('pastTripRegionInput');
  if (spotInput) spotInput.value = name;
  if (elevInput) elevInput.value = elev.replace(/m$/i, '');
  if (regionInput) regionInput.value = region;
  window._pastTripHideSpotSuggest();
  var confirmBtn = document.getElementById('pastTripSpotConfirmBtn');
  if (confirmBtn) confirmBtn.style.display = 'none';

  if (st.spotId) {
    window._pastTripShowSpotChoice(false);
    window._pastTripShowSpotDetail(true);
    window._pastTripSetSpotBadge('registered');
  } else {
    window._pastTripShowSpotDetail(false);
    window._pastTripSetSpotBadge('unregistered');
    if (typeof showToast === 'function') {
      showToast('등록된 장소가 아닌 경우 나만보기로 이동됩니다.', 'info', 2600);
    }
    window._pastTripShowSpotChoice(true);
  }
};

window.openPastTripRegisterModal = function(ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
  }
  triggerHaptic(10);
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('로그인 후 과거 일정을 등록할 수 있습니다.', 'info', 2200);
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return;
  }
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  var old = document.getElementById('pastTripRegisterModal');
  if (old) old.remove();
  window.__pastTripSpotsSearchCache = null;

  window.__pastTripRegisterState = {
    photos: [], photoMemos: [], presetId: '', items: [], elev: '', region: '',
    spotId: '', spotName: '', spotPath: '', memoMode: 'single', singleMemo: '', photoIndex: 0
  };
  var maxDate = window._pastTripYesterdayIso();
  var modal = document.createElement('div');
  modal.id = 'pastTripRegisterModal';
  modal.className = 'custom-modal-overlay';
  modal.style.cssText = 'display:flex; position:fixed; inset:0; background:#000000; z-index:2147483642; justify-content:center; align-items:stretch; padding:0;';
  modal.onclick = function(e) { if (e.target === modal) window.closePastTripRegisterModal(); };

  var fieldCss = 'height:42px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.84rem; font-weight:700; outline:none; box-sizing:border-box; width:100%;';
  modal.innerHTML =
    '<style>#pastTripPhotoSwipeTrack::-webkit-scrollbar{display:none}#pastTripSpotSuggest::-webkit-scrollbar,#pastTripGearSuggest::-webkit-scrollbar{display:none}</style>' +
    '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; background:#07090e; box-sizing:border-box;">' +
      '<div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box;">' +
        '<button type="button" onclick="window.closePastTripRegisterModal();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer;">◀</button>' +
        '<span style="font-size:0.95rem; font-weight:900; color:#ffffff;">과거 추억 등록</span>' +
        '<div style="width:30px;"></div>' +
      '</div>' +
      '<div style="flex:1 1 0%; min-height:0; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:14px; box-sizing:border-box;">' +
        '<div style="display:flex; flex-direction:column; gap:10px;">' +
          '<div style="display:flex; flex-direction:column; gap:6px;">' +
            '<label style="font-size:0.82rem; color:#ffffff; font-weight:900;">날짜</label>' +
            '<input type="hidden" id="pastTripDateInput" value="' + maxDate + '" />' +
            '<button type="button" id="pastTripDateDisplay" onclick="window.openPastTripDatePicker();" style="height:44px; width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.92rem; font-weight:800; outline:none; box-sizing:border-box; text-align:left; cursor:pointer;">' + window._pastTripIsoToDisplay(maxDate) + '</button>' +
          '</div>' +
          '<div style="display:flex; flex-direction:column; gap:6px; position:relative;">' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">' +
              '<label style="font-size:0.82rem; color:#ffffff; font-weight:900; flex-shrink:0;">장소</label>' +
              '<span id="pastTripSpotStatusBadge" style="font-size:0.62rem; color:#64748b; font-weight:700; text-align:right; line-height:1.35; min-width:0;">등록 장소를 선택하면 마이데이터에 합산됩니다.</span>' +
            '</div>' +
            '<div style="display:flex; gap:6px;">' +
              '<input type="text" id="pastTripSpotInput" maxlength="60" placeholder="장소명 검색" autocomplete="off" onfocus="window.onPastTripSpotTyped();" oninput="window.onPastTripSpotTyped();" style="' + fieldCss + '" />' +
              '<button type="button" id="pastTripSpotConfirmBtn" onclick="window.confirmPastTripCustomSpot();" style="display:none; flex-shrink:0; height:42px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.08); color:#e2e8f0; font-size:0.74rem; font-weight:800; cursor:pointer; white-space:nowrap; align-items:center; justify-content:center; line-height:1; box-sizing:border-box;">확인</button>' +
            '</div>' +
            '<div id="pastTripSpotSuggest" style="display:none; position:absolute; top:100%; left:0; right:0; z-index:20; margin-top:4px; max-height:220px; overflow-y:auto; background:#0c1017; border:1px solid rgba(255,255,255,0.12); border-radius:10px; box-shadow:0 12px 28px rgba(0,0,0,0.55);"></div>' +
          '</div>' +
        '</div>' +
        '<div id="pastTripSpotDetailPanel" style="display:none; flex-direction:column; gap:8px;">' +
          '<input type="text" id="pastTripRegionInput" maxlength="30" placeholder="지역 (시군구, 예: 평창)" style="height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#cbd5e1; padding:0 12px; font-size:0.80rem; font-weight:700; outline:none; box-sizing:border-box;" />' +
          '<input type="text" id="pastTripElevInput" maxlength="12" placeholder="고도 (있으면 숫자, 예: 580)" style="height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#cbd5e1; padding:0 12px; font-size:0.80rem; font-weight:700; outline:none; box-sizing:border-box;" />' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">' +
            '<label style="font-size:0.82rem; color:#ffffff; font-weight:900;">장비</label>' +
            '<span style="font-size:0.62rem; color:#64748b; font-weight:700;">선택 시 마이데이터에 합산됩니다</span>' +
          '</div>' +
          '<div style="display:flex; flex-direction:column; gap:6px;">' +
            '<input type="text" id="pastTripGearSearchInput" maxlength="40" placeholder="장비 검색" autocomplete="off" onfocus="window.onPastTripGearTyped();" oninput="window.onPastTripGearTyped();" style="width:100%; height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.82rem; outline:none; box-sizing:border-box;" />' +
            '<div id="pastTripGearSuggest" style="display:none; max-height:220px; overflow-y:auto; background:#0c1017; border:1px solid rgba(255,255,255,0.12); border-radius:10px;"></div>' +
            '<button type="button" onclick="window.togglePastTripPresetSheet();" style="width:100%; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.16); background:rgba(255,255,255,0.06); color:#e2e8f0; font-size:0.76rem; font-weight:800; cursor:pointer;">장비세트로 추가하기</button>' +
          '</div>' +
          '<div id="pastTripPresetSheet" style="display:none; flex-direction:column; gap:6px;"></div>' +
          '<div id="pastTripGearList" style="display:flex; flex-direction:column; gap:6px;"></div>' +
          '<div id="pastTripPresetHint" style="font-size:0.68rem; color:#64748b;">장비 없이 일정·사진·일지만 등록합니다.</div>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<span id="pastTripPhotoCountLabel" style="font-size:0.82rem; color:#ffffff; font-weight:900;">등록된 사진 (0장 / 최대 10장)</span>' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span id="pastTripPhotoIndexBadge" style="font-size:0.62rem; color:#cbd5e1; background:rgba(255,255,255,0.08); padding:1px 6px; border-radius:10px; font-weight:900;">0 / 0</span>' +
              '<button type="button" onclick="document.getElementById(\'pastTripPhotoInput\').click();" style="height:30px; padding:0 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.16); background:rgba(255,255,255,0.06); color:#e2e8f0; font-size:0.72rem; font-weight:800; cursor:pointer;">사진 추가</button>' +
            '</div>' +
          '</div>' +
          '<input type="file" id="pastTripPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.handlePastTripPhotoUpload(event);" />' +
          '<div id="pastTripPhotoStage"></div>' +
          '<div id="pastTripPhotoStatus" style="font-size:0.68rem; color:#64748b;"></div>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<label style="font-size:0.74rem; font-weight:800; color:#94a3b8;">일지</label>' +
            '<span id="pastTripMemoCount" style="font-size:0.68rem; color:#64748b;">0/120</span>' +
          '</div>' +
          '<div style="display:inline-flex; gap:4px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:3px; align-self:flex-start;">' +
            '<button type="button" id="pastTripMemoModeSingle" onclick="window.switchPastTripMemoMode(\'single\');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:#38bdf8; color:#000; font-weight:900;">한 번에 쓰기</button>' +
            '<button type="button" id="pastTripMemoModePerPhoto" onclick="window.switchPastTripMemoMode(\'per_photo\');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:transparent; color:#94a3b8; font-weight:700;">사진별 쓰기</button>' +
          '</div>' +
          '<div id="pastTripMemoModeHelper" style="font-size:0.68rem; color:#64748b;">대표 일지 30자 이상, 최대 120자</div>' +
          '<textarea id="pastTripMemoInput" maxlength="120" placeholder="그날의 추억을 적어주세요." oninput="window.updatePastTripMemoCount();" style="min-height:110px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:10px; color:#ffffff; padding:10px 12px; font-size:0.88rem; line-height:1.45; outline:none; resize:vertical; font-family:inherit; box-sizing:border-box;"></textarea>' +
        '</div>' +
        '<div style="display:flex; flex-direction:column; gap:8px;">' +
          '<label style="font-size:0.74rem; font-weight:800; color:#94a3b8;">유튜브 / 네이버 블로그 링크 (선택)</label>' +
          '<input type="text" id="pastTripYoutubeInput" inputmode="url" placeholder="YouTube 링크" onblur="window.onPastTripLinkBlur(\'yt\');" style="height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(244,63,94,0.28); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />' +
          '<input type="text" id="pastTripNaverInput" inputmode="url" placeholder="네이버 블로그 링크" onblur="window.onPastTripLinkBlur(\'blog\');" style="height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(3,199,90,0.28); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />' +
          '<div style="font-size:calc(0.66rem + 1pt); color:#64748b; line-height:1.45;">다른 낭만 루터분들에게 도움이 됩니다</div>' +
        '</div>' +
      '</div>' +
      '<div style="flex-shrink:0; padding:12px 16px calc(12px + env(safe-area-inset-bottom, 0px)) 16px; border-top:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">' +
        '<button type="button" id="pastTripSubmitBtn" onclick="window.submitPastTripRegister();" style="width:100%; height:46px; border-radius:12px; border:1px solid rgba(56,189,248,0.45); background:#38bdf8; color:#000000; font-size:0.90rem; font-weight:900; cursor:pointer;">등록하기</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
  if (typeof window.okbmLiftReportChildModal === 'function') window.okbmLiftReportChildModal(modal);
  window._pastTripRenderGearList();
  window._pastTripRenderPhotoStage();
  window._pastTripSyncDateDisplay();
  window.updatePastTripMemoCount();
  modal.addEventListener('click', function(e) {
    var t = e.target;
    if (!t) return;
    if (!t.closest('#pastTripSpotInput') && !t.closest('#pastTripSpotSuggest') && !t.closest('#pastTripSpotConfirmBtn')) {
      window._pastTripHideSpotSuggest();
    }
    if (!t.closest('#pastTripGearSearchInput') && !t.closest('#pastTripGearSuggest')) {
      var gearSuggest = document.getElementById('pastTripGearSuggest');
      if (gearSuggest) { gearSuggest.style.display = 'none'; }
    }
  });
};

window.onPastTripSpotTyped = function() {
  var st = window.__pastTripRegisterState || {};
  var input = document.getElementById('pastTripSpotInput');
  var name = input ? String(input.value || '').trim() : '';
  if ((st.spotId || st.spotPath) && st.spotName && name !== st.spotName) {
    st.spotId = '';
    st.spotPath = '';
    window._pastTripSetSpotBadge('');
    window._pastTripShowSpotChoice(false);
    window._pastTripShowSpotDetail(false);
  }
  st.spotName = name;
  window.__pastTripRegisterState = st;
  window._pastTripRenderSpotSuggest(name);
};

window.updatePastTripMemoCount = function() {
  var input = document.getElementById('pastTripMemoInput');
  var countEl = document.getElementById('pastTripMemoCount');
  if (!input || !countEl) return;
  var st = window.__pastTripRegisterState || { memoMode: 'single' };
  var raw = String(input.value || '').slice(0, 120);
  if (input.value !== raw) input.value = raw;
  var cur = raw.length;
  if (st.memoMode === 'per_photo') {
    window._pastTripEnsurePhotoMemos();
    var idx = Number(st.photoIndex) || 0;
    st.photoMemos[idx] = raw;
    countEl.textContent = cur + '/120';
    countEl.style.color = '#38bdf8';
  } else {
    st.singleMemo = raw;
    countEl.textContent = cur + '/120';
    countEl.style.color = (cur >= 30 && cur <= 120) ? '#34d399' : '#64748b';
  }
  window.__pastTripRegisterState = st;
};

window.submitPastTripRegister = async function() {
  window._pastTripCommitMemoInput();
  var dateInput = document.getElementById('pastTripDateInput');
  var spotInput = document.getElementById('pastTripSpotInput');
  var elevInput = document.getElementById('pastTripElevInput');
  var ytInput = document.getElementById('pastTripYoutubeInput');
  var naverInput = document.getElementById('pastTripNaverInput');
  var submitBtn = document.getElementById('pastTripSubmitBtn');
  var st = window.__pastTripRegisterState || {};

  var isoDate = dateInput ? String(dateInput.value || '').trim() : '';
  var dateKey = window._pastTripFormatDateKey(isoDate);
  if (!dateKey) {
    if (typeof showToast === 'function') showToast('날짜를 선택해주세요.', 'warn');
    return;
  }
  var today = new Date();
  var todayNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  var parts = dateKey.match(/\d+/g);
  var targetNum = parseInt(parts[0], 10) * 10000 + parseInt(parts[1], 10) * 100 + parseInt(parts[2], 10);
  if (targetNum >= todayNum) {
    if (typeof showToast === 'function') showToast('오늘 이전 날짜만 등록할 수 있습니다.', 'warn');
    return;
  }

  var isSingle = st.memoMode !== 'per_photo';
  var memo = '';
  var photoMemos = [];
  if (isSingle) {
    memo = String(st.singleMemo || '').trim().slice(0, 120);
    photoMemos = [memo];
    if (!memo) {
      if (typeof showToast === 'function') showToast('대표 일지를 작성해주세요.', 'warn', 2400, 'center');
      var memoElEmpty = document.getElementById('pastTripMemoInput');
      if (memoElEmpty) memoElEmpty.focus();
      return;
    }
    if (memo.length < 30) {
      if (typeof showToast === 'function') {
        showToast('대표 일지는 30자 이상 작성해주세요. (현재 ' + memo.length + '자)', 'warn', 2800, 'center');
      }
      var memoEl = document.getElementById('pastTripMemoInput');
      if (memoEl) memoEl.focus();
      return;
    }
  } else {
    photoMemos = (st.photoMemos || []).map(function(m) { return String(m || '').trim().slice(0, 120); });
    memo = String(photoMemos[0] || '').trim();
    if (!memo) memo = String(photoMemos.filter(Boolean)[0] || '').trim();
  }

  var spot = spotInput ? String(spotInput.value || '').trim() : (st.spotName || '');
  if (!spot) spot = '자유 일정';
  if (typeof window.okbmIsXssProbeSpotName === 'function' && window.okbmIsXssProbeSpotName(spot)) {
    if (typeof showToast === 'function') showToast('올바른 장소명을 입력해 주세요.', 'warn');
    return;
  }
  var regionInput = document.getElementById('pastTripRegionInput');
  var region = regionInput ? String(regionInput.value || '').trim() : (st.region || '');
  spot = window._pastTripMergeSpotRegion(spot, region);
  var elevRaw = elevInput ? String(elevInput.value || '').trim() : (st.elev || '');
  var elev = elevRaw;
  if (elev && !/m$/i.test(elev) && !isNaN(parseInt(elev, 10))) elev = parseInt(elev, 10) + 'm';

  var spotId = String(st.spotId || '').trim();
  var isUnregistered = !spotId;

  var photos = (st.photos || []).filter(function(u) {
    return typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://'));
  });

  window.onPastTripLinkBlur('yt');
  window.onPastTripLinkBlur('blog');
  var ytUrl = window._pastTripCleanYoutubeUrl(ytInput ? ytInput.value : '');
  var blogUrl = window._pastTripCleanNaverBlogUrl(naverInput ? naverInput.value : '');
  if (ytInput && ytInput.value.trim() && !ytUrl) {
    if (typeof showToast === 'function') showToast('유튜브 링크를 확인해주세요.', 'warn');
    return;
  }
  if (naverInput && naverInput.value.trim() && !blogUrl) {
    if (typeof showToast === 'function') showToast('네이버 블로그 링크를 확인해주세요.', 'warn');
    return;
  }
  if (ytInput && ytUrl) ytInput.value = ytUrl;
  if (naverInput && blogUrl) naverInput.value = blogUrl;

  var packedItems = Array.isArray(st.items) ? st.items.slice() : [];
  var totalGrams = 0;
  packedItems.forEach(function(it) { totalGrams += Number(it && it.weight ? it.weight : 0); });
  if (!packedItems.length && st.presetId) {
    var presets = window._pastTripReadPresets();
    var target = presets.find(function(p) { return String(p.id) === String(st.presetId); });
    var flat = window._pastTripFlattenPresetItems(target);
    packedItems = flat.items;
    totalGrams = flat.totalGrams;
  }

  if (typeof window.savePackingHistoryRecord !== 'function') {
    if (typeof showToast === 'function') showToast('저장 엔진을 불러오지 못했습니다.', 'error');
    return;
  }

  if (isUnregistered && typeof showToast === 'function') {
    showToast('비등록 장소는 나만보기로 저장되며 마이데이터에 합산됩니다.', 'info', 2800);
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';
    submitBtn.style.opacity = '0.6';
  }

  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  var recordId = 'pack_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

  var newRecord = {
    id: recordId,
    templateId: 1,
    date: dateKey,
    year: y,
    month: m,
    day: d,
    spot: spot,
    elevation: elev,
    spotId: spotId || '',
    weightKg: (totalGrams / 1000).toFixed(2),
    weightGrams: totalGrams,
    itemCount: packedItems.length,
    memo: memo,
    oneLineMemo: memo.slice(0, 120),
    photoMemos: photoMemos,
    memoMode: isSingle ? 'single' : 'per_photo',
    isDraft: false,
    isPublished: isUnregistered ? false : (photos.length > 0),
    unregisteredSpot: isUnregistered,
    items: packedItems,
    photos: photos,
    youtube: ytUrl || '',
    blog: blogUrl || '',
    readyShotPhoto: '',
    _isLocalOwner: true,
    feedType: 'route'
  };

  try {
    var saved = await window.savePackingHistoryRecord(newRecord);
    if (saved && saved.__serverSaveFailed) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '등록하기';
        submitBtn.style.opacity = '1';
      }
      return;
    }

    if (!isUnregistered && spotId && (ytUrl || blogUrl)) {
      var mediaMerged = await window._pastTripMergeSpotMediaUrls(spotId, ytUrl ? [ytUrl] : [], blogUrl ? [blogUrl] : []);
      if (!mediaMerged && typeof showToast === 'function') {
        showToast('일정은 저장됐지만 유튜브/블로그 링크 반영에 실패했습니다.', 'warn', 2800);
      } else if (mediaMerged && typeof window.prefetchSpotMediaForSpot === 'function') {
        var mediaSpot = (window.spots || []).find(function(s) { return String(s.id).trim() === spotId; });
        if (mediaSpot) window.prefetchSpotMediaForSpot(mediaSpot);
      }
    } else if (isUnregistered && (ytUrl || blogUrl)) {
      window._pastTripSavePendingMedia(spot, ytUrl, blogUrl);
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') {
      showToast(isUnregistered ? '나만보기로 저장되었습니다. 마이데이터에 합산됩니다.' : '과거 일정이 등록되었습니다.', 'success', 2200);
    }

    var el = document.getElementById('pastTripRegisterModal');
    if (el) el.remove();
    if (typeof window.refreshMyReportFullStats === 'function') window.refreshMyReportFullStats();

    if (typeof window.openPastTripsListModal === 'function') {
      if (typeof window.recordModalHistoryStep === 'function') {
        window.recordModalHistoryStep('userProfileModalOverlay', function() {
          if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
        });
      }
      window.openPastTripsListModal(true);
      if (typeof window.okbmLiftReportChildModal === 'function') {
        window.okbmLiftReportChildModal(document.getElementById('pastTripsListModal'));
      }
    } else if (typeof window.openUserProfileModal === 'function') {
      window.openUserProfileModal();
    }
  } catch (err) {
    console.error('[submitPastTripRegister]', err);
    if (typeof showToast === 'function') showToast('등록 중 오류가 발생했습니다.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '등록하기';
      submitBtn.style.opacity = '1';
    }
  }
};

window.openMyPastTripsFromReport = function(ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
  }
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  var report = document.getElementById('userProfileModalOverlay');
  if (report) report.style.setProperty('display', 'none', 'important');
  if (typeof window.openPastTripsListModal === 'function') {
    window.openPastTripsListModal(true);
    if (typeof window.okbmLiftReportChildModal === 'function') {
      window.okbmLiftReportChildModal(document.getElementById('pastTripsListModal'));
    }
  } else {
    window.navigateToDockTab('history');
  }
};

window.openRoutersInterestFromReport = function(ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
  }
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  var report = document.getElementById('userProfileModalOverlay');
  if (report) report.style.setProperty('display', 'none', 'important');
  if (typeof window.openFollowedRoutersModal === 'function') {
    window.openFollowedRoutersModal(true);
    if (typeof window.okbmLiftReportChildModal === 'function') {
      window.okbmLiftReportChildModal(document.getElementById('followedRoutersModal'));
    }
  } else {
    window.navigateToDockTab('history');
  }
};

window.openFeedsInterestFromReport = function(ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
  }
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  var report = document.getElementById('userProfileModalOverlay');
  if (report) report.style.setProperty('display', 'none', 'important');
  var openSaved = window.openSavedFeedsListModal || window.openSavedFeedsModal;
  if (typeof openSaved === 'function' && openSaved !== window.openFeedsInterestFromReport) {
    openSaved(true);
    if (typeof window.okbmLiftReportChildModal === 'function') {
      window.okbmLiftReportChildModal(document.getElementById('savedFeedsListModal') || document.getElementById('savedFeedsEmptyModal'));
    }
  } else {
    window.navigateToDockTab('history');
  }
};

window.openMyFeedsModal = window.openMyPastTripsFromReport;
window.openFollowingUsersModal = window.openRoutersInterestFromReport;

window.okbmEnsurePastTripRegisterCta = function() {
  var body = document.getElementById('userProfileScrollBody');
  if (!body) return;
  var buttons = body.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    var b = buttons[i];
    var t = String(b.innerText || '').replace(/\s+/g, ' ').trim();
    if (t.indexOf('결산 카드') !== -1 || t.indexOf('과거 추억 등록') !== -1) {
      b.setAttribute('onclick', 'window.openPastTripRegisterModal(event);');
      var span = b.querySelector('span');
      if (span) span.textContent = '과거 추억 등록';
      return;
    }
  }
};

function openUserProfileModal() {
  try {
    if (!isUserLoggedIn()) {
      openLoginModal();
      return;
    }

    [
      'followedRoutersModal',
      'savedFeedsEmptyModal',
      'singleTripFeedModal',
      'pastTripsListModal',
      'romanticInterestModal',
      'userFeedCollectionModal'
    ].forEach(function(mId) {
      var m = document.getElementById(mId);
      if (m) m.remove();
    });

    var shieldStyle = document.getElementById('romanticModalShieldCss');
    if (!shieldStyle) {
      shieldStyle = document.createElement('style');
      shieldStyle.id = 'romanticModalShieldCss';
      shieldStyle.innerHTML = '.floating-top-search-wrap, .spot-detail-sheet, #spotDetailSheet, #spotDrawer, #spotPopupContainer { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
      document.head.appendChild(shieldStyle);
    }

    ensureMyReportAndAuthModalsInDOM();
    if (typeof window.okbmEnsurePastTripRegisterCta === 'function') {
      window.okbmEnsurePastTripRegisterCta();
    }
    window.__reportRenderCache = {};

    var targetUserId = okbmGetCurrentUserId();
    var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
    if (!profile && targetUserId && typeof safeGetJSON === 'function') {
      profile = safeGetJSON('user_profile_' + targetUserId, null);
    }
    if (!profile && typeof authState !== 'undefined') {
      profile = authState.userProfile || null;
    }
    var targetNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '야영자');
    var targetPhoto = (profile && (profile.photoUrl || profile.heroCoverUrl)) ? (profile.photoUrl || profile.heroCoverUrl) : (localStorage.getItem('okbm_hero_cover_url') || '');
    var bioVal = (profile && profile.bio) ? profile.bio : (localStorage.getItem('okbm_user_bio') || '');

    var headerContainer = document.getElementById('reportProfileHeaderContainer');
    if (headerContainer && typeof window.renderUserProfileHeaderSection === 'function') {
      headerContainer.innerHTML = window.renderUserProfileHeaderSection({
        isOwner: true,
        userId: targetUserId,
        nickname: targetNick,
        bio: bioVal,
        photoUrl: targetPhoto,
        instagram: localStorage.getItem('okbm_user_instagram') || (profile && profile.instagram) || '',
        youtube: localStorage.getItem('okbm_user_youtube') || (profile && profile.youtube) || '',
        blog: localStorage.getItem('okbm_user_blog') || (profile && profile.blog) || '',
        snsChannel: localStorage.getItem('okbm_user_sns_channel') || (profile && (profile.snsChannel || profile.sns_channel)) || ''
      });
    }

    if (typeof window.applyMasterCoverPhotoToAllUI === 'function') {
      window.applyMasterCoverPhotoToAllUI(targetPhoto);
    }

    if (typeof window.saveUserToSupabase === 'function' && profile) {
      window.saveUserToSupabase(profile);
    }

    if (typeof window.refreshMyReportFullStats === 'function') {
      window.refreshMyReportFullStats();
    }
    if (typeof window.refreshProposalInboxForUser === 'function') {
      window.refreshProposalInboxForUser().then(function() {
        var body = document.getElementById('accBody_myprops');
        if (body && body.style.display === 'flex') window._renderMyPropsModule(body);
      }).catch(function() {});
    }
    if (typeof window.pollUserNotifications === 'function') {
      window.pollUserNotifications(true).catch(function() {});
    }
    if (typeof window.okbmRefreshNoteBadge === 'function') {
      window.okbmRefreshNoteBadge().catch(function() {});
    }

    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) {
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      modal.style.setProperty('position', 'fixed', 'important');
      modal.style.setProperty('top', '0', 'important');
      modal.style.setProperty('left', '0', 'important');
      modal.style.setProperty('right', '0', 'important');
      modal.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 8px))', 'important');
      modal.style.setProperty('width', '100%', 'important');
      modal.style.setProperty('height', 'auto', 'important');
      modal.style.setProperty('z-index', '2147483640', 'important');
      modal.style.setProperty('background', '#000000', 'important');
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('contain', 'paint layout', 'important');
      modal.style.setProperty('overscroll-behavior', 'none', 'important');
    }

    window.ensureMasterBottomDock('report');
    triggerHaptic(12);
  } catch (e) { console.warn('[romantic-sync.js:openUserProfileModal]', e); }
}
window.openUserProfileModal = openUserProfileModal;

function closeUserProfileModal() {
  try {
    _okbmCloseReportYearDropdown();
    _okbmCloseModuleCustomDropdowns();
    okbmCloseAccountLayerModals();
    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');

    var shieldStyle = document.getElementById('romanticModalShieldCss');
    if (shieldStyle) shieldStyle.remove();

    var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');
    window.ensureMasterBottomDock(isMap ? 'map' : 'router');
  } catch (e) { console.warn('[romantic-sync.js:closeUserProfileModal]', e); }
}
window.closeUserProfileModal = closeUserProfileModal;

// [메인 대표 사진 엔진] 앱 전역(마이리포트 아바타 & 계정 관리 썸네일 & 낭만보관함 히어로 배경) 즉시 반영
window.applyMasterCoverPhotoToAllUI = function(photoUrl) {
  var cleanUrl = okbmSafeImageUrl(photoUrl);

  var headerAv = document.getElementById('reportHeaderProfileImg');
  if (headerAv) {
    if (cleanUrl) {
      headerAv.style.backgroundImage = 'url("' + cleanUrl + '")';
      headerAv.innerHTML = '';
    } else {
      headerAv.style.backgroundImage = 'none';
      headerAv.innerHTML = '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
  }

  var modalPreview = document.getElementById('settingsModalCoverPreviewWrap');
  var defaultSvg = document.getElementById('settingsModalCoverDefaultSvg');
  if (modalPreview) {
    if (cleanUrl) {
      modalPreview.style.backgroundImage = 'url("' + cleanUrl + '")';
      if (defaultSvg) defaultSvg.style.display = 'none';
    } else {
      modalPreview.style.backgroundImage = 'none';
      if (defaultSvg) defaultSvg.style.display = 'block';
    }
  }

  var heroCoverImg = document.getElementById('historyHeroCoverImg') || document.querySelector('.history-hero-cover');
  if (heroCoverImg) {
    if (heroCoverImg.tagName === 'IMG') {
      if (cleanUrl) heroCoverImg.src = cleanUrl;
    } else if (cleanUrl) {
      heroCoverImg.style.backgroundImage = 'url("' + cleanUrl + '")';
    }
  }

  window.dispatchEvent(new CustomEvent('okbm_profile_photo_changed', { detail: { photoUrl: cleanUrl } }));
};

window.previewUserPhotoLarge = function(photoUrl) {
  var url = okbmSafeImageUrl(photoUrl);
  if (!url || String(url).indexOf('http') !== 0) {
    if (typeof showToast === 'function') showToast('등록된 대표 사진이 없습니다.', 'info', 2200);
    return;
  }

  var oldViewer = document.getElementById('masterCoverLargeViewerModal');
  if (oldViewer) oldViewer.remove();

  var viewer = document.createElement('div');
  viewer.id = 'masterCoverLargeViewerModal';
  viewer.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px; box-sizing:border-box; cursor:pointer;';
  viewer.onclick = function() { viewer.remove(); triggerHaptic(8); };

  viewer.innerHTML = '<div style="position:relative; width:250px; height:250px; border-radius:50%; border:2px solid rgba(186,230,253,0.6); box-shadow:0 0 35px rgba(56,189,248,0.35); overflow:hidden; background:#07090e; flex-shrink:0;">' +
      '<img src="' + escapeHtml(url) + '" style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none;" />' +
    '</div>';

  document.body.appendChild(viewer);
};

// 🔍 [메인 대표 사진 대형 확대 뷰어 라이트박스]
window.previewMasterUserCoverPhotoLarge = function() {
  triggerHaptic(10);
  var profile = safeGetJSON('user_profile', null);
  var photoUrl = okbmSafeImageUrl(localStorage.getItem('okbm_hero_cover_url') || (profile && (profile.heroCoverUrl || profile.photoUrl)) || '');

  if (!photoUrl) {
    showToast('등록된 대표 사진이 없습니다. [사진 변경]을 눌러보세요.', 'info', 2200);
    return;
  }

  window.previewUserPhotoLarge(photoUrl);
};

// [메인 대표 사진 초기화]
window.resetMasterUserCoverPhoto = function() {
  triggerHaptic(12);
  localStorage.removeItem('okbm_hero_cover_url');
  var profile = safeGetJSON('user_profile', null);
  if (profile) {
    delete profile.heroCoverUrl;
    delete profile.photoUrl;
    localStorage.setItem('user_profile', JSON.stringify(profile));
    if (profile.id) localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
  }
  window.applyMasterCoverPhotoToAllUI('');
  if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  showToast('기본 프로필로 복원되었습니다.', 'info');
};    

// [메인 대표 사진 인터랙티브 크로퍼 & Cloudflare R2 직통 전송 엔진]
window.uploadMasterUserCoverPhoto = function(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    window.openCoverPhotoCropperModal(e.target.result);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

window.openCoverPhotoCropperModal = function(imageSrc) {
  triggerHaptic(10);
  var oldModal = document.getElementById('coverPhotoCropperModal');
  if (oldModal) oldModal.remove();

  var modal = document.createElement('div');
  modal.id = 'coverPhotoCropperModal';
  modal.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:#000000; display:flex; flex-direction:column; justify-content:space-between; align-items:center; padding:calc(12px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; box-sizing:border-box; user-select:none; -webkit-user-select:none; touch-action:none;';

  modal.innerHTML = '<div style="width:100%; max-width:480px; display:flex; justify-content:space-between; align-items:center; z-index:50;">' +
      '<button type="button" id="cropperCancelBtn" style="background:none; border:none; color:#cbd5e1; font-size:0.90rem; font-weight:800; cursor:pointer; padding:6px 0;">취소</button>' +
      '<span style="font-size:0.95rem; font-weight:900; color:#ffffff;">프로필 사진</span>' +
      '<button type="button" id="cropperConfirmBtn" style="background:none; border:none; color:#38bdf8; font-size:0.95rem; font-weight:900; cursor:pointer; padding:6px 0;">확인</button>' +
    '</div>' +

    '<div style="position:relative; width:300px; height:300px; margin:auto; display:flex; align-items:center; justify-content:center; touch-action:none;">' +
      '<canvas id="cropperViewportCanvas" width="300" height="300" style="position:absolute; inset:0; border-radius:50%; box-shadow:0 0 0 9999px rgba(0,0,0,0.85); cursor:grab; touch-action:none;"></canvas>' +
      '<div style="position:absolute; inset:0; border:2px solid rgba(255,255,255,0.4); border-radius:50%; pointer-events:none; box-sizing:border-box;"></div>' +
    '</div>' +

    '<div style="width:100%; max-width:480px; height:20px;"></div>';

  document.body.appendChild(modal);

  var canvas = document.getElementById('cropperViewportCanvas');
  var ctx = canvas.getContext('2d');
  var cancelBtn = document.getElementById('cropperCancelBtn');
  var confirmBtn = document.getElementById('cropperConfirmBtn');

  var img = new Image();
  var scale = 1;
  var baseScale = 1;
  var offsetX = 0;
  var offsetY = 0;

  var isDragging = false;
  var isPinching = false;
  var startX = 0;
  var startY = 0;
  var initialDistance = 0;
  var initialScale = 1;

  var render = function() {
    ctx.clearRect(0, 0, 300, 300);
    ctx.save();
    ctx.translate(150, 150);
    ctx.scale(scale * baseScale, scale * baseScale);
    ctx.translate(offsetX, offsetY);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  };

  img.onload = function() {
    var minDim = Math.min(img.width, img.height);
    baseScale = 300 / minDim;
    render();
  };
  img.src = imageSrc;

  // 🛡️ [메모리 누수 패치] 모달 닫힐 때 window 리스너 일괄 해제
  var cropperAbort = new AbortController();
  var cropperSignal = cropperAbort.signal;

  cancelBtn.onclick = function() {
    triggerHaptic(8);
    cropperAbort.abort(); // 🛡️ window 리스너 일괄 해제
    modal.remove();
  };

  var getDistance = function(touches) {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  };

  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var delta = e.deltaY < 0 ? 0.08 : -0.08;
    scale = Math.max(0.6, Math.min(4.0, scale + delta));
    render();
  }, { passive: false, signal: cropperSignal });

  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      isPinching = true;
      isDragging = false;
      initialDistance = getDistance(e.touches);
      initialScale = scale;
    } else if (e.touches.length === 1) {
      isDragging = true;
      isPinching = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }
  }, { passive: false, signal: cropperSignal });

  window.addEventListener('touchmove', function(e) {
    if (!isDragging && !isPinching) return;
    e.preventDefault();

    if (isPinching && e.touches.length === 2) {
      var currentDistance = getDistance(e.touches);
      if (initialDistance > 0) {
        var ratio = currentDistance / initialDistance;
        scale = Math.max(0.6, Math.min(4.0, initialScale * ratio));
        render();
      }
    } else if (isDragging && e.touches.length === 1) {
      var currentX = e.touches[0].clientX;
      var currentY = e.touches[0].clientY;
      var dx = (currentX - startX) / (scale * baseScale);
      var dy = (currentY - startY) / (scale * baseScale);
      offsetX += dx;
      offsetY += dy;
      startX = currentX;
      startY = currentY;
      render();
    }
  }, { passive: false, signal: cropperSignal });

  var handleTouchEnd = function() {
    isDragging = false;
    isPinching = false;
  };

  window.addEventListener('touchend', handleTouchEnd, { passive: true, signal: cropperSignal });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true, signal: cropperSignal });

  canvas.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvas.style.cursor = 'grabbing';
  }, { signal: cropperSignal });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dx = (e.clientX - startX) / (scale * baseScale);
    var dy = (e.clientY - startY) / (scale * baseScale);
    offsetX += dx;
    offsetY += dy;
    startX = e.clientX;
    startY = e.clientY;
    render();
  }, { signal: cropperSignal });

  window.addEventListener('mouseup', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }, { signal: cropperSignal });

  confirmBtn.onclick = async function() {
    triggerHaptic(12);
    confirmBtn.disabled = true;
    confirmBtn.innerText = '등록 중...';

    var finalCanvas = document.createElement('canvas');
    finalCanvas.width = 1200;
    finalCanvas.height = 1200;
    var fCtx = finalCanvas.getContext('2d');

    var ratio = 1200 / 300;
    fCtx.translate(600, 600);
    fCtx.scale(scale * baseScale * ratio, scale * baseScale * ratio);
    fCtx.translate(offsetX, offsetY);
    fCtx.drawImage(img, -img.width / 2, -img.height / 2);

    var compressedBase64 = finalCanvas.toDataURL('image/jpeg', 0.85);

    try {
      var uploadedUrl = '';
      var safeFileName = 'master_cover_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.jpg';
      var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';

      var base64Data = compressedBase64.includes(',') ? compressedBase64.split(',')[1] : compressedBase64;
      var byteCharacters = atob(base64Data);
      var byteNumbers = new Array(byteCharacters.length);
      for (var b = 0; b < byteCharacters.length; b++) {
        byteNumbers[b] = byteCharacters.charCodeAt(b);
      }
      var byteArray = new Uint8Array(byteNumbers);
      var blob = new Blob([byteArray], { type: 'image/jpeg' });

      var cfRes = await fetch(CF_WORKER_UPLOAD_URL + '?file=' + encodeURIComponent(safeFileName), {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob
      });
      if (cfRes.ok) {
        var cfData = await cfRes.json();
        if (cfData && cfData.status === 'SUCCESS' && cfData.url) {
          uploadedUrl = cfData.url;
        }
      }

      if (!uploadedUrl || !uploadedUrl.startsWith('http')) {
        showToast('사진 업로드에 실패했습니다.', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerText = '확인';
        return;
      }

      var profile = safeGetJSON('user_profile', null);
      if (profile) {
        profile.photoUrl = uploadedUrl;
        profile.heroCoverUrl = uploadedUrl;
        localStorage.setItem('okbm_hero_cover_url', uploadedUrl);
        localStorage.setItem('user_profile', JSON.stringify(profile));
        if (profile.id) {
          localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
        }
      }

      window.applyMasterCoverPhotoToAllUI(uploadedUrl);

      if (typeof window.saveUserToSupabase === 'function' && profile) {
        window.saveUserToSupabase(profile);
      }

      if (typeof syncUserDataToCloud === 'function') {
        syncUserDataToCloud();
      }

      cropperAbort.abort();
      modal.remove();
      showToast('프로필 사진이 저장되었습니다.', 'success', 2500);
    } catch (err) {
      showToast('사진 등록 중 오류가 발생했습니다.', 'error', 3000);
      confirmBtn.disabled = false;
      confirmBtn.innerText = '확인';
    }
  };
};

// 계정 설정 모달 제어 (가입날짜 완전 보존 & 14일 쿨다운 정밀 잠금)
window.openAccountSettingsModal = function() {
  triggerHaptic(10);
  ensureMyReportAndAuthModalsInDOM();
  var modal = document.getElementById('userAccountSettingsModal');
  if (!modal) return;

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var isLogged = isUserLoggedIn();
  var currentNick = (isLogged && profile && profile.nickname) ? profile.nickname : '로그인이 필요합니다';
  
  var joinDate = (isLogged && profile && profile.createdAt) ? String(profile.createdAt).trim() : '비로그인 게스트';
  var dateMatch = joinDate.match(/^(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
  if (dateMatch) {
    joinDate = dateMatch[1] + '.' + String(dateMatch[2]).padStart(2, '0') + '.' + String(dateMatch[3]).padStart(2, '0');
  }

  var nickInput = document.getElementById('settingsModalNicknameInput');
  var dateEl = document.getElementById('settingsModalJoinDate');
  var noticeEl = document.getElementById('settingsModalCooldownNotice');
  var submitBtn = modal.querySelector('button[onclick="saveNicknameFromSettingsModal()"]');
  var authActionBtn = document.getElementById('settingsModalAuthActionBtn');
  var deleteAccountBtn = document.getElementById('settingsModalDeleteAccountBtn');
  var socialLinkCard = document.getElementById('settingsSocialLinkCard');
  if (deleteAccountBtn) {
    deleteAccountBtn.style.display = isLogged ? '' : 'none';
  }
  if (socialLinkCard) {
    socialLinkCard.style.display = isLogged ? '' : 'none';
  }

  if (authActionBtn) {
    if (isLogged) {
      authActionBtn.style.background = 'rgba(244,63,94,0.15)';
      authActionBtn.style.border = '1px solid #f43f5e';
      authActionBtn.style.color = '#fda4af';
      authActionBtn.innerText = '로그아웃';
      authActionBtn.onclick = function() {
        modal.style.display = 'none';
        closeUserProfileModal();
        logoutUser();
      };
    } else {
      authActionBtn.style.background = '#ffffff';
      authActionBtn.style.border = 'none';
      authActionBtn.style.color = '#111827';
      authActionBtn.innerText = '소셜 로그인';
      authActionBtn.onclick = function() {
        modal.style.display = 'none';
        openLoginModal();
      };
    }
  }

  if (nickInput) {
    nickInput.value = isLogged ? currentNick : '';
    nickInput.disabled = !isLogged;
  }
  if (submitBtn) {
    submitBtn.disabled = !isLogged;
    submitBtn.style.opacity = isLogged ? '1' : '0.4';
    submitBtn.style.cursor = isLogged ? 'pointer' : 'not-allowed';
  }
  if (dateEl) dateEl.innerText = joinDate;

  if (noticeEl) {
    var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
    var lastChanged = profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0;
    var now = Date.now();
    var elapsed = now - lastChanged;

    if (lastChanged > 0 && elapsed < COOLDOWN_MS) {
      var remainingMs = COOLDOWN_MS - elapsed;
      var remDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      var remHours = Math.ceil((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var remainText = remDays > 0 ? (remDays + '일 ' + remHours + '시간') : (remHours + '시간');

      noticeEl.innerHTML = '<span style="color:#fda4af; font-size:0.68rem; font-weight:800;">🔒 닉네임 변경 쿨다운 중 (' + remainText + ' 후 변경 가능)</span>';
      if (nickInput) nickInput.disabled = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.4';
        submitBtn.style.cursor = 'not-allowed';
      }
    } else {
      noticeEl.innerHTML = '<span style="color:#a7f3d0; font-size:0.68rem; font-weight:800;">✓ 지금 바로 닉네임 변경 가능 (변경 후 14일간 유지)</span>';
    }
  }

  if (typeof window.renderBlockedUsersSettingsList === 'function') {
    window.renderBlockedUsersSettingsList();
    if (typeof window.okbmSyncUgcSafetyFromServer === 'function') {
      window.okbmSyncUgcSafetyFromServer().then(function() {
        window.renderBlockedUsersSettingsList();
      }).catch(function() {});
    }
  }

  var existingAdminEntry = document.getElementById('adminReportInspectorEntry');
  if (existingAdminEntry) existingAdminEntry.remove();
  if (typeof window.okbmRefreshAdminFlagFromServer === 'function') {
    window.okbmRefreshAdminFlagFromServer().then(function(isAdmin) {
      if (isAdmin) okbmMountAdminReportInspectorEntry();
    }).catch(function() {});
  }

  modal.style.display = 'flex';
};

window.closeAccountSettingsModal = function() {
  var modal = document.getElementById('userAccountSettingsModal');
  if (modal) modal.style.display = 'none';
  if (typeof window.goBackModal === 'function') {
    try { window.goBackModal(); } catch (e) {}
  }
};

window.saveNicknameFromSettingsModal = async function() {
  var input = document.getElementById('settingsModalNicknameInput');
  if (!input || !input.value.trim()) {
    showToast('새 닉네임을 입력해주세요.', 'warn');
    return;
  }
  var clean = okbmNormalizeNickname(input.value);

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : { isMember: true });
  var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  var lastChanged = profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0;
  var now = Date.now();
  var elapsed = now - lastChanged;

  if (lastChanged > 0 && elapsed < COOLDOWN_MS) {
    var remainingDays = Math.ceil((COOLDOWN_MS - elapsed) / (1000 * 60 * 60 * 24));
    triggerHaptic(20);
    showToast('닉네임은 14일마다 1회 변경 가능합니다. [' + remainingDays + '일 후 가능]', 3500);
    return;
  }

  if (profile && okbmNormalizeNickname(profile.nickname) === clean) {
    showToast('현재 사용 중인 닉네임과 동일합니다.', 'info');
    return;
  }

  try {
    var taken = await okbmIsNicknameTaken(clean, profile && profile.id);
    if (taken) {
      triggerHaptic(20);
      showToast('이미 사용 중인 닉네임입니다.', 'warn');
      return;
    }
  } catch (dupErr) {
    console.warn('[saveNicknameFromSettingsModal dup]', dupErr);
    triggerHaptic(20);
    showToast('닉네임 확인에 실패했습니다. 다시 시도해주세요.', 'warn');
    return;
  }

  profile.nickname = clean;
  profile.lastNicknameChangedAt = now;
  if (!profile.createdAt) {
    profile.createdAt = getFormattedNow();
  }

  localStorage.setItem('user_profile', JSON.stringify(profile));
  if (profile.id) {
    localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
    localStorage.setItem('okbm_custom_nickname_' + profile.id, clean);
  }
  localStorage.setItem('okbm_user_nick', clean);

  if (typeof authState !== 'undefined') {
    authState.userProfile = profile;
    authState.isLoggedIn = true;
  }

  var headerNick = document.getElementById('reportHeaderCurrentNick');
  if (headerNick) headerNick.innerText = clean;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (targetUrl && targetKey && profile.id) {
    var nickHeaders = okbmWriteRestHeaders({ Prefer: 'return=minimal' });
    if (nickHeaders) {
      fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(String(profile.id).trim()), {
        method: 'PATCH',
        headers: nickHeaders,
        body: JSON.stringify({
          nickname: clean,
          last_nickname_changed_at: now,
          updated_at: new Date().toISOString()
        })
      }).catch(function() {});
    }
  }

  updateHeaderAuthUI();
  triggerHaptic(15);
  showToast('닉네임이 [' + clean + '] (으)로 변경되었습니다!', 'success', 2500);

  var modal = document.getElementById('userAccountSettingsModal');
  if (modal) modal.style.display = 'none';

  if (typeof renderSpots === 'function') renderSpots();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
  if (typeof renderPlanStage === 'function') renderPlanStage();
  if (typeof renderHistoryStage === 'function') renderHistoryStage();
};

// 로그아웃 및 세션 완전 롤백
function logoutUser() {
  triggerHaptic(15);
  if (typeof window.okbmCleanupModalWatchers === 'function') {
    try { window.okbmCleanupModalWatchers(); } catch (e) {}
  }
  if (typeof window.okbmNoteRealtimeStop === 'function') {
    try { window.okbmNoteRealtimeStop('all'); } catch (e) {}
  }
  if (typeof window.closeDirectMessageModals === 'function') {
    try { window.closeDirectMessageModals({}); } catch (e) {}
  }

  if (typeof Kakao !== 'undefined' && Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
    try {
      Kakao.Auth.logout(function() {});
    } catch (e) { console.warn('[romantic-sync.js:logoutUser kakao]', e); }
  }
  if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.signOut === 'function') {
    try { window.supabaseClient.auth.signOut(); } catch (e) { console.warn('[romantic-sync.js:logoutUser supabase]', e); }
  }

  localStorage.removeItem('user_auth_token');
  localStorage.removeItem('user_profile');
  localStorage.removeItem('okbm_user_id');
  localStorage.removeItem('okbm_user_nick');
  localStorage.removeItem('okbm_following_users');
  localStorage.removeItem('okbm_hero_cover_url');

  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('user_profile_') || k.startsWith('okbm_custom_nickname_') || k.startsWith('okbm_feed_stars_map')) {
        localStorage.removeItem(k);
      }
    });
  } catch(e) { console.warn('[romantic-sync.js:logoutUser keys]', e); }

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = false;
    authState.userProfile = null;
  }
  window.__okbmIsAdmin = false;
  var adminEntry = document.getElementById('adminReportInspectorEntry');
  if (adminEntry) adminEntry.remove();
  var adminModal = document.getElementById('adminReportInspectorModal');
  if (adminModal) adminModal.remove();
  var spotInboxEntry = document.getElementById('adminSpotInboxEntry');
  if (spotInboxEntry) spotInboxEntry.remove();
  var spotInboxModal = document.getElementById('adminSpotInboxModal');
  if (spotInboxModal) spotInboxModal.remove();
  if (typeof window.applyAdminPermissions === 'function') {
    window.applyAdminPermissions(false);
  }

  var userPersonalKeys = [
    'okbm_bookmarks', 'okbm_visited', 'okbm_memos',
    'okbm_plan_memos', 'okbm_plan_spots', 'okbm_packing_history',
    'okbm_selected_gears_multi', 'okbm_favorite_gears',
    'okbm_custom_gears', 'okbm_gear_presets', 'okbm_gear_meta',
    'okbm_trip_consumables', 'okbm_packed_checks', 'okbm_phone_photos_map',
    'okbm_trip_photos_map', 'okbm_user_instagram', 'okbm_cached_community_feeds',
    'okbm_hero_cover_url', 'okbm_my_proposals',
    'okbm_feed_stars_map', 'okbm_feed_stars_counts', 'okbm_saved_feeds'
  ];
  userPersonalKeys.forEach(function(k) {
    try { localStorage.removeItem(k); } catch(e) { console.warn('[romantic-sync.js:logoutUser removeItem]', e); }
  });
  localStorage.setItem('okbm_client_epoch', '20260912_CLEAN_RESET_V2');

  if (typeof window.userBookmarks !== 'undefined') window.userBookmarks = new Set();
  if (typeof window.userVisited !== 'undefined') window.userVisited = new Set();
  if (typeof window.userMemos !== 'undefined') window.userMemos = {};
  window.selectedGearMap = {};
  window.favoriteGearSet = new Set();
  window.packedCheckSet = new Set();
  window.interactiveHistory = [];
  window.packingHistoryList = [];
  window.currentShareRecord = null;
  window.currentShareItems = [];

  window.__memoryStore = window.__memoryStore || {};
  window.__memoryStore['okbm_packing_history'] = [];
  delete window.__memoryStore['okbm_phone_photos_map'];
  delete window.__memoryStore['okbm_trip_photos_map'];

  var modals = ['loginModalOverlay', 'userProfileModalOverlay', 'myReportModal', 'clearMapModal', 'pastTripsListModal', 'singleTripFeedModal', 'romanticPlanModal', 'romanticHistoryModal'];
  modals.forEach(function(mId) {
    var el = document.getElementById(mId);
    if (el) el.remove();
  });

  if (typeof showToast === 'function') {
    showToast('로그아웃되었습니다. 초기 화면으로 이동합니다.', 'info', 1200);
  }

  var doReload = function() {
    var go = function() { window.location.reload(); };
    if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.signOut === 'function') {
      Promise.race([
        window.supabaseClient.auth.signOut().catch(function() {}),
        new Promise(function(resolve) { setTimeout(resolve, 1200); })
      ]).finally(go);
    } else {
      go();
    }
  };

  if (window.__pendingLikeRequests && window.__pendingLikeRequests.size > 0) {
    var pendingList = Array.from(window.__pendingLikeRequests.values());
    var waitPromise = Promise.allSettled(pendingList);
    var timeoutPromise = new Promise(function(resolve) { setTimeout(resolve, 1500); });
    Promise.race([waitPromise, timeoutPromise]).finally(function() {
      setTimeout(doReload, 50);
    });
  } else {
    setTimeout(doReload, 200);
  }
}
window.logoutUser = logoutUser;

window.confirmUserAccountDeletion = async function() {
  triggerHaptic(12);

  if (!confirm('정말 탈퇴하시겠습니까? 작성한 모든 피드와 활동 기록, 개인 세팅이 영구 삭제되며 복구할 수 없습니다.')) {
    return;
  }

  var userId = okbmRequireCurrentUserId();
  if (!userId) return;

  triggerHaptic(20);

  var deleteBtn = document.getElementById('settingsModalDeleteAccountBtn');
  var restoreDeleteBtn = function() {
    if (!deleteBtn) return;
    deleteBtn.disabled = false;
    deleteBtn.style.opacity = '1';
    deleteBtn.style.pointerEvents = '';
    deleteBtn.innerText = '회원 탈퇴';
  };
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.style.opacity = '0.55';
    deleteBtn.style.pointerEvents = 'none';
    deleteBtn.innerText = '탈퇴 처리 중...';
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) {
    restoreDeleteBtn();
    showToast('서버 설정이 없어 탈퇴를 완료할 수 없습니다.', 'error', 2800);
    return;
  }

  window.__okbmAccountPurging = true;

  var failDeletion = function(message) {
    window.__okbmAccountPurging = false;
    restoreDeleteBtn();
    showToast(message || '서버 데이터 삭제 중 오류가 발생했습니다. 네트워크를 확인한 뒤 다시 시도해주세요.', 'error', 3200);
  };

  try {
    var deleted = await window.okbmInvokeFunction('delete-account', {});
    if (!deleted || deleted.ok !== true) {
      failDeletion('계정 삭제에 실패했습니다. 다시 로그인 후 시도해주세요.');
      return;
    }
    if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.signOut === 'function') {
      try { await window.supabaseClient.auth.signOut(); } catch (e) {}
    }
  } catch (cloudErr) {
    console.error('[confirmUserAccountDeletion] 클라우드 삭제 예외:', cloudErr);
    failDeletion('회원 탈퇴에 실패했습니다. 로그인 세션을 확인한 뒤 다시 시도해주세요.');
    return;
  }

  await new Promise(function(resolve) {
    var settled = false;
    var done = function() {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(done, 1800);

    try {
      if (typeof Kakao !== 'undefined' && Kakao.API && typeof Kakao.API.request === 'function') {
        Kakao.API.request({
          url: '/v1/user/unlink',
          success: function() {
            try {
              if (Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
                Kakao.Auth.logout(done);
                return;
              }
            } catch (unlinkLogoutErr) {
              console.warn('[romantic-sync.js:confirmUserAccountDeletion kakao logout]', unlinkLogoutErr);
            }
            done();
          },
          fail: function() {
            try {
              if (Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
                Kakao.Auth.logout(done);
                return;
              }
            } catch (failLogoutErr) {
              console.warn('[romantic-sync.js:confirmUserAccountDeletion kakao logout]', failLogoutErr);
            }
            done();
          }
        });
      } else if (typeof Kakao !== 'undefined' && Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
        Kakao.Auth.logout(done);
      } else {
        done();
      }
    } catch (kakaoErr) {
      console.warn('[romantic-sync.js:confirmUserAccountDeletion kakao]', kakaoErr);
      done();
    }
  });

  var keepLocalKeys = {
    okbm_spots_cache: true,
    okbm_master_spots: true,
    okbm_gear_version: true,
    okbm_client_epoch: true
  };
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (!keepLocalKeys[k]) {
        localStorage.removeItem(k);
      }
    });
  } catch (lsErr) {
    console.warn('[romantic-sync.js:confirmUserAccountDeletion localStorage]', lsErr);
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(function(k) {
        if (k.indexOf('okbm_') === 0 || k.indexOf('user_') === 0 || k.indexOf('kakao_') === 0) {
          sessionStorage.removeItem(k);
        }
      });
    }
  } catch (ssErr) {
    console.warn('[romantic-sync.js:confirmUserAccountDeletion sessionStorage]', ssErr);
  }

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = false;
    authState.userProfile = null;
  }

  window.__memoryStore = {};
  window.isCloudDataLoaded = false;
  if (typeof window.userBookmarks !== 'undefined') window.userBookmarks = new Set();
  if (typeof window.userVisited !== 'undefined') window.userVisited = new Set();
  if (typeof window.userMemos !== 'undefined') window.userMemos = {};
  window.selectedGearMap = {};
  window.favoriteGearSet = new Set();
  window.packedCheckSet = new Set();
  window.interactiveHistory = [];
  window.packingHistoryList = [];
  window.currentShareRecord = null;
  window.currentShareItems = [];
  window.__allLoadedFeeds = [];
  window.heroTopRecords = [];

  var modals = [
    'loginModalOverlay', 'userProfileModalOverlay', 'myReportModal', 'clearMapModal',
    'pastTripsListModal', 'singleTripFeedModal', 'romanticPlanModal', 'romanticHistoryModal',
    'userAccountSettingsModal'
  ];
  modals.forEach(function(mId) {
    var el = document.getElementById(mId);
    if (el) {
      if (mId === 'userAccountSettingsModal') {
        el.style.display = 'none';
      } else {
        el.remove();
      }
    }
  });

  if (typeof showToast === 'function') {
    showToast('계정이 안전하게 영구 삭제되었습니다.', 'success', 1600);
  }

  setTimeout(function() {
    window.location.reload();
  }, 400);
};

// 8. 4대 소셜 로그인 및 이메일 기반 계정 통합
function okbmMarkSocialButtonsBusy(busy, message, activeClass) {
  var buttons = document.querySelectorAll('.btn-social-apple, .btn-social-kakao, .btn-social-naver, .btn-social-google');
  buttons.forEach(function(btn) {
    if (busy) {
      if (!btn.getAttribute('data-okbm-html')) btn.setAttribute('data-okbm-html', btn.innerHTML);
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.75';
      if (message && (!activeClass || btn.classList.contains(activeClass))) {
        btn.innerHTML = '<span>' + message + '</span>';
      }
    } else {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
      var html = btn.getAttribute('data-okbm-html');
      if (html) btn.innerHTML = html;
    }
  });
}

function okbmPurgeLocalSessionData() {
  try { localStorage.removeItem('user_profile'); } catch (e) {}
  var purgeKeys = [
    'okbm_bookmarks', 'okbm_visited', 'okbm_memos',
    'okbm_plan_memos', 'okbm_plan_spots', 'okbm_packing_history',
    'okbm_selected_gears_multi', 'okbm_favorite_gears',
    'okbm_custom_gears', 'okbm_gear_presets', 'okbm_gear_meta',
    'okbm_trip_consumables', 'okbm_packed_checks', 'okbm_phone_photos_map',
    'okbm_trip_photos_map', 'okbm_user_instagram', 'okbm_cached_community_feeds',
    'okbm_hero_cover_url', 'okbm_my_proposals', 'okbm_saved_feeds', 'okbm_following_users',
    'okbm_blocked_users', 'okbm_blocked_users_meta', 'okbm_user_blocks_bootstrapped', 'okbm_reported_feeds'
  ];
  purgeKeys.forEach(function(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  });
  window.__memoryStore = {};
  window.packingHistoryList = [];
  window.interactiveHistory = [];
  window.__okbmBlockedUsersCache = [];
  window.__okbmBlockedUsersMetaCache = {};
  window.__okbmIsAdmin = false;
}

function okbmSocialUserSelect() {
  return 'id,nickname,email,photo_url,hero_cover_url,bookmarks,my_gears,last_nickname_changed_at,is_admin';
}

function okbmReadSnsFromUserRow(row) {
  var mg = row && row.my_gears && typeof row.my_gears === 'object' ? row.my_gears : {};
  var sns = mg.sns && typeof mg.sns === 'object' ? mg.sns : {};
  return {
    instagram: String(sns.instagram || row && row.instagram || '').trim(),
    youtube: String(sns.youtube || row && row.youtube || '').trim(),
    blog: String(sns.blog || row && row.blog || '').trim()
  };
}

function okbmRepairKnownOwnerProfile(userId, row) {
  return row;
}

async function okbmFetchUserRow(query) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !query) return null;
  try {
    var res = await fetch(targetUrl + '/rest/v1/users?' + query + '&select=' + okbmSocialUserSelect(), {
      method: 'GET',
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) return null;
    var rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return okbmRepairKnownOwnerProfile(rows[0].id, rows[0]);
  } catch (e) {
    console.warn('[okbmFetchUserRow]', e);
    return null;
  }
}

async function okbmFindUserById(userId) {
  var id = String(userId || '').trim();
  if (!id) return null;
  return okbmFetchUserRow('id=eq.' + encodeURIComponent(id));
}

window.okbmFetchPublicProfile = async function(userId) {
  var id = String(userId || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!id || !targetUrl || !targetKey) return null;
  try {
    var res = await fetch(targetUrl + '/rest/v1/rpc/get_public_profile', {
      method: 'POST',
      headers: okbmUgcRestHeaders(),
      body: JSON.stringify({ p_id: id })
    });
    if (!res.ok) return null;
    var row = await res.json();
    if (!row || typeof row !== 'object' || !row.id) return null;
    return row;
  } catch (e) {
    return null;
  }
};

window.okbmFetchPublicProfiles = async function(userIds) {
  var seen = {};
  var ids = (userIds || []).map(function(id) { return String(id || '').trim(); }).filter(function(id) {
    if (!id || seen[id]) return false;
    seen[id] = true;
    return true;
  });
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!ids.length || !targetUrl || !targetKey) return [];
  var out = [];
  var i;
  for (i = 0; i < ids.length; i += 50) {
    var chunk = ids.slice(i, i + 50);
    try {
      var res = await fetch(targetUrl + '/rest/v1/rpc/get_public_profiles', {
        method: 'POST',
        headers: okbmUgcRestHeaders(),
        body: JSON.stringify({ p_ids: chunk })
      });
      if (!res.ok) continue;
      var rows = await res.json();
      if (Array.isArray(rows)) out = out.concat(rows);
    } catch (e) {}
  }
  return out;
};

async function okbmFindPublicProfileById(userId) {
  return window.okbmFetchPublicProfile(userId);
}

function okbmSessionPlantedUserId() {
  try {
    var session = window.__okbmSessionCache && window.__okbmSessionCache.session;
    var meta = session && session.user && session.user.app_metadata ? session.user.app_metadata : {};
    var planted = String(meta.okbm_user_id || '').trim();
    if (planted && window.okbmHasSocialUserId(planted)) return planted;
  } catch (e) {}
  return '';
}

async function okbmFindUserByIdAliases(ids) {
  var seen = {};
  var list = Array.isArray(ids) ? ids : [];
  var i;
  for (i = 0; i < list.length; i++) {
    var id = String(list[i] || '').trim();
    if (!id || seen[id]) continue;
    seen[id] = true;
    var row = await okbmFindUserById(id);
    if (row && row.id) return row;
  }
  for (i = 0; i < list.length; i++) {
    var pid = String(list[i] || '').trim();
    if (!pid || seen['pub:' + pid]) continue;
    seen['pub:' + pid] = true;
    var pub = await okbmFindPublicProfileById(pid);
    if (pub && pub.id) return pub;
  }
  return null;
}

async function okbmFindUserByEmail(email) {
  var normalized = window.okbmNormalizeEmail(email);
  if (!normalized) return null;
  return okbmFetchUserRow('email=eq.' + encodeURIComponent(normalized));
}

function okbmNormalizeNickname(nick) {
  return String(nick || '').replace(/\s+/g, ' ').trim();
}

function okbmRandomNickSuffix() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

async function okbmIsNicknameTaken(nickname, excludeUserId) {
  var nick = okbmNormalizeNickname(nickname);
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!nick) return false;
  if (!targetUrl || !targetKey) throw new Error('nickname lookup unavailable');
  var res = await fetch(targetUrl + '/rest/v1/rpc/okbm_is_nickname_taken', {
    method: 'POST',
    headers: okbmUgcRestHeaders(),
    body: JSON.stringify({
      p_nickname: nick,
      p_exclude_id: String(excludeUserId || '').trim() || null
    })
  });
  if (!res.ok) throw new Error('nickname lookup ' + res.status);
  var taken = await res.json();
  return taken === true;
}

async function okbmResolveUniqueNickname(desired, excludeUserId) {
  var base = okbmNormalizeNickname(desired) || '낭만백패커';
  try {
    if (!(await okbmIsNicknameTaken(base, excludeUserId))) return base;
    var n;
    for (n = 0; n < 10; n++) {
      var candidate = base + okbmRandomNickSuffix();
      if (!(await okbmIsNicknameTaken(candidate, excludeUserId))) return candidate;
    }
    return '낭만백패커' + okbmRandomNickSuffix();
  } catch (e) {
    console.warn('[okbmResolveUniqueNickname]', e);
    return base + okbmRandomNickSuffix();
  }
}

async function okbmPatchUserEmail(userId, email) {
  var normalized = window.okbmNormalizeEmail(email);
  if (!userId || !normalized) return false;
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;
  try {
    var emailHeaders = okbmWriteRestHeaders({ Prefer: 'return=minimal' });
    if (!emailHeaders) return false;
    var res = await fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH',
      headers: emailHeaders,
      body: JSON.stringify({ email: normalized, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function okbmIsCapacitorNative() {
  try {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
  } catch (e) {
    return false;
  }
}

function okbmNativeOAuthReturnUrl() {
  return 'https://oklionature.github.io/okbm/';
}

function okbmHandleNativeOAuthUrl(rawUrl, fromLaunch) {
  var url = String(rawUrl || '');
  if (url.indexOf('com.romanticroute.app://login-callback') !== 0) return;
  var parsed;
  try { parsed = new URL(url); } catch (e) { return; }
  var code = String(parsed.searchParams.get('code') || '').trim();
  var oauthError = String(parsed.searchParams.get('error') || '').trim();
  var Browser = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (Browser && typeof Browser.close === 'function') {
    Browser.close().catch(function() {});
  }
  if (!code || oauthError) {
    okbmMarkSocialButtonsBusy(false);
    if (oauthError && typeof showToast === 'function') showToast('로그인을 끝내지 못했습니다.', 'warn');
    return;
  }
  window.__okbmNativeOAuthCodes = window.__okbmNativeOAuthCodes || {};
  if (window.__okbmNativeOAuthCodes[code]) return;
  window.__okbmNativeOAuthCodes[code] = true;
  if (!window.supabaseClient || !window.supabaseClient.auth || typeof window.supabaseClient.auth.exchangeCodeForSession !== 'function') {
    okbmMarkSocialButtonsBusy(false);
    return;
  }
  window.__okbmOAuthBootstrapping = true;
  window.supabaseClient.auth.exchangeCodeForSession(code).then(function(res) {
    window.__okbmOAuthBootstrapping = false;
    if (res && res.error) throw res.error;
    var session = res && res.data ? res.data.session : null;
    if (session) {
      window.__okbmNativeOAuthExpecting = false;
      okbmWriteSessionCache(session);
      okbmConsumeSupabaseOAuthSession(session);
    } else {
      okbmMarkSocialButtonsBusy(false);
    }
  }).catch(function(err) {
    window.__okbmOAuthBootstrapping = false;
    okbmMarkSocialButtonsBusy(false);
    console.warn('[native oauth]', err);
    if (!fromLaunch && typeof showToast === 'function') showToast('로그인을 끝내지 못했습니다.', 'warn');
  });
}

function okbmBindNativeOAuthReturn() {
  if (!okbmIsCapacitorNative() || window.__okbmNativeOAuthBound) return;
  var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!App) return;
  window.__okbmNativeOAuthBound = true;
  if (typeof App.addListener === 'function') {
    App.addListener('appUrlOpen', function(event) {
      okbmHandleNativeOAuthUrl(event && event.url);
    });
  }
  if (typeof App.getLaunchUrl === 'function') {
    App.getLaunchUrl().then(function(res) {
      okbmHandleNativeOAuthUrl(res && res.url, true);
    }).catch(function() {});
  }
}

async function okbmOpenOAuthUrl(url) {
  if (!okbmIsCapacitorNative()) {
    window.location.assign(url);
    return;
  }
  var Browser = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (!Browser || typeof Browser.open !== 'function') {
    throw new Error('browser plugin missing');
  }
  if (!window.__okbmOAuthBrowserFinished && typeof Browser.addListener === 'function') {
    window.__okbmOAuthBrowserFinished = true;
    Browser.addListener('browserFinished', function() {
      if (window.__okbmOAuthBootstrapping) return;
      window.__okbmNativeOAuthExpecting = false;
      okbmMarkSocialButtonsBusy(false);
    });
  }
  window.__okbmNativeOAuthExpecting = true;
  await Browser.open({ url: url });
}

function okbmOAuthRedirectTo() {
  var protocol = window.location.protocol || 'http:';
  var hostname = window.location.hostname || '127.0.0.1';
  var port = String(window.location.port || '');
  if (!port && protocol === 'http:' && (hostname === '127.0.0.1' || hostname === 'localhost')) {
    port = '5500';
  }
  var host = port ? (hostname + ':' + port) : hostname;
  var path = String(window.location.pathname || '/').split('?')[0].split('#')[0] || '/';
  var redirect = protocol + '//' + host + path;
  try { sessionStorage.setItem('okbm_oauth_redirect', redirect); } catch (e) {}
  console.log('[OAuth redirectTo]', redirect);
  return redirect;
}

async function okbmStartSupabaseOAuth(provider, activeClass, busyMessage) {
  triggerHaptic(12);
  if (!window.supabaseClient || !window.supabaseClient.auth || typeof window.supabaseClient.auth.signInWithOAuth !== 'function') {
    okbmMarkSocialButtonsBusy(false);
    if (typeof showToast === 'function') showToast('로그인 서버에 연결할 수 없습니다.', 'warn');
    return;
  }
  var redirectTo = okbmIsCapacitorNative() ? okbmNativeOAuthReturnUrl() : okbmOAuthRedirectTo();
  if (okbmIsCapacitorNative()) {
    try { sessionStorage.setItem('okbm_oauth_redirect', redirectTo); } catch (e) {}
  }
  okbmBindNativeOAuthReturn();
  okbmMarkSocialButtonsBusy(true, busyMessage, activeClass);
  try {
    var res = await window.supabaseClient.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: true
      }
    });
    if (res && res.error) throw res.error;
    var url = res && res.data && res.data.url;
    if (!url) throw new Error('oauth url missing');
    try {
      var parsed = new URL(url);
      parsed.searchParams.set('redirect_to', redirectTo);
      url = parsed.toString();
    } catch (e) {}
    console.log('[OAuth authorize]', url);
    await okbmOpenOAuthUrl(url);
  } catch (err) {
    console.warn('[Supabase OAuth ' + provider + ']', err);
    okbmMarkSocialButtonsBusy(false);
    var missingBrowser = err && String(err.message || err).indexOf('browser plugin missing') !== -1;
    if (typeof showToast === 'function') {
      showToast(missingBrowser ? '앱을 업데이트한 뒤 다시 로그인해 주세요.' : '로그인을 시작하지 못했습니다.', 'warn');
    }
  }
}

function okbmShouldSkipOAuthBootstrap(session) {
  if (!session || !session.user) return true;
  var token = String(session.access_token || '').trim();
  var profile = safeGetJSON('user_profile', null);
  var planted = '';
  try {
    planted = String((session.user.app_metadata || {}).okbm_user_id || '').trim();
  } catch (e) {}
  if (planted && window.okbmHasSocialUserId(planted) && String((profile && profile.id) || '').trim() !== planted) {
    return false;
  }
  if (!profile || !profile.id) return false;
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) return false;
  var profileId = String((profile && profile.id) || '').trim();
  if (planted && profileId && planted === profileId) return true;
  // 구글/애플은 planted id가 없으므로 로그인 때 묶어 둔 auth uid로만 같은 계정을 판단한다.
  var boundUid = String((profile && profile.authUid) || '').trim();
  if (boundUid && boundUid === String(session.user.id || '').trim()) return true;
  void token;
  return false;
}

function okbmAuthUidFromToken(accessToken) {
  var cached = window.__okbmSessionCache && window.__okbmSessionCache.session;
  var tok = String(accessToken || '').trim();
  if (cached && cached.user && cached.user.id && (!tok || cached.access_token === tok)) {
    return String(cached.user.id);
  }
  var parts = tok.split('.');
  if (parts.length !== 3) return '';
  try {
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var claims = JSON.parse(atob(b64));
    return String((claims && claims.sub) || '');
  } catch (e) {
    return '';
  }
}

async function okbmConsumeSupabaseOAuthSession(session) {
  if (!session || !session.user) return;
  var user = session.user;
  var meta = user.app_metadata || {};
  var identities = Array.isArray(user.identities) ? user.identities : [];
  var provider = String(meta.provider || '').toLowerCase();
  if (!provider && identities.length) {
    provider = String(identities[0].provider || '').toLowerCase();
  }
  var planted = String(meta.okbm_user_id || '').trim();
  if (provider !== 'google' && provider !== 'apple') {
    if (!(planted && window.okbmHasSocialUserId(planted))) return;
  }
  if (okbmShouldSkipOAuthBootstrap(session)) return;
  if (window.__okbmOAuthBootstrapping) return;
  window.__okbmOAuthBootstrapping = true;

  var identity = null;
  for (var i = 0; i < identities.length; i++) {
    if (String(identities[i].provider || '').toLowerCase() === provider) {
      identity = identities[i];
      break;
    }
  }
  if (!identity && identities.length) identity = identities[0];
  var providerId = '';
  if (identity) {
    var identityData = identity.identity_data || {};
    providerId = String(identity.provider_id || identityData.sub || identityData.id || identity.id || '').trim();
  }
  var um = user.user_metadata || {};
  var nick = String(um.full_name || um.name || um.nickname || '').trim();
  var photo = String(um.avatar_url || um.picture || '').trim();
  var email = String(user.email || um.email || '').trim();
  planted = String(meta.okbm_user_id || planted || '').trim();
  try {
    if (planted && window.okbmHasSocialUserId(planted)) {
      var plantedProvider = planted.split('_')[0];
      await handleSocialLoginSuccess(plantedProvider, planted, email, nick, photo, session.access_token);
    } else {
      await handleSocialLoginSuccess(provider, providerId, email, nick, photo, session.access_token);
    }
  } catch (e) {
    window.__okbmOAuthBootstrapping = false;
    console.warn('[okbmConsumeSupabaseOAuthSession]', e);
    okbmMarkSocialButtonsBusy(false);
  }
}

function okbmInitSupabaseOAuthBridge() {
  var client = window.supabaseClient;
  if (!client || !client.auth) return;
  if (typeof client.auth.getSession === 'function') {
    client.auth.getSession().then(function(res) {
      var session = res && res.data ? res.data.session : null;
      okbmWriteSessionCache(session);
      okbmConsumeSupabaseOAuthSession(session);
    }).catch(function(e) {
      console.warn('[okbmInitSupabaseOAuthBridge getSession]', e);
    });
  }
  if (typeof client.auth.onAuthStateChange === 'function') {
    client.auth.onAuthStateChange(function(event, session) {
      okbmWriteSessionCache(session);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        okbmConsumeSupabaseOAuthSession(session);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('user_auth_token');
        localStorage.removeItem('user_profile');
        if (typeof authState !== 'undefined') {
          authState.isLoggedIn = false;
          authState.userProfile = null;
        }
      }
    });
  }
}

async function handleSocialLoginSuccess(provider, providerId, email, nickname, photoUrl, authToken) {
  provider = String(provider || '').trim().toLowerCase();
  providerId = String(providerId || '').trim();
  if (!provider || !providerId) {
    okbmMarkSocialButtonsBusy(false);
    if (typeof showToast === 'function') showToast('로그인 정보를 확인하지 못했습니다.', 'warn');
    return;
  }

  var normalizedEmail = window.okbmNormalizeEmail(email);
  var plantedId = okbmSessionPlantedUserId();
  var providerScopedId = (typeof window.okbmHasSocialUserId === 'function' && window.okbmHasSocialUserId(providerId))
    ? providerId
    : (providerId.indexOf(provider + '_') === 0 ? providerId : (provider + '_' + providerId));
  var plainProviderId = providerId.replace(new RegExp('^' + provider + '_'), '');
  var candidateIds = [];
  if (plantedId) candidateIds.push(plantedId);
  candidateIds.push(providerScopedId);
  if (plainProviderId && plainProviderId !== providerScopedId) {
    candidateIds.push(provider + '_' + plainProviderId);
    candidateIds.push(plainProviderId);
  }
  var existingUser = await okbmFindUserByIdAliases(candidateIds);

  var prevUserId = String(localStorage.getItem('okbm_user_id') || '').trim();
  var resolvedId = (existingUser && existingUser.id)
    ? String(existingUser.id).trim()
    : (plantedId || providerScopedId);
  var returningUser = !!(existingUser && existingUser.id);

  if (prevUserId && prevUserId !== resolvedId && prevUserId !== 'guest') {
    okbmPurgeLocalSessionData();
  }

  var existingProfile = safeGetJSON('user_profile_' + resolvedId, null);
  var customNick = String(localStorage.getItem('okbm_custom_nickname_' + resolvedId) || '').trim();
  var cloudNick = existingUser && existingUser.nickname ? String(existingUser.nickname).trim() : '';
  var incomingNick = okbmNormalizeNickname(nickname);
  var finalNick = returningUser
    ? (cloudNick || customNick || incomingNick || '낭만백패커')
    : (incomingNick || customNick || '낭만백패커');
  if (!returningUser) {
    finalNick = await okbmResolveUniqueNickname(finalNick, resolvedId);
  }
  var cloudPhoto = existingUser && (existingUser.hero_cover_url || existingUser.photo_url)
    ? String(existingUser.hero_cover_url || existingUser.photo_url).trim()
    : '';
  var photo = returningUser
    ? (cloudPhoto || String(photoUrl || '').trim())
    : (String(photoUrl || '').trim() || cloudPhoto || (existingProfile && (existingProfile.photoUrl || existingProfile.heroCoverUrl)) || '');

  var cloudSns = okbmReadSnsFromUserRow(existingUser);
  if (cloudSns.instagram) localStorage.setItem('okbm_user_instagram', cloudSns.instagram);
  if (cloudSns.youtube) localStorage.setItem('okbm_user_youtube', cloudSns.youtube);
  if (cloudSns.blog) localStorage.setItem('okbm_user_blog', cloudSns.blog);

  var profile = {
    id: resolvedId,
    nickname: finalNick,
    photoUrl: photo,
    heroCoverUrl: photo,
    instagram: cloudSns.instagram || localStorage.getItem('okbm_user_instagram') || '',
    youtube: cloudSns.youtube || localStorage.getItem('okbm_user_youtube') || '',
    blog: cloudSns.blog || localStorage.getItem('okbm_user_blog') || '',
    isMember: true,
    provider: provider,
    createdAt: (existingProfile && existingProfile.createdAt) ? existingProfile.createdAt : getFormattedNow(),
    lastNicknameChangedAt: existingProfile && existingProfile.lastNicknameChangedAt ? existingProfile.lastNicknameChangedAt : 0,
    loggedInAt: Date.now()
  };
  var boundAuthUid = okbmAuthUidFromToken(authToken);
  if (boundAuthUid) profile.authUid = boundAuthUid;

  // access token·이메일은 localStorage에 두지 않음. 세션은 supabaseClient만 사용.
  try { localStorage.removeItem('user_auth_token'); } catch (eTok) {}
  try { localStorage.removeItem('okbm_user_email'); } catch (eMail) {}
  localStorage.setItem('user_profile', JSON.stringify(profile));
  localStorage.setItem('user_profile_' + resolvedId, JSON.stringify(profile));
  localStorage.setItem('okbm_user_id', resolvedId);
  localStorage.setItem('okbm_user_nick', finalNick);
  localStorage.setItem('okbm_last_login_provider', provider);
  if (photo) localStorage.setItem('okbm_hero_cover_url', photo);

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = true;
    authState.userProfile = profile;
  }

  if (typeof closeLoginModal === 'function') closeLoginModal();
  if (typeof showToast === 'function') {
    showToast('[' + finalNick + ']님 환영합니다.', 'success', 1500);
  }

  try {
    if (returningUser) {
      var existingEmail = window.okbmNormalizeEmail(existingUser && existingUser.email || '');
      if (normalizedEmail && !existingEmail) {
        await okbmPatchUserEmail(resolvedId, normalizedEmail);
      }
    } else if (typeof window.saveUserToSupabase === 'function') {
      await window.saveUserToSupabase(profile);
    }
  } catch (e) {
    console.warn('[handleSocialLoginSuccess save]', e);
  }

  try {
    if (window.RomanticVault && typeof window.RomanticVault.hydrateFromServer === 'function') {
      await window.RomanticVault.hydrateFromServer(resolvedId);
    }
  } catch (e) {
    console.warn('[handleSocialLoginSuccess hydrate]', e);
  }
  try {
    if (typeof window.fetchUserFeedLikesFromServer === 'function') {
      await window.fetchUserFeedLikesFromServer();
    }
  } catch (e) {}
  try {
    if (typeof window.okbmSyncUgcSafetyFromServer === 'function') {
      await window.okbmSyncUgcSafetyFromServer();
    }
  } catch (e) {
    console.warn('[handleSocialLoginSuccess ugcSafety]', e);
  }
  try {
    if (typeof okbmPersistAdminFlag === 'function') {
      okbmPersistAdminFlag(!!(existingUser && existingUser.is_admin === true));
    } else {
      window.__okbmIsAdmin = !!(existingUser && existingUser.is_admin === true);
    }
    if (typeof window.okbmRefreshAdminFlagFromServer === 'function') {
      await window.okbmRefreshAdminFlagFromServer();
    }
  } catch (e) {
    window.__okbmIsAdmin = false;
  }

  if (typeof trackDailyVisit === 'function') trackDailyVisit(true);

  try {
    sessionStorage.setItem('splash_shown', 'true');
    sessionStorage.setItem('okbm_skip_splash_once', '1');
    localStorage.removeItem('okbm_splash_shown');
  } catch (e) {}
  window.__okbmSplashAlreadyShown = true;

  setTimeout(function() { window.location.reload(); }, 200);
}
window.handleSocialLoginSuccess = handleSocialLoginSuccess;

function loginWithKakao(options) {
  triggerHaptic(12);
  var isLink = !!(options && options.link);
  if (isLink && typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('계정 연결은 로그인 후 설정에서 진행해주세요.', 'warn');
    return;
  }

  var startLogin = function() {
    if (typeof Kakao === 'undefined') {
      showToast('카카오 SDK를 불러오지 못했습니다.', 'warn');
      return;
    }
    var appKey = window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1";
    if (!Kakao.isInitialized()) {
      Kakao.init(appKey);
    }

    okbmMarkSocialButtonsBusy(true, isLink ? '카카오 계정 연결 중...' : '카카오 로그인 인증 중...', 'btn-social-kakao');

    var loginMethod = (Kakao.Auth && typeof Kakao.Auth.loginForm === 'function') ? Kakao.Auth.loginForm : Kakao.Auth.login;
    loginMethod({
      scope: 'profile_nickname,account_email,profile_image',
      throughTalk: false,
      success: function(authObj) {
        var kakaoToken = authObj && authObj.access_token;
        if (!kakaoToken) {
          okbmMarkSocialButtonsBusy(false);
          if (typeof showToast === 'function') showToast('카카오 토큰을 받지 못했습니다.', 'warn');
          return;
        }
        window.okbmInvokeFunction('auth-kakao', {
          access_token: kakaoToken,
          mode: isLink ? 'link' : 'login'
        }).then(function(issued) {
          if (!issued || !issued.access_token || !issued.refresh_token) {
            throw new Error('supabase session missing');
          }
          return window.okbmSetSupabaseSession(issued.access_token, issued.refresh_token).then(function() {
            if (isLink) {
              okbmMarkSocialButtonsBusy(false);
              if (typeof showToast === 'function') showToast('카카오 계정을 연결했습니다.', 'success', 1800);
              return;
            }
            var profile = issued.profile || {};
            var issuedId = String(profile.id || '').trim();
            var providerId = (typeof window.okbmHasSocialUserId === 'function' && window.okbmHasSocialUserId(issuedId))
              ? issuedId
              : issuedId.replace(/^kakao_/, '');
            return handleSocialLoginSuccess(
              (issuedId.indexOf('kakao_') === 0 || !issuedId) ? 'kakao' : issuedId.split('_')[0],
              providerId,
              profile.email,
              profile.nickname,
              profile.photo,
              issued.access_token
            );
          });
        }).catch(function(err) {
          console.warn('[Kakao auth-kakao]', err);
          okbmMarkSocialButtonsBusy(false);
          var msg = (err && err.body && err.body.message) || (isLink ? '카카오 계정 연결에 실패했습니다.' : '카카오 로그인 세션을 만들지 못했습니다.');
          if (typeof showToast === 'function') showToast(msg, 'warn');
        });
      },
      fail: function(err) {
        okbmMarkSocialButtonsBusy(false);
        console.warn('[Kakao Auth Fail]', err);
        if (typeof showToast === 'function') showToast(isLink ? '카카오 연결이 취소되었습니다.' : '로그인이 취소되었습니다.', 'warn');
      }
    });
  };

  if (typeof window.okbmEnsureKakaoSdk === 'function') {
    window.okbmEnsureKakaoSdk().then(startLogin).catch(function() {
      if (typeof showToast === 'function') showToast('카카오 SDK를 불러오지 못했습니다.', 'warn');
    });
    return;
  }
  startLogin();
}
window.loginWithKakao = loginWithKakao;
window.okbmLinkKakaoAccount = function() {
  loginWithKakao({ link: true });
};

async function loginWithApple() {
  await okbmStartSupabaseOAuth('apple', 'btn-social-apple', 'Apple 로그인 중...');
}
window.loginWithApple = loginWithApple;

function okbmNaverRedirectUri() {
  var origin = String(window.location.origin || '').replace(/\/+$/, '');
  var path = String(window.location.pathname || '/').split('?')[0].split('#')[0];
  if (!path) path = '/';
  return origin + path;
}

function okbmRandomOAuthState() {
  var bytes = new Uint8Array(16);
  if (window.crypto && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  var hex = '';
  for (var n = 0; n < bytes.length; n++) hex += ('0' + bytes[n].toString(16)).slice(-2);
  return hex;
}

function okbmFetchNaverProfileJsonp(accessToken) {
  return new Promise(function(resolve, reject) {
    var token = String(accessToken || '').trim();
    if (!token) {
      reject(new Error('naver token missing'));
      return;
    }
    var cbName = 'okbmNaverProfileCb_' + Date.now();
    var script = document.createElement('script');
    var timer = setTimeout(function() {
      cleanup();
      reject(new Error('naver jsonp timeout'));
    }, 8000);
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
    }
    window[cbName] = function(result) {
      cleanup();
      try {
        var row = (result && result.response) ? result.response : result;
        if (!row || !row.id) {
          reject(new Error('naver jsonp empty'));
          return;
        }
        resolve({
          id: String(row.id).trim(),
          email: String(row.email || '').trim(),
          nickname: String(row.nickname || row.name || '').trim(),
          photo: String(row.profile_image || '').trim()
        });
      } catch (err) {
        reject(err);
      }
    };
    script.src = 'https://openapi.naver.com/v1/nid/getUserProfile.json?response_type=json'
      + '&access_token=' + encodeURIComponent(token)
      + '&oauth_callback=' + encodeURIComponent(cbName);
    script.onerror = function() {
      cleanup();
      reject(new Error('naver jsonp script error'));
    };
    document.head.appendChild(script);
  });
}

async function okbmFetchNaverProfile(accessToken) {
  var token = String(accessToken || '').trim();
  if (!token) throw new Error('naver token missing');

  var parseBody = function(data) {
    var row = (data && data.response) ? data.response : data;
    if (!row || !row.id) throw new Error('naver profile missing id');
    return {
      id: String(row.id).trim(),
      email: String(row.email || '').trim(),
      nickname: String(row.nickname || row.name || '').trim(),
      photo: String(row.profile_image || '').trim()
    };
  };

  try {
    return await okbmFetchNaverProfileJsonp(token);
  } catch (jsonpErr) {
    console.warn('[Naver jsonp]', jsonpErr);
  }

  var nativeHttp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Http;
  if (nativeHttp && typeof nativeHttp.request === 'function') {
    var nativeRes = await nativeHttp.request({
      url: 'https://openapi.naver.com/v1/nid/me',
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    var nativeData = nativeRes && nativeRes.data;
    if (typeof nativeData === 'string') nativeData = JSON.parse(nativeData);
    return parseBody(nativeData);
  }

  var proxyUrl = String(window.OKBM_NAVER_ME_PROXY || '').trim();
  var endpoints = ['https://openapi.naver.com/v1/nid/me'];
  if (proxyUrl) endpoints.push(proxyUrl);

  var lastErr = null;
  for (var e = 0; e < endpoints.length; e++) {
    try {
      var res = await fetch(endpoints[e], {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('naver me ' + res.status);
      return parseBody(await res.json());
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('naver profile fetch failed');
}

async function okbmConsumeNaverOAuthCallback() {
  var code = '';
  var state = '';
  var redirectUri = '';
  try { code = sessionStorage.getItem('okbm_naver_oauth_code') || ''; } catch (e) {}
  try { state = sessionStorage.getItem('okbm_naver_oauth_state') || ''; } catch (e) {}
  try { redirectUri = sessionStorage.getItem('okbm_naver_redirect_uri') || ''; } catch (e) {}
  if (!code) return false;
  try { sessionStorage.removeItem('okbm_naver_oauth_code'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_oauth_token'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_oauth_state'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_redirect_uri'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_profile'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_client_id'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_return'); } catch (e) {}

  try {
    var isLink = false;
    try { isLink = sessionStorage.getItem('okbm_social_link_mode') === '1'; } catch (e) {}
    try { sessionStorage.removeItem('okbm_social_link_mode'); } catch (e) {}
    okbmMarkSocialButtonsBusy(true, isLink ? '네이버 계정 연결 중...' : '네이버 로그인 인증 중...', 'btn-social-naver');
    var issued = await window.okbmInvokeFunction('auth-naver', {
      code: code,
      state: state,
      redirect_uri: redirectUri,
      mode: isLink ? 'link' : 'login'
    });
    if (!issued || !issued.access_token || !issued.refresh_token) {
      throw new Error('supabase session missing');
    }
    await window.okbmSetSupabaseSession(issued.access_token, issued.refresh_token);
    if (isLink) {
      okbmMarkSocialButtonsBusy(false);
      if (typeof showToast === 'function') showToast('네이버 계정을 연결했습니다.', 'success', 1800);
      return true;
    }
    var profile = issued.profile || {};
    var issuedId = String(profile.id || '').trim();
    var providerId = (typeof window.okbmHasSocialUserId === 'function' && window.okbmHasSocialUserId(issuedId))
      ? issuedId
      : issuedId.replace(/^naver_/, '');
    await handleSocialLoginSuccess(
      (issuedId.indexOf('naver_') === 0 || !issuedId) ? 'naver' : issuedId.split('_')[0],
      providerId,
      profile.email,
      profile.nickname,
      profile.photo,
      issued.access_token
    );
    return true;
  } catch (err) {
    console.warn('[Naver auth-naver]', err);
    okbmMarkSocialButtonsBusy(false);
    var msg = (err && err.body && err.body.message) || '네이버 로그인 세션을 만들지 못했습니다.';
    if (typeof showToast === 'function') showToast(msg, 'warn');
    return true;
  }
}

function loginWithNaver(options) {
  triggerHaptic(12);
  var isLink = !!(options && options.link);
  if (isLink && typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('계정 연결은 로그인 후 설정에서 진행해주세요.', 'warn');
    return;
  }
  var state = okbmRandomOAuthState();
  var clientId = NAVER_CLIENT_ID;
  var basePath = window.location.pathname.indexOf('/okbm') !== -1 ? '/okbm' : '';
  var cleanRedirect = window.location.origin + basePath + '/naver-callback.html';
  sessionStorage.setItem('okbm_naver_oauth_state', state);
  sessionStorage.setItem('okbm_naver_client_id', clientId);
  sessionStorage.setItem('okbm_naver_return', window.location.pathname + window.location.search);
  sessionStorage.setItem('okbm_naver_redirect_uri', cleanRedirect);
  try { sessionStorage.removeItem('okbm_naver_oauth_code'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_oauth_token'); } catch (e) {}
  try { sessionStorage.setItem('okbm_social_link_mode', isLink ? '1' : ''); } catch (e) {}

  var naverAuthUrl = 'https://nid.naver.com/oauth2.0/authorize?response_type=code'
    + '&client_id=' + encodeURIComponent(clientId)
    + '&redirect_uri=' + encodeURIComponent(cleanRedirect)
    + '&state=' + encodeURIComponent(state);
  okbmMarkSocialButtonsBusy(true, isLink ? '네이버 계정 연결 중...' : '네이버 로그인 중...', 'btn-social-naver');
  console.log('[Naver Login URL]', naverAuthUrl);
  window.location.href = naverAuthUrl;
}
window.loginWithNaver = loginWithNaver;
window.okbmLinkNaverAccount = function() {
  loginWithNaver({ link: true });
};

async function loginWithGoogle() {
  await okbmStartSupabaseOAuth('google', 'btn-social-google', 'Google 로그인 중...');
}
window.loginWithGoogle = loginWithGoogle;

okbmBindNativeOAuthReturn();
okbmConsumeNaverOAuthCallback().then(function(consumedNaver) {
  if (!consumedNaver) okbmInitSupabaseOAuthBridge();
}).catch(function() {
  okbmInitSupabaseOAuthBridge();
});

window.shareFeedToCommunity = async function(feedRecord) {
  if (!feedRecord) return [];

  var userId = okbmGetCurrentUserId();
  if (!userId) {
    okbmRequireCurrentUserId();
    return [];
  }
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var nickname = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
  var userInsta = (feedRecord.instagram || localStorage.getItem('okbm_user_instagram') || '').replace(/[@\s]/g, '').trim();

  var targetSupabaseUrl = window.SUPABASE_URL || SUPABASE_URL;
  if (!targetSupabaseUrl) return [];

  var rawPhotos = Array.isArray(feedRecord.photos) ? feedRecord.photos.slice() : [];
  if (rawPhotos.length === 0) {
    return [];
  }

  var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';
  var finalCdnPhotos = [];

  var compressImageBase64 = function(base64Str, maxWidth, quality) {
    return new Promise(function(resolve) {
      if (!base64Str || typeof base64Str !== 'string') {
        resolve('');
        return;
      }
      var img = new Image();
      var timeout = setTimeout(function() {
        resolve(base64Str);
      }, 5000);
      img.onload = function() {
        clearTimeout(timeout);
        try {
          var w = img.width;
          var h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          resolve(base64Str);
        }
      };
      img.onerror = function() {
        clearTimeout(timeout);
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  for (var i = 0; i < rawPhotos.length; i++) {
    var pItem = rawPhotos[i];
    if (typeof pItem === 'string' && pItem.startsWith('data:')) {
      var safeFileName = 'photo_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 7) + '.jpg';
      try {
        var compressedBase64 = await compressImageBase64(pItem, 1200, 0.82);
        if (!compressedBase64) continue;

        var base64Data = compressedBase64.includes(',') ? compressedBase64.split(',')[1] : compressedBase64;
        var byteCharacters = atob(base64Data);
        var byteNumbers = new Array(byteCharacters.length);
        for (var b = 0; b < byteCharacters.length; b++) {
          byteNumbers[b] = byteCharacters.charCodeAt(b);
        }
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], { type: 'image/jpeg' });

        var cfRes = await fetch(CF_WORKER_UPLOAD_URL + '?file=' + encodeURIComponent(safeFileName), {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg' },
          body: blob
        });

        if (cfRes.ok) {
          var cfData = await cfRes.json();
          if (cfData && cfData.status === 'SUCCESS' && cfData.url && cfData.url.startsWith('https://')) {
            finalCdnPhotos.push(cfData.url);
          }
        }
      } catch (cfErr) {
        console.warn('[RomanticSync] 사진 업로드 실패:', cfErr);
      }
    } else if (typeof pItem === 'string' && (pItem.startsWith('https://') || pItem.startsWith('http://'))) {
      finalCdnPhotos.push(pItem);
    }
  }

  if (finalCdnPhotos.length === 0) {
    return [];
  }

  feedRecord.photos = finalCdnPhotos;

  // [단 1개의 통로로만 서버 쓰기] shareFeedToCommunity는 사진을 CDN에 업로드하고
  // 업로드된 URL 배열을 반환하는 역할까지만 담당합니다. feeds 테이블에 대한 실제
  // DB 쓰기는 romantic-history.js의 savePackingHistoryRecord → submitFeedPayload
  // 단일 경로에서만 수행하여, 동일 레코드에 대해 서로 다른 페이로드가 경합하며
  // 서버 데이터를 덮어쓰는 경쟁 상태(race condition)를 제거합니다.
  return finalCdnPhotos;
};

window.deleteFeedFromCommunity = async function(feedId) {
  var sId = String(feedId || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !sId) return { ok: false, error: 'MISSING_CONFIG' };

  // [삭제 검증] return=representation으로 실제 삭제된 행을 확인합니다.
  try {
    var res = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId), {
      method: 'DELETE',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey),
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    if (!res.ok) {
      console.error('[RomanticSync] deleteFeedFromCommunity 실패 status=' + res.status);
      return { ok: false, status: res.status };
    }

    var deletedRows = [];
    try { deletedRows = await res.json(); } catch (parseErr) {}

    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      console.error('[RomanticSync] deleteFeedFromCommunity: 서버에서 0건 삭제됨:', sId);
      return { ok: false, error: 'ZERO_ROWS_DELETED' };
    }

    return { ok: true, data: deletedRows };
  } catch (err) {
    console.error('[RomanticSync] deleteFeedFromCommunity 네트워크 예외:', err);
    return { ok: false, error: String(err) };
  }
};

window.saveProposalToSupabase = async function(proposalData, isCorrection) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !proposalData) return false;

  var resolvedUserId = okbmRequireCurrentUserId();
  if (!resolvedUserId) return false;
  var prof = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;

  var tableName = isCorrection ? 'spot_corrections' : 'proposals';
  var authorNick = String(proposalData.author || proposalData.nickname || (prof && prof.nickname) || localStorage.getItem('okbm_user_nick') || '낭만백패커').trim() || '낭만백패커';

  var payload = {
    id: String(proposalData.id || ('prop_' + Date.now())),
    spot_main: String(proposalData.spot_main || proposalData.name || ''),
    spot_sub: String(proposalData.spot_sub || ''),
    fullname: String(proposalData.fullname || proposalData.fullName || ''),
    lat: parseFloat(proposalData.lat) || 0,
    lng: parseFloat(proposalData.lng) || 0,
    elevation: String(proposalData.elevation || ''),
    trailhead_name: String(proposalData.trailhead_name || proposalData.entry || ''),
    trailhead_addr: String(proposalData.trailhead_addr || ''),
    desc_summary: String(proposalData.desc_summary || proposalData.memo || ''),
    youtubeurls: String(proposalData.youtubeurls || proposalData.youtubeUrls || ''),
    blogurl: String(proposalData.blogurl || proposalData.blogUrl || ''),
    authorsnsurl: String(proposalData.authorsnsurl || proposalData.authorSnsUrl || ''),
    coursetype: String(proposalData.coursetype || proposalData.courseType || ''),
    terrain: String(proposalData.terrain || ''),
    difficulty: String(proposalData.difficulty || ''),
    distance_km: String(proposalData.distance_km || ''),
    status: String(proposalData.status || 'pending'),
    user_id: resolvedUserId,
    author: authorNick
  };
  if (isCorrection) {
    payload.orig_spot_id = String(proposalData.orig_spot_id || proposalData.origSpotId || '');
    payload.correction_reason = String(proposalData.correctionReason || proposalData.correction_reason || '');
  }

  try {
    var res = await fetch(targetUrl + '/rest/v1/' + tableName, {
      method: 'POST',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey),
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

window.fetchAdminSpotInbox = async function() {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return [];
  var tok = (typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || '';
  var headers = {
    'apikey': targetKey,
    'Authorization': 'Bearer ' + (tok || targetKey),
    'Content-Type': 'application/json'
  };
  try {
    var results = await Promise.all([
      fetch(targetUrl + '/rest/v1/proposals?select=*&order=created_at.desc', { headers: headers }),
      fetch(targetUrl + '/rest/v1/spot_corrections?select=*&order=created_at.desc', { headers: headers })
    ]);
    var propsRes = results[0];
    var corrRes = results[1];
    if (!propsRes.ok && !corrRes.ok) throw new Error('inbox fetch failed');
    var props = propsRes.ok ? await propsRes.json() : [];
    var corrs = corrRes.ok ? await corrRes.json() : [];
    if (!Array.isArray(props)) props = [];
    if (!Array.isArray(corrs)) corrs = [];
    var normalize = function(item, isCorr) {
      if (!item) return null;
      var clone = Object.assign({}, item);
      clone.type = isCorr ? 'correction' : 'proposal';
      clone.isCorrection = isCorr;
      clone.fullName = item.fullname || item.fullName || '';
      clone.youtubeUrls = item.youtubeurls || item.youtubeUrls || '';
      clone.blogUrl = item.blogurl || item.blogUrl || '';
      clone.authorSnsUrl = item.authorsnsurl || item.authorSnsUrl || '';
      clone.courseType = item.coursetype || item.courseType || '';
      clone.origSpotId = item.orig_spot_id || item.origSpotId || '';
      clone.correctionReason = item.correction_reason || item.correctionReason || '';
      clone.author = item.author || item.nickname || '';
      clone.nickname = clone.author;
      clone.userId = item.user_id || item.userId || '';
      clone.user_id = clone.userId;
      var lat = parseFloat((item.lat != null && item.lat !== '') ? item.lat : item.campsite_lat);
      var lng = parseFloat((item.lng != null && item.lng !== '') ? item.lng : item.campsite_lng);
      if (isFinite(lat) && lat) clone.lat = lat;
      if (isFinite(lng) && lng) clone.lng = lng;
      return clone;
    };
    var items = props.map(function(p) { return normalize(p, false); })
      .concat(corrs.map(function(c) { return normalize(c, true); }))
      .filter(Boolean);
    items.sort(function(a, b) {
      var at = Date.parse(a && a.created_at) || 0;
      var bt = Date.parse(b && b.created_at) || 0;
      return bt - at;
    });

    var missingIds = [];
    items.forEach(function(it) {
      var uid = String((it && it.user_id) || '').trim();
      if (uid && !String((it && it.author) || '').trim() && missingIds.indexOf(uid) === -1) missingIds.push(uid);
    });
    if (missingIds.length) {
      try {
        var uRows = (typeof window.okbmFetchPublicProfiles === 'function')
          ? await window.okbmFetchPublicProfiles(missingIds)
          : [];
        var nickMap = {};
        (Array.isArray(uRows) ? uRows : []).forEach(function(u) {
          if (u && u.id) nickMap[String(u.id)] = String(u.nickname || '').trim();
        });
        items.forEach(function(it) {
          if (!it || String(it.author || '').trim()) return;
          var looked = nickMap[String(it.user_id || '')] || '';
          if (looked) {
            it.author = looked;
            it.nickname = looked;
          }
        });
      } catch (hydrateErr) {
        console.warn('[romantic-sync.js:fetchAdminSpotInbox hydrate]', hydrateErr);
      }
    }
    return items;
  } catch (e) {
    console.warn('[romantic-sync.js:fetchAdminSpotInbox]', e);
    throw e;
  }
};

window.updateAdminSpotInboxStatus = async function(propId, isCorrection, status, extra) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !propId) return false;
  var tableName = isCorrection ? 'spot_corrections' : 'proposals';
  var payload = { status: String(status || 'pending') };
  if (extra && extra.approved_spot_id) payload.approved_spot_id = String(extra.approved_spot_id);
  try {
    var statusHeaders = okbmWriteRestHeaders({ Prefer: 'return=minimal' });
    if (!statusHeaders) return false;
    var res = await fetch(targetUrl + '/rest/v1/' + tableName + '?id=eq.' + encodeURIComponent(String(propId)), {
      method: 'PATCH',
      headers: statusHeaders,
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

window.deleteProposalFromSupabase = async function(propId, isCorrection) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !propId) return false;

  var tableName = isCorrection ? 'spot_corrections' : 'proposals';
  try {
    var delHeaders = okbmWriteRestHeaders();
    if (!delHeaders) return false;
    var res = await fetch(targetUrl + '/rest/v1/' + tableName + '?id=eq.' + encodeURIComponent(String(propId)), {
      method: 'DELETE',
      headers: delHeaders
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

window.fetchMyProposalsFromSupabase = async function(userId) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !userId) return [];

  var headers = {
    'apikey': targetKey,
    'Authorization': 'Bearer ' + ((typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || targetKey),
    'Content-Type': 'application/json'
  };

  try {
    var reqProps = fetch(targetUrl + '/rest/v1/proposals?user_id=eq.' + encodeURIComponent(userId) + '&select=*', { headers: headers })
      .then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });
    var reqCorrs = fetch(targetUrl + '/rest/v1/spot_corrections?user_id=eq.' + encodeURIComponent(userId) + '&select=*', { headers: headers })
      .then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; });

    var results = await Promise.all([reqProps, reqCorrs]);
    var props = Array.isArray(results[0]) ? results[0] : [];
    var corrs = Array.isArray(results[1]) ? results[1] : [];

    var normalizeProp = function(item, isCorr) {
      if (!item) return null;
      var clone = Object.assign({}, item);
      clone.is_correction = isCorr;
      clone.isCorrection = isCorr;
      clone.type = isCorr ? 'correction' : 'proposal';
      clone.fullName = item.fullname || item.fullName || '';
      clone.youtubeUrls = item.youtubeurls || item.youtubeUrls || '';
      clone.blogUrl = item.blogurl || item.blogUrl || '';
      clone.authorSnsUrl = item.authorsnsurl || item.authorSnsUrl || '';
      clone.courseType = item.coursetype || item.courseType || '';
      clone.approved_spot_id = item.approved_spot_id || item.approvedSpotId || '';
      clone.origSpotId = item.orig_spot_id || item.origSpotId || '';
      clone.status = item.status || '';
      return clone;
    };

    return [
      ...props.map(function(p) { return normalizeProp(p, false); }),
      ...corrs.map(function(c) { return normalizeProp(c, true); })
    ].filter(Boolean);
  } catch (e) { console.warn('[romantic-sync.js:fetchMyProposalsFromSupabase]', e); }
  return [];
};

window.notifyProposalDecision = async function(item, status, approvedSpotId) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  if (!targetUrl || !item) return false;
  var relatedId = String(item.id || '').trim();
  if (!relatedId) return false;
  var kindStatus = String(status || '');
  var accepted = kindStatus.indexOf('반영완료') !== -1 || kindStatus.indexOf('채택') !== -1 || kindStatus.indexOf('승인') !== -1;
  var rejected = kindStatus.indexOf('반려') !== -1;
  if (!accepted && !rejected) return false;
  var isCorr = Boolean(item.type === 'correction' || item.isCorrection || item.is_correction);
  try {
    var notifyHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
    if (!notifyHeaders) return false;
    var res = await fetch(targetUrl + '/rest/v1/rpc/okbm_notify_proposal_decision', {
      method: 'POST',
      headers: notifyHeaders,
      body: JSON.stringify({
        p_item_id: relatedId,
        p_is_correction: isCorr,
        p_status: kindStatus,
        p_approved_spot_id: String(approvedSpotId || '').trim()
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('[romantic-sync.js:notifyProposalDecision]', e);
    return false;
  }
};

window.mergeMyProposalsFromServer = function(serverList) {
  var local = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  if (!Array.isArray(local)) local = [];
  var byId = {};
  local.forEach(function(p) {
    if (p && p.id) byId[String(p.id)] = p;
  });
  (Array.isArray(serverList) ? serverList : []).forEach(function(s) {
    if (!s || !s.id) return;
    var id = String(s.id);
    var prev = byId[id] || {};
    byId[id] = Object.assign({}, prev, s, {
      status: s.status || prev.status,
      approved_spot_id: s.approved_spot_id || prev.approved_spot_id || '',
      user_id: s.user_id || prev.user_id || '',
      userId: s.user_id || s.userId || prev.userId || ''
    });
  });
  var merged = Object.keys(byId).map(function(k) { return byId[k]; });
  merged.sort(function(a, b) {
    var at = String((a && (a.created_at || a.date)) || '');
    var bt = String((b && (b.created_at || b.date)) || '');
    return bt.localeCompare(at);
  });
  if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
    window.RomanticVault.write('okbm_my_proposals', merged, false);
  }
  try { localStorage.setItem('okbm_my_proposals', JSON.stringify(merged)); } catch (e) {}
  var hStat = document.getElementById('reportHeaderMyPropsStat');
  if (hStat) hStat.innerText = merged.length + '곳';
  return merged;
};

window.refreshProposalInboxForUser = async function() {
  var userId = okbmGetCurrentUserId();
  if (!userId || typeof window.fetchMyProposalsFromSupabase !== 'function') return [];
  var server = await window.fetchMyProposalsFromSupabase(userId);
  return window.mergeMyProposalsFromServer(server);
};

function okbmPaintCountBadgeEl(el, count) {
  if (!el) return;
  var n = Number(count || 0);
  if (n <= 0) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'flex';
  el.textContent = n > 9 ? '9+' : String(n);
}

window.okbmPaintNotifBadge = function(count) {
  var notifOnly = Number(window.__okbmUnreadNotifOnly || 0);
  var noteOnly = Number(window.__okbmUnreadNoteCount || 0);
  var unread = (typeof count === 'number') ? count : (notifOnly + noteOnly);
  window.__okbmUnreadNotifCount = unread;
  var dock = document.getElementById('romanticMasterBottomDock');
  if (dock) {
    var btn = dock.querySelector('button[title="마이리포트"]');
    if (btn) {
      var badge = btn.querySelector('.okbm-notif-badge');
      if (unread <= 0) {
        if (badge) badge.remove();
      } else {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'okbm-notif-badge';
          badge.style.cssText = 'position:absolute; top:4px; right:calc(50% - 18px); min-width:14px; height:14px; padding:0 4px; border-radius:8px; background:#f43f5e; color:#fff; font-size:0.52rem; font-weight:900; display:flex; align-items:center; justify-content:center; line-height:14px;';
          btn.style.position = 'relative';
          btn.appendChild(badge);
        }
        badge.textContent = unread > 9 ? '9+' : String(unread);
      }
    }
  }
  okbmPaintCountBadgeEl(document.getElementById('reportNotifCountBadge'), notifOnly);
  okbmPaintCountBadgeEl(document.getElementById('reportNoteCountBadge'), noteOnly);
};

window.fetchUserNotifications = async function() {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  var userId = okbmGetCurrentUserId();
  if (!targetUrl || !targetKey || !userId) return [];
  try {
    var res = await fetch(targetUrl + '/rest/v1/user_notifications?user_id=eq.' + encodeURIComponent(userId) + '&select=*&order=created_at.desc&limit=50', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) return [];
    var rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
};

window.markUserNotificationsRead = async function(ids) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  var list = (ids || []).map(function(id) { return String(id || '').trim(); }).filter(Boolean);
  if (!targetUrl || !targetKey || !list.length) return false;
  try {
    var inList = list.map(function(id) { return '"' + id.replace(/"/g, '') + '"'; }).join(',');
    var readHeaders = okbmWriteRestHeaders({ Prefer: 'return=minimal' });
    if (!readHeaders) return false;
    var res = await fetch(targetUrl + '/rest/v1/user_notifications?id=in.(' + inList + ')', {
      method: 'PATCH',
      headers: readHeaders,
      body: JSON.stringify({ is_read: true })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

function okbmIsNoteNotification(row) {
  if (!row) return true;
  var kind = String(row.kind || '').toLowerCase();
  var id = String(row.id || '');
  var title = String(row.title || '');
  if (kind === 'note' || kind === 'direct' || kind === 'dm') return true;
  if (id.indexOf('pn_note_') === 0) return true;
  if (title.indexOf('쪽지') !== -1) return true;
  return false;
}

window.pollUserNotifications = async function(silent) {
  var rows = await window.fetchUserNotifications();
  rows = (rows || []).filter(function(r) {
    if (!r) return false;
    if (okbmIsNoteNotification(r)) return false;
    return true;
  });
  window.__okbmUserNotifications = rows;
  var unread = rows.filter(function(r) { return r && !r.is_read; });
  window.__okbmUnreadNotifOnly = unread.length;
  if (!silent && typeof window.okbmRefreshNoteBadge === 'function') {
    await window.okbmRefreshNoteBadge();
  } else if (typeof window.okbmApplyUnreadBadge === 'function') {
    window.okbmApplyUnreadBadge();
  } else {
    var totalUnread = unread.length + Number(window.__okbmUnreadNoteCount || 0);
    window.__okbmUnreadNotifCount = totalUnread;
    window.okbmPaintNotifBadge(totalUnread);
  }
  if (!silent && unread.length) {
    var newest = unread[0];
    var seenKey = 'okbm_seen_notif_' + String(newest.id || '');
    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      if (typeof showToast === 'function' && newest.title) {
        showToast(newest.title, unread.length > 1 ? 'info' : 'success', 2800);
      }
    }
  }
  return rows;
};

function okbmNoteMyId() {
  return (typeof okbmGetCurrentUserId === 'function') ? okbmGetCurrentUserId() : '';
}

function okbmNoteMyNick() {
  var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var custom = localStorage.getItem('okbm_user_nick') || (profile && profile.id ? localStorage.getItem('okbm_custom_nickname_' + profile.id) : '') || '';
  return String(custom || (profile && profile.nickname) || '낭만백패커').trim();
}

function okbmNoteThreadId(a, b) {
  var x = String(a || '').trim();
  var y = String(b || '').trim();
  if (!x || !y) return '';
  return x < y ? (x + '__' + y) : (y + '__' + x);
}

function okbmNoteIdsMatch(a, b) {
  var x = String(a || '').trim();
  var y = String(b || '').trim();
  if (!x || !y) return false;
  if (x === y) return true;
  if (typeof okbmNormalizeUgcUserId === 'function') {
    var nx = okbmNormalizeUgcUserId(x);
    var ny = okbmNormalizeUgcUserId(y);
    return Boolean(nx && ny && nx === ny);
  }
  return false;
}

function okbmIsNoteHiddenUser(userId) {
  var target = String(userId || '').trim();
  if (!target) return true;
  if (typeof window.isUserBlocked === 'function' && window.isUserBlocked(target)) return true;
  var blockedBy = window.__okbmBlockedByIds || [];
  for (var i = 0; i < blockedBy.length; i++) {
    if (okbmNoteIdsMatch(blockedBy[i], target)) return true;
  }
  return false;
}

function okbmNoteBlockedToast(reason) {
  var msg = '쪽지를 주고받을 수 없습니다.';
  if (reason === 'you') msg = '차단한 사용자에게는 쪽지를 보낼 수 없습니다.';
  else if (reason === 'them') msg = '상대가 차단한 사용자와는 쪽지를 주고받을 수 없습니다.';
  else if (reason === 'self') msg = '나에게는 쪽지를 보낼 수 없습니다.';
  if (typeof showToast === 'function') showToast(msg, 'warn', 2200);
}

function okbmStopNoteThreadPoll() {
  if (window.__okbmNotePollTimer) {
    clearInterval(window.__okbmNotePollTimer);
    window.__okbmNotePollTimer = null;
  }
}

window.okbmEnsureSupabaseClient = function() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    var loopback = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: !window.__okbmNativeOAuthBounce,
        persistSession: true,
        flowType: (window.isSecureContext || loopback) ? 'pkce' : 'implicit'
      }
    });
  }
  return window.supabaseClient || null;
};

window.okbmNoteRealtimeRemove = function(channel) {
  if (!channel) return;
  try {
    var client = window.okbmEnsureSupabaseClient();
    if (client && typeof client.removeChannel === 'function') client.removeChannel(channel);
    else if (typeof channel.unsubscribe === 'function') channel.unsubscribe();
  } catch (e) {}
};

window.okbmNoteRealtimeStop = function(kind) {
  kind = kind || 'all';
  if (kind === 'thread' || kind === 'all') {
    window.okbmNoteRealtimeRemove(window.__okbmNoteRtThread);
    window.__okbmNoteRtThread = null;
    window.__okbmNoteRtThreadId = '';
  }
  if (kind === 'inbox' || kind === 'all') {
    window.okbmNoteRealtimeRemove(window.__okbmNoteRtInboxA);
    window.okbmNoteRealtimeRemove(window.__okbmNoteRtInboxB);
    window.__okbmNoteRtInboxA = null;
    window.__okbmNoteRtInboxB = null;
    window.__okbmNoteRtInboxUser = '';
  }
};

window.okbmNoteRealtimeStartThread = function(threadId) {
  var tid = String(threadId || '').trim();
  if (!tid) return;
  if (window.__okbmNoteRtThreadId === tid && window.__okbmNoteRtThread) return;
  window.okbmNoteRealtimeStop('thread');
  var client = window.okbmEnsureSupabaseClient();
  if (!client || typeof client.channel !== 'function') return;
  var channel = client.channel('okbm-note-thread-' + tid)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'direct_threads',
      filter: 'id=eq.' + tid
    }, function(payload) {
      if (!okbmNoteRealtimeMessagesChanged(payload)) return;
      var row = payload && payload.new;
      var modal = document.getElementById('directMessageThreadModal');
      if (!modal || !row) return;
      var myId = okbmNoteMyId();
      var theirId = String(modal.dataset.userId || '').trim();
      if (!myId || !theirId || okbmNoteThreadId(myId, theirId) !== String(row.id || tid)) return;
      var rows = okbmThreadMessages(row);
      if (!rows.length && row.messages == null) {
        window.okbmPaintNoteThreadMessages(true, true).catch(function() {});
        return;
      }
      var lastAt = String(row.last_at || '');
      var last = rows.length ? rows[rows.length - 1] : null;
      if (!lastAt && last && last.created_at) lastAt = String(last.created_at);
      if (lastAt) window.__okbmNoteRtPaintAt = lastAt;
      var listEl = document.getElementById('directMessageThreadList');
      if (listEl) {
        var nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 120;
        listEl.innerHTML = okbmRenderNoteBubbles(rows, myId, theirId);
        if (nearBottom) listEl.scrollTop = listEl.scrollHeight;
      }
      if (last && !okbmNoteIdsMatch(last.sender_id, myId) && okbmThreadUnreadForMe(row, myId) > 0) {
        window.okbmMarkNoteThreadRead(theirId).catch(function() {});
      }
      if (typeof window.okbmRefreshNoteBadge === 'function') {
        window.okbmRefreshNoteBadge().catch(function() {});
      }
      if (document.getElementById('userNotificationInboxModal') && window.__okbmInboxTab === 'note') {
        window.okbmPaintNoteInboxList();
      }
    })
    .subscribe();
  window.__okbmNoteRtThread = channel;
  window.__okbmNoteRtThreadId = tid;
};

window.okbmNoteRealtimeStartInbox = function() {
  var myId = okbmNoteMyId();
  var client = window.okbmEnsureSupabaseClient();
  if (!client || typeof client.channel !== 'function' || !myId) return;
  if (window.__okbmNoteRtInboxUser === myId && window.__okbmNoteRtInboxA && window.__okbmNoteRtInboxB) return;
  window.okbmNoteRealtimeStop('inbox');
  var onEvt = function(payload) {
    if (!okbmNoteRealtimeMessagesChanged(payload)) return;
    var now = Date.now();
    if (window.__okbmNoteRtInboxAt && (now - window.__okbmNoteRtInboxAt) < 400) return;
    window.__okbmNoteRtInboxAt = now;
    if (typeof window.okbmRefreshNoteBadge === 'function') {
      window.okbmRefreshNoteBadge().catch(function() {});
    }
    if (document.getElementById('userNotificationInboxModal') && window.__okbmInboxTab === 'note') {
      window.okbmPaintNoteInboxList();
    }
  };
  window.__okbmNoteRtInboxA = client.channel('okbm-note-inbox-a-' + myId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'direct_threads',
      filter: 'user_a=eq.' + myId
    }, onEvt)
    .subscribe();
  window.__okbmNoteRtInboxB = client.channel('okbm-note-inbox-b-' + myId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'direct_threads',
      filter: 'user_b=eq.' + myId
    }, onEvt)
    .subscribe();
  window.__okbmNoteRtInboxUser = myId;
};

window.okbmApplyUnreadBadge = function() {
  var total = Number(window.__okbmUnreadNotifOnly || 0) + Number(window.__okbmUnreadNoteCount || 0);
  window.__okbmUnreadNotifCount = total;
  if (typeof window.okbmPaintNotifBadge === 'function') window.okbmPaintNotifBadge(total);
};

window.okbmRefreshNoteBadge = async function() {
  var n = 0;
  if (typeof window.okbmCountUnreadNotes === 'function') {
    try { n = await window.okbmCountUnreadNotes(); } catch (e) { n = 0; }
  }
  window.__okbmUnreadNoteCount = Number(n || 0);
  window.okbmApplyUnreadBadge();
  return window.__okbmUnreadNoteCount;
};

window.okbmBindNoteLiveRefresh = function() {
  if (window.__okbmNoteLiveBound) return;
  window.__okbmNoteLiveBound = true;
  var refresh = function() {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) return;
    var now = Date.now();
    if (window.__okbmNoteLiveAt && (now - window.__okbmNoteLiveAt) < 1500) return;
    window.__okbmNoteLiveAt = now;
    if (typeof window.okbmRefreshNoteBadge === 'function') {
      window.okbmRefreshNoteBadge().catch(function() {});
    }
    if (document.getElementById('directMessageThreadModal') && typeof window.okbmPaintNoteThreadMessages === 'function') {
      window.okbmPaintNoteThreadMessages(true).catch(function() {});
    }
    if (document.getElementById('userNotificationInboxModal') && window.__okbmInboxTab === 'note' && typeof window.okbmPaintNoteInboxList === 'function') {
      window.okbmPaintNoteInboxList();
    }
  };
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
};

function okbmFormatNoteTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function okbmNoteCachedPhoto(userId) {
  var uid = String(userId || '').trim();
  if (!uid) return '';
  window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};
  var cached = String(window.__userProfilePhotoMap[uid] || '').trim();
  if (cached.indexOf('http') === 0) return cached;
  var myId = okbmNoteMyId();
  if (myId && okbmNoteIdsMatch(myId, uid)) {
    var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
    var myCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
    if (myCover && String(myCover).indexOf('http') === 0) {
      window.__userProfilePhotoMap[uid] = myCover;
      return String(myCover).trim();
    }
  }
  return '';
}

function okbmApplyUserAvatarSrc(userId, url) {
  if (typeof window.okbmPaintUserAvatarNodes === 'function') {
    window.okbmPaintUserAvatarNodes(userId, url);
    return;
  }
  var uid = String(userId || '').trim();
  var src = (typeof okbmSafeImageUrl === 'function') ? (okbmSafeImageUrl(url) || '') : String(url || '').trim();
  if (!uid || src.indexOf('http') !== 0) return;
  window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};
  window.__userProfilePhotoMap[uid] = src;
  var imgs = document.querySelectorAll('img[data-user-avatar-id]');
  for (var i = 0; i < imgs.length; i++) {
    if (String(imgs[i].getAttribute('data-user-avatar-id') || '') !== uid) continue;
    imgs[i].src = src;
    imgs[i].style.display = 'block';
    var placeholder = imgs[i].parentElement ? imgs[i].parentElement.querySelector('.avatar-placeholder-svg') : null;
    if (placeholder) placeholder.style.display = 'none';
  }
}

window.okbmPrefetchUserPhotos = async function(userIds) {
  var ids = (userIds || []).map(function(id) { return String(id || '').trim(); }).filter(Boolean);
  window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};
  window.__userProfileFetchingMap = window.__userProfileFetchingMap || {};
  var need = [];
  var seen = {};
  ids.forEach(function(id) {
    if (seen[id] || window.__userProfilePhotoMap[id] || window.__userProfileFetchingMap[id]) return;
    seen[id] = true;
    need.push(id);
  });
  if (!need.length) return;
  need.forEach(function(id) { window.__userProfileFetchingMap[id] = true; });
  try {
    var rows = (typeof window.okbmFetchPublicProfiles === 'function')
      ? await window.okbmFetchPublicProfiles(need)
      : [];
    (Array.isArray(rows) ? rows : []).forEach(function(u) {
      var uid = String((u && u.id) || '').trim();
      var remoteUrl = String((u && (u.hero_cover_url || u.photo_url)) || '').trim();
      if (uid && remoteUrl.indexOf('http') === 0) okbmApplyUserAvatarSrc(uid, remoteUrl);
    });
  } catch (e) {}
  need.forEach(function(id) {
    if (window.__userProfileFetchingMap && window.__userProfileFetchingMap[id] === true) {
      delete window.__userProfileFetchingMap[id];
    }
  });
};

function okbmNoteAvatarHtml(userId, size) {
  var px = Number(size) || 36;
  var uid = String(userId || '').trim();
  var safeId = _escapeReportPropHtml(uid);
  var photo = okbmNoteCachedPhoto(uid);
  var hasImg = Boolean(photo && photo.indexOf('http') === 0);
  var icon = Math.max(12, Math.round(px * 0.45));
  return '<span style="width:' + px + 'px; height:' + px + 'px; border-radius:50%; background:rgba(255,255,255,0.12); padding:1.5px; box-sizing:border-box; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.55);">' +
    '<span style="width:100%; height:100%; border-radius:50%; background:#121212; overflow:hidden; display:flex; align-items:center; justify-content:center;">' +
      '<img data-user-avatar-id="' + safeId + '" src="' + escapeHtml(okbmSafeImageUrl(hasImg ? photo : '')) + '" alt="" style="width:100%; height:100%; object-fit:cover; display:' + (hasImg ? 'block' : 'none') + ';" onerror="this.style.display=\'none\'; var p=this.parentElement && this.parentElement.querySelector(\'.avatar-placeholder-svg\'); if(p) p.style.display=\'block\';" />' +
      '<svg class="avatar-placeholder-svg" viewBox="0 0 24 24" style="width:' + icon + 'px; height:' + icon + 'px; display:' + (hasImg ? 'none' : 'block') + ';" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '</span>' +
  '</span>';
}

function okbmNoteNameWithLoginHtml(userId, nick, size) {
  return '<span style="display:inline-flex; align-items:center; gap:8px; min-width:0; max-width:100%;">' +
    okbmNoteAvatarHtml(userId, size || 32) +
    '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _escapeReportPropHtml(nick || '사용자') + '</span>' +
  '</span>';
}

function okbmThreadMessages(row) {
  var msgs = row && row.messages;
  if (typeof msgs === 'string') {
    try { msgs = JSON.parse(msgs); } catch (e) { msgs = []; }
  }
  return Array.isArray(msgs) ? msgs : [];
}

function okbmNoteLastMessageMeta(msgs) {
  if (!Array.isArray(msgs) || !msgs.length) return '0';
  var last = msgs[msgs.length - 1] || {};
  return String(msgs.length) + ':' + String(last.id || '') + ':' + String(last.created_at || '') + ':' + String(last.sender_id || '') + ':' + String(last.body || last.text || '');
}

function okbmNoteContentStamp(row) {
  if (!row || typeof row !== 'object') return '';
  var msgStamp = '';
  if (Object.prototype.hasOwnProperty.call(row, 'messages') && row.messages != null) {
    msgStamp = okbmNoteLastMessageMeta(okbmThreadMessages(row));
  }
  return [
    String(row.id || ''),
    String(row.last_at || ''),
    String(row.last_sender_id || ''),
    String(row.last_body || ''),
    msgStamp
  ].join('\u0001');
}

function okbmNoteRememberContentStamp(threadId, rowOrStamp) {
  window.__okbmNoteContentStamp = window.__okbmNoteContentStamp || {};
  var id = String(threadId || (rowOrStamp && rowOrStamp.id) || '').trim();
  if (!id) return '';
  var stamp = typeof rowOrStamp === 'string' ? rowOrStamp : okbmNoteContentStamp(rowOrStamp);
  if (stamp) window.__okbmNoteContentStamp[id] = stamp;
  return stamp;
}

function okbmNoteRealtimeMessagesChanged(payload) {
  if (!payload) return false;
  var event = String(payload.eventType || payload.event || '').toUpperCase();
  var next = payload.new;
  var prev = payload.old;
  if (event === 'INSERT' || event === 'DELETE') {
    if (next && next.id) okbmNoteRememberContentStamp(next.id, next);
    return true;
  }
  if (!next) return false;
  var id = String(next.id || '').trim();
  var nextStamp = okbmNoteContentStamp(next);
  var prevStamp = '';
  if (prev && (prev.messages != null || prev.last_at || prev.last_body || prev.last_sender_id)) {
    prevStamp = okbmNoteContentStamp(prev);
  }
  if (!prevStamp && id) {
    prevStamp = (window.__okbmNoteContentStamp && window.__okbmNoteContentStamp[id]) || '';
  }
  if (nextStamp) okbmNoteRememberContentStamp(id, nextStamp);
  if (prevStamp && nextStamp && prevStamp === nextStamp) return false;
  if (prev && next) {
    var sameContent = String(prev.last_at || '') === String(next.last_at || '')
      && String(prev.last_body || '') === String(next.last_body || '')
      && String(prev.last_sender_id || '') === String(next.last_sender_id || '');
    if (sameContent) {
      var prevHasMsgs = prev.messages != null;
      var nextHasMsgs = next.messages != null;
      if (!prevHasMsgs || !nextHasMsgs || okbmNoteLastMessageMeta(okbmThreadMessages(prev)) === okbmNoteLastMessageMeta(okbmThreadMessages(next))) {
        return false;
      }
    }
  }
  return true;
}

function okbmThreadHiddenForMe(row, myId) {
  if (!row) return true;
  var hiddenAt = okbmNoteIdsMatch(myId, row.user_a) ? row.hidden_a_at : row.hidden_b_at;
  if (!hiddenAt) return false;
  var ht = new Date(hiddenAt).getTime();
  var lt = new Date(row.last_at).getTime();
  if (isNaN(ht)) return true;
  if (isNaN(lt)) return true;
  return lt <= ht;
}

function okbmThreadUnreadForMe(row, myId) {
  if (!row) return 0;
  return Number(okbmNoteIdsMatch(myId, row.user_a) ? (row.unread_a || 0) : (row.unread_b || 0)) || 0;
}

function okbmThreadOtherOf(row, myId) {
  if (okbmNoteIdsMatch(myId, row.user_a)) {
    return { id: String(row.user_b || '').trim(), nick: String(row.nick_b || '사용자').trim() || '사용자' };
  }
  return { id: String(row.user_a || '').trim(), nick: String(row.nick_a || '사용자').trim() || '사용자' };
}

window.okbmNoteRpc = async function(name, payload) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var noteHeaders = okbmWriteRestHeaders({ Prefer: 'return=representation' });
  if (!noteHeaders) return { ok: false, status: 401, json: null, text: '' };
  var res = await fetch(targetUrl + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: noteHeaders,
    body: JSON.stringify(payload || {})
  });
  var text = '';
  try { text = await res.text(); } catch (e) {}
  var json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) {}
  return { ok: res.ok, status: res.status, json: json, text: text };
};

window.okbmRefreshBlockedByIds = async function(force) {
  var myId = okbmNoteMyId();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!myId || !targetUrl || !targetKey) {
    window.__okbmBlockedByIds = [];
    return [];
  }
  var now = Date.now();
  if (!force && window.__okbmBlockedByFetchedAt && (now - window.__okbmBlockedByFetchedAt) < 120000 && Array.isArray(window.__okbmBlockedByIds)) {
    return window.__okbmBlockedByIds;
  }
  try {
    var res = await fetch(targetUrl + '/rest/v1/user_blocks?blocked_id=eq.' + encodeURIComponent(myId) + '&select=blocker_id', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) return window.__okbmBlockedByIds || [];
    var rows = await res.json();
    var ids = (Array.isArray(rows) ? rows : []).map(function(r) {
      return String((r && r.blocker_id) || '').trim();
    }).filter(Boolean);
    window.__okbmBlockedByIds = ids;
    window.__okbmBlockedByFetchedAt = now;
    return ids;
  } catch (e) {
    return window.__okbmBlockedByIds || [];
  }
};

window.okbmIsNotePairBlocked = async function(theirId, force) {
  var target = String(theirId || '').trim();
  var myId = okbmNoteMyId();
  if (!target || !myId) return { blocked: true, reason: 'unknown' };
  if (okbmNoteIdsMatch(myId, target) || (typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(target))) {
    return { blocked: true, reason: 'self' };
  }
  if (typeof window.isUserBlocked === 'function' && window.isUserBlocked(target)) {
    return { blocked: true, reason: 'you' };
  }
  await window.okbmRefreshBlockedByIds(!!force);
  if (okbmIsNoteHiddenUser(target)) return { blocked: true, reason: 'them' };
  return { blocked: false, reason: '' };
};

window.closeDirectMessageModals = function(options) {
  options = options || {};
  var thread = document.getElementById('directMessageThreadModal');
  if (thread) {
    if (!options.blockedUserId || okbmNoteIdsMatch(thread.dataset.userId, options.blockedUserId)) {
      okbmStopNoteThreadPoll();
      if (typeof window.okbmNoteRealtimeStop === 'function') window.okbmNoteRealtimeStop('thread');
      thread.remove();
    }
  }
};

window.okbmFetchNoteThreadMessages = async function(theirId) {
  var myId = okbmNoteMyId();
  var threadId = okbmNoteThreadId(myId, theirId);
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  if (!myId || !threadId || !targetUrl) return [];
  try {
    var res = await fetch(targetUrl + '/rest/v1/direct_threads?id=eq.' + encodeURIComponent(threadId) + '&select=messages&limit=1', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) return [];
    var rows = await res.json();
    return okbmThreadMessages(Array.isArray(rows) ? rows[0] : null);
  } catch (e) {
    return [];
  }
};

window.okbmMarkNoteThreadRead = async function(theirId) {
  var myId = okbmNoteMyId();
  var threadId = okbmNoteThreadId(myId, theirId);
  if (!myId || !threadId) return false;
  var key = myId + '\u0001' + threadId + '\u0001' + String(window.__okbmNoteRtPaintAt || '');
  window.__okbmNoteMarkReadAt = window.__okbmNoteMarkReadAt || {};
  var now = Date.now();
  if (window.__okbmNoteMarkReadAt[key] && (now - window.__okbmNoteMarkReadAt[key]) < 800) return false;
  window.__okbmNoteMarkReadAt[key] = now;
  var rpc = await window.okbmNoteRpc('okbm_mark_direct_thread_read', { p_user_id: myId, p_thread_id: threadId });
  return rpc.ok;
};

window.okbmFetchMyNoteThreads = async function() {
  var myId = okbmNoteMyId();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  if (!myId || !targetUrl) return [];
  await window.okbmRefreshBlockedByIds();
  try {
    var res = await fetch(targetUrl + '/rest/v1/direct_threads?or=(user_a.eq.' + encodeURIComponent(myId) + ',user_b.eq.' + encodeURIComponent(myId) + ')&select=id,user_a,user_b,nick_a,nick_b,last_body,last_at,last_sender_id,unread_a,unread_b,hidden_a_at,hidden_b_at&order=last_at.desc&limit=80', {
      headers: okbmUgcRestHeaders()
    });
    if (!res.ok) return [];
    var rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map(function(row) {
      var other = okbmThreadOtherOf(row, myId);
      return {
        threadId: String(row.id || ''),
        otherId: other.id,
        otherNick: other.nick,
        lastBody: String(row.last_body || ''),
        lastAt: row.last_at,
        unread: okbmThreadUnreadForMe(row, myId),
        hidden: !other.id || okbmIsNoteHiddenUser(other.id) || okbmThreadHiddenForMe(row, myId)
      };
    }).filter(function(t) { return t.threadId && t.otherId && !t.hidden; });
  } catch (e) {
    return [];
  }
};

window.okbmCountUnreadNotes = async function() {
  var myId = okbmNoteMyId();
  if (!myId) return 0;
  var rpc = await window.okbmNoteRpc('okbm_unread_direct_count', { p_user_id: myId });
  if (!rpc.ok) return Number(window.__okbmUnreadNoteCount || 0);
  var n = rpc.json;
  if (typeof n === 'number') return n;
  if (n && typeof n.count === 'number') return n.count;
  if (Array.isArray(n) && n.length && typeof n[0] === 'number') return n[0];
  var parsed = Number(n);
  return isNaN(parsed) ? 0 : parsed;
};

window.deleteDirectMessageThread = async function(threadId, theirId, ev, skipConfirm) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
  var myId = okbmNoteMyId();
  var otherId = String(theirId || '').trim();
  var tid = String(threadId || '').trim() || okbmNoteThreadId(myId, otherId);
  if (!myId || !tid) return false;
  if (!skipConfirm && !confirm('이 쪽지를 삭제할까요? 내 쪽지함에서만 사라집니다.')) return false;
  var rpc = await window.okbmNoteRpc('okbm_hide_direct_thread', { p_user_id: myId, p_thread_id: tid });
  if (!rpc.ok) {
    if (typeof showToast === 'function') showToast('쪽지를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.', 'error', 2200);
    return false;
  }
  var thread = document.getElementById('directMessageThreadModal');
  if (thread && (!otherId || okbmNoteIdsMatch(thread.dataset.userId, otherId))) {
    window.closeDirectMessageModals({});
  }
  if (typeof showToast === 'function') showToast('쪽지를 삭제했습니다.', 'success', 1600);
  if (document.getElementById('userNotificationInboxModal') && window.__okbmInboxTab === 'note') {
    window.okbmPaintNoteInboxList();
  }
  if (typeof window.okbmRefreshNoteBadge === 'function') {
    window.okbmRefreshNoteBadge().catch(function() {});
  }
  return true;
};

window.okbmNotifyNoteReceiver = async function() {
  if (typeof window.okbmRefreshNoteBadge === 'function') {
    window.okbmRefreshNoteBadge().catch(function() {});
  }
};

function okbmNoteDayKey(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function okbmNoteDateChip(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + days[d.getDay()] + '요일';
}

function okbmNoteClockHtml(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var h = d.getHours();
  var ap = h < 12 ? '오전' : '오후';
  var h12 = h % 12;
  if (!h12) h12 = 12;
  return ap + ' ' + h12 + ':' + String(d.getMinutes()).padStart(2, '0');
}

function okbmNoteIsSameGroup(a, b) {
  if (!a || !b) return false;
  if (String(a.sender_id || '') !== String(b.sender_id || '')) return false;
  var t1 = new Date(a.created_at).getTime();
  var t2 = new Date(b.created_at).getTime();
  if (isNaN(t1) || isNaN(t2)) return false;
  return Math.abs(t2 - t1) < 120000;
}

function okbmRenderNoteBubbles(rows, myId, theirId) {
  if (!rows.length) {
    return '<div style="text-align:center; padding:48px 12px; color:#64748b; font-size:0.78rem; line-height:1.6;">아직 주고받은 쪽지가 없습니다.<br>첫 쪽지를 보내보세요.</div>';
  }
  var html = '';
  var prevDay = '';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var day = okbmNoteDayKey(r.created_at);
    if (day && day !== prevDay) {
      html += '<div style="display:flex; justify-content:center; margin:10px 0 8px;"><span style="font-size:0.62rem; color:#94a3b8; background:rgba(15,23,42,0.55); border-radius:999px; padding:5px 10px;">' + _escapeReportPropHtml(okbmNoteDateChip(r.created_at)) + '</span></div>';
      prevDay = day;
    }
    var mine = okbmNoteIdsMatch(r.sender_id, myId);
    var prev = i > 0 ? rows[i - 1] : null;
    var next = i < rows.length - 1 ? rows[i + 1] : null;
    var samePrevDay = prev && okbmNoteDayKey(prev.created_at) === day;
    var sameNextDay = next && okbmNoteDayKey(next.created_at) === day;
    var groupStart = !prev || !samePrevDay || !okbmNoteIsSameGroup(prev, r);
    var groupEnd = !next || !sameNextDay || !okbmNoteIsSameGroup(r, next);
    var body = _escapeReportPropHtml(r.body || '');
    var when = groupEnd ? okbmNoteClockHtml(r.created_at) : '';
    var timeHtml = when ? '<span style="font-size:0.54rem; color:#64748b; line-height:1.2; flex-shrink:0; margin-bottom:1px;">' + _escapeReportPropHtml(when) + '</span>' : '';
    var topGap = groupStart ? '8px' : '2px';
    if (mine) {
      var radius = groupStart && groupEnd ? '18px 18px 4px 18px' : (groupStart ? '18px 18px 4px 18px' : (groupEnd ? '18px 4px 4px 18px' : '18px 4px 4px 18px'));
      html += '<div style="display:flex; justify-content:flex-end; align-items:flex-end; gap:6px; margin:' + topGap + ' 0 0;">' +
        timeHtml +
        '<div style="max-width:72%; background:#fee500; color:#191919; border-radius:' + radius + '; padding:8px 11px; font-size:0.82rem; line-height:1.45; white-space:pre-wrap; word-break:break-word; box-shadow:0 1px 2px rgba(0,0,0,0.18);">' + body + '</div>' +
      '</div>';
    } else {
      var radius = groupStart && groupEnd ? '18px 18px 18px 4px' : (groupStart ? '18px 18px 18px 4px' : (groupEnd ? '4px 18px 18px 4px' : '4px 18px 18px 4px'));
      var avatar = groupStart ? okbmNoteAvatarHtml(theirId || r.sender_id, 28) : '<span style="width:28px; flex-shrink:0; display:inline-block;"></span>';
      html += '<div style="display:flex; justify-content:flex-start; align-items:flex-end; gap:6px; margin:' + topGap + ' 0 0;">' +
        avatar +
        '<div style="max-width:68%; background:#2b3344; color:#f8fafc; border-radius:' + radius + '; padding:8px 11px; font-size:0.82rem; line-height:1.45; white-space:pre-wrap; word-break:break-word;">' + body + '</div>' +
        timeHtml +
      '</div>';
    }
  }
  return html;
}

window.okbmPaintNoteThreadMessages = async function(silent, fromRealtime) {
  var modal = document.getElementById('directMessageThreadModal');
  if (!modal) return;
  var theirId = String(modal.dataset.userId || '').trim();
  var listEl = document.getElementById('directMessageThreadList');
  if (!theirId || !listEl) return;
  var pair = await window.okbmIsNotePairBlocked(theirId, false);
  var composer = document.getElementById('directMessageComposer');
  var blockHint = document.getElementById('directMessageBlockedHint');
  if (pair.blocked) {
    if (composer) composer.style.display = 'none';
    if (blockHint) blockHint.style.display = 'block';
    return;
  }
  if (composer) composer.style.display = 'flex';
  if (blockHint) blockHint.style.display = 'none';
  var rows = await window.okbmFetchNoteThreadMessages(theirId);
  var last = rows.length ? rows[rows.length - 1] : null;
  var lastAt = last && last.created_at ? String(last.created_at) : '';
  var threadId = okbmNoteThreadId(okbmNoteMyId(), theirId);
  var stamp = okbmNoteContentStamp({
    id: threadId,
    messages: rows,
    last_at: lastAt,
    last_sender_id: last && last.sender_id,
    last_body: last && last.body
  });
  if (fromRealtime && stamp && window.__okbmNoteContentStamp && window.__okbmNoteContentStamp[threadId] === stamp && listEl.childNodes.length) return;
  if (fromRealtime && lastAt && window.__okbmNoteRtPaintAt === lastAt && listEl.childNodes.length) return;
  if (lastAt) window.__okbmNoteRtPaintAt = lastAt;
  if (stamp) okbmNoteRememberContentStamp(threadId, stamp);
  var nearBottom = (listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight) < 80;
  listEl.innerHTML = okbmRenderNoteBubbles(rows, okbmNoteMyId(), theirId);
  if (!silent || nearBottom) listEl.scrollTop = listEl.scrollHeight;
  if (!fromRealtime) {
    await window.okbmMarkNoteThreadRead(theirId);
  } else if (last && !okbmNoteIdsMatch(last.sender_id, okbmNoteMyId())) {
    await window.okbmMarkNoteThreadRead(theirId);
  }
  if (typeof window.okbmRefreshNoteBadge === 'function') {
    window.okbmRefreshNoteBadge().catch(function() {});
  }
};

window.sendDirectMessage = async function() {
  if (typeof triggerHaptic === 'function') triggerHaptic(8);
  var modal = document.getElementById('directMessageThreadModal');
  var input = document.getElementById('directMessageInput');
  if (!modal || !input) return;
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('쪽지는 로그인 후 이용할 수 있습니다.', 'info', 2000);
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return;
  }
  var myId = okbmNoteMyId();
  var theirId = String(modal.dataset.userId || '').trim();
  var theirNick = String(modal.dataset.author || '').trim() || '사용자';
  var body = String(input.value || '').trim();
  if (!myId || !theirId) {
    if (typeof showToast === 'function') showToast('상대 계정을 확인할 수 없습니다.', 'warn');
    return;
  }
  if (!body) {
    if (typeof showToast === 'function') showToast('쪽지 내용을 입력해주세요.', 'info', 1600);
    return;
  }
  if (body.length > 500) {
    if (typeof showToast === 'function') showToast('쪽지는 500자까지 보낼 수 있습니다.', 'warn', 2000);
    return;
  }
  var pair = await window.okbmIsNotePairBlocked(theirId, true);
  if (pair.blocked) {
    okbmNoteBlockedToast(pair.reason);
    return;
  }
  var btn = document.getElementById('directMessageSendBtn');
  if (btn) btn.disabled = true;
  try {
    var rpc = await window.okbmNoteRpc('okbm_append_direct_message', {
      p_sender_id: myId,
      p_sender_nick: okbmNoteMyNick(),
      p_receiver_id: theirId,
      p_receiver_nick: theirNick,
      p_body: body
    });
    if (!rpc.ok) {
      var errText = String((rpc.json && (rpc.json.message || rpc.json.details)) || rpc.text || '');
      if (errText.indexOf('blocked_direct_message') !== -1) {
        okbmNoteBlockedToast('them');
      } else if (typeof showToast === 'function') {
        showToast('쪽지를 보내지 못했습니다. 잠시 후 다시 시도해주세요.', 'error', 2200);
      }
      if (btn) btn.disabled = false;
      return;
    }
    input.value = '';
    window.__okbmNoteRtPaintAt = '';
    await window.okbmPaintNoteThreadMessages(false);
  } catch (e) {
    if (typeof showToast === 'function') showToast('쪽지를 보내지 못했습니다. 네트워크를 확인해주세요.', 'error', 2200);
  }
  if (btn) btn.disabled = false;
};

window.openDirectMessageThread = async function(userId, nickname) {
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('쪽지는 로그인 후 이용할 수 있습니다.', 'info', 2000);
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return;
  }
  var theirId = String(userId || '').trim();
  var theirNick = String(nickname || '').trim() || '사용자';
  var myId = okbmNoteMyId();
  if (!theirId) {
    if (typeof showToast === 'function') showToast('상대 계정을 확인할 수 없습니다.', 'warn');
    return;
  }
  if (!myId || okbmNoteIdsMatch(myId, theirId) || (typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(theirId))) {
    okbmNoteBlockedToast('self');
    return;
  }
  var pair = await window.okbmIsNotePairBlocked(theirId, true);
  if (pair.blocked) {
    okbmNoteBlockedToast(pair.reason);
    return;
  }
  okbmStopNoteThreadPoll();
  if (typeof window.okbmBindNoteLiveRefresh === 'function') window.okbmBindNoteLiveRefresh();
  if (typeof window.okbmPrefetchUserPhotos === 'function') {
    await window.okbmPrefetchUserPhotos([theirId]);
  }
  var old = document.getElementById('directMessageThreadModal');
  if (old) old.remove();
  var overlay = document.createElement('div');
  overlay.id = 'directMessageThreadModal';
  overlay.dataset.userId = theirId;
  overlay.dataset.author = theirNick;
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); z-index:2147483644 !important; background:#000000; display:flex; justify-content:center; align-items:stretch; pointer-events:auto;';
  overlay.innerHTML = '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; background:#15202b; display:flex; flex-direction:column; box-sizing:border-box; pointer-events:auto;">' +
    '<div style="flex-shrink:0; display:flex; justify-content:space-between; align-items:center; padding:10px 14px; padding-top:calc(10px + env(safe-area-inset-top, 0px)); border-bottom:1px solid rgba(255,255,255,0.08); background:#0f1720;">' +
      '<button type="button" onclick="window.closeDirectMessageModals({});" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:32px; height:32px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer;">◀</button>' +
      '<span style="font-size:0.95rem; font-weight:900; color:#ffffff; max-width:72%; overflow:hidden; display:inline-flex; align-items:center;">' + okbmNoteNameWithLoginHtml(theirId, theirNick, 36) + '</span>' +
      '<div style="width:32px;"></div>' +
    '</div>' +
    '<div id="directMessageThreadList" style="flex:1; min-height:0; overflow-y:auto; padding:10px 12px 16px; display:flex; flex-direction:column; background:#15202b;"></div>' +
    '<div id="directMessageBlockedHint" style="display:none; flex-shrink:0; padding:12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); color:#fda4af; font-size:0.78rem; text-align:center;">차단된 상대와는 쪽지를 주고받을 수 없습니다.</div>' +
    '<div id="directMessageComposer" style="flex-shrink:0; display:flex; gap:8px; align-items:flex-end; padding:8px 10px calc(10px + env(safe-area-inset-bottom, 0px)); border-top:1px solid rgba(255,255,255,0.08); background:#0f1720;">' +
      '<textarea id="directMessageInput" maxlength="500" rows="1" placeholder="메시지를 입력하세요" style="flex:1; min-height:38px; max-height:90px; resize:none; background:#1e293b; border:1px solid rgba(255,255,255,0.08); border-radius:20px; color:#e2e8f0; font-size:0.84rem; padding:9px 14px; outline:none; line-height:1.4;"></textarea>' +
      '<button type="button" id="directMessageSendBtn" onclick="window.sendDirectMessage();" style="flex-shrink:0; height:38px; min-width:52px; padding:0 14px; border:none; border-radius:19px; background:#fee500; color:#191919; font-size:0.80rem; font-weight:900; cursor:pointer;">전송</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(overlay);
  if (typeof window.okbmLiftInboxAboveDock === 'function') window.okbmLiftInboxAboveDock(overlay);
  var input = document.getElementById('directMessageInput');
  if (input) {
    input.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        window.sendDirectMessage();
      }
    });
  }
  await window.okbmPaintNoteThreadMessages(false);
  if (typeof window.okbmNoteRealtimeStartInbox === 'function') window.okbmNoteRealtimeStartInbox();
  if (typeof window.okbmNoteRealtimeStartThread === 'function') {
    window.okbmNoteRealtimeStartThread(okbmNoteThreadId(myId, theirId));
  }
};

window.okbmCloseNoteSwipeRows = function(exceptFront) {
  var list = document.getElementById('userNotificationInboxList');
  if (!list) return;
  list.querySelectorAll('.okbm-note-swipe-front').forEach(function(front) {
    if (exceptFront && front === exceptFront) return;
    front.style.transform = 'translateX(0)';
    front.dataset.open = '0';
  });
};

window.okbmBindNoteSwipeRows = function() {
  var list = document.getElementById('userNotificationInboxList');
  if (!list) return;
  list.querySelectorAll('.okbm-note-swipe').forEach(function(row) {
    if (row.dataset.swipeBound === '1') return;
    row.dataset.swipeBound = '1';
    var front = row.querySelector('.okbm-note-swipe-front');
    if (!front) return;
    var startX = 0;
    var startY = 0;
    var dx = 0;
    var tracking = false;
    var decided = false;
    var horizontal = false;
    var opened = false;

    function snap(open) {
      front.style.transition = 'transform 0.2s ease';
      if (open) {
        front.style.transform = 'translateX(-76px)';
        front.dataset.open = '1';
        window.okbmCloseNoteSwipeRows(front);
      } else {
        front.style.transform = 'translateX(0)';
        front.dataset.open = '0';
      }
    }

    front.addEventListener('pointerdown', function(ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      startX = ev.clientX;
      startY = ev.clientY;
      dx = 0;
      tracking = true;
      decided = false;
      horizontal = false;
      opened = front.dataset.open === '1';
      front.style.transition = 'none';
      try { front.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    front.addEventListener('pointermove', function(ev) {
      if (!tracking) return;
      var mx = ev.clientX - startX;
      var my = ev.clientY - startY;
      if (!decided) {
        if (Math.abs(mx) + Math.abs(my) < 8) return;
        decided = true;
        horizontal = Math.abs(mx) > Math.abs(my) * 1.15;
        if (!horizontal) {
          tracking = false;
          return;
        }
      }
      if (!horizontal) return;
      var base = opened ? -76 : 0;
      dx = Math.min(0, Math.max(-80, base + mx));
      front.style.transform = 'translateX(' + dx + 'px)';
    });
    function endSwipe() {
      if (!tracking) return;
      tracking = false;
      if (!decided || !horizontal) {
        if (opened) snap(true);
        return;
      }
      snap(dx < -40);
    }
    front.addEventListener('pointerup', endSwipe);
    front.addEventListener('pointercancel', endSwipe);
    front.addEventListener('click', function(ev) {
      if (front.dataset.open === '1') {
        ev.preventDefault();
        ev.stopPropagation();
        snap(false);
      }
    }, true);
  });
};

window.okbmPaintNoteInboxList = async function() {
  var listEl = document.getElementById('userNotificationInboxList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center; padding:28px 8px; color:#64748b;">불러오는 중</div>';
  var threads = await window.okbmFetchMyNoteThreads();
  var unreadSum = 0;
  (threads || []).forEach(function(t) { unreadSum += Number(t.unread || 0) || 0; });
  window.__okbmUnreadNoteCount = unreadSum;
  if (typeof window.okbmApplyUnreadBadge === 'function') window.okbmApplyUnreadBadge();
  if (!threads.length) {
    listEl.innerHTML = '<div style="text-align:center; padding:28px 8px; color:#64748b;">주고받은 쪽지가 없습니다.<br>상대 아이디를 눌러 쪽지를 보낼 수 있습니다.</div>';
    return;
  }
  if (typeof window.okbmPrefetchUserPhotos === 'function') {
    await window.okbmPrefetchUserPhotos(threads.map(function(t) { return t.otherId; }));
  }
  listEl.innerHTML = threads.map(function(t) {
    var unreadNum = t.unread ? '<span style="font-size:0.58rem; color:#38bdf8; font-weight:800; flex-shrink:0;">' + (t.unread > 9 ? '9+' : String(t.unread)) + '</span>' : '';
    return '<div class="okbm-note-swipe" data-thread-id="' + _escapeReportPropHtml(t.threadId) + '" style="position:relative; overflow:hidden; border-bottom:1px solid rgba(255,255,255,0.06);">' +
      '<div class="okbm-note-swipe-actions" style="position:absolute; right:0; top:0; bottom:0; width:76px; display:flex;">' +
        '<button type="button" data-thread-id="' + _escapeReportPropHtml(t.threadId) + '" data-user-id="' + _escapeReportPropHtml(t.otherId) + '" onclick="window.deleteDirectMessageThread(this.dataset.threadId, this.dataset.userId, event, true);" style="width:76px; border:none; background:#f43f5e; color:#ffffff; font-size:0.78rem; font-weight:900; cursor:pointer;">삭제</button>' +
      '</div>' +
      '<div class="okbm-note-swipe-front" data-open="0" style="position:relative; background:#0c1017; transform:translateX(0); will-change:transform; touch-action:pan-y;">' +
        '<button type="button" data-user-id="' + _escapeReportPropHtml(t.otherId) + '" data-author="' + _escapeReportPropHtml(t.otherNick) + '" onclick="if(this.parentElement && this.parentElement.dataset.open===\'1\'){return;} window.openDirectMessageThread(this.dataset.userId, this.dataset.author);" style="width:100%; text-align:left; background:transparent; border:none; padding:12px 0; display:flex; gap:10px; align-items:center; cursor:pointer;">' +
          okbmNoteAvatarHtml(t.otherId, 44) +
          '<div style="min-width:0; flex:1;">' +
            '<div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">' +
              '<div style="font-size:0.82rem; font-weight:800; color:#e2e8f0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _escapeReportPropHtml(t.otherNick) + '</div>' +
              unreadNum +
            '</div>' +
            '<div style="font-size:0.68rem; color:#94a3b8; margin-top:4px; line-height:1.45; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + _escapeReportPropHtml(t.lastBody) + '</div>' +
            (t.lastAt ? '<div style="font-size:0.58rem; color:#64748b; margin-top:6px;">' + okbmFormatNoteTime(t.lastAt) + '</div>' : '') +
          '</div>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
  window.okbmBindNoteSwipeRows();
};

window.okbmPaintNotifInboxList = async function() {
  var listEl = document.getElementById('userNotificationInboxList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center; padding:28px 8px; color:#64748b;">불러오는 중</div>';
  var rows = await window.pollUserNotifications(true);
  if (!listEl) return;
  if (!rows.length) {
    listEl.innerHTML = '<div style="text-align:center; padding:28px 8px; color:#64748b;">아직 도착한 알림이 없습니다.</div>';
    return;
  }
  var unreadIds = [];
  listEl.innerHTML = rows.map(function(r) {
    if (r && !r.is_read && r.id) unreadIds.push(String(r.id));
    var when = okbmFormatNoteTime(r.created_at);
    var unreadDot = r.is_read ? '' : '<span style="width:7px; height:7px; border-radius:50%; background:#38bdf8; flex-shrink:0; margin-top:6px;"></span>';
    return '<div style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; gap:8px; align-items:flex-start;">' +
      unreadDot +
      '<div style="min-width:0; flex:1;">' +
        '<div style="font-size:0.80rem; font-weight:800; color:#e2e8f0;">' + _escapeReportPropHtml(r.title || '알림') + '</div>' +
        '<div style="font-size:0.68rem; color:#94a3b8; margin-top:4px; line-height:1.45;">' + _escapeReportPropHtml(r.body || '') + '</div>' +
        (when ? '<div style="font-size:0.58rem; color:#64748b; margin-top:6px;">' + when + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  if (unreadIds.length) {
    await window.markUserNotificationsRead(unreadIds);
    if (typeof window.pollUserNotifications === 'function') {
      window.pollUserNotifications(true).catch(function() {});
    }
  }
};

window.okbmLiftReportChildModal = function(overlay) {
  if (!overlay) return;
  var report = document.getElementById('userProfileModalOverlay');
  if (report) report.style.setProperty('display', 'none', 'important');
  var inbox = document.getElementById('userNotificationInboxModal');
  if (inbox) inbox.remove();
  overlay.style.setProperty('position', 'fixed', 'important');
  overlay.style.setProperty('top', '0', 'important');
  overlay.style.setProperty('left', '0', 'important');
  overlay.style.setProperty('right', '0', 'important');
  overlay.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 8px))', 'important');
  overlay.style.setProperty('z-index', '2147483642', 'important');
  overlay.style.setProperty('pointer-events', 'auto', 'important');
  overlay.style.setProperty('display', 'flex', 'important');
  if (overlay.parentElement === document.body) document.body.appendChild(overlay);
  if (typeof window.ensureMasterBottomDock === 'function') {
    window.ensureMasterBottomDock('history');
  }
  var dock = document.getElementById('romanticMasterBottomDock');
  if (dock) {
    dock.style.setProperty('z-index', '2147483647', 'important');
    dock.style.setProperty('pointer-events', 'auto', 'important');
    if (dock.parentElement === document.body) document.body.appendChild(dock);
  }
};

window.okbmLiftInboxAboveDock = function(overlay) {
  if (!overlay) return;
  overlay.style.setProperty('position', 'fixed', 'important');
  overlay.style.setProperty('top', '0', 'important');
  overlay.style.setProperty('left', '0', 'important');
  overlay.style.setProperty('right', '0', 'important');
  overlay.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 8px))', 'important');
  overlay.style.setProperty('z-index', '2147483644', 'important');
  overlay.style.setProperty('pointer-events', 'auto', 'important');
  var inner = overlay.firstElementChild;
  if (inner) {
    inner.style.setProperty('pointer-events', 'auto', 'important');
    inner.style.setProperty('z-index', '1', 'important');
  }
  if (overlay.parentElement === document.body) document.body.appendChild(overlay);
  if (typeof window.ensureMasterBottomDock === 'function') {
    var onReport = document.getElementById('userProfileModalOverlay') && document.getElementById('userProfileModalOverlay').style.display === 'flex';
    window.ensureMasterBottomDock(onReport ? 'report' : undefined);
  }
  var dock = document.getElementById('romanticMasterBottomDock');
  if (dock) {
    dock.style.setProperty('z-index', '2147483647', 'important');
    dock.style.setProperty('pointer-events', 'auto', 'important');
    if (dock.parentElement === document.body) document.body.appendChild(dock);
  }
};

window.okbmSwitchInboxTab = function(tab, ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  }
  window.__okbmInboxTab = String(tab || '') === 'notif' ? 'notif' : 'note';
  var notifTab = document.getElementById('okbmInboxTabNotif');
  var noteTab = document.getElementById('okbmInboxTabNote');
  var active = 'height:30px; padding:0 16px; border:none; border-radius:8px; font-size:0.80rem; font-weight:900; cursor:pointer; background:rgba(56,189,248,0.2); color:#7dd3fc; pointer-events:auto;';
  var idle = 'height:30px; padding:0 16px; border:none; border-radius:8px; font-size:0.80rem; font-weight:800; cursor:pointer; background:transparent; color:#94a3b8; pointer-events:auto;';
  if (noteTab) noteTab.style.cssText = window.__okbmInboxTab === 'note' ? active : idle;
  if (notifTab) notifTab.style.cssText = window.__okbmInboxTab === 'notif' ? active : idle;
  if (window.__okbmInboxTab === 'notif') {
    window.okbmPaintNotifInboxList();
  } else {
    window.okbmPaintNoteInboxList();
  }
};

window.openUserNotificationInbox = async function(initialTab, ev) {
  if (ev) {
    if (typeof ev.preventDefault === 'function') ev.preventDefault();
    if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
    if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
  }
  if (typeof triggerHaptic === 'function') triggerHaptic(10);
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
    if (typeof showToast === 'function') showToast('로그인 후 이용할 수 있습니다.', 'info', 2000);
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return;
  }
  var tab = String(initialTab || 'note').toLowerCase();
  if (tab !== 'notif') tab = 'note';
  var old = document.getElementById('userNotificationInboxModal');
  if (old) {
    window.okbmLiftInboxAboveDock(old);
    window.okbmSwitchInboxTab(tab, ev);
    return;
  }
  var overlay = document.createElement('div');
  overlay.id = 'userNotificationInboxModal';
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); z-index:2147483644 !important; background:#000000; display:flex; justify-content:center; align-items:stretch; pointer-events:auto;';
  overlay.innerHTML = '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; background:#0c1017; display:flex; flex-direction:column; box-sizing:border-box; pointer-events:auto;">' +
    '<div style="flex-shrink:0; display:flex; align-items:center; gap:10px; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); border-bottom:1px solid rgba(255,255,255,0.08);">' +
      '<button type="button" onclick="document.getElementById(\'userNotificationInboxModal\').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; flex-shrink:0;">◀</button>' +
      '<div style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:3px;">' +
        '<button type="button" id="okbmInboxTabNote" onclick="window.okbmSwitchInboxTab(\'note\', event);">쪽지</button>' +
        '<button type="button" id="okbmInboxTabNotif" onclick="window.okbmSwitchInboxTab(\'notif\', event);">알림</button>' +
      '</div>' +
    '</div>' +
    '<div id="userNotificationInboxList" style="flex:1; min-height:0; overflow-y:auto; padding:12px 16px 20px; color:#94a3b8; font-size:0.78rem;">불러오는 중</div>' +
  '</div>';
  overlay.addEventListener('click', function(e) { e.stopPropagation(); });
  document.body.appendChild(overlay);
  window.okbmLiftInboxAboveDock(overlay);
  if (typeof window.okbmBindNoteLiveRefresh === 'function') window.okbmBindNoteLiveRefresh();
  if (typeof window.okbmNoteRealtimeStartInbox === 'function') window.okbmNoteRealtimeStartInbox();
  window.okbmSwitchInboxTab(tab);
};

window.saveUserToSupabase = async function(profileData) {
  if (window.__okbmAccountPurging) return false;
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;

  var prof = profileData || safeGetJSON('user_profile', null);
  var userId = okbmGetCurrentUserId();
  if (!userId) return false;

  var customSavedNick = localStorage.getItem('okbm_user_nick') || (prof && prof.id ? localStorage.getItem('okbm_custom_nickname_' + prof.id) : '');
  var nickname = String(customSavedNick || (prof && prof.nickname) || '낭만백패커').trim();
  var coverUrl = (prof && (prof.photoUrl || prof.heroCoverUrl)) || localStorage.getItem('okbm_hero_cover_url') || '';
  var followingList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_following_users', [])
    : safeGetJSON('okbm_following_users', []);
  var lastNickChanged = Number(prof && prof.lastNicknameChangedAt) || 0;

  var safeCreatedAt = undefined;
  if (prof && prof.createdAt) {
    var rawCreated = String(prof.createdAt).trim();
    var match = rawCreated.match(/^(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
    if (match) {
      var dObj = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      if (!isNaN(dObj.getTime())) {
        safeCreatedAt = dObj.toISOString();
      }
    } else {
      var pTime = new Date(rawCreated).getTime();
      if (!isNaN(pTime) && pTime > 0) safeCreatedAt = new Date(pTime).toISOString();
    }
  }

  var vault = window.RomanticVault;
  var bookmarks = (vault && typeof vault.read === 'function') ? vault.read('okbm_bookmarks', []) : safeGetJSON('okbm_bookmarks', []);
  var visited = (vault && typeof vault.read === 'function') ? vault.read('okbm_visited', []) : safeGetJSON('okbm_visited', []);
  var memos = (vault && typeof vault.read === 'function') ? vault.read('okbm_memos', {}) : safeGetJSON('okbm_memos', {});
  var savedFeeds = (vault && typeof vault.read === 'function') ? vault.read('okbm_saved_feeds', []) : safeGetJSON('okbm_saved_feeds', []);

  var selectedGears = (vault && typeof vault.read === 'function') ? vault.read('okbm_selected_gears_multi', {}) : safeGetJSON('okbm_selected_gears_multi', {});
  var favoriteGears = (vault && typeof vault.read === 'function') ? vault.read('okbm_favorite_gears', []) : safeGetJSON('okbm_favorite_gears', []);
  var customGears = (vault && typeof vault.read === 'function') ? vault.read('okbm_custom_gears', []) : safeGetJSON('okbm_custom_gears', []);
  var gearPresets = (vault && typeof vault.read === 'function') ? vault.read('okbm_gear_presets', []) : safeGetJSON('okbm_gear_presets', []);
  var gearMeta = (vault && typeof vault.read === 'function') ? vault.read('okbm_gear_meta', {}) : safeGetJSON('okbm_gear_meta', {});

  var rawPlanMemos = (vault && typeof vault.read === 'function') ? vault.read('okbm_plan_memos', {}) : safeGetJSON('okbm_plan_memos', {});
  var planMemos = rawPlanMemos || {};

  var rawPlanSpots = (vault && typeof vault.read === 'function') ? vault.read('okbm_plan_spots', {}) : safeGetJSON('okbm_plan_spots', {});
  var planSpots = rawPlanSpots || {};

  // [헌법 제1조: SSOT 원칙] 글/피드 데이터는 feeds 테이블에서만 관리합니다.
  // users 테이블에 pack_history를 통째로 중복 저장하면, feeds 테이블에서 지운
  // 글이 이 백업 컬럼에 영구 보존되어 두 저장소 간 데이터 불일치가 발생합니다.
  // 따라서 더 이상 packHistory를 조립하거나 users.pack_history에 쓰지 않습니다.

  var userBio = (prof && prof.bio) || localStorage.getItem('okbm_user_bio') || '';
  var userInsta = (prof && prof.instagram) || localStorage.getItem('okbm_user_instagram') || '';
  var userYt = (prof && prof.youtube) || localStorage.getItem('okbm_user_youtube') || '';
  var userBlog = (prof && prof.blog) || localStorage.getItem('okbm_user_blog') || '';

  var existingRow = null;
  try {
    existingRow = await okbmFindUserById(userId);
  } catch (e) {}
  if (existingRow) {
    var existingSns = okbmReadSnsFromUserRow(existingRow);
    if (!userInsta && existingSns.instagram) userInsta = existingSns.instagram;
    if (!userYt && existingSns.youtube) userYt = existingSns.youtube;
    if (!userBlog && existingSns.blog) userBlog = existingSns.blog;
    var existingNick = String(existingRow.nickname || '').trim();
    var incomingIsDefault = !nickname || nickname === '낭만백패커';
    if (existingNick && existingNick !== '낭만백패커' && incomingIsDefault) {
      nickname = existingNick;
    }
    // [제1조 SSOT / 제4조 삭제의 즉시성]
    // 빈 배열·빈 맵은 정상 삭제 결과다. 서버 잔존 my_gears로 되돌리면
    // 방금 지운 커스텀 장비(예: 물 2리터)가 새로고침 때 되살아난다.
    if (!coverUrl) coverUrl = existingRow.hero_cover_url || existingRow.photo_url || '';
  }

  var payload = {
    id: userId,
    nickname: nickname,
    bio: userBio,
    hero_cover_url: coverUrl,
    photo_url: coverUrl,
    following: followingList,
    last_nickname_changed_at: lastNickChanged,
    bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
    visited: Array.isArray(visited) ? visited : [],
    memos: (memos && typeof memos === 'object') ? memos : {},
    saved_feeds: Array.isArray(savedFeeds) ? savedFeeds : [],
    my_gears: {
      selectedGears: selectedGears || {},
      favoriteGears: favoriteGears || [],
      customGears: customGears || [],
      gearPresets: gearPresets || [],
      gearMeta: gearMeta || {},
      planMemos: planMemos || {},
      planSpots: planSpots || {},
      sns: {
        instagram: userInsta,
        youtube: userYt,
        blog: userBlog
      }
    },
    updated_at: new Date().toISOString()
  };
  if (safeCreatedAt) {
    payload.created_at = safeCreatedAt;
  }
  var sessionForEmail = (window.__okbmSessionCache && window.__okbmSessionCache.session) || okbmReadPersistedSupabaseSession();
  var userEmail = window.okbmNormalizeEmail((sessionForEmail && sessionForEmail.user && sessionForEmail.user.email) || '');
  if (userEmail) payload.email = userEmail;

  try {
    var upsertHeaders = okbmWriteRestHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' });
    if (!upsertHeaders) return false;
    var upsertUrl = targetUrl + '/rest/v1/users?on_conflict=id';
    var res = await fetch(upsertUrl, {
      method: 'POST',
      headers: upsertHeaders,
      body: JSON.stringify(payload)
    });
    if (res.ok) return true;
    if (res.status === 400 && payload.email) {
      delete payload.email;
      var retry = await fetch(upsertUrl, {
        method: 'POST',
        headers: upsertHeaders,
        body: JSON.stringify(payload)
      });
      return retry.ok;
    }
    return false;
  } catch (e) {
    return false;
  }
};

function _sanitizeLocalRomanticStorage() {
  try {
    var rawHist = safeGetJSON('okbm_packing_history', []);
    if (Array.isArray(rawHist) && rawHist.length > 0) {
      var contaminated = false;
      var cleanHist = [];

      rawHist.forEach(function(r) {
        if (!r) return;
        var isRouter = Boolean(r.feedType === 'router' || r.feedType === 'daily' || r.feedType === 'snap' || r.isRouterSnap === true || String(r.id || '').startsWith('snap_'));
        if (isRouter) {
          contaminated = true;
        } else {
          cleanHist.push(r);
        }
      });

      if (contaminated) {
        if (typeof window.safeSetStorage === 'function') {
          window.safeSetStorage('okbm_packing_history', cleanHist);
        }
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_packing_history', cleanHist, false);
        }
        try { localStorage.setItem('okbm_packing_history', JSON.stringify(cleanHist)); } catch(e) {}
        if (window.__memoryStore) window.__memoryStore['okbm_packing_history'] = cleanHist;
        if (Array.isArray(window.packingHistoryList)) window.packingHistoryList = cleanHist;
        if (Array.isArray(window.interactiveHistory)) window.interactiveHistory = cleanHist;
      }
    }
    // 🧹 잔여 스냅 스토리지 키 영구 소거
    try {
      localStorage.removeItem('okbm_router_snaps');
      localStorage.removeItem('okbm_cached_router_snaps');
    } catch (e) { console.warn('[romantic-sync.js:_sanitizeLocalRomanticStorage removeItem]', e); }
    if (window.__memoryStore) {
      delete window.__memoryStore['okbm_router_snaps'];
      delete window.__memoryStore['okbm_cached_router_snaps'];
    }
  } catch (e) { console.warn('[romantic-sync.js:_sanitizeLocalRomanticStorage]', e); }
}

if (typeof window !== 'undefined') {
  _sanitizeLocalRomanticStorage();
}

// ============================================================================
// 📱 안드로이드 하드웨어/제스처 뒤로가기 3단계 우선순위 가드 (Capacitor App)
// 1순위: 현재 화면에 열린 모달/팝업/바텀시트만 닫기 (부모 화면·앱 이동 금지)
// 2순위: 닫을 오버레이가 없고 history.length > 1 이면 window.history.back()
// 3순위: 최상위(홈)에서는 토스트 안내 후 2초 내 재입력 시에만 App.exitApp()
// ============================================================================
(function initCapacitorBackButtonGuard() {
  if (typeof window === 'undefined') return;
  if (window.__okbmBackButtonGuardInitialized) return;
  window.__okbmBackButtonGuardInitialized = true;

  if (!Array.isArray(window.modalCloseStack)) window.modalCloseStack = [];
  if (typeof window.registerModalOpen !== 'function') {
    window.registerModalOpen = function(modalId, closeFn) {
      window.modalCloseStack = window.modalCloseStack.filter(function(m) { return m.id !== modalId; });
      window.modalCloseStack.push({ id: modalId, close: closeFn });
    };
  }
  if (typeof window.unregisterModalClose !== 'function') {
    window.unregisterModalClose = function(modalId) {
      window.modalCloseStack = window.modalCloseStack.filter(function(m) { return m.id !== modalId; });
    };
  }

  var SKIP_OVERLAY_IDS = {
    okbmSplashOverlay: 1,
    okbmExitToastBanner: 1,
    globalPhotoLoadingModal: 1,
    romanticMasterBottomDock: 1,
    videoDetailSheet: 1,
    mainDualDockContainer: 1
  };

  var PERSIST_OVERLAY_IDS = {
    loginModalOverlay: 1,
    userProfileModalOverlay: 1,
    userAccountSettingsModal: 1,
    videoDetailModal: 1,
    gearPresetModal: 1,
    gearDetailModal: 1,
    lntModalOverlay: 1,
    customModalOverlay: 1,
    romanticHistoryModal: 1,
    packShareModalOverlay: 1,
    photoStudioOverlay: 1
  };

  var NESTED_REPORT_IDS = {
    feedCustomShareModal: 1,
    modalRichAfterTrip: 1,
    tripActionActionSheet: 1,
    singleTripFeedModal: 1,
    userFeedCollectionModal: 1,
    pastTripsListModal: 1,
    followedRoutersModal: 1,
    savedFeedsListModal: 1,
    savedFeedsEmptyModal: 1,
    userAccountSettingsModal: 1
  };

  function callWin(name) {
    var fn = window[name];
    if (typeof fn === 'function') {
      fn();
      return true;
    }
    return false;
  }

  function hideOrRemove(el) {
    if (!el) return;
    if (el.id && PERSIST_OVERLAY_IDS[el.id]) {
      el.style.setProperty('display', 'none', 'important');
      el.classList.remove('open', 'active');
      return;
    }
    if (el.parentNode) el.remove();
  }

  function isOverlayVisible(el) {
    if (!el || !el.isConnected) return false;
    if (el.id && SKIP_OVERLAY_IDS[el.id]) return false;
    if (el.classList.contains('okbm-splash')) return false;
    if (el.classList.contains('mobile-bottom-sheet') && !el.classList.contains('open')) return false;
    if (el.classList.contains('pc-sliding-drawer') && !el.classList.contains('open')) return false;
    if (el.classList.contains('calc-slide-sheet') && !el.classList.contains('active')) return false;
    var cs = window.getComputedStyle(el);
    if (!cs || cs.display === 'none') return false;
    if (cs.visibility === 'hidden') return false;
    var opacity = parseFloat(cs.opacity);
    if (!isNaN(opacity) && opacity === 0 && cs.pointerEvents === 'none') return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    if (rect.bottom < 2 || rect.top > (window.innerHeight - 2)) return false;
    if (rect.right < 2 || rect.left > (window.innerWidth - 2)) return false;
    return true;
  }

  function closeNestedReportLayer(el) {
    if (el && el.id === 'userAccountSettingsModal') {
      el.style.display = 'none';
    }
    if (typeof window.goBackModal === 'function') {
      try {
        window.goBackModal();
        return true;
      } catch (e) {}
    }
    if (el) hideOrRemove(el);
    return true;
  }

  function getKnownModalClosers() {
    function removeEl(el) { if (el) el.remove(); }
    return [
      { id: 'romanticConfirmModal', close: removeEl },
      { id: 'romanticDatePickerModal', close: removeEl },
      { id: 'pastTripDatePickerModal', close: removeEl },
      { id: 'tripDatePickerModal', close: removeEl },
      { id: 'planYearPickerOverlay', close: removeEl },
      { id: 'datePickGuideHud', close: removeEl },
      { id: 'datePickGuideModal', close: removeEl },
      { id: 'confirmDestinationDateModal', close: removeEl },
      { id: 'presetActionModal', close: removeEl },
      { id: 'gearMetaEditSheet', close: removeEl },
      { id: 'ugcSafetyMenuSheet', close: removeEl },
      { id: 'readyShotShareSheet', close: function() { callWin('closeReadyShotShareSheet') || hideOrRemove(document.getElementById('readyShotShareSheet')); } },
      { id: 'readyShotFrameOverlay', close: function() {
        if (typeof window.closeReadyShotFrameModal === 'function') window.closeReadyShotFrameModal(true);
        else hideOrRemove(document.getElementById('readyShotFrameOverlay'));
      } },
      { id: 'calcTripDateDropdown', close: function(el) { el.style.display = 'none'; } },
      { id: 'calcPackedItemsPopover', close: function(el) { el.style.display = 'none'; } },
      { id: 'calcPresetBackdrop', close: function() { if (!callWin('closeQuickPresetPicker')) hideOrRemove(document.getElementById('calcPresetSlideSheet')); } },
      { id: 'calcPresetSlideSheet', close: function() { if (!callWin('closeQuickPresetPicker')) hideOrRemove(document.getElementById('calcPresetSlideSheet')); } },
      { id: 'planBookmarkSlideSheet', close: function() { if (!callWin('closeBookmarksBottomSheet')) hideOrRemove(document.getElementById('planBookmarkSlideSheet')); } },
      { id: 'pinPickerBanner', close: function() { if (!callWin('cancelPinPicking')) hideOrRemove(document.getElementById('pinPickerBanner')); } },
      { id: 'feedReportModal', close: function(el) { if (!callWin('closeFeedReportModal')) hideOrRemove(el); } },
      { id: 'feedReportReasonModal', close: function(el) { if (!callWin('closeFeedReportModal')) hideOrRemove(el); } },
      { id: 'romanticInterestModal', close: removeEl },
      { id: 'clearMapModal', close: removeEl },
      { id: 'lntModalOverlay', close: function(el) { el.style.display = 'none'; } },
      { id: 'customModalOverlay', close: function(el) { if (!callWin('closeCustomModal')) el.style.display = 'none'; } },
      { id: 'quickGearDetailModal', close: removeEl },
      { id: 'gearDetailModal', close: function() { if (!callWin('closeGearDetailModal')) hideOrRemove(document.getElementById('gearDetailModal')); } },
      { id: 'calcSpotSearchModal', close: removeEl },
      { id: 'pastTripSpotSearchModal', close: removeEl },
      { id: 'pastTripSpotChoiceOverlay', close: removeEl },
      { id: 'richSpotRegisterChoiceOverlay', close: removeEl },
      { id: 'planSpotRegisterChoiceOverlay', close: removeEl },
      { id: 'richTripSpotSearchModal', close: removeEl },
      { id: 'coverPhotoCropperModal', close: removeEl },
      { id: 'masterCoverLargeViewerModal', close: removeEl },
      { id: 'reportSnsEditorModalOverlay', close: removeEl },
      { id: 'reportBioEditorModalOverlay', close: removeEl },
      { id: 'blockedUsersManageModal', close: removeEl },
      { id: 'adminReportInspectorModal', close: removeEl },
      { id: 'userNotificationInboxModal', close: function(el) { if (!callWin('closeUserNotificationInboxModal')) hideOrRemove(el); } },
      { id: 'directMessageThreadModal', close: function() { if (!callWin('closeDirectMessageModals')) hideOrRemove(document.getElementById('directMessageThreadModal')); } },
      { id: 'feedCustomShareModal', close: closeNestedReportLayer },
      { id: 'modalRichAfterTrip', close: closeNestedReportLayer },
      { id: 'tripActionActionSheet', close: closeNestedReportLayer },
      { id: 'singleTripFeedModal', close: closeNestedReportLayer },
      { id: 'userFeedCollectionModal', close: closeNestedReportLayer },
      { id: 'pastTripRegisterModal', close: function() { if (!callWin('closePastTripRegisterModal')) hideOrRemove(document.getElementById('pastTripRegisterModal')); } },
      { id: 'pastTripsListModal', close: closeNestedReportLayer },
      { id: 'followedRoutersModal', close: closeNestedReportLayer },
      { id: 'savedFeedsListModal', close: closeNestedReportLayer },
      { id: 'savedFeedsEmptyModal', close: closeNestedReportLayer },
      { id: 'userAccountSettingsModal', close: function() { if (!callWin('closeAccountSettingsModal')) closeNestedReportLayer(document.getElementById('userAccountSettingsModal')); } },
      { id: 'mapSpotFeedDetailModal', close: removeEl },
      { id: 'templateCardModalOverlay', close: function(el) { if (!callWin('closeCurrentTemplateModal')) hideOrRemove(el); } },
      { id: 'gearPresetModal', close: function() { if (!callWin('closeGearPresetModal')) hideOrRemove(document.getElementById('gearPresetModal')); } },
      { id: 'photoStudioOverlay', close: function() { if (!callWin('closePhotoStudio')) hideOrRemove(document.getElementById('photoStudioOverlay')); } },
      { id: 'packShareModalOverlay', close: function() { if (!callWin('closePackShareModal')) hideOrRemove(document.getElementById('packShareModalOverlay')); } },
      { id: 'videoDetailModal', close: function() { if (!callWin('closeVideoDetailModal')) hideOrRemove(document.getElementById('videoDetailModal')); } },
      { id: 'secretSpotHeroModal', close: function() { if (!callWin('closeSecretSpotHeroModal')) hideOrRemove(document.getElementById('secretSpotHeroModal')); } },
      { id: 'themeSpotAllModal', close: function() { if (!callWin('closeThemeSpotAllModal')) hideOrRemove(document.getElementById('themeSpotAllModal')); } },
      { id: 'tripDetailSheetModal', close: function() { if (!callWin('closeTripDetailModal')) hideOrRemove(document.getElementById('tripDetailSheetModal')); } },
      { id: 'tripCreateModal', close: function() { if (!callWin('closeTripCreateModal')) hideOrRemove(document.getElementById('tripCreateModal')); } },
      { id: 'tripJoinListModal', close: function(el) { if (!callWin('closeTripJoinListModal')) hideOrRemove(el); } },
      { id: 'tripUserProfileModal', close: function() { if (!callWin('closeTripAuthorProfile')) hideOrRemove(document.getElementById('tripUserProfileModal')); } },
      { id: 'loginModalOverlay', close: function() { if (!callWin('closeLoginModal')) hideOrRemove(document.getElementById('loginModalOverlay')); } },
      { id: 'mobileBottomSheet', close: function(el) { if (!callWin('closeMobileBottomSheet')) el.classList.remove('open'); } },
      { id: 'pcSlidingDrawer', close: function(el) { if (!callWin('closePcSlidingDrawer')) el.classList.remove('open'); } },
      { id: 'spotDetailSheet', close: function(el) { if (!callWin('closeSpotDetailSheet')) hideOrRemove(el); } },
      { id: 'spotDrawer', close: function(el) { if (!callWin('closeSpotDrawer')) hideOrRemove(el); } },
      { id: 'romanticTripPhotosModal', close: function(el) { if (!callWin('closeTripPhotosModal')) hideOrRemove(el); } },
      { id: 'romanticGearBoxModal', close: function(el) { if (!callWin('closeGearBoxModal')) hideOrRemove(el); } },
      { id: 'romanticMyListModal', close: function(el) { if (!callWin('closeMyListModal')) hideOrRemove(el); } },
      { id: 'romanticPlanModal', close: function() { if (!callWin('closePlanModal')) hideOrRemove(document.getElementById('romanticPlanModal')); } },
      { id: 'romanticHistoryModal', close: function() { if (!callWin('closeHistoryModal')) hideOrRemove(document.getElementById('romanticHistoryModal')); } },
      { id: 'userProfileModalOverlay', close: function() { if (!callWin('closeUserProfileModal')) hideOrRemove(document.getElementById('userProfileModalOverlay')); } }
    ];
  }

  function dismissGenericOverlay(ov) {
    if (!ov || (ov.id && SKIP_OVERLAY_IDS[ov.id])) return false;
    if (typeof ov.onclick === 'function') {
      try {
        ov.onclick({ target: ov, currentTarget: ov, preventDefault: function() {}, stopPropagation: function() {} });
        return true;
      } catch (e) {}
    }
    var closeBtn = ov.querySelector('.close-modal, .btn-close, .template-modal-close-btn, .fixed-floating-close-btn, .circle-icon-btn, [data-dismiss="modal"], [onclick*="close"], [onclick*="Close"], [onclick*="remove()"]');
    if (closeBtn && typeof closeBtn.click === 'function') {
      closeBtn.click();
      return true;
    }
    hideOrRemove(ov);
    return true;
  }

  function unregisterClosed(modalId) {
    if (modalId && typeof window.unregisterModalClose === 'function') {
      try { window.unregisterModalClose(modalId); } catch (e) {}
    }
  }

  function tryCloseTopmostModal() {
    var known = getKnownModalClosers();
    var i;
    for (i = 0; i < known.length; i++) {
      var item = known[i];
      var el = document.getElementById(item.id);
      if (!el || !isOverlayVisible(el)) continue;
      try {
        item.close(el);
        unregisterClosed(item.id);
        return true;
      } catch (e) {}
    }

    var extras = document.querySelectorAll('.custom-modal-overlay, .modal-fullscreen-container, .modal-overlay, .modal-backdrop, .calc-slide-sheet.active, .mobile-bottom-sheet.open, .pc-sliding-drawer.open, [role="dialog"]');
    for (i = extras.length - 1; i >= 0; i--) {
      var ov = extras[i];
      if (!isOverlayVisible(ov)) continue;
      if (ov.id && SKIP_OVERLAY_IDS[ov.id]) continue;
      try {
        if (dismissGenericOverlay(ov)) {
          unregisterClosed(ov.id);
          return true;
        }
      } catch (e) {}
    }

    if (window.modalCloseStack && window.modalCloseStack.length > 0) {
      while (window.modalCloseStack.length > 0) {
        var top = window.modalCloseStack[window.modalCloseStack.length - 1];
        var stackedEl = top && top.id ? document.getElementById(top.id) : null;
        if (stackedEl && !isOverlayVisible(stackedEl)) {
          window.modalCloseStack.pop();
          continue;
        }
        var popped = window.modalCloseStack.pop();
        if (popped && typeof popped.close === 'function') {
          try {
            popped.close();
            return true;
          } catch (e) {}
        }
      }
    }

    return false;
  }
  window.tryCloseAnyVisibleModal = tryCloseTopmostModal;
  window.tryCloseTopmostModal = tryCloseTopmostModal;
  window.NESTED_REPORT_IDS = NESTED_REPORT_IDS;

  function showExitNotice(msg) {
    if (typeof showToast === 'function') {
      showToast(msg, 'info', 2000);
      return;
    }
    var existing = document.getElementById('okbmExitToastBanner');
    if (existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'okbmExitToastBanner';
    banner.textContent = msg;
    banner.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.95); color:#ffffff; font-size:13px; font-weight:700; padding:10px 20px; border-radius:24px; z-index:9999999; box-shadow:0 4px 18px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.18); pointer-events:none; transition:opacity 0.25s ease;';
    document.body.appendChild(banner);
    setTimeout(function() {
      if (banner && banner.parentNode) {
        banner.style.opacity = '0';
        setTimeout(function() { banner.remove(); }, 300);
      }
    }, 2000);
  }

  function getCapacitorAppPlugin() {
    var cap = window.Capacitor || {};
    var plugins = cap.Plugins || {};
    return plugins.App || cap.App || window.App || null;
  }

  function shouldGoBackInWebHistory(data) {
    var hasJsHistory = !!(window.history && typeof window.history.length === 'number' && window.history.length > 1);
    if (!hasJsHistory) return false;
    if (data && typeof data.canGoBack === 'boolean') return !!data.canGoBack;
    return true;
  }

  function registerCapacitorBackHandler() {
    if (window.__okbmBackButtonListenerAttached) return true;
    var App = getCapacitorAppPlugin();
    if (!App || typeof App.addListener !== 'function') return false;

    var lastBackTime = 0;
    App.addListener('backButton', function(data) {
      window.__okbmHandlingHardwareBack = true;
      try {
        if (tryCloseTopmostModal()) return;

        if (shouldGoBackInWebHistory(data)) {
          window.history.back();
          return;
        }

        var currentTime = Date.now();
        if (currentTime - lastBackTime < 2000) {
          if (typeof App.exitApp === 'function') App.exitApp();
        } else {
          lastBackTime = currentTime;
          if (typeof triggerHaptic === 'function') triggerHaptic(12);
          showExitNotice('뒤로가기 버튼을 한 번 더 누르면 종료됩니다');
        }
      } finally {
        setTimeout(function() { window.__okbmHandlingHardwareBack = false; }, 80);
      }
    });
    window.__okbmBackButtonListenerAttached = true;
    return true;
  }

  // ☀️ [스마트폰 상태바 텍스트/아이콘 순백색(White) 강제 고정 엔진]
  // Capacitor: DARK = 어두운 배경용 흰 아이콘 / LIGHT = 밝은 배경용 검정 아이콘
  function configureCapacitorStatusBar() {
    function applyStatusBarStyles() {
      var plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
      var StatusBar = plugins.StatusBar || window.StatusBar;
      var SystemBars = plugins.SystemBars;

      try {
        // Capacitor 8+ SystemBars (Android 15+ 권장 경로)
        if (SystemBars && typeof SystemBars.setStyle === 'function') {
          SystemBars.setStyle({ style: 'DARK' }).catch(function() {});
        }

        if (!StatusBar) return;

        // 네이티브 edge-to-edge와 맞춤: 웹뷰가 상태바 아래까지 그려지고, CSS scrim이 검정 배경 담당
        if (typeof StatusBar.setOverlaysWebView === 'function') {
          StatusBar.setOverlaysWebView({ overlay: true }).catch(function() {});
        }
        // 순백색 아이콘/텍스트 강제 (검정 노치에서 시간·안테나 보이게)
        if (typeof StatusBar.setStyle === 'function') {
          StatusBar.setStyle({ style: 'DARK' }).catch(function() {});
        }
      } catch (e) {
        console.warn('[configureCapacitorStatusBar]', e);
      }
    }

    applyStatusBarStyles();
    setTimeout(applyStatusBarStyles, 100);
    setTimeout(applyStatusBarStyles, 500);
    setTimeout(applyStatusBarStyles, 1200);
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) applyStatusBarStyles();
    });
    window.addEventListener('focus', applyStatusBarStyles);
  }

  function bootBackHandler() {
    if (registerCapacitorBackHandler()) return;
    var attempts = 0;
    var timer = setInterval(function() {
      attempts += 1;
      if (registerCapacitorBackHandler() || attempts >= 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      bootBackHandler();
      configureCapacitorStatusBar();
    });
  } else {
    bootBackHandler();
    configureCapacitorStatusBar();
  }
})();

