-- =========================================================================
-- H18: 행사 신청 일시 + 할인 시작·끝 시간 (2026-10-28)
--
-- 왜: 행사는 몇 달 전에 신청을 받는데 표에는 행사 날짜만 있어서, 신청이 내일 열려도 목록 아래에 묻혔다.
--     할인도 날짜만 있어 "오전 10시 오픈" 같은 시간을 보여 줄 수 없었다.
-- 어떻게:
--   1) lounge_events.apply_open_at / apply_close_at: 신청 시작·마감 일시(둘 다 비워 둘 수 있음).
--      화면(lounge.js)은 신청 시작 7일 전부터 마감까지 행사를 목록 맨 위에 올리고,
--      "10월 30일(목) 오후 2시 신청 오픈 · D-2"처럼 크게 보여 준다. 마감이 지나면 행사 날짜순 제자리로 내려간다.
--      마감을 비우면 행사 시작일 0시(=전날 밤)까지 신청받는 것으로 본다.
--   2) lounge_deals.start_time / end_time: 할인 시작·끝 시간(비우면 그날 0시부터 / 그날 밤까지).
--      시작 7일 전부터 "곧 오픈" 할인을 진행중 할인보다 위에 올린다.
-- 권한: 칸만 더한다. 기존 RLS(lounge_*_admin_write, 공개 조회)를 그대로 따른다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기:
--   ALTER TABLE public.lounge_events DROP COLUMN IF EXISTS apply_open_at, DROP COLUMN IF EXISTS apply_close_at;
--   ALTER TABLE public.lounge_deals DROP COLUMN IF EXISTS start_time, DROP COLUMN IF EXISTS end_time;
-- =========================================================================

ALTER TABLE public.lounge_events ADD COLUMN IF NOT EXISTS apply_open_at timestamptz;
ALTER TABLE public.lounge_events ADD COLUMN IF NOT EXISTS apply_close_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lounge_events_apply_chk') THEN
    ALTER TABLE public.lounge_events
      ADD CONSTRAINT lounge_events_apply_chk
      CHECK (apply_open_at IS NULL OR apply_close_at IS NULL OR apply_close_at > apply_open_at);
  END IF;
END $$;

ALTER TABLE public.lounge_deals ADD COLUMN IF NOT EXISTS start_time time;
ALTER TABLE public.lounge_deals ADD COLUMN IF NOT EXISTS end_time time;

NOTIFY pgrst, 'reload schema';

-- 확인: 칸 4개가 생겼는지 (4가 나와야 한다)
SELECT count(*) AS new_cols FROM information_schema.columns
  WHERE table_schema = 'public'
    AND ((table_name = 'lounge_events' AND column_name IN ('apply_open_at', 'apply_close_at'))
      OR (table_name = 'lounge_deals' AND column_name IN ('start_time', 'end_time')));
