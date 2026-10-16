-- H3: 관리자 새 소식 (ops.html)
--
-- 관리자만 부른다. 최근 크리에이터 링크·새 피드와, 검수 대기 수를 한 번에 돌려준다.
-- p_since: 마지막으로 확인한 시각(없으면 NULL). 이 뒤에 들어온 건수를 new_* 로 센다.
-- 필요: SUPABASE_H2_SPOT_CREATOR_LINKS.sql 실행 후
--
-- 실행: Supabase SQL 편집기에서 이 파일 전체를 한 번 실행한다(여러 번 실행해도 된다).

CREATE OR REPLACE FUNCTION public.okbm_admin_activity(p_since timestamptz DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_links jsonb;
  v_feeds jsonb;
  v_inbox integer := 0;
  v_reports integer := 0;
BEGIN
  IF NOT COALESCE(public.okbm_is_admin(), false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_links
  FROM (
    SELECT l.id, l.spot_id, l.url, l.kind, l.title, l.author, l.user_id, l.hidden, l.created_at,
           COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), '')))) AS spot_name,
           (SELECT count(*) FROM public.spot_creator_link_votes v WHERE v.link_id = l.id AND v.vote = 'up') AS ups,
           (SELECT count(*) FROM public.spot_creator_link_votes v WHERE v.link_id = l.id AND v.vote = 'report') AS reports
    FROM public.spot_creator_links l
    LEFT JOIN public.spots s ON s.id = l.spot_id
    ORDER BY l.created_at DESC
    LIMIT v_limit
  ) x;

  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb) INTO v_feeds
  FROM (
    SELECT f.id, f.user_id, f.author, f.spot, f.spot_id, f.is_published, f.date, f.created_at,
           (s.id IS NOT NULL) AS linked,
           COALESCE(NULLIF(btrim(s."fullName"), ''), btrim(concat_ws(' ', s.spot_main, NULLIF(btrim(s.spot_sub), '')))) AS spot_name
    FROM public.feeds f
    LEFT JOIN public.spots s ON s.id::text = f.spot_id::text
    ORDER BY f.created_at DESC
    LIMIT v_limit
  ) x;

  -- 검수 대기: 상태가 비었거나 pending, 또는 '대기'·'검수'가 들어간 건(앱의 isPendingInboxStatus와 같은 기준)
  BEGIN
    SELECT count(*) INTO v_inbox FROM public.proposals p
    WHERE COALESCE(btrim(p.status), '') = '' OR p.status = 'pending' OR p.status LIKE '%대기%' OR p.status LIKE '%검수%';
  EXCEPTION WHEN undefined_table OR undefined_column THEN v_inbox := 0;
  END;
  BEGIN
    v_inbox := v_inbox + (SELECT count(*) FROM public.spot_corrections c
      WHERE COALESCE(btrim(c.status), '') = '' OR c.status = 'pending' OR c.status LIKE '%대기%' OR c.status LIKE '%검수%');
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  BEGIN
    SELECT count(*) INTO v_reports FROM public.feed_reports r WHERE r.status = 'pending';
  EXCEPTION WHEN undefined_table OR undefined_column THEN v_reports := 0;
  END;

  RETURN jsonb_build_object(
    'links', v_links,
    'feeds', v_feeds,
    'new_links', (SELECT count(*) FROM public.spot_creator_links l WHERE p_since IS NULL OR l.created_at > p_since),
    'new_feeds', (SELECT count(*) FROM public.feeds f WHERE p_since IS NULL OR f.created_at > p_since),
    'inbox_pending', v_inbox,
    'reports_pending', v_reports,
    'now', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_admin_activity(timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_activity(timestamptz, integer) TO authenticated, service_role;
