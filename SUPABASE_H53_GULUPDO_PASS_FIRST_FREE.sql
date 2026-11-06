-- =========================================================================
-- H53 굴업도 입장권: 처음 한 번은 무료 (2026-11-06 대표님)
--
-- 왜: 닉네임 바꾸기처럼 '처음 한 번은 무료'로 바꾼다.
--   첫 입장은 0점으로 장부에 남고, 두 번째부터 15점이 빠진다.
--   돌려주는 값에 first_free(true/false)를 더해, 확인 창이 '무료로 들어가기'/'15점 쓰고 들어가기'로 글자가 갈린다.
-- 바꿈:
--   · v_ever_bought: 지금까지 'gulupdo' 장부 줄이 하나라도 있으면 true(0점 줄 포함).
--   · p_buy=true일 때 v_ever_bought가 false면 delta=0으로 장부에 넣고 paid=false·first_free=true로 돌려준다.
--     장부 note는 '굴업도 같이 접속(처음은 무료)'.
--   · 장부 ref_id는 그대로 산 시각의 시간(예 '2026-11-06T18') — H38 로직 유지.
--   · 1시간 유지, 다시 붙기(p_rejoin=true) 2시간 봐주기 그대로.
-- 되돌리기: SUPABASE_H38_GULUPDO_PASS_ROLLING.sql을 다시 실행.
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
  v_ever_bought boolean;
  v_first_free boolean;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('gulupdo_pass', 30);
  PERFORM pg_advisory_xact_lock(hashtext('gulupdo_pass:' || v_uid));

  SELECT COALESCE(u.is_admin, false) INTO v_admin FROM public.users u WHERE u.id = v_uid;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'no member' USING ERRCODE = '28000'; END IF;
  SELECT COALESCE(sum(delta), 0) INTO v_bal FROM public.point_ledger WHERE user_id = v_uid;
  SELECT max(created_at) INTO v_last FROM public.point_ledger WHERE user_id = v_uid AND reason = 'gulupdo' AND created_at > now() - interval '2 hours';
  v_has := v_admin OR (v_last IS NOT NULL AND v_last > now() - CASE WHEN COALESCE(p_rejoin, false) THEN interval '120 minutes' ELSE interval '60 minutes' END);
  SELECT EXISTS(SELECT 1 FROM public.point_ledger WHERE user_id = v_uid AND reason = 'gulupdo') INTO v_ever_bought;
  v_first_free := NOT v_ever_bought AND NOT v_admin;

  IF v_has OR NOT COALESCE(p_buy, false) THEN
    RETURN jsonb_build_object('ok', v_has, 'admin', v_admin, 'paid', false, 'has', v_has, 'balance', v_bal, 'price', v_price, 'hour', v_hour,
      'first_free', v_first_free,
      'until', CASE WHEN v_has AND NOT v_admin THEN v_last + interval '60 minutes' END);
  END IF;
  IF NOT v_first_free AND v_bal < v_price THEN
    RETURN jsonb_build_object('ok', false, 'admin', false, 'paid', false, 'has', false, 'balance', v_bal, 'price', v_price, 'hour', v_hour, 'short', true, 'first_free', false);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, CASE WHEN v_first_free THEN 0 ELSE -v_price END, 'gulupdo', v_hour,
          CASE WHEN v_first_free THEN '굴업도 같이 접속(처음은 무료)' ELSE '굴업도 같이 접속' END)
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'admin', false, 'paid', NOT v_first_free, 'has', true,
    'balance', v_bal - CASE WHEN v_first_free THEN 0 ELSE v_price END,
    'price', v_price, 'hour', v_hour, 'first_free', v_first_free,
    'until', now() + interval '60 minutes');
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gulupdo_pass(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gulupdo_pass(boolean, boolean) TO authenticated;
