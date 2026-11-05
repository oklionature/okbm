-- H42. 장비 할인도 행사처럼 홈 상단 고정 (대표님 11-05)
-- 고정한 할인은 홈 두 칸과 장비 세일 소식 탭에서 맨 위에 선다. 쓰기 권한은 기존 관리자 정책 그대로.
ALTER TABLE public.lounge_deals ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

SELECT count(*) AS deals, count(*) FILTER (WHERE is_pinned) AS pinned FROM public.lounge_deals;
