-- =========================================================================
-- H17: 피드 댓글 + 별·댓글 알림 + 안 읽은 알림 개수 (2026-10-25)
--
-- 왜: 피드에 별을 받아도 올린 사람에게 아무 반응이 가지 않고 댓글 칸도 없어 다시 올 이유가 없었다.
-- 어떻게:
--   1) feed_comments 표에 댓글 글자만 저장한다(사진 없음, 한 줄 수백 바이트).
--      앱은 표를 직접 읽거나 쓰지 않고 아래 함수만 쓴다(RLS 켜고 정책 없음).
--      그래서 마스터 RLS 파일을 다시 돌려도 이 표 권한은 바뀌지 않는다.
--   2) feeds에 comments_count(댓글 수)와 last_comment(최근 댓글 한 줄: 닉네임·앞 60자)를 둔다.
--      낭만피드·정보창은 피드를 받을 때 이 두 칸만 같이 받고, 댓글 전체는 댓글 창을 열 때 그 피드 것만 받는다.
--      두 칸은 트리거만 고친다(클라이언트가 임의로 바꾸면 되돌린다).
--   3) 댓글이 달리거나 별이 눌리면 트리거가 피드 올린 사람의 user_notifications에 한 줄 넣는다.
--      자기 피드에 자기가 한 것과 공식 계정(official_romanticroute) 피드는 알리지 않는다.
--      별은 같은 사람이 껐다 켜도 알림이 한 번만 간다(알림 id를 피드·사람으로 고정).
--   4) get_unread_notification_count: 1분마다 알림 목록 50줄 대신 안 읽은 개수 숫자 하나만 묻는다.
-- 차단: 피드 올린 사람이 차단한 회원은 그 피드에 댓글을 못 달고, 보는 사람이 차단한 회원의 댓글은 안 보인다.
-- 탈퇴: 회원 줄(users)이 지워지면 그 회원 댓글도 같이 지워진다(FK). 피드가 지워지면 그 피드 댓글도 지워진다.
-- 화면: feed-comments.js(댓글 창), romantic-history.js(낭만피드), map-main.js(정보창 후기 피드), romantic-sync.js(알림함).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_okbm_feed_like_notify ON public.feed_likes;
--   DROP TRIGGER IF EXISTS trg_okbm_feed_comments_sync ON public.feed_comments;
--   DROP TRIGGER IF EXISTS trg_okbm_guard_feeds_comment_cols ON public.feeds;
--   DROP FUNCTION IF EXISTS public.get_feed_comments(text);
--   DROP FUNCTION IF EXISTS public.add_feed_comment(text, text);
--   DROP FUNCTION IF EXISTS public.delete_feed_comment(bigint);
--   DROP FUNCTION IF EXISTS public.get_unread_notification_count();
--   DROP FUNCTION IF EXISTS public.okbm_feed_like_notify();
--   DROP FUNCTION IF EXISTS public.okbm_feed_comments_sync();
--   DROP FUNCTION IF EXISTS public.okbm_guard_feeds_comment_cols();
--   DROP TABLE IF EXISTS public.feed_comments;
--   ALTER TABLE public.feeds DROP COLUMN IF EXISTS comments_count, DROP COLUMN IF EXISTS last_comment;
-- =========================================================================

-- 1) 피드 칸 -----------------------------------------------------------------
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS last_comment jsonb;

-- 댓글 수·최근 댓글은 트리거(postgres)와 service_role만 바꾼다
CREATE OR REPLACE FUNCTION public.okbm_guard_feeds_comment_cols()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    RETURN NEW;
  END IF;
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.comments_count := 0;
    NEW.last_comment := NULL;
  ELSE
    NEW.comments_count := COALESCE(OLD.comments_count, 0);
    NEW.last_comment := OLD.last_comment;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_okbm_guard_feeds_comment_cols ON public.feeds;
CREATE TRIGGER trg_okbm_guard_feeds_comment_cols
  BEFORE INSERT OR UPDATE ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_guard_feeds_comment_cols();

-- 2) 댓글 표 -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feed_id text NOT NULL REFERENCES public.feeds (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feed_comments_feed_created_idx ON public.feed_comments (feed_id, created_at);
CREATE INDEX IF NOT EXISTS feed_comments_user_idx ON public.feed_comments (user_id);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feed_comments FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.feed_comments TO service_role;

-- 3) 댓글이 들어오거나 지워지면: 댓글 수·최근 댓글을 맞추고, 들어온 댓글은 피드 주인에게 알린다
CREATE OR REPLACE FUNCTION public.okbm_feed_comments_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF TG_OP = 'INSERT' AND v_owner IS NOT NULL AND v_owner <> NEW.user_id
     AND v_owner <> 'official_romanticroute' THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
    ) VALUES (
      'pn_feed_comment_' || NEW.id, v_owner, 'feed_comment',
      NEW.nickname || '님이 댓글을 남겼어요',
      left(NEW.body, 80), v_feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_notifications WHERE id = 'pn_feed_comment_' || OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_feed_comments_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_feed_comments_sync ON public.feed_comments;
CREATE TRIGGER trg_okbm_feed_comments_sync
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_feed_comments_sync();

-- 4) 별이 눌리면 피드 주인에게 알린다(같은 사람은 한 번만)
CREATE OR REPLACE FUNCTION public.okbm_feed_like_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner text;
  v_spot text;
  v_spot_id text;
  v_nick text;
BEGIN
  SELECT f.user_id, f.spot, f.spot_id::text INTO v_owner, v_spot, v_spot_id
  FROM public.feeds f WHERE f.id = NEW.feed_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id OR v_owner = 'official_romanticroute' THEN
    RETURN NEW;
  END IF;
  SELECT NULLIF(btrim(u.nickname), '') INTO v_nick FROM public.users u WHERE u.id = NEW.user_id;
  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  ) VALUES (
    'pn_feed_like_' || md5(NEW.feed_id || ':' || NEW.user_id), v_owner, 'feed_like',
    COALESCE(v_nick, '낭만루터') || '님이 내 피드에 별을 눌렀어요',
    COALESCE(v_spot, ''), NEW.feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_feed_like_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_feed_like_notify ON public.feed_likes;
CREATE TRIGGER trg_okbm_feed_like_notify
  AFTER INSERT ON public.feed_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_feed_like_notify();

-- 5) 앱이 쓰는 함수 ------------------------------------------------------------

-- 피드 하나의 댓글(오래된 순, 최대 200개). 비회원도 읽는다.
-- 쓴 사람은 닉네임·회원 번호·프로필 사진 주소만 돌려준다(피드 글쓴이처럼 공개되는 값). 사진은 지금 회원 정보에서 읽는다.
-- 회원 번호는 댓글 사진·닉네임을 누르면 그 회원 피드 모아보기를 여는 데 쓴다.
-- can_delete: 쓴 사람·피드 주인·관리자에게만 참(delete_feed_comment와 같은 기준)
DROP FUNCTION IF EXISTS public.get_feed_comments(text);
CREATE OR REPLACE FUNCTION public.get_feed_comments(p_feed_id text)
RETURNS TABLE (id bigint, user_id text, nickname text, photo_url text, body text, created_at timestamptz, is_author boolean, is_mine boolean, can_delete boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT public.okbm_uid() AS uid, public.okbm_is_admin() AS admin)
  SELECT c.id, c.user_id, c.nickname, NULLIF(btrim(u.photo_url), '') AS photo_url, c.body, c.created_at,
         (c.user_id = f.user_id) AS is_author,
         (me.uid IS NOT NULL AND c.user_id = me.uid) AS is_mine,
         (me.uid IS NOT NULL AND (c.user_id = me.uid OR f.user_id = me.uid)) OR COALESCE(me.admin, false) AS can_delete
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

-- 댓글 달기(회원만). 1분에 5개까지. 닉네임은 회원 정보에서 가져온다.
CREATE OR REPLACE FUNCTION public.add_feed_comment(p_feed_id text, p_body text)
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
  IF NOT public.okbm_actor_rate_limit(v_actor, 'add_feed_comment', 5) THEN
    RAISE EXCEPTION 'rate limited';
  END IF;
  SELECT COALESCE(NULLIF(btrim(u.nickname), ''), '낭만루터') INTO v_nick FROM public.users u WHERE u.id = v_actor;

  INSERT INTO public.feed_comments (feed_id, user_id, nickname, body)
  VALUES (btrim(p_feed_id), v_actor, COALESCE(v_nick, '낭만루터'), v_body)
  RETURNING id INTO v_id;

  SELECT comments_count INTO v_count FROM public.feeds WHERE id = btrim(p_feed_id);
  RETURN jsonb_build_object('success', true, 'id', v_id, 'comments_count', COALESCE(v_count, 0), 'nickname', COALESCE(v_nick, '낭만루터'));
END;
$$;
REVOKE ALL ON FUNCTION public.add_feed_comment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_feed_comment(text, text) TO authenticated;

-- 댓글 지우기: 쓴 사람, 피드 주인, 관리자
CREATE OR REPLACE FUNCTION public.delete_feed_comment(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text := public.okbm_uid();
  v_feed_id text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  DELETE FROM public.feed_comments c
  USING public.feeds f
  WHERE c.id = p_id AND f.id = c.feed_id
    AND (c.user_id = v_actor OR f.user_id = v_actor OR public.okbm_is_admin())
  RETURNING c.feed_id INTO v_feed_id;
  IF v_feed_id IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT comments_count INTO v_count FROM public.feeds WHERE id = v_feed_id;
  RETURN jsonb_build_object('success', true, 'feed_id', v_feed_id, 'comments_count', COALESCE(v_count, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.delete_feed_comment(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_feed_comment(bigint) TO authenticated;

-- 안 읽은 알림 개수(쪽지 알림은 화면과 같이 뺀다). 1분마다 이 숫자 하나만 받는다.
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.user_notifications n
  WHERE n.user_id = public.okbm_uid()
    AND NOT COALESCE(n.is_read, false)
    AND lower(COALESCE(n.kind, '')) NOT IN ('note', 'direct', 'dm')
    AND n.id NOT LIKE 'pn_note_%'
    AND position('쪽지' in COALESCE(n.title, '')) = 0;
$$;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인: 표와 칸이 생겼는지
SELECT
  (SELECT count(*) FROM public.feed_comments) AS comments,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feeds' AND column_name IN ('comments_count', 'last_comment')) AS feed_cols;
