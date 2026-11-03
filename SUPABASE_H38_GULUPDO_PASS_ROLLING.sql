-- =========================================================================
-- H38 굴업도 입장권: '매시 정각까지' → '낸 때부터 1시간' (2026-11-03 대표님)
--
-- 왜: 정각 기준이라 5:49에 15점을 내면 11분만 쓰고, 6시에 나갔다 들어오면 또 15점이 빠졌다(장부: 구름따라 17:49·18:33·19:17).
--   게임 중 잠깐 끊겨 다시 붙을 때도(p_rejoin) 정시 넘어 10분이 지나면 '입장권 없음'(4006)으로 막혀 혼자 섬에 남았다.
-- 바꿈:
--   · 입장권 있음 = 'gulupdo' 장부 줄이 60분 안에 있음(낸 시각 기준).
--   · 게임 서버가 다시 붙을 때(p_rejoin=true)는 120분 안이면 통과.
--   · 장부 ref_id는 그대로 산 시각의 시간('2026-11-03T18'). 같은 시간 안에 산 줄은 늘 60분 안이라 다시 사지 않아 겹치지 않는다.
--   · 돌려주는 값은 H36과 같고, until(입장권 끝나는 시각, ISO)을 더한다.
--
-- 되돌리기: SUPABASE_H36_GULUPDO_PASS.sql을 다시 실행.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_gulupdo_pass(p_buy boolean DEFAULT false, p_rejoin boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_price constant integer := 15;
  v_hour text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD"T"HH24');
  v_admin boolean;
  v_has boolean;
  v_bal integer;
  v_last timestamptz;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('gulupdo_pass', 30);
  PERFORM pg_advisory_xact_lock(hashtext('gulupdo_pass:' || v_uid));   -- 두 번 눌러도 한 번만 빠지게

  SELECT COALESCE(u.is_admin, false) INTO v_admin FROM public.users u WHERE u.id = v_uid;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'no member' USING ERRCODE = '28000'; END IF;
  SELECT COALESCE(sum(delta), 0) INTO v_bal FROM public.point_ledger WHERE user_id = v_uid;
  SELECT max(created_at) INTO v_last FROM public.point_ledger WHERE user_id = v_uid AND reason = 'gulupdo' AND created_at > now() - interval '2 hours';
  v_has := v_admin OR (v_last IS NOT NULL AND v_last > now() - CASE WHEN COALESCE(p_rejoin, false) THEN interval '120 minutes' ELSE interval '60 minutes' END);

  IF v_has OR NOT COALESCE(p_buy, false) THEN
    RETURN jsonb_build_object('ok', v_has, 'admin', v_admin, 'paid', false, 'has', v_has, 'balance', v_bal, 'price', v_price, 'hour', v_hour,
      'until', CASE WHEN v_has AND NOT v_admin THEN v_last + interval '60 minutes' END);
  END IF;
  IF v_bal < v_price THEN
    RETURN jsonb_build_object('ok', false, 'admin', false, 'paid', false, 'has', false, 'balance', v_bal, 'price', v_price, 'hour', v_hour, 'short', true);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, -v_price, 'gulupdo', v_hour, '굴업도 같이 접속')
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'admin', false, 'paid', true, 'has', true, 'balance', v_bal - v_price, 'price', v_price, 'hour', v_hour,
    'until', now() + interval '60 minutes');
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gulupdo_pass(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gulupdo_pass(boolean, boolean) TO authenticated;
