-- H28: 라운지 소식·매거진 (2026-10-31)
-- 왜: 홈 백패커 라운지 맨 위에 박지 통제·낭만루트 업데이트·공지 한 줄 띠를, 아래에 카드뉴스 매거진 줄을 둔다(대표님).
-- 어떻게: 운영팀만 올리는 표 lounge_news 하나에 둘 다 담는다.
--   · kind: closure(박지 통제) · update(업데이트) · notice(공지) → 소식 띠. magazine → 매거진 줄.
--   · title(1~80자), body(펼치면 보이는 글, 첫 줄은 띠 아래 한 줄), link_url(https), images(https 사진 주소 배열, 10장까지).
--     매거진은 images[0]이 표지, 나머지가 넘겨 보는 장. 소식은 사진 없이도 된다.
--   · is_active(보이기)·sort(작을수록 앞)·created_at. 권한은 lounge_deals와 같다: 누구나 보이는 것만 읽고, 쓰기는 관리자.
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: DROP TABLE public.lounge_news;

CREATE TABLE IF NOT EXISTS public.lounge_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('closure', 'update', 'notice', 'magazine')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 3000),
  link_url text NOT NULL DEFAULT ''
    CHECK (link_url = '' OR (link_url ~ '^https://' AND link_url !~ '[[:space:]<>"'']')),
  images jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 10),
  sort integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_news_list_idx ON public.lounge_news (kind, sort, created_at DESC) WHERE is_active;

-- 사진 주소는 https 문자열만
CREATE OR REPLACE FUNCTION public.okbm_lounge_news_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.images, '[]'::jsonb)) AS e(v)
    WHERE jsonb_typeof(e.v) <> 'string'
       OR (e.v #>> '{}') !~ '^https://'
       OR (e.v #>> '{}') ~ '[[:space:]<>"'']'
  ) THEN
    RAISE EXCEPTION 'invalid_photos' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_news_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_lounge_news_guard ON public.lounge_news;
CREATE TRIGGER trg_lounge_news_guard
  BEFORE INSERT OR UPDATE ON public.lounge_news
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_news_guard();

ALTER TABLE public.lounge_news ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lounge_news FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lounge_news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lounge_news TO authenticated;

DROP POLICY IF EXISTS lounge_news_select ON public.lounge_news;
CREATE POLICY lounge_news_select ON public.lounge_news
  FOR SELECT USING (is_active OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_news_admin_write ON public.lounge_news;
CREATE POLICY lounge_news_admin_write ON public.lounge_news
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

NOTIFY pgrst, 'reload schema';

SELECT count(*) AS news FROM public.lounge_news;
