-- I38 장비 데이터베이스 추가 요청을 데이터베이스 양식 그대로 받는다(대표님 11-27)
-- 요청(gear_requests)과 장비(gears)에 장비 파일(gears_master.json)과 같은 칸을 더한다:
--   brand_en · name_en · weight_type(패킹 무게/본체 무게/최소 무게/실측) · weight_min_g · specs([[항목, 값], ...]) · 판매처 링크
-- 승인하면 gears에 칸 그대로 넣고, specs_detail은 '인원 1P · 구조 자립형'처럼 장비 파일과 같은 글로 만든다.
-- 공식 링크는 필수(gear_request_link_required).
-- 여러 번 실행해도 결과가 같다.
-- 되돌리기: 아래 ADD COLUMN을 DROP COLUMN으로, I35·I37의 함수를 다시 실행.

ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS brand_en text;
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS weight_type text;
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS weight_min_g integer;
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS specs jsonb;
ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS link_shop text;
ALTER TABLE public.gear_requests DROP CONSTRAINT IF EXISTS gear_requests_db_chk;
ALTER TABLE public.gear_requests ADD CONSTRAINT gear_requests_db_chk CHECK (
  (brand_en IS NULL OR char_length(brand_en) <= 60)
  AND (name_en IS NULL OR char_length(name_en) <= 160)
  AND (weight_type IS NULL OR weight_type IN ('패킹 무게', '본체 무게', '최소 무게', '실측'))
  AND (weight_min_g IS NULL OR weight_min_g BETWEEN 1 AND 50000)
  AND (specs IS NULL OR (jsonb_typeof(specs) = 'array' AND jsonb_array_length(specs) <= 15 AND length(specs::text) <= 4000))
  AND (link_shop IS NULL OR (char_length(link_shop) <= 500 AND link_shop ~ '^https?://')));

ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS brand_en text;
ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS specs jsonb;
ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS links jsonb;
ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS weight_min_g integer;
ALTER TABLE public.gears ADD COLUMN IF NOT EXISTS weight_min_label text;

-- 보낼 때: 공식 링크 필수, 중복·이미 있는 장비 막기(I37 그대로)
CREATE OR REPLACE FUNCTION public.okbm_gear_requests_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text; v_full text;
BEGIN
  IF (SELECT count(*) FROM public.gear_requests WHERE user_id = NEW.user_id AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'gear_request_daily_limit';
  END IF;
  NEW.brand := btrim(NEW.brand);
  NEW.item_name := btrim(NEW.item_name);
  NEW.link := NULLIF(btrim(COALESCE(NEW.link, '')), '');
  NEW.link_shop := NULLIF(btrim(COALESCE(NEW.link_shop, '')), '');
  NEW.note := NULLIF(btrim(COALESCE(NEW.note, '')), '');
  NEW.brand_en := NULLIF(btrim(COALESCE(NEW.brand_en, '')), '');
  NEW.name_en := NULLIF(btrim(COALESCE(NEW.name_en, '')), '');
  NEW.nickname := (SELECT u.nickname FROM public.users u WHERE u.id = NEW.user_id);
  IF NEW.link IS NULL THEN RAISE EXCEPTION 'gear_request_link_required'; END IF;

  v_name := public.okbm_gear_norm(NEW.item_name);
  v_full := public.okbm_gear_norm(NEW.brand) || v_name;
  IF EXISTS (SELECT 1 FROM public.gear_requests r
              WHERE r.status = '검토중'
                AND public.okbm_gear_norm(r.brand) || public.okbm_gear_norm(r.item_name) = v_full) THEN
    RAISE EXCEPTION 'gear_request_duplicate';
  END IF;
  IF EXISTS (SELECT 1 FROM public.gears g
              WHERE public.okbm_gear_norm(g.item_name) IN (v_name, v_full)
                 OR public.okbm_gear_norm(g.brand) || public.okbm_gear_norm(g.item_name) IN (v_name, v_full)) THEN
    RAISE EXCEPTION 'gear_request_exists';
  END IF;
  RETURN NEW;
END;
$$;

-- 승인: 칸 그대로 gears에. 30점
CREATE OR REPLACE FUNCTION public.okbm_gear_request_review(
  p_id bigint, p_approve boolean,
  p_brand text DEFAULT NULL, p_name text DEFAULT NULL, p_category text DEFAULT NULL,
  p_weight integer DEFAULT NULL, p_link text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.gear_requests;
  v_gid text;
  v_brand text; v_name text; v_cat text; v_w integer; v_link text;
  v_detail text; v_links jsonb;
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  SELECT * INTO r FROM public.gear_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.status <> '검토중' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  IF NOT p_approve THEN
    UPDATE public.gear_requests SET status = '반려', reject_reason = NULLIF(btrim(COALESCE(p_reason, '')), ''), reviewed_at = now() WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'status', '반려');
  END IF;

  v_brand := COALESCE(NULLIF(btrim(p_brand), ''), r.brand);
  v_name := COALESCE(NULLIF(btrim(p_name), ''), r.item_name);
  v_cat := COALESCE(NULLIF(btrim(p_category), ''), r.category_id);
  v_w := COALESCE(p_weight, r.weight_g);
  v_link := COALESCE(NULLIF(btrim(p_link), ''), r.link);
  IF v_w IS NULL OR v_w <= 0 THEN RAISE EXCEPTION 'weight_required'; END IF;
  v_gid := 'gear_r' || r.id;

  SELECT string_agg((e ->> 0) || ' ' || (e ->> 1), ' · ' ORDER BY o) INTO v_detail
    FROM jsonb_array_elements(COALESCE(r.specs, '[]'::jsonb)) WITH ORDINALITY AS t(e, o);
  v_links := '[]'::jsonb;
  IF v_link IS NOT NULL THEN v_links := v_links || jsonb_build_array(jsonb_build_object('kind', 'official', 'url', v_link, 'label', COALESCE(r.brand_en, v_brand) || ' 공식 홈')); END IF;
  IF r.link_shop IS NOT NULL THEN v_links := v_links || jsonb_build_array(jsonb_build_object('kind', 'shop', 'url', r.link_shop, 'label', '판매처')); END IF;

  INSERT INTO public.gears (gear_id, id, category_id, item_name, brand, weight_g, weight_type, specs_detail, verified, evidence,
                            name_en, brand_en, specs, links, weight_min_g, weight_min_label)
  VALUES (v_gid, v_gid, v_cat, v_name, v_brand, v_w, COALESCE(r.weight_type, '패킹 무게'), COALESCE(v_detail, ''), 'FALSE',
          COALESCE(v_link, '낭만루터 등록 요청'), r.name_en, r.brand_en, r.specs, v_links, r.weight_min_g,
          CASE WHEN r.weight_min_g IS NOT NULL THEN '최소 무게' END)
  ON CONFLICT (gear_id) DO UPDATE SET category_id = EXCLUDED.category_id, item_name = EXCLUDED.item_name, brand = EXCLUDED.brand,
    weight_g = EXCLUDED.weight_g, weight_type = EXCLUDED.weight_type, specs_detail = EXCLUDED.specs_detail, evidence = EXCLUDED.evidence,
    name_en = EXCLUDED.name_en, brand_en = EXCLUDED.brand_en, specs = EXCLUDED.specs, links = EXCLUDED.links,
    weight_min_g = EXCLUDED.weight_min_g, weight_min_label = EXCLUDED.weight_min_label;

  UPDATE public.gear_requests SET status = '승인', gear_id = v_gid, reviewed_at = now(),
    brand = v_brand, item_name = v_name, category_id = v_cat, weight_g = v_w, link = v_link
   WHERE id = p_id;
  PERFORM public.okbm_point_award(r.user_id, 'gear_req', r.id::text, 30, NULL);
  RETURN jsonb_build_object('ok', true, 'status', '승인', 'gear_id', v_gid);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text) TO authenticated;
