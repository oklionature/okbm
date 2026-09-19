(function okbmStashNaverOAuthHash() {
  try {
    var raw = String(window.location.hash || '').replace(/^#/, '');
    if (!raw || raw.indexOf('access_token=') === -1) return;
    var params = {};
    raw.split('&').forEach(function(part) {
      if (!part) return;
      var idx = part.indexOf('=');
      var key = decodeURIComponent((idx >= 0 ? part.slice(0, idx) : part).replace(/\+/g, ' '));
      var val = decodeURIComponent((idx >= 0 ? part.slice(idx + 1) : '').replace(/\+/g, ' '));
      params[key] = val;
    });
    var savedState = '';
    try { savedState = sessionStorage.getItem('okbm_naver_oauth_state') || ''; } catch (e) {}
    if (!params.access_token || !params.state || !savedState || params.state !== savedState) return;
    if (params.refresh_token) return;
    try { sessionStorage.setItem('okbm_naver_oauth_token', params.access_token); } catch (e) {}
    if (window.history && typeof history.replaceState === 'function') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    } else {
      window.location.hash = '';
    }
  } catch (e) {}
})();

var SUPABASE_URL = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudW1mZWN5dGh0cXRyeGVhc3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyOTEwOTgsImV4cCI6MjEwNDg2NzA5OH0.x0fzy78Bm_xm8ls3AM1dpykfmkMAPtFK7YCjwFeCfuE';
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
var NAVER_CLIENT_ID = 'FKh1hhDec4_gsz8O90Fm';
window.NAVER_CLIENT_ID = NAVER_CLIENT_ID;
var R2_PUBLIC_DOMAIN = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
window.R2_PUBLIC_DOMAIN = R2_PUBLIC_DOMAIN;

if (window.supabase && typeof window.supabase.createClient === 'function' && !window.supabaseClient) {
  var okbmLoopbackHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: true,
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

// [공통 유틸] 안전한 토스트 메시지 출력 (매개변수 타입 자동 감지 보정 & 눈부심 제로 파스텔 규격)
function showToast(msg, typeOrDuration, maybeDuration) {
  var dur = 2500;
  var toastType = 'info';

  if (typeof typeOrDuration === 'number') {
    dur = typeOrDuration;
  } else if (typeof typeOrDuration === 'string') {
    toastType = typeOrDuration;
    if (typeof maybeDuration === 'number') dur = maybeDuration;
  } else if (typeof maybeDuration === 'number') {
    dur = maybeDuration;
  }

  var toastEl = document.getElementById('appToast');
  if (toastEl) {
    toastEl.innerHTML = msg;
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
  toast.innerHTML = msg;
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(function() { toast.remove(); }, 260);
  }, dur);
}

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
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function okbmGetCurrentUserId() {
  var profile = safeGetJSON('user_profile', null);
  var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
  if (!myId || myId === 'guest' || myId === 'null' || myId === 'undefined') return '';
  return myId;
}

function okbmUgcRestHeaders() {
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  return {
    'apikey': targetKey,
    'Authorization': 'Bearer ' + targetKey,
    'Content-Type': 'application/json'
  };
}

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
  var profile = safeGetJSON('user_profile', null);
  var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
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

    if (serverIds.length === 0 && !localStorage.getItem('okbm_user_blocks_bootstrapped')) {
      var legacyIds = okbmGetIdList('okbm_blocked_users');
      var legacyMeta = window.getBlockedUsersMeta();
      if (legacyIds.length > 0) {
        for (var i = 0; i < legacyIds.length; i++) {
          var legacyId = String(legacyIds[i] || '').trim();
          if (!legacyId) continue;
          await fetch(targetUrl + '/rest/v1/user_blocks', {
            method: 'POST',
            headers: Object.assign({}, okbmUgcRestHeaders(), { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
            body: JSON.stringify({
              blocker_id: blockerId,
              blocked_id: legacyId,
              blocked_nickname: String(legacyMeta[legacyId] || '').trim() || null
            })
          }).catch(function(bootErr) {
            console.warn('[romantic-sync.js:syncMyUserBlocksFromServer bootstrap]', bootErr);
          });
        }
        try { localStorage.setItem('okbm_user_blocks_bootstrapped', '1'); } catch (e) {}
        return window.syncMyUserBlocksFromServer();
      }
      try { localStorage.setItem('okbm_user_blocks_bootstrapped', '1'); } catch (e) {}
    }

    var prev = window.getBlockedUserIds().join('|');
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
    var postRes = await fetch(targetUrl + '/rest/v1/user_blocks', {
      method: 'POST',
      headers: Object.assign({}, okbmUgcRestHeaders(), { 'Prefer': 'resolution=merge-duplicates,return=representation' }),
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
    var delRes = await fetch(
      targetUrl + '/rest/v1/user_blocks?blocker_id=eq.' + encodeURIComponent(blockerId) + '&blocked_id=eq.' + encodeURIComponent(targetId),
      {
        method: 'DELETE',
        headers: Object.assign({}, okbmUgcRestHeaders(), { 'Prefer': 'return=representation' })
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
  var profile = safeGetJSON('user_profile', null);
  var reporterId = (profile && profile.id) ? String(profile.id).trim() : '';
  if (!reporterId) return false;

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;

  try {
    var res = await fetch(targetUrl + '/rest/v1/feed_reports?reporter_id=eq.' + encodeURIComponent(reporterId) + '&select=feed_id,status', {
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey
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
  var profile = safeGetJSON('user_profile', null);
  var reporterId = (profile && profile.id) ? String(profile.id).trim() : '';
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
      var postRes = await fetch(targetUrl + '/rest/v1/feed_reports', {
        method: 'POST',
        headers: {
          'apikey': targetKey,
          'Authorization': 'Bearer ' + targetKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (postRes.ok) {
        serverOk = true;
      } else if (postRes.status === 409 && reporterId) {
        var patchRes = await fetch(
          targetUrl + '/rest/v1/feed_reports?feed_id=eq.' + encodeURIComponent(sFeedId) + '&reporter_id=eq.' + encodeURIComponent(reporterId),
          {
            method: 'PATCH',
            headers: {
              'apikey': targetKey,
              'Authorization': 'Bearer ' + targetKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
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

window.okbmRefreshAdminFlagFromServer = async function() {
  var userId = okbmGetCurrentUserId();
  if (!userId) {
    window.__okbmIsAdmin = false;
    return false;
  }
  try {
    var row = await okbmFindUserById(userId);
    window.__okbmIsAdmin = !!(row && row.is_admin === true);
  } catch (e) {
    window.__okbmIsAdmin = false;
  }
  return window.__okbmIsAdmin === true;
};

window.okbmFetchFeedById = async function(feedId) {
  var sId = String(feedId || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!sId || !targetUrl || !targetKey) return null;
  try {
    var res = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId) + '&select=*&limit=1', {
      headers: okbmUgcRestHeaders()
    });
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
}

window.openAdminReportInspector = async function() {
  triggerHaptic(10);
  if (!(await window.okbmRefreshAdminFlagFromServer())) return;

  var old = document.getElementById('adminReportInspectorModal');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'adminReportInspectorModal';
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); z-index:2147483645 !important; background:#000000; display:flex; justify-content:center; align-items:stretch;';
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
  }
  if (!del.ok && del.error !== 'ZERO_ROWS_DELETED') {
    if (typeof showToast === 'function') showToast('삭제에 실패했습니다.', 'error');
    return;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (targetUrl && targetKey) {
    try {
      await fetch(targetUrl + '/rest/v1/feed_reports?feed_id=eq.' + encodeURIComponent(sId) + '&status=eq.pending', {
        method: 'PATCH',
        headers: Object.assign({}, okbmUgcRestHeaders(), { 'Prefer': 'return=minimal' }),
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
    var res = await fetch(targetUrl + '/rest/v1/feed_reports?id=eq.' + encodeURIComponent(sId), {
      method: 'PATCH',
      headers: Object.assign({}, okbmUgcRestHeaders(), { 'Prefer': 'return=representation' }),
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
    ? 'background:rgba(0,0,0,0.45); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.2); color:#ffffff; height:28px; border-radius:14px; font-size:0.62rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0 9px;'
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
      '<img data-user-avatar-id="' + safeId + '" src="' + (hasImg ? okbmEscapeUgcAttr(photo) : '') + '" alt="" style="width:100%; height:100%; object-fit:cover; display:' + (hasImg ? 'block' : 'none') + ';" onerror="this.style.display=\'none\'; var p=this.parentElement && this.parentElement.querySelector(\'.avatar-placeholder-svg\'); if(p) p.style.display=\'block\';" />' +
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
  overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); z-index:2147483644 !important; background:#000000; display:flex; justify-content:center; align-items:stretch;';
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

window.executeCleanSlateMasterReset = async function(isSilent) {
  if (!isSilent && !confirm('주의: 모든 활동 기록이 영구 삭제됩니다.\n정말 초기화하시겠습니까?')) {
    return;
  }

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

  var profile = safeGetJSON('user_profile', null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || '');
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (userId && targetUrl && targetKey) {
    try {
      var resetRes = await fetch(targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(userId), {
        method: 'DELETE',
        headers: {
          'apikey': targetKey,
          'Authorization': 'Bearer ' + targetKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      if (!resetRes.ok) {
        console.error('[executeCleanSlateMasterReset] 서버 일괄 삭제 실패 status=' + resetRes.status);
      }
    } catch (resetErr) {
      console.error('[executeCleanSlateMasterReset] 서버 일괄 삭제 네트워크 예외:', resetErr);
    }
  }

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

if (typeof window !== 'undefined' && window.location.search.includes('clean_slate=true')) {
  setTimeout(function() {
    window.executeCleanSlateMasterReset(true);
  }, 300);
}

async function loadUserDataFromCloud(userId) {
  if (!userId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return null;

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
    var queryColumns = 'id,nickname,bio,hero_cover_url,photo_url,bookmarks,visited,memos,saved_feeds,following,my_gears,created_at,last_nickname_changed_at,is_admin';
    var res = await fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(String(userId).trim()) + '&select=' + queryColumns, {
      method: 'GET',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      var rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        var row = rows[0];
        var data = row.user_data || row.data || row;
        if (typeof okbmRepairKnownOwnerProfile === 'function') {
          data = okbmRepairKnownOwnerProfile(userId, data);
        }
        window.__okbmIsAdmin = data && data.is_admin === true;
        return data;
      }
    }
  } catch (e) { console.warn('[romantic-sync.js:loadUserDataFromCloud]', e); }
  return null;
}

// 2. 로그인 상태 검증 및 세션 체크
function isUserLoggedIn() {
  var token = localStorage.getItem('user_auth_token');
  var profile = safeGetJSON('user_profile', null);
  if (!token || !token.trim() || !profile || !profile.id) {
    if (typeof authState !== 'undefined') {
      authState.isLoggedIn = false;
      authState.userProfile = null;
    }
    return false;
  }

  var idStr = String(profile.id).trim();
  var hasValid = window.okbmHasSocialUserId(idStr);
  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = hasValid;
    authState.userProfile = hasValid ? profile : null;
  }
  return hasValid;
}

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
    var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
    var uid = (profile && profile.id) ? String(profile.id).trim() : String(localStorage.getItem('okbm_user_id') || '').trim();
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
    headers: {
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

    if (this.isHydrating && key === 'okbm_selected_gears_multi') {
      this._localGearsModifiedDuringHydration = true;
    }

    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { console.warn('[romantic-sync.js:RomanticVault.write]', e); }

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
    var hydrationStartTime = Date.now();
    try {
      var currentSessionId = String(userId).trim();
      var storedUserId = localStorage.getItem('okbm_user_id') || '';

      if (storedUserId && storedUserId !== currentSessionId) {
        window.__memoryStore = {};
        window.packingHistoryList = [];
        window.interactiveHistory = [];
      }

      var cloudData = await loadUserDataFromCloud(userId);
      if (!cloudData) {
        var localBookmarks = safeGetJSON('okbm_bookmarks', []);
        var localVisited = safeGetJSON('okbm_visited', []);
        var localMemos = safeGetJSON('okbm_memos', {});
        window.userBookmarks = new Set(localBookmarks.map(String));
        window.userVisited = new Set(localVisited.map(String));
        window.userMemos = localMemos;
        var localHist = safeGetJSON('okbm_packing_history', []);
        window.packingHistoryList = localHist;
        window.interactiveHistory = localHist;
        this.isHydrated = true;
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
          syncUserDataToCloud();
        }
        return null;
      }
      if (cloudData) {
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
          var localGearsMulti = this.read('okbm_selected_gears_multi', null);
          var hasLocalGearsChanged = localGearsMulti && Object.keys(localGearsMulti).length > 0 && this._localGearsModifiedDuringHydration;

          if (!hasLocalGearsChanged && (mg.selectedGears || mg.selected_gears)) {
            this.write('okbm_selected_gears_multi', mg.selectedGears || mg.selected_gears, false);
          }
          if (mg.favoriteGears || mg.favorite_gears) this.write('okbm_favorite_gears', mg.favoriteGears || mg.favorite_gears, false);
          if (mg.customGears || mg.custom_gears) this.write('okbm_custom_gears', mg.customGears || mg.custom_gears, false);
          if (mg.gearPresets || mg.gear_presets) this.write('okbm_gear_presets', mg.gearPresets || mg.gear_presets, false);
          if (mg.gearMeta || mg.gear_meta) this.write('okbm_gear_meta', mg.gearMeta || mg.gear_meta, false);

          var serverPlanMemos = mg.planMemos || mg.plan_memos;
          if (serverPlanMemos && typeof serverPlanMemos === 'object') {
            this.write('okbm_plan_memos', serverPlanMemos, false);
          }

          var serverPlanSpots = mg.planSpots || mg.plan_spots;
          if (serverPlanSpots && typeof serverPlanSpots === 'object') {
            this.write('okbm_plan_spots', serverPlanSpots, false);
          }

          var serverSns = mg.sns || {};
          var instaVal = String(cloudData.instagram || serverSns.instagram || '').trim();
          var ytVal = String(cloudData.youtube || serverSns.youtube || '').trim();
          var blogVal = String(cloudData.blog || serverSns.blog || '').trim();
          if (!instaVal && String(userId || '').trim() === 'kakao_5060259862') instaVal = 'oklionnature';

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
          if (String(userId || '').trim() === 'kakao_5060259862' && String(cloudData.nickname || '').trim() === '김사자') {
            cloudData.nickname = '오라네';
          }
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
      }
      return cloudData;
    } catch(e) {
      console.warn('[romantic-sync.js:RomanticVault.hydrateFromServer]', e);
      return null;
    } finally {
      this.isHydrating = false;
      if (this._pendingCloudSync) {
        this._pendingCloudSync = false;
        syncUserDataToCloud();
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.__okbmBlockedUsersCache = okbmGetIdList('okbm_blocked_users');
  window.__okbmBlockedUsersMetaCache = (function() {
    var meta = safeGetJSON('okbm_blocked_users_meta', {});
    return (meta && typeof meta === 'object' && !Array.isArray(meta)) ? meta : {};
  })();
  setTimeout(function() {
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
      var profile = safeGetJSON('user_profile', null);
      var uId = (profile && profile.id) ? String(profile.id).trim() : localStorage.getItem('user_auth_token');
      if (uId && window.RomanticVault) {
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
    }
  }, 100);
}

function syncUserDataToCloud(isPackHistoryUpdated, immediate) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = profile && profile.id ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || localStorage.getItem('user_auth_token'));
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

window.fetchMasterSpotsFromSupabase = async function(isForce) {
  var cached = safeGetJSON('okbm_master_spots', null) || safeGetJSON('okbm_spots_cache', null);
  if (!isForce && Array.isArray(cached) && cached.length > 0) {
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_master_spots'] = cached;
    window.SPOTS_MASTER = cached;
    return cached;
  }

  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return cached;

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 6000);
    var res = await fetch(targetUrl + '/rest/v1/spots?select=id,spot_main,spot_sub,name,fullname,region,city_name,lat,lng,elevation,difficulty,distance,terrain,desc_summary,trailhead_name,trailhead_addr&order=id.asc', {
      method: 'GET',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      var spots = await res.json();
      if (Array.isArray(spots) && spots.length > 0) {
        localStorage.setItem('okbm_master_spots', JSON.stringify(spots));
        localStorage.setItem('okbm_spots_cache', JSON.stringify(spots));
        window.__memoryStore = window.__memoryStore || {};
        window.__memoryStore['okbm_master_spots'] = spots;
        window.SPOTS_MASTER = spots;
        if (typeof window.renderSpots === 'function') {
          window.renderSpots();
        }
        return spots;
      }
    }
  } catch (e) { console.warn('[romantic-sync.js:fetchMasterSpotsFromSupabase]', e); }

  return cached;
};

window.fetchMasterGearsFromSupabase = async function(isForce) {
  if (typeof window.loadGearDbFromGoogleSheet === 'function') {
    return window.loadGearDbFromGoogleSheet(isForce);
  }

  var CURRENT_GEAR_VERSION = '20260917_CLEAN_1621';
  var storedVer = localStorage.getItem('okbm_gear_version');
  if (storedVer !== CURRENT_GEAR_VERSION) {
    localStorage.removeItem('okbm_master_gears');
    localStorage.removeItem('okbm_master_gears_cache');
    isForce = true;
  }

  var cachedGears = safeGetJSON('okbm_master_gears', null);
  if (!isForce && Array.isArray(cachedGears) && cachedGears.length > 0) {
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_master_gears'] = cachedGears;
    window.GEARS_MASTER = cachedGears;
    return cachedGears;
  }

  // 1차 시도: 정적 JSON 파일 로드 (Supabase API 호출 0건)
  try {
    var sRes = await fetch('gears_master.json?v=' + CURRENT_GEAR_VERSION);
    if (sRes.ok) {
      var sData = await sRes.json();
      if (Array.isArray(sData) && sData.length > 0) {
        localStorage.setItem('okbm_master_gears', JSON.stringify(sData));
        localStorage.setItem('okbm_gear_version', CURRENT_GEAR_VERSION);
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
        headers: {
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
      localStorage.setItem('okbm_master_gears', JSON.stringify(allGears));
      localStorage.setItem('okbm_gear_version', CURRENT_GEAR_VERSION);
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

window.fetchRankingsFromSupabase = async function() {
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
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (usersRes.ok) {
      result.topUsers = await usersRes.json();
    }

    window.__cachedRankings = result;
    window.dispatchEvent(new CustomEvent('okbm_rankings_updated', { detail: result }));
  } catch (e) { console.warn('[romantic-sync.js:fetchRankingsFromSupabase]', e); }

  return result;
};

if (typeof window !== 'undefined') {
  setTimeout(function() {
    window.fetchMasterSpotsFromSupabase();
    window.fetchMasterGearsFromSupabase();
    window.fetchRankingsFromSupabase();
    if (typeof trackDailyVisit === 'function') trackDailyVisit();
  }, 350);

  window.addEventListener('online', function() {
    updateHeaderAuthUI();
    window.fetchMasterSpotsFromSupabase();
    window.fetchMasterGearsFromSupabase();
    window.fetchRankingsFromSupabase();
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
  var profile = safeGetJSON('user_profile', null);
  var curUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '').trim();
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
    if (!r || r.isDeleted === true) return;
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

  var profile = safeGetJSON('user_profile', null);
  var curUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '').trim();
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  if (curUserId && targetUrl && targetKey) {
    fetch(targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(curUserId) + '&select=id,date', {
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
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
      var serverRows = data.rows;
      var serverTotalCount = data.total || serverRows.length;
      if (serverTotalCount > validLogs.length) {
        if (tEl) tEl.innerText = serverTotalCount;
        var serverYearCount = serverRows.filter(function(r) { return String(r.date || '').includes(curYear); }).length;
        if (yEl && serverYearCount > 0) yEl.innerText = serverYearCount;
      }
    }).catch(function() {});
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
    var rawInsta = localStorage.getItem('okbm_user_instagram') || '';
    var rawYt = localStorage.getItem('okbm_user_youtube') || '';
    var rawBlog = localStorage.getItem('okbm_user_blog') || '';
    var rawSns = localStorage.getItem('okbm_user_sns_channel') || '';

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
  if (instaTarget) {
    badges.push('<a href="' + instaTarget + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="인스타그램"><svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>');
  }

  if (ytTarget) {
    badges.push('<a href="' + ytTarget + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="유튜브"><svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#f43f5e"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff"/></svg></a>');
  }

  if (blogTarget) {
    badges.push('<a href="' + blogTarget + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:24px; height:24px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0;" title="네이버 블로그"><svg viewBox="0 0 24 24" style="width:12px; height:12px;" fill="none"><path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" fill="#03c75a"/></svg></a>');
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
  var isOwner = Boolean(config && config.isOwner);
  var nick = String((config && config.nickname) || (isOwner ? '야영자' : '루터')).trim();
  var bio = String((config && config.bio) || '').trim();
  var photoUrl = (config && config.photoUrl && String(config.photoUrl).startsWith('http')) ? String(config.photoUrl).trim() : '';
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

  var avatarClickAttr = isOwner
    ? 'onclick="triggerHaptic(12); window.openAccountSettingsModal();" title="설정"'
    : (photoUrl ? 'onclick="triggerHaptic(10); if(window.previewMasterUserCoverPhotoLarge){ window.previewMasterUserCoverPhotoLarge(); }"' : '');
  var avatarCursor = (isOwner || photoUrl) ? 'cursor:pointer; ' : '';

  var avatarImgHtml = photoUrl
    ? '<div class="user-profile-avatar-img" style="width:100%; height:100%; border-radius:50%; background:#121212; background-size:cover; background-position:center; background-repeat:no-repeat; background-image:url(\'' + photoUrl + '\'); display:flex; align-items:center; justify-content:center; overflow:hidden;"></div>'
    : '<div class="user-profile-avatar-img" style="width:100%; height:100%; border-radius:50%; background:#121212; display:flex; align-items:center; justify-content:center; overflow:hidden;"><svg viewBox="0 0 24 24" style="width:34px; height:34px;" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';

  var actionGridHtml = '';
  if (isOwner) {
    actionGridHtml = '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">' +
      '<button type="button" onclick="triggerHaptic(8); window.openMyPastTripsFromReport();" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>모아보기</span>' +
      '</button>' +
      '<button type="button" onclick="triggerHaptic(8); window.openRoutersInterestFromReport();" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>관심루터</span>' +
      '</button>' +
      '<button type="button" onclick="triggerHaptic(8); window.openFeedsInterestFromReport();" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:7px 0; color:#e2e8f0; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px;">' +
        '<span>관심피드</span>' +
      '</button>' +
    '</div>';
  }

  var cardPaddingBottom = actionGridHtml ? '14px' : '16px';
  var cardGap = actionGridHtml ? '12px' : '0px';

  return '<div class="unified-user-profile-header-card" style="flex-shrink:0; width:100%; background:#000000; border-bottom:1px solid rgba(255,255,255,0.08); padding:16px 16px ' + cardPaddingBottom + ' 16px; box-sizing:border-box; z-index:50; display:flex; flex-direction:column; gap:' + cardGap + ';">' +
    '<div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">' +
      '<div style="flex:1 1 0%; min-width:0; display:flex; flex-direction:column; gap:6px;">' +
        '<div ' + bioClickAttr + ' style="' + bioCursor + 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:9px 10px; min-height:68px; box-sizing:border-box; display:flex; align-items:flex-start;">' +
          '<span class="user-profile-bio-span" style="font-size:0.75rem; color:' + bioColor + '; line-height:1.45; word-break:break-all; min-height:4.35em; display:-webkit-box; -webkit-line-clamp:5; line-clamp:5; -webkit-box-orient:vertical; overflow:hidden;">' + bioText + '</span>' +
        '</div>' +
        '<div class="user-profile-sns-wrap" style="display:flex; align-items:center; gap:6px; min-height:26px;">' +
          snsHtml +
        '</div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; align-items:center; gap:6px; flex-shrink:0;">' +
        '<div ' + avatarClickAttr + ' style="' + avatarCursor + 'position:relative; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,0.12); padding:1.5px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.7);">' +
          avatarImgHtml +
        '</div>' +
        '<span class="user-profile-nick-span" style="font-size:0.88rem; font-weight:800; color:#ffffff; letter-spacing:-0.02em; max-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center;">' + nick + '</span>' +
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

// [상단 듀얼 카운터] 연도 선택 팝오버 토글러
window.toggleReportYearDropdown = function(e) {
  if (e) e.stopPropagation();
  triggerHaptic(8);
  var menu = document.getElementById('reportYearDropdownMenu');
  if (!menu) return;
  var isOpen = menu.style.display === 'flex';
  if (isOpen) {
    menu.style.display = 'none';
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
    return '<button type="button" onclick="window.selectReportYear(\'' + y + '\', event)" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(186,230,253,0.12)' : 'transparent') + '; color:' + (isSel ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 8px; font-size:0.62rem; font-weight:800; font-family:var(--font-en); border-radius:4px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">' +
      '<span>' + y + '년</span>' +
      (isSel ? '<span style="color:#bae6fd; font-size:0.55rem;">✓</span>' : '') +
    '</button>';
  }).join('');

  menu.style.display = 'flex';

  var closeHandler = function(ev) {
    if (!menu.contains(ev.target)) {
      menu.style.display = 'none';
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(function() {
    document.addEventListener('click', closeHandler);
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
    listEl.innerHTML = '<div style="font-size:0.54rem; color:#64748b; text-align:center; padding:10px 0;">기록이 없습니다.</div>';
    return;
  }

  listEl.innerHTML = yearLogs.map(function(r, idx) {
    var spotName = r.spot || r.spotName || '-';
    var dStr = String(r.date || '').slice(0, 10);

    return '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; border-radius:4px; background:rgba(255,255,255,0.02);">' +
      '<div style="display:flex; align-items:center; gap:5px; max-width:75%; overflow:hidden;">' +
        '<span style="font-size:0.52rem; color:#bae6fd; font-family:var(--font-en); font-weight:800; flex-shrink:0;">' + (idx + 1) + '.</span>' +
        '<span style="font-size:0.60rem; color:#e2e8f0; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + spotName + '</span>' +
      '</div>' +
      '<span style="font-size:0.52rem; color:#64748b; font-family:var(--font-en); flex-shrink:0;">' + dStr + '</span>' +
    '</div>';
  }).join('');
};

window.selectReportYear = function(yearStr, e) {
  if (e) e.stopPropagation();
  triggerHaptic(10);
  window._selectedReportYear = yearStr;

  var menu = document.getElementById('reportYearDropdownMenu');
  if (menu) menu.style.display = 'none';

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
    menu.style.display = 'none';
    return;
  }

  document.querySelectorAll('[id^="customDropdownMenu_"]').forEach(function(m) {
    m.style.display = 'none';
  });

  menu.style.display = 'flex';
  var closeHandler = function(ev) {
    if (!menu.contains(ev.target)) {
      menu.style.display = 'none';
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(function() {
    document.addEventListener('click', closeHandler);
  }, 10);
};

// 마이데이터 & 인증 모달 일원화 DOM 마운터
function ensureMyReportAndAuthModalsInDOM() {
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
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; color:#e2e8f0;">
            <svg viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
          </div>
          <div>
            <h3 style="color:#ffffff; font-size:1.02rem; font-weight:900; letter-spacing:-0.02em; margin:0;">낭만루트 로그인</h3>
            <p style="font-size:0.72rem; color:#94a3b8; line-height:1.4; margin-top:5px; margin-bottom:0; word-break:keep-all;">
              로그인후 낭만루트의 모든 기능을 이용하실수 있습니다.
            </p>
          </div>
          <div style="width:100%; display:flex; flex-direction:column; gap:7px; margin-top:6px;">
            <button type="button" class="modal-btn btn-social-apple" onclick="loginWithApple()" style="width:100%; height:34px !important; min-height:34px !important; border-radius:8px !important; font-size:0.76rem !important; font-weight:800 !important; padding:0 10px !important; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; background:#ffffff; color:#000000; border:none;">
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
        <div id="userProfileScrollBody" style="flex:1 1 0%; min-height:0; width:100%; overflow-y:auto; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:contain; padding:12px 12px 20px 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box; z-index:10;">
          
          <!-- 올해 vs 누적 활동 듀얼 카운터 -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; flex-shrink:0;">
            <div role="button" onclick="window.toggleReportYearActivities(event)" style="cursor:pointer; position:relative; background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; user-select:none;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span id="reportYearCardLabel" style="font-size:0.65rem; color:#64748b; font-weight:700;">올해 활동</span>
                <button type="button" id="reportYearBadgeBtn" onclick="event.stopPropagation(); window.toggleReportYearDropdown(event);" style="font-size:0.58rem; color:#bae6fd; font-family:var(--font-en); font-weight:800; background:rgba(186,230,253,0.08); border:1px solid rgba(186,230,253,0.25); padding:2px 7px; border-radius:5px; cursor:pointer; display:inline-flex; align-items:center; gap:3px; outline:none;">
                  <span id="reportYearBadge">2026</span>
                  <svg viewBox="0 0 24 24" style="width:9px; height:9px; stroke:#bae6fd; fill:none; stroke-width:2.5;"><path d="m6 9 6 6 6-6"/></svg>
                </button>
              </div>
              <div style="margin-top:4px; display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                  <span id="reportYearCountNumber" style="font-size:1.6rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1;">0</span>
                  <span style="font-size:0.75rem; font-weight:700; color:#7dd3fc; margin-left:2px;">회</span>
                </div>
                <span id="reportYearListArrow" style="font-size:0.52rem; color:#64748b; font-weight:800; margin-bottom:2px;">기록보기 ▼</span>
              </div>
              <div id="reportYearDropdownMenu" style="display:none; position:absolute; top:36px; right:10px; min-width:86px; max-height:180px; overflow-y:auto; background:#0d121d; border:1px solid rgba(186,230,253,0.25); border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.85); z-index:100; padding:4px; box-sizing:border-box; flex-direction:column; gap:2px;"></div>
            </div>

            <div style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.65rem; color:#64748b; font-weight:700;">누적 총 활동</span>
                <span style="font-size:0.56rem; color:#fde68a; font-weight:700; background:rgba(253,230,138,0.08); border:1px solid rgba(253,230,138,0.2); padding:1px 5px; border-radius:4px;">전체</span>
              </div>
              <div style="margin-top:4px;">
                <span id="reportTotalCountNumber" style="font-size:1.6rem; font-weight:900; color:#fde68a; font-family:var(--font-en); line-height:1;">0</span>
                <span style="font-size:0.75rem; font-weight:700; color:#fef08a; margin-left:2px;">회</span>
              </div>
            </div>
          </div>

          <!-- 선택 연도 활동 인라인 아코디언 패널 -->
          <div id="reportYearActivityContainer" style="display:none; flex-direction:column; gap:4px; background:#080b11; border:1px solid rgba(186,230,253,0.15); border-radius:10px; padding:8px 10px; box-sizing:border-box; flex-shrink:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06);">
              <span id="reportYearActivityTitle" style="font-size:0.58rem; color:#bae6fd; font-weight:800; font-family:var(--font-en);">활동 기록</span>
            </div>
            <div id="reportYearActivityList" style="display:flex; flex-direction:column; gap:2px; max-height:200px; overflow-y:auto; -webkit-overflow-scrolling:touch; padding-right:2px;"></div>
          </div>

          <!-- 0. 내가 제보한 박지 (등록 전 수정 기능) -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0;">
            <div role="button" data-sec="myprops" onclick="window.handleReportSecClick('myprops')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(56,189,248,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <span style="font-size:0.78rem; font-weight:700; color:#e2e8f0;">내가 제보한 박지</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderMyPropsStat" style="font-size:0.64rem; color:#38bdf8; font-weight:700; font-family:var(--font-en);">0곳</span>
                <span id="accArrow_myprops" style="font-size:0.58rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_myprops" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px;"></div>
          </div>

          <!-- 1. 장비 & 세팅 무게 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0;">
            <div role="button" data-sec="gear" onclick="window.handleReportSecClick('gear')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(167,243,208,0.08); display:flex; align-items:center; justify-content:center; color:#a7f3d0; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v6H6zM4 8h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/></svg>
                </div>
                <span style="font-size:0.78rem; font-weight:700; color:#e2e8f0;">장비 & 세팅 무게</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderGearStat" style="font-size:0.64rem; color:#a7f3d0; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_gear" style="font-size:0.58rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_gear" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px;"></div>
          </div>

          <!-- 2. 고도 & 필드 지형 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0;">
            <div role="button" data-sec="terrain" onclick="window.handleReportSecClick('terrain')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(186,230,253,0.08); display:flex; align-items:center; justify-content:center; color:#bae6fd; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                </div>
                <span style="font-size:0.78rem; font-weight:700; color:#e2e8f0;">고도 & 필드 지형</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderTerrainStat" style="font-size:0.64rem; color:#bae6fd; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_terrain" style="font-size:0.58rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_terrain" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px;"></div>
          </div>

          <!-- 3. 시즌 밸런스 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0;">
            <div role="button" data-sec="season" onclick="window.handleReportSecClick('season')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(253,230,138,0.08); display:flex; align-items:center; justify-content:center; color:#fde68a; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>
                </div>
                <span style="font-size:0.78rem; font-weight:700; color:#e2e8f0;">시즌 밸런스</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderSeasonStat" style="font-size:0.64rem; color:#fde68a; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_season" style="font-size:0.58rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_season" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px;"></div>
          </div>

          <!-- 4. 지역 분포 -->
          <div class="report-minimal-card" style="background:#080b11; border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; flex-shrink:0;">
            <div role="button" data-sec="region" onclick="window.handleReportSecClick('region')" style="padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:6px; background:rgba(233,213,255,0.08); display:flex; align-items:center; justify-content:center; color:#e9d5ff; flex-shrink:0;">
                  <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span style="font-size:0.78rem; font-weight:700; color:#e2e8f0;">지역 분포</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span id="reportHeaderRegionStat" style="font-size:0.64rem; color:#e9d5ff; font-weight:700; font-family:var(--font-en);"></span>
                <span id="accArrow_region" style="font-size:0.58rem; color:#475569; display:inline-block; transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="accBody_region" style="display:none; padding:0 10px 10px 10px; border-top:1px solid rgba(255,255,255,0.04); flex-direction:column; gap:6px;"></div>
          </div>

          <!-- 결산 카드 버튼 -->
          <button type="button" onclick="if(typeof openHistoryStudioModal==='function') openHistoryStudioModal(); else showToast('스튜디오 엔진 준비 중입니다.', 'info');" style="width:100%; height:44px; background:#080b11; border:1.5px solid rgba(186,230,253,0.3); border-radius:10px; color:#f1f5f9; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:4px; margin-bottom:12px; flex-shrink:0; box-shadow:0 4px 15px rgba(0,0,0,0.8);">
            <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:#bae6fd; fill:none; stroke-width:2;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>결산 카드 만들기</span>
          </button>

        </div>

       </div>
    </div>

    <!-- 3. 계정 관리 모달 -->
    <div class="custom-modal-overlay" id="userAccountSettingsModal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); background:#000000; z-index:2147483642 !important; justify-content:center; align-items:stretch; width:100%; height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); padding:0; overflow:hidden;">
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
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

// 0. 내가 제보한 박지 목록 렌더러 및 등록 전 수정/삭제 모듈
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
    el.innerHTML = '<div style="font-size:0.62rem; color:#64748b; text-align:center; padding:12px 0;">아직 제보한 박지가 없습니다. 소중한 박지를 제보해주세요!</div>';
    return;
  }

  var listHtml = validProps.map(function(p, idx) {
    var isCorr = Boolean(p.is_correction || p.isCorrection || p.type === 'correction');
    var rawMainName = p.spot_main || p.name || '무명 박지';
    var mainName = _escapeReportPropHtml(rawMainName);
    var subName = p.spot_sub ? ('(' + _escapeReportPropHtml(p.spot_sub) + ')') : '';
    var dateStr = _escapeReportPropHtml(String(p.date || '').slice(0, 10));
    var rawEntry = p.trailhead_addr || p.entry || '들머리 미기재';
    var entryStr = _escapeReportPropHtml(rawEntry);
    var safeId = _escapeReportPropHtml(String(p.id || ''));

    return '<div style="display:flex; justify-content:space-between; align-items:center; background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:7px 9px;">' +
      '<div style="display:flex; flex-direction:column; min-width:0; flex:1; padding-right:8px;">' +
        '<div style="display:flex; align-items:center; gap:4px;">' +
          '<span style="font-size:0.58rem; color:#38bdf8; font-weight:900;">' + (idx + 1) + '.</span>' +
          '<span style="font-size:0.72rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + mainName + ' ' + subName + '</span>' +
          (isCorr
            ? '<span style="font-size:0.50rem; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">수정건의</span>'
            : '<span style="font-size:0.50rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">신규제보</span>') +
        '</div>' +
        '<span style="font-size:0.54rem; color:#64748b; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + entryStr + ' · ' + dateStr + '</span>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">' +
        '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerEditProposalFromReport(this.getAttribute(\'data-prop-id\'))" style="background:rgba(56,189,248,0.12); border:1px solid #38bdf8; color:#38bdf8; font-size:0.62rem; font-weight:800; border-radius:5px; padding:3px 8px; cursor:pointer;">수정</button>' +
        '<button type="button" data-prop-id="' + safeId + '" onclick="window.triggerDeleteProposalFromReport(this.getAttribute(\'data-prop-id\'))" style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.62rem; font-weight:800; border-radius:5px; padding:3px 8px; cursor:pointer;">삭제</button>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = '<div style="font-size:0.56rem; color:#94a3b8; margin:4px 0 4px 2px;">관리자 승인 전까지 [수정] 또는 [삭제]할 수 있습니다.</div>' +
    '<div style="display:flex; flex-direction:column; gap:4px;">' +
      listHtml +
    '</div>';
};

window.triggerEditProposalFromReport = function(propId) {
  triggerHaptic(12);
  closeUserProfileModal();
  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  if (isMapPage && typeof window.openEditMyProposal === 'function') {
    window.openEditMyProposal(propId);
  } else {
    window.location.assign('map.html?edit_proposal=' + encodeURIComponent(propId));
  }
};

window.triggerDeleteProposalFromReport = function(propId) {
  if (!propId) return;
  triggerHaptic(12);
  if (!confirm('이 제보 내역을 삭제하시겠습니까?')) return;

  var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_my_proposals', [])
    : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
  if (!Array.isArray(myProps)) myProps = [];

  var targetItem = myProps.find(function(p) { return p && String(p.id) === String(propId); });
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
      return '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:3px 6px; border-radius:4px; font-size:0.58rem;"><span style="color:#94a3b8; font-family:var(--font-en);">' + yk + '년</span><span style="font-weight:800; color:#bae6fd; font-family:var(--font-en);">' + avgY + 'kg <span style="font-size:0.50rem; color:#64748b; font-weight:normal;">(' + yearMap[yk].count + '회)</span></span></div>';
    }).join('') || '<div style="color:#475569; font-size:0.54rem;">연도별 기록이 없습니다.</div>';
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
    dietHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(68px, 1fr)); gap:4px;">' +
      mKeys.map(function(mk) {
        var avgM = (monthMap[mk].sum / monthMap[mk].count).toFixed(1);
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:3px; text-align:center;"><div style="font-size:0.50rem; color:#64748b; font-family:var(--font-en);">' + mk.slice(2) + '</div><div style="font-size:0.68rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en); margin-top:1px;">' + avgM + 'kg</div></div>';
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

      return '<div onclick="window._toggleGearSlotTop5(\'' + s.key + '\')" style="cursor:pointer; background:' + (isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + '; border:1px solid ' + (isActive ? s.color : 'rgba(255,255,255,0.06)') + '; border-radius:6px; padding:5px 6px; box-sizing:border-box;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:0.52rem; color:#94a3b8; font-weight:800;">' + s.key + '</span>' +
          '<span style="font-size:0.48rem; color:' + s.color + ';">' + (isActive ? '닫기 ▲' : 'Top 5 ▼') + '</span>' +
        '</div>' +
        '<div style="font-size:0.60rem; font-weight:800; color:' + s.color + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">' + top1Name + ' <span style="font-size:0.50rem; color:#64748b; font-weight:normal;">(' + top1Count + '회)</span></div>' +
      '</div>';
    }).join('');

    if (state.activeSlot && slotDataMap[state.activeSlot]) {
      var curSlotDef = availableSlots.find(function(s) { return s.key === state.activeSlot; }) || { key: state.activeSlot, color: '#bae6fd' };
      var curCounts = slotDataMap[state.activeSlot].counts;
      var curSorted = Object.keys(curCounts).map(function(k) { return { name: k, count: curCounts[k] }; }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

      activeSlotDetailHtml = '<div style="background:#000000; border:1px dashed ' + curSlotDef.color + '; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
        '<div style="font-size:0.54rem; color:' + curSlotDef.color + '; font-weight:800; margin-bottom:4px;">[' + curSlotDef.key + '] 슬롯 최다 동행 Top 5</div>' +
        curSorted.map(function(item, idx) {
          return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; padding:1.5px 0;"><span style="color:#cbd5e1; max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong style="color:' + curSlotDef.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + item.name + '</span><span style="color:#64748b; font-family:var(--font-en);">' + item.count + '회</span></div>';
        }).join('') +
      '</div>';
    }
  } else {
    activeSlotCardsHtml = '<div style="color:#475569; font-size:0.54rem; padding:4px;">등록된 하드웨어 장비 데이터가 없습니다.</div>';
  }

  var topMinListHtml = topMin.map(function(m, i) {
    return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; color:#cbd5e1; line-height:1.3;"><span>' + (i + 1) + '. <strong style="color:#bae6fd;">' + m.weight.toFixed(2) + 'kg</strong></span><span style="color:#64748b;">' + m.date.slice(2, 10) + '</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.54rem;">-</div>';

  var topMaxListHtml = topMax.map(function(m, i) {
    return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; color:#cbd5e1; line-height:1.3;"><span>' + (i + 1) + '. <strong style="color:#fecdd3;">' + m.weight.toFixed(2) + 'kg</strong></span><span style="color:#64748b;">' + m.date.slice(2, 10) + '</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.54rem;">-</div>';

  var sortedGearsListHtml = sortedHardwareTop5.map(function(g, i) {
    return '<div style="display:flex; justify-content:space-between; font-size:0.60rem; padding:1.5px 0;"><span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:75%;"><strong style="color:#a7f3d0; margin-right:4px;">' + (i + 1) + '</strong>' + g.name + '</span><span style="color:#64748b; font-family:var(--font-en);">' + g.count + '회</span></div>';
  }).join('') || '<div style="color:#475569; font-size:0.54rem;">하드웨어 장비 기록이 없습니다.</div>';

  el.innerHTML = `
    <!-- 1. 총 누적 적재 무게 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-top:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.60rem; color:#94a3b8; font-weight:800;">총 누적 적재 무게</span>
        <span style="font-size:0.50rem; color:#64748b;">누적 통계</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:6px; align-items:center; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.50rem; color:#64748b; font-weight:700;">이번 달</div>
          <div style="font-size:0.85rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">${Math.round(absoluteMonthWeight)}<span style="font-size:0.55rem; color:#7dd3fc; margin-left:1px;">kg</span></div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.50rem; color:#64748b; font-weight:700;">올해 누적</div>
          <div style="font-size:0.85rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">${Math.round(absoluteYearWeight)}<span style="font-size:0.55rem; color:#fef08a; margin-left:1px;">kg</span></div>
        </div>
        <div style="background:rgba(167,243,208,0.04); border:1px solid rgba(167,243,208,0.2); border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.52rem; color:#a7f3d0; font-weight:800;">역대 총 누적</div>
          <div style="font-size:1.15rem; font-weight:900; color:#a7f3d0; font-family:var(--font-en); line-height:1; margin-top:2px;">${Math.round(absoluteTotalWeight)}<span style="font-size:0.62rem; color:#6ee7b7; margin-left:1px;">kg</span></div>
        </div>
      </div>
    </div>

    <!-- 2. 평균 세팅 무게 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">평균 1회 세팅 무게</span>
        <div style="display:flex; gap:2px; background:rgba(255,255,255,0.04); padding:2px; border-radius:4px;">
          <button type="button" onclick="window._setGearSeasonFilter('all')" style="border:none; cursor:pointer; font-size:0.46rem; padding:2px 5px; border-radius:3px; background:${state.season==='all'?'#ffffff':'transparent'}; color:${state.season==='all'?'#000':'#64748b'}; font-weight:800;">전체</button>
          <button type="button" onclick="window._setGearSeasonFilter('winter')" style="border:none; cursor:pointer; font-size:0.46rem; padding:2px 5px; border-radius:3px; background:${state.season==='winter'?'#bae6fd':'transparent'}; color:${state.season==='winter'?'#000':'#64748b'}; font-weight:800;">동계</button>
          <button type="button" onclick="window._setGearSeasonFilter('three')" style="border:none; cursor:pointer; font-size:0.46rem; padding:2px 5px; border-radius:3px; background:${state.season==='three'?'#fde68a':'transparent'}; color:${state.season==='three'?'#000':'#64748b'}; font-weight:800;">3계절</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; text-align:center;">
        <div>
          <div style="font-size:0.52rem; color:#64748b;">30일 평균</div>
          <div style="font-size:0.75rem; font-weight:800; color:#bae6fd; font-family:var(--font-en);">${cM > 0 ? (sumM / cM).toFixed(2) + 'kg' : '-'}</div>
        </div>
        <div>
          <div style="font-size:0.52rem; color:#64748b;">올해 평균</div>
          <div style="font-size:0.75rem; font-weight:800; color:#fde68a; font-family:var(--font-en);">${cY > 0 ? (sumY / cY).toFixed(2) + 'kg' : '-'}</div>
        </div>
        <div>
          <div style="font-size:0.52rem; color:#64748b;">선택구간 평균</div>
          <div style="font-size:0.75rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en);">${cFiltered > 0 ? (sumFiltered / cFiltered).toFixed(2) + 'kg' : '0kg'}</div>
        </div>
      </div>
    </div>

    <!-- 3. 무게 다이어트 추이 -->
    <div style="background:#000000; border:1px solid rgba(186,230,253,0.12); border-radius:6px; padding:6px 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.58rem; color:#94a3b8; font-weight:700;">무게 다이어트 추이</span>
        <div style="display:flex; gap:3px;">
          <button type="button" onclick="window._setGearDietMode('month')" style="border:none; cursor:pointer; font-size:0.48rem; padding:2px 5px; border-radius:3px; background:${state.dietMode==='month'?'#bae6fd':'rgba(255,255,255,0.06)'}; color:${state.dietMode==='month'?'#000':'#94a3b8'}; font-weight:800;">월단위</button>
          <button type="button" onclick="window._setGearDietMode('year')" style="border:none; cursor:pointer; font-size:0.48rem; padding:2px 5px; border-radius:3px; background:${state.dietMode==='year'?'#bae6fd':'rgba(255,255,255,0.06)'}; color:${state.dietMode==='year'?'#000':'#94a3b8'}; font-weight:800;">연단위</button>
        </div>
      </div>
      ${dietHtml}
    </div>

    <!-- 4. 슬롯별 최다 사용 장비 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">슬롯별 최다 장비</span>
        <span style="font-size:0.50rem; color:#94a3b8;">소모품 제외</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
        ${activeSlotCardsHtml}
      </div>
      ${activeSlotDetailHtml}
    </div>

    <!-- 5. 세팅 비율 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px;">
      <div style="display:flex; justify-content:space-between; font-size:0.56rem; color:#64748b; margin-bottom:3px;">
        <span>세팅 비율 (경량/스탠다드/헤비)</span>
        <span style="color:#94a3b8; font-weight:700;">${pMin}% / ${pStd}% / ${pHvy}%</span>
      </div>
      <div style="display:flex; width:100%; height:3px; border-radius:2px; overflow:hidden; background:rgba(255,255,255,0.04);">
        <div style="width:${pMin}%; background:#bae6fd;"></div>
        <div style="width:${pStd}%; background:#a7f3d0;"></div>
        <div style="width:${pHvy}%; background:#fecdd3;"></div>
      </div>
    </div>

    <!-- 6. 최경량 Top 3 vs 최대 중량 Top 3 -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
      <div style="background:#000000; border:1px solid rgba(186,230,253,0.12); border-radius:6px; padding:6px 8px;">
        <div style="font-size:0.56rem; color:#bae6fd; font-weight:700; margin-bottom:3px;">최경량 Top 3</div>
        ${topMinListHtml}
      </div>
      <div style="background:#000000; border:1px solid rgba(254,205,211,0.12); border-radius:6px; padding:6px 8px;">
        <div style="font-size:0.56rem; color:#fecdd3; font-weight:700; margin-bottom:3px;">최대 중량 Top 3</div>
        ${topMaxListHtml}
      </div>
    </div>

    <!-- 7. 최다 동행 하드웨어 Top 5 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
        <span style="font-size:0.56rem; color:#64748b; font-weight:700;">최다 동행 하드웨어 Top 5</span>
        <span style="font-size:0.50rem; color:#64748b;">순수 장비</span>
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
    if (!elev) return 0;
    var num = parseInt(String(elev).replace(/\D/g, ''), 10);
    return isNaN(num) ? 0 : num;
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
    elevDetailHtml = '<div style="background:#000000; border:1px dashed #bae6fd; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:#bae6fd; font-weight:800; margin-bottom:4px;">최근 월별 획득 고도</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(64px, 1fr)); gap:4px;">' +
      mKeys.map(function(mk) {
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:3px; text-align:center;"><div style="font-size:0.48rem; color:#64748b; font-family:var(--font-en);">' + mk.slice(2) + '</div><div style="font-size:0.65rem; font-weight:800; color:#bae6fd; font-family:var(--font-en); margin-top:1px;">+' + monthElevMap[mk].toLocaleString() + 'm</div></div>';
      }).join('') + '</div></div>';
  } else if (state.elevDetailMode === 'year') {
    var yKeys = Object.keys(yearElevMap).sort();
    elevDetailHtml = '<div style="background:#000000; border:1px dashed #fde68a; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:#fde68a; font-weight:800; margin-bottom:4px;">연도별 획득 고도 합계</div>' +
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(70px, 1fr)); gap:4px;">' +
      yKeys.map(function(yk) {
        return '<div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:3px; text-align:center;"><div style="font-size:0.48rem; color:#64748b; font-family:var(--font-en);">' + yk + '년</div><div style="font-size:0.65rem; font-weight:800; color:#fde68a; font-family:var(--font-en); margin-top:1px;">+' + yearElevMap[yk].toLocaleString() + 'm</div></div>';
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
    return '<div onclick="window._toggleTerrainThemeTop5(\'' + tKey + '\')" style="cursor:pointer; background:' + (isExp ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.04)') + '; border-radius:6px; padding:4px 5px; box-sizing:border-box;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<span style="font-size:0.50rem; color:#64748b; font-weight:700;">' + item.label + '</span>' +
        '<span style="font-size:0.46rem; color:' + item.color + ';">' + (isExp ? '닫기 ▲' : 'Top 5 ▼') + '</span>' +
      '</div>' +
      '<div style="font-size:0.58rem; font-weight:800; color:' + item.color + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">' + top1.name + ' <span style="font-size:0.50rem; color:#64748b; font-weight:normal;">(' + top1.count + '회)</span></div>' +
    '</div>';
  }).join('');

  var themeDetailHtml = '';
  if (state.expandedTheme && themeData[state.expandedTheme]) {
    var curT = themeData[state.expandedTheme];
    themeDetailHtml = '<div style="background:#000000; border:1px dashed ' + curT.color + '; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:' + curT.color + '; font-weight:800; margin-bottom:4px;">[' + curT.label + '] 방문 랭킹 Top 5</div>' +
      (curT.list.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; padding:1.5px 0;"><span style="color:#cbd5e1; max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong style="color:' + curT.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + it.name + '</span><span style="color:#64748b; font-family:var(--font-en);">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.52rem;">해당 지형의 기록이 없습니다.</div>') +
    '</div>';
  }

  var topElevDetailHtml = '';
  if (state.showTopElevation) {
    topElevDetailHtml = '<div style="background:#000000; border:1px dashed #bae6fd; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:#bae6fd; font-weight:800; margin-bottom:4px;">역대 등정 최고봉 랭킹 Top 5</div>' +
      top5Elevations.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.58rem; padding:2px 0;">' +
          '<span style="color:#cbd5e1; max-width:70%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong style="color:#bae6fd; margin-right:4px;">' + (idx + 1) + '.</strong>' + it.spot + ' <span style="font-size:0.50rem; color:#64748b;">(' + it.date + ')</span></span>' +
          '<span style="color:#bae6fd; font-weight:800; font-family:var(--font-en);">' + it.elevation.toLocaleString() + 'm</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  var selectedYearLabel = state.selectedYear === 'all' ? '전체 활동 기간' : state.selectedYear + '년 활동 기준';
  var customDropdownItemsHtml = '<button type="button" onclick="window._setTerrainYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_terrain\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(186,230,253,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setTerrainYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_terrain\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(186,230,253,0.1)' : 'transparent') + '; color:' + (isSel ? '#bae6fd' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 활동 기준</button>';
    }).join('');

  el.innerHTML = `
    <!-- 1. 총 누적 획득 고도 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px; margin-top:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:0.60rem; color:#94a3b8; font-weight:800;">총 누적 획득 고도</span>
        <span style="font-size:0.50rem; color:#bae6fd; font-weight:700;">한라산 ${hallasanMultiple}회 등정 높이</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:6px; align-items:center; text-align:center;">
        <div onclick="window._toggleTerrainElevDetail('month')" style="cursor:pointer; background:${state.elevDetailMode==='month'?'rgba(186,230,253,0.08)':'rgba(255,255,255,0.02)'}; border:1px solid ${state.elevDetailMode==='month'?'#bae6fd':'rgba(255,255,255,0.04)'}; border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.50rem; color:#64748b; font-weight:700;">이번 달 <span style="font-size:0.44rem; color:#bae6fd;">월별▼</span></div>
          <div style="font-size:0.85rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">+${monthElevation.toLocaleString()}<span style="font-size:0.55rem; color:#7dd3fc; margin-left:1px;">m</span></div>
        </div>
        <div onclick="window._toggleTerrainElevDetail('year')" style="cursor:pointer; background:${state.elevDetailMode==='year'?'rgba(253,230,138,0.08)':'rgba(255,255,255,0.02)'}; border:1px solid ${state.elevDetailMode==='year'?'#fde68a':'rgba(255,255,255,0.04)'}; border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.50rem; color:#64748b; font-weight:700;">올해 누적 <span style="font-size:0.44rem; color:#fde68a;">연별▼</span></div>
          <div style="font-size:0.85rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">+${yearElevation.toLocaleString()}<span style="font-size:0.55rem; color:#fef08a; margin-left:1px;">m</span></div>
        </div>
        <div style="background:rgba(186,230,253,0.04); border:1px solid rgba(186,230,253,0.2); border-radius:6px; padding:6px 2px;">
          <div style="font-size:0.52rem; color:#bae6fd; font-weight:800;">역대 총 누적</div>
          <div style="font-size:1.15rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1; margin-top:2px;">+${totalElevation.toLocaleString()}<span style="font-size:0.62rem; color:#7dd3fc; margin-left:1px;">m</span></div>
        </div>
      </div>
      ${elevDetailHtml}
    </div>

    <!-- 2. 인터랙티브 연도 선택 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px;">
      <span style="font-size:0.54rem; color:#94a3b8; font-weight:700;">지형 분석 기준 기간</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('terrain', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.54rem; font-weight:800; border-radius:4px; padding:3px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.44rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_terrain" style="display:none; position:absolute; top:28px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:115px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 3. 필드 지형 테마 점유율 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">필드 지형 테마 비중</span>
        <span style="font-size:0.50rem; color:#94a3b8;">${state.selectedYear==='all'?'전체 기간':state.selectedYear+'년'} 기준</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:4px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">산·능선</div>
          <div style="font-size:0.75rem; font-weight:800; color:#bae6fd; font-family:var(--font-en); margin-top:1px;">${pMountain}%</div>
          <div style="font-size:0.48rem; color:#64748b;">${themeCounts.mountain}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:4px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">섬(Island)</div>
          <div style="font-size:0.75rem; font-weight:800; color:#a7f3d0; font-family:var(--font-en); margin-top:1px;">${pIsland}%</div>
          <div style="font-size:0.48rem; color:#64748b;">${themeCounts.island}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:4px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">바다·해변</div>
          <div style="font-size:0.75rem; font-weight:800; color:#fde68a; font-family:var(--font-en); margin-top:1px;">${pBeach}%</div>
          <div style="font-size:0.48rem; color:#64748b;">${themeCounts.beach}회</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:4px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">숲·계곡</div>
          <div style="font-size:0.75rem; font-weight:800; color:#e9d5ff; font-family:var(--font-en); margin-top:1px;">${pForest}%</div>
          <div style="font-size:0.48rem; color:#64748b;">${themeCounts.forest}회</div>
        </div>
      </div>
    </div>

    <!-- 4. 박지 개척 성향 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">박지 개척 성향</span>
        <span style="font-size:0.52rem; color:#a7f3d0; font-weight:800;">${exploreTypeTitle}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">미지 개척 확률</div>
          <div style="font-size:0.85rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); margin-top:2px;">${newExploreRate}%</div>
          <div style="font-size:0.48rem; color:#64748b;">고유 박지 ${totalVisitedSpots}곳</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:4px; padding:5px 2px;">
          <div style="font-size:0.50rem; color:#64748b;">단골 재방문 확률</div>
          <div style="font-size:0.85rem; font-weight:900; color:#fde68a; font-family:var(--font-en); margin-top:2px;">${reVisitRate}%</div>
          <div style="font-size:0.48rem; color:#64748b;">재방문 ${reVisitCount}회</div>
        </div>
      </div>
    </div>

    <!-- 5. 지형별 부동의 1위 아지트 -->
    <div style="background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">지형별 최다 방문 아지트</span>
        <span style="font-size:0.48rem; color:#64748b;">단골 랭킹</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
        ${themeCardsHtml}
      </div>
      ${themeDetailHtml}
    </div>

    <!-- 6. 내가 밟은 가장 높은 곳 -->
    <div onclick="window._toggleTopElevationRank()" style="cursor:pointer; background:#000000; border:1px solid rgba(186,230,253,0.25); border-radius:6px; padding:8px 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:0.52rem; color:#64748b; font-weight:700;">내가 밟은 가장 높은 곳</span>
            <span style="font-size:0.46rem; color:#bae6fd; font-weight:800;">${state.showTopElevation?'Top 5 닫기 ▲':'Top 5 순위 ▼'}</span>
          </div>
          <div style="font-size:0.75rem; font-weight:800; color:#ffffff; margin-top:2px;">${maxElevItem.spot}</div>
          <div style="font-size:0.50rem; color:#64748b; margin-top:1px;">${maxElevItem.date}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:1.15rem; font-weight:900; color:#bae6fd; font-family:var(--font-en); line-height:1;">${maxElevItem.elevation.toLocaleString()}m</div>
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
  var customDropdownItemsHtml = '<button type="button" onclick="window._setSeasonYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_season\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(253,230,138,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#fde68a' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setSeasonYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_season\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(253,230,138,0.1)' : 'transparent') + '; color:' + (isSel ? '#fde68a' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 시즌 기준</button>';
    }).join('');

  var seasonCardsHtml = ['spring', 'summer', 'autumn', 'winter'].map(function(k) {
    var item = s[k];
    var p = pct(item.count);
    var isExp = (state.expandedSeason === k);
    return '<div onclick="window._toggleSeasonDetail(\'' + k + '\')" style="cursor:pointer; background:' + (isExp ? 'rgba(255,255,255,0.06)' : '#000000') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.06)') + '; border-radius:6px; padding:6px 2px; text-align:center; box-sizing:border-box;">' +
      '<div style="font-size:0.50rem; color:#64748b;">' + item.label.split(' ')[0] + '</div>' +
      '<div style="font-size:0.75rem; font-weight:800; color:' + item.color + '; font-family:var(--font-en); margin-top:1px;">' + p + '%</div>' +
      '<div style="font-size:0.46rem; color:#64748b; margin-top:1px;">' + item.count + '회 ' + (isExp ? '▲' : '▼') + '</div>' +
    '</div>';
  }).join('');

  var seasonDetailHtml = '';
  if (state.expandedSeason && s[state.expandedSeason]) {
    var curS = s[state.expandedSeason];
    var sortedSpots = Object.keys(curS.spots).map(function(k) {
      return { name: k, count: curS.spots[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

    seasonDetailHtml = '<div style="background:#000000; border:1px dashed ' + curS.color + '; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:' + curS.color + '; font-weight:800; margin-bottom:4px;">[' + curS.label + '] 방문 박지 Top 5</div>' +
      (sortedSpots.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; padding:1.5px 0;"><span style="color:#cbd5e1; max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong style="color:' + curS.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + it.name + '</span><span style="color:#64748b; font-family:var(--font-en);">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.52rem;">해당 시즌 기록이 없습니다.</div>') +
    '</div>';
  }

  el.innerHTML = `
    <!-- 시즌 연도 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px; margin-top:6px;">
      <span style="font-size:0.54rem; color:#94a3b8; font-weight:700;">시즌 분석 기준</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('season', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.54rem; font-weight:800; border-radius:4px; padding:3px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.44rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_season" style="display:none; position:absolute; top:28px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:115px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 4계절 밸런스 그리드 (터치 시 Top 5 확장) -->
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; margin-top:4px;">
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
  var customDropdownItemsHtml = '<button type="button" onclick="window._setRegionYearSelect(\'all\'); document.getElementById(\'customDropdownMenu_region\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (state.selectedYear === 'all' ? 'rgba(233,213,255,0.1)' : 'transparent') + '; color:' + (state.selectedYear === 'all' ? '#e9d5ff' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">전체 활동 기간</button>' +
    sortedYears.map(function(yk) {
      var isSel = (state.selectedYear === yk);
      return '<button type="button" onclick="window._setRegionYearSelect(\'' + yk + '\'); document.getElementById(\'customDropdownMenu_region\').style.display=\'none\';" style="width:100%; text-align:left; background:' + (isSel ? 'rgba(233,213,255,0.1)' : 'transparent') + '; color:' + (isSel ? '#e9d5ff' : '#cbd5e1') + '; border:none; padding:6px 10px; font-size:0.58rem; font-weight:800; border-radius:4px; cursor:pointer;">' + yk + '년 지역 기준</button>';
    }).join('');

  var regionCardsHtml = Object.keys(regMap).map(function(k) {
    var item = regMap[k];
    var isExp = (state.expandedRegion === k);
    return '<div onclick="window._toggleRegionDetail(\'' + k + '\')" style="cursor:pointer; background:' + (isExp ? 'rgba(255,255,255,0.06)' : '#000000') + '; border:1px solid ' + (isExp ? item.color : 'rgba(255,255,255,0.06)') + '; border-radius:6px; min-height:42px; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:3px 2px; box-sizing:border-box;">' +
      '<div style="font-size:0.52rem; color:#64748b; line-height:1.1;">' + k + '</div>' +
      '<div style="font-size:0.75rem; font-weight:800; color:' + item.color + '; font-family:var(--font-en); margin-top:2px; line-height:1;">' + item.count + '<span style="font-size:0.46rem; color:#64748b; margin-left:1px;">회</span></div>' +
    '</div>';
  }).join('');

  var regionDetailHtml = '';
  if (state.expandedRegion && regMap[state.expandedRegion]) {
    var curR = regMap[state.expandedRegion];
    var sortedSpots = Object.keys(curR.spots).map(function(k) {
      return { name: k, count: curR.spots[k] };
    }).sort(function(a, b) { return b.count - a.count; }).slice(0, 5);

    regionDetailHtml = '<div style="background:#000000; border:1px dashed ' + curR.color + '; border-radius:6px; padding:6px 8px; margin-top:4px;">' +
      '<div style="font-size:0.52rem; color:' + curR.color + '; font-weight:800; margin-bottom:4px;">[' + state.expandedRegion + '] 권역 방문 박지 Top 5</div>' +
      (sortedSpots.map(function(it, idx) {
        return '<div style="display:flex; justify-content:space-between; font-size:0.58rem; padding:1.5px 0;"><span style="color:#cbd5e1; max-width:80%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong style="color:' + curR.color + '; margin-right:4px;">' + (idx + 1) + '.</strong>' + it.name + '</span><span style="color:#64748b; font-family:var(--font-en);">' + it.count + '회</span></div>';
      }).join('') || '<div style="color:#475569; font-size:0.52rem;">해당 권역 기록이 없습니다.</div>') +
    '</div>';
  }

  el.innerHTML = `
    <!-- 지역 연도 커스텀 드롭다운 -->
    <div style="position:relative; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:4px 8px; margin-top:6px;">
      <span style="font-size:0.54rem; color:#94a3b8; font-weight:700;">지역 분석 기준</span>
      <button type="button" onclick="window.toggleModuleCustomDropdown('region', event)" style="background:#0b0f17; border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.54rem; font-weight:800; border-radius:4px; padding:3px 8px; cursor:pointer; display:flex; align-items:center; gap:4px; outline:none;">
        <span>${selectedYearLabel}</span>
        <span style="font-size:0.44rem; color:#64748b;">▼</span>
      </button>
      <div id="customDropdownMenu_region" style="display:none; position:absolute; top:28px; right:8px; background:#0b0f17; border:1px solid rgba(255,255,255,0.15); border-radius:6px; padding:4px; box-shadow:0 8px 25px rgba(0,0,0,0.85); z-index:50; min-width:115px; flex-direction:column; gap:2px;">
        ${customDropdownItemsHtml}
      </div>
    </div>

    <!-- 8대 권역 분포 그리드 (터치 시 Top 5 확장) -->
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; margin-top:4px;">
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

  dock.style.cssText = 'position:fixed !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; max-width:480px !important; margin:0 auto !important; height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; min-height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; padding:0 0 env(safe-area-inset-bottom, 8px) 0 !important; background:rgba(0,0,0,0.98) !important; border-top:1px solid rgba(255,255,255,0.1) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; z-index:2147483647 !important; box-sizing:border-box !important; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); pointer-events:auto !important; transform:translateZ(0) !important; -webkit-transform:translateZ(0) !important; contain:paint !important; overscroll-behavior:none !important;';

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
    'datePickGuideHud'
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
        var pendingSpot = sessionStorage.getItem('okbm_pending_map_spot')
          || sessionStorage.getItem('okbm_target_spot')
          || sessionStorage.getItem('okbm_target_map_spot');
        var mapParams = [];
        if (pendingId) mapParams.push('id=' + encodeURIComponent(pendingId));
        if (pendingSpot) mapParams.push('spot=' + encodeURIComponent(pendingSpot));
        if (mapParams.length) mapUrl += '?' + mapParams.join('&');
      } catch (e) {}
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate(mapUrl);
      else window.location.assign(mapUrl);
      return;
    }
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
    if (typeof openHistoryModal === 'function') {
      openHistoryModal();
    } else if (isMap) {
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('index.html?open=history');
      else window.location.assign('index.html?open=history');
      return;
    }
  } else if (tabId === 'report') {
    if (typeof closePlanModal === 'function') closePlanModal();
    if (typeof closeHistoryModal === 'function') closeHistoryModal();
    if (!isUserLoggedIn()) {
      openLoginModal();
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
  var currentBio = localStorage.getItem('okbm_user_bio') || '';
  var oldModal = document.getElementById('reportBioEditorModalOverlay');
  if (oldModal) oldModal.remove();

  var modal = document.createElement('div');
  modal.id = 'reportBioEditorModalOverlay';
  modal.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

  modal.innerHTML = '<div style="width:100%; max-width:340px; background:#080b11; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:16px; box-sizing:border-box; display:flex; flex-direction:column; gap:12px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<span style="font-size:0.90rem; font-weight:900; color:#ffffff;">소개글</span>' +
        '<span id="bioEditorCharCount" style="font-size:0.68rem; color:#64748b; font-family:var(--font-mono);">' + currentBio.length + '/100</span>' +
      '</div>' +
      '<textarea id="bioEditorTextarea" maxlength="100" placeholder="소개글을 작성해보세요." style="width:100%; height:90px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px; color:#ffffff; font-size:0.78rem; line-height:1.45; resize:none; outline:none; box-sizing:border-box; font-family:inherit;"></textarea>' +
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
    countEl.innerText = textarea.value.length + '/100';
  };

  cancelBtn.onclick = function() {
    triggerHaptic(8);
    modal.remove();
  };

  saveBtn.onclick = function() {
    triggerHaptic(12);
    var clean = textarea.value.trim().slice(0, 100);
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

window.openMyPastTripsFromReport = function() {
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
  if (typeof window.openPastTripsListModal === 'function') {
    window.openPastTripsListModal(true);
  } else {
    window.navigateToDockTab('history');
  }
};

window.openRoutersInterestFromReport = function() {
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
  if (typeof window.openFollowedRoutersModal === 'function') {
    window.openFollowedRoutersModal(true);
  } else {
    window.navigateToDockTab('history');
  }
};

window.openFeedsInterestFromReport = function() {
  triggerHaptic(10);
  if (typeof window.recordModalHistoryStep === 'function') {
    window.recordModalHistoryStep('userProfileModalOverlay', function() {
      if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
    });
  }
  if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
  if (typeof window.openSavedFeedsModal === 'function') {
    window.openSavedFeedsModal(true);
  } else {
    window.navigateToDockTab('history');
  }
};

window.openMyFeedsModal = window.openMyPastTripsFromReport;
window.openFollowingUsersModal = window.openRoutersInterestFromReport;
window.openSavedFeedsModal = window.openFeedsInterestFromReport;

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
    window.__reportRenderCache = {};

    var currentProfile = safeGetJSON('user_profile', null);
    var targetNick = (currentProfile && currentProfile.nickname) ? currentProfile.nickname : (localStorage.getItem('okbm_user_nick') || '야영자');
    var targetPhoto = (currentProfile && (currentProfile.photoUrl || currentProfile.heroCoverUrl)) ? (currentProfile.photoUrl || currentProfile.heroCoverUrl) : (localStorage.getItem('okbm_hero_cover_url') || '');
    var bioVal = (currentProfile && currentProfile.bio) ? currentProfile.bio : (localStorage.getItem('okbm_user_bio') || '');
    var targetUserId = (currentProfile && currentProfile.id) ? String(currentProfile.id).trim() : (localStorage.getItem('okbm_user_id') || '');

    var headerContainer = document.getElementById('reportProfileHeaderContainer');
    if (headerContainer && typeof window.renderUserProfileHeaderSection === 'function') {
      headerContainer.innerHTML = window.renderUserProfileHeaderSection({
        isOwner: true,
        userId: targetUserId,
        nickname: targetNick,
        bio: bioVal,
        photoUrl: targetPhoto,
        instagram: localStorage.getItem('okbm_user_instagram') || '',
        youtube: localStorage.getItem('okbm_user_youtube') || '',
        blog: localStorage.getItem('okbm_user_blog') || '',
        snsChannel: localStorage.getItem('okbm_user_sns_channel') || ''
      });
    }

    if (typeof window.applyMasterCoverPhotoToAllUI === 'function') {
      window.applyMasterCoverPhotoToAllUI(targetPhoto);
    }

    if (typeof window.saveUserToSupabase === 'function' && currentProfile) {
      window.saveUserToSupabase(currentProfile);
    }

    if (typeof window.refreshMyReportFullStats === 'function') {
      window.refreshMyReportFullStats();
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
  var cleanUrl = (typeof photoUrl === 'string' && (photoUrl.startsWith('http') || photoUrl.startsWith('data:image/'))) ? photoUrl : '';

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

// 🔍 [메인 대표 사진 대형 확대 뷰어 라이트박스]
window.previewMasterUserCoverPhotoLarge = function() {
  triggerHaptic(10);
  var profile = safeGetJSON('user_profile', null);
  var photoUrl = localStorage.getItem('okbm_hero_cover_url') || (profile && (profile.heroCoverUrl || profile.photoUrl)) || '';

  if (!photoUrl || !String(photoUrl).startsWith('http')) {
    showToast('등록된 대표 사진이 없습니다. [사진 변경]을 눌러보세요.', 'info', 2200);
    return;
  }

  var oldViewer = document.getElementById('masterCoverLargeViewerModal');
  if (oldViewer) oldViewer.remove();

  var viewer = document.createElement('div');
  viewer.id = 'masterCoverLargeViewerModal';
  viewer.style.cssText = 'position:fixed; inset:0; z-index:2147483646 !important; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:20px; box-sizing:border-box; cursor:pointer;';
  viewer.onclick = function() { viewer.remove(); triggerHaptic(8); };

  viewer.innerHTML = '<div style="position:relative; width:250px; height:250px; border-radius:50%; border:2px solid rgba(186,230,253,0.6); box-shadow:0 0 35px rgba(56,189,248,0.35); overflow:hidden; background:#07090e; flex-shrink:0;">' +
      '<img src="' + photoUrl + '" style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none;" />' +
    '</div>';

  document.body.appendChild(viewer);
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

  cancelBtn.onclick = function() {
    triggerHaptic(8);
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
  }, { passive: false });

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
  }, { passive: false });

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
  }, { passive: false });

  var handleTouchEnd = function() {
    isDragging = false;
    isPinching = false;
  };

  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  canvas.addEventListener('mousedown', function(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dx = (e.clientX - startX) / (scale * baseScale);
    var dy = (e.clientY - startY) / (scale * baseScale);
    offsetX += dx;
    offsetY += dy;
    startX = e.clientX;
    startY = e.clientY;
    render();
  });

  window.addEventListener('mouseup', function() {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

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
  if (deleteAccountBtn) {
    deleteAccountBtn.style.display = isLogged ? '' : 'none';
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
    fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(String(profile.id).trim()), {
      method: 'PATCH',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        nickname: clean,
        last_nickname_changed_at: now,
        updated_at: new Date().toISOString()
      })
    }).catch(function() {});
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

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id)
    ? String(profile.id).trim()
    : String(localStorage.getItem('okbm_user_id') || '').trim();

  if (!userId) {
    showToast('로그인된 계정을 확인할 수 없습니다.', 'warn');
    return;
  }

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

  var accountIds = [];
  var pushAccountId = function(id) {
    var s = String(id || '').trim();
    if (!s || accountIds.indexOf(s) !== -1) return;
    accountIds.push(s);
  };
  pushAccountId(userId);
  var numericId = userId.replace(/^(kakao_|naver_|apple_|google_)/, '');
  pushAccountId(numericId);
  if (userId.indexOf('kakao_') === 0 && numericId) pushAccountId('kakao_' + numericId);

  var jsonHeaders = {
    'apikey': targetKey,
    'Authorization': 'Bearer ' + targetKey,
    'Content-Type': 'application/json'
  };

  var restJson = async function(pathWithQuery, options) {
    var res = await fetch(targetUrl + '/rest/v1/' + pathWithQuery, options);
    var text = '';
    try { text = await res.text(); } catch (e) {}
    var data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = text; }
    }
    return { ok: res.ok, status: res.status, data: data, text: text };
  };

  var deleteByColumn = async function(table, column, ids) {
    var last = { ok: true, status: 200, data: [], text: '' };
    for (var i = 0; i < ids.length; i++) {
      last = await restJson(table + '?' + column + '=eq.' + encodeURIComponent(ids[i]), {
        method: 'DELETE',
        headers: Object.assign({}, jsonHeaders, { Prefer: 'return=representation' })
      });
      if (last.status === 404 || last.status === 405) return last;
      if (!last.ok) return last;
    }
    return last;
  };

  var countByColumn = async function(table, column, ids) {
    var total = 0;
    for (var i = 0; i < ids.length; i++) {
      var counted = await restJson(table + '?' + column + '=eq.' + encodeURIComponent(ids[i]) + '&select=id', {
        method: 'GET',
        headers: jsonHeaders
      });
      if (counted.status === 404) return 0;
      if (Array.isArray(counted.data)) total += counted.data.length;
    }
    return total;
  };

  var wipeUserRow = async function(id) {
    var emptyUser = {
      nickname: '',
      bio: '',
      hero_cover_url: '',
      photo_url: '',
      bookmarks: [],
      visited: [],
      memos: {},
      saved_feeds: [],
      following: [],
      my_gears: {},
      last_nickname_changed_at: 0,
      updated_at: new Date().toISOString()
    };
    var patched = await restJson('users?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: Object.assign({}, jsonHeaders, { Prefer: 'return=representation' }),
      body: JSON.stringify(emptyUser)
    });
    if (!patched.ok && patched.status !== 404) {
      console.error('[confirmUserAccountDeletion] users PATCH 실패 status=' + patched.status, patched.text);
    }
    return deleteByColumn('users', 'id', [id]);
  };

  var failDeletion = function(message) {
    window.__okbmAccountPurging = false;
    restoreDeleteBtn();
    showToast(message || '서버 데이터 삭제 중 오류가 발생했습니다. 네트워크를 확인한 뒤 다시 시도해주세요.', 'error', 3200);
  };

  try {
    await deleteByColumn('feed_likes', 'user_id', accountIds);
    var feedsDel = await deleteByColumn('feeds', 'user_id', accountIds);
    if (!feedsDel.ok && feedsDel.status !== 404) {
      failDeletion('피드 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    await deleteByColumn('proposals', 'user_id', accountIds);
    await deleteByColumn('spot_corrections', 'user_id', accountIds);
    await deleteByColumn('trips', 'user_id', accountIds);

    for (var u = 0; u < accountIds.length; u++) {
      await wipeUserRow(accountIds[u]);
    }

    var leftoverFeeds = await countByColumn('feeds', 'user_id', accountIds);
    if (leftoverFeeds > 0) {
      failDeletion('피드가 서버에서 아직 남아 있어 탈퇴를 완료하지 못했습니다.');
      return;
    }

    var leftoverUsers = 0;
    for (var v = 0; v < accountIds.length; v++) {
      var userCheck = await restJson('users?id=eq.' + encodeURIComponent(accountIds[v]) + '&select=id,nickname,bookmarks,saved_feeds,following,my_gears', {
        method: 'GET',
        headers: jsonHeaders
      });
      if (!Array.isArray(userCheck.data) || !userCheck.data.length) continue;
      leftoverUsers += 1;
      var row = userCheck.data[0] || {};
      var gears = row.my_gears && typeof row.my_gears === 'object' ? row.my_gears : {};
      var hasMyList = Boolean(String(row.nickname || '').trim()) ||
        (Array.isArray(row.bookmarks) && row.bookmarks.length > 0) ||
        (Array.isArray(row.saved_feeds) && row.saved_feeds.length > 0) ||
        (Array.isArray(row.following) && row.following.length > 0) ||
        Object.keys(gears).length > 0;
      if (hasMyList) {
        failDeletion('계정/마이목록이 서버에서 아직 남아 있어 탈퇴를 완료하지 못했습니다.');
        return;
      }
    }
    if (leftoverUsers > 0) {
      console.warn('[confirmUserAccountDeletion] users 행은 RLS로 남았지만 마이목록은 비웠습니다.');
    }
  } catch (cloudErr) {
    console.error('[confirmUserAccountDeletion] 클라우드 삭제 예외:', cloudErr);
    failDeletion();
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
    okbm_master_gears: true,
    okbm_master_gears_cache: true,
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
  if (!row || String(userId || '').trim() !== 'kakao_5060259862') return row;
  var sns = okbmReadSnsFromUserRow(row);
  if (!sns.instagram) {
    var mg = row.my_gears && typeof row.my_gears === 'object' ? row.my_gears : {};
    mg.sns = {
      instagram: 'oklionnature',
      youtube: sns.youtube || '',
      blog: sns.blog || ''
    };
    row.my_gears = mg;
    if (String(row.nickname || '').trim() === '김사자') row.nickname = '오라네';
  }
  return row;
}

async function okbmFetchUserRow(query) {
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey || !query) return null;
  try {
    var res = await fetch(targetUrl + '/rest/v1/users?' + query + '&select=' + okbmSocialUserSelect(), {
      method: 'GET',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      }
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

async function okbmFindUserByEmail(email) {
  var normalized = window.okbmNormalizeEmail(email);
  if (!normalized) return null;
  return okbmFetchUserRow('email=eq.' + encodeURIComponent(normalized));
}

function okbmNormalizeNickname(nick) {
  return String(nick || '').replace(/\s+/g, ' ').trim();
}

function okbmEscapeIlikeExact(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function okbmRandomNickSuffix() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

async function okbmLookupNicknameOwners(nickname, excludeUserId) {
  var nick = okbmNormalizeNickname(nickname);
  if (!nick) return [];
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) throw new Error('nickname lookup unavailable');
  var filter = 'nickname=ilike.' + encodeURIComponent(okbmEscapeIlikeExact(nick));
  var exclude = String(excludeUserId || '').trim();
  if (exclude) filter += '&id=neq.' + encodeURIComponent(exclude);
  var res = await fetch(targetUrl + '/rest/v1/users?' + filter + '&select=id,nickname&limit=1', {
    method: 'GET',
    headers: {
      'apikey': targetKey,
      'Authorization': 'Bearer ' + targetKey,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error('nickname lookup ' + res.status);
  var rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function okbmIsNicknameTaken(nickname, excludeUserId) {
  var rows = await okbmLookupNicknameOwners(nickname, excludeUserId);
  return rows.length > 0;
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
    var res = await fetch(targetUrl + '/rest/v1/users?id=eq.' + encodeURIComponent(userId), {
      method: 'PATCH',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ email: normalized, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
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
  var redirectTo = okbmOAuthRedirectTo();
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
    window.location.assign(url);
  } catch (err) {
    console.warn('[Supabase OAuth ' + provider + ']', err);
    okbmMarkSocialButtonsBusy(false);
    if (typeof showToast === 'function') showToast('로그인을 시작하지 못했습니다.', 'warn');
  }
}

function okbmShouldSkipOAuthBootstrap(session) {
  if (!session || !session.user) return true;
  var token = String(session.access_token || '').trim();
  if (token && localStorage.getItem('user_auth_token') === token) return true;
  var profile = safeGetJSON('user_profile', null);
  if (!profile || !profile.id) return false;
  if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) return false;
  var sessionEmail = window.okbmNormalizeEmail(session.user.email || '');
  var profileEmail = window.okbmNormalizeEmail(profile.email || localStorage.getItem('okbm_user_email') || '');
  if (sessionEmail && profileEmail && sessionEmail === profileEmail) {
    if (token) localStorage.setItem('user_auth_token', token);
    return true;
  }
  return false;
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
  if (provider !== 'google' && provider !== 'apple') return;
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
  if (identity) providerId = String(identity.id || identity.identity_id || '').trim();
  if (!providerId) providerId = String(user.id || '').trim();
  var um = user.user_metadata || {};
  var nick = String(um.full_name || um.name || um.nickname || '').trim();
  var photo = String(um.avatar_url || um.picture || '').trim();
  var email = String(user.email || um.email || '').trim();
  try {
    await handleSocialLoginSuccess(provider, providerId, email, nick, photo, session.access_token);
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
      okbmConsumeSupabaseOAuthSession(session);
    }).catch(function(e) {
      console.warn('[okbmInitSupabaseOAuthBridge getSession]', e);
    });
  }
  if (typeof client.auth.onAuthStateChange === 'function') {
    client.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_IN') okbmConsumeSupabaseOAuthSession(session);
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
  var providerScopedId = providerId.indexOf(provider + '_') === 0 ? providerId : (provider + '_' + providerId);
  var existingUser = null;
  if (normalizedEmail) existingUser = await okbmFindUserByEmail(normalizedEmail);
  if (!existingUser) existingUser = await okbmFindUserById(providerScopedId);

  var prevUserId = String(localStorage.getItem('okbm_user_id') || '').trim();
  if (!existingUser && prevUserId && prevUserId !== 'guest' && typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
    existingUser = await okbmFindUserById(prevUserId);
  }

  var resolvedId;
  var linkedExisting = false;
  if (existingUser && existingUser.id) {
    resolvedId = String(existingUser.id).trim();
    linkedExisting = true;
  } else {
    resolvedId = providerScopedId;
  }

  if (prevUserId && prevUserId !== resolvedId && prevUserId !== 'guest') {
    okbmPurgeLocalSessionData();
  }

  var existingProfile = safeGetJSON('user_profile_' + resolvedId, null);
  var customNick = String(localStorage.getItem('okbm_custom_nickname_' + resolvedId) || '').trim();
  var cloudNick = existingUser && existingUser.nickname ? String(existingUser.nickname).trim() : '';
  var incomingNick = okbmNormalizeNickname(nickname);
  var finalNick = linkedExisting
    ? (cloudNick || customNick || incomingNick || '낭만백패커')
    : (incomingNick || customNick || '낭만백패커');
  if (!linkedExisting) {
    finalNick = await okbmResolveUniqueNickname(finalNick, resolvedId);
  }
  var cloudPhoto = existingUser && (existingUser.hero_cover_url || existingUser.photo_url)
    ? String(existingUser.hero_cover_url || existingUser.photo_url).trim()
    : '';
  var photo = linkedExisting
    ? (cloudPhoto || String(photoUrl || '').trim())
    : (String(photoUrl || '').trim() || cloudPhoto || (existingProfile && (existingProfile.photoUrl || existingProfile.heroCoverUrl)) || '');

  var cloudSns = okbmReadSnsFromUserRow(existingUser);
  if (cloudSns.instagram) localStorage.setItem('okbm_user_instagram', cloudSns.instagram);
  if (cloudSns.youtube) localStorage.setItem('okbm_user_youtube', cloudSns.youtube);
  if (cloudSns.blog) localStorage.setItem('okbm_user_blog', cloudSns.blog);

  var profile = {
    id: resolvedId,
    nickname: finalNick,
    email: (existingUser && existingUser.email) || normalizedEmail || (existingProfile && existingProfile.email) || '',
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

  var token = String(authToken || '').trim() || (provider + '_session_' + Date.now());
  localStorage.setItem('user_auth_token', token);
  localStorage.setItem('user_profile', JSON.stringify(profile));
  localStorage.setItem('user_profile_' + resolvedId, JSON.stringify(profile));
  localStorage.setItem('okbm_user_id', resolvedId);
  localStorage.setItem('okbm_user_nick', finalNick);
  localStorage.setItem('okbm_last_login_provider', provider);
  if (profile.email) localStorage.setItem('okbm_user_email', profile.email);
  if (photo) localStorage.setItem('okbm_hero_cover_url', photo);

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = true;
    authState.userProfile = profile;
  }

  if (typeof closeLoginModal === 'function') closeLoginModal();
  if (typeof showToast === 'function') {
    if (linkedExisting) {
      showToast('[' + finalNick + ']님, 기존 계정으로 안전하게 연결되었습니다.', 'success', 1800);
    } else {
      showToast('[' + finalNick + ']님 환영합니다.', 'success', 1500);
    }
  }

  try {
    if (linkedExisting) {
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
    window.__okbmIsAdmin = !!(existingUser && existingUser.is_admin === true);
    if (typeof window.okbmRefreshAdminFlagFromServer === 'function') {
      await window.okbmRefreshAdminFlagFromServer();
    }
  } catch (e) {
    window.__okbmIsAdmin = false;
  }

  if (typeof trackDailyVisit === 'function') trackDailyVisit(true);

  setTimeout(function() { window.location.reload(); }, 200);
}
window.handleSocialLoginSuccess = handleSocialLoginSuccess;

function loginWithKakao() {
  triggerHaptic(12);
  if (typeof Kakao === 'undefined') {
    showToast('카카오 SDK를 불러오지 못했습니다.', 'warn');
    return;
  }
  var appKey = window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1";
  if (!Kakao.isInitialized()) {
    Kakao.init(appKey);
  }

  okbmMarkSocialButtonsBusy(true, '카카오 로그인 인증 중...', 'btn-social-kakao');

  var loginMethod = (Kakao.Auth && typeof Kakao.Auth.loginForm === 'function') ? Kakao.Auth.loginForm : Kakao.Auth.login;
  loginMethod({
    scope: 'profile_nickname,account_email,profile_image',
    throughTalk: false,
    success: function(authObj) {
      Kakao.API.request({
        url: '/v2/user/me',
        success: function(res) {
          var kakaoNick = '';
          var photoUrl = '';
          var email = '';
          if (res.kakao_account && res.kakao_account.email) {
            email = String(res.kakao_account.email).trim();
          }
          if (res.kakao_account && res.kakao_account.profile) {
            if (res.kakao_account.profile.nickname) kakaoNick = String(res.kakao_account.profile.nickname).trim();
            photoUrl = res.kakao_account.profile.profile_image_url || res.kakao_account.profile.thumbnail_image_url || '';
          }
          if (!kakaoNick && res.properties && res.properties.nickname) {
            kakaoNick = String(res.properties.nickname).trim();
          }
          if (!photoUrl && res.properties) {
            photoUrl = res.properties.profile_image || res.properties.thumbnail_image || '';
          }
          handleSocialLoginSuccess(
            'kakao',
            String(res.id).trim(),
            email,
            kakaoNick,
            photoUrl,
            authObj && authObj.access_token
          );
        },
        fail: function() {
          okbmMarkSocialButtonsBusy(false);
          if (typeof showToast === 'function') showToast('사용자 정보 수신 실패', 'warn');
        }
      });
    },
    fail: function(err) {
      okbmMarkSocialButtonsBusy(false);
      console.warn('[Kakao Auth Fail]', err);
      if (typeof showToast === 'function') showToast('로그인이 취소되었습니다.', 'warn');
    }
  });
}
window.loginWithKakao = loginWithKakao;

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
  var token = '';
  var cachedProfile = null;
  try { token = sessionStorage.getItem('okbm_naver_oauth_token') || ''; } catch (e) {}
  try {
    var rawProfile = sessionStorage.getItem('okbm_naver_profile') || '';
    if (rawProfile) cachedProfile = JSON.parse(rawProfile);
  } catch (e) {}
  if (!token && !(cachedProfile && cachedProfile.id)) return false;
  try { sessionStorage.removeItem('okbm_naver_oauth_token'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_oauth_state'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_profile'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_client_id'); } catch (e) {}
  try { sessionStorage.removeItem('okbm_naver_return'); } catch (e) {}

  try {
    var profile = cachedProfile && cachedProfile.id ? cachedProfile : await okbmFetchNaverProfile(token);
    await handleSocialLoginSuccess('naver', profile.id, profile.email, profile.nickname, profile.photo, token);
    return true;
  } catch (err) {
    console.warn('[Naver profile]', err);
    okbmMarkSocialButtonsBusy(false);
    if (typeof showToast === 'function') showToast('네이버 사용자 정보를 불러오지 못했습니다.', 'warn');
    return true;
  }
}

function loginWithNaver() {
  triggerHaptic(12);
  var state = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('okbm_naver_oauth_state', state);
  sessionStorage.setItem('okbm_naver_client_id', NAVER_CLIENT_ID);
  sessionStorage.setItem('okbm_naver_return', window.location.pathname + window.location.search);

  var clientId = NAVER_CLIENT_ID;
  var cleanRedirect = window.location.origin + '/naver-callback.html';

  var naverAuthUrl = 'https://nid.naver.com/oauth2.0/authorize?response_type=token'
    + '&client_id=' + clientId
    + '&redirect_uri=' + encodeURIComponent(cleanRedirect)
    + '&state=' + state;

  okbmMarkSocialButtonsBusy(true, '네이버 로그인 중...', 'btn-social-naver');
  console.log('[Naver Login URL]', naverAuthUrl);
  window.location.href = naverAuthUrl;
}
window.loginWithNaver = loginWithNaver;

async function loginWithGoogle() {
  await okbmStartSupabaseOAuth('google', 'btn-social-google', 'Google 로그인 중...');
}
window.loginWithGoogle = loginWithGoogle;

okbmConsumeNaverOAuthCallback().then(function(consumedNaver) {
  if (!consumedNaver) okbmInitSupabaseOAuthBridge();
}).catch(function() {
  okbmInitSupabaseOAuthBridge();
});

window.shareFeedToCommunity = async function(feedRecord) {
  if (!feedRecord) return [];

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || 'anonymous');
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
        'Authorization': 'Bearer ' + targetKey,
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

  var prof = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
  var resolvedUserId = String(proposalData.userId || proposalData.user_id || (prof && prof.id) || localStorage.getItem('okbm_user_id') || localStorage.getItem('user_auth_token') || '');

  var tableName = isCorrection ? 'spot_corrections' : 'proposals';
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
    user_id: resolvedUserId
  };

  try {
    var res = await fetch(targetUrl + '/rest/v1/' + tableName, {
      method: 'POST',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
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
    var res = await fetch(targetUrl + '/rest/v1/' + tableName + '?id=eq.' + encodeURIComponent(String(propId)), {
      method: 'DELETE',
      headers: {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      }
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
    'Authorization': 'Bearer ' + targetKey,
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
      return clone;
    };

    return [
      ...props.map(function(p) { return normalizeProp(p, false); }),
      ...corrs.map(function(c) { return normalizeProp(c, true); })
    ].filter(Boolean);
  } catch (e) { console.warn('[romantic-sync.js:fetchMyProposalsFromSupabase]', e); }
  return [];
};

window.saveUserToSupabase = async function(profileData) {
  if (window.__okbmAccountPurging) return false;
  var targetUrl = window.SUPABASE_URL || SUPABASE_URL;
  var targetKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!targetUrl || !targetKey) return false;

  var prof = profileData || safeGetJSON('user_profile', null);
  var userId = prof && prof.id ? String(prof.id).trim() : (localStorage.getItem('okbm_user_id') || '');
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
    var incomingIsSocialDefault = nickname === '김사자' || nickname === '낭만백패커';
    if (existingNick && existingNick !== '낭만백패커' && (!nickname || incomingIsSocialDefault)) {
      nickname = existingNick;
    }
    var existingMg = existingRow.my_gears && typeof existingRow.my_gears === 'object' ? existingRow.my_gears : {};
    var existingSelected = existingMg.selectedGears || existingMg.selected_gears || {};
    if ((!selectedGears || !Object.keys(selectedGears).length) && existingSelected && Object.keys(existingSelected).length) {
      selectedGears = existingSelected;
    }
    if ((!favoriteGears || !favoriteGears.length) && Array.isArray(existingMg.favoriteGears) && existingMg.favoriteGears.length) {
      favoriteGears = existingMg.favoriteGears;
    }
    if ((!customGears || !customGears.length) && Array.isArray(existingMg.customGears) && existingMg.customGears.length) {
      customGears = existingMg.customGears;
    }
    if ((!gearPresets || !gearPresets.length) && Array.isArray(existingMg.gearPresets) && existingMg.gearPresets.length) {
      gearPresets = existingMg.gearPresets;
    }
    if ((!gearMeta || !Object.keys(gearMeta).length) && existingMg.gearMeta && Object.keys(existingMg.gearMeta).length) {
      gearMeta = existingMg.gearMeta;
    }
    if ((!planMemos || !Object.keys(planMemos).length) && existingMg.planMemos && Object.keys(existingMg.planMemos).length) {
      planMemos = existingMg.planMemos;
    }
    if ((!planSpots || !Object.keys(planSpots).length) && existingMg.planSpots && Object.keys(existingMg.planSpots).length) {
      planSpots = existingMg.planSpots;
    }
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
  var userEmail = window.okbmNormalizeEmail((prof && prof.email) || localStorage.getItem('okbm_user_email') || '');
  if (userEmail) payload.email = userEmail;

  try {
    var postHeaders = {
      'apikey': targetKey,
      'Authorization': 'Bearer ' + targetKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
    var res = await fetch(targetUrl + '/rest/v1/users', {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify(payload)
    });
    if (res.ok) return true;
    if (res.status === 400 && payload.email) {
      delete payload.email;
      var retry = await fetch(targetUrl + '/rest/v1/users', {
        method: 'POST',
        headers: postHeaders,
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
