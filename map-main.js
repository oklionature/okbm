// 지도 페이지 본문 스크립트. 예전 map.html 인라인 <script>(약 380KB)를 그대로 옮겼다(FILE_AUDIT F7).
// 같은 자리에서 동기(<script src>, defer 없음)로 실행되므로 실행 순서·전역 선언은 인라인 때와 같다.
// 이 파일을 고치면 map.html의 map-main.js?v= 를 올리고, on* 핸들러 문자열을 바꿨다면 node scripts/csp-extract.mjs --write.
       // 🧰 [공통 유틸 1순위 선언 - ReferenceError 100% 영구 방어]
      // 🛡️ [성능 패치] Map 기반 LRU 캐시 유틸
      function limitedMapSet(map, key, value, maxSize) {
        maxSize = maxSize || 100;
        map.set(key, value);
        if (map.size > maxSize) {
          var firstKey = map.keys().next().value;
          map.delete(firstKey);
        }
      }
      function limitedObjSet(obj, key, value, maxSize) {
        maxSize = maxSize || 100;
        obj[key] = value;
        var keys = Object.keys(obj);
        if (keys.length > maxSize) delete obj[keys[0]];
      }
      window.limitedMapSet = limitedMapSet;
      window.limitedObjSet = limitedObjSet;
      // 🛡️ [구조 개선] DOM-JS 순환 참조 방지를 위한 WeakMap
      var __spotDataMap = new WeakMap();

      function setMobileSidebarCollapsed(collapsed) {
        isSidebarCollapsed = !!collapsed;
        var sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed', isSidebarCollapsed);
        if (typeof updateDockSidebarText === 'function') updateDockSidebarText(!isSidebarCollapsed);
      }

      window.navigateToDockTab = function(tabName) {
        var oldModal = document.getElementById('mapSpotFeedDetailModal');
        if (oldModal) oldModal.remove();

        if (tabName === 'map') {
          setMobileSidebarCollapsed(true);
          if (typeof closeMobileBottomSheet === 'function') closeMobileBottomSheet();
          if (typeof closePcSlidingDrawer === 'function') closePcSlidingDrawer();
          return;
        }

        var routes = {
          router: 'index.html',
          plan: 'index.html?open=plan',
          history: 'index.html?open=history',
          report: 'index.html?open=report'
        };

        var targetUrl = routes[tabName] || 'index.html';
        window.smoothNavigate(targetUrl);
      };

      // opts.message: 이번 상황에 맞는 안내(romantic-sync.js openLoginModal과 같은 약속). 없으면 기본 문구.
      window.openLoginModal = function(opts) {
        try { if (typeof ensureMyReportAndAuthModalsInDOM === 'function') ensureMyReportAndAuthModalsInDOM(); } catch (e) {}
        var msgEl = document.getElementById('loginModalMessage');
        if (msgEl) {
          msgEl.textContent = (opts && typeof opts === 'object' && opts.message)
            ? String(opts.message)
            : '로그인후 낭만루트의 모든 기능을 이용하실수 있습니다.';
        }
        var overlay = document.getElementById('loginModalOverlay');
        if (overlay) {
          overlay.style.setProperty('display', 'flex', 'important');
        } else {
          showToast('🔒 로그인이 필요한 기능입니다.');
        }
      };

      window.closeLoginModal = function() {
        var overlay = document.getElementById('loginModalOverlay');
        if (overlay) overlay.style.display = 'none';
      };

      window.smoothNavigate = function(url, e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var oldModal = document.getElementById('mapSpotFeedDetailModal');
        if (oldModal) oldModal.remove();

        var currentPath = window.location.pathname;
        var targetPath = url.split('?')[0];

        if (targetPath.includes('map.html') && currentPath.includes('map.html')) {
          if (typeof handleSmartResetClick === 'function') handleSmartResetClick();
          return;
        }

        if (window.__okbmPageLeaving) return;
        window.__okbmPageLeaving = true;
        document.documentElement.classList.add('okbm-page-leaving');
        setTimeout(function() {
          // 창을 띄운 채 떠나면 쌓아 둔 뒤로가기 칸 자리에 새 페이지를 넣는다(romantic-sync.js okbmLeavePage)
          if (typeof window.okbmLeavePage === 'function') window.okbmLeavePage(url);
          else window.location.assign(url);
        }, 180);
      };

      window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
          document.body.classList.remove('page-leave');
          document.body.style.pointerEvents = 'auto';
          document.body.style.opacity = '1';
        }
        if (typeof updateHeaderAuthUI === 'function') {
          updateHeaderAuthUI();
        }
      });

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
          var item = (key === 'okbm_global_spot_views')
            ? (sessionStorage.getItem(key) || localStorage.getItem(key))
            : localStorage.getItem(key);
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

      var triggerHaptic = window.triggerHaptic = window.triggerHaptic || function(duration) {
        if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
          try {
            if (navigator.userActivation ? navigator.userActivation.hasBeenActive : true) {
              navigator.vibrate(duration || 12);
            }
          } catch (e) { console.warn('[map.html:triggerHaptic]', e); }
        }
      };

      // 🌐 [상수 및 환경 설정]
      window.CURRENT_VERSION = "6.2ver Final Master";
      window.KAKAO_APP_KEY = window.KAKAO_APP_KEY || "557f5de0f6391a2419bc5592e6a9c9c1";
      
      var BLOCKED_SPOT_IDS = new Set(['183', '205', '208', '209', '210', '211']);
      window.okbmBlockedSpotIds = BLOCKED_SPOT_IDS;
      var NATIONWIDE_CENTER = { lat: 35.85, lng: 127.75 };
      var NATIONWIDE_LEVEL = 13;
      var map = null, geocoder = null, globalClusterer = null, visibleClusters = [];

     // 📦 [데이터 배열 안전 초기화 & 구글 시트 마스터 직통 수급 엔진]
      var rawCachedSpots = (typeof window.okbmReadSpotsCache === 'function')
        ? window.okbmReadSpotsCache()
        : safeGetJSON('okbm_spots_cache', []);
      var isCacheValid = Array.isArray(rawCachedSpots) && rawCachedSpots.length > 0 && rawCachedSpots[0].lat && rawCachedSpots[0].lng;
      var spots = isCacheValid ? rawCachedSpots : [];
      window.spots = spots;
      var userBookmarks = new Set((safeGetJSON('okbm_bookmarks', []) || []).map(function(s) { return String(s).trim(); }));
      var userVisited = new Set((safeGetJSON('okbm_visited', []) || []).map(function(s) { return String(s).trim(); }));
      var userMemos = safeGetJSON('okbm_memos', {}) || {};
      window.userBookmarks = userBookmarks;
      window.userVisited = userVisited;
      window.userMemos = userMemos;

      window.addEventListener('okbm_bookmark_changed', function(e) {
        var rawB = (e && e.detail && Array.isArray(e.detail.bookmarks)) ? e.detail.bookmarks : safeGetJSON('okbm_bookmarks', []);
        userBookmarks = new Set(rawB.map(function(s) { return String(s).trim(); }));
        window.userBookmarks = userBookmarks;
        if (typeof renderSubChips === 'function') renderSubChips();
        if (typeof updateLODLabels === 'function') updateLODLabels();
      });

      window.addEventListener('okbm_visited_changed', function(e) {
        var rawV = (e && e.detail && Array.isArray(e.detail.visited)) ? e.detail.visited : safeGetJSON('okbm_visited', []);
        userVisited = new Set(rawV.map(function(s) { return String(s).trim(); }));
        window.userVisited = userVisited;
        if (typeof renderSubChips === 'function') renderSubChips();
        if (typeof updateLODLabels === 'function') updateLODLabels();
      });

      // 탭 복귀 등으로 서버 값을 새로 받은 뒤: 지도 페이지가 따로 들고 있는 메모도 최신 값으로 맞춘다.
      window.addEventListener('okbm_user_data_refreshed', function() {
        var vault = window.RomanticVault;
        var memos = (vault && typeof vault.read === 'function') ? vault.read('okbm_memos', {}) : safeGetJSON('okbm_memos', {});
        userMemos = (memos && typeof memos === 'object') ? memos : {};
      });

      function mapTo10RegionName(regionStr) {
        var r = String(regionStr || '').trim();
        if (r === '서울' || r === '인천' || r === '서울/인천' || r === '서울인천') return '서울/인천';
        if (r === '경기' || r === '경기도') return '경기';
        if (r === '강원' || r === '강원도' || r === '강원특별자치도') return '강원';
        if (r === '충북' || r === '충청북도') return '충북';
        if (r === '충남' || r === '충청남도' || r === '대전' || r === '세종') return '충남';
        if (r === '전북' || r === '전라북도' || r === '전북특별자치도') return '전북';
        if (r === '전남' || r === '전라남도' || r === '광주') return '전남';
        if (r === '경북' || r === '경상북도' || r === '대구') return '경북';
        if (r === '경남' || r === '경상남도' || r === '부산' || r === '울산') return '경남';
        if (r === '제주' || r === '제주도' || r === '제주특별자치도') return '제주';
        if (["서울/인천", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"].indexOf(r) !== -1) return r;
        return '';
      }
      function normalizeTo10Regions(regionStr, fallbackRegion) {
        return mapTo10RegionName(regionStr) || mapTo10RegionName(fallbackRegion) || '경기';
      }

      async function loadSpotsMasterEngine() {
        if (window.__isLoadingSpotsMaster) return;
        window.__isLoadingSpotsMaster = true;

        try {
          // romantic-sync.js(defer)가 실행된 뒤라야 로그인 여부와 회원 토큰을 안다.
          // 회원은 좌표까지 받고, 비회원은 좌표 없는 목록 + 대략 핀을 받는다(H9). 핀은 확대하면 refineGuestPins가 정확히 바꾼다.
          if (typeof window.fetchMasterSpotsFromSupabase !== 'function' && document.readyState === 'loading') {
            await new Promise(function(resolve) { document.addEventListener('DOMContentLoaded', resolve, { once: true }); });
          }
          var rows;
          if (typeof window.fetchMasterSpotsFromSupabase === 'function') {
            // 기기에 저장해 둔 목록을 쓰고, 서버 판 번호(H14)가 바뀌었을 때만 새로 받는다.
            rows = await window.fetchMasterSpotsFromSupabase();
            // 받기에 실패해 비회원 때 대략 좌표 목록만 남았으면 회원 지도에는 쓰지 않는다.
            if (typeof window.okbmSpotListFitsViewer === 'function' && !window.okbmSpotListFitsViewer(rows)) return;
          } else if (typeof window.okbmFetchSpotRows === 'function') {
            rows = await window.okbmFetchSpotRows();
          } else {
            var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
            var targetKey = window.SUPABASE_ANON_KEY || '';
            var mapSelect = window.SPOTS_MAP_SELECT || 'id,region,cityName,spot_main,spot_sub,fullName,elevation,campsite_lat,campsite_lng,terrain,trailhead_name,difficulty,distance_km,droneStatus,course_type,author,user_id,created_at,view_brief:view_brief_short,camp_status,camp_status_note,camp_status_at';
            var res = await fetch(targetUrl + '/rest/v1/spots?select=' + encodeURIComponent(mapSelect) + '&order=id.asc', {
              headers: { 'apikey': targetKey, 'Authorization': 'Bearer ' + targetKey, 'Content-Type': 'application/json' }
            });
            if (!res.ok) return;
            rows = await res.json();
          }
          if (!Array.isArray(rows) || rows.length === 0) return;

          var validSpots = [];
          rows.forEach(function(row, idx) {
            var spotId = String(row.id || (idx + 1)).trim();
            if (BLOCKED_SPOT_IDS.has(spotId)) return;

            var normalized = (typeof window.normalizeSpotMapRow === 'function')
              ? window.normalizeSpotMapRow(row)
              : null;
            if (!normalized) {
              var rawLat = row.campsite_lat !== undefined && row.campsite_lat !== null ? row.campsite_lat : row.lat;
              var rawLng = row.campsite_lng !== undefined && row.campsite_lng !== null ? row.campsite_lng : row.lng;
              var lat = parseFloat(rawLat) || 0;
              var lng = parseFloat(rawLng) || 0;
              if (!lat || !lng) return;
              if (lat > 100 && lng < 50 && lng > 0) {
                var tmp = lat;
                lat = lng;
                lng = tmp;
              }
              var name = String(row.spot_main || row.name || '').trim();
              var sub = String(row.spot_sub || '').trim();
              var sheetRegion = String(row.region || '경기').trim();
              var sheetCity = String(row.cityName || row.city_name || '').trim();
              var finalRegion = normalizeTo10Regions(sheetRegion);
              var finalCity = sheetCity || finalRegion;
              var derivedFullName = row.fullName || row.fullname || (finalCity ? '[' + finalCity + '] ' + name + (sub ? ' (' + sub + ')' : '') : (sub ? name + ' (' + sub + ')' : name));
              var tArr = Array.isArray(row.terrain) ? row.terrain : (typeof row.terrain === 'string' ? row.terrain.split(',').map(function(t){ return t.trim(); }).filter(Boolean) : ['데크']);
              normalized = {
                id: spotId,
                name: name,
                spot_main: name,
                spot_sub: sub,
                fullName: derivedFullName,
                lat: lat,
                lng: lng,
                elevation: String(row.elevation || '').trim(),
                trailhead_name: String(row.trailhead_name || '').trim(),
                courseType: String(row.course_type || '일반').trim(),
                terrain: tArr,
                difficulty: String(row.difficulty || '3').trim(),
                distance: String(row.distance_km || row.distance || '').trim(),
                droneStatus: String(row.droneStatus || row.drone_status || '').trim(),
                gpxUrl: '',
                region: finalRegion,
                cityName: finalCity,
                author: String(row.author || row.nickname || '').trim(),
                nickname: String(row.author || row.nickname || '').trim(),
                user_id: String(row.user_id || row.userId || '').trim(),
                userId: String(row.user_id || row.userId || '').trim(),
                desc: String(row.view_brief || '').trim(),
                desc_summary: String(row.view_brief || '').trim(),
                view_brief: String(row.view_brief || '').trim(),
                camp_status: String(row.camp_status || '').trim(),
                camp_status_note: String(row.camp_status_note || '').trim(),
                camp_status_at: row.camp_status_at || null,
                searchCount: 0,
                sheetIndex: idx,
                created_at: row.created_at || null
              };
            } else {
              if (!normalized.lat || !normalized.lng) return;
              normalized.id = spotId;
              normalized.region = normalizeTo10Regions(normalized.region);
              if (!normalized.cityName) normalized.cityName = normalized.region;
              normalized.searchCount = 0;
              normalized.sheetIndex = idx;
              normalized.gpxUrl = normalized.gpxUrl || '';
              if (!normalized.created_at) normalized.created_at = row.created_at || null;
            }

            if (Number(row.__pinCell) > 0) normalized.__pinCell = Number(row.__pinCell);
            normalized.trailhead_addr = '';
            normalized.entryPoint = '';
            if (!normalized.desc_summary && !normalized.desc) {
              normalized.desc_summary = '';
              normalized.desc = '';
            }
            normalized.authorSnsUrl = '';
            normalized.__detailLoaded = false;

            validSpots.push(normalized);
          });

          if (validSpots.length > 0) {
            spots = validSpots;
            window.spots = spots;
            if (typeof window.persistLightweightSpotsCache === 'function') {
              window.persistLightweightSpotsCache(spots);
            }
            updateNewSpotFlags(spots);
            renderSubChips();
            if (typeof renderSpots === 'function') renderSpots(true);
            if (map && typeof checkUrlParamSpotFocus === 'function') checkUrlParamSpotFocus();
            // 확대해 둔 상태에서 새 목록(대략 좌표)을 받았으면 지금 범위를 다시 정확히
            if (typeof scheduleGuestPinRefine === 'function') scheduleGuestPinRefine();
          }
        } catch (e) {
          console.warn('[map.html:loadSpotsMasterEngine]', e);
        } finally {
          window.__isLoadingSpotsMaster = false;
        }
      }

      loadSpotsMasterEngine();
      (function hydrateMapSpotsFromIdb() {
        var apply = function(list) {
          if (spots && spots.length > 0) return;
          if (!Array.isArray(list) || !list.length || !list[0] || !list[0].lat) return;
          spots = list;
          window.spots = spots;
          if (typeof updateNewSpotFlags === 'function') updateNewSpotFlags(spots);
          if (typeof renderSubChips === 'function') renderSubChips();
          if (typeof renderSpots === 'function') renderSpots();
        };
        var bind = function() {
          if (window.__okbmSpotsIdbReady && typeof window.__okbmSpotsIdbReady.then === 'function') {
            window.__okbmSpotsIdbReady.then(apply);
          } else if (typeof window.okbmSpotsIdbGet === 'function') {
            window.okbmSpotsIdbGet(window.OKBM_SPOTS_IDB_KEY || 'okbm_master_spots').then(apply);
          }
        };
        if (window.__okbmSpotsIdbReady || typeof window.okbmSpotsIdbGet === 'function') bind();
        else document.addEventListener('DOMContentLoaded', bind);
      })();
      // 🗺️ 지도 마커 / 오버레이 / UI 상태 전역 변수
      var spotNativeMarkerMap = new Map();
      var spotLabelOverlayMap = new Map();
      var currentActiveSpot = null;
      var isAdminMode = false;
      var isPickingLocationMode = false;
      var modalPendingData = { lat: 0, lng: 0, address: '' };
      var modalPendingCourseType = '일반';
      var modalMode = 'ADD';
      var modalEditIndex = -1;
      var tempPickedMarker = null;
      var tempSearchMarker = null;
      var userLocationOverlay = null;
      var currentMapLayerState = 0;
      var isSidebarCollapsed = true;

      var currentMasterTab = 'REGION';
      var currentRegionFilter = 'ALL';
      var currentTerrainFilter = 'ALL';
      var currentCourseFilter = 'ALL';
      var currentMyFilter = 'ALL';

      var currentHudFilterDiff = 'ALL';
      var currentHudFilterStatus = 'ALL';
      var currentHudFilterTerrain = 'ALL';

      var currentGpxPolyline = null;
      var activeGpxSpotId = null;
      var pendingUnlockSpotId = null;
      

      // ✨ 28종 확정 100% SVG 벡터 라이브러리
      const ICONS = {
        AUTH: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; margin-right:3px; display:inline-block; vertical-align:-1px;"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`,
        MEMBER: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#6ee7b7;"><circle cx="10" cy="8" r="4"/><path d="M3 20c0-3.5 3-6 7-6"/><circle cx="17" cy="16" r="3.5" fill="#10b981"/><path d="M15 16l1.5 1.5 3-3" stroke="#fff"/></svg>`,
        BACKPACK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><rect x="4" y="2" width="16" height="5" rx="2.5"/><path d="M8 2v5M16 2v5M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M12 7l-4 4M12 7l4 4M8 15h8v4H8z"/></svg>`,
        TALK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
        FAST: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        
        CAMP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M3 19C4 9 9 4 12 4s8 5 9 15z"/><path d="M12 4v15M3 19h18M7 19c2-5 3-9 5-15M17 19c-2-5-3-9-5-15"/></svg>`,
        MOUNTAIN: `<svg viewBox="0 0 24 24" class="ui-icon" style="color:#10b981;"><polygon points="2 20 8.5 7 15 17 22 20 2 20" fill="rgba(16,185,129,0.45)" stroke="#10b981" stroke-width="1.6"/><polygon points="8.5 7 10.5 11 6.5 11" fill="#6ee7b7"/><polygon points="17 11 19 14.5 15 14.5" fill="#a7f3d0"/></svg>`,
        PIN: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>`,
        HIKING: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M4 2l16 20M20 2L4 22M3 19h4M17 19h4M3 5h3M18 5h3"/></svg>`,
        DRONE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><rect x="9" y="9" width="6" height="6" rx="1.5"/><path d="M9 9L4 4M15 9l5-5M9 15l-5 5M15 15l5 5"/><circle cx="4" cy="4" r="2.5"/><circle cx="20" cy="4" r="2.5"/><circle cx="4" cy="20" r="2.5"/><circle cx="20" cy="20" r="2.5"/></svg>`,
        
        DECK: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M3 7h18M3 12h18M3 17h18M7 3v18M17 3v18" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
        ROCK: `<svg viewBox="0 0 24 24" class="ui-icon"><polygon points="4 20 2 12 8 4 17 6 22 14 19 20 4 20" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
        SOIL: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M12 2L4 18h16L12 2z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
        BEACH: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M2 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2M2 20c3 0 3-2 6-2s3 2 6 2 3-2 6-2" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
        ISLAND: `<svg viewBox="0 0 24 24" class="ui-icon" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20c3-1 6-1 9 0 3 1 6 1 9 0"/><path d="M4 19.5c1.8-4.2 5.5-6.5 10.5-4.2"/><path d="M14.5 15.3c-.3-3.8-.8-7-2-9.3"/><path d="M12.5 6c-2.2-.2-4 1.2-4.5 2.8M12.5 6c1.8-1.5 4-.8 5 .8M12.5 6c.8 2 2.2 3.2 3.8 3.5"/></svg>`,
        VALLEY: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M3 4l7 16M21 4l-7 16" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
        CAVE: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M4 19h16c0-7-3.5-13-8-13S4 12 4 19z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`,
        HEART: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>`,
        FLAG: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,

        SUNSET: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#fed7aa;"><path d="M2 16c4-1.5 7-1.5 10 0s6 1.5 10 0M2 20c4-1.5 7-1.5 10 0s6 1.5 10 0"/><path d="M7 16a5 5 0 0 1 10 0"/><path d="M12 3v5M6 7l2 2M18 7l-2 2"/></svg>`,
        TEMP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
        WIND: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#6ee7b7;"><path d="M4 8h12a3 3 0 1 0-3-3M2 13h16a3 3 0 1 1-3 3M6 18h9a2 2 0 1 0-2-2"/></svg>`,

        LOCK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#fde047;"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
        UNLOCK: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#6ee7b7;"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/></svg>`,
        COPY: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M8 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2z"/><path d="M16 5V3a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>`,
        TIP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#fde047;"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>`,
        SHARE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>`,
        ROADVIEW: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
        NAV: `<svg viewBox="0 0 24 24" class="ui-icon"><polygon points="3 11 22 2 13 21 11 13 3 11" fill="currentColor"/></svg>`,
        DIST: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M4 19L19 4M4 19h6M4 19v-6M19 4h-6M19 4v6" stroke="currentColor" stroke-width="1.8"/></svg>`,

        VIEW_CARD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#38bdf8;"><path d="M3 17h18M2 21h20"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M12 4v4M4.9 7.9l2.8 2.8M19.1 7.9l-2.8 2.8M2 13h4M18 13h4"/></svg>`,
        TRAIL_CARD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#2dd4bf;"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><path d="M9 3v15M15 6v15"/><path d="M6 14c3-2 6 2 9 0" stroke-dasharray="2 2"/></svg>`,
        PITCH_CARD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#10b981;"><path d="M12 2L2 20h20L12 2z"/><path d="M12 2v18M7 20l5-9 5 9"/></svg>`,
        ALERT_CARD: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#f59e0b;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        BAN_LNT: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#f43f5e;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
        MEMO: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:#2dd4bf;"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18"/><circle cx="11" r="1.5" fill="currentColor"/></svg>`,
        
        BACKUP: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        RESTORE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
        EDIT: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,
        DEL: `<svg viewBox="0 0 24 24" class="ui-icon"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`,

        SUN: `<svg viewBox="0 0 24 24" class="ui-icon" style="width:15px; height:15px; margin:0;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
        MOON: `<svg viewBox="0 0 24 24" class="ui-icon" style="width:15px; height:15px; margin:0;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
      };

      let authState = {
        isLoggedIn: false,
        userProfile: JSON.parse(localStorage.getItem('user_profile')) || null
      };

      function isUserLoggedIn() {
        if (typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn !== isUserLoggedIn) {
          return window.isUserLoggedIn();
        }
        return false;
      }

      function copyTextToClipboard(text, alertMsg = '주소가 복사되었습니다') {
        if (!text) return;
        triggerHaptic(15);
        var toastOpts = { html: ICONS.COPY };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => showToast(alertMsg, toastOpts)).catch(() => fallbackCopy(text, alertMsg));
        } else { fallbackCopy(text, alertMsg); }
      }

      function fallbackCopy(text, alertMsg) {
        const temp = document.createElement('textarea');
        temp.value = text; document.body.appendChild(temp); temp.select();
        try { document.execCommand('copy'); showToast(alertMsg, { html: ICONS.COPY }); } catch (err) { console.warn('[map.html:fallbackCopy]', err); }
        document.body.removeChild(temp);
      }

      function getSpotDiffColorClass(difficulty = 3) {
        const d = parseInt(difficulty, 10) || 3;
        return d <= 2 ? 'color-diff-easy' : (d >= 4 ? 'color-diff-hard' : 'color-diff-mid');
      }

      function parseEntryPoint(rawEntry) {
        if (!rawEntry) return { navAddress: '', guide: '' };
        const parts = String(rawEntry).trim().split(/[,]+/);
        return { navAddress: parts[0].trim(), guide: parts.slice(1).map(p => p.trim()).filter(Boolean).join(', ') };
      }

     // 유튜브 숏츠는 정보창에 넣지 않는다(등록·기록·자동 검색 모두)
      window.okbmIsYouTubeShorts = function(url) {
        return /youtube\.com\/shorts\//i.test(String(url || ''));
      };

      // 주소가 watch?v= 라도 세로 영상이면 숏츠로 본다. 유튜브는 세로 영상에만 세로 썸네일(oardefault)을 만들고,
      // 일반 영상은 120x90 빈 그림을 준다. 결과는 기기에 기억해 두고, 4초 안에 못 받으면 일반 영상으로 본다.
      window.okbmIsVerticalYouTube = (function() {
        var KEY = 'okbm_yt_vertical_v1';
        var memo = {};
        try { memo = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { memo = {}; }
        var pending = {};
        function save() { try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch (e) {} }
        return function(id) {
          id = String(id || '');
          if (!/^[\w-]{11}$/.test(id)) return Promise.resolve(false);
          if (Object.prototype.hasOwnProperty.call(memo, id)) return Promise.resolve(!!memo[id]);
          if (pending[id]) return pending[id];
          pending[id] = new Promise(function(resolve) {
            var img = new Image();
            var done = false;
            var finish = function(vertical, remember) {
              if (done) return;
              done = true;
              delete pending[id];
              if (remember) { memo[id] = vertical ? 1 : 0; save(); }
              resolve(vertical);
            };
            var timer = setTimeout(function() { finish(false, false); }, 4000);
            img.onload = function() { clearTimeout(timer); finish(img.naturalHeight > img.naturalWidth, true); };
            img.onerror = function() { clearTimeout(timer); finish(false, true); };
            img.src = 'https://i.ytimg.com/vi/' + id + '/oardefault.jpg';
          });
          return pending[id];
        };
      })();

     function cleanYouTubeUrl(url) {
        if (!url) return '';
        const match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/)|[?&]v=)([\w-]{11})/i);
        return match ? ('https://www.youtube.com/watch?v=' + match[1]) : '';
      }

  

      function detectRegionAndCity(lat, lng, name = '', entryPoint = '') {
        const t = (name + ' ' + entryPoint).toLowerCase();
        
        // 1. 제주권
        if (t.includes('제주') || t.includes('서귀포') || t.includes('우도') || t.includes('한라산') || t.includes('오름') || lat < 34.2) {
          return { region: '제주', cityName: '제주' };
        }
        
        // 2. 서울/인천
        if (t.includes('서울') || t.includes('인천') || t.includes('옹진') || t.includes('강화') || t.includes('굴업도') || t.includes('덕적도') || t.includes('자월도')) {
          return { region: '서울/인천', cityName: '서울/인천' };
        }
        
        // 3. 강원권
        if (t.includes('강원') || t.includes('정선') || t.includes('평창') || t.includes('영월') || t.includes('원주') || t.includes('춘천') || t.includes('홍천') || t.includes('강릉') || t.includes('인제') || t.includes('태백') || t.includes('속초') || t.includes('양양') || t.includes('고성') || t.includes('동해') || t.includes('삼척') || t.includes('화천') || t.includes('양구') || t.includes('철원')) {
          return { region: '강원', cityName: '강원' };
        }
        
        // 4. 경기권
        if (t.includes('경기') || t.includes('남양주') || t.includes('양평') || t.includes('가평') || t.includes('포천') || t.includes('용인') || t.includes('이천') || t.includes('여주') || t.includes('파주') || t.includes('동두천') || t.includes('연천') || t.includes('안성') || t.includes('광주')) {
          return { region: '경기', cityName: '경기' };
        }

        // 5. 충북 vs 충남 (대전/세종)
        if (t.includes('충북') || t.includes('충주') || t.includes('제천') || t.includes('단양') || t.includes('보은') || t.includes('옥천') || t.includes('영동') || t.includes('진천') || t.includes('괴산') || t.includes('음성')) {
          return { region: '충북', cityName: '충북' };
        }
        if (t.includes('충남') || t.includes('대전') || t.includes('세종') || t.includes('천안') || t.includes('공주') || t.includes('보령') || t.includes('아산') || t.includes('서산') || t.includes('논산') || t.includes('계룡') || t.includes('당진') || t.includes('금산') || t.includes('부여') || t.includes('서천') || t.includes('청양') || t.includes('홍성') || t.includes('예산') || t.includes('태안')) {
          return { region: '충남', cityName: '충남' };
        }

        // 6. 전북 vs 전남 (광주)
        if (t.includes('전북') || t.includes('전주') || t.includes('군산') || t.includes('익산') || t.includes('정읍') || t.includes('남원') || t.includes('김제') || t.includes('완주') || t.includes('진안') || t.includes('무주') || t.includes('장수') || t.includes('임실') || t.includes('순창') || t.includes('고창') || t.includes('부안')) {
          return { region: '전북', cityName: '전북' };
        }
        if (t.includes('전남') || t.includes('광주') || t.includes('목포') || t.includes('여수') || t.includes('순천') || t.includes('나주') || t.includes('광양') || t.includes('담양') || t.includes('곡성') || t.includes('구례') || t.includes('고흥') || t.includes('보성') || t.includes('화순') || t.includes('장흥') || t.includes('강진') || t.includes('해남') || t.includes('영암') || t.includes('무안') || t.includes('함평') || t.includes('영광') || t.includes('장성') || t.includes('완도') || t.includes('진도') || t.includes('신안')) {
          return { region: '전남', cityName: '전남' };
        }

        // 7. 경북 (대구) vs 경남 (부산/울산)
        if (t.includes('경북') || t.includes('대구') || t.includes('포항') || t.includes('경주') || t.includes('김천') || t.includes('안동') || t.includes('구미') || t.includes('영주') || t.includes('영천') || t.includes('상주') || t.includes('문경') || t.includes('경산') || t.includes('의성') || t.includes('청송') || t.includes('영양') || t.includes('영덕') || t.includes('청도') || t.includes('고령') || t.includes('성주') || t.includes('칠곡') || t.includes('예천') || t.includes('봉화') || t.includes('울진') || t.includes('울릉')) {
          return { region: '경북', cityName: '경북' };
        }
        if (t.includes('경남') || t.includes('부산') || t.includes('울산') || t.includes('창원') || t.includes('진주') || t.includes('통영') || t.includes('사천') || t.includes('김해') || t.includes('밀양') || t.includes('거제') || t.includes('양산') || t.includes('의령') || t.includes('함안') || t.includes('창녕') || t.includes('고성') || t.includes('남해') || t.includes('하동') || t.includes('산청') || t.includes('함양') || t.includes('거창') || t.includes('합천')) {
          return { region: '경남', cityName: '경남' };
        }

        // 8. 위경도 Fallback
        if (lat >= 37.0 && lng > 127.9) return { region: '강원', cityName: '강원' };
        if (lat >= 36.95 && lng <= 127.8) return { region: '경기', cityName: '경기' };
        if (lat >= 35.8 && lat < 37.0) {
          return lng > 127.7 ? { region: '충북', cityName: '충북' } : { region: '충남', cityName: '충남' };
        }
        if (lat < 35.8 && lng > 127.8) {
          return lat >= 35.6 ? { region: '경북', cityName: '경북' } : { region: '경남', cityName: '경남' };
        }
        if (lat < 35.8 && lng <= 127.8) {
          return lat >= 35.5 ? { region: '전북', cityName: '전북' } : { region: '전남', cityName: '전남' };
        }
      return { region: '경기', cityName: '경기' };
      }

     var currentAppTheme = 'dark';
      document.documentElement.setAttribute('data-theme', 'dark');

      function isSpotUnlocked(spotId) {
        if (isAdminMode) return true;
        var unlockedList = safeGetJSON('okbm_unlocked_spots', []);
        return unlockedList.includes(String(spotId).trim());
      }

      function triggerSpotUnlock(spotId, targetUrl) {
        pendingUnlockSpotId = spotId;
        if (targetUrl && targetUrl.trim() && targetUrl !== 'undefined') {
          // DB 값일 수 있으므로 http(s)만 열고, 새 창이 이 페이지를 조작하지 못하게 한다.
          var safeTarget = okbmSafeExternalUrl(targetUrl);
          if (safeTarget && safeTarget !== '#') {
            try { window.open(safeTarget, '_blank', 'noopener,noreferrer'); } catch (e) { console.warn('[map.html:triggerSpotUnlock]', e); }
          }
        }
        var lntModal = document.getElementById('lntModalOverlay');
        if (lntModal) lntModal.style.display = 'flex';
      }

      function confirmLntPledgeAndUnlock() {
        if (pendingUnlockSpotId) {
          var unlockedList = safeGetJSON('okbm_unlocked_spots', []);
          var sId = String(pendingUnlockSpotId).trim();
          if (!unlockedList.includes(sId)) {
            unlockedList.push(sId);
            localStorage.setItem('okbm_unlocked_spots', JSON.stringify(unlockedList));
          }
        }
        var lntModal = document.getElementById('lntModalOverlay');
        if (lntModal) lntModal.style.display = 'none';
        showToast('들머리 주소와 4대 내비가 해금되었습니다!', { html: ICONS.UNLOCK });
        refreshCurrentSpotPopup();
      }

      function prefetchAndBindSpotMedia(spot) {
        if (!spot) return;
        if (typeof window.prefetchSpotMediaForSpot === 'function') {
          window.prefetchSpotMediaForSpot(spot);
        }
      }

      function bindSpotMediaAfterRender(spot) {
        if (!spot) return;
        if (typeof window.bindSpotMediaDrawer === 'function') {
          window.bindSpotMediaDrawer(spot);
        }
      }

      async function ensureSpotDetailLoaded(spot) {
        if (!spot || !spot.id) return spot;
        // 비회원용 요약(guest)만 받아 둔 상태에서 로그인했다면 전체 상세를 다시 받는다.
        var needsMemberDetail = spot.__detailTier === 'guest' && isUserLoggedIn();
        if (!needsMemberDetail && spot.__detailLoaded && (spot.trailhead_addr || spot.desc_summary)) return spot;
        if (typeof window.fetchSpotDetailById !== 'function') return spot;
        var wantMemberDetail = isUserLoggedIn();
        var detail = await window.fetchSpotDetailById(spot.id);
        if (!detail) {
          // 실패를 표시해 두면 회원 화면에 가짜 기본 주소 대신 "불러오지 못했어요"가 나온다.
          spot.__detailError = 'error';
          return spot;
        }
        if (typeof window.mergeSpotDetailInto === 'function') {
          window.mergeSpotDetailInto(spot, detail);
        } else {
          spot.trailhead_addr = detail.trailhead_addr || '';
          spot.entryPoint = spot.trailhead_addr;
          spot.desc_summary = detail.desc_summary || '';
          spot.desc = spot.desc_summary;
          spot.__detailLoaded = true;
        }
        // 로그인한 채로 요청했는데 한도 초과도 아닌 비회원 응답이면 세션이 서버에서 인정되지 않은 것.
        spot.__detailError = (wantMemberDetail && detail.tier === 'guest' && !detail.limited) ? 'relogin' : '';
        // spots 배열 내 동일 객체 동기화
        if (Array.isArray(spots)) {
          var idx = spots.findIndex(function(s) { return String(s.id).trim() === String(spot.id).trim(); });
          if (idx !== -1 && spots[idx] !== spot) {
            if (typeof window.mergeSpotDetailInto === 'function') window.mergeSpotDetailInto(spots[idx], detail);
            else Object.assign(spots[idx], {
              trailhead_addr: spot.trailhead_addr,
              entryPoint: spot.entryPoint,
              desc_summary: spot.desc_summary,
              desc: spot.desc,
              youtubeUrls: spot.youtubeUrls,
              blogUrls: spot.blogUrls,
              authorSnsUrl: spot.authorSnsUrl,
              __detailLoaded: true
            });
          }
        }
        return spot;
      }

      // 상세(들머리·요약·미디어·SNS) 중 시트 내용에 영향을 주는 값. 열 때와 같으면 다시 그리지 않는다.
      function spotDetailRenderSig(spot) {
        if (!spot) return '';
        return [
          spot.trailhead_addr || '', spot.entryPoint || '', spot.desc_summary || '', spot.desc || '',
          spot.mediaUrls || '', spot.author_sns_url || spot.authorSnsUrl || '',
          [].concat(spot.youtubeUrls || []).join(' '), [].concat(spot.blogUrls || []).join(' '),
          spot.__detailLoaded ? '1' : '0', spot.__detailTier || '', spot.__detailLimited || '', spot.__detailError || ''
        ].join('\u0001');
      }

      // 회원 화면의 들머리·코스 영역 상태. '' = 정상 표시.
      // 'loading' | 'error' | 'relogin' | 'daily' | 'minute'
      function memberSpotDetailState(spot) {
        if (!spot) return 'loading';
        if (spot.__detailLimited) return spot.__detailLimited;
        if (spot.__detailError) return spot.__detailError;
        if (spot.trailhead_addr || spot.entryPoint) return '';
        if (spot.__detailLoaded && spot.__detailTier !== 'guest') return '';
        return 'loading';
      }

      function renderMemberSpotDetailStateHtml(sId, state) {
        if (state === 'loading') {
          return `<div class="guest-member-lock-card" style="align-items:center; text-align:center;">
              <div style="font-size:0.74rem; color:var(--text-secondary);">들머리·코스 정보를 불러오는 중...</div>
            </div>`;
        }
        var copy = {
          daily: { title: '오늘 확인할 수 있는 상세 정보를 모두 봤어요', body: '소중한 장소 보존을 위해 상세 정보는 하루 100곳까지 열려요.<br>오늘 이미 연 장소는 계속 볼 수 있고, 자정에 다시 열려요.', action: '' },
          minute: { title: '잠시 후 다시 열어 주세요', body: '짧은 시간에 많은 장소를 열었어요.<br>1분쯤 뒤에 다시 시도해 주세요.', action: 'retry' },
          relogin: { title: '로그인 정보를 확인하지 못했어요', body: '다시 로그인하면 들머리 주소와 코스 정보가 열려요.', action: 'login' },
          error: { title: '상세 정보를 불러오지 못했어요', body: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.', action: 'retry' }
        }[state] || { title: '상세 정보를 불러오지 못했어요', body: '잠시 후 다시 시도해 주세요.', action: 'retry' };
        var actionHtml = '';
        if (copy.action === 'retry') {
          actionHtml = `<button type="button" class="btn-quick-login-unlock" style="width:100%; padding:9px; font-size:0.80rem;" data-id="${escapeHtml(sId)}" onclick="retrySpotDetail(this.dataset.id)">다시 불러오기</button>`;
        } else if (copy.action === 'login') {
          actionHtml = `<button type="button" class="btn-quick-login-unlock" style="width:100%; padding:9px; font-size:0.80rem;" onclick="openLoginModal();">${ICONS.AUTH} 다시 로그인하기</button>`;
        }
        return `<div class="guest-member-lock-card">
            <div style="font-size:0.88rem; font-weight:800; color:var(--accent-amber); display:flex; align-items:center; gap:4px;">${ICONS.LOCK} ${copy.title}</div>
            <div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.45;">${copy.body}</div>
            ${actionHtml}
          </div>`;
      }

      function retrySpotDetail(spotId) {
        var sId = String(spotId || '').trim();
        if (!sId) return;
        var spot = (currentActiveSpot && String(currentActiveSpot.id).trim() === sId)
          ? currentActiveSpot
          : (Array.isArray(spots) ? spots.find(function(s) { return String(s.id).trim() === sId; }) : null);
        if (!spot) return;
        spot.__detailError = '';
        spot.__detailLimited = '';
        applySpotDetailToOpenUi(spot);
        refreshSpotDetailAfterOpen(spot);
      }

      // 시트/드로어를 연 뒤 상세를 받아 바뀐 경우에만 다시 그린다.
      // (예전에는 상세가 이미 캐시돼 있어도 microtask로 시트 전체 innerHTML을 한 번 더 만들었다)
      function refreshSpotDetailAfterOpen(spot) {
        var sigAtOpen = spotDetailRenderSig(spot);
        ensureSpotDetailLoaded(spot).then(function(enriched) {
          if (enriched && spotDetailRenderSig(enriched) !== sigAtOpen) applySpotDetailToOpenUi(enriched);
        });
      }

      function applySpotDetailToOpenUi(spot) {
        if (!spot) return;
        var sId = String(spot.id).trim();
        if (currentActiveSpot && String(currentActiveSpot.id).trim() !== sId) return;
        var mobileSheet = document.getElementById('mobileBottomSheet');
        var mobileContent = document.getElementById('mobileSheetContent');
        var pcDrawer = document.getElementById('pcSlidingDrawer');
        var isSheetOpen = mobileSheet && mobileSheet.classList.contains('open');
        var isDrawerOpen = pcDrawer && pcDrawer.classList.contains('open');
        if (isSheetOpen && mobileContent) {
          __spotDataMap.set(mobileSheet, spot);
          prefetchAndBindSpotMedia(spot);
          mobileContent.innerHTML = generateDetailContentHtml(spot, true);
          bindSpotMediaAfterRender(spot);
        } else if (isDrawerOpen && pcDrawer) {
          __spotDataMap.set(pcDrawer, spot);
          prefetchAndBindSpotMedia(spot);
          pcDrawer.innerHTML = generateDetailContentHtml(spot, false);
          bindSpotMediaAfterRender(spot);
        }
      }

      function refreshCurrentSpotPopup() {
        var isMobile = window.innerWidth <= 768;
        var mobileSheet = document.getElementById('mobileBottomSheet');
        var mobileContent = document.getElementById('mobileSheetContent');
        var pcDrawer = document.getElementById('pcSlidingDrawer');

        // 🛡️ [핵심 방어]: 정보창이 현재 실제로 열려있는 상태가 아니라면 강제로 띄우지 않고 즉시 중단
        var isSheetOpen = mobileSheet && mobileSheet.classList.contains('open');
        var isDrawerOpen = pcDrawer && pcDrawer.classList.contains('open');
        if (!isSheetOpen && !isDrawerOpen) return;

        var targetSpot = currentActiveSpot;
        if (!targetSpot) {
          var savedId = localStorage.getItem('okbm_active_spot_id') || window.__MANUAL_ACTIVE_ID__;
          if (savedId && Array.isArray(spots)) {
            targetSpot = spots.find(s => String(s.id).trim() === String(savedId).trim());
          }
        }
        if (!targetSpot && mobileSheet) targetSpot = __spotDataMap.get(mobileSheet);
        if (!targetSpot && pcDrawer) targetSpot = __spotDataMap.get(pcDrawer);

        if (!targetSpot) return;

        currentActiveSpot = targetSpot;
        window.__ACTIVE_SPOT_OBJECT__ = targetSpot;
        window.__MANUAL_ACTIVE_ID__ = String(targetSpot.id).trim();
        localStorage.setItem('okbm_active_spot_id', String(targetSpot.id).trim());

        if (isMobile && isSheetOpen) {
          prefetchAndBindSpotMedia(targetSpot);
          if (mobileContent) mobileContent.innerHTML = generateDetailContentHtml(targetSpot, true);
          if (mobileSheet) __spotDataMap.set(mobileSheet, targetSpot);
          bindSpotMediaAfterRender(targetSpot);
        } else if (!isMobile && isDrawerOpen) {
          if (pcDrawer) {
            __spotDataMap.set(pcDrawer, targetSpot);
            prefetchAndBindSpotMedia(targetSpot);
            pcDrawer.innerHTML = generateDetailContentHtml(targetSpot, false);
            bindSpotMediaAfterRender(targetSpot);
          }
        }
        // 정보창을 연 채로 로그인한 경우처럼 회원 상세가 아직 없으면 여기서 받아 온다.
        if (isUserLoggedIn() && memberSpotDetailState(targetSpot) === 'loading') {
          refreshSpotDetailAfterOpen(targetSpot);
        }
      }

      function openMobileBottomSheet(spot) {
        if (!spot) return;
        currentActiveSpot = spot;
        window.__ACTIVE_SPOT_OBJECT__ = spot;
        window.__MANUAL_ACTIVE_ID__ = String(spot.id).trim();
        localStorage.setItem('okbm_active_spot_id', String(spot.id).trim());

        var sheet = document.getElementById('mobileBottomSheet');
        var content = document.getElementById('mobileSheetContent');
        if (!sheet || !content) return;

        __spotDataMap.set(sheet, spot);
        prefetchAndBindSpotMedia(spot);
        content.innerHTML = generateDetailContentHtml(spot, true);
        sheet.classList.add('open');
        if (typeof window.okbmResetSheetMetrics === 'function') window.okbmResetSheetMetrics();
        bindSpotMediaAfterRender(spot);
        
        loadLiveWeatherForSpot(spot.id, spot.lat, spot.lng);
        if (typeof window.fetchSpotFeedsOnDemand === 'function') {
          window.fetchSpotFeedsOnDemand(spot).then(function(feeds) {
            if (feeds && feeds.length > 0 && currentActiveSpot && String(currentActiveSpot.id).trim() === String(spot.id).trim()) {
              var container = document.getElementById('spotFeedsRail_' + spot.id);
              if (container) {
                container.innerHTML = buildSpotFieldFeedsTrackContent(spot, feeds);
              }
            }
          });
        }
        if (typeof window.okbmLoadSpotReviewBox === 'function') window.okbmLoadSpotReviewBox(spot);
        if (typeof window.okbmLoadCreatorLinks === 'function') window.okbmLoadCreatorLinks(spot);
        refreshSpotDetailAfterOpen(spot);
        requestAnimationFrame(() => { content.scrollTop = 0; });
      }

      function closeMobileBottomSheet() {
        var sheet = document.getElementById('mobileBottomSheet');
        if (sheet && sheet.classList.contains('open')) {
          sheet.classList.remove('open');
          if (typeof window.okbmResetSheetMetrics === 'function') window.okbmResetSheetMetrics();
          currentActiveSpot = null;
          window.__ACTIVE_SPOT_OBJECT__ = null;
          window.__MANUAL_ACTIVE_ID__ = null;
          localStorage.removeItem('okbm_active_spot_id');
          document.querySelectorAll('.spot-item').forEach(el => el.classList.remove('active-spot'));
          updateLODLabels();
          returnToPhotoMapIfNeeded();
        }
      }
      window.closeMobileBottomSheet = closeMobileBottomSheet;

      function openPcSlidingDrawer(spot) {
        if (!spot) return;
        currentActiveSpot = spot;
        window.__ACTIVE_SPOT_OBJECT__ = spot;
        window.__MANUAL_ACTIVE_ID__ = String(spot.id).trim();
        localStorage.setItem('okbm_active_spot_id', String(spot.id).trim());

        var drawer = document.getElementById('pcSlidingDrawer');
        var closeTab = document.getElementById('floatingDrawerCloseTab');
        if (!drawer) return;

        __spotDataMap.set(drawer, spot);
        prefetchAndBindSpotMedia(spot);
        drawer.innerHTML = generateDetailContentHtml(spot, false);
        drawer.classList.add('open');
        if (typeof window.okbmResetSheetMetrics === 'function') window.okbmResetSheetMetrics();
        bindSpotMediaAfterRender(spot);
        if (closeTab) closeTab.classList.add('visible');
        
        loadLiveWeatherForSpot(spot.id, spot.lat, spot.lng);
        if (typeof window.fetchSpotFeedsOnDemand === 'function') {
          window.fetchSpotFeedsOnDemand(spot).then(function(feeds) {
            if (feeds && feeds.length > 0 && currentActiveSpot && String(currentActiveSpot.id).trim() === String(spot.id).trim()) {
              var container = document.getElementById('spotFeedsRail_' + spot.id);
              if (container) {
                container.innerHTML = buildSpotFieldFeedsTrackContent(spot, feeds);
              }
            }
          });
        }
        if (typeof window.okbmLoadSpotReviewBox === 'function') window.okbmLoadSpotReviewBox(spot);
        if (typeof window.okbmLoadCreatorLinks === 'function') window.okbmLoadCreatorLinks(spot);
        refreshSpotDetailAfterOpen(spot);
        requestAnimationFrame(() => { drawer.scrollTop = 0; });
      }

      function closePcSlidingDrawer() {
        var drawer = document.getElementById('pcSlidingDrawer');
        var wasOpen = !!(drawer && drawer.classList.contains('open'));
        var closeTab = document.getElementById('floatingDrawerCloseTab');
        if (drawer) drawer.classList.remove('open');
        if (typeof window.okbmResetSheetMetrics === 'function') window.okbmResetSheetMetrics();
        if (closeTab) closeTab.classList.remove('visible');
        currentActiveSpot = null;
        window.__ACTIVE_SPOT_OBJECT__ = null;
        window.__MANUAL_ACTIVE_ID__ = null;
        try { localStorage.removeItem('okbm_active_spot_id'); } catch (e) {}
        document.querySelectorAll('.spot-item').forEach(el => el.classList.remove('active-spot'));
        updateLODLabels();
        if (wasOpen) returnToPhotoMapIfNeeded();
      }
      window.closePcSlidingDrawer = closePcSlidingDrawer;

    var markerImageCache = new Map();
      function createPureSvgMarkerImage(difficulty = 3, banned = false) {
        const d = parseInt(difficulty, 10) || 3;
        const colorKey = banned ? 'ban' : (d <= 2 ? 'easy' : (d >= 4 ? 'hard' : 'mid'));
        const isMobile = window.innerWidth <= 768;
        const cacheKey = colorKey + '_' + (isMobile ? 'm' : 'p');

        if (markerImageCache.has(cacheKey)) {
          return markerImageCache.get(cacheKey);
        }

        const color = colorKey === 'ban' ? '#64748b' : (colorKey === 'easy' ? '#10b981' : (colorKey === 'hard' ? '#f43f5e' : '#f59e0b'));
        const width = isMobile ? 30 : 34, height = isMobile ? 38 : 42;

        const inner = colorKey === 'ban'
          ? '<circle cx="14" cy="13.5" r="6.5" fill="#ffffff" stroke="#e11d48" stroke-width="2.2"/><line x1="9.6" y1="9.1" x2="18.4" y2="17.9" stroke="#e11d48" stroke-width="2.2"/>'
          : '<path fill="#ffffff" d="M14 7 L7.5 18 H20.5 Z"/><polygon fill="' + color + '" points="14,10.5 10.5,18 17.5,18"/>';
        const svgString = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="' + width + '" height="' + height + '">' +
          '<ellipse cx="14" cy="34" rx="7" ry="2" fill="rgba(0,0,0,0.4)"/>' +
          '<path fill="' + color + '" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" d="M14 1 C6.82 1 1 6.82 1 14 C1 19.8 4.8 24.7 10 26.3 L14 32.5 L18 26.3 C23.2 24.7 27 19.8 27 14 C27 6.82 21.18 1 14 1 Z"/>' +
          inner +
        '</svg>';

        const markerImg = new kakao.maps.MarkerImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString),
          new kakao.maps.Size(width, height),
          { offset: new kakao.maps.Point(width / 2, height) }
        );

        limitedMapSet(markerImageCache, cacheKey, markerImg, 100);
        return markerImg;
      }

      const CYCLE_DIFF_LIST = [
        { key: 'ALL', label: '난이도', icon: ICONS.ROCK, cls: '' },
        { key: 'EASY', label: '쉬움', icon: `<svg viewBox="0 0 24 24" class="ui-icon" style="color:#10b981; width:14px; height:14px; margin:0;"><polygon points="4 20 2 12 8 4 17 6 22 14 19 20 4 20" stroke="#10b981" stroke-width="2" fill="none"/></svg>`, cls: 'active-diff-easy' },
        { key: 'MID', label: '보통', icon: `<svg viewBox="0 0 24 24" class="ui-icon" style="color:#f59e0b; width:14px; height:14px; margin:0;"><polygon points="4 20 2 12 8 4 17 6 22 14 19 20 4 20" stroke="#f59e0b" stroke-width="2" fill="none"/></svg>`, cls: 'active-diff-mid' },
        { key: 'HARD', label: '어려움', icon: `<svg viewBox="0 0 24 24" class="ui-icon" style="color:#f43f5e; width:14px; height:14px; margin:0;"><polygon points="4 20 2 12 8 4 17 6 22 14 19 20 4 20" stroke="#f43f5e" stroke-width="2" fill="none"/></svg>`, cls: 'active-diff-hard' }
      ];
      let cycleDiffIdx = 0;
      function cycleDifficultyFilter() {
        cycleDiffIdx = (cycleDiffIdx + 1) % CYCLE_DIFF_LIST.length;
        const cur = CYCLE_DIFF_LIST[cycleDiffIdx];
        const btn = document.getElementById('btnCycleDifficulty');
        btn.className = `tower-toggle-btn ${cur.cls}`;
        document.getElementById('iconCycleDifficulty').innerHTML = cur.icon;
        document.getElementById('labelCycleDifficulty').innerText = cur.label;
        currentHudFilterDiff = cur.key;
        renderSpots();
      }

      const CYCLE_STATUS_LIST = [
        { key: 'ALL', label: '상태', icon: ICONS.FAST },
        { key: 'BOOKMARK', label: '찜', icon: ICONS.HEART },
        { key: 'VISITED', label: '클리어', icon: ICONS.FLAG },
        { key: 'HOT', label: 'HOT', icon: `<span style="color:#f43f5e; font-size:0.65rem; font-weight:900;">HOT</span>` },
        { key: 'NEW', label: 'NEW', icon: `<span style="color:#10b981; font-size:0.65rem; font-weight:900;">NEW</span>` },
        { key: 'BEGINNER', label: '초보', icon: ICONS.MOUNTAIN }
      ];
      let cycleStatusIdx = 0;
      function cycleStatusFilter() {
        cycleStatusIdx = (cycleStatusIdx + 1) % CYCLE_STATUS_LIST.length;
        const cur = CYCLE_STATUS_LIST[cycleStatusIdx];
        const btn = document.getElementById('btnCycleStatus');
        btn.className = `tower-toggle-btn ${cur.key !== 'ALL' ? 'active-status' : ''}`;
        document.getElementById('iconCycleStatus').innerHTML = cur.icon;
        document.getElementById('labelCycleStatus').innerText = cur.label;
        currentHudFilterStatus = cur.key;
        renderSpots();
      }

      const CYCLE_TERRAIN_LIST = [
        { key: 'ALL', label: '지형', icon: ICONS.DECK },
        { key: '데크', label: '데크', icon: ICONS.DECK },
        { key: '암릉', label: '암릉', icon: ICONS.ROCK },
        { key: '노지', label: '노지', icon: ICONS.SOIL },
        { key: '섬', label: '섬', icon: ICONS.ISLAND },
        { key: '해변', label: '해변', icon: ICONS.BEACH },
        { key: '계곡', label: '계곡', icon: ICONS.VALLEY },
        { key: '동굴', label: '동굴', icon: ICONS.CAVE }
      ];
      let cycleTerrainIdx = 0;
      function cycleTerrainFilter() {
        cycleTerrainIdx = (cycleTerrainIdx + 1) % CYCLE_TERRAIN_LIST.length;
        const cur = CYCLE_TERRAIN_LIST[cycleTerrainIdx];
        const btn = document.getElementById('btnCycleTerrain');
        btn.className = `tower-toggle-btn ${cur.key !== 'ALL' ? 'active-terrain' : ''}`;
        document.getElementById('iconCycleTerrain').innerHTML = cur.icon;
        document.getElementById('labelCycleTerrain').innerText = cur.label;
        currentHudFilterTerrain = cur.key;
        renderSpots();
      }

      function initStaticVectors() {
        const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        setHtml('sidebarCampIcon', ICONS.CAMP);
        setHtml('btnSidebarSubmit', `${ICONS.BACKPACK}<span>제보</span>`);
        setHtml('iconToolBackup', ICONS.BACKUP);
        setHtml('iconToolRestore', ICONS.RESTORE);
        setHtml('iconToolAddSpot', ICONS.PIN);
        setHtml('iconToolInbox', ICONS.EDIT);
        
        setHtml('tabIconRegion', ICONS.PIN);
        setHtml('tabIconTerrain', ICONS.ROCK);
        setHtml('tabIconCourse', ICONS.FAST);
        setHtml('tabIconMy', ICONS.HEART);

        setHtml('iconCycleDifficulty', ICONS.ROCK);
        setHtml('iconCycleStatus', ICONS.FAST);
        setHtml('iconCycleTerrain', ICONS.DECK);

        setHtml('bannerPinIcon', ICONS.PIN);
        setHtml('loginModalCampIcon', ICONS.CAMP);
        setHtml('kakaoLoginIcon', ICONS.TALK);
        setHtml('lntAlertTopIcon', ICONS.ALERT_CARD);
        setHtml('lntProhibitIcon', ICONS.BAN_LNT);

        setHtml('btnModalPinPickIcon', ICONS.PIN);
        setHtml('btnModalElevIcon', ICONS.MOUNTAIN);
      }

      function isKakaoMapReady() {
        return !!(map && typeof kakao !== 'undefined' && kakao.maps && typeof kakao.maps.LatLng === 'function');
      }

      function flushPendingRenderSpots() {
        if (!isKakaoMapReady()) return;
        if (!window.__pendingRenderSpots) return;
        var force = window.__pendingRenderSpots === 'force';
        window.__pendingRenderSpots = false;
        renderSpots(force);
      }

      function relayoutMapSafe() {
        if (!isKakaoMapReady() || typeof map.relayout !== 'function') return;
        try { map.relayout(); } catch (e) {}
      }

      function initMapEngine() {
        if (window.__okbmMapEngineStarted) return;
        if (typeof kakao === 'undefined' || !kakao.maps || typeof kakao.maps.load !== 'function') {
          // SDK(async)가 아직 실행 전이면 도착할 때 다시 부른다. 느린 망에서도 시간 상한 없이 기다린다.
          var sdkEl = document.getElementById('okbmKakaoMapSdk');
          if (sdkEl && !sdkEl.__okbmInitBound) {
            sdkEl.__okbmInitBound = true;
            sdkEl.addEventListener('load', initMapEngine);
          }
          return;
        }
        window.__okbmMapEngineStarted = true;
        kakao.maps.load(() => {
          const container = document.getElementById('map');
          if (!container) return;
          map = new kakao.maps.Map(container, { 
            center: new kakao.maps.LatLng(NATIONWIDE_CENTER.lat, NATIONWIDE_CENTER.lng), 
            level: NATIONWIDE_LEVEL,
            tileAnimation: false
          });
          geocoder = new kakao.maps.services.Geocoder();

          // clickable:false — 카카오 클러스터는 기본값(clickable)이면 그 위에서 누른 채 끌어도 지도가 안 움직인다.
          // 대신 clusterclick이 안 오므로, 탭은 지도 click(handleMapClick)에서 findTappedCluster로 찾아 확대한다.
          globalClusterer = new kakao.maps.MarkerClusterer({
            map: map, averageCenter: true, minLevel: 11, disableClickZoom: true, clickable: false,
            calculator: [10, 30],
            styles: [
              { width: '54px', height: '54px', background: 'rgba(16, 185, 129, 0.55)', border: '2.2px solid #00FF9D', borderRadius: '50%', color: '#fff', textAlign: 'center', lineHeight: '50px', fontSize: '14px', fontWeight: '800', boxShadow: '0 0 24px rgba(0,255,157,0.75)', cursor: 'pointer' },
              { width: '60px', height: '60px', background: 'rgba(6, 182, 212, 0.55)', border: '2.5px solid #00E5FF', borderRadius: '50%', color: '#fff', textAlign: 'center', lineHeight: '56px', fontSize: '15px', fontWeight: '800', boxShadow: '0 0 28px rgba(0,229,255,0.8)', cursor: 'pointer' },
              { width: '66px', height: '66px', background: 'rgba(245, 158, 11, 0.6)', border: '2.8px solid #FFD600', borderRadius: '50%', color: '#fff', textAlign: 'center', lineHeight: '62px', fontSize: '16px', fontWeight: '800', boxShadow: '0 0 34px rgba(255,214,0,0.95)', cursor: 'pointer' }
            ]
          });

          // 지금 화면에 그려진 클러스터(2개 이상 묶인 것만 온다). 탭 위치 판정에 쓴다
          kakao.maps.event.addListener(globalClusterer, 'clustered', (clusters) => {
            visibleClusters = Array.isArray(clusters) ? clusters : [];
          });

          kakao.maps.event.addListener(map, 'zoom_start', () => { clearTimeout(lodDebounceTimer); window.hideLongPressProposalTooltip(); });
          kakao.maps.event.addListener(map, 'dragstart', () => { clearTimeout(lodDebounceTimer); window.hideLongPressProposalTooltip(); });
          kakao.maps.event.addListener(map, 'idle', () => { debouncedUpdateLODLabels(); scheduleGuestPinRefine(); });
          kakao.maps.event.addListener(map, 'click', handleMapClick);

          initMapLongPressProposalEngine(container);

         if (spots && spots.length > 0) {
            spots = spots.filter(s => s && s.lat && s.lng && !BLOCKED_SPOT_IDS.has(String(s.id).trim()));
            window.spots = spots;
            updateNewSpotFlags(spots); 
            renderSubChips();
            renderSpots(); 
            checkUrlParamSpotFocus(); 
          } else {
            loadSpotsMasterEngine();
          }
          requestAnimationFrame(function() {
            relayoutMapSafe();
            flushPendingRenderSpots();
            if (typeof window.bootMapAdminTools === 'function') window.bootMapAdminTools();
          });

          window.__spotFeedsCache = new Map();
          window.fetchSpotFeedsOnDemand = async function(spot) {
            if (!spot) return [];
            var sId = String(spot.id || '').trim();
            if (window.__spotFeedsCache.has(sId)) {
              return window.__spotFeedsCache.get(sId);
            }
            var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
            var targetKey = window.SUPABASE_ANON_KEY || '';
            var spotMainName = (spot.spot_main || spot.name || '').trim();
            if (!sId && !spotMainName) return [];
            var selectCols = 'id,user_id,spot,spot_id,photos,photo_memos_json,author,instagram,memo,weight_kg,likes_count,comments_count,last_comment,date,created_at,feed_type';
            // 공개 글과 내 글만 받는다. 서버 규칙은 관리자에게 남의 나만보기 글도 내주므로 여기서 거른다
            var myUid = (typeof window.okbmGetCurrentUserId === 'function') ? String(window.okbmGetCurrentUserId() || '').trim() : '';
            var visibleParam = myUid
              ? '&or=(is_published.eq.true,user_id.eq.' + encodeURIComponent(myUid) + ')'
              : '&is_published=eq.true';
            var headers = {
              'apikey': targetKey,
              'Authorization': 'Bearer ' + targetKey,
              'Content-Type': 'application/json'
            };
            function fetchFeeds(url) {
              return (typeof window.okbmPublicFetch === 'function'
                ? window.okbmPublicFetch(url)
                : fetch(url, { headers: headers })).then(function(res) {
                return res.ok ? res.json() : [];
              }).catch(function() { return []; });
            }
            try {
              // spot_id 조회와 레거시(spot_id 없음) 이름 조회는 서로 독립이라 동시에 보낸다.
              // 레거시는 산 이름 후보만 가져온 뒤 지역 필터로 거른다.
              var feedResults = await Promise.all([
                sId
                  ? fetchFeeds(
                    targetUrl + '/rest/v1/feeds?select=' + selectCols +
                    '&spot_id=eq.' + encodeURIComponent(sId) +
                    '&feed_type=neq.snap' + visibleParam + '&order=created_at.desc&limit=40'
                  )
                  : Promise.resolve([]),
                spotMainName
                  ? fetchFeeds(
                    targetUrl + '/rest/v1/feeds?select=' + selectCols +
                    '&spot_id=is.null&spot=ilike.*' + encodeURIComponent(spotMainName) +
                    '*&feed_type=neq.snap' + visibleParam + '&order=created_at.desc&limit=40'
                  )
                  : Promise.resolve([])
              ]);
              var byId = feedResults[0];
              var byName = feedResults[1];
              var merged = [];
              var seen = new Set();
              (Array.isArray(byId) ? byId : []).concat(Array.isArray(byName) ? byName : []).forEach(function(f) {
                if (!f || !f.id) return;
                var fid = String(f.id);
                if (seen.has(fid)) return;
                seen.add(fid);
                merged.push(f);
              });
              var validFeeds = filterFeedsForMapSpot(spot, merged).slice(0, 6);
              limitedMapSet(window.__spotFeedsCache, sId || spotMainName, validFeeds, 50);
              return validFeeds;
            } catch (e) {
              return [];
            }
          };
        });
      }

      document.addEventListener('DOMContentLoaded', () => {
        initStaticVectors();
        initMapEngine();
        initMapBottomStrip();
        if (typeof updateHeaderAuthUI === 'function') updateHeaderAuthUI();
        if (typeof trackDailyVisit === 'function') trackDailyVisit();
       if (window.innerWidth <= 768) {
          isSidebarCollapsed = true;
          const sidebar = document.getElementById('sidebar');
          if (sidebar) sidebar.classList.add('collapsed');
          updateDockSidebarText(false);
        } else { updateSmartResetButtons(); }
        
        initBottomSheetSwipeGesture();

        try {
          if (isUserLoggedIn()) {
            var userId = (typeof window.okbmGetCurrentUserId === 'function')
              ? String(window.okbmGetCurrentUserId() || '').trim()
              : '';
            if (!userId) {
              if (typeof window.okbmRequireCurrentUserId === 'function') window.okbmRequireCurrentUserId();
            } else if (window.RomanticVault && typeof window.RomanticVault.hydrateFromServer === 'function') {
              window.RomanticVault.hydrateFromServer(userId).then(function(cloudData) {
                if (cloudData) {
                  userBookmarks = new Set((safeGetJSON('okbm_bookmarks', [])).map(String));
                  userVisited = new Set((safeGetJSON('okbm_visited', [])).map(String));
                  userMemos = safeGetJSON('okbm_memos', {});
                  renderSubChips();
                  if (isKakaoMapReady()) {
                    renderSpots();
                    refreshCurrentSpotPopup();
                  } else {
                    window.__pendingRenderSpots = true;
                  }
                }
              }).catch(function(e) { console.warn('[map.html:hydrateFromServer]', e); });
            }
          }
        } catch (syncErr) { console.warn('[map.html:DOMContentLoaded:syncUserData]', syncErr); }
 
        document.addEventListener('click', (e) => {
          const pcDrop = document.getElementById('pcSearchDropdown');
          const pcInput = document.getElementById('pcSearchInput');
          if (pcDrop && !pcDrop.contains(e.target) && e.target !== pcInput) pcDrop.style.display = 'none';
        });
      });

    function zoomInMap(e) { 
        if (e) e.stopPropagation(); 
        if (map) {
          clearTimeout(lodDebounceTimer);
          map.setLevel(Math.max(1, map.getLevel() - 1), { animate: { duration: 250 } }); 
        }
      }
      function zoomOutMap(e) { 
        if (e) e.stopPropagation(); 
        if (map) {
          clearTimeout(lodDebounceTimer);
          map.setLevel(Math.min(14, map.getLevel() + 1), { animate: { duration: 250 } }); 
        }
      }

      // 지도 종류(하단 줄 세 번째 칸): 누를 때마다 일반 → 위성 → 지형도. 사진지도가 켜져 있으면 끄고 바꾼다.
      function toggleMapTypeMode() {
        if (!map) return;
        setMapLayerState((mapBaseLayer + 1) % 3);
      }

      // 낭만리포트 '포토맵 열기'(my-report.js): 지도 페이지에서는 그 자리에서 사진 지도를 연다. 열었으면 true
      window.okbmOpenPhotoMap = function() {
        if (!map || !window.okbmPhotoMap) return false;
        if (currentMapLayerState !== 3) togglePhotoMap();
        return true;
      };
      // 홈에서 넘어온 map.html?pm=open: 지도가 준비되면 사진 지도를 연다
      (function() {
        try { if (new URLSearchParams(window.location.search).get('pm') !== 'open') return; } catch (e) { return; }
        var tries = 0;
        (function go() {
          if (window.okbmOpenPhotoMap()) return;
          if (++tries < 60) setTimeout(go, 250);
        })();
      })();

      var photoMapOpenedAt = null;
      var mapBaseLayer = 0; // 0 일반 · 1 위성 · 2 지형도 (사진지도를 켜도 그대로 둔다)
      // 0 일반 · 1 위성 · 2 지형도 · 3 사진 지도(photo-map.js, 카카오 지도 위를 덮는 시·군·박지 사진 지도)
      // view: 사진 지도를 이 범위로 연다(정보창에서 돌아올 때). 없으면 기본 지도가 보던 범위.
      function setMapLayerState(next, view) {
        if (!map) return;
        const wasPhoto = currentMapLayerState === 3;
        if (next === 3) photoMapReturnView = null;
        currentMapLayerState = next;
        if (next !== 3) mapBaseLayer = next;
        if (window.okbmPhotoMap && next !== 3) {
          // 사진 지도에서 보던 범위를 기본 지도가 이어받는다
          const v = wasPhoto && window.okbmPhotoMap.getView ? window.okbmPhotoMap.getView() : null;
          window.okbmPhotoMap.close();
          if (v && photoMapOpenedAt) {
            // 카카오 확대 단계는 한 칸에 두 배씩이라 범위 맞추기(setBounds)는 한 칸 멀어진다.
            // 열 때 단계에서 사진 지도에서 확대한 만큼만 단계를 바꾸고, 가운데를 옮긴다.
            const ratio = photoMapOpenedAt.lngSpan / Math.max(1e-6, v.maxLng - v.minLng);
            const level = Math.max(1, Math.min(14, photoMapOpenedAt.level - Math.round(Math.log2(ratio))));
            map.setLevel(level, { animate: false });
            map.setCenter(new kakao.maps.LatLng((v.minLat + v.maxLat) / 2, (v.minLng + v.maxLng) / 2));
          }
        }
        if (next !== 3) {
          map.removeOverlayMapTypeId(kakao.maps.MapTypeId.TERRAIN);
          if (next === 1) map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);
          else map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
          if (next === 2) map.addOverlayMapTypeId(kakao.maps.MapTypeId.TERRAIN);
        } else {
          // 기본 지도가 보던 범위 그대로 사진 지도를 연다
          const b = map.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast();
          photoMapOpenedAt = { level: map.getLevel(), lngSpan: ne.getLng() - sw.getLng() };
          if (!view && typeof window.okbmMetric === 'function') window.okbmMetric('feat_pm_open'); // 포토맵 열기 (정보창에서 돌아오는 건 빼고)
          if (window.okbmPhotoMap) window.okbmPhotoMap.open(view || { minLat: sw.getLat(), minLng: sw.getLng(), maxLat: ne.getLat(), maxLng: ne.getLng() });
          try { localStorage.setItem('okbm_pm_seen', '1'); } catch (e) {}
        }
        updateMapBottomStrip();
      }

      function togglePhotoMap() {
        if (!map) return;
        setMapLayerState(currentMapLayerState === 3 ? mapBaseLayer : 3);
      }

      function updateMapBottomStrip() {
        const layerText = document.getElementById('mbsLayerText');
        if (layerText) layerText.textContent = ['일반', '위성', '지형도'][mapBaseLayer] || '일반';
        const photoBtn = document.getElementById('mbsPhotoBtn');
        if (photoBtn) photoBtn.classList.toggle('on', currentMapLayerState === 3);
        const photoText = document.getElementById('mbsPhotoText');
        if (photoText) photoText.textContent = currentMapLayerState === 3 ? '박지지도' : '포토맵';
        const dot = document.getElementById('mbsPhotoNew');
        if (dot) { var seen = false; try { seen = localStorage.getItem('okbm_pm_seen') === '1'; } catch (e) {} dot.hidden = seen; }
      }

      // 하단 한 줄과 검색창 필터 버튼을 연결한다(인라인 핸들러를 쓰지 않아 CSP 해시가 늘지 않는다)
      function initMapBottomStrip() {
        const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
        on('mbsPhotoBtn', function() { triggerHaptic(15); togglePhotoMap(); });
        on('mbsListBtn', function() { if (currentMapLayerState === 3) setMapLayerState(mapBaseLayer); toggleMobileSidebar(); });
        on('mbsLayerBtn', function() { triggerHaptic(10); toggleMapTypeMode(); });
        on('mbsLocateBtn', function(e) { if (currentMapLayerState === 3) setMapLayerState(mapBaseLayer); locateUserPosition(e); });
        on('mbsFoldBtn', function() { handleSmartResetClick(); });
        on('mbsBackMapBtn', function() { setMobileSidebarCollapsed(true); });
        on('mbsTopBtn', function() {
          let el = document.getElementById('spotList');
          while (el && el !== document.body && el.scrollHeight <= el.clientHeight + 2) el = el.parentElement;
          if (el && el !== document.body) el.scrollTo({ top: 0, behavior: 'smooth' });
        });
        on('mapFilterBtn', function(e) { e.preventDefault(); e.stopPropagation(); openMapFilterSheet(); });
        updateMapBottomStrip();
        updateMapFilterBtn();
      }

      // ---------------- 필터 판 (검색창의 "필터" 버튼) ----------------
      // 난이도·장소·내 기록을 한 판에서 고른다. 한 묶음에 하나씩, 고른 것을 다시 누르면 풀린다.
      const MAP_FILTER_GROUPS = [
        { key: 'diff', title: '난이도', opts: [['BEGINNER', '백보킹'], ['EASY', '쉬움'], ['MID', '보통'], ['HARD', '어려움']] },
        { key: 'terrain', title: '장소', opts: [['데크', '데크'], ['노지', '노지'], ['암릉', '암릉'], ['섬', '섬'], ['해변', '해변'], ['계곡', '계곡'], ['동굴', '동굴']] },
        { key: 'status', title: '내 기록', opts: [['BOOKMARK', '찜한 곳'], ['VISITED', '다녀온 곳']] }
      ];
      var mapFilterDraft = null;

      function mapFilterCount(d) {
        return (spots || []).filter(function(sp) {
          return sp && sp.lat && sp.lng && !BLOCKED_SPOT_IDS.has(String(sp.id).trim()) && hudFilterMatches(sp, d.diff, d.status, d.terrain) && listFilterMatches(sp);
        }).length;
      }

      function mapFilterEls() {
        let dim = document.getElementById('mfDim'), sheet = document.getElementById('mfSheet');
        if (dim) return { dim: dim, sheet: sheet };
        dim = document.createElement('div'); dim.id = 'mfDim'; dim.className = 'mf-dim';
        sheet = document.createElement('div'); sheet.id = 'mfSheet'; sheet.className = 'mf-sheet notranslate';
        document.body.appendChild(dim); document.body.appendChild(sheet);
        dim.addEventListener('click', closeMapFilterSheet);
        sheet.addEventListener('click', function(e) {
          const o = e.target.closest('[data-mf-g]');
          if (o) {
            const g = o.getAttribute('data-mf-g'), v = o.getAttribute('data-mf-v');
            mapFilterDraft[g] = mapFilterDraft[g] === v ? 'ALL' : v;
            renderMapFilterSheet();
            return;
          }
          const act = e.target.closest('[data-mf-act]');
          if (!act) return;
          if (act.getAttribute('data-mf-act') === 'reset') {
            // 예전 지도의 "초기화"와 같다: 필터·목록 조건·검색을 모두 풀고 전국 화면으로
            closeMapFilterSheet();
            resetMapAll();
          } else {
            applyMapFilters(mapFilterDraft);
            closeMapFilterSheet();
          }
        });
        return { dim: dim, sheet: sheet };
      }

      function renderMapFilterSheet() {
        const els = mapFilterEls();
        const d = mapFilterDraft;
        const listLabel = listFilterLabel();
        els.sheet.innerHTML = '<div class="mf-grab"></div>' + (listLabel ? '<div class="mf-note">목록에서 고른 조건: <b>' + escapeHtml(listLabel) + '</b> · 초기화하면 함께 풀려요</div>' : '') + MAP_FILTER_GROUPS.map(function(g) {
          return '<div class="mf-g"><div class="mf-gt">' + g.title + '</div><div class="mf-opts">' + g.opts.map(function(o) {
            return '<button type="button" class="mf-o' + (d[g.key] === o[0] ? ' on' : '') + '" data-mf-g="' + g.key + '" data-mf-v="' + escapeHtml(o[0]) + '">' + o[1] + '</button>';
          }).join('') + '</div></div>';
        }).join('') + '<div class="mf-btns"><button type="button" data-mf-act="reset">초기화</button><button type="button" class="mf-apply" data-mf-act="apply">' + mapFilterCount(d) + '곳 보기</button></div>';
      }

      function openMapFilterSheet() {
        if (currentMapLayerState === 3) setMapLayerState(mapBaseLayer);
        mapFilterDraft = { diff: currentHudFilterDiff, terrain: currentHudFilterTerrain, status: currentHudFilterStatus };
        // 예전 상태 값(HOT·NEW·초보)은 판에 없으니 풀어서 보여 준다
        if (['BOOKMARK', 'VISITED'].indexOf(mapFilterDraft.status) === -1) mapFilterDraft.status = 'ALL';
        renderMapFilterSheet();
        const els = mapFilterEls();
        els.dim.style.display = 'block'; els.sheet.style.display = 'block';
      }

      function closeMapFilterSheet() {
        const dim = document.getElementById('mfDim'), sheet = document.getElementById('mfSheet');
        if (dim) dim.style.display = 'none';
        if (sheet) sheet.style.display = 'none';
      }

      function applyMapFilters(d) {
        currentHudFilterDiff = d.diff; currentHudFilterTerrain = d.terrain; currentHudFilterStatus = d.status;
        renderSpots();
        updateMapFilterBtn();
      }

      function updateMapFilterBtn() {
        const n = [currentHudFilterDiff, currentHudFilterTerrain, currentHudFilterStatus].filter(function(v) { return v !== 'ALL'; }).length + (listFilterLabel() ? 1 : 0);
        const btn = document.getElementById('mapFilterBtn'), cnt = document.getElementById('mapFilterCnt');
        if (btn) btn.classList.toggle('act', n > 0);
        if (cnt) { cnt.hidden = n === 0; cnt.textContent = String(n); }
      }

      // 사진 지도에서 "박지 정보 보기": 일반 지도로 돌아가 그 박지를 연다.
      // 사진 지도에서 보던 범위를 기억해 두고, 그 정보창을 닫으면(✕·뒤로 가기·지도 빈 곳) 그 자리로 사진 지도를 다시 연다.
      var photoMapReturnView = null;
      window.okbmPhotoMapGoToSpot = function(spot) {
        const back = window.okbmPhotoMap && window.okbmPhotoMap.getView ? window.okbmPhotoMap.getView() : null;
        setMapLayerState(0);
        if (!spot) return;
        if (map && spot.lat && spot.lng) {
          map.setLevel(8, { animate: false });
          map.setCenter(new kakao.maps.LatLng(spot.lat, spot.lng));
        }
        focusSpotOnMap(spot);
        photoMapReturnView = back;
      };
      function returnToPhotoMapIfNeeded() {
        const v = photoMapReturnView;
        photoMapReturnView = null;
        if (v && currentMapLayerState !== 3) setMapLayerState(3, v);
      }

      function locateUserPosition(e) {
        if (e) e.stopPropagation();
        // 앱 안에서는 기기 위치 기능을 쓴다. 웹 위치 기능을 쓰면 아이폰이 앱 허락 창 뒤에 사이트 허락 창을 한 번 더 띄운다.
        const nativeGeo = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation;
        const useNativeGeo = !!(nativeGeo && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
        if (!useNativeGeo && !navigator.geolocation) return showToast('위치 서비스를 지원하지 않습니다.', { html: ICONS.ALERT_CARD });
        const getPosition = (onOk, onFail) => {
          if (useNativeGeo) nativeGeo.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 }).then(onOk, onFail);
          else navigator.geolocation.getCurrentPosition(onOk, onFail);
        };
        getPosition((pos) => {
          if (!map) return;
          const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          if (!userLocationOverlay) {
            const el = document.createElement('div');
            el.style.cssText = 'width:20px; height:20px; border-radius:50%; background:#0284c7; border:3px solid #fff; box-shadow:0 0 16px rgba(56,189,248,1);';
            userLocationOverlay = new kakao.maps.CustomOverlay({ map, position: loc, content: el, zIndex: 9999 });
          } else { userLocationOverlay.setPosition(loc); userLocationOverlay.setMap(map); }
          map.setLevel(7, { animate: true }); map.panTo(loc);
          showToast('현재 내 위치로 이동했습니다', { html: ICONS.PIN });
        }, () => showToast('GPS 권한을 허용해주세요', { html: ICONS.ALERT_CARD }));
      }

      function switchMasterTab(tabName) {
        currentMasterTab = tabName;
        document.querySelectorAll('.master-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeIdx = { 'REGION': 0, 'TERRAIN': 1, 'COURSE': 2, 'MY': 3 }[tabName];
        document.querySelectorAll('.master-tab-btn')[activeIdx].classList.add('active');
        renderSubChips(); renderSpots();
      }

      function renderSubChips() {
        const container = document.getElementById('subChipsBar');
        if (!container) return;
        container.innerHTML = '';
        if (currentMasterTab === 'REGION') {
          ['ALL', '서울/인천', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'].forEach(r => {
            const btn = document.createElement('button');
            btn.className = `filter-chip ${currentRegionFilter === r ? 'active' : ''}`;
            btn.innerHTML = `${r === 'ALL' ? '전체' : r}`;
            btn.onclick = () => {  currentRegionFilter = r; renderSubChips(); renderSpots(); };
            container.appendChild(btn);
          });
    
        } else if (currentMasterTab === 'TERRAIN') {
          [{ key: 'ALL', label: '전체' }, { key: '데크', label: `${ICONS.DECK}데크` }, { key: '암릉', label: `${ICONS.ROCK}암릉` }, { key: '노지', label: `${ICONS.SOIL}노지` }, { key: '해변', label: `${ICONS.BEACH}해변` }, { key: '섬', label: `${ICONS.ISLAND}섬` }, { key: '계곡', label: `${ICONS.VALLEY}계곡` }, { key: '동굴', label: `${ICONS.CAVE}동굴` }].forEach(t => {
            const btn = document.createElement('button');
            btn.className = `filter-chip ${currentTerrainFilter === t.key ? 'active' : ''}`;
            btn.innerHTML = t.label;
            btn.onclick = () => {  currentTerrainFilter = t.key; renderSubChips(); renderSpots(); };
            container.appendChild(btn);
          });
        } else if (currentMasterTab === 'COURSE') {
          [{ key: 'ALL', label: '전체' }, { key: 'BEGINNER', label: `${ICONS.MOUNTAIN}초보코스` }, { key: 'HOT', label: `HOT` }, { key: 'NEW', label: `NEW` }].forEach(c => {
            const btn = document.createElement('button');
            btn.className = `filter-chip chip-status ${currentCourseFilter === c.key ? 'active' : ''}`;
            btn.innerHTML = c.label;
            btn.onclick = () => {  currentCourseFilter = c.key; renderSubChips(); renderSpots(); };
            container.appendChild(btn);
          });
        } else if (currentMasterTab === 'MY') {
          const validBookmarks = spots.filter(s => userBookmarks.has(String(s.id).trim())).length;
          const validVisited = spots.filter(s => userVisited.has(String(s.id).trim())).length;
          const myTotalCount = spots.filter(s => userBookmarks.has(String(s.id).trim()) || userVisited.has(String(s.id).trim())).length;

          [{ key: 'ALL', label: `전체 (${myTotalCount})` }, { key: 'BOOKMARK', label: `${ICONS.HEART}찜 (${validBookmarks})` }, { key: 'VISITED', label: `${ICONS.FLAG}클리어 (${validVisited})` }].forEach(m => {
            const btn = document.createElement('button');
            btn.className = `filter-chip ${currentMyFilter === m.key ? 'active' : ''}`;
            btn.innerHTML = m.label;
            btn.onclick = () => {  currentMyFilter = m.key; renderSubChips(); renderSpots(); };
            container.appendChild(btn);
          });
        }
      }

      function compactSpotFocusKey(str) {
        return String(str || '')
          .replace(/[()[\]]/g, ' ')
          .replace(/\d+\s*m\b/gi, ' ')
          .replace(/특별자치시|특별자치도|광역시|특별시/g, '')
          .replace(/([가-힣]{2,})(시|군|구)/g, '$1')
          .replace(/[\s\-_,./·]/g, '')
          .toLowerCase()
          .trim();
      }

      function findSpotByFocusQuery(list, query) {
        if (typeof window.okbmFindSpotByFocusQuery === 'function') {
          return window.okbmFindSpotByFocusQuery(list, query);
        }
        var q = compactSpotFocusKey(query);
        if (!q || q.length < 2) return null;
        var arr = Array.isArray(list) ? list : [];
        var best = null, bestScore = 0, bestMainLen = 0;
        for (var i = 0; i < arr.length; i++) {
          var s = arr[i];
          if (!s) continue;
          var main = compactSpotFocusKey(s.spot_main || s.name || '');
          var hay = compactSpotFocusKey([s.fullName, s.spot_main, s.name, s.spot_sub, s.cityName, s.region].filter(Boolean).join(' '));
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
      }

      function clearPendingMapFocus() {
        if (window.__okbmSpotFocusTimer) {
          clearTimeout(window.__okbmSpotFocusTimer);
          window.__okbmSpotFocusTimer = null;
        }
        try {
          sessionStorage.removeItem('okbm_pending_map_id');
          sessionStorage.removeItem('okbm_pending_map_spot');
          sessionStorage.removeItem('okbm_target_spot');
          sessionStorage.removeItem('okbm_target_map_spot');
          localStorage.removeItem('okbm_target_spot');
          localStorage.removeItem('okbm_target_map_spot');
        } catch (e) {}
      }

     function checkUrlParamSpotFocus() {
        if (window.__okbmSpotFocusRan) return;
        const urlParams = new URLSearchParams(window.location.search);
        let targetName = urlParams.get('spot') || urlParams.get('q');
        let targetId = urlParams.get('id');
        try {
          if (!targetId) targetId = sessionStorage.getItem('okbm_pending_map_id') || '';
          if (!targetName) targetName = sessionStorage.getItem('okbm_pending_map_spot') || '';
          // 비회원 때 누른 박지: 로그인하고 돌아왔을 때만 연다
          if (!isGuestViewer()) {
            if (!targetId) targetId = sessionStorage.getItem('okbm_login_return_spot') || '';
            sessionStorage.removeItem('okbm_login_return_spot');
          }
        } catch (e) {}
        if (!spots || spots.length === 0) return;

        if (!targetId && !targetName) {
          clearPendingMapFocus();
          return;
        }

        // 1순위: 고유 ID로 1:1 직통 포커스 (동명 산 혼선 0% 차단)
        function consumeMapFocusQuery() {
          try {
            var params = new URLSearchParams(window.location.search);
            if (!params.has('id') && !params.has('spot') && !params.has('q')) return;
            params.delete('id');
            params.delete('spot');
            params.delete('q');
            var qs = params.toString();
            var next = window.location.pathname + (qs ? '?' + qs : '') + (window.location.hash || '');
            window.history.replaceState({}, '', next);
          } catch (e2) {}
        }

        if (targetId) {
          const matchedById = spots.find(s => String(s.id).trim() === String(targetId).trim());
          if (matchedById) {
            window.__okbmSpotFocusRan = true;
            clearPendingMapFocus();
            consumeMapFocusQuery();
            window.__okbmSpotFocusTimer = setTimeout(() => {
              window.__okbmSpotFocusTimer = null;
              openSpotFromLink(matchedById);
            }, 350);
            return;
          }
        }

        // 2순위: 시군+산명 피드명도 DB 산명(울업산) / fullName([가평군] 울업산)에 붙는다
        if (targetName) {
          const found = findSpotByFocusQuery(spots, targetName);
          if (found) {
            window.__okbmSpotFocusRan = true;
            clearPendingMapFocus();
            consumeMapFocusQuery();
            window.__okbmSpotFocusTimer = setTimeout(() => {
              window.__okbmSpotFocusTimer = null;
              openSpotFromLink(found);
            }, 350);
            return;
          }
        }
        clearPendingMapFocus();
      }

    function checkAdminAuthorization() {
        // 서버에서 확인한 메모리 플래그만. localStorage 프로필의 role/isAdmin은 무시.
        if (typeof window.okbmIsCurrentUserAdmin === 'function' && window.okbmIsCurrentUserAdmin()) return true;
        return window.__okbmIsAdmin === true;
      }

      function applyAdminMarkerDragState() {
        var movingId = String(window.__adminPinMoveSpotId || '').trim();
        var picking = !!isPickingLocationMode;
        if (document.body) document.body.classList.toggle('okbm-admin-pin-picking', picking);
        spotNativeMarkerMap.forEach(function(marker, id) {
          if (!marker) return;
          var isTarget = !!movingId && String(id).trim() === movingId;
          if (typeof marker.setDraggable === 'function') {
            marker.setDraggable(isTarget);
          }
          if (typeof marker.setClickable === 'function') {
            marker.setClickable(!picking);
          }
        });
        if (picking) {
          spotLabelOverlayMap.forEach(function(overlay) {
            if (overlay && overlay.getMap()) overlay.setMap(null);
          });
        } else if (typeof updateLODLabels === 'function') {
          updateLODLabels();
        }
      }

      function applyAdminPermissions(enable) {
        var nextAdmin = !!enable && checkAdminAuthorization();
        var modeChanged = nextAdmin !== isAdminMode;
        isAdminMode = nextAdmin;
        window.isAdminMode = isAdminMode;
        
        const tools = document.getElementById('adminDataTools');
        if (tools) tools.style.display = isAdminMode ? 'flex' : 'none';

        document.querySelectorAll('.btn-del, .btn-edit, .btn-quick-add').forEach(btn => {
          btn.style.display = isAdminMode ? 'inline-block' : 'none';
        });

        const verBtn = document.getElementById('versionTagBtn');
        if (verBtn) {
          verBtn.innerText = isAdminMode ? '6.2ver Master (관리)' : '6.2ver Master';
          verBtn.classList.toggle('is-admin-on', isAdminMode);
          verBtn.style.color = isAdminMode ? 'var(--accent-silver)' : 'var(--text-muted)';
        }

        applyAdminMarkerDragState();
        if (modeChanged) {
          if (typeof isKakaoMapReady === 'function' && isKakaoMapReady()) renderSpots(true);
          else window.__pendingRenderSpots = 'force';
        }
      }
      window.applyAdminPermissions = applyAdminPermissions;

      function toggleAdminMode() {
        if (!checkAdminAuthorization()) return;
        applyAdminPermissions(!isAdminMode);
        if (isKakaoMapReady()) renderSpots(true);
        else window.__pendingRenderSpots = 'force';
        if (currentActiveSpot) refreshCurrentSpotPopup();
      }

      function handleVersionTagAdminClick() {
        toggleAdminMode();
      }

      window.bootMapAdminTools = async function() {
        if (window.__okbmMapAdminBooting) return;
        window.__okbmMapAdminBooting = true;
        // 서버 확인 전에는 관리 도구를 켜지 않음.
        applyAdminPermissions(false);
        var isAdmin = false;
        if (typeof window.okbmRefreshAdminFlagFromServer === 'function') {
          try { isAdmin = await window.okbmRefreshAdminFlagFromServer(); } catch (e) { isAdmin = false; }
        } else {
          isAdmin = checkAdminAuthorization();
        }
        applyAdminPermissions(false);
        applyAdminMarkerDragState();
        // 목록 위 판 번호 표시는 관리자 모드를 켜는 버튼이라 관리자로 확인된 계정에만 보인다(일반 회원에겐 뜻 없는 글자)
        var verTag = document.getElementById('versionTagBtn');
        if (verTag) verTag.hidden = !isAdmin;
        var params = new URLSearchParams(window.location.search);
        if (isAdmin && params.get('open') === 'admin_inbox' && typeof window.openAdminSpotInbox === 'function') {
          setTimeout(function() { window.openAdminSpotInbox(); }, 350);
        }
      };

      

      function areAllRegionAccordionsClosed() {
        const groups = document.querySelectorAll('.region-group');
        if (groups.length === 0) return true;
        let allClosed = true;
        groups.forEach(g => { const c = g.querySelector('.region-items-container'); if (c && c.style.display !== 'none') allClosed = false; });
        return allClosed;
      }
      function collapseAllRegionAccordions() {
        document.querySelectorAll('.region-group').forEach(group => {
          const container = group.querySelector('.region-items-container'), titleSpan = group.querySelector('.region-group-title span:last-child'), title = group.querySelector('.region-group-title');
          if (container) container.style.display = 'none';
          if (titleSpan) { const countText = titleSpan.innerText.replace(/[▼▶]/g, '').trim(); titleSpan.innerHTML = `${countText} ▶`; }
          if (title) title.style.borderLeftColor = 'transparent';
        });
      }
      function expandAllRegionAccordions() {
        document.querySelectorAll('.region-group').forEach(group => {
          const container = group.querySelector('.region-items-container'), titleSpan = group.querySelector('.region-group-title span:last-child'), title = group.querySelector('.region-group-title');
          if (container) container.style.display = 'block';
          if (titleSpan) { const countText = titleSpan.innerText.replace(/[▼▶]/g, '').trim(); titleSpan.innerHTML = `${countText} <b style="color:var(--accent-blue);">▼</b>`; }
          if (title) title.style.borderLeftColor = '#0f766e';
        });
      }

function updateSmartResetButtons() {
        const isMobile = window.innerWidth <= 768;
        const isListOpen = isMobile ? !isSidebarCollapsed : true;
        const allClosed = areAllRegionAccordionsClosed();
        let labelText = isListOpen ? (allClosed ? '모두 열기' : '모두 닫기') : '초기화';
        const pcResetText = document.getElementById('pcResetMapBtnText'), dockResetText = document.getElementById('mbsFoldText');
        if (pcResetText) pcResetText.innerText = labelText;
        if (dockResetText) dockResetText.innerText = labelText;
      }

      function handleSmartResetClick() {
        triggerHaptic(20);
        const isMobile = window.innerWidth <= 768;
        const isListOpen = isMobile ? !isSidebarCollapsed : true;
        if (isListOpen && document.querySelectorAll('.region-group').length > 0) {
          if (areAllRegionAccordionsClosed()) expandAllRegionAccordions();
          else collapseAllRegionAccordions();
          updateSmartResetButtons();
          return;
        }
        resetMapAll();
      }

      function resetMapAll() {
        currentHudFilterDiff = 'ALL'; currentHudFilterStatus = 'ALL'; currentHudFilterTerrain = 'ALL';
        cycleDiffIdx = 0; cycleStatusIdx = 0; cycleTerrainIdx = 0;
        updateMapFilterBtn();
        currentRegionFilter = 'ALL'; currentTerrainFilter = 'ALL'; currentCourseFilter = 'ALL'; currentMyFilter = 'ALL';
        currentMasterTab = 'REGION';

        const btnDiff = document.getElementById('btnCycleDifficulty');
        const btnStatus = document.getElementById('btnCycleStatus');
        const btnTerrain = document.getElementById('btnCycleTerrain');
        if (btnDiff) { btnDiff.className = 'tower-toggle-btn'; document.getElementById('iconCycleDifficulty').innerHTML = ICONS.ROCK; document.getElementById('labelCycleDifficulty').innerText = '난이도'; }
        if (btnStatus) { btnStatus.className = 'tower-toggle-btn'; document.getElementById('iconCycleStatus').innerHTML = ICONS.FAST; document.getElementById('labelCycleStatus').innerText = '상태'; }
        if (btnTerrain) { btnTerrain.className = 'tower-toggle-btn'; document.getElementById('iconCycleTerrain').innerHTML = ICONS.DECK; document.getElementById('labelCycleTerrain').innerText = '지형'; }

        clearSearchInput('pc', false);
        closeAllPopups();
        spotLabelOverlayMap.forEach((overlay) => {
          if (overlay && overlay.getMap()) overlay.setMap(null);
        });
        switchMasterTab('REGION');
        renderSubChips(); renderSpots();
        if (map) { map.setLevel(NATIONWIDE_LEVEL, { animate: true }); map.panTo(new kakao.maps.LatLng(NATIONWIDE_CENTER.lat, NATIONWIDE_CENTER.lng)); }
      }

      function toggleMobileSidebar() {
        photoMapReturnView = null; // 목록을 열면 사진 지도로 돌아가지 않는다
        setMobileSidebarCollapsed(!isSidebarCollapsed);
        if (!isSidebarCollapsed) closeMobileBottomSheet();
      }
      function updateDockSidebarText(isOpen) {
        // 모바일에서 목록이 열리면 하단 줄이 목록용(모두 닫기 | 지도 보기 | 맨 위로)으로 바뀐다
        const listMode = isOpen && window.innerWidth <= 768;
        const mapRow = document.getElementById('mbsMapRow'), listRow = document.getElementById('mbsListRow');
        if (mapRow) mapRow.hidden = listMode;
        if (listRow) listRow.hidden = !listMode;
        updateSmartResetButtons();
      }

      function spotRecencyValue(spot) {
        var t = Date.parse(spot && spot.created_at);
        if (isFinite(t)) return t;
        var n = Number(spot && spot.id);
        if (isFinite(n)) return n;
        return Number(spot && spot.sheetIndex) || 0;
      }

      function updateNewSpotFlags(spotList) {
        if (!spotList || spotList.length === 0) return;
        const sorted = [...spotList].sort((a, b) => spotRecencyValue(b) - spotRecencyValue(a));
        const top30Ids = new Set(sorted.slice(0, 30).map(s => String(s.id).trim()));
        spotList.forEach(s => s.isNew = top30Ids.has(String(s.id).trim()));
      }
      

      // 목록·상세에 숫자만 저장된 거리·고도는 단위가 없어 '↗ 2.2', '(⛰ 120)'처럼 무슨 숫자인지 몰랐다. 숫자만이면 km·m를 붙인다
      function okbmSpotDistLabel(v) {
        var t = String(v == null ? '' : v).trim();
        return /^\d+(\.\d+)?$/.test(t) ? t + 'km' : t;
      }
      function okbmSpotElevLabel(v) {
        var t = String(v == null ? '' : v).trim();
        return /^\d+(\.\d+)?$/.test(t) ? t + 'm' : t;
      }

      function parseSpotDistanceKm(spot) {
        var raw = spot && (spot.distance != null && String(spot.distance).trim() !== '' ? spot.distance : spot.distance_km);
        if (raw == null || String(raw).trim() === '') return null;
        var m = String(raw).match(/(\d+(?:\.\d+)?)/);
        if (!m) return null;
        var km = parseFloat(m[1]);
        return isFinite(km) ? km : null;
      }

      function isTraverseCourseSpot(spot) {
        if (!spot) return false;
        if (String(spot.courseType || '').trim() === '종주') return true;
        var hay = [spot.fullName, spot.name, spot.spot_main, spot.spot_sub].filter(Boolean).join(' ');
        return /종주/.test(hay);
      }

      // 목록 위쪽 탭(지역별·지형별·코스별·마이보관)에서 고른 조건. 지도에도 적용된다.
      function listFilterMatches(spot) {
        const sId = String(spot.id).trim();
        if (currentMasterTab === 'REGION') {
          const regKey = normalizeTo10Regions(spot.region);
          if (currentRegionFilter !== 'ALL' && regKey !== (currentRegionFilter === '서울인천' ? '서울/인천' : currentRegionFilter)) return false;
        } else if (currentMasterTab === 'TERRAIN') {
          if (currentTerrainFilter !== 'ALL' && !(spot.terrain || []).some(t => t.includes(currentTerrainFilter))) return false;
        } else if (currentMasterTab === 'COURSE') {
          if (currentCourseFilter === 'BEGINNER' && !isBeginnerCourseSpot(spot)) return false;
          if (currentCourseFilter === 'HOT' && getSpotViews(spot) < 5) return false;
          if (currentCourseFilter === 'NEW' && !spot.isNew) return false;
        } else if (currentMasterTab === 'MY') {
          if (currentMyFilter === 'ALL' && (!userBookmarks.has(sId) && !userVisited.has(sId))) return false;
          if (currentMyFilter === 'BOOKMARK' && !userBookmarks.has(sId)) return false;
          if (currentMyFilter === 'VISITED' && !userVisited.has(sId)) return false;
        }
        return true;
      }

      // 목록에서 고른 조건을 사람 말로(없으면 ''). 필터 버튼 숫자와 필터 판 안내에 쓴다.
      function listFilterLabel() {
        if (currentMasterTab === 'REGION') return currentRegionFilter !== 'ALL' ? currentRegionFilter : '';
        if (currentMasterTab === 'TERRAIN') return currentTerrainFilter !== 'ALL' ? currentTerrainFilter : '';
        if (currentMasterTab === 'COURSE') return ({ BEGINNER: '초보 코스', HOT: '인기', NEW: '신규' })[currentCourseFilter] || '';
        if (currentMasterTab === 'MY') return ({ ALL: '마이보관', BOOKMARK: '찜', VISITED: '클리어' })[currentMyFilter] || '마이보관';
        return '';
      }

      // 지도 필터(난이도·장소·내 기록) 판정. renderSpots와 필터 판의 "N곳 보기" 개수가 같은 규칙을 쓴다.
      // 난이도 BEGINNER = 백보킹(초보 코스). 상태의 HOT·NEW·BEGINNER는 예전 값이 남아 있을 때를 위해 둔다.
      function hudFilterMatches(spot, diff, status, terrain) {
        const sId = String(spot.id).trim();
        const diffNum = parseInt(spot.difficulty, 10) || 3;
        if (diff !== 'ALL') {
          if (diff === 'BEGINNER') { if (!isBeginnerCourseSpot(spot)) return false; }
          else if (diff === 'EASY' && diffNum > 2) return false;
          else if (diff === 'MID' && diffNum !== 3) return false;
          else if (diff === 'HARD' && diffNum < 4) return false;
        }
        if (status !== 'ALL') {
          if (status === 'BOOKMARK' && !userBookmarks.has(sId)) return false;
          if (status === 'VISITED' && !userVisited.has(sId)) return false;
          if (status === 'HOT' && getSpotViews(spot) < 5) return false;
          if (status === 'NEW' && !spot.isNew) return false;
          if (status === 'BEGINNER' && !isBeginnerCourseSpot(spot)) return false;
        }
        if (terrain !== 'ALL') {
          const tList = spot.terrain || [];
          const combinedDesc = ((spot.desc || '') + ' ' + (spot.name || '')).toLowerCase();
          if (terrain === '동굴') {
            if (!tList.includes('동굴') && !combinedDesc.includes('동굴') && !combinedDesc.includes('굴')) return false;
          } else if (!tList.some(t => t.includes(terrain))) return false;
        }
        return true;
      }

      // 백보킹: 주차하고 5~10분만 걸으면 닿는 곳. 난이도 1 + (걷는 거리 0.5km 이하 또는 코스가 '차량접근')
      // (2026-10-25: 난이도 2까지 넣으니 가거도 독실산처럼 힘든 곳이 섞였다. 거리 0은 모르는 값이라 차량접근일 때만 넣는다)
      // index-main.js getSecretSpotThemeFlags의 isBaekbo(테마 스팟 백보킹)와 같은 기준
      var BEGINNER_MAX_KM = 0.5;
      function isBeginnerCourseSpot(spot) {
        if (!spot || isTraverseCourseSpot(spot)) return false;
        if (parseInt(spot.difficulty, 10) !== 1) return false;
        if (String(spot.courseType || spot.course_type || '').trim() === '차량접근') return true;
        var km = parseSpotDistanceKm(spot);
        return km != null && km > 0 && km <= BEGINNER_MAX_KM;
      }

      function isCampBanned(spot) {
        return !!spot && String(spot.camp_status || '').trim() === 'banned';
      }
      window.okbmIsCampBanned = isCampBanned;

      function campBanBadgeHtml(spot) {
        return isCampBanned(spot)
          ? '<span class="badge-status" style="background:rgba(244,63,94,0.18); color:#fda4af; border:1px solid rgba(244,63,94,0.45);">🚫 야영금지</span>'
          : '';
      }

      function campBanBannerHtml(spot) {
        if (!isCampBanned(spot)) return '';
        var rules = [
          ['1. 사전에 계획하고 준비하기', '방문 지역의 규제와 기상을 미리 확인합니다.'],
          ['2. 지정된 구역에서 야영하기', '금지 구역에서는 텐트를 치지 않습니다.'],
          ['3. 발생한 쓰레기는 완벽하게 회수하기', '가져온 물건과 음식물은 모두 되가져옵니다.'],
          ['4. 남겨진 자연물 및 문화재 보존하기', '돌과 식물은 채취하지 않고 눈으로만 봅니다.'],
          ['5. 산림 내 화기 사용 금지', '취사와 흡연 등 불을 쓰지 않습니다.'],
          ['6. 야생동물 보호하기', '먹이를 주지 않고 음식물은 밀폐해 둡니다.'],
          ['7. 다른 방문객을 배려하기', '큰 소음과 과도한 조명을 자제합니다.']
        ];
        var list = rules.map(function(r) {
          return '<div style="margin-top:6px;"><div style="font-weight:800; color:#fecdd3;">' + r[0] + '</div><div style="color:#fda4af;">' + r[1] + '</div></div>';
        }).join('');
        return '<div style="margin:6px 0 4px; padding:11px 12px; border-radius:10px; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.45); color:#fecdd3; font-size:0.74rem; line-height:1.45;">' +
          '<div style="font-weight:900; color:#fb7185; font-size:0.9rem;">🚫 야영이 금지되었습니다</div>' +
          '<div style="margin-top:4px; font-size:0.84rem; font-weight:800;">소중한 박지를 보호하기 위해 LNT 원칙을 꼭 지켜주세요.</div>' +
          list +
        '</div>';
      }

      window.setSpotCampBan = async function(spotId, banned, note) {
        var sId = String(spotId || '').trim();
        var spot = (spots || []).find(function(s) { return String(s.id).trim() === sId; });
        if (!spot) return false;
        var cfg = getSupabaseRestConfig();
        var headers = (typeof window.okbmWriteHeaders === 'function') ? window.okbmWriteHeaders({ Prefer: 'return=minimal' }) : null;
        if (!cfg.url || !headers) return false;
        var payload = banned
          ? { camp_status: 'banned', camp_status_note: String(note || '').trim().slice(0, 200) || null, camp_status_at: new Date().toISOString().slice(0, 10) }
          : { camp_status: null, camp_status_note: null, camp_status_at: null };
        try {
          var res = await fetch(cfg.url + '/rest/v1/spots?id=eq.' + encodeURIComponent(sId), {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(payload)
          });
          if (!res.ok) return false;
        } catch (e) {
          console.warn('[map.html:setSpotCampBan]', e);
          return false;
        }
        Object.assign(spot, payload);
        persistSpotsCache();
        renderSpots(true);
        refreshCurrentSpotPopup();
        return true;
      };

      window.toggleSpotCampBanById = async function(spotId, e) {
        if (e) e.stopPropagation();
        if (!checkAdminAuthorization()) return;
        var sId = String(spotId || '').trim();
        var spot = (spots || []).find(function(s) { return String(s.id).trim() === sId; });
        if (!spot) return;
        var ok;
        if (isCampBanned(spot)) {
          if (!confirm('야영금지 표시를 해제할까요?')) return;
          ok = await window.setSpotCampBan(sId, false);
        } else {
          if (!confirm('이 장소를 야영금지로 표시할까요?\n뷰·유튜브 등 상세 내용이 가려지고 금지 안내와 LNT 원칙만 보입니다.')) return;
          ok = await window.setSpotCampBan(sId, true);
        }
        showToast(ok ? '야영금지 상태를 바꿨습니다.' : '변경에 실패했습니다.');
      };

      function getSpotStatusBadges(spot) {
        let html = campBanBadgeHtml(spot);
        if (isBeginnerCourseSpot(spot)) html += `<span class="badge-status" style="background:rgba(16,185,129,0.16); color:#6ee7b7; border:1px solid rgba(16,185,129,0.35);">${ICONS.MOUNTAIN}초보</span>`;
        else if (spot.courseType === '최단') html += `<span class="badge-status" style="background:rgba(16,185,129,0.16); color:#10b981; border:1px solid rgba(16,185,129,0.35);">${ICONS.FAST}최단</span>`;
        else if (spot.courseType === '종주') html += `<span class="badge-status" style="background:rgba(168,85,247,0.16); color:#a855f7; border:1px solid rgba(168,85,247,0.35);">${ICONS.HIKING}종주</span>`;
        if (getSpotViews(spot) >= 5) html += `<span class="badge-status badge-hot">HOT</span>`;
        if (spot.isNew) html += `<span class="badge-status badge-new">NEW</span>`;
        return html;
      }

      function calculateSunsetTime(lat, lng) {
        try {
          const now = new Date();
          const startOfYear = new Date(now.getFullYear(), 0, 0);
          const dayOfYear = Math.floor((now - startOfYear) / 86400000);
          const rad = Math.PI / 180;
          
          const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
          const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
          const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma);
          
          const cosH = (Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl))) - (Math.tan(lat * rad) * Math.tan(decl));
          if (cosH > 1 || cosH < -1) return null;
          
          const ha = Math.acos(cosH) / rad;
          const sunsetMin = 720 - 4 * (lng - 135) - eqtime + ha * 4;
          let hours = Math.floor(sunsetMin / 60);
          let minutes = Math.round(sunsetMin % 60);
          
          if (minutes >= 60) { hours += 1; minutes -= 60; }
          if (hours >= 24) hours -= 24;
          
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        } catch (e) {
          return null;
        }
      }

      function getDynamicTempSvg(temp) {
        const t = Number(temp) || 18;
        let color = '#fde047', fill = '#fde047';
        if (t <= 5) { color = '#38bdf8'; fill = '#38bdf8'; }
        else if (t >= 25) { color = '#f43f5e'; fill = '#f43f5e'; }

        return `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon" style="color:${color};"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/><circle cx="11.5" cy="17.5" r="2.2" fill="${fill}" stroke="none"/><path d="M11.5 8v6" stroke="${fill}" stroke-width="1.5"/></svg>`;
      }

      const weatherCache = new Map();
      async function loadLiveWeatherForSpot(spotId, lat, lng) {
        if (!lat || !lng) return;
        const sId = String(spotId).trim();
        const cacheKey = `okbm_weather_${sId}`;
        
        const memoryCached = weatherCache.get(sId);
        if (memoryCached && (Date.now() - memoryCached.time < 1800000)) {
          renderWeatherUI(sId, memoryCached.data);
          return;
        }

        try {
          const sessionItem = sessionStorage.getItem(cacheKey);
          if (sessionItem) {
            const parsed = JSON.parse(sessionItem);
            if (Date.now() - parsed.time < 1800000) {
              limitedMapSet(weatherCache, sId, parsed, 50);
              renderWeatherUI(sId, parsed.data);
              return;
            }
          }
        } catch (e) { console.warn('[map.html:loadLiveWeatherForSpot:session]', e); }
        
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m&wind_speed_unit=ms`);
          if (res.ok) {
            const data = await res.json();
            const wData = { temp: Math.round(data.current.temperature_2m), wind: Number(data.current.wind_speed_10m.toFixed(1)) };
            const cacheObj = { time: Date.now(), data: wData };
            limitedMapSet(weatherCache, sId, cacheObj, 50);
            try { sessionStorage.setItem(cacheKey, JSON.stringify(cacheObj)); } catch (e) {}
            renderWeatherUI(sId, wData);
          }
        } catch (e) {
          const el = document.getElementById(`liveWeatherBox_${sId}`);
          if (el) el.innerHTML = `<span class="weather-chip" style="color:var(--text-muted);">${ICONS.TEMP} 기상 연동 대기</span>`;
        }
      }

      function buildWeatherChipsHtml(wData) {
        const tempSvg = getDynamicTempSvg(wData.temp);
        const windClass = wData.wind <= 3.5 ? 'weather-wind-safe' : (wData.wind <= 6.5 ? 'weather-wind-warn' : 'weather-wind-danger');
        const windText = wData.wind <= 3.5 ? '안전' : (wData.wind <= 6.5 ? '주의' : '강풍주의');
        return `<span class="weather-chip">${tempSvg} ${wData.temp}℃</span><span class="weather-chip ${windClass}">${ICONS.WIND} 바람 ${wData.wind}m/s (${windText})</span>`;
      }

      function renderWeatherUI(spotId, wData) {
        const el = document.getElementById(`liveWeatherBox_${spotId}`);
        if (!el) return;
        el.innerHTML = buildWeatherChipsHtml(wData);
      }

      // 시트를 다시 그릴 때(상세 정보 도착, 찜 토글 등) 이미 받은 날씨를 바로 채운다.
      // 예전에는 '기상 대기'로 되돌아간 뒤 다시 요청하지 않아, 30분 안에 같은 스팟을 다시 열면 날씨가 멈춰 보였다.
      function cachedWeatherChipsHtml(spotId) {
        const cached = weatherCache.get(String(spotId).trim());
        if (cached && cached.data && (Date.now() - cached.time < 1800000)) {
          return buildWeatherChipsHtml(cached.data);
        }
        return `<span class="weather-chip">${ICONS.TEMP} 기상 대기</span>`;
      }

      async function getElevation(lat, lng) {
        if (!lat || !lng) return '';
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.elevation) && data.elevation.length > 0 && data.elevation[0] !== null) {
              return `${Math.round(data.elevation[0])}m`;
            }
          }
        } catch (e) {
        }
        return '';
      }

      const geocodeQueryCache = new Map();
      async function searchCoordsByQuery(query) {
        if (!query?.trim()) return null;
        const cleanQ = query.trim();
        if (geocodeQueryCache.has(cleanQ)) return geocodeQueryCache.get(cleanQ);
        return new Promise((resolve) => {
          if (!geocoder) return resolve(null);
          geocoder.addressSearch(cleanQ, (result, status) => {
            if (status === kakao.maps.services.Status.OK && result.length > 0) {
              const resObj = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), title: result[0].address_name };
              limitedMapSet(geocodeQueryCache, cleanQ, resObj, 100);
              resolve(resObj);
            } else {
              const places = new kakao.maps.services.Places();
              places.keywordSearch(cleanQ, (pResult, pStatus) => {
                if (pStatus === kakao.maps.services.Status.OK && pResult.length > 0) {
                  const resObj = { lat: parseFloat(pResult[0].y), lng: parseFloat(pResult[0].x), title: pResult[0].place_name, address: pResult[0].road_address_name || pResult[0].address_name };
                  limitedMapSet(geocodeQueryCache, cleanQ, resObj, 100);
                  resolve(resObj);
                } else { resolve(null); }
              });
            }
          });
        });
      }

      async function fetchElevationForModal() {
        let lat = modalPendingData.lat || (modalMode === 'EDIT' && spots[modalEditIndex] ? spots[modalEditIndex].lat : 0);
        let lng = modalPendingData.lng || (modalMode === 'EDIT' && spots[modalEditIndex] ? spots[modalEditIndex].lng : 0);

        if (!lat || !lng) {
          const entryVal = document.getElementById('modalInputEntry')?.value.trim();
          const nameVal = document.getElementById('modalInputName')?.value.trim();
          const coords = await searchCoordsByQuery(entryVal || nameVal);
          if (coords && coords.lat && coords.lng) {
            lat = coords.lat;
            lng = coords.lng;
            modalPendingData.lat = lat;
            modalPendingData.lng = lng;
          }
        }

        if (!lat || !lng) {
          showToast('[3. 콕 찍기] 또는 들머리 주소를 먼저 입력해주세요.', { html: ICONS.ALERT_CARD });
          return;
        }

        const elevInput = document.getElementById('modalInputElevation');
        if (elevInput) elevInput.placeholder = '고도 측정 중...';

        const measuredElev = await getElevation(lat, lng);
        if (elevInput) {
          elevInput.value = measuredElev;
          elevInput.placeholder = '고도 (m 단위 숫자)';
        }

        if (measuredElev) {
          showToast('해발고도 ' + measuredElev + ' 측정 완료!', { html: ICONS.MOUNTAIN });
        } else {
          showToast('고도 측정에 실패했습니다. 직접 입력해주세요.', { html: ICONS.ALERT_CARD });
        }
      }

      function okbmResetSheetMetrics() {
        window.__okbmSheetMetrics = {};
      }
      window.okbmResetSheetMetrics = okbmResetSheetMetrics;
      window.addEventListener('resize', okbmResetSheetMetrics);

      function getMarkerNameCenterLiftPx() {
        var spot = (typeof currentActiveSpot !== 'undefined') ? currentActiveSpot : null;
        var labelH = 0;
        if (spot && typeof spotLabelOverlayMap !== 'undefined' && spotLabelOverlayMap) {
          var overlay = spotLabelOverlayMap.get(String(spot.id).trim());
          var content = overlay && typeof overlay.getContent === 'function' ? overlay.getContent() : null;
          var labelEl = content && content.querySelector ? content.querySelector('.lod-marker-label') : null;
          if (labelEl) labelH = labelEl.offsetHeight || labelEl.scrollHeight || 0;
        }
        if (!labelH) {
          var rows = 1;
          if (spot) {
            var name = String(spot.spot_main || spot.name || '');
            var sub = String(spot.spot_sub || '').trim();
            if (sub || /[\(\[（].+[\)\]）]/.test(name)) rows += 1;
            if (spot.elevation) rows += 1;
          } else {
            rows = 3;
          }
          labelH = 15 + Math.max(0, rows - 1) * 14;
        }
        return Math.round((44 + labelH) / 2);
      }

      function getInfoWindowAdjustedCenter(lat, lng) {
        var nLat = Number(lat);
        var nLng = Number(lng);
        var target = new kakao.maps.LatLng(nLat, nLng);
        var mapEl = document.getElementById('map');
        if (!mapEl || !map) return target;

        var mapRect = mapEl.getBoundingClientRect();
        var mw = mapRect.width || mapEl.offsetWidth || 1;
        var mh = mapRect.height || mapEl.offsetHeight || 1;
        var sheet = document.getElementById('mobileBottomSheet');
        var drawer = document.getElementById('pcSlidingDrawer');
        var sheetOpen = !!(sheet && sheet.classList.contains('open') && window.getComputedStyle(sheet).display !== 'none');
        var drawerOpen = !!(drawer && drawer.classList.contains('open') && window.getComputedStyle(drawer).display !== 'none');

        var visibleTop = 0;
        var visibleBottom = mh;
        var visibleLeft = 0;
        var visibleRight = mw;

        if (sheetOpen) {
          var search = document.querySelector('.floating-top-search-wrap');
          if (search) {
            var searchStyle = window.getComputedStyle(search);
            if (searchStyle.display !== 'none' && searchStyle.visibility !== 'hidden') {
              var searchBottom = search.getBoundingClientRect().bottom - mapRect.top;
              if (searchBottom > 0 && searchBottom < mh * 0.6) visibleTop = searchBottom;
            }
          }
          var dock = document.getElementById('romanticMasterBottomDock');
          var dockH = 0;
          if (dock && window.getComputedStyle(dock).display !== 'none') {
            dockH = dock.offsetHeight || 0;
          }
          var sheetH = sheet.offsetHeight || Math.round(window.innerHeight * 0.5);
          var sheetTop = (window.innerHeight - dockH - sheetH) - mapRect.top;
          if (sheetTop > visibleTop + 48 && sheetTop < mh) visibleBottom = sheetTop;
        } else if (drawerOpen) {
          var drawerW = drawer.offsetWidth || 380;
          if (drawerW > 0 && drawerW < mw - 80) visibleLeft = drawerW;
        }

        var desiredX = (visibleLeft + visibleRight) / 2;
        var desiredY = (visibleTop + visibleBottom) / 2 + getMarkerNameCenterLiftPx();
        if (Math.abs(desiredX - mw / 2) < 1 && Math.abs(desiredY - mh / 2) < 1) return target;

        var proj = (typeof map.getProjection === 'function') ? map.getProjection() : null;
        if (proj && typeof proj.containerPointFromCoords === 'function' && typeof proj.coordsFromContainerPoint === 'function') {
          try {
            var markerPoint = proj.containerPointFromCoords(target);
            var centerPoint = proj.containerPointFromCoords(map.getCenter());
            if (markerPoint && centerPoint && isFinite(markerPoint.x) && isFinite(markerPoint.y) && isFinite(centerPoint.x) && isFinite(centerPoint.y)) {
              var adjusted = proj.coordsFromContainerPoint(new kakao.maps.Point(
                centerPoint.x - (desiredX - markerPoint.x),
                centerPoint.y - (desiredY - markerPoint.y)
              ));
              if (adjusted && isFinite(adjusted.getLat()) && isFinite(adjusted.getLng())) return adjusted;
            }
          } catch (e) {}
        }

        var latSpan = 0;
        var lngSpan = 0;
        var bounds = (typeof map.getBounds === 'function') ? map.getBounds() : null;
        if (bounds) {
          var sw = bounds.getSouthWest();
          var ne = bounds.getNorthEast();
          latSpan = ne.getLat() - sw.getLat();
          lngSpan = ne.getLng() - sw.getLng();
        }
        if (!isFinite(latSpan) || !isFinite(lngSpan) || latSpan <= 0 || lngSpan <= 0) {
          var metersPerPixel = 12;
          latSpan = (mh * metersPerPixel) / 111320;
          lngSpan = (mw * metersPerPixel) / (111320 * Math.max(0.2, Math.cos(nLat * Math.PI / 180)));
        }

        var oy = (mh / 2) - desiredY;
        var ox = desiredX - (mw / 2);
        return new kakao.maps.LatLng(
          nLat - (oy / mh) * latSpan,
          nLng - (ox / mw) * lngSpan
        );
      }

      function smoothCenterMapOnSpot(lat, lng) {
        if (!map) return;
        var nLat = Number(lat);
        var nLng = Number(lng);
        if (!isFinite(nLat) || !isFinite(nLng)) return;
        var rawTarget = new kakao.maps.LatLng(nLat, nLng);

        window.__okbmCenterSeq = (window.__okbmCenterSeq || 0) + 1;
        if (window.__okbmCenterTimer) {
          clearTimeout(window.__okbmCenterTimer);
          window.__okbmCenterTimer = null;
        }
        if (typeof window.__okbmCenterIdle === 'function') {
          try { kakao.maps.event.removeListener(map, 'idle', window.__okbmCenterIdle); } catch (e) {}
          window.__okbmCenterIdle = null;
        }

        var needZoom = map.getLevel() > 7;
        if (needZoom) {
          map.setLevel(7, { animate: false, anchor: rawTarget });
        }

        var adjusted = getInfoWindowAdjustedCenter(nLat, nLng);
        if (needZoom) {
          map.setCenter(adjusted);
        } else {
          map.panTo(adjusted);
        }
        debouncedUpdateLODLabels();
      }
      window.smoothCenterMapOnSpot = smoothCenterMapOnSpot;

      // ⚡ [디바운스]: idle 자체가 이동·줌이 끝난 뒤라, 연속 호출만 묶을 정도(80ms)로 짧게 기다린다.
      // (예전 200ms + rAF로는 지도가 멈춘 뒤 라벨이 늦게 떴다)
      var lodDebounceTimer = null;
      function debouncedUpdateLODLabels() {
        clearTimeout(lodDebounceTimer);
        lodDebounceTimer = setTimeout(() => {
          if (window.requestAnimationFrame) {
            window.requestAnimationFrame(updateLODLabels);
          } else {
            updateLODLabels();
          }
        }, 80);
      }

      function updateLODLabels() {
        if (!map) return;
        if (isPickingLocationMode) {
          spotLabelOverlayMap.forEach(function(overlay) {
            if (overlay && overlay.getMap()) overlay.setMap(null);
          });
          return;
        }
        const currentLevel = map.getLevel();

        if (currentLevel >= 11) {
          spotLabelOverlayMap.forEach((overlay) => {
            if (overlay && overlay.getMap()) overlay.setMap(null);
          });
          return;
        }

        const proj = map.getProjection();
        if (!proj) return;

        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const latBuffer = (ne.getLat() - sw.getLat()) * 0.05;
        const lngBuffer = (ne.getLng() - sw.getLng()) * 0.05;
        const minLat = sw.getLat() - latBuffer;
        const maxLat = ne.getLat() + latBuffer;
        const minLng = sw.getLng() - lngBuffer;
        const maxLng = ne.getLng() + lngBuffer;

        const occupiedBoxes = [];
        const activeId = currentActiveSpot ? String(currentActiveSpot.id).trim() : (window.__MANUAL_ACTIVE_ID__ || null);
        const candidateSpots = [];

        spotNativeMarkerMap.forEach((marker, id) => {
          if (marker && marker.getMap()) {
            const spot = marker.spotData;
            const sId = String(spot.id).trim();
            const isSelected = (activeId === sId);

            if (!isSelected && (spot.lat < minLat || spot.lat > maxLat || spot.lng < minLng || spot.lng > maxLng)) {
              const overlay = spotLabelOverlayMap.get(sId);
              if (overlay && overlay.getMap()) overlay.setMap(null);
              return;
            }

            const isFav = userBookmarks.has(sId);
            const isDone = userVisited.has(sId);
            const views = spot.searchCount || 0;
            
            let priority = 0;
            if (isSelected) priority += 9999999;
            if (isFav) priority += 10000;
            if (isDone) priority += 5000;
            if (views >= 5) priority += 1000;
            priority += views;

            candidateSpots.push({ id: sId, spot, priority, isSelected });
          }
        });

        candidateSpots.sort((a, b) => b.priority - a.priority);
        const maxRenderCount = currentLevel <= 6 ? 60 : 35;
        let renderedCount = 0;

        for (let i = 0; i < candidateSpots.length; i++) {
          const item = candidateSpots[i];
          const id = item.id;
          const spot = item.spot;
          const priority = item.priority;
          const isSelected = item.isSelected;

          let overlay = spotLabelOverlayMap.get(id);

          if (currentLevel >= 11 || (!isSelected && currentLevel >= 12) || (!isSelected && renderedCount >= maxRenderCount)) {
            if (overlay && overlay.getMap()) overlay.setMap(null);
            continue;
          }

          const latlng = spot._renderLatLng || new kakao.maps.LatLng(spot.renderLat || spot.lat, spot.renderLng || spot.lng);
          const screenPoint = proj.containerPointFromCoords(latlng);
          if (!screenPoint) continue;

          // 비회원은 산 이름 한 줄만. 산 이름·세부 이름·해발 세 줄은 회원에게만 보인다.
          const isGuest = isGuestViewer();
          const isFullMode = !isGuest && (isSelected || (currentLevel <= 7));
          const labelWidth = isFullMode ? 90 : 58;
          const labelHeight = isFullMode ? 54 : 22;

          const boxLeft = screenPoint.x - labelWidth / 2;
          const boxRight = screenPoint.x + labelWidth / 2;
          const boxTop = screenPoint.y - labelHeight - 44;
          const boxBottom = screenPoint.y - 44;

          let hasCollision = false;
          if (!isSelected && priority < 10000) {
            for (let j = 0; j < occupiedBoxes.length; j++) {
              const b = occupiedBoxes[j];
              if (!(boxLeft > b.right + 4 || boxRight < b.left - 4 || boxTop > b.bottom + 2 || boxBottom < b.top - 2)) {
                hasCollision = true;
                break;
              }
            }
          }

          if (hasCollision) {
            if (overlay && overlay.getMap()) overlay.setMap(null);
          } else {
            occupiedBoxes.push({ left: boxLeft, right: boxRight, top: boxTop, bottom: boxBottom });
            renderedCount++;
            if (!overlay) {
              // 처음 화면에 띄울 때 만든다. 내용은 아래 labelKey 분기에서 채운다.
              overlay = new kakao.maps.CustomOverlay({
                position: latlng,
                content: document.createElement('div'),
                yAnchor: 1.0,
                zIndex: 150,
                clickable: true
              });
              spotLabelOverlayMap.set(id, overlay);
            }
            
            const diffClass = getSpotDiffColorClass(spot.difficulty);
            let row1Name = (spot.spot_main || spot.name || '무명박지').trim();
            let row2Sub = (spot.spot_sub || '').trim();
            const parenMatch = row1Name.match(/^(.*?)\s*[\(\[（](.*?)[\)\]）]/);
            if (parenMatch) { row1Name = parenMatch[1].trim(); if (!row2Sub) row2Sub = parenMatch[2].trim(); }
            const row3Elev = spot.elevation ? `${String(spot.elevation).replace(/m$/i,'')}m` : '';

            const isFav = userBookmarks.has(id);
            const isDone = userVisited.has(id);
            // 이름·난이도·고도가 바뀐 spot(목록 교체·수정)도 다시 그리도록 내용 값을 키에 넣는다
            const isBan = isCampBanned(spot);
            const labelKey = `${id}_${isFullMode ? 'full' : 'mini'}_${isSelected ? 'sel' : 'nor'}_${isFav ? 'f' : 'nf'}_${isDone ? 'd' : 'nd'}_${isBan ? 'ban' : 'ok'}_${isGuest ? 'g' : 'm'}_${row1Name}|${row2Sub}|${row3Elev}|${diffClass}`;
            if (overlay._cachedLabelKey !== labelKey) {
              const labelDiv = document.createElement('div');
              labelDiv.className = 'lod-marker-container';
              labelDiv.style.pointerEvents = 'auto';
              labelDiv.style.cursor = 'pointer';
              labelDiv.onclick = (e) => {
                e.stopPropagation();
                focusSpotOnMap(spot);
              };
              const labelTransform = isSelected ? 'transform: translateX(-50%) scale(1.08);' : 'transform: translateX(-50%);';

              labelDiv.innerHTML = `
                ${userBookmarks.has(id) ? `<div class="marker-badge-corner badge-corner-fav" title="찜한 장소">${ICONS.HEART}</div>` : ''}
                ${userVisited.has(id) ? `<div class="marker-badge-corner badge-corner-visited" title="클리어 장소">${ICONS.FLAG}</div>` : ''}
                <div class="lod-marker-label" style="position: absolute; bottom: 44px; left: 50%; pointer-events: auto; ${labelTransform}">
                  <div class="lod-label-row-1 ${isBan ? '' : diffClass}"${isBan ? ' style="color:#fda4af;"' : ''}>${isBan ? '🚫 ' : ''}${escapeHtml(row1Name)}</div>
                  ${isBan ? '<div class="lod-label-row-2" style="color:#fb7185; font-weight:900;">야영금지</div>' : ''}
                  ${(isFullMode && row2Sub) ? `<div class="lod-label-row-2">${escapeHtml(row2Sub)}</div>` : ''}
                  ${(isFullMode && row3Elev) ? `<div class="lod-label-row-3">${ICONS.MOUNTAIN}${escapeHtml(row3Elev)}</div>` : ''}
                </div>
              `;
              overlay.setContent(labelDiv);
              overlay._cachedLabelKey = labelKey;
            }

            overlay.setZIndex(isSelected ? 9999 : 150);
            if (!overlay.getMap()) overlay.setMap(map);
          }
        }
      }
      function closeAllPopups() { 
        closeMobileBottomSheet(); 
        closePcSlidingDrawer(); 
        currentActiveSpot = null; 
        window.__MANUAL_ACTIVE_ID__ = null;
        updateLODLabels();
      }

      function isGuestViewer() {
        return !(typeof isUserLoggedIn === 'function' && isUserLoggedIn());
      }

      // H9: 비회원 핀은 처음에 전국 범위로 받은 대략 좌표다(spot.__pinCell = 좌표를 맞춘 칸 크기, 도).
      // 지도가 멈추면 지금 범위에 필요한 칸 크기보다 큰 핀이 있을 때만 그 범위를 다시 물어 정확도를 높인다.
      // 서버는 비회원에게 IP당 분당 30회·하루 200회만 답한다. 회원이 토큰 만료로 대략 좌표를 받았으면 정확한 좌표가 온다.
      var guestPinTimer = null;
      var guestPinBusy = false;
      var guestPinPausedUntil = 0;
      var guestPinLimitToastShown = false;

      // 서버(get_spot_pins)와 같은 계산: 범위의 긴 변 / 250을 2의 거듭제곱으로 올림
      function guestPinCellFor(box) {
        var span = Math.max(box.maxLat - box.minLat, box.maxLng - box.minLng);
        return Math.pow(2, Math.ceil(Math.log2(Math.max(span / 250, 0.00001))));
      }

      function scheduleGuestPinRefine() {
        if (!map || typeof window.okbmFetchSpotPins !== 'function') return;
        clearTimeout(guestPinTimer);
        guestPinTimer = setTimeout(refineGuestPins, 300);
      }

      function currentMapView() {
        var b = map.getBounds();
        return { minLat: b.getSouthWest().getLat(), minLng: b.getSouthWest().getLng(), maxLat: b.getNorthEast().getLat(), maxLng: b.getNorthEast().getLng() };
      }

      // 이 범위에서 정확도가 모자란 핀을 서버에 묻는다. 모자란 핀이 없으면 null.
      async function fetchGuestPinsForView(view) {
        var want = guestPinCellFor(view);
        var stale = spots.filter(function(s) {
          return s && s.__pinCell > want && s.lat >= view.minLat && s.lat <= view.maxLat && s.lng >= view.minLng && s.lng <= view.maxLng;
        });
        if (!stale.length) return null;
        // 대략 좌표로는 범위 안이어도 실제는 칸 크기만큼 바깥일 수 있어, 그만큼 넓혀 묻는다
        var pad = Math.max.apply(null, stale.map(function(s) { return s.__pinCell; }));
        var res = await window.okbmFetchSpotPins({ minLat: view.minLat - pad, minLng: view.minLng - pad, maxLat: view.maxLat + pad, maxLng: view.maxLng + pad });
        return { res: res, stale: stale, want: want, pad: pad };
      }

      // 받은 좌표를 spot에 넣는다. 옮겨진 spot 목록을 돌려준다(마커는 아직 그대로).
      function applyGuestPins(job) {
        var res = job.res;
        var byId = new Map(spots.map(function(s) { return [String(s.id).trim(), s]; }));
        var moved = [];
        res.pins.forEach(function(p) {
          var s = byId.get(String(p[0]).trim());
          if (!s || !s.__pinCell || (res.cell && res.cell >= s.__pinCell)) return;
          s.lat = s.campsite_lat = Number(p[1]);
          s.lng = s.campsite_lng = Number(p[2]);
          s._renderLatLng = null;
          if (res.cell) s.__pinCell = res.cell; else delete s.__pinCell;
          moved.push(s);
        });
        // 응답에 없던 핀(실제로는 이 범위 밖)은 이 높이에서 다시 묻지 않는다
        var returned = new Set(res.pins.map(function(p) { return String(p[0]).trim(); }));
        job.stale.forEach(function(s) { if (!returned.has(String(s.id).trim()) && s.__pinCell > job.want) s.__pinCell = job.want; });
        return moved;
      }

      function handleGuestPinError(e) {
        if (e && e.code === 'rate') {
          guestPinPausedUntil = Date.now() + 60000;
          if (!guestPinLimitToastShown && typeof showToast === 'function') {
            guestPinLimitToastShown = true;
            showToast('지도를 많이 둘러봤어요. 로그인하면 정확한 위치를 계속 볼 수 있어요.');
          }
        } else {
          guestPinPausedUntil = Date.now() + 5000;
        }
      }

      // 손으로 확대·이동한 뒤 맞추는 핀은 툭 튀지 않게 0.22초 동안 미끄러지듯 제자리로 옮긴다.
      function glideGuestPins(moved) {
        var items = [];
        moved.forEach(function(s) {
          var id = String(s.id).trim();
          var marker = spotNativeMarkerMap.get(id);
          if (!marker || !marker.getMap()) return;
          var from = marker.getPosition();
          items.push({ marker: marker, label: spotLabelOverlayMap.get(id), fromLat: from.getLat(), fromLng: from.getLng(), toLat: s.lat, toLng: s.lng });
        });
        if (!items.length) { renderSpots(); return; }
        var t0 = performance.now();
        var step = function(now) {
          var t = Math.min(1, (now - t0) / 220);
          var k = 1 - Math.pow(1 - t, 3);
          items.forEach(function(it) {
            var pos = new kakao.maps.LatLng(it.fromLat + (it.toLat - it.fromLat) * k, it.fromLng + (it.toLng - it.fromLng) * k);
            it.marker.setPosition(pos);
            if (it.label) it.label.setPosition(pos);
          });
          if (t < 1) requestAnimationFrame(step);
          else renderSpots();
        };
        requestAnimationFrame(step);
      }

      async function refineGuestPins() {
        if (guestPinBusy || Date.now() < guestPinPausedUntil || !map) return;
        guestPinBusy = true;
        try {
          var job = await fetchGuestPinsForView(currentMapView());
          if (!job) return;
          var moved = applyGuestPins(job);
          if (moved.length) glideGuestPins(moved);
          // 넓혀 물은 만큼 칸이 커졌으면 한 번 더(칸이 줄어들 때만 반복해 끝이 난다)
          if (job.res.cell > job.want && job.res.cell < job.pad) setTimeout(scheduleGuestPinRefine, 0);
        } catch (e) {
          handleGuestPinError(e);
        } finally {
          guestPinBusy = false;
        }
      }

      // 지도를 옮기기 전에, 옮겨 갈 화면(중심·높이)의 핀을 먼저 정확히 받아 둔다. 옮긴 뒤 핀이 튀지 않게.
      // 늦어도 0.6초까지만 기다린다. 그 뒤에 온 답은 평소처럼 지도가 멈출 때 맞춘다.
      async function prefetchGuestPinsAt(lat, lng, level) {
        if (!map || guestPinBusy || Date.now() < guestPinPausedUntil || typeof window.okbmFetchSpotPins !== 'function') return;
        if (!spots.some(function(s) { return s && s.__pinCell; })) return;
        var cur = currentMapView();
        var scale = Math.pow(2, level - map.getLevel());
        var halfLat = (cur.maxLat - cur.minLat) * scale / 2;
        var halfLng = (cur.maxLng - cur.minLng) * scale / 2;
        var view = { minLat: lat - halfLat, minLng: lng - halfLng, maxLat: lat + halfLat, maxLng: lng + halfLng };
        guestPinBusy = true;
        var job = fetchGuestPinsForView(view).then(function(j) {
          if (j) applyGuestPins(j);
          return j;
        }).catch(function(e) {
          handleGuestPinError(e);
          return null;
        }).finally(function() {
          guestPinBusy = false;
        });
        await Promise.race([job, new Promise(function(r) { setTimeout(r, 600); })]);
      }

      // 비회원이 박지를 누르면: 로그인 창을 띄우고, 뒤로 산 이름이 보이는 높이로 옮긴다.
      // 로그인 뒤 페이지가 다시 뜨면 checkUrlParamSpotFocus가 이 박지를 열어 준다.
      async function askGuestLoginForSpot(spot) {
        try { sessionStorage.setItem('okbm_login_return_spot', String(spot.id).trim()); } catch (e) {}
        if (typeof window.openLoginModal === 'function') {
          window.openLoginModal({ message: '박지 세부 위치와 정보는 회원에게만 보여요.\n로그인하면 바로 볼 수 있어요.' });
        }
        try {
          if (map && spot && spot.lat && spot.lng) {
            var level = Math.min(map.getLevel(), 9);
            await prefetchGuestPinsAt(spot.lat, spot.lng, level);
            renderSpots();
            if (map.getLevel() > level) map.setLevel(level, { animate: false });
            map.panTo(new kakao.maps.LatLng(spot.lat, spot.lng));
          }
        } catch (e) {}
      }

      // 공유 링크·검색 페이지로 들어온 비회원에게는 그 박지 하나만 정보창을 열어 준다(홍보).
      // 비회원 정보창은 [뷰/특징]·사진까지이고 들머리·내비는 회원 전용 안내로 가려진다. 다른 박지는 누르면 로그인 안내.
      var guestLinkedSpotId = '';
      async function openSpotFromLink(spot) {
        if (!spot) return;
        if (isGuestViewer()) {
          guestLinkedSpotId = String(spot.id).trim();
          try {
            if (map) {
              await prefetchGuestPinsAt(spot.lat, spot.lng, 8);
              renderSpots();
              map.setLevel(8, { animate: false });
              map.setCenter(new kakao.maps.LatLng(spot.lat, spot.lng));
            }
          } catch (e) {}
        }
        focusSpotOnMap(spot);
      }

      function focusSpotOnMap(spot) {
        if (!spot) return;
        photoMapReturnView = null;
        if (isPickingLocationMode || window.__adminPinMoveSpotId) return;
        if (isGuestViewer() && String(spot.id).trim() !== guestLinkedSpotId) {
          askGuestLoginForSpot(spot);
          return;
        }
        if (window.__okbmSpotFocusTimer) {
          clearTimeout(window.__okbmSpotFocusTimer);
          window.__okbmSpotFocusTimer = null;
        }
        isMarkerClickProcessing = true;
        setTimeout(() => { isMarkerClickProcessing = false; }, 400);

        incrementSpotCount(spot.id);
        const pcDrop = document.getElementById('pcSearchDropdown');
        if (pcDrop) pcDrop.style.display = 'none';
        
        currentActiveSpot = spot;
        window.__MANUAL_ACTIVE_ID__ = String(spot.id).trim();

        document.querySelectorAll('.spot-item').forEach(el => el.classList.remove('active-spot'));
        const activeCard = document.getElementById(`spotItem_${spot.id}`);
        if (activeCard) {
          activeCard.classList.add('active-spot');
          const container = activeCard.closest('.region-items-container');
          if (container) container.style.display = 'block';
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const isMobileView = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
        if (isMobileView) {
          setMobileSidebarCollapsed(true);
          closePcSlidingDrawer();
          openMobileBottomSheet(spot);
        } else {
          closeMobileBottomSheet();
          openPcSlidingDrawer(spot);
        }
        smoothCenterMapOnSpot(spot.renderLat || spot.lat, spot.renderLng || spot.lng);
      }

      function toggleUserBookmark(spotId, e = null) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!isUserLoggedIn()) {
          openLoginModal();
          showToast('찜하기는 로그인 후 이용하실 수 있습니다.', { html: ICONS.LOCK });
          return;
        }
        const sId = String(spotId || (currentActiveSpot ? currentActiveSpot.id : '')).trim();
        if (!sId) return;

        let isNowBookmarked = false;
        if (window.RomanticVault && typeof window.RomanticVault.toggleBookmark === 'function') {
          isNowBookmarked = window.RomanticVault.toggleBookmark(sId);
        } else {
          let bList = new Set((safeGetJSON('okbm_bookmarks', [])).map(s => String(s).trim()));
          if (bList.has(sId)) {
            bList.delete(sId);
            isNowBookmarked = false;
          } else {
            bList.add(sId);
            isNowBookmarked = true;
          }
          localStorage.setItem('okbm_bookmarks', JSON.stringify([...bList]));
        }

        userBookmarks = new Set((safeGetJSON('okbm_bookmarks', [])).map(s => String(s).trim()));
        if (isNowBookmarked) {
          showToast('찜 목록에 추가되었습니다!', { html: ICONS.HEART });
        }

        document.querySelectorAll('.btn-action-fav').forEach(btn => {
          if (isNowBookmarked) { btn.classList.add('bookmarked'); btn.innerHTML = `${ICONS.HEART} 찜됨`; }
          else { btn.classList.remove('bookmarked'); btn.innerHTML = `${ICONS.HEART} 찜하기`; }
        });

        document.querySelectorAll(`#spotItem_${sId} .btn-card-quick:first-child`).forEach(btn => {
          if (isNowBookmarked) btn.classList.add('active-fav');
          else btn.classList.remove('active-fav');
        });

        renderSubChips();
        updateLODLabels();
        const mobileSheet = document.getElementById('mobileBottomSheet');
        const pcDrawer = document.getElementById('pcSlidingDrawer');
        if ((mobileSheet && mobileSheet.classList.contains('open')) || (pcDrawer && pcDrawer.classList.contains('open'))) {
          refreshCurrentSpotPopup();
        }
      }

      function toggleUserVisited(spotId, e = null) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!isUserLoggedIn()) {
          openLoginModal();
          showToast('클리어 등록은 로그인 후 이용하실 수 있습니다.', { html: ICONS.LOCK });
          return;
        }
        const sId = String(spotId || (currentActiveSpot ? currentActiveSpot.id : '')).trim();
        if (!sId) return;

        let isNowVisited = false;
        if (window.RomanticVault && typeof window.RomanticVault.toggleVisited === 'function') {
          isNowVisited = window.RomanticVault.toggleVisited(sId);
        } else {
          let vList = new Set((safeGetJSON('okbm_visited', [])).map(s => String(s).trim()));
          let bList = new Set((safeGetJSON('okbm_bookmarks', [])).map(s => String(s).trim()));
          if (vList.has(sId)) {
            vList.delete(sId);
            isNowVisited = false;
          } else {
            vList.add(sId);
            bList.delete(sId);
            isNowVisited = true;
          }
          localStorage.setItem('okbm_visited', JSON.stringify([...vList]));
          localStorage.setItem('okbm_bookmarks', JSON.stringify([...bList]));
        }

        userVisited = new Set((safeGetJSON('okbm_visited', [])).map(s => String(s).trim()));
        userBookmarks = new Set((safeGetJSON('okbm_bookmarks', [])).map(s => String(s).trim()));
        if (isNowVisited) {
          showToast('장소 정복 클리어!', { html: ICONS.FLAG });
        }

        document.querySelectorAll('.btn-action-visited').forEach(btn => {
          if (isNowVisited) { btn.classList.add('visited'); btn.innerHTML = `${ICONS.FLAG} <span>클리어</span>`; }
          else { btn.classList.remove('visited'); btn.innerHTML = `${ICONS.FLAG} <span>다녀왔음</span>`; }
        });

        document.querySelectorAll(`#spotItem_${sId} .btn-card-quick`).forEach((btn) => {
          if (btn.innerText.includes('클리어')) {
            if (isNowVisited) btn.classList.add('active-done');
            else btn.classList.remove('active-done');
          }
        });

        renderSubChips();
        updateLODLabels();
        const mobileSheet = document.getElementById('mobileBottomSheet');
        const pcDrawer = document.getElementById('pcSlidingDrawer');
        if ((mobileSheet && mobileSheet.classList.contains('open')) || (pcDrawer && pcDrawer.classList.contains('open'))) {
          refreshCurrentSpotPopup();
        }
      }

     function shareSpotCard(spotId) {
        const spot = spots.find(s => String(s.id).trim() === String(spotId).trim());
        if (!spot) return;

        const titleName = spot.fullName || `${spot.spot_main} (${spot.spot_sub || ''})`;
        const shareSpotName = String(spot.spot_main || spot.name || '').trim();
        const shareSpotId = String(spot.id || '').trim();

        // 카카오톡은 콘솔에 등록된 HTTPS 도메인만 링크로 연다. 로컬 주소로 보내면 미리보기만 되고 탭이 막힌다.
        const publicBase = 'https://romanticroute.kr/';
        const shareParams = new URLSearchParams();
        if (shareSpotName) shareParams.set('spot', shareSpotName);
        if (shareSpotId) shareParams.set('id', shareSpotId);
        const shareUrl = `${publicBase}map.html${shareParams.toString() ? '?' + shareParams.toString() : ''}`;
        const shareLogoImg = publicBase + 'fulllogoblk.png?v=20260919_v3';

        const summary = parseStructuredSummary(spot.desc_summary || spot.desc);
        const rawDesc = summary.view || spot.desc_summary || spot.desc || '자연에서 하룻밤을 보내는 사람들을 위한 올인원 아웃도어';
        const descText = rawDesc.replace(/\s+/g, ' ').trim();
        const kakaoDesc = descText.length > 80 ? descText.slice(0, 79) + '…' : descText;

        const sendKakao = function() {
          try {
            if (typeof Kakao !== 'undefined' && typeof Kakao.init === 'function' && Kakao.isInitialized && !Kakao.isInitialized()) {
              Kakao.init(window.KAKAO_APP_KEY || '557f5de0f6391a2419bc5592e6a9c9c1');
            }
          } catch (initErr) { console.warn('[map.html:shareSpotCard:init]', initErr); }
          if (typeof Kakao !== 'undefined' && Kakao.isInitialized && Kakao.isInitialized()) {
            try {
              const shareFn = (Kakao.Share && Kakao.Share.sendDefault) ? Kakao.Share.sendDefault : (Kakao.Link && Kakao.Link.sendDefault ? Kakao.Link.sendDefault : null);
              if (shareFn) {
                shareFn({
                  objectType: 'feed',
                  content: {
                    title: `[낭만루트] ${titleName}`.slice(0, 40),
                    description: kakaoDesc,
                    imageUrl: shareLogoImg,
                    imageWidth: 800,
                    imageHeight: 800,
                    link: {
                      mobileWebUrl: shareUrl,
                      webUrl: shareUrl
                    }
                  },
                  buttons: [
                    {
                      title: '앱에서 보기',
                      link: {
                        mobileWebUrl: shareUrl,
                        webUrl: shareUrl
                      }
                    }
                  ],
                });
                return true;
              }
            } catch (kakaoErr) { console.warn('[map.html:shareSpotCard:kakao]', kakaoErr); }
          }
          return false;
        };

        const isNativeApp = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

        const openKakaoTalkApp = function() {
          const appKey = window.KAKAO_APP_KEY || '557f5de0f6391a2419bc5592e6a9c9c1';
          const templateObject = {
            object_type: 'feed',
            content: {
              title: `[낭만루트] ${titleName}`.slice(0, 40),
              description: kakaoDesc,
              image_url: shareLogoImg,
              image_width: 800,
              image_height: 800,
              link: { web_url: shareUrl, mobile_web_url: shareUrl }
            },
            buttons: [{
              title: '앱에서 보기',
              link: { web_url: shareUrl, mobile_web_url: shareUrl }
            }]
          };
          const apiQuery = new URLSearchParams();
          apiQuery.set('link_ver', '4.0');
          apiQuery.set('template_object', JSON.stringify(templateObject));
          const ka = 'sdk/2.7.2 os/javascript sdk_type/javascript lang/ko-KR device/Android origin/' + encodeURIComponent('https://romanticroute.kr');
          return fetch('https://kapi.kakao.com/v2/api/kakaolink/talk/template/default?' + apiQuery.toString(), {
            method: 'GET',
            headers: { Authorization: 'KakaoAK ' + appKey, KA: ka }
          }).then(function(res) {
            if (!res.ok) throw new Error('kakao link ' + res.status);
            return res.json();
          }).then(function(validated) {
            const linkQuery = new URLSearchParams();
            linkQuery.set('appkey', appKey);
            linkQuery.set('appver', '1.0');
            linkQuery.set('linkver', '4.0');
            linkQuery.set('extras', JSON.stringify({ KA: ka }));
            linkQuery.set('template_json', JSON.stringify(validated.template_msg || {}));
            if (validated.template_args) linkQuery.set('template_args', JSON.stringify(validated.template_args));
            if (validated.template_id != null) linkQuery.set('template_id', String(validated.template_id));
            window.location.href = 'kakaolink://send?' + linkQuery.toString();
          });
        };

        const fallbackShare = function() {
          const labeledShareText = `[낭만루트] ${titleName}\n${descText}\n\n${shareUrl}`;
          const nativeShare = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
          if (nativeShare && typeof nativeShare.share === 'function') {
            nativeShare.share({
              title: `[낭만루트] ${titleName}`,
              text: labeledShareText,
              url: shareUrl,
              dialogTitle: '공유'
            }).catch(function(e) {
              console.warn('[map.html:shareSpotCard:capacitor]', e);
              copyTextToClipboard(labeledShareText, '공유 링크가 복사되었습니다. 카카오톡에 붙여넣기 하세요.');
            });
            return;
          }
          // 앱 WebView의 navigator.share는 시트를 안 열고 끝나므로 쓰지 않는다.
          if (!isNativeApp && navigator.share) {
            const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
            const shareData = isApple
              ? { title: `[낭만루트] ${titleName}`, url: shareUrl }
              : { title: `[낭만루트] ${titleName}`, text: labeledShareText, url: shareUrl };
            navigator.share(shareData).catch((e) => {
              if (e && e.name === 'AbortError') return;
              console.warn('[map.html:shareSpotCard:navigator]', e);
              copyTextToClipboard(labeledShareText, '공유 링크가 복사되었습니다.');
            });
            return;
          }
          copyTextToClipboard(labeledShareText, isNativeApp
            ? '공유 링크가 복사되었습니다. 카카오톡에 붙여넣기 하세요.'
            : '공유 링크가 복사되었습니다.');
        };

        // 앱 WebView는 카카오 SDK의 intent: 주소를 열지 못한다. kakaolink 스킴은 카카오톡을 직접 연다.
        if (isNativeApp) {
          openKakaoTalkApp().catch(function(e) {
            console.warn('[map.html:shareSpotCard:kakaolink]', e);
            fallbackShare();
          });
          return;
        }
        if (!sendKakao()) fallbackShare();
        if (typeof window.okbmEnsureKakaoSdk === 'function') {
          window.okbmEnsureKakaoSdk().catch(function() {});
        }
      }

      const entryCoordsCache = new Map();
      const nearbyPoiCache = new Map();
      const NAVI_GENERIC_TRAIL_WORDS = ['주차장', '주차', '입구', '갓길', '선착장', '터미널', '도선', '등산로', '임도', '들머리', '인근', '앞', '후문', '일주문', '사찰', '펜션', '산장', '관광지', '해변', '자갈'];

      function extractTrailheadCoreName(trailheadName) {
        var raw = String(trailheadName || '').trim();
        if (!raw) return '';
        var core = raw
          .replace(/[\(\[（].*?[\)\]）]/g, ' ')
          .replace(/[\/|,·•]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        NAVI_GENERIC_TRAIL_WORDS.forEach(function(w) {
          core = core.split(w).join(' ');
        });
        core = core.replace(/\s+/g, ' ').trim();
        if (core.length < 2) return '';
        return core;
      }

      function haversineMeters(lat1, lng1, lat2, lng2) {
        var toRad = Math.PI / 180;
        var dLat = (lat2 - lat1) * toRad;
        var dLng = (lng2 - lng1) * toRad;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      function searchNearbyMatchingPoi(trailheadName, baseLat, baseLng) {
        return new Promise(function(resolve) {
          if (!trailheadName || !isFinite(baseLat) || !isFinite(baseLng)) return resolve(null);
          if (typeof kakao === 'undefined' || !kakao.maps || !kakao.maps.services) return resolve(null);

          var coreName = extractTrailheadCoreName(trailheadName);
          if (!coreName) return resolve(null);

          var cacheKey = trailheadName + '|' + baseLat.toFixed(5) + ',' + baseLng.toFixed(5);
          if (nearbyPoiCache.has(cacheKey)) return resolve(nearbyPoiCache.get(cacheKey));

          var places = new kakao.maps.services.Places();
          var opts = {
            location: new kakao.maps.LatLng(baseLat, baseLng),
            radius: 700,
            sort: kakao.maps.services.SortBy.DISTANCE
          };

          places.keywordSearch(trailheadName, function(data, status) {
            if (status !== kakao.maps.services.Status.OK || !Array.isArray(data) || !data.length) {
              limitedMapSet(nearbyPoiCache, cacheKey, null, 100);
              return resolve(null);
            }

            var picked = null;
            for (var i = 0; i < data.length; i++) {
              var item = data[i];
              if (!item) continue;
              var placeName = String(item.place_name || '').trim();
              if (!placeName) continue;
              if (placeName.indexOf(coreName) === -1) continue;
              var pLat = parseFloat(item.y);
              var pLng = parseFloat(item.x);
              if (!isFinite(pLat) || !isFinite(pLng)) continue;
              var dist = haversineMeters(baseLat, baseLng, pLat, pLng);
              if (dist > 700) continue;
              picked = {
                lat: pLat,
                lng: pLng,
                title: placeName,
                address: item.road_address_name || item.address_name || ''
              };
              break;
            }

            limitedMapSet(nearbyPoiCache, cacheKey, picked, 100);
            resolve(picked);
          }, opts);
        });
      }

      async function navigateToNaviApp(type, trailheadName, address, fallbackLat, fallbackLng) {
        var labelName = String(trailheadName || '').trim();
        var targetQuery = (address && String(address).trim()) ? String(address).trim() : labelName;
        var naviTitle = labelName || targetQuery;

        var targetLat = null, targetLng = null;
        if (entryCoordsCache.has(targetQuery)) {
          var cached = entryCoordsCache.get(targetQuery);
          targetLat = cached.lat; targetLng = cached.lng;
        } else if (address && String(address).trim()) {
          try {
            var coords = await searchCoordsByQuery(targetQuery);
            if (coords && coords.lat && coords.lng) {
              targetLat = coords.lat; targetLng = coords.lng;
              limitedMapSet(entryCoordsCache, targetQuery, { lat: targetLat, lng: targetLng }, 100);
            }
          } catch (e) { console.warn('[map.html:navigateToNaviApp:searchCoords]', e); }
        }

        // 주소 좌표 근처에서 들머리 이름과 맞는 등록 장소만 채택 (전국 이름 검색 금지)
        if (targetLat !== null && targetLng !== null && labelName) {
          try {
            var matchedPoi = await searchNearbyMatchingPoi(labelName, targetLat, targetLng);
            if (matchedPoi && matchedPoi.lat && matchedPoi.lng) {
              targetLat = matchedPoi.lat;
              targetLng = matchedPoi.lng;
              if (matchedPoi.title) naviTitle = matchedPoi.title;
            }
          } catch (poiErr) {
            console.warn('[map.html:navigateToNaviApp:nearbyPoi]', poiErr);
          }
        }

        var hasValidCoords = (targetLat !== null && targetLng !== null);

        if (type === 'kakao') {
          if (hasValidCoords) window.open(`https://map.kakao.com/link/to/${encodeURIComponent(naviTitle)},${targetLat},${targetLng}`, '_blank');
          else window.open(`https://map.kakao.com/link/search/${encodeURIComponent(targetQuery)}`, '_blank');
        } else if (type === 'tmap') {
          if (hasValidCoords) {
            const tmapAppUrl = `tmap://route?goalname=${encodeURIComponent(naviTitle)}&goallng=${targetLng}&goallat=${targetLat}`;
            const tmapWebUrl = `https://map.kakao.com/link/to/${encodeURIComponent(naviTitle)},${targetLat},${targetLng}`;
            const startTime = Date.now();
            window.location.href = tmapAppUrl;
            setTimeout(() => { if (Date.now() - startTime < 1500) window.open(tmapWebUrl, '_blank'); }, 1000);
          } else { window.open(`https://map.kakao.com/link/search/${encodeURIComponent(targetQuery)}`, '_blank'); }
        } else if (type === 'naver') {
          if (hasValidCoords) {
            const naverAppUrl = `nmap://route/car?dlat=${targetLat}&dlng=${targetLng}&dname=${encodeURIComponent(naviTitle)}&appname=okbm`;
            const naverWebUrl = `https://map.naver.com/p/search/${encodeURIComponent(targetQuery)}`;
            const startTime = Date.now();
            window.location.href = naverAppUrl;
            setTimeout(() => { if (Date.now() - startTime < 1500) window.open(naverWebUrl, '_blank'); }, 1000);
          } else { window.open(`https://map.naver.com/p/search/${encodeURIComponent(targetQuery)}`, '_blank'); }
        } else if (type === 'roadview') {
          const rvLat = hasValidCoords ? targetLat : fallbackLat, rvLng = hasValidCoords ? targetLng : fallbackLng;
          window.open(`https://map.kakao.com/link/roadview/${rvLat},${rvLng}`, '_blank');
        }
      }

      if (!window.__okbmMapSafeClickBound) {
        window.__okbmMapSafeClickBound = true;
        document.addEventListener('click', function(e) {
          var naviBtn = e.target.closest('.js-navi-app');
          if (naviBtn) {
            e.stopPropagation();
            var lat = parseFloat(naviBtn.dataset.lat);
            var lng = parseFloat(naviBtn.dataset.lng);
            navigateToNaviApp(
              naviBtn.dataset.navi,
              naviBtn.dataset.name,
              naviBtn.dataset.addr,
              isFinite(lat) ? lat : 0,
              isFinite(lng) ? lng : 0
            );
            return;
          }
          var copyBtn = e.target.closest('.js-copy-entry');
          if (copyBtn) {
            e.stopPropagation();
            copyTextToClipboard(copyBtn.dataset.addr);
            return;
          }
          var centerEl = e.target.closest('.js-center-spot');
          if (centerEl && !e.target.closest('.js-spot-title-actions') && !e.target.closest('.sheet-close-btn')) {
            var cLat = parseFloat(centerEl.dataset.lat);
            var cLng = parseFloat(centerEl.dataset.lng);
            if (typeof smoothCenterMapOnSpot === 'function' && isFinite(cLat) && isFinite(cLng)) {
              smoothCenterMapOnSpot(cLat, cLng);
            }
          }
        }, true);
      }

      async function toggleGpxTrack(spotId, gpxUrl) {
        const sId = String(spotId).trim();
        if (currentGpxPolyline && activeGpxSpotId === sId) {
          currentGpxPolyline.setMap(null);
          currentGpxPolyline = null;
          activeGpxSpotId = null;
          refreshCurrentSpotPopup();
          return;
        }

        if (!gpxUrl || !gpxUrl.trim() || gpxUrl === 'undefined') {
          showToast('해당 박지의 GPX 등산로 데이터가 준비 중입니다.', { html: ICONS.ALERT_CARD });
          return;
        }
        // SDK를 async로 받으므로 지도 준비 전에는 kakao.maps.LatLng가 없다
        if (!isKakaoMapReady()) {
          showToast('지도를 아직 불러오지 못했습니다.');
          return;
        }

        try {
          let fetchTargetUrl = gpxUrl.trim();
          if (fetchTargetUrl.includes('drive.google.com')) {
            const idMatch = fetchTargetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || fetchTargetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) fetchTargetUrl = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
          }

          const res = await fetch(fetchTargetUrl);
          if (!res.ok) throw new Error('GPX fetch failed');
          const gpxText = await res.text();
          const xml = new DOMParser().parseFromString(gpxText, 'text/xml');
          const trkpts = xml.getElementsByTagName('trkpt');

          const path = [];
          for (let i = 0; i < trkpts.length; i++) {
            const lat = parseFloat(trkpts[i].getAttribute('lat'));
            const lon = parseFloat(trkpts[i].getAttribute('lon'));
            if (!isNaN(lat) && !isNaN(lon)) {
              path.push(new kakao.maps.LatLng(lat, lon));
            }
          }

          if (path.length === 0) {
            const rtepts = xml.getElementsByTagName('rtept');
            for (let j = 0; j < rtepts.length; j++) {
              const rLat = parseFloat(rtepts[j].getAttribute('lat'));
              const rLon = parseFloat(rtepts[j].getAttribute('lon'));
              if (!isNaN(rLat) && !isNaN(rLon)) path.push(new kakao.maps.LatLng(rLat, rLon));
            }
          }

          if (path.length === 0) throw new Error('No coordinates found in GPX');

          if (currentGpxPolyline) currentGpxPolyline.setMap(null);
          currentGpxPolyline = new kakao.maps.Polyline({
            map: map,
            path: path,
            strokeWeight: 4.5,
            strokeColor: '#f97316',
            strokeOpacity: 0.9,
            strokeStyle: 'solid'
          });
          activeGpxSpotId = sId;
          showToast('지도에 등산로 코스선(주황색)이 표시되었습니다!', { html: ICONS.HIKING });
          refreshCurrentSpotPopup();
        } catch (err) {
          showToast('등산로 파일을 불러올 수 없습니다.', { html: ICONS.ALERT_CARD });
        }
      }

      function parseStructuredSummary(rawText) {
        if (!rawText) return { view: '', access: '', pitch: '', tip: '', hasParsed: false };
        // DB 구형 태그 [박지/피칭] → 표시/저장 표준 [장소/피칭] 으로 통일 인식
        const clean = String(rawText)
          .replace(/\\n/g, '\n')
          .replace(/\[박지\/피칭\]/gi, '[장소/피칭]')
          .replace(/\[박지\]/gi, '[장소/피칭]');
        const tagRe = /\[(?:뷰\/특징|뷰|특징|접근\/코스|접근|코스|장소\/피칭|장소|피칭|주의\/팁|주의|팁|현장\s*메모)\]/gi;
        const parts = [];
        let lastIdx = 0;
        let m;
        tagRe.lastIndex = 0;
        while ((m = tagRe.exec(clean)) !== null) {
          if (m.index > lastIdx) parts.push({ tag: null, text: clean.slice(lastIdx, m.index) });
          parts.push({ tag: m[0], text: '' });
          lastIdx = m.index + m[0].length;
        }
        if (lastIdx < clean.length) parts.push({ tag: null, text: clean.slice(lastIdx) });

        let view = '', access = '', pitch = '', tip = '', hasParsed = false;
        let current = 'view';

        function append(section, text) {
          const t = String(text || '').replace(/^\s+|\s+$/g, '');
          if (!t) return;
          if (section === 'view') view += (view ? '\n' : '') + t;
          else if (section === 'access') access += (access ? '\n' : '') + t;
          else if (section === 'pitch') pitch += (pitch ? '\n' : '') + t;
          else tip += (tip ? '\n' : '') + t;
        }

        function resolveSection(tag) {
          const t = String(tag || '').replace(/^\[|\]$/g, '');
          if (/^(뷰\/특징|뷰|특징)$/i.test(t)) return 'view';
          if (/^(접근\/코스|접근|코스)$/i.test(t)) return 'access';
          if (/^(장소\/피칭|장소|피칭)$/i.test(t)) return 'pitch';
          if (/^(주의\/팁|주의|팁|현장\s*메모)$/i.test(t)) return 'tip';
          return null;
        }

        parts.forEach((part) => {
          if (part.tag) {
            const sec = resolveSection(part.tag);
            if (sec) {
              current = sec;
              hasParsed = true;
            }
          } else {
            // 줄 단위로 붙이되, 빈 줄은 건너뜀
            String(part.text || '').split('\n').forEach((rawLine) => {
              const line = String(rawLine || '').trim();
              if (line) append(current, line);
            });
          }
        });

        // 태그가 전혀 없으면 전체를 뷰로
        if (!hasParsed) {
          const fallback = clean.replace(/^\s+|\s+$/g, '');
          if (fallback) view = fallback;
        }
        return { view, access, pitch, tip, hasParsed };
      }

      // 제보자가 적어 둔 유튜브만. 검색으로 채운 영상은 여기 넣지 않는다.
      function okbmStoredSpotYouTubeUrls(spot) {
        if (!spot) return [];
        var raw = spot.youtubeUrls || spot.youtube_urls || [];
        if (typeof raw === 'string') {
          raw = raw.split(/[\r\n,]+/).map(function(u) { return String(u || '').trim(); }).filter(Boolean);
        }
        if ((!raw || !raw.length) && spot.mediaUrls) {
          raw = String(spot.mediaUrls).split(/[\r\n,]+/).map(function(u) { return u.trim(); }).filter(function(u) {
            return /youtube\.com|youtu\.be/i.test(u);
          });
        }
        var out = [];
        var seen = {};
        (Array.isArray(raw) ? raw : []).forEach(function(u) {
          if (typeof u !== 'string') return;
          var s = u.trim();
          if (s.length < 6) return;
          if (typeof window.isSearchPageUrl === 'function' && window.isSearchPageUrl(s)) return;
          var key = s.toLowerCase();
          if (seen[key]) return;
          seen[key] = true;
          out.push(s);
        });
        return out;
      }

      function okbmSpotAuthorSnsUrl(spot) {
        if (!spot) return '';
        return String(spot.authorSnsUrl || spot.author_sns_url || '').trim();
      }

      // 등록 유튜브가 있으면 그 영상. 없고 인스타만 있으면 인스타. 검색 영상은 잠금 링크로 쓰지 않는다.
      function okbmSpotUnlockTarget(spot) {
        var yts = okbmStoredSpotYouTubeUrls(spot);
        if (yts.length) {
          var clean = cleanYouTubeUrl(yts[0]);
          if (clean) return clean;
        }
        var sns = okbmSpotAuthorSnsUrl(spot);
        if (sns) return sns;
        return 'https://instagram.com/oklionnature';
      }

      function generateDetailContentHtml(spot, isMobileSheet = false) {
        const sId = String(spot.id).trim();
        const isMember = isUserLoggedIn();
        const memberDetailState = isMember ? memberSpotDetailState(spot) : '';
        
        let cleanMainName = (spot.spot_main || spot.name || '').trim();
        let cleanSubName = (spot.spot_sub || '').trim();
        const parenMatch = cleanMainName.match(/^(.*?)\s*[\(\[（](.*?)[\)\]）]/);
        if (parenMatch) { cleanMainName = parenMatch[1].trim(); if (!cleanSubName) cleanSubName = parenMatch[2].trim(); }
        if (cleanSubName && cleanMainName.includes(cleanSubName)) cleanSubName = '';

        const cityName = spot.cityName ? String(spot.cityName).trim() : (spot.region ? String(spot.region).trim() : '');
        const tName = spot.trailhead_name || `${cleanMainName} 들머리`;
        const rawAddr = spot.trailhead_addr || spot.entryPoint || `${cleanMainName} 인근 주차장`;
        const { navAddress, guide } = parseEntryPoint(rawAddr);
        const cleanAddress = escapeHtml(navAddress || rawAddr);
        const sunset = calculateSunsetTime(spot.lat, spot.lng);
        const safeLat = (isFinite(Number(spot.lat)) ? String(Number(spot.lat)) : '');
        const safeLng = (isFinite(Number(spot.lng)) ? String(Number(spot.lng)) : '');

        const summary = parseStructuredSummary(spot.desc_summary || spot.desc);
        const isFav = userBookmarks.has(sId), isDone = userVisited.has(sId);
        const memoText = userMemos[sId] || '', diffClass = getSpotDiffColorClass(spot.difficulty);
        const isGpxActive = (activeGpxSpotId === sId), isUnlocked = isSpotUnlocked(sId) || isAdminMode;
        
        const targetUnlockLink = okbmSpotUnlockTarget(spot);
        const closeBtn = isMobileSheet ? '' : `<button type="button" class="sheet-close-btn" onclick="closePcSlidingDrawer()" title="닫기">✕</button>`;
        const adminTopActions = isAdminMode ? `
          <div class="sheet-admin-actions" onclick="event.stopPropagation();">
            <button type="button" class="btn-edit" style="display:inline-block;" data-id="${spot.id}" onclick="editSpotById(event, this.dataset.id)">${ICONS.EDIT}수정</button>
            <button type="button" class="btn-edit" style="display:inline-block; background:#0f766e;" data-id="${spot.id}" onclick="startAdminPinMove(this.dataset.id, event)">${ICONS.PIN}핀</button>
            <button type="button" class="btn-del" style="display:inline-block;" data-id="${spot.id}" onclick="deleteSpotById(event, this.dataset.id)">${ICONS.DEL}삭제</button>
            <button type="button" class="btn-edit" style="display:inline-block; background:${isCampBanned(spot) ? '#475569' : '#9f1239'};" data-id="${spot.id}" onclick="window.toggleSpotCampBanById(this.dataset.id, event)">${isCampBanned(spot) ? '금지해제' : '🚫금지'}</button>
          </div>
        ` : '';

        if (isCampBanned(spot)) {
          return `
          <div style="position: relative; width: 100%;">
            <div class="sheet-title-row js-center-spot" style="padding-right: ${isMobileSheet ? '36px' : '0'};" data-lat="${safeLat}" data-lng="${safeLng}" title="지도를 장소 중심으로 이동">
              <div class="compact-title">
                ${cityName ? `<span class="city-badge-colored">${escapeHtml(cityName)}</span>` : ''}
                <span class="${diffClass}">${escapeHtml(cleanMainName)}</span>
                ${spot.elevation ? '<span style="font-size:0.76rem; color:var(--accent-emerald); font-weight:700; display:inline-flex; align-items:center; gap:2px;">' + ICONS.MOUNTAIN + escapeHtml(okbmSpotElevLabel(spot.elevation)) + '</span>' : ''}
                ${getSpotStatusBadges(spot)}
              </div>
              <div class="js-spot-title-actions" style="display:flex; align-items:center; gap:6px; flex-shrink:0;" onclick="event.stopPropagation();">${closeBtn}</div>
            </div>
            ${adminTopActions}
            ${campBanBannerHtml(spot)}
          </div>`;
        }

        return `
          <div style="position: relative; width: 100%;">
            <div class="sheet-title-row js-center-spot" style="padding-right: ${isMobileSheet ? '36px' : '0'};" data-lat="${safeLat}" data-lng="${safeLng}" title="지도를 장소 중심으로 이동">
              <div class="compact-title">
                ${cityName ? `<span class="city-badge-colored">${escapeHtml(cityName)}</span>` : ''}
                <span class="${diffClass}">${escapeHtml(cleanMainName)}</span>
                ${spot.elevation ? '<span style="font-size:0.76rem; color:var(--accent-emerald); font-weight:700; display:inline-flex; align-items:center; gap:2px;">' + ICONS.MOUNTAIN + escapeHtml(okbmSpotElevLabel(spot.elevation)) + '</span>' : ''}
                ${getSpotStatusBadges(spot)}
              </div>
              <div class="js-spot-title-actions" style="display:flex; align-items:center; gap:6px; flex-shrink:0;" onclick="event.stopPropagation();">${closeBtn}</div>
            </div>
            ${adminTopActions}
            ${campBanBannerHtml(spot)}

            ${isCampBanned(spot) ? '' : `
          <!-- 2행: 좌측 세부 포인트 ── 우측 등록자(구형: 오라네) + SNS 미니 아이콘 -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin:4px 0 3px 0; width:100%; min-height:24px;">
              <div style="display:flex; align-items:center; min-width:0; flex:1;">
                ${cleanSubName ? `<span class="badge-sub-point" style="margin:0; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${ICONS.PIN} ${escapeHtml(cleanSubName)}</span>` : ''}
              </div>

              ${(function() {
                var rawAuthor = String(spot.author || spot.authorNick || spot.nickname || '').trim();
                var authorUserId = String(spot.user_id || spot.userId || '').trim();
                var authorName = rawAuthor || '오라네';

                return `
                  <button type="button" data-author="${escapeHtml(authorName)}" data-user-id="${escapeHtml(authorUserId)}" onclick="event.stopPropagation(); if(typeof window.openUserFeedCollectionModal==='function'){ window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId); }" style="display:inline-flex; align-items:center; gap:4px; background:rgba(251,191,36,0.10); border:1px solid rgba(251,191,36,0.38); padding:2px 8px; border-radius:12px; cursor:pointer; flex-shrink:0; margin-left:auto;" title="등록자 정보 보기">
                    <span style="font-size:0.63rem; color:#f59e0b; font-weight:800;">제보</span>
                    <span style="font-size:0.70rem; color:#fde047; font-weight:900;">${escapeHtml(authorName)}</span>
                  </button>
                `;
              })()}
            </div>

            <!-- 2.5행: 좌측 메타 태그 라인 ── 우측 한 칸 내려간 수정건의 버튼 -->
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin:2px 0 3px 0; width:100%;">
              <div style="display:flex; align-items:center; gap:4px; overflow-x:auto; white-space:nowrap; scrollbar-width:none; flex:1;">
                <span data-okbm-review-chip="${escapeHtml(sId)}" style="display:contents;">${typeof window.okbmSpotReviewChipHtml === 'function' ? window.okbmSpotReviewChipHtml(sId) : ''}</span>
                ${getMetaBadgesHtml(spot)}
              </div>
              <button data-metric-click="feat_spot_correction" type="button" data-id="${sId}" onclick="window.openSpotCorrectionModal(this.dataset.id, event);" style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); padding:2px 6px; border-radius:10px; font-size:0.62rem; font-weight:700; color:#94a3b8; cursor:pointer; flex-shrink:0; outline:none;" title="틀린 정보 수정 건의">
                <svg viewBox="0 0 24 24" style="width:9px; height:9px;" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>수정건의</span>
              </button>
            </div>

            <div class="spot-live-weather-bar" style="margin: 2px 0 4px 0; display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
              ${sunset ? `<span class="weather-chip" style="color:#cbd5e1; font-weight:700;">${ICONS.SUNSET} 일몰 ${sunset}</span>` : ''}
              <div id="liveWeatherBox_${spot.id}" style="display:inline-flex; gap:4px;">${cachedWeatherChipsHtml(spot.id)}</div>
            </div>

            ${isCampBanned(spot) ? '' : renderSpotFieldFeedsTrackHtml(spot)}

            ${isCampBanned(spot) ? '' : `
            <div class="summary-block-wrap" style="margin-top:2px;">
              <div class="summary-card summary-card-view">
                <div class="summary-card-title" style="color:#e2e8f0;">${ICONS.VIEW_CARD} [뷰/특징]</div>
                <div class="summary-card-body">${escapeHtml(summary.view || spot.desc || '탁 트인 자연 경관을 즐길 수 있는 추천 장소.')}</div>
              </div>
            </div>`}

            <div class="user-action-grid-3" style="display:flex; gap:5px; width:100%; margin:6px 0 4px 0;" onclick="event.stopPropagation();">
              <button data-metric-click="feat_spot_fav" type="button" class="btn-action-3 btn-action-fav ${isFav ? 'bookmarked' : ''}" data-id="${sId}" onclick="toggleUserBookmark(this.dataset.id, event)">
                ${ICONS.HEART} <span>${isFav ? '찜됨' : '찜하기'}</span>
              </button>
              <button data-metric-click="feat_spot_visited" type="button" class="btn-action-3 btn-action-visited ${isDone ? 'visited' : ''}" data-id="${sId}" onclick="toggleUserVisited(this.dataset.id, event)">
                ${ICONS.FLAG} <span>${isDone ? '클리어' : '다녀왔음'}</span>
              </button>
              <button data-metric-click="feat_spot_share" type="button" class="btn-action-3 btn-action-share" data-id="${sId}" onclick="shareSpotCard(this.dataset.id)">
                ${ICONS.SHARE} <span>공유</span>
              </button>
            </div>`}

            ${isCampBanned(spot) ? '' : !isMember ? `
              <div class="guest-member-lock-card">
                <div style="font-size:0.88rem; font-weight:800; color:var(--accent-amber); display:flex; align-items:center; gap:4px;">${ICONS.LOCK} 낭만 회원 전용 정보 안내</div>
                <div style="font-size:0.72rem; color:var(--text-secondary); line-height:1.45;">
                  소중한 장소 보존과 클린 백패킹 문화를 위해<br><strong>[들머리 내비/2~4단계 실전 팁]</strong>은 로그인 후 공개됩니다.
                </div>
                <button type="button" class="btn-quick-login-unlock" style="width:100%; padding:9px; font-size:0.80rem;" onclick="openLoginModal();">
                  ${ICONS.AUTH} 1초 간편 로그인하고 즉시 확인하기
                </button>
              </div>
            ` : memberDetailState ? renderMemberSpotDetailStateHtml(sId, memberDetailState) : `
             <div class="entry-module-container" style="position:relative; width:100%; display:flex; flex-direction:column; gap:4px; margin:4px 0;">
                <div class="entry-row-1">
                  <div class="entry-address-2line" style="cursor:text; user-select:text; -webkit-user-select:text; pointer-events:auto;" onclick="event.stopPropagation();">${ICONS.NAV} ${escapeHtml(tName)}: ${cleanAddress}</div>
                  <button type="button" class="btn-copy-entry js-copy-entry" data-addr="${cleanAddress}">${ICONS.COPY} 복사</button>
                </div>
                ${guide ? `<div class="entry-guide-chip">${ICONS.TIP} 길 안내: ${escapeHtml(guide)}</div>` : ''}
                <div class="entry-row-2">
                  <button type="button" class="navi-btn-cell cell-kakao js-navi-app" data-navi="kakao" data-name="${escapeHtml(tName)}" data-addr="${cleanAddress}" data-lat="${safeLat}" data-lng="${safeLng}">카카오</button>
                  <button type="button" class="navi-btn-cell cell-tmap js-navi-app" data-navi="tmap" data-name="${escapeHtml(tName)}" data-addr="${cleanAddress}" data-lat="${safeLat}" data-lng="${safeLng}">티맵</button>
                  <button type="button" class="navi-btn-cell cell-naver js-navi-app" data-navi="naver" data-name="${escapeHtml(tName)}" data-addr="${cleanAddress}" data-lat="${safeLat}" data-lng="${safeLng}">네이버</button>
                  <button type="button" class="navi-btn-cell cell-reserve js-navi-app" data-navi="roadview" data-name="${escapeHtml(tName)}" data-addr="${cleanAddress}" data-lat="${safeLat}" data-lng="${safeLng}">${ICONS.ROADVIEW} 로드뷰</button>
                </div>

                ${summary.access ? `
                  <div class="summary-card summary-card-access" style="margin-top:2px;">
                    <div class="summary-card-title" style="color:#2dd4bf;">${ICONS.TRAIL_CARD} [접근/코스]</div>
                    <div>${escapeHtml(summary.access)}</div>
                  </div>` : ''}

                ${!isUnlocked ? `
                  <div data-metric-click="feat_spot_unlock" class="entry-lock-overlay-tight" id="entryLockOverlay_${sId}" data-id="${sId}" data-target="${escapeHtml(targetUnlockLink)}" onclick="triggerSpotUnlock(this.dataset.id, this.dataset.target)">
                    <span class="lock-main-text">${ICONS.LOCK} 클릭 시 들머리 주소, 4대 내비 & 코스 공개 </span>
                    <span class="lock-sub-text">등록자의 링크와 K-LNT 서약 후 상세 목적지, 코스 안내가 열립니다</span>
                  </div>` : ''}

                ${spot.gpxUrl ? `
                  <button data-metric-click="feat_spot_gpx" type="button" class="btn-gpx-track-toggle ${isGpxActive ? 'active' : ''}" data-id="${sId}" data-url="${escapeHtml(spot.gpxUrl)}" onclick="toggleGpxTrack(this.dataset.id, this.dataset.url)">
                    ${ICONS.HIKING} ${isGpxActive ? '지도에서 등산로 선 지우기 ✕' : '등산로 GPX 코스선 지도에 표시'}
                  </button>
                ` : ''}
              </div>

              <div class="summary-block-wrap">
                ${summary.pitch ? `
                  <div class="summary-card summary-card-pitch">
                    <div class="summary-card-title" style="color:#10b981;">${ICONS.PITCH_CARD} [장소/피칭]</div>
                    <div>${escapeHtml(summary.pitch)}</div>
                  </div>` : ''}
                ${summary.tip ? `
                  <div class="summary-card summary-card-tip">
                    <div class="summary-card-title" style="color:#f59e0b;">${ICONS.ALERT_CARD} [주의/팁]</div>
                    <div>${escapeHtml(summary.tip)}</div>
                  </div>` : ''}
              </div>
            `}

            ${isCampBanned(spot) ? '' : `<div data-okbm-review-box="${escapeHtml(sId)}">${typeof window.okbmSpotReviewBoxHtml === 'function' ? window.okbmSpotReviewBoxHtml(sId) : ''}</div>`}

    ${isCampBanned(spot) ? '' : (function() {
              var existingYt = (typeof window.getSpotRegisteredMediaUrls === 'function')
                ? window.getSpotRegisteredMediaUrls(spot, 'yt')
                : (Array.isArray(spot.youtubeUrls) ? spot.youtubeUrls : []).filter(function(u) { return u && u.trim().length > 5; });
              var existingBlog = (typeof window.getSpotRegisteredMediaUrls === 'function')
                ? window.getSpotRegisteredMediaUrls(spot, 'blog')
                : (Array.isArray(spot.blogUrls) ? spot.blogUrls : []).filter(function(u) { return u && u.trim().length > 5; });
              var cachedYt = (window.__spotYtCardsCache && window.__spotYtCardsCache[sId]) || null;
              var cachedBlogs = (window.__spotBlogCardsCache && window.__spotBlogCardsCache[sId]) || null;
              var ytBadge = cachedYt ? cachedYt.length : (existingYt.length || 0);
              var blogBadge = cachedBlogs ? cachedBlogs.length : (existingBlog.length || 0);
              var instaBadge = spotInstaPosts(spot).length;

              var ytTabBg = 'rgba(244,63,94,0.12)';
              var ytTabBorder = '#f43f5e';
              var drawerOpened = 'yt';
              var drawerInner = '<div style="display:flex; align-items:center; justify-content:center; padding:18px 0; color:var(--text-muted); font-size:0.72rem; gap:6px;"><svg viewBox="0 0 24 24" style="width:14px; height:14px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#f43f5e"/></svg><span>실시간 추천 유튜브 영상 불러오는 중...</span></div>';

              return `
                <div style="display:flex; flex-direction:column; width:100%; margin-top:6px; box-sizing:border-box;">
                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; width:100%;">
                    <button data-metric-click="feat_spot_media" type="button" id="btnMediaTab_yt_${sId}" data-type="yt" data-id="${sId}" onclick="window.handleSpotMediaTabClick(this);" style="height:38px; background:${ytTabBg}; border:1px solid ${ytTabBorder}; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; color:#ffffff; transition:all 0.15s ease;">
                      <svg viewBox="0 0 24 24" style="width:14px; height:14px; flex-shrink:0;" fill="#f43f5e"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4 9.6 15.6" fill="#ffffff"/></svg>
                      <span style="font-size:0.75rem; font-weight:800;">YouTube</span>
                      <span id="ytBadgeCount_${sId}" style="font-size:0.65rem; color:#f43f5e; font-weight:900; font-family:'Space Grotesk',sans-serif;">${ytBadge}</span>
                    </button>

                    <button data-metric-click="feat_spot_media" type="button" id="btnMediaTab_blog_${sId}" data-type="blog" data-id="${sId}" onclick="window.handleSpotMediaTabClick(this);" style="height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; color:#ffffff; transition:all 0.15s ease;">
                      <div style="width:14px; height:14px; border-radius:3px; background:#03c75a; display:flex; align-items:center; justify-content:center; font-family:'Space Grotesk',sans-serif; font-size:0.62rem; font-weight:900; color:#fff; flex-shrink:0;">N</div>
                      <span style="font-size:0.75rem; font-weight:800;">블로그</span>
                      <span id="blogBadgeCount_${sId}" style="font-size:0.65rem; color:#34d399; font-weight:900; font-family:'Space Grotesk',sans-serif;">${blogBadge}</span>
                    </button>

                    <button data-metric-click="feat_spot_media" type="button" id="btnMediaTab_insta_${sId}" data-type="insta" data-id="${sId}" onclick="window.handleSpotMediaTabClick(this);" style="height:38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer; color:#ffffff; transition:all 0.15s ease;">
                      <svg viewBox="0 0 24 24" style="width:14px; height:14px; flex-shrink:0;" fill="none" stroke="#f472b6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="#f472b6"/></svg>
                      <span style="font-size:0.75rem; font-weight:800;">인스타</span>
                      <span id="instaBadgeCount_${sId}" style="font-size:0.65rem; color:#f472b6; font-weight:900; font-family:'Space Grotesk',sans-serif;">${instaBadge}</span>
                    </button>
                  </div>

                  <div id="spotMediaDrawerBox_${sId}" data-opened="${drawerOpened}" style="display:flex; flex-direction:column; gap:6px; margin-top:6px; width:100%; box-sizing:border-box;">
                    ${drawerInner}
                  </div>
                </div>
              `;
            })()}

            ${isCampBanned(spot) ? '' : `<div data-okbm-creator-box="${escapeHtml(sId)}">${window.okbmCreatorBoxHtml(sId)}</div>`}

            <div class="app-disclaimer-box">
              <ul>
                <li><span style="color: #fbbf24; font-weight: 800;">•</span> <b>실제 정보와 다를 수 있으니</b> 출발 전 관련 링크를 꼭 확인하세요.</li>
                <li><span style="color: #f43f5e; font-weight: 800;">•</span> 산림 내 화기 사용 및 취사 절대 금지 <span style="color: #fb7185; font-weight: 700;">(산림보호법 제34조)</span></li>
                <li><span style="color: #f43f5e; font-weight: 800;">•</span> 국립·도립공원 무단 야영 및 비박 금지 <span style="color: #fb7185; font-weight: 700;">(자연공원법 위반)</span></li>
                <li><span style="color: #38bdf8; font-weight: 800;">•</span> 쓰레기 무단 투기 및 사유지 침입 금지 <span style="color: #38bdf8; font-weight: 800;">(소중한 장소 보존)</span></li>
              </ul>
            </div>
          </div>`;
      }
window.__ytMetaCache = window.__ytMetaCache || {};
      window.__blogMetaCache = window.__blogMetaCache || {};
      window.__spotAutoVideosCache = window.__spotAutoVideosCache || new Map();
      window.__spotAutoBlogsCache = window.__spotAutoBlogsCache || new Map();
      window.__spotYtCardsCache = window.__spotYtCardsCache || {};
      window.__spotYtPrefetch = window.__spotYtPrefetch || {};
      window.__spotBlogCardsCache = window.__spotBlogCardsCache || {};
      window.__spotBlogPrefetch = window.__spotBlogPrefetch || {};

      window.decodeMediaText = function(s) {
        if (!s) return '';
        var t = String(s);
        try {
          t = t.replace(/\\u([0-9a-fA-F]{4})/g, function(_, h) { return String.fromCharCode(parseInt(h, 16)); });
        } catch (e) {}
        return t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      };

      window.isSearchPageUrl = function(u) {
        var s = String(u || '');
        return /youtube\.com\/results\?/i.test(s) || /search\.naver\.com\//i.test(s);
      };

      window.fetchJsonFast = function(url, timeoutMs) {
        return new Promise(function(resolve, reject) {
          var settled = false;
          var timer = setTimeout(function() {
            if (settled) return;
            settled = true;
            reject(new Error('timeout'));
          }, timeoutMs || 2500);
          fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*' } })
            .then(function(res) {
              if (!res.ok) throw new Error('bad-status');
              return res.json();
            })
            .then(function(data) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve(data);
            })
            .catch(function(err) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err);
            });
        });
      };

      window.fetchTextFast = function(url, timeoutMs) {
        return new Promise(function(resolve, reject) {
          var settled = false;
          var timer = setTimeout(function() {
            if (settled) return;
            settled = true;
            reject(new Error('timeout'));
          }, timeoutMs || 2500);
          fetch(url)
            .then(function(res) {
              if (!res.ok) throw new Error('bad-status');
              return res.text();
            })
            .then(function(text) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              resolve(text);
            })
            .catch(function(err) {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              reject(err);
            });
        });
      };


      window.decodeSearchPayload = function(html) {
        var t = String(html || '').replace(/\\\//g, '/');
        t = t.replace(/uddg=([^&\s)"']+)/g, function(_, enc) {
          try { return 'uddg=' + decodeURIComponent(enc); } catch (e) { return 'uddg=' + enc; }
        });
        t = t.replace(/%3A/gi, ':').replace(/%2F/gi, '/').replace(/%3F/gi, '?').replace(/%3D/gi, '=').replace(/%26/gi, '&').replace(/%2D/gi, '-');
        return t;
      };

      window.extractYouTubeVideosFromText = function(html, limit) {
        var max = limit || 5;
        html = window.decodeSearchPayload(html);
        var extracted = [];
        var seenIds = new Set();
        // 검색 결과에 shorts/ 주소로 한 번이라도 나온 영상은 숏츠다. watch?v= 로 바꾸기 전에 골라 둔다.
        var shortsIds = new Set();
        var shortsRe = /shorts\/([a-zA-Z0-9_-]{11})/g;
        var sm;
        while ((sm = shortsRe.exec(html)) !== null) shortsIds.add(sm[1]);
        function add(id, title) {
          id = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
          if (!id || id.length !== 11 || seenIds.has(id) || extracted.length >= max) return;
          if (shortsIds.has(id) || /#shorts?\b/i.test(String(title || ''))) return;
          if (/^[a-zA-Z0-9_-]{11}$/.test(id) === false) return;
          seenIds.add(id);
          extracted.push({
            id: id,
            title: window.decodeMediaText(title),
            url: 'https://www.youtube.com/watch?v=' + id,
            thumb: 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg'
          });
        }
        var mdRe = /\[([^\]]{2,180})\]\((?:https?:\/\/(?:www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/)([a-zA-Z0-9_-]{11})\)/g;
        var match;
        while ((match = mdRe.exec(html)) !== null && extracted.length < max) add(match[2], match[1]);
        var ddgRe = /\[([^\]]{2,180})\]\([^)\]]*(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
        while ((match = ddgRe.exec(html)) !== null && extracted.length < max) add(match[2], match[1]);
        var watchRe = /(?:watch\?v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/g;
        while ((match = watchRe.exec(html)) !== null && extracted.length < max) add(match[1], '');
        return extracted;
      };

      window.parsePipedOrInvidiousVideos = function(data, limit) {
        var max = limit || 5;
        var items = [];
        if (Array.isArray(data)) items = data;
        else if (data && Array.isArray(data.items)) items = data.items;
        else if (data && Array.isArray(data.videos)) items = data.videos;
        var out = [];
        var seen = new Set();
        for (var i = 0; i < items.length && out.length < max; i++) {
          var it = items[i] || {};
          var kind = String(it.type || it.kind || '').toLowerCase();
          if (kind && kind !== 'video' && kind !== 'stream') continue;
          // 숏츠는 정보창에 넣지 않는다(파이프드 isShort, 주소의 shorts/, 제목의 #shorts)
          if (it.isShort || it.is_short || /shorts\//i.test(String(it.url || it.webpage_url || '')) || /#shorts?\b/i.test(String(it.title || it.name || ''))) continue;
          var id = String(it.videoId || it.videoID || it.id || '').trim();
          if (!id || id.length !== 11) {
            var m = String(it.url || it.webpage_url || '').match(/(?:v=|\/watch\/|youtu\.be\/|shorts\/)([\w-]{11})/);
            id = m ? m[1] : '';
          }
          if (!id || id.length !== 11 || seen.has(id)) continue;
          seen.add(id);
          out.push({
            id: id,
            title: window.decodeMediaText(it.title || it.name || ''),
            url: 'https://www.youtube.com/watch?v=' + id,
            thumb: 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg'
          });
        }
        return out;
      };

      window.normalizeNaverBlogPost = function(raw) {
        var s = String(raw || '');
        var m = s.match(/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{8,})/i);
        if (m) {
          return { url: 'https://blog.naver.com/' + m[1] + '/' + m[2], blogId: m[1], logNo: m[2] };
        }
        var q = s.match(/blogId=([A-Za-z0-9_-]+)[\s\S]{0,120}?logNo=(\d{8,})/i);
        if (q) {
          return { url: 'https://blog.naver.com/' + q[1] + '/' + q[2], blogId: q[1], logNo: q[2] };
        }
        return null;
      };


      window.normalizeSearchAreaName = function(raw) {
        var city = String(raw || '').trim();
        if (!city || city.indexOf('/') !== -1) return '';
        city = city.split(/\s+/)[0];
        city = city.replace(/(특별자치)?시$|군$|구$|특별자치도$|광역시$|도$/g, '').trim();
        var aliases = {
          '옹진': '인천',
          '울주': '울산',
          '종로': '서울',
          '중': '서울',
          '영종': '인천',
          '울릉': '울릉도'
        };
        if (aliases[city]) city = aliases[city];
        if (city && city.length >= 2 && city.length <= 8) return city;
        return '';
      };

      window.extractAreaForSearch = function(spot) {
        if (!spot) return '';
        var city = window.normalizeSearchAreaName(spot.cityName || spot.city_name || '');
        if (city) return city;
        var addr = String(spot.trailhead_addr || spot.entryPoint || '');
        var m = addr.match(/([가-힣]{2,10}(?:시|군|구))/);
        if (m && m[1]) {
          var fromAddr = window.normalizeSearchAreaName(m[1]);
          if (fromAddr) return fromAddr;
        }
        var full = window.cleanSpotSearchName(spot.fullName || spot.fullname || '');
        var fullHead = full.split(/\s+/)[0] || '';
        if (fullHead && !/[산봉악령]$/.test(fullHead) && fullHead.length >= 2 && fullHead.length <= 4) return fullHead;
        var region = String(spot.region || '').trim();
        if (region.indexOf('/') !== -1) {
          var bits = region.split('/').map(function(p) { return window.normalizeSearchAreaName(p); }).filter(Boolean);
          if (bits.length) return bits[bits.length - 1];
        }
        return window.normalizeSearchAreaName(region);
      };

      window.cleanSpotSearchName = function(spotName) {
        return String(spotName || '')
          .replace(/\[.*?\]/g, ' ')
          .replace(/\(.*?\)/g, ' ')
          .replace(/정상|전망데크|전망대|데크|능선|코스|야영장|캠핑장|주차장|탐방로|최단/g, ' ')
          .replace(/[\/|,·~]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      window.extractMountainSearchName = function(spotName) {
        var cleaned = window.cleanSpotSearchName(spotName);
        var tokens = cleaned.split(/\s+/).filter(Boolean);
        if (!tokens.length) return cleaned;
        if (tokens.length === 1) return tokens[0];
        var named = tokens.filter(function(t) {
          return /[가-힣]{1,10}(?:산|봉|악|령|재|도|봉우리)$/.test(t);
        });
        if (named.length) {
          var island = named.filter(function(t) { return /도$/.test(t) && t.length >= 2; });
          if (island.length) return island[0];
          return named[named.length - 1];
        }
        var sanMatches = cleaned.match(/[가-힣]{1,10}산/g);
        if (sanMatches && sanMatches.length) return sanMatches[sanMatches.length - 1];
        return tokens.join(' ');
      };

      window.buildSpotMediaQueryVariants = function(spotName, areaName) {
        var cleaned = window.cleanSpotSearchName(spotName);
        var mountain = window.extractMountainSearchName(spotName);
        var area = window.normalizeSearchAreaName(areaName) || String(areaName || '').trim();
        if (area && mountain && mountain.indexOf(area) !== -1) area = '';
        if (area && mountain && area.indexOf(mountain) !== -1) area = '';
        var variants = [];
        function add(q) {
          q = String(q || '').replace(/\s+/g, ' ').trim();
          if (q && variants.indexOf(q) === -1) variants.push(q);
        }
        var intents = ['백패킹', '야영', '캠핑'];
        if (area && mountain) {
          intents.forEach(function(k) { add(area + ' ' + mountain + ' ' + k); });
        }
        if (mountain) {
          intents.forEach(function(k) { add(mountain + ' ' + k); });
        }
        if (cleaned && cleaned !== mountain) {
          if (area) intents.forEach(function(k) { add(area + ' ' + cleaned + ' ' + k); });
          intents.forEach(function(k) { add(cleaned + ' ' + k); });
        }
        if (area && mountain) add(area + ' ' + mountain + ' 장소');
        if (mountain) add(mountain + ' 장소');
        return variants;
      };

      window.buildSpotMediaQuery = function(spotName, areaName) {
        var variants = window.buildSpotMediaQueryVariants(spotName, areaName);
        return variants[0] || ((window.extractMountainSearchName(spotName) || String(spotName || '').trim()) + ' 백패킹');
      };

      window.countSpotsWithMountainName = function(mountain) {
        var name = String(mountain || '').trim();
        if (!name || !Array.isArray(spots)) return 0;
        var n = 0;
        spots.forEach(function(s) {
          if (!s) return;
          var m = window.extractMountainSearchName(s.spot_main || s.name || '');
          if (m === name) n += 1;
        });
        return n;
      };

      window.buildSpotBlogQueryVariants = function(spotName, areaName) {
        var variants = window.buildSpotMediaQueryVariants(spotName, areaName);
        var mountain = window.extractMountainSearchName(spotName);
        var area = window.normalizeSearchAreaName(areaName) || String(areaName || '').trim();
        if (area && mountain && window.countSpotsWithMountainName(mountain) > 1) {
          variants = variants.filter(function(q) {
            return q.indexOf(area) !== -1 && q.indexOf(mountain) !== -1;
          });
          if (!variants.length) variants = [area + ' ' + mountain + ' 백패킹'];
        }
        return variants;
      };

      // 세부 장소(spot_sub)에서 "정상·데크·활공장" 같은 흔한 말을 빼고 고유 이름만 남긴다. 예: "국사봉 활공장" → "국사봉"
      window.extractSubSearchName = function(sub) {
        var words = String(sub || '').replace(/\(.*?\)|\[.*?\]/g, ' ').split(/[\s,·&\/]+/);
        var generic = /^(정상|정상부|데크|전망데크|전망대|전망|나무데크|헬기장|활공장|노지|능선|암릉|박지|아래|인근|및|쉼터|야영장|해변|해수욕장|공터|잔디|바위|절벽|중턱|입구|주차장|일대|부근|\d+봉|\d+층|1박)$/;
        var keep = words.map(function(w) { return w.trim(); }).filter(function(w) { return w && !generic.test(w) && !generic.test(w.replace(/^(정상|전망|나무|바다|산불감시)+/, '')); });
        var name = keep.join(' ').trim();
        return name.replace(/\s/g, '').length >= 2 ? name : '';
      };

      // 세부 장소 이름 중 봉우리·섬처럼 고유한 이름만 고른다. 예: "국사봉 붕어섬전망대" → ["국사봉"], "마당바위 천연 슬랩" → []
      window.extractSubPeakNames = function(subKey) {
        return String(subKey || '').split(/\s+/).filter(function(w) {
          return /^[가-힣]{1,8}(?:산|봉|도|섬|령|재)$/.test(w) && w.length >= 2;
        });
      };

      // 제목에 산 이름이나 세부 장소 이름이 있는 영상만 남긴다. 하나도 없으면 빈 목록을 준다(상관없는 영상으로 채우지 않는다).
      window.rankMediaBySpot = function(list, spotName, areaName, limit, subKey) {
        var max = limit || 5;
        var subTight = String(subKey || '').replace(/\s/g, '');
        var subPeaks = window.extractSubPeakNames(subKey);
        var name = window.cleanSpotSearchName(spotName);
        var mountainTight = window.extractMountainSearchName(spotName).replace(/\s/g, '');
        var area = String(areaName || '').trim();
        var scored = (list || []).map(function(item) {
          var t = String((item && item.title) || '');
          var tTight = t.replace(/\s/g, '');
          var score = 0;
          if (mountainTight && tTight.indexOf(mountainTight) !== -1) score += 10;
          if (subTight && tTight.indexOf(subTight) !== -1) score += 10;
          else if (subPeaks.some(function(p) { return t.indexOf(p) !== -1; })) score += 10;
          if (name && name.replace(/\s/g, '') !== mountainTight && t.indexOf(name) !== -1) score += 6;
          if (area && t.indexOf(area) !== -1) score += 4;
          if (/장소|백패킹|야영|캠핑|비박|등산/.test(t)) score += 3;
          if ((item.title || '').length >= 6) score += 1;
          return { item: item, score: score };
        });
        scored.sort(function(a, b) { return b.score - a.score; });
        return scored.filter(function(x) { return x.score >= 10; }).map(function(x) { return x.item; }).slice(0, max);
      };

      window.fetchRealYouTubeVideosForSpot = async function(spotName, areaName, subName) {
        if (!spotName) return [];
        var variants = window.buildSpotMediaQueryVariants(spotName, areaName);
        if (!variants.length) variants = [window.buildSpotMediaQuery(spotName, areaName)];
        // 산 이름 검색을 맨 앞에 두고, 세부 장소는 두 번째로 찾는다.
        // 세부 장소가 봉우리 이름이면 그 이름으로(예: 매악산 → "상주 국사봉 백패킹"), 아니면 산 이름을 붙여서(예: "병풍산 마당바위 백패킹").
        // 세부 장소만으로 찾으면 "마당바위·팔각정·산성" 같은 흔한 말 때문에 다른 산 영상이 딸려 온다.
        var subKey = window.extractSubSearchName(subName);
        if (subKey) {
          var subArea = window.normalizeSearchAreaName(areaName) || '';
          var subMountain = window.extractMountainSearchName(spotName);
          var subPeak = window.extractSubPeakNames(subKey).filter(function(p) { return p !== subMountain; })[0] || '';
          var subQuery = '';
          if (subPeak) subQuery = (subArea ? subArea + ' ' : '') + subPeak + ' 백패킹';
          else if (subMountain && subKey.indexOf(subMountain) === -1) subQuery = subMountain + ' ' + subKey.split(/\s+/)[0] + ' 백패킹';
          if (subQuery && variants.indexOf(subQuery) === -1) variants = variants.slice(0, 1).concat([subQuery], variants.slice(1));
        }
        var cacheKey = 'yt:v7:' + variants[0] + '|' + (subKey || '');

        if (window.__spotAutoVideosCache.has(cacheKey)) {
          return window.__spotAutoVideosCache.get(cacheKey);
        }

        try {
          var sessionCached = sessionStorage.getItem('okbm_yt_cache_v7_' + cacheKey);
          if (sessionCached) {
            var parsed = JSON.parse(sessionCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              limitedMapSet(window.__spotAutoVideosCache, cacheKey, parsed, 80);
              return parsed;
            }
          }
        } catch (e) {}

        var merged = [];
        var seenIds = new Set();
        function absorb(list) {
          (list || []).forEach(function(item) {
            if (!item || !item.id || seenIds.has(item.id)) return;
            seenIds.add(item.id);
            merged.push(item);
          });
        }

        async function searchOne(query) {
          var encoded = encodeURIComponent(query + ' site:youtube.com');
          var htmls = await Promise.all([
            window.fetchTextFast('https://r.jina.ai/https://html.duckduckgo.com/html/?q=' + encoded, 10000).catch(function() { return ''; }),
            window.fetchTextFast('https://r.jina.ai/https://lite.duckduckgo.com/lite/?q=' + encoded, 10000).catch(function() { return ''; })
          ]);
          htmls.forEach(function(html) {
            if (html) absorb(window.extractYouTubeVideosFromText(html, 8));
          });
          if (relevantCount() >= 10) return;
          try {
            var piped = await window.fetchJsonFast('https://api.piped.private.coffee/search?q=' + encodeURIComponent(query) + '&filter=videos', 8000);
            absorb(window.parsePipedOrInvidiousVideos(piped, 8));
          } catch (e) {}
        }
        // 몇 개 모였는지는 이 박지와 맞는 영상만 센다(엉뚱한 영상이 많이 와도 다음 검색어로 넘어가게).
        function relevantCount() {
          return window.rankMediaBySpot(merged, spotName, areaName, 10, subKey).length;
        }

        var primary = variants.slice(0, 2);
        for (var i = 0; i < primary.length && relevantCount() < 10; i++) {
          await searchOne(primary[i]);
        }
        if (relevantCount() < 6) {
          for (var j = 2; j < Math.min(variants.length, 5) && relevantCount() < 10; j++) {
            await searchOne(variants[j]);
          }
        }

        var extracted = window.rankMediaBySpot(merged, spotName, areaName, 10, subKey);

        if (extracted.length > 0) {
          limitedMapSet(window.__spotAutoVideosCache, cacheKey, extracted, 80);
          try { sessionStorage.setItem('okbm_yt_cache_v7_' + cacheKey, JSON.stringify(extracted)); } catch (e) {}
        }
        return extracted;
      };

      window.fetchRealNaverBlogsForSpot = async function(spotName, areaName) {
        if (!spotName) return [];
        var mountain = window.extractMountainSearchName(spotName);
        var area = window.normalizeSearchAreaName(areaName) || String(areaName || '').trim();
        var variants = window.buildSpotBlogQueryVariants(spotName, areaName);
        if (!variants.length) variants = [window.buildSpotMediaQuery(spotName, areaName)];
        var cacheKey = 'mt:v11:' + (mountain || variants[0]) + (area ? ('|' + area) : '');

        if (window.__spotAutoBlogsCache.has(cacheKey)) {
          return window.__spotAutoBlogsCache.get(cacheKey);
        }

        try {
          var sessionCached = sessionStorage.getItem('okbm_blog_cache_v11_' + cacheKey);
          if (sessionCached) {
            var parsed = JSON.parse(sessionCached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              limitedMapSet(window.__spotAutoBlogsCache, cacheKey, parsed, 80);
              return parsed;
            }
          }
        } catch (e) {}

        var merged = {};

        function absorb(list) {
          (list || []).forEach(function(item) {
            if (!item || !item.url) return;
            var parsed = window.normalizeNaverBlogPost(item.url);
            if (!parsed) return;
            var key = parsed.blogId + '/' + parsed.logNo;
            if (!merged[key]) {
              merged[key] = {
                url: parsed.url,
                blogId: parsed.blogId,
                title: item.title || '',
                postdate: /^\d{8}$/.test(String(item.postdate || '')) ? String(item.postdate) : '',
                score: item.title ? 10 : 0
              };
              return;
            }
            if ((item.title || '').length > (merged[key].title || '').length) merged[key].title = item.title;
            if (/^\d{8}$/.test(String(item.postdate || '')) && String(item.postdate) > (merged[key].postdate || '')) merged[key].postdate = String(item.postdate);
            merged[key].score += item.title ? 8 : 1;
          });
        }

        function allRanked() {
          var list = Object.keys(merged).map(function(k) { return merged[k]; });
          list.sort(function(a, b) {
            var ad = String(a.postdate || '');
            var bd = String(b.postdate || '');
            if (ad !== bd) return ad < bd ? 1 : -1;
            var at = (a.title || '').length >= 6 ? 1 : 0;
            var bt = (b.title || '').length >= 6 ? 1 : 0;
            return (bt - at) || (b.score - a.score);
          });
          var titled = list.filter(function(item) { return (item.title || '').length >= 6; });
          return titled.length >= 5 ? titled : list;
        }

        function fillFive(list) {
          var picked = [];
          var seen = {};
          function pushFrom(pred) {
            (list || []).forEach(function(item) {
              if (!item || picked.length >= 5 || seen[item.url] || !pred(item)) return;
              seen[item.url] = true;
              picked.push(item);
            });
          }
          var titleOf = function(item) { return String(item.title || ''); };
          if (area && mountain) {
            pushFrom(function(item) {
              var t = titleOf(item);
              return t.indexOf(area) !== -1 && t.indexOf(mountain) !== -1;
            });
          }
          if (mountain && !picked.length) {
            pushFrom(function(item) { return titleOf(item).indexOf(mountain) !== -1; });
          }
          if (!picked.length) pushFrom(function() { return true; });
          return picked;
        }

        try {
          var base = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
          var key = window.SUPABASE_ANON_KEY || '';
          var res = await fetch(base + '/functions/v1/blog-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': key,
              'Authorization': 'Bearer ' + key
            },
            body: JSON.stringify({ queries: variants.slice(0, 4) })
          });
          if (res.ok) {
            var payload = await res.json();
            absorb(payload && payload.items);
          }
        } catch (e) {
          console.warn('[map.html:fetchRealNaverBlogsForSpot]', e);
        }

        var extracted = fillFive(allRanked());

        if (extracted.length > 0) {
          limitedMapSet(window.__spotAutoBlogsCache, cacheKey, extracted, 80);
          try { sessionStorage.setItem('okbm_blog_cache_v11_' + cacheKey, JSON.stringify(extracted)); } catch (e) {}
        }
        return extracted;
      };

      window.fetchYouTubeRealTitle = async function(url, domId, fallbackTitle) {
        if (!url) return;
        var cleanUrl = cleanYouTubeUrl(url);
        if (window.__ytMetaCache[cleanUrl]) {
          var el = document.getElementById(domId);
          if (el) el.innerText = window.__ytMetaCache[cleanUrl];
          return;
        }

        try {
          var res = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(cleanUrl));
          if (res.ok) {
            var data = await res.json();
            if (data && data.title) {
              limitedObjSet(window.__ytMetaCache, cleanUrl, data.title, 100);
              var targetEl = document.getElementById(domId);
              if (targetEl) targetEl.innerText = data.title;
              return;
            }
          }
        } catch (e) { console.warn('[map.html:fetchYouTubeRealTitle]', e); }

        var finalEl = document.getElementById(domId);
        if (finalEl && fallbackTitle) finalEl.innerText = fallbackTitle;
      };

      window.handleSpotMediaTabClick = function(btn) {
        if (!btn || !btn.dataset) return;
        var type = btn.dataset.type;
        var sId = btn.dataset.id;
        var targetSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(sId).trim(); });
        var spotName = targetSpot ? (targetSpot.spot_main || targetSpot.name || '장소') : '장소';
        var list = targetSpot ? window.getSpotRegisteredMediaUrls(targetSpot, type) : [];
        window.toggleSpotMediaDrawer(type, sId, spotName, list);
      };

window.fetchNaverBlogRealMeta = async function(url, titleDomId, imgDomId, fallbackTitle) {
        if (!url) return;
        var cleanUrl = String(url).trim();
        
        // 메모리 캐시 최우선 인출 (0.001초 인출)
        if (window.__blogMetaCache[cleanUrl]) {
          var cached = window.__blogMetaCache[cleanUrl];
          var tEl = document.getElementById(titleDomId);
          var bEl = document.getElementById(titleDomId + '_blogName');
          if (tEl && cached.title) tEl.innerText = cached.title;
          if (bEl && cached.blogName) bEl.innerText = cached.blogName;
          return;
        }

        try {
          var blogId = '';
          var naverMatch = cleanUrl.match(/blog\.naver\.com\/([a-zA-Z0-9_-]+)\/([0-9]+)/);
          if (naverMatch) {
            blogId = naverMatch[1];
          }

          // 본문 직통 PostView 주소로 실제 글제목 및 닉네임 수급
          var targetFetchUrl = cleanUrl;
          if (naverMatch) {
            targetFetchUrl = 'https://blog.naver.com/PostView.naver?blogId=' + blogId + '&logNo=' + naverMatch[2];
          }

          var apiUrl = 'https://api.microlink.io/?url=' + encodeURIComponent(targetFetchUrl);
          var res = await fetch(apiUrl);
          if (res.ok) {
            var json = await res.json();
            if (json && json.status === 'success' && json.data) {
              var realTitle = json.data.title || '';
              
              // 🌟 [한글 블로그 닉네임(삶에 기록) 1순위 추출 엔진]
              var rawNick = json.data.author || json.data.publisher || '';
              rawNick = rawNick.replace(/\s*[:\-]\s*네이버\s*블로그\s*$/i, '').trim();
              if (rawNick === 'Naver' || rawNick === '네이버 블로그' || rawNick === '네이버') {
                rawNick = '';
              }

              // 네이버 블로그 특유의 사족 후미 문구 정돈
              realTitle = realTitle.replace(/\s*[:\-]\s*네이버\s*블로그\s*$/i, '').trim();

              // 한글 닉네임 1순위 적용 (없을 경우에만 보조 텍스트 활용)
              var displayBlogName = rawNick || (blogId ? '@' + blogId : '실전 캠퍼');

              if (realTitle) {
                limitedObjSet(window.__blogMetaCache, cleanUrl, { title: realTitle, blogName: displayBlogName }, 100);
                
                var targetTitleEl = document.getElementById(titleDomId);
                var targetBlogEl = document.getElementById(titleDomId + '_blogName');

                if (targetTitleEl && realTitle) targetTitleEl.innerText = realTitle;
                if (targetBlogEl && displayBlogName) targetBlogEl.innerText = displayBlogName;
                return;
              }
            }
          }
        } catch (e) { console.warn('[map.html:fetchNaverBlogRealMeta]', e); }

        // 최종 폴백 바인딩
        var finalTitleEl = document.getElementById(titleDomId);
        if (finalTitleEl && fallbackTitle) finalTitleEl.innerText = fallbackTitle;
      };

      window.collectSpotMediaFromHistory = function(spotId, spotName, type) {
        var id = String(spotId || '').trim();
        var nameKey = String(spotName || '').replace(/\s+/g, '').toLowerCase();
        var pools = [];
        if (Array.isArray(window.packingHistoryList)) pools.push(window.packingHistoryList);
        if (Array.isArray(window.interactiveHistory)) pools.push(window.interactiveHistory);
        try {
          var local = JSON.parse(localStorage.getItem('okbm_packing_history') || '[]');
          if (Array.isArray(local)) pools.push(local);
        } catch (e) {}
        var out = [];
        var seen = {};
        pools.forEach(function(list) {
          (list || []).forEach(function(r) {
            if (!r) return;
            var rid = String(r.spotId || r.spot_id || '').trim();
            var rName = String(r.spot || r.spotName || r.spot_main || '').replace(/\s+/g, '').toLowerCase();
            var hit = (id && rid && rid === id) || (nameKey && rName && (rName === nameKey || rName.indexOf(nameKey) !== -1 || nameKey.indexOf(rName) !== -1));
            if (!hit) return;
            var raw = (type === 'yt') ? (r.youtube || r.youtubeUrl || r.youtube_url || '') : (r.blog || r.blogUrl || r.blog_url || '');
            var urls = Array.isArray(raw) ? raw : [raw];
            urls.forEach(function(u) {
              var s = String(u || '').trim();
              if (!s || s.length < 6 || (typeof window.isSearchPageUrl === 'function' && window.isSearchPageUrl(s))) return;
              var key = s.toLowerCase();
              if (seen[key]) return;
              seen[key] = true;
              out.push(s);
            });
          });
        });
        return out;
      };

      window.getSpotRegisteredMediaUrls = function(spot, type) {
        if (!spot) return [];
        var raw = (type === 'yt')
          ? (spot.youtubeUrls || spot.youtube_urls || [])
          : (spot.blogUrls || spot.blog_urls || []);
        if (typeof raw === 'string') {
          raw = raw.split(/[\r\n,]+/).map(function(u) { return String(u || '').trim(); }).filter(Boolean);
        }
        if ((!raw || !raw.length) && spot.mediaUrls) {
          var lines = String(spot.mediaUrls || '').split(/[\r\n,]+/).map(function(u) { return u.trim(); }).filter(Boolean);
          raw = lines.filter(function(u) {
            if (type === 'yt') return /youtube\.com|youtu\.be/i.test(u);
            return /blog\.naver\.com/i.test(u);
          });
        }
        var list = Array.isArray(raw) ? raw.slice() : [];
        var hist = window.collectSpotMediaFromHistory(spot.id, spot.spot_main || spot.name || '', type);
        hist.forEach(function(u) { list.push(u); });
        var out = [];
        var seen = {};
        list.forEach(function(u) {
          if (!u || typeof u !== 'string') return;
          var s = u.trim();
          if (s.length < 6 || window.isSearchPageUrl(s)) return;
          var key = s.toLowerCase();
          if (seen[key]) return;
          seen[key] = true;
          out.push(s);
        });
        return out.slice(0, 5);
      };

      window.invalidateSpotMediaCacheIfStale = function(spotId, type, registeredList) {
        var id = String(spotId || '').trim();
        if (!id) return;
        var registered = (Array.isArray(registeredList) ? registeredList : []).filter(function(u) {
          return u && typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        });
        if (!registered.length) return;
        var isYt = type === 'yt';
        var cache = isYt ? window.__spotYtCardsCache : window.__spotBlogCardsCache;
        var prefetch = isYt ? window.__spotYtPrefetch : window.__spotBlogPrefetch;
        if (!cache || !Object.prototype.hasOwnProperty.call(cache, id)) return;
        var cards = cache[id] || [];
        var missing = false;
        for (var i = 0; i < registered.length; i++) {
          var url = registered[i];
          if (isYt) {
            var clean = cleanYouTubeUrl(url);
            var m = clean.match(/[?&]v=([\w-]{11})/);
            var vId = (m && m[1]) ? m[1] : '';
            if (!vId) continue;
            if (!cards.some(function(c) { return c && (c.id === vId || String(c.url || '').indexOf(vId) !== -1); })) {
              missing = true;
              break;
            }
          } else {
            var parsed = window.normalizeNaverBlogPost(url);
            if (!parsed) continue;
            var key = parsed.blogId + '/' + parsed.logNo;
            if (!cards.some(function(c) {
              if (!c) return false;
              if (c.blogId && String(c.blogId) === parsed.blogId && String(c.url || '').indexOf(parsed.logNo) !== -1) return true;
              var p2 = window.normalizeNaverBlogPost(c.url);
              return p2 && (p2.blogId + '/' + p2.logNo) === key;
            })) {
              missing = true;
              break;
            }
          }
        }
        if (!missing) return;
        try { delete cache[id]; } catch (e) {}
        try { if (prefetch) delete prefetch[id]; } catch (e2) {}
      };

      window.paintSpotMediaDrawer = function(spotId, spotName, type, cards, stillLoading) {
        var drawer = document.getElementById('spotMediaDrawerBox_' + spotId);
        if (!drawer) return;
        if ((drawer.dataset.opened || 'yt') !== type) return;
        var seq = String(Number(drawer.dataset.mediaSeq || 0) + 1);
        drawer.dataset.mediaSeq = seq;
        drawer.dataset.mediaType = type;
        if (type === 'yt') {
          window.renderSpotYouTubeCards(drawer, spotId, spotName, cards || [], seq, !!stillLoading);
        } else {
          window.renderSpotBlogCards(drawer, spotId, spotName, cards || [], seq, !!stillLoading);
        }
      };

      window.showSpotMediaLoading = function(spotId, type) {
        var drawer = document.getElementById('spotMediaDrawerBox_' + spotId);
        if (!drawer) return;
        var color = (type === 'yt') ? '#f43f5e' : '#10b981';
        var label = (type === 'yt') ? '실시간 추천 유튜브 영상 불러오는 중...' : '실시간 추천 블로그 글 불러오는 중...';
        drawer.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:center; padding:18px 0; color:var(--text-muted); font-size:0.72rem; gap:6px;">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="${color}"/></svg>
            <span>${label}</span>
          </div>`;
      };

      window.prefetchSpotMediaForSpot = function(spot) {
        if (!spot) return;
        var spotId = String(spot.id).trim();
        var spotName = spot.spot_main || spot.name || '장소';
        window.prefetchSpotYouTubeList(spotId, spotName, window.getSpotRegisteredMediaUrls(spot, 'yt'));
        window.prefetchSpotBlogList(spotId, spotName, window.getSpotRegisteredMediaUrls(spot, 'blog'));
      };

      window.bindSpotMediaDrawer = function(spot) {
        if (!spot) return;
        var spotId = String(spot.id).trim();
        var spotName = spot.spot_main || spot.name || '장소';
        var drawer = document.getElementById('spotMediaDrawerBox_' + spotId);
        if (!drawer) return;

        var ytReg = window.getSpotRegisteredMediaUrls(spot, 'yt');
        var blogReg = window.getSpotRegisteredMediaUrls(spot, 'blog');
        window.invalidateSpotMediaCacheIfStale(spotId, 'yt', ytReg);
        window.invalidateSpotMediaCacheIfStale(spotId, 'blog', blogReg);
        window.prefetchSpotMediaForSpot(spot);

        var opened = drawer.dataset.opened || 'yt';
        if (opened === 'none') return;
        if (opened === 'insta') {
          drawer.innerHTML = renderSpotInstaRowHtml(spot);
          return;
        }

        var cache = (opened === 'yt') ? window.__spotYtCardsCache : window.__spotBlogCardsCache;
        if (Object.prototype.hasOwnProperty.call(cache, spotId)) {
          window.paintSpotMediaDrawer(spotId, spotName, opened, cache[spotId], false);
          return;
        }

        var pending = (opened === 'yt') ? window.__spotYtPrefetch[spotId] : window.__spotBlogPrefetch[spotId];
        if (!pending) return;
        pending.then(function(cards) {
          var d = document.getElementById('spotMediaDrawerBox_' + spotId);
          if (!d || (d.dataset.opened || 'yt') !== opened) return;
          window.paintSpotMediaDrawer(spotId, spotName, opened, cards, false);
        });
      };

      // 📱 [유튜브 실제 제목 자동 바인딩 & 메인 16:9 대형 썸네일 + 추가 영상 순차 서랍 엔진]
      window.toggleSpotMediaDrawer = function(type, spotId, spotName, rawList) {
        var drawer = document.getElementById('spotMediaDrawerBox_' + spotId);
        var btnYt = document.getElementById('btnMediaTab_yt_' + spotId);
        var btnBlog = document.getElementById('btnMediaTab_blog_' + spotId);
        var btnInsta = document.getElementById('btnMediaTab_insta_' + spotId);
        if (!drawer) return;
        var tabOff = function(b) { if (b) { b.style.borderColor = 'rgba(255,255,255,0.12)'; b.style.background = 'rgba(255,255,255,0.04)'; } };

        var currentOpened = drawer.dataset.opened || 'none';
        var list = Array.isArray(rawList) ? rawList.filter(function(u) {
          return u && typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        }) : [];
        var isYt = (type === 'yt');

        if (currentOpened === type && drawer.style.display !== 'none') {
          drawer.style.display = 'none';
          drawer.dataset.opened = 'none';
          tabOff(btnYt); tabOff(btnBlog); tabOff(btnInsta);
          return;
        }

        tabOff(btnYt); tabOff(btnBlog); tabOff(btnInsta);
        if (isYt) {
          if (btnYt) { btnYt.style.borderColor = '#f43f5e'; btnYt.style.background = 'rgba(244,63,94,0.12)'; }
        } else if (type === 'insta') {
          if (btnInsta) { btnInsta.style.borderColor = '#f472b6'; btnInsta.style.background = 'rgba(244,114,182,0.12)'; }
        } else {
          if (btnBlog) { btnBlog.style.borderColor = '#10b981'; btnBlog.style.background = 'rgba(16,185,129,0.12)'; }
        }

        drawer.style.display = 'flex';
        drawer.dataset.opened = type;

        // 인스타는 검색 없이 등록된 게시물만 그린다
        if (type === 'insta') {
          drawer.dataset.mediaType = 'insta';
          drawer.dataset.mediaSeq = String(Number(drawer.dataset.mediaSeq || 0) + 1);
          var instaSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
          drawer.innerHTML = renderSpotInstaRowHtml(instaSpot);
          return;
        }

        window.invalidateSpotMediaCacheIfStale(spotId, type, list);

        var cache = isYt ? window.__spotYtCardsCache : window.__spotBlogCardsCache;
        if (Object.prototype.hasOwnProperty.call(cache, spotId)) {
          window.paintSpotMediaDrawer(spotId, spotName, type, cache[spotId], false);
          return;
        }

        window.showSpotMediaLoading(spotId, type);
        var pending = isYt
          ? window.prefetchSpotYouTubeList(spotId, spotName, list)
          : window.prefetchSpotBlogList(spotId, spotName, list);
        pending.then(function(cards) {
          var d = document.getElementById('spotMediaDrawerBox_' + spotId);
          if (!d || d.dataset.opened !== type) return;
          window.paintSpotMediaDrawer(spotId, spotName, type, cards, false);
        });
      };
      window.renderSpotYouTubeCards = function(drawer, spotId, spotName, finalCards, seq, stillLoading) {
        if (!drawer || drawer.dataset.mediaSeq !== seq || drawer.dataset.mediaType !== 'yt') return;
        var badgeEl = document.getElementById('ytBadgeCount_' + spotId);
        if (badgeEl) badgeEl.innerText = String(finalCards.length);
        if (!finalCards.length && stillLoading) return;

        if (!finalCards.length) {
          drawer.innerHTML = '<div style="padding:14px 4px; color:#94a3b8; font-size:0.72rem; text-align:center;">관련 유튜브 영상을 찾지 못했습니다.</div>';
          return;
        }

        var html = finalCards.map(function(item, idx) {
          return window.okbmWrapCreatorCard(spotId, item, ytCardHtml(item, idx));
        }).join('');
        function ytCardHtml(item, idx) {
          var titleDomId = 'ytMountTitle_' + spotId + '_' + idx;
          if (!item.title) {
            setTimeout(function() {
              window.fetchYouTubeRealTitle(item.url, titleDomId, spotName + ' 백패킹');
            }, 10);
          }
          return `
            <a href="${escapeHtml(okbmSafeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:5px; text-decoration:none; box-sizing:border-box; width:100%;">
              <div style="flex:0 0 calc(50% - 4px); width:calc(50% - 4px); aspect-ratio:16/9; border-radius:6px; overflow:hidden; background:#000; position:relative; box-sizing:border-box;">
                <img src="${escapeHtml(okbmSafeImageUrl(item.thumb))}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80';" />
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.18); display:flex; align-items:center; justify-content:center;">
                  <div style="width:24px; height:24px; border-radius:50%; background:#0c1017; display:flex; align-items:center; justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:12px; height:12px; margin-left:1px;" fill="#ffffff"><polygon points="9.6 15.6 15.8 12 9.6 8.4 9.6 15.6"/></svg>
                  </div>
                </div>
              </div>
              <div style="flex:0 0 calc(50% - 4px); width:calc(50% - 4px); padding:0 4px 0 2px; box-sizing:border-box;">
                <div id="${titleDomId}" style="font-size:0.78rem; font-weight:800; color:#ffffff; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:break-all;">
                  ${escapeHtml(item.title || (spotName + ' 백패킹'))}
                </div>
              </div>
            </a>`;
        }

        if (stillLoading && finalCards.length < 5) {
          html += `
            <div style="display:flex; align-items:center; justify-content:center; padding:8px 0 4px; color:var(--text-muted); font-size:0.68rem; gap:6px;">
              <svg viewBox="0 0 24 24" style="width:12px; height:12px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#f43f5e"/></svg>
              <span>관련 영상 더 불러오는 중...</span>
            </div>`;
        }
        drawer.innerHTML = html;
      };

      window.collectSpotYouTubeCards = async function(spotId, spotName, rawRegisteredList, onPartial) {
        var registered = (Array.isArray(rawRegisteredList) ? rawRegisteredList : []).filter(function(u) {
          return typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        });

        var finalCards = [];
        var seenVideoIds = new Set();
        // 순서: 크리에이터 등록(추천순) → 관리자가 넣은 링크 → 기록 저장으로 들어온 링크 → 자동 검색. 숏츠는 어디서 왔든 뺀다.
        var creators = (typeof window.okbmGetCreatorLinks === 'function') ? await window.okbmGetCreatorLinks(spotId, 'yt') : [];
        var ytIdOf = function(u) {
          var m = cleanYouTubeUrl(u).match(/[?&]v=([\w-]{11})/);
          return (m && m[1]) ? m[1] : '';
        };
        var fromRecords = {};
        ((typeof window.okbmContributedUrlsFor === 'function') ? window.okbmContributedUrlsFor(spotId) : []).forEach(function(u) { var id = ytIdOf(u); if (id) fromRecords[id] = true; });
        (window.collectSpotMediaFromHistory(spotId, spotName, 'yt') || []).forEach(function(u) { var id = ytIdOf(u); if (id) fromRecords[id] = true; });
        var recordCards = [];

        creators.forEach(function(c) {
          if (window.okbmIsYouTubeShorts(c.url)) return;
          var cUrl = cleanYouTubeUrl(c.url);
          var cm = cUrl.match(/[?&]v=([\w-]{11})/) || String(c.url).match(/(?:youtu\.be\/|shorts\/|live\/)([\w-]{11})/);
          var cId = (cm && cm[1]) ? cm[1] : '';
          if (!cId || seenVideoIds.has(cId)) return;
          seenVideoIds.add(cId);
          finalCards.push({
            id: cId,
            url: 'https://www.youtube.com/watch?v=' + cId,
            title: String(c.title || '').trim() || window.__ytMetaCache['https://www.youtube.com/watch?v=' + cId] || '',
            thumb: 'https://img.youtube.com/vi/' + cId + '/mqdefault.jpg',
            isOfficial: false,
            creator: c
          });
        });
        registered.forEach(function(u) {
          if (window.okbmIsYouTubeShorts(u)) return;
          var vId = ytIdOf(u);
          if (!vId || seenVideoIds.has(vId)) return;
          seenVideoIds.add(vId);
          var targetUrl = 'https://www.youtube.com/watch?v=' + vId;
          var card = {
            id: vId,
            url: targetUrl,
            title: window.__ytMetaCache[targetUrl] || '',
            thumb: 'https://img.youtube.com/vi/' + vId + '/mqdefault.jpg',
            isOfficial: !fromRecords[vId]
          };
          (fromRecords[vId] ? recordCards : finalCards).push(card);
        });

        recordCards.forEach(function(card) { finalCards.push(card); });
        var verticalFlags = await Promise.all(finalCards.map(function(card) { return window.okbmIsVerticalYouTube(card.id); }));
        finalCards = finalCards.filter(function(card, idx) { return !verticalFlags[idx]; });
        var ytCap = Math.min(15, Math.max(5, finalCards.length));

        if (typeof onPartial === 'function' && finalCards.length) {
          onPartial(finalCards.slice(), true);
        }

        if (finalCards.length < 5) {
          var targetSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
          var areaName = window.extractAreaForSearch(targetSpot);
          var autoFetched = await window.fetchRealYouTubeVideosForSpot(spotName, areaName, targetSpot && targetSpot.spot_sub);
          var autoVertical = await Promise.all(autoFetched.map(function(it) { return window.okbmIsVerticalYouTube(it && it.id); }));
          // 자동 검색에 딸려 오는 패러글라이딩·비행 영상은 뺀다. 활공장 박지는 제목에 야영 말이 없으면 비행 영상으로 본다.
          var flightRe = /비행|패러|글라이딩|글라이더|이륙|착륙|텐덤|스카이다이빙|활공(?!장)|paraglid|hang ?glid|skydiv/i;
          var campRe = /백패킹|캠핑|캠프|야영|차박|박지|비박|솔캠|텐트|backpack|camp/i;
          var gliderSpot = /활공장/.test(String((targetSpot && (targetSpot.spot_sub || targetSpot.fullName)) || '') + spotName);
          var isFlightVideo = function(it) {
            var t = String((it && it.title) || '');
            if (!t || campRe.test(t)) return false;
            return flightRe.test(t) || gliderSpot;
          };
          for (var i = 0; i < autoFetched.length && finalCards.length < 5; i++) {
            var item = autoFetched[i];
            if (!item || !item.id || seenVideoIds.has(item.id) || window.okbmIsYouTubeShorts(item.url) || autoVertical[i] || isFlightVideo(item)) continue;
            seenVideoIds.add(item.id);
            finalCards.push({
              id: item.id,
              url: item.url,
              title: item.title,
              thumb: item.thumb,
              isOfficial: false
            });
          }
        }

        return finalCards.slice(0, ytCap);
      };

      window.prefetchSpotYouTubeList = function(spotId, spotName, rawRegisteredList) {
        // 등록 링크가 있으면 이전 검색 캐시/프리패치를 버리고 다시 수집한다.
        // 단, 같은 등록 목록으로 이미 수집 중이면 그 작업을 같이 쓴다.
        // (스팟 하나를 열 때 이 함수가 4번 불려, 같은 영상 검색이 동시에 4번 돌던 문제)
        var registered = (Array.isArray(rawRegisteredList) ? rawRegisteredList : []).filter(function(u) {
          return u && typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        });
        var regSig = registered.map(function(u) { return u.trim(); }).join('\n');
        var inflight = window.__spotYtPrefetch[spotId];
        if (inflight && inflight.__okbmRegSig === regSig) return inflight;
        if (registered.length) {
          window.invalidateSpotMediaCacheIfStale(spotId, 'yt', registered);
          try {
            if (window.__spotYtPrefetch) delete window.__spotYtPrefetch[spotId];
            if (window.__spotYtCardsCache && !((window.__spotYtCardsCache[spotId] || []).some(function(c) { return c && c.isOfficial; }))) {
              delete window.__spotYtCardsCache[spotId];
            }
          } catch (e) {}
        }
        if (window.__spotYtPrefetch[spotId]) return window.__spotYtPrefetch[spotId];
        var ytJob = window.collectSpotYouTubeCards(spotId, spotName, rawRegisteredList, function(partial, stillLoading) {
          limitedObjSet(window.__spotYtCardsCache, spotId, partial, 50);
          var badgeEl = document.getElementById('ytBadgeCount_' + spotId);
          if (badgeEl) badgeEl.innerText = String((partial || []).length);
          window.paintSpotMediaDrawer(spotId, spotName, 'yt', partial, stillLoading);
        }).then(function(cards) {
          cards = cards || [];
          limitedObjSet(window.__spotYtCardsCache, spotId, cards, 50);
          var badgeEl = document.getElementById('ytBadgeCount_' + spotId);
          if (badgeEl) badgeEl.innerText = String(cards.length);
          window.paintSpotMediaDrawer(spotId, spotName, 'yt', cards, false);
          if (window.__spotYtPrefetch[spotId] === ytJob) delete window.__spotYtPrefetch[spotId];
          return cards;
        }).catch(function() {
          if (window.__spotYtPrefetch[spotId] === ytJob) delete window.__spotYtPrefetch[spotId];
          return window.__spotYtCardsCache[spotId] || [];
        });
        ytJob.__okbmRegSig = regSig;
        window.__spotYtPrefetch[spotId] = ytJob;
        return ytJob;
      };


      window.renderSpotBlogCards = function(drawer, spotId, spotName, finalCards, seq, stillLoading) {
        if (!drawer || drawer.dataset.mediaSeq !== seq || drawer.dataset.mediaType !== 'blog') return;
        var badgeEl = document.getElementById('blogBadgeCount_' + spotId);
        if (badgeEl) badgeEl.innerText = String(finalCards.length);
        if (!finalCards.length && stillLoading) return;

        if (!finalCards.length) {
          drawer.innerHTML = '<div style="padding:14px 4px; color:#94a3b8; font-size:0.72rem; text-align:center;">관련 네이버 블로그 글을 찾지 못했습니다.</div>';
          return;
        }

        var blogCardsHtml = finalCards.map(function(item, idx) {
          return window.okbmWrapCreatorCard(spotId, item, blogCardHtml(item, idx));
        }).join('');
        function blogCardHtml(item, idx) {
          var titleDomId = 'blogRealTitle_' + spotId + '_' + idx;
          var cachedMeta = window.__blogMetaCache[String(item.url).trim()];
          var rawId = item.blogId ? ('@' + item.blogId) : '블로그';
          var initialTitle = (cachedMeta && cachedMeta.title) ? cachedMeta.title : (item.title || (spotName + ' 후기'));
          var initialBlogName = (cachedMeta && cachedMeta.blogName) ? cachedMeta.blogName : rawId;
          if (!cachedMeta && !item.title) {
            setTimeout(function() {
              window.fetchNaverBlogRealMeta(item.url, titleDomId, null, initialTitle);
            }, 10);
          }
          return `
            <a href="${escapeHtml(okbmSafeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:46px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 10px; text-decoration:none; box-sizing:border-box; width:100%; transition:background 0.15s ease;">
              <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; align-items:center; gap:5px;">
                  <span style="display:inline-flex; align-items:center; justify-content:center; background:#03c75a; color:#ffffff; font-size:0.55rem; font-weight:900; padding:0 3px; height:13px; border-radius:2px; font-family:'Space Grotesk',sans-serif; flex-shrink:0;">N</span>
                  <span id="${titleDomId}_blogName" style="font-size:0.64rem; font-weight:800; color:#34d399; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(initialBlogName)}
                  </span>
                </div>
                <div id="${titleDomId}" style="font-size:0.76rem; font-weight:700; color:#f1f5f9; line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; word-break:break-all;">
                  ${escapeHtml(initialTitle)}
                </div>
              </div>
              <div style="color:#64748b; font-size:0.85rem; font-weight:800; flex-shrink:0; padding-left:4px;">›</div>
            </a>`;
        }

        if (stillLoading && finalCards.length < 5) {
          blogCardsHtml += `
            <div style="display:flex; align-items:center; justify-content:center; padding:8px 0 4px; color:var(--text-muted); font-size:0.68rem; gap:6px;">
              <svg viewBox="0 0 24 24" style="width:12px; height:12px; animation:spin 1s linear infinite;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#10b981"/></svg>
              <span>관련 글 더 불러오는 중...</span>
            </div>`;
        }
        drawer.innerHTML = blogCardsHtml;
      };

      window.collectSpotBlogCards = async function(spotId, spotName, rawRegisteredList) {
        var registered = (Array.isArray(rawRegisteredList) ? rawRegisteredList : []).filter(function(u) {
          return typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        });
        var finalCards = [];
        var seenKeys = new Set();
        // 순서: 크리에이터 등록(추천순) → 관리자가 넣은 링크 → 기록 저장으로 들어온 링크 → 자동 검색
        var blogCreators = (typeof window.okbmGetCreatorLinks === 'function') ? await window.okbmGetCreatorLinks(spotId, 'blog') : [];
        var blogKeyOf = function(u) {
          var pp = window.normalizeNaverBlogPost(u);
          return pp ? (pp.blogId + '/' + pp.logNo) : '';
        };
        var blogFromRecords = {};
        ((typeof window.okbmContributedUrlsFor === 'function') ? window.okbmContributedUrlsFor(spotId) : []).forEach(function(u) { var k = blogKeyOf(u); if (k) blogFromRecords[k] = true; });
        (window.collectSpotMediaFromHistory(spotId, spotName, 'blog') || []).forEach(function(u) { var k = blogKeyOf(u); if (k) blogFromRecords[k] = true; });
        var blogRecordCards = [];
        blogCreators.forEach(function(c) {
          var parsedC = window.normalizeNaverBlogPost(c.url);
          if (!parsedC) return;
          var cKey = parsedC.blogId + '/' + parsedC.logNo;
          if (seenKeys.has(cKey)) return;
          seenKeys.add(cKey);
          finalCards.push({ url: parsedC.url, blogId: parsedC.blogId, title: String(c.title || '').trim(), isOfficial: false, creator: c });
        });
        registered.forEach(function(u) {
          var parsed = window.normalizeNaverBlogPost(u);
          if (!parsed) return;
          var rk = parsed.blogId + '/' + parsed.logNo;
          if (seenKeys.has(rk)) return;
          seenKeys.add(rk);
          var card = {
            url: parsed.url,
            blogId: parsed.blogId,
            title: '',
            isOfficial: !blogFromRecords[rk]
          };
          (blogFromRecords[rk] ? blogRecordCards : finalCards).push(card);
        });
        blogRecordCards.forEach(function(card) { finalCards.push(card); });
        var blogCap = Math.min(15, Math.max(5, finalCards.length));
        if (finalCards.length < 5) {
          var targetSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
          var areaName = window.extractAreaForSearch(targetSpot);
          var searchName = targetSpot ? (targetSpot.spot_main || targetSpot.name || spotName) : spotName;
          var autoFetched = await window.fetchRealNaverBlogsForSpot(searchName, areaName);
          for (var i = 0; i < autoFetched.length && finalCards.length < 5; i++) {
            var item = autoFetched[i];
            var parsedAuto = item ? window.normalizeNaverBlogPost(item.url) : null;
            if (!parsedAuto) continue;
            var key = parsedAuto.blogId + '/' + parsedAuto.logNo;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            finalCards.push({
              url: parsedAuto.url,
              blogId: parsedAuto.blogId,
              title: item.title || '',
              isOfficial: false
            });
          }
        }
        return finalCards.slice(0, blogCap);
      };

      window.prefetchSpotBlogList = function(spotId, spotName, rawRegisteredList) {
        var registered = (Array.isArray(rawRegisteredList) ? rawRegisteredList : []).filter(function(u) {
          return u && typeof u === 'string' && u.trim().length > 5 && !window.isSearchPageUrl(u);
        });
        // 같은 등록 목록으로 이미 수집 중이면 그 작업을 같이 쓴다(blog-search 요청 중복 방지).
        var regSig = registered.map(function(u) { return u.trim(); }).join('\n');
        var inflight = window.__spotBlogPrefetch[spotId];
        if (inflight && inflight.__okbmRegSig === regSig) return inflight;
        if (registered.length) {
          window.invalidateSpotMediaCacheIfStale(spotId, 'blog', registered);
          try {
            if (window.__spotBlogPrefetch) delete window.__spotBlogPrefetch[spotId];
            if (window.__spotBlogCardsCache && !((window.__spotBlogCardsCache[spotId] || []).some(function(c) { return c && c.isOfficial; }))) {
              delete window.__spotBlogCardsCache[spotId];
            }
          } catch (e) {}
        }
        if (window.__spotBlogPrefetch[spotId]) return window.__spotBlogPrefetch[spotId];
        var blogJob = window.collectSpotBlogCards(spotId, spotName, rawRegisteredList)
          .then(function(cards) {
            cards = cards || [];
            limitedObjSet(window.__spotBlogCardsCache, spotId, cards, 50);
            var badgeEl = document.getElementById('blogBadgeCount_' + spotId);
            if (badgeEl) badgeEl.innerText = String(cards.length);
            window.paintSpotMediaDrawer(spotId, spotName, 'blog', cards, false);
            if (window.__spotBlogPrefetch[spotId] === blogJob) delete window.__spotBlogPrefetch[spotId];
            return cards;
          })
          .catch(function() {
            if (window.__spotBlogPrefetch[spotId] === blogJob) delete window.__spotBlogPrefetch[spotId];
            var badgeEl = document.getElementById('blogBadgeCount_' + spotId);
            if (badgeEl && !window.__spotBlogCardsCache[spotId]) badgeEl.innerText = '0';
            return [];
          });
        blogJob.__okbmRegSig = regSig;
        window.__spotBlogPrefetch[spotId] = blogJob;
        return blogJob;
      };


      // 🏷️ [누락 복원] 지형 & 난이도 메타 배지 생성 엔진
      function getMetaBadgesHtml(spot) {
        var html = '<div style="display:inline-flex; align-items:center; gap:3px; flex-wrap:nowrap; white-space:nowrap;">';
        (spot.terrain || []).forEach(function(t) {
          if (t.includes('데크')) html += `<span class="meta-tag tag-terrain-deck">${ICONS.DECK}데크</span>`;
          else if (t.includes('암릉') || t.includes('바위') || t.includes('돌')) html += `<span class="meta-tag tag-terrain-rock">${ICONS.ROCK}암릉</span>`;
          else if (t.includes('노지')) html += `<span class="meta-tag tag-terrain-soil">${ICONS.SOIL}노지</span>`;
          else if (t.includes('해변')) html += `<span class="meta-tag tag-terrain-beach">${ICONS.BEACH}해변</span>`;
          else if (t.includes('섬')) html += `<span class="meta-tag tag-terrain-island">${ICONS.ISLAND}섬</span>`;
          else if (t.includes('계곡')) html += `<span class="meta-tag tag-terrain-valley">${ICONS.VALLEY}계곡</span>`;
          else if (t.includes('동굴')) html += `<span class="meta-tag tag-terrain-rock">${ICONS.CAVE}동굴</span>`;
        });
        html += `<span class="meta-tag tag-diff">난이도 ${'★'.repeat(Math.min(5, Math.max(1, parseInt(spot.difficulty, 10) || 3)))}</span>`;
        if (spot.distance && spot.distance.trim()) html += `<span class="meta-tag tag-dist">${ICONS.DIST} ${escapeHtml(okbmSpotDistLabel(spot.distance))}</span>`;
        html += '</div>';
        return html;
      }

      // 동명 산 오부착 방지: spot_id 우선, 레거시는 산명+지역. 모호하면 제외.
      function okbmPlaceCoreName(name) {
        return String(name || '')
          .replace(/\s+/g, '')
          .replace(/(특별자치시|특별자치도|광역시|특별시|자치시|자치도)$/g, '')
          .replace(/(시|군|구|도)$/g, '');
      }
      function feedBelongsToMapSpot(feedSpot, spot, feedSpotId) {
        var sId = String((spot && spot.id) || '').trim();
        var fId = String(feedSpotId || '').trim();
        if (fId && sId) return fId === sId;

        var feed = String(feedSpot || '').replace(/\s+/g, ' ').trim();
        var main = String((spot && (spot.spot_main || spot.name)) || '').trim();
        if (!feed || !main) return false;
        var escaped = main.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var tokenRe = new RegExp('(^|[^가-힣A-Za-z0-9])' + escaped + '(?=$|[^가-힣A-Za-z0-9])');
        if (!tokenRe.test(feed)) return false;

        var city = String((spot && (spot.cityName || spot.city_name)) || '').trim();
        var region = String((spot && spot.region) || '').trim();
        var feedNorm = feed.replace(/\s+/g, '');
        var cityCore = okbmPlaceCoreName(city);
        var regionCore = okbmPlaceCoreName(region);
        if (cityCore && cityCore.length >= 2 && feedNorm.indexOf(cityCore) !== -1) return true;
        if (regionCore && regionCore.length >= 2 && feedNorm.indexOf(regionCore) !== -1) return true;

        var cityHintMatch = feed.match(/([가-힣]{2,12}(?:시|군|구))/);
        if (cityHintMatch) {
          var hintCore = okbmPlaceCoreName(cityHintMatch[1]);
          return !!(cityCore && hintCore && hintCore === cityCore);
        }

        var pool = (typeof spots !== 'undefined' && Array.isArray(spots)) ? spots : [];
        var mainKey = main.replace(/\s+/g, '').toLowerCase();
        var feedLower = feedNorm.toLowerCase();

        // 동명 산이어도 spot_sub(예: 칠족령)가 피드에 있고 그 세부명이 유일하면 허용
        var subRaw = String((spot && spot.spot_sub) || '').trim();
        var subParts = subRaw.match(/[가-힣]{3,}/g) || [];
        var hitParts = [];
        for (var sp = 0; sp < subParts.length; sp++) {
          var part = subParts[sp];
          if (!part || part === main.replace(/\s+/g, '')) continue;
          if (feedLower.indexOf(part) !== -1) hitParts.push(part);
        }
        if (hitParts.length > 0) {
          var subUnique = true;
          for (var u = 0; u < pool.length; u++) {
            var other = pool[u];
            if (!other || String(other.id) === String(spot.id)) continue;
            var om = String(other.spot_main || other.name || '').replace(/\s+/g, '').toLowerCase();
            if (om !== mainKey) continue;
            var oSub = String(other.spot_sub || '');
            for (var h = 0; h < hitParts.length; h++) {
              if (oSub.indexOf(hitParts[h]) !== -1) { subUnique = false; break; }
            }
            if (!subUnique) break;
          }
          if (subUnique) return true;
        }

        // 산 이름만 있는 레거시: 마스터에 동명 spot_main이 하나일 때만 허용
        var sameMain = 0;
        for (var i = 0; i < pool.length; i++) {
          var pm = String((pool[i] && (pool[i].spot_main || pool[i].name)) || '').replace(/\s+/g, '').toLowerCase();
          if (pm && pm === mainKey) sameMain++;
          if (sameMain > 1) return false;
        }
        return true;
      }

      window.okbmFeedBelongsToMapSpot = feedBelongsToMapSpot;

      function filterFeedsForMapSpot(spot, feeds) {
        if (!Array.isArray(feeds) || !feeds.length) return [];
        return feeds.filter(function(f) {
          if (!f) return false;
          return feedBelongsToMapSpot(
            f.spot || f.spotName || f.title || '',
            spot,
            f.spot_id || f.spotId || ''
          );
        });
      }

   function buildSpotFieldFeedsTrackContent(spot, matchedFeeds) {
        if (!Array.isArray(matchedFeeds) || matchedFeeds.length === 0) return '';
        matchedFeeds = filterFeedsForMapSpot(spot, matchedFeeds);
        if (!matchedFeeds.length) return '';
        if (typeof window.filterHiddenUgcFeeds === 'function') {
          matchedFeeds = window.filterHiddenUgcFeeds(matchedFeeds);
        }
        if (!matchedFeeds.length) return '';
        var starsMap = safeGetJSON('okbm_feed_stars_counts', {}) || {};
        var backpackSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; display:inline-block; vertical-align:-1.5px; flex-shrink:0;"><rect x="4" y="2" width="16" height="5" rx="2.5"/><path d="M8 2v5M16 2v5M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M12 7l-4 4M12 7l4 4M8 15h8v4H8z"/></svg>`;
        var starSvg = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:10px; height:10px; display:inline-block; vertical-align:-1px; flex-shrink:0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

        var feedCardsHtml = matchedFeeds.map(function(f) {
          var fId = escapeHtml(String(f.id));
          var realPhotos = Array.isArray(f.photos) ? f.photos.filter(function(u) {
            return typeof u === 'string' && u.trim().startsWith('https://');
          }) : [];

          if (realPhotos.length === 0) return '';
          var thumbUrl = realPhotos[0];
          var authorNick = f.author || '개척 캠퍼';
          var memo100 = (f.memo || '').trim();
          var weightVal = f.weight_kg !== undefined && f.weight_kg !== null ? f.weight_kg : f.weightKg;
          var weightStr = weightVal ? (weightVal + 'kg') : '';
          var serverLikes = (f.likes_count !== undefined && f.likes_count !== null) ? Number(f.likes_count) : Number(f.likes || 0);
          var likesCount = Number(starsMap[String(f.id).trim()]) || serverLikes || 0;

          return `
            <div data-feed-id="${fId}" data-spot-id="${escapeHtml(String(spot.id).trim())}" onclick="openMapSpotFeedDetailModal(this.dataset.feedId, this.dataset.spotId)" style="flex:0 0 145px; width:145px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; cursor:pointer; flex-shrink:0; box-sizing:border-box;">
              <div style="width:100%; aspect-ratio:3/4; position:relative; background:#000; overflow:hidden;">
                <img src="${escapeHtml(okbmSafeImageUrl(thumbUrl))}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" />
                <div style="position:absolute; top:5px; left:5px; background:#0c1017; padding:2px 6px; border-radius:4px; font-size:0.56rem; color:#e2e8f0; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85px;">
                  ${escapeHtml(authorNick)}
                </div>
              </div>
              <div style="padding:6px 7px; display:flex; flex-direction:column; gap:3px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="display:inline-flex; align-items:center; gap:8px;">
                    <span style="font-size:0.58rem; color:#fde047; font-weight:800; font-family:'Space Grotesk', sans-serif; display:inline-flex; align-items:center; gap:2px;">
                      ${starSvg} <span>${likesCount}</span>
                    </span>
                    ${typeof window.okbmFeedCommentBtnHtml === 'function' ? window.okbmFeedCommentBtnHtml(f.id, f.comments_count, 'sm') : ''}
                  </span>
                  ${weightStr ? `
                    <span style="font-size:0.56rem; color:#cbd5e1; font-weight:800; font-family:'Space Grotesk',sans-serif; display:inline-flex; align-items:center; gap:2px;">
                      ${backpackSvg} <span>${escapeHtml(weightStr)}</span>
                    </span>` : ''}
                </div>
                <div style="font-size:0.65rem; color:#cbd5e1; line-height:1.35; height:calc(1.35em * 3); min-height:calc(1.35em * 3); max-height:calc(1.35em * 3); overflow:hidden; display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; text-overflow:ellipsis; word-break:break-all; box-sizing:border-box;">
                  “${escapeHtml(memo100 || '추천 박지입니다.')}”
                </div>
              </div>
            </div>
          `;
        }).filter(Boolean).join('');

        if (!feedCardsHtml) return '';

        return `
          <div style="display:flex; overflow-x:auto; gap:6px; padding:2px 0; scrollbar-width:none; -webkit-overflow-scrolling:touch;">
            ${feedCardsHtml}
          </div>
        `;
      }

      // 인스타 탭: 관리자 등록 → 크리에이터 등록(추천순) 게시물. 줄을 누르면 화면 전체 보기 창에서 인스타 공식 embed를 연다.
      function spotInstaPosts(spot) {
        var posts = [];
        var addPost = function(u, creator) {
          var m = String(u || '').match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:([A-Za-z0-9._]{1,30})\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
          if (!m) return;
          var who = m[1] && !/^(p|reel|reels|tv|stories|explore|accounts)$/i.test(m[1]) ? m[1] : '';
          var kindRaw = m[2].toLowerCase();
          var kind = kindRaw === 'p' ? 'p' : (kindRaw === 'tv' ? 'tv' : 'reel');
          if (posts.some(function(x) { return x.code === m[3]; })) return;
          posts.push({ kind: kind, code: m[3], handle: who, creator: creator || null });
        };
        (spot && Array.isArray(spot.instaUrls) ? spot.instaUrls : []).forEach(function(u) { addPost(u, null); });
        var sId = spot ? String(spot.id).trim() : '';
        (typeof window.okbmCreatorLinksFor === 'function' ? window.okbmCreatorLinksFor(sId, 'insta') : []).forEach(function(c) { addPost(c.url, c); });
        return posts.slice(0, 20);
      }

      var instaIdCache = {};
      var instaIdWait = {};
      function instaIdKey(code) { return 'okbm_insta_id_' + code; }
      function readInstaId(code) {
        if (instaIdCache[code]) return instaIdCache[code];
        try {
          var saved = sessionStorage.getItem(instaIdKey(code));
          if (saved && /^[A-Za-z0-9._]{1,30}$/.test(saved)) {
            instaIdCache[code] = saved;
            return saved;
          }
        } catch (e) {}
        return '';
      }
      function writeInstaId(code, handle) {
        if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return;
        instaIdCache[code] = handle;
        try { sessionStorage.setItem(instaIdKey(code), handle); } catch (e) {}
        document.querySelectorAll('[data-insta-id="' + code + '"]').forEach(function(el) {
          el.textContent = '@' + handle;
        });
      }
      function instaIdFromMicrolink(body) {
        var data = body && body.data;
        if (!data) return '';
        var canon = String(data.url || '');
        var m = canon.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/(?:p|reel|reels|tv)\//i);
        if (m && !/^(p|reel|reels|tv|stories|explore|accounts)$/i.test(m[1])) return m[1];
        var t = String(data.title || '').match(/@([A-Za-z0-9._]{1,30})/);
        return t ? t[1] : '';
      }
      function resolveInstaId(p) {
        var code = p && p.code;
        if (!code || readInstaId(code) || instaIdWait[code]) return;
        instaIdWait[code] = true;
        var kind = p.kind === 'tv' ? 'tv' : (p.kind === 'p' ? 'p' : 'reel');
        var url = 'https://www.instagram.com/' + kind + '/' + code + '/';
        fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(body) {
            var handle = instaIdFromMicrolink(body);
            if (handle) writeInstaId(code, handle);
          })
          .catch(function() {})
          .then(function() { delete instaIdWait[code]; });
      }

      function renderSpotInstaRowHtml(spot) {
        var posts = spotInstaPosts(spot);
        var sIdForCreators = spot ? String(spot.id).trim() : '';
        var badge = document.getElementById('instaBadgeCount_' + sIdForCreators);
        if (badge) badge.innerText = String(posts.length);
        if (!posts.length) {
          return '<div style="padding:14px 4px; color:#94a3b8; font-size:0.72rem; text-align:center; line-height:1.5;">등록된 인스타 게시물이 없어요.<br>다녀왔다면 아래에서 내 게시물을 등록해 주세요.</div>';
        }
        var icon = '<svg viewBox="0 0 24 24" style="width:14px; height:14px; flex-shrink:0;" fill="none" stroke="#f9a8d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="#f9a8d4"/></svg>';
        var postNo = 0, reelNo = 0;
        var html = posts.map(function(p) {
          var isReel = p.kind !== 'p';
          var known = p.handle || readInstaId(p.code);
          var label = known ? ('@' + known) : (isReel ? ('릴스 ' + (++reelNo)) : ('게시물 ' + (++postNo)));
          if (!known && p.creator) label += ' · ' + (p.creator.author || '백패커');
          var dim = p.creator && (p.creator.sunk || p.creator.hidden);
          // 줄을 누르면 정보창 크기는 그대로 두고 화면 전체 보기 창에서 게시물을 연다
          return '<div style="display:flex; flex-direction:column; gap:3px;' + (dim ? ' opacity:0.55;' : '') + '">' +
            '<button type="button" data-kind="' + escapeHtml(p.kind) + '" data-code="' + escapeHtml(p.code) + '" onclick="window.okbmOpenInstaViewer(this);"' +
            ' style="width:100%; display:flex; align-items:center; gap:6px; padding:10px; border:1px solid rgba(249,168,212,0.28); border-radius:9px; background:rgba(249,168,212,0.06); cursor:pointer; font-family:inherit; font-size:0.74rem; font-weight:800; color:#fbcfe8; text-align:left;">' +
              icon + '<span data-insta-id="' + escapeHtml(p.code) + '" style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(label) + '</span><span style="font-size:0.64rem; color:#f9a8d4; flex-shrink:0;">크게 보기 ›</span>' +
            '</button>' +
            (p.creator && typeof window.okbmCreatorActionsHtml === 'function' ? window.okbmCreatorActionsHtml(sIdForCreators, p.creator) : '') +
          '</div>';
        }).join('');
        setTimeout(function() { posts.forEach(function(p) { if (!p.handle) resolveInstaId(p); }); }, 0);
        return html;
      }

      // 인스타 게시물 보기 창: 화면 전체를 덮고, 게시물 높이에 맞춰 늘어난다(길면 창 안에서 스크롤).
      // 높이는 인스타 embed가 보내는 MEASURE 신호(공식 embed.js와 같은 방식)로 맞추고, 신호가 없으면 기본 높이를 쓴다.
      window.okbmOpenInstaViewer = function(btn) {
        if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_spot_insta_view'); // 기능 사용 세기 (H8)
        if (!btn || !btn.dataset) return;
        var kind = /^(p|reel|tv)$/.test(btn.dataset.kind) ? btn.dataset.kind : 'p';
        var code = String(btn.dataset.code || '').replace(/[^A-Za-z0-9_-]/g, '');
        if (!code) return;
        window.okbmCloseInstaViewer();
        var overlay = document.createElement('div');
        overlay.id = 'okbmInstaViewer';
        overlay.setAttribute('onclick', 'if(event.target===this)window.okbmCloseInstaViewer();');
        // 정보창 피드 크기 정도(최대 400px)로 가운데에 띄우고, 길면 창 안에서 스크롤한다
        overlay.style.cssText = 'position:fixed; inset:0; z-index:2147483646; background:rgba(0,0,0,0.72); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;';
        var postUrl = 'https://www.instagram.com/' + kind + '/' + code + '/';
        overlay.innerHTML =
          '<div style="width:100%; max-width:400px; max-height:100%; display:flex; flex-direction:column; background:#0c1017; border:1px solid rgba(255,255,255,0.12); border-radius:14px; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,0.5);">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; flex-shrink:0;">' +
              '<span style="font-size:0.76rem; font-weight:900; color:#fbcfe8;">인스타그램</span>' +
              '<button type="button" onclick="window.okbmCloseInstaViewer();" aria-label="닫기" style="width:30px; height:30px; border-radius:50%; border:none; background:rgba(255,255,255,0.10); color:#ffffff; font-size:0.9rem; font-weight:900; cursor:pointer;">✕</button>' +
            '</div>' +
            '<div style="flex:1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:0 8px;">' +
              '<iframe src="' + postUrl + 'embed/" title="인스타그램 게시물" scrolling="no" referrerpolicy="strict-origin-when-cross-origin"' +
              ' sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"' +
              ' style="width:100%; height:' + (kind === 'p' ? '560' : '700') + 'px; border:0; border-radius:10px; background:#ffffff; display:block;"></iframe>' +
            '</div>' +
            '<a href="' + postUrl + '" target="_blank" rel="noopener noreferrer" style="flex-shrink:0; margin:8px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; text-decoration:none; color:#ffffff; font-size:0.76rem; font-weight:900; background:linear-gradient(135deg, #833ab4, #fd1d1d 55%, #fcb045);">인스타그램에서 보기 ›</a>' +
          '</div>';
        document.body.appendChild(overlay);
        if (typeof window.registerModalOpen === 'function') window.registerModalOpen('okbmInstaViewer', window.okbmCloseInstaViewer);
      };
      window.okbmCloseInstaViewer = function() {
        var el = document.getElementById('okbmInstaViewer');
        if (!el) return;
        el.remove();
        if (typeof window.unregisterModalClose === 'function') window.unregisterModalClose('okbmInstaViewer');
      };
      window.addEventListener('message', function(e) {
        if (e.origin !== 'https://www.instagram.com') return;
        var data = e.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch (eParse) { return; } }
        if (!data || data.type !== 'MEASURE' || !data.details) return;
        var h = Number(data.details.height);
        if (!isFinite(h) || h < 200 || h > 4000) return;
        var viewer = document.getElementById('okbmInstaViewer');
        var frame = viewer && viewer.querySelector('iframe');
        if (frame && frame.contentWindow === e.source) frame.style.height = Math.ceil(h) + 'px';
      });

      // ---------- 크리에이터 콘텐츠 (SUPABASE_H2) ----------
      // 다녀온 사람이 유튜브·블로그·인스타 게시물 링크를 정보창에서 바로 등록한다. 바로 공개되고,
      // 유튜브·블로그·인스타 탭 목록 안에 관리자 등록 다음, 자동 검색 앞에 들어간다.
      // 순서는 서버가 정한다: 신고 3건 이상은 맨 뒤 → 추천 많은 순 → 최근 순. 이 칸은 등록 버튼과 입력창만 둔다.
      (function() {
        var store = {};    // 박지 id → { at, list, error }
        var inflight = {};
        var ui = {};       // 박지 id → { more, form, url, title, busy }
        var TTL = 60000;
        var ACT = ' onclick="window.okbmCreatorAction(this, event);"';
        var ERR = {
          login_required: '로그인 후 이용할 수 있어요.',
          bad_url: '유튜브 영상, 네이버 블로그 글, 인스타 게시물 주소만 등록할 수 있어요.',
          duplicate: '이미 등록된 콘텐츠예요.',
          spot_limit: '한 박지에는 3개까지 등록할 수 있어요.',
          day_limit: '하루에 10개까지 등록할 수 있어요.',
          rate_limited: '잠시 후 다시 시도해 주세요.',
          no_spot: '박지를 찾지 못했어요.',
          own_link: '내 콘텐츠에는 추천·신고할 수 없어요.',
          forbidden: '권한이 없어요.'
        };
        function esc(t) { return escapeHtml(t == null ? '' : String(t)); }
        function kindOf(url) {
          var u = String(url || '').trim().replace(/^http:\/\//i, 'https://');
          if (window.okbmIsYouTubeShorts(u)) return '';
          if (/^https:\/\/(www\.|m\.)?youtube\.com\/(watch\?([^#\s]*&)?v=|live\/)[A-Za-z0-9_-]{11}/i.test(u) || /^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}/i.test(u)) return 'yt';
          if (/^https:\/\/(m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+\/[0-9]+|PostView\.naver\?.*logNo=[0-9]+)/i.test(u)) return 'blog';
          if (/^https:\/\/(www\.)?instagram\.com\/(?:[A-Za-z0-9._]{1,30}\/)?(p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(u)) return 'insta';
          return '';
        }
        function errText(e) {
          var m = String((e && (e.message || e.details)) || e || '');
          var key = Object.keys(ERR).filter(function(k) { return m.indexOf(k) !== -1; })[0];
          return key ? ERR[key] : '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
        }
        function rpc(name, args) {
          var client = window.supabaseClient;
          if (!client || typeof client.rpc !== 'function') return Promise.reject(new Error('no_client'));
          return Promise.resolve(client.rpc(name, args)).then(function(res) {
            if (res && res.error) throw res.error;
            return res ? res.data : null;
          });
        }
        function loggedIn() { return typeof isUserLoggedIn === 'function' && isUserLoggedIn(); }

        // 목록 카드 아래 한 줄: 크리에이터 · 닉네임 · 👍 · 신고 (내 것: 삭제, 관리자: 숨김·삭제)
        function actionsHtml(sId, r) {
          var up = r.my_vote === 'up';
          var rep = r.my_vote === 'report';
          // 손가락으로 누르기 쉽게 높이 30px 알약 버튼
          var btn = 'display:inline-flex; align-items:center; gap:3px; height:30px; padding:0 11px; border-radius:15px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.14); cursor:pointer; font-family:inherit; font-size:0.76rem; font-weight:800; flex-shrink:0;';
          var tools = '';
          if (r.mine) {
            tools = '<span style="font-size:0.74rem; color:#60a5fa; font-weight:800; padding:0 4px; flex-shrink:0;">내 콘텐츠 · 👍 ' + (Number(r.ups) || 0) + '</span>' +
              '<button type="button" data-act="del" data-spot="' + esc(sId) + '" data-id="' + esc(r.id) + '"' + ACT + ' style="' + btn + ' color:#64748b;">삭제</button>';
          } else {
            tools = '<button type="button" data-act="up" data-spot="' + esc(sId) + '" data-id="' + esc(r.id) + '"' + ACT + ' aria-pressed="' + up + '" style="' + btn + ' color:' + (up ? '#fbbf24' : '#e2e8f0') + ';' + (up ? ' border-color:rgba(251,191,36,0.6); background:rgba(251,191,36,0.12);' : '') + '">👍 추천 ' + (Number(r.ups) || 0) + '</button>' +
              '<button type="button" data-act="report" data-spot="' + esc(sId) + '" data-id="' + esc(r.id) + '"' + ACT + ' aria-pressed="' + rep + '" style="' + btn + ' color:' + (rep ? '#f87171' : '#94a3b8') + ';' + (rep ? ' border-color:rgba(248,113,113,0.6); background:rgba(248,113,113,0.12);' : '') + '">' + (rep ? '신고함' : '신고') + '</button>';
          }
          if (isAdminMode) {
            tools += '<button type="button" data-act="' + (r.hidden ? 'show' : 'hide') + '" data-spot="' + esc(sId) + '" data-id="' + esc(r.id) + '"' + ACT + ' style="' + btn + ' color:#fbbf24;">' + (r.hidden ? '보이기' : '숨김') + '</button>' +
              (r.mine ? '' : '<button type="button" data-act="del" data-spot="' + esc(sId) + '" data-id="' + esc(r.id) + '"' + ACT + ' style="' + btn + ' color:#f87171;">삭제</button>');
          }
          return '<div style="display:flex; align-items:center; gap:6px; padding:2px 2px 4px; min-width:0;">' +
            '<span style="flex-shrink:0; font-size:0.66rem; font-weight:900; color:#c4b5fd; background:rgba(167,139,250,0.16); border-radius:5px; padding:2px 6px;">크리에이터</span>' +
            '<span style="flex:1; min-width:0; font-size:0.78rem; color:#f1f5f9; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(r.author || '백패커') +
              (r.sunk ? ' · <span style="color:#f87171;">신고 많음</span>' : '') + (r.hidden ? ' · <span style="color:#fbbf24;">숨김</span>' : '') + '</span>' +
            tools +
          '</div>';
        }
        window.okbmCreatorActionsHtml = function(spotId, row) { return row ? actionsHtml(String(spotId || '').trim(), row) : ''; };
        // 유튜브·블로그 카드: 크리에이터 등록이면 카드 아래에 한 줄을 붙인다
        window.okbmWrapCreatorCard = function(spotId, item, cardHtml) {
          if (!item || !item.creator) return cardHtml;
          var dim = item.creator.sunk || item.creator.hidden;
          return '<div style="display:flex; flex-direction:column; gap:3px; width:100%;' + (dim ? ' opacity:0.55;' : '') + '">' + cardHtml + actionsHtml(String(spotId || '').trim(), item.creator) + '</div>';
        };
        // 지금 받아 둔 크리에이터 링크(종류별). 아직 안 받았으면 빈 목록
        window.okbmContributedUrlsFor = function(spotId) {
          var hit = store[String(spotId || '').trim()];
          return (hit && Array.isArray(hit.contrib)) ? hit.contrib : [];
        };
        window.okbmCreatorLinksFor = function(spotId, kind) {
          var hit = store[String(spotId || '').trim()];
          return ((hit && hit.list) || []).filter(function(r) { return r && (!kind || r.kind === kind); });
        };
        // 목록 수집 전에 부른다: 받아 둔 게 있으면 바로, 없으면 받아서
        window.okbmGetCreatorLinks = function(spotId, kind) {
          var sId = String(spotId || '').trim();
          var hit = store[sId];
          var ready = (hit && !hit.error && (Date.now() - hit.at) < TTL) ? Promise.resolve() : window.okbmLoadCreatorLinks(sId);
          return Promise.resolve(ready).catch(function() {}).then(function() { return window.okbmCreatorLinksFor(sId, kind); });
        };
        function sigOf(list, contrib) {
          return (list || []).map(function(r) { return [r.id, r.ups, r.reports, r.my_vote, r.hidden].join(':'); }).join('|') + '#' + (contrib || []).length;
        }
        // 크리에이터 목록이 바뀌면 유튜브·블로그 목록과 인스타 줄을 다시 만든다
        function refreshMedia(sId) {
          ['__spotYtCardsCache', '__spotBlogCardsCache', '__spotYtPrefetch', '__spotBlogPrefetch'].forEach(function(k) {
            if (window[k]) delete window[k][sId];
          });
          var spot = (Array.isArray(spots) ? spots : []).find(function(x) { return String(x.id).trim() === sId; });
          if (!spot) return;
          if (typeof window.prefetchSpotMediaForSpot === 'function') window.prefetchSpotMediaForSpot(spot);
          repaintInsta(sId);
        }
        // 인스타 탭(개수·목록)은 정보창을 그릴 때 아직 크리에이터 목록이 없을 수 있어, 받은 뒤 다시 그린다
        function repaintInsta(sId) {
          var spot = (Array.isArray(spots) ? spots : []).find(function(x) { return String(x.id).trim() === sId; });
          if (!spot) return;
          var badge = document.getElementById('instaBadgeCount_' + sId);
          if (badge) badge.innerText = String(spotInstaPosts(spot).length);
          var drawer = document.getElementById('spotMediaDrawerBox_' + sId);
          if (drawer && drawer.dataset.opened === 'insta') drawer.innerHTML = renderSpotInstaRowHtml(spot);
        }

        // 등록 칸 3개: 유튜브·블로그·인스타. 칸을 잘못 골라도 주소를 보고 맞는 탭으로 보낸다.
        var FIELDS = [
          { key: 'yt', label: '유튜브', color: '#f43f5e', ph: 'https://youtu.be/…',
            icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="#f43f5e"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1 31.4 31.4 0 0 0 .5-5.8 31.4 31.4 0 0 0-.5-5.8z"/><polygon points="9.6 15.6 15.8 12 9.6 8.4 9.6 15.6" fill="#ffffff"/></svg>' },
          { key: 'blog', label: '블로그', color: '#10b981', ph: 'https://blog.naver.com/…',
            icon: '<span style="width:14px; height:14px; border-radius:3px; background:#03c75a; display:inline-flex; align-items:center; justify-content:center; font-size:0.60rem; font-weight:900; color:#fff;">N</span>' },
          { key: 'insta', label: '인스타', color: '#f472b6', ph: 'https://www.instagram.com/p/…',
            icon: '<svg viewBox="0 0 24 24" style="width:14px; height:14px;" fill="none" stroke="#f472b6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="#f472b6"/></svg>' }
        ];

        function formHtml(sId) {
          var st = ui[sId] || {};
          var bad = st.bad || {};
          var rows = FIELDS.map(function(f) {
            var border = bad[f.key] ? '#f87171' : 'rgba(255,255,255,0.14)';
            return '<label style="display:flex; align-items:center; gap:7px;">' +
              '<span style="flex-shrink:0; width:64px; display:inline-flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:800; color:' + f.color + ';">' + f.icon + f.label + '</span>' +
              '<input type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" data-creator-field="' + f.key + '" value="' + esc(st[f.key] || '') + '" placeholder="' + esc(f.ph) + '"' +
              ' style="flex:1; min-width:0; box-sizing:border-box; background:#0b0f16; border:1px solid ' + border + '; border-radius:7px; color:#e2e8f0; font-size:0.74rem; padding:8px 9px; font-family:inherit;">' +
            '</label>';
          }).join('');
          return '<div style="display:flex; flex-direction:column; gap:6px; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);">' +
            rows +
            '<div style="font-size:0.62rem; color:#64748b;">있는 것만 넣으면 돼요. 제목은 자동으로 가져와요.</div>' +
            '<div style="display:flex; gap:6px; justify-content:flex-end;">' +
              '<button type="button" data-act="cancel" data-spot="' + esc(sId) + '"' + ACT + ' style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; border-radius:7px; height:32px; padding:0 12px; font-size:0.72rem; font-weight:800; cursor:pointer; font-family:inherit;">취소</button>' +
              '<button type="button" data-act="submit" data-spot="' + esc(sId) + '"' + ACT + (st.busy ? ' disabled' : '') + ' style="background:#3182f6; border:1px solid #3182f6; color:#ffffff; border-radius:7px; height:32px; padding:0 16px; font-size:0.72rem; font-weight:900; cursor:pointer; font-family:inherit;">' + (st.busy ? '등록 중…' : '등록') + '</button>' +
            '</div>' +
          '</div>';
        }

        function boxInner(sId) {
          var st = ui[sId] || {};
          var wrap = '<div style="background:var(--bg-card, #0e121a); border:1px solid var(--border-hairline, rgba(255,255,255,0.08)); border-radius:7px; padding:8px 9px; margin:6px 0 2px; color:#e2e8f0;">';
          var head = '<div style="display:flex; align-items:center; gap:8px;">' +
            '<div style="flex:1; min-width:0; font-size:0.68rem; color:#94a3b8; line-height:1.4;">여기 다녀온 영상·블로그·인스타가 있나요? 등록하면 위 탭에 바로 올라가요.</div>' +
            (st.form ? '' : '<button type="button" data-act="' + (loggedIn() ? 'open' : 'login') + '" data-spot="' + esc(sId) + '"' + ACT + ' style="background:#3182f6; border:1px solid #3182f6; border-radius:8px; height:28px; padding:0 10px; color:#ffffff; font-size:0.68rem; font-weight:800; cursor:pointer; font-family:inherit; flex-shrink:0;">' + (loggedIn() ? '내 콘텐츠 등록' : '로그인하고 등록') + '</button>') +
          '</div>';
          return wrap + head + (st.form ? formHtml(sId) : '') + '</div>';
        }

        function boxes(sId) {
          return Array.prototype.filter.call(document.querySelectorAll('[data-okbm-creator-box]'), function(el) {
            return el.getAttribute('data-okbm-creator-box') === sId;
          });
        }
        // 입력 중인 값은 다시 그려도 남긴다
        function keepInputs(sId) {
          var st = ui[sId];
          if (!st || !st.form) return;
          boxes(sId).forEach(function(el) {
            el.querySelectorAll('[data-creator-field]').forEach(function(inp) {
              st[inp.getAttribute('data-creator-field')] = inp.value;
            });
          });
        }
        function paint(sId) {
          keepInputs(sId);
          boxes(sId).forEach(function(el) { el.innerHTML = boxInner(sId); });
        }

        window.okbmCreatorBoxHtml = function(spotId) { return boxInner(String(spotId || '').trim()); };

        window.okbmLoadCreatorLinks = function(spot, force) {
          var sId = String((spot && typeof spot === 'object') ? spot.id : (spot || '')).trim();
          if (!sId) return Promise.resolve(null);
          var hit = store[sId];
          if (!force && hit && !hit.error && (Date.now() - hit.at) < TTL) {
            paint(sId);
            return Promise.resolve(hit.list);
          }
          if (inflight[sId]) return inflight[sId];
          var prevSig = hit ? sigOf(hit.list, hit.contrib) : null;
          // 기록 저장으로 덧붙은 주소(SUPABASE_H4). 함수가 없거나 실패하면 빈 목록(전부 관리자 등록으로 본다)
          var contribJob = rpc('get_spot_contributed_media', { p_spot_id: sId }).catch(function() { return []; });
          inflight[sId] = Promise.all([rpc('get_spot_creator_links', { p_spot_id: sId }), contribJob]).then(function(both) {
            var data = both[0];
            store[sId] = { at: Date.now(), list: Array.isArray(data) ? data : [], contrib: Array.isArray(both[1]) ? both[1] : [] };
          }).catch(function(e) {
            console.warn('[map-main.js:okbmLoadCreatorLinks]', e);
            store[sId] = { at: Date.now(), list: hit ? hit.list : [], contrib: hit ? hit.contrib : [], error: true };
          }).then(function() {
            delete inflight[sId];
            paint(sId);
            // 처음 받을 때는 유튜브·블로그 수집이 이 결과를 기다리므로 인스타 탭만 다시 그린다
            if (prevSig !== null && prevSig !== sigOf(store[sId].list, store[sId].contrib)) refreshMedia(sId);
            else repaintInsta(sId);
            return store[sId].list;
          });
          return inflight[sId];
        };

        async function youtubeTitle(url) {
          try {
            var res = await fetch('https://noembed.com/embed?url=' + encodeURIComponent(url));
            if (!res.ok) return '';
            var data = await res.json();
            return String((data && data.title) || '').trim().slice(0, 120);
          } catch (e) { return ''; }
        }

        // 채운 칸만 한 번에 등록한다. 칸 안에 주소를 여러 개(쉼표·띄어쓰기) 넣어도 받는다.
        async function submit(sId) {
          var st = ui[sId] = ui[sId] || {};
          keepInputs(sId);
          var urls = [];
          var bad = {};
          FIELDS.forEach(function(f) {
            String(st[f.key] || '').split(/[\s,，]+/).forEach(function(u) {
              u = u.trim().replace(/^http:\/\//i, 'https://');
              if (!u) return;
              if (!kindOf(u)) { bad[f.key] = true; return; }
              if (urls.indexOf(u) === -1) urls.push(u);
            });
          });
          st.bad = bad;
          if (Object.keys(bad).length) {
            paint(sId);
            var hasShorts = FIELDS.some(function(f) { return window.okbmIsYouTubeShorts(st[f.key]); });
            showToast(hasShorts ? '유튜브 숏츠는 등록할 수 없어요. 일반 영상 주소를 넣어 주세요.' : ('빨간 칸의 주소를 확인해 주세요. ' + ERR.bad_url));
            return;
          }
          if (!urls.length) { showToast('등록할 주소를 한 칸 이상 넣어 주세요.'); return; }
          st.busy = true;
          paint(sId);
          var ok = 0, fails = [];
          for (var i = 0; i < urls.length; i++) {
            var url = urls[i];
            try {
              var title = kindOf(url) === 'yt' ? await youtubeTitle(url) : '';
              await rpc('add_spot_creator_link', { p_spot_id: sId, p_url: url, p_title: title });
              ok++;
            } catch (e) {
              fails.push(errText(e));
            }
          }
          if (ok) {
            ui[sId] = {};
            showToast(fails.length
              ? (urls.length + '개 중 ' + ok + '개를 등록했어요. 나머지: ' + fails[0])
              : (ok > 1 ? ok + '개를 등록했어요. 고마워요!' : '콘텐츠를 등록했어요. 고마워요!'));
            await window.okbmLoadCreatorLinks(sId, true);
          } else {
            st.busy = false;
            paint(sId);
            showToast(fails[0] || ERR.bad_url);
          }
        }

        async function act(sId, action, id) {
          try {
            if (action === 'up' || action === 'report') {
              var hit = store[sId];
              var row = hit && (hit.list || []).filter(function(r) { return String(r.id) === String(id); })[0];
              if (action === 'report' && !(row && row.my_vote === 'report') &&
                !confirm('이 콘텐츠를 신고할까요?\n박지와 관련 없거나 부적절한 링크라면 신고해 주세요. 신고가 쌓이면 아래로 내려가요.')) return;
              var res = await rpc('vote_spot_creator_link', { p_link_id: Number(id), p_vote: action });
              if (action === 'report' && res && res.my_vote === 'report') showToast('신고했어요. 신고가 쌓이면 뒤로 내려가요.');
              // 순서는 서버 기준으로 다시 받아 목록을 새로 만든다
              window.okbmLoadCreatorLinks(sId, true);
            } else {
              if (action === 'del' && !confirm('이 콘텐츠를 삭제할까요?')) return;
              await rpc('manage_spot_creator_link', { p_link_id: Number(id), p_action: action === 'del' ? 'delete' : action });
              showToast(action === 'del' ? '삭제했어요.' : (action === 'hide' ? '숨겼어요.' : '다시 보이게 했어요.'));
              window.okbmLoadCreatorLinks(sId, true);
            }
          } catch (e) {
            showToast(errText(e));
          }
        }

        window.okbmCreatorAction = function(el, e) {
          if (e) { if (typeof e.preventDefault === 'function') e.preventDefault(); if (typeof e.stopPropagation === 'function') e.stopPropagation(); }
          if (!el || !el.dataset) return;
          var a = el.dataset.act;
          var sId = String(el.dataset.spot || '').trim();
          if (!sId) return;
          var st = ui[sId] = ui[sId] || {};
          if (a === 'login') {
            if (typeof openLoginModal === 'function') openLoginModal();
          } else if (a === 'open') {
            if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_spot_creator_link'); // 기능 사용 세기 (H8): 영상·글 링크 알려 주기 창
            st.form = true;
            paint(sId);
            var u = boxes(sId)[0] && boxes(sId)[0].querySelector('[data-creator-field]');
            if (u) u.focus();
          } else if (a === 'cancel') {
            ui[sId] = {};
            boxes(sId).forEach(function(b) { b.innerHTML = boxInner(sId); });
          } else if (a === 'submit') {
            if (!st.busy) submit(sId);
          } else if (a === 'retry') {
            window.okbmLoadCreatorLinks(sId, true);
          } else if (a === 'up' || a === 'report' || a === 'del' || a === 'hide' || a === 'show') {
            if (!loggedIn()) {
              showToast(ERR.login_required);
              if (typeof openLoginModal === 'function') openLoginModal();
              return;
            }
            act(sId, a, el.dataset.id);
          }
        };
      })();

      function renderSpotFieldFeedsTrackHtml(spot) {
        var sId = String(spot.id || '').trim();
        var cachedFeeds = (window.__spotFeedsCache && window.__spotFeedsCache.has(sId)) ? window.__spotFeedsCache.get(sId) : null;
        var initialInnerHtml = cachedFeeds ? buildSpotFieldFeedsTrackContent(spot, cachedFeeds) : '';

        return `
          <div id="spotFeedsRail_${sId}" style="margin:4px 0 2px 0; width:100%; display:flex; flex-direction:column; gap:4px;" onclick="event.stopPropagation();">
            ${initialInnerHtml}
          </div>
        `;
      }

      function splitOfficialPhotoCredit(text) {
        var raw = String(text || '').replace(/\r\n/g, '\n').trim();
        var matched = raw.match(/^📷\s*사진\s*[:：]\s*@?([A-Za-z0-9._]{1,30})(?:\s*\n+|\s+|$)/);
        if (!matched) return { handle: '', body: raw };
        return { handle: matched[1], body: raw.slice(matched[0].length).trim() };
      }

    // 📱 [글래스모피즘 순수 피드 히어로 모달 - 피드 주소 1:1 직통 정밀 매칭 엔진]
      window.openMapSpotFeedDetailModal = function(feedId, spotId) {
        var old = document.getElementById('mapSpotFeedDetailModal');
        if (old) old.remove();

        var targetFeedId = String(feedId || '').replace(/^["']|["']$/g, '').trim();
        if (!targetFeedId) return;

        var targetSpotId = String(spotId || (currentActiveSpot ? currentActiveSpot.id : '')).trim();
        var feedPool = (window.__spotFeedsCache && window.__spotFeedsCache.has(targetSpotId)) ? window.__spotFeedsCache.get(targetSpotId) : [];

        var targetFeed = feedPool.find(function(f) {
          if (!f || !f.id) return false;
          var fId = String(f.id).replace(/^["']|["']$/g, '').trim();
          return fId === targetFeedId;
        });

        if (!targetFeed) {
          return;
        }

        var rawCardId = String(targetFeed.id || '').replace(/^["']|["']$/g, '').trim();
        var cardId = escapeHtml(rawCardId);
        var photos = [];
        if (Array.isArray(targetFeed.photos)) {
          photos = targetFeed.photos.filter(function(u) {
            return typeof u === 'string' && u.trim().startsWith('https://');
          });
        }

        var authorNick = targetFeed.author || '개척 캠퍼';
        var tripDate = targetFeed.date || '';
        var spotTitle = targetFeed.spot || '';
        var weightVal = targetFeed.weight_kg !== undefined && targetFeed.weight_kg !== null ? targetFeed.weight_kg : targetFeed.weightKg;
        var weightStr = weightVal ? (weightVal + 'kg') : '';
        var memoText = (targetFeed.memo || '').trim();
        var rawInsta = targetFeed.instagram || '';
        var cleanInsta = String(rawInsta).replace(/[@\s]/g, '').trim();
        var recordUserId = String(targetFeed.user_id || targetFeed.userId || '').trim();

        var photoMemosArr = [];
        if (Array.isArray(targetFeed.photo_memos_json)) {
          photoMemosArr = targetFeed.photo_memos_json.map(function(m) { return String(m || '').trim(); });
        } else if (targetFeed.photo_memos_json && typeof targetFeed.photo_memos_json === 'string' && targetFeed.photo_memos_json.trim().startsWith('[')) {
          try { photoMemosArr = JSON.parse(targetFeed.photo_memos_json); } catch(e) { photoMemosArr = []; }
        } else if (Array.isArray(targetFeed.photoMemos)) {
          photoMemosArr = targetFeed.photoMemos.map(function(m) { return String(m || '').trim(); });
        }
        if (!Array.isArray(photoMemosArr)) photoMemosArr = [];
        photoMemosArr = photoMemosArr.map(function(m) { return String(m || '').trim(); });

        while (photoMemosArr.length < Math.max(1, photos.length)) {
          photoMemosArr.push('');
        }
        if (!photoMemosArr[0] && memoText) {
          photoMemosArr[0] = memoText;
        }

        var initialMemo = photoMemosArr[0] || memoText || '';
        var isOfficialRoute = recordUserId === 'official_romanticroute' || authorNick === '낭만루트';
        var creditParsed = isOfficialRoute ? splitOfficialPhotoCredit(initialMemo) : { handle: '', body: initialMemo };
        var creditHandle = creditParsed.handle || (isOfficialRoute ? cleanInsta : '');
        var shownMemo = (isOfficialRoute && creditParsed.handle) ? creditParsed.body : initialMemo;
        var creditBadgeHtml = (isOfficialRoute && creditHandle && typeof window.okbmFeedInstagramBadgeHtml === 'function')
          ? window.okbmFeedInstagramBadgeHtml(creditHandle)
          : '';
        var creditInlineHtml = (isOfficialRoute && creditHandle)
          ? '<span style="font-size:0.72rem; color:#cbd5e1; font-weight:700; letter-spacing:-0.01em; white-space:nowrap;">사진: @' + escapeHtml(creditHandle) + '</span>' +
            creditBadgeHtml
          : '';

        var starsMap = safeGetJSON('okbm_feed_stars_counts', {}) || {};
        var curProfile = safeGetJSON('user_profile', null);
        var curUId = (curProfile && curProfile.id) ? String(curProfile.id).trim() : (localStorage.getItem('okbm_user_id') || '');
        var userStarsKey = (typeof window.okbmGetUserStarsKey === 'function') ? window.okbmGetUserStarsKey(curUId) : (curUId ? ('okbm_feed_stars_map_' + curUId) : 'okbm_feed_stars_map');
        var userStarsMap = safeGetJSON(userStarsKey, {}) || {};
        var isStarred = Boolean(userStarsMap[rawCardId] || userStarsMap[cardId]);
        var serverFeedLikes = (targetFeed.likes_count !== undefined && targetFeed.likes_count !== null) ? Number(targetFeed.likes_count) : Number(targetFeed.likes || 0);
        var likesCount = Number(starsMap[rawCardId] || starsMap[cardId]) || serverFeedLikes || 0;

        var savedFeedsList = safeGetJSON('okbm_saved_feeds', []);
        var isSavedFeed = savedFeedsList.includes(rawCardId) || savedFeedsList.includes(cardId);

        var followingList = safeGetJSON('okbm_following_users', []);
        var profile = safeGetJSON('user_profile', null);
        var myUserId = (profile && profile.id) ? String(profile.id).trim() : '';
        var followKey = recordUserId || authorNick;
        var isFollowing = followingList.includes(followKey);
        var isSelf = (myUserId && recordUserId && myUserId === recordUserId);
        if (typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc(targetFeed)) {
          return;
        }

        var followBtnHtml = '';
        if (!isSelf) {
          followBtnHtml = isFollowing
            ? '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorNick) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(52,211,153,0.14); border:1px solid #34d399; color:#34d399; font-size:0.62rem; font-weight:900; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:9px; height:9px;" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>관심루터</span></button>'
            : '<button type="button" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorNick) + '" onclick="window.toggleFollowUser(this.dataset.userId, this.dataset.author, event);" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; font-size:0.62rem; font-weight:800; padding:2px 7px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:2px;"><svg viewBox="0 0 24 24" style="width:9px; height:9px;" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>관심</span></button>';
        }

        var slidesHtml = photos.map(function(pUrl) {
          return `
            <div style="flex:0 0 100%; width:100%; height:100%; scroll-snap-align:start; scroll-snap-stop:always; position:relative; overflow:hidden; background:#000000; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
              <img class="reel-photo-target map-feed-photo" src="${escapeHtml(okbmSafeImageUrl(pUrl))}" onload="if (window.applySmartPhotoFit) window.applySmartPhotoFit(this);" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80';" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; object-position:center center; display:block; background:#000;" />
            </div>
          `;
        }).join('');

        var mapSafetyHtml = '';
        if (!isSelf && (rawCardId || recordUserId) && typeof window.openUgcSafetyMenu === 'function') {
          mapSafetyHtml = '<button type="button" data-feed-id="' + escapeHtml(rawCardId) + '" data-user-id="' + escapeHtml(recordUserId) + '" data-author="' + escapeHtml(authorNick) + '" onclick="event.preventDefault(); event.stopPropagation(); window.openUgcSafetyMenu(this.dataset.feedId, this.dataset.userId, this.dataset.author, event);" title="더보기" aria-label="더보기" style="width:28px; height:28px; flex:0 0 28px; border-radius:14px; background:#0c1017; border:1px solid rgba(255,255,255,0.2); color:#ffffff; display:flex; align-items:center; justify-content:center; padding:0; cursor:pointer;">' +
            '<svg viewBox="0 0 24 24" style="width:16px; height:16px; pointer-events:none;" fill="currentColor"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>' +
          '</button>';
        }

        var dotsHtml = '';
        if (photos.length > 1) {
          var dotsItems = photos.map(function(_, i) {
            var dotW = (i === 0) ? '12px' : '4px';
            var dotBg = (i === 0) ? '#ffffff' : 'rgba(255,255,255,0.28)';
            return `<div class="feed-hero-dot" style="width:${dotW}; height:3px; border-radius:2px; background:${dotBg}; transition:all 0.2s ease;"></div>`;
          }).join('');
          dotsHtml = `<div id="mapHeroDotsWrap" style="display:flex; justify-content:center; align-items:center; gap:4px; height:10px;">${dotsItems}</div>`;
        }

  var modalEl = document.createElement('div');
        modalEl.id = 'mapSpotFeedDetailModal';
        modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 0px)); width:100%; background:#0c1017; z-index:880; display:flex; justify-content:center; align-items:center; padding:8px; box-sizing:border-box;';
        modalEl.onclick = function(e) { if (e.target === modalEl) modalEl.remove(); };

        modalEl.innerHTML = `
          <div style="width:min(94vw, 420px); height:auto; max-height:100%; background:#07090e; border:1px solid rgba(255,255,255,0.12); border-radius:18px; box-shadow:0 30px 80px rgba(0,0,0,0.95); display:flex; flex-direction:column; overflow:hidden; box-sizing:border-box;" onclick="event.stopPropagation();">
            
            <div style="padding:10px 14px; background:rgba(0,0,0,0.5); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
              <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                <button type="button" data-author="${escapeHtml(authorNick)}" data-user-id="${escapeHtml(recordUserId)}" onclick="document.getElementById('mapSpotFeedDetailModal').remove(); window.openUserFeedCollectionModal(this.dataset.author, this.dataset.userId);" style="background:none; border:none; padding:0; font-size:0.86rem; color:#ffffff; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; text-align:left;">
                  ${escapeHtml(authorNick)}
                </button>
                ${(!isOfficialRoute && typeof window.okbmFeedInstagramBadgeHtml === 'function') ? window.okbmFeedInstagramBadgeHtml(cleanInsta) : ''}
                ${followBtnHtml}
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                ${mapSafetyHtml}
                <span style="font-size:0.65rem; color:#64748b; font-family:'JetBrains Mono', monospace;">${escapeHtml(tripDate)}</span>
                <button type="button" onclick="document.getElementById('mapSpotFeedDetailModal').remove();" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:0 2px; line-height:1;">✕</button>
              </div>
            </div>

            <div style="width:100%; aspect-ratio:3/4; max-height:min(72dvh, 640px); background:#000; position:relative; overflow:hidden; flex:0 0 auto;">
              <div id="mapHeroPhotoTrack" class="reel-horizontal-track" data-default-memo="${escapeHtml(memoText)}" data-memos="${escapeHtml(JSON.stringify(photoMemosArr))}" onscroll="window.updateMapHeroDots(this);" style="position:absolute; inset:0; display:flex; width:100%; height:100%; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none;">
                ${slidesHtml}
              </div>
            </div>

            <div style="padding:10px 14px 12px 14px; background:#07090e; display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; position:relative; min-height:26px;">
                <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
                  <button type="button" data-star-card-id="${cardId}" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; gap:4px;">
                    <svg class="js-feed-star-icon" viewBox="0 0 24 24" style="width:17px; height:17px; filter:${isStarred ? 'drop-shadow(0 0 6px rgba(253,224,71,0.7))' : 'none'};" fill="${isStarred ? '#fde047' : 'none'}" stroke="${isStarred ? '#fde047' : '#ffffff'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span class="js-feed-star-count" style="font-size:0.75rem; font-weight:800; color:#fde047; font-family:'Space Grotesk', sans-serif;">${likesCount}</span>
                  </button>
                  ${typeof window.okbmFeedCommentBtnHtml === 'function' ? window.okbmFeedCommentBtnHtml(rawCardId, targetFeed.comments_count) : ''}
                  <button type="button" data-share-feed="1" data-feed-id="${cardId}" data-spot="${escapeHtml(spotTitle)}" data-memo="${escapeHtml(memoText)}" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:#cbd5e1;" title="공유">
                    <svg viewBox="0 0 24 24" style="width:15px; height:15px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                  <button type="button" data-save-feed="1" data-feed-id="${cardId}" style="background:none; border:none; padding:0; cursor:pointer; display:flex; align-items:center; color:${isSavedFeed ? '#c084fc' : '#cbd5e1'};" title="관심피드 저장">
                    <svg viewBox="0 0 24 24" style="width:15px; height:15px; filter:${isSavedFeed ? 'drop-shadow(0 0 6px rgba(192,132,252,0.8))' : 'none'};" fill="${isSavedFeed ? '#c084fc' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>

                <div style="position:absolute; left:50%; transform:translateX(-50%); pointer-events:none;">
                  ${dotsHtml}
                </div>

                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                  ${creditInlineHtml}
                  ${weightStr ? `
                    <span style="font-size:0.66rem; color:#cbd5e1; font-weight:800; font-family:'Space Grotesk',sans-serif; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:3px;">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:11px; height:11px; display:inline-block; vertical-align:-1.5px; flex-shrink:0;"><rect x="4" y="2" width="16" height="5" rx="2.5"/><path d="M8 2v5M16 2v5M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M12 7l-4 4M12 7l4 4M8 15h8v4H8z"/></svg>
                      <span>${escapeHtml(weightStr)}</span>
                    </span>` : ''}
                </div>
              </div>

              <div id="mapFeedPhotoMemoText" data-strip-credit="${isOfficialRoute ? '1' : '0'}" style="width:100%; height:calc(1.35em * 3); min-height:calc(1.35em * 3); max-height:calc(1.35em * 3); flex:0 0 calc(1.35em * 3); line-height:1.35em; font-family:'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif; font-size:0.76rem; font-weight:450; color:#e2e8f0; word-break:break-all; display:-webkit-box; -webkit-line-clamp:3; line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; letter-spacing:-0.01em; padding:0 2px; margin:0; background:transparent; border:none; box-sizing:border-box;">
                ${shownMemo ? escapeHtml(shownMemo) : '<span style="color:#64748b;">등록된 일지 메모가 없습니다.</span>'}
              </div>
            </div>

          </div>
        `;

        document.body.appendChild(modalEl);

      };

      // toggleFeedStar, toggleSaveFeed, toggleFollowUser는 romantic-history.js의 전역 단일 엔진을 공통 사용합니다.

      window.updateMapHeroDots = function(container) {
        if (!container) return;
        var width = container.offsetWidth;
        if (!width) return;
        var idx = Math.round(container.scrollLeft / width);

        // 1. 도트 인디케이터 동기화
        var wrap = document.getElementById('mapHeroDotsWrap');
        if (wrap) {
          var dots = wrap.children;
          for (var i = 0; i < dots.length; i++) {
            if (i === idx) {
              dots[i].style.width = '12px';
              dots[i].style.background = '#ffffff';
            } else {
              dots[i].style.width = '4px';
              dots[i].style.background = 'rgba(255,255,255,0.28)';
            }
          }
        }

        // 2. 사진별 메모: 여러 장이면 현재 사진 글, 대표 글만 있으면 유지
        var memoEl = document.getElementById('mapFeedPhotoMemoText');
        if (memoEl && container.dataset.memos) {
          try {
            var memos = JSON.parse(container.dataset.memos);
            if (!Array.isArray(memos)) memos = [];
            var filledCount = memos.filter(function(m) { return String(m || '').trim(); }).length;
            var curText = (memos[idx] !== undefined) ? String(memos[idx] || '').trim() : '';
            if (filledCount <= 1) {
              if (!curText && container.dataset.defaultMemo) curText = String(container.dataset.defaultMemo || '').trim();
              if (!curText && memos[0]) curText = String(memos[0] || '').trim();
            }
            if (memoEl.getAttribute('data-strip-credit') === '1') {
              curText = splitOfficialPhotoCredit(curText).body;
            }
            memoEl.innerHTML = curText
              ? escapeHtml(curText)
              : '<span style="color:#64748b;">이 사진에 등록된 현장 메모가 없습니다.</span>';
          } catch (e) { console.warn('[map.html:updateMapHeroDots]', e); }
        }
      };

      // 📱 [모바일 바텀시트 제스처]: 하단 슬라이드 닫기 제스처를 무효화하여 실수로 사라지는 현상 원천 차단 (닫기 버튼 전담)
      function initBottomSheetSwipeGesture() {
        var sheet = document.getElementById('mobileBottomSheet');
        if (!sheet) return;
        // 정보창이 스크롤 중 제스처 오작동으로 사라지지 않도록 슬라이드 닫기 이벤트 제거
      }

      // 🌐 [전국 실시간 통합 조회수 집계 엔진]
      window.__globalSpotViewsMap = (function() {
        try {
          var raw = sessionStorage.getItem('okbm_global_spot_views') || localStorage.getItem('okbm_global_spot_views');
          var parsed = raw ? JSON.parse(raw) : {};
          return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (e) { return {}; }
      })();

      function persistGlobalSpotViews() {
        var map = window.__globalSpotViewsMap || {};
        var keys = Object.keys(map);
        var limit = window.OKBM_SPOT_VIEWS_LRU_LIMIT || 200;
        if (keys.length > limit) {
          var keep = keys.slice(-limit);
          var next = {};
          keep.forEach(function(k) { next[k] = map[k]; });
          window.__globalSpotViewsMap = next;
          map = next;
        }
        try {
          sessionStorage.setItem('okbm_global_spot_views', JSON.stringify(map));
        } catch (e) {
          console.warn('[map.html:persistGlobalSpotViews]', e);
        }
        try { localStorage.removeItem('okbm_global_spot_views'); } catch (e2) {}
      }

      function fetchGlobalSpotRankings() {
        var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
        var targetKey = window.SUPABASE_ANON_KEY || '';
        var rankUrl = targetUrl + '/rest/v1/ranking_stats?select=spot_id,usage_count&order=usage_count.desc&limit=30';
        (typeof window.okbmPublicFetch === 'function'
          ? window.okbmPublicFetch(rankUrl)
          : fetch(rankUrl, {
          headers: {
            'apikey': targetKey,
            'Authorization': 'Bearer ' + targetKey,
            'Content-Type': 'application/json'
          }
        }))
        .then(function(res) { return res.ok ? res.json() : []; })
        .then(function(rows) {
          if (Array.isArray(rows)) {
            rows.forEach(function(r) {
              if (r && r.spot_id) {
                var id = String(r.spot_id);
                var serverCount = Number(r.usage_count) || 0;
                var localCount = Number(window.__globalSpotViewsMap[id]) || 0;
                window.__globalSpotViewsMap[id] = Math.max(serverCount, localCount);
              }
            });
            persistGlobalSpotViews();
          }
        })
        .catch(function(e) { console.warn('[map.html:fetchGlobalSpotRankings]', e); });
      }
      setTimeout(fetchGlobalSpotRankings, 800);

      // 검색창 인기 박지 TOP 5: 최근 7일 동안 정보창을 연 회원 수(H16 get_recent_spot_ranking).
      // 못 받으면 null로 두고 예전 누적 순위(getSpotViews)를 쓴다.
      window.__recentSpotRanking = null;
      function fetchRecentSpotRankings() {
        var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
        var rpcUrl = targetUrl + '/rest/v1/rpc/get_recent_spot_ranking';
        var headers = (typeof window.okbmPublicRestHeaders === 'function')
          ? window.okbmPublicRestHeaders()
          : {
              'apikey': window.SUPABASE_ANON_KEY || '',
              'Authorization': 'Bearer ' + (window.SUPABASE_ANON_KEY || ''),
              'Content-Type': 'application/json'
            };
        var body = JSON.stringify({ p_days: 7, p_limit: 10 });
        var doFetch = (typeof window.okbmPublicFetch === 'function')
          ? window.okbmPublicFetch(rpcUrl, { method: 'POST', headers: headers, body: body })
          : fetch(rpcUrl, { method: 'POST', headers: headers, body: body });
        doFetch
          .then(function(res) { return res.ok ? res.json() : null; })
          .then(function(rows) {
            if (!Array.isArray(rows) || !rows.length) return;
            window.__recentSpotRanking = rows.map(function(r) {
              return { id: String(r.spot_id), viewers: Number(r.viewers) || 0 };
            });
            const inputEl = document.getElementById('pcSearchInput');
            const dropdown = document.getElementById('pcSearchDropdown');
            if (dropdown && dropdown.style.display === 'block' && inputEl && !inputEl.value.trim()) showTopRankings('pc');
          })
          .catch(function(e) { console.warn('[map.html:fetchRecentSpotRankings]', e); });
      }
      setTimeout(fetchRecentSpotRankings, 900);

      // 화면에 보이는 횟수: 실제 회원 수에 순위별로 다르게 더하고(1위가 가장 많이), 박지마다 0~4를 더 흔든다.
      // 순서는 실제 순위 그대로이고, 위 순위 숫자가 늘 더 크게 맞춘다.
      function recentRankingDisplayCounts(list) {
        const bonus = [40, 33, 27, 22, 18];
        let prev = Infinity;
        return list.map((r, idx) => {
          let h = 0;
          for (const ch of r.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
          let n = r.viewers + (bonus[idx] != null ? bonus[idx] : 15) + (h % 5);
          if (n >= prev) n = prev - 1 - (h % 2);
          prev = n;
          return Math.max(n, r.viewers);
        });
      }

      function getSpotViews(spot) {
        if (!spot) return 0;
        var sId = String(spot.id || '').trim();
        var globalCount = sId ? (Number(window.__globalSpotViewsMap[sId]) || 0) : 0;
        var localCount = Number(spot.searchCount) || 0;
        return Math.max(globalCount, localCount);
      }

      window.__viewedSpotsInSession = window.__viewedSpotsInSession || new Set();
      function incrementSpotCount(spotId) {
        const target = spots.find(s => String(s.id).trim() === String(spotId).trim());
        if (!target) return;

        const sId = String(target.id).trim();
        if (!sId) return;

        // 세션당 박지 1회만 로컬·서버 모두 집계 (인플레·중복 RPC 방지)
        if (window.__viewedSpotsInSession.has(sId)) return;
        window.__viewedSpotsInSession.add(sId);

        const currentViews = getSpotViews(target) + 1;
        if (window.__globalSpotViewsMap[sId] !== undefined) delete window.__globalSpotViewsMap[sId];
        window.__globalSpotViewsMap[sId] = currentViews;
        persistGlobalSpotViews();
        target.searchCount = currentViews;

        var spotName = String(target.fullName || target.name || target.spot_main || '').trim();
        var targetUrl = window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co';
        var rpcUrl = targetUrl + '/rest/v1/rpc/increment_spot_ranking';
        var headers = (typeof window.okbmPublicRestHeaders === 'function')
          ? window.okbmPublicRestHeaders()
          : {
              'apikey': window.SUPABASE_ANON_KEY || '',
              'Authorization': 'Bearer ' + (window.SUPABASE_ANON_KEY || ''),
              'Content-Type': 'application/json'
            };
        var body = JSON.stringify({ p_spot_id: sId, p_spot_name: spotName });
        var doFetch = (typeof window.okbmPublicFetch === 'function')
          ? window.okbmPublicFetch(rpcUrl, { method: 'POST', headers: headers, body: body })
          : fetch(rpcUrl, { method: 'POST', headers: headers, body: body });
        doFetch.then(function(res) {
          if (res && res.ok) {
            fetchGlobalSpotRankings();
          }
        }).catch(function(e) {
          console.warn('[map.html:incrementSpotCount]', e);
        });
      }
var liveSearchTimer = null;
      var _mapKeywordSearchSeq = 0;

      function handleSearchInputChange(mode = 'pc') {
        const inputEl = document.getElementById('pcSearchInput');
        const clearBtn = document.getElementById('pcSearchClearBtn');
        const q = inputEl ? inputEl.value.trim() : '';

        if (clearBtn) {
          clearBtn.style.display = q.length > 0 ? 'inline-flex' : 'none';
        }

        clearTimeout(liveSearchTimer);
        if (!q) {
          _mapKeywordSearchSeq += 1;
          showTopRankings(mode);
        } else {
          liveSearchTimer = setTimeout(() => {
            executeSearch(mode);
          }, 120);
        }
      }

      function clearSearchInput(mode = 'pc', shouldFocus = true) {
        _mapKeywordSearchSeq += 1;
        clearTimeout(liveSearchTimer);
        const inputEl = document.getElementById('pcSearchInput');
        const clearBtn = document.getElementById('pcSearchClearBtn');
        const dropdown = document.getElementById('pcSearchDropdown');
        if (inputEl) {
          inputEl.value = '';
          if (shouldFocus) inputEl.focus();
        }
        if (clearBtn) clearBtn.style.display = 'none';
        if (dropdown) dropdown.style.display = 'none';
      }

     function showTopRankings(mode = 'pc') {
        const inputEl = document.getElementById('pcSearchInput');
        const dropdown = document.getElementById('pcSearchDropdown');
        if (!dropdown) return;
        if (inputEl && inputEl.value.trim().length > 0) return;

        dropdown.innerHTML = `
          <div style="padding:6px 12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-hairline); background:var(--bg-card);">
            <div style="display:flex; align-items:center; gap:4px;">
              <span style="color:#f59e0b; font-size:0.70rem;">★</span>
              <span style="font-size:0.72rem; font-weight:800; color:var(--text-primary);">최근 7일 인기 박지 TOP 5</span>
            </div>
            <button type="button" onclick="document.getElementById('pcSearchDropdown').style.display='none';" style="background:none; border:none; color:var(--text-muted); font-size:0.68rem; font-weight:700; cursor:pointer; padding:2px 4px;">✕ 닫기</button>
          </div>`;
        dropdown.style.display = 'block';

        const spotPool = (spots && spots.length > 0) ? spots : (safeGetJSON('okbm_spots_cache', []) || []);
        
        // 🔑 [A~H열 복합 키 적용]: 동명 산 및 다중 장소 포인트 온전 보존
        const seenKeys = new Set();
        const uniqueSpots = [];
        for (const item of spotPool) {
          const compKey = `${item.region}_${item.cityName}_${item.spot_main}_${item.spot_sub}_${item.id}`;
          if (!seenKeys.has(compKey)) {
            seenKeys.add(compKey);
            uniqueSpots.push(item);
          }
        }

        let sorted = [];
        let counts = [];
        const recent = Array.isArray(window.__recentSpotRanking) ? window.__recentSpotRanking : null;
        if (recent) {
          const byId = new Map(uniqueSpots.map(s => [String(s.id).trim(), s]));
          const picked = recent.filter(r => byId.has(r.id)).slice(0, 5);
          sorted = picked.map(r => byId.get(r.id));
          counts = recentRankingDisplayCounts(picked);
        }
        if (!sorted.length) {
          sorted = uniqueSpots.sort((a, b) => getSpotViews(b) - getSpotViews(a)).slice(0, 5);
          counts = sorted.map(getSpotViews);
        }
        sorted.forEach((item, idx) => {
          const rankColors = [
            'background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff;',
            'background:linear-gradient(135deg, #94a3b8, #64748b); color:#fff;',
            'background:linear-gradient(135deg, #b45309, #78350f); color:#fff;',
            'background:rgba(255,255,255,0.08); color:var(--text-secondary);',
            'background:rgba(255,255,255,0.08); color:var(--text-secondary);'
          ];
          const li = document.createElement('li');
          li.style.cssText = 'padding:6px 12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-hairline); cursor:pointer; min-height:36px; box-sizing:border-box;';
          li.onmouseover = () => { li.style.background = 'var(--bg-card-hover)'; };
          li.onmouseout = () => { li.style.background = 'transparent'; };

          li.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
              <div style="width:16px; height:16px; border-radius:4px; font-size:0.62rem; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; ${rankColors[idx] || rankColors[3]}">
                ${idx + 1}
              </div>
              <div style="display:flex; flex-direction:column; min-width:0; overflow:hidden;">
                <div style="display:flex; align-items:center; gap:4px;">
                  <span style="font-size:0.78rem; font-weight:800; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(item.spot_main || item.name)}
                  </span>
                  ${item.spot_sub ? `<span style="font-size:0.64rem; color:var(--accent-blue); font-weight:700;">(${escapeHtml(item.spot_sub)})</span>` : ''}
                  ${isCampBanned(item) ? '<span style="font-size:0.58rem; color:#fda4af; font-weight:900; flex-shrink:0;">🚫 야영금지</span>' : ''}
                </div>
                <span style="font-size:0.60rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(item.region || '')} ${escapeHtml(item.cityName || '')}${(() => {
                    // 높이는 숫자만 저장돼 있어 "146"이 무슨 숫자인지 모른다: 끝에 m를 붙이고, 0·빈 값이면 뺀다
                    const ev = String(item.elevation == null ? '' : item.elevation).trim().replace(/\.0+$/, '');
                    if (!ev || /^0+$/.test(ev)) return '';
                    return ' · ' + escapeHtml(/m$/i.test(ev) ? ev : ev + 'm');
                  })()}
                </span>
              </div>
            </div>
            <div style="font-size:0.60rem; color:#38bdf8; font-weight:800; font-family:'Space Grotesk', sans-serif; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.25); padding:1px 6px; border-radius:8px; flex-shrink:0; margin-left:6px;">
              ${counts[idx]}회
            </div>`;

          li.addEventListener('click', () => {
            dropdown.style.display = 'none';
            focusSpotOnMap(item);
          });
          dropdown.appendChild(li);
        });
      }

      function handleSearchInput(e, mode = 'pc') {
        if (e.keyCode === 13) {
          clearTimeout(liveSearchTimer);
          executeSearch(mode);
        }
      }

      var clustererDebounceTimer = null;

      function renderSpots(forceRebuild = false) {
        if (typeof updateMapFilterBtn === 'function') updateMapFilterBtn();
        const mapReady = isKakaoMapReady();
        if (!mapReady) {
          window.__pendingRenderSpots = forceRebuild ? 'force' : (window.__pendingRenderSpots || true);
        }
        var latestB = (window.RomanticVault && typeof window.RomanticVault.read === 'function') ? window.RomanticVault.read('okbm_bookmarks', []) : safeGetJSON('okbm_bookmarks', []);
        var latestV = (window.RomanticVault && typeof window.RomanticVault.read === 'function') ? window.RomanticVault.read('okbm_visited', []) : safeGetJSON('okbm_visited', []);
        userBookmarks = new Set((latestB || []).map(function(s) { return String(s).trim(); }));
        userVisited = new Set((latestV || []).map(function(s) { return String(s).trim(); }));
        window.userBookmarks = userBookmarks;
        window.userVisited = userVisited;

        const currentIds = new Set(spots.map(s => String(s.id).trim()));
        if (mapReady) {
          spotNativeMarkerMap.forEach((marker, id) => { 
            if (!currentIds.has(id)) { 
              marker.setMap(null); 
              spotNativeMarkerMap.delete(id); 
            } 
          });
          spotLabelOverlayMap.forEach((overlay, id) => { 
            if (!currentIds.has(id)) { 
              overlay.setMap(null); 
              spotLabelOverlayMap.delete(id); 
            } 
          });
        }

        const activeMarkers = [];
        let displaySpots = [...spots];
        if (isAdminMode) {
          displaySpots.sort((a, b) => spotRecencyValue(b) - spotRecencyValue(a));
        } else {
          displaySpots.sort((a, b) => {
            const nameA = String(a.name || a.spot_main || '').trim();
            const nameB = String(b.name || b.spot_main || '').trim();
            return nameA.localeCompare(nameB, 'ko');
          });
        }

        const targetOrder = ["서울/인천", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
        const grouped = Object.fromEntries(targetOrder.map(r => [r, []]));
        const coordCountMap = new Map();

        displaySpots.forEach(spot => {
          let lat = parseFloat(spot.lat), lng = parseFloat(spot.lng);
          if (isNaN(lat) || isNaN(lng)) return;

          if (lat > 100 && lng < 50 && lng > 0) {
            const tmp = lat; lat = lng; lng = tmp;
            spot.lat = lat; spot.lng = lng;
          }

          const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
          const overlapIndex = coordCountMap.get(coordKey) || 0;
          coordCountMap.set(coordKey, overlapIndex + 1);

          if (overlapIndex > 0) {
            const angle = overlapIndex * 1.57;
            const dist = 0.00018 * Math.ceil(overlapIndex / 4);
            lat = lat + Math.sin(angle) * dist;
            lng = lng + Math.cos(angle) * (dist * 1.2);
          }

          spot.renderLat = lat;
          spot.renderLng = lng;

          const sId = String(spot.id).trim();

          if (!spot._regionNormalized) {
            var detectedRegion = '';
            try {
              detectedRegion = detectRegionAndCity(lat, lng, spot.spot_main || spot.name, spot.trailhead_addr || spot.entryPoint).region;
            } catch (e) {}
            spot.region = normalizeTo10Regions(spot.region, detectedRegion);
            spot._regionNormalized = true;
          }

          if (!mapReady) return;

          const latlng = spot._renderLatLng || (spot._renderLatLng = new kakao.maps.LatLng(lat, lng));

          if (!spotNativeMarkerMap.has(sId) && map) {
            const marker = new kakao.maps.Marker({
              position: latlng, 
              image: createPureSvgMarkerImage(spot.difficulty, isCampBanned(spot)), 
              clickable: true,
              draggable: String(window.__adminPinMoveSpotId || '').trim() === sId,
              zIndex: 9999
            });
            kakao.maps.event.addListener(marker, 'click', function(mouseEvent) {
              if (isPickingLocationMode) {
                if (window.__adminPinMoveSpotId && String(sId) !== String(window.__adminPinMoveSpotId).trim()) {
                  var pos = (mouseEvent && mouseEvent.latLng) ? mouseEvent.latLng : marker.getPosition();
                  handleMapClick({ latLng: pos });
                }
                return;
              }
              // spots 목록이 새 객체로 바뀌어도 마커는 재사용되므로, 만들 때의 spot이 아니라 최신 spotData를 연다
              focusSpotOnMap(marker.spotData || spot);
            });
            bindAdminMarkerDrag(marker, sId);
            marker.spotData = spot;
            marker.__okbmPosKey = lat.toFixed(6) + ',' + lng.toFixed(6);
            marker.__okbmDiff = spot.difficulty;
            marker.__okbmBan = isCampBanned(spot);
            spotNativeMarkerMap.set(sId, marker);
          } else {
            const existingMarker = spotNativeMarkerMap.get(sId);
            if (existingMarker) {
              if (typeof existingMarker.setDraggable === 'function') {
                existingMarker.setDraggable(String(window.__adminPinMoveSpotId || '').trim() === sId);
              }
              // 목록 교체(서버 새로고침·백업 복원 등) 뒤에도 마커가 새 spot 객체·좌표·난이도를 따르게 한다
              existingMarker.spotData = spot;
              const posKey = lat.toFixed(6) + ',' + lng.toFixed(6);
              if (existingMarker.__okbmPosKey !== posKey) {
                existingMarker.__okbmPosKey = posKey;
                const freshLatLng = (spot._renderLatLng = new kakao.maps.LatLng(lat, lng));
                existingMarker.setPosition(freshLatLng);
                const lbl = spotLabelOverlayMap.get(sId);
                if (lbl) lbl.setPosition(freshLatLng);
              }
              const banned = isCampBanned(spot);
              if (existingMarker.__okbmDiff !== spot.difficulty || existingMarker.__okbmBan !== banned) {
                existingMarker.__okbmDiff = spot.difficulty;
                existingMarker.__okbmBan = banned;
                existingMarker.setImage(createPureSvgMarkerImage(spot.difficulty, banned));
              }
            }
          }
          // 이름 라벨(CustomOverlay)은 여기서 만들지 않는다. 화면에 띄울 때 updateLODLabels가 만든다(385개 선생성 제거).
        });

        let visibleCount = 0;
        const visibleSpots = [];
        const spotListEl = document.getElementById('spotList');
        const hasRegionGroups = !!(spotListEl && spotListEl.querySelector('.region-group'));
        const hasAdminReviewList = !!(spotListEl && spotListEl.querySelector('#adminReviewListHeader'));
        let isDomBuilt = !forceRebuild && spotListEl && spotListEl.children.length > 0 && (isAdminMode ? hasAdminReviewList : hasRegionGroups);

        const regionVisibleCounts = Object.fromEntries(targetOrder.map(r => [r, 0]));

        displaySpots.forEach(spot => {
          const sId = String(spot.id).trim();
          const marker = spotNativeMarkerMap.get(sId);
          const labelOverlay = spotLabelOverlayMap.get(sId);
          let match = hudFilterMatches(spot, currentHudFilterDiff, currentHudFilterStatus, currentHudFilterTerrain);

          const regKey = normalizeTo10Regions(spot.region);
          if (match && !listFilterMatches(spot)) match = false;

          if (match) {
            if (marker) activeMarkers.push(marker);
            if (grouped[regKey]) grouped[regKey].push(spot);
            if (regionVisibleCounts[regKey] !== undefined) regionVisibleCounts[regKey]++;
            visibleCount++;
            visibleSpots.push(spot);
          } else {
            if (marker) marker.setMap(null);
            if (labelOverlay) labelOverlay.setMap(null);
          }

          if (isDomBuilt) {
            const cardEl = document.getElementById(`spotItem_${sId}`);
            if (cardEl) cardEl.style.display = match ? 'flex' : 'none';
          }
        });

        if (mapReady) {
          clearTimeout(clustererDebounceTimer);
          clustererDebounceTimer = setTimeout(() => {
            if (globalClusterer) {
              // 차이만 add/remove 하면 클러스터러 내부 순서가 바뀌어(가까운 클러스터에 순서대로 붙임)
              // 같은 필터여도 토글 이력에 따라 묶음이 달라진다. 385개 규모에선 이득도 측정되지 않아 전체 교체를 유지한다.
              globalClusterer.clear();
              if (activeMarkers.length > 0) {
                globalClusterer.addMarkers(activeMarkers);
              }
            }
            updateLODLabels();
          }, 80);
        }
        window.renderSpots = renderSpots;

        const spotCountEl = document.getElementById('spotCount');
        if (spotCountEl) spotCountEl.innerText = `${visibleCount}개`;
        if (!spotListEl) {
          updateSmartResetButtons();
          return;
        }
        if (isDomBuilt && isAdminMode && visibleSpots.length > 0 && !spotListEl.querySelector('.spot-item')) {
          isDomBuilt = false;
        }

        if (isDomBuilt) {
          if (isAdminMode) {
            const adminHeaderDiv = document.getElementById('adminReviewListHeader');
            if (adminHeaderDiv) adminHeaderDiv.innerHTML = `${ICONS.FAST} [관리자 검수] 최신 등록순 목록 (${visibleCount}개)`;
          } else {
          targetOrder.forEach(regKey => {
            const groupDiv = spotListEl.querySelector(`.region-group[data-region="${regKey}"]`);
            if (!groupDiv) return;
            const count = regionVisibleCounts[regKey] || 0;
            const titleSpan = groupDiv.querySelector('.region-group-title span:last-child');
            const container = groupDiv.querySelector('.region-items-container');
            const title = groupDiv.querySelector('.region-group-title');
            const shouldBeOpen = (currentMasterTab === 'REGION' && currentRegionFilter === regKey);
            if (count === 0) {
              groupDiv.style.display = 'none';
            } else {
              groupDiv.style.display = 'block';
              if (shouldBeOpen && container) {
                container.style.display = 'block';
                if (title) title.style.borderLeftColor = '#0f766e';
              }
              const isOpen = container && container.style.display !== 'none';
              if (titleSpan) {
                titleSpan.innerHTML = `${count}개 ${isOpen ? '<b style="color:var(--accent-blue);">▼</b>' : '▶'}`;
              }
            }
          });
          }
          // 기존 카드 DOM 유지. 찜/클리어/관리 상태가 바뀐 경우에만 버튼을 갱신.
          var btnStateSig = (isAdminMode ? 'A' : 'U') + '|' + Array.from(userBookmarks).sort().join(',') + '|' + Array.from(userVisited).sort().join(',');
          if (spotListEl.__okbmBtnStateSig !== btnStateSig) {
          spotListEl.__okbmBtnStateSig = btnStateSig;
          spotListEl.querySelectorAll('.spot-item').forEach(function(card) {
            var id = String((card.id || '').replace(/^spotItem_/, '')).trim();
            if (!id) return;
            var favBtn = card.querySelector('.btn-card-quick[onclick*="toggleUserBookmark"]');
            var doneBtn = card.querySelector('.btn-card-quick[onclick*="toggleUserVisited"]');
            if (favBtn) favBtn.classList.toggle('active-fav', userBookmarks.has(id));
            if (doneBtn) doneBtn.classList.toggle('active-done', userVisited.has(id));
            card.querySelectorAll('.btn-edit, .btn-del').forEach(function(btn) {
              btn.style.display = isAdminMode ? 'inline-block' : 'none';
            });
          });
          }
        } else {
          spotListEl.__okbmBtnStateSig = '';
          spotListEl.innerHTML = '';
          const fragment = document.createDocumentFragment();

          if (isAdminMode) {
            const adminHeaderDiv = document.createElement('div');
            adminHeaderDiv.id = 'adminReviewListHeader';
            adminHeaderDiv.style.cssText = "padding:8px 14px; background:rgba(16,185,129,0.15); border-bottom:1px solid rgba(16,185,129,0.3); font-size:0.78rem; color:var(--accent-emerald); font-weight:bold;";
            adminHeaderDiv.innerHTML = `${ICONS.FAST} [관리자 검수] 최신 등록순 목록 (${visibleCount}개)`;
            fragment.appendChild(adminHeaderDiv);
            visibleSpots.forEach(spot => fragment.appendChild(createSpotCardElement(spot)));
          } else {
            targetOrder.forEach(regionKey => {
              const items = grouped[regionKey];
              if (!items || items.length === 0) return;
              
              const shouldBeOpen = (currentMasterTab === 'REGION' && currentRegionFilter === regionKey);

              const groupDiv = document.createElement('div');
              groupDiv.className = 'region-group';
              groupDiv.setAttribute('data-region', regionKey);
              const groupTitle = document.createElement('div');
              groupTitle.className = 'region-group-title';
              groupTitle.innerHTML = `<span style="display:flex; align-items:center; gap:4px;">${ICONS.PIN}${regionKey}</span><span style="color:var(--text-muted); font-size:0.74rem;">${items.length}개 ${shouldBeOpen ? '<b style="color:var(--accent-blue);">▼</b>' : '▶'}</span>`;
              if (shouldBeOpen) groupTitle.style.borderLeftColor = '#0f766e';
              
              const groupItemsContainer = document.createElement('div');
              groupItemsContainer.className = 'region-items-container';
              groupItemsContainer.style.display = shouldBeOpen ? 'block' : 'none';

              groupTitle.addEventListener('click', () => {
                const isClosed = groupItemsContainer.style.display === 'none';
                groupItemsContainer.style.display = isClosed ? 'block' : 'none';
                const currentCount = regionVisibleCounts[regionKey] || 0;
                groupTitle.querySelector('span:last-child').innerHTML = `${currentCount}개 ${isClosed ? '<b style="color:var(--accent-blue);">▼</b>' : '▶'}`;
                groupTitle.style.borderLeftColor = isClosed ? '#0f766e' : 'transparent';
                updateSmartResetButtons();
              });

              items.forEach(spot => groupItemsContainer.appendChild(createSpotCardElement(spot)));
              groupDiv.appendChild(groupTitle); 
              groupDiv.appendChild(groupItemsContainer); 
              fragment.appendChild(groupDiv);
            });
          }
          spotListEl.appendChild(fragment);
        }
        updateSmartResetButtons();
      }

      function createSpotCardElement(spot) {
        const sId = String(spot.id).trim();
        const isFav = userBookmarks.has(sId), isDone = userVisited.has(sId);
        const diffClass = getSpotDiffColorClass(spot.difficulty);
        const summary = parseStructuredSummary(spot.desc_summary || spot.desc);
        
        const descText = summary.view || spot.desc_summary || spot.desc || '탁 트인 자연 경관을 즐길 수 있는 추천 장소.';
        const descIsShort = /…$/.test(String(descText).trim());
        const rawName = (spot.spot_main || spot.name || '').trim();
        const cityName = spot.cityName ? String(spot.cityName).trim() : '';

        const uniqueTerrains = [];
        const tSet = new Set();
        (spot.terrain || []).forEach(t => {
          let key = '';
          if (t.includes('데크')) key = '데크';
          else if (t.includes('암릉') || t.includes('바위') || t.includes('돌')) key = '암릉';
          else if (t.includes('노지') || t.includes('흙')) key = '노지';
          else if (t.includes('해변') || t.includes('모래')) key = '해변';
          else if (t.includes('섬')) key = '섬';
          else if (t.includes('계곡')) key = '계곡';
          else if (t.includes('동굴')) key = '동굴';
          
          if (key && !tSet.has(key)) {
            tSet.add(key);
            uniqueTerrains.push(key);
          }
        });

        const getTerrainTagHtml = (name) => {
          if (name === '데크') return `<span class="meta-tag tag-terrain-deck">${ICONS.DECK}데크</span>`;
          if (name === '암릉') return `<span class="meta-tag tag-terrain-rock">${ICONS.ROCK}암릉</span>`;
          if (name === '노지') return `<span class="meta-tag tag-terrain-soil">${ICONS.SOIL}노지</span>`;
          if (name === '해변') return `<span class="meta-tag tag-terrain-beach">${ICONS.BEACH}해변</span>`;
          if (name === '섬') return `<span class="meta-tag tag-terrain-island">${ICONS.ISLAND}섬</span>`;
          if (name === '계곡') return `<span class="meta-tag tag-terrain-valley">${ICONS.VALLEY}계곡</span>`;
          if (name === '동굴') return `<span class="meta-tag tag-terrain-rock">${ICONS.CAVE}동굴</span>`;
          return '';
        };

        const mainTerrainHtml = uniqueTerrains.length > 0 ? getTerrainTagHtml(uniqueTerrains[0]) : '';
        const subTerrainsHtml = uniqueTerrains.slice(1).map(t => getTerrainTagHtml(t)).join('');

        const li = document.createElement('div');
        li.className = 'spot-item'; 
        li.id = `spotItem_${spot.id}`;
        li.innerHTML = `
          <div class="spot-card-row1">
            ${cityName ? `<span class="city-badge-colored">${escapeHtml(cityName)}</span>` : ''}
            <span class="spot-name-colored ${diffClass}">${escapeHtml(rawName)}</span>
            ${spot.spot_sub ? `<span class="spot-card-sub">${escapeHtml(spot.spot_sub)}</span>` : ''}
            <div class="spot-card-quick-actions" onclick="event.stopPropagation();">
              <button data-metric-click="feat_spot_fav" type="button" class="btn-card-quick ${isFav ? 'active-fav' : ''}" data-id="${sId}" onclick="toggleUserBookmark(this.dataset.id, event)">${ICONS.HEART} 찜</button>
              <button data-metric-click="feat_spot_visited" type="button" class="btn-card-quick ${isDone ? 'active-done' : ''}" data-id="${sId}" onclick="toggleUserVisited(this.dataset.id, event)">${ICONS.FLAG} 클리어</button>
              <button class="btn-edit" style="display:${isAdminMode ? 'inline-block' : 'none'};" data-id="${sId}" onclick="editSpotById(event, this.dataset.id)">수정</button>
              <button class="btn-edit" style="display:${isAdminMode ? 'inline-block' : 'none'}; background:#0f766e;" data-id="${sId}" onclick="startAdminPinMove(this.dataset.id, event)">핀</button>
              <button class="btn-del" style="display:${isAdminMode ? 'inline-block' : 'none'};" data-id="${sId}" onclick="deleteSpotById(event, this.dataset.id)">삭제</button>
              <button class="btn-edit" style="display:${isAdminMode ? 'inline-block' : 'none'}; background:${isCampBanned(spot) ? '#475569' : '#9f1239'};" data-id="${sId}" onclick="window.toggleSpotCampBanById(this.dataset.id, event)">${isCampBanned(spot) ? '금지해제' : '🚫금지'}</button>
            </div>
          </div>

          <div class="spot-card-row2">
            ${spot.elevation ? `<span class="spot-card-elev">${ICONS.MOUNTAIN}${escapeHtml(okbmSpotElevLabel(spot.elevation))}</span>` : ''}
            ${getSpotStatusBadges(spot)}
            ${mainTerrainHtml}
            ${spot.distance?.trim() ? `<span class="meta-tag tag-dist">${ICONS.DIST} ${escapeHtml(okbmSpotDistLabel(spot.distance))}</span>` : ''}
            <span class="meta-tag tag-diff">난이도 ${'★'.repeat(Math.min(5, Math.max(1, parseInt(spot.difficulty, 10) || 3)))}</span>
            ${subTerrainsHtml}
          </div>

          ${isCampBanned(spot)
            ? '<div class="spot-desc-multi" style="color:#fda4af; font-weight:800;">🚫 야영이 금지되었습니다</div>'
            : `<div class="spot-desc-multi">${ICONS.VIEW_CARD} <span class="spot-desc-text">${escapeHtml(descText)}</span>${descIsShort ? ' <button type="button" class="spot-desc-more">더보기</button>' : ''}</div>`}`;

        // 목록은 소개 앞 80자만 받는다(H15). '더보기'를 누르면 이 박지 하나의 전체 소개를 받아 카드 안에서 펼친다.
        const moreBtn = li.querySelector('.spot-desc-more');
        if (moreBtn) {
          moreBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (moreBtn.disabled) return;
            moreBtn.disabled = true;
            moreBtn.textContent = '불러오는 중';
            const latest = (Array.isArray(spots) && spots.find(function(s) { return String(s.id).trim() === sId; })) || spot;
            try { await ensureSpotDetailLoaded(latest); } catch (err) {}
            const full = parseStructuredSummary(latest.desc_summary || latest.desc).view || '';
            const textEl = li.querySelector('.spot-desc-text');
            if (textEl && full && full.length > descText.length - 1) {
              textEl.textContent = full;
              moreBtn.remove();
            } else {
              moreBtn.disabled = false;
              moreBtn.textContent = '다시 시도';
            }
          });
        }

        li.addEventListener('click', () => {
          var latest = (Array.isArray(spots) && spots.find(function(s) { return String(s.id).trim() === sId; })) || spot;
          focusSpotOnMap(latest);
        });
        return li;
      }

     // 🛡️ [모달 좌표 메모리 격리 초기화 엔진 - ReferenceError 원천 소멸]
      function resetModalPendingMemory() {
        modalPendingData = { lat: 0, lng: 0, address: '' };
        var coordsInput = document.getElementById('modalInputCoordsDisplay');
        if (coordsInput) coordsInput.value = '';
      }

      // 🛡️ [제보 입력창 클린 초기화 엔진]
      function clearModalInputs() {
        var setVal = function(id, val) { var el = document.getElementById(id); if (el) el.value = val; };
        setVal('modalInputName', '');
        setVal('modalInputSub', '');
        setVal('modalInputCoordsDisplay', '');
        setVal('modalInputTrailheadName', '');
        setVal('modalInputEntry', '');
        setVal('modalInputElevation', '');
        setVal('modalInputDescView', '');
        setVal('modalInputDescAccess', '');
        setVal('modalInputDescPitch', '');
        setVal('modalInputDescTip', '');
        setVal('modalInputYoutube', '');
        setVal('modalInputBlog', '');
        setVal('modalInputInsta', '');
        setVal('modalInputDistance', '');
        
        var diffSelect = document.getElementById('modalSelectDiff');
        if (diffSelect) diffSelect.value = '3';
        modalPendingCourseType = '일반';

        ['chkDeck', 'chkRock', 'chkSoil', 'chkBeach', 'chkIsland', 'chkValley', 'chkCave'].forEach(function(chkId) {
          var chk = document.getElementById(chkId);
          if (chk) chk.checked = (chkId === 'chkDeck');
        });

        var authorInput = document.getElementById('modalInputAuthorSns');
        if (authorInput) { authorInput.value = ''; }
        var reasonBox = document.getElementById('modalFieldCorrectionReason');
        if (reasonBox) reasonBox.style.display = 'none';
      }

     // 🏕️ [유저 장소 제보 모달 오픈 - 기존 제보 수정 및 오염 방지 엔진]
      window.__currentEditingProposalId = null;

      window.openUserProposalModal = function(defaultName = "", lat = 0, lng = 0, defaultSub = "", existingProp = null) {

        var isLogged = isUserLoggedIn();

        if (!isLogged) {
          if (typeof window.openLoginModal === 'function') {
            window.openLoginModal();
          } else if (typeof window.handleAuthBtnClick === 'function') {
            window.handleAuthBtnClick();
          }
          showToast('🔒 장소 제보는 로그인 후 이용하실 수 있습니다.');
          return;
        }

        modalMode = 'PROPOSAL';
        resetModalPendingMemory();
        clearModalInputs();

        window.__currentEditingProposalId = existingProp ? existingProp.id : null;

        var titleEl = document.getElementById('modalTitle');
        var noticeEl = document.getElementById('modalNotice');
        var btnEl = document.getElementById('modalSubmitBtn');

        if (existingProp) {
          // 기존 작성 제보 불러와서 수정 모드 활성화
          if (titleEl) titleEl.innerHTML = ICONS.PIN + ' <span>제보 장소 내용 수정 (등록 전)</span>';
          if (noticeEl) {
            noticeEl.style.display = 'flex';
            noticeEl.innerHTML = ICONS.EDIT + ' <span>관리자가 승인하기 전까지 제보 내용을 언제든 수정할 수 있습니다.</span>';
          }
          if (btnEl) btnEl.innerText = '수정 완료 (재제출)';

          var setV = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
          setV('modalInputName', existingProp.spot_main || existingProp.name);
          setV('modalInputSub', existingProp.spot_sub);
          setV('modalInputTrailheadName', existingProp.trailhead_name);
          setV('modalInputEntry', existingProp.trailhead_addr || existingProp.entry);
          setV('modalInputElevation', existingProp.elevation);
          setV('modalInputDistance', existingProp.distance_km || existingProp.distance);
          setV('modalInputYoutube', existingProp.youtubeUrls);
          setV('modalInputBlog', existingProp.blogUrl);
          setV('modalInputAuthorSns', existingProp.authorSnsUrl);

          setV('modalInputDescView', existingProp.descView);
          setV('modalInputDescAccess', existingProp.descAccess);
          setV('modalInputDescPitch', existingProp.descPitch);
          setV('modalInputDescTip', existingProp.descTip);

          if (existingProp.lat && existingProp.lng) {
            modalPendingData.lat = parseFloat(existingProp.lat);
            modalPendingData.lng = parseFloat(existingProp.lng);
            var coordsInput = document.getElementById('modalInputCoordsDisplay');
            if (coordsInput) coordsInput.value = `${existingProp.lat}, ${existingProp.lng}`;
          }
        } else {
          if (titleEl) titleEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px; flex-shrink:0;"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span>장소 제보하기</span>`;
          if (noticeEl) {
            noticeEl.style.display = 'flex';
            noticeEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; flex-shrink:0; color:#f59e0b;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>제보해주신 소중한 장소는 확인 후 전국 지도에 정식 등록됩니다.</span>`;
          }
          if (btnEl) btnEl.innerText = '장소 제보 접수하기';

          if (lat && lng) {
            modalPendingData.lat = parseFloat(lat);
            modalPendingData.lng = parseFloat(lng);
            var coordsInput = document.getElementById('modalInputCoordsDisplay');
            if (coordsInput) coordsInput.value = `${lat}, ${lng}`;
          }
          if (defaultName) {
            var cleanName = String(defaultName).replace(/\[.*?\]\s*/g, '').trim();
            var nameInput = document.getElementById('modalInputName');
            if (nameInput) nameInput.value = cleanName;
          }
          // 세부포인트는 주소가 섞이지 않은 순수 값만 적용
          if (defaultSub && !defaultSub.includes('시') && !defaultSub.includes('도') && !defaultSub.includes('면') && !defaultSub.includes('로')) {
            var subInput = document.getElementById('modalInputSub');
            if (subInput) subInput.value = defaultSub;
          }
        }
        var authorSnsInput = document.getElementById('modalInputAuthorSns');
        if (authorSnsInput && !String(authorSnsInput.value || '').trim() && typeof window.okbmProfileInstagramForForm === 'function') {
          var profileInsta = window.okbmProfileInstagramForForm();
          if (profileInsta) authorSnsInput.value = profileInsta;
        }
var overlay = document.getElementById('customModalOverlay');
        if (overlay) {
          overlay.style.setProperty('display', 'flex', 'important');
          overlay.style.setProperty('z-index', '999999', 'important');
          overlay.style.setProperty('opacity', '1', 'important');
          overlay.style.setProperty('visibility', 'visible', 'important');
          overlay.style.setProperty('pointer-events', 'auto', 'important');

          // 🚀 모달 오픈 즉시 카메라 스크롤을 맨 위(0px)로 강제 텔레포트
          var modalBox = overlay.querySelector('.custom-modal');
          if (modalBox) {
            modalBox.scrollTop = 0;
            requestAnimationFrame(() => { modalBox.scrollTop = 0; });
            setTimeout(() => { if (modalBox) modalBox.scrollTop = 0; }, 30);
          }
        }
      };

      // 📝 기존 등록 박지의 정보 수정 건의 전용 오픈 핸들러
      window.__isSpotCorrectionMode = false;
      window.__correctionTargetSpotId = null;
      window.__origSpotBeforeCorrection = null;

      window.openSpotCorrectionModal = function(spotId, e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }

        var targetSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
        if (!targetSpot) {
          showToast('장소 정보를 찾을 수 없습니다.');
          return;
        }

        var parsedSummary = parseStructuredSummary(targetSpot.desc_summary || targetSpot.desc);
        window.__isSpotCorrectionMode = true;
        window.__correctionTargetSpotId = String(targetSpot.id).trim();
        window.__origSpotBeforeCorrection = JSON.parse(JSON.stringify(targetSpot));

        var existingPropObj = {
          id: `수정건의_${targetSpot.id}번_${Date.now()}`,
          spot_main: targetSpot.spot_main || targetSpot.name,
          spot_sub: targetSpot.spot_sub || '',
          trailhead_name: targetSpot.trailhead_name || '',
          trailhead_addr: targetSpot.trailhead_addr || targetSpot.entryPoint || '',
          elevation: targetSpot.elevation || '',
          distance_km: String(targetSpot.distance || '').replace(/km$/i, ''),
          youtubeUrls: (targetSpot.youtubeUrls || []).join('\n'),
          blogUrl: (targetSpot.blogUrls || [])[0] || '',
          authorSnsUrl: targetSpot.authorSnsUrl || '',
          descView: parsedSummary.view || '',
          descAccess: parsedSummary.access || '',
          descPitch: parsedSummary.pitch || '',
          descTip: parsedSummary.tip || '',
          lat: targetSpot.lat,
          lng: targetSpot.lng
        };

        openUserProposalModal('', 0, 0, '', existingPropObj);

        var titleEl = document.getElementById('modalTitle');
        var noticeEl = document.getElementById('modalNotice');
        var btnEl = document.getElementById('modalSubmitBtn');
        var reasonBox = document.getElementById('modalFieldCorrectionReason');
        var reasonInput = document.getElementById('modalInputCorrectionReason');

        if (reasonBox) reasonBox.style.display = 'flex';
        if (reasonInput) reasonInput.value = '';

        if (titleEl) titleEl.innerHTML = ICONS.EDIT + ` <span>[${escapeHtml(targetSpot.spot_main || targetSpot.name)}] 정보 수정 건의</span>`;
        if (noticeEl) {
          noticeEl.style.display = 'flex';
          noticeEl.innerHTML = ICONS.ALERT_CARD + ` <span>폐쇄, 데크 철거, 들머리 변경 등 <strong>수정 사유</strong>를 적어주시면 신속히 반영됩니다.</span>`;
        }
        if (btnEl) btnEl.innerText = '수정 건의 접수하기';
      };

      function applyCorrectionModalChrome(spotName) {
        var titleEl = document.getElementById('modalTitle');
        var noticeEl = document.getElementById('modalNotice');
        var btnEl = document.getElementById('modalSubmitBtn');
        var reasonBox = document.getElementById('modalFieldCorrectionReason');
        var reasonInput = document.getElementById('modalInputCorrectionReason');
        if (reasonBox) reasonBox.style.display = 'flex';
        if (reasonInput) reasonInput.value = '';
        if (titleEl) titleEl.innerHTML = ICONS.EDIT + ' <span>[' + escapeHtml(spotName || '장소') + '] 정보 수정 건의</span>';
        if (noticeEl) {
          noticeEl.style.display = 'flex';
          noticeEl.innerHTML = ICONS.ALERT_CARD + ' <span>폐쇄, 데크 철거, 들머리 변경 등 <strong>수정 사유</strong>를 적어주시면 신속히 반영됩니다.</span>';
        }
        if (btnEl) btnEl.innerText = '수정 건의 접수하기';
        var overlay = document.getElementById('customModalOverlay');
        if (overlay) overlay.style.setProperty('z-index', '2147483644', 'important');
      }

      window.openSpotCorrectionFromProposal = function(proposal) {
        if (!proposal) return;
        var spotId = typeof window.okbmResolveProposalSpotId === 'function'
          ? window.okbmResolveProposalSpotId(proposal, spots)
          : String(proposal.approved_spot_id || proposal.orig_spot_id || '').trim();
        var targetSpot = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
        if (!targetSpot) {
          var name = String(proposal.spot_main || proposal.name || '').trim();
          var plat = parseFloat(proposal.lat || proposal.campsite_lat);
          var plng = parseFloat(proposal.lng || proposal.campsite_lng);
          targetSpot = (spots || []).find(function(s) {
            if (!s) return false;
            if (name && String(s.spot_main || s.name || '').trim() === name) return true;
            if (isFinite(plat) && isFinite(plng) && plat && plng) {
              return Math.abs(parseFloat(s.lat) - plat) < 0.003 && Math.abs(parseFloat(s.lng) - plng) < 0.003;
            }
            return false;
          }) || null;
        }
        if (targetSpot) {
          window.openSpotCorrectionModal(targetSpot.id);
          applyCorrectionModalChrome(targetSpot.spot_main || targetSpot.name);
          return;
        }

        var parsedSummary = parseStructuredSummary(proposal.desc_summary || proposal.desc || '');
        var fallbackId = String(spotId || proposal.id || Date.now()).trim();
        window.__isSpotCorrectionMode = true;
        window.__correctionTargetSpotId = fallbackId;
        window.__origSpotBeforeCorrection = JSON.parse(JSON.stringify(proposal));
        var existingPropObj = {
          id: '수정건의_' + fallbackId + '번_' + Date.now(),
          spot_main: proposal.spot_main || proposal.name || '',
          spot_sub: proposal.spot_sub || '',
          trailhead_name: proposal.trailhead_name || '',
          trailhead_addr: proposal.trailhead_addr || proposal.entry || '',
          elevation: proposal.elevation || '',
          distance_km: String(proposal.distance_km || proposal.distance || '').replace(/km$/i, ''),
          youtubeUrls: Array.isArray(proposal.youtubeUrls) ? proposal.youtubeUrls.join('\n') : (proposal.youtubeurls || proposal.youtubeUrls || ''),
          blogUrl: proposal.blogUrl || proposal.blogurl || '',
          authorSnsUrl: proposal.authorSnsUrl || proposal.authorsnsurl || '',
          descView: proposal.descView || parsedSummary.view || '',
          descAccess: proposal.descAccess || parsedSummary.access || '',
          descPitch: proposal.descPitch || parsedSummary.pitch || '',
          descTip: proposal.descTip || parsedSummary.tip || '',
          lat: proposal.lat || proposal.campsite_lat,
          lng: proposal.lng || proposal.campsite_lng
        };
        openUserProposalModal('', 0, 0, '', existingPropObj);
        applyCorrectionModalChrome(existingPropObj.spot_main);
      };

      // 🛠️ 내 제보 목록에서 수정 버튼 클릭 시 바로 호출되는 전역 핸들러
      window.openEditMyProposal = function(proposalId) {
        var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
          ? window.RomanticVault.read('okbm_my_proposals', [])
          : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
        if (!Array.isArray(myProps)) myProps = [];
        var target = myProps.find(function(p) { return String(p.id) === String(proposalId); });
        if (!target) {
          showToast('해당 제보 내역을 찾을 수 없습니다.');
          return;
        }
        if (typeof window.okbmProposalStatusKind === 'function' && window.okbmProposalStatusKind(target) === 'accepted') {
          if (typeof window.openSpotCorrectionFromProposal === 'function') {
            window.openSpotCorrectionFromProposal(target);
          } else {
            showToast('채택된 제보는 수정문의로 신청해주세요.');
          }
          return;
        }
        openUserProposalModal('', 0, 0, '', target);
      };

      // URL 파라미터로 수정 진입 시 자동 오픈
      (function checkProposalEditUrl() {
        var params = new URLSearchParams(window.location.search);
        var editPropId = params.get('edit_proposal');
        var correctionSpotId = params.get('correction_spot');
        var correctionPropId = params.get('correction_proposal');
        var proposeSpot = params.get('propose_spot');
        var fromPastTrip = params.get('from_past_trip') === '1';
        var openPendingCorrection = function() {
          var pending = null;
          try { pending = JSON.parse(sessionStorage.getItem('okbm_pending_correction_proposal') || 'null'); } catch (e) { pending = null; }
          if (correctionPropId && !pending) {
            var myProps = (window.RomanticVault && window.RomanticVault.read)
              ? window.RomanticVault.read('okbm_my_proposals', [])
              : safeGetJSON('okbm_my_proposals', []);
            pending = (Array.isArray(myProps) ? myProps : []).find(function(p) { return p && String(p.id) === String(correctionPropId); }) || null;
          }
          if (pending && typeof window.openSpotCorrectionFromProposal === 'function') {
            window.openSpotCorrectionFromProposal(pending);
            try { sessionStorage.removeItem('okbm_pending_correction_proposal'); } catch (e) {}
            return;
          }
          if (correctionSpotId && typeof window.openSpotCorrectionModal === 'function') {
            window.openSpotCorrectionModal(correctionSpotId);
          }
        };
        if (proposeSpot) {
          if (fromPastTrip) window.__returnToPastTripAfterProposal = true;
          setTimeout(function() {
            if (typeof window.openUserProposalModal === 'function') {
              window.openUserProposalModal(proposeSpot, 0, 0, '');
            }
            try {
              params.delete('propose_spot');
              params.delete('from_past_trip');
              var q = params.toString();
              history.replaceState({}, '', location.pathname + (q ? ('?' + q) : '') + location.hash);
            } catch (e) {}
          }, 450);
        } else if (correctionSpotId || correctionPropId) {
          setTimeout(openPendingCorrection, 500);
        } else if (editPropId) {
          setTimeout(function() { window.openEditMyProposal(editPropId); }, 400);
        }
      })();

      function getSupabaseRestConfig() {
        return {
          url: window.SUPABASE_URL || 'https://qnumfecythtqtrxeasys.supabase.co',
          key: window.SUPABASE_ANON_KEY || ''
        };
      }

      function parseNumericField(value) {
        var num = parseFloat(String(value || '').replace(/[^\d.-]/g, ''));
        return isNaN(num) ? 0 : num;
      }

      function buildSpotDbPayload(spot) {
        var media = [];
        (spot.youtubeUrls || []).forEach(function(u) { if (u && String(u).trim()) media.push(String(u).trim()); });
        (spot.blogUrls || []).forEach(function(u) { if (u && String(u).trim()) media.push(String(u).trim()); });
        (spot.instaUrls || []).forEach(function(u) { if (u && String(u).trim()) media.push(String(u).trim()); });
        if (spot.authorSnsUrl) media.push(String(spot.authorSnsUrl).trim());
        var payload = {
          id: String(spot.id).trim(),
          region: spot.region || '',
          cityName: spot.cityName || '',
          spot_main: spot.spot_main || spot.name || '',
          spot_sub: spot.spot_sub || '',
          fullName: spot.fullName || '',
          elevation: parseNumericField(spot.elevation),
          campsite_lat: parseFloat(spot.lat) || 0,
          campsite_lng: parseFloat(spot.lng) || 0,
          terrain: Array.isArray(spot.terrain) ? spot.terrain.join(', ') : String(spot.terrain || ''),
          trailhead_name: spot.trailhead_name || '',
          trailhead_addr: spot.trailhead_addr || spot.entryPoint || '',
          difficulty: String(spot.difficulty || '3'),
          // 거리를 비워 낸 제보는 0이 아니라 빈 값으로 둔다(0km로 저장되면 '아주 가까운 박지'로 읽혀 백보킹 등에 섞였다)
          distance_km: (function(raw) {
            var s = String(raw == null ? '' : raw).replace(/[^\d.-]/g, '');
            var num = parseFloat(s);
            return s && !isNaN(num) ? num : null;
          })(spot.distance || spot.distance_km),
          desc_summary: spot.desc_summary || spot.desc || '',
          mediaUrls: media.join('\n'),
          course_type: spot.courseType || '일반',
          author_sns_url: spot.authorSnsUrl || ''
        };
        var author = String(spot.author || spot.nickname || spot.authorNick || '').trim();
        var uid = String(spot.user_id || spot.userId || '').trim();
        if (author) payload.author = author;
        if (uid) payload.user_id = uid;
        return payload;
      }

      async function persistSpotToSupabase(spot, isInsert) {
        var cfg = getSupabaseRestConfig();
        if (!cfg.url || !cfg.key || !spot) return false;
        var writeHeaders = (typeof window.okbmWriteHeaders === 'function')
          ? window.okbmWriteHeaders({ Prefer: 'return=minimal' })
          : null;
        if (!writeHeaders) return false;
        var payload = buildSpotDbPayload(spot);
        if (isInsert) {
          try {
            var insertRes = await fetch(cfg.url + '/rest/v1/spots', {
              method: 'POST',
              headers: writeHeaders,
              body: JSON.stringify(payload)
            });
            return insertRes.ok;
          } catch (e) {
            console.warn('[map.html:persistSpotToSupabase insert]', e);
            return false;
          }
        }

        var isAdmin = typeof checkAdminAuthorization === 'function' && checkAdminAuthorization();
        if (isAdmin) {
          try {
            var patchRes = await fetch(cfg.url + '/rest/v1/spots?id=eq.' + encodeURIComponent(payload.id), {
              method: 'PATCH',
              headers: writeHeaders,
              body: JSON.stringify(payload)
            });
            return patchRes.ok;
          } catch (e) {
            console.warn('[map.html:persistSpotToSupabase patch]', e);
            return false;
          }
        }

        var mediaLines = String(payload.mediaUrls || '').split(/[\r\n,]+/).map(function(u) { return u.trim(); }).filter(Boolean);
        if (mediaLines.length && typeof window.okbmRpcMergeSpotMediaUrls === 'function') {
          var rpc = await window.okbmRpcMergeSpotMediaUrls(payload.id, mediaLines);
          return !!(rpc && rpc.ok);
        }
        return false;
      }

      function persistSpotsCache() {
        try {
          if (typeof window.persistLightweightSpotsCache === 'function') {
            window.persistLightweightSpotsCache(spots);
          }
        } catch (e) { console.warn('[map.html:persistSpotsCache]', e); }
        window.__pastTripSpotsSearchCache = null;
      }

      function applySpotPositionLocally(spot, lat, lng) {
        if (!spot) return;
        spot.lat = parseFloat(lat);
        spot.lng = parseFloat(lng);
        spot._renderLatLng = null;
        spot.renderLat = spot.lat;
        spot.renderLng = spot.lng;
        // 지도 준비 전이면 좌표만 바꿔 두고, 마커는 지도가 뜰 때 renderSpots가 새 좌표로 만든다
        if (!isKakaoMapReady()) return;
        var sId = String(spot.id).trim();
        var newLatLng = new kakao.maps.LatLng(spot.lat, spot.lng);
        var curMarker = spotNativeMarkerMap.get(sId);
        if (curMarker) {
          curMarker.setPosition(newLatLng);
          curMarker.spotData = spot;
        }
        var curLabel = spotLabelOverlayMap.get(sId);
        if (curLabel) curLabel.setPosition(newLatLng);
      }

      function bindAdminMarkerDrag(marker, spotId) {
        if (!marker || marker.__okbmDragBound) return;
        marker.__okbmDragBound = true;
        kakao.maps.event.addListener(marker, 'dragend', function() {
          if (!isAdminMode || !checkAdminAuthorization()) return;
          var movingId = String(window.__adminPinMoveSpotId || '').trim();
          if (!movingId || String(spotId).trim() !== movingId) return;
          var pos = marker.getPosition();
          if (!pos) return;
          var lat = parseFloat(pos.getLat().toFixed(6));
          var lng = parseFloat(pos.getLng().toFixed(6));
          var target = (spots || []).find(function(s) { return String(s.id).trim() === String(spotId).trim(); });
          if (!target) return;
          askConfirmAdminPinMove(target, lat, lng, pos);
        });
      }

      function clearTempPickedMarker() {
        if (tempPickedMarker) {
          tempPickedMarker.setMap(null);
          tempPickedMarker = null;
        }
      }

      function createPickedMarkerImage() {
        if (window.__okbmPickedMarkerImage) return window.__okbmPickedMarkerImage;
        var width = 36, height = 46;
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="' + width + '" height="' + height + '">' +
          '<ellipse cx="14" cy="34" rx="7" ry="2" fill="rgba(0,0,0,0.45)"/>' +
          '<path fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round" d="M14 1 C6.82 1 1 6.82 1 14 C1 19.8 4.8 24.7 10 26.3 L14 32.5 L18 26.3 C23.2 24.7 27 19.8 27 14 C27 6.82 21.18 1 14 1 Z"/>' +
          '<circle cx="14" cy="14" r="4.2" fill="#ffffff"/>' +
          '</svg>';
        window.__okbmPickedMarkerImage = new kakao.maps.MarkerImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
          new kakao.maps.Size(width, height),
          { offset: new kakao.maps.Point(width / 2, height) }
        );
        return window.__okbmPickedMarkerImage;
      }

      function showTempPickedMarker(latLng) {
        if (!map || !latLng) return;
        clearTempPickedMarker();
        tempPickedMarker = new kakao.maps.Marker({
          position: latLng,
          map: map,
          image: createPickedMarkerImage(),
          zIndex: 20000,
          clickable: false
        });
      }

      function setPinPickerBanner(mode, name) {
        var banner = document.getElementById('pinPickerBanner');
        var text = document.getElementById('pinPickerBannerText');
        var okBtn = document.getElementById('btnConfirmPinPick');
        if (!banner) return;
        banner.style.display = 'flex';
        if (mode === 'confirm') {
          if (text) text.textContent = '[' + (name || '장소') + '] 이곳으로 이동시키겠습니까?';
          if (okBtn) okBtn.style.display = 'inline-flex';
        } else {
          if (text) text.textContent = '지도를 클릭하여 장소 위치를 콕 찍어주세요!';
          if (okBtn) okBtn.style.display = 'none';
        }
      }

      function hidePinPickerBanner() {
        var banner = document.getElementById('pinPickerBanner');
        var okBtn = document.getElementById('btnConfirmPinPick');
        if (banner) banner.style.display = 'none';
        if (okBtn) okBtn.style.display = 'none';
      }

      function askConfirmAdminPinMove(target, lat, lng, previewLatLng) {
        if (!target) return;
        var latLng = previewLatLng || new kakao.maps.LatLng(lat, lng);
        showTempPickedMarker(latLng);
        window.__adminPinMovePending = { id: String(target.id).trim(), lat: lat, lng: lng };
        window.__adminPinMoveConfirming = true;
        isPickingLocationMode = true;
        setPinPickerBanner('confirm', target.spot_main || target.name || '장소');
        applyAdminMarkerDragState();
      }

      function confirmAdminPinMoveFromBanner() {
        var pending = window.__adminPinMovePending;
        if (!pending) return;
        var target = (spots || []).find(function(s) { return String(s.id).trim() === String(pending.id).trim(); });
        window.__adminPinMoveConfirming = false;
        window.__adminPinMovePending = null;
        if (!target) {
          cancelPinPicking();
          return;
        }
        commitAdminPinMove(target, pending.lat, pending.lng);
      }
      window.confirmAdminPinMoveFromBanner = confirmAdminPinMoveFromBanner;

      async function commitAdminPinMove(target, lat, lng) {
        if (!target) return;
        applySpotPositionLocally(target, lat, lng);
        persistSpotsCache();
        // 목록 카드에서 옮기면 상세(전체 소개·들머리 주소·영상)가 아직 없다. 목록에는 짧은 소개(80자)만 있어
        // 그대로 저장하면 원래 글·주소·영상이 지워지니 먼저 상세를 받고, 못 받으면 저장하지 않는다.
        await ensureSpotDetailLoaded(target);
        if (target.__detailLoaded && target.__detailTier !== 'guest' && !target.__detailLimited) {
          await persistSpotToSupabase(target, false);
        } else {
          var origPos = window.__adminPinMoveOrig;
          if (origPos && origPos.lat && origPos.lng) {
            applySpotPositionLocally(target, origPos.lat, origPos.lng);
            persistSpotsCache();
          }
          showToast('상세 정보를 받지 못해 핀 위치를 저장하지 않았어요. 잠시 뒤 다시 해 주세요.');
        }
        clearTempPickedMarker();
        window.__adminPinMoveSpotId = null;
        window.__adminPinMoveOrig = null;
        window.__adminPinMovePending = null;
        window.__adminPinMoveConfirming = false;
        isPickingLocationMode = false;
        hidePinPickerBanner();
        applyAdminMarkerDragState();
        currentActiveSpot = target;
        if (isKakaoMapReady()) renderSpots();
        focusSpotOnMap(target);
        refreshCurrentSpotPopup();
      }

      function allocateNextSpotId() {
        var maxId = 0;
        (spots || []).forEach(function(s) {
          var n = parseInt(s.id, 10);
          if (!isNaN(n) && n > maxId) maxId = n;
        });
        return String(maxId + 1);
      }

      function normalizeReporterNick(nick) {
        var name = String(nick || '').trim();
        return name || '낭만백패커';
      }

      function resolveCurrentUserReporter() {
        var userId = (typeof window.okbmGetCurrentUserId === 'function')
          ? String(window.okbmGetCurrentUserId() || '').trim()
          : '';
        var nick = '';
        var curProfile = (typeof safeGetJSON === 'function') ? safeGetJSON('user_profile', null) : null;
        if (curProfile && curProfile.nickname) nick = String(curProfile.nickname).trim();
        if (!nick) nick = String(localStorage.getItem('okbm_user_nick') || '').trim();
        if (!nick && userId) nick = String(localStorage.getItem('okbm_custom_nickname_' + userId) || '').trim();
        return { userId: userId, nickname: normalizeReporterNick(nick) };
      }

      function resolveInboxReporter(item) {
        if (!item) return { userId: '', nickname: '' };
        var userId = String(item.user_id || item.userId || '').trim();
        var nick = String(item.author || item.nickname || item.authorNick || item.reporter || '').trim();
        return { userId: userId, nickname: normalizeReporterNick(nick) };
      }

      async function lookupUserNickname(userId) {
        var id = String(userId || '').trim();
        if (!id) return '';
        try {
          if (typeof window.okbmFetchPublicProfile === 'function') {
            var fetched = await window.okbmFetchPublicProfile(id);
            return normalizeReporterNick(fetched && fetched.nickname);
          }
          var cfg = getSupabaseRestConfig();
          if (!cfg.url || !cfg.key) return '';
          var res = await (typeof window.okbmPublicFetch === 'function'
            ? window.okbmPublicFetch(cfg.url + '/rest/v1/rpc/get_public_profile', {
                method: 'POST',
                body: JSON.stringify({ p_id: id })
              })
            : fetch(cfg.url + '/rest/v1/rpc/get_public_profile', {
            method: 'POST',
            headers: {
              'apikey': cfg.key,
              'Authorization': 'Bearer ' + cfg.key,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ p_id: id })
          }));
          if (!res.ok) return '';
          var row = await res.json();
          return normalizeReporterNick(row && row.nickname);
        } catch (e) {
          return '';
        }
      }

      function resolveInboxCoords(item) {
        if (!item) return null;
        var latRaw = (item.lat != null && item.lat !== '') ? item.lat : item.campsite_lat;
        var lngRaw = (item.lng != null && item.lng !== '') ? item.lng : item.campsite_lng;
        var lat = parseFloat(latRaw);
        var lng = parseFloat(lngRaw);
        if (!isFinite(lat) || !isFinite(lng) || !lat || !lng) return null;
        return { lat: lat, lng: lng };
      }

      function revealMapUnderInbox() {
        var inbox = document.getElementById('adminSpotInboxModal');
        if (inbox) inbox.remove();
        var settings = document.getElementById('userAccountSettingsModal');
        if (settings) settings.style.display = 'none';
        if (typeof closeUserProfileModal === 'function') closeUserProfileModal();
        if (typeof window.navigateToDockTab === 'function') window.navigateToDockTab('map');
        else if (typeof setMobileSidebarCollapsed === 'function') setMobileSidebarCollapsed(true);
      }

      function resolveCorrectionOrigSpotId(item) {
        if (!item) return '';
        if (item.orig_spot_id) return String(item.orig_spot_id).trim();
        if (item.origSpotId) return String(item.origSpotId).trim();
        var idMatch = String(item.id || '').match(/수정건의_(.+?)번_/);
        if (idMatch) return idMatch[1];
        var descMatch = String(item.desc_summary || '').match(/\[🚨\s*(.+?)번 장소 수정요청\]/);
        if (descMatch) return descMatch[1];
        return '';
      }

      function fillModalFromSpotLike(source) {
        clearModalInputs();
        var parsed = parseStructuredSummary(source.desc_summary || source.desc || '');
        var setV = function(id, val) { var el = document.getElementById(id); if (el) el.value = val == null ? '' : val; };
        setV('modalInputName', source.spot_main || source.name || '');
        setV('modalInputSub', source.spot_sub || '');
        setV('modalInputTrailheadName', source.trailhead_name || '');
        setV('modalInputEntry', source.trailhead_addr || source.entryPoint || source.entry || source.trailhead_name || ((source.spot_main || source.name || '') + ' 들머리'));
        setV('modalInputElevation', source.elevation || '');
        setV('modalInputDistance', String(source.distance_km || source.distance || '').replace(/km$/i, ''));
        var yt = Array.isArray(source.youtubeUrls) ? source.youtubeUrls.join('\n') : (source.youtubeurls || source.youtubeUrls || '');
        setV('modalInputYoutube', yt);
        var blog = Array.isArray(source.blogUrls) ? (source.blogUrls[0] || '') : (source.blogurl || source.blogUrl || '');
        setV('modalInputBlog', blog);
        setV('modalInputAuthorSns', source.authorSnsUrl || source.authorsnsurl || '');
        setV('modalInputInsta', Array.isArray(source.instaUrls) ? source.instaUrls.join('\n') : '');
        setV('modalInputDescView', source.descView || parsed.view || '');
        setV('modalInputDescAccess', source.descAccess || parsed.access || '');
        setV('modalInputDescPitch', source.descPitch || parsed.pitch || '');
        setV('modalInputDescTip', source.descTip || parsed.tip || '');

        var lat = parseFloat(source.lat || source.campsite_lat) || 0;
        var lng = parseFloat(source.lng || source.campsite_lng) || 0;
        modalPendingData.lat = lat;
        modalPendingData.lng = lng;
        var coordsInput = document.getElementById('modalInputCoordsDisplay');
        if (coordsInput) coordsInput.value = (lat && lng) ? (lat + ', ' + lng) : '';

        modalPendingCourseType = String(source.courseType || source.coursetype || source.course_type || '일반').trim() || '일반';

        var terrainText = Array.isArray(source.terrain) ? source.terrain.join(',') : String(source.terrain || '');
        var terrainMap = { chkDeck: '데크', chkRock: '암릉', chkSoil: '노지', chkBeach: '해변', chkIsland: '섬', chkValley: '계곡', chkCave: '동굴' };
        Object.keys(terrainMap).forEach(function(chkId) {
          var chk = document.getElementById(chkId);
          if (chk) chk.checked = terrainText.indexOf(terrainMap[chkId]) !== -1;
        });

        var diffSelect = document.getElementById('modalSelectDiff');
        if (diffSelect) diffSelect.value = String(source.difficulty || '3');

        var reasonBox = document.getElementById('modalFieldCorrectionReason');
        var reasonInput = document.getElementById('modalInputCorrectionReason');
        if (reasonBox) reasonBox.style.display = 'none';
        if (reasonInput) reasonInput.value = source.correctionReason || source.correction_reason || '';
      }

      function showCustomModalOverlay() {
        var overlay = document.getElementById('customModalOverlay');
        if (!overlay) return;
        // 인스타 게시물 링크는 관리자 등록·수정에서만 받는다(제보·수정건의에는 숨김)
        var instaField = document.getElementById('modalFieldInsta');
        if (instaField) instaField.style.display = (modalMode !== 'PROPOSAL' && isAdminMode) ? '' : 'none';
        overlay.style.setProperty('display', 'flex', 'important');
        overlay.style.setProperty('z-index', '999999', 'important');
        overlay.style.setProperty('opacity', '1', 'important');
        overlay.style.setProperty('visibility', 'visible', 'important');
        overlay.style.setProperty('pointer-events', 'auto', 'important');
        var modalBox = overlay.querySelector('.custom-modal');
        if (modalBox) {
          modalBox.scrollTop = 0;
          requestAnimationFrame(function() { modalBox.scrollTop = 0; });
        }
      }

      async function openEditModal(index) {
        if (!checkAdminAuthorization()) {
          showToast('관리자 권한이 확인되지 않았습니다.');
          return;
        }
        var target = spots[index];
        if (!target) {
          showToast('장소 정보를 찾을 수 없습니다.');
          return;
        }
        await ensureSpotDetailLoaded(target);
        applyAdminPermissions(true);
        modalMode = 'EDIT';
        modalEditIndex = index;
        window.__currentEditingProposalId = null;
        window.__isSpotCorrectionMode = false;
        window.__adminApplyingInboxItem = null;
        resetModalPendingMemory();
        fillModalFromSpotLike(target);

        var titleEl = document.getElementById('modalTitle');
        var noticeEl = document.getElementById('modalNotice');
        var btnEl = document.getElementById('modalSubmitBtn');
        if (titleEl) titleEl.innerHTML = ICONS.EDIT + ' <span>[' + escapeHtml(target.spot_main || target.name) + '] 장소 수정 (관리자)</span>';
        renderEditModalCampBanNotice(target);
        if (btnEl) btnEl.innerText = '수정 내용 저장';
        showCustomModalOverlay();
      }
      window.openEditModal = openEditModal;

      // 수정 모달 안내줄에 야영금지 토글을 둔다. 상태가 바뀌면 같은 줄을 다시 그린다.
      function renderEditModalCampBanNotice(target) {
        var noticeEl = document.getElementById('modalNotice');
        if (!noticeEl || !target) return;
        var banned = isCampBanned(target);
        noticeEl.style.display = 'flex';
        noticeEl.innerHTML = ICONS.PIN + ' <span style="flex:1;">핀 위치는 [콕 찍기]로 바꾸거나, 지도에서 마커를 드래그해 바로 저장할 수 있습니다.</span>' +
          '<button type="button" class="btn-edit" style="display:inline-block; flex-shrink:0; background:' + (banned ? '#475569' : '#9f1239') + ';" data-id="' + escapeHtml(String(target.id)) + '" onclick="window.toggleEditModalCampBan(this.dataset.id, event)">' + (banned ? '금지해제' : '🚫야영금지') + '</button>';
      }

      window.toggleEditModalCampBan = async function(spotId, e) {
        await window.toggleSpotCampBanById(spotId, e);
        if (modalMode !== 'EDIT') return;
        var sId = String(spotId || '').trim();
        var spot = (spots || []).find(function(s) { return String(s.id).trim() === sId; });
        if (spot) renderEditModalCampBanNotice(spot);
      };

      function openAddModal(defaultName = "", lat = 0, lng = 0, address = "") {
        if (!checkAdminAuthorization()) {
          showToast('관리자 권한이 확인되지 않았습니다.');
          return;
        }
        applyAdminPermissions(true);
        modalMode = 'ADD'; 
        resetModalPendingMemory();
        modalPendingData = { lat: lat || 0, lng: lng || 0, address: address || '' };
        
        const titleEl = document.getElementById('modalTitle');
        const noticeEl = document.getElementById('modalNotice');
        const btnEl = document.getElementById('modalSubmitBtn');
        
        if (titleEl) titleEl.innerHTML = `${ICONS.PIN} <span>새 장소 정식 등록 (관리자)</span>`;
        if (noticeEl) noticeEl.style.display = 'none';
        if (btnEl) btnEl.innerText = '등록 완료';
        
        clearModalInputs();
        const nameInput = document.getElementById('modalInputName');
        const coordsInput = document.getElementById('modalInputCoordsDisplay');
        const entryInput = document.getElementById('modalInputEntry');
        
        if (nameInput) nameInput.value = defaultName !== "새 장소 위치" ? defaultName : '';
        if (coordsInput) coordsInput.value = (lat && lng) ? `${lat}, ${lng}` : '';
        if (entryInput) entryInput.value = address || '';
        var reasonBox = document.getElementById('modalFieldCorrectionReason');
        if (reasonBox) reasonBox.style.display = 'none';
        window.__adminApplyingInboxItem = null;
        showCustomModalOverlay();
      }
      window.openAddModal = openAddModal;

      function closeCustomModal() {
        const overlay = document.getElementById('customModalOverlay');
        if (overlay) overlay.style.display = 'none';
        resetModalPendingMemory();
        if (tempPickedMarker) { 
          tempPickedMarker.setMap(null); 
          tempPickedMarker = null; 
        }
        if (typeof window.hideLongPressProposalTooltip === 'function') {
          window.hideLongPressProposalTooltip();
        }
        if (window.__returnToPastTripAfterProposal) {
          window.__returnToPastTripAfterProposal = false;
          setTimeout(function() {
            window.location.assign('index.html?reopen_past_trip=1');
          }, 120);
        }
      }
      window.closeCustomModal = closeCustomModal;

      async function saveCustomModal() {
        if (window.__isModalSubmitting) return;

        const name = document.getElementById('modalInputName')?.value.trim();
        const sub = document.getElementById('modalInputSub')?.value.trim();
        const tName = document.getElementById('modalInputTrailheadName')?.value.trim();
        const entry = document.getElementById('modalInputEntry')?.value.trim();
        
        if (!name || !entry) return alert('박지명과 들머리 주소를 입력해주세요.');

        window.__isModalSubmitting = true;
        const submitBtn = document.getElementById('modalSubmitBtn');
        if (submitBtn) {
          submitBtn.disabled = true; 
          submitBtn.innerText = '저장 처리 중...';
        }

        try {
          // 🛡️ 정직한 좌표 결정: 관리자가 콕 찍은 핀 좌표 우선 (엉뚱한 동명 산 자동 덮어쓰기 영구 제거)
          let lat = modalPendingData.lat || (modalMode === 'EDIT' ? spots[modalEditIndex].lat : 0);
          let lng = modalPendingData.lng || (modalMode === 'EDIT' ? spots[modalEditIndex].lng : 0);

          // 핀이 없으면 들머리 주소로만 정밀 확인
          if (!lat || !lng) {
            const coords = await searchCoordsByQuery(entry);
            if (coords) { 
              lat = coords.lat; 
              lng = coords.lng; 
            } else { 
              alert('정확한 장소 위치를 위해 [콕 찍기] 버튼으로 지도에서 위치를 직접 지정해주세요.');
              if (submitBtn) submitBtn.disabled = false;
              return;
            }
          }

          let elevation = document.getElementById('modalInputElevation')?.value.trim();
          if (!elevation && lat && lng) elevation = await getElevation(lat, lng);
          if (elevation && !String(elevation).includes('m') && !isNaN(elevation)) elevation = `${elevation}m`;
          if (!elevation) elevation = '';

          // 📝 4대 설명 독립 입력값을 규격화된 포맷으로 조합
          const descView = document.getElementById('modalInputDescView')?.value.trim();
          const descAccess = document.getElementById('modalInputDescAccess')?.value.trim();
          const descPitch = document.getElementById('modalInputDescPitch')?.value.trim();
          const descTip = document.getElementById('modalInputDescTip')?.value.trim();

          const descLines = [];
          if (descView) descLines.push(`[뷰/특징] ${descView}`);
          if (descAccess) descLines.push(`[접근/코스] ${descAccess}`);
          if (descPitch) descLines.push(`[장소/피칭] ${descPitch}`);
          if (descTip) descLines.push(`[주의/팁] ${descTip}`);
          const desc = descLines.join('\n');

        const rawYt = document.getElementById('modalInputYoutube')?.value.trim();
          const ytList = rawYt ? rawYt.split(/[\n,]+/).map(u => u.trim()).filter(Boolean) : [];
          const blogUrl = document.getElementById('modalInputBlog')?.value.trim();
          const rawInsta = document.getElementById('modalInputInsta')?.value.trim() || '';
          const instaList = rawInsta.split(/[\n,]+/).map(u => u.trim()).filter(u => typeof window.okbmIsInstaPostUrl === 'function' && window.okbmIsInstaPostUrl(u)).slice(0, 10);
          
          // 🌐 @아이디 또는 아이디만 입력해도 인스타그램 전체 풀주소로 자동 변환 완성
          let authorSnsUrl = document.getElementById('modalInputAuthorSns')?.value.trim() || '';
          if (authorSnsUrl) {
            if (!authorSnsUrl.startsWith('http://') && !authorSnsUrl.startsWith('https://')) {
              const cleanSnsId = authorSnsUrl.replace(/^@+/, '').trim();
              if (cleanSnsId) {
                authorSnsUrl = `https://instagram.com/${cleanSnsId}`;
              }
            }
          }
          
          const distance = document.getElementById('modalInputDistance')?.value.trim();
          const difficulty = document.getElementById('modalSelectDiff')?.value || '3';
          const courseType = String(modalPendingCourseType || '일반').trim() || '일반';

          const terrainList = [];
          if (document.getElementById('chkDeck')?.checked) terrainList.push('데크');
          if (document.getElementById('chkRock')?.checked) terrainList.push('암릉');
          if (document.getElementById('chkSoil')?.checked) terrainList.push('노지');
          if (document.getElementById('chkBeach')?.checked) terrainList.push('해변');
          if (document.getElementById('chkIsland')?.checked) terrainList.push('섬');
          if (document.getElementById('chkValley')?.checked) terrainList.push('계곡');
          if (document.getElementById('chkCave')?.checked) terrainList.push('동굴');
          if (terrainList.length === 0) terrainList.push('데크');

         // 🌐 마스터 시트(시트1)와 100% 동일한 권역/시군구 및 풀네임 자동 정밀 추출
          const detected = detectRegionAndCity(lat, lng, name, entry);
          const region = normalizeTo10Regions(detected.region);
          let cityName = detected.cityName || '';
          const cityMatch = entry.match(/([가-힣]+[시군구])/);
          if (cityMatch && cityMatch[1]) cityName = cityMatch[1];
          
          const fullName = cityName ? `[${cityName}] ${name}${sub ? ` (${sub})` : ''}` : (sub ? `${name} (${sub})` : name);
          const autoTrailheadName = tName || `${name} 들머리`;

      if (modalMode === 'PROPOSAL') {
            try {
              var isCorrection = Boolean(window.__isSpotCorrectionMode);
              var origSpotId = window.__correctionTargetSpotId || '';
              var orig = window.__origSpotBeforeCorrection || {};
              
              var propId = window.__currentEditingProposalId || (isCorrection ? `수정건의_${origSpotId}번_${Date.now()}` : `신규제보_${Date.now()}`);
              if (window.__currentEditingProposalId && typeof window.okbmProposalStatusKind === 'function') {
                var existingLocked = ((window.RomanticVault && window.RomanticVault.read) ? window.RomanticVault.read('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', [])).find(function(p) {
                  return p && String(p.id) === String(window.__currentEditingProposalId);
                });
                if (existingLocked && window.okbmProposalStatusKind(existingLocked) === 'accepted') {
                  showToast('채택된 제보는 수정할 수 없습니다. 수정문의로 신청해주세요.');
                  return;
                }
              }
              var finalSpotMain = name;

              // 🔍 수정 사유 및 변경 대조(Diff) 자동 추출
              var diffNotes = [];
              var correctionReason = (document.getElementById('modalInputCorrectionReason')?.value || '').trim();

              if (isCorrection && orig.id) {
                if (orig.spot_main !== name) diffNotes.push(`• 장소명: "${orig.spot_main}" ➔ "${name}"`);
                if ((orig.spot_sub || '') !== sub) diffNotes.push(`• 세부포인트: "${orig.spot_sub || '없음'}" ➔ "${sub || '없음'}"`);
                if ((orig.trailhead_addr || orig.entryPoint || '') !== entry) diffNotes.push(`• 들머리주소: "${orig.trailhead_addr || ''}" ➔ "${entry}"`);
                if (parseFloat(orig.lat) !== parseFloat(lat) || parseFloat(orig.lng) !== parseFloat(lng)) diffNotes.push(`• 핀위치 변경됨`);
              }

              var headerNotice = '';
              if (isCorrection) {
                headerNotice = `[🚨 ${origSpotId}번 장소 수정요청]\n` +
                  (correctionReason ? `📌 핵심사유: ${correctionReason}\n` : '') +
                  (diffNotes.length > 0 ? `📝 변경항목:\n${diffNotes.join('\n')}\n` : '') +
                  `────────────────────\n`;
              }

              var finalDesc = headerNotice + desc;

              var reporter = resolveCurrentUserReporter();
              var curUserId = reporter.userId;
              if (!curUserId) {
                if (typeof window.okbmRequireCurrentUserId === 'function') window.okbmRequireCurrentUserId();
                return;
              }
              if (!isCorrection && authorSnsUrl && typeof window.okbmRememberProfileInstagram === 'function') {
                window.okbmRememberProfileInstagram(authorSnsUrl);
              }

              var propRecord = {
                id: propId,
                type: isCorrection ? 'correction' : 'proposal',
                origSpotId: origSpotId,
                correctionReason: correctionReason,
                region: region,
                cityName: cityName,
                spot_main: finalSpotMain, 
                spot_sub: sub, 
                fullName: fullName,
                elevation: elevation || '', 
                campsite_lat: lat,
                campsite_lng: lng,
                lat: lat, 
                lng: lng, 
                terrain: terrainList.join(', '), 
                trailhead_name: autoTrailheadName, 
                trailhead_addr: entry,
                origSpotId: origSpotId,
                orig_spot_id: origSpotId,
                difficulty: difficulty, 
                distance_km: distance || '', 
                desc_summary: finalDesc,
                descView: descView || '',
                descAccess: descAccess || '',
                descPitch: descPitch || '',
                descTip: descTip || '',
                youtubeUrls: ytList.join('\n'), 
                blogUrls: blogUrl || '', 
                blogUrl: blogUrl || '', 
                authorSnsUrl: authorSnsUrl || '', 
                courseType: courseType,
                date: (typeof getFormattedNow === 'function') ? getFormattedNow() : new Date().toLocaleDateString(),
                status: isCorrection ? '수정건의대기' : '검수대기',
                author: reporter.nickname,
                nickname: reporter.nickname,
                userId: curUserId,
                user_id: curUserId
              };

              if (typeof window.saveProposalToSupabase === 'function') {
                try {
                  await window.saveProposalToSupabase(propRecord, isCorrection);
                } catch (supaErr) { console.warn('[map.html:saveProposalToSupabase]', supaErr); }
              }

              // 💾 마이데이터용 내 제보/건의 목록 보존
              var myProps = (window.RomanticVault && typeof window.RomanticVault.read === 'function')
                ? window.RomanticVault.read('okbm_my_proposals', [])
                : (typeof window.safeGetStorage === 'function' ? window.safeGetStorage('okbm_my_proposals', []) : safeGetJSON('okbm_my_proposals', []));
              if (!Array.isArray(myProps)) myProps = [];

              var existingIdx = myProps.findIndex(function(p) { return p && String(p.id) === String(propId); });
              if (existingIdx !== -1) {
                myProps[existingIdx] = propRecord;
              } else {
                myProps.unshift(propRecord);
              }
              if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
                window.RomanticVault.write('okbm_my_proposals', myProps, true);
              }
              if (typeof window.safeSetStorage === 'function') {
                window.safeSetStorage('okbm_my_proposals', myProps);
              }
              try { localStorage.setItem('okbm_my_proposals', JSON.stringify(myProps)); } catch (e) { console.warn('[map.html:saveCustomModal:setMyProposals]', e); }
              if (window.__reportRenderCache && window.__reportRenderCache['myprops']) {
                delete window.__reportRenderCache['myprops'];
              }
              if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(true);

              window.__currentEditingProposalId = null;
              window.__isSpotCorrectionMode = false;
              window.__correctionTargetSpotId = null;

              triggerHaptic(15);
              alert(isCorrection 
                ? '소중한 정보 수정 건의가 접수되었습니다!\n관리자 검토 후 지도에 신속히 반영하겠습니다. 감사합니다!' 
                : '소중한 장소 제보가 접수되었습니다!\n관리자 검토 전까지 [낭만리포트]에서 언제든 수정할 수 있습니다.');
            } catch (e) { alert('제보 접수 중 통신 오류가 발생했습니다.'); }
          } else if (modalMode === 'ADD' || modalMode === 'EDIT' || modalMode === 'ADMIN_APPLY') {
            if (!checkAdminAuthorization()) {
              showToast('관리자 권한이 확인되지 않았습니다.');
              return;
            }

            var inboxItem = window.__adminApplyingInboxItem || null;
            var isInsert = modalMode === 'ADD';
            var target = (modalMode === 'EDIT' && spots[modalEditIndex]) ? spots[modalEditIndex] : null;

            if (modalMode === 'ADMIN_APPLY' && inboxItem) {
              if (inboxItem.type === 'correction') {
                var origId = resolveCorrectionOrigSpotId(inboxItem);
                target = (spots || []).find(function(s) { return String(s.id).trim() === String(origId).trim(); }) || null;
                isInsert = !target;
              } else {
                isInsert = true;
              }
            }

            if (!target) {
              target = {
                id: allocateNextSpotId(),
                searchCount: 0,
                sheetIndex: 0
              };
              isInsert = true;
            }

            Object.assign(target, {
              name: name,
              spot_main: name,
              spot_sub: sub,
              fullName: fullName,
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              elevation: elevation || target.elevation || '',
              trailhead_name: autoTrailheadName,
              trailhead_addr: entry,
              entryPoint: entry,
              desc_summary: desc,
              desc: desc,
              youtubeUrls: ytList,
              blogUrls: blogUrl ? [blogUrl] : (target.blogUrls || []),
              // 제보 채택(ADMIN_APPLY)은 제보 내용으로 창을 채워 인스타 칸이 비어 있다. 비어 있으면 기존 등록을 지키고 덧붙이지 않는다.
              instaUrls: (modalMode === 'ADMIN_APPLY' && !instaList.length) ? (target.instaUrls || []) : instaList,
              authorSnsUrl: authorSnsUrl,
              distance: distance ? (distance + 'km') : (target.distance || ''),
              difficulty: difficulty,
              courseType: courseType,
              terrain: terrainList,
              region: region,
              cityName: cityName
            });

            if (modalMode === 'ADMIN_APPLY' && inboxItem && inboxItem.type !== 'correction') {
              var reporter = resolveInboxReporter(inboxItem);
              if (reporter.userId && !reporter.nickname) {
                reporter.nickname = await lookupUserNickname(reporter.userId);
              }
              if (reporter.nickname) {
                target.author = reporter.nickname;
                target.nickname = reporter.nickname;
                target.authorNick = reporter.nickname;
              }
              if (reporter.userId) {
                target.user_id = reporter.userId;
                target.userId = reporter.userId;
              }
            }

            if (isInsert && spots.indexOf(target) === -1) {
              spots.unshift(target);
            }

            persistSpotsCache();
            applySpotPositionLocally(target, target.lat, target.lng);
            updateNewSpotFlags(spots);
            renderSpots(true);
            currentActiveSpot = target;
            focusSpotOnMap(target);
            refreshCurrentSpotPopup();
            smoothCenterMapOnSpot(target.lat, target.lng);

            var saved = await persistSpotToSupabase(target, isInsert);
            if (saved && typeof window.flushPendingSpotMediaForSpot === 'function') {
              try { await window.flushPendingSpotMediaForSpot(target); } catch (flushErr) { console.warn('[map.html:flushPendingSpotMediaForSpot]', flushErr); }
            }
            if (inboxItem && typeof window.updateAdminSpotInboxStatus === 'function') {
              var newStatus = saved ? '반영완료' : '반영실패';
              await window.updateAdminSpotInboxStatus(inboxItem.id, inboxItem.type === 'correction', newStatus, saved ? { approved_spot_id: String(target.id) } : null);
              if (saved && typeof window.notifyProposalDecision === 'function') {
                await window.notifyProposalDecision(inboxItem, newStatus, String(target.id));
              }
            }
            window.__adminApplyingInboxItem = null;
            triggerHaptic(15);
          }
        } finally {
          window.__isModalSubmitting = false;
          if (submitBtn) {
            submitBtn.disabled = false; 
            submitBtn.innerText = modalMode === 'PROPOSAL' ? '제보 접수하기' : '저장 완료';
          }
          closeCustomModal();
        }
      }

      function revealMapForPinPick() {
        closeMobileBottomSheet();
        closePcSlidingDrawer();
        var modalOverlay = document.getElementById('customModalOverlay');
        if (modalOverlay) modalOverlay.style.display = 'none';
        setMobileSidebarCollapsed(true);
      }

      function startPinPicking() {
        isPickingLocationMode = true;
        revealMapForPinPick();
        setPinPickerBanner('pick');
        applyAdminMarkerDragState();
      }

      function startAdminPinMove(spotId, e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (!checkAdminAuthorization()) return;
        applyAdminPermissions(true);
        var sId = String(spotId || '').trim();
        var target = (spots || []).find(function(s) { return String(s.id).trim() === sId; });
        if (!target) return;
        window.__adminPinMoveSpotId = sId;
        window.__adminPinMoveOrig = {
          lat: parseFloat(target.lat) || 0,
          lng: parseFloat(target.lng) || 0
        };
        modalMode = 'EDIT';
        modalEditIndex = spots.findIndex(function(s) { return String(s.id).trim() === sId; });
        modalPendingData.lat = parseFloat(target.lat) || 0;
        modalPendingData.lng = parseFloat(target.lng) || 0;
        startPinPicking();
        applyAdminMarkerDragState();
        if (map && target.lat && target.lng) {
          map.setLevel(Math.min(map.getLevel(), 4));
          smoothCenterMapOnSpot(target.lat, target.lng);
        }
      }
      window.startAdminPinMove = startAdminPinMove;

      function cancelPinPicking() {
        isPickingLocationMode = false;
        window.__adminPinMoveConfirming = false;
        window.__adminPinMovePending = null;
        hidePinPickerBanner();
        clearTempPickedMarker();
        if (window.__adminPinMoveSpotId) {
          var origId = String(window.__adminPinMoveSpotId).trim();
          var orig = window.__adminPinMoveOrig;
          var origTarget = (spots || []).find(function(s) { return String(s.id).trim() === origId; });
          if (origTarget && orig && orig.lat && orig.lng) {
            applySpotPositionLocally(origTarget, orig.lat, orig.lng);
          }
          window.__adminPinMoveSpotId = null;
          window.__adminPinMoveOrig = null;
          applyAdminMarkerDragState();
          return;
        }
        applyAdminMarkerDragState();
        var modalOverlay = document.getElementById('customModalOverlay');
        if (modalOverlay) modalOverlay.style.display = 'flex';
      }
      window.cancelPinPicking = cancelPinPicking;

      let isMarkerClickProcessing = false;
      var longPressProposalOverlay = null;

      window.hideLongPressProposalTooltip = function() {
        if (longPressProposalOverlay) {
          longPressProposalOverlay.setMap(null);
          longPressProposalOverlay = null;
        }
      };

      function initMapLongPressProposalEngine(container) {
        if (!container) return;
        var pressTimer = null;
        var startCoords = { x: 0, y: 0 };
        var isMoved = false;

        function startTimer(clientX, clientY) {
          isMoved = false;
          startCoords = { x: clientX, y: clientY };
          clearTimeout(pressTimer);
          pressTimer = setTimeout(function() {
            if (!isMoved && map) {
              triggerHaptic(25);
              var rect = container.getBoundingClientRect();
              var point = new kakao.maps.Point(clientX - rect.left, clientY - rect.top);
              var proj = map.getProjection();
              if (proj) {
                var latlng = proj.coordsFromContainerPoint(point);
                // 클러스터 위 길게 누르기는 제보 말풍선을 띄우지 않는다 (클러스터가 clickable:false라 여기까지 온다)
                if (findTappedCluster(latlng)) return;
                window.showLongPressProposalTooltip(latlng);
              }
            }
          }, 500);
        }

        function cancelTimer() {
          clearTimeout(pressTimer);
        }

        container.addEventListener('touchstart', function(e) {
          if (e.touches.length === 1) {
            startTimer(e.touches[0].clientX, e.touches[0].clientY);
          }
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
          if (e.touches.length === 1) {
            var dx = Math.abs(e.touches[0].clientX - startCoords.x);
            var dy = Math.abs(e.touches[0].clientY - startCoords.y);
            if (dx > 8 || dy > 8) {
              isMoved = true;
              cancelTimer();
            }
          }
        }, { passive: true });

        container.addEventListener('touchend', cancelTimer, { passive: true });
        container.addEventListener('touchcancel', cancelTimer, { passive: true });

        container.addEventListener('mousedown', function(e) {
          if (e.button === 0) {
            startTimer(e.clientX, e.clientY);
          }
        });

        container.addEventListener('mousemove', function(e) {
          var dx = Math.abs(e.clientX - startCoords.x);
          var dy = Math.abs(e.clientY - startCoords.y);
          if (dx > 8 || dy > 8) {
            isMoved = true;
            cancelTimer();
          }
        });

        container.addEventListener('mouseup', cancelTimer);
        container.addEventListener('mouseleave', cancelTimer);
      }

      window.showLongPressProposalTooltip = function(latlng) {
        window.hideLongPressProposalTooltip();
        if (!map || !latlng) return;

        var lat = parseFloat(latlng.getLat().toFixed(6));
        var lng = parseFloat(latlng.getLng().toFixed(6));

        var el = document.createElement('div');
        el.style.cssText = 'position:relative; display:flex; flex-direction:column; align-items:center; transform:translateY(-100%); margin-top:-14px; pointer-events:auto !important; z-index:9000; animation:pageFadeIn 0.15s ease-out forwards;';

        var stopAll = function(e) {
          if (e) {
            e.stopPropagation();
            if (e.cancelable && e.type !== 'touchstart' && e.type !== 'touchend') {
              e.preventDefault();
            }
          }
        };

        el.addEventListener('touchstart', stopAll, { passive: false });
        el.addEventListener('touchend', stopAll, { passive: false });
        el.addEventListener('mousedown', stopAll);
        el.addEventListener('click', stopAll);

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-lat', lat);
        btn.setAttribute('data-lng', lng);
        btn.style.cssText = 'background:#0c1017; border:1px solid rgba(255,255,255,0.18); border-radius:20px; padding:7px 14px; color:#ffffff; font-size:0.76rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 8px 20px rgba(0,0,0,0.55); white-space:nowrap; outline:none; -webkit-tap-highlight-color:transparent;';
        var adminPick = isAdminMode && checkAdminAuthorization();
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px; height:13px; flex-shrink:0;"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span>${adminPick ? '장소 정식 등록' : '장소 제보하기'}</span>`;

        var handleTrigger = function(e) {
          if (e) {
            e.stopPropagation();
            e.preventDefault();
          }
          var tLat = parseFloat(btn.getAttribute('data-lat'));
          var tLng = parseFloat(btn.getAttribute('data-lng'));
          window.hideLongPressProposalTooltip();
          if (isAdminMode && checkAdminAuthorization()) {
            openAddModal('', tLat, tLng, '');
          } else {
            openUserProposalModal('', tLat, tLng, '');
          }
        };

        btn.addEventListener('touchend', handleTrigger, { passive: false });
        btn.addEventListener('click', handleTrigger);

        var arrow = document.createElement('div');
        arrow.style.cssText = 'width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid rgba(255,255,255,0.18); margin-top:-0.5px;';

        el.appendChild(btn);
        el.appendChild(arrow);

        longPressProposalOverlay = new kakao.maps.CustomOverlay({
          position: latlng,
          content: el,
          yAnchor: 1.0,
          zIndex: 9000,
          clickable: true
        });

        longPressProposalOverlay.setMap(map);
      };

      // 누른 자리에 클러스터 원이 있으면 그 클러스터 (클러스터가 clickable:false라 탭도 지도 click으로 온다)
      function findTappedCluster(latLng) {
        if (!map || !latLng || !globalClusterer || !visibleClusters.length) return null;
        if (map.getLevel() < globalClusterer.getMinLevel()) return null;
        const proj = map.getProjection();
        const p = proj && proj.containerPointFromCoords(latLng);
        if (!p) return null;
        let best = null, bestD = Infinity;
        for (let i = 0; i < visibleClusters.length; i++) {
          const c = visibleClusters[i];
          const ov = c && typeof c.getClusterMarker === 'function' ? c.getClusterMarker() : null;
          const el = ov && typeof ov.getContent === 'function' ? ov.getContent() : null;
          if (!ov || !ov.getMap() || !el || !el.offsetWidth) continue; // 지워졌거나 숨긴 것
          const cp = proj.containerPointFromCoords(c.getCenter());
          const d = Math.hypot(cp.x - p.x, cp.y - p.y);
          if (d <= el.offsetWidth / 2 + 4 && d < bestD) { best = c; bestD = d; }
        }
        return best;
      }

      function handleMapClick(mouseEvent) {
        window.hideLongPressProposalTooltip();
        const pcDrop = document.getElementById('pcSearchDropdown');
        if (pcDrop) pcDrop.style.display = 'none';

        const tappedCluster = mouseEvent && findTappedCluster(mouseEvent.latLng);
        if (tappedCluster) {
          map.setLevel(Math.max(1, map.getLevel() - 1), { anchor: tappedCluster.getCenter(), animate: { duration: 300 } });
          return;
        }

        if (isMarkerClickProcessing && !isPickingLocationMode) {
          return;
        }

       if (!mouseEvent.latLng) return;
        if (isPickingLocationMode) {
          const lat = parseFloat(mouseEvent.latLng.getLat().toFixed(6));
          const lng = parseFloat(mouseEvent.latLng.getLng().toFixed(6));
          modalPendingData.lat = lat; 
          modalPendingData.lng = lng;

          var pinSpotId = window.__adminPinMoveSpotId;
          if (pinSpotId) {
            var pinTarget = (spots || []).find(function(s) { return String(s.id).trim() === String(pinSpotId).trim(); });
            if (!pinTarget) {
              cancelPinPicking();
              return;
            }
            askConfirmAdminPinMove(pinTarget, lat, lng, mouseEvent.latLng);
            return;
          }

          isPickingLocationMode = false;
          hidePinPickerBanner();
          applyAdminMarkerDragState();
          showTempPickedMarker(mouseEvent.latLng);
          
          // 🎯 한글 사족 없는 순수 숫자 좌표만 표시
          const coordsDisplay = document.getElementById('modalInputCoordsDisplay');
          if (coordsDisplay) coordsDisplay.value = `${lat}, ${lng}`;

          const overlay = document.getElementById('customModalOverlay');
          if (overlay) overlay.style.display = 'flex';

          getElevation(lat, lng).then(elev => {
            const elevInput = document.getElementById('modalInputElevation');
            if (elevInput && !elevInput.value && elev) elevInput.value = elev;
          });
          return;
        }
        closeAllPopups();
      }

      

      function editSpotById(e, id) {
        if (e) e.stopPropagation();
        const idx = spots.findIndex(s => String(s.id).trim() === String(id).trim());
        if (idx !== -1) openEditModal(idx);
      }

      function deleteSpotById(e, id) {
        if (e) e.stopPropagation();
        const idx = spots.findIndex(s => String(s.id).trim() === String(id).trim());
        if (idx !== -1) deleteSpot(e, idx);
      }

      async function deleteSpot(e, index) {
        if (e) e.stopPropagation();
        if (!checkAdminAuthorization()) {
          showToast('관리자 권한이 확인되지 않았습니다.');
          return;
        }
        const targetSpot = spots[index];
        if (!targetSpot) return;
        if (!confirm(`'${targetSpot.name}' 박지를 정말 삭제하시겠습니까?`)) return;
        
        const deletedId = targetSpot.id;
        const deletedName = targetSpot.name;
        const sId = String(deletedId).trim();

        // [헌법 4] 서버 삭제가 확인된 뒤에만 지도·캐시에서 지운다.
        const spotDel = (typeof window.okbmDeleteRowsConfirmed === 'function')
          ? await window.okbmDeleteRowsConfirmed('spots', sId)
          : { ok: false, error: 'no_helper' };
        if (!spotDel.ok) {
          if (spotDel.error !== 'login_required') showToast('박지 삭제에 실패했습니다. 다시 시도해주세요.');
          return;
        }
        // 대기 중 목록이 바뀌었을 수 있어 id로 위치를 다시 찾는다.
        index = spots.findIndex(s => String(s.id).trim() === sId);
        
        const mk = spotNativeMarkerMap.get(sId);
        if (mk && mk.setMap) { 
          mk.setMap(null); 
          spotNativeMarkerMap.delete(sId); 
        }
        const lbl = spotLabelOverlayMap.get(sId);
        if (lbl && lbl.setMap) { 
          lbl.setMap(null); 
          spotLabelOverlayMap.delete(sId); 
        }
        
        if (index !== -1) spots.splice(index, 1);
        userBookmarks.delete(sId); 
        userVisited.delete(sId); 
        delete userMemos[sId];
        
        persistSpotsCache();
        // RomanticVault로 써야 메모리 값도 같이 바뀌고 서버에 올릴 항목으로 표시된다.
        if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
          window.RomanticVault.write('okbm_bookmarks', [...userBookmarks], true);
          window.RomanticVault.write('okbm_visited', [...userVisited], true);
          window.RomanticVault.write('okbm_memos', userMemos, true);
        } else {
          localStorage.setItem('okbm_bookmarks', JSON.stringify([...userBookmarks]));
          localStorage.setItem('okbm_visited', JSON.stringify([...userVisited]));
          localStorage.setItem('okbm_memos', JSON.stringify(userMemos));
        }
        
        closeAllPopups(); 
        renderSubChips(); 
        updateNewSpotFlags(spots); 
        renderSpots(true);
      }

      function normalizeInboxItem(row, isCorrection) {
        if (!row) return null;
        var clone = Object.assign({}, row);
        clone.type = isCorrection ? 'correction' : 'proposal';
        clone.isCorrection = isCorrection;
        clone.fullName = row.fullname || row.fullName || '';
        clone.youtubeUrls = row.youtubeurls || row.youtubeUrls || '';
        clone.blogUrl = row.blogurl || row.blogUrl || '';
        clone.authorSnsUrl = row.authorsnsurl || row.authorSnsUrl || '';
        clone.courseType = row.coursetype || row.courseType || '일반';
        clone.origSpotId = row.orig_spot_id || row.origSpotId || resolveCorrectionOrigSpotId(row);
        clone.correctionReason = row.correction_reason || row.correctionReason || '';
        clone.author = row.author || row.nickname || '';
        clone.nickname = clone.author;
        clone.userId = row.user_id || row.userId || '';
        clone.user_id = clone.userId;
        var coords = resolveInboxCoords(clone);
        if (coords) {
          clone.lat = coords.lat;
          clone.lng = coords.lng;
        }
        return clone;
      }

      async function fetchAdminSpotInboxItems() {
        if (typeof window.fetchAdminSpotInbox === 'function') {
          return window.fetchAdminSpotInbox();
        }
        var cfg = getSupabaseRestConfig();
        var tok = (typeof window.okbmAccessToken === 'function' && window.okbmAccessToken()) || cfg.key;
        var headers = { 'apikey': cfg.key, 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' };
        var [propsRes, corrRes] = await Promise.all([
          // 관리자 목록 상한: 최신 300건 (전체 무제한 조회 방지)
          fetch(cfg.url + '/rest/v1/proposals?select=*&order=created_at.desc&limit=300', { headers: headers }),
          fetch(cfg.url + '/rest/v1/spot_corrections?select=*&order=created_at.desc&limit=300', { headers: headers })
        ]);
        if (!propsRes.ok && !corrRes.ok) throw new Error('inbox fetch failed');
        var props = propsRes.ok ? await propsRes.json() : [];
        var corrs = corrRes.ok ? await corrRes.json() : [];
        return []
          .concat((Array.isArray(props) ? props : []).map(function(r) { return normalizeInboxItem(r, false); }))
          .concat((Array.isArray(corrs) ? corrs : []).map(function(r) { return normalizeInboxItem(r, true); }))
          .filter(Boolean)
          .sort(function(a, b) {
            var at = Date.parse(a && a.created_at) || 0;
            var bt = Date.parse(b && b.created_at) || 0;
            return bt - at;
          });
      }

      function isPendingInboxStatus(status) {
        var s = String(status || '').trim();
        return !s || s === 'pending' || s.indexOf('대기') !== -1 || s.indexOf('검수') !== -1;
      }

      window.openAdminSpotInbox = async function() {
        if (!checkAdminAuthorization()) {
          showToast('관리자 권한이 확인되지 않았습니다.');
          return;
        }
        applyAdminPermissions(true);
        var old = document.getElementById('adminSpotInboxModal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'adminSpotInboxModal';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:calc(56px + env(safe-area-inset-bottom, 8px)); z-index:2147483645 !important; background:#000000; display:flex; justify-content:center; align-items:stretch;';
        overlay.innerHTML = '<div style="width:100%; max-width:480px; margin:0 auto; height:100%; background:#0c1017; display:flex; flex-direction:column; box-sizing:border-box;">' +
          '<div style="flex-shrink:0; display:flex; justify-content:space-between; align-items:center; padding:12px 16px; padding-top:calc(12px + env(safe-area-inset-top, 0px)); border-bottom:1px solid rgba(255,255,255,0.08);">' +
            '<button type="button" onclick="document.getElementById(\'adminSpotInboxModal\').remove();" style="background:rgba(255,255,255,0.08); border:none; color:#cbd5e1; width:30px; height:30px; border-radius:50%; font-size:0.85rem; font-weight:800; cursor:pointer;">◀</button>' +
            '<span style="font-size:0.95rem; font-weight:900; color:#ffffff;">장소 검수함</span>' +
            '<button type="button" onclick="window.renderAdminSpotInboxList();" style="background:none; border:none; color:#7dd3fc; font-size:0.72rem; font-weight:800; cursor:pointer;">새로고침</button>' +
          '</div>' +
          '<div id="adminSpotInboxList" style="flex:1; min-height:0; overflow-y:auto; padding:12px 16px 20px; color:#94a3b8; font-size:0.78rem;">불러오는 중</div>' +
        '</div>';
        document.body.appendChild(overlay);
        await window.renderAdminSpotInboxList();
      };

      window.renderAdminSpotInboxList = async function() {
        var listEl = document.getElementById('adminSpotInboxList');
        if (!listEl) return;
        listEl.textContent = '불러오는 중';
        var items = [];
        try {
          items = await fetchAdminSpotInboxItems();
        } catch (e) {
          listEl.textContent = '목록을 불러오지 못했습니다.';
          return;
        }
        if (!Array.isArray(items)) items = [];
        items.sort(function(a, b) {
          var at = Date.parse(a && a.created_at) || 0;
          var bt = Date.parse(b && b.created_at) || 0;
          return bt - at;
        });
        window.__adminSpotInboxCache = items;
        var pending = items.filter(function(it) { return isPendingInboxStatus(it.status); });
        var done = items.filter(function(it) { return !isPendingInboxStatus(it.status); });
        if (!items.length) {
          listEl.innerHTML = '<div style="text-align:center; padding:28px 8px; color:#64748b;">접수된 제보/수정 건의가 없습니다.</div>';
          return;
        }

        var formatWhen = function(iso) {
          if (typeof window.okbmFormatReportTime === 'function') {
            return window.okbmFormatReportTime(iso);
          }
          var d = new Date(iso);
          if (isNaN(d.getTime())) return '';
          var mm = String(d.getMonth() + 1).padStart(2, '0');
          var dd = String(d.getDate()).padStart(2, '0');
          var hh = String(d.getHours()).padStart(2, '0');
          var mi = String(d.getMinutes()).padStart(2, '0');
          return mm + '.' + dd + ' ' + hh + ':' + mi;
        };

        var renderCard = function(item, processed) {
          var title = item.spot_main || item.name || '이름 없음';
          var kind = item.type === 'correction' ? '수정건의' : '신규제보';
          var kindColor = item.type === 'correction' ? '#fb7185' : '#38bdf8';
          var coord = (item.lat && item.lng) ? (item.lat + ', ' + item.lng) : '좌표 없음';
          var reason = item.correctionReason || '';
          var when = formatWhen(item.created_at);
          var safeId = String(item.id || '').replace(/"/g, '');
          var actions = processed
            ? '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.focusAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:rgba(255,255,255,0.08); color:#e2e8f0;">지도보기</button>' +
              '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.deleteAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:#be123c; color:#fff;">삭제</button>'
            : '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.focusAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:rgba(255,255,255,0.08); color:#e2e8f0;">지도보기</button>' +
              '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.reviewAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:#0284c7; color:#fff;">검토/수정</button>' +
              '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.approveAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:#059669; color:#fff;">즉시반영</button>' +
              (item.type === 'correction'
                ? '<button type="button" data-id="' + escapeHtml(safeId) + '" onclick="window.banSpotFromCorrection(this.dataset.id)" style="background:#9f1239; color:#fff;">🚫야영금지</button>'
                : '') +
              '<button type="button" data-id="' + escapeHtml(safeId) + '" data-type="' + item.type + '" onclick="window.rejectAdminInboxItem(this.dataset.id, this.dataset.type)" style="background:#be123c; color:#fff;">반려</button>';
          return '<div class="admin-inbox-card">' +
            '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">' +
              '<span style="font-size:0.62rem; font-weight:900; color:' + kindColor + '; border:1px solid ' + kindColor + '55; border-radius:4px; padding:1px 6px;">' + kind + '</span>' +
              '<span style="font-size:0.62rem; color:#94a3b8;">' + escapeHtml(item.status || '대기') + '</span>' +
              (when ? '<span style="font-size:0.62rem; color:#64748b; margin-left:auto;">' + when + '</span>' : '') +
            '</div>' +
            '<h4>' + escapeHtml(title) + (item.spot_sub ? ' · ' + escapeHtml(item.spot_sub) : '') + '</h4>' +
            '<div class="admin-inbox-meta">' +
              escapeHtml(item.trailhead_addr || item.trailhead_name || '') + '<br>' +
              escapeHtml(coord) +
              (item.author || item.nickname ? '<br>제보: ' + escapeHtml(item.author || item.nickname) : '') +
              (reason ? '<br>사유: ' + escapeHtml(reason) : '') +
              (item.reject_reason ? '<br><span style="color:#fda4af;">반려 사유: ' + escapeHtml(item.reject_reason) + '</span>' : '') +
            '</div>' +
            '<div class="admin-inbox-actions">' + actions + '</div>' +
          '</div>';
        };

        listEl.innerHTML =
          '<div style="font-size:0.72rem; font-weight:800; color:#a7f3d0; margin:0 0 8px;">대기 ' + pending.length + '건 · 최신 등록순</div>' +
          (pending.length ? pending.map(function(it) { return renderCard(it, false); }).join('') : '<div style="margin-bottom:14px; color:#64748b;">대기 건이 없습니다.</div>') +
          (done.length ? '<div style="font-size:0.72rem; font-weight:800; color:#94a3b8; margin:16px 0 8px;">처리됨 ' + done.length + '건</div>' + done.map(function(it) { return renderCard(it, true); }).join('') : '');
      };

      function findAdminInboxItem(id, type) {
        var list = window.__adminSpotInboxCache || [];
        return list.find(function(it) {
          return String(it.id) === String(id) && (!type || it.type === type);
        }) || null;
      }

      window.focusAdminInboxItem = function(id, type) {
        var item = findAdminInboxItem(id, type);
        var coords = resolveInboxCoords(item);
        if (!item || !coords) {
          showToast('좌표가 없어 지도로 이동할 수 없습니다.');
          return;
        }
        revealMapUnderInbox();
        window.__pendingInboxMapFocus = { lat: coords.lat, lng: coords.lng, name: item.spot_main || '제보 위치' };
        setTimeout(function() {
          var pending = window.__pendingInboxMapFocus;
          if (!pending) return;
          if (!map) {
            showToast('지도를 아직 불러오지 못했습니다.');
            return;
          }
          try { kakao.maps.event.trigger(map, 'resize'); } catch (e) {}
          map.setLevel(4);
          smoothCenterMapOnSpot(pending.lat, pending.lng);
          if (typeof clearTempPickedMarker === 'function') clearTempPickedMarker();
          if (typeof kakao !== 'undefined' && kakao.maps) {
            tempPickedMarker = new kakao.maps.Marker({
              map: map,
              position: new kakao.maps.LatLng(pending.lat, pending.lng),
              image: (typeof createPickedMarkerImage === 'function') ? createPickedMarkerImage() : undefined
            });
          }
          showToast(pending.name + '로 이동했습니다.', { html: ICONS.PIN });
        }, 160);
      };

      window.reviewAdminInboxItem = function(id, type) {
        var item = findAdminInboxItem(id, type);
        if (!item) {
          showToast('해당 건을 찾을 수 없습니다.');
          return;
        }
        var modal = document.getElementById('adminSpotInboxModal');
        if (modal) modal.remove();
        applyAdminPermissions(true);
        modalMode = 'ADMIN_APPLY';
        modalEditIndex = -1;
        window.__adminApplyingInboxItem = item;
        window.__isSpotCorrectionMode = item.type === 'correction';
        window.__correctionTargetSpotId = resolveCorrectionOrigSpotId(item);
        resetModalPendingMemory();
        fillModalFromSpotLike(item);
        var titleEl = document.getElementById('modalTitle');
        var noticeEl = document.getElementById('modalNotice');
        var btnEl = document.getElementById('modalSubmitBtn');
        if (titleEl) titleEl.innerHTML = ICONS.EDIT + ' <span>' + (item.type === 'correction' ? '수정건의 검토 후 반영' : '신규 제보 검토 후 등록') + '</span>';
        if (noticeEl) {
          noticeEl.style.display = 'flex';
          noticeEl.innerHTML = ICONS.ALERT_CARD + ' <span>내용을 확인·수정한 뒤 저장하면 지도에 바로 반영됩니다.</span>';
        }
        if (btnEl) btnEl.innerText = item.type === 'correction' ? '수정 반영 저장' : '정식 등록 저장';
        showCustomModalOverlay();
      };

      window.approveAdminInboxItem = async function(id, type) {
        var item = findAdminInboxItem(id, type);
        if (!item) {
          showToast('해당 건을 찾을 수 없습니다.');
          return;
        }
        if (!confirm('이 내용을 지도에 즉시 반영할까요?')) return;
        window.__adminApplyingInboxItem = item;
        modalMode = 'ADMIN_APPLY';
        resetModalPendingMemory();
        fillModalFromSpotLike(item);
        await saveCustomModal();
        await window.renderAdminSpotInboxList();
      };

      window.banSpotFromCorrection = async function(id) {
        var item = findAdminInboxItem(id, 'correction');
        if (!item) return;
        var origId = String(resolveCorrectionOrigSpotId(item) || '').trim();
        var spot = (spots || []).find(function(s) { return String(s.id).trim() === origId; });
        if (!spot) {
          showToast('원래 장소를 찾을 수 없습니다.');
          return;
        }
        if (!confirm('[' + (spot.spot_main || spot.name || origId) + ']을(를) 야영금지로 표시할까요?\n뷰·유튜브 등 상세 내용이 가려지고 금지 안내와 LNT 원칙만 보입니다.')) return;
        var ok = await window.setSpotCampBan(origId, true);
        if (ok && typeof window.updateAdminSpotInboxStatus === 'function') {
          await window.updateAdminSpotInboxStatus(item.id, true, '반영완료', { approved_spot_id: origId });
          if (typeof window.notifyProposalDecision === 'function') {
            await window.notifyProposalDecision(item, '반영완료', origId);
          }
        }
        showToast(ok ? '야영금지로 표시하고 건의를 채택했습니다.' : '야영금지 표시에 실패했습니다.');
        await window.renderAdminSpotInboxList();
      };

      window.rejectAdminInboxItem = async function(id, type) {
        var item = findAdminInboxItem(id, type);
        if (!item) return;
        var rejectReason = window.prompt('반려 사유를 입력하세요. 제보자 알림과 낭만리포트에 표시됩니다. (선택, 300자 이내)', '');
        if (rejectReason === null) return;
        rejectReason = String(rejectReason).trim().slice(0, 300);
        var ok = true;
        if (typeof window.updateAdminSpotInboxStatus === 'function') {
          ok = await window.updateAdminSpotInboxStatus(item.id, item.type === 'correction', '반려', { reject_reason: rejectReason });
        }
        if (ok && typeof window.notifyProposalDecision === 'function') {
          await window.notifyProposalDecision(item, '반려');
        }
        showToast(ok ? '반려 처리했습니다.' : '상태 변경에 실패했습니다.');
        await window.renderAdminSpotInboxList();
      };

      window.deleteAdminInboxItem = async function(id, type) {
        var item = findAdminInboxItem(id, type);
        if (!item) {
          showToast('해당 건을 찾을 수 없습니다.');
          return;
        }
        if (!confirm('처리된 검수 건을 목록에서 삭제할까요?')) return;
        var ok = false;
        if (typeof window.deleteProposalFromSupabase === 'function') {
          ok = await window.deleteProposalFromSupabase(item.id, item.type === 'correction');
        }
        showToast(ok ? '삭제했습니다.' : '삭제에 실패했습니다.');
        if (ok) await window.renderAdminSpotInboxList();
      };

  async function executeSearch(mode = 'pc') {
        const inputEl = document.getElementById('pcSearchInput');
        const dropdown = document.getElementById('pcSearchDropdown');
        const rawQuery = inputEl ? inputEl.value.trim() : '';
        const searchSeq = ++_mapKeywordSearchSeq;
        if (!rawQuery) {
          showTopRankings(mode);
          return;
        }

        const results = [];
        const seenCoords = new Set();
        const lowerQ = rawQuery.toLowerCase();

        // 🎯 1. 산 이름 및 세부 포인트 중심 엄격 매칭 (설명/주소 속 무관한 한 글자 매칭 원천 차단)
        // 지역(충주시·충주·충북)도 찾고, "충주 고봉"처럼 띄어 쓴 단어는 지역·이름·부제 어디든 모두 들어 있으면 찾는다
        const tokens = lowerQ.split(/\s+/).filter(Boolean);
        const compactQ = lowerQ.replace(/\s+/g, '');
        const matchedList = [];
        spots.forEach(spot => {
          const mainName = (spot.spot_main || spot.name || '').toLowerCase();
          const subName = (spot.spot_sub || '').toLowerCase();
          const city = (spot.cityName || '').toLowerCase();
          const cityShort = city.length > 2 ? city.replace(/(시|군|구)$/, '') : city;
          const region = (spot.region || '').toLowerCase();
          // 한 글자("시", "도")로는 지역을 찾지 않는다
          const inPlace = t => t.length >= 2 && (city.includes(t) || region.includes(t));

          let score = 0;
          if (mainName === lowerQ) score += 100;
          else if (mainName.startsWith(lowerQ)) score += 80;
          else if (mainName.includes(lowerQ)) score += 60;
          else if (subName.includes(lowerQ)) score += 40;
          else if (tokens.length > 1 && tokens.every(t => mainName.includes(t) || subName.includes(t) || inPlace(t))) {
            score += tokens.some(t => mainName.includes(t)) ? 70 : 30;
          } else if (cityShort.length >= 2 && compactQ.length > cityShort.length && compactQ.startsWith(cityShort)
            && mainName.replace(/\s+/g, '').startsWith(compactQ.slice(cityShort.length))) {
            score += 70; // 붙여 쓴 "충주고봉"
          } else if (tokens.length === 1 && inPlace(lowerQ)) score += 20;

          if (score > 0) {
            matchedList.push({ spot, score });
          }
        });

        matchedList.sort((a, b) => b.score - a.score);

        matchedList.forEach(({ spot }) => {
          seenCoords.add(`${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`);
          results.push({ 
            title: `[등록박지] ${spot.spot_main || spot.name} ${spot.spot_sub ? `(${spot.spot_sub})` : ''}`, 
            sub: `${spot.cityName ? `[${spot.cityName}] ` : ''}${spot.trailhead_name || spot.trailhead_addr || ''}`, 
            lat: spot.lat, 
            lng: spot.lng, 
            isInternal: true, 
            spotObj: spot 
          });
        });

        const renderItems = (items) => {
          if (searchSeq !== _mapKeywordSearchSeq) return;
          if (!dropdown) return;
          dropdown.style.display = 'block';

          if (items.length === 0) {
            dropdown.innerHTML = '<li style="padding:14px; text-align:center; color:var(--text-muted); font-size:0.75rem;">일치하는 지역이나 박지가 없습니다.</li>';
            return;
          }

          dropdown.innerHTML = '';
          items.forEach(res => {
            const li = document.createElement('li');
            li.style.cssText = 'padding:8px 12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-hairline); cursor:pointer; min-height:40px; box-sizing:border-box; transition:background 0.15s ease;';
            li.onmouseover = () => { li.style.background = 'var(--bg-card-hover)'; };
            li.onmouseout = () => { li.style.background = 'transparent'; };

            const badgeHtml = res.isInternal && isCampBanned(res.spotObj)
              ? '<span style="font-size:0.56rem; font-weight:900; background:rgba(244,63,94,0.18); color:#fda4af; border:1px solid rgba(244,63,94,0.45); padding:1px 5px; border-radius:4px; flex-shrink:0;">🚫 야영금지</span>'
              : res.isInternal
              ? '<span style="font-size:0.56rem; font-weight:900; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); padding:1px 5px; border-radius:4px; flex-shrink:0;">장소</span>'
              : '<span style="font-size:0.56rem; font-weight:700; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); padding:1px 5px; border-radius:4px; flex-shrink:0;">자연</span>';

            li.innerHTML = `
              <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; align-items:center; gap:5px;">
                  ${badgeHtml}
                  <span style="font-size:0.80rem; font-weight:800; color:${res.isInternal ? '#38bdf8' : 'var(--text-primary)'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${escapeHtml(res.title.replace(/^\[등록박지\]\s*/, ''))}
                  </span>
                </div>
                <span style="font-size:0.63rem; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${escapeHtml(res.sub)}
                </span>
              </div>`;

            li.addEventListener('click', () => {
              dropdown.style.display = 'none';
              if (window.innerWidth <= 768) {
                setMobileSidebarCollapsed(true);
              }
              if (res.isInternal && res.spotObj) { 
                focusSpotOnMap(res.spotObj); 
              } else {
                smoothCenterMapOnSpot(res.lat, res.lng);
                if (tempSearchMarker) tempSearchMarker.setMap(null);
                tempSearchMarker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(res.lat, res.lng), map: map });
                setTimeout(() => { if (tempSearchMarker) tempSearchMarker.setMap(null); }, 3500);
              }
            });
            dropdown.appendChild(li);
          });
        };

        renderItems(results);

        // 🌲 2. 카카오 장소 검색 시 주유소/상가 노이즈 100% 차단 (자연/산림/캠핑만 허용)
        if (typeof kakao !== 'undefined' && kakao.maps && kakao.maps.services) {
          const places = new kakao.maps.services.Places();
          places.keywordSearch(rawQuery, (data, status) => {
            if (searchSeq !== _mapKeywordSearchSeq) return;
            if (status === kakao.maps.services.Status.OK) {
              const blockedCategories = ['주유소', '충전소', '음식점', '카페', '마트', '편의점', '숙박', '병원', '약국', '은행', '학원', '부동산'];

              data.forEach(item => {
                const cat = (item.category_name || '') + ' ' + (item.category_group_name || '');
                const placeName = item.place_name || '';

                const isBlocked = blockedCategories.some(b => cat.includes(b) || placeName.includes(b));
                if (isBlocked) return;

                const isOutdoorRelated = cat.includes('여행') || cat.includes('관광') || cat.includes('명소') ||
                                         placeName.includes('산') || placeName.includes('봉') || placeName.includes('계곡') ||
                                         placeName.includes('자연') || placeName.includes('캠핑') || placeName.includes('공원') || placeName.includes('고개');
                if (!isOutdoorRelated) return;

                const lat = parseFloat(item.y), lng = parseFloat(item.x);
                const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
                if (!seenCoords.has(key)) {
                  seenCoords.add(key);
                  results.push({ 
                    title: item.place_name, 
                    sub: `[${item.category_group_name || '자연명소'}] ${item.road_address_name || item.address_name || ''}`, 
                    lat, lng, isInternal: false 
                  });
                }
              });
              renderItems(results);
            }
          });
        }
      }

      function exportDataBackup() {
        try {
          const backupData = { 
            spots, 
            bookmarks: [...userBookmarks], 
            visited: [...userVisited], 
            memos: userMemos, 
            exportDate: new Date().toISOString(),
            version: CURRENT_VERSION
          };
          const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; 
          a.download = `romantic_root_backup_${new Date().toISOString().slice(0, 10)}.json`; 
          a.click();
          URL.revokeObjectURL(url);
          showToast('백업 파일이 안전하게 다운로드되었습니다.', { html: ICONS.BACKUP });
        } catch (err) {
          alert('백업 파일 생성 중 오류가 발생했습니다.');
        }
      }

      window.__okbmHealthCheck = function() {
        var hasVault = !!(window.RomanticVault && typeof window.RomanticVault.write === 'function');
        var hasSupabase = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
        var spotsCount = Array.isArray(spots) ? spots.length : 0;
        return {
          view: 'map',
          vaultReady: hasVault,
          supabaseReady: hasSupabase,
          spotsCount: spotsCount,
          epoch: localStorage.getItem('okbm_client_epoch') || 'none',
          status: (hasVault && hasSupabase && spotsCount > 0) ? 'HEALTHY' : 'CHECK_REQUIRED'
        };
      };

      function importDataBackup(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (!data || typeof data !== 'object') throw new Error('유효하지 않은 데이터 구조');

           if (Array.isArray(data.bookmarks)) { 
              userBookmarks = new Set(data.bookmarks.map(s => String(s).trim())); 
              if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
                window.RomanticVault.write('okbm_bookmarks', Array.from(userBookmarks), true);
              }
            }
            if (Array.isArray(data.visited)) { 
              userVisited = new Set(data.visited.map(s => String(s).trim())); 
              if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
                window.RomanticVault.write('okbm_visited', Array.from(userVisited), true);
              }
            }
            if (data.memos && typeof data.memos === 'object') { 
              userMemos = data.memos; 
              if (window.RomanticVault && typeof window.RomanticVault.write === 'function') {
                window.RomanticVault.write('okbm_memos', userMemos, true);
              }
            }
            if (Array.isArray(data.spots) && data.spots.length > 0) { 
              spots = data.spots.map(function(s) {
                return typeof window.stripSpotDetailFields === 'function' ? window.stripSpotDetailFields(s) : s;
              });
              window.spots = spots;
              persistSpotsCache();
            }

            renderSubChips(); 
            renderSpots(); 
            refreshCurrentSpotPopup(); 
            if (typeof syncUserDataToCloud === 'function') syncUserDataToCloud(); 
            
            triggerHaptic(15);
            alert('데이터가 성공적으로 복원되었습니다!');
          } catch (err) {
            alert('올바른 백업 JSON 파일 형식이 아닙니다. 파일을 확인해 주세요.');
          } finally {
            e.target.value = '';
          }
        };
        reader.readAsText(file);
      }

      (function initNewSpotNotice() {
        var root = document.getElementById('okbmNewSpotNotice');
        if (!root) return;
        var noticeId = String(root.getAttribute('data-notice-id') || '').trim();
        if (!noticeId) return;
        var storageKey = 'okbm_map_notice_id';

        function storedId() {
          try { return String(localStorage.getItem(storageKey) || ''); } catch (e) { return noticeId; }
        }

        function showNotice() {
          if (storedId() === noticeId) {
            root.hidden = true;
            return;
          }
          var img = document.getElementById('okbmNewSpotNoticeImg');
          if (img && img.getAttribute('data-notice-bound') !== noticeId) {
            img.setAttribute('data-notice-bound', noticeId);
            img.src = (root.getAttribute('data-notice-img') || '/notice/new-spots.jpg') + '?v=' + encodeURIComponent(noticeId);
            img.addEventListener('error', function() { root.hidden = true; });
          }
          root.hidden = false;
          if (root.parentNode) root.parentNode.appendChild(root);
        }

        function closeNotice() {
          try { localStorage.setItem(storageKey, noticeId); } catch (e) {}
          root.hidden = true;
        }
        var closeBtn = document.getElementById('okbmNewSpotNoticeClose');
        if (closeBtn) closeBtn.addEventListener('click', closeNotice);

        // 공지 아래 버튼: data-notice-action="photomap"이면 닫고 사진 지도를 연다(지도가 아직 준비 전이면 잠깐 기다린다)
        var actBtn = document.getElementById('okbmNoticeAction');
        if (actBtn && root.getAttribute('data-notice-action') === 'photomap') {
          actBtn.hidden = false;
          actBtn.addEventListener('click', function() {
            closeNotice();
            var tries = 0;
            (function go() {
              if (map && window.okbmPhotoMap) { if (currentMapLayerState !== 3) togglePhotoMap(); return; }
              if (++tries < 40) setTimeout(go, 250);
            })();
          });
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNotice);
        else showNotice();
        window.addEventListener('pageshow', showNotice);
      })();
    