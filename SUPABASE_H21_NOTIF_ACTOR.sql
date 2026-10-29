-- H21: 알림에 보낸 사람(actor_id)을 적는다 — 알림 창에서 별·댓글·새 피드·라운지 댓글 알림 옆에 그 사람 얼굴을 보이려고.
-- 예전엔 '산들바람님이 ~' 글자로만 남아 누가 보냈는지 알 수 없었다(닉네임은 바뀔 수 있음).
-- 관심 루터 등록(follow) 알림은 누가 했는지 숨기기로 했으므로 적지 않는다(okbm_follow_notify는 그대로).
-- 받는 사람만 자기 알림을 읽을 수 있는 기존 RLS 그대로. 제목에 이미 닉네임이 보이므로 새로 드러나는 정보는 없다.

ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS actor_id text;

CREATE OR REPLACE FUNCTION public.okbm_feed_like_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
  ) VALUES (
    'pn_feed_like_' || md5(NEW.feed_id || ':' || NEW.user_id), v_owner, 'feed_like',
    COALESCE(v_nick, '낭만루터') || '님이 내 피드에 별을 눌렀어요',
    COALESCE(v_spot, ''), NEW.feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false, NEW.user_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

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

  IF TG_OP = 'INSERT' AND v_owner IS NOT NULL AND v_owner <> NEW.user_id
     AND v_owner <> 'official_romanticroute' THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
    ) VALUES (
      'pn_feed_comment_' || NEW.id, v_owner, 'feed_comment',
      NEW.nickname || '님이 댓글을 남겼어요',
      left(NEW.body, 80), v_feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false, NEW.user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 앞서 이 피드에 댓글 단 사람들에게도 알린다(피드 주인은 위에서 따로 받고, 새 댓글 쓴 사람은 뺀다).
  -- 사람·피드마다 알림 한 줄로 묶는다: 내 마지막 댓글 뒤로 달린 남의 댓글 수를 세어 제목을 고치고, 안 읽음으로 다시 위에 올린다.
  -- 새 댓글 쓴 사람을 차단한 사람에게는 보내지 않는다.
  IF TG_OP = 'INSERT' AND v_owner IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, created_at, actor_id
    )
    SELECT
      'pn_feed_reply_' || md5(v_feed_id || ':' || p.user_id), p.user_id, 'feed_reply',
      CASE WHEN p.newer > 1
        THEN '내가 댓글 단 피드에 새 댓글 ' || p.newer || '개'
        ELSE NEW.nickname || '님이 내가 댓글 단 피드에 댓글을 남겼어요'
      END,
      left(NEW.nickname || ': ' || NEW.body, 80), v_feed_id, COALESCE(v_spot_id, ''), COALESCE(v_spot, ''), false, now(), NEW.user_id
    FROM (
      SELECT c.user_id,
        (SELECT count(*) FROM public.feed_comments x
          WHERE x.feed_id = v_feed_id AND x.user_id <> c.user_id AND x.created_at > max(c.created_at)) AS newer
      FROM public.feed_comments c
      WHERE c.feed_id = v_feed_id
        AND c.user_id <> NEW.user_id
        AND c.user_id <> v_owner
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = c.user_id AND b.blocked_id = NEW.user_id)
      GROUP BY c.user_id
      LIMIT 50
    ) p
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, body = EXCLUDED.body, is_read = false, created_at = now(), actor_id = EXCLUDED.actor_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.user_notifications WHERE id = 'pn_feed_comment_' || OLD.id;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.okbm_follow_feed_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nick text;
  v_author text := NULLIF(btrim(COALESCE(NEW.author, '')), '');
BEGIN
  IF NOT COALESCE(NEW.is_published, false) OR NEW.user_id IS NULL OR btrim(NEW.user_id) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_published, false) THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(v_author, NULLIF(btrim(u.nickname), ''), '낭만루터') INTO v_nick
  FROM public.users u WHERE u.id = NEW.user_id;
  v_nick := COALESCE(v_nick, v_author, '낭만루터');

  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
  )
  SELECT 'pn_follow_feed_' || md5(NEW.id || ':' || u.id), u.id, 'follow_feed',
    '관심 루터 ' || v_nick || '님이 새 피드를 올렸어요',
    COALESCE(NEW.spot, ''), NEW.id, COALESCE(NEW.spot_id, ''), COALESCE(NEW.spot, ''), false, NEW.user_id
  FROM public.users u
  WHERE u.id <> NEW.user_id
    AND jsonb_typeof(u.following) = 'array'
    AND (u.following ? NEW.user_id OR (v_author IS NOT NULL AND u.following ? v_author))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = u.id AND b.blocked_id = NEW.user_id) OR (b.blocker_id = NEW.user_id AND b.blocked_id = u.id)
    )
  LIMIT 1000
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.okbm_lounge_after_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post_id uuid;
  v_owner text;
  v_title text;
  v_category text;
  v_kind text;
  v_is_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.lounge_posts
      SET comments_count = GREATEST(0, comments_count - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  UPDATE public.lounge_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id
    RETURNING id, user_id, title, category INTO v_post_id, v_owner, v_title, v_category;
  IF NOT FOUND OR v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.is_admin IS TRUE)
    INTO v_is_admin;
  v_kind := CASE WHEN v_category = 'suggestion' AND v_is_admin THEN 'lounge_reply' ELSE 'lounge_comment' END;

  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id
  ) VALUES (
    left('ln_c_' || NEW.id::text, 180),
    v_owner,
    v_kind,
    CASE WHEN v_kind = 'lounge_reply' THEN '건의에 운영팀 답변이 달렸습니다' ELSE '내 글에 댓글이 달렸습니다' END,
    '[' || left(COALESCE(v_title, ''), 40) || '] ' || left(NEW.body, 80),
    v_post_id::text,
    '',
    '',
    false,
    NEW.user_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 지난 알림 채우기 ---------------------------------------------------------
-- 별: 알림 id = pn_feed_like_ || md5(피드 id:누른 사람)
UPDATE public.user_notifications n SET actor_id = l.user_id
FROM public.feed_likes l
WHERE n.kind = 'feed_like' AND n.actor_id IS NULL
  AND n.id = 'pn_feed_like_' || md5(l.feed_id || ':' || l.user_id);

-- 내 피드 댓글: 알림 id = pn_feed_comment_ || 댓글 id
UPDATE public.user_notifications n SET actor_id = c.user_id
FROM public.feed_comments c
WHERE n.kind = 'feed_comment' AND n.actor_id IS NULL
  AND n.id = 'pn_feed_comment_' || c.id;

-- 내가 댓글 단 피드의 새 댓글: 그 알림 시각까지 남(받는 사람 말고)이 쓴 마지막 댓글
UPDATE public.user_notifications n SET actor_id = (
  SELECT c.user_id FROM public.feed_comments c
  WHERE c.feed_id = n.related_id AND c.user_id <> n.user_id AND c.created_at <= n.created_at + interval '5 seconds'
  ORDER BY c.created_at DESC, c.id DESC LIMIT 1
)
WHERE n.kind = 'feed_reply' AND n.actor_id IS NULL;

-- 관심 루터 새 피드: 그 피드를 올린 사람
UPDATE public.user_notifications n SET actor_id = f.user_id
FROM public.feeds f
WHERE n.kind = 'follow_feed' AND n.actor_id IS NULL AND f.id = n.related_id;

-- 라운지 댓글: 알림 id = ln_c_ || 댓글 id
UPDATE public.user_notifications n SET actor_id = c.user_id
FROM public.lounge_post_comments c
WHERE n.kind IN ('lounge_comment', 'lounge_reply') AND n.actor_id IS NULL
  AND n.id = left('ln_c_' || c.id::text, 180);

-- 확인: 종류별 알림 수와 보낸 사람이 채워진 수
SELECT kind, count(*) AS total, count(actor_id) AS with_actor
FROM public.user_notifications GROUP BY kind ORDER BY kind;
