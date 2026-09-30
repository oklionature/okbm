// 인덱스(홈) 페이지 본문 스크립트. 예전 index.html 인라인 <script>(약 240KB)를 그대로 옮겼다(FILE_AUDIT F7).
// 같은 자리에서 동기(<script src>, defer 없음)로 실행되므로 실행 순서·전역 선언은 인라인 때와 같다.
// 이 파일을 고치면 index.html의 index-main.js?v= 를 올리고, on* 핸들러 문자열을 바꿨다면 node scripts/csp-extract.mjs --write.
    window.smoothNavigate = function(url, e) {
      var currentPath = window.location.pathname;
      var targetPath = (url || '').split('?')[0];
      var isTargetHome = (targetPath.includes('index.html') || targetPath === '/' || targetPath === '');
      var isCurrentHome = (currentPath.includes('index.html') || currentPath.endsWith('/'));

      if (isTargetHome && isCurrentHome) {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        var hadTripModal = document.getElementById('tripDetailSheetModal') || document.getElementById('tripCreateModal') || document.getElementById('tripJoinListModal');
        if (typeof window.closeAllTripModals === 'function') window.closeAllTripModals();
        if (typeof closePlanModal === 'function') closePlanModal();
        if (typeof closeHistoryModal === 'function') closeHistoryModal();
        if (!hadTripModal) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
        return;
      }

      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (window.__okbmPageLeaving) return;
      window.__okbmPageLeaving = true;
      document.documentElement.classList.add('okbm-page-leaving');
      setTimeout(function() {
        window.location.assign(url);
      }, 180);
    };

    // 🧰 [공통 유틸] romantic-sync.js window.* 버전 참조
    var safeGetJSON = function(key, defaultVal) {
      if (typeof window.okbmReadSpotsCache === 'function' && (key === 'okbm_spots_cache' || key === 'okbm_master_spots')) {
        var spotsCached = window.okbmReadSpotsCache();
        if (Array.isArray(spotsCached) && spotsCached.length) return spotsCached;
      }
      if (typeof window.safeGetJSON === 'function' && window.safeGetJSON !== safeGetJSON) {
        return window.safeGetJSON(key, defaultVal);
      }
      try {
        var item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
      } catch (e) {
        return defaultVal;
      }
    };
    window.safeGetJSON = window.safeGetJSON || safeGetJSON;

    var escapeHtml = function(text) {
      // 전역 escapeHtml(romantic-sync.js)이 아직 없어도 이스케이프는 반드시 한다.
      if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
      return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };
    var okbmSafeImageUrl = function(url) {
      return (typeof window.okbmSafeImageUrl === 'function') ? window.okbmSafeImageUrl(url) : '';
    };
    var okbmSafeExternalUrl = function(url) {
      return (typeof window.okbmSafeExternalUrl === 'function') ? window.okbmSafeExternalUrl(url) : '#';
    };

    if (!window.__okbmIndexSafeClickBound) {
      window.__okbmIndexSafeClickBound = true;
      document.addEventListener('click', function(e) {
        var tripItem = e.target.closest('#tripSpotDropdown .spot-dropdown-item');
        if (tripItem) {
          if (typeof window.selectTripSpot === 'function') {
            window.selectTripSpot(tripItem.dataset.spot || '');
          }
          return;
        }
        var mapSpot = e.target.closest('.js-open-map-spot');
        if (mapSpot) {
          if (mapSpot.dataset.closeModal === 'video' && typeof closeVideoDetailModal === 'function') {
            closeVideoDetailModal();
          } else if (mapSpot.dataset.closeModal === 'trip') {
            var sheet = document.getElementById('tripDetailSheetModal');
            if (sheet) sheet.remove();
          }
          location.href = 'map.html?spot=' + encodeURIComponent(mapSpot.dataset.spot || '');
        }
      }, true);
    }

    var triggerHaptic = window.triggerHaptic = window.triggerHaptic || function(duration) {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        try {
          if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
            navigator.vibrate(duration || 12);
          }
        } catch (e) {}
      }
    };

    window.KAKAO_APP_KEY = window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1";

    var registeredSpots = [];
    var currentLuckySpot = null;
    window.currentShareRecord = null;
    window.currentShareItems = [];
    window.selectedTemplateId = parseInt(localStorage.getItem('romantic_selected_template') || '1', 10);
    window.currentSharePhoto = '';
    window.currentPhotoTextColor = 'white';
    window.currentCardRatio = '9/16';
    var currentCustomRatioVal = 0.75;
    var currentPhotoScaleVal = 1.0;

    function getArchivePhotosList(record) {
      if (!record) return [];
      var list = [];
      if (Array.isArray(record.photos)) {
        list = record.photos;
      } else if (typeof record.photos === 'string' && record.photos.trim().startsWith('[')) {
        try { list = JSON.parse(record.photos); } catch (e) { list = []; }
      }
      return list.filter(function(u) {
        return typeof u === 'string' && u.trim().startsWith('https://');
      });
    }

    function countFeedGalleryPhotos(record) {
      if (!record) return 0;
      var list = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(record)) || getArchivePhotosList(record) || [];
      if (!Array.isArray(list)) return 0;
      return list.filter(function(u) {
        return typeof u === 'string' && u.trim().startsWith('http');
      }).length;
    }

    function feedHasGalleryPhotos(record) {
      return countFeedGalleryPhotos(record) > 2;
    }

    var THEME_SPOT_REGION_PREFIX_RE = /^(강원|경기|인천|충북|충남|전북|전남|경북|경남|제주|서울|세종|울산|부산|대구|광주|대전|전라남도|전라북도|경상남도|경상북도|충청남도|충청북도)\s+/;
    var THEME_SPOT_PROVINCE_DO_RE = /^(경기|강원|충청|충남|충북|전라|전남|전북|경상|경남|경북)도$/;

    function stripThemeSpotDecorations(name) {
      return String(name || '').replace(/\s*\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function tokenizeThemeSpotName(name) {
      return stripThemeSpotDecorations(name).split(' ').filter(function(t) { return t.length > 0; });
    }

    function themeSpotHasToken(tokens, needle) {
      if (!needle) return false;
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i] === needle) return true;
      }
      return false;
    }

    // 홈(히어로·테마 스팟·아카이브)이 쓰는 공개 피드 목록. __allLoadedFeeds는 낭만보관함이 10개씩 받은
    // 페이지(내 비공개 글 포함)로 덮어써서, 보관함을 한 번 열면 테마 스팟이 비거나 개수가 줄었다.
    // 홈 목록은 initDynamicHeroAndFeeds가 받은 것을 따로 들고, 글 저장·삭제만 같이 반영한다.
    window.__okbmHomeFeedPool = [];
    window.okbmFilterHomeFeedPool = function(keep) {
      if (Array.isArray(window.__okbmHomeFeedPool) && typeof keep === 'function') {
        window.__okbmHomeFeedPool = window.__okbmHomeFeedPool.filter(keep);
      }
    };
    window.okbmUpsertHomeFeedPool = function(rec) {
      if (!rec || !rec.id || !Array.isArray(window.__okbmHomeFeedPool) || !window.__okbmHomeFeedPool.length) return;
      var id = String(rec.id).trim();
      var idx = window.__okbmHomeFeedPool.findIndex(function(f) { return f && String(f.id).trim() === id; });
      if (idx !== -1) window.__okbmHomeFeedPool[idx] = Object.assign({}, window.__okbmHomeFeedPool[idx], rec);
      else window.__okbmHomeFeedPool.unshift(rec);
    };
    function getHomeFeedPool() {
      if (Array.isArray(window.__okbmHomeFeedPool) && window.__okbmHomeFeedPool.length > 0) return window.__okbmHomeFeedPool;
      if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) return window.__allLoadedFeeds;
      return safeGetJSON('okbm_cached_community_feeds', []) || [];
    }

    function getThemeSpotPool() {
      if (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0) {
        return registeredSpots;
      }
      return (typeof safeGetJSON === 'function' ? (safeGetJSON('okbm_spots_cache', []) || []) : []);
    }

    function findThemeSpotMaster(feedOrName, spotPool) {
      if (!Array.isArray(spotPool) || spotPool.length === 0) return null;

      // spot_id가 있으면 이름 매칭 없이 ID만 사용 (동명 산 오부착 방지)
      if (feedOrName && typeof feedOrName === 'object') {
        var feedSpotId = String(feedOrName.spotId || feedOrName.spot_id || '').trim();
        if (feedSpotId) {
          for (var si = 0; si < spotPool.length; si++) {
            var sidSpot = spotPool[si];
            if (sidSpot && String(sidSpot.id || sidSpot.spot_id || '').trim() === feedSpotId) {
              return sidSpot;
            }
          }
        }
      }

      var raw = (feedOrName && typeof feedOrName === 'object')
        ? String(feedOrName.spot || feedOrName.spotName || '').trim()
        : String(feedOrName || '').trim();
      if (!raw) return null;

      var feedClean = stripThemeSpotDecorations(raw);
      var feedTokens = tokenizeThemeSpotName(raw);
      var feedCore = feedClean.replace(THEME_SPOT_REGION_PREFIX_RE, '').trim();
      var feedCityHint = (raw.match(/([가-힣]{2,12}(?:시|군|구))/) || [])[1] || '';
      var feedCityCore = feedCityHint
        ? feedCityHint.replace(/(특별자치시|광역시|특별시|시|군|구)$/g, '')
        : '';
      var best = null;
      var bestScore = 0;
      var tie = false;

      for (var i = 0; i < spotPool.length; i++) {
        var s = spotPool[i];
        if (!s) continue;
        var sMain = stripThemeSpotDecorations(s.name || s.spot_main || '');
        var sFull = stripThemeSpotDecorations(s.fullName || s.fullname || s.full_name || '');
        var sFullCore = sFull.replace(THEME_SPOT_REGION_PREFIX_RE, '').trim();
        if (!sMain) continue;

        var score = 0;
        if (sFull && sFull === feedClean) score = 100;
        else if (sMain === feedClean || sMain === feedCore) score = 90;
        else if (sFull && (sFull === feedCore || sFullCore === feedCore)) score = 85;
        else if (themeSpotHasToken(feedTokens, sMain)) score = 70;
        else if (sFull && themeSpotHasToken(tokenizeThemeSpotName(sFull), feedCore)) score = 60;

        if (score < 70) continue;

        var city = String(s.cityName || s.city_name || '').trim();
        var region = String(s.region || '').trim();
        var cityCore = city.replace(/(특별자치시|광역시|특별시|시|군|구)$/g, '');
        var regionHit = false;
        if (cityCore && cityCore.length >= 2 && (themeSpotHasToken(feedTokens, cityCore) || feedClean.indexOf(cityCore.toLowerCase()) !== -1 || feedClean.indexOf(city.toLowerCase()) !== -1)) {
          score += 25;
          regionHit = true;
        } else if (region && (themeSpotHasToken(feedTokens, region) || feedClean.indexOf(region.toLowerCase()) !== -1)) {
          score += 15;
          regionHit = true;
        }

        // 피드에 시·군·구가 있는데 이 박지와 다르면 탈락
        if (feedCityCore && cityCore && feedCityCore !== cityCore) continue;

        // 동명 산: spot_sub 고유 토큰(칠족령 등)이 피드에 있으면 지역 없이도 확정
        var subRaw = String(s.spot_sub || '').trim();
        var subParts = subRaw.match(/[가-힣]{3,}/g) || [];
        var feedCompact = feedClean.replace(/\s+/g, '');
        var subHit = false;
        var subUnique = true;
        for (var sp = 0; sp < subParts.length; sp++) {
          var part = subParts[sp];
          if (!part || part === sMain.replace(/\s+/g, '')) continue;
          if (feedCompact.indexOf(part) === -1 && feedClean.indexOf(part) === -1) continue;
          subHit = true;
          for (var oj = 0; oj < spotPool.length; oj++) {
            var os = spotPool[oj];
            if (!os || os === s) continue;
            var omain = stripThemeSpotDecorations(os.name || os.spot_main || '');
            if (omain !== sMain) continue;
            if (String(os.spot_sub || '').indexOf(part) !== -1) { subUnique = false; break; }
          }
          if (!subUnique) break;
        }
        if (subHit && subUnique) {
          score += 40;
          regionHit = true;
        }

        // 지역 힌트 없이 산명만 맞고, 동일 spot_main이 여럿이면 이 후보만으로는 확정하지 않음
        if (!regionHit && !feedCityCore && score < 100) {
          var mainDup = 0;
          var mk = sMain;
          for (var j = 0; j < spotPool.length; j++) {
            var om = stripThemeSpotDecorations((spotPool[j] && (spotPool[j].name || spotPool[j].spot_main)) || '');
            if (om && om === mk) mainDup++;
            if (mainDup > 1) break;
          }
          if (mainDup > 1) continue;
        }

        if (score > bestScore) {
          bestScore = score;
          best = s;
          tie = false;
        } else if (score === bestScore && best && best !== s) {
          tie = true;
        }
      }
      if (tie && bestScore < 100) return null;
      return bestScore >= 70 ? best : null;
    }

    function tokenLooksLikeIslandName(token) {
      if (!token || THEME_SPOT_PROVINCE_DO_RE.test(token)) return false;
      return /도$/.test(token) && token.length >= 2;
    }

    function parseThemeSpotKm(mSpot) {
      if (!mSpot) return null;
      var raw = (mSpot.distance_km != null && mSpot.distance_km !== '')
        ? mSpot.distance_km
        : mSpot.distance;
      if (raw == null || raw === '') return null;
      var m = String(raw).match(/(\d+(?:\.\d+)?)/);
      if (!m) return null;
      var km = parseFloat(m[1]);
      return isFinite(km) ? km : null;
    }

    function getSecretSpotThemeFlags(feed, spotPool) {
      var rawName = String((feed && (feed.spot || feed.spotName)) || '').trim();
      var mSpot = findThemeSpotMaster(feed, spotPool);
      var terrainList = [];
      if (mSpot && mSpot.terrain) {
        terrainList = Array.isArray(mSpot.terrain)
          ? mSpot.terrain
          : String(mSpot.terrain).split(',').map(function(t) { return t.trim(); });
      }
      var terrainStr = terrainList.join(' ').toLowerCase();
      var masterName = mSpot ? String(mSpot.fullName || mSpot.fullname || mSpot.name || mSpot.spot_main || '') : '';
      var hay = (rawName + ' ' + masterName + ' ' + terrainStr).toLowerCase();
      var nameTokens = tokenizeThemeSpotName(rawName + ' ' + masterName);

      var difficulty = mSpot ? (parseInt(mSpot.difficulty, 10) || 3) : null;
      var km = parseThemeSpotKm(mSpot);
      // 초보 페이스: 1km = 30분
      var walkMin = (km != null) ? (km * 30 / 1) : null;

      var isDeck = terrainStr.indexOf('데크') !== -1 || /데크|대크/.test(rawName);

      var isIslandTerrain = /섬/.test(terrainStr);
      var hasIslandToken = nameTokens.some(tokenLooksLikeIslandName);
      var isIslandName = /꽃섬/.test(hay) || hasIslandToken;
      var isIsland = isIslandTerrain || isIslandName;

      var isBeach = /해변|해수욕장|해안/.test(terrainStr) || /해변|해수욕장|해안/.test(rawName) || /해변|해수욕장|해안/.test(masterName);

      var isBeginner = (difficulty !== null && difficulty >= 1 && difficulty <= 2)
        && (km != null && km <= 1)
        && (walkMin != null && walkMin <= 30);

      var isAfterwork = !isIsland
        && (difficulty !== null && difficulty <= 3)
        && (km != null && km <= 1.5);

      var isRemote = (difficulty !== null && difficulty >= 4 && difficulty <= 5)
        && (km != null && km >= 2);

      var isRockTerrain = /암릉|너덜|돌박지|돌침대|슬랩|암장|암반/.test(terrainStr) || /바위/.test(terrainStr);
      var isRockName = /암릉|너덜|돌박지|바위틈|암반|절벽노지/.test(rawName) || (/바위/.test(rawName) && !isIsland && !isDeck);
      var isRock = (isRockTerrain || isRockName) && !isIsland;

      var isValley = /계곡/.test(terrainStr) || /계곡/.test(rawName) || /계곡/.test(masterName);

      return {
        mSpot: mSpot,
        isBeginner: isBeginner,
        isAfterwork: isAfterwork,
        isIsland: isIsland,
        isBeach: isBeach,
        isRemote: isRemote,
        isRock: isRock,
        isDeck: isDeck,
        isValley: isValley
      };
    }

    function feedMatchesSecretSpotTheme(feed, themeKey, spotPool) {
      if (!themeKey || themeKey === 'all') return true;
      var flags = getSecretSpotThemeFlags(feed, spotPool);
      if (themeKey === 'beginner') return flags.isBeginner;
      if (themeKey === 'afterwork') return flags.isAfterwork;
      if (themeKey === 'island') return flags.isIsland;
      if (themeKey === 'beach') return flags.isBeach;
      if (themeKey === 'remote') return flags.isRemote;
      if (themeKey === 'rock') return flags.isRock;
      if (themeKey === 'deck') return flags.isDeck;
      if (themeKey === 'valley') return flags.isValley;
      return false;
    }

   // =========================================================================
    // 🏕️ [숨은 장소 독립 테마 큐레이션 & 히어로 1:1 대형 3:4 화보 뷰어 엔진]
    // =========================================================================
    // 🏕️ [테마 스팟 전용 아카이브 2열 갤러리 모달 엔진]
    window.currentThemeSpotAllTab = 'all';

    window.openThemeSpotAllModal = function() {
      var old = document.getElementById('themeSpotAllModal');
      if (old) old.remove();

      var modal = document.createElement('div');
      modal.id = 'themeSpotAllModal';
      modal.className = 'modal-fullscreen-container';
      modal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:calc(var(--vh, 1vh) * 100); max-height:calc(var(--vh, 1vh) * 100); background:#000000; z-index:1000045; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;';

      modal.style.height = 'calc(var(--vh, 1vh) * 100)';
      modal.style.maxHeight = 'calc(var(--vh, 1vh) * 100)';
      modal.innerHTML = `
        <div class="modal-app-header" style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); height:auto !important; min-height:48px; padding:12px 14px !important; padding-top:calc(12px + env(safe-area-inset-top, 0px)) !important; display:flex; justify-content:flex-start; align-items:center; box-sizing:border-box;">
          <span style="font-size:0.95rem; font-weight:900; color:#ffffff; letter-spacing:-0.02em;">테마 스팟 아카이브</span>
        </div>

        <div style="flex-shrink:0; background:#07090e; padding:6px 14px 8px 14px; border-bottom:1px solid rgba(255,255,255,0.06); box-sizing:border-box;">
          <nav class="netflix-category-bar" style="padding:0; gap:6px;">
            <button type="button" class="n-cat-chip active" onclick="window.filterThemeSpotAllGrid('all', this)">전체</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('beginner', this)">초보</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('afterwork', this)">퇴근박</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('island', this)">섬</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('beach', this)">해변</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('remote', this)">오지</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('rock', this)">돌박지</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('deck', this)">데크</button>
            <button type="button" class="n-cat-chip" onclick="window.filterThemeSpotAllGrid('valley', this)">계곡</button>
          </nav>
        </div>

        <div id="themeSpotAllScrollBody" class="modal-scroll-body" style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; contain:content; padding:12px 14px calc(30px + env(safe-area-inset-bottom, 0px)) 14px; box-sizing:border-box;">
          <div id="themeSpotAllGridContainer" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px; width:100%; box-sizing:border-box;"></div>
        </div>
      `;

      document.body.appendChild(modal);
      if (typeof window.lockHomeScrollForTripModal === 'function') {
        window.lockHomeScrollForTripModal();
      }
      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('themeSpotAllModal', window.closeThemeSpotAllModal);
      }
      window.renderThemeSpotAllGrid('all');
    };

    window.closeThemeSpotAllModal = function() {
      var modal = document.getElementById('themeSpotAllModal');
      if (!modal) return;
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('themeSpotAllModal');
      }
      modal.remove();
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      }
    };

    window.filterThemeSpotAllGrid = function(themeKey, btnEl) {
      window.currentThemeSpotAllTab = themeKey;
      var parent = btnEl ? btnEl.parentElement : null;
      if (parent) {
        parent.querySelectorAll('.n-cat-chip').forEach(function(b) { b.classList.remove('active'); });
        btnEl.classList.add('active');
      }
      window.renderThemeSpotAllGrid(themeKey);
    };

   window.renderThemeSpotAllGrid = function(themeKey) {
      var grid = document.getElementById('themeSpotAllGridContainer');
      if (!grid) return;

      var feedPool = getHomeFeedPool();
      if (typeof window.filterHiddenUgcFeeds === 'function') {
        feedPool = window.filterHiddenUgcFeeds(feedPool);
      }

      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      var validPhotoFeeds = [];
      var seenSpots = new Set();
      var spotPool = getThemeSpotPool();

      // 📈 모달 전체보기에도 시간 감쇠 트렌딩 알고리즘 적용
      var sortedByTrend = feedPool.filter(function(f) {
        return window.okbmIsHomePublicFeed(f);
      }).sort(function(a, b) {
        return calculateFeedTrendScore(b, starCounts) - calculateFeedTrendScore(a, starCounts);
      });

      sortedByTrend.forEach(function(f) {
        if (!feedMatchesSecretSpotTheme(f, themeKey, spotPool)) return;

        var spotName = String(f.spot || f.spotName || '').trim();
        var cleanSpotName = spotName.replace(/\s*\(.*?\)/g, '').trim();
        if (!cleanSpotName || seenSpots.has(cleanSpotName)) return;
        if (!feedHasGalleryPhotos(f)) return;

        var photoUrl = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(f)[0]) || '';

        if (typeof photoUrl === 'string' && photoUrl.trim().length > 10) {
          seenSpots.add(cleanSpotName);
          validPhotoFeeds.push({
            feed: f,
            spotName: spotName,
            cleanSpotName: cleanSpotName,
            photoUrl: photoUrl.trim()
          });
        }
      });

      var filtered = validPhotoFeeds;

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; padding:60px 10px; text-align:center; font-size:0.75rem; color:#64748b;">해당 테마에 등록된 스팟이 없습니다.</div>';
        return;
      }

      grid.innerHTML = filtered.map(function(item) {
        var f = item.feed;
        var sName = item.cleanSpotName;
        var author = f.author || f.nick || '낭만백패커';
        var badgeText = f.elevation ? (String(f.elevation).includes('m') ? f.elevation : f.elevation + 'm') : (f.weightKg ? (f.weightKg + 'kg') : 'FIELD');
        var sId = escapeHtml(String(f.id || sName));

        return `
          <div data-spot-id="${sId}" onclick="openSecretSpotHeroViewer(this.dataset.spotId)" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; cursor:pointer; box-sizing:border-box; transition:transform 0.15s ease;">
            <div style="width:100%; aspect-ratio:4/3; position:relative; background:#000; overflow:hidden;">
              <img src="${escapeHtml(okbmSafeImageUrl(item.photoUrl))}" alt="${escapeHtml(sName)}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />
              <div style="position:absolute; bottom:6px; right:6px; background:#0c1017; color:#fde047; font-size:0.58rem; font-weight:900; font-family:var(--font-en); padding:2px 6px; border-radius:4px; border:1px solid rgba(253,224,71,0.35);">${escapeHtml(badgeText)}</div>
            </div>
            <div style="padding:9px 10px 10px 10px; display:flex; flex-direction:column; gap:3px; box-sizing:border-box;">
              <span style="font-size:0.80rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(sName)}</span>
              <span style="font-size:0.62rem; color:#94a3b8; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:10px; height:10px; stroke:#38bdf8; fill:none; stroke-width:2;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${escapeHtml(author)}</span>
              </span>
            </div>
          </div>
        `;
      }).join('');
    };

    function filterSecretSpotTheme(themeKey, btnEl) {
      window.currentSecretSpotTheme = themeKey;
      document.querySelectorAll('#heroTrailerSectionWrap .n-cat-chip').forEach(function(b) { b.classList.remove('active'); });
      if (btnEl) btnEl.classList.add('active');
      renderSecretSpotTrailerRail();
    }

    // 📈 [트렌딩 알고리즘]: 인기도(별점) + 시간 감쇠(신선도) 하이브리드 스코어링 엔진
    function calculateFeedTrendScore(f, starCounts) {
      if (!f) return 0;
      var stars = Number(starCounts[f.id] != null ? starCounts[f.id] : (f.likes || 0));
      var feedTime = (typeof getFeedTimeValue === 'function') ? getFeedTimeValue(f) : 0;
      if (!feedTime && f.createdAt) {
        feedTime = new Date(String(f.createdAt).replace(/\./g, '/')).getTime() || 0;
      }
      var now = Date.now();
      var daysElapsed = feedTime > 0 ? Math.max(0, (now - feedTime) / (1000 * 60 * 60 * 24)) : 30;
      // 점수 공식: (별점 + 1.5) / (경과일수 + 2)^1.2
      return (stars + 1.5) / Math.pow(daysElapsed + 2, 1.2);
    }

    // 테마 스팟 레일: 피드를 받기 전에는 실제 카드와 같은 크기의 뼈대를 보여 준다(index.html 첫 화면 마크업과 같은 모양)
    function themeRailSkeletonHtml() {
      var card = '<div class="n-trailer-card okbm-sk-card" aria-hidden="true" style="width:118px !important;">' +
        '<div class="n-trailer-thumb okbm-sk"></div>' +
        '<div class="n-trailer-info"><i class="okbm-sk okbm-sk-line" style="width:72%;"></i><i class="okbm-sk okbm-sk-line okbm-sk-line--sm" style="width:44%;"></i></div>' +
        '</div>';
      return '<span class="okbm-sr" role="status">테마 스팟을 불러오는 중</span>' + card + card + card + card;
    }

    // 테마 스팟 레일이 비었을 때: 다른 테마를 고른 경우에만 '전체 테마 보기'로 되돌리는 버튼을 준다
    function themeRailEmptyHtml(canReset) {
      return '<div class="okbm-empty" role="status">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20l6-11 4 7 3-4 5 8z"/><circle cx="17" cy="6" r="2"/></svg>' +
        '<p class="okbm-empty-t">' + (canReset ? '이 테마에 올라온 사진이 아직 없어요' : '아직 올라온 사진이 없어요') + '</p>' +
        (canReset ? '<button type="button" class="okbm-empty-btn" onclick="filterSecretSpotTheme(\'all\', document.querySelector(\'#heroTrailerSectionWrap .n-cat-chip\'))">전체 테마 보기</button>' : '') +
        '</div>';
    }

    function renderSecretSpotTrailerRail() {
      var railContainer = document.getElementById('secretSpotTrailerRailContainer');
      if (!railContainer) return;
      // 결과가 직전과 같으면 다시 그리지 않는다. 부팅 중 캐시·네트워크·스팟 로딩마다 최대 4번 다시 만들어져
      // 썸네일을 다시 디코딩하고 가로 스크롤이 처음으로 돌아가던 문제를 막는다.
      var setRailHtml = function(html) {
        if (railContainer.__okbmRailHtml === html) return;
        railContainer.innerHTML = html;
        railContainer.__okbmRailHtml = html;
      };

      var feedPool = getHomeFeedPool();
      if (typeof window.filterHiddenUgcFeeds === 'function') {
        feedPool = window.filterHiddenUgcFeeds(feedPool);
      }

      // 서버 피드가 오기 전에는 풀에 기본 안내 기록(hero_preset_master)만 있다. 이때는 '없음'이 아니라 로딩이다
      var hasServerFeeds = feedPool.some(function(f) { return f && String(f.id || '') !== 'hero_preset_master'; });
      if (!hasServerFeeds) {
        setRailHtml(themeRailSkeletonHtml());
        return;
      }

      var starCounts = safeGetJSON('okbm_feed_stars_counts', {});
      var themeKey = window.currentSecretSpotTheme || 'all';
      var spotPool = getThemeSpotPool();

      // 📷 테마에 맞는 유효 사진 피드만 선별 & 장소 기준 중복 제거
      var validPhotoFeeds = [];
      var seenSpots = new Set();

      var sortedByTrend = feedPool.filter(function(f) {
        return window.okbmIsHomePublicFeed(f);
      }).sort(function(a, b) {
        return calculateFeedTrendScore(b, starCounts) - calculateFeedTrendScore(a, starCounts);
      });

      sortedByTrend.forEach(function(f) {
        if (!feedMatchesSecretSpotTheme(f, themeKey, spotPool)) return;

        var spotName = String(f.spot || f.spotName || '').trim();
        var cleanSpotName = spotName.replace(/\s*\(.*?\)/g, '').trim();
        if (!cleanSpotName || seenSpots.has(cleanSpotName)) return;
        if (!feedHasGalleryPhotos(f)) return;

        var photoUrl = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(f)[0]) || '';

        if (typeof photoUrl === 'string' && photoUrl.trim().length > 10) {
          seenSpots.add(cleanSpotName);
          validPhotoFeeds.push({
            feed: f,
            spotName: spotName,
            cleanSpotName: cleanSpotName,
            photoUrl: photoUrl.trim()
          });
        }
      });

      var filteredFeeds = validPhotoFeeds;
      if (filteredFeeds.length === 0) {
        setRailHtml(themeRailEmptyHtml(themeKey !== 'all'));
        return;
      }

      setRailHtml(filteredFeeds.slice(0, 24).map(function(item) {
        var f = item.feed;
        var sName = item.cleanSpotName;
        var author = f.author || f.nick || '낭만백패커';
        var badgeText = f.elevation ? (String(f.elevation).includes('m') ? f.elevation : f.elevation + 'm') : (f.weightKg ? (f.weightKg + 'kg') : 'FIELD');
        var sId = escapeHtml(String(f.id || sName));

        return `
          <div class="n-trailer-card" data-spot-id="${sId}" onclick="openSecretSpotHeroViewer(this.dataset.spotId)" style="width:118px !important; flex-shrink:0; cursor:pointer;">
            <div class="n-trailer-thumb">
              <img src="${escapeHtml(okbmSafeImageUrl(item.photoUrl))}" alt="${escapeHtml(sName)}" loading="lazy" decoding="async" />
              <div class="n-trailer-weight-chip">${escapeHtml(badgeText)}</div>
            </div>
            <div class="n-trailer-info">
              <span class="n-trailer-spot-name">${escapeHtml(sName)}</span>
              <span class="n-trailer-author-date" style="font-weight:700; display:flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:10px; height:10px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${escapeHtml(author)}</span>
              </span>
            </div>
          </div>
        `;
      }).join(''));
    }

    (function bindThemeSpotHomeWheelLock() {
      function attach() {
        var section = document.getElementById('heroTrailerSectionWrap');
        if (!section || section.__okbmWheelLocked) return;
        section.__okbmWheelLocked = true;
        section.addEventListener('wheel', function(e) {
          if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
          var rail = document.getElementById('secretSpotTrailerRailContainer');
          if (rail && rail.scrollWidth > rail.clientWidth + 2) {
            rail.scrollLeft += e.deltaY;
          }
          e.preventDefault();
          e.stopPropagation();
        }, { passive: false });
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
      } else {
        attach();
      }
    })();

    // 🚪 [테마 스팟 뷰어 모달 닫기 엔진]
    window.closeSecretSpotHeroModal = function() {
      var modalEl = document.getElementById('secretSpotHeroModal');
      if (!modalEl) return;
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('secretSpotHeroModal');
      }
      modalEl.remove();
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      }
    };

    // 🔘 [테마 스팟 화보 뷰어: 도트 & 사진별 메모 실시간 직통 동기화]
    window.updateSecretSpotStoryBars = function(trackEl) {
      if (!trackEl) return;
      var width = trackEl.offsetWidth;
      if (!width) return;
      var curIdx = Math.round(trackEl.scrollLeft / width);

      var container = document.getElementById('secretSpotDotsWrap');
      if (container) {
        var dots = container.children;
        for (var b = 0; b < dots.length; b++) {
          if (b === curIdx) {
            dots[b].style.width = '12px';
            dots[b].style.background = '#ffffff';
            dots[b].style.boxShadow = '0 0 6px rgba(255,255,255,0.9)';
          } else {
            dots[b].style.width = '4px';
            dots[b].style.background = 'rgba(255,255,255,0.35)';
            dots[b].style.boxShadow = 'none';
          }
        }
      }

      var modalEl = document.getElementById('secretSpotHeroModal');
      var quoteEl = document.getElementById('secretSpotQuoteText');
      if (modalEl && quoteEl) {
        var defaultMemo = modalEl.dataset.defaultMemo || '';
        try {
          var memos = JSON.parse(modalEl.dataset.photoMemos || '[]');
          if (!Array.isArray(memos)) memos = [];
          var filledCount = memos.filter(function(m) { return String(m || '').trim(); }).length;
          var curText = (memos[curIdx] !== undefined) ? String(memos[curIdx] || '').trim() : '';
          if (filledCount <= 1 && !curText) curText = String(defaultMemo || '').trim();
          if (curText) {
            quoteEl.innerText = '“' + curText + '”';
          } else {
            quoteEl.innerText = '“자연 속에서 비화식으로 즐기는 조용한 하룻밤.”';
          }
        } catch (err) {
          quoteEl.innerText = '“' + defaultMemo + '”';
        }
      }
    };

    // 🖼️ [3:4 대형 화보 뷰어: 풀커버 + 사진 속 닷 + 하단 5대 메인독 탑재]
    window.openSecretSpotHeroViewer = function(spotOrFeedId) {
      var old = document.getElementById('secretSpotHeroModal');
      if (old) old.remove();

      var targetKey = String(spotOrFeedId || '').trim();
      var cleanTargetKey = targetKey.replace(/\s*\(.*?\)/g, '').trim().toLowerCase();

      // 테마 스팟 카드는 홈 목록에서 나오므로 홈 목록을 먼저 찾고, 없으면 보관함 목록까지 본다
      var cachedFeeds = getHomeFeedPool().concat(Array.isArray(window.__allLoadedFeeds) ? window.__allLoadedFeeds : []);
      var visibleFeeds = cachedFeeds;
      if (typeof window.filterHiddenUgcFeeds === 'function') {
        visibleFeeds = window.filterHiddenUgcFeeds(cachedFeeds);
      }
      function findThemeFeed(list) {
        return (list || []).find(function(f) {
          if (!f) return false;
          if (String(f.id).trim() === targetKey) return true;
          var fSpot = String(f.spot || f.spotName || '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
          return fSpot === cleanTargetKey;
        });
      }
      var matchedFeed = findThemeFeed(visibleFeeds) || findThemeFeed(cachedFeeds);
      var spotPool = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots : (safeGetJSON('okbm_spots_cache', []) || []);

      var matchedSpot = null;
      if (matchedFeed && typeof findThemeSpotMaster === 'function') {
        matchedSpot = findThemeSpotMaster(matchedFeed, spotPool);
      }
      if (!matchedSpot) {
        matchedSpot = spotPool.find(function(s) {
          if (!s) return false;
          if (String(s.id).trim() === targetKey) return true;
          var sName = String(s.name || s.spot_main || '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
          return sName === cleanTargetKey;
        });
      }

      if (!matchedFeed && !matchedSpot) return;

      var spotName = matchedFeed ? (matchedFeed.spot || matchedFeed.spotName) : (matchedSpot.name || matchedSpot.spot_main || '장소');
      var cleanMapSpotName = matchedSpot
        ? String(matchedSpot.spot_main || matchedSpot.name || spotName).replace(/\s*\(.*?\)/g, '').trim()
        : String(spotName).replace(/\s*\(.*?\)/g, '').trim();
      var mapSpotId = matchedSpot ? String(matchedSpot.id || '').trim() : '';
      var desc = (matchedFeed && (matchedFeed.memo || matchedFeed.oneLineMemo))
        ? (matchedFeed.memo || matchedFeed.oneLineMemo)
        : (matchedSpot ? (matchedSpot.desc || matchedSpot.desc_summary || '자연 속에서 비화식과 흔적 없는 클린 백패킹을 실천하는 추천 장소입니다.') : '자연 속에서 비화식과 흔적 없는 클린 백패킹을 실천하는 추천 장소입니다.');
      var author = (matchedFeed && (matchedFeed.author || matchedFeed.nick)) ? (matchedFeed.author || matchedFeed.nick) : '낭만백패커';
      var feedOrSpotId = escapeHtml(String((matchedFeed && matchedFeed.id) || (matchedSpot && matchedSpot.id) || cleanMapSpotName));
      var heroFeedId = matchedFeed ? String(matchedFeed.id || '').trim() : '';
      var heroUserId = matchedFeed ? String(matchedFeed.userId || matchedFeed.user_id || '').trim() : '';
      var heroSafetyHtml = '';
      var isOwnThemeFeed = heroUserId && typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(heroUserId);
      if (heroFeedId && !isOwnThemeFeed && typeof window.openUgcSafetyMenu === 'function') {
        heroSafetyHtml = '<button type="button" data-feed-id="' + escapeHtml(heroFeedId) + '" data-user-id="' + escapeHtml(heroUserId) + '" data-author="' + escapeHtml(author) + '" onclick="event.preventDefault(); event.stopPropagation(); window.openUgcSafetyMenu(this.dataset.feedId, this.dataset.userId, this.dataset.author, event);" title="더보기" aria-label="더보기" style="width:31px; height:31px; flex:0 0 31px; border-radius:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; display:flex; align-items:center; justify-content:center; padding:0; cursor:pointer;">' +
          '<svg viewBox="0 0 24 24" style="width:16px; height:16px; pointer-events:none;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
        '</button>';
      }

      // 📷 사진 목록 추출
      var photosList = [];
      if (matchedFeed) {
        photosList = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(matchedFeed)) || [];
        if (!photosList.length && typeof getArchivePhotosList === 'function') {
          photosList = getArchivePhotosList(matchedFeed) || [];
        }
      }

      if (photosList.length === 0 && !matchedFeed && matchedSpot) {
        if (Array.isArray(matchedSpot.photos) && matchedSpot.photos.length > 0) {
          photosList = matchedSpot.photos.filter(function(u) { return typeof u === 'string' && u.startsWith('https://'); });
        }
      }

      if (photosList.length === 0) {
        return;
      }

      var photoMemosArr = matchedFeed ? getRecordPhotoMemos(matchedFeed) : [];
      var defaultDesc = String(desc || '').trim();

      var slidesHtml = photosList.map(function(u) {
        return `
          <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#000;">
            <img src="${escapeHtml(okbmSafeImageUrl(u))}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; filter:brightness(0.96) contrast(1.04);" />
            <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 70%, rgba(0,0,0,0.75) 100%); pointer-events:none;"></div>
          </div>
        `;
      }).join('');

      var dotsHtml = (photosList.length > 1) ? `
        <div id="secretSpotDotsWrap" style="position:absolute; bottom:10px; left:0; right:0; display:flex; justify-content:center; align-items:center; gap:4px; height:8px; z-index:25; pointer-events:none;">
          ${photosList.map(function(_, bIdx) {
            var dotW = (bIdx === 0) ? '12px' : '4px';
            var dotBg = (bIdx === 0) ? '#ffffff' : 'rgba(255,255,255,0.35)';
            return `<div style="width:${dotW}; height:4px; border-radius:2px; background:${dotBg}; transition:all 0.2s ease;"></div>`;
          }).join('')}
        </div>
      ` : '';

      var modalEl = document.createElement('div');
      modalEl.id = 'secretSpotHeroModal';
      modalEl.dataset.photoMemos = JSON.stringify(photoMemosArr);
      modalEl.dataset.defaultMemo = defaultDesc;
      modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); width:100%; height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)); background:#000000; z-index:1000045; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; overscroll-behavior:none; touch-action:none;';
      if (typeof window.ensureMasterBottomDock === 'function') {
        window.ensureMasterBottomDock('router');
      }

      var firstMemoText = (photoMemosArr[0] && photoMemosArr[0].trim().length > 0)
        ? photoMemosArr[0].trim()
        : defaultDesc;

      modalEl.innerHTML = `
        <!-- 상단 고정 본문: 마우스 휠로 홈(일행구하기)이 밀려 올라오지 않게 overflow 잠금 -->
        <div style="flex:1 1 0%; min-height:0; overflow:hidden; overscroll-behavior:none; touch-action:pan-x; contain:content; padding:calc(10px + env(safe-area-inset-top, 0px)) 14px 14px 14px; display:flex; justify-content:center; align-items:center; box-sizing:border-box;">
          <div style="width:100%; max-width:440px; display:flex; flex-direction:column; gap:8px; margin:0; box-sizing:border-box;">
            
            <div class="insta-card" style="position:relative; width:100%; aspect-ratio:3/4; max-height:calc(var(--vh, 1vh) * 62); border-radius:16px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,0.18); box-shadow:0 8px 24px rgba(0,0,0,0.45); box-sizing:border-box; flex-shrink:0;">
              
              <!-- ✕ 초슬림 투명 글래스 닫기 앵커 -->
              <button type="button" onclick="window.closeSecretSpotHeroModal();" style="position:absolute; top:10px; right:10px; z-index:30; width:24px; height:24px; border-radius:50%; background:#0c1017; border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; transition:all 0.15s ease;">
                <svg viewBox="0 0 24 24" style="width:11px; height:11px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>

              <!-- 📷 가로 스와이프 트랙 -->
              <div onscroll="window.updateSecretSpotStoryBars(this);" style="display:flex !important; width:100% !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important;">
                ${slidesHtml}
              </div>

              <!-- 🔘 사진 속 닷 인디케이터 -->
              ${dotsHtml}

              <div style="position:absolute; bottom:22px; left:0; right:0; padding:0 14px; z-index:20; pointer-events:none; display:flex; flex-direction:column; gap:2px;">
                <div style="font-size:1.15rem; font-weight:900; color:#ffffff; text-shadow:0 2px 8px rgba(0,0,0,0.9);">${escapeHtml(spotName)}</div>
              </div>
            </div>

            <!-- 하단 글래스 메모 (가변 자연스러운 높이 유지) -->
            <div class="insta-glass-memo">
              <div class="insta-memo-quote" id="secretSpotQuoteText" style="font-size:0.75rem; line-height:1.45; color:#cbd5e1; display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
                “${escapeHtml(firstMemoText)}”
              </div>

              <div class="insta-memo-actions-row" style="margin-top:2px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.12); display:flex; gap:6px; flex-wrap:nowrap; align-items:center;">
                <button type="button" class="btn-insta-action btn-action-map" data-map-id="${escapeHtml(mapSpotId)}" data-spot="${escapeHtml(cleanMapSpotName)}" onclick="window.closeSecretSpotHeroModal(); location.href='map.html?' + (this.dataset.mapId ? ('id=' + encodeURIComponent(this.dataset.mapId)) : ('spot=' + encodeURIComponent(this.dataset.spot)));" style="flex:1;">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>자세히보기</span>
                </button>
                <button type="button" class="btn-insta-action btn-action-template" data-spot-id="${feedOrSpotId}" onclick="window.openSecretSpotTemplateModal(this.dataset.spotId);" style="flex:1;">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>장비 세팅보기</span>
                </button>
                ${heroSafetyHtml}
              </div>
            </div>

          </div>
        </div>

        `;

      document.body.appendChild(modalEl);
      if (typeof window.lockHomeScrollForTripModal === 'function') {
        window.lockHomeScrollForTripModal();
      }
      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('secretSpotHeroModal', window.closeSecretSpotHeroModal);
      }
      modalEl.addEventListener('wheel', function(e) {
        if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { passive: false });
    };


    function handleHeroNavClick(e) {
      if (e) e.stopPropagation();
      var record = window.currentHeroRecord;
      var spotName = (record && (record.spot || record.spotName)) ? (record.spot || record.spotName) : '대관령 선자령';
      location.href = 'map.html?spot=' + encodeURIComponent(spotName.replace(/\s*\(.*?\)/g, ''));
    }

    function openCurrentTemplateModal(e) {
      if (e) e.stopPropagation();
      var record = window.currentHeroRecord;
      if (!record) return;

      if (typeof window.openPackShareModal === 'function') {
        window.openPackShareModal(record);
      } else if (typeof openPackShareModal === 'function') {
        openPackShareModal(record);
      }
    }

    window.heroTopRecords = [];
    window.currentHeroCardIndex = 0;
    window.currentHeroPhotoIndex = 0;
    window.currentHeroPhotosList = [];
    window.currentHeroRecord = null;

 // 👤 [1위 등록자 피드 모아보기 직통 연동]
    window.openHeroAuthorCollection = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }

      var rec = window.currentHeroRecord;
      if (!rec) return;

      var authorName = rec.author || rec.nick || '낭만백패커';
      var userId = rec.userId || ('author_' + encodeURIComponent(authorName));

      if (typeof window.openUserFeedCollectionModal === 'function') {
        window.openUserFeedCollectionModal(authorName, userId);
      } else if (typeof window.openHistoryModal === 'function') {
        window.openHistoryModal();
        var tryCount = 0;
        var checker = setInterval(function() {
          tryCount++;
          if (typeof window.openUserFeedCollectionModal === 'function') {
            clearInterval(checker);
            window.openUserFeedCollectionModal(authorName, userId);
          } else if (tryCount > 10) {
            clearInterval(checker);
          }
        }, 100);
      }
    };

    window.openTripAuthorProfile = function(authorName, userId) {
      window.closeTripAuthorProfile();

      var targetNick = String(authorName || '낭만대원').trim();
      var cleanTarget = targetNick.toLowerCase();
      var targetUid = userId ? String(userId).trim() : '';

      var allFeeds = (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0)
        ? window.__allLoadedFeeds
        : (safeGetJSON('okbm_cached_community_feeds', []) || []);
      if (typeof window.filterHiddenUgcFeeds === 'function') {
        allFeeds = window.filterHiddenUgcFeeds(allFeeds);
      }

      var userFeeds = allFeeds.filter(function(f) {
        if (!f) return false;
        try {
          if (window.okbmIsPublicFeedItem && !window.okbmIsPublicFeedItem(f)) return false;
        } catch (e) {
          if (f.isPublished === false || f.is_published === false) return false;
        }
        var fNick = String(f.author || f.nick || '').trim().toLowerCase();
        var fUid = String(f.userId || '').trim();
        if (targetUid && fUid && targetUid === fUid) return true;
        return cleanTarget && fNick === cleanTarget;
      });

      var totalKg = 0;
      var kgCount = 0;
      userFeeds.forEach(function(f) {
        var w = parseFloat(f.weightKg || f.weight || 0);
        if (w > 0) { totalKg += w; kgCount++; }
      });
      var avgKgText = kgCount > 0 ? (totalKg / kgCount).toFixed(2) + 'kg' : '0.00kg';

      var profileModalZ = 1000065;

      var localHistList = safeGetJSON('okbm_packing_history', []) || [];
      if (Array.isArray(localHistList) && localHistList.length > 0) {
        localHistList.forEach(function(lh) {
          if (!lh) return;
          var lhNick = String(lh.author || lh.nick || '').trim().toLowerCase();
          var lhUid = String(lh.userId || '').trim();
          var isMatched = (targetUid && lhUid && targetUid === lhUid) || (cleanTarget && lhNick === cleanTarget);
          var isPublic = true;
          try {
            isPublic = !window.okbmIsPublicFeedItem || window.okbmIsPublicFeedItem(lh);
          } catch (ePub) {
            isPublic = lh.isPublished !== false && lh.is_published !== false;
          }
          if (isMatched && isPublic && !userFeeds.some(function(uf) { return uf && String(uf.id) === String(lh.id); })) {
            userFeeds.unshift(lh);
          }
        });
      }

      var modal = document.createElement('div');
      modal.id = 'tripUserProfileModal';
      modal.style.cssText = 'position:fixed; inset:0; width:100%; height:100%; height:calc(var(--vh, 1vh) * 100); max-height:calc(var(--vh, 1vh) * 100); background:#000000; z-index:' + profileModalZ + ' !important; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; transform:translateZ(0);';

      var feedsGridHtml = '';
      if (userFeeds.length === 0) {
        feedsGridHtml = '<div style="grid-column:1/-1; padding:60px 14px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;">' +
          '<div style="width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.06); border:1px dashed rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; color:#64748b; font-size:1.2rem;">⛺</div>' +
          '<div style="font-size:0.84rem; font-weight:800; color:#cbd5e1;">등록된 백패킹 피드가 없습니다.</div>' +
          '<div style="font-size:0.68rem; color:#64748b;">이 대원은 아직 공개 피드를 작성하지 않았습니다.</div>' +
        '</div>';
      } else {
        feedsGridHtml = userFeeds.map(function(f) {
          var photoUrl = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(f)[0]) || '';
          if (!photoUrl) return '';
          var sName = f.spot || f.spotName || '백패킹 필드';
          var wText = f.weightKg ? (f.weightKg + 'kg') : (f.elevation ? (f.elevation + 'm') : 'FIELD');
          var dateText = f.date || f.createdAt || '';
          var fId = escapeHtml(String(f.id || ''));

          return '<div data-feed-id="' + fId + '" onclick="window.closeTripAuthorProfile(); if(typeof openSecretSpotHeroViewer===\'function\') openSecretSpotHeroViewer(this.dataset.feedId);" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; cursor:pointer;">' +
            '<div style="width:100%; aspect-ratio:1/1; position:relative; background:#000; overflow:hidden;">' +
              '<img src="' + escapeHtml(okbmSafeImageUrl(photoUrl)) + '" alt="' + escapeHtml(sName) + '" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />' +
              '<div style="position:absolute; bottom:5px; right:5px; background:#0c1017; color:#34d399; font-size:0.56rem; font-weight:900; font-family:var(--font-en); padding:1.5px 5px; border-radius:4px; border:1px solid rgba(52,211,153,0.3);">' + escapeHtml(wText) + '</div>' +
            '</div>' +
            '<div style="padding:7px 8px; display:flex; flex-direction:column; gap:2px; box-sizing:border-box;">' +
              '<span style="font-size:0.75rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(sName) + '</span>' +
              '<span style="font-size:0.58rem; color:#94a3b8; font-family:var(--font-en);">' + escapeHtml(dateText) + '</span>' +
            '</div>' +
          '</div>';
        }).join('');
      }

      var profileNickSafe = escapeHtml(targetNick);
      var userFeedsCount = userFeeds.length;
      var canTripNote = targetUid && !(typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(targetUid)) && !(typeof window.isUserBlocked === 'function' && window.isUserBlocked(targetUid));
      var profileNoteBtn = canTripNote
        ? '<button type="button" data-user-id="' + escapeHtml(targetUid) + '" data-author="' + profileNickSafe + '" onclick="window.openDirectMessageThread(this.dataset.userId, this.dataset.author);" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#7dd3fc; padding:4px 10px; border-radius:14px; font-size:0.68rem; font-weight:800; cursor:pointer; margin-right:6px;">쪽지</button>'
        : '';
      var profileBlockBtn = (targetUid && !(typeof window.isCurrentUserId === 'function' && window.isCurrentUserId(targetUid)))
        ? '<button type="button" data-user-id="' + escapeHtml(targetUid) + '" data-author="' + profileNickSafe + '" onclick="window.blockCommunityUser(this.dataset.userId, this.dataset.author);" style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); color:#fda4af; padding:4px 10px; border-radius:14px; font-size:0.68rem; font-weight:800; cursor:pointer; margin-right:6px;">차단</button>'
        : '';

      modal.innerHTML = '<div class="modal-app-header" style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); height:48px; padding:0 14px; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box;">' +
        '<div style="display:flex; align-items:center; gap:8px;">' +
          '<button type="button" class="circle-icon-btn" onclick="window.closeTripAuthorProfile();">◀</button>' +
          '<span style="font-size:0.95rem; font-weight:900; color:#ffffff; letter-spacing:-0.02em;">원정대장 프로필</span>' +
        '</div>' +
        '<div style="display:flex; align-items:center;">' +
          profileNoteBtn +
          profileBlockBtn +
          '<button type="button" class="circle-icon-btn" onclick="window.closeTripAuthorProfile();">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="modal-scroll-body" style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px 14px calc(76px + env(safe-area-inset-bottom, 8px)) 14px; box-sizing:border-box; display:flex; flex-direction:column; gap:14px;">' +
        '<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:16px; display:flex; align-items:center; gap:14px; box-sizing:border-box;">' +
          '<div style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(255,255,255,0.05) 100%); border:1.5px solid rgba(56,189,248,0.5); display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:#ffffff; flex-shrink:0;">' +
            '<svg viewBox="0 0 24 24" style="width:26px; height:26px; fill:none; stroke:#38bdf8; stroke-width:2.2;"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>' +
          '</div>' +
          '<div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:3px;">' +
            '<div style="display:flex; align-items:center; gap:6px;">' +
              '<span style="font-size:1.15rem; font-weight:900; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + profileNickSafe + '</span>' +
            '</div>' +
            '<div style="display:flex; gap:10px; font-size:0.72rem; color:#94a3b8; font-family:var(--font-en); margin-top:2px;">' +
              '<span>활동 기록 <strong style="color:#ffffff;">' + userFeedsCount + '</strong></span>' +
              '<span>평균 무게 <strong style="color:#34d399;">' + avgKgText + '</strong></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; width:100%; box-sizing:border-box;">' +
          feedsGridHtml +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);

      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('tripUserProfileModal', window.closeTripAuthorProfile);
      }
    };

    window.lockHomeScrollForTripModal = function() {
      if (!window.__homeScrollLockedForTripModal) {
        window.__homeScrollYBeforeTripModal = window.pageYOffset || document.documentElement.scrollTop || 0;
        document.body.style.top = (-window.__homeScrollYBeforeTripModal) + 'px';
        window.__homeScrollLockedForTripModal = true;
      }
      document.body.classList.add('trip-modal-open');
    };

    window.unlockHomeScrollForTripModal = function() {
      var stillOpen = document.getElementById('tripDetailSheetModal')
        || document.getElementById('tripCreateModal')
        || document.getElementById('tripJoinListModal')
        || document.getElementById('tripUserProfileModal')
        || document.getElementById('secretSpotHeroModal')
        || document.getElementById('themeSpotAllModal')
        || document.getElementById('loungeWindow')
        || document.getElementById('loungeSheet');
      if (stillOpen) {
        document.body.classList.add('trip-modal-open');
        return;
      }
      document.body.classList.remove('trip-modal-open');
      if (!window.__homeScrollLockedForTripModal) {
        document.body.style.top = '';
        return;
      }
      var y = window.__homeScrollYBeforeTripModal || 0;
      window.__homeScrollLockedForTripModal = false;
      document.body.style.top = '';
      window.__homeScrollYBeforeTripModal = 0;
      var restore = function() {
        window.scrollTo(0, y);
        if (document.documentElement) document.documentElement.scrollTop = y;
        document.body.scrollTop = y;
      };
      restore();
      window.requestAnimationFrame(function() {
        restore();
        window.requestAnimationFrame(restore);
      });
    };

    window.closeAllTripModals = function() {
      var ids = [
        'tripUserProfileModal',
        'tripDetailSheetModal',
        'tripCreateModal',
        'tripJoinListModal',
        'secretSpotHeroModal',
        'themeSpotAllModal'
      ];
      ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
        if (typeof window.unregisterModalClose === 'function') {
          window.unregisterModalClose(id);
        }
      });
      // 라운지 창·시트는 lounge.js가 정리한다(아직 안 받았으면 열린 것도 없음)
      if (typeof window.closeLoungeWindow === 'function') window.closeLoungeWindow(true);
      if (typeof window.closeLoungeSheet === 'function' && document.getElementById('loungeSheet')) window.closeLoungeSheet();
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      } else {
        document.body.classList.remove('trip-modal-open');
        document.body.style.top = '';
      }
    };

    window.closeTripAuthorProfile = function() {
      var modal = document.getElementById('tripUserProfileModal');
      if (!modal) return;
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('tripUserProfileModal');
      }
      modal.remove();
      var hasOtherTripModal = document.getElementById('tripDetailSheetModal') || document.getElementById('tripCreateModal') || document.getElementById('tripJoinListModal');
      if (!hasOtherTripModal) {
        if (typeof window.unlockHomeScrollForTripModal === 'function') {
          window.unlockHomeScrollForTripModal();
        } else {
          document.body.classList.remove('trip-modal-open');
          document.body.style.top = '';
        }
      }
    };

    function getRecordPhotoMemos(rec) {
      if (!rec) return [];
      var raw = rec.photoMemos || rec.photo_memos || rec.photo_memos_json || rec.memos;
      if (Array.isArray(raw)) return raw.map(function(m) { return m != null ? String(m).trim() : ''; });
      if (typeof raw === 'string' && raw.trim().startsWith('[')) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map(function(m) { return m != null ? String(m).trim() : ''; });
        } catch (e) {}
      }
      return [];
    }

    var _heroCarouselTicking = false;
    window.updateHeroCarouselState = function(trackEl) {
      if (!trackEl) return;
      var executeUpdate = function() {
        var scrollLeft = trackEl.scrollLeft;
        var width = trackEl.offsetWidth;
        if (!width) return;
        var curIdx = Math.round(scrollLeft / width);

        if (trackEl._lastHeroIdx === curIdx) return;
        trackEl._lastHeroIdx = curIdx;

        var dotsWrap = document.getElementById('heroDotsWrapper');
        if (dotsWrap && dotsWrap.children.length > 0) {
          var dots = dotsWrap.children;
          for (var i = 0; i < dots.length; i++) {
            if (i === curIdx) {
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

        var cardRoot = document.getElementById('instaMainCard');
        var quoteEl = document.getElementById('heroQuoteText');
        if (cardRoot && quoteEl) {
          var defaultMemo = cardRoot.dataset.defaultMemo || '자연 속에서 비화식으로 즐기는 조용한 하룻밤.';
          try {
            var memos = JSON.parse(cardRoot.dataset.photoMemos || '[]');
            if (!Array.isArray(memos)) memos = [];
            var filledCount = memos.filter(function(m) { return String(m || '').trim(); }).length;
            var curText = (memos[curIdx] !== undefined) ? String(memos[curIdx] || '').trim() : '';
            if (filledCount <= 1 && !curText) curText = String(defaultMemo || '').trim();
            if (curText) {
              quoteEl.innerText = '“' + curText + '”';
            } else {
              quoteEl.innerText = '“자연 속에서 비화식으로 즐기는 조용한 하룻밤.”';
            }
          } catch (err) {
            quoteEl.innerText = '“' + defaultMemo + '”';
          }
        }
      };

      if (!_heroCarouselTicking) {
        _heroCarouselTicking = true;
        window.requestAnimationFrame(function() {
          _heroCarouselTicking = false;
          executeUpdate();
        });
      }
    };

    // 차단한 사용자·신고한 피드는 히어로에도 보이지 않게 한다(다른 홈 레일과 같은 기준).
    // romantic-sync.js가 아직 없으면 판정할 수 없어 통과시키지만, 히어로는 sync 로드 뒤(DOMContentLoaded)에만 그린다.
    function okbmHeroUgcVisible(f) {
      return !(typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc(f));
    }

    function renderCurrentHeroCard() {
      var records = (window.heroTopRecords || []).filter(function(f) {
        return feedHasGalleryPhotos(f) && window.okbmIsHomePublicFeed(f) && okbmHeroUgcVisible(f);
      });
      if (records.length !== (window.heroTopRecords || []).length) {
        window.heroTopRecords = records;
      }
      if (records.length === 0) {
        // 차단·신고로 모두 빠졌으면 이미 그려 둔 카드도 지운다(기본 문구로 되돌림)
        var emptyTrack = document.getElementById('heroPhotoSwipeTrack');
        if (emptyTrack && emptyTrack.children.length > 0) {
          emptyTrack.innerHTML = '';
          emptyTrack.__okbmHeroTrackHtml = '';
          var emptyDots = document.getElementById('heroDotsWrapper');
          if (emptyDots) emptyDots.innerHTML = '';
          var emptyTitle = document.getElementById('heroMainTitle');
          var emptyAuthor = document.getElementById('heroAuthorText');
          var emptyQuote = document.getElementById('heroQuoteText');
          var emptyIndicator = document.getElementById('heroCardIndexIndicator');
          if (emptyTitle) emptyTitle.innerText = '장소 로딩 중...';
          if (emptyAuthor) emptyAuthor.innerText = '낭만백패커';
          if (emptyQuote) emptyQuote.innerText = '“자연 속에서 비화식으로 즐기는 조용한 하룻밤”';
          if (emptyIndicator) emptyIndicator.innerText = '(0/0)';
          var emptyStage = document.querySelector('.insta-stage-wrap');
          if (emptyStage) emptyStage.classList.add('okbm-hero-loading');
          window.currentHeroRecord = null;
          window.currentHeroPhotosList = [];
        }
        return;
      }
      if (window.currentHeroCardIndex >= records.length) {
        window.currentHeroCardIndex = 0;
      }

      var record = records[window.currentHeroCardIndex];
      window.currentHeroRecord = record;
      window.currentHeroPhotosList = getArchivePhotosList(record);
      var heroStage = document.querySelector('.insta-stage-wrap');
      if (heroStage) heroStage.classList.remove('okbm-hero-loading');

      var cardRoot = document.getElementById('instaMainCard');
      var titleEl = document.getElementById('heroMainTitle');
      var authorEl = document.getElementById('heroAuthorText');
      var quoteEl = document.getElementById('heroQuoteText');
      var indicatorEl = document.getElementById('heroCardIndexIndicator');
      var trackEl = document.getElementById('heroPhotoSwipeTrack');

      var photos = (window.currentHeroPhotosList || []).filter(function(u) { return u && typeof u === 'string' && u.startsWith('https://'); });
      var heroTrackHtml = photos.map(function(pUrl, pIdx) {
        var isFirst = (pIdx === 0);
        var loadingAttr = isFirst ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
        return '<div class="hero-slide-item" style="flex:0 0 100%; width:100%; height:100%; min-width:100%; position:relative; overflow:hidden; background:#000000;">' +
          '<img src="' + escapeHtml(okbmSafeImageUrl(pUrl)) + '" referrerpolicy="no-referrer" ' + loadingAttr + ' decoding="async" onerror="window.handleHeroSlideImgError(this);" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(0.95) contrast(1.04); display:block;" />' +
          '<div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 28%, transparent 80%, rgba(0,0,0,0.35) 100%); pointer-events:none; z-index:2;"></div>' +
        '</div>';
      }).join('');
      // 같은 카드·같은 사진으로 다시 그릴 때(캐시 → 네트워크 재적용, 별점 반영 등)는 슬라이드를 새로 만들지 않는다.
      // 이미지를 다시 디코딩하며 깜빡이거나, 보던 사진과 메모가 첫 장으로 돌아가는 것을 막는다.
      var heroTrackUnchanged = !!(trackEl && trackEl.__okbmHeroTrackHtml === heroTrackHtml && trackEl.children.length > 0);
      if (!heroTrackUnchanged) window.currentHeroPhotoIndex = 0;

      var spotTitle = record.spot || record.spotName || '낭만 필드 장소';
      var authorName = record.author || '낭만백패커';

      var photoMemosArr = getRecordPhotoMemos(record);
      var defaultMemoText = (record.memo || record.oneLineMemo || '').trim();

      if (cardRoot) {
        cardRoot.dataset.photoMemos = JSON.stringify(photoMemosArr);
        cardRoot.dataset.defaultMemo = defaultMemoText || '자연 속에서 비화식으로 즐기는 조용한 하룻밤.';
      }

      var firstMemoText = '';
      if (Array.isArray(photoMemosArr) && photoMemosArr.length > 0 && photoMemosArr[0] && photoMemosArr[0].trim().length > 0) {
        firstMemoText = photoMemosArr[0].trim();
      } else if (defaultMemoText && defaultMemoText.length > 0) {
        firstMemoText = defaultMemoText;
      } else {
        firstMemoText = '자연 속에서 비화식으로 즐기는 조용한 하룻밤.';
      }

      if (titleEl) titleEl.innerText = spotTitle;
      if (authorEl) authorEl.innerText = authorName;
      if (quoteEl && !heroTrackUnchanged) quoteEl.innerText = '“' + firstMemoText + '”';
      if (indicatorEl) indicatorEl.innerText = '(' + (window.currentHeroCardIndex + 1) + '/' + records.length + ')';

      window.refreshHeroDotsCount = function() {
        var track = document.getElementById('heroPhotoSwipeTrack');
        var dots = document.getElementById('heroDotsWrapper');
        if (!track || !dots) return;
        var validSlides = track.querySelectorAll('.hero-slide-item');
        if (validSlides.length <= 1) {
          dots.innerHTML = '';
          return;
        }
        var dotsHtml = '';
        for (var d = 0; d < validSlides.length; d++) {
          var dotW = (d === 0) ? '14px' : '5px';
          var dotBg = (d === 0) ? '#ffffff' : 'rgba(255,255,255,0.35)';
          var dotShadow = (d === 0) ? 'box-shadow:0 0 8px rgba(255,255,255,0.9);' : '';
          dotsHtml += '<div style="width:' + dotW + '; height:4px; border-radius:2px; background:' + dotBg + '; ' + dotShadow + ' transition:all 0.2s ease;"></div>';
        }
        dots.innerHTML = dotsHtml;
      };

      window.handleHeroSlideImgError = function(imgEl) {
        if (!imgEl) return;
        var slideBox = imgEl.closest('.hero-slide-item');
        var track = document.getElementById('heroPhotoSwipeTrack');
        if (slideBox) slideBox.remove();
        if (track) {
          var remaining = track.querySelectorAll('.hero-slide-item');
          if (remaining.length === 0) {
            if (typeof window.navigateHeroFeed === 'function') window.navigateHeroFeed(1);
          } else {
            track.scrollLeft = 0;
            track._lastHeroIdx = -1;
            window.refreshHeroDotsCount();
            window.updateHeroCarouselState(track);
          }
        }
      };

      if (heroTrackUnchanged) {
        // 메모만 바뀌었을 수 있으니 지금 보고 있는 사진 기준으로 문구와 점 표시를 다시 맞춘다.
        trackEl._lastHeroIdx = -1;
        if (typeof window.updateHeroCarouselState === 'function') window.updateHeroCarouselState(trackEl);
        return;
      }

      if (trackEl) {
        trackEl._lastHeroIdx = -1;
        trackEl.innerHTML = heroTrackHtml;
        trackEl.__okbmHeroTrackHtml = heroTrackHtml;
        trackEl.scrollLeft = 0;
        if (typeof trackEl.scrollTo === 'function') trackEl.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      }

      window.refreshHeroDotsCount();
    }

    // 🧭 [피드 전환 엔진]
    window.navigateHeroFeed = function(delta, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var records = window.heroTopRecords || [];
      if (records.length <= 1) return;

      window.currentHeroCardIndex = (window.currentHeroCardIndex + delta + records.length) % records.length;

      var card = document.getElementById('instaMainCard');
      if (card) {
        card.style.opacity = '0.55';
        card.style.transform = 'scale(0.985)';
        setTimeout(function() {
          renderCurrentHeroCard();
          card.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
        }, 50);
      } else {
        renderCurrentHeroCard();
      }
    };

   // 🚀 [스마트 하이브리드 제스처 엔진]: 스와이프 드래그는 부드럽게 통과, 제자리 탭만 피드 전환
    var heroTouchStartX = 0;
    var heroTouchStartY = 0;
    var heroTouchStartTime = 0;

    window.handleHeroTouchStart = function(e) {
      if (!e.touches || e.touches.length !== 1) return;
      heroTouchStartX = e.touches[0].clientX;
      heroTouchStartY = e.touches[0].clientY;
      heroTouchStartTime = Date.now();
    };

   window.handleHeroTouchEnd = function(e) {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      var diffX = Math.abs(e.changedTouches[0].clientX - heroTouchStartX);
      var diffY = Math.abs(e.changedTouches[0].clientY - heroTouchStartY);
      var elapsed = Date.now() - heroTouchStartTime;

      // 👆 손가락 이동이 12px 미만이고 350ms 이내 터치일 때만 순수 '탭(Tap)'으로 판정
      if (diffX < 12 && diffY < 12 && elapsed < 350) {
        var card = document.getElementById('instaMainCard');
        if (!card) return;
        var rect = card.getBoundingClientRect();
        var tapX = e.changedTouches[0].clientX - rect.left;
        var width = rect.width;

        if (tapX < width * 0.38) {
          window.navigateHeroFeed(-1);
        } else if (tapX > width * 0.62) {
          window.navigateHeroFeed(1);
        }
      } else {
        // 🚀 스와이프 후 스냅이 정지했을 때 메모 강제 동기화
        var track = document.getElementById('heroPhotoSwipeTrack');
        if (track) {
          setTimeout(function() {
            window.updateHeroCarouselState(track);
          }, 120);
        }
      }
    };

    function initHeroGestureEngine() {}

    function initSmartHeaderScrollEngine() {
      var header = document.querySelector('.netflix-integrated-header');
      if (!header || header._scrollEngineBound) return;
      header._scrollEngineBound = true;

      var lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
      var ticking = false;

      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

            if (currentScrollY <= 15) {
              header.classList.remove('header-hidden');
            } else if (currentScrollY > lastScrollY && currentScrollY > 70) {
              header.classList.add('header-hidden');
            } else if (currentScrollY < lastScrollY) {
              header.classList.remove('header-hidden');
            }

            lastScrollY = currentScrollY;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    var FALLBACK_HERO_PRESET = {
      id: "hero_preset_master",
      spot: "강원 대관령 선자령",
      author: "낭만백패커",
      date: "2026.09.04",
      elevation: "832m",
      weightKg: "5.52",
      memo: "백두대간 능선을 따라 펼쳐지는 풍차와 억새, 은하수가 쏟아지는 밤",
      oneLineMemo: "백두대간 능선을 따라 펼쳐지는 풍차와 억새, 은하수가 쏟아지는 밤",
      photos: [],
      items: [
        { name: "지팩스 듀플렉스 2P 텐트", weight: 550 },
        { name: "써머레스트 엑스라이트 NXT", weight: 354 },
        { name: "큐물러스 파이라 850 구스침낭", weight: 1200 },
        { name: "HMG 윈드라이더 3400 (55L)", weight: 910 },
        { name: "소토 윈드마스터 버너", weight: 67 }
      ]
    };

   async function initDynamicHeroAndFeeds() {
      initHeroGestureEngine();

      var r2Domain = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev';
      window.R2_PUBLIC_DOMAIN = r2Domain;
      initSmartHeaderScrollEngine();

      var profile = safeGetJSON('user_profile', null);

      var getFeedTimeValue = function(f) {
        if (!f) return 0;
        if (f.timestamp && !isNaN(f.timestamp)) return Number(f.timestamp);
        if (f.createdAt) {
          var t = new Date(String(f.createdAt).replace(/\./g, '/')).getTime();
          if (!isNaN(t)) return t;
        }
        if (f.date) {
          var p = String(f.date).match(/\d+/g);
          if (p && p.length >= 3) {
            return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getTime();
          }
        }
        if (f.id && String(f.id).includes('_')) {
          var sub = String(f.id).split('_')[1];
          if (sub && !isNaN(sub) && sub.length >= 10) return Number(sub);
        }
        return 0;
      };

      var sortFeedsByStarsAndDate = function(feedList) {
        return feedList.filter(function(f) {
          try {
            return window.okbmIsPublicFeedItem ? window.okbmIsPublicFeedItem(f) : (f && f.isPublished !== false);
          } catch (e) {
            return f && f.isPublished !== false;
          }
        }).sort(function(a, b) {
          var sA = Number((a.likes != null) ? a.likes : (a.likes_count || 0));
          var sB = Number((b.likes != null) ? b.likes : (b.likes_count || 0));
          if (sB !== sA) return sB - sA;
          return getFeedTimeValue(b) - getFeedTimeValue(a);
        });
      };

      var applyFeedData = function(feedList) {
        try {
        var uniqueFeedMap = new Map();
        (Array.isArray(feedList) ? feedList : []).filter(Boolean).forEach(function(f) {
          var uKey = String(f.id || '').trim();
          if (!uKey || uKey.startsWith('feed_') || uKey.startsWith('pack_')) {
            uKey = String(f.userId || f.user_id || '') + '_' + String(f.date || '').replace(/\D/g, '') + '_' + String(f.spot || '').trim();
          }
          if (!uniqueFeedMap.has(uKey)) {
            uniqueFeedMap.set(uKey, f);
          }
        });

        var allCleanFeeds = sortFeedsByStarsAndDate(Array.from(uniqueFeedMap.values()));

        var photoFeedsOnly = allCleanFeeds.filter(function(f) {
          try {
            return feedHasGalleryPhotos(f) && window.okbmIsHomePublicFeed(f) && okbmHeroUgcVisible(f);
          } catch (e2) {
            return false;
          }
        });

        var nextHeroRecords = photoFeedsOnly.slice(0, 10);
        var heroKeyOf = function(f) { return f ? String(f.id || ((f.spot || '') + '_' + (f.date || ''))) : ''; };
        var prevHeroKeys = (window.heroTopRecords || []).map(heroKeyOf).join('|');
        var nextHeroKeys = nextHeroRecords.map(heroKeyOf).join('|');
        window.__allLoadedFeeds = allCleanFeeds;
        window.__okbmHomeFeedPool = allCleanFeeds;
        window.heroTopRecords = nextHeroRecords;
        // 캐시로 먼저 그린 뒤 네트워크 결과가 와도 카드 목록이 같으면, 사용자가 넘겨 둔 카드 위치를 유지한다.
        // (예전에는 응답이 올 때마다 1번 카드로 돌아갔다)
        if (prevHeroKeys !== nextHeroKeys || typeof window.currentHeroCardIndex !== 'number') {
          window.currentHeroCardIndex = 0;
        }
        renderCurrentHeroCard();
        if (typeof renderSecretSpotTrailerRail === 'function') renderSecretSpotTrailerRail();
        if (typeof window.__okbmNotifyHeroReady === 'function') window.__okbmNotifyHeroReady();
        } catch (e) {
          console.warn('[index.html:applyFeedData]', e);
        }
      };

      try {
      var cachedFeeds = safeGetJSON('okbm_cached_community_feeds', []);
      if (Array.isArray(cachedFeeds) && cachedFeeds.length > 0) {
        applyFeedData(cachedFeeds);
      } else {
        var presetCopy = Object.assign({}, FALLBACK_HERO_PRESET);
        var persistentNick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '');
        if (typeof isUserLoggedIn === 'function' && isUserLoggedIn() && persistentNick) {
          presetCopy.author = persistentNick;
        }
        applyFeedData([presetCopy]);
      }
      } catch (bootErr) {
        console.warn('[index.html:initDynamicHeroAndFeeds cache]', bootErr);
      }

      setTimeout(async function() {
        try {
          var rawRows = null;
          var homeSelect = window.FEEDS_HOME_SELECT || 'id,user_id,spot,spot_id,elevation,weight_kg,date,memo,photos,photo_memos_json,author,likes_count,is_published,feed_type,created_at,items,template_id';
          var guestMode = !(typeof isUserLoggedIn === 'function' && isUserLoggedIn());

          if (!guestMode && window.supabaseClient) {
            var sbRes = await window.supabaseClient
              .from('feeds')
              .select(homeSelect)
              .eq('is_published', true)
              .order('likes_count', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(30);
            if (sbRes.data && Array.isArray(sbRes.data) && sbRes.data.length > 0) {
              rawRows = sbRes.data;
            }
          }

          if (!rawRows && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            var homeUrl = window.SUPABASE_URL + '/rest/v1/feeds?select=' + encodeURIComponent(homeSelect) + '&is_published=eq.true&order=likes_count.desc,created_at.desc&limit=30';
            var res = await (typeof window.okbmPublicFetch === 'function'
              ? window.okbmPublicFetch(homeUrl)
              : fetch(homeUrl, {
                headers: {
                  'apikey': window.SUPABASE_ANON_KEY,
                  'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
                  'Content-Type': 'application/json'
                }
              }));
            if (res.ok) {
              var data = await res.json();
              if (Array.isArray(data)) rawRows = data;
            }
          }

          if (Array.isArray(rawRows) && rawRows.length > 0) {
            var normalizedFeeds = rawRows.map(function(r) {
              var pArr = [];
              if (r.photos) {
                if (Array.isArray(r.photos)) pArr = r.photos;
                else if (typeof r.photos === 'string' && r.photos.trim().startsWith('[')) {
                  try { pArr = JSON.parse(r.photos); } catch(e) {}
                } else if (typeof r.photos === 'string' && r.photos.trim().startsWith('https://')) {
                  pArr = [r.photos.trim()];
                }
              }

              var itemsArr = [];
              if (r.items) {
                if (Array.isArray(r.items)) itemsArr = r.items;
                else if (typeof r.items === 'string' && r.items.trim().startsWith('[')) {
                  try { itemsArr = JSON.parse(r.items); } catch(e) {}
                }
              }

              var parsedMemos = [];
              var rawMemoData = r.photo_memos_json || r.photo_memos;
              if (Array.isArray(rawMemoData)) {
                parsedMemos = rawMemoData;
              } else if (typeof rawMemoData === 'string' && rawMemoData.trim().startsWith('[')) {
                try { parsedMemos = JSON.parse(rawMemoData); } catch(e) {}
              }

              return {
                id: r.id,
                userId: r.user_id,
                spot: r.spot || r.spot_name || '백패킹 필드',
                elevation: r.elevation || '',
                weightKg: r.weight_kg != null ? String(r.weight_kg) : '',
                date: r.date || '',
                memo: r.memo || '',
                oneLineMemo: r.memo || '',
                templateId: r.template_id || 1,
                likes: r.likes_count != null ? Number(r.likes_count) : 0,
                createdAt: r.created_at || '',
                isPublished: r.is_published !== false,
                // RLS와 동일 기준(null = 비공개). 홈 공개 노출 판정에 사용.
                is_published: r.is_published === true,
                photos: pArr,
                items: itemsArr,
                author: r.author || '낭만백패커',
                nick: r.author || '낭만백패커',
                photoMemos: parsedMemos
              };
            });

            try {
              localStorage.setItem('okbm_cached_community_feeds', JSON.stringify(normalizedFeeds.slice(0, 15)));
            } catch (cacheErr) {}
            applyFeedData(normalizedFeeds);
          }
        } catch (sbErr) {
          console.warn('[fetchCommunityFeeds]', sbErr);
        }
      }, 30);
    }

    window.extractYouTubeVideoId = function(url) {
      if (!url || typeof url !== 'string') return '';
      var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/);
      return (match && match[1]) ? match[1] : '';
    };

    window.VIDEO_DATABASE = window.VIDEO_DATABASE || [];

    function renderVideoCurationSlider() {
      var slider = document.getElementById('homeVideoRailSlider');
      if (!slider) return;
      var db = window.VIDEO_DATABASE || [];
      var railSection = slider.closest('.n-rail-section');

      if (!db || db.length === 0) {
        slider.innerHTML = '';
        if (railSection) railSection.style.display = 'none';
        return;
      }
      if (railSection) railSection.style.display = '';

      slider.innerHTML = db.map(function(item, idx) {
        var spotTitle = item.spot || item.title || '백패킹 필드';
        var thumb = item.thumbUrl || (item.videoId ? ('https://img.youtube.com/vi/' + item.videoId + '/hqdefault.jpg') : '');

        return `
          <div class="n-video-single-card" data-okbm-idx="${Number(idx)}" onclick="openVideoDetailModal(Number(this.dataset.okbmIdx))">
            <div class="n-video-thumb-box">
              <img src="${escapeHtml(okbmSafeImageUrl(thumb))}" alt="${escapeHtml(spotTitle)}" loading="lazy" />
              <div class="n-video-play-icon">
                <div class="n-video-play-btn-circle">▶</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    async function openVideoDetailModal(idxOrUrl) {
      var db = window.VIDEO_DATABASE || [];
      var item = (typeof idxOrUrl === 'number') ? (db[idxOrUrl] || db[0]) : (db.find(function(v) { return v.videoUrl === idxOrUrl || v.videoId === idxOrUrl; }) || db[0]);

      var modal = document.getElementById('videoDetailModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'custom-modal-overlay';
        modal.id = 'videoDetailModal';
        modal.onclick = function(e) { if (e.target === modal) closeVideoDetailModal(); };
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(var(--vh, 1vh) * 100 - 56px - env(safe-area-inset-bottom, 8px)); background:#000000; z-index:1000050 !important; justify-content:center; align-items:stretch; padding:0 !important; margin:0 !important; box-sizing:border-box;';
        modal.innerHTML = `
          <div id="videoDetailSheet" style="width:100% !important; max-width:480px !important; height:100% !important; max-height:100% !important; background:#0a0e17; border-radius:0 !important; border:none !important; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; margin:0 auto; box-sizing:border-box; transform:translateZ(0);">
            <div style="width:100%; padding:10px 14px 8px 14px; padding-top:calc(10px + env(safe-area-inset-top, 0px)); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; background:#07090e; border-bottom:1px solid rgba(255,255,255,0.08); box-sizing:border-box; z-index:60;" onclick="event.stopPropagation();">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:1.0rem;"><svg viewBox="0 0 24 24" style="width:18px; height:18px;" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></span>
                <span style="font-size:0.92rem; font-weight:900; color:#ffffff;">영상 속 그 장소</span>
              </div>
              <button type="button" onclick="closeVideoDetailModal()" style="background:rgba(255, 255, 255, 0.08); border:1px solid rgba(255, 255, 255, 0.15); color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.95rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; flex-shrink:0;">✕</button>
            </div>
            <div id="videoModalScrollBody" style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:contain; contain:content; display:flex; flex-direction:column; box-sizing:border-box;" onclick="event.stopPropagation();">
              <div id="videoModalPlayerBox" style="width:100% !important; aspect-ratio:16/9; background:#000000; overflow:hidden; flex-shrink:0; position:relative; margin:0; padding:0; border-bottom:1px solid rgba(255, 255, 255, 0.1); z-index:50;">
                <iframe id="videoModalIframe" src="" style="width:100%; height:100%; border:none; display:block;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="eager"></iframe>
              </div>
              <div id="videoModalBodyContentSlot" style="padding:14px 14px calc(76px + env(safe-area-inset-bottom, 8px)) 14px; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;"></div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      var iframe = document.getElementById('videoModalIframe');
      var bodySlot = document.getElementById('videoModalBodyContentSlot');

      var spotPool = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots 
        : (safeGetJSON('okbm_spots_cache', []) || []);

      if (spotPool.length === 0 && typeof loadPortalSpotData === 'function') {
        await loadPortalSpotData();
        spotPool = registeredSpots || safeGetJSON('okbm_spots_cache', []) || [];
      }

      var rawSpotName = (item.spot || item.navSpot || '').trim();
      var isGear = !rawSpotName || rawSpotName === '장비' || rawSpotName === '기어' || rawSpotName.toUpperCase() === 'NONE';

      var matched = null;
      if (!isGear) {
        var searchKey = rawSpotName.replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
        matched = spotPool.find(function(s) { 
          var n = String(s.name || s.spot_main || s.fullName || '').replace(/[\s\(\[\]\)]/g, '').toLowerCase(); 
          var k = searchKey.replace(/[\s\(\[\]\)]/g, ''); 
          return k && (n.includes(k) || k.includes(n)); 
        });
      }

      var mainName = matched ? (matched.spot_main || matched.name || matched.fullName) : rawSpotName;
      var cityName = matched ? (matched.cityName || matched.region || '전국') : (item.city || '전국');
      var elevStr = matched && matched.elevation ? (String(matched.elevation).includes('m') ? matched.elevation : matched.elevation + 'm') : '';
      var subPoint = matched ? (matched.spot_sub || '') : '';
      var navTargetSpot = String(mainName).replace(/\s*\(.*?\)/g, '');

      var rawSummary = (matched && (matched.desc_summary || matched.desc)) ? (matched.desc_summary || matched.desc) : (item.viewDesc || item.title || "");
      var cleanSummary = String(rawSummary).replace(/\\n/g, '\n');
      var viewMatch = cleanSummary.match(/\[(?:뷰\/특징|뷰|특징)\]\s*([\s\S]*?)(?=\[(?:접근\/코스|접근|코스|박지\/피칭|박지|장소\/피칭|장소|피칭|주의\/팁|주의|팁)\]|$)/i);
      var onlyViewText = viewMatch ? viewMatch[1].trim() : cleanSummary.split(/\n\s*\n|\n(?=\[)/)[0].replace(/^\[.*?\]\s*/, '').trim();

     if (bodySlot) {
      
var adBannersHtml = `
<div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
<a href="https://instagram.com/oklionnature" target="_blank" rel="noopener noreferrer" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; text-decoration:none;">
<div style="display:flex; align-items:center; gap:8px;">
<span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v6H6zM4 8h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"/></svg></span>
<div>
<div style="font-size:0.77rem; font-weight:800; color:#f8fafc;">영상 속 백패킹 장비 확인하기</div>
<div style="font-size:0.58rem; color:#94a3b8;">텐트 · 침낭 · 에어매트 · 경량 기어 스펙</div>
</div>
</div>
<span style="font-size:0.65rem; font-weight:800; color:#ffffff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); padding:3.5px 8px; border-radius:6px; flex-shrink:0;"> 장비보기</span>
</a>
<a href="https://instagram.com/oklionnature" target="_blank" rel="noopener noreferrer" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; text-decoration:none;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg></span>
            <div>
              <div style="font-size:0.77rem; font-weight:800; color:#f8fafc;">영상 속 비화식 음식 확인하기</div>
              <div style="font-size:0.58rem; color:#94a3b8;">핫앤쿡 발열도시락 · 보온식단 · 전투식량 모음</div>
            </div>
          </div>
          <span style="font-size:0.65rem; font-weight:800; color:#ffffff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); padding:3.5px 8px; border-radius:6px; flex-shrink:0;">음식보기</span>
        </a>

        <a href="https://instagram.com/oklionnature" target="_blank" rel="noopener noreferrer" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 12px; text-decoration:none;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center; flex-shrink:0;"><svg viewBox="0 0 24 24" style="width:20px; height:20px;" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg></span>
            <div>
              <div style="font-size:0.77rem; font-weight:800; color:#f8fafc;">영상 속 아웃도어 의류 확인하기</div>
              <div style="font-size:0.58rem; color:#94a3b8;">우모복 · 방풍자켓 · 등산화 특가전</div>
            </div>
          </div>
          <span style="font-size:0.65rem; font-weight:800; color:#ffffff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); padding:3.5px 8px; border-radius:6px; flex-shrink:0;">특가보기 </span>
        </a>
      </div>
    `;

        bodySlot.innerHTML = isGear ? `
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:12px 14px; display:flex; flex-direction:column; gap:4px;">
            <span style="font-size:0.65rem; color:#cbd5e1; font-weight:800; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); padding:1.5px 6px; border-radius:4px; width:fit-content;">🎒 기어 랩 가이드</span>
            <div style="font-size:1.05rem; font-weight:900; color:#fff;">${escapeHtml(item.title || '추천 기어 세팅')}</div>
            <div style="font-size:0.75rem; color:#94a3b8; line-height:1.45; margin-top:2px;">${escapeHtml(item.viewDesc || '영상 속 추천 장비 조합과 실전 패킹 팁을 확인하세요.')}</div>
          </div>
          ${adBannersHtml}
        ` : `
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                <span style="font-size:0.70rem; font-weight:800; color:#cbd5e1; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); padding:1px 5px; border-radius:4px;">${escapeHtml(cityName)}</span>
                <span style="font-size:1.05rem; font-weight:900; color:#ffffff;">${escapeHtml(mainName)}</span>
                ${elevStr ? `<span style="font-size:0.78rem; color:#94a3b8; font-weight:800;">(${escapeHtml(elevStr)})</span>` : ''}
              </div>
              ${subPoint ? `<div style="font-size:0.68rem; color:#cbd5e1; font-weight:700; margin-top:2px;">  <svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:#38bdf8; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; vertical-align:-1.5px; margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(subPoint)}</div>` : ''}
            </div>
            <button type="button" class="js-open-map-spot" data-close-modal="video" data-spot="${escapeHtml(navTargetSpot)}" style="background:#ffffff; color:#000000; border:none; border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:900; cursor:pointer; flex-shrink:0; display:flex; align-items:center; gap:4px;">
              <span>장소확인</span>
            </button>
          </div>

          ${onlyViewText ? `
            <div style="background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.08); border-left:3px solid rgba(255,255,255,0.6); border-radius:8px; padding:10px 12px; font-size:0.78rem; line-height:1.55; color:#cbd5e1; margin-top:6px;">
              <div style="font-weight:900; font-size:0.73rem; color:#ffffff; margin-bottom:3px; display:flex; align-items:center; gap:5px;">
                <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#34d399; stroke-width:2.2; flex-shrink:0;"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                <span>[영상 속 스팟 뷰 & 특징]</span>
              </div>
              <div>${escapeHtml(onlyViewText)}</div>
            </div>` : ''}

          ${adBannersHtml}

          <div style="border-radius:12px; border:1px dashed rgba(255,255,255,0.1); background:rgba(255,255,255,0.015); padding:10px 12px; text-align:center; margin-top:4px; display:flex; align-items:center; justify-content:center; gap:5px;">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:#94a3b8; stroke-width:2; flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style="font-size:0.65rem; color:#94a3b8;">상세 들머리 주소(네비) 및 코스는 <strong>장소확인(전국지도)</strong>에서 확인 가능합니다.</span>
          </div>
        `;
      }

      var rawId = item.videoId || extractYouTubeVideoId(item.videoUrl);
      var embedUrl = rawId ? ('https://www.youtube-nocookie.com/embed/' + rawId + '?playsinline=1&rel=0&autoplay=0') : '';
      if (iframe) iframe.src = embedUrl;
      if (modal) modal.style.display = 'flex';
    }

    function closeVideoDetailModal() {
      var modal = document.getElementById('videoDetailModal');
      var iframe = document.getElementById('videoModalIframe');
      if (iframe) iframe.src = '';
      if (modal) modal.style.display = 'none';
    }

    async function loadFeaturedVideosFromSupabase() {
      try {
        var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
        var targetKey = window.SUPABASE_ANON_KEY || '';
        var featuredUrl = targetUrl + '/rest/v1/featured_videos?select=*&is_active=eq.true&order=id.asc';
        var res = await (typeof window.okbmPublicFetch === 'function'
          ? window.okbmPublicFetch(featuredUrl)
          : fetch(featuredUrl, {
          headers: {
            'apikey': targetKey,
            'Authorization': 'Bearer ' + targetKey,
            'Content-Type': 'application/json'
          }
        }));

        if (res.ok) {
          var rows = await res.json();
          if (Array.isArray(rows) && rows.length > 0) {
            var parsed = rows.map(function(row) {
              var vUrl = row.video_url || '';
              var yId = row.video_id || extractYouTubeVideoId(vUrl);
              return {
                title: row.title || "영상 속 그 장소",
                spot: row.spot_name || "",
                navSpot: row.spot_name || "",
                viewDesc: row.view_desc || "",
                videoUrl: vUrl,
                videoId: yId,
                thumbUrl: row.thumb_url || (yId ? ('https://img.youtube.com/vi/' + yId + '/hqdefault.jpg') : '')
              };
            });
            if (parsed.length > 0) {
              window.VIDEO_DATABASE = parsed;
              renderVideoCurationSlider();
            }
          }
        }
      } catch (e) {}
    }

    var DEFAULT_TRIP_JOINS = [];
    window.TRIP_JOINS_DATABASE = [];

    function collectHttpsPhotoUrls(rawList) {
      var list = rawList;
      if (typeof list === 'string') {
        var trimmed = list.trim();
        if (trimmed.startsWith('[')) {
          try { list = JSON.parse(trimmed); } catch (e) { list = []; }
        } else if (trimmed.startsWith('https://')) {
          list = [trimmed];
        } else {
          list = [];
        }
      }
      if (!Array.isArray(list)) list = [];
      var seen = {};
      return list.map(function(u) {
        return String(u || '').replace(/^["']|["']$/g, '').trim();
      }).filter(function(u) {
        if (!u.startsWith('https://') || seen[u]) return false;
        seen[u] = true;
        return true;
      });
    }

    function getTripPhotosList(trip) {
      if (!trip) return [];
      return collectHttpsPhotoUrls(trip.photos);
    }

    function tripSpotPool() {
      return (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots : ((typeof safeGetJSON === 'function' ? safeGetJSON('okbm_spots_cache', []) : []) || []);
    }

    function findRegisteredTripSpot(spotName) {
      var pool = tripSpotPool();
      if (typeof window.okbmFindSpotByFocusQuery === 'function') {
        var focused = window.okbmFindSpotByFocusQuery(pool, spotName);
        if (focused) return focused;
      }
      if (typeof findThemeSpotMaster === 'function') {
        var themed = findThemeSpotMaster(String(spotName || ''), pool);
        if (themed) return themed;
      }
      var searchKey = String(spotName || '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      if (!searchKey) return null;
      var k = searchKey.replace(/[\s\(\[\]\)]/g, '');
      return pool.find(function(s) {
        var n = String(s.name || s.spot_main || s.fullName || '').replace(/[\s\(\[\]\)]/g, '').toLowerCase();
        return k && n && (n.indexOf(k) !== -1 || k.indexOf(n) !== -1);
      }) || null;
    }

    function feedNameHitsSpotMain(feedSpot, spotMain) {
      var main = String(spotMain || '').replace(/\s+/g, '').toLowerCase();
      if (!main || main.length < 2) return false;
      var tokens = String(feedSpot || '').replace(/\s*\(.*?\)/g, ' ').toLowerCase().split(/[\s\[\]·,./]+/).filter(Boolean);
      for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].replace(/\s+/g, '') === main) return true;
      }
      return tokens.join('') === main;
    }

    function feedMatchesRegisteredSpot(feed, spot, pool) {
      if (!feed || !spot) return false;
      var sid = String(spot.id || spot.spot_id || '').trim();
      var fid = String(feed.spot_id || feed.spotId || '').trim();
      if (sid && fid && sid === fid) return true;
      if (typeof findThemeSpotMaster === 'function') {
        var master = findThemeSpotMaster(feed, pool || tripSpotPool());
        if (master) return sid ? String(master.id || master.spot_id || '') === sid : master === spot;
      }
      return feedNameHitsSpotMain(feed.spot || feed.spotName, spot.spot_main || spot.name);
    }

    function feedPopularity(feed) {
      if (!feed) return 0;
      var stars = 0;
      try {
        var counts = (typeof safeGetJSON === 'function') ? (safeGetJSON('okbm_feed_stars_counts', {}) || {}) : {};
        if (feed.id != null && counts[feed.id] != null) stars = Number(counts[feed.id]) || 0;
      } catch (e) {}
      var likes = Number(feed.likes_count != null ? feed.likes_count : (feed.likes || 0)) || 0;
      return Math.max(stars, likes);
    }

    function photosFromPopularSpotFeed(feeds, spot) {
      var pool = tripSpotPool();
      var ranked = (feeds || []).filter(function(f) {
        if (!f) return false;
        if (!window.okbmIsHomePublicFeed(f)) return false;
        return !spot || feedMatchesRegisteredSpot(f, spot, pool);
      }).sort(function(a, b) {
        var diff = feedPopularity(b) - feedPopularity(a);
        if (diff) return diff;
        var ta = new Date(a.created_at || a.createdAt || 0).getTime() || 0;
        var tb = new Date(b.created_at || b.createdAt || 0).getTime() || 0;
        return tb - ta;
      });
      if (!ranked.length) return [];
      var list = (window.okbmPublicPhotoUrls && window.okbmPublicPhotoUrls(ranked[0])) || getArchivePhotosList(ranked[0]) || ranked[0].photos || [];
      return collectHttpsPhotoUrls(list).slice(0, 5);
    }

    function collectSpotMediaImageUrls(spot) {
      if (!spot) return [];
      var raw = spot.mediaUrls || spot.mediaurls || '';
      var bits = [];
      if (Array.isArray(raw)) bits = raw;
      else bits = String(raw).split(/[\r\n,]+/);
      return collectHttpsPhotoUrls(bits.filter(function(u) {
        return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(String(u || '')) || String(u || '').indexOf('/storage/') !== -1;
      }));
    }

    async function fetchSpotFeedPhotos(spotName) {
      var targetUrl = window.SUPABASE_URL || '';
      var targetKey = window.SUPABASE_ANON_KEY || '';
      if (!targetUrl || !targetKey) return [];
      var matched = findRegisteredTripSpot(spotName);
      var main = String((matched && (matched.spot_main || matched.name)) || '').replace(/\s+/g, ' ').trim();
      var sid = matched ? String(matched.id || matched.spot_id || '').trim() : '';
      // or=(...) 안의 값에 , ( ) " \ * : 가 섞이면 PostgREST 필터 구문이 깨지거나 뜻이 바뀐다.
      // 예약 문자는 공백으로 바꿔 값으로만 해석되게 한다.
      var filterValue = function(v) {
        return String(v || '').replace(/[,()"\\*:]/g, ' ').replace(/\s+/g, ' ').trim();
      };
      var parts = [];
      var safeSid = filterValue(sid);
      if (safeSid) parts.push('spot_id.eq.' + encodeURIComponent(safeSid));
      var safeMain = filterValue(main);
      if (safeMain.length >= 2) parts.push('spot.ilike.*' + encodeURIComponent(safeMain) + '*');
      if (!parts.length) {
        var key = filterValue(String(spotName || '').replace(/\s*\(.*?\)/g, '').replace(/\[[^\]]*\]/g, ' '));
        if (key.length < 2) return [];
        parts.push('spot.ilike.*' + encodeURIComponent(key) + '*');
      }
      // 조건이 1개여도 or=(...)로 보낸다. 예전에는 1개일 때 'spot.ilike.*X*'가 "키=값" 형식이 아닌
      // 그대로 붙어 PostgREST가 필터로 해석하지 못했다.
      var filter = 'or=(' + parts.join(',') + ')';
      try {
        var query = targetUrl + '/rest/v1/feeds?' + filter + '&is_published=eq.true&select=id,photos,spot,spot_id,likes_count,created_at&order=likes_count.desc.nullslast,created_at.desc&limit=40';
        var res = await (typeof window.okbmPublicFetch === 'function'
          ? window.okbmPublicFetch(query)
          : fetch(query, {
            headers: {
              'apikey': targetKey,
              'Authorization': 'Bearer ' + targetKey,
              'Content-Type': 'application/json'
            }
          }));
        if (!res.ok) return [];
        var rows = await res.json();
        var popular = photosFromPopularSpotFeed(Array.isArray(rows) ? rows : [], matched);
        if (popular.length) return popular;
        var media = collectSpotMediaImageUrls(matched);
        return media.slice(0, 5);
      } catch (e) {
        return [];
      }
    }

    function getRegisteredSpotPhotos(spotName) {
      var matched = findRegisteredTripSpot(spotName);
      var urls = collectHttpsPhotoUrls((matched && (matched.photos || matched.images)) || []);
      urls = collectHttpsPhotoUrls(urls.concat(collectSpotMediaImageUrls(matched)));

      var feedPool = [];
      if (Array.isArray(window.__allLoadedFeeds) && window.__allLoadedFeeds.length > 0) {
        feedPool = window.__allLoadedFeeds;
      } else if (Array.isArray(window.heroTopRecords) && window.heroTopRecords.length > 0) {
        feedPool = window.heroTopRecords;
      } else if (typeof safeGetJSON === 'function') {
        feedPool = safeGetJSON('okbm_cached_community_feeds', []) || [];
      }

      var popular = photosFromPopularSpotFeed(feedPool, matched);
      return collectHttpsPhotoUrls(urls.concat(popular)).slice(0, 5);
    }

    async function resolveTripJoinPhotos(userPhotos, spotName) {
      if (window.__tripCreateUserPhotos) {
        return collectHttpsPhotoUrls(userPhotos || []);
      }
      var remote = await fetchSpotFeedPhotos(spotName);
      if (remote.length > 0) return remote;
      var local = getRegisteredSpotPhotos(spotName);
      if (local.length > 0) return local;
      return collectHttpsPhotoUrls(userPhotos || []);
    }

    async function fillTripCreatePhotosFromSpot(spotName) {
      if (window.__tripCreateUserPhotos) return;
      var photos = await fetchSpotFeedPhotos(spotName);
      if (!photos.length) photos = getRegisteredSpotPhotos(spotName);
      if (window.__tripCreateUserPhotos) return;
      window.__tripCreatePhotosFromSpot = photos.length > 0;
      window.__tempTripCreatePhotos = photos.slice(0, 5);
      window.__currentTripCreatePhotoIdx = 0;
      if (typeof renderTripPhotoStack === 'function') renderTripPhotoStack();
    }

    function getTripDDayBadge(dateStr) {
      if (!dateStr) return { text: "모집중", cls: "color:#e2e8f0; background:rgba(255,255,255,0.08);" };
      var parts = dateStr.match(/\d+/g);
      if (!parts || parts.length < 3) return { text: "모집중", cls: "color:#e2e8f0; background:rgba(255,255,255,0.08);" };
      var target = new Date(parts[0], parts[1] - 1, parts[2]);
      var now = new Date();
      now.setHours(0,0,0,0);
      var diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: "마감", cls: "color:#64748b; background:rgba(255,255,255,0.04);", isExpired: true };
      if (diffDays === 0) return { text: "오늘출발", cls: "color:#ffffff; background:rgba(244,63,94,0.25); border:1px solid rgba(244,63,94,0.4); font-weight:800;" };
      return { text: "D-" + diffDays, cls: "color:#ffffff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16); font-weight:800;" };
    }

    function renderHomeTripJoinSlider() {
      var slider = document.getElementById('homeTripJoinRailSlider');
      var countEl = document.getElementById('tripJoinTotalCountText');
      if (!slider) return;

      var activeTrips = (window.TRIP_JOINS_DATABASE || []).filter(function(t) {
        return t && t.tripId && !getTripDDayBadge(t.date).isExpired;
      }).sort(function(a, b) {
        var aClosed = Boolean(a.isClosed);
        var bClosed = Boolean(b.isClosed);
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
        var pA = a.date.match(/\d+/g) || [9999,1,1];
        var pB = b.date.match(/\d+/g) || [9999,1,1];
        return new Date(pA[0], pA[1]-1, pA[2]) - new Date(pB[0], pB[1]-1, pB[2]);
      });

      if (countEl) countEl.innerText = "(" + activeTrips.length + ")";

      var html = `
        <div class="okbm-press" onclick="openTripCreateModal()" style="width:115px; min-height:140px; flex-shrink:0; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.22); border-radius:12px; padding:12px 10px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:6px; cursor:pointer; box-sizing:border-box;">
          <div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:700;">+</div>
          <div>
            <div style="font-size:var(--fs-body); font-weight:800; color:var(--tx-1);">동행 모집하기</div>
            <div style="font-size:var(--fs-caption); color:var(--tx-3); line-height:1.4; margin-top:3px;">카카오 오픈채팅<br>공고 올리기</div>
          </div>
        </div>
      `;

      html += activeTrips.slice(0, 6).map(function(t) {
        var dBadge = getTripDDayBadge(t.date);
        var maxCap = parseInt(t.maxCapacity, 10) || 4;
        var isClosed = Boolean(t.isClosed);

        return `
          <div class="okbm-press" data-trip-id="${escapeHtml(t.tripId)}" onclick="openTripDetailModal(this.dataset.tripId)" style="width:164px; min-height:140px; flex-shrink:0; background:${isClosed ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.035)'}; border:1px solid ${isClosed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.11)'}; border-radius:12px; padding:10px 11px; display:flex; flex-direction:column; justify-content:space-between; gap:6px; cursor:pointer; box-sizing:border-box; opacity:${isClosed ? '0.6' : '1'};">
            <div style="display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:var(--fs-caption); padding:1px 5px; border-radius:3px; font-weight:800; font-variant-numeric:tabular-nums; ${dBadge.cls}">${dBadge.text}</span>
                <span style="font-size:var(--fs-caption); padding:1px 5px; border-radius:3px; font-weight:900; ${isClosed ? 'color:var(--tx-4); background:rgba(255,255,255,0.04);' : 'color:var(--ok); background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3);'}">
                  ${isClosed ? '마감' : '모집중'}
                </span>
              </div>
              <div style="font-size:var(--fs-title); font-weight:900; color:var(--tx-1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${escapeHtml(t.spotName)}</div>
              <div style="font-size:var(--fs-meta); color:var(--tx-3); font-family:var(--font-en); font-variant-numeric:tabular-nums;">${escapeHtml(t.date)}</div>
              <div style="font-size:var(--fs-meta); color:var(--tx-2); font-weight:800;">희망 ${maxCap}명</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(255,255,255,0.08); padding-top:5px; margin-top:2px;">
              <span style="font-size:var(--fs-caption); color:var(--tx-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;"><svg viewBox="0 0 24 24" style="width:10px; height:10px; fill:none; stroke:currentColor; stroke-width:2.2; flex-shrink:0;"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>${escapeHtml(t.authorName || '방장')}</span>
              <span style="font-size:var(--fs-meta); color:${isClosed ? 'var(--tx-4)' : 'var(--accent)'}; font-weight:800; flex-shrink:0;">${isClosed ? '마감됨' : '공고보기'}</span>
            </div>
          </div>
        `;
      }).join('');

      if (activeTrips.length > 3) {
        html += `
          <div class="okbm-press" onclick="openTripJoinListModal()" style="width:110px; min-height:140px; flex-shrink:0; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 10px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:6px; cursor:pointer; box-sizing:border-box;">
            <div style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center;">
              <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#cbd5e1; stroke-width:2.2;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div style="font-size:0.75rem; font-weight:800; color:#ffffff;">전체보기</div>
            <div style="font-size:0.56rem; color:#94a3b8;">(${activeTrips.length}개 공고)</div>
          </div>
        `;
      }

      slider.innerHTML = html;
    }

  window.syncTripToSupabase = async function(tripData) {
      if (!tripData) return null;
      if (!window.supabaseClient) {
        console.warn('[Supabase] 클라이언트가 초기화되지 않았습니다.');
        showToast('데이터베이스에 연결할 수 없습니다. (Supabase 미연결)', 'warn');
        return null;
      }
      var profile = safeGetJSON('user_profile', null);
      var rawUid = (profile && profile.id) ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
      if (!rawUid) {
        rawUid = 'user_' + Date.now();
        localStorage.setItem('okbm_user_id', rawUid);
      }
      var curUid = (typeof window.okbmCanonicalUserId === 'function')
        ? window.okbmCanonicalUserId(rawUid)
        : ((/^(kakao_|naver_|apple_|google_|guest_|user_)/.test(rawUid)) ? rawUid : ('kakao_' + rawUid));

      var memberCount = Number(tripData.maxCapacity || tripData.maxMembers || 4);
      var safeDate = tripData.date ? String(tripData.date).replace(/\./g, '-') : new Date().toISOString().split('T')[0];
      var persistentAuthor = (profile && profile.nickname) ? String(profile.nickname).trim() : (localStorage.getItem('okbm_user_nick') || tripData.authorName || '낭만백패커');
      var myAuthor = persistentAuthor;

      var fullDescription = tripData.desc || '';
      var photoArray = getTripPhotosList(tripData);

      var row = {
        host_id: curUid,
        spot_name: tripData.spotName,
        region: tripData.region || '전국',
        author_name: myAuthor,
        start_date: safeDate,
        max_capacity: memberCount,
        current_joined: 1,
        carpool_info: '',
        open_chat_url: tripData.openChatUrl || '',
        description: fullDescription,
        is_closed: false,
        status: 'open',
        photos: JSON.stringify(photoArray)
      };

      try {
        var res = await window.supabaseClient.from('trips').insert([row]).select();

        // 1차 폴백: author_name이나 is_closed 컬럼이 테이블에 없는 구버전 스키마 호환
        if (res.error) {
          console.warn('[SUPABASE INSERT RETRY 1]', res.error);
          var rowFallback1 = Object.assign({}, row);
          delete rowFallback1.author_name;
          delete rowFallback1.is_closed;
          res = await window.supabaseClient.from('trips').insert([rowFallback1]).select();
        }

        // 2차 폴백: photos가 JSONB 객체 형태로 요구되거나 carpool_info가 없는 경우
        if (res.error) {
          console.warn('[SUPABASE INSERT RETRY 2]', res.error);
          var rowFallback2 = {
            host_id: curUid,
            spot_name: tripData.spotName,
            region: myAuthor,
            start_date: safeDate,
            max_capacity: memberCount,
            current_joined: 1,
            description: fullDescription,
            status: 'open',
            photos: photoArray
          };
          if (tripData.openChatUrl) rowFallback2.open_chat_url = tripData.openChatUrl;
          res = await window.supabaseClient.from('trips').insert([rowFallback2]).select();
        }

        if (res.error) {
          console.error('[SUPABASE INSERT ERROR FINAL]', res.error);
          var errMsg = res.error.message || res.error.details || JSON.stringify(res.error);
          showToast('동행 등록 오류: ' + errMsg, 'warn', 4000);
          return null;
        }

        if (res.data && res.data[0]) {
          var realUuid = res.data[0].id;
          tripData.tripId = realUuid;
          tripData.userId = curUid;

          showToast('원정대 공고가 등록되었습니다!', 'success');
          return realUuid;
        }
      } catch (err) {
        console.error('[SUPABASE CREATE_TRIP Exception]', err);
        showToast('등록 중 오류가 발생했습니다: ' + (err.message || err), 'warn', 4000);
      }
      return null;
    };
    window.syncTripToCloudSheet = window.syncTripToSupabase;

    window.deleteTripFromSupabase = async function(tripId, e, skipConfirm) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      if (!skipConfirm && !confirm('이 원정대 공고를 삭제하시겠습니까?\n달력과 홈 화면에서 즉시 삭제됩니다.')) return;

      var targetIdStr = String(tripId).trim();
      if (!targetIdStr) return;

      // [헌법 4] 서버 삭제가 확인된 뒤에만 화면과 로컬 목록을 정리한다.
      var tripDel = (typeof window.okbmDeleteRowsConfirmed === 'function')
        ? await window.okbmDeleteRowsConfirmed('trips', targetIdStr)
        : { ok: false, error: 'no_helper' };
      if (!tripDel.ok) {
        if (tripDel.error !== 'login_required') showToast('원정대 공고 삭제에 실패했습니다. 다시 시도해주세요.', 'error');
        return;
      }

      var modal = document.getElementById('tripDetailSheetModal');
      if (modal) modal.remove();
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('tripDetailSheetModal');
      }
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      } else {
        document.body.classList.remove('trip-modal-open');
        document.body.style.top = '';
      }

      window.TRIP_JOINS_DATABASE = (window.TRIP_JOINS_DATABASE || []).filter(function(t) { 
        return String(t.tripId).trim() !== targetIdStr; 
      });
      if (typeof renderHomeTripJoinSlider === 'function') renderHomeTripJoinSlider();

      triggerHaptic(20);
      showToast('원정대 공고가 삭제되었습니다.', 'info');
      if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
    };
    window.deleteTripFromCloudSheet = window.deleteTripFromSupabase;

    async function loadTripsFromSupabase() {
      if (!window.supabaseClient) return;
      try {
        var dNow = new Date();
        dNow.setDate(dNow.getDate() - 90);
        var pad = function(n) { return String(n).padStart(2, '0'); };
        var cutoffDate = dNow.getFullYear() + '-' + pad(dNow.getMonth() + 1) + '-' + pad(dNow.getDate());

        var res = await window.supabaseClient
          .from('trips')
          .select('*')
          .gte('start_date', cutoffDate)
          .order('start_date', { ascending: true })
          .limit(100);

        if (res.data && Array.isArray(res.data)) {
          var mapped = res.data.filter(function(r) {
            return r && r.id;
          }).map(function(r) {
            var dbPhotos = [];
            if (r.photos) {
              if (Array.isArray(r.photos)) {
                dbPhotos = r.photos;
              } else if (typeof r.photos === 'string' && r.photos.trim().startsWith('[')) {
                try { dbPhotos = JSON.parse(r.photos); } catch(e) {}
              } else if (typeof r.photos === 'string' && r.photos.trim().length > 10) {
                dbPhotos = [r.photos.trim()];
              }
            }

            var isClosed = Boolean(r.is_closed === true || r.is_closed === 'true' || r.status === 'closed');
            var author = r.author_name || r.region || '방장';

            return {
              tripId: r.id,
              userId: r.host_id || '',
              spotName: r.spot_name,
              date: (r.start_date || '').replace(/-/g, '.'),
              maxCapacity: parseInt(r.max_capacity, 10) || 4,
              openChatUrl: r.open_chat_url || '',
              desc: r.description || '',
              authorName: author,
              isClosed: isClosed,
              photos: dbPhotos
            };
          });
          window.TRIP_JOINS_DATABASE = mapped;
          renderHomeTripJoinSlider();
        }
      } catch (err) {
        console.error('[SUPABASE LOAD_TRIPS Error]', err);
      }
    }


    window.toggleTripClosedStatus = async function(tripId, e) {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      var targetIdStr = String(tripId).trim();
      var trip = (window.TRIP_JOINS_DATABASE || []).find(function(t) { return String(t.tripId).trim() === targetIdStr; });
      if (!trip) return;

      var profile = safeGetJSON('user_profile', null);
      var rawUserId = (profile && profile.id) ? String(profile.id).trim() : '';
      var currentNick = (profile && profile.nickname) ? String(profile.nickname).trim() : '';

      var isHost = Boolean(
        (typeof window.okbmSameAccountId === 'function'
          ? window.okbmSameAccountId(rawUserId, trip.userId || trip.host_id)
          : (rawUserId && String(trip.userId || '').trim() === rawUserId)) ||
        (currentNick && trip.authorName && currentNick === String(trip.authorName).trim())
      );

      if (!isHost) {
        showToast('공고를 등록한 방장만 모집 상태를 변경할 수 있습니다.', 'warn');
        return;
      }

      var nextClosed = !trip.isClosed;
      trip.isClosed = nextClosed;

      if (window.supabaseClient) {
        try {
          var updateData = {
            is_closed: nextClosed,
            status: nextClosed ? 'closed' : 'open'
          };
          var upRes = await window.supabaseClient.from('trips').update(updateData).eq('id', targetIdStr);
          if (upRes.error) {
            await window.supabaseClient.from('trips').update({ status: nextClosed ? 'closed' : 'open' }).eq('id', targetIdStr);
          }
        } catch (err) {
          console.error('[SUPABASE TOGGLE_CLOSED Error]', err);
        }
      }

      showToast(nextClosed ? '원정대 모집이 마감되었습니다.' : '원정대 모집이 다시 시작되었습니다.', 'success');

      if (typeof renderHomeTripJoinSlider === 'function') renderHomeTripJoinSlider();
      var activeTrips = (window.TRIP_JOINS_DATABASE || []).filter(function(t) {
        return !getTripDDayBadge(t.date).isExpired;
      });
      if (activeTrips.length === 0) activeTrips = window.TRIP_JOINS_DATABASE || [];
      renderTripDetailSheet(activeTrips);
    };

    window.viewTripHostProfile = function(authorName, userId) {
      if (typeof window.openUserFeedCollectionModal === 'function') {
        window.openUserFeedCollectionModal(authorName, userId, 'route');
        var coll = document.getElementById('userFeedCollectionModal');
        if (coll) {
          coll.style.setProperty('z-index', '2147483645', 'important');
        }
        return;
      }
      if (typeof window.openTripAuthorProfile === 'function') {
        window.openTripAuthorProfile(authorName, userId);
      }
    };

    window.__currentTripJoinModalIdx = 0;

    window.closeTripDetailModal = function() {
      var modal = document.getElementById('tripDetailSheetModal');
      if (modal) modal.remove();
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('tripDetailSheetModal');
      }
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      } else {
        document.body.classList.remove('trip-modal-open');
        document.body.style.top = '';
      }
    };

    window.openTripDetailModal = function(tripId) {
      window.__currentActiveTripId = String(tripId);
      if (typeof window.lockHomeScrollForTripModal === 'function') {
        window.lockHomeScrollForTripModal();
      } else {
        document.body.classList.add('trip-modal-open');
      }
      var activeTrips = (window.TRIP_JOINS_DATABASE || []).filter(function(t) {
        return !getTripDDayBadge(t.date).isExpired;
      });
      if (activeTrips.length === 0) activeTrips = window.TRIP_JOINS_DATABASE || [];

      var targetIdx = activeTrips.findIndex(function(t) { return String(t.tripId) === String(tripId); });
      if (targetIdx === -1) targetIdx = 0;
      window.__currentTripJoinModalIdx = targetIdx;

      renderTripDetailSheet(activeTrips);
    };

    function renderTripDetailSheet(activeTrips) {
      var trip = activeTrips[window.__currentTripJoinModalIdx];
      if (!trip) return;

      var old = document.getElementById('tripDetailSheetModal');
      if (old) old.remove();

      var spotPool = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots : (safeGetJSON('okbm_spots_cache', []) || []);

      var searchKey = String(trip.spotName || '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      var matched = spotPool.find(function(s) {
        var n = String(s.name || s.spot_main || s.fullName || '').replace(/[\s\(\[\]\)]/g, '').toLowerCase();
        var k = searchKey.replace(/[\s\(\[\]\)]/g, '');
        return k && (n.includes(k) || k.includes(n));
      });

      var mainName = matched ? (matched.spot_main || matched.name || matched.fullName) : trip.spotName;
      var cityName = matched ? (matched.cityName || matched.region || '전국') : '전국';
      var elevStr = matched && matched.elevation ? (String(matched.elevation).includes('m') ? matched.elevation : matched.elevation + 'm') : '';
      var subPoint = matched ? (matched.spot_sub || '') : '';
      var navTargetSpot = String(mainName).replace(/\s*\(.*?\)/g, '');

      var photoList = getTripPhotosList(trip);
      if (photoList.length === 0) {
        photoList = getRegisteredSpotPhotos(trip.spotName);
      }


      var rawSummary = matched ? (matched.desc_summary || matched.desc || '') : '';
      var cleanSummary = String(rawSummary).replace(/\\n/g, '\n');
      var viewMatch = cleanSummary.match(/\[(?:뷰\/특징|뷰|특징)\]\s*([\s\S]*?)(?=\[(?:접근\/코스|접근|코스|박지\/피칭|박지|장소\/피칭|장소|피칭|주의\/팁|주의|팁)\]|$)/i);
      var onlyViewText = viewMatch ? viewMatch[1].trim() : (cleanSummary.split(/\n\s*\n|\n(?=\[)/)[0] || '').replace(/^\[.*?\]\s*/, '').trim();

      var maxCap = parseInt(trip.maxCapacity, 10) || 4;
      var totalTrips = activeTrips.length;

      var profile = safeGetJSON('user_profile', null);
      var currentNick = (profile && profile.nickname) ? String(profile.nickname).trim() : '';
      var rawUserId = (profile && profile.id) ? String(profile.id).trim() : '';
      var isAuthor = Boolean(
        (typeof window.okbmSameAccountId === 'function'
          ? window.okbmSameAccountId(rawUserId, trip.userId || trip.host_id)
          : (rawUserId && String(trip.userId || '').trim() === rawUserId)) ||
        (currentNick && trip.authorName && currentNick === String(trip.authorName).trim())
      );
      var isClosed = Boolean(trip.isClosed);

      var modal = document.createElement('div');
      modal.id = 'tripDetailSheetModal';
      modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; height:calc(var(--vh, 1vh) * 100); max-height:calc(var(--vh, 1vh) * 100); background:#000000; z-index:1000040; display:flex; justify-content:center; align-items:stretch; box-sizing:border-box; overflow:hidden;';

      modal.innerHTML = `
        <div id="tripDetailCardTarget" style="width:100%; max-width:480px; height:100%; max-height:100%; background:#000000; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden; position:relative;">
          
          <!-- Close Button Top Right -->
          <button type="button" onclick="window.closeTripDetailModal();" style="position:absolute; top:calc(12px + env(safe-area-inset-top, 0px)); right:14px; z-index:30; width:34px; height:34px; border-radius:50%; background:#0c1017; border:1px solid rgba(255,255,255,0.25); color:#ffffff; font-size:1.1rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>

          <div id="tripDetailInnerScroll" style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; contain:content; padding:calc(10px + env(safe-area-inset-top, 0px)) 12px calc(130px + env(safe-area-inset-bottom, 8px)) 12px; display:flex; flex-direction:column; gap:9px; box-sizing:border-box;">
            
            <div style="width:100%; display:flex; justify-content:center; flex-shrink:0;">
              <div id="tripDetailPhotoWrapper" style="width:100%; max-width:420px; aspect-ratio:3/4; position:relative; border-radius:18px; overflow:hidden; border:1px solid rgba(255,255,255,0.16); box-shadow:0 16px 45px rgba(0,0,0,0.95); background:#070a12; box-sizing:border-box;">
                
                ${photoList.length > 0 ? `
                  <div id="tripDetailSwipeTrack" onscroll="window.updateTripDetailDots(this);" style="display:flex !important; width:100% !important; height:100% !important; overflow-x:auto !important; overflow-y:hidden !important; scroll-snap-type:x mandatory !important; -webkit-overflow-scrolling:touch !important; scrollbar-width:none; touch-action:pan-x pan-y !important;">
                    ${photoList.map(function(pUrl) {
                      return `
                        <div style="flex:0 0 100% !important; width:100% !important; height:100% !important; min-width:100% !important; scroll-snap-align:start !important; position:relative; overflow:hidden; background:#070a12;">
                          <img src="${escapeHtml(okbmSafeImageUrl(pUrl))}" alt="Cover" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; filter:brightness(0.96) contrast(1.04);" />
                          <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%); pointer-events:none;"></div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <div id="tripDetailDotsWrapper" style="position:absolute; bottom:12px; left:0; right:0; display:${photoList.length > 1 ? 'flex' : 'none'}; justify-content:center; align-items:center; gap:4px; height:8px; z-index:12; pointer-events:none;">
                    ${photoList.map(function(_, dIdx) {
                      var dW = dIdx === 0 ? '12px' : '4px';
                      var dBg = dIdx === 0 ? '#ffffff' : 'rgba(255,255,255,0.35)';
                      return `<div style="width:${dW}; height:4px; border-radius:2px; background:${dBg}; transition:all 0.2s ease;"></div>`;
                    }).join('')}
                  </div>
                ` : `
                  <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; background:radial-gradient(circle at center, #111827 0%, #030712 100%); color:#64748b; padding:20px; box-sizing:border-box;">
                    <div style="width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center;">
                      <svg viewBox="0 0 24 24" style="width:24px; height:24px; stroke:#64748b; fill:none; stroke-width:1.8;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                    <span style="font-size:0.75rem; font-weight:800; color:#94a3b8;">등록된 사진이 없습니다</span>
                    <span style="font-size:0.62rem; color:#475569;">원정대장 및 등록 장소 사진 없음</span>
                  </div>
                `}

              </div>
            </div>

            <!-- Spot Location Header (Click to Open Map Directly) -->
            <div class="js-open-map-spot" data-close-modal="trip" data-spot="${escapeHtml(navTargetSpot)}" style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px; cursor:pointer; transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.035)'">
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
                  <span style="font-size:0.68rem; font-weight:800; color:#cbd5e1; background:rgba(255,255,255,0.08); padding:1.5px 5px; border-radius:4px;">${escapeHtml(cityName)}</span>
                  <span style="font-size:1.02rem; font-weight:900; color:#ffffff;">${escapeHtml(mainName)}</span>
                  ${elevStr ? `<span style="font-size:0.75rem; color:#94a3b8;">(${escapeHtml(elevStr)})</span>` : ''}
                </div>
                ${subPoint ? `<div style="font-size:0.66rem; color:#cbd5e1; margin-top:2px;">  <svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:#38bdf8; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0; vertical-align:-1.5px; margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(subPoint)}</div>` : ''}
              </div>
              <div style="background:#ffffff; color:#000000; border-radius:8px; padding:6px 12px; font-size:0.75rem; font-weight:900; flex-shrink:0; box-shadow:0 2px 8px rgba(255,255,255,0.2); display:inline-flex; align-items:center; gap:3px;">
                <span>장소확인</span>
                <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#000000; stroke-width:2.5;"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            <!-- Spot Feature Card -->
            <div id="tripDetailSpotFeatureCard" style="background:rgba(255,255,255,0.025); border-left:3px solid rgba(255,255,255,0.6); border-radius:6px; padding:10px 12px; font-size:0.78rem; color:#cbd5e1; line-height:1.5; touch-action:pan-y; user-select:none; -webkit-user-select:none; cursor:grab;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                <div style="font-size:0.70rem; font-weight:800; color:#fff; display:inline-flex; align-items:center; gap:4px;">
                  <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                  <span>[장소 특징]</span>
                </div>
                ${totalTrips > 1 ? '<span style="font-size:0.56rem; color:#64748b;">(좌우 스와이프로 다른 공고 이동)</span>' : ''}
              </div>
              <div>${escapeHtml(onlyViewText || '자연 속에서 비화식과 흔적 없는 클린 백패킹을 실천하는 추천 장소입니다.')}</div>
            </div>

            <!-- Expedition Leader Info -->
            <div style="background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px; gap:8px;">
                <button type="button" data-author="${escapeHtml(trip.authorName || '원정대장')}" data-user-id="${escapeHtml(trip.userId || '')}" onclick="window.viewTripHostProfile(this.dataset.author, this.dataset.userId);" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:7px; min-width:0; flex:1; text-align:left;">
                  <svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>
                  <span style="font-size:0.78rem; font-weight:900; color:#ffffff; flex-shrink:0;">원정대장</span>
                  <span style="font-size:0.80rem; font-weight:900; color:#38bdf8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:inline-flex; align-items:center; gap:3px; min-width:0;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(trip.authorName || '원정대장')}</span>
                    <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#38bdf8; stroke-width:2.4; flex-shrink:0;"><path d="M9 18l6-6-6-6"/></svg>
                  </span>
                </button>
                <div style="font-size:0.70rem; font-weight:900; ${isClosed ? 'color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);' : 'color:#34d399; background:rgba(52,211,153,0.12); border:1px solid rgba(52,211,153,0.3);'} padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; flex-shrink:0;">
                  <span>${isClosed ? '모집 마감' : '모집 중'}</span>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:6px; font-size:0.75rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8; display:inline-flex; align-items:center; gap:5px;">
                    <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#f59e0b; stroke-width:2.2; flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>출발 일정</span>
                  </span>
                  <strong style="color:#fff; font-family:var(--font-en);">${escapeHtml(trip.date)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8; display:inline-flex; align-items:center; gap:5px;">
                    <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#34d399; stroke-width:2.2; flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>희망 정원</span>
                  </span>
                  <strong style="color:#34d399; font-family:var(--font-en);">총 ${maxCap}명 규모</strong>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8; display:inline-flex; align-items:center; gap:5px;">
                    <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#34d399; stroke-width:2.2; flex-shrink:0;"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                    <span>매너 수칙</span>
                  </span>
                  <strong style="color:#34d399;">100% 비화식 · LNT 클린</strong>
                </div>
              </div>
            </div>

            <!-- Host Memo / Desc -->
            <div style="min-height:85px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.14); border-radius:12px; padding:12px 14px; font-size:0.80rem; color:#e2e8f0; line-height:1.6; display:flex; flex-direction:column; justify-content:flex-start; box-sizing:border-box;">
              <div style="font-size:0.68rem; color:#94a3b8; font-weight:800; margin-bottom:4px;">[방장 한마디 및 동행 스타일]</div>
              “${escapeHtml(trip.desc || '자연 속에서 비화식으로 조용히 힐링하며 은하수 보실 분 모십니다.')}”
            </div>

            <!-- Action Area -->
            <div style="display:flex; flex-direction:column; gap:7px; margin-top:4px; flex-shrink:0;">
              ${isAuthor ? `
                <a href="${escapeHtml(okbmSafeExternalUrl(trip.openChatUrl || 'https://open.kakao.com'))}" target="_blank" rel="noopener noreferrer" style="width:100%; height:40px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18); color:#ffffff; border-radius:10px; text-decoration:none; font-size:0.82rem; font-weight:900; display:flex; align-items:center; justify-content:center; gap:6px; box-sizing:border-box;">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:#fde047; flex-shrink:0;"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-1 3.5 0 0-.1.3.1.4.2.1.4 0 .4 0 .6-.1 3.5-2.3 4.1-2.7.5.1 1.1.1 1.6.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>
                  <span>내 오픈채팅 링크 연결 확인</span>
                </a>
                <div style="display:flex; gap:6px; width:100%;">
                  <button type="button" data-trip-id="${escapeHtml(trip.tripId)}" onclick="window.openTripEditModal(this.dataset.tripId);" style="flex:1; height:42px; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; border-radius:10px; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box;">
                    <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>공고 수정</span>
                  </button>
                  <button type="button" data-trip-id="${escapeHtml(trip.tripId)}" onclick="window.toggleTripClosedStatus(this.dataset.tripId, event);" style="flex:1; height:42px; background:${isClosed ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)'}; border:1px solid ${isClosed ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}; color:${isClosed ? '#34d399' : '#fde68a'}; border-radius:10px; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box;">
                    ${isClosed ? `
                      <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#34d399; stroke-width:2.2; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span>모집 재개</span>
                    ` : `
                      <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#fde68a; stroke-width:2.2; flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span>모집 마감</span>
                    `}
                  </button>
                  <button type="button" data-trip-id="${escapeHtml(trip.tripId)}" onclick="window.deleteTripFromCloudSheet(this.dataset.tripId, event);" style="flex:0.85; height:42px; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.35); color:#fda4af; border-radius:10px; font-size:0.80rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-sizing:border-box;">
                    <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#fda4af; stroke-width:2.2; flex-shrink:0;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    <span>삭제</span>
                  </button>
                </div>
              ` : `
                ${isClosed ? `
                  <button type="button" disabled style="width:100%; height:48px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#64748b; border-radius:12px; font-size:0.90rem; font-weight:900; cursor:not-allowed; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:none; stroke:#64748b; stroke-width:2.2; flex-shrink:0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>모집이 마감된 원정대입니다</span>
                  </button>
                ` : `
                  <button type="button" data-chat-url="${escapeHtml(trip.openChatUrl || '')}" onclick="window.handleTripChatJoinClick(this.dataset.chatUrl);" style="width:100%; height:48px; background:#fee500; color:#181600; border:none; border-radius:12px; font-size:0.92rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(254,229,0,0.25);">
                    <svg viewBox="0 0 24 24" style="width:18px; height:18px; fill:#181600; flex-shrink:0;"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-1 3.5 0 0-.1.3.1.4.2.1.4 0 .4 0 .6-.1 3.5-2.3 4.1-2.7.5.1 1.1.1 1.6.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>
                    <span>카카오톡 오픈채팅으로 문의하기</span>
                  </button>
                `}
              `}
            </div>

          </div>

        </div>
      `;
      document.body.appendChild(modal);

      if (photoList.length === 0 && trip.spotName) {
        var tripIdForPhotos = String(trip.tripId || '');
        fetchSpotFeedPhotos(trip.spotName).then(function(remote) {
          if (!remote || !remote.length) return;
          if (String(window.__currentActiveTripId || '') !== tripIdForPhotos) return;
          if (!document.getElementById('tripDetailSheetModal')) return;
          trip.photos = remote;
          renderTripDetailSheet(activeTrips);
        });
      }

      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('tripDetailSheetModal', window.closeTripDetailModal);
      }

      var featureCard = document.getElementById('tripDetailSpotFeatureCard');
      if (featureCard && totalTrips > 1) {
        var startX = 0, startY = 0;
        featureCard.addEventListener('touchstart', function(e) {
          if (!e.touches || e.touches.length !== 1) return;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }, { passive: true });

        featureCard.addEventListener('touchend', function(e) {
          if (!e.changedTouches || e.changedTouches.length !== 1) return;
          var diffX = e.changedTouches[0].clientX - startX;
          var diffY = e.changedTouches[0].clientY - startY;

          if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) {
              window.__currentTripJoinModalIdx = (window.__currentTripJoinModalIdx + 1) % totalTrips;
            } else {
              window.__currentTripJoinModalIdx = (window.__currentTripJoinModalIdx - 1 + totalTrips) % totalTrips;
            }
            renderTripDetailSheet(activeTrips);
          }
        }, { passive: true });
      }
    }

    window.updateTripDetailDots = function(trackEl) {
      if (!trackEl) return;
      var w = trackEl.offsetWidth;
      if (!w) return;
      var curIdx = Math.round(trackEl.scrollLeft / w);
      var dotsWrap = document.getElementById('tripDetailDotsWrapper');
      if (dotsWrap && dotsWrap.children.length > 0) {
        var dots = dotsWrap.children;
        for (var i = 0; i < dots.length; i++) {
          if (i === curIdx) {
            dots[i].style.width = '12px';
            dots[i].style.background = '#ffffff';
          } else {
            dots[i].style.width = '4px';
            dots[i].style.background = 'rgba(255,255,255,0.35)';
          }
        }
      }
    };

    // 원정대 오픈채팅 링크는 https://open.kakao.com/ 만 허용한다. 아니면 ''.
    // (예전 includes('open.kakao.com') 검사는 https://evil.example/?open.kakao.com 도 통과했음)
    window.okbmSafeOpenChatUrl = function(url) {
      var raw = String(url || '').trim();
      if (!raw) return '';
      if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
      var safe = (typeof okbmSafeExternalUrl === 'function') ? okbmSafeExternalUrl(raw) : '#';
      if (!safe || safe === '#') return '';
      try {
        var u = new URL(safe);
        if (u.protocol === 'http:') u.protocol = 'https:';
        if (u.protocol === 'https:' && u.hostname.toLowerCase() === 'open.kakao.com' && !u.port) return u.href;
      } catch (e) {}
      return '';
    };

    window.handleTripChatJoinClick = function(chatUrl) {
      if (!(typeof isUserLoggedIn === 'function' && isUserLoggedIn())) {
        showToast('원정대 동행 문의는 로그인 후 이용하실 수 있습니다.', 2200);
        if (typeof openLoginModal === 'function') {
          openLoginModal();
        }
        return;
      }

      chatUrl = window.okbmSafeOpenChatUrl(chatUrl);
      if (!chatUrl) {
        showToast('올바른 오픈채팅 링크가 등록되지 않았습니다.', 'warn');
        return;
      }

      // 새 창이 window.opener로 이 페이지를 조작하지 못하게 한다 (tabnabbing 방지).
      window.open(chatUrl, '_blank', 'noopener,noreferrer');
    };

    function closeTripCreateModal() {
      var m = document.getElementById('tripCreateModal');
      if (m) m.remove();
      if (typeof window.unregisterModalClose === 'function') {
        window.unregisterModalClose('tripCreateModal');
      }
      if (typeof window.unlockHomeScrollForTripModal === 'function') {
        window.unlockHomeScrollForTripModal();
      } else {
        document.body.classList.remove('trip-modal-open');
        document.body.style.top = '';
      }
    }
    window.closeTripCreateModal = closeTripCreateModal;

    function openTripCreateModal() {
      if (!(typeof isUserLoggedIn === 'function' && isUserLoggedIn())) {
        showToast('원정대 모집은 로그인 후 이용 가능합니다.', 2200);
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
      }

      if (typeof window.lockHomeScrollForTripModal === 'function') {
        window.lockHomeScrollForTripModal();
      } else {
        document.body.classList.add('trip-modal-open');
      }
      var old = document.getElementById('tripCreateModal');
      if (old) old.remove();

      window.__tempTripCreatePhotos = [];
      window.__currentTripCreatePhotoIdx = 0;
      window.__tripCreateUserPhotos = false;
      window.__tripCreatePhotosFromSpot = false;
      window.__matchedMasterSpotData = null;

      if (typeof window.registerModalOpen === 'function') {
        window.registerModalOpen('tripCreateModal', closeTripCreateModal);
      }

      var modal = document.createElement('div');
      modal.id = 'tripCreateModal';
      modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); width:100%; height:calc(100% - 56px - env(safe-area-inset-bottom, 8px)); height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100vh - 56px - env(safe-area-inset-bottom, 8px)); max-height:calc(100dvh - 56px - env(safe-area-inset-bottom, 8px)); background:#000000; z-index:2147483640; display:flex; justify-content:center; align-items:stretch; box-sizing:border-box; overflow:hidden;';

      modal.innerHTML = `
        <div style="width:100%; max-width:480px; height:100%; max-height:100%; background:#000000; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;">
          
          <!-- Top Header Bar -->
          <div style="flex-shrink:0; height:48px; display:flex; align-items:center; justify-content:space-between; padding:calc(6px + env(safe-area-inset-top, 0px)) 16px 6px 16px; border-bottom:1px solid rgba(255,255,255,0.1); background:#000000; z-index:20; box-sizing:content-box;">
            <div style="font-size:0.92rem; font-weight:900; color:#ffffff; display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>동행 모집 (원정대 만들기)</span>
            </div>
            <button type="button" onclick="window.closeTripCreateModal();" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); color:#cbd5e1; font-size:1.1rem; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
          </div>

          <!-- Scrollable Form Container -->
          <div style="flex:1 1 0%; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px clamp(12px, 3.5vw, 16px) 24px clamp(12px, 3.5vw, 16px); display:flex; flex-direction:column; gap:clamp(6px, 1.2vh, 10px); box-sizing:border-box;">
            
            <div style="position:relative; width:100%; display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 0 4px 0; flex-shrink:0;">
              <input type="file" id="tripPhotoFileInput" accept="image/*" multiple style="display:none;" onchange="handleTripMultiPhotoUpload(event)" />
              <div id="tripPhotoStackWrapper" style="position:relative; width:clamp(240px, 72vw, 315px); aspect-ratio:3/4; max-height:42vh; display:flex; justify-content:center; align-items:center; box-sizing:border-box;"></div>
              <div id="tripPhotoIndicators" style="display:flex; gap:4px; align-items:center; height:12px;"></div>
            </div>

            <div style="position:relative; display:flex; flex-direction:column; gap:2px; z-index:1000060;">
              <label style="font-size:clamp(0.68rem, 1.9vw, 0.72rem); color:#cbd5e1; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:#38bdf8; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>목적지 장소 (한두 글자 입력 검색) *</span>
              </label>
              <div style="position:relative; width:100%; display:flex; align-items:center;">
                <input type="text" id="tripInputSpot" placeholder="박지명을 입력하세요 (예: 선자, 둔덕, 굴업)" oninput="handleTripSpotSearch(this.value)" autocomplete="off" style="width:100%; height:clamp(33px, 4.3vh, 37px); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:clamp(0.76rem, 2.2vw, 0.82rem); padding:0 30px 0 10px; outline:none; box-sizing:border-box;" />
                <button type="button" id="btnTripSpotClear" onclick="window.clearTripSpotInput();" style="display:none; position:absolute; right:8px; background:rgba(255,255,255,0.22); border:none; color:#ffffff; width:17px; height:17px; border-radius:50%; font-size:0.6rem; font-weight:900; cursor:pointer; align-items:center; justify-content:center; padding:0;">✕</button>
              </div>
              <div id="tripSpotDropdown" class="spot-search-dropdown-list" style="top:clamp(52px, 6.8vh, 58px); z-index:1000070; background:#0e121a; border:1px solid rgba(56,189,248,0.4); max-height:140px; box-shadow:0 12px 30px rgba(0,0,0,0.95);"></div>
              <div id="tripSelectedSpotPreview" style="display:none; margin-top:4px;"></div>
            </div>

            <div style="display:flex; gap:6px;">
              <div style="flex:1.2; display:flex; flex-direction:column; gap:2px;">
                <label style="font-size:clamp(0.68rem, 1.9vw, 0.72rem); color:#cbd5e1; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                  <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#f59e0b; stroke-width:2.2; flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>출발 날짜 (스케줄 연동) *</span>
                </label>
                <input type="text" id="tripInputDate" placeholder="터치하여 달력 선택" readonly onclick="window.openTripDatePickerModal();" style="width:100%; height:clamp(33px, 4.3vh, 37px); background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.35); border-radius:8px; color:#38bdf8; font-size:clamp(0.76rem, 2.2vw, 0.82rem); padding:0 10px; outline:none; box-sizing:border-box; font-family:var(--font-en); font-weight:800; cursor:pointer;" />
              </div>
              <div style="flex:1; display:flex; flex-direction:column; gap:2px;">
                <label style="font-size:clamp(0.68rem, 1.9vw, 0.72rem); color:#cbd5e1; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                  <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#34d399; stroke-width:2.2; flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
                  <span>모집 정원 (총원) *</span>
                </label>
                <select id="tripSelectMaxCapacity" style="width:100%; height:clamp(33px, 4.3vh, 37px); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:clamp(0.76rem, 2.2vw, 0.82rem); padding:0 8px; outline:none; box-sizing:border-box; font-weight:800;">
                  <option value="2">2명</option>
                  <option value="3">3명</option>
                  <option value="4" selected>4명</option>
                  <option value="5">5명</option>
                  <option value="6">6명 (소그룹)</option>
                  <option value="8">8명 (단체)</option>
                </select>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:2px;">
              <label style="font-size:clamp(0.68rem, 1.9vw, 0.72rem); color:#cbd5e1; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:#fde047; flex-shrink:0;"><path d="M12 3c-5.5 0-10 3.5-10 7.8 0 2.8 1.9 5.3 4.8 6.7-.2.8-.8 3-1 3.5 0 0-.1.3.1.4.2.1.4 0 .4 0 .6-.1 3.5-2.3 4.1-2.7.5.1 1.1.1 1.6.1 5.5 0 10-3.5 10-7.8S17.5 3 12 3z"/></svg>
                <span>카카오톡 오픈채팅 링크 *</span>
              </label>
              <input type="text" id="tripInputChatUrl" placeholder="https://open.kakao.com/o/..." style="width:100%; height:clamp(33px, 4.3vh, 37px); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:clamp(0.76rem, 2.2vw, 0.82rem); padding:0 10px; outline:none; box-sizing:border-box;" />
            </div>

            <div style="display:flex; flex-direction:column; gap:2px;">
              <label style="font-size:clamp(0.68rem, 1.9vw, 0.72rem); color:#cbd5e1; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>동행 소개글 & 스타일</span>
              </label>
              <textarea id="tripInputDesc" rows="3" placeholder="카풀 가능 여부, 준비물, 스타일(비화식, 사진, 매너캠핑 등)을 편하게 적어주세요." style="width:100%; height:94px; min-height:94px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); border-radius:8px; color:#fff; font-size:clamp(0.76rem, 2.1vw, 0.82rem); line-height:1.5; padding:8px 12px; outline:none; resize:none; box-sizing:border-box;"></textarea>
            </div>

            <!-- Submit Button (scrolls naturally with the form, clearly visible at the bottom) -->
            <div style="margin-top:6px; padding-bottom:8px; flex-shrink:0;">
              <button type="button" id="btnSubmitTripCreate" onclick="submitNewTripJoin()" style="width:100%; height:46px; background:#ffffff; color:#000000; border:none; border-radius:10px; font-size:0.92rem; font-weight:900; cursor:pointer; box-shadow:0 4px 14px rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; gap:6px;">
                <span>원정대 등록 완료</span>
                <svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:none; stroke:#000000; stroke-width:2.5; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>

          </div>

        </div>
      `;
      document.body.appendChild(modal);

      renderTripPhotoStack();
    }

    function renderTripPhotoStack() {
      var wrapper = document.getElementById('tripPhotoStackWrapper');
      var dots = document.getElementById('tripPhotoIndicators');
      if (!wrapper) return;

      var photos = window.__tempTripCreatePhotos || [];
      var total = photos.length;

      if (total === 0) {
        wrapper.innerHTML = `
          <div onclick="document.getElementById('tripPhotoFileInput').click()" style="width:100%; height:100%; border-radius:12px; border:1.5px dashed rgba(255,255,255,0.25); background:rgba(255,255,255,0.03); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(6px, 1.2vh, 10px); cursor:pointer; box-sizing:border-box; padding:12px;">
            <span style="font-size:clamp(1.6rem, 4.5vw, 2.1rem); line-height:1;"><svg viewBox="0 0 24 24" style="width:42px; height:42px;" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg></span>
            <span style="font-size:clamp(0.64rem, 1.9vw, 0.72rem); color:#cbd5e1; text-align:center; line-height:1.45;">세로 3:4 텐풍 사진 첨부 (최대 3장)<br>사진 미등록 시 등록 목적지인 경우<br>등록되어 있는 사진이 출력됩니다</span>
          </div>
        `;
        if (dots) dots.innerHTML = '';
        return;
      }

      if (window.__currentTripCreatePhotoIdx >= total) {
        window.__currentTripCreatePhotoIdx = 0;
      }

      var stackHtml = '';
      for (var i = 0; i < total; i++) {
        var offset = (i - window.__currentTripCreatePhotoIdx + total) % total;
        var scale = 1 - (offset * 0.05);
        var translateY = offset * -6;
        var zIndex = 10 - offset;
        var opacity = 1 - (offset * 0.25);

        stackHtml += `
          <div class="trip-photo-stack-card" data-card-idx="${i}" style="position:absolute; inset:0; width:100% !important; height:100% !important; border-radius:12px; overflow:hidden; border:1.5px solid rgba(255,255,255,0.2); box-shadow:0 8px 24px rgba(0,0,0,0.85); background:#070a12; transform:scale(${scale}) translateY(${translateY}px); z-index:${zIndex}; opacity:${opacity}; transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1); cursor:pointer; box-sizing:border-box;">
            <img src="${escapeHtml(tripCreatePhotoSrc(photos[i]))}" style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none;" />
            <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.6) 100%); pointer-events:none;"></div>
            
            ${offset === 0 ? `
              <div style="position:absolute; top:8px; left:8px; right:8px; display:flex; justify-content:space-between; align-items:center; z-index:5;">
                ${window.__tripCreatePhotosFromSpot ? '<span style="background:rgba(0,0,0,0.72); color:#e2e8f0; font-size:0.58rem; font-weight:800; padding:3px 7px; border-radius:8px;">박지 사진</span>' : '<span></span>'}
                <button type="button" data-okbm-idx="${Number(i)}" onclick="removeTripCreatePhoto(Number(this.dataset.okbmIdx), event)" style="width:24px; height:24px; border-radius:50%; background:rgba(0,0,0,0.85); border:1px solid rgba(255,255,255,0.3); color:#fff; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
              </div>
              <div style="position:absolute; bottom:8px; left:0; right:0; text-align:center; font-size:0.58rem; color:#cbd5e1; font-weight:800; text-shadow:0 1px 3px #000; pointer-events:none;">
                
              </div>
            ` : ''}
          </div>
        `;
      }

      wrapper.innerHTML = stackHtml;

      if (dots) {
        var dotsHtml = photos.map(function(p, idx) {
          var isActive = (idx === window.__currentTripCreatePhotoIdx);
          return `<div style="width:${isActive ? '16px' : '5px'}; height:5px; border-radius:3px; background:${isActive ? '#ffffff' : 'rgba(255,255,255,0.25)'}; transition:all 0.2s ease;"></div>`;
        }).join('');

        if (total < 5) {
          dotsHtml += `<button type="button" onclick="document.getElementById('tripPhotoFileInput').click()" style="background:rgba(255,255,255,0.08); border:1px dashed rgba(255,255,255,0.25); color:#fff; font-size:0.56rem; font-weight:800; padding:1px 6px; border-radius:10px; cursor:pointer; margin-left:6px;">+ 추가</button>`;
        }
        dots.innerHTML = dotsHtml;
      }

      bindPhotoStackSwipeGestures(wrapper);
    }

    function bindPhotoStackSwipeGestures(wrapper) {
      if (!wrapper || wrapper._stackBound) return;
      wrapper._stackBound = true;

      var startX = 0, startY = 0;
      wrapper.addEventListener('touchstart', function(e) {
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }, { passive: true });

      wrapper.addEventListener('touchend', function(e) {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        var diffX = e.changedTouches[0].clientX - startX;
        var diffY = e.changedTouches[0].clientY - startY;
        var total = (window.__tempTripCreatePhotos || []).length;
        if (total <= 1) return;

        if (Math.abs(diffX) > 25 || (Math.abs(diffX) < 10 && Math.abs(diffY) < 10)) {
          cycleTripPhotoToBack();
        }
      }, { passive: true });

      wrapper.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        var total = (window.__tempTripCreatePhotos || []).length;
        if (total > 1) {
          cycleTripPhotoToBack();
        }
      });
    }

    function cycleTripPhotoToBack() {
      var total = (window.__tempTripCreatePhotos || []).length;
      if (total <= 1) return;
      window.__currentTripCreatePhotoIdx = (window.__currentTripCreatePhotoIdx + 1) % total;
      renderTripPhotoStack();
    }

    function tripCreatePhotoSrc(url) {
      var raw = String(url || '').trim();
      if (raw.indexOf('blob:') === 0) return raw;
      return (typeof okbmSafeImageUrl === 'function') ? okbmSafeImageUrl(raw) : '';
    }

    function revokeTripPreviewUrl(url) {
      if (String(url || '').indexOf('blob:') !== 0) return;
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (window.__tripPhotoUploadJobs) delete window.__tripPhotoUploadJobs[url];
    }

    async function flushTripPhotoUploads() {
      var jobs = window.__tripPhotoUploadJobs || {};
      var pending = Object.keys(jobs).map(function(key) { return jobs[key]; }).filter(Boolean);
      if (pending.length) await Promise.all(pending);
    }

    function removeTripCreatePhoto(idx, e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (window.__tripCreatePhotosFromSpot) {
        window.__tripCreatePhotosFromSpot = false;
        window.__tripCreateUserPhotos = true;
      }
      var removed = (window.__tempTripCreatePhotos || [])[idx];
      revokeTripPreviewUrl(removed);
      window.__tempTripCreatePhotos.splice(idx, 1);
      if (window.__currentTripCreatePhotoIdx >= window.__tempTripCreatePhotos.length) {
        window.__currentTripCreatePhotoIdx = Math.max(0, window.__tempTripCreatePhotos.length - 1);
      }
      renderTripPhotoStack();
    }

    async function handleTripMultiPhotoUpload(e) {
      var files = Array.from(e.target.files || []);
      e.target.value = '';
      if (files.length === 0) return;

      var currentPhotos = window.__tempTripCreatePhotos || [];
      var MAX_PHOTOS = 5;
      var available = MAX_PHOTOS - currentPhotos.length;
      if (available <= 0) {
        showToast('사진은 최대 5장까지만 등록 가능합니다.', 'warn');
        return;
      }

      var toProcess = files.slice(0, available);
      var rejectedCount = 0;
      toProcess = toProcess.filter(function(file) {
        if (typeof window.okbmIsSupportedPhotoFile === 'function' && !window.okbmIsSupportedPhotoFile(file)) {
          rejectedCount++;
          return false;
        }
        return true;
      });
      if (rejectedCount) showToast('지원하는 파일형식이 아닙니다.', 'warn', 2200);
      if (!toProcess.length) return;

      var basePhotos = window.__tripCreatePhotosFromSpot ? [] : (window.__tempTripCreatePhotos || []).slice();
      window.__tripCreatePhotosFromSpot = false;
      window.__tripCreateUserPhotos = true;
      window.__tripPhotoUploadJobs = window.__tripPhotoUploadJobs || {};

      var previews = [];
      toProcess.forEach(function(file) {
        var preview = '';
        try { preview = URL.createObjectURL(file); } catch (eUrl) { preview = ''; }
        if (!preview) return;
        previews.push({ file: file, preview: preview });
        basePhotos.push(preview);
      });
      if (!previews.length) {
        showToast('사진 업로드에 실패했습니다. 네트워크 상태를 확인해주세요.', 'warn');
        return;
      }

      window.__tempTripCreatePhotos = basePhotos.slice(0, MAX_PHOTOS);
      window.__currentTripCreatePhotoIdx = Math.max(0, window.__tempTripCreatePhotos.length - previews.length);
      renderTripPhotoStack();
      showToast('사진이 적용되었습니다.', 'success', 1600);

      previews.forEach(function(item) {
        if ((window.__tempTripCreatePhotos || []).indexOf(item.preview) === -1) {
          revokeTripPreviewUrl(item.preview);
          return;
        }
        var job = (async function() {
          try {
            var photoBlob = typeof window.processSinglePhotoSmart === 'function'
              ? await window.processSinglePhotoSmart(item.file, { maxDim: 1200, quality: 0.82 })
              : null;
            var httpsUrl = '';
            if (photoBlob && typeof window.uploadCompressedPhotoToR2 === 'function') {
              httpsUrl = await window.uploadCompressedPhotoToR2(photoBlob, 'trip');
            }
            var list = window.__tempTripCreatePhotos || [];
            var at = list.indexOf(item.preview);
            if (at === -1) return '';
            if (httpsUrl && String(httpsUrl).indexOf('https://') === 0) {
              list[at] = httpsUrl;
              try { URL.revokeObjectURL(item.preview); } catch (eRev) {}
              renderTripPhotoStack();
              return httpsUrl;
            }
            list.splice(at, 1);
            try { URL.revokeObjectURL(item.preview); } catch (eRevFail) {}
            if (window.__currentTripCreatePhotoIdx >= list.length) {
              window.__currentTripCreatePhotoIdx = Math.max(0, list.length - 1);
            }
            renderTripPhotoStack();
            showToast('사진 업로드에 실패했습니다. 네트워크 상태를 확인해주세요.', 'warn');
            return '';
          } catch (upErr) {
            console.error('[PHOTO UPLOAD EXCEPTION]', upErr);
            return '';
          } finally {
            if (window.__tripPhotoUploadJobs) delete window.__tripPhotoUploadJobs[item.preview];
          }
        })();
        window.__tripPhotoUploadJobs[item.preview] = job;
      });
    }

    window.__tripPickerYear = 0;
    window.__tripPickerMonth = 0;
    window.__tripPickerSelectedDate = '';

    window.openTripEditModal = function(tripId) {
      var targetId = String(tripId || '').trim();
      var trip = (window.TRIP_JOINS_DATABASE || []).find(function(t) { return String(t.tripId).trim() === targetId; });
      if (!trip) {
        showToast('공고 정보를 찾을 수 없습니다.', 'warn');
        return;
      }

      openTripCreateModal();

      var titleEl = document.querySelector('#tripCreateModal .modal-app-header span, #tripCreateModal div[style*="font-size:0.92rem; font-weight:900;"] span');
      if (titleEl) titleEl.innerText = '동행 공고 수정';

      var spotInput = document.getElementById('tripInputSpot');
      var dateInput = document.getElementById('tripInputDate');
      var capSelect = document.getElementById('tripSelectMaxCapacity');
      var chatInput = document.getElementById('tripInputChatUrl');
      var descInput = document.getElementById('tripInputDesc');
      var submitBtn = document.getElementById('btnSubmitTripCreate');

      if (spotInput) spotInput.value = trip.spotName || '';
      if (dateInput) dateInput.value = trip.date || '';
      if (capSelect) capSelect.value = String(trip.maxCapacity || '4');
      if (chatInput) chatInput.value = trip.openChatUrl || '';
      if (descInput) descInput.value = trip.desc || '';

      var existPhotos = getTripPhotosList(trip);
      window.__tripCreateUserPhotos = existPhotos.length > 0;
      window.__tripCreatePhotosFromSpot = false;
      window.__tempTripCreatePhotos = existPhotos;
      window.__currentTripCreatePhotoIdx = 0;
      renderTripPhotoStack();

      if (typeof window.selectTripSpot === 'function' && trip.spotName) {
        window.selectTripSpot(trip.spotName);
      }

      if (submitBtn) {
        submitBtn.innerHTML = '<span>공고 수정 완료</span><svg viewBox="0 0 24 24" style="width:15px; height:15px; fill:none; stroke:#000000; stroke-width:2.5; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>';
        submitBtn.onclick = function() {
          window.submitTripUpdate(targetId, trip.date);
        };
      }
    };

    window.submitTripUpdate = async function(tripId, origDate) {
      var spotInput = document.getElementById('tripInputSpot');
      var dateInput = document.getElementById('tripInputDate');
      var chatInput = document.getElementById('tripInputChatUrl');
      var descInput = document.getElementById('tripInputDesc');
      var capSelect = document.getElementById('tripSelectMaxCapacity');

      var spot = spotInput ? spotInput.value.trim() : '';
      var date = dateInput ? dateInput.value.trim() : '';
      var maxCap = parseInt(capSelect ? capSelect.value : '4', 10) || 4;
      var chatUrl = chatInput ? chatInput.value.trim() : '';
      var desc = descInput ? descInput.value.trim() : '';

      if (!spot) { showToast('목적지 박지명을 입력해주세요.', 'warn'); if (spotInput) spotInput.focus(); return; }
      if (!date) { showToast('출발 날짜를 달력에서 선택해주세요.', 'warn'); if (typeof window.openTripDatePickerModal === 'function') window.openTripDatePickerModal(); return; }
      if (!chatUrl) { alert('카카오톡 오픈채팅 링크를 입력해주세요.'); if (chatInput) chatInput.focus(); return; }
      chatUrl = window.okbmSafeOpenChatUrl(chatUrl);
      if (!chatUrl) {
        alert('올바른 카카오톡 오픈채팅방 주소(open.kakao.com)를 입력해주세요.');
        if (chatInput) chatInput.focus();
        return;
      }

      var regBtn = document.getElementById('btnSubmitTripCreate');
      if (regBtn) {
        regBtn.disabled = true;
        regBtn.style.opacity = '0.6';
        regBtn.innerText = '수정 처리 중...';
      }

      await flushTripPhotoUploads();
      var photoList = await resolveTripJoinPhotos(window.__tempTripCreatePhotos, spot);
      var safeDate = date.replace(/\./g, '-');

      var updateRow = {
        spot_name: spot,
        start_date: safeDate,
        max_capacity: maxCap,
        open_chat_url: chatUrl,
        description: desc,
        photos: JSON.stringify(photoList)
      };

      try {
        if (window.supabaseClient) {
          var upRes = await window.supabaseClient.from('trips').update(updateRow).eq('id', tripId);
          if (upRes.error) {
            console.error('[SUPABASE UPDATE ERROR]', upRes.error);
            alert('수정 실패: ' + (upRes.error.message || '데이터베이스 오류'));
            if (regBtn) { regBtn.disabled = false; regBtn.style.opacity = '1'; regBtn.innerText = '공고 수정 완료'; }
            return;
          }
        }

        var localTrip = (window.TRIP_JOINS_DATABASE || []).find(function(t) { return String(t.tripId) === String(tripId); });
        if (localTrip) {
          localTrip.spotName = spot;
          localTrip.date = date;
          localTrip.maxCapacity = maxCap;
          localTrip.openChatUrl = chatUrl;
          localTrip.desc = desc;
          localTrip.photos = photoList;
        }

        var myTrips = safeGetJSON('okbm_my_created_trips', []);
        var myT = myTrips.find(function(t) { return String(t.tripId) === String(tripId); });
        if (myT) {
          Object.assign(myT, { spotName: spot, date: date, maxCapacity: maxCap, openChatUrl: chatUrl, desc: desc, photos: photoList });
          localStorage.setItem('okbm_my_created_trips', JSON.stringify(myTrips));
        }

        // [헌법 1] 일정은 RomanticVault로 읽고 써서 메모리·캐시·서버(users.my_gears.planSpots)를 함께 맞춘다.
        var vault = window.RomanticVault;
        var planSpots = Object.assign({}, (vault && typeof vault.read === 'function')
          ? (vault.read('okbm_plan_spots', {}) || {})
          : safeGetJSON('okbm_plan_spots', {}));
        if (origDate && origDate !== date && planSpots[origDate]) {
          var prevArr = Array.isArray(planSpots[origDate]) ? planSpots[origDate] : [planSpots[origDate]];
          var remaining = prevArr.filter(function(s) { return String(s.tripId || '').trim() !== String(tripId); });
          if (remaining.length > 0) planSpots[origDate] = remaining; else delete planSpots[origDate];
        }
        var targetArr = Array.isArray(planSpots[date]) ? planSpots[date] : (planSpots[date] ? [planSpots[date]] : []);
        targetArr = targetArr.filter(function(s) { return String(s.tripId || '').trim() !== String(tripId); });
        targetArr.push({ name: spot, tripId: tripId, isTrip: true, isHost: true });
        planSpots[date] = targetArr;
        if (vault && typeof vault.write === 'function') {
          vault.write('okbm_plan_spots', planSpots, true);
        } else {
          localStorage.setItem('okbm_plan_spots', JSON.stringify(planSpots));
        }

        showToast('원정대 공고가 성공적으로 수정되었습니다!', 'success');
        triggerHaptic(15);

        if (typeof window.closeTripCreateModal === 'function') window.closeTripCreateModal();
        if (typeof renderHomeTripJoinSlider === 'function') renderHomeTripJoinSlider();
        if (typeof renderTripDetailSheet === 'function') {
          var activeTrips = (window.TRIP_JOINS_DATABASE || []).filter(function(t) { return t && t.tripId; });
          renderTripDetailSheet(activeTrips);
        }
        if (typeof window.renderPlanStage === 'function') window.renderPlanStage();
      } catch (err) {
        console.error('[SUBMIT TRIP UPDATE EXCEPTION]', err);
        alert('수정 중 통신 오류가 발생했습니다.');
        if (regBtn) { regBtn.disabled = false; regBtn.style.opacity = '1'; regBtn.innerText = '공고 수정 완료'; }
      }
    };

    window.openTripDatePickerModal = function() {
      var old = document.getElementById('tripDatePickerModal');
      if (old) old.remove();

      var now = new Date();
      var curVal = document.getElementById('tripInputDate')?.value.trim();
      var parts = curVal ? curVal.match(/\d+/g) : null;

      if (parts && parts.length >= 3) {
        window.__tripPickerYear = parseInt(parts[0], 10);
        window.__tripPickerMonth = parseInt(parts[1], 10);
        window.__tripPickerSelectedDate = window.__tripPickerYear + '.' + String(window.__tripPickerMonth).padStart(2, '0') + '.' + String(parseInt(parts[2], 10)).padStart(2, '0');
      } else {
        window.__tripPickerYear = now.getFullYear();
        window.__tripPickerMonth = now.getMonth() + 1;
        window.__tripPickerSelectedDate = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
      }

      var pickerModal = document.createElement('div');
      pickerModal.id = 'tripDatePickerModal';
      pickerModal.style.cssText = 'position:fixed; inset:0; background:#0c1017; z-index:2147483660 !important; display:flex; justify-content:center; align-items:center; padding:16px; box-sizing:border-box;';
      pickerModal.onclick = function(e) { if (e.target === pickerModal) pickerModal.remove(); };

      pickerModal.innerHTML = `
        <div style="width:100%; max-width:340px; background:#0a0d14; border:1.5px solid rgba(56,189,248,0.5); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:8px; box-shadow:0 8px 24px rgba(0,0,0,0.45); box-sizing:border-box;" onclick="event.stopPropagation();">
          
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:6px;">
            <div style="font-size:0.88rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:#f59e0b; stroke-width:2.2; flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>출발 날짜 & 내 스케줄</span>
            </div>
            <button type="button" onclick="document.getElementById('tripDatePickerModal').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; height:26px;">
            <div style="display:flex; align-items:center; gap:4px;">
              <button type="button" onclick="window.changeTripPickerMonth(-1);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:22px; height:22px; border-radius:4px; font-size:0.68rem; cursor:pointer;">◀</button>
              <span id="tripPickerMonthTitle" style="font-size:0.84rem; font-weight:900; color:#38bdf8; font-family:'Space Grotesk', sans-serif;"></span>
              <button type="button" onclick="window.changeTripPickerMonth(1);" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:22px; height:22px; border-radius:4px; font-size:0.68rem; cursor:pointer;">▶</button>
            </div>
            <div style="display:flex; align-items:center; gap:6px; font-size:0.58rem; font-weight:800;">
              <span style="color:#fde047; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:8px; height:8px; fill:#fde047;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>완료</span>
              <span style="color:#34d399; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:8px; height:8px; fill:#34d399;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>계획</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:0.56rem; font-weight:800; color:#64748b; height:16px;">
            <span style="color:#f43f5e;">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span style="color:#38bdf8;">토</span>
          </div>

          <div id="tripPickerDaysGrid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:2px; text-align:center;"></div>

          <div id="tripPickerScheduleHint" style="min-height:36px; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.12); border-radius:8px; padding:6px 8px; font-size:0.68rem; color:#cbd5e1; line-height:1.4; display:flex; align-items:center;"></div>

          <div style="display:flex; gap:6px; margin-top:2px;">
            <button type="button" onclick="document.getElementById('tripDatePickerModal').remove();" style="flex:1; height:36px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; font-size:0.75rem; font-weight:800; border-radius:8px; cursor:pointer;">취소</button>
            <button type="button" onclick="window.confirmTripDateSelection();" style="flex:1.8; height:36px; background:#ffffff; color:#000000; border:none; font-size:0.80rem; font-weight:900; border-radius:8px; cursor:pointer; box-shadow:0 3px 10px rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; gap:5px;">
              <span>이 날짜로 선택</span>
              <svg viewBox="0 0 24 24" style="width:13px; height:13px; fill:none; stroke:#000000; stroke-width:2.5; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(pickerModal);
      window.renderTripDatePickerCalendar();
    };

    window.changeTripPickerMonth = function(delta) {
      var now = new Date();
      var curYear = now.getFullYear();
      var curMonth = now.getMonth() + 1;

      var nextMonth = window.__tripPickerMonth + delta;
      var nextYear = window.__tripPickerYear;
      if (nextMonth < 1) { nextMonth = 12; nextYear--; }
      else if (nextMonth > 12) { nextMonth = 1; nextYear++; }

      if (nextYear < curYear || (nextYear === curYear && nextMonth < curMonth)) {
        return;
      }

      window.__tripPickerYear = nextYear;
      window.__tripPickerMonth = nextMonth;
      window.renderTripDatePickerCalendar();
    };

    window.renderTripDatePickerCalendar = function() {
      var year = window.__tripPickerYear;
      var month = window.__tripPickerMonth;
      var titleEl = document.getElementById('tripPickerMonthTitle');
      var gridEl = document.getElementById('tripPickerDaysGrid');
      var hintEl = document.getElementById('tripPickerScheduleHint');
      if (!gridEl) return;

      if (titleEl) titleEl.innerText = year + '년 ' + month + '월';

      var now = new Date();
      now.setHours(0, 0, 0, 0);
      var todayStr = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');

      var historyList = window.interactiveHistory || safeGetJSON('okbm_packing_history', []);
      var planMemosObj = safeGetJSON('okbm_plan_memos', {}) || {};

      var firstDayIndex = new Date(year, month - 1, 1).getDay();
      var lastDay = new Date(year, month, 0).getDate();

      var daysHtml = '';
      for (var b = 0; b < firstDayIndex; b++) {
        daysHtml += '<div style="height:28px;"></div>';
      }

      for (var d = 1; d <= lastDay; d++) {
        var thisDate = new Date(year, month - 1, d);
        thisDate.setHours(0, 0, 0, 0);
        var isPast = thisDate.getTime() < now.getTime();

        var dateKey = year + '.' + String(month).padStart(2, '0') + '.' + String(d).padStart(2, '0');
        var isSelected = (dateKey === window.__tripPickerSelectedDate);
        var isToday = (dateKey === todayStr);

        var completedRecord = (historyList || []).find(function(h) {
          return h && (h.date === dateKey || (h.date && h.date.replace(/[-/]/g, '.') === dateKey));
        });
        var hasMemo = Boolean(planMemosObj[dateKey] && planMemosObj[dateKey].trim().length > 0);

        var bg = 'rgba(255,255,255,0.025)';
        var color = '#ffffff';
        var border = '1px solid rgba(255,255,255,0.06)';
        var marker = '';
        var pointerEvent = 'cursor:pointer;';

        if (isPast) {
          bg = 'rgba(255,255,255,0.01)';
          color = '#475569';
          border = '1px solid rgba(255,255,255,0.02)';
          pointerEvent = 'pointer-events:none; cursor:not-allowed; opacity:0.3;';
        } else if (isSelected) {
          bg = 'rgba(255,255,255,0.18)'; color = '#ffffff'; border = '1px solid #ffffff';
        } else if (isToday) {
          border = '1px solid rgba(255,255,255,0.4)'; color = '#ffffff';
        } else if (completedRecord) {
          marker = '<svg viewBox="0 0 24 24" style="position:absolute; bottom:2px; width:6px; height:6px; fill:#fbbf24;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
          color = '#fef08a';
        } else if (hasMemo) {
          marker = '<svg viewBox="0 0 24 24" style="position:absolute; bottom:2px; width:6px; height:6px; fill:#34d399;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
          color = '#a7f3d0';
        }

        daysHtml += `
          <div data-date-key="${dateKey}" ${isPast ? '' : 'onclick="window.selectTripPickerDate(this.dataset.dateKey);"'} style="position:relative; height:28px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Space Grotesk', sans-serif; font-size:0.75rem; font-weight:800; border-radius:6px; background:${bg}; color:${color}; border:${border}; box-sizing:border-box; ${pointerEvent}">
            ${d}
            ${marker}
          </div>
        `;
      }

      gridEl.innerHTML = daysHtml;

      if (hintEl) {
        var sDate = window.__tripPickerSelectedDate;
        var foundRec = (historyList || []).find(function(h) { return h && (h.date === sDate || (h.date && h.date.replace(/[-/]/g, '.') === sDate)); });
        var foundMemo = planMemosObj[sDate] || '';

        if (foundRec) {
          hintEl.innerHTML = '<span style="color:#fef08a; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:#fbbf24; flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>[' + sDate + '] 이미 다녀온 활동: ' + escapeHtml(foundRec.spot || '활동') + ' (' + (foundRec.weightKg || '0.00') + 'kg)</span>';
        } else if (foundMemo) {
          hintEl.innerHTML = '<span style="color:#a7f3d0; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:#34d399; flex-shrink:0;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>[' + sDate + '] 기존 계획: ' + escapeHtml(foundMemo.slice(0, 38)) + '...</span>';
        } else {
          hintEl.innerHTML = '<span style="color:#cbd5e1; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:11px; height:11px; fill:none; stroke:#cbd5e1; stroke-width:2.2; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>[' + sDate + '] 비어있는 일정입니다. 원정대 등록에 적합합니다.</span>';
        }
      }
    };

    window.selectTripPickerDate = function(dateKey) {
      window.__tripPickerSelectedDate = dateKey;
      window.renderTripDatePickerCalendar();
    };

    window.confirmTripDateSelection = function() {
      var input = document.getElementById('tripInputDate');
      if (input && window.__tripPickerSelectedDate) {
        input.value = window.__tripPickerSelectedDate;
      }
      var modal = document.getElementById('tripDatePickerModal');
      if (modal) modal.remove();
    };

    function handleTripSpotSearch(query) {
      var dropdown = document.getElementById('tripSpotDropdown');
      var clearBtn = document.getElementById('btnTripSpotClear');
      var q = (query || '').trim().toLowerCase();

      if (clearBtn) {
        clearBtn.style.display = q.length > 0 ? 'flex' : 'none';
      }

      if (!dropdown) return;

      if (!q || q.length < 1) {
        dropdown.style.display = 'none';
        return;
      }

      var pool = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots : (safeGetJSON('okbm_spots_cache', []) || []);

      var matched = pool.filter(function(s) {
        return (s.name || '').toLowerCase().includes(q) || (s.region || '').toLowerCase().includes(q);
      }).slice(0, 10);

      if (matched.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = matched.map(function(s) {
        var spotName = s.fullName || s.name;
        return `<div class="spot-dropdown-item" data-spot="${escapeHtml(spotName)}" style="cursor:pointer;">
          <span>${escapeHtml(spotName)}</span>
          <span style="font-size:0.60rem; color:#94a3b8;">${escapeHtml(s.region || '')}</span>
        </div>`;
      }).join('');
      dropdown.style.display = 'block';
    }

    window.__matchedMasterSpotData = null;

    window.clearTripSpotInput = function() {
      var input = document.getElementById('tripInputSpot');
      var clearBtn = document.getElementById('btnTripSpotClear');
      var dropdown = document.getElementById('tripSpotDropdown');
      var previewSlot = document.getElementById('tripSelectedSpotPreview');
      if (input) {
        input.value = '';
        input.focus();
      }
      if (clearBtn) clearBtn.style.display = 'none';
      if (dropdown) dropdown.style.display = 'none';
      if (previewSlot) {
        previewSlot.style.display = 'none';
        previewSlot.innerHTML = '';
      }
      window.__matchedMasterSpotData = null;
      if (!window.__tripCreateUserPhotos) {
        window.__tripCreatePhotosFromSpot = false;
        window.__tempTripCreatePhotos = [];
        window.__currentTripCreatePhotoIdx = 0;
        if (typeof renderTripPhotoStack === 'function') renderTripPhotoStack();
      }
    };

    window.selectTripSpot = function(spotName) {
      var input = document.getElementById('tripInputSpot');
      var dropdown = document.getElementById('tripSpotDropdown');
      var clearBtn = document.getElementById('btnTripSpotClear');
      var previewSlot = document.getElementById('tripSelectedSpotPreview');

      if (input) input.value = spotName;
      if (dropdown) dropdown.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'flex';

      var pool = (typeof registeredSpots !== 'undefined' && Array.isArray(registeredSpots) && registeredSpots.length > 0)
        ? registeredSpots : (safeGetJSON('okbm_spots_cache', []) || []);

      var searchKey = String(spotName || '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      var matched = pool.find(function(s) {
        var n = String(s.name || s.spot_main || s.fullName || '').replace(/[\s\(\[\]\)]/g, '').toLowerCase();
        var k = searchKey.replace(/[\s\(\[\]\)]/g, '');
        return k && (n.includes(k) || k.includes(n));
      });

      window.__matchedMasterSpotData = matched || null;
      fillTripCreatePhotosFromSpot(spotName);

      if (matched && previewSlot) {
        var regionStr = matched.cityName || matched.region || '전국';
        var elevStr = matched.elevation ? (String(matched.elevation).includes('m') ? matched.elevation : matched.elevation + 'm') : '';
        var rawSummary = matched.desc_summary || matched.desc || '';
        var cleanSummary = String(rawSummary).replace(/\\n/g, '\n');
        var viewMatch = cleanSummary.match(/\[(?:뷰\/특징|뷰|특징)\]\s*([\s\S]*?)(?=\[(?:접근\/코스|접근|코스|박지\/피칭|박지|장소\/피칭|장소|피칭|주의\/팁|주의|팁)\]|$)/i);
        var onlyViewText = viewMatch ? viewMatch[1].trim() : (cleanSummary.split(/\n\s*\n|\n(?=\[)/)[0] || '').replace(/^\[.*?\]\s*/, '').trim();

        previewSlot.innerHTML = `
          <div style="background:rgba(56,189,248,0.06); border:1px solid rgba(56,189,248,0.25); border-left:3px solid #38bdf8; border-radius:6px; padding:7px 9px; display:flex; flex-direction:column; gap:3px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.62rem; color:#38bdf8; font-weight:800; display:inline-flex; align-items:center; gap:3px;">
                <svg viewBox="0 0 24 24" style="width:10px; height:10px; fill:none; stroke:#38bdf8; stroke-width:2.2;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>등록된 장소 연동됨 (${escapeHtml(regionStr)}${elevStr ? ' · ' + escapeHtml(elevStr) : ''})</span>
              </span>
            </div>
            <div style="font-size:0.70rem; color:#cbd5e1; line-height:1.4;">
              ${escapeHtml(onlyViewText || '자연 속에서 비화식과 흔적 없는 클린 백패킹을 실천하는 추천 장소입니다.')}
            </div>
          </div>
        `;
        previewSlot.style.display = 'block';
      } else if (previewSlot) {
        previewSlot.style.display = 'none';
        previewSlot.innerHTML = '';
      }

    };

    async function submitNewTripJoin() {
      var spotInput = document.getElementById('tripInputSpot');
      var dateInput = document.getElementById('tripInputDate');
      var chatInput = document.getElementById('tripInputChatUrl');
      var descInput = document.getElementById('tripInputDesc');

      var spot = spotInput ? spotInput.value.trim() : '';
      var date = dateInput ? dateInput.value.trim() : '';
      var maxCap = parseInt(document.getElementById('tripSelectMaxCapacity')?.value, 10) || 4;
      var chatUrl = chatInput ? chatInput.value.trim() : '';
      var desc = descInput ? descInput.value.trim() : '';

      if (!spot) {
        showToast('목적지 박지명을 입력해주세요.', 'warn');
        if (spotInput) spotInput.focus();
        return;
      }

      if (!date) {
        showToast('출발 날짜를 달력에서 선택해주세요.', 'warn');
        if (typeof window.openTripDatePickerModal === 'function') {
          window.openTripDatePickerModal();
        }
        return;
      }

      var dateParts = date.match(/\d+/g);
      if (dateParts && dateParts.length >= 3) {
        var targetDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
        targetDate.setHours(0, 0, 0, 0);
        var nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);
        if (targetDate.getTime() < nowDate.getTime()) {
          showToast('오늘 이후의 날짜만 선택할 수 있습니다.', 'warn');
          if (typeof window.openTripDatePickerModal === 'function') {
            window.openTripDatePickerModal();
          }
          return;
        }
      }

      if (!chatUrl) {
        alert('카카오톡 오픈채팅 링크를 입력해주세요.\n(동행 대원들이 참여할 수 있는 필수 링크입니다)');
        if (chatInput) {
          chatInput.style.borderColor = '#f43f5e';
          chatInput.focus();
        }
        return;
      }

      var safeChatUrl = window.okbmSafeOpenChatUrl(chatUrl);
      if (safeChatUrl) {
        chatUrl = safeChatUrl;
        if (chatInput) chatInput.value = chatUrl;
      }

      if (!safeChatUrl) {
        alert('올바른 카카오톡 오픈채팅방 주소(open.kakao.com)를 입력해주세요.');
        if (chatInput) {
          chatInput.style.borderColor = '#f43f5e';
          chatInput.focus();
        }
        return;
      }

      if (chatInput) chatInput.style.borderColor = 'rgba(255,255,255,0.14)';

      var regBtn = document.getElementById('btnSubmitTripCreate') || document.querySelector('#tripCreateModal button[onclick="submitNewTripJoin()"]');
      if (regBtn) {
        regBtn.disabled = true;
        regBtn.style.opacity = '0.6';
        regBtn.innerText = '등록 처리 중...';
      }

      var profile = safeGetJSON('user_profile', null);
      var nick = (profile && profile.nickname) ? profile.nickname : (localStorage.getItem('okbm_user_nick') || '낭만백패커');
      var rawUid = profile && profile.id ? String(profile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
      if (!rawUid) {
        rawUid = 'user_' + Date.now();
        localStorage.setItem('okbm_user_id', rawUid);
      }
      var userId = (typeof window.okbmCanonicalUserId === 'function')
        ? window.okbmCanonicalUserId(rawUid)
        : ((/^(kakao_|naver_|apple_|google_|guest_|user_)/.test(rawUid)) ? rawUid : ('kakao_' + rawUid));
      
      await flushTripPhotoUploads();
      var photoList = await resolveTripJoinPhotos(window.__tempTripCreatePhotos, spot);

      var pad = function(n) { return String(n).padStart(2, '0'); };
      var d = new Date();
      var timeStr = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + '. ' + pad(d.getHours()) + ':' + pad(d.getMinutes());

      var tempTrip = {
        tripId: '',
        spotName: spot,
        date: date,
        maxCapacity: maxCap,
        openChatUrl: chatUrl,
        photos: photoList.length > 0 ? photoList : [],
        authorName: nick,
        desc: desc || '함께 안전하고 즐거운 클린 백패킹을 떠나요!',
        isClosed: false,
        isActive: 'TRUE',
        createdAt: timeStr
      };

      var realUuid = await window.syncTripToCloudSheet(tempTrip);
      if (!realUuid) {
        if (regBtn) {
          regBtn.disabled = false;
          regBtn.style.opacity = '1';
          regBtn.innerText = '원정대 등록 완료';
        }
        return;
      }

      tempTrip.tripId = realUuid;
      tempTrip.userId = userId;

      window.TRIP_JOINS_DATABASE = (window.TRIP_JOINS_DATABASE || []).filter(function(t) { return t && t.tripId !== realUuid; });
      window.TRIP_JOINS_DATABASE.unshift(tempTrip);

      triggerHaptic(15);
      if (typeof window.closeTripCreateModal === 'function') {
        window.closeTripCreateModal();
      } else {
        var modal = document.getElementById('tripCreateModal');
        if (modal) modal.remove();
        if (typeof window.unlockHomeScrollForTripModal === 'function') {
          window.unlockHomeScrollForTripModal();
        } else {
          document.body.classList.remove('trip-modal-open');
          document.body.style.top = '';
        }
      }

      showToast('원정대 공고가 등록되었습니다! 달력과 즉시 연동됩니다.', 'success');
      renderHomeTripJoinSlider();

      if (typeof window.renderPlanStage === 'function') {
        window.renderPlanStage();
      }
    }

  

    function openTripJoinListModal() {
      var old = document.getElementById('tripJoinListModal');
      if (old) old.remove();

      var list = (window.TRIP_JOINS_DATABASE || []).filter(function(t) {
        return t && t.tripId && !getTripDDayBadge(t.date).isExpired;
      }).sort(function(a, b) {
        var aClosed = Boolean(a.isClosed);
        var bClosed = Boolean(b.isClosed);
        if (aClosed !== bClosed) return aClosed ? 1 : -1;
        var pA = a.date.match(/\d+/g) || [9999,1,1];
        var pB = b.date.match(/\d+/g) || [9999,1,1];
        return new Date(pA[0], pA[1]-1, pA[2]) - new Date(pB[0], pB[1]-1, pB[2]);
      });

      var modal = document.createElement('div');
      modal.id = 'tripJoinListModal';
      modal.style.cssText = 'position:fixed; inset:0; background:#000000; z-index:1000045; display:flex; flex-direction:column; box-sizing:border-box;';

      modal.innerHTML = `
        <div style="flex-shrink:0; background:rgba(7,9,14,0.98); border-bottom:1px solid rgba(255,255,255,0.08); padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button onclick="document.getElementById('tripJoinListModal').remove()" style="background:none; border:none; color:#cbd5e1; font-size:1.1rem; cursor:pointer; padding:0; display:flex; align-items:center;">◀</button>
            <span style="font-size:0.95rem; font-weight:900; color:#fff; display:flex; align-items:center; gap:6px;">
              <svg viewBox="0 0 24 24" style="width:16px; height:16px; fill:none; stroke:#38bdf8; stroke-width:2.2; flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
              <span>전체 원정대 목록</span>
            </span>
          </div>
          <button onclick="document.getElementById('tripJoinListModal').remove(); openTripCreateModal();" style="background:#ffffff; color:#000; font-size:0.72rem; font-weight:900; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">+ 모집하기</button>
        </div>

        <div style="flex:1; overflow-y:auto; padding:12px 14px calc(24px + env(safe-area-inset-bottom, 0px)) 14px; display:flex; flex-direction:column; gap:8px; max-width:440px; margin:0 auto; width:100%; box-sizing:border-box;">
          ${list.length === 0 ? '<div style="text-align:center; color:#64748b; padding:60px 0; font-size:0.78rem;">현재 등록된 원정대 공고가 없습니다.</div>' : list.map(function(t) {
            var dBadge = getTripDDayBadge(t.date);
            var isClosed = Boolean(t.isClosed);
            var maxCap = parseInt(t.maxCapacity, 10) || 4;
            return `
              <div data-trip-id="${escapeHtml(t.tripId)}" onclick="document.getElementById('tripJoinListModal').remove(); openTripDetailModal(this.dataset.tripId);" style="background:${isClosed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.035)'}; border:1px solid ${isClosed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; opacity:${isClosed ? '0.65' : '1'};">
                <div style="flex:1; min-width:0; padding-right:8px;">
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                    <span style="font-size:0.60rem; padding:1px 5px; border-radius:3px; font-weight:800; ${dBadge.cls}">${dBadge.text}</span>
                    <span style="font-size:0.86rem; font-weight:900; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(t.spotName)}</span>
                  </div>
                  <div style="font-size:0.65rem; color:#94a3b8; font-family:var(--font-en);">${escapeHtml(t.date)} · 희망 ${maxCap}명 · ${escapeHtml(t.authorName || '방장')}</div>
                </div>
                <span style="font-size:0.68rem; font-weight:800; ${isClosed ? 'color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);' : 'color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25);'} padding:4px 8px; border-radius:6px; flex-shrink:0; display:inline-flex; align-items:center;">
                  <span>${isClosed ? '마감' : '공고보기'}</span>
                </span>
              </div>
            `;
          }).join('')}
        </div>
      `;
      document.body.appendChild(modal);
    }


    function handleGearSearchInput(val) {
      var clearBtn = document.getElementById('btnGearSearchClear');
      if (clearBtn) clearBtn.style.display = (val && val.trim().length > 0) ? 'flex' : 'none';
      if (typeof window.renderPresetGearList === 'function') {
        window.renderPresetGearList(val);
      }
    }

   function clearGearSearchInput() {
      var input = document.getElementById('gearSearchFixedInput');
      var clearBtn = document.getElementById('btnGearSearchClear');
      if (input) { input.value = ''; input.focus(); }
      if (clearBtn) clearBtn.style.display = 'none';
      if (typeof window.renderPresetGearList === 'function') {
        window.renderPresetGearList('');
      }
    }

    // 🚀 [포토 스튜디오 / 엽서 캡처 및 공유 파이프라인은 templates.js로 완전 이관 완료]

    window.showPhotoLoadingModal = function(current, total) {
      var modal = document.getElementById('globalPhotoLoadingModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalPhotoLoadingModal';
        modal.style.cssText = 'position:fixed; inset:0; background:#0c1017; z-index:3000000 !important; display:flex; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';
        modal.innerHTML = `
          <div style="width:100%; max-width:300px; background:#0e131f; border:1.5px solid #38bdf8; border-radius:16px; padding:20px 16px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; box-shadow:0 20px 50px rgba(0,0,0,0.95); box-sizing:border-box;">
            <div style="width:36px; height:36px; border:3px solid rgba(56,189,248,0.2); border-top-color:#38bdf8; border-radius:50%; animation:spinPhoto 0.8s linear infinite;"></div>
            <style>@keyframes spinPhoto{to{transform:rotate(360deg);}}</style>
            <div style="font-size:0.92rem; font-weight:900; color:#ffffff;">사진 등록 및 최적화 중...</div>
            <div id="photoLoadingProgressText" style="font-size:0.75rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif;">처리 중 (1/1)</div>
            <div style="font-size:0.65rem; color:#94a3b8; line-height:1.4;">고화질 사진을 웹 규격에 맞게<br>초고속 변환하고 있습니다.</div>
          </div>
        `;
        document.body.appendChild(modal);
      }
      modal.style.display = 'flex';
      var pText = document.getElementById('photoLoadingProgressText');
      if (pText && total) pText.innerText = '처리 중 (' + current + ' / ' + total + ')';
    };

    window.hidePhotoLoadingModal = function() {
      var modal = document.getElementById('globalPhotoLoadingModal');
      if (modal) modal.style.display = 'none';
    };

    // ⚡ 미디어 파이프라인: Canvas 1200px 압축 → R2 HTTPS만 영구 저장 (blob/data 영구 저장 금지)
    // 업로드는 romantic-sync.js의 단일 통로(okbmUploadImageBlob)로만 보낸다 (C1: 인증 토큰 첨부 전환 지점).
    window.uploadCompressedPhotoToR2 = async function(blob, prefix) {
      if (!blob) return '';
      if (typeof window.okbmUploadImageBlob !== 'function') {
        console.warn('[uploadCompressedPhotoToR2] 업로드 헬퍼가 아직 로드되지 않았습니다.');
        return '';
      }
      return window.okbmUploadImageBlob(blob, prefix);
    };

    window.okbmIsSupportedPhotoFile = function(file) {
      var type = String(file && file.type || '').toLowerCase();
      var name = String(file && file.name || '').toLowerCase();
      var typeOk = type.indexOf('jpeg') !== -1 || type.indexOf('jpg') !== -1 || type.indexOf('png') !== -1 || type.indexOf('webp') !== -1;
      var nameOk = /\.jpe?g$|\.png$|\.webp$/.test(name);
      if (type.indexOf('heic') !== -1 || type.indexOf('heif') !== -1 || type.indexOf('gif') !== -1 || type.indexOf('avif') !== -1) return false;
      if (!typeOk && /\.heic$|\.heif$|\.gif$|\.avif$/.test(name)) return false;
      return typeOk || nameOk;
    };

    window.processSinglePhotoSmart = function(file, opts) {
      opts = opts || {};
      var maxDim = Number(opts.maxDim) || 1200;
      var quality = (typeof opts.quality === 'number') ? opts.quality : 0.82;

      function encodeBitmapToJpeg(source, w, h) {
        return new Promise(function(resolve) {
          try {
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium';
            ctx.drawImage(source, 0, 0, w, h);
            if (source && typeof source.close === 'function') {
              try { source.close(); } catch (eClose) {}
            }
            canvas.toBlob(function(blob) { resolve(blob || null); }, 'image/jpeg', quality);
          } catch (err) {
            resolve(null);
          }
        });
      }

      function fitDims(w, h) {
        var maxLen = Math.max(w, h);
        if (maxLen <= maxDim) return { w: w, h: h };
        var scale = maxDim / maxLen;
        return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
      }

      async function fromBitmap(bitmap) {
        var d = fitDims(bitmap.width, bitmap.height);
        // 이미 긴 변이 maxDim 이하면 추가 createImageBitmap 없이 JPEG만 인코딩
        if (d.w === bitmap.width && d.h === bitmap.height) {
          return encodeBitmapToJpeg(bitmap, d.w, d.h);
        }
        // 축소 디코드가 실패한 기기만 여기서 한 번 더 줄인다
        try {
          var resized = await createImageBitmap(bitmap, {
            resizeWidth: d.w,
            resizeHeight: d.h,
            resizeQuality: 'medium'
          });
          if (typeof bitmap.close === 'function') {
            try { bitmap.close(); } catch (e1) {}
          }
          return encodeBitmapToJpeg(resized, d.w, d.h);
        } catch (eResize) {
          return encodeBitmapToJpeg(bitmap, d.w, d.h);
        }
      }

      function fromImageElement(img) {
        var d = fitDims(img.naturalWidth || img.width, img.naturalHeight || img.height);
        return encodeBitmapToJpeg(img, d.w, d.h);
      }

      function loadViaImage(blobOrFile) {
        return new Promise(function(resolve) {
          var url = '';
          try { url = URL.createObjectURL(blobOrFile); } catch (e) { resolve(null); return; }
          var img = new Image();
          img.onload = function() {
            URL.revokeObjectURL(url);
            fromImageElement(img).then(resolve);
          };
          img.onerror = function() {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });
      }

      function readExifOrientation(u, start) {
        if (!u || start + 14 >= u.length) return 0;
        if (u[start] !== 0x45 || u[start + 1] !== 0x78 || u[start + 2] !== 0x69 || u[start + 3] !== 0x66) return 0;
        var tiff = start + 6;
        if (tiff + 8 >= u.length) return 0;
        var le = u[tiff] === 0x49 && u[tiff + 1] === 0x49;
        function u16(o) {
          if (o + 1 >= u.length) return 0;
          return le ? (u[o] | (u[o + 1] << 8)) : ((u[o] << 8) | u[o + 1]);
        }
        function u32(o) {
          if (o + 3 >= u.length) return 0;
          return le
            ? (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16) | (u[o + 3] << 24))
            : ((u[o] << 24) | (u[o + 1] << 16) | (u[o + 2] << 8) | u[o + 3]);
        }
        var ifd = tiff + u32(tiff + 4);
        if (ifd + 2 >= u.length) return 0;
        var count = u16(ifd);
        if (count > 80) count = 80;
        for (var n = 0; n < count; n++) {
          var ent = ifd + 2 + n * 12;
          if (ent + 10 >= u.length) break;
          if (u16(ent) === 0x0112) return u16(ent + 8);
        }
        return 0;
      }

      function readEncodedSize(u) {
        if (!u || u.length < 24) return null;
        if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) {
          var pw = ((u[16] << 24) | (u[17] << 16) | (u[18] << 8) | u[19]) >>> 0;
          var ph = ((u[20] << 24) | (u[21] << 16) | (u[22] << 8) | u[23]) >>> 0;
          if (!pw || !ph) return null;
          return { w: pw, h: ph, orientation: 1 };
        }
        if (u[0] !== 0xFF || u[1] !== 0xD8) return null;
        var orientation = 1;
        var w = 0;
        var h = 0;
        var i = 2;
        while (i + 3 < u.length) {
          if (u[i] !== 0xFF) { i++; continue; }
          var marker = u[i + 1];
          if (marker === 0xFF) { i++; continue; }
          if (marker === 0xD8 || marker === 0x01) { i += 2; continue; }
          if (marker === 0xD9 || marker === 0xDA) break;
          var len = (u[i + 2] << 8) | u[i + 3];
          if (len < 2 || i + 2 + len > u.length) break;
          if (marker === 0xE1) {
            var ori = readExifOrientation(u, i + 4);
            if (ori) orientation = ori;
          }
          if ((marker === 0xC0 || marker === 0xC1 || marker === 0xC2) && len >= 8) {
            h = (u[i + 5] << 8) | u[i + 6];
            w = (u[i + 7] << 8) | u[i + 8];
          }
          i += 2 + len;
        }
        if (!w || !h) return null;
        return { w: w, h: h, orientation: orientation };
      }

      function readFileImageSize(f) {
        var blob = f;
        try {
          if (f && f.slice) blob = f.slice(0, 524288);
        } catch (eSlice) {}
        if (!blob || !blob.arrayBuffer) return Promise.resolve(null);
        return blob.arrayBuffer().then(function(buf) {
          try { return readEncodedSize(new Uint8Array(buf)); } catch (eRead) { return null; }
        }).catch(function() { return null; });
      }

      async function bitmapDownscaled(f) {
        if (typeof createImageBitmap !== 'function' || !f) return null;
        var size = null;
        try { size = await readFileImageSize(f); } catch (eSize) {}
        if (size && size.w > 0 && size.h > 0) {
          var dw = size.w;
          var dh = size.h;
          if (size.orientation >= 5 && size.orientation <= 8) {
            dw = size.h;
            dh = size.w;
          }
          if (Math.max(dw, dh) > maxDim) {
            var opts = { imageOrientation: 'from-image', resizeQuality: 'medium' };
            if (dw >= dh) opts.resizeWidth = maxDim;
            else opts.resizeHeight = maxDim;
            try { return await createImageBitmap(f, opts); } catch (eOpt) {}
          }
        } else {
          try {
            return await createImageBitmap(f, {
              imageOrientation: 'from-image',
              resizeWidth: maxDim,
              resizeQuality: 'medium'
            });
          } catch (eGuess) {}
        }
        try {
          return await createImageBitmap(f, { imageOrientation: 'from-image' });
        } catch (eOrient) {
          try { return await createImageBitmap(f); } catch (eBare) { return null; }
        }
      }

      function isLikelyHeic(f) {
        var type = String((f && f.type) || '').toLowerCase();
        var name = String((f && f.name) || '').toLowerCase();
        return type.indexOf('heic') !== -1 || type.indexOf('heif') !== -1 || /\.heic$|\.heif$/.test(name);
      }

      // iPhone 사진을 옮기며 확장자만 .jpg로 바뀐 HEIC는 type/name으로 못 잡으므로 ftyp 브랜드로 판별
      function sniffHeicContent(f) {
        var head = f;
        try {
          if (f && f.slice) head = f.slice(0, 64);
        } catch (eSlice) {}
        if (!head || !head.arrayBuffer) return Promise.resolve(false);
        return head.arrayBuffer().then(function(buf) {
          var u = new Uint8Array(buf);
          if (u.length < 16) return false;
          if (u[4] !== 0x66 || u[5] !== 0x74 || u[6] !== 0x79 || u[7] !== 0x70) return false;
          var boxLen = ((u[0] << 24) | (u[1] << 16) | (u[2] << 8) | u[3]) >>> 0;
          var end = Math.min(u.length, boxLen >= 16 ? boxLen : u.length);
          var brands = [];
          for (var o = 8; o + 4 <= end; o += 4) {
            if (o === 12) continue;
            brands.push(String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]));
          }
          if (brands.indexOf('avif') !== -1 || brands.indexOf('avis') !== -1) return false;
          return brands.some(function(b) {
            return b === 'heic' || b === 'heix' || b === 'hevc' || b === 'hevx' ||
              b === 'heim' || b === 'heis' || b === 'mif1' || b === 'msf1';
          });
        }).catch(function() { return false; });
      }

      // HEIC 변환은 격리 iframe(heic-convert.html)에서 한다. 메인 페이지 CSP는 eval을 막기 때문.
      async function viaHeicBridge(f) {
        if (typeof window.okbmHeicToJpeg !== 'function') return null;
        try {
          var safeBlob = await window.okbmHeicToJpeg(f, quality);
          if (!safeBlob) return null;
          if (typeof createImageBitmap === 'function') {
            try {
              var bmp = await createImageBitmap(safeBlob);
              return await fromBitmap(bmp);
            } catch (eBmp) {}
          }
          return await loadViaImage(safeBlob);
        } catch (err) {
          console.warn('[processSinglePhotoSmart:heic]', err);
          return null;
        }
      }

      return (async function() {
        if (!file) return null;

        // 1) 긴 변만 1200으로 줄이며 디코드. 원본 전체를 먼저 풀지 않는다.
        var bmpFast = await bitmapDownscaled(file);
        if (bmpFast) return await fromBitmap(bmpFast);

        // 2) HEIC(확장자만 바뀐 파일 포함)는 격리 iframe에서 heic-to → heic2any 순으로 변환
        var heicLike = isLikelyHeic(file) || await sniffHeicContent(file);
        if (heicLike) {
          var heicOut = await viaHeicBridge(file);
          if (heicOut) return heicOut;
        }

        // 3) Image 엘리먼트 폴백
        var imgOut = await loadViaImage(file);
        if (imgOut) return imgOut;

        // 4) Image 실패 시 HEIC 재판정 폴백
        if (!heicLike) {
          var heicRetry = await viaHeicBridge(file);
          if (heicRetry) return heicRetry;
        }
        return null;
      })();
    };

    // 🚀 [스튜디오 사진 업로드 / 캡처 / 공유 파이프라인은 templates.js로 완전 이관 완료]

   function checkIncomingDirectTab() {
      var urlParams = new URLSearchParams(window.location.search);
      var openParam = urlParams.get('open');
      var tabParam = urlParams.get('tab');
      var spotParam = urlParams.get('spot') || urlParams.get('q');
      var idParam = urlParams.get('id');

      var releaseGuard = function() {
        document.documentElement.classList.remove('direct-modal-pending');
      };

      if (spotParam) {
        try { sessionStorage.setItem('okbm_pending_map_spot', spotParam); } catch (e) {}
      }
      if (idParam) {
        try { sessionStorage.setItem('okbm_pending_map_id', idParam); } catch (e) {}
      }

      if (openParam === 'map' || tabParam === 'map') {
        var mapParams = [];
        if (spotParam) mapParams.push('spot=' + encodeURIComponent(spotParam));
        if (idParam) mapParams.push('id=' + encodeURIComponent(idParam));
        var targetMapUrl = 'map.html' + (mapParams.length ? '?' + mapParams.join('&') : '');
        sessionStorage.setItem('okbm_entered_via_index', '1');
        window.location.replace(targetMapUrl);
        return;
      }

      if (spotParam || idParam) {
        var mapParams = [];
        if (spotParam) mapParams.push('spot=' + encodeURIComponent(spotParam));
        if (idParam) mapParams.push('id=' + encodeURIComponent(idParam));
        sessionStorage.setItem('okbm_entered_via_index', '1');
        window.location.replace('map.html' + (mapParams.length ? '?' + mapParams.join('&') : ''));
        return;
      }

      if (tabParam === 'history' || openParam === 'history') {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (typeof openHistoryModal === 'function') {
          openHistoryModal();
          releaseGuard();
        } else {
          var pollCount = 0;
          var histPoll = setInterval(function() {
            pollCount++;
            if (typeof openHistoryModal === 'function') {
              clearInterval(histPoll);
              openHistoryModal();
              releaseGuard();
            } else if (pollCount > 20) {
              clearInterval(histPoll);
              releaseGuard();
            }
          }, 16);
        }
      } else if (openParam === 'basecamp' || openParam === 'plan' || tabParam === 'plan') {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (typeof window.okbmMountPlanModalShell === 'function') {
          window.okbmMountPlanModalShell();
        }
        // openPlanModal은 index.html 부트로더의 bindLazy로 항상 함수다(필요하면 plan을 받아서 연다)
        Promise.resolve(openPlanModal('calendar')).then(releaseGuard).catch(releaseGuard);
      } else if (openParam === 'report' || tabParam === 'report') {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (typeof openUserProfileModal === 'function') {
          openUserProfileModal();
          releaseGuard();
        } else {
          var pollCountReport = 0;
          var reportPoll = setInterval(function() {
            pollCountReport++;
            if (typeof openUserProfileModal === 'function') {
              clearInterval(reportPoll);
              openUserProfileModal();
              releaseGuard();
            } else if (pollCountReport > 20) {
              clearInterval(reportPoll);
              releaseGuard();
            }
          }, 16);
        }
      } else {
        releaseGuard();
      }
    }

    function refreshMainBannerWeight() {
      var bannerKg = document.getElementById('mainBannerKgText');
      if (!bannerKg) return;
      if (typeof isUserLoggedIn === 'function' && !isUserLoggedIn()) {
        bannerKg.innerText = '0.00 kg';
        return;
      }
      var savedGears = safeGetJSON('okbm_selected_gears_multi', {});
      var totalGrams = 0, totalCount = 0;
      Object.keys(savedGears).forEach(function(catId) {
        (savedGears[catId] || []).forEach(function(it) {
          totalGrams += Number(it.weight || 0);
          totalCount++;
        });
      });
      var totalKg = (totalGrams / 1000).toFixed(2);
      bannerKg.innerText = totalKg + ' kg';
    }

    window.__okbmHealthCheck = function() {
      var hasVault = !!(window.RomanticVault && typeof window.RomanticVault.write === 'function');
      var hasSupabase = !!(window.supabaseClient || (window.SUPABASE_URL && window.SUPABASE_ANON_KEY));
      var spotsCount = Array.isArray(window.registeredSpots) ? window.registeredSpots.length : 0;
      var planHealth = typeof window.__okbmPlanHealthCheck === 'function' ? window.__okbmPlanHealthCheck() : null;
      var histHealth = typeof window.__okbmHistoryHealthCheck === 'function' ? window.__okbmHistoryHealthCheck() : null;
      return {
        vaultReady: hasVault,
        supabaseReady: hasSupabase,
        masterSpotsCount: spotsCount,
        plan: planHealth,
        history: histHealth,
        epoch: localStorage.getItem('okbm_client_epoch') || 'none',
        status: (hasVault && hasSupabase && spotsCount > 0) ? 'HEALTHY' : 'CHECK_REQUIRED'
      };
    };

  async function loadPortalSpotData(isForce) {
      var cachedSpots = (typeof window.okbmReadSpotsCache === 'function')
        ? window.okbmReadSpotsCache()
        : (safeGetJSON('okbm_spots_cache', []) || safeGetJSON('okbm_master_spots', []));
      if (!(Array.isArray(cachedSpots) && cachedSpots.length > 0) && window.__okbmSpotsIdbReady) {
        try { cachedSpots = await window.__okbmSpotsIdbReady; } catch (e) { cachedSpots = cachedSpots || []; }
      }
      if (Array.isArray(cachedSpots) && cachedSpots.length > 0) {
        registeredSpots = typeof window.stripSpotDetailFields === 'function'
          ? cachedSpots.map(window.stripSpotDetailFields)
          : cachedSpots;
        if (typeof renderSecretSpotTrailerRail === 'function') {
          renderSecretSpotTrailerRail();
        }
        if (!isForce) return;
      }

      try {
        var supaSpots = null;
        var mapSelect = window.SPOTS_MAP_SELECT || 'id,region,cityName,spot_main,spot_sub,fullName,elevation,campsite_lat,campsite_lng,terrain,trailhead_name,difficulty,distance_km,droneStatus,course_type,author,user_id,created_at,view_brief';

        if (typeof window.fetchMasterSpotsFromSupabase === 'function') {
          var fetched = await window.fetchMasterSpotsFromSupabase(!!isForce);
          if (Array.isArray(fetched) && fetched.length > 0) {
            registeredSpots = fetched;
            if (typeof renderSecretSpotTrailerRail === 'function') {
              renderSecretSpotTrailerRail();
            }
            return;
          }
        }

        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          var res = await (typeof window.okbmPublicFetch === 'function'
            ? window.okbmPublicFetch(window.SUPABASE_URL + '/rest/v1/spots?select=' + encodeURIComponent(mapSelect) + '&order=id.asc')
            : fetch(window.SUPABASE_URL + '/rest/v1/spots?select=' + encodeURIComponent(mapSelect) + '&order=id.asc', {
            headers: {
              'apikey': window.SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY,
              'Content-Type': 'application/json'
            }
          }));
          if (res.ok) {
            var data = await res.json();
            if (Array.isArray(data) && data.length > 0) supaSpots = data;
          }
        }

        if (Array.isArray(supaSpots) && supaSpots.length > 0) {
          registeredSpots = supaSpots.map(function(row) {
            if (typeof window.normalizeSpotMapRow === 'function') {
              var n = window.normalizeSpotMapRow(row);
              if (!n) return null;
              return n;
            }
            var sMain = (row.spot_main || row.name || row.fullName || row.fullname || '').trim();
            var sCity = (row.cityName || row.city_name || row.region || '전국').trim();
            var tArr = Array.isArray(row.terrain) ? row.terrain : (typeof row.terrain === 'string' ? row.terrain.split(',').map(function(t){ return t.trim(); }).filter(Boolean) : []);
            return {
              id: String(row.id || sMain).trim(),
              name: sMain,
              spot_main: sMain,
              fullName: (row.fullName || row.fullname || row.full_name || '').trim() || sMain,
              cityName: sCity,
              region: sCity,
              elevation: String(row.elevation || '').trim(),
              difficulty: String(row.difficulty || '3').trim(),
              distance: row.distance_km || row.distance || '',
              terrain: tArr,
              desc: String(row.view_brief || row.desc_summary || row.desc || '').trim(),
              desc_summary: String(row.view_brief || row.desc_summary || row.desc || '').trim(),
              view_brief: String(row.view_brief || '').trim(),
              mediaUrls: row.mediaUrls || '',
              lat: row.campsite_lat || row.lat || '',
              lng: row.campsite_lng || row.lng || ''
            };
          }).filter(function(s) { return s && s.name && String(s.name).length > 0; });

          if (registeredSpots.length > 0) {
            if (typeof window.persistLightweightSpotsCache === 'function') {
              window.persistLightweightSpotsCache(registeredSpots);
            }
            if (typeof renderSecretSpotTrailerRail === 'function') {
              renderSecretSpotTrailerRail();
            }
          }
        }
      } catch (e) {
        console.warn('[loadPortalSpotData]', e);
      }
    }
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof updateHeaderAuthUI === 'function') {
        updateHeaderAuthUI();
      }

      checkIncomingDirectTab();
      var heroBoot = initDynamicHeroAndFeeds();
      refreshMainBannerWeight();
      renderVideoCurationSlider();
      renderHomeTripJoinSlider();

      Promise.resolve(heroBoot).catch(function() {}).then(function() {
        if (typeof window.__okbmNotifyHeroReady === 'function') window.__okbmNotifyHeroReady();
      });
      Promise.resolve(loadPortalSpotData()).catch(function() {}).then(function() {
        if (typeof window.__okbmNotifySpotsReady === 'function') window.__okbmNotifySpotsReady();
      });

      var scheduleHeavyTasks = window.requestIdleCallback || function(cb) { setTimeout(cb, 120); };
      scheduleHeavyTasks(function() {
        loadFeaturedVideosFromSupabase();
        loadTripsFromSupabase();
        if (typeof trackDailyVisit === 'function') trackDailyVisit();
      });
    });
  