// =========================================================================
// 홈 개편 (2026-10-14): 바로가기 네 개 · 최근 다녀온 후기 · 인기 스팟 "후기 N · 찜 N"
// 시안: 인스타에니/낭만루트_앱점검/미리보기/미리보기.html "1. 첫 화면" 넷째 판
//
// · 바로가기 다섯 개(#homeQuickNav [data-quick])는 누르면 그 화면으로 넘어간다(스크롤 아님).
//   초보 가이드 개수는 lounge.js가 #hqGuideCount에 채운다. 박지 랭킹은 라운지 박지 후기 탭(평점 높은 박지)을 연다.
// · 최근 다녀온 후기는 운영자 글을 빼고 회원이 공개한 글만, 다녀온 날짜가 최근인 것부터. 개수와 상관없이 바로가기 바로 밑(대표님 10-14).
// · 인라인 핸들러 없음(이벤트 위임) → csp-extract 대상 아님.
// · src 보간은 escapeHtml(okbmSafeImageUrl(...))만 (scripts/check-unsafe-url-interpolation.py).
// =========================================================================
(function () {
  'use strict';
  if (window.__okbmHomeLayoutLoaded) return;
  window.__okbmHomeLayoutLoaded = true;

  var OPERATOR_UID = 'kakao_5060259862'; // 오라네(운영자). romantic-history.js openUserFeedCollectionModal과 같은 값
  var RECENT_LIMIT = 12;
  var RECENT_FETCH = 40; // 사진 없는 글을 거른 뒤에도 날짜 최근 12건이 남도록 더 가져온다

  var escapeHtml = typeof window.escapeHtml === 'function' ? window.escapeHtml : function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var okbmSafeImageUrl = function (u) {
    return typeof window.okbmSafeImageUrl === 'function' ? window.okbmSafeImageUrl(u) : '';
  };

  // ---------- 모양 ----------
  function injectCss() {
    if (document.getElementById('okbmHomeLayoutCss')) return;
    var css = document.createElement('style');
    css.id = 'okbmHomeLayoutCss';
    css.textContent = [
      '.hq{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:0 14px;margin-top:-14px}',
      '.hq-btn{display:flex;flex-direction:column;align-items:center;gap:4px;min-height:76px;padding:12px 2px 10px;border-radius:16px;background:#171A1F;border:1px solid #2A2F37;color:#F2F3F5;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '.hq-btn svg{flex:none}',
      '.hq-btn b{font-size:11px;font-weight:800;letter-spacing:-.04em;white-space:nowrap}',
      '.hq-btn em{font-style:normal;font-size:10px;font-weight:700;color:#7D8490;min-height:12px}',
      '.hq-btn.hq-hi{background:#5bb8f0;border-color:#5bb8f0;color:#001521}',
      '.hq-btn.hq-hi em{color:#00324d}',
      // 바로가기 밑 두 칸: 왼쪽 이달의 행사, 오른쪽 할인 소식 (lounge.js가 #homeDealStrip에 그린다)
      // 홈 칸 사이 기본 간격(28px)에서 8px을 당겨 바로가기와 20px만 띄운다
      '.hd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:-8px 14px 0;color:#F2F3F5}',
      '.hd-col{min-width:0;border-radius:14px;background:#171A1F;border:1px solid #2A2F37;padding:11px 9px 3px}',
      '.hd-h{display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:4px;padding:0 2px}',
      '.hd-h b{font-size:13.5px;font-weight:900;letter-spacing:-.02em;white-space:nowrap}',
      '.hd-h b i{font-style:normal;margin-left:3px;font-size:11.5px;font-weight:800;color:#8b8b93}',
      '.hd-h button{flex:none;font:inherit;font-size:11.5px;font-weight:800;color:#5bb8f0;background:none;border:0;padding:4px 0;cursor:pointer}',
      '.hd-row{width:100%;display:flex;gap:7px;align-items:flex-start;padding:8px 2px;border:0;border-top:1px solid rgba(255,255,255,.07);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}',
      '.hd-row:first-of-type{border-top:0}',
      '.hd-row:active{opacity:.6}',
      '.hd-k{flex:none;width:40px;text-align:center}',
      '.hd-k b{display:block;font-size:14.5px;font-weight:900;letter-spacing:-.04em;line-height:1.1;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.hd-ev .hd-k b{color:#8fc1ff}',
      '.hd-deal .hd-k b{color:#ffb08f}',
      '.hd-k small{display:inline-block;margin-top:3px;padding:1px 4px;border-radius:4px;font-size:9.5px;font-weight:900;white-space:nowrap;background:rgba(255,255,255,.08);color:#cfd3da}',
      '.hd-k small.hot{background:#ff4d4f;color:#fff}',
      '.hd-x{flex:1;min-width:0;padding-top:1px;font-size:12px;font-weight:700;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:keep-all;overflow-wrap:anywhere}',
      '.hd-empty{padding:14px 2px 12px;font-size:11.5px;color:#8b8b93}',
      // 시안: 인기 스팟 제목은 로고 줄 오른쪽(사진 쪽으로 15px 내림), 카드는 이름·숫자·설명·버튼만
      '.header-top-row{display:flex;align-items:center;justify-content:space-between}',
      '.hh-pick{position:relative;top:15px;font-size:13px;font-weight:800;color:#ffd77a;font-variant-numeric:tabular-nums;white-space:nowrap;transition:opacity .3s ease}',
      '.hh-pick.off{opacity:0;pointer-events:none}',
      '#btnHeroAuthorFeed{display:none !important}',
      '.hm-stat{color:#ffd77a}',
      // 시안: 테마 칩은 글자만, 카드는 사진·고도·이름만
      '#heroTrailerSectionWrap .n-cat-chip svg{display:none}',
      '#heroTrailerSectionWrap .n-trailer-author-date{display:none !important}',
      '.hl-head{display:flex;justify-content:space-between;align-items:center;padding-right:14px}',
      '.hl-link{background:none;border:0;padding:0;font-family:inherit;font-size:var(--fs-meta);font-weight:800;color:var(--accent);cursor:pointer}',
      '.tg{display:flex;gap:10px;padding-right:14px}',
      '.tg-box{flex:1;min-width:0;background:#0f1219;border:1px solid #1f2430;border-radius:14px;padding:12px;cursor:pointer;color:#e8ebf2}',
      '.tg-box b{display:block;font-size:14px;font-weight:800}',
      '.tg-box p{font-size:11px;color:#8b93a5;margin:6px 0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.tg-act{background:none;border:0;padding:0;font-family:inherit;font-size:12px;font-weight:800;color:#5bb8f0;cursor:pointer}',
      '.hm-stat{flex:none;margin-left:auto;font-size:var(--fs-meta);font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.insta-memo-title-line .insta-memo-spot-title{min-width:0}',
      '.hl-wrap{display:flex;flex-direction:column;gap:28px}',
      '.hl-wrap .lmh:empty{min-height:236px}', // lounge.js가 받기 전 자리만 잡아 둔다
      '.hl-cap{display:flex;justify-content:space-between;align-items:center;padding-right:14px;margin-bottom:8px;font-size:12.5px;font-weight:800;color:var(--tx-3)}',
      '.hr-card{flex:none;width:200px;border-radius:16px;overflow:hidden;background:#171A1F;border:1px solid #2A2F37;cursor:pointer;text-align:left;padding:0;color:inherit;font-family:inherit}',
      '.hr-ph{position:relative;height:130px;background:#20242B}',
      '.hr-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}',
      '.hr-bd{padding:10px 12px 12px}',
      '.hr-who{display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-meta);color:#7D8490;font-weight:700}',
      '.hr-who span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.hr-sp{margin:4px 0;font-size:var(--fs-title);font-weight:800;color:#F2F3F5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hr-mm{font-size:12px;line-height:1.45;color:#A3A9B3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:35px}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // ---------- 바로가기 ----------
  function onQuickClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-quick]') : null;
    if (!btn) return;
    var kind = btn.getAttribute('data-quick');
    if (typeof window.triggerHaptic === 'function') { try { window.triggerHaptic(8); } catch (err) {} }
    if (kind === 'guide' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(1);
    else if (kind === 'rank' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(3);
    else if (kind === 'board' && typeof window.openLoungeWindow === 'function') window.openLoungeWindow(2);
    else if (kind === 'join' && typeof window.openTripJoinListModal === 'function') window.openTripJoinListModal();
    else if (kind === 'write' && typeof window.openPastTripRegisterModal === 'function') {
      // 홈에서 열면 올린 뒤·닫은 뒤 홈으로 돌아온다 (낭만플랜에서 연 것과 같은 처리: 마이리포트로 넘어가지 않음)
      if (typeof isUserLoggedIn !== 'function' || isUserLoggedIn()) window.__pastTripOpenedFromPlan = true;
      window.openPastTripRegisterModal(e);
    }
    else if (kind === 'feed' && typeof window.navigateToDockTab === 'function') window.navigateToDockTab('history');
  }

  // ---------- 최근 다녀온 후기 ----------
  var recentList = [];
  function parseArr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim().charAt(0) === '[') { try { return JSON.parse(v); } catch (e) {} }
    if (typeof v === 'string' && v.trim().indexOf('https://') === 0) return [v.trim()];
    return [];
  }
  // index-main.js fetchCommunityFeeds와 같은 모양으로 바꾼다 (피드 창이 그대로 쓴다)
  function normalize(r) {
    return {
      id: r.id,
      userId: r.user_id,
      spot: r.spot || r.spot_name || '백패킹 필드',
      spotId: r.spot_id || '',
      elevation: r.elevation || '',
      weightKg: r.weight_kg != null ? String(r.weight_kg) : '',
      date: r.date || '',
      memo: r.memo || '',
      oneLineMemo: r.memo || '',
      templateId: r.template_id || 1,
      likes: r.likes_count != null ? Number(r.likes_count) : 0,
      createdAt: r.created_at || '',
      isPublished: r.is_published !== false,
      is_published: r.is_published === true,
      photos: parseArr(r.photos),
      items: parseArr(r.items),
      author: r.author || '낭만백패커',
      nick: r.author || '낭만백패커',
      photoMemos: parseArr(r.photo_memos_json || r.photo_memos),
      instagram: String(r.instagram || '').trim()
    };
  }
  function firstPhoto(f) {
    var list = typeof window.okbmPublicPhotoUrls === 'function' ? window.okbmPublicPhotoUrls(f) : (f.photos || []);
    var u = (list || []).find(function (x) { return typeof x === 'string' && x.indexOf('https://') === 0; });
    return u || '';
  }
  function shortDate(f) {
    var p = String(f.date || f.createdAt || '').match(/\d+/g);
    return p && p.length >= 3 ? (String(p[1]).padStart(2, '0') + '.' + String(p[2]).padStart(2, '0')) : '';
  }
  // 카드에 보이는 다녀온 날짜. 연-월-일 숫자. 날짜가 없으면 올린 날.
  function tripDateNum(f) {
    var p = String((f && f.date) || '').match(/\d+/g);
    var y = 0;
    var m = 0;
    var d = 0;
    if (p && p.length >= 3) {
      if (String(p[0]).length === 4) { y = +p[0]; m = +p[1]; d = +p[2]; }
      else if (String(p[2]).length === 4) { y = +p[2]; m = +p[0]; d = +p[1]; }
    }
    if (!(y && m && d)) {
      var iso = String((f && f.createdAt) || '').match(/(\d{4})-(\d{2})-(\d{2})/);
      if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
    }
    return (y && m && d) ? (y * 10000 + m * 100 + d) : 0;
  }
  function byTripDateDesc(a, b) {
    var diff = tripDateNum(b) - tripDateNum(a);
    if (diff) return diff;
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  }
  function cardHtml(f) {
    var photo = firstPhoto(f);
    var spot = String(f.spot || '').replace(/\s*\(.*?\)/g, '').trim() || '백패킹 필드';
    var memo = String(f.oneLineMemo || f.memo || '').replace(/\s+/g, ' ').trim();
    return '<button type="button" class="hr-card okbm-press" data-recent-id="' + escapeHtml(f.id) + '" aria-label="' + escapeHtml(spot + ' 후기 보기') + '">' +
      '<div class="hr-ph">' + (photo ? '<img src="' + escapeHtml(okbmSafeImageUrl(photo)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div class="hr-bd"><div class="hr-who"><span>' + escapeHtml(f.author) + '</span><span>' + escapeHtml(shortDate(f)) + '</span></div>' +
      '<div class="hr-sp">' + escapeHtml(spot) + '</div>' +
      '<div class="hr-mm">' + escapeHtml(memo) + '</div></div></button>';
  }
  function visibleRecent() {
    var list = recentList.filter(function (f) {
      if (typeof window.okbmIsHomePublicFeed === 'function' && !window.okbmIsHomePublicFeed(f)) return false;
      if (typeof window.isFeedHiddenByUgc === 'function' && window.isFeedHiddenByUgc({ id: f.id, user_id: f.userId })) return false;
      return !!firstPhoto(f);
    });
    return list.sort(byTripDateDesc).slice(0, RECENT_LIMIT);
  }
  function renderRecent() {
    var sec = document.getElementById('homeRecentReviews');
    var rail = document.getElementById('homeRecentReviewsRail');
    if (!sec || !rail) return;
    var list = visibleRecent();
    if (!list.length) { sec.hidden = true; return; }
    var html = list.map(cardHtml).join('');
    if (rail.__okbmHtml !== html) { rail.innerHTML = html; rail.__okbmHtml = html; }
    sec.hidden = false;
  }
  function loadRecent() {
    var base = window.SUPABASE_URL;
    if (!base || typeof window.okbmPublicFetch !== 'function') return Promise.resolve();
    var select = window.FEEDS_HOME_SELECT || 'id,user_id,spot,spot_id,elevation,weight_kg,date,memo,photos,photo_memos_json,author,instagram,likes_count,is_published,feed_type,created_at,items,template_id';
    var url = base + '/rest/v1/feeds?select=' + encodeURIComponent(select) +
      '&is_published=eq.true&user_id=neq.' + encodeURIComponent(OPERATOR_UID) +
      '&order=date.desc.nullslast,created_at.desc&limit=' + RECENT_FETCH;
    return window.okbmPublicFetch(url).then(function (res) {
      if (!res.ok) throw new Error('recent feeds ' + res.status);
      return res.json();
    }).then(function (rows) {
      recentList = (Array.isArray(rows) ? rows : []).map(normalize);
      renderRecent();
    }).catch(function (e) { console.warn('[home-layout:loadRecent]', e); });
  }
  function onRecentClick(e) {
    var card = e.target && e.target.closest ? e.target.closest('[data-recent-id]') : null;
    if (!card) return;
    var id = card.getAttribute('data-recent-id');
    if (typeof window.openSingleTripDualFeedModal !== 'function') return;
    // 목록을 넘기면 누른 글 아래 다음 글이 이어서 붙는다. 홈에서는 그 글만 연다.
    var one = visibleRecent().filter(function (f) { return String(f.id) === String(id); });
    if (one.length) window.openSingleTripDualFeedModal(id, one, '최근 다녀온 후기');
  }

  // ---------- 인기 스팟 "후기 N · 찜 N" ----------
  var statToken = 0;
  var reviewCache = {};
  function reviewCount(record, master) {
    var base = window.SUPABASE_URL;
    var name = String(record.spot || '').trim();
    var sid = master && master.id != null ? String(master.id).trim() : '';
    var key = sid + '|' + name;
    if (reviewCache[key] != null) return Promise.resolve(reviewCache[key]);
    if (!base || typeof window.okbmPublicFetch !== 'function' || (!sid && !name)) return Promise.resolve(0);
    var conds = [];
    if (sid) conds.push('spot_id.eq.' + sid);
    if (name) conds.push('spot.eq."' + name.replace(/["\\]/g, '') + '"');
    var url = base + '/rest/v1/feeds?select=id&is_published=eq.true&or=' + encodeURIComponent('(' + conds.join(',') + ')');
    return window.okbmPublicFetch(url, { method: 'HEAD', headers: { Prefer: 'count=exact' } }).then(function (res) {
      if (!res.ok) throw new Error('review count ' + res.status);
      var m = String(res.headers.get('content-range') || '').match(/\/(\d+)$/);
      var n = m ? Number(m[1]) : 0;
      reviewCache[key] = n;
      return n;
    });
  }
  window.okbmHomeHeroStat = function (record, master) {
    var el = document.getElementById('heroStatText');
    if (!el || !record) return;
    var my = ++statToken;
    var sid = master && master.id != null ? String(master.id).trim() : '';
    var bm = (sid && typeof window.okbmFetchSpotBookmarkCounts === 'function')
      ? window.okbmFetchSpotBookmarkCounts([sid]).then(function (m) { return Number(m[sid]) || 0; })
      : Promise.resolve(0);
    Promise.all([reviewCount(record, master).catch(function () { return 0; }), bm.catch(function () { return 0; })]).then(function (r) {
      if (my !== statToken) return; // 그새 다른 카드로 넘겼다
      var parts = [];
      if (r[0] > 0) parts.push('후기 ' + r[0]);
      if (r[1] > 0) parts.push('찜 ' + r[1]);
      el.textContent = parts.join(' · ');
      el.hidden = !parts.length;
    });
  };

  // ---------- 함께하기: 이번 주말 동행 상자 ----------
  window.okbmHomeTogetherTrips = function (activeTrips) {
    var el = document.getElementById('homeTogetherTripText');
    if (!el) return;
    var open = (activeTrips || []).filter(function (t) { return !t.isClosed; });
    el.textContent = open.length ? ('모집 중 ' + open.length + '개 · ' + (open[0].spotName || '')) : '첫 동행을 모집해 보세요';
  };
  function onTogetherClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest('[data-together="trip-new"]')) {
      if (typeof window.openTripCreateModal === 'function') window.openTripCreateModal();
      return;
    }
    if (t.closest('#homeTogetherTrip') && typeof window.openTripJoinListModal === 'function') window.openTripJoinListModal();
  }

  // ---------- 헤더의 "이주의 인기 스팟": 헤더는 따라 내려오므로, 인기 스팟 사진이 화면에 있을 때만 보인다 ----------
  function watchHeroPick() {
    var pick = document.querySelector('.hh-pick');
    var card = document.getElementById('instaMainCard');
    if (!pick || !card || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      pick.classList.toggle('off', !entries[0].isIntersecting);
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(card);
  }

  // ---------- 시작 ----------
  function start() {
    injectCss();
    var quick = document.getElementById('homeQuickNav');
    if (quick) quick.addEventListener('click', onQuickClick);
    var sec = document.getElementById('homeRecentReviews');
    if (sec) {
      sec.addEventListener('click', onQuickClick);
      sec.addEventListener('click', onRecentClick);
    }
    watchHeroPick();
    var trip = document.getElementById('homeTogetherTrip');
    if (trip) trip.addEventListener('click', onTogetherClick);
    loadRecent();
    // 박지 목록이 온 뒤 인기 스팟 숫자를 다시 맞춘다 (먼저 그려졌으면 찜 수가 빠져 있다)
    if (window.__okbmSpotsBootReady && typeof window.__okbmSpotsBootReady.then === 'function') {
      window.__okbmSpotsBootReady.then(function () {
        if (typeof window.okbmRefreshHeroStat === 'function') window.okbmRefreshHeroStat();
      });
    }
    // 차단·신고로 숨길 글이 바뀌면 다시 거른다
    var orig = window.rerenderCommunityFeedsNow;
    if (typeof orig === 'function' && !orig.__okbmHomeLayout) {
      var wrapped = function () {
        var r = orig.apply(this, arguments);
        try { renderRecent(); } catch (e) { console.warn('[home-layout:rerender]', e); }
        return r;
      };
      wrapped.__okbmHomeLayout = true;
      window.rerenderCommunityFeedsNow = wrapped;
    }
  }

  injectCss();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
