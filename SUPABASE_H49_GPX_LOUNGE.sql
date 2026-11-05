-- =========================================================================
-- H49: 라운지 자유게시판 GPX 분류 + GPX 승인 소식 자동 글 (2026-11-05, TASK_GPX ④)
--
-- 1) lounge_posts.category에 'gpx'를 더한다(자유게시판 분류 칩).
-- 2) okbm_admin_gpx_review로 GPX를 승인하면 라운지 'gpx' 분류에 소식 글을 하나 올린다.
--    문구(대표님 11-05): 제목 '○○님이 △△ GPX를 등록해 주셨어요.' / 본문 '이제 정보창에서 자세한 GPX 경로를 확인할 수 있어요.'
--    글쓴이는 승인한 관리자 계정이다(보낸 사람이 쓴 글처럼 보이거나 글 포인트를 받지 않게).
--    글 올리기가 실패해도 승인(선·50점)은 그대로 된다.
-- 나머지 승인·반려 동작은 H44 그대로다. 여러 번 실행해도 안전.
-- =========================================================================

ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_category_check;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_category_check
  CHECK (category IN ('backpacking', 'life', 'poll', 'suggestion', 'gpx'));

CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_review(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  v_nick text;
  v_spot text;
  v_pts integer := 0;
  v_post uuid;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO g FROM public.spot_gpx_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
  IF g.status <> '검수대기' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE = '22023'; END IF;
  IF p_approve THEN
    SELECT nickname INTO v_nick FROM public.users WHERE id = g.user_id;
    UPDATE public.spots SET gpx_url = g.gpx_url, gpx_credit = NULLIF(left(btrim(COALESCE(v_nick, '')), 40), '') WHERE id = g.spot_id
      RETURNING btrim(COALESCE(NULLIF(spot_main, ''), "fullName", '')) INTO v_spot;
    UPDATE public.spot_gpx_submissions SET status = '승인', reviewed_at = now() WHERE id = p_id;
    v_pts := public.okbm_point_award(g.user_id, 'gpx', g.id::text, 50, NULL, NULL);
    BEGIN
      INSERT INTO public.lounge_posts (user_id, category, title, body)
      VALUES (public.okbm_uid(), 'gpx',
              left(COALESCE(NULLIF(btrim(COALESCE(v_nick, '')), ''), '낭만루터') || '님이 ' || COALESCE(NULLIF(v_spot, ''), '박지') || ' GPX를 등록해 주셨어요.', 80),
              '이제 정보창에서 자세한 GPX 경로를 확인할 수 있어요.')
      RETURNING id INTO v_post;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'okbm_admin_gpx_review lounge post failed: %', SQLERRM;
    END;
  ELSE
    UPDATE public.spot_gpx_submissions SET status = '반려', reject_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''), reviewed_at = now() WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'points', v_pts, 'post', v_post);
END;
$$;
