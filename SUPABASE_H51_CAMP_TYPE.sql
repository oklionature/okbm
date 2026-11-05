-- H51 야영장 분류 (2026-11-05, 대표님: 합법 야영장을 '플랜B'로 따로 표시)
-- spots.camp_type: '' 일반 박지 / '유료' 유료 야영장 / '무료' 무료 야영장.
-- 지도에서 야영장은 작은 하늘색 텐트 핀으로, 지형 탭 칩(유료 야영장·무료 야영장·박지만)으로 고른다. HOT·추천에서는 빠진다.
-- 제보 창 '7-1. 장소 종류'로 proposals·spot_corrections에도 같은 값을 받는다.
-- 목록 칸(SPOTS_MAP_SELECT·SPOTS_GUEST_SELECT)에 넣으므로 H14 판 번호 트리거의 v_cols도 같이 바꾼다.
-- 클라이언트: romantic-sync.js SPOTS_MAP_SELECT·제보 저장, map-main.js 핀·지형 칩·제보 창.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행해야 목록이 안 깨진다.

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_type text NOT NULL DEFAULT '';
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_camp_type_chk;
ALTER TABLE public.spots ADD CONSTRAINT spots_camp_type_chk CHECK (camp_type IN ('', '유료', '무료'));
GRANT SELECT (camp_type) ON public.spots TO anon, authenticated;
GRANT INSERT (camp_type), UPDATE (camp_type) ON public.spots TO authenticated;

ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS camp_type text NOT NULL DEFAULT '';
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_camp_type_chk;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_camp_type_chk CHECK (camp_type IN ('', '유료', '무료'));
ALTER TABLE public.spot_corrections ADD COLUMN IF NOT EXISTS camp_type text NOT NULL DEFAULT '';
ALTER TABLE public.spot_corrections DROP CONSTRAINT IF EXISTS spot_corrections_camp_type_chk;
ALTER TABLE public.spot_corrections ADD CONSTRAINT spot_corrections_camp_type_chk CHECK (camp_type IN ('', '유료', '무료'));

-- H14 판 번호: 목록 칸에 camp_type을 더한다
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
    'camp_status', 'camp_status_note', 'camp_status_at', 'camp_status_photos', 'camp_status_credit',
    'camp_type'
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

-- 첫 분류 (11-05 조사, TASK_CAMPSITE_PLANB.md). 확인이 덜 된 곳(334 등명해변, 무료 후보 8곳)은 비워 둔다.
UPDATE public.spots SET camp_type = '유료' WHERE id IN (
  '582', '581', '458', '349', '542', '311', '337', '479', '332', '333', '60', '288',
  '294', '296', '301', '302', '443', '543', '544', '553', '580', '417', '99'
) AND camp_type <> '유료';
UPDATE public.spots SET camp_type = '무료' WHERE id IN ('444', '447', '297') AND camp_type <> '무료';

-- 기기에 저장된 목록에 새 칸이 없으니 한 번 새로 받게 한다
UPDATE public.okbm_spots_version SET changed_at = clock_timestamp() WHERE id = 1;

NOTIFY pgrst, 'reload schema';
