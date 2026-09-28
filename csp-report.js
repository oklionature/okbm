// CSP 위반 신고: 막힌 스크립트/핸들러가 있으면 업로드 Worker 로그로 보낸다 (기능이 깨진 곳을 찾기 위함).
// 반드시 각 페이지 <head>에서 가장 먼저 불러온다. 개인 정보는 보내지 않는다.
(function() {
  var seen = {};
  var sent = 0;
  document.addEventListener('securitypolicyviolation', function(e) {
    try {
      var sample = String(e.sample || '').slice(0, 120);
      var key = e.violatedDirective + '|' + e.blockedURI + '|' + sample;
      if (seen[key] || sent >= 20) return;
      seen[key] = 1;
      sent++;
      var body = JSON.stringify({
        page: location.pathname,
        directive: e.violatedDirective,
        blocked: String(e.blockedURI || '').slice(0, 200),
        sample: sample,
        source: String(e.sourceFile || '').split('?')[0].slice(-80) + ':' + (e.lineNumber || 0)
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('https://romantic-upload-worker.ggumfree.workers.dev/csp-report', body);
      }
      if (window.console && console.warn) console.warn('[CSP]', e.violatedDirective, sample || e.blockedURI);
    } catch (err) {}
  });
})();
