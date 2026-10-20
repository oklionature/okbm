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
  var DEVICE = [['device_ios', '아이폰 사파리'], ['device_ios_home', '아이폰 홈 화면'], ['device_android', '안드로이드 웹'], ['device_app', '낭만루트 앱'], ['device_other', 'PC·기타']];
  var PUBLISH = [['publish_ok', '피드에 공개됨', 'ok'], ['publish_private', '직접 비공개 선택', ''], ['publish_unregistered', '등록 안 된 장소라 비공개', 'warn'], ['publish_nophoto', '현장 사진 없어 비공개', 'warn']];

  // 기능 사용 (SUPABASE_H8_FEATURE_METRICS.sql). [이름, 화면, 보이는 이름]
  var FEATURES = [
    ['feat_readyshot_make', '낭만플랜', '레디샷 만들기'],
    ['feat_readyshot_save', '낭만플랜', '레디샷 저장·공유'],
    ['feat_pack_share_open', '낭만플랜', '패킹 공유 창 열기'],
    ['feat_gear_register', '낭만플랜', '내 장비 등록'],
    ['feat_gear_add', '낭만플랜', '장비 직접 추가'],
    ['feat_gear_info_save', '낭만플랜', '장비 정보 저장'],
    ['feat_gear_set_save', '낭만플랜', '장비 세트 저장'],
    ['feat_checklist_add', '낭만플랜', '체크리스트 추가'],
    ['feat_plan_destination', '낭만플랜', '일정 목적지 등록'],
    ['feat_plan_memo', '낭만플랜', '일정 메모 저장'],
    ['feat_feed_share', '낭만피드', '피드 공유'],
    ['feat_spot_fav', '정보창', '찜하기'],
    ['feat_spot_visited', '정보창', '다녀왔음'],
    ['feat_spot_share', '정보창', '박지 공유'],
    ['feat_spot_gpx', '정보창', 'GPX 경로 보기'],
    ['feat_spot_media', '정보창', '유튜브·블로그·인스타 탭'],
    ['feat_spot_correction', '정보창', '수정건의'],
    ['feat_spot_unlock', '정보창', '들머리 정보 열기']
  ];

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
    var from = seoulDate(days * 2 - 1); // 지난 기간과 비교하려고 두 배로 받는다
    var results = await Promise.all([
      client.rpc('okbm_home_metrics_summary', { p_days: days }),
      client.from('stats').select('date,guest_uv,member_uv').gte('date', from).order('date', { ascending: true }),
      client.rpc('okbm_spot_bookmark_counts', { p_spot_ids: null }),
      client.from('spots').select('id,fullName,spot_main,region'),
      client.rpc('okbm_admin_member_stats', { p_days: days })
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
    render(days, m.data || [], (st && !st.error && st.data) || [], results[2], (results[3] && !results[3].error && results[3].data) || [], results[4]);
  }

  // 박지별 찜 수 (SUPABASE_G2_SPOT_BOOKMARK_COUNTS.sql). 찜한 사람이 있는 박지만, 많은 순.
  function bookmarkSection(res, spots) {
    var html = '<section><p class="h">지금 찜해 둔 회원 수예요. 찜을 빼면 숫자도 줄어요.</p>';
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

  // 접어 두는 칸. sum은 접혀 있어도 보이는 한 줄 요약
  function fold(title, sum, body, open) {
    return '<details class="fold"' + (open ? ' open' : '') + '><summary>' + esc(title) + (sum ? ' <span class="sum">' + sum + '</span>' : '') + '</summary><div class="in">' + body + '</div></details>';
  }
  // 지난 기간 대비
  function cmp(cur, prev) {
    if (!prev && !cur) return '<span class="cmp same">지난 기간과 같음</span>';
    if (!prev) return '<span class="cmp up">지난 기간 0 → 새로 생김</span>';
    var d = Math.round(((cur - prev) / prev) * 100);
    if (d === 0) return '<span class="cmp same">지난 기간과 같음</span>';
    return '<span class="cmp ' + (d > 0 ? 'up' : 'down') + '">지난 기간보다 ' + (d > 0 ? '▲' : '▼') + Math.abs(d) + '%</span>';
  }

  function render(days, rows, stats, bmRes, spots, memRes) {
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

    var visitTotal = 0, visitPrev = 0;
    var visitByDay = {}, memberByDay = {};
    var curFrom = seoulDate(days - 1);
    stats.forEach(function (s) {
      var v = Number(s.guest_uv || 0) + Number(s.member_uv || 0);
      visitByDay[s.date] = v;
      memberByDay[s.date] = Number(s.member_uv || 0);
      if (s.date >= curFrom) visitTotal += v; else visitPrev += v;
    });
    var today = seoulDate(0);
    // 회원가입 (SUPABASE_H7_ADMIN_MEMBER_STATS.sql)
    var mem = memRes && !memRes.error && memRes.data ? memRes.data : null;
    var joinByDay = (mem && mem.by_day) || {};
    var joinTotal = 0, joinPrev = 0;
    Object.keys(joinByDay).forEach(function (d) { if (d >= curFrom) joinTotal += Number(joinByDay[d] || 0); else joinPrev += Number(joinByDay[d] || 0); });
    var homeViews = get('home', 'view').visitors;
    var writes = get('quick_write', 'click').visitors;
    var feedWrites = get('feed_write', 'click').visitors;
    var spotChanges = get('feed_spot_change', 'event').hits;

    var html = '';
    var memMissing = !mem;
    html += '<section><h2>한눈에 (' + days + '일)</h2><p class="h">방문자는 하루 기준 합계예요. 같은 사람이 이틀 오면 2로 셉니다. 비교는 바로 앞 ' + days + '일과 해요.</p><div class="kpis">' +
      '<div class="kpi"><b>' + num(visitByDay[today] || 0) + '</b><span>오늘 방문자</span><span class="cmp same">회원 ' + num(memberByDay[today] || 0) + ' · 비회원 ' + num((visitByDay[today] || 0) - (memberByDay[today] || 0)) + '</span></div>' +
      '<div class="kpi"><b>' + (memMissing ? '-' : num(joinByDay[today] || 0)) + '</b><span>오늘 회원가입</span></div>' +
      '<div class="kpi"><b>' + (memMissing ? '-' : num(mem.total)) + '</b><span>전체 회원</span></div>' +
      '<div class="kpi"><b>' + num(visitTotal) + '</b><span>방문자 (' + days + '일)</span>' + cmp(visitTotal, visitPrev) + '</div>' +
      '<div class="kpi"><b>' + (memMissing ? '-' : num(joinTotal)) + '</b><span>회원가입 (' + days + '일)</span>' + (memMissing ? '' : cmp(joinTotal, joinPrev)) + '</div>' +
      '<div class="kpi"><b>' + num(get('publish_ok', 'event').hits) + '</b><span>피드에 공개된 새 글</span></div>' +
      '</div>' + (memMissing ? '<p class="h" style="margin-top:10px">회원가입 숫자는 SUPABASE_H7_ADMIN_MEMBER_STATS.sql을 실행하면 보여요.</p>' : '') + '</section>';

    // 날짜별 방문자 막대
    var dayKeys = [];
    for (var i = days - 1; i >= 0; i--) dayKeys.push(seoulDate(i));
    var maxV = 1;
    dayKeys.forEach(function (d) { maxV = Math.max(maxV, visitByDay[d] || 0); });
    html += '<section><h2>날짜별 방문자 · 회원가입</h2><div class="days" style="height:140px">' + dayKeys.map(function (d) {
      var v = visitByDay[d] || 0;
      var mv = Math.min(v, memberByDay[d] || 0);
      var h = Math.max(2, Math.round((v / maxV) * 90));
      var mh = v ? Math.round(h * mv / v) : 0;
      var j = Number(joinByDay[d] || 0);
      return '<div title="' + d + ' 방문 ' + v + ' (회원 ' + mv + ') · 가입 ' + j + '"><em>' + (v || '') + '</em><i style="height:' + (h - mh) + 'px"></i>' +
        (mh ? '<i class="m" style="height:' + mh + 'px"></i>' : '') + '<small>' + d.slice(8) + '</small><span class="join">' + (j ? '+' + j : '') + '</span></div>';
    }).join('') + '</div><div class="legend"><span><b style="background:var(--accent)"></b>비회원</span><span><b style="background:var(--ok)"></b>회원</span><span style="color:var(--ok)">+N 그날 회원가입</span></div></section>';

    function foldFrom(start, title, sum) {
      var body = html.slice(start).replace(/<h2>[\s\S]*?<\/h2>/, '');
      html = html.slice(0, start) + fold(title, sum, body, false);
    }

    // 홈 칸별
    var mark = html.length;
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
    foldFrom(mark, '홈 칸별로 본 사람·누른 사람', '홈 ' + num(homeViews) + '명');

    // 하단 탭
    mark = html.length;
    var dockTotal = DOCK.reduce(function (a, d) { return a + get(d[0], 'click').visitors; }, 0);
    html += '<section><h2>하단 탭 누름 (홈에서)</h2><table><thead><tr><th>탭</th><th>누른 사람</th><th>누른 횟수</th></tr></thead><tbody>' +
      DOCK.map(function (d) {
        var c = get(d[0], 'click');
        return '<tr><td>' + esc(d[1]) + '</td><td>' + num(c.visitors) + '</td><td>' + num(c.hits) + '</td></tr>';
      }).join('') + '</tbody></table></section>';
    foldFrom(mark, '하단 탭 누름', '누른 사람 ' + num(dockTotal));

    // 후기 저장 결과
    mark = html.length;
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
    foldFrom(mark, '새 후기 저장 결과', '저장 ' + num(pubTotal) + '건 · 공개 ' + pct(get('publish_ok', 'event').hits, pubTotal) + '%');

    // 기기 종류 (홈을 연 기기, 하루 기준)
    var devTotal = DEVICE.reduce(function (a, d) { return a + get(d[0], 'view').visitors; }, 0);
    if (devTotal) {
      mark = html.length;
      var guideViews = get('home_guide', 'view').visitors;
      var guideCloses = get('home_guide_close', 'click').visitors;
      html += '<section><h2>기기 종류</h2><p class="h">홈을 연 기기를 하루 한 번 셉니다.</p>' +
        '<table><thead><tr><th>기기</th><th>방문자</th><th>비율</th></tr></thead><tbody>' +
        DEVICE.map(function (d) {
          var n = get(d[0], 'view').visitors;
          return '<tr><td>' + esc(d[1]) + '</td><td>' + num(n) + '</td><td>' + pct(n, devTotal) + '%</td></tr>';
        }).join('') + '</tbody></table>' +
        (guideViews ? '<p class="h" style="margin-top:10px">홈 화면 추가 안내를 본 아이폰: ' + num(guideViews) + ' · 닫은 아이폰: ' + num(guideCloses) + '</p>' : '') +
        '</section>';
      var topDev = DEVICE.slice().sort(function (a, b) { return get(b[0], 'view').visitors - get(a[0], 'view').visitors; })[0];
      foldFrom(mark, '기기 종류', '가장 많은 기기: ' + esc(topDev[1]) + ' ' + pct(get(topDev[0], 'view').visitors, devTotal) + '%');
    }

    // 기능 사용: 쓴 사람 적은 순. 0이면 "안 씀"
    var featRows = FEATURES.map(function (f) { var c = get(f[0], 'click'); return { f: f, v: c.visitors, h: c.hits }; });
    Object.keys(sum).forEach(function (k) {
      var key = k.split('|')[0];
      if (key.indexOf('feat_') === 0 && !FEATURES.some(function (f) { return f[0] === key; })) {
        var c = get(key, 'click'); featRows.push({ f: [key, '기타', key], v: c.visitors, h: c.hits });
      }
    });
    featRows.sort(function (a, b) { return a.v - b.v || a.h - b.h; });
    var unused = featRows.filter(function (r) { return !r.v; }).length;
    var featAny = featRows.some(function (r) { return r.v; });
    var featBody = '<section><p class="h">기능을 쓴 사람(하루 기준 합)과 횟수예요. 적게 쓴 것부터 보여요. 기록은 이 기능을 올린 뒤부터 쌓여요.</p>' +
      (featAny ? '' : '<p class="h warn">아직 기록이 없어요. SUPABASE_H8_FEATURE_METRICS.sql을 실행했는지 확인해 주세요.</p>') +
      '<table><thead><tr><th>기능</th><th>화면</th><th>쓴 사람</th><th>횟수</th></tr></thead><tbody>' +
      featRows.map(function (r) {
        return '<tr><td>' + esc(r.f[2]) + (r.v ? '' : ' <span class="warn" style="font-size:11px;font-weight:800">안 씀</span>') + '</td><td class="dim">' + esc(r.f[1]) + '</td><td>' + num(r.v) + '</td><td>' + num(r.h) + '</td></tr>';
      }).join('') + '</tbody></table></section>';
    html += fold('기능 사용', featAny ? ('안 쓴 기능 ' + num(unused) + '개') : '기록 없음', featBody, true);

    var bmList = (bmRes && !bmRes.error && bmRes.data) || [];
    var bmTotal = bmList.reduce(function (a, r) { return a + Number(r.bookmarks || 0); }, 0);
    html += fold('박지별 찜', bmList.length ? '찜 ' + num(bmTotal) + '개 · ' + num(bmList.length) + '곳' : '', bookmarkSection(bmRes, spots || []), false);

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

  // ---------- 관리자 새 소식 (SUPABASE_H3_ADMIN_ACTIVITY.sql) ----------
  // 최근 크리에이터 링크·새 피드와 검수 대기 수. 마지막으로 "확인했어요"를 누른 뒤 들어온 것은 새 표시를 한다.
  var SEEN_KEY = 'okbm_admin_activity_seen';
  var act = document.getElementById('activity');
  var actTab = 'links';
  var actShowAll = false; // 확인한 지난 것도 보기
  var actData = null;
  var KIND_LABEL = { yt: '유튜브', blog: '블로그', insta: '인스타' };

  function readSeen() {
    try { return localStorage.getItem(SEEN_KEY) || ''; } catch (e) { return ''; }
  }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var k = new Date(d.getTime() + 9 * 3600 * 1000);
    return (k.getUTCMonth() + 1) + '.' + k.getUTCDate() + ' ' + String(k.getUTCHours()).padStart(2, '0') + ':' + String(k.getUTCMinutes()).padStart(2, '0');
  }
  // 서버 시각은 마이크로초(6자리)까지 와서, 브라우저에 따라 못 읽는 경우가 있어 밀리초로 자른다
  function ms(iso) {
    return Date.parse(String(iso || '').replace(/(\.\d{3})\d+/, '$1')) || 0;
  }
  function isNew(iso) {
    var seen = readSeen();
    return !seen || ms(iso) > ms(seen);
  }
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https:\/\//i.test(s) ? s : '#';
  }

  function linkRow(l) {
    var title = String(l.title || '').trim() || String(l.url || '').replace(/^https?:\/\//, '');
    var rep = Number(l.reports || 0);
    return '<div class="act-row' + (isNew(l.created_at) ? ' is-new' : '') + '">' +
      '<div class="t"><span class="tag">' + esc(KIND_LABEL[l.kind] || l.kind) + '</span>' + esc(title) + '</div>' +
      '<div class="m">' + esc(l.spot_name || ('박지 ' + l.spot_id)) + ' · ' + esc(l.author || '') + ' · ' + esc(when(l.created_at)) +
        ' · 👍 ' + num(l.ups) + ' · <span class="' + (rep >= 3 ? 'warn' : '') + '">신고 ' + num(rep) + '</span>' +
        (l.hidden ? ' · <span class="warn">숨김</span>' : '') + '</div>' +
      '<div class="b">' +
        '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener noreferrer">링크 열기</a>' +
        '<a href="map.html?id=' + encodeURIComponent(l.spot_id) + '" target="_blank" rel="noopener">박지 열기</a>' +
        '<button type="button" data-link-act="' + (l.hidden ? 'show' : 'hide') + '" data-id="' + esc(l.id) + '">' + (l.hidden ? '다시 보이기' : '숨김') + '</button>' +
        '<button type="button" class="red" data-link-act="delete" data-id="' + esc(l.id) + '">삭제</button>' +
      '</div></div>';
  }
  function feedRow(f) {
    return '<div class="act-row' + (isNew(f.created_at) ? ' is-new' : '') + '">' +
      '<div class="t">' + esc(f.spot || '(장소 없음)') + '</div>' +
      '<div class="m">' + esc(f.author || '') + ' · ' + esc(when(f.created_at)) + ' · ' + (f.is_published ? '공개' : '<span class="dim">비공개</span>') + ' · ' +
        (f.linked ? '<span class="ok">✓ 박지 연결: ' + esc(f.spot_name || f.spot_id) + '</span>' : '<span class="warn">✗ 박지 연결 안 됨</span>') + '</div>' +
      '<div class="b">' +
        '<a href="index.html?feed=' + encodeURIComponent(f.id) + '" target="_blank" rel="noopener">피드 열기</a>' +
        (f.linked ? '<a href="map.html?id=' + encodeURIComponent(f.spot_id) + '" target="_blank" rel="noopener">박지 열기</a>' : '') +
      '</div></div>';
  }

  function renderActivity() {
    var d = actData;
    var html = '<section><h2>관리자 새 소식</h2><p class="h">마지막으로 확인한 뒤 새로 들어온 링크·피드와 검수 대기예요. 「모두 확인했어요」를 누르면 목록이 비워져요.</p>';
    if (!d) { act.innerHTML = html + '<p class="dim">불러오는 중…</p></section>'; return; }
    if (d.error) { act.innerHTML = html + '<p class="dim">' + esc(d.error) + '</p></section>'; return; }
    // 확인한 뒤 들어온 것만 목록에 둔다(지난 것은 「지난 것도 보기」로)
    var newLinks = (d.links || []).filter(function (x) { return isNew(x.created_at); });
    var newFeeds = (d.feeds || []).filter(function (x) { return isNew(x.created_at); });
    html += '<div class="kpis" style="grid-template-columns:repeat(2, 1fr)">' +
      '<div class="kpi"><b class="' + (newLinks.length ? 'warn' : '') + '">' + num(newLinks.length) + '</b><span>새 크리에이터 링크</span></div>' +
      '<div class="kpi"><b class="' + (newFeeds.length ? 'warn' : '') + '">' + num(newFeeds.length) + '</b><span>새 피드</span></div>' +
      '<a class="kpi" href="map.html?open=admin_inbox"><b class="' + (d.inbox_pending ? 'warn' : '') + '">' + num(d.inbox_pending) + '</b><span>장소 검수 대기 ›<br>검수함에서 처리하면 줄어요</span></a>' +
      '<div class="kpi"><b class="' + (d.reports_pending ? 'warn' : '') + '">' + num(d.reports_pending) + '</b><span>신고 대기<br>신고 검수함에서 처리하면 줄어요</span></div>' +
      '</div>';
    html += '<div class="tabs"><button type="button" data-act-tab="links" class="' + (actTab === 'links' ? 'on' : '') + '">크리에이터 링크 ' + num(newLinks.length) + '</button>' +
      '<button type="button" data-act-tab="feeds" class="' + (actTab === 'feeds' ? 'on' : '') + '">새 피드 ' + num(newFeeds.length) + '</button></div>';
    var all = actTab === 'links' ? (d.links || []) : (d.feeds || []);
    var list = actShowAll ? all : (actTab === 'links' ? newLinks : newFeeds);
    html += list.length
      ? list.map(actTab === 'links' ? linkRow : feedRow).join('')
      : '<p class="dim">' + (actTab === 'links' ? '새로 들어온 크리에이터 링크가 없어요.' : '새로 들어온 피드가 없어요.') + '</p>';
    if (all.length > list.length || actShowAll) {
      html += '<button type="button" class="seen-btn" data-act-all="1">' + (actShowAll ? '새로 들어온 것만 보기' : '확인한 지난 것도 보기 (' + num(all.length - list.length) + ')') + '</button> ';
    }
    if (newLinks.length || newFeeds.length) {
      html += '<button type="button" class="seen-btn" data-act-seen="1">모두 확인했어요 (목록 비우기)</button>';
    }
    html += '<p class="h" style="margin-top:6px">확인하면 크리에이터 링크·피드 목록이 비워져요. 검수·신고 대기는 처리해야 줄어요.</p></section>';
    act.innerHTML = html;
  }

  async function loadActivity() {
    actData = null;
    renderActivity();
    var sess = await client.auth.getSession();
    if (!sess || !sess.data || !sess.data.session) { act.innerHTML = ''; return; }
    var res = await client.rpc('okbm_admin_activity', { p_since: readSeen() || null, p_limit: 50 });
    if (res.error) {
      var t = String(res.error.message || '');
      actData = { error: t.indexOf('admin only') !== -1 ? '관리자 계정만 볼 수 있어요.'
        : (res.error.code === 'PGRST202' || t.indexOf('Could not find the function') !== -1)
          ? '새 소식 DB가 아직 없어요. SUPABASE_H3_ADMIN_ACTIVITY.sql을 먼저 실행해 주세요.'
          : '불러오지 못했어요: ' + t };
    } else {
      actData = res.data || {};
    }
    renderActivity();
  }

  act.addEventListener('click', async function (e) {
    var tab = e.target.closest('[data-act-tab]');
    if (tab) { actTab = tab.getAttribute('data-act-tab'); renderActivity(); return; }
    if (e.target.closest('[data-act-all]')) { actShowAll = !actShowAll; renderActivity(); return; }
    if (e.target.closest('[data-act-seen]')) {
      // 지금 보이는 것 중 가장 늦은 시각(서버 시각·기기 시각 포함)까지 확인한 것으로 둔다.
      // 서버와 기기 시계가 어긋나도 방금 본 줄이 다시 새로 표시되지 않게 한다.
      var latest = Math.max(Date.now(), ms(actData && actData.now));
      ((actData && actData.links) || []).concat((actData && actData.feeds) || []).forEach(function (x) {
        latest = Math.max(latest, ms(x && x.created_at));
      });
      try { localStorage.setItem(SEEN_KEY, new Date(latest + 1).toISOString()); } catch (eSeen) {}
      actShowAll = false;
      loadActivity();
      return;
    }
    var b = e.target.closest('[data-link-act]');
    if (!b) return;
    var action = b.getAttribute('data-link-act');
    if (action === 'delete' && !confirm('이 링크를 삭제할까요?')) return;
    b.disabled = true;
    var r = await client.rpc('manage_spot_creator_link', { p_link_id: Number(b.getAttribute('data-id')), p_action: action });
    if (r.error) { alert('처리하지 못했어요: ' + (r.error.message || '')); b.disabled = false; return; }
    loadActivity();
  });

  // 공지 푸시 (supabase/functions/send-notice-push). 관리자에게만 칸을 보이고, 받을 기기 수를 먼저 보여 준다.
  var pushBox = document.getElementById('pushBox');
  var pushStatus = document.getElementById('pushStatus');
  var pushSend = document.getElementById('pushSend');

  async function callNoticePush(payload) {
    var sess = await client.auth.getSession();
    var token = sess && sess.data && sess.data.session && sess.data.session.access_token;
    if (!token) return { error: 'missing_authorization' };
    try {
      var res = await fetch(SUPABASE_URL + '/functions/v1/send-notice-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload)
      });
      var data = await res.json().catch(function () { return {}; });
      return res.ok ? data : { error: data.error || ('http_' + res.status) };
    } catch (e) {
      return { error: 'network' };
    }
  }

  async function loadPushCount() {
    var r = await callNoticePush({ dry: true });
    if (r.error) return; // 관리자가 아니거나 함수가 아직 없으면 칸을 숨긴 채 둔다
    pushBox.hidden = false;
    document.getElementById('pushCount').textContent = '알림 받는 기기 ' + num(r.total) + '대';
  }

  pushSend.addEventListener('click', async function () {
    var title = document.getElementById('pushTitle').value.trim();
    var body = document.getElementById('pushBody').value.trim();
    var url = document.getElementById('pushUrl').value.trim();
    if (!title || !body) { pushStatus.textContent = '제목과 내용을 모두 써 주세요.'; return; }
    if (url && !/^\/(?!\/)/.test(url)) { pushStatus.textContent = '주소는 /로 시작하는 우리 사이트 경로만 돼요.'; return; }
    if (!confirm('이 공지를 모든 앱 기기에 보낼까요?\n\n' + title + '\n' + body)) return;
    pushSend.disabled = true;
    pushStatus.textContent = '보내는 중…';
    var r = await callNoticePush({ title: title, body: body, url: url });
    pushSend.disabled = false;
    if (r.error) {
      pushStatus.textContent = r.error === 'apns_not_configured'
        ? 'APNs 키가 아직 함수 Secrets에 없어요.'
        : '보내지 못했어요 (' + r.error + ')';
      return;
    }
    pushStatus.textContent = num(r.sent) + '대에 보냈어요' + (r.failed ? ' · 실패 ' + num(r.failed) : '') + (r.removed ? ' · 앱 지운 기기 ' + num(r.removed) + '대 정리' : '');
    loadPushCount();
  });

  loadActivity();
  loadPushCount();
})();
