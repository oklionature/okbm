-- =========================================================================
-- H50: GPX 등록 소식을 라운지 '박지 후기' 탭으로 옮긴다 (2026-11-05, H49 되돌림)
--
-- 대표님 11-05: 자유게시판 분류들은 사람이 쓴 글이라 'GPX 등록 소식'만 결이 달랐다.
--   → 박지 후기 탭(최근 후기)에 후기와 날짜순으로 섞어 'GPX 등록' 카드로 보여 준다.
-- 1) okbm_admin_gpx_review를 H44 그대로 되돌린다(승인 때 게시판 글을 올리지 않는다).
-- 2) lounge_posts 분류에서 'gpx'를 뺀다(H49 뒤 'gpx' 글이 없을 때만).
-- 3) okbm_recent_gpx_news(): 승인돼 지금 박지에 붙어 있는 GPX만 최근 순으로(박지 id·보낸 사람·거리·승인 시각).
--    파일 주소는 내보내지 않는다(선은 정보창 관문·5점 뒤에서만).
-- 여러 번 실행해도 안전.
-- =========================================================================

-- 승인: 박지에 선·보낸 사람을 붙이고 50점. 반려: 사유만 남긴다. 대기 건만 처리한다.
CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_review(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  v_nick text;
  v_pts integer := 0;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO g FROM public.spot_gpx_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
  IF g.status <> '검수대기' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE = '22023'; END IF;
  IF p_approve THEN
    SELECT nickname INTO v_nick FROM public.users WHERE id = g.user_id;
    UPDATE public.spots SET gpx_url = g.gpx_url, gpx_credit = NULLIF(left(btrim(COALESCE(v_nick, '')), 40), '') WHERE id = g.spot_id;
    UPDATE public.spot_gpx_submissions SET status = '승인', reviewed_at = now() WHERE id = p_id;
    v_pts := public.okbm_point_award(g.user_id, 'gpx', g.id::text, 50, NULL, NULL);
  ELSE
    UPDATE public.spot_gpx_submissions SET status = '반려', reject_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''), reviewed_at = now() WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'points', v_pts);
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lounge_posts WHERE category = 'gpx') THEN
    ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_category_check;
    ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_category_check
      CHECK (category IN ('backpacking', 'life', 'poll', 'suggestion'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.okbm_recent_gpx_news(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x.reviewed_at DESC), '[]'::jsonb) FROM (
    SELECT g.id, g.spot_id, g.user_id, COALESCE(u.nickname, '') AS nickname, g.km, g.reviewed_at
    FROM public.spot_gpx_submissions g
    JOIN public.spots s ON s.id = g.spot_id AND s.gpx_url = g.gpx_url
    LEFT JOIN public.users u ON u.id = g.user_id
    WHERE g.status = '승인'
    ORDER BY g.reviewed_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  ) x;
$$;
REVOKE ALL ON FUNCTION public.okbm_recent_gpx_news(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_recent_gpx_news(integer) TO anon, authenticated;
