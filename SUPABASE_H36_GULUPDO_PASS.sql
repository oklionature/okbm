-- =========================================================================
-- H36 굴업도 같이 접속 입장권: 낭만 포인트 15점 (2026-11-02 대표님. 처음 10점으로 만들었다가 같은 날 15점으로: 첫 출석 10점만으로는 못 들어가게)
--
-- 왜: 굴업도 같이 접속 게임을 회원 모두에게 열고, 들어갈 때 낭만 포인트 15점을 쓴다.
--   · 섬 하루 = 실제 1시간(한국 시간 매시 0~59분). 그 시간 안에서는 한 번만 빠진다(끊겼다 다시 들어와도 무료).
--   · 포인트가 15점이 안 되면 못 들어간다. 관리자는 무료.
--   · 장부(point_ledger)에 reason 'gulupdo', ref_id '2026-11-02T21'(그 시간), delta -15로 남는다.
--
-- okbm_gulupdo_pass(p_buy boolean)
--   p_buy=false: 지금 입장권 상태만 본다(앱 확인 창, 게임 서버의 입장 확인).
--   p_buy=true : 없으면 15점을 빼고 입장권을 만든다. 잔액이 모자라면 빼지 않는다.
--   돌려주는 값: { ok, admin, paid(이번에 뺐는지), has(이번 섬 하루 입장권 있음), balance, price, hour }
--
-- 되돌리기: DROP FUNCTION public.okbm_gulupdo_pass(boolean);
--   (넣은 장부 줄은 남는다. 돌려주려면 운영자 지급으로)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_gulupdo_pass(p_buy boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_price constant integer := 15;
  v_hour text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD"T"HH24');
  v_admin boolean;
  v_has boolean;
  v_bal integer;
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
  v_has := v_admin OR EXISTS (SELECT 1 FROM public.point_ledger WHERE user_id = v_uid AND reason = 'gulupdo' AND ref_id = v_hour);

  IF v_has OR NOT COALESCE(p_buy, false) THEN
    RETURN jsonb_build_object('ok', v_has, 'admin', v_admin, 'paid', false, 'has', v_has, 'balance', v_bal, 'price', v_price, 'hour', v_hour);
  END IF;
  IF v_bal < v_price THEN
    RETURN jsonb_build_object('ok', false, 'admin', false, 'paid', false, 'has', false, 'balance', v_bal, 'price', v_price, 'hour', v_hour, 'short', true);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, -v_price, 'gulupdo', v_hour, '굴업도 같이 접속')
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'admin', false, 'paid', true, 'has', true, 'balance', v_bal - v_price, 'price', v_price, 'hour', v_hour);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gulupdo_pass(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gulupdo_pass(boolean) TO authenticated;
