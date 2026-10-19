-- =========================================================================
-- H9A: 비회원 지도 핀 좌표를 "지금 보는 지도 범위"만큼만 (2026-10-19)
--
-- 문제: 비회원(anon)도 spots 표에서 campsite_lat/lng·trailhead_name을 바로 읽을 수 있어
--       요청 한 번이면 전체 박지 좌표를 받아 갈 수 있었다. 화면에서 가린 것과 데이터가 달랐다.
-- 변경: 비회원 핀 좌표는 이 함수(get_spot_pins)로만 준다.
--   - 지도 범위(남서·북동)를 받아 그 안의 박지만 [id, lat, lng]로 돌려준다.
--   - 좌표는 범위 크기에 맞춰 칸(cell)에 맞춘다. 칸 = 범위의 긴 변 / 250, 2의 거듭제곱으로 올림.
--     휴대폰 화면 기준으로 1~2px 차이라 눈에는 같은 자리이고, 넓게 보면 대략 위치, 확대하면 정확한 위치가 된다.
--     칸 크기를 2의 거듭제곱으로만 써서 여러 범위로 물어도 칸이 서로 겹쳐 정보가 더 늘지 않는다.
--   - 비회원은 IP당 분당 30회·하루 200회. 넘으면 'rate limit exceeded'.
--   - 회원(로그인)은 제한 없이 정확한 좌표(지금도 목록으로 정확한 좌표를 받는다).
-- 순서: 이 파일(H9A)은 지금 실행해도 안전하다(새 함수만 더한다).
--       새 화면 코드를 배포한 뒤 H9B로 비회원의 좌표 칸 읽기 권한을 뺀다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- =========================================================================

-- 비회원 하루 호출 수 (IP별). 클라이언트 직접 접근 불가.
CREATE TABLE IF NOT EXISTS public.okbm_spot_pin_calls (
  actor_id text NOT NULL,
  call_day date NOT NULL,
  call_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (actor_id, call_day)
);
ALTER TABLE public.okbm_spot_pin_calls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_spot_pin_calls FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS okbm_spot_pin_calls_no_client ON public.okbm_spot_pin_calls;
CREATE POLICY okbm_spot_pin_calls_no_client ON public.okbm_spot_pin_calls
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.get_spot_pins(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_guest_per_minute constant integer := 30;
  c_guest_per_day constant integer := 200;
  c_cells constant double precision := 250;
  c_min_cell constant double precision := 0.00001;
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_actor text;
  v_day date;
  v_count integer;
  v_span double precision;
  v_cell double precision := 0;
  v_min_lat double precision;
  v_max_lat double precision;
  v_min_lng double precision;
  v_max_lng double precision;
  v_pins jsonb;
BEGIN
  -- NaN·무한대·범위 밖 값은 BETWEEN에서 걸러진다
  IF NOT (p_min_lat BETWEEN -90 AND 90 AND p_max_lat BETWEEN -90 AND 90
      AND p_min_lng BETWEEN -180 AND 180 AND p_max_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'invalid bounds';
  END IF;

  v_member := v_is_service
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );

  IF NOT v_member THEN
    v_actor := 'ip:' || public.okbm_request_ip();
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_spot_pins', c_guest_per_minute) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
    v_day := (now() AT TIME ZONE 'Asia/Seoul')::date;
    INSERT INTO public.okbm_spot_pin_calls AS c (actor_id, call_day, call_count)
    VALUES (v_actor, v_day, 1)
    ON CONFLICT (actor_id, call_day)
    DO UPDATE SET call_count = c.call_count + 1
    RETURNING c.call_count INTO v_count;
    IF v_count > c_guest_per_day THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;

    -- 칸 크기는 요청한 범위(자르기 전)의 긴 변으로 정한다. 가늘고 긴 범위로 좁은 칸을 얻지 못하게.
    v_span := GREATEST(abs(p_max_lat - p_min_lat), abs(p_max_lng - p_min_lng));
    v_cell := GREATEST(v_span / c_cells, c_min_cell);
    v_cell := power(2::double precision, ceil(ln(v_cell) / ln(2::double precision)));
  END IF;

  v_min_lat := LEAST(p_min_lat, p_max_lat);
  v_max_lat := GREATEST(p_min_lat, p_max_lat);
  v_min_lng := LEAST(p_min_lng, p_max_lng);
  v_max_lng := GREATEST(p_min_lng, p_max_lng);

  SELECT COALESCE(jsonb_agg(jsonb_build_array(
           s.id,
           CASE WHEN v_cell > 0
             THEN round(((floor(s.campsite_lat / v_cell) + 0.5) * v_cell)::numeric, 6)
             ELSE round(s.campsite_lat::numeric, 6) END,
           CASE WHEN v_cell > 0
             THEN round(((floor(s.campsite_lng / v_cell) + 0.5) * v_cell)::numeric, 6)
             ELSE round(s.campsite_lng::numeric, 6) END
         )), '[]'::jsonb)
    INTO v_pins
  FROM public.spots s
  WHERE s.campsite_lat BETWEEN v_min_lat AND v_max_lat
    AND s.campsite_lng BETWEEN v_min_lng AND v_max_lng;

  RETURN jsonb_build_object('cell', v_cell, 'pins', v_pins);
END;
$$;

REVOKE ALL ON FUNCTION public.get_spot_pins(double precision, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_pins(double precision, double precision, double precision, double precision) TO anon, authenticated, service_role;

-- 하루 호출 기록 정리: 3일 지난 기록 삭제 (매일 04:25 UTC). pg_cron이 꺼져 있으면 이 줄만 실패한다.
SELECT cron.schedule(
  'okbm_spot_pin_calls_gc',
  '25 4 * * *',
  $$DELETE FROM public.okbm_spot_pin_calls WHERE call_day < current_date - 3$$
);

-- 확인: 서울 근처를 넓게(대략 위치) 물어본 결과 첫 3개
SELECT jsonb_path_query_array(public.get_spot_pins(37.0, 126.5, 38.0, 127.5) -> 'pins', '$[0 to 2]') AS sample;
