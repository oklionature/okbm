-- H23: 피드 댓글 수정 (2026-10-29)
-- 왜: 댓글을 달면 지우기만 되고 고칠 수가 없어, 오타 하나에도 지우고 다시 달아야 했다(답글이 달려 있으면 같이 지워짐).
-- 어떻게:
--   1) feed_comments에 edited_at(마지막으로 고친 때)을 둔다. 화면은 고친 댓글에 '수정됨'을 붙인다.
--   2) update_feed_comment(p_id, p_body): 쓴 사람만 고친다(피드 주인·관리자는 지우기만). 1분에 10번까지.
--      글 정리는 add_feed_comment와 같다(공백 한 칸으로, 300자까지). 이 댓글로 간 알림 한 줄도 새 글로 바꾼다.
--   3) 고치면 트리거가 피드의 최근 댓글 한 줄(last_comment)을 다시 맞춘다. 알림 새로 보내기는 INSERT 때만이라 고쳐도 알림은 안 간다.
--   4) get_feed_comments가 edited_at도 돌려준다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: H22의 get_feed_comments와 트리거(AFTER INSERT OR DELETE)를 다시 실행하고
--   DROP FUNCTION public.update_feed_comment(bigint, text);
--   ALTER TABLE public.feed_comments DROP COLUMN edited_at;

-- 1) 칸 ------------------------------------------------------------------------
ALTER TABLE public.feed_comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- 2) 댓글 고치기 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_feed_comment(p_id bigint, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := public.okbm_uid();
  v_body text := btrim(regexp_replace(COALESCE(p_body, ''), '\s+', ' ', 'g'));
  v_feed_id text;
  v_at timestamptz;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL OR btrim(v_actor) = '' THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF char_length(v_body) < 1 THEN
    RAISE EXCEPTION 'empty comment';
  END IF;
  v_body := left(v_body, 300);
  IF NOT public.okbm_actor_rate_limit(v_actor, 'update_feed_comment', 10) THEN
    RAISE EXCEPTION 'rate limited';
  END IF;

  UPDATE public.feed_comments c
  SET body = v_body, edited_at = CASE WHEN c.body = v_body THEN c.edited_at ELSE now() END
  WHERE c.id = p_id AND c.user_id = v_actor
  RETURNING c.feed_id, c.edited_at INTO v_feed_id, v_at;
  IF v_feed_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.user_notifications
  SET body = left(v_body, 80)
  WHERE id IN ('pn_feed_comment_' || p_id, 'pn_feed_reply_' || p_id);

  RETURN jsonb_build_object('success', true, 'id', p_id, 'feed_id', v_feed_id, 'body', v_body, 'edited_at', v_at);
END;
$$;
REVOKE ALL ON FUNCTION public.update_feed_comment(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_feed_comment(bigint, text) TO authenticated;

-- 3) 고친 글도 최근 댓글 한 줄에 맞춘다(트리거 함수는 H22 그대로, 글이 바뀔 때도 돌게만) ------
DROP TRIGGER IF EXISTS trg_okbm_feed_comments_sync ON public.feed_comments;
CREATE TRIGGER trg_okbm_feed_comments_sync
  AFTER INSERT OR DELETE OR UPDATE OF body ON public.feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_feed_comments_sync();

-- 4) 댓글 읽기 ------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_feed_comments(text);
CREATE OR REPLACE FUNCTION public.get_feed_comments(p_feed_id text)
RETURNS TABLE (id bigint, user_id text, nickname text, photo_url text, body text, created_at timestamptz,
               is_author boolean, is_mine boolean, can_delete boolean, parent_id bigint, reply_to_nickname text,
               edited_at timestamptz)
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
         c.parent_id, c.reply_to_nickname, c.edited_at
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

NOTIFY pgrst, 'reload schema';

-- 확인: 새 칸·함수·트리거
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feed_comments'
     AND column_name = 'edited_at') AS edited_col,
  (SELECT string_agg(p.oid::regprocedure::text, ', ') FROM pg_proc p WHERE p.proname IN ('update_feed_comment', 'get_feed_comments')) AS fns,
  (SELECT pg_get_triggerdef(t.oid) FROM pg_trigger t WHERE t.tgname = 'trg_okbm_feed_comments_sync') AS trg;
