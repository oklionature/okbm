-- =========================================================================
-- I33 낭만 포인트 손보기 (2026-11-21 대표님과 정함, TASK_POINTS.md)
--
-- 정보창(5점)을 열 포인트가 모자라다는 말이 있어서, 자주 들어오고 가볍게 활동하면 넉넉히 모이게 한다.
--   1) 매일 출석 10 → 20
--   2) 연속 출석 계단: 3일째 +30, 7일째 +100, 14일째 +150, 30일째 +300. 30일을 채우면 다시 1일째부터.
--      하루 빠지면 1일째부터. 보너스는 지금처럼 까닭 'attend7'(ref = 그날 날짜)으로 쌓는다.
--   3) 별 누르기 2점·하루 20 → 5점·하루 30(6번). 피드 별과 라운지 좋아요가 같은 칸이다.
--   4) 댓글 10점·하루 60 → 15점·하루 90(6개). 피드 댓글과 게시판 댓글이 같은 칸이다.
--   5) okbm_my_points에 'streak'(지금 연속 출석 일수)을 더해 포인트 창 도장판에 쓴다.
--
-- 점수 숫자는 I16처럼 서버 정의에서 글자만 바꾼다. 못 찾으면 멈추고, 이미 바뀌었으면 넘어간다.
-- 지난 활동은 소급하지 않는다.
-- =========================================================================
BEGIN;

-- 1) 연속 출석 일수: 오늘 출석했으면 오늘부터, 아직이면 어제부터 거꾸로 센다
CREATE OR REPLACE FUNCTION public.okbm_point_streak(p_user text)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_n integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.point_ledger WHERE user_id = p_user AND reason = 'attend' AND ref_id = v_day::text) THEN
    v_day := v_day - 1;
  END IF;
  WHILE v_n < 3650 AND EXISTS (SELECT 1 FROM public.point_ledger
                                WHERE user_id = p_user AND reason = 'attend' AND ref_id = (v_day - v_n)::text) LOOP
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_point_streak(text) FROM PUBLIC, anon, authenticated;

-- 2) 출석: 20점, 연속 계단 보너스
CREATE OR REPLACE FUNCTION public.okbm_points_attend()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_got integer := 0;
  v_bonus integer := 0;
  v_streak integer := 0;
  v_pts integer;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('points_attend', 10);
  v_got := public.okbm_point_award(v_uid, 'attend', v_day::text, 20, NULL);
  v_streak := public.okbm_point_streak(v_uid);
  IF v_got > 0 THEN
    v_pts := CASE ((v_streak - 1) % 30) + 1 WHEN 3 THEN 30 WHEN 7 THEN 100 WHEN 14 THEN 150 WHEN 30 THEN 300 ELSE 0 END;
    IF v_pts > 0 THEN
      v_bonus := public.okbm_point_award(v_uid, 'attend7', v_day::text, v_pts, NULL, v_streak || '일 연속');
    END IF;
  END IF;
  RETURN jsonb_build_object('gained', v_got + v_bonus, 'attend', v_got, 'streak_bonus', v_bonus, 'streak', v_streak);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_points_attend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_points_attend() TO authenticated;

-- 3) 별·댓글 점수, 내 포인트에 연속 일수 -------------------------------------------
DO $do$
DECLARE
  pairs text[] := ARRAY[
    'okbm_points_on_like',      '''star_give'', NEW.feed_id, 2, 20)',                     '''star_give'', NEW.feed_id, 5, 30)',
    'okbm_lounge_like_notify',  '''star_give'', ''lp:'' || NEW.post_id::text, 2, 20)',    '''star_give'', ''lp:'' || NEW.post_id::text, 5, 30)',
    'okbm_points_on_comment',   '''comment'', NEW.feed_id, 10, 60,',                      '''comment'', NEW.feed_id, 15, 90,',
    'okbm_points_on_lcomment',  '''comment'', ''lp:'' || NEW.post_id::text, 10, 60,',     '''comment'', ''lp:'' || NEW.post_id::text, 15, 90,',
    'okbm_my_points',           '''balance'', (SELECT',                                   '''streak'', public.okbm_point_streak(v_uid), ''balance'', (SELECT'
  ];
  i integer;
  v_name text; v_old text; v_new text;
  v_oid oid; v_n integer; v_def text;
BEGIN
  FOR i IN 0 .. (array_length(pairs, 1) / 3) - 1 LOOP
    v_name := pairs[i * 3 + 1]; v_old := pairs[i * 3 + 2]; v_new := pairs[i * 3 + 3];
    SELECT count(*), min(p.oid) INTO v_n, v_oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_name;
    IF v_n <> 1 THEN RAISE EXCEPTION '% : 함수가 %개라 멈춤', v_name, v_n; END IF;
    v_def := pg_get_functiondef(v_oid);
    IF position(v_new IN v_def) > 0 THEN
      RAISE NOTICE '% : 이미 바뀌어 있음', v_name;
    ELSIF position(v_old IN v_def) > 0 THEN
      EXECUTE replace(v_def, v_old, v_new);
      RAISE NOTICE '% : 바꿈', v_name;
    ELSE
      RAISE EXCEPTION '% : 바꿀 글자를 못 찾아 멈춤 (%)', v_name, v_old;
    END IF;
  END LOOP;
END
$do$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- 확인: 별·댓글 줄이 5, 30 / 15, 90으로, 출석이 20으로 나오고, 내 포인트에 streak가 있으면 된다.
SELECT string_agg(x, ' ;; ' ORDER BY x) AS r FROM (
  SELECT p.proname || ' => ' || string_agg(m[1], ' | ') AS x
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL regexp_matches(pg_get_functiondef(p.oid), '(okbm_point_award\([^;]*?\))', 'g') m
   WHERE n.nspname = 'public' AND p.proname IN ('okbm_points_on_like','okbm_lounge_like_notify','okbm_points_on_comment',
         'okbm_points_on_lcomment','okbm_points_attend')
   GROUP BY p.proname
  UNION ALL SELECT 'my_points streak ' || (position('okbm_point_streak' IN pg_get_functiondef('public.okbm_my_points(integer)'::regprocedure)) > 0)
  UNION ALL SELECT '연속 7일 넘는 회원 ' || count(*) FROM (SELECT DISTINCT user_id FROM public.point_ledger WHERE reason = 'attend') u
                                         WHERE public.okbm_point_streak(u.user_id) >= 7
) t;
