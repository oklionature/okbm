-- I8 장비 후기 2차 (2026-11-08, 대표님): 장비별 '가진 사람 수'·'이 장비로 간 박지', 가진 사람에게 질문 알림, 후기 3개월·1년 뒤 다시 묻기
-- 1) okbm_gear_stats(names, mine): 장비 이름마다 { spots, spot_names(최근 6곳), owners }
--      mine=true  → 내 피드(공개·비공개 모두)에서 그 장비를 기록한 박지. owners는 0
--      mine=false → 공개 피드 전체에서 그 장비를 기록한 박지, owners는 '내 장비'(users.my_gears.favoriteGears)에 둔 회원 수
--    누가 가졌는지는 돌려주지 않는다(수만). 이름은 장비 목록 이름(item_name) 그대로 맞춘다.
-- 2) 장비 '질문' 글이 올라오면 그 장비를 내 장비에 둔 회원에게 알림(kind 'lounge_gear_q', 글쓴이 빼고 300명까지).
-- 3) 장비 '후기'를 쓴 지 90일·365일이 지나면 쓴 사람에게 '아직 잘 쓰고 있나요?' 알림(kind 'lounge_gear_again'). 매일 10:00 KST.
--    알림을 누르면 그 후기 글이 열리고, 댓글로 덧붙인다.
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전.
-- 되돌리기: DROP FUNCTION okbm_gear_stats, okbm_gear_q_notify, okbm_gear_review_again; DROP TRIGGER trg_lounge_posts_gear_q; SELECT cron.unschedule('okbm_gear_again_daily');

CREATE OR REPLACE FUNCTION public.okbm_gear_item_match(e jsonb, n text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE jsonb_typeof(e)
    WHEN 'object' THEN COALESCE(e->>'name', e->>'itemName') = n
    WHEN 'string' THEN (e #>> '{}') = n OR left(e #>> '{}', char_length(n) + 2) = n || ' ('
    ELSE false END;
$$;

CREATE OR REPLACE FUNCTION public.okbm_gear_stats(p_names text[], p_mine boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_out jsonb := '{}'::jsonb;
  v_name text;
  v_spots jsonb;
  v_owners integer;
BEGIN
  IF p_names IS NULL THEN RETURN v_out; END IF;
  IF p_mine AND v_uid IS NULL THEN RETURN v_out; END IF;
  FOR v_name IN SELECT DISTINCT btrim(x) FROM unnest(p_names[1:200]) x WHERE char_length(btrim(x)) BETWEEN 1 AND 120 LOOP
    WITH hits AS (
      SELECT DISTINCT ON (COALESCE(NULLIF(f.spot_id, ''), f.spot)) COALESCE(NULLIF(btrim(f.spot), ''), '이름 없는 박지') AS spot, f.created_at AS at
        FROM public.feeds f
       WHERE (CASE WHEN p_mine THEN f.user_id = v_uid ELSE COALESCE(f.is_published, false) END)
         AND jsonb_typeof(f.items) = 'array'
         AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.items) e WHERE public.okbm_gear_item_match(e, v_name))
       ORDER BY COALESCE(NULLIF(f.spot_id, ''), f.spot), f.created_at DESC
    )
    SELECT jsonb_build_object('n', (SELECT count(*) FROM hits),
      'names', COALESCE((SELECT jsonb_agg(s.spot ORDER BY s.at DESC) FROM (SELECT * FROM hits ORDER BY at DESC LIMIT 6) s), '[]'::jsonb))
      INTO v_spots;
    v_owners := 0;
    IF NOT p_mine THEN
      SELECT count(*) INTO v_owners FROM public.users u
       WHERE jsonb_typeof(u.my_gears -> 'favoriteGears') = 'array' AND (u.my_gears -> 'favoriteGears') ? v_name;
    END IF;
    v_out := v_out || jsonb_build_object(v_name, jsonb_build_object('spots', COALESCE((v_spots->>'n')::int, 0), 'spot_names', COALESCE(v_spots->'names', '[]'::jsonb), 'owners', v_owners));
  END LOOP;
  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_stats(text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_gear_stats(text[], boolean) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.okbm_gear_item_match(jsonb, text) FROM PUBLIC, anon, authenticated;

-- 2) 질문 알림 ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_gear_q_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short text;
BEGIN
  IF NEW.category IS DISTINCT FROM 'gear' OR NEW.gear_kind IS DISTINCT FROM 'question' OR NEW.gear_name IS NULL OR COALESCE(NEW.is_private, false) THEN
    RETURN NULL;
  END IF;
  v_short := btrim(regexp_replace(regexp_replace(NEW.gear_name, '\([^)]*\)', ' ', 'g'), '\s+', ' ', 'g'));
  IF v_short = '' THEN v_short := NEW.gear_name; END IF;
  INSERT INTO public.user_notifications (id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id)
  SELECT left('ln_gq_' || NEW.id::text || '_' || md5(u.id), 180), u.id, 'lounge_gear_q',
         '가진 장비에 질문이 왔어요',
         '[' || left(v_short, 40) || '] ' || left(COALESCE(NEW.title, ''), 80),
         NEW.id::text, '', '', false, NEW.user_id
    FROM public.users u
   WHERE u.id <> NEW.user_id
     AND jsonb_typeof(u.my_gears -> 'favoriteGears') = 'array'
     AND (u.my_gears -> 'favoriteGears') ? NEW.gear_name
   LIMIT 300
  ON CONFLICT (id) DO NOTHING;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_q_notify() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_lounge_posts_gear_q ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_gear_q AFTER INSERT ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_gear_q_notify();

-- 3) 3개월·1년 뒤 다시 묻기 ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_gear_review_again()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  WITH due AS (
    SELECT p.id, p.user_id, p.gear_name, p.title, d.days, d.label
      FROM public.lounge_posts p
      CROSS JOIN (VALUES (90, '3개월'), (365, '1년')) AS d(days, label)
     WHERE p.gear_review IS NOT NULL
       AND p.created_at <= now() - make_interval(days => d.days)
       AND p.created_at > now() - make_interval(days => d.days + 30)
  ), ins AS (
    INSERT INTO public.user_notifications (id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read)
    SELECT 'ln_ga' || days || '_' || id::text, user_id, 'lounge_gear_again',
           left(COALESCE(btrim(regexp_replace(gear_name, '\([^)]*\)', ' ', 'g')), '장비'), 40) || ' 후기, 쓴 지 ' || label || '이 지났어요',
           '아직 잘 쓰고 있나요? 후기에 댓글로 한 줄 덧붙여 주세요.',
           id::text, '', '', false
      FROM due
    ON CONFLICT (id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM ins;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gear_review_again() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('okbm_gear_again_daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
-- 매일 10:00 KST(01:00 UTC)
SELECT cron.schedule('okbm_gear_again_daily', '0 1 * * *', $$SELECT public.okbm_gear_review_again()$$);

NOTIFY pgrst, 'reload schema';
