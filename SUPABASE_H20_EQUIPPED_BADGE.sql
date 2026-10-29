-- =========================================================================
-- H20: 장착한 배지(프로필 사진 링) (2026-10-29)
--
-- 왜: 받은 배지 중 하나를 골라 장착하면 그 배지 종류의 무늬·단계의 재질로 프로필 사진 둘레에 링이 둘러진다.
--     받았는지 계산은 지금처럼 기기에서 하고(my-report.js buildBadges), 서버는 '무엇을 장착했는지'만 들고 있는다.
-- 어떻게:
--   1) users.equipped_badge: '종류:단계:배지id' (예: 'trips:b:trips20', 'plog:g:plog80'). 비우면 장착 안 함.
--      종류 trips·plog·ever·reg·do·spot·season·island, 단계 i(철)·b(동)·s(은)·g(금)·r(무지개). 모양이 다르면 저장되지 않는다.
--   2) okbm_set_equipped_badge(p_badge): 로그인한 본인 줄에만 쓴다. '' 또는 null이면 장착 풀기.
--   3) get_public_profiles·get_public_profile에 'badge'를 더한다. 사진을 그릴 때 이미 부르는 함수라 대부분 요청이 늘지 않는다.
-- 한계: 받지 않은 배지를 서버에 직접 써 넣는 것까지는 막지 않는다(받았는지 계산이 기기에 있음). 모양만 검사한다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP FUNCTION IF EXISTS public.okbm_set_equipped_badge(text);
--   ALTER TABLE public.users DROP COLUMN IF EXISTS equipped_badge;
--   (get_public_profiles는 이 파일 3)에서 'badge' 줄을 뺀 모양으로 다시 만든다)
-- =========================================================================

-- 1) 칸 -----------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS equipped_badge text;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_equipped_badge_format;
ALTER TABLE public.users ADD CONSTRAINT users_equipped_badge_format
  CHECK (equipped_badge IS NULL OR equipped_badge ~ '^(trips|plog|ever|reg|do|spot|season|island):(i|b|s|g|r):[A-Za-z0-9]{1,24}$');

-- 2) 장착·풀기 ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_set_equipped_badge(p_badge text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_badge text := NULLIF(btrim(COALESCE(p_badge, '')), '');
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('equip_badge', 20);
  IF v_badge IS NOT NULL AND v_badge !~ '^(trips|plog|ever|reg|do|spot|season|island):(i|b|s|g|r):[A-Za-z0-9]{1,24}$' THEN
    RAISE EXCEPTION 'bad badge' USING ERRCODE = '22023';
  END IF;
  UPDATE public.users SET equipped_badge = v_badge WHERE id = v_uid;
  RETURN v_badge;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_set_equipped_badge(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_set_equipped_badge(text) TO authenticated;

-- 3) 공개 프로필에 장착 배지 ------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids text[];
  result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    PERFORM public.okbm_rpc_rate_limit('get_public_profiles', 30);
  END IF;
  SELECT ARRAY(
    SELECT DISTINCT btrim(x) FROM unnest(COALESCE(p_ids, ARRAY[]::text[])) AS x
    WHERE btrim(COALESCE(x, '')) <> '' LIMIT 50
  ) INTO v_ids;
  IF v_ids IS NULL OR coalesce(array_length(v_ids, 1), 0) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'nickname', u.nickname,
    'photo_url', u.photo_url,
    'hero_cover_url', u.hero_cover_url,
    'bio', u.bio,
    'created_at', u.created_at,
    'instagram', COALESCE(u.my_gears -> 'sns' ->> 'instagram', ''),
    'youtube', COALESCE(u.my_gears -> 'sns' ->> 'youtube', ''),
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', ''),
    'hide_year_activity', COALESCE((u.my_gears ->> 'hide_year_activity')::boolean, false),
    'hide_total_activity', COALESCE((u.my_gears ->> 'hide_total_activity')::boolean, false),
    'badge', COALESCE(u.equipped_badge, '')
  )), '[]'::jsonb) INTO result
  FROM public.users u
  WHERE u.id = ANY (v_ids);
  RETURN result;
END;
$function$;

-- 3-2) 한 사람 조회에도
CREATE OR REPLACE FUNCTION public.get_public_profile(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'not authenticated';
    END IF;
    PERFORM public.okbm_rpc_rate_limit('get_public_profile', 120);
  END IF;
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN NULL;
  END IF;
  SELECT jsonb_build_object(
    'id', u.id,
    'nickname', u.nickname,
    'photo_url', u.photo_url,
    'hero_cover_url', u.hero_cover_url,
    'bio', u.bio,
    'created_at', u.created_at,
    'instagram', COALESCE(u.my_gears -> 'sns' ->> 'instagram', ''),
    'youtube', COALESCE(u.my_gears -> 'sns' ->> 'youtube', ''),
    'blog', COALESCE(u.my_gears -> 'sns' ->> 'blog', ''),
    'hide_year_activity', COALESCE((u.my_gears ->> 'hide_year_activity')::boolean, false),
    'hide_total_activity', COALESCE((u.my_gears ->> 'hide_total_activity')::boolean, false),
    'badge', COALESCE(u.equipped_badge, '')
  ) INTO result
  FROM public.users u
  WHERE u.id = btrim(p_id)
  LIMIT 1;
  RETURN result;
END;
$function$;

-- 확인
SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'equipped_badge') AS col,
  (SELECT count(*) FROM pg_proc WHERE proname = 'okbm_set_equipped_badge') AS fn;
