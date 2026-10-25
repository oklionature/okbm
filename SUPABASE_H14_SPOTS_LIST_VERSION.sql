-- =========================================================================
-- H14: 박지 목록 '판 번호' (2026-10-25)
--
-- 왜: 지도를 열 때마다 박지 목록(약 100KB)을 새로 받아 Supabase 다운로드 양(Egress)을 많이 쓴다.
--     기기에 저장해 둔 목록을 쓰되, 박지가 바뀌었을 때만 새로 받게 하려고
--     "목록이 마지막으로 바뀐 때 + 박지 수"만 돌려주는 아주 작은 함수(get_spots_version)를 둔다.
-- 어떻게: spots 표에 박지가 생기거나 지워지거나, 목록에 보이는 칸이 바뀌면 트리거가 okbm_spots_version 시각을 올린다.
--         들머리 주소·영상 링크처럼 목록에 없는 칸만 바뀌면 올리지 않는다(정보창은 열 때 따로 받는다).
-- 화면: romantic-sync.js fetchMasterSpotsFromSupabase가 이 값을 저장해 둔 값과 비교한다.
--       이 SQL을 실행하기 전에는 함수가 없어 화면이 예전처럼 매번 새로 받는다(깨지지 않는다).
-- 목록 칸을 바꾸면(SPOTS_MAP_SELECT·SPOTS_GUEST_SELECT) 아래 v_cols도 같이 바꾼다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS okbm_spots_version_bump ON public.spots;
--   DROP TRIGGER IF EXISTS okbm_spots_version_bump_truncate ON public.spots;
--   DROP FUNCTION IF EXISTS public.get_spots_version();
--   DROP FUNCTION IF EXISTS public.okbm_bump_spots_version();
--   DROP TABLE IF EXISTS public.okbm_spots_version;
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.okbm_spots_version (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.okbm_spots_version (id, changed_at) VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

-- 표는 직접 못 읽게 하고 아래 함수로만 본다.
ALTER TABLE public.okbm_spots_version ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.okbm_spots_version FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.okbm_bump_spots_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- 목록(SPOTS_MAP_SELECT)에 들어가는 칸
  v_cols text[] := ARRAY[
    'id', 'region', 'cityName', 'spot_main', 'spot_sub', 'fullName', 'elevation',
    'campsite_lat', 'campsite_lng', 'terrain', 'trailhead_name', 'difficulty', 'distance_km',
    'droneStatus', 'course_type', 'author', 'user_id', 'created_at', 'view_brief',
    'camp_status', 'camp_status_note', 'camp_status_at'
  ];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM unnest(v_cols) AS c
      WHERE (to_jsonb(OLD) -> c) IS DISTINCT FROM (to_jsonb(NEW) -> c)
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  UPDATE public.okbm_spots_version SET changed_at = clock_timestamp() WHERE id = 1;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS okbm_spots_version_bump ON public.spots;
CREATE TRIGGER okbm_spots_version_bump
AFTER INSERT OR UPDATE OR DELETE ON public.spots
FOR EACH ROW EXECUTE FUNCTION public.okbm_bump_spots_version();

DROP TRIGGER IF EXISTS okbm_spots_version_bump_truncate ON public.spots;
CREATE TRIGGER okbm_spots_version_bump_truncate
AFTER TRUNCATE ON public.spots
FOR EACH STATEMENT EXECUTE FUNCTION public.okbm_bump_spots_version();

-- '바뀐 시각(밀리초):박지 수' 글자 하나. 박지 수를 붙여 두면 트리거가 놓친 추가·삭제도 잡는다.
CREATE OR REPLACE FUNCTION public.get_spots_version()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT floor(extract(epoch FROM v.changed_at) * 1000)::bigint::text
         || ':' || (SELECT count(*) FROM public.spots)::text
  FROM public.okbm_spots_version v
  WHERE v.id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_spots_version() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spots_version() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인: '숫자:박지 수'가 한 줄 나오면 된다. 예) 1761370000000:431
SELECT public.get_spots_version() AS spots_version;
