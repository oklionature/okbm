/**
 * 🏕️ 낭만루트 구글 시트 실시간 동기화 & 낭만보관함 복원 코어 엔진 (v2.2.0 Master)
 * - [RomanticVault 금고 엔진]: 전 기종·브라우저 일원화 마스터 트랜잭션 (찜/클리어/메모 새로고침 0% 즉시 반영)
 * - [9열 표준 스키마 1:1 완벽 직통]: G열(my_gears: 슬롯/⭐찜/커스텀) 및 I열(14일 쿨다운 타임스탬프) 보존
 * - [동기화 락 & 역전 덮어쓰기 원천 차단]: 서버 수화(Hydration) 중 역전송 차단 및 지도/홈 선택적 백업 격리
 * - [P열 photoMemos 완벽 보존]: 커뮤니티 피드 공유 시 사진 메모 유실 원천 방어
 * - [회원 관리 직통 복원]: 프로필 버튼 터치 시 계정/닉네임 관리 모달(openUserProfileModal) 직통 연결
 */

var GAS_API_URL = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
var R2_PUBLIC_DOMAIN = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
window.R2_PUBLIC_DOMAIN = R2_PUBLIC_DOMAIN;

// 🛡️ 글로벌 클라우드 안전 로드 플래그 초기화
if (typeof window.isCloudDataLoaded === 'undefined') {
  window.isCloudDataLoaded = false;
}

// 🧰 [공통 유틸] 안전한 로컬스토리지 JSON 파싱 헬퍼
function safeGetJSON(key, defaultVal) {
  try {
    var item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

// 🧰 [공통 유틸] 안전한 햅틱 피드백 트리거
function triggerHaptic(duration) {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
        navigator.vibrate(duration || 12);
      }
    } catch (e) {}
  }
}

// 🧰 [공통 유틸] 안전한 토스트 메시지 출력 (매개변수 타입 자동 감지 보정)
function showToast(msg, typeOrDuration, maybeDuration) {
  var dur = 2500;
  if (typeof typeOrDuration === 'number') {
    dur = typeOrDuration;
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
  if (container) {
    var toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(7,10,15,0.95); border:1.5px solid #38bdf8; color:#ffffff; font-size:0.76rem; font-weight:800; padding:10px 15px; border-radius:24px; box-shadow:0 12px 35px rgba(0,0,0,0.9); z-index:9999999; display:flex; align-items:center; gap:5px;';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, dur);
  }
}

// 🧰 [공통 유틸] 브라우저 표준 한국 시간 타임스탬프 생성기
function getFormattedNow() {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '. ' + pad(d.getMonth() + 1) + '. ' + pad(d.getDate()) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
window.getFormattedNow = getFormattedNow;

function UtilitiesFormattedNow() {
  return getFormattedNow();
}
window.UtilitiesFormattedNow = UtilitiesFormattedNow;

// 🧰 [비상 초기화 엔진] 전 기종 로컬 캐시 & IndexedDB & 클라우드 피드 완전 무결 포맷
window.executeCleanSlateMasterReset = async function(isSilent) {
  if (!isSilent && !confirm('⚠️ 주의: 모든 출발 기록과 사진 맵이 영구 포맷됩니다.\n(회원 계정 및 찜/클리어 목록은 보존됩니다)\n정말 초기화하시겠습니까?')) {
    return;
  }

  window.__memoryStore = window.__memoryStore || {};
  window.__memoryStore['okbm_packing_history'] = [];
  window.__memoryStore['okbm_phone_photos_map'] = {};
  window.__memoryStore['okbm_trip_photos_map'] = {};
  window.packingHistoryList = [];
  window.interactiveHistory = [];
  window.heroTopRecords = [];
  window.__allLoadedFeeds = [];

  localStorage.removeItem('okbm_packing_history');
  localStorage.removeItem('okbm_phone_photos_map');
  localStorage.removeItem('okbm_trip_photos_map');
  localStorage.removeItem('okbm_cached_community_feeds');
  localStorage.removeItem('okbm_hero_cover_url');
  localStorage.removeItem('okbm_card_likes_count');

  if (typeof window.saveToIndexedDB === 'function') {
    await window.saveToIndexedDB('okbm_packing_history', []);
    await window.saveToIndexedDB('okbm_phone_photos_map', {});
    await window.saveToIndexedDB('okbm_trip_photos_map', {});
  }

  if (isUserLoggedIn()) {
    syncUserDataToCloud(true);
  }

  var profile = safeGetJSON('user_profile', null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || '');
  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (targetGasUrl && !targetGasUrl.includes('구글시트_배포_URL')) {
    fetch(targetGasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'CLEAR_USER_ALL_FEEDS',
        userId: userId
      })
    }).catch(function() {});
  }

  triggerHaptic(20);
  showToast('🧹 모든 피드와 사진이 초기화되었습니다. 새로고침합니다.', 2000);

  setTimeout(function() {
    var url = new URL(window.location.href);
    url.searchParams.delete('clean_slate');
    window.location.href = url.pathname + (url.search ? url.search : '');
  }, 1200);
};

if (typeof window !== 'undefined' && window.location.search.includes('clean_slate=true')) {
  setTimeout(function() {
    window.executeCleanSlateMasterReset(true);
  }, 300);
}

// ☁️ 1. Cloudflare R2 글로벌 CDN (0.03초 1순위) ➔ 구글 시트(2순위 백업망) 직통 조회
async function loadUserDataFromCloud(userId) {
  if (!userId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('📡 [RomanticSync] 오프라인 감지: 로컬 캐시로 즉시 전환합니다.');
    return null;
  }

  try {
    var r2Url = R2_PUBLIC_DOMAIN.replace(/\/+$/, '') + '/users/user_' + encodeURIComponent(userId) + '.json?_t=' + Date.now();
    var r2Res = await fetch(r2Url, { cache: 'no-store' });
    if (r2Res.ok) {
      var r2Data = await r2Res.json();
      if (r2Data && (r2Data.status === 'SUCCESS' || r2Data.bookmarks || r2Data.packHistory || r2Data.myGears || r2Data.nickname)) {
        console.log('⚡ [RomanticSync] Cloudflare R2 CDN에서 유저 데이터 0.03초 번개 인출 성공!');
        return r2Data.userData || r2Data;
      }
    }
  } catch (r2Err) {
    console.log('📡 [RomanticSync] R2 최초 조회 대기, 구글 클라우드로 전환:', r2Err.message);
  }

  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 7000);
    var res = await fetch(GAS_API_URL + '?action=GET_USER_DATA&userId=' + encodeURIComponent(userId) + '&_t=' + Date.now(), {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      var data = await res.json();
      if (data && (data.status === 'SUCCESS' || data.isFound || data.bookmarks || data.userData)) {
        return data.userData || data;
      }
    }
  } catch (e) {
    console.warn('[RomanticSync] 클라우드 데이터 수신 실패/타임아웃:', e);
  }
  return null;
}

// 🔑 2. 로그인 상태 검증 및 세션 체크
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
  if (!idStr.startsWith('kakao_')) {
    idStr = 'kakao_' + idStr;
    profile.id = idStr;
    profile.isMember = true;
    localStorage.setItem('user_profile', JSON.stringify(profile));
    localStorage.setItem('user_profile_' + idStr, JSON.stringify(profile));
    localStorage.setItem('okbm_user_id', idStr);
  }

  var hasValid = !!(profile.id && String(profile.id).startsWith('kakao_'));
  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = hasValid;
    authState.userProfile = profile;
  }
  return hasValid;
}

// 📊 3. 일일 방문자 통계 기록 전송
function trackDailyVisit() {
  var sessionKey = 'okbm_visit_recorded_' + new Date().toISOString().slice(0, 10);
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, 'true');
    fetch(GAS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'RECORD_VISIT',
        isLogin: isUserLoggedIn()
      })
    }).catch(function() {});
  }
}

// 🏛️ [RomanticVault] 전 기종·브라우저 일원화 마스터 트랜잭션 금고 매니저
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

    if (key === 'okbm_phone_photos_map' || key === 'okbm_trip_photos_map') {
      if (typeof window.saveToIndexedDB === 'function') {
        window.saveToIndexedDB(key, val);
      }
      return;
    }

    try {
      var cleanObj = val;
      if (key === 'okbm_packing_history' && Array.isArray(val)) {
        cleanObj = val.map(function(item) {
          var clone = Object.assign({}, item);
          delete clone.photos;
          delete clone.photo;
          delete clone.fieldPhoto;
          return clone;
        });
        if (typeof window.saveToIndexedDB === 'function') {
          window.saveToIndexedDB(key, val);
        }
      }
      localStorage.setItem(key, JSON.stringify(cleanObj));
    } catch (e) {}

    if (shouldSyncCloud && typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(key === 'okbm_packing_history');
    }
  },

  // ⭐ [찜 토글 일원화 API - 새로고침 0% 즉시 반영]
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

  // 🚩 [클리어 토글 일원화 API - 새로고침 0% 즉시 반영]
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

  // 📝 [비밀 메모 저장 일원화 API]
  saveMemo: function(spotId, memoText) {
    var sId = String(spotId).trim();
    if (!sId) return;
    var memos = this.read('okbm_memos', {});
    memos[sId] = String(memoText || '').trim();
    this.write('okbm_memos', memos, true);
    if (window.userMemos) window.userMemos = memos;
  },

  // 🔄 [서버 정본 자동 수화(Hydration) 마스터 스위치]
  hydrateFromServer: async function(userId) {
    if (!userId || this.isHydrating) return null;
    this.isHydrating = true;
    try {
      var cloudData = await loadUserDataFromCloud(userId);
      if (cloudData) {
        if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
          this.write('okbm_bookmarks', cloudData.bookmarks, false);
          if (window.userBookmarks) window.userBookmarks = new Set(cloudData.bookmarks.map(String));
        }
        if (cloudData.visited && Array.isArray(cloudData.visited)) {
          this.write('okbm_visited', cloudData.visited, false);
          if (window.userVisited) window.userVisited = new Set(cloudData.visited.map(String));
        }
        if (cloudData.memos && typeof cloudData.memos === 'object') {
          this.write('okbm_memos', cloudData.memos, false);
          if (window.userMemos) window.userMemos = cloudData.memos;
        }
        if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
          var cleanHist = cloudData.packHistory.filter(function(h) { return h && !h.isDeleted; });
          this.write('okbm_packing_history', cleanHist, false);
          window.interactiveHistory = cleanHist;
          window.packingHistoryList = cleanHist;
        }
        if (cloudData.myGears && typeof cloudData.myGears === 'object') {
          var mg = cloudData.myGears;
          if (mg.selectedGears) this.write('okbm_selected_gears_multi', mg.selectedGears, false);
          if (mg.favoriteGears) this.write('okbm_favorite_gears', mg.favoriteGears, false);
          if (mg.customGears) this.write('okbm_custom_gears', mg.customGears, false);
          if (mg.gearPresets) this.write('okbm_gear_presets', mg.gearPresets, false);
          if (mg.gearMeta) this.write('okbm_gear_meta', mg.gearMeta, false);
        }
        this.isHydrated = true;
        console.log('✅ [RomanticVault] 서버 정본 로컬 수화(Hydration) 완결');

        try {
          if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
          if (typeof window.renderPlanBookmarks === 'function') window.renderPlanBookmarks();
          if (typeof window.renderSpots === 'function') window.renderSpots();
          if (typeof window.refreshCurrentSpotPopup === 'function') window.refreshCurrentSpotPopup();
          window.dispatchEvent(new CustomEvent('okbm_bookmark_changed', { detail: { bookmarks: cloudData.bookmarks || [] } }));
        } catch(renderErr) {}
      }
      return cloudData;
    } catch(e) {
      return null;
    } finally {
      this.isHydrating = false;
    }
  }
};

// 🚀 앱 접속 즉시 로그인 회원 데이터 백그라운드 자동 수화
if (typeof window !== 'undefined') {
  setTimeout(function() {
    if (typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
      var profile = safeGetJSON('user_profile', null);
      var uId = (profile && profile.id) ? String(profile.id).trim() : localStorage.getItem('user_auth_token');
      if (uId && window.RomanticVault) {
        window.RomanticVault.hydrateFromServer(uId);
      }
    }
  }, 100);
}

// ☁️ 4. 클라우드 단일 트랜잭션 동기화
function syncUserDataToCloud(isPackHistoryUpdated) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = profile && profile.id ? String(profile.id).trim() : localStorage.getItem('user_auth_token');
  if (!userId) return;

  if (window.RomanticVault && window.RomanticVault.isHydrating === true) {
    console.log('⏳ [RomanticSync] 서버 수화 진행 중: 클라우드 역전송 일시 보류.');
    return;
  }

  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  var isPackExplicitlyUpdated = (isPackHistoryUpdated === true);
  var shouldSyncPackHistory = isPackExplicitlyUpdated || (!isMapPage && window.RomanticVault.isHydrated === true);

  var rawHistory = [];
  if (Array.isArray(window.__tombstoneHistoryQueue) && window.__tombstoneHistoryQueue.length > 0) {
    rawHistory = window.__tombstoneHistoryQueue;
  } else if (window.interactiveHistory && Array.isArray(window.interactiveHistory)) {
    rawHistory = window.interactiveHistory;
  } else if (window.packingHistoryList && Array.isArray(window.packingHistoryList)) {
    rawHistory = window.packingHistoryList;
  } else {
    rawHistory = window.RomanticVault.read('okbm_packing_history', []);
  }

  if (rawHistory.length === 0 && (!window.__tombstoneHistoryQueue || window.__tombstoneHistoryQueue.length === 0) && !isPackExplicitlyUpdated) {
    shouldSyncPackHistory = false;
  }

  var cleanActiveHistory = rawHistory.filter(function(h) { return h && !h.isDeleted; });
  window.packingHistoryList = cleanActiveHistory;
  window.interactiveHistory = cleanActiveHistory;

  var lightweightPackHistory = rawHistory.filter(Boolean).map(function(h) {
    if (h.isDeleted === true) {
      return {
        id: String(h.id),
        date: String(h.date || ''),
        isDeleted: true,
        deletedAt: Number(h.deletedAt) || Date.now()
      };
    }

    var copy = Object.assign({}, h);
    var validUrls = [];
    if (Array.isArray(copy.photos)) {
      validUrls = copy.photos.filter(function(p) { return typeof p === 'string' && p.startsWith('http'); });
    }
    if (typeof copy.photo === 'string' && copy.photo.startsWith('http') && !validUrls.includes(copy.photo)) {
      validUrls.unshift(copy.photo);
    }
    if (typeof copy.fieldPhoto === 'string' && copy.fieldPhoto.startsWith('http') && !validUrls.includes(copy.fieldPhoto)) {
      validUrls.unshift(copy.fieldPhoto);
    }

    if (validUrls.length > 0) {
      copy.photos = validUrls;
      copy.photo = validUrls[0];
      copy.fieldPhoto = validUrls[0];
    } else {
      delete copy.photo;
      delete copy.photos;
      delete copy.fieldPhoto;
    }

    return copy;
  });

  var currentGears = window.selectedGearMap || safeGetJSON('okbm_selected_gears_multi', {});
  var currentFavs = window.favoriteGearSet ? Array.from(window.favoriteGearSet) : safeGetJSON('okbm_favorite_gears', []);
  var currentCustoms = safeGetJSON('okbm_custom_gears', []);
  var currentPresets = safeGetJSON('okbm_gear_presets', []);
  var currentGearMeta = safeGetJSON('okbm_gear_meta', {});

  var myGearsPayload = {
    selectedGears: currentGears,
    favoriteGears: currentFavs,
    customGears: currentCustoms,
    gearPresets: currentPresets,
    gearMeta: currentGearMeta
  };

  var payload = {
    action: 'SAVE_USER_DATA',
    userId: userId,
    nickname: (profile && profile.nickname) ? profile.nickname : '낭만백패커',
    fromMap: isMapPage && !isPackExplicitlyUpdated,
    fromIndex: !isMapPage || isPackExplicitlyUpdated,
    forcePackSync: shouldSyncPackHistory,
    createdAt: (profile && profile.createdAt) ? profile.createdAt : getFormattedNow(),
    lastNicknameChangedAt: profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0,
    bookmarks: safeGetJSON('okbm_bookmarks', []),
    visited: safeGetJSON('okbm_visited', []),
    memos: safeGetJSON('okbm_memos', {}),
    following: safeGetJSON('okbm_following_users', []),
    packHistory: shouldSyncPackHistory ? lightweightPackHistory : undefined,
    myGears: myGearsPayload
  };

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    localStorage.setItem('okbm_pending_cloud_sync', 'true');
    console.log('📡 [RomanticSync] 네트워크 차단: 변경사항 기기 보존 및 재연결 대기열 등록.');
    updateHeaderAuthUI();
    return;
  }

  clearTimeout(window.RomanticVault._syncTimer);
  window.RomanticVault._syncTimer = setTimeout(function() {
    fetch(targetGasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.status === 'SUCCESS') {
        localStorage.removeItem('okbm_pending_cloud_sync');
        console.log('✅ [RomanticSync] 단일 트랜잭션 동기화 성공!');
        updateHeaderAuthUI();
      } else {
        localStorage.setItem('okbm_pending_cloud_sync', 'true');
      }
    })
    .catch(function(err) {
      localStorage.setItem('okbm_pending_cloud_sync', 'true');
      console.warn('[RomanticSync] 클라우드 전송 오류:', err);
      updateHeaderAuthUI();
    });
  }, 300);
}

// 🌐 네트워크 복구 리스너
if (typeof window !== 'undefined') {
  window.addEventListener('online', function() {
    updateHeaderAuthUI();
    if (localStorage.getItem('okbm_pending_cloud_sync') === 'true' && isUserLoggedIn()) {
      showToast('🟢 네트워크 복구: 클라우드 자동 동기화 중...', 2000);
      syncUserDataToCloud(true);
    }
  });
  window.addEventListener('offline', function() {
    updateHeaderAuthUI();
  });
}

// 🧭 5. 상단 헤더 및 보관함 로그인 상태 UI 업데이트
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
      statusText.innerText = '📡 기기 로컬 보관 중 (통신 연결 시 자동 백업)';
      statusAction.innerText = hasPending ? '대기 중 ⏳' : '오프라인';
    } else if (isLogged) {
      statusBanner.className = 'cloud-status-banner cloud-status-member';
      statusText.innerText = '🟢 낭만 클라우드 실시간 안전 백업 중';
      statusAction.innerText = '동기화됨 ✓';
    } else {
      statusBanner.className = 'cloud-status-banner cloud-status-guest';
      statusText.innerText = '기기 임시 보관 중 (캐시 삭제 시 초기화 주의)';
      statusAction.innerText = '카카오 1초 연동 ➔';
    }
  }
}

/// 🏛️ [마이데이터 & 인증 모달 일원화 DOM 마운터]
function ensureMyReportAndAuthModalsInDOM() {
  if (document.getElementById('userProfileModalOverlay')) return;

  var container = document.createElement('div');
  container.id = 'romanticAuthDomBundle';
  container.innerHTML = `
    <!-- 1. 카카오 1초 간편 로그인 모달 -->
    <div class="custom-modal-overlay" id="loginModalOverlay" onclick="if(event.target===this) closeLoginModal();" style="display:none; position:fixed; inset:0; background:#000000; z-index:99999; justify-content:center; align-items:stretch; width:100%; height:100dvh; padding:0; overflow:hidden;">
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">
        <div style="flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:calc(20px + env(safe-area-inset-top, 0px)) 16px calc(76px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; text-align:center; box-sizing:border-box;">
          <div style="width:54px; height:54px; border-radius:50%; background:rgba(255,255,255,0.08); border:1.5px solid #ffffff; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" style="width:26px; height:26px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
          </div>
          <div>
            <h3 style="color:#ffffff; font-size:1.15rem; font-weight:900;">낭만 백패커 로그인</h3>
            <p style="font-size:0.78rem; color:#94a3b8; line-height:1.5; margin-top:6px;">
              로그인 시 나만의 배낭 패킹 기록, 10대 슬롯 세팅,<br>그리고 소중한 비밀 메모가 클라우드에 안전하게 백업됩니다.
            </p>
          </div>
          <div style="width:100%; max-width:320px; display:flex; flex-direction:column; gap:8px; margin-top:10px;">
            <button type="button" class="modal-btn btn-social-kakao" style="width:100%; height:44px; font-size:0.86rem; font-weight:900; border-radius:10px; background:#fee500; color:#191919; border:none; cursor:pointer;" onclick="loginWithKakao()">
              카카오 1초 간편 로그인
            </button>
            <button type="button" class="modal-btn" style="width:100%; height:40px; background:rgba(255,255,255,0.06); color:#cbd5e1; font-weight:800; font-size:0.78rem; border-radius:10px; border:none; cursor:pointer;" onclick="closeLoginModal()">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 정통 마이데이터(마이리포트) 대시보드 모달 -->
    <div class="custom-modal-overlay" id="userProfileModalOverlay" onclick="if(event.target===this) closeUserProfileModal();" style="display:none; position:fixed; inset:0; background:#000000; z-index:99999; justify-content:center; align-items:stretch; width:100%; height:100dvh; padding:0; overflow:hidden;">
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">
        
        <!-- 헤더: 좌측 [마이리포트] ↔ 우측 [원형 프로필 + 닉네임 인출] -->
        <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box;">
          <span style="font-size:1.05rem; font-weight:900; color:#ffffff; letter-spacing:-0.03em;">마이리포트</span>
          
          <div onclick="triggerHaptic(12); window.openAccountSettingsModal();" title="개인정보 및 아이디 변경" style="display:flex; align-items:center; gap:8px; cursor:pointer; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); padding:3px 10px 3px 4px; border-radius:20px;">
            <div style="position:relative; width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg, #38bdf8, #818cf8, #f43f5e); padding:1.8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <div style="width:100%; height:100%; border-radius:50%; background:#090d14; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div style="position:absolute; bottom:-1px; right:-1px; width:10px; height:10px; border-radius:50%; background:#38bdf8; border:1px solid #000; display:flex; align-items:center; justify-content:center;">
                <svg viewBox="0 0 24 24" style="width:6px; height:6px;" fill="none" stroke="#000" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <span id="reportHeaderCurrentNick" style="font-size:0.78rem; font-weight:800; color:#ffffff; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">오라네</span>
          </div>
        </div>

        <!-- 본문: 한 화면 직관 통계 & 필터별 전환 모듈 -->
        <div style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px 14px calc(76px + env(safe-area-inset-bottom, 0px)) 14px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;">
          
          <!-- 해당연도 vs 역대 누적 활동 횟수 듀얼 카운터 -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:linear-gradient(135deg, rgba(56,189,248,0.18), rgba(2,132,199,0.06)); border:1.5px solid rgba(56,189,248,0.4); border-radius:14px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.68rem; color:#94a3b8; font-weight:800;">올해 활동</span>
                <span id="reportYearBadge" style="font-size:0.58rem; color:#38bdf8; font-family:var(--font-en); font-weight:900; background:rgba(56,189,248,0.12); padding:1.5px 5px; border-radius:4px;">2026</span>
              </div>
              <div style="margin-top:6px;">
                <span id="reportYearCountNumber" style="font-size:1.75rem; font-weight:900; color:#ffffff; font-family:var(--font-en); line-height:1;">0</span>
                <span style="font-size:0.82rem; font-weight:900; color:#38bdf8; margin-left:2px;">회</span>
              </div>
              <div style="font-size:0.58rem; color:#64748b; margin-top:4px;">올해 필드 방문 기록</div>
            </div>

            <div style="background:linear-gradient(135deg, rgba(251,191,36,0.16), rgba(217,119,6,0.06)); border:1.5px solid rgba(251,191,36,0.4); border-radius:14px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.68rem; color:#94a3b8; font-weight:800;">누적 총 활동</span>
                <span style="font-size:0.58rem; color:#fde047; font-weight:900; background:rgba(251,191,36,0.12); padding:1.5px 5px; border-radius:4px;">역대 전체</span>
              </div>
              <div style="margin-top:6px;">
                <span id="reportTotalCountNumber" style="font-size:1.75rem; font-weight:900; color:#ffffff; font-family:var(--font-en); line-height:1;">0</span>
                <span style="font-size:0.82rem; font-weight:900; color:#fde047; margin-left:2px;">회</span>
              </div>
              <div style="font-size:0.58rem; color:#64748b; margin-top:4px;">텐트 밖에서 보낸 밤</div>
            </div>
          </div>

          <!-- 4대 필터 탭 바 (모바일 수직 찌그러짐 원천 차단: flex-shrink:0 및 여유 높이 확보) -->
          <div style="display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch; flex-shrink:0 !important; min-height:36px; padding:4px 2px 6px 2px; align-items:center; box-sizing:border-box;">
            <button type="button" id="tabBtnReportAll" class="n-cat-chip active" onclick="window.switchReportTab('all', this)" style="height:28px; font-size:0.72rem; padding:0 11px; flex-shrink:0;">전체 요약</button>
            <button type="button" id="tabBtnReportGear" class="n-cat-chip" onclick="window.switchReportTab('gear', this)" style="height:28px; font-size:0.72rem; padding:0 11px; flex-shrink:0;">장비 & 무게</button>
            <button type="button" id="tabBtnReportTerrain" class="n-cat-chip" onclick="window.switchReportTab('terrain', this)" style="height:28px; font-size:0.72rem; padding:0 11px; flex-shrink:0;">고도 & 시즌</button>
            <button type="button" id="tabBtnReportRegion" class="n-cat-chip" onclick="window.switchReportTab('region', this)" style="height:28px; font-size:0.72rem; padding:0 11px; flex-shrink:0;">지역별 방문</button>
          </div>

          <!-- [모듈 A: 장비 & 무게 분석] -->
          <div id="reportSectionGear" class="report-filter-section" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:900; color:#34d399; display:flex; align-items:center; gap:4px;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2h12v6H6zM4 8h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/></svg>
                <span>장비 세팅 & 무게 분석</span>
              </span>
              <span id="reportAvgTierBadge" style="font-size:0.60rem; color:#34d399; font-weight:900; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); padding:1.5px 6px; border-radius:4px;">스탠다드</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:8px;">
                <div style="font-size:0.60rem; color:#94a3b8;">평균 패킹 무게</div>
                <div id="reportMilestoneAvgWeight" style="font-size:1.15rem; font-weight:900; color:#34d399; font-family:var(--font-en); margin-top:2px;">0.00kg</div>
              </div>
              <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:8px;">
                <div style="font-size:0.60rem; color:#94a3b8;">최다 동행 장비</div>
                <div id="reportTopGear" style="font-size:0.75rem; font-weight:900; color:#ffffff; margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">-</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.64rem; color:#cbd5e1; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
              <div>최경량 패킹: <strong id="reportMinWeight" style="color:#38bdf8;">-</strong></div>
              <div>최대 중량: <strong id="reportMaxWeight" style="color:#f43f5e;">-</strong></div>
            </div>
          </div>

          <!-- [모듈 B: 고도 & 사계절 활동 분포] -->
          <div id="reportSectionTerrain" class="report-filter-section" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:900; color:#38bdf8; display:flex; align-items:center; gap:4px;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                <span>누적 고도 & 시즌 밸런스</span>
              </span>
              <span id="reportMilestoneElevText" style="font-size:0.62rem; color:#fde047; font-weight:900; font-family:var(--font-en);">+0m (0%)</span>
            </div>
            
            <div>
              <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                <div id="reportMilestoneElevBar" style="width:0%; height:100%; background:linear-gradient(90deg, #38bdf8, #fde047); transition:width 0.3s ease;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.56rem; color:#64748b; margin-top:3px;">
                <span>0m</span>
                <span>에베레스트 기준 (8,848m)</span>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; text-align:center; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
              <div style="background:rgba(255,255,255,0.02); border-radius:6px; padding:4px;">
                <div style="font-size:0.56rem; color:#94a3b8;">봄(3-5월)</div>
                <div id="reportSeasonSpring" style="font-size:0.75rem; font-weight:900; color:#34d399; font-family:var(--font-en);">0%</div>
              </div>
              <div style="background:rgba(255,255,255,0.02); border-radius:6px; padding:4px;">
                <div style="font-size:0.56rem; color:#94a3b8;">여름(6-8월)</div>
                <div id="reportSeasonSummer" style="font-size:0.75rem; font-weight:900; color:#38bdf8; font-family:var(--font-en);">0%</div>
              </div>
              <div style="background:rgba(255,255,255,0.02); border-radius:6px; padding:4px;">
                <div style="font-size:0.56rem; color:#94a3b8;">가을(9-11월)</div>
                <div id="reportSeasonAutumn" style="font-size:0.75rem; font-weight:900; color:#fde047; font-family:var(--font-en);">0%</div>
              </div>
              <div style="background:rgba(255,255,255,0.02); border-radius:6px; padding:4px;">
                <div style="font-size:0.56rem; color:#94a3b8;">동계(12-2월)</div>
                <div id="reportSeasonWinter" style="font-size:0.75rem; font-weight:900; color:#c084fc; font-family:var(--font-en);">0%</div>
              </div>
            </div>
          </div>

          <!-- [모듈 C: 가장 많이 찾는 지역] -->
          <div id="reportSectionRegion" class="report-filter-section" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.76rem; font-weight:900; color:#e2e8f0; display:flex; align-items:center; gap:4px;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>가장 많이 찾는 지역 (지역별 방문 분포)</span>
              </span>
              <span id="reportTopRegionBadge" style="font-size:0.60rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.12); padding:1.5px 6px; border-radius:4px;">전국</span>
            </div>
            <div id="reportRegionDistributionGrid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:5px; text-align:center;"></div>
          </div>

          <!-- 결산 카드 만들기 버튼 -->
          <button type="button" onclick="if(typeof openHistoryStudioModal==='function') openHistoryStudioModal(); else showToast('스튜디오 엔진 준비 중입니다.', 'info');" style="width:100%; height:44px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:12px; color:#ffffff; font-size:0.84rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(2,132,199,0.35); flex-shrink:0;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>나의 아웃도어 결산 카드 만들기 (스튜디오 ➔)</span>
          </button>
        </div>

        <!-- 하단 5대 고정 독 바 -->
        <div class="mobile-bottom-dock notranslate" style="position:absolute !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.12) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; z-index:100 !important; box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="closeUserProfileModal(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="closeUserProfileModal(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item" onclick="closeUserProfileModal(); if(typeof openPlanModal==='function') openPlanModal('calendar'); triggerHaptic(12);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
            <span>낭만플랜</span>
          </button>
          <button type="button" class="dock-item" onclick="closeUserProfileModal(); if(typeof openHistoryModal==='function') openHistoryModal(); triggerHaptic(12);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item active" onclick="triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>마이리포트</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 3. 계정 관리 및 14일 쿨다운 닉네임 변경 모달 (뒤로가기 ◀) -->
    <div class="custom-modal-overlay" id="userAccountSettingsModal" style="display:none; position:fixed; inset:0; background:#000000; z-index:100005; justify-content:center; align-items:stretch; width:100%; height:100dvh; padding:0; overflow:hidden;">
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
        <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box;">
          <button type="button" onclick="triggerHaptic(10); document.getElementById('userAccountSettingsModal').style.display='none';" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.95rem; font-weight:900; color:#ffffff;">계정 관리</span>
          <div style="width:30px;"></div>
        </div>

        <div style="flex:1 1 0%; min-height:0; overflow-y:auto; padding:20px 16px; display:flex; flex-direction:column; gap:14px; box-sizing:border-box;">
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

          <button type="button" class="modal-btn" style="background:rgba(244,63,94,0.15); border:1px solid #f43f5e; color:#fda4af; font-weight:800; height:42px; border-radius:10px; margin-top:6px; font-size:0.82rem; cursor:pointer;" onclick="document.getElementById('userAccountSettingsModal').style.display='none'; closeUserProfileModal(); logoutUser();">
            로그아웃
          </button>
        </div>
        <div></div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
}

// 🎚️ [마이데이터 4대 필터 탭 전환 엔진]
window.switchReportTab = function(tabKey, btnEl) {
  triggerHaptic(8);
  document.querySelectorAll('#userProfileModalOverlay .n-cat-chip').forEach(function(b) { b.classList.remove('active'); });
  if (btnEl) btnEl.classList.add('active');

  var sGear = document.getElementById('reportSectionGear');
  var sTerrain = document.getElementById('reportSectionTerrain');
  var sRegion = document.getElementById('reportSectionRegion');

  if (tabKey === 'all') {
    if (sGear) sGear.style.display = 'flex';
    if (sTerrain) sTerrain.style.display = 'flex';
    if (sRegion) sRegion.style.display = 'flex';
  } else {
    if (sGear) sGear.style.display = (tabKey === 'gear') ? 'flex' : 'none';
    if (sTerrain) sTerrain.style.display = (tabKey === 'terrain') ? 'flex' : 'none';
    if (sRegion) sRegion.style.display = (tabKey === 'region') ? 'flex' : 'none';
  }
};

// ⚙️ [계정 관리 모달 오픈]
window.openAccountSettingsModal = function() {
  ensureMyReportAndAuthModalsInDOM();
  var modal = document.getElementById('userAccountSettingsModal');
  var profile = safeGetJSON('user_profile', null);
  var nickInput = document.getElementById('settingsModalNicknameInput');
  var joinDateEl = document.getElementById('settingsModalJoinDate');
  var noticeEl = document.getElementById('settingsModalCooldownNotice');

  if (profile) {
    if (nickInput) nickInput.value = profile.nickname || '';
    if (joinDateEl) joinDateEl.innerText = profile.createdAt || '2026.01.01';

    var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
    var lastChanged = Number(profile.lastNicknameChangedAt) || 0;
    var now = Date.now();

    if (noticeEl) {
      if (lastChanged > 0 && (now - lastChanged < COOLDOWN_MS)) {
        var remainingDays = Math.ceil((COOLDOWN_MS - (now - lastChanged)) / (1000 * 60 * 60 * 24));
        noticeEl.style.color = '#f59e0b';
        noticeEl.innerText = '⏳ 닉네임 변경 쿨다운 중 [' + remainingDays + '일 후 변경 가능]';
      } else {
        noticeEl.style.color = '#34d399';
        noticeEl.innerText = '✓ 현재 닉네임 변경이 가능합니다 (변경 후 14일 쿨다운)';
      }
    }
  }
  if (modal) modal.style.display = 'flex';
};

// 💾 [계정 관리 닉네임 변경 저장]
window.saveNicknameFromSettingsModal = function() {
  var input = document.getElementById('settingsModalNicknameInput');
  if (!input || !input.value.trim()) return showToast('새 닉네임을 입력해주세요.', 'warn');

  var newNick = input.value.trim();
  var profile = safeGetJSON('user_profile', {});
  var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  var lastChanged = Number(profile.lastNicknameChangedAt) || 0;
  var now = Date.now();

  if (lastChanged > 0 && (now - lastChanged < COOLDOWN_MS)) {
    var remainingDays = Math.ceil((COOLDOWN_MS - (now - lastChanged)) / (1000 * 60 * 60 * 24));
    triggerHaptic(20);
    return showToast('닉네임은 14일마다 1회 변경 가능합니다. [' + remainingDays + '일 후 가능]', 'warn', 3500);
  }

  if (profile.nickname === newNick) {
    return showToast('현재 사용 중인 닉네임과 동일합니다.', 'info');
  }

  profile.nickname = newNick;
  profile.lastNicknameChangedAt = now;
  localStorage.setItem('user_profile', JSON.stringify(profile));
  localStorage.setItem('okbm_user_nick', newNick);
  if (profile.id) {
    localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
    localStorage.setItem('okbm_custom_nickname_' + profile.id, newNick);
  }

  if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
  triggerHaptic(15);
  showToast('닉네임이 [' + newNick + '](으)로 변경되었습니다!', 'success');

  var headerNick = document.getElementById('reportHeaderCurrentNick');
  if (headerNick) headerNick.innerText = newNick;

  document.getElementById('userAccountSettingsModal').style.display = 'none';
  if (typeof updateHeaderAuthUI === 'function') updateHeaderAuthUI();
};

// 📊 [마이데이터 실시간 정밀 통계 수화 엔진]
window.refreshMyReportFullStats = function() {
  ensureMyReportAndAuthModalsInDOM();
  var profile = safeGetJSON('user_profile', null);
  var userNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '오라네');
  var headerNick = document.getElementById('reportHeaderCurrentNick');
  if (headerNick) headerNick.innerText = userNick;

  var logs = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_packing_history', [])
    : (window.interactiveHistory || safeGetJSON('okbm_packing_history', []));
  var validLogs = (logs || []).filter(function(r) { return r && !r.isDeleted; });
  var totalCount = validLogs.length;

  var currentYear = new Date().getFullYear();
  var yearCount = 0;
  var totalElev = 0;
  var minWeight = 999, maxWeight = 0;
  var totalGrams = 0;
  var gearCounts = {};
  var seasons = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  var regions = { '강원': 0, '경기': 0, '충청': 0, '전라': 0, '경상': 0, '제주': 0, '섬': 0, '기타': 0 };

  validLogs.forEach(function(r) {
    var dateStr = String(r.date || '');
    if (dateStr.includes(String(currentYear))) yearCount++;

    var month = parseInt((dateStr.match(/\d+/g) || [])[1] || '0', 10);
    if (month >= 3 && month <= 5) seasons.spring++;
    else if (month >= 6 && month <= 8) seasons.summer++;
    else if (month >= 9 && month <= 11) seasons.autumn++;
    else if (month === 12 || month === 1 || month === 2) seasons.winter++;

    var spot = String(r.spot || '');
    if (spot.includes('강원')) regions['강원']++;
    else if (spot.includes('경기') || spot.includes('서울') || spot.includes('인천')) regions['경기']++;
    else if (spot.includes('충')) regions['충청']++;
    else if (spot.includes('전')) regions['전라']++;
    else if (spot.includes('경')) regions['경상']++;
    else if (spot.includes('제주')) regions['제주']++;
    else if (spot.includes('도') || spot.includes('섬')) regions['섬']++;
    else regions['기타']++;

    var el = parseInt(String(r.elevation || '0').replace(/\D/g, ''), 10) || 0;
    totalElev += el;

    var w = parseFloat(r.weightKg) || 0;
    if (w > 0 && w < minWeight) minWeight = w;
    if (w > maxWeight) maxWeight = w;
    totalGrams += (r.weightGrams || Math.round(w * 1000));

    (r.items || []).forEach(function(it) {
      var gName = String(it.name || it.itemName || '').replace(/\s*\(.*?\)/, '').trim();
      if (gName) gearCounts[gName] = (gearCounts[gName] || 0) + 1;
    });
  });
  if (minWeight === 999) minWeight = 0;

  var avgWeight = totalCount > 0 ? (totalGrams / totalCount / 1000).toFixed(2) : '0.00';
  var avgTier = parseFloat(avgWeight) <= 6.0 ? 'UL 초경량' : (parseFloat(avgWeight) <= 12.0 ? '스탠다드' : '헤비');

  var topGear = '-', topGearCount = 0;
  Object.keys(gearCounts).forEach(function(k) {
    if (gearCounts[k] > topGearCount) { topGearCount = gearCounts[k]; topGear = k; }
  });
  var everestPct = Math.min(100, Math.round((totalElev / 8848) * 100));

  var yearBadge = document.getElementById('reportYearBadge');
  var yearCountEl = document.getElementById('reportYearCountNumber');
  var totalCountEl = document.getElementById('reportTotalCountNumber');
  if (yearBadge) yearBadge.innerText = currentYear;
  if (yearCountEl) yearCountEl.innerText = yearCount;
  if (totalCountEl) totalCountEl.innerText = totalCount;

  var avgWeightEl = document.getElementById('reportMilestoneAvgWeight');
  var tierEl = document.getElementById('reportAvgTierBadge');
  var minWeightEl = document.getElementById('reportMinWeight');
  var maxWeightEl = document.getElementById('reportMaxWeight');
  var topGearEl = document.getElementById('reportTopGear');

  if (avgWeightEl) avgWeightEl.innerText = avgWeight + 'kg';
  if (tierEl) tierEl.innerText = avgTier;
  if (minWeightEl) minWeightEl.innerText = minWeight > 0 ? minWeight.toFixed(2) + 'kg' : '-';
  if (maxWeightEl) maxWeightEl.innerText = maxWeight > 0 ? maxWeight.toFixed(2) + 'kg' : '-';
  if (topGearEl) topGearEl.innerText = topGear + (topGearCount ? ' (' + topGearCount + '회)' : '');

  var elevTextEl = document.getElementById('reportMilestoneElevText');
  var elevBarEl = document.getElementById('reportMilestoneElevBar');
  if (elevTextEl) elevTextEl.innerText = '+' + totalElev.toLocaleString() + 'm (' + everestPct + '%)';
  if (elevBarEl) elevBarEl.style.width = everestPct + '%';

  var calcPct = function(cnt) { return totalCount > 0 ? Math.round((cnt / totalCount) * 100) + '%' : '0%'; };
  var sSp = document.getElementById('reportSeasonSpring');
  var sSu = document.getElementById('reportSeasonSummer');
  var sAu = document.getElementById('reportSeasonAutumn');
  var sWi = document.getElementById('reportSeasonWinter');
  if (sSp) sSp.innerText = calcPct(seasons.spring);
  if (sSu) sSu.innerText = calcPct(seasons.summer);
  if (sAu) sAu.innerText = calcPct(seasons.autumn);
  if (sWi) sWi.innerText = calcPct(seasons.winter);

  var regGrid = document.getElementById('reportRegionDistributionGrid');
  if (regGrid) {
    regGrid.innerHTML = Object.keys(regions).slice(0, 7).map(function(regName) {
      var rCount = regions[regName] || 0;
      return '<div style="background:rgba(255,255,255,0.02); border:1px solid ' + (rCount > 0 ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)') + '; border-radius:6px; padding:4px 2px;">' +
        '<div style="font-size:0.56rem; color:' + (rCount > 0 ? '#38bdf8' : '#64748b') + ';">' + regName + '</div>' +
        '<div style="font-size:0.75rem; font-weight:900; color:' + (rCount > 0 ? '#fff' : '#475569') + '; font-family:var(--font-en); margin-top:2px;">' + rCount + '곳</div>' +
      '</div>';
    }).join('');
  }
};

// 🚪 6. 마이데이터(마이리포트) & 로그인 모달 제어
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
  } catch (e) {}
}
window.closeLoginModal = closeLoginModal;

function openUserProfileModal() {
  try {
    ensureMyReportAndAuthModalsInDOM();
    if (typeof window.refreshMyReportFullStats === 'function') {
      window.refreshMyReportFullStats();
    }
    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'flex', 'important');
    triggerHaptic(12);
  } catch (e) {}
}
window.openUserProfileModal = openUserProfileModal;

function closeUserProfileModal() {
  try {
    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
  } catch (e) {}
}
window.closeUserProfileModal = closeUserProfileModal;

// 🚪 [로그아웃 및 세션 완전 롤백]
function logoutUser() {
  triggerHaptic(15);

  if (typeof Kakao !== 'undefined' && Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
    try {
      Kakao.Auth.logout(function() {});
    } catch (e) {}
  }

  localStorage.removeItem('user_auth_token');
  localStorage.removeItem('user_profile');
  localStorage.removeItem('okbm_user_id');
  localStorage.removeItem('okbm_user_nick');
  localStorage.removeItem('okbm_following_users');

  for (var k in localStorage) {
    if (k.startsWith('user_profile_') || k.startsWith('okbm_custom_nickname_')) {
      localStorage.removeItem(k);
    }
  }

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = false;
    authState.userProfile = null;
  }

  localStorage.removeItem('okbm_bookmarks');
  localStorage.removeItem('okbm_visited');
  localStorage.removeItem('okbm_memos');
  localStorage.removeItem('okbm_plan_memos');
  localStorage.removeItem('okbm_plan_spots');
  localStorage.removeItem('okbm_packing_history');
  localStorage.removeItem('okbm_selected_gears_multi');
  localStorage.removeItem('okbm_favorite_gears');
  localStorage.removeItem('okbm_custom_gears');
  localStorage.removeItem('okbm_gear_presets');
  localStorage.removeItem('okbm_gear_meta');
  localStorage.removeItem('okbm_trip_consumables');
  localStorage.removeItem('okbm_packed_checks');
  localStorage.removeItem('okbm_phone_photos_map');
  localStorage.removeItem('okbm_trip_photos_map');
  localStorage.removeItem('okbm_user_instagram');
  localStorage.removeItem('okbm_cached_community_feeds');
  localStorage.removeItem('okbm_hero_cover_url');

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
  window.__memoryStore['okbm_phone_photos_map'] = {};
  window.__memoryStore['okbm_trip_photos_map'] = {};

  if (typeof window.saveToIndexedDB === 'function') {
    window.saveToIndexedDB('okbm_packing_history', []);
    window.saveToIndexedDB('okbm_phone_photos_map', {});
    window.saveToIndexedDB('okbm_trip_photos_map', {});
  }

  var modals = ['loginModalOverlay', 'userProfileModalOverlay', 'myReportModal', 'clearMapModal', 'pastTripsListModal', 'singleTripFeedModal', 'romanticPlanModal', 'romanticHistoryModal'];
  modals.forEach(function(mId) {
    var el = document.getElementById(mId);
    if (el) el.remove();
  });

  if (typeof showToast === 'function') {
    showToast('로그아웃되었습니다. 초기 화면으로 이동합니다.', 'info', 1200);
  }

  setTimeout(function() {
    window.location.reload();
  }, 200);
}
window.logoutUser = logoutUser;

// ⏱️ 7. 닉네임 변경 및 14일 쿨다운 체크
function saveNewNicknameFromModal() {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : { isMember: true });
  var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  var lastChanged = profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0;
  var now = Date.now();

  var clockVectorSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px; margin-right:4px; vertical-align:-2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

  if (lastChanged > 0 && (now - lastChanged < COOLDOWN_MS)) {
    var remainingDays = Math.ceil((COOLDOWN_MS - (now - lastChanged)) / (1000 * 60 * 60 * 24));
    triggerHaptic(20);
    showToast(clockVectorSvg + ' <span>닉네임은 14일마다 1회 변경 가능합니다. [' + remainingDays + '일 후 가능]</span>', 3500);
    return;
  }

  var input = document.getElementById('profileModalNicknameInput');
  if (!input || !input.value.trim()) {
    showToast('새 닉네임을 입력해주세요.', 'warn', 2500);
    return;
  }

  var clean = input.value.trim();
  if (profile && profile.nickname === clean) {
    showToast('현재 사용 중인 닉네임과 동일합니다.', 'info', 2500);
    return;
  }

  profile.nickname = clean;
  profile.lastNicknameChangedAt = now;
  localStorage.setItem('user_profile', JSON.stringify(profile));
  if (profile.id) {
    localStorage.setItem('user_profile_' + profile.id, JSON.stringify(profile));
    localStorage.setItem('okbm_custom_nickname_' + profile.id, clean);
  }
  if (typeof authState !== 'undefined') {
    authState.userProfile = profile;
    authState.isLoggedIn = true;
  }

  updateHeaderAuthUI();
  syncUserDataToCloud();
  closeUserProfileModal();
  triggerHaptic(15);

  showToast('<span>닉네임이 [' + clean + '] (으)로 변경되었습니다!</span>', 'success', 2500);

  if (typeof renderSpots === 'function') renderSpots();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
  if (typeof renderPlanStage === 'function') renderPlanStage();
  if (typeof renderHistoryStage === 'function') renderHistoryStage();
}

// 🔑 8. 카카오 로그인 및 클라우드 데이터 동기화
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

  var loginBtn = document.querySelector('.btn-social-kakao');
  if (loginBtn) {
    loginBtn.style.pointerEvents = 'none';
    loginBtn.style.opacity = '0.75';
    loginBtn.innerHTML = '<span>카카오 로그인 인증 중...</span>';
  }

  Kakao.Auth.login({
    scope: 'profile_nickname',
    throughTalk: false,
    success: function(authObj) {
      Kakao.API.request({
        url: '/v2/user/me',
        success: function(res) {
          var kakaoId = 'kakao_' + String(res.id).trim();
          var kakaoNick = '';
          if (res.kakao_account && res.kakao_account.profile && res.kakao_account.profile.nickname) {
            kakaoNick = res.kakao_account.profile.nickname.trim();
          } else if (res.properties && res.properties.nickname) {
            kakaoNick = res.properties.nickname.trim();
          }

          var customSaved = (localStorage.getItem('okbm_custom_nickname_' + kakaoId) || '').trim();
          var finalNick = (customSaved && customSaved !== '낭만루터' && customSaved !== '낭만백패커') ? customSaved : (kakaoNick || '낭만백패커');

          var profile = {
            id: kakaoId,
            nickname: finalNick,
            isMember: true,
            createdAt: getFormattedNow(),
            lastNicknameChangedAt: 0,
            loggedInAt: Date.now()
          };

          localStorage.setItem('user_auth_token', authObj.access_token || ('token_' + kakaoId));
          localStorage.setItem('user_profile', JSON.stringify(profile));
          localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
          localStorage.setItem('okbm_user_id', kakaoId);
          localStorage.setItem('okbm_user_nick', finalNick);

          if (typeof authState !== 'undefined') {
            authState.isLoggedIn = true;
            authState.userProfile = profile;
          }

          closeLoginModal();
          if (typeof showToast === 'function') {
            showToast('[' + finalNick + ']님 로그인 완료! 클라우드 동기화 중...', 'success', 2000);
          }

          loadUserDataFromCloud(kakaoId).then(function(cloudData) {
            if (cloudData) {
              var sNick = (cloudData.nickname || '').trim();
              if (sNick && sNick !== '낭만루터' && !sNick.includes('ENGINE')) {
                profile.nickname = sNick;
                localStorage.setItem('user_profile', JSON.stringify(profile));
                localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
                localStorage.setItem('okbm_user_nick', sNick);
              }
              if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
                localStorage.setItem('okbm_bookmarks', JSON.stringify(cloudData.bookmarks));
              }
              if (cloudData.visited && Array.isArray(cloudData.visited)) {
                localStorage.setItem('okbm_visited', JSON.stringify(cloudData.visited));
              }
              if (cloudData.memos && typeof cloudData.memos === 'object') {
                localStorage.setItem('okbm_memos', JSON.stringify(cloudData.memos));
              }
              if (cloudData.following && Array.isArray(cloudData.following)) {
                localStorage.setItem('okbm_following_users', JSON.stringify(cloudData.following));
              }
           
              if (cloudData.myGears && typeof cloudData.myGears === 'object') {
                var mg = cloudData.myGears;
                if (mg.selectedGears) localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(mg.selectedGears));
                if (mg.favoriteGears) localStorage.setItem('okbm_favorite_gears', JSON.stringify(mg.favoriteGears));
                if (mg.customGears) localStorage.setItem('okbm_custom_gears', JSON.stringify(mg.customGears));
                if (mg.gearPresets) localStorage.setItem('okbm_gear_presets', JSON.stringify(mg.gearPresets));
                if (mg.gearMeta) localStorage.setItem('okbm_gear_meta', JSON.stringify(mg.gearMeta));
              }
              if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
                var cleanHist = cloudData.packHistory.filter(function(h) { return h && !h.isDeleted; });
                localStorage.setItem('okbm_packing_history', JSON.stringify(cleanHist));
                if (typeof window.saveToIndexedDB === 'function') {
                  window.saveToIndexedDB('okbm_packing_history', cleanHist);
                }
              }
            }
            setTimeout(function() { window.location.reload(); }, 250);
          }).catch(function() {
            setTimeout(function() { window.location.reload(); }, 250);
          });
        },
        fail: function() {
          if (loginBtn) {
            loginBtn.style.pointerEvents = 'auto';
            loginBtn.style.opacity = '1';
            loginBtn.innerHTML = '카카오 1초 간편 로그인';
          }
          if (typeof showToast === 'function') showToast('사용자 정보 수신 실패', 'warn');
        }
      });
    },
    fail: function() {
      if (loginBtn) {
        loginBtn.style.pointerEvents = 'auto';
        loginBtn.style.opacity = '1';
        loginBtn.innerHTML = '카카오 1초 간편 로그인';
      }
      if (typeof showToast === 'function') showToast('로그인이 취소되었습니다.', 'warn');
    }
  });
}
window.loginWithKakao = loginWithKakao;

// 📤 9. 커뮤니티 피드 공유 (P열 photoMemos 누락 방지 포함)
window.shareFeedToCommunity = async function(feedRecord) {
  if (!feedRecord) return;
  
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || 'anonymous');
  var nickname = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
  var userInsta = (feedRecord.instagram || localStorage.getItem('okbm_user_instagram') || '').replace(/[@\s]/g, '').trim();

  var nowTime = Date.now();
  window.__lastSharedFeedTimeMap = window.__lastSharedFeedTimeMap || {};
  var lastSharedTime = window.__lastSharedFeedTimeMap[String(feedRecord.id)] || 0;
  if (nowTime - lastSharedTime < 1500) {
    return;
  }
  window.__lastSharedFeedTimeMap[String(feedRecord.id)] = nowTime;

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  var rawPhotos = [];
  if (Array.isArray(feedRecord.photos) && feedRecord.photos.length > 0) {
    rawPhotos = feedRecord.photos.filter(function(p) { 
      return typeof p === 'string' && (p.startsWith('http') || p.startsWith('data:')); 
    });
  } else if (feedRecord.photo && typeof feedRecord.photo === 'string') {
    rawPhotos = [feedRecord.photo];
  } else if (feedRecord.fieldPhoto && typeof feedRecord.fieldPhoto === 'string') {
    rawPhotos = [feedRecord.fieldPhoto];
  }

  var allPhotos = [];
  for (var i = 0; i < rawPhotos.length; i++) {
    var pItem = rawPhotos[i];
    if (typeof pItem === 'string' && pItem.startsWith('data:') && typeof window.uploadSinglePhotoToDrive === 'function') {
      var cloudUrl = await window.uploadSinglePhotoToDrive(pItem, 'feed_' + (feedRecord.id || Date.now()) + '_' + i + '.jpg');
      allPhotos.push((cloudUrl && cloudUrl.startsWith('http')) ? cloudUrl : pItem);
      await new Promise(function(res) { setTimeout(res, 200); });
    } else {
      allPhotos.push(pItem);
    }
  }

  var mainPhoto = allPhotos.length > 0 ? allPhotos[0] : (feedRecord.photo || feedRecord.fieldPhoto || '');

  // 🛡️ [시트 P열 유실 방어]: photoMemos가 누락되었을 경우 로컬 원본 보관함에서 정밀 복원
  var safePhotoMemos = [];
  if (Array.isArray(feedRecord.photoMemos) && feedRecord.photoMemos.length > 0) {
    safePhotoMemos = feedRecord.photoMemos;
  } else {
    var vaultHistory = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_packing_history', [])
      : safeGetJSON('okbm_packing_history', []);
    var matchedLocal = vaultHistory.find(function(h) { return h && String(h.id).trim() === String(feedRecord.id).trim(); });
    if (matchedLocal && Array.isArray(matchedLocal.photoMemos) && matchedLocal.photoMemos.length > 0) {
      safePhotoMemos = matchedLocal.photoMemos;
    } else if (feedRecord.memo) {
      safePhotoMemos = [feedRecord.memo];
    }
  }

  var payload = {
    action: 'SHARE_PUBLIC_FEED',
    userId: userId,
    nickname: nickname,
    feed: {
      id: feedRecord.id,
      userId: userId,
      author: nickname,
      instagram: userInsta ? ('@' + userInsta) : '',
      spot: feedRecord.spot || feedRecord.spotName,
      elevation: feedRecord.elevation,
      weightKg: feedRecord.weightKg,
      date: feedRecord.date,
      memo: (feedRecord.memo || feedRecord.oneLineMemo || '').slice(0, 120),
      photoMemos: safePhotoMemos,
      photo_memos_json: JSON.stringify(safePhotoMemos),
      photo: mainPhoto,
      photos: allPhotos,
      photo_url: mainPhoto,
      photos_json: JSON.stringify(allPhotos),
      items: feedRecord.items || [],
      templateId: feedRecord.templateId || 1
    }
  };

  fetch(targetGasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (data && data.status === 'SUCCESS') {
      console.log('✅ [RomanticSync] 공용 피드 전송 및 R2 동기화 성공');
    }
  }).catch(function(err) {
    console.warn('[RomanticSync] 커뮤니티 피드 전송 실패:', err);
  });
};

// 🗑️ 10. 커뮤니티 피드 삭제
window.deleteFeedFromCommunity = function(feedId, dateStr) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || '');

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  var payload = {
    action: 'DELETE_PUBLIC_FEED',
    feedId: feedId || '',
    date: dateStr || '',
    userId: userId
  };

  fetch(targetGasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (data && data.status === 'SUCCESS') {
      console.log('✅ [RomanticSync] 공용 피드 서버 영구 삭제 완료');
    }
  }).catch(function(err) {
    console.warn('[RomanticSync] 피드 삭제 요청 실패:', err);
  });
};