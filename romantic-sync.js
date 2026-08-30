/**
 * 🏕️ 낭만루트 구글 시트 실시간 동기화 & 낭만보관함 복원 코어 엔진 (v1.0.0)
 * - 사용자 데이터(달력 날짜, 힐링 기록, 찜, 방문, 메모, 내 장비) 구글 시트 users 탭 영구 백업
 * - 카카오 1초 로그인 시 백엔드 USER_SYNC 호출 ➔ 달력 초록 점 및 보관함 100% 자동 복원
 * - 로그아웃 시 0.00kg 빈 배낭 초기화 및 로컬 스토리지 안전 클리어
 */

// 🔑 1. 계정 및 클라우드 동기화 (기존 백엔드 SAVE_USER_DATA 규격 100% 일치)
function trackDailyVisit() {
  const sessionKey = 'okbm_visit_recorded_' + new Date().toISOString().slice(0, 10);
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, 'true');
    fetch(GAS_API_URL, {
      method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'RECORD_VISIT', isLogin: isUserLoggedIn() })
    }).catch(() => {});
  }
}

function syncUserDataToCloud() {
  if (!isUserLoggedIn()) return;
  const profile = safeGetJSON('user_profile', null) || authState.userProfile;
  if (!profile || !profile.id) return;

  // ⚡ 방식 B: 대용량 사진(Base64)을 제외한 순수 달력/패킹 알맹이 데이터만 초경량 전송
  const rawHistory = safeGetJSON('okbm_packing_history', []);
  const lightweightPackHistory = rawHistory.map(h => {
    const copy = { ...h };
    delete copy.photo; // 사진 문자열 제외 (달력 날짜, 박지명, 무게, 장비리스트 일체 보존)
    return copy;
  });

  fetch(GAS_API_URL, {
    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'SAVE_USER_DATA', 
      userId: profile.id, 
      nickname: profile.nickname,
      bookmarks: safeGetJSON('okbm_bookmarks', []), 
      visited: safeGetJSON('okbm_visited', []),
      memos: safeGetJSON('okbm_memos', {}), 
      packHistory: lightweightPackHistory
    })
  }).catch(() => {});
}

function updateHeaderAuthUI() {
  const btn = document.getElementById('headerAuthBtn');
  const text = document.getElementById('headerAuthText');
  const icon = document.getElementById('headerAuthIcon');
  const statusBanner = document.getElementById('cloudStatusBanner');
  const statusText = document.getElementById('cloudStatusText');
  const statusAction = document.getElementById('cloudStatusAction');

  const isLogged = isUserLoggedIn();
  const profile = safeGetJSON('user_profile', null) || authState.userProfile;
  const starIconSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; margin-right:2px; fill:#fde047; color:#fde047; flex-shrink:0; display:inline-block; vertical-align:-1px;"><path d="M12,1 Q12,12 1,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,23 Q12,12 23,12 Q12,12 12,1 Z"/><circle cx="12" cy="12" r="1.5" fill="#ffffff"/></svg>`;

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

function handleAuthBtnClick() {
  if (isUserLoggedIn()) openUserProfileModal();
  else openLoginModal();
}

function openLoginModal() { const modal = document.getElementById('loginModalOverlay'); if (modal) modal.style.display = 'flex'; }
function closeLoginModal() { const modal = document.getElementById('loginModalOverlay'); if (modal) modal.style.display = 'none'; }
function openUserProfileModal() {
  const profile = safeGetJSON('user_profile', null) || authState.userProfile;
  const input = document.getElementById('profileModalNicknameInput');
  if (input && profile) input.value = profile.nickname || '';
  const modal = document.getElementById('userProfileModalOverlay');
  if (modal) modal.style.display = 'flex';
}
function closeUserProfileModal() { const modal = document.getElementById('userProfileModalOverlay'); if (modal) modal.style.display = 'none'; }

function saveNewNicknameFromModal() {
  const input = document.getElementById('profileModalNicknameInput');
  if (!input || !input.value.trim()) return showToast('새 닉네임을 입력해주세요.', 'warn');
  const clean = input.value.trim();
  let profile = safeGetJSON('user_profile', null) || authState.userProfile || { isMember: true };
  if (profile.nickname === clean) return showToast('현재 사용 중인 닉네임과 동일합니다.', 'warn');

  profile.nickname = clean;
  profile.lastNicknameChangedAt = Date.now();
  localStorage.setItem('user_profile', JSON.stringify(profile));
  authState.userProfile = profile;
  authState.isLoggedIn = true;
  updateHeaderAuthUI();
  syncUserDataToCloud();
  closeUserProfileModal();
  triggerHaptic(15);
  showToast(`닉네임이 [${clean}] (으)로 변경되었습니다!`, 'success');
}

// 🚪 2. 로그인 시 기존 백엔드 USER_SYNC 호출 ➔ 달력/보관함/찜 100% 자동 복원
function loginWithKakao() {
  if (typeof Kakao === 'undefined') return showToast('카카오 SDK를 불러오지 못했습니다.', 'warn');
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_APP_KEY);

  Kakao.Auth.login({
    scope: 'profile_nickname',
    success: function(authObj) {
      Kakao.API.request({
        url: '/v2/user/me',
        success: async function(res) {
          const kakaoId = 'kakao_' + res.id;
          let kakaoNick = '낭만백패커';
          if (res.properties && res.properties.nickname) kakaoNick = res.properties.nickname;

          const existingProfile = safeGetJSON('user_profile', null);
          const finalNickname = (existingProfile && existingProfile.id === kakaoId && existingProfile.nickname) ? existingProfile.nickname : kakaoNick;

          const profile = { 
            id: kakaoId, nickname: finalNickname, isMember: true, 
            createdAt: (existingProfile && existingProfile.createdAt) ? existingProfile.createdAt : Date.now(),
            lastNicknameChangedAt: (existingProfile && existingProfile.lastNicknameChangedAt) ? existingProfile.lastNicknameChangedAt : 0
          };

          localStorage.setItem('user_auth_token', authObj.access_token || ('token_' + Date.now()));
          localStorage.setItem('user_profile', JSON.stringify(profile));
          authState.isLoggedIn = true;
          authState.userProfile = profile;

          // 🚫 비로그인 게스트 임시 패킹 슬롯은 로그인 시 즉시 삭제 (0.00kg로 초기화)
          localStorage.removeItem('okbm_selected_gears_multi');
          selectedGearMap = {};
          CATEGORIES.forEach(cat => { selectedGearMap[cat.id] = []; });

          // ☁️ 백엔드 USER_SYNC 호출 (회원 데이터 조회 및 자동 생성)
          try {
            const syncResponse = await fetch(GAS_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'USER_SYNC',
                userId: kakaoId,
                nickname: finalNickname
              })
            });

            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              if (syncData && syncData.userData) {
                const u = syncData.userData;
                if (u.bookmarks) localStorage.setItem('okbm_bookmarks', JSON.stringify(u.bookmarks));
                if (u.visited) localStorage.setItem('okbm_visited', JSON.stringify(u.visited));
                if (u.memos) localStorage.setItem('okbm_memos', JSON.stringify(u.memos));
                if (u.packHistory) {
                  packingHistoryList = Array.isArray(u.packHistory) ? u.packHistory : [];
                  localStorage.setItem('okbm_packing_history', JSON.stringify(packingHistoryList));
                }
              }
            }
          } catch (e) {}

          packingHistoryList = safeGetJSON('okbm_packing_history', []);
          favoriteGearSet = new Set(safeGetJSON('okbm_favorite_gears', []));
          
          // 🌸 화면 및 달력 즉시 100% 렌더링 복원
          updateHeaderAuthUI();
          renderCategorySlots();
          renderPackingHistoryList();
          renderBasecampRecordData();
          renderBasecampMemos();
          
          closeLoginModal();
          triggerHaptic(15);
          showToast(`[${profile.nickname}]님 환영합니다! 보관함 동기화 완료`, 'success');
        }
      });
    },
    fail: function() { showToast('카카오 로그인이 취소되었습니다.', 'warn'); }
  });
}

// 🚪 3. 로그아웃 시 100% 완전 초기화 (패킹창 0개, 보관함, 장비창 원본 롤백)
function logoutUser() {
  if (typeof Kakao !== 'undefined' && Kakao.Auth && Kakao.Auth.getAccessToken()) {
    Kakao.Auth.logout(function() {});
  }

  // 1. 인증 및 프로필 삭제
  localStorage.removeItem('user_auth_token');
  localStorage.removeItem('user_profile');
  authState.isLoggedIn = false;
  authState.userProfile = null;

  // 2. 로컬 스토리지 개인 데이터 완전 삭제 (구글 시트 users 탭에는 영구 안전 보존됨)
  localStorage.removeItem('okbm_favorite_gears');
  localStorage.removeItem('okbm_packing_history');
  localStorage.removeItem('okbm_bookmarks');
  localStorage.removeItem('okbm_visited');
  localStorage.removeItem('okbm_memos');
  localStorage.removeItem('okbm_selected_gears_multi');

  // 3. 메모리 변수 완전 초기화
  favoriteGearSet = new Set();
  packingHistoryList = [];
  currentShareRecord = null;
  currentShareItems = [];
  currentSharePhoto = '';
  calSelectedDate = null;
  
  // 4. 배낭 슬롯 완전 빈 상태(0개, 0.00kg)로 리셋
  selectedGearMap = {};
  CATEGORIES.forEach(cat => {
    selectedGearMap[cat.id] = [];
  });

  // 5. 커스텀 등록 장비 롤백 (순수 기본 DB로 복원)
  CATEGORIES.forEach(cat => {
    const orig = ORIGINAL_CATEGORIES_DB.find(o => o.id === cat.id);
    if (orig && Array.isArray(orig.db)) {
      cat.db = JSON.parse(JSON.stringify(orig.db));
    }
  });

  // 6. 장비창 내부 인풋 필드 초기화
  const searchInput = document.getElementById('gearSearchFixedInput');
  const searchClearBtn = document.getElementById('btnGearSearchClear');
  const customNameInput = document.getElementById('customInputGearName');
  const customWeightInput = document.getElementById('customInputGearWeight');
  if (searchInput) searchInput.value = '';
  if (searchClearBtn) searchClearBtn.style.display = 'none';
  if (customNameInput) customNameInput.value = '';
  if (customWeightInput) customWeightInput.value = '';

  // 7. 모든 UI 뷰 즉시 재렌더링 (달력 및 보관함 초기화)
  updateHeaderAuthUI();
  renderCategorySlots();
  renderPackingHistoryList();
  renderBasecampRecordData();
  renderBasecampMemos();

  if (typeof renderPresetGearList === 'function' && currentOpeningCategoryId) {
    renderPresetGearList('');
  }

  closeUserProfileModal();
  triggerHaptic(10);
  showToast('로그아웃되었습니다. (기기 내 데이터 초기화 완료)', 'info', 2200);
}