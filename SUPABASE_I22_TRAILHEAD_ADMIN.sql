-- I22: 관리자가 정보창에서 들머리를 고친다 (2026-11-16, 대표님 '만들어 줘')
-- okbm_admin_trailhead_save: 이름·주소·좌표 저장(p_id 없으면 새 들머리). 대표 들머리는 spots.trailhead_name/addr를 고쳐서 맞춘다.
--   그 들머리에 묶인 GPX 선의 들머리 이름도 같이 바꾼다(GPX 단추 글자).
-- okbm_admin_trailhead_delete: 대표 아닌 들머리 지우기. 묶인 선은 대표 들머리로 옮긴다.
-- okbm_admin_track_trailhead: GPX 선을 같은 박지의 다른 들머리로 옮긴다.
-- 대표 들머리 좌표: 박지 수정에서 주소가 바뀌면 지운다(옛 좌표로 안내하지 않게). 좌표가 있으면 화면이 그 좌표로 바로 안내한다.

CREATE OR REPLACE FUNCTION public.okbm_spot_main_trailhead_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.spot_trailheads (spot_id, name, addr, is_main)
  VALUES (NEW.id, public.okbm_main_trailhead_name(NEW.trailhead_name, NEW.spot_main), NULLIF(left(btrim(COALESCE(NEW.trailhead_addr, '')), 200), ''), true)
  ON CONFLICT (spot_id) WHERE is_main
  DO UPDATE SET name = EXCLUDED.name, addr = EXCLUDED.addr,
    lat = CASE WHEN spot_trailheads.addr IS DISTINCT FROM EXCLUDED.addr THEN NULL ELSE spot_trailheads.lat END,
    lng = CASE WHEN spot_trailheads.addr IS DISTINCT FROM EXCLUDED.addr THEN NULL ELSE spot_trailheads.lng END;
  UPDATE public.spot_gpx_tracks t SET trailhead = h.name
  FROM public.spot_trailheads h
  WHERE h.spot_id = NEW.id AND h.is_main AND t.trailhead_id = h.id AND t.trailhead IS DISTINCT FROM h.name;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.okbm_admin_trailhead_save(p_id bigint, p_spot_id text, p_name text, p_addr text DEFAULT NULL, p_lat double precision DEFAULT NULL, p_lng double precision DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text := left(btrim(COALESCE(p_name, '')), 40);
  v_addr text := NULLIF(left(btrim(COALESCE(p_addr, '')), 200), '');
  h record;
  v_id bigint;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  IF v_name = '' THEN RAISE EXCEPTION 'name required' USING ERRCODE = '22023'; END IF;
  IF (p_lat IS NULL) <> (p_lng IS NULL) OR (p_lat IS NOT NULL AND NOT (p_lat BETWEEN 32 AND 39.5 AND p_lng BETWEEN 124 AND 132)) THEN
    RAISE EXCEPTION 'bad coords' USING ERRCODE = '22023';
  END IF;
  IF p_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.spots WHERE id = btrim(COALESCE(p_spot_id, ''))) THEN RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023'; END IF;
    INSERT INTO public.spot_trailheads (spot_id, name, addr, lat, lng)
    VALUES (btrim(p_spot_id), v_name, v_addr, p_lat, p_lng) RETURNING id INTO v_id;
    RETURN v_id;
  END IF;
  SELECT * INTO h FROM public.spot_trailheads WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
  IF h.is_main THEN
    UPDATE public.spots SET trailhead_name = v_name, trailhead_addr = COALESCE(v_addr, '') WHERE id = h.spot_id;  -- 트리거가 대표 들머리를 맞춘다
  END IF;
  UPDATE public.spot_trailheads SET name = v_name, addr = v_addr, lat = p_lat, lng = p_lng WHERE id = p_id;
  UPDATE public.spot_gpx_tracks SET trailhead = v_name WHERE trailhead_id = p_id;
  RETURN p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.okbm_admin_trailhead_delete(p_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  h record;
  m record;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO h FROM public.spot_trailheads WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF h.is_main THEN RAISE EXCEPTION 'main trailhead' USING ERRCODE = '22023'; END IF;
  SELECT * INTO m FROM public.spot_trailheads WHERE spot_id = h.spot_id AND is_main;
  UPDATE public.spot_gpx_tracks SET trailhead_id = m.id, trailhead = m.name WHERE trailhead_id = p_id;
  DELETE FROM public.spot_trailheads WHERE id = p_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.okbm_admin_track_trailhead(p_track_id bigint, p_trailhead_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t record;
  h record;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT id, spot_id INTO t FROM public.spot_gpx_tracks WHERE id = p_track_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown track' USING ERRCODE = '22023'; END IF;
  SELECT id, spot_id, name INTO h FROM public.spot_trailheads WHERE id = p_trailhead_id;
  IF NOT FOUND OR h.spot_id <> t.spot_id THEN RAISE EXCEPTION 'unknown trailhead' USING ERRCODE = '22023'; END IF;
  UPDATE public.spot_gpx_tracks SET trailhead_id = h.id, trailhead = h.name WHERE id = p_track_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_admin_trailhead_save(bigint, text, text, text, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.okbm_admin_trailhead_delete(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.okbm_admin_track_trailhead(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_trailhead_save(bigint, text, text, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_admin_trailhead_delete(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_admin_track_trailhead(bigint, bigint) TO authenticated;

SELECT proname FROM pg_proc WHERE proname IN ('okbm_admin_trailhead_save', 'okbm_admin_trailhead_delete', 'okbm_admin_track_trailhead') ORDER BY 1;
