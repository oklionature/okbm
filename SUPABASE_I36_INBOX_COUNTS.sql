-- I36 검수함 네 칸 정리(대표님 11-27)
-- 1) 운영자 창(ops) '장소 검수 대기' 숫자에 GPX 대기(spot_gpx_submissions '검수대기')와 장비 요청 대기(gear_requests '검토중')를 더한다.
-- 2) 장비 요청 승인 점수(gear_req)는 제보·수정 건의·GPX처럼 '오늘 받은 점수'(하루 최대)에 넣지 않는다.
-- 지금 서버 함수 내용을 읽어 그 자리만 바꿔 다시 만든다. 여러 번 실행해도 결과가 같다.
-- 되돌리기: 아래 replace의 앞뒤를 바꿔 같은 방식으로 실행한다.
DO $$
DECLARE
  d text;
  v_old text := '''admin'', ''proposal'', ''correction'', ''gpx'')';
  v_new text := '''admin'', ''proposal'', ''correction'', ''gpx'', ''gear_req'')';
  v_anchor text := '  BEGIN' || chr(10) || '    SELECT count(*) INTO v_reports';
  v_add text := '  BEGIN' || chr(10) ||
    '    v_inbox := v_inbox + (SELECT count(*) FROM public.spot_gpx_submissions g WHERE g.status = ''검수대기'');' || chr(10) ||
    '  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;' || chr(10) ||
    '  END;' || chr(10) ||
    '  BEGIN' || chr(10) ||
    '    v_inbox := v_inbox + (SELECT count(*) FROM public.gear_requests r WHERE r.status = ''검토중'');' || chr(10) ||
    '  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;' || chr(10) ||
    '  END;' || chr(10);
BEGIN
  d := pg_get_functiondef('public.okbm_my_points'::regproc);
  IF position(v_new IN d) = 0 THEN
    IF position(v_old IN d) = 0 THEN RAISE EXCEPTION 'okbm_my_points: 바꿀 자리를 못 찾음'; END IF;
    EXECUTE replace(d, v_old, v_new);
  END IF;

  d := pg_get_functiondef('public.okbm_admin_points_overview'::regproc);
  IF position(v_new IN d) = 0 THEN
    IF position(v_old IN d) = 0 THEN RAISE EXCEPTION 'okbm_admin_points_overview: 바꿀 자리를 못 찾음'; END IF;
    EXECUTE replace(d, v_old, v_new);
  END IF;

  d := pg_get_functiondef('public.okbm_admin_activity'::regproc);
  IF position('public.gear_requests' IN d) = 0 THEN
    IF position(v_anchor IN d) = 0 THEN RAISE EXCEPTION 'okbm_admin_activity: 바꿀 자리를 못 찾음'; END IF;
    EXECUTE replace(d, v_anchor, v_add || v_anchor);
  END IF;
END $$;
