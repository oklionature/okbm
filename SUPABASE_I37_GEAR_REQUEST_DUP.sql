-- I37 장비 요청 중복 거르기(대표님 11-27)
-- 1) similar_names: 요청할 때 앱이 찾은 '비슷한 목록 장비' 이름(최대 5개). 검수함 카드에 같이 보인다.
-- 2) 같은 브랜드+이름(띄어쓰기·대소문자 무시)의 '검토중' 요청이 이미 있으면 막는다(gear_request_duplicate).
--    이미 목록(gears)에 이름이 똑같은 장비가 있어도 막는다(gear_request_exists). 앱도 먼저 막지만 서버에서 한 번 더.
-- 여러 번 실행해도 결과가 같다.
-- 되돌리기: ALTER TABLE public.gear_requests DROP COLUMN IF EXISTS similar_names; 그리고 I35의 okbm_gear_requests_guard를 다시 실행.

ALTER TABLE public.gear_requests ADD COLUMN IF NOT EXISTS similar_names jsonb;
ALTER TABLE public.gear_requests DROP CONSTRAINT IF EXISTS gear_requests_similar_chk;
ALTER TABLE public.gear_requests ADD CONSTRAINT gear_requests_similar_chk
  CHECK (similar_names IS NULL OR (jsonb_typeof(similar_names) = 'array' AND jsonb_array_length(similar_names) <= 5 AND length(similar_names::text) <= 1500));

CREATE OR REPLACE FUNCTION public.okbm_gear_norm(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(COALESCE(p, '')), '[[:space:]·\-_/()]+', '', 'g');
$$;

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
  NEW.note := NULLIF(btrim(COALESCE(NEW.note, '')), '');
  NEW.nickname := (SELECT u.nickname FROM public.users u WHERE u.id = NEW.user_id);

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
