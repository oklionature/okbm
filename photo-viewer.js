// =========================================================================
// 사진 크게 보기 창 (지도 map.html·홈 라운지 index.html 공용)
// 지도: 검수함 근거 사진·야영금지 근거 사진. 라운지: 글 사진(대표님 11-11).
// okbmOpenPhotoViewer(사진 주소 목록, 처음 열 번호, 아래 설명). 여러 장이면 좌우 단추나 밀어서 넘긴다.
// =========================================================================
(function () {
  'use strict';

  var escapeHtml = function(text) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var okbmSafeImageUrl = function(url) {
    return (typeof window.okbmSafeImageUrl === 'function') ? window.okbmSafeImageUrl(url) : '';
  };

  window.okbmOpenPhotoViewer = function(urls, startIndex, caption) {
    var list = (Array.isArray(urls) ? urls : []).map(function(u) { return okbmSafeImageUrl(u); }).filter(Boolean);
    if (!list.length) return;
    var idx = Math.max(0, Math.min(list.length - 1, parseInt(startIndex, 10) || 0));
    window.okbmClosePhotoViewer();
    var overlay = document.createElement('div');
    overlay.id = 'okbmPhotoViewer';
    overlay.style.cssText = 'position:fixed; inset:0; z-index:2147483647; background:rgba(0,0,0,0.92); display:flex; flex-direction:column; padding:calc(10px + env(safe-area-inset-top, 0px)) 10px calc(14px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;';
    var navBtn = 'width:40px; height:40px; border-radius:50%; border:none; background:rgba(255,255,255,0.14); color:#ffffff; font-size:1rem; font-weight:900; cursor:pointer;';
    overlay.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; flex-shrink:0; min-height:36px;">' +
        '<span class="js-photo-count" style="font-size:0.78rem; font-weight:800; color:#cbd5e1;"></span>' +
        '<button type="button" class="js-photo-close" aria-label="닫기" style="width:36px; height:36px; border-radius:50%; border:none; background:rgba(255,255,255,0.14); color:#ffffff; font-size:0.95rem; font-weight:900; cursor:pointer;">✕</button>' +
      '</div>' +
      '<div class="js-photo-stage" style="flex:1; min-height:0; display:flex; align-items:center; justify-content:center; overflow:hidden; touch-action:none;">' +
        '<img class="js-photo-img" alt="" draggable="false" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:6px; display:block; transform-origin:0 0; user-select:none; -webkit-user-select:none;">' +
      '</div>' +
      (caption ? '<div style="flex-shrink:0; margin-top:8px; text-align:center; font-size:0.74rem; color:#cbd5e1;">' + escapeHtml(caption) + '</div>' : '') +
      '<div style="flex-shrink:0; margin-top:4px; text-align:center; font-size:0.66rem; color:#94a3b8;">두 손가락으로 벌리거나 두 번 눌러 확대</div>' +
      (list.length > 1
        ? '<div style="flex-shrink:0; display:flex; justify-content:center; gap:28px; margin-top:10px;">' +
            '<button type="button" class="js-photo-prev" aria-label="이전 사진" style="' + navBtn + '">◀</button>' +
            '<button type="button" class="js-photo-next" aria-label="다음 사진" style="' + navBtn + '">▶</button>' +
          '</div>'
        : '');
    var img = overlay.querySelector('.js-photo-img');
    var count = overlay.querySelector('.js-photo-count');
    // 확대: 두 손가락 벌리기·두 번 누르기·PC 휠. 확대한 상태에선 한 손가락으로 끌어 옮기고, 원래 크기일 때만 밀어서 넘긴다.
    var zoom = { s: 1, x: 0, y: 0 };
    var applyZoom = function() {
      if (zoom.s <= 1.01) { zoom.s = 1; zoom.x = 0; zoom.y = 0; }
      var w = img.offsetWidth, h = img.offsetHeight;
      zoom.x = Math.min(0, Math.max(w - w * zoom.s, zoom.x));
      zoom.y = Math.min(0, Math.max(h - h * zoom.s, zoom.y));
      img.style.transform = 'translate(' + zoom.x + 'px,' + zoom.y + 'px) scale(' + zoom.s + ')';
    };
    // 화면 좌표 (cx, cy)를 가운데 두고 배율을 s로 바꾼다
    var zoomAt = function(s, cx, cy) {
      var r = img.getBoundingClientRect();
      var px = (cx - r.left) / zoom.s, py = (cy - r.top) / zoom.s;
      var base = { x: r.left - zoom.x, y: r.top - zoom.y };
      zoom.s = Math.max(1, Math.min(5, s));
      zoom.x = cx - base.x - px * zoom.s;
      zoom.y = cy - base.y - py * zoom.s;
      applyZoom();
    };
    var show = function(i) {
      idx = (i + list.length) % list.length;
      zoom = { s: 1, x: 0, y: 0 };
      img.style.transform = '';
      img.src = list[idx];
      img.alt = '사진 ' + (idx + 1);
      count.textContent = list.length > 1 ? (idx + 1) + ' / ' + list.length : '';
    };
    overlay.querySelector('.js-photo-close').onclick = window.okbmClosePhotoViewer;
    var prev = overlay.querySelector('.js-photo-prev');
    var next = overlay.querySelector('.js-photo-next');
    if (prev) prev.onclick = function() { show(idx - 1); };
    if (next) next.onclick = function() { show(idx + 1); };
    var stage = overlay.querySelector('.js-photo-stage');
    stage.onclick = function(e) { if (e.target === stage && zoom.s === 1) window.okbmClosePhotoViewer(); };
    var pts = {};
    var gesture = null;
    var lastTap = 0;
    var ptList = function() { return Object.keys(pts).map(function(k) { return pts[k]; }); };
    stage.addEventListener('pointerdown', function(e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { stage.setPointerCapture(e.pointerId); } catch (eCap) {}
      var p = ptList();
      if (p.length === 2) {
        gesture = { pinch: true, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, s: zoom.s };
      } else if (p.length === 1) {
        gesture = { pinch: false, sx: e.clientX, sy: e.clientY, x: zoom.x, y: zoom.y, moved: false };
      }
    });
    stage.addEventListener('pointermove', function(e) {
      if (!pts[e.pointerId] || !gesture) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var p = ptList();
      if (gesture.pinch && p.length >= 2) {
        var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        zoomAt(gesture.s * d / gesture.d, (p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2);
      } else if (!gesture.pinch) {
        var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) gesture.moved = true;
        if (zoom.s > 1) { zoom.x = gesture.x + dx; zoom.y = gesture.y + dy; applyZoom(); }
      }
    });
    var endPointer = function(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId];
      var g = gesture;
      if (ptList().length) { gesture = null; return; }
      gesture = null;
      if (!g || g.pinch) return;
      var dx = e.clientX - g.sx;
      if (zoom.s === 1 && list.length > 1 && Math.abs(dx) > 40) { show(dx < 0 ? idx + 1 : idx - 1); return; }
      var ir = img.getBoundingClientRect();
      if (g.moved || e.clientX < ir.left || e.clientX > ir.right || e.clientY < ir.top || e.clientY > ir.bottom) return;
      var now = Date.now();
      if (now - lastTap < 300) {
        lastTap = 0;
        if (zoom.s > 1) { zoom = { s: 1, x: 0, y: 0 }; applyZoom(); } else zoomAt(2.5, e.clientX, e.clientY);
      } else {
        lastTap = now;
      }
    };
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('wheel', function(e) {
      e.preventDefault();
      zoomAt(zoom.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY);
    }, { passive: false });
    show(idx);
    document.body.appendChild(overlay);
    if (typeof window.registerModalOpen === 'function') window.registerModalOpen('okbmPhotoViewer', window.okbmClosePhotoViewer);
  };
  window.okbmClosePhotoViewer = function() {
    var el = document.getElementById('okbmPhotoViewer');
    if (!el) return;
    el.remove();
    if (typeof window.unregisterModalClose === 'function') window.unregisterModalClose('okbmPhotoViewer');
  };
})();
