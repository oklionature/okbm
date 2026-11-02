-- =========================================================================
-- H31: 낭만 포인트 1단계 — 쌓기만 (2026-11-02, 설계 TASK_POINTS.md)
--
-- 왜: 피드·댓글·별·출석·제보로 낭만 포인트를 모으게 한다. 쓰는 곳(닉네임·상점 테두리·굴업도 입장권)은 2단계.
-- 어떻게:
--   1) point_ledger: 장부. 지우지 않고 쌓기만 한다. 같은 (사람, 까닭, 대상)은 한 번만(유니크).
--      되돌릴 때는 '까닭_x' 줄로 같은 점수를 뺀다. 한 번 되돌린 대상은 다시 받지 못한다(별 눌렀다 풀기 반복 막기).
--      source는 free(활동)만 쓴다. 나중에 돈으로 팔게 되면 paid를 쓴다.
--   2) 점수표(하루 상한, 한국 시간 0시 기준) — 11-02 대표님 조정
--      피드 10(30) · 플로깅 피드 +20(40) · 댓글 5(30=6개, 남의 피드·5자 이상·한 피드 1개) ·
--      별 누르기 2(20=10번, 남의 피드) · 별 받기 1(20) · 출석 10(1번) · 7일 연속 +100 ·
--      수정 건의 채택 30 · 박지 제보 반영 100
--   3) 트리거가 feeds·feed_comments·feed_likes·spot_corrections·proposals 변화에 맞춰 주고 뺀다.
--      화면은 장부에 직접 쓰지 못한다(RLS로 막고 함수로만).
--   4) okbm_points_attend(): 앱을 연 날 출석. okbm_my_points(): 내 잔액·오늘 받은 점수·내역.
--   5) users 줄이 지워지면(탈퇴) 장부도 지운다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_okbm_points_feed ON public.feeds;
--   DROP TRIGGER IF EXISTS trg_okbm_points_feed_del ON public.feeds;
--   DROP TRIGGER IF EXISTS trg_okbm_points_comment ON public.feed_comments;
--   DROP TRIGGER IF EXISTS trg_okbm_points_like ON public.feed_likes;
--   DROP TRIGGER IF EXISTS trg_okbm_points_correction ON public.spot_corrections;
--   DROP TRIGGER IF EXISTS trg_okbm_points_proposal ON public.proposals;
--   DROP TRIGGER IF EXISTS trg_okbm_points_user_del ON public.users;
--   DROP FUNCTION IF EXISTS public.okbm_my_points(integer), public.okbm_points_attend(),
--     public.okbm_points_on_feed(), public.okbm_points_on_feed_del(), public.okbm_points_on_comment(),
--     public.okbm_points_on_like(), public.okbm_points_on_correction(), public.okbm_points_on_proposal(),
--     public.okbm_points_on_user_del(), public.okbm_point_award(text,text,text,integer,integer,text),
--     public.okbm_point_revoke(text,text,text), public.okbm_point_day_start();
--   DROP TABLE IF EXISTS public.point_ledger;
-- =========================================================================

-- 1) 장부 ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.point_ledger (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  delta integer NOT NULL,
  source text NOT NULL DEFAULT 'free' CHECK (source IN ('free', 'paid')),
  reason text NOT NULL CHECK (reason ~ '^[a-z0-9_]{1,24}$'),
  ref_id text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS point_ledger_once ON public.point_ledger (user_id, reason, ref_id);
CREATE INDEX IF NOT EXISTS point_ledger_user_time ON public.point_ledger (user_id, created_at DESC);
ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.point_ledger FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.point_ledger_id_seq FROM anon, authenticated;

-- 2) 도구 ------------------------------------------------------------------
-- 오늘(한국 시간) 0시
CREATE OR REPLACE FUNCTION public.okbm_point_day_start()
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')) AT TIME ZONE 'Asia/Seoul';
$$;

-- 주기: 상한(p_cap, 그 까닭으로 오늘 받은 점수 합)을 넘지 않을 때만. 실제로 넣은 점수를 돌려준다(못 넣으면 0)
CREATE OR REPLACE FUNCTION public.okbm_point_award(p_user text, p_reason text, p_ref text, p_pts integer, p_cap integer, p_note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user text := NULLIF(btrim(COALESCE(p_user, '')), '');
  v_today integer;
  v_id bigint;
BEGIN
  IF v_user IS NULL OR COALESCE(p_pts, 0) <= 0 THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_user) THEN RETURN 0; END IF;
  IF p_cap IS NOT NULL THEN
    SELECT COALESCE(sum(delta), 0) INTO v_today FROM public.point_ledger
     WHERE user_id = v_user AND reason = p_reason AND delta > 0 AND created_at >= public.okbm_point_day_start();
    IF v_today + p_pts > p_cap THEN RETURN 0; END IF;
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_user, p_pts, p_reason, COALESCE(p_ref, ''), p_note)
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING
  RETURNING id INTO v_id;
  RETURN CASE WHEN v_id IS NULL THEN 0 ELSE p_pts END;
END;
$$;

-- 되돌리기: 받은 줄이 있고 아직 안 되돌렸으면 같은 점수를 뺀다
CREATE OR REPLACE FUNCTION public.okbm_point_revoke(p_user text, p_reason text, p_ref text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pts integer;
BEGIN
  SELECT delta INTO v_pts FROM public.point_ledger
   WHERE user_id = p_user AND reason = p_reason AND ref_id = COALESCE(p_ref, '') AND delta > 0;
  IF v_pts IS NULL THEN RETURN 0; END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id)
  VALUES (p_user, -v_pts, p_reason || '_x', COALESCE(p_ref, ''))
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  RETURN v_pts;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_point_day_start(), public.okbm_point_award(text,text,text,integer,integer,text),
  public.okbm_point_revoke(text,text,text) FROM PUBLIC, anon, authenticated;

-- 3) 피드: 사진 있는 공개 피드 10(하루 30), 플로깅 사진이 있으면 +20(하루 40). 지우면 뺀다 -------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_published, false)
     AND jsonb_typeof(NEW.photos) = 'array' AND jsonb_array_length(NEW.photos) > 0 THEN
    PERFORM public.okbm_point_award(NEW.user_id, 'feed', NEW.id, 10, 30);
    IF btrim(COALESCE(NEW.plogging_photo, '')) <> '' THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'plog', NEW.id, 20, 40);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_feed ON public.feeds;
CREATE TRIGGER trg_okbm_points_feed AFTER INSERT OR UPDATE OF is_published, photos, plogging_photo ON public.feeds
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_feed();

CREATE OR REPLACE FUNCTION public.okbm_points_on_feed_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.okbm_point_revoke(OLD.user_id, 'feed', OLD.id);
  PERFORM public.okbm_point_revoke(OLD.user_id, 'plog', OLD.id);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_feed_del ON public.feeds;
CREATE TRIGGER trg_okbm_points_feed_del AFTER DELETE ON public.feeds
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_feed_del();

-- 4) 댓글: 남의 피드에 5자 이상 5(하루 30), 한 피드에는 1개만. 받은 그 댓글을 지우면 뺀다 ------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT f.user_id INTO v_owner FROM public.feeds f WHERE f.id = NEW.feed_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id AND char_length(btrim(COALESCE(NEW.body, ''))) >= 5 THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'comment', NEW.feed_id, 5, 30, NEW.id::text);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.point_ledger l WHERE l.user_id = OLD.user_id AND l.reason = 'comment'
                AND l.ref_id = OLD.feed_id AND l.note = OLD.id::text) THEN
      PERFORM public.okbm_point_revoke(OLD.user_id, 'comment', OLD.feed_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_comment ON public.feed_comments;
CREATE TRIGGER trg_okbm_points_comment AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_comment();

-- 5) 별: 누른 사람 2(하루 20), 받은 사람 1(하루 20). 남의 피드만. 풀면 둘 다 뺀다 -------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT f.user_id INTO v_owner FROM public.feeds f WHERE f.id = NEW.feed_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'star_give', NEW.feed_id, 2, 20);
      PERFORM public.okbm_point_award(v_owner, 'star_get', NEW.feed_id || ':' || NEW.user_id, 1, 20);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.okbm_point_revoke(OLD.user_id, 'star_give', OLD.feed_id);
    SELECT f.user_id INTO v_owner FROM public.feeds f WHERE f.id = OLD.feed_id;
    IF v_owner IS NULL THEN
      SELECT l.user_id INTO v_owner FROM public.point_ledger l
       WHERE l.reason = 'star_get' AND l.ref_id = OLD.feed_id || ':' || OLD.user_id LIMIT 1;
    END IF;
    IF v_owner IS NOT NULL THEN
      PERFORM public.okbm_point_revoke(v_owner, 'star_get', OLD.feed_id || ':' || OLD.user_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_like ON public.feed_likes;
CREATE TRIGGER trg_okbm_points_like AFTER INSERT OR DELETE ON public.feed_likes
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_like();

-- 6) 제보·수정 건의: 반영완료(채택·승인)로 바뀔 때 ---------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.status, '') ~ '(반영완료|채택|승인)' AND COALESCE(OLD.status, '') !~ '(반영완료|채택|승인)' THEN
    PERFORM public.okbm_point_award(NEW.user_id, 'correction', NEW.id, 30, NULL);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_correction ON public.spot_corrections;
CREATE TRIGGER trg_okbm_points_correction AFTER UPDATE OF status ON public.spot_corrections
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_correction();

CREATE OR REPLACE FUNCTION public.okbm_points_on_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.status, '') ~ '(반영완료|채택|승인)' AND COALESCE(OLD.status, '') !~ '(반영완료|채택|승인)' THEN
    PERFORM public.okbm_point_award(NEW.user_id, 'proposal', NEW.id, 100, NULL);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_proposal ON public.proposals;
CREATE TRIGGER trg_okbm_points_proposal AFTER UPDATE OF status ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_proposal();

-- 7) 탈퇴: users 줄이 지워지면 장부도 지운다 -------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_user_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.point_ledger WHERE user_id = OLD.id;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_user_del ON public.users;
CREATE TRIGGER trg_okbm_points_user_del AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_user_del();

REVOKE ALL ON FUNCTION public.okbm_points_on_feed(), public.okbm_points_on_feed_del(), public.okbm_points_on_comment(),
  public.okbm_points_on_like(), public.okbm_points_on_correction(), public.okbm_points_on_proposal(),
  public.okbm_points_on_user_del() FROM PUBLIC, anon, authenticated;

-- 8) 출석: 앱을 연 날 10, 7일 연속이면 +100(그다음은 다시 7일 뒤) -------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_attend()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_got integer := 0;
  v_bonus integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('points_attend', 10);
  v_got := public.okbm_point_award(v_uid, 'attend', v_day::text, 10, NULL);
  IF v_got > 0
     AND (SELECT count(*) FROM public.point_ledger WHERE user_id = v_uid AND reason = 'attend'
           AND ref_id IN (SELECT (v_day - g)::text FROM generate_series(0, 6) g)) = 7
     AND NOT EXISTS (SELECT 1 FROM public.point_ledger WHERE user_id = v_uid AND reason = 'attend7'
           AND ref_id IN (SELECT (v_day - g)::text FROM generate_series(1, 6) g)) THEN
    v_bonus := public.okbm_point_award(v_uid, 'attend7', v_day::text, 100, NULL);
  END IF;
  RETURN jsonb_build_object('gained', v_got + v_bonus, 'attend', v_got, 'streak_bonus', v_bonus);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_points_attend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_points_attend() TO authenticated;

-- 9) 내 포인트: 잔액, 오늘 까닭별로 받은 점수, 최근 내역 ---------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_my_points(p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 30), 0), 100);
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('my_points', 60);
  RETURN jsonb_build_object(
    'balance', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE user_id = v_uid),
    'today', (SELECT COALESCE(jsonb_object_agg(reason, s), '{}'::jsonb) FROM (
                SELECT reason, sum(delta) AS s FROM public.point_ledger
                 WHERE user_id = v_uid AND delta > 0 AND created_at >= public.okbm_point_day_start()
                 GROUP BY reason) t),
    'history', (SELECT COALESCE(jsonb_agg(jsonb_build_object('r', reason, 'd', delta, 't', created_at) ORDER BY created_at DESC, id DESC), '[]'::jsonb) FROM (
                SELECT id, reason, delta, created_at FROM public.point_ledger
                 WHERE user_id = v_uid ORDER BY created_at DESC, id DESC LIMIT v_lim) h)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_my_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_my_points(integer) TO authenticated;
