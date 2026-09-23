


/**
 * 🏕️ 낭만루트 낭만보관함(History) 전담 코어 엔진 (romantic-history.js)
 * - 스마트폰 대용량 IndexedDB(okbm_vault_db) 사진 영구 저장 & 텍스트 분리 하이브리드 캐시 엔진
 * - 3D 엽서 ↔ 피드 목록 ↔ 피드 상세 ↔ 낭만 일지 100% 실시간 사진 & 글 동기화
 * - 야영 캘린더 (연/월 이동, 보관함 완료일 ★ / 계획일 ⚑ 완벽 분리 표시)
 * - 일지 본문 / 사진 수정 지원 (위치·날짜는 패킹계획에서 확정 후 잠금)
 * - [5대 하단독 완성 체계]: 낭만기록 · 피드 · 스튜디오 · 클리어맵 · 마이리포트
 * - 피드 카드 상단 [···] 액션바 (1초 일지수정, 스튜디오 인출, 공유, 삭제) 탑재
 */

(function() {
  if (!document.getElementById('basecamp-flip-core-style')) {
    var style = document.createElement('style');
    style.id = 'basecamp-flip-core-style';
    style.innerHTML = `
      .postcard-3d-wrapper {
        perspective: 1200px !important;
        transform-style: preserve-3d !important;
        will-change: auto !important;
        transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1) !important;
        -webkit-tap-highlight-color: transparent !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        transform: translateZ(0) !important;
      }
      .postcard-3d-wrapper.flipped {
        will-change: transform !important;
        transform: rotateY(180deg) translateZ(0) !important;
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
        transform-style: preserve-3d !important;
        box-sizing: border-box !important;
        contain: layout paint;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .postcard-face-front {
        transform: rotateY(0deg) !important;
        z-index: 2 !important;
      }
      .postcard-face-back {
        transform: rotateY(180deg) !important;
        z-index: 1 !important;
      }

      /* 🎬 [릴스 피드 최적화 고속 렌더링 클래스군] */
      .reel-vertical-container {
        flex: 1 1 0% !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        scroll-snap-type: y mandatory !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        position: relative !important;
        z-index: 10 !important;
        overscroll-behavior: none !important;
        touch-action: pan-y !important;
        contain: content !important;
        background: #000000 !important;
      }
      .reel-vertical-container::-webkit-scrollbar { display: none !important; }
      .reel-vertical-container,
      .reel-vertical-container * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .reel-page-snap {
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        max-height: 100% !important;
        scroll-snap-align: start !important;
        scroll-snap-stop: always !important;
        position: relative !important;
        overflow: hidden !important;
        display: block !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        contain: content !important;
        content-visibility: visible !important;
        touch-action: pan-y !important;
        background: #000000 !important;
      }

      .reel-header-row {
        position: absolute !important;
        top: max(32px, env(safe-area-inset-top, 0px)) !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        height: auto !important;
        min-height: 52px !important;
        padding-top: 6px !important;
        padding-left: 14px !important;
        padding-right: 14px !important;
        padding-bottom: 12px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.12) 65%, transparent 100%) !important;
        z-index: 400 !important;
        isolation: isolate !important;
        transform: none !important;
        -webkit-transform: none !important;
        content-visibility: visible !important;
        border-bottom: none !important;
        box-sizing: border-box !important;
        pointer-events: none !important;
        flex-shrink: 0 !important;
      }

      .reel-media-stage {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        background: #000000 !important;
        overflow: hidden !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        z-index: 1 !important;
      }

      .reel-media-stage > div,
      .reel-horizontal-track,
      .reel-horizontal-track > div,
      .reel-photo-target {
        border-radius: 0 !important;
        overflow: hidden !important;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
      }

      .postcard-face-front {
        transform: rotateY(0deg) translateZ(1px) !important;
        -webkit-transform: rotateY(0deg) translateZ(1px) !important;
        z-index: 2 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }

      .postcard-face-back {
        transform: rotateY(180deg) translateZ(1px) !important;
        -webkit-transform: rotateY(180deg) translateZ(1px) !important;
        z-index: 1 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
      }

      .reel-horizontal-track {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        width: 100% !important;
        height: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        scroll-snap-type: x mandatory !important;
        -webkit-overflow-scrolling: touch !important;
        scrollbar-width: none !important;
        box-sizing: border-box !important;
        touch-action: pan-x pan-y !important;
        overscroll-behavior-x: contain !important;
        contain: content !important;
      }
      .reel-horizontal-track::-webkit-scrollbar { display: none !important; }

      .reel-horizontal-track > div {
        flex: 0 0 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        height: 100% !important;
        scroll-snap-align: start !important;
        scroll-snap-stop: always !important;
        position: relative !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        background: #000000 !important;
      }

      .reel-photo-target {
        width: auto !important;
        height: auto !important;
        max-width: 100% !important;
        max-height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        object-fit: contain !important;
        object-position: center center !important;
        display: block !important;
        pointer-events: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #000000 !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        flex: 0 1 auto !important;
      }
      .reel-photo-target.is-portrait,
      .reel-photo-target.is-portrait-crop {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: cover !important;
        aspect-ratio: auto !important;
        background: #000000 !important;
      }
      .reel-photo-target.is-keep-ratio,
      .reel-photo-target.is-square,
      .reel-photo-target.is-landscape {
        object-fit: contain !important;
        object-position: center center !important;
        width: auto !important;
        height: auto !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 100% !important;
        max-height: 100% !important;
        background: #000000 !important;
      }

      .reel-page-snap {
        width: 100% !important;
        height: 100% !important;
        min-height: 100% !important;
        max-height: 100% !important;
        scroll-snap-align: start !important;
        scroll-snap-stop: always !important;
        position: relative !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        contain: content !important;
        content-visibility: visible !important;
        touch-action: pan-y !important;
        background: #000000 !important;
      }

      .romantic-history-content {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
      }
      .reel-media-stage {
        position: relative !important;
        inset: auto !important;
        flex: 1 1 0% !important;
        height: auto !important;
        width: 100% !important;
        min-height: 0 !important;
        display: block !important;
        background: #000000 !important;
        overflow: hidden !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        z-index: 1 !important;
      }
      .history-tab-route .reel-media-stage {
        position: absolute !important;
        top: max(32px, env(safe-area-inset-top, 0px)) !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        flex: none !important;
        width: 100% !important;
        height: auto !important;
        max-width: none !important;
      }
      .reel-media-stage .postcard-face-front,
      .reel-media-stage .postcard-face-back {
        border-radius: 0 !important;
      }
      .postcard-template-container {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        padding: calc(56px + 10px) 16px var(--okbm-feed-bottom-space, 148px) 16px !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #000000 !important;
      }
      .postcard-template-container .tmpl-card-base,
      .postcard-template-container .ready-shot-card-vector,
      .postcard-template-container .photo-overlay-card,
      .postcard-face-back .tmpl-card-base,
      .postcard-face-back .ready-shot-card-vector,
      .postcard-face-back .photo-overlay-card,
      .postcard-face-front .tmpl-card-base {
        width: 100% !important;
        max-width: 330px !important;
        max-height: 100% !important;
        aspect-ratio: 3 / 4 !important;
        margin: auto !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.9) !important;
        flex-shrink: 1 !important;
      }
      .postcard-template-container .reel-photo-target,
      .postcard-face-back .reel-photo-target {
        max-width: 330px !important;
        max-height: 100% !important;
        aspect-ratio: 3 / 4 !important;
        object-fit: contain !important;
        border-radius: 14px !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.9) !important;
      }
      .postcard-face-front .reel-horizontal-track .reel-photo-target {
        max-width: 100% !important;
        max-height: 100% !important;
        width: auto !important;
        height: auto !important;
        aspect-ratio: auto !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        background: #000000 !important;
      }
      .postcard-face-front .reel-horizontal-track .reel-photo-target.is-portrait,
      .postcard-face-front .reel-horizontal-track .reel-photo-target.is-portrait-crop {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: cover !important;
        aspect-ratio: auto !important;
      }
      .postcard-face-front .reel-horizontal-track .reel-photo-target.is-keep-ratio,
      .postcard-face-front .reel-horizontal-track .reel-photo-target.is-square,
      .postcard-face-front .reel-horizontal-track .reel-photo-target.is-landscape {
        object-fit: contain !important;
      }
      .reel-status-bar-shield,
      .history-status-bar-scrim {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: max(32px, env(safe-area-inset-top, 32px)) !important;
        background: #000000 !important;
        z-index: 1000010 !important;
        pointer-events: none !important;
        display: block !important;
      }
      .history-tab-route .reel-page-snap > .reel-header-row {
        position: absolute !important;
        top: max(32px, env(safe-area-inset-top, 0px)) !important;
        left: 0 !important;
        right: 0 !important;
        height: auto !important;
        min-height: 52px !important;
        padding-top: 6px !important;
        padding-left: 14px !important;
        padding-right: 14px !important;
        padding-bottom: 12px !important;
        z-index: 400 !important;
        isolation: isolate !important;
        transform: none !important;
        -webkit-transform: none !important;
        content-visibility: visible !important;
        background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.12) 65%, transparent 100%) !important;
        border-bottom: none !important;
        pointer-events: none !important;
      }
      .history-tab-route .reel-page-snap > .reel-header-row button,
      .history-tab-route .reel-page-snap > .reel-header-row a {
        pointer-events: auto !important;
        position: relative !important;
        z-index: 401 !important;
        touch-action: manipulation !important;
      }

      .reel-bottom-interactive-bar {
        position: relative !important;
        width: 100% !important;
        padding: 10px 14px 12px 14px !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        background: #000000 !important;
        border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
        z-index: 10 !important;
        pointer-events: auto !important;
        flex-shrink: 0 !important;
        font-size: 0.80rem !important;
      }
      .history-tab-route .reel-bottom-interactive-bar {
        position: absolute !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        padding: 28px 14px 10px 14px !important;
        font-size: 0.80rem !important;
        min-height: calc(28px + 32px + 6px + 1.4em * 3 + 8px + 10px) !important;
        background: linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.35) 62%, rgba(0,0,0,0)) !important;
        border-top: none !important;
      }

      .reel-memo-fixed-slot {
        display: block !important;
        font-size: 0.80rem !important;
        height: calc(1.4em * 3 + 8px) !important;
        min-height: calc(1.4em * 3 + 8px) !important;
        max-height: calc(1.4em * 3 + 8px) !important;
        overflow: hidden !important;
        flex: 0 0 calc(1.4em * 3 + 8px) !important;
        box-sizing: border-box !important;
      }
      .reel-memo-fixed-box {
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 3 !important;
        line-clamp: 3 !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        line-height: 1.4 !important;
        font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-size: 0.80rem !important;
        font-weight: 500 !important;
        color: #e2e8f0 !important;
        word-break: break-all !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        letter-spacing: -0.01em !important;
        padding-bottom: 2px !important;
        box-sizing: border-box !important;
      }
      .okbm-feed-postcard {
        width: min(330px, 100%, calc((var(--okbm-vvh, 100dvh) - 168px) * 0.75)) !important;
        max-width: min(330px, 100%) !important;
        max-height: calc(var(--okbm-vvh, 100dvh) - 168px) !important;
        aspect-ratio: 3 / 4 !important;
        height: auto !important;
        overflow: hidden !important;
      }
      #singleTripFeedModal .reel-photo-target {
        width: 100% !important;
        height: auto !important;
        max-height: min(58dvh, calc(var(--okbm-vvh, 100dvh) - 160px)) !important;
        object-fit: contain !important;
      }

      #modalRichAfterTrip .rich-edit-scroll {
        overflow-x: hidden !important;
        touch-action: pan-y pan-x !important;
      }
      #modalRichAfterTrip .rich-photo-stage {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
      }
      #modalRichAfterTrip .rich-photo-frame {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }
      #modalRichAfterTrip #richPhotoSwipeTrack {
        min-width: 0 !important;
        max-width: 100% !important;
        overscroll-behavior-x: contain !important;
      }
      #modalRichAfterTrip #richPhotoSwipeTrack > div {
        flex: 0 0 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        width: 100% !important;
      }
      #modalRichAfterTrip .rich-photo-thumb-strip {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        display: flex !important;
        flex-wrap: nowrap !important;
        gap: 9px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        touch-action: pan-x !important;
        overscroll-behavior-x: contain !important;
        scrollbar-width: thin;
      }
      #modalRichAfterTrip .rich-photo-thumb {
        flex: 0 0 54px !important;
        touch-action: pan-x !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 🧰 [공통 유틸리티] romantic-sync.js window.* 버전 참조
  var safeGetJSON = function(key, defaultVal) {
    return (typeof window.safeGetJSON === 'function') ? window.safeGetJSON(key, defaultVal) : (function() {
      try { var item = localStorage.getItem(key); return item ? JSON.parse(item) : defaultVal; } catch (e) { return defaultVal; }
    })();
  };

  var escapeHtml = function(text) {
    return (typeof window.escapeHtml === 'function') ? window.escapeHtml(text) : String(text == null ? '' : text);
  };
  var okbmSafeImageUrl = function(url) {
    return (typeof window.okbmSafeImageUrl === 'function') ? window.okbmSafeImageUrl(url) : '';
  };
  var okbmSafeExternalUrl = function(url) {
    return (typeof window.okbmSafeExternalUrl === 'function') ? window.okbmSafeExternalUrl(url) : '#';
  };

  // 📱 [세로 사진 상단 안전바까지 꽉 채우기 & 가로/정사각형 비율 유지 엔진]
  window.applySmartPhotoFit = function(img) {
    if (!img) return;
    if (img.closest && (img.closest('.postcard-template-container') || img.closest('.postcard-face-back'))) return;
    var fit = function() {
      var w = img.naturalWidth || img.videoWidth || 0;
      var h = img.naturalHeight || img.videoHeight || 0;
      if (w <= 0 || h <= 0) return;
      var ratio = w / h;
      var inReel = !!(img.closest && (img.closest('.reel-horizontal-track') || img.closest('#mapHeroPhotoTrack')));
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

  if (!window.__okbmHistorySafeClickBound) {
    window.__okbmHistorySafeClickBound = true;
    document.addEventListener('click', function(e) {
      var saveRich = e.target.closest('#btnSubmitRichTrip');
      if (saveRich) {
        if (typeof window.__saveRichAfterTrip === 'function') {
          window.__saveRichAfterTrip(saveRich.dataset.recordId);
        }
        return;
      }
      var richSpot = e.target.closest('.js-select-rich-spot');
      if (richSpot) {
        if (typeof window.__selectSpotForRichTrip === 'function') {
          window.__selectSpotForRichTrip(richSpot.dataset.name || '', richSpot.dataset.elev || '');
        }
        return;
      }
      var feedRow = e.target.closest('.js-open-user-feed-row');
      if (feedRow) {
        var author = feedRow.dataset.author || '';
        var feedsMap = window.__scopedUserFilteredFeedsMap && window.__scopedUserFilteredFeedsMap[author];
        if (typeof window.openSingleTripDualFeedModal === 'function') {
          window.openSingleTripDualFeedModal(feedRow.dataset.feedId, feedsMap, author);
        }
        return;
      }
      var pastRow = e.target.closest('.js-past-trip-row');
      if (pastRow) {
        if (window.__isPastTripsSelectMode) {
          if (typeof window.togglePastTripItemSelection === 'function') {
            window.togglePastTripItemSelection(pastRow.dataset.recordId, e);
          }
        } else if (typeof window.openSingleTripDualFeedModal === 'function') {
          window.openSingleTripDualFeedModal(pastRow.dataset.recordId, window.__currentScopedPastTripLogs, pastRow.dataset.tab);
        }
        return;
      }
      var starBtn = e.target.closest('[data-star-card-id]');
      if (starBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        if (typeof window.toggleFeedStar === 'function') {
          window.toggleFeedStar(starBtn.getAttribute('data-star-card-id') || '', e);
        }
        return;
      }
      var shareFeedBtn = e.target.closest('[data-share-feed]');
      if (shareFeedBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.shareCurrentFeed === 'function') {
          window.shareCurrentFeed(
            shareFeedBtn.getAttribute('data-feed-id') || '',
            shareFeedBtn.getAttribute('data-spot') || '',
            shareFeedBtn.getAttribute('data-memo') || ''
          );
        } else {
          triggerHaptic(10);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(location.href);
            if (typeof showToast === 'function') showToast('피드 링크가 복사되었습니다.', 'success');
          }
        }
        return;
      }
      var saveFeedBtn = e.target.closest('[data-save-feed]');
      if (saveFeedBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.toggleSaveFeed === 'function') {
          window.toggleSaveFeed(saveFeedBtn.getAttribute('data-feed-id') || '', e);
        }
        return;
      }
    }, true);
    document.addEventListener('touchstart', function(e) {
      var starTouch = e.target.closest('[data-star-card-id][data-star-stop-touch]');
      if (starTouch) {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      }
    }, true);
  }

  var triggerHaptic = function(duration) {
    if (typeof window.triggerHaptic === 'function') return window.triggerHaptic(duration);
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      try {
        if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
          navigator.vibrate(duration || 12);
        }
      } catch (e) {}
    }
  };

  window.handleFeedImageError = function(img) {
    if (!img || img.__handledVideoStill) return;
    img.__handledVideoStill = true;

    var src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || src === location.href) return;

    var video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = src;

    var showFallback = function() {
      img.style.display = 'none';
      var parent = img.parentElement;
      if (parent && !parent.querySelector('.feed-img-fallback')) {
        var fallback = document.createElement('div');
        fallback.className = 'feed-img-fallback';
        fallback.style.cssText = 'width:100%; height:100%; min-height:200px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:#07090e; color:#64748b; padding:20px; box-sizing:border-box; text-align:center;';
        fallback.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:28px; height:28px; color:#38bdf8; opacity:0.6;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span style="font-size:0.72rem; color:#94a3b8; font-weight:700;">사진을 불러올 수 없습니다</span>';
        parent.appendChild(fallback);
      }
    };

    var onCanPlay = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 480;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var stillUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (stillUrl && stillUrl.length > 500) {
          img.src = stillUrl;
          img.style.display = 'block';
          if (typeof window.applySmartPhotoFit === 'function') window.applySmartPhotoFit(img);
          return;
        }
      } catch (e) { console.warn('[romantic-history.js:handleFeedImageError canvas]', e); }

      try {
        video.style.cssText = img.style.cssText;
        video.className = img.className;
        video.autoplay = false;
        video.currentTime = 0.1;
        if (img.parentElement) {
          img.parentElement.replaceChild(video, img);
        }
        if (typeof window.applySmartPhotoFit === 'function') window.applySmartPhotoFit(video);
      } catch (err) {
        console.warn('[romantic-history.js:handleFeedImageError replaceChild]', err);
        showFallback();
      }
    };

    video.addEventListener('loadeddata', function() {
      video.currentTime = 0.1;
    }, { once: true });

    video.addEventListener('seeked', onCanPlay, { once: true });
    video.addEventListener('error', showFallback, { once: true });

    var clearFeedImgErrWatch = function() {
      if (img.__feedImgErrTimer) {
        clearTimeout(img.__feedImgErrTimer);
        img.__feedImgErrTimer = null;
      }
      if (img.__feedImgErrObserver) {
        try { img.__feedImgErrObserver.disconnect(); } catch (obsErr) {}
        img.__feedImgErrObserver = null;
      }
    };

    img.__feedImgErrTimer = setTimeout(function() {
      img.__feedImgErrTimer = null;
      if (img.__feedImgErrObserver) {
        try { img.__feedImgErrObserver.disconnect(); } catch (obsErr) {}
        img.__feedImgErrObserver = null;
      }
      if (!img.isConnected) return;
      if (!img.complete || img.style.display === 'none') {
        showFallback();
      }
    }, 4500);

    if (typeof MutationObserver === 'function' && img.parentNode) {
      img.__feedImgErrObserver = new MutationObserver(function() {
        if (img.isConnected) return;
        clearFeedImgErrWatch();
        try {
          video.removeAttribute('src');
          video.load();
        } catch (videoErr) {}
      });
      img.__feedImgErrObserver.observe(img.parentNode, { childList: true });
    }
  };

  var HISTORY_VEC_ICONS = {
    stars: '<svg viewBox="0 0 24 24" fill="none" stroke="#fde047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; vertical-align:-2px; margin-right:2.5px; flex-shrink:0;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px; vertical-align:-1px; margin-right:2px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    flag: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f43f5e; vertical-align:-2px;" fill="currentColor"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" style="width:13px; height:13px; color:#f59e0b; vertical-align:-2px;" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    backpack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:14px; height:14px; flex-shrink:0;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>'
  };

  var HISTORY_TOAST_VEC = {
    lock: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    camera: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#fde047" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    compass: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    link: '<svg viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px;flex-shrink:0;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };

  if (!document.getElementById('basecamp-soft-ambient-fx-style')) {
    var fxStyle = document.createElement('style');
    fxStyle.id = 'basecamp-soft-ambient-fx-style';
    fxStyle.innerHTML = `
      @keyframes card_edge_sharp_pulse {
        0% { opacity: 0; box-shadow: 0 0 0px var(--edge-color), inset 0 0 0px var(--edge-color); }
        35% { opacity: 1; box-shadow: 0 0 6px 1px var(--edge-color), inset 0 0 3px var(--edge-color); }
        100% { opacity: 0; box-shadow: 0 0 10px 2px var(--edge-color), inset 0 0 5px var(--edge-color); }
      }
      .card-05mm-edge-layer {
        position: absolute !important;
        inset: -1px !important;
        width: calc(100% + 2px) !important;
        height: calc(100% + 2px) !important;
        border-radius: 16px !important;
        border: 1.5px solid var(--edge-color) !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        box-sizing: border-box !important;
        opacity: 0;
      }
    `;
    document.head.appendChild(fxStyle);
  }

  window.EDGE_05MM_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f43f5e', '#c084fc', '#fb923c', '#a3e635', '#ffffff'];

  window.triggerSoftAmbientFX = function(cardEl) {
    if (!cardEl) cardEl = document.getElementById('swipePostcardTarget');
    if (!cardEl) return;

    var layer = cardEl.querySelector('.card-05mm-edge-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'card-05mm-edge-layer';
      cardEl.appendChild(layer);
    }

    var randomColor = window.EDGE_05MM_COLORS[Math.floor(Math.random() * window.EDGE_05MM_COLORS.length)];
    layer.style.setProperty('--edge-color', randomColor);
    layer.style.animation = 'none';
    layer.offsetHeight;
    layer.style.animation = 'card_edge_sharp_pulse 0.65s cubic-bezier(0.2, 0.8, 0.25, 1) forwards';
  };

  // 💾 [복원 통로 단일화] IndexedDB(okbm_vault_db) 좀비 캐시를 전면 차단합니다.
  // 과거에는 IndexedDB에 남아있던 낡은 스냅샷이 앱 재시작 시 localStorage/메모리를
  // 덮어쓰면서 "방금 수정/삭제한 내용이 다시 살아나는" 원인이 되었습니다.
  // 이제 캐시 경로는 localStorage('okbm_packing_history') 단 1개로 일원화합니다.
  // 아래 두 함수는 기존 호출부(여러 파일에 흩어져 있음)를 깨뜨리지 않기 위해
  // 시그니처만 유지한 채 완전한 무동작(no-op)으로 남겨둡니다.
  window.__memoryStore = window.__memoryStore || {};

  window.saveToIndexedDB = async function() {
    // IndexedDB 쓰기 비활성화됨 (좀비 캐시 방지). 항상 아무 것도 하지 않습니다.
    return false;
  };

  window.loadFromIndexedDB = async function() {
    // IndexedDB 읽기 비활성화됨 (좀비 캐시 방지). 항상 null을 반환해
    // 호출부가 localStorage 단일 캐시로 자연스럽게 폴백하도록 합니다.
    return null;
  };




  window.safeGetStorage = function(key, defaultVal) {
    if (window.__memoryStore && window.__memoryStore[key] !== undefined && window.__memoryStore[key] !== null) {
      return window.__memoryStore[key];
    }
    return safeGetJSON(key, defaultVal);
  };

  window.safeSetStorage = function(key, value) {
    var rawObj = (typeof value === 'string' ? JSON.parse(value) : value);
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore[key] = rawObj;
    // 🛡️ [성능 패치] 메모리 스토어 키 수 제한
    var storeKeys = Object.keys(window.__memoryStore);
    if (storeKeys.length > 50) {
      // 가장 먼저 추가된 키부터 삭제 (단, 핵심 키는 보존)
      var protectedKeys = ['okbm_packing_history', 'okbm_master_gears', 'okbm_plan_spots', 'okbm_plan_memos'];
      for (var i = 0; i < storeKeys.length && Object.keys(window.__memoryStore).length > 50; i++) {
        if (protectedKeys.indexOf(storeKeys[i]) === -1) {
          delete window.__memoryStore[storeKeys[i]];
        }
      }
    }
    if (typeof window.saveToIndexedDB === 'function') {
      window.saveToIndexedDB(key, rawObj);
    }
    if (typeof window.okbmSafeSetItem === 'function') {
      window.okbmSafeSetItem(key, JSON.stringify(rawObj));
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(rawObj));
      } catch (e) { console.warn('[romantic-history.js:safeSetStorage]', e); }
    }
  };

  var __okbmCachedFeedsTimer = 0;
  function okbmWriteCachedCommunityFeeds(feeds) {
    window.__pendingCachedCommunityFeeds = Array.isArray(feeds)
      ? feeds
      : (Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : []);
    if (__okbmCachedFeedsTimer) return;
    __okbmCachedFeedsTimer = setTimeout(function() {
      __okbmCachedFeedsTimer = 0;
      var data = window.__pendingCachedCommunityFeeds;
      window.__pendingCachedCommunityFeeds = null;
      try {
        var live = Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : [];
        var liveIds = {};
        live.forEach(function(f) {
          var id = f && String(f.id || '').trim();
          if (id) liveIds[id] = true;
        });
        var topFeeds = (Array.isArray(data) ? data : []).filter(function(f) {
          if (!f) return false;
          if (f._memDeleted === true || f.isDeleted === true || f.is_deleted === true) return false;
          var id = String(f.id || '').trim();
          if (!id) return false;
          // 메모리에 서버 목록이 있으면 교집합만 캐시. 없으면 비삭제 항목만.
          if (live.length > 0 && !liveIds[id]) return false;
          return true;
        }).slice(0, 15);
        localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(topFeeds));
      } catch (e) {
        console.warn('[romantic-history.js:okbmWriteCachedCommunityFeeds]', e);
      }
    }, 100);
  }
  window.okbmWriteCachedCommunityFeeds = okbmWriteCachedCommunityFeeds;

  // 🔒 [단 1개의 통로로만 서버 쓰기] feeds 테이블에 쓰는 유일한 함수입니다.
  // 이 함수 이외의 곳에서 절대로 '/rest/v1/feeds' POST를 직접 호출하지 않습니다.
  // await로 서버 응답(200 OK)을 반드시 확인하고, 실패 시 명확한 에러를 반환합니다.
  window.submitFeedPayload = async function(payload) {
    var targetUrl = window.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') || '';
    var targetKey = window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') || '';
    if (!targetUrl || !targetKey) {
      return { ok: false, error: 'SUPABASE_NOT_CONFIGURED' };
    }
    var safePayload = payload && typeof payload === 'object' ? Object.assign({}, payload) : {};
    delete safePayload.isDeleted;
    delete safePayload._memDeleted;
    delete safePayload.is_deleted;
    if (typeof window.okbmStripClientTombstoneFields === 'function') {
      safePayload = window.okbmStripClientTombstoneFields(safePayload);
    }
    delete safePayload.likes_count;
    delete safePayload.likes;
    if (Array.isArray(safePayload.photos)) {
      safePayload.photos = safePayload.photos.filter(function(url) {
        return typeof url === 'string' && url.indexOf('data:image/') !== 0;
      });
    }
    var feedHeaders = (typeof window.okbmWriteHeaders === 'function')
      ? window.okbmWriteHeaders({ Prefer: 'return=representation' })
      : null;
    if (!feedHeaders) {
      return { ok: false, error: 'LOGIN_REQUIRED' };
    }
    try {
      var res = await fetch(targetUrl + '/rest/v1/feeds', {
        method: 'POST',
        headers: feedHeaders,
        body: JSON.stringify(safePayload)
      });

      if (!res.ok) {
        var errText = '';
        try { errText = await res.text(); } catch (readErr) {}
        if (res.status === 409) {
          var patchId = String(safePayload.id || '').trim();
          if (patchId) {
            try {
              var patchRes = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(patchId), {
                method: 'PATCH',
                headers: feedHeaders,
                body: JSON.stringify(safePayload)
              });
              if (patchRes.ok) {
                var patchData = null;
                try { patchData = await patchRes.json(); } catch (parseErr) {}
                return { ok: true, status: patchRes.status, data: patchData, conflict: true };
              }
              var patchErr = '';
              try { patchErr = await patchRes.text(); } catch (patchReadErr) {}
              console.error('[submitFeedPayload] 409 PATCH 실패 status=' + patchRes.status, patchErr);
              return { ok: false, status: patchRes.status, error: patchErr || errText || 'HTTP 409' };
            } catch (patchNetErr) {
              console.error('[submitFeedPayload] 409 PATCH 네트워크 예외:', patchNetErr);
              return { ok: false, status: 409, error: (patchNetErr && patchNetErr.message) ? patchNetErr.message : String(patchNetErr) };
            }
          }
        }
        console.error('[submitFeedPayload] 서버 저장 실패 status=' + res.status, errText);
        return { ok: false, status: res.status, error: errText || ('HTTP ' + res.status) };
      }

      var data = null;
      try { data = await res.json(); } catch (parseErr) {}
      return { ok: true, status: res.status, data: data };
    } catch (networkErr) {
      console.error('[submitFeedPayload] 네트워크 예외:', networkErr);
      return { ok: false, error: (networkErr && networkErr.message) ? networkErr.message : String(networkErr) };
    }
  };

  window.patchFeedPublishStatus = async function(recordId, isPublished) {
    var sId = String(recordId || '').trim();
    var targetUrl = window.SUPABASE_URL || (typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '') || '';
    var targetKey = window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '') || '';
    if (!targetUrl || !targetKey || !sId) {
      return { ok: false, error: 'MISSING_CONFIG' };
    }

    try {
      var res = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId), {
        method: 'PATCH',
        headers: (typeof window.okbmWriteHeaders === 'function' && window.okbmWriteHeaders({ Prefer: 'return=representation' })) || {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          is_published: Boolean(isPublished),
          updated_at: new Date().toISOString()
        })
      });

      if (!res.ok) {
        var errText = '';
        try { errText = await res.text(); } catch (readErr) {}
        console.error('[patchFeedPublishStatus] 서버 갱신 실패 status=' + res.status, errText);
        return { ok: false, status: res.status, error: errText || ('HTTP ' + res.status) };
      }

      var rows = [];
      try { rows = await res.json(); } catch (parseErr) {}
      if (!Array.isArray(rows) || rows.length === 0) {
        return { ok: false, error: 'ZERO_ROWS_UPDATED' };
      }
      return { ok: true, data: rows };
    } catch (networkErr) {
      console.error('[patchFeedPublishStatus] 네트워크 예외:', networkErr);
      return { ok: false, error: (networkErr && networkErr.message) ? networkErr.message : String(networkErr) };
    }
  };

  window.okbmApplyPublishFlag = function(recordId, nextStatus, sourceRecord) {
    var sId = String(recordId || '').trim();
    if (!sId) return;
    var published = Boolean(nextStatus);

    var stamp = function(rec) {
      if (!rec) return;
      rec.isPublished = published;
      rec.is_published = published;
    };

    if (sourceRecord) stamp(sourceRecord);

    var lists = [
      window.interactiveHistory,
      window.packingHistoryList,
      window.__allLoadedFeeds,
      window.__currentScopedPastTripLogs,
      (window.__memoryStore && window.__memoryStore['okbm_packing_history']) ? window.__memoryStore['okbm_packing_history'] : null
    ];

    lists.forEach(function(list) {
      if (!Array.isArray(list)) return;
      list.forEach(function(rec) {
        if (rec && String(rec.id || '').trim() === sId) stamp(rec);
      });
    });

    var packingList = null;
    if (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0) {
      packingList = window.interactiveHistory;
    } else if (typeof window.safeGetStorage === 'function') {
      packingList = window.safeGetStorage('okbm_packing_history', []) || [];
    }

    if (Array.isArray(packingList)) {
      var packingHit = false;
      packingList.forEach(function(rec) {
        if (rec && String(rec.id || '').trim() === sId) {
          stamp(rec);
          packingHit = true;
        }
      });
      if (packingHit) {
        window.interactiveHistory = packingList;
        window.packingHistoryList = packingList;
        if (window.__memoryStore) window.__memoryStore['okbm_packing_history'] = packingList;
        if (typeof window.safeSetStorage === 'function') {
          window.safeSetStorage('okbm_packing_history', packingList);
        }
        try { localStorage.setItem('okbm_packing_history', JSON.stringify(packingList)); } catch (e) {}
        if (typeof window.saveToIndexedDB === 'function') {
          window.saveToIndexedDB('okbm_packing_history', packingList);
        }
      }
    }

    if (Array.isArray(window.__allLoadedFeeds)) {
      var feedIdx = window.__allLoadedFeeds.findIndex(function(f) {
        return f && String(f.id || '').trim() === sId;
      });
      if (feedIdx !== -1) {
        stamp(window.__allLoadedFeeds[feedIdx]);
      } else if (sourceRecord) {
        stamp(sourceRecord);
        window.__allLoadedFeeds.unshift(sourceRecord);
        // 🛡️ [메모리 누수 패치] 피드 배열 상한 200개 제한
        if (window.__allLoadedFeeds.length > 200) {
          window.__allLoadedFeeds.length = 200;
        }
      }
      try {
        okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds);
      } catch (e) {}
    }
  };

  window.__savePackingHistoryRecordBody = async function(record) {
    if (!record) return null;

    var incomingReadyShot = String(
      record.readyShotPhoto ||
      record.ready_shot_photo ||
      record.customTemplatePhoto ||
      record.renderedPhoto ||
      record.cardImage ||
      (window.__tempStudioReadyShot || '')
    ).trim();
    if ((!incomingReadyShot || incomingReadyShot.length <= 10) && typeof window.resolveReadyShotPhotoUrl === 'function') {
      incomingReadyShot = String(window.resolveReadyShotPhotoUrl() || '').trim();
    }
    if ((!incomingReadyShot || incomingReadyShot.length <= 10) && typeof window.currentSharePhoto === 'string' && window.currentSharePhoto.indexOf('https://') === 0) {
      incomingReadyShot = String(window.currentSharePhoto).trim();
    }

    var normalized = window.normalizeHistoryRecord(record, 0);
    normalized.feedType = 'route';
    normalized._isLocalOwner = true;

    if (incomingReadyShot && incomingReadyShot.length > 10) {
      normalized.readyShotPhoto = incomingReadyShot;
    }

    if (record.readyShotMode || record.ready_shot_mode) {
      normalized.readyShotMode = record.readyShotMode || record.ready_shot_mode;
    }
    if (record.readyShotPosX !== undefined) normalized.readyShotPosX = record.readyShotPosX;
    if (record.readyShotPosY !== undefined) normalized.readyShotPosY = record.readyShotPosY;
    if (record.readyShotScale !== undefined) normalized.readyShotScale = record.readyShotScale;

    var profile = safeGetJSON('user_profile', null) || safeGetJSON('okbm_user_info', null) || safeGetJSON('kakao_account', null);
    var resolvedUserId = (typeof window.okbmGetCurrentUserId === 'function')
      ? String(window.okbmGetCurrentUserId() || '').trim()
      : '';
    if (!resolvedUserId && typeof window.okbmRequireCurrentUserId === 'function') {
      window.okbmRequireCurrentUserId();
      return record;
    }

    var resolvedNick = (profile && (profile.nickname || profile.nick || profile.name))
      ? String(profile.nickname || profile.nick || profile.name).trim()
      : (localStorage.getItem('okbm_user_nick') || localStorage.getItem('user_nickname') || '');

    if (!resolvedNick) {
      var allLoaded = window.__allLoadedFeeds || [];
      for (var fIdx = 0; fIdx < allLoaded.length; fIdx++) {
        var fItem = allLoaded[fIdx];
        if (fItem && fItem.author) {
          if (resolvedUserId && String(fItem.user_id || fItem.userId).trim() === resolvedUserId) {
            resolvedNick = String(fItem.author).trim();
            break;
          }
        }
      }
    }

    normalized.author = resolvedNick || normalized.author || '';
    normalized.userId = resolvedUserId || normalized.userId || '';

    var rawTmpl = normalized.readyShotPhoto || '';
    if (rawTmpl && rawTmpl.startsWith('data:image/') && typeof window.uploadSinglePhotoSmart === 'function') {
      var uploadedR2Url = await window.uploadSinglePhotoSmart(rawTmpl, 'readyshot_' + normalized.id + '.jpg');
      if (uploadedR2Url && uploadedR2Url.startsWith('https://')) {
        normalized.readyShotPhoto = uploadedR2Url;
      }
    }

    var prevList = (window.safeGetStorage('okbm_packing_history', []) || []).slice();
    var prevInteractive = Array.isArray(window.interactiveHistory) ? window.interactiveHistory.slice() : prevList.slice();
    var prevPackingList = Array.isArray(window.packingHistoryList) ? window.packingHistoryList.slice() : prevInteractive.slice();
    var prevMemoryHist = (window.__memoryStore && window.__memoryStore['okbm_packing_history'])
      ? window.__memoryStore['okbm_packing_history']
      : prevList.slice();

    var list = prevList.slice();
    var targetId = String(record.id || normalized.id || '').trim();
    var existIdx = -1;

    if (targetId && !targetId.startsWith('pack_temp_')) {
      existIdx = list.findIndex(function(it) {
        return it && it.id && String(it.id).trim() === targetId;
      });
    }

    // 같은 날짜만으로 기존 기록을 덮어쓰지 않음. id가 다를 때는 새 일지로 저장.

    if (existIdx !== -1) {
      normalized.id = list[existIdx].id;
      if ((!normalized.photoMemos || normalized.photoMemos.length === 0) && list[existIdx].photoMemos) {
        normalized.photoMemos = list[existIdx].photoMemos;
      }
      if (!normalized.memo && list[existIdx].memo) {
        normalized.memo = list[existIdx].memo;
      }
      if ((!normalized.photos || normalized.photos.length === 0) && Array.isArray(list[existIdx].photos) && list[existIdx].photos.length > 0) {
        normalized.photos = list[existIdx].photos;
      }
      if (!normalized.readyShotPhoto && list[existIdx].readyShotPhoto) {
        normalized.readyShotPhoto = list[existIdx].readyShotPhoto;
      }
      list[existIdx] = Object.assign({}, list[existIdx], normalized);
    } else {
      if (!targetId || targetId.startsWith('pack_temp_')) {
        normalized.id = 'pack_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      } else {
        normalized.id = targetId;
      }
      list.unshift(normalized);
    }

    list = list.filter(Boolean);
    if (Array.isArray(normalized.photos)) {
      normalized.photos = normalized.photos.filter(function(url) {
        return typeof url === 'string' && url.indexOf('data:image/') !== 0;
      });
    }

    window.__memoryStore = window.__memoryStore || {};
    window.interactiveHistory = list.slice();
    window.packingHistoryList = window.interactiveHistory;
    window.__memoryStore['okbm_packing_history'] = list.slice();

    var rollbackLocalHistory = function() {
      window.interactiveHistory = prevInteractive;
      window.packingHistoryList = prevPackingList;
      window.__memoryStore = window.__memoryStore || {};
      window.__memoryStore['okbm_packing_history'] = prevMemoryHist;
    };

    var safeStorageList = list.filter(function(item) {
      return item && item._memDeleted !== true && item.isDeleted !== true && item.is_deleted !== true;
    }).map(function(item) {
      var cloned = Object.assign({}, item);
      var sourcePhotos = Array.isArray(cloned.photos) && cloned.photos.length > 0
        ? cloned.photos
        : (Array.isArray(item.photos) ? item.photos : []);
      cloned.photos = sourcePhotos.filter(function(u) {
        return typeof u === 'string' && (u.startsWith('https://') || u.startsWith('http://')) && u.indexOf('data:image/') !== 0;
      });
      delete cloned.isDeleted;
      delete cloned._memDeleted;
      delete cloned.is_deleted;
      return cloned;
    });

    var persistLocalHistory = function() {
      var capped = (typeof window.okbmCapPackingHistoryList === 'function')
        ? window.okbmCapPackingHistoryList(safeStorageList)
        : safeStorageList.slice(0, 30);
      if (typeof window.okbmSafeSetItem === 'function') {
        window.okbmSafeSetItem('okbm_packing_history', JSON.stringify(capped));
      } else {
        try {
          localStorage.setItem('okbm_packing_history', JSON.stringify(capped));
        } catch (e) { console.warn('[romantic-history.js:savePackingHistoryRecord localSet]', e); }
      }
    };

    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';
    if (targetUrl && targetKey) {
      var tmplPhoto = normalized.readyShotPhoto || normalized.customTemplatePhoto || '';

      var canPublish = (typeof window.okbmCanPublishFeed === 'function')
        ? window.okbmCanPublishFeed(normalized, { skipDate: true })
        : false;
      var prevRecForPublish = (existIdx !== -1 && Array.isArray(prevList)) ? prevList[existIdx] : null;
      var prevReadyForPublish = String(
        (prevRecForPublish && (prevRecForPublish.readyShotPhoto || prevRecForPublish.ready_shot_photo || prevRecForPublish.customTemplatePhoto)) ||
        normalized.readyShotPhoto ||
        ''
      ).trim();
      var prevPhotosForPublish = (prevRecForPublish && typeof getRecordPhotos === 'function')
        ? getRecordPhotos(prevRecForPublish)
        : [];
      var prevHadFieldPhotos = prevPhotosForPublish.some(function(u) {
        return typeof u === 'string' &&
          (u.startsWith('https://') || u.startsWith('http://')) &&
          u.indexOf('unsplash.com') === -1 &&
          u !== prevReadyForPublish;
      });
      var prevWasPrivate = prevRecForPublish
        ? ((typeof window.okbmIsExplicitlyPrivate === 'function')
          ? window.okbmIsExplicitlyPrivate(prevRecForPublish)
          : (prevRecForPublish.isPublished === false || prevRecForPublish.is_published === false))
        : (normalized.isPublished === false);
      var autoOpenReadyShotPrivate = Boolean(
        canPublish && !prevHadFieldPhotos && prevWasPrivate && prevReadyForPublish
      );
      var finalPublished = canPublish && (normalized.isPublished !== false || autoOpenReadyShotPrivate);
      normalized.isPublished = finalPublished;
      normalized.is_published = finalPublished;
      var stampPublishedFlag = function(rec) {
        if (!rec || String(rec.id || '').trim() !== String(normalized.id || '').trim()) return;
        rec.isPublished = finalPublished;
        rec.is_published = finalPublished;
      };
      list.forEach(stampPublishedFlag);
      safeStorageList.forEach(stampPublishedFlag);
      window.interactiveHistory = list.slice();
      window.packingHistoryList = window.interactiveHistory;
      window.__memoryStore = window.__memoryStore || {};
      window.__memoryStore['okbm_packing_history'] = list.slice();
      if (!canPublish) {
        var spotProbe = String(normalized.spot || '').trim();
        if (typeof window.isSpotRegisteredInMasterDB === 'function' && !window.isSpotRegisteredInMasterDB(spotProbe)) {
          normalized.unregisteredSpot = true;
        }
      }

      var payload = {
        id: normalized.id,
        user_id: normalized.userId,
        author: normalized.author || '',
        author_photo: normalized.authorPhoto || '',
        spot: normalized.spot || '',
        elevation: normalized.elevation ? String(normalized.elevation) : '',
        weight_kg: parseFloat(normalized.weightKg) || 0,
        date: normalized.date,
        memo: normalized.memo || '',
        template_id: normalized.templateId || 1,
        instagram: normalized.instagram || '',
        youtube: normalized.youtube || '',
        photo_memos_json: normalized.photoMemos || [],
        is_published: finalPublished,
        photos: normalized.photos || [],
        items: normalized.items || [],
        ready_shot_photo: tmplPhoto,
        ready_shot_mode: normalized.readyShotMode || '',
        ready_shot_pos_x: normalized.readyShotPosX !== undefined ? Number(normalized.readyShotPosX) : 50,
        ready_shot_pos_y: normalized.readyShotPosY !== undefined ? Number(normalized.readyShotPosY) : 50,
        ready_shot_scale: normalized.readyShotScale !== undefined ? Number(normalized.readyShotScale) : 1.0,
        feed_type: normalized.feedType || 'route',
        updated_at: new Date().toISOString()
      };

      payload.photos = (payload.photos || []).filter(function(url) {
        return typeof url === 'string' && url.indexOf('data:image/') !== 0;
      });

      if (window.__tempStudioReadyShot) {
        window.__tempStudioReadyShot = null;
      }

      // [단 1개의 통로로만 서버 쓰기] submitFeedPayload가 유일한 write 경로입니다.
      var submitResult = await window.submitFeedPayload(payload);

      if (!submitResult.ok) {
        rollbackLocalHistory();
        normalized.__serverSaveFailed = true;
        normalized.__serverSaveError = submitResult.error || ('HTTP ' + submitResult.status);
        console.error('[romantic-history.js:savePackingHistoryRecord] 서버 저장 실패:', submitResult);
        if (typeof showToast === 'function') {
          showToast('저장에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.', 'error', 2600);
        }
        window.__tempStudioReadyShot = null;
        return normalized;
      }
    }

    persistLocalHistory();
    window.__tempStudioReadyShot = null;

    if (!Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = [];
    }
    var existFeedIdx = window.__allLoadedFeeds.findIndex(function(f) {
      return f && String(f.id).trim() === String(normalized.id).trim();
    });
    if (existFeedIdx !== -1) {
      window.__allLoadedFeeds[existFeedIdx] = Object.assign({}, window.__allLoadedFeeds[existFeedIdx], normalized);
    } else {
      window.__allLoadedFeeds.unshift(normalized);
      if (window.__allLoadedFeeds.length > 200) {
        window.__allLoadedFeeds.length = 200;
      }
    }
    try {
      okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds);
    } catch (e) { console.warn('[romantic-history.js:savePackingHistoryRecord feedCache]', e); }

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
    if (typeof window.okbmSyncFeedCardMedia === 'function') {
      window.okbmSyncFeedCardMedia(normalized);
    }

    if (typeof syncUserDataToCloud === 'function') {
      syncUserDataToCloud(true);
    }

    if (typeof window.refreshMyReportFullStats === 'function') {
      window.refreshMyReportFullStats();
    }

    return normalized;
  };

  window.savePackingHistoryRecord = function(record) {
    var prev = window.__packingSaveChain || Promise.resolve();
    var next = prev.catch(function() {}).then(function() {
      return window.__savePackingHistoryRecordBody(record);
    });
    window.__packingSaveChain = next;
    return next;
  };

  // 🏛️ [낭만루트 통합 리다이렉트]
  window.saveRouterSnapRecord = function(record) {
    if (!record) return null;
    if (typeof window.savePackingHistoryRecord === 'function') {
      return window.savePackingHistoryRecord(record);
    }
    return record;
  };

  window.okbmCollectPreviewPhotos = function(record) {
    var urls = [];
    var push = function(val) {
      if (typeof val !== 'string') return;
      var clean = val.trim();
      if (clean.length < 12) return;
      if (clean.indexOf('data:') !== 0 && clean.indexOf('blob:') !== 0 && clean.indexOf('http') !== 0) return;
      if (urls.indexOf(clean) === -1) urls.push(clean);
    };
    if (!record) return urls;
    if (Array.isArray(record.photos)) record.photos.forEach(push);
    return urls;
  };
  function okbmReadLocalPackingHistory() {
    try {
      var localRaw = localStorage.getItem('okbm_packing_history');
      if (!localRaw) return [];
      var parsed = JSON.parse(localRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function okbmApplyPackingHistoryToMemory(rawList) {
    var list = Array.isArray(rawList) ? rawList : [];
    window.interactiveHistory = list.map(function(r, i) {
      if (typeof window.normalizeHistoryRecord === 'function') {
        return window.normalizeHistoryRecord(r, i);
      }
      return r;
    });
    window.packingHistoryList = window.interactiveHistory;
    window.__memoryStore = window.__memoryStore || {};
    window.__memoryStore['okbm_packing_history'] = window.interactiveHistory;
  }

  window.okbmHydratePackingHistoryAfterServer = function(feedList, allMyServerIds, meta) {
    if (window.__okbmHistoryPreloadTimer) {
      clearTimeout(window.__okbmHistoryPreloadTimer);
      window.__okbmHistoryPreloadTimer = null;
    }
    meta = meta || {};
    if (meta.failed === true) {
      return { merged: false, failed: true };
    }
    var myId = (typeof window.okbmGetCurrentUserId === 'function')
      ? String(window.okbmGetCurrentUserId() || '').trim()
      : '';
    var localList = okbmReadLocalPackingHistory();
    var serverMineIds = {};
    var serverMine = [];
    (Array.isArray(feedList) ? feedList : []).forEach(function(f) {
      if (!f || !f.id) return;
      var fUid = String(f.user_id || f.userId || '').trim();
      var isMine = false;
      if (myId && fUid) {
        if (typeof window.okbmSameAccountId === 'function') {
          isMine = window.okbmSameAccountId(myId, fUid);
        } else {
          isMine = (myId === fUid);
        }
      }
      if (isMine) {
        var fid = String(f.id).trim();
        serverMineIds[fid] = true;
        serverMine.push(f);
      }
    });
    var hasFullIdSet = allMyServerIds && typeof allMyServerIds === 'object';
    if (!hasFullIdSet) {
      var overlay = Array.isArray(localList) ? localList.slice() : [];
      serverMine.forEach(function(f) {
        var fid = String(f.id).trim();
        var idx = overlay.findIndex(function(r) { return r && String(r.id).trim() === fid; });
        if (idx !== -1) overlay[idx] = f;
        else overlay.unshift(f);
      });
      okbmApplyPackingHistoryToMemory(overlay);
      return { merged: false, deferred: true };
    }
    var keptLocal = localList.filter(function(r) {
      if (!r || !r.id) return false;
      var rid = String(r.id).trim();
      if (!rid) return false;
      if (rid.indexOf('pack_temp_') === 0) return true;
      if (serverMineIds[rid]) return false;
      var rUid = String(r.user_id || r.userId || '').trim();
      var isMine = false;
      if (myId && rUid) {
        if (typeof window.okbmSameAccountId === 'function') {
          isMine = window.okbmSameAccountId(myId, rUid);
        } else {
          isMine = (myId === rUid);
        }
      }
      if (isMine) {
        return !!allMyServerIds[rid];
      }
      return true;
    });
    var nextList = keptLocal.concat(serverMine);
    okbmApplyPackingHistoryToMemory(nextList);
    var persistHist = (typeof window.okbmCapPackingHistoryList === 'function')
      ? window.okbmCapPackingHistoryList(nextList)
      : nextList.slice(0, 30);
    if (typeof window.okbmSafeSetItem === 'function') {
      window.okbmSafeSetItem('okbm_packing_history', JSON.stringify(persistHist));
    } else {
      try { localStorage.setItem('okbm_packing_history', JSON.stringify(persistHist)); } catch (e) {}
    }
    window.__okbmDeferHistoryHydrate = false;
    return { merged: true, failed: false };
  };

  window.okbmFormatPostgrestInList = function(ids) {
    return (Array.isArray(ids) ? ids : []).map(function(id) {
      var s = String(id || '').trim();
      if (!s) return '';
      if (/^[0-9a-fA-F-]{8,}$/.test(s) || /^[0-9]+$/.test(s)) return s;
      return '"' + s.replace(/"/g, '') + '"';
    }).filter(Boolean).join(',');
  };

  // 슈퍼베이스에서 삭제된 feeds 행을 로컬 피드/마이데이터 캐시에서 제거 (SSOT)
  window.okbmReconcileLocalFeedsWithServer = function(opts) {
    opts = opts || {};
    if (window.__okbmReconcileInflight) return window.__okbmReconcileInflight;

    window.__okbmReconcileInflight = (async function() {
      var targetUrl = window.SUPABASE_URL || '';
      var targetKey = window.SUPABASE_ANON_KEY || '';
      var myId = (typeof window.okbmGetCurrentUserId === 'function')
        ? String(window.okbmGetCurrentUserId() || '').trim()
        : '';
      if (!targetUrl || !targetKey) return { purgedMine: 0, purgedLoaded: 0 };

      var headers = (typeof window.okbmPublicRestHeaders === 'function')
        ? window.okbmPublicRestHeaders()
        : {
        'apikey': targetKey,
        'Authorization': 'Bearer ' + targetKey,
        'Content-Type': 'application/json'
      };

      var allMyServerIds = {};
      var myIdFetchOk = false;
      if (myId) {
        var idVariants = [myId];
        var pure = myId.replace(/^(kakao_|naver_|apple_|google_|user_)/, '');
        if (pure && pure !== myId) idVariants.push(pure);
        if (myId.indexOf('kakao_') !== 0 && /^\d+$/.test(myId)) idVariants.push('kakao_' + myId);

        var seenVariant = {};
        for (var vi = 0; vi < idVariants.length; vi++) {
          var uid = String(idVariants[vi] || '').trim();
          if (!uid || seenVariant[uid]) continue;
          seenVariant[uid] = true;
          var offset = 0;
          var limit = 1000;
          var guard = 0;
          var variantOk = false;
          while (guard < 30) {
            guard++;
            var idQuery = targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(uid)
              + '&select=id&order=created_at.desc&offset=' + offset + '&limit=' + limit;
            var idRes = await fetch(idQuery, { headers: headers });
            if (!idRes.ok) break;
            variantOk = true;
            var idRows = [];
            try { idRows = await idRes.json(); } catch (eParse) { idRows = []; }
            if (!Array.isArray(idRows) || idRows.length === 0) break;
            idRows.forEach(function(row) {
              if (row && row.id) allMyServerIds[String(row.id).trim()] = true;
            });
            if (idRows.length < limit) break;
            offset += limit;
          }
          if (variantOk) myIdFetchOk = true;
        }
      }

      var pageFeeds = Array.isArray(opts.loadedFeeds)
        ? opts.loadedFeeds
        : (Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : []);

      if (typeof window.okbmHydratePackingHistoryAfterServer === 'function') {
        window.okbmHydratePackingHistoryAfterServer(pageFeeds, (myId && myIdFetchOk) ? allMyServerIds : null);
      }

      var candidateIds = [];
      var pushId = function(id) {
        var s = String(id || '').trim();
        if (!s || s.indexOf('pack_temp_') === 0) return;
        if (candidateIds.indexOf(s) === -1) candidateIds.push(s);
      };
      pageFeeds.forEach(function(f) { if (f) pushId(f.id); });
      (Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : []).forEach(function(f) { if (f) pushId(f.id); });
      (Array.isArray(window.heroTopRecords) ? window.heroTopRecords : []).forEach(function(f) { if (f) pushId(f.id); });
      try {
        var cached = (typeof safeGetJSON === 'function') ? (safeGetJSON('okbm_cached_community_feeds', []) || []) : [];
        (Array.isArray(cached) ? cached : []).forEach(function(f) { if (f) pushId(f.id); });
      } catch (eCache) {}

      var aliveIds = {};
      var chunkSize = 80;
      for (var ci = 0; ci < candidateIds.length; ci += chunkSize) {
        var chunk = candidateIds.slice(ci, ci + chunkSize);
        var inList = window.okbmFormatPostgrestInList(chunk);
        if (!inList) continue;
        var existRes = await fetch(targetUrl + '/rest/v1/feeds?id=in.(' + inList + ')&select=id', { headers: headers });
        if (!existRes.ok) continue;
        var existRows = [];
        try { existRows = await existRes.json(); } catch (e2) { existRows = []; }
        (Array.isArray(existRows) ? existRows : []).forEach(function(row) {
          if (row && row.id) aliveIds[String(row.id).trim()] = true;
        });
      }

      var isAlive = function(rec) {
        if (!rec || !rec.id) return false;
        var rid = String(rec.id).trim();
        if (!rid) return false;
        if (rid.indexOf('pack_temp_') === 0) return true;
        if (candidateIds.length === 0) return true;
        if (Object.keys(aliveIds).length === 0 && candidateIds.length > 0) {
          // 존재 조회 실패 시 내 글은 allMyServerIds로만 판정
          var rUid = String(rec.user_id || rec.userId || '').trim();
          var mine = false;
          if (myId && rUid) {
            mine = (typeof window.okbmSameAccountId === 'function')
              ? window.okbmSameAccountId(myId, rUid)
              : (myId === rUid);
          }
          if (mine && myId && myIdFetchOk) return !!allMyServerIds[rid];
          return true;
        }
        return !!aliveIds[rid];
      };

      var purgedLoaded = 0;
      if (Array.isArray(window.__allLoadedFeeds)) {
        var beforeLen = window.__allLoadedFeeds.length;
        window.__allLoadedFeeds = window.__allLoadedFeeds.filter(isAlive);
        purgedLoaded += (beforeLen - window.__allLoadedFeeds.length);
        try { okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds); } catch (eW) {}
      }

      if (Array.isArray(window.heroTopRecords)) {
        window.heroTopRecords = window.heroTopRecords.filter(isAlive);
      }

      var packingBefore = okbmReadLocalPackingHistory();
      var packingAfter = packingBefore.filter(function(r) {
        if (!r || !r.id) return false;
        var rid = String(r.id).trim();
        if (rid.indexOf('pack_temp_') === 0) return true;
        var rUid = String(r.user_id || r.userId || '').trim();
        var mine = false;
        if (myId && rUid) {
          mine = (typeof window.okbmSameAccountId === 'function')
            ? window.okbmSameAccountId(myId, rUid)
            : (myId === rUid);
        }
        if (mine && myId && myIdFetchOk) return !!allMyServerIds[rid];
        return isAlive(r);
      });
      var purgedMine = packingBefore.length - packingAfter.length;
      if (purgedMine !== 0 || packingAfter.length !== packingBefore.length) {
        okbmApplyPackingHistoryToMemory(packingAfter);
        try { localStorage.setItem('okbm_packing_history', JSON.stringify(packingAfter)); } catch (eP) {}
      }

      if ((purgedMine > 0 || purgedLoaded > 0) && typeof window.renderHistoryStage === 'function' && window.__okbmHistoryModalOpen) {
        try { window.renderHistoryStage(); } catch (eR) {}
      }

      return { purgedMine: purgedMine, purgedLoaded: purgedLoaded, myCount: Object.keys(allMyServerIds).length, myIdFetchOk: myIdFetchOk };
    })().catch(function(err) {
      console.warn('[romantic-history.js:okbmReconcileLocalFeedsWithServer]', err);
      return { purgedMine: 0, purgedLoaded: 0, error: String(err && err.message || err) };
    }).finally(function() {
      window.__okbmReconcileInflight = null;
    });

    return window.__okbmReconcileInflight;
  };

  (async function preloadLocalStorageToMemory() {
    try {
      var online = typeof navigator !== 'undefined' && navigator.onLine;
      var hasServer = !!(window.SUPABASE_URL || window.SUPABASE_ANON_KEY);
      if (online && hasServer) {
        window.__okbmDeferHistoryHydrate = true;
        window.interactiveHistory = window.interactiveHistory || [];
        window.packingHistoryList = window.interactiveHistory;
        window.__okbmHistoryPreloadTimer = setTimeout(function() {
          if (!window.__okbmDeferHistoryHydrate) return;
          window.__okbmDeferHistoryHydrate = false;
          window.__okbmHistoryPreloadTimer = null;
          okbmApplyPackingHistoryToMemory(okbmReadLocalPackingHistory());
        }, 6000);
        return;
      }
      okbmApplyPackingHistoryToMemory(okbmReadLocalPackingHistory());
    } catch (e) { console.warn('[romantic-history.js:preloadLocalStorageToMemory]', e); }
  })();
function getRecordPhotos(record) {
    if (!record) return [];
    var list = [];
    if (Array.isArray(record.photos)) {
      list = record.photos;
    } else if (typeof record.photos === 'string' && record.photos.trim()) {
      var rawPhotos = record.photos.trim();
      if (rawPhotos.startsWith('[')) {
        try { list = JSON.parse(rawPhotos); } catch (e) { list = []; }
      } else if (rawPhotos.startsWith('http://') || rawPhotos.startsWith('https://')) {
        list = [rawPhotos];
      }
    }
    return list.map(function(u) {
      if (typeof u === 'string') return u.trim();
      if (u && typeof u === 'object') {
        return String(u.url || u.src || u.photo || u.href || '').trim();
      }
      return '';
    }).filter(function(u) {
      return u.indexOf('https://') === 0 || u.indexOf('http://') === 0;
    });
  }
  window.getRecordPhotos = getRecordPhotos;

  window.okbmIsExplicitlyPrivate = function(item) {
    if (!item) return true;
    var raw = item.isPublished !== undefined ? item.isPublished : (item.is_published !== undefined ? item.is_published : item.published);
    return raw === false || raw === 'false' || raw === 'FALSE' || raw === 0 || raw === '0' || raw === 'N' || raw === 'n';
  };

  window.okbmPublicPhotoUrls = function(item) {
    if (!item) return [];
    return getRecordPhotos(item);
  };

  window.okbmRouteDateReached = function(item) {
    if (!item) return false;
    var year = 0;
    var month = 0;
    var day = 0;
    var parts = String(item.date || '').match(/\d+/g);
    if (parts && parts.length >= 3) {
      if (String(parts[2]).length === 4 && String(parts[0]).length !== 4) {
        year = parseInt(parts[2], 10);
        month = parseInt(parts[0], 10);
        day = parseInt(parts[1], 10);
      } else {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    } else if (item.year && item.month && item.day) {
      year = parseInt(item.year, 10);
      month = parseInt(item.month, 10);
      day = parseInt(item.day, 10);
    }
    if (!year || !month || !day) return true;
    var targetNum = year * 10000 + month * 100 + day;
    var now = new Date();
    var todayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return targetNum <= todayNum;
  };

  // 후기(함께보기) 가능 = 등록 장소 + 현장사진 + 디데이
  window.okbmCanPublishFeed = function(record, opts) {
    opts = opts || {};
    if (!record) return false;
    var spot = String(record.spot || '').trim();
    if (!spot) return false;
    var compact = spot.replace(/\s+/g, '');
    if (
      compact === '자유일정' ||
      compact === '나의해힐링스팟' ||
      compact === '힐링박지' ||
      compact === '방문스팟'
    ) {
      return false;
    }
    if (record.unregisteredSpot === true || record.unregistered_spot === true) return false;
    if (typeof window.isSpotRegisteredInMasterDB === 'function' && !window.isSpotRegisteredInMasterDB(spot)) {
      return false;
    }
    var tmplPhoto = String(record.readyShotPhoto || record.ready_shot_photo || record.customTemplatePhoto || '').trim();
    var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(record) : (record.photos || []);
    var hasFieldPhotos = Array.isArray(photos) && photos.some(function(u) {
      return typeof u === 'string' &&
        (u.startsWith('https://') || u.startsWith('http://')) &&
        u.indexOf('unsplash.com') === -1 &&
        u !== tmplPhoto;
    });
    if (!hasFieldPhotos) return false;
    if (!opts.skipDate && typeof window.okbmRouteDateReached === 'function' && !window.okbmRouteDateReached(record)) {
      return false;
    }
    return true;
  };

  window.okbmIsPublicFeedItem = function(item) {
    if (!item) return false;
    var isOwner = (typeof window.isRecordOwner === 'function') && window.isRecordOwner(item);
    if (isOwner) {
      return true;
    }
    if (window.okbmIsExplicitlyPrivate(item)) return false;
    if (item.isPublished === false || item.is_published === false) return false;
    return true;
  };

  // 🎨 [3D 엽서 테두리 팔레트]
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

window.normalizeHistoryRecord = function(r, idx) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();

    if (r && r.date) {
      var dateStr = String(r.date).trim();
      var parsedDate = new Date(dateStr);

      if (!isNaN(parsedDate.getTime()) && (dateStr.includes('GMT') || dateStr.includes('T') || dateStr.includes('-') || /[a-zA-Z]/.test(dateStr))) {
        y = parsedDate.getFullYear();
        m = parsedDate.getMonth() + 1;
        d = parsedDate.getDate();
      } else {
        var parts = dateStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
          if (parts[0].length === 4) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          } else if (parts[2].length === 4) {
            y = parseInt(parts[2], 10);
            m = parseInt(parts[0], 10);
            d = parseInt(parts[1], 10);
          }
        }
      }
    } else if (r && r.year && r.month && r.day) {
      y = parseInt(r.year, 10);
      m = parseInt(r.month, 10);
      d = parseInt(r.day, 10);
    }

    var cleanDate = y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0');
    var recordId = (r && r.id) ? String(r.id) : ('pack_' + cleanDate.replace(/\D/g, '') + '_' + idx);
    var savedReadyShot = (r && (r.readyShotPhoto || r.ready_shot_photo)) ? String(r.readyShotPhoto || r.ready_shot_photo).trim() : '';

    var rawPhotos = getRecordPhotos(r);
    if (savedReadyShot && rawPhotos.includes(savedReadyShot)) {
      rawPhotos = rawPhotos.filter(function(p) { return p !== savedReadyShot; });
    }

    var rawList = Array.isArray(r.items) ? r.items : (Array.isArray(r.items_json) ? r.items_json : (Array.isArray(r.gears) ? r.gears : []));
    var cleanItems = rawList.map(function(it) {
      if (typeof it === 'string') {
        var match = it.match(/^(.*?)\s*\((\d+)g\)$/);
        return match ? { name: match[1], weight: parseInt(match[2], 10) } : { name: it, weight: 0 };
      }
      return {
        name: it.name || it.itemName,
        weight: Number(it.weight || it.weight_g || 0)
      };
    });

    var totalGrams = cleanItems.reduce(function(sum, it) { return sum + it.weight; }, 0);
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var rawTemplateId = (r && (r.template_id !== undefined ? r.template_id : r.templateId));
    var finalTemplateId = (rawTemplateId !== undefined && rawTemplateId !== null) ? parseInt(rawTemplateId, 10) : savedTmplId;

    var userMemo = (r && r.memo !== undefined && r.memo !== null) ? String(r.memo).trim() : '';
    var spotTitle = (r && (r.spot || r.spotName)) ? String(r.spot || r.spotName).trim() : '';

    var rawAuthor = r ? (r.author || r.nickname || r.authorName || r.nick) : '';
    var currentAuthor = (rawAuthor && String(rawAuthor).trim()) ? String(rawAuthor).trim() : '';

    var resolvedAuthorPhoto = (r && (r.author_photo || r.authorPhoto || r.photo_url || r.user_photo)) ? String(r.author_photo || r.authorPhoto || r.photo_url || r.user_photo).trim() : '';
    var resolvedUserId = (r && (r.user_id || r.userId)) ? String(r.user_id || r.userId).trim() : '';

    var rawWeightKg = r ? (r.weight_kg !== undefined ? r.weight_kg : r.weightKg) : undefined;
    var finalWeightKg = (rawWeightKg !== undefined && rawWeightKg !== null && String(rawWeightKg) !== '0.00')
      ? String(rawWeightKg)
      : (totalGrams > 0 ? (totalGrams / 1000).toFixed(2) : '0.00');

    var resolvedPhotoMemos = [];
    var rawPhotoMemos = r && (r.photo_memos_json || r.photoMemos || r.photo_memos);
    if (Array.isArray(rawPhotoMemos)) {
      resolvedPhotoMemos = rawPhotoMemos;
    } else if (typeof rawPhotoMemos === 'string' && rawPhotoMemos.trim().startsWith('[')) {
      try {
        var parsedMemos = JSON.parse(rawPhotoMemos);
        if (Array.isArray(parsedMemos)) resolvedPhotoMemos = parsedMemos;
      } catch (e) {}
    }
    resolvedPhotoMemos = resolvedPhotoMemos.map(function(m) { return m != null ? String(m).trim() : ''; });

    var hasServerPublishFlag = Boolean(r && (r.is_published !== undefined || r.isPublished !== undefined));
    var resolvedPublished = false;
    if (r) {
      if (r.is_published !== undefined) {
        resolvedPublished = Boolean(r.is_published);
      } else if (r.isPublished !== undefined) {
        resolvedPublished = Boolean(r.isPublished);
      } else {
        resolvedPublished = (rawPhotos.length > 0);
      }
    }
    // 서버가 이미 공개/비공개를 정한 행은 클라이언트 자격 게이트로 덮지 않는다.
    // 마스터 장소명 불일치 때문에 비로그인 보관함에서 공개 피드가 전부 사라지는 원인.
    if (!hasServerPublishFlag) {
      var probeForGate = {
        spot: spotTitle,
        photos: rawPhotos,
        readyShotPhoto: savedReadyShot,
        date: cleanDate,
        year: y,
        month: m,
        day: d,
        unregisteredSpot: Boolean(r && (r.unregisteredSpot === true || r.unregistered_spot === true)),
        isPublished: resolvedPublished
      };
      if (typeof window.okbmCanPublishFeed === 'function' && !window.okbmCanPublishFeed(probeForGate, { skipDate: true })) {
        resolvedPublished = false;
      }
    }

    var rMode = (r && (r.ready_shot_mode || r.readyShotMode)) || '';
    var rPosX = (r && (r.ready_shot_pos_x !== undefined ? r.ready_shot_pos_x : r.readyShotPosX));
    var rPosY = (r && (r.ready_shot_pos_y !== undefined ? r.ready_shot_pos_y : r.readyShotPosY));
    var rScale = (r && (r.ready_shot_scale !== undefined ? r.ready_shot_scale : r.readyShotScale));
    var rawLikes = (r && (r.likes_count !== undefined ? r.likes_count : r.likes));
    var finalLikes = (rawLikes !== undefined && rawLikes !== null && !isNaN(Number(rawLikes))) ? Number(rawLikes) : 0;

    return {
      id: recordId,
      userId: resolvedUserId,
      feedType: (r && (r.feed_type || r.feedType)) || 'route',
      author: currentAuthor,
      authorPhoto: resolvedAuthorPhoto,
      _isLocalOwner: Boolean(r && r._isLocalOwner),
      templateId: finalTemplateId,
      readyShotPhoto: savedReadyShot,
      readyShotMode: rMode,
      readyShotPosX: (rPosX !== undefined && rPosX !== null) ? Number(rPosX) : 50,
      readyShotPosY: (rPosY !== undefined && rPosY !== null) ? Number(rPosY) : 50,
      readyShotScale: (rScale !== undefined && rScale !== null) ? Number(rScale) : 1.0,
      ratio: (r && r.ratio) || '3/4',
      isPhotoCardMode: Boolean(savedReadyShot),
      date: cleanDate,
      year: y,
      month: m,
      day: d,
      spot: spotTitle,
      elevation: (r && r.elevation) ? String(r.elevation) : '',
      weightKg: finalWeightKg,
      weightGrams: (r && r.weightGrams) ? r.weightGrams : totalGrams,
      itemCount: cleanItems.length,
      memo: userMemo,
      oneLineMemo: (r && r.oneLineMemo) ? r.oneLineMemo : userMemo,
      photoMemos: resolvedPhotoMemos,
      isPublished: resolvedPublished,
      likes: finalLikes,
      likes_count: finalLikes,
      instagram: (r && r.instagram) ? r.instagram : '',
      youtube: (r && r.youtube) ? r.youtube : '',
      blog: (r && (r.blog || r.blog_url || r.naverBlog)) ? String(r.blog || r.blog_url || r.naverBlog) : '',
      spotId: (r && (r.spotId || r.spot_id)) ? String(r.spotId || r.spot_id).trim() : '',
      memoMode: (r && (r.memoMode || r.memo_mode)) ? String(r.memoMode || r.memo_mode) : 'single',
      unregisteredSpot: Boolean(r && (r.unregisteredSpot === true || r.unregistered_spot === true)),
      items: cleanItems,
      photos: rawPhotos
    };
  };

  // 🔄 [전역 상태 초기화]
  window.currentCardIndex = 0;
  window.currentViewMode = 'card';
  window.activeHistorySubFilter = 'all';
  window.isPostcardFlipped = false;

  // 👤 [마이데이터 유저 프로필 SSOT 맵 & 실시간 백그라운드 인출기]
  window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};

  window.resolveUserMasterPhoto = function(userId, authorName, fallbackPhoto) {
    var uId = String(userId || '').trim();
    if (!uId || uId === 'guest') return fallbackPhoto || '';

    var profile = safeGetJSON('user_profile', null);
    var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    if (!myId && typeof window.okbmGetCurrentUserId === 'function') {
      try { myId = String(window.okbmGetCurrentUserId() || '').trim(); } catch (eMy) { myId = ''; }
    }
    var isMe = Boolean(myId && (uId === myId || (window.isCurrentUserId && window.isCurrentUserId(uId))));
    var myCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');

    if (isMe && myCover && String(myCover).startsWith('http')) {
      window.__userProfilePhotoMap[uId] = myCover;
      return myCover;
    }

    if (window.__userProfilePhotoMap[uId]) {
      var cached = window.__userProfilePhotoMap[uId];
      if (!isMe && myCover && cached === myCover) {
        delete window.__userProfilePhotoMap[uId];
      } else {
        return cached;
      }
    }

    var safeFallback = fallbackPhoto || '';
    if (!isMe && myCover && String(safeFallback) === String(myCover)) {
      safeFallback = '';
    }

    if (safeFallback && String(safeFallback).startsWith('http')) {
      window.__userProfilePhotoMap[uId] = safeFallback;
    }

    window.__userProfileFetchingMap = window.__userProfileFetchingMap || {};
    if (!window.__userProfileFetchingMap[uId]) {
      window.__userProfileFetchingMap[uId] = true;
      var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
      var targetKey = window.SUPABASE_ANON_KEY || '';
      if (targetUrl && targetKey) {
        var profileReq = (typeof window.okbmFetchPublicProfile === 'function')
          ? window.okbmFetchPublicProfile(uId)
          : fetch(targetUrl + '/rest/v1/rpc/get_public_profile', {
              method: 'POST',
              headers: {
                'apikey': targetKey,
                'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ p_id: uId })
            }).then(function(res) { return res.ok ? res.json() : null; });
        Promise.resolve(profileReq)
        .then(function(uData) {
          if (!uData || !uData.id) return;
          var remoteUrl = uData.hero_cover_url || uData.photo_url || '';
          if (remoteUrl && String(remoteUrl).startsWith('http')) {
            window.__userProfilePhotoMap[uId] = remoteUrl;
            document.querySelectorAll('[data-user-avatar-id="' + uId + '"]').forEach(function(imgEl) {
              imgEl.src = remoteUrl;
              imgEl.style.display = 'block';
              var placeholder = imgEl.parentElement ? imgEl.parentElement.querySelector('.avatar-placeholder-svg') : null;
              if (placeholder) placeholder.style.display = 'none';
            });
          }
        }).catch(function() {});
      }
    }

    return window.__userProfilePhotoMap[uId] || safeFallback || '';
  };

  if (!window.__okbmDeferHistoryHydrate) {
    window.interactiveHistory = (window.safeGetStorage('okbm_packing_history', []) || []).map(function(r, i) {
      return window.normalizeHistoryRecord(r, i);
    });
    window.packingHistoryList = window.interactiveHistory;
  }

  window.getRecordDateNum = function(r) {
    if (!r) return 0;
    var y = Number(r.year), m = Number(r.month), d = Number(r.day);
    if (!y || !m || !d) {
      var parts = String(r.date || '').match(/\d+/g);
      if (parts && parts.length >= 3) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
    }
    return (y && m && d) ? new Date(y, m - 1, d).getTime() : 0;
  };

  window.sortHistoryByDateAsc = function(list) {
    if (!Array.isArray(list)) return [];
    return list.slice().sort(function(a, b) {
      return window.getRecordDateNum(a) - window.getRecordDateNum(b);
    });
  };

  // 🗂️ [3D 엽서 카드 렌더링 - 폰 IndexedDB 사진 & 글 100% 반영]
  window.render3DPostcardElement = function(cur, index) {
    if (!cur) return '';
    var items = Array.isArray(cur.items) ? cur.items : [];
    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = cur.templateId || savedTmplId;
    var shortCardMemo = cur.oneLineMemo || (cur.spot ? (cur.spot + ' 백패킹') : '자연 속 힐링 백패킹');

    var isCompleted = Boolean(cur.memo && cur.memo.trim().length > 0);
    var statusBadgeHtml = isCompleted
      ? '<span style="font-size:0.52rem; background:rgba(52,211,153,0.18); border:1px solid #34d399; color:#6ee7b7; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">✍️ 일지작성됨</span>'
      : '<span style="font-size:0.52rem; background:rgba(251,146,60,0.18); border:1px solid #fb923c; color:#fdba74; font-weight:900; padding:1.5px 5px; border-radius:4px; display:inline-flex; align-items:center; gap:2px;">⏳ 일지 미작성</span>';

    var photosList = getRecordPhotos(cur);
    var rawPhoto = photosList[0] || '';
    var hasValidPhoto = Boolean(rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 10);

    var customTmplImg = cur.readyShotPhoto || cur.customTemplatePhoto;
    if (!customTmplImg && window.__memoryStore && window.__memoryStore['okbm_ready_shots_map']) {
      var rEntry = window.__memoryStore['okbm_ready_shots_map'][String(cur.id)] || window.__memoryStore['okbm_ready_shots_map'][String(cur.date)];
      if (rEntry && rEntry.photo) customTmplImg = rEntry.photo;
    }
    if (!customTmplImg && window.__memoryStore && window.__memoryStore['okbm_custom_templates_map']) {
      customTmplImg = window.__memoryStore['okbm_custom_templates_map'][String(cur.id)] || window.__memoryStore['okbm_custom_templates_map'][String(cur.date)];
    }

    var usesPhotoTmpl = (typeof window.recordUsesPhotoTemplate === 'function') && window.recordUsesPhotoTemplate(cur);
    var frontContentHtml = '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);

    if (usesPhotoTmpl && typeof window.generateReadyShotMarkup === 'function') {
      frontContentHtml = window.generateReadyShotMarkup(cur, { photo: customTmplImg || '' });
    } else if (genFn) {
      frontContentHtml = genFn(tmplId, cur, items, cur.spot, cur.memo || shortCardMemo, rawPhoto);
    } else {
      frontContentHtml = `
        <div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">
              <span style="font-family:'Space Grotesk', sans-serif; font-size:0.72rem; font-weight:900;">ROMANTIC PACK</span>
              <div style="display:flex; align-items:center; gap:4px;">
                ${statusBadgeHtml}
                <span style="font-size:0.5rem; background:#0284c7; color:#fff; font-weight:900; padding:1.5px 4px; border-radius:3px;">#0${index+1}</span>
              </div>
            </div>
            <div style="margin-top:5px; font-size:0.88rem; font-weight:900; display:flex; align-items:center; gap:3px;">
              ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(cur.spot)} (${escapeHtml(cur.elevation)})</span>
            </div>
            <div style="font-size:0.56rem; color:#64748b; font-family:'JetBrains Mono', monospace; margin-top:2px;">${cur.date} · 배낭 ${items.length}개 장비</div>
            <div style="margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:4px; font-size:0.58rem; display:flex; flex-direction:column; gap:2px; max-height:125px; overflow:hidden;">
              ${items.slice(0, 6).map(function(it) {
                return '<div style="display:flex; justify-content:space-between;"><span>• ' + escapeHtml(it.name) + '</span><span>' + ((it.weight||0)/1000).toFixed(2) + 'kg</span></div>';
              }).join('')}
            </div>
          </div>
          <div>
            <div style="border-top:1.5px dashed #000; padding-top:3px; display:flex; justify-content:space-between; align-items:baseline;">
              <span style="font-size:0.6rem; font-weight:900; color:#64748b;">TOTAL WEIGHT</span>
              <span style="font-size:1.25rem; font-weight:900; color:#000; font-family:'Space Grotesk', sans-serif;">${cur.weightKg} KG</span>
            </div>
          </div>
        </div>
      `;
    }

    var isFlipped = !!window.isPostcardFlipped;

    var backTemplateContentHtml = '';
    if (!usesPhotoTmpl && typeof window.generateReadyShotMarkup === 'function' && customTmplImg) {
      backTemplateContentHtml = window.generateReadyShotMarkup(cur, { photo: customTmplImg });
    } else if (!usesPhotoTmpl && customTmplImg && String(customTmplImg).trim().length > 10) {
      backTemplateContentHtml = `<div style="position:absolute; inset:0; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <img src="${escapeHtml(okbmSafeImageUrl(customTmplImg))}" style="width:100%; height:100%; object-fit:contain; display:block; pointer-events:none;" />
      </div>`;
    } else {
      backTemplateContentHtml = hasValidPhoto
        ? `<img src="${escapeHtml(okbmSafeImageUrl(rawPhoto))}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.88);" />
           <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%);"></div>`
      : `<div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:20px; box-sizing:border-box; text-align:center;">
            <div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px dashed rgba(56,189,248,0.4); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:22px; height:22px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div style="font-size:0.80rem; font-weight:900; color:#e2e8f0;">등록된 현장 사진이 없습니다.</div>
            <div style="font-size:0.60rem; color:#94a3b8; line-height:1.4;">하단 [···] 메뉴에서<br>현장 사진을 추가해보세요!</div>
          </div>`;
    }

    return `
      <div id="swipePostcardTarget" class="postcard-3d-wrapper ${isFlipped ? 'flipped' : ''}" style="width:100%; max-width:280px; aspect-ratio:3/4; position:relative; cursor:pointer; touch-action:pan-y; overscroll-behavior:contain; -webkit-touch-callout:none; -webkit-user-select:none; user-select:none; padding:0; border-radius:15px; background:#000000; box-shadow:0 8px 24px rgba(0,0,0,0.85); box-sizing:border-box;">
        <div class="postcard-face-front" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; overflow:hidden; border-radius:13px; background:#0b0f19;">
          ${frontContentHtml}
        </div>
        <div class="postcard-face-back" style="inset:2px !important; width:calc(100% - 4px) !important; height:calc(100% - 4px) !important; background:#000; border-radius:13px; overflow:hidden; position:relative;">
          ${backTemplateContentHtml}
          <div style="position:relative; z-index:2; width:100%; height:100%; display:flex; flex-direction:column; justify-content:space-between; padding:12px 14px; box-sizing:border-box;">
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:4px; font-size:0.95rem; font-weight:900; color:#ffffff; text-shadow:0 1px 4px rgba(0,0,0,0.95);">
                  ${HISTORY_VEC_ICONS.pin} <span>${escapeHtml(cur.spot)}</span>
                </div>
                ${statusBadgeHtml}
              </div>
            </div>
          <div style="display:flex; justify-content:space-between; align-items:flex-end;">
              <button data-record-id="${escapeHtml(String(cur.id))}" onclick="event.stopPropagation(); window.openRichAfterTripModal(window.okbmFindFeedRecord(this.dataset.recordId));" style="background:linear-gradient(135deg, #0d9488, #059669); border:1px solid #14b8a6; color:#fff; border-radius:6px; font-size:0.75rem; font-weight:900; padding:4px 10px; cursor:pointer; box-shadow:0 2px 8px rgba(13,148,136,0.4); touch-action:manipulation; min-height:36px;">
                ✍️ 일지 & 현장사진 남기기
              </button>
              <button data-record-id="${escapeHtml(String(cur.id))}" onclick="window.openTripActionMenu(this.dataset.recordId, event)" style="background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.25); color:#cbd5e1; border-radius:6px; font-size:0.75rem; font-weight:900; padding:4px 8px; cursor:pointer; touch-action:manipulation; min-height:36px; min-width:36px;">···</button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // 📱 [지난 피드 목록 모달 & 다중 체크 일괄 삭제 통합 엔진 - 낭만일지 3단 필터 & 영수증 뱃지 완전 제거]
 window.__modalHistoryStack = window.__modalHistoryStack || [];

  window.recordModalHistoryStep = function(currentModalId, restoreFn) {
    if (!currentModalId) return;
    if (window.__modalHistoryStack.length > 0) {
      var last = window.__modalHistoryStack[window.__modalHistoryStack.length - 1];
      if (last.id === currentModalId) return;
    }
    window.__modalHistoryStack.push({
      id: currentModalId,
      restore: restoreFn
    });
  };

  window.goBackModal = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var currentTopModal = null;
    var openModalSelectors = [
      'feedCustomShareModal',
      'modalRichAfterTrip',
      'tripActionActionSheet',
      'singleTripFeedModal',
      'userFeedCollectionModal',
      'pastTripsListModal',
      'followedRoutersModal',
      'savedFeedsListModal',
      'savedFeedsEmptyModal',
      'userAccountSettingsModal'
    ];

    for (var i = 0; i < openModalSelectors.length; i++) {
      var el = document.getElementById(openModalSelectors[i]);
      if (el && el.style.display !== 'none') {
        currentTopModal = el;
        break;
      }
    }

    if (currentTopModal) {
      currentTopModal.remove();
    }

    if (window.__modalHistoryStack.length > 0) {
      var prevStep = window.__modalHistoryStack.pop();
      if (prevStep && typeof prevStep.restore === 'function') {
        prevStep.restore();
        return;
      }
    }

    var reportModal = document.getElementById('userProfileModalOverlay');
    if (reportModal && reportModal.style.display !== 'none') {
      return;
    }

    var historyModal = document.getElementById('romanticHistoryModal');
    if (historyModal && historyModal.style.display !== 'none') {
      if (typeof window.ensureMasterBottomDock === 'function') {
        window.ensureMasterBottomDock('history');
      }
    }
  };

  window.__isPastTripsSelectMode = false;
  window.__selectedPastTripIds = new Set();
  window.__pastTripsActiveTab = window.__pastTripsActiveTab || 'route';

  window.switchPastTripsTab = function(targetTab) {
    window.__pastTripsActiveTab = targetTab;
    triggerHaptic(10);
    window.openPastTripsListModal();
  };

  window.togglePastTripsPublishFilter = function(targetFilter) {
    window.switchPastTripsTab(targetFilter === 'private' ? 'private' : 'route');
  };

  window.togglePastTripsSelectMode = function() {
    window.__isPastTripsSelectMode = !window.__isPastTripsSelectMode;
    window.__selectedPastTripIds.clear();
    triggerHaptic(12);
    window.openPastTripsListModal();
  };

  window.togglePastTripItemSelection = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var sId = String(recordId).trim();
    if (window.__selectedPastTripIds.has(sId)) {
      window.__selectedPastTripIds.delete(sId);
      triggerHaptic(8);
    } else {
      window.__selectedPastTripIds.add(sId);
      triggerHaptic(12);
    }
    window.updatePastTripsSelectionUI();
  };

  window.toggleAllPastTripsSelection = function() {
    var logs = (window.interactiveHistory || []).filter(Boolean);
    if (window.__selectedPastTripIds.size === logs.length) {
      window.__selectedPastTripIds.clear();
      triggerHaptic(8);
    } else {
      logs.forEach(function(r) {
        if (r && r.id) window.__selectedPastTripIds.add(String(r.id).trim());
      });
      triggerHaptic(12);
    }
    window.updatePastTripsSelectionUI();
  };

  window.updatePastTripsSelectionUI = function() {
    var logs = (window.interactiveHistory || []).filter(Boolean);
    var selectedCount = window.__selectedPastTripIds.size;

    var headerCountEl = document.getElementById('pastTripsSelectedCountText');
    if (headerCountEl) {
      headerCountEl.innerText = selectedCount > 0 ? (selectedCount + '개 선택됨') : '선택 없음';
    }

    var selectAllBtn = document.getElementById('btnPastTripsSelectAll');
    if (selectAllBtn) {
      selectAllBtn.innerText = (selectedCount === logs.length && logs.length > 0) ? '전체해제' : '전체선택';
    }

    var deleteActionBar = document.getElementById('pastTripsBatchDeleteBar');
    var deleteBtnText = document.getElementById('pastTripsBatchDeleteCountText');
    if (deleteActionBar && deleteBtnText) {
      if (selectedCount > 0) {
        deleteActionBar.style.display = 'flex';
        deleteBtnText.innerText = '선택한 ' + selectedCount + '개 기록 영구 삭제 🗑️';
      } else {
        deleteActionBar.style.display = 'none';
      }
    }

    logs.forEach(function(r) {
      var sId = String(r.id).trim();
      var cardEl = document.getElementById('pastTripRowCard_' + sId);
      var checkboxEl = document.getElementById('pastTripCheckbox_' + sId);
      var isChecked = window.__selectedPastTripIds.has(sId);

      if (cardEl) {
        cardEl.style.borderColor = isChecked ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
        cardEl.style.background = isChecked ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)';
      }
      if (checkboxEl) {
        checkboxEl.style.background = isChecked ? '#38bdf8' : 'transparent';
        checkboxEl.style.borderColor = isChecked ? '#38bdf8' : 'rgba(255, 255, 255, 0.35)';
        checkboxEl.innerHTML = isChecked ? '<span style="color:#000000; font-size:12px; font-weight:900; line-height:1;">✓</span>' : '';
      }
    });
  };

  window.okbmFeedDeletePlanWarning = '일정 및 피드에서 영구삭제됩니다. 일정삭제를 원치 않으시면 나만보기로 변경하세요.';
  window.okbmLinkedDeleteToast = '일정 및 피드에서 영구삭제됩니다';

  window.okbmConfirmFeedDeleteWithPlanWarning = async function(confirmMsg) {
    if (typeof showToast === 'function') {
      showToast(window.okbmLinkedDeleteToast, 'info', 4200, { html: HISTORY_TOAST_VEC.trash });
    }
    // confirm이 바로 뜨면 토스트가 그려지기 전에 가로막히므로 잠시 대기
    await new Promise(function(resolve) { setTimeout(resolve, 400); });
    return confirm(confirmMsg || (
      '이 기록을 영구 삭제하시겠습니까?\n\n' + window.okbmFeedDeletePlanWarning
    ));
  };

  window.okbmPurgePlansForDeletedRecords = async function(deletedRecords) {
    var resolveDateKey = function(rec) {
      if (typeof window.okbmGetRecordPlanDateKey === 'function') {
        return window.okbmGetRecordPlanDateKey(rec) || '';
      }
      if (!rec) return '';
      var y = Number(rec.year);
      var m = Number(rec.month);
      var d = Number(rec.day);
      if (y && m && d) {
        return y + '.' + String(m).padStart(2, '0') + '.' + String(d).padStart(2, '0');
      }
      var parts = String(rec.date || rec.tripDate || '').match(/\d+/g);
      if (parts && parts.length >= 3) {
        var yy = parts[0].length === 4 ? parts[0] : parts[2];
        var mm = parts[0].length === 4 ? parts[1] : parts[0];
        var dd = parts[0].length === 4 ? parts[2] : parts[1];
        return yy + '.' + String(parseInt(mm, 10)).padStart(2, '0') + '.' + String(parseInt(dd, 10)).padStart(2, '0');
      }
      return '';
    };
    var seen = {};
    var dateKeys = [];
    (deletedRecords || []).forEach(function(rec) {
      var dateKey = resolveDateKey(rec);
      if (!dateKey || seen[dateKey]) return;
      seen[dateKey] = true;
      dateKeys.push(dateKey);
    });
    for (var i = 0; i < dateKeys.length; i++) {
      if (typeof window.okbmDeletePlanDate === 'function') {
        await window.okbmDeletePlanDate(dateKeys[i], { silent: true, skipRender: true });
      } else if (typeof window.okbmPurgePlanForDate === 'function') {
        window.okbmPurgePlanForDate(dateKeys[i], { skipSync: true, skipRender: true });
      }
    }
  };

  window.executeBatchDeletePastTrips = async function() {
    var selectedCount = window.__selectedPastTripIds.size;
    if (selectedCount === 0) return;

    triggerHaptic(20);
    var confirmMsg = '선택한 ' + selectedCount + '개의 기록을 영구 삭제하시겠습니까?\n\n' +
      window.okbmFeedDeletePlanWarning;

    if (!(await window.okbmConfirmFeedDeleteWithPlanWarning(confirmMsg))) return;

    var idsToDelete = Array.from(window.__selectedPastTripIds);
    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';

    var deleteBtn = document.querySelector('#pastTripsBatchDeleteBar button');
    if (deleteBtn) {
      deleteBtn.disabled = true;
      deleteBtn.style.opacity = '0.6';
    }

    if (targetUrl && targetKey) {
      try {
        var batchHeaders = (typeof window.okbmWriteHeaders === 'function')
          ? window.okbmWriteHeaders({ Prefer: 'return=representation' })
          : null;
        if (!batchHeaders) {
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
          }
          return;
        }
        var inClause = 'in.(' + idsToDelete.map(encodeURIComponent).join(',') + ')';
        var res = await fetch(targetUrl + '/rest/v1/feeds?id=' + inClause, {
          method: 'DELETE',
          headers: batchHeaders
        });

        if (!res.ok) {
          if (typeof showToast === 'function') {
            showToast('서버 삭제 실패 (HTTP ' + res.status + ')', 'error', 2600);
          }
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
          }
          return;
        }

        var deletedRows = await res.json();
        if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
          if (typeof showToast === 'function') {
            showToast('삭제 권한이 없거나 이미 삭제된 항목입니다.', 'warn', 2600);
          }
          if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.style.opacity = '1';
          }
          return;
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('네트워크 오류로 삭제에 실패했습니다.', 'error', 2600);
        }
        if (deleteBtn) {
          deleteBtn.disabled = false;
          deleteBtn.style.opacity = '1';
        }
        return;
      }
    }

    var idSet = new Set(idsToDelete);
    var purgeFn = function(r) {
      return r && !idSet.has(String(r.id).trim());
    };

    var rawList = null;
    if (window.RomanticVault && typeof window.RomanticVault.read === 'function') {
      rawList = window.RomanticVault.read('okbm_packing_history', null);
    }
    if (!Array.isArray(rawList)) {
      rawList = window.safeGetStorage('okbm_packing_history', []) || [];
    }
    var deletedRecords = rawList.filter(function(r) {
      return r && idSet.has(String(r.id).trim());
    });
    if (deletedRecords.length < idsToDelete.length) {
      var foundIds = {};
      deletedRecords.forEach(function(r) { foundIds[String(r.id).trim()] = true; });
      [].concat(window.interactiveHistory || [], window.__allLoadedFeeds || []).forEach(function(r) {
        if (!r || !idSet.has(String(r.id).trim()) || foundIds[String(r.id).trim()]) return;
        deletedRecords.push(r);
        foundIds[String(r.id).trim()] = true;
      });
    }
    var remainingList = rawList.filter(purgeFn);

    window.interactiveHistory = remainingList.map(function(r, i) {
      return window.normalizeHistoryRecord(r, i);
    });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', remainingList);
    if (window.__memoryStore) {
      window.__memoryStore['okbm_packing_history'] = remainingList;
    }
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packing_history', remainingList, false);
    }
    try { localStorage.setItem('okbm_packing_history', JSON.stringify(remainingList)); } catch (e) {}
    await window.okbmPurgePlansForDeletedRecords(deletedRecords);
    if (typeof window.renderPlanStage === 'function' && document.getElementById('romanticPlanModal')) {
      window.renderPlanStage();
    }

    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(purgeFn);
      try {
        okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds);
      } catch (e) {}
    }

    if (Array.isArray(window.heroTopRecords)) {
      window.heroTopRecords = window.heroTopRecords.filter(purgeFn);
      window.currentHeroCardIndex = 0;
      if (typeof window.renderCurrentHeroCard === 'function') {
        window.renderCurrentHeroCard();
      }
    }

    triggerHaptic(15);
    window.__isPastTripsSelectMode = false;
    window.__selectedPastTripIds.clear();
    window.openPastTripsListModal();
    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
  };

  window.closePastTripsListModal = function() {
    window.__isPastTripsSelectMode = false;
    window.__selectedPastTripIds.clear();
    if (typeof window.unregisterModalClose === 'function') {
      window.unregisterModalClose('pastTripsListModal');
    }
    var modalEl = document.getElementById('pastTripsListModal');
    if (modalEl) modalEl.remove();
    triggerHaptic(10);
  };

  window.__renderPastTripCardRow = function(r, isSelectMode, activeTab) {
    if (!r) return '';
    var photos = getRecordPhotos(r);
    var tmplPhoto = r.customTemplatePhoto || r.readyShotPhoto || '';
    if (!tmplPhoto && window.__memoryStore) {
      if (window.__memoryStore['okbm_ready_shots_map'] && window.__memoryStore['okbm_ready_shots_map'][String(r.id)]) {
        tmplPhoto = window.__memoryStore['okbm_ready_shots_map'][String(r.id)].photo || '';
      }
      if (!tmplPhoto && window.__memoryStore['okbm_custom_templates_map']) {
        tmplPhoto = window.__memoryStore['okbm_custom_templates_map'][String(r.id)] || '';
      }
    }
    var thumbPhoto = (photos && photos.length > 0 && photos[0]) ? photos[0] : (tmplPhoto || 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80');
    var safeId = escapeHtml(String(r.id || ''));
    var spotTitle = escapeHtml(r.spot || '방문 스팟');
    var elevText = escapeHtml(r.elevation || '');
    var dateText = escapeHtml(r.date || '');
    var weightStr = escapeHtml(String(r.weightKg || '0.00'));
    var isChecked = window.__selectedPastTripIds ? window.__selectedPastTripIds.has(String(r.id).trim()) : false;

    return '<div id="pastTripRowCard_' + safeId + '" class="js-past-trip-row" data-record-id="' + safeId + '" data-tab="' + escapeHtml(String(activeTab || '')) + '" style="background:' + (isChecked ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)') + '; border:1px solid ' + (isChecked ? '#38bdf8' : 'rgba(255,255,255,0.12)') + '; border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.15s ease; flex-shrink:0; user-select:none;">' +
      '<div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">' +
        (isSelectMode ? (
          '<div id="pastTripCheckbox_' + safeId + '" style="width:22px; height:22px; border-radius:6px; border:1.8px solid ' + (isChecked ? '#38bdf8' : 'rgba(255,255,255,0.35)') + '; background:' + (isChecked ? '#38bdf8' : 'transparent') + '; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.15s ease;">' +
            (isChecked ? '<span style="color:#000000; font-size:12px; font-weight:900; line-height:1;">✓</span>' : '') +
          '</div>'
        ) : '') +
        '<div style="width:44px; height:44px; border-radius:8px; overflow:hidden; background:#1e293b; flex-shrink:0; border:1px solid rgba(255,255,255,0.1);">' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(thumbPhoto)) + '" style="width:100%; height:100%; object-fit:cover;" />' +
        '</div>' +
        '<div style="min-width:0; flex:1;">' +
          '<div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
            (activeTab === 'private' ? '<span style="font-size:0.52rem; padding:1px 4px; border-radius:3px; font-weight:900; background:rgba(251,191,36,0.18); color:#fbbf24;">나만보기</span>' : '') +
            HISTORY_VEC_ICONS.pin + ' <span>' + spotTitle + '</span>' +
          '</div>' +
          '<div style="font-size:0.62rem; color:#94a3b8; margin-top:2px;">' + dateText + (elevText ? ' · ' + elevText : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right; flex-shrink:0; margin-left:8px;">' +
        '<span style="font-size:0.86rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightStr + 'kg</span>' +
      '</div>' +
    '</div>';
  };

  window.__pastTripsPagingState = {
    offset: 0,
    limit: 10,
    hasMore: true,
    isLoading: false
  };

  window.__handlePastTripsScroll = async function(container) {
    if (!container) return;
    var state = window.__pastTripsPagingState;
    if (!state || state.isLoading || !state.hasMore) return;

    var distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceToBottom > 120) return;

    state.isLoading = true;
    var profile = safeGetJSON('user_profile', null);
    var currentUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    var activeTab = window.__pastTripsActiveTab || 'route';
    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';

    if (!targetUrl || !targetKey || !currentUserId) {
      state.isLoading = false;
      state.hasMore = false;
      return;
    }

    try {
      var query = targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(currentUserId) + '&order=date.desc,created_at.desc&offset=' + state.offset + '&limit=' + state.limit;
      if (activeTab === 'private') {
        query += '&is_published=eq.false';
      }

      var res = await fetch(query, {
        headers: {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        state.isLoading = false;
        return;
      }

      var fetchedRows = await res.json();
      if (!Array.isArray(fetchedRows) || fetchedRows.length === 0) {
        state.hasMore = false;
        state.isLoading = false;
        return;
      }

      var existingIdSet = new Set((window.__currentScopedPastTripLogs || []).map(function(item) {
        return String(item.id).trim();
      }));

      var newLogs = [];
      fetchedRows.forEach(function(row, idx) {
        var rowId = String(row.id || '').trim();
        if (!existingIdSet.has(rowId)) {
          var norm = window.normalizeHistoryRecord(row, state.offset + idx);
          norm._isLocalOwner = true;
          newLogs.push(norm);
          existingIdSet.add(rowId);
        }
      });

      state.offset += fetchedRows.length;
      if (fetchedRows.length < state.limit) {
        state.hasMore = false;
      }

      if (newLogs.length > 0) {
        window.__currentScopedPastTripLogs = (window.__currentScopedPastTripLogs || []).concat(newLogs);
        var isSelectMode = Boolean(window.__isPastTripsSelectMode);
        var appendedCardsHtml = newLogs.map(function(r) {
          return window.__renderPastTripCardRow(r, isSelectMode, activeTab);
        }).join('');
        container.insertAdjacentHTML('beforeend', appendedCardsHtml);
      }
    } catch (fetchErr) {
      console.warn('[romantic-history.js:__handlePastTripsScroll]', fetchErr);
    } finally {
      state.isLoading = false;
    }
  };

  window.openPastTripsListModal = async function(isRestored) {
    try {
      if (typeof window.okbmReconcileLocalFeedsWithServer === 'function') {
        try { await window.okbmReconcileLocalFeedsWithServer(); } catch (reconErr) {
          console.warn('[romantic-history.js:openPastTripsListModal reconcile]', reconErr);
        }
      }

      var activeReport = document.getElementById('userProfileModalOverlay');
      if (!isRestored && activeReport && activeReport.style.display !== 'none') {
        window.recordModalHistoryStep('userProfileModalOverlay', function() {
          if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
        });
      }

      var old = document.getElementById('pastTripsListModal');
      if (old) old.remove();

      var clearModal = document.getElementById('singleTripFeedModal');
      if (clearModal) clearModal.remove();

      var reportModal = document.getElementById('myReportModal');
      if (reportModal) reportModal.remove();

      var profile = safeGetJSON('user_profile', null);
      var currentUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');

      var sourceFeeds = Array.isArray(window.packingHistoryList) && window.packingHistoryList.length > 0
        ? window.packingHistoryList
        : (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0
          ? window.interactiveHistory
          : (Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : []));

      var logs = sourceFeeds.filter(function(r) {
        if (!r) return false;
        var rUserId = String(r.user_id || r.userId || '').trim();
        if (!currentUserId || !rUserId) return false;
        if (typeof window.okbmSameAccountId === 'function') {
          return window.okbmSameAccountId(currentUserId, rUserId);
        }
        return currentUserId === rUserId;
      }).map(function(r, i) {
        var norm = window.normalizeHistoryRecord(r, i);
        norm._isLocalOwner = true;
        return norm;
      });

      var activeTab = window.__pastTripsActiveTab || 'route';
      if (activeTab === 'private') {
        logs = logs.filter(function(r) { return r && r.isPublished !== true; });
      }
      window.__currentScopedPastTripLogs = logs.slice();

      window.__pastTripsPagingState = {
        offset: logs.length,
        limit: 10,
        hasMore: true,
        isLoading: false
      };

      var isSelectMode = Boolean(window.__isPastTripsSelectMode);

      var modalEl = document.createElement('div');
      modalEl.id = 'pastTripsListModal';
      modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); width:100%; max-width:100%; background:#000000; z-index:2147483642 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

      if (typeof window.ensureMasterBottomDock === 'function') {
        window.ensureMasterBottomDock('history');
      }

      var cardsHtml = '';
      if (logs.length === 0) {
        cardsHtml = '<div style="text-align:center; padding:50px 10px; color:#94a3b8; font-size:0.78rem;">기록이 없습니다.</div>';
      } else {
        cardsHtml = logs.map(function(r) {
          return window.__renderPastTripCardRow(r, isSelectMode, activeTab);
        }).join('');
      }

      var headerRightHtml = isSelectMode ? (
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span id="pastTripsSelectedCountText" style="font-size:0.65rem; color:#38bdf8; font-weight:800;">선택 없음</span>' +
          '<button type="button" id="btnPastTripsSelectAll" onclick="window.toggleAllPastTripsSelection()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:800; cursor:pointer;">전체선택</button>' +
          '<button type="button" onclick="window.togglePastTripsSelectMode()" style="background:#38bdf8; border:none; color:#000; padding:4px 9px; border-radius:6px; font-size:0.68rem; font-weight:900; cursor:pointer;">완료</button>' +
        '</div>'
      ) : (
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<span id="pastTripsTotalCountBadge" style="font-size:0.65rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3);">총 ' + logs.length + '개</span>' +
          '<button type="button" onclick="window.togglePastTripsSelectMode()" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e2e8f0; padding:4px 9px; border-radius:6px; font-size:0.70rem; font-weight:800; cursor:pointer;">선택</button>' +
        '</div>'
      );

      var isRouteTabActive = (activeTab === 'route');
      var isPrivateTabActive = (activeTab === 'private');

      modalEl.innerHTML = `
        <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" onclick="window.closePastTripsListModal(); window.goBackModal(event);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">낭만일지</span>
          </div>
          ${headerRightHtml}
        </div>

        <div style="flex-shrink:0; padding:8px 14px; background:#000000; display:flex; gap:6px; border-bottom:1px solid rgba(255,255,255,0.06);">
          <button type="button" onclick="window.switchPastTripsTab('route');" style="flex:1; height:32px; border-radius:8px; font-size:0.74rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all 0.15s ease; background:${isRouteTabActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isRouteTabActive ? '#38bdf8' : 'rgba(255,255,255,0.12)'}; color:${isRouteTabActive ? '#38bdf8' : '#94a3b8'};">
            <span>낭만루트</span>
          </button>
          <button type="button" onclick="window.switchPastTripsTab('private');" style="flex:1; height:32px; border-radius:8px; font-size:0.74rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all 0.15s ease; background:${isPrivateTabActive ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isPrivateTabActive ? '#fbbf24' : 'rgba(255,255,255,0.12)'}; color:${isPrivateTabActive ? '#fbbf24' : '#94a3b8'};">
            <span>나만보기</span>
          </button>
        </div>

        <div id="pastTripsScrollContainer" onscroll="window.__handlePastTripsScroll(this);" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 0px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
          ${cardsHtml}
        </div>

        <div id="pastTripsBatchDeleteBar" style="display:none; position:fixed; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); left:0; right:0; max-width:440px; margin:0 auto; padding:10px 14px; background:#0c1017; border-top:1.5px solid #f43f5e; box-sizing:border-box; z-index:1000004;">
          <button type="button" onclick="window.executeBatchDeletePastTrips();" style="width:100%; height:44px; background:linear-gradient(135deg, #f43f5e, #be123c); border:none; border-radius:10px; color:#fff; font-size:0.84rem; font-weight:900; cursor:pointer; box-shadow:0 4px 14px rgba(244,63,94,0.4); display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#ffffff; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span id="pastTripsBatchDeleteCountText">선택한 기록 영구 삭제</span>
          </button>
        </div>
      `;

      document.body.appendChild(modalEl);
      if (typeof window.okbmLiftReportChildModal === 'function') window.okbmLiftReportChildModal(modalEl);
      triggerHaptic(12);

      var targetUrl = window.SUPABASE_URL || '';
      var targetKey = window.SUPABASE_ANON_KEY || '';
      if (targetUrl && targetKey && currentUserId) {
        var countQuery = targetUrl + '/rest/v1/feeds?user_id=eq.' + encodeURIComponent(currentUserId) + '&select=id';
        if (activeTab === 'private') {
          countQuery += '&is_published=eq.false';
        }
        fetch(countQuery, {
          method: 'HEAD',
          headers: {
            'apikey': targetKey,
            'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
            'Prefer': 'count=exact'
          }
        }).then(function(res) {
          var cr = res.headers.get('content-range');
          if (cr && cr.includes('/')) {
            var totalCountStr = cr.split('/')[1];
            var parsedTotal = parseInt(totalCountStr, 10);
            if (!isNaN(parsedTotal)) {
              var countBadge = document.getElementById('pastTripsTotalCountBadge');
              if (countBadge) {
                countBadge.innerText = '총 ' + parsedTotal + '개';
              }
            }
          }
        }).catch(function() {});
      }
    } catch (err) {
      console.error('[OpenPastTripsListModal Error]', err);
    }
  };

window.okbmGetNormalizedUserId = function(rawId) {
  var uId = String(rawId || '').trim();
  if (!uId && typeof window.okbmGetCurrentUserId === 'function') {
    uId = String(window.okbmGetCurrentUserId() || '').trim();
  }
  if (!uId) {
    var profile = safeGetJSON('user_profile', null);
    if (profile) {
      uId = String(profile.id || profile.userId || profile.user_id || '').trim();
    }
  }
  uId = String(uId || '').trim();
  if (!uId || uId === 'guest' || uId === 'null' || uId === 'undefined') return '';
  if (typeof window.okbmCanonicalUserId === 'function') return window.okbmCanonicalUserId(uId);
  if (/^(kakao_|naver_|apple_|google_|user_|guest_)/.test(uId)) return uId;
  return 'kakao_' + uId;
};

window.okbmCheckUserLoginStatus = function() {
  if (typeof isUserLoggedIn === 'function') {
    try {
      if (isUserLoggedIn()) return true;
    } catch (e) {}
  }
  var id = window.okbmGetNormalizedUserId();
  if (id && id !== 'guest') return true;
  var token = localStorage.getItem('user_auth_token') || localStorage.getItem('kakao_access_token') || localStorage.getItem('access_token');
  return Boolean(token && token.trim().length > 0);
};

window.okbmGetUserStarsKey = function(userId) {
  var resolvedId = window.okbmGetNormalizedUserId(userId);
  return resolvedId ? ('okbm_feed_stars_map_' + resolvedId) : 'okbm_feed_stars_map';
};

window.fetchUserFeedLikesFromServer = async function() {
  var canonicalId = window.okbmGetNormalizedUserId();
  if (!canonicalId) return {};

  var pureNumId = canonicalId.replace(/^kakao_/, '').trim();
  var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
  var targetKey = window.SUPABASE_ANON_KEY || '';

  try {
    var rows = null;
    var queryIds = [canonicalId];
    if (pureNumId && pureNumId !== canonicalId) {
      queryIds.push(pureNumId);
    }

    if (window.supabaseClient) {
      var sbRes = await window.supabaseClient.from('feed_likes').select('feed_id').in('user_id', queryIds);
      if (sbRes.data && Array.isArray(sbRes.data)) {
        rows = sbRes.data;
      }
    }
    if (!rows) {
      var inParam = 'in.(' + queryIds.map(encodeURIComponent).join(',') + ')';
      var res = await fetch(targetUrl + '/rest/v1/feed_likes?user_id=' + inParam + '&select=feed_id', {
        headers: {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        rows = await res.json();
      }
    }
    if (!Array.isArray(rows)) return {};
    var starsMap = {};
    rows.forEach(function(row) {
      if (row && row.feed_id) {
        var cleanId = String(row.feed_id).replace(/^["']|["']$/g, '').trim();
        if (cleanId) starsMap[cleanId] = true;
      }
    });

    var userKey = window.okbmGetUserStarsKey(canonicalId);
    localStorage.setItem(userKey, JSON.stringify(starsMap));

    document.querySelectorAll('[data-star-card-id]').forEach(function(btn) {
      var sId = String(btn.getAttribute('data-star-card-id') || '').trim();
      var icon = btn.querySelector('svg');
      if (!icon || !sId) return;
      var isStarred = Boolean(starsMap[sId]);
      icon.setAttribute('fill', isStarred ? '#fde047' : 'none');
      icon.setAttribute('stroke', isStarred ? '#fde047' : '#ffffff');
      icon.style.filter = isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none';
    });

    return starsMap;
  } catch (err) {}
  return {};
};

window.__pendingLikeRequests = window.__pendingLikeRequests || new Map();

window.okbmSyncFeedLikeAction = async function(feedId, userId, isAdding, nextCount) {
  var sId = String(feedId || '').trim();
  var canonicalId = window.okbmGetNormalizedUserId(userId);
  if (!sId || !canonicalId) {
    throw new Error('feedId and canonical userId are required');
  }

  var committedCount = Number(nextCount);
  if (isNaN(committedCount) || committedCount < 0) committedCount = isAdding ? 1 : 0;

  var pureNumId = canonicalId.replace(/^kakao_/, '').trim();
  var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
  var targetKey = window.SUPABASE_ANON_KEY || '';

  var jsonHeaders = (typeof window.okbmWriteHeaders === 'function' && window.okbmWriteHeaders()) || {
    'apikey': targetKey,
    'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
    'Content-Type': 'application/json'
  };

  var parseLikePayload = function(data) {
    var payload = data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) { payload = null; }
    }
    if (Array.isArray(payload)) payload = payload[0];
    if (!payload || typeof payload !== 'object') return null;
    var count = Number(payload.likes_count);
    if (isNaN(count) || count < 0) count = committedCount;
    var starred = payload.is_starred;
    if (typeof starred !== 'boolean') starred = !!isAdding;
    return { success: true, is_starred: starred, likes_count: count };
  };

  var syncExecution = (async function() {
    if (window.supabaseClient && typeof window.supabaseClient.rpc === 'function') {
      try {
        var rpcRes = await window.supabaseClient.rpc('apply_feed_like', {
          p_feed_id: sId,
          p_user_id: canonicalId,
          p_adding: !!isAdding
        });
        if (!rpcRes.error) {
          var parsedRpc = parseLikePayload(rpcRes.data);
          if (parsedRpc) return parsedRpc;
        } else {
          console.warn('[apply_feed_like rpc]', rpcRes.error);
        }
      } catch (rpcErr) {
        console.warn('[apply_feed_like rpc]', rpcErr);
      }
    }

    try {
      var rpcFetch = await fetch(targetUrl + '/rest/v1/rpc/apply_feed_like', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          p_feed_id: sId,
          p_user_id: canonicalId,
          p_adding: !!isAdding
        }),
        keepalive: true
      });
      if (rpcFetch.ok) {
        var rpcJson = await rpcFetch.json().catch(function() { return null; });
        var parsedFetch = parseLikePayload(rpcJson);
        if (parsedFetch) return parsedFetch;
      }
    } catch (rpcFetchErr) {
      console.warn('[apply_feed_like fetch]', rpcFetchErr);
    }

    if (isAdding) {
      if (window.supabaseClient) {
        var insertRes = await window.supabaseClient.from('feed_likes').upsert({
          feed_id: sId,
          user_id: canonicalId,
          created_at: new Date().toISOString()
        }, { onConflict: 'feed_id,user_id' });
        if (insertRes.error) throw insertRes.error;
      } else {
        var postRes = await fetch(targetUrl + '/rest/v1/feed_likes', {
          method: 'POST',
          headers: Object.assign({}, jsonHeaders, { 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ feed_id: sId, user_id: canonicalId, created_at: new Date().toISOString() }),
          keepalive: true
        });
        if (!postRes.ok && postRes.status !== 409) {
          var errText = await postRes.text().catch(function() { return ''; });
          throw new Error('feed_likes insert failed: ' + postRes.status + ' ' + errText);
        }
      }
    } else {
      var queryIds = [canonicalId];
      if (pureNumId && pureNumId !== canonicalId) {
        queryIds.push(pureNumId);
      }
      if (window.supabaseClient) {
        var delRes = await window.supabaseClient.from('feed_likes').delete().eq('feed_id', sId).in('user_id', queryIds);
        if (delRes.error) throw delRes.error;
      } else {
        var inParam = 'in.(' + queryIds.map(encodeURIComponent).join(',') + ')';
        var delFetch = await fetch(targetUrl + '/rest/v1/feed_likes?feed_id=eq.' + encodeURIComponent(sId) + '&user_id=' + inParam, {
          method: 'DELETE',
          headers: Object.assign({}, jsonHeaders, { 'Prefer': 'return=minimal' }),
          keepalive: true
        });
        if (!delFetch.ok) {
          var delErrText = await delFetch.text().catch(function() { return ''; });
          throw new Error('feed_likes delete failed: ' + delFetch.status + ' ' + delErrText);
        }
      }
    }

    try {
      if (window.supabaseClient) {
        var countRow = await window.supabaseClient.from('feeds').select('likes_count').eq('id', sId).maybeSingle();
        if (!countRow.error && countRow.data && countRow.data.likes_count != null) {
          var dbCount = Number(countRow.data.likes_count);
          if (!isNaN(dbCount) && dbCount >= 0) committedCount = dbCount;
        }
      } else {
        var countFetch = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId) + '&select=likes_count', {
          headers: jsonHeaders,
          keepalive: true
        });
        if (countFetch.ok) {
          var countRows = await countFetch.json().catch(function() { return []; });
          if (Array.isArray(countRows) && countRows[0] && countRows[0].likes_count != null) {
            var fetchedCount = Number(countRows[0].likes_count);
            if (!isNaN(fetchedCount) && fetchedCount >= 0) committedCount = fetchedCount;
          }
        }
      }
    } catch (countErr) {
      console.warn('[feeds likes_count read]', countErr);
    }

    return { success: true, is_starred: !!isAdding, likes_count: committedCount };
  })();

  window.__pendingLikeRequests.set(sId, syncExecution);
  try {
    return await syncExecution;
  } finally {
    if (window.__pendingLikeRequests.get(sId) === syncExecution) {
      window.__pendingLikeRequests.delete(sId);
    }
  }
};

window.okbmSyncFeedLikeCount = function() {};

window.__starToggleLockMap = window.__starToggleLockMap || {};

window.toggleFeedStar = async function(cardId, e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  }
  if (!cardId) return;

  var sId = String(cardId).replace(/[`'"]/g, '').trim();
  if (!sId) return;

  var isLogged = window.okbmCheckUserLoginStatus();
  var canonicalUserId = window.okbmGetNormalizedUserId();

  if (!isLogged || !canonicalUserId) {
    triggerHaptic(12);
    var toastFn = window.showToast || (typeof showToast === 'function' ? showToast : null);
    if (toastFn) {
      toastFn('로그인 후 이용할 수 있습니다.', 'info', 2200);
    }
    if (typeof window.openLoginModal === 'function') {
      window.openLoginModal();
    } else if (typeof window.handleAuthBtnClick === 'function') {
      window.handleAuthBtnClick();
    } else if (typeof openLoginModal === 'function') {
      openLoginModal();
    }
    return;
  }

  if (window.__starToggleLockMap[sId]) return;
  window.__starToggleLockMap[sId] = true;

  var targetCard = (window.interactiveHistory || []).find(function(r) {
    return r && String(r.id).replace(/[`'"]/g, '').trim() === sId;
  });
  if (!targetCard && Array.isArray(window.__allLoadedFeeds)) {
    targetCard = window.__allLoadedFeeds.find(function(r) {
      return r && String(r.id).replace(/[`'"]/g, '').trim() === sId;
    });
  }

  var directBtn = null;
  if (e && e.target && e.target.closest) {
    directBtn = e.target.closest('[data-star-card-id]');
  }
  if (!directBtn && e && e.currentTarget && e.currentTarget.hasAttribute && e.currentTarget.hasAttribute('data-star-card-id')) {
    directBtn = e.currentTarget;
  }
  if (!directBtn) {
    try {
      directBtn = document.querySelector('[data-star-card-id="' + (CSS.escape ? CSS.escape(sId) : sId) + '"]');
    } catch (selErr) {}
  }
  var cardBtn = directBtn;
  var cardSvg = cardBtn ? cardBtn.querySelector('svg') : null;
  var cardCountSpan = cardBtn ? (cardBtn.querySelector('.js-feed-star-count') || cardBtn.querySelector('[id^="feedStarCountText_"]')) : null;

  var isCurrentlyStarred = false;
  if (cardSvg) {
    var fillAttr = cardSvg.getAttribute('fill');
    isCurrentlyStarred = Boolean(fillAttr && fillAttr !== 'none' && fillAttr !== 'transparent');
  } else {
    var userKey = window.okbmGetUserStarsKey(canonicalUserId);
    var starsMap = safeGetJSON(userKey, {});
    isCurrentlyStarred = Boolean(starsMap[sId]);
  }

  var currentCount = 0;
  if (cardCountSpan && cardCountSpan.innerText) {
    var parsedDomCount = parseInt(cardCountSpan.innerText.trim(), 10);
    if (!isNaN(parsedDomCount)) currentCount = parsedDomCount;
  } else if (targetCard && (targetCard.likes_count !== undefined || targetCard.likes !== undefined)) {
    var parsedCardCount = Number(targetCard.likes_count !== undefined ? targetCard.likes_count : targetCard.likes);
    if (!isNaN(parsedCardCount)) currentCount = parsedCardCount;
  }
  if (isNaN(currentCount) || currentCount < 0) currentCount = 0;

  var nextStarred = !isCurrentlyStarred;
  var nextCount = nextStarred ? (currentCount + 1) : Math.max(0, currentCount - 1);

  if (nextStarred) {
    triggerHaptic(14);
  } else {
    triggerHaptic(8);
  }

  var updateStarDOMElements = function(idVal, starredVal, countVal) {
    var escapedId = CSS.escape ? CSS.escape(idVal) : idVal;
    try {
      document.querySelectorAll('[data-star-card-id="' + escapedId + '"]').forEach(function(btn) {
        var icon = btn.querySelector('svg');
        if (icon) {
          icon.setAttribute('fill', starredVal ? '#fde047' : 'none');
          icon.setAttribute('stroke', starredVal ? '#fde047' : '#ffffff');
          icon.style.filter = starredVal ? 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' : 'none';
        }
        var countSpanEl = btn.querySelector('.js-feed-star-count') || btn.querySelector('[id^="feedStarCountText_"]');
        if (countSpanEl) {
          countSpanEl.innerText = countVal;
        }
      });
    } catch (selErr) {}

    var legacyIcon = document.getElementById('feedStarIcon_' + idVal);
    if (legacyIcon) {
      legacyIcon.setAttribute('fill', starredVal ? '#fde047' : 'none');
      legacyIcon.setAttribute('stroke', starredVal ? '#fde047' : '#ffffff');
      legacyIcon.style.filter = starredVal ? 'drop-shadow(0 0 8px rgba(253,224,71,0.8))' : 'none';
    }

    var legacyText = document.getElementById('feedStarCountText_' + idVal);
    if (legacyText) {
      legacyText.innerText = countVal;
    }
  };

  if (directBtn) {
    var directIcon = directBtn.querySelector('svg');
    if (directIcon) {
      directIcon.style.transform = 'scale(1.25)';
      setTimeout(function() { if (directIcon) directIcon.style.transform = 'scale(1)'; }, 180);
    }
  }

  updateStarDOMElements(sId, nextStarred, nextCount);

  if (targetCard) {
    targetCard.likes = nextCount;
    targetCard.likes_count = nextCount;
  }
  if (Array.isArray(window.__allLoadedFeeds)) {
    var loadedTarget = window.__allLoadedFeeds.find(function(f) {
      return f && String(f.id).replace(/[`'"]/g, '').trim() === sId;
    });
    if (loadedTarget) {
      loadedTarget.likes = nextCount;
      loadedTarget.likes_count = nextCount;
    }
  }
  if (Array.isArray(window.heroTopRecords)) {
    var hItem = window.heroTopRecords.find(function(h) {
      return h && String(h.id).replace(/[`'"]/g, '').trim() === sId;
    });
    if (hItem) {
      hItem.likes = nextCount;
      hItem.likes_count = nextCount;
      if (typeof window.renderCurrentHeroCard === 'function') window.renderCurrentHeroCard();
    }
  }

  try {
    var serverRes = await window.okbmSyncFeedLikeAction(sId, canonicalUserId, nextStarred, nextCount);
    var finalStarred = (serverRes && typeof serverRes.is_starred === 'boolean') ? serverRes.is_starred : nextStarred;
    var finalCount = (serverRes && typeof serverRes.likes_count === 'number') ? serverRes.likes_count : nextCount;
    if (nextStarred && finalCount < nextCount) finalCount = nextCount;
    if (!nextStarred && finalCount > currentCount) finalCount = nextCount;

    var userKey = window.okbmGetUserStarsKey(canonicalUserId);
    var currentStarsMap = safeGetJSON(userKey, {});
    if (finalStarred) {
      currentStarsMap[sId] = true;
    } else {
      delete currentStarsMap[sId];
    }
    try { localStorage.setItem(userKey, JSON.stringify(currentStarsMap)); } catch (e) {}

    var currentCounts = safeGetJSON('okbm_feed_stars_counts', {});
    currentCounts[sId] = finalCount;
    try { localStorage.setItem('okbm_feed_stars_counts', JSON.stringify(currentCounts)); } catch (e) {}

    if (finalStarred !== nextStarred || finalCount !== nextCount) {
      updateStarDOMElements(sId, finalStarred, finalCount);
      if (targetCard) {
        targetCard.likes = finalCount;
        targetCard.likes_count = finalCount;
      }
      if (Array.isArray(window.__allLoadedFeeds)) {
        var lTarget = window.__allLoadedFeeds.find(function(f) {
          return f && String(f.id).replace(/[`'"]/g, '').trim() === sId;
        });
        if (lTarget) {
          lTarget.likes = finalCount;
          lTarget.likes_count = finalCount;
        }
      }
      if (Array.isArray(window.heroTopRecords)) {
        var hTarget = window.heroTopRecords.find(function(h) {
          return h && String(h.id).replace(/[`'"]/g, '').trim() === sId;
        });
        if (hTarget) {
          hTarget.likes = finalCount;
          hTarget.likes_count = finalCount;
          if (typeof window.renderCurrentHeroCard === 'function') window.renderCurrentHeroCard();
        }
      }
    }

    if (Array.isArray(window.__allLoadedFeeds)) {
      try {
        okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds);
      } catch (cacheErr) {}
    }
  } catch (syncErr) {
    console.error('[toggleFeedStar Rollback]', syncErr);
    updateStarDOMElements(sId, isCurrentlyStarred, currentCount);
    if (targetCard) {
      targetCard.likes = currentCount;
      targetCard.likes_count = currentCount;
    }
    if (Array.isArray(window.__allLoadedFeeds)) {
      var rbTarget = window.__allLoadedFeeds.find(function(f) {
        return f && String(f.id).replace(/[`'"]/g, '').trim() === sId;
      });
      if (rbTarget) {
        rbTarget.likes = currentCount;
        rbTarget.likes_count = currentCount;
      }
    }
    if (Array.isArray(window.heroTopRecords)) {
      var rbHero = window.heroTopRecords.find(function(h) {
        return h && String(h.id).replace(/[`'"]/g, '').trim() === sId;
      });
      if (rbHero) {
        rbHero.likes = currentCount;
        rbHero.likes_count = currentCount;
        if (typeof window.renderCurrentHeroCard === 'function') window.renderCurrentHeroCard();
      }
    }
    var toastWarn = window.showToast || (typeof showToast === 'function' ? showToast : null);
    if (toastWarn) {
      toastWarn('좋아요 반영에 실패했습니다. 다시 시도해주세요.', 'warn');
    }
  } finally {
    setTimeout(function() {
      delete window.__starToggleLockMap[sId];
    }, 250);
  }
};


// 🔗 [2. 스마트 멀티 공유 모달 엔진 - 3채널 동일 페이로드]
  window.OKBM_PUBLIC_SHARE_BASE = 'https://oklionature.github.io/okbm/';

  window.okbmBuildFeedSharePayload = function(recordId, spotName, memoText) {
    var rec = (typeof window.okbmFindFeedRecord === 'function') ? window.okbmFindFeedRecord(recordId) : null;
    var cleanId = String((rec && rec.id) || recordId || '').trim();
    var rawSpot = String((rec && rec.spot) || spotName || '자연 속 힐링 기록');
    var cleanSpot = rawSpot.split('(')[0].trim() || rawSpot.trim();
    var memo = '';
    if (rec) {
      if (Array.isArray(rec.photoMemos) && rec.photoMemos[0]) memo = String(rec.photoMemos[0]).trim();
      if (!memo) memo = String(rec.memo || rec.oneLineMemo || '').trim();
    }
    if (!memo) memo = String(memoText || '').trim();
    var desc = memo
      ? memo.replace(/\s+/g, ' ').trim()
      : '배낭을 메고 자연으로 떠난 낭만 기록을 확인해보세요.';
    if (desc.length > 80) desc = desc.slice(0, 79) + '…';

    var url = window.OKBM_PUBLIC_SHARE_BASE + 'index.html?feed=' + encodeURIComponent(cleanId);
    var photos = (rec && typeof getRecordPhotos === 'function') ? getRecordPhotos(rec) : [];
    var image = '';
    for (var i = 0; i < photos.length; i++) {
      var pUrl = String(photos[i] || '').trim();
      if (pUrl.indexOf('https://') === 0 && pUrl.indexOf('unsplash.com') < 0) {
        image = pUrl;
        break;
      }
    }
    if (!image) image = window.OKBM_PUBLIC_SHARE_BASE + 'fulllogoblk.png?v=20260919_v3';

    var title = '[낭만루트] ' + cleanSpot;
    var body = title + '\n' + desc + '\n\n앱에서 보기\n' + url;
    return {
      id: cleanId,
      spot: cleanSpot,
      title: title,
      description: desc,
      url: url,
      image: image,
      body: body
    };
  };

  window.shareCurrentFeed = function(recordId, spotName, memoText) {
    triggerHaptic(10);
    var payload = window.okbmBuildFeedSharePayload(recordId, spotName, memoText);
    window.__okbmLastFeedShare = payload;
    var safeId = escapeHtml(payload.id);
    var safeSpot = escapeHtml(payload.spot);

    var old = document.getElementById('feedCustomShareModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'feedCustomShareModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; background:rgba(0,0,0,0.75); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:2147483646 !important; display:flex; justify-content:center; align-items:flex-end; box-sizing:border-box;';
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div style="width:100%; max-width:440px; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.35); border-radius:20px 20px 0 0; padding:18px 16px 16px 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 -15px 40px rgba(0,0,0,0.85);" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <div style="display:flex; flex-direction:column;">
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">피드 공유하기</span>
            <span style="font-size:0.68rem; color:#38bdf8; font-weight:800; margin-top:2px;">[${safeSpot}]</span>
          </div>
          <button type="button" onclick="document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:10px 0 6px 0;">
          <button type="button" data-record-id="${safeId}" onclick="window.sendFeedToKakaoTalk(this.dataset.recordId); document.getElementById('feedCustomShareModal') && document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:#fee500; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(254,229,0,0.25);">
              <svg viewBox="0 0 24 24" style="width:26px; height:26px; fill:#191919;"><path d="M12 3c-5.52 0-10 3.48-10 7.78 0 2.76 1.84 5.18 4.62 6.55l-1.18 4.34c-.11.4.34.73.69.5l5.06-3.34c.27.03.54.04.81.04 5.52 0 10-3.48 10-7.78 0-4.3-4.48-7.78-10-7.78z"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">카카오톡</span>
          </button>

          <button type="button" data-record-id="${safeId}" onclick="window.sendFeedToInstagram(this.dataset.recordId); document.getElementById('feedCustomShareModal') && document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(220,39,67,0.3);">
              <svg viewBox="0 0 24 24" style="width:24px; height:24px; fill:#ffffff;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">인스타그램</span>
          </button>

          <button type="button" data-record-id="${safeId}" onclick="window.copyFeedShareLink(this.dataset.recordId); document.getElementById('feedCustomShareModal') && document.getElementById('feedCustomShareModal').remove();" style="background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; padding:6px 0;">
            <div style="width:52px; height:52px; border-radius:16px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.4);">
              <svg viewBox="0 0 24 24" style="width:22px; height:22px; stroke:#38bdf8; fill:none; stroke-width:2.2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <span style="font-size:0.72rem; font-weight:800; color:#e2e8f0;">링크 복사</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock();
    }
    var dock = document.getElementById('romanticMasterBottomDock');
    if (dock) {
      dock.style.setProperty('z-index', '2147483647', 'important');
      if (dock.parentElement === document.body) document.body.appendChild(dock);
    }
  };

  window.copyShareLinkFallback = function(text, toastMsg, toastOpts) {
    if (!text) return;
    triggerHaptic(12);
    var msg = toastMsg || '✓ 피드 링크가 복사되었습니다!';

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function() {
        if (typeof showToast === 'function') showToast(msg, 'success', 2200, toastOpts);
      }).catch(function() {
        fallbackExecCopy(text, msg, toastOpts);
      });
    } else {
      fallbackExecCopy(text, msg, toastOpts);
    }
  };

  function fallbackExecCopy(text, toastMsg, toastOpts) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (typeof showToast === 'function') showToast(toastMsg || '✓ 피드 링크가 복사되었습니다!', 'success', 2200, toastOpts);
    } catch (err) { console.warn('[romantic-history.js:fallbackExecCopy]', err); }
    document.body.removeChild(ta);
  }

  window.okbmResolveFeedSharePayload = function(recordId) {
    var last = window.__okbmLastFeedShare;
    if (last && String(last.id || '') === String(recordId || '')) return last;
    return window.okbmBuildFeedSharePayload(recordId);
  };

  window.copyFeedShareLink = function(recordId) {
    var p = window.okbmResolveFeedSharePayload(recordId);
    window.copyShareLinkFallback(p.body, '✓ 같은 공유 내용이 복사되었습니다!');
  };

  window.sendFeedToKakaoTalk = function(recordId) {
    triggerHaptic(12);
    var p = window.okbmResolveFeedSharePayload(recordId);
    var sendKakao = function() {
      if (typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized()) {
        try {
          var shareFn = (Kakao.Share && Kakao.Share.sendDefault) ? Kakao.Share.sendDefault : (Kakao.Link && Kakao.Link.sendDefault ? Kakao.Link.sendDefault : null);
          if (shareFn) {
            shareFn({
              objectType: 'feed',
              content: {
                title: p.title,
                description: p.description,
                imageUrl: p.image,
                imageWidth: 800,
                imageHeight: 800,
                link: { mobileWebUrl: p.url, webUrl: p.url }
              },
              buttons: [
                { title: '앱에서 보기', link: { mobileWebUrl: p.url, webUrl: p.url } }
              ],
              installTalk: true
            });
            return true;
          }
        } catch (e) { console.warn('[romantic-history.js:sendFeedToKakaoTalk]', e); }
      }
      return false;
    };
    var fallback = function() {
      window.copyShareLinkFallback(p.body, '✓ 같은 공유 내용이 복사되었습니다!');
    };
    if (typeof window.okbmEnsureKakaoSdk === 'function') {
      window.okbmEnsureKakaoSdk().then(function() {
        if (!sendKakao()) fallback();
      }).catch(fallback);
      return;
    }
    if (!sendKakao()) fallback();
  };

  window.sendFeedToInstagram = function(recordId) {
    triggerHaptic(12);
    var p = window.okbmResolveFeedSharePayload(recordId);
    window.copyShareLinkFallback(p.body, '같은 공유 내용 복사 완료. 인스타그램에 붙여넣기 하세요.', { html: HISTORY_TOAST_VEC.camera });
    setTimeout(function() {
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = 'instagram://app';
        setTimeout(function() {
          window.open('https://www.instagram.com', '_blank');
        }, 1200);
      } else {
        window.open('https://www.instagram.com', '_blank');
      }
    }, 400);
  };

  window.triggerNativeShare = function(title, desc, url) {
    triggerHaptic(10);
    var p = window.__okbmLastFeedShare;
    var shareTitle = (p && p.title) || title;
    var shareText = (p && p.description) || desc;
    var shareUrl = (p && p.url) || url;
    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      }).catch(function(err) {
        if (err && err.name !== 'AbortError') {
          window.copyShareLinkFallback((p && p.body) || shareUrl);
        }
      });
    } else {
      window.copyShareLinkFallback((p && p.body) || shareUrl);
    }
  };

 // ⚙️ [방탄 디바운스 락 & 스크롤 튕김 0% 엔진]: 공개/비공개 다중 클릭 충돌 원천 차단
  window.__publishDebounceTimers = window.__publishDebounceTimers || {};

  window.toggleFeedPublishStatus = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!recordId) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      triggerHaptic(12);
      if (typeof showToast === 'function') showToast('기록 관리는 로그인 후 이용할 수 있습니다.', 'info', 2200, { html: HISTORY_TOAST_VEC.lock });
      if (typeof openLoginModal === 'function') openLoginModal();
      return;
    }

    var sId = String(recordId).trim();
    var target = (typeof window.okbmFindFeedRecord === 'function') ? window.okbmFindFeedRecord(sId) : null;

    if (!target) {
      var rawList = (typeof window.safeGetStorage === 'function') ? (window.safeGetStorage('okbm_packing_history', []) || []) : [];
      if (window.interactiveHistory && window.interactiveHistory.length > 0) {
        rawList = window.interactiveHistory;
      }
      target = rawList.find(function(r) { return r && String(r.id).trim() === sId; });
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
      return;
    }

    if (typeof window.isRecordOwner === 'function' && !window.isRecordOwner(target) && !target._isLocalOwner) {
      triggerHaptic(12);
      if (typeof showToast === 'function') showToast('본인 기록만 공개 설정을 변경할 수 있습니다.', 'warn', 2200, { html: HISTORY_TOAST_VEC.lock });
      return;
    }

    var currentPublished = (target.isPublished !== undefined)
      ? Boolean(target.isPublished)
      : (target.is_published !== undefined ? Boolean(target.is_published) : false);
    var nextStatus = !currentPublished;

    if (nextStatus === true) {
      var canPublish = (typeof window.okbmCanPublishFeed === 'function') ? window.okbmCanPublishFeed(target) : false;
      if (!canPublish) {
        triggerHaptic(14);
        var spotName = String(target.spot || '').trim();
        var isRegistered = typeof window.isSpotRegisteredInMasterDB === 'function' &&
          window.isSpotRegisteredInMasterDB(spotName) &&
          target.unregisteredSpot !== true &&
          target.unregistered_spot !== true;
        if (!isRegistered) {
          if (typeof showToast === 'function') {
            showToast('등록된 박지만 함께보기로 전환할 수 있습니다.', 'info', 2800, { html: HISTORY_TOAST_VEC.lock });
          }
        } else if (target.date && typeof window.okbmRouteDateReached === 'function' && !window.okbmRouteDateReached(target)) {
          if (typeof showToast === 'function') {
            showToast('디데이 이후 현장 사진을 등록해야 전체 공개할 수 있습니다.', 'info', 2800);
          }
        } else if (typeof showToast === 'function') {
          showToast('현장 사진을 1장 이상 등록해야 전체 공개할 수 있습니다.', 'info', 2800);
        }
        return;
      }
    }

    if (typeof window.okbmApplyPublishFlag === 'function') {
      window.okbmApplyPublishFlag(sId, nextStatus, target);
    } else {
      target.isPublished = nextStatus;
      target.is_published = nextStatus;
    }

    var paintLockButton = function(published) {
      var lockBtn = document.querySelector('[data-lock-btn-id="' + sId + '"]');
      if (lockBtn) {
        lockBtn.style.color = published ? '#34d399' : '#38bdf8';
        lockBtn.setAttribute('title', published ? '전체 공개 중' : '비공개 (나만보기)');
        lockBtn.innerHTML = published
          ? '<svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#34d399;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>'
          : '<svg viewBox="0 0 24 24" style="width:18px; height:18px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        lockBtn.style.transform = 'scale(1.25)';
        setTimeout(function() { if (lockBtn) lockBtn.style.transform = 'scale(1)'; }, 150);
      }

      var actionSheetBtn = document.getElementById('sheetTogglePublishBtn_' + sId);
      if (actionSheetBtn) {
        actionSheetBtn.style.color = published ? '#38bdf8' : '#cbd5e1';
        actionSheetBtn.style.borderColor = published ? '#38bdf8' : 'rgba(255,255,255,0.15)';
        actionSheetBtn.style.background = published ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)';
        actionSheetBtn.innerHTML = '<div style="display:flex; align-items:center; gap:8px;"><span>' + (published ? '🌐' : '🔒') + '</span><span>' + (published ? '함께보기 중 (전체 공개)' : '현재 나만보기') + '</span></div><span style="font-size:0.68rem; color:' + (published ? '#38bdf8' : '#fde047') + '; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">' + (published ? '나만보기로 전환' : '함께보기') + '</span>';
      }
    };

    paintLockButton(nextStatus);

    triggerHaptic(12);
    if (typeof showToast === 'function') {
      showToast(nextStatus ? '[함께보기]로 전환되었습니다.' : '[나만보기]로 전환되었습니다.', 'info', 1600, { html: nextStatus ? HISTORY_TOAST_VEC.globe : HISTORY_TOAST_VEC.lock });
    }

    clearTimeout(window.__publishDebounceTimers[sId]);
    window.__publishDebounceTimers[sId] = setTimeout(function() {
      delete window.__publishDebounceTimers[sId]; // 🛡️ 타이머 맵 정리
      var persistPublish = function() {
        if (typeof window.patchFeedPublishStatus !== 'function') {
          return Promise.resolve({ ok: false, error: 'NO_PATCH' });
        }
        return window.patchFeedPublishStatus(sId, nextStatus);
      };

      persistPublish().then(function(result) {
        if (result && result.ok) {
          if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
          return;
        }

        if (nextStatus && typeof window.savePackingHistoryRecord === 'function') {
          return window.savePackingHistoryRecord(target).then(function(saved) {
            if (saved && saved.__serverSaveFailed) {
              if (typeof window.okbmApplyPublishFlag === 'function') window.okbmApplyPublishFlag(sId, !nextStatus, target);
              paintLockButton(!nextStatus);
              if (typeof showToast === 'function') {
                showToast('공개 설정 동기화에 실패했습니다. 다시 시도해주세요.', 'error', 2400);
              }
              return;
            }
            if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);
          });
        }

        if (typeof window.okbmApplyPublishFlag === 'function') window.okbmApplyPublishFlag(sId, !nextStatus, target);
        paintLockButton(!nextStatus);
        if (typeof showToast === 'function') {
          showToast('공개 설정 동기화에 실패했습니다. 다시 시도해주세요.', 'error', 2400);
        }
      });
    }, 600);
  };

  window.okbmFindFeedRecord = function(recordId) {
    var sId = String(recordId || '').trim();
    if (!sId) return null;
    var pools = [
      window.interactiveHistory,
      (typeof window.safeGetStorage === 'function') ? window.safeGetStorage('okbm_packing_history', []) : null,
      window.__allLoadedFeeds,
      window.__currentScopedPastTripLogs,
      window.__currentScopedSavedFeeds,
      (typeof safeGetJSON === 'function') ? safeGetJSON('okbm_cached_community_feeds', []) : null
    ];
    for (var p = 0; p < pools.length; p++) {
      var list = pools[p];
      if (!Array.isArray(list)) continue;
      for (var i = 0; i < list.length; i++) {
        var item = list[i];
        if (!item) continue;
        var itemId = String(item.id || '').trim();
        if (itemId && itemId === sId) return item;
        var cleanD = item.date ? String(item.date).replace(/[-/]/g, '.') : '';
        var pParts = cleanD.match(/\d+/g);
        if (pParts && pParts.length >= 3) {
          var sKey = 'pack_' + pParts[0] + pParts[1].padStart(2, '0') + pParts[2].padStart(2, '0') + '_' + i;
          if (sKey === sId) return item;
        }
      }
    }
    return null;
  };

  window.openTripActionMenu = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);
    var log = window.okbmFindFeedRecord(recordId);
    if (!log && typeof window.__findCurrentDualFeedRecord === 'function') {
      var curFeed = window.__findCurrentDualFeedRecord();
      if (curFeed && String(curFeed.id || '').trim() === String(recordId || '').trim()) log = curFeed;
    }
    if (!log) {
      if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
      return;
    }
    window.__tripActionTargetLog = log;

    var old = document.getElementById('tripActionActionSheet');
    if (old) old.remove();

    var isPub = (log.isPublished !== undefined)
      ? Boolean(log.isPublished)
      : Boolean(log.is_published);

    var safeId = escapeHtml(String(log.id || ''));
    var sheet = document.createElement('div');
    sheet.id = 'tripActionActionSheet';
    sheet.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.78); z-index:2147483646 !important; display:flex; justify-content:center; align-items:flex-end; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);';
    sheet.onclick = function(ev) { if (ev.target === sheet) sheet.remove(); };

    sheet.innerHTML = `
      <div style="width:100%; max-width:440px; background:#0c1017; border-top:1.5px solid rgba(56,189,248,0.35); border-radius:18px 18px 0 0; padding:16px 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">
          <span style="font-size:0.86rem; font-weight:900; color:#fff;">[${escapeHtml(log.spot)}] 기록 관리</span>
          <button type="button" onclick="document.getElementById('tripActionActionSheet').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
        </div>

        <button type="button" id="sheetTogglePublishBtn_${safeId}" data-record-id="${safeId}" onclick="document.getElementById('tripActionActionSheet') && document.getElementById('tripActionActionSheet').remove(); window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="width:100%; height:42px; background:${isPub ? 'rgba(56,189,248,0.14)' : 'rgba(255,255,255,0.06)'}; border:1px solid ${isPub ? '#38bdf8' : 'rgba(255,255,255,0.15)'}; border-radius:10px; color:${isPub ? '#38bdf8' : '#cbd5e1'}; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:0 14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${isPub ? '🌐' : '🔒'}</span>
            <span>${isPub ? '함께보기 중 (전체 공개)' : '현재 나만보기'}</span>
          </div>
          <span style="font-size:0.68rem; color:${isPub ? '#38bdf8' : '#fde047'}; background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px;">
            ${isPub ? '나만보기로 전환' : '함께보기'}
          </span>
        </button>

        <button type="button" data-record-id="${safeId}" onclick="window.openTripEditFromMenu(this.dataset.recordId, event);" style="width:100%; height:42px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#fff; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; padding:0 14px;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#38bdf8; fill:none; stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>수정</span>
        </button>

        <button type="button" data-record-id="${safeId}" onclick="document.getElementById('tripActionActionSheet') && document.getElementById('tripActionActionSheet').remove(); window.deleteTripRecord(this.dataset.recordId, event);" style="width:100%; height:42px; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); border-radius:10px; color:#fda4af; font-size:0.80rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:8px; padding:0 14px;">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#f43f5e; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span>기록 삭제</span>
        </button>

        <button type="button" onclick="document.getElementById('tripActionActionSheet').remove();" style="width:100%; height:42px; background:#111111; border:none; border-radius:10px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer; margin-top:2px;">취소</button>
      </div>
    `;

    document.body.appendChild(sheet);
  };

  window.openTripEditFromMenu = function(recordId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var sheet = document.getElementById('tripActionActionSheet');
    if (sheet) sheet.remove();
    var rec = window.__tripActionTargetLog || null;
    if (!rec || (recordId && String(rec.id || '').trim() !== String(recordId).trim())) {
      rec = (typeof window.okbmFindFeedRecord === 'function') ? window.okbmFindFeedRecord(recordId) : rec;
    }
    if (!rec && typeof window.__findCurrentDualFeedRecord === 'function') {
      rec = window.__findCurrentDualFeedRecord();
    }
    if (!rec) {
      if (typeof showToast === 'function') showToast('수정할 대상을 찾을 수 없습니다.', 'warn');
      return;
    }
    if (typeof window.openRichAfterTripModal === 'function') {
      window.openRichAfterTripModal(rec);
    }
  };

window.deleteTripRecord = async function(recordId, e, skipConfirm) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    var sId = String(recordId || '').trim();
    if (!sId) return;

    if (!skipConfirm) {
      if (!(await window.okbmConfirmFeedDeleteWithPlanWarning())) return;
    }

    triggerHaptic(15);

    // [삭제 검증] 서버에서 실제로 행이 삭제되었음을 확인하기 전까지는
    // 로컬 화면에서 절대 지우지 않습니다. 이전에는 로컬을 먼저 지우고 서버
    // DELETE는 응답을 확인하지 않는 '눈가림' 방식이라, RLS 등으로 서버에서
    // 실제로는 0건 삭제되어도 사용자는 지워진 줄 알았다가 새로고침 시
    // 글이 부활하는 문제가 있었습니다.
    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';
    var serverDeletedRows = [];

    if (!targetUrl || !targetKey) {
      if (typeof showToast === 'function') {
        showToast('서버에 연결할 수 없어 삭제하지 못했습니다.', 'error', 2600);
      }
      return;
    }

    if (targetUrl && targetKey) {
      var deleteBtn = e && e.target ? e.target.closest('button') : null;
      if (deleteBtn) { deleteBtn.disabled = true; }

      try {
        var delRes = await fetch(targetUrl + '/rest/v1/feeds?id=eq.' + encodeURIComponent(sId), {
          method: 'DELETE',
          headers: (typeof window.okbmWriteHeaders === 'function' && window.okbmWriteHeaders({ Prefer: 'return=representation' })) || {
            'apikey': targetKey,
            'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          }
        });

        if (!delRes.ok) {
          var errBody = '';
          try { errBody = await delRes.text(); } catch (readErr) {}
          console.error('[romantic-history.js:deleteTripRecord] 서버 삭제 실패 status=' + delRes.status, errBody);
          if (typeof showToast === 'function') {
            showToast('삭제에 실패했습니다 (서버 응답: ' + delRes.status + '). 다시 시도해주세요.', 'error', 2600);
          }
          if (deleteBtn) { deleteBtn.disabled = false; }
          return;
        }

        var deletedRows = [];
        try { deletedRows = await delRes.json(); } catch (parseErr) {}
        serverDeletedRows = Array.isArray(deletedRows) ? deletedRows : [];

        if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
          // HTTP 200/204는 왔지만 실제로 삭제된 행이 0건인 경우
          // (권한 문제 등으로 서버가 조용히 무시한 경우) — 화면에서 지우지 않습니다.
          console.error('[romantic-history.js:deleteTripRecord] 서버에서 0건 삭제됨 (권한/RLS 문제 가능성):', sId);
          if (typeof showToast === 'function') {
            showToast('서버에서 삭제가 확인되지 않았습니다. 권한 문제일 수 있습니다.', 'error', 2800);
          }
          if (deleteBtn) { deleteBtn.disabled = false; }
          return;
        }
      } catch (networkErr) {
        console.error('[romantic-history.js:deleteTripRecord] 네트워크 예외:', networkErr);
        if (typeof showToast === 'function') {
          showToast('삭제 요청 중 네트워크 오류가 발생했습니다. 다시 시도해주세요.', 'error', 2600);
        }
        if (deleteBtn) { deleteBtn.disabled = false; }
        return;
      }
    }

    // 여기까지 왔다면 서버 삭제가 확인되었으므로(또는 서버 설정이 없으므로) 로컬 캐시를 정리합니다.
    var purgeFn = function(r) {
      return r && String(r.id).trim() !== sId;
    };

    var findById = function(list) {
      if (!Array.isArray(list)) return null;
      for (var fi = 0; fi < list.length; fi++) {
        if (list[fi] && String(list[fi].id).trim() === sId) return list[fi];
      }
      return null;
    };

    var rawHistory = null;
    if (window.RomanticVault && typeof window.RomanticVault.read === 'function') {
      rawHistory = window.RomanticVault.read('okbm_packing_history', null);
    }
    if (!Array.isArray(rawHistory)) {
      rawHistory = window.safeGetStorage('okbm_packing_history', []) || [];
    }

    var targetRec = findById(rawHistory)
      || findById(window.interactiveHistory)
      || findById(window.__allLoadedFeeds)
      || findById(window.heroTopRecords)
      || findById(serverDeletedRows);
    var deletedRecords = targetRec ? [targetRec] : [];

    if (Array.isArray(window.__allLoadedFeeds)) {
      window.__allLoadedFeeds = window.__allLoadedFeeds.filter(purgeFn);
      try { okbmWriteCachedCommunityFeeds(window.__allLoadedFeeds); } catch(e) { console.warn('[romantic-history.js:deleteTripRecord feedCache]', e); }
    }

    var filteredHistory = rawHistory.filter(purgeFn);

    window.interactiveHistory = filteredHistory.map(function(r, i) { return window.normalizeHistoryRecord(r, i); });
    window.packingHistoryList = window.interactiveHistory;
    window.safeSetStorage('okbm_packing_history', filteredHistory);
    if (window.__memoryStore) window.__memoryStore['okbm_packing_history'] = filteredHistory;
    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_packing_history', filteredHistory, false);
    }
    try { localStorage.setItem('okbm_packing_history', JSON.stringify(filteredHistory)); } catch(e) { console.warn('[romantic-history.js:deleteTripRecord localSet]', e); }
    await window.okbmPurgePlansForDeletedRecords(deletedRecords);
    if (typeof window.renderPlanStage === 'function' && document.getElementById('romanticPlanModal')) {
      window.renderPlanStage();
    }

    if (Array.isArray(window.heroTopRecords)) {
      window.heroTopRecords = window.heroTopRecords.filter(purgeFn);
      window.currentHeroCardIndex = 0;
      if (typeof window.renderCurrentHeroCard === 'function') {
        window.renderCurrentHeroCard();
      }
    }

    var editModal = document.getElementById('modalRichAfterTrip');
    if (editModal) editModal.remove();

    var singleModal = document.getElementById('singleTripFeedModal');
    if (singleModal) singleModal.remove();

    var pastListModal = document.getElementById('pastTripsListModal');
    if (pastListModal && typeof window.openPastTripsListModal === 'function') {
      window.openPastTripsListModal();
    }

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
  };

  
// 🗺️ [전국 마스터 장소 DB 실시간 대조 & 지도 직통 이동 엔진]
  // 피드명은 '가평 울업산', DB는 spot_main '울업산' / fullName '[가평군] 울업산' 이라 공백·시군구 접미사까지 맞춰야 한다.
  window.okbmCompactSpotFocusKey = function(str) {
    return String(str || '')
      .replace(/[()[\]]/g, ' ')
      .replace(/\d+\s*m\b/gi, ' ')
      .replace(/특별자치시|특별자치도|광역시|특별시/g, '')
      .replace(/([가-힣]{2,})(시|군|구)/g, '$1')
      .replace(/[\s\-_,./·]/g, '')
      .toLowerCase()
      .trim();
  };

  window.okbmFindSpotByFocusQuery = function(list, query) {
    var q = window.okbmCompactSpotFocusKey(query);
    if (!q || q.length < 2) return null;
    var arr = Array.isArray(list) ? list : [];
    var best = null, bestScore = 0, bestMainLen = 0;
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      if (!s) continue;
      var main = window.okbmCompactSpotFocusKey(s.spot_main || s.name || s.spotName || s.spot || s.title || '');
      var hay = window.okbmCompactSpotFocusKey([
        s.fullName, s.fullname, s.spot_main, s.name, s.spotName, s.spot, s.title,
        s.spot_sub, s.cityName, s.region
      ].filter(Boolean).join(' '));
      if (!main && !hay) continue;
      var score = 0;
      if (main && main === q) score = 100;
      else if (hay && hay === q) score = 90;
      else if (main && main.length >= 2 && q.indexOf(main) !== -1) score = 80;
      else if (hay && hay.indexOf(q) !== -1) score = 70;
      else if (hay && q.indexOf(hay) !== -1 && hay.length >= 4) score = 60;
      if (score > bestScore || (score === bestScore && main.length > bestMainLen)) {
        bestScore = score;
        bestMainLen = main.length;
        best = s;
      }
    }
    return bestScore > 0 ? best : null;
  };

  function okbmPushSpotPool(pool, seen, arr) {
    if (!Array.isArray(arr)) return;
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      if (!s) continue;
      var key = String(s.id || s.spot_id || '') + '|' + String(s.spot_main || s.name || s.spot || '') + '|' + String(s.lat || s.campsite_lat || '');
      if (seen[key]) continue;
      seen[key] = 1;
      pool.push(s);
    }
  }

  function okbmCollectMasterSpotPool() {
    var pool = [];
    var seen = {};
    if (typeof window.okbmReadSpotsCache === 'function') {
      okbmPushSpotPool(pool, seen, window.okbmReadSpotsCache());
    }
    okbmPushSpotPool(pool, seen, window.SPOTS_MASTER);
    okbmPushSpotPool(pool, seen, window.registeredSpots);
    if (window.__memoryStore) {
      okbmPushSpotPool(pool, seen, window.__memoryStore['okbm_master_spots']);
      okbmPushSpotPool(pool, seen, window.__memoryStore['okbm_spots_cache']);
    }
    [window.campingSpots, window.spotsData, window.allSpots, window.masterSpots, window.spots, window.CAMPING_SPOTS, window.SPOTS_DB].forEach(function(arr) {
      okbmPushSpotPool(pool, seen, arr);
    });
    if (typeof window.safeGetJSON === 'function') {
      okbmPushSpotPool(pool, seen, window.safeGetJSON('okbm_spots_cache', []));
      okbmPushSpotPool(pool, seen, window.safeGetJSON('okbm_master_spots', []));
    } else {
      ['okbm_spots_cache', 'okbm_master_spots', 'camping_spots', 'okbm_spots'].forEach(function(k) {
        try {
          var item = localStorage.getItem(k);
          if (item) {
            var parsed = JSON.parse(item);
            if (Array.isArray(parsed)) okbmPushSpotPool(pool, seen, parsed);
          }
        } catch (e) { console.warn('[romantic-history.js:okbmCollectMasterSpotPool parse]', e); }
      });
    }
    return pool;
  }

  function okbmFindSpotInPoolById(list, rawId) {
    var sid = String(rawId || '').trim();
    if (!sid) return null;
    var arr = Array.isArray(list) ? list : [];
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      if (s && String(s.id || s.spot_id || '').trim() === sid) return s;
    }
    return null;
  }

  window.isSpotRegisteredInMasterDB = function(rawSpotName) {
    if (!rawSpotName) return false;
    var compact = window.okbmCompactSpotFocusKey(rawSpotName);
    if (!compact || compact === '나의힐링스팟' || compact === '힐링박지' || compact === '방문스팟') return false;
    return !!window.okbmFindSpotByFocusQuery(okbmCollectMasterSpotPool(), rawSpotName);
  };

  window.navigateToSpotMap = function(rawSpotName, e, rawSpotId) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (e && typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    if (window.__okbmSpotMapNavLock) return;
    window.__okbmSpotMapNavLock = true;
    setTimeout(function() { window.__okbmSpotMapNavLock = false; }, 800);

    var cleanSpot = String(rawSpotName || '')
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    var cleanId = String(rawSpotId || '').trim();
    if (!cleanSpot && !cleanId) return;
    triggerHaptic(12);

    if ((!cleanSpot || cleanSpot === '나의 힐링 스팟' || cleanSpot === '힐링 장소') && !cleanId) {
      if (typeof showToast === 'function') showToast('정확한 장소 위치 정보가 등록되지 않았습니다.', 'info', 1800);
      return;
    }

    var pool = okbmCollectMasterSpotPool();
    var found = cleanId ? okbmFindSpotInPoolById(pool, cleanId) : null;
    if (!found && cleanSpot) found = window.okbmFindSpotByFocusQuery(pool, cleanSpot);

    var targetId = (found && (found.id || found.spot_id)) ? String(found.id || found.spot_id).trim() : cleanId;
    var mapName = (found && String(found.spot_main || found.name || found.spot || '').trim()) || cleanSpot;

    if (!found && !targetId && pool.length > 0) {
      if (typeof showToast === 'function') showToast('정확한 장소 위치 정보가 등록되지 않았습니다.', 'info', 1800);
      return;
    }

    try {
      sessionStorage.setItem('okbm_entered_via_index', '1');
      if (mapName) {
        localStorage.setItem('okbm_target_map_spot', mapName);
        sessionStorage.setItem('okbm_pending_map_spot', mapName);
        sessionStorage.setItem('okbm_target_spot', mapName);
      }
      sessionStorage.setItem('okbm_last_feed_return', location.href);
      if (targetId) sessionStorage.setItem('okbm_pending_map_id', targetId);
      else sessionStorage.removeItem('okbm_pending_map_id');
    } catch (err) {}

    var href = 'map.html';
    var qs = [];
    if (mapName) qs.push('spot=' + encodeURIComponent(mapName));
    if (targetId) qs.push('id=' + encodeURIComponent(targetId));
    if (qs.length) href += '?' + qs.join('&');

    setTimeout(function() {
      if (typeof window.closeHistoryModal === 'function') window.closeHistoryModal();
      if (typeof window.smoothNavigate === 'function') window.smoothNavigate(href);
      else location.href = href;
    }, 120);
  };

  if (!window.__okbmFeedSpotMapClickBound) {
    window.__okbmFeedSpotMapClickBound = true;
    document.addEventListener('click', function(e) {
      var btn = e.target && e.target.closest ? e.target.closest('.js-feed-spot-map') : null;
      if (!btn) return;
      window.navigateToSpotMap(btn.getAttribute('data-spot') || '', e, btn.getAttribute('data-spot-id') || '');
    }, true);
  }

  window.okbmApplyUgcSafetyFilter = function(list) {
    if (!Array.isArray(list)) return [];
    if (typeof window.filterHiddenUgcFeeds === 'function') return window.filterHiddenUgcFeeds(list);
    return list.filter(Boolean);
  };

  window.okbmEnsureUgcSafetyFromServer = async function() {
    if (typeof window.okbmSyncUgcSafetyFromServer === 'function') {
      return window.okbmSyncUgcSafetyFromServer();
    }
    var changed = false;
    if (typeof window.syncMyUserBlocksFromServer === 'function') {
      try { changed = Boolean(await window.syncMyUserBlocksFromServer()) || changed; } catch (e) {
        console.warn('[romantic-history.js:okbmEnsureUgcSafetyFromServer blocks]', e);
      }
    }
    if (typeof window.syncMyFeedReportsFromServer === 'function') {
      try { changed = Boolean(await window.syncMyFeedReportsFromServer()) || changed; } catch (e) {
        console.warn('[romantic-history.js:okbmEnsureUgcSafetyFromServer reports]', e);
      }
    }
    return changed;
  };

  function okbmBuildFeedOthersMoreBtnHtml(feedId, userId, authorName, variant) {
    var sFeedId = String(feedId || '').trim();
    var sUserId = String(userId || '').trim();
    var sNick = String(authorName || '').trim();
    if (sUserId && window.isCurrentUserId && window.isCurrentUserId(sUserId)) return '';
    if (!sFeedId && !sUserId) return '';
    if (typeof window.openUgcSafetyMenu !== 'function') return '';

    var isFloat = variant === 'float';
    var btnStyle = isFloat
      ? 'background:#0c1017; border:1px solid rgba(255,255,255,0.2); color:#ffffff; width:32px; height:32px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); padding:0; flex-shrink:0;'
      : 'background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#94a3b8; flex-shrink:0;';

    return '<button type="button" data-feed-id="' + escapeHtml(sFeedId) + '" data-user-id="' + escapeHtml(sUserId) + '" data-author="' + escapeHtml(sNick) + '" onclick="event.preventDefault(); event.stopPropagation(); window.openUgcSafetyMenu(this.dataset.feedId, this.dataset.userId, this.dataset.author, event);" style="' + btnStyle + '" title="더보기">' +
      '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
    '</button>';
  }

 // 👤 [특정 작성자 피드 모아보기 전담 모달 엔진 - 하단 단일 진실 공급원(SSOT) 통합 완료]
// 📖 [단일 피드 카드 마크업 생성기 - 각 사진별 120자 캡션 1:1 결합 렌더러]
  window.buildSingleFeedCardHtml = function(log) {
    if (!log) return '';
    var rawTmplId = log.template_id !== undefined ? log.template_id : log.templateId;
    var tmplId = (rawTmplId !== undefined && rawTmplId !== null && parseInt(rawTmplId, 10) > 0) ? parseInt(rawTmplId, 10) : 1;
    var items = Array.isArray(log.items) ? log.items : [];

    var actualReadyShot = String(log.readyShotPhoto || log.ready_shot_photo || log.customTemplatePhoto || '').trim();

    var photosList = (typeof getRecordPhotos === 'function') ? getRecordPhotos(log) : (log.photos || []);
    photosList = (Array.isArray(photosList) ? photosList : []).filter(function(u) {
      return u && typeof u === 'string' && u.trim().length > 10 && !u.includes('unsplash.com') && u !== actualReadyShot;
    });

    var photoMemos = Array.isArray(log.photoMemos) ? log.photoMemos : [];
    var fallbackMemo = (log.memo || log.oneLineMemo || '').trim();

    var packingSheetMarkup = '';
    var isReadyShotMode = (typeof window.recordUsesPhotoTemplate === 'function')
      ? window.recordUsesPhotoTemplate(log)
      : Boolean(actualReadyShot && actualReadyShot.length > 10);

    if (isReadyShotMode) {
      if (typeof window.generateReadyShotMarkup === 'function') {
        packingSheetMarkup = window.generateReadyShotMarkup(log, { photo: actualReadyShot });
      } else {
        packingSheetMarkup = '<div style="width:100%; height:100%; background:#000000; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center;">' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(actualReadyShot)) + '" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:contain; display:block;" />' +
        '</div>';
      }
    } else {
      var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);
      if (genFn) {
        packingSheetMarkup = genFn(tmplId, log, items, log.spot, fallbackMemo || (log.spot + ' 패킹'), photosList[0] || '');
      } else {
        packingSheetMarkup = '<div style="height:100%; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; background:#f4f1ea; color:#1c1917; padding:12px; border-radius:13px;">' +
          '<div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px dashed #000; padding-bottom:3px;">' +
              '<span style="font-family:\'Space Grotesk\', sans-serif; font-size:0.75rem; font-weight:900;">ROMANTIC PACK</span>' +
              '<span style="font-size:0.52rem; background:#0284c7; color:#fff; font-weight:900; padding:1px 5px; border-radius:3px;">#0' + tmplId + '</span>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:0.95rem; font-weight:900; color:#0f172a;">' + escapeHtml(log.spot || '낭만 스팟') + '</div>' +
          '</div>' +
          '<div style="border-top:1.5px dashed #000; padding-top:5px; display:flex; justify-content:space-between; align-items:baseline;">' +
            '<span style="font-size:0.68rem; font-weight:900; color:#64748b;">TOTAL</span>' +
            '<span style="font-size:1.35rem; font-weight:900; color:#000; font-family:\'Space Grotesk\', sans-serif;">' + (log.weightKg || '0.00') + ' KG</span>' +
          '</div>' +
        '</div>';
      }
    }

    var photoSectionsHtml = photosList.map(function(pUrl, pIdx) {
      var curMemo = (photoMemos[pIdx] !== undefined && photoMemos[pIdx] !== null) ? String(photoMemos[pIdx]).trim() : '';
      if (!curMemo && pIdx === 0 && fallbackMemo) {
        curMemo = fallbackMemo;
      }

      var memoMarkup = curMemo ? (
        '<div style="padding:10px 14px 14px 14px; background:#080b11; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; gap:4px;">' +
          '<div style="display:flex; align-items:center; gap:5px;">' +
            '<span style="font-size:0.58rem; color:#38bdf8; background:rgba(56,189,248,0.12); padding:1px 5px; border-radius:4px; font-weight:900; font-family:\'Space Grotesk\', sans-serif;">#' + String(pIdx + 1).padStart(2, '0') + '</span>' +
            '<span style="font-size:0.62rem; color:#64748b; font-weight:700;"></span>' +
          '</div>' +
          '<div style="font-size:0.82rem; color:#e2e8f0; line-height:1.55; word-break:break-all; font-family:\'Pretendard Variable\', -apple-system, sans-serif; letter-spacing:-0.01em;">“' + escapeHtml(curMemo) + '”</div>' +
        '</div>'
      ) : '';

      return '<div style="width:100%; display:flex; flex-direction:column; background:#000000;">' +
        '<div style="width:100%; overflow:hidden; background:#000000; position:relative; display:flex; align-items:center; justify-content:center;">' +
          '<img class="reel-photo-target" src="' + escapeHtml(okbmSafeImageUrl(pUrl)) + '" onload="window.applySmartPhotoFit(this);" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:auto; object-fit:contain; display:block; background:#000000;" />' +
          (photosList.length > 1 ? '<span style="position:absolute; top:10px; right:10px; background:#0c1017; color:#ffffff; font-size:0.62rem; font-weight:800; font-family:\'Space Grotesk\', sans-serif; padding:2px 7px; border-radius:10px; border:1px solid rgba(255,255,255,0.15);">' + (pIdx + 1) + ' / ' + photosList.length + '</span>' : '') +
        '</div>' +
        memoMarkup +
      '</div>';
    }).join('');

    var templateSectionHtml =
      '<div style="padding:18px 16px 20px 16px; background:#000000; display:flex; justify-content:center;">' +
        '<div class="okbm-feed-postcard" style="border-radius:14px; overflow:hidden; background:#000000; box-shadow:0 12px 30px rgba(0,0,0,0.9);">' +
          packingSheetMarkup +
        '</div>' +
      '</div>';

    var sFeedId = escapeHtml(String(log.id));
    var sCleanId = String(log.id).replace(/^["']|["']$/g, '').trim();
    var sProfile = safeGetJSON('user_profile', null);
    var sMyId = (sProfile && sProfile.id) ? String(sProfile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    var sUserStarsKey = (typeof window.okbmGetUserStarsKey === 'function') ? window.okbmGetUserStarsKey(sMyId) : 'okbm_feed_stars_map';
    var sStarsMap = safeGetJSON(sUserStarsKey, {});
    var sStarCounts = safeGetJSON('okbm_feed_stars_counts', {});
    var sIsStarred = Boolean(sStarsMap[sCleanId] || sStarsMap[sFeedId]);
    var sLikes = (log.likes_count !== undefined && log.likes_count !== null) ? Number(log.likes_count) : (log.likes !== undefined ? Number(log.likes) : Number(sStarCounts[sCleanId] || 0));
    var sStarCount = isNaN(sLikes) ? 0 : sLikes;
    var sSavedList = safeGetJSON('okbm_saved_feeds', []);
    var sIsSaved = sSavedList.includes(sCleanId) || sSavedList.includes(sFeedId);
    var sSpot = log.spot || '낭만 스팟';
    var sMemo = fallbackMemo || sSpot;

    var interactiveBarHtml =
      '<div style="padding:10px 16px 14px 16px; background:#000000; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06);">' +
        '<div style="display:flex; align-items:center; gap:14px;">' +
          '<button type="button" data-star-card-id="' + escapeHtml(sCleanId) + '" style="background:none; border:none; padding:4px 0; cursor:pointer; display:flex; align-items:center; gap:5px; color:#ffffff;">' +
            '<svg class="js-feed-star-icon" viewBox="0 0 24 24" style="width:18px; height:18px; filter:' + (sIsStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none') + ';" fill="' + (sIsStarred ? '#fde047' : 'none') + '" stroke="' + (sIsStarred ? '#fde047' : '#ffffff') + '" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
            '<span class="js-feed-star-count" style="font-size:0.78rem; font-weight:800; color:#fde047; font-family:\'Space Grotesk\', sans-serif;">' + sStarCount + '</span>' +
          '</button>' +
          '<button type="button" data-share-feed="1" data-feed-id="' + sFeedId + '" data-spot="' + escapeHtml(sSpot) + '" data-memo="' + escapeHtml(sMemo) + '" style="background:none; border:none; padding:4px 0; cursor:pointer; display:flex; align-items:center; color:#cbd5e1;" title="공유">' +
            '<svg viewBox="0 0 24 24" style="width:17px; height:17px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
          '</button>' +
          '<button type="button" data-save-feed="1" data-feed-id="' + sFeedId + '" style="background:none; border:none; padding:4px 0; cursor:pointer; display:flex; align-items:center; color:' + (sIsSaved ? '#c084fc' : '#cbd5e1') + ';" title="관심피드 즐겨찾기 저장">' +
            '<svg viewBox="0 0 24 24" style="width:17px; height:17px;" fill="' + (sIsSaved ? '#c084fc' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    return '<div class="single-feed-block" data-record-id="' + escapeHtml(String(log.id)) + '" style="background:#000000; border-bottom:2px solid rgba(255,255,255,0.12); overflow:hidden; display:flex; flex-direction:column; flex-shrink:0; margin-bottom:28px; box-sizing:border-box;">' +
      '<div style="padding:14px 16px 10px 16px; background:#000000; display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="font-size:1.05rem; font-weight:900; color:#ffffff; letter-spacing:-0.02em;">' + escapeHtml(log.spot || '낭만 스팟') + (log.elevation ? (' <span style="font-size:0.75rem; color:#fde047; font-weight:800;">(' + escapeHtml(log.elevation) + ')</span>') : '') + '</div>' +
        '<div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">' +
          '<span style="font-size:0.72rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace;">' + escapeHtml(log.date || '') + '</span>' +
          ((typeof window.isRecordOwner === 'function' && window.isRecordOwner(log)) ? '' : okbmBuildFeedOthersMoreBtnHtml(log.id, log.userId || log.user_id, log.author || log.nick || log.nickname, 'inline')) +
        '</div>' +
      '</div>' +
      '<div style="display:flex; flex-direction:column; width:100%;">' +
        photoSectionsHtml +
      '</div>' +
      templateSectionHtml +
      interactiveBarHtml +
    '</div>';
  };
// 🔖 [관심피드 북마크 저장/해제 토글 엔진]
 window.__saveFeedDebounceTimers = window.__saveFeedDebounceTimers || {};

 window.toggleSaveFeed = function(feedId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(12);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      if (typeof showToast === 'function') showToast('관심피드 저장은 로그인 후 이용할 수 있습니다.', 'info', 2000, { html: HISTORY_TOAST_VEC.lock });
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
      } else if (typeof openLoginModal === 'function') {
        openLoginModal();
      }
      return;
    }

    var sId = String(feedId || '').trim();
    if (!sId) return;

    var savedFeeds = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_saved_feeds', [])
      : safeGetJSON('okbm_saved_feeds', []);

    var isSaved = savedFeeds.includes(sId);

    if (isSaved) {
      savedFeeds = savedFeeds.filter(function(id) { return id !== sId; });
      if (typeof showToast === 'function') showToast('관심피드 저장이 해제되었습니다.', 'info', 1600);
    } else {
      savedFeeds.unshift(sId);
      if (typeof showToast === 'function') showToast('관심피드로 저장되었습니다.', 'success', 1800);
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_saved_feeds', savedFeeds, true);
    } else {
      localStorage.setItem('okbm_saved_feeds', JSON.stringify(savedFeeds));
    }

    clearTimeout(window.__saveFeedDebounceTimers[sId]);
    window.__saveFeedDebounceTimers[sId] = setTimeout(function() {
      delete window.__saveFeedDebounceTimers[sId]; // 🛡️ 타이머 맵 정리
      if (typeof syncUserDataToCloud === 'function') {
        syncUserDataToCloud(false);
      }
    }, 400);

    var targetBtns = [];
    var clickedBtn = null;
    if (e && e.target && e.target.closest) {
      clickedBtn = e.target.closest('[data-save-feed]');
    }
    if (!clickedBtn && e && e.currentTarget && e.currentTarget.hasAttribute && e.currentTarget.hasAttribute('data-save-feed')) {
      clickedBtn = e.currentTarget;
    }
    if (!clickedBtn && e && e.target && e.target.closest) {
      clickedBtn = e.target.closest('button');
    }
    if (clickedBtn) targetBtns.push(clickedBtn);

    try {
      var escapedId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(sId) : sId;
      document.querySelectorAll('button[data-feed-id="' + escapedId + '"]').forEach(function(btn) {
        if (!btn.hasAttribute('data-spot') && (btn.hasAttribute('data-save-feed') || (btn.getAttribute('onclick') || '').indexOf('toggleSaveFeed') !== -1) && targetBtns.indexOf(btn) === -1) {
          targetBtns.push(btn);
        }
      });
    } catch (domErr) {}

    targetBtns.forEach(function(btn) {
      btn.style.color = isSaved ? '#cbd5e1' : '#c084fc';
      var svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isSaved ? 'none' : '#c084fc');
      }
    });
  };

 window.openFollowedRoutersModal = function(isRestored) {
    triggerHaptic(12);

    var activeReport = document.getElementById('userProfileModalOverlay');
    if (!isRestored && activeReport && activeReport.style.display !== 'none') {
      window.recordModalHistoryStep('userProfileModalOverlay', function() {
        if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
      });
    }

    [
      'followedRoutersModal',
      'savedFeedsEmptyModal',
      'singleTripFeedModal',
      'pastTripsListModal',
      'romanticInterestModal'
    ].forEach(function(mId) {
      var m = document.getElementById(mId);
      if (m) m.remove();
    });

    var followingList = safeGetJSON('okbm_following_users', []);

    var allFeeds = (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
      ? window.__allLoadedFeeds
      : (window.safeGetStorage('okbm_cached_community_feeds', []) || []);

    if (Array.isArray(window.interactiveHistory)) {
      window.interactiveHistory.forEach(function(myRec) {
        if (myRec && window.okbmIsPublicFeedItem && window.okbmIsPublicFeedItem(myRec)) {
          if (!allFeeds.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
            allFeeds.push(myRec);
          }
        }
      });
    }

    var routerItems = followingList.map(function(authorKey) {
      var cleanKey = String(authorKey).trim();
      var userFeeds = allFeeds.filter(function(f) {
        return f && (String(f.userId || f.user_id || '').trim() === cleanKey || String(f.author || f.nick || f.nickname || '').trim() === cleanKey);
      });
      var latestFeed = userFeeds[0] || null;

      var displayNick = '';
      if (latestFeed && (latestFeed.author || latestFeed.nick || latestFeed.nickname)) {
        displayNick = String(latestFeed.author || latestFeed.nick || latestFeed.nickname).trim();
      }
      if (!displayNick && !cleanKey.startsWith('kakao_')) {
        displayNick = cleanKey;
      }
      if (!displayNick || displayNick.startsWith('kakao_')) {
        displayNick = '낭만루터';
      }

      var thumbPhoto = (latestFeed && window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(latestFeed)[0]) || '';
      var latestSpot = latestFeed ? (latestFeed.spot || '활동 기록') : '기록 없음';
      var latestDate = latestFeed ? (latestFeed.date || '') : '';
      var targetUserId = (latestFeed && (latestFeed.userId || latestFeed.user_id)) || (cleanKey.startsWith('kakao_') ? cleanKey : '');

      return {
        rawKey: cleanKey,
        displayNick: displayNick,
        targetUserId: targetUserId,
        thumbPhoto: thumbPhoto,
        latestSpot: latestSpot,
        latestDate: latestDate
      };
    });

    routerItems.sort(function(a, b) {
      return a.displayNick.localeCompare(b.displayNick, 'ko');
    });

    if (typeof window.isUserBlocked === 'function') {
      routerItems = routerItems.filter(function(item) {
        return !item.targetUserId || !window.isUserBlocked(item.targetUserId);
      });
    }

    var modalEl = document.createElement('div');
    modalEl.id = 'followedRoutersModal';
    modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; max-height:none !important; width:100%; max-width:100%; background:#000000; z-index:2147483642 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    var listHtml = '';
    if (routerItems.length === 0) {
      listHtml = '<div style="text-align:center; padding:70px 14px; color:#94a3b8; font-size:0.80rem; line-height:1.6;">등록된 관심루터가 없습니다.<br>피드 상단의 [+관심] 버튼을 눌러 관심루터를 등록해보세요.</div>';
    } else {
      listHtml = routerItems.map(function(item) {
        var safeNick = escapeHtml(item.displayNick);
        var safeUser = escapeHtml(item.targetUserId);
        var safeRawKey = escapeHtml(item.rawKey);

        return '<div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">' +
          '<div data-author="' + safeNick + '" data-user-id="' + safeUser + '" onclick="window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId);" style="display:flex; align-items:center; gap:10px; cursor:pointer; min-width:0; flex:1;">' +
            '<div style="width:44px; height:44px; border-radius:10px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.15);">' +
              '<img src="' + escapeHtml(okbmSafeImageUrl(item.thumbPhoto)) + '" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
            '</div>' +
            '<div style="min-width:0; flex:1;">' +
              '<div style="font-size:0.88rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + safeNick + '</div>' +
              '<div style="font-size:0.64rem; color:#94a3b8; margin-top:2px;">' + escapeHtml(item.latestSpot) + (item.latestDate ? ' · ' + escapeHtml(item.latestDate) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" data-raw-key="' + safeRawKey + '" data-author="' + safeNick + '" onclick="window.toggleFollowUser(this.dataset.rawKey, this.dataset.author, event); window.openFollowedRoutersModal();" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.64rem; font-weight:800; padding:5px 10px; border-radius:8px; cursor:pointer; flex-shrink:0; margin-left:8px;">해제</button>' +
        '</div>';
      }).join('');
    }

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="window.goBackModal(event);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">관심루터 (${routerItems.length})</span>
        </div>
      </div>

      <div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 8px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${listHtml}
      </div>
    `;

    document.body.appendChild(modalEl);
    if (typeof window.okbmLiftReportChildModal === 'function') window.okbmLiftReportChildModal(modalEl);
    else if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }
  };

  window.openSavedFeedsModal = function(isRestored) {
    triggerHaptic(12);

    var activeReport = document.getElementById('userProfileModalOverlay');
    if (!isRestored && activeReport && activeReport.style.display !== 'none') {
      window.recordModalHistoryStep('userProfileModalOverlay', function() {
        if (typeof window.openUserProfileModal === 'function') window.openUserProfileModal();
      });
    }

    [
      'followedRoutersModal',
      'savedFeedsListModal',
      'savedFeedsEmptyModal',
      'singleTripFeedModal',
      'pastTripsListModal',
      'romanticInterestModal'
    ].forEach(function(mId) {
      var m = document.getElementById(mId);
      if (m) m.remove();
    });

    var savedFeedsList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_saved_feeds', [])
      : safeGetJSON('okbm_saved_feeds', []);

    var allFeeds = (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
      ? window.__allLoadedFeeds
      : (window.safeGetStorage('okbm_cached_community_feeds', []) || []);

    if (Array.isArray(window.interactiveHistory)) {
      window.interactiveHistory.forEach(function(myRec) {
        if (myRec && window.okbmIsPublicFeedItem && window.okbmIsPublicFeedItem(myRec)) {
          if (!allFeeds.some(function(f) { return String(f.id).trim() === String(myRec.id).trim(); })) {
            allFeeds.push(myRec);
          }
        }
      });
    }

    var matchedSavedFeeds = [];
    var validIdSet = new Set();

    savedFeedsList.forEach(function(sId) {
      var found = allFeeds.find(function(f) {
        return f && String(f.id).trim() === String(sId).trim();
      });
      if (found && (!window.okbmIsPublicFeedItem || window.okbmIsPublicFeedItem(found))) {
        matchedSavedFeeds.push(found);
        validIdSet.add(String(sId).trim());
      }
    });

    matchedSavedFeeds = window.okbmApplyUgcSafetyFilter(matchedSavedFeeds);

    if (allFeeds.length > 0 && validIdSet.size !== savedFeedsList.length) {
      var cleanedIds = savedFeedsList.filter(function(id) {
        return validIdSet.has(String(id).trim());
      });
      if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
        window.RomanticVault.write('okbm_saved_feeds', cleanedIds, true);
      } else {
        localStorage.setItem('okbm_saved_feeds', JSON.stringify(cleanedIds));
      }
    }

    window.__currentScopedSavedFeeds = matchedSavedFeeds.slice();

    var modalEl = document.createElement('div');
    modalEl.id = 'savedFeedsListModal';
    modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; max-height:none !important; width:100%; max-width:100%; background:#000000; z-index:2147483642 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    var listContentHtml = '';
    if (matchedSavedFeeds.length === 0) {
      listContentHtml = '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#94a3b8; font-size:0.80rem; padding:40px 14px; text-align:center;">' +
        '<div style="width:48px; height:48px; border-radius:50%; background:rgba(192,132,252,0.1); border:1px solid rgba(192,132,252,0.25); display:flex; align-items:center; justify-content:center; color:#c084fc;">' +
          '<svg viewBox="0 0 24 24" style="width:24px; height:24px;" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
        '</div>' +
        '<span style="font-size:0.88rem; font-weight:800; color:#ffffff;">저장된 관심피드가 없습니다</span>' +
        '<span style="font-size:0.68rem; color:#64748b; line-height:1.5;">피드 하단의 북마크 아이콘을 터치하여<br>소중한 기록을 저장해보세요.</span>' +
      '</div>';
    } else {
      var cardsHtml = matchedSavedFeeds.map(function(r) {
        var photos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(r) : (r.photos || []);
        var thumbPhoto = (photos && photos.length > 0 && photos[0]) ? photos[0] : (r.readyShotPhoto || r.customTemplatePhoto || '');
        var safeId = escapeHtml(String(r.id || ''));
        var spotTitle = escapeHtml(r.spot || '방문 장소');
        var authorText = escapeHtml(r.author || r.nickname || '낭만백패커');
        var dateText = escapeHtml(r.date || '');
        var weightStr = escapeHtml(String(r.weightKg || '0.00'));

        return '<div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">' +
          '<div data-feed-id="' + safeId + '" onclick="window.openSingleTripDualFeedModal(this.dataset.feedId, window.__currentScopedSavedFeeds, \'관심피드\');" style="display:flex; align-items:center; gap:10px; cursor:pointer; min-width:0; flex:1;">' +
            '<div style="width:48px; height:48px; border-radius:10px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.15);">' +
              '<img src="' + escapeHtml(okbmSafeImageUrl(thumbPhoto)) + '" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
            '</div>' +
            '<div style="min-width:0; flex:1;">' +
              '<div style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + spotTitle + '</div>' +
              '<div style="font-size:0.64rem; color:#94a3b8; margin-top:2px;">' + authorText + ' · ' + dateText + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:8px;">' +
            '<span style="font-size:0.82rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightStr + 'kg</span>' +
            '<button type="button" data-feed-id="' + safeId + '" onclick="window.toggleSaveFeed(this.dataset.feedId, event); window.openSavedFeedsModal();" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); color:#fda4af; font-size:0.64rem; font-weight:800; padding:4px 8px; border-radius:6px; cursor:pointer;" title="저장 해제">해제</button>' +
          '</div>' +
        '</div>';
      }).join('');

      listContentHtml = '<div style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:14px 12px calc(80px + env(safe-area-inset-bottom, 8px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">' +
        cardsHtml +
      '</div>';
    }

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" onclick="window.goBackModal(event);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">◀</button>
          <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">관심피드 (${matchedSavedFeeds.length})</span>
        </div>
      </div>
      ${listContentHtml}
    `;

    document.body.appendChild(modalEl);
    if (typeof window.okbmLiftReportChildModal === 'function') window.okbmLiftReportChildModal(modalEl);
    else if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }
  };

  window.openSavedFeedsListModal = window.openSavedFeedsModal;

  window.openRomanticInterestModal = function(initialTab) {
    if (initialTab === 'feeds') {
      window.openSavedFeedsModal();
    } else {
      window.openFollowedRoutersModal();
    }
  };
 // 👥 [단방향 관심루터/크루 팔로우 토글 엔진]
 window.toggleFollowUser = function(targetUserId, targetAuthor, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(12);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) {
      if (typeof showToast === 'function') showToast('관심루터 등록은 로그인 후 이용할 수 있습니다.', 'info', 2000, { html: HISTORY_TOAST_VEC.lock });
      if (typeof window.openLoginModal === 'function') {
        window.openLoginModal();
      } else if (typeof openLoginModal === 'function') {
        openLoginModal();
      }
      return;
    }

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
    var sTargetId = String(targetUserId || '').trim();
    var sTargetAuthor = String(targetAuthor || '').trim();

    if (!sTargetId && !sTargetAuthor) return;
    if (myUserId && sTargetId && myUserId === sTargetId) {
      if (typeof showToast === 'function') showToast('본인 계정은 이웃으로 등록할 수 없습니다.', 'warn');
      return;
    }

    var followKey = sTargetId || sTargetAuthor;
    var followingList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_following_users', [])
      : safeGetJSON('okbm_following_users', []);

    var isFollowing = followingList.includes(followKey);

    if (isFollowing) {
      followingList = followingList.filter(function(id) { return id !== followKey; });
    } else {
      followingList.push(followKey);
      if (typeof showToast === 'function') showToast('[' + sTargetAuthor + '] 님을 이웃으로 등록했습니다.', 'success', 1800);
    }

    if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
      window.RomanticVault.write('okbm_following_users', followingList, true);
    } else {
      localStorage.setItem('okbm_following_users', JSON.stringify(followingList));
      if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(false);
    }

    if (typeof window.okbmPaintFollowButtons === 'function') {
      window.okbmPaintFollowButtons(sTargetId, sTargetAuthor, !isFollowing);
    }
    var followedModal = document.getElementById('followedRoutersModal');
    if (followedModal && typeof window.openFollowedRoutersModal === 'function') {
      window.openFollowedRoutersModal();
    }
    var modalEl = document.getElementById('userFeedCollectionModal');
    if (modalEl && typeof window.openUserFeedCollectionModal === 'function') {
      window.openUserFeedCollectionModal(sTargetAuthor, sTargetId);
    }
  };

  window.__buildUserCollectionFeedRowHtml = function(f, targetAuthor, targetUserId) {
    if (!f) return '';
    var thumb = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(f)[0]) || f.photo || (f.photos && f.photos[0]) || f.readyShotPhoto || f.customTemplatePhoto || '';
    var fSpot = escapeHtml(f.spot || '나의 힐링 스팟');
    var fDate = escapeHtml(f.date || '');
    var fWeight = escapeHtml(String(f.weightKg || f.weight_kg || '0.00'));
    var rawMemo = String(f.memo || f.oneLineMemo || '');
    var fMemo = escapeHtml(rawMemo.slice(0, 60));
    var safeId = escapeHtml(String(f.id || ''));

    return '<div class="js-open-user-feed-row" data-feed-id="' + safeId + '" data-author="' + escapeHtml(targetAuthor) + '" data-user-id="' + escapeHtml(targetUserId) + '" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:10px 12px; display:flex; gap:12px; align-items:center; cursor:pointer; flex-shrink:0; transition:all 0.15s ease;">' +
      '<div style="width:58px; height:58px; border-radius:8px; overflow:hidden; background:#0f172a; flex-shrink:0; border:1px solid rgba(255,255,255,0.14);">' +
        (thumb ? '<img src="' + escapeHtml(okbmSafeImageUrl(thumb)) + '" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100%; height:100%; object-fit:cover; display:block;" />' : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#64748b;"><svg viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>') +
      '</div>' +
      '<div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-size:0.86rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + fSpot + '</span>' +
          '<span style="font-size:0.75rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + fWeight + 'kg</span>' +
        '</div>' +
        '<span style="font-size:0.62rem; color:#64748b; font-family:\'JetBrains Mono\', monospace;">' + fDate + '</span>' +
        (fMemo ? ('<span style="font-size:0.68rem; color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">“' + fMemo + '”</span>') : '') +
      '</div>' +
    '</div>';
  };

  window.__userCollectionPagingState = {
    targetAuthor: '',
    targetUserId: '',
    offset: 0,
    limit: 10,
    hasMore: true,
    isLoading: false
  };

  window.__handleUserCollectionScroll = async function(container) {
    if (!container) return;
    var state = window.__userCollectionPagingState;
    if (!state || state.isLoading || !state.hasMore) return;

    var distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    if (distanceToBottom > 120) return;

    state.isLoading = true;
    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';

    if (!targetUrl || !targetKey || (!state.targetUserId && !state.targetAuthor)) {
      state.isLoading = false;
      state.hasMore = false;
      return;
    }

    try {
      var filterParam = state.targetUserId
        ? ('user_id=eq.' + encodeURIComponent(state.targetUserId))
        : ('author=eq.' + encodeURIComponent(state.targetAuthor));

      var profile = safeGetJSON('user_profile', null);
      var currentUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
      var isOwner = Boolean(currentUserId && state.targetUserId && currentUserId === state.targetUserId);

      var query = targetUrl + '/rest/v1/feeds?' + filterParam + '&order=date.desc,created_at.desc&offset=' + state.offset + '&limit=' + state.limit;
      if (!isOwner) {
        query += '&is_published=eq.true';
      }

      var res = await fetch(query, {
        headers: {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        state.isLoading = false;
        return;
      }

      var fetchedRows = await res.json();
      if (!Array.isArray(fetchedRows) || fetchedRows.length === 0) {
        state.hasMore = false;
        state.isLoading = false;
        return;
      }

      window.__scopedUserFilteredFeedsMap = window.__scopedUserFilteredFeedsMap || {};
      var currentArr = window.__scopedUserFilteredFeedsMap[state.targetAuthor] || [];
      var existingIdSet = new Set(currentArr.map(function(item) { return String(item.id).trim(); }));

      var newItems = [];
      fetchedRows.forEach(function(row, idx) {
        var rowId = String(row.id || '').trim();
        if (!existingIdSet.has(rowId)) {
          var norm = window.normalizeHistoryRecord(row, state.offset + idx);
          norm._isLocalOwner = isOwner;
          newItems.push(norm);
          existingIdSet.add(rowId);
        }
      });

      newItems = window.okbmApplyUgcSafetyFilter(newItems);

      state.offset += fetchedRows.length;
      if (fetchedRows.length < state.limit) {
        state.hasMore = false;
      }

      if (newItems.length > 0) {
        window.__scopedUserFilteredFeedsMap[state.targetAuthor] = currentArr.concat(newItems);
        var appendedHtml = newItems.map(function(item) {
          return window.__buildUserCollectionFeedRowHtml(item, state.targetAuthor, state.targetUserId);
        }).join('');
        container.insertAdjacentHTML('beforeend', appendedHtml);
      }
    } catch (err) {
      console.warn('[romantic-history.js:__handleUserCollectionScroll]', err);
    } finally {
      state.isLoading = false;
    }
  };

  window.openRouterProfileMoreMenu = function(userId, nickname, feedId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var sUserId = String(userId || '').trim();
    var sNick = String(nickname || '').trim();
    var sFeedId = String(feedId || '').trim();
    if (sUserId && window.isCurrentUserId && window.isCurrentUserId(sUserId)) return;

    var followKey = sUserId || sNick;
    var followingList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_following_users', [])
      : safeGetJSON('okbm_following_users', []);
    var isFollowing = Boolean(followKey && Array.isArray(followingList) && followingList.indexOf(followKey) !== -1);

    var old = document.getElementById('ugcSafetyMenuSheet');
    if (old) old.remove();

    var sheet = document.createElement('div');
    sheet.id = 'ugcSafetyMenuSheet';
    sheet.style.cssText = 'position:fixed; inset:0; z-index:2147483645 !important; background:rgba(0,0,0,0.78); display:flex; justify-content:center; align-items:flex-end; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);';
    sheet.onclick = function(ev) { if (ev.target === sheet) sheet.remove(); };

    var rowBtn = 'width:100%; height:46px; background:#111111; border:none; border-radius:10px; color:#e2e8f0; font-size:0.84rem; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:10px; padding:0 14px;';

    var unfollowRow = '<button type="button" data-user-id="' + escapeHtml(sUserId) + '" data-author="' + escapeHtml(sNick) + '" onclick="document.getElementById(\'ugcSafetyMenuSheet\') && document.getElementById(\'ugcSafetyMenuSheet\').remove(); window.__unfollowRouterFromProfileMenu(this.dataset.userId, this.dataset.author, event);" style="' + rowBtn + (isFollowing ? '' : ' color:#94a3b8;') + '">' +
      '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/></svg>' +
      '<span>관심삭제</span>' +
    '</button>';

    var blockRow = sUserId
      ? '<button type="button" data-user-id="' + escapeHtml(sUserId) + '" data-author="' + escapeHtml(sNick) + '" onclick="document.getElementById(\'ugcSafetyMenuSheet\') && document.getElementById(\'ugcSafetyMenuSheet\').remove(); window.blockCommunityUser(this.dataset.userId, this.dataset.author);" style="' + rowBtn + '">' +
          '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h.5"/><path d="M16 16l5 5"/><path d="M21 16l-5 5"/></svg>' +
          '<span>차단</span>' +
        '</button>'
      : '';

    var reportRow = '<button type="button" data-feed-id="' + escapeHtml(sFeedId) + '" data-user-id="' + escapeHtml(sUserId) + '" onclick="document.getElementById(\'ugcSafetyMenuSheet\') && document.getElementById(\'ugcSafetyMenuSheet\').remove(); window.__reportRouterFromProfileMenu(this.dataset.feedId, this.dataset.userId);" style="' + rowBtn + '">' +
      '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' +
      '<span>신고</span>' +
    '</button>';

    sheet.innerHTML = '<div style="width:100%; max-width:440px; background:#000000; border:none; border-radius:18px 18px 0 0; padding:16px 16px calc(72px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;" onclick="event.stopPropagation();">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:8px;">' +
        '<span style="font-size:0.86rem; font-weight:900; color:#ffffff;">더보기</span>' +
        '<button type="button" onclick="document.getElementById(\'ugcSafetyMenuSheet\').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>' +
      '</div>' +
      unfollowRow +
      blockRow +
      reportRow +
      '<button type="button" onclick="document.getElementById(\'ugcSafetyMenuSheet\').remove();" style="width:100%; height:42px; background:#111111; border:none; border-radius:10px; color:#94a3b8; font-size:0.78rem; font-weight:800; cursor:pointer; margin-top:2px;">취소</button>' +
    '</div>';

    document.body.appendChild(sheet);
  };

  window.__unfollowRouterFromProfileMenu = function(userId, nickname, e) {
    var sUserId = String(userId || '').trim();
    var sNick = String(nickname || '').trim();
    var followKey = sUserId || sNick;
    var followingList = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
      ? window.RomanticVault.read('okbm_following_users', [])
      : safeGetJSON('okbm_following_users', []);
    var isFollowing = Boolean(followKey && Array.isArray(followingList) && followingList.indexOf(followKey) !== -1);
    if (!isFollowing) {
      if (typeof showToast === 'function') showToast('관심 등록된 루터가 아닙니다.', 'info', 1800);
      return;
    }
    if (typeof window.toggleFollowUser === 'function') {
      window.toggleFollowUser(sUserId, sNick, e);
    }
  };

  window.__reportRouterFromProfileMenu = function(feedId, userId) {
    var sFeedId = String(feedId || '').trim();
    if (!sFeedId) {
      var scopedMap = window.__scopedUserFilteredFeedsMap || {};
      var lists = Object.keys(scopedMap).map(function(k) { return scopedMap[k]; });
      for (var i = 0; i < lists.length; i++) {
        if (Array.isArray(lists[i]) && lists[i][0] && lists[i][0].id) {
          sFeedId = String(lists[i][0].id).trim();
          break;
        }
      }
    }
    if (!sFeedId && typeof showToast === 'function') {
      showToast('신고할 기록을 찾을 수 없습니다.', 'warn', 1800);
      return;
    }
    if (typeof window.openFeedReportModal === 'function') {
      window.openFeedReportModal(sFeedId, userId);
    }
  };

  window.openUserFeedCollectionModal = function(authorName, userId, initialTab, isRestored) {
    if (!authorName && !userId) return;
    triggerHaptic(12);

    var followedModal = document.getElementById('followedRoutersModal');
    if (!isRestored && followedModal) {
      window.recordModalHistoryStep('followedRoutersModal', function() {
        if (typeof window.openFollowedRoutersModal === 'function') window.openFollowedRoutersModal(true);
      });
      followedModal.remove();
    }

    var blockedModal = document.getElementById('blockedUsersManageModal');
    if (!isRestored && blockedModal) {
      window.recordModalHistoryStep('blockedUsersManageModal', function() {
        window.__okbmInspectBlockedUserId = '';
        var settingsEl = document.getElementById('userAccountSettingsModal');
        if (settingsEl) settingsEl.style.display = 'flex';
        if (typeof window.openBlockedUsersModal === 'function') window.openBlockedUsersModal();
      });
      blockedModal.remove();
      var settingsHide = document.getElementById('userAccountSettingsModal');
      if (settingsHide) settingsHide.style.display = 'none';
    }

    var old = document.getElementById('userFeedCollectionModal');
    if (old) old.remove();

    var targetAuthor = String(authorName || '').trim();
    var targetUserId = String(userId || '').trim();

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    if (!myUserId) {
      try { myUserId = (typeof window.okbmGetCurrentUserId === 'function') ? String(window.okbmGetCurrentUserId() || '').trim() : ''; } catch (eSelf) { myUserId = ''; }
    }
    var followKey = targetUserId || targetAuthor;
    var followingList = safeGetJSON('okbm_following_users', []);
    var isFollowing = followingList.includes(followKey);
    var isSelf = Boolean(myUserId && targetUserId && myUserId === targetUserId);
    if (targetUserId && myUserId && targetUserId !== myUserId) isSelf = false;

    var localPool = [];
    if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
      localPool = localPool.concat(window.__allLoadedFeeds);
    }
    if (Array.isArray(window.interactiveHistory)) {
      localPool = localPool.concat(window.interactiveHistory);
    }

    var matchedFeeds = localPool.filter(function(f) {
      if (!f) return false;
      var fUserId = String(f.userId || f.user_id || '').trim();
      var fAuthor = String(f.author || f.nick || f.nickname || '').trim();
      if (targetUserId) return Boolean(fUserId && targetUserId === fUserId);
      if (targetAuthor && fAuthor && targetAuthor === fAuthor) return true;
      return false;
    }).map(function(item, idx) {
      var norm = window.normalizeHistoryRecord(item, idx);
      norm._isLocalOwner = isSelf;
      return norm;
    });

    matchedFeeds = window.okbmApplyUgcSafetyFilter(matchedFeeds);

    var dedupMap = new Map();
    matchedFeeds.forEach(function(item) {
      var sId = String(item.id).trim();
      if (sId && !dedupMap.has(sId)) dedupMap.set(sId, item);
    });
    var initialRenderList = Array.from(dedupMap.values()).sort(function(a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    window.__scopedUserFilteredFeedsMap = window.__scopedUserFilteredFeedsMap || {};
    window.__scopedUserFilteredFeedsMap[targetAuthor] = initialRenderList.slice();

    window.__userCollectionPagingState = {
      targetAuthor: targetAuthor,
      targetUserId: targetUserId,
      offset: initialRenderList.length,
      limit: 10,
      hasMore: true,
      isLoading: false
    };

    var repSnsBadgeHtml = '';
    if (isSelf) {
      var selfInsta = localStorage.getItem('okbm_user_instagram') || '';
      var selfYt = localStorage.getItem('okbm_user_youtube') || '';
      var selfBlog = localStorage.getItem('okbm_user_blog') || '';
      var selfSns = localStorage.getItem('okbm_user_sns_channel') || '';
      if (typeof window.renderUserSnsBadgesHtml === 'function') {
        repSnsBadgeHtml = window.renderUserSnsBadgesHtml(selfInsta, selfYt, selfBlog, true, selfSns);
      }
    } else {
      var otherInsta = '';
      var otherYt = '';
      var otherBlog = '';
      initialRenderList.forEach(function(f) {
        if (!otherInsta && (f.instagram || f.insta || f.instaId)) otherInsta = f.instagram || f.insta || f.instaId;
        if (!otherYt && (f.youtube || f.youtubeUrl)) otherYt = f.youtube || f.youtubeUrl;
        if (!otherBlog && (f.blog || f.blogUrl)) otherBlog = f.blog || f.blogUrl;
      });
      if (typeof window.renderUserSnsBadgesHtml === 'function') {
        repSnsBadgeHtml = window.renderUserSnsBadgesHtml(otherInsta, otherYt, otherBlog, false, '');
      }
    }

    var firstFeedId = (initialRenderList[0] && initialRenderList[0].id) ? String(initialRenderList[0].id).trim() : '';
    var followBtnHtml = '';
    var moreBtnHtml = '';
    var noteBtnHtml = '';
    if (!isSelf) {
      var canNote = Boolean(targetUserId) && !(typeof window.isUserBlocked === 'function' && window.isUserBlocked(targetUserId));
      if (canNote) {
        noteBtnHtml = '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.openDirectMessageThread(this.dataset.userId, this.dataset.author);" style="background:rgba(56,189,248,0.14); border:1px solid rgba(56,189,248,0.4); color:#7dd3fc; padding:5px 12px; border-radius:14px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">쪽지</button>';
      }
      followBtnHtml = isFollowing
        ? '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.15); border:1px solid #34d399; color:#34d399; padding:5px 12px; border-radius:14px; font-size:0.78rem; font-weight:900; cursor:pointer; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>관심</span></button>'
        : '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:5px 12px; border-radius:14px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>관심</span></button>';
      moreBtnHtml = '<button type="button" data-user-id="' + escapeHtml(targetUserId) + '" data-author="' + escapeHtml(targetAuthor) + '" data-feed-id="' + escapeHtml(firstFeedId) + '" onclick="window.openRouterProfileMoreMenu(this.dataset.userId, this.dataset.author, this.dataset.feedId, event);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#94a3b8; flex-shrink:0; padding:0;" title="더보기">' +
        '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
      '</button>';
    }

    var cardsHtml = '';
    if (initialRenderList.length === 0) {
      cardsHtml = '<div style="width:100%; padding:60px 20px; text-align:center; color:#94a3b8; font-size:0.80rem;">등록된 낭만루트 기록이 없습니다.</div>';
    } else {
      cardsHtml = initialRenderList.map(function(f) {
        return window.__buildUserCollectionFeedRowHtml(f, targetAuthor, targetUserId);
      }).join('');
    }

    var myCoverUrl = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
    var initialPhotoUrl = '';
    if (targetUserId && typeof window.resolveUserMasterPhoto === 'function') {
      initialPhotoUrl = String(window.resolveUserMasterPhoto(targetUserId, targetAuthor, '') || '').trim();
    }
    if (!initialPhotoUrl && initialRenderList.length > 0) {
      for (var pSearchIdx = 0; pSearchIdx < initialRenderList.length; pSearchIdx++) {
        var pItem = initialRenderList[pSearchIdx];
        if (pItem && pItem.authorPhoto && String(pItem.authorPhoto).startsWith('http')) {
          var candidatePhoto = String(pItem.authorPhoto).trim();
          if (!isSelf && myCoverUrl && candidatePhoto === myCoverUrl) continue;
          initialPhotoUrl = candidatePhoto;
          break;
        }
      }
    }
    if (!isSelf && myCoverUrl && initialPhotoUrl === myCoverUrl) {
      initialPhotoUrl = '';
    }

    var modalEl = document.createElement('div');
    modalEl.id = 'userFeedCollectionModal';
    modalEl.dataset.author = targetAuthor;
    modalEl.dataset.userId = targetUserId;
    var inspectBlocked = Boolean(window.__okbmInspectBlockedUserId && String(window.__okbmInspectBlockedUserId).trim() === targetUserId);
    if (inspectBlocked) modalEl.dataset.fromBlocked = '1';
    var collectionZ = inspectBlocked ? '2147483645' : '2147483642';
    modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; max-height:none !important; width:100%; max-width:100%; background:#000000; z-index:' + collectionZ + ' !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    modalEl.innerHTML = `
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(10px + max(47px, env(safe-area-inset-top, 0px))); box-sizing:border-box; z-index:10;">
        <div style="display:flex; align-items:center; gap:8px; min-width:0;">
          <button type="button" onclick="window.goBackModal(event);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:28px; height:28px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">◀</button>
          <span style="font-size:0.92rem; font-weight:900; color:#ffffff; flex-shrink:0;">루터 정보</span>
          <span id="userModalRouteCountBadge" style="font-size:0.65rem; color:#38bdf8; font-weight:800; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:5px; border:1px solid rgba(56,189,248,0.3); flex-shrink:0;">기록 (${initialRenderList.length})</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
          ${noteBtnHtml}
          ${followBtnHtml}
          ${moreBtnHtml}
        </div>
      </div>

      <div id="userCollectionHeaderWrapper" style="flex-shrink:0; width:100%; max-width:480px; margin:0 auto; box-sizing:border-box; z-index:9;">
        ${(typeof window.renderUserProfileHeaderSection === 'function') ? window.renderUserProfileHeaderSection({
          isOwner: isSelf,
          userId: targetUserId,
          nickname: targetAuthor,
          bio: isSelf ? ((profile && profile.bio) || localStorage.getItem('okbm_user_bio') || '') : '',
          photoUrl: initialPhotoUrl,
          instagram: isSelf ? (localStorage.getItem('okbm_user_instagram') || '') : otherInsta,
          youtube: isSelf ? (localStorage.getItem('okbm_user_youtube') || '') : otherYt,
          blog: isSelf ? (localStorage.getItem('okbm_user_blog') || '') : otherBlog,
          snsChannel: isSelf ? (localStorage.getItem('okbm_user_sns_channel') || '') : '',
          feedCount: initialRenderList.length,
          isFollowing: isFollowing
        }) : ''}
      </div>

      <div id="userModalCardsContainer" onscroll="window.__handleUserCollectionScroll(this);" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; padding:12px 12px calc(80px + env(safe-area-inset-bottom, 8px)) 12px; display:flex; flex-direction:column; gap:8px; box-sizing:border-box;">
        ${cardsHtml}
      </div>
    `;

    document.body.appendChild(modalEl);
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }

    var targetUrl = window.SUPABASE_URL || '';
    var targetKey = window.SUPABASE_ANON_KEY || '';

    if (!targetUserId && initialRenderList.length > 0) {
      for (var fIdx = 0; fIdx < initialRenderList.length; fIdx++) {
        var cand = initialRenderList[fIdx];
        if (cand && (cand.userId || cand.user_id)) {
          targetUserId = String(cand.userId || cand.user_id).trim();
          break;
        }
      }
    }

    if (targetUrl && targetKey && targetUserId) {
      var headerProfileReq = (typeof window.okbmFetchPublicProfile === 'function')
        ? window.okbmFetchPublicProfile(targetUserId)
        : fetch(targetUrl + '/rest/v1/rpc/get_public_profile', {
            method: 'POST',
            headers: {
              'apikey': targetKey,
              'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_id: targetUserId })
          }).then(function(r) { return r.ok ? r.json() : null; });
      Promise.resolve(headerProfileReq)
      .then(function(uRow) {
        if (uRow && uRow.id) {
          var fetchedBio = String(uRow.bio || '').trim();
          var fetchedPhoto = String(uRow.hero_cover_url || uRow.photo_url || '').trim();
          var fetchedNick = String(uRow.nickname || targetAuthor).trim();
          var fetchedGears = (uRow.my_gears && typeof uRow.my_gears === 'object') ? uRow.my_gears : {};
          var fetchedSns = (fetchedGears.sns && typeof fetchedGears.sns === 'object') ? fetchedGears.sns : {};

          var remoteInsta = fetchedSns.instagram || uRow.instagram || otherInsta;
          var remoteYt = fetchedSns.youtube || uRow.youtube || otherYt;
          var remoteBlog = fetchedSns.blog || uRow.blog || otherBlog;

          var livePhotoUrl = (fetchedPhoto && fetchedPhoto.startsWith('http')) ? fetchedPhoto : initialPhotoUrl;
          if (!isSelf && myCoverUrl && livePhotoUrl === myCoverUrl) livePhotoUrl = '';
          if (targetUserId && livePhotoUrl && livePhotoUrl.startsWith('http')) {
            window.__userProfilePhotoMap = window.__userProfilePhotoMap || {};
            window.__userProfilePhotoMap[targetUserId] = livePhotoUrl;
          }

          var wrapEl = document.getElementById('userCollectionHeaderWrapper');
          if (wrapEl && typeof window.renderUserProfileHeaderSection === 'function') {
            var liveConfig = {
              isOwner: isSelf,
              userId: targetUserId,
              nickname: isSelf ? targetAuthor : fetchedNick,
              bio: isSelf ? ((profile && profile.bio) || localStorage.getItem('okbm_user_bio') || '') : fetchedBio,
              photoUrl: livePhotoUrl,
              instagram: isSelf ? (localStorage.getItem('okbm_user_instagram') || '') : remoteInsta,
              youtube: isSelf ? (localStorage.getItem('okbm_user_youtube') || '') : remoteYt,
              blog: isSelf ? (localStorage.getItem('okbm_user_blog') || '') : remoteBlog,
              snsChannel: isSelf ? (localStorage.getItem('okbm_user_sns_channel') || '') : '',
              feedCount: initialRenderList.length,
              isFollowing: isFollowing
            };
            wrapEl.innerHTML = window.renderUserProfileHeaderSection(liveConfig);
          }
        }
      }).catch(function() {});
    }

    if (targetUrl && targetKey && (targetUserId || targetAuthor)) {
      var filterParam = targetUserId
        ? ('user_id=eq.' + encodeURIComponent(targetUserId))
        : ('author=eq.' + encodeURIComponent(targetAuthor));

      var countQuery = targetUrl + '/rest/v1/feeds?' + filterParam + '&select=id';
      if (!isSelf) {
        countQuery += '&is_published=eq.true';
      }

      fetch(countQuery, {
        method: 'HEAD',
        headers: {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Prefer': 'count=exact'
        }
      }).then(function(res) {
        var cr = res.headers.get('content-range');
        if (cr && cr.includes('/')) {
          var totalCount = cr.split('/')[1];
          var badgeEl = document.getElementById('userModalRouteCountBadge');
          if (totalCount && totalCount !== '*' && badgeEl) {
            badgeEl.innerText = '기록 (' + totalCount + ')';
          }
        }
      }).catch(function() {});

      var fetchQuery = targetUrl + '/rest/v1/feeds?' + filterParam + '&order=date.desc,created_at.desc&offset=0&limit=10';
      if (!isSelf) {
        fetchQuery += '&is_published=eq.true';
      }

      fetch(fetchQuery, {
        headers: {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json'
        }
      }).then(function(r) { return r.ok ? r.json() : []; }).then(function(serverRows) {
        if (Array.isArray(serverRows) && serverRows.length > 0) {
          var serverNormalized = serverRows.map(function(row, sIdx) {
            var norm = window.normalizeHistoryRecord(row, sIdx);
            norm._isLocalOwner = isSelf;
            return norm;
          });

          window.__scopedUserFilteredFeedsMap[targetAuthor] = serverNormalized;
          window.__userCollectionPagingState.offset = serverRows.length;
          window.__userCollectionPagingState.hasMore = (serverRows.length >= 10);

          var container = document.getElementById('userModalCardsContainer');
          if (container) {
            container.innerHTML = serverNormalized.map(function(f) {
              return window.__buildUserCollectionFeedRowHtml(f, targetAuthor, targetUserId);
            }).join('');
          }
        }
      }).catch(function() {});
    }
  };

  
// 📖 [백패킹/캠핑 피드 상세 듀얼 뷰 - 현재 스크롤 피드 실시간 추적 & 수정 100% 바인딩]
  window.openSingleTripDualFeedModal = function(recordId, scopedFeedList, contextTitle) {
    var pastTripsEl = document.getElementById('pastTripsListModal');
    var userCollEl = document.getElementById('userFeedCollectionModal');
    var savedFeedsEl = document.getElementById('savedFeedsListModal') || document.getElementById('savedFeedsEmptyModal');

    if (pastTripsEl) {
      window.recordModalHistoryStep('pastTripsListModal', function() {
        if (typeof window.openPastTripsListModal === 'function') window.openPastTripsListModal(true);
      });
      pastTripsEl.remove();
    } else if (userCollEl) {
      var savedAuthor = contextTitle || userCollEl.dataset.author || '';
      var savedUserId = userCollEl.dataset.userId || '';
      window.recordModalHistoryStep('userFeedCollectionModal', function() {
        if (typeof window.openUserFeedCollectionModal === 'function') window.openUserFeedCollectionModal(savedAuthor, savedUserId, 'route', true);
      });
      userCollEl.remove();
    } else if (savedFeedsEl || contextTitle === '관심피드') {
      window.recordModalHistoryStep('savedFeedsListModal', function() {
        if (typeof window.openSavedFeedsModal === 'function') window.openSavedFeedsModal(true);
      });
      if (savedFeedsEl) savedFeedsEl.remove();
    }

    var sId = String(recordId || '').trim();
    var logs = [];
    if (Array.isArray(scopedFeedList) && scopedFeedList.length > 0) {
      logs = scopedFeedList.slice();
    }

    var targetRec = logs.find(function(r) { return r && String(r.id).trim() === sId; });
    if (!targetRec && typeof window.okbmFindFeedRecord === 'function') {
      targetRec = window.okbmFindFeedRecord(sId);
    }
    if (!targetRec) {
      var allPool = (window.__allLoadedFeeds || []).concat(window.interactiveHistory || []).concat(window.safeGetStorage('okbm_packing_history', []) || []).concat((typeof safeGetJSON === 'function' ? safeGetJSON('okbm_cached_community_feeds', []) : []) || []);
      targetRec = allPool.find(function(r) { return r && String(r.id).trim() === sId; });
    }

    var adminInspect = contextTitle === '__admin';

    if (!targetRec && typeof window.okbmOpenDirectFeed === 'function') {
      window.okbmOpenDirectFeed(sId, adminInspect);
      return;
    }

    if (logs.length === 0 && targetRec) {
      var pool = (window.__allLoadedFeeds && window.__allLoadedFeeds.length > 0) ? window.__allLoadedFeeds : ((window.interactiveHistory && window.interactiveHistory.length > 0) ? window.interactiveHistory : (window.safeGetStorage('okbm_packing_history', []) || []));
      logs = pool.slice();
    }

    if (!adminInspect) {
      logs = window.okbmApplyUgcSafetyFilter(logs);
    }

    if (targetRec && !logs.some(function(r) { return String(r.id).trim() === sId; })) {
      if (adminInspect || !(typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc(targetRec))) {
        logs.unshift(targetRec);
      }
    }

    if (!adminInspect && targetRec && typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc(targetRec)) {
      if (typeof showToast === 'function') showToast('숨김 처리된 피드입니다.', 'info', 1800);
      return;
    }

    if (logs.length === 0) {
      if (typeof showToast === 'function') showToast('선택한 기록을 찾을 수 없습니다.', 'warn');
      return;
    }

    var startIdx = logs.findIndex(function(r) { return String(r.id).trim() === String(recordId).trim(); });
    if (startIdx === -1) startIdx = 0;

    window.__currentActiveDualFeedId = String(logs[startIdx].id);

    var old = document.getElementById('singleTripFeedModal');
    if (old) old.remove();

    var allCardsHtml = logs.map(function(item) {
      return window.buildSingleFeedCardHtml(item);
    }).join('');

    var feedModal = document.createElement('div');
    feedModal.id = 'singleTripFeedModal';
    var feedZ = adminInspect ? '2147483646' : '2147483643';
    var chromeZ = adminInspect ? '2147483647' : '2147483644';
    feedModal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; max-height:none !important; width:100%; max-width:100%; background:#000000; z-index:' + feedZ + ' !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    feedModal.innerHTML = `
      <div id="dualFeedChromeBar" style="position:absolute; top:max(47px, env(safe-area-inset-top, 0px)); left:0; right:0; max-width:440px; margin:0 auto; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; z-index:` + chromeZ + `; pointer-events:none; box-sizing:border-box;">
        <button type="button" onclick="window.goBackModal(event);" style="pointer-events:auto; background:#0c1017; border:1px solid rgba(255,255,255,0.2); color:#ffffff; width:32px; height:32px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); padding:0;">◀</button>
        
        <div style="pointer-events:auto; display:flex; align-items:center; gap:6px;">
          <div id="btnFloatUgcSafety" style="display:none; align-items:center; gap:6px;"></div>
          <button type="button" id="btnFloatFeedMore" onclick="window.__triggerCurrentFeedMoreMenu(event);" style="background:#0c1017; border:1px solid rgba(255,255,255,0.2); color:#ffffff; width:32px; height:32px; border-radius:50%; font-size:0.85rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); padding:0;" title="더보기">
            <svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
          </button>
        </div>
      </div>

      <div id="dualFeedScrollContainer" onscroll="window.__onDualFeedContainerScroll(this);" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y !important; overscroll-behavior-y:contain; contain:content; padding:calc(48px + max(47px, env(safe-area-inset-top, 0px))) 0 16px 0; display:flex; flex-direction:column; box-sizing:border-box;">
        <div id="dualFeedCardsWrapper">
          ${allCardsHtml}
        </div>
      </div>
    `;
    document.body.appendChild(feedModal);
    if (typeof window.applySmartPhotoFit === 'function') {
      feedModal.querySelectorAll('.reel-photo-target').forEach(function(img) {
        window.applySmartPhotoFit(img);
      });
    }
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }
    if (typeof window.okbmBindOverlayViewportFit === 'function') {
      window.okbmBindOverlayViewportFit(feedModal, { reserveDock: true });
    }

    window.__syncDualFeedUgcChrome = function(curRecord) {
      var moreBtn = document.getElementById('btnFloatFeedMore');
      var safetyWrap = document.getElementById('btnFloatUgcSafety');
      if (moreBtn) moreBtn.style.display = 'flex';
      if (safetyWrap) {
        safetyWrap.innerHTML = '';
        safetyWrap.style.display = 'none';
      }
    };

   window.__onDualFeedContainerScroll = function(container) {
      if (!container) return;
      var cards = container.querySelectorAll('.single-feed-block');
      var containerCenter = container.scrollTop + (container.clientHeight / 2);
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if (containerCenter >= c.offsetTop && containerCenter <= (c.offsetTop + c.offsetHeight)) {
          var fId = c.dataset.recordId;
          if (fId) {
            window.__currentActiveDualFeedId = String(fId);
            var curRecord = (logs || []).find(function(r) { return r && String(r.id).trim() === String(fId).trim(); });
            if (!curRecord && typeof window.okbmFindFeedRecord === 'function') {
              curRecord = window.okbmFindFeedRecord(fId);
            }
            if (!curRecord) {
              curRecord = (window.interactiveHistory || []).find(function(r) { return r && String(r.id).trim() === String(fId).trim(); });
            }
            window.__syncDualFeedUgcChrome(curRecord);
          }
          break;
        }
      }
    };

    window.__syncDualFeedUgcChrome(logs[startIdx]);

    window.__findCurrentDualFeedRecord = function() {
      var curId = window.__currentActiveDualFeedId;
      var targetLog = (logs || []).find(function(r) { return r && String(r.id).trim() === String(curId).trim(); });
      if (!targetLog && typeof window.okbmFindFeedRecord === 'function') {
        targetLog = window.okbmFindFeedRecord(curId);
      }
      if (!targetLog) {
        targetLog = (window.interactiveHistory || []).find(function(r) { return r && String(r.id).trim() === String(curId).trim(); });
      }
      return targetLog || null;
    };

    window.__triggerCurrentFeedMoreMenu = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      triggerHaptic(10);
      var targetLog = window.__findCurrentDualFeedRecord();
      if (!targetLog) {
        if (typeof showToast === 'function') showToast('대상을 찾을 수 없습니다.', 'warn');
        return;
      }
      var isOwn = Boolean(window.isRecordOwner && window.isRecordOwner(targetLog));
      if (isOwn && typeof window.openTripActionMenu === 'function') {
        window.openTripActionMenu(targetLog.id, e);
        return;
      }
      if (typeof window.openUgcSafetyMenu === 'function') {
        window.openUgcSafetyMenu(targetLog.id, targetLog.userId || targetLog.user_id, targetLog.author || targetLog.nick || targetLog.nickname, e);
      }
    };

    window.__triggerEditCurrentActiveFeed = function() {
      triggerHaptic(10);
      var targetLog = window.__findCurrentDualFeedRecord();
      if (targetLog) {
        if (!window.isRecordOwner(targetLog)) {
          if (typeof showToast === 'function') showToast('본인이 작성한 기록만 수정할 수 있습니다.', 'warn', 2200, { html: HISTORY_TOAST_VEC.lock });
          return;
        }
        window.openRichAfterTripModal(targetLog);
      } else {
        if (typeof showToast === 'function') showToast('수정할 대상을 찾을 수 없습니다.', 'warn');
      }
    };

    setTimeout(function() {
      var targetCard = feedModal.querySelector('[data-record-id="' + recordId + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }, 40);

    triggerHaptic(12);
  };

/// [대형 사진 스와이프 뷰어 & 모바일 createObjectURL 초고속 1200px 다중 압축 엔진 - 상태 머신 락 적용]
  window.__isPhotoCompressing = false;

  window.__handleRichMultiPhotoUpload = async function(event) {
    var inputEl = event.target;
    var files = inputEl.files;
    if (!files || files.length === 0) return;

    window.__tempUploadedPhotos = window.__tempUploadedPhotos || [];
    window.__tempPhotoMemos = window.__tempPhotoMemos || [];

    var photoLimit = 10;
    var currentCount = window.__tempUploadedPhotos.length;
    var maxSlots = photoLimit - currentCount;

    if (maxSlots <= 0) {
      if (typeof showToast === 'function') showToast('낭만루트는 최대 10장까지 등록 가능합니다.', 'warn');
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
    triggerHaptic(10);

    // 🔒 [비동기 락 활성화]: 압축 중에는 저장 버튼 비활성화 (타이밍 역전 100% 차단)
    window.__isPhotoCompressing = true;
    var submitBtn = document.getElementById('btnSubmitRichTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.innerText = '사진 준비 중...';
    }

    var stageContainer = document.getElementById('richLargePhotoStageContainer');
    var loaderEl = null;

    if (stageContainer) {
      loaderEl = document.createElement('div');
      loaderEl.id = 'richPhotoProcessingLoader';
      loaderEl.style.cssText = 'position:absolute; inset:0; z-index:99; background:#0c1017; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; border-radius:14px; pointer-events:all;';
      loaderEl.innerHTML = `
        <svg viewBox="0 0 24 24" style="width:34px; height:34px; animation:spin 1s linear infinite;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" stroke="rgba(56,189,248,0.2)" stroke-width="2.2"/>
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <div id="richPhotoLoadingStatusText" style="font-size:0.80rem; font-weight:800; color:#e2e8f0; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.01em;">
          사진 0/${filesToProcess.length}장 최적화 중...
        </div>
      `;
      var currentStageBox = stageContainer.firstElementChild;
      if (currentStageBox) {
        currentStageBox.style.position = 'relative';
        currentStageBox.appendChild(loaderEl);
      } else {
        stageContainer.style.position = 'relative';
        stageContainer.appendChild(loaderEl);
      }
    }

    var compressAndUploadSingleFile = async function(file, idx) {
      try {
        var blob = null;
        if (typeof window.processSinglePhotoSmart === 'function') {
          blob = await window.processSinglePhotoSmart(file, { maxDim: 1200, quality: 0.82 });
        }
        if (!blob) return '';

        var statusText = document.getElementById('richPhotoLoadingStatusText');
        if (statusText) {
          statusText.innerText = '사진 ' + (idx + 1) + '/' + filesToProcess.length + '장 업로드 중...';
        }

        var httpsUrl = '';
        if (typeof window.uploadCompressedPhotoToR2 === 'function') {
          httpsUrl = await window.uploadCompressedPhotoToR2(blob, 'rich');
        }
        if (httpsUrl && httpsUrl.indexOf('https://') === 0) {
          if (statusText) {
            statusText.innerText = '사진 ' + (idx + 1) + '/' + filesToProcess.length + '장 완료';
          }
          return httpsUrl;
        }
      } catch (upErr) {
        console.warn('[romantic-history.js:compressAndUploadSingleFile]', upErr);
      }
      return '';
    };

    try {
      var doneCount = 0;
      var firstPainted = false;
      var uploadPromises = filesToProcess.map(function(file, i) {
        return compressAndUploadSingleFile(file, i).then(function(httpsUrl) {
          doneCount++;
          if (httpsUrl && httpsUrl.indexOf('https://') === 0) {
            window.__tempUploadedPhotos.push(httpsUrl);
            window.__tempPhotoMemos.push('');
            window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
            if (!firstPainted) {
              firstPainted = true;
              if (loaderEl && loaderEl.parentNode) loaderEl.remove();
              loaderEl = null;
            }
            if (typeof window.__renderRichPhotoStage === 'function') {
              window.__renderRichPhotoStage();
            }
          }
          var statusText = document.getElementById('richPhotoLoadingStatusText');
          if (statusText) {
            statusText.innerText = '사진 ' + doneCount + '/' + filesToProcess.length + '장 처리됨';
          }
          if (submitBtn && window.__isPhotoCompressing) {
            submitBtn.innerText = '사진 ' + doneCount + '/' + filesToProcess.length + '...';
          }
          return httpsUrl;
        });
      });
      await Promise.all(uploadPromises);
    } finally {
      window.__isPhotoCompressing = false;
      if (loaderEl && loaderEl.parentNode) {
        loaderEl.remove();
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:13px; height:13px; flex-shrink:0;" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>저장</span>';
      }
      inputEl.value = '';
    }

    window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
    window.__renderRichPhotoStage();
    triggerHaptic(12);
  };

  window.__removeRichSinglePhoto = function(index) {
    if (window.__tempUploadedPhotos && window.__tempUploadedPhotos[index] !== undefined) {
      window.__tempUploadedPhotos.splice(index, 1);
      if (window.__tempPhotoMemos) window.__tempPhotoMemos.splice(index, 1);
      if (window.__currentSwipePhotoIndex >= window.__tempUploadedPhotos.length) {
        window.__currentSwipePhotoIndex = Math.max(0, window.__tempUploadedPhotos.length - 1);
      }
      window.__renderRichPhotoStage();
      triggerHaptic(8);
    }
  };

  window.__clearAllRichPhotos = function() {
    window.__tempUploadedPhotos = [];
    window.__tempPhotoMemos = [];
    window.__currentSwipePhotoIndex = 0;
    window.__renderRichPhotoStage();
    triggerHaptic(10);
  };

 window.__commitCurrentMemoInput = function() {
    var memoInput = document.getElementById('richFormMemoInput');
    if (!memoInput) return;
    var val = String(memoInput.value || '').slice(0, 120);
    if (window.__tempMemoMode === 'single') {
      window.__tempSingleMemo = val;
    } else {
      window.__tempPhotoMemos = window.__tempPhotoMemos || [];
      var curIdx = window.__currentSwipePhotoIndex || 0;
      window.__tempPhotoMemos[curIdx] = val;
    }
  };

  window.__onSwipePhotoTrackScroll = function(trackEl) {
    if (!trackEl) return;
    var scrollLeft = trackEl.scrollLeft;
    var width = trackEl.offsetWidth;
    if (!width) return;
    var newIdx = Math.round(scrollLeft / width);
    if (newIdx !== window.__currentSwipePhotoIndex && window.__tempUploadedPhotos[newIdx] !== undefined) {
      window.__commitCurrentMemoInput();
      window.__currentSwipePhotoIndex = newIdx;
      window.__syncActivePhotoMemoUI();
    }
  };

  window.__syncActivePhotoMemoUI = function() {
    var curIdx = window.__currentSwipePhotoIndex || 0;
    var memos = window.__tempPhotoMemos || [];
    var memoInput = document.getElementById('richFormMemoInput');
    var photoLabel = document.getElementById('richPhotoCountLabel');
    var photoIndexBadge = document.getElementById('richPhotoActiveIndexBadge');

    var currentText = (window.__tempMemoMode === 'single') ? (window.__tempSingleMemo || '') : (memos[curIdx] || '');
    if (memoInput) memoInput.value = currentText;
    window.__paintRichMemoCounter(currentText.length);
    if (photoIndexBadge) photoIndexBadge.innerText = (window.__tempUploadedPhotos.length > 0) ? ((curIdx + 1) + ' / ' + window.__tempUploadedPhotos.length) : '0 / 0';
    if (photoLabel) photoLabel.innerText = '등록된 사진 (' + (window.__tempUploadedPhotos ? window.__tempUploadedPhotos.length : 0) + '장 / 최대 10장)';

    var dotsWrap = document.getElementById('richSwipeDotsWrapper');
    if (dotsWrap) {
      var dots = dotsWrap.children;
      for (var d = 0; d < dots.length; d++) {
        if (d === curIdx) {
          dots[d].style.width = '14px';
          dots[d].style.background = '#38bdf8';
          dots[d].style.boxShadow = '0 0 8px rgba(56,189,248,0.8)';
        } else {
          dots[d].style.width = '5px';
          dots[d].style.background = 'rgba(255,255,255,0.3)';
          dots[d].style.boxShadow = 'none';
        }
      }
    }
  };

  window.__paintRichMemoCounter = function(len) {
    var charCounter = document.getElementById('richMemoCharCounter');
    if (!charCounter) return;
    var n = Number(len) || 0;
    charCounter.innerText = n + '/120자';
    if (window.__tempMemoMode === 'single') {
      charCounter.style.color = (n >= 30 && n <= 120) ? '#34d399' : '#38bdf8';
    } else {
      charCounter.style.color = '#38bdf8';
    }
  };

  window.__handleRichMemoInput = function(text) {
    var cleanText = String(text || '').slice(0, 120);
    if (window.__tempMemoMode === 'single') {
      window.__tempSingleMemo = cleanText;
    } else {
      var curIdx = window.__currentSwipePhotoIndex || 0;
      window.__tempPhotoMemos = window.__tempPhotoMemos || [];
      window.__tempPhotoMemos[curIdx] = cleanText;
    }
    window.__paintRichMemoCounter(cleanText.length);
  };

 // 🔄 [모바일 터치 & PC 마우스 듀얼 드래그 순서 재배치 엔진]
  window.__draggedThumbIdx = null;

  window.__handleThumbDragStart = function(e, idx) {
    window.__draggedThumbIdx = idx;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    }
    triggerHaptic(10);
  };

  window.__handleThumbDragOver = function(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    return false;
  };

  window.__handleThumbDrop = function(e, dropIdx) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();

    var fromIdx = window.__draggedThumbIdx;
    if (fromIdx !== null && fromIdx !== undefined && fromIdx !== dropIdx) {
      window.__commitCurrentMemoInput();

      var movedPhoto = window.__tempUploadedPhotos.splice(fromIdx, 1)[0];
      window.__tempUploadedPhotos.splice(dropIdx, 0, movedPhoto);

      if (window.__tempPhotoMemos) {
        var movedMemo = window.__tempPhotoMemos.splice(fromIdx, 1)[0] || '';
        window.__tempPhotoMemos.splice(dropIdx, 0, movedMemo);
      }

      window.__currentSwipePhotoIndex = dropIdx;
      window.__renderRichPhotoStage();
      triggerHaptic(14);
    }
    window.__draggedThumbIdx = null;
    return false;
  };

  window.__handleThumbDragEnd = function() {
    window.__draggedThumbIdx = null;
  };

  // 📱 [300ms 롱프레스 안전 락 모바일 터치 드래그 엔진]
  window.__touchStartThumbIdx = null;
  window.__isLongPressActive = false;
  window.__thumbLongPressTimer = null;
  window.__touchTargetThumbEl = null;

  window.__handleTouchThumbStart = function(e, idx) {
    window.__touchStartThumbIdx = idx;
    window.__isLongPressActive = false;
    window.__touchTargetThumbEl = e.currentTarget;

    var touch = e.touches[0];
    window.__touchStartX = touch.clientX;
    window.__touchStartY = touch.clientY;

    clearTimeout(window.__thumbLongPressTimer);
    window.__thumbLongPressTimer = setTimeout(function() {
      window.__isLongPressActive = true;
      triggerHaptic(25);

      if (window.__touchTargetThumbEl) {
        window.__touchTargetThumbEl.style.transform = 'scale(1.15)';
        window.__touchTargetThumbEl.style.borderColor = '#38bdf8';
        window.__touchTargetThumbEl.style.boxShadow = '0 0 16px rgba(56,189,248,0.9)';
        window.__touchTargetThumbEl.style.zIndex = '99';
      }
    }, 300);
  };

  window.__handleTouchThumbMove = function(e) {
    var touch = e.touches[0];
    var deltaX = Math.abs(touch.clientX - window.__touchStartX);
    var deltaY = Math.abs(touch.clientY - window.__touchStartY);

    if (!window.__isLongPressActive) {
      if (deltaX > 8 || deltaY > 8) {
        clearTimeout(window.__thumbLongPressTimer);
      }
      return;
    }

    if (e.cancelable) e.preventDefault();
  };

 // 🌊 [실크처럼 부드러운 스무스 사진 전환 & 깜빡임 0% 엔진]
  window.__switchToPhotoSmooth = function(targetIdx) {
    if (window.__currentSwipePhotoIndex === targetIdx) return;
    window.__commitCurrentMemoInput();
    window.__currentSwipePhotoIndex = targetIdx;

    var track = document.getElementById('richPhotoSwipeTrack');
    if (track) {
      var targetLeft = targetIdx * track.offsetWidth;
      track.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }

    var thumbNodes = document.querySelectorAll('#richPhotoThumbStrip [data-thumb-idx]');
    thumbNodes.forEach(function(node) {
      var nIdx = parseInt(node.dataset.thumbIdx, 10);
      var isCur = (nIdx === targetIdx);
      node.style.border = isCur ? '2.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.18)';
      node.style.boxShadow = isCur ? '0 0 12px rgba(56,189,248,0.85)' : 'none';
      node.style.transform = isCur ? 'scale(1.08)' : 'scale(1)';
      node.style.opacity = isCur ? '1' : '0.65';
      node.style.zIndex = isCur ? '3' : '1';
      if (isCur && node.scrollIntoView) {
        node.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    });

    window.__syncActivePhotoMemoUI();
    triggerHaptic(8);
  };

  window.__stepRichPhoto = function(delta) {
    var photos = window.__tempUploadedPhotos || [];
    if (!photos.length) return;
    var next = Math.max(0, Math.min(photos.length - 1, (window.__currentSwipePhotoIndex || 0) + (Number(delta) || 0)));
    window.__switchToPhotoSmooth(next);
  };

  window.__handleTouchThumbEnd = function(e) {
    clearTimeout(window.__thumbLongPressTimer);

    var fromIdx = window.__touchStartThumbIdx;
    var wasLongPress = window.__isLongPressActive;

    if (window.__touchTargetThumbEl) {
      window.__touchTargetThumbEl.style.transform = '';
      window.__touchTargetThumbEl.style.boxShadow = '';
      window.__touchTargetThumbEl.style.zIndex = '';
    }

    if (wasLongPress && fromIdx !== null && fromIdx !== undefined) {
      var touch = e.changedTouches[0];
      var elem = document.elementFromPoint(touch.clientX, touch.clientY);
      var thumbCard = elem ? elem.closest('[data-thumb-idx]') : null;

      if (thumbCard && thumbCard.dataset.thumbIdx !== undefined) {
        var toIdx = parseInt(thumbCard.dataset.thumbIdx, 10);
        if (fromIdx !== toIdx) {
          window.__commitCurrentMemoInput();

          var movedPhoto = window.__tempUploadedPhotos.splice(fromIdx, 1)[0];
          window.__tempUploadedPhotos.splice(toIdx, 0, movedPhoto);

          if (window.__tempPhotoMemos) {
            var movedMemo = window.__tempPhotoMemos.splice(fromIdx, 1)[0] || '';
            window.__tempPhotoMemos.splice(toIdx, 0, movedMemo);
          }

          window.__currentSwipePhotoIndex = toIdx;
          window.__renderRichPhotoStage();
          triggerHaptic(16);
          window.__touchStartThumbIdx = null;
          window.__isLongPressActive = false;
          window.__touchTargetThumbEl = null;
          return;
        }
      }
      window.__renderRichPhotoStage();
    } else if (fromIdx !== null && fromIdx !== undefined) {
      window.__switchToPhotoSmooth(fromIdx);
    }

    window.__touchStartThumbIdx = null;
    window.__isLongPressActive = false;
    window.__touchTargetThumbEl = null;
  };

  // 🗑️ [수정 화면 내부 직통 일지 & 피드 영구 삭제 파이프라인]
  window.onRichTripLinkBlur = function(kind) {
    var el = document.getElementById(kind === 'yt' ? 'richInputYoutube' : 'richInputNaverBlog');
    if (!el) return;
    var raw = String(el.value || '').trim();
    if (!raw) return;
    var clean = '';
    if (kind === 'yt' && typeof window._pastTripCleanYoutubeUrl === 'function') {
      clean = window._pastTripCleanYoutubeUrl(raw);
    } else if (kind === 'blog' && typeof window._pastTripCleanNaverBlogUrl === 'function') {
      clean = window._pastTripCleanNaverBlogUrl(raw);
    }
    if (clean) el.value = clean;
  };

  window.__deleteCurrentRichTrip = function(recordId) {
    if (!recordId) return;
    triggerHaptic(14);
    if (typeof window.deleteTripRecord === 'function') {
      window.deleteTripRecord(recordId);
    }
  };

  window.__renderRichPhotoStage = function() {
    var stageContainer = document.getElementById('richLargePhotoStageContainer');
    if (!stageContainer) return;

    var photos = window.__tempUploadedPhotos || [];
    var count = photos.length;

    if (count === 0) {
      stageContainer.innerHTML = `
        <div onclick="document.getElementById('richMultiPhotoInput').click();" style="width:100%; aspect-ratio:3/4; max-height:420px; border:1.5px dashed rgba(56,189,248,0.35); border-radius:14px; background:radial-gradient(circle at 50% 40%, #0e1726 0%, #06090e 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; cursor:pointer; box-sizing:border-box;">
          <div style="width:52px; height:52px; border-radius:50%; background:rgba(56,189,248,0.12); display:flex; align-items:center; justify-content:center; color:#38bdf8;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px; height:26px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <span style="font-size:0.90rem; font-weight:900; color:#38bdf8; letter-spacing:-0.02em;">현장 사진 추가하기</span>
        </div>
      `;
    } else {
      var slidesHtml = photos.map(function(url, pIdx) {
        var bindingAttr = ' data-okbm-photo-record-id="' + String(window.__richCurrentRecord && window.__richCurrentRecord.id || '') + '" data-okbm-photo-index="' + String(pIdx) + '" data-okbm-photo-kind="phone"';
        return `
          <div style="flex:0 0 100% !important; min-width:100% !important; max-width:100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center;">
            <img src="${escapeHtml(okbmSafeImageUrl(url))}"${bindingAttr} style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:blur(22px) brightness(0.32); transform:scale(1.15); pointer-events:none;" onerror="this.src='https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';" />
            <img src="${escapeHtml(okbmSafeImageUrl(url))}"${bindingAttr} style="position:relative; z-index:2; width:100%; height:100%; max-width:100%; max-height:100%; object-fit:contain; display:block; pointer-events:none;" onerror="this.src='https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';" />
            
            <button type="button" onclick="event.stopPropagation(); window.__removeRichSinglePhoto(${pIdx});" style="position:absolute; top:10px; right:10px; z-index:10; width:28px; height:28px; border-radius:50%; background:#0c1017; color:#cbd5e1; border:1px solid rgba(255,255,255,0.25); font-size:13px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
          </div>
        `;
      }).join('');

      // 📸 [선택 사진 명확한 고대비 외곽선 & 터치/마우스 드래그 썸네일 스트립]
      var dragThumbsHtml = photos.map(function(tUrl, tIdx) {
        var isCurrentView = (window.__currentSwipePhotoIndex === tIdx);
        var activeBorderStyle = isCurrentView
          ? 'border:2.5px solid #38bdf8; box-shadow:0 0 12px rgba(56,189,248,0.85); transform:scale(1.08); z-index:3;'
          : 'border:1px solid rgba(255,255,255,0.18); opacity:0.65;';

        return `
          <div data-thumb-idx="${tIdx}"
               draggable="true"
               ondragstart="window.__handleThumbDragStart(event, ${tIdx});"
               ondragover="window.__handleThumbDragOver(event);"
               ondrop="window.__handleThumbDrop(event, ${tIdx});"
               ondragend="window.__handleThumbDragEnd(event);"
               ontouchstart="window.__handleTouchThumbStart(event, ${tIdx});"
               ontouchmove="window.__handleTouchThumbMove(event);"
               ontouchend="window.__handleTouchThumbEnd(event);"
               onclick="window.__commitCurrentMemoInput(); window.__currentSwipePhotoIndex = ${tIdx}; window.__renderRichPhotoStage(); triggerHaptic(8);" 
               class="rich-photo-thumb"
               style="width:54px; height:54px; border-radius:9px; overflow:hidden; position:relative; flex:0 0 54px; cursor:grab; background:#000; box-sizing:border-box; transition:all 0.18s cubic-bezier(0.16, 1, 0.3, 1); user-select:none; -webkit-user-select:none; touch-action:pan-x; ${activeBorderStyle}">
            <img src="${escapeHtml(okbmSafeImageUrl(tUrl))}" data-okbm-photo-record-id="${escapeHtml(String(window.__richCurrentRecord && window.__richCurrentRecord.id || ''))}" data-okbm-photo-index="${tIdx}" data-okbm-photo-kind="phone" style="width:100%; height:100%; object-fit:cover; pointer-events:none; display:block;" onerror="this.src='https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';" />
            ${isCurrentView ? '<div style="position:absolute; inset:0; border:1px solid rgba(255,255,255,0.4); pointer-events:none; border-radius:7px;"></div>' : ''}
          </div>
        `;
      }).join('');

      var navBtnsHtml = count > 1 ? `
            <button type="button" onclick="event.stopPropagation(); window.__stepRichPhoto(-1);" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); z-index:10; width:32px; height:32px; border-radius:50%; background:rgba(12,16,23,0.78); color:#e2e8f0; border:1px solid rgba(255,255,255,0.22); font-size:1.05rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">‹</button>
            <button type="button" onclick="event.stopPropagation(); window.__stepRichPhoto(1);" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); z-index:10; width:32px; height:32px; border-radius:50%; background:rgba(12,16,23,0.78); color:#e2e8f0; border:1px solid rgba(255,255,255,0.22); font-size:1.05rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">›</button>
      ` : '';

      stageContainer.innerHTML = `
        <div class="rich-photo-frame" style="width:100%; min-width:0; max-width:100%; aspect-ratio:3/4; max-height:420px; position:relative; overflow:hidden; border-radius:14px; background:#000000; border:1px solid rgba(255,255,255,0.12); box-shadow:0 12px 30px rgba(0,0,0,0.9);">
          <div id="richPhotoSwipeTrack" onscroll="window.__onSwipePhotoTrackScroll(this);" style="display:flex !important; flex-wrap:nowrap !important; width:100% !important; min-width:0 !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important; overscroll-behavior-x:contain;">
            ${slidesHtml}
          </div>
          ${navBtnsHtml}
          ${count < 10 ? `
            <button type="button" onclick="document.getElementById('richMultiPhotoInput').click();" style="position:absolute; bottom:12px; right:12px; z-index:10; background:#0c1017; border:1px solid rgba(56,189,248,0.5); color:#38bdf8; font-size:0.72rem; font-weight:800; padding:6px 12px; border-radius:20px; cursor:pointer; display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:#38bdf8; fill:none; stroke-width:2.5;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>사진추가</span>
            </button>
          ` : ''}
        </div>

        <div id="richPhotoThumbStrip" class="rich-photo-thumb-strip" style="width:100%; min-width:0; max-width:100%; display:flex; flex-wrap:nowrap; gap:9px; overflow-x:auto; overflow-y:hidden; padding:10px 4px 6px 4px; -webkit-overflow-scrolling:touch; scrollbar-width:thin; box-sizing:border-box; touch-action:pan-x;">
          ${dragThumbsHtml}
        </div>
      `;

      setTimeout(function() {
        var track = document.getElementById('richPhotoSwipeTrack');
        var idx = window.__currentSwipePhotoIndex || 0;
        if (track) {
          track.scrollLeft = idx * track.offsetWidth;
        }
        var strip = document.getElementById('richPhotoThumbStrip');
        var activeThumb = strip && strip.querySelector('[data-thumb-idx="' + idx + '"]');
        if (activeThumb && activeThumb.scrollIntoView) {
          activeThumb.scrollIntoView({ behavior: 'auto', inline: 'nearest', block: 'nearest' });
        }
      }, 30);
    }

    window.__syncActivePhotoMemoUI();
  };

  // 하위 호환성 영구 보존 알리아스
// 🔍 [기록 작성 모달 전용 장소 검색 & 실시간 연관검색어 엔진]
  window.openSpotSearchModalForRichTrip = function() {
    triggerHaptic(10);
    var old = document.getElementById('richTripSpotSearchModal');
    if (old) old.remove();

    // 🎯 [스크롤 튕김 0%]: 수정 전 부모 모달의 뷰포트 스크롤 좌표 즉시 백업
    var parentScrollContainer = document.querySelector('#modalRichAfterTrip > div:nth-child(2)');
    var savedParentScrollTop = parentScrollContainer ? parentScrollContainer.scrollTop : 0;

  // 🌐 [3중 하이브리드 장소 풀 메모이제이션 엔진]: 1회 정규화 후 메모리 캐시로 0.001초 즉시 인출
    var spotsSource = [];
    if (window.__masterSpotsSearchCache && window.__masterSpotsSearchCache.length > 0) {
      spotsSource = window.__masterSpotsSearchCache;
    } else {
      var rawPool = [];
      if (Array.isArray(window.campingSpots)) rawPool = rawPool.concat(window.campingSpots);
      if (Array.isArray(window.spotsData)) rawPool = rawPool.concat(window.spotsData);
      if (Array.isArray(window.allSpots)) rawPool = rawPool.concat(window.allSpots);
      if (Array.isArray(window.masterSpots)) rawPool = rawPool.concat(window.masterSpots);
      if (Array.isArray(window.CAMPING_SPOTS)) rawPool = rawPool.concat(window.CAMPING_SPOTS);
      if (Array.isArray(window.SPOTS_DB)) rawPool = rawPool.concat(window.SPOTS_DB);

      ['okbm_spots_cache', 'okbm_master_spots', 'camping_spots', 'okbm_spots', 'okbm_bookmarks'].forEach(function(k) {
        try {
          var item = localStorage.getItem(k);
          if (item) {
            var parsed = JSON.parse(item);
            if (Array.isArray(parsed)) rawPool = rawPool.concat(parsed);
          }
        } catch (e) {}
      });

      if (Array.isArray(window.__allLoadedFeeds)) {
        window.__allLoadedFeeds.forEach(function(f) {
          if (f && f.spot) rawPool.push({ name: f.spot, elevation: f.elevation || '', address: f.address || f.region || '' });
        });
      }
      if (Array.isArray(window.interactiveHistory)) {
        window.interactiveHistory.forEach(function(h) {
          if (h && h.spot) rawPool.push({ name: h.spot, elevation: h.elevation || '', address: h.address || h.region || '' });
        });
      }

 var spotsMap = new Map();
      rawPool.forEach(function(s) {
        if (!s) return;
        var rawName = String(s.name || s.spotName || s.spot || s.title || '').trim();
        if (!rawName || rawName === '나의 힐링 스팟' || rawName === '힐링 장소') return;

        var cityName = '';
        if (typeof window.extractSmartCityName === 'function') {
          cityName = window.extractSmartCityName(s);
        } else {
          var addrStr = String(s.address || s.addr || s.region || '').trim();
          var match = addrStr.match(/([가-힣]+(?:시|군|구))/);
          cityName = match ? match[1] : '';
        }

        var combinedName = rawName;
        if (cityName && !rawName.includes(cityName)) {
          combinedName = cityName + ' ' + rawName;
        }

        var cleanKey = combinedName.replace(/\s+/g, '').toLowerCase();
        if (!spotsMap.has(cleanKey)) {
          spotsMap.set(cleanKey, {
            name: combinedName,
            rawName: rawName,
            cityName: cityName,
            elevation: s.elevation || s.alt || s.height || '',
            address: s.address || s.addr || s.region || ''
          });
        }
      });

      spotsSource = Array.from(spotsMap.values());
      window.__masterSpotsSearchCache = spotsSource;
    }

  var searchModal = document.createElement('div');
    searchModal.id = 'richTripSpotSearchModal';
    searchModal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:2147483647 !important; display:flex; justify-content:center; align-items:flex-start; box-sizing:border-box; overflow:hidden;';
    searchModal.onclick = function(e) { if (e.target === searchModal) window.__closeRichSpotSearch(); };

    searchModal.innerHTML = `
      <div style="width:100%; max-width:440px; height:100%; height:100vh; height:100dvh; max-height:100vh; max-height:100dvh; background:#0c1017; border-bottom:1px solid rgba(255,255,255,0.08); padding:calc(12px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px)) 16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box;" onclick="event.stopPropagation();">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" style="width:16px; height:16px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">방문 장소 검색 및 변경</span>
          </div>
          <button type="button" onclick="window.__closeRichSpotSearch();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
        </div>

        <div style="position:relative; width:100%; flex-shrink:0;">
          <input type="text" id="richSpotSearchInput" placeholder="도시명 또는 장소명 입력 (예: 천마산 관음봉, 단양 올산)" oninput="window.__handleRichSpotFilter(this.value);" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(56,189,248,0.4); border-radius:10px; color:#ffffff; padding:0 38px 0 14px; font-size:0.86rem; outline:none; box-sizing:border-box;" />
          <button type="button" onclick="document.getElementById('richSpotSearchInput').value=''; window.__handleRichSpotFilter('');" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; font-size:0.9rem; cursor:pointer;">✕</button>
        </div>

        <div id="richSpotCustomApplyWrap" style="display:none; padding:8px 12px; background:rgba(56,189,248,0.12); border:1px dashed rgba(56,189,248,0.4); border-radius:8px; justify-content:space-between; align-items:center; flex-shrink:0;">
          <span id="richSpotCustomTargetText" style="font-size:0.75rem; color:#e2e8f0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:240px;"></span>
          <button type="button" id="richSpotCustomApplyBtn" style="background:#38bdf8; border:none; color:#000; font-size:0.72rem; font-weight:900; padding:5px 10px; border-radius:6px; cursor:pointer; flex-shrink:0;">직접 입력 적용</button>
        </div>

        <div id="richSpotSearchResultsList" style="flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; display:flex; flex-direction:column; gap:6px; padding-right:2px; overscroll-behavior-y:contain;">
        </div>
      </div>
    `;

    document.body.appendChild(searchModal);

    window.__closeRichSpotSearch = function() {
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.blur();
      var modal = document.getElementById('richTripSpotSearchModal');
      if (modal) modal.remove();

      // 🎯 [스크롤 복원]: 닫을 때도 부모 컨테이너 위치 100% 보존
      if (parentScrollContainer) {
        parentScrollContainer.scrollTop = savedParentScrollTop;
      }
    };

    // ⚡ [유사 단어 다중 토큰 매칭 & 가중치(Score) 정렬 엔진]
    window.__handleRichSpotFilter = function(query) {
      var listEl = document.getElementById('richSpotSearchResultsList');
      var customWrap = document.getElementById('richSpotCustomApplyWrap');
      var customText = document.getElementById('richSpotCustomTargetText');
      var customBtn = document.getElementById('richSpotCustomApplyBtn');
      if (!listEl) return;

      var rawQ = String(query || '').trim();
      var tokens = rawQ.toLowerCase().split(/\s+/).filter(Boolean);

      if (rawQ.length > 0) {
        if (customWrap && customText && customBtn) {
          customWrap.style.display = 'flex';
          customText.innerText = '“' + rawQ + '” (으)로 직접 설정';
          customBtn.onclick = function() {
            window.__selectSpotForRichTrip(rawQ, '', { isCustom: true });
          };
        }
      } else if (customWrap) {
        customWrap.style.display = 'none';
      }

      var matchedList = [];

      if (tokens.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:48px 16px; color:#64748b; font-size:0.78rem; line-height:1.55;">박지명 또는 도시명을 검색하면<br>등록 박지가 표시됩니다.</div>';
        return;
      }
        var lastToken = tokens[tokens.length - 1]; // 사용자가 핵심으로 지목한 마지막 키워드 (예: '관음봉')
        var scoredItems = [];

        spotsSource.forEach(function(s) {
          var sName = String(s.name || '').toLowerCase();
          var rawName = String(s.rawName || '').toLowerCase();
          var sAddr = String(s.address || '').toLowerCase();
          var sCity = String(s.cityName || '').toLowerCase();

          var score = 0;
          var matchedTokenCount = 0;

          // 1. 전체 검색어 완전/부분 일치 (최우선)
          var wholeSearch = rawQ.replace(/\s+/g, '').toLowerCase();
          var cleanSName = sName.replace(/\s+/g, '');
          if (cleanSName === wholeSearch) {
            score += 2000;
          } else if (cleanSName.includes(wholeSearch)) {
            score += 1000;
          }

          // 2. 사용자가 노린 마지막 핵심 단어(예: '관음봉') 일치 가중치
          if (lastToken) {
            if (rawName === lastToken || rawName.includes(lastToken)) {
              score += 600; // '관음봉'이 장소 순수 명칭에 직접 포함 시 최상단 우선권
            } else if (sName.includes(lastToken)) {
              score += 400;
            } else if (sAddr.includes(lastToken)) {
              score += 100;
            }
          }

          // 3. 각 토큰별 포용적(OR) 매칭 스코어링 (천마산, 관음봉 각각 일치해도 일단 등장)
          tokens.forEach(function(t) {
            var tokenMatched = false;
            if (rawName.includes(t)) {
              score += 250;
              tokenMatched = true;
            } else if (sName.includes(t)) {
              score += 180;
              tokenMatched = true;
            } else if (sCity.includes(t) || sAddr.includes(t)) {
              score += 80;
              tokenMatched = true;
            }
            if (tokenMatched) matchedTokenCount++;
          });

          // 다중 토큰을 모두 포함하고 있을수록 보너스 가산
          if (matchedTokenCount > 1) {
            score += (matchedTokenCount * 150);
          }

          // 단 하나라도 일치하여 score가 있는 항목은 모두 살려서 수집
          if (score > 0) {
            scoredItems.push({
              item: s,
              score: score
            });
          }
        });

        // 🌟 가중치 점수(Score) 내림차순 정렬: '관음봉' 일치 항목이 최상단, 그 외 연관 항목이 하단 순차 정렬
        scoredItems.sort(function(a, b) {
          return b.score - a.score;
        });

        matchedList = scoredItems.map(function(wrapper) {
          return wrapper.item;
        }).slice(0, 45);

      if (matchedList.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:40px 10px; color:#64748b; font-size:0.76rem;">일치하는 등록 박지가 없습니다.<br>상단 "직접 입력 적용"을 눌러 원하는 이름을 설정하세요.</div>';
        return;
      }

      listEl.innerHTML = matchedList.map(function(s) {
        var sName = s.name || '힐링 장소';
        var rawElev = String(s.elevation || '').trim();
        // 📐 [고도 단위(m) 표준화 부착]
        var elevFormatted = '';
        if (rawElev) {
          var cleanNum = rawElev.replace(/[^\d.]/g, '');
          if (cleanNum) elevFormatted = '(' + cleanNum + 'm)';
        }
        var sRegion = s.address || s.cityName || '';
        var safeName = escapeHtml(sName);
        var safeElev = escapeHtml(elevFormatted);

        return `
          <div class="js-select-rich-spot" data-name="${safeName}" data-elev="${safeElev}" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:background 0.15s ease;">
            <div style="display:flex; flex-direction:column; gap:2px; min-width:0; flex:1;">
              <div style="font-size:0.86rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:5px;">
                ${HISTORY_VEC_ICONS.pin}
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeName}</span>
                ${safeElev ? `<span style="font-size:0.65rem; color:#fde047; font-weight:800; font-family:'Space Grotesk', sans-serif;">${safeElev}</span>` : ''}
              </div>
              ${sRegion ? `<span style="font-size:0.65rem; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(sRegion)}</span>` : ''}
            </div>
            <span style="font-size:0.70rem; color:#38bdf8; font-weight:800; flex-shrink:0; margin-left:8px;">선택</span>
          </div>
        `;
      }).join('');
    };

    window.__parkRichModalForProposal = function() {
      var rich = document.getElementById('modalRichAfterTrip');
      if (rich) rich.style.display = 'none';
      if (window.__richProposalObserver) {
        try { window.__richProposalObserver.disconnect(); } catch (e) {}
        window.__richProposalObserver = null;
      }
      var check = function() {
        var live = document.getElementById('modalRichAfterTrip');
        if (!live) {
          if (window.__richProposalObserver) {
            try { window.__richProposalObserver.disconnect(); } catch (e2) {}
            window.__richProposalObserver = null;
          }
          return;
        }
        var ov = document.getElementById('customModalOverlay');
        var banner = document.getElementById('pinPickerBanner');
        var overlayOn = !!(ov && window.getComputedStyle(ov).display !== 'none');
        var bannerOn = !!(banner && window.getComputedStyle(banner).display !== 'none');
        if (overlayOn || bannerOn) return;
        live.style.display = 'flex';
        if (window.__richProposalObserver) {
          try { window.__richProposalObserver.disconnect(); } catch (e3) {}
          window.__richProposalObserver = null;
        }
      };
      var observer = new MutationObserver(check);
      window.__richProposalObserver = observer;
      var overlay = document.getElementById('customModalOverlay');
      var banner = document.getElementById('pinPickerBanner');
      if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
      if (banner) observer.observe(banner, { attributes: true, attributeFilter: ['style', 'class'] });
    };

    window.__openRichSpotProposal = function(spotName) {
      var name = String(spotName || '').trim();
      if (typeof window.openUserProposalModal === 'function') {
        window.openUserProposalModal(name, 0, 0, '');
        var overlay = document.getElementById('customModalOverlay');
        if (overlay) overlay.style.setProperty('z-index', '2147483646', 'important');
        window.__parkRichModalForProposal();
        return;
      }
      try {
        sessionStorage.setItem('okbm_pending_rich_spot_propose', name);
      } catch (e) {}
      window.location.assign('map.html?propose_spot=' + encodeURIComponent(name || '') + '&from_rich_trip=1');
    };

    window.__showRichSpotRegisterChoice = function(spotName) {
      var existing = document.getElementById('richSpotRegisterChoiceOverlay');
      if (existing) existing.remove();
      var name = String(spotName || '').trim();
      var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s) { return String(s || ''); };
      var ov = document.createElement('div');
      ov.id = 'richSpotRegisterChoiceOverlay';
      ov.style.cssText = 'position:fixed; inset:0; z-index:2147483647; background:rgba(0,0,0,0.72); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box;';
      ov.onclick = function(e) { if (e.target === ov) ov.remove(); };
      ov.innerHTML =
        '<div style="width:100%; max-width:320px; background:#0c1017; border-radius:14px; border:1px solid rgba(255,255,255,0.12); padding:16px; display:flex; flex-direction:column; gap:12px; box-sizing:border-box; box-shadow:0 16px 40px rgba(0,0,0,0.55);" onclick="event.stopPropagation();">' +
          '<div style="font-size:0.92rem; font-weight:900; color:#fff; text-align:center;">장소를 등록하시겠습니까?</div>' +
          (name ? ('<div style="font-size:0.78rem; font-weight:800; color:#e2e8f0; text-align:center; word-break:break-all;">' + esc(name) + '</div>') : '') +
          '<div style="font-size:0.68rem; color:#94a3b8; line-height:1.5; text-align:center;">등록하기를 선택하시면 제보창으로 연결됩니다.<br>등록하지 않기를 선택하시면 나만보기와 이 기록에 저장됩니다.</div>' +
          '<div style="display:flex; gap:8px;">' +
            '<button type="button" id="richSpotChoiceRegisterBtn" style="flex:1; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:#e2e8f0; color:#000; font-size:0.78rem; font-weight:900; cursor:pointer;">등록하기</button>' +
            '<button type="button" id="richSpotChoiceSkipBtn" style="flex:1; height:40px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#cbd5e1; font-size:0.78rem; font-weight:800; cursor:pointer;">등록하지 않기</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
      var regBtn = document.getElementById('richSpotChoiceRegisterBtn');
      var skipBtn = document.getElementById('richSpotChoiceSkipBtn');
      if (regBtn) {
        regBtn.onclick = function() {
          ov.remove();
          triggerHaptic(10);
          window.__openRichSpotProposal(name);
        };
      }
      if (skipBtn) {
        skipBtn.onclick = function() {
          ov.remove();
          triggerHaptic(8);
        };
      }
    };

    window.__selectSpotForRichTrip = function(spotName, elevation, opts) {
      if (!spotName) return;
      opts = opts || {};
      triggerHaptic(12);

      // 인풋 포커스 먼저 해제하여 브라우저 강제 스크롤 차단
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.blur();

      var isRegistered = !opts.isCustom &&
        typeof window.isSpotRegisteredInMasterDB === 'function' &&
        window.isSpotRegisteredInMasterDB(spotName);

      if (window.__richCurrentRecord) {
        window.__richCurrentRecord.spot = spotName;
        if (elevation) {
          window.__richCurrentRecord.elevation = elevation.replace(/[()]/g, '');
        }
        if (isRegistered) {
          window.__richCurrentRecord.unregisteredSpot = false;
          window.__richCurrentRecord.unregistered_spot = false;
        } else {
          window.__richCurrentRecord.unregisteredSpot = true;
          window.__richCurrentRecord.unregistered_spot = true;
          window.__richCurrentRecord.spotId = '';
          window.__richCurrentRecord.spot_id = '';
          window.__richCurrentRecord.isPublished = false;
          window.__richCurrentRecord.is_published = false;
        }
      }

      // 메모리 캐시 원본 객체도 즉시 동기화 (발행 시 영구 반영)
      var targetInHistory = (window.interactiveHistory || []).find(function(r) {
        return window.__richCurrentRecord && String(r.id).trim() === String(window.__richCurrentRecord.id).trim();
      });
      if (targetInHistory) {
        targetInHistory.spot = spotName;
        if (elevation) targetInHistory.elevation = elevation.replace(/[()]/g, '');
        if (isRegistered) {
          targetInHistory.unregisteredSpot = false;
          targetInHistory.unregistered_spot = false;
        } else {
          targetInHistory.unregisteredSpot = true;
          targetInHistory.unregistered_spot = true;
          targetInHistory.spotId = '';
          targetInHistory.spot_id = '';
          targetInHistory.isPublished = false;
          targetInHistory.is_published = false;
        }
      }

      var badgeTextEl = document.getElementById('richHeaderSpotNameText');
      if (badgeTextEl) {
        badgeTextEl.innerText = spotName;
      }

      var modal = document.getElementById('richTripSpotSearchModal');
      if (modal) modal.remove();

      // 🎯 [카메라/작업 자리 100% 고정]: 선택 직후 스크롤 좌표 완벽 복원
      if (parentScrollContainer) {
        parentScrollContainer.scrollTop = savedParentScrollTop;
        setTimeout(function() {
          if (parentScrollContainer) parentScrollContainer.scrollTop = savedParentScrollTop;
        }, 30);
      }

      if (isRegistered) {
        if (typeof showToast === 'function') {
          showToast('박지가 [' + spotName + '](으)로 변경되었습니다.', 'success', 1800, { html: HISTORY_TOAST_VEC.pin });
        }
        return;
      }

      if (typeof showToast === 'function') {
        showToast('등록된 장소가 아닌 경우 나만보기로 이동됩니다.', 'info', 2600, { html: HISTORY_TOAST_VEC.lock });
      }
      window.__showRichSpotRegisterChoice(spotName);
    };

    window.__handleRichSpotFilter('');
    setTimeout(function() {
      var input = document.getElementById('richSpotSearchInput');
      if (input) input.focus();
    }, 150);
  };

  window.isRecordOwner = function(record) {
    if (!record) return false;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    if (!isLogged) return false;

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    if (!myUserId || myUserId === 'guest') return false;

    var rUserId = String(record.userId || record.user_id || '').trim();
    if (!rUserId || rUserId === 'guest') return false;

    if (typeof window.isCurrentUserId === 'function') return window.isCurrentUserId(rUserId);
    if (typeof window.okbmSameAccountId === 'function') return window.okbmSameAccountId(myUserId, rUserId);
    return myUserId === rUserId;
  };

  window.openRichAfterTripModal = function(record) {
    if (!record) return;

    var isNew = Boolean(record.isNewPost);

    if (isNew && record.date && typeof window.okbmRouteDateReached === 'function' && !window.okbmRouteDateReached(record)) {
      triggerHaptic(12);
      if (typeof showToast === 'function') {
        showToast('출발일 당일 이후에 현장 사진과 일지를 등록할 수 있습니다.', 'info', 2400, { html: HISTORY_TOAST_VEC.clock });
      }
      return;
    }

    var isOwner = Boolean(record._isLocalOwner || (typeof window.isRecordOwner === 'function' && window.isRecordOwner(record)));
    if (!isNew && !isOwner) {
      triggerHaptic(15);
      if (typeof showToast === 'function') {
        showToast('본인이 작성한 기록만 수정할 수 있습니다.', 'warn', 2200, { html: HISTORY_TOAST_VEC.lock });
      }
      return;
    }

    var old = document.getElementById('modalRichAfterTrip');
    if (old) old.remove();

    window.__richCurrentRecord = record;
    var currentPhotos = getRecordPhotos(record);
    window.__tempUploadedPhotos = currentPhotos.filter(function(url) {
      return url && !url.includes('images.unsplash.com');
    });

    window.__tempPhotoMemos = [];
    if (Array.isArray(record.photoMemos) && record.photoMemos.length > 0) {
      window.__tempPhotoMemos = record.photoMemos.slice();
    } else {
      var initMemo = (record.memo || record.oneLineMemo || '').slice(0, 120);
      window.__tempPhotoMemos.push(initMemo);
    }

    while (window.__tempPhotoMemos.length < Math.max(1, window.__tempUploadedPhotos.length)) {
      window.__tempPhotoMemos.push('');
    }
    window.__currentSwipePhotoIndex = 0;
    var savedYt = String(record.youtube || record.youtubeUrl || '').trim();
    var savedBlog = String(record.blog || record.blogUrl || record.naverBlog || '').trim();

    // 🌟 [메모 모드 판별: 한 번에 쓰기(single) vs 사진별 쓰기(per_photo)]
    var hasMultiMemos = Array.isArray(record.photoMemos) && record.photoMemos.filter(function(m) { return m && m.trim().length > 0; }).length > 1;
    window.__tempMemoMode = record.memoMode || (hasMultiMemos ? 'per_photo' : 'single');
    window.__tempSingleMemo = (record.memo || record.oneLineMemo || (record.photoMemos && record.photoMemos[0]) || '').slice(0, 120);

    window.__switchMemoMode = function(mode) {
      triggerHaptic(8);
      window.__commitCurrentMemoInput();
      window.__tempMemoMode = mode;

      var btnSingle = document.getElementById('btnMemoModeSingle');
      var btnPerPhoto = document.getElementById('btnMemoModePerPhoto');
      var helperLabel = document.getElementById('richMemoModeHelperLabel');
      var memoInput = document.getElementById('richFormMemoInput');

      if (btnSingle && btnPerPhoto) {
        if (mode === 'single') {
          btnSingle.style.background = '#38bdf8';
          btnSingle.style.color = '#000000';
          btnSingle.style.fontWeight = '900';
          btnPerPhoto.style.background = 'transparent';
          btnPerPhoto.style.color = '#94a3b8';
          btnPerPhoto.style.fontWeight = '700';
          if (helperLabel) helperLabel.innerText = '대표 일지 30자 이상, 최대 120자';
          if (memoInput) memoInput.value = window.__tempSingleMemo;
          window.__paintRichMemoCounter((window.__tempSingleMemo || '').length);
        } else {
          btnPerPhoto.style.background = '#38bdf8';
          btnPerPhoto.style.color = '#000000';
          btnPerPhoto.style.fontWeight = '900';
          btnSingle.style.background = 'transparent';
          btnSingle.style.color = '#94a3b8';
          btnSingle.style.fontWeight = '700';
          if (helperLabel) helperLabel.innerText = '사진별 메모는 선택, 최대 120자';
          window.__syncActivePhotoMemoUI();
        }
      }
    };

    var curFeedType = record.feedType || 'route';
    var maxPhotoLimit = 10;

    var formModal = document.createElement('div');
    formModal.id = 'modalRichAfterTrip';
    formModal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:auto !important; max-height:none !important; width:100%; max-width:100%; background:#000000; z-index:2147483645 !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0); -webkit-transform:translateZ(0);';

    formModal.innerHTML = `
      <!-- 1. 상단 고정 헤더: 뒤로가기 + 장소/일상 뱃지 + 수정 완료 -->
      <div style="flex-shrink:0 !important; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; padding:10px 14px; padding-top:calc(10px + env(safe-area-inset-top, 0px)); box-sizing:border-box; z-index:10; gap:8px;">
        <button type="button" onclick="document.getElementById('modalRichAfterTrip').remove(); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">◀</button>
        
        <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); padding:4px 10px; border-radius:20px; min-height:32px; min-width:0; flex:1; justify-content:center;" title="위치와 날짜는 수정할 수 없습니다">
          <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span id="richHeaderSpotNameText" style="font-size:0.80rem; font-weight:900; color:#e2e8f0; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(record.spot)}</span>
          <span style="font-size:0.65rem; color:#94a3b8; font-family:'JetBrains Mono', monospace; flex-shrink:0;">· ${escapeHtml(record.date)}</span>
        </div>

        <button type="button" id="btnSubmitRichTrip" data-record-id="${escapeHtml(String(record.id))}" style="white-space:nowrap !important; flex-shrink:0 !important; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; color:#ffffff; font-size:0.78rem; font-weight:900; height:32px; padding:0 12px; border-radius:8px; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.4); display:inline-flex; align-items:center; justify-content:center; gap:3px;">
          <svg viewBox="0 0 24 24" style="width:13px; height:13px; flex-shrink:0;" fill="none" stroke="#ffffff" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>저장</span>
        </button>
      </div>

      <!-- 2. 중앙 스크롤 뷰포트 (독바 높이 완벽 대응 패딩 88px 확보) -->
      <div class="rich-edit-scroll" style="flex:1 1 0% !important; min-height:0 !important; width:100%; max-width:440px; margin:0 auto; overflow-y:auto !important; overflow-x:hidden !important; -webkit-overflow-scrolling:touch !important; touch-action:pan-y pan-x !important; overscroll-behavior-y:contain; padding:14px 14px calc(88px + env(safe-area-inset-bottom, 8px)) 14px; display:flex; flex-direction:column; gap:16px; box-sizing:border-box;">
        
     <!-- 대형 사진 스와이프 무대 섹션 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span id="richPhotoCountLabel" style="font-size:0.82rem; color:#ffffff; font-weight:900;">
                등록된 사진 (${window.__tempUploadedPhotos.length}장 / 최대 ${maxPhotoLimit}장)
              </span>
              <span id="richPhotoActiveIndexBadge" style="font-size:0.62rem; color:#38bdf8; background:rgba(56,189,248,0.14); padding:1px 6px; border-radius:10px; font-weight:900; font-family:'Space Grotesk', sans-serif;">1 / 1</span>
            </div>
            <button type="button" data-record-id="${escapeHtml(String(record.id))}" onclick="window.__deleteCurrentRichTrip(this.dataset.recordId);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); color:#fda4af; font-size:0.68rem; font-weight:800; padding:3px 8px; border-radius:5px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
              <svg viewBox="0 0 24 24" style="width:11px; height:11px; stroke:currentColor; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>일지삭제</span>
            </button>
          </div>

          <div id="richLargePhotoStageContainer" class="rich-photo-stage" style="width:100%; min-width:0; max-width:100%; display:flex; flex-direction:column; align-items:stretch;">
          </div>
          <input type="file" id="richMultiPhotoInput" accept="image/*" multiple="multiple" style="display:none;" onchange="window.__handleRichMultiPhotoUpload(event);" />
        </div>

       <!-- 하단 배치: 한 번에 작성 vs 사진별 작성 듀얼 모드 토글 & 메모 작성 영역 -->
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:3px; background:rgba(255,255,255,0.06); padding:2px; border-radius:8px; border:1px solid rgba(255,255,255,0.12);">
              <button type="button" id="btnMemoModeSingle" onclick="window.__switchMemoMode('single');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:${window.__tempMemoMode==='single'?'#38bdf8':'transparent'}; color:${window.__tempMemoMode==='single'?'#000000':'#94a3b8'}; font-weight:${window.__tempMemoMode==='single'?'900':'700'}; transition:all 0.15s ease;">한 번에 쓰기</button>
              <button type="button" id="btnMemoModePerPhoto" onclick="window.__switchMemoMode('per_photo');" style="border:none; cursor:pointer; font-size:0.68rem; padding:4px 9px; border-radius:6px; background:${window.__tempMemoMode==='per_photo'?'#38bdf8':'transparent'}; color:${window.__tempMemoMode==='per_photo'?'#000000':'#94a3b8'}; font-weight:${window.__tempMemoMode==='per_photo'?'900':'700'}; transition:all 0.15s ease;">사진별 쓰기</button>
            </div>
            <span id="richMemoCharCounter" style="font-size:0.70rem; color:#38bdf8; font-family:'Space Grotesk', sans-serif; font-weight:800;">0/120자</span>
          </div>
          <div id="richMemoModeHelperLabel" style="font-size:0.62rem; color:#64748b; margin-top:-2px;">
            ${window.__tempMemoMode==='single' ? '대표 일지 30자 이상, 최대 120자' : '사진별 메모는 선택, 최대 120자'}
          </div>
          <textarea id="richFormMemoInput" maxlength="120" placeholder="지형 상태, 뷰, 실전 팁 등 현장 기록을 120자 이내로 남겨보세요." oninput="window.__handleRichMemoInput(this.value);" style="width:100%; height:95px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:12px; padding:12px 14px; font-size:0.84rem; line-height:1.55; box-sizing:border-box; outline:none; resize:none; font-family:'Pretendard Variable', -apple-system, sans-serif; letter-spacing:-0.02em;"></textarea>
        </div>

        <!-- 하단 배치: 유튜브 / 네이버 블로그 링크 (과거추억 올리기와 동일) -->
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="font-size:0.74rem; font-weight:800; color:#94a3b8;">유튜브 / 네이버 블로그 링크 (선택)</label>
          <input type="text" id="richInputYoutube" inputmode="url" value="${escapeHtml(savedYt)}" placeholder="YouTube 링크" onblur="window.onRichTripLinkBlur('yt');" style="width:100%; height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(244,63,94,0.28); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />
          <input type="text" id="richInputNaverBlog" inputmode="url" value="${escapeHtml(savedBlog)}" placeholder="네이버 블로그 링크" onblur="window.onRichTripLinkBlur('blog');" style="width:100%; height:40px; background:rgba(255,255,255,0.05); border:1px solid rgba(3,199,90,0.28); border-radius:10px; color:#ffffff; padding:0 12px; font-size:0.80rem; outline:none; box-sizing:border-box;" />
          <div style="font-size:calc(0.66rem + 1pt); color:#64748b; line-height:1.45;">다른 낭만 루터분들에게 도움이 됩니다</div>
        </div>

      </div>
    `;

    document.body.appendChild(formModal);
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }
    var dock = document.getElementById('romanticMasterBottomDock');
    if (dock) {
      dock.style.setProperty('z-index', '2147483647', 'important');
      if (dock.parentElement === document.body) document.body.appendChild(dock);
    }
    window.__renderRichPhotoStage();
  };

 window.__saveRichAfterTrip = async function(recordId) {
    if (window.__isSubmittingRichTrip) {
      return;
    }
    if (window.__isPhotoCompressing) {
      if (typeof showToast === 'function') showToast('사진 압축이 완료될 때까지 잠시만 기다려주세요.', 'info', 1500);
      return;
    }
    window.__isSubmittingRichTrip = true;

    var sId = String(recordId || '').trim();
    var target = (window.interactiveHistory || []).find(function(r) { return r && String(r.id).trim() === sId; });
    if (!target && window.__richCurrentRecord) {
      target = window.__richCurrentRecord;
    }

    if (!target) {
      if (typeof showToast === 'function') showToast('저장 대상을 찾을 수 없습니다.', 'warn');
      window.__isSubmittingRichTrip = false;
      return;
    }

    if (target.date && typeof window.okbmRouteDateReached === 'function' && !window.okbmRouteDateReached(target)) {
      triggerHaptic(12);
      if (typeof showToast === 'function') {
        showToast('출발일 당일 이후에 현장 사진과 일지를 등록할 수 있습니다.', 'info', 2400, { html: HISTORY_TOAST_VEC.clock });
      }
      window.__isSubmittingRichTrip = false;
      return;
    }

    var photosToProcess = Array.isArray(window.__tempUploadedPhotos)
      ? window.__tempUploadedPhotos.filter(function(u) {
          return typeof u === 'string' && u.indexOf('https://') === 0;
        }).slice(0, 10)
      : [];
    if (photosToProcess.length === 0) {
      triggerHaptic(14);
      if (typeof showToast === 'function') showToast('현장 사진을 1장 이상 추가해주세요.', 'warn', 2400, { html: HISTORY_TOAST_VEC.camera, position: 'center' });
      window.__isSubmittingRichTrip = false;
      var submitBtnEl = document.getElementById('btnSubmitRichTrip');
      if (submitBtnEl) {
        submitBtnEl.disabled = false;
        submitBtnEl.style.opacity = '1';
        submitBtnEl.innerText = '저장';
      }
      return;
    }

    window.__commitCurrentMemoInput();
    var isSingleMemo = (window.__tempMemoMode !== 'per_photo');
    var memoInputEl = document.getElementById('richFormMemoInput');
    if (isSingleMemo) {
      var singleMemoCheck = String(
        window.__tempSingleMemo || (memoInputEl ? memoInputEl.value : '') || ''
      ).trim().slice(0, 120);
      if (!singleMemoCheck) {
        triggerHaptic(14);
        if (typeof showToast === 'function') showToast('대표 일지를 작성해주세요.', 'warn', 2400, 'center');
        window.__isSubmittingRichTrip = false;
        if (memoInputEl) memoInputEl.focus();
        return;
      }
      if (singleMemoCheck.length < 30) {
        triggerHaptic(14);
        if (typeof showToast === 'function') {
          showToast('대표 일지는 30자 이상 작성해주세요. (현재 ' + singleMemoCheck.length + '자)', 'warn', 2800, 'center');
        }
        window.__isSubmittingRichTrip = false;
        if (memoInputEl) memoInputEl.focus();
        return;
      }
    }

    var submitBtn = document.getElementById('btnSubmitRichTrip');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';
      submitBtn.innerText = '클라우드 업로드 중...';
    }

    var finalTypedMemo = isSingleMemo
      ? String(window.__tempSingleMemo || (memoInputEl ? memoInputEl.value : '') || '').trim().slice(0, 120)
      : (memoInputEl ? memoInputEl.value.trim().slice(0, 120) : '');

    target.memo = finalTypedMemo;
    target.oneLineMemo = finalTypedMemo;

    var ytInput = document.getElementById('richInputYoutube');
    var blogInput = document.getElementById('richInputNaverBlog');
    var profile = safeGetJSON('user_profile', null);
    target.author = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || target.author || '');
    var userId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || target.userId || '');
    target.userId = userId;
    var curMasterCover = localStorage.getItem('okbm_hero_cover_url') || ((profile && (profile.heroCoverUrl || profile.photoUrl)) ? (profile.heroCoverUrl || profile.photoUrl) : '');
    if (curMasterCover && String(curMasterCover).startsWith('http')) {
      target.authorPhoto = curMasterCover;
    }

    if (typeof window.onRichTripLinkBlur === 'function') {
      window.onRichTripLinkBlur('yt');
      window.onRichTripLinkBlur('blog');
    }
    var ytCleanFn = (typeof window._pastTripCleanYoutubeUrl === 'function') ? window._pastTripCleanYoutubeUrl : null;
    var blogCleanFn = (typeof window._pastTripCleanNaverBlogUrl === 'function') ? window._pastTripCleanNaverBlogUrl : null;
    var ytRaw = ytInput ? String(ytInput.value || '').trim() : '';
    var blogRaw = blogInput ? String(blogInput.value || '').trim() : '';
    var ytUrl = ytCleanFn ? ytCleanFn(ytRaw) : ytRaw;
    var blogUrl = blogCleanFn ? blogCleanFn(blogRaw) : blogRaw;
    if (ytRaw && !ytUrl) {
      if (typeof showToast === 'function') showToast('유튜브 링크를 확인해주세요.', 'warn');
      window.__isSubmittingRichTrip = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerText = '저장';
      }
      return;
    }
    if (blogRaw && !blogUrl) {
      if (typeof showToast === 'function') showToast('네이버 블로그 링크를 확인해주세요.', 'warn');
      window.__isSubmittingRichTrip = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerText = '저장';
      }
      return;
    }
    if (ytInput && ytUrl) ytInput.value = ytUrl;
    if (blogInput && blogUrl) blogInput.value = blogUrl;
    target.youtube = ytUrl || '';
    target.blog = blogUrl || '';

    target.memoMode = isSingleMemo ? 'single' : 'per_photo';

    if (isSingleMemo) {
      target.memo = finalTypedMemo;
      target.oneLineMemo = finalTypedMemo;
      target.photoMemos = [finalTypedMemo];
    } else {
      var memosToProcess = Array.isArray(window.__tempPhotoMemos) ? window.__tempPhotoMemos.slice(0, Math.max(1, photosToProcess.length)) : [];
      if (memosToProcess.length === 0 || !memosToProcess[0]) {
        memosToProcess[0] = finalTypedMemo;
      }
      target.photoMemos = memosToProcess;
      target.memo = memosToProcess[0] || finalTypedMemo;
      target.oneLineMemo = target.memo.slice(0, 120);
    }

    var prevReadyShot = String(target.readyShotPhoto || target.ready_shot_photo || target.customTemplatePhoto || '').trim();
    var prevFieldPhotos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(target) : [];
    var hadFieldPhotos = prevFieldPhotos.some(function(u) {
      return typeof u === 'string' &&
        (u.startsWith('https://') || u.startsWith('http://')) &&
        u.indexOf('unsplash.com') === -1 &&
        u !== prevReadyShot;
    });
    var wasPrivate = (typeof window.okbmIsExplicitlyPrivate === 'function')
      ? window.okbmIsExplicitlyPrivate(target)
      : (target.isPublished === false || target.is_published === false);
    var autoOpenedToPublic = false;

    target.isDraft = false;

    var localPhotos = photosToProcess.slice();
    var mainLocalPhoto = localPhotos[0] || '';
    target.photos = localPhotos;
    target.photo = mainLocalPhoto;
    target.feedType = 'route';

    var uploadedCdnPhotos = [];
    try {
      if (typeof window.shareFeedToCommunity === 'function') {
        uploadedCdnPhotos = await window.shareFeedToCommunity(target);
      }
    } catch (err) {
      console.warn('[RomanticHistory] 클라우드 배포 예외:', err);
    }

    if (Array.isArray(uploadedCdnPhotos) && uploadedCdnPhotos.length > 0) {
      target.photos = uploadedCdnPhotos;
      target.photo = uploadedCdnPhotos[0] || '';
    }

    var canPublishNow = (typeof window.okbmCanPublishFeed === 'function')
      ? window.okbmCanPublishFeed(target)
      : false;
    if (!canPublishNow) {
      var spotProbe = String(target.spot || '').trim();
      if (typeof window.isSpotRegisteredInMasterDB === 'function' && !window.isSpotRegisteredInMasterDB(spotProbe)) {
        target.unregisteredSpot = true;
        target.unregistered_spot = true;
      }
      target.isPublished = false;
      target.is_published = false;
    } else if (!hadFieldPhotos && wasPrivate && prevReadyShot) {
      target.isPublished = true;
      target.is_published = true;
      autoOpenedToPublic = true;
    }

    // [단 1개의 통로로만 서버 쓰기] savePackingHistoryRecord → submitFeedPayload가
    // 이 저장 흐름에서 feeds 테이블에 쓰는 유일한 경로입니다. 이전에는 여기서 별도
    // fetch를 한 번 더 쏘고, savePackingHistoryRecord 내부에서 또 한 번 쏘는 식으로
    // 동일 레코드에 대해 서로 다른 페이로드가 경합했습니다. 이제 1번만 호출하고,
    // 반드시 await로 서버 응답을 확인합니다.
    var savedTarget = null;
    if (typeof window.savePackingHistoryRecord === 'function') {
      savedTarget = await window.savePackingHistoryRecord(target);
    }

    if (savedTarget && savedTarget.__serverSaveFailed) {
      // 서버 저장이 실패했으므로 "저장 성공" 처리를 하지 않고 사용자가 다시
      // 시도할 수 있도록 버튼과 상태를 원복합니다. 에러 토스트는
      // savePackingHistoryRecord 내부에서 이미 표시했습니다.
      window.__isSubmittingRichTrip = false;
      var failedSubmitBtn = document.getElementById('btnSubmitRichTrip');
      if (failedSubmitBtn) {
        failedSubmitBtn.disabled = false;
        failedSubmitBtn.style.opacity = '1';
        failedSubmitBtn.innerText = '저장';
      }
      return;
    }

    target = savedTarget || target;
    if (wasPrivate && target.isPublished === true) autoOpenedToPublic = true;

    // 과거추억 올리기와 동일: 유튜브/블로그 링크를 등록 박지 미디어에 합산
    try {
      var linkYt = String(target.youtube || '').trim();
      var linkBlog = String(target.blog || '').trim();
      if (linkYt || linkBlog) {
        var mediaSpotId = String(target.spotId || target.spot_id || '').trim();
        if (!mediaSpotId && typeof window.okbmFindSpotByFocusQuery === 'function') {
          var foundSpot = window.okbmFindSpotByFocusQuery(
            window.SPOTS_MASTER || window.spots || [],
            target.spot || ''
          );
          if (foundSpot && foundSpot.id) mediaSpotId = String(foundSpot.id).trim();
        }
        var isUnreg = target.unregisteredSpot === true || target.unregistered_spot === true;
        if (!isUnreg && mediaSpotId && typeof window._pastTripMergeSpotMediaUrls === 'function') {
          var mediaMerged = await window._pastTripMergeSpotMediaUrls(
            mediaSpotId,
            linkYt ? [linkYt] : [],
            linkBlog ? [linkBlog] : []
          );
          if (!mediaMerged && typeof showToast === 'function') {
            showToast('기록은 저장됐지만 유튜브/블로그 링크 반영에 실패했습니다.', 'warn', 2800);
          } else if (mediaMerged && typeof window.prefetchSpotMediaForSpot === 'function') {
            var mediaSpot = (window.spots || window.SPOTS_MASTER || []).find(function(s) {
              return s && String(s.id).trim() === mediaSpotId;
            });
            if (mediaSpot) window.prefetchSpotMediaForSpot(mediaSpot);
          }
        } else if (isUnreg && typeof window._pastTripSavePendingMedia === 'function') {
          window._pastTripSavePendingMedia(target.spot || '', linkYt, linkBlog);
        }
      }
    } catch (mediaErr) {
      console.warn('[RomanticHistory] spot media merge:', mediaErr);
    }

    try {
      if (typeof syncUserDataToCloud === 'function') {
        syncUserDataToCloud(true);
      }
    } catch (err) {
      console.warn('[RomanticHistory] 클라우드 동기화 예외:', err);
    }

    var editModal = document.getElementById('modalRichAfterTrip');
    if (editModal) editModal.remove();

    var hasPastModal = Boolean(document.getElementById('pastTripsListModal'));
    var singleFeedModal = document.getElementById('singleTripFeedModal');
    if (singleFeedModal) {
      singleFeedModal.remove();
      if (typeof window.openSingleTripDualFeedModal === 'function') {
        window.openSingleTripDualFeedModal(target.id);
      }
    }

    window.activeHistoryFeedTab = 'route';
    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }
    if (typeof window.okbmSyncFeedCardMedia === 'function') {
      window.okbmSyncFeedCardMedia(target);
    }
    if (hasPastModal && typeof window.openPastTripsListModal === 'function') {
      window.openPastTripsListModal();
    }
    if (typeof window.renderPlanStage === 'function') {
      window.renderPlanStage();
    }

    triggerHaptic(15);
    window.__isSubmittingRichTrip = false;
    if (typeof showToast === 'function') {
      var savedPrivate = target.unregisteredSpot === true || target.isPublished === false;
      showToast(
        savedPrivate
          ? '나만보기로 저장되었습니다.'
          : (autoOpenedToPublic ? '함께보기로 저장되었습니다.' : '기록이 저장되었습니다.'),
        'success',
        1800,
        { html: HISTORY_TOAST_VEC.check }
      );
    }
  };
  // 🔗 [공유 링크 딥링크 다이렉트 자동 오픈 엔진]
  function okbmBootDirectFeedParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var sharedFeedId = params.get('feed');
      if (!sharedFeedId) return;
      setTimeout(function() {
        if (typeof window.okbmOpenDirectFeed === 'function') {
          window.okbmOpenDirectFeed(sharedFeedId);
          return;
        }
        if (typeof window.openSingleTripDualFeedModal === 'function') {
          window.openSingleTripDualFeedModal(sharedFeedId);
        }
      }, 400);
    } catch (e) { console.warn('[romantic-history.js:okbmBootDirectFeedParam]', e); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', okbmBootDirectFeedParam);
  } else {
    okbmBootDirectFeedParam();
  }

async function uploadSinglePhotoSmart(base64Data, fileName) {
    if (!base64Data || typeof base64Data !== 'string') return '';
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return base64Data;
    }
    if (!base64Data.startsWith('data:image/')) {
      return '';
    }

    var safeFileName = fileName || ('photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.jpg');
    var CF_WORKER_UPLOAD_URL = 'https://romantic-upload-worker.ggumfree.workers.dev';

    try {
      var base64Part = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      var byteCharacters = atob(base64Part);
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
          return cfData.url;
        }
      }
    } catch (cfErr) {
      console.warn('[RomanticHistory] Cloudflare R2 직통 업로드 예외:', cfErr);
    }

    return '';
  }

  window.uploadSinglePhotoSmart = uploadSinglePhotoSmart;

  window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'route';
  window.__feedPaginationOffset = 0;
  window.__feedHasMore = true;
  window.__isFetchingMoreFeeds = false;

  var _communityFeedsAbort = null;
  var _communityFeedsGen = 0;

  function _okbmAbortCommunityFeedsFetch() {
    if (_communityFeedsAbort) {
      try { _communityFeedsAbort.abort(); } catch (eAbort) {}
      _communityFeedsAbort = null;
    }
    _communityFeedsGen += 1;
  }

  window.fetchCommunityFeeds = async function(isForce, offset, limit) {
    offset = typeof offset === 'number' ? offset : 0;
    limit = typeof limit === 'number' ? limit : 10;

    if (_communityFeedsAbort) {
      try { _communityFeedsAbort.abort(); } catch (eAbort) {}
    }
    _communityFeedsAbort = new AbortController();
    var fetchSignal = _communityFeedsAbort.signal;
    var fetchGen = ++_communityFeedsGen;
    var isStale = function() {
      return fetchGen !== _communityFeedsGen || fetchSignal.aborted;
    };

    try {
    if (typeof window.okbmEnsureUgcSafetyFromServer === 'function') {
      try { await window.okbmEnsureUgcSafetyFromServer(); } catch (syncErr) { console.warn('[romantic-history.js:fetchCommunityFeeds ugcSafety]', syncErr); }
    }
    if (isStale()) return null;
    var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
    var targetKey = window.SUPABASE_ANON_KEY || '';

    var updateLocalStarsFromFeeds = function(feedList) {
      if (!Array.isArray(feedList)) return;
      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      feedList.forEach(function(f) {
        if (f && f.id) {
          var sId = String(f.id).trim();
          var serverLikes = (f.likes_count !== undefined && f.likes_count !== null) ? Number(f.likes_count) : Number(f.likes || 0);
          starCounts[sId] = isNaN(serverLikes) ? 0 : serverLikes;
        }
      });
      localStorage.setItem('okbm_feed_stars_counts', JSON.stringify(starCounts));

      var profile = safeGetJSON('user_profile', null);
      var myId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
      if (!myId || myId === 'guest') return;

      var currentHistory = (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0)
        ? window.interactiveHistory
        : (safeGetJSON('okbm_packing_history', []) || []);

      var historyMap = new Map();
      currentHistory.forEach(function(item) {
        if (item && item.id) historyMap.set(String(item.id).trim(), item);
      });

      var hasUpdatedAny = false;
      feedList.forEach(function(f) {
        if (!f || !f.id) return;
        var fUid = String(f.user_id || f.userId || '').trim();
        if (fUid && fUid === myId) {
          var fId = String(f.id).trim();
          if (historyMap.has(fId)) {
            var existing = historyMap.get(fId);
            existing.likes = Number(f.likes_count || f.likes) || existing.likes || 0;
            hasUpdatedAny = true;
          }
        }
      });

      if (hasUpdatedAny) {
        var mergedHistory = Array.from(historyMap.values());
        window.interactiveHistory = mergedHistory;
        window.packingHistoryList = mergedHistory;
      }
    };

    if (targetUrl && targetKey) {
      try {
        var headers = (typeof window.okbmPublicRestHeaders === 'function')
          ? window.okbmPublicRestHeaders()
          : {
          'apikey': targetKey,
          'Authorization': (typeof window.okbmPublicBearer === 'function' ? window.okbmPublicBearer() : ('Bearer ' + (window.SUPABASE_ANON_KEY || targetKey || ''))),
          'Content-Type': 'application/json'
        };

        var profile = safeGetJSON('user_profile', null);
        var currentUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');

        var keepScopedRows = function(rows) {
          if (!Array.isArray(rows)) return [];
          return rows.filter(function(row) {
            if (!row) return false;
            var rowUserId = String(row.user_id || row.userId || '').trim();
            var isOwner = (currentUserId && rowUserId && currentUserId === rowUserId);
            if (isOwner) return true;
            if (window.okbmIsExplicitlyPrivate && window.okbmIsExplicitlyPrivate(row)) return false;
            return true;
          });
        };

        var fetchTableRows = function(tableName) {
          var projectionColumns = 'id,user_id,author,author_photo,spot,elevation,weight_kg,date,memo,photos,photo,photo_memos_json,ready_shot_photo,ready_shot_mode,ready_shot_pos_x,ready_shot_pos_y,ready_shot_scale,template_id,items,likes_count,is_published,feed_type,created_at';
          var filterParam = currentUserId
            ? ('&or=(is_published.eq.true,user_id.eq.' + encodeURIComponent(currentUserId) + ')')
            : '&is_published=eq.true';
          var queryUrl = targetUrl + '/rest/v1/' + tableName + '?select=' + projectionColumns + filterParam + '&order=created_at.desc&offset=' + offset + '&limit=' + limit;
          var doFetch = (typeof window.okbmPublicFetch === 'function')
            ? window.okbmPublicFetch(queryUrl, { headers: headers, signal: fetchSignal })
            : fetch(queryUrl, { headers: headers, signal: fetchSignal });
          return doFetch
            .then(function(r) {
              if (isStale()) {
                var staleErr = new Error('stale');
                staleErr.name = 'AbortError';
                throw staleErr;
              }
              if (r.ok) return r.json();
              return [];
            })
            .then(keepScopedRows)
            .catch(function(err) {
              if (err && err.name === 'AbortError') throw err;
              return [];
            });
        };

        var supaFeeds = await fetchTableRows('feeds');
        if (isStale()) return null;
        if (Array.isArray(supaFeeds)) {
          if (supaFeeds.length < limit) {
            window.__feedHasMore = false;
          } else {
            window.__feedHasMore = true;
          }

          if (offset === 0) {
            var prevFeeds = Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : [];
            var prevMap = new Map();
            prevFeeds.forEach(function(f) {
              if (f && f.id) prevMap.set(String(f.id).trim(), f);
            });
            supaFeeds = supaFeeds.map(function(row) {
              if (!row || !row.id) return row;
              var prev = prevMap.get(String(row.id).trim());
              if (!prev) return row;
              var prevPhotos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(prev) : (Array.isArray(prev.photos) ? prev.photos : []);
              var nextPhotos = (typeof getRecordPhotos === 'function') ? getRecordPhotos(row) : (Array.isArray(row.photos) ? row.photos : []);
              var merged = Object.assign({}, prev, row);
              if (prevPhotos.length > nextPhotos.length) {
                merged.photos = prevPhotos;
              }
              if ((!row.memo || !String(row.memo).trim()) && prev.memo) {
                merged.memo = prev.memo;
              }
              if ((!Array.isArray(row.photo_memos_json) || !row.photo_memos_json.length) && Array.isArray(prev.photoMemos) && prev.photoMemos.length) {
                merged.photoMemos = prev.photoMemos;
              }
              return merged;
            });
            window.__allLoadedFeeds = supaFeeds;
            window.__feedPaginationOffset = supaFeeds.length;
            okbmWriteCachedCommunityFeeds(supaFeeds);
            if (isStale()) return null;
            if (typeof window.okbmReconcileLocalFeedsWithServer === 'function') {
              try {
                await window.okbmReconcileLocalFeedsWithServer({ loadedFeeds: supaFeeds });
              } catch (reconErr) {
                console.warn('[romantic-history.js:fetchCommunityFeeds reconcile]', reconErr);
                if (typeof window.okbmHydratePackingHistoryAfterServer === 'function') {
                  window.okbmHydratePackingHistoryAfterServer(supaFeeds, null, { failed: false });
                }
              }
            } else if (typeof window.okbmHydratePackingHistoryAfterServer === 'function') {
              window.okbmHydratePackingHistoryAfterServer(supaFeeds, null, { failed: false });
            }
            if (isStale()) return null;
            if (typeof window.fetchUserFeedLikesFromServer === 'function') {
              window.fetchUserFeedLikesFromServer();
            }
          } else {
            var existingIds = new Set((window.__allLoadedFeeds || []).map(function(f) { return String(f.id); }));
            var addedItems = [];
            supaFeeds.forEach(function(f) {
              if (f && f.id && !existingIds.has(String(f.id))) {
                window.__allLoadedFeeds.push(f);
                addedItems.push(f);
              }
            });
            window.__feedPaginationOffset = (window.__feedPaginationOffset || 0) + supaFeeds.length;
          }
          updateLocalStarsFromFeeds(supaFeeds);
        }

        if (!window.__okbmNickRepairDone && typeof window.okbmApplyNicknameToOwnPosts === 'function') {
          var restoredNick = (typeof window.okbmRestoreSavedNickname === 'function') ? window.okbmRestoreSavedNickname() : '';
          var repairProfile = safeGetJSON('user_profile', null);
          var repairNick = restoredNick || (repairProfile && repairProfile.nickname ? String(repairProfile.nickname).trim() : '');
          var repairId = repairProfile && repairProfile.id ? String(repairProfile.id).trim() : '';
          if (repairNick && repairId && window.okbmIsPlaceholderNick && !window.okbmIsPlaceholderNick(repairNick)) {
            window.__okbmNickRepairDone = true;
            window.okbmApplyNicknameToOwnPosts(repairNick, repairId);
          }
        }

        return supaFeeds || [];
      } catch (err) {
        if (err && err.name === 'AbortError') return null;
        console.warn('[RomanticHistory] Supabase 실시간 피드 조회 대기:', err);
        if (isStale()) return null;
        if (window.__okbmDeferHistoryHydrate && typeof window.okbmReconcileLocalFeedsWithServer === 'function') {
          try { await window.okbmReconcileLocalFeedsWithServer({ loadedFeeds: [] }); } catch (e) {}
        } else if (window.__okbmDeferHistoryHydrate && typeof window.okbmHydratePackingHistoryAfterServer === 'function') {
          window.okbmHydratePackingHistoryAfterServer([], null, { failed: true });
        }
      }
    }

    if (isStale()) return null;
    return window.__allLoadedFeeds || safeGetJSON('okbm_cached_community_feeds', []);
    } finally {
      if (fetchGen === _communityFeedsGen && _communityFeedsAbort && _communityFeedsAbort.signal === fetchSignal) {
        _communityFeedsAbort = null;
      }
    }
  };

  window.fetchMoreCommunityFeeds = async function() {
    if (!window.__okbmHistoryModalOpen) return;
    if (window.__isFetchingMoreFeeds || window.__feedHasMore === false) return;
    if (_communityFeedsAbort && !_communityFeedsAbort.signal.aborted) return;
    window.__isFetchingMoreFeeds = true;

    var reelContainer = document.getElementById('reelsVerticalContainer');
    var currentRenderedCount = reelContainer ? reelContainer.querySelectorAll('.reel-page-snap').length : 0;
    var offset = Math.max(currentRenderedCount, window.__feedPaginationOffset || 0);

    try {
      var nextBatch = await window.fetchCommunityFeeds(false, offset, 5);
      if (!window.__okbmHistoryModalOpen) return;
      if (nextBatch == null) return;
      if (Array.isArray(nextBatch) && nextBatch.length > 0) {
        if (typeof window.appendNewFeedCardsToReels === 'function') {
          window.appendNewFeedCardsToReels(nextBatch);
        }
      } else {
        window.__feedHasMore = false;
      }
    } catch (err) {
      console.warn('[romantic-history.js:fetchMoreCommunityFeeds]', err);
    } finally {
      window.__isFetchingMoreFeeds = false;
    }
  };

  window.switchHistoryFeedTab = async function(tab) {
    if (window.activeHistoryFeedTab === tab) return;
    window.activeHistoryFeedTab = tab;
    triggerHaptic(10);

    // 🌊 [부드러운 크로스페이드 1단계]: 기존 화면을 80ms 동안 자연스럽게 페이드아웃
    var container = document.getElementById('reelsVerticalContainer');
    if (container) {
      container.style.transition = 'opacity 0.1s ease-out, transform 0.1s ease-out';
      container.style.opacity = '0.2';
      container.style.transform = 'scale(0.99)';
    }

    // 깜빡이는 로딩 스피너를 띄우지 않고 메모리/로컬 캐시로 즉각 렌더링
    setTimeout(function() {
      if (!window.__okbmHistoryModalOpen) return;
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
      // 🌊 [부드러운 크로스페이드 2단계]: 새 탭 화면을 실크처럼 스르륵 페이드인
      var newContainer = document.getElementById('reelsVerticalContainer');
      if (newContainer) {
        newContainer.style.opacity = '0.2';
        newContainer.style.transform = 'scale(0.99)';
        newContainer.offsetHeight; // Reflow 강제하여 트랜지션 보장
        newContainer.style.transition = 'opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
        newContainer.style.opacity = '1';
        newContainer.style.transform = 'scale(1)';
      }
    }, 80);

    // 백그라운드에서 최신 피드를 조용히 동기화
    window.fetchCommunityFeeds(true).then(function(feeds) {
      if (!window.__okbmHistoryModalOpen) return;
      if (feeds == null) return;
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
    }).catch(function() {});
  };

  // 🔄 [피드 스트림 2단 직통 토글]: 전체피드 ⇄ 내 보관함 1:1 스위치
  window.toggleFeedStreamMode = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
    var currentMode = window.activeHistoryFeedTab || 'explore';

    if (currentMode === 'explore') {
      if (!isLogged) {
        if (typeof showToast === 'function') showToast('내 보관함은 로그인 후 이용할 수 있습니다.', 'info', 2200, { html: HISTORY_TOAST_VEC.lock });
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
      }
      window.switchHistoryFeedTab('my');
    } else {
      window.switchHistoryFeedTab('explore');
    }
  };

  window.toggleFeedMode = function(e) {
    window.toggleFeedStreamMode(e);
  };

  window.openNewRouterSnapModal = function() {
    triggerHaptic(10);
    if (typeof showToast === 'function') {
      showToast('낭만루트 기록에서 사진을 등록할 수 있습니다.', 'info');
    }
  };
 // 🔘 [인스타그램 가로 슬라이더 도트 & 사진별 120자 고정 3줄 메모 실시간 동기화]
  if (!window.__okbmSlideWidthGenBound) {
    window.__okbmSlideWidthGenBound = true;
    window.__okbmSlideWidthGen = 0;
    window.addEventListener('resize', function() { window.__okbmSlideWidthGen++; });
    window.addEventListener('orientationchange', function() { window.__okbmSlideWidthGen++; });
  }

  window.updateCarouselFeedState = function(container, cardId) {
    if (!container || !cardId) return;

    var gen = window.__okbmSlideWidthGen || 0;
    var width = (container._okbmSlideWidthGen === gen) ? container._okbmSlideWidth : 0;
    if (!width) {
      width = container.offsetWidth;
      container._okbmSlideWidth = width;
      container._okbmSlideWidthGen = gen;
    }
    if (!width) return;
    var scrollLeft = container.scrollLeft;
    var curIdx = Math.round(scrollLeft / width);
    if (container._okbmSlideIdx === curIdx) return;
    container._okbmSlideIdx = curIdx;

    var wrap = document.getElementById('dotsWrap_' + cardId);
    if (wrap) {
      var dots = wrap.children;
      for (var i = 0; i < dots.length; i++) {
        var on = (i === curIdx);
        if (on) {
          dots[i].style.width = '14px';
          dots[i].style.background = '#ffffff';
          dots[i].style.boxShadow = '0 0 8px rgba(255,255,255,0.9)';
        } else {
          dots[i].style.width = '5px';
          dots[i].style.background = 'rgba(255,255,255,0.35)';
          dots[i].style.boxShadow = 'none';
        }
      }
    }

    var memoEl = document.getElementById('feedPhotoMemoText_' + cardId);
    var cardRoot = document.getElementById('feedSnapCard_' + cardId);
    if (memoEl && cardRoot && cardRoot.dataset.photoMemos) {
      try {
        var memos = JSON.parse(cardRoot.dataset.photoMemos);
        if (!Array.isArray(memos)) memos = [];
        var filledCount = memos.filter(function(m) { return String(m || '').trim(); }).length;
        var curText = (memos[curIdx] !== undefined) ? String(memos[curIdx] || '').trim() : '';
        if (filledCount <= 1) {
          if (!curText && cardRoot.dataset.defaultMemo) curText = String(cardRoot.dataset.defaultMemo || '').trim();
          if (!curText && memos[0]) curText = String(memos[0] || '').trim();
        }
        if (memoEl._okbmMemoIdx === curIdx && memoEl._okbmMemoText === curText) return;
        memoEl._okbmMemoIdx = curIdx;
        memoEl._okbmMemoText = curText;
        memoEl.innerHTML = curText
          ? escapeHtml(curText)
          : '<span style="color:#475569;">등록된 사진 메모가 없습니다.</span>';
      } catch (err) { console.warn('[romantic-history.js:updateCarouselFeedState parse]', err); }
    }
  };

 window.updateCarouselDots = window.updateCarouselFeedState;

  function okbmBuildReelHeaderBarHtml(authorName, recordUserId, avatarMarkup, tripDate, spotName, canNavigateSpot, extraRightHtml, spotId) {
    var safeAuthor = escapeHtml(authorName || '낭만백패커');
    var safeUserId = escapeHtml(recordUserId || '');
    var safeSpot = escapeHtml(spotName || '나의 힐링 스팟');
    var safeSpotId = escapeHtml(spotId || '');
    var safeDate = escapeHtml(tripDate || '');
    var textShadowStyle = 'text-shadow:0 1px 4px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.7);';
    var spotRow = canNavigateSpot
      ? ('<button type="button" class="js-feed-spot-map" data-spot="' + safeSpot + '" data-spot-id="' + safeSpotId + '" onclick="event.preventDefault(); event.stopPropagation(); window.navigateToSpotMap(this.dataset.spot, event, this.dataset.spotId);" style="background:none; border:none; padding:0; display:inline-flex; align-items:center; gap:2px; cursor:pointer; text-align:left; min-width:0; overflow:hidden; pointer-events:auto; position:relative; z-index:401; touch-action:manipulation;" title="지도에서 장소 위치 확인">' +
          '<span style="font-size:0.74rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-decoration:underline; text-decoration-color:rgba(56,189,248,0.55); text-underline-offset:2px; line-height:1.3; ' + textShadowStyle + '">' + safeSpot + '</span>' +
          '<span style="font-size:0.60rem; color:#38bdf8; font-weight:900; flex-shrink:0; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.9));">↗</span>' +
        '</button>')
      : ('<span style="font-size:0.74rem; font-weight:800; color:#f1f5f9; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:1.3; ' + textShadowStyle + '">' + safeSpot + '</span>');

    return '<div class="reel-header-row" style="position:absolute !important; top:max(32px, env(safe-area-inset-top, 0px)) !important; left:0 !important; right:0 !important; height:auto !important; min-height:52px !important; padding-top:6px !important; padding-left:14px !important; padding-right:14px !important; padding-bottom:12px !important; box-sizing:border-box !important; z-index:400 !important; isolation:isolate !important; transform:none !important; -webkit-transform:none !important; content-visibility:visible !important; background:linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.12) 65%, transparent 100%) !important; border-bottom:none !important; pointer-events:none !important;">' +
      '<div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">' +
        '<button type="button" data-author="' + safeAuthor + '" data-user-id="' + safeUserId + '" onclick="event.stopPropagation(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId, \'route\');" style="width:36px; height:36px; border-radius:50%; overflow:hidden; background:#1e293b; border:1.5px solid rgba(186,230,253,0.35); padding:0; cursor:pointer; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,0.7); pointer-events:auto; position:relative; z-index:401;" title="' + safeAuthor + '님의 피드 모아보기">' +
          avatarMarkup +
        '</button>' +
        '<div style="display:flex; flex-direction:column; justify-content:center; min-width:0; flex:1;">' +
          '<div style="display:flex; align-items:center; gap:6px; min-width:0; line-height:1.2;">' +
            '<span style="font-size:0.82rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ' + textShadowStyle + '">' + safeAuthor + '</span>' +
            (safeDate ? '<span style="font-size:0.62rem; color:#cbd5e1; font-family:\'JetBrains Mono\', monospace; flex-shrink:0; text-shadow:0 1px 3px rgba(0,0,0,0.9);">' + safeDate + '</span>' : '') +
          '</div>' +
          spotRow +
        '</div>' +
      '</div>' +
      (extraRightHtml ? ('<div style="display:flex; align-items:center; gap:6px; flex-shrink:0; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.8)); pointer-events:auto; position:relative; z-index:401;">' + extraRightHtml + '</div>') : '') +
    '</div>';
  }

  window.okbmPaintFollowButtons = function(userId, author, isFollowing) {
    var keys = [String(userId || '').trim(), String(author || '').trim()].filter(Boolean);
    if (!keys.length) return;
    document.querySelectorAll('button[data-user-id], button[data-raw-key], button[data-author]').forEach(function(btn) {
      var vals = [
        String(btn.getAttribute('data-user-id') || '').trim(),
        String(btn.getAttribute('data-raw-key') || '').trim(),
        String(btn.getAttribute('data-author') || '').trim()
      ];
      var hit = false;
      for (var k = 0; k < keys.length; k++) {
        if (vals.indexOf(keys[k]) !== -1) { hit = true; break; }
      }
      if (!hit) return;
      var onclick = btn.getAttribute('onclick') || '';
      if (onclick.indexOf('toggleFollowUser') === -1) return;

      if (btn.querySelector('svg')) {
        if (isFollowing) {
          btn.style.background = 'rgba(52,211,153,0.15)';
          btn.style.borderColor = '#34d399';
          btn.style.color = '#34d399';
          var svg = btn.querySelector('svg');
          if (svg) svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
        } else {
          btn.style.background = 'rgba(255,255,255,0.08)';
          btn.style.borderColor = 'rgba(255,255,255,0.22)';
          btn.style.color = '#ffffff';
          var svg2 = btn.querySelector('svg');
          if (svg2) svg2.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
        }
      }
    });
  };

  function okbmCollectFeedFieldPhotos(record) {
    var rec = record || {};
    var tmplPhoto = rec.readyShotPhoto || rec.customTemplatePhoto || rec.ready_shot_photo || '';
    var list = (typeof getRecordPhotos === 'function') ? getRecordPhotos(rec) : (Array.isArray(rec.photos) ? rec.photos : []);
    return (Array.isArray(list) ? list : []).filter(function(p) {
      return p && p !== tmplPhoto;
    });
  }

  function okbmBuildReelPhotoFrontHtml(cardId, mediaItems, spotName, recordId) {
    var totalPhotosCount = Array.isArray(mediaItems) ? mediaItems.length : 0;
    var cardPureId = String(recordId || cardId || '').trim();
    var safeCardId = String(cardId || '');
    if (totalPhotosCount === 0) {
      return '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:24px 18px; box-sizing:border-box; text-align:center; background:#000000; pointer-events:none;">' +
        '<div style="display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px; pointer-events:none;">' +
          '<button type="button" data-record-id="' + escapeHtml(cardPureId) + '" onclick="event.stopPropagation(); triggerHaptic(12); window.openRichAfterTripModal(window.okbmFindFeedRecord(this.dataset.recordId));" style="pointer-events:auto; width:58px; height:58px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.22); display:flex; align-items:center; justify-content:center; color:#e2e8f0; box-shadow:0 4px 18px rgba(0,0,0,0.5); cursor:pointer; padding:0; outline:none;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:26px; height:26px; pointer-events:none;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
          '</button>' +
          '<div style="font-size:1.02rem; font-weight:900; color:#ffffff;">' + escapeHtml(spotName || '나의 힐링 스팟') + '</div>' +
          '<div style="font-size:0.74rem; color:#94a3b8; line-height:1.5; word-break:keep-all;">아이콘을 터치하여 사진을 등록하거나,<br>카드를 탭하여 패킹 정보를 확인하세요.</div>' +
        '</div>' +
      '</div>';
    }

    var horizontalSlidesHtml = mediaItems.map(function(pUrl) {
      return '<div style="flex:0 0 100% !important; width:100% !important; min-width:100% !important; max-width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:0 !important; margin:0 !important;">' +
        '<img class="reel-photo-target" src="' + escapeHtml(okbmSafeImageUrl(pUrl)) + '" loading="eager" decoding="async" onload="window.applySmartPhotoFit(this);" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:auto; height:auto; max-width:100%; max-height:100%; object-fit:contain; object-position:center center; display:block; background:#000000;" />' +
      '</div>';
    }).join('');

    var dotsHtml = '';
    if (totalPhotosCount > 1) {
      var dotsItemsHtml = Array.from({ length: totalPhotosCount }).map(function(_, dIdx) {
        var dotW = (dIdx === 0) ? '12px' : '4px';
        var dotBg = (dIdx === 0) ? '#ffffff' : 'rgba(255,255,255,0.3)';
        var dotShadow = (dIdx === 0) ? 'box-shadow:0 0 6px rgba(255,255,255,0.8);' : '';
        return '<div class="carousel-dot-item" style="width:' + dotW + '; height:3.5px; border-radius:2px; background:' + dotBg + '; ' + dotShadow + ' transition:all 0.2s ease;"></div>';
      }).join('');
      dotsHtml = '<div id="dotsWrap_' + safeCardId + '" style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); z-index:5; display:flex; justify-content:center; align-items:center; gap:4px; height:14px; padding:0 8px; background:#0c1017; border-radius:10px; border:1px solid rgba(255,255,255,0.15); pointer-events:none;">' + dotsItemsHtml + '</div>';
    }

    return '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \`' + safeCardId + '\`);">' + horizontalSlidesHtml + '</div>' + dotsHtml;
  }

  window.okbmSyncFeedCardMedia = function(record) {
    if (!record) return false;
    var rec = (typeof window.normalizeHistoryRecord === 'function') ? window.normalizeHistoryRecord(record, 0) : record;
    var cleanCardId = String(rec.id || '').replace(/^["']|["']$/g, '').trim();
    if (!cleanCardId) return false;
    var cardIdEsc = typeof escapeHtml === 'function' ? escapeHtml(cleanCardId) : cleanCardId;
    var card = document.getElementById('feedSnapCard_' + cardIdEsc) || document.getElementById('feedSnapCard_' + cleanCardId);
    if (!card) return false;

    var mediaItems = okbmCollectFeedFieldPhotos(rec);
    var front = card.querySelector('.postcard-face-front');
    if (!front) return false;

    var normalizePhotoSrc = function(u) {
      var raw = String(u || '').trim();
      if (!raw) return '';
      if (typeof okbmSafeImageUrl === 'function') return String(okbmSafeImageUrl(raw) || '').trim();
      return raw;
    };
    var existingSrcs = Array.prototype.map.call(front.querySelectorAll('.reel-horizontal-track .reel-photo-target'), function(img) {
      return normalizePhotoSrc(img.getAttribute('src') || '');
    }).filter(Boolean);
    var nextSrcs = mediaItems.map(function(u) { return normalizePhotoSrc(u); }).filter(Boolean);
    if (!nextSrcs.length && existingSrcs.length) return false;
    var photosChanged = existingSrcs.join('\n') !== nextSrcs.join('\n');

    if (photosChanged) {
      front.innerHTML = okbmBuildReelPhotoFrontHtml(cardIdEsc, nextSrcs, rec.spot || '나의 힐링 스팟', cleanCardId);
      front.querySelectorAll('.reel-photo-target').forEach(function(img) {
        if (typeof window.applySmartPhotoFit === 'function') window.applySmartPhotoFit(img);
      });
    }

    var memo120 = String(rec.memo || rec.oneLineMemo || '').slice(0, 120);
    var photoMemosArr = (Array.isArray(rec.photoMemos) && rec.photoMemos.length > 0) ? rec.photoMemos.slice() : [memo120];
    while (photoMemosArr.length < nextSrcs.length) photoMemosArr.push('');
    card.setAttribute('data-photo-memos', JSON.stringify(photoMemosArr));
    var initialPhotoMemo = photoMemosArr[0] || memo120 || '';
    var memoEl = document.getElementById('feedPhotoMemoText_' + cardIdEsc) || document.getElementById('feedPhotoMemoText_' + cleanCardId);
    if (memoEl) {
      memoEl.innerHTML = initialPhotoMemo.trim()
        ? escapeHtml(initialPhotoMemo.trim())
        : '<span style="color:#475569;">등록된 일지 메모가 없습니다.</span>';
    }
    return true;
  };

  function okbmPatchHistoryFeedRows(currentList, starsMap, starCounts, savedFeedsList, myUserId, savedNick) {
    if (!Array.isArray(currentList)) return;
    currentList.forEach(function(item, idx) {
      var record = window.normalizeHistoryRecord(item, idx);
      var cleanCardId = String(record.id || idx).replace(/^["']|["']$/g, '').trim();
      var cardIdEsc = escapeHtml(cleanCardId);
      var card = document.getElementById('feedSnapCard_' + cardIdEsc) || document.getElementById('feedSnapCard_' + cleanCardId);
      if (!card) return;

      var isStarred = Boolean(starsMap[cleanCardId] || starsMap[cardIdEsc] || starsMap[String(record.id)]);
      var parsedLikes = (record.likes_count !== undefined && record.likes_count !== null)
        ? Number(record.likes_count)
        : (record.likes !== undefined ? Number(record.likes) : Number(starCounts[cleanCardId] || 0));
      var starCount = isNaN(parsedLikes) ? 0 : parsedLikes;

      var starBtn = card.querySelector('[data-star-card-id]');
      if (starBtn) {
        var icon = starBtn.querySelector('svg');
        if (icon) {
          icon.setAttribute('fill', isStarred ? '#fde047' : 'none');
          icon.setAttribute('stroke', isStarred ? '#fde047' : '#ffffff');
          icon.style.filter = isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none';
        }
        var countEl = starBtn.querySelector('.js-feed-star-count') || starBtn.querySelector('[id^="feedStarCountText_"]');
        if (countEl) countEl.innerText = String(starCount);
      }

      var isSavedFeed = Array.isArray(savedFeedsList) && savedFeedsList.indexOf(cleanCardId) !== -1;
      card.querySelectorAll('button[data-save-feed], button[data-feed-id]').forEach(function(btn) {
        if (btn.hasAttribute('data-spot')) return;
        if (btn.hasAttribute('data-star-card-id')) return;
        var onclick = btn.getAttribute('onclick') || '';
        if (onclick.indexOf('toggleSaveFeed') === -1 && !btn.hasAttribute('data-save-feed')) return;
        btn.style.color = isSavedFeed ? '#c084fc' : '#cbd5e1';
        var svg = btn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isSavedFeed ? '#c084fc' : 'none');
      });

      var recordUserId = String(record.userId || '').trim();
      var authorName = record.author || record.nick || record.nickname || '';
      if (window.okbmIsOwnPostRecord && window.okbmIsOwnPostRecord(record, myUserId) && window.okbmIsPlaceholderNick && window.okbmIsPlaceholderNick(authorName) && savedNick && !window.okbmIsPlaceholderNick(savedNick)) {
        authorName = savedNick;
      }
      var targetAvatarUrl = (typeof window.resolveUserMasterPhoto === 'function')
        ? window.resolveUserMasterPhoto(recordUserId, authorName, record.authorPhoto)
        : (record.authorPhoto || '');
      if (targetAvatarUrl && String(targetAvatarUrl).startsWith('http')) {
        card.querySelectorAll('img[data-user-avatar-id]').forEach(function(img) {
          if (img.getAttribute('src') !== targetAvatarUrl) {
            img.setAttribute('src', targetAvatarUrl);
            img.style.display = 'block';
          }
        });
      }

      if (typeof window.okbmSyncFeedCardMedia === 'function') {
        window.okbmSyncFeedCardMedia(record);
      }
    });
  }

  // 🧰 [하단 4대 도구 인라인 슬라이드 서랍 토글]
  window.toggleFeedBottomTools = function(cardId, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    triggerHaptic(10);

    var drawer = document.getElementById('bottomToolsDrawer_' + cardId);
    var triggerBtn = document.getElementById('btnToggleBottomTools_' + cardId);
    if (!drawer || !triggerBtn) return;

    var isOpen = drawer.dataset.opened === 'true';

    document.querySelectorAll('[id^="bottomToolsDrawer_"]').forEach(function(d) {
      if (d !== drawer) {
        d.style.maxWidth = '0px';
        d.style.opacity = '0';
        d.style.transform = 'scale(0.85) translateX(12px)';
        d.style.pointerEvents = 'none';
        d.dataset.opened = 'false';
        var bId = d.id.replace('bottomToolsDrawer_', 'btnToggleBottomTools_');
        var btn = document.getElementById(bId);
        if (btn) {
          btn.style.transform = 'rotate(0deg)';
          btn.style.color = '#94a3b8';
          btn.style.borderColor = 'rgba(255,255,255,0.15)';
        }
      }
    });

    if (isOpen) {
      drawer.style.maxWidth = '0px';
      drawer.style.opacity = '0';
      drawer.style.transform = 'scale(0.85) translateX(12px)';
      drawer.style.pointerEvents = 'none';
      drawer.dataset.opened = 'false';
      triggerBtn.style.transform = 'rotate(0deg)';
      triggerBtn.style.color = '#94a3b8';
      triggerBtn.style.borderColor = 'rgba(255,255,255,0.15)';
    } else {
      drawer.style.maxWidth = '210px';
      drawer.style.opacity = '1';
      drawer.style.transform = 'scale(1) translateX(0px)';
      drawer.style.pointerEvents = 'auto';
      drawer.dataset.opened = 'true';
      triggerBtn.style.transform = 'rotate(90deg)';
      triggerBtn.style.color = '#38bdf8';
      triggerBtn.style.borderColor = '#38bdf8';
    }
  };

  // 🎴 [피드 단일 스냅 카드 HTML 생성기 - 초기/무한스크롤 SSOT 100% 일치]
  window.buildReelSingleSnapCardHtml = function(item, idx, ctx) {
    ctx = ctx || {};
    var myUserId = ctx.myUserId || '';
    var savedNick = ctx.savedNick || '낭만백패커';
    var starsMap = ctx.starsMap || {};
    var starCounts = ctx.starCounts || {};
    var savedFeedsList = ctx.savedFeedsList || [];
    var isLogged = (ctx.isLogged !== undefined) ? ctx.isLogged : ((typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false);

    var record = window.normalizeHistoryRecord(item, idx);
    var cardId = escapeHtml(String(record.id || idx));
    var tmplPhoto = record.readyShotPhoto || record.customTemplatePhoto || (item && (item.readyShotPhoto || item.customTemplatePhoto)) || '';
    if (!tmplPhoto && window.__memoryStore && window.__memoryStore['okbm_ready_shots_map']) {
      var rShot = window.__memoryStore['okbm_ready_shots_map'][String(record.id)];
      if (rShot && rShot.photo) tmplPhoto = rShot.photo;
    }
    if (!tmplPhoto && window.__memoryStore && window.__memoryStore['okbm_custom_templates_map']) {
      tmplPhoto = window.__memoryStore['okbm_custom_templates_map'][String(record.id)] || '';
    }

    var tmplPhotoClean = record.readyShotPhoto || '';
    var rawPhotosList = (typeof getRecordPhotos === 'function') ? getRecordPhotos(record) : (record.photos || []);
    var photos = (Array.isArray(rawPhotosList) ? rawPhotosList : []).filter(function(p) {
      return p && p !== tmplPhotoClean;
    });

    var spotName = record.spot || '나의 힐링 스팟';
    var tripDate = record.date || '';
    var weightKg = record.weightKg || '0.00';
    var memo120 = (record.memo || record.oneLineMemo || '').slice(0, 120);
    var authorName = record.author || record.nick || record.nickname || '';
    if (window.okbmIsOwnPostRecord && window.okbmIsOwnPostRecord(record, myUserId) && window.okbmIsPlaceholderNick && window.okbmIsPlaceholderNick(authorName) && savedNick && !window.okbmIsPlaceholderNick(savedNick)) {
      authorName = savedNick;
    }
    if (!authorName) authorName = '낭만백패커';

    var cleanCardId = String(record.id || idx).replace(/^["']|["']$/g, '').trim();
    var isStarred = Boolean(starsMap[cleanCardId] || starsMap[cardId] || starsMap[String(record.id)]);
    var parsedLikes = (record.likes_count !== undefined && record.likes_count !== null) ? Number(record.likes_count) : (record.likes !== undefined ? Number(record.likes) : Number(starCounts[cleanCardId] || 0));
    var starCount = isNaN(parsedLikes) ? 0 : parsedLikes;
    var mediaItems = (photos && photos.length > 0) ? photos : [];
    var totalPhotosCount = mediaItems.length;

    var recordUserId = String(record.userId || '').trim();
    var cardPureId = String(record.id || '').trim();

    var isMyRecord = Boolean(record._isLocalOwner || (isLogged && (typeof window.isRecordOwner === 'function') && window.isRecordOwner(record)));

    // 🌐 SNS 배지
    var rawSnsText = String(record.instagram || record.youtube || record.youtubeUrl || '').trim();
    var instaTargetUrl = '';
    var youtubeTargetUrl = '';

    if (rawSnsText.includes('youtube.com') || rawSnsText.includes('youtu.be')) {
      var cleanYt = rawSnsText.replace(/^@+/, '').split('?')[0].trim();
      var channelMatch = cleanYt.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
      if (channelMatch && channelMatch[1]) {
        youtubeTargetUrl = 'https://www.youtube.com/@' + channelMatch[1].replace(/^@/, '');
      } else {
        youtubeTargetUrl = cleanYt.startsWith('http') ? cleanYt : ('https://' + cleanYt);
      }
    } else if (rawSnsText) {
      if (rawSnsText.includes('instagram.com')) {
        var cleanInstaUrl = rawSnsText.replace(/^@+/, '').split('?')[0].trim();
        instaTargetUrl = cleanInstaUrl.startsWith('http') ? cleanInstaUrl : ('https://' + cleanInstaUrl);
      } else {
        var pureInstaId = rawSnsText.replace(/[@\s]/g, '').trim();
        if (pureInstaId) instaTargetUrl = 'https://instagram.com/' + pureInstaId;
      }
    }

    if (!youtubeTargetUrl && record.youtube) {
      var yStr = String(record.youtube).replace(/^@+/, '').split('?')[0].trim();
      var m = yStr.match(/(?:youtube\.com\/(?:@|c\/|channel\/)?|youtu\.be\/)([\w\-\_\.]+)/i);
      if (m && m[1]) {
        youtubeTargetUrl = 'https://www.youtube.com/@' + m[1].replace(/^@/, '');
      }
    }

    var socialBadgesHtml = '';
    if (!isMyRecord) {
      if (instaTargetUrl && okbmSafeExternalUrl(instaTargetUrl) !== '#') {
        socialBadgesHtml += '<a href="' + escapeHtml(okbmSafeExternalUrl(instaTargetUrl)) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0; transition:all 0.15s ease;" title="인스타그램">' +
          '<svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:#e2e8f0;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
          '</a>';
      }
      if (youtubeTargetUrl && okbmSafeExternalUrl(youtubeTargetUrl) !== '#') {
        socialBadgesHtml += '<a href="' + escapeHtml(okbmSafeExternalUrl(youtubeTargetUrl)) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation(); triggerHaptic(8);" style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); display:inline-flex; align-items:center; justify-content:center; text-decoration:none; flex-shrink:0; transition:all 0.15s ease;" title="유튜브">' +
          '<svg viewBox="0 0 24 24" style="width:13px; height:13px;" fill="none">' +
            '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#f43f5e"/>' +
            '<path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#ffffff"/>' +
          '</svg>' +
        '</a>';
      }
    }

    var isRegisteredSpot = !Boolean(record.unregisteredSpot) && (
      Boolean(String(record.spotId || '').trim()) ||
      window.isSpotRegisteredInMasterDB(spotName)
    );
    var canNavigateSpot = !Boolean(record.unregisteredSpot) &&
      Boolean(String(spotName || '').trim()) &&
      spotName !== '나의 힐링 스팟' &&
      spotName !== '힐링 장소';
    var centerDDayOverlayHtml = '';

    var targetAvatarUrl = (typeof window.resolveUserMasterPhoto === 'function')
      ? window.resolveUserMasterPhoto(recordUserId, authorName, record.authorPhoto)
      : (record.authorPhoto || '');

    var hasValidImg = Boolean(targetAvatarUrl && String(targetAvatarUrl).startsWith('http'));

    var avatarMarkup = hasValidImg
      ? '<img data-user-avatar-id="' + escapeHtml(recordUserId) + '" src="' + escapeHtml(okbmSafeImageUrl(targetAvatarUrl)) + '" style="width:100%; height:100%; object-fit:cover; display:block;" />'
      : '<div style="width:100%; height:100%; background:#090d14; display:flex; align-items:center; justify-content:center;"><img data-user-avatar-id="' + escapeHtml(recordUserId) + '" src="" style="width:100%; height:100%; object-fit:cover; display:none;" /><svg class="avatar-placeholder-svg" viewBox="0 0 24 24" style="width:18px; height:18px;" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';

    var diffDays = null;
    var dParts = String(tripDate || '').match(/\d+/g);
    if (dParts && dParts.length >= 3) {
      var targetD = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
      var todayD = new Date();
      todayD.setHours(0, 0, 0, 0);
      targetD.setHours(0, 0, 0, 0);
      diffDays = Math.round((targetD.getTime() - todayD.getTime()) / 86400000);

      if (totalPhotosCount === 0) {
        var ddayLabel = diffDays > 0 ? ('D-' + diffDays) : (diffDays === 0 ? 'D-DAY' : ('D+' + Math.abs(diffDays)));
        centerDDayOverlayHtml = '<div id="dDayBadgeWrap_' + cardId + '" style="position:absolute; top:14px; right:14px; z-index:25; pointer-events:none; display:inline-flex; align-items:center; background:#0c1017; border:1px solid rgba(255,255,255,0.14); border-radius:6px; padding:3px 8px;">' +
          '<span style="font-size:0.75rem; color:#e2e8f0; font-weight:900; font-family:\'Space Grotesk\', sans-serif; letter-spacing:0.4px; line-height:1;">' + ddayLabel + '</span>' +
        '</div>';
      }
    }

    var headerBarHtml = okbmBuildReelHeaderBarHtml(authorName, recordUserId, avatarMarkup, tripDate, spotName, canNavigateSpot, socialBadgesHtml, record.spotId);

    var hasRealFieldPhotos = Boolean(totalPhotosCount > 0);
    var isPub = Boolean(record.isPublished === true && hasRealFieldPhotos);
    var bottomToolsHtml = '';

    if (isMyRecord) {
      bottomToolsHtml = '<div style="display:flex; align-items:center; justify-content:flex-end; position:relative; flex-shrink:0;">' +
        '<div id="bottomToolsDrawer_' + cardId + '" data-opened="false" style="display:flex; align-items:center; gap:6px; max-width:0px; opacity:0; transform:scale(0.85) translateX(12px); transform-origin:right center; overflow:hidden; transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1); pointer-events:none; margin-right:6px; box-sizing:border-box;">' +
          '<button type="button" onclick="window.openPastTripsListModal(); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#38bdf8; flex-shrink:0;" title="보관함 모아보기">' +
            '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
          '</button>' +
          '<button type="button" data-record-id="' + cardId + '" data-lock-btn-id="' + cardId + '" onclick="window.toggleFeedPublishStatus(this.dataset.recordId, event);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:' + (isPub ? '#34d399' : '#38bdf8') + '; flex-shrink:0;" title="' + (isPub ? '전체 공개 중' : (!isRegisteredSpot ? '비공개 (등록 박지만 함께보기 가능)' : (hasRealFieldPhotos ? '비공개 (나만보기)' : '비공개 (디데이 이후 사진 등록 시 함께보기 가능)'))) + '">' +
            (isPub
              ? '<svg viewBox="0 0 24 24" style="width:16px; height:16px; color:#34d399;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>'
              : '<svg viewBox="0 0 24 24" style="width:16px; height:16px; color:#38bdf8;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            ) +
          '</button>' +
          '<button type="button" data-record-id="' + cardId + '" onclick="window.openRichAfterTripModal(window.okbmFindFeedRecord(this.dataset.recordId)); triggerHaptic(10);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#fde047; flex-shrink:0;" title="일지 및 사진 수정">' +
            '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
          '</button>' +
          '<button type="button" data-record-id="' + cardPureId + '" onclick="window.deleteTripRecord(this.dataset.recordId, event);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#f43f5e; flex-shrink:0;" title="기록 삭제">' +
            '<svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</div>' +
        '<button type="button" id="btnToggleBottomTools_' + cardId + '" data-card-id="' + cardId + '" onclick="window.toggleFeedBottomTools(this.dataset.cardId, event);" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#94a3b8; transition:all 0.2s ease; flex-shrink:0;" title="관리 도구 열기">' +
          '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
        '</button>' +
      '</div>';
    } else {
      bottomToolsHtml = okbmBuildFeedOthersMoreBtnHtml(cardPureId, recordUserId, authorName, 'inline');
    }

    var horizontalSlidesHtml = '';
    if (totalPhotosCount === 0) {
      horizontalSlidesHtml = '<div style="flex:0 0 100% !important; width:100% !important; height:100% !important; background:#000000; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:10px; padding:24px; box-sizing:border-box; text-align:center;">' +
        '<div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.04); border:1.5px dashed rgba(56,189,248,0.35); display:flex; align-items:center; justify-content:center; color:#38bdf8;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:24px; height:24px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
        '</div>' +
        '<div style="font-size:0.86rem; font-weight:800; color:#cbd5e1;">등록된 현장 사진이 없습니다</div>' +
        '<div style="font-size:0.68rem; color:#64748b; line-height:1.4;">하단 [···] 도구에서 사진을 추가해보세요</div>' +
      '</div>';
    } else {
      horizontalSlidesHtml = mediaItems.map(function(pUrl) {
        return '<div style="flex:0 0 100% !important; width:100% !important; min-width:100% !important; max-width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:0 !important; margin:0 !important;">' +
          '<img class="reel-photo-target" src="' + escapeHtml(okbmSafeImageUrl(pUrl)) + '" loading="eager" decoding="async" onload="window.applySmartPhotoFit(this);" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:auto; height:auto; max-width:100%; max-height:100%; object-fit:contain; object-position:center center; display:block; background:#000000;" />' +
        '</div>';
      }).join('');
    }

    var dotsHtml = '';
    if (totalPhotosCount > 1) {
      var dotsItemsHtml = Array.from({ length: totalPhotosCount }).map(function(_, dIdx) {
        var dotW = (dIdx === 0) ? '12px' : '4px';
        var dotBg = (dIdx === 0) ? '#ffffff' : 'rgba(255,255,255,0.3)';
        var dotShadow = (dIdx === 0) ? 'box-shadow:0 0 6px rgba(255,255,255,0.8);' : '';
        return '<div class="carousel-dot-item" style="width:' + dotW + '; height:3.5px; border-radius:2px; background:' + dotBg + '; ' + dotShadow + ' transition:all 0.2s ease;"></div>';
      }).join('');
      dotsHtml = '<div id="dotsWrap_' + cardId + '" style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); z-index:5; display:flex; justify-content:center; align-items:center; gap:4px; height:14px; padding:0 8px; background:#0c1017; border-radius:10px; border:1px solid rgba(255,255,255,0.15); pointer-events:none;">' + dotsItemsHtml + '</div>';
    }

    var savedTmplId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    var tmplId = record.templateId || savedTmplId;
    var rawPhoto = mediaItems[0] || '';
    var genFn = (typeof window.generateCardMarkup === 'function') ? window.generateCardMarkup : (typeof generateCardMarkup === 'function' ? generateCardMarkup : null);
    var backTemplateCardHtml = '';

    if (genFn) {
      backTemplateCardHtml = genFn(tmplId, record, record.items || [], spotName, memo120 || spotName, rawPhoto);
    } else {
      backTemplateCardHtml = '<div style="width:100%; height:100%; background:#090d15; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; position:relative;">' +
        '<div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(255,255,255,0.18); padding-bottom:6px;">' +
            '<span style="font-size:0.90rem; font-weight:800; color:#38bdf8; display:flex; align-items:center; gap:4px;">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:14px; height:14px;"><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/></svg>' +
              '<span>' + escapeHtml(spotName) + '</span>' +
            '</span>' +
            '<span style="font-size:0.65rem; color:#94a3b8; font-family:\'JetBrains Mono\', monospace;">' + escapeHtml(tripDate) + '</span>' +
          '</div>' +
          '<div style="margin-top:12px; display:flex; justify-content:space-between; align-items:baseline; background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">' +
            '<span style="font-size:0.72rem; color:#94a3b8; font-weight:700;">총 패킹 무게</span>' +
            '<span style="font-size:1.45rem; font-weight:900; color:#34d399; font-family:\'Space Grotesk\', sans-serif;">' + weightKg + ' KG</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var studioCardMarkup = '';
    var actualReadyShot = (record.readyShotPhoto && String(record.readyShotPhoto).trim().length > 10) ? String(record.readyShotPhoto).trim() : '';
    var usesPhotoTmpl = (typeof window.recordUsesPhotoTemplate === 'function') && window.recordUsesPhotoTemplate(record);

    if ((usesPhotoTmpl || actualReadyShot) && typeof window.generateReadyShotMarkup === 'function') {
      studioCardMarkup = '<div class="postcard-template-container">' +
        window.generateReadyShotMarkup(record, { photo: actualReadyShot }) +
        '</div>';
    } else if (actualReadyShot) {
      studioCardMarkup = '<div class="postcard-template-container"><div style="width:100%; max-width:330px; aspect-ratio:3/4; max-height:100%; margin:auto; position:relative; background:#000000; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:0 12px 30px rgba(0,0,0,0.9);"><img class="reel-photo-target" src="' + escapeHtml(okbmSafeImageUrl(actualReadyShot)) + '" onerror="this.onerror=null; window.handleFeedImageError(this);" style="width:100% !important; height:100% !important; object-fit:contain !important; display:block; background:#000000;" /></div></div>';
    } else {
      studioCardMarkup = '<div class="postcard-template-container">' + backTemplateCardHtml + '</div>';
    }

    var photoMemosArr = (Array.isArray(record.photoMemos) && record.photoMemos.length > 0) ? record.photoMemos.slice() : [memo120];
    while (photoMemosArr.length < totalPhotosCount) photoMemosArr.push('');
    var initialPhotoMemo = photoMemosArr[0] || memo120 || '';
    var cleanMemoContentHtml = initialPhotoMemo.trim()
      ? escapeHtml(initialPhotoMemo.trim())
      : '<span style="color:#475569;">등록된 일지 메모가 없습니다.</span>';

    var isSavedFeed = savedFeedsList.includes(String(record.id || '').trim());

    return '<div id="feedSnapCard_' + cardId + '" class="reel-page-snap" data-reel-idx="' + idx + '" data-feed-id="' + cardId + '" data-photo-memos="' + escapeHtml(JSON.stringify(photoMemosArr)) + '">' +
      headerBarHtml +

      '<div class="reel-media-stage">' +
        '<div style="width:100% !important; height:100% !important; position:relative; overflow:hidden; background:#000000;">' +
          (centerDDayOverlayHtml ? centerDDayOverlayHtml : '') +
          '<div class="postcard-3d-wrapper" onclick="this.classList.toggle(\'flipped\'); triggerHaptic(10);" style="width:100% !important; height:100% !important; position:relative; cursor:pointer; background:#000000;">' +
            '<div class="postcard-face-front" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000;">' +
              (totalPhotosCount > 0 ? (
                '<div class="reel-horizontal-track" onscroll="window.updateCarouselFeedState(this, \`' + cardId + '\`);">' + horizontalSlidesHtml + '</div>' + dotsHtml
              ) : (
                '<div style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:24px 18px; box-sizing:border-box; text-align:center; background:#000000; pointer-events:none;">' +
                  '<div style="display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px; pointer-events:none;">' +
                    '<button type="button" data-record-id="' + cardPureId + '" onclick="event.stopPropagation(); triggerHaptic(12); window.openRichAfterTripModal(window.okbmFindFeedRecord(this.dataset.recordId));" style="pointer-events:auto; width:58px; height:58px; border-radius:50%; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.22); display:flex; align-items:center; justify-content:center; color:#e2e8f0; box-shadow:0 4px 18px rgba(0,0,0,0.5); cursor:pointer; padding:0; outline:none; transition:transform 0.15s ease, background 0.15s ease;" onmousedown="this.style.transform=\'scale(0.92)\'; this.style.background=\'rgba(255,255,255,0.14)\';" onmouseup="this.style.transform=\'scale(1)\'; this.style.background=\'rgba(255,255,255,0.06)\';" ontouchstart="this.style.transform=\'scale(0.92)\'; this.style.background=\'rgba(255,255,255,0.14)\';" ontouchend="this.style.transform=\'scale(1)\'; this.style.background=\'rgba(255,255,255,0.06)\;\'">' +
                      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:26px; height:26px; pointer-events:none;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' +
                    '</button>' +
                    '<div style="font-size:1.02rem; font-weight:900; color:#ffffff;">' + escapeHtml(spotName) + '</div>' +
                    '<div style="font-size:0.74rem; color:#94a3b8; line-height:1.5; word-break:keep-all;">아이콘을 터치하여 사진을 등록하거나,<br>카드를 탭하여 패킹 정보를 확인하세요.</div>' +
                  '</div>' +
                '</div>'
              )) +
            '</div>' +
            '<div class="postcard-face-back" style="width:100% !important; height:100% !important; position:absolute; inset:0; overflow:hidden; background:#000000; display:flex !important; align-items:center !important; justify-content:center !important; padding:0 !important; box-sizing:border-box;">' +
              studioCardMarkup +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="reel-bottom-interactive-bar">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; min-height:32px;">' +
          '<div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">' +
            '<button type="button" data-star-card-id="' + escapeHtml(cleanCardId) + '" data-star-stop-touch="1" style="background:none; border:none; padding:6px 4px; margin:-6px -4px; cursor:pointer; display:flex; align-items:center; gap:4px; touch-action:manipulation; -webkit-tap-highlight-color:transparent; pointer-events:auto; z-index:20;">' +
              '<svg class="js-feed-star-icon" viewBox="0 0 24 24" style="width:18px; height:18px; filter:' + (isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none') + '; transition:transform 0.2s ease; pointer-events:none;" fill="' + (isStarred ? '#fde047' : 'none') + '" stroke="' + (isStarred ? '#fde047' : '#ffffff') + '" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
              '<span class="js-feed-star-count" style="font-size:0.75rem; font-weight:800; color:#fde047; font-family:\'Space Grotesk\', sans-serif; pointer-events:none;">' + starCount + '</span>' +
            '</button>' +
            '<button type="button" data-share-feed="1" data-feed-id="' + cardId + '" data-spot="' + escapeHtml(spotName) + '" data-memo="' + escapeHtml(memo120) + '" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:#cbd5e1;" title="공유">' +
              '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
            '</button>' +
            '<button type="button" data-save-feed="1" data-feed-id="' + cardId + '" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:' + (isSavedFeed ? '#c084fc' : '#cbd5e1') + ';" title="관심피드 즐겨찾기 저장">' +
              '<svg viewBox="0 0 24 24" style="width:16px; height:16px;" fill="' + (isSavedFeed ? '#c084fc' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
            '</button>' +
          '</div>' +

          '<div style="display:flex; align-items:center; gap:8px;">' +
            bottomToolsHtml +
          '</div>' +
        '</div>' +

        '<div class="reel-memo-fixed-slot">' +
          '<div id="feedPhotoMemoText_' + cardId + '" class="reel-memo-fixed-box">' +
            cleanMemoContentHtml +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

window.renderHistoryStage = function(isLoading) {
    var modal = document.getElementById('romanticHistoryModal');
    if (!modal) return;

    var content = modal.querySelector('.romantic-history-content');
    if (!content) return;

    var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;

    // 🛡️ [하위 호환 및 런타임 ReferenceError 100% 방탄 선언]
    var isMyTab = false;

    // 🌟 최신순 내림차순 정렬
    var sortDescFn = function(list) {
      if (!Array.isArray(list)) return [];
      return list.slice().sort(function(a, b) {
        return window.getRecordDateNum(b) - window.getRecordDateNum(a);
      });
    };

    var localHistoryList = (Array.isArray(window.interactiveHistory) && window.interactiveHistory.length > 0)
      ? window.interactiveHistory
      : (window.safeGetStorage('okbm_packing_history', []) || []);
    window.interactiveHistory = sortDescFn(localHistoryList);
    window.interactiveHistory.forEach(function(rec) {
      if (rec) rec._isLocalOwner = true;
    });

    window.activeHistoryFeedTab = window.activeHistoryFeedTab || 'route';
    content.classList.add('history-tab-route');
    content.classList.remove('history-tab-router');

    var profile = safeGetJSON('user_profile', null);
    var myUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
    var savedNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
    var savedInsta = localStorage.getItem('okbm_user_instagram') || '';
    var userStarsKey = (typeof window.okbmGetUserStarsKey === 'function') ? window.okbmGetUserStarsKey(myUserId) : 'okbm_feed_stars_map';
    var starsMap = safeGetJSON(userStarsKey, {});
    var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
    var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);

    // [제1조 SSOT] __allLoadedFeeds가 유일한 진실 공급원입니다.
    // __allLoadedFeeds가 비어있어도 interactiveHistory와 Union 결합하지 않습니다.
    // 서버 동기화 전이라면 로컬 소유 피드만 표시합니다.
    var ssotFeedPool = Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0
      ? window.__allLoadedFeeds
      : window.interactiveHistory.filter(function(r) { return r && r._isLocalOwner; });

    var combinedList = [];
    var addedIds = new Set();

    ssotFeedPool.forEach(function(item, idx) {
      if (!item) return;
      var feedId = String(item.id || '').trim();
      if (!feedId || addedIds.has(feedId)) return;

      var norm = window.normalizeHistoryRecord(item, idx);
      var rowUserId = String(norm.userId || item.user_id || item.userId || '').trim();
      var isOwner = Boolean(myUserId && rowUserId && myUserId === rowUserId);
      norm._isLocalOwner = isOwner;

      if (!isOwner) {
        var isPublic = true;
        try {
          if (typeof window.okbmIsPublicFeedItem === 'function') {
            isPublic = window.okbmIsPublicFeedItem(item) || window.okbmIsPublicFeedItem(norm);
          } else if (norm.isPublished === false || (window.okbmIsExplicitlyPrivate && window.okbmIsExplicitlyPrivate(norm))) {
            isPublic = false;
          }
        } catch (ePub) {
          isPublic = !(item && (item.is_published === false || item.isPublished === false));
        }
        if (!isPublic) return;
        if (typeof window.okbmRouteDateReached === 'function' && !window.okbmRouteDateReached(norm)) return;
      }

      combinedList.push(norm);
      addedIds.add(feedId);
    });

    combinedList = window.okbmApplyUgcSafetyFilter(combinedList);


    var currentList = combinedList;
    if (window.activeHistoryFeedTab === 'my') {
      currentList = combinedList.filter(function(r) {
        return r._isLocalOwner;
      });
    }

    currentList = sortDescFn(currentList);

    if (!isLoading) {
      var existingReel = document.getElementById('reelsVerticalContainer');
      if (existingReel && currentList.length > 0) {
        var existingCards = existingReel.querySelectorAll('.reel-page-snap[id^="feedSnapCard_"]');
        if (existingCards.length === currentList.length) {
          var idsMatch = true;
          for (var matchIdx = 0; matchIdx < currentList.length; matchIdx++) {
            var matchRec = window.normalizeHistoryRecord(currentList[matchIdx], matchIdx);
            var wantId = 'feedSnapCard_' + escapeHtml(String(matchRec.id || matchIdx));
            var wantIdRaw = 'feedSnapCard_' + String(matchRec.id || matchIdx);
            var gotId = existingCards[matchIdx].id;
            if (gotId !== wantId && gotId !== wantIdRaw) {
              idsMatch = false;
              break;
            }
          }
          if (idsMatch) {
            okbmPatchHistoryFeedRows(currentList, starsMap, starCounts, savedFeedsList, myUserId, savedNick);
            if (typeof window.ensureMasterBottomDock === 'function') {
              window.ensureMasterBottomDock('history');
            }
            if (typeof window.okbmBindReelFeedObserver === 'function') {
              window.okbmBindReelFeedObserver();
            }
            return;
          }
        }
      }
    }

    // 🎨 [낭만루트 헌법 준수: 눈부심 0% 순수 매트블랙 단일 테마 통일]
    var stageBg = '#000000';
    var headerBg = '#000000';
    var headerBorder = '1px solid rgba(255,255,255,0.06)';

    var reelSlidesHtml = '';
    if (isLoading) {
      reelSlidesHtml = '<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:#38bdf8;">' +
        '<svg viewBox="0 0 24 24" style="width:36px; height:36px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"/></svg>' +
        '<div style="font-size:0.86rem; font-weight:800; color:#e2e8f0;">최신 피드 동기화 중...</div>' +
      '</div>';
    } else if (currentList.length === 0) {
      var emptyMsg = '등록된 낭만루트 기록이 없습니다.';
      var emptySubMsg = '플랜에서 패킹 완료 후 보관함에 저장된 루트 기록이 표시됩니다.';

      reelSlidesHtml = '<div class="reel-page-snap" style="width:100% !important; height:100% !important; display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; gap:14px; padding:30px; text-align:center; box-sizing:border-box;">' +
        '<div style="width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; color:#38bdf8;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:24px; height:24px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
        '</div>' +
        '<div style="font-size:0.95rem; font-weight:800; color:#ffffff;">' + emptyMsg + '</div>' +
        '<div style="font-size:0.75rem; color:#94a3b8; line-height:1.5;">' + emptySubMsg + '</div>' +
      '</div>';
    } else {
      var feedRenderCtx = {
        myUserId: myUserId,
        savedNick: savedNick,
        starsMap: starsMap,
        starCounts: starCounts,
        savedFeedsList: savedFeedsList,
        isLogged: isLogged
      };

      reelSlidesHtml = currentList.map(function(item, idx) {
        return window.buildReelSingleSnapCardHtml(item, idx, feedRenderCtx);
      }).join('');
    }

    content.innerHTML = '<div id="reelsVerticalContainer" class="reel-vertical-container" style="flex:1 1 auto; min-height:0; height:auto; contain:content;" onscroll="window.__handleReelsVerticalScroll(this);">' +
      reelSlidesHtml +
    '</div>';

    if (window.__okbmScrollRouterTop) {
      window.__okbmScrollRouterTop = false;
      var snapScroller = document.getElementById('reelsVerticalContainer');
      if (snapScroller) snapScroller.scrollTop = 0;
    }

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }

    // ⚡ [세로 사진 100% 꽉 채우기 복원]: 캐시/네트워크 로드 완벽 감지 엔진
    var allReelImgs = content.querySelectorAll('.reel-photo-target');
    allReelImgs.forEach(function(img) {
      if (img.complete) {
        window.applySmartPhotoFit(img);
      } else {
        img.addEventListener('load', function() {
          window.applySmartPhotoFit(img);
        }, { once: true });
      }
    });

    window.appendNewFeedCardsToReels = function(newItems) {
      var reelContainer = document.getElementById('reelsVerticalContainer');
      if (!reelContainer || !Array.isArray(newItems) || newItems.length === 0) return;

      newItems = window.okbmApplyUgcSafetyFilter(newItems);
      if (!newItems.length) return;

      var existingCards = reelContainer.querySelectorAll('.reel-page-snap');
      var startIdx = existingCards.length;

      var isLogged = (typeof isUserLoggedIn === 'function') ? isUserLoggedIn() : false;
      var profile = safeGetJSON('user_profile', null);
      var myUserId = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
      var savedNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
      var userStarsKey = (typeof window.okbmGetUserStarsKey === 'function') ? window.okbmGetUserStarsKey(myUserId) : 'okbm_feed_stars_map';
      var starsMap = safeGetJSON(userStarsKey, {});
      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);

      var feedRenderCtx = {
        myUserId: myUserId,
        savedNick: savedNick,
        starsMap: starsMap,
        starCounts: starCounts,
        savedFeedsList: savedFeedsList,
        isLogged: isLogged
      };

      var appendedHtml = newItems.map(function(item, idxOffset) {
        return window.buildReelSingleSnapCardHtml(item, startIdx + idxOffset, feedRenderCtx);
      }).join('');

      reelContainer.insertAdjacentHTML('beforeend', appendedHtml);

      var newImgs = reelContainer.querySelectorAll('.reel-photo-target');
      newImgs.forEach(function(img) {
        if (img.complete) {
          window.applySmartPhotoFit(img);
        } else {
          img.addEventListener('load', function() {
            window.applySmartPhotoFit(img);
          }, { once: true });
        }
      });

      if (window.__reelWindowObserver && window.__okbmHistoryModalOpen) {
        var updatedCards = reelContainer.querySelectorAll('.reel-page-snap');
        for (var cIdx = startIdx; cIdx < updatedCards.length; cIdx++) {
          window.__reelWindowObserver.observe(updatedCards[cIdx]);
        }
      }
    };

    window.__handleReelsVerticalScroll = function(container) {
      if (!window.__okbmHistoryModalOpen) return;
      if (!container || window.__isFetchingMoreFeeds || window.__feedHasMore === false) return;
      clearTimeout(window.__reelsScrollDebounceTimer);
      window.__reelsScrollDebounceTimer = setTimeout(function() {
        if (!window.__okbmHistoryModalOpen) return;
        var remainingDistance = container.scrollHeight - (container.scrollTop + container.clientHeight);
        if (remainingDistance <= container.clientHeight * 1.5) {
          window.fetchMoreCommunityFeeds();
        }
      }, 60);
    };

    window.okbmBindReelFeedObserver();
  };

  window.okbmReleaseReelFeedObserver = function() {
    if (window.__reelWindowObserver) {
      try { window.__reelWindowObserver.disconnect(); } catch (e) {
        console.warn('[romantic-history.js:okbmReleaseReelFeedObserver]', e);
      }
      window.__reelWindowObserver = null;
    }
    if (window.__reelsScrollDebounceTimer) {
      clearTimeout(window.__reelsScrollDebounceTimer);
      window.__reelsScrollDebounceTimer = null;
    }
  };

  window.okbmBindReelFeedObserver = function() {
    var modal = document.getElementById('romanticHistoryModal');
    if (!window.__okbmHistoryModalOpen || !modal || modal.style.display === 'none') {
      window.okbmReleaseReelFeedObserver();
      return;
    }
    if (!window.IntersectionObserver) return;

    var reelContainer = document.getElementById('reelsVerticalContainer');
    if (!reelContainer) {
      window.okbmReleaseReelFeedObserver();
      return;
    }

    window.okbmReleaseReelFeedObserver();

    var allReelCards = Array.from(reelContainer.querySelectorAll('.reel-page-snap'));
    window.__reelWindowObserver = new IntersectionObserver(function(entries) {
      if (!window.__okbmHistoryModalOpen) return;
      entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
          var headerRow = entry.target.querySelector('.reel-header-row');
          if (headerRow) {
            headerRow.style.visibility = 'visible';
            headerRow.style.opacity = '1';
            headerRow.style.setProperty('z-index', '400', 'important');
          }
          var curIdx = parseInt(entry.target.dataset.reelIdx, 10);
          if (!isNaN(curIdx)) {
            var totalCards = reelContainer.querySelectorAll('.reel-page-snap').length;
            if (curIdx >= totalCards - 2 && window.__feedHasMore && !window.__isFetchingMoreFeeds) {
              window.fetchMoreCommunityFeeds();
            }

            allReelCards = Array.from(reelContainer.querySelectorAll('.reel-page-snap'));
            allReelCards.forEach(function(cardEl) {
              var cIdx = parseInt(cardEl.dataset.reelIdx, 10);
              var mediaStage = cardEl.querySelector('.postcard-3d-wrapper');
              if (mediaStage) {
                if (Math.abs(cIdx - curIdx) <= 3) {
                  mediaStage.style.visibility = 'visible';
                } else {
                  mediaStage.style.visibility = 'hidden';
                }
              }
            });
          }
        }
      });
    }, { root: reelContainer, threshold: 0.25 });

    allReelCards.forEach(function(card) {
      window.__reelWindowObserver.observe(card);
    });
  };

  window.__okbmHistoryHealthCheck = function() {
    var hasStore = !!(window.OKBMStore && window.OKBMStore.user);
    var hasOutbox = !!(window.OKBMOutbox && window.OKBMOutbox.syncNow);
    var histCount = Array.isArray(window.interactiveHistory) ? window.interactiveHistory.length : 0;
    return {
      view: 'history',
      storeReady: hasStore,
      outboxReady: hasOutbox,
      historyCount: histCount,
      activeTab: window.activeHistoryFeedTab || 'route',
      status: (hasStore && hasOutbox) ? 'HEALTHY' : 'CHECK_REQUIRED'
    };
  };

  window.okbmIsKakaoInApp = function() {
    return /KAKAOTALK/i.test(navigator.userAgent || '');
  };

  window.okbmApplyVisibleViewportToOverlay = function(el, opts) {
    if (!el) return;
    opts = opts || {};
    var vv = window.visualViewport;
    var top = vv ? Math.round(vv.offsetTop) : 0;
    var visH = vv ? Math.round(vv.height) : window.innerHeight;
    var dockH = 0;
    if (opts.reserveDock !== false) {
      if (opts._remeasureDock === false) {
        dockH = Number(window.__okbmVvDockH || 0);
      } else {
        var dock = document.getElementById('romanticMasterBottomDock');
        if (dock) {
          var dockCs = window.getComputedStyle(dock);
          if (dockCs.display !== 'none' && dockCs.visibility !== 'hidden') {
            var dockRect = dock.getBoundingClientRect();
            var visBottom = top + visH;
            if (dockRect.top < visBottom) {
              dockH = Math.max(0, Math.round(visBottom - dockRect.top));
            }
          }
        }
        window.__okbmVvDockH = dockH;
      }
    }
    var usable = Math.max(240, visH - dockH);
    el.style.setProperty('top', top + 'px', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
    el.style.setProperty('height', usable + 'px', 'important');
    el.style.setProperty('max-height', usable + 'px', 'important');
    el.classList.add('okbm-vv-fitted');
    document.documentElement.style.setProperty('--okbm-vvh', usable + 'px');
    document.documentElement.style.setProperty('--okbm-feed-bottom-space', '148px');
  };

  window.okbmBindOverlayViewportFit = function(el, opts) {
    window.okbmUnbindOverlayViewportFit();
    window.__okbmVvFitEl = el;
    window.__okbmVvFitOpts = opts || {};
    window.__okbmVvFitFn = function() {
      if (!window.__okbmVvFitEl || !document.body.contains(window.__okbmVvFitEl)) {
        window.okbmUnbindOverlayViewportFit();
        return;
      }
      window.okbmApplyVisibleViewportToOverlay(window.__okbmVvFitEl, Object.assign({}, window.__okbmVvFitOpts, { _remeasureDock: true }));
    };
    window.__okbmVvScrollFn = function() {
      if (!window.__okbmVvFitEl || !document.body.contains(window.__okbmVvFitEl)) {
        window.okbmUnbindOverlayViewportFit();
        return;
      }
      // 스크롤 중에는 독 높이를 다시 재지 않고 top만 맞춤.
      window.okbmApplyVisibleViewportToOverlay(window.__okbmVvFitEl, Object.assign({}, window.__okbmVvFitOpts, { _remeasureDock: false }));
    };
    window.okbmApplyVisibleViewportToOverlay(el, opts);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', window.__okbmVvFitFn);
      window.visualViewport.addEventListener('scroll', window.__okbmVvScrollFn);
    }
    window.addEventListener('resize', window.__okbmVvFitFn);
  };

  window.okbmUnbindOverlayViewportFit = function() {
    if (window.__okbmVvFitFn) {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', window.__okbmVvFitFn);
      }
      window.removeEventListener('resize', window.__okbmVvFitFn);
    }
    if (window.__okbmVvScrollFn && window.visualViewport) {
      window.visualViewport.removeEventListener('scroll', window.__okbmVvScrollFn);
    }
    window.__okbmVvFitFn = null;
    window.__okbmVvScrollFn = null;
    window.__okbmVvFitEl = null;
    window.__okbmVvFitOpts = null;
  };

  window.openHistoryModal = function() {
    if (typeof window.forceUpdateStableVh === 'function') {
      window.forceUpdateStableVh();
    }
    var modal = document.getElementById('romanticHistoryModal');
    var isAlreadyOpen = Boolean(modal && modal.style.display === 'flex');

    var historyContent = modal ? modal.querySelector('.romantic-history-content') : null;
    if (historyContent) {
      historyContent.style.setProperty('width', '100%', 'important');
      historyContent.style.setProperty('max-width', '100%', 'important');
      historyContent.style.setProperty('margin', '0', 'important');
    }

    if (isAlreadyOpen) {
      triggerHaptic(10);
      var scroller = document.getElementById('reelsVerticalContainer');
      if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    var planModal = document.getElementById('romanticPlanModal');
    if (planModal) planModal.style.setProperty('display', 'none', 'important');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'romanticHistoryModal';
      modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)) !important; width:100% !important; max-width:100% !important; height:auto !important; max-height:none !important; background:#000000; z-index:1000005 !important; justify-content:center; align-items:stretch; overflow:hidden !important; touch-action:pan-y !important; transform:translateZ(0); -webkit-transform:translateZ(0); box-sizing:border-box; overscroll-behavior:none !important;';
      modal.innerHTML = '<div class="history-status-bar-scrim"></div><div class="romantic-history-content" style="width:100% !important; max-width:100% !important; margin:0; height:100%; max-height:100%; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
    } else {
      if (!modal.querySelector('.history-status-bar-scrim')) {
        var scrim = document.createElement('div');
        scrim.className = 'history-status-bar-scrim';
        modal.insertBefore(scrim, modal.firstChild);
      }
      modal.style.setProperty('top', '0', 'important');
      modal.style.setProperty('bottom', 'calc(56px + env(safe-area-inset-bottom, 8px))', 'important');
      modal.style.setProperty('height', 'auto', 'important');
      modal.style.removeProperty('max-height');
      modal.style.setProperty('overscroll-behavior', 'none', 'important');
    }

    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '1000005', 'important');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('history-modal-open');
    window.__okbmHistoryModalOpen = true;
    if (typeof window.okbmStartNotifPoll === 'function') window.okbmStartNotifPoll();

    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock('history');
    }

    if (typeof window.renderHistoryStage === 'function') {
      window.renderHistoryStage();
    }

    if (typeof window.okbmBindOverlayViewportFit === 'function') {
      window.okbmBindOverlayViewportFit(modal, { reserveDock: true });
    }

    window.fetchCommunityFeeds(true).then(function(feeds) {
      if (!window.__okbmHistoryModalOpen) return;
      if (feeds == null) return;
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
    });

    triggerHaptic(10);
  };

  window.closeHistoryModal = function() {
    window.__okbmHistoryModalOpen = false;
    if (typeof window.okbmUnbindOverlayViewportFit === 'function') {
      window.okbmUnbindOverlayViewportFit();
    }
    _okbmAbortCommunityFeedsFetch();
    if (typeof window.okbmCleanupModalWatchers === 'function') {
      window.okbmCleanupModalWatchers();
    } else if (typeof window.okbmReleaseReelFeedObserver === 'function') {
      window.okbmReleaseReelFeedObserver();
    }
    var modal = document.getElementById('romanticHistoryModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    document.body.classList.remove('history-modal-open');
    var isMap = (typeof window.location !== 'undefined') && window.location.pathname.includes('map.html');
    if (typeof window.ensureMasterBottomDock === 'function') {
      window.ensureMasterBottomDock(isMap ? 'map' : 'router');
    }
    var planStillOpen = document.getElementById('romanticPlanModal');
    if (planStillOpen && planStillOpen.style.display !== 'none' && typeof window.okbmStartNotifPoll === 'function') {
      window.okbmStartNotifPoll();
    }
    triggerHaptic(10);
  };

  // 하위 호환 매핑
  window.openMyInfoModal = function(tab) {
    if (tab === 'plan') {
      if (typeof window.openPlanModal === 'function') window.openPlanModal('calendar');
    } else {
      window.openHistoryModal();
    }
  };
  window.closeMyInfoModal = function() {
    window.closeHistoryModal();
    if (typeof window.closePlanModal === 'function') window.closePlanModal();
  };

  // 🔄 마이리포트 프로필 사진 변경 시 보관함 피드 아바타 실시간 리렌더링
  // 🛡️ [메모리 누수 패치] 중복 등록 방지
  if (!window.__histProfilePhotoListenerBound) {
    window.__histProfilePhotoListenerBound = true;
    window.addEventListener('okbm_profile_photo_changed', function() {
      if (!window.__okbmHistoryModalOpen) return;
      if (typeof window.renderHistoryStage === 'function') {
        window.renderHistoryStage();
      }
    });
  }
})();