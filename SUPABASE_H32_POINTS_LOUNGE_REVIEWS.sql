-- =========================================================================
-- H32: 낭만 포인트 — 게시판·투표·후기도 쌓기 (2026-11-02, H31 다음)
--
-- 왜: 대표님 11-02 "게시판 글, 설문, 한 줄 후기 같은 것도 5점 정도".
-- 점수표(하루 상한, 한국 시간 0시 기준):
--   · 게시판 글·투표 올리기(lounge_posts, 비공개 글 빼고) 5점, 하루 2개(10점). 지우면 뺀다.
--   · 투표 참여(lounge_poll_votes) 2점, 하루 5번(10점). 한 번 고르면 못 바꾸므로 회수 없음.
--   · 한 줄 후기(okbm_spot_tips, 한 줄을 5자 이상 적었을 때) 5점, 박지 하나에 한 번, 하루 3개(15점). 지우면 뺀다.
--   · 별점 후기(comments) 5점, 박지 하나에 한 번, 하루 3개(15점). 그 후기를 지우면 뺀다.
--   · 게시판 댓글(lounge_post_comments): 피드 댓글과 같은 'comment'로 센다 — 5점, 남의 글에 5자 이상,
--     글 하나에 한 번, 피드 댓글과 합쳐 하루 6개(30점). ref_id는 'lp:글id'로 피드와 겹치지 않게.
-- 도구 함수(okbm_point_award·okbm_point_revoke)는 H31 것을 그대로 쓴다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_okbm_points_post ON public.lounge_posts;
--   DROP TRIGGER IF EXISTS trg_okbm_points_vote ON public.lounge_poll_votes;
--   DROP TRIGGER IF EXISTS trg_okbm_points_tip ON public.okbm_spot_tips;
--   DROP TRIGGER IF EXISTS trg_okbm_points_review ON public.comments;
--   DROP TRIGGER IF EXISTS trg_okbm_points_lcomment ON public.lounge_post_comments;
--   DROP FUNCTION IF EXISTS public.okbm_points_on_post(), public.okbm_points_on_vote(), public.okbm_points_on_tip(),
--     public.okbm_points_on_review(), public.okbm_points_on_lcomment();
-- =========================================================================

-- 1) 게시판 글·투표 올리기 ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT COALESCE(NEW.is_private, false) THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'post', NEW.id::text, 5, 10);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.okbm_point_revoke(OLD.user_id, 'post', OLD.id::text);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_post ON public.lounge_posts;
CREATE TRIGGER trg_okbm_points_post AFTER INSERT OR DELETE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_post();

-- 2) 투표 참여 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.okbm_point_award(NEW.user_id, 'vote', NEW.post_id::text, 2, 10);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_vote ON public.lounge_poll_votes;
CREATE TRIGGER trg_okbm_points_vote AFTER INSERT ON public.lounge_poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_vote();

-- 3) 한 줄 후기: 한 줄을 5자 이상 적으면(처음 쓸 때든 고쳐 쓸 때든) 박지 하나에 한 번 ------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF char_length(btrim(COALESCE(NEW.note, ''))) >= 5 THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'tip', NEW.spot_id, 5, 15);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.okbm_point_revoke(OLD.user_id, 'tip', OLD.spot_id);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_tip ON public.okbm_spot_tips;
CREATE TRIGGER trg_okbm_points_tip AFTER INSERT OR UPDATE OF note OR DELETE ON public.okbm_spot_tips
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_tip();

-- 4) 별점 후기: 박지 하나에 한 번. 점수를 준 그 후기를 지우면 뺀다 ---------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.spot_id IS NOT NULL THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'review', NEW.spot_id, 5, 15, NEW.id::text);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.point_ledger l WHERE l.user_id = OLD.user_id AND l.reason = 'review'
                AND l.ref_id = OLD.spot_id AND l.note = OLD.id::text) THEN
      PERFORM public.okbm_point_revoke(OLD.user_id, 'review', OLD.spot_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_review ON public.comments;
CREATE TRIGGER trg_okbm_points_review AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_review();

-- 5) 게시판 댓글: 피드 댓글과 같은 'comment'(합쳐 하루 30점) ----------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_lcomment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT p.user_id INTO v_owner FROM public.lounge_posts p WHERE p.id = NEW.post_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id AND char_length(btrim(COALESCE(NEW.body, ''))) >= 5 THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'comment', 'lp:' || NEW.post_id::text, 5, 30, NEW.id::text);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.point_ledger l WHERE l.user_id = OLD.user_id AND l.reason = 'comment'
                AND l.ref_id = 'lp:' || OLD.post_id::text AND l.note = OLD.id::text) THEN
      PERFORM public.okbm_point_revoke(OLD.user_id, 'comment', 'lp:' || OLD.post_id::text);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_points_lcomment ON public.lounge_post_comments;
CREATE TRIGGER trg_okbm_points_lcomment AFTER INSERT OR DELETE ON public.lounge_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_lcomment();

REVOKE ALL ON FUNCTION public.okbm_points_on_post(), public.okbm_points_on_vote(), public.okbm_points_on_tip(),
  public.okbm_points_on_review(), public.okbm_points_on_lcomment() FROM PUBLIC, anon, authenticated;
