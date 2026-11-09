// =========================================================================
// 지도 오른쪽 아래 '낭만루터 참여' 칸 (2026-11-09, 대표님. 시안 audit/popup-mock/map.html)
//
// 지도 아래 띠(포토맵·목록 보기·일반·내 위치) 바로 위 오른쪽에 작은 칸을 띄운다.
//   '최애 장비 후기' 줄 → 안내 시트 → '최애 장비 고르기'는 라운지 장비 탭 위에 장비 후기 쓰기 창(lounge.js okbmLoungeGearReviewNew)
//   '박지 이상형 월드컵' 줄 → map-worldcup.js를 받아 월드컵을 연다. 끝나면 1·2·3위가 라운지 '내 최애 박지 TOP 3' 설문에 들어간다.
//   로그인 안 하고 끝낸 답은 로그인 뒤 지도가 다시 열리면 이어서 넣는다(칸을 닫았어도).
// 휴대폰 화면에서만, 목록·정보창·포토맵·깨끗한 지도일 때는 숨긴다. X로 닫으면 다시 뜨지 않는다.
// 인라인 onclick을 쓰지 않는다(CSP 해시가 필요 없게).
// =========================================================================
(function () {
  'use strict';

  var KEY = 'okbm_map_gear_card_1109';
  var closed = false;
  try { closed = localStorage.getItem(KEY) === '1'; } catch (e) {}

  var HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>';

  var CSS = [
    '.okbm-gc{display:none}',
    // 아래 띠 윗선보다 10px 위. 띠 높이는 initGc()가 재서 --okbm-gc-bottom에 넣는다
    '@media (max-width:768px){.okbm-gc.on{display:block}}',
    '.okbm-gc{position:fixed;right:10px;bottom:var(--okbm-gc-bottom,calc(109px + env(safe-area-inset-bottom,0px)));z-index:calc(var(--z-sidebar,700) + 20);width:248px;background:rgba(15,15,17,.96);border:1px solid rgba(255,255,255,.16);border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.55);padding:10px 6px 6px;box-sizing:border-box;font-family:inherit;color:#f2f2f3}',
    'body.pm-on .okbm-gc,body.clean-map-mode .okbm-gc,body:has(#mobileBottomSheet.open) .okbm-gc,body:has(#sidebar:not(.collapsed)) .okbm-gc,body:has(#mbsListRow:not([hidden])) .okbm-gc{display:none!important}',
    '.okbm-gc-head{display:flex;align-items:center;gap:6px;padding:0 8px 6px;font-size:11px;font-weight:700;color:#f2c14e}',
    '.okbm-gc-x{position:absolute;top:2px;right:2px;width:32px;height:32px;display:grid;place-items:center;color:#8b8b93;background:none;border:0;padding:0;cursor:pointer}',
    '.okbm-gc-x svg{width:14px;height:14px;display:block}',
    '.okbm-gc-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px;border-radius:10px;background:none;border:0;color:inherit;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '.okbm-gc-row:active{background:rgba(255,255,255,.06)}',
    '.okbm-gc-ic{flex:0 0 auto;width:40px;height:40px;border-radius:9px;display:grid;place-items:center;color:#ff6b81;background:rgba(255,107,129,.16)}',
    '.okbm-gc-ic svg{width:22px;height:22px;display:block}',
    // 월드컵 줄: 박지 사진 두 장 반씩 + 가운데 VS
    '.okbm-gc-vs{flex:0 0 auto;width:40px;height:40px;border-radius:9px;overflow:hidden;position:relative;display:flex;background:#2a2a30}',
    '.okbm-gc-vs img{width:20px;height:40px;object-fit:cover;display:block}',
    '.okbm-gc-vs b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:900;background:#000;color:#e9c46a;border-radius:6px;padding:1px 3px;line-height:1.2}',
    '.okbm-gc-row+.okbm-gc-row{border-top:1px solid rgba(255,255,255,.08);border-radius:0 0 10px 10px}',
    '.okbm-gc-t{flex:1;min-width:0;word-break:keep-all}',
    '.okbm-gc-t strong{display:block;font-size:13px;font-weight:800}',
    '.okbm-gc-t span{display:block;margin-top:2px;font-size:11px;color:#8b8b93;line-height:1.35}',
    '.okbm-gc-chev{flex:0 0 auto;width:14px;height:14px;color:#8b8b93;display:block}',
    // 안내 시트: 아래 메뉴(56px) 위에서 올라온다
    '.okbm-gcs{position:fixed;left:0;right:0;top:0;bottom:calc(56px + env(safe-area-inset-bottom,0px));z-index:calc(var(--z-modal,1000) + 50);background:rgba(0,0,0,.6);display:flex;align-items:flex-end;font-family:inherit;color:#f2f2f3}',
    '.okbm-gcs[hidden]{display:none}',
    '.okbm-gcs-in{width:100%;background:#0f141c;border-radius:18px 18px 0 0;padding:10px 20px 18px;box-shadow:0 -8px 20px rgba(0,0,0,.4);box-sizing:border-box;word-break:keep-all}',
    '.okbm-gcs-grab{width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:0 auto 16px}',
    '.okbm-gcs-top{display:flex;align-items:flex-start;gap:10px}',
    '.okbm-gcs-top svg{flex:0 0 auto;width:26px;height:26px;color:#ff6b81;margin-top:1px;display:block}',
    '.okbm-gcs h2{margin:0;font-size:20px;font-weight:800;line-height:1.35;letter-spacing:-.02em}',
    '.okbm-gcs-lead{margin:8px 0 0;font-size:14px;color:#d1d1d6;line-height:1.55}',
    '.okbm-gcs ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:10px}',
    '.okbm-gcs li{display:flex;gap:10px;font-size:13px;color:#d1d1d6;line-height:1.45}',
    '.okbm-gcs li i{flex:0 0 auto;width:20px;height:20px;border-radius:10px;background:rgba(76,148,248,.16);color:#4c94f8;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:800}',
    '.okbm-gcs li b{color:#f2f2f3}',
    '.okbm-gcs-go{margin-top:20px;width:100%;height:50px;border-radius:12px;border:0;background:#2f72dc;color:#fff;font:inherit;font-size:15px;font-weight:800;cursor:pointer}',
    '.okbm-gcs-later{margin-top:4px;width:100%;height:44px;border:0;background:none;color:#8b8b93;font:inherit;font-size:13px;cursor:pointer}'
  ].join('');

  // 월드컵 줄 작은 그림: 예빈산(10)·덕적도(105) 피드 사진 (map-worldcup.js와 같은 사진)
  var R2 = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/';
  function small(key) { var u = R2 + key; return typeof window.okbmFastImageUrl === 'function' ? window.okbmFastImageUrl(u, 120) : u; }
  var VS_A = small('okbm/6e6e6ff3-9261-4fd5-9259-36e1b2ccb0d7/6ae1f89a-f8e7-49f9-9c9a-47c819b21b5d.jpg');
  var VS_B = small('okbm/e0817167-1b1c-4042-85b4-87d63c13cc8e/15baeeae-898c-4589-94aa-1195e14f64f3.jpg');
  var WC_SRC = 'map-worldcup.js?v=1';

  var CARD ='<div class="okbm-gc-head"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20l6-10 4 6 3-4 5 8z"/><circle cx="17" cy="6" r="2"/></svg>낭만루터 참여</div>' +
    '<button type="button" class="okbm-gc-x" data-gc="close" data-metric-click="feat_map_gc_close" aria-label="닫기"><svg viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg></button>' +
    '<button type="button" class="okbm-gc-row" data-gc="wc" data-metric-click="feat_map_gc_wc">' +
      '<span class="okbm-gc-vs"><img src="' + VS_A + '" alt=""><img src="' + VS_B + '" alt=""><b>VS</b></span>' +
      '<span class="okbm-gc-t"><strong>박지 이상형 월드컵</strong><span>당신의 최애 박지를 골라 주세요</span></span>' +
      '<svg class="okbm-gc-chev" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 2.5L9.5 7 5 11.5"/></svg>' +
    '</button>' +
    '<button type="button" class="okbm-gc-row" data-gc="gear" data-metric-click="feat_map_gc_gear">' +
      '<span class="okbm-gc-ic">' + HEART + '</span>' +
      '<span class="okbm-gc-t"><strong>최애 장비 후기</strong><span>이건 잘 샀다! 추천하고 싶은 최애 장비 후기를 남겨 주세요</span></span>' +
      '<svg class="okbm-gc-chev" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 2.5L9.5 7 5 11.5"/></svg>' +
    '</button>';

  var SHEET = '<div class="okbm-gcs-in" role="dialog" aria-modal="true" aria-label="최애 장비 후기">' +
      '<div class="okbm-gcs-grab" aria-hidden="true"></div>' +
      '<div class="okbm-gcs-top">' + HEART + '<h2>지금까지 쓰면서<br>제일 좋았던 장비 하나</h2></div>' +
      '<p class="okbm-gcs-lead">그 장비 후기를 남겨 주세요. 별점과 꼬리표만 눌러도 돼요.</p>' +
      '<ul>' +
        '<li><i>1</i><span><b>사기 전에 고민하는 낭만루터</b>가 실제 쓴 사람 말을 보고 고를 수 있어요</span></li>' +
        '<li><i>2</i><span>같은 장비를 쓰는 낭만루터가 <b>질문</b>하면 알림이 와요</span></li>' +
        '<li><i>3</i><span>후기 하나에 <b>10포인트</b>, 내 장비에도 저절로 들어가요</span></li>' +
      '</ul>' +
      '<button type="button" class="okbm-gcs-go" data-gc="go" data-metric-click="feat_map_gc_go">최애 장비 고르기</button>' +
      '<button type="button" class="okbm-gcs-later" data-gc="later">나중에</button>' +
    '</div>';

  var card = null, sheet = null;

  function openSheet() {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'okbm-gcs';
      sheet.innerHTML = SHEET;
      sheet.addEventListener('click', function (e) {
        var a = e.target.closest('[data-gc]');
        if (!a && e.target !== sheet) return;
        var k = a ? a.getAttribute('data-gc') : 'later';
        sheet.hidden = true;
        if (k === 'go') goWrite();
      });
      document.body.appendChild(sheet);
    }
    sheet.hidden = false;
    var go = sheet.querySelector('.okbm-gcs-go');
    if (go) go.focus({ preventScroll: true });
  }

  function goWrite() {
    var run = function () { if (typeof window.okbmLoungeGearReviewNew === 'function') window.okbmLoungeGearReviewNew(); };
    if (typeof window.okbmLoungeGearReviewNew === 'function') return run();
    if (typeof window.okbmEnsureLounge === 'function') {
      Promise.resolve(window.okbmEnsureLounge()).then(run).catch(function (err) { console.warn('[map-gear-card.js:goWrite]', err); });
    }
  }

  // 아래 띠(#mapFloatingQuickBar) 윗선에서 10px 위에 둔다
  function place() {
    var bar = document.getElementById('mapFloatingQuickBar');
    if (!bar || !card) return;
    var r = bar.getBoundingClientRect();
    if (r.height) card.style.setProperty('--okbm-gc-bottom', (window.innerHeight - r.top + 10) + 'px');
  }

  function loadWorldcup() {
    if (window.okbmWorldcup) return Promise.resolve();
    if (typeof window.okbmLoadScript !== 'function') return Promise.reject(new Error('no_loader'));
    return Promise.resolve(window.okbmLoadScript(WC_SRC));
  }
  function openWorldcup() {
    loadWorldcup().then(function () { window.okbmWorldcup.open(); })
      .catch(function (err) { console.warn('[map-gear-card.js:openWorldcup]', err); });
  }
  // 로그인 전에 끝낸 월드컵 답이 남아 있으면 로그인된 뒤 넣는다
  function resumeWorldcup() {
    var has = false;
    try { has = !!localStorage.getItem('okbm_wc_pending'); } catch (e) {}
    if (!has) return;
    var tries = 0;
    var tryNow = function () {
      if (!(typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn())) return false;
      window.removeEventListener('okbm_user_data_refreshed', onRefresh);
      loadWorldcup().then(function () { window.okbmWorldcup.resume(); })
        .catch(function (err) { console.warn('[map-gear-card.js:resumeWorldcup]', err); });
      return true;
    };
    var onRefresh = function () { tryNow(); };
    window.addEventListener('okbm_user_data_refreshed', onRefresh);
    // 로그인 확인이 늦게 끝나기도 해서 몇 번 더 본다
    var tick = function () { if (!tryNow() && ++tries < 6) setTimeout(tick, 1500); };
    setTimeout(tick, 1500);
  }

  function initGc() {
    resumeWorldcup();
    if (closed) return;
    var st = document.createElement('style');
    st.id = 'okbmGearCardCss';
    st.textContent = CSS;
    document.head.appendChild(st);
    card = document.createElement('div');
    card.className = 'okbm-gc';
    card.setAttribute('role', 'complementary');
    card.setAttribute('aria-label', '낭만루터 참여');
    card.innerHTML = CARD;
    card.addEventListener('click', function (e) {
      var a = e.target.closest('[data-gc]');
      if (!a) return;
      if (a.getAttribute('data-gc') === 'close') {
        card.remove();
        try { localStorage.setItem(KEY, '1'); } catch (err) {}
      } else if (a.getAttribute('data-gc') === 'wc') openWorldcup();
      else openSheet();
    });
    document.body.appendChild(card);
    place();
    window.addEventListener('resize', place);
    // 지도 첫 화면이 자리 잡은 뒤에 띄운다
    setTimeout(function () { place(); card.classList.add('on'); }, 1200);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGc);
  else initGc();
})();
