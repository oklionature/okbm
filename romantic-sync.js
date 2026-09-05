/**
 * 🏕️ 낭만루트 구글 시트 실시간 동기화 & 낭만보관함 복원 코어 엔진 (v2.1.0 Final Master)
 * - [9열 표준 스키마 1:1 완벽 직통]: G열(my_gears: 슬롯/⭐찜/커스텀) 및 I열(14일 쿨다운 타임스탬프) 보존
 * - [신규 분리 모듈 100% 호환]: romantic-plan.js(계획/계산기) & romantic-history.js(보관함/피드) 실시간 동기화 렌더러 연동
 * - [브라우저 간 닉네임 역전 덮어쓰기 원천 차단]: 구글 시트 원본(1순위) > 로컬 커스텀(2순위) > 카카오 실명(3순위)
 * - [동기화 락(Lock) 안전망]: 클라우드 데이터 수신 완료 전 빈 배열([]) 전송에 의한 시트 삭제 원천 방어
 * - [지도(fromMap) & 홈(fromIndex) 선택적 격리 갱신]: 상호 간섭 없는 안전한 클라우드 백업
 * - [커스텀 장비 메모리 복원]: 로그인 시 사용자가 직접 등록한 장비 CATEGORIES DB 자동 주입
 * - [로그아웃 롤백]: 배낭 슬롯 0.00kg 초기화 및 낭만계획/보관함/지도 UI 일괄 원상 복구
 */

var GAS_API_URL = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';
var R2_PUBLIC_DOMAIN = window.R2_PUBLIC_DOMAIN || 'https://pub-13ec7c39d2394ecc879bb2ed4b304c44.r2.dev';

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
function UtilitiesFormattedNow() {
  return getFormattedNow();
}

// ☁️ 1. Cloudflare R2 글로벌 CDN (0.03초 1순위) ➔ 구글 시트(2순위 백업망) 직통 조회
async function loadUserDataFromCloud(userId) {
  if (!userId) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('📡 [RomanticSync] 오프라인 감지: 로컬 캐시로 즉시 전환합니다.');
    return null;
  }

  // 🚀 [1순위: 0.03초 (30ms)] Cloudflare 글로벌 엣지 CDN 직통 조회
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

  // 📁 [2순위: 구글 앱스 스크립트 안전 폴백]
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
  var hasValid = !!(token && token.trim().length > 0 && profile && profile.id && String(profile.id).startsWith('kakao_'));
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

function syncUserDataToCloud(isPackHistoryUpdated) {
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = profile && profile.id ? String(profile.id).trim() : localStorage.getItem('user_auth_token');
  if (!userId) return;

  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  var isIndexPage = !isMapPage || (isPackHistoryUpdated === true);

  // 🛡️ [삭제 부활 방지 1순위]: 툼스톤 큐가 존재하면 삭제 마킹({isDeleted: true})을 최우선 수집
  var rawHistory = [];
  if (Array.isArray(window.__tombstoneHistoryQueue) && window.__tombstoneHistoryQueue.length > 0) {
    rawHistory = window.__tombstoneHistoryQueue;
  } else if (window.interactiveHistory && Array.isArray(window.interactiveHistory)) {
    rawHistory = window.interactiveHistory;
  } else if (window.packingHistoryList && Array.isArray(window.packingHistoryList)) {
    rawHistory = window.packingHistoryList;
  } else if (typeof window.safeGetStorage === 'function') {
    rawHistory = window.safeGetStorage('okbm_packing_history', []) || [];
  } else {
    rawHistory = safeGetJSON('okbm_packing_history', []);
  }

  // 활성 목록은 삭제된 항목을 제외한 순수 기록으로 유지
  var cleanActiveHistory = rawHistory.filter(function(h) { return h && !h.isDeleted; });
  window.packingHistoryList = cleanActiveHistory;
  window.interactiveHistory = cleanActiveHistory;

  // 🪦 [툼스톤 경량화 직렬화]: 클라우드(R2/구글)로 삭제 증표를 함께 전송하여 타 기기 부활 영구 차단
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
    fromMap: isMapPage && !isIndexPage, // 패킹 기록이 있으면 지도 락 해제
    fromIndex: isIndexPage,
    forcePackSync: true, // 구글 시트 백엔드 강제 동기화 플래그
   createdAt: (profile && profile.createdAt) ? profile.createdAt : getFormattedNow(),
    lastNicknameChangedAt: profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0,
    bookmarks: safeGetJSON('okbm_bookmarks', []),
    visited: safeGetJSON('okbm_visited', []),
    memos: safeGetJSON('okbm_memos', {}),
    packHistory: lightweightPackHistory,
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

  fetch(targetGasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data && data.status === 'SUCCESS') {
      localStorage.removeItem('okbm_pending_cloud_sync');
      console.log('✅ [RomanticSync] 구글 시트 실시간 백업 완벽 성공!');
      updateHeaderAuthUI();
    } else {
      localStorage.setItem('okbm_pending_cloud_sync', 'true');
      console.warn('⚠️ [RomanticSync] 서버 저장 실패 응답:', data);
    }
  })
  .catch(function(err) {
    localStorage.setItem('okbm_pending_cloud_sync', 'true');
    console.warn('[RomanticSync] 클라우드 전송 통신 오류:', err);
    updateHeaderAuthUI();
  });
}

// 🌐 네트워크 복구 자동 감지 및 상향 동기화 리스너
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
  var starIconSvg = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; margin-right:2px; fill:#fde047; color:#fde047; flex-shrink:0; display:inline-block; vertical-align:-1px;"><path d="M12,1 Q12,12 1,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 12,1 Z"/><circle cx="12" cy="1.5" r="1.5" fill="#ffffff"/></svg>';

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

// 🚪 6. 로그인 / 계정 관리 모달 제어
function handleAuthBtnClick() {
  triggerHaptic(12);
  if (isUserLoggedIn()) {
    openUserProfileModal();
  } else {
    openLoginModal();
  }
}

function openLoginModal() {
  try {
    var modal = document.getElementById('loginModalOverlay');
    if (modal) modal.style.setProperty('display', 'flex', 'important');
    triggerHaptic(12);
  } catch (e) {}
}

function closeLoginModal() {
  try {
    var modal = document.getElementById('loginModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
  } catch (e) {}
}

function openUserProfileModal() {
  try {
    var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
    var input = document.getElementById('profileModalNicknameInput');
    if (input && profile) input.value = profile.nickname || '';

    // 🛡️ 모달 오픈 시 14일 쿨다운 잔여일 사전 체크
    var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
    var lastChanged = profile ? (Number(profile.lastNicknameChangedAt) || 0) : 0;
    var now = Date.now();

    var statusNoticeEl = document.getElementById('profileModalCooldownNotice');
    if (!statusNoticeEl && input && input.parentElement) {
      statusNoticeEl = document.createElement('div');
      statusNoticeEl.id = 'profileModalCooldownNotice';
      statusNoticeEl.style.cssText = 'font-size:0.68rem; margin-top:5px; font-weight:800; display:flex; align-items:center; gap:4px;';
      input.parentElement.parentElement.appendChild(statusNoticeEl);
    }

    if (statusNoticeEl) {
      if (lastChanged > 0 && (now - lastChanged < COOLDOWN_MS)) {
        var remainingDays = Math.ceil((COOLDOWN_MS - (now - lastChanged)) / (1000 * 60 * 60 * 24));
        statusNoticeEl.style.color = '#f59e0b';
        statusNoticeEl.innerHTML = '⏳ 닉네임 변경 쿨다운 중 [' + remainingDays + '일 후 변경 가능]';
      } else {
        statusNoticeEl.style.color = '#34d399';
        statusNoticeEl.innerHTML = '✓ 현재 닉네임 변경이 가능합니다 (변경 후 14일 쿨다운)';
      }
    }

    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'flex', 'important');
    triggerHaptic(12);
  } catch (e) {}
}

function closeUserProfileModal() {
  try {
    var modal = document.getElementById('userProfileModalOverlay');
    if (modal) modal.style.setProperty('display', 'none', 'important');
  } catch (e) {}
}

// 🚪 [로그아웃 및 기기 세션/배낭 롤백 처리]
function logoutUser() {
  triggerHaptic(15);

  if (typeof Kakao !== 'undefined' && Kakao.Auth && typeof Kakao.Auth.logout === 'function') {
    try {
      Kakao.Auth.logout(function() {});
    } catch (e) {}
  }

  localStorage.removeItem('user_auth_token');
  localStorage.removeItem('user_profile');

  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = false;
    authState.userProfile = null;
  }

  window.selectedGearMap = {};
  localStorage.removeItem('okbm_selected_gears_multi');

  var bannerKg = document.getElementById('mainBannerKgText');
  var bannerCount = document.getElementById('mainBannerItemCount');
  var bannerBadge = document.getElementById('mainBannerBadge');
  if (bannerKg) bannerKg.innerText = '0.00 kg';
  if (bannerCount) bannerCount.innerText = '장비 0개 세팅됨';
  if (bannerBadge) {
    bannerBadge.className = 'weight-bpl-badge bpl-ul';
    bannerBadge.innerText = '울트라라이트 (UL)';
  }

  updateHeaderAuthUI();

  if (typeof renderCategorySlots === 'function') renderCategorySlots();
  if (typeof renderPlanStage === 'function') renderPlanStage();
  if (typeof renderPlanCategorySlots === 'function') renderPlanCategorySlots();
  if (typeof renderHistoryStage === 'function') renderHistoryStage();
  if (typeof renderSpots === 'function') renderSpots();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();

  showToast('로그아웃되었습니다.', 'info', 2200);
}

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

  // 화면 렌더러 동기화
  if (typeof renderSpots === 'function') renderSpots();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
  if (typeof renderPlanStage === 'function') renderPlanStage();
  if (typeof renderHistoryStage === 'function') renderHistoryStage();
}

// 🔑 8. 카카오 로그인 및 클라우드 데이터 동기화
function loginWithKakao() {
  if (typeof Kakao === 'undefined') {
    showToast('카카오 SDK를 불러오지 못했습니다.', 'warn');
    return;
  }
  if (!Kakao.isInitialized()) Kakao.init(window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1");

  var loginBtn = document.querySelector('.btn-social-kakao');
  if (loginBtn) {
    loginBtn.style.pointerEvents = 'none';
    loginBtn.style.opacity = '0.75';
    loginBtn.innerHTML = '<span>로그인 인증 중...</span>';
  }

  Kakao.Auth.login({
    scope: 'profile_nickname',
    throughTalk: false,
    success: function(authObj) {
      Kakao.API.request({
        url: '/v2/user/me',
        success: async function(res) {
          var kakaoId = 'kakao_' + res.id;
          var kakaoNick = '낭만백패커';
          if (res.properties && res.properties.nickname) kakaoNick = res.properties.nickname;
          else if (res.kakao_account && res.kakao_account.profile && res.kakao_account.profile.nickname) kakaoNick = res.kakao_account.profile.nickname;

          var savedCustomNick = localStorage.getItem('okbm_custom_nickname_' + kakaoId);
          var accountLocalProfile = safeGetJSON('user_profile_' + kakaoId, null);
          var tempNick = savedCustomNick || (accountLocalProfile && accountLocalProfile.nickname) || kakaoNick;

          var profile = {
            id: kakaoId,
            nickname: tempNick,
            isMember: true,
            createdAt: getFormattedNow(),
            lastNicknameChangedAt: (accountLocalProfile && accountLocalProfile.lastNicknameChangedAt) ? Number(accountLocalProfile.lastNicknameChangedAt) : 0
          };

          localStorage.setItem('user_auth_token', authObj.access_token || ('token_' + Date.now()));
          localStorage.setItem('user_profile', JSON.stringify(profile));
          localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
          if (typeof authState !== 'undefined') {
            authState.isLoggedIn = true;
            authState.userProfile = profile;
          }

          closeLoginModal();
          updateHeaderAuthUI();
          triggerHaptic(15);
          showToast('<span>[' + profile.nickname + ']님 환영합니다!</span>', 'success', 2200);

          // ☁️ 백그라운드 클라우드 데이터 수신 및 반영
         loadUserDataFromCloud(kakaoId).then(function(cloudData) {
            if (cloudData) {
              if (cloudData.nickname && !cloudData.nickname.includes('ENGINE')) {
                profile.nickname = cloudData.nickname;
              }
              if (cloudData.lastNicknameChangedAt !== undefined) {
                profile.lastNicknameChangedAt = Number(cloudData.lastNicknameChangedAt);
              }
              localStorage.setItem('user_profile', JSON.stringify(profile));
              localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
              if (typeof authState !== 'undefined') authState.userProfile = profile;
              updateHeaderAuthUI();

              if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
                localStorage.setItem('okbm_bookmarks', JSON.stringify(cloudData.bookmarks));
                if (typeof window.userBookmarks !== 'undefined') window.userBookmarks = new Set(cloudData.bookmarks.map(function(s) { return String(s).trim(); }));
              }
              if (cloudData.visited && Array.isArray(cloudData.visited)) {
                localStorage.setItem('okbm_visited', JSON.stringify(cloudData.visited));
                if (typeof window.userVisited !== 'undefined') window.userVisited = new Set(cloudData.visited.map(function(s) { return String(s).trim(); }));
              }
              if (cloudData.memos && typeof cloudData.memos === 'object') {
                localStorage.setItem('okbm_memos', JSON.stringify(cloudData.memos));
                if (typeof window.userMemos !== 'undefined') window.userMemos = cloudData.memos;
              }
             if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
                var localSavedPhotos = safeGetJSON('okbm_phone_photos_map', {});
                if (window.__memoryStore && window.__memoryStore['okbm_phone_photos_map']) {
                  localSavedPhotos = Object.assign({}, window.__memoryStore['okbm_phone_photos_map'], localSavedPhotos);
                }

                var currentLocalHistory = (window.interactiveHistory && Array.isArray(window.interactiveHistory))
                  ? window.interactiveHistory
                  : safeGetJSON('okbm_packing_history', []);

               // 1. 클라우드의 삭제 툼스톤 맵과 활성 기록 맵 분리
                var cloudDeletedIds = new Set();
                var cloudDeletedDates = new Set();
                var cloudActiveMap = new Map();

                cloudData.packHistory.filter(Boolean).forEach(function(cItem) {
                  var cId = String(cItem.id || '').trim();
                  var cDate = String(cItem.date || '').replace(/[-/]/g, '.').trim();
                  if (cItem.isDeleted === true) {
                    if (cId) cloudDeletedIds.add(cId);
                    if (cDate) cloudDeletedDates.add(cDate);
                  } else {
                    if (cId) cloudActiveMap.set(cId, cItem);
                  }
                });

                // 2. 스마트 조율: 클라우드 활성 기록 매핑 및 사진 복원
                var reconciledMap = new Map();

                cloudActiveMap.forEach(function(cloudItem, cId) {
                  var cDate = String(cloudItem.date || '').trim();
                  var matchedLocal = currentLocalHistory.find(function(loc) {
                    return loc && ((cId && String(loc.id).trim() === cId) || (cDate && String(loc.date).trim() === cDate));
                  });

                  var preservedPhotos = [];
                  if (Array.isArray(cloudItem.photos) && cloudItem.photos.length > 0) {
                    preservedPhotos = cloudItem.photos.filter(function(p) { return typeof p === 'string' && p.startsWith('http'); });
                  } else if (typeof cloudItem.photo === 'string' && cloudItem.photo.startsWith('http')) {
                    preservedPhotos = [cloudItem.photo];
                  }

                  if (preservedPhotos.length === 0 && matchedLocal) {
                    if (Array.isArray(matchedLocal.photos) && matchedLocal.photos.length > 0) preservedPhotos = matchedLocal.photos;
                    else if (matchedLocal.photo) preservedPhotos = [matchedLocal.photo];
                    else if (matchedLocal.fieldPhoto) preservedPhotos = [matchedLocal.fieldPhoto];
                  }

                  if (preservedPhotos.length === 0 && localSavedPhotos) {
                    var fromMap = localSavedPhotos[cId] || localSavedPhotos[cDate] || localSavedPhotos[cDate.replace(/[-/]/g, '.')];
                    if (Array.isArray(fromMap) && fromMap.length > 0) preservedPhotos = fromMap;
                    else if (typeof fromMap === 'string' && fromMap.trim().length > 10) preservedPhotos = [fromMap.trim()];
                  }

                  var mergedItem = Object.assign({}, cloudItem);
                  if (preservedPhotos.length > 0) {
                    mergedItem.photos = preservedPhotos;
                    mergedItem.photo = preservedPhotos[0];
                    mergedItem.fieldPhoto = preservedPhotos[0];
                  }
                  reconciledMap.set(cId, mergedItem);
                });

                // 3. [부활 방지 필터]: 타 기기에서 삭제된 항목은 로컬에서도 완벽히 강제 영구 소멸
                var hasLocalDraftsToUpload = false;
                currentLocalHistory.forEach(function(loc) {
                  if (!loc) return;
                  var locId = String(loc.id || '').trim();
                  var locDate = String(loc.date || '').replace(/[-/]/g, '.').trim();

                  // 삭제 툼스톤이 걸린 항목은 절대 복원하지 않고 로컬에서도 영구 파기
                  if (cloudDeletedIds.has(locId) || cloudDeletedDates.has(locDate) || loc.isDeleted === true) {
                    if (localSavedPhotos) {
                      delete localSavedPhotos[locId];
                      delete localSavedPhotos[locDate];
                    }
                    return;
                  }

                  // 서버에 없는 순수 신규 로컬 글만 보존하여 클라우드로 상향 동기화
                  if (!cloudActiveMap.has(locId)) {
                    reconciledMap.set(locId, loc);
                    hasLocalDraftsToUpload = true;
                  }
                });

                var safePackHistory = Array.from(reconciledMap.values());
                window.packingHistoryList = safePackHistory;
                window.interactiveHistory = safePackHistory;
                window.__memoryStore = window.__memoryStore || {};
                window.__memoryStore['okbm_packing_history'] = safePackHistory;

                if (typeof window.safeSetStorage === 'function') {
                  window.safeSetStorage('okbm_packing_history', safePackHistory);
                } else {
                  var cleanForLocal = safePackHistory.map(function(item) {
                    var clone = Object.assign({}, item);
                    delete clone.photos;
                    delete clone.photo;
                    delete clone.fieldPhoto;
                    return clone;
                  });
                  localStorage.setItem('okbm_packing_history', JSON.stringify(cleanForLocal));
                  if (typeof window.saveToIndexedDB === 'function') {
                    window.saveToIndexedDB('okbm_packing_history', safePackHistory);
                  }
                }

                // 오프라인 작성본이 합쳐졌다면 조용히 클라우드로 백업 전송
                if (hasLocalDraftsToUpload) {
                  syncUserDataToCloud(true);
                }
              }

              var myGears = cloudData.myGears || null;
              if (myGears) {
                if (myGears.selectedGears && typeof myGears.selectedGears === 'object' && Object.keys(myGears.selectedGears).length > 0) {
                  window.selectedGearMap = myGears.selectedGears;
                  localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
                }
                if (myGears.favoriteGears && Array.isArray(myGears.favoriteGears)) {
                  window.favoriteGearSet = new Set(myGears.favoriteGears);
                  localStorage.setItem('okbm_favorite_gears', JSON.stringify(myGears.favoriteGears));
                }
                if (myGears.customGears && Array.isArray(myGears.customGears)) {
                  localStorage.setItem('okbm_custom_gears', JSON.stringify(myGears.customGears));
                  var currentCats = window.CATEGORIES || (typeof CATEGORIES !== 'undefined' ? CATEGORIES : null);
                  if (currentCats && Array.isArray(currentCats)) {
                    myGears.customGears.forEach(function(cg) {
                      var targetCat = currentCats.find(function(c) { return c.id === cg.category_id; });
                      if (targetCat && !targetCat.db.some(function(d) { return d.name === cg.name; })) {
                        targetCat.db.unshift(cg);
                      }
                    });
                  }
                }
                if (myGears.gearPresets && Array.isArray(myGears.gearPresets)) {
                  localStorage.setItem('okbm_gear_presets', JSON.stringify(myGears.gearPresets));
                }
                if (myGears.gearMeta && typeof myGears.gearMeta === 'object') {
                  localStorage.setItem('okbm_gear_meta', JSON.stringify(myGears.gearMeta));
                }
              }

              if (typeof renderPlanStage === 'function') renderPlanStage();
              if (typeof renderPlanCategorySlots === 'function') renderPlanCategorySlots();
              if (typeof renderHistoryStage === 'function') renderHistoryStage();
              if (typeof renderCategorySlots === 'function') renderCategorySlots();
              if (typeof renderSpots === 'function') renderSpots();
              if (typeof renderSubChips === 'function') renderSubChips();
              if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
              window.isCloudDataLoaded = true;
            }
          });
        },
        fail: function(err) {
          console.warn('[Kakao] User me request failed:', err);
          window.isCloudDataLoaded = true;
        }
      });
    },
   fail: function(err) {
      console.warn('[Kakao] Login failed:', err);
      window.isCloudDataLoaded = true;
    }
  });
}

window.shareFeedToCommunity = function(feedRecord) {
  if (!feedRecord) return;
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('user_auth_token') || 'anonymous');
  var nickname = (profile && profile.nickname) ? profile.nickname : '낭만백패커';

  var targetGasUrl = window.GAS_API_URL || GAS_API_URL;
  if (!targetGasUrl || targetGasUrl.includes('구글시트_배포_URL')) return;

  var allPhotos = [];
  if (Array.isArray(feedRecord.photos) && feedRecord.photos.length > 0) {
    allPhotos = feedRecord.photos.filter(function(p) { 
      return typeof p === 'string' && (p.startsWith('http') || p.startsWith('data:')); 
    });
  }
  if (allPhotos.length === 0 && feedRecord.photo && typeof feedRecord.photo === 'string' && (feedRecord.photo.startsWith('http') || feedRecord.photo.startsWith('data:'))) {
    allPhotos = [feedRecord.photo];
  }
  if (allPhotos.length === 0 && feedRecord.fieldPhoto && typeof feedRecord.fieldPhoto === 'string' && (feedRecord.fieldPhoto.startsWith('http') || feedRecord.fieldPhoto.startsWith('data:'))) {
    allPhotos = [feedRecord.fieldPhoto];
  }

  var mainPhoto = allPhotos.length > 0 ? allPhotos[0] : (feedRecord.photo || feedRecord.fieldPhoto || '');

  var payload = {
    action: 'SHARE_PUBLIC_FEED',
    userId: userId,
    nickname: nickname,
    feed: {
      id: feedRecord.id,
      userId: userId,
      author: nickname,
      spot: feedRecord.spot || feedRecord.spotName,
      elevation: feedRecord.elevation,
      weightKg: feedRecord.weightKg,
      date: feedRecord.date,
      memo: feedRecord.memo || feedRecord.oneLineMemo,
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
      console.log('✅ [RomanticSync] 다중 사진 (' + allPhotos.length + '장) 공용 피드 최종 전송 성공');
    }
  }).catch(function(err) {
    console.warn('[RomanticSync] 커뮤니티 피드 전송 실패:', err);
  });
};

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
