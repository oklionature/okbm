// 아이폰 사파리에서 "홈 화면에 추가" 안내 + 기기 종류 기록
// - 기기 종류는 하루 한 번 okbmMetric('device_...', 'view')로 센다. (DB: SUPABASE_G5_DEVICE_METRICS.sql)
// - 안내는 아이폰 사파리에서만, 홈 화면 앱·Capacitor 앱·카카오톡 등 앱 안 브라우저에서는 띄우지 않는다.
// - X를 누르면 14일 동안 다시 띄우지 않고, 모두 3번까지만 띄운다.
// - 안드로이드 크롬의 설치 배너는 막는다. 안드로이드는 플레이 스토어 앱으로 안내한다.
// - ?homeguide=1 이면 조건과 상관없이 바로 띄운다 (확인용).
(function () {
  'use strict';
  if (window.__okbmHomeGuideBooted) return;
  window.__okbmHomeGuideBooted = true;

  var KEY = 'okbm_home_guide';
  var HIDE_DAYS = 14;
  var MAX_SHOWS = 3;

  var ua = navigator.userAgent || '';
  var isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  var isAndroid = /Android/i.test(ua);
  var isIos = !isAndroid && (/iPhone|iPad|iPod/i.test(ua) || isIpadOs);
  var inNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var isStandalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var inAppBrowser = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|CriOS|FxiOS|EdgiOS|Whale/i.test(ua);
  var isIosSafari = isIos && !inAppBrowser && /Safari/i.test(ua);
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
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      return s && typeof s === 'object' ? s : {};
    } catch (e) { return {}; }
  }

  function writeState(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function shouldShow() {
    if (forced) return true;
    if (!isIosSafari || isStandalone || inNativeApp) return false;
    var s = readState();
    if ((s.shows || 0) >= MAX_SHOWS) return false;
    if (s.hiddenAt && Date.now() - s.hiddenAt < HIDE_DAYS * 86400000) return false;
    return true;
  }

  var SHARE_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var PLUS_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>';

  function injectStyle() {
    if (document.getElementById('okbmHomeGuideStyle')) return;
    var st = document.createElement('style');
    st.id = 'okbmHomeGuideStyle';
    st.textContent =
      '#okbmHomeGuide{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:2147483000;' +
      'background:#0E1013;color:#F2F2F2;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:16px 16px 14px;' +
      'box-shadow:0 12px 32px rgba(0,0,0,.45);font-family:inherit;opacity:0;transform:translateY(16px) scale(.98);' +
      'transition:opacity .35s cubic-bezier(.2,.8,.2,1),transform .35s cubic-bezier(.2,.8,.2,1);max-width:420px;margin:0 auto}' +
      '#okbmHomeGuide.on{opacity:1;transform:none}' +
      '#okbmHomeGuide.off{opacity:0;transform:translateY(12px);transition-duration:.18s}' +
      '#okbmHomeGuide .hg-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}' +
      '#okbmHomeGuide .hg-icon{width:36px;height:36px;border-radius:9px;flex:none;background:#000 center/cover no-repeat}' +
      '#okbmHomeGuide .hg-title{font-size:.95rem;font-weight:800;line-height:1.3}' +
      '#okbmHomeGuide .hg-sub{font-size:.76rem;color:#9AA0A6;margin-top:2px}' +
      '#okbmHomeGuide .hg-x{margin-left:auto;align-self:flex-start;background:none;border:0;color:#9AA0A6;font-size:20px;line-height:1;padding:2px 4px;cursor:pointer}' +
      '#okbmHomeGuide ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
      '#okbmHomeGuide li{display:flex;align-items:center;gap:10px;font-size:.84rem;line-height:1.4;background:rgba(255,255,255,.04);border-radius:10px;padding:9px 11px}' +
      '#okbmHomeGuide .hg-n{flex:none;width:20px;height:20px;border-radius:50%;background:#FFB547;color:#0E1013;font-size:.72rem;font-weight:900;display:flex;align-items:center;justify-content:center}' +
      '#okbmHomeGuide .hg-k{display:inline-flex;align-items:center;gap:4px;color:#FFB547;font-weight:700;vertical-align:middle}' +
      '#okbmHomeGuide .hg-k svg{vertical-align:-3px}';
    document.head.appendChild(st);
  }

  function close(box, s) {
    s.hiddenAt = Date.now();
    writeState(s);
    metric('home_guide_close', 'click');
    box.classList.remove('on');
    box.classList.add('off');
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 220);
  }

  function show() {
    if (document.getElementById('okbmHomeGuide')) return;
    var s = readState();
    s.shows = (s.shows || 0) + 1;
    writeState(s);
    injectStyle();
    var box = document.createElement('div');
    box.id = 'okbmHomeGuide';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '홈 화면에 낭만루트 추가');
    box.innerHTML =
      '<div class="hg-head">' +
        '<div class="hg-icon" style="background-image:url(/apple-touch-icon.png)"></div>' +
        '<div><div class="hg-title">홈 화면에 낭만루트 추가</div>' +
        '<div class="hg-sub">앱처럼 바로 열려요</div></div>' +
        '<button type="button" class="hg-x" aria-label="닫기">×</button>' +
      '</div>' +
      '<ol>' +
        '<li><span class="hg-n">1</span><span>아래 <span class="hg-k">' + SHARE_ICON + '공유</span> 버튼 누르기<br><span style="color:#9AA0A6;font-size:.74rem">안 보이면 ⋯ 안에 있어요</span></span></li>' +
        '<li><span class="hg-n">2</span><span><span class="hg-k">' + PLUS_ICON + '홈 화면에 추가</span> 누르기</span></li>' +
      '</ol>';
    document.body.appendChild(box);
    box.querySelector('.hg-x').addEventListener('click', function () { close(box, s); });
    metric('home_guide', 'view');
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('on'); }); });
  }

  function start() {
    metric(deviceKind(), 'view');
    if (shouldShow()) setTimeout(show, forced ? 300 : 6000);
  }

  if (document.readyState === 'complete') setTimeout(start, 3000);
  else window.addEventListener('load', function () { setTimeout(start, 3000); });
})();
