-- =========================================================================
-- I28: 라운지 추천순 · 좋아요 알림 · 좋아요 포인트 · 장비 이름 묶기 (2026-11-16, 대표님 시연 보고 정함)
-- 설계: TASK_LOUNGE_HOT.md, 시연 .claude/mockups/lounge-hot/시연-1~8
--
-- 1) okbm_lounge_hot(cat, limit): 자유게시판 추천순. 최근 30일 공개 글(고정 글·건의·장비 질문 빼고)을
--    좋아요 많은 순 → 댓글 많은 순 → 최근 순. '전체'는 장비 후기를 위 10개 안에 3개까지만 두고 넘는 것은 10위 뒤로.
--    앱 화면과 운영 작업(매거진·카드뉴스)이 같은 순서를 쓴다.
-- 2) 좋아요 알림(kind 'lounge_like'): 한 글에 한 줄. 'OO님이 내 글을 좋아해요' / 'OO님 외 N명이 내 글을 좋아해요'.
--    새 좋아요가 오면 같은 줄을 안 읽음으로 맨 위에 다시 올린다. 내 글에 내가 누른 것·공식 계정 글·비공개 글은 안 보낸다.
--    추천순 1~3위에 처음 들면(kind 'lounge_top') '내 글이 라운지 인기 N위에 올랐어요' 한 번.
-- 3) 낭만 포인트: 받은 사람 'like_get' 1점(하루 20), 누른 사람 2점(피드 '별 누르기'와 같은 칸 star_give, 하루 20을 합쳐 셈).
--    남의 글만. 좋아요를 풀면 둘 다 되돌린다(피드 별과 같음).
-- 4) 지난 좋아요 소급(받은 쪽만, 대표님 11-16 '지난 것도 소급'): 좋아요를 누른 날(한국 시간) 기준 하루 20점.
--    H34처럼 관리자와 공식 계정 '낭만루트'는 뺀다. 알림은 보내지 않는다. 맨 아래 따로 한 번만 실행.
-- 5) okbm_gear_board: 장비 목록에서 고르지 않고 이름을 적은 후기는 띄어쓰기·대소문자를 무시해 한 장비로 묶고,
--    묶인 이름들(names)을 같이 돌려준다(앱이 장비 창에서 그 이름들의 글을 모두 받는다).
-- 적용: Supabase SQL 편집기에서 1~5를 실행. 1~3·5는 여러 번 실행해도 안전, 4(소급)는 한 번만.
-- 실행(11-16): 1~3·5 실행 끝. 4 소급 결과 35건·9명·35점. 시험(되돌림): 좋아요 → 'OO님 외 N명' 알림·받은 1점·누른 2점,
--   취소 → 둘 다 되돌림, 6→7개가 되어 2위에 든 글은 '인기 2위' 알림 한 번, 추천순 장비 후기 세 개 제한, 스위프트 ul2 두 이름 묶임.
-- =========================================================================

-- 1) 추천순 -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_lounge_hot(p_cat text DEFAULT 'all', p_limit integer DEFAULT 50)
RETURNS SETOF public.lounge_posts
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT p AS r, p.category,
           row_number() OVER (ORDER BY p.likes_count DESC, p.comments_count DESC, p.created_at DESC) AS rn
      FROM public.lounge_posts p
     WHERE p.created_at >= now() - interval '30 days'
       AND NOT COALESCE(p.is_private, false)
       AND NOT COALESCE(p.is_pinned, false)
       AND p.category <> 'suggestion'
       AND (p.category <> 'gear' OR p.gear_kind = 'review')
       AND (COALESCE(p_cat, 'all') = 'all' OR p.category = p_cat)
  ), g AS (
    SELECT b.*,
           CASE WHEN b.category = 'gear' THEN row_number() OVER (PARTITION BY b.category = 'gear' ORDER BY b.rn) END AS grn
      FROM base b
  ), cut AS (
    -- '전체'에서 장비 후기 네 번째부터는 장비 아닌 글·앞 세 장비가 10개 찬 뒤로 민다
    SELECT g.*, (COALESCE(p_cat, 'all') = 'all' AND COALESCE(g.grn, 0) > 3) AS extra FROM g
  ), tenth AS (
    SELECT COALESCE((SELECT rn FROM cut WHERE NOT extra ORDER BY rn OFFSET 9 LIMIT 1),
                    (SELECT max(rn) FROM cut WHERE NOT extra), 0) AS rn
  )
  SELECT (c.r).*
    FROM cut c, tenth t
   ORDER BY CASE WHEN c.extra THEN GREATEST(c.rn, t.rn) + 0.5 ELSE c.rn END
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_hot(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_lounge_hot(text, integer) TO anon, authenticated;

-- 2)·3) 좋아요가 눌리거나 풀릴 때: 알림과 포인트 ---------------------------------
-- 좋아요 수(likes_count)는 F1의 trg_lounge_post_likes_after가 먼저 바꾼다(트리거는 이름순: after < notify).
CREATE OR REPLACE FUNCTION public.okbm_lounge_like_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner text;
  v_title text;
  v_private boolean;
  v_nick text;
  v_others integer;
  v_rank integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT p.user_id INTO v_owner FROM public.lounge_posts p WHERE p.id = OLD.post_id;
    IF v_owner IS NULL THEN
      SELECT l.user_id INTO v_owner FROM public.point_ledger l
       WHERE l.reason = 'like_get' AND l.ref_id = OLD.post_id::text || ':' || OLD.user_id LIMIT 1;
    END IF;
    PERFORM public.okbm_point_revoke(OLD.user_id, 'star_give', 'lp:' || OLD.post_id::text);
    IF v_owner IS NOT NULL THEN
      PERFORM public.okbm_point_revoke(v_owner, 'like_get', OLD.post_id::text || ':' || OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;

  SELECT p.user_id, p.title, COALESCE(p.is_private, false) INTO v_owner, v_title, v_private
    FROM public.lounge_posts p WHERE p.id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id OR v_private THEN RETURN NEW; END IF;

  -- 포인트: 받은 사람 1점(하루 20), 누른 사람 2점(별 누르기와 합쳐 하루 20)
  PERFORM public.okbm_point_award(v_owner, 'like_get', NEW.post_id::text || ':' || NEW.user_id, 1, 20);
  PERFORM public.okbm_point_award(NEW.user_id, 'star_give', 'lp:' || NEW.post_id::text, 2, 20);

  IF v_owner = 'official_romanticroute' THEN RETURN NEW; END IF;

  -- 알림: 한 글에 한 줄. 이름은 마지막으로 누른 분, '외 N명'은 쓴 사람·누른 사람을 뺀 나머지
  SELECT NULLIF(btrim(u.nickname), '') INTO v_nick FROM public.users u WHERE u.id = NEW.user_id;
  SELECT count(*)::int INTO v_others FROM public.lounge_post_likes l
   WHERE l.post_id = NEW.post_id AND l.user_id <> NEW.user_id AND l.user_id <> v_owner;
  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
  ) VALUES (
    'ln_l_' || NEW.post_id::text, v_owner, 'lounge_like',
    COALESCE(v_nick, '낭만루터') || '님' || CASE WHEN v_others > 0 THEN ' 외 ' || v_others || '명이' ELSE '이' END || ' 내 글을 좋아해요',
    left(COALESCE(v_title, ''), 80), NEW.post_id::text, '', '', false, NEW.user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title, body = EXCLUDED.body, actor_id = EXCLUDED.actor_id,
    is_read = false, created_at = now();

  -- 추천순 1~3위에 처음 들면 한 번
  SELECT h.ordinality::int INTO v_rank
    FROM public.okbm_lounge_hot('all', 3) WITH ORDINALITY AS h
   WHERE h.id = NEW.post_id;
  IF v_rank IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
    ) VALUES (
      'ln_top_' || NEW.post_id::text, v_owner, 'lounge_top',
      '내 글이 라운지 인기 ' || v_rank || '위에 올랐어요', left(COALESCE(v_title, ''), 80), NEW.post_id::text, '', '', false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_like_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_likes_notify ON public.lounge_post_likes;
CREATE TRIGGER trg_lounge_post_likes_notify
  AFTER INSERT OR DELETE ON public.lounge_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_like_notify();

-- 5) 장비 목록: 이름만 다른 같은 장비 묶기 ------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_gear_board(p_q text DEFAULT '', p_cat text DEFAULT 'all', p_sort text DEFAULT 'count', p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT p.id, p.gear_id, p.gear_name, p.gear_cat, p.gear_review, p.created_at,
           COALESCE(p.gear_id, 'n:' || lower(regexp_replace(p.gear_name, '\s+', '', 'g'))) AS gkey
      FROM public.lounge_posts p
     WHERE p.category = 'gear' AND p.gear_review IS NOT NULL AND p.gear_name IS NOT NULL
       AND NOT COALESCE(p.is_private, false)
  ), g AS (
    SELECT gkey,
           max(gear_id) AS gear_id,
           (array_agg(gear_name ORDER BY created_at DESC))[1] AS gear_name,
           array_agg(DISTINCT gear_name) AS names,
           (array_agg(gear_cat ORDER BY created_at DESC))[1] AS gear_cat,
           (array_agg(gear_review ->> 'kind' ORDER BY created_at DESC))[1] AS kind,
           count(*)::int AS n,
           round(avg((gear_review ->> 'rating')::numeric), 1) AS avg,
           max(created_at) AS last_at,
           (array_agg(gear_review ->> 'photo' ORDER BY created_at DESC) FILTER (WHERE gear_review ->> 'photo' LIKE 'https://%'))[1] AS photo
      FROM r GROUP BY gkey
  ), tags AS (
    SELECT r.gkey, t.tag, count(*)::int AS c, min(t.ord) AS o
      FROM r, jsonb_array_elements_text(CASE WHEN jsonb_typeof(r.gear_review -> 'pros') = 'array' THEN r.gear_review -> 'pros' ELSE '[]'::jsonb END) WITH ORDINALITY AS t(tag, ord)
     GROUP BY r.gkey, t.tag
  ), rows AS (
    SELECT g.*, gs.weight_g, gs.brand,
           (SELECT tg.tag FROM tags tg WHERE tg.gkey = g.gkey ORDER BY tg.c DESC, tg.o, tg.tag LIMIT 1) AS top_pro,
           (SELECT tg.c FROM tags tg WHERE tg.gkey = g.gkey ORDER BY tg.c DESC, tg.o, tg.tag LIMIT 1) AS top_pro_n
      FROM g LEFT JOIN public.gears gs ON gs.id = g.gear_id
     WHERE (COALESCE(p_cat, 'all') = 'all'
            OR (p_cat = 'bag' AND g.gear_cat = 'sleep' AND COALESCE(g.kind, 'bag') <> 'mat')
            OR (p_cat = 'mat' AND g.gear_cat = 'sleep' AND g.kind = 'mat')
            OR (p_cat NOT IN ('bag', 'mat') AND g.gear_cat = p_cat))
       AND NOT EXISTS (
         SELECT 1 FROM regexp_split_to_table(lower(btrim(COALESCE(p_q, ''))), '\s+') w
          WHERE w <> '' AND position(w IN lower(g.gear_name || ' ' || COALESCE(gs.brand, ''))) = 0)
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY
           CASE WHEN p_sort = 'rating' THEN x.avg END DESC NULLS LAST,
           CASE WHEN p_sort = 'recent' THEN x.last_at END DESC NULLS LAST,
           x.n DESC, x.avg DESC, x.last_at DESC), '[]'::jsonb)
    FROM (SELECT * FROM rows ORDER BY
           CASE WHEN p_sort = 'rating' THEN avg END DESC NULLS LAST,
           CASE WHEN p_sort = 'recent' THEN last_at END DESC NULLS LAST,
           n DESC, avg DESC, last_at DESC
          LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200)) x;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_board(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_gear_board(text, text, text, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 4) 지난 좋아요 소급 (한 번만 실행. 1~3·5와 따로 실행) -------------------------------
-- 되돌리기: DELETE FROM public.point_ledger WHERE reason = 'like_get' AND note = '소급 2026-11-16';
-- WITH cand AS (
--   SELECT p.user_id, l.post_id::text || ':' || l.user_id AS ref_id, l.created_at AS act_at,
--          (l.created_at AT TIME ZONE 'Asia/Seoul')::date AS kday
--     FROM public.lounge_post_likes l
--     JOIN public.lounge_posts p ON p.id = l.post_id
--     JOIN public.users u ON u.id = p.user_id
--    WHERE p.user_id <> l.user_id AND NOT COALESCE(p.is_private, false)
--      AND NOT COALESCE(u.is_admin, false) AND u.nickname IS DISTINCT FROM '낭만루트'
--      AND NOT EXISTS (SELECT 1 FROM public.point_ledger x WHERE x.user_id = p.user_id AND x.reason = 'like_get'
--                       AND x.ref_id = l.post_id::text || ':' || l.user_id)
-- ), ranked AS (
--   SELECT c.*, count(*) OVER (PARTITION BY c.user_id, c.kday ORDER BY c.act_at, c.ref_id ROWS UNBOUNDED PRECEDING)
--          + (SELECT COALESCE(sum(x.delta), 0) FROM public.point_ledger x WHERE x.user_id = c.user_id AND x.reason = 'like_get'
--              AND x.delta > 0 AND (x.created_at AT TIME ZONE 'Asia/Seoul')::date = c.kday) AS run
--     FROM cand c
-- ), ins AS (
--   INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note, created_at)
--   SELECT user_id, 1, 'like_get', ref_id, '소급 2026-11-16', act_at FROM ranked WHERE run <= 20
--   ON CONFLICT (user_id, reason, ref_id) DO NOTHING
--   RETURNING user_id, delta)
-- SELECT count(*) AS rows_in, count(DISTINCT user_id) AS members, sum(delta) AS pts FROM ins;
