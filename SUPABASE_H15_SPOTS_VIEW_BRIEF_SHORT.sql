-- =========================================================================
-- H15: 박지 목록용 짧은 소개(view_brief_short) (2026-10-25)
--
-- 왜: 지도·홈이 받는 박지 목록(약 100KB) 중 소개 글(view_brief)이 67KB다. 목록에는 앞부분만 있으면 된다.
--     지도 목록 카드는 세 줄(약 80자)까지만 보이고, 정보창은 열 때 get_spot_detail로 전체 글을 따로 받는다.
-- 무엇: view_brief 앞 80자(넘치면 끝에 '…')를 자동으로 채우는 칸. view_brief가 바뀌면 같이 바뀐다.
--       원래 소개 글(desc_summary·view_brief)은 건드리지 않는다.
-- 화면: SPOTS_MAP_SELECT·SPOTS_GUEST_SELECT가 view_brief:view_brief_short로 이 칸을 받는다.
--       홈에서 소개를 전부 보여 주는 곳(영상 창·동행 공고·장소 미리보기)만 그 박지 하나의 view_brief를 따로 받는다.
-- 순서: 이 SQL을 먼저 실행하고 화면 코드를 올린다. 반대로 하면 없는 칸을 찾다가 지도에 박지가 안 뜬다.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기(화면 코드를 먼저 되돌린 뒤): ALTER TABLE public.spots DROP COLUMN IF EXISTS view_brief_short;
-- =========================================================================

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS view_brief_short text
GENERATED ALWAYS AS (
  CASE
    WHEN char_length(btrim(COALESCE(view_brief, ''), E' \n\r\t')) > 80
      THEN left(btrim(view_brief, E' \n\r\t'), 80) || '…'
    ELSE btrim(COALESCE(view_brief, ''), E' \n\r\t')
  END
) STORED;

-- spots는 칸마다 읽기 권한을 준다(H9). 회원·비회원 모두 읽는다.
GRANT SELECT (view_brief_short) ON public.spots TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- 확인: 박지 수와 짧은 소개의 평균·최대 길이. 최대가 81(80자 + '…') 이하면 된다.
SELECT count(*) AS spots,
       round(avg(char_length(view_brief_short))) AS avg_len,
       max(char_length(view_brief_short)) AS max_len
FROM public.spots;
