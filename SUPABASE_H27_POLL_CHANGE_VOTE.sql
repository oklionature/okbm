-- H27: 라운지 투표를 마감 전까지 바꿀 수 있게 (2026-10-31)
-- 왜: H25에선 한 번 고르면 못 바꿨다. '헤비'를 누르려다 '경량'을 잘못 누를 수도 있다(대표님).
-- 어떻게: okbm_poll_vote가 이미 투표한 사람이면 고른 보기를 바꾼다. 한 사람 한 표, 마감 뒤엔 못 바꾸는 건 그대로.
--   화면은 결과 막대를 다시 누르면 그 보기로 바뀐다(lounge.js).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: SUPABASE_H25_LOUNGE_POLLS.sql의 okbm_poll_vote를 다시 실행(DO NOTHING).

-- 투표: 회원(익명 로그인 제외)만, 마감 전. 이미 했으면 고른 보기를 바꾼다(한 사람 한 표는 그대로).
CREATE OR REPLACE FUNCTION public.okbm_poll_vote(p_post_id uuid, p_choice integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_post record;
BEGIN
  IF auth.uid() IS NULL OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'login_required' USING ERRCODE = 'P0001';
  END IF;
  v_uid := public.okbm_uid();
  PERFORM public.okbm_rpc_rate_limit('poll_vote', 30);
  SELECT id, poll_options, poll_ends_at INTO v_post FROM public.lounge_posts WHERE id = p_post_id AND category = 'poll';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poll_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_post.poll_ends_at IS NOT NULL AND v_post.poll_ends_at <= now() THEN
    RAISE EXCEPTION 'poll_closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_choice IS NULL OR p_choice < 0 OR p_choice >= jsonb_array_length(v_post.poll_options) THEN
    RAISE EXCEPTION 'invalid_choice' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.lounge_poll_votes (post_id, user_id, choice)
  VALUES (p_post_id, v_uid, p_choice)
  ON CONFLICT (post_id, user_id) DO UPDATE SET choice = EXCLUDED.choice;
  RETURN public.okbm_poll_results(ARRAY[p_post_id]) -> 0;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_poll_vote(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_poll_vote(uuid, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
