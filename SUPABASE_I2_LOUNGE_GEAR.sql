-- I2 자유게시판 '장비' 말머리 (2026-11-06, 대표님: 장비 질문·후기를 장비별로 묶고 중고 시세를 볼 수 있게)
-- lounge_posts에 category 'gear'와 장비 칸 넷을 더한다.
--   gear_kind  'question'(질문) | 'review'(후기). 게시판에서 둘을 나눠 본다
--   gear_id    gears_master.json의 id(gear_1001). 목록에 없는 장비를 직접 적으면 null
--   gear_name  장비 이름 1~120자. 같은 장비 글 모아 보기는 gear_id, 없으면 이 이름으로 묶는다
--   gear_cat   장비 종류(GEAR_CAT 키). 게시판 종류 줄(텐트·침낭…)로 거른다
-- 장비 칸은 올린 뒤에 못 바꾼다(분류처럼). 중고 시세는 서버에 두지 않고, 화면이 번개장터·당근·초캠장터 검색으로 이어 준다.
-- 클라이언트: lounge.js POST_COLS·loadPosts(boardKey)·장비 모아 보기 시트.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행해야 목록이 안 깨진다(POST_COLS에 새 칸이 들어감).
-- 되돌리기: (gear 글을 지운 뒤) 분류 CHECK에서 'gear'를 빼고, lounge_posts_gear_shape·트리거·네 칸을 지운다.

ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS gear_kind text;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS gear_id text;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS gear_name text;
ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS gear_cat text;

-- 분류에 'gear'. H50이 gpx 글이 없을 때 'gpx'를 뺐으므로, gpx 글이 남아 있을 때만 'gpx'를 둔다
DO $$
BEGIN
  ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_category_check;
  IF EXISTS (SELECT 1 FROM public.lounge_posts WHERE category = 'gpx') THEN
    ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_category_check
      CHECK (category IN ('backpacking', 'life', 'poll', 'suggestion', 'gpx', 'gear'));
  ELSE
    ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_category_check
      CHECK (category IN ('backpacking', 'life', 'poll', 'suggestion', 'gear'));
  END IF;
END $$;

ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_gear_shape;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_gear_shape CHECK (
  (category = 'gear') = (gear_kind IS NOT NULL)
  AND (category = 'gear') = (gear_name IS NOT NULL)
  AND (category = 'gear') = (gear_cat IS NOT NULL)
  AND (gear_kind IS NULL OR gear_kind IN ('question', 'review'))
  AND (gear_name IS NULL OR char_length(btrim(gear_name)) BETWEEN 1 AND 120)
  AND (gear_cat IS NULL OR gear_cat IN ('shelter', 'sleep', 'pack', 'food', 'kitchen', 'wear', 'electronics', 'camp', 'other'))
  AND (gear_id IS NULL OR (category = 'gear' AND gear_id ~ '^[A-Za-z0-9_-]{1,40}$'))
);

-- 장비 칸은 올린 뒤 못 바꾼다. 이름 앞뒤 공백은 뗀다
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
  NEW.gear_name := btrim(NEW.gear_name);
  IF NEW.gear_id = '' THEN NEW.gear_id := NULL; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_gear() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_posts_guard_gear ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard_gear
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post_gear();

CREATE INDEX IF NOT EXISTS lounge_posts_gear_list_idx ON public.lounge_posts (gear_kind, gear_cat, created_at DESC) WHERE category = 'gear';
CREATE INDEX IF NOT EXISTS lounge_posts_gear_id_idx ON public.lounge_posts (gear_id, created_at DESC) WHERE gear_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lounge_posts_gear_name_idx ON public.lounge_posts (gear_name, created_at DESC) WHERE category = 'gear';

NOTIFY pgrst, 'reload schema';
