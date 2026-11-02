-- =========================================================================
-- H34: 낭만 포인트 — 지난 활동 소급 (2026-11-02, SQL Editor에서 한 번 실행함. 다시 실행하지 말 것)
--
-- 왜: 대표님 11-02 "피드 올린 거, 별 준 거, 댓글 단 것까지 다 해서 회원별로 포인트 넣어 놔".
-- 어떻게: 지금 규칙(H31·H32)을 지난 활동(9-17부터)에 그대로 적용한다. 하루 상한은 그 활동을 한 날(한국 시간)로 센다.
--   피드·플로깅·피드/게시판 댓글·별 누르기/받기·게시판 글·투표·한 줄 후기·별점 후기. 출석은 기록이 없어 뺐다.
--   관리자(is_admin)와 공식 계정 '낭만루트'는 뺐다. 이미 장부에 있는 대상은 건너뛴다.
--   created_at은 활동한 때로 넣어 '오늘 받은 점수'에 섞이지 않게 했다. note는 '소급 2026-11-02'(댓글·별점 후기는 회수용으로 글 id).
-- 결과: 128명, 502건, 2,036점. 넣은 뒤 하루 상한을 넘은 날 0건 확인.
--   주의: 다시 실행하면 이미 넣은 몫을 그날 상한에 세지 않아 84건이 더 들어간다.
-- 되돌리기: DELETE FROM public.point_ledger WHERE created_at < '2026-11-02 00:00+09' AND (note = '소급 2026-11-02' OR reason IN ('comment','review'));
-- =========================================================================
WITH base AS (
  -- 피드 10(하루 30), 플로깅 +20(하루 40)
  SELECT f.user_id, 'feed' reason, f.id ref_id, 10 pts, 30 cap, f.created_at act_at, '소급 2026-11-02' note
    FROM public.feeds f WHERE COALESCE(f.is_published,false) AND jsonb_typeof(f.photos)='array' AND jsonb_array_length(f.photos)>0
  UNION ALL
  SELECT f.user_id, 'plog', f.id, 20, 40, f.created_at, '소급 2026-11-02'
    FROM public.feeds f WHERE COALESCE(f.is_published,false) AND jsonb_typeof(f.photos)='array' AND jsonb_array_length(f.photos)>0
     AND btrim(COALESCE(f.plogging_photo,''))<>''
  UNION ALL
  -- 피드 댓글 5(하루 30, 게시판 댓글과 합쳐), 남의 피드·5자 이상·한 피드 첫 댓글
  SELECT * FROM (SELECT DISTINCT ON (c.user_id, c.feed_id) c.user_id, 'comment', c.feed_id, 5, 30, c.created_at, c.id::text
    FROM public.feed_comments c JOIN public.feeds f ON f.id=c.feed_id
   WHERE f.user_id<>c.user_id AND char_length(btrim(COALESCE(c.body,'')))>=5
   ORDER BY c.user_id, c.feed_id, c.created_at) fc
) , base2 AS (
  SELECT * FROM base
  UNION ALL
  SELECT * FROM (SELECT DISTINCT ON (c.user_id, c.post_id) c.user_id, 'comment', 'lp:'||c.post_id::text, 5, 30, c.created_at, c.id::text
    FROM public.lounge_post_comments c JOIN public.lounge_posts p ON p.id=c.post_id
   WHERE p.user_id<>c.user_id AND char_length(btrim(COALESCE(c.body,'')))>=5
   ORDER BY c.user_id, c.post_id, c.created_at) lc
  UNION ALL
  -- 별 누르기 2(하루 20), 별 받기 1(하루 20)
  SELECT l.user_id, 'star_give', l.feed_id, 2, 20, l.created_at, '소급 2026-11-02'
    FROM public.feed_likes l JOIN public.feeds f ON f.id=l.feed_id WHERE f.user_id<>l.user_id
  UNION ALL
  SELECT f.user_id, 'star_get', l.feed_id||':'||l.user_id, 1, 20, l.created_at, '소급 2026-11-02'
    FROM public.feed_likes l JOIN public.feeds f ON f.id=l.feed_id WHERE f.user_id<>l.user_id
  UNION ALL
  -- 게시판 글·투표 5(하루 10), 투표 참여 2(하루 10)
  SELECT p.user_id, 'post', p.id::text, 5, 10, p.created_at, '소급 2026-11-02'
    FROM public.lounge_posts p WHERE NOT COALESCE(p.is_private,false)
  UNION ALL
  SELECT v.user_id, 'vote', v.post_id::text, 2, 10, v.created_at, '소급 2026-11-02' FROM public.lounge_poll_votes v
  UNION ALL
  -- 한 줄 후기 5(하루 15), 별점 후기 5(하루 15) — 박지마다 한 번
  SELECT t.user_id, 'tip', t.spot_id, 5, 15, COALESCE(t.created_at,t.updated_at), '소급 2026-11-02'
    FROM public.okbm_spot_tips t WHERE char_length(btrim(COALESCE(t.note,'')))>=5
  UNION ALL
  SELECT * FROM (SELECT DISTINCT ON (r.user_id, r.spot_id) r.user_id, 'review', r.spot_id, 5, 15, r.created_at, r.id::text
    FROM public.comments r WHERE r.spot_id IS NOT NULL ORDER BY r.user_id, r.spot_id, r.created_at) rv
), cand AS (
  SELECT b.*, (b.act_at AT TIME ZONE 'Asia/Seoul')::date AS kday
    FROM base2 b JOIN public.users u ON u.id=b.user_id
   WHERE NOT COALESCE(u.is_admin,false) AND u.nickname IS DISTINCT FROM '낭만루트'
     AND NOT EXISTS (SELECT 1 FROM public.point_ledger x WHERE x.user_id=b.user_id AND x.reason=b.reason AND x.ref_id=b.ref_id)
), ranked AS (
  SELECT c.*,
    sum(c.pts) OVER (PARTITION BY c.user_id, c.reason, c.kday ORDER BY c.act_at, c.ref_id ROWS UNBOUNDED PRECEDING)
    + CASE WHEN c.kday = (now() AT TIME ZONE 'Asia/Seoul')::date THEN
        (SELECT COALESCE(sum(x.delta),0) FROM public.point_ledger x WHERE x.user_id=c.user_id AND x.reason=c.reason
          AND x.delta>0 AND x.created_at >= public.okbm_point_day_start()) ELSE 0 END AS run
    FROM cand c
), final AS (SELECT * FROM ranked WHERE run <= cap)
, ins AS (
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note, created_at)
  SELECT user_id, pts, reason, ref_id, note, act_at FROM final
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING
  RETURNING user_id, delta)
SELECT count(*) AS rows_in, count(DISTINCT user_id) AS members, sum(delta) AS pts FROM ins;
