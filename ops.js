// 운영 숫자 화면 (ops.html). 관리자만 읽을 수 있다.
// - 하루 방문자: stats 표 (track_visit이 쌓음)
// - 홈 칸별 노출·누름, 후기 저장 결과: okbm_home_metrics_summary RPC (SUPABASE_G1_HOME_METRICS.sql)
(function () {
  'use strict';

  var SUPABASE_URL = 'https://qnumfecythtqtrxeasys.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_PKEidTwAKB7cuXReKSEnKw_VgNvSojA';

  var SECTION_LABELS = {
    hero: '이주의 인기 스팟',
    hero_detail: '└ 자세히보기',
    hero_gear: '└ 장비 세팅보기',
    theme: '테마 스팟',
    video: '영상 속 그 장소',
    tripjoin: '이번 주말 원정대',
    lounge: '백패커 라운지',
    ready: '레디샷 띠',
    quick_guide: '바로가기: 초보 가이드',
    quick_event: '바로가기: 이번 달 행사',
    quick_join: '바로가기: 동행 찾기',
    quick_board: '바로가기: 자유게시판',
    quick_write: '바로가기: 후기 올리기',
    recent_reviews: '최근 다녀온 후기',
    events: '이번 달 행사',
    guides: '처음 가는 백패킹',
    together: '함께하기'
  };
  var HOME_ORDER = ['hero', 'hero_detail', 'hero_gear', 'quick_guide', 'quick_event', 'quick_join', 'quick_board', 'quick_write',
    'recent_reviews', 'theme', 'events', 'video', 'guides', 'tripjoin', 'together', 'lounge', 'ready'];
  var DOCK = [['dock_home', '낭만루터'], ['dock_map', '낭만루트'], ['dock_plan', '낭만플랜'], ['dock_history', '낭만피드'], ['dock_report', '마이리포트']];
  var PUBLISH = [['publish_ok', '피드에 공개됨', 'ok'], ['publish_private', '직접 비공개 선택', ''], ['publish_unregistered', '등록 안 된 장소라 비공개', 'warn'], ['publish_nophoto', '현장 사진 없어 비공개', 'warn']];

  var out = document.getElementById('out');
  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: false } });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
  function num(n) { return Number(n || 0).toLocaleString('ko-KR'); }
  function seoulDate(offsetDays) {
    var d = new Date(Date.now() + 9 * 3600 * 1000 - (offsetDays || 0) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }

  function showMessage(text, isErr) {
    out.innerHTML = '<p class="msg' + (isErr ? ' err' : '') + '">' + esc(text) + '</p>';
  }

  async function load(days) {
    showMessage('불러오는 중…');
    var sess = await client.auth.getSession();
    if (!sess || !sess.data || !sess.data.session) {
      showMessage('로그인이 필요해요. 같은 브라우저에서 낭만루트에 관리자 계정으로 로그인한 뒤 다시 열어 주세요.', true);
      return;
    }
    var from = seoulDate(days - 1);
    var results = await Promise.all([
      client.rpc('okbm_home_metrics_summary', { p_days: days }),
      client.from('stats').select('date,guest_uv,member_uv').gte('date', from).order('date', { ascending: true }),
      client.rpc('okbm_spot_bookmark_counts', { p_spot_ids: null }),
      client.from('spots').select('id,fullName,spot_main,region')
    ]);
    var m = results[0];
    var st = results[1];
    if (m.error) {
      var t = String(m.error.message || '');
      if (t.indexOf('admin only') !== -1) showMessage('관리자 계정만 볼 수 있어요.', true);
      else if (t.indexOf('Could not find the function') !== -1 || m.error.code === 'PGRST202') showMessage('기록용 DB가 아직 없어요. SUPABASE_G1_HOME_METRICS.sql을 먼저 실행해 주세요.', true);
      else showMessage('불러오지 못했어요: ' + t, true);
      return;
    }
    render(days, m.data || [], (st && !st.error && st.data) || [], results[2], (results[3] && !results[3].error && results[3].data) || []);
  }

  // 박지별 찜 수 (SUPABASE_G2_SPOT_BOOKMARK_COUNTS.sql). 찜한 사람이 있는 박지만, 많은 순.
  function bookmarkSection(res, spots) {
    var html = '<section><h2>박지별 찜</h2><p class="h">지금 찜해 둔 회원 수예요. 찜을 빼면 숫자도 줄어요.</p>';
    if (!res || res.error) {
      var t = String((res && res.error && res.error.message) || '');
      var missing = res && res.error && (res.error.code === 'PGRST202' || t.indexOf('Could not find the function') !== -1);
      return html + '<p class="dim">' + esc(missing ? '찜 수 DB가 아직 없어요. SUPABASE_G2_SPOT_BOOKMARK_COUNTS.sql을 먼저 실행해 주세요.' : '불러오지 못했어요: ' + t) + '</p></section>';
    }
    var byId = {};
    spots.forEach(function (sp) { byId[String(sp.id)] = sp; });
    var list = (res.data || []).filter(function (r) { return byId[String(r.spot_id)]; });
    if (!list.length) return html + '<p class="dim">아직 찜한 박지가 없어요.</p></section>';
    var total = list.reduce(function (a, r) { return a + Number(r.bookmarks || 0); }, 0);
    html += '<p class="h">찜이 있는 박지 ' + num(list.length) + '곳 · 찜 ' + num(total) + '개</p>' +
      '<input id="bmFilter" type="search" placeholder="박지 이름으로 찾기" style="width:100%;margin:0 0 10px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#2a2f37);background:transparent;color:inherit;font:inherit">' +
      '<table id="bmTable"><thead><tr><th>순위</th><th>박지</th><th>찜</th></tr></thead><tbody>' +
      list.map(function (r, i) {
        var sp = byId[String(r.spot_id)];
        var name = sp.fullName || sp.spot_main || ('박지 ' + r.spot_id);
        return '<tr data-name="' + esc(String(name).toLowerCase()) + '"><td>' + (i + 1) + '</td><td>' + esc(name) +
          (sp.region ? ' <span class="dim">' + esc(sp.region) + '</span>' : '') + '</td><td>' + num(r.bookmarks) + '</td></tr>';
      }).join('') + '</tbody></table></section>';
    return html;
  }

  function render(days, rows, stats, bmRes, spots) {
    // 기간 합계: 칸·종류별로 방문자 수(날짜별 고유 합)와 횟수
    var sum = {};
    var homeByDay = {};
    rows.forEach(function (r) {
      var key = r.section + '|' + r.kind;
      if (!sum[key]) sum[key] = { visitors: 0, hits: 0 };
      sum[key].visitors += Number(r.visitors || 0);
      sum[key].hits += Number(r.hits || 0);
      if (r.section === 'home' && r.kind === 'view') homeByDay[r.day] = Number(r.visitors || 0);
    });
    function get(section, kind) { return sum[section + '|' + kind] || { visitors: 0, hits: 0 }; }

    var visitTotal = 0;
    var visitByDay = {};
    stats.forEach(function (s) {
      var v = Number(s.guest_uv || 0) + Number(s.member_uv || 0);
      visitByDay[s.date] = v;
      visitTotal += v;
    });
    var homeViews = get('home', 'view').visitors;
    var writes = get('quick_write', 'click').visitors;
    var feedWrites = get('feed_write', 'click').visitors;
    var spotChanges = get('feed_spot_change', 'event').hits;

    var html = '';
    html += '<section><h2>한눈에 (' + days + '일)</h2><p class="h">방문자는 하루 기준 합계예요. 같은 사람이 이틀 오면 2로 셉니다.</p><div class="kpis">' +
      '<div class="kpi"><b>' + num(visitTotal) + '</b><span>앱 방문자</span></div>' +
      '<div class="kpi"><b>' + num(homeViews) + '</b><span>홈을 본 사람</span></div>' +
      '<div class="kpi"><b>' + num(get('publish_ok', 'event').hits) + '</b><span>피드에 공개된 새 글</span></div>' +
      '</div></section>';

    // 날짜별 방문자 막대
    var dayKeys = [];
    for (var i = days - 1; i >= 0; i--) dayKeys.push(seoulDate(i));
    var maxV = 1;
    dayKeys.forEach(function (d) { maxV = Math.max(maxV, visitByDay[d] || 0); });
    html += '<section><h2>날짜별 방문자</h2><div class="days">' + dayKeys.map(function (d) {
      var v = visitByDay[d] || 0;
      return '<div><em>' + (v || '') + '</em><i style="height:' + Math.max(2, Math.round((v / maxV) * 90)) + 'px"></i><small>' + d.slice(8) + '</small></div>';
    }).join('') + '</div></section>';

    // 홈 칸별
    var sectionsSeen = HOME_ORDER.filter(function (s) { return get(s, 'view').visitors || get(s, 'click').visitors; });
    html += '<section><h2>홈 칸별로 본 사람·누른 사람</h2><p class="h">비율은 홈을 본 사람(' + num(homeViews) + ') 대비예요. "본 사람"은 그 칸이 화면에 35% 이상 보인 경우예요.</p>';
    if (!sectionsSeen.length) {
      html += '<p class="dim">아직 기록이 없어요. 기록은 이 기능을 올린 뒤부터 쌓입니다.</p>';
    } else {
      html += '<table><thead><tr><th>칸</th><th>본 사람</th><th>누른 사람</th><th>누른 횟수</th></tr></thead><tbody>' +
        sectionsSeen.map(function (s) {
          var v = get(s, 'view').visitors;
          var c = get(s, 'click');
          var vp = pct(v, homeViews);
          var viewCell = (s === 'hero_detail' || s === 'hero_gear' || s.indexOf('quick_') === 0) ? '<span class="dim">-</span>'
            : num(v) + ' <span class="dim">(' + vp + '%)</span><span class="bar" style="width:' + vp + '%"></span>';
          return '<tr><td>' + esc(SECTION_LABELS[s] || s) + '</td><td>' + viewCell + '</td><td>' + num(c.visitors) +
            ' <span class="dim">(' + pct(c.visitors, homeViews) + '%)</span></td><td>' + num(c.hits) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    html += '</section>';

    // 하단 탭
    html += '<section><h2>하단 탭 누름 (홈에서)</h2><table><thead><tr><th>탭</th><th>누른 사람</th><th>누른 횟수</th></tr></thead><tbody>' +
      DOCK.map(function (d) {
        var c = get(d[0], 'click');
        return '<tr><td>' + esc(d[1]) + '</td><td>' + num(c.visitors) + '</td><td>' + num(c.hits) + '</td></tr>';
      }).join('') + '</tbody></table></section>';

    // 후기 저장 결과
    var pubTotal = PUBLISH.reduce(function (a, p) { return a + get(p[0], 'event').hits; }, 0);
    html += '<section><h2>새 후기 저장 결과</h2><p class="h">새로 저장된 기록이 피드에 공개됐는지, 아니라면 왜인지예요. 규칙은 그대로이고 숫자만 셉니다.</p>' +
      '<table><thead><tr><th>결과</th><th>건수</th><th>비율</th></tr></thead><tbody>' +
      PUBLISH.map(function (p) {
        var n = get(p[0], 'event').hits;
        var color = p[2] === 'ok' ? 'var(--ok)' : (p[2] === 'warn' ? 'var(--warn)' : 'var(--tx-2)');
        return '<tr><td style="color:' + color + '">' + esc(p[1]) + '</td><td>' + num(n) + '</td><td>' + pct(n, pubTotal) + '%</td></tr>';
      }).join('') + '</tbody></table>' +
      (writes ? '<p class="h" style="margin-top:10px">바로가기 "후기 올리기"를 누른 사람: ' + num(writes) + '</p>' : '') +
      (feedWrites ? '<p class="h">낭만피드 "후기 올리기"를 누른 사람: ' + num(feedWrites) + '</p>' : '') +
      (spotChanges ? '<p class="h">낭만피드에서 내 글 장소를 바꾼 횟수: ' + num(spotChanges) + '</p>' : '') +
      '</section>';

    html += bookmarkSection(bmRes, spots || []);

    out.innerHTML = html;
  }

  out.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'bmFilter') return;
    var q = String(e.target.value || '').trim().toLowerCase();
    Array.prototype.forEach.call(out.querySelectorAll('#bmTable tbody tr'), function (tr) {
      tr.style.display = !q || tr.getAttribute('data-name').indexOf(q) !== -1 ? '' : 'none';
    });
  });

  document.getElementById('range').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-days]');
    if (!b) return;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    load(Number(b.getAttribute('data-days')));
  });

  load(7);
})();
