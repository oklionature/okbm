// 아이폰 앱 출시 안내 + 기기 종류 기록
// - 기기 종류는 하루 한 번 okbmMetric('device_...', 'view')로 센다. (DB: SUPABASE_G5_DEVICE_METRICS.sql)
//   스크립트 태그에 data-device-metric="off"를 달면 세지 않는다(지도 화면은 홈과 겹쳐 세지 않게).
// - 예전 "홈 화면에 추가" 안내는 아이폰 앱이 나와서 그만 띄운다.
// - 앱 안내는 아이폰·아이패드(사파리·카카오톡 등 앱 안 브라우저)에서만, 낭만루트 앱(Capacitor)·홈 화면 앱에서는 띄우지 않는다.
// - X나 '앱스토어에서 받기'를 누르면 기기에 NOTICE_ID를 적어 다시 띄우지 않는다.
// - 세는 이름은 DB 허용 목록에 있는 home_guide(보임)·home_guide_close(닫기)를 그대로 쓴다.
// - 안드로이드 크롬의 설치 배너는 막는다. 안드로이드는 플레이 스토어 앱으로 안내한다.
// - ?homeguide=1 이면 조건과 상관없이 바로 띄운다 (확인용).
(function () {
  'use strict';
  if (window.__okbmHomeGuideBooted) return;
  window.__okbmHomeGuideBooted = true;

  var KEY = 'okbm_app_notice';
  var NOTICE_ID = '20261028-iosapp';
  var APP_STORE_URL = 'https://apps.apple.com/kr/app/id6824809664';
  var me = document.currentScript;
  var countDevice = !(me && me.getAttribute('data-device-metric') === 'off');

  var ua = navigator.userAgent || '';
  var isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  var isAndroid = /Android/i.test(ua);
  var isIos = !isAndroid && (/iPhone|iPad|iPod/i.test(ua) || isIpadOs);
  var inNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var isStandalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var forced = /(?:^|[?&])homeguide=1(?:&|$)/.test(location.search || '');

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); });

  function metric(section, kind) {
    try { if (typeof window.okbmMetric === 'function') window.okbmMetric(section, kind); } catch (e) {}
  }

  function deviceKind() {
    if (inNativeApp) return 'device_app';
    if (isIos && isStandalone) return 'device_ios_home';
    if (isIos) return 'device_ios';
    if (isAndroid) return 'device_android';
    return 'device_other';
  }

  function readState() {
    try { return String(localStorage.getItem(KEY) || ''); } catch (e) { return NOTICE_ID; }
  }

  function writeState() {
    try { localStorage.setItem(KEY, NOTICE_ID); } catch (e) {}
  }

  // 지도 화면의 첫 알림(포토맵 등)이 떠 있으면 그게 닫힐 때까지 기다린다
  function otherNoticeOpen() {
    var n = document.getElementById('okbmNewSpotNotice');
    return !!(n && !n.hidden);
  }

  function shouldShow() {
    if (forced) return true;
    if (!isIos || isStandalone || inNativeApp) return false;
    return readState() !== NOTICE_ID;
  }

  function injectStyle() {
    if (document.getElementById('okbmAppNoticeStyle')) return;
    var st = document.createElement('style');
    st.id = 'okbmAppNoticeStyle';
    st.textContent =
      '#okbmAppNotice{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:2147483000;' +
      'background:#0E1013;color:#F2F2F2;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:16px 16px 14px;' +
      'box-shadow:0 12px 32px rgba(0,0,0,.45);font-family:inherit;opacity:0;transform:translateY(16px) scale(.98);' +
      'transition:opacity .35s cubic-bezier(.2,.8,.2,1),transform .35s cubic-bezier(.2,.8,.2,1);max-width:420px;margin:0 auto}' +
      '#okbmAppNotice.on{opacity:1;transform:none}' +
      '#okbmAppNotice.off{opacity:0;transform:translateY(12px);transition-duration:.18s}' +
      '#okbmAppNotice .an-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}' +
      '#okbmAppNotice .an-icon{width:44px;height:44px;border-radius:11px;flex:none;background:#000 center/cover no-repeat}' +
      '#okbmAppNotice .an-sub{font-size:1.08rem;color:#FFB547;font-weight:800;letter-spacing:-.01em}' +
      '#okbmAppNotice .an-title{font-size:.9rem;font-weight:600;color:#D7DADF;line-height:1.4;margin-top:3px;word-break:keep-all}' +
      '#okbmAppNotice .an-x{margin-left:auto;align-self:flex-start;background:none;border:0;color:#9AA0A6;font-size:20px;line-height:1;padding:2px 4px;cursor:pointer}' +
      '#okbmAppNotice .an-go{display:block;text-align:center;text-decoration:none;padding:14px 10px;border-radius:12px;background:#2f9e6a;color:#fff;font-size:1rem;font-weight:800}';
    document.head.appendChild(st);
  }

  function close(box) {
    writeState();
    box.classList.remove('on');
    box.classList.add('off');
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 220);
  }

  function show() {
    if (document.getElementById('okbmAppNotice')) return;
    if (!forced && readState() === NOTICE_ID) return;
    if (otherNoticeOpen()) { setTimeout(show, 1500); return; }
    injectStyle();
    var box = document.createElement('div');
    box.id = 'okbmAppNotice';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '낭만루트 아이폰 앱 안내');
    box.innerHTML =
      '<div class="an-head">' +
        '<div class="an-icon" style="background-image:url(/apple-touch-icon.png)"></div>' +
        '<div><div class="an-sub">낭만루트 아이폰 앱 출시</div>' +
        '<div class="an-title">앱스토어에서 다운받아<br>더 편하게 써 보세요</div></div>' +
        '<button type="button" class="an-x" aria-label="닫기">×</button>' +
      '</div>' +
      '<a class="an-go" href="' + APP_STORE_URL + '" rel="noopener">앱스토어에서 받기</a>';
    document.body.appendChild(box);
    box.querySelector('.an-x').addEventListener('click', function () {
      metric('home_guide_close', 'click');
      close(box);
    });
    // 버튼을 눌러도 다시 안 띄운다(앱스토어로 넘어가는 건 링크가 한다)
    box.querySelector('.an-go').addEventListener('click', function () { close(box); });
    metric('home_guide', 'view');
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('on'); }); });
  }

  function start() {
    if (countDevice) metric(deviceKind(), 'view');
    if (shouldShow()) setTimeout(show, forced ? 300 : 6000);
  }

  if (document.readyState === 'complete') setTimeout(start, 3000);
  else window.addEventListener('load', function () { setTimeout(start, 3000); });
})();
