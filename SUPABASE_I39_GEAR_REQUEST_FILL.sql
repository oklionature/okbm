-- I39 장비 요청 자동 검수(대표님 11-27)
-- 사용자는 브랜드·이름·분류·무게·공식 링크만 보낸다. 영문 이름·무게 기준·최소 무게·사양·판매처는
-- 검수함에 들어온 뒤 자동화가 공식 링크를 보고 채우고(okbm_gear_request_fill), 승인한다(okbm_gear_request_review).
-- 자동화는 SQL 편집기(postgres)나 service_role로 부르므로 두 함수 모두 관리자 회원·postgres·service_role을 받는다.
-- 처리 순서: TASK_GEAR_REQUEST.md
-- 여러 번 실행해도 결과가 같다.

CREATE OR REPLACE FUNCTION public.okbm_gear_admin_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT session_user = 'postgres' OR COALESCE(auth.role(), '') = 'service_role' OR COALESCE(public.okbm_is_admin(), false);
$$;

-- 사양 채우기: 넘긴 칸만 바꾼다(NULL은 그대로). p_specs는 [["인원","1P"],["구조","자립형"], ...]
CREATE OR REPLACE FUNCTION public.okbm_gear_request_fill(
  p_id bigint,
  p_brand_en text DEFAULT NULL, p_name_en text DEFAULT NULL,
  p_weight_type text DEFAULT NULL, p_weight_min_g integer DEFAULT NULL,
  p_specs jsonb DEFAULT NULL, p_link_shop text DEFAULT NULL,
  p_brand text DEFAULT NULL, p_name text DEFAULT NULL, p_category text DEFAULT NULL, p_weight integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.gear_requests;
BEGIN
  IF NOT public.okbm_gear_admin_ok() THEN RAISE EXCEPTION 'admin_only'; END IF;
  SELECT * INTO r FROM public.gear_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status <> '검토중' THEN RAISE EXCEPTION 'already_reviewed'; END IF;
  UPDATE public.gear_requests SET
    brand_en = COALESCE(NULLIF(btrim(p_brand_en), ''), brand_en),
    name_en = COALESCE(NULLIF(btrim(p_name_en), ''), name_en),
    weight_type = COALESCE(NULLIF(btrim(p_weight_type), ''), weight_type),
    weight_min_g = COALESCE(p_weight_min_g, weight_min_g),
    specs = COALESCE(p_specs, specs),
    link_shop = COALESCE(NULLIF(btrim(p_link_shop), ''), link_shop),
    brand = COALESCE(NULLIF(btrim(p_brand), ''), brand),
    item_name = COALESCE(NULLIF(btrim(p_name), ''), item_name),
    category_id = COALESCE(NULLIF(btrim(p_category), ''), category_id),
    weight_g = COALESCE(p_weight, weight_g)
  WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_request_fill(bigint, text, text, text, integer, jsonb, text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gear_request_fill(bigint, text, text, text, integer, jsonb, text, text, text, text, integer) TO authenticated, service_role;

-- 승인 함수도 자동화(postgres·service_role)가 부를 수 있게: I38 본문에서 관리자 확인만 바꾼다
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text)'::regprocedure);
  IF position('okbm_gear_admin_ok()' IN d) = 0 THEN
    IF position('IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION ''admin_only''; END IF;' IN d) = 0 THEN RAISE EXCEPTION '바꿀 자리를 못 찾음'; END IF;
    EXECUTE replace(d, 'IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION ''admin_only''; END IF;', 'IF NOT public.okbm_gear_admin_ok() THEN RAISE EXCEPTION ''admin_only''; END IF;');
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text) TO service_role;
