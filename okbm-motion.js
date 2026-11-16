// =========================================================================
// 누를 때 반응하는 작은 움직임 모음 (2026-11-16, 대표님. 시안 mockups/motion/index.html)
//
// 1. starPop     낭만피드 별: 튀고, 노란 고리·빛 조각이 퍼지고, 숫자가 굴러 들어온다(romantic-history.js)
// 2. thanks*     고마워요: 누르면 하트가 뛰며 차오르고, 보내지면 체크가 그려진다(spot-thanks.js)
// 3. points      내 리포트 포인트 칸: 마지막으로 본 숫자에서 자리마다 굴러 올라간다(romantic-points.js)
//    COIN        포인트 알림 앞 동전(한 바퀴 돈다)
// 4. upBusy/upDone/upFail  지난 기록 '올리기': 동그라미로 줄어 돌다가 초록 체크, 실패면 흔들고 '다시 올리기'(romantic-sync.js)
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

  function starPop(btn, on) {
    var icon = btn && btn.querySelector('svg');
    if (!icon || !canAnimate(icon)) return;
    var count = btn.querySelector('.js-feed-star-count') || btn.querySelector('[id^="feedStarCountText_"]');
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
    ring.style.left = c.x + 'px';
    ring.style.top = c.y + 'px';
    btn.appendChild(ring);
    ring.animate([
      { opacity: 0.9, transform: 'scale(.3)', borderWidth: '3px' },
      { opacity: 0, transform: 'scale(1.75)', borderWidth: '0.5px' }
    ], { duration: 500, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { ring.remove(); };
    sparks(btn, c.x, c.y, 8, 17, [STAR, '#ffffff', '#fbbf24']);
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
    upFail: upFail
  };
})();
