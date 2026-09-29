-- =========================================================================
-- E2: 박지 상세 회원 한도 (대량 수집 방지)
-- 전제: SUPABASE_E1_SPOT_DETAIL_MEMBER_ONLY.sql 적용 완료
--
-- 회원(로그인, 익명 로그인 제외)
--   분당 20회, 하루(한국 시간 자정 기준) 서로 다른 박지 100곳
--   초과 시 오류 대신 비회원용 요약 + limited('minute' | 'daily')를 돌려준다.
--   오늘 이미 연 박지는 100곳을 넘은 뒤에도 계속 열린다.
-- 관리자: 한도 없음
-- 비회원: 기존과 같은 IP당 분당 60회 (통신사 공유 IP 때문에 낮추지 않는다. 받는 값도 공개 요약뿐)
--
-- 조회 기록(okbm_spot_detail_views)은 계정·날짜·박지 id만 남기고 3일 뒤 pg_cron이 지운다.
-- 적용: Supabase SQL Editor에서 이 파일 전체 실행. 여러 번 실행해도 안전.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.okbm_spot_detail_views (
  actor_id text NOT NULL,
  view_day date NOT NULL,
  spot_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, view_day, spot_id)
);
CREATE INDEX IF NOT EXISTS okbm_spot_detail_views_day_idx
  ON public.okbm_spot_detail_views (view_day);
ALTER TABLE public.okbm_spot_detail_views ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_spot_detail_views FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS okbm_spot_detail_views_no_client ON public.okbm_spot_detail_views;
CREATE POLICY okbm_spot_detail_views_no_client ON public.okbm_spot_detail_views
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.get_spot_detail(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_member_per_minute constant integer := 20;
  c_guest_per_minute constant integer := 60;
  c_member_per_day constant integer := 100;
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_admin boolean := false;
  v_actor text;
  v_uid text;
  v_day date;
  v_seen integer;
  v_limited text := '';
  s record;
BEGIN
  v_member := v_is_service
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );
  IF v_member AND NOT v_is_service THEN
    v_admin := COALESCE(public.okbm_is_admin(), false);
  END IF;

  -- 분당 제한
  IF NOT v_is_service AND NOT v_admin THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(
      v_actor, 'get_spot_detail',
      CASE WHEN v_member THEN c_member_per_minute ELSE c_guest_per_minute END
    ) THEN
      IF v_member THEN
        v_limited := 'minute';
      ELSE
        RAISE EXCEPTION 'rate limit exceeded';
      END IF;
    END IF;
  END IF;

  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT sp.id, sp.trailhead_addr, sp.desc_summary, sp."mediaUrls" AS media_urls,
         sp.author_sns_url, sp.view_brief
    INTO s
  FROM public.spots sp
  WHERE sp.id = btrim(p_id)
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 하루 제한: 서로 다른 박지 수. 이미 오늘 연 박지는 세지 않고 계속 열어 준다.
  IF v_member AND NOT v_is_service AND NOT v_admin AND v_limited = '' THEN
    v_uid := auth.uid()::text;
    v_day := (now() AT TIME ZONE 'Asia/Seoul')::date;
    PERFORM pg_advisory_xact_lock(hashtext('okbm_spot_detail_views:' || v_uid));
    IF NOT EXISTS (
      SELECT 1 FROM public.okbm_spot_detail_views
      WHERE actor_id = v_uid AND view_day = v_day AND spot_id = s.id
    ) THEN
      SELECT count(*) INTO v_seen
      FROM public.okbm_spot_detail_views
      WHERE actor_id = v_uid AND view_day = v_day;
      IF v_seen >= c_member_per_day THEN
        v_limited := 'daily';
      ELSE
        INSERT INTO public.okbm_spot_detail_views (actor_id, view_day, spot_id)
        VALUES (v_uid, v_day, s.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  IF v_member AND v_limited = '' THEN
    RETURN jsonb_build_object(
      'tier', 'member',
      'trailhead_addr', s.trailhead_addr,
      'desc_summary', s.desc_summary,
      'mediaUrls', s.media_urls,
      'author_sns_url', s.author_sns_url
    );
  END IF;

  RETURN jsonb_build_object(
    'tier', 'guest',
    'trailhead_addr', '',
    'desc_summary', CASE
      WHEN COALESCE(btrim(s.view_brief), '') = '' THEN ''
      ELSE '[뷰/특징] ' || btrim(s.view_brief)
    END,
    'mediaUrls', s.media_urls,
    'author_sns_url', ''
  ) || CASE WHEN v_limited <> '' THEN jsonb_build_object('limited', v_limited) ELSE '{}'::jsonb END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_detail(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_detail(text) TO anon, authenticated, service_role;

-- 조회 기록 정리: 3일 지난 기록 삭제 (매일 04:20 UTC). 같은 이름이면 덮어쓴다.
SELECT cron.schedule(
  'okbm_spot_detail_views_gc',
  '20 4 * * *',
  $$DELETE FROM public.okbm_spot_detail_views WHERE view_day < current_date - 3$$
);
