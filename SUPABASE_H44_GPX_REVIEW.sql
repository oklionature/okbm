-- H44: GPX 등산로 검수 대기 (2026-11-05, TASK_GPX.md 3단계)
-- 회원이 올린 GPX(업로드 Worker POST /gpx가 좌표만 남겨 R2 gpx/<로그인 uid>/<uuid>.gpx에 둔 파일)를
-- 검수 대기로 쌓고, 대표님이 승인하면 박지(spots.gpx_url)에 붙이고 보낸 사람 닉네임을 spots.gpx_credit에 남기며 낭만 포인트 50점을 준다.
-- 1) spots.gpx_credit 칸, get_spot_detail이 회원에게 gpx_credit도 준다(H43 정의에 한 칸 더함)
-- 2) spot_gpx_submissions 표: 직접 읽기·쓰기 막고 아래 함수로만 다룬다
-- 3) okbm_submit_gpx: 회원이 보낸다. 내 폴더(gpx/<auth.uid()>/) 파일만, '내 기록이고 써도 된다' 동의 필수,
--    같은 박지에 내 대기 건은 1개, 대기 건은 사람당 5개까지
-- 4) okbm_admin_gpx_list / okbm_admin_gpx_review: 관리자 검수함(map-main.js renderAdminGpxInbox)
-- 5) 포인트: reason 'gpx' 50점, 제보·수정건의처럼 하루 상한·'오늘' 합계에서 뺀다(okbm_admin_points_overview, okbm_my_points의 NOT IN에 'gpx')
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS gpx_credit text;
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_gpx_credit_len;
ALTER TABLE public.spots ADD CONSTRAINT spots_gpx_credit_len CHECK (gpx_credit IS NULL OR char_length(gpx_credit) <= 40);

CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c_member_per_minute constant integer := 20; c_guest_per_minute constant integer := 60; c_member_per_day constant integer := 100; v_is_service boolean := auth.role() = 'service_role'; v_member boolean; v_admin boolean := false; v_actor text; v_uid text; v_day date; v_seen integer; v_limited text := ''; s record; BEGIN v_member := v_is_service OR ( auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false ); IF v_member AND NOT v_is_service THEN v_admin := COALESCE(public.okbm_is_admin(), false); END IF;  IF NOT v_is_service AND NOT v_admin THEN v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip()); IF NOT public.okbm_actor_rate_limit( v_actor, 'get_spot_detail', CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END ) THEN IF v_member THEN v_limited := 'minute'; ELSE RAISE EXCEPTION 'rate limit exceeded'; END IF; END IF; END IF; IF p_id IS NULL OR btrim(p_id) = '' THEN RETURN NULL; END IF; SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls, sp.author_sns_url, sp.view_brief, sp.gpx_url, sp.gpx_credit INTO s FROM public.spots sp WHERE sp.id = btrim(p_id) LIMIT 1; IF NOT FOUND THEN RETURN NULL; END IF;  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN v_uid := auth.uid()::text; v_day := (now() AT TIME ZONE 'Asia/Seoul')::date; PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid)); IF NOT EXISTS ( SELECT 1 FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id ) THEN SELECT count(*) INTO v_seen FROM public.okbm_spot_detail_views WHERE actor_id = v_uid AND view_day = v_day; IF v_seen >= c_member_per_day THEN v_limited := 'daily'; ELSE INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id) VALUES (v_uid, v_day, s.id) ON CONFLICT DO NOTHING; END IF; END IF; END IF; IF v_member AND v_limited = '' THEN RETURN jsonb_build_object( 'tier', 'member', 'trailhead_addr', s.trailhead_addr, 'desc_summary', s.desc_summary, 'mediaUrls', s.media_urls, 'author_sns_url', s.author_sns_url, 'gpx_url', COALESCE(s.gpx_url, ''), 'gpx_credit', COALESCE(s.gpx_credit, '') ); END IF; RETURN jsonb_build_object( 'tier', 'guest', 'trailhead_addr', '', 'desc_summary', CASE WHEN COALESCE(btrim(s.view_brief), '') = '' THEN '' ELSE '[뷰/특징] ' || btrim(s.view_brief) END, 'mediaUrls', s.media_urls, 'author_sns_url', '' ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END; END; $function$;

CREATE TABLE IF NOT EXISTS public.spot_gpx_submissions (
  id bigserial PRIMARY KEY,
  spot_id text NOT NULL,
  user_id text NOT NULL,
  gpx_url text NOT NULL CHECK (gpx_url ~ '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/gpx/[A-Za-z0-9-]+/[A-Za-z0-9-]+\.gpx$'),
  points integer,
  km numeric(5,1),
  note text CHECK (note IS NULL OR char_length(note) <= 300),
  source text NOT NULL DEFAULT 'spot' CHECK (source IN ('spot', 'proposal', 'review', 'lounge')),
  consent boolean NOT NULL CHECK (consent),
  status text NOT NULL DEFAULT '검수대기' CHECK (status IN ('검수대기', '승인', '반려')),
  reject_reason text CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS spot_gpx_submissions_status ON public.spot_gpx_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS spot_gpx_submissions_user ON public.spot_gpx_submissions (user_id, status);
ALTER TABLE public.spot_gpx_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_gpx_submissions FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.spot_gpx_submissions_id_seq FROM anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(x ORDER BY x.pending DESC, x.created_at DESC), '[]'::jsonb) FROM (
    SELECT g.id, g.spot_id, sp."fullName" AS spot_name, sp.gpx_url AS spot_gpx_url, g.user_id, u.nickname,
           g.gpx_url, g.points, g.km, g.note, g.source, g.status, g.reject_reason, g.created_at, g.reviewed_at,
           (g.status = '검수대기') AS pending
      FROM public.spot_gpx_submissions g
      LEFT JOIN public.spots sp ON sp.id = g.spot_id
      LEFT JOIN public.users u ON u.id = g.user_id
     WHERE g.status = '검수대기' OR g.reviewed_at >= now() - interval '30 days'
     ORDER BY g.created_at DESC LIMIT 100) x);
END;
$$;

-- 승인: 박지에 선·보낸 사람을 붙이고 50점. 반려: 사유만 남긴다. 대기 건만 처리한다.
CREATE OR REPLACE FUNCTION public.okbm_admin_gpx_review(p_id bigint, p_approve boolean, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g record;
  v_nick text;
  v_pts integer := 0;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO g FROM public.spot_gpx_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE = '22023'; END IF;
  IF g.status <> '검수대기' THEN RAISE EXCEPTION 'already reviewed' USING ERRCODE = '22023'; END IF;
  IF p_approve THEN
    SELECT nickname INTO v_nick FROM public.users WHERE id = g.user_id;
    UPDATE public.spots SET gpx_url = g.gpx_url, gpx_credit = NULLIF(left(btrim(COALESCE(v_nick, '')), 40), '') WHERE id = g.spot_id;
    UPDATE public.spot_gpx_submissions SET status = '승인', reviewed_at = now() WHERE id = p_id;
    v_pts := public.okbm_point_award(g.user_id, 'gpx', g.id::text, 50, NULL, NULL);
  ELSE
    UPDATE public.spot_gpx_submissions SET status = '반려', reject_reason = NULLIF(left(btrim(COALESCE(p_reason, '')), 200), ''), reviewed_at = now() WHERE id = p_id;
  END IF;
  RETURN jsonb_build_object('ok', true, 'points', v_pts);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_submit_gpx(text, text, integer, numeric, text, text, boolean), public.okbm_admin_gpx_list(),
  public.okbm_admin_gpx_review(bigint, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_submit_gpx(text, text, integer, numeric, text, text, boolean), public.okbm_admin_gpx_list(),
  public.okbm_admin_gpx_review(bigint, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.okbm_admin_points_overview(p_query text DEFAULT NULL::text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE v_q text := NULLIF(btrim(COALESCE(p_query, '')), ''); BEGIN IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF; IF v_q IS NOT NULL THEN RETURN jsonb_build_object('found', (SELECT COALESCE(jsonb_agg(x ORDER BY x.bal DESC), '[]'::jsonb) FROM ( SELECT u.id, u.nickname, COALESCE((SELECT sum(l.delta) FROM public.point_ledger l WHERE l.user_id = u.id), 0) AS bal FROM public.users u WHERE u.nickname ILIKE '%' || replace(replace(v_q, '%', '\%'), '_', '\_') || '%' OR u.id = v_q LIMIT 20) x)); END IF; RETURN jsonb_build_object( 'total_given', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE delta > 0), 'members', (SELECT count(DISTINCT user_id) FROM public.point_ledger), 'top', (SELECT COALESCE(jsonb_agg(x ORDER BY x.bal DESC), '[]'::jsonb) FROM ( SELECT l.user_id AS id, u.nickname, sum(l.delta) AS bal FROM public.point_ledger l LEFT JOIN public.users u ON u.id = l.user_id GROUP BY l.user_id, u.nickname ORDER BY sum(l.delta) DESC LIMIT 20) x), 'today', (SELECT COALESCE(jsonb_agg(x ORDER BY x.got DESC), '[]'::jsonb) FROM ( SELECT l.user_id AS id, u.nickname, sum(l.delta) AS got FROM public.point_ledger l LEFT JOIN public.users u ON u.id = l.user_id WHERE l.delta > 0 AND l.reason NOT IN ('admin', 'proposal', 'correction', 'gpx') AND l.created_at >= public.okbm_point_day_start() GROUP BY l.user_id, u.nickname ORDER BY sum(l.delta) DESC LIMIT 10) x) ); END; $function$;

CREATE OR REPLACE FUNCTION public.okbm_my_points(p_limit integer DEFAULT 30) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$ DECLARE v_uid text := public.okbm_uid(); v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 30), 0), 100); BEGIN IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = '' OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000'; END IF; PERFORM public.okbm_rpc_rate_limit('my_points', 60); RETURN jsonb_build_object( 'balance', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE user_id = v_uid), 'today', (SELECT COALESCE(jsonb_object_agg(reason, s), '{}'::jsonb) FROM ( SELECT reason, sum(delta) AS s FROM public.point_ledger WHERE user_id = v_uid AND delta > 0 AND created_at >= public.okbm_point_day_start() AND reason NOT IN ('admin', 'proposal', 'correction', 'gpx') GROUP BY reason) t), 'history', (SELECT COALESCE(jsonb_agg(jsonb_build_object('r', reason, 'd', delta, 't', created_at, 'n', CASE WHEN reason = 'admin' THEN note END) ORDER BY created_at DESC, id DESC), '[]'::jsonb) FROM ( SELECT id, reason, delta, created_at, note FROM public.point_ledger WHERE user_id = v_uid ORDER BY created_at DESC, id DESC LIMIT v_lim) h) ); END; $function$;
