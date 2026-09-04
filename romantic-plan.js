
/**
 * 🎒 낭만루트 낭만계획(Plan) 전담 코어 엔진 (romantic-plan.js)
 * 1. [달력 첫 화면]: 낭만보관함 연동 달력(완료 ★금색 / 계획 ⚑초록색) + 날짜별 출정 계획 메모장 + 낭만계획세우기 카드
 * 2. [실전 체크리스트]: 음식/소모품 즉시 추가 입력창 + 최하단 고정 [✓ 패킹 체크 완료] 독
 * 3. [10대 슬롯 배낭계산기]: 2x5 그리드 + 28px 라인아트 + [20종 템플릿 카드 생성 ➔] 연동
 * 4. [가고 싶은 찜박지]: 찜 목록 열람 & 원클릭 출정지 지정
 * 5. [내 장비관리]: 즐겨찾기(⭐) 관리 + 구매일/사용일/메모 + 원클릭 패킹 세트(프리셋) 관리 + 직접 등록
 * 6. [제스처 듀얼 하단독]: 아래/옆 스와이프 시 기본 5대 독 전환
 */

(function() {
  // 🎨 [10대 슬롯 & 계산기 전용 스타일 시트]
  if (!document.getElementById('romantic-plan-core-style')) {
    var style = document.createElement('style');
    style.id = 'romantic-plan-core-style';
    style.innerHTML = `
     .weight-dashboard-strip {
        background: linear-gradient(135deg, rgba(56, 189, 248, 0.09) 0%, rgba(15, 23, 42, 0.65) 50%, rgba(3, 5, 8, 0.85) 100%) !important;
        border: 1px solid rgba(56, 189, 248, 0.28) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.22) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
        border-radius: 12px !important;
        padding: 9px 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      .weight-dash-top { display: flex !important; justify-content: space-between !important; align-items: flex-end !important; }
      .weight-val-big {
        font-family: 'Space Grotesk', 'JetBrains Mono', sans-serif !important;
        font-size: 1.8rem !important;
        font-weight: 900 !important;
        color: #38bdf8 !important;
        text-shadow: 0 0 16px rgba(56, 189, 248, 0.45) !important;
        line-height: 0.95 !important;
        letter-spacing: -0.03em !important;
      }
      .weight-bpl-badge {
        font-size: 0.68rem !important; font-weight: 800 !important; padding: 2px 6px !important;
        border-radius: 4px !important; display: inline-flex !important; align-items: center !important; gap: 3px !important;
      }
      .bpl-ul { background: rgba(56, 189, 248, 0.18) !important; color: #7dd3fc !important; border: 1px solid #38bdf8 !important; }
      .bpl-standard { background: rgba(245, 158, 11, 0.2) !important; color: #fde047 !important; border: 1px solid #f59e0b !important; }
      .bpl-heavy { background: rgba(244, 63, 94, 0.2) !important; color: #fda4af !important; border: 1px solid #f43f5e !important; }
      .weight-gauge-bg {
        width: 100% !important; height: 8px !important; background: rgba(255, 255, 255, 0.08) !important;
        border-radius: 4px !important; overflow: hidden !important; position: relative !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
      }
      .weight-gauge-fill {
        height: 100% !important; width: 0% !important;
        background: linear-gradient(90deg, #38bdf8 0%, #818cf8 55%, #f43f5e 100%) !important;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.5) !important;
        transition: width 0.3s ease !important;
      }
      .category-slots-grid { 
        display: grid !important; 
        grid-template-columns: 1fr 1fr !important;
        gap: 4px !important; 
        flex: 1 1 0% !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        padding: 1px 0 !important;
        box-sizing: border-box !important;
      }
      .category-slot-card {
        position: relative !important;
        overflow: hidden !important;
        background: rgba(255, 255, 255, 0.025) !important;
        border: 1px solid rgba(255, 255, 255, 0.07) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 8px !important;
        padding: 5px 6px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        min-height: 54px !important;
        max-height: 70px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
      }
      .category-slot-card:active {
        background: rgba(56, 189, 248, 0.08) !important;
        border-color: rgba(56, 189, 248, 0.35) !important;
      }
      .slot-bg-watermark-vector {
        position: absolute !important;
        right: 1px !important;
        bottom: 1px !important;
        opacity: 0.85 !important;
        pointer-events: none !important;
        z-index: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .slot-bg-watermark-vector svg {
        width: 28px !important;
        height: 28px !important;
        display: block !important;
      }
      .slot-gears-wrap {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 2px !important;
        width: 100% !important;
        max-height: 48px !important;
        overflow-y: auto !important;
        scrollbar-width: none !important;
      }
      .slot-gears-wrap::-webkit-scrollbar { display: none !important; }
      .mini-gear-tag {
        display: inline-flex !important;
        align-items: center !important;
        background: rgba(0, 0, 0, 0.85) !important;
        border: 1px solid rgba(56, 189, 248, 0.45) !important;
        color: #7dd3fc !important;
        font-size: 0.54rem !important;
        font-weight: 800 !important;
        padding: 1px 3.5px !important;
        border-radius: 3px !important;
        max-width: 98% !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        backdrop-filter: blur(4px) !important;
        line-height: 1.15 !important;
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

  // 🏷️ 8대 기본 카테고리 - 눈이 편안한 은회색 반투명 스트로크 아이콘
  var DEFAULT_CATEGORIES = [
    {
      id: 'shelter', title: '텐트 · 타프',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M12 2L2 20h20L12 2z"/><path d="M12 2v18M7 20l5-9 5 9"/></svg>',
      db: [
        { name: '제로그램 엘찰텐 프로 1.5P', weight: 1450, brand: 'ZEROGRAM', verified: true, specs: '4계절 경량 텐트' },
        { name: 'MSR 허바허바 NX 2P', weight: 1540, brand: 'MSR', verified: true, specs: '백패킹 베스트셀러' },
        { name: '힐레베르그 니악', weight: 1700, brand: 'Hilleberg', verified: true, specs: '고강도 3계절 텐트' },
        { name: '지팩스 듀플렉스 텐트 (2P DCF)', weight: 550, brand: 'Zpacks', verified: true, specs: '초경량 다이니마 텐트' },
        { name: '경량 실타프 & 스트링', weight: 450, brand: 'Custom', verified: true, specs: '초경량 쉘터' }
      ]
    },
    {
      id: 'sleep', title: '침낭 · 매트',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M2 17h20M2 13h20M4 9h16a2 2 0 0 1 2 2v6H2v-6a2 2 0 0 1 2-2z"/></svg>',
      db: [
        { name: '써마레스트 엑스썸 NXT (에어매트)', weight: 430, brand: 'Therm-a-Rest', verified: true, specs: 'R값 7.3 동계 최강' },
        { name: '써마레스트 엑스라이트 NXT (에어매트)', weight: 354, brand: 'Therm-a-Rest', verified: true, specs: 'R값 4.5 3계절 표준' },
        { name: '씨투써밋 이더라이트 XT', weight: 490, brand: 'Sea to Summit', verified: true, specs: '두께 10cm 극상의 편안함' },
        { name: '큐물러스 파이라 850 (구스침낭)', weight: 1200, brand: 'Cumulus', verified: true, specs: '850FP 폴란드 구스' },
        { name: '씨투써밋 에어로스 울트라라이트 베개', weight: 60, brand: 'Sea to Summit', verified: true, specs: '초경량 에어베개' }
      ]
    },
    {
      id: 'pack', title: '배낭 (Pack)',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>',
      db: [
        { name: 'CAYL 태백 50L 롤탑 배낭', weight: 910, brand: 'CAYL', verified: true, specs: 'BPL 최적화 배낭' },
        { name: 'HMG 윈드라이더 3400 (55L)', weight: 910, brand: 'Hyperlite Mountain Gear', verified: true, specs: '다이니마 방수 원단' },
        { name: '오스프리 케스트렐 58L', weight: 1760, brand: 'Osprey', verified: false, specs: '편안한 등판 프레임' },
        { name: '미스테리랜치 브릿저 55L', weight: 2400, brand: 'Mystery Ranch', verified: false, specs: '헤비 패킹 밸런스' }
      ]
    },
    {
      id: 'food', title: '식수 · 식량 · 간식',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8z"/><path d="M12 6v6l4 2"/></svg>',
      db: [
        { name: '생수 2.0L (식수)', weight: 2000, brand: 'Water', verified: true, specs: '1박 기준 필수 식수' },
        { name: '생수 1.0L (보조식수)', weight: 1000, brand: 'Water', verified: true, specs: '보조 식수' },
        { name: '핫앤쿡 발열도시락 1팩', weight: 340, brand: 'Hotncook', verified: true, specs: '비화식 필수 발열팩' },
        { name: '전투식량 / 건조식 1팩', weight: 120, brand: 'Food', verified: true, specs: '온수 전용 초경량식' },
        { name: '보온병 온수 1.0L', weight: 1450, brand: 'Hot Water', verified: true, specs: '동계 보온 필수' }
      ]
    },
    {
      id: 'kitchen', title: '취사 · 식기 · 보온병',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>',
      db: [
        { name: '스탠리 클래식 보온병 1.0L (빈통)', weight: 650, brand: 'Stanley', verified: true, specs: '보온력 우수' },
        { name: '써모스 산악전용 보온병 900ml', weight: 390, brand: 'Thermos', verified: true, specs: '산악 경량 보온병' },
        { name: '소토 윈드마스터 SOD-310 버너', weight: 67, brand: 'SOTO', verified: true, specs: '내풍성 마이크로 레귤레이터' },
        { name: '스노우피크 티타늄 450 머그', weight: 70, brand: 'Snowpeak', verified: true, specs: '싱글월 티타늄 머그' },
        { name: '티타늄 수저 & 포크 세트', weight: 35, brand: 'Gear', verified: true, specs: '초경량 커트러리' }
      ]
    },
    {
      id: 'wear', title: '보온의류 · 방한 · 의류',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
      db: [
        { name: '헤비 다운 우모복 (동계 패딩)', weight: 750, brand: 'Wear', verified: true, specs: '영하권 필수 보온의류' },
        { name: '큐물러스 네베 다운팬츠 (우모바지)', weight: 330, brand: 'Cumulus', verified: true, specs: '850FP 구스 충전' },
        { name: '경량 다운자켓 (간절기)', weight: 320, brand: 'Wear', verified: true, specs: '800FP 경량 패딩' },
        { name: '방풍 바람막이 & 고어텍스 자켓', weight: 280, brand: 'Wear', verified: true, specs: '능선 방풍 필수' },
        { name: '우모바지 (다운 팬츠)', weight: 380, brand: 'Wear', verified: true, specs: '극동계 텐트내 보온' }
      ]
    },
    {
      id: 'electronics', title: '랜턴 · 안전 · 전자기기',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      db: [
        { name: '페츨 악틱 코어 헤드랜턴', weight: 80, brand: 'Petzl', verified: true, specs: '450루멘 충전식' },
        { name: '골제로 라이트하우스 미니 랜턴', weight: 68, brand: 'GoalZero', verified: true, specs: '텐트 조명 최강' },
        { name: '나이트코어 NB10000 보조배터리', weight: 150, brand: 'Nitecore', verified: true, specs: '카본 초경량 10000mAh' },
        { name: 'K-LNT 롤팩 쓰레기봉투 & 파우치', weight: 25, brand: 'LNT', verified: true, specs: '클린 백패킹 필수' }
      ]
    },
    {
      id: 'camp', title: '테이블 · 체어 · 소품',
      icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:rgba(255,255,255,0.55); stroke-width:2.2;"><rect x="4" y="10" width="16" height="4" rx="1"/><path d="M6 14v6M18 14v6M8 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"/></svg>',
      db: [
        { name: '헬리녹스 체어원', weight: 890, brand: 'Helinox', verified: true, specs: '편안한 착좌감' },
        { name: '헬리녹스 체어제로 (초경량)', weight: 490, brand: 'Helinox', verified: true, specs: 'BPL 체어' },
        { name: '베른 트레킹패드 경량 테이블', weight: 230, brand: 'Verne', verified: true, specs: '접이식 솔로 테이블' },
        { name: '하이커 1인용 접이식 방석', weight: 35, brand: 'Mat', verified: true, specs: '바닥 냉기 차단' }
      ]
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

  // 🎒 [계산기 10대 슬롯 렌더링 엔진]
  window.renderPlanCategorySlots = function() {
    var container = document.getElementById('planCategorySlotsContainer');
    if (!container) return;

    var totalGrams = 0, totalItemCount = 0;
    var cats = (window.CATEGORIES || []).slice(0, 8);
    var gearMap = window.selectedGearMap || {};

    var renderedHtml = cats.map(function(cat) {
      var items = gearMap[cat.id] || [];
      var catGrams = items.reduce(function(sum, it) { return sum + Number(it.weight || 0); }, 0);
      totalGrams += catGrams;
      totalItemCount += items.length;

      var gearsListHtml = '<span style="color:#94a3b8; font-size:0.56rem; font-weight:700; background:rgba(0,0,0,0.6); padding:1px 4px; border-radius:3px;">미선택 +</span>';
      if (items.length > 0) {
        gearsListHtml = items.map(function(it, idx) {
          var cleanName = (it.name || it.itemName || '장비').replace(/\s*\(.*\)/, '');
          return '<span class="mini-gear-tag" onclick="event.stopPropagation(); window.removeGearFromPlanSlot(\'' + cat.id + '\', ' + idx + ')" title="' + escapeHtml(cleanName) + ' (' + it.weight + 'g) - 터치 시 삭제">' + escapeHtml(cleanName) + ' ✕</span>';
        }).join('');
      }

      var vecSvg = PLAN_SLOT_VECTORS[cat.id] || '';

      return `
        <div class="category-slot-card" onclick="window.openGearPresetModal('${cat.id}')">
          <div class="slot-bg-watermark-vector">${vecSvg}</div>
          <div style="position:relative; z-index:2; width:100%; display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
              <div style="display:flex; align-items:center; gap:3px; font-size:0.71rem; font-weight:900; color:#fff; text-shadow:0 1px 3px #000;">
                <span>${cat.icon}</span>
                <span>${cat.title}</span>
              </div>
              <div style="font-size:0.68rem; color:#34d399; font-family:'JetBrains Mono', monospace; font-weight:900; background:rgba(0,0,0,0.7); padding:1px 4px; border-radius:3px;">
                ${(catGrams / 1000).toFixed(2)}k
              </div>
            </div>
            <div class="slot-gears-wrap">
              ${gearsListHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    var slot9Vec = PLAN_SLOT_VECTORS.slot9 || '';
    var slot10Vec = PLAN_SLOT_VECTORS.slot10 || '';

    renderedHtml += `
      <div class="category-slot-card" style="border-color:rgba(255,255,255,0.14); background:rgba(255,255,255,0.015);" onclick="if(typeof showToast==='function') showToast('🔥 요즘 유행하는 백패킹 인기 핫템 랭킹 준비 중입니다!', 'info');">
        <div class="slot-bg-watermark-vector">${slot9Vec}</div>
        <div style="position:relative; z-index:2; width:100%; display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div style="display:flex; align-items:center; gap:3px; font-size:0.71rem; font-weight:900; color:#cbd5e1; text-shadow:0 1px 3px #000;">
              <span>🔥</span>
              <span>요즘 유행하는 장비</span>
            </div>
            <span style="font-size:0.54rem; color:#fff; font-weight:900; background:rgba(255,255,255,0.12); padding:1.5px 5.5px; border-radius:3.5px;">HOT</span>
          </div>
          <div class="slot-gears-wrap">
            <span style="color:#94a3b8; font-size:0.56rem; font-weight:700; background:rgba(0,0,0,0.65); padding:1px 4px; border-radius:3px;">인기 장비 랭킹 ➔</span>
          </div>
        </div>
      </div>
    `;

    renderedHtml += `
      <div class="category-slot-card" style="border-color:rgba(255,255,255,0.14); background:rgba(255,255,255,0.015);" onclick="if(typeof showToast==='function') showToast('🎁 백패커 전용 특가 및 제휴 혜택 공간입니다!', 'info');">
        <div class="slot-bg-watermark-vector">${slot10Vec}</div>
        <div style="position:relative; z-index:2; width:100%; display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
            <div style="display:flex; align-items:center; gap:3px; font-size:0.71rem; font-weight:900; color:#cbd5e1; text-shadow:0 1px 3px #000;">
              <span>🎁</span>
              <span>백패커 특가 혜택</span>
            </div>
            <span style="font-size:0.54rem; color:#fff; font-weight:900; background:rgba(255,255,255,0.12); padding:1.5px 5.5px; border-radius:3.5px;">SALE</span>
          </div>
          <div class="slot-gears-wrap">
            <span style="color:#94a3b8; font-size:0.56rem; font-weight:700; background:rgba(0,0,0,0.65); padding:1px 4px; border-radius:3px;">공구/할인 이벤트 ➔</span>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = renderedHtml;

    var totalKg = (totalGrams / 1000).toFixed(2);
    var calcKgText = document.getElementById('planTotalWeightKgText');
    var calcGramsText = document.getElementById('planTotalWeightGramsText');
    if (calcKgText) calcKgText.innerText = totalKg + ' kg';
    if (calcGramsText) calcGramsText.innerText = totalGrams.toLocaleString() + ' g (' + totalItemCount + '개)';

    var mainBannerKg = document.getElementById('mainBannerKgText');
    var mainBannerCount = document.getElementById('mainBannerItemCount');
    if (mainBannerKg) mainBannerKg.innerText = totalKg + ' kg';
    if (mainBannerCount) mainBannerCount.innerText = '장비 ' + totalItemCount + '개 세팅됨';

    var badgeText = document.getElementById('planBplStatusText');
    var gauge = document.getElementById('planWeightGaugeFill');

    var badgeLabel = 'BPL 초경량 (UL ≤6kg)';
    if (totalGrams >= 14500) {
      badgeLabel = '헤비 패킹 (15kg+)';
    } else if (totalGrams > 6500) {
      badgeLabel = '보통 스탠다드 (7~14kg)';
    }
    if (badgeText) badgeText.innerText = badgeLabel;
    if (gauge) {
      var gaugePct = Math.min(100, Math.round((totalGrams / 14000) * 100));
      gauge.style.width = gaugePct + '%';
    }
  };

  window.removeGearFromPlanSlot = function(categoryId, itemIndex) {
    if (window.selectedGearMap && window.selectedGearMap[categoryId]) {
      window.selectedGearMap[categoryId].splice(itemIndex, 1);
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      window.renderPlanCategorySlots();
      triggerHaptic(10);
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
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
      <div style="width:100%; max-width:480px; margin:0 auto; height:100dvh; display:flex; flex-direction:column; padding:calc(12px + env(safe-area-inset-top, 0px)) 14px calc(64px + env(safe-area-inset-bottom, 0px)) 14px; box-sizing:border-box;">
        <div style="flex-shrink:0; display:flex; flex-direction:column; gap:6px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" onclick="window.closeGearPresetModal()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
              <span class="icon-svg" style="width:16px; height:16px; color:#38bdf8; display:flex; align-items:center; justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:16px; height:16px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </span>
              <span style="font-weight:900; font-size:1.02rem; color:#f8fafc;" id="presetModalCategoryTitle">장비 선택 & 등록</span>
            </div>
            <button type="button" onclick="window.closeGearPresetModal()" style="background:none; border:none; color:#64748b; font-size:1.1rem; cursor:pointer; padding:2px 6px;">✕</button>
          </div>

          <div style="position:relative; width:100%; display:flex; align-items:center;">
            <input type="text" id="gearSearchFixedInput" class="modal-input" placeholder="🔍 브랜드, 장비명, 스펙 검색..." oninput="window.handleGearSearchInput(this.value)" style="border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.035); color:#ffffff; font-size:0.85rem; padding:0 32px 0 12px; height:42px; border-radius:8px; width:100%; box-sizing:border-box; outline:none;" />
            <button type="button" id="btnGearSearchClear" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.15); border:none; color:#cbd5e1; width:17px; height:17px; border-radius:50%; font-size:0.6rem; font-weight:900; cursor:pointer; align-items:center; justify-content:center; padding:0;" onclick="window.clearGearSearchInput()">✕</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:5px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 8px; box-sizing:border-box;">
            <div style="width:100%;">
              <input type="text" id="customInputGearName" class="modal-input" placeholder="직접 추가할 장비명 (예: 백패킹 다운슈즈)" style="width:100%; font-size:0.76rem; padding:7px 9px; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#f8fafc; outline:none; box-sizing:border-box;" />
            </div>
            <div style="display:flex; gap:6px; width:100%; align-items:center;">
              <input type="number" id="customInputGearWeight" class="modal-input" placeholder="무게 (g)" style="flex:1; font-size:0.76rem; padding:7px 9px; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#f8fafc; outline:none; font-family:'JetBrains Mono', monospace; box-sizing:border-box;" />
              <button type="button" class="modal-btn" style="flex:1; height:32px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); color:#f1f5f9; font-weight:800; padding:0; font-size:0.76rem; border-radius:6px; box-sizing:border-box; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.addCustomGearToCurrentCategory()">+ 장비 등록</button>
            </div>
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

    var filteredDb = (category.db || []).filter(function(g) {
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
    localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
    window.renderPlanCategorySlots();
    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    triggerHaptic(12);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  window.decrementGearCount = function(gearName, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!window.currentOpeningCategoryId || !window.selectedGearMap[window.currentOpeningCategoryId]) return;
    var list = window.selectedGearMap[window.currentOpeningCategoryId];
    var targetIdx = list.findIndex(function(it) { return it.name === gearName; });
    if (targetIdx !== -1) {
      list.splice(targetIdx, 1);
      localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
      window.renderPlanCategorySlots();
      var searchInput = document.getElementById('gearSearchFixedInput');
      window.renderPresetGearList(searchInput ? searchInput.value : '');
      triggerHaptic(10);
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    }
  };

  window.clearAllGearsInCategory = function(categoryId) {
    if (!categoryId) return;
    window.selectedGearMap[categoryId] = [];
    localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    window.renderPlanCategorySlots();
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('해당 슬롯이 모두 비워졌습니다.', 'info');
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };
// 🗑️ [배낭계산기 담긴 장비 전체 초기화 엔진]
  window.resetPlanCalculatorGears = function() {
    if (!confirm('배낭에 담긴 모든 장비를 비우고 초기화할까요?')) return;
    window.selectedGearMap = {};
    localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('배낭이 깨끗하게 비워졌습니다.', 'info');
    if (typeof window.renderPlanCategorySlots === 'function') window.renderPlanCategorySlots();
    window.renderPlanStage();
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
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
      localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
    }

    var cat = (window.CATEGORIES || []).find(function(c) { return c.id === window.currentOpeningCategoryId; });
    if (cat && !cat.db.some(function(d) { return d.name === name; })) {
      cat.db.unshift(newCustomItem);
    }

    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.add(name);
    localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));

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
      if (typeof showToast === 'function') showToast('☆ [' + gearName + '] 내 장비 해제', 'info');
    } else {
      window.favoriteGearSet.add(gearName);
      if (typeof showToast === 'function') showToast('⭐ [' + gearName + '] 내 장비 등록!', 'success');
    }

    localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));
    var searchInput = document.getElementById('gearSearchFixedInput');
    window.renderPresetGearList(searchInput ? searchInput.value : '');
    window.renderPlanCategorySlots();
    triggerHaptic(10);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  // 🎒 [패킹 저장 및 20종 템플릿 카드 스튜디오 즉시 호출]
  window.saveCurrentPackingRecord = function() {
    var packedItems = [];
    var totalGrams = 0;
    if (typeof window.CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      window.CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
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
    var spotTitle = (window.currentLuckySpot && window.currentLuckySpot.name) ? window.currentLuckySpot.name : '';
    var spotElev = (window.currentLuckySpot && window.currentLuckySpot.elevation) ? `${window.currentLuckySpot.elevation}m` : '';

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
      oneLineMemo: spotTitle ? `${spotTitle} 백패킹` : '',
      items: packedItems,
      photos: [],
      photo: '',
      fieldPhoto: ''
    };

    window.currentShareRecord = newRecord;
    window.currentShareItems = packedItems;

    if (typeof window.savePackingHistoryRecord === 'function') {
      window.savePackingHistoryRecord(newRecord);
    }

    window.closePlanModal();

    if (typeof openPackShareModal === 'function') {
      openPackShareModal(newRecord, packedItems, false);
    }
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 20종 패킹 카드가 생성되었습니다!', 'success');
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

    var customGears = safeGetJSON('okbm_custom_gears', []);
    (window.CATEGORIES || []).forEach(function(cat) {
      if (sheetGearsByCategory[cat.id] && sheetGearsByCategory[cat.id].length > 0) {
        cat.db = sheetGearsByCategory[cat.id];
      }
      var myCatCustoms = customGears.filter(function(cg) { return cg.category_id === cat.id; });
      myCatCustoms.forEach(function(cg) {
        if (!cat.db.some(function(d) { return d.name === cg.name; })) {
          cat.db.unshift(cg);
        }
      });
    });

    window.renderPlanCategorySlots();
  }

  // 🎒 [실전 패킹 체크리스트 인덱스 안전 토글 엔진]
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
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
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

    localStorage.setItem('okbm_packed_checks', JSON.stringify(Array.from(window.packedCheckSet)));
    triggerHaptic(10);
    window.renderPlanStage();
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
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
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

    localStorage.setItem('okbm_packed_checks', JSON.stringify(Array.from(window.packedCheckSet)));
    triggerHaptic(12);
    window.renderPlanStage();
  };

  // 🍖 [체크리스트 음식/간식/소모품 즉시 추가 핸들러]
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
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    if (!consumablesMap[targetDate]) consumablesMap[targetDate] = [];

    consumablesMap[targetDate].push({
      id: 'food_' + Date.now(),
      name: name,
      weight: weight,
      isConsumable: true
    });

    localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));
    triggerHaptic(12);
    if (typeof showToast === 'function') showToast('🍖 [' + name + '] 체크리스트에 추가됨!', 'success');
    window.renderPlanStage();
  };

  window.removeChecklistConsumableItem = function(foodId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var now = new Date();
    var targetDate = window.activeSelectedDateKey || (now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0'));
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    if (consumablesMap[targetDate]) {
      consumablesMap[targetDate] = consumablesMap[targetDate].filter(function(it) { return it.id !== foodId; });
      localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));
      triggerHaptic(10);
      window.renderPlanStage();
    }
  };

  window.completeChecklist = function(dateStr) {
    triggerHaptic(20);
    if (typeof showToast === 'function') {
      showToast('🎉 [' + dateStr + '] 패킹 체크를 완료했습니다! 안산 즐캠 되세요!', 'success', 3000);
    }
    window.activePlanSubMode = 'calendar';
    window.renderPlanStage();
  };

 // 🏛️ [낭만계획 메인 렌더러 함수 - 100% 정상 선언]
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

    // 🗓️ 달력 데이터 바인딩
    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    var historyList = window.interactiveHistory || safeGetJSON('okbm_packing_history', []);
    if (!Array.isArray(historyList)) historyList = [];
    var monthHistory = historyList.filter(function(h) {
      return h && Number(h.year) === Number(viewYear) && Number(h.month) === Number(viewMonth);
    });

    var planMemosObj = safeGetJSON('okbm_plan_memos', {}) || {};
    var currentDayMemo = (planMemosObj && planMemosObj[activeDateStr]) ? String(planMemosObj[activeDateStr]) : '';

    var todayYear = now.getFullYear();
    var todayMonth = now.getMonth() + 1;
    var todayDate = now.getDate();

    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:100% !important;"></div>';
    }

    for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var isToday = (Number(viewYear) === todayYear && Number(viewMonth) === todayMonth && Number(d) === todayDate);
      var thisDateKey = viewYear + '.' + String(viewMonth).padStart(2, '0') + '.' + String(d).padStart(2, '0');

      var dayRecord = monthHistory.find(function(h) { return h && Number(h.day) === Number(d); });
      var isRecorded = !!dayRecord;
      var isCompleted = isRecorded && Boolean(dayRecord.memo && String(dayRecord.memo).trim().length > 0);
      var hasPlanMemo = Boolean(planMemosObj && planMemosObj[thisDateKey] && String(planMemosObj[thisDateKey]).trim().length > 0);

      var dayStyle = 'position:relative; height:100% !important; width:100% !important; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.76rem; font-weight:800; border-radius:6px; cursor:pointer; user-select:none; transition:all 0.12s ease; box-sizing:border-box;';
      var markerSymbol = '';
      var todayBadge = isToday ? '<span style="position:absolute; top:1px; right:2px; font-size:6px; font-weight:900; color:' + (isSelected ? '#000000' : '#38bdf8') + '; line-height:1;">오늘</span>' : '';

      if (isSelected) {
        dayStyle += 'background:#00bcd4 !important; color:#000000 !important; font-weight:900 !important; box-shadow:0 0 10px rgba(0,188,212,0.85); transform:scale(1.02);';
        if (isToday) {
          dayStyle += 'border:1.5px solid #ffffff !important;';
        }
      } else if (isToday) {
        dayStyle += 'border:1.5px solid #38bdf8 !important; color:#38bdf8 !important; font-weight:900 !important; background:rgba(56,189,248,0.14) !important;';
      } else if (isCompleted) {
        dayStyle += 'color:#fde047; font-weight:900; background:rgba(253,224,71,0.08);';
        markerSymbol = '<span style="position:absolute; bottom:1px; font-size:7px; color:#f59e0b; font-weight:900; line-height:1;">★</span>';
      } else if (isRecorded) {
        dayStyle += 'color:#38bdf8; font-weight:900; background:rgba(56,189,248,0.08);';
        markerSymbol = '<span style="position:absolute; bottom:1px; width:3.5px; height:3.5px; background:#38bdf8; border-radius:50%;"></span>';
      } else if (hasPlanMemo) {
        dayStyle += 'color:#34d399; font-weight:900; background:rgba(52,211,153,0.08);';
        markerSymbol = '<span style="position:absolute; bottom:1px; font-size:8px; color:#34d399; font-weight:900; line-height:1;">⚑</span>';
      } else {
        dayStyle += 'color:#cbd5e1;';
      }

      calendarDaysHtml += '<div style="' + dayStyle + '" onclick="window.handlePlanCalendarClick(' + d + ', ' + viewMonth + ', ' + viewYear + ')" oncontextmenu="event.preventDefault(); window.openDateActionModal(' + d + ', ' + viewMonth + ', ' + viewYear + ');" ontouchstart="window.startDateLongPress(event, ' + d + ', ' + viewMonth + ', ' + viewYear + ')" ontouchend="window.cancelDateLongPress()" ontouchmove="window.cancelDateLongPress()">' + d + todayBadge + markerSymbol + '</div>';
    }

    var totalRenderedCells = firstDayIndex + lastDayOfMonth;
    for (var te = 0; te < (42 - totalRenderedCells); te++) {
      calendarDaysHtml += '<div style="height:100% !important;"></div>';
    }

    // 장비 및 음식 총 무게 계산
    var planItems = [];
    var totalGrams = 0;
    if (typeof window.CATEGORIES !== 'undefined' && typeof window.selectedGearMap !== 'undefined') {
      window.CATEGORIES.forEach(function(cat) {
        (window.selectedGearMap[cat.id] || []).forEach(function(it) {
          if (it && (it.name || it.itemName)) {
            var w = Number(it.weight || it.weight_g || 0);
            planItems.push({ name: it.name || it.itemName, weight: w });
            totalGrams += w;
          }
        });
      });
    }

    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    var tripConsumables = consumablesMap[activeDateStr] || [];
    tripConsumables.forEach(function(c) {
      planItems.push({ id: c.id, name: c.name, weight: c.weight, isConsumable: true });
      totalGrams += c.weight;
    });

    var packedCount = 0;
    planItems.forEach(function(it) {
      var checkKey = activeDateStr + '__' + it.name;
      if (window.packedCheckSet && window.packedCheckSet.has(checkKey)) packedCount++;
    });
    var planProgressPct = planItems.length > 0 ? Math.round((packedCount / planItems.length) * 100) : 0;
    var totalKgStr = (totalGrams / 1000).toFixed(2);

    var pendingNoticeBanner = window.__pendingPlanDestination ? `
      <div style="background:linear-gradient(135deg, rgba(2,132,199,0.3), rgba(13,148,136,0.3)); border:1.2px solid #38bdf8; border-radius:6px; padding:3px 8px; font-size:0.65rem; font-weight:900; color:#fff; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; flex-shrink:0;">
        <span>👉 [${escapeHtml(window.__pendingPlanDestination.name)}] 떠날 날짜를 달력에서 터치하세요!</span>
        <button type="button" onclick="window.__pendingPlanDestination=null; window.renderPlanStage();" style="background:none; border:none; color:#cbd5e1; font-size:0.75rem; cursor:pointer;">✕</button>
      </div>
    ` : '';

    // 1. [첫 화면] 달력 45% + 메모장 31% + 계획세우기 12% + 패킹현황 12%
    var calendarMemoViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0 4px 0; overflow:hidden !important; overscroll-behavior:none !important; box-sizing:border-box;">
        
        <!-- 1. 달력 카드 (45%) -->
        <div style="flex:45 1 0% !important; min-height:0 !important; background:rgba(255,255,255,0.035); border:1px solid rgba(226,232,240,0.16); border-radius:12px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
          ${pendingNoticeBanner}
          <div style="display:flex; justify-content:space-between; align-items:center; height:24px; flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:5px;">
              <button type="button" onclick="window.changePlanMonth(-1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:24px; height:24px; border-radius:5px; font-size:0.72rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">◀</button>
              <span style="font-size:0.86rem; font-weight:900; color:#fff; font-family:'Space Grotesk', sans-serif;">${viewYear}년 ${viewMonth}월 계획</span>
              <button type="button" onclick="window.changePlanMonth(1)" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:24px; height:24px; border-radius:5px; font-size:0.72rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">▶</button>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.56rem; color:#fde047; font-weight:800;">★완료</span>
              <span style="font-size:0.56rem; color:#34d399; font-weight:800;">⚑계획</span>
              <span style="font-size:0.65rem; color:#38bdf8; font-weight:900; font-family:'Space Grotesk', sans-serif;">${activeDateStr}</span>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.58rem; font-weight:800; color:#64748b; height:16px; line-height:16px; flex-shrink:0;">
            <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#38bdf8;">토</span>
          </div>
          <div style="flex:1 1 0%; min-height:0; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:repeat(6, 1fr); gap:2px; text-align:center;">
            ${calendarDaysHtml}
          </div>
        </div>

      <!-- 2. 메모장 카드 (31%) + 삭제 버튼 상시 노출 -->
        <div style="flex:31 1 0% !important; min-height:0 !important; background:rgba(255,255,255,0.03); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:6px 10px; display:flex; flex-direction:column; gap:4px; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; height:20px; flex-shrink:0;">
            <div style="font-size:0.74rem; font-weight:900; color:#38bdf8; display:flex; align-items:center; gap:5px;">
              <span>📝</span>
              <span>[${activeDateStr}] 일정 메모장</span>
            </div>
            <div style="display:flex; gap:5px; align-items:center;">
              <button type="button" onclick="window.clearEntireDaySchedule('${activeDateStr}');" style="background:rgba(244,63,94,0.18); border:1px solid #f43f5e; color:#fda4af; font-size:0.62rem; font-weight:900; padding:2px 7px; border-radius:5px; cursor:pointer;">
                일정 삭제 ✕
              </button>
              <button type="button" onclick="window.savePlanMemo('${activeDateStr}');" style="background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.65rem; font-weight:900; padding:2px 8px; border-radius:5px; cursor:pointer;">
                저장 ✓
              </button>
            </div>
          </div>
          <textarea id="planDailyMemoInput" placeholder="이 날짜의 일정과 챙길 것들을 메모해보세요 (예: 14시 도착, 2번 데크 피칭, 온수 준비)..." oninput="window.autoSavePlanMemo('${activeDateStr}', this.value)" style="flex:1 1 0% !important; min-height:0 !important; width:100%; background:rgba(0,0,0,0.45); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 8px; font-size:0.86rem !important; color:#fff; line-height:1.45; outline:none; resize:none; font-family:'SUIT', sans-serif; box-sizing:border-box;">${escapeHtml(currentDayMemo)}</textarea>
        </div>

        <!-- 3. 낭만계획세우기 카드 (12%) -->
        <div style="flex:12 1 0% !important; min-height:0 !important; background:linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border:1.5px dashed rgba(56,189,248,0.45); border-radius:11px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; gap:8px; box-sizing:border-box;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <div style="font-size:1.35rem; line-height:1; flex-shrink:0;">🎒</div>
            <div style="min-width:0;">
              <div style="font-size:0.80rem; font-weight:900; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">[${activeDateStr}] 낭만 계획 세우기</div>
              <div style="font-size:0.60rem; color:#94a3b8; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">배낭 계산기로 10대 슬롯 패킹</div>
            </div>
          </div>
          <button type="button" onclick="window.activePlanSubMode='calculator'; window.renderPlanStage(); setTimeout(window.renderPlanCategorySlots, 50); triggerHaptic(12);" style="height:32px; padding:0 12px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; border-radius:7px; color:#ffffff; font-size:0.72rem; font-weight:900; cursor:pointer; box-shadow:0 3px 8px rgba(2,132,199,0.35); display:flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0; white-space:nowrap;">
            <span>계획 세우기 ➔</span>
          </button>
        </div>

        <!-- 4. 배낭 패킹 준비 현황 (12% - 나머지) -->
        <div style="flex:12 1 0% !important; min-height:0 !important; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-radius:11px; padding:0 12px; display:flex; justify-content:space-between; align-items:center; gap:8px; box-sizing:border-box;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <div style="font-size:1.35rem; line-height:1; flex-shrink:0;">📊</div>
            <div style="min-width:0;">
              <div style="font-size:0.64rem; font-weight:800; color:#94a3b8;">배낭 패킹 준비 현황</div>
              <div style="font-size:0.80rem; font-weight:900; color:#34d399; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">총 ${planItems.length}개 중 ${packedCount}개 (${planProgressPct}%)</div>
            </div>
          </div>
          <button type="button" onclick="window.activePlanSubMode='checklist'; window.renderPlanStage(); triggerHaptic(10);" style="height:32px; padding:0 12px; background:rgba(52,211,153,0.15); border:1px solid #34d399; color:#6ee7b7; font-size:0.72rem; font-weight:900; border-radius:7px; cursor:pointer; flex-shrink:0; white-space:nowrap; display:flex; align-items:center; justify-content:center;">
            체크리스트 열기 ➔
          </button>
        </div>
      </div>
    `;

  // 2. 실전 패킹 체크리스트 뷰
    var checklistViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:8px; padding:4px 0; overflow:hidden; box-sizing:border-box;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:8px 12px; flex-shrink:0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size:0.75rem; font-weight:900; color:#34d399; display:flex; align-items:center; gap:5px;">
              <span>🎒 [${activeDateStr}] 실전 체크리스트</span>
              <span style="font-size:0.65rem; color:#cbd5e1; font-family:'Space Grotesk', sans-serif;">(${packedCount}/${planItems.length}개)</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button type="button" onclick="window.toggleAllPackCheckItems(true, '${activeDateStr}')" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.60rem; font-weight:800; padding:3px 7px; border-radius:4px; cursor:pointer;">전체 체크</button>
              <button type="button" onclick="window.toggleAllPackCheckItems(false, '${activeDateStr}')" style="background:rgba(255,255,255,0.08); border:none; color:#94a3b8; font-size:0.60rem; font-weight:800; padding:3px 7px; border-radius:4px; cursor:pointer;">전체 해제</button>
            </div>
          </div>
          <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
            <div style="width:${planProgressPct}%; height:100%; background:linear-gradient(90deg, #38bdf8, #34d399); transition:width 0.25s ease;"></div>
          </div>
        </div>

        <div style="flex:1 1 0% !important; min-height:0 !important; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; overscroll-behavior-y:contain !important; touch-action:pan-y !important; display:flex; flex-direction:column; gap:5px; padding-right:2px;">
          ${planItems.map(function(it, idx) {
            var checkKey = activeDateStr + '__' + it.name;
            var isChecked = window.packedCheckSet && window.packedCheckSet.has(checkKey);
            var gWeightKg = (it.weight / 1000).toFixed(2);
            var isFood = it.isConsumable === true;
            return `
              <div onclick="window.togglePackCheckByIndex(${idx})" style="background:${isChecked ? 'rgba(16,185,129,0.14)' : (isFood ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.035)')}; border:1px solid ${isChecked ? '#10b981' : (isFood ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)')}; border-radius:10px; padding:9px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; user-select:none; transition:all 0.15s ease; flex-shrink:0;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <div style="width:20px; height:20px; border-radius:5px; border:1.5px solid ${isChecked ? '#10b981' : 'rgba(255,255,255,0.35)'}; background:${isChecked ? '#10b981' : 'transparent'}; display:flex; align-items:center; justify-content:center; color:#000; font-size:12px; font-weight:900; flex-shrink:0;">
                    ${isChecked ? '✓' : ''}
                  </div>
                  <span style="font-size:0.80rem; font-weight:800; color:${isChecked ? '#94a3b8' : '#ffffff'}; text-decoration:${isChecked ? 'line-through' : 'none'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                    ${isFood ? '<span style="font-size:0.85rem;">🍖</span>' : ''}
                    <span>${escapeHtml(it.name)}</span>
                  </span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0; margin-left:8px;">
                  <span style="font-size:0.72rem; font-weight:800; color:${isFood ? '#fde047' : '#34d399'}; font-family:'Space Grotesk', sans-serif;">
                    ${gWeightKg > 0 ? (gWeightKg + 'kg') : ''}
                  </span>
                  ${isFood ? `
                    <button type="button" onclick="window.removeChecklistConsumableItem('${it.id}', event)" style="background:rgba(244,63,94,0.18); border:1px solid rgba(244,63,94,0.35); color:#fda4af; font-size:0.6rem; padding:2px 5px; border-radius:4px; cursor:pointer;">✕</button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div style="background:rgba(255,255,255,0.03); border:1.5px dashed rgba(52,211,153,0.45); border-radius:10px; padding:7px 8px; display:flex; gap:6px; align-items:center; flex-shrink:0; box-sizing:border-box;">
          <span style="font-size:0.9rem; flex-shrink:0;">🍖</span>
          <input type="text" id="inputChecklistFoodName" placeholder="음식·간식·소모품 추가 (예: 삼겹살, 라면)" onkeydown="if(event.key==='Enter') window.addChecklistConsumableItem();" style="flex:1; min-width:0; height:32px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; font-size:0.75rem; padding:0 8px; outline:none;" />
          <input type="number" id="inputChecklistFoodWeight" placeholder="무게g" onkeydown="if(event.key==='Enter') window.addChecklistConsumableItem();" style="width:62px; height:32px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; font-size:0.75rem; padding:0 6px; outline:none; font-family:'JetBrains Mono', monospace;" />
          <button type="button" onclick="window.addChecklistConsumableItem();" style="height:32px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.74rem; font-weight:900; padding:0 10px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap;">
            + 추가
          </button>
        </div>

        <div style="flex-shrink:0; padding-bottom:2px; box-sizing:border-box;">
          <button type="button" onclick="window.completeChecklist('${activeDateStr}');" style="width:100%; height:44px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:1px solid #34d399; color:#ffffff; font-size:0.84rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 14px rgba(16,185,129,0.35); white-space:nowrap;">
            <svg viewBox="0 0 24 24" style="width:17px; height:17px; stroke:currentColor; fill:none; stroke-width:3;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>패킹 체크 완료 (${packedCount}/${planItems.length}) ✓</span>
          </button>
        </div>
      </div>
    `;
 // 3. 10대 슬롯 배낭 계산기 뷰
    var calculatorViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; box-sizing:border-box; overflow:hidden;">
        <div class="weight-dashboard-strip" style="flex-shrink:0;">
          <div class="weight-dash-top">
            <div>
              <div style="font-size:0.68rem; font-weight:800; color:#94a3b8;">배낭 총 무게 (Total Weight)</div>
              <div class="weight-val-big" id="planTotalWeightKgText">${totalKgStr} kg</div>
            </div>
            <div style="text-align:right;">
              <div id="planBplStatusBadge" class="weight-bpl-badge bpl-ul">
                <span id="planBplStatusText">울트라라이트 (UL)</span>
              </div>
              <div style="font-size:0.68rem; color:#cbd5e1; font-family:'Space Grotesk', sans-serif; margin-top:2px;" id="planTotalWeightGramsText">${totalGrams.toLocaleString()} g</div>
            </div>
          </div>
          <div class="weight-gauge-bg">
            <div class="weight-gauge-fill" id="planWeightGaugeFill" style="width:${Math.min(100, Math.round((totalGrams / 14000) * 100))}%;"></div>
          </div>
        </div>

        <div class="category-slots-grid" id="planCategorySlotsContainer" style="overflow-y:auto; overscroll-behavior-y:contain; touch-action:pan-y;"></div>

        <!-- 배낭계산기 하단 액션 컨트롤 바: 초기화 & 템플릿으로 저장하기 -->
        <div style="flex-shrink:0 !important; display:flex; gap:8px; padding:4px 0 2px 0; box-sizing:border-box;">
          <button type="button" onclick="window.resetPlanCalculatorGears();" style="flex:0.8; height:42px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.75rem; font-weight:800; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2;"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <span>초기화</span>
          </button>
          <button type="button" onclick="window.saveCurrentPackingRecord();" style="flex:2; height:42px; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border:1px solid #38bdf8; color:#ffffff; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 12px rgba(2,132,199,0.35); white-space:nowrap;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>템플릿으로 저장하기 ➔</span>
          </button>
        </div>
      </div>
    `;

// 4. [가보고 싶은 곳] 찜 목록 뷰 (슬림 카드 & 목적지 설정)
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

    var bookmarksViewHtml = `
      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; gap:6px; padding:2px 0; overflow-y:auto; overscroll-behavior-y:contain; touch-action:pan-y; box-sizing:border-box;">
        <div style="padding:4px 2px; display:flex; justify-content:space-between; align-items:flex-end;">
          <span style="font-size:0.86rem; font-weight:900; color:#fde047;">⭐ 가보고 싶은 곳 (${bookmarkedSpots.length}곳)</span>
          <span style="font-size:0.54rem; color:#94a3b8;">장소 터치 시 지도 연동 · 우측 버튼 터치 시 날짜 선택</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
          ${bookmarkedSpots.length === 0 ? `
            <div style="text-align:center; padding:60px 0; color:#94a3b8; font-size:0.78rem; line-height:1.6;">
              찜해둔 장소가 없습니다.<br>
              전국지도에서 가보고 싶은 곳을 ⭐ 찜해보세요!
            </div>
          ` : bookmarkedSpots.map(function(s) {
            return `
              <div onclick="location.href='map.html?spot=' + encodeURIComponent('${escapeHtml(s.name)}');" style="background:rgba(255,255,255,0.035); border:1px solid rgba(253,224,71,0.22); border-radius:8px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.15s ease;">
                <div style="flex:1; min-width:0; padding-right:8px;">
                  <div style="font-size:0.80rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px;">
                    <span style="color:#fde047; flex-shrink:0;">⭐</span>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.name)}</span>
                  </div>
                  <div style="font-size:0.58rem; color:#94a3b8; margin-top:1px;">고도/위치: ${escapeHtml(s.elevation)}</div>
                </div>
                <button type="button" onclick="event.stopPropagation(); window.selectPlanDestination('${escapeHtml(s.name)}', '${escapeHtml(s.elevation)}');" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#ffffff; font-size:0.65rem; font-weight:900; padding:5px 9px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap; box-shadow:0 2px 8px rgba(2,132,199,0.3);">
                  목적지로 설정
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // 5. [복원] 즐겨찾기(⭐) 내 장비 관리 뷰
    var favSet = window.favoriteGearSet || new Set(safeGetJSON('okbm_favorite_gears', []));
    var customGears = safeGetJSON('okbm_custom_gears', []);
    var allCats = window.CATEGORIES || [];
    var allDbGears = [];
    allCats.forEach(function(cat) { (cat.db || []).forEach(function(g) { if (g) allDbGears.push(g); }); });
    customGears.forEach(function(cg) { if (cg) allDbGears.push(cg); });

    var myFavGears = [];
    favSet.forEach(function(favName) {
      var found = allDbGears.find(function(g) { return g && g.name === favName; });
      myFavGears.push({
        name: favName,
        brand: found ? found.brand : '내 장비',
        weight: found ? found.weight : 0
      });
    });

    var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
    var gearPresets = safeGetJSON('okbm_gear_presets', []);

 var gearsViewHtml = `
      <div id="planGearsScrollArea" style="flex:1 1 0% !important; min-height:0 !important; width:100% !important; max-width:100% !important; display:flex; flex-direction:column; gap:10px; padding:2px 0; overflow-y:auto !important; overflow-x:hidden !important; overscroll-behavior-y:contain !important; touch-action:pan-y !important; box-sizing:border-box;">
        
        <!-- 원클릭 패킹 세트(프리셋) 관리 -->
        <div style="background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1.5px solid rgba(56,189,248,0.35); border-radius:12px; padding:10px 12px; display:flex; flex-direction:column; gap:8px; flex-shrink:0; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; display:flex; align-items:center; gap:5px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <span>🎒</span>
              <span>나만의 원클릭 패킹 세트 (${gearPresets.length}개)</span>
            </div>
            <button type="button" onclick="window.saveCurrentGearsAsPreset();" style="background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.65rem; font-weight:900; padding:4px 9px; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap; box-shadow:0 2px 8px rgba(13,148,136,0.3);">
              + 세트로 저장
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:6px;">
            ${gearPresets.length === 0 ? `
              <div style="font-size:0.68rem; color:#94a3b8; line-height:1.4; padding:4px 0;">
                자주 가는 패킹 조합(예: 3계절 BPL, 극동계 세트)을 세트로 저장해두면 매번 계산기를 두드릴 필요 없이 1초 만에 배낭이 채워집니다!
              </div>
            ` : gearPresets.map(function(preset) {
              return `
                <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px; box-sizing:border-box;">
                  <div style="flex:1 1 0%; min-width:0; overflow:hidden;">
                    <div style="font-size:0.82rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(preset.name)}</div>
                    <div style="font-size:0.62rem; color:#34d399; font-family:'JetBrains Mono', monospace; margin-top:2px;">
                      총 ${preset.totalKg}kg · 장비 ${preset.itemCount}개 (${preset.createdAt})
                    </div>
                  </div>
                  <div style="display:flex; gap:5px; align-items:center; flex-shrink:0;">
                    <button type="button" onclick="window.loadGearPreset('${preset.id}');" style="background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.66rem; font-weight:900; padding:5px 9px; border-radius:6px; cursor:pointer; white-space:nowrap;">
                      채우기 ➔
                    </button>
                    <button type="button" onclick="window.deleteGearPreset('${preset.id}');" style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.35); color:#fda4af; font-size:0.62rem; font-weight:800; padding:4px 7px; border-radius:6px; cursor:pointer;">
                      ✕
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 새 장비 직접 등록 -->
        <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(56,189,248,0.3); border-radius:12px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; flex-shrink:0; box-sizing:border-box;">
          <div style="font-size:0.75rem; font-weight:900; color:#fde047; display:flex; align-items:center; gap:4px;">
            <span>➕</span>
            <span>새 장비 직접 등록 (등록 즉시 ⭐ 내 장비로 저장)</span>
          </div>

          <div style="display:flex; gap:6px;">
            <input type="text" id="mgrInputGearName" class="modal-input" placeholder="장비명 (예: MSR 엘릭서 2)" style="flex:2; min-width:0; font-size:0.74rem; height:32px; background:rgba(0,0,0,0.4); border-radius:6px;" />
            <select id="mgrSelectGearCat" style="flex:1.2; min-width:0; height:32px; background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:#fff; font-size:0.70rem; font-weight:700; padding:0 4px; outline:none;">
              <option value="shelter">텐트·타프</option>
              <option value="sleep">침낭·매트</option>
              <option value="pack">배낭</option>
              <option value="food">식수·식량</option>
              <option value="kitchen">취사·보온병</option>
              <option value="wear">보온의류</option>
              <option value="electronics">랜턴·안전</option>
              <option value="camp">체어·테이블</option>
            </select>
          </div>

          <div style="display:flex; gap:6px;">
            <input type="number" id="mgrInputGearWeight" class="modal-input" placeholder="무게 (g)" style="flex:1; min-width:0; font-size:0.74rem; height:32px; background:rgba(0,0,0,0.4); border-radius:6px; font-family:'JetBrains Mono', monospace;" />
            <input type="text" id="mgrInputGearDate" class="modal-input" placeholder="구매일 (예: 2024.05)" style="flex:1; min-width:0; font-size:0.74rem; height:32px; background:rgba(0,0,0,0.4); border-radius:6px;" />
            <button type="button" onclick="window.addDirectGearToManager();" style="flex:1.3; height:32px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.74rem; font-weight:900; border-radius:6px; cursor:pointer; flex-shrink:0; white-space:nowrap;">
              + 등록
            </button>
          </div>
        </div>

        <!-- 내 장비 프로필 관리 목록 (긴 장비명 겹침 완벽 방어) -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:2px 4px;">
          <span id="mgrFavCountLabel" style="font-size:0.75rem; font-weight:900; color:#ffffff;">⭐ 내 장비 프로필 관리 (${myFavGears.length}개)</span>
          <span style="font-size:0.62rem; color:#94a3b8;">구매일 · 마지막 사용일 · 관리메모</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; flex:1;">
          ${myFavGears.length === 0 ? `
            <div style="text-align:center; padding:40px 0; color:#94a3b8; font-size:0.78rem; line-height:1.6;">
              즐겨찾기(⭐)한 내 장비가 없습니다.<br>
              위의 등록창에서 장비를 추가하거나 배낭계산기에서 ⭐를 눌러보세요!
            </div>
          ` : myFavGears.map(function(g) {
            var meta = gearMetaObj[g.name] || { purchaseDate: '', lastUsedDate: '', memo: '' };
            return `
              <div class="my-gear-manage-card" style="background:rgba(255,255,255,0.035); border:1px solid rgba(56,189,248,0.25); border-radius:12px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; box-sizing:border-box; width:100%;">
                
                <!-- 상단: 긴 장비명 말줄임 처리 & 버튼 겹침 완벽 차단 -->
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; width:100%;">
                  <div style="flex:1 1 0%; min-width:0; overflow:hidden;">
                    <div style="font-size:0.84rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; min-width:0;">
                      <span style="color:#fde047; flex-shrink:0;">⭐</span>
                      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; flex:1; min-width:0;" title="${escapeHtml(g.name)}">${escapeHtml(g.name)}</span>
                    </div>
                    <div style="font-size:0.62rem; color:#38bdf8; font-family:'JetBrains Mono', monospace; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                      ${escapeHtml(g.brand || '내 장비')} · ${(g.weight / 1000).toFixed(2)}kg (${g.weight}g)
                    </div>
                  </div>
                  <button type="button" onclick="window.removeFavoriteGearFromManager('${escapeHtml(g.name)}', this)" style="flex-shrink:0; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); color:#fda4af; font-size:0.62rem; font-weight:800; padding:4px 8px; border-radius:6px; cursor:pointer; white-space:nowrap;">
                    내 장비 해제
                  </button>
                </div>

                <div style="display:flex; gap:6px; margin-top:2px;">
                  <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.58rem; color:#94a3b8; font-weight:700;">📅 구매일</span>
                    <input type="text" placeholder="예: 2024.03" value="${escapeHtml(meta.purchaseDate || '')}" oninput="window.updateGearMeta('${escapeHtml(g.name)}', 'purchaseDate', this.value)" style="width:100%; height:28px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:0.72rem; padding:0 6px; outline:none; box-sizing:border-box;" />
                  </div>
                  <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                    <span style="font-size:0.58rem; color:#94a3b8; font-weight:700;">🏕️ 마지막 사용일</span>
                    <input type="text" placeholder="예: 2026.08.15" value="${escapeHtml(meta.lastUsedDate || '')}" oninput="window.updateGearMeta('${escapeHtml(g.name)}', 'lastUsedDate', this.value)" style="width:100%; height:28px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:0.72rem; padding:0 6px; outline:none; box-sizing:border-box;" />
                  </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span style="font-size:0.58rem; color:#94a3b8; font-weight:700;">📝 상태 & 관리 메모</span>
                  <input type="text" placeholder="예: 심실링 방수 완료, 풋프린트 포함, 펙 2개 보충 요망..." value="${escapeHtml(meta.memo || '')}" oninput="window.updateGearMeta('${escapeHtml(g.name)}', 'memo', this.value)" style="width:100%; height:28px; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:#fff; font-size:0.72rem; padding:0 6px; outline:none; box-sizing:border-box;" />
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

    var isPlanToolsActive = (window.__planDockDeckMode !== 'main');

    // 🌟 [하단독 서브모드 전환 및 동일 탭 재터치 시 독 전환 엔진]
  window.switchPlanSubMode = function(mode) {
    if (window.activePlanSubMode === mode) {
      // 이미 켜져 있는 탭을 한 번 더 누르면 독 전환!
      window.togglePlanDockDeckMode();
      triggerHaptic(12);
      return;
    }
    window.activePlanSubMode = mode;
    window.renderPlanStage();
    if (mode === 'calculator') {
      setTimeout(window.renderPlanCategorySlots, 50);
    }
    triggerHaptic(10);
  };

  // 🌟 듀얼 하단독 설정 (상하 슬라이드 모션 제거 -> 은은하고 자연스러운 페이드 전환)
  var bottomDualDockHtml = `
      <div id="planDualDockContainer" style="position:relative !important; width:100% !important; height:calc(56px + env(safe-area-inset-bottom, 0px)) !important; background:rgba(7,9,14,0.98) !important; border-top:1px solid rgba(255,255,255,0.12) !important; overflow:hidden !important; flex-shrink:0 !important; z-index:1000 !important; user-select:none !important; overscroll-behavior:none !important; touch-action:none !important;">
        
        <div onclick="window.togglePlanDockDeckMode(); triggerHaptic(10);" style="position:absolute; top:2px; left:50%; transform:translateX(-50%); width:44px; height:8px; display:flex; align-items:center; justify-content:center; z-index:115; cursor:pointer;">
          <div style="width:28px; height:3.5px; border-radius:2px; background:rgba(255,255,255,0.35);"></div>
        </div>

        <div id="planSubToolsDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:opacity 0.18s ease; opacity:${isPlanToolsActive ? '1' : '0'}; pointer-events:${isPlanToolsActive ? 'auto' : 'none'}; z-index:${isPlanToolsActive ? '105' : '100'}; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; box-sizing:border-box;">
          <button type="button" class="dock-item ${window.activePlanSubMode === 'calendar' ? 'active' : ''}" onclick="window.switchPlanSubMode('calendar');" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activePlanSubMode === 'calendar' ? '#38bdf8 !important' : '#94a3b8 !important'}; font-size:0.67rem; font-weight:${window.activePlanSubMode === 'calendar' ? '900' : '700'}; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>달력</span>
          </button>
          
          <button type="button" class="dock-item ${window.activePlanSubMode === 'checklist' ? 'active' : ''}" onclick="window.switchPlanSubMode('checklist');" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activePlanSubMode === 'checklist' ? '#38bdf8 !important' : '#94a3b8 !important'}; font-size:0.67rem; font-weight:${window.activePlanSubMode === 'checklist' ? '900' : '700'}; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>체크리스트</span>
          </button>

          <button type="button" class="dock-item ${window.activePlanSubMode === 'calculator' ? 'active' : ''}" onclick="window.switchPlanSubMode('calculator');" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activePlanSubMode === 'calculator' ? '#38bdf8 !important' : '#94a3b8 !important'}; font-size:0.67rem; font-weight:${window.activePlanSubMode === 'calculator' ? '900' : '700'}; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>
            <span>배낭계산기</span>
          </button>

          <button type="button" class="dock-item ${window.activePlanSubMode === 'bookmarks' ? 'active' : ''}" onclick="window.switchPlanSubMode('bookmarks');" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activePlanSubMode === 'bookmarks' ? '#38bdf8 !important' : '#94a3b8 !important'}; font-size:0.67rem; font-weight:${window.activePlanSubMode === 'bookmarks' ? '900' : '700'}; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:currentColor;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>찜</span>
          </button>

          <button type="button" class="dock-item ${window.activePlanSubMode === 'gears' ? 'active' : ''}" onclick="window.switchPlanSubMode('gears');" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:none; border:none; color:${window.activePlanSubMode === 'gears' ? '#38bdf8 !important' : '#94a3b8 !important'}; font-size:0.67rem; font-weight:${window.activePlanSubMode === 'gears' ? '900' : '700'}; cursor:pointer; min-height:48px; padding:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2.2;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>장비관리</span>
          </button>
        </div>

        <div id="planMainNavDeck" style="position:absolute; inset:0; display:flex; justify-content:space-around; align-items:center; transition:opacity 0.18s ease; opacity:${isPlanToolsActive ? '0' : '1'}; pointer-events:${isPlanToolsActive ? 'none' : 'auto'}; z-index:${isPlanToolsActive ? '100' : '105'}; padding:0 2px calc(env(safe-area-inset-bottom, 0px)) 2px; background:rgba(7,9,14,0.98); box-sizing:border-box;">
          <a href="index.html" class="dock-item" onclick="window.closePlanModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span>낭만루터</span>
          </a>
          <a href="map.html" class="dock-item" onclick="window.closePlanModal(); triggerHaptic(10);" style="text-decoration:none;">
            <svg viewBox="0 0 24 24"><path d="M15 5.1L9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5l-.16.03L15 5.1zM15 18.9l-6-2.1V5.1l6 2.1v11.7z"/></svg>
            <span>전국지도</span>
          </a>
          <button type="button" class="dock-item active" onclick="window.togglePlanDockDeckMode('tools'); triggerHaptic(12);" style="color:#38bdf8 !important;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M9 16l2 2 4-4"/>
            </svg>
            <span>낭만계획</span>
          </button>
          <button type="button" class="dock-item" onclick="if(typeof window.openHistoryModal==='function') window.openHistoryModal(); else window.closePlanModal(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 8v13H3V8"/>
              <path d="M1 3h22v5H1z"/>
              <path d="M10 12h4"/>
            </svg>
            <span>낭만보관함</span>
          </button>
          <button type="button" class="dock-item" onclick="window.closePlanModal(); if(typeof handleAuthBtnClick==='function') handleAuthBtnClick(); triggerHaptic(10);">
            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            <span>내정보</span>
          </button>
        </div>
      </div>
    `;

    var content = modal.querySelector('.romantic-plan-content');
    if (!content) return;

    var viewSlot = content.querySelector('#planMainViewContainer');
    var existingDock = content.querySelector('#planDualDockContainer');

    if (!viewSlot || !existingDock) {
      content.innerHTML = `
        <div id="planMainViewContainer" style="flex:1 1 0% !important; min-height:0 !important; width:100%; display:flex; flex-direction:column; padding:calc(10px + env(safe-area-inset-top, 0px)) 12px 0 12px; margin:0 !important; box-sizing:border-box; overflow:hidden;">
          ${currentViewHtml}
        </div>
        ${bottomDualDockHtml}
      `;
    } else {
      viewSlot.innerHTML = currentViewHtml;
      
      var subButtons = existingDock.querySelectorAll('#planSubToolsDeck .dock-item');
      var modeKeys = ['calendar', 'checklist', 'calculator', 'bookmarks', 'gears'];
      subButtons.forEach(function(btn, bIdx) {
        var key = modeKeys[bIdx];
        if (key === window.activePlanSubMode) {
          btn.classList.add('active');
          btn.style.setProperty('color', '#38bdf8', 'important');
          btn.style.setProperty('font-weight', '900', 'important');
        } else {
          btn.classList.remove('active');
          btn.style.setProperty('color', '#94a3b8', 'important');
          btn.style.setProperty('font-weight', '700', 'important');
        }
      });

      var subDeck = existingDock.querySelector('#planSubToolsDeck');
      var mainDeck = existingDock.querySelector('#planMainNavDeck');
      if (subDeck && mainDeck) {
        subDeck.style.opacity = isPlanToolsActive ? '1' : '0';
        subDeck.style.pointerEvents = isPlanToolsActive ? 'auto' : 'none';
        subDeck.style.zIndex = isPlanToolsActive ? '105' : '100';

        mainDeck.style.opacity = isPlanToolsActive ? '0' : '1';
        mainDeck.style.pointerEvents = isPlanToolsActive ? 'none' : 'auto';
        mainDeck.style.zIndex = isPlanToolsActive ? '100' : '105';
      }
    }

    if (window.activePlanSubMode === 'calculator') {
      window.renderPlanCategorySlots();
    }

    if (typeof window.bindPlanDualDockGestures === 'function') {
      window.bindPlanDualDockGestures();
    }
  };

  // ⚙️ [내 장비 메타 정보(구매일/마지막사용일/메모) 실시간 저장]
  window.updateGearMeta = function(gearName, field, value) {
    var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
    if (!gearMetaObj[gearName]) gearMetaObj[gearName] = {};
    gearMetaObj[gearName][field] = value;
    localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  window.removeFavoriteGearFromManager = function(gearName, btnEl) {
    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.delete(gearName);
    localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));
    triggerHaptic(10);
    if (typeof showToast === 'function') showToast('⭐ [' + gearName + '] 즐겨찾기 해제', 'info');

    // 스크롤 튐 방지: DOM에서 해당 카드만 부드럽게 제거
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
        if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
        return;
      }
    }

    // 폴백 스크롤 보존
    var scrollBox = document.getElementById('planGearsScrollArea');
    var savedScrollTop = scrollBox ? scrollBox.scrollTop : 0;
    window.renderPlanStage();
    var newScrollBox = document.getElementById('planGearsScrollArea');
    if (newScrollBox) newScrollBox.scrollTop = savedScrollTop;
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  // 🎒 [원클릭 패킹 세트 저장/불러오기/삭제 엔진]
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

    var presets = safeGetJSON('okbm_gear_presets', []);
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
    localStorage.setItem('okbm_gear_presets', JSON.stringify(presets));
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 [' + newPreset.name + '] 세트가 저장되었습니다!', 'success');
    window.renderPlanStage();
  };

  window.loadGearPreset = function(presetId) {
    var presets = safeGetJSON('okbm_gear_presets', []);
    var target = presets.find(function(p) { return String(p.id) === String(presetId); });
    if (!target) return;

    window.selectedGearMap = JSON.parse(JSON.stringify(target.gears));
    localStorage.setItem('okbm_selected_gears_multi', JSON.stringify(window.selectedGearMap));

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 [' + target.name + '] 세트로 배낭이 1초 만에 세팅되었습니다!', 'success');

    window.activePlanSubMode = 'calculator';
    window.renderPlanStage();
    setTimeout(function() {
      if (typeof window.renderPlanCategorySlots === 'function') window.renderPlanCategorySlots();
    }, 50);

    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  window.deleteGearPreset = function(presetId) {
    var presets = safeGetJSON('okbm_gear_presets', []);
    var target = presets.find(function(p) { return String(p.id) === String(presetId); });
    var name = target ? target.name : '세트';
    if (!confirm('[' + name + '] 세트를 삭제하시겠습니까?')) return;

    presets = presets.filter(function(p) { return String(p.id) !== String(presetId); });
    localStorage.setItem('okbm_gear_presets', JSON.stringify(presets));
    triggerHaptic(10);
    if (typeof showToast === 'function') showToast('패킹 세트가 삭제되었습니다.', 'info');
    window.renderPlanStage();
  };

  // ➕ [장비관리에서 직접 장비 추가 ➔ 즉시 ⭐ 즐겨찾기 자동 등록]
  window.addDirectGearToManager = function() {
    var nameEl = document.getElementById('mgrInputGearName');
    var weightEl = document.getElementById('mgrInputGearWeight');
    var catEl = document.getElementById('mgrSelectGearCat');
    var dateEl = document.getElementById('mgrInputGearDate');

    if (!nameEl || !weightEl) return;
    var name = nameEl.value.trim();
    var weight = parseInt(weightEl.value, 10);
    var catId = catEl ? catEl.value : 'shelter';
    var purchaseDate = dateEl ? dateEl.value.trim() : '';

    if (!name || isNaN(weight) || weight < 0) {
      if (typeof showToast === 'function') showToast('장비명과 무게(g)를 올바르게 입력해주세요.', 'warn');
      return;
    }

    var newCustomItem = {
      id: 'custom_' + Date.now(),
      name: name,
      weight: weight,
      brand: '내 장비',
      category_id: catId,
      verified: true,
      specs: '내 장비함에서 직접 등록'
    };

    var customGears = safeGetJSON('okbm_custom_gears', []);
    if (!customGears.some(function(g) { return g.name === name; })) {
      customGears.unshift(newCustomItem);
      localStorage.setItem('okbm_custom_gears', JSON.stringify(customGears));
    }

    var cat = (window.CATEGORIES || []).find(function(c) { return c.id === catId; });
    if (cat && !cat.db.some(function(d) { return d.name === name; })) {
      cat.db.unshift(newCustomItem);
    }

    if (!window.favoriteGearSet) window.favoriteGearSet = new Set();
    window.favoriteGearSet.add(name);
    localStorage.setItem('okbm_favorite_gears', JSON.stringify(Array.from(window.favoriteGearSet)));

    if (purchaseDate) {
      var gearMetaObj = safeGetJSON('okbm_gear_meta', {});
      if (!gearMetaObj[name]) gearMetaObj[name] = {};
      gearMetaObj[name].purchaseDate = purchaseDate;
      localStorage.setItem('okbm_gear_meta', JSON.stringify(gearMetaObj));
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('⭐ [' + name + ']이 내 장비함에 등록되었습니다!', 'success');
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    nameEl.value = '';
    weightEl.value = '';
    if (dateEl) dateEl.value = '';
    window.renderPlanStage();
  };

  // 📝 [낭만계획 날짜별 메모 저장 헬퍼]
  window.autoSavePlanMemo = function(dateStr, val) {
    var planMemosObj = safeGetJSON('okbm_plan_memos', {});
    planMemosObj[dateStr] = val;
    localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemosObj));
  };

  window.savePlanMemo = function(dateStr) {
    var input = document.getElementById('planDailyMemoInput');
    var val = input ? input.value : '';
    window.autoSavePlanMemo(dateStr, val);
    triggerHaptic(15);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
    if (typeof showToast === 'function') showToast('📝 [' + dateStr + '] 계획 메모가 저장되었습니다!', 'success');
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

 // 🗑️ [4대 데이터 일괄 완전 삭제: 메모 + 패킹기록(별/점) + 음식 + 체크박스]
  window.clearEntireDaySchedule = function(dateKey) {
    if (!confirm('[' + dateKey + '] 일정을 완전히 지우시겠습니까?\n달력의 표시(별/점), 메모, 체크리스트가 모두 백지화됩니다.')) return;

    // 1. 메모 저장소 삭제
    var planMemos = safeGetJSON('okbm_plan_memos', {});
    delete planMemos[dateKey];
    localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemos));

   var historyList = (window.interactiveHistory && Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0)
      ? window.interactiveHistory
      : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_packing_history', []) : safeGetJSON('okbm_packing_history', []));

    historyList = historyList.filter(function(h) {
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : '';
      return hDate !== dateKey && String(h.date) !== String(dateKey);
    });

    window.interactiveHistory = historyList;
    window.packingHistoryList = historyList;

    if (typeof window.safeSetStorage === 'function') {
      window.safeSetStorage('okbm_packing_history', historyList);
    } else {
      localStorage.setItem('okbm_packing_history', JSON.stringify(historyList));
      if (typeof window.saveToIndexedDB === 'function') {
        window.saveToIndexedDB('okbm_packing_history', historyList);
      }
    }

    // 3. 해당 날짜 음식/소모품 삭제
    var consumablesMap = safeGetJSON('okbm_trip_consumables', {});
    delete consumablesMap[dateKey];
    localStorage.setItem('okbm_trip_consumables', JSON.stringify(consumablesMap));

    // 4. 해당 날짜 체크박스 체크 상태 삭제
    if (window.packedCheckSet) {
      var toDelete = [];
      window.packedCheckSet.forEach(function(k) {
        if (k.startsWith(dateKey + '__')) toDelete.push(k);
      });
      toDelete.forEach(function(k) { window.packedCheckSet.delete(k); });
      localStorage.setItem('okbm_packed_checks', JSON.stringify(Array.from(window.packedCheckSet)));
    }

    // 5. 대기 상태 및 텍스트창 즉시 클리어
    window.__pendingPlanDestination = null;
    var memoInput = document.getElementById('planDailyMemoInput');
    if (memoInput) memoInput.value = '';

    triggerHaptic(20);
    if (typeof showToast === 'function') showToast('🗑️ [' + dateKey + '] 일정이 완전히 삭제되었습니다.', 'info');
    window.renderPlanStage();
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
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

  window.cancelDateLongPress = function() {
    if (window.__longPressTimer) {
      clearTimeout(window.__longPressTimer);
      window.__longPressTimer = null;
    }
  };

  // 📅 [달력 날짜 터치: 목적지 대기 시 확인 팝업창 호출]
  window.handlePlanCalendarClick = function(day, month, year) {
    if (window.__longPressTriggered) {
      window.__longPressTriggered = false;
      return;
    }

    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;
    window.activePlanSubMode = 'calendar';

    // 찜에서 목적지를 정하고 날짜를 콕 찍었을 때 -> 메모장에 바로 적지 않고 확인 팝업 호출!
    if (window.__pendingPlanDestination) {
      window.openConfirmDestinationDateModal(dateKey, window.__pendingPlanDestination);
      return;
    }

    window.renderPlanStage();
    triggerHaptic(10);
  };

  // ❓ [목적지 날짜 지정 확인 팝업 모달]
  window.openConfirmDestinationDateModal = function(dateKey, dest) {
    var old = document.getElementById('confirmDestinationDateModal');
    if (old) old.remove();

    var modalEl = document.createElement('div');
    modalEl.id = 'confirmDestinationDateModal';
    modalEl.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999999; display:flex; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';
    modalEl.innerHTML = `
      <div style="width:100%; max-width:300px; background:#0b0f19; border:1.5px solid #38bdf8; border-radius:16px; padding:18px 16px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; box-shadow:0 20px 50px rgba(0,0,0,0.95); box-sizing:border-box;">
        <div style="font-size:2rem; line-height:1;">🗓️</div>
        <div style="font-size:0.92rem; font-weight:900; color:#ffffff; line-height:1.45;">
          <span style="color:#38bdf8;">[${dateKey}]</span>에<br>
          <span style="color:#fde047;">[${escapeHtml(dest.name)}]</span>(으)로 가시겠습니까?
        </div>
        <div style="font-size:0.68rem; color:#94a3b8; line-height:1.4;">
          확인을 누르면 해당 날짜의 일정 메모에 목적지가 저장됩니다.
        </div>
        <div style="display:flex; gap:8px; width:100%; margin-top:4px;">
          <button type="button" onclick="document.getElementById('confirmDestinationDateModal').remove();" style="flex:1; height:38px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.78rem; font-weight:800; border-radius:8px; cursor:pointer;">
            취소
          </button>
          <button type="button" onclick="window.commitPlanDestination('${dateKey}');" style="flex:1.4; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.82rem; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 3px 10px rgba(2,132,199,0.35);">
            확인 ✓
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  };

  // ✅ [확인을 눌러야만 비로소 메모장에 최종 저장]
  window.commitPlanDestination = function(dateKey) {
    var dest = window.__pendingPlanDestination;
    window.__pendingPlanDestination = null;

    var modal = document.getElementById('confirmDestinationDateModal');
    if (modal) modal.remove();

    if (!dest) return;

    var planMemos = safeGetJSON('okbm_plan_memos', {});
    var existingMemo = planMemos[dateKey] || '';
    var spotLine = '📍 목적지: ' + dest.name + (dest.elevation ? (' (' + dest.elevation + ')') : '');

    if (!existingMemo.includes(dest.name)) {
      planMemos[dateKey] = existingMemo ? (spotLine + '\n' + existingMemo) : spotLine;
      localStorage.setItem('okbm_plan_memos', JSON.stringify(planMemos));
    }

    window.activeSelectedDateKey = dateKey;
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
      showToast('✅ [' + dateKey + '] 목적지가 등록되었습니다!', 'success');
    }
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();
  };

  // 📍 [찜 목록에서 목적지 설정 누를 때: 절대 메모장에 적지 않고 달력으로 이동]
  window.selectPlanDestination = function(name, elevation) {
    window.__pendingPlanDestination = { name: name, elevation: String(elevation || '').replace(/m$/i, '') };
    window.currentLuckySpot = window.__pendingPlanDestination;

    // 메모장에 바로 적지 않고 달력 화면으로만 전환
    window.activePlanSubMode = 'calendar';
    window.renderPlanStage();
    triggerHaptic(15);

    if (typeof showToast === 'function') {
      showToast('🗓️ 가실 날짜를 달력에서 터치하세요.', 'info', 3000);
    }
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

 // 🚀 [낭만계획 모달 오픈 / 클로즈 - 진입 시 타 모달 차단 및 최상위 레이어 보장]
  window.openPlanModal = function(subMode) {
    window.activePlanSubMode = subMode || 'calendar';

    // 1. 낭만보관함 및 기타 레이어 강제 은닉 (화면 가림 원천 차단)
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
      modal.style.cssText = 'display:none; position:fixed; inset:0; background:#000000; z-index:1000005 !important; justify-content:center; align-items:stretch; width:100vw !important; max-width:100vw !important; overflow-x:hidden !important; touch-action:pan-y !important; transform:translateZ(0); -webkit-transform:translateZ(0);';
      modal.innerHTML = '<div class="romantic-plan-content" style="width:100% !important; max-width:480px !important; margin:0 auto; height:100dvh; max-height:100dvh; display:flex; flex-direction:column; justify-content:space-between; overflow-x:hidden !important; overflow-y:hidden !important; box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
    }

    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '1000005', 'important');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

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
    }
    triggerHaptic(10);
  };

  // 초기 실행
  if (typeof window.loadGearDbFromGoogleSheet === 'function') {
    window.loadGearDbFromGoogleSheet();
  }
})();


