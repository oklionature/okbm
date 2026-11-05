-- H45: 내가 보낸 GPX를 다른 회원이 열면 5점 (2026-11-05, 대표님: "5점 한번")
-- 다른 회원이 박지 정보창에서 등산로 선을 처음 켤 때, 그 선을 보내 승인받은 회원에게 낭만 포인트 5점(reason 'gpx_open').
-- 한 사람이 한 박지에 한 번만(ref_id = 박지:연 사람, 장부 유일 키로 막힘). 본인이 켜면 주지 않는다. 하루 상한 없음.
-- 공식 GPX(gpx/official/)처럼 승인 기록이 없는 선은 받을 사람이 없어 0점.
-- 화면: map-main.js toggleGpxTrack가 선을 켤 때 부른다(실패해도 화면은 그대로).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 된다.

CREATE OR REPLACE FUNCTION public.okbm_gpx_opened(p_spot_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_owner text;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RETURN 0;
  END IF;
  PERFORM public.okbm_rpc_rate_limit('gpx_opened', 30);
  SELECT g.user_id INTO v_owner
    FROM public.spots sp
    JOIN public.spot_gpx_submissions g ON g.spot_id = sp.id AND g.gpx_url = sp.gpx_url AND g.status = '승인'
   WHERE sp.id = v_spot
   ORDER BY g.reviewed_at DESC NULLS LAST
   LIMIT 1;
  IF v_owner IS NULL OR v_owner = v_uid THEN RETURN 0; END IF;
  RETURN public.okbm_point_award(v_owner, 'gpx_open', v_spot || ':' || v_uid, 5, NULL, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_gpx_opened(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_gpx_opened(text) TO authenticated;
