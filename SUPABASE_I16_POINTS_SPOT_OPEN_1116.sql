-- =========================================================================
-- I16 낭만 포인트 개편 (2026-11-16 대표님, 설계 TASK_POINTS_1116.md)
--
-- 1) 박지 정보창을 열 때 5점. 박지마다 한 번만 내고, 한 번 연 박지는 계속 무료(spot_opens).
--    관리자는 무료. 모자라면 열지 않고 잔액만 돌려준다. 화면은 map-main.js focusSpotOnMap → spot-open-points.js
-- 2) 시작 선물 50점: 지금 회원 모두 + 앞으로 가입하는 회원(users 줄이 생길 때). 사람마다 한 번(ref 'start')
-- 3) 활동 점수 올림(하루 상한 개수는 그대로):
--    피드 10→20(하루 30→60점) · 댓글 5→10(30→60, 피드·게시판 합쳐) · 한 줄 후기 5→10(15→30)
--    별점 후기 5→10(15→30) · 수정 건의 채택 50→100 · 박지 제보 반영 100→200 · GPX 반영 50→100
--    함수 본문은 다른 작업(GPX 들머리 I14·I15)과 겹치지 않게 서버에 지금 올라가 있는 정의를 읽어 점수 부분만 바꾼다.
--    바꿀 글자가 없으면(이미 바뀌었으면 넘어가고, 모양이 다르면) 멈춘다.
--
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전(선물은 사람마다 한 번, 점수는 이미 바뀌었으면 넘어감).
-- 되돌리기(점수만): 아래 3)의 바꿀 쌍을 거꾸로 넣어 다시 실행. 정보창 5점 끄기:
--   DROP FUNCTION IF EXISTS public.okbm_spot_open(text, text); (화면은 함수가 없으면 그냥 연다)
-- 주의: SUPABASE_I14_GPX_TRAILHEADS.sql 등 okbm_admin_gpx_review를 새로 만드는 파일을 다시 실행하면 GPX 점수가 50으로 돌아간다.
-- =========================================================================

-- 1) 박지 정보창 ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spot_opens (
  user_id text NOT NULL,
  spot_id text NOT NULL,
  how text NOT NULL DEFAULT 'points',
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);
ALTER TABLE public.spot_opens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_opens FROM anon, authenticated;

-- p_mode: 'check'(값·잔액만 보기) | 'pay'(5점 내고 열기)
CREATE OR REPLACE FUNCTION public.okbm_spot_open(p_spot_id text, p_mode text DEFAULT 'check')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_price constant integer := 5;
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_admin boolean;
  v_bal integer;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('spot_open', 60);
  PERFORM pg_advisory_xact_lock(hashtext('spot_open:' || v_uid));   -- 두 번 눌러도 한 번만 빠지게
  IF v_spot = '' OR NOT EXISTS (SELECT 1 FROM public.spots s WHERE s.id::text = v_spot) THEN
    RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023';
  END IF;
  SELECT COALESCE(u.is_admin, false) INTO v_admin FROM public.users u WHERE u.id = v_uid;
  IF COALESCE(v_admin, false) THEN
    RETURN jsonb_build_object('ok', true, 'free', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_opens WHERE user_id = v_uid AND spot_id = v_spot) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  SELECT COALESCE(sum(delta), 0) INTO v_bal FROM public.point_ledger WHERE user_id = v_uid;
  IF p_mode <> 'pay' OR v_bal < c_price THEN
    RETURN jsonb_build_object('ok', false, 'price', c_price, 'balance', v_bal, 'short', v_bal < c_price);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, -c_price, 'spot_open', v_spot, '박지 정보창')
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  INSERT INTO public.spot_opens (user_id, spot_id, how) VALUES (v_uid, v_spot, 'points') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'paid', true, 'price', c_price, 'balance', v_bal - c_price);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_spot_open(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_spot_open(text, text) TO authenticated;

-- 내가 연 박지 번호들(화면이 처음에 한 번 받아 두고, 연 곳은 서버를 다시 부르지 않는다)
CREATE OR REPLACE FUNCTION public.okbm_my_spot_opens()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('my_spot_opens', 30);
  RETURN jsonb_build_object(
    'admin', COALESCE((SELECT u.is_admin FROM public.users u WHERE u.id = v_uid), false),
    'spots', (SELECT COALESCE(jsonb_agg(spot_id), '[]'::jsonb) FROM public.spot_opens WHERE user_id = v_uid)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_my_spot_opens() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_my_spot_opens() TO authenticated;

-- 2) 시작 선물 50점 -------------------------------------------------------------
INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
SELECT u.id, 50, 'gift', 'start', '시작 선물'
  FROM public.users u
 WHERE COALESCE(btrim(u.id), '') <> ''
ON CONFLICT (user_id, reason, ref_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.okbm_points_on_user_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.okbm_point_award(NEW.id, 'gift', 'start', 50, NULL, '시작 선물');
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_points_on_user_new() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_okbm_points_user_new ON public.users;
CREATE TRIGGER trg_okbm_points_user_new AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.okbm_points_on_user_new();

-- 3) 활동 점수 올림 ---------------------------------------------------------------
DO $do$
DECLARE
  pairs text[] := ARRAY[
    'okbm_points_on_feed',       '''feed'', NEW.id, 10, 30)',                       '''feed'', NEW.id, 20, 60)',
    'okbm_points_on_comment',    '''comment'', NEW.feed_id, 5, 30,',                '''comment'', NEW.feed_id, 10, 60,',
    'okbm_points_on_lcomment',   '''comment'', ''lp:'' || NEW.post_id::text, 5, 30,', '''comment'', ''lp:'' || NEW.post_id::text, 10, 60,',
    'okbm_points_on_tip',        '''tip'', NEW.spot_id, 5, 15)',                    '''tip'', NEW.spot_id, 10, 30)',
    'okbm_points_on_review',     '''review'', NEW.spot_id, 5, 15,',                 '''review'', NEW.spot_id, 10, 30,',
    'okbm_points_on_correction', '''correction'', NEW.id, 50, NULL)',               '''correction'', NEW.id, 100, NULL)',
    'okbm_points_on_proposal',   '''proposal'', NEW.id, 100, NULL)',                '''proposal'', NEW.id, 200, NULL)',
    'okbm_admin_gpx_review',     '''gpx'', g.id::text, 50, NULL, NULL)',            '''gpx'', g.id::text, 100, NULL, NULL)'
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
    IF position(v_old IN v_def) > 0 THEN
      EXECUTE replace(v_def, v_old, v_new);
      RAISE NOTICE '% : 바꿈', v_name;
    ELSIF position(v_new IN v_def) > 0 THEN
      RAISE NOTICE '% : 이미 바뀌어 있음', v_name;
    ELSE
      RAISE EXCEPTION '% : 바꿀 글자를 못 찾아 멈춤 (%)', v_name, v_old;
    END IF;
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';

-- 확인: 점수 주는 줄이 새 점수로 나오고, 선물 받은 회원 수가 회원 수와 같으면 된다.
SELECT string_agg(x, ' ;; ' ORDER BY x) AS r FROM (
  SELECT p.proname || ' => ' || string_agg(m[1], ' | ') AS x
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
         LATERAL regexp_matches(pg_get_functiondef(p.oid), '(okbm_point_award\([^;]*?\))', 'g') m
   WHERE n.nspname = 'public' AND p.proname IN ('okbm_points_on_feed','okbm_points_on_comment','okbm_points_on_lcomment',
         'okbm_points_on_tip','okbm_points_on_review','okbm_points_on_correction','okbm_points_on_proposal','okbm_admin_gpx_review')
   GROUP BY p.proname
  UNION ALL SELECT 'gift 받은 회원 ' || (SELECT count(*) FROM public.point_ledger WHERE reason = 'gift' AND ref_id = 'start')
         || ' / 회원 ' || (SELECT count(*) FROM public.users)
) t;
