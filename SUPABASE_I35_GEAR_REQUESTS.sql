-- I35 목록에 없는 장비 등록 요청 (대표님 11-27, 이종 님 건의)
-- 낭만루터가 브랜드·이름·종류·무게·링크를 보내면 gear_requests에 '검토중'으로 쌓인다.
-- 대표님이 검수함에서 승인하면 public.gears에 'gear_r<번호>'로 들어가 모두의 장비 목록에 보이고, 요청한 분에게 30점(gear_req).
-- 앱은 장비 파일(gears/*.json)을 읽은 뒤 gears 표의 gear_r* 줄을 더해 보여 준다(romantic-plan.js).
-- 여러 번 실행해도 결과가 같다.
-- 되돌리기:
--   DELETE FROM public.gears WHERE id LIKE 'gear_r%';
--   DROP FUNCTION IF EXISTS public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text);
--   DROP TABLE IF EXISTS public.gear_requests;

CREATE TABLE IF NOT EXISTS public.gear_requests (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  nickname text,
  category_id text NOT NULL,
  brand text NOT NULL,
  item_name text NOT NULL,
  weight_g integer,
  link text,
  note text,
  status text NOT NULL DEFAULT '검토중',
  reject_reason text,
  gear_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT gear_requests_status_chk CHECK (status IN ('검토중', '승인', '반려')),
  CONSTRAINT gear_requests_cat_chk CHECK (category_id IN ('shelter','sleep','pack','food','kitchen','wear','electronics','camp','other')),
  CONSTRAINT gear_requests_len_chk CHECK (
    char_length(brand) BETWEEN 1 AND 60 AND char_length(item_name) BETWEEN 1 AND 120
    AND (link IS NULL OR (char_length(link) <= 500 AND link ~ '^https?://'))
    AND (note IS NULL OR char_length(note) <= 500)
    AND (weight_g IS NULL OR weight_g BETWEEN 1 AND 50000)
    AND (reject_reason IS NULL OR char_length(reject_reason) <= 300))
);
CREATE INDEX IF NOT EXISTS gear_requests_status_idx ON public.gear_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS gear_requests_user_idx ON public.gear_requests (user_id, created_at DESC);

ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gear_requests_select ON public.gear_requests;
CREATE POLICY gear_requests_select ON public.gear_requests
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
-- 보내기만 본인이. 상태는 '검토중'으로만 넣을 수 있다. 고치기·승인은 아래 함수로만.
DROP POLICY IF EXISTS gear_requests_insert_own ON public.gear_requests;
CREATE POLICY gear_requests_insert_own ON public.gear_requests
  FOR INSERT WITH CHECK (user_id = (SELECT public.okbm_uid()) AND status = '검토중' AND reject_reason IS NULL AND gear_id IS NULL AND reviewed_at IS NULL);
DROP POLICY IF EXISTS gear_requests_delete_own ON public.gear_requests;
CREATE POLICY gear_requests_delete_own ON public.gear_requests
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) AND status = '검토중');
REVOKE ALL ON public.gear_requests FROM anon;
GRANT SELECT, INSERT, DELETE ON public.gear_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.gear_requests_id_seq TO authenticated;

-- 하루 5건까지(같은 사람)
CREATE OR REPLACE FUNCTION public.okbm_gear_requests_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.gear_requests WHERE user_id = NEW.user_id AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'gear_request_daily_limit';
  END IF;
  NEW.brand := btrim(NEW.brand);
  NEW.item_name := btrim(NEW.item_name);
  NEW.link := NULLIF(btrim(COALESCE(NEW.link, '')), '');
  NEW.note := NULLIF(btrim(COALESCE(NEW.note, '')), '');
  NEW.nickname := (SELECT u.nickname FROM public.users u WHERE u.id = NEW.user_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_gear_requests_guard ON public.gear_requests;
CREATE TRIGGER trg_okbm_gear_requests_guard BEFORE INSERT ON public.gear_requests
  FOR EACH ROW EXECUTE FUNCTION public.okbm_gear_requests_guard();

-- 검수: 승인이면 고친 값으로 gears에 넣고 50점, 반려면 사유만. 관리자만.
CREATE OR REPLACE FUNCTION public.okbm_gear_request_review(
  p_id bigint, p_approve boolean,
  p_brand text DEFAULT NULL, p_name text DEFAULT NULL, p_category text DEFAULT NULL,
  p_weight integer DEFAULT NULL, p_link text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.gear_requests;
  v_gid text;
  v_brand text; v_name text; v_cat text; v_w integer; v_link text;
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

  INSERT INTO public.gears (gear_id, id, category_id, item_name, brand, weight_g, weight_type, specs_detail, verified, evidence)
  VALUES (v_gid, v_gid, v_cat, v_name, v_brand, v_w, '제조사 표기', '', 'FALSE', COALESCE(v_link, '낭만루터 등록 요청'))
  ON CONFLICT (gear_id) DO UPDATE SET category_id = EXCLUDED.category_id, item_name = EXCLUDED.item_name, brand = EXCLUDED.brand,
    weight_g = EXCLUDED.weight_g, evidence = EXCLUDED.evidence;

  UPDATE public.gear_requests SET status = '승인', gear_id = v_gid, reviewed_at = now(),
    brand = v_brand, item_name = v_name, category_id = v_cat, weight_g = v_w, link = v_link
   WHERE id = p_id;
  PERFORM public.okbm_point_award(r.user_id, 'gear_req', r.id::text, 30, NULL);
  RETURN jsonb_build_object('ok', true, 'status', '승인', 'gear_id', v_gid);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gear_request_review(bigint, boolean, text, text, text, integer, text, text) TO authenticated;
