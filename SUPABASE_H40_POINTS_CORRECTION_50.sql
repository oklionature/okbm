-- H40 수정 건의 채택 점수 30 → 50 (2026-11-04, 대표님)
-- 앞으로 반영완료로 바뀌는 건부터 50점. 이미 받은 30점은 그대로 둔다.
-- 화면: romantic-points.js 받는 법 표(닉네임 바꾸기 안내도 300→500점, 아직 실제 차감은 없음).
CREATE OR REPLACE FUNCTION public.okbm_points_on_correction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.status, '') ~ '(반영완료|채택|승인)' AND COALESCE(OLD.status, '') !~ '(반영완료|채택|승인)' THEN
    PERFORM public.okbm_point_award(NEW.user_id, 'correction', NEW.id, 50, NULL);
  END IF;
  RETURN NULL;
END;
$$;
