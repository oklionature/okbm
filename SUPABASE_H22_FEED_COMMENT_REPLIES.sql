-- H22: 피드 댓글에 답글(대댓글)을 단다. 답글 알림은 답한 그 댓글 쓴 사람에게만 간다.
-- 예전(H17·H21)엔 댓글이 달리면 그 피드에 전에 댓글 단 사람 모두에게 'feed_reply' 알림이 가서, 나와 상관없는 대화에도 알림이 왔다.
--   1) feed_comments에 parent_id(묶음 맨 위 댓글)·reply_to_user_id·reply_to_nickname(답한 사람)을 둔다.
--      답글에 다시 답글을 달아도 한 단계로 묶는다: parent_id는 늘 맨 위 댓글, 알림은 지금 답한 그 댓글 쓴 사람.
--      맨 위 댓글을 지우면 그 밑 답글도 같이 지워진다.
--   2) add_feed_comment(p_feed_id, p_body, p_reply_to): p_reply_to는 답할 댓글 id(없으면 그냥 댓글). 예전 앱(인자 두 개)도 그대로 된다.
--   3) get_feed_comments: parent_id·reply_to_nickname을 더 돌려준다.
--   4) 알림: 피드 주인은 지금처럼 모든 댓글·답글 알림. 답글이면 답한 사람에게 'feed_reply' 한 줄(id = pn_feed_reply_ || 댓글 id).
--      전에 댓글 단 사람 모두에게 가던 알림은 없앤다. 이미 받은 예전 알림(pn_feed_reply_ || md5)은 그대로 둔다.
-- 되돌리기: H21의 okbm_feed_comments_sync, H17의 get_feed_comments·add_feed_comment(text, text)를 다시 실행하고
--   DROP FUNCTION public.add_feed_comment(text, text, bigint);
--   ALTER TABLE public.feed_comments DROP COLUMN parent_id, DROP COLUMN reply_to_user_id, DROP COLUMN reply_to_nickname;

-- 1) 칸 ------------------------------------------------------------------------
ALTER TABLE public.feed_comments ADD COLUMN IF NOT EXISTS parent_id bigint REFERENCES public.feed_comments (id) ON DELETE CASCADE;
ALTER TABLE public.feed_comments ADD COLUMN IF NOT EXISTS reply_to_user_id text;
ALTER TABLE public.feed_comments ADD COLUMN IF NOT EXISTS reply_to_nickname text;
CREATE INDEX IF NOT EXISTS feed_comments_parent_idx ON public.feed_comments (parent_id) WHERE parent_id IS NOT NULL;

-- 2) 댓글 달기 ------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.add_feed_comment(text, text);
CREATE OR REPLACE FUNCTION public.add_feed_comment(p_feed_id text, p_body text, p_reply_to bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := public.okbm_uid();
  v_body text := btrim(regexp_replace(COALESCE(p_body, ''), '\s+', ' ', 'g'));
  v_owner text;
  v_published boolean;
  v_nick text;
  v_id bigint;
  v_count integer;
  v_parent bigint;
  v_to_user text;
  v_to_nick text;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF char_length(v_body) < 1 THEN
    RAISE EXCEPTION 'empty comment';
  END IF;
  v_body := left(v_body, 300);
  SELECT f.user_id, f.is_published INTO v_owner, v_published FROM public.feeds f WHERE f.id = btrim(p_feed_id);
  IF v_owner IS NULL OR (NOT COALESCE(v_published, false) AND v_owner <> v_actor) THEN
    RAISE EXCEPTION 'feed not found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = v_owner AND b.blocked_id = v_actor) THEN
    RAISE EXCEPTION 'blocked';
  END IF;
  -- 답할 댓글은 같은 피드 것이어야 한다. 묶음은 늘 맨 위 댓글 하나 밑으로.
  IF p_reply_to IS NOT NULL THEN
    SELECT COALESCE(c.parent_id, c.id), c.user_id, c.nickname INTO v_parent, v_to_user, v_to_nick
    FROM public.feed_comments c WHERE c.id = p_reply_to AND c.feed_id = btrim(p_feed_id);
    IF v_parent IS NULL THEN
      RAISE EXCEPTION 'reply target not found';
    END IF;
  END IF;
  IF NOT public.okbm_actor_rate_limit(v_actor, 'add_feed_comment', 5) THEN
    RAISE EXCEPTION 'rate limited';
  END IF;
  SELECT COALESCE(NULLIF(btrim(u.nickname), ''), '낭만루터') INTO v_nick FROM public.users u WHERE u.id = v_actor;

  INSERT INTO public.feed_comments (feed_id, user_id, nickname, body, parent_id, reply_to_user_id, reply_to_nickname)
  VALUES (btrim(p_feed_id), v_actor, COALESCE(v_nick, '낭만루터'), v_body, v_parent, v_to_user, v_to_nick)
  RETURNING id INTO v_id;

  SELECT comments_count INTO v_count FROM public.feeds WHERE id = btrim(p_feed_id);
  RETURN jsonb_build_object('success', true, 'id', v_id, 'comments_count', COALESCE(v_count, 0), 'nickname', COALESCE(v_nick, '낭만루터'));
END;
$$;
REVOKE ALL ON FUNCTION public.add_feed_comment(text, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_feed_comment(text, text, bigint) TO authenticated;

-- 3) 댓글 읽기 ------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_feed_comments(text);
CREATE OR REPLACE FUNCTION public.get_feed_comments(p_feed_id text)
RETURNS TABLE (id bigint, user_id text, nickname text, photo_url text, body text, created_at timestamptz,
               is_author boolean, is_mine boolean, can_delete boolean, parent_id bigint, reply_to_nickname text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT public.okbm_uid() AS uid, public.okbm_is_admin() AS admin)
  SELECT c.id, c.user_id, c.nickname, NULLIF(btrim(u.photo_url), '') AS photo_url, c.body, c.created_at,
         (c.user_id = f.user_id) AS is_author,
         (me.uid IS NOT NULL AND c.user_id = me.uid) AS is_mine,
         (me.uid IS NOT NULL AND (c.user_id = me.uid OR f.user_id = me.uid)) OR COALESCE(me.admin, false) AS can_delete,
         c.parent_id, c.reply_to_nickname
  FROM public.feed_comments c
  JOIN public.feeds f ON f.id = c.feed_id
  LEFT JOIN public.users u ON u.id = c.user_id
  CROSS JOIN me
  WHERE c.feed_id = btrim(p_feed_id)
    AND (f.is_published OR f.user_id = me.uid)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE me.uid IS NOT NULL AND b.blocker_id = me.uid AND b.blocked_id = c.user_id
    )
  ORDER BY c.created_at, c.id
  LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.get_feed_comments(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_comments(text) TO anon, authenticated;

-- 4) 알림 트리거 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_feed_comments_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_feed_id text := CASE WHEN TG_OP = 'DELETE' THEN OLD.feed_id ELSE NEW.feed_id END;
  v_owner text;
  v_spot text;
  v_spot_id text;
BEGIN
  UPDATE public.feeds f SET
    comments_count = (SELECT count(*) FROM public.feed_comments c WHERE c.feed_id = v_feed_id),
    last_comment = (
      SELECT jsonb_build_object('nickname', c.nickname, 'body', left(c.body, 60), 'at', c.created_at)
      FROM public.feed_comments c
      WHERE c.feed_id = v_feed_id
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 1
    )
  WHERE f.id = v_feed_id
  RETURNING f.user_id, f.spot, f.spot_id::text INTO v_owner, v_spot, v_spot_id;

  -- 피드 주인: 모든 댓글·답글. 주인 댓글에 단 답글이면 제목만 답글로.
  IF TG_OP = 'INSERT' AND v_owner IS NOT NULL AND v_owner <> NEW.user_id
     AND v_owner <> 'official_romanticroute' THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
    ) VALUES (
      'pn_feed_comment_' || NEW.id, v_owner, 'feed_comment',
      CASE WHEN NEW.reply_to_user_id = v_owner
        THEN NEW.nickname || '님이 내 댓글에 답글을 남겼어요'
        ELSE NEW.nickname || '님이 댓글을 남겼어요'
      END,
      left(NEW.body, 80), v_feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false, NEW.user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 답글: 답한 그 댓글 쓴 사람에게만(주인은 위에서 받았고, 자기 댓글에 단 답글은 빼고, 답글 쓴 사람을 차단했으면 빼고)
  IF TG_OP = 'INSERT' AND v_owner IS NOT NULL AND NEW.reply_to_user_id IS NOT NULL
     AND NEW.reply_to_user_id <> NEW.user_id AND NEW.reply_to_user_id <> v_owner
     AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = NEW.reply_to_user_id AND b.blocked_id = NEW.user_id) THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
    ) VALUES (
      'pn_feed_reply_' || NEW.id, NEW.reply_to_user_id, 'feed_reply',
      NEW.nickname || '님이 내 댓글에 답글을 남겼어요',
      left(NEW.body, 80), v_feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false, NEW.user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_notifications
    WHERE id IN ('pn_feed_comment_' || OLD.id, 'pn_feed_reply_' || OLD.id);
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- 확인: 새 칸과 함수
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feed_comments'
     AND column_name IN ('parent_id', 'reply_to_user_id', 'reply_to_nickname')) AS new_cols,
  (SELECT string_agg(p.oid::regprocedure::text, ', ') FROM pg_proc p WHERE p.proname IN ('add_feed_comment', 'get_feed_comments')) AS fns;
