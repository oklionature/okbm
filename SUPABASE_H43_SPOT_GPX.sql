-- H43: 박지 GPX 등산로 선 (2026-11-05)
-- 왜: 정보창의 'GPX 코스선' 단추(map-main.js toggleGpxTrack)는 있는데 spots에 GPX 칸이 없어 한 번도 안 떴다(기능 사용 0회).
-- 1) spots.gpx_url 칸을 더한다. anon·authenticated에게 칸 읽기 권한을 주지 않는다(선이 들머리 위치를 드러내므로).
-- 2) get_spot_detail이 회원(tier member)에게만 gpx_url을 같이 돌려준다. 나머지는 DB에 걸려 있던 정의 그대로다.
--    화면은 들머리 관문(7원칙 동의)을 통과한 박지에서만 단추를 보인다.
-- 3) 시험: 이천 원적산 원적봉(18)·천덕봉(571)에 트랭글 종주 기록(R2 gpx/official/wonjeok-trangle.gpx)을 넣는다.
-- 파일은 R2 버킷 romanticroute의 gpx/ 아래에 둔다. 자세한 설계는 TASK_GPX.md.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS gpx_url text;
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_gpx_url_r2;
ALTER TABLE public.spots ADD CONSTRAINT spots_gpx_url_r2
  CHECK (gpx_url IS NULL OR gpx_url ~ '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/gpx/[A-Za-z0-9/_.-]+\.gpx$');

CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c_member_per_minute constant integer := 20; c_guest_per_minute constant integer := 60; c_member_per_day constant integer := 100; v_is_service boolean := auth.role() = 'service_role'; v_member boolean; v_admin boolean := false; v_actor text; v_uid text; v_day date; v_seen integer; v_limited text := ''; s record; BEGIN v_member := v_is_service OR ( auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false ); IF v_member AND NOT v_is_service THEN v_admin := COALESCE(public.okbm_is_admin(), false); END IF;  IF NOT v_is_service AND NOT v_admin THEN v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip()); IF NOT public.okbm_actor_rate_limit( v_actor, 'get_spot_detail', CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END ) THEN IF v_member THEN v_limited := 'minute'; ELSE RAISE EXCEPTION 'rate limit exceeded'; END IF; END IF; END IF; IF p_id IS NULL OR btrim(p_id) = '' THEN RETURN NULL; END IF; SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls, sp.author_sns_url, sp.view_brief, sp.gpx_url INTO s FROM public.spots sp WHERE sp.id = btrim(p_id) LIMIT 1; IF NOT FOUND THEN RETURN NULL; END IF;  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN v_uid := auth.uid()::text; v_day := (now() AT TIME ZONE 'Asia/Seoul')::date; PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid)); IF NOT EXISTS ( SELECT 1 FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id ) THEN SELECT count(*) INTO v_seen FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day; IF v_seen >= c_member_per_day THEN v_limited := 'daily'; ELSE INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id) VALUES (v_uid, v_day, s.id) ON CONFLICT DO NOTHING; END IF; END IF; END IF; IF v_member AND v_limited = '' THEN RETURN jsonb_build_object( 'tier', 'member', 'trailhead_addr', s.trailhead_addr, 'desc_summary', s.desc_summary, 'mediaUrls', s.media_urls, 'author_sns_url', s.author_sns_url, 'gpx_url', COALESCE(s.gpx_url, '') ); END IF; RETURN jsonb_build_object( 'tier', 'guest', 'trailhead_addr', '', 'desc_summary', CASE WHEN COALESCE(btrim(s.view_brief), '') = '' THEN '' ELSE '[뷰/특징] ' || btrim(s.view_brief) END, 'mediaUrls', s.media_urls, 'author_sns_url', '' ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END; END; $function$;

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO anon, authenticated, service_role;

UPDATE public.spots SET gpx_url = 'https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/gpx/official/wonjeok-trangle.gpx'
 WHERE id IN ('18', '571');
