
/**
 * 🎒 낭만루트 낭만플랜(Plan) 전담 코어 엔진 (romantic-plan.js)
 * 1. [달력 첫 화면]: 낭만보관함 연동 달력(완료 ★금색 / 계획 ⚑초록색) + 날짜별 출발 계획 메모장 + 낭만플랜세우기 카드
 * 2. [실전 체크리스트]: 음식/소모품 즉시 추가 입력창 + 최하단 고정 [✓ 패킹 체크 완료] 독
 * 3. [10대 슬롯 배낭계산기]: 2x5 그리드 + 28px 라인아트 + [20종 템플릿 카드 생성 ➔] 연동
 * 4. [가고 싶은 찜박지]: 찜 목록 열람 & 원클릭 출발지 지정
 * 5. [내 장비관리]: 즐겨찾기(⭐) 관리 + 구매일/사용일/메모 + 원클릭 패킹 세트(프리셋) 관리 + 직접 등록
 * 6. [제스처 듀얼 하단독]: 아래/옆 스와이프 시 기본 5대 독 전환
 */

(function() {
  // 🎨 [모던 매트블랙 & 플래티넘 실버 미니멀 스타일시트]
  if (!document.getElementById('romantic-plan-core-style')) {
    var style = document.createElement('style');
    style.id = 'romantic-plan-core-style';
    style.innerHTML = `
      .weight-dashboard-strip {
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 6px !important;
        height: 88px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      .weight-pod-box {
        background: rgba(255, 255, 255, 0.025) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 9px !important;
        padding: 7px 9px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .weight-val-big {
        font-family: 'Space Grotesk', 'JetBrains Mono', sans-serif !important;
        font-size: 1.60rem !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        letter-spacing: -0.03em !important;
        transition: color 0.2s ease !important;
      }
      .weight-bpl-badge {
        font-size: 0.60rem !important;
        font-weight: 800 !important;
        padding: 1px 5px !important;
        border-radius: 3px !important;
        display: inline-flex !important;
        align-items: center !important;
        border: 1px solid transparent !important;
        white-space: nowrap !important;
      }
      .weight-gauge-bg {
        width: 100% !important;
        height: 3px !important;
        background: rgba(255, 255, 255, 0.06) !important;
        border-radius: 2px !important;
        overflow: hidden !important;
      }
      .weight-gauge-fill {
        height: 100% !important;
        width: 0% !important;
        border-radius: 2px !important;
        transition: width 0.25s ease, background-color 0.2s ease !important;
      }
      .gear-popover-sheet {
        display: none;
        position: absolute !important;
        top: 138px !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: rgba(11, 15, 25, 0.98) !important;
        border-top: 1.5px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 14px 14px 0 0 !important;
        z-index: 600 !important;
        flex-direction: column !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        box-shadow: 0 -12px 35px rgba(0, 0, 0, 0.95) !important;
      }
      .calc-slide-sheet {
        position: fixed !important;
        left: 50% !important;
        transform: translate(-50%, 100%) !important;
        bottom: 0 !important;
        width: 100% !important;
        max-width: 480px !important;
        background: #0d121d !important;
        border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;
        border-radius: 16px 16px 0 0 !important;
        box-shadow: 0 -10px 35px rgba(0, 0, 0, 0.9) !important;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        z-index: 1000020 !important;
        display: none;
        flex-direction: column !important;
        max-height: 72% !important;
        box-sizing: border-box !important;
      }
      .calc-slide-sheet.active {
        transform: translate(-50%, 0%) !important;
        display: flex !important;
      }

      /* 🎒 [체크리스트 & 장비 선반 최적화 클래스군] */
      .checklist-item-row {
        border-radius: 9px !important;
        padding: 10px 12px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        transition: all 0.12s ease !important;
        flex-shrink: 0 !important;
        min-height: 44px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
        box-sizing: border-box !important;
      }

      .checklist-checkbox-box {
        width: 20px !important;
        height: 20px !important;
        border-radius: 6px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #0f172a !important;
        font-size: 12.5px !important;
        font-weight: 900 !important;
        flex-shrink: 0 !important;
        transition: all 0.12s ease !important;
      }

      .gear-shelf-item-row {
        border-radius: 8px !important;
        padding: 7px 10px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
        transition: all 0.15s ease !important;
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

  // 🎨 [10대 슬롯 28px 라인아트 벡터] - 아날로그 밤숲 감성: 눈부심 제로 은은한 반투명 미스트 기어
  var PLAN_SLOT_VECTORS = {
    shelter: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 38C6 20 14 8 24 8s18 12 18 30H6z"/><path d="M14 38c0-12 4-20 10-20s10 8 10 20M6 38h36"/></svg>',
    sleep: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="16" height="28" rx="8"/><line x1="6" y1="18" x2="22" y2="18"/><line x1="6" y1="26" x2="22" y2="26"/><path d="M26 14c4-3 10-3 14 0v24a6 6 0 0 1-12 0V14"/></svg>',
    pack: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="32" height="9" rx="4.5" stroke="rgba(255,255,255,0.06)"/><rect x="12" y="15" width="24" height="27" rx="3"/><path d="M6 6l6 36M42 6l-6 36M12 25h24"/></svg>',
    food: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4c-6 9-12 17-12 25a12 12 0 0 0 24 0c0-8-6-16-12-25z"/><path d="M24 16v13l8 4"/></svg>',
    kitchen: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 18h28v18a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V18z"/><path d="M36 24h5a3 3 0 0 1 0 6h-5M14 8c0 3-3 5-3 8M22 6c0 4-3 6-3 10M30 8c0 3-3 5-3 8"/></svg>',
    wear: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M34 8l-10-4-10 4L2 26l7 3 3-11v24h24V18l3 11 7-3-12-18z"/><path d="M18 14h12l-6 8-6-8z"/></svg>',
    electronics: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="26 3 10 27 24 27 22 45 38 21 24 21 26 3"/></svg>',
    camp: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14h28v14a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V14z"/><path d="M14 33L8 45M34 33l6 12M15 33l18 12M33 33L15 45"/></svg>',
    slot9: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="24" cy="36" rx="14" ry="5"/><path d="M16 36V22h16v14M24 22v-8M20 14l4-8 4 8"/></svg>',
    slot10: '<svg viewBox="0 0 48 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="16" width="36" height="26" rx="4"/><path d="M24 16v26M6 26h36M18 16c0-6 6-10 6-10s6 4 6 10"/></svg>'
  };

 var DEFAULT_CATEGORIES = [
    {
      id: 'shelter',
      title: '텐트 · 타프',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#34d399; stroke-width:2.2;"><path d="M12 2L2 20h20L12 2z"/><path d="M12 2v18M7 20l5-9 5 9"/></svg>',
      db: []
    },
    {
      id: 'sleep',
      title: '침낭 · 매트',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#2dd4bf; stroke-width:2.2;"><path d="M2 17h20M2 13h20M4 9h16a2 2 0 0 1 2 2v6H2v-6a2 2 0 0 1 2-2z"/></svg>',
      db: []
    },
    {
      id: 'pack',
      title: '배낭',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#fb923c; stroke-width:2.2;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>',
      db: []
    },
    {
      id: 'food',
      title: '음식',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#f97316; stroke-width:2.2;"><path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z"/><path d="M12 6v6l4 2"/></svg>',
      db: []
    },
    {
      id: 'kitchen',
      title: '취사',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#f97316; stroke-width:2.2;"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
      db: []
    },
    {
      id: 'wear',
      title: '의류',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#c084fc; stroke-width:2.2;"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
      db: []
    },
    {
      id: 'electronics',
      title: '기기 · 소품',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#facc15; stroke-width:2.2;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      db: []
    },
    {
      id: 'camp',
      title: '테이블 · 체어',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#38bdf8; stroke-width:2.2;"><rect x="4" y="10" width="16" height="4" rx="1"/><path d="M6 14v6M18 14v6M8 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/></svg>',
      db: []
    }
  ];

  window.CATEGORIES = window.CATEGORIES || DEFAULT_CATEGORIES;
  window.selectedGearMap = window.selectedGearMap || safeGetJSON('okbm_selected_gears_multi', {});
  window.favoriteGearSet = window.favoriteGearSet || new Set(safeGetJSON('okbm_favorite_gears', []));
  window.packedCheckSet = window.packedCheckSet || new Set(safeGetJSON('okbm_packed_checks', []));
  window.currentOpeningCategoryId = null;

  // 🌟 기본 진입 화면: 달력 & 메모장 우선 모드
  window.activePlanSubMode = 'calendar';
  window.__planDockDeckMode = 'tools';

/// 🎨 [낭만루트 전용 고정밀 SVG 라인아트 벡터 팩 (이모지 0% 전면 교체)]
  var PLAN_SVG = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px; flex-shrink:0; vertical-align:-1px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0; vertical-align:-1px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    backpack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px; flex-shrink:0;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    starFilled: '<svg viewBox="0 0 24 24" fill="#fde047" stroke="#fde047" stroke-width="1" style="width:12px; height:12px; flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    starOutline: '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" style="width:12px; height:12px; flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    cardCamera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px; flex-shrink:0;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    presetStack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px; flex-shrink:0;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px; height:13px; flex-shrink:0;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
  };

 window.__activeCalcCategoryTab = window.__activeCalcCategoryTab || 'fav';

  window.setCalcCategoryTab = function(catId) {
    window.__activeCalcCategoryTab = catId;
    triggerHaptic(8);
    window.renderPlanCategorySlots();
  };
 // 🎒 [내 장비 세트(프리셋) 슬라이드 시트 완전 연동 엔진]
  window.openQuickPresetPicker = function() {
    triggerHaptic(10);
    var sheet = document.getElementById('calcPresetSlideSheet');
    var backdrop = document.getElementById('calcPresetBackdrop');
    var listContainer = document.getElementById('calcPresetSheetList');
    if (!sheet) return;

    var presets = safeGetJSON('okbm_gear_presets', []);
    if (listContainer) {
      if (presets.length === 0) {
        listContainer.innerHTML = `
          <div style="text-align:center; padding:35px 0; color:#64748b; font-size:0.75rem; line-height:1.5;">
            저장된 내 장비 세트가 없습니다.<br>
            현재 배낭에 담긴 장비들을 새 세트로 저장해보세요!
          </div>
        `;
      } else {
        listContainer.innerHTML = presets.map(function(p) {
          return `
            <div onclick="window.loadGearPreset('${p.id}'); window.closeQuickPresetPicker();" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.09); border-radius:8px; padding:9px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; flex-shrink:0;">
              <div style="min-width:0; flex:1; padding-right:8px;">
                <div style="font-size:0.82rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(p.name)}
                </div>
                <div style="font-size:0.62rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; margin-top:2px;">
                  장비 ${p.itemCount || 0}개 · ${p.totalKg || '0.00'}kg
                </div>
              </div>
              <span style="font-size:0.68rem; font-weight:800; color:#000000; background:#e2e8f0; padding:4px 9px; border-radius:5px; flex-shrink:0;">
                장착 ➔
              </span>
            </div>
          `;
        }).join('');
      }
    }

    if (backdrop) backdrop.style.display = 'block';
    sheet.style.display = 'flex';
    setTimeout(function() { sheet.classList.add('active'); }, 10);
  };

  window.closeQuickPresetPicker = function() {
    var sheet = document.getElementById('calcPresetSlideSheet');
    var backdrop = document.getElementById('calcPresetBackdrop');
    if (sheet) {
      sheet.classList.remove('active');
      setTimeout(function() { sheet.style.display = 'none'; }, 250);
    }
    if (backdrop) backdrop.style.display = 'none';
  };

  // 🔍 [실시간 검색 필터링 핸들러]
  window.handleCalcShelfSearch = function(query) {
    window.__calcShelfSearchQuery = (query || '').trim().toLowerCase();
    var clearBtn = document.getElementById('btnCalcSearchClear');
    if (clearBtn) clearBtn.style.display = window.__calcShelfSearchQuery ? 'flex' : 'none';
    window.renderPlanCategorySlots();
  };

  window.clearCalcShelfSearch = function() {
    var input = document.getElementById('calcShelfSearchInput');
    if (input) { input.value = ''; input.focus(); }
    window.handleCalcShelfSearch('');
  };

 // 🗓️ [최상단 인라인 드롭다운 전담 엔진 (과거 일자 전면 배제 & 다가오는 일정 전담)]
  window.togglePlanTripDateInlineDropdown = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(8);
    var dropdown = document.getElementById('calcTripDateDropdown');
    if (!dropdown) return;

    var isOpen = (dropdown.style.display === 'flex');
    if (isOpen) {
      dropdown.style.display = 'none';
      return;
    }

    var planMemosObj = safeGetJSON('okbm_plan_memos', {}) || {};
    var planSpotsObj = safeGetJSON('okbm_plan_spots', {}) || {};
    var historyList = safeGetJSON('okbm_packing_history', []) || [];
    var now = new Date();
    var todayKey = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    var todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var tripList = [];
    var seenKeyMap = {};

    function cleanSpotName(str) {
      if (!str) return '';
      return String(str)
        .replace(/^(?:📍|⚲|\[목적지\]|목적지:\s*|장소:\s*)/, '')
        .split('(')[0]
        .trim();
    }

    function parseDateTime(dStr) {
      var p = String(dStr).match(/\d+/g);
      if (p && p.length >= 3) {
        return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)).getTime();
      }
      return 0;
    }

    // 1. okbm_plan_spots에서 목적지 수집 (오늘 및 미래 일정만 수집)
    Object.keys(planSpotsObj).forEach(function(k) {
      var targetTime = parseDateTime(k);
      if (targetTime >= todayMidnight) {
        var rawSpots = planSpotsObj[k];
        var spotsArr = Array.isArray(rawSpots) ? rawSpots : (rawSpots && rawSpots.name ? [rawSpots] : []);
        spotsArr.forEach(function(sp) {
          if (sp && sp.name) {
            var pure = cleanSpotName(sp.name);
            var hash = k + '__' + pure;
            if (pure && !seenKeyMap[hash]) {
              seenKeyMap[hash] = true;
              var dispElev = sp.elevation ? (' (' + sp.elevation + ')') : '';
              tripList.push({
                dateKey: k,
                spot: pure + dispElev,
                rawName: pure,
                elevation: sp.elevation || '',
                time: targetTime
              });
            }
          }
        });
      }
    });

    // 2. 메모장에만 존재하는 일정 보강 (오늘 및 미래 일정만 수집)
    Object.keys(planMemosObj).forEach(function(k) {
      var memo = String(planMemosObj[k] || '').trim();
      if (memo) {
        var targetTime = parseDateTime(k);
        if (targetTime >= todayMidnight) {
          var lines = memo.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
          lines.forEach(function(line) {
            var pure = cleanSpotName(line);
            var hash = k + '__' + pure;
            if (pure && pure.length >= 2 && !seenKeyMap[hash]) {
              seenKeyMap[hash] = true;
              tripList.push({
                dateKey: k,
                spot: line.slice(0, 24),
                rawName: pure,
                elevation: '',
                time: targetTime
              });
            }
          });
        }
      }
    });

    // 3. 방문 기록 보강 (오늘 및 미래 일정만 수집)
    historyList.forEach(function(h) {
      if (h && h.date) {
        var targetTime = parseDateTime(h.date);
        if (targetTime >= todayMidnight) {
          var pure = cleanSpotName(h.spot);
          var hash = h.date + '__' + (pure || '기록');
          if (!seenKeyMap[hash]) {
            seenKeyMap[hash] = true;
            tripList.push({
              dateKey: h.date,
              spot: h.spot || '방문 일정',
              rawName: pure || h.spot || '방문 일정',
              elevation: h.elevation || '',
              time: targetTime
            });
          }
        }
      }
    });

    tripList.sort(function(a, b) { return a.time - b.time; });

    if (tripList.length === 0) {
      tripList.push({ dateKey: todayKey, spot: '새 방문 일정', rawName: '새 방문 일정', elevation: '', time: todayMidnight });
    }

    dropdown.innerHTML = `
      <div style="font-size:0.72rem; color:#94a3b8; font-weight:800; padding:2px 4px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
        <span>다가오는 방문 계획 (${tripList.length}건)</span>
        <button type="button" onclick="document.getElementById('calcTripDateDropdown').style.display='none';" style="background:none; border:none; color:#94a3b8; font-size:0.9rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; max-height:170px; overflow-y:auto; overscroll-behavior:contain; margin-top:2px;">
        ${tripList.map(function(t) {
          var isCur = (t.dateKey === window.activeSelectedDateKey && (window.currentLuckySpot && window.currentLuckySpot.name === t.rawName));
          return `
            <div data-date="${escapeHtml(t.dateKey)}" data-spot="${escapeHtml(t.rawName)}" data-elevation="${escapeHtml(t.elevation)}" onclick="window.selectInlineTripDate(this.dataset.date, this.dataset.spot, this.dataset.elevation);" style="padding:7px 10px; border-radius:6px; background:${isCur ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isCur ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)'}; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <span style="font-size:0.78rem; font-family:'Space Grotesk', sans-serif; font-weight:800; color:${isCur ? '#38bdf8' : '#cbd5e1'};">${escapeHtml(t.dateKey)}</span>
              <span style="font-size:0.74rem; font-weight:700; color:${isCur ? '#ffffff' : '#94a3b8'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${escapeHtml(t.spot)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    dropdown.style.display = 'flex';
  };

  window.selectInlineTripDate = function(dateKey, spot, elev) {
    window.activeSelectedDateKey = dateKey;
    if (spot && spot !== '일정 메모' && spot !== '방문 일정' && spot !== '출정 기록') {
      window.currentLuckySpot = { name: spot, elevation: elev || '' };
    }
    var dropdown = document.getElementById('calcTripDateDropdown');
    if (dropdown) dropdown.style.display = 'none';
    triggerHaptic(10);
    window.renderPlanStage();
  };

  window.renderPlanCategorySlots = function() {
    var shelfContainer = document.getElementById('calcGearShelfList');
    var tabsContainer = document.getElementById('calcCategoryTabsBar');

    var gearMap = window.selectedGearMap || {};
    var allPackedItems = [];
    var totalGrams = 0;

    (window.CATEGORIES || []).forEach(function(cat) {
      (gearMap[cat.id] || []).forEach(function(it, idx) {
        if (it && (it.name || it.itemName)) {
          var w = Number(it.weight || 0);
          totalGrams += w;
          allPackedItems.push({
            catId: cat.id,
            idx: idx,
            name: it.name || it.itemName,
            weight: w
          });
        }
      });
    });

var totalKg = (totalGrams / 1000).toFixed(2);
    var kgEl = document.getElementById('planTotalWeightKgText');
    var gramsEl = document.getElementById('planTotalWeightGramsText');
    var gaugeEl = document.getElementById('planWeightGaugeFill');
    var bplBadge = document.getElementById('planBplStatusBadge');
    var recentGearBox = document.getElementById('planRecentGearBox');

   var CATEGORY_PALETTE = {
      fav:         { color: '#fde047', label: '⭐ 내장비', bg: 'rgba(253,224,71,0.08)',  border: 'rgba(253,224,71,0.25)' },
      all:         { color: '#e2e8f0', label: '전체',     bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.22)' },
      shelter:     { color: '#10b981', label: '텐트·타프', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
      sleep:       { color: '#14b8a6', label: '침낭·매트', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.25)' },
      pack:        { color: '#f43f5e', label: '배낭',     bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.25)' },
      food:        { color: '#f97316', label: '음식',     bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)' },
      kitchen:     { color: '#84cc16', label: '취사',     bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.25)' },
      wear:        { color: '#a855f7', label: '의류',     bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.25)' },
      electronics: { color: '#eab308', label: '기기·소품', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)' },
      camp:        { color: '#06b6d4', label: '테이블·체어',bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.25)' }
    };

    var weightTheme = {
      color: '#2dd4bf',
      badgeBg: 'rgba(45, 212, 191, 0.12)',
      badgeBorder: 'rgba(45, 212, 191, 0.28)',
      text: 'UL 초경량 (≤6kg)'
    };

    if (totalGrams > 14000) {
      weightTheme = {
        color: '#f87171',
        badgeBg: 'rgba(248, 113, 113, 0.12)',
        badgeBorder: 'rgba(248, 113, 113, 0.28)',
        text: '헤비 (14kg+)'
      };
    } else if (totalGrams > 6000) {
      weightTheme = {
        color: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeBorder: 'rgba(245, 158, 11, 0.28)',
        text: '스탠다드 (6~14kg)'
      };
    }

    if (kgEl) {
      kgEl.innerText = totalKg + ' kg';
      kgEl.style.setProperty('color', weightTheme.color, 'important');
    }
    if (gramsEl) {
      gramsEl.innerText = totalGrams.toLocaleString() + ' g';
    }
    if (bplBadge) {
      bplBadge.innerText = weightTheme.text;
      bplBadge.style.setProperty('color', weightTheme.color, 'important');
      bplBadge.style.setProperty('background', weightTheme.badgeBg, 'important');
      bplBadge.style.setProperty('border-color', weightTheme.badgeBorder, 'important');
    }
    if (gaugeEl) {
      gaugeEl.style.setProperty('width', Math.min(100, Math.round((totalGrams / 14000) * 100)) + '%', 'important');
      gaugeEl.style.setProperty('background-color', weightTheme.color, 'important');
    }

    var gearsPillsBox = document.getElementById('planGearsPillsBox');
    var gearsBottomBox = document.getElementById('planGearsBottomBox');

   if (recentGearBox) {
      if (allPackedItems.length === 0) {
        recentGearBox.innerHTML = `
          <div style="font-size:0.70rem; font-weight:800; color:#94a3b8;">담긴 장비</div>
          <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; flex:1; color:#64748b; font-size:0.68rem; line-height:1.3;">
            <span>배낭 비어있음</span>
            <span style="font-size:0.58rem; color:#475569;">장비를 담아보세요</span>
          </div>
        `;
      } else {
        var lastItem = allPackedItems[allPackedItems.length - 1];
        var lastPal = CATEGORY_PALETTE[lastItem.catId] || { color: '#94a3b8' };
        recentGearBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.70rem; font-weight:800; color:#cbd5e1;">담긴 장비</span>
            <span style="font-size:0.62rem; font-weight:900; color:#ffffff; background:rgba(255,255,255,0.12); padding:1px 5px; border-radius:4px; font-family:'JetBrains Mono', monospace;">${allPackedItems.length}개 ▾</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
            <div style="font-size:0.78rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${escapeHtml(lastItem.name)}
            </div>
            <div style="display:flex; justify-content:flex-end; align-items:baseline; font-family:'JetBrains Mono', monospace;">
              <span style="font-size:0.72rem; font-weight:900; color:${lastPal.color};">${lastItem.weight}g</span>
            </div>
          </div>
        `;
      }
    }

    var popoverListEl = document.getElementById('calcPackedItemsListContainer');
    if (popoverListEl) {
      popoverListEl.innerHTML = allPackedItems.length === 0 ? '<div style="text-align:center; padding:35px 0; color:#64748b; font-size:0.75rem;">담긴 장비가 없습니다.</div>' : allPackedItems.map(function(it) {
        var pal = CATEGORY_PALETTE[it.catId] || { color: '#94a3b8' };
        return `
          <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-left:3.5px solid ${pal.color}; border-radius:7px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="flex:1; min-width:0; padding-right:8px;">
              <div style="font-size:0.80rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(it.name)}</div>
              <div style="font-size:0.60rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; margin-top:1px;">${(it.weight / 1000).toFixed(2)}kg (${it.weight}g)</div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
              <button type="button" data-cat="${escapeHtml(it.catId)}" data-gear="${escapeHtml(it.name)}" onclick="window.currentOpeningCategoryId=this.dataset.cat; window.decrementGearCount(this.dataset.gear);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.72rem; font-weight:900; width:26px; height:26px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                −
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    if (tabsContainer) {
      var activeTab = window.__activeCalcCategoryTab;
      var catList = [
{ id: 'fav', title: '내장비', isFav: true },
{ id: 'all', title: '전체' },
{ id: 'shelter', title: '텐트·타프' },
{ id: 'sleep', title: '침낭·매트' },
{ id: 'pack', title: '배낭' },
{ id: 'food', title: '음식' },
{ id: 'kitchen', title: '취사' },
{ id: 'wear', title: '의류' },
{ id: 'electronics', title: '기기·소품' },
{ id: 'camp', title: '테이블·체어' }
];

   tabsContainer.innerHTML = catList.map(function(c) {
        var isActive = (c.id === activeTab);
        var tTheme = CATEGORY_PALETTE[c.id] || { color: '#cbd5e1', border: 'rgba(255,255,255,0.12)' };
        var btnBg = isActive ? tTheme.bg : 'rgba(255,255,255,0.03)';
        var btnBorder = isActive ? tTheme.border : 'rgba(255,255,255,0.07)';
        var btnColor = tTheme.color;
        var starIconHtml = c.isFav ? `${PLAN_SVG.starFilled}&nbsp;` : '';

        return `
          <button type="button" onclick="window.setCalcCategoryTab('${c.id}')" style="flex:0 0 76px !important; width:76px !important; min-width:76px !important; max-width:76px !important; height:30px !important; background:${btnBg}; border:1px solid ${btnBorder}; color:${btnColor}; font-size:0.67rem; font-weight:${isActive ? '900' : '700'}; padding:0 2px; border-radius:6px; white-space:nowrap; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; box-sizing:border-box; letter-spacing:-0.02em; transition:all 0.15s ease;">
            ${starIconHtml}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.title}</span>
          </button>
        `;
      }).join('');
    }

   // 2. 90% 시원한 풀 장비 선반 렌더링 (검색 & 즐겨찾기 즉시 토글 연동)
    if (shelfContainer) {
      var curTab = window.__activeCalcCategoryTab;
      var cleanQ = window.__calcShelfSearchQuery || '';
      var pool = [];

      var customGears = safeGetJSON('okbm_custom_gears', []) || [];
      var masterMap = safeGetJSON('okbm_master_gears_cache', {}) || {};
      var allSource = customGears.map(function(cg) {
        return Object.assign({}, cg, { category_id: cg.category_id || cg.categoryId || 'shelter', isCustom: true });
      });

      Object.keys(masterMap).forEach(function(k) {
        (masterMap[k] || []).forEach(function(g) {
          if (!allSource.some(function(item) { return item.name === g.name; })) {
            allSource.push(Object.assign({}, g, { category_id: k, isCustom: false }));
          }
        });
      });

      var currentFavSet = new Set(safeGetJSON('okbm_favorite_gears', []));
      window.favoriteGearSet = currentFavSet;

      if (curTab === 'all') {
        pool = allSource;
      } else if (curTab === 'fav') {
        var favArr = Array.from(currentFavSet);
        pool = favArr.map(function(fn) {
          var found = allSource.find(function(g) { return g.name === fn; });
          return found || { id: 'fav_' + fn, name: fn, weight: 0, category_id: 'shelter', brand: '내 장비', isCustom: true };
        });
      } else {
        pool = allSource.filter(function(g) { return (g.category_id || 'shelter') === curTab; });
      }

      var filtered = pool.filter(function(g) {
        if (!g || !g.name) return false;
        if (!cleanQ) return true;
        var s = (String(g.name) + ' ' + String(g.brand || '') + ' ' + String(g.specs || '')).toLowerCase();
        return s.includes(cleanQ);
      });

      filtered.sort(function(a, b) {
        var aCat = a.category_id || 'shelter';
        var bCat = b.category_id || 'shelter';
        var aCount = (gearMap[aCat] || []).filter(function(it) { return it.name === a.name; }).length;
        var bCount = (gearMap[bCat] || []).filter(function(it) { return it.name === b.name; }).length;
        if (aCount !== bCount) return bCount - aCount;

        var aCustom = a.isCustom ? 1 : 0;
        var bCustom = b.isCustom ? 1 : 0;
        if (aCustom !== bCustom) return bCustom - aCustom;

        var aTime = a.id && String(a.id).startsWith('custom_') ? parseInt(String(a.id).split('_')[1], 10) : 0;
        var bTime = b.id && String(b.id).startsWith('custom_') ? parseInt(String(b.id).split('_')[1], 10) : 0;
        if (aTime !== bTime) return bTime - aTime;

        return a.name.localeCompare(b.name, 'ko');
      });

      if (filtered.length === 0) {
        shelfContainer.innerHTML = `<div style="text-align:center; padding:60px 0; color:#64748b; font-size:0.75rem;">일치하는 장비가 없습니다.<br>상단 검색어를 변경하거나 직접 등록해보세요.</div>`;
      } else {
      shelfContainer.innerHTML = filtered.map(function(g) {
          var targetCatId = g.category_id || 'shelter';
          var currentCatItems = gearMap[targetCatId] || [];
          var count = currentCatItems.filter(function(it) { return it.name === g.name; }).length;
          var isAdded = count > 0;
          var isFav = window.favoriteGearSet && window.favoriteGearSet.has(g.name);
          var pal = CATEGORY_PALETTE[targetCatId] || { color: '#94a3b8', border: 'rgba(255,255,255,0.12)' };
          var safeGearName = escapeHtml(g.name);

          var cardBorder = isAdded ? `border:1px solid ${pal.border}; border-left:2px solid ${pal.color} !important;` : 'border:1px solid rgba(255,255,255,0.08); border-left:2px solid transparent !important;';
          var cardBg = isAdded ? 'background:rgba(255,255,255,0.055);' : 'background:rgba(255,255,255,0.02);';

          var deleteBtnHtml = g.isCustom ? ` · <button type="button" data-gear="${safeGearName}" onclick="event.stopPropagation(); window.deleteCustomGearCompletely(this.dataset.gear);" style="background:none; border:none; color:#fda4af; font-size:0.58rem; font-weight:700; cursor:pointer; padding:0; text-decoration:underline;">삭제</button>` : '';

          return `
            <div class="gear-shelf-item-row" style="${cardBg} ${cardBorder}">
              <div style="min-width:0; flex:1; padding-right:8px; display:flex; align-items:center; gap:6px;">
                <button type="button" data-gear="${safeGearName}" onclick="window.toggleFavoriteGear(this.dataset.gear, event);" style="background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center;">
                  ${isFav ? PLAN_SVG.starFilled : PLAN_SVG.starOutline}
                </button>
                <div style="min-width:0; flex:1;">
                  <div style="font-size:0.80rem; font-weight:800; color:${isAdded ? '#ffffff' : '#e2e8f0'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${safeGearName}
                  </div>
                  <div style="font-size:0.58rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; margin-top:1px;">
                    <span style="color:${pal.color}; font-weight:700;">${escapeHtml(pal.label || '')}</span> · ${escapeHtml(g.brand || '')}${deleteBtnHtml} · ${(Number(g.weight || 0) / 1000).toFixed(2)}kg (${g.weight || 0}g)
                  </div>
                </div>
              </div>

              <div style="flex-shrink:0;">
                ${isAdded ? `
                  <div style="display:flex; align-items:center; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:14px; padding:1px 4px; gap:4px; height:24px;">
                    <button type="button" data-cat="${escapeHtml(targetCatId)}" data-gear="${safeGearName}" onclick="window.currentOpeningCategoryId=this.dataset.cat; window.decrementGearCount(this.dataset.gear);" style="background:none; border:none; color:#ffffff; font-size:0.85rem; font-weight:900; cursor:pointer; width:16px;">−</button>
                    <span style="font-size:0.72rem; font-weight:900; color:#ffffff; font-family:'JetBrains Mono', monospace; min-width:12px; text-align:center;">${count}</span>
                    <button type="button" data-cat="${escapeHtml(targetCatId)}" data-gear="${safeGearName}" data-weight="${g.weight || 0}" onclick="window.currentOpeningCategoryId=this.dataset.cat; window.addGearToCategory(this.dataset.gear, Number(this.dataset.weight));" style="background:none; border:none; color:#ffffff; font-size:0.85rem; font-weight:900; cursor:pointer; width:16px;">+</button>
                  </div>
                ` : `
                  <button type="button" data-cat="${escapeHtml(targetCatId)}" data-gear="${safeGearName}" data-weight="${g.weight || 0}" onclick="window.currentOpeningCategoryId=this.dataset.cat; window.addGearToCategory(this.dataset.gear, Number(this.dataset.weight));" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.16); color:#ffffff; font-size:0.66rem; font-weight:800; padding:3px 9px; border-radius:6px; cursor:pointer;">
                    + 담기
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  };

  window.removeGearFromPlanSlot = function(categoryId, itemIndex) {
    if (window.selectedGearMap && window.selectedGearMap[categoryId]) {
      window.selectedGearMap[categoryId].splice(itemIndex, 1);
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
      } else {
        localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
        if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
      }
      window.renderPlanCategorySlots();
      triggerHaptic(10);
    }
  };

 function ensureGearPresetModalDOM() {
    var modal = document.getElementById('gearPresetModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'gearPresetModal';
    modal.className = 'custom-modal-overlay';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:#07090e; z-index:1000010 !important; justify-content:center; align-items:stretch; padding:0;';
    modal.onclick = function(e) { if (e.target === modal) window.closeGearPresetModal(); };

    modal.innerHTML = `
      <div style="width:100%; max-width:480px; margin:0 auto; height:100%; height:calc(var(--vh, 1vh) * 100); display:flex; flex-direction:column; padding:calc(12px + env(safe-area-inset-top, 0px)) 14px calc(64px + env(safe-area-inset-bottom, 0px)) 14px; box-sizing:border-box;">
        <div style="flex-shrink:0; display:flex; flex-direction:column; gap:6px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" onclick="window.closeGearPresetModal()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
              <span class="icon-svg" style="width:16px; height:16px; color:#38bdf8; display:flex; align-items:center; justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:16px; height:16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </span>
              <span style="font-weight:900; font-size:1.02rem; color:#f8fafc;" id="presetModalCategoryTitle">장비 선택</span>
            </div>
            <button type="button" onclick="window.closeGearPresetModal()" style="background:none; border:none; color:#64748b; font-size:1.1rem; cursor:pointer; padding:2px 6px;">✕</button>
          </div>

          <div style="position:relative; width:100%; display:flex; align-items:center;">
            <input type="text" id="gearSearchFixedInput" class="modal-input" placeholder="🔍 브랜드, 장비명,검색..." oninput="window.handleGearSearchInput(this.value)" style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.035); color:#ffffff; font-size:0.85rem; padding:0 32px 0 12px; height:42px; border-radius:8px; width:100%; box-sizing:border-box; outline:none;" />
            <button type="button" id="btnGearSearchClear" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.15); border:none; color:#cbd5e1; width:17px; height:17px; border-radius:50%; font-size:0.6rem; font-weight:900; cursor:pointer; align-items:center; justify-content:center; padding:0;" onclick="window.clearGearSearchInput()">✕</button>
          </div>
        </div>

        <div class="gear-db-list" id="presetGearDbList" style="flex:1; overflow-y:auto; margin-top:8px; display:flex; flex-direction:column; gap:6px;"></div>

        <div style="position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; height:calc(56px + env(safe-area-inset-bottom, 0px)); padding:6px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:8px; box-sizing:border-box; z-index:1000015;">
          <button type="button" onclick="window.clearAllGearsInCategory(window.currentOpeningCategoryId)" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; font-size:0.75rem; font-weight:700; height:44px; padding:0 14px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; white-space:nowrap; flex-shrink:0;">
            <span>↺ 비우기</span>
          </button>
          <button type="button" onclick="window.closeGearPresetModal();" style="flex:1; height:44px; background:linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%); border:1px solid rgba(255,255,255,0.2); color:#ffffff; font-size:0.84rem; font-weight:800; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(0,0,0,0.5); white-space:nowrap;">
            <span>장비 선택 완료 ✓</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  // 🔍 [장비 검색창 입력 및 지우기 전담 함수]
  window.handleGearSearchInput = function(val) {
    var clearBtn = document.getElementById('btnGearSearchClear');
    if (clearBtn) clearBtn.style.display = (val && val.trim().length > 0) ? 'flex' : 'none';
    if (typeof window.renderPresetGearList === 'function') {
      window.renderPresetGearList(val);
    }
  };

  window.clearGearSearchInput = function() {
    var input = document.getElementById('gearSearchFixedInput');
    var clearBtn = document.getElementById('btnGearSearchClear');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) clearBtn.style.display = 'none';
    if (typeof window.renderPresetGearList === 'function') {
      window.renderPresetGearList('');
    }
    triggerHaptic(10);
  };

  // 🔍 [장비 프리셋 검색 및 등록 모달 오픈]
  window.openGearPresetModal = function(categoryId) {
    window.currentOpeningCategoryId = categoryId;
    ensureGearPresetModalDOM();

    var category = (window.CATEGORIES || []).find(function(c) { return c.id === categoryId; });
    if (!category) return;

    var titleEl = document.getElementById('presetModalCategoryTitle');
    if (titleEl) titleEl.innerText = category.title + ' 장비 선택 & 등록';

    var searchInput = document.getElementById('gearSearchFixedInput');
    var clearBtn = document.getElementById('btnGearSearchClear');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    window.renderPresetGearList('');

    var modal = document.getElementById('gearPresetModal');
    if (modal) {
      modal.style.setProperty('display', 'flex', 'important');
      modal.style.setProperty('z-index', '1000010', 'important');
    }
    triggerHaptic(10);
  };

  window.closeGearPresetModal = function() {
    var modal = document.getElementById('gearPresetModal');
    if (modal) modal.style.setProperty('display', 'none', 'important');
    window.currentOpeningCategoryId = null;
    window.renderPlanCategorySlots();
  };

 window.renderPresetGearList = function(query) {
    var category = (window.CATEGORIES || []).find(function(c) { return c.id === window.currentOpeningCategoryId; });
    var listEl = document.getElementById('presetGearDbList');
    if (!category || !listEl) return;

    var currentSelectedItems = (window.selectedGearMap && window.selectedGearMap[category.id]) || [];
    var cleanQ = (query || '').trim().toLowerCase();

    // 🔒 1. 관리자 공식 마스터 DB (순수 복제본)
    var masterList = (category.db || []).slice();

    // 👤 2. 본인 전용 커스텀 장비만 격리 병합 (공용 DB 오염 방지)
    var myCustoms = safeGetJSON('okbm_custom_gears', []).filter(function(cg) {
      return cg && cg.category_id === category.id;
    });

    var combinedDb = [];
    myCustoms.forEach(function(mc) { combinedDb.push(mc); });
    masterList.forEach(function(mg) {
      if (!combinedDb.some(function(d) { return d.name === mg.name; })) {
        combinedDb.push(mg);
      }
    });

    var filteredDb = combinedDb.filter(function(g) {
      if (!g) return false;
      return (g.name && String(g.name).toLowerCase().includes(cleanQ)) ||
             (g.brand && String(g.brand).toLowerCase().includes(cleanQ)) ||
             (g.specs && String(g.specs).toLowerCase().includes(cleanQ));
    });

    filteredDb.sort(function(a, b) {
      var aFav = window.favoriteGearSet && window.favoriteGearSet.has(a.name) ? 1 : 0;
      var bFav = window.favoriteGearSet && window.favoriteGearSet.has(b.name) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      var aInPack = currentSelectedItems.some(function(it) { return it.name === a.name; }) ? 1 : 0;
      var bInPack = currentSelectedItems.some(function(it) { return it.name === b.name; }) ? 1 : 0;
      if (aInPack !== bInPack) return bInPack - aInPack;

      return 0;
    });

    window.__currentFilteredGears = filteredDb;

    if (filteredDb.length === 0) {
      listEl.innerHTML = '<div style="font-size:0.76rem; color:#64748b; text-align:center; padding:35px 0;">일치하는 장비가 없습니다.<br>상단에서 직접 내 장비를 등록해보세요!</div>';
      return;
    }

    listEl.innerHTML = filteredDb.map(function(g, idx) {
      var countInPack = currentSelectedItems.filter(function(it) { return it.name === g.name; }).length;
      var isAdded = countInPack > 0;
      var isFav = window.favoriteGearSet && window.favoriteGearSet.has(g.name);

      var addedBadge = isAdded ? '<span style="font-size:0.58rem; font-weight:800; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); color:#f8fafc; padding:1px 5px; border-radius:4px; flex-shrink:0;">담김 ' + countInPack + '개</span>' : '';
      var myGearBadge = isFav ? '<span style="font-size:0.58rem; font-weight:800; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#e2e8f0; padding:1px 5px; border-radius:4px; flex-shrink:0;">⭐ 내 장비</span>' : '';
      var brandHtml = g.brand ? '<span style="font-size:0.60rem; font-weight:700; color:#94a3b8; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:1px 4px; border-radius:3px; flex-shrink:0;">' + escapeHtml(g.brand) + '</span>' : '';
      var verifiedBadgeHtml = g.verified ? '<span style="font-size:0.58rem; font-weight:700; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#cbd5e1; padding:1px 4px; border-radius:3px; flex-shrink:0;">실측</span>' : '';

      return `
        <div class="gear-db-item" onclick="window.addGearByIndex(${idx});" style="${isAdded ? 'background:rgba(255,255,255,0.055); border:1px solid rgba(255,255,255,0.22);' : (isFav ? 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.12);' : 'background:rgba(255,255,255,0.015); border:1px solid rgba(255,255,255,0.06);')}; border-radius:10px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; cursor:pointer; user-select:none; transition:all 0.15s ease;">
          <div style="flex:1; min-width:0; padding-right:8px; display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:5px;">
              <button type="button" onclick="window.toggleFavoriteGearByIndex(${idx}, event)" style="background:none; border:none; font-size:1.0rem; cursor:pointer; padding:0 2px;">
                ${isFav ? '⭐' : '<span style="color:#475569; opacity:0.4;">☆</span>'}
              </button>
              <div style="font-size:0.78rem; font-weight:800; color:${isAdded ? '#ffffff' : '#e2e8f0'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
                ${escapeHtml(g.name)}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:4px; margin-left:24px; flex-wrap:wrap;">
              ${addedBadge}
              ${myGearBadge}
              ${brandHtml}
              ${verifiedBadgeHtml}
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
            <div style="font-size:0.86rem; font-weight:900; font-family:'JetBrains Mono', monospace; color:${isAdded ? '#f8fafc' : '#94a3b8'};">
              ${(g.weight / 1000).toFixed(2)}<span style="font-size:0.55rem; color:#64748b; margin-left:1px;">kg</span>
            </div>
            ${isAdded ? `
              <div style="display:flex; align-items:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); border-radius:16px; padding:1px 3px; gap:2px; height:24px;" onclick="event.stopPropagation();">
                <button type="button" style="background:none; border:none; color:#ffffff; width:18px; height:18px; font-size:0.9rem; font-weight:900; cursor:pointer;" onclick="window.decrementGearByIndex(${idx}, event)">−</button>
                <span style="font-size:0.72rem; font-weight:900; color:#ffffff; min-width:14px; text-align:center; font-family:'JetBrains Mono', monospace;">${countInPack}</span>
                <button type="button" style="background:none; border:none; color:#ffffff; width:18px; height:18px; font-size:0.9rem; font-weight:900; cursor:pointer;" onclick="window.addGearByIndex(${idx}, event)">+</button>
              </div>
            ` : `
              <button type="button" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#cbd5e1; font-size:0.65rem; font-weight:700; padding:2px 8px; border-radius:10px; cursor:pointer;" onclick="event.stopPropagation(); window.addGearByIndex(${idx});">
                + 담기
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  };

  window.addGearByIndex = function(idx, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var g = window.__currentFilteredGears && window.__currentFilteredGears[idx];
    if (g) window.addGearToCategory(g.name, g.weight);
  };

  window.decrementGearByIndex = function(idx, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var g = window.__currentFilteredGears && window.__currentFilteredGears[idx];
    if (g) window.decrementGearCount(g.name);
  };

  window.toggleFavoriteGearByIndex = function(idx, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var g = window.__currentFilteredGears && window.__currentFilteredGears[idx];
    if (g) window.toggleFavoriteGear(g.name, e);
  };

  window.addGearToCategory = function(name, weight, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!window.currentOpeningCategoryId) return;
    if (!Array.isArray(window.selectedGearMap[window.currentOpeningCategoryId])) {
      window.selectedGearMap[window.currentOpeningCategoryId] = [];
    }
    window.selectedGearMap[window.currentOpeningCategoryId].push({
      id: 'item_' + Date.now() + '_' + Math.random(),
      name: name,
      weight: Number(weight) || 0
    });

    // 🏛️ [RomanticVault 단일 저장소 일원화]
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
    } else {
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    window.renderPlanCategorySlots();
    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    triggerHaptic(12);
  };

  window.decrementGearCount = function(gearName, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!window.currentOpeningCategoryId || !window.selectedGearMap[window.currentOpeningCategoryId]) return;
    var list = window.selectedGearMap[window.currentOpeningCategoryId];
    var targetIdx = list.findIndex(function(it) { return it.name === gearName; });
    if (targetIdx !== -1) {
      list.splice(targetIdx, 1);

      // 🏛️ [RomanticVault 단일 저장소 일원화]
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
      } else {
        localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
        if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
      }

      window.renderPlanCategorySlots();
      var searchInput = document.getElementById('gearSearchFixedInput');
      window.renderPresetGearList(searchInput ? searchInput.value : '');
      triggerHaptic(10);
    }
  };

  window.clearAllGearsInCategory = function(categoryId) {
    if (!categoryId) return;
    window.selectedGearMap[categoryId] = [];

    // 🏛️ [RomanticVault 단일 저장소 일원화]
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
    } else {
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    window.renderPlanCategorySlots();
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('해당 슬롯이 모두 비워졌습니다.', 'info');
  };

  window.resetPlanCalculatorGears = function() {
    var gearMap = window.selectedGearMap || {};
    var hasItems = Object.keys(gearMap).some(function(catId) {
      return Array.isArray(gearMap[catId]) && gearMap[catId].length > 0;
    });

    if (!hasItems) {
      if (typeof showToast === 'function') showToast('이미 배낭이 비어있습니다.', 'info');
      return;
    }

    if (!confirm('배낭에 담긴 모든 장비를 비우시겠습니까?')) return;

    window.selectedGearMap = {};

    // 🏛️ [RomanticVault 단일 저장소 일원화]
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
    } else {
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    window.renderPlanCategorySlots();
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('배낭 슬롯이 초기화되었습니다.', 'info');
  };
window.openQuickGearRegisterModal = function(opts) {
    var isFromCalc = (window.activePlanSubMode === 'calculator');
    var defaultAddToPack = (opts && typeof opts.addToPack === 'boolean') ? opts.addToPack : isFromCalc;
    var searchInput = document.getElementById('calcShelfSearchInput');
    var initName = (searchInput && isFromCalc) ? searchInput.value.trim() : '';

    var old = document.getElementById('quickGearDetailModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'quickGearDetailModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:1000030; display:flex; align-items:flex-end; justify-content:center; box-sizing:border-box;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div style="width:100%; max-width:480px; background:#07090e; border-top:1.5px solid rgba(255,255,255,0.14); border-radius:16px 16px 0 0; padding:14px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; box-shadow:0 -12px 35px rgba(0,0,0,0.95); animation:slideUpSheet 0.22s ease-out;">
        <div style="width:36px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 4px auto;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <span style="font-size:0.88rem; font-weight:800; color:#f8fafc; letter-spacing:-0.02em;">새 장비 등록</span>
          <button type="button" onclick="document.getElementById('quickGearDetailModal').remove();" style="background:none; border:none; color:#64748b; font-size:1.1rem; cursor:pointer; padding:2px 6px;">✕</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" id="regGearName" placeholder="장비명 (예: MSR 엘릭서 2)" value="${escapeHtml(initName)}" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-size:0.82rem; padding:0 12px; outline:none; box-sizing:border-box;" />
          <div style="position:relative; width:100%;">
            <select id="regGearCat" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#f1f5f9; font-size:0.80rem; font-weight:700; padding:0 30px 0 12px; outline:none; -webkit-appearance:none; appearance:none; box-sizing:border-box;">
              <option value="shelter" style="background:#07090e; color:#ffffff;">텐트·타프</option>
              <option value="sleep" style="background:#07090e; color:#ffffff;">침낭·매트</option>
              <option value="pack" style="background:#07090e; color:#ffffff;">배낭</option>
              <option value="food" style="background:#07090e; color:#ffffff;">음식</option>
              <option value="kitchen" style="background:#07090e; color:#ffffff;">취사</option>
              <option value="wear" style="background:#07090e; color:#ffffff;">의류</option>
              <option value="electronics" style="background:#07090e; color:#ffffff;">기기·소품</option>
              <option value="camp" style="background:#07090e; color:#ffffff;">테이블·체어</option>
            </select>
            <div style="position:absolute; right:12px; top:50%; transform:translateY(-50%); pointer-events:none; color:#64748b; font-size:0.65rem;">▼</div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; box-sizing:border-box;">
            <input type="number" id="regGearWeight" placeholder="무게(g)" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-size:0.82rem; padding:0 12px; outline:none; font-family:'JetBrains Mono', monospace; box-sizing:border-box;" />
            <input type="text" id="regGearBrand" placeholder="브랜드(선택)" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-size:0.82rem; padding:0 12px; outline:none; box-sizing:border-box;" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; box-sizing:border-box;">
            <div onclick="window.openRomanticDatePickerModal('regGearPurchaseDate')" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; display:flex; align-items:center; justify-content:space-between; padding:0 10px; box-sizing:border-box; cursor:pointer;">
              <span style="font-size:0.75rem; color:#94a3b8; font-weight:800; flex-shrink:0;">구매일</span>
              <input type="text" id="regGearPurchaseDate" placeholder="선택" readonly style="width:100%; min-width:0; height:100%; background:none; border:none; color:#cbd5e1; font-size:0.76rem; text-align:right; outline:none; font-family:'JetBrains Mono', monospace; padding:0; pointer-events:none;" />
            </div>
            <input type="text" id="regGearPrice" inputmode="numeric" placeholder="구매가(원)" oninput="window.formatDirectInputPrice(this)" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fbbf24; font-size:0.80rem; font-weight:700; padding:0 12px; outline:none; font-family:'JetBrains Mono', monospace; box-sizing:border-box;" />
          </div>
          <label style="display:flex; align-items:center; gap:8px; padding:4px 2px; cursor:pointer; user-select:none; -webkit-user-select:none;">
            <input type="checkbox" id="chkRegAddToPack" ${defaultAddToPack ? 'checked' : ''} style="width:16px; height:16px; accent-color:#38bdf8; cursor:pointer;" />
            <span style="font-size:0.75rem; font-weight:800; color:#cbd5e1;">등록 즉시 현재 배낭에도 담기</span>
          </label>
        </div>
        <div style="display:flex; gap:8px; margin-top:2px;">
          <button type="button" onclick="document.getElementById('quickGearDetailModal').remove();" style="flex:1; height:42px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer;">취소</button>
          <button type="button" onclick="window.submitQuickGearRegister();" style="flex:2; height:42px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.22); border-radius:8px; color:#ffffff; font-size:0.82rem; font-weight:800; cursor:pointer;">등록 완료</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    triggerHaptic(10);
  };

  window.submitQuickGearRegister = function() {
    var nameEl = document.getElementById('regGearName');
    var catEl = document.getElementById('regGearCat');
    var weightEl = document.getElementById('regGearWeight');
    var brandEl = document.getElementById('regGearBrand');
    var pDateEl = document.getElementById('regGearPurchaseDate');
    var priceEl = document.getElementById('regGearPrice');
    var chkPack = document.getElementById('chkRegAddToPack');

    if (!nameEl || !catEl || !weightEl) return;

    var name = nameEl.value.trim();
    var catId = catEl.value || 'shelter';
    var weight = parseInt(weightEl.value, 10);
    var brand = brandEl ? brandEl.value.trim() : '';
    var rawDate = pDateEl && pDateEl.value ? pDateEl.value.trim() : '';
    var pDate = '';
    if (rawDate) {
      var dp = rawDate.match(/\d+/g);
      if (dp && dp.length >= 3) {
        pDate = dp[0].slice(-2) + '.' + String(dp[1]).padStart(2, '0') + '.' + String(dp[2]).padStart(2, '0');
      } else {
        pDate = rawDate;
      }
    }
    var rawPrice = priceEl ? parseInt((priceEl.value || '').replace(/[^0-9]/g, ''), 10) : 0;
    var price = isNaN(rawPrice) ? 0 : rawPrice;
    var shouldAddToPack = chkPack ? chkPack.checked : false;

    if (!name || isNaN(weight) || weight < 0) {
      if (typeof showToast === 'function') showToast('장비명과 무게(g)를 입력해주세요.', 'warn');
      return;
    }

    var newCustom = {
      id: 'custom_' + Date.now(),
      name: name,
      weight: weight,
      brand: brand || '내 장비',
      category_id: catId,
      verified: true,
      specs: brand || '직접 등록한 내 장비'
    };

    var customGears = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_custom_gears', [])
      : safeGetJSON('okbm_custom_gears', []);

    if (!customGears.some(function(g) { return g.name === name; })) {
      customGears.unshift(newCustom);
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_custom_gears', customGears, false);
      } else {
        localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
      }
    }

    var cat = (window.CATEGORIES || []).find(function(c) { return c.id === catId; });
    if (cat && !cat.db.some(function(d) { return d.name === name; })) {
      cat.db.unshift(newCustom);
    }

    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.add(name);
    var favArr = Array.from(window.favoriteGearSet);

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_favorite_gears', favArr, false);
    } else {
      localStorage.setItem('okbm_favorite_gears', JSON.stringify(favArr));
    }

    var gearMetaObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_gear_meta', {})
      : safeGetJSON('okbm_gear_meta', {});

    if (!gearMetaObj[name]) gearMetaObj[name] = { purchaseDate: '', price: 0, status: 'ok', memo: '' };
    if (pDate) gearMetaObj[name].purchaseDate = pDate;
    if (price > 0) gearMetaObj[name].price = price;

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_gear_meta', gearMetaObj, false);
    } else {
      localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
    }

    if (shouldAddToPack) {
      if (!window.selectedGearMap) window.selectedGearMap = {};
      if (!Array.isArray(window.selectedGearMap[catId])) window.selectedGearMap[catId] = [];
      window.selectedGearMap[catId].push({
        id: 'item_' + Date.now() + '_' + Math.random(),
        name: name,
        weight: weight
      });

      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, false);
      } else {
        localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      }
    }

    var modal = document.getElementById('quickGearDetailModal');
    if (modal) modal.remove();

    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud();
    }

    triggerHaptic(12);
    if (typeof showToast === 'function') showToast('[' + name + '] 등록 완료', 'success');

    if (window.activePlanSubMode === 'calculator') {
      window.renderPlanCategorySlots();
    } else {
      window.renderPlanStage();
    }
  };

  window.addCustomGearToCurrentCategory = function() {
    if (!window.currentOpeningCategoryId) return;
    var nameInput = document.getElementById('customInputGearName');
    var weightInput = document.getElementById('customInputGearWeight');
    if (!nameInput || !weightInput) return;

    var name = nameInput.value.trim();
    var weight = parseInt(weightInput.value, 10);
    if (!name || isNaN(weight) || weight < 0) {
      if (typeof showToast === 'function') showToast('장비명과 정확한 무게(g)를 입력해주세요.', 'warn');
      return;
    }

    var newCustomItem = {
      id: 'custom_' + Date.now(),
      name: name,
      weight: weight,
      brand: '내 장비',
      category_id: window.currentOpeningCategoryId,
      verified: true,
      specs: '직접 등록한 내 장비'
    };

    var customGears = safeGetJSON('okbm_custom_gears', []);
    if (!customGears.some(function(g) { return g.name === name; })) {
      customGears.unshift(newCustomItem);
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_custom_gears', customGears, false);
      } else {
        localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
      }
    }

    var cat = (window.CATEGORIES || []).find(function(c) { return c.id === window.currentOpeningCategoryId; });
    if (cat && !cat.db.some(function(d) { return d.name === name; })) {
      cat.db.unshift(newCustomItem);
    }

    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.add(name);
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_favorite_gears', Array.from(window.favoriteGearSet), true);
    } else {
      localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));
    }

    window.addGearToCategory(name, weight);

    nameInput.value = '';
    weightInput.value = '';
    if (typeof showToast === 'function') showToast('⭐ [' + name + ']이 내 장비함에 등록되었습니다!', 'success');
  };

  window.toggleFavoriteGear = function(gearName, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!gearName) return;

    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();

    if (window.favoriteGearSet.has(gearName)) {
      window.favoriteGearSet.delete(gearName);
      if (typeof showToast === 'function') showToast('[' + gearName + '] 내 장비 해제', 'info');
    } else {
      window.favoriteGearSet.add(gearName);
      if (typeof showToast === 'function') showToast('[' + gearName + '] 내 장비 등록', 'success');
    }

    // 🏛️ [RomanticVault 일원화]
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_favorite_gears', Array.from(window.favoriteGearSet), true);
    } else {
      localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    window.renderPlanCategorySlots();
    triggerHaptic(10);
  };

window.saveCurrentPackingRecord = function() {
    triggerHaptic(15);

    var gearMap = window.selectedGearMap || safeGetJSON('okbm_selected_gears_multi', {}) || {};
    var packedItems = [];
    var totalGrams = 0;

    Object.keys(gearMap).forEach(function(catId) {
      (gearMap[catId] || []).forEach(function(it) {
        if (it && (it.name || it.itemName)) {
          var gName = it.name || it.itemName;
          var gWeight = Number(it.weight || it.weight_g || 0);
          packedItems.push({
            id: it.id || ('item_' + Date.now() + '_' + Math.random()),
            name: gName,
            weight: gWeight,
            categoryId: catId
          });
          totalGrams += gWeight;
        }
      });
    });

    if (packedItems.length === 0) {
      if (typeof showToast === 'function') showToast('장비를 1개 이상 담아주세요.', 'warn');
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
    var recordId = 'pack_' + Date.now();

    // 🎯 [3중 스마트 목적지 자동 발굴 엔진 - 이모지 100% 독립]:
    var spotTitle = '';
    var spotElev = '';

    // 1순위: 직전 세션 전역 변수
    if (window.currentLuckySpot && window.currentLuckySpot.name) {
      spotTitle = window.currentLuckySpot.name;
      spotElev = window.currentLuckySpot.elevation || '';
    }

    // 2순위: 날짜별 독립 목적지 DB (okbm_plan_spots)
    if (!spotTitle) {
      var planSpots = safeGetJSON('okbm_plan_spots', {});
      var savedSpotObj = planSpots[targetDateStr];
      if (savedSpotObj && savedSpotObj.name) {
        spotTitle = savedSpotObj.name;
        spotElev = savedSpotObj.elevation || '';
      }
    }

    // 3순위: 달력 메모 텍스트 지능형 관용 파싱 (이모지, 한글 태그, 일반 텍스트 모두 대응)
    if (!spotTitle) {
      var planMemos = safeGetJSON('okbm_plan_memos', {});
      var rawMemo = String(planMemos[targetDateStr] || '').trim();
      if (rawMemo) {
        var match = rawMemo.match(/(?:📍|\[목적지\]|목적지:\s*|장소:\s*)?([^\n\r()]+)(?:\(([^)]+)\))?/);
        if (match && match[1] && match[1].trim().length > 1) {
          spotTitle = match[1].trim();
          if (match[2]) spotElev = match[2].trim();
        } else {
          spotTitle = rawMemo.split('\n')[0].slice(0, 20).trim();
        }
      }
    }

    if (spotElev && !String(spotElev).includes('m') && !isNaN(parseInt(spotElev, 10))) {
      spotElev = parseInt(spotElev, 10) + 'm';
    }

    // 전역 캐시 동기화 (다음 모달 자동완성 보장)
    if (spotTitle) {
      window.currentLuckySpot = { name: spotTitle, elevation: spotElev };
    }

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
      memo: '',
      oneLineMemo: spotTitle ? (spotTitle + ' 힐링') : '출발 준비 완료!',
      isDraft: false,
      isPublished: true,
      items: packedItems,
      photos: [],
      photo: '',
      fieldPhoto: ''
    };

    // 🏛️ 보관함(History) DB에 즉시 영구 각인 및 전역 캐시 갱신
    if (typeof window.savePackingHistoryRecord === 'function') {
      newRecord = window.savePackingHistoryRecord(newRecord) || newRecord;
    }

    // ⚡ 방금 저장한 최신 기록을 R2 클라우드로 즉각 전송 (서버 수화 덮어쓰기 방어)
    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(true);
    }

    window.currentShareRecord = newRecord;
    window.currentShareItems = packedItems;

   // 계산기 모달 닫기
    var planModal = document.getElementById('romanticPlanModal');
    if (planModal) {
      planModal.style.setProperty('display', 'none', 'important');
    }

    // 카드 스튜디오 모달 즉시 호출
    if (typeof window.openPackShareModal === 'function') {
      window.openPackShareModal(newRecord, packedItems, false);
    } else if (typeof openPackShareModal === 'function') {
      openPackShareModal(newRecord, packedItems, false);
    }
  };

  // 🌐 [구글 시트 마스터 장비 탭(GID: 2014805196) 실시간 동기화]
  window.loadGearDbFromGoogleSheet = async function() {
    var gearGid = '2014805196';
    var sheetId = '1NwU__GxGKdTBhiifJmCQd3KB03U-v5xrI4zvLaXR_y4';
    var gasUrl = window.GAS_API_URL || 'https://script.google.com/macros/s/AKfycbzksZYPEENEc5BOPuseLPovzxwP88v9flH7kbWocL3zlrS4yDhPzTsr7PILwYQfQm4/exec';

    try {
      var res = await fetch(gasUrl + '?action=GET_GEARS&_t=' + Date.now());
      if (res.ok) {
        var gearsData = await res.json();
        if (Array.isArray(gearsData) && gearsData.length > 0) {
          applyFetchedGears(gearsData);
          return;
        }
      }
    } catch (e) {}

    var gvizUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&gid=' + gearGid + '&_t=' + Date.now();
    try {
      var gvizRes = await fetch(gvizUrl);
      if (gvizRes.ok && typeof Papa !== 'undefined') {
        var csvText = await gvizRes.text();
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: function(results) {
            if (results.data && results.data.length > 0) {
              applyFetchedGears(results.data);
            }
          }
        });
      }
    } catch (e) {}
  };

 function applyFetchedGears(rows) {
    var sheetGearsByCategory = {};
    rows.forEach(function(row) {
      var catId = String(row.category_id || row.category || '').trim();
      var name = String(row.item_name || row.name || '').trim();
      var weight = parseInt(row.weight_g || row.weight, 10);
      var brand = String(row.brand || '').trim();
      var specs = String(row.specs_detail || row.specs || '').trim();
      var verified = (row.verified === 'TRUE' || row.verified === true);

      if (catId && name && !isNaN(weight)) {
        if (!sheetGearsByCategory[catId]) sheetGearsByCategory[catId] = [];
        sheetGearsByCategory[catId].push({
          id: row.gear_id || ('gear_' + Date.now() + '_' + Math.random()),
          name: name,
          weight: weight,
          brand: brand,
          specs: specs,
          verified: verified
        });
      }
    });

    // 💾 관리자 공식 마스터 캐시만 순수 보존
    localStorage.setItem('okbm_master_gears_cache', JSON.stringify(sheetGearsByCategory));

    // 🔒 관리자 공식 마스터 DB만 순수하게 주입 (개인 장비와 섞지 않음)
    (window.CATEGORIES || []).forEach(function(cat) {
      cat.db = sheetGearsByCategory[cat.id] ? sheetGearsByCategory[cat.id].slice() : [];
    });

    if (typeof window.renderPlanCategorySlots === 'function') {
      window.renderPlanCategorySlots();
    }
  }

  // 🚀 초기 로드 시 관리자 마스터 캐시 복원
  (function initCachedGears() {
    var cached = safeGetJSON('okbm_master_gears_cache', null);
    if (cached) {
      (window.CATEGORIES || []).forEach(function(cat) {
        cat.db = cached[cat.id] ? cached[cat.id].slice() : [];
      });
    }
  })();

  // 🎒 [실전 패킹 체크리스트 인덱스 안전 토글 엔진 - 스크롤 위치 완벽 보존]
  window.togglePackCheckByIndex = function(itemIdx) {
    var now = new Date();
    var targetDate = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));

    var planItems = [];
    if (typeof window.CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      window.CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) planItems.push(it);
        });
      });
    }
    var consumablesMap = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_trip_consumables', {})
      : safeGetJSON('okbm_trip_consumables', {});
    var tripConsumables = consumablesMap[targetDate] || [];
    tripConsumables.forEach(function(c) { planItems.push(c); });

    var targetItem = planItems[itemIdx];
    if (!targetItem) return;

    var gName = targetItem.name || targetItem.itemName || '';
    var checkKey = targetDate + '__' + gName;

    if (!window.packedCheckSet) window.packedCheckSet = new Set();

    if (window.packedCheckSet.has(checkKey)) {
      window.packedCheckSet.delete(checkKey);
    } else {
      window.packedCheckSet.add(checkKey);
    }

    var packedArr = Array.from(window.packedCheckSet);
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packed_checks', packedArr, false);
    } else {
      localStorage.setItem('okbm_packed_checks', JSON.stringify(packedArr));
    }
    triggerHaptic(10);

    var scrollBox = document.getElementById('checklistItemsScrollContainer');
    var savedScroll = scrollBox ? scrollBox.scrollTop : 0;

    window.renderPlanStage();

    var newScrollBox = document.getElementById('checklistItemsScrollContainer');
    if (newScrollBox) newScrollBox.scrollTop = savedScroll;
  };

  window.toggleAllPackCheckItems = function(forceState, dateStr) {
    var now = new Date();
    var targetDate = dateStr || window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));

    var planItems = [];
    if (typeof window.CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      window.CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) planItems.push(it);
        });
      });
    }
    var consumablesMap = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_trip_consumables', {})
      : safeGetJSON('okbm_trip_consumables', {});
    var tripConsumables = consumablesMap[targetDate] || [];
    tripConsumables.forEach(function(c) { planItems.push(c); });

    if (planItems.length === 0) return;
    if (!window.packedCheckSet) window.packedCheckSet = new Set();

    var shouldCheck = forceState;
    if (shouldCheck === null || shouldCheck === undefined) {
      var allChecked = planItems.every(function(it) {
        return window.packedCheckSet.has(targetDate + '__' + (it.name || it.itemName));
      });
      shouldCheck = !allChecked;
    }

    planItems.forEach(function(it) {
      var key = targetDate + '__' + (it.name || it.itemName);
      if (shouldCheck) window.packedCheckSet.add(key);
      else window.packedCheckSet.delete(key);
    });

    var packedArr = Array.from(window.packedCheckSet);
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packed_checks', packedArr, false);
    } else {
      localStorage.setItem('okbm_packed_checks', JSON.stringify(packedArr));
    }
    triggerHaptic(12);
    window.renderPlanStage();
  };

  window.addChecklistConsumableItem = function() {
    var nameInput = document.getElementById('inputChecklistFoodName');
    var weightInput = document.getElementById('inputChecklistFoodWeight');
    if (!nameInput) return;

    var name = nameInput.value.trim();
    var weight = parseInt(weightInput ? weightInput.value : '0', 10) || 0;
    if (!name) {
      if (typeof showToast === 'function') showToast('추가할 음식/물품명을 입력해주세요.', 'warn');
      return;
    }

    var now = new Date();
    var targetDate = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var consumablesMap = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_trip_consumables', {})
      : safeGetJSON('okbm_trip_consumables', {});

    if (!consumablesMap[targetDate]) consumablesMap[targetDate] = [];

    consumablesMap[targetDate].push({
      id: 'food_' + Date.now(),
      name: name,
      weight: weight,
      isConsumable: true
    });

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_trip_consumables', consumablesMap, true);
    } else {
      localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));
    }

    triggerHaptic(12);
    if (typeof showToast === 'function') showToast('[' + name + '] 체크리스트 추가 완료', 'success');
    window.renderPlanStage();
  };

  window.removeChecklistConsumableItem = function(foodId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var now = new Date();
    var targetDate = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var consumablesMap = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_trip_consumables', {})
      : safeGetJSON('okbm_trip_consumables', {});

    if (consumablesMap[targetDate]) {
      consumablesMap[targetDate] = consumablesMap[targetDate].filter(function(it) { return it.id !== foodId; });
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_trip_consumables', consumablesMap, true);
      } else {
        localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));
      }
      triggerHaptic(10);
      window.renderPlanStage();
    }
  };

  window.completeChecklist = function(dateStr) {
    triggerHaptic(20);

    // 1. 현재 화면에 작성 중이던 메모 즉시 동기화 보존
    var memoInput = document.getElementById('planDailyMemoInput');
    var curVal = memoInput ? memoInput.value.trim() : '';

    var planMemosMap = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_memos', {})
      : safeGetJSON('okbm_plan_memos', {});

    if (curVal) {
      planMemosMap[dateStr] = curVal;
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_plan_memos', planMemosMap, true);
      } else {
        localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemosMap));
      }
    }

    // 2. 보관함 완료 히스토리 객체에도 메모 상호 각인 (메모 소실 원천 방지)
    var historyList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_packing_history', [])
      : safeGetJSON('okbm_packing_history', []);

    if (Array.isArray(historyList)) {
      var targetHistory = historyList.find(function(h) {
        var hDate = h.date ? h.date.replace(/[-/]/g, '.') : '';
        return hDate === dateStr || String(h.date) === String(dateStr);
      });
      if (targetHistory) {
        if (curVal && !targetHistory.memo) {
          targetHistory.memo = curVal;
        }
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_packing_history', historyList, true);
        } else {
          localStorage.setItem('okbm_packing_history', JSON.stringify(historyList));
        }
      }
    }

    if (typeof showToast === 'function') {
      showToast('[' + dateStr + '] 패킹 체크가 완료되었습니다.', 'success', 2500);
    }

    window.activePlanSubMode = 'calendar';
    window.renderPlanStage();
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };
 // 🏛️ [낭만플랜 메인 렌더러 함수 - 100% 정상 선언]
  window.renderPlanStage = function() {
    var modal = document.getElementById('romanticPlanModal');
    if (!modal) return;

    if (!(window.favoriteGearSet instanceof Set)) {
      var rawFav = Array.isArray(window.favoriteGearSet) ? window.favoriteGearSet : safeGetJSON('okbm_favorite_gears', []);
      window.favoriteGearSet = new Set(Array.isArray(rawFav) ? rawFav : []);
    }
    if (!(window.packedCheckSet instanceof Set)) {
      var rawChk = Array.isArray(window.packedCheckSet) ? window.packedCheckSet : safeGetJSON('okbm_packed_checks', []);
      window.packedCheckSet = new Set(Array.isArray(rawChk) ? rawChk : []);
    }

    var now = new Date();
    var viewYear = window.calViewYear || now.getFullYear();
    var viewMonth = window.calViewMonth || (now.getMonth() + 1);

    var activeDateStr = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var dateParts = activeDateStr.match(/\d+/g) || [viewYear, viewMonth, 1];
    var activeDay = (parseInt(dateParts[0], 10) === viewYear && parseInt(dateParts[1], 10) === viewMonth) ? parseInt(dateParts[2], 10) : -1;

    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    var historyList = window.interactiveHistory || safeGetJSON('okbm_packing_history', []);
    if (!Array.isArray(historyList)) historyList = [];
    var monthHistory = historyList.filter(function(h) {
      return h && Number(h.year) === Number(viewYear) && Number(h.month) === Number(viewMonth);
    });

  var planMemosObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_memos', {})
      : safeGetJSON('okbm_plan_memos', {}) || {};
    
    var currentDayMemo = (planMemosObj && planMemosObj[activeDateStr]) ? String(planMemosObj[activeDateStr]) : '';

    // 완료 기록에만 메모가 남아 있는 경우 자동 복원
    if (!currentDayMemo) {
      var matchedRecord = monthHistory.find(function(h) { return h && Number(h.day) === Number(activeDay); });
      if (matchedRecord && (matchedRecord.memo || matchedRecord.oneLineMemo)) {
        currentDayMemo = String(matchedRecord.memo || matchedRecord.oneLineMemo).trim();
      }
    }

    // 🎒 [계산기/체크리스트 공용 무게 및 아이템 데이터 사전 집계]
    var totalGrams = 0;
    var planItems = [];
    var cats = window.CATEGORIES || [];
    var gearMap = window.selectedGearMap || {};

    cats.forEach(function(cat) {
      (gearMap[cat.id] || []).forEach(function(it) {
        if (it && (it.name || it.itemName)) {
          var w = Number(it.weight || it.weight_g || 0);
          totalGrams += w;
          planItems.push({
            id: it.id || ('item_' + Date.now() + '_' + Math.random()),
            name: it.name || it.itemName,
            weight: w,
            categoryId: cat.id,
            isConsumable: false
          });
        }
      });
    });

    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    var tripConsumables = consumablesMap[activeDateStr] || [];
    tripConsumables.forEach(function(c) {
      if (c && c.name) {
        var cw = Number(c.weight || 0);
        totalGrams += cw;
        planItems.push({
          id: c.id || ('food_' + Date.now() + '_' + Math.random()),
          name: c.name,
          weight: cw,
          isConsumable: true
        });
      }
    });

    var totalKgStr = (totalGrams / 1000).toFixed(2);
    var packedCount = planItems.filter(function(it) {
      return window.packedCheckSet && window.packedCheckSet.has(activeDateStr + '__' + it.name);
    }).length;
    var planProgressPct = planItems.length > 0 ? Math.round((packedCount / planItems.length) * 100) : 0;

    var todayYear = now.getFullYear();
    var todayMonth = now.getMonth() + 1;
    var todayDate = now.getDate();
    var todayMidnight = new Date(todayYear, todayMonth - 1, todayDate);

    var planSpotsObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_spots', {})
      : safeGetJSON('okbm_plan_spots', {}) || {};

    var allFutureDates = [];
    var seenFutureDateKeys = {};

    Object.keys(planMemosObj).forEach(function(k) {
      var val = planMemosObj[k];
      if (val && String(val).trim().length > 0) {
        var p = k.match(/\d+/g);
        if (p && p.length >= 3) {
          var targetD = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
          if (targetD >= todayMidnight) {
            seenFutureDateKeys[k] = true;
            allFutureDates.push({ dateKey: k, dateObj: targetD, memo: String(val).trim() });
          }
        }
      }
    });

    Object.keys(planSpotsObj).forEach(function(k) {
      if (seenFutureDateKeys[k]) return;
      var rawSpots = planSpotsObj[k];
      var spotsArr = Array.isArray(rawSpots) ? rawSpots : (rawSpots && rawSpots.name ? [rawSpots] : []);
      if (spotsArr.length > 0) {
        var p = k.match(/\d+/g);
        if (p && p.length >= 3) {
          var targetD = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
          if (targetD >= todayMidnight) {
            seenFutureDateKeys[k] = true;
            var spotTitle = spotsArr[0].name || '계획된 일정';
            allFutureDates.push({ dateKey: k, dateObj: targetD, memo: spotTitle });
          }
        }
      }
    });

    allFutureDates.sort(function(a, b) { return a.dateObj - b.dateObj; });
    var nearestTrip = allFutureDates.length > 0 ? allFutureDates[0] : null;
    var dDayBadgeHtml = '';

    // 🎨 [고품질 시그니처 SVG 벡터 세트]
    var UI_ICONS = {
      pin: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#38bdf8; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      tentEmpty: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#94a3b8; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M19 20L12 4 5 20h14z"/><path d="M12 4v16M7 20l5-8 5 8"/></svg>',
      starGold: '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#fbbf24; stroke:#f59e0b; stroke-width:1; flex-shrink:0; filter:drop-shadow(0 1px 3px rgba(251,191,36,0.4));"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      flagGreen: '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#34d399; stroke:#059669; stroke-width:1; flex-shrink:0; filter:drop-shadow(0 1px 3px rgba(52,211,153,0.4));"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
      memoEdit: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:#cbd5e1; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      trash: '<svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      check: '<svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; fill:none; stroke-width:2.8; stroke-linecap:round; stroke-linejoin:round;"><polyline points="20 6 9 17 4 12"/></svg>',
      foodUtensils: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:#fb923c; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>',
      plus: '<svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; fill:none; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      calendarMini: '<svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:#38bdf8; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      tentMini: '<svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:#34d399; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M19 20L12 4 5 20h14z"/></svg>',
      noteMini: '<svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:#cbd5e1; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    };

    if (nearestTrip) {
      var diffDays = Math.ceil((nearestTrip.dateObj - todayMidnight) / (1000 * 60 * 60 * 24));
      var dText = (diffDays === 0) ? 'D-DAY (오늘)' : ('D-' + diffDays);
      var spotMatch = nearestTrip.memo.match(/📍\s*(?:목적지:\s*)?([^\n\r(]+)/);
      var tripTitle = spotMatch ? spotMatch[1].trim() : nearestTrip.memo.split('\n')[0].slice(0, 24);

     dDayBadgeHtml = `
        <div onclick="window.startPackingForDate('${nearestTrip.dateKey}', '${escapeHtml(tripTitle)}');" style="background:linear-gradient(90deg, rgba(56,189,248,0.08) 0%, rgba(255,255,255,0.03) 100%); border:1.2px solid rgba(56,189,248,0.42); border-radius:10px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; flex-shrink:0; box-sizing:border-box; box-shadow:0 4px 18px rgba(0,0,0,0.6), 0 0 14px rgba(56,189,248,0.14); transition:all 0.15s ease;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1; line-height:1;">
            <span style="height:20px; font-size:0.72rem; font-family:'Space Grotesk', sans-serif; font-weight:900; color:#000000; background:#ffffff; padding:0 7px; border-radius:4px; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(255,255,255,0.6); line-height:1;">
              ${dText}
            </span>
            <div style="font-size:0.80rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; line-height:1;">
              <span style="line-height:1; display:inline-flex; align-items:center;">${nearestTrip.dateKey}</span>
              <span style="color:#64748b; font-size:0.70rem; line-height:1; display:inline-flex; align-items:center;">·</span>
              <span style="display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; line-height:1;">${UI_ICONS.pin}</span>
              <span style="line-height:1; display:inline-flex; align-items:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(tripTitle)}</span>
            </div>
          </div>
          <span style="font-size:0.68rem; color:#38bdf8; font-weight:800; flex-shrink:0; display:inline-flex; align-items:center; line-height:1; margin-left:8px;">패킹하기 ➔</span>
        </div>
      `;
    } else {
      dDayBadgeHtml = `
        <div style="background:rgba(255,255,255,0.025); border:1px dashed rgba(255,255,255,0.14); border-radius:12px; padding:8px 14px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-sizing:border-box;">
          <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:#94a3b8; font-weight:800;">
            ${UI_ICONS.tentEmpty}
            <span>다가오는 출정 일정이 없습니다.</span>
          </div>
          <span style="font-size:0.65rem; color:#38bdf8; font-weight:900;">
        </div>
      `;
    }

    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:100% !important;"></div>';
    }

 for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var isToday = (Number(viewYear) === todayYear && Number(viewMonth) === todayMonth && Number(d) === todayDate);
      var thisDateKey = viewYear + '.' + String(viewMonth).padStart(2, '0') + '.' + String(d).padStart(2, '0');

      var dayRecord = monthHistory.find(function(h) { return h && Number(h.day) === Number(d); });
      var isCompleted = !!(dayRecord && ((dayRecord.memo && String(dayRecord.memo).trim().length > 0) || (dayRecord.items && dayRecord.items.length > 0)));
      var isRecorded = !!dayRecord;
      var hasPlanMemo = Boolean(planMemosObj[thisDateKey] && String(planMemosObj[thisDateKey]).trim().length > 0);
      var rawDaySpots = planSpotsObj[thisDateKey];
      var hasPlanSpot = Boolean((Array.isArray(rawDaySpots) && rawDaySpots.length > 0) || (rawDaySpots && rawDaySpots.name));
      var hasPlan = hasPlanMemo || hasPlanSpot;

      var circleStyle = 'position:relative; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.78rem; font-weight:800; transition:all 0.15s ease;';
      var indicatorDot = '';

      if (isSelected) {
        if (isCompleted) {
          circleStyle += 'background:rgba(245,158,11,0.28); border:1.5px solid #f59e0b; color:#ffffff; font-weight:900; box-shadow:0 0 10px rgba(245,158,11,0.45);';
          indicatorDot = '<span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); width:3.5px; height:3.5px; background:#fbbf24; border-radius:50%;"></span>';
        } else if (hasPlan) {
          circleStyle += 'background:rgba(52,211,153,0.22); border:1.5px solid #34d399; color:#ffffff; font-weight:900; box-shadow:0 0 10px rgba(52,211,153,0.4);';
          indicatorDot = '<span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); width:3.5px; height:3.5px; background:#34d399; border-radius:50%;"></span>';
        } else {
          circleStyle += 'background:rgba(255,255,255,0.22); border:1.5px solid #ffffff; color:#ffffff; font-weight:900; box-shadow:0 0 10px rgba(255,255,255,0.3);';
        }
      } else if (isCompleted) {
        circleStyle += 'background:rgba(245,158,11,0.22); border:1.5px solid #f59e0b; color:#fef08a; font-weight:900; box-shadow:0 0 8px rgba(245,158,11,0.35);';
      } else if (hasPlan) {
        circleStyle += 'background:rgba(52,211,153,0.18); border:1px solid rgba(52,211,153,0.45); color:#ffffff; font-weight:900;';
      } else if (isToday) {
        circleStyle += 'border:1px solid rgba(255,255,255,0.35); color:#ffffff; font-weight:800; background:rgba(255,255,255,0.04);';
      } else if (isRecorded) {
        circleStyle += 'color:#f8fafc; font-weight:800;';
      } else {
        circleStyle += 'color:#94a3b8;';
      }

      calendarDaysHtml += '<div style="height:100% !important; width:100% !important; display:flex; align-items:center; justify-content:center; cursor:pointer; user-select:none;" onclick="window.handlePlanCalendarClick(' + d + ', ' + viewMonth + ', ' + viewYear + ')"><div style="' + circleStyle + '">' + d + indicatorDot + '</div></div>';
    }

    for (var te = 0; te < (42 - (firstDayIndex + lastDayOfMonth)); te++) {
      calendarDaysHtml += '<div style="height:100% !important;"></div>';
    }

    var VECTOR_ICONS = {
      calculator: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; stroke:#cbd5e1; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;"><rect x="4" y="2" width="16" height="20" rx="3"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>',
      checklist: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; stroke:#34d399; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
      bookmarks: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; fill:#fbbf24; stroke:#fbbf24; stroke-width:1;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      gears: '<svg viewBox="0 0 24 24" style="width:19px; height:19px; stroke:#e2e8f0; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
    };

    var calendarMemoViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0 4px 0; overflow:hidden; box-sizing:border-box;">
        
       <!-- 1. 달력 카드 (전체 뷰포트 대비 31% 정밀 적응형 뷰) -->
        <div id="planCalendarCardWrap" style="height:31% !important; min-height:236px !important; flex-shrink:0 !important; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:center; height:34px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:5px;">
              <button type="button" onclick="window.changePlanMonth(-1)" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:#ffffff; width:28px; height:28px; border-radius:7px; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">◀</button>
              <button type="button" onclick="window.openPlanYearPicker(event)" style="height:28px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:0 10px; border-radius:7px; font-size:0.92rem; font-weight:900; cursor:pointer; font-family:'Space Grotesk', sans-serif; display:flex; align-items:center;">
                <span>${viewYear}년</span>
              </button>
              <span style="font-size:0.95rem; font-weight:900; color:#ffffff; margin:0 3px; font-family:'Space Grotesk', sans-serif;">${viewMonth}월</span>
              <button type="button" onclick="window.changePlanMonth(1)" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:#ffffff; width:28px; height:28px; border-radius:7px; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">▶</button>
            </div>
            
           <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" onclick="window.jumpToPlanToday()" style="height:24px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#ffffff; font-size:0.70rem; font-weight:800; padding:0 8px; border-radius:5px; cursor:pointer;">오늘</button>
              <span style="font-size:0.70rem; color:#fbbf24; font-weight:900; display:flex; align-items:center; gap:4px;"><span style="width:7px; height:7px; background:rgba(245,158,11,0.35); border:1.5px solid #f59e0b; border-radius:50%; box-shadow:0 0 6px rgba(245,158,11,0.4); display:inline-block;"></span><span>완료</span></span>
              <span style="font-size:0.70rem; color:#34d399; font-weight:800; display:flex; align-items:center; gap:4px;"><span style="width:7px; height:7px; background:rgba(52,211,153,0.3); border:1px solid #34d399; border-radius:50%; display:inline-block;"></span><span>계획</span></span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.72rem; font-weight:900; color:#94a3b8; height:20px; line-height:20px; flex-shrink:0; letter-spacing:0.5px; margin-top:8px; margin-bottom:4px;">
            <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#cbd5e1;">토</span>
          </div>
          
          <div style="flex:1 1 0%; min-height:0; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:repeat(6, 1fr); gap:2px; text-align:center;">
            ${calendarDaysHtml}
          </div>
        </div>

        <!-- 2. 최단 출정 D-Day 스마트 배너 -->
        ${dDayBadgeHtml}

       <!-- 3. 메모장 카드 (22%) -->
        <div style="flex:22 1 0% !important; min-height:0 !important; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.18); border-radius:12px; padding:6px 12px; display:flex; flex-direction:column; gap:4px; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; height:24px; flex-shrink:0;">
            <div style="font-size:0.78rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
              ${UI_ICONS.memoEdit}
              <span>[${activeDateStr}] 일정 메모</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" onclick="window.clearEntireDaySchedule('${activeDateStr}');" style="height:24px; padding:0 9px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#fda4af; font-size:0.68rem; font-weight:800; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:3px;">
                ${UI_ICONS.trash}
                <span>삭제</span>
              </button>
              <button type="button" onclick="window.savePlanMemo('${activeDateStr}');" style="height:24px; padding:0 9px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#f8fafc; font-size:0.68rem; font-weight:800; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:3px;">
                ${UI_ICONS.check}
                <span>저장</span>
              </button>
            </div>
          </div>
        <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; background:rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 8px; display:flex; flex-direction:column; gap:5px; box-sizing:border-box;">
            ${(function() {
              var planSpotsObj = safeGetJSON('okbm_plan_spots', {});
              var rawSpotData = planSpotsObj[activeDateStr];
              var spotArray = [];
              if (Array.isArray(rawSpotData)) {
                spotArray = rawSpotData;
              } else if (rawSpotData && rawSpotData.name) {
                spotArray = [rawSpotData];
              }

              if (spotArray.length === 0) return '';

              // 순수 SVG 원정대 벡터 심볼 (이모티콘 0%)
              var tripSvgIcon = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:#34d399; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
              var pinSvgIcon = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#38bdf8; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

              var chipsHtml = spotArray.map(function(s) {
                var dispElev = s.elevation ? (' (' + s.elevation + ')') : '';
                var isExpedition = Boolean(s.isTrip || s.tripId);
                var chipIcon = isExpedition ? tripSvgIcon : pinSvgIcon;
                var chipBorder = isExpedition ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.12)';
                var chipBg = isExpedition ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)';
                var labelPrefix = isExpedition ? '<span style="font-size:0.62rem; color:#34d399; font-weight:800; margin-right:2px;">[원정대]</span>' : '';

                var safeSName = escapeHtml(s.name);
                return '<div style="display:inline-flex; align-items:center; gap:5px; background:' + chipBg + '; border:1px solid ' + chipBorder + '; padding:3px 8px; border-radius:12px; font-size:0.78rem; font-weight:800; color:#ffffff;">' +
                  '<span style="display:inline-flex; align-items:center; flex-shrink:0;">' + chipIcon + '</span>' +
                  labelPrefix +
                  '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:130px;">' + escapeHtml(s.name + dispElev) + '</span>' +
                  '<button type="button" data-date="' + escapeHtml(activeDateStr) + '" data-spot="' + safeSName + '" onclick="window.removeIndividualPlanSpot(this.dataset.date, this.dataset.spot, event)" style="background:none; border:none; color:#94a3b8; font-size:0.75rem; font-weight:900; cursor:pointer; padding:0 2px; margin-left:2px; line-height:1;">✕</button>' +
                '</div>';
              }).join('');

              return '<div style="display:flex; flex-wrap:wrap; gap:5px; padding-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0;">' + chipsHtml + '</div>';
            })()}
            <textarea id="planDailyMemoInput" placeholder="이 날짜의 일정과 챙길 것들을 메모해보세요..." oninput="window.autoSavePlanMemo('${activeDateStr}', this.value)" style="flex:1 1 0% !important; min-height:0 !important; width:100%; background:none; border:none; color:#ffffff; font-size:0.90rem; line-height:1.45; outline:none; resize:none; font-family:'Pretendard Variable', -apple-system, sans-serif; padding:0; margin:0; box-sizing:border-box;">${(function(m, sList){
              if (!m) return '';
              var lines = m.split('\n');
              var filtered = lines.filter(function(line){
                return !sList.some(function(s){ return line.includes(s.name); });
              });
              return escapeHtml(filtered.join('\n').trim());
            })(currentDayMemo, (function(){
              var pSpots = safeGetJSON('okbm_plan_spots', {});
              var raw = pSpots[activeDateStr];
              return Array.isArray(raw) ? raw : (raw && raw.name ? [raw] : []);
            })())}</textarea>
          </div>
        </div>

     <!-- 4. 하단 2x2 모던 큐브 그리드 (모노크롬 & 정중앙 정렬) -->
        <div style="flex:26 1 0% !important; min-height:0 !important; display:grid; grid-template-columns:1fr 1fr; gap:6px; box-sizing:border-box;">
          
          <div onclick="window.activePlanSubMode='calculator'; window.renderPlanStage(); triggerHaptic(10);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:0 10px; display:flex; justify-content:center; align-items:center; cursor:pointer; box-sizing:border-box;">
            <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
              ${VECTOR_ICONS.calculator}
              <span style="font-size:0.86rem; font-weight:900; color:#ffffff;">패킹 계획하기</span>
            </div>
          </div>

          <div onclick="window.activePlanSubMode='checklist'; window.renderPlanStage(); triggerHaptic(10);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:0 10px; display:flex; justify-content:center; align-items:center; cursor:pointer; box-sizing:border-box;">
            <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
              ${VECTOR_ICONS.checklist}
              <span style="font-size:0.86rem; font-weight:900; color:#ffffff;">체크리스트</span>
            </div>
          </div>

          <div onclick="window.activePlanSubMode='bookmarks'; window.renderPlanStage(); triggerHaptic(10);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:0 10px; display:flex; justify-content:center; align-items:center; cursor:pointer; box-sizing:border-box;">
            <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
              ${VECTOR_ICONS.bookmarks}
              <span style="font-size:0.86rem; font-weight:900; color:#ffffff;">찜 목록</span>
            </div>
          </div>

          <div onclick="window.activePlanSubMode='gears'; window.renderPlanStage(); triggerHaptic(10);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:0 10px; display:flex; justify-content:center; align-items:center; cursor:pointer; box-sizing:border-box;">
            <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
              ${VECTOR_ICONS.gears}
              <span style="font-size:0.86rem; font-weight:900; color:#ffffff;">장비관리</span>
            </div>
          </div>
        </div>

 <div id="planBookmarkBackdrop" onclick="window.closeBookmarksBottomSheet();" style="display:none !important; pointer-events:none !important;"></div>
        <div id="planBookmarkSlideSheet" class="calc-slide-sheet" style="max-height:67% !important; height:67% !important; border-top:1px solid rgba(255,255,255,0.16) !important; background:#0b0f17 !important; z-index:1000020 !important;">
          <div style="padding:12px 14px 8px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:6px; font-size:0.84rem; font-weight:800; color:#f1f5f9;">
              <span id="planBookmarkSheetTitle">가보고 싶은 곳</span>
            </div>
            <button type="button" onclick="window.closeBookmarksBottomSheet();" style="background:none; border:none; color:#64748b; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
          </div>
          <div id="planBookmarkSheetList" style="flex:1; overflow-y:auto; padding:10px 14px; display:flex; flex-direction:column; gap:6px; overscroll-behavior-y:contain; -webkit-overflow-scrolling:touch;"></div>
        </div>
      </div>
    `;

  window.openBookmarksBottomSheet = function() {
    var sheet = document.getElementById('planBookmarkSlideSheet');
    var listContainer = document.getElementById('planBookmarkSheetList');
    var titleEl = document.getElementById('planBookmarkSheetTitle');
    if (!sheet || !listContainer) return;

    var bookmarks = safeGetJSON('okbm_bookmarks', []);
    var spotList = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) ? registeredSpots : safeGetJSON('okbm_spots_cache', []);
    var bookmarkedSpots = bookmarks.map(function(sId) {
      var found = spotList.find(function(s) { return String(s.id).trim() === String(sId).trim(); });
      return {
        id: sId,
        name: found ? (found.fullName || found.name) : ('장소 #' + sId),
        elevation: found && found.elevation ? (found.elevation + 'm') : (found ? found.region : '전국')
      };
    });

    if (titleEl) titleEl.innerText = '가보고 싶은 곳 (' + bookmarkedSpots.length + '곳)';

    if (bookmarkedSpots.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center; padding:35px 0; color:#64748b; font-size:0.75rem; line-height:1.6;">찜해둔 장소가 없습니다.<br>전국지도에서 가보고 싶은 곳을 찜해보세요!</div>';
    } else {
      listContainer.innerHTML = bookmarkedSpots.map(function(s) {
        var safeName = escapeHtml(s.name);
        var safeElev = escapeHtml(s.elevation);
        return `
          <div data-spot="${safeName}" onclick="localStorage.setItem('okbm_target_spot', this.dataset.spot); location.href='map.html?spot=' + encodeURIComponent(this.dataset.spot);" style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:9px 11px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;">
            <div style="flex:1; min-width:0; padding-right:8px;">
              <div style="font-size:0.80rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</div>
              <div style="font-size:0.60rem; color:#64748b; margin-top:2px;">위치: ${safeElev} · <span style="color:#94a3b8; text-decoration:underline;">지도 보기</span></div>
            </div>
            <button type="button" data-spot="${safeName}" data-elevation="${safeElev}" onclick="event.stopPropagation(); window.selectPlanDestination(this.dataset.spot, this.dataset.elevation);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#f1f5f9; font-size:0.68rem; font-weight:800; padding:5px 10px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap;">
              일정 등록
            </button>
          </div>
        `;
      }).join('');
    }

    sheet.style.display = 'flex';
    setTimeout(function() { sheet.classList.add('active'); }, 10);
  };

  window.closeBookmarksBottomSheet = function() {
    var sheet = document.getElementById('planBookmarkSlideSheet');
    if (sheet) {
      sheet.classList.remove('active');
      setTimeout(function() { sheet.style.display = 'none'; }, 250);
    }
  };
 // 2. 실전 패킹 체크리스트 뷰
    var SOFT_THEMES = {
      shelter:     { color: '#34d399', bg: 'rgba(52, 211, 153, 0.09)', border: 'rgba(52, 211, 153, 0.28)' },
      sleep:       { color: '#34d399', bg: 'rgba(52, 211, 153, 0.09)', border: 'rgba(52, 211, 153, 0.28)' },
      pack:        { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.09)', border: 'rgba(251, 191, 36, 0.28)' },
      food:        { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.09)', border: 'rgba(251, 146, 60, 0.28)' },
      kitchen:     { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.09)', border: 'rgba(251, 146, 60, 0.28)' },
      wear:        { color: '#c084fc', bg: 'rgba(192, 132, 252, 0.09)', border: 'rgba(192, 132, 252, 0.28)' },
      electronics: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.09)', border: 'rgba(56, 189, 248, 0.28)' },
      camp:        { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.09)', border: 'rgba(56, 189, 248, 0.28)' }
    };

   var currentDaySpotMatch = currentDayMemo.match(/📍\s*(?:목적지:\s*)?([^\n\r(]+)/);
    var spotTitle = currentDaySpotMatch ? currentDaySpotMatch[1].trim() : (currentDayMemo ? currentDayMemo.split('\n')[0].slice(0, 20) : '자유 일정');
    var isAllComplete = planItems.length > 0 && packedCount === planItems.length;

    var checklistViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; justify-content:space-between; gap:6px; padding:2px 0 0 0; overflow:hidden; box-sizing:border-box;">
        
        <!-- 🏛️ 1. 상단 요약 헤더 -->
        <div onclick="window.togglePlanTripDateInlineDropdown(event);" style="position:relative; background:linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(15,23,42,0.7) 100%); border:1px solid rgba(255,255,255,0.12); border-top:1px solid rgba(255,255,255,0.22); border-radius:12px; padding:10px 14px; flex-shrink:0; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; box-shadow:0 4px 16px rgba(0,0,0,0.5); z-index:50; cursor:pointer;">
          <div style="display:flex; flex-direction:column; gap:3px; min-width:0; flex:1; padding-right:12px;">
            <div style="font-size:0.74rem; color:#38bdf8; font-family:'Space Grotesk', sans-serif; font-weight:800; letter-spacing:0.3px; display:flex; align-items:center; gap:4px;">
              <span>${activeDateStr}</span>
              <span style="font-size:0.68rem; color:#94a3b8;">▾</span>
            </div>
            <div style="font-size:0.96rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:-0.01em;">${escapeHtml(spotTitle)}</span>
            </div>
          </div>
          
          <div style="display:flex; align-items:center; flex-shrink:0;" onclick="event.stopPropagation();">
            <button type="button" onclick="window.toggleAllPackCheckItems(${!isAllComplete}, '${activeDateStr}')" style="background:${isAllComplete ? 'rgba(253,224,71,0.12)' : 'rgba(255,255,255,0.08)'}; border:1px solid ${isAllComplete ? 'rgba(253,224,71,0.4)' : 'rgba(255,255,255,0.18)'}; color:${isAllComplete ? '#fde047' : '#f8fafc'}; font-size:0.72rem; font-weight:800; padding:6px 12px; border-radius:6px; cursor:pointer; transition:all 0.15s ease;">
              ${isAllComplete ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <!-- 인라인 일정 아코디언 드롭다운 -->
          <div id="calcTripDateDropdown" style="display:none; position:absolute; top:54px; left:0; right:0; z-index:700; background:#0d121d; border:1.5px solid rgba(56,189,248,0.4); border-radius:8px; padding:8px; flex-direction:column; gap:6px; box-shadow:0 16px 40px rgba(0,0,0,0.95); box-sizing:border-box;"></div>
        </div>

        <!-- 📋 2. 체크리스트 목록 영역 -->
        <div id="checklistItemsScrollContainer" style="flex:1 1 0% !important; min-height:0 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; overscroll-behavior-y:contain !important; overscroll-behavior:contain !important; touch-action:pan-y !important; display:flex; flex-direction:column; gap:5px; padding-right:2px;">
        ${planItems.map(function(it, idx) {
            var checkKey = activeDateStr + '__' + it.name;
            var isChecked = window.packedCheckSet && window.packedCheckSet.has(checkKey);
            var gWeightKg = (it.weight / 1000).toFixed(2);
            var isFood = it.isConsumable === true;
            var theme = SOFT_THEMES[it.categoryId] || { color: '#cbd5e1', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)' };

            var rowBg = isChecked ? 'rgba(253,224,71,0.05)' : 'rgba(15,23,42,0.5)';
            var rowBorder = isChecked ? 'rgba(253,224,71,0.3)' : 'rgba(255,255,255,0.08)';
            var rowBorderLeft = isChecked ? '2px solid rgba(253,224,71,0.85)' : ('2px solid ' + theme.border);
            var chkBoxBorder = isChecked ? '#fde047' : 'rgba(255,255,255,0.3)';
            var chkBoxBg = isChecked ? 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)' : 'rgba(0,0,0,0.35)';

            return `
              <div onclick="window.togglePackCheckByIndex(${idx})" class="checklist-item-row" style="background:${rowBg}; border:1px solid ${rowBorder}; border-left:${rowBorderLeft};">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <div class="checklist-checkbox-box" style="border:1.2px solid ${chkBoxBorder}; background:${chkBoxBg};">
                    ${isChecked ? '✓' : ''}
                  </div>

                  <span style="font-size:0.83rem; font-weight:800; color:${isChecked ? '#94a3b8' : '#ffffff'}; text-decoration:${isChecked ? 'line-through' : 'none'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:5px;">
                    ${isFood ? '<span style="display:inline-flex; align-items:center; width:13px; height:13px; color:#fb923c;">' + UI_ICONS.foodUtensils + '</span>' : ''}
                    <span>${escapeHtml(it.name || '')}</span>
                  </span>
                </div>

                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:${isChecked ? '#94a3b8' : theme.color}; font-family:'JetBrains Mono', monospace; background:${isChecked ? 'rgba(255,255,255,0.04)' : theme.bg}; border:1px solid ${isChecked ? 'rgba(255,255,255,0.1)' : theme.border}; padding:1px 6px; border-radius:4px;">
                    ${gWeightKg > 0 ? (gWeightKg + 'kg') : '0.00kg'}
                  </span>
                  ${isFood ? `
                    <button type="button" onclick="event.stopPropagation(); window.removeChecklistConsumableItem('${it.id}', event)" style="background:rgba(244,63,94,0.1); border:1px solid rgba(244,63,94,0.25); color:#fda4af; font-size:0.58rem; padding:1.5px 4.5px; border-radius:3px; cursor:pointer;">✕</button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 3. 하단 음식/소모품 즉시 추가 바 -->
        <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.12); border-radius:9px; padding:6px 8px; display:flex; gap:5px; align-items:center; flex-shrink:0; box-sizing:border-box;">
          <span style="display:inline-flex; align-items:center; width:14px; height:14px; color:#fb923c; flex-shrink:0;">${UI_ICONS.foodUtensils}</span>
          <input type="text" id="inputChecklistFoodName" placeholder="음식·간식·소모품 추가 (예: 전투식량, 간식)" onkeydown="if(event.key==='Enter') window.addChecklistConsumableItem();" style="flex:1; min-width:0; height:32px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.14); border-radius:6px; color:#fff; font-size:0.74rem; padding:0 8px; outline:none;" />
          <input type="number" id="inputChecklistFoodWeight" placeholder="무게g" onkeydown="if(event.key==='Enter') window.addChecklistConsumableItem();" style="width:58px; height:32px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.14); border-radius:6px; color:#fff; font-size:0.74rem; padding:0 5px; outline:none; font-family:'JetBrains Mono', monospace;" />
          <button type="button" onclick="window.addChecklistConsumableItem();" style="height:32px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#f8fafc; font-size:0.72rem; font-weight:900; padding:0 10px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap;">
            + 추가
          </button>
        </div>

        <!-- 4. 최하단 프로그레스 게이지 완료 독 -->
        <div style="position:relative; width:100%; height:44px; border-radius:10px; overflow:hidden; border:1px solid ${isAllComplete ? 'rgba(253,224,71,0.6)' : 'rgba(255,255,255,0.2)'}; background:rgba(15,23,42,0.7); flex-shrink:0; box-shadow:${isAllComplete ? '0 4px 16px rgba(253,224,71,0.3)' : '0 4px 14px rgba(0,0,0,0.5)'}; transition:all 0.25s ease;">
          <div style="position:absolute; top:0; left:0; bottom:0; width:${planProgressPct}%; background:linear-gradient(90deg, rgba(253,224,71,0.2) 0%, rgba(245,158,11,0.55) 100%); transition:width 0.25s ease; pointer-events:none;"></div>
          <button type="button" onclick="window.completeChecklist('${activeDateStr}');" style="position:relative; z-index:2; width:100%; height:100%; background:none; border:none; color:#ffffff; font-size:0.84rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:${isAllComplete ? '#fde047' : '#ffffff'}; fill:none; stroke-width:2.5;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${isAllComplete ? '패킹 체크 100% 완료' : ('패킹 체크 완료 (' + packedCount + '/' + planItems.length + ' · ' + planProgressPct + '%)')}</span>
          </button>
        </div>
      </div>
    `;
/// 3. 군더더기 제로 단일 패킹 캔버스 뷰 (검색 + 전체리본 + 90% 선반 + SVG 듀얼 하단독)
    var calcSpotName = (window.currentLuckySpot && window.currentLuckySpot.name) 
      ? window.currentLuckySpot.name 
      : (spotTitle !== '자유 출정 일정' ? spotTitle : '출발 준비 완료!');
    var calcSpotElev = (window.currentLuckySpot && window.currentLuckySpot.elevation) 
      ? (String(window.currentLuckySpot.elevation).includes('m') ? ('(' + window.currentLuckySpot.elevation + ')') : ('(' + window.currentLuckySpot.elevation + 'm)')) 
      : '';

 var calculatorViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">
        
        <!-- 상단 컨트롤 헤더 (출정바 38px + 5:5무게대시보드 88px + 검색창 32px + 균등탭 30px) -->
        <div style="flex:0 0 auto !important; display:flex; flex-direction:column; padding:2px 0; box-sizing:border-box; gap:5px; flex-shrink:0; position:relative; z-index:20;">
          
        <!-- 1. 최상단 출정 브리핑 바 (원터치 일정 변경 통합 & 여유로운 폰트 레이아웃) -->
          <div onclick="window.togglePlanTripDateInlineDropdown(event);" style="height:42px !important; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; flex-shrink:0; cursor:pointer; transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
              <span style="font-size:0.82rem; font-family:'Space Grotesk', sans-serif; font-weight:800; color:#e2e8f0; display:flex; align-items:center; gap:4px; flex-shrink:0; letter-spacing:0.2px;">
                ${PLAN_SVG.calendar} <span>${activeDateStr}</span>
              </span>
              <div style="font-size:0.86rem; font-weight:800; color:#ffffff; display:flex; align-items:center; gap:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <span style="color:#94a3b8; display:inline-flex; align-items:center;">${PLAN_SVG.pin}</span>
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:-0.01em;">${escapeHtml(calcSpotName)}</span>
                ${calcSpotElev ? `<span style="font-size:0.72rem; color:#94a3b8; font-weight:700; flex-shrink:0; margin-left:1px;">${escapeHtml(calcSpotElev)}</span>` : ''}
              </div>
            </div>
            <span style="font-size:0.74rem; color:#94a3b8; font-weight:800; display:flex; align-items:center; gap:2px; flex-shrink:0; margin-left:6px;">
              <span>목록</span>
              <span style="font-size:0.68rem; color:#cbd5e1;">▾</span>
            </span>
          </div>

          <!-- 1-1. 인라인 출정 일정 아코디언 드롭다운 -->
          <div id="calcTripDateDropdown" style="display:none; position:absolute; top:42px; left:0; right:0; z-index:700; background:#0b0f17; border:1px solid rgba(255,255,255,0.18); border-radius:8px; padding:8px; flex-direction:column; gap:6px; box-shadow:0 16px 40px rgba(0,0,0,0.95); box-sizing:border-box;"></div>

          <!-- 2. 대시보드 (5:5 완벽 좌우 분할, 높이 88px) -->
          <div class="weight-dashboard-strip">
            
            <!-- 좌측 50% 박스 (무게 연산) -->
            <div class="weight-pod-box">
              <div style="display:flex; justify-content:space-between; align-items:baseline;">
                <span style="font-size:0.70rem; font-weight:800; color:#94a3b8;">배낭 총무게</span>
                <span id="planTotalWeightGramsText" style="font-size:0.60rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${totalGrams.toLocaleString()} g</span>
              </div>
              <span class="weight-val-big" id="planTotalWeightKgText">${totalKgStr} kg</span>
              <div style="display:flex; flex-direction:column; gap:2px;">
                <div id="planBplStatusBadge" class="weight-bpl-badge">${(totalGrams <= 6000) ? 'UL 초경량 (≤6kg)' : '스탠다드 (6~14kg)'}</div>
                <div class="weight-gauge-bg">
                  <div class="weight-gauge-fill" id="planWeightGaugeFill" style="width:${Math.min(100, Math.round((totalGrams / 14000) * 100))}%;"></div>
                </div>
              </div>
            </div>

            <!-- 우측 50% 박스 (담긴 장비 뷰어 - 클릭 시 토글) -->
            <div class="weight-pod-box" id="planRecentGearBox" onclick="var p=document.getElementById('calcPackedItemsPopover'); if(p){ p.style.display=(p.style.display==='flex'?'none':'flex'); }" style="cursor:pointer; background:rgba(255,255,255,0.035) !important;"></div>

          </div>

          <!-- 3. 통합 검색창 및 직접 등록 버튼 바 -->
          <div style="display:flex; gap:5px; align-items:center; width:100%; flex-shrink:0; box-sizing:border-box;">
            <div style="height:34px !important; position:relative; flex:1; min-width:0; display:flex; align-items:center;">
              <div style="position:absolute; left:9px; color:#64748b; display:flex; align-items:center; pointer-events:none;">
                ${PLAN_SVG.search}
              </div>
              <input type="text" id="calcShelfSearchInput" placeholder="브랜드, 장비명 검색..." oninput="window.handleCalcShelfSearch(this.value)" style="width:100%; height:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09); border-radius:6px; color:#e2e8f0; font-size:0.75rem; padding:0 28px 0 28px; outline:none; box-sizing:border-box;" />
              <button type="button" id="btnCalcSearchClear" onclick="window.clearCalcShelfSearch()" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.12); border:none; color:#cbd5e1; width:16px; height:16px; border-radius:50%; font-size:0.6rem; cursor:pointer; align-items:center; justify-content:center; padding:0;">✕</button>
            </div>
            <button type="button" onclick="window.openQuickGearRegisterModal()" style="height:34px !important; min-width:62px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#ffffff; font-size:0.70rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; padding:0 8px;">
              + 등록
            </button>
          </div>

          <!-- 4. 카테고리 탭 리본 (균등 76px 고정) -->
          <div id="calcCategoryTabsBar" style="height:30px !important; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; align-items:center; box-sizing:border-box; flex-shrink:0;"></div>
        </div>

       <!-- 2-1. 담긴 장비 하단 펼침 명세 -->
        <div id="calcPackedItemsPopover" class="gear-popover-sheet">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; flex-shrink:0;">
            <span style="font-size:0.84rem; font-weight:900; color:rgba(241,245,249,0.92); display:flex; align-items:center; gap:5px;">
              ${PLAN_SVG.backpack}
              <span>담긴 장비 명세</span>
            </span>
            <button type="button" onclick="document.getElementById('calcPackedItemsPopover').style.display='none';" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
          </div>
          <div id="calcPackedItemsListContainer" style="flex:1; overflow-y:auto; margin-top:8px; display:flex; flex-direction:column; gap:5px;"></div>
        </div>

        <!-- 5. 화면 풀 장비 선반 -->
        <div id="calcGearShelfList" style="flex:1 1 0% !important; min-height:0 !important; overflow-y:auto !important; display:flex; flex-direction:column; gap:4px; padding-right:1px; margin-top:2px; margin-bottom:0 !important;"></div>

        <!-- 6. 하단 3분할 액션 독 ([초기화] + [내 장비 세트] + [카드로 저장]) -->
        <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.08); padding:6px 0 2px 0; margin:0 !important; display:grid; grid-template-columns:1fr 1.1fr 1.3fr; gap:5px; align-items:center; box-sizing:border-box;">
          <button type="button" onclick="window.resetPlanCalculatorGears();" style="height:38px; background:rgba(244,63,94,0.06); border:1px solid rgba(244,63,94,0.2); color:#fda4af; font-size:0.72rem; font-weight:800; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; padding:0 2px;">
            ${PLAN_SVG.reset}
            <span>초기화</span>
          </button>
          <button type="button" onclick="window.openQuickPresetPicker();" style="height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; font-size:0.72rem; font-weight:800; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; white-space:nowrap; padding:0 2px;">
            ${PLAN_SVG.backpack}
            <span>내 장비 세트</span>
          </button>
          <button type="button" onclick="window.saveCurrentPackingRecord();" style="height:38px; background:rgba(255,255,255,0.12) !important; border:1px solid rgba(255,255,255,0.2) !important; color:rgba(241,245,249,0.92) !important; font-size:0.72rem !important; font-weight:800 !important; border-radius:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; white-space:nowrap; padding:0 2px;">
            ${PLAN_SVG.cardCamera}
            <span>카드로 저장 ➔</span>
          </button>
        </div>

        <!-- 7. 내 장비 세트 인라인 슬라이드 시트 -->
        <div id="calcPresetBackdrop" onclick="window.closeQuickPresetPicker();" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000018;"></div>
        <div id="calcPresetSlideSheet" class="calc-slide-sheet">
          <div style="padding:12px 14px 8px 14px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:5px; font-size:0.85rem; font-weight:800; color:#f1f5f9;">
              ${PLAN_SVG.presetStack}
              <span>내 장비 세트 선택</span>
            </div>
            <button type="button" onclick="window.closeQuickPresetPicker();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
          </div>
          <div id="calcPresetSheetList" style="flex:1; overflow-y:auto; padding:10px 14px; display:flex; flex-direction:column; gap:6px;"></div>
          <div style="padding:8px 14px 12px 14px; border-top:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
            <button type="button" onclick="window.closeQuickPresetPicker(); window.saveCurrentGearsAsPreset();" style="width:100%; height:38px; background:rgba(255,255,255,0.05); border:1px dashed rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer;">
              + 현재 배낭을 새 세트로 저장
            </button>
          </div>
        </div>

      </div>
    `;

// 4. [가보고 싶은 곳] 찜 목록 뷰 (슬림 카드 & 목적지 설정)
    var bookmarks = safeGetJSON('okbm_bookmarks', []);
    var spotList = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots)) ? registeredSpots : safeGetJSON('okbm_spots_cache', []);

    var bookmarkedSpots = bookmarks.map(function(sId) {
      var found = spotList.find(function(s) { return String(s.id).trim() === String(sId).trim(); });
      var spotName = found ? (found.fullName || found.name) : ('장소 #' + sId);
      
      var elevStr = '';
      if (found && found.elevation) {
        var rawElev = String(found.elevation).replace(/m$/i, '').trim();
        if (rawElev) elevStr = rawElev + 'm';
      }

      var addrStr = '';
      if (found) {
        var rawAddr = String(found.address || found.roadAddress || '').trim();
        if (rawAddr) {
          var addrParts = rawAddr.split(/\s+/);
          addrStr = addrParts.slice(0, 2).join(' ');
        }
        if (!addrStr) {
          addrStr = String(found.region || '').trim();
        }
      }

      var metaLine = [elevStr, addrStr].filter(Boolean).join(' · ') || '위치 정보 없음';

      return {
        id: sId,
        name: spotName,
        elevation: elevStr,
        metaLine: metaLine
      };
    });

    var bookmarksViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0 4px 0; overflow:hidden; box-sizing:border-box;">
        
        <!-- 1. 상단 달력 카드 (전체 뷰포트 31% 정밀 적응형) -->
        <div id="planCalendarCardWrap" style="height:31% !important; min-height:236px !important; flex-shrink:0 !important; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; height:34px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:5px;">
              <button type="button" onclick="window.changePlanMonth(-1)" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:#ffffff; width:28px; height:28px; border-radius:7px; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">◀</button>
              <button type="button" onclick="window.openPlanYearPicker(event)" style="height:28px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; padding:0 10px; border-radius:7px; font-size:0.92rem; font-weight:900; cursor:pointer; font-family:'Space Grotesk', sans-serif; display:flex; align-items:center; gap:3px;">
                <span>${viewYear}년</span>
                <span style="font-size:0.75rem; color:#94a3b8;">▾</span>
              </button>
              <span style="font-size:0.95rem; font-weight:900; color:#ffffff; margin:0 3px; font-family:'Space Grotesk', sans-serif;">${viewMonth}월</span>
              <button type="button" onclick="window.changePlanMonth(1)" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); color:#ffffff; width:28px; height:28px; border-radius:7px; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">▶</button>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" onclick="window.jumpToPlanToday()" style="height:26px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#ffffff; font-size:0.72rem; font-weight:800; padding:0 8px; border-radius:6px; cursor:pointer;">오늘</button>
              <span style="font-size:0.74rem; color:rgba(217,180,99,0.9); font-weight:900; display:flex; align-items:center; gap:3px;">${UI_ICONS.starGold}<span>완료</span></span>
              <span style="font-size:0.74rem; color:#34d399; font-weight:900; display:flex; align-items:center; gap:3px;">${UI_ICONS.flagGreen}<span>계획</span></span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.72rem; font-weight:900; color:#94a3b8; height:20px; line-height:20px; flex-shrink:0; letter-spacing:0.5px; margin-top:8px; margin-bottom:4px;">
            <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#cbd5e1;">토</span>
          </div>
          
          <div style="flex:1 1 0%; min-height:0; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:repeat(6, 1fr); gap:2px; text-align:center;">
            ${calendarDaysHtml}
          </div>
        </div>

        <!-- 2. 하단 찜 목록 박스 -->
        <div style="flex:1 1 0% !important; min-height:0 !important; display:flex; flex-direction:column; gap:5px; overflow:hidden; box-sizing:border-box;">
          <div style="padding:2px 4px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:5px; font-size:0.82rem; font-weight:900; color:rgba(217,180,99,0.95);">
              ${UI_ICONS.starGold}
              <span>가보고 싶은 곳 (${bookmarkedSpots.length}곳)</span>
            </div>
            <span style="font-size:0.65rem; color:#94a3b8; font-weight:700;">목적지 설정 후 날짜를 터치하세요</span>
          </div>

          <div style="flex:1 1 0% !important; min-height:0 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; overscroll-behavior-y:contain !important; touch-action:pan-y !important; display:flex; flex-direction:column; gap:4px; padding-right:1px;">
            ${bookmarkedSpots.length === 0 ? `
              <div style="text-align:center; padding:35px 0; color:#94a3b8; font-size:0.75rem; line-height:1.6;">
                찜해둔 장소가 없습니다.<br>
                전국지도에서 가보고 싶은 곳을 찜해보세요.
              </div>
            ` : bookmarkedSpots.map(function(s) {
                var safeName = escapeHtml(s.name);
                var safeElev = escapeHtml(s.elevation);
                var safeMeta = escapeHtml(s.metaLine);
                return `
                  <div data-spot="${safeName}" onclick="location.href='map.html?spot=' + encodeURIComponent(this.dataset.spot);" style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-left:1.5px solid rgba(217,180,99,0.6); border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; flex-shrink:0;">
                    <div style="flex:1; min-width:0; padding-right:10px;">
                      <div style="font-size:0.82rem; font-weight:900; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${safeName}
                      </div>
                      <div style="font-size:0.63rem; color:#94a3b8; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Pretendard Variable', sans-serif;">
                        ${safeMeta}
                      </div>
                    </div>
                    <button type="button" data-spot="${safeName}" data-elevation="${safeElev}" onclick="event.stopPropagation(); window.selectPlanDestination(this.dataset.spot, this.dataset.elevation);" style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.18); color:#e2e8f0; font-size:0.68rem; font-weight:800; padding:5px 10px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap; transition:all 0.15s ease;">
                      목적지로 설정
                    </button>
                  </div>
                `;
              }).join('')}
          </div>
        </div>

      </div>
    `;

    // 5. 내 장비관리 뷰 연산 및 렌더링 엔진
    var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
    var customGears = safeGetJSON('okbm_custom_gears', []);
    var allGearsPool = [];
    (window.CATEGORIES || []).forEach(function(c) {
      (c.db || []).forEach(function(g) { allGearsPool.push(Object.assign({ categoryId: c.id }, g)); });
    });
    customGears.forEach(function(cg) {
      if (!allGearsPool.some(function(g) { return g.name === cg.name; })) {
        allGearsPool.push(Object.assign({ categoryId: cg.category_id || 'shelter' }, cg));
      }
    });

    var favList = Array.from(window.favoriteGearSet || []);
    var myFavGears = favList.map(function(name) {
      var found = allGearsPool.find(function(g) { return g.name === name; });
      return found || { id: 'fav_' + name, name: name, weight: 0, brand: '내 장비', categoryId: 'shelter' };
    });

    myFavGears.sort(function(a, b) {
      var aTime = (a.id && String(a.id).startsWith('custom_')) ? parseInt(String(a.id).split('_')[1], 10) : 0;
      var bTime = (b.id && String(b.id).startsWith('custom_')) ? parseInt(String(b.id).split('_')[1], 10) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name, 'ko');
    });

    var activeCatFilter = window.__activeGearCategoryFilter || 'all';
    var filteredFavGears = (activeCatFilter === 'all')
      ? myFavGears
      : myFavGears.filter(function(g) { return g.categoryId === activeCatFilter; });

    var CATEGORY_PALETTE = {
      fav:         { color: '#fde047', label: '⭐ 내장비', bg: 'rgba(253,224,71,0.08)',  border: 'rgba(253,224,71,0.25)' },
      all:         { color: '#e2e8f0', label: '전체',     bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.22)' },
      shelter:     { color: '#10b981', label: '텐트·타프', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
      sleep:       { color: '#14b8a6', label: '침낭·매트', bg: 'rgba(20,184,166,0.08)',  border: 'rgba(20,184,166,0.25)' },
      pack:        { color: '#f43f5e', label: '배낭',     bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.25)' },
      food:        { color: '#f97316', label: '음식',     bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)' },
      kitchen:     { color: '#84cc16', label: '취사',     bg: 'rgba(132,204,22,0.08)',  border: 'rgba(132,204,22,0.25)' },
      wear:        { color: '#a855f7', label: '의류',     bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.25)' },
      electronics: { color: '#eab308', label: '기기·소품', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)' },
      camp:        { color: '#06b6d4', label: '테이블·체어',bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.25)' }
    };

    var catChips = [
      { id: 'all', label: '전체' },
      { id: 'shelter', label: '텐트·타프' },
      { id: 'sleep', label: '침낭·매트' },
      { id: 'pack', label: '배낭' },
      { id: 'food', label: '음식' },
      { id: 'kitchen', label: '취사' },
      { id: 'wear', label: '의류' },
      { id: 'electronics', label: '기기·소품' },
      { id: 'camp', label: '테이블·체어' }
    ];

    var currentCatChip = catChips.find(function(c) { return c.id === activeCatFilter; });
    var investLabelText = (activeCatFilter === 'all') ? '총 투자 금액:' : ((currentCatChip ? currentCatChip.label : '분류') + ' 합계:');

    var targetGearsForSum = (activeCatFilter === 'all') ? myFavGears : filteredFavGears;
    var totalInvestAmount = 0;
    targetGearsForSum.forEach(function(g) {
      var meta = gearMetaObj[g.name] || {};
      totalInvestAmount += parseInt(String(meta.price || '').replace(/[^0-9]/g, ''), 10) || 0;
    });

    var filterChipsHtml = catChips.map(function(c) {
      var isActive = (c.id === activeCatFilter);
      var pal = CATEGORY_PALETTE[c.id] || { color: '#e2e8f0', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.22)' };
      var btnBg = isActive ? pal.bg : 'rgba(255,255,255,0.03)';
      var btnBorder = isActive ? pal.border : 'rgba(255,255,255,0.08)';
      var btnColor = isActive ? pal.color : '#94a3b8';

      return '<button type="button" onclick="window.setGearCategoryFilter(\'' + c.id + '\')" style="background:' + btnBg + '; color:' + btnColor + '; border:1px solid ' + btnBorder + '; font-size:0.67rem; font-weight:' + (isActive ? '900' : '700') + '; padding:4px 10px; border-radius:6px; white-space:nowrap; cursor:pointer; transition:all 0.15s ease;">' + c.label + '</button>';
    }).join('');

    var gearsViewHtml = `
      <div id="planGearsScrollArea" style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:8px; padding:2px 0; overflow-y:auto !important; overscroll-behavior:none !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; box-sizing:border-box;">
        
        <div style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.18); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-sizing:border-box;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-size:0.80rem; font-weight:800; color:#f8fafc;">새 장비 직접 등록</span>
            <span style="font-size:0.62rem; color:#64748b;">나만의 장비를 등록하고 관리해보세요</span>
          </div>
          <button type="button" onclick="window.openQuickGearRegisterModal({ addToPack: false });" style="height:32px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#ffffff; font-size:0.72rem; font-weight:800; padding:0 12px; border-radius:6px; cursor:pointer; flex-shrink:0;">
            + 등록하기
          </button>
        </div>

        <div style="background:linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(15,23,42,0.6) 100%); border:1px solid rgba(255,255,255,0.15); border-top:1px solid rgba(255,255,255,0.25); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-shadow:0 4px 14px rgba(0,0,0,0.4);">
          <div style="font-size:0.80rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
            <span>⭐ 내 장비</span>
            <span style="font-size:0.70rem; color:#94a3b8; font-weight:800;" id="mgrFavCountLabel">(${filteredFavGears.length}개)</span>
          </div>
          <div style="display:flex; align-items:baseline; gap:5px;">
            <span style="font-size:0.68rem; color:#94a3b8; font-weight:800;">${investLabelText}</span>
            <span id="mgrTotalInvestText" style="font-size:1.02rem; font-weight:900; color:#fbbf24; font-family:'JetBrains Mono', 'Space Grotesk', monospace; text-shadow:0 1px 6px rgba(251,191,36,0.35);">₩${totalInvestAmount.toLocaleString()}</span>
          </div>
        </div>

        <!-- 가로 스크롤 카테고리 필터 바 -->
        <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; -webkit-overflow-scrolling:touch; flex-shrink:0;">
          ${filterChipsHtml}
        </div>

        <!-- 장비 목록 영역 -->
        <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
          ${filteredFavGears.length === 0 ? `
            <div style="text-align:center; padding:35px 0; color:#64748b; font-size:0.74rem; line-height:1.5;">
              등록된 장비가 없습니다.<br>
              상단에서 직접 등록하거나 배낭계산기에서 ⭐을 눌러보세요.
            </div>
          ` : filteredFavGears.map(function(g) {
            var meta = gearMetaObj[g.name] || { purchaseDate: '', price: '', status: 'ok', memo: '' };
            var curStatus = meta.status || 'ok';
            var pal = CATEGORY_PALETTE[g.categoryId] || { color: '#94a3b8', label: '기타', border: 'rgba(255,255,255,0.12)' };
            var rawPrice = parseInt(String(meta.price || '').replace(/[^0-9]/g, ''), 10);
            var displayPrice = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice.toLocaleString() : '';
            var safeGearNameAttr = escapeHtml(g.name);

            return `
              <div class="my-gear-manage-card" data-gear-name="${safeGearNameAttr}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-left:3.5px solid ${pal.color}; border-radius:8px; padding:7px 10px; display:flex; flex-direction:column; gap:5px; box-sizing:border-box; width:100%;">
                
                <div onclick="window.openGearMetaEditSheet(this.dataset.gear)" data-gear="${safeGearNameAttr}" style="display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%; cursor:pointer;">
                  <div style="flex:1 1 0%; min-width:0;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:0.82rem; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${safeGearNameAttr}
                      </span>
                      <span style="font-size:0.60rem; font-weight:700; color:${curStatus === 'repair' ? '#fda4af' : (curStatus === 'sell' ? '#fde047' : '#94a3b8')}; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:1px 4px; border-radius:3px; flex-shrink:0;">
                        ${curStatus === 'repair' ? '정비요망' : (curStatus === 'sell' ? '방출예정' : '정상')}
                      </span>
                    </div>
                    <div style="font-size:0.60rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; margin-top:2px;">
                      <span style="color:${pal.color}; font-weight:700;">${escapeHtml(pal.label)}</span> · ${escapeHtml(g.brand || '내 장비')} · ${(g.weight / 1000).toFixed(2)}kg
                    </div>
                    <div style="font-size:0.60rem; color:#64748b; font-family:'JetBrains Mono', monospace; margin-top:2px; display:flex; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      ${meta.purchaseDate ? `<span>${escapeHtml(meta.purchaseDate)} 구매</span>` : ''}
                      ${displayPrice ? `<span style="color:#fbbf24; font-weight:700;">₩${escapeHtml(displayPrice)}</span>` : ''}
                      ${meta.memo ? `<span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">· ${escapeHtml(meta.memo)}</span>` : ''}
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; color:#64748b; font-size:1.1rem; flex-shrink:0; padding-left:4px; pointer-events:none;">
                    ›
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

  var currentViewHtml = calendarMemoViewHtml;
    if (window.activePlanSubMode === 'checklist') currentViewHtml = checklistViewHtml;
    else if (window.activePlanSubMode === 'calculator') currentViewHtml = calculatorViewHtml;
    else if (window.activePlanSubMode === 'bookmarks') currentViewHtml = bookmarksViewHtml;
    else if (window.activePlanSubMode === 'gears') currentViewHtml = gearsViewHtml;

    var content = modal.querySelector('.romantic-plan-content');
    if (!content) return;

    content.innerHTML = `
      <div id="planMainViewContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; padding:calc(8px + env(safe-area-inset-top, 0px)) 12px 4px 12px; margin:0 !important; box-sizing:border-box; overflow:hidden !important; overscroll-behavior:none !important;">
        ${currentViewHtml}
      </div>
    `;

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('plan');
    }

    if (window.activePlanSubMode === 'calculator') {
      window.renderPlanCategorySlots();

      // 👆 아래로 쓸어내려 월간 달력으로 원터치 복귀하는 제스처
      var ribbonEl = document.getElementById('weekRibbonSwipeArea');
      if (ribbonEl && !ribbonEl._swipeBound) {
        ribbonEl._swipeBound = true;
        var rStartY = 0;
        ribbonEl.addEventListener('touchstart', function(e) {
          if (!e.touches || e.touches.length !== 1) return;
          rStartY = e.touches[0].clientY;
        }, { passive: true });
        ribbonEl.addEventListener('touchend', function(e) {
          if (!e.changedTouches || e.changedTouches.length !== 1) return;
          var diffY = e.changedTouches[0].clientY - rStartY;
          if (diffY > 35) {
            window.activePlanSubMode = 'calendar';
            window.renderPlanStage();
            triggerHaptic(10);
          }
        }, { passive: true });
      }
    }

    if (typeof window.bindPlanCalendarSwipe === 'function') {
      window.bindPlanCalendarSwipe();
    }
  };
 window.openGearMetaEditSheet = function(gearName) {
    if (!gearName) return;
    var old = document.getElementById('gearMetaEditSheet');
    if (old) old.remove();

    var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
    var meta = gearMetaObj[gearName] || { purchaseDate: '', price: '', status: 'ok', memo: '' };
    var rawPrice = parseInt(String(meta.price || '').replace(/[^0-9]/g, ''), 10);
    var displayPrice = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice.toLocaleString() : '';

    var sheet = document.createElement('div');
    sheet.id = 'gearMetaEditSheet';
    sheet.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:1000030; display:flex; align-items:flex-end; justify-content:center; box-sizing:border-box;';
    sheet.onclick = function(e) { if (e.target === sheet) sheet.remove(); };

    sheet.innerHTML = `
      <div style="width:100%; max-width:480px; background:#07090e; border-top:1.5px solid rgba(255,255,255,0.14); border-radius:16px 16px 0 0; padding:14px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 -12px 35px rgba(0,0,0,0.95); animation:slideUpSheet 0.22s ease-out;">
        <div style="width:36px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 2px auto;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <div style="font-size:0.90rem; font-weight:800; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;">
            ${escapeHtml(gearName)}
          </div>
          <button type="button" onclick="document.getElementById('gearMetaEditSheet').remove();" style="background:none; border:none; color:#64748b; font-size:1.1rem; cursor:pointer; padding:2px 6px;">✕</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:8px;">
            <div style="flex:1;">
              <span style="font-size:0.62rem; color:#94a3b8; font-weight:700; margin-bottom:3px; display:block;">구매일</span>
              <div onclick="window.openRomanticDatePickerModal('editSheetPurchaseDate')" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:6px; display:flex; align-items:center; padding:0 10px; box-sizing:border-box; cursor:pointer;">
                <input type="text" id="editSheetPurchaseDate" placeholder="날짜 선택" value="${escapeHtml(meta.purchaseDate || '')}" readonly style="width:100%; min-width:0; height:100%; background:none; border:none; color:#cbd5e1; font-size:0.78rem; outline:none; font-family:'JetBrains Mono', monospace; padding:0; pointer-events:none;" />
              </div>
            </div>
            <div style="flex:1;">
              <span style="font-size:0.62rem; color:#94a3b8; font-weight:700; margin-bottom:3px; display:block;">구매가 (₩)</span>
              <input type="text" id="editSheetPrice" inputmode="numeric" placeholder="150,000" value="${escapeHtml(displayPrice)}" oninput="window.formatDirectInputPrice(this)" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fbbf24; font-size:0.78rem; font-weight:700; padding:0 10px; outline:none; font-family:'JetBrains Mono', monospace; box-sizing:border-box;" />
            </div>
          </div>
          <div>
            <span style="font-size:0.62rem; color:#94a3b8; font-weight:700; margin-bottom:3px; display:block;">장비 상태</span>
            <select id="editSheetStatus" style="width:100%; height:38px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#f1f5f9; font-size:0.78rem; font-weight:700; padding:0 10px; outline:none; -webkit-appearance:none; appearance:none; box-sizing:border-box;">
              <option value="ok" ${meta.status === 'ok' ? 'selected' : ''} style="background:#07090e; color:#ffffff;">정상</option>
              <option value="repair" ${meta.status === 'repair' ? 'selected' : ''} style="background:#07090e; color:#ffffff;">정비요망</option>
              <option value="sell" ${meta.status === 'sell' ? 'selected' : ''} style="background:#07090e; color:#ffffff;">방출예정</option>
            </select>
          </div>
          <div>
            <span style="font-size:0.62rem; color:#94a3b8; font-weight:700; margin-bottom:3px; display:block;">관리 메모</span>
            <textarea id="editSheetMemo" rows="3" placeholder="상태, 보관 위치, 수리 이력 등 메모를 자유롭게 입력하세요..." style="width:100%; height:72px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#cbd5e1; font-size:0.78rem; line-height:1.45; padding:8px 10px; outline:none; resize:none; box-sizing:border-box; font-family:'Pretendard Variable', -apple-system, sans-serif;">${escapeHtml(meta.memo || '')}</textarea>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
          <button type="button" data-gear="${escapeHtml(gearName)}" onclick="window.saveGearMetaFromSheet(this.dataset.gear)" style="width:100%; height:44px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.22); border-radius:8px; color:#ffffff; font-size:0.82rem; font-weight:800; cursor:pointer;">저장 완료</button>
          ${(function(){
            var cList = safeGetJSON('okbm_custom_gears', []);
            var isC = cList.some(function(cg){ return cg && cg.name === gearName; });
            var delText = isC ? '장비 영구 삭제' : '내 장비에서 해제';
            var msg = isC ? '이 장비를 영구 삭제하시겠습니까?' : '내 장비에서 해제하시겠습니까?';
            return '<button type="button" data-gear="' + escapeHtml(gearName) + '" onclick="window.showRomanticConfirm(\'' + msg + '\', function(){ window.removeFavoriteGearFromManager(\'' + escapeHtml(gearName) + '\'); var s=document.getElementById(\'gearMetaEditSheet\'); if(s) s.remove(); });" style="width:100%; height:36px; background:none; border:none; color:#fda4af; font-size:0.72rem; font-weight:700; cursor:pointer; text-decoration:underline;">' + delText + '</button>';
          })()}
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    triggerHaptic(10);
  };

  window.saveGearMetaFromSheet = function(gearName) {
    var pDateEl = document.getElementById('editSheetPurchaseDate');
    var priceEl = document.getElementById('editSheetPrice');
    var statusEl = document.getElementById('editSheetStatus');
    var memoEl = document.getElementById('editSheetMemo');
    if (!gearName || !pDateEl || !priceEl || !statusEl || !memoEl) return;

    var rawDate = pDateEl.value.trim();
    var pDate = '';
    if (rawDate) {
      var dp = rawDate.match(/\d+/g);
      if (dp && dp.length >= 3) {
        pDate = dp[0].slice(-2) + '.' + String(dp[1]).padStart(2, '0') + '.' + String(dp[2]).padStart(2, '0');
      } else {
        pDate = rawDate;
      }
    }
    var rawPrice = parseInt(priceEl.value.replace(/[^0-9]/g, ''), 10) || 0;
    var status = statusEl.value;
    var memo = memoEl.value.trim();

    var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
    gearMetaObj[gearName] = { purchaseDate: pDate, price: rawPrice, status: status, memo: memo };

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_gear_meta', gearMetaObj, true);
    } else {
      localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    var sheet = document.getElementById('gearMetaEditSheet');
    if (sheet) sheet.remove();

    triggerHaptic(12);
    if (typeof showToast === 'function') showToast('[' + gearName + '] 정보가 저장되었습니다.', 'success');
    window.renderPlanStage();
  };

  window.handleGearPriceInput = function(gearName, inputEl) {
    var rawDigits = (inputEl.value || '').replace(/[^0-9]/g, '');
    var num = parseInt(rawDigits, 10);
    var formatted = !isNaN(num) && num > 0 ? num.toLocaleString() : '';
    inputEl.value = formatted;

    window.updateGearMeta(gearName, 'price', num || 0);
    window.recalculateTotalGearInvest();
  };

  window.recalculateTotalGearInvest = function() {
    var gearMetaObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_gear_meta', {})
      : safeGetJSON('okbm_gear_meta', {});
    var favSet = window.favoriteGearSet || new Set(safeGetJSON('okbm_favorite_gears', []));
    var total = 0;
    favSet.forEach(function(name) {
      var meta = gearMetaObj[name] || {};
      total += parseInt(String(meta.price || '').replace(/[^0-9]/g, ''), 10) || 0;
    });
    var totalEl = document.getElementById('mgrTotalInvestText');
    if (totalEl) totalEl.innerText = '₩' + total.toLocaleString();
  };

  window.formatDirectInputPrice = function(inputEl) {
    var rawDigits = (inputEl.value || '').replace(/[^0-9]/g, '');
    var num = parseInt(rawDigits, 10);
    inputEl.value = !isNaN(num) && num > 0 ? num.toLocaleString() : '';
  };

  window.showRomanticConfirm = function(message, onConfirm) {
    var old = document.getElementById('romanticConfirmModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'romanticConfirmModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:1000060; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div style="width:100%; max-width:320px; background:#07090e; border:1px solid rgba(255,255,255,0.16); border-radius:12px; padding:18px 16px; display:flex; flex-direction:column; gap:14px; box-sizing:border-box; box-shadow:0 12px 35px rgba(0,0,0,0.9);">
        <div style="font-size:0.86rem; font-weight:800; color:#f8fafc; line-height:1.45; text-align:center;">
          ${escapeHtml(message).replace(/\n/g, '<br>')}
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" onclick="document.getElementById('romanticConfirmModal').remove();" style="flex:1; height:42px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#94a3b8; font-size:0.80rem; font-weight:800; cursor:pointer;">취소</button>
          <button type="button" id="btnRomanticConfirmOk" style="flex:1; height:42px; background:rgba(244,63,94,0.14); border:1px solid rgba(244,63,94,0.3); border-radius:8px; color:#fda4af; font-size:0.80rem; font-weight:900; cursor:pointer;">확인</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btnRomanticConfirmOk').onclick = function() {
      modal.remove();
      if (typeof onConfirm === 'function') onConfirm();
    };
    triggerHaptic(10);
  };

  window.openRomanticDatePickerModal = function(targetInputId) {
    var old = document.getElementById('romanticDatePickerModal');
    if (old) old.remove();

    var now = new Date();
    var curY = now.getFullYear();
    var curM = now.getMonth() + 1;

    var modal = document.createElement('div');
    modal.id = 'romanticDatePickerModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:1000055; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    function renderPickerCal(y, m) {
      var firstDay = new Date(y, m - 1, 1).getDay();
      var lastDate = new Date(y, m, 0).getDate();
      var daysHtml = '';
      for (var i = 0; i < firstDay; i++) daysHtml += '<div></div>';
      for (var d = 1; d <= lastDate; d++) {
        var ds = String(d).padStart(2, '0');
        var ms = String(m).padStart(2, '0');
        var ys = String(y).slice(-2);
        var fullVal = ys + '.' + ms + '.' + ds;
        daysHtml += '<div onclick="var t=document.getElementById(\'' + targetInputId + '\'); if(t){ t.value=\'' + fullVal + '\'; t.style.color=\'#cbd5e1\'; } document.getElementById(\'romanticDatePickerModal\').remove();" style="height:34px; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-family:\'Space Grotesk\', sans-serif; font-weight:800; color:#e2e8f0; border-radius:6px; cursor:pointer; background:rgba(255,255,255,0.02);">' + d + '</div>';
      }

      var box = document.getElementById('romanticPickerInnerBox');
      if (!box) return;
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <button type="button" id="btnPickPrevM" style="background:none; border:none; color:#cbd5e1; font-size:1.0rem; cursor:pointer; padding:4px 8px;">◀</button>
          <span style="font-size:0.90rem; font-weight:900; color:#ffffff; font-family:'Space Grotesk', sans-serif;">${y}년 ${m}월</span>
          <button type="button" id="btnPickNextM" style="background:none; border:none; color:#cbd5e1; font-size:1.0rem; cursor:pointer; padding:4px 8px;">▶</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.65rem; font-weight:800; color:#64748b; margin:6px 0;">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:3px; text-align:center;">
          ${daysHtml}
        </div>
      `;
      document.getElementById('btnPickPrevM').onclick = function() { m--; if (m < 1) { m = 12; y--; } renderPickerCal(y, m); };
      document.getElementById('btnPickNextM').onclick = function() { m++; if (m > 12) { m = 1; y++; } renderPickerCal(y, m); };
    }

    modal.innerHTML = '<div id="romanticPickerInnerBox" style="width:100%; max-width:300px; background:#07090e; border:1px solid rgba(255,255,255,0.16); border-radius:12px; padding:14px; display:flex; flex-direction:column; box-sizing:border-box; box-shadow:0 12px 35px rgba(0,0,0,0.9);"></div>';
    document.body.appendChild(modal);
    renderPickerCal(curY, curM);
    triggerHaptic(8);
  };

  window.setGearCategoryFilter = function(catId) {
    window.__activeGearCategoryFilter = catId;
    triggerHaptic(8);
    window.renderPlanStage();
  };

  window.deleteCustomGearCompletely = function(gearName) {
    if (!gearName) return;

    window.showRomanticConfirm('[' + gearName + '] 장비를 영구 삭제하시겠습니까?\n내 장비 및 배낭에서 모두 제거됩니다.', function() {
      var customGears = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
        ? window.RomanticVault.read('okbm_custom_gears', [])
        : safeGetJSON('okbm_custom_gears', []);
      customGears = customGears.filter(function(cg) { return cg && cg.name !== gearName; });

      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_custom_gears', customGears, false);
      } else {
        localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
      }

      if (window.favoriteGearSet) {
        window.favoriteGearSet.delete(gearName);
        var favArr = Array.from(window.favoriteGearSet);
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_favorite_gears', favArr, false);
        } else {
          localStorage.setItem('okbm_favorite_gears', JSON.stringify(favArr));
        }
      }

      var gearMetaObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
        ? window.RomanticVault.read('okbm_gear_meta', {})
        : safeGetJSON('okbm_gear_meta', {});
      if (gearMetaObj[gearName]) {
        delete gearMetaObj[gearName];
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_gear_meta', gearMetaObj, false);
        } else {
          localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
        }
      }

      var gearMap = window.selectedGearMap || safeGetJSON('okbm_selected_gears_multi', {});
      var isRemovedFromPack = false;
      Object.keys(gearMap).forEach(function(catKey) {
        if (Array.isArray(gearMap[catKey])) {
          var prevLen = gearMap[catKey].length;
          gearMap[catKey] = gearMap[catKey].filter(function(it) { return it && it.name !== gearName; });
          if (gearMap[catKey].length !== prevLen) isRemovedFromPack = true;
        }
      });

      if (isRemovedFromPack) {
        window.selectedGearMap = gearMap;
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_selected_gears_multi', gearMap, false);
        } else {
          localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(gearMap));
        }
      }

      (window.CATEGORIES || []).forEach(function(cat) {
        if (Array.isArray(cat.db)) {
          cat.db = cat.db.filter(function(d) { return d && d.name !== gearName; });
        }
      });

      if (typeof syncUserDataToCloud === 'function') {
        syncUserDataToCloud();
      }

      triggerHaptic(12);
      if (typeof showToast === 'function') showToast('[' + gearName + '] 장비가 영구 삭제되었습니다.', 'info');
      window.renderPlanCategorySlots();
    });
  };

  window.removeFavoriteGearFromManager = function(gearName, btnEl) {
    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.delete(gearName);
    var favArr = Array.from(window.favoriteGearSet);

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_favorite_gears', favArr, false);
    } else {
      localStorage.setItem('okbm_favorite_gears', JSON.stringify(favArr));
    }

    var customGears = safeGetJSON('okbm_custom_gears', []);
    var isCustom = customGears.some(function(cg) { return cg && cg.name === gearName; });
    if (isCustom) {
      customGears = customGears.filter(function(cg) { return cg && cg.name !== gearName; });
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_custom_gears', customGears, false);
      } else {
        localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
      }

      var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
      delete gearMetaObj[gearName];
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_gear_meta', gearMetaObj, true);
      } else {
        localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
      }
    }

    triggerHaptic(10);
    if (typeof showToast === 'function') showToast(isCustom ? '[' + gearName + '] 삭제 완료' : '[' + gearName + '] 내 장비 해제', 'info');

    if (btnEl) {
      var card = btnEl.closest('.my-gear-manage-card');
      if (card) {
        card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(function() {
          card.remove();
          var countLabel = document.getElementById('mgrFavCountLabel');
          if (countLabel && window.favoriteGearSet) {
            countLabel.innerText = '⭐ 내 장비 프로필 관리 (' + window.favoriteGearSet.size + '개)';
          }
        }, 200);
        return;
      }
    }

    var scrollBox = document.getElementById('planGearsScrollArea');
    var savedScrollTop = scrollBox ? scrollBox.scrollTop : 0;
    window.renderPlanStage();
    var newScrollBox = document.getElementById('planGearsScrollArea');
    if (newScrollBox) newScrollBox.scrollTop = savedScrollTop;
  };

  window.saveCurrentGearsAsPreset = function() {
    var gearMap = window.selectedGearMap || {};
    var totalGrams = 0, totalCount = 0;
    Object.keys(gearMap).forEach(function(catId) {
      (gearMap[catId] || []).forEach(function(it) {
        totalGrams += Number(it.weight || 0);
        totalCount++;
      });
    });

    if (totalCount === 0) {
      if (typeof showToast === 'function') showToast('먼저 배낭계산기에서 장비를 1개 이상 담아주세요.', 'warn');
      return;
    }

    var defaultName = (totalGrams <= 6000) ? '3계절 BPL 세트' : '기본 패킹 세트';
    var presetName = prompt('새 패킹 세트의 이름을 입력하세요:\n(예: 3계절 BPL, 극동계 똥바람 세트, 퇴근박)', defaultName);
    if (!presetName || !presetName.trim()) return;

    var presets = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_gear_presets', [])
      : safeGetJSON('okbm_gear_presets', []);
    var now = new Date();
    var dateStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

    var newPreset = {
      id: 'preset_' + Date.now(),
      name: presetName.trim(),
      totalKg: (totalGrams / 1000).toFixed(2),
      itemCount: totalCount,
      gears: JSON.parse(JSON.stringify(gearMap)),
      createdAt: dateStr
    };

    presets.unshift(newPreset);
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_gear_presets', presets, true);
    } else {
      localStorage.setItem('okbm_gear_presets', JSON.stringify(presets));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('[' + newPreset.name + '] 세트가 저장되었습니다.', 'success');
    window.renderPlanStage();
  };

  window.loadGearPreset = function(presetId) {
    var presets = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_gear_presets', [])
      : safeGetJSON('okbm_gear_presets', []);
    var target = presets.find(function(p) { return String(p.id) === String(presetId); });
    if (!target) return;

    window.selectedGearMap = JSON.parse(JSON.stringify(target.gears));
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_selected_gears_multi', window.selectedGearMap, true);
    } else {
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('[' + target.name + '] 세트가 배낭에 적용되었습니다.', 'success');

    window.activePlanSubMode = 'calculator';
    window.renderPlanStage();
    setTimeout(function() {
      if (typeof window.renderPlanCategorySlots === 'function') window.renderPlanCategorySlots();
    }, 50);
  };

  window.deleteGearPreset = function(presetId) {
    var presets = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_gear_presets', [])
      : safeGetJSON('okbm_gear_presets', []);
    var target = presets.find(function(p) { return String(p.id) === String(presetId); });
    var name = target ? target.name : '세트';
    if (!confirm('[' + name + '] 세트를 삭제하시겠습니까?')) return;

    presets = presets.filter(function(p) { return String(p.id) !== String(presetId); });
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_gear_presets', presets, true);
    } else {
      localStorage.setItem('okbm_gear_presets', JSON.stringify(presets));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    triggerHaptic(10);
    if (typeof showToast === 'function') showToast('패킹 세트가 삭제되었습니다.', 'info');
    window.renderPlanStage();
  };

 window.addDirectGearToManager = function() {
    window.openQuickGearRegisterModal({ addToPack: false });
  };

  window.autoSavePlanMemo = function(dateStr, val) {
    var planMemosObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_memos', {})
      : safeGetJSON('okbm_plan_memos', {});
    if (!planMemosObj || typeof planMemosObj !== 'object') planMemosObj = {};

    var trimmed = String(val || '').trim();
    if (trimmed) {
      planMemosObj[dateStr] = String(val);
    } else {
      delete planMemosObj[dateStr];
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_memos', planMemosObj, false);
    } else {
      localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemosObj));
    }
  };

  window.savePlanMemo = function(dateStr) {
    var input = document.getElementById('planDailyMemoInput');
    var val = input ? input.value : '';

    var planMemosObj = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_memos', {})
      : safeGetJSON('okbm_plan_memos', {});
    if (!planMemosObj || typeof planMemosObj !== 'object') planMemosObj = {};

    var trimmed = String(val || '').trim();
    if (trimmed) {
      planMemosObj[dateStr] = String(val);
    } else {
      delete planMemosObj[dateStr];
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_memos', planMemosObj, true);
    } else {
      localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemosObj));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('[' + dateStr + '] 메모가 저장되었습니다.', 'success');
    window.renderPlanStage();
  };

  window.changePlanMonth = function(delta) {
    var now = new Date();
    var curYear = window.calViewYear || now.getFullYear();
    var curMonth = window.calViewMonth || (now.getMonth() + 1);

    curMonth += delta;
    if (curMonth < 1) { curMonth = 12; curYear--; }
    else if (curMonth > 12) { curMonth = 1; curYear++; }

    window.calViewYear = curYear;
    window.calViewMonth = curMonth;

    window.renderPlanStage();
    triggerHaptic(8);
  };

  window.changePlanYear = function(year) {
    window.calViewYear = Number(year);
    window.renderPlanStage();
    triggerHaptic(10);
    var oldPicker = document.getElementById('planYearPickerOverlay');
    if (oldPicker) oldPicker.remove();
  };

  window.jumpToPlanToday = function() {
    var now = new Date();
    window.calViewYear = now.getFullYear();
    window.calViewMonth = now.getMonth() + 1;
    window.activeSelectedDateKey = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    window.renderPlanStage();
    triggerHaptic(10);
  };

  // 🗓️ 전후 10년(총 21개년) 연도 선택 팝업창
  window.openPlanYearPicker = function(e) {
    if (e) e.stopPropagation();
    triggerHaptic(10);
    var oldPicker = document.getElementById('planYearPickerOverlay');
    if (oldPicker) { oldPicker.remove(); return; }

    var now = new Date();
    var baseYear = now.getFullYear();
    var curYear = window.calViewYear || baseYear;

    var picker = document.createElement('div');
    picker.id = 'planYearPickerOverlay';
    picker.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000050; display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
    picker.onclick = function(evt) { if (evt.target === picker) picker.remove(); };

    var startY = baseYear - 10;
    var endY = baseYear + 10;
    var yearsHtml = '';
    for (var y = startY; y <= endY; y++) {
      var isSelected = (y === curYear);
      var isCurrent = (y === baseYear);
      yearsHtml += '<button type="button" onclick="window.changePlanYear(' + y + ')" style="height:38px; border-radius:8px; font-size:0.80rem; font-weight:' + (isSelected ? '900' : '700') + '; background:' + (isSelected ? '#38bdf8' : 'rgba(255,255,255,0.06)') + '; color:' + (isSelected ? '#000000' : (isCurrent ? '#fde047' : '#ffffff')) + '; border:1px solid ' + (isSelected ? '#38bdf8' : (isCurrent ? 'rgba(253,224,71,0.5)' : 'rgba(255,255,255,0.12)')) + '; cursor:pointer; font-family:\'Space Grotesk\', sans-serif;">' + y + '년' + (isCurrent ? ' (올해)' : '') + '</button>';
    }

    picker.innerHTML = `
      <div style="width:100%; max-width:320px; background:#0c1018; border:1.5px solid rgba(56,189,248,0.4); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; box-shadow:0 16px 40px rgba(0,0,0,0.9); box-sizing:border-box;" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
          <span style="font-size:0.88rem; font-weight:900; color:#ffffff;">연도 선택 (전후 10년)</span>
          <button type="button" onclick="document.getElementById('planYearPickerOverlay').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>
        <div style="max-height:280px; overflow-y:auto; display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; padding-right:2px;">
          ${yearsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(picker);
  };

  // 👆 계획 달력 좌우 스와이프 제스처 바인딩
  window.bindPlanCalendarSwipe = function() {
    var calBox = document.getElementById('planCalendarCardWrap');
    if (!calBox || calBox._swipeBound) return;
    calBox._swipeBound = true;

    var startX = 0, startY = 0;
    calBox.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    calBox.addEventListener('touchend', function(e) {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      var diffX = e.changedTouches[0].clientX - startX;
      var diffY = e.changedTouches[0].clientY - startY;

      if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (diffX < 0) {
          window.changePlanMonth(1);
        } else {
          window.changePlanMonth(-1);
        }
      }
    }, { passive: true });
  };

  // 🎒 달력/메모장의 박지명을 배낭 계산기로 직통 주입하여 기록 시작
  window.startPackingForDate = function(dateStr, spotName, elev) {
    triggerHaptic(12);
    window.activeSelectedDateKey = dateStr;
    if (spotName && spotName.trim()) {
      window.currentLuckySpot = {
        name: spotName.trim(),
        elevation: (elev || '').replace(/m$/i, '')
      };
    }
    window.activePlanSubMode = 'calculator';
    window.renderPlanStage();
    setTimeout(function() {
      if (typeof window.renderPlanCategorySlots === 'function') {
        window.renderPlanCategorySlots();
      }
    }, 50);
  };

window.clearEntireDaySchedule = function(dateKey) {
    if (!confirm('[' + dateKey + '] 일정을 완전히 지우시겠습니까?\n달력의 표시, 메모, 등록된 목적지가 모두 함께 삭제됩니다.')) return;

    var planMemos = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_memos', {})
      : safeGetJSON('okbm_plan_memos', {});
    delete planMemos[dateKey];
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_memos', planMemos, false);
    } else {
      localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemos));
    }

    var planSpots = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_spots', {})
      : safeGetJSON('okbm_plan_spots', {});
    var daySpots = planSpots[dateKey];
    var tripsToDelete = [];
    if (Array.isArray(daySpots)) {
      daySpots.forEach(function(s) { if (s && s.tripId) tripsToDelete.push(s); });
    } else if (daySpots && daySpots.tripId) {
      tripsToDelete.push(daySpots);
    }
    delete planSpots[dateKey];
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_spots', planSpots, false);
    } else {
      localStorage.setItem('okbm_plan_spots', JSON.stringify(planSpots));
    }

    var idsToPurge = new Set();
    tripsToDelete.forEach(function(tr) {
      if (tr && tr.tripId) idsToPurge.add(String(tr.tripId).trim());
    });
    if (Array.isArray(window.TRIP_JOINS_DATABASE)) {
      var dTarget = String(dateKey).replace(/[-/]/g, '.');
      window.TRIP_JOINS_DATABASE.forEach(function(t) {
        if (t && t.date && String(t.date).replace(/[-/]/g, '.') === dTarget && t.tripId) {
          idsToPurge.add(String(t.tripId).trim());
        }
      });
    }
    idsToPurge.forEach(function(tId) {
      if (typeof window.deleteTripFromCloudSheet === 'function') {
        window.deleteTripFromCloudSheet(tId, null, true);
      }
    });

    // 3. 보관함 패킹 기록 삭제
    var historyList = (window.interactiveHistory && Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0)
      ? window.interactiveHistory
      : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_packing_history', []) : safeGetJSON('okbm_packing_history', []));

    historyList = historyList.filter(function(h) {
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : '';
      return hDate !== dateKey && String(h.date) !== String(dateKey);
    });

    window.interactiveHistory = historyList;
    window.packingHistoryList = historyList;

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packing_history', historyList, false);
    } else if (typeof window.safeSetStorage === 'function') {
      window.safeSetStorage('okbm_packing_history', historyList);
    }

    // 4. 소모품 및 체크리스트 정리
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    delete consumablesMap[dateKey];
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_trip_consumables', consumablesMap, false);
    } else {
      localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));
    }

    if (window.packedCheckSet) {
      var toDelete = [];
      window.packedCheckSet.forEach(function(k) {
        if (k.startsWith(dateKey + '__')) toDelete.push(k);
      });
      toDelete.forEach(function(k) { window.packedCheckSet.delete(k); });
      var packedArr = Array.from(window.packedCheckSet);
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_packed_checks', packedArr, false);
      } else {
        localStorage.setItem('okbm_packed_checks', JSON.stringify(packedArr));
      }
    }

    if (typeof window.deleteFeedFromCommunity === 'function') {
      window.deleteFeedFromCommunity('', dateKey);
    }

    window.__pendingPlanDestination = null;
    window.currentLuckySpot = null;
    var memoInput = document.getElementById('planDailyMemoInput');
    if (memoInput) memoInput.value = '';

    triggerHaptic(20);
    if (typeof showToast === 'function') showToast('[' + dateKey + '] 일정이 완전히 삭제되었습니다.', 'info');
    window.renderPlanStage();
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
  };

  // 👆 [달력 꾹 누르기 제스처: 브라우저 텍스트 복사 차단 & 삭제 확인창 호출]
  window.__longPressTimer = null;
  window.startDateLongPress = function(e, day, month, year) {
    window.cancelDateLongPress();
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');

    window.__longPressTimer = setTimeout(function() {
      window.__longPressTriggered = true;
      triggerHaptic(30);
      window.clearEntireDaySchedule(dateKey);
    }, 500);
  };

  window.handlePlanCalendarClick = function(day, month, year) {
    if (window.__longPressTriggered) {
      window.__longPressTriggered = false;
      return;
    }

    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;

    // 📍 찜목록에서 박지 일정등록 선택 후 날짜를 터치한 경우 -> 즉시 메모 및 박지 등록
    if (window.__pendingPlanDestination) {
      window.commitPlanDestination(dateKey);
      return;
    }

    // 찜목록 뷰 상태에서는 달력 날짜를 눌러도 찜목록 화면 유지 (선택 날짜만 갱신)
    if (window.activePlanSubMode === 'bookmarks') {
      triggerHaptic(8);
      window.renderPlanStage();
      return;
    }

    window.activePlanSubMode = 'calendar';
    window.renderPlanStage();
    triggerHaptic(10);
  };

 // 📍 [눈높이 '가보고 싶은 곳' 경계선 플로팅 HUD 캡슐 바 엔진]
  window.openDatePickGuideModal = function(spotName, elevation) {
    var oldHud = document.getElementById('datePickGuideHud');
    if (oldHud) oldHud.remove();
    var oldModal = document.getElementById('datePickGuideModal');
    if (oldModal) oldModal.remove();

    var hud = document.createElement('div');
    hud.id = 'datePickGuideHud';
    hud.style.cssText = 'position:fixed !important; top:calc(31% + 14px) !important; left:50% !important; transform:translateX(-50%) !important; z-index:10000020 !important; display:flex !important; align-items:center !important; gap:8px !important; background:#0d121d !important; border:1.5px solid rgba(56,189,248,0.75) !important; border-radius:24px !important; height:42px !important; padding:0 10px 0 12px !important; box-shadow:0 8px 30px rgba(0,0,0,0.9), 0 0 14px rgba(56,189,248,0.25) !important; box-sizing:border-box !important; max-width:calc(100vw - 24px) !important; white-space:nowrap !important; pointer-events:auto !important;';

    var safeSpot = escapeHtml(spotName);
    var pinSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:15px; height:15px; flex-shrink:0; vertical-align:-1px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';

    hud.innerHTML = `
      <span style="display:inline-flex; align-items:center; flex-shrink:0;">${pinSvg}</span>
      <span style="font-size:0.82rem; font-weight:900; color:#ffffff; max-width:130px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeSpot}</span>
      <span style="font-size:0.75rem; color:#64748b;">|</span>
      <span style="font-size:0.78rem; font-weight:800; color:#38bdf8; letter-spacing:-0.01em;">달력에서 날짜를 터치하세요</span>
      <button type="button" onclick="window.cancelPendingDestination();" style="background:rgba(255,255,255,0.1); border:none; color:#cbd5e1; width:22px; height:22px; border-radius:50%; font-size:0.75rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; margin-left:2px;">✕</button>
    `;
    document.body.appendChild(hud);
  };

  window.cancelPendingDestination = function() {
    var hud = document.getElementById('datePickGuideHud');
    if (hud) hud.remove();
    window.__pendingPlanDestination = null;
    triggerHaptic(8);
  };

  window.removeIndividualPlanSpot = function(dateKey, spotName, e) {
    if (e) e.stopPropagation();

    var planSpots = safeGetJSON('okbm_plan_spots', {});
    var list = planSpots[dateKey];
    var targetSpotObj = null;

    if (Array.isArray(list)) {
      targetSpotObj = list.find(function(s) { return s && s.name === spotName; });
    } else if (list && list.name === spotName) {
      targetSpotObj = list;
    }

    var isExpedition = Boolean(targetSpotObj && (targetSpotObj.tripId || targetSpotObj.isTrip));
    var isHostUser = false;
    var matchedTrip = null;

    if (isExpedition && Array.isArray(window.TRIP_JOINS_DATABASE)) {
      var dTarget = String(dateKey).replace(/[-/]/g, '.');
      matchedTrip = window.TRIP_JOINS_DATABASE.find(function(t) {
        if (!t || !t.date || !t.spotName) return false;
        var tD = String(t.date).replace(/[-/]/g, '.');
        var sMatch = t.spotName.includes(spotName) || spotName.includes(t.spotName);
        return tD === dTarget && (sMatch || (targetSpotObj.tripId && t.tripId === targetSpotObj.tripId));
      });
    }

    var profile = safeGetJSON('user_profile', null);
    var curNick = profile ? String(profile.nickname || '').trim() : '';

    if (isExpedition) {
      if (targetSpotObj && targetSpotObj.isHost === true) isHostUser = true;
      if (matchedTrip && curNick && matchedTrip.authorName === curNick) isHostUser = true;
    }

    var confirmMsg = isExpedition
      ? (isHostUser ? '[' + spotName + '] 주최한 원정대입니다. 모집을 취소하고 완전히 삭제하시겠습니까?' : '[' + spotName + '] 원정대 참가를 취소하시겠습니까?')
      : '[' + spotName + '] 일정을 삭제하시겠습니까?';

    if (!confirm(confirmMsg)) return;

    if (Array.isArray(list)) {
      planSpots[dateKey] = list.filter(function(s) { return s && s.name !== spotName; });
      if (planSpots[dateKey].length === 0) delete planSpots[dateKey];
    } else if (list && list.name === spotName) {
      delete planSpots[dateKey];
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_spots', planSpots, true);
    } else {
      localStorage.setItem('okbm_plan_spots', JSON.stringify(planSpots));
    }

    var planMemos = safeGetJSON('okbm_plan_memos', {});
    var curMemo = String(planMemos[dateKey] || '');
    if (curMemo) {
      var lines = curMemo.split('\n').filter(function(line) {
        var l = line.trim();
        if (!l || l === '---') return false;
        if (l.includes(spotName)) return false;
        if (l.includes('[낭만 원정대') && (l.includes(spotName) || isExpedition)) return false;
        return true;
      });
      var newMemo = lines.join('\n').trim();
      if (newMemo) planMemos[dateKey] = newMemo;
      else delete planMemos[dateKey];
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_plan_memos', planMemos, true);
      } else {
        localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemos));
      }
    }

    var tripIdToHandle = (targetSpotObj && targetSpotObj.tripId) || (matchedTrip && matchedTrip.tripId);
    if (isExpedition && tripIdToHandle) {
      if (isHostUser) {
        if (typeof window.deleteTripFromCloudSheet === 'function') {
          window.deleteTripFromCloudSheet(tripIdToHandle, null, true);
        }
      } else {
        if (typeof window.cancelTripJoin === 'function') {
          window.cancelTripJoin(tripIdToHandle);
        }
      }
    }

    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
    triggerHaptic(10);
    window.renderPlanStage();
  };

  window.selectPlanDestination = function(spotName, elevation) {
    window.__pendingPlanDestination = { name: spotName, elevation: elevation };
    triggerHaptic(12);
    window.openDatePickGuideModal(spotName, elevation);
  };


window.commitPlanDestination = function(dateKey) {
    var dest = window.__pendingPlanDestination;
    window.__pendingPlanDestination = null;

    var hud = document.getElementById('datePickGuideHud');
    if (hud) hud.remove();
    var modal = document.getElementById('confirmDestinationDateModal') || document.getElementById('datePickGuideModal');
    if (modal) modal.remove();

    if (!dest) return;

    // 2. 목적지 멀티 배열 누적 저장 (동일 날짜 복수 일정 완벽 보존)
    var planSpots = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_plan_spots', {})
      : safeGetJSON('okbm_plan_spots', {});
    
    var curSpots = planSpots[dateKey];
    var spotList = [];
    if (Array.isArray(curSpots)) {
      spotList = curSpots.slice();
    } else if (curSpots && curSpots.name) {
      spotList = [curSpots];
    }

    if (!spotList.some(function(s) { return s.name === dest.name; })) {
      spotList.push({
        name: dest.name,
        elevation: dest.elevation || ''
      });
    }

    planSpots[dateKey] = spotList;

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_plan_spots', planSpots, true);
    } else {
      localStorage.setItem('okbm_plan_spots', JSON.stringify(planSpots));
    }

    window.activeSelectedDateKey = dateKey;
    window.currentLuckySpot = { name: dest.name, elevation: dest.elevation || '' };

    window.activePlanSubMode = 'calendar';
    window.renderPlanStage();
    triggerHaptic(15);

    setTimeout(function() {
      var memoInput = document.getElementById('planDailyMemoInput');
      if (memoInput) {
        memoInput.focus();
        memoInput.setSelectionRange(memoInput.value.length, memoInput.value.length);
      }
    }, 100);

    if (typeof showToast === 'function') {
      showToast('목적지가 등록되었습니다.', 'success');
    }
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  // 🔄 [하단 독 모드 전환 및 스와이프 제스처 바인딩 엔진 - 페이드 전환 적용]
  window.togglePlanDockDeckMode = function(forceMode) {
    if (forceMode) {
      window.__planDockDeckMode = forceMode;
    } else {
      window.__planDockDeckMode = (window.__planDockDeckMode === 'tools') ? 'main' : 'tools';
    }
    var sub = document.getElementById('planSubToolsDeck');
    var main = document.getElementById('planMainNavDeck');
    if (!sub || !main) return;
    var isTools = (window.__planDockDeckMode === 'tools');

    sub.style.opacity = isTools ? '1' : '0';
    sub.style.pointerEvents = isTools ? 'auto' : 'none';
    sub.style.zIndex = isTools ? '105' : '100';

    main.style.opacity = isTools ? '0' : '1';
    main.style.pointerEvents = isTools ? 'none' : 'auto';
    main.style.zIndex = isTools ? '100' : '105';
  };

  window.bindPlanDualDockGestures = function() {
    var dock = document.getElementById('planDualDockContainer');
    if (!dock || dock._swipeBound) return;
    dock._swipeBound = true;

    var startX = 0, startY = 0;
    dock.addEventListener('touchstart', function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    dock.addEventListener('touchend', function(e) {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      var diffX = e.changedTouches[0].clientX - startX;
      var diffY = e.changedTouches[0].clientY - startY;

      // 아래로 쓸기 ➔ 기본 5대 독
      if (diffY > 18 && Math.abs(diffY) > Math.abs(diffX)) {
        if (window.__planDockDeckMode === 'tools') {
          triggerHaptic(10);
          window.togglePlanDockDeckMode('main');
        }
      }
      // 위로 쓸기 ➔ 계획 5대 도구
      else if (diffY < -18 && Math.abs(diffY) > Math.abs(diffX)) {
        if (window.__planDockDeckMode === 'main') {
          triggerHaptic(10);
          window.togglePlanDockDeckMode('tools');
        }
      }
      // 좌우 쓸기 ➔ 양방향 토글
      else if (Math.abs(diffX) > 28) {
        triggerHaptic(10);
        window.togglePlanDockDeckMode();
      }
    }, { passive: true });
  };

 // 🚀 [낭만플랜 모달 오픈 / 클로즈 - 마스터 독바와 1:1 결합 & 최상위 레이어 보장]
  window.openPlanModal = function(subMode) {
    window.activePlanSubMode = subMode || 'calendar';

    var historyModal = document.getElementById('romanticHistoryModal');
    if (historyModal) {
      historyModal.style.setProperty('display', 'none', 'important');
    }

    ['pastTripsListModal', 'singleTripFeedModal', 'clearMapModal', 'myReportModal', 'tripActionActionSheet'].forEach(function(mId) {
      var el = document.getElementById(mId);
      if (el) el.remove();
    });

    var modal = document.getElementById('romanticPlanModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'romanticPlanModal';
      modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)) !important; max-height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)) !important; background:#000000; z-index:1000005 !important; justify-content:center; align-items:stretch; width:100% !important; max-width:100% !important; overflow:hidden !important; touch-action:pan-y !important; transform:translateZ(0); -webkit-transform:translateZ(0); contain:paint layout !important; box-sizing:border-box;';
      modal.innerHTML = '<div class="romantic-plan-content" style="width:100% !important; max-width:480px !important; margin:0 auto; height:100%; max-height:100%; display:flex; flex-direction:column; justify-content:space-between; overflow-x:hidden !important; overflow-y:hidden !important; box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
    } else {
      modal.style.setProperty('top', '0', 'important');
      modal.style.removeProperty('bottom');
      modal.style.setProperty('height', 'calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px))', 'important');
      modal.style.setProperty('max-height', 'calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px))', 'important');
    }

    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '1000005', 'important');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('plan-modal-open');

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('plan');
    }

    if (typeof window.loadGearDbFromGoogleSheet === 'function') {
      window.loadGearDbFromGoogleSheet();
    }

    try {
      window.renderPlanStage();
    } catch (err) {
      console.error('[RomanticPlan] renderPlanStage error:', err);
    }
    triggerHaptic(10);
  };

  window.closePlanModal = function() {
    var modal = document.getElementById('romanticPlanModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    document.body.classList.remove('plan-modal-open');
    var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock(isMap ? 'map' : 'router');
    }
    triggerHaptic(10);
  };

  // ⚡ [실시간 동기화] 지도/외부에서 찜 변경 시 새로고침 0% 즉시 플랜 뷰 갱신
  if (typeof window !== 'undefined') {
    window.addEventListener('okbm_bookmark_changed', function() {
      var modal = document.getElementById('romanticPlanModal');
      var isModalOpen = modal && modal.style.display !== 'none';
      if (window.activePlanSubMode === 'bookmarks' || isModalOpen) {
        window.renderPlanStage();
      }
    });
  }

  // 초기 실행
  if (typeof window.loadGearDbFromGoogleSheet === 'function') {
    window.loadGearDbFromGoogleSheet();
  }
})();
