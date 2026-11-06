// =========================================================================
// 홈 개편 (2026-10-14): 바로가기 네 개 · 최근 다녀온 후기 · 인기 스팟 "후기 N · 찜 N"
// 시안: 인스타에니/낭만루트_앱점검/미리보기/미리보기.html "1. 첫 화면" 넷째 판
//
// · 바로가기 세 칸(#homeQuickNav [data-quick], 2026-10-31): 레디샷 · 동행 구하기 · 후기 올리기. 누르면 그 화면으로 넘어간다.
//   초보 가이드·박지 랭킹·자유게시판 바로가기는 그 밑 백패커 라운지(#okbmLoungeHome, lounge.js) 알약으로 옮겼다.
// · 최근 다녀온 후기는 운영자 글을 빼고 회원이 공개한 글만, 다녀온 날짜가 최근인 것부터. 개수와 상관없이 바로가기 바로 밑(대표님 10-14).
// · 굴업도 들어가기(2026-11-02, 관리자만): 바로가기 밑 띠. 누르면 로그인 토큰을 주소 뒤 #tok=로 붙여 같이 접속 게임(Cloudflare)을 연다.
//   게임 서버가 그 토큰으로 회원·닉네임을 확인한다. 11-02부터 띠는 비로그인에게도 보이고 누르면 로그인 창.
//   11-02: 회원 모두에게 연다. 들어갈 때 낭만 포인트 15점(낸 때부터 1시간 동안 다시 들어와도 무료 — 11-03 H38, 관리자 무료, 모자라면 못 들어감).
//   입장권은 서버 함수 okbm_gulupdo_pass(SUPABASE_H36)로만 사고, 게임 서버도 같은 함수로 입장권이 있는지 본다.
//   11-03: 앱에서만. 웹은 띠를 누르면 앱 받기 안내, 게임 서버도 낭만루트 틀(iframe)이 아닌 요청엔 안내 화면만 준다.
// · 인라인 핸들러 없음(이벤트 위임) → csp-extract 대상 아님.
// · src 보간은 escapeHtml(okbmSafeImageUrl(...))만 (scripts/check-unsafe-url-interpolation.py).
// =========================================================================
(function () {
  'use strict';
  if (window.__okbmHomeLayoutLoaded) return;
  window.__okbmHomeLayoutLoaded = true;

  var OPERATOR_UID = 'kakao_5060259862'; // 오라네(운영자). romantic-history.js openUserFeedCollectionModal과 같은 값
  var RECENT_LIMIT = 12;
  var RECENT_FETCH = 40; // 사진 없는 글을 거른 뒤에도 날짜 최근 12건이 남도록 더 가져온다

  var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var okbmSafeImageUrl = function (u) {
    return typeof window.okbmSafeImageUrl === 'function' ? window.okbmSafeImageUrl(u) : '';
  };
  // 화면에 보여 줄 사진은 img.romanticroute.kr로(romantic-sync.js okbmFastImageUrl)
  var okbmFastImageUrl = function (u) {
    return typeof window.okbmFastImageUrl === 'function' ? window.okbmFastImageUrl(u) : okbmSafeImageUrl(u);
  };

  // ---------- 모양 ----------
  function injectCss() {
    if (document.getElementById('okbmHomeLayoutCss')) return;
    var css = document.createElement('style');
    css.id = 'okbmHomeLayoutCss';
    css.textContent = [
      // 세 칸을 설명 칸에 바로 붙인다(홈 칸 사이 기본 간격 28px을 당김). 첫 화면에 히어로와 같이 보이게
      '.hq{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 14px;margin-top:-20px}',
      '.hq-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:62px;padding:0 4px;border-radius:14px;background:#0c0d10;border:1px solid rgba(255,255,255,.08);color:#F2F3F5;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '.hq-btn:active{background:#16161a}',
      '.hq-btn b{font-size:14px;font-weight:800;letter-spacing:-.03em;white-space:nowrap}',
      '.hq-btn em{font-style:normal;font-size:11.5px;font-weight:600;color:#8e8e93;white-space:nowrap}',
      '.hq-isle{display:flex;align-items:center;justify-content:space-between;gap:8px;width:calc(100% - 28px);margin:2px 14px -6px;height:62px;padding:0 14px;border-radius:14px;background:#0c0d10;border:1px solid rgba(255,214,120,.25);color:#F2F3F5;font-family:inherit;cursor:pointer}',
      '.hq-isle:active{background:#16161a}',
      // 홈 첫 알림창(지도 map.html의 .okbm-spot-notice와 같은 모양)
      '.hn{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;justify-content:center;align-items:flex-start;padding:calc(var(--okbm-status-top, 12px) + 8px) 12px calc(8px + env(safe-area-inset-bottom, 0px));box-sizing:border-box}',
      '.hn-frame{position:relative;width:min(100%, 480px);max-height:100%;display:flex}',
      '.hn-scroll{width:100%;max-height:100%;overflow:auto;-webkit-overflow-scrolling:touch;border-radius:14px;background:#000}',
      '.hn-scroll img{display:block;width:100%;height:auto}',
      '.hn-act{position:sticky;bottom:0;display:block;width:calc(100% - 32px);margin:0 16px;padding:15px 10px;box-shadow:0 -14px 18px 6px #000;border:0;border-radius:12px;background:#2f9e6a;color:#fff;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer}',
      '.hn-pad{height:14px}',
      '.hn-x{position:absolute;top:10px;right:10px;z-index:2;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.55);color:#fff;font-size:15px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '.hq-isle b{display:flex;align-items:center;gap:7px;font-size:18.5px;font-weight:800;letter-spacing:-.03em}',
      '.hq-isle i{font-style:normal;font-size:10.5px;font-weight:900;letter-spacing:.02em;color:#1a1206;background:#f5b94a;border-radius:5px;padding:3px 6px 2px;line-height:1}',
      '.hq-isle em{font-style:normal;font-size:12.5px;font-weight:700;color:#e0b45a;white-space:nowrap}',
      '.gq-wrap{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);padding:0 12px calc(env(safe-area-inset-bottom) + 84px)}',
      '.gq{width:100%;max-width:420px;border-radius:18px;background:#16171b;border:1px solid rgba(255,255,255,.08);color:#F2F3F5;padding:20px 18px 16px}',
      '.gq h3{margin:0 0 8px;font-size:17px;font-weight:800;letter-spacing:-.02em}',
      '.gq p{margin:0 0 8px;font-size:14px;line-height:1.55;color:#C8CCD3}',
      '.gq p b{color:#e0b45a}',
      '.gq .gq-s{font-size:12.5px;color:#8e8e93}',
      '.gq-b{display:flex;gap:8px;margin-top:14px}',
      '.gq-b button{flex:1;height:46px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#202227;color:#F2F3F5;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer}',
      '.gq-b button.on{background:#e0b45a;border-color:#e0b45a;color:#16171b}',
      '.gq-b button:disabled{opacity:.6}',
      // 백패커 라운지 칸 안 간격 (.hl-wrap 기본 28px보다 촘촘히)
      '#okbmLoungeHome{gap:14px}',
      '#okbmLoungeHome #homeDealStrip{margin:10px 14px 0}',
      '#okbmLoungeHome #okbmHomeMag{margin-top:14px}',
      // 바로가기 밑 두 칸: 왼쪽 이달의 행사, 오른쪽 할인 소식 (lounge.js가 #homeDealStrip에 그린다)
      // 홈 칸 사이 기본 간격(28px)에서 8px을 당겨 바로가기와 20px만 띄운다
      '.hd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:-8px 14px 0;color:#F2F3F5}',
      '.hd-col{min-width:0;border-radius:14px;background:#0c0d10;border:1px solid rgba(255,255,255,.08);padding:11px 9px 3px}',
      '.hd-h{display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:4px;padding:0 2px}',
      '.hd-h b{font-size:13.5px;font-weight:900;letter-spacing:-.02em;white-space:nowrap}',
      '.hd-h b i{font-style:normal;margin-left:3px;font-size:11.5px;font-weight:800;color:#8b8b93}',
      '.hd-h button{flex:none;font:inherit;font-size:11.5px;font-weight:800;color:#8e8e93;background:none;border:0;padding:4px 0;cursor:pointer}',
      '.hd-row{width:100%;display:flex;gap:7px;align-items:flex-start;padding:8px 2px;border:0;border-top:1px solid rgba(255,255,255,.07);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.hd-row:first-of-type{border-top:0}',
      '.hd-row:active{opacity:.6}',
      // 날짜 칸: '~11/20'(52px)이 40px 칸을 넘어 행사 이름과 겹쳤다. 칸을 50px로, '~'는 작게
      '.hd-k{flex:none;width:50px;text-align:center}',
      '.hd-tl{font-style:normal;font-size:10.5px;font-weight:800;margin-right:1px;color:#8b8b93}',
      '.hd-k b{display:block;font-size:14.5px;font-weight:900;letter-spacing:-.04em;line-height:1.1;white-space:nowrap;font-variant-numeric:tabular-nums}',
      // 행사|할인 (2026-10-31): 날짜·할인율은 흰 글씨, 남은 날은 회색 글씨. 오늘·내일만 붉은 글씨(꼬리표 바탕 없음)
      '.hd-k small{display:block;margin-top:3px;font-size:10.5px;font-weight:800;white-space:nowrap;color:#8e8e93}',
      '.hd-k small.hot{color:#ff8a7e}',
      '.hd-x{flex:1;min-width:0;padding-top:1px;font-size:12px;font-weight:700;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all;overflow-wrap:anywhere}',
      // 신청·오픈 일시 한 줄(lounge.js hdText): 제목 밑 금색, 오늘·내일이면 빨강
      '.hd-xw{flex:1;min-width:0;padding-top:1px}',
      '.hd-xw .hd-x{padding-top:0}',
      '.hd-ap{display:block;margin-top:3px;font-size:11px;font-weight:800;font-style:normal;line-height:1.3;color:#ffc342;word-break:keep-all;font-variant-numeric:tabular-nums}',
      '.hd-ap.hot{color:#ff6b6b}',
      '.hd-empty{padding:14px 2px 12px;font-size:11.5px;color:#8b8b93}',
      // 시안: 인기 스팟 제목은 로고 줄 오른쪽(사진 쪽으로 15px 내림), 카드는 이름·숫자·설명·버튼만
      '.header-top-row{display:flex;align-items:center;justify-content:space-between}',
      '.hh-pick{position:relative;top:15px;font-size:13px;font-weight:800;color:#ffd77a;font-variant-numeric:tabular-nums;white-space:nowrap;transition:opacity .3s ease}',
      '.hh-pick.off{opacity:0;pointer-events:none}',
      '#btnHeroAuthorFeed{display:none !important}',
      '.hm-stat{color:#ffd77a}',
      // 시안: 테마 칩은 글자만, 카드는 사진·고도·이름만
      '#heroTrailerSectionWrap .n-cat-chip svg{display:none}',
      '#heroTrailerSectionWrap .n-trailer-author-date{display:none !important}',
      '.hl-head{display:flex;justify-content:space-between;align-items:center;padding-right:14px}',
      '.hl-link{background:none;border:0;padding:0;font-family:inherit;font-size:var(--fs-meta);font-weight:800;color:var(--accent);cursor:pointer}',
      '.tg{display:flex;gap:10px;padding-right:14px}',
      '.tg-box{flex:1;min-width:0;background:#0f1219;border:1px solid #1f2430;border-radius:14px;padding:12px;cursor:pointer;color:#e8ebf2}',
      '.tg-box b{display:block;font-size:14px;font-weight:800}',
      '.tg-box p{font-size:11px;color:#8b93a5;margin:6px 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.tg-act{background:none;border:0;padding:0;font-family:inherit;font-size:12px;font-weight:800;color:#5bb8f0;cursor:pointer}',
      '.hm-stat{flex:none;margin-left:auto;font-size:var(--fs-meta);font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.insta-memo-title-line .insta-memo-spot-title{min-width:0}',
      '.hl-wrap{display:flex;flex-direction:column;gap:28px}',
      '.hl-wrap .lmh:empty{min-height:236px}', // lounge.js가 받기 전 자리만 잡아 둔다
      '.hl-cap{display:flex;justify-content:space-between;align-items:center;padding-right:14px;margin-bottom:8px;font-size:12.5px;font-weight:800;color:var(--tx-3)}',
      '.hr-card{flex:none;width:200px;border-radius:16px;overflow:hidden;background:#171A1F;border:1px solid #2A2F37;cursor:pointer;text-align:left;padding:0;color:inherit;font-family:inherit}',
      '.hr-ph{position:relative;height:130px;background:#20242B}',
      '.hr-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}',
      '.hr-bd{padding:10px 12px 12px}',
      '.hr-who{display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-meta);color:#7D8490;font-weight:700}',
      '.hr-who span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.hr-sp{margin:4px 0;font-size:var(--fs-title);font-weight:800;color:#F2F3F5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hr-mm{font-size:12px;line-height:1.45;color:#A3A9B3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:35px}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ---------- 바로가기 ----------
  function onQuickClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-quick]') : null;
    if (!btn) return;
    var kind = btn.getAttribute('data-quick');
    if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(8); } catch (err) {} }
    // 레디샷: '무게만 빠르게 | 장비로 계산하기'를 고르는 창(readyshot-quick.js). 없으면 예전처럼 계산기
    if (kind === 'ready' && typeof window.okbmOpenReadyShot === 'function') window.okbmOpenReadyShot();
    else if (kind === 'ready' && typeof window.openPlanModal === 'function') window.openPlanModal('calculator');
    else if (kind === 'guide' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(1);
    else if (kind === 'rank' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(3);
    else if (kind === 'board' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(2);
    else if (kind === 'join' && typeof window.openTripJoinListModal === 'function') window.openTripJoinListModal();
    else if (kind === 'write' && typeof window.openPastTripRegisterModal === 'function') {
      // 홈에서 열면 올린 뒤·닫은 뒤 홈으로 돌아온다 (낭만플랜에서 연 것과 같은 처리: 마이리포트로 넘어가지 않음)
      if (typeof isUserLoggedIn !== 'function' || isUserLoggedIn()) window.__pastTripOpenedFromPlan = true;
      window.openPastTripRegisterModal(e);
    }
    else if (kind === 'feed' && typeof window.navigateToDockTab === 'function') window.navigateToDockTab('history');
  }

  // ---------- 굴업도 들어가기(같이 접속 게임, 관리자 시험 중) ----------
  var GULUPDO_URL = 'https://gulupdo.ggumfree.workers.dev/';
  // 11-02 대표님: 비로그인에게도 보이고, 누르면 로그인 창(openGulupdo)
  function gulupdoVisible() { return true; }
  function paintGulupdo() {
    var quick = document.getElementById('homeQuickNav');
    var btn = document.getElementById('homeGulupdo');
    if (!quick || !gulupdoVisible()) { if (btn) btn.remove(); return; }
    if (btn) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'homeGulupdo';
    btn.className = 'hq-isle okbm-press';
    btn.innerHTML = '<b><i>NEW</i>온라인 굴업도로 떠나기</b><em id="homeGulupdoN">접속 인원 확인 중</em>';
    btn.addEventListener('click', openGulupdo);
    quick.insertAdjacentElement('afterend', btn);
    gulupdoCount();
    gulupdoArrive();
  }
  // 지도 첫 알림창 '굴업도로 떠나기'(index.html?go=gulupdo)로 왔으면 띠를 보여 주고 바로 들어가기를 누른 것처럼 연다
  var gulupdoWanted = /[?&]go=gulupdo(&|$)/.test(location.search);
  function gulupdoArrive() {
    if (!gulupdoWanted) return;
    var btn = document.getElementById('homeGulupdo');
    if (!btn) return;
    gulupdoWanted = false;
    try { history.replaceState(history.state, '', location.pathname + location.search.replace(/([?&])go=gulupdo(&|$)/, '$1').replace(/[?&]$/, '') + location.hash); } catch (e) {}
    try { btn.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    setTimeout(openGulupdo, 600);
  }
  // 지금 접속 인원(11-02 대표님: '같이 접속' 대신 '지금 N명 접속'). 홈이 보이는 동안 30초마다
  var gulupdoCountT = 0;
  function gulupdoCount() {
    clearTimeout(gulupdoCountT);
    var em = document.getElementById('homeGulupdoN');
    if (!em) return;
    if (!document.hidden) {
      fetch(GULUPDO_URL + 'count', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var n = d && Number(d.n);
        if (n >= 0 && document.getElementById('homeGulupdoN')) em.textContent = n >= 10 ? '지금 ' + n + '명 접속 중' : '서버 원활';   // 15점은 누르면 확인 창에 나와서 뺌(11-02 대표님). 11-03 대표님: 0명이면 아무도 없어 보여 안 들어올 수 있음 → '서버 원활'. 11-04 대표님: 10명 미만도 '서버 원활', 10명부터 숫자
      }).catch(function () {});
    }
    gulupdoCountT = setTimeout(gulupdoCount, 30000);
  }
  // ---------- 홈 첫 알림창(11-02 대표님: 지도 말고 낭만루터에서 뜨게) ----------
  // 바꿀 때: notice/에 새 그림(820폭)을 넣고 HOME_NOTICE의 id·img·label을 바꾼다. 한 번 닫으면 같은 id는 다시 안 뜬다.
  // 그림 원본: .claude/mockups/app-launch/ad.html?v=notice (11-03 앱 정식 출시, 이전: notice-gulupdo/notice.html)
  var HOME_NOTICE = {
    id: '20261103-app',
    img: '/notice/app-launch-1103.jpg',
    alt: '낭만루트 드디어 정식 출시! 이제 편하게 앱으로 떠나요. 안드로이드는 Google Play, 아이폰은 App Store에서 낭만루트를 검색하세요. 앱 안에서 굴업도 미리 체험도 할 수 있어요.',
    label: '앱 받으러 가기'
  };
  var STORE_PLAY = 'https://play.google.com/store/apps/details?id=com.romanticroute.app';
  var STORE_APPLE = 'https://apps.apple.com/kr/app/id6824809664';
  // 아이폰·아이패드는 앱스토어, 그 밖(안드로이드·PC)은 구글 플레이
  function storeUrl() {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    return ios ? STORE_APPLE : STORE_PLAY;
  }
  function homeNotice() {
    var key = 'okbm_home_notice_id';
    // 앱 안에서는 이미 앱이라 출시 알림을 안 띄운다
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return;
    try { if (localStorage.getItem(key) === HOME_NOTICE.id) return; } catch (e) { return; }
    if (document.getElementById('okbmHomeNotice')) return;
    var root = document.createElement('div');
    root.id = 'okbmHomeNotice';
    root.className = 'hn';
    root.innerHTML = '<div class="hn-frame"><button type="button" class="hn-x" data-metric-click="feat_home_notice_close" aria-label="닫기">✕</button>' +
      '<div class="hn-scroll"><img alt=""><button type="button" class="hn-act" data-metric-click="feat_home_notice_go"></button><div class="hn-pad"></div></div></div>';
    var img = root.querySelector('img');
    img.alt = HOME_NOTICE.alt;
    img.addEventListener('error', function () { root.remove(); });
    img.src = HOME_NOTICE.img + '?v=' + encodeURIComponent(HOME_NOTICE.id);
    root.querySelector('.hn-act').textContent = HOME_NOTICE.label;
    function close() {
      try { localStorage.setItem(key, HOME_NOTICE.id); } catch (e) {}
      root.remove();
    }
    root.querySelector('.hn-x').addEventListener('click', close);
    root.querySelector('.hn-act').addEventListener('click', function () {
      close();
      window.location.href = storeUrl();
    });
    document.body.appendChild(root);
  }
  function gulupdoToast(msg) { if (typeof showToast === 'function') showToast(msg, 'warn'); }
  function gulupdoGo(tok) {
    // 11-03 대표님: 앱에서 바깥 브라우저로 열면 주소창이 뜸 → 앱 화면 위에 꽉 차게 띄운다. 웹은 openGulupdo에서 앱 안내로 막힘
    gulupdoFrame(GULUPDO_URL + '#tok=' + encodeURIComponent(tok));
  }
  function gulupdoFrame(url) {
    if (document.getElementById('gulupdoFrame')) return;
    var w = document.createElement('div'); w.id = 'gulupdoFrame';
    w.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0e1420;';
    var f = document.createElement('iframe'); f.src = url; f.title = '굴업도'; f.setAttribute('allow', 'autoplay; fullscreen; clipboard-write; web-share');   // web-share: 게임 사진 '폰에 저장'(11-03)
    // 틀 안(iframe)에선 게임이 상태바 높이를 못 받아 '건너뛰기' 등이 시계·안테나와 겹침 → 틀을 상태바 아래·홈 막대 위로(앱의 --okbm-status-top: 안드로이드는 최소 32px, 11-03 대표님)
    f.style.cssText = 'position:absolute;left:0;right:0;top:var(--okbm-status-top, env(safe-area-inset-top));width:100%;height:calc(100% - var(--okbm-status-top, env(safe-area-inset-top)) - env(safe-area-inset-bottom, 0px));border:0;display:block;';
    var dock = document.getElementById('romanticMasterBottomDock');   // 아래 메뉴바는 맨 위층이라 게임 위로 비쳐서, 여는 동안 숨긴다
    if (dock) dock.style.setProperty('display', 'none', 'important');
    // 11-03 대표님: 앱을 뒤로 보내도 게임 노래가 계속 남 → 앱이 가려지면 게임에 '멈춤', 돌아오면 '다시'를 알린다(게임이 소리를 멈추고 켠다)
    var post = function (k) { try { f.contentWindow.postMessage({ gulupdo: k }, '*'); } catch (e) {} };
    var onVis = function () { post(document.hidden ? 'pause' : 'resume'); };
    document.addEventListener('visibilitychange', onVis);
    var App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App, appL = null;
    if (App && typeof App.addListener === 'function') { try { Promise.resolve(App.addListener('appStateChange', function (st) { post(st && st.isActive ? 'resume' : 'pause'); })).then(function (h) { appL = h; }); } catch (e) {} }
    var close = function () { if (!w.parentNode) return; if (!confirm('굴업도에서 나갈까요?')) return; w.remove(); document.documentElement.style.overflow = ''; if (dock) dock.style.removeProperty('display'); window.removeEventListener('popstate', onBack); window.removeEventListener('message', onMsg); document.removeEventListener('visibilitychange', onVis); if (appL && appL.remove) appL.remove(); gulupdoCount(); };
    var onBack = function () { if (!w.parentNode) return; history.pushState({ gulupdo: 1 }, ''); if (w.dataset.under) { var L = gulupdoOver(w).filter(function (n) { return !/^gulupdoSheet/.test(n.id); }); if (L.length) L[L.length - 1].remove(); return; } close(); };   // 프로필 창이 위에 있으면 뒤로 가기는 그 창만 닫는다   // 안드로이드 뒤로 가기도 닫기로
    // 닫기는 게임 오른쪽 위 '나가기'(게임이 알려 줌)·안드로이드 뒤로 가기
    var onMsg = function (e) { if (e.source !== f.contentWindow || !e.data) return; if (e.data.gulupdo === 'close') close(); else if (e.data.gulupdo === 'save') gulupdoSave(e.data, f); else if (e.data.gulupdo === 'profile') gulupdoProfile(e.data, w); };
    window.addEventListener('message', onMsg);
    w.appendChild(f); document.body.appendChild(w); document.documentElement.style.overflow = 'hidden';
    try { history.pushState({ gulupdo: 1 }, ''); window.addEventListener('popstate', onBack); } catch (e) {}
  }
  // 11-04 대표님: 게임에서 상대를 눌러 [프로필 보기] → 앱 프로필 창(피드에서 이름 누르면 뜨는 그 창)을 게임 위에 띄운다.
  // 게임 틀이 맨 위층이라, 그동안 새로 뜬 창들 바로 아래로 틀을 내리고, 그 창들이 다 닫히면 다시 맨 위로
  function gulupdoOver(w) {
    var before = w._before || [];
    return Array.prototype.filter.call(document.body.children, function (n) {
      if (n === w || before.indexOf(n) >= 0) return false;
      var s = getComputedStyle(n); return s.position === 'fixed' && s.display !== 'none' && s.visibility !== 'hidden' && n.getBoundingClientRect().height > 0;   // 빈 알림 상자(높이 0)는 안 셈
    });
  }
  function gulupdoProfile(d, w) {
    if (!d.uid || w.dataset.under || typeof window.openUserFeedCollectionModal !== 'function') return;
    w._before = Array.prototype.slice.call(document.body.children); w.dataset.under = '1';
    var t0 = Date.now(), seen = false;
    window.openUserFeedCollectionModal(String(d.nick || ''), String(d.uid)); gulupdoProfSheet(w);
    (function tick() {
      if (!w.parentNode) return;
      gulupdoProfSheet(w);
      var L = gulupdoOver(w);
      if (L.length) { seen = true; var z = Math.min.apply(null, L.map(function (n) { return parseInt(getComputedStyle(n).zIndex, 10) || 1000; })); w.style.zIndex = String(Math.max(1, z - 1)); }
      else if (seen || Date.now() - t0 > 8000) { w.style.zIndex = '2147483647'; delete w.dataset.under; w._before = null; return; }
      setTimeout(tick, 400);
    })();
  }
  // 11-04 대표님(시안 A): 게임 위에선 프로필을 화면 아래 반쪽 창으로. 위쪽엔 게임이 어둡게 보이고, 오른쪽 위 X나 어두운 곳을 누르면 닫힘.
  // 프로필 창(romantic-history.js)은 그대로 두고 자리만 바꾼다. 프로필 창이 메뉴바를 다시 켜므로(ensureMasterBottomDock) 게임 동안엔 계속 숨긴다
  // 11-05: 입장권 확인 창 gulupdoSheet(p, onBuy)와 이름이 같아 뒤의 것이 이 함수를 덮어써서, 프로필이 반쪽이 아닌 전체 창으로 뜨고 입장권 창이 뒤에서 계속 다시 생겼다 → 이름을 나눔
  function gulupdoProfSheet(w) {
    var dock = document.getElementById('romanticMasterBottomDock'); if (dock) dock.style.setProperty('display', 'none', 'important');
    var m = document.getElementById('userFeedCollectionModal'), bg = document.getElementById('gulupdoSheetBg'), x = document.getElementById('gulupdoSheetX');
    if (!m) { if (bg) bg.remove(); if (x) x.remove(); return; }
    var z = parseInt(getComputedStyle(m).zIndex, 10) || 2147483642;
    if (!m.dataset.gsheet) {
      m.dataset.gsheet = '1';
      [['top', '44%'], ['bottom', '0'], ['border-radius', '16px 16px 0 0'], ['overflow', 'hidden']].forEach(function (p) { m.style.setProperty(p[0], p[1], 'important'); });
    }
    var shut = function () { gulupdoOver(w).forEach(function (n) { n.remove(); }); };
    if (!bg) { bg = document.createElement('div'); bg.id = 'gulupdoSheetBg'; bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.35);'; bg.onclick = shut; document.body.appendChild(bg); }
    if (!x) {
      x = document.createElement('button'); x.id = 'gulupdoSheetX'; x.type = 'button'; x.setAttribute('aria-label', '닫기'); x.onclick = shut;
      x.style.cssText = 'position:fixed;right:12px;top:calc(44% - 48px);width:38px;height:38px;padding:0;border:0;border-radius:50%;background:#f2e6c9;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center;cursor:pointer;';
      x.innerHTML = '<svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="#1b2233" stroke-width="2" stroke-linecap="round"/></svg>';
      document.body.appendChild(x);
    }
    bg.style.zIndex = String(z - 1); x.style.zIndex = String(z + 1);
  }
  // 게임 사진 '공유하기'(11-03 대표님: 앱에서 눌러도 반응 없고 저장 안 됨 → 공유 창 하나로): 틀 안에서 공유 창이 막히면 게임이 사진을 넘기고, 여기(앱 화면)서 공유 창을 연다.
  // 답: ok(저장·공유함) · cancel(닫음) · unsupported(이 앱 화면엔 공유 창이 없음, 안드로이드 앱) · fail
  function gulupdoSave(d, f) {
    var reply = function (r) { try { f.contentWindow.postMessage({ gulupdo: 'saved', id: d.id, r: r }, '*'); } catch (e) {} };
    // 안드로이드 앱 0.9.2부터: 웹뷰엔 공유 창이 없어서 앱이 휴대폰 공유 창(인스타·카톡·텔레그램 등)을 연다(11-03 대표님: '공유하기' 하나로)
    var PS = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PhotoSave;
    if (PS && typeof PS.share === 'function' && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('PhotoSave')) {
      Promise.resolve(PS.share({ data: String(d.src).split(',')[1] || '', name: d.name })).then(function () { reply('ok'); }, function () { reply('fail'); });
      return;
    }
    try {
      var bin = atob(String(d.src).split(',')[1] || ''), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      var file = new File([u], d.name || 'gulupdo.jpg', { type: 'image/jpeg' });
      if (!(navigator.canShare && navigator.canShare({ files: [file] }))) return reply('unsupported');
      navigator.share({ files: [file] }).then(function () { reply('ok'); }, function (e) { reply(e && e.name === 'AbortError' ? 'cancel' : 'fail'); });
    } catch (e) { reply('fail'); }
  }
  function gulupdoPass(client, buy) {
    return Promise.resolve(client.rpc('okbm_gulupdo_pass', { p_buy: !!buy })).then(function (r) {
      if (r && r.error) throw r.error;
      return r && r.data;
    });
  }
  // 11-03 대표님: 굴업도는 앱에서만. 웹은 띠는 두고 누르면 앱 받기 안내(포인트도 안 뺌). 게임 서버도 낭만루트 앱 틀이 아니면 화면을 안 준다
  function isNativeApp() { return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()); }
  function gulupdoAppOnly() {
    var old = document.getElementById('gulupdoSheet'); if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'gulupdoSheet';
    wrap.className = 'gq-wrap';
    wrap.innerHTML = '<div class="gq" role="dialog" aria-modal="true" aria-labelledby="gqTitle">' +
      '<h3 id="gqTitle">굴업도는 앱에서만 열려요</h3>' +
      '<p>낭만루트 앱을 받고 홈의 \'온라인 굴업도로 떠나기\'를 눌러 주세요.</p>' +
      '<div class="gq-b"><button type="button" data-gq="x">닫기</button><button type="button" data-gq="store" class="on">앱 받으러 가기</button></div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-gq]') : null;
      if (e.target === wrap || (b && b.getAttribute('data-gq') === 'x')) return wrap.remove();
      if (b && b.getAttribute('data-gq') === 'store') { wrap.remove(); window.location.href = storeUrl(); }
    });
  }
  function openGulupdo() {
    if (!isNativeApp()) return gulupdoAppOnly();
    var client = window.supabaseClient;
    if (!client || !client.auth || typeof client.auth.getSession !== 'function' || typeof client.rpc !== 'function') return gulupdoToast('로그인 서버에 연결할 수 없습니다.');
    var btn = document.getElementById('homeGulupdo');
    if (btn) btn.disabled = true;
    var done = function () { if (btn) btn.disabled = false; };
    Promise.resolve(client.auth.getSession()).then(function (res) {
      var ses = res && res.data && res.data.session;
      if (!ses || !ses.access_token) {
        done();
        if (typeof window.openLoginModal === 'function') return window.openLoginModal({ message: '로그인하면 굴업도로 떠날 수 있어요.' });
        return gulupdoToast('로그인한 뒤 들어갈 수 있어요.');
      }
      // 게임에는 로그인 표(1시간짜리)만 넘어가서, 오래된 표면 새로 받아 넘긴다(11-02: 잠깐 나갔다 오면 다시 못 붙던 원인)
      var fresh = ses.expires_at && ses.expires_at * 1000 - Date.now() > 50 * 60 * 1000;
      return (fresh || typeof client.auth.refreshSession !== 'function' ? Promise.resolve(ses) : Promise.resolve(client.auth.refreshSession()).then(function (r) {
        return (r && r.data && r.data.session) || ses;
      }, function () { return ses; })).then(function (s2) { return s2.access_token; });
    }).then(function (tok) {
      if (!tok) return;
      return gulupdoPass(client, false).then(function (p) {
        done();
        if (p && p.ok) return gulupdoGo(tok);   // 관리자거나 1시간 안에 산 입장권이 있음
        gulupdoSheet(p || {}, function () {
          return gulupdoPass(client, true).then(function (q) {
            if (q && q.ok) return gulupdoGo(tok);
            gulupdoToast(q && q.short ? '낭만 포인트가 모자라요.' : '잠시 뒤 다시 눌러 주세요.');
          });
        });
      });
    }).catch(function () { done(); gulupdoToast('잠시 뒤 다시 눌러 주세요.'); });
  }
  // 확인 창: 처음 한 번은 무료, 두 번째부터 15점. 포인트가 모자라면 받는 법만(11-06 대표님)
  function gulupdoSheet(p, onBuy) {
    var price = Number(p.price) || 15, bal = Math.max(0, Number(p.balance) || 0);
    var firstFree = !!p.first_free, short = !firstFree && bal < price;
    var old = document.getElementById('gulupdoSheet'); if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'gulupdoSheet';
    wrap.className = 'gq-wrap';
    wrap.innerHTML = '<div class="gq" role="dialog" aria-modal="true" aria-labelledby="gqTitle">' +
      '<h3 id="gqTitle">' + (short ? '낭만 포인트가 모자라요' : '굴업도로 떠날까요?') + '</h3>' +
      '<p>' + (short
        ? '같이 접속하려면 낭만 포인트 ' + price + '점이 필요해요. 지금 ' + bal + '점이에요.<br>낭만 포인트는 피드 올리기, 댓글, 별 누르기, 출석, 설문 참여 등으로 모을 수 있어요.'
        : firstFree
          ? '처음은 <b>무료</b>예요! 낭만 포인트는 빠지지 않아요.<br>다음부터는 낭만 포인트 ' + price + '점이 빠져요.'
          : '낭만 포인트 <b>' + price + '점</b>을 쓰고 굴업도로 떠나요.<br>지금 ' + bal + '점 → ' + (bal - price) + '점') + '</p>' +
      (short ? '<p class="gq-s">자세한 받는 법은 낭만리포트 › 낭만 포인트에서 볼 수 있어요.</p>' : '<p class="gq-s">한 번 들어가면 1시간 동안은 다시 들어와도 빠지지 않아요.</p>') +
      '<div class="gq-b">' + (short
        ? '<button type="button" data-gq="x">닫기</button><button type="button" data-gq="pt" class="on">받는 법 보기</button>'
        : '<button type="button" data-gq="x">취소</button><button type="button" data-gq="buy" class="on">' + (firstFree ? '무료로 들어가기' : price + '점 쓰고 들어가기') + '</button>') +
      '</div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-gq]') : null;
      if (e.target === wrap || (b && b.getAttribute('data-gq') === 'x')) return wrap.remove();
      if (b && b.getAttribute('data-gq') === 'pt') { wrap.remove(); if (window.okbmPoints && typeof window.okbmPoints.open === 'function') window.okbmPoints.open(); return; }   // 11-03 대표님: 자세히 어디서 보는지
      if (b && b.getAttribute('data-gq') === 'buy') {
        b.disabled = true; b.textContent = '들어가는 중…';
        Promise.resolve(onBuy()).catch(function () { gulupdoToast('잠시 뒤 다시 눌러 주세요.'); }).then(function () { wrap.remove(); });
      }
    });
  }

  // ---------- 최근 다녀온 후기 ----------
  var recentList = [];
  function parseArr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim().charAt(0) === '[') { try { return JSON.parse(v); } catch (e) {} }
    if (typeof v === 'string' && v.trim().indexOf('https://') === 0) return [v.trim()];
    return [];
  }
  // index-main.js fetchCommunityFeeds와 같은 모양으로 바꾼다 (피드 창이 그대로 쓴다)
  function normalize(r) {
    return {
      id: r.id,
      userId: r.user_id,
      spot: r.spot || r.spot_name || '백패킹 필드',
      spotId: r.spot_id || '',
      elevation: r.elevation || '',
      weightKg: r.weight_kg != null ? String(r.weight_kg) : '',
      date: r.date || '',
      memo: r.memo || '',
      oneLineMemo: r.memo || '',
      templateId: r.template_id || 1,
      likes: r.likes_count != null ? Number(r.likes_count) : 0,
      createdAt: r.created_at || '',
      isPublished: r.is_published !== false,
      is_published: r.is_published === true,
      photos: parseArr(r.photos),
      items: parseArr(r.items),
      author: r.author || '낭만백패커',
      nick: r.author || '낭만백패커',
      photoMemos: parseArr(r.photo_memos_json || r.photo_memos),
      instagram: String(r.instagram || '').trim()
    };
  }
  function firstPhoto(f) {
    var list = typeof window.okbmPublicPhotoUrls === 'function' ? window.okbmPublicPhotoUrls(f) : (f.photos || []);
    var u = (list || []).find(function (x) { return typeof x === 'string' && x.indexOf('https://') === 0; });
    return u || '';
  }
  function shortDate(f) {
    var p = String(f.date || f.createdAt || '').match(/\d+/g);
    return p && p.length >= 3 ? (String(p[1]).padStart(2, '0') + '.' + String(p[2]).padStart(2, '0')) : '';
  }
  // 카드에 보이는 다녀온 날짜. 연-월-일 숫자. 날짜가 없으면 올린 날.
  function tripDateNum(f) {
    var p = String((f && f.date) || '').match(/\d+/g);
    var y = 0;
    var m = 0;
    var d = 0;
    if (p && p.length >= 3) {
      if (String(p[0]).length === 4) { y = +p[0]; m = +p[1]; d = +p[2]; }
      else if (String(p[2]).length === 4) { y = +p[2]; m = +p[0]; d = +p[1]; }
    }
    if (!(y && m && d)) {
      var iso = String((f && f.createdAt) || '').match(/(\d{4})-(\d{2})-(\d{2})/);
      if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
    }
    return (y && m && d) ? (y * 10000 + m * 100 + d) : 0;
  }
  function byTripDateDesc(a, b) {
    var diff = tripDateNum(b) - tripDateNum(a);
    if (diff) return diff;
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  }
  function cardHtml(f) {
    var photo = firstPhoto(f);
    var spot = String(f.spot || '').replace(/\s*\(.*?\)/g, '').trim() || '백패킹 필드';
    var memo = String(f.oneLineMemo || f.memo || '').replace(/\s+/g, ' ').trim();
    return '<button type="button" class="hr-card okbm-press" data-recent-id="' + escapeHtml(f.id) + '" aria-label="' + escapeHtml(spot + ' 후기 보기') + '">' +
      '<div class="hr-ph">' + (photo ? '<img src="' + escapeHtml(okbmFastImageUrl(photo)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div class="hr-bd"><div class="hr-who"><span>' + escapeHtml(f.author) + '</span><span>' + escapeHtml(shortDate(f)) + '</span></div>' +
      '<div class="hr-sp">' + escapeHtml(spot) + '</div>' +
      '<div class="hr-mm">' + escapeHtml(memo) + '</div></div></button>';
  }
  function visibleRecent() {
    var list = recentList.filter(function (f) {
      if (typeof window.okbmIsHomePublicFeed === 'function' && !window.okbmIsHomePublicFeed(f)) return false;
      if (typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc({ id: f.id, user_id: f.userId })) return false;
      return !!firstPhoto(f);
    });
    return list.sort(byTripDateDesc).slice(0, RECENT_LIMIT);
  }
  function renderRecent() {
    var sec = document.getElementById('homeRecentReviews');
    var rail = document.getElementById('homeRecentReviewsRail');
    if (!sec || !rail) return;
    var list = visibleRecent();
    if (!list.length) { sec.hidden = true; return; }
    var html = list.map(cardHtml).join('');
    if (rail.__okbmHtml !== html) { rail.innerHTML = html; rail.__okbmHtml = html; }
    sec.hidden = false;
  }
  function loadRecent() {
    var base = window.SUPABASE_URL;
    if (!base || typeof window.okbmPublicFetch !== 'function') return Promise.resolve();
    var select = window.FEEDS_HOME_SELECT || 'id,user_id,spot,spot_id,elevation,weight_kg,date,memo,photos,photo_memos_json,author,instagram,likes_count,is_published,feed_type,created_at,items,template_id';
    var url = base + '/rest/v1/feeds?select=' + encodeURIComponent(select) +
      '&is_published=eq.true&user_id=neq.' + encodeURIComponent(OPERATOR_UID) +
      '&order=date.desc.nullslast,created_at.desc&limit=' + RECENT_FETCH;
    return window.okbmPublicFetch(url).then(function (res) {
      if (!res.ok) throw new Error('recent feeds ' + res.status);
      return res.json();
    }).then(function (rows) {
      recentList = (Array.isArray(rows) ? rows : []).map(normalize);
      renderRecent();
    }).catch(function (e) { console.warn('[home-layout:loadRecent]', e); });
  }
  function onRecentClick(e) {
    var card = e.target && e.target.closest ? e.target.closest('[data-recent-id]') : null;
    if (!card) return;
    var id = card.getAttribute('data-recent-id');
    if (typeof window.openSingleTripDualFeedModal !== 'function') return;
    // 목록을 넘기면 누른 글 아래 다음 글이 이어서 붙는다. 홈에서는 그 글만 연다.
    var one = visibleRecent().filter(function (f) { return String(f.id) === String(id); });
    if (one.length) window.openSingleTripDualFeedModal(id, one, '최근 다녀온 후기');
  }

  // ---------- 인기 스팟 "후기 N · 찜 N" ----------
  var statToken = 0;
  var reviewCache = {};
  function reviewCount(record, master) {
    var base = window.SUPABASE_URL;
    var name = String(record.spot || '').trim();
    var sid = master && master.id != null ? String(master.id).trim() : '';
    var key = sid + '|' + name;
    if (reviewCache[key] != null) return Promise.resolve(reviewCache[key]);
    if (!base || typeof window.okbmPublicFetch !== 'function' || (!sid && !name)) return Promise.resolve(0);
    var conds = [];
    if (sid) conds.push('spot_id.eq.' + sid);
    if (name) conds.push('spot.eq."' + name.replace(/["\\]/g, '') + '"');
    var url = base + '/rest/v1/feeds?select=id&is_published=eq.true&or=' + encodeURIComponent('(' + conds.join(',') + ')');
    return window.okbmPublicFetch(url, { method: 'HEAD', headers: { Prefer: 'count=exact' } }).then(function (res) {
      if (!res.ok) throw new Error('review count ' + res.status);
      var m = String(res.headers.get('content-range') || '').match(/\/(\d+)$/);
      var n = m ? Number(m[1]) : 0;
      reviewCache[key] = n;
      return n;
    });
  }
  window.okbmHomeHeroStat = function (record, master) {
    var el = document.getElementById('heroStatText');
    if (!el || !record) return;
    var my = ++statToken;
    var sid = master && master.id != null ? String(master.id).trim() : '';
    var bm = (sid && typeof window.okbmFetchSpotBookmarkCounts === 'function')
      ? window.okbmFetchSpotBookmarkCounts([sid]).then(function (m) { return Number(m[sid]) || 0; })
      : Promise.resolve(0);
    Promise.all([reviewCount(record, master).catch(function () { return 0; }), bm.catch(function () { return 0; })]).then(function (r) {
      if (my !== statToken) return; // 그새 다른 카드로 넘겼다
      var parts = [];
      if (r[0] > 0) parts.push('후기 ' + r[0]);
      if (r[1] > 0) parts.push('찜 ' + r[1]);
      el.textContent = parts.join(' · ');
      el.hidden = !parts.length;
    });
  };

  // ---------- 바로가기 '동행 구하기' 밑 한 줄: 모집 중인 동행 수 ----------
  window.okbmHomeTogetherTrips = function (activeTrips) {
    var el = document.getElementById('hqJoinSub');
    if (!el) return;
    var open = (activeTrips || []).filter(function (t) { return !t.isClosed; });
    el.textContent = open.length ? ('모집 중 ' + open.length) : '오픈채팅';
  };
  function onTogetherClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-together="trip-new"]')) {
      if (typeof window.openTripCreateModal === 'function') window.openTripCreateModal();
      return;
    }
    if (t.closest('#homeTogetherTrip') && typeof window.openTripJoinListModal === 'function') window.openTripJoinListModal();
  }

  // ---------- 헤더의 "이주의 인기 피드": 헤더는 따라 내려오므로, 인기 스팟 사진이 화면에 있을 때만 보인다 ----------
  function watchHeroPick() {
    var pick = document.querySelector('.hh-pick');
    var card = document.getElementById('instaMainCard');
    if (!pick || !card || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      pick.classList.toggle('off', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(card);
  }

  // ---------- 시작 ----------
  function start() {
    injectCss();
    var quick = document.getElementById('homeQuickNav');
    if (quick) quick.addEventListener('click', onQuickClick);
    paintGulupdo();
    window.addEventListener('okbm_admin_flag', paintGulupdo);
    [2000, 6000, 15000].forEach(function (ms) { setTimeout(paintGulupdo, ms); });   // 로그인·프로필이 늦게 와도 다시 본다
    homeNotice();
    var sec = document.getElementById('homeRecentReviews');
    if (sec) {
      sec.addEventListener('click', onQuickClick);
      sec.addEventListener('click', onRecentClick);
    }
    watchHeroPick();
    var trip = document.getElementById('homeTogetherTrip');
    if (trip) trip.addEventListener('click', onTogetherClick);
    loadRecent();
    // 박지 목록이 온 뒤 인기 스팟 숫자를 다시 맞춘다 (먼저 그려졌으면 찜 수가 빠져 있다)
    if (window.__okbmSpotsBootReady && typeof window.__okbmSpotsBootReady.then === 'function') {
      window.__okbmSpotsBootReady.then(function () {
        if (typeof window.okbmRefreshHeroStat === 'function') window.okbmRefreshHeroStat();
      });
    }
    // 차단·신고로 숨길 글이 바뀌면 다시 거른다
    var orig = window.rerenderCommunityFeedsNow;
    if (typeof orig === 'function' && !orig.__okbmHomeLayout) {
      var wrapped = function () {
        var r = orig.apply(this, arguments);
        try { renderRecent(); } catch (e) { console.warn('[home-layout:rerender]', e); }
        return r;
      };
      wrapped.__okbmHomeLayout = true;
      window.rerenderCommunityFeedsNow = wrapped;
    }
  }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
