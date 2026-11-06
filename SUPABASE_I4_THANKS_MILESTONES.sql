-- I4 '내 덕분에' 알림 (2026-11-07, 대표님. 설계는 TASK_CONTRIBUTOR_LNT.md B)
-- 내가 올린 GPX를 연 사람, 내가 제보한 박지를 담은 사람을 박지마다 세어
-- 첫 1명, 그다음 10명마다(10·20·30…) 앱 알림 목록(user_notifications)에 한 줄 보낸다. 휴대폰 푸시는 없다.
-- 하루 한 번(09:00 KST) 몰아서 세고, 같은 날 한 사람에게 여러 박지가 넘으면 GPX·담기 따로 한 통으로 묶는다.
-- 처음 실행할 때는 이미 넘은 고비 중 맨 위 하나만 한 번 보낸다.
-- 알림은 밀어서 지울 수 있어 알림 id로는 '보냈는지'를 알 수 없다. 그래서 박지·종류마다 마지막 고비만 적는 작은 표를 둔다.
-- 관리자·공식 계정은 받지 않는다(낭만 포인트와 같은 기준).
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전.
--   미리 보기(알림 안 씀): SELECT public.okbm_thanks_run(true);

CREATE TABLE IF NOT EXISTS public.okbm_thanks_milestones (
  user_id text NOT NULL,
  spot_id text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('gpx', 'bookmark')),
  last_level integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id, metric)
);
ALTER TABLE public.okbm_thanks_milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.okbm_thanks_milestones FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS spot_gpx_unlocks_spot ON public.spot_gpx_unlocks (spot_id);

-- 고비: 0명 0, 1~9명 1, 10명부터 10 단위
CREATE OR REPLACE FUNCTION public.okbm_thanks_level(p_n bigint)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN p_n < 1 THEN 0 WHEN p_n < 10 THEN 1 ELSE (p_n / 10 * 10)::integer END
$$;

CREATE OR REPLACE FUNCTION public.okbm_thanks_run(p_dry boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_day text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');
  g record;
  v_title text;
  v_body text;
  v_sent integer := 0;
  v_preview jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin')
     AND NOT COALESCE(public.okbm_is_admin(), false) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _okbm_thanks (user_id text, spot_id text, metric text, spot_name text, n bigint, lvl integer, prev integer) ON COMMIT DROP;
  TRUNCATE _okbm_thanks;

  -- GPX: 지금 박지에 붙은 승인 GPX의 주인, 그 박지를 연 사람 수(주인·관리자는 열어도 기록되지 않는다)
  INSERT INTO _okbm_thanks (user_id, spot_id, metric, spot_name, n)
  SELECT o.user_id, o.spot_id, 'gpx', o.spot_name,
         (SELECT count(*) FROM public.spot_gpx_unlocks k WHERE k.spot_id = o.spot_id AND k.user_id <> o.user_id)
    FROM (
      SELECT DISTINCT ON (sp.id) g2.user_id, sp.id AS spot_id, sp.spot_main AS spot_name
        FROM public.spots sp
        JOIN public.spot_gpx_submissions g2 ON g2.spot_id = sp.id AND g2.gpx_url = sp.gpx_url AND g2.status = '승인'
       WHERE COALESCE(sp.gpx_url, '') <> ''
       ORDER BY sp.id, g2.reviewed_at DESC NULLS LAST
    ) o;

  -- 담기: 채택된 박지 제보의 제보자(같은 박지에 여럿이면 먼저 낸 사람), 그 박지를 담아 둔 사람 수(제보자 빼고)
  INSERT INTO _okbm_thanks (user_id, spot_id, metric, spot_name, n)
  SELECT o.user_id, o.spot_id, 'bookmark', sp.spot_main,
         (SELECT count(*) FROM public.users u
           WHERE u.id <> o.user_id AND jsonb_typeof(u.bookmarks) = 'array'
             AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(u.bookmarks) e(v) WHERE btrim(e.v) = o.spot_id))
    FROM (
      SELECT DISTINCT ON (btrim(p.approved_spot_id)) p.user_id, btrim(p.approved_spot_id) AS spot_id
        FROM public.proposals p
       WHERE COALESCE(btrim(p.approved_spot_id), '') <> '' AND COALESCE(btrim(p.user_id), '') <> ''
         AND COALESCE(p.status, '') ~ '(반영완료|채택|승인)'
       ORDER BY btrim(p.approved_spot_id), p.created_at
    ) o
    JOIN public.spots sp ON sp.id = o.spot_id;

  -- 받지 않는 사람
  DELETE FROM _okbm_thanks t
   WHERE t.user_id = 'official_romanticroute'
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id AND COALESCE(u.is_admin, false))
      OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);

  -- 고비와 알림에 쓸 이름('원적산 (이천)' → '원적산'), 지난번 보낸 고비
  UPDATE _okbm_thanks t SET
    lvl = public.okbm_thanks_level(t.n),
    spot_name = COALESCE(NULLIF(btrim(regexp_replace(COALESCE(t.spot_name, ''), '\s*\(.*?\)', '', 'g')), ''), '박지');
  UPDATE _okbm_thanks t SET prev = m.last_level
    FROM public.okbm_thanks_milestones m
   WHERE m.user_id = t.user_id AND m.spot_id = t.spot_id AND m.metric = t.metric;

  -- 사람·종류마다 한 통
  FOR g IN
    SELECT t.user_id, t.metric,
           jsonb_agg(jsonb_build_object('spot_id', t.spot_id, 'name', t.spot_name, 'lvl', t.lvl, 'n', t.n)
                     ORDER BY t.lvl DESC, t.n DESC, t.spot_id) AS items
      FROM _okbm_thanks t
     WHERE t.lvl > COALESCE(t.prev, 0)
     GROUP BY t.user_id, t.metric
  LOOP
    IF jsonb_array_length(g.items) = 1 THEN
      v_title := CASE
        WHEN g.metric = 'gpx' AND (g.items->0->>'lvl')::int = 1 THEN '올려 주신 ' || (g.items->0->>'name') || ' GPX로 첫 사람이 길을 찾았어요.'
        WHEN g.metric = 'gpx' THEN '올려 주신 ' || (g.items->0->>'name') || ' GPX로 ' || (g.items->0->>'lvl') || '명이 길을 찾았어요.'
        WHEN (g.items->0->>'lvl')::int = 1 THEN '제보해 주신 ' || (g.items->0->>'name') || ', 가 보고 싶다는 첫 사람이 생겼어요.'
        ELSE '제보해 주신 ' || (g.items->0->>'name') || ', ' || (g.items->0->>'lvl') || '명이 가 보고 싶대요.'
      END;
      v_body := '';  -- user_notifications.body는 NOT NULL
    ELSE
      v_title := CASE WHEN g.metric = 'gpx'
        THEN '올려 주신 GPX ' || jsonb_array_length(g.items) || '곳으로 길을 찾은 사람이 또 늘었어요.'
        ELSE '제보해 주신 박지 ' || jsonb_array_length(g.items) || '곳에 가 보고 싶은 사람이 또 늘었어요.' END;
      SELECT string_agg((e->>'name') || ' ' || CASE WHEN (e->>'lvl')::int = 1 THEN '첫 사람' ELSE (e->>'lvl') || '명' END, ' · ' ORDER BY i)
        INTO v_body FROM jsonb_array_elements(g.items) WITH ORDINALITY AS a(e, i);
    END IF;

    IF p_dry THEN
      v_preview := v_preview || jsonb_build_object('user_id', g.user_id, 'metric', g.metric, 'title', v_title, 'body', v_body, 'items', g.items);
    ELSE
      INSERT INTO public.user_notifications (id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read)
      VALUES (left('pn_thanks_' || g.metric || '_' || g.user_id || '_' || v_day, 180), g.user_id, 'thanks_' || g.metric,
              v_title, v_body, g.items->0->>'spot_id', g.items->0->>'spot_id', g.items->0->>'name', false)
      ON CONFLICT (id) DO NOTHING;
      v_sent := v_sent + 1;
    END IF;
  END LOOP;

  IF NOT p_dry THEN
    INSERT INTO public.okbm_thanks_milestones (user_id, spot_id, metric, last_level, updated_at)
    SELECT t.user_id, t.spot_id, t.metric, t.lvl, now() FROM _okbm_thanks t WHERE t.lvl > COALESCE(t.prev, 0)
    ON CONFLICT (user_id, spot_id, metric) DO UPDATE SET last_level = EXCLUDED.last_level, updated_at = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'dry', p_dry, 'sent', v_sent,
    'counted', (SELECT count(*) FROM _okbm_thanks), 'preview', v_preview);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_thanks_run(boolean) FROM PUBLIC, anon, authenticated;

-- 매일 09:00 KST(00:00 UTC)
SELECT cron.schedule('okbm_thanks_daily', '0 0 * * *', $$SELECT public.okbm_thanks_run(false)$$);
