// HEIC → JPEG 변환 다리. 변환은 격리된 heic-convert.html(sandbox iframe)에서 한다.
// 사용: window.okbmHeicToJpeg(fileOrBlob, quality) → Promise<Blob|null>
(function() {
  var frame = null;
  var readyPromise = null;
  var pending = {};
  var seq = 0;

  function ensureFrame() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function(resolve) {
      var done = false;
      var timer = setTimeout(function() { if (!done) { done = true; resolve(false); } }, 15000);
      window.addEventListener('message', function(e) {
        if (!frame || e.source !== frame.contentWindow) return;
        var d = e.data;
        if (!d || d.okbmHeic !== 1) return;
        if (d.ready) {
          if (!done) { done = true; clearTimeout(timer); resolve(true); }
          return;
        }
        var cb = pending[d.id];
        if (!cb) return;
        delete pending[d.id];
        cb(d.ok && d.blob instanceof Blob ? d.blob : null);
      });
      frame = document.createElement('iframe');
      frame.src = 'heic-convert.html?v=1';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.cssText = 'position:fixed; width:1px; height:1px; left:-9999px; top:-9999px; border:0; opacity:0; pointer-events:none;';
      (document.body || document.documentElement).appendChild(frame);
    });
    readyPromise.then(function(ok) { if (!ok) readyPromise = null; });
    return readyPromise;
  }

  window.okbmHeicToJpeg = async function(fileOrBlob, quality) {
    if (!fileOrBlob) return null;
    if (!(await ensureFrame())) return null;
    var buffer = await fileOrBlob.arrayBuffer();
    var id = 'h' + (++seq) + '_' + Date.now();
    return new Promise(function(resolve) {
      var timer = setTimeout(function() { delete pending[id]; resolve(null); }, 90000);
      pending[id] = function(blob) { clearTimeout(timer); resolve(blob); };
      frame.contentWindow.postMessage({ okbmHeic: 1, id: id, buffer: buffer, quality: quality }, '*', [buffer]);
    });
  };
})();
