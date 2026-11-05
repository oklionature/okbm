-- =========================================================================
-- H48: 박지 제보 창에서 GPX를 같이 받는다 (2026-11-05, TASK_GPX ③)
--
-- 새 박지 제보는 아직 박지 번호가 없어서 바로 GPX 검수 대기(spot_gpx_submissions)에 넣을 수 없다.
--   1) 제보할 때 GPX를 업로드 Worker(POST /gpx, 좌표만 남김)에 올리고, 그 주소를 proposals.gpx_url에 둔다.
--   2) 관리자가 제보를 박지로 반영하면 okbm_admin_gpx_from_proposal이 그 GPX를 새 박지의 검수 대기로 옮긴다.
--      GPX 검수함에서 승인하면 선이 붙고 50점이 간다(정보창·후기 창으로 들어온 것과 같은 길).
-- 이미 선이 있는 박지면 옮기지 않는다(박지 하나에 선 하나, H47).
-- 수정건의(있는 박지)는 화면에서 바로 okbm_submit_gpx(source 'proposal')로 보내므로 여기 해당 없음.
-- 적용: SQL 편집기에서 한 번 실행. 여러 번 실행해도 안전.
-- =========================================================================

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS gpx_url text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS gpx_points integer;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS gpx_km numeric(5,1);

DO $$ BEGIN
  ALTER TABLE public.proposals ADD CONSTRAINT proposals_gpx_url_r2
    CHECK (gpx_url IS NULL OR gpx_url ~ '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/gpx/[A-Za-z0-9-]+/[A-Za-z0-9-]+\.gpx$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_from_proposal(p_proposal_id text, p_spot_id text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop record;
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_id bigint;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT id, user_id, gpx_url, gpx_points, gpx_km INTO v_prop FROM public.proposals WHERE id = p_proposal_id;
  IF v_prop.id IS NULL OR btrim(COALESCE(v_prop.gpx_url, '')) = '' OR btrim(COALESCE(v_prop.user_id, '')) = '' THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.spots WHERE id = v_spot) THEN RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.spots WHERE id = v_spot AND btrim(COALESCE(gpx_url, '')) <> '') THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.spot_gpx_submissions WHERE spot_id = v_spot AND gpx_url = v_prop.gpx_url LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.spot_gpx_submissions (spot_id, user_id, gpx_url, points, km, note, source, consent)
  VALUES (v_spot, v_prop.user_id, v_prop.gpx_url, v_prop.gpx_points, v_prop.gpx_km, '박지 제보와 함께 보낸 길', 'proposal', true)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_admin_gpx_from_proposal(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_gpx_from_proposal(text, text) TO authenticated;
