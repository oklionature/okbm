-- I20: 박지 하나에 들머리를 여러 개 둔다 (2026-11-16, 대표님: 들머리 목록을 따로 + 정보창은 들머리 탭)
-- 1) spot_trailheads: 박지마다 들머리 목록(이름·주소·좌표). 대표 들머리(is_main)는 spots.trailhead_name/addr와 늘 같게 트리거로 맞춘다.
--    대표 들머리는 지금처럼 주소로 내비를 찾고(lat/lng 없음), GPX 출발점으로 생긴 들머리는 좌표로 바로 안내한다.
-- 2) spot_gpx_tracks.trailhead_id: 선마다 어느 들머리에서 출발했는지. 선 이름이 대표 들머리 이름과 같으면 대표,
--    아니면 같은 박지의 다른 들머리 300m 안이면 그것, 없으면 선 출발점으로 들머리를 새로 만든다(okbm_link_track_trailhead).
-- 3) get_spot_detail: 회원에게 trailheads 목록을 주고, gpx_tracks에 trailhead_id를 붙인다. (지금 올라가 있는 정의에서 이것만 더함)
-- 4) okbm_admin_gpx_review: 승인한 선을 들머리에 묶는다. (I16의 GPX 100점은 그대로)

CREATE TABLE IF NOT EXISTS public.spot_trailheads (
  id bigserial PRIMARY KEY,
  spot_id text NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  addr text CHECK (addr IS NULL OR char_length(addr) <= 200),
  lat double precision,
  lng double precision,
  is_main boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS spot_trailheads_one_main ON public.spot_trailheads (spot_id) WHERE is_main;
CREATE INDEX IF NOT EXISTS spot_trailheads_spot ON public.spot_trailheads (spot_id, id);
ALTER TABLE public.spot_trailheads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_trailheads FROM anon, authenticated;

ALTER TABLE public.spot_gpx_tracks ADD COLUMN IF NOT EXISTS trailhead_id bigint REFERENCES public.spot_trailheads(id) ON DELETE SET NULL;

-- 대표 들머리 이름: 박지 들머리 이름이 비면 '○○ 들머리'
CREATE OR REPLACE FUNCTION public.okbm_main_trailhead_name(p_name text, p_spot_main text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT left(COALESCE(NULLIF(btrim(COALESCE(p_name, '')), ''),
                       NULLIF(btrim(regexp_replace(COALESCE(p_spot_main, ''), '\s*[\(\[（].*$', '')), '') || ' 들머리',
                       '들머리'), 40)
$$;

-- 박지를 만들거나 들머리 이름·주소를 고치면 대표 들머리도 같이
CREATE OR REPLACE FUNCTION public.okbm_spot_main_trailhead_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.spot_trailheads (spot_id, name, addr, is_main)
  VALUES (NEW.id, public.okbm_main_trailhead_name(NEW.trailhead_name, NEW.spot_main), NULLIF(left(btrim(COALESCE(NEW.trailhead_addr, '')), 200), ''), true)
  ON CONFLICT (spot_id) WHERE is_main
  DO UPDATE SET name = EXCLUDED.name, addr = EXCLUDED.addr;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS spots_main_trailhead_sync ON public.spots;
CREATE TRIGGER spots_main_trailhead_sync
AFTER INSERT OR UPDATE OF trailhead_name, trailhead_addr, spot_main ON public.spots
FOR EACH ROW EXECUTE FUNCTION public.okbm_spot_main_trailhead_sync();

-- 지금 박지 모두 대표 들머리 만들기
INSERT INTO public.spot_trailheads (spot_id, name, addr, is_main)
SELECT s.id, public.okbm_main_trailhead_name(s.trailhead_name, s.spot_main), NULLIF(left(btrim(COALESCE(s.trailhead_addr, '')), 200), ''), true
FROM public.spots s
ON CONFLICT (spot_id) WHERE is_main DO NOTHING;

-- 선 하나를 들머리에 묶는다
CREATE OR REPLACE FUNCTION public.okbm_link_track_trailhead(p_track_id bigint)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t record;
  v_main record;
  v_id bigint;
  v_name text;
BEGIN
  SELECT * INTO t FROM public.spot_gpx_tracks WHERE id = p_track_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF t.trailhead_id IS NOT NULL THEN RETURN t.trailhead_id; END IF;
  SELECT * INTO v_main FROM public.spot_trailheads WHERE spot_id = t.spot_id AND is_main;
  v_name := NULLIF(left(btrim(COALESCE(t.trailhead, '')), 40), '');
  IF t.start_lat IS NULL OR t.start_lng IS NULL OR (v_main.id IS NOT NULL AND v_name = v_main.name) THEN
    v_id := v_main.id;
  ELSE
    SELECT h.id INTO v_id FROM public.spot_trailheads h
    WHERE h.spot_id = t.spot_id AND NOT h.is_main AND h.lat IS NOT NULL
      AND sqrt(power((h.lat - t.start_lat) * 110540, 2) + power((h.lng - t.start_lng) * 111320 * cos(radians(t.start_lat)), 2)) <= 300
    ORDER BY sqrt(power((h.lat - t.start_lat) * 110540, 2) + power((h.lng - t.start_lng) * 111320 * cos(radians(t.start_lat)), 2))
    LIMIT 1;
    IF v_id IS NULL THEN
      INSERT INTO public.spot_trailheads (spot_id, name, lat, lng)
      VALUES (t.spot_id, COALESCE(v_name, '다른 들머리'), t.start_lat, t.start_lng)
      RETURNING id INTO v_id;
    END IF;
  END IF;
  UPDATE public.spot_gpx_tracks SET trailhead_id = v_id WHERE id = p_track_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_link_track_trailhead(bigint) FROM PUBLIC, anon, authenticated;

-- 지금 선 모두 묶기
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.spot_gpx_tracks WHERE trailhead_id IS NULL ORDER BY id LOOP
    PERFORM public.okbm_link_track_trailhead(r.id);
  END LOOP;
END $$;

-- 박지 상세: 회원에게 들머리 목록 + 선마다 trailhead_id
CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c_member_per_minute constant integer := 20; c_guest_per_minute constant integer := 60; c_member_per_day constant integer := 100; v_is_service boolean := auth.role() = 'service_role'; v_member boolean; v_admin boolean := false; v_actor text; v_uid text; v_day date; v_seen integer; v_limited text := ''; s record; v_tracks jsonb; v_ths jsonb; BEGIN v_member := v_is_service OR ( auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false ); IF v_member AND NOT v_is_service THEN v_admin := COALESCE(public.okbm_is_admin(), false); END IF;  IF NOT v_is_service AND NOT v_admin THEN v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip()); IF NOT public.okbm_actor_rate_limit( v_actor, 'get_spot_detail', CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END ) THEN IF v_member THEN v_limited := 'minute'; ELSE RAISE EXCEPTION 'rate limit exceeded'; END IF; END IF; END IF; IF p_id IS NULL OR btrim(p_id) = '' THEN RETURN NULL; END IF; SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls, sp.author_sns_url, sp.view_brief, sp.gpx_url, sp.gpx_credit INTO s FROM public.spots sp WHERE sp.id = btrim(p_id) LIMIT 1; IF NOT FOUND THEN RETURN NULL; END IF;  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN v_uid := auth.uid()::text; v_day := (now() AT TIME ZONE 'Asia/Seoul')::date; PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid)); IF NOT EXISTS ( SELECT 1 FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id ) THEN SELECT count(*) INTO v_seen FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day; IF v_seen >= c_member_per_day THEN v_limited := 'daily'; ELSE INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id) VALUES (v_uid, v_day, s.id) ON CONFLICT DO NOTHING; END IF; END IF; END IF; IF v_member AND v_limited = '' THEN SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'url', t.gpx_url, 'trailhead', COALESCE(t.trailhead, ''), 'trailhead_id', t.trailhead_id, 'km', t.km, 'credit', COALESCE(t.credit, '')) ORDER BY t.id), '[]'::jsonb) INTO v_tracks FROM public.spot_gpx_tracks t WHERE t.spot_id = s.id; SELECT COALESCE(jsonb_agg(jsonb_build_object('id', h.id, 'name', h.name, 'addr', COALESCE(h.addr, ''), 'lat', h.lat, 'lng', h.lng, 'main', h.is_main) ORDER BY h.is_main DESC, h.id), '[]'::jsonb) INTO v_ths FROM public.spot_trailheads h WHERE h.spot_id = s.id; RETURN jsonb_build_object( 'tier', 'member', 'trailhead_addr', s.trailhead_addr, 'desc_summary', s.desc_summary, 'mediaUrls', s.media_urls, 'author_sns_url', s.author_sns_url, 'gpx_url', COALESCE(s.gpx_url, ''), 'gpx_credit', COALESCE(s.gpx_credit, ''), 'gpx_tracks', v_tracks, 'trailheads', v_ths ); END IF; RETURN jsonb_build_object( 'tier', 'guest', 'trailhead_addr', '', 'desc_summary', CASE WHEN COALESCE(btrim(s.view_brief), '') = '' THEN '' ELSE '[뷰/특징] ' || btrim(s.view_brief) END, 'mediaUrls', s.media_urls, 'author_sns_url', '' ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END; END; $function$;

-- 검수 승인: 선을 들머리에 묶는다 (나머지는 지금 올라가 있는 정의 그대로, GPX 100점)
CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_review(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL::text, p_trailhead text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g record;
  v_nick text;
  v_th text;
  v_pts integer := 0;
  v_track bigint;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO g FROM public.spot_gpx_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
  IF g.status <> '검수대기' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE = '22023'; END IF;
  IF p_approve THEN
    SELECT nickname INTO v_nick FROM public.users WHERE id = g.user_id;
    v_nick := NULLIF(left(btrim(COALESCE(v_nick, '')), 40), '');
    v_th := COALESCE(NULLIF(left(btrim(COALESCE(p_trailhead, '')), 40), ''), g.trailhead);
    INSERT INTO public.spot_gpx_tracks (spot_id, gpx_url, trailhead, start_lat, start_lng, km, user_id, credit, submission_id)
    VALUES (g.spot_id, g.gpx_url, v_th, g.start_lat, g.start_lng, g.km, g.user_id, v_nick, g.id)
    ON CONFLICT (spot_id, gpx_url) DO NOTHING
    RETURNING id INTO v_track;
    IF v_track IS NOT NULL THEN PERFORM public.okbm_link_track_trailhead(v_track); END IF;
    UPDATE public.spots SET gpx_url = g.gpx_url, gpx_credit = v_nick
    WHERE id = g.spot_id AND btrim(COALESCE(gpx_url, '')) = '';
    UPDATE public.spot_gpx_submissions SET status = '승인', trailhead = v_th, reviewed_at = now() WHERE id = p_id;
    v_pts := public.okbm_point_award(g.user_id, 'gpx', g.id::text, 100, NULL, NULL);
  ELSE
    UPDATE public.spot_gpx_submissions SET status = '반려', reject_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''), reviewed_at = now() WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'points', v_pts);
END;
$function$;

-- 확인
SELECT (SELECT count(*) FROM public.spot_trailheads WHERE is_main) AS main_ths,
       (SELECT count(*) FROM public.spots) AS spots,
       (SELECT count(*) FROM public.spot_trailheads WHERE NOT is_main) AS extra_ths,
       (SELECT count(*) FROM public.spot_gpx_tracks WHERE trailhead_id IS NULL) AS unlinked,
       (SELECT json_agg(json_build_object('spot', h.spot_id, 'id', h.id, 'name', h.name, 'lat', h.lat, 'lng', h.lng) ORDER BY h.spot_id, h.id) FROM public.spot_trailheads h WHERE NOT h.is_main) AS extras;
