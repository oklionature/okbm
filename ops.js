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

    // 기기 종류 (홈을 연 기기, 하루 기준)
    var devTotal = DEVICE.reduce(function (a, d) { return a + get(d[0], 'view').visitors; }, 0);
    if (devTotal) {
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
    }

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

  // ---------- 관리자 새 소식 (SUPABASE_H3_ADMIN_ACTIVITY.sql) ----------
  // 최근 크리에이터 링크·새 피드와 검수 대기 수. 마지막으로 "확인했어요"를 누른 뒤 들어온 것은 새 표시를 한다.
  var SEEN_KEY = 'okbm_admin_activity_seen';
  var act = document.getElementById('activity');
  var actTab = 'links';
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
    var html = '<section><h2>관리자 새 소식</h2><p class="h">새로 들어온 링크·피드와 검수 대기예요. 노란 줄은 마지막으로 확인한 뒤 들어온 거예요.</p>';
    if (!d) { act.innerHTML = html + '<p class="dim">불러오는 중…</p></section>'; return; }
    if (d.error) { act.innerHTML = html + '<p class="dim">' + esc(d.error) + '</p></section>'; return; }
    html += '<div class="kpis" style="grid-template-columns:repeat(2, 1fr)">' +
      '<div class="kpi"><b>' + num((d.links || []).length) + (d.new_links ? '<span class="new">새 ' + num(d.new_links) + '</span>' : '') + '</b><span>크리에이터 링크 (최근)</span></div>' +
      '<div class="kpi"><b>' + num((d.feeds || []).length) + (d.new_feeds ? '<span class="new">새 ' + num(d.new_feeds) + '</span>' : '') + '</b><span>피드 (최근)</span></div>' +
      '<a class="kpi" href="map.html?open=admin_inbox"><b class="' + (d.inbox_pending ? 'warn' : '') + '">' + num(d.inbox_pending) + '</b><span>장소 검수 대기 ›<br>검수함에서 처리하면 줄어요</span></a>' +
      '<div class="kpi"><b class="' + (d.reports_pending ? 'warn' : '') + '">' + num(d.reports_pending) + '</b><span>신고 대기<br>신고 검수함에서 처리하면 줄어요</span></div>' +
      '</div>';
    html += '<div class="tabs"><button type="button" data-act-tab="links" class="' + (actTab === 'links' ? 'on' : '') + '">크리에이터 링크</button>' +
      '<button type="button" data-act-tab="feeds" class="' + (actTab === 'feeds' ? 'on' : '') + '">새 피드</button></div>';
    var list = actTab === 'links' ? (d.links || []) : (d.feeds || []);
    html += list.length
      ? list.map(actTab === 'links' ? linkRow : feedRow).join('')
      : '<p class="dim">' + (actTab === 'links' ? '아직 등록된 크리에이터 링크가 없어요.' : '아직 피드가 없어요.') + '</p>';
    html += '<button type="button" class="seen-btn" data-act-seen="1">모두 확인했어요 (새 표시 지우기)</button>' +
      '<p class="h" style="margin-top:6px">노란 줄과 「새」 숫자만 지워져요. 검수·신고 대기는 처리해야 줄어요.</p></section>';
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
    if (e.target.closest('[data-act-seen]')) {
      // 지금 보이는 것 중 가장 늦은 시각(서버 시각·기기 시각 포함)까지 확인한 것으로 둔다.
      // 서버와 기기 시계가 어긋나도 방금 본 줄이 다시 새로 표시되지 않게 한다.
      var latest = Math.max(Date.now(), ms(actData && actData.now));
      ((actData && actData.links) || []).concat((actData && actData.feeds) || []).forEach(function (x) {
        latest = Math.max(latest, ms(x && x.created_at));
      });
      try { localStorage.setItem(SEEN_KEY, new Date(latest + 1).toISOString()); } catch (eSeen) {}
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

  loadActivity();
})();
