-- H37 야영금지 근거 사진·제보자 (2026-11-03, 대표님: 수정 건의로 받은 사진을 금지 근거로 정보창에 보여 주기)
-- 장소 검수함에서 수정 건의를 🚫야영금지로 채택할 때 고른 근거 사진(최대 3장, R2)과 제보자 닉네임을 박지에 남긴다.
-- 정보창 '야영이 금지되었습니다' 아래, LNT 원칙 위에 사진과 '사진 제보 ○○님'이 뜬다.
-- 목록 칸(SPOTS_MAP_SELECT·SPOTS_GUEST_SELECT)에 넣으므로 H14 판 번호 트리거의 v_cols도 같이 바꾼다.
-- 클라이언트: map-main.js campBanBannerHtml·banSpotFromCorrection·setSpotCampBan, romantic-sync.js SPOTS_MAP_SELECT.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행해야 목록이 안 깨진다.

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_status_photos text[];
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS camp_status_credit text;

ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_camp_status_photos_chk;
ALTER TABLE public.spots ADD CONSTRAINT spots_camp_status_photos_chk CHECK (
  camp_status_photos IS NULL OR (
    cardinality(camp_status_photos) <= 3
    AND public.okbm_all_match(camp_status_photos, '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/[A-Za-z0-9._/-]+$', 500)
  )
);
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_camp_status_credit_len;
ALTER TABLE public.spots ADD CONSTRAINT spots_camp_status_credit_len CHECK (camp_status_credit IS NULL OR char_length(camp_status_credit) <= 40);

GRANT SELECT (camp_status_photos, camp_status_credit) ON public.spots TO anon, authenticated;
GRANT INSERT (camp_status_photos, camp_status_credit), UPDATE (camp_status_photos, camp_status_credit) ON public.spots TO authenticated;

-- H14 판 번호: 목록 칸에 두 칸을 더한다
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
    'camp_status', 'camp_status_note', 'camp_status_at', 'camp_status_photos', 'camp_status_credit'
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

-- 기기에 저장된 목록에 새 칸이 없으니 한 번 새로 받게 한다
UPDATE public.okbm_spots_version SET changed_at = clock_timestamp() WHERE id = 1;

NOTIFY pgrst, 'reload schema';
