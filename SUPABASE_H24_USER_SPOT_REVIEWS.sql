-- H24: 한 사람이 남긴 박지 후기 모아 보기 (2026-10-30)
-- 왜: 박지 후기(별점 후기 comments + 팁·한 줄 okbm_spot_tips)는 박지별로만 볼 수 있었다.
--     등록자 정보창(user-profile.js)과 낭만리포트(my-report.js)에 '후기' 탭을 두고 그 사람이 남긴 후기를 모두 보인다.
-- 어떻게: okbm_user_spot_reviews(p_user_id) 하나가 그 사람의 별점 후기와 팁을 각각 최근 순 200개까지 돌려준다.
--   · 내용은 회원만(get_spot_reviews·okbm_recent_spot_tips와 같은 기준). 비회원은 빈 목록.
--   · 별점 후기는 지금 있는 박지 것만(get_spot_reviews와 같다). 팁은 박지가 지워지면 같이 지워진다(FK).
--   · 같은 박지의 별점 후기와 팁은 화면에서 한 줄로 합친다.
--   · 1분에 60번까지. 색인: comments_user_id_idx(있음), okbm_spot_tips_user_updated(여기서 만든다).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: DROP FUNCTION public.okbm_user_spot_reviews(text); DROP INDEX IF EXISTS public.okbm_spot_tips_user_updated;

CREATE INDEX IF NOT EXISTS okbm_spot_tips_user_updated ON public.okbm_spot_tips (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.okbm_user_spot_reviews(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_actor text;
  v_uid text := NULLIF(btrim(COALESCE(p_user_id, '')), '');
  v_reviews jsonb := '[]'::jsonb;
  v_tips jsonb := '[]'::jsonb;
BEGIN
  v_member := v_is_service OR (auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'user_spot_reviews', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;
  IF v_member AND v_uid IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC, r.id DESC), '[]'::jsonb) INTO v_reviews FROM (
      SELECT c.id, c.spot_id, c.rating, c.text, c.created_at, c.updated_at
      FROM public.comments c
      WHERE c.user_id = v_uid AND c.rating BETWEEN 1 AND 5
        AND EXISTS (SELECT 1 FROM public.spots s WHERE s.id = c.spot_id)
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 200
    ) r;
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.updated_at DESC), '[]'::jsonb) INTO v_tips FROM (
      SELECT t.spot_id, t.tips, t.note, t.updated_at
      FROM public.okbm_spot_tips t
      WHERE t.user_id = v_uid
      ORDER BY t.updated_at DESC
      LIMIT 200
    ) r;
  END IF;
  RETURN jsonb_build_object('tier', CASE WHEN v_member THEN 'member' ELSE 'guest' END, 'reviews', v_reviews, 'tips', v_tips);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_user_spot_reviews(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_user_spot_reviews(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT public.okbm_user_spot_reviews('kakao_5060259862') AS sample;
