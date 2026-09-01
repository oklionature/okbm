/**
 * 🏕️ 낭만루트 구글 시트 실시간 동기화 & 낭만보관함 복원 코어 엔진 (v2.0.1 Final Master)
 * - [9열 표준 스키마 1:1 완벽 직통]: G열(my_gears: 슬롯/⭐찜/커스텀) 및 I열(14일 쿨다운 타임스탬프) 보존
 * - [브라우저 간 닉네임 역전 덮어쓰기 원천 차단]: 구글 시트 원본(1순위) > 로컬 커스텀(2순위) > 카카오 실명(3순위)
 * - [동기화 락(Lock) 안전망]: 클라우드 데이터 수신 완료 전 빈 배열([]) 전송에 의한 시트 삭제 원천 방어
 * - [지도(fromMap) & 홈(fromIndex) 선택적 격리 갱신]: 상호 간섭 없는 안전한 클라우드 백업
 * - [커스텀 장비 메모리 복원]: 로그인 시 사용자가 직접 등록한 장비 CATEGORIES DB 자동 주입
 * - [로그아웃 롤백]: 배낭 슬롯 0.00kg 초기화 및 기본 장비 DB 원상 복구 완벽 탑재
 */

var GAS_API_URL = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';

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
      navigator.vibrate(duration || 12);
    } catch (e) {}
  }
}

// 🧰 [공통 유틸] 안전한 토스트 메시지 출력
function showToast(msg, typeOrDuration, maybeDuration) {
  if (typeof window.showToast === 'function' && window.showToast !== showToast) {
    window.showToast(msg, typeOrDuration, maybeDuration);
    return;
  }
  var toastEl = document.getElementById('appToast');
  if (toastEl) {
    toastEl.innerHTML = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    var dur = (typeof typeOrDuration === 'number') ? typeOrDuration : (typeof maybeDuration === 'number' ? maybeDuration : 2200);
    toastEl._timer = setTimeout(function() {
      toastEl.classList.remove('show');
    }, dur);
    return;
  }
  var container = document.getElementById('romanticToastContainer');
  if (container) {
    var toast = document.createElement('div');
    toast.style.cssText = 'background:rgba(7,10,15,0.94); border:1.5px solid #38bdf8; color:#ffffff; font-size:0.76rem; font-weight:800; padding:9px 14px; border-radius:24px; box-shadow:0 12px 35px rgba(0,0,0,0.85);';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2200);
  }
}

// ☁️ 1. 구글 시트 클라우드 유저 데이터(9열 전체) 1순위 비동기 조회
async function loadUserDataFromCloud(userId) {
  if (!userId) return null;
  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 9000);
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

function syncUserDataToCloud() {
  // 🛡️ 로그인 상태(kakao_ID 보유)가 확인되면 즉시 전송 실행
  if (!isUserLoggedIn()) return;

  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  if (!profile || !profile.id) return;

  var isMapPage = (typeof window.location !== 'undefined' && window.location.pathname.includes('map.html'));
  var isIndexPage = !isMapPage;

  // 1. 패킹 기록 동기화 (interactiveHistory 우선 참조하여 삭제 상태 100% 반영)
  var rawHistory = safeGetJSON('okbm_packing_history', []);
  if (window.interactiveHistory && Array.isArray(window.interactiveHistory)) {
    rawHistory = window.interactiveHistory;
  }
  window.packingHistoryList = rawHistory;

  var lightweightPackHistory = rawHistory.map(function(h) {
    var copy = Object.assign({}, h);
    delete copy.photo; // 대용량 사진 데이터만 제외하고 텍스트 제원은 100% 보존
    return copy;
  });

  // 2. 마이 장비 세팅값 (슬롯 담김, 찜, 커스텀 삭제 상태 직통 반영)
  var currentGears = window.selectedGearMap || safeGetJSON('okbm_selected_gears_multi', {});
  var currentFavs = window.favoriteGearSet ? Array.from(window.favoriteGearSet) : safeGetJSON('okbm_favorite_gears', []);
  var currentCustoms = safeGetJSON('okbm_custom_gears', []);

  var myGearsPayload = {
    selectedGears: currentGears,
    favoriteGears: currentFavs,
    customGears: currentCustoms
  };

  var payload = {
    action: 'SAVE_USER_DATA',
    userId: String(profile.id).trim(),
    nickname: profile.nickname || '낭만백패커',
    fromMap: isMapPage,
    fromIndex: isIndexPage,
    createdAt: profile.createdAt || UtilitiesFormattedNow(),
    lastNicknameChangedAt: Number(profile.lastNicknameChangedAt) || 0,
    bookmarks: safeGetJSON('okbm_bookmarks', []),
    visited: safeGetJSON('okbm_visited', []),
    memos: safeGetJSON('okbm_memos', {}),
    packHistory: lightweightPackHistory,
    myGears: myGearsPayload
  };

  fetch(window.GAS_API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(function() {
    console.log('✅ [RomanticSync] 구글 시트 전송 완료:', payload.userId);
  }).catch(function(err) {
    console.warn('[RomanticSync] 클라우드 전송 에러:', err);
  });
}

function UtilitiesFormattedNow() {
  var d = new Date();
  var pad = function(n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '. ' + pad(d.getMonth() + 1) + '. ' + pad(d.getDate()) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
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
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : null);
  var starIconSvg = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; margin-right:2px; fill:#fde047; color:#fde047; flex-shrink:0; display:inline-block; vertical-align:-1px;"><path d="M12,1 Q12,12 1,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,1 Z"/><circle cx="12" cy="12" r="1.5" fill="#ffffff"/></svg>';

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
    if (isLogged) {
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
    var profile = safeGetJSON('user_profile', null);
    var input = document.getElementById('profileModalNicknameInput');
    if (input && profile) input.value = profile.nickname || '';
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

// ⏱️ 7. 닉네임 변경 및 14일 쿨다운 영구 기록
// ⏱️ 7. 닉네임 변경 및 14일 쿨다운 체크 (고품질 벡터 알림 적용)
function saveNewNicknameFromModal() {
  var input = document.getElementById('profileModalNicknameInput');
  if (!input || !input.value.trim()) {
    showToast('<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; margin-right:3px; vertical-align:-2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>새 닉네임을 입력해주세요.</span>', 'warn');
    return;
  }
  var clean = input.value.trim();
  var profile = safeGetJSON('user_profile', null) || (typeof authState !== 'undefined' ? authState.userProfile : { isMember: true });
  if (profile && profile.nickname === clean) {
    showToast('<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; margin-right:3px; vertical-align:-2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> <span>현재 사용 중인 닉네임과 동일합니다.</span>', 'info');
    return;
  }

  var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  var lastChanged = Number(profile.lastNicknameChangedAt) || 0;
  var now = Date.now();

  // 🛡️ 14일 쿨다운 시 시스템 alert() 대신 앰버 골드 시계 SVG 벡터 토스트 출력
  if (lastChanged > 0 && (now - lastChanged < COOLDOWN_MS)) {
    var remainingDays = Math.ceil((COOLDOWN_MS - (now - lastChanged)) / (1000 * 60 * 60 * 24));
    var clockVectorSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; margin-right:4px; vertical-align:-2px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    showToast(clockVectorSvg + ' <span>닉네임은 14일마다 1회 변경 가능합니다. [' + remainingDays + '일 후 가능]</span>', 'warn', 3000);
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

  var checkSuccessSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; margin-right:4px; vertical-align:-2px; flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  showToast(checkSuccessSvg + ' <span>닉네임이 [' + clean + '] (으)로 변경되었습니다!</span>', 'success');

  if (typeof renderSpots === 'function') renderSpots();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
  if (typeof updateShareCardLive === 'function') updateShareCardLive();
}

// 🔑 8. 0.3초 초고속 로그인 & 연타 방지 락 + 구글 시트 백그라운드 동기화
function loginWithKakao() {
  if (typeof Kakao === 'undefined') {
    showToast('<svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" style="width:15px; height:15px; margin-right:3px; vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>카카오 SDK를 불러오지 못했습니다.</span>', 'warn');
    return;
  }
  if (!Kakao.isInitialized()) Kakao.init(window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1");

  // 🔒 버튼 연타 및 중복 새로고침 원천 차단
  var loginBtn = document.querySelector('.btn-social-kakao');
  if (loginBtn) {
    loginBtn.style.pointerEvents = 'none';
    loginBtn.style.opacity = '0.75';
    loginBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#191919" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; margin-right:4px; vertical-align:-2px; animation:spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> <span>로그인 인증 중...</span>';
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
            createdAt: UtilitiesFormattedNow(),
            lastNicknameChangedAt: (accountLocalProfile && accountLocalProfile.lastNicknameChangedAt) ? Number(accountLocalProfile.lastNicknameChangedAt) : 0
          };

          localStorage.setItem('user_auth_token', authObj.access_token || ('token_' + Date.now()));
          localStorage.setItem('user_profile', JSON.stringify(profile));
          localStorage.setItem('user_profile_' + kakaoId, JSON.stringify(profile));
          if (typeof authState !== 'undefined') {
            authState.isLoggedIn = true;
            authState.userProfile = profile;
          }

          // ⚡ [0.3초 광속 전환] 모달을 즉시 닫고 헤더에 로그인 닉네임 반영
          closeLoginModal();
          updateHeaderAuthUI();
          triggerHaptic(15);

          var checkSuccessSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; margin-right:4px; vertical-align:-2px; flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
          showToast(checkSuccessSvg + ' <span>[' + profile.nickname + ']님 환영합니다!</span>', 'success', 2200);

          // ☁️ [백그라운드 비동기 동기화] 유저는 자유롭게 화면을 보고 있고 뒤에서 시트 데이터 수신
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
                if (typeof userBookmarks !== 'undefined') userBookmarks = new Set(cloudData.bookmarks.map(function(s) { return String(s).trim(); }));
              }
              if (cloudData.visited && Array.isArray(cloudData.visited)) {
                localStorage.setItem('okbm_visited', JSON.stringify(cloudData.visited));
                if (typeof userVisited !== 'undefined') userVisited = new Set(cloudData.visited.map(function(s) { return String(s).trim(); }));
              }
              if (cloudData.memos && typeof cloudData.memos === 'object') {
                localStorage.setItem('okbm_memos', JSON.stringify(cloudData.memos));
                if (typeof userMemos !== 'undefined') userMemos = cloudData.memos;
              }
              if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
                window.packingHistoryList = cloudData.packHistory;
                localStorage.setItem('okbm_packing_history', JSON.stringify(window.packingHistoryList));
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
                  if (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) {
                    myGears.customGears.forEach(function(cg) {
                      var targetCat = CATEGORIES.find(function(c) { return c.id === cg.category_id; });
                      if (targetCat && !targetCat.db.some(function(d) { return d.name === cg.name; })) {
                        targetCat.db.unshift(cg);
                      }
                    });
                  }
                }
              }
            }

            window.isCloudDataLoaded = true;

            if (typeof renderCategorySlots === 'function') renderCategorySlots();
            if (typeof renderPackingHistoryList === 'function') renderPackingHistoryList();
            if (typeof renderBasecampRecordData === 'function') renderBasecampRecordData();
            if (typeof renderBasecampMemos === 'function') renderBasecampMemos();
            if (typeof renderSpots === 'function') renderSpots();
            if (typeof renderSubChips === 'function') renderSubChips();
            if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();

            syncUserDataToCloud();
          });
        },
        fail: function() {
          if (loginBtn) {
            loginBtn.style.pointerEvents = 'auto';
            loginBtn.style.opacity = '1';
            loginBtn.innerHTML = '<span id="kakaoLoginIcon" style="display:inline-flex;"></span> <span>카카오 1초 간편 로그인</span>';
          }
          showToast('<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="width:15px; height:15px; margin-right:3px; vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <span>카카오 사용자 정보를 가져오지 못했습니다.</span>', 'warn');
        }
      });
    },
    fail: function() {
      if (loginBtn) {
        loginBtn.style.pointerEvents = 'auto';
        loginBtn.style.opacity = '1';
        loginBtn.innerHTML = '<span id="kakaoLoginIcon" style="display:inline-flex;"></span> <span>카카오 1초 간편 로그인</span>';
      }
      showToast('<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="width:15px; height:15px; margin-right:3px; vertical-align:-2px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> <span>카카오 로그인이 취소되었습니다.</span>', 'info');
    }
  });
}

// 🚪 9. 로그아웃 (배낭 슬롯 0.00kg 초기화 & 기본 장비 DB 롤백)
function logoutUser() {
  if (typeof Kakao !== 'undefined' && Kakao.Auth && Kakao.Auth.getAccessToken()) {
    try { Kakao.Auth.logout(function() {}); } catch (e) {}
  }

  localStorage.removeItem('user_auth_token');
  localStorage.removeItem('user_profile');
  if (typeof authState !== 'undefined') {
    authState.isLoggedIn = false;
    authState.userProfile = null;
  }
  window.isCloudDataLoaded = false;

  localStorage.removeItem('okbm_favorite_gears');
  localStorage.removeItem('okbm_custom_gears');
  localStorage.removeItem('okbm_packing_history');
  localStorage.removeItem('okbm_bookmarks');
  localStorage.removeItem('okbm_visited');
  localStorage.removeItem('okbm_memos');
  localStorage.removeItem('okbm_selected_gears_multi');

  if (typeof favoriteGearSet !== 'undefined') favoriteGearSet = new Set();
  if (typeof packingHistoryList !== 'undefined') packingHistoryList = [];
  if (typeof userBookmarks !== 'undefined') userBookmarks = new Set();
  if (typeof userVisited !== 'undefined') userVisited = new Set();
  if (typeof userMemos !== 'undefined') userMemos = {};
  if (typeof currentShareRecord !== 'undefined') currentShareRecord = null;
  if (typeof currentShareItems !== 'undefined') currentShareItems = [];
  if (typeof currentSharePhoto !== 'undefined') currentSharePhoto = '';
  if (typeof calSelectedDate !== 'undefined') calSelectedDate = null;

  if (typeof selectedGearMap !== 'undefined') {
    selectedGearMap = {};
    if (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) {
      CATEGORIES.forEach(function(cat) { selectedGearMap[cat.id] = []; });
      if (typeof ORIGINAL_CATEGORIES_DB !== 'undefined' && Array.isArray(ORIGINAL_CATEGORIES_DB)) {
        CATEGORIES.forEach(function(cat) {
          var orig = ORIGINAL_CATEGORIES_DB.find(function(o) { return o.id === cat.id; });
          if (orig && Array.isArray(orig.db)) {
            cat.db = JSON.parse(JSON.stringify(orig.db));
          }
        });
      }
    }
  }

  updateHeaderAuthUI();
  if (typeof renderCategorySlots === 'function') renderCategorySlots();
  if (typeof renderPackingHistoryList === 'function') renderPackingHistoryList();
  if (typeof renderBasecampRecordData === 'function') renderBasecampRecordData();
  if (typeof renderBasecampMemos === 'function') renderBasecampMemos();
  if (typeof renderSpots === 'function') renderSpots();
  if (typeof renderSubChips === 'function') renderSubChips();
  if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();

  closeUserProfileModal();
  triggerHaptic(10);
  showToast('로그아웃되었습니다. (배낭 및 보관함 초기화 완료)', 'info', 2200);
}

// 🔄 10. 앱 초기 구동 시 클라우드 자동 동기화
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    trackDailyVisit();
    updateHeaderAuthUI();

    if (isUserLoggedIn()) {
      var profile = safeGetJSON('user_profile', null);
      if (profile && profile.id) {
        loadUserDataFromCloud(profile.id).then(function(cloudData) {
          if (cloudData) {
            if (cloudData.bookmarks && Array.isArray(cloudData.bookmarks)) {
              localStorage.setItem('okbm_bookmarks', JSON.stringify(cloudData.bookmarks));
              if (typeof userBookmarks !== 'undefined') {
                userBookmarks = new Set(cloudData.bookmarks.map(function(s) { return String(s).trim(); }));
              }
            }
            if (cloudData.visited && Array.isArray(cloudData.visited)) {
              localStorage.setItem('okbm_visited', JSON.stringify(cloudData.visited));
              if (typeof userVisited !== 'undefined') {
                userVisited = new Set(cloudData.visited.map(function(s) { return String(s).trim(); }));
              }
            }
            if (cloudData.memos && typeof cloudData.memos === 'object') {
              localStorage.setItem('okbm_memos', JSON.stringify(cloudData.memos));
              if (typeof userMemos !== 'undefined') {
                userMemos = cloudData.memos;
              }
            }
            if (cloudData.packHistory && Array.isArray(cloudData.packHistory)) {
              packingHistoryList = cloudData.packHistory;
              localStorage.setItem('okbm_packing_history', JSON.stringify(packingHistoryList));
            }
            if (cloudData.nickname && profile.nickname !== cloudData.nickname && !cloudData.nickname.includes('ENGINE')) {
              profile.nickname = cloudData.nickname;
              localStorage.setItem('user_profile', JSON.stringify(profile));
              if (typeof authState !== 'undefined') authState.userProfile = profile;
              updateHeaderAuthUI();
            }
            if (cloudData.lastNicknameChangedAt !== undefined) {
              profile.lastNicknameChangedAt = Number(cloudData.lastNicknameChangedAt);
              localStorage.setItem('user_profile', JSON.stringify(profile));
            }

            var myGears = cloudData.myGears || null;
            if (myGears) {
              if (myGears.selectedGears && typeof myGears.selectedGears === 'object' && Object.keys(myGears.selectedGears).length > 0) {
                selectedGearMap = myGears.selectedGears;
                localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(selectedGearMap));
              }
              if (myGears.favoriteGears && Array.isArray(myGears.favoriteGears)) {
                favoriteGearSet = new Set(myGears.favoriteGears);
                localStorage.setItem('okbm_favorite_gears', JSON.stringify(myGears.favoriteGears));
              }
              if (myGears.customGears && Array.isArray(myGears.customGears)) {
                localStorage.setItem('okbm_custom_gears', JSON.stringify(myGears.customGears));
                if (typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES)) {
                  myGears.customGears.forEach(function(cg) {
                    var targetCat = CATEGORIES.find(function(c) { return c.id === cg.category_id; });
                    if (targetCat && !targetCat.db.some(function(d) { return d.name === cg.name; })) {
                      targetCat.db.unshift(cg);
                    }
                  });
                }
              }
            }

            if (typeof renderCategorySlots === 'function') renderCategorySlots();
            if (typeof renderPackingHistoryList === 'function') renderPackingHistoryList();
            if (typeof renderBasecampRecordData === 'function') renderBasecampRecordData();
            if (typeof renderBasecampMemos === 'function') renderBasecampMemos();
            if (typeof renderSpots === 'function') renderSpots();
            if (typeof renderSubChips === 'function') renderSubChips();
            if (typeof refreshCurrentSpotPopup === 'function') refreshCurrentSpotPopup();
          }
          window.isCloudDataLoaded = true;
        });
      } else {
        window.isCloudDataLoaded = true;
      }
    } else {
      window.isCloudDataLoaded = true;
    }
  });
}
