// =========================================================================
// 누를 때 반응하는 작은 움직임 모음 (2026-11-16, 대표님. 시안 mockups/motion/index.html)
//
// 1. starPop     낭만피드 별: 튀고, 노란 고리·빛 조각이 퍼지고, 숫자가 굴러 들어온다(romantic-history.js)
// 2. thanks*     고마워요: 누르면 하트가 뛰며 차오르고, 보내지면 체크가 그려진다(spot-thanks.js)
// 3. points      내 리포트 포인트 칸: 마지막으로 본 숫자에서 자리마다 굴러 올라간다(romantic-points.js)
//    COIN        포인트 알림 앞 동전(한 바퀴 돈다)
// 4. upBusy/upDone/upFail  지난 기록 '올리기': 동그라미로 줄어 돌다가 초록 체크, 실패면 흔들고 '다시 올리기'(romantic-sync.js)
// 5. starPop(btn, on, {colors, ring, count})  라운지 하트도 같은 움직임을 분홍으로(lounge.js, 11-17)
// 7. 고른 표시 미끄러짐: 홈 테마 칩·라운지 정렬 단추에서 고른 표시가 누른 칸으로 미끄러진다(11-17, 시안 7번)
//    단추가 다시 그려져도 되게, 누르기 전 자리와 다시 그린 뒤 자리를 재서 잠깐 띄운 알약을 옮긴다
// 8. flyIn / flyBack: 누른 카드 사진이 그대로 커져 창 사진이 되고, 닫으면 그 카드 자리로 돌아간다(홈 테마 스팟·매거진, 11-17 시안 6·10번)
// 9. profileIn: 피드에서 누른 동그란 사진이 프로필 머리 자리로 날아가고 숫자가 굴러 들어온다. 창이 닫히면 사진이 돌아간다(user-profile.js, 11-17 시안 9번)
// 10. bookify: 매거진 카드뉴스(4:5)를 옆 스크롤 대신 책장처럼 한 장씩 넘긴다. 누르거나 옆으로 밀면 넘어간다(lounge.js, 11-17 시안 10번)
// 6. pullRefresh  낭만피드 맨 위에서 당기면 로고 산이 드러나고 해가 떠오른다. 놓으면 새로 받는다(romantic-history.js, 11-17)
//    로고 산 모양은 인스타에니/로고/등장_해돋이/조각/산.geojson을 옮긴 것(영상 끝 카드 해돋이와 같은 움직임)
//
// 폰에서 '움직임 줄이기'를 켰으면 튀거나 흔드는 움직임 없이 상태만 바뀐다.
// =========================================================================
(function () {
  if (window.okbmMotion) return;

  var STAR = '#fde047';
  var CSS = [
    '.okm-spark{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;pointer-events:none;z-index:30}',
    '.okm-ring{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid ' + STAR + ';pointer-events:none;z-index:29;opacity:0}',
    '.okbm-thx-b.okm-going{position:relative;overflow:hidden;isolation:isolate}',
    '.okbm-thx-b.okm-going::before{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(251,191,36,0.16);transform-origin:left center;animation:okmFill .42s cubic-bezier(.3,.7,.2,1) forwards;z-index:-1}',
    '.okbm-thx-b.okm-going svg{animation:okmBeat .36s ease-in-out;color:#ff4d6d}',
    '.okbm-thx-b.okm-sent{position:relative;overflow:visible}',
    '.okbm-thx-b.okm-sent svg path{stroke-dasharray:24;stroke-dashoffset:24;animation:okmDraw .34s .05s ease-out forwards}',
    '.okm-odo{display:inline-flex;align-items:flex-start;height:1.15em;line-height:1.15em;overflow:hidden;vertical-align:bottom}',
    '.okm-odo .okm-col{display:flex;flex-direction:column;flex:none}',
    '.okm-odo .okm-col span{height:1.15em;text-align:center}',
    '.okm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.okm-gain{position:absolute;bottom:.35em;font-size:15px;font-weight:800;color:#fbbf24;pointer-events:none;white-space:nowrap;font-variant-numeric:tabular-nums}',
    '.okm-gain.big{font-size:17px;color:' + STAR + '}',
    '.okm-glow{animation:okmGlow 1.1s ease-out}',
    '.okm-coin{display:block;width:16px;height:16px;color:#fbbf24;animation:okmCoin .7s .1s ease-in-out}',
    '.okm-up{display:block!important;margin-left:auto!important;margin-right:auto!important;transition:width .32s cubic-bezier(.4,0,.2,1),border-radius .32s,background-color .25s,border-color .25s!important;overflow:hidden;position:relative}',
    '.okm-up.okm-small{width:46px!important;border-radius:23px!important;padding:0!important}',
    '.okm-up svg.okm-spin{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px 0 0 -14px;animation:okmSpin .9s linear infinite}',
    '.okm-up.okm-ok{background:#34d399!important;border-color:#34d399!important}',
    '.okm-up svg.okm-tick{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px 0 0 -14px}',
    '.okm-up svg.okm-tick path{stroke-dasharray:26;stroke-dashoffset:26;animation:okmDraw .32s .06s ease-out forwards}',
    '.okm-up.okm-shake{animation:okmShake .42s ease-in-out}',
    '.okm-ptr{position:fixed;z-index:2147483000;height:0;overflow:hidden;background:#000;pointer-events:none;display:flex;align-items:center;justify-content:center}',
    '.okm-ptr svg{width:46px;height:44px;overflow:visible;display:block;flex:none}',
    '.okm-ptr .okm-ptr-glow{opacity:0;transform-box:fill-box;transform-origin:center}',
    '.okm-ptr.okm-loading .okm-ptr-glow{animation:okmSunGlow 1.2s ease-in-out infinite}',
    '.okm-ptr.okm-flash .okm-ptr-glow{animation:okmSunFlash .8s ease-out}',
    '@keyframes okmSunGlow{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:.85;transform:scale(1.25)}}',
    '@keyframes okmSunFlash{0%{opacity:0;transform:scale(.9)}15%{opacity:1;transform:scale(1.5)}100%{opacity:0;transform:scale(1.7)}}',
    '.okm-seg-anim>button,.okm-seg-anim>.n-cat-chip{position:relative;z-index:1;transition:none!important}',
    '.okm-seg-anim>.on,.okm-seg-anim>.active{background:transparent!important;box-shadow:none!important;border-color:transparent!important}',
    '.okm-seg-pill{position:absolute;z-index:0;pointer-events:none}',
    '.hm-view.okm-book{position:relative;display:block;overflow:visible;aspect-ratio:4/5;perspective:1100px;margin:12px 0 0;touch-action:pan-y}',
    '.hm-view.okm-book img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:left center;backface-visibility:hidden;-webkit-backface-visibility:hidden}',
    '.okm-book-dots{display:flex;gap:5px;justify-content:center;margin-top:10px}',
    '.okm-book-dots i{width:5px;height:5px;border-radius:3px;background:rgba(255,255,255,.3);transition:width .3s,background-color .3s}',
    '.okm-book-dots i.on{width:14px;background:#fff}',
    '@keyframes okmFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}',
    '@keyframes okmBeat{0%{transform:scale(1)}35%{transform:scale(1.35)}60%{transform:scale(.9)}100%{transform:scale(1)}}',
    '@keyframes okmDraw{to{stroke-dashoffset:0}}',
    '@keyframes okmGlow{0%{box-shadow:0 0 0 0 rgba(251,191,36,0)}25%{box-shadow:0 0 0 2px rgba(251,191,36,.55),0 0 28px rgba(251,191,36,.25)}100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}}',
    '@keyframes okmCoin{to{transform:rotateY(360deg)}}',
    '@keyframes okmSpin{to{transform:rotate(360deg)}}',
    '@keyframes okmShake{0%,100%{translate:0}20%{translate:-6px}40%{translate:6px}60%{translate:-4px}80%{translate:3px}}',
    '@media (prefers-reduced-motion: reduce){.okbm-thx-b.okm-going::before,.okbm-thx-b.okm-going svg,.okbm-thx-b.okm-sent svg path,.okm-glow,.okm-coin,.okm-up.okm-shake,.okm-up svg.okm-tick path{animation-duration:1ms!important;animation-delay:0ms!important}.okm-up{transition-duration:1ms!important}}'
  ].join('\n');

  function injectCss() {
    if (document.getElementById('okbmMotionCss')) return;
    var st = document.createElement('style');
    st.id = 'okbmMotionCss';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  injectCss();

  function reduce() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function canAnimate(el) { return !!(el && typeof el.animate === 'function') && !reduce(); }

  // host 안 (x, y)에서 빛 조각을 사방으로 뿌린다
  function sparks(host, x, y, n, dist, colors) {
    if (!canAnimate(host)) return;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'okm-spark';
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.background = colors[i % colors.length];
      host.appendChild(s);
      var a = (Math.PI * 2 * i) / n + (i % 2 ? 0.25 : 0);
      var d = dist + (i % 2 ? -4 : 3);
      var dx = Math.cos(a) * d, dy = Math.sin(a) * d;
      var anim = s.animate([
        { transform: 'translate(0,0) scale(1.2)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.8).toFixed(1) + 'px,' + (dy * 0.8).toFixed(1) + 'px) scale(1)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(0.2)', opacity: 0 }
      ], { duration: 560 + (i % 3) * 60, easing: 'cubic-bezier(.2,.6,.35,1)', fill: 'forwards' });
      anim.onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }
  function centerIn(host, el) {
    var h = host.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
  }
  function ensurePositioned(el) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  }

  // 새 숫자가 아래(또는 위)에서 밀려 들어온다. 글자 자체는 그대로 두어 innerText로 읽는 곳이 안 깨진다
  function rollIn(el, up) {
    if (!canAnimate(el)) return;
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.animate([
      { transform: 'translateY(' + (up ? 70 : -70) + '%)', opacity: 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  function starPop(btn, on, opts) {
    opts = opts || {};
    var icon = btn && btn.querySelector('svg');
    if (!icon || !canAnimate(icon)) return;
    var count = opts.count || btn.querySelector('.js-feed-star-count') || btn.querySelector('[id^="feedStarCountText_"]');
    if (count) rollIn(count, on);
    if (!on) {
      icon.animate([{ transform: 'scale(1)' }, { transform: 'scale(.78)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'ease-out' });
      return;
    }
    icon.animate([
      { transform: 'scale(.7) rotate(-12deg)' },
      { transform: 'scale(1.32) rotate(6deg)', offset: 0.45 },
      { transform: 'scale(.94)', offset: 0.7 },
      { transform: 'scale(1)' }
    ], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
    ensurePositioned(btn);
    var c = centerIn(btn, icon);
    var ring = document.createElement('span');
    ring.className = 'okm-ring';
    if (opts.ring) ring.style.borderColor = opts.ring;
    ring.style.left = c.x + 'px';
    ring.style.top = c.y + 'px';
    btn.appendChild(ring);
    ring.animate([
      { opacity: 0.9, transform: 'scale(.3)', borderWidth: '3px' },
      { opacity: 0, transform: 'scale(1.75)', borderWidth: '0.5px' }
    ], { duration: 500, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ring.remove(); };
    sparks(btn, c.x, c.y, 8, 17, opts.colors || [STAR, '#ffffff', '#fbbf24']);
  }

  // 고마워요: 누른 순간(서버 답 전)
  function thanksPress(btn) {
    if (!btn || reduce()) return;
    btn.classList.add('okm-going');
  }
  function thanksCancel(btn) {
    if (btn) btn.classList.remove('okm-going');
  }
  // 보내진 뒤 다시 그려진 '고마워했어요' 단추
  function thanksDone(btn) {
    if (!btn || reduce()) return;
    btn.classList.add('okm-sent');
    var host = btn.parentNode;
    if (!host) return;
    ensurePositioned(host);
    var c = centerIn(host, btn);
    sparks(host, c.x - btn.offsetWidth / 2 + 14, c.y, 6, 22, ['#fbbf24', STAR, '#ff4d6d']);
  }

  // 자리마다 0~9를 두 번 쌓은 띠. 작아지는 자리(8→2)도 아래로 되감지 않고 위로 넘어간다
  function odometer(el, from, to, ms) {
    var a = Number(from).toLocaleString('ko-KR'), b = Number(to).toLocaleString('ko-KR');
    if (!canAnimate(el)) { el.textContent = b; return; }
    var oldDigits = a.replace(/\D/g, '');
    var pad = b.replace(/\D/g, '').length - oldDigits.length;
    var html = '';
    b.split('').forEach(function (ch) {
      if (!/\d/.test(ch)) { html += '<span>' + ch + '</span>'; return; }
      var s = '';
      for (var k = 0; k < 20; k++) s += '<span>' + (k % 10) + '</span>';
      html += '<span class="okm-col" data-d="' + ch + '">' + s + '</span>';
    });
    el.innerHTML = '<span class="okm-odo" aria-hidden="true">' + html + '</span><span class="okm-sr">' + b + '</span>';
    var cols = el.querySelectorAll('.okm-odo .okm-col');
    cols.forEach(function (col, i) {
      var oi = i - pad;
      var od = oi >= 0 ? Number(oldDigits[oi]) : 0;
      var nd = Number(col.getAttribute('data-d'));
      var target = nd >= od ? nd : nd + 10;
      col.style.transform = 'translateY(' + (-target * 5) + '%)';
      if (target === od) return;
      col.animate([
        { transform: 'translateY(' + (-od * 5) + '%)' },
        { transform: 'translateY(' + (-target * 5) + '%)' }
      ], { duration: ms + i * 70, delay: i * 25, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    });
  }

  // 포인트 칸(romantic-points.js cardHtml)을 prev → next로 굴린다
  function points(box, prev, next, dayMax) {
    var gain = next.bal - prev.bal;
    if (!box || gain <= 0) return;
    var balEl = box.querySelector('.pt-row b');
    if (!balEl) return;
    var big = gain >= 100;
    odometer(balEl, prev.bal, next.bal, big ? 1100 : (gain >= 20 ? 800 : 520));
    if (!canAnimate(box)) return;
    var todayEl = box.querySelector('.pt-row > i');
    if (todayEl && next.today > prev.today) rollIn(todayEl, true);
    var bar = box.querySelector('.pt-bar u');
    if (bar && next.today > prev.today && dayMax) {
      bar.animate([
        { width: Math.min(100, Math.round(prev.today / dayMax * 100)) + '%' },
        { width: Math.min(100, Math.round(next.today / dayMax * 100)) + '%' }
      ], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    var row = box.querySelector('.pt-row');
    var em = row && row.querySelector(':scope > em');
    if (row) {
      ensurePositioned(row);
      var chip = document.createElement('span');
      chip.className = 'okm-gain' + (big ? ' big' : '');
      chip.textContent = '+' + gain.toLocaleString('ko-KR');
      chip.style.left = (balEl.offsetWidth + (em ? em.offsetWidth : 0) + 14) + 'px';
      row.appendChild(chip);
      chip.animate([
        { transform: 'translateY(10px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1, offset: 0.25 },
        { transform: 'translateY(-14px)', opacity: 0 }
      ], { duration: big ? 1300 : 950, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).onfinish = function () { chip.remove(); };
    }
    if (big) {
      box.classList.remove('okm-glow');
      void box.offsetWidth;
      box.classList.add('okm-glow');
    }
  }

  var COIN = '<svg class="okm-coin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 9.5c0-1.4 1.3-2 3-2s3 .7 3 2-1.3 1.8-3 2.3-3 1-3 2.3 1.3 2.2 3 2.2 3-.7 3-2"/></svg>';

  // 올리기 단추. 누르는 동안 막는 일(disabled)은 부르는 쪽이 한다
  var SPIN = '<svg class="okm-spin" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="3"/><circle cx="14" cy="14" r="11" fill="none" stroke="#000" stroke-width="3" stroke-linecap="round" stroke-dasharray="69.1" stroke-dashoffset="50"/></svg>';
  var TICK = '<svg class="okm-tick" viewBox="0 0 28 28" aria-hidden="true"><path d="M7.5 14.5l4.3 4.3L20.5 10" fill="none" stroke="#04130c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function upBusy(btn) {
    if (!btn) return;
    if (btn.dataset.okmLabel == null) btn.dataset.okmLabel = btn.textContent;
    if (btn.dataset.okmWidth == null) btn.dataset.okmWidth = btn.style.width;
    btn.style.width = btn.offsetWidth + 'px';
    btn.classList.add('okm-up');
    void btn.offsetWidth;
    btn.classList.add('okm-small');
    btn.innerHTML = SPIN;
    btn.setAttribute('aria-label', '올리는 중');
  }
  function upDone(btn, next) {
    if (!btn || !btn.classList.contains('okm-up')) { next(); return; }
    btn.classList.add('okm-ok');
    btn.innerHTML = TICK;
    btn.setAttribute('aria-label', '올렸어요');
    setTimeout(next, reduce() ? 0 : 520);
  }
  function upFail(btn, label) {
    if (!btn) return;
    function restore() {
      btn.classList.remove('okm-small', 'okm-ok', 'okm-shake');
      btn.textContent = label || btn.dataset.okmLabel || '';
      btn.removeAttribute('aria-label');
      setTimeout(function () { btn.classList.remove('okm-up'); btn.style.width = btn.dataset.okmWidth || ''; }, 340);
    }
    if (!btn.classList.contains('okm-up') || reduce()) { restore(); return; }
    btn.classList.add('okm-shake');
    setTimeout(restore, 440);
  }

  var DROP = 320;
  var LOGO = '<svg viewBox="0 -10 1060 850" aria-hidden="true"><defs>' +
    '<radialGradient id="okmPtrGlow"><stop offset="0" stop-color="#fdb602" stop-opacity=".9"/><stop offset=".55" stop-color="#fdb602" stop-opacity=".35"/><stop offset="1" stop-color="#fdb602" stop-opacity="0"/></radialGradient>' +
    '<mask id="okmPtrMask" maskUnits="userSpaceOnUse" x="-300" y="-500" width="1700" height="1700"><rect x="-300" y="-500" width="1700" height="1700" fill="#fff"/><path fill="#000" d="M636 134L631 135L625 137L619 139L613 142L608 145L603 149L598 153L594 157L589 162L583 171L575 182L566 195L556 209L546 223L537 237L529 250L528 252L526 255L525 257L523 259L522 262L521 264L519 266L518 267L517 269L515 272L512 276L509 282L505 288L501 294L497 301L492 308L488 315L484 322L480 328L477 333L474 338L471 341L470 344L469 345L468 346L467 348L466 350L464 354L461 357L459 361L456 366L453 370L445 383L439 393L434 401L430 406L428 410L427 412L426 414L425 414L424 415L424 415L424 416L424 416L423 416L423 416L423 416L423 416L422 415L421 413L418 409L415 404L411 398L406 390L400 380L393 369L386 357L380 348L374 340L369 334L364 330L359 326L353 323L346 320L342 319L338 318L333 317L328 317L323 317L318 317L313 318L308 319L304 320L300 322L296 324L292 326L289 328L286 330L282 333L279 336L276 339L274 342L271 345L267 351L261 360L252 373L241 392L225 417L217 430L209 443L201 456L194 468L187 478L181 488L176 495L173 501L170 506L167 510L164 515L162 520L159 524L156 528L154 531L152 534L145 546L137 559L128 574L118 590L109 604L101 618L94 628L90 636L87 640L85 643L83 647L80 651L78 654L76 658L74 661L72 664L71 666L69 669L67 672L65 676L63 679L61 683L58 686L56 690L54 693L52 697L49 702L45 708L42 713L38 719L35 725L32 730L25 741L20 749L17 756L14 761L12 766L11 771L11 775L10 780L10 784L10 786L10 789L10 791L10 792L11 794L11 796L12 798L14 804L17 809L21 814L25 818L29 822L34 826L39 828L45 830L56 831L80 832L113 832L150 832L187 832L220 832L244 831L256 830L261 829L266 827L271 824L275 820L280 814L285 807L291 797L299 785L310 767L319 753L325 742L330 735L333 730L335 728L336 726L336 726L336 726L337 727L338 728L339 730L340 732L342 735L344 738L347 743L348 745L349 747L351 750L353 753L355 757L357 761L360 765L362 769L365 773L367 778L370 782L372 786L375 790L377 794L379 798L381 801L385 807L389 812L393 817L397 821L401 824L406 827L410 829L416 831L420 831L430 831L448 832L475 832L514 832L565 832L631 832L713 832L1005 832L1012 830L1020 826L1028 822L1034 816L1039 809L1043 802L1046 793L1047 785L1046 776L1046 772L1045 769L1044 765L1043 762L1041 758L1038 753L1035 747L1032 740L1027 733L1023 725L1019 718L1014 710L1009 700L1004 690L997 678L990 664L986 657L982 650L978 643L974 637L971 631L968 625L965 621L964 618L962 615L960 611L958 608L956 604L954 600L952 596L950 593L948 590L946 586L944 583L942 579L940 575L938 572L936 568L934 565L933 562L931 560L929 556L927 552L924 547L921 542L918 536L915 531L912 526L910 520L907 515L904 510L902 506L900 502L898 498L896 496L895 494L894 492L893 491L892 489L891 486L890 484L888 482L887 480L886 478L876 461L865 440L851 415L836 389L821 362L806 336L792 312L781 291L778 286L775 281L772 276L769 271L767 266L764 262L762 259L761 256L757 250L752 241L746 231L740 220L734 209L727 198L721 188L716 180L713 175L711 170L708 167L706 164L704 161L702 159L700 157L698 154L692 149L685 144L678 140L670 137L662 135L654 134L645 133Z"/></mask>' +
    '<clipPath id="okmPtrClip"><rect class="okm-ptr-rect" x="0" y="840" width="1060" height="0"/></clipPath></defs>' +
    '<circle class="okm-ptr-glow" cx="646" cy="155" r="300" fill="url(#okmPtrGlow)"/>' +
    '<g mask="url(#okmPtrMask)"><circle class="okm-ptr-sun" cx="646" cy="155" r="147" fill="#fdb602" transform="translate(0 ' + DROP + ')"/></g>' +
    '<g clip-path="url(#okmPtrClip)"><path fill="#f5f5f5" fill-rule="evenodd" d="M636 134L631 135L625 137L619 139L613 142L608 145L603 149L598 153L594 157L589 162L583 171L575 182L566 195L556 209L546 223L537 237L529 250L528 252L526 255L525 257L523 259L522 262L521 264L519 266L518 267L517 269L515 272L512 276L509 282L505 288L501 294L497 301L492 308L488 315L484 322L480 328L477 333L474 338L471 341L470 344L469 345L468 346L467 348L466 350L464 354L461 357L459 361L456 366L453 370L445 383L439 393L434 401L430 406L428 410L427 412L426 414L425 414L424 415L424 415L424 416L424 416L423 416L423 416L423 416L423 416L422 415L421 413L418 409L415 404L411 398L406 390L400 380L393 369L386 357L380 348L374 340L369 334L364 330L359 326L353 323L346 320L342 319L338 318L333 317L328 317L323 317L318 317L313 318L308 319L304 320L300 322L296 324L292 326L289 328L286 330L282 333L279 336L276 339L274 342L271 345L267 351L261 360L252 373L241 392L225 417L217 430L209 443L201 456L194 468L187 478L181 488L176 495L173 501L170 506L167 510L164 515L162 520L159 524L156 528L154 531L152 534L145 546L137 559L128 574L118 590L109 604L101 618L94 628L90 636L87 640L85 643L83 647L80 651L78 654L76 658L74 661L72 664L71 666L69 669L67 672L65 676L63 679L61 683L58 686L56 690L54 693L52 697L49 702L45 708L42 713L38 719L35 725L32 730L25 741L20 749L17 756L14 761L12 766L11 771L11 775L10 780L10 784L10 786L10 789L10 791L10 792L11 794L11 796L12 798L14 804L17 809L21 814L25 818L29 822L34 826L39 828L45 830L56 831L80 832L113 832L150 832L187 832L220 832L244 831L256 830L261 829L266 827L271 824L275 820L280 814L285 807L291 797L299 785L310 767L319 753L325 742L330 735L333 730L335 728L336 726L336 726L336 726L337 727L338 728L339 730L340 732L342 735L344 738L347 743L348 745L349 747L351 750L353 753L355 757L357 761L360 765L362 769L365 773L367 778L370 782L372 786L375 790L377 794L379 798L381 801L385 807L389 812L393 817L397 821L401 824L406 827L410 829L416 831L420 831L430 831L448 832L475 832L514 832L565 832L631 832L713 832L1005 832L1012 830L1020 826L1028 822L1034 816L1039 809L1043 802L1046 793L1047 785L1046 776L1046 772L1045 769L1044 765L1043 762L1041 758L1038 753L1035 747L1032 740L1027 733L1023 725L1019 718L1014 710L1009 700L1004 690L997 678L990 664L986 657L982 650L978 643L974 637L971 631L968 625L965 621L964 618L962 615L960 611L958 608L956 604L954 600L952 596L950 593L948 590L946 586L944 583L942 579L940 575L938 572L936 568L934 565L933 562L931 560L929 556L927 552L924 547L921 542L918 536L915 531L912 526L910 520L907 515L904 510L902 506L900 502L898 498L896 496L895 494L894 492L893 491L892 489L891 486L890 484L888 482L887 480L886 478L876 461L865 440L851 415L836 389L821 362L806 336L792 312L781 291L778 286L775 281L772 276L769 271L767 266L764 262L762 259L761 256L757 250L752 241L746 231L740 220L734 209L727 198L721 188L716 180L713 175L711 170L708 167L706 164L704 161L702 159L700 157L698 154L692 149L685 144L678 140L670 137L662 135L654 134L645 133ZM654 216L654 217L656 218L657 221L659 223L661 226L663 230L665 233L667 237L670 241L673 246L676 251L679 256L682 262L685 267L688 273L691 277L694 282L697 288L701 294L704 300L708 306L712 312L715 318L718 323L721 328L724 333L726 337L728 341L730 344L732 346L732 348L733 348L734 350L735 352L738 356L742 363L747 372L754 384L762 399L773 418L778 426L782 434L787 442L791 449L795 456L798 461L800 465L802 468L803 470L804 471L805 473L805 474L806 476L806 477L807 478L807 478L806 479L804 481L801 483L798 485L796 487L793 489L790 491L789 492L787 492L785 492L783 493L781 493L779 493L777 493L775 492L773 492L772 491L770 490L768 488L765 485L762 482L758 477L753 472L747 466L729 446L715 431L703 419L694 410L687 404L681 400L675 396L669 394L660 391L652 389L643 388L634 388L626 389L617 391L608 393L600 397L584 406L572 418L562 432L555 446L551 462L550 479L552 495L558 511L558 512L560 514L561 516L563 519L564 521L566 524L568 526L569 529L576 537L580 543L584 549L588 553L591 557L593 560L596 564L599 568L603 573L609 580L615 589L622 598L630 608L637 618L644 627L651 636L654 640L656 643L659 647L662 650L664 653L666 656L668 658L669 660L675 668L683 679L693 693L704 707L714 722L725 736L734 749L742 760L748 769L593 769L439 768L432 756L430 754L428 750L426 747L423 743L421 739L419 735L416 731L414 727L412 723L410 720L407 716L405 712L403 709L401 706L400 703L398 701L397 699L395 696L393 692L391 688L388 684L385 679L382 674L380 670L375 661L371 655L369 650L368 647L368 644L368 642L370 639L373 634L374 633L376 631L377 629L378 627L380 624L382 622L383 619L384 616L386 614L388 611L389 609L391 606L392 604L394 602L395 600L396 598L400 591L405 583L411 573L418 563L424 552L431 541L437 531L443 522L449 512L455 503L460 494L465 486L470 479L474 472L478 466L481 460L488 450L495 438L502 427L509 416L516 405L522 396L526 388L530 383L531 380L533 377L535 374L537 371L539 367L542 364L544 360L546 358L547 354L550 351L552 348L554 344L556 341L558 338L560 335L561 333L563 330L565 327L567 324L569 320L572 316L575 311L577 307L580 303L583 299L586 294L589 289L592 284L596 278L599 273L602 268L605 264L607 260L610 255L613 251L616 246L619 242L621 238L624 235L625 232L629 226L632 221L634 218L637 216L638 214L640 214L642 213L645 213L647 213L648 213L649 213L650 214L651 214L652 214L653 215ZM341 417L344 421L347 425L349 430L352 434L354 437L356 441L358 444L359 446L360 448L362 450L364 454L366 458L369 462L372 467L375 471L377 476L380 480L383 485L385 488L387 492L388 495L390 497L390 498L390 499L389 499L387 499L382 499L377 499L370 499L363 500L355 500L346 500L333 500L323 500L315 500L309 500L304 500L301 500L298 501L296 501L285 506L275 513L267 522L262 532L258 543L258 554L260 566L264 578L266 582L268 586L271 591L274 596L278 603L281 609L285 615L288 620L289 622L290 624L292 627L293 629L294 631L296 634L297 636L298 638L304 648L298 658L296 662L293 667L290 673L286 680L280 688L275 698L267 710L259 724L256 730L252 735L249 741L246 746L243 750L241 754L239 758L237 760L232 768L161 769L90 769L93 764L94 763L95 761L96 759L98 756L100 753L102 750L104 747L106 744L108 740L110 736L113 731L116 726L120 720L123 715L126 710L129 706L132 701L134 696L137 692L140 688L142 684L144 681L145 679L146 677L147 675L149 673L150 671L152 668L154 664L156 661L158 658L160 654L165 647L169 641L172 636L174 631L177 628L179 624L182 620L184 615L186 612L188 609L190 606L192 603L194 600L196 597L197 594L199 592L200 589L202 586L205 582L207 577L210 573L213 568L216 563L219 558L222 554L224 550L227 545L230 541L232 538L234 535L235 532L236 531L237 530L238 528L239 526L240 524L242 522L243 520L244 517L246 515L247 513L249 509L252 505L255 501L258 496L261 490L264 484L268 479L271 473L275 468L279 462L282 456L286 450L289 445L291 441L294 438L296 434L298 431L300 427L302 423L305 419L307 416L309 412L311 410L315 403L318 398L322 395L324 395L328 396L331 401L336 407ZM646 451L647 452L649 453L650 454L652 456L654 458L656 460L658 462L660 465L684 490L702 510L716 524L727 535L736 542L744 547L751 550L760 552L768 554L776 555L784 555L792 554L800 552L808 549L816 546L825 541L827 540L829 539L830 538L832 537L833 537L834 536L834 536L835 537L837 539L841 546L847 557L855 570L863 584L872 599L880 614L888 628L890 632L894 638L898 646L903 655L909 665L915 675L920 685L926 696L932 705L938 717L945 729L952 740L958 751L962 760L966 766L967 768L966 769L962 769L956 769L947 769L937 769L926 769L913 769L900 769L832 769L822 755L819 752L817 748L814 745L811 741L809 737L806 734L804 731L802 728L787 708L770 686L752 662L734 639L718 616L703 596L690 581L682 570L675 561L669 554L665 548L660 542L656 537L650 530L644 522L635 511L628 503L623 496L619 491L616 487L615 484L614 480L613 478L613 474L614 468L616 462L620 457L624 453L629 450L634 449L640 449ZM355 558L355 558L354 559L354 560L352 562L351 564L350 566L348 569L346 572L343 577L341 580L339 583L338 584L336 583L335 581L333 578L331 574L330 573L329 571L328 570L327 568L326 567L325 565L325 564L324 563L323 562L323 561L322 560L322 559L322 558L321 558L321 558L321 557L321 557L322 557L324 557L326 557L328 557L331 557L335 557L338 557L341 557L345 557L348 557L350 557L352 557L354 557L355 558Z"/></g></svg>';

  // 세로로 넘기는 scroller 맨 위에서 아래로 당기면 로고가 드러나고, 문턱을 넘겨 놓으면 onRefresh(약속)를 부른다
  function pullRefresh(scroller, onRefresh) {
    if (!scroller || scroller.__okmPtr) return;
    scroller.__okmPtr = true;
    var NEED = 72, HOLD = 64, MAX = 130, H = 840;
    var sx = 0, sy = 0, pull = 0, active = false, decided = false, busy = false;
    var ind = null, rect = null, sun = null, sunUp = false, sunY = DROP, raf = 0;

    function makeIndicator() {
      var r = scroller.getBoundingClientRect();
      ind = document.createElement('div');
      ind.className = 'okm-ptr';
      ind.innerHTML = LOGO;
      ind.style.top = r.top + 'px';
      ind.style.left = r.left + 'px';
      ind.style.width = r.width + 'px';
      document.body.appendChild(ind);
      rect = ind.querySelector('.okm-ptr-rect');
      sun = ind.querySelector('.okm-ptr-sun');
      sunUp = false; sunY = DROP;
    }
    function moveSun(up) {
      if (sunUp === up || !sun) return;
      sunUp = up;
      if (up && typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(8); } catch (e) {} }
      var from = sunY, to = up ? 0 : DROP, t0 = performance.now(), dur = reduce() ? 1 : (up ? 420 : 240), el = sun;
      cancelAnimationFrame(raf);
      (function step(now) {
        var k = Math.min(1, (now - t0) / dur);
        sunY = from + (to - from) * (1 - Math.pow(1 - k, 3));
        el.setAttribute('transform', 'translate(0 ' + sunY.toFixed(1) + ')');
        if (k < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    function setY(y, animate) {
      var tr = animate ? 'cubic-bezier(.2,.9,.3,1.15)' : '';
      scroller.style.transition = animate ? 'transform .45s ' + tr : 'none';
      scroller.style.transform = y ? 'translateY(' + y + 'px)' : '';
      if (ind) {
        ind.style.transition = animate ? 'height .45s ' + tr : 'none';
        ind.style.height = y + 'px';
      }
    }
    function draw(p) {
      var k = Math.min(1, p / NEED);
      rect.setAttribute('y', (H * (1 - k)).toFixed(1));
      rect.setAttribute('height', (H * k).toFixed(1));
      moveSun(k >= 1);
    }
    function finish() {
      busy = true;
      setY(0, true);
      setTimeout(function () {
        if (ind) ind.remove();
        ind = null;
        scroller.style.transition = '';
        busy = false;
      }, 460);
    }

    scroller.addEventListener('touchstart', function (e) {
      active = !busy && e.touches.length === 1 && scroller.scrollTop <= 0;
      if (!active) return;
      decided = false;
      pull = 0;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    scroller.addEventListener('touchmove', function (e) {
      if (!active) return;
      var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (!decided) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        decided = true;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || scroller.scrollTop > 0) { active = false; return; }
        makeIndicator();
      }
      e.preventDefault();
      pull = Math.min(MAX, Math.max(0, dy) * 0.5);
      setY(pull, false);
      draw(pull);
    }, { passive: false });
    function release() {
      if (!active) return;
      active = false;
      if (!decided || !ind) return;
      if (pull < NEED) { finish(); return; }
      busy = true;
      setY(HOLD, true);
      ind.classList.add('okm-loading');
      var shown = ind;
      Promise.resolve().then(onRefresh).catch(function (e) { console.warn('[okbm-motion:pullRefresh]', e); }).then(function () {
        shown.classList.remove('okm-loading');
        shown.classList.add('okm-flash');
        setTimeout(finish, 450);
      });
    }
    scroller.addEventListener('touchend', release);
    scroller.addEventListener('touchcancel', release);
  }

  var SEG_BTN = '.lm-seg>button,.lm-sseg>button,.netflix-category-bar>.n-cat-chip';
  function segKind(box) {
    return ['lm-seg', 'lm-sseg', 'netflix-category-bar'].filter(function (c) { return box.classList.contains(c); })[0];
  }
  function segOn(box) {
    return box.querySelector(':scope>.on,:scope>.active');
  }
  // 다시 그려져 바뀐 줄은 같은 종류·같은 이름표 가운데 원래 자리에 가장 가까운 것으로 찾는다
  function findSeg(old) {
    if (old.box.isConnected) return old.box;
    var best = null, bestD = 1e9;
    document.querySelectorAll('.' + old.kind).forEach(function (b) {
      if ((b.getAttribute('aria-label') || '') !== old.label) return;
      var r = b.getBoundingClientRect();
      var d = Math.abs(r.top - old.rect.top) + Math.abs(r.left - old.rect.left);
      if (r.width && d < bestD) { best = b; bestD = d; }
    });
    return bestD < 60 ? best : null;
  }
  function slideSeg(old) {
    var box = findSeg(old);
    var on = box && segOn(box);
    if (!on || on.getBoundingClientRect().width === 0) return;
    // 막 바뀐 단추는 색이 옮아가는 중이라, 옮김을 끄고 다 바뀐 색을 읽는다
    on.style.transition = 'none';
    var cs = getComputedStyle(on);
    var look = { bg: cs.backgroundColor, shadow: cs.boxShadow, radius: cs.borderRadius };
    var br = box.getBoundingClientRect(), to = on.getBoundingClientRect();
    if (Math.abs(to.left - old.from.left) < 2 && Math.abs(to.top - old.from.top) < 2) { on.style.transition = ''; return; }
    ensurePositioned(box);
    var pill = document.createElement('span');
    pill.className = 'okm-seg-pill';
    pill.style.background = look.bg;
    pill.style.boxShadow = look.shadow;
    pill.style.borderRadius = look.radius;
    var x0 = old.from.left - br.left + box.scrollLeft, y0 = old.from.top - br.top + box.scrollTop;
    var x1 = to.left - br.left + box.scrollLeft, y1 = to.top - br.top + box.scrollTop;
    pill.style.left = '0px'; pill.style.top = '0px';
    box.insertBefore(pill, box.firstChild);
    box.classList.add('okm-seg-anim');
    pill.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px)', width: old.from.width + 'px', height: old.from.height + 'px' },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px)', width: to.width + 'px', height: to.height + 'px' }
    ], { duration: 380, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' }).onfinish = function () {
      box.classList.remove('okm-seg-anim');
      on.style.transition = 'none';
      void on.offsetWidth;
      pill.remove();
      requestAnimationFrame(function () { on.style.transition = ''; });
    };
    if (box.scrollWidth > box.clientWidth + 2) {
      var want = x1 - (box.clientWidth - to.width) / 2;
      box.scrollTo({ left: Math.max(0, want), behavior: 'smooth' });
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest(SEG_BTN);
    if (!b || reduce()) return;
    var box = b.parentElement, on = segOn(box);
    if (!on || on === b) return;
    var old = { box: box, kind: segKind(box), label: box.getAttribute('aria-label') || '', rect: box.getBoundingClientRect(), from: on.getBoundingClientRect() };
    setTimeout(function () { slideSeg(old); }, 0);
  }, true);

  function visibleRect(el) {
    if (!el || !el.isConnected) return null;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
    return r;
  }
  function ghostAt(r, src, radius) {
    var g = document.createElement('div');
    g.style.cssText = 'position:fixed;z-index:2147483000;overflow:hidden;pointer-events:none;background:#17171b;left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;border-radius:' + radius;
    if (src) g.innerHTML = '<img src="' + String(src).replace(/"/g, '&quot;') + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block">';
    document.body.appendChild(g);
    return g;
  }
  function flyBox(g, r0, r1, rad0, rad1, ms) {
    return g.animate([
      { left: r0.left + 'px', top: r0.top + 'px', width: r0.width + 'px', height: r0.height + 'px', borderRadius: rad0 },
      { left: r1.left + 'px', top: r1.top + 'px', width: r1.width + 'px', height: r1.height + 'px', borderRadius: rad1 }
    ], { duration: ms, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' });
  }
  // fromImg(카드 사진) → toBox(창 안 사진 칸). host는 막 붙인 창 전체
  function flyIn(fromImg, toBox, host, opts) {
    opts = opts || {};
    // 창을 열며 화면 스크롤을 잠그면 그 순간 카드 자리가 틀리게 재지므로, 부르는 쪽이 열기 전에 잰 자리(opts.fromRect)를 먼저 쓴다
    var r0 = opts.fromRect || visibleRect(fromImg), r1 = toBox && toBox.getBoundingClientRect();
    if (!r0 || !r1 || !r1.width || !canAnimate(toBox)) return;
    var g = ghostAt(r0, fromImg.currentSrc || fromImg.src, opts.r0 || '12px');
    toBox.style.visibility = 'hidden';
    fromImg.style.visibility = 'hidden';
    if (host) host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    flyBox(g, r0, r1, opts.r0 || '12px', opts.r1 || '16px', 400).onfinish = function () {
      toBox.style.visibility = '';
      fromImg.style.visibility = '';
      g.remove();
    };
  }
  // 창을 닫을 때: fromBox(창 사진 칸) → toImg(돌아갈 카드 사진). 창은 부르는 쪽이 바로 지운다
  function flyBack(fromBox, toImg, opts) {
    opts = opts || {};
    var r0 = fromBox && fromBox.getBoundingClientRect(), r1 = visibleRect(toImg);
    if (!r0 || !r0.width || !r1 || reduce()) return;
    var g = ghostAt(r0, toImg.currentSrc || toImg.src, opts.r1 || '16px');
    toImg.style.visibility = 'hidden';
    flyBox(g, r0, r1, opts.r1 || '16px', opts.r0 || '12px', 340).onfinish = function () {
      toImg.style.visibility = '';
      g.remove();
    };
  }

  // 피드에서 프로필을 여는 단추(data-metric-click="feat_user_feed_open")를 누르면 그 안 사진을 기억해 둔다
  var lastAvatarTap = null;
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('[data-metric-click="feat_user_feed_open"]');
    if (!b) return;
    var img = b.querySelector('img');
    lastAvatarTap = img && img.getBoundingClientRect().width ? { img: img, at: Date.now() } : null;
  }, true);

  // 프로필 창 머리(paintHeader)를 그릴 때마다 부른다. 누른 사진이 있으면 한 번만 날리고, 숫자가 생긴 첫 그림에서 한 번 굴린다
  function profileIn(modal) {
    if (!modal || reduce()) return;
    var av = modal.querySelector('.mr-av');
    if (lastAvatarTap && Date.now() - lastAvatarTap.at < 2500 && av) {
      var tap = lastAvatarTap;
      lastAvatarTap = null;
      modal.__okmRoll = true;
      var r0 = visibleRect(tap.img), r1 = av.getBoundingClientRect();
      if (r0 && r1.width) {
        var g = ghostAt(r0, tap.img.currentSrc || tap.img.src, '50%');
        av.style.visibility = 'hidden';
        flyBox(g, r0, r1, '50%', '50%', 420).onfinish = function () { av.style.visibility = ''; g.remove(); };
        watchProfileClose(modal, tap.img);
      }
    }
    if (modal.__okmRoll) {
      var nums = modal.querySelectorAll('.mr-stats .mr-st b');
      var ready = nums.length && Array.prototype.every.call(nums, function (b) { return /\d/.test(b.textContent); });
      if (ready) {
        modal.__okmRoll = false;
        nums.forEach(function (b, k) { setTimeout(function () { rollIn(b, true); }, 160 + k * 70); });
      }
    }
  }
  // 창이 문서에서 빠지는 순간, 마지막으로 잰 머리 사진 자리에서 피드 사진 자리로 돌려보낸다
  function watchProfileClose(modal, img) {
    var last = null;
    function measure() {
      var av = modal.querySelector('.mr-av');
      last = av ? av.getBoundingClientRect() : null;
    }
    setTimeout(measure, 450);
    modal.addEventListener('scroll', measure, true);
    var mo = new MutationObserver(function () {
      if (modal.isConnected) return;
      mo.disconnect();
      var r1 = visibleRect(img);
      if (!last || !last.width || last.bottom < 0 || !r1 || reduce()) return;
      var g = ghostAt(last, img.currentSrc || img.src, '50%');
      img.style.visibility = 'hidden';
      flyBox(g, last, r1, '50%', '50%', 340).onfinish = function () { img.style.visibility = ''; g.remove(); };
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function bookify(view) {
    var pages = view ? Array.prototype.slice.call(view.querySelectorAll(':scope > img')) : [];
    if (pages.length < 2 || view.__okmBook) return null;
    view.__okmBook = true;
    view.classList.add('okm-book');
    var dots = document.createElement('div');
    dots.className = 'okm-book-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = pages.map(function () { return '<i></i>'; }).join('');
    view.parentNode.insertBefore(dots, view.nextSibling);
    var cur = 0, busy = false;
    function layout() {
      pages.forEach(function (pg, i) {
        pg.style.zIndex = String(pages.length - i);
        pg.style.transform = i < cur ? 'rotateY(-100deg)' : '';
        pg.style.visibility = i < cur ? 'hidden' : '';
        pg.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
      });
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === cur); });
    }
    function turn(dir) {
      var next = cur + dir;
      if (busy || next < 0 || next >= pages.length) return;
      if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(6); } catch (e) {} }
      var pg = dir > 0 ? pages[cur] : pages[next];
      if (reduce() || !pg.animate) { cur = next; layout(); return; }
      busy = true;
      pg.style.visibility = '';
      var a = dir > 0 ? ['rotateY(0deg)', 'rotateY(-100deg)'] : ['rotateY(-100deg)', 'rotateY(0deg)'];
      var f = dir > 0 ? ['brightness(1)', 'brightness(.55)'] : ['brightness(.55)', 'brightness(1)'];
      pg.animate([{ transform: a[0], filter: f[0] }, { transform: a[1], filter: f[1] }], { duration: 520, easing: 'cubic-bezier(.45,.05,.3,1)' }).onfinish = function () {
        cur = next; layout(); busy = false;
      };
    }
    var sx = null, sy = null, swiped = false;
    view.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; swiped = false; });
    view.addEventListener('pointerup', function (e) {
      if (sx == null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; turn(dx < 0 ? 1 : -1); }
    });
    view.addEventListener('click', function (e) {
      if (swiped) { swiped = false; return; }
      var r = view.getBoundingClientRect();
      turn(e.clientX - r.left > r.width * 0.4 ? 1 : -1);
    });
    layout();
    return { current: function () { return pages[cur]; } };
  }

  window.okbmMotion = {
    starPop: starPop,
    rollIn: rollIn,
    thanksPress: thanksPress,
    thanksCancel: thanksCancel,
    thanksDone: thanksDone,
    points: points,
    COIN: COIN,
    upBusy: upBusy,
    upDone: upDone,
    upFail: upFail,
    pullRefresh: pullRefresh,
    flyIn: flyIn,
    flyBack: flyBack,
    profileIn: profileIn,
    bookify: bookify
  };
})();
