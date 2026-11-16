-- I14: 한 박지에 들머리별로 GPX 여러 개 (대표님 11-16, TASK_GPX.md '들머리별 GPX 여러 개')
-- 1) spot_gpx_tracks 표: 박지마다 선 여러 개(들머리 이름·시작점·거리·보낸 사람). spots.gpx_url/gpx_credit은 첫 선을 그대로 남긴다
--    (선 있음/없음 판단·예전 화면이 그대로 돌게).
-- 2) 지금 박지에 붙은 선을 모두 옮긴다. 들머리 이름·시작점은 I15에서 채운다.
-- 3) get_spot_detail: 회원에게 gpx_tracks 목록도 준다.
-- 4) 선마다 따로 연다: okbm_gpx_track_use(선, 'check'|'points'|'link') — 처음 여는 선마다 5점, 그 선을 보낸 사람 2점.
--    예전 okbm_gpx_use(박지)는 첫 선으로 넘긴다(캐시된 옛 화면용). 열람 기록은 spot_gpx_unlocks.spot_id에 '박지#선'으로 남긴다.
-- 5) okbm_submit_gpx: 선 있는 박지도 받는다. 단 이미 있는 선들의 시작점과 300m 넘게 떨어져야 한다('same trailhead').
--    시작점을 안 보내는 옛 화면은 예전처럼 'spot has gpx'.
-- 6) 검수: 들머리 이름을 고쳐서 승인할 수 있다(p_trailhead). 승인하면 선을 더하고, 박지에 선이 없을 때만 spots.gpx_url을 채운다.
-- 7) 최근 등록 소식·랭킹은 spot_gpx_tracks에 붙어 있는 선으로 센다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

CREATE TABLE IF NOT EXISTS public.spot_gpx_tracks (
  id bigserial PRIMARY KEY,
  spot_id text NOT NULL,
  gpx_url text NOT NULL CHECK (gpx_url ~ '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/gpx/[A-Za-z0-9/_.-]+\.gpx$'),
  trailhead text CHECK (trailhead IS NULL OR char_length(trailhead) <= 40),
  start_lat double precision,
  start_lng double precision,
  km numeric(5,1),
  user_id text,                -- 보낸 회원(검수 승인). 공식·관리자가 바로 붙인 선은 비워 둔다(무료로 열림)
  credit text CHECK (credit IS NULL OR char_length(credit) <= 40),
  submission_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, gpx_url)
);
CREATE INDEX IF NOT EXISTS spot_gpx_tracks_spot ON public.spot_gpx_tracks (spot_id, id);
ALTER TABLE public.spot_gpx_tracks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_gpx_tracks FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.spot_gpx_tracks_id_seq FROM anon, authenticated;

ALTER TABLE public.spot_gpx_submissions ADD COLUMN IF NOT EXISTS trailhead text;
ALTER TABLE public.spot_gpx_submissions ADD COLUMN IF NOT EXISTS start_lat double precision;
ALTER TABLE public.spot_gpx_submissions ADD COLUMN IF NOT EXISTS start_lng double precision;

-- 지금 붙은 선 옮기기(승인된 제보가 있으면 보낸 사람·제보 번호·거리를 같이)
INSERT INTO public.spot_gpx_tracks (spot_id, gpx_url, km, user_id, credit, submission_id, created_at)
SELECT s.id, s.gpx_url, g.km, g.user_id, NULLIF(btrim(COALESCE(s.gpx_credit, '')), ''), g.id, COALESCE(g.reviewed_at, now())
  FROM public.spots s
  LEFT JOIN LATERAL (
    SELECT x.id, x.user_id, x.km, x.reviewed_at FROM public.spot_gpx_submissions x
     WHERE x.spot_id = s.id AND x.gpx_url = s.gpx_url AND x.status = '승인'
     ORDER BY x.reviewed_at DESC NULLS LAST LIMIT 1) g ON true
 WHERE btrim(COALESCE(s.gpx_url, '')) <> ''
ON CONFLICT (spot_id, gpx_url) DO NOTHING;   -- 공식 원적산 선처럼 한 파일을 두 박지가 같이 써도 박지마다 한 줄

-- 예전 열람 기록(박지 하나 = 선 하나)을 그 박지 첫 선으로 옮긴다
UPDATE public.spot_gpx_unlocks u
   SET spot_id = u.spot_id || '#' || t.id
  FROM public.spots s
  JOIN public.spot_gpx_tracks t ON t.spot_id = s.id AND t.gpx_url = s.gpx_url
 WHERE u.spot_id = s.id AND position('#' in u.spot_id) = 0;

-- 박지 상세: gpx_tracks 목록을 더한다(나머지는 지금 정의 그대로)
CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c_member_per_minute constant integer := 20; c_guest_per_minute constant integer := 60; c_member_per_day constant integer := 100; v_is_service boolean := auth.role() = 'service_role'; v_member boolean; v_admin boolean := false; v_actor text; v_uid text; v_day date; v_seen integer; v_limited text := ''; s record; v_tracks jsonb; BEGIN v_member := v_is_service OR ( auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false ); IF v_member AND NOT v_is_service THEN v_admin := COALESCE(public.okbm_is_admin(), false); END IF;  IF NOT v_is_service AND NOT v_admin THEN v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip()); IF NOT public.okbm_actor_rate_limit( v_actor, 'get_spot_detail', CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END ) THEN IF v_member THEN v_limited := 'minute'; ELSE RAISE EXCEPTION 'rate limit exceeded'; END IF; END IF; END IF; IF p_id IS NULL OR btrim(p_id) = '' THEN RETURN NULL; END IF; SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls, sp.author_sns_url, sp.view_brief, sp.gpx_url, sp.gpx_credit INTO s FROM public.spots sp WHERE sp.id = btrim(p_id) LIMIT 1; IF NOT FOUND THEN RETURN NULL; END IF;  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN v_uid := auth.uid()::text; v_day := (now() AT TIME ZONE 'Asia/Seoul')::date; PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid)); IF NOT EXISTS ( SELECT 1 FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id ) THEN SELECT count(*) INTO v_seen FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day; IF v_seen >= c_member_per_day THEN v_limited := 'daily'; ELSE INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id) VALUES (v_uid, v_day, s.id) ON CONFLICT DO NOTHING; END IF; END IF; END IF; IF v_member AND v_limited = '' THEN SELECT COALESCE(jsonb_agg(jsonb_build_object('id', t.id, 'url', t.gpx_url, 'trailhead', COALESCE(t.trailhead, ''), 'km', t.km, 'credit', COALESCE(t.credit, '')) ORDER BY t.id), '[]'::jsonb) INTO v_tracks FROM public.spot_gpx_tracks t WHERE t.spot_id = s.id; RETURN jsonb_build_object( 'tier', 'member', 'trailhead_addr', s.trailhead_addr, 'desc_summary', s.desc_summary, 'mediaUrls', s.media_urls, 'author_sns_url', s.author_sns_url, 'gpx_url', COALESCE(s.gpx_url, ''), 'gpx_credit', COALESCE(s.gpx_credit, ''), 'gpx_tracks', v_tracks ); END IF; RETURN jsonb_build_object( 'tier', 'guest', 'trailhead_addr', '', 'desc_summary', CASE WHEN COALESCE(btrim(s.view_brief), '') = '' THEN '' ELSE '[뷰/특징] ' || btrim(s.view_brief) END, 'mediaUrls', s.media_urls, 'author_sns_url', '' ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END; END; $function$;

-- 선 하나 열기. 공식·관리자가 붙인 선(보낸 사람 없음)·내가 보낸 선·관리자는 무료
CREATE OR REPLACE FUNCTION public.okbm_gpx_track_use(p_track_id bigint, p_mode text DEFAULT 'check')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_price constant integer := 5;
  c_reward constant integer := 2;
  v_uid text := public.okbm_uid();
  t record;
  v_key text;
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
  SELECT id, spot_id, user_id INTO t FROM public.spot_gpx_tracks WHERE id = p_track_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown track' USING ERRCODE = '22023'; END IF;
  v_key := t.spot_id || '#' || t.id;
  SELECT COALESCE(u.is_admin, false) INTO v_admin FROM public.users u WHERE u.id = v_uid;
  IF t.user_id IS NULL OR t.user_id = v_uid OR COALESCE(v_admin, false) THEN
    RETURN jsonb_build_object('ok', true, 'free', true);
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_gpx_unlocks WHERE user_id = v_uid AND spot_id = v_key) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  SELECT COALESCE(sum(delta), 0) INTO v_bal FROM public.point_ledger WHERE user_id = v_uid;
  SELECT nickname INTO v_owner_nick FROM public.users WHERE id = t.user_id;
  IF p_mode = 'link' THEN
    INSERT INTO public.spot_gpx_unlocks (user_id, spot_id, how) VALUES (v_uid, v_key, 'link') ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('ok', true, 'link', true, 'balance', v_bal);
  END IF;
  IF p_mode <> 'points' OR v_bal < c_price THEN
    RETURN jsonb_build_object('ok', false, 'price', c_price, 'balance', v_bal, 'short', v_bal < c_price, 'owner', v_owner_nick);
  END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (v_uid, -c_price, 'gpx_use', v_key, 'GPX 열기')
  ON CONFLICT (user_id, reason, ref_id) DO NOTHING;
  PERFORM public.okbm_point_award(t.user_id, 'gpx_open', v_key || ':' || v_uid, c_reward, NULL, NULL);
  INSERT INTO public.spot_gpx_unlocks (user_id, spot_id, how) VALUES (v_uid, v_key, 'points') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'paid', true, 'balance', v_bal - c_price, 'owner', v_owner_nick);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gpx_track_use(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gpx_track_use(bigint, text) TO authenticated;

-- 예전 화면(박지로 여는 옛 map-main.js): 그 박지 첫 선으로 넘긴다. 선 목록에 없는 공유 공식 선은 무료
CREATE OR REPLACE FUNCTION public.okbm_gpx_use(p_spot_id text, p_mode text DEFAULT 'check')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tid bigint;
BEGIN
  SELECT t.id INTO v_tid FROM public.spots s JOIN public.spot_gpx_tracks t ON t.spot_id = s.id AND t.gpx_url = s.gpx_url
   WHERE s.id = btrim(COALESCE(p_spot_id, '')) LIMIT 1;
  IF v_tid IS NULL THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000'; END IF;
    RETURN jsonb_build_object('ok', true, 'free', true);
  END IF;
  RETURN public.okbm_gpx_track_use(v_tid, p_mode);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gpx_use(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gpx_use(text, text) TO authenticated;

-- 보내기: 들머리 이름·시작점을 같이 받는다
DROP FUNCTION IF EXISTS public.okbm_submit_gpx(text, text, integer, numeric, text, text, boolean);
CREATE OR REPLACE FUNCTION public.okbm_submit_gpx(p_spot_id text, p_gpx_url text, p_points integer, p_km numeric,
  p_note text DEFAULT NULL, p_source text DEFAULT 'spot', p_consent boolean DEFAULT false,
  p_trailhead text DEFAULT NULL, p_start_lat double precision DEFAULT NULL, p_start_lng double precision DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_url text := btrim(COALESCE(p_gpx_url, ''));
  v_has boolean;
  v_start boolean := p_start_lat IS NOT NULL AND p_start_lng IS NOT NULL
                     AND p_start_lat BETWEEN 33 AND 38.7 AND p_start_lng BETWEEN 124.5 AND 132;
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
  -- 선 있는 박지는 다른 들머리만 받는다(대표님 11-16). 시작점을 모르면 예전처럼 막는다
  v_has := EXISTS (SELECT 1 FROM public.spots WHERE id = v_spot AND btrim(COALESCE(gpx_url, '')) <> '')
        OR EXISTS (SELECT 1 FROM public.spot_gpx_tracks WHERE spot_id = v_spot);
  IF v_has AND NOT v_start THEN RAISE EXCEPTION 'spot has gpx' USING ERRCODE = '22023'; END IF;
  IF v_start AND EXISTS (
       SELECT 1 FROM public.spot_gpx_tracks t
        WHERE t.spot_id = v_spot AND t.start_lat IS NOT NULL
          AND sqrt(power((t.start_lat - p_start_lat) * 110540, 2) + power((t.start_lng - p_start_lng) * 111320 * cos(radians(p_start_lat)), 2)) < 300) THEN
    RAISE EXCEPTION 'same trailhead' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.spot_gpx_submissions WHERE user_id = v_uid AND spot_id = v_spot AND status = '검수대기') THEN
    RAISE EXCEPTION 'already pending' USING ERRCODE = '23505';
  END IF;
  IF (SELECT count(*) FROM public.spot_gpx_submissions WHERE user_id = v_uid AND status = '검수대기') >= 5 THEN
    RAISE EXCEPTION 'too many pending' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.spot_gpx_submissions (spot_id, user_id, gpx_url, points, km, note, source, consent, trailhead, start_lat, start_lng)
  VALUES (v_spot, v_uid, v_url, LEAST(GREATEST(COALESCE(p_points, 0), 0), 100000), LEAST(GREATEST(COALESCE(p_km, 0), 0), 999),
          NULLIF(left(btrim(COALESCE(p_note, '')), 300), ''),
          CASE WHEN p_source IN ('spot', 'proposal', 'review', 'lounge') THEN p_source ELSE 'spot' END, true,
          NULLIF(left(btrim(COALESCE(p_trailhead, '')), 40), ''),
          CASE WHEN v_start THEN p_start_lat END, CASE WHEN v_start THEN p_start_lng END)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_submit_gpx(text, text, integer, numeric, text, text, boolean, text, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_submit_gpx(text, text, integer, numeric, text, text, boolean, text, double precision, double precision) TO authenticated;

-- 검수함: 들머리 이름·시작점과 그 박지에 이미 있는 들머리들을 같이 준다
CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY x.pending DESC, x.created_at DESC), '[]'::jsonb) FROM (
    SELECT g.id, g.spot_id, sp."fullName" AS spot_name, sp.gpx_url AS spot_gpx_url, g.user_id, u.nickname,
           g.gpx_url, g.points, g.km, g.note, g.source, g.status, g.reject_reason, g.created_at, g.reviewed_at,
           g.trailhead, g.start_lat, g.start_lng,
           (SELECT COALESCE(jsonb_agg(jsonb_build_object('trailhead', COALESCE(t.trailhead, ''), 'km', t.km) ORDER BY t.id), '[]'::jsonb)
              FROM public.spot_gpx_tracks t WHERE t.spot_id = g.spot_id) AS spot_tracks,
           (g.status = '검수대기') AS pending
      FROM public.spot_gpx_submissions g
      LEFT JOIN public.spots sp ON sp.id = g.spot_id
      LEFT JOIN public.users u ON u.id = g.user_id
     WHERE g.status = '검수대기' OR g.reviewed_at >= now() - interval '30 days'
     ORDER BY g.created_at DESC LIMIT 100) x);
END;
$$;

-- 승인: 선을 더한다(들머리 이름은 고친 것 우선). 박지에 선이 없을 때만 spots.gpx_url을 채운다. 50점
DROP FUNCTION IF EXISTS public.okbm_admin_gpx_review(bigint, boolean, text);
CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_review(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL, p_trailhead text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  v_nick text;
  v_th text;
  v_pts integer := 0;
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
    ON CONFLICT (spot_id, gpx_url) DO NOTHING;
    UPDATE public.spots SET gpx_url = g.gpx_url, gpx_credit = v_nick
     WHERE id = g.spot_id AND btrim(COALESCE(gpx_url, '')) = '';
    UPDATE public.spot_gpx_submissions SET status = '승인', trailhead = v_th, reviewed_at = now() WHERE id = p_id;
    v_pts := public.okbm_point_award(g.user_id, 'gpx', g.id::text, 50, NULL, NULL);
  ELSE
    UPDATE public.spot_gpx_submissions SET status = '반려', reject_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''), reviewed_at = now() WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'points', v_pts);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_admin_gpx_review(bigint, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_gpx_review(bigint, boolean, text, text) TO authenticated;

-- 최근 등록 소식·랭킹: 지금 박지에 붙어 있는 선(spot_gpx_tracks)으로 센다
CREATE OR REPLACE FUNCTION public.okbm_recent_gpx_news(p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x.reviewed_at DESC), '[]'::jsonb) FROM (
    SELECT g.id, g.spot_id, g.user_id, COALESCE(u.nickname, '') AS nickname, g.km, g.reviewed_at, COALESCE(t.trailhead, '') AS trailhead
    FROM public.spot_gpx_submissions g
    JOIN public.spot_gpx_tracks t ON t.spot_id = g.spot_id AND t.gpx_url = g.gpx_url
    LEFT JOIN public.users u ON u.id = g.user_id
    WHERE g.status = '승인'
    ORDER BY g.reviewed_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  ) x;
$$;
