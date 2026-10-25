// 피드 댓글 (2026-10-25, H17)
// 1) 별 옆 댓글 버튼(okbmFeedCommentBtnHtml)과 최근 댓글 한 줄(okbmFeedCommentPreviewHtml)을 그리는 도우미.
//    낭만피드(romantic-history.js)·정보창 후기 피드(map-main.js)가 피드를 그릴 때 부른다.
//    댓글 수·최근 댓글은 피드 줄의 comments_count·last_comment만 쓰고, 댓글 전체는 창을 열 때 그 피드 것만 받는다.
// 2) 댓글 창: 아래에서 올라오는 창. 비회원은 읽기만, 회원은 쓰기·지우기(쓴 사람·피드 주인·관리자).
// 3) 알림을 눌러 들어오면(?feed=ID&comments=1) 피드가 열린 뒤 댓글 창을 바로 펼친다.
// 새 버튼은 onclick 속성 없이 이벤트로 단다(CSP 해시).
(function () {
  'use strict';
  if (window.__okbmFeedCommentsBooted) return;
  window.__okbmFeedCommentsBooted = true;

  var ICON_CMT = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="pointer-events:none;"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind, ms) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info', ms || 2400);
  }

  function cleanId(id) {
    return String(id == null ? '' : id).replace(/^["']|["']$/g, '').trim();
  }

  function parseLast(last) {
    if (!last) return null;
    if (typeof last === 'string') {
      try { last = JSON.parse(last); } catch (e) { return null; }
    }
    if (!last || !last.body) return null;
    return last;
  }

  function loggedIn() {
    return typeof window.isUserLoggedIn === 'function' && window.isUserLoggedIn();
  }

  function rpc(name, args) {
    var client = window.supabaseClient;
    if (!client || typeof client.rpc !== 'function') return Promise.reject(new Error('no client'));
    return client.rpc(name, args).then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }

  function whenText(iso) {
    var t = Date.parse(iso || '');
    if (!t) return '';
    var sec = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (sec < 60) return '방금';
    if (sec < 3600) return Math.floor(sec / 60) + '분 전';
    if (sec < 86400) return Math.floor(sec / 3600) + '시간 전';
    if (sec < 86400 * 7) return Math.floor(sec / 86400) + '일 전';
    var d = new Date(t);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function injectStyle() {
    if (document.getElementById('okbmFeedCommentsStyle')) return;
    var st = document.createElement('style');
    st.id = 'okbmFeedCommentsStyle';
    st.textContent =
      '.okbm-cmt-btn{background:none;border:none;padding:6px 4px;margin:-6px -4px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;color:#cbd5e1;font-family:inherit;touch-action:manipulation;}' +
      '.okbm-cmt-btn .okbm-cmt-count{font-size:0.75rem;font-weight:800;color:#cbd5e1;font-family:\'Space Grotesk\',sans-serif;pointer-events:none;}' +
      '.okbm-cmt-btn.is-sm{padding:0;margin:0;gap:2px;}' +
      '.okbm-cmt-btn.is-sm svg{width:11px;height:11px;}' +
      '.okbm-cmt-btn.is-sm .okbm-cmt-count{font-size:0.58rem;}' +
      '.okbm-cmt-preview{display:block;width:100%;text-align:left;background:none;border:none;padding:4px 0 0;margin:0;cursor:pointer;font-family:inherit;' +
        'font-size:0.70rem;color:#cbd5e1;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,0.8);}' +
      '.okbm-cmt-preview b{font-weight:900;color:#fff;margin-right:4px;}' +
      // 낭만피드 글 칸은 3줄 높이로 고정이라, 댓글 한 줄이 있으면 글을 2줄로 줄여 자리를 낸다
      '.reel-memo-fixed-slot:has(.okbm-cmt-preview:not([hidden])) .reel-memo-fixed-box{-webkit-line-clamp:2 !important;line-clamp:2 !important;}' +
      '.okbm-cmt-preview span{color:#94a3b8;}' +
      // 아래 메뉴 줄(56px) 위에서 끝난다(박지 바꾸기 창과 같은 자리)
      '#okbmCommentSheet{position:fixed;top:0;left:0;right:0;bottom:calc(56px + env(safe-area-inset-bottom,8px));z-index:2147483646;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;}' +
      '#okbmCommentSheet .cm-box{width:100%;max-width:440px;height:64vh;height:64dvh;max-height:100%;background:#0c1017;border-top:1px solid rgba(255,255,255,0.14);' +
        'border-radius:18px 18px 0 0;box-sizing:border-box;display:flex;flex-direction:column;}' +
      '#okbmCommentSheet .cm-grip{width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,0.22);margin:8px auto 0;}' +
      '#okbmCommentSheet .cm-h{display:flex;justify-content:space-between;align-items:center;padding:10px 16px 8px;border-bottom:1px solid rgba(255,255,255,0.06);}' +
      '#okbmCommentSheet .cm-h b{font-size:0.9rem;color:#fff;font-weight:900;}' +
      '#okbmCommentSheet .cm-x{background:none;border:0;color:#94a3b8;font-size:1.1rem;cursor:pointer;padding:4px 6px;}' +
      '#okbmCommentSheet .cm-list{flex:1;min-height:0;overflow-y:auto;padding:10px 16px;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch;}' +
      '#okbmCommentSheet .cm-row{display:flex;gap:9px;align-items:flex-start;}' +
      '#okbmCommentSheet .cm-av{width:30px;height:30px;border-radius:50%;background:rgba(56,189,248,0.16);color:#7dd3fc;flex-shrink:0;display:flex;align-items:center;justify-content:center;' +
        'font-size:0.72rem;font-weight:900;border:0;padding:0;overflow:hidden;cursor:pointer;font-family:inherit;}' +
      '#okbmCommentSheet .cm-av img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '#okbmCommentSheet .cm-meta{font-size:0.70rem;color:#94a3b8;display:flex;gap:6px;align-items:center;flex-wrap:wrap;}' +
      '#okbmCommentSheet .cm-nick{color:#fff;font-weight:900;font-size:0.76rem;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;}' +
      '#okbmCommentSheet .cm-tag{color:#38bdf8;font-weight:800;}' +
      '#okbmCommentSheet .cm-del{background:none;border:0;color:#64748b;font-size:0.66rem;cursor:pointer;padding:0;font-family:inherit;}' +
      '#okbmCommentSheet .cm-body{font-size:0.82rem;color:#e2e8f0;line-height:1.5;margin-top:2px;word-break:break-word;white-space:pre-wrap;}' +
      '#okbmCommentSheet .cm-empty{padding:28px 8px;text-align:center;font-size:0.76rem;color:#64748b;line-height:1.6;}' +
      '#okbmCommentSheet .cm-foot{border-top:1px solid rgba(255,255,255,0.08);padding:10px 12px;display:flex;gap:8px;align-items:flex-end;}' +
      '#okbmCommentSheet textarea{flex:1;min-height:38px;max-height:96px;resize:none;border-radius:19px;border:1px solid rgba(255,255,255,0.16);background:rgba(255,255,255,0.05);' +
        'color:#fff;padding:9px 14px;font-size:16px;line-height:1.3;outline:none;box-sizing:border-box;font-family:inherit;}' +
      '#okbmCommentSheet .cm-send{height:38px;padding:0 14px;border-radius:19px;border:0;background:#38bdf8;color:#04121c;font-weight:900;font-size:0.8rem;cursor:pointer;font-family:inherit;flex-shrink:0;}' +
      '#okbmCommentSheet .cm-send[aria-busy="true"]{opacity:0.6;}' +
      '#okbmCommentSheet .cm-login{flex:1;height:40px;border-radius:20px;border:1px solid rgba(56,189,248,0.5);background:rgba(56,189,248,0.1);color:#7dd3fc;font-weight:900;font-size:0.8rem;cursor:pointer;font-family:inherit;}' +
      '#okbmCommentSheet .cm-err{font-size:0.7rem;color:#fda4af;padding:0 16px 6px;}';
    document.head.appendChild(st);
  }

  // 버튼은 피드를 그릴 때부터 보이므로 모양은 처음에 넣는다
  if (document.head) injectStyle();
  else document.addEventListener('DOMContentLoaded', injectStyle);

  // ---------- 1) 버튼·한 줄 그리기 ----------
  // size: 'sm'이면 정보창 카드용 작은 모양
  window.okbmFeedCommentBtnHtml = function (feedId, count, size) {
    var id = esc(cleanId(feedId));
    var n = Math.max(0, Number(count) || 0);
    return '<button type="button" class="okbm-cmt-btn' + (size === 'sm' ? ' is-sm' : '') + '" data-cmt-feed="' + id + '" aria-label="댓글 ' + n + '개">' +
      ICON_CMT + '<span class="okbm-cmt-count" data-cmt-count-for="' + id + '">' + n + '</span></button>';
  };

  window.okbmFeedCommentPreviewHtml = function (feedId, last, count) {
    var c = parseLast(last);
    var id = esc(cleanId(feedId));
    var n = Math.max(0, Number(count) || 0);
    var inner = c
      ? '<b>' + esc(c.nickname || '낭만루터') + '</b>' + esc(c.body) + (n > 1 ? ' <span>· 댓글 ' + n + '개</span>' : '')
      : '';
    return '<button type="button" class="okbm-cmt-preview" data-cmt-feed="' + id + '" data-cmt-preview-for="' + id + '"' + (c ? '' : ' hidden') + '>' + inner + '</button>';
  };

  function paintCounts(feedId, count, last) {
    var id = cleanId(feedId);
    var sel = CSS && CSS.escape ? CSS.escape(id) : id;
    document.querySelectorAll('[data-cmt-count-for="' + sel + '"]').forEach(function (el) {
      el.textContent = String(count);
      var btn = el.closest('.okbm-cmt-btn');
      if (btn) btn.setAttribute('aria-label', '댓글 ' + count + '개');
    });
    document.querySelectorAll('[data-cmt-preview-for="' + sel + '"]').forEach(function (el) {
      if (!last) { el.hidden = true; el.innerHTML = ''; return; }
      el.hidden = false;
      el.innerHTML = '<b>' + esc(last.nickname || '낭만루터') + '</b>' + esc(last.body) + (count > 1 ? ' <span>· 댓글 ' + count + '개</span>' : '');
    });
    // 지도 정보창 캐시에 든 피드도 맞춰 둔다(다시 그릴 때 옛 숫자가 나오지 않게)
    if (window.__spotFeedsCache && typeof window.__spotFeedsCache.forEach === 'function') {
      window.__spotFeedsCache.forEach(function (list) {
        (list || []).forEach(function (f) {
          if (f && cleanId(f.id) === id) { f.comments_count = count; f.last_comment = last; }
        });
      });
    }
  }

  // ---------- 2) 댓글 창 ----------
  var state = { feedId: '', rows: [], busy: false };

  function closeSheet() {
    var el = document.getElementById('okbmCommentSheet');
    if (el) el.remove();
    if (typeof window.unregisterModalClose === 'function') window.unregisterModalClose('okbmCommentSheet');
    state.feedId = '';
  }

  function renderList() {
    var list = document.querySelector('#okbmCommentSheet .cm-list');
    var title = document.querySelector('#okbmCommentSheet .cm-h b');
    if (!list) return;
    if (title) title.textContent = '댓글 ' + state.rows.length;
    if (!state.rows.length) {
      list.innerHTML = '<div class="cm-empty">아직 댓글이 없어요.<br>궁금한 점이나 응원을 남겨 보세요.</div>';
      return;
    }
    list.innerHTML = state.rows.map(function (r) {
      var nick = String(r.nickname || '낭만루터');
      var uid = String(r.user_id || '');
      var photo = avatarUrl(r.photo_url);
      // 사진·닉네임을 누르면 그 회원 피드 모아보기를 연다
      var who = ' data-cmt-user="' + esc(uid) + '" data-cmt-nick="' + esc(nick) + '"';
      return '<div class="cm-row">' +
        '<button type="button" class="cm-av"' + who + ' aria-label="' + esc(nick) + '님 피드 모아보기">' +
          (photo ? '<img src="' + esc(photo) + '" alt="" decoding="async" data-cmt-fallback="' + esc(nick.charAt(0)) + '">' : esc(nick.charAt(0))) +
        '</button>' +
        '<div style="min-width:0;flex:1;">' +
          '<div class="cm-meta"><button type="button" class="cm-nick"' + who + '>' + esc(nick) + '</button>' +
            (r.is_author ? '<span class="cm-tag">작성자</span>' : '') +
            '<span>' + esc(whenText(r.created_at)) + '</span>' +
            (r.can_delete ? '<button type="button" class="cm-del" data-cmt-del="' + esc(r.id) + '">삭제</button>' : '') +
          '</div>' +
          '<div class="cm-body">' + esc(r.body) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // 프로필 사진은 작게 받는다. R2 사진은 img.romanticroute.kr(Cloudflare 줄이기)로 96px(원본 145KB → 약 1KB),
  // 카카오·구글 사진은 원래 작아서 그대로 받는다. http 주소는 이 페이지에서 막혀서 https로 바꾼다.
  var R2_PUBLIC = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/';
  function avatarUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (u.indexOf('http://') === 0) u = 'https://' + u.slice(7);
    if (u.indexOf('https://') !== 0) return '';
    if (u.indexOf(R2_PUBLIC) === 0) {
      return 'https://img.romanticroute.kr/cdn-cgi/image/width=96,quality=70,fit=cover,format=auto/' + u.slice(R2_PUBLIC.length);
    }
    return u;
  }

  function lastOf(rows) {
    var r = rows[rows.length - 1];
    return r ? { nickname: r.nickname, body: String(r.body || '').slice(0, 60), at: r.created_at } : null;
  }

  function load(feedId) {
    var list = document.querySelector('#okbmCommentSheet .cm-list');
    if (list) list.innerHTML = '<div class="cm-empty">불러오는 중</div>';
    return rpc('get_feed_comments', { p_feed_id: feedId }).then(function (rows) {
      if (state.feedId !== feedId) return;
      state.rows = Array.isArray(rows) ? rows : [];
      renderList();
      var listEl = document.querySelector('#okbmCommentSheet .cm-list');
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    }).catch(function (e) {
      console.warn('[feed-comments.js:load]', e);
      if (list) list.innerHTML = '<div class="cm-empty">댓글을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</div>';
    });
  }

  function footHtml() {
    if (!loggedIn()) {
      return '<button type="button" class="cm-login" data-cmt-login="1">로그인하고 댓글 남기기</button>';
    }
    return '<textarea maxlength="300" rows="1" placeholder="댓글 달기" aria-label="댓글 내용"></textarea>' +
      '<button type="button" class="cm-send" data-cmt-send="1">등록</button>';
  }

  window.okbmOpenFeedComments = function (feedId) {
    var id = cleanId(feedId);
    if (!id) return;
    if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_feed_comment_open'); // 기능 사용 세기 (H8)
    injectStyle();
    closeSheet();
    state.feedId = id;
    state.rows = [];
    var wrap = document.createElement('div');
    wrap.id = 'okbmCommentSheet';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', '댓글');
    wrap.innerHTML = '<div class="cm-box">' +
      '<div class="cm-grip" aria-hidden="true"></div>' +
      '<div class="cm-h"><b>댓글</b><button type="button" class="cm-x" data-cmt-close="1" aria-label="댓글 닫기">✕</button></div>' +
      '<div class="cm-list"></div>' +
      '<div class="cm-err" hidden></div>' +
      '<div class="cm-foot">' + footHtml() + '</div>' +
    '</div>';
    document.body.appendChild(wrap);
    if (typeof window.registerModalOpen === 'function') window.registerModalOpen('okbmCommentSheet', closeSheet);
    load(id);
  };

  function showErr(msg) {
    var el = document.querySelector('#okbmCommentSheet .cm-err');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function send() {
    var ta = document.querySelector('#okbmCommentSheet textarea');
    var btn = document.querySelector('#okbmCommentSheet .cm-send');
    if (!ta || state.busy) return;
    var body = String(ta.value || '').trim();
    if (!body) { showErr('댓글 내용을 적어 주세요.'); ta.focus(); return; }
    var feedId = state.feedId;
    state.busy = true;
    if (btn) btn.setAttribute('aria-busy', 'true');
    showErr('');
    if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_feed_comment_send'); // 기능 사용 세기 (H8)
    rpc('add_feed_comment', { p_feed_id: feedId, p_body: body }).then(function (res) {
      ta.value = '';
      var count = (res && typeof res.comments_count === 'number') ? res.comments_count : state.rows.length + 1;
      return load(feedId).then(function () {
        paintCounts(feedId, count, lastOf(state.rows));
      });
    }).catch(function (e) {
      var m = String((e && (e.message || e.details)) || '');
      if (m.indexOf('rate limited') !== -1) showErr('댓글을 너무 빨리 달고 있어요. 1분 뒤에 다시 해 주세요.');
      else if (m.indexOf('blocked') !== -1) showErr('이 피드에는 댓글을 달 수 없어요.');
      else if (m.indexOf('not authenticated') !== -1) showErr('로그인이 풀렸어요. 다시 로그인해 주세요.');
      else showErr('댓글을 올리지 못했어요. 잠시 후 다시 해 주세요.');
      console.warn('[feed-comments.js:send]', e);
    }).then(function () {
      state.busy = false;
      if (btn) btn.removeAttribute('aria-busy');
    });
  }

  function removeComment(commentId) {
    if (!window.confirm('이 댓글을 지울까요?')) return;
    var feedId = state.feedId;
    rpc('delete_feed_comment', { p_id: Number(commentId) }).then(function (res) {
      state.rows = state.rows.filter(function (r) { return String(r.id) !== String(commentId); });
      renderList();
      var count = (res && typeof res.comments_count === 'number') ? res.comments_count : state.rows.length;
      paintCounts(feedId, count, lastOf(state.rows));
      toast('댓글을 지웠어요.', 'success', 1600);
    }).catch(function (e) {
      console.warn('[feed-comments.js:delete]', e);
      toast('댓글을 지우지 못했어요.', 'error');
    });
  }

  // 한 곳에서 모두 받는다. 피드 화면의 다른 클릭(사진 뒤집기·카드 열기)보다 먼저 잡는다.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var sheet = document.getElementById('okbmCommentSheet');
    if (sheet && sheet.contains(t)) {
      if (t === sheet) { closeSheet(); return; }
      if (t.closest('[data-cmt-close]')) { closeSheet(); return; }
      if (t.closest('[data-cmt-send]')) { send(); return; }
      var who = t.closest('[data-cmt-user]');
      if (who) {
        var uid = who.getAttribute('data-cmt-user') || '';
        var nick = who.getAttribute('data-cmt-nick') || '';
        if (!uid || typeof window.openUserFeedCollectionModal !== 'function') return;
        closeSheet();
        if (typeof window.okbmMetric === 'function') window.okbmMetric('feat_user_feed_open'); // 기능 사용 세기 (H8)
        window.openUserFeedCollectionModal(nick, uid, 'route');
        return;
      }
      var del = t.closest('[data-cmt-del]');
      if (del) { removeComment(del.getAttribute('data-cmt-del')); return; }
      if (t.closest('[data-cmt-login]')) {
        closeSheet();
        if (typeof window.openLoginModal === 'function') window.openLoginModal({ message: '로그인하면 댓글을 남길 수 있어요.' });
      }
      return;
    }
    var opener = t.closest('[data-cmt-feed]');
    if (!opener) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    window.okbmOpenFeedComments(opener.getAttribute('data-cmt-feed'));
  }, true);

  // 프로필 사진을 못 받으면 이름 첫 글자로 바꾼다(error는 올라오지 않아 capture로 받는다, onerror 속성은 CSP가 막는다)
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.hasAttribute('data-cmt-fallback')) return;
    var holder = img.parentNode;
    if (holder) holder.textContent = img.getAttribute('data-cmt-fallback') || '';
  }, true);

  document.addEventListener('keydown', function (e) {
    if (!state.feedId) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    // 휴대폰 키보드의 줄바꿈은 그대로 두고, 컴퓨터에서 Enter만 누르면 등록
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target && e.target.matches && e.target.matches('#okbmCommentSheet textarea')) {
      if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); send(); }
    }
  });

  // ---------- 3) 알림에서 들어온 경우 ----------
  function bootFromParam() {
    try {
      var p = new URLSearchParams(window.location.search);
      var feedId = p.get('feed');
      if (!feedId || p.get('comments') !== '1') return;
      // 피드 화면(okbmBootDirectFeedParam, 0.4초 뒤)이 먼저 열리고 그 위에 댓글 창을 띄운다
      setTimeout(function () { window.okbmOpenFeedComments(feedId); }, 1200);
    } catch (e) { console.warn('[feed-comments.js:bootFromParam]', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootFromParam);
  else bootFromParam();
})();
