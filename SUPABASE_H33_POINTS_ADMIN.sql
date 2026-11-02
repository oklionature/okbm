-- =========================================================================
-- H33: 낭만 포인트 관리자 칸 (2026-11-02, ops.html '낭만 포인트')
--
-- 왜: 대표님 11-02 — 장부(point_ledger)는 회원 아이디만 있어 누가 누군지 모르고, 직접 주거나 뺄 방법이 없었다.
-- 어떻게(모두 관리자만, okbm_is_admin()):
--   1) okbm_admin_points_overview(p_query): 비우면 잔액 상위 20명·오늘 많이 받은 10명·전체 지급 합계,
--      '오늘 많이 받은'은 카드처럼 상한 없는 운영자 지급·제보·수정 건의를 뺀다(11-02 실제 확인 때 소급 1,300점이 1위로 떠서),
--      닉네임을 넣으면 그 닉네임을 가진 회원(20명까지)과 잔액.
--   2) okbm_admin_points_user(p_user_id): 한 회원의 닉네임·잔액·내역 100줄(사유 포함).
--   3) okbm_admin_points_adjust(p_user_id, p_delta, p_note): 운영자 지급(+)·회수(−). 사유 필수, 한 번에 ±10,000까지.
--      장부에 reason 'admin'으로 쌓이고, 회원 내역에는 '운영자 지급/회수 · 사유'로 보인다.
--   4) okbm_my_points가 운영자 줄의 사유(n)도 돌려준다(회원 내역에 보이게). '오늘 받은 점수'(하루 최대 200 막대)에서는
--      상한 없는 운영자 지급·제보·수정 건의를 뺀다(소급 1,300점이 '오늘 +1,300 / 200'으로 보이지 않게).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   DROP FUNCTION IF EXISTS public.okbm_admin_points_overview(text), public.okbm_admin_points_user(text),
--     public.okbm_admin_points_adjust(text, integer, text);
--   (okbm_my_points는 H31 9)로 다시 만든다)
-- =========================================================================

-- 1) 한눈에 보기·닉네임 찾기 ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_admin_points_overview(p_query text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_q text := NULLIF(btrim(COALESCE(p_query, '')), '');
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  IF v_q IS NOT NULL THEN
    RETURN jsonb_build_object('found', (SELECT COALESCE(jsonb_agg(x ORDER BY x.bal DESC), '[]'::jsonb) FROM (
      SELECT u.id, u.nickname, COALESCE((SELECT sum(l.delta) FROM public.point_ledger l WHERE l.user_id = u.id), 0) AS bal
        FROM public.users u
       WHERE u.nickname ILIKE '%' || replace(replace(v_q, '%', '\%'), '_', '\_') || '%' OR u.id = v_q
       LIMIT 20) x));
  END IF;
  RETURN jsonb_build_object(
    'total_given', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE delta > 0),
    'members', (SELECT count(DISTINCT user_id) FROM public.point_ledger),
    'top', (SELECT COALESCE(jsonb_agg(x ORDER BY x.bal DESC), '[]'::jsonb) FROM (
      SELECT l.user_id AS id, u.nickname, sum(l.delta) AS bal
        FROM public.point_ledger l LEFT JOIN public.users u ON u.id = l.user_id
       GROUP BY l.user_id, u.nickname ORDER BY sum(l.delta) DESC LIMIT 20) x),
    'today', (SELECT COALESCE(jsonb_agg(x ORDER BY x.got DESC), '[]'::jsonb) FROM (
      SELECT l.user_id AS id, u.nickname, sum(l.delta) AS got
        FROM public.point_ledger l LEFT JOIN public.users u ON u.id = l.user_id
       WHERE l.delta > 0 AND l.reason NOT IN ('admin', 'proposal', 'correction') AND l.created_at >= public.okbm_point_day_start()
       GROUP BY l.user_id, u.nickname ORDER BY sum(l.delta) DESC LIMIT 10) x)
  );
END;
$$;

-- 2) 한 회원 ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_admin_points_user(p_user_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object(
    'id', p_user_id,
    'nickname', (SELECT nickname FROM public.users WHERE id = p_user_id),
    'balance', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE user_id = p_user_id),
    'history', (SELECT COALESCE(jsonb_agg(jsonb_build_object('r', reason, 'd', delta, 't', created_at, 'n', note) ORDER BY created_at DESC, id DESC), '[]'::jsonb) FROM (
      SELECT id, reason, delta, created_at, note FROM public.point_ledger
       WHERE user_id = p_user_id ORDER BY created_at DESC, id DESC LIMIT 100) h)
  );
END;
$$;

-- 3) 운영자 지급·회수 -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_admin_points_adjust(p_user_id text, p_delta integer, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF NOT public.okbm_is_admin() THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  IF COALESCE(p_delta, 0) = 0 OR abs(p_delta) > 10000 THEN RAISE EXCEPTION 'bad delta' USING ERRCODE = '22023'; END IF;
  IF v_note IS NULL THEN RAISE EXCEPTION 'note required' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'user not found' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.point_ledger (user_id, delta, reason, ref_id, note)
  VALUES (p_user_id, p_delta, 'admin', 'adm:' || extract(epoch FROM clock_timestamp())::text || ':' || md5(random()::text), left(v_note, 100));
  RETURN jsonb_build_object('balance', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE user_id = p_user_id));
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_admin_points_overview(text), public.okbm_admin_points_user(text),
  public.okbm_admin_points_adjust(text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_admin_points_overview(text), public.okbm_admin_points_user(text),
  public.okbm_admin_points_adjust(text, integer, text) TO authenticated;

-- 4) 내 포인트: 운영자 줄은 사유도 ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_my_points(p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 30), 0), 100);
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('my_points', 60);
  RETURN jsonb_build_object(
    'balance', (SELECT COALESCE(sum(delta), 0) FROM public.point_ledger WHERE user_id = v_uid),
    'today', (SELECT COALESCE(jsonb_object_agg(reason, s), '{}'::jsonb) FROM (
                SELECT reason, sum(delta) AS s FROM public.point_ledger
                 WHERE user_id = v_uid AND delta > 0 AND created_at >= public.okbm_point_day_start()
                   AND reason NOT IN ('admin', 'proposal', 'correction')
                 GROUP BY reason) t),
    'history', (SELECT COALESCE(jsonb_agg(jsonb_build_object('r', reason, 'd', delta, 't', created_at,
                  'n', CASE WHEN reason = 'admin' THEN note END) ORDER BY created_at DESC, id DESC), '[]'::jsonb) FROM (
                SELECT id, reason, delta, created_at, note FROM public.point_ledger
                 WHERE user_id = v_uid ORDER BY created_at DESC, id DESC LIMIT v_lim) h)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_my_points(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_my_points(integer) TO authenticated;
