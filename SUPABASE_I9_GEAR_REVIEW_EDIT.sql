-- I9 장비 후기 수정 허용·장비 사진 (2026-11-09, 대표님: "한번 썼다가 수정할 수도 있게 해")
-- 1) 장비 '후기' 글은 올린 뒤에도 장비(gear_id·gear_name·gear_cat)와 gear_review(별점·기간·횟수·꼬리표·자립·장비 사진)를 고칠 수 있다.
--    분류(category)와 질문/후기(gear_kind)는 그대로 잠근다. 장비 '질문' 글은 지금처럼 장비 칸을 못 바꾼다.
-- 2) gear_review.photo: 후기에 올린 사진 중 '장비 사진'으로 고른 한 장(https 주소, 500자까지). 글 위 장비 카드와 장비 창에 쓴다.
-- 3) 고칠 때 자립을 처음 고르면 gear_facts에도 남긴다(INSERT와 같은 규칙, 먼저 고른 값 유지).
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행한다.

CREATE OR REPLACE FUNCTION public.okbm_gear_review_ok(r jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_typeof(r) = 'object'
    AND pg_column_size(r) <= 4000
    AND COALESCE(r->>'kind', '') IN ('tent', 'bag', 'mat', 'pack', 'other')
    AND COALESCE(r->>'rating', '') ~ '^[1-5]$'
    AND COALESCE(r->>'period', '') IN ('1m', '6m', '1y', '1y+')
    AND COALESCE(r->>'uses', '') IN ('5', '10', '10+')
    AND (r->'stand' IS NULL OR jsonb_typeof(r->'stand') = 'null' OR (r->>'kind' = 'tent' AND r->>'stand' IN ('free', 'non')))
    AND (r->'photo' IS NULL OR jsonb_typeof(r->'photo') = 'null' OR (jsonb_typeof(r->'photo') = 'string' AND r->>'photo' ~ '^https://' AND char_length(r->>'photo') <= 500))
    AND jsonb_typeof(COALESCE(r->'pros', '[]'::jsonb)) = 'array'
    AND jsonb_typeof(COALESCE(r->'cons', '[]'::jsonb)) = 'array'
    AND jsonb_array_length(COALESCE(r->'pros', '[]'::jsonb)) <= 12
    AND jsonb_array_length(COALESCE(r->'cons', '[]'::jsonb)) <= 12
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(r->'pros', '[]'::jsonb) || COALESCE(r->'cons', '[]'::jsonb)) e
      WHERE jsonb_typeof(e) <> 'string' OR char_length(btrim(e #>> '{}')) NOT BETWEEN 1 AND 30
    );
$$;

CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post_gear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.gear_kind := OLD.gear_kind;
    IF OLD.gear_kind IS DISTINCT FROM 'review' THEN
      NEW.gear_id := OLD.gear_id;
      NEW.gear_name := OLD.gear_name;
      NEW.gear_cat := OLD.gear_cat;
      NEW.gear_review := OLD.gear_review;
      RETURN NEW;
    END IF;
    -- 후기: 장비와 정리 칸은 고칠 수 있다. 비우지는 못한다(후기는 장비·별점이 있어야 한다)
    NEW.gear_name := NULLIF(btrim(NEW.gear_name), '');
    IF NEW.gear_name IS NULL OR NEW.gear_cat IS NULL OR NEW.gear_review IS NULL THEN
      NEW.gear_id := OLD.gear_id;
      NEW.gear_name := OLD.gear_name;
      NEW.gear_cat := OLD.gear_cat;
      NEW.gear_review := OLD.gear_review;
    END IF;
    IF NEW.gear_id = '' THEN NEW.gear_id := NULL; END IF;
    RETURN NEW;
  END IF;
  IF NEW.category IS DISTINCT FROM 'gear' THEN
    NEW.gear_kind := NULL;
    NEW.gear_id := NULL;
    NEW.gear_name := NULL;
    NEW.gear_cat := NULL;
    NEW.gear_review := NULL;
    RETURN NEW;
  END IF;
  NEW.gear_name := NULLIF(btrim(NEW.gear_name), '');
  IF NEW.gear_id = '' OR NEW.gear_name IS NULL THEN NEW.gear_id := NULL; END IF;
  IF NEW.gear_kind IS DISTINCT FROM 'review' THEN NEW.gear_review := NULL; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_gear() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_posts_gear_facts ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_gear_facts AFTER INSERT OR UPDATE OF gear_review, gear_id ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_gear_facts_from_review();

NOTIFY pgrst, 'reload schema';
