-- H46: GPX는 쓰는 사람이 5점을 내고 보낸 사람이 5점을 받는다 (2026-11-05, 대표님)
-- 회원이 보낸(승인된) GPX 선을 처음 켤 때: 켜는 사람 -5점(reason 'gpx_use'), 보낸 사람 +5점(reason 'gpx_open').
-- 포인트가 5점보다 적으면 그냥 연다(mode 'link'). 선 단추가 들머리 관문(등록자 인스타·링크를 한 번 거침) 뒤에만 있어서다. 나중에 광고 자리. 이때는 빼지도 주지도 않는다.
-- 박지마다 처음 한 번만(spot_gpx_unlocks에 남김). 공식 GPX(보낸 사람 없음)·내가 보낸 선·관리자는 무료.
-- H45 okbm_gpx_opened(빼지 않고 주기만 함)는 지운다.
-- 화면: map-main.js toggleGpxTrack → okbm_gpx_use(박지, 'check'|'points'|'link')
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

DROP FUNCTION IF EXISTS public.okbm_gpx_opened(text);

CREATE TABLE IF NOT EXISTS public.spot_gpx_unlocks (
  user_id text NOT NULL,
  spot_id text NOT NULL,
  how text NOT NULL CHECK (how IN ('points', 'link')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);
ALTER TABLE public.spot_gpx_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_gpx_unlocks FROM anon, authenticated;

-- p_mode: 'check' = 열 수 있는지·값만 본다, 'points' = 5점 내고 연다, 'link' = 포인트가 모자라 그냥 연다
CREATE OR REPLACE FUNCTION public.okbm_gpx_use(p_spot_id text, p_mode text DEFAULT 'check')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_price constant integer := 5;
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_owner text;
  v_owner_nick text;
  v_admin boolean;
  v_bal integer;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('gpx_use', 30);
  PERFORM pg_advisory_xact_lock(hashtext('gpx_use:' || v_uid));   -- 두 번 눌러도 한 번만 빠지게

  SELECT g.user_id INTO v_owner
    FROM public.spots sp
    JOIN public.spot_gpx_submissions g ON g.spot_id = sp.id AND g.gpx_url = sp.gpx_url AND g.status = '승인'
   WHERE sp.id = v_spot
   ORDER BY g.reviewed_at DESC NULLS LAST LIMIT 1;
  SELECT COALESCE(u.is_admin, false) INTO v_admin FROM public.users u WHERE u.id = v_uid;
  IF v_owner IS NULL OR v_owner = v_uid OR COALESCE(v_admin, false) THEN
    RETURN jsonb_build_object('ok', true, 'free', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_gpx_unlocks WHERE user_id = v_uid AND spot_id = v_spot) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT COALESCE(sum(delta), 0) INTO v_bal FROM public.point_ledger WHERE user_id = v_uid;
  SELECT nickname INTO v_owner_nick FROM public.users WHERE id = v_owner;
  IF p_mode = 'link' THEN
    INSERT INTO public.spot_gpx_unlocks (user_id, spot_id, how) VALUES (v_uid, v_spot, 'link') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'link', true, 'balance', v_bal);
  END IF;
  IF p_mode <> 'points' OR v_bal < c_price THEN
    RETURN jsonb_build_object('ok', false, 'price', c_price, 'balance', v_bal, 'short', v_bal < c_price, 'owner', v_owner_nick);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, -c_price, 'gpx_use', v_spot, 'GPX 열기')
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  PERFORM public.okbm_point_award(v_owner, 'gpx_open', v_spot || ':' || v_uid, c_price, NULL, NULL);
  INSERT INTO public.spot_gpx_unlocks (user_id, spot_id, how) VALUES (v_uid, v_spot, 'points') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'paid', true, 'balance', v_bal - c_price, 'owner', v_owner_nick);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gpx_use(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gpx_use(text, text) TO authenticated;
