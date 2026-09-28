// heic-convert.html 안에서 동작. 부모 창이 보낸 HEIC 파일을 JPEG Blob으로 바꿔 돌려준다.
// 메시지: 부모 → { okbmHeic: 1, id, buffer(ArrayBuffer), quality }
//         자식 → { okbmHeic: 1, id, ok, blob?, error? }
(function() {
  var LIBS = [
    {
      src: 'https://cdn.jsdelivr.net/npm/heic-to@1.5.2/dist/iife/heic-to.js',
      integrity: 'sha384-cVm8gaWQ5+URpoh6ACKXpm8TuyoHkfIDDBkxvDoUdIZ18w8nV5en0lVQvWMwO/6S',
      ready: function() { return typeof window.HeicTo === 'function' || (window.HeicTo && typeof window.HeicTo.heicTo === 'function'); }
    },
    {
      src: 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js',
      integrity: 'sha384-OTofQ0MEeiSgh62havBcemCIK0gqj809wX6UA0uPISNMRnR6NZyCdGzX3SbLrgwL',
      ready: function() { return typeof window.heic2any === 'function'; }
    }
  ];
  var loading = {};

  function load(lib) {
    if (lib.ready()) return Promise.resolve(true);
    if (loading[lib.src]) return loading[lib.src];
    loading[lib.src] = new Promise(function(resolve) {
      var s = document.createElement('script');
      s.src = lib.src;
      s.integrity = lib.integrity;
      s.crossOrigin = 'anonymous';
      s.onload = function() { resolve(lib.ready()); };
      s.onerror = function() { delete loading[lib.src]; resolve(false); };
      document.head.appendChild(s);
    });
    return loading[lib.src];
  }

  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function(resolve) { setTimeout(function() { resolve(null); }, ms); })]);
  }

  async function viaHeicTo(blob, quality) {
    if (!(await load(LIBS[0]))) return null;
    var fn = typeof window.HeicTo === 'function' ? window.HeicTo : window.HeicTo.heicTo;
    var out = await withTimeout(Promise.resolve(fn({ blob: blob, type: 'image/jpeg', quality: quality })), 40000);
    return Array.isArray(out) ? out[0] : out;
  }

  async function viaHeic2Any(blob, quality) {
    if (!(await load(LIBS[1]))) return null;
    var out = await withTimeout(Promise.resolve(window.heic2any({ blob: blob, toType: 'image/jpeg', quality: quality })), 40000);
    return Array.isArray(out) ? out[0] : out;
  }

  window.addEventListener('message', async function(e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d || d.okbmHeic !== 1 || !(d.buffer instanceof ArrayBuffer)) return;
    var quality = (typeof d.quality === 'number' && d.quality > 0 && d.quality <= 1) ? d.quality : 0.82;
    var input = new Blob([d.buffer], { type: 'image/heic' });
    var result = null;
    var lastErr = '';
    try { result = await viaHeicTo(input, quality); } catch (err) { lastErr = String(err && err.message || err); }
    if (!(result instanceof Blob)) {
      try { result = await viaHeic2Any(input, quality); } catch (err2) { lastErr = String(err2 && err2.message || err2); }
    }
    var ok = result instanceof Blob && result.size > 0;
    // sandbox(opaque origin)라 대상 origin은 '*'. 받는 쪽(부모)이 event.source로 이 iframe인지 확인한다.
    window.parent.postMessage({ okbmHeic: 1, id: d.id, ok: ok, blob: ok ? result : null, error: ok ? '' : (lastErr || 'convert_failed') }, '*');
  });

  window.parent.postMessage({ okbmHeic: 1, ready: true }, '*');
})();
