-- I29 장비 후기: 띄어쓰기 달라도 장비 찾기 + 이름만 적힌 스위프트 UL2 후기를 장비 목록에 잇기 (대표님 11-16)
-- 왜: 후기 쓴 분들이 '스위프트 ul2'로 찾았는데 목록 이름은 '어썸홀리데이 스위프트 UL 2'라 검색에 안 나왔다.
--     목록에서 못 고르고 이름만 적어 올려 gear_id가 비었고, 장비 창에 무게·특징(장비 정보)이 안 떴다.
-- 1) 장비 탭 검색(okbm_gear_board)이 띄어쓰기를 빼고 맞춘다. I28 함수에서 검색 줄만 바꿨다.
-- 2) 이름만 적힌 '스위프트 ul2'·'스위프트ul2' 후기를 gear_2734(어썸홀리데이 스위프트 UL 2)에 잇는다.
--    되돌리기: 아래 2)의 RETURNING으로 나온 id들에 gear_id = NULL, gear_name = 원래 이름.

-- 1) ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_gear_board(p_q text DEFAULT '', p_cat text DEFAULT 'all', p_sort text DEFAULT 'count', p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT p.id, p.gear_id, p.gear_name, p.gear_cat, p.gear_review, p.created_at,
           COALESCE(p.gear_id, 'n:' || lower(regexp_replace(p.gear_name, '\s+', '', 'g'))) AS gkey
      FROM public.lounge_posts p
     WHERE p.category = 'gear' AND p.gear_review IS NOT NULL AND p.gear_name IS NOT NULL
       AND NOT COALESCE(p.is_private, false)
  ), g AS (
    SELECT gkey,
           max(gear_id) AS gear_id,
           (array_agg(gear_name ORDER BY created_at DESC))[1] AS gear_name,
           array_agg(DISTINCT gear_name) AS names,
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
          WHERE w <> '' AND position(w IN lower(regexp_replace(g.gear_name || COALESCE(gs.brand, ''), '\s+', '', 'g'))) = 0)
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


NOTIFY pgrst, 'reload schema';

-- 2) ---------------------------------------------------------------------------
UPDATE public.lounge_posts
   SET gear_id = 'gear_2734', gear_name = '어썸홀리데이 스위프트 UL 2'
 WHERE category = 'gear' AND gear_id IS NULL
   AND lower(regexp_replace(gear_name, '\s+', '', 'g')) = '스위프트ul2'
RETURNING id, gear_kind, gear_id, gear_name, title;
