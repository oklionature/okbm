-- I10 라운지 '장비' 탭 (2026-11-09, 대표님: 장비 후기가 많아지면 찾아볼 수 있어야 한다)
-- okbm_gear_board(q, cat, sort, limit): 장비 후기를 장비 하나에 한 줄로 묶어 돌려준다.
--   한 줄: gkey(gear_id 또는 'n:'+이름), gear_id, gear_name, gear_cat, kind, n(후기 수), avg(별점 평균), last_at, photo(최신 장비 사진),
--          top_pro·top_pro_n(가장 많이 고른 좋았던 점, 같으면 먼저 누른 것), weight_g, brand(gears 표)
--   q    장비 이름·브랜드 검색. 띄어 쓴 낱말은 모두 들어 있어야 한다(대소문자 무시)
--   cat  'all' | 'shelter' | 'bag' | 'mat' | 'pack' | 'kitchen' | 'wear' | 'electronics' | 'camp' | 'food' | 'other'
--        침낭·매트는 같은 gear_cat 'sleep'이라 후기에 저장된 kind(bag/mat)로 가른다
--   sort 'count'(후기 많은 순) | 'rating'(별점 높은 순) | 'recent'(최근 후기 순)
-- 비공개 글은 뺀다. 누구나 읽는다(공개 글의 수와 평균만).
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전.

CREATE OR REPLACE FUNCTION public.okbm_gear_board(p_q text DEFAULT '', p_cat text DEFAULT 'all', p_sort text DEFAULT 'count', p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT p.id, p.gear_id, p.gear_name, p.gear_cat, p.gear_review, p.created_at,
           COALESCE(p.gear_id, 'n:' || p.gear_name) AS gkey
      FROM public.lounge_posts p
     WHERE p.category = 'gear' AND p.gear_review IS NOT NULL AND p.gear_name IS NOT NULL
       AND NOT COALESCE(p.is_private, false)
  ), g AS (
    SELECT gkey,
           max(gear_id) AS gear_id,
           (array_agg(gear_name ORDER BY created_at DESC))[1] AS gear_name,
           (array_agg(gear_cat ORDER BY created_at DESC))[1] AS gear_cat,
           (array_agg(gear_review ->> 'kind' ORDER BY created_at DESC))[1] AS kind,
           count(*)::int AS n,
           round(avg((gear_review ->> 'rating')::numeric), 1) AS avg,
           max(created_at) AS last_at,
           (array_agg(gear_review ->> 'photo' ORDER BY created_at DESC) FILTER (WHERE gear_review ->> 'photo' LIKE 'https://%'))[1] AS photo
      FROM r GROUP BY gkey
  ), tags AS (
    SELECT r.gkey, t.tag, count(*)::int AS c, min(t.ord) AS o
      FROM r, jsonb_array_elements_text(CASE WHEN jsonb_typeof(r.gear_review -> 'pros') = 'array' THEN r.gear_review -> 'pros' ELSE '[]'::jsonb END) WITH ORDINALITY AS t(tag, ord)
     GROUP BY r.gkey, t.tag
  ), rows AS (
    SELECT g.*, gs.weight_g, gs.brand,
           (SELECT tg.tag FROM tags tg WHERE tg.gkey = g.gkey ORDER BY tg.c DESC, tg.o, tg.tag LIMIT 1) AS top_pro,
           (SELECT tg.c FROM tags tg WHERE tg.gkey = g.gkey ORDER BY tg.c DESC, tg.o, tg.tag LIMIT 1) AS top_pro_n
      FROM g LEFT JOIN public.gears gs ON gs.id = g.gear_id
     WHERE (COALESCE(p_cat, 'all') = 'all'
            OR (p_cat = 'bag' AND g.gear_cat = 'sleep' AND COALESCE(g.kind, 'bag') <> 'mat')
            OR (p_cat = 'mat' AND g.gear_cat = 'sleep' AND g.kind = 'mat')
            OR (p_cat NOT IN ('bag', 'mat') AND g.gear_cat = p_cat))
       AND NOT EXISTS (
         SELECT 1 FROM regexp_split_to_table(lower(btrim(COALESCE(p_q, ''))), '\s+') w
          WHERE w <> '' AND position(w IN lower(g.gear_name || ' ' || COALESCE(gs.brand, ''))) = 0)
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY
           CASE WHEN p_sort = 'rating' THEN x.avg END DESC NULLS LAST,
           CASE WHEN p_sort = 'recent' THEN x.last_at END DESC NULLS LAST,
           x.n DESC, x.avg DESC, x.last_at DESC), '[]'::jsonb)
    FROM (SELECT * FROM rows ORDER BY
           CASE WHEN p_sort = 'rating' THEN avg END DESC NULLS LAST,
           CASE WHEN p_sort = 'recent' THEN last_at END DESC NULLS LAST,
           n DESC, avg DESC, last_at DESC
          LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200)) x;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_board(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_gear_board(text, text, text, integer) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS lounge_posts_gear_board_idx ON public.lounge_posts (created_at DESC)
  WHERE category = 'gear' AND gear_review IS NOT NULL;

NOTIFY pgrst, 'reload schema';
