-- H7: 운영 화면(ops.html) 회원가입 숫자 (2026-10-17)
--
-- 관리자만 부른다. 전체 회원 수와 날짜별(서울) 새 가입 수를 돌려준다.
-- 지난 기간과 비교할 수 있게 p_days의 두 배 기간을 준다.
--
-- 실행: Supabase SQL 편집기에서 이 파일 전체를 한 번 실행한다(여러 번 실행해도 된다).

CREATE OR REPLACE FUNCTION public.okbm_admin_member_stats(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
  v_from date := (now() AT TIME ZONE 'Asia/Seoul')::date - (v_days * 2 - 1);
  v_total integer := 0;
  v_by_day jsonb;
BEGIN
  IF NOT COALESCE(public.okbm_is_admin(), false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO v_total FROM public.users;

  SELECT COALESCE(jsonb_object_agg(d, n), '{}'::jsonb) INTO v_by_day
  FROM (
    SELECT to_char((u.created_at::timestamptz AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS d, count(*) AS n
    FROM public.users u
    WHERE u.created_at IS NOT NULL
      AND (u.created_at::timestamptz AT TIME ZONE 'Asia/Seoul')::date >= v_from
    GROUP BY 1
  ) x;

  RETURN jsonb_build_object('total', v_total, 'by_day', v_by_day);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_admin_member_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_admin_member_stats(integer) TO authenticated;
