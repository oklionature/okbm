-- =========================================================================
-- H47: 이미 GPX 선이 있는 박지에는 GPX를 더 받지 않는다 (2026-11-05)
--
-- 대표님 11-05: 박지 하나에 선 하나. 먼저 승인된 것만 쓰고, 선이 생긴 박지는
-- 정보창·후기 창 어디서 보내도 'spot has gpx'로 거절한다(화면에서도 칸을 숨긴다).
-- H44의 okbm_submit_gpx에 검사 한 줄만 더했다. 여러 번 실행해도 안전.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_submit_gpx(p_spot_id text, p_gpx_url text, p_points integer, p_km numeric,
  p_note text DEFAULT NULL, p_source text DEFAULT 'spot', p_consent boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_url text := btrim(COALESCE(p_gpx_url, ''));
  v_id bigint;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('submit_gpx', 10);
  IF NOT COALESCE(p_consent, false) THEN RAISE EXCEPTION 'consent required' USING ERRCODE = '22023'; END IF;
  -- Worker가 로그인 uid 폴더에 둔 파일만 받는다(남의 파일 주소를 내 것처럼 보내지 못하게)
  IF v_url NOT LIKE 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/' || auth.uid()::text || '/%' THEN
    RAISE EXCEPTION 'invalid gpx url' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.spots WHERE id = v_spot) THEN RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023'; END IF;
  -- 박지 하나에 선 하나(대표님 11-05): 이미 선이 붙은 박지는 더 받지 않는다
  IF EXISTS (SELECT 1 FROM public.spots WHERE id = v_spot AND btrim(COALESCE(gpx_url, '')) <> '') THEN
    RAISE EXCEPTION 'spot has gpx' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_gpx_submissions WHERE user_id = v_uid AND spot_id = v_spot AND status = '검수대기') THEN
    RAISE EXCEPTION 'already pending' USING ERRCODE = '23505';
  END IF;
  IF (SELECT count(*) FROM public.spot_gpx_submissions WHERE user_id = v_uid AND status = '검수대기') >= 5 THEN
    RAISE EXCEPTION 'too many pending' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.spot_gpx_submissions (spot_id, user_id, gpx_url, points, km, note, source, consent)
  VALUES (v_spot, v_uid, v_url, LEAST(GREATEST(COALESCE(p_points, 0), 0), 100000), LEAST(GREATEST(COALESCE(p_km, 0), 0), 999),
          NULLIF(left(btrim(COALESCE(p_note, '')), 300), ''),
          CASE WHEN p_source IN ('spot', 'proposal', 'review', 'lounge') THEN p_source ELSE 'spot' END, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
