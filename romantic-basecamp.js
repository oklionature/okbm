
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



  // 💾 [구글 시트 텍스트 ↔ 스마트폰 사진 1:1 완벽 싱크 스토리지 엔진]
  window.safeGetStorage = function(key, defaultVal) {
    try {
      var item = localStorage.getItem(key);
      if (item !== null) return JSON.parse(item);
    } catch (e) {}
    if (window.__memoryStore[key] !== undefined) return window.__memoryStore[key];
    return defaultVal;
  };

  window.safeSetStorage = function(key, value) {
    try {
      var str = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, str);
    } catch (e) {
      console.warn('[Storage Quota] 스마트폰 저장소 최적화 저장 진행');
    }
    window.__memoryStore[key] = (typeof value === 'string' ? JSON.parse(value) : value);
  };

  window.fieldDiaries = window.safeGetStorage('okbm_field_diaries', {});

  window.composePoeticBackpackingStory = function(record) {
    if (!record) return '자연 속에서 비화식으로 즐긴 조용한 하룻밤.';

    var extractList = function(rawText, fallback) {
      if (Array.isArray(rawText) && rawText.length > 0) return rawText;
      if (typeof rawText === 'string' && rawText.trim()) {
        return rawText.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      }
      return [fallback];
    };

    var weathers = extractList(record.weatherText || record.weather, '은하수·별밤');
    var terrains = extractList(record.terrainText || record.terrain, '능선·정상');
    var meals = extractList(record.mealText || record.meal, '핫앤쿡 발열식');
    var comps = extractList(record.companionText || record.companion, '나홀로 솔캠');
    var winds = extractList(record.windText || record.wind, '매서운 돌풍');

    var wJoined = weathers.join('·');
    var tJoined = terrains.join('과 ');
    var mJoined = meals.join(', ');
    var cJoined = comps.join(' & ');
    var windJoined = winds.join('과 ');

    var story = `${windJoined}이 스쳐 지나가던 ${tJoined}에서 ${cJoined}으로 보낸 하룻밤. ` +
                `맛있는 ${mJoined}을(를) 곁들이며 ${wJoined}의 감성을 가득 만끽했습니다. ` +
                `자연을 배려하는 LNT 클린 백패킹으로 완성한 잊지 못할 힐링!`;

    if (record.memo && record.memo.trim().length > 0 && !record.__autoGenerated) {
      return record.memo.trim();
    }
    return story;
  };

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

  // 🌌 [카드 주변으로만 은은하게 퍼지는 소프트 앰비언트 FX]
  if (!document.getElementById('basecamp-soft-ambient-fx-style')) {
    var fxStyle = document.createElement('style');
    fxStyle.id = 'basecamp-soft-ambient-fx-style';
    fxStyle.innerHTML = `
      @keyframes organic_soft_circle_glow {
        0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0; filter: blur(12px); }
        45% { opacity: 0.85; filter: blur(20px); }
        100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0; filter: blur(28px); }
      }
      .soft-ambient-layer {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 300px;
        height: 380px;
        border-radius: 24px;
        pointer-events: none;
        z-index: 0;
        transform: translate(-50%, -50%);
        opacity: 0;
      }
    `;
    document.head.appendChild(fxStyle);
  }

  window.triggerSoftAmbientFX = function(cardEl) {
    if (!cardEl) return;
    var layer = cardEl.querySelector('.soft-ambient-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'soft-ambient-layer';
      cardEl.appendChild(layer);
    }
    var gradients = [
      'radial-gradient(ellipse at center, rgba(52,211,153,0.7) 0%, rgba(2,132,199,0.4) 40%, transparent 68%)',
      'radial-gradient(ellipse at center, rgba(251,191,36,0.7) 0%, rgba(234,88,12,0.4) 40%, transparent 68%)',
      'radial-gradient(ellipse at center, rgba(167,243,208,0.7) 0%, rgba(5,150,105,0.4) 40%, transparent 68%)',
      'radial-gradient(ellipse at center, rgba(196,181,253,0.7) 0%, rgba(99,102,241,0.4) 40%, transparent 68%)',
      'radial-gradient(ellipse at center, rgba(253,164,175,0.7) 0%, rgba(190,18,60,0.4) 40%, transparent 68%)'
    ];
    layer.style.background = gradients[Math.floor(Math.random() * gradients.length)];
    layer.style.animation = 'none';
    layer.offsetHeight;
    layer.style.animation = 'organic_soft_circle_glow 0.75s cubic-bezier(0.15, 0.85, 0.25, 1) forwards';
  };

  // 🔄 [구글 시트 텍스트 + 스마트폰 사진 1:1 완벽 정규화 결합]
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
      mealText: (r && r.mealText) ? r.mealText : '핫앤쿡 발열식',
      companion: (r && r.companion) ? r.companion : 'solo',
      companionText: (r && r.companionText) ? r.companionText : '나홀로 솔캠',
      wind: (r && r.wind) ? r.wind : 'windGale',
      windText: (r && r.windText) ? r.windText : '매서운 돌풍',
      memo: (r && r.memo !== undefined) ? r.memo : '',
      items: cleanItems,
      photos: rawPhotos,
      photo: rawPhotos[0],
      fieldPhoto: rawPhotos[0]
    };

    if (!norm.memo) norm.memo = window.composePoeticBackpackingStory(norm);
    return norm;
  };

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

    var newRecord = {
      id: recordId,
      templateId: window.selectedTemplateId || savedTmplId || 1,
      date: cleanDateStr,
      year: tYear,
      month: tMonth,
      day: tDay,
      spot: (window.currentLuckySpot && window.currentLuckySpot.name) ? window.currentLuckySpot.name : '대관령 선자령 (832m)',
      elevation: (window.currentLuckySpot && window.currentLuckySpot.elevation) ? `${window.currentLuckySpot.elevation}m` : '832m',
      weightKg: totalKg,
      weightGrams: totalGrams,
      itemCount: packedItems.length,
      weather: 'stars', weatherText: '은하수·별밤',
      terrain: 'peak', terrainText: '능선·정상',
      meal: 'hotmeal', mealText: '핫앤쿡 발열식',
      companion: 'solo', companionText: '나홀로 솔캠',
      wind: 'windGale', windText: '매서운 돌풍',
      memo: '비화식으로 즐기는 조용한 하룻밤',
      items: packedItems,
      photos: [window.currentSharePhoto || defPhoto],
      photo: window.currentSharePhoto || defPhoto,
      fieldPhoto: window.currentSharePhoto || defPhoto
    };

    window.currentShareRecord = newRecord;
    window.currentShareItems = packedItems;

    // 1. 스마트폰 전용 사진 맵 저장
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    savedPhotosMap[recordId] = newRecord.photos;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

    // 2. 통합 히스토리 저장 (구글 시트 전송용)
    if (!window.interactiveHistory) window.interactiveHistory = [];
    window.interactiveHistory.unshift(newRecord);
    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    if (typeof closePackingModal === 'function') closePackingModal();
    if (typeof openPackShareModal === 'function') openPackShareModal(newRecord, packedItems, false);
    
    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🎒 [' + cleanDateStr + '] 배낭 패킹이 저장되었습니다!', 'success');
  };

  window.saveCardToVaultAndOpenBasecamp = function() {
    var spotInput = document.getElementById('shareCardSpotInput');
    var memoInput = document.getElementById('shareCardMemoInput');
    var liveSpot = (spotInput && spotInput.value.trim()) ? spotInput.value.trim() : (window.currentShareRecord ? window.currentShareRecord.spot : '대관령 선자령 (832m)');
    var liveMemo = (memoInput && memoInput.value.trim()) ? memoInput.value.trim() : '비화식으로 즐기는 조용한 하룻밤';

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
        itemCount: liveItems.length, memo: liveMemo, weather: 'stars', weatherText: '은하수·별밤', terrain: 'peak', terrainText: '능선·정상', meal: 'hotmeal', mealText: '핫앤쿡 발열식', companion: 'solo', companionText: '나홀로 솔캠', wind: 'windGale', windText: '매서운 돌풍',
        items: liveItems, photos: [window.currentSharePhoto || defPhoto], photo: window.currentSharePhoto || defPhoto, fieldPhoto: window.currentSharePhoto || defPhoto
      };
    } else {
      window.currentShareRecord.date = cleanDateStr;
      window.currentShareRecord.year = tYear;
      window.currentShareRecord.month = tMonth;
      window.currentShareRecord.day = tDay;
      window.currentShareRecord.spot = liveSpot;
      window.currentShareRecord.memo = liveMemo;
      window.currentShareRecord.templateId = window.selectedTemplateId || window.currentShareRecord.templateId || savedTmplId || 1;
      if (!Array.isArray(window.currentShareRecord.photos) || window.currentShareRecord.photos.length === 0) {
        window.currentShareRecord.photos = [window.currentSharePhoto || window.currentShareRecord.fieldPhoto || defPhoto];
      }
    }

    // 1. 스마트폰 전용 사진 맵 저장
    var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
    savedPhotosMap[recordId] = window.currentShareRecord.photos;
    window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);

    // 2. 통합 히스토리 저장
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
        link.download = `${filenamePrefix || '낭만루트_피드'}_${getFormattedTimestamp()}.png`;
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

  window.renderMultiBadgeHtml = function(textList, iconKey, borderColor, bgColor, textColor) {
    if (!textList) return '';
    var arr = Array.isArray(textList) ? textList : String(textList).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    return arr.map(function(txt) {
      var icon = (window.VEC_ICONS && window.VEC_ICONS[iconKey]) ? window.VEC_ICONS[iconKey] : '';
      return '<span style="font-size:0.60rem; background:' + (bgColor || 'rgba(255,255,255,0.08)') + '; backdrop-filter:blur(6px); border:1px solid ' + (borderColor || 'rgba(255,255,255,0.2)') + '; color:' + (textColor || '#fff') + '; padding:2.5px 6px; border-radius:5px; font-weight:800; display:inline-flex; align-items:center; gap:2px;">' +
        icon + ' ' + escapeHtml(txt) +
      '</span>';
    }).join(' ');
  };

  window.isPostcardFlipped = window.isPostcardFlipped || false;

  // 🔤 [100% 무결점 한글 종성(받침) 및 'ㄹ' 불규칙 연산기]
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

  // 🗂️ [1. 3D 엽서 카드 렌더링 - 카드 안에는 1줄 짧은 메모만 전달하여 장비 목록 100% 가독성 확보]
  window.render3DPostcardElement = function(cur, index) {
    if (!cur) return '';
    var items = Array.isArray(cur.items) ? cur.items : [];
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = cur.templateId || window.selectedTemplateId || savedTmplId || 1;
    var borderGrad = window.getCardStableBorderGradient(cur, index);

    // 카드 내부에는 긴 일기가 아닌 깔끔한 1줄 메모만 전달
    var shortCardMemo = cur.oneLineMemo || (cur.spot ? ('비화식으로 즐긴 ' + cur.spot + ' 1박') : '비화식으로 즐기는 조용한 하룻밤');

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
              <span style="font-size:0.5rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 4px; border-radius:3px;">#0${index+1} 앞면</span>
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
              <div style="display:flex; align-items:center; gap:4px; font-size:0.95rem; font-weight:900; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
                ${window.VEC_ICONS.pin} <span>${escapeHtml(cur.spot)}</span>
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

  // 📱 지난 피드 목록
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
    modalEl.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:rgba(0,0,0,0.94); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:1000000; display:flex; flex-direction:column; justify-content:flex-start; box-sizing:border-box; overflow:hidden;';

    modalEl.innerHTML = `
      <div style="flex-shrink:0; height:52px; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.12); display:flex; justify-content:space-between; align-items:center; padding:0 14px; box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:0.95rem; font-weight:900; color:#fff;">📱 지난 백패킹 피드 목록</span>
          <span style="font-size:0.62rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 7px; border-radius:4px;">총 ${logs.length}개</span>
        </div>
        <button onclick="document.getElementById('pastTripsListModal').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.8rem; font-weight:900; padding:5px 12px; border-radius:14px; cursor:pointer;">✕ 닫기</button>
      </div>

      <div style="flex:1 1 0%; min-height:0; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 30px)) 12px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;">
        <div style="font-size:0.68rem; color:#94a3b8; line-height:1.45; margin-bottom:4px; padding:0 2px;">
          기록을 톡 누르면 <strong>[현장 사진들 + 패킹 무게 기록지]</strong>가 인스타그램 피드로 시원하게 펼쳐집니다.
        </div>
        ${logs.length === 0 ? `
          <div style="text-align:center; padding:40px 10px; color:#94a3b8; font-size:0.78rem;">
            기록된 백패킹이 없습니다.<br>배낭을 패킹하고 보관함에 저장해보세요!
          </div>
        ` : logs.map(function(r, idx) {
          var tId = r.templateId || 1;
          var tName = (typeof TEMPLATE_NAMES !== 'undefined' && TEMPLATE_NAMES[tId]) ? TEMPLATE_NAMES[tId] : ('테마 ' + tId);
          var thumbPhoto = (r.photos && r.photos[0]) || r.fieldPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';
          var safeId = escapeHtml(String(r.id));
          return `
            <div onclick="window.openSingleTripDualFeedModal('${safeId}')" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:11px 13px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:11px; min-width:0;">
                <div style="width:44px; height:44px; border-radius:8px; overflow:hidden; background:#1e293b; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">
                  <img src="${thumbPhoto}" style="width:100%; height:100%; object-fit:cover;" />
                </div>
                <div style="min-width:0;">
                  <div style="font-size:0.88rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
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
        <div style="width:100%; height:60px; flex-shrink:0; pointer-events:none;"></div>
      </div>
    `;
    document.body.appendChild(modalEl);
    triggerHaptic(12);
  };

  // 📱 [2. 인스타그램 세로 피드 - 카드 내부 1줄 메모 & 카드 밑 본문 완전 분리 및 하단 버튼 짤림 완벽 해결]
  window.openSingleTripDualFeedModal = function(recordId) {
    if (!window.interactiveHistory || window.interactiveHistory.length === 0) {
      var rawLogs = window.safeGetStorage('okbm_packing_history', []);
      if (Array.isArray(rawLogs) && rawLogs.length > 0) {
        window.interactiveHistory = rawLogs.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
      }
    }

    var log = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!log && window.interactiveHistory && window.interactiveHistory.length > 0) {
      log = window.interactiveHistory[0];
    }
    if (!log) {
      if (typeof showToast === 'function') showToast('선택한 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    var old = document.getElementById('singleTripFeedModal');
    if (old) old.remove();

    var profile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
    var nick = (profile && profile.nickname) ? profile.nickname : '낭만백패커';

    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = log.templateId || window.selectedTemplateId || savedTmplId || 1;
    var items = Array.isArray(log.items) ? log.items : [];
    var borderGrad = (typeof window.getCardStableBorderGradient === 'function') 
      ? window.getCardStableBorderGradient(log, 0) 
      : 'linear-gradient(135deg, #10b981, #047857)';

    var photosList = (Array.isArray(log.photos) && log.photos.length > 0)
      ? log.photos 
      : [log.fieldPhoto || log.photo || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];

    // 🗂️ 카드 안에는 1줄 메모만 전달하여 장비 목록이 가려지지 않게 처리
    var shortCardMemo = log.oneLineMemo || (log.spot ? ('비화식으로 즐긴 ' + log.spot + ' 1박') : '비화식으로 즐기는 조용한 하룻밤');

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

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    feedModal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:100dvh; max-height:100dvh; background:#000000; z-index:1000002; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;';

    feedModal.innerHTML = `
      <div style="flex-shrink:0; height:52px; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.12); display:flex; justify-content:space-between; align-items:center; padding:0 14px; box-sizing:border-box; z-index:10;">
        <button onclick="document.getElementById('singleTripFeedModal').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.75rem; font-weight:800; padding:5px 11px; border-radius:12px; cursor:pointer;">◀ 지난 목록</button>
        <div style="font-size:0.88rem; font-weight:900; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:55%; display:flex; align-items:center; gap:3px;">
          ${window.VEC_ICONS.pin} <span>${escapeHtml(log.spot)}</span>
        </div>
        <button onclick="document.getElementById('singleTripFeedModal').remove(); if(document.getElementById('pastTripsListModal')) document.getElementById('pastTripsListModal').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; font-size:0.8rem; font-weight:900; padding:5px 11px; border-radius:14px; cursor:pointer;">✕ 닫기</button>
      </div>

      <!-- 스크롤 컨테이너 (하단 패딩 120px 확보하여 수정 버튼 짤림 완벽 해결) -->
      <div style="flex:1 1 0%; min-height:0; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(120px + env(safe-area-inset-bottom, 30px)) 12px; display:flex; flex-direction:column; gap:16px; box-sizing:border-box;">
        
        <div id="dualFeedCaptureTarget" style="background:#0b0f19; border:1px solid rgba(255,255,255,0.12); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 12px 35px rgba(0,0,0,0.85); flex-shrink:0;">
          
          <div style="padding:12px 14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="display:flex; align-items:center; gap:9px;">
              <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, #0284c7, #10b981); display:flex; align-items:center; justify-content:center; font-size:1.0rem; border:1px solid rgba(255,255,255,0.2);">🏕️</div>
              <div>
                <div style="font-size:0.86rem; font-weight:900; color:#ffffff;">${escapeHtml(nick)}</div>
                <div style="font-size:0.60rem; color:#94a3b8; font-family:'JetBrains Mono', monospace;">${log.date} · BPL ${log.weightKg}kg</div>
              </div>
            </div>
            <span style="font-size:0.62rem; color:#34d399; font-weight:800; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3); padding:2px 8px; border-radius:6px;">LNT 클린 실천</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; padding:8px 0; background:#000;">
            ${photosList.map(function(pUrl, pIdx) {
              return `
                <div style="width:100%; aspect-ratio:3/4; overflow:hidden; position:relative; background:#05070a; cursor:pointer;" onclick="if(typeof window.triggerSoftAmbientFX==='function') window.triggerSoftAmbientFX(this);">
                  <img src="${pUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />
                  <div style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.6); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.2); border-radius:6px; padding:3px 7px; font-size:0.56rem; color:#cbd5e1; font-weight:800;">
                    사진 ${pIdx+1} / ${photosList.length}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="padding:10px 12px; background:#080b11; border-top:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:0.75rem; font-weight:900; color:#38bdf8; margin-bottom:8px; display:flex; align-items:center; gap:4px;">
              🎒 <span>이날의 배낭 패킹 세팅지</span>
            </div>
            <div style="width:100%; aspect-ratio:3/4; border-radius:14px; padding:2px; background:${borderGrad}; box-shadow:0 8px 24px rgba(0,0,0,0.7); box-sizing:border-box;">
              <div style="width:100%; height:100%; border-radius:12px; overflow:hidden; background:#0b0f19;">
                ${packingSheetMarkup}
              </div>
            </div>
          </div>

          <!-- 📝 카드 바깥에 펼쳐지는 풍성한 다이어리 본문 전문 -->
          <div style="padding:14px; display:flex; flex-direction:column; gap:10px; background:#080b11; border-top:1px solid rgba(255,255,255,0.08);">
            
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
              ${window.renderMultiBadgeHtml(log.weatherText, log.weather, 'rgba(253,224,71,0.5)', 'rgba(253,224,71,0.1)', '#fef08a')}
              ${window.renderMultiBadgeHtml(log.terrainText, log.terrain, 'rgba(52,211,153,0.5)', 'rgba(52,211,153,0.1)', '#a7f3d0')}
              ${window.renderMultiBadgeHtml(log.mealText, log.meal, 'rgba(244,63,94,0.5)', 'rgba(244,63,94,0.1)', '#fecdd3')}
              ${window.renderMultiBadgeHtml(log.companionText, log.companion, 'rgba(56,189,248,0.5)', 'rgba(56,189,248,0.1)', '#bae6fd')}
            </div>

            <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px 14px;">
              <div style="font-size:0.78rem; color:#f1f5f9; line-height:1.65; font-family:'SUIT', sans-serif;">
                “${escapeHtml(log.memo)}”
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; padding:0 2px;">
              <span style="font-size:0.54rem; color:#34d399; font-weight:900; display:inline-flex; align-items:center;">
                ${window.VEC_ICONS.shield} K-LNT 흔적 없는 백패킹 실천
              </span>
              <span style="font-size:0.56rem; color:#38bdf8; font-weight:800;">#${log.spot.replace(/\s+/g,'')} #BPL</span>
            </div>

            <!-- 피드 수정 버튼 (여백 확보로 100% 완전 노출) -->
            <button onclick="window.openRichAfterTripModal(window.interactiveHistory.find(function(r){return String(r.id).trim()==='${log.id}';}))" style="width:100%; height:42px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.80rem; font-weight:900; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:4px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
              <span>✏️ 이 피드 기록 & 멀티 사진 수정</span>
            </button>

          </div>

        </div>

        <div style="width:100%; height:40px; flex-shrink:0; pointer-events:none;"></div>
      </div>

      <div style="flex-shrink:0; display:flex; gap:8px; padding:10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px; background:rgba(7,9,14,0.98); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box; z-index:10;">
        <button onclick="window.captureAndSaveSingleTripCard('dualFeedCaptureTarget', '${escapeHtml(log.spot)}')" style="flex:1; height:42px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.82rem; font-weight:900; border-radius:10px; cursor:pointer; box-shadow:0 4px 12px rgba(2,132,199,0.35);">
          💾 피드 갤러리에 저장
        </button>
        <button onclick="document.getElementById('singleTripFeedModal').remove()" style="width:90px; height:42px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-size:0.78rem; font-weight:800; border-radius:10px; cursor:pointer;">
          ✕ 닫기
        </button>
      </div>
    `;
    document.body.appendChild(feedModal);
    triggerHaptic(12);
  };

  // 🧠 [10개 항목 100% 무누락 & 대괄호 제거 & 관형사형 자연어 서사 엔진]
  window.composePoeticBackpackingStory = function(record, forcedTone, forcedMbti) {
    if (!record) return '자연 속에서 비화식으로 즐긴 조용한 하룻밤.';

    var extractList = function(rawText, fallback) {
      if (Array.isArray(rawText) && rawText.length > 0) return rawText;
      if (typeof rawText === 'string' && rawText.trim()) {
        return rawText.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      }
      return [fallback];
    };

    var spot = record.spot || '선자령';
    var weathers = extractList(record.weatherText || record.weather, '은하수');
    var terrains = extractList(record.terrainText || record.terrain, '능선');
    var meals = extractList(record.mealText || record.meal, '핫앤쿡');
    var comps = extractList(record.companionText || record.companion, '솔로');
    var winds = extractList(record.windText || record.wind, '돌풍');
    var tents = extractList(record.tentText || record.tent, '더블월');
    var temps = extractList(record.tempText || record.temp, '선선함');
    var views = extractList(record.viewText || record.view, '파노라마뷰');
    var approaches = extractList(record.approachText || record.approach, '꿀박지');
    var weight = record.weightKg || '5.4';

    // 🔤 관형사형 및 자연스러운 한글 결합 변환기
    var formatApproach = function(app) {
      if (app.includes('빡센')) return '가파른 업힐 코스를 올라';
      if (app.includes('꿀박지')) return '수월한 코스로';
      if (app.includes('트레킹')) return '가벼운 트레킹으로';
      if (app.includes('임도')) return '완만한 임도를 따라';
      if (app.includes('암릉')) return '스릴 넘치는 암릉 코스를 지나';
      return app + ' 코스로';
    };

    var formatTemp = function(temp) {
      if (temp.includes('혹한') || temp.includes('영하')) return '영하의 매서운 추위 속';
      if (temp.includes('선선')) return '선선한 가을 공기 속';
      if (temp.includes('쌀쌀')) return '쌀쌀한 밤공기 속';
      if (temp.includes('쾌적')) return '쾌적하고 시원한 날씨 속';
      if (temp.includes('포근')) return '포근한 날씨 속';
      return temp + ' 날씨 속';
    };

    var joinWithAnd = function(list) {
      if (!list || list.length === 0) return '';
      if (list.length === 1) return list[0];
      var first = list[0];
      var rest = list.slice(1).join(', ');
      return getJosa(first, '과/와') + ' ' + rest;
    };

    // 동의어 중복 제거 (솔캠과 솔로 동시 선택 시 단일화)
    var cleanComps = Array.from(new Set(comps.map(c => c.includes('솔') ? '솔로' : c)));

    var appTxt = formatApproach(approaches[0]);
    var terTxt = terrains[0];
    var tentTxt = tents.join(', ');
    var tempTxt = formatTemp(temps[0]);
    var windTxt = winds[0];
    var viewTxt = joinWithAnd(views);
    var weatherTxt = weathers.join('·');
    var compTxt = cleanComps.join(', ');
    var mealTxt = meals.join(', ');

    var style = forcedTone || (window.__richState && window.__richState.selectedTone) || 'insta';
    var mbti = forcedMbti || (window.__richState && window.__richState.selectedMbti) || 'INFP';

    // 🧬 MBTI 성격 시선 결합
    var mbtiPoint = '';
    if (mbti === 'INTJ') mbtiPoint = `배낭 ${weight}kg 오차 없이 세팅하고 계획된 타임라인대로 움직여서 완벽히 뇌 용량 정리함.`;
    else if (mbti === 'INTP') mbtiPoint = `침낭에 누워 온갖 생각의 나래를 펼치며 혼자 멍때리니 복잡했던 머리가 싹 비워짐.`;
    else if (mbti === 'ENTJ') mbtiPoint = `목표 시간 단축해서 완벽 주파하고 정상에서 마주한 뷰 덕분에 확실한 성취감 얻음.`;
    else if (mbti === 'ENTP') mbtiPoint = `남들 안 하는 신박한 세팅으로 1박 즐기니까 캠핑이 두 배로 스릴 있고 재밌었음ㅋㅋ`;
    else if (mbti === 'INFJ') mbtiPoint = `세상의 소란스러움을 벗어나 산의 품에서 마주한 풍경이 깊은 마음의 위로를 주었습니다.`;
    else if (mbti === 'INFP') mbtiPoint = `노을빛에 왠지 모르게 뭉클해져서 좋아하는 노래 들으며 작은 우주에 혼자 떠 있는 기분이었음✨`;
    else if (mbti === 'ENFJ') mbtiPoint = `모두 다치지 않고 즐겁게 완주해서 너무 감사했고 따뜻한 밥 한 그릇의 온기가 참 훈훈했음^^`;
    else if (mbti === 'ENFP') mbtiPoint = `진짜 텐트 치는 것도 재밌고 뷰도 레전드라 텐션 폭발함ㅠㅠ 백패킹 평생 할 거야 완전 힐링!💕`;
    else if (mbti === 'ISTJ') mbtiPoint = `가이라인 45도 각도 칼각 팩다운 및 주변 정리 수칙 3회 점검 완료. 군더더기 없는 정석 1박.`;
    else if (mbti === 'ISFJ') mbtiPoint = `주변에 방해 안 되게 조용히 텐트 안에서 온기를 느끼며 편안하게 힐링하고 왔습니다.`;
    else if (mbti === 'ESTJ') mbtiPoint = `코스 주파부터 피칭, 비화식 식사까지 타임테이블대로 일사천리 진행 완료. 깔끔한 일정.`;
    else if (mbti === 'ESFJ') mbtiPoint = `다 같이 모여 맛있는 거 나눠 먹고 예쁜 풍경 보며 추억 쌓아서 너무 행복하고 뿌듯했음ㅎㅎ`;
    else if (mbti === 'ISTP') mbtiPoint = `바람 셌지만 텐트 치고 밥 먹고 푹 잠. 뷰 좋았고 생존 세팅 완벽했음. 하산 끝.`;
    else if (mbti === 'ISFP') mbtiPoint = `피칭 끝나자마자 침낭 속으로 쏙 들어가서 텐트 지퍼 열고 뷰 감상.. 이게 진짜 극락이지~`;
    else if (mbti === 'ESTP') mbtiPoint = `바람 살벌했지만 팩 짱짱하게 박고 정면 승부 갈김ㅋㅋ 역시 이 스릴에 백패킹 옴!`;
    else if (mbti === 'ESFP') mbtiPoint = `노을 텐풍 인생샷 대성공 📸 텐트 색감이랑 하늘 조합 미쳤음! 밤하늘 아래서 신나게 즐김!`;

    // 🎭 문체 스타일에 10개 항목 100% 매끄럽게 결합 (대괄호 전면 제거)
    var story = '';

    if (style === 'insta') {
      story = `${appTxt} ${spot} ${terTxt} 도착! ${tentTxt} 텐트 칼각 피칭 끝냄. ${tempTxt} ${getJosa(windTxt, '이/가')} 불었지만 눈앞에 펼쳐진 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 조합 진심 폼 미쳤음.. ${compTxt}로 와서 ${mealTxt} 순삭하고 텐트 안에서 멍때리는데 힐링 그 자체. ${mbtiPoint} 배낭 ${weight}kg 가벼운 세팅으로 머문 자리 싹 정리하고 흔적 없이 클린 철수 완료!`;
    } else if (style === 'friend') {
      story = `야 이번에 ${appTxt} ${spot} ${terTxt} 다녀왔는데 진짜 역대급이었음ㅋㅋ ${tentTxt} 텐트 치는데 ${tempTxt} ${getJosa(windTxt, '이/가')} 불어서 날아갈 뻔하다가 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 보고 감탄함ㅠㅠ ${compTxt}로 따뜻한 ${mealTxt} 먹는데 극락이더라.. ${mbtiPoint} 배낭 ${weight}kg 싹 챙겨서 클린 하산 완료. 담에 너도 무조건 같이 가자!`;
    } else if (style === 'diary') {
      story = `주말을 맞아 ${appTxt} ${spot} ${terTxt}에 다녀왔습니다. ${tentTxt} 텐트를 단단히 치고 마주한 ${tempTxt} ${getJosa(windTxt, '과/와')} 풍경. 눈앞에 펼쳐진 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 풍경이 참 시원하고 좋더군요. ${compTxt}로 따뜻하게 ${mealTxt} 챙겨 먹으며 조용히 쉬었습니다. ${mbtiPoint} 배낭 ${weight}kg 가볍게 꾸려 머문 자리는 깨끗하게 정리하고 하산 완료했습니다.`;
    } else if (style === 'essay') {
      story = `${appTxt} 마침내 ${spot} ${terTxt}에 닿아 가만히 ${tentTxt} 텐트를 세웠습니다. ${tempTxt} ${getJosa(windTxt, '이/가')} 스쳐 지나갔지만, 눈앞에 펼쳐진 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 풍경은 땀 흘려 올라온 피로를 씻어내리기에 충분했습니다. ${compTxt}로 따뜻한 ${mealTxt} 한 끼로 온기를 채우고 마주한 밤의 침묵. ${mbtiPoint} ${weight}kg 배낭을 챙겨 머문 자리는 처음처럼 깨끗하게 정리하고 흔적 없이 길을 나섭니다.`;
    } else if (style === 'senior') {
      story = `호젓한 ${spot} ${terTxt}에 올라서니 가슴이 뻥 뚫립니다^^ ${appTxt} 든든하게 ${tentTxt} 치고 마주한 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 절경에 피로가 싹 가시네요. ${tempTxt} ${getJosa(windTxt, '속에서도')} ${compTxt}로 나눈 따뜻한 ${mealTxt} 한 끼에 감사하며 머물다 갑니다. ${mbtiPoint} 배낭 ${weight}kg 가볍게 챙겨 흔적 없이 클린 하산 완료! 안산즐산!`;
    } else if (style === 'vogue') {
      story = `이번 주말 ${spot} 트리핑 바이브 진짜 어메이징..✨ ${appTxt} ${tentTxt} 칼각 피칭 끝내고 ${tempTxt} 즐긴 ${viewTxt}! ${getJosa(windTxt, '이/가')} 불어도 ${weatherTxt} 조합 완전 퍼펙트해서 힐링 만땅이었음. ${compTxt}로 ${mealTxt} 칠링 타임 제대로 갖고 꿀잠. ${mbtiPoint} ${weight}kg 세팅으로 LNT 실천하고 클린 체크아웃 완료!`;
    } else if (style === 'docu') {
      story = `해발 고지대, ${tempTxt} 거친 ${getJosa(windTxt, '이/가')} 몰아치는 ${spot} ${terTxt}. ${appTxt} 올라온 하이커가 ${tentTxt} 텐트를 피칭한다. 눈앞에 펼쳐진 웅장한 ${getJosa(viewTxt, '과/와')} ${weatherTxt}. 그는 ${compTxt}로 따끈한 ${mealTxt} 한 끼를 즐기며 야생의 밤을 맞이한다. ${mbtiPoint} ${weight}kg 배낭을 메고 머문 자리에 단 하나의 흔적도 남기지 않은 채 다시 하산한다.`;
    } else {
      story = `${spot} ${terTxt} 1박 완료. ${appTxt} 주파 후 ${tentTxt} 피칭. ${tempTxt} ${getJosa(windTxt, '이/가')} 불었지만 ${getJosa(viewTxt, '과/와')} ${weatherTxt} 감상 성공. ${compTxt}로 ${mealTxt} 식사 완료. ${mbtiPoint} 배낭 ${weight}kg 세팅으로 쓰레기 전량 회수 후 깔끔하게 하산.`;
    }

    return story;
  };

  // 📝 [다녀온 기록 작성 모달 - 이모지/복사 버튼 삭제 및 초간결 100% 직통 갱신]
  window.openRichAfterTripModal = function(record) {
    if (!record) return;
    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;

    var parseCurrentTags = function(rawText, defId) {
      if (Array.isArray(rawText)) return rawText;
      if (typeof rawText === 'string' && rawText.trim()) return rawText.split(',').map(s=>s.trim()).filter(Boolean);
      return [defId];
    };

    window.__richState = {
      selectedTone: 'insta',
      selectedMbti: 'INFP',
      weathers: new Set(parseCurrentTags(record.weatherText || record.weather, '은하수')),
      terrains: new Set(parseCurrentTags(record.terrainText || record.terrain, '능선')),
      meals: new Set(parseCurrentTags(record.mealText || record.meal, '핫앤쿡')),
      comps: new Set(parseCurrentTags(record.companionText || record.companion, '솔로')),
      winds: new Set(parseCurrentTags(record.windText || record.wind, '돌풍')),
      tents: new Set(parseCurrentTags(record.tentText || record.tent, '더블월')),
      temps: new Set(parseCurrentTags(record.tempText || record.temp, '선선함')),
      views: new Set(parseCurrentTags(record.viewText || record.view, '파노라마뷰')),
      approaches: new Set(parseCurrentTags(record.approachText || record.approach, '꿀박지'))
    };

    window.__tempUploadedPhotos = (Array.isArray(record.photos) && record.photos.length > 0)
      ? record.photos.slice()
      : [record.fieldPhoto || record.photo || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80'];

    var mainStyles = [
      { id: 'insta', name: '🔥 인스타 음슴체' },
      { id: 'friend', name: '💬 절친 카톡 썰' },
      { id: 'diary', name: '☕ 담백한 일기' },
      { id: 'essay', name: '🖋️ 문학 수필' },
      { id: 'senior', name: '🌿 4050 산악낭만' },
      { id: 'vogue', name: '🕶️ 보그 잉글리시' },
      { id: 'docu', name: '🎙️ 다큐 내레이션' }
    ];

    var mbtiList = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];

    var approachList = [{ name: '꿀박지' }, { name: '가벼운트레킹' }, { name: '완만한임도' }, { name: '빡센업힐' }, { name: '암릉코스' }, { name: '장거리종주' }];
    var terrainList = [{ name: '정상' }, { name: '능선' }, { name: '데크' }, { name: '숲속' }, { name: '해변' }, { name: '섬' }, { name: '계곡' }];
    var tentList = [{ name: '더블월' }, { name: '싱글월' }, { name: '쉘터' }, { name: '타프' }, { name: '비비색' }, { name: '알파인' }, { name: '자립형' }];
    var tempList = [{ name: '선선함' }, { name: '영하혹한' }, { name: '쌀쌀함' }, { name: '쾌적함' }, { name: '서늘함' }, { name: '포근함' }, { name: '무더위' }];
    var windList = [{ name: '돌풍' }, { name: '똥바람' }, { name: '시원한바람' }, { name: '미풍' }, { name: '솔솔부는바람' }, { name: '무풍' }, { name: '칼바람' }];
    var viewList = [{ name: '파노라마뷰' }, { name: '운해' }, { name: '노을' }, { name: '야경' }, { name: '별빛' }, { name: '수평선' }, { name: '마운틴뷰' }];
    var weatherList = [{ name: '은하수' }, { name: '맑음' }, { name: '노을' }, { name: '일출' }, { name: '운해' }, { name: '우중' }, { name: '설경' }];
    var compList = [{ name: '솔로' }, { name: '듀오' }, { name: '커플' }, { name: '크루' }, { name: '소모임' }, { name: '반려견' }, { name: '가족' }];
    var mealList = [{ name: '핫앤쿡' }, { name: '전투식량' }, { name: '발열도시락' }, { name: '샌드위치' }, { name: '드립커피' }, { name: '비화식밀키트' }, { name: '에너지바' }];

    var renderCategorySection = function(catKey, catTitle, catColor, itemList, placeholderText) {
      return `
        <div>
          <label style="font-size:0.68rem; color:${catColor}; font-weight:800; display:block; margin-bottom:4px;">${catTitle}</label>
          <div id="chipGroup_${catKey}" style="display:flex; gap:4px; flex-wrap:wrap;">
            ${itemList.map(function(item) {
              var isAct = window.__richState[catKey].has(item.name);
              return `
                <button type="button" class="rich-multi-chip" onclick="window.__toggleRichMulti('${catKey}', '${item.name}', this, '${catColor}')" style="background:${isAct ? catColor : 'rgba(255,255,255,0.06)'}; color:${isAct ? '#000' : '#cbd5e1'}; border:${isAct ? 'none' : '1px solid rgba(255,255,255,0.12)'}; padding:4px 7px; border-radius:6px; font-size:0.64rem; font-weight:${isAct ? '900' : '800'}; cursor:pointer;">
                  ${item.name}
                </button>
              `;
            }).join('')}
            <button type="button" onclick="window.__toggleDirectInput('directInput_${catKey}')" style="background:rgba(255,255,255,0.04); border:1px dashed ${catColor}; color:${catColor}; padding:4px 7px; border-radius:6px; font-size:0.64rem; font-weight:800; cursor:pointer;">+ 직접 입력</button>
          </div>
          <div id="directInput_${catKey}Wrap" style="display:none; margin-top:4px; gap:4px;">
            <input type="text" id="directInput_${catKey}" placeholder="${placeholderText}" style="flex:1; height:30px; background:rgba(255,255,255,0.06); border:1px solid ${catColor}; color:#fff; border-radius:6px; padding:0 8px; font-size:0.72rem; box-sizing:border-box;" />
            <button type="button" onclick="window.__addCustomRichChip('${catKey}', 'directInput_${catKey}', '${catColor}')" style="background:${catColor}; color:#000; border:none; border-radius:6px; padding:0 8px; font-size:0.68rem; font-weight:900; cursor:pointer;">추가</button>
          </div>
        </div>
      `;
    };

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); z-index:1000005; display:flex; justify-content:center; align-items:center; padding:14px; box-sizing:border-box;';

    formModal.innerHTML = `
      <div style="width:100%; max-width:440px; max-height:92vh; background:#080b11; border:1.5px solid #38bdf8; border-radius:18px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 24px 60px rgba(0,0,0,0.95); box-sizing:border-box; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-y:contain;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:6px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.98rem; font-weight:900; color:#fff;">📸 다녀온 현장 기록 & 글 작성</span>
            <span style="font-size:0.60rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 6px; border-radius:4px;">10개 항목 100% 반영</span>
          </div>
          <button onclick="document.getElementById('modalRichAfterTrip').remove()" style="background:none; border:none; color:#94a3b8; font-size:1.2rem; cursor:pointer;">✕</button>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="font-size:0.68rem; color:#38bdf8; font-weight:800;">1. 🌄 현장 사진 (여러 장 선택 가능)</label>
            <span id="photoCountNotice" style="font-size:0.58rem; color:#86efac; font-weight:800;">현재 ${window.__tempUploadedPhotos.length}장 등록됨</span>
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event)" />
          <button type="button" id="btnUploadMultiPhotoNotice" onclick="document.getElementById('richMultiPhotoInput').click()" style="width:100%; height:36px; background:rgba(56,189,248,0.1); border:1px dashed #38bdf8; color:#7dd3fc; border-radius:8px; font-size:0.72rem; font-weight:800; cursor:pointer;">
            📷 갤러리에서 사진 여러 장 선택 (자동 최적화)
          </button>
        </div>

        <!-- 9대 카테고리 -->
        ${renderCategorySection('approaches', '2. 🥾 어프로치 코스', '#fb923c', approachList, '직접 어프로치 입력')}
        ${renderCategorySection('terrains', '3. 🌲 지형 형태', '#34d399', terrainList, '직접 지형 입력')}
        ${renderCategorySection('tents', '4. ⛺ 텐트 & 쉘터', '#a78bfa', tentList, '직접 텐트 모델 입력')}
        ${renderCategorySection('temps', '5. 🌡️ 체감 온도', '#38bdf8', tempList, '직접 온도 입력')}
        ${renderCategorySection('winds', '6. 💨 현장 바람', '#94a3b8', windList, '직접 바람 입력')}
        ${renderCategorySection('views', '7. 🌄 풍경 뷰', '#fde047', viewList, '직접 뷰 입력')}
        ${renderCategorySection('weathers', '8. 🌤️ 하늘 & 기상', '#f59e0b', weatherList, '직접 기상 입력')}
        ${renderCategorySection('comps', '9. 👥 동행', '#38bdf8', compList, '직접 동행 입력')}
        ${renderCategorySection('meals', '10. ♨️ 식단 & 취사', '#f43f5e', mealList, '직접 식단 입력')}

        <!-- 🎭 문체 스타일 -->
        <div style="margin-top:4px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.15);">
          <label style="font-size:0.68rem; color:#f43f5e; font-weight:900; display:block; margin-bottom:5px;">🎭 문체 스타일 선택 (원클릭 합성)</label>
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

        <!-- 🧬 MBTI 16종 -->
        <div>
          <label style="font-size:0.68rem; color:#38bdf8; font-weight:900; display:block; margin-bottom:5px;">🧬 내 MBTI 선택 (성격 케미 실시간 합성)</label>
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

        <!-- 📝 본문창 (초간결: 다시 조합 버튼만 유지) -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <label style="font-size:0.72rem; color:#34d399; font-weight:900;">✨ 실시간 합성 피드 본문</label>
            <button type="button" onclick="window.__refreshAutoStoryMemo()" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; padding:3px 9px; border-radius:5px; font-size:0.64rem; font-weight:900; cursor:pointer;">↺ 다시 조합</button>
          </div>
          <textarea id="richFormMemoInput" style="width:100%; height:140px; background:rgba(255,255,255,0.06); border:1.2px solid rgba(52,211,153,0.5); color:#fff; border-radius:10px; padding:10px 12px; font-size:0.76rem; line-height:1.6; box-sizing:border-box; outline:none; resize:none; font-family:'SUIT', sans-serif;">${escapeHtml(record.memo || '')}</textarea>
        </div>

        <button onclick="window.__saveRichAfterTrip('${record.id}')" style="width:100%; height:44px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.86rem; font-weight:900; border-radius:10px; cursor:pointer; flex-shrink:0; box-shadow:0 4px 14px rgba(13,148,136,0.35); margin-top:4px;">
          ✓ 피드 기록 & 사진 저장하기
        </button>

      </div>
    `;
    document.body.appendChild(formModal);
    window.__refreshAutoStoryMemo();
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

    window.__refreshAutoStoryMemo();
    triggerHaptic(10);
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

    window.__refreshAutoStoryMemo();
    triggerHaptic(10);
  };

  window.__toggleRichMulti = function(categoryKey, valName, btnEl, activeColor) {
    var set = window.__richState[categoryKey];
    if (!set) return;

    if (set.has(valName)) {
      if (set.size > 1) set.delete(valName);
    } else {
      set.add(valName);
    }

    var isNowActive = set.has(valName);
    btnEl.style.background = isNowActive ? activeColor : 'rgba(255,255,255,0.06)';
    btnEl.style.color = isNowActive ? '#000' : '#cbd5e1';
    btnEl.style.border = isNowActive ? 'none' : '1px solid rgba(255,255,255,0.12)';
    btnEl.style.fontWeight = isNowActive ? '900' : '800';

    window.__refreshAutoStoryMemo();
    triggerHaptic(8);
  };

  window.__addCustomRichChip = function(categoryKey, inputId, activeColor) {
    var input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    var customVal = input.value.trim();
    window.__richState[categoryKey].add(customVal);

    var group = document.getElementById('chipGroup_' + categoryKey);
    if (group) {
      var newBtn = document.createElement('button');
      newBtn.type = 'button';
      newBtn.className = 'rich-multi-chip';
      newBtn.style.cssText = `background:${activeColor}; color:#000; border:none; padding:4px 7px; border-radius:6px; font-size:0.64rem; font-weight:900; cursor:pointer;`;
      newBtn.innerText = customVal;
      newBtn.onclick = function() { window.__toggleRichMulti(categoryKey, customVal, newBtn, activeColor); };
      group.insertBefore(newBtn, group.lastElementChild);
    }

    input.value = '';
    window.__toggleDirectInput(inputId);
    window.__refreshAutoStoryMemo();
    triggerHaptic(10);
  };

  window.__toggleDirectInput = function(inputId) {
    var wrap = document.getElementById(inputId + 'Wrap') || document.getElementById(inputId);
    if (wrap) {
      wrap.style.display = (wrap.style.display === 'none' || wrap.style.display === '' ? 'flex' : 'none');
      var realInput = document.getElementById(inputId);
      if (realInput && wrap.style.display === 'flex') realInput.focus();
    }
  };

  // 실시간 텍스트 영역 갱신 (10개 항목 100% 직통 반영)
  window.__refreshAutoStoryMemo = function() {
    if (!window.__richState) return;
    var memoArea = document.getElementById('richFormMemoInput');
    if (!memoArea) return;

    var cur = window.__richCurrentRecord || (window.interactiveHistory && window.interactiveHistory[window.currentCardIndex || 0]) || {};

    var tempRecord = {
      spot: cur.spot || '선자령',
      weatherText: Array.from(window.__richState.weathers).join(','),
      terrainText: Array.from(window.__richState.terrains).join(','),
      mealText: Array.from(window.__richState.meals).join(','),
      companionText: Array.from(window.__richState.comps).join(','),
      windText: Array.from(window.__richState.winds).join(','),
      tentText: Array.from(window.__richState.tents).join(','),
      tempText: Array.from(window.__richState.temps).join(','),
      viewText: Array.from(window.__richState.views).join(','),
      approachText: Array.from(window.__richState.approaches).join(','),
      weightKg: cur.weightKg || '5.4',
      memo: '',
      __autoGenerated: true
    };

    memoArea.value = window.composePoeticBackpackingStory(tempRecord, window.__richState.selectedTone, window.__richState.selectedMbti);
  };

  window.__handleRichMultiPhotoUpload = function(e) {
    var files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (typeof showToast === 'function') showToast('⚡ ' + files.length + '장의 사진을 최적화하는 중...', 'info');

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

    Promise.all(files.map(compressSingle)).then(function(compressedUrls) {
      window.__tempUploadedPhotos = compressedUrls;
      var noticeBtn = document.getElementById('btnUploadMultiPhotoNotice');
      var countNotice = document.getElementById('photoCountNotice');
      if (noticeBtn) {
        noticeBtn.innerText = '✓ 총 ' + compressedUrls.length + '장 사진 최적화 완료!';
        noticeBtn.style.background = 'rgba(52,211,153,0.15)';
        noticeBtn.style.borderColor = '#34d399';
        noticeBtn.style.color = '#6ee7b7';
      }
      if (countNotice) countNotice.innerText = '총 ' + compressedUrls.length + '장 등록 완료';
      if (typeof showToast === 'function') showToast('🌟 사진이 준비되었습니다!', 'success');
    });
  };

  // 💾 [저장 시 카드 내부 메모와 피드 본문 완전 분리 저장]
  window.__saveRichAfterTrip = function(recordId) {
    var target = (window.interactiveHistory || []).find(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (!target && window.interactiveHistory && window.interactiveHistory.length > 0) {
      target = window.interactiveHistory[window.currentCardIndex || 0];
    }
    if (!target) {
      if (typeof showToast === 'function') showToast('저장할 대상 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    if (window.__richState) {
      target.weatherText = Array.from(window.__richState.weathers).join(', ');
      target.terrainText = Array.from(window.__richState.terrains).join(', ');
      target.mealText = Array.from(window.__richState.meals).join(', ');
      target.companionText = Array.from(window.__richState.comps).join(', ');
      target.windText = Array.from(window.__richState.winds).join(', ');
      target.tentText = Array.from(window.__richState.tents).join(', ');
      target.tempText = Array.from(window.__richState.temps).join(', ');
      target.viewText = Array.from(window.__richState.views).join(', ');
      target.approachText = Array.from(window.__richState.approaches).join(', ');
    }

    var memoInput = document.getElementById('richFormMemoInput');
    var userTypedMemo = memoInput ? memoInput.value.trim() : '';

    // 피드 본문에는 풍성한 일기 전문 저장
    if (userTypedMemo.length > 0) {
      target.memo = userTypedMemo;
    } else {
      target.memo = window.composePoeticBackpackingStory(target);
    }

    // 카드 안에는 장비 목록을 가리지 않도록 깔끔한 1줄 메모만 저장
    target.oneLineMemo = '비화식으로 즐긴 ' + (target.spot || '박지') + ' 1박';

    if (Array.isArray(window.__tempUploadedPhotos) && window.__tempUploadedPhotos.length > 0) {
      target.photos = window.__tempUploadedPhotos.slice();
      target.fieldPhoto = target.photos[0];
      target.photo = target.photos[0];
      
      var savedPhotosMap = window.safeGetStorage('okbm_phone_photos_map', {});
      savedPhotosMap[target.id] = target.photos;
      window.safeSetStorage('okbm_phone_photos_map', savedPhotosMap);
      
      window.__tempUploadedPhotos = null;
    }

    window.safeSetStorage('okbm_packing_history', window.interactiveHistory);
    if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud();

    var m = document.getElementById('modalRichAfterTrip');
    if (m) m.remove();

    if (typeof window.renderFullBasecampStage === 'function') {
      window.renderFullBasecampStage();
    }

    if (document.getElementById('singleTripFeedModal')) {
      window.openSingleTripDualFeedModal(target.id);
    }

    triggerHaptic(15);
    if (typeof showToast === 'function') showToast('🌟 피드 기록과 사진이 안전하게 저장되었습니다!', 'success');
  };
// 🛡️ [보관함 화면 밑으로 밀림/당김 완벽 차단 메인 스테이지]
  window.renderFullBasecampStage = function(animType) {
    var content = document.querySelector('.my-basecamp-content');
    if (!content) return;

    // 🔒 스마트폰 화면 상하 덜컥거림/밀림 방지 뷰포트 고정
    content.style.cssText = 'width: 100% !important; max-width: 480px !important; height: 100dvh !important; max-height: 100dvh !important; margin: 0 auto !important; padding: 0 !important; background: #000000 !important; border: none !important; border-radius: 0 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; overflow: hidden !important; box-sizing: border-box !important; overscroll-behavior: none !important; -webkit-overscroll-behavior: none !important; touch-action: pan-y !important;';

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

    var recordedDays = new Set(monthHistory.map(function(h) { return h.day; }));

    var firstDayIndex = new Date(viewYear, viewMonth - 1, 1).getDay();
    var lastDayOfMonth = new Date(viewYear, viewMonth, 0).getDate();

    var calendarDaysHtml = '';
    for (var b = 0; b < firstDayIndex; b++) {
      calendarDaysHtml += '<div style="height:17px;"></div>';
    }

    for (var d = 1; d <= lastDayOfMonth; d++) {
      var isSelected = (d === activeDay);
      var isRecorded = recordedDays.has(d);

      var dayStyle = 'position:relative; height:17px; line-height:17px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:\'Space Grotesk\', sans-serif; font-size:0.64rem; font-weight:800; border-radius:3px; cursor:pointer; transition:all 0.15s ease;';
      if (isSelected) dayStyle += 'background:#00bcd4; color:#000000; font-weight:900; box-shadow:0 0 6px rgba(0,188,212,0.9); transform:scale(1.12);';
      else if (isRecorded) dayStyle += 'color:#34d399; font-weight:900; text-decoration:underline;';
      else dayStyle += 'color:#cbd5e1;';

      var dot = isRecorded ? '<span style="position:absolute; bottom:0.5px; width:3px; height:3px; background:' + (isSelected ? '#000' : '#34d399') + '; border-radius:50%;"></span>' : '';
      calendarDaysHtml += '<div style="' + dayStyle + '" onclick="window.handleCalendarDateClick(' + d + ', ' + viewMonth + ', ' + viewYear + ')">' + d + dot + '</div>';
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
              return `
                <div onclick="window.currentCardIndex = ${i}; window.activeSelectedDateKey = '${h.date}'; window.currentViewMode = 'card'; window.renderFullBasecampStage();" style="width:100%; min-height:42px; background:${isCurrent ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.035)'}; border:1px solid ${isCurrent ? '#38bdf8' : 'rgba(255,255,255,0.08)'}; border-radius:8px; padding:0 10px; display:flex; align-items:center; justify-content:space-between; gap:8px; cursor:pointer; box-sizing:border-box;">
                  <div>
                    <div style="font-size:0.76rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:3px;">
                      ${window.VEC_ICONS.pin} <span>${escapeHtml(h.spot)} (${escapeHtml(h.elevation)})</span>
                    </div>
                    <div style="font-size:0.56rem; color:#94a3b8; margin-top:1px;">${h.date} · 배낭 ${h.items ? h.items.length : 0}개 장비</div>
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

    content.innerHTML = `
      <div style="flex:1; width:100%; display:flex; flex-direction:column; justify-content:space-between; padding:calc(8px + env(safe-area-inset-top, 0px)) 12px 0 12px; box-sizing:border-box; overflow:hidden;">
        
        <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; background:rgba(255,255,255,0.08); padding:2.5px; border-radius:9px; gap:2.5px; border:1px solid rgba(226,232,240,0.2);">
            <button onclick="window.switchBasecampTab('history')" style="flex:1; background:${window.activeBasecampTab==='history' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='history' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:900; cursor:pointer;">📸 힐링 기록</button>
            <button onclick="window.switchBasecampTab('record')" style="flex:1; background:${window.activeBasecampTab==='record' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='record' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:800; cursor:pointer;">🚩 클리어 & 찜</button>
            <button onclick="window.switchBasecampTab('memo')" style="flex:1; background:${window.activeBasecampTab==='memo' ? '#38bdf8' : 'transparent'}; color:${window.activeBasecampTab==='memo' ? '#000' : '#94a3b8'}; border:none; border-radius:7px; padding:6px 0; font-size:0.75rem; font-weight:800; cursor:pointer;">📝 비밀 메모</button>
          </div>

          ${window.activeBasecampTab === 'history' ? `
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="background:linear-gradient(135deg, rgba(56,189,248,0.12), rgba(16,185,129,0.08)); border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:5px 8px; display:flex; justify-content:space-around; align-items:center; text-align:center;">
                <div><div style="font-size:0.54rem; color:#94a3b8; font-weight:700;">올해 야영</div><div style="font-size:0.92rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;">${totalCount}회</div></div>
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

      <div style="flex-shrink:0; display:flex; gap:6px; padding:8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px; background:rgba(0,0,0,0.96); border-top:1px solid rgba(255,255,255,0.12); box-sizing:border-box;">
        <button onclick="${hasRecord ? `window.openRichAfterTripModal(window.interactiveHistory[window.currentCardIndex])` : `showToast('기록을 먼저 선택해주세요.', 'warn')`}" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0d9488, #0f766e); border:1px solid #14b8a6; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(13,148,136,0.3);">
          <span>📸 다녀온 기록 작성</span>
        </button>
        <button onclick="window.openPastTripsListModal()" style="flex:1.2; height:38px; background:linear-gradient(135deg, #0284c7, #0369a1); border:1px solid #38bdf8; color:#fff; font-size:0.75rem; font-weight:900; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 4px 12px rgba(2,132,199,0.35);">
          <span>📱 피드 목록 ➔</span>
        </button>
        <button onclick="${hasRecord ? `window.deleteSingleLogRecord('${cur.id}')` : `showToast('삭제할 기록이 없습니다.', 'warn')`}" style="background:rgba(244,63,94,0.15); border:1px solid #f43f5e; color:#fda4af; border-radius:8px; padding:0 10px; font-size:0.75rem; font-weight:800; cursor:pointer;">
          ${window.VEC_ICONS.trash}
        </button>
        <button onclick="window.closeMyInfoModal()" style="height:38px; padding:0 10px; background:transparent; border:1px solid rgba(255,255,255,0.12); color:#94a3b8; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer;">
          ✕ 닫기
        </button>
      </div>
    `;

    var cardTarget = document.getElementById('swipePostcardTarget');
    if (cardTarget && hasRecord && window.activeBasecampTab === 'history' && window.currentViewMode === 'card') {
      var startX = 0, startY = 0, currentX = 0, isDragging = false;
      var longPressTimer = null;
      var isSwipeMoved = false;

      // 🔒 카드 터치 시 브라우저 상하 스크롤/당김 완벽 방어
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
          window.openPackChecklistModal(window.interactiveHistory[window.currentCardIndex]);
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

  window.changeBasecampMonth = function(delta) {
    if (!window.calViewYear) window.calViewYear = new Date().getFullYear();
    if (!window.calViewMonth) window.calViewMonth = new Date().getMonth() + 1;

    window.calViewMonth += delta;
    if (window.calViewMonth < 1) {
      window.calViewMonth = 12;
      window.calViewYear -= 1;
    } else if (window.calViewMonth > 12) {
      window.calViewMonth = 1;
      window.calViewYear += 1;
    }
    window.renderFullBasecampStage();
    triggerHaptic(8);
  };

  window.handleCalendarDateClick = function(day, month, year) {
    var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(day).padStart(2, '0');
    window.activeSelectedDateKey = dateKey;

    var foundIdx = window.interactiveHistory.findIndex(function(h) {
      var hDate = h.date ? h.date.replace(/[-/]/g, '.') : (h.year + '.' + String(h.month).padStart(2, '0') + '.' + String(h.day).padStart(2, '0'));
      var parts = hDate.match(/\d+/g);
      if (parts && parts.length >= 3) {
        hDate = parts[0] + '.' + String(parts[1]).padStart(2, '0') + '.' + String(parts[2]).padStart(2, '0');
      }
      return hDate === dateKey;
    });

    if (foundIdx !== -1) {
      window.currentCardIndex = foundIdx;
    }
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


