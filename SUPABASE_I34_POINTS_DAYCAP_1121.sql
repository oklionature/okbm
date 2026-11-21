-- =========================================================================
-- I34 낭만 포인트 하루 상한 줄이기 (2026-11-21 대표님, I33 바로 뒤)
--
-- 대표님: 한 번에 많이 모으면 자주 안 들어온다. 자주 들어와 커뮤니티 활동을 하게.
--   1) 댓글 15점은 그대로, 하루 6개(90) → 3개(45)
--   2) 별 누르기 5점은 그대로, 하루 6번(30) → 3번(15)
--   3) 연속 출석 보너스는 7일째 +100만(7일마다 다시). I33의 3·14·30일째 계단은 없앤다.
--   후기(한 줄·별점·장비)는 하루 3개 그대로. 하루 최대 390 → 330.
-- =========================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.okbm_points_attend()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_got integer := 0;
  v_bonus integer := 0;
  v_streak integer := 0;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('points_attend', 10);
  v_got := public.okbm_point_award(v_uid, 'attend', v_day::text, 20, NULL);
  v_streak := public.okbm_point_streak(v_uid);
  IF v_got > 0 AND v_streak > 0 AND v_streak % 7 = 0 THEN
    v_bonus := public.okbm_point_award(v_uid, 'attend7', v_day::text, 100, NULL, v_streak || '일 연속');
  END IF;
  RETURN jsonb_build_object('gained', v_got + v_bonus, 'attend', v_got, 'streak_bonus', v_bonus, 'streak', v_streak);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_points_attend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_points_attend() TO authenticated;

DO $do$
DECLARE
  pairs text[] := ARRAY[
    'okbm_points_on_like',      '''star_give'', NEW.feed_id, 5, 30)',                     '''star_give'', NEW.feed_id, 5, 15)',
    'okbm_lounge_like_notify',  '''star_give'', ''lp:'' || NEW.post_id::text, 5, 30)',    '''star_give'', ''lp:'' || NEW.post_id::text, 5, 15)',
    'okbm_points_on_comment',   '''comment'', NEW.feed_id, 15, 90,',                      '''comment'', NEW.feed_id, 15, 45,',
    'okbm_points_on_lcomment',  '''comment'', ''lp:'' || NEW.post_id::text, 15, 90,',     '''comment'', ''lp:'' || NEW.post_id::text, 15, 45,'
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

-- 확인: 별 5, 15 / 댓글 15, 45 / 출석 20과 7일째 100이 나오면 된다.
SELECT string_agg(x, ' ;; ' ORDER BY x) AS r FROM (
  SELECT p.proname || ' => ' || string_agg(m[1], ' | ') AS x
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL regexp_matches(pg_get_functiondef(p.oid), '(okbm_point_award\([^;]*?\))', 'g') m
   WHERE n.nspname = 'public' AND p.proname IN ('okbm_points_on_like','okbm_lounge_like_notify','okbm_points_on_comment',
         'okbm_points_on_lcomment','okbm_points_attend')
   GROUP BY p.proname
) t;
