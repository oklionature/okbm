
var GAS_API_URL = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
var R2_PUBLIC_DOMAIN = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
window.R2_PUBLIC_DOMAIN = R2_PUBLIC_DOMAIN;

// 글로벌 클라우드 안전 로드 플래그 초기화
if (typeof window.isCloudDataLoaded === 'undefined') {
  window.isCloudDataLoaded = false;
}

// [공통 유틸] 안전한 로컬스토리지 JSON 파싱 헬퍼
function safeGetJSON(key, defaultVal) {
  try {
    var item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
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
    } catch (e) {}
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

function UtilitiesFormattedNow() {
  return getFormattedNow();
}
window.UtilitiesFormattedNow = UtilitiesFormattedNow;

// [비상 초기화 엔진] 전 기종 로컬 캐시 & IndexedDB & 클라우드 피드 완전 무결 포맷
window.executeCleanSlateMasterReset = async function(isSilent) {
  if (!isSilent && !confirm('주의: 모든 활동 기록과 사진 맵이 영구 포맷됩니다.\n(회원 계정 및 찜/클리어 목록은 보존됩니다)\n정말 초기화하시겠습니까?')) {
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
  showToast('모든 피드와 사진이 초기화되었습니다. 새로고침합니다.', 2000);

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

// 1. Cloudflare R2 글로벌 CDN (0.03초 1순위) -> 구글 시트(2순위 백업망) 직통 조회
async function loadUserDataFromCloud(userId) {
  if (!userId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[RomanticSync] 오프라인 감지: 로컬 캐시로 즉시 전환합니다.');
    return null;
  }

  try {
    var r2Url = R2_PUBLIC_DOMAIN.replace(/\/+$/, '') + '/users/user_' + encodeURIComponent(userId) + '.json?_t=' + Date.now();
    var r2Res = await fetch(r2Url, { cache: 'no-store' });
    if (r2Res.ok) {
      var r2Data = await r2Res.json();
      if (r2Data && (r2Data.status === 'SUCCESS' || r2Data.bookmarks || r2Data.packHistory || r2Data.myGears || r2Data.nickname)) {
        console.log('[RomanticSync] Cloudflare R2 CDN에서 유저 데이터 0.03초 번개 인출 성공!');
        return r2Data.userData || r2Data;
      }
    }
  } catch (r2Err) {
    console.log('[RomanticSync] R2 최초 조회 대기, 구글 클라우드로 전환:', r2Err.message);
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

// 3. 일일 방문자 통계 기록 전송
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

// [RomanticVault] 전 기종·브라우저 일원화 마스터 트랜잭션 금고 매니저
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

  // [서버 정본 자동 수화(Hydration) 마스터 스위치]
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
          var deletedIds = safeGetJSON('okbm_deleted_record_ids', []);
          
          // 🛑 1. 서버(R2/시트) 정본에서 삭제 표시된 글과 낭만루터 스냅 완벽 배제 (순수 루트만 보존)
          var cleanHist = cloudData.packHistory.filter(function(h) {
            if (!h || h.isDeleted || deletedIds.includes(String(h.id).trim())) return false;
            return h.feedType !== 'router' && !String(h.id).startsWith('snap_');
          });

          // 📸 낭만루터(일상스냅) 전용 독립 금고 복원
          var cloudSnaps = Array.isArray(cloudData.routerSnaps) ? cloudData.routerSnaps : [];
          var cleanSnaps = cloudSnaps.filter(function(s) {
            return s && !s.isDeleted && !deletedIds.includes(String(s.id).trim());
          });
          this.write('okbm_router_snaps', cleanSnaps, false);

          // 🛑 2. 서버 정본에 이미 없는 글은 다른 기기(노트북)의 구형 로컬 캐시에서도 즉시 영구 소거 (부활 원천 차단)
          var serverIdSet = new Set(cleanHist.map(function(s) { return String(s.id).trim(); }));
          var localHist = (window.interactiveHistory && window.interactiveHistory.length > 0)
            ? window.interactiveHistory
            : safeGetJSON('okbm_packing_history', []);

          var pMap = (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) || safeGetJSON('okbm_phone_photos_map', {});

          var mergedHist = cleanHist.map(function(sItem) {
            var sId = String(sItem.id || '').trim();
            var localMatch = localHist.find(function(l) { return l && String(l.id).trim() === sId; });

            if ((!sItem.photos || sItem.photos.length === 0) && localMatch && localMatch.photos && localMatch.photos.length > 0) {
              sItem.photos = localMatch.photos;
              sItem.photo = localMatch.photos[0];
              sItem.fieldPhoto = localMatch.photos[0];
            } else if ((!sItem.photos || sItem.photos.length === 0) && pMap[sId]) {
              var pArr = Array.isArray(pMap[sId]) ? pMap[sId] : [pMap[sId]];
              sItem.photos = pArr;
              sItem.photo = pArr[0];
              sItem.fieldPhoto = pArr[0];
            }
            return sItem;
          });

          // 🛡️ 로컬에서 방금 작성 중이던 임시 미발행 글(pack_temp_)만 예외적으로 보존
          localHist.forEach(function(lItem) {
            if (lItem && lItem.id && String(lItem.id).startsWith('pack_temp_')) {
              mergedHist.unshift(lItem);
            }
          });

          this.write('okbm_packing_history', mergedHist, false);
          window.interactiveHistory = mergedHist;
          window.packingHistoryList = mergedHist;
        }
        if (cloudData.routerSnaps && Array.isArray(cloudData.routerSnaps)) {
          var deletedIdsSnap = safeGetJSON('okbm_deleted_record_ids', []);
          // 🛑 서버 R2에서 가져온 스냅이라도 블랙리스트에 있으면 즉시 영구 파기 (부활 차단)
          var cleanSnaps = cloudData.routerSnaps.filter(function(s) {
            return s && !s.isDeleted && !deletedIdsSnap.includes(String(s.id).trim());
          });
          this.write('okbm_router_snaps', cleanSnaps, false);
          if (window.__memoryStore) window.__memoryStore['okbm_router_snaps'] = cleanSnaps;
          try { localStorage.setItem('okbm_router_snaps', JSON.stringify(cleanSnaps)); } catch(e) {}
        }
        if (cloudData.myGears && typeof cloudData.myGears === 'object') {
          var mg = cloudData.myGears;
          if (mg.selectedGears) this.write('okbm_selected_gears_multi', mg.selectedGears, false);
          if (mg.favoriteGears) this.write('okbm_favorite_gears', mg.favoriteGears, false);
          if (mg.customGears) this.write('okbm_custom_gears', mg.customGears, false);
          if (mg.gearPresets) this.write('okbm_gear_presets', mg.gearPresets, false);
          if (mg.gearMeta) this.write('okbm_gear_meta', mg.gearMeta, false);
        }
        // 내가 제보한 박지 클라우드 정본 수화 (빈 배열 덮어쓰기 파괴 영구 차단)
        var localProps = (window.__memoryStore && window.__memoryStore['okbm_my_proposals']) || safeGetJSON('okbm_my_proposals', []);
        if (cloudData.myProposals && Array.isArray(cloudData.myProposals) && cloudData.myProposals.length > 0) {
          // 서버에 데이터가 있으면 로컬과 ID 기준 합집합(Merge) 병합
          var propMap = {};
          cloudData.myProposals.forEach(function(p) { if (p && p.id) propMap[String(p.id)] = p; });
          localProps.forEach(function(p) { if (p && p.id) propMap[String(p.id)] = p; });
          var finalMerged = Object.values(propMap);
          this.write('okbm_my_proposals', finalMerged, false);
          try { localStorage.setItem('okbm_my_proposals', JSON.stringify(finalMerged)); } catch(e) {}
        } else if (localProps.length > 0) {
          // 서버가 비어있고 로컬에 유효 데이터가 있으면 절대 지우지 않고 서버로 즉각 재전송(보호)
          this.write('okbm_my_proposals', localProps, true);
        }
        this.isHydrated = true;
        console.log('[RomanticVault] 서버 정본 로컬 수화(Hydration) 완결');

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

// 앱 접속 즉시 로그인 회원 데이터 백그라운드 자동 수화
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

// 4. 클라우드 단일 트랜잭션 동기화
function syncUserDataToCloud(isPackHistoryUpdated) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = profile && profile.id ? String(profile.id).trim() : localStorage.getItem('user_auth_token');
  if (!userId) return;

  if (window.RomanticVault && window.RomanticVault.isHydrating === true) {
    console.log('[RomanticSync] 서버 수화 진행 중: 클라우드 역전송 일시 보류.');
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

  var lightweightPackHistory = rawHistory.filter(function(h) {
    // 🛑 낭만루트 동기화 시 낭만루터 일상 스냅 원천 배제
    if (!h) return false;
    if (h.feedType === 'router' || String(h.id).startsWith('snap_')) return false;
    return true;
  }).map(function(h) {
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
    myProposals: safeGetJSON('okbm_my_proposals', []),
    packHistory: shouldSyncPackHistory ? lightweightPackHistory : undefined,
    routerSnaps: (function() {
      var deletedIds = safeGetJSON('okbm_deleted_record_ids', []);
      var rawSnaps = (window.__memoryStore && window.__memoryStore['okbm_router_snaps']) || safeGetJSON('okbm_router_snaps', []);
      return (rawSnaps || []).filter(function(s) {
        return s && !s.isDeleted && !deletedIds.includes(String(s.id).trim());
      });
    })(),
    myGears: myGearsPayload
  };

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    localStorage.setItem('okbm_pending_cloud_sync', 'true');
    console.log('[RomanticSync] 네트워크 차단: 변경사항 기기 보존 및 재연결 대기열 등록.');
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
        console.log('[RomanticSync] 단일 트랜잭션 동기화 성공!');
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

// 네트워크 복구 리스너
if (typeof window !== 'undefined') {
  window.addEventListener('online', function() {
    updateHeaderAuthUI();
    if (localStorage.getItem('okbm_pending_cloud_sync') === 'true' && isUserLoggedIn()) {
      showToast('네트워크 복구: 클라우드 자동 동기화 중...', 2000);
      syncUserDataToCloud(true);
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

// [공통 헬퍼] 낭만루트(순수 아웃도어 패킹 정본) 단일 추출기 (루터 일상 피드 원천 배제)
window._getRomanticRouteOutdoorLogs = function() {
  var logs = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
    ? window.RomanticVault.read('okbm_packing_history', [])
    : (window.interactiveHistory || safeGetJSON('okbm_packing_history', []));

  return (logs || []).filter(function(r) {
    if (!r || r.isDeleted === true) return false;
    if (String(r.id || '').startsWith('pack_temp_')) return false;
    // 1. 일상(daily) 및 스냅 피드 원천 배제
    if (r.feedType === 'daily' || r.feedType === 'snap') return false;
    
    // 2. 낭만루트 정식 아웃도어 스펙 검증 (배낭 무게, 장비 슬롯 아이템, 정식 템플릿 중 필수 보유)
    var hasWeight = parseFloat(r.weightKg) > 0;
    var hasItems = Array.isArray(r.items) && r.items.length > 0;
    var hasTemplate = Boolean(r.templateId && Number(r.templateId) > 0);
    var isOutdoorRoute = (r.feedType === 'route' || !r.feedType);

    // 3. 루터 기본 장소명('나의 아웃도어')이면서 무게/장비가 없는 빈 껍데기 글 배제
    var spotName = String(r.spot || r.spotName || '').trim();
    if (spotName === '나의 아웃도어' && !hasWeight && !hasItems) return false;

    return isOutdoorRoute && (hasWeight || hasItems || hasTemplate);
  });
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

  var badgeText = document.getElementById('reportYearBadge');
  if (badgeText) badgeText.innerText = yearStr;

  var labelText = document.getElementById('reportYearCardLabel');
  var curYearStr = String(new Date().getFullYear());
  if (labelText) labelText.innerText = (yearStr === curYearStr) ? '올해 활동' : yearStr + '년 활동';

  var validLogs = window._getRomanticRouteOutdoorLogs();

  var yCount = 0;
  validLogs.forEach(function(r) {
    if (String(r.date || '').includes(yearStr)) yCount++;
  });
  var yEl = document.getElementById('reportYearCountNumber');
  if (yEl) yEl.innerText = yCount;

  var container = document.getElementById('reportYearActivityContainer');
  if (container && container.style.display === 'flex') {
    window.renderReportYearActivityList();
  }
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
    <!-- 1. 카카오 1초 간편 로그인 모달 (제8헌법 터치 44px 및 매트블랙 규격) -->
    <div class="custom-modal-overlay" id="loginModalOverlay" onclick="if(event.target===this) closeLoginModal();" style="display:none; position:fixed; inset:0; background:#000000; z-index:99999; justify-content:center; align-items:stretch; width:100%; height:100dvh; padding:0; overflow:hidden;">
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">
        <div style="flex:1 1 auto; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:calc(20px + env(safe-area-inset-top, 0px)) 16px calc(76px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:14px; text-align:center; box-sizing:border-box;">
          <div style="width:54px; height:54px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; color:#e2e8f0;">
            <svg viewBox="0 0 24 24" style="width:26px; height:26px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>
          </div>
          <div>
            <h3 style="color:#ffffff; font-size:1.15rem; font-weight:900; letter-spacing:-0.02em;">낭만루트 로그인</h3>
            <p style="font-size:0.78rem; color:#94a3b8; line-height:1.55; margin-top:6px;">
              로그인 시 나만의 아웃도어 패킹 기록, 장비 세팅,<br>그리고 소중한 박지 비밀 메모가 클라우드에 안전하게 보존됩니다.
            </p>
          </div>
          <div style="width:100%; max-width:320px; display:flex; flex-direction:column; gap:10px; margin-top:8px;">
            <button type="button" class="modal-btn btn-social-kakao" style="width:100%; height:46px; min-height:44px; font-size:0.86rem; font-weight:900; border-radius:10px; background:#fee500; color:#191919; border:none; cursor:pointer;" onclick="loginWithKakao()">
              카카오 1초 간편 로그인
            </button>
            <button type="button" class="modal-btn" style="width:100%; height:44px; min-height:44px; background:rgba(255,255,255,0.06); color:#cbd5e1; font-weight:800; font-size:0.78rem; border-radius:10px; border:none; cursor:pointer;" onclick="closeLoginModal()">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>

  <!-- 2. 마이데이터(마이리포트) 대시보드 모달 (노치 침범 0% 플렉스 3단 & 맵 하단독 100% 일체화) -->
    <div class="custom-modal-overlay" id="userProfileModalOverlay" onclick="if(event.target===this) closeUserProfileModal();" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:#000000; z-index:3000000; margin:0; padding:0; overflow:hidden;">
      <div style="position:relative; width:100%; max-width:480px; height:100%; margin:0 auto; background:#000000; overflow:hidden; display:flex; flex-direction:column; box-sizing:border-box;">
        
        <!-- 1단 헤더 (노치 안전 여백 확보 및 타이틀 상단 잘림 영구 해결) -->
        <div style="flex-shrink:0; width:100%; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:calc(16px + env(safe-area-inset-top, 0px)) 16px 14px 16px; box-sizing:border-box; z-index:50;">
          <span style="font-size:1.05rem; font-weight:900; color:#ffffff; letter-spacing:-0.03em; line-height:1;">마이리포트</span>
          
          <div onclick="triggerHaptic(12); window.openAccountSettingsModal();" title="개인정보 및 아이디 변경" style="display:flex; align-items:center; gap:8px; cursor:pointer; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); padding:3px 10px 3px 4px; border-radius:20px;">
            <div style="position:relative; width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #38bdf8, #818cf8, #f43f5e); padding:1.5px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <div style="width:100%; height:100%; border-radius:50%; background:#090d14; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
            </div>
            <span id="reportHeaderCurrentNick" style="font-size:0.76rem; font-weight:800; color:#ffffff; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">낭만백패커</span>
          </div>
        </div>

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

window.__reportRenderCache = {};

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

  if (window.__reportRenderCache[secKey]) return;

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

// 0. 내가 제보한 박지 목록 렌더러 및 등록 전 수정 모듈
window._renderMyPropsModule = function(el) {
  var myProps = safeGetJSON('okbm_my_proposals', []);
  var hStat = document.getElementById('reportHeaderMyPropsStat');
  if (hStat) hStat.innerText = myProps.length + '곳';

  if (!myProps || myProps.length === 0) {
    el.innerHTML = '<div style="font-size:0.62rem; color:#64748b; text-align:center; padding:12px 0;">아직 제보한 박지가 없습니다. 소중한 박지를 제보해주세요!</div>';
    return;
  }

 var listHtml = myProps.map(function(p, idx) {
    var isCorr = Boolean(p.is_correction || p.isCorrection || p.type === 'correction');
    var mainName = p.spot_main || p.name || '무명 박지';
    var subName = p.spot_sub ? ('(' + p.spot_sub + ')') : '';
    var dateStr = String(p.date || '').slice(0, 10);
    var entryStr = p.trailhead_addr || p.entry || '들머리 미기재';

    return '<div style="display:flex; justify-content:space-between; align-items:center; background:#000000; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:6px 8px;">' +
      '<div style="display:flex; flex-direction:column; min-width:0; flex:1; padding-right:8px;">' +
        '<div style="display:flex; align-items:center; gap:4px;">' +
          '<span style="font-size:0.58rem; color:#38bdf8; font-weight:900;">' + (idx + 1) + '.</span>' +
          '<span style="font-size:0.72rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + mainName + ' ' + subName + '</span>' +
          (isCorr
            ? '<span style="font-size:0.50rem; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">수정건의</span>'
            : '<span style="font-size:0.50rem; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); border-radius:3px; padding:1px 4px; font-weight:800;">신규제보</span>') +
        '</div>' +
        '<span style="font-size:0.54rem; color:#64748b; margin-top:2px;">' + entryStr + ' · ' + dateStr + '</span>' +
      '</div>' +
      '<button type="button" onclick="window.triggerEditProposalFromReport(\'' + p.id + '\')" style="background:rgba(56,189,248,0.12); border:1px solid #38bdf8; color:#38bdf8; font-size:0.62rem; font-weight:800; border-radius:5px; padding:3px 8px; cursor:pointer; flex-shrink:0;">수정</button>' +
    '</div>';
  }).join('');

  el.innerHTML = '<div style="font-size:0.56rem; color:#94a3b8; margin:4px 0 2px 2px;">관리자 승인 전까지 [수정]을 눌러 내용을 고칠 수 있습니다.</div>' +
    '<div style="display:flex; flex-direction:column; gap:4px; max-height:220px; overflow-y:auto; -webkit-overflow-scrolling:touch;">' +
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
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">슬롯별 최다 장비 (터치 시 Top 5)</span>
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
        <span style="font-size:0.58rem; color:#64748b; font-weight:700;">지형별 최다 방문 아지트 (터치 시 Top 5)</span>
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
    var spot = String(r.spot || '').trim();
    if (!spot) return;

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

// 마이리포트 경량 초기 진입 (정식 아웃도어 정본 단일 파이프라인 연동 & 제보 목록 포함)
window.refreshMyReportFullStats = function() {
  ensureMyReportAndAuthModalsInDOM();
  window.__reportRenderCache = {};

  var profile = safeGetJSON('user_profile', null);
  var userNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
  var headerNick = document.getElementById('reportHeaderCurrentNick');
  if (headerNick) headerNick.innerText = userNick;

  // 0. 내가 제보한 박지 건수 실시간 갱신
  var myProps = safeGetJSON('okbm_my_proposals', []);
  var hPropStat = document.getElementById('reportHeaderMyPropsStat');
  if (hPropStat) hPropStat.innerText = myProps.length + '곳';

  // 순수 낭만루트(아웃도어 정식 등록물) 단일 인출로 일상/더미 글 원천 배제
  var validLogs = (typeof window._getRomanticRouteOutdoorLogs === 'function')
    ? window._getRomanticRouteOutdoorLogs()
    : [];

  var curYear = String(new Date().getFullYear());
  window._selectedReportYear = curYear;

  if (window._terrainModuleState) window._terrainModuleState.selectedYear = curYear;
  if (window._seasonModuleState) window._seasonModuleState.selectedYear = curYear;
  if (window._regionModuleState) window._regionModuleState.selectedYear = curYear;

  var badgeText = document.getElementById('reportYearBadge');
  if (badgeText) badgeText.innerText = curYear;

  var labelText = document.getElementById('reportYearCardLabel');
  if (labelText) labelText.innerText = '올해 활동';

  var yCount = 0;
  validLogs.forEach(function(r) {
    var dStr = String(r.date || '');
    if (dStr.includes(curYear)) yCount++;
  });

  var yEl = document.getElementById('reportYearCountNumber');
  var tEl = document.getElementById('reportTotalCountNumber');
  if (yEl) yEl.innerText = yCount;
  if (tEl) tEl.innerText = validLogs.length;

  // 제보목록(myprops) 포함 전체 섹션 아코디언 상태 일원화 초기화
  ['myprops', 'gear', 'terrain', 'season', 'region'].forEach(function(k) {
    var b = document.getElementById('accBody_' + k);
    var a = document.getElementById('accArrow_' + k);
    if (b) { b.style.display = 'none'; b.innerHTML = ''; }
    if (a) a.innerText = '▼';
  });
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

  dock.style.cssText = 'position:fixed !important; bottom:0 !important; left:0 !important; right:0 !important; width:100% !important; max-width:480px !important; margin:0 auto !important; height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; min-height:calc(56px + env(safe-area-inset-bottom, 8px)) !important; padding:0 0 env(safe-area-inset-bottom, 8px) 0 !important; background:rgba(0,0,0,0.96) !important; border-top:1px solid rgba(255,255,255,0.1) !important; display:flex !important; justify-content:space-around !important; align-items:center !important; z-index:2147483647 !important; box-sizing:border-box; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); pointer-events:auto !important;';

  var tabs = [
    { id: 'router', name: '낭만루터', svg: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>', action: "window.navigateToDockTab('router')" },
    { id: 'map', name: '전국지도', svg: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:currentColor;"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>', action: "window.navigateToDockTab('map')" },
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
  var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');

  // 0. 누르자마자 0초 만에 해당 탭 색상 선제 고정 (핑퐁 점멸 완전 차단)
  window.ensureMasterBottomDock(tabId);
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
    'gearPresetModal'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });

  // 3. 5대 탭별 정밀 라우팅 (현 위치 스크롤 카메라 100% 유지)
  if (tabId === 'router') {
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
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate('map.html');
      else window.location.assign('map.html');
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

function openUserProfileModal() {
  try {
    var shieldStyle = document.getElementById('romanticModalShieldCss');
    if (!shieldStyle) {
      shieldStyle = document.createElement('style');
      shieldStyle.id = 'romanticModalShieldCss';
      shieldStyle.innerHTML = '.floating-top-search-wrap, .spot-detail-sheet, #spotDetailSheet, #spotDrawer, #spotPopupContainer { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
      document.head.appendChild(shieldStyle);
    }

    ensureMyReportAndAuthModalsInDOM();
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
      modal.style.setProperty('width', '100vw', 'important');
      modal.style.setProperty('height', 'calc(100dvh - 56px - env(safe-area-inset-bottom, 8px))', 'important');
      modal.style.setProperty('z-index', '2147483640', 'important');
      modal.style.setProperty('background', '#000000', 'important');
      modal.style.setProperty('display', 'flex', 'important');
    }

    window.ensureMasterBottomDock('report');
    triggerHaptic(12);
  } catch (e) {}
}
window.openUserProfileModal = openUserProfileModal;

function closeUserProfileModal() {
  try {
    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');

    var shieldStyle = document.getElementById('romanticModalShieldCss');
    if (shieldStyle) shieldStyle.remove();

    var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');
    window.ensureMasterBottomDock(isMap ? 'map' : 'router');
  } catch (e) {}
}
window.closeUserProfileModal = closeUserProfileModal;

// 계정 설정 모달 제어 (가입날짜 완전 보존 & 14일 쿨다운 정밀 잠금)
window.openAccountSettingsModal = function() {
  triggerHaptic(10);
  ensureMyReportAndAuthModalsInDOM();
  var modal = document.getElementById('userAccountSettingsModal');
  if (!modal) return;

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var currentNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
  
  // 가입날짜 슬라이스 절단 금지 (원본 전체 보존)
  var joinDate = (profile && profile.createdAt) ? String(profile.createdAt).trim() : '2026. 01. 01. 00:00:00';

  var nickInput = document.getElementById('settingsModalNicknameInput');
  var dateEl = document.getElementById('settingsModalJoinDate');
  var noticeEl = document.getElementById('settingsModalCooldownNotice');
  var submitBtn = modal.querySelector('button[onclick="saveNicknameFromSettingsModal()"]');

  if (nickInput) {
    nickInput.value = currentNick;
    nickInput.disabled = false;
  }
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
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

  modal.style.display = 'flex';
};

window.saveNicknameFromSettingsModal = function() {
  var input = document.getElementById('settingsModalNicknameInput');
  if (!input || !input.value.trim()) {
    showToast('새 닉네임을 입력해주세요.', 'warn');
    return;
  }
  var clean = input.value.trim();

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

  if (profile && profile.nickname === clean) {
    showToast('현재 사용 중인 닉네임과 동일합니다.', 'info');
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

  updateHeaderAuthUI();
  syncUserDataToCloud();
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
  localStorage.removeItem('okbm_router_snaps');
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

// 8. 카카오 로그인 및 클라우드 데이터 동기화
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
              }
              if (cloudData.createdAt) {
                profile.createdAt = cloudData.createdAt;
              }
              if (cloudData.lastNicknameChangedAt) {
                profile.lastNicknameChangedAt = Number(cloudData.lastNicknameChangedAt) || 0;
              }
              localStorage.setItem('user_profile', JSON.stringify(profile));
              localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
              localStorage.setItem('okbm_user_nick', profile.nickname);

              var vault = window.RomanticVault;
              if (vault && typeof vault.write === 'function') {
                if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
                  vault.write('okbm_bookmarks', cloudData.bookmarks, false);
                }
                if (cloudData.visited && Array.isArray(cloudData.visited)) {
                  vault.write('okbm_visited', cloudData.visited, false);
                }
                if (cloudData.memos && typeof cloudData.memos === 'object') {
                  vault.write('okbm_memos', cloudData.memos, false);
                }
                if (cloudData.following && Array.isArray(cloudData.following)) {
                  vault.write('okbm_following_users', cloudData.following, false);
                }
                if (cloudData.myGears && typeof cloudData.myGears === 'object') {
                  var mg = cloudData.myGears;
                  if (mg.selectedGears) vault.write('okbm_selected_gears_multi', mg.selectedGears, false);
                  if (mg.favoriteGears) vault.write('okbm_favorite_gears', mg.favoriteGears, false);
                  if (mg.customGears) vault.write('okbm_custom_gears', mg.customGears, false);
                  if (mg.gearPresets) vault.write('okbm_gear_presets', mg.gearPresets, false);
                  if (mg.gearMeta) vault.write('okbm_gear_meta', mg.gearMeta, false);
                }
                if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
                  var cleanHist = cloudData.packHistory.filter(function(h) { return h && !h.isDeleted; });
                  vault.write('okbm_packing_history', cleanHist, false);
                }
                if (cloudData.routerSnaps && Array.isArray(cloudData.routerSnaps)) {
                  var cleanSnaps = cloudData.routerSnaps.filter(function(s) { return s && !s.isDeleted; });
                  vault.write('okbm_router_snaps', cleanSnaps, false);
                }
                if (cloudData.myProposals && Array.isArray(cloudData.myProposals)) {
                  var loginProps = safeGetJSON('okbm_my_proposals', []);
                  var finalLoginProps = (loginProps.length > cloudData.myProposals.length) ? loginProps : cloudData.myProposals;
                  vault.write('okbm_my_proposals', finalLoginProps, false);
                  try { localStorage.setItem('okbm_my_proposals', JSON.stringify(finalLoginProps)); } catch(e) {}
                }
              } else {
                if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) localStorage.setItem('okbm_bookmarks', JSON.stringify(cloudData.bookmarks));
                if (cloudData.visited && Array.isArray(cloudData.visited)) localStorage.setItem('okbm_visited', JSON.stringify(cloudData.visited));
                if (cloudData.memos && typeof cloudData.memos === 'object') localStorage.setItem('okbm_memos', JSON.stringify(cloudData.memos));
                if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
                  var fallbackHist = cloudData.packHistory.filter(function(h) { return h && !h.isDeleted; });
                  if (typeof window.saveToIndexedDB === 'function') window.saveToIndexedDB('okbm_packing_history', fallbackHist);
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

// 9. 커뮤니티 피드 공유 - 제5헌법 Cloudflare R2 글로벌 CDN 직통 단일 파이프라인 (SSOT)
window.shareFeedToCommunity = async function(feedRecord) {
  if (!feedRecord) return;

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || 'anonymous');
  var nickname = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
  var userInsta = (feedRecord.instagram || localStorage.getItem('okbm_user_instagram') || '').replace(/[@\s]/g, '').trim();

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  // 🛡️ [사진 0개 방어]: 레코드에 사진이 비어있으면 phone_photos_map에서 즉시 강제 인출
  var rawPhotos = [];
  if (Array.isArray(feedRecord.photos) && feedRecord.photos.length > 0) {
    rawPhotos = feedRecord.photos;
  } else if (feedRecord.photo && typeof feedRecord.photo === 'string') {
    rawPhotos = [feedRecord.photo];
  } else if (feedRecord.fieldPhoto && typeof feedRecord.fieldPhoto === 'string') {
    rawPhotos = [feedRecord.fieldPhoto];
  }

  if (rawPhotos.length === 0) {
    var pMap = window.safeGetStorage ? (window.safeGetStorage('okbm_phone_photos_map', {}) || {}) : safeGetJSON('okbm_phone_photos_map', {});
    var recovered = pMap[String(feedRecord.id)] || pMap[String(feedRecord.date)];
    if (Array.isArray(recovered) && recovered.length > 0) {
      rawPhotos = recovered;
    }
  }

  // 🛑 [빈 괄호 차단]: 사진이 0개면 시트에 빈 배열을 덮어쓰지 않고 즉시 중단
  if (rawPhotos.length === 0) {
    console.warn('[RomanticSync] 사진이 0개이므로 시트 전송을 안전하게 차단합니다.');
    return;
  }

  // ⚡ [제5·10헌법 준수]: 브라우저 캔버스 초경량 압축(MAX_WIDTH 1200, quality 0.82) 및 Worker 직통 R2 업로드
  var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';
  var finalCdnPhotos = [];

  var compressImageBase64 = function(base64Str, maxWidth, quality) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() {
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
      };
      img.onerror = function() {
        resolve(base64Str);
      };
      img.src = base64Str;
    });
  };

  for (var i = 0; i < rawPhotos.length; i++) {
    var pItem = rawPhotos[i];
    if (typeof pItem === 'string' && pItem.startsWith('data:')) {
      var uploadedUrl = '';
      var safeFileName = 'photo_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 7) + '.jpg';

      try {
        // 제10헌법 미디어 초경량 압축 적용 후 Blob 변환
        var compressedBase64 = await compressImageBase64(pItem, 1200, 0.82);
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
      } catch (cfErr) {
        console.warn('[RomanticSync] Cloudflare Worker 직통 업로드 예외:', cfErr);
      }

      // 폴백: Worker 장애 시 구글 앱스 스크립트 예비망 가동
      if (!uploadedUrl || !uploadedUrl.startsWith('http')) {
        try {
          var driveRes = await fetch(targetGasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'UPLOAD_PHOTO',
              base64: pItem,
              fileName: safeFileName
            })
          });
          if (driveRes.ok) {
            var dData = await driveRes.json();
            if (dData && dData.status === 'SUCCESS' && dData.url) {
              uploadedUrl = dData.url;
            }
          }
        } catch (dErr) {}
      }

      if (uploadedUrl && uploadedUrl.startsWith('http')) {
        finalCdnPhotos.push(uploadedUrl);
      }
    } else if (typeof pItem === 'string' && pItem.startsWith('http')) {
      finalCdnPhotos.push(pItem);
    }
  }

  var cleanHttpPhotos = finalCdnPhotos.filter(function(u) { return typeof u === 'string' && u.startsWith('http'); });
  if (cleanHttpPhotos.length === 0) {
    cleanHttpPhotos = rawPhotos.filter(function(u) { return typeof u === 'string' && u.startsWith('http'); });
  }

  var mainPhoto = cleanHttpPhotos[0] || (rawPhotos[0] || '');

  // 로컬 메모리 및 IndexedDB에 영구 R2 CDN 주소 즉각 안착
  feedRecord.photos = cleanHttpPhotos;
  feedRecord.photo = mainPhoto;
  feedRecord.fieldPhoto = mainPhoto;
  feedRecord.photo_url = mainPhoto;

  var pMap = window.safeGetStorage ? (window.safeGetStorage('okbm_phone_photos_map', {}) || {}) : safeGetJSON('okbm_phone_photos_map', {});
  pMap[String(feedRecord.id)] = cleanHttpPhotos;
  if (window.__memoryStore) window.__memoryStore['okbm_phone_photos_map'] = pMap;
  if (typeof window.saveToIndexedDB === 'function') {
    window.saveToIndexedDB('okbm_phone_photos_map', pMap);
  }

  var safePhotoMemos = [];
  if (Array.isArray(feedRecord.photoMemos) && feedRecord.photoMemos.length > 0) {
    safePhotoMemos = feedRecord.photoMemos;
  } else if (feedRecord.memo) {
    safePhotoMemos = [feedRecord.memo];
  }

  // 📡 [초경량 비동기 전송]: 루트(피드시트/feeds.json)와 루터(스냅시트/router_snaps.json) 물리적 저장 분기
  var isRouterSnap = (feedRecord.feedType === 'router' || String(feedRecord.id).startsWith('snap_'));
  var feedPayload = {
    id: feedRecord.id,
    isNewPost: Boolean(feedRecord.isNewPost),
    feedType: isRouterSnap ? 'router' : 'route',
    userId: userId,
    author: nickname,
    instagram: userInsta ? ('@' + userInsta) : '',
    youtube: feedRecord.youtube || '',
    spot: feedRecord.spot || feedRecord.spotName || (isRouterSnap ? '나의 아웃도어' : '낭만 스팟'),
    date: feedRecord.date,
    memo: (feedRecord.memo || feedRecord.oneLineMemo || '').slice(0, 120),
    photoMemos: safePhotoMemos,
    photo_memos_json: JSON.stringify(safePhotoMemos),
    photo: mainPhoto,
    photos: cleanHttpPhotos,
    photo_url: mainPhoto,
    photos_json: JSON.stringify(cleanHttpPhotos),
    isPublished: true
  };

  // 🧭 낭만루트일 때만 패킹 스펙 및 템플릿 탑재
  if (!isRouterSnap) {
    feedPayload.elevation = feedRecord.elevation || '';
    feedPayload.weightKg = feedRecord.weightKg || '0.00';
    feedPayload.items = feedRecord.items || [];
    feedPayload.templateId = feedRecord.templateId || 1;
  }

  var payload = {
    action: isRouterSnap ? 'SHARE_ROUTER_SNAP' : 'SHARE_PUBLIC_FEED',
    userId: userId,
    nickname: nickname,
    isNewPost: Boolean(feedRecord.isNewPost),
    feed: feedPayload
  };

  // 구글 시트 및 R2 feeds.json으로 비동기 백그라운드 전송 (응답 대기 없이 즉시 통과)
  fetch(targetGasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(function() {
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
  }).catch(function(e) {
    console.warn('[RomanticSync] 백그라운드 시트 기록 지연 (앱 정상 구동 유지):', e);
  });
};

// 10. 커뮤니티 피드 삭제
window.deleteFeedFromCommunity = function(feedId, dateStr) {
  var sId = String(feedId || '').trim();
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || localStorage.getItem('okbm_user_id') || '');

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  var isRouterSnap = sId.startsWith('snap_');
  var payload = {
    action: isRouterSnap ? 'DELETE_ROUTER_SNAP' : 'DELETE_PUBLIC_FEED',
    feedId: sId,
    id: sId,
    date: dateStr || '',
    userId: userId
  };

  // ⚡ [Fire-and-Forget 백그라운드 전송]: 응답을 기다리지 않고 시트로 신호만 툭 던져두어 화면 대기열 0% 보장
  try {
    fetch(targetGasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch(function() {});
  } catch (e) {}

  console.log('[RomanticSync] ' + (isRouterSnap ? '루터 스냅' : '루트 피드') + ' 백그라운드 시트 삭제 신호 발송 완료');
};
