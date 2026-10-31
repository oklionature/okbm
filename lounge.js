// =========================================================================
// 백패커 라운지 (index.html 홈 섹션 + 라운지 창) — 2026-09-29 P3
// 디자인: audit/mockups/lounge-minimal.js v4 (미니멀). DB: SUPABASE_F1_LOUNGE.sql
//
// · 홈(#okbmLoungeHomeBody): 메뉴 "이번 달 행사 · 장비 세일 소식 · 초보 가이드 · 자유게시판 · 박지 후기" + 탭마다 3줄(높이 고정).
//   행사·장비 세트는 그 자리에서 펼치고, 글 줄은 라운지 창에서 그 글을 펼친다.
// · 라운지 창(#loungeWindow): 같은 목록 조각으로 전부. 탭은 가로 스크롤 스냅. 닫기: 뒤로·Esc·기존 가장자리 밀기(index 6930).
// · 시트(#loungeSheet): 관리자 행사·가이드 등록/수정.
// · 인라인 핸들러 없음(data-a 위임) → csp-extract JS_FILES에 넣지 않는다.
// · src/href 보간은 escapeHtml(okbmSafeImageUrl|okbmSafeExternalUrl(...))만 (scripts/check-unsafe-url-interpolation.py).
// · P4에서 추가: 회원 쓰기(글·댓글·좋아요·후기)·신고·차단, P5: 달력·패킹.
// =========================================================================
(function () {
  'use strict';
  if (window.__okbmLoungeLoaded) return;
  window.__okbmLoungeLoaded = true;

  // ---------- 공용 헬퍼 (romantic-sync.js 것을 쓰고, 없을 때만 대체) ----------
  const escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  const okbmSafeImageUrl = typeof window.okbmSafeImageUrl === 'function' ? window.okbmSafeImageUrl : function () { return ''; };
  const okbmSafeExternalUrl = typeof window.okbmSafeExternalUrl === 'function' ? window.okbmSafeExternalUrl : function () { return '#'; };
  const esc = escapeHtml;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tick = function () { if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(8); } catch (e) {} } };
  const sb = function () { return window.supabaseClient || null; };
  const loggedIn = function () { return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn(); };
  const myId = function () { try { return String((window.okbmGetCurrentUserId && window.okbmGetCurrentUserId()) || '').trim(); } catch (e) { return ''; } };
  const hidden = function (row) { return typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc({ id: row.id, user_id: row.user_id }); };
  const pad = function (n) { return String(n).padStart(2, '0'); };

  const ico = function (d, w) {
    w = w || 18;
    return '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  const P = {
    back: '<path d="M15 18l-6-6 6-6"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.8A8.4 8.4 0 1 1 21 11.5z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pin: '<path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pack: '<path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 2v5M8 2h8M8 15h8v4H8z"/>'
  };

  const TABS = ['이번 달 행사', '초보 가이드', '자유게시판', '박지 후기', '장비 세일 소식'];
  // 창에 보이는 순서. 번호는 그대로라 ?lounge=2(자유게시판) 같은 기존 링크가 안 밀린다.
  const TAB_ORDER = [0, 4, 1, 2, 3];
  const TAB_DEAL = 4;
  function trackOf(tab) {
    const i = TAB_ORDER.indexOf(Number(tab));
    return i < 0 ? 0 : i;
  }
  function tabAt(track) {
    const i = Math.max(0, Math.min(TAB_ORDER.length - 1, Math.round(Number(track) || 0)));
    return TAB_ORDER[i];
  }
  // 사는이야기(life)는 글이 없어 투표(poll) 칸으로 바꿨다. 옛 life 글이 남아 있어도 이름은 보인다 (SUPABASE_H25)
  const CATS = [['all', '전체'], ['backpacking', '백패킹이야기'], ['poll', '설문·투표'], ['suggestion', '건의']];
  const CAT_LABEL = { backpacking: '백패킹이야기', life: '사는이야기', poll: '설문·투표', suggestion: '건의' };
  const GEAR_CAT = { shelter: '텐트', sleep: '침낭', pack: '배낭', food: '식량', kitchen: '조리', wear: '의류', electronics: '전자', camp: '캠프', other: '기타' };
  const HOME_N = 3;
  const POST_PAGE = 20;
  const AV_COLORS = ['#7dd3fc', '#fda4af', '#86efac', '#fcd34d', '#c4b5fd', '#fdba74', '#a5b4fc', '#f9a8d4', '#99f6e4'];

  // 서버 데이터 (loadAll이 채움)
  const D = {
    status: 'idle', // idle | loading | ready | error
    events: [], pastEvents: null, guides: [], deals: [], posts: [], postsDone: false, top: [],
    recent: null, recentTier: '', recentDone: false, comments: {}, admin: false,
    fail: [false, false, false, false],
    liked: new Set(), likeChecked: new Set(), // 내가 좋아요 누른 글(본인 것만 보임)
    spotRev: null, // 박지 하나의 후기 {spot_id, tier, summary, reviews, mine, done, tipSum, tipRows}
    rank: null, // 박지 랭킹 전체(평점순·후기 많은 순 탭을 열 때 한 번 받는다, SUPABASE_H26). 홈은 D.top 10곳만
    tipsRecent: null, // 최근 팁(칩·한 줄) — 박지 후기 탭에서 별점 후기와 섞는다 (SUPABASE_G4)
    news: [], // 소식(야영 금지·업데이트·공지)·매거진 (SUPABASE_H28 lounge_news). 홈 라운지 맨 위 띠와 아래 매거진 줄
    poll: {}, // 투표 결과 {글id: {total, counts|null, mine, closed}} (SUPABASE_H25 okbm_poll_results)
  };
  // 화면 상태. tab = 홈 탭, wtab = 라운지 창 탭 (서로 따로 기억), revSpot = 후기 탭을 한 박지로 좁힘
  // revView: 박지 후기 창의 작은 탭 'recent'(최근 후기, 처음) | 'top'(평점순) | 'many'(후기 많은 순)
  // revBand: 평점순에서 고른 점수대 'all' | '45'(4.5 이상) | '4'(4점대) | '3'(3점대) | 'low'(3점 미만)
  // hub: 홈 라운지 알약 'board' | 'poll' | 'review' | 'guide'
  const S = { tab: 0, wtab: 0, cat: 'all', revSpot: null, revView: 'recent', revBand: 'all', hub: 'board' };
  let timeSig = ''; // 신청·오픈 상태 요약 (renderAll·timeTick)

  // ---------- 날짜 ----------
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function todayKey() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function evView(e) {
    const s = parseD(e.start_date) || new Date();
    const en = parseD(e.end_date) || s;
    const today = parseD(todayKey());
    const dd = Math.round((s - today) / 86400000);
    const nights = Math.max(0, Math.round((en - s) / 86400000));
    const past = en < today;
    // 이미 시작해 아직 안 끝난 여러 날 행사: 시작일 대신 종료일 기준으로 보여 준다
    const ongoing = !past && dd < 0;
    const endDd = Math.round((en - today) / 86400000);
    const sinceStart = -dd;
    const totalDays = nights + 1;
    let ddText = 'D-' + dd;
    if (past) ddText = '지남';
    else if (ongoing) ddText = endDd === 0 ? '오늘 종료' : '종료 D-' + endDd;
    else if (dd === 0) ddText = '오늘';
    return {
      d: ongoing ? '~' + en.getDate() : s.getDate(),
      mon: ongoing ? (en.getMonth() + 1) + '월' : (s.getMonth() + 1) + '월',
      wd: ongoing ? '까지' : WD[s.getDay()],
      days: nights === 0 ? '당일' : (nights === 1 ? '1박 2일' : (s.getMonth() + 1) + '.' + s.getDate() + ' – ' + (en.getMonth() + 1) + '.' + en.getDate()),
      dateText: pad(s.getMonth() + 1) + '.' + pad(s.getDate()) + (nights > 0 ? ' – ' + pad(en.getMonth() + 1) + '.' + pad(en.getDate()) : ''),
      ddText: ddText,
      // 상태 꼬리표: 시작 7일 이내 NEW, 끝나기 7일 전부터 곧 마감, 30일 이상 장기
      isNew: !past && dd <= 0 && sinceStart < 7 && nights > 0,
      endingSoon: ongoing && endDd <= 7,
      isLong: !past && totalDays >= 30,
      weekday: WD[s.getDay()],
      start: s, end: en, past: past
    };
  }
  // ---------- 신청·오픈 일시 (SUPABASE_H18) ----------
  // 행사는 신청 시작 7일 전부터 마감까지 맨 위로 올리고, 할인은 시작 7일 전부터 '곧 오픈'으로 올린다.
  const HOT_MS = 7 * 86400000;
  function parseTs(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }
  function hourText(d) {
    const h = d.getHours(), m = d.getMinutes();
    const t = h === 0 ? '밤 12시' : (h < 12 ? '오전 ' + h + '시' : (h === 12 ? '낮 12시' : '오후 ' + (h - 12) + '시'));
    return t + (m ? ' ' + m + '분' : '');
  }
  // 오늘 0시부터 그날 0시까지 날 수
  function dayDiff(d) {
    return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - parseD(todayKey())) / 86400000);
  }
  function dayText(d, long) {
    const n = dayDiff(d);
    if (n === 0) return '오늘';
    if (n === 1) return '내일';
    return (long ? (d.getMonth() + 1) + '월 ' + d.getDate() + '일' : (d.getMonth() + 1) + '/' + d.getDate()) + '(' + WD[d.getDay()] + ')';
  }
  // '10월 30일(목) 오후 2시' (long) · '10/30(목) 오후 2시' · '오늘 오후 2시'
  function whenText(d, long) { return dayText(d, long) + ' ' + hourText(d); }
  // 마감: 0시 정각이면 전날 밤까지라 시간 없이 '11/14(금)까지'
  function untilText(d, long) {
    if (!d.getHours() && !d.getMinutes()) return dayText(new Date(d - 1), long) + '까지';
    return whenText(d, long) + '까지';
  }
  // 남은 때 꼬리표: 1시간 안이면 '37분 뒤'(minutes일 때만), 아니면 '오늘'·'내일'·'D-3'
  function leftChip(at, minutes) {
    const ms = at - Date.now();
    if (minutes && ms > 0 && ms < 3600000) return Math.max(1, Math.ceil(ms / 60000)) + '분 뒤';
    const n = dayDiff(at);
    return n <= 0 ? '오늘' : (n === 1 ? '내일' : 'D-' + n);
  }
  const isHotChip = function (c) { return c === '오늘' || c === '내일' || /분 뒤$/.test(c); };
  // 행사 신청 상태. 신청 일시가 없으면 null.
  // phase: later(7일 넘게 남음) · soon(7일 안) · open(신청 중, 마감 시각을 앎) · opened(오픈은 지났고 마감을 모름) · closed(마감). hot이면 맨 위.
  // 마감을 모르면 '신청 중'이라 하지 않는다. 티켓은 행사 몇 달 전에 매진되기 일쑤라, 예전엔 마감을 행사 시작일로 잡아
  // 9/11에 열고 9월에 끝난 코리아 백패커스 데이가 '신청 중 · 11/6까지'로 보여 행사 날짜처럼 읽혔다.
  // 그래서 '10월 22일(목) 오후 2시 신청'처럼 신청 날만 적는다. 오픈한 그날 밤 12시까지만 금색으로 맨 위에, 다음 날부터는 회색 한 줄로 날짜순 목록에 남긴다.
  // 신청 일시 칸이 비어 있으면 설명·한 줄 소개·참가 글에서 읽는다.
  // 읽는 말투: '티켓은 10월 26일 월요일 저녁 8시에 오픈' · '일반 신청은 10월 19일 19시부터' · '티켓 오픈 9/11 12:00'
  //           · '신청은 10월 21일부터 27일까지' · '쿠폰 등록은 10월 28일 자정까지' · '10/29까지 사전예매'
  // 신청 말(티켓·신청·접수·예약·예매·모집·등록·응모)이 있는 문장에서만 찾는다. '17시에 공개'처럼 오픈·부터·까지가 안 붙은 날짜는 넘긴다.
  const AP_KEY = /티켓|신청|접수|예약|예매|모집|등록|응모/;
  const AP_DT = /(?:(\d{4})\s*[./년]\s*)?(\d{1,2})\s*(?:월\s*|[./])\s*(\d{1,2})\s*일?(?:\s*\([^)]{1,3}\))?(?:\s*[월화수목금토일]요일)?(?:\s*(오전|오후|저녁|밤|낮|새벽|아침)?\s*(\d{1,2})\s*(?:시(?:\s*(\d{1,2})\s*분)?|:(\d{2}))|\s*(자정|정오))?/g;
  function applyFromText(e) {
    const base = parseD(e.start_date);
    if (!base) return null;
    const text = [e.subtitle, e.fee, e.description].filter(Boolean).join('\n');
    // 연도가 없으면 행사 시작일 해의 그날로 보고, 행사보다 뒤면 한 해 앞으로
    const mk = function (y, mo, d, ap, h, mi, mi2, word) {
      mo = +mo; d = +d;
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      let hh = 0, mm = 0, timed = false;
      if (h != null) {
        hh = +h; mm = +(mi || mi2 || 0); timed = true;
        if (/오후|저녁|밤/.test(ap || '') && hh < 12) hh += 12;
        else if (/오전|새벽|아침/.test(ap || '') && hh === 12) hh = 0;
        else if (ap === '낮' && hh < 6) hh += 12;
        if (hh > 23 || mm > 59) return null;
      } else if (word === '정오') { hh = 12; timed = true; }
      const dt = new Date(y ? +y : base.getFullYear(), mo - 1, d, hh, mm);
      if (!y && dt - base > 86400000) dt.setFullYear(dt.getFullYear() - 1);
      return { d: dt, timed: timed, midnight: word === '자정' };
    };
    // 그날 밤까지: 시간이 없거나 '자정'이면 다음 날 0시
    const endOf = function (t) { return t.timed ? t.d : new Date(t.d.getFullYear(), t.d.getMonth(), t.d.getDate() + 1); };
    const parts = text.split(/[.!?]\s+|\n+/);
    for (let i = 0; i < parts.length; i++) {
      const s = parts[i];
      if (!AP_KEY.test(s)) continue;
      let open = null, close = null, m;
      AP_DT.lastIndex = 0;
      while ((m = AP_DT.exec(s))) {
        const t = mk(m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
        if (!t) continue;
        const before = s.slice(Math.max(0, m.index - 6), m.index);
        const after = s.slice(AP_DT.lastIndex, AP_DT.lastIndex + 10);
        if (!open && (/^\s*(에\s*)?(오픈|부터|시작|open)/i.test(after) || /(오픈|시작)\s*$/.test(before))) {
          open = t.d;
          // '10월 21일부터 27일까지': 같은 달 날짜만 적은 마감
          const r = after.match(/^\s*부터\s*~?\s*(\d{1,2})\s*일\s*까지/);
          if (r) close = endOf(mk(null, t.d.getMonth() + 1, r[1]) || t);
        } else if (!close && /^\s*까지/.test(after)) {
          close = endOf(t);
        }
      }
      if (open || close) return { open: open, close: close };
    }
    return null;
  }
  function applyView(e) {
    let open = parseTs(e.apply_open_at);
    let closeSet = parseTs(e.apply_close_at);
    const fromText = !open && !closeSet;
    if (fromText) {
      const t = applyFromText(e);
      if (!t) return null;
      open = t.open; closeSet = t.close;
    }
    const close = closeSet;
    const now = Date.now();
    const start = parseD(e.start_date);
    let phase = 'closed';
    if (open && now < open) phase = open - now <= HOT_MS ? 'soon' : 'later';
    else if (close && now < close) phase = 'open';
    else if (open && !close && (!start || now < start)) phase = 'opened';
    // 글에서 읽은 신청이 이미 끝났으면 아무것도 안 보인다(대피소 예약처럼 계속 받는 것을 '마감'으로 잘못 보이지 않게)
    if (fromText && phase === 'closed') return null;
    const hot = phase === 'soon' || phase === 'open' || (phase === 'opened' && dayDiff(open) === 0);
    return { open: open, close: close, phase: phase, hot: hot, at: phase === 'open' ? close : open, fromText: fromText };
  }
  // 큰 글씨 한 줄과 오른쪽 꼬리표. open의 마감이 오늘·내일이면 꼬리표를 '오늘 마감'으로.
  function applyLine(a, long) {
    if (a.phase === 'open') return '신청 중 · ' + untilText(a.close, long);
    if (a.phase === 'closed') return '신청 마감';
    if (a.phase === 'opened') return whenText(a.open, long) + ' 신청';
    return whenText(a.open, long) + ' 신청 오픈';
  }
  function applyChip(a, minutes) {
    if (a.phase === 'open') {
      const c = leftChip(new Date(a.close - 1), minutes);
      return isHotChip(c) ? c + ' 마감' : '신청 중';
    }
    if (a.phase === 'closed') return '';
    if (a.phase === 'opened') return '';
    return leftChip(a.open, minutes) + (minutes ? '' : ' 오픈');
  }
  function ago(iso) {
    const t = new Date(iso).getTime();
    if (!t) return '';
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분';
    const h = Math.floor(m / 60);
    if (h < 24) return h + '시간';
    const d = Math.floor(h / 24);
    if (d === 1) return '어제';
    if (d < 7) return d + '일 전';
    const dt = new Date(t);
    return (dt.getMonth() + 1) + '.' + dt.getDate();
  }
  function thisMonthEvents() {
    const today = parseD(todayKey());
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return D.events.filter(function (e) { const v = evView(e); return v.start <= monthEnd && v.end >= today; });
  }
  // 신청이 7일 안에 열리거나 신청 중인 행사가 맨 위(다음 시각이 가까운 순).
  // 그다음 참가 가능(시작일 오늘 이후), 그중 고정이 위. 이미 시작된 일정은 끝나는 날이 가까운 순.
  function compareEvents(a, b) {
    const t = todayKey();
    const rank = function (e) {
      const ap = applyView(e);
      if (ap && ap.hot) return { group: -1, pin: 0, key: ap.at.toISOString() };
      const start = String(e.start_date || '').slice(0, 10);
      const end = String(e.end_date || e.start_date || '').slice(0, 10);
      const joinable = start >= t;
      return { group: joinable ? 0 : 1, pin: joinable && e.is_pinned ? 0 : 1, key: joinable ? start : end };
    };
    const ka = rank(a), kb = rank(b);
    if (ka.group !== kb.group) return ka.group - kb.group;
    if (ka.pin !== kb.pin) return ka.pin - kb.pin;
    return ka.key.localeCompare(kb.key) || String(a.start_date || '').localeCompare(String(b.start_date || ''));
  }

  // ---------- 박지·장비 ----------
  // 박지 목록: 홈은 registeredSpots, 지도는 window.spots
  const IS_MAP = /map\.html/.test(String(window.location && window.location.pathname || ''));
  function spotList() {
    if (Array.isArray(window.registeredSpots) && window.registeredSpots.length) return window.registeredSpots;
    return Array.isArray(window.spots) ? window.spots : [];
  }
  function spotById(id) {
    const list = spotList();
    const sid = String(id || '').trim();
    for (let i = 0; i < list.length; i++) if (list[i] && String(list[i].id).trim() === sid) return list[i];
    return null;
  }
  function spotName(s) { return String((s && (s.spot_main || s.name)) || '').trim(); }
  function spotRegion(s) { return String((s && (s.cityName || s.region)) || '').trim(); }
  function openSpotOnMap(id) {
    // 지도 페이지에서는 그 자리에서 박지를 연다
    const s = IS_MAP ? spotById(id) : null;
    if (s && typeof window.focusSpotOnMap === 'function') { try { window.focusSpotOnMap(s); return; } catch (e) { console.warn('[lounge.js:openSpotOnMap]', e); } }
    try { sessionStorage.setItem('okbm_entered_via_index', '1'); } catch (e) {}
    const url = 'map.html?id=' + encodeURIComponent(String(id || ''));
    if (typeof window.smoothNavigate === 'function') window.smoothNavigate(url); else window.location.assign(url);
  }
  // 받침 있으면 은/이, 없으면 는/가 (한글이 아니면 앞의 것)
  function josa(word, a, b) {
    const c = String(word || '').charCodeAt(String(word || '').length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 === 0) ? b : a;
  }
  const STAR_LABEL = ['별을 눌러 주세요', '별로예요', '아쉬워요', '괜찮아요', '좋아요', '최고예요'];
  // 로그인이 필요하면 로그인 창을 연다(라운지 층보다 위에 뜬다). 로그인하면 페이지가 새로 열린다
  function needLogin(msg) {
    if (loggedIn() && myId()) return false;
    toast(msg || '로그인하면 쓸 수 있어요');
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return true;
  }
  function writeErr(e, fallback) {
    const m = String((e && (e.message || e.details || e.hint)) || e || '');
    if (/rate limit/i.test(m)) return '너무 자주 올렸어요. 잠시 뒤 다시 해 주세요';
    if (/invalid_photos/.test(m)) return '사진을 다시 올려 주세요';
    if (/invalid_poll_end/.test(m)) return '마감을 다시 골라 주세요';
    if (/invalid_poll/.test(m)) return '보기는 2~5개, 서로 다르게 40자 안으로 적어 주세요';
    if (/JWT|not authenticated|401|42501/i.test(m) || (e && (e.code === '42501' || e.code === 'PGRST301'))) return '다시 로그인해 주세요';
    return fallback || '저장하지 못했어요. 잠시 뒤 다시 해 주세요';
  }
  // 사진 줄이기: index.html의 processSinglePhotoSmart(HEIC 포함)를 쓰고, 지도처럼 없으면 캔버스로 줄인다
  async function shrinkPhoto(file, maxDim, quality) {
    if (typeof window.processSinglePhotoSmart === 'function') return window.processSinglePhotoSmart(file, { maxDim: maxDim, quality: quality });
    if (typeof createImageBitmap !== 'function') return null;
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { return null; }
    const k = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { alpha: false });
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    if (typeof bmp.close === 'function') bmp.close();
    return new Promise(function (resolve) { cv.toBlob(function (b) { resolve(b || null); }, 'image/jpeg', quality); });
  }
  async function uploadPhoto(file, maxDim) {
    const blob = await shrinkPhoto(file, maxDim || 1600, 0.85);
    if (!blob) throw new Error('decode_failed');
    const url = typeof window.okbmUploadImageBlob === 'function' ? await window.okbmUploadImageBlob(blob, 'lounge') : '';
    if (!okbmSafeImageUrl(url)) throw new Error('upload_failed');
    return url;
  }
  const photoErr = function (e) {
    return String(e && e.message) === 'decode_failed' ? '이 사진은 열 수 없어요. 다른 사진을 골라 주세요' : '사진을 올리지 못했어요. 로그인 상태를 확인해 주세요';
  };
  function kitItems(k) { return Array.isArray(k.items) ? k.items.filter(function (it) { return it && it.name; }) : []; }
  function avColor(uid) {
    let h = 0; const s = String(uid || '');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function postPhotos(p) { return (Array.isArray(p.photos) ? p.photos : []).map(function (u) { return okbmSafeImageUrl(u); }).filter(Boolean).slice(0, 5); }

  // ---------- 스타일 (미니멀 v4. 홈 섹션 #okbmLoungeHome, 화면 위 층 #okbmLoungeLayer) ----------
  function injectCss() {
    if (document.getElementById('okbmLoungeCss')) return;
    const css = document.createElement('style');
    css.id = 'okbmLoungeCss';
    css.textContent = [
      '#okbmLoungeLayer,#okbmLoungeHome{--bg:var(--bg-1);--tx:var(--tx-1);--sub:var(--tx-3);--faint:var(--tx-3);--div:var(--line);--blue:var(--accent);--pink:var(--like);--star:#ffc342;--ease:cubic-bezier(.32,.72,0,1)}',
      '#okbmLoungeLayer{position:fixed;top:0;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483640;pointer-events:none;overflow:hidden;color:var(--tx);font-family:var(--font-body,-apple-system,system-ui,sans-serif);letter-spacing:-.02em;word-break:keep-all;overflow-wrap:anywhere;-webkit-font-smoothing:antialiased}',
      '#okbmLoungeHome{word-break:keep-all;overflow-wrap:anywhere}',
      '#okbmLoungeLayer *,#okbmLoungeHome *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}',
      ':where(#okbmLoungeLayer,#okbmLoungeHome) button{font-family:inherit;color:inherit;letter-spacing:inherit;border:0;background:none;cursor:pointer;padding:0;text-align:inherit}',
      ':where(#okbmLoungeLayer,#okbmLoungeHome) input,:where(#okbmLoungeLayer,#okbmLoungeHome) textarea,:where(#okbmLoungeLayer,#okbmLoungeHome) select{font-family:inherit;letter-spacing:inherit}',
      ':is(#okbmLoungeLayer,#okbmLoungeHome) :focus-visible{outline:2px solid var(--blue);outline-offset:2px}',
      '@keyframes lmPop{40%{transform:scale(1.35)}}',
      '@keyframes lmhIn{from{opacity:0;transform:translateX(var(--dx,0))}}',
      '@keyframes lmhOut{to{opacity:0;transform:translateX(var(--dx,0))}}',
      '@keyframes lmShine{from{background-position:100% 50%}to{background-position:0 50%}}',
      '#okbmLoungeHome .lmh-open{font:inherit;color:inherit;display:inline-flex;align-items:center;gap:6px;border-radius:6px}',
      '#okbmLoungeHome .lmh-all{display:inline-flex;align-items:center;gap:1px;font-size:11px;font-weight:800;color:#38bdf8;border-radius:6px}',
      '#okbmLoungeHome .lmh-all:active,#okbmLoungeHome .lmh-open:active{opacity:.6}',
      '#okbmLoungeHome .lmh{padding:0 14px 8px 1px;color:var(--tx);font-family:var(--font-body,-apple-system,system-ui,sans-serif);letter-spacing:-.02em}',
      '#okbmLoungeHome .lmh-row{height:64px;padding:0;align-items:center}',
      '#okbmLoungeHome .lmx>.lmh-row{height:63px}',
      '#okbmLoungeHome .lmx>.lm-faq-q{height:63px;padding:0}',
      '#okbmLoungeHome .lmx>.lm-faq-q>span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#okbmLoungeHome .lmh-row .lm-rt,#okbmLoungeHome .lmh-row .lm-rs{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#okbmLoungeHome .lmh-row .lm-rs.fx{display:flex;align-items:center;gap:4px}',
      '#okbmLoungeHome .lmh-row .lm-rs.fx>span{min-width:0;overflow:hidden;text-overflow:ellipsis}',
      '#okbmLoungeHome .lmh-row .lm-rs.fx>svg{flex:none}',
      '#okbmLoungeHome .lmh-row .lm-dd{padding-top:0}',
      '#okbmLoungeHome .lmh-av{flex:none;width:48px;display:flex}',
      '#okbmLoungeHome .lmh-meta{flex:none;display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--sub);font-variant-numeric:tabular-nums}',
      '#okbmLoungeHome .lmh-pane{min-height:236px}',
      '#okbmLoungeHome .hg{border:1px solid #1f2430;border-radius:14px;overflow:hidden}',
      '#okbmLoungeHome .hg-row{width:100%;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #161a24;font-size:13px;font-weight:700;color:var(--tx);text-align:left}',
      '#okbmLoungeHome .hg-row:last-child{border-bottom:0}',
      '#okbmLoungeHome .hg-row:active{background:rgba(255,255,255,.04)}',
      '#okbmLoungeHome .hg-t{flex:none;font-size:10px;border:1px solid #f5b93a;color:#f5b93a;border-radius:5px;padding:2px 5px}',
      '#okbmLoungeHome .hg-t.r{border-color:#ff8a65;color:#ff8a65}',
      '#okbmLoungeHome .hg-t.g{border-color:#9ccc65;color:#9ccc65}',
      '#okbmLoungeHome .hg-x{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      // 홈 백패커 라운지 (2026-10-31): 소식 띠 · 알약 네 개 · 매거진 줄. 무채색 카드, 눈에 띄는 색은 소식 띠 왼쪽 줄 하나
      '#okbmHomeNews{display:flex;flex-direction:column;gap:6px;padding:0 14px}',
      '#okbmHomeNews .hn-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:14px 16px 14px 18px;border-radius:16px;background:#16161a;text-align:left;overflow:hidden;color:var(--tx);animation:lmhIn .35s var(--ease)}',
      '#okbmHomeNews .hn-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#ff6b5e}',
      '#okbmHomeNews .hn-card.k-update:before{background:#5bb8f0}#okbmHomeNews .hn-card.k-notice:before{background:#a1a1a8}',
      '#okbmHomeNews .hn-card:active{background:#1c1c20}',
      '#okbmHomeNews .hn-card em{font-style:normal;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:6px;background:rgba(255,107,94,.16);color:#ff8a7e}',
      '#okbmHomeNews .k-update em{background:rgba(91,184,240,.16);color:#8fd0ff}#okbmHomeNews .k-notice em{background:rgba(255,255,255,.08);color:#d1d1d6}',
      '#okbmHomeNews .hn-card b{font-size:15.5px;font-weight:800;line-height:1.35;padding-right:36px}',
      '#okbmHomeNews .hn-card small{font-size:12.5px;color:#a1a1a8;line-height:1.4}',
      '#okbmHomeNews .hn-dots{position:absolute;right:14px;top:17px;display:flex;gap:4px}#okbmHomeNews .hn-dots i{width:5px;height:5px;border-radius:50%;background:#3a3a40}#okbmHomeNews .hn-dots i.on{background:#f2f2f7}',
      '#okbmHomeNews .hn-add{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:12px;font-weight:800;color:var(--sub);padding:2px 0}',
      '#okbmHomeHub{padding:0 14px}',
      '#okbmHomeHub .hh-chips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-bottom:4px}',
      '#okbmHomeHub .hh-chips button{display:flex;align-items:center;justify-content:center;min-width:0;padding:0 4px;height:34px;border-radius:17px;background:#1c1c20;color:#c7c7cc;font-size:12.5px;font-weight:700;white-space:nowrap;transition:background .15s,color .15s}',
      '#okbmHomeHub .hh-chips button.on{background:var(--tx);color:#000}',
      '#okbmHomeHub .hh-row{width:100%;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 2px;border-top:1px solid rgba(255,255,255,.07);text-align:left;color:var(--tx)}',
      '#okbmHomeHub .hh-row:first-child{border-top:0}',
      '#okbmHomeHub .hh-row:active{opacity:.6}',
      '#okbmHomeHub .hh-x{min-width:0;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#okbmHomeHub .hh-x i{font-style:normal;font-size:11.5px;font-weight:800;color:var(--blue);margin-right:6px}',
      '#okbmHomeHub .hh-row small{flex:none;font-size:12px;color:var(--sub);font-variant-numeric:tabular-nums}',
      '#okbmHomeHub .hh-cta{display:flex;align-items:center;justify-content:center;gap:4px;width:100%;height:42px;margin-top:6px;border-radius:12px;background:#1c1c20;font-size:13.5px;font-weight:700;color:var(--tx)}',
      '#okbmHomeHub .hh-cta:active{background:#26262b}',
      '#okbmHomeHub .hh-empty{padding:28px 0 22px;text-align:center;font-size:13px;color:var(--sub)}',
      '#okbmHomeMag .hm-head{padding:0 14px;margin-bottom:10px;font-size:var(--fs-title,16px);font-weight:900;color:var(--tx)}',
      '#okbmHomeMag .hm-rail{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 14px;scroll-snap-type:x proximity}',
      '#okbmHomeMag .hm-rail::-webkit-scrollbar{display:none}',
      '#okbmHomeMag .hm-card{position:relative;flex:none;width:124px;aspect-ratio:4/5;border-radius:12px;overflow:hidden;background:#1c1c20;scroll-snap-align:start;text-align:left}',
      '#okbmHomeMag .hm-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
      '#okbmHomeMag .hm-card span{position:absolute;left:0;right:0;bottom:0;padding:24px 10px 10px;font-size:13px;font-weight:800;line-height:1.35;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.72));display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '#okbmHomeMag .hm-card span em{font-style:normal;display:block;font-size:11px;color:#ff8a7e}',
      '#okbmHomeMag .hm-card.add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(255,255,255,.22);background:none;color:var(--sub)}',
      '#okbmHomeMag .hm-card.add span{position:static;padding:0;background:none;color:var(--sub);font-size:12px}',
      '.hm-view{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin:12px -4px 0}',
      '.hm-view::-webkit-scrollbar{display:none}',
      '.hm-view img{flex:none;width:100%;height:auto;border-radius:12px;scroll-snap-align:center;background:#17171b}',
      '.lm-tchips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}.lm-tchips span{font-size:11px;font-weight:700;color:var(--tx);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:2px 8px}',
      '.lm-tchips.lg{margin:4px 0 6px}.lm-tchips.lg span{font-size:12px;padding:3px 9px}',
      '#okbmLoungeHome .lmh-empty{height:192px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:12.5px;color:var(--sub);text-align:center}',
      '.lm-sk{height:64px;border-bottom:1px solid var(--div);display:flex;align-items:center;gap:16px}',
      '.lm-sk i,.lm-sk b{display:block;border-radius:6px;background:linear-gradient(90deg,#17171b 25%,#222228 37%,#17171b 63%);background-size:400% 100%;animation:lmShine 1.2s ease infinite}',
      '.lm-sk i{width:40px;height:30px}.lm-sk b{flex:1;height:30px}',
      '.lmh-menu{position:relative;display:flex;gap:14px;overflow-x:auto;scrollbar-width:none;padding:4px 0 8px;box-shadow:inset 0 -1px 0 var(--div)}',
      '.lmh-menu::-webkit-scrollbar{display:none}',
      '.lmh-menu button{flex:none;padding:6px 0;font-size:13px;font-weight:800;color:var(--faint);white-space:nowrap;transition:color .2s}',
      '.lmh-menu button.on{color:var(--tx)}',
      '.lmh-menu em{font-style:normal;color:var(--blue)}',
      '.lmh-ind{position:absolute;left:0;bottom:0;width:0;height:2px;border-radius:1px;background:var(--tx);transition:transform .35s var(--ease),width .35s var(--ease)}',
      '.lmh-ind.live{transition:none}',
      '.lmh-panel{position:relative}',
      '.lmh-panel.anim{overflow:hidden;transition:height .38s var(--ease)}',
      '.lmh-pane.in{animation:lmhIn .38s var(--ease) both}',
      '.lmh-pane.out{position:absolute;top:0;left:0;right:0;animation:lmhOut .22s ease forwards;pointer-events:none}',
      '.lmh-cap{margin:20px 0 2px;font-size:11.5px;font-weight:700;color:var(--sub)}',
      // 박지 후기 창의 작은 탭 (최근 후기 | 평점 높은 박지)
      '.lm-seg{display:flex;gap:2px;margin:14px 0 6px;padding:3px;border-radius:12px;background:#1a1a1e}',
      '.lm-seg button{flex:1;display:flex;align-items:center;justify-content:center;height:34px;border-radius:9px;font-size:13px;font-weight:700;color:var(--faint);transition:background .2s,color .2s}',
      '.lm-seg button.on{background:#2c2c32;color:var(--tx)}',
      '.lmh-pane>.lmh-cap:first-child,.lmw-pane>.lmh-cap:first-child{margin-top:14px}',
      '.lmh-more{width:100%;display:flex;align-items:center;justify-content:center;gap:2px;height:44px;padding:6px 0 0;font-size:12px;font-weight:700;color:var(--sub)}',
      '.lmh-more:active{color:var(--tx)}',
      '.lmh-cta{width:100%;height:44px;margin-top:14px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:6px;background:#1c1c20;font-size:13.5px;font-weight:700;transition:transform .15s,background .15s}',
      '.lmh-cta:active{transform:scale(.98);background:#26262c}',
      '.lmh-cta.adm{color:var(--star)}',
      '.lm-head{margin:18px 0 4px;font-size:17px;font-weight:800;line-height:1.4;letter-spacing:-.03em}',
      '.lm-head em{font-style:normal;color:var(--blue)}',
      '.lmx{border-bottom:1px solid var(--div);scroll-margin:90px 0 90px}',
      '.lmx>.lm-row,.lmx>.lm-post{border-bottom:0}',
      '.lmx-body{display:grid;grid-template-rows:0fr;transition:grid-template-rows .32s var(--ease)}',
      '.lmx.open>.lmx-body{grid-template-rows:1fr}',
      '.lmx.noanim>.lmx-body,.lmx.noanim .lm-chev.rot{transition:none}',
      '.lmx-body>div{overflow:hidden;min-height:0}',
      '.lmx-in{padding:0 0 18px}',
      '.lmx-in.ind{padding-left:44px}',
      '.lm-chev{flex:none;align-self:center;display:inline-flex;color:var(--faint)}',
      '.lm-chev.rot{transform:rotate(90deg);transition:transform .25s var(--ease)}',
      '.lmx.open .lm-chev.rot{transform:rotate(-90deg)}',
      '.lmx.open>.lm-row .lm-rt{color:var(--blue)}',
      '.lmx-btns{display:flex;gap:8px;margin-top:16px}',
      '.lmx-links{display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:12px;color:var(--sub)}',
      '.lmx-links button{font-weight:600}',
      '.lmx-links .adm{color:var(--star)}',
      '.lmx-links .red{color:#ff6b6b}',
      '.lmx-cm{display:flex;gap:10px;padding:10px 0}',
      '.lmx-note{display:flex;gap:8px;padding-top:4px;font-size:12.5px;line-height:1.6;color:var(--sub)}',
      '.lmx.open .lm-post .lm-bd{display:block;-webkit-line-clamp:unset}',
      '.lm-row{display:flex;gap:14px;align-items:flex-start;width:100%;padding:12px 0;border-bottom:1px solid var(--div);cursor:pointer;text-align:left;transition:opacity .15s}',
      '.lm-row:active,.lm-post[data-a]:active{opacity:.6}',
      '.lm-date{flex:none;width:48px}',
      '.lm-date b{display:block;font-size:18px;font-weight:900;letter-spacing:-.05em;line-height:1}',
      '.lm-date small{display:block;margin-top:4px;font-size:10px;font-weight:700;color:var(--sub)}',
      '.lm-rb{flex:1;min-width:0}',
      '.lm-rt{font-size:14px;font-weight:800;line-height:1.35;transition:color .2s}',
      '.lm-rs{margin-top:3px;font-size:11.5px;color:var(--sub);line-height:1.45}',
      '.lm-dd{flex:none;font-size:11.5px;font-weight:800;color:var(--blue);padding-top:2px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.lm-dd .dd-s{display:block;margin-bottom:2px;font-size:10.5px;font-weight:700;color:var(--sub)}',
      '.lm-dd .dd-e{display:block}',
      '.lm-dd.hot{color:#ff6b6b}',
      // 신청·오픈 일시 한 줄: 금색, 오늘·내일이면 빨강, 마감은 회색
      '.lm-ap{margin-top:5px;font-size:13px;font-weight:800;line-height:1.35;color:var(--star);font-variant-numeric:tabular-nums}',
      '.lm-ap.hot{color:#ff6b6b}',
      '.lm-ap.off{font-size:11.5px;font-weight:700;color:var(--sub)}',
      '.lm-tag{display:inline-block;margin-left:5px;padding:0 5px;border-radius:4px;font-size:9.5px;font-weight:800;vertical-align:1px;color:var(--star);border:1px solid rgba(255,195,66,.4)}',
      '.lm-tag.new{color:#6fa8ff;border-color:rgba(49,130,246,.5)}',
      '.lm-tag.soon{color:#ff8a3d;border-color:rgba(255,138,61,.55)}',
      '.lm-tag.long{color:var(--sub);border-color:rgba(139,139,147,.45)}',
      '.lm-score{flex:none;width:48px;font-size:18px;font-weight:900;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}',
      '.lm-score.one{color:var(--sub)}', // 후기 1개짜리 점수는 흐리게
      // 박지 랭킹: 점수대 분포 막대, 점수대 제목, 후기 많은 순 막대
      '.lm-dist{margin:14px 0 0}',
      '.lm-dist-t{font-size:12px;font-weight:700;color:var(--sub)}',
      '.lm-dist-bar{display:flex;gap:2px;height:12px;margin-top:8px;border-radius:6px;overflow:hidden}',
      '.lm-dist i.b45{background:#3d8bff}.lm-dist i.b4{background:#7cb0ff}.lm-dist i.b3{background:#b9d3ff}.lm-dist i.blow{background:#5a5a62}',
      '.lm-dist-l{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11.5px;color:var(--sub)}',
      '.lm-dist-l span{display:inline-flex;align-items:center;gap:5px}.lm-dist-l i{width:8px;height:8px;border-radius:2px}',
      '.lm-band{display:flex;justify-content:space-between;align-items:baseline;margin:20px 0 2px;font-size:12px;color:var(--sub)}',
      '.lm-band b{font-size:14px;font-weight:800;color:var(--tx)}',
      '.lm-rgn{margin-left:6px;font-size:11.5px;font-weight:600;color:var(--sub)}',
      '.lm-row>.lm-stars{flex:none;align-self:center;margin-left:10px}',
      '.lm-rank{flex:none;width:28px;font-size:15px;font-weight:800;color:var(--sub);font-variant-numeric:tabular-nums}',
      '.lm-cbar{height:5px;margin-top:6px;border-radius:3px;background:#1c1c20;overflow:hidden}.lm-cbar i{display:block;height:100%;border-radius:3px;background:var(--blue)}',
      '.lm-many{flex:none;margin-left:12px;text-align:right;line-height:1.3}.lm-many b{display:block;font-size:14px;font-weight:800}.lm-many small{font-size:11px;color:var(--sub)}',
      '.lm-score small{display:block;margin-top:4px;font-size:10px;font-weight:700;letter-spacing:0;color:var(--sub)}',
      '.lm-post{position:relative;display:flex;gap:12px;padding:14px 0 12px;border-bottom:1px solid var(--div);cursor:pointer;transition:opacity .15s}',
      '.lm-lcol{flex:none;width:32px;display:flex;flex-direction:column;align-items:center}',
      '.lm-av{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-weight:800;color:#000}',
      '.lm-av.sm{width:24px;height:24px;font-size:10px}',
      '.lm-thread{flex:1;width:2px;min-height:16px;margin:6px 0 4px;border-radius:1px;background:#2a2a30}',
      '.lm-who{display:flex;align-items:center;gap:5px;font-size:12.5px;line-height:18px}',
      '.lm-who b{font-weight:700}',
      '.lm-who span{color:var(--faint)}',
      '.lm-tt{margin-top:2px;font-size:14px;font-weight:800;line-height:1.45}',
      '.lm-bd{margin-top:2px;font-size:13.5px;line-height:1.55;color:#d1d1d6;white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.lm-bd a{color:#8eb6ff;font-weight:700;text-decoration:underline;word-break:break-all}',
      '.lm-ig{margin-top:14px;max-width:400px}',
      '.lm-ig iframe{display:block;width:100%;border:0;border-radius:12px;background:#17171b}',
      '.lm-ytap{display:inline}',
      '.lm-ytap iframe{display:block;width:100%;margin-top:8px;border:0;border-radius:12px;background:#17171b;aspect-ratio:16/9}',
      '.lm-ytap.short iframe{width:min(70%,236px);aspect-ratio:9/16}',
      '.lmx-cm .lm-bd{display:block}',
      '.lm-photos{display:flex;gap:6px;margin-top:10px;overflow-x:auto;scrollbar-width:none}',
      '.lm-photos img{flex:none;width:100%;max-height:340px;object-fit:cover;border-radius:12px;background:#17171b}',
      '.lm-photos.multi img{width:78%}',
      '.lm-acts{display:flex;align-items:center;gap:4px;margin:8px 0 0 -8px}',
      '.lm-act{height:32px;padding:0 8px;border-radius:16px;display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--sub);font-variant-numeric:tabular-nums}',
      '.lm-act.on{color:var(--pink)}',
      '.lm-act.on svg{fill:currentColor;animation:lmPop .35s var(--ease)}',
      '.lm-stars{font-size:12px;letter-spacing:1px;color:var(--star)}',
      '.lm-stars span{color:#3a3a40}',
      // 게시판 분류: 위 탭 줄과 헷갈리지 않게 알약 버튼으로, 고른 칸은 흰 바탕
      '.lm-cats{display:flex;gap:8px;overflow-x:auto;margin:16px 0 2px;scrollbar-width:none}',
      '.lm-cats button{flex:none;display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 14px;border-radius:17px;background:#1c1c20;font-size:13.5px;font-weight:700;color:#c7c7cc;transition:background .15s,color .15s}',
      '.lm-cats button.on{background:var(--tx);color:#000}',
      // 투표: 보기 버튼 → 고른 뒤 막대
      '.lm-poll{margin-top:10px;display:flex;flex-direction:column;gap:6px}',
      '.lm-popt{width:100%;min-height:42px;padding:9px 14px;border-radius:12px;border:1.5px solid #34343a;font-size:14px;font-weight:700;text-align:left;line-height:1.4;transition:border-color .15s,background .15s}',
      '.lm-popt:active{background:#1c1c20;border-color:var(--blue)}',
      'button.lm-pbar{width:100%;text-align:left;cursor:pointer}button.lm-pbar:active{opacity:.75}',
      '.lm-pbar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:42px;padding:9px 14px;border-radius:12px;background:#1c1c20;overflow:hidden;font-size:14px;line-height:1.4}',
      '.lm-pbar i{position:absolute;left:0;top:0;bottom:0;background:#2e2e34;transition:width .5s var(--ease)}',
      '.lm-pbar.top i{background:color-mix(in srgb,var(--blue) 34%,#1c1c20)}',
      '.lm-pbar span,.lm-pbar b{position:relative;display:inline-flex;align-items:center;gap:5px}',
      '.lm-pbar span{font-weight:600}.lm-pbar.mine span{font-weight:800}',
      '.lm-pbar b{flex:none;font-weight:800;font-variant-numeric:tabular-nums}',
      '.lm-pmeta{margin-top:2px;font-size:11.5px;color:var(--sub)}',
      '.lm-popt-in{display:flex;align-items:center;gap:6px}.lm-popt-in .lm-in{flex:1;min-width:0}',
      '.lm-popt-in button{flex:none;width:32px;height:32px;display:grid;place-items:center;color:var(--sub)}',
      '.lm-private{display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:11.5px;color:var(--sub)}',
      '.lm-empty{padding:36px 0;text-align:center;font-size:13px;line-height:1.6;color:var(--sub)}',
      '.lm-kv{display:flex;justify-content:space-between;gap:14px;padding:7px 0;font-size:13.5px}',
      '.lm-kv span{flex:none;color:var(--sub)}',
      '.lm-kv b{font-weight:600;text-align:right}',
      '.lm-desc{margin:10px 0 0;font-size:13.5px;line-height:1.65;color:#d1d1d6;white-space:pre-wrap}',
      '.lm-poster{display:block;width:100%;height:auto;object-fit:contain;border-radius:14px;margin:2px 0 10px;background:#17171b}', // 세로로 긴 포스터도 잘리지 않게 원본 비율로
      '.lm-src{flex:none;width:48px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;align-self:center}',
      '.lm-src b{display:grid;place-items:center;width:22px;height:16px;border-radius:4px;background:#2a2a30;color:#fff;font-size:9px;font-weight:800;line-height:1}',
      '.lm-src.yt b{background:#ff0033}',
      '.lm-src.yt b:before{content:"";border-style:solid;border-width:3px 0 3px 5px;border-color:transparent transparent transparent #fff}',
      '.lm-src small{font-size:9px;font-weight:800;letter-spacing:0;color:var(--sub)}',
      '.lm-advisor{margin:2px 0 12px;padding:12px 14px;border-radius:12px;background:#17171b}',
      '.lm-advisor b{display:block;font-size:13.5px;font-weight:800;line-height:1.4}',
      '.lm-advisor p{margin:6px 0 0;font-size:12.5px;line-height:1.6;color:var(--sub);white-space:pre-wrap}',
      '.lm-yt{display:block;margin:0 0 14px;border-radius:14px;overflow:hidden;background:#17171b;color:inherit;text-decoration:none}',
      '.lm-yt img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}',
      '.lm-yt span{display:block;padding:10px 14px;font-size:13px;font-weight:700}',
      '.lm-tv{width:88%;aspect-ratio:16/9;margin:2px auto 14px;border-radius:14px;overflow:hidden;background:#17171b}',
      '.lm-tv.short{width:min(70%,236px);aspect-ratio:9/16}',
      '.lm-tv-play{position:relative;display:block;width:100%;height:100%;padding:0}',
      '.lm-tv-play img,.lm-tv iframe{display:block;width:100%;height:100%;border:0;object-fit:cover}',
      '.lm-tv-btn{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(0,0,0,.6);display:grid;place-items:center}',
      '.lm-tv-btn:before{content:"";margin-left:4px;border-style:solid;border-width:10px 0 10px 16px;border-color:transparent transparent transparent #fff}',
      '.lm-blog{display:flex;align-items:center;justify-content:space-between;margin:0 0 14px;padding:14px 16px;border-radius:14px;background:#17171b;color:var(--tx);text-decoration:none;font-size:14px;font-weight:700}',
      '.lm-gcap{margin:16px 0 2px;font-size:11.5px;font-weight:700;color:var(--sub)}',
      '.lm-guide .lm-desc{margin:8px 0 0;font-size:13px;line-height:1.7;color:#8d8d96}',
      '.lm-block{margin-top:28px}',
      '.lm-block .lm-sec{margin:0;font-size:17px;font-weight:800;letter-spacing:-.03em;line-height:1.35;color:#f7f7f8}',
      '.lm-block .lm-desc{margin:8px 0 0}',
      '.lm-gear{margin-top:12px}',
      '.lm-guide .lm-item b{font-size:14.5px;font-weight:700;color:#f2f2f3}',
      '.lm-guide .lm-item small{color:#6f6f78}',
      '.lm-guide .lm-item em{font-size:12px;font-weight:600;color:#9a9aa3}',
      '.lm-gear .lm-item:last-child{border-bottom:0}',
      '.lm-item{display:flex;gap:10px;align-items:center;padding:9px 0;font-size:13.5px;color:inherit;text-decoration:none;border-bottom:1px solid var(--div)}',
      '.lm-item .nm{flex:1;min-width:0}',
      '.lm-item b{display:block;font-weight:600}',
      '.lm-item small{display:block;margin-top:2px;font-size:12px;line-height:1.45;color:var(--sub)}',
      '.lm-item em{flex:none;font-style:normal;font-size:12px;text-align:right;color:var(--tx);font-variant-numeric:tabular-nums}',
      '.lm-item svg{flex:none;color:var(--faint)}',
      '.lm-faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 0;font-size:14px;font-weight:800;line-height:1.4;text-align:left}',
      '.lm-btn{flex:1;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:700;background:#2a2a30;color:var(--tx);text-decoration:none;transition:transform .15s,opacity .2s,background .2s}',
      '.lm-btn:active{transform:scale(.97)}',
      '.lm-btn.sm{height:40px;border-radius:12px;font-size:13px}',
      '.lm-btn.main{flex:1.6;background:var(--accent-fill);color:var(--on-accent)}',
      '.lm-btn:disabled{opacity:.35;pointer-events:none}',
      '.lm-hint{margin:8px 0 0;font-size:11.5px;line-height:1.5;color:var(--sub)}',
      '.lm-win{position:absolute;top:0;bottom:0;left:0;right:0;z-index:1;max-width:480px;margin:0 auto;display:flex;flex-direction:column;background:var(--bg);box-shadow:-14px 0 34px rgba(0,0,0,.5);pointer-events:auto;transform:translateX(105%);transition:transform .42s var(--ease)}',
      '.lm-win.on{transform:none}',
      '.lmw-top{flex:none;position:relative;z-index:2;padding:calc(4px + env(safe-area-inset-top,0px)) 20px 0;background:var(--bg)}',
      '.lmw-bar{height:48px;display:flex;align-items:center;justify-content:space-between}',
      '.lmw-back{width:40px;height:40px;margin-left:-10px;display:grid;place-items:center;border-radius:50%}',
      '.lmw-back:active{background:rgba(255,255,255,.06)}',
      '.lmw-mini{font-size:15px;font-weight:800;opacity:0;transition:opacity .2s}',
      '.lmw-adm{min-width:40px;font-size:12px;font-weight:700;color:var(--star);text-align:right}',
      '.lmw-big{margin:2px 0 8px;max-height:32px;overflow:hidden;font-size:21px;font-weight:800;letter-spacing:-.03em;line-height:1.3;transition:max-height .3s var(--ease),opacity .2s,margin .3s}',
      '.lm-win.collapsed .lmw-big{max-height:0;opacity:0;margin:0}',
      '.lm-win.collapsed .lmw-mini{opacity:1}',
      '.lm-win .lmh-menu{margin:0 -20px;padding:4px 20px 8px}',
      '.lmw-track{flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}',
      '.lmw-track::-webkit-scrollbar{display:none}',
      '.lmw-pane{flex:0 0 100%;min-width:0;height:100%;overflow-y:auto;overscroll-behavior-y:contain;scroll-snap-align:start;scroll-snap-stop:always;padding:0 20px calc(40px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}',
      '.lm-scrim{position:absolute;inset:0;z-index:2;background:rgba(0,0,0,.55);opacity:0;transition:opacity .35s;pointer-events:auto}',
      '.lm-scrim.on{opacity:1}',
      '.lm-sheet{position:absolute;left:0;right:0;bottom:0;z-index:3;max-width:480px;max-height:92%;margin:0 auto;overflow-y:auto;overscroll-behavior:contain;padding:0 20px calc(16px + env(safe-area-inset-bottom,0px));background:#1c1c20;border-radius:24px 24px 0 0;transform:translateY(100%);transition:transform .45s var(--ease);pointer-events:auto}',
      '.lm-sheet.on{transform:none}',
      '.lm-sheet.drag{transition:none}',
      '.lm-grab{position:sticky;top:0;z-index:1;display:flex;justify-content:center;padding:10px 0 14px;background:#1c1c20;touch-action:none;cursor:grab}',
      '.lm-grab i{width:36px;height:4px;border-radius:2px;background:#3a3a40}',
      '.lm-sheet h3{margin:4px 0 6px;font-size:17px;font-weight:800;letter-spacing:-.03em;line-height:1.4}',
      '.lm-ssub{margin:0 0 8px;font-size:12.5px;color:var(--sub);line-height:1.5}',
      '.lm-sheet .lm-btn{width:100%;margin-top:18px}',
      '.lm-ta{display:block;width:100%;min-height:96px;padding:10px 0;border:0;border-bottom:2px solid #2e2e34;background:none;color:var(--tx);font-size:16px;line-height:1.6;outline:none;resize:vertical;-webkit-user-select:text;user-select:text}',
      '.lm-in{display:block;width:100%;height:44px;padding:0;border:0;border-bottom:2px solid #2e2e34;background:none;color:var(--tx);font-size:16px;font-weight:600;outline:none;border-radius:0;transition:border-color .2s;color-scheme:dark;-webkit-user-select:text;user-select:text}',
      '.lm-in:focus,.lm-ta:focus{border-color:var(--blue)}',
      '.lm-ta::placeholder,.lm-in::placeholder{color:var(--faint)}',
      '.lm-lbl{display:block;margin:14px 0 2px;font-size:11.5px;font-weight:700;color:var(--sub)}',
      '.lm-lbl b{color:#ff6b6b;font-weight:700}',
      '.lm-two{display:flex;gap:12px}.lm-two>*{flex:1;min-width:0}',
      '.lm-chipline{display:flex;flex-wrap:wrap;gap:14px;margin:6px 0 4px;font-size:13.5px;font-weight:700;color:var(--faint)}',
      '.lm-chipline button.on{color:var(--blue)}',
      '.lm-switch{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;font-size:13.5px;border-bottom:1px solid var(--div)}',
      '.lm-switch i{flex:none;position:relative;width:44px;height:26px;border-radius:13px;background:#3a3a40;transition:background .2s}',
      '.lm-switch i::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .2s var(--ease)}',
      '.lm-switch.on i{background:var(--accent-fill)}.lm-switch.on i::after{transform:translateX(18px)}',
      '.lm-sugg{margin:4px 0 0;border-radius:12px;background:#26262c;overflow:hidden}',
      '.lm-sugg button{width:100%;display:flex;justify-content:space-between;gap:10px;padding:10px 14px;font-size:13.5px;text-align:left}',
      '.lm-sugg button+button{border-top:1px solid var(--div)}',
      '.lm-sugg small{flex:none;color:var(--sub)}',
      '.lm-picked{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;font-size:12.5px;color:var(--blue)}',
      '.lm-edit-item{padding:10px 0;border-bottom:1px solid var(--div)}',
      '.lm-edit-item .top{display:flex;align-items:center;gap:10px;font-size:13.5px}',
      '.lm-edit-item .top b{flex:1;min-width:0;font-weight:500}',
      '.lm-edit-item .top em{font-style:normal;font-size:11.5px;color:var(--sub)}',
      '.lm-edit-item .lm-in{height:38px;font-size:16px;font-weight:500;border-bottom-width:1px}',
      '.lm-edit-item .top button{flex:none;width:32px;height:32px;display:grid;place-items:center;border-radius:50%;color:var(--sub)}',
      '.lm-edit-item .top button:active{background:rgba(255,255,255,.06)}',
      '.lm-edit-item .wrow{display:flex;gap:12px}.lm-edit-item .wrow>.lm-in{flex:1}',
      '.lm-edit-item .prow{display:flex;gap:12px;margin-top:8px}.lm-edit-item .prow>.lm-in{flex:1}',
      '.lm-btn.main.red{background:#e5484d}',
      '.lmw-edge{position:absolute;top:calc(52px + env(safe-area-inset-top,0px));bottom:0;left:0;z-index:3;width:20px;touch-action:pan-y}',
      '.lmw-big{display:block}',
      '.lm-sheet .lmx-btns .lm-btn{margin-top:0}',
      '.lm-sheet .lmx-btns{margin-top:18px}',
      '.lm-prev{display:block;width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-top:8px;background:#17171b}',
      '.lm-file{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:13.5px;font-weight:700;color:var(--blue)}',
      '.lm-toast{position:absolute;left:50%;bottom:20px;z-index:4;max-width:calc(100% - 40px);display:flex;align-items:center;gap:10px;padding:12px 16px 12px 12px;border-radius:14px;background:#2c2c34;color:var(--tx);font-size:13.5px;font-weight:600;white-space:nowrap;box-shadow:0 8px 30px rgba(0,0,0,.45);pointer-events:none;opacity:0;transform:translate(-50%,16px);transition:transform .4s var(--ease),opacity .3s}',
      '.lm-toast.on{opacity:1;transform:translate(-50%,0)}',
      '.lm-toast i{flex:none;width:20px;height:20px;border-radius:50%;background:var(--blue);display:grid;place-items:center;color:#fff}',
      '.lm-toast.err i{background:#ff5b5b}',
      '.lm-toast span{overflow:hidden;text-overflow:ellipsis}',
      // P4: 회원 쓰기
      '.lm-act:active{background:rgba(255,255,255,.06)}',
      '.lm-act[disabled]{opacity:.5}',
      '.lmx-cm .lm-cm-acts{display:flex;gap:14px;margin-top:4px;font-size:11px;color:var(--faint)}',
      '.lmx-cm .lm-cm-acts button{font-weight:600}',
      '.lmx-cm .lm-cm-acts .red{color:#ff6b6b}',
      '.lmx-compose{display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:8px;border-top:1px solid var(--div)}',
      '.lmx-compose input{flex:1;min-width:0;height:40px;padding:0;border:0;background:none;color:var(--tx);font-size:16px;outline:none;-webkit-user-select:text;user-select:text}',
      '.lmx-compose input::placeholder{color:var(--faint)}',
      '.lmx-compose button{flex:none;height:32px;padding:0 14px;border-radius:16px;background:var(--tx);color:var(--bg);font-size:12.5px;font-weight:700}',
      '.lmx-compose button:disabled{opacity:.4}',
      '.lmx-login{margin-top:8px;font-size:12.5px;font-weight:700;color:var(--blue)}',
      '.lm-bigstars{display:flex;gap:6px;margin:10px 0 6px}',
      '.lm-bigstars button{font-size:38px;line-height:1;color:#2e2e34;transition:color .15s}',
      '.lm-bigstars button.on{color:var(--star);animation:lmPop .35s var(--ease) backwards}',
      '.lm-slabel{margin-bottom:6px;font-size:13.5px;font-weight:600;color:var(--sub)}',
      '.lm-thumbs{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
      '.lm-thumb{position:relative;width:76px;height:76px;border-radius:12px;overflow:hidden;background:#26262c;display:grid;place-items:center;font-size:11px;color:var(--sub)}',
      '.lm-thumb img{width:100%;height:100%;object-fit:cover}',
      '.lm-thumb button{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.65);color:#fff;display:grid;place-items:center}',
      '.lm-chipline button:disabled{opacity:.45;cursor:default}',
      '.lm-revhead{display:flex;align-items:baseline;gap:10px;margin:18px 0 2px}',
      '.lm-revhead b{font-size:26px;font-weight:900;letter-spacing:-.05em;font-variant-numeric:tabular-nums}',
      '.lm-revhead .lm-cnt{font-size:12.5px;color:var(--sub)}',
      '.lm-revhead .lm-stars{font-size:13.5px}',
      '.lm-back-all{display:inline-flex;align-items:center;gap:2px;margin-top:14px;font-size:12.5px;font-weight:700;color:var(--sub)}',
      '.lm-mine{display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;font-size:9.5px;font-weight:700;color:var(--blue);border:1px solid rgba(49,130,246,.45)}',
      // P5: 달력·패킹 연동 (행사 펼침 안에서 두 가지 고르기)
      '.lm-cal-row{margin-top:8px}',
      '.lm-cal-row>.lm-btn,.lm-kit-row>.lm-btn{width:100%}',
      '.lm-kit-row{margin-top:14px;display:flex;gap:8px}',
      '.lm-btn.ok{background:#1f3a63;color:#cfe0ff}',
      '.lmx-sub{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s var(--ease)}',
      '.lmx-sub>div{overflow:hidden;min-height:0}',
      '.lmx.cal .lmx-sub{grid-template-rows:1fr}',
      '.lm-pick{width:100%;display:flex;align-items:center;gap:12px;padding:12px 0;text-align:left}',
      '.lm-pick+.lm-pick{border-top:1px solid var(--div)}',
      '.lmx-sub .lm-pick:first-child{margin-top:6px}',
      '.lm-radio{flex:none;width:24px;height:24px;border-radius:50%;border:2px solid #3a3a40;display:grid;place-items:center;color:#fff;transition:background .2s,border-color .2s}',
      '.lm-pick.on .lm-radio{background:var(--blue);border-color:var(--blue)}',
      '.lm-radio svg{opacity:0;transform:scale(.4);transition:.25s var(--ease)}',
      '.lm-pick.on .lm-radio svg{opacity:1;transform:none}',
      '.lm-pick b{display:block;font-size:14px;font-weight:700}',
      '.lm-pick small{display:block;margin-top:3px;font-size:11.5px;line-height:1.45;color:var(--sub)}',
      '.lm-pick[disabled]{opacity:.5}',
      '@media (prefers-reduced-motion:reduce){#okbmLoungeLayer *,#okbmLoungeHome *{animation:none !important;transition:none !important}}',
      // 지도 페이지 하단 독은 safe-area 대체값이 0px(홈은 8px)
      IS_MAP ? '#okbmLoungeLayer{bottom:calc(56px + env(safe-area-inset-bottom,0px))}' : ''
    ].join('\n');
    document.head.appendChild(css);
  }

  // ---------- 데이터 (window.supabaseClient, RLS가 권한을 가른다) ----------
  const POST_COLS = 'id,user_id,nickname,category,title,body,photos,is_private,likes_count,comments_count,created_at,poll_options,poll_ends_at';
  const postsBy = {}; // cat → { rows, done, loading }

  async function q(builder) {
    const res = await builder;
    if (res && res.error) throw res.error;
    return res ? res.data : null;
  }
  async function loadEvents() {
    const c = sb();
    if (!c) throw new Error('no_client');
    const t = todayKey();
    const rows = await q(c.from('lounge_events').select('*')
      .or('end_date.gte.' + t + ',and(end_date.is.null,start_date.gte.' + t + ')')
      .order('start_date', { ascending: true }).limit(60));
    D.events = Array.isArray(rows) ? rows : [];
  }
  async function loadPastEvents() {
    const c = sb();
    if (!c) return;
    const rows = await q(c.from('lounge_events').select('*').lt('start_date', todayKey())
      .order('start_date', { ascending: false }).limit(30));
    D.pastEvents = (Array.isArray(rows) ? rows : []).filter(function (e) { return evView(e).past; });
  }
  async function loadGuides() {
    const c = sb();
    if (!c) throw new Error('no_client');
    const rows = await q(c.from('lounge_guides').select('*')
      .order('sort', { ascending: true }).order('created_at', { ascending: true }).limit(100));
    D.guides = Array.isArray(rows) ? rows : [];
  }
  async function loadDeals() {
    const c = sb();
    if (!c) throw new Error('no_client');
    const rows = await q(c.from('lounge_deals').select('*')
      .order('sort', { ascending: true }).order('created_at', { ascending: true }).limit(80));
    D.deals = Array.isArray(rows) ? rows : [];
  }
  async function loadNews() {
    const c = sb();
    if (!c) throw new Error('no_client');
    const rows = await q(c.from('lounge_news').select('id,kind,title,body,link_url,images,sort,is_active,created_at')
      .order('sort', { ascending: true }).order('created_at', { ascending: false }).limit(60));
    D.news = Array.isArray(rows) ? rows : [];
  }
  async function loadPosts(cat, more) {
    const c = sb();
    if (!c) throw new Error('no_client');
    const key = cat || 'all';
    const st = postsBy[key] || (postsBy[key] = { rows: [], done: false, loading: false });
    if (st.loading || (more && st.done)) return st;
    st.loading = true;
    try {
      let b = c.from('lounge_posts').select(POST_COLS).order('created_at', { ascending: false }).limit(POST_PAGE);
      if (key !== 'all') b = b.eq('category', key);
      // 더 보기 기준은 서버가 준 마지막 줄. 알림으로 끼워 넣은 옛 글·방금 쓴 글이 기준을 옮기지 않게 따로 둔다
      if (more && st.cursor) b = b.lt('created_at', st.cursor);
      const rows = await q(b);
      const list = Array.isArray(rows) ? rows : [];
      if (more) {
        const have = new Set(st.rows.map(function (p) { return p.id; }));
        st.rows = st.rows.concat(list.filter(function (p) { return !have.has(p.id); }));
        st.rows.sort(function (a, b2) { return String(b2.created_at).localeCompare(String(a.created_at)); });
      } else {
        // 새로 받을 때도 끼워 넣은 글(알림으로 연 옛 글)은 남긴다
        const extra = st.rows.filter(function (p) { return p.__extra && !list.some(function (x) { return x.id === p.id; }); });
        st.rows = list.concat(extra);
      }
      if (list.length) st.cursor = list[list.length - 1].created_at;
      st.done = list.length < POST_PAGE;
      await Promise.all([loadMyLikes(list.map(function (p) { return p.id; })), loadPolls(list)]);
    } finally {
      st.loading = false;
    }
    return st;
  }
  // 내가 누른 좋아요 (RLS: 본인 것만 보임). 실패해도 목록은 그대로 보여 준다
  async function loadMyLikes(ids) {
    const c = sb(), me = myId();
    if (!c || !me || !loggedIn()) return;
    const need = ids.filter(function (id) { return id && !D.likeChecked.has(id); });
    if (!need.length) return;
    try {
      const rows = await q(c.from('lounge_post_likes').select('post_id').eq('user_id', me).in('post_id', need));
      need.forEach(function (id) { D.likeChecked.add(id); });
      (Array.isArray(rows) ? rows : []).forEach(function (r) { D.liked.add(r.post_id); });
    } catch (e) { console.warn('[lounge.js:loadMyLikes]', e); }
  }
  // 투표 결과: 참여 수는 누구나, 보기별 수는 내가 했거나 마감된 투표만 온다. 실패해도 목록은 보여 준다
  async function loadPolls(rows) {
    const c = sb();
    const ids = rows.filter(function (p) { return p.category === 'poll'; }).map(function (p) { return p.id; });
    if (!c || !ids.length) return;
    try {
      const res = await q(c.rpc('okbm_poll_results', { p_ids: ids }));
      (Array.isArray(res) ? res : []).forEach(function (r) { if (r && r.post_id) D.poll[r.post_id] = r; });
    } catch (e) { console.warn('[lounge.js:loadPolls]', e); }
  }
  // 목록에 없는 글 하나 (알림·신고 검수에서 열 때). 없으면 null
  async function loadPostById(id) {
    const c = sb();
    if (!c || !id) return null;
    const rows = await q(c.from('lounge_posts').select(POST_COLS).eq('id', id).limit(1));
    const p = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!p) return null;
    await loadPolls([p]);
    const st = postsBy.all || (postsBy.all = { rows: [], done: false, loading: false, cursor: null });
    if (!st.rows.some(function (x) { return x.id === p.id; })) {
      p.__extra = true; // 더 보기 기준(cursor)에는 안 쓴다
      st.rows.push(p);
      st.rows.sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    }
    await loadMyLikes([p.id]);
    return p;
  }
  // 박지 하나의 후기 (후기 탭을 그 박지로 좁혔을 때, 쓰기 시트의 "내 후기")
  async function loadSpotReviews(spotId, more) {
    const c = sb();
    if (!c) throw new Error('no_client');
    const cur = D.spotRev && D.spotRev.spot_id === spotId ? D.spotRev : null;
    const before = more && cur && cur.reviews.length ? cur.reviews[cur.reviews.length - 1].created_at : null;
    const both = await Promise.all([
      q(c.rpc('get_spot_reviews', { p_spot_id: spotId, p_limit: 20, p_before: before })),
      more ? Promise.resolve(null) : q(c.rpc('okbm_spot_tips_summary', { p_spot_id: spotId })).catch(function () { return null; }),
      more ? Promise.resolve(null) : q(c.rpc('okbm_recent_spot_tips', { p_spot_id: spotId, p_limit: 50, p_before: null })).catch(function () { return null; })
    ]);
    const res = both[0];
    const list = (res && Array.isArray(res.reviews)) ? res.reviews : [];
    const out = {
      spot_id: spotId, tier: (res && res.tier) || 'guest', summary: (res && res.summary) || null,
      mine: (res && res.mine) || (cur && more ? cur.mine : null),
      reviews: more && cur ? cur.reviews.concat(list) : list, done: list.length < 20,
      tipSum: more && cur ? cur.tipSum : both[1],
      tipRows: more && cur ? cur.tipRows : ((both[2] && Array.isArray(both[2].rows)) ? both[2].rows : [])
    };
    // 늦게 온 다른 박지 응답이 지금 보고 있는 박지를 덮지 않게, 좁혀 보는 박지일 때만 저장한다
    if (S.revSpot === spotId) D.spotRev = out;
    return out;
  }
  // 글·댓글 수가 바뀌면 모든 캐시의 같은 글을 같이 고친다
  function forEachPost(id, fn) {
    Object.keys(postsBy).forEach(function (k) { postsBy[k].rows.forEach(function (p) { if (p.id === id) fn(p); }); });
  }
  function dropPost(id) {
    Object.keys(postsBy).forEach(function (k) { postsBy[k].rows = postsBy[k].rows.filter(function (x) { return x.id !== id; }); });
    delete D.comments[id];
  }
  // 홈은 10곳만 받는다. 랭킹 탭을 한 번 열었으면(D.rank) 다시 받을 때도 전체를 받는다 (전송량 아끼기)
  async function loadTop(full) {
    const c = sb();
    if (!c) throw new Error('no_client');
    full = full || D.rank !== null;
    const rows = await q(c.rpc('get_top_reviewed_spots', { p_min_count: 1, p_limit: full ? 500 : 10 }));
    // 점수가 같으면 후기가 많은 박지를 앞에 (후기 1개짜리 5.0이 1등이 되지 않게)
    const list = (Array.isArray(rows) ? rows : []).slice().sort(function (a, b) {
      return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0) || (Number(b.review_count) || 0) - (Number(a.review_count) || 0);
    });
    D.top = list.slice(0, 10);
    if (full) D.rank = list;
  }
  let rankLoading = false;
  function ensureRank() {
    if (D.rank !== null || rankLoading || D.status !== 'ready') return;
    rankLoading = true;
    loadTop(true).catch(function (e) { console.warn('[lounge.js:ensureRank]', e); D.rank = D.top.slice(); })
      .then(function () { rankLoading = false; rerenderPane(3); });
  }
  async function loadRecentReviews(more) {
    const c = sb();
    if (!c) return;
    const before = more && D.recent && D.recent.length ? D.recent[D.recent.length - 1].created_at : null;
    const res = await q(c.rpc('get_spot_reviews', { p_spot_id: null, p_limit: 20, p_before: before }));
    const list = (res && Array.isArray(res.reviews)) ? res.reviews : [];
    D.recentTier = (res && res.tier) || 'guest';
    D.recent = more ? (D.recent || []).concat(list) : list;
    D.recentDone = list.length < 20;
    if (!more) {
      const t = await q(c.rpc('okbm_recent_spot_tips', { p_spot_id: null, p_limit: 30, p_before: null })).catch(function () { return null; });
      D.tipsRecent = (t && Array.isArray(t.rows)) ? t.rows : [];
    }
  }
  async function loadComments(postId) {
    const c = sb();
    if (!c) return [];
    const rows = await q(c.from('lounge_post_comments').select('id,post_id,user_id,nickname,body,created_at')
      .eq('post_id', postId).order('created_at', { ascending: true }).limit(100));
    // 불러오는 사이에 단 내 댓글이 있으면 지우지 않고 합친다
    const list = Array.isArray(rows) ? rows.slice() : [];
    (D.comments[postId] || []).forEach(function (c) { if (!list.some(function (x) { return String(x.id) === String(c.id); })) list.push(c); });
    D.comments[postId] = list;
    return D.comments[postId];
  }
  async function refreshAdmin() {
    if (!loggedIn()) { D.admin = false; return; }
    try {
      D.admin = typeof window.okbmRefreshAdminFlagFromServer === 'function'
        ? !!(await window.okbmRefreshAdminFlagFromServer())
        : !!(typeof window.okbmIsCurrentUserAdmin === 'function' && window.okbmIsCurrentUserAdmin());
    } catch (e) { D.admin = false; }
  }
  // 탭 순서와 같은 순서로 불러온다. D.fail[i] = 그 탭만 실패
  function loadTabs() {
    return Promise.allSettled([loadEvents(), loadGuides(), loadPosts('all'), loadTop(), loadDeals(), loadNews()]).then(function (r) {
      r.forEach(function (x) { if (x.status === 'rejected') console.warn('[lounge.js:loadTabs]', x.reason); });
      D.fail = r.map(function (x) { return x.status === 'rejected'; });
      return r;
    });
  }
  let loadAllPromise = null;
  function loadAll() {
    if (loadAllPromise) return loadAllPromise;
    D.status = 'loading';
    renderAll();
    loadAllPromise = (async function () {
      try {
        await whenClient();
        await refreshAdmin();
        lastUid = myId();
        const r = await loadTabs();
        D.status = r.every(function (x) { return x.status === 'rejected'; }) ? 'error' : 'ready';
      } catch (e) {
        console.warn('[lounge.js:loadAll]', e);
        D.status = 'error';
      } finally {
        loadAllPromise = null;
      }
      renderAll();
      if (win) ensureRecent();
    })();
    return loadAllPromise;
  }
  // supabase 클라이언트는 romantic-sync.js가 만든다. 늦게 준비되면 잠깐 기다린다(최대 10초)
  function whenClient() {
    if (sb()) return Promise.resolve(sb());
    return new Promise(function (resolve, reject) {
      let n = 0;
      const t = setInterval(function () {
        if (sb()) { clearInterval(t); resolve(sb()); } else if (++n > 100) { clearInterval(t); reject(new Error('no_client')); }
      }, 100);
    });
  }
  const visiblePosts = function (cat) {
    const st = postsBy[cat || 'all'];
    return st ? st.rows.filter(function (p) { return !hidden(p); }) : [];
  };
  function findPost(id) {
    const keys = Object.keys(postsBy);
    for (let i = 0; i < keys.length; i++) {
      const hit = postsBy[keys[i]].rows.find(function (p) { return p.id === id; });
      if (hit) return hit;
    }
    return null;
  }

  // ---------- 목록 조각 (홈·라운지 창 공용. full = 창에서 전부) ----------
  const chev = function (rot) { return '<span class="lm-chev ' + (rot ? 'rot' : '') + '">' + ico(P.chevR, 18) + '</span>'; };
  const stars = function (n) { n = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return '<span class="lm-stars">' + '★'.repeat(n) + '<span>' + '★'.repeat(5 - n) + '</span></span>'; };
  // 글·댓글·후기 글쓴이 이름: 누르면 그 사람 정보창(프로필)
  const whoName = function (name, uid) {
    const n = String(name || '백패커');
    if (!uid) return '<b>' + esc(n) + '</b>';
    return '<button type="button" data-a="user" data-v="' + esc(uid) + '" data-n="' + esc(n) + '" style="font:inherit;font-weight:700;color:inherit;padding:0" aria-label="' + esc(n) + ' 정보 보기"><b>' + esc(n) + '</b></button>';
  };
  const av = function (name, uid, cls) {
    const ch = String(name || '낭').trim().charAt(0) || '낭';
    return '<div class="lm-av ' + (cls || '') + '" style="background:' + avColor(uid) + '">' + esc(ch) + '</div>';
  };
  // 라운지 창 글·댓글·후기의 동그라미: 누르면 그 사람 정보창 (홈 목록 줄은 줄 전체가 버튼이라 그냥 av)
  const avUser = function (name, uid, cls) {
    if (!uid) return av(name, uid, cls);
    const n = String(name || '백패커');
    return '<button type="button" data-a="user" data-v="' + esc(uid) + '" data-n="' + esc(n) + '" style="padding:0;border-radius:50%" aria-label="' + esc(n) + ' 정보 보기">' + av(name, uid, cls) + '</button>';
  };
  const fold = function (id, head, body, open) { return '<div class="lmx' + (open ? ' open' : '') + '" data-id="' + esc(id) + '">' + head + '<div class="lmx-body"><div>' + body + '</div></div></div>'; };
  const moreBtn = function (tab, label) { return '<button type="button" class="lmh-more" data-a="lounge" data-v="' + tab + '">' + esc(label) + ico(P.chevR, 14) + '</button>'; };
  const skeleton = function () { return '<div class="lm-sk"><i></i><b></b></div>'.repeat(HOME_N) + '<div class="lmh-more">&nbsp;</div>'; };
  const homeEmpty = function (msg, tab, label) { return '<div class="lmh-empty">' + esc(msg) + '</div>' + moreBtn(tab, label); };
  const errorBox = function () { return '<div class="lmh-empty">라운지를 불러오지 못했어요<button type="button" class="lm-btn sm" style="flex:none;width:auto;padding:0 18px" data-a="retry">다시 시도</button></div>'; };
  const adminLinks = function (pairs) {
    if (!D.admin) return '';
    return '<div class="lmx-links">' + pairs.map(function (p) {
      return '<button type="button" class="' + (p[2] || 'adm') + '" data-a="' + p[0] + '" data-v="' + esc(p[3] || '') + '">' + esc(p[1]) + '</button>';
    }).join('') + '</div>';
  };
  function menuHtml(active, countFirst) {
    return '<div class="lmh-menu" role="tablist">' + TAB_ORDER.map(function (i) {
      let n = '';
      if (countFirst && D.status === 'ready') {
        if (i === 0) n = ' <em>' + thisMonthEvents().length + '</em>';
        else if (i === TAB_DEAL) n = ' <em>' + ongoingDeals().length + '</em>';
      }
      return '<button type="button" role="tab" aria-selected="' + (i === active) + '" class="' + (i === active ? 'on' : '') + '" data-a="tab" data-v="' + i + '">' + esc(TABS[i]) + n + '</button>';
    }).join('') + '<span class="lmh-ind"></span></div>';
  }

  // 행사
  function evTags(e) {
    const v = evView(e);
    let t = '';
    if (v.isNew) t += '<span class="lm-tag new">NEW</span>';
    if (v.endingSoon) t += '<span class="lm-tag soon">곧 마감</span>';
    if (v.isLong) t += '<span class="lm-tag long">장기</span>';
    if (e.is_pinned) t += '<span class="lm-tag">고정</span>';
    if (D.admin && !e.is_active) t += '<span class="lm-tag">숨김</span>';
    return t;
  }
  // ---------- 달력·패킹 연동 (P5, romantic-sync.js okbmSetPlanEvent / romantic-plan.js okbmSetSinglePlanSpotForDate·okbmAddGearsToPack) ----------
  // A1 = 행사로 표시(okbm_plan_events), A2 = 이날 내 일정(okbm_plan_spots에 eventId)
  function calState(e) {
    const marked = typeof window.okbmHasPlanEvent === 'function' && window.okbmHasPlanEvent(e.id);
    let planned = false;
    try {
      const spots = (window.RomanticVault && typeof window.RomanticVault.read === 'function') ? window.RomanticVault.read('okbm_plan_spots', {}) : {};
      Object.keys(spots || {}).forEach(function (k) {
        (Array.isArray(spots[k]) ? spots[k] : []).forEach(function (sp) { if (sp && sp.eventId === e.id) planned = true; });
      });
    } catch (err) {}
    return { marked: !!marked, planned: planned };
  }
  // 이미 시작한 행사는 오늘로, 끝났으면 ''(등록 안 함)
  function planDateOf(e) {
    const v = evView(e);
    if (v.past) return '';
    const t = todayKey();
    return String(e.start_date) < t ? t : String(e.start_date).slice(0, 10);
  }
  function calSlotInner(e) {
    const st = calState(e);
    const on = st.marked || st.planned;
    const pd = planDateOf(e);
    const pdText = pd ? (parseInt(pd.slice(5, 7), 10) + '.' + parseInt(pd.slice(8, 10), 10)) : '';
    return `<button type="button" class="lm-btn sm ${on ? 'ok' : ''}" data-a="cal-open" aria-expanded="false">${ico(on ? P.check : P.cal, 16)}${on ? '내 달력에 있어요' : '내 달력에 추가'}</button>
      <div class="lmx-sub"><div>
        <button type="button" class="lm-pick ${st.marked ? 'on' : ''}" data-a="cal-mark" data-v="${esc(e.id)}" aria-pressed="${st.marked}"><span class="lm-radio">${ico(P.check, 14)}</span><span><b>${st.marked ? '행사로 표시했어요' : '행사로 표시'}</b><small>${st.marked ? '다시 누르면 달력에서 빼요.' : '기간 전체에 띠로 보여요. 내 일정과 따로 보여요.'}</small></span></button>
        <button type="button" class="lm-pick ${st.planned ? 'on' : ''}" data-a="cal-plan" data-v="${esc(e.id)}" aria-pressed="${st.planned}" ${pd ? '' : 'disabled'}><span class="lm-radio">${ico(P.check, 14)}</span><span><b>${st.planned ? '내 일정으로 등록했어요' : '이날 내 일정으로 등록'}</b><small>${pd ? pdText + '에 넣고 패킹 리스트와 이어져요. 그날 일정이 있으면 바꿀지 먼저 물어봐요.' : '끝난 행사라 등록할 수 없어요.'}</small></span></button>
        <button type="button" class="lmx-login" data-a="open-cal" data-v="${esc(pd || String(e.start_date).slice(0, 10))}">내 달력 열기${ico(P.chevR, 14)}</button>
      </div></div>`;
  }
  // 홈·창 양쪽의 같은 항목 칸을 다시 그린다(펼침·고르기 상태는 그대로)
  function repaintSlot(sel, id, html) {
    [home, layer].forEach(function (root) {
      if (!root) return;
      root.querySelectorAll('.lmx').forEach(function (n) {
        if (n.dataset.id !== String(id)) return;
        const slot = n.querySelector(sel);
        if (slot) slot.innerHTML = html;
      });
    });
  }
  function evItem(e) {
    const v = evView(e);
    const spot = e.spot_id ? spotById(e.spot_id) : null;
    const place = String(e.place || '').trim() || spotName(spot);
    // 신청 일시가 있으면 제목 밑에 '10월 30일(목) 오후 2시 신청 오픈'을 크게, 오른쪽엔 행사 D-day 대신 신청 꼬리표
    const ap = v.past ? null : applyView(e);
    const apChip = ap && ap.hot ? applyChip(ap, false) : '';
    const apOff = ap && (ap.phase === 'closed' || (ap.phase === 'opened' && !ap.hot));
    const apHtml = ap ? '<div class="lm-ap' + (apOff ? ' off' : (isHotChip(apChip.split(' ')[0]) ? ' hot' : '')) + '">' + esc(applyLine(ap, true)) + '</div>' : '';
    // 신청 꼬리표를 달아도 행사 날과 헷갈리지 않게 위에 '행사 D-9'를 작게 같이 둔다
    const ddHtml = apChip ? '<span class="dd-s">행사 ' + esc(v.ddText) + '</span><span class="dd-e">' + esc(apChip) + '</span>' : esc(v.ddText);
    const head = `<button type="button" class="lm-row lmh-row" data-a="x" aria-expanded="false"><div class="lm-date"><b>${v.d}</b><small>${esc(v.mon)} ${esc(v.wd)}</small></div>
      <div class="lm-rb"><div class="lm-rt">${esc(e.title)}${evTags(e)}</div><div class="lm-rs">${esc([place, v.days].filter(Boolean).join(' · '))}</div>${apHtml}</div><span class="lm-dd${apChip && isHotChip(apChip.split(' ')[0]) ? ' hot' : ''}">${ddHtml}</span></button>`;
    const ig = eventIg(e);
    // 인스타 게시물이 펼쳐지면 같은 포스터가 두 번 보이므로 포스터는 게시물이 없을 때만
    const poster = ig ? '' : okbmSafeImageUrl(e.poster_url);
    const kv = function (k, val) { return val ? '<div class="lm-kv"><span>' + k + '</span><b>' + esc(val) + '</b></div>' : ''; };
    const body = `<div class="lmx-in">
      ${poster ? `<img class="lm-poster" src="${escapeHtml(okbmSafeImageUrl(e.poster_url))}" alt="" loading="lazy" decoding="async">` : ''}
      ${e.subtitle ? `<div class="lm-rs" style="margin:0 0 6px">${esc(e.subtitle)}</div>` : ''}
      ${kv('일정', v.dateText + ' (' + v.weekday + ')')}${ap ? kv('신청', [ap.open ? whenText(ap.open, false) + ' 오픈' : '', ap.close ? untilText(ap.close, false) : ''].filter(Boolean).join(' ~ ')) : ''}${kv('장소', place)}${kv('주최', e.host)}${kv('참가', e.fee)}
      ${e.description ? `<p class="lm-desc">${esc(e.description)}</p>` : ''}
      ${ig ? `<div class="lm-ig" data-kind="${esc(ig.kind)}" data-code="${esc(ig.code)}"></div>` : ''}
      ${(eventApplyUrl(e) || e.spot_id) ? `<div class="lmx-btns">
        ${e.spot_id ? `<button type="button" class="lm-btn sm" data-a="spot" data-v="${esc(e.spot_id)}">${ico(P.pin, 16)}지도에서 보기</button>` : ''}
        ${webBtn(eventApplyUrl(e), '신청하기', true)}
      </div>` : ''}
      ${v.past ? '' : `<div class="lm-cal-row" data-cal-slot>${calSlotInner(e)}</div>`}
      ${adminLinks([['edit-event', '수정', 'adm', e.id], ['pin-event', e.is_pinned ? '고정 풀기' : '홈 상단 고정', 'adm', e.id], ['hide-event', e.is_active ? '숨기기' : '다시 보이기', 'adm', e.id], ['del-event', '삭제', 'red', e.id]])}
    </div>`;
    return fold(e.id, head, body);
  }
  // 홈 3줄: 참가 가능한 일정 중 가까운 날부터. 3개보다 적으면 이미 시작된 일정으로 채운다.
  function homeEventList() {
    return D.events.filter(function (e) { return e.is_active !== false; }).slice().sort(compareEvents);
  }
  function paneEvents(full) {
    if (!full) {
      const list = homeEventList().slice(0, HOME_N);
      if (!list.length) return homeEmpty('다가오는 행사가 아직 없어요', 0, '라운지 열기');
      return list.map(evItem).join('') + moreBtn(0, '행사 ' + D.events.length + '개 전체 보기');
    }
    const t = todayKey();
    // 신청이 곧 열리거나 신청 중인 행사는 따로 맨 위에 모은다. 마감되면 아래 날짜순 목록으로 돌아간다.
    const isHot = function (e) { const ap = applyView(e); return !!(ap && ap.hot); };
    const hot = D.events.filter(isHot).sort(compareEvents);
    const rest = D.events.filter(function (e) { return !isHot(e); });
    const open = rest.filter(function (e) { return String(e.start_date || '').slice(0, 10) >= t; }).sort(compareEvents);
    const going = rest.filter(function (e) { return String(e.start_date || '').slice(0, 10) < t; }).sort(compareEvents);
    const now = thisMonthEvents();
    let h = `<div class="lm-head">이번 달 행사<br><em>${now.length}</em>개가 있어요</div>`;
    if (hot.length) h += '<div class="lmh-cap">신청 일정</div>' + hot.map(evItem).join('') + (open.length ? '<div class="lmh-cap">다가오는 행사</div>' : '');
    if (!hot.length && !open.length && !going.length) h += '<div class="lm-empty">이번 달 행사가 없어요</div>';
    else h += open.map(evItem).join('');
    if (going.length) h += '<div class="lmh-cap">이미 시작된 일정</div>' + going.map(evItem).join('');
    if (D.pastEvents === null) {
      h += '<button type="button" class="lmh-more" data-a="past">지난 행사 보기' + ico(P.chevR, 16) + '</button>';
    } else if (D.pastEvents.length) {
      h += '<div class="lmh-cap">지난 행사</div>' + D.pastEvents.map(evItem).join('');
    }
    if (D.admin) h += '<button type="button" class="lmh-cta adm" data-a="new-event">' + ico(P.plus, 18) + '행사 등록</button>';
    return h;
  }

  // 장비 세일 소식. 번호(sort) 순. 끝나는 날이 지나면 빠지고, 끝 날짜가 없는 글은 올린 날부터 14일.
  function addDaysKey(key, days) {
    const d = parseD(key);
    if (!d) return '';
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function mdLabel(key) {
    const d = parseD(key);
    return d ? (d.getMonth() + 1) + '/' + d.getDate() : '';
  }
  // 시작·끝 시각: 날짜 + 시간(H18). 시간이 없으면 시작은 그날 0시, 끝은 그날 밤(다음 날 0시).
  function dealAt(date, time, endOfDay) {
    const d = parseD(date);
    if (!d) return null;
    const m = String(time || '').match(/^(\d{1,2}):(\d{2})/);
    if (m) d.setHours(+m[1], +m[2], 0, 0);
    else if (endOfDay) d.setDate(d.getDate() + 1);
    return d;
  }
  function dealStartAt(d) { return dealAt(d.start_date, d.start_time, false); }
  function dealEndAt(d) { return dealAt(d.end_date, d.end_time, true); }
  function dealPhase(d) {
    const s = dealStartAt(d);
    if (s && s > Date.now()) return 'upcoming';
    if (!d.start_date && d.phase === 'upcoming') return 'upcoming';
    return 'ongoing';
  }
  // 시작이 7일 안에 다가온 예정 할인: 진행중보다 위에 둔다
  function dealSoon(d) {
    const s = dealStartAt(d);
    return !!s && dealPhase(d) === 'upcoming' && s - Date.now() <= HOT_MS;
  }
  // 큰 글씨 한 줄: 곧 오픈은 '11월 1일(토) 오전 10시 오픈', 끝 시간이 있고 오늘·내일 끝나면 '오늘 오후 6시 마감'
  function dealLine(d, long) {
    if (dealSoon(d)) return (d.start_time ? whenText(dealStartAt(d), long) : dayText(dealStartAt(d), long)) + ' 오픈';
    const e = d.end_time ? dealEndAt(d) : null;
    if (e && dealPhase(d) === 'ongoing' && dayDiff(e) <= 1) return whenText(e, long) + ' 마감';
    return '';
  }
  function dealAlive(d) {
    if (!d || (d.is_active === false && !D.admin)) return false;
    const t = todayKey();
    const e = dealEndAt(d);
    if (e && e <= Date.now()) return false;
    if (dealPhase(d) === 'ongoing' && !d.end_date && d.posted_on && addDaysKey(d.posted_on, 14) < t) return false;
    return true;
  }
  // 진행중은 마감이 가까운 것부터(마감일 없는 글은 아래), 예정은 시작이 가까운 것부터. 같으면 번호(sort) 순.
  function sortDeals(list, key) {
    return list.slice().sort(function (a, b) {
      const ka = a[key] ? String(a[key]) : '9999-99-99';
      const kb = b[key] ? String(b[key]) : '9999-99-99';
      if (ka !== kb) return ka < kb ? -1 : 1;
      return (Number(a.sort) || 0) - (Number(b.sort) || 0);
    });
  }
  function ongoingDeals() {
    return sortDeals((D.deals || []).filter(function (d) { return dealAlive(d) && dealPhase(d) === 'ongoing'; }), 'end_date');
  }
  function upcomingDeals() {
    return sortDeals((D.deals || []).filter(function (d) { return dealAlive(d) && dealPhase(d) === 'upcoming'; }), 'start_date');
  }
  // 곧 오픈(7일 안)은 시작 시각이 가까운 순
  function soonDeals() {
    return upcomingDeals().filter(dealSoon).sort(function (a, b) { return dealStartAt(a) - dealStartAt(b); });
  }
  function dealMark(d) {
    const s = String(d.summary || '');
    let m = s.match(/최대\s*(\d+)\s*%/);
    if (m) return m[1] + '%';
    m = s.match(/(\d+)\s*%\s*할인/);
    if (m) return m[1] + '%';
    m = s.match(/~\s*(\d+)\s*%/);
    if (m) return m[1] + '%';
    if (dealPhase(d) === 'upcoming' && d.start_date) return mdLabel(d.start_date);
    if (/플리|중고/.test(d.title)) return '중고';
    if (/오픈/.test(d.title)) return '오픈';
    if (/팝업/.test(d.title)) return '팝업';
    if (/세일|패밀리/.test(d.title)) return '세일';
    return '할인';
  }
  // 오른쪽 칸: 위 줄 시작일(회색 "10/15 ~"), 아래 줄 마감(파랑 "10/31"·"오늘 마감"·"내일 마감").
  // 시작일이 없으면 마감만 "~ 10/31", 마감이 없으면 진행중·예정.
  function dealMetaHtml(d) {
    const t = todayKey();
    const s = d.start_date ? mdLabel(d.start_date) : '';
    let end;
    if (d.end_date) {
      if (String(d.end_date) === t) end = '오늘 마감';
      else if (String(d.end_date) === addDaysKey(t, 1)) end = '내일 마감';
      else end = (s ? '' : '~ ') + mdLabel(d.end_date);
    } else {
      end = dealPhase(d) === 'upcoming' ? '예정' : '진행중';
    }
    return (s ? '<span class="dd-s">' + esc(s) + ' ~</span>' : '') + '<span class="dd-e">' + esc(end) + '</span>';
  }
  function instaPost(url) {
    const safe = okbmSafeExternalUrl(url);
    if (!safe || safe === '#') return null;
    let parsed;
    try { parsed = new URL(safe); } catch (e) { return null; }
    if (parsed.hostname.replace(/^www\./i, '') !== 'instagram.com') return null;
    const m = parsed.pathname.match(/\/(?:[A-Za-z0-9._]{1,30}\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    const raw = m[1].toLowerCase();
    return { kind: raw === 'p' ? 'p' : (raw === 'tv' ? 'tv' : 'reel'), code: m[2] };
  }
  const INSTA_IN_TEXT = /https:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9._]{1,30}\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i;
  function instaInText(text) {
    const m = String(text || '').match(INSTA_IN_TEXT);
    return m ? instaPost(m[0]) : null;
  }
  function webBtn(url, label, primary) {
    const safe = okbmSafeExternalUrl(url);
    if (!url || safe === '#' || instaPost(url)) return '';
    return '<a class="lm-btn sm' + (primary ? ' main' : '') + '" href="' + escapeHtml(safe) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
  }
  // 행사: 신청 링크(홈페이지)와 인스타 게시물을 같이 둔다. 예전 글은 인스타 주소가 신청 링크나 설명에만 있다.
  function eventIg(e) {
    return instaPost(e && e.instagram_url) || instaPost(e && e.apply_url) || instaInText(e && e.description);
  }
  function eventApplyUrl(e) {
    const url = String((e && e.apply_url) || '').trim();
    return url && !instaPost(url) ? url : '';
  }
  function eventIgUrl(e) {
    if (e && instaPost(e.instagram_url)) return String(e.instagram_url).trim();
    if (e && instaPost(e.apply_url)) return String(e.apply_url).trim();
    return '';
  }
  // 할인: 한 줄 요약·본문과, 인스타·글 링크를 같이 둔다. 글 링크만 출처에 있던 예전 행도 버튼으로 연다.
  function dealIg(d) {
    return instaPost(d && d.source_url) || instaPost(d && d.link_url) || instaInText(d && d.body) || instaInText(d && d.summary);
  }
  function dealWebUrl(d) {
    const link = String((d && d.link_url) || '').trim();
    if (link && !instaPost(link)) return link;
    const src = String((d && d.source_url) || '').trim();
    if (src && !instaPost(src)) return src;
    return '';
  }
  function dealIgUrl(d) {
    if (d && instaPost(d.source_url)) return String(d.source_url).trim();
    if (d && instaPost(d.link_url)) return String(d.link_url).trim();
    return '';
  }
  // 게시물 보기: 인스타로 나가지 않고, 화면 위에 창을 띄워 게시물 높이에 맞춰 늘린다.
  function closeDealInsta() {
    const el = document.getElementById('okbmDealInsta');
    if (!el) return;
    el.remove();
    unregister('okbmDealInsta');
  }
  function openDealInsta(kind, code) {
    if (!/^(p|reel|tv)$/.test(kind) || !/^[A-Za-z0-9_-]+$/.test(code)) return;
    closeDealInsta();
    const overlay = document.createElement('div');
    overlay.id = 'okbmDealInsta';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '인스타그램 게시물');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483646;background:rgba(0,0,0,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:calc(12px + env(safe-area-inset-top,0px)) 12px 12px;box-sizing:border-box';
    overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeDealInsta(); });
    const card = document.createElement('div');
    card.style.cssText = 'width:100%;max-width:400px;max-height:100%;display:flex;flex-direction:column;background:#0c1017;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5)';
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;flex-shrink:0';
    const title = document.createElement('span');
    title.textContent = '인스타그램';
    title.style.cssText = 'font-size:0.76rem;font-weight:900;color:#fbcfe8';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'width:30px;height:30px;border-radius:50%;border:none;background:rgba(255,255,255,.10);color:#fff;font-size:0.9rem;font-weight:900;cursor:pointer';
    closeBtn.addEventListener('click', closeDealInsta);
    bar.appendChild(title);
    bar.appendChild(closeBtn);
    const scroller = document.createElement('div');
    scroller.style.cssText = 'flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 8px 8px';
    const frame = document.createElement('iframe');
    frame.title = '인스타그램 게시물';
    frame.setAttribute('scrolling', 'no');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.style.cssText = 'width:100%;height:' + (kind === 'p' ? '560' : '700') + 'px;border:0;border-radius:10px;background:#fff;display:block';
    frame.src = 'https://www.instagram.com/' + kind + '/' + code + '/embed/';
    scroller.appendChild(frame);
    card.appendChild(bar);
    card.appendChild(scroller);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    register('okbmDealInsta', closeDealInsta);
    closeBtn.focus();
  }
  function onInstaMeasure(e) {
    if (e.origin !== 'https://www.instagram.com') return;
    let data = e.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (err) { return; } }
    if (!data || data.type !== 'MEASURE' || !data.details) return;
    const h = Number(data.details.height);
    if (!isFinite(h) || h < 200 || h > 4000) return;
    const viewer = document.getElementById('okbmDealInsta');
    const frame = viewer && viewer.querySelector('iframe');
    if (frame && frame.contentWindow === e.source) { frame.style.height = Math.ceil(h) + 'px'; return; }
    // 펼친 할인 안의 게시물: 아래로만 늘어나므로 보고 있던 자리는 그대로다
    document.querySelectorAll('.lm-ig iframe').forEach(function (f) {
      if (f.contentWindow === e.source) { f.style.height = Math.ceil(h) + 'px'; f.parentElement.dataset.h = String(Math.ceil(h)); }
    });
  }
  // 할인을 펼치면 인스타 게시물을 내용 바로 아래에 붙인다(누를 버튼 없이). 펼칠 때만 받는다.
  function mountInsta(box) {
    if (!box || box.querySelector('iframe')) return;
    const kind = box.dataset.kind;
    const code = box.dataset.code;
    if (!/^(p|reel|tv)$/.test(kind) || !/^[A-Za-z0-9_-]+$/.test(code)) return;
    const frame = document.createElement('iframe');
    frame.title = '인스타그램 게시물';
    frame.setAttribute('scrolling', 'no');
    // lazy는 안 쓴다: 홈에서 넘어와 창이 밀려 들어오는 중에 붙이면 브라우저가 보이는 걸 놓쳐 끝내 안 받는다
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.style.height = (box.dataset.h || (kind === 'p' ? '560' : '700')) + 'px';
    frame.src = 'https://www.instagram.com/' + kind + '/' + code + '/embed/';
    box.appendChild(frame);
  }
  // 스크롤되는 가장 가까운 상자(라운지 창 안이면 그 창, 아니면 페이지)
  function scrollBoxOf(el) {
    for (let n = el && el.parentElement; n && n !== document.body; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    }
    return null;
  }
  function dealItem(d) {
    const ig = dealIg(d);
    const web = dealWebUrl(d);
    const postText = String(d.body || '').trim();
    const shown = postText || String(d.summary || '').trim();
    const line = dealLine(d, true);
    const head =`<button type="button" class="lm-row lmh-row" data-a="x" aria-expanded="false"><div class="lm-date"><b>${esc(dealMark(d))}</b></div>
      <div class="lm-rb"><div class="lm-rt">${esc(d.title)}${D.admin && !d.is_active ? '<span class="lm-tag">숨김</span>' : ''}</div><div class="lm-rs">${esc(d.summary)}</div>${line ? '<div class="lm-ap' + (dayDiff(dealSoon(d) ? dealStartAt(d) : dealEndAt(d)) <= 1 ? ' hot' : '') + '">' + esc(line) + '</div>' : ''}</div><span class="lm-dd">${dealMetaHtml(d)}</span></button>`;
    const body = `<div class="lmx-in">
      ${shown ? `<p class="lm-desc" style="margin:0">${esc(shown)}</p>` : ''}
      ${ig ? `<div class="lm-ig" data-kind="${esc(ig.kind)}" data-code="${esc(ig.code)}"></div>` : ''}
      ${web ? `<div class="lmx-btns">${webBtn(web, '글 보기', !ig)}</div>` : ''}
      ${adminLinks([['edit-deal', '수정', 'adm', d.id], ['hide-deal', d.is_active ? '숨기기' : '다시 보이기', 'adm', d.id], ['del-deal', '삭제', 'red', d.id]])}
    </div>`;
    return fold(d.id, head, body);
  }
  function paneDeals(full) {
    const now = ongoingDeals();
    const soon = soonDeals();
    const later = upcomingDeals().filter(function (d) { return !dealSoon(d); });
    if (!full) {
      const list = soon.concat(now).slice(0, HOME_N);
      if (!list.length && !later.length) return homeEmpty('진행중인 할인이 없어요', TAB_DEAL, '라운지 열기');
      return (list.length ? list : later.slice(0, HOME_N)).map(dealItem).join('') + moreBtn(TAB_DEAL, '할인 ' + (now.length + soon.length + later.length) + '개 전체 보기');
    }
    let h = `<div class="lm-head">진행중<br><em>${now.length}</em>개가 있어요</div>`;
    if (soon.length) h += '<div class="lmh-cap">곧 오픈</div>' + soon.map(dealItem).join('') + '<div class="lmh-cap">진행중</div>';
    h += now.length ? now.map(dealItem).join('') : '<div class="lm-empty">진행중인 할인이 없어요</div>';
    if (later.length) h += '<div class="lmh-cap">예정</div>' + later.map(dealItem).join('');
    if (D.admin) h += '<button type="button" class="lmh-cta adm" data-a="new-deal">' + ico(P.plus, 18) + '할인 등록</button>';
    return h;
  }

  // 초보 가이드
  const TIP_NOTES = ['팁', '주의점', '기본상식'];
  const KIT_MAX = 80; // lounge_guides_items_check
  const BODY_MAX = 4000; // lounge_guides_body_check
  function youtubeId(text) {
    const m = String(text || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?[^#\s]*v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  // 팁은 본문 맨 끝 줄이 유튜브 주소 하나뿐일 때만 영상으로 본다
  function tipParts(text) {
    const s = String(text || '').trim();
    const i = s.lastIndexOf('\n');
    const last = s.slice(i + 1).trim();
    const yid = /^https:\/\/\S+$/.test(last) ? youtubeId(last) : '';
    if (!yid) return { text: s, url: '', yid: '', short: false };
    return { text: s.slice(0, Math.max(i, 0)).trim(), url: last, yid: yid, short: /\/shorts\//.test(last) };
  }
  function guideSource(text) {
    const urls = String(text || '').match(/https?:\/\/[^\s)]+/g);
    return urls && urls.length ? urls[urls.length - 1] : '';
  }
  function stripGuideUrls(text) {
    return String(text || '')
      .replace(/https?:\/\/[^\s)]+/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const GUIDE_SPLIT = /(?:^|\n)-{3,}(?:\n|$)/;
  function guideParts(text) {
    const parts = stripGuideUrls(text).split(GUIDE_SPLIT);
    return { prose: String(parts[0] || '').trim(), channel: parts.slice(1).join('\n\n').trim() };
  }
  function joinGuideBody(prose, source, channel) {
    const p = String(prose || '').trim();
    const c = String(channel || '').trim();
    const s = String(source || '').trim();
    return [c ? (p ? p + '\n---\n' + c : '---\n' + c) : p, s].filter(Boolean).join('\n');
  }
  function priceInName(name) {
    const m = String(name || '').match(/·\s*([\d,]+)\s*원\s*$/);
    return m ? Number(String(m[1]).replace(/,/g, '')) || 0 : 0;
  }
  function stripPriceName(name) {
    return String(name || '').replace(/\s*·\s*[\d,]+\s*원\s*$/, '').trim();
  }
  function itemPrice(it) {
    const n = Number(it && it.price_krw);
    return n > 0 ? Math.round(n) : priceInName(it && it.name);
  }
  function itemName(it) {
    return itemPrice(it) ? stripPriceName(it && it.name) : String((it && it.name) || '');
  }
  function wonLabel(n) {
    const v = Math.round(Number(n) || 0);
    return v > 0 ? v.toLocaleString('ko-KR') + '원' : '';
  }
  function ytBlock(id) {
    const watch = 'https://www.youtube.com/watch?v=' + id;
    const img = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    return `<a class="lm-yt" href="${escapeHtml(okbmSafeExternalUrl(watch))}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(okbmSafeImageUrl(img))}" alt="" loading="lazy" decoding="async"><span>YouTube에서 보기</span></a>`;
  }
  function sourceMark(text) {
    const src = guideSource(text);
    if (youtubeId(src)) return '<div class="lm-src yt" aria-hidden="true"><b></b><small>YouTube</small></div>';
    if (src && okbmSafeExternalUrl(src) !== '#') return '<div class="lm-src" aria-hidden="true"><b>글</b><small>블로그</small></div>';
    return '';
  }
  function advisorBlock(k, channel) {
    const name = String(k.note || '').trim();
    const desc = String(channel || '').trim();
    if (!name && !desc) return '';
    return `<div class="lm-advisor">${name ? `<b>${esc(name)}</b>` : ''}${desc ? `<p>${esc(desc)}</p>` : ''}</div>`;
  }
  function sourceBlock(text) {
    const src = guideSource(text);
    const yid = youtubeId(src);
    if (yid) return ytBlock(yid);
    const safe = okbmSafeExternalUrl(src);
    if (!src || safe === '#') return '';
    return `<a class="lm-blog" href="${escapeHtml(okbmSafeExternalUrl(src))}" target="_blank" rel="noopener noreferrer">글 보기${ico(P.chevR, 16)}</a>`;
  }
  function gearRows(items, plain) {
    let cat = null;
    const rows = items.map(function (it) {
      const c = GEAR_CAT[it.category_id] || '장비';
      const cap = !plain && c !== cat ? `<div class="lm-gcap">${esc(c)}</div>` : '';
      cat = c;
      const url = okbmSafeExternalUrl(it.link_url);
      const price = wonLabel(itemPrice(it));
      const g = Number(it.weight_g) || 0;
      const about = String(it.about || '').trim();
      const inner = `<div class="nm"><b>${esc(itemName(it))}</b>${about ? `<small>${esc(about)}</small>` : ''}</div>${price ? `<em>${esc(price)}</em>` : ''}${g ? `<em>${(g / 1000).toFixed(2)}kg</em>` : ''}${url !== '#' ? ico(P.chevR, 14) : ''}`;
      return cap + (url !== '#'
        ? `<a class="lm-item" href="${escapeHtml(okbmSafeExternalUrl(it.link_url))}" target="_blank" rel="noopener noreferrer">${inner}</a>`
        : `<div class="lm-item">${inner}</div>`);
    }).join('');
    return plain && rows ? `<div class="lm-gear">${rows}</div>` : rows;
  }
  function normGear(s) {
    return String(s || '').toLowerCase().replace(/[\s·,./\-_()]/g, '');
  }
  function itemKeys(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const keys = [];
    function add(s) {
      const k = normGear(s);
      if (k.length >= 3 && keys.indexOf(k) < 0) keys.push(k);
    }
    add(parts.join(''));
    if (parts.length >= 2) {
      add(parts.slice(1).join(''));
      add(parts.slice(-2).join(''));
    }
    parts.forEach(add);
    return keys;
  }
  function gearMatchScore(name, blob) {
    const b = normGear(blob);
    const words = String(blob || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const norms = words.map(normGear);
    for (let i = 0; i < words.length - 1; i++) norms.push(normGear(words[i] + words[i + 1]));
    let score = 0;
    itemKeys(name).forEach(function (k) {
      if (k.length >= 4 && b.indexOf(k) >= 0) score += k.length * 2;
      else if (k.length >= 3 && ['라이트', '울트라', '프로', '미니'].indexOf(k) < 0 && norms.some(function (w) {
        if (w === k) return true;
        if (!w.startsWith(k)) return false;
        const rest = w.slice(k.length);
        return /^(?:은|는|이|가|을|를|의|에|도|와|과|로|만|에서)$/.test(rest);
      })) score += k.length;
    });
    return score;
  }
  function isGearHead(line) {
    const s = String(line || '').trim();
    if (!s || s.length > 16) return false;
    if (/[.!?。]/.test(s) || /(?:요|다|죠|세요|해요|예요|에요)$/.test(s)) return false;
    return true;
  }
  function proseSections(prose) {
    const intro = [];
    const sections = [];
    let cur = null;
    String(prose || '').split('\n').forEach(function (line) {
      if (isGearHead(line)) {
        cur = { title: line.trim(), lines: [] };
        sections.push(cur);
      } else if (cur) cur.lines.push(line);
      else intro.push(line);
    });
    return {
      intro: intro.join('\n').trim(),
      sections: sections.map(function (sec) {
        return { title: sec.title, text: sec.lines.join('\n').trim() };
      })
    };
  }
  function guideWithGear(prose, items) {
    const parsed = proseSections(prose);
    if (!parsed.sections.length) {
      return `<div class="lm-guide">${prose ? `<p class="lm-desc" style="margin:0">${esc(prose)}</p>` : ''}${gearRows(items)}</div>`;
    }
    const buckets = parsed.sections.map(function () { return []; });
    const leftover = [];
    items.forEach(function (it) {
      let best = -1;
      let bestScore = 0;
      parsed.sections.forEach(function (sec, i) {
        const score = gearMatchScore(itemName(it), sec.title + '\n' + sec.text);
        if (score > bestScore) { bestScore = score; best = i; }
      });
      if (best >= 0) buckets[best].push(it);
      else leftover.push(it);
    });
    let outro = '';
    const last = parsed.sections.length - 1;
    const paras = parsed.sections[last].text.split(/\n{2,}/);
    if (paras.length >= 2) {
      const tail = paras[paras.length - 1].trim();
      const mentioned = buckets[last].some(function (it) { return gearMatchScore(itemName(it), tail) > 0; });
      if (!mentioned) {
        outro = tail;
        parsed.sections[last].text = paras.slice(0, -1).join('\n\n').trim();
      }
    }
    let html = parsed.intro ? `<p class="lm-desc" style="margin:0">${esc(parsed.intro)}</p>` : '';
    parsed.sections.forEach(function (sec, i) {
      html += `<div class="lm-block"><div class="lm-sec">${esc(sec.title)}</div>${sec.text ? `<p class="lm-desc">${esc(sec.text)}</p>` : ''}${gearRows(buckets[i], true)}</div>`;
    });
    html += gearRows(leftover);
    if (outro) html += `<p class="lm-desc">${esc(outro)}</p>`;
    return `<div class="lm-guide">${html}</div>`;
  }
  // 같은 영상을 다룬 웹 가이드(romanticroute.kr/guide/)가 있으면 "자세히 보기" 단추를 붙인다
  const WEB_GUIDE_BY_YT = {
    l6qrayW5wKs: 'sleeping-bag-temperature', yYl7w7JkNLk: 'backpacking-tent-guide',
    '8MvNgtWJiiE': 'winter-backpacking-budget-set', IpIuffqLSBw: 'where-can-i-camp-in-mountains',
    rRtzM9yEBZQ: 'toilet-in-the-mountains', HiN4TCmfvE8: 'what-to-eat-backpacking',
    '9TPkBxnQuqQ': 'winter-backpacking-budget-set', p08x3cRpiKI: 'ultralight-budget-set'
  };
  const WEB_GUIDE_BY_ID = { '32f7d535-18c0-48ea-b922-071dfee19e36': 'three-season-starter-set' };
  function webGuideBtn(g) {
    const slug = WEB_GUIDE_BY_YT[youtubeId(guideSource(g && g.body))] || WEB_GUIDE_BY_ID[g && g.id];
    if (!slug) return '';
    return `<a class="lm-blog" style="margin:12px 0 14px" href="${escapeHtml(okbmSafeExternalUrl('https://romanticroute.kr/guide/' + slug + '/'))}" target="_blank" rel="noopener noreferrer">웹 가이드에서 자세히 보기${ico(P.chevR, 16)}</a>`;
  }
  function kitItem(k, open) {
    const items = kitItems(k);
    const shown = !!(open && guideSource(k.body));
    const mark = sourceMark(k.body) || `<div class="lm-score">${items.length}<small>가지</small></div>`;
    const head = `<button type="button" class="lm-row lmh-row" data-a="x" aria-expanded="${shown}">${mark}
      <div class="lm-rb"><div class="lm-rt">${esc(k.title)}${D.admin && !k.is_active ? '<span class="lm-tag">숨김</span>' : ''}</div><div class="lm-rs">${esc([k.note, items.length + '가지'].filter(Boolean).join(' · '))}</div></div>${chev(true)}</button>`;
    const parts = guideParts(k.body);
    const intro = `${advisorBlock(k, parts.channel)}${sourceBlock(k.body)}${guideWithGear(parts.prose, items)}${webGuideBtn(k)}`;
    const body = `<div class="lmx-in">
      ${intro}
      ${adminLinks([['edit-guide', '수정', 'adm', k.id], ['hide-guide', k.is_active ? '숨기기' : '다시 보이기', 'adm', k.id], ['del-guide', '삭제', 'red', k.id]])}
    </div>`;
    return fold(k.id, head, body, shown);
  }
  function tipPoster(yid) {
    const img = 'https://i.ytimg.com/vi/' + yid + '/hqdefault.jpg';
    return `<button type="button" class="lm-tv-play" data-a="tip-play" aria-label="영상 재생"><img src="${escapeHtml(okbmSafeImageUrl(img))}" alt="" loading="lazy" decoding="async"><span class="lm-tv-btn" aria-hidden="true"></span></button>`;
  }
  function resetTipVideo(item) {
    const box = item && item.querySelector('[data-yt]');
    if (box && box.querySelector('iframe')) box.innerHTML = tipPoster(box.dataset.yt);
  }
  function tipItem(t) {
    const tag = TIP_NOTES.indexOf(t.note) >= 0 ? '<span class="lm-tag" style="margin:0 6px 0 0">' + esc(t.note) + '</span>' : '';
    const tp = tipParts(t.body);
    const video = tp.yid ? `<div class="lm-tv${tp.short ? ' short' : ''}" data-yt="${esc(tp.yid)}">${tipPoster(tp.yid)}</div>` : '';
    return fold(t.id,
      `<button type="button" class="lm-faq-q" data-a="x" aria-expanded="false"><span>${tag}${esc(t.title)}${D.admin && !t.is_active ? '<span class="lm-tag">숨김</span>' : ''}</span>${chev(true)}</button>`,
      `<div class="lmx-in">${video}${tp.text ? `<p class="lm-desc" style="margin:0">${esc(tp.text)}</p>` : ''}${webGuideBtn(t)}
        ${adminLinks([['edit-guide', '수정', 'adm', t.id], ['hide-guide', t.is_active ? '숨기기' : '다시 보이기', 'adm', t.id], ['del-guide', '삭제', 'red', t.id]])}</div>`);
  }
  const kits = function () { return D.guides.filter(function (g) { return g.kind === 'kit' && (D.admin || g.is_active !== false); }); };
  const tips = function () { return D.guides.filter(function (g) { return g.kind === 'tip' && (D.admin || g.is_active !== false); }); };
  function paneGuide(full) {
    const list = kits();
    const tipList = tips();
    if (!full) {
      // 홈 3줄은 날마다 다른 팁 (index-main.js okbmDailyOrder, 같은 날엔 같은 순서)
      const dailyTips = typeof window.okbmDailyOrder === 'function' ? window.okbmDailyOrder(tipList, function (t) { return t.id; }, 'guides') : tipList;
      const homeTips = dailyTips.slice(0, HOME_N);
      const homeKits = list.slice(0, HOME_N - homeTips.length);
      if (!homeTips.length && !homeKits.length) return homeEmpty('초보 가이드를 준비하고 있어요', 1, '라운지 열기');
      return homeTips.map(tipItem).join('') + homeKits.map(function (k) { return kitItem(k); }).join('') +
        moreBtn(1, '첫 백패킹 가이드 ' + (tipList.length + list.length) + '개 보기');
    }
    let h = '<div class="lm-head">처음 백패킹이라면<br><em>여기서</em> 시작해요</div>';
    if (tipList.length || D.admin) {
      h += '<div class="lmh-cap">성공적인 첫 백패킹을 위한 팁</div>' + (tipList.length ? tipList.map(tipItem).join('') : '<div class="lm-empty">팁을 준비하고 있어요</div>');
    }
    h += '<div class="lmh-cap">입문 장비 추천</div>' + (list.length ? list.map(function (k) { return kitItem(k); }).join('') : '<div class="lm-empty">장비 세트를 준비하고 있어요</div>');
    h += '<p class="lm-hint" style="margin-top:20px">가이드는 운영팀이 올려요. 더 궁금한 건 자유게시판에 물어봐요.</p>';
    if (D.admin) h += '<button type="button" class="lmh-cta adm" data-a="new-guide">' + ico(P.plus, 18) + '가이드 올리기</button>';
    return h;
  }

  // 자유게시판 (P3는 읽기. 쓰기·좋아요·댓글 쓰기는 P4)
  function postRow(p) {
    return `<button type="button" class="lm-row lmh-row" data-a="lounge" data-v="2" data-id="${esc(p.id)}" aria-label="${esc(p.title + ', 라운지에서 열기')}">
      <div class="lmh-av">${av(p.nickname, p.user_id)}</div>
      <div class="lm-rb"><div class="lm-rt">${p.is_private ? ico(P.lock, 13) + ' ' : ''}${esc(p.title)}</div>
        <div class="lm-rs fx"><span>${esc([p.nickname, ago(p.created_at), CAT_LABEL[p.category]].filter(Boolean).join(' · '))}</span>${postPhotos(p).length ? ico(P.img, 13) : ''}</div></div>
      <span class="lmh-meta">${p.is_private ? ico(P.lock, 14) : ico(P.chat, 15) + (Number(p.comments_count) || 0)}</span></button>`;
  }
  // 본인 판단은 romantic-sync.js isCurrentUserId(아이디 표기 차이를 맞춤)
  function isMine(uid) {
    if (!uid) return false;
    if (typeof window.isCurrentUserId === 'function') { try { return !!window.isCurrentUserId(uid); } catch (e) {} }
    return String(uid) === myId();
  }
  // 신고·차단 버튼 (romantic-sync.js openUgcSafetyMenu: 라운지 층보다 위에 뜸)
  const ugcBtn = function (type, id, uid, nick, cls) {
    return '<button type="button" class="' + (cls || '') + '" data-a="ugc" data-type="' + type + '" data-v="' + esc(id) + '" data-uid="' + esc(uid || '') + '" data-nick="' + esc(nick || '') + '">신고·차단</button>';
  };
  function commentsHtml(p) {
    const list = D.comments[p.id];
    if (list === undefined) return '<div class="lmx-note" data-comments="' + esc(p.id) + '">댓글 불러오는 중…</div>';
    const shown = list.filter(function (c) { return !hidden(c); });
    if (!shown.length) return '<div class="lmx-note" data-comments="' + esc(p.id) + '">' + (p.is_private ? '운영팀 답변을 기다리고 있어요' : '아직 댓글이 없어요') + '</div>';
    return '<div data-comments="' + esc(p.id) + '">' + shown.map(function (c) {
      const own = isMine(c.user_id);
      const acts = own || D.admin
        ? `<button type="button" class="red" data-a="del-comment" data-v="${esc(c.id)}" data-post="${esc(p.id)}">삭제${D.admin && !own ? ' (운영팀)' : ''}</button>`
        : '';
      const report = own ? '' : ugcBtn('lounge_comment', c.id, c.user_id, c.nickname);
      return `<div class="lmx-cm">${avUser(c.nickname, c.user_id, 'sm')}<div class="lm-rb"><div class="lm-who" style="font-size:12px">${whoName(c.nickname, c.user_id)}<span>${esc(ago(c.created_at))}</span></div><div class="lm-bd">${esc(c.body)}</div>
        ${acts || report ? `<div class="lm-cm-acts">${acts}${report}</div>` : ''}</div></div>`;
    }).join('') + '</div>';
  }
  const likeBtn = function (p) {
    const on = D.liked.has(p.id);
    return `<button type="button" class="lm-act ${on ? 'on' : ''}" data-a="like" data-v="${esc(p.id)}" aria-pressed="${on}" aria-label="좋아요 ${Number(p.likes_count) || 0}개">${ico(P.heart, 17)}<span>${Number(p.likes_count) || 0}</span></button>`;
  };
  // 투표: 하기 전엔 보기 버튼, 한 뒤(또는 마감)엔 막대와 %. 마감 전엔 막대를 눌러 바꾼다 (SUPABASE_H27). 누가 뭘 골랐는지는 안 보인다
  function pollLeft(p, closed) {
    if (closed) return '마감';
    if (!p.poll_ends_at) return '';
    const ms = new Date(p.poll_ends_at) - Date.now();
    if (ms <= 0) return '마감';
    const h = Math.ceil(ms / 3600000);
    return h >= 24 ? Math.ceil(h / 24) + '일 남음' : h + '시간 남음';
  }
  function pollHtml(p) {
    const opts = Array.isArray(p.poll_options) ? p.poll_options : [];
    if (!opts.length) return '';
    const r = D.poll[p.id] || {};
    const closed = !!r.closed || (p.poll_ends_at && new Date(p.poll_ends_at) <= Date.now());
    const counts = Array.isArray(r.counts) ? r.counts : null;
    const total = Number(r.total) || 0;
    const mine = r.mine == null ? -1 : Number(r.mine);
    let rows;
    if (counts) {
      const max = Math.max.apply(null, counts.concat([0]));
      rows = opts.map(function (o, i) {
        const n = Number(counts[i]) || 0;
        const pct = total ? Math.round(n * 100 / total) : 0;
        const cls = 'lm-pbar' + (i === mine ? ' mine' : '') + (n && n === max ? ' top' : '');
        const inner = `<i style="width:${pct}%"></i><span>${esc(o)}${i === mine ? ico(P.check, 14) : ''}</span><b>${pct}%</b>`;
        return closed || i === mine ? `<div class="${cls}">${inner}</div>`
          : `<button type="button" class="${cls}" data-a="poll-vote" data-v="${esc(p.id)}" data-i="${i}" aria-label="${esc(o)}로 바꾸기">${inner}</button>`;
      }).join('');
    } else if (closed) {
      rows = '<div class="lm-pmeta" style="margin:0">마감된 투표예요</div>';
    } else {
      rows = opts.map(function (o, i) {
        return `<button type="button" class="lm-popt" data-a="poll-vote" data-v="${esc(p.id)}" data-i="${i}">${esc(o)}</button>`;
      }).join('');
    }
    const meta = [total + '명 참여', pollLeft(p, closed)].filter(Boolean).join(' · ');
    const tail = closed ? '' : counts ? (mine >= 0 ? ' · 다른 보기를 누르면 바꿔요' : '') : ' · 고르면 결과가 보여요';
    return `<div class="lm-poll" data-poll="${esc(p.id)}">${rows}<div class="lm-pmeta">${esc(meta)}${tail}</div></div>`;
  }
  function paintPoll(id) {
    const p = findPost(id);
    if (!p || !layer) return;
    layer.querySelectorAll('[data-poll]').forEach(function (el) { if (el.dataset.poll === String(id)) el.outerHTML = pollHtml(p); });
  }
  const pollBusy = new Set();
  async function votePoll(id, i) {
    if (needLogin('로그인하면 투표할 수 있어요')) return;
    const c = sb();
    if (!c || pollBusy.has(id)) return;
    pollBusy.add(id);
    tick();
    try {
      const r = await q(c.rpc('okbm_poll_vote', { p_post_id: id, p_choice: i }));
      if (r && r.post_id) D.poll[id] = r;
      paintPoll(id);
    } catch (e) {
      console.warn('[lounge.js:votePoll]', e);
      const m = String((e && e.message) || e || '');
      if (/poll_closed/.test(m)) { D.poll[id] = Object.assign({}, D.poll[id], { closed: true }); paintPoll(id); }
      toast(/poll_closed/.test(m) ? '마감된 투표예요' : /login_required/.test(m) ? '로그인하면 투표할 수 있어요' : writeErr(e, '투표하지 못했어요. 잠시 뒤 다시 해 주세요'), true);
    } finally {
      pollBusy.delete(id);
    }
  }
  // 댓글 입력: 회원만. 건의 글은 작성자·운영팀만 보이므로 RLS가 나머지를 막는다
  function composeHtml(p) {
    if (!loggedIn()) return '<button type="button" class="lmx-login" data-a="need-login">로그인하고 댓글 달기</button>';
    return `<form class="lmx-compose" data-form="comment" data-post="${esc(p.id)}" novalidate autocomplete="off">
      <input name="body" maxlength="500" placeholder="${p.is_private ? '답변 달기' : '댓글 달기'}" aria-label="댓글 입력" enterkeyhint="send">
      <button type="submit">등록</button></form>`;
  }
  // 본문 주소는 글자만 둔다. 유튜브·인스타는 눌렀을 때만 불러 온다.
  function bodyHtml(text) {
    const s = String(text || '');
    const re = /https?:\/\/[^\s<>"']+/g;
    let html = '';
    let i = 0;
    let m;
    while ((m = re.exec(s))) {
      html += esc(s.slice(i, m.index));
      let raw = m[0];
      let tail = '';
      const cut = raw.match(/[),.]+$/);
      if (cut) { tail = cut[0]; raw = raw.slice(0, -tail.length); }
      html += bodyLink(raw) + esc(tail);
      i = m.index + m[0].length;
    }
    return html + esc(s.slice(i));
  }
  function bodyLink(url) {
    const safe = okbmSafeExternalUrl(url);
    if (!safe || safe === '#') return esc(url);
    const ig = instaPost(url);
    if (ig) {
      return '<a class="lm-link" data-a="deal-ig" data-kind="' + esc(ig.kind) + '" data-code="' + esc(ig.code) + '" href="' + escapeHtml(okbmSafeExternalUrl(url)) + '">' + esc(url) + '</a>';
    }
    const yid = youtubeId(url);
    if (yid) {
      return '<a class="lm-link" data-a="body-yt" data-yt="' + esc(yid) + '" data-short="' + (/\/shorts\//.test(url) ? '1' : '0') + '" href="' + escapeHtml(okbmSafeExternalUrl(url)) + '">' + esc(url) + '</a>';
    }
    return '<a class="lm-out" href="' + escapeHtml(okbmSafeExternalUrl(url)) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>';
  }
  function postItem(p) {
    const photos = postPhotos(p);
    const cc = Number(p.comments_count) || 0;
    const own = isMine(p.user_id);
    const head = `<div class="lm-post" data-a="x" role="button" tabindex="0" aria-expanded="false">
      <div class="lm-lcol">${avUser(p.nickname, p.user_id)}${cc ? '<div class="lm-thread"></div>' : ''}</div>
      <div class="lm-rb">
        <div class="lm-who">${whoName(p.nickname, p.user_id)}<span>${esc(ago(p.created_at))}</span><span>· ${esc(CAT_LABEL[p.category] || '')}</span></div>
        <div class="lm-tt">${p.is_private ? ico(P.lock, 13) + ' ' : ''}${esc(p.title)}</div>${p.body ? `<div class="lm-bd">${bodyHtml(p.body)}</div>` : ''}
        ${p.category === 'poll' ? pollHtml(p) : ''}
        ${photos.length ? `<div class="lm-photos ${photos.length > 1 ? 'multi' : ''}">${photos.map(function (u) { return `<img src="${escapeHtml(okbmSafeImageUrl(u))}" alt="" loading="lazy" decoding="async">`; }).join('')}</div>` : ''}
        ${p.is_private ? `<div class="lm-private">${ico(P.lock, 13)}나와 운영팀만 볼 수 있어요 · 댓글 ${cc}</div>`
          : `<div class="lm-acts">${likeBtn(p)}<span class="lm-act">${ico(P.chat, 17)}<span>${cc}</span></span></div>`}
      </div></div>`;
    const links = [];
    if (own) links.push(`<button type="button" data-a="edit-post" data-v="${esc(p.id)}">수정</button>`);
    if (own || D.admin) links.push(`<button type="button" class="red" data-a="del-post" data-v="${esc(p.id)}">삭제${D.admin && !own ? ' (운영팀)' : ''}</button>`);
    if (!own) links.push(ugcBtn('lounge_post', p.id, p.user_id, p.nickname));
    const body = `<div class="lmx-in ind">${commentsHtml(p)}${composeHtml(p)}
      <div class="lmx-links">${links.join('')}</div></div>`;
    return fold(p.id, head, body);
  }
  function boardListHtml() {
    const list = visiblePosts(S.cat);
    const st = postsBy[S.cat];
    if (!st) return '<div class="lm-empty">불러오는 중…</div>';
    let h = list.length ? list.map(postItem).join('') : '<div class="lm-empty">' + (S.cat === 'suggestion' ? '내가 쓴 건의가 없어요' : '첫 글을 기다리고 있어요') + '</div>';
    if (!st.done && st.rows.length) h += '<button type="button" class="lmh-more" data-a="more-posts">더 보기' + ico(P.chevR, 16) + '</button>';
    return h;
  }
  function paneBoard(full) {
    if (!full) {
      const list = visiblePosts('all').slice(0, HOME_N);
      if (!list.length) return homeEmpty('첫 글을 기다리고 있어요', 2, '라운지 열기');
      return list.map(postRow).join('') + moreBtn(2, '자유게시판 전체 보기');
    }
    return '<div class="lm-cats">' + CATS.map(function (c) {
      return '<button type="button" data-a="cat" data-v="' + c[0] + '" class="' + (S.cat === c[0] ? 'on' : '') + '">' + (c[0] === 'suggestion' ? ico(P.lock, 13) : '') + esc(c[1]) + '</button>';
    }).join('') + '</div>'
      + '<button type="button" class="lmh-cta" data-a="new-post">' + ico(P.plus, 18) + '글쓰기</button>'
      + '<div class="lmh-list">' + boardListHtml() + '</div>'
      + '<p class="lm-hint" style="margin-top:20px">건의는 나와 운영팀만 볼 수 있어요. 답변이 달리면 알림으로 알려 드려요.</p>';
  }

  // 박지 후기
  // 홈: 누르면 지도에서 박지. 창: 그 박지 후기만 보기
  function bestRow(r, full) {
    const s = spotById(r.spot_id);
    if (!s) return '';
    return `<button type="button" class="lm-row lmh-row" data-a="${full ? 'rev-spot' : 'spot'}" data-v="${esc(r.spot_id)}"><div class="lm-score">${Number(r.avg_rating || 0).toFixed(1)}</div>
      <div class="lm-rb"><div class="lm-rt">${esc(spotName(s))}</div><div class="lm-rs">${esc([spotRegion(s), '후기 ' + (Number(r.review_count) || 0) + '개'].filter(Boolean).join(' · '))}</div></div>${chev(false)}</button>`;
  }
  // 점수대: 4.5 이상 / 4점대 / 3점대 / 3점 미만
  const BANDS = [['45', '4.5점 이상'], ['4', '4점대'], ['3', '3점대'], ['low', '3점 미만']];
  function bandOf(r) {
    const a = Number(r.avg_rating) || 0;
    return a >= 4.5 ? '45' : a >= 4 ? '4' : a >= 3 ? '3' : 'low';
  }
  function starsHtml(a) {
    const n = Math.round(Number(a) || 0);
    return '<span class="lm-stars">' + '★'.repeat(n) + '<span>' + '★'.repeat(5 - n) + '</span></span>';
  }
  // 평점순 줄: 점수·이름·지역·후기 수·별. 후기 1개는 흐리게 표시해 여러 명이 준 점수와 구분한다
  function rankRow(r) {
    const s = spotById(r.spot_id);
    if (!s) return '';
    const n = Number(r.review_count) || 0;
    return `<button type="button" class="lm-row lmh-row" data-a="rev-spot" data-v="${esc(r.spot_id)}"><div class="lm-score${n < 2 ? ' one' : ''}">${Number(r.avg_rating || 0).toFixed(1)}</div>
      <div class="lm-rb"><div class="lm-rt">${esc(spotName(s))}</div><div class="lm-rs">${esc([spotRegion(s), '후기 ' + n + '개'].filter(Boolean).join(' · '))}</div></div>${starsHtml(r.avg_rating)}</button>`;
  }
  function paneRankTop(list) {
    const cnt = {};
    list.forEach(function (r) { const b = bandOf(r); cnt[b] = (cnt[b] || 0) + 1; });
    const bands = BANDS.filter(function (b) { return cnt[b[0]]; });
    const band = S.revBand !== 'all' && cnt[S.revBand] ? S.revBand : 'all';
    let h = '<div class="lm-dist"><div class="lm-dist-t">후기 남은 박지 ' + list.length + '곳</div><div class="lm-dist-bar">' + bands.map(function (b) {
      return '<i class="b' + b[0] + '" style="flex:' + cnt[b[0]] + '"></i>';
    }).join('') + '</div><div class="lm-dist-l">' + bands.map(function (b) {
      return '<span><i class="b' + b[0] + '"></i>' + esc(b[1]) + ' ' + cnt[b[0]] + '</span>';
    }).join('') + '</div></div>';
    h += '<div class="lm-cats" style="margin-top:12px">' + [['all', '전체']].concat(bands).map(function (b) {
      return '<button type="button" data-a="rev-band" data-v="' + b[0] + '" class="' + (band === b[0] ? 'on' : '') + '">' + esc(b[1]) + '</button>';
    }).join('') + '</div>';
    bands.forEach(function (b) {
      if (band !== 'all' && band !== b[0]) return;
      const rows = list.filter(function (r) { return bandOf(r) === b[0]; });
      h += '<div class="lm-band"><b>' + esc(b[1]) + '</b><span>' + rows.length + '곳</span></div>' + rows.map(rankRow).join('');
    });
    return h;
  }
  // 후기 많은 순: 같으면 평점 높은 순. 위 20곳만(뒤는 거의 후기 1개라 순서가 의미 없다)
  function paneRankMany(list) {
    const rows = list.slice().sort(function (a, b) {
      return (Number(b.review_count) || 0) - (Number(a.review_count) || 0) || (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0);
    }).slice(0, 20);
    const max = rows.length ? Number(rows[0].review_count) || 1 : 1;
    let i = 0;
    return '<div class="lm-dist-t" style="margin:14px 0 2px">다녀온 사람이 많은 박지</div>' + rows.map(function (r) {
      const s = spotById(r.spot_id);
      if (!s) return '';
      const n = Number(r.review_count) || 0;
      i += 1;
      return `<button type="button" class="lm-row lmh-row" data-a="rev-spot" data-v="${esc(r.spot_id)}"><div class="lm-rank">${i}</div>
        <div class="lm-rb"><div class="lm-rt">${esc(spotName(s))}<small class="lm-rgn">${esc(spotRegion(s))}</small></div><div class="lm-cbar"><i style="width:${Math.max(4, Math.round(n * 100 / max))}%"></i></div></div>
        <div class="lm-many"><b>${n}개</b><small>★ ${Number(r.avg_rating || 0).toFixed(1)}</small></div></button>`;
    }).join('');
  }
  const tipChips = function (tips) {
    return (Array.isArray(tips) && tips.length) ? '<div class="lm-tchips">' + tips.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '';
  };
  const tipKey = function (spotId, uid) { return String(spotId) + '|' + String(uid); };
  // 팁만 남긴 사람(별점 없음): 칩과 한 줄
  function tipRowItem(t, inSpot) {
    const s = spotById(t.spot_id);
    if ((!s && !inSpot) || hidden({ id: 'tip_' + t.spot_id + '_' + t.user_id, user_id: t.user_id })) return '';
    const own = isMine(t.user_id);
    return `<div class="lm-post" style="cursor:default"><div class="lm-lcol">${avUser(t.nickname, t.user_id)}</div><div class="lm-rb">
      <div class="lm-who">${whoName(t.nickname, t.user_id)}${own ? '<span class="lm-mine">내 후기</span>' : ''}<span>${esc(ago(t.updated_at))}</span></div>
      ${inSpot ? '' : `<div class="lm-rs" style="margin-top:1px"><button type="button" data-a="rev-spot" data-v="${esc(t.spot_id)}" style="color:var(--sub)">${esc(spotName(s))}</button></div>`}
      ${tipChips(t.tips)}${t.note ? `<div class="lm-bd">${esc(t.note)}</div>` : ''}
      <div class="lm-cm-acts" style="display:flex;gap:14px;margin-top:6px;font-size:11px;color:var(--faint)">${own
        ? `<button type="button" data-a="review" data-v="${esc(t.spot_id)}" style="font-weight:600">수정</button>`
        : (D.admin ? `<button type="button" style="font-weight:600;color:#ff6b6b" data-a="del-tip" data-v="${esc(t.spot_id)}" data-uid="${esc(t.user_id)}">삭제 (운영팀)</button>` : '')}</div>
      </div></div>`;
  }
  // 별점 후기 + 팁을 날짜순으로 섞는다. 같은 사람·같은 박지면 별점 후기 밑에 그 사람 칩을 붙인다
  function mixedReviewList(reviews, tipRows, inSpot) {
    const byKey = {};
    (tipRows || []).forEach(function (t) { byKey[tipKey(t.spot_id, t.user_id)] = t; });
    const used = {};
    const items = (reviews || []).map(function (r) {
      const t = byKey[tipKey(r.spot_id, r.user_id)];
      if (t) used[tipKey(t.spot_id, t.user_id)] = true;
      return { at: r.created_at, html: reviewItem(r, inSpot, t ? t.tips : null) };
    });
    (tipRows || []).forEach(function (t) {
      if (used[tipKey(t.spot_id, t.user_id)]) return;
      items.push({ at: t.updated_at, html: tipRowItem(t, inSpot) });
    });
    return items.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).map(function (x) { return x.html; }).join('');
  }
  function reviewItem(r, inSpot, chips) {
    const s = spotById(r.spot_id);
    if ((!s && !inSpot) || hidden(r)) return '';
    const own = isMine(r.user_id);
    const edited = r.updated_at && r.created_at && (new Date(r.updated_at) - new Date(r.created_at) > 60000);
    return `<div class="lm-post" style="cursor:default"><div class="lm-lcol">${avUser(r.nickname, r.user_id)}</div><div class="lm-rb">
      <div class="lm-who">${whoName(r.nickname, r.user_id)}${own ? '<span class="lm-mine">내 후기</span>' : ''}<span>${esc(ago(r.created_at))}${edited ? ' · 수정됨' : ''}</span></div>
      <div class="lm-rs" style="margin-top:1px">${inSpot ? '' : `<button type="button" data-a="rev-spot" data-v="${esc(r.spot_id)}" style="color:var(--sub)">${esc(spotName(s))}</button> `}${stars(r.rating)}</div>
      ${tipChips(chips)}${r.text ? `<div class="lm-bd">${esc(r.text)}</div>` : ''}
      <div class="lm-cm-acts" style="display:flex;gap:14px;margin-top:6px;font-size:11px;color:var(--faint)">${own
        ? `<button type="button" data-a="review" data-v="${esc(r.spot_id)}" style="font-weight:600">수정</button>`
        : ugcBtn('spot_review', r.id, r.user_id, r.nickname) + (D.admin ? `<button type="button" style="font-weight:600;color:#ff6b6b" data-a="del-review" data-v="${esc(r.id)}" data-spot="${esc(r.spot_id)}">삭제 (운영팀)</button>` : '')}</div>
      </div></div>`;
  }
  // 후기 탭을 박지 하나로 좁혔을 때 (지도 정보창 "후기 N개 모두 보기", 창의 평점 높은 박지)
  function paneSpotReviews() {
    const sid = S.revSpot;
    const s = spotById(sid);
    const name = spotName(s) || '이 박지';
    const R = D.spotRev && D.spotRev.spot_id === sid ? D.spotRev : null;
    let h = `<button type="button" class="lm-back-all" data-a="rev-all">${ico(P.back, 16)}전체 후기</button>`;
    h += `<div class="lm-head">${esc(name)}<br><em>후기</em></div>`;
    if (!R) return h + '<div class="lm-empty">불러오는 중…</div>';
    if (R.error) return h + '<div class="lm-empty">후기를 불러오지 못했어요<br><button type="button" class="lm-btn sm" style="margin:14px auto 0;width:100%;max-width:180px" data-a="rev-spot" data-v="' + esc(sid) + '">다시 시도</button></div>';
    const cnt = R.summary ? Number(R.summary.review_count) || 0 : 0;
    const avg = R.summary ? Number(R.summary.avg_rating) || 0 : 0;
    const visits = R.tipSum ? Number(R.tipSum.visits) || 0 : 0;
    const tipMap = (R.tipSum && R.tipSum.tips) || {};
    const topTips = Object.keys(tipMap).sort(function (a, b) { return tipMap[b] - tipMap[a]; }).slice(0, 10);
    if (cnt || visits) h += `<div class="lm-revhead">${cnt ? `<b>${avg.toFixed(1)}</b>${stars(avg)}<span class="lm-cnt">후기 ${cnt}개</span>` : ''}${visits ? `<span class="lm-cnt" style="color:#6ee7b7">${visits}명 다녀옴</span>` : ''}</div>`;
    if (topTips.length) h += '<div class="lm-tchips lg">' + topTips.map(function (t) { return '<span>' + esc(t) + ' ' + tipMap[t] + '</span>'; }).join('') + '</div>';
    h += `<div class="lmx-btns">${s ? `<button type="button" class="lm-btn sm" data-a="spot" data-v="${esc(sid)}">${ico(P.pin, 16)}지도에서 보기</button>` : ''}
      <button type="button" class="lm-btn sm main" data-a="review" data-v="${esc(sid)}">${R.mine ? '내 후기 고치기' : '후기 쓰기'}</button></div>`;
    if (R.tier !== 'member') {
      h += (cnt || visits)
        ? '<div class="lm-empty">후기 글은 로그인하면 볼 수 있어요<br><button type="button" class="lm-btn sm main" style="margin:14px auto 0;width:100%;max-width:220px" data-a="login">로그인</button></div>'
        : '<div class="lm-empty">아직 후기가 없어요</div>';
      return h;
    }
    const items = mixedReviewList(R.reviews, R.tipRows, true);
    h += items || '<div class="lm-empty">아직 후기가 없어요.<br>다녀왔다면 첫 후기를 남겨 주세요</div>';
    if (!R.done && R.reviews.length) h += '<button type="button" class="lmh-more" data-a="more-spot-reviews">더 보기' + ico(P.chevR, 16) + '</button>';
    return h;
  }
  function paneReviews(full) {
    if (full && S.revSpot) return paneSpotReviews();
    const top = D.top.filter(function (r) { return spotById(r.spot_id); });
    if (!full) {
      if (!top.length) return homeEmpty('아직 박지 후기가 없어요', 3, '라운지 열기');
      return top.slice(0, HOME_N).map(function (r) { return bestRow(r, false); }).join('') + moreBtn(3, '최근 후기까지 전체 보기');
    }
    // 작은 탭 세 개: 처음엔 최근 후기. 랭킹이 화면을 다 채워 최근 후기가 묻혔다
    const view = S.revView === 'top' || S.revView === 'many' ? S.revView : 'recent';
    let h = '<div class="lm-seg" role="tablist">' + [['recent', '최근 후기'], ['top', '평점순'], ['many', '후기 많은 순']].map(function (t) {
      return '<button type="button" role="tab" data-a="rev-view" data-v="' + t[0] + '" class="' + (view === t[0] ? 'on' : '') + '" aria-selected="' + (view === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (view !== 'recent') {
      const rank = (D.rank || []).filter(function (r) { return spotById(r.spot_id); });
      if (D.rank === null) h += '<div class="lm-empty">불러오는 중…</div>';
      else if (!rank.length) h += '<div class="lm-empty">아직 박지 후기가 없어요</div>';
      else h += view === 'top' ? paneRankTop(rank) : paneRankMany(rank);
    } else if (D.recent === null) {
      h += '<div class="lm-empty" data-recent>불러오는 중…</div>';
    } else if (D.recentTier !== 'member') {
      h += '<div class="lm-empty">후기는 로그인하면 볼 수 있어요<br><button type="button" class="lm-btn sm main" style="margin:14px auto 0;width:100%;max-width:220px" data-a="login">로그인</button></div>';
    } else {
      const items = mixedReviewList(D.recent, D.tipsRecent || [], false);
      h += items || '<div class="lm-empty">아직 후기가 없어요</div>';
      if (!D.recentDone && D.recent.length) h += '<button type="button" class="lmh-more" data-a="more-reviews">더 보기' + ico(P.chevR, 16) + '</button>';
    }
    h += '<p class="lm-hint" style="margin-top:20px">후기는 박지마다 한 사람에 하나예요. 별점 없이 팁만 남겨도 돼요. 지도에서 박지를 열거나 「평점순」에서 박지를 눌러 남길 수 있어요.</p>';
    return h;
  }
  const PANES = [paneEvents, paneGuide, paneBoard, paneReviews, paneDeals];

  // 로딩·실패 상태를 거쳐 탭 내용을 고른다 (i = 탭 번호, full = 라운지 창)
  function paneHtml(i, full) {
    if (full && i === 3 && S.revSpot) return paneSpotReviews(); // 전체 목록 로딩과 따로 불러온다
    if (D.status === 'idle' || D.status === 'loading') return full ? '<div class="lm-empty">불러오는 중…</div>' : skeleton();
    if (D.status === 'error' || D.fail[i]) {
      return full
        ? '<div class="lm-empty">불러오지 못했어요<br><button type="button" class="lm-btn sm" style="margin:14px auto 0;width:100%;max-width:180px" data-a="retry">다시 시도</button></div>'
        : errorBox();
    }
    return PANES[i](full);
  }

  // =====================================================================
  // 화면: 홈 섹션 · 라운지 창 · 시트 · 토스트
  // =====================================================================
  let layer = null, win = null, wtrack = null, wmenu = null, wpanes = [], opener = null;
  let sheet = null, scrim = null, SH = {};
  let home = null, hmenu = null, hpanel = null;
  let toastTimer = 0, hTimer = 0, swapTimer = 0, winTimer = 0, searchTimer = 0, reloadTimer = 0;
  let lastUid = null, recentLoading = false;
  const commentLoading = {};

  // 화면 위 층 (평소엔 비어 있고 누르기를 막지 않음). 전역 토스트·로그인 창보다 위라서 토스트도 여기 둔다
  function ensureLayer() {
    if (layer && layer.isConnected) return layer;
    injectCss();
    layer = document.createElement('div');
    layer.id = 'okbmLoungeLayer';
    layer.innerHTML = '<div class="lm-toast" role="status" aria-live="polite"><i>' + ico(P.check, 13) + '</i><span></span></div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', onClick);
    layer.addEventListener('keydown', onItemKey);
    layer.addEventListener('scroll', onLayerScroll, true);
    layer.addEventListener('pointerdown', onPointerDown);
    layer.addEventListener('input', onInput);
    layer.addEventListener('change', onChange);
    layer.addEventListener('submit', onSubmit);
    return layer;
  }
  function toast(msg, err) {
    ensureLayer();
    const t = layer.querySelector('.lm-toast');
    t.classList.toggle('err', !!err);
    t.querySelector('i').innerHTML = ico(err ? P.x : P.check, 13);
    t.querySelector('span').textContent = String(msg || '');
    t.classList.remove('on');
    void t.offsetWidth;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, err ? 3200 : 2200);
  }
  const lockScroll = function () {
    if (typeof window.lockHomeScrollForTripModal === 'function') window.lockHomeScrollForTripModal();
    else document.documentElement.style.overflow = 'hidden';
  };
  const unlockScroll = function () {
    if (typeof window.unlockHomeScrollForTripModal === 'function') window.unlockHomeScrollForTripModal();
    else document.documentElement.style.overflow = '';
  };
  const register = function (id, fn) { if (typeof window.registerModalOpen === 'function') window.registerModalOpen(id, fn); };
  const unregister = function (id) { if (typeof window.unregisterModalClose === 'function') window.unregisterModalClose(id); };

  // ----- 메뉴 밑줄 (r = 탭 번호, 소수면 두 탭 사이) -----
  function placeInd(menuEl, r) {
    if (!menuEl) return;
    const btns = menuEl.querySelectorAll('button'), ind = menuEl.querySelector('.lmh-ind');
    if (!btns.length || !ind) return;
    const i = Math.max(0, Math.min(btns.length - 1, Math.floor(r))), f = Math.max(0, Math.min(1, r - i));
    const a = btns[i], b = btns[Math.min(i + 1, btns.length - 1)];
    ind.style.width = (a.offsetWidth + (b.offsetWidth - a.offsetWidth) * f) + 'px';
    ind.style.transform = 'translateX(' + (a.offsetLeft + (b.offsetLeft - a.offsetLeft) * f) + 'px)';
  }
  function setMenuOn(menuEl, tabId) {
    menuEl.querySelectorAll('button').forEach(function (b) {
      const on = Number(b.getAttribute('data-v')) === Number(tabId);
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
  }
  function revealBtn(menuEl, tabId) {
    const b = menuEl.querySelector('button[data-v="' + tabId + '"]');
    if (!b) return;
    if (b.offsetLeft < menuEl.scrollLeft || b.offsetLeft + b.offsetWidth > menuEl.scrollLeft + menuEl.clientWidth) {
      menuEl.scrollTo({ left: Math.max(0, b.offsetLeft - 20), behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  // 메뉴 글자(이번 달 행사 개수)만 새로 쓴다
  function refreshMenu(menuEl, active) {
    if (!menuEl) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = menuHtml(active, true);
    const fresh = tmp.querySelectorAll('.lmh-menu button');
    menuEl.querySelectorAll('button').forEach(function (b, i) { if (fresh[i]) b.innerHTML = fresh[i].innerHTML; });
    placeInd(menuEl, trackOf(active));
  }

  // ----- 펼치기 (같은 목록에서는 하나만) -----
  function findLmx(scope, id) {
    const list = scope ? scope.querySelectorAll('.lmx') : [];
    for (let i = 0; i < list.length; i++) if (list[i].dataset.id === String(id)) return list[i];
    return null;
  }
  function setOpen(item, open) {
    item.classList.toggle('open', open);
    // 인스타 게시물은 어떻게 펼치든(직접 누름·홈에서 넘어옴·다시 그림) 펼칠 때 붙인다
    if (open) item.querySelectorAll('.lm-ig').forEach(mountInsta);
    if (!open) {
      item.classList.remove('cal');
      resetTipVideo(item);
      item.querySelectorAll('.lm-ytap iframe').forEach(function (f) { f.remove(); });
      // 접히는 동안은 그대로 두고, 다 접힌 뒤에 게시물을 뗀다(다시 펼치면 새로 받는다)
      if (item.querySelector('.lm-ig iframe')) {
        setTimeout(function () {
          if (!item.classList.contains('open')) item.querySelectorAll('.lm-ig iframe').forEach(function (f) { f.remove(); });
        }, 400);
      }
    }
    const h = item.querySelector('[data-a="x"]');
    if (h) h.setAttribute('aria-expanded', String(open));
  }
  function toggleItem(item) {
    if (!item) return;
    const open = !item.classList.contains('open');
    // 인스타 게시물이 붙는 항목: 누른 줄이 화면에서 움직이지 않게 한다.
    // 위에 펼쳐 둔 항목은 바로 접고, 그만큼 스크롤을 되돌린다. 게시물은 아래로만 늘어난다.
    const hold = open && item.querySelector('.lm-ig');
    const head = item.querySelector('[data-a="x"]');
    const before = hold && head ? head.getBoundingClientRect().top : 0;
    Array.prototype.forEach.call(item.parentElement.children, function (n) {
      if (n !== item && n.classList && n.classList.contains('lmx') && n.classList.contains('open')) {
        if (hold) { n.classList.add('noanim'); requestAnimationFrame(function () { n.classList.remove('noanim'); }); }
        setOpen(n, false);
      }
    });
    setOpen(item, open);
    tick();
    if (hold && head) {
      const moved = head.getBoundingClientRect().top - before;
      if (moved) { const box = scrollBoxOf(item); if (box) box.scrollTop += moved; else window.scrollBy(0, moved); }
    }
    if (open) {
      afterOpen(item);
      if (!hold) setTimeout(function () { if (item.isConnected) item.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 340);
    }
  }
  // 다시 그려도 펼쳐 둔 항목은 그대로
  function keepOpen(el, render) {
    const ids = Array.prototype.map.call(el.querySelectorAll('.lmx.open'), function (n) { return n.dataset.id; });
    render();
    ids.forEach(function (id) {
      const n = findLmx(el, id);
      if (n) { n.classList.add('noanim'); setOpen(n, true); requestAnimationFrame(function () { n.classList.remove('noanim'); }); }
    });
  }
  // 글을 펼치면 댓글을 그때 불러온다 (라운지 창에서만 글이 펼쳐짐)
  function afterOpen(item) {
    const p = findPost(item.dataset.id);
    if (p && D.comments[p.id] === undefined) fetchComments(p);
  }
  async function fetchComments(p) {
    if (commentLoading[p.id]) return;
    commentLoading[p.id] = true;
    let failed = false;
    try { await loadComments(p.id); } catch (e) { failed = true; console.warn('[lounge.js:fetchComments]', e); }
    commentLoading[p.id] = false;
    if (!layer) return;
    layer.querySelectorAll('[data-comments]').forEach(function (n) {
      if (n.dataset.comments !== String(p.id)) return;
      if (failed) n.textContent = '댓글을 불러오지 못했어요';
      else n.outerHTML = commentsHtml(p);
    });
  }

  // ---------- 홈 섹션 (원정대 아래): 탭마다 3줄 ----------
  function animateHeight(mutate) {
    if (reduce || !hpanel) { mutate(); return; }
    const h0 = hpanel.offsetHeight;
    hpanel.classList.remove('anim');
    hpanel.style.height = '';
    mutate();
    const h1 = hpanel.offsetHeight;
    if (h0 === h1) return;
    hpanel.style.height = h0 + 'px';
    void hpanel.offsetHeight;
    hpanel.classList.add('anim');
    hpanel.style.height = h1 + 'px';
    clearTimeout(hTimer);
    hTimer = setTimeout(function () { if (!hpanel) return; hpanel.classList.remove('anim'); hpanel.style.height = ''; }, 420);
  }
  // 홈 개편(2026-10-31): 히어로 밑 바로가기 세 칸 다음 '백패커 라운지' 한 덩어리 (index.html #okbmLoungeHome)
  //   소식 띠(#okbmHomeNews) → 알약 네 개(#okbmHomeHub: 게시판·설문·투표·후기·랭킹·초보 가이드) → 행사|할인(#homeDealStrip) → 매거진(#okbmHomeMag)
  const isSplit = function () { return !!document.getElementById('okbmHomeHub'); };
  function paintQuickCounts() {
    if (D.status !== 'ready') return;
    const g = document.getElementById('hqGuideCount');
    const e = document.getElementById('hqEventCount');
    const gn = tips().length + kits().length;
    const en = thisMonthEvents().length;
    if (g) g.textContent = gn ? gn + '편' : '\u00a0';
    if (e) e.textContent = en ? en + '개' : '\u00a0';
  }
  // 바로가기 밑 두 칸 (2026-10-21): 왼쪽 이달의 행사, 오른쪽 할인 소식. 칸마다 3줄, 제목 옆 '전체 ›'.
  // 행사는 참가할 수 있는 가까운 날부터(homeEventList), 할인은 진행중을 마감이 가까운 순(ongoingDeals).
  // 제목 밑 금색 한 줄(신청·오픈 일시). 제목 두 줄 자르기가 깨지지 않게 감싸서 따로 둔다
  function hdText(title, line, hot) {
    if (!line) return '<span class="hd-x">' + esc(title) + '</span>';
    return '<span class="hd-xw"><span class="hd-x">' + esc(title) + '</span><em class="hd-ap' + (hot ? ' hot' : '') + '">' + esc(line) + '</em></span>';
  }
  // 왼쪽 날짜 칸: '~'(까지)는 작게 앞에 붙여 '~11/20'도 칸 안에 들어가게 한다
  function hdDate(d, until) {
    return '<b>' + (until ? '<i class="hd-tl">~</i>' : '') + (d.getMonth() + 1) + '/' + d.getDate() + '</b>';
  }
  function hdEvRow(e) {
    const v = evView(e);
    // 신청이 곧 열리거나 신청 중이면: 왼쪽에 신청 날, 꼬리표에 남은 때(1시간 안은 'N분 뒤'), 제목 밑에 시각
    const ap = applyView(e);
    if (ap && ap.hot) {
      const at = ap.phase === 'open' ? new Date(ap.close - 1) : ap.open;
      const chip = ap.phase === 'open' ? applyChip(ap, true).replace(' 마감', '') : (ap.phase === 'opened' ? '행사 ' + v.ddText : leftChip(ap.open, true));
      const hot = isHotChip(chip);
      return '<button type="button" class="hd-row" data-a="lounge" data-v="0" data-id="' + esc(e.id) + '"><span class="hd-k">' + hdDate(at, ap.phase === 'open') + '<small' + (hot ? ' class="hot"' : '') + '>' + esc(chip) + '</small></span>' + hdText(e.title, applyLine(ap, false), hot) + '</button>';
    }
    // 이미 시작한 행사는 끝나는 날(~10/31)과 남은 날, 아니면 시작일과 D-n. 오늘·내일이면 빨갛게
    const going = v.start < parseD(todayKey());
    let chip = v.ddText.replace('종료 ', '');
    if (chip === 'D-1') chip = '내일';
    const hot = chip === '오늘' || chip === '오늘 종료' || chip === '내일';
    return '<button type="button" class="hd-row" data-a="lounge" data-v="0" data-id="' + esc(e.id) + '"><span class="hd-k">' + hdDate(going ? v.end : v.start, going) + '<small' + (hot ? ' class="hot"' : '') + '>' + esc(chip) + '</small></span><span class="hd-x">' + esc(e.title) + '</span></button>';
  }
  function hdDealRow(d) {
    const t = todayKey();
    let chip = '진행중', hot = false;
    if (dealSoon(d)) {
      chip = leftChip(dealStartAt(d), true);
      hot = isHotChip(chip);
    } else if (d.end_date) {
      const left = Math.round((parseD(d.end_date) - parseD(t)) / 86400000);
      chip = left <= 0 ? '오늘' : (left === 1 ? '내일' : 'D-' + left);
      hot = left <= 1;
    }
    return '<button type="button" class="hd-row" data-a="lounge" data-v="' + TAB_DEAL + '" data-id="' + esc(d.id) + '"><span class="hd-k"><b>' + esc(dealMark(d)) + '</b><small' + (hot ? ' class="hot"' : '') + '>' + esc(chip) + '</small></span>' + hdText(d.title, dealLine(d, false), hot) + '</button>';
  }
  function paintDealSurfaces() {
    const strip = document.getElementById('homeDealStrip');
    if (!strip) return;
    if (D.status !== 'ready') { strip.hidden = true; strip.innerHTML = ''; return; }
    const evs = D.fail[0] ? [] : homeEventList();
    // 곧 오픈하는 할인이 진행중보다 위
    const now = D.fail[TAB_DEAL] ? [] : soonDeals().concat(ongoingDeals());
    const dealN = now.length;
    if (!evs.length && !dealN) { strip.hidden = true; strip.innerHTML = ''; return; }
    strip.hidden = false;
    strip.innerHTML =
      '<div class="hd-col hd-ev"><div class="hd-h"><b>이달의 행사<i>' + (thisMonthEvents().length || evs.length) + '</i></b><button type="button" data-a="lounge" data-v="0">전체 ›</button></div>'
      + (evs.length ? evs.slice(0, HOME_N).map(hdEvRow).join('') : '<div class="hd-empty">다가오는 행사가 아직 없어요</div>') + '</div>'
      + '<div class="hd-col hd-deal"><div class="hd-h"><b>할인 소식<i>' + dealN + '</i></b><button type="button" data-a="lounge" data-v="' + TAB_DEAL + '">전체 ›</button></div>'
      + (now.length ? now.slice(0, HOME_N).map(hdDealRow).join('') : '<div class="hd-empty">진행중인 할인이 없어요</div>') + '</div>';
  }
  function renderSplit() {
    paintNews();
    paintHub();
    paintMag();
    paintQuickCounts();
    paintDealSurfaces();
  }

  // ----- 소식 띠: 야영 금지·업데이트·공지. 여러 개면 8초마다 넘어간다(대표님 10-31: 5초는 너무 빠름) -----
  const NEWS_KIND = { closure: '야영 금지', update: '업데이트', notice: '공지', magazine: '매거진' };
  const newsList = function () { return D.news.filter(function (n) { return n.kind !== 'magazine' && (n.is_active !== false || D.admin); }); };
  const magList = function () { return D.news.filter(function (n) { return n.kind === 'magazine' && (n.is_active !== false || D.admin); }); };
  const newsImgs = function (n) { return (Array.isArray(n && n.images) ? n.images : []).filter(function (u) { return okbmSafeImageUrl(u); }); };
  const firstLine = function (t) { return String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean)[0] || ''; };
  let newsAt = 0, newsTimer = null;
  function newsSlide(n, i, len) {
    const sub = firstLine(n.body);
    return `<button type="button" class="hn-card k-${esc(n.kind)}" data-a="news" data-v="${esc(n.id)}">
      ${len > 1 ? `<span class="hn-dots" aria-hidden="true">${Array.from({ length: len }, function (_, j) { return '<i' + (j === i ? ' class="on"' : '') + '></i>'; }).join('')}</span>` : ''}
      <em>${esc(NEWS_KIND[n.kind] || '소식')}${n.is_active === false ? ' · 숨김' : ''}</em><b>${esc(n.title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  }
  function paintNews() {
    const el = document.getElementById('okbmHomeNews');
    if (!el) return;
    const list = D.status === 'ready' ? newsList() : [];
    clearInterval(newsTimer);
    const add = D.admin && D.status === 'ready' ? '<button type="button" class="hn-add" data-a="new-news" data-v="closure">' + ico(P.plus, 14) + '소식 올리기 (운영팀)</button>' : '';
    if (!list.length) {
      el.innerHTML = add;
      el.hidden = !add;
      return;
    }
    el.hidden = false;
    newsAt = newsAt % list.length;
    el.innerHTML = newsSlide(list[newsAt], newsAt, list.length) + add;
    if (list.length > 1 && !reduce) {
      newsTimer = setInterval(function () {
        if (document.hidden) return;
        const l = newsList();
        if (l.length < 2) return;
        newsAt = (newsAt + 1) % l.length;
        const card = el.querySelector('.hn-card');
        if (card) card.outerHTML = newsSlide(l[newsAt], newsAt, l.length);
      }, 8000);
    }
  }

  // ----- 알약 네 개: 게시판 · 설문·투표 · 후기·랭킹 · 초보 가이드. 칸마다 세 줄 -----
  const HUB = [['board', '게시판'], ['poll', '설문·투표'], ['review', '후기·랭킹'], ['guide', '초보 가이드']];
  function hubRow(attrs, tag, title, meta) {
    return `<button type="button" class="hh-row" ${attrs}><span class="hh-x">${tag ? `<i>${esc(tag)}</i>` : ''}${esc(title)}</span>${meta ? `<small>${esc(meta)}</small>` : ''}</button>`;
  }
  function hubBody(key) {
    if (D.status !== 'ready') return '<div class="hh-empty">불러오는 중…</div>';
    if (key === 'board' || key === 'poll') {
      const st = postsBy[key === 'poll' ? 'poll' : 'all'];
      if (!st) return '<div class="hh-empty">불러오는 중…</div>';
      const list = visiblePosts(key === 'poll' ? 'poll' : 'all').filter(function (p) { return !p.is_private; }).slice(0, HOME_N);
      const rows = list.map(function (p) {
        const poll = p.category === 'poll';
        const r = D.poll[p.id];
        const meta = poll ? (r ? (Number(r.total) || 0) + '명 참여' : '참여하기') : [p.nickname, Number(p.comments_count) ? '댓글 ' + p.comments_count : ''].filter(Boolean).join(' · ');
        return hubRow('data-a="lounge" data-v="2" data-id="' + esc(p.id) + '"', poll ? '설문' : '', p.title, meta);
      }).join('');
      return (rows || '<div class="hh-empty">' + (key === 'poll' ? '첫 설문을 올려 보세요' : '첫 글을 기다리고 있어요') + '</div>')
        + '<button type="button" class="hh-cta" data-a="new-post" data-v="' + (key === 'poll' ? 'poll' : '') + '">' + ico(P.plus, 16) + (key === 'poll' ? '설문 만들기' : '글쓰기') + '</button>';
    }
    if (key === 'review') {
      const top = D.top.filter(function (r) { return spotById(r.spot_id); }).slice(0, HOME_N);
      const rows = top.map(function (r) {
        const s = spotById(r.spot_id);
        return hubRow('data-a="spot" data-v="' + esc(r.spot_id) + '"', '★ ' + Number(r.avg_rating || 0).toFixed(1), spotName(s), [spotRegion(s), '후기 ' + (Number(r.review_count) || 0)].filter(Boolean).join(' · '));
      }).join('');
      return (rows || '<div class="hh-empty">아직 박지 후기가 없어요</div>')
        + '<button type="button" class="hh-cta" data-a="lounge" data-v="3">평점순·후기 많은 순 전체 보기' + ico(P.chevR, 16) + '</button>';
    }
    const tipList = tips();
    const daily = typeof window.okbmDailyOrder === 'function' ? window.okbmDailyOrder(tipList, function (t) { return t.id; }, 'guides') : tipList;
    const rows = daily.slice(0, HOME_N).concat(kits().slice(0, Math.max(0, HOME_N - daily.length)));
    const html = rows.map(function (t) {
      const note = t.kind === 'kit' ? '장비' : (TIP_NOTES.indexOf(t.note) >= 0 ? t.note : '팁');
      return hubRow('data-a="lounge" data-v="1" data-id="' + esc(t.id) + '"', note, t.title, '');
    }).join('');
    return (html || '<div class="hh-empty">초보 가이드를 준비하고 있어요</div>')
      + '<button type="button" class="hh-cta" data-a="lounge" data-v="1">가이드 ' + (tips().length + kits().length) + '편 전체 보기' + ico(P.chevR, 16) + '</button>';
  }
  function paintHub() {
    const el = document.getElementById('okbmHomeHub');
    if (!el) return;
    const key = HUB.some(function (h) { return h[0] === S.hub; }) ? S.hub : 'board';
    el.innerHTML = '<div class="hh-chips" role="tablist" aria-label="라운지">' + HUB.map(function (h) {
      return '<button type="button" role="tab" data-a="hub" data-v="' + h[0] + '" class="' + (h[0] === key ? 'on' : '') + '" aria-selected="' + (h[0] === key) + '">' + esc(h[1]) + '</button>';
    }).join('') + '</div><div class="hh-body" role="tabpanel">' + hubBody(key) + '</div>';
  }

  // ----- 매거진 줄: 카드뉴스 표지. 누르면 한 장씩 넘겨 본다 -----
  function paintMag() {
    const el = document.getElementById('okbmHomeMag');
    if (!el) return;
    const list = D.status === 'ready' ? magList() : [];
    if (!list.length && !D.admin) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<div class="hm-head">낭만 매거진</div><div class="hm-rail">' + list.map(function (n) {
      const cover = newsImgs(n)[0];
      return `<button type="button" class="hm-card" data-a="news" data-v="${esc(n.id)}" aria-label="${esc(n.title)}">${cover ? `<img src="${escapeHtml(okbmSafeImageUrl(cover))}" alt="" loading="lazy" decoding="async">` : ''}<span>${n.is_active === false ? '<em>숨김</em>' : ''}${esc(n.title)}</span></button>`;
    }).join('') + (D.admin ? '<button type="button" class="hm-card add" data-a="new-news" data-v="magazine">' + ico(P.plus, 20) + '<span>매거진 올리기</span></button>' : '') + '</div>';
  }
  // 소식·매거진 보기 (아래에서 올라오는 창). 사진이 여러 장이면 옆으로 넘긴다
  function openNews(id) {
    const n = D.news.find(function (x) { return String(x.id) === String(id); });
    if (!n) return;
    const imgs = newsImgs(n);
    const link = n.link_url && HTTPS_RE.test(n.link_url) ? n.link_url : '';
    openSheet(`<p class="lm-ssub" style="margin:0 0 4px">${esc(NEWS_KIND[n.kind] || '소식')} · ${esc(ago(n.created_at))}</p><h3 id="loungeSheetTitle">${esc(n.title)}</h3>
      ${imgs.length ? `<div class="hm-view">${imgs.map(function (u, i) { return `<img src="${escapeHtml(okbmSafeImageUrl(u))}" alt="${esc(n.title)} ${i + 1}/${imgs.length}" loading="lazy" decoding="async">`; }).join('')}</div>${imgs.length > 1 ? `<p class="lm-hint" style="text-align:center">옆으로 넘겨 보세요 · ${imgs.length}장</p>` : ''}` : ''}
      ${n.body ? `<p class="lm-desc">${bodyHtml(n.body)}</p>` : ''}
      ${link ? `<a class="lm-btn main" style="display:flex;align-items:center;justify-content:center;margin-top:16px;text-decoration:none" href="${escapeHtml(okbmSafeExternalUrl(link))}" target="_blank" rel="noopener noreferrer">자세히 보기</a>` : ''}
      ${D.admin ? `<div class="lmx-links" style="margin-top:14px"><button type="button" data-a="edit-news" data-v="${esc(n.id)}">수정</button><button type="button" class="red" data-a="del-news" data-v="${esc(n.id)}">삭제</button></div>` : ''}`,
    { kind: 'news-view', id: n.id });
  }
  // 운영팀 올리기·고치기
  function newsFormHtml(n, kind) {
    return `<h3 id="loungeSheetTitle">${n ? '고치기' : (kind === 'magazine' ? '매거진 올리기' : '소식 올리기')}</h3><p class="lm-ssub">관리자에게만 보이는 화면이에요. 매거진은 첫 사진이 표지예요(1080×1350 세로 카드뉴스, 10장까지).</p>
      <form data-form="news" novalidate autocomplete="off">
        <div class="lm-chipline" role="radiogroup" aria-label="종류">${Object.keys(NEWS_KIND).map(function (k) {
          const on = k === kind;
          return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-a="news-kind" data-v="' + k + '">' + esc(NEWS_KIND[k]) + '</button>';
        }).join('')}</div>
        ${field('lmNwTitle', '제목', inp('lmNwTitle', 'title', n && n.title, 'maxlength="80" required data-autofocus placeholder="예: 굴업도 개머리언덕, 11월 한 달 야영 금지"'), true)}
        ${field('lmNwBody', '내용', '<textarea class="lm-ta" id="lmNwBody" name="body" maxlength="3000" placeholder="첫 줄은 띠 아래 한 줄로 보여요. 예: 옹진군 공고 · 12월 1일부터 다시 열려요">' + esc(n && n.body) + '</textarea>')}
        ${field('lmNwLink', '자세히 보기 링크', inp('lmNwLink', 'link_url', n && n.link_url, 'type="url" inputmode="url" maxlength="500" placeholder="https:// 공고·안내 글 (선택)"'))}
        <span class="lm-lbl">사진 <span data-pcount>${(SH.photos || []).length}</span>/10</span>
        <div class="lm-thumbs" data-thumbs>${thumbsHtml()}</div>
        <label class="lm-file">${ico(P.img, 18)}<span>사진 추가</span><input type="file" accept="image/*,.heic,.heif" multiple data-post-files hidden></label>
        ${field('lmNwSort', '순서 (작을수록 앞)', inp('lmNwSort', 'sort', n ? n.sort : 0, 'type="number" inputmode="numeric" min="-999" max="999"'))}
        <div style="margin-top:10px">${sw('is_active', '모두에게 보이기', n ? n.is_active !== false : true)}</div>
        <button type="submit" class="lm-btn main">${n ? '저장' : '올리기'}</button>
      </form>`;
  }
  function openNewsForm(n, kind) {
    if (!D.admin) return;
    const k = n ? n.kind : (NEWS_KIND[kind] ? kind : 'closure');
    const st = { kind: 'news', id: n ? n.id : null, nkind: k, photos: newsImgs(n || {}).map(function (u) { return { url: u }; }), sw: { is_active: n ? n.is_active !== false : true } };
    const prev = SH;
    SH = st; // thumbsHtml이 SH를 읽는다
    const html = newsFormHtml(n, k);
    SH = prev;
    openSheet(html, st);
  }
  async function saveNews(f) {
    const st = SH;
    const val = function (n) { return String((f.elements[n] && f.elements[n].value) || '').trim(); };
    const images = st.photos.map(function (ph) { return ph.url; }).filter(function (u) { return okbmSafeImageUrl(u); }).slice(0, 10);
    const row = {
      kind: st.nkind, title: val('title'), body: val('body'), link_url: val('link_url'), images: images,
      sort: Math.max(-999, Math.min(999, parseInt(val('sort'), 10) || 0)), is_active: !!st.sw.is_active
    };
    const bad = function (name, msg) { toast(msg, true); if (name && f.elements[name]) f.elements[name].focus(); };
    if (!row.title) return bad('title', '제목을 적어 주세요');
    if (row.link_url && !HTTPS_RE.test(row.link_url)) return bad('link_url', '링크는 https://로 시작해야 해요');
    if (st.photos.some(function (ph) { return ph.uploading; })) return toast('사진을 올리는 중이에요. 잠시 뒤 다시 눌러 주세요', true);
    if (row.kind === 'magazine' && !images.length) return bad('', '매거진은 사진(표지)을 한 장 이상 올려 주세요');
    await submitRow(f, 'lounge_news', st.id, row, st.id ? '고쳤어요' : (row.kind === 'magazine' ? '매거진을 올렸어요' : '소식을 올렸어요'));
  }
  function renderHome() {
    if (isSplit()) { renderSplit(); return; }
    const body = document.getElementById('okbmLoungeHomeBody');
    if (!body) return;
    if (!hpanel || !body.contains(hpanel)) {
      body.innerHTML = menuHtml(S.tab, true) + '<div class="lmh-panel" role="tabpanel" aria-label="' + esc(TABS[S.tab]) + '"><div class="lmh-pane">' + paneHtml(S.tab, false) + '</div></div>';
      hmenu = body.querySelector('.lmh-menu');
      hpanel = body.querySelector('.lmh-panel');
      placeInd(hmenu, trackOf(S.tab));
      return;
    }
    refreshMenu(hmenu, S.tab);
    animateHeight(function () {
      hpanel.querySelectorAll('.lmh-pane.out').forEach(function (n) { n.remove(); });
      const p = hpanel.querySelector('.lmh-pane');
      if (!p) return;
      p.classList.remove('in');
      keepOpen(p, function () { p.innerHTML = paneHtml(S.tab, false); });
    });
  }
  // 홈 메뉴 → 아래 내용이 옆으로 밀리며 바뀐다 (홈에서는 손가락 밀기로 바꾸지 않음: 가로 레일과 겹침)
  function switchTab(i) {
    if (!hpanel || i === S.tab || i < 0 || i >= TABS.length) return;
    const dir = i > S.tab ? 1 : -1;
    S.tab = i;
    setMenuOn(hmenu, i);
    placeInd(hmenu, trackOf(i));
    revealBtn(hmenu, i);
    hpanel.setAttribute('aria-label', TABS[i]);
    tick();
    animateHeight(function () {
      hpanel.querySelectorAll('.lmh-pane.out').forEach(function (n) { n.remove(); });
      const old = hpanel.querySelector('.lmh-pane');
      const neu = document.createElement('div');
      neu.className = 'lmh-pane';
      neu.innerHTML = paneHtml(i, false);
      if (old && !reduce) { old.classList.remove('in'); old.style.setProperty('--dx', (-dir * 28) + 'px'); old.classList.add('out'); }
      else if (old) old.remove();
      if (!reduce) { neu.style.setProperty('--dx', (dir * 28) + 'px'); neu.classList.add('in'); }
      hpanel.appendChild(neu);
    });
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () { if (hpanel) hpanel.querySelectorAll('.lmh-pane.out').forEach(function (n) { n.remove(); }); }, 260);
    if (home && home.getBoundingClientRect().top < 0) home.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }

  // ---------- 라운지 창 (오른쪽에서 밀려 들어옴) ----------
  function winHtml(tab) {
    return `<div class="lm-win collapsed" id="loungeWindow" role="dialog" aria-modal="true" aria-label="백패커 라운지">
      <div class="lmw-top">
        <div class="lmw-bar"><button type="button" class="lmw-back" data-a="wclose" aria-label="라운지 닫기">${ico(P.back, 24)}</button><span class="lmw-mini" aria-hidden="true">백패커 라운지</span><span class="lmw-adm">${D.admin ? '관리자' : ''}</span></div>
        <h2 class="lmw-big">백패커 라운지</h2>
        ${menuHtml(tab, true)}
      </div>
      <div class="lmw-track">${TAB_ORDER.map(function (i) { return `<section class="lmw-pane" data-tab="${i}" role="tabpanel" aria-label="${esc(TABS[i])}">${paneHtml(i, true)}</section>`; }).join('')}</div>
      <div class="lmw-edge" aria-hidden="true"></div></div>`;
  }
  function paneByTab(tab) {
    if (!wpanes || !wpanes.length) return null;
    for (let i = 0; i < wpanes.length; i++) {
      if (Number(wpanes[i].dataset.tab) === Number(tab)) return wpanes[i];
    }
    return null;
  }
  function rerenderPane(i) {
    if (!win) return;
    const p = paneByTab(i);
    if (!p) return;
    keepOpen(p, function () { p.innerHTML = paneHtml(i, true); });
  }
  function rerenderWindow() {
    if (!win) return;
    refreshMenu(wmenu, S.wtab);
    const adm = win.querySelector('.lmw-adm');
    if (adm) adm.textContent = D.admin ? '관리자' : '';
    for (let i = 0; i < wpanes.length; i++) rerenderPane(i);
  }
  function renderAll() { timeSig = timeSigNow(); renderHome(); paintDealSurfaces(); rerenderWindow(); }
  // 신청·오픈 시각이 지나면 순서와 글씨가 바뀐다. 1분마다 상태(맨 위로·제자리)가 바뀌었으면 전부 다시 그리고,
  // 아니면 홈 두 칸('37분 뒤' 같은 꼬리표)만 다시 그린다. 펼친 글·인스타 게시물은 상태가 바뀔 때만 다시 그려진다.
  function timeSigNow() {
    return todayKey() + '|' + D.events.map(function (e) { const ap = applyView(e); return ap ? ap.phase : ''; }).join() + '|'
      + (D.deals || []).map(function (d) { return dealAlive(d) ? dealPhase(d) + (dealSoon(d) ? 's' : '') + dealLine(d, true) : 'x'; }).join();
  }
  function timeTick() {
    if (D.status !== 'ready' || document.hidden) return;
    if (timeSigNow() !== timeSig) renderAll(); else paintDealSurfaces();
  }
  setInterval(timeTick, 60000);
  document.addEventListener('visibilitychange', timeTick);
  // 자유게시판만 바뀐 경우(댓글·글 쓰기/삭제): 홈은 게시판 탭일 때만, 창은 게시판 칸만 다시 그린다
  const BOARD_TAB = 2;
  function renderBoard() {
    if (isSplit()) renderSplit(BOARD_TAB);
    else if (S.tab === BOARD_TAB) renderHome();
    rerenderPane(BOARD_TAB);
  }
  function renderBoardList() {
    const boardPane = paneByTab(2);
    if (!win || !boardPane) return;
    const l = boardPane.querySelector('.lmh-list');
    if (l) keepOpen(l, function () { l.innerHTML = boardListHtml(); });
  }
  // 최근 후기(회원만 본문)는 창을 열 때 한 번 불러온다
  function ensureRecent() {
    if (D.recent !== null || recentLoading || D.status !== 'ready') return;
    recentLoading = true;
    loadRecentReviews(false).catch(function (e) {
      console.warn('[lounge.js:ensureRecent]', e);
      D.recent = []; D.recentTier = loggedIn() ? 'member' : 'guest'; D.recentDone = true;
    }).then(function () { recentLoading = false; rerenderPane(3); });
  }
  // 창 안의 항목을 펼치고 보이는 곳까지 내린다 (홈 글 줄, 나중에 ?lounge=탭&id= 딥링크)
  function focusItem(tab, id, animate) {
    const pane = paneByTab(tab);
    if (!pane || !id) return null;
    let t = findLmx(pane, id);
    if (!t && tab === 2 && S.cat !== 'all') { S.cat = 'all'; rerenderPane(2); t = findLmx(pane, id); }
    if (!t) return null;
    if (!animate) t.classList.add('noanim');
    Array.prototype.forEach.call(t.parentElement.children, function (n) {
      if (n !== t && n.classList && n.classList.contains('open')) setOpen(n, false);
    });
    setOpen(t, true);
    afterOpen(t);
    if (animate) {
      setTimeout(function () { if (t.isConnected) t.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 340);
    } else {
      pane.scrollTop += t.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8;
      requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.remove('noanim'); }); });
    }
    return t;
  }
  // 목록에 아직 없는 글(첫 로딩 중, 오래된 글, 알림·신고 검수에서 열 때): 불러온 뒤 펼친다
  async function focusPostWhenReady(id) {
    try {
      if (loadAllPromise) await loadAllPromise;
      if (!win) return;
      if (!findPost(id)) {
        const p = await loadPostById(id);
        if (!p) { toast('글을 찾을 수 없어요. 지워졌거나 볼 수 없는 글이에요', true); return; }
      }
      if (!win) return;
      if (S.cat !== 'all') S.cat = 'all';
      rerenderPane(2);
      // 신고했거나 차단한 사람의 글이면 목록에서 빠져 있다
      if (!focusItem(2, id, true)) toast('신고했거나 차단한 사람의 글이라 보이지 않아요', true);
    } catch (e) {
      console.warn('[lounge.js:focusPostWhenReady]', e);
      toast('글을 불러오지 못했어요', true);
    }
  }
  // i는 탭 번호(TABS). 칸은 TAB_ORDER 순이라 화면 위치는 trackOf로 바꾼다.
  function winTo(i) { if (wtrack) wtrack.scrollTo({ left: trackOf(i) * wtrack.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }
  function openLoungeWindow(tab, itemId, from) {
    tab = Number(tab);
    if (!(tab >= 0 && tab < TABS.length)) tab = S.tab;
    ensureLayer();
    if (D.status === 'idle') loadAll();
    if (win) {
      winTo(tab);
      if (itemId) setTimeout(function () { if (win && !focusItem(tab, itemId, true) && tab === 2) focusPostWhenReady(itemId); }, reduce ? 0 : 360);
      return;
    }
    closeSheet(true);
    clearTimeout(winTimer);
    layer.querySelectorAll('.lm-win').forEach(function (n) { n.remove(); }); // 닫히는 중이던 창
    const post = itemId && findPost(itemId);
    if (post && S.cat !== 'all' && post.category !== S.cat) S.cat = 'all';
    S.wtab = tab;
    layer.insertAdjacentHTML('afterbegin', winHtml(tab));
    win = layer.querySelector('.lm-win');
    wtrack = win.querySelector('.lmw-track');
    wmenu = win.querySelector('.lmh-menu');
    wpanes = Array.prototype.slice.call(win.querySelectorAll('.lmw-pane'));
    wmenu.querySelector('.lmh-ind').classList.add('live'); // 창 안 밑줄은 가로 스크롤을 그대로 따라감
    wtrack.scrollLeft = trackOf(tab) * wtrack.clientWidth;
    placeInd(wmenu, trackOf(tab));
    revealBtn(wmenu, tab);
    const target = itemId ? focusItem(tab, itemId, false) : null;
    if (itemId && !target && tab === 2) focusPostWhenReady(itemId);
    opener = from || document.activeElement;
    lockScroll();
    register('loungeWindow', closeLoungeWindow);
    void win.offsetWidth;
    win.classList.add('on');
    tick();
    ensureRecent();
    const w = win;
    const focusEl = (target && target.querySelector('[data-a="x"]')) || w.querySelector('.lmw-back');
    setTimeout(function () { if (win === w && focusEl) focusEl.focus({ preventScroll: true }); }, reduce ? 0 : 430);
  }
  // instant === true: 애니메이션 없이 바로 (하단 탭 이동, 지도·로그인으로 넘어갈 때)
  function closeLoungeWindow(instant) {
    if (!win) return;
    const now = instant === true || reduce;
    closeSheet(true);
    const w = win;
    win = null; wtrack = null; wmenu = null; wpanes = [];
    S.revSpot = null; // 다음에 열 때는 전체 후기부터
    // 닫히는 동안 뒤로 가기·잠금 판정에 안 잡히게 id를 먼저 뗀다
    w.removeAttribute('id');
    w.removeAttribute('role');
    w.setAttribute('aria-hidden', 'true');
    unregister('loungeWindow');
    unlockScroll();
    if (now) w.remove();
    else { w.classList.remove('on'); winTimer = setTimeout(function () { w.remove(); }, 440); }
    if (instant !== true) {
      // 연 버튼으로 포커스를 돌려준다 (그 사이 홈이 다시 그려졌으면 "전체")
      const back = (opener && opener.isConnected && opener !== document.body) ? opener : (home && home.querySelector('.lmh-all'));
      if (back && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch (e) {} }
    }
    opener = null;
  }
  // 창 안: 가로 스크롤(브라우저 기본 스냅)에 메뉴가 따라온다. 제목은 탭마다 같은 작은 글씨로 둔다.
  function onLayerScroll(e) {
    if (!win) return;
    const t = e.target;
    if (t === wtrack) {
      const r = wtrack.scrollLeft / Math.max(1, wtrack.clientWidth);
      placeInd(wmenu, r);
      const i = tabAt(r);
      if (i !== S.wtab && paneByTab(i)) {
        S.wtab = i;
        setMenuOn(wmenu, i);
        revealBtn(wmenu, i);
        tick();
      }
    }
  }

  // ---------- 시트 (아래에서 올라옴: 관리자 등록·수정, 확인) ----------
  function openSheet(html, state) {
    ensureLayer();
    closeSheet(true);
    SH = state || {};
    SH.opener = document.activeElement;
    layer.insertAdjacentHTML('beforeend', '<div class="lm-scrim" data-a="shut"></div><div class="lm-sheet" id="loungeSheet" role="dialog" aria-modal="true" aria-labelledby="loungeSheetTitle"><div class="lm-grab" aria-hidden="true"><i></i></div><div class="lm-sb">' + html + '</div></div>');
    sheet = layer.querySelector('.lm-sheet');
    scrim = layer.querySelector('.lm-scrim');
    if (!win) lockScroll();
    register('loungeSheet', closeSheet);
    void sheet.offsetHeight;
    sheet.classList.add('on');
    scrim.classList.add('on');
    tick();
    const s = sheet;
    setTimeout(function () {
      if (sheet !== s) return;
      const f = s.querySelector('[data-autofocus]') || s.querySelector('h3');
      if (f) { if (!f.hasAttribute('tabindex') && f.tagName === 'H3') f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    }, reduce ? 0 : 460);
    return sheet;
  }
  function closeSheet(instant) {
    if (!sheet) return;
    const s = sheet, sc = scrim, st = SH;
    sheet = null; scrim = null; SH = {};
    s.removeAttribute('id');
    s.removeAttribute('role');
    unregister('loungeSheet');
    if (typeof st.resolve === 'function') { try { st.resolve(false); } catch (e) {} }
    if (!win) unlockScroll();
    if (instant === true || reduce) { s.remove(); if (sc) sc.remove(); }
    else {
      s.classList.remove('drag', 'on');
      s.style.transform = '';
      if (sc) sc.classList.remove('on');
      setTimeout(function () { s.remove(); if (sc) sc.remove(); }, 450);
    }
    if (instant !== true && st.opener && st.opener.isConnected && typeof st.opener.focus === 'function') {
      try { st.opener.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  // 확인 시트 → Promise<boolean>
  function confirmSheet(title, msg, okLabel) {
    return new Promise(function (resolve) {
      openSheet(`<h3 id="loungeSheetTitle">${esc(title)}</h3>${msg ? `<p class="lm-ssub">${esc(msg)}</p>` : ''}
        <div class="lmx-btns"><button type="button" class="lm-btn" data-a="shut">취소</button><button type="button" class="lm-btn main red" data-a="ok" data-autofocus>${esc(okLabel || '삭제')}</button></div>`,
      { kind: 'confirm', resolve: resolve });
    });
  }
  // 시트 손잡이를 아래로 끌어 닫기
  function onPointerDown(e) {
    if (!sheet || !e.target.closest('.lm-grab')) return;
    const el = sheet, y0 = e.clientY, t0 = performance.now();
    let d = 0;
    el.classList.add('drag');
    const move = function (ev) { d = Math.max(0, ev.clientY - y0); el.style.transform = 'translateY(' + d + 'px)'; };
    const up = function () {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const v = d / Math.max(1, performance.now() - t0);
      if (sheet === el && (d > Math.min(110, el.offsetHeight * 0.35) || (v > 0.6 && d > 30))) closeSheet();
      else { el.classList.remove('drag'); el.style.transform = ''; }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  // =====================================================================
  // 관리자: 행사·가이드 등록/수정/고정/숨김/삭제 (RLS lounge_*_admin_write가 최종 판단)
  // =====================================================================
  const HTTPS_RE = /^https:\/\/[^\s<>"']+$/;
  function findEvent(id) {
    return D.events.concat(D.pastEvents || []).find(function (e) { return String(e.id) === String(id); }) || null;
  }
  function findGuide(id) { return D.guides.find(function (g) { return String(g.id) === String(id); }) || null; }
  const sw = function (key, label, on) {
    return '<button type="button" class="lm-switch ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + (!!on) + '" data-a="switch" data-k="' + key + '">' + esc(label) + '<i></i></button>';
  };
  const field = function (id, label, input, req) {
    return '<label class="lm-lbl" for="' + id + '">' + esc(label) + (req ? ' <b aria-hidden="true">*</b>' : '') + '</label>' + input;
  };
  const inp = function (id, name, value, attrs) {
    return '<input class="lm-in" id="' + id + '" name="' + name + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '>';
  };

  // ----- 행사 -----
  // 일시 칸(datetime-local) ↔ 서버 timestamptz. 칸은 이 기기 시각(한국)으로 보이고 쓴다
  function localDT(iso) {
    const d = parseTs(iso);
    return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '';
  }
  function dtToIso(v) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null;
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString();
  }
  function eventFormHtml(e) {
    const spot = e && e.spot_id ? spotById(e.spot_id) : null;
    // 신청 일시 칸이 비어 있으면 설명 글에서 읽은 값을 미리 채운다(저장하면 그 값이 칸에 들어간다)
    const guess = e && !e.apply_open_at && !e.apply_close_at ? applyFromText(e) : null;
    if (guess) e = Object.assign({}, e, {
      apply_open_at: guess.open ? guess.open.toISOString() : null,
      apply_close_at: guess.close ? guess.close.toISOString() : null
    });
    return `<h3 id="loungeSheetTitle">${e ? '행사 수정' : '행사 등록'}</h3><p class="lm-ssub">관리자에게만 보이는 화면이에요.</p>
      <form data-form="event" novalidate autocomplete="off">
        ${field('lmEvTitle', '행사 이름', inp('lmEvTitle', 'title', e && e.title, 'maxlength="80" required data-autofocus placeholder="예: 클린 백패킹 페스티벌"'), true)}
        ${field('lmEvSub', '한 줄 소개', inp('lmEvSub', 'subtitle', e && e.subtitle, 'maxlength="80"'))}
        <div class="lm-two"><div>${field('lmEvStart', '시작일', inp('lmEvStart', 'start_date', e && e.start_date, 'type="date" required'), true)}</div>
          <div>${field('lmEvEnd', '끝나는 날', inp('lmEvEnd', 'end_date', e && e.end_date, 'type="date"'))}</div></div>
        ${field('lmEvPlace', '장소', inp('lmEvPlace', 'place', e && e.place, 'maxlength="80" placeholder="직접 쓰거나 등록 박지에서 골라요"'))}
        <div class="lm-sugg" data-sugg hidden></div>
        <div class="lm-picked" data-picked ${spot ? '' : 'hidden'}><span>${spot ? '지도 연결: ' + esc(spotName(spot)) : ''}</span><button type="button" data-a="unpick-spot">연결 해제</button></div>
        <div class="lm-two"><div>${field('lmEvHost', '주최', inp('lmEvHost', 'host', e && e.host, 'maxlength="60"'))}</div>
          <div>${field('lmEvFee', '참가', inp('lmEvFee', 'fee', e && e.fee, 'maxlength="60" placeholder="무료 · 선착순 80팀"'))}</div></div>
        <div class="lm-two"><div>${field('lmEvOpen', '신청 시작', inp('lmEvOpen', 'apply_open_at', e && localDT(e.apply_open_at), 'type="datetime-local"'))}</div>
          <div>${field('lmEvClose', '신청 마감', inp('lmEvClose', 'apply_close_at', e && localDT(e.apply_close_at), 'type="datetime-local"'))}</div></div>
        <p class="lm-hint">${guess ? '설명 글에서 읽어 채웠어요. 틀리면 고쳐 주세요. ' : ''}신청 시작 7일 전부터 마감까지 행사 목록 맨 위에 '몇 월 며칠 몇 시 신청 오픈'으로 크게 떠요. 비워 두면 설명 글('10월 26일 저녁 8시에 오픈', '10월 27일까지')에서 읽어요. 마감을 모르면 '신청 중' 대신 '10월 22일 신청'으로만 떠요. 매진·마감되면 마감 칸에 그 시각을 적어 주세요.</p>
        ${field('lmEvUrl', '신청 링크', inp('lmEvUrl', 'apply_url', e && eventApplyUrl(e), 'type="url" inputmode="url" placeholder="https://"'))}
        ${field('lmEvIg', '인스타 게시물 링크', inp('lmEvIg', 'instagram_url', e && eventIgUrl(e), 'type="url" inputmode="url" maxlength="300" placeholder="https://www.instagram.com/p/…"'))}
        <p class="lm-hint">신청 페이지와 인스타 게시물은 같이 넣을 수 있어요. 인스타는 앱 안에서 열려요.</p>
        <span class="lm-lbl">포스터</span>
        <img class="lm-prev" data-prev alt="포스터 미리보기" ${e && okbmSafeImageUrl(e.poster_url) ? `src="${escapeHtml(okbmSafeImageUrl(e.poster_url))}"` : 'hidden'}>
        <div style="display:flex;gap:18px;align-items:center"><label class="lm-file">${ico(P.img, 18)}<span data-poster-label>${e && e.poster_url ? '다른 사진으로' : '사진 고르기'}</span><input type="file" accept="image/*,.heic,.heif" data-file hidden></label>
          <button type="button" class="lm-file" style="color:var(--sub)" data-a="poster-clear" ${e && e.poster_url ? '' : 'hidden'}>빼기</button></div>
        ${field('lmEvDesc', '설명', '<textarea class="lm-ta" id="lmEvDesc" name="description" maxlength="2000" placeholder="어떤 행사인가요? 준비물·주의할 점도 적어 주세요">' + esc(e && e.description) + '</textarea>')}
        <div style="margin-top:10px">${sw('is_pinned', '홈 맨 위에 고정', e ? e.is_pinned : false)}${sw('is_active', '모두에게 보이기', e ? e.is_active !== false : true)}</div>
        <button type="submit" class="lm-btn main">${e ? '저장' : '등록하기'}</button>
      </form>`;
  }
  function openEventForm(e) {
    if (!D.admin) return;
    openSheet(eventFormHtml(e), {
      kind: 'event', id: e ? e.id : null, spot_id: e && e.spot_id ? e.spot_id : null,
      poster_url: e && e.poster_url ? e.poster_url : '', uploading: false,
      sw: { is_pinned: e ? !!e.is_pinned : false, is_active: e ? e.is_active !== false : true }
    });
  }
  function spotSuggest(qv) {
    const box = sheet && sheet.querySelector('[data-sugg]');
    if (!box) return;
    const needle = String(qv || '').trim().toLowerCase();
    const list = needle ? (Array.isArray(window.registeredSpots) ? window.registeredSpots : []).filter(function (s) {
      return s && s.id != null && spotName(s).toLowerCase().indexOf(needle) !== -1;
    }).slice(0, 6) : [];
    box.hidden = !list.length;
    box.innerHTML = list.map(function (s) {
      return '<button type="button" data-a="pick-spot" data-v="' + esc(s.id) + '"><span>' + esc(spotName(s)) + '</span><small>' + esc(spotRegion(s)) + '</small></button>';
    }).join('');
  }
  function setPickedSpot(s) {
    if (!sheet) return;
    SH.spot_id = s ? String(s.id) : null;
    const box = sheet.querySelector('[data-picked]');
    box.hidden = !s;
    box.querySelector('span').textContent = s ? '지도 연결: ' + spotName(s) : '';
    const sg = sheet.querySelector('[data-sugg]');
    sg.hidden = true; sg.innerHTML = '';
  }
  async function onPosterFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !sheet || SH.kind !== 'event') return;
    const st = SH, s = sheet;
    const label = s.querySelector('[data-poster-label]');
    const prev = s.querySelector('[data-prev]');
    st.uploading = true;
    label.textContent = '올리는 중…';
    try {
      const url = await uploadPhoto(file, 1600);
      if (SH !== st) return; // 그 사이 시트를 닫음
      st.poster_url = url;
      prev.src = okbmSafeImageUrl(url);
      prev.hidden = false;
      s.querySelector('[data-a="poster-clear"]').hidden = false;
    } catch (e) {
      console.warn('[lounge.js:onPosterFile]', e);
      if (SH === st) toast(photoErr(e), true);
    } finally {
      st.uploading = false;
      if (SH === st) label.textContent = st.poster_url ? '다른 사진으로' : '사진 고르기';
    }
  }
  async function saveEvent(f) {
    const st = SH;
    const val = function (n) { return String((f.elements[n] && f.elements[n].value) || '').trim(); };
    let apply = val('apply_url');
    let ig = val('instagram_url');
    if (!ig && instaPost(apply)) { ig = apply; apply = ''; }
    if (apply && ig && apply === ig) apply = '';
    const row = {
      title: val('title'), subtitle: val('subtitle'), start_date: val('start_date'), end_date: val('end_date') || null,
      place: val('place'), spot_id: st.spot_id || null, host: val('host'), fee: val('fee'), apply_url: apply, instagram_url: ig,
      poster_url: st.poster_url || '', description: val('description'), is_pinned: !!st.sw.is_pinned, is_active: !!st.sw.is_active,
      apply_open_at: dtToIso(val('apply_open_at')), apply_close_at: dtToIso(val('apply_close_at'))
    };
    const bad = function (name, msg) { toast(msg, true); if (f.elements[name]) f.elements[name].focus(); };
    if (!row.title) return bad('title', '행사 이름을 적어 주세요');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) return bad('start_date', '시작일을 골라 주세요');
    if (row.end_date && row.end_date < row.start_date) return bad('end_date', '끝나는 날이 시작일보다 빨라요');
    if (val('apply_open_at') && !row.apply_open_at) return bad('apply_open_at', '신청 시작 날짜와 시간을 다시 골라 주세요');
    if (val('apply_close_at') && !row.apply_close_at) return bad('apply_close_at', '신청 마감 날짜와 시간을 다시 골라 주세요');
    if (row.apply_open_at && row.apply_close_at && row.apply_close_at <= row.apply_open_at) return bad('apply_close_at', '신청 마감이 신청 시작보다 빨라요');
    if (row.apply_open_at && !row.apply_close_at && new Date(row.apply_open_at) >= parseD(row.start_date)) return bad('apply_open_at', '신청 시작이 행사 날보다 늦어요. 신청 마감도 같이 적어 주세요');
    if (row.apply_url && !HTTPS_RE.test(row.apply_url)) return bad('apply_url', '신청 링크는 https://로 시작해야 해요');
    if (row.apply_url && instaPost(row.apply_url)) return bad('apply_url', '인스타 게시물 주소는 인스타 칸에 넣어 주세요');
    if (row.instagram_url && !(HTTPS_RE.test(row.instagram_url) && instaPost(row.instagram_url))) return bad('instagram_url', '인스타 게시물 주소만 넣을 수 있어요');
    if (st.uploading) return toast('포스터를 올리는 중이에요. 잠시 뒤 다시 눌러 주세요', true);
    await submitRow(f, 'lounge_events', st.id, row, st.id ? '행사를 고쳤어요' : '행사를 등록했어요');
  }

  // ----- 할인 (본문 + 인스타 + 글 링크) -----
  function findDeal(id) {
    return (D.deals || []).find(function (d) { return String(d.id) === String(id); }) || null;
  }
  function dealFormHtml(d) {
    return `<h3 id="loungeSheetTitle">${d ? '할인 수정' : '할인 등록'}</h3><p class="lm-ssub">관리자에게만 보이는 화면이에요. 본문과 인스타, 글 링크는 같이 넣을 수 있어요.</p>
      <form data-form="deal" novalidate autocomplete="off">
        ${field('lmDlTitle', '제목', inp('lmDlTitle', 'title', d && d.title, 'maxlength="80" required data-autofocus placeholder="예: 코베아 일산직영점 폐점 세일"'), true)}
        ${field('lmDlSum', '한 줄 요약', inp('lmDlSum', 'summary', d && d.summary, 'maxlength="400" placeholder="목록에 보이는 한 줄"'))}
        <div class="lm-two"><div>${field('lmDlStart', '시작일', inp('lmDlStart', 'start_date', d && d.start_date, 'type="date"'))}</div>
          <div>${field('lmDlEnd', '끝나는 날', inp('lmDlEnd', 'end_date', d && d.end_date, 'type="date"'))}</div></div>
        <div class="lm-two"><div>${field('lmDlStartT', '시작 시간', inp('lmDlStartT', 'start_time', d && d.start_time ? String(d.start_time).slice(0, 5) : '', 'type="time"'))}</div>
          <div>${field('lmDlEndT', '끝나는 시간', inp('lmDlEndT', 'end_time', d && d.end_time ? String(d.end_time).slice(0, 5) : '', 'type="time"'))}</div></div>
        <p class="lm-hint">끝나는 날이 없으면, 올린 날부터 14일 뒤에 목록에서 빠져요. 시작 7일 전부터 '곧 오픈'으로 맨 위에 떠요. 시간은 비워도 돼요.</p>
        ${field('lmDlIg', '인스타 게시물 링크', inp('lmDlIg', 'source_url', d && dealIgUrl(d), 'type="url" inputmode="url" maxlength="300" placeholder="https://www.instagram.com/p/…"'))}
        ${field('lmDlLink', '글 링크', inp('lmDlLink', 'link_url', d && dealWebUrl(d), 'type="url" inputmode="url" maxlength="500" placeholder="https:// 블로그·안내 글"'))}
        ${field('lmDlBody', '내용', '<textarea class="lm-ta" id="lmDlBody" name="body" maxlength="2000" placeholder="펼치면 보이는 안내. 비워 두면 한 줄 요약만 보여요.">' + esc(d && d.body) + '</textarea>')}
        ${field('lmDlSort', '순서 (작을수록 위)', inp('lmDlSort', 'sort', d ? d.sort : 0, 'type="number" inputmode="numeric" min="-999" max="999"'))}
        <div style="margin-top:10px">${sw('is_active', '모두에게 보이기', d ? d.is_active !== false : true)}</div>
        <button type="submit" class="lm-btn main">${d ? '저장' : '등록하기'}</button>
      </form>`;
  }
  function openDealForm(d) {
    if (!D.admin) return;
    openSheet(dealFormHtml(d), {
      kind: 'deal', id: d ? d.id : null, posted_on: d && d.posted_on ? d.posted_on : null,
      sw: { is_active: d ? d.is_active !== false : true }
    });
  }
  async function saveDeal(f) {
    const st = SH;
    const val = function (n) { return String((f.elements[n] && f.elements[n].value) || '').trim(); };
    let source = val('source_url');
    let link = val('link_url');
    if (!source && instaPost(link)) { source = link; link = ''; }
    if (source && !instaPost(source) && !link) { link = source; source = ''; }
    if (link && source && link === source) link = '';
    const start = val('start_date') || null;
    const end = val('end_date') || null;
    const startT = /^\d{2}:\d{2}/.test(val('start_time')) ? val('start_time').slice(0, 5) : null;
    const endT = /^\d{2}:\d{2}/.test(val('end_time')) ? val('end_time').slice(0, 5) : null;
    const prev = st.id ? findDeal(st.id) : null;
    const startAt = start ? dealAt(start, startT, false) : null;
    const row = {
      title: val('title'), summary: val('summary'), body: val('body'),
      source_url: source, link_url: link,
      phase: startAt && startAt > Date.now() ? 'upcoming' : 'ongoing',
      start_date: start, end_date: end, start_time: start ? startT : null, end_time: end ? endT : null,
      posted_on: end ? null : ((prev && prev.posted_on) || st.posted_on || todayKey()),
      sort: Math.max(-999, Math.min(999, parseInt(val('sort'), 10) || 0)),
      is_active: !!st.sw.is_active
    };
    const bad = function (name, msg) { toast(msg, true); if (f.elements[name]) f.elements[name].focus(); };
    if (!row.title) return bad('title', '제목을 적어 주세요');
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return bad('start_date', '시작일을 다시 골라 주세요');
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return bad('end_date', '끝나는 날을 다시 골라 주세요');
    if (start && end && end < start) return bad('end_date', '끝나는 날이 시작일보다 빨라요');
    if (startT && !start) return bad('start_date', '시작 시간을 쓰려면 시작일도 골라 주세요');
    if (endT && !end) return bad('end_date', '끝나는 시간을 쓰려면 끝나는 날도 골라 주세요');
    if (start && end && start === end && startT && endT && endT <= startT) return bad('end_time', '끝나는 시간이 시작 시간보다 빨라요');
    if (row.source_url && !(HTTPS_RE.test(row.source_url) && instaPost(row.source_url))) return bad('source_url', '인스타 게시물 주소만 넣을 수 있어요');
    if (row.link_url && !HTTPS_RE.test(row.link_url)) return bad('link_url', '글 링크는 https://로 시작해야 해요');
    if (row.link_url && instaPost(row.link_url)) return bad('link_url', '인스타 주소는 인스타 칸에 넣어 주세요');
    if (!row.summary && !row.body && !row.source_url && !row.link_url) return bad('summary', '요약, 내용, 링크 중 하나는 적어 주세요');
    await submitRow(f, 'lounge_deals', st.id, row, st.id ? '할인을 고쳤어요' : '할인을 등록했어요');
  }

  // ----- 가이드 (입문 장비 kit / 백패킹 팁 tip) -----
  function itemsEditHtml() {
    const items = SH.items || [];
    if (!items.length) return '<p class="lm-hint">아직 담은 장비가 없어요. 아래에서 찾아 담아요.</p>';
    return items.map(function (it, i) {
      const shown = itemName(it) || it.name;
      return `<div class="lm-edit-item"><div class="top"><em>${esc(GEAR_CAT[it.category_id] || '장비')}</em><b>${esc(shown)}</b><em>${((Number(it.weight_g) || 0) / 1000).toFixed(2)}kg</em>
        ${i ? `<button type="button" data-a="item-up" data-v="${i}" aria-label="${esc(shown)} 위로">${ico('<path d="M18 15l-6-6-6 6"/>', 16)}</button>` : ''}
        <button type="button" data-a="item-del" data-v="${i}" aria-label="${esc(shown)} 빼기">${ico(P.x, 16)}</button></div>
        <div class="wrow"><input class="lm-in" data-about="${i}" maxlength="80" value="${esc(it.about || '')}" placeholder="한 줄 설명 (예: 혼자 쓰는 2인용 돔 텐트)" aria-label="${esc(shown)} 한 줄 설명"></div>
        <div class="wrow" style="margin-top:8px"><input class="lm-in" type="url" inputmode="url" data-link="${i}" value="${esc(it.link_url || '')}" placeholder="구매 링크 https://" aria-label="${esc(shown)} 구매 링크"></div>
        <div class="prow"><input class="lm-in" type="number" inputmode="numeric" min="0" max="10000000" data-price="${i}" value="${Number(it.price_krw) || ''}" placeholder="가격 원" aria-label="${esc(shown)} 가격(원)">
        ${it.gear_id ? '' : `<input class="lm-in" type="number" inputmode="numeric" min="0" max="50000" data-w="${i}" value="${Number(it.weight_g) || ''}" placeholder="무게 g" aria-label="${esc(shown)} 무게(g)">`}</div></div>`;
    }).join('');
  }
  function guideFormHtml(g, kind) {
    const kit = kind === 'kit';
    const tp = g && g.kind === 'tip' ? tipParts(g.body) : null;
    const parts = g && g.kind === 'kit'
      ? Object.assign(guideParts(g.body), { source: guideSource(g.body) })
      : { prose: tp ? tp.text : '', channel: '', source: '', shorts: tp ? tp.url : '' };
    const tnote = TIP_NOTES.indexOf(SH.tnote) >= 0 ? SH.tnote : '팁';
    return `<h3 id="loungeSheetTitle">${g ? '가이드 수정' : '가이드 올리기'}</h3><p class="lm-ssub">관리자에게만 보이는 화면이에요.</p>
      <form data-form="guide" novalidate autocomplete="off">
        <div class="lm-chipline" role="radiogroup" aria-label="종류">${[['kit', '입문 장비'], ['tip', '백패킹 팁']].map(function (k) {
          return '<button type="button" role="radio" aria-checked="' + (k[0] === kind) + '" class="' + (k[0] === kind ? 'on' : '') + '" data-a="gkind" data-v="' + k[0] + '">' + k[1] + '</button>';
        }).join('')}</div>
        ${field('lmGdTitle', kit ? '영상·글 제목' : '제목', inp('lmGdTitle', 'title', g && g.title, 'maxlength="80" required data-autofocus placeholder="' + (kit ? '유튜브 제목 그대로' : '예: 겨울 핫팩은 두 장') + '"'), true)}
        <div data-tip ${kit ? 'hidden' : ''}>
          <span class="lm-lbl">구분</span>
          <div class="lm-chipline" role="radiogroup" aria-label="구분">${TIP_NOTES.map(function (n) {
            return '<button type="button" role="radio" aria-checked="' + (n === tnote) + '" class="' + (n === tnote ? 'on' : '') + '" data-a="tnote" data-v="' + n + '">' + n + '</button>';
          }).join('')}</div>
          ${field('lmGdShorts', '쇼츠 주소 (선택)', inp('lmGdShorts', 'shorts', parts.shorts, 'type="url" inputmode="url" maxlength="300" placeholder="https://youtube.com/shorts/…"'))}
        </div>
        <div data-kit ${kit ? '' : 'hidden'}>
          ${field('lmGdNote', '채널 이름', inp('lmGdNote', 'note', g && g.note, 'maxlength="80" placeholder="예: 캠핑 즐기는 남자 캠퍼조이"'))}
          ${field('lmGdSource', '유튜브·블로그 주소', inp('lmGdSource', 'source', parts.source, 'type="url" inputmode="url" maxlength="500" placeholder="https://"'))}
          <span class="lm-lbl">장비 <span data-count>${(SH.items || []).length}</span>/${KIT_MAX}</span>
          <div data-items>${itemsEditHtml()}</div>
          <input class="lm-in" data-gear-q aria-label="장비 이름으로 찾기" placeholder="+ 장비 이름으로 찾기" style="margin-top:6px">
          <div class="lm-sugg" data-gear-sugg hidden></div>
        </div>
        ${field('lmGdBody', kit ? '본문' : '내용', '<textarea class="lm-ta" id="lmGdBody" name="body" maxlength="' + BODY_MAX + '" placeholder="' + (kit ? '진행자가 한 말과 팁을 초보에게 건네듯' : '초보가 바로 따라 할 수 있게') + '">' + esc(parts.prose) + '</textarea>', !kit)}
        <div data-kit ${kit ? '' : 'hidden'}>
          ${field('lmGdChannel', '채널 소개', '<textarea class="lm-ta" id="lmGdChannel" name="channel" maxlength="600" placeholder="채널에 있는 사실만 두세 문장">' + esc(parts.channel) + '</textarea>')}
        </div>
        ${field('lmGdSort', '순서 (작을수록 위)', inp('lmGdSort', 'sort', g ? g.sort : 0, 'type="number" inputmode="numeric" min="-999" max="999"'))}
        <div style="margin-top:10px">${sw('is_active', '모두에게 보이기', g ? g.is_active !== false : true)}</div>
        <button type="submit" class="lm-btn main">${g ? '저장' : '올리기'}</button>
      </form>`;
  }
  function openGuideForm(g, kind) {
    if (!D.admin) return;
    kind = g ? g.kind : (kind === 'tip' ? 'tip' : 'kit');
    const st = {
      kind: 'guide', id: g ? g.id : null, gkind: kind,
      tnote: g && TIP_NOTES.indexOf(g.note) >= 0 ? g.note : '팁',
      items: g ? kitItems(g).map(function (it) {
        const price = itemPrice(it);
        return Object.assign({}, it, { price_krw: price, name: price ? stripPriceName(it.name) : it.name });
      }) : [],
      sw: { is_active: g ? g.is_active !== false : true }
    };
    const prev = SH;
    SH = st; // itemsEditHtml이 SH를 읽는다
    const html = guideFormHtml(g, kind);
    SH = prev; // 열려 있던 시트는 openSheet가 제대로 닫게 둔다
    openSheet(html, st);
  }
  function refreshItems() {
    if (!sheet || SH.kind !== 'guide') return;
    sheet.querySelector('[data-items]').innerHTML = itemsEditHtml();
    sheet.querySelector('[data-count]').textContent = String(SH.items.length);
  }
  let gearPromise = null;
  function ensureGears() {
    if (Array.isArray(window.GEARS_MASTER) && window.GEARS_MASTER.length > 500) return Promise.resolve(window.GEARS_MASTER);
    if (gearPromise) return gearPromise;
    const ensurePlan = typeof window.okbmEnsurePlan === 'function' ? window.okbmEnsurePlan() : Promise.resolve();
    gearPromise = Promise.resolve(ensurePlan).then(function () {
      return typeof window.ensureAllGearCategoriesLoaded === 'function' ? window.ensureAllGearCategoriesLoaded() : null;
    }).then(function () { return Array.isArray(window.GEARS_MASTER) ? window.GEARS_MASTER : []; })
      .catch(function (e) { console.warn('[lounge.js:ensureGears]', e); gearPromise = null; return Array.isArray(window.GEARS_MASTER) ? window.GEARS_MASTER : []; });
    return gearPromise;
  }
  function gearSuggest(qv) {
    const box = sheet && sheet.querySelector('[data-gear-sugg]');
    if (!box) return;
    const words = String(qv || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) { box.hidden = true; box.innerHTML = ''; return; }
    const st = SH;
    box.hidden = false;
    if (!(Array.isArray(window.GEARS_MASTER) && window.GEARS_MASTER.length)) box.innerHTML = '<button type="button" disabled><span>장비 목록을 불러오는 중…</span></button>';
    ensureGears().then(function (all) {
      if (SH !== st || !sheet) return;
      const cur = String((sheet.querySelector('[data-gear-q]') || {}).value || '').trim();
      if (cur.toLowerCase().split(/\s+/).filter(Boolean).join(' ') !== words.join(' ')) return; // 그 사이 검색어가 바뀜
      const hits = [];
      for (let i = 0; i < all.length && hits.length < 12; i++) {
        const g = all[i];
        if (!g || !g.item_name) continue;
        const hay = (String(g.item_name) + ' ' + String(g.brand || '')).toLowerCase();
        if (words.every(function (w) { return hay.indexOf(w) !== -1; })) hits.push(g);
      }
      box.innerHTML = hits.map(function (g) {
        return '<button type="button" data-a="gear-add" data-v="' + esc(g.id) + '"><span>' + esc(g.item_name) + '</span><small>' + esc((GEAR_CAT[g.category_id] || '') + ' · ' + ((Number(g.weight_g) || 0) / 1000).toFixed(2) + 'kg') + '</small></button>';
      }).join('') + '<button type="button" data-a="gear-custom"><span>직접 추가: ' + esc(cur) + '</span><small>목록에 없을 때</small></button>';
    });
  }
  function addItem(it) {
    if (!sheet || SH.kind !== 'guide') return;
    if (SH.items.length >= KIT_MAX) { toast('장비는 ' + KIT_MAX + '개까지 담을 수 있어요', true); return; }
    SH.items.push(it);
    refreshItems();
    const qi = sheet.querySelector('[data-gear-q]');
    qi.value = '';
    gearSuggest('');
    qi.focus({ preventScroll: true });
    tick();
  }
  async function saveGuide(f) {
    const st = SH;
    const val = function (n) { return String((f.elements[n] && f.elements[n].value) || '').trim(); };
    const kit = st.gkind === 'kit';
    const items = kit ? st.items.map(function (it) {
      const price = Math.max(0, Math.min(10000000, Math.round(Number(it.price_krw) || 0)));
      return {
        gear_id: String(it.gear_id || ''), category_id: String(it.category_id || 'other'),
        name: String(it.name || '').trim().slice(0, 120),
        weight_g: Math.max(0, Math.min(50000, Math.round(Number(it.weight_g) || 0))),
        price_krw: price, link_url: String(it.link_url || '').trim(),
        about: String(it.about || '').trim().slice(0, 80)
      };
    }).filter(function (it) { return it.name; }) : [];
    const source = kit ? val('source') : '';
    const shorts = kit ? '' : val('shorts');
    const body = kit ? joinGuideBody(val('body'), source, val('channel')) : [val('body'), shorts].filter(Boolean).join('\n');
    const row = {
      kind: st.gkind, title: val('title'), note: kit ? val('note') : (TIP_NOTES.indexOf(st.tnote) >= 0 ? st.tnote : '팁'),
      body: body, items: items,
      sort: Math.max(-999, Math.min(999, parseInt(val('sort'), 10) || 0)), is_active: !!st.sw.is_active
    };
    const bad = function (name, msg) { toast(msg, true); if (name && f.elements[name]) f.elements[name].focus(); };
    if (!row.title) return bad('title', kit ? '영상·글 제목을 적어 주세요' : '제목을 적어 주세요');
    if (!kit && !val('body')) return bad('body', '내용을 적어 주세요');
    if (shorts && !(HTTPS_RE.test(shorts) && youtubeId(shorts))) return bad('shorts', '쇼츠 주소는 https://로 시작하는 유튜브 주소여야 해요');
    if (source && !HTTPS_RE.test(source)) return bad('source', '주소는 https://로 시작해야 해요');
    if (row.body.length > BODY_MAX) return bad('body', '본문이 너무 길어요');
    if (items.length > KIT_MAX) return bad('', '장비는 ' + KIT_MAX + '개까지 담을 수 있어요');
    const badLink = items.find(function (it) { return it.link_url && !HTTPS_RE.test(it.link_url); });
    if (badLink) return bad('', badLink.name + ' 링크는 https://로 시작해야 해요');
    await submitRow(f, 'lounge_guides', st.id, row, st.id ? '가이드를 고쳤어요' : '가이드를 올렸어요');
  }

  // ----- 저장·고정·숨김·삭제 공통 -----
  async function reloadAdminData(table) {
    try {
      if (table === 'lounge_events') {
        await loadEvents();
        if (D.pastEvents !== null) await loadPastEvents();
        D.fail[0] = false;
      } else if (table === 'lounge_guides') {
        await loadGuides();
        D.fail[1] = false;
      } else if (table === 'lounge_deals') {
        await loadDeals();
        D.fail[4] = false;
      } else if (table === 'lounge_news') {
        await loadNews();
        D.fail[5] = false;
      }
    } catch (e) { console.warn('[lounge.js:reloadAdminData]', e); }
    renderAll();
  }
  async function submitRow(f, table, id, row, okMsg) {
    const c = sb();
    const btn = f.querySelector('[type="submit"]');
    if (!c || !D.admin) { toast('관리자만 저장할 수 있어요', true); return; }
    if (btn) btn.disabled = true;
    try {
      const rows = await q(id ? c.from(table).update(row).eq('id', id).select('id') : c.from(table).insert([row]).select('id'));
      if (!Array.isArray(rows) || !rows.length) throw new Error('no_rows'); // RLS가 막으면 오류 없이 0행
      closeSheet();
      toast(okMsg);
      await reloadAdminData(table);
    } catch (e) {
      console.warn('[lounge.js:submitRow]', e);
      toast('저장하지 못했어요. 관리자 로그인과 입력을 확인해 주세요', true);
      if (btn && btn.isConnected) btn.disabled = false;
    }
  }
  async function patchRow(table, id, patch, okMsg) {
    const c = sb();
    if (!c || !D.admin) return;
    try {
      const rows = await q(c.from(table).update(patch).eq('id', id).select('id'));
      if (!Array.isArray(rows) || !rows.length) throw new Error('no_rows');
      toast(okMsg);
      await reloadAdminData(table);
    } catch (e) {
      console.warn('[lounge.js:patchRow]', e);
      toast('바꾸지 못했어요. 관리자 로그인을 확인해 주세요', true);
    }
  }
  async function deleteRow(table, id, title) {
    const ok = await confirmSheet(title || '삭제할까요?', '지우면 되돌릴 수 없어요.', '삭제');
    if (!ok) return false;
    closeSheet(true);
    if (typeof window.okbmDeleteRowsConfirmed !== 'function') { toast('삭제 기능을 불러오지 못했어요', true); return false; }
    const r = await window.okbmDeleteRowsConfirmed(table, id);
    if (!r || !r.ok) {
      toast(r && r.error === 'login_required' ? '다시 로그인해 주세요' : '삭제하지 못했어요. 권한을 확인해 주세요', true);
      return false;
    }
    toast('삭제했어요');
    return true;
  }
  // 행사 삭제: 서버 함수(lounge-admin-delete)가 행을 지우고, 우리 R2에 올린 포스터도 지운다.
  // Worker 삭제 비밀값은 서버에만 있어서 브라우저에서는 사진을 못 지운다. 외부 링크 포스터는 그대로 둔다.
  async function deleteEvent(id) {
    const ok = await confirmSheet('이 행사를 삭제할까요?', '지우면 되돌릴 수 없어요. 직접 올린 포스터 사진도 같이 지워져요.', '삭제');
    if (!ok) return;
    closeSheet(true);
    try {
      if (typeof window.okbmInvokeFunction !== 'function') throw new Error('no_invoke');
      const r = await window.okbmInvokeFunction('lounge-admin-delete', { kind: 'event', id: String(id) });
      toast(r && r.poster === 'failed' ? '행사를 삭제했어요. 포스터 사진은 지우지 못했어요' : '행사를 삭제했어요');
    } catch (e) {
      const st = e && e.status, code = e && e.body && e.body.error;
      if (st === 404 && code === 'not_found') {
        toast('이미 지워진 행사예요');
      } else if (st === 404) {
        // 함수가 아직 배포 전이면 예전처럼 행만 지운다(포스터 사진은 남음)
        console.warn('[lounge.js:deleteEvent] lounge-admin-delete 없음, 행만 삭제');
        const r2 = typeof window.okbmDeleteRowsConfirmed === 'function' ? await window.okbmDeleteRowsConfirmed('lounge_events', id) : null;
        if (!r2 || !r2.ok) { toast('삭제하지 못했어요. 권한을 확인해 주세요', true); return; }
        toast('행사를 삭제했어요');
      } else {
        console.warn('[lounge.js:deleteEvent]', e);
        toast(st === 401 ? '다시 로그인해 주세요' : (st === 403 ? '관리자만 지울 수 있어요' : '삭제하지 못했어요. 잠시 뒤 다시 해 주세요'), true);
        return;
      }
    }
    await reloadAdminData('lounge_events');
  }

  // =====================================================================
  // 회원 쓰기 (P4): 글·사진·댓글·좋아요·박지 후기. 권한은 RLS, 닉네임·개수는 서버 트리거가 채운다
  // =====================================================================
  const POST_CATS = [['backpacking', '백패킹이야기'], ['poll', '설문·투표'], ['suggestion', '건의']];
  const POLL_ENDS = [['1', '1일'], ['3', '3일'], ['7', '7일'], ['0', '마감 없음']];

  // ----- 글 쓰기·고치기 -----
  function thumbsHtml() {
    const list = SH.photos || [];
    return list.map(function (ph, i) {
      if (ph.uploading) return '<div class="lm-thumb" aria-label="사진 올리는 중">올리는 중…</div>';
      return `<div class="lm-thumb"><img src="${escapeHtml(okbmSafeImageUrl(ph.url))}" alt="" decoding="async"><button type="button" data-a="photo-del" data-v="${i}" aria-label="사진 ${i + 1} 빼기">${ico(P.x, 14)}</button></div>`;
    }).join('');
  }
  // 투표 보기 칸 (2~5개). 3번째부터 뺄 수 있다
  function pollOptHtml(i, value) {
    return `<div class="lm-popt-in">${inp('lmPollOpt' + i, 'opt', value, 'maxlength="40" placeholder="보기 ' + (i + 1) + '"')}${i >= 2 ? `<button type="button" data-a="poll-del" aria-label="보기 ${i + 1} 빼기">${ico(P.x, 16)}</button>` : ''}</div>`;
  }
  function pollFieldsHtml(p, cat) {
    if (p) return p.category === 'poll' ? '<p class="lm-hint">보기와 마감은 올린 뒤에 바꿀 수 없어요.</p>' : '';
    return `<div data-poll-fields ${cat === 'poll' ? '' : 'hidden'}>
        <span class="lm-lbl">보기 <b aria-hidden="true">*</b> <span style="font-weight:600">2~5개</span></span>
        <div data-popts>${pollOptHtml(0, '')}${pollOptHtml(1, '')}</div>
        <button type="button" class="lm-file" data-a="poll-add">${ico(P.plus, 18)}<span>보기 추가</span></button>
        <span class="lm-lbl">마감</span>
        <div class="lm-chipline" role="radiogroup" aria-label="마감">${POLL_ENDS.map(function (d) {
          const on = d[0] === '7';
          return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-a="poll-end" data-v="' + d[0] + '">' + esc(d[1]) + '</button>';
        }).join('')}</div>
        <p class="lm-hint">한 사람이 하나를 골라요. 마감 전엔 바꿀 수 있고, 결과는 고른 뒤에 보여요. 누가 뭘 골랐는지는 안 보여요.</p>
      </div>`;
  }
  function postFormHtml(p, cat) {
    const poll = cat === 'poll';
    return `<h3 id="loungeSheetTitle">${p ? '글 고치기' : '새 글'}</h3>
      <form data-form="post" novalidate autocomplete="off">
        <div class="lm-chipline" role="radiogroup" aria-label="분류">${POST_CATS.map(function (c) {
          const on = c[0] === cat;
          return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-a="pcat" data-v="' + c[0] + '"' + (p ? ' disabled' : '') + '>' + (c[0] === 'suggestion' ? ico(P.lock, 13) + ' ' : '') + esc(c[1]) + '</button>';
        }).join('')}</div>
        <p class="lm-hint" data-private-note ${cat === 'suggestion' ? '' : 'hidden'}>건의는 나와 운영팀만 볼 수 있어요. 답변이 달리면 알림으로 알려 드려요.</p>
        ${p ? '<p class="lm-hint">분류는 올린 뒤에 바꿀 수 없어요.</p>' : ''}
        <label class="lm-lbl" for="lmPostTitle"><span data-title-lbl>${poll ? '질문' : '제목'}</span> <b aria-hidden="true">*</b></label>${inp('lmPostTitle', 'title', p && p.title, 'maxlength="80" required data-autofocus placeholder="' + (poll ? '무엇을 물어볼까요?' : '제목') + '"')}
        ${pollFieldsHtml(p, cat)}
        ${field('lmPostBody', poll ? '설명 (선택)' : '내용', '<textarea class="lm-ta" id="lmPostBody" name="body" maxlength="3000" placeholder="' + (poll ? '덧붙일 말이 있으면 적어요' : '어떤 이야기를 나눌까요?') + '" style="min-height:' + (poll ? 72 : 140) + 'px">' + esc(p && p.body) + '</textarea>')}
        <span class="lm-lbl">사진 <span data-pcount>${(SH.photos || []).length}</span>/5</span>
        <div class="lm-thumbs" data-thumbs>${thumbsHtml()}</div>
        <label class="lm-file">${ico(P.img, 18)}<span>사진 추가</span><input type="file" accept="image/*,.heic,.heif" multiple data-post-files hidden></label>
        <button type="submit" class="lm-btn main">${p ? '저장' : '올리기'}</button>
      </form>`;
  }
  function openPostForm(p, cat0) {
    if (needLogin('로그인하면 글을 쓸 수 있어요')) return;
    if (p && !isMine(p.user_id)) return;
    const cat = p ? p.category : (cat0 || (S.cat !== 'all' ? S.cat : 'backpacking'));
    const st = { kind: 'post', id: p ? p.id : null, cat: cat, pollDays: 7, photos: postPhotos(p || {}).map(function (u) { return { url: u }; }) };
    const prev = SH;
    SH = st; // thumbsHtml이 SH를 읽는다
    const html = postFormHtml(p, cat);
    SH = prev;
    openSheet(html, st);
  }
  const PHOTO_MAX = { post: 5, news: 10 };
  function refreshThumbs() {
    if (!sheet || !PHOTO_MAX[SH.kind]) return;
    sheet.querySelector('[data-thumbs]').innerHTML = thumbsHtml();
    sheet.querySelector('[data-pcount]').textContent = String(SH.photos.length);
  }
  async function onPostFiles(input) {
    const files = Array.prototype.slice.call(input.files || []);
    input.value = '';
    if (!files.length || !sheet || !PHOTO_MAX[SH.kind]) return;
    const st = SH;
    const max = PHOTO_MAX[st.kind];
    const room = max - st.photos.length;
    if (room <= 0) { toast('사진은 ' + max + '장까지 올릴 수 있어요', true); return; }
    if (files.length > room) toast('사진은 ' + max + '장까지라서 ' + room + '장만 올려요');
    const jobs = files.slice(0, room).map(function (f) {
      const ph = { uploading: true };
      st.photos.push(ph);
      return uploadPhoto(f, 1600).then(function (url) { ph.url = url; ph.uploading = false; }, function (e) {
        console.warn('[lounge.js:onPostFiles]', e);
        st.photos.splice(st.photos.indexOf(ph), 1);
        if (SH === st) toast(photoErr(e), true);
      });
    });
    refreshThumbs();
    jobs.forEach(function (j) { j.then(function () { if (SH === st) refreshThumbs(); }); });
  }
  async function savePost(f) {
    const st = SH;
    const c = sb(), me = myId();
    const val = function (n) { return String((f.elements[n] && f.elements[n].value) || '').trim(); };
    if (!c || !me) { needLogin(); return; }
    const title = val('title'), body = val('body');
    if (!title) { toast('제목을 적어 주세요', true); f.elements.title.focus(); return; }
    if (st.photos.some(function (ph) { return ph.uploading; })) { toast('사진을 올리는 중이에요. 잠시 뒤 다시 눌러 주세요', true); return; }
    const photos = st.photos.map(function (ph) { return ph.url; }).filter(function (u) { return okbmSafeImageUrl(u); }).slice(0, 5);
    const row0 = { user_id: me, category: st.cat, title: title, body: body, photos: photos };
    if (!st.id && st.cat === 'poll') {
      const opts = Array.prototype.map.call(f.querySelectorAll('[name="opt"]'), function (el) { return String(el.value || '').trim(); }).filter(Boolean);
      if (opts.length < 2) { toast('보기를 2개 이상 적어 주세요', true); return; }
      if (new Set(opts).size !== opts.length) { toast('같은 보기가 있어요', true); return; }
      row0.poll_options = opts;
      row0.poll_ends_at = st.pollDays ? new Date(Date.now() + st.pollDays * 86400000).toISOString() : null;
    }
    const btn = f.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      const rows = await q(st.id
        ? c.from('lounge_posts').update({ title: title, body: body, photos: photos }).eq('id', st.id).select(POST_COLS)
        : c.from('lounge_posts').insert([row0]).select(POST_COLS));
      const row = Array.isArray(rows) && rows[0];
      if (!row) throw new Error('no_rows');
      if (st.id) {
        forEachPost(row.id, function (p) { Object.assign(p, row); });
      } else {
        ['all', row.category].forEach(function (k) { if (postsBy[k]) postsBy[k].rows.unshift(Object.assign({}, row)); });
        if (!postsBy.all) postsBy.all = { rows: [row], done: true, loading: false };
        D.comments[row.id] = [];
        D.likeChecked.add(row.id);
        if (row.category === 'poll') D.poll[row.id] = { post_id: row.id, total: 0, counts: null, mine: null, closed: false };
      }
      closeSheet();
      toast(st.id ? '글을 고쳤어요' : (row.category === 'suggestion' ? '건의를 보냈어요. 답변이 달리면 알려 드릴게요' : row.category === 'poll' ? '설문을 올렸어요' : '글을 올렸어요'));
      if (!st.id && S.cat !== 'all' && S.cat !== row.category) S.cat = 'all';
      renderBoard();
      if (win && !st.id) {
        winTo(2);
        const posted = paneByTab(2);
        if (posted) posted.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    } catch (e) {
      console.warn('[lounge.js:savePost]', e);
      toast(writeErr(e), true);
      if (btn.isConnected) btn.disabled = false;
    }
  }

  // ----- 댓글 -----
  async function saveComment(f) {
    if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_board_comment'); // 기능 사용 세기 (H8)
    const pid = f.dataset.post;
    const input = f.elements.body;
    const body = String(input.value || '').trim();
    const c = sb(), me = myId();
    if (!body) { input.focus(); return; }
    if (!c || !me) { needLogin(); return; }
    const btn = f.querySelector('button');
    btn.disabled = true;
    try {
      const rows = await q(c.from('lounge_post_comments').insert([{ post_id: pid, user_id: me, body: body.slice(0, 500) }])
        .select('id,post_id,user_id,nickname,body,created_at'));
      const row = Array.isArray(rows) && rows[0];
      if (!row) throw new Error('no_rows');
      (D.comments[pid] || (D.comments[pid] = [])).push(row);
      forEachPost(pid, function (p) { p.comments_count = (Number(p.comments_count) || 0) + 1; });
      input.value = '';
      tick();
      renderBoard();
      // 다시 그린 뒤 새 입력칸에 포커스를 돌려준다(이어서 쓰기)
      const nf = win && findLmx(paneByTab(2), pid);
      const ni = nf && nf.querySelector('form[data-form="comment"] input');
      if (ni) ni.focus({ preventScroll: true });
    } catch (e) {
      console.warn('[lounge.js:saveComment]', e);
      toast(writeErr(e, '댓글을 달지 못했어요'), true);
      if (btn.isConnected) btn.disabled = false;
    }
  }
  async function deleteComment(cid, pid) {
    const ok = await deleteRow('lounge_post_comments', cid, '이 댓글을 삭제할까요?');
    if (!ok) return;
    if (D.comments[pid]) D.comments[pid] = D.comments[pid].filter(function (x) { return String(x.id) !== String(cid); });
    forEachPost(pid, function (p) { p.comments_count = Math.max(0, (Number(p.comments_count) || 0) - 1); });
    renderBoard();
  }

  // ----- 좋아요 (먼저 바꿔 보이고, 실패하면 되돌린다) -----
  const likeBusy = new Set();
  function paintLike(id) {
    const p = findPost(id);
    if (!p || !layer) return;
    layer.querySelectorAll('[data-a="like"]').forEach(function (b) { if (b.dataset.v === String(id)) b.outerHTML = likeBtn(p); });
  }
  async function toggleLike(id) {
    if (needLogin('로그인하면 좋아요를 누를 수 있어요')) return;
    const p = findPost(id);
    const c = sb(), me = myId();
    if (!p || p.is_private || !c || likeBusy.has(id)) return;
    likeBusy.add(id);
    const was = D.liked.has(id);
    const step = was ? -1 : 1;
    if (was) D.liked.delete(id); else D.liked.add(id);
    forEachPost(id, function (x) { x.likes_count = Math.max(0, (Number(x.likes_count) || 0) + step); });
    paintLike(id);
    tick();
    try {
      const res = was
        ? await c.from('lounge_post_likes').delete().eq('post_id', id).eq('user_id', me)
        : await c.from('lounge_post_likes').insert([{ post_id: id, user_id: me }]);
      if (res.error && !(res.error.code === '23505')) throw res.error; // 이미 누른 상태면 그대로 둔다
    } catch (e) {
      console.warn('[lounge.js:toggleLike]', e);
      if (was) D.liked.add(id); else D.liked.delete(id);
      forEachPost(id, function (x) { x.likes_count = Math.max(0, (Number(x.likes_count) || 0) - step); });
      paintLike(id);
      toast(writeErr(e, '좋아요를 바꾸지 못했어요'), true);
    } finally {
      likeBusy.delete(id);
    }
  }

  // ----- 박지 후기 (comments: 1인 1박지, 별점 필수, 글 선택) -----
  function reviewFormHtml(s, mine) {
    const name = spotName(s) || '이 박지';
    const star = mine ? Number(mine.rating) || 0 : 0;
    return `<h3 id="loungeSheetTitle">${esc(name)}${josa(name, '은', '는')} 어땠나요?</h3>
      ${spotRegion(s) ? `<p class="lm-ssub">${esc(spotRegion(s))}</p>` : ''}
      <form data-form="review" novalidate autocomplete="off">
        <div class="lm-bigstars" role="radiogroup" aria-label="별점">${[1, 2, 3, 4, 5].map(function (n) {
          return '<button type="button" role="radio" aria-checked="' + (n === star) + '" class="' + (n <= star ? 'on' : '') + '" data-a="star" data-v="' + n + '" aria-label="' + n + '점">★</button>';
        }).join('')}</div>
        <div class="lm-slabel" data-star-label>${STAR_LABEL[star]}</div>
        <label class="lm-lbl" for="lmRevText">후기 (선택)</label>
        <textarea class="lm-ta" id="lmRevText" name="text" maxlength="1000" placeholder="바람, 데크 자리, 물·화장실, 주의할 점을 적어 주세요">${esc(mine && mine.text)}</textarea>
        <p class="lm-hint">한 박지에 후기는 하나예요. 다시 쓰면 기존 후기가 바뀌어요. 후기 글은 회원에게만 보여요.</p>
        <button type="submit" class="lm-btn main" ${star ? '' : 'disabled'}>${mine ? '후기 고치기' : '후기 남기기'}</button>
        ${mine ? '<button type="button" class="lm-btn" data-a="review-del" style="margin-top:10px;background:none;color:#ff6b6b">후기 지우기</button>' : ''}
      </form>`;
  }
  async function openReviewSheet(spotId) {
    const sid = String(spotId || '').trim();
    if (!sid || needLogin('로그인하면 후기를 남길 수 있어요')) return;
    ensureLayer();
    const s = spotById(sid) || { id: sid };
    let mine = null;
    try {
      await whenClient();
      const R = await loadSpotReviews(sid, false); // "내 후기"를 새로 받는다
      mine = R.mine || null;
    } catch (e) {
      console.warn('[lounge.js:openReviewSheet]', e);
      toast('후기를 불러오지 못했어요. 잠시 뒤 다시 해 주세요', true);
      return;
    }
    openSheet(reviewFormHtml(s, mine), { kind: 'review', spot_id: sid, mine: mine, star: mine ? Number(mine.rating) || 0 : 0 });
  }
  function setStar(n) {
    if (!sheet || SH.kind !== 'review') return;
    SH.star = n;
    sheet.querySelectorAll('.lm-bigstars button').forEach(function (b, i) {
      b.classList.toggle('on', i < n);
      b.setAttribute('aria-checked', String(i + 1 === n));
    });
    sheet.querySelector('[data-star-label]').textContent = STAR_LABEL[n];
    sheet.querySelector('[type="submit"]').disabled = false;
    tick();
  }
  // 후기가 바뀌면 지도 정보창(romantic-sync.js)·라운지 순위·최근 후기를 새로 받는다
  function afterReviewChange(sid) {
    if (typeof window.okbmLoadSpotReviewBox === 'function') {
      try { window.okbmLoadSpotReviewBox({ id: sid }, true); } catch (e) { console.warn('[lounge.js:afterReviewChange]', e); }
    }
    D.recent = null;
    D.tipsRecent = null;
    const jobs = [loadTop().catch(function () {})];
    if (S.revSpot === sid) jobs.push(loadSpotReviews(sid, false).catch(function () {}));
    Promise.all(jobs).then(function () { renderAll(); if (win) ensureRecent(); });
  }
  async function saveReview(f) {
    const st = SH;
    const c = sb(), me = myId();
    if (!c || !me) { needLogin(); return; }
    if (!(st.star >= 1 && st.star <= 5)) { toast('별점을 골라 주세요', true); return; }
    const text = String(f.elements.text.value || '').trim().slice(0, 1000);
    const btn = f.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      let res;
      if (st.mine && st.mine.id != null) {
        res = await c.from('comments').update({ rating: st.star, text: text }).eq('id', st.mine.id).select('id');
      } else {
        res = await c.from('comments').insert([{ spot_id: st.spot_id, user_id: me, rating: st.star, text: text }]).select('id');
        if (res.error && res.error.code === '23505') {
          // 다른 기기에서 먼저 남긴 후기가 있으면 그것을 고친다
          res = await c.from('comments').update({ rating: st.star, text: text }).eq('spot_id', st.spot_id).eq('user_id', me).select('id');
        }
      }
      if (res.error) throw res.error;
      if (!Array.isArray(res.data) || !res.data.length) throw new Error('no_rows');
      closeSheet();
      toast(st.mine ? '후기를 고쳤어요' : '후기를 남겼어요. 고마워요');
      afterReviewChange(st.spot_id);
    } catch (e) {
      console.warn('[lounge.js:saveReview]', e);
      toast(writeErr(e, '후기를 저장하지 못했어요'), true);
      if (btn.isConnected) btn.disabled = false;
    }
  }
  async function deleteReview(id, sid, title) {
    const ok = await deleteRow('comments', id, title || '후기를 지울까요?');
    if (ok) afterReviewChange(sid);
  }
  // 후기 탭을 박지 하나로 좁혀 연다 (지도 정보창 "후기 모두 보기", 창의 평점 높은 박지)
  function showSpotReviews(spotId) {
    const sid = String(spotId || '').trim();
    if (!sid) return;
    S.revSpot = sid;
    if (!(D.spotRev && D.spotRev.spot_id === sid)) D.spotRev = null;
    if (!win) openLoungeWindow(3, null, null); else { winTo(3); rerenderPane(3); }
    const revPane = paneByTab(3);
    if (revPane) revPane.scrollTop = 0;
    whenClient().then(function () { return loadSpotReviews(sid, false); }).catch(function (e) {
      console.warn('[lounge.js:showSpotReviews]', e);
      if (S.revSpot === sid) D.spotRev = { spot_id: sid, error: true };
    }).then(function () { if (S.revSpot === sid) rerenderPane(3); });
  }

  // ----- 신고·차단 (romantic-sync.js 재사용. 결과 토스트는 라운지 층 위에 다시 보여 준다) -----
  function openUgc(t) {
    const type = t.dataset.type, id = t.dataset.v, uid = t.dataset.uid, nick = t.dataset.nick;
    if (typeof window.openUgcSafetyMenu !== 'function') { toast('신고 기능을 불러오지 못했어요', true); return; }
    if (type !== 'feed' && typeof window.isFeedReported === 'function' && window.isFeedReported(id)) { toast('이미 신고했어요. 운영팀이 확인하고 있어요'); return; }
    window.openUgcSafetyMenu(id, uid, nick, null, type);
  }
  function onUgcResult(e) {
    if (!win && !sheet) return; // 라운지가 안 열려 있으면 기존 토스트로 충분
    const d = (e && e.detail) || {};
    if (d.reason === 'login') { toast('다시 로그인해 주세요', true); return; }
    if (e.type === 'okbm_ugc_blocked') toast(d.ok ? '차단했어요. 이 사람의 글과 댓글이 안 보여요' : '차단하지 못했어요. 잠시 뒤 다시 해 주세요', !d.ok);
    else toast(d.ok ? '신고했어요. 24시간 안에 확인할게요' : '신고하지 못했어요. 잠시 뒤 다시 해 주세요', !d.ok);
  }

  // ----- 달력·패킹 (P5) -----
  // 고른 뒤 잠깐 결과를 보여 주고 접는다
  function afterCalChange(id) {
    const e = findEvent(id);
    if (!e) return;
    repaintSlot('[data-cal-slot]', id, calSlotInner(e));
    setTimeout(function () {
      [home, layer].forEach(function (root) {
        if (!root) return;
        root.querySelectorAll('.lmx.cal').forEach(function (n) { if (n.dataset.id === String(id)) n.classList.remove('cal'); });
      });
    }, 700);
  }
  function calMark(id) {
    const e = findEvent(id);
    if (!e) return;
    if (typeof window.okbmSetPlanEvent !== 'function') { toast('달력 기능을 불러오지 못했어요', true); return; }
    const st = calState(e);
    const spot = e.spot_id ? spotById(e.spot_id) : null;
    const ok = st.marked
      ? window.okbmSetPlanEvent({ id: e.id }, false)
      : window.okbmSetPlanEvent({ id: e.id, title: e.title, start: e.start_date, end: e.end_date, place: String(e.place || '').trim() || spotName(spot), spotId: e.spot_id || '' });
    if (!ok) { toast('달력에 넣지 못했어요', true); return; }
    tick();
    toast(st.marked ? '달력에서 뺐어요' : evView(e).dateText + ' 행사로 표시했어요');
    afterCalChange(e.id);
  }
  // 이날 내 일정: 낭만플랜의 날짜별 목적지와 같은 곳에 넣는다(그날 원정대 공고가 있으면 romantic-plan.js가 확인 후 교체)
  async function calPlan(id, btn) {
    const e = findEvent(id);
    if (!e) return;
    if (calState(e).planned) { toast('이미 내 일정에 있어요. 바꾸려면 달력에서 해요'); return; }
    const date = planDateOf(e);
    if (!date) { toast('끝난 행사라 등록할 수 없어요', true); return; }
    if (btn) btn.disabled = true;
    try {
      if (typeof window.okbmEnsurePlan === 'function') await window.okbmEnsurePlan();
      if (typeof window.okbmSetSinglePlanSpotForDate !== 'function') throw new Error('no_plan');
      const spot = e.spot_id ? spotById(e.spot_id) : null;
      const name = (spot ? spotName(spot) : String(e.title || '').trim()).slice(0, 80);
      const ok = await window.okbmSetSinglePlanSpotForDate(date, { name: name, elevation: (spot && spot.elevation) || '', unregistered: !spot, eventId: e.id });
      if (!ok) { toast('일정을 바꾸지 않았어요'); return; }
      tick();
      toast(parseInt(date.slice(5, 7), 10) + '.' + parseInt(date.slice(8, 10), 10) + ' 내 일정으로 등록했어요');
      if (typeof window.renderPlanStage === 'function' && document.getElementById('romanticPlanModal')) window.renderPlanStage();
      afterCalChange(e.id);
    } catch (err) {
      console.warn('[lounge.js:calPlan]', err);
      toast('일정을 등록하지 못했어요', true);
    } finally {
      if (btn && btn.isConnected) btn.disabled = false;
    }
  }
  // 낭만플랜 달력을 그 날짜로 연다
  function openCal(date) {
    const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      window.calViewYear = parseInt(m[1], 10);
      window.calViewMonth = parseInt(m[2], 10);
      window.activeSelectedDateKey = m[1] + '.' + m[2] + '.' + m[3];
    }
    closeSheet(true);
    closeLoungeWindow(true);
    if (typeof window.openPlanModal === 'function') window.openPlanModal('calendar');
  }

  // =====================================================================
  // 누르기·입력 (인라인 onclick 없이 위임만 사용)
  // =====================================================================
  // 기능 사용 세기 (H8): data-a → 기록 이름. 관리자 등록·수정 버튼은 세지 않는다.
  const TAB_METRIC = ['events', 'guide', 'board', 'reviews', 'deals']; // TABS 순서
  const A_METRIC = {
    lounge: 'feat_lounge_open', 'deal-ig': 'feat_lounge_insta', 'body-yt': 'feat_lounge_video', 'tip-play': 'feat_lounge_video',
    past: 'feat_lounge_past', cat: 'feat_board_cat', 'more-posts': 'feat_lounge_more', 'more-reviews': 'feat_lounge_more', 'more-spot-reviews': 'feat_lounge_more',
    'new-post': 'feat_board_write', 'edit-post': 'feat_board_edit', 'del-post': 'feat_board_delete', like: 'feat_board_like',
    ugc: 'feat_lounge_ugc', user: 'feat_lounge_user', 'rev-spot': 'feat_lounge_spot_reviews', 'rev-all': 'feat_lounge_spot_reviews', 'rev-view': 'feat_lounge_spot_reviews', 'rev-band': 'feat_lounge_spot_reviews', review: 'feat_lounge_review_write',
    spot: 'feat_lounge_spot_map', 'cal-open': 'feat_lounge_cal', 'open-cal': 'feat_lounge_cal', 'cal-mark': 'feat_lounge_cal_mark', 'cal-plan': 'feat_lounge_cal_plan'
  };
  function loungeMetric(a, v, item) {
    let name = A_METRIC[a];
    if (a === 'tab') name = TAB_METRIC[Number(v)] ? 'feat_lounge_tab_' + TAB_METRIC[Number(v)] : '';
    if (a === 'x') name = item && !item.classList.contains('open') ? 'feat_lounge_item_open' : '';
    if (name && typeof window.okbmMetric === 'function') window.okbmMetric(name);
  }

  function onClick(e) {
    const t = e.target.closest('[data-a]');
    if (!t || t.disabled) return;
    const dealStrip = document.getElementById('homeDealStrip');
    if (!((home && home.contains(t)) || (layer && layer.contains(t)) || (dealStrip && dealStrip.contains(t)))) return;
    const a = t.dataset.a, v = t.dataset.v;
    const inWin = !!t.closest('.lm-win');
    const item = t.closest('.lmx');
    if (e.target.closest('a.lm-out')) return;
    if (t.tagName === 'A' && a !== 'deal-ig' && a !== 'body-yt') return;
    loungeMetric(a, v, item);
    switch (a) {
      case 'x': toggleItem(item); break;
      case 'deal-ig': e.preventDefault(); openDealInsta(t.dataset.kind, t.dataset.code); break;
      case 'body-yt': {
        e.preventDefault();
        const yid = youtubeId('https://youtu.be/' + String(t.dataset.yt || ''));
        if (!yid) break;
        if (item && !item.classList.contains('open')) {
          if (item.parentElement) {
            Array.prototype.forEach.call(item.parentElement.children, function (n) {
              if (n !== item && n.classList && n.classList.contains('lmx') && n.classList.contains('open')) setOpen(n, false);
            });
          }
          setOpen(item, true);
          afterOpen(item);
        }
        let box = t.closest('.lm-ytap');
        if (!box) {
          box = document.createElement('span');
          box.className = 'lm-ytap' + (t.dataset.short === '1' ? ' short' : '');
          t.parentNode.insertBefore(box, t);
          box.appendChild(t);
        }
        if (box.querySelector('iframe')) break;
        const frame = document.createElement('iframe');
        frame.title = 'YouTube 영상';
        frame.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
        frame.allowFullscreen = true;
        frame.src = 'https://www.youtube-nocookie.com/embed/' + yid + '?autoplay=1&playsinline=1&rel=0';
        box.appendChild(frame);
        break;
      }
      case 'tip-play': {
        const box = t.closest('[data-yt]');
        const yid = box ? youtubeId('https://youtu.be/' + box.dataset.yt) : '';
        if (!yid) break;
        box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + yid + '?autoplay=1&playsinline=1&rel=0" title="YouTube 영상" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        break;
      }
      case 'lounge': openLoungeWindow(v != null ? Number(v) : S.tab, t.dataset.id || null, t); break;
      case 'wclose': closeLoungeWindow(); break;
      case 'tab': if (inWin) winTo(Number(v)); else switchTab(Number(v)); break;
      case 'spot': closeSheet(true); closeLoungeWindow(true); openSpotOnMap(v); break;
      case 'retry': loadAll(); break;
      case 'login':
        // openLoginModal은 라운지 층 위(z 2147483646)에 뜬다. 로그인하면 페이지가 새로 열린다
        closeSheet(true);
        if (typeof window.openLoginModal === 'function') window.openLoginModal();
        break;
      case 'past':
        t.disabled = true;
        loadPastEvents().then(function () { rerenderPane(0); }).catch(function (err) {
          console.warn('[lounge.js:past]', err); toast('지난 행사를 불러오지 못했어요', true); t.disabled = false;
        });
        break;
      case 'cat': {
        S.cat = v;
        t.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === t); });
        tick();
        if (postsBy[v]) { renderBoardList(); break; }
        const l = t.closest('.lmw-pane') && t.closest('.lmw-pane').querySelector('.lmh-list');
        if (l) l.innerHTML = '<div class="lm-empty">불러오는 중…</div>';
        loadPosts(v).then(renderBoardList).catch(function (err) {
          console.warn('[lounge.js:cat]', err); delete postsBy[v];
          if (l && l.isConnected) l.innerHTML = '<div class="lm-empty">불러오지 못했어요</div>';
        });
        break;
      }
      case 'more-posts':
        t.disabled = true;
        loadPosts(S.cat, true).then(renderBoardList).catch(function (err) { console.warn('[lounge.js:more-posts]', err); toast('더 불러오지 못했어요', true); t.disabled = false; });
        break;
      case 'more-reviews':
        t.disabled = true;
        loadRecentReviews(true).then(function () { rerenderPane(3); }).catch(function (err) { console.warn('[lounge.js:more-reviews]', err); toast('더 불러오지 못했어요', true); t.disabled = false; });
        break;
      case 'del-post': {
        const p = findPost(v);
        if (!p) break;
        deleteRow('lounge_posts', v, '이 글을 삭제할까요?').then(function (ok) {
          if (!ok) return;
          dropPost(p.id);
          renderBoard();
        });
        break;
      }
      // 회원 쓰기
      case 'need-login': needLogin(); break;
      case 'new-post': openPostForm(null, v === 'poll' ? 'poll' : null); break;
      // 홈 라운지 알약: 설문·투표는 처음 누를 때 투표 글만 받는다
      case 'hub': {
        S.hub = v;
        paintHub();
        tick();
        if (v === 'poll' && !postsBy.poll) loadPosts('poll').then(paintHub).catch(function (err) { console.warn('[lounge.js:hub]', err); delete postsBy.poll; });
        break;
      }
      case 'news': openNews(v); break;
      case 'new-news': openNewsForm(null, v); break;
      case 'edit-news': { const n = D.news.find(function (x) { return String(x.id) === String(v); }); if (n) openNewsForm(n); break; }
      case 'del-news':
        deleteRow('lounge_news', v, '이 소식을 삭제할까요?').then(function (ok) { if (ok) reloadAdminData('lounge_news'); });
        break;
      case 'news-kind': {
        if (SH.kind !== 'news') break;
        SH.nkind = v;
        t.parentElement.querySelectorAll('button').forEach(function (b) { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        break;
      }
      case 'edit-post': { const p = findPost(v); if (p) openPostForm(p); break; }
      case 'pcat': {
        if (SH.kind !== 'post' || SH.id) break;
        SH.cat = v;
        t.parentElement.querySelectorAll('button').forEach(function (b) { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        sheet.querySelector('[data-private-note]').hidden = v !== 'suggestion';
        { // 투표면 제목→질문, 보기·마감 칸을 보인다
          const poll = v === 'poll';
          sheet.querySelector('[data-poll-fields]').hidden = !poll;
          sheet.querySelector('[data-title-lbl]').textContent = poll ? '질문' : '제목';
          sheet.querySelector('#lmPostTitle').placeholder = poll ? '무엇을 물어볼까요?' : '제목';
          const bd = sheet.querySelector('#lmPostBody');
          bd.placeholder = poll ? '덧붙일 말이 있으면 적어요' : '어떤 이야기를 나눌까요?';
          const bl = sheet.querySelector('label[for="lmPostBody"]');
          if (bl) bl.textContent = poll ? '설명 (선택)' : '내용';
        }
        tick();
        break;
      }
      case 'poll-vote': votePoll(v, Number(t.dataset.i)); break;
      case 'poll-add': {
        const box = sheet && sheet.querySelector('[data-popts]');
        if (!box) break;
        const n = box.children.length;
        if (n >= 5) { toast('보기는 5개까지예요', true); break; }
        box.insertAdjacentHTML('beforeend', pollOptHtml(n, ''));
        box.lastElementChild.querySelector('input').focus();
        t.style.display = n + 1 >= 5 ? 'none' : ''; // .lm-file이 display를 정해 hidden이 안 먹는다
        break;
      }
      case 'poll-del': {
        const box = t.closest('[data-popts]');
        const vals = Array.prototype.map.call(box.querySelectorAll('input'), function (el) { return el.value; });
        vals.splice(Array.prototype.indexOf.call(box.children, t.parentElement), 1);
        box.innerHTML = vals.map(function (x, i) { return pollOptHtml(i, x); }).join(''); // 번호·placeholder를 다시 맞춘다
        sheet.querySelector('[data-a="poll-add"]').style.display = '';
        break;
      }
      case 'poll-end': {
        if (SH.kind !== 'post') break;
        SH.pollDays = Number(v) || 0;
        t.parentElement.querySelectorAll('button').forEach(function (b) { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        break;
      }
      case 'photo-del': if (PHOTO_MAX[SH.kind]) { SH.photos.splice(Number(v), 1); refreshThumbs(); } break;
      case 'like': toggleLike(v); break;
      case 'del-comment': deleteComment(v, t.dataset.post); break;
      case 'ugc': openUgc(t); break;
      case 'user':
        if (typeof window.openUserFeedCollectionModal === 'function') window.openUserFeedCollectionModal(t.dataset.n || '', v);
        break;
      case 'rev-spot': showSpotReviews(v); break;
      case 'rev-view':
        S.revView = v === 'top' || v === 'many' ? v : 'recent';
        rerenderPane(3);
        if (S.revView === 'recent') ensureRecent(); else ensureRank();
        break;
      case 'rev-band':
        S.revBand = v || 'all';
        rerenderPane(3);
        break;
      case 'rev-all':
        S.revSpot = null;
        rerenderPane(3);
        const allRev = paneByTab(3);
        if (allRev) allRev.scrollTop = 0;
        ensureRecent();
        break;
      case 'more-spot-reviews':
        t.disabled = true;
        loadSpotReviews(S.revSpot, true).then(function () { rerenderPane(3); }).catch(function (err) { console.warn('[lounge.js:more-spot-reviews]', err); toast('더 불러오지 못했어요', true); t.disabled = false; });
        break;
      case 'review':
        // 지도 정보창과 같은 창(spot-tips.js: 별점 선택 + 팁 + 한 줄). 없으면 예전 별점 창
        if (typeof window.okbmOpenSpotReviewSheet === 'function') window.okbmOpenSpotReviewSheet(v);
        else openReviewSheet(v);
        break;
      case 'del-tip':
        if (!D.admin) break;
        if (!window.confirm('이 팁을 지울까요?')) break;
        Promise.resolve(sb() && sb().rpc('okbm_admin_delete_spot_tip', { p_spot_id: v, p_user_id: t.dataset.uid })).then(function (res) {
          if (res && res.error) throw res.error;
          toast('지웠어요');
          afterReviewChange(v);
        }).catch(function (err) { console.warn('[lounge.js:del-tip]', err); toast('지우지 못했어요', true); });
        break;
      case 'star': setStar(Number(v)); break;
      case 'review-del': if (SH.kind === 'review' && SH.mine) deleteReview(SH.mine.id, SH.spot_id, '내 후기를 지울까요?'); break;
      case 'del-review': deleteReview(v, t.dataset.spot, '이 후기를 삭제할까요? (운영팀)'); break;
      // 달력·패킹 (P5)
      case 'cal-open': {
        if (!item) break;
        const on = !item.classList.contains('cal');
        item.classList.toggle('cal', on);
        t.setAttribute('aria-expanded', String(on));
        tick();
        if (on) setTimeout(function () { if (item.isConnected) item.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }, 320);
        break;
      }
      case 'cal-mark': calMark(v); break;
      case 'cal-plan': calPlan(v, t); break;
      case 'open-cal': openCal(v); break;
      // 관리자
      case 'new-event': openEventForm(null); break;
      case 'edit-event': openEventForm(findEvent(v)); break;
      case 'pin-event': { const ev = findEvent(v); if (ev) patchRow('lounge_events', v, { is_pinned: !ev.is_pinned }, ev.is_pinned ? '고정을 풀었어요' : '홈 맨 위에 고정했어요'); break; }
      case 'hide-event': { const ev = findEvent(v); if (ev) patchRow('lounge_events', v, { is_active: !ev.is_active }, ev.is_active ? '숨겼어요. 관리자에게만 보여요' : '다시 보이게 했어요'); break; }
      case 'del-event': deleteEvent(v); break;
      case 'new-deal': openDealForm(null); break;
      case 'edit-deal': openDealForm(findDeal(v)); break;
      case 'hide-deal': { const dl = findDeal(v); if (dl) patchRow('lounge_deals', v, { is_active: !dl.is_active }, dl.is_active ? '숨겼어요. 관리자에게만 보여요' : '다시 보이게 했어요'); break; }
      case 'del-deal': deleteRow('lounge_deals', v, '이 할인을 삭제할까요?').then(function (ok) { if (ok) reloadAdminData('lounge_deals'); }); break;
      case 'new-guide': openGuideForm(null, 'kit'); break;
      case 'edit-guide': openGuideForm(findGuide(v)); break;
      case 'hide-guide': { const g = findGuide(v); if (g) patchRow('lounge_guides', v, { is_active: !g.is_active }, g.is_active ? '숨겼어요. 관리자에게만 보여요' : '다시 보이게 했어요'); break; }
      case 'del-guide': deleteRow('lounge_guides', v, '이 가이드를 삭제할까요?').then(function (ok) { if (ok) reloadAdminData('lounge_guides'); }); break;
      // 시트 안
      case 'shut': closeSheet(); break;
      case 'ok': { const r = SH.resolve; SH.resolve = null; if (r) r(true); break; }
      case 'switch': {
        const k = t.dataset.k, on = !t.classList.contains('on');
        t.classList.toggle('on', on);
        t.setAttribute('aria-checked', String(on));
        if (SH.sw) SH.sw[k] = on;
        tick();
        break;
      }
      case 'pick-spot': {
        const s = spotById(v);
        if (!s) break;
        const pl = sheet.querySelector('[name="place"]');
        if (pl) pl.value = spotName(s).slice(0, 80);
        setPickedSpot(s);
        tick();
        break;
      }
      case 'unpick-spot': setPickedSpot(null); break;
      case 'poster-clear': {
        SH.poster_url = '';
        const pv = sheet.querySelector('[data-prev]');
        pv.hidden = true; pv.removeAttribute('src');
        t.hidden = true;
        sheet.querySelector('[data-poster-label]').textContent = '사진 고르기';
        break;
      }
      case 'gkind': {
        if (SH.kind !== 'guide' || SH.gkind === v) break;
        SH.gkind = v;
        const kit = v === 'kit';
        t.parentElement.querySelectorAll('button').forEach(function (b) { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        sheet.querySelectorAll('[data-kit]').forEach(function (el) { el.hidden = !kit; });
        const tipBox = sheet.querySelector('[data-tip]');
        if (tipBox) tipBox.hidden = kit;
        const tl = sheet.querySelector('label[for="lmGdTitle"]'), bl = sheet.querySelector('label[for="lmGdBody"]');
        if (tl) tl.firstChild.textContent = kit ? '영상·글 제목' : '제목';
        if (bl) bl.innerHTML = esc(kit ? '본문' : '내용') + (kit ? '' : ' <b aria-hidden="true">*</b>');
        const titleIn = sheet.querySelector('#lmGdTitle'), bodyIn = sheet.querySelector('#lmGdBody');
        if (titleIn) titleIn.placeholder = kit ? '유튜브 제목 그대로' : '예: 겨울 핫팩은 두 장';
        if (bodyIn) bodyIn.placeholder = kit ? '진행자가 한 말과 팁을 초보에게 건네듯' : '초보가 바로 따라 할 수 있게';
        tick();
        break;
      }
      case 'tnote': {
        if (SH.kind !== 'guide') break;
        SH.tnote = v;
        t.parentElement.querySelectorAll('button').forEach(function (b) { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        break;
      }
      case 'gear-add': {
        const g = (window.GEARS_MASTER || []).find(function (x) { return x && String(x.id) === String(v); });
        if (g) addItem({ gear_id: String(g.id), category_id: String(g.category_id || 'other'), name: String(g.item_name).slice(0, 120), weight_g: Number(g.weight_g) || 0, price_krw: 0, link_url: '' });
        break;
      }
      case 'gear-custom': {
        const qv = String((sheet.querySelector('[data-gear-q]') || {}).value || '').trim();
        if (qv) addItem({ gear_id: '', category_id: 'other', name: qv.slice(0, 120), weight_g: 0, price_krw: 0, link_url: '' });
        break;
      }
      case 'item-del': SH.items.splice(Number(v), 1); refreshItems(); break;
      case 'item-up': {
        const i = Number(v);
        if (i > 0) { const x = SH.items[i]; SH.items[i] = SH.items[i - 1]; SH.items[i - 1] = x; refreshItems(); }
        break;
      }
      default: break;
    }
  }
  // 글 머리(div)도 키보드로 펼칠 수 있게
  function onItemKey(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('div[data-a="x"]')) {
      e.preventDefault();
      toggleItem(e.target.closest('.lmx'));
    }
  }
  function onInput(e) {
    const t = e.target;
    if (!sheet || !sheet.contains(t)) return;
    if (t.dataset.about != null && SH.items && SH.items[Number(t.dataset.about)]) SH.items[Number(t.dataset.about)].about = t.value;
    else if (t.dataset.link != null && SH.items && SH.items[Number(t.dataset.link)]) SH.items[Number(t.dataset.link)].link_url = t.value.trim();
    else if (t.dataset.price != null && SH.items && SH.items[Number(t.dataset.price)]) SH.items[Number(t.dataset.price)].price_krw = Number(t.value) || 0;
    else if (t.dataset.w != null && SH.items && SH.items[Number(t.dataset.w)]) SH.items[Number(t.dataset.w)].weight_g = Number(t.value) || 0;
    else if (t.hasAttribute('data-gear-q')) { clearTimeout(searchTimer); searchTimer = setTimeout(function () { gearSuggest(t.value); }, 160); }
    else if (t.name === 'place' && SH.kind === 'event') spotSuggest(t.value);
  }
  function onChange(e) {
    const t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-file')) onPosterFile(t);
    else if (t.hasAttribute && t.hasAttribute('data-post-files')) onPostFiles(t);
    else if (t.dataset && t.dataset.w != null && SH.kind === 'guide') refreshItems(); // 무게 합 다시 표시
  }
  function onSubmit(e) {
    const f = e.target;
    if (!f.dataset || !f.dataset.form) return;
    e.preventDefault();
    if (f.dataset.form === 'event') saveEvent(f);
    else if (f.dataset.form === 'deal') saveDeal(f);
    else if (f.dataset.form === 'guide') saveGuide(f);
    else if (f.dataset.form === 'post') savePost(f);
    else if (f.dataset.form === 'news') saveNews(f);
    else if (f.dataset.form === 'comment') saveComment(f);
    else if (f.dataset.form === 'review') saveReview(f);
  }
  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('okbmDealInsta')) { e.preventDefault(); closeDealInsta(); return; }
    if (sheet) { e.preventDefault(); closeSheet(); } else if (win) { e.preventDefault(); closeLoungeWindow(); }
  }
  function onResize() {
    placeInd(hmenu, trackOf(S.tab));
    if (win) { wtrack.scrollLeft = trackOf(S.wtab) * wtrack.clientWidth; placeInd(wmenu, trackOf(S.wtab)); }
  }

  // 로그인·로그아웃·관리자 권한이 바뀌면 다시 불러온다 (romantic-sync.js okbmPersistAdminFlag가 알림)
  function onAdminFlag(e) {
    const isA = !!(e && e.detail && e.detail.isAdmin);
    const uid = myId();
    if (D.status !== 'ready' && D.status !== 'error') return; // 처음 불러오는 중이면 loadAll이 반영
    if (isA === D.admin && uid === lastUid) return;
    const uidChanged = uid !== lastUid;
    D.admin = isA;
    lastUid = uid;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(function () {
      Object.keys(postsBy).forEach(function (k) { delete postsBy[k]; });
      if (uidChanged) { D.recent = null; D.comments = {}; D.liked.clear(); D.likeChecked.clear(); D.spotRev = null; D.poll = {}; }
      D.pastEvents = null;
      loadTabs().then(function (r) {
        D.status = r.every(function (x) { return x.status === 'rejected'; }) ? 'error' : 'ready';
        if (S.cat !== 'all') return loadPosts(S.cat).catch(function () {});
      }).then(function () {
        if (!loggedIn() || !D.admin) closeSheet(true); // 권한이 사라지면 관리자 시트를 닫는다
        renderAll();
        if (win) ensureRecent();
      });
    }, 250);
  }

  // =====================================================================
  // 시작
  // =====================================================================
  function mountHome() {
    home = document.getElementById('okbmLoungeHome');
    if (!home || home.__okbmLounge) return !!home;
    home.__okbmLounge = true;
    home.addEventListener('click', onClick);
    home.addEventListener('keydown', onItemKey);
    renderHome();
    return true;
  }
  // 딥링크 ?lounge=탭&post=글id (알림 등). ?id=는 index.html이 지도 박지로 넘기므로 쓰지 않는다
  function openFromUrl() {
    let qs;
    try { qs = new URLSearchParams(window.location.search); } catch (e) { return; }
    if (!qs.has('lounge')) return;
    const tab = parseInt(qs.get('lounge'), 10);
    const post = String(qs.get('post') || '').trim();
    qs.delete('lounge'); qs.delete('post');
    try {
      const rest = qs.toString();
      window.history.replaceState(window.history.state, document.title, window.location.pathname + (rest ? '?' + rest : '') + window.location.hash);
    } catch (e) {}
    openLoungeWindow(tab >= 0 && tab < TABS.length ? tab : 0, post || null, null);
  }
  function start() {
    injectCss();
    const dealStrip = document.getElementById('homeDealStrip');
    if (dealStrip && !dealStrip.__okbmDeal && !(document.getElementById('okbmLoungeHome') || { contains: function () { return false; } }).contains(dealStrip)) {
      dealStrip.__okbmDeal = true;
      dealStrip.addEventListener('click', onClick);
    }
    if (mountHome()) loadAll();
    openFromUrl();
    if (window.__okbmSpotsBootReady && typeof window.__okbmSpotsBootReady.then === 'function') {
      window.__okbmSpotsBootReady.then(function () { if (D.status === 'ready') renderAll(); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
  }

  window.openLoungeWindow = function (tab, itemId) { openLoungeWindow(tab, itemId, null); };
  window.closeLoungeWindow = closeLoungeWindow;
  window.closeLoungeSheet = function () { closeSheet(); };
  // 지도 정보창 후기 블록(romantic-sync.js)에서 부른다. 두 페이지 부트로더에 bindLazy로 걸려 있다
  window.openLoungeSpotReviews = function (spotId) { ensureLayer(); if (D.status === 'idle') loadAll(); showSpotReviews(spotId); };
  window.openSpotReviewSheet = function (spotId) {
    if (typeof window.okbmOpenSpotReviewSheet === 'function') return window.okbmOpenSpotReviewSheet(spotId);
    return openReviewSheet(spotId);
  };
  // 합친 후기 창(spot-tips.js)에서 남기면 라운지도 새로 받는다
  window.addEventListener('okbm_spot_review_saved', function (e) {
    const sid = String((e && e.detail && e.detail.spotId) || '');
    if (sid) afterReviewChange(sid);
  });
  // 달력에서 행사를 빼면(romantic-plan.js) 라운지 버튼도 맞춘다
  window.addEventListener('okbm_plan_events_changed', function (e) {
    const id = String((e && e.detail && e.detail.id) || '');
    const ev = id && findEvent(id);
    if (ev) repaintSlot('[data-cal-slot]', id, calSlotInner(ev));
  });
  window.addEventListener('okbm_ugc_report_result', onUgcResult);
  window.addEventListener('okbm_ugc_blocked', onUgcResult);
  // 신고 검수함(romantic-sync.js)에서 지운 라운지 글·댓글·후기를 캐시에서도 뺀다
  window.addEventListener('okbm_lounge_content_deleted', function (e) {
    const d = (e && e.detail) || {};
    const id = String(d.id || '');
    if (!id) return;
    if (d.type === 'lounge_post') dropPost(id);
    else if (d.type === 'lounge_comment') {
      let found = false;
      Object.keys(D.comments).forEach(function (pid) {
        const before = D.comments[pid].length;
        D.comments[pid] = D.comments[pid].filter(function (c) { return String(c.id) !== id; });
        if (D.comments[pid].length !== before) { found = true; forEachPost(pid, function (p) { p.comments_count = Math.max(0, (Number(p.comments_count) || 0) - 1); }); }
      });
      // 댓글을 안 펼쳐 본 글이면 어느 글인지 몰라서 목록을 새로 받아 개수를 맞춘다
      if (!found && postsBy.all) loadPosts('all').catch(function () {}).then(function () { if (D.status === 'ready') renderBoard(); });
    } else if (d.type === 'spot_review') {
      const keep = function (r) { return String(r.id) !== id; };
      if (D.recent) D.recent = D.recent.filter(keep);
      if (D.spotRev && D.spotRev.reviews) D.spotRev.reviews = D.spotRev.reviews.filter(keep);
      const jobs = [loadTop().catch(function () {})];
      if (S.revSpot) jobs.push(loadSpotReviews(S.revSpot, false).catch(function () {})); // 평균·개수도 새로
      // 후기는 다시 받은 뒤 한 번만 그린다(예전에는 바로 한 번 + 받은 뒤 한 번)
      Promise.all(jobs).then(function () { if (D.status === 'ready') renderAll(); });
      return;
    }
    if (D.status === 'ready') renderBoard();
  });
  window.okbmLoungeRerender = function () { if (D.status === 'ready') renderAll(); };
  // 차단·신고로 숨길 글이 바뀌면 라운지도 다시 거른다
  (function wrapCommunityRerender() {
    const orig = window.rerenderCommunityFeedsNow;
    if (typeof orig !== 'function' || orig.__okbmLounge) return;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      try { window.okbmLoungeRerender(); } catch (e) { console.warn('[lounge.js:rerenderCommunityFeedsNow]', e); }
      return r;
    };
    wrapped.__okbmLounge = true;
    window.rerenderCommunityFeedsNow = wrapped;
  })();
  window.addEventListener('okbm_admin_flag', onAdminFlag);
  document.addEventListener('keydown', onKey);
  window.addEventListener('message', onInstaMeasure);
  window.addEventListener('resize', onResize);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
