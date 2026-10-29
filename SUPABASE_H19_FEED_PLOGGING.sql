-- =========================================================================
-- H19: 플로깅 사진 + 관심 루터 수·알림 + 박지 쓰레기 상태 팁 (2026-10-29)
--
-- 왜: 피드에 '플로깅 했어요'(주운 쓰레기·봉투 사진 한 장)를 붙여 박지·프로필에서 보이게 하고,
--     남의 프로필 관심 버튼에 그 사람을 관심 루터로 둔 사람 수를 보여 준다(누가 했는지는 어디에도 안 보임).
-- 어떻게:
--   1) feeds.plogging_photo: 플로깅 사진 주소(R2, https만). 있으면 플로깅한 피드. 따로 참/거짓 칸은 두지 않는다.
--   2) okbm_follower_count(p_user_id, p_author): 그 사람을 관심 루터로 둔 사람 수만 돌려준다(명단은 절대 안 줌).
--      관심 목록은 각자 users.following(jsonb 배열, 사람 id 또는 옛날 것은 닉네임)에 있다.
--      서로 차단한 사이는 세지 않는다.
--   3) users.following에 새 사람이 들어가면 그 사람에게 "누군가 회원님을 관심 루터로 등록했어요"(이름 없음).
--      알림 id를 (등록한 사람, 받는 사람)으로 고정해 같은 사람은 한 번만. 받는 사람이 차단한 회원은 알리지 않는다.
--   4) 피드가 공개로 올라가면 그 사람을 관심 루터로 둔 회원에게 "관심 루터 ○○님이 새 피드를 올렸어요".
--      받는 쪽이 고른 사람이라 이름을 쓴다. 피드·회원마다 한 번만, 서로 차단한 사이는 빼고, 한 번에 최대 1000명.
--   5) okbm_spot_plogging(p_spot_id): 박지 후기 칸 "이 박지에서 플로깅 N번 · 사진 보기"용. 공개 피드만, 사진은 최근 30장.
--   6) 박지 팁에 쓰레기 상태(깨끗함 / 쓰레기 조금 / 쓰레기 많음, 하나만) 묶음을 더한다(spot-tips.js GROUPS와 같아야 한다).
-- 화면: romantic-sync.js(올리기·완료·알림함), romantic-history.js(피드 상세·기록 줄·관심), user-profile.js(숫자 칸·관심 버튼),
--       spot-tips.js(박지 후기 칸·팁).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_okbm_follow_notify ON public.users;
--   DROP TRIGGER IF EXISTS trg_okbm_follow_feed_notify ON public.feeds;
--   DROP FUNCTION IF EXISTS public.okbm_follow_notify();
--   DROP FUNCTION IF EXISTS public.okbm_follow_feed_notify();
--   DROP FUNCTION IF EXISTS public.okbm_follower_count(text, text);
--   DROP FUNCTION IF EXISTS public.okbm_spot_plogging(text);
--   ALTER TABLE public.feeds DROP COLUMN IF EXISTS plogging_photo;
--   (팁 목록은 okbm_spot_tip_allowed·okbm_save_spot_tips를 이 파일 6) 이전 모양으로 다시 만든다)
-- =========================================================================

-- 1) 플로깅 사진 칸 --------------------------------------------------------
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS plogging_photo text;
ALTER TABLE public.feeds DROP CONSTRAINT IF EXISTS feeds_plogging_photo_https;
ALTER TABLE public.feeds ADD CONSTRAINT feeds_plogging_photo_https
  CHECK (plogging_photo IS NULL OR plogging_photo ~ '^https://');
CREATE INDEX IF NOT EXISTS feeds_plogging_spot
  ON public.feeds (spot_id) WHERE plogging_photo IS NOT NULL AND is_published;

-- 2) 관심 루터 수 ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS users_following_gin ON public.users USING gin (following);

CREATE OR REPLACE FUNCTION public.okbm_follower_count(p_user_id text, p_author text DEFAULT '')
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH k AS (
    SELECT NULLIF(btrim(COALESCE(p_user_id, '')), '') AS uid,
           NULLIF(btrim(COALESCE(p_author, '')), '') AS nick
  )
  SELECT count(*)::int
  FROM public.users u, k
  WHERE k.uid IS NOT NULL
    AND u.id <> k.uid
    AND jsonb_typeof(u.following) = 'array'
    AND (u.following ? k.uid OR (k.nick IS NOT NULL AND u.following ? k.nick))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = k.uid AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = k.uid)
    );
$$;
REVOKE ALL ON FUNCTION public.okbm_follower_count(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_follower_count(text, text) TO anon, authenticated;

-- 3) 새로 관심 루터로 등록되면 알림(이름 없이) ------------------------------
CREATE OR REPLACE FUNCTION public.okbm_follow_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF jsonb_typeof(NEW.following) IS DISTINCT FROM 'array' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  )
  SELECT 'pn_follow_' || md5(NEW.id || ':' || t.k), t.k, 'follow',
    '누군가 회원님을 관심 루터로 등록했어요', '', '', '', '', false
  FROM (SELECT DISTINCT jsonb_array_elements_text(NEW.following) AS k) t
  WHERE t.k <> NEW.id
    AND NOT (TG_OP = 'UPDATE' AND jsonb_typeof(OLD.following) = 'array' AND OLD.following ? t.k)
    AND EXISTS (SELECT 1 FROM public.users x WHERE x.id = t.k)
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE b.blocker_id = t.k AND b.blocked_id = NEW.id)
  LIMIT 50
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_follow_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_follow_notify ON public.users;
CREATE TRIGGER trg_okbm_follow_notify
  AFTER INSERT OR UPDATE OF following ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_follow_notify();

-- 4) 관심 루터가 새 피드를 올리면 알림 ------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_follow_feed_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  )
  SELECT 'pn_follow_feed_' || md5(NEW.id || ':' || u.id), u.id, 'follow_feed',
    '관심 루터 ' || v_nick || '님이 새 피드를 올렸어요',
    COALESCE(NEW.spot, ''), NEW.id, COALESCE(NEW.spot_id, ''), COALESCE(NEW.spot, ''), false
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
$$;
REVOKE ALL ON FUNCTION public.okbm_follow_feed_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_follow_feed_notify ON public.feeds;
CREATE TRIGGER trg_okbm_follow_feed_notify
  AFTER INSERT OR UPDATE OF is_published ON public.feeds
  FOR EACH ROW
  EXECUTE FUNCTION public.okbm_follow_feed_notify();

-- 5) 박지별 플로깅 -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_spot_plogging(p_spot_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'count', (
      SELECT count(*) FROM public.feeds f
      WHERE f.spot_id = btrim(p_spot_id) AND f.is_published AND f.plogging_photo IS NOT NULL
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', x.id, 'user_id', x.user_id, 'author', x.author, 'date', x.date, 'photo', x.plogging_photo))
      FROM (
        SELECT f.id, f.user_id, f.author, f.date, f.plogging_photo
        FROM public.feeds f
        WHERE f.spot_id = btrim(p_spot_id) AND f.is_published AND f.plogging_photo IS NOT NULL
        ORDER BY f.date DESC, f.created_at DESC
        LIMIT 30
      ) x
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.okbm_spot_plogging(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_spot_plogging(text) TO anon, authenticated;

-- 6) 박지 팁: 쓰레기 상태 (하나만) ----------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_spot_tip_allowed()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    '일출 명소', '일몰 명소', '운해', '야경', '별이 잘 보임', '360도 파노라마 뷰', '바다 뷰', '호수 뷰',
    '텐트 1~2동', '텐트 3~5동', '텐트 6동 이상',
    '조용함', '사람 많음',
    '깨끗함', '쓰레기 조금', '쓰레기 많음',
    '바람 셈', '그늘 없음', '벌레 많음', '통신 약함'
  ]::text[];
$$;

CREATE OR REPLACE FUNCTION public.okbm_save_spot_tips(p_spot_id text, p_tips text[], p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_tips text[];
  v_note text := left(btrim(regexp_replace(COALESCE(p_note, ''), '\s+', ' ', 'g')), 60);
  v_nick text;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('spot_tips', 10);
  IF v_spot IS NULL OR NOT EXISTS (SELECT 1 FROM public.spots s WHERE s.id = v_spot) THEN
    RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023';
  END IF;
  -- 허용된 칩만, 중복 없이
  SELECT COALESCE(array_agg(DISTINCT t), '{}') INTO v_tips
  FROM unnest(COALESCE(p_tips, '{}'::text[])) AS t
  WHERE t = ANY (public.okbm_spot_tip_allowed());
  -- 박지 크기·분위기·쓰레기 상태는 하나만
  IF (SELECT count(*) FROM unnest(v_tips) t WHERE t LIKE '텐트 %') > 1
     OR (SELECT count(*) FROM unnest(v_tips) t WHERE t IN ('조용함', '사람 많음')) > 1
     OR (SELECT count(*) FROM unnest(v_tips) t WHERE t IN ('깨끗함', '쓰레기 조금', '쓰레기 많음')) > 1 THEN
    RAISE EXCEPTION 'one choice only' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_tips) = 0 AND v_note = '' THEN
    RAISE EXCEPTION 'empty' USING ERRCODE = '22023';
  END IF;

  v_nick := COALESCE(public.okbm_lounge_author_nickname(v_uid), '');
  INSERT INTO public.okbm_spot_tips AS m (spot_id, user_id, nickname, tips, note)
  VALUES (v_spot, v_uid, v_nick, v_tips, v_note)
  ON CONFLICT (spot_id, user_id) DO UPDATE SET
    tips = EXCLUDED.tips, note = EXCLUDED.note, nickname = EXCLUDED.nickname, updated_at = now();

  RETURN public.okbm_spot_tips_summary(v_spot);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_save_spot_tips(text, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_save_spot_tips(text, text[], text) TO authenticated;

-- 확인 ------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'feeds' AND column_name = 'plogging_photo') AS plogging_col,
  (SELECT count(*) FROM pg_trigger WHERE tgname IN ('trg_okbm_follow_notify', 'trg_okbm_follow_feed_notify')) AS triggers,
  public.okbm_follower_count('kakao_5060259862', '') AS sample_follower_count;
