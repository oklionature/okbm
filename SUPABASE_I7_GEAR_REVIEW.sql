-- I7 장비 후기 개편 (2026-11-08, 대표님: 장비 실사용 후기를 많이 모으고 내 장비에서 관리)
-- 1) lounge_posts.gear_review: 장비 '후기' 글에만 붙는 정리 칸(jsonb). 올린 뒤에는 못 바꾼다(다른 장비 칸처럼).
--      kind    'tent' | 'bag' | 'mat' | 'pack' | 'other'  꼬리표 묶음(침낭·매트는 같은 gear_cat 'sleep'이라 여기서 가른다)
--      rating  1~5 종합 별점
--      period  '1m' | '6m' | '1y' | '1y+'   사용 기간(한 달·반년·1년·1년 이상)
--      uses    '5' | '10' | '10+'           사용 횟수
--      pros, cons  고른 꼬리표 글자 배열(각 12개까지). '기타 직접 적기'로 쓴 말도 여기 들어간다(30자까지)
--      stand   'free' | 'non'               텐트 자립·비자립(텐트만)
--    안내 칸(사기 전에 알았으면 좋았을 점·이런 분께 맞아요·하고 싶은 말)은 body에 제목 줄과 함께 들어간다.
-- 2) gear_facts: 장비 목록에 자립 정보가 없는 텐트를 처음 후기 쓴 사람이 고른 값. 먼저 고른 값이 남는다.
--    후기 글이 들어갈 때 트리거가 채운다. 화면은 읽기만 한다.
-- 3) 낭만 포인트: 장비 후기(gear_review 있는 글)는 게시판 글 5점 대신 'gear_review' 10점, 하루 3개(30점). 지우면 뺀다.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행한다(POST_COLS에 gear_review가 들어감).
-- 되돌리기: gear_review 칸·lounge_posts_gear_review_shape·gear_facts·트리거를 지우고 okbm_points_on_post를 H32 본으로 되돌린다.

ALTER TABLE public.lounge_posts ADD COLUMN IF NOT EXISTS gear_review jsonb;

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
    AND jsonb_typeof(COALESCE(r->'pros', '[]'::jsonb)) = 'array'
    AND jsonb_typeof(COALESCE(r->'cons', '[]'::jsonb)) = 'array'
    AND jsonb_array_length(COALESCE(r->'pros', '[]'::jsonb)) <= 12
    AND jsonb_array_length(COALESCE(r->'cons', '[]'::jsonb)) <= 12
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(r->'pros', '[]'::jsonb) || COALESCE(r->'cons', '[]'::jsonb)) e
      WHERE jsonb_typeof(e) <> 'string' OR char_length(btrim(e #>> '{}')) NOT BETWEEN 1 AND 30
    );
$$;

ALTER TABLE public.lounge_posts DROP CONSTRAINT IF EXISTS lounge_posts_gear_review_shape;
ALTER TABLE public.lounge_posts ADD CONSTRAINT lounge_posts_gear_review_shape CHECK (
  gear_review IS NULL OR (category = 'gear' AND gear_kind = 'review' AND public.okbm_gear_review_ok(gear_review))
);

-- 장비 칸 잠금(I3 본)에 gear_review를 더한다
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
    NEW.gear_review := OLD.gear_review;
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

CREATE INDEX IF NOT EXISTS lounge_posts_gear_review_idx ON public.lounge_posts (gear_id, created_at DESC)
  WHERE gear_review IS NOT NULL;

-- 2) 자립·비자립 ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gear_facts (
  gear_id text PRIMARY KEY CHECK (gear_id ~ '^[A-Za-z0-9_-]{1,40}$'),
  stand text NOT NULL CHECK (stand IN ('free', 'non')),
  user_id text,
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gear_facts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gear_facts FROM PUBLIC, anon, authenticated;
GRANT SELECT (gear_id, stand) ON TABLE public.gear_facts TO anon, authenticated;
DROP POLICY IF EXISTS gear_facts_select ON public.gear_facts;
CREATE POLICY gear_facts_select ON public.gear_facts FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.okbm_gear_facts_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gear_id IS NOT NULL AND NEW.gear_review ->> 'stand' IN ('free', 'non') THEN
    INSERT INTO public.gear_facts (gear_id, stand, user_id, post_id)
    VALUES (NEW.gear_id, NEW.gear_review ->> 'stand', NEW.user_id, NEW.id)
    ON CONFLICT (gear_id) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_facts_from_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_lounge_posts_gear_facts ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_gear_facts AFTER INSERT ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_gear_facts_from_review();

-- 3) 낭만 포인트 (H32 본에 장비 후기를 더한다) ---------------------------------
CREATE OR REPLACE FUNCTION public.okbm_points_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.gear_review IS NOT NULL THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'gear_review', NEW.id::text, 10, 30);
    ELSIF NOT COALESCE(NEW.is_private, false) THEN
      PERFORM public.okbm_point_award(NEW.user_id, 'post', NEW.id::text, 5, 10);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.okbm_point_revoke(OLD.user_id, 'post', OLD.id::text);
    PERFORM public.okbm_point_revoke(OLD.user_id, 'gear_review', OLD.id::text);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_points_on_post() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
