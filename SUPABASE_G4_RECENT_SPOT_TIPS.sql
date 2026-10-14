-- =========================================================================
-- G4 최근 박지 팁 목록 (2026-10-14) — 라운지 "박지 후기" 탭에서 별점 후기와 섞어 보여 준다.
-- 회원만 내용(칩·한 줄)을 받는다. 비회원은 빈 목록. p_spot_id를 주면 그 박지만.
-- 표는 SUPABASE_G3_SPOT_TIPS.sql 의 okbm_spot_tips.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.okbm_recent_spot_tips(
  p_spot_id text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_actor text;
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_rows jsonb := '[]'::jsonb;
BEGIN
  v_member := v_is_service OR (auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'recent_spot_tips', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;
  IF v_member THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.updated_at DESC), '[]'::jsonb) INTO v_rows FROM (
      SELECT t.spot_id, t.user_id, t.nickname, t.tips, t.note, t.updated_at
      FROM public.okbm_spot_tips t
      WHERE (v_spot IS NULL OR t.spot_id = v_spot)
        AND (p_before IS NULL OR t.updated_at < p_before)
      ORDER BY t.updated_at DESC
      LIMIT v_limit
    ) r;
  END IF;
  RETURN jsonb_build_object('tier', CASE WHEN v_member THEN 'member' ELSE 'guest' END, 'rows', v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_recent_spot_tips(text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_recent_spot_tips(text, integer, timestamptz) TO anon, authenticated;

SELECT public.okbm_recent_spot_tips(NULL, 5, NULL) AS sample;
