-- I3 장비 말머리: 특정 장비 없이도 쓰게 (2026-11-07, 대표님: '가성비 1인 텐트 추천해 주세요'처럼 장비를 못 고르는 질문이 막혔다)
-- I2에서는 장비 글에 gear_name이 꼭 있어야 했다. 이제 종류(gear_cat)만 필수, 장비(gear_id·gear_name)는 선택.
-- 장비를 안 고른 글은 게시판 종류 줄로만 걸러지고, 글 밑 장비 이름표·장비 모아 보기는 없다.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행한다(이전 화면은 늘 장비를 넣어 문제없다).

ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_gear_shape;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_gear_shape CHECK (
  (category = 'gear') = (gear_kind IS NOT NULL)
  AND (category = 'gear') = (gear_cat IS NOT NULL)
  AND (gear_kind IS NULL OR gear_kind IN ('question', 'review'))
  AND (gear_cat IS NULL OR gear_cat IN ('shelter', 'sleep', 'pack', 'food', 'kitchen', 'wear', 'electronics', 'camp', 'other'))
  AND (gear_name IS NULL OR (category = 'gear' AND char_length(btrim(gear_name)) BETWEEN 1 AND 120))
  AND (gear_id IS NULL OR (gear_name IS NOT NULL AND gear_id ~ '^[A-Za-z0-9_-]{1,40}$'))
);

-- 빈 이름은 '장비 없음'으로 본다
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post_gear()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.gear_kind := OLD.gear_kind;
    NEW.gear_id := OLD.gear_id;
    NEW.gear_name := OLD.gear_name;
    NEW.gear_cat := OLD.gear_cat;
    RETURN NEW;
  END IF;
  IF NEW.category IS DISTINCT FROM 'gear' THEN
    NEW.gear_kind := NULL;
    NEW.gear_id := NULL;
    NEW.gear_name := NULL;
    NEW.gear_cat := NULL;
    RETURN NEW;
  END IF;
  NEW.gear_name := NULLIF(btrim(NEW.gear_name), '');
  IF NEW.gear_id = '' OR NEW.gear_name IS NULL THEN NEW.gear_id := NULL; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_gear() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
