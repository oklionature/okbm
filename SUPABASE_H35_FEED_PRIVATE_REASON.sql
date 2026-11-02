-- =========================================================================
-- H35: 피드 비공개 이유와 작성자 뜻 남기기 (2026-11-02, 대표님: 자의로 비공개했는지 타의로 비공개됐는지 확인할 방법)
--
-- 왜: feeds에는 is_published 하나뿐이라, 비공개인 피드가 작성자가 끈 것인지 앱이 막은 것인지 알 수 없었다.
--     특히 박지가 없으면 글쓰기 창의 공개 스위치가 잠겨, 작성자가 공개를 원했는지도 남지 않았다(강화도 길상산 건).
-- 어떻게:
--   1) feeds.private_reason: 비공개일 때만 값이 있다. 모든 저장 경로(새 글·고치기·⋯ 메뉴 전환)에서 아래 트리거가 정한다.
--        no_spot  = 박지 번호가 없어서 앱이 자동으로 나만 보기
--        no_photo = 현장 사진(레디샷·unsplash 뺀 http 사진)이 없어서 자동으로 나만 보기
--        self     = 박지·사진이 다 있는데 작성자가 껐다(새 글을 끈 채 올림, 공개 → 비공개로 바꿈)
--        ready    = 자동 비공개였다가 박지·사진이 생겼지만 아직 공개 전(작성자가 끈 것이 아님)
--   2) feeds.want_public: 작성자가 공개를 원하는지. 공개면 true, self면 false.
--        박지 없음·사진 없음일 때는 글쓰기 창의 '박지 생기면 공개' 스위치 값(앱이 보냄), 모르면 NULL.
--   3) 지난 피드 채우기: 비공개 이유는 같은 규칙으로 채우고(박지·사진이 다 있는 비공개는 self로 본다),
--      박지 없음·사진 없음의 작성자 뜻은 NULL(모름)로 둔다(대표님 11-02: 모름으로 둠).
--   4) okbm_admin_private_feeds(): 관리자만. 이유별 개수와 최근 비공개 피드 100개(ops.html '비공개 피드').
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP TRIGGER IF EXISTS trg_okbm_feeds_private_reason ON public.feeds;
--   DROP FUNCTION IF EXISTS public.okbm_feeds_private_reason(), public.okbm_admin_private_feeds();
--   ALTER TABLE public.feeds DROP COLUMN IF EXISTS private_reason, DROP COLUMN IF EXISTS want_public;
-- =========================================================================

-- 1) 칸 -------------------------------------------------------------------
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS private_reason text;
ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS want_public boolean;

-- 현장 사진 수(romantic-history.js okbmCanPublishFeed와 같은 기준)
CREATE OR REPLACE FUNCTION public.okbm_feed_field_photo_count(p_photos jsonb, p_ready text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT count(*)::integer
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_photos) = 'array' THEN p_photos ELSE '[]'::jsonb END) u
   WHERE u ~ '^https?://' AND u NOT LIKE '%unsplash.com%' AND u IS DISTINCT FROM NULLIF(btrim(COALESCE(p_ready, '')), '');
$$;

-- 2) 저장할 때 이유 정하기 -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_feeds_private_reason()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_published, false) THEN
    NEW.private_reason := NULL;
    NEW.want_public := true;
  ELSIF NEW.spot_id IS NULL OR btrim(NEW.spot_id) = '' THEN
    NEW.private_reason := 'no_spot';
  ELSIF public.okbm_feed_field_photo_count(NEW.photos, NEW.ready_shot_photo) = 0 THEN
    NEW.private_reason := 'no_photo';
  ELSIF TG_OP = 'INSERT' OR COALESCE(OLD.is_published, false) OR OLD.private_reason IS NULL OR OLD.private_reason = 'self' THEN
    -- 박지·사진이 다 있는데 비공개: 끈 채 올렸거나, 공개에서 껐거나, 이미 작성자가 끈 글
    NEW.private_reason := 'self';
    NEW.want_public := false;
  ELSE
    -- 자동 비공개였다가 조건을 갖춤(박지 연결·사진 추가). 작성자 뜻은 그대로 둔다.
    NEW.private_reason := 'ready';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_okbm_feeds_private_reason ON public.feeds;
CREATE TRIGGER trg_okbm_feeds_private_reason
  BEFORE INSERT OR UPDATE OF is_published, spot_id, photos, ready_shot_photo ON public.feeds
  FOR EACH ROW EXECUTE FUNCTION public.okbm_feeds_private_reason();

-- 3) 지난 피드 채우기(트리거를 거치지 않고 직접. 트리거는 is_published 등 칸이 바뀔 때만 돈다) ------------
UPDATE public.feeds f SET
  private_reason = CASE
    WHEN COALESCE(f.is_published, false) THEN NULL
    WHEN f.spot_id IS NULL OR btrim(f.spot_id) = '' THEN 'no_spot'
    WHEN public.okbm_feed_field_photo_count(f.photos, f.ready_shot_photo) = 0 THEN 'no_photo'
    ELSE 'self' END,
  want_public = CASE
    WHEN COALESCE(f.is_published, false) THEN true
    WHEN f.spot_id IS NULL OR btrim(f.spot_id) = '' THEN f.want_public
    WHEN public.okbm_feed_field_photo_count(f.photos, f.ready_shot_photo) = 0 THEN f.want_public
    ELSE false END
WHERE f.private_reason IS DISTINCT FROM CASE
    WHEN COALESCE(f.is_published, false) THEN NULL
    WHEN f.spot_id IS NULL OR btrim(f.spot_id) = '' THEN 'no_spot'
    WHEN public.okbm_feed_field_photo_count(f.photos, f.ready_shot_photo) = 0 THEN 'no_photo'
    ELSE 'self' END
   OR (COALESCE(f.is_published, false) AND f.want_public IS DISTINCT FROM true);

-- 4) 관리자 목록 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_admin_private_feeds()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'counts', (SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT private_reason AS r, want_public AS w, count(*) AS n
        FROM public.feeds WHERE NOT COALESCE(is_published, false)
       GROUP BY private_reason, want_public) x),
    'rows', (SELECT COALESCE(jsonb_agg(x ORDER BY x.created_at DESC), '[]'::jsonb) FROM (
      SELECT f.id, f.author, f.spot, f.spot_id, f.date, f.created_at, f.private_reason AS r, f.want_public AS w,
             public.okbm_feed_field_photo_count(f.photos, f.ready_shot_photo) AS pc
        FROM public.feeds f WHERE NOT COALESCE(f.is_published, false)
       ORDER BY f.created_at DESC LIMIT 100) x)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_admin_private_feeds() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_private_feeds() TO authenticated;

-- 확인: 이유별 개수
SELECT private_reason, want_public, count(*) FROM public.feeds WHERE NOT COALESCE(is_published, false) GROUP BY 1, 2 ORDER BY 1, 2;
