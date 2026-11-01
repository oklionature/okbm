-- H30 수정 건의 근거 링크·사진 (2026-11-01, 대표님: 수정 건의가 글로만 와서 확인하기 어려움)
-- 수정 건의 창에 근거 링크(최대 5개)와 근거 사진(최대 3장, R2)을 받는다. 둘 다 없어도 접수된다.
-- 클라이언트: map-main.js 수정 건의 근거 블록, romantic-sync.js saveProposalToSupabase.

ALTER TABLE public.spot_corrections ADD COLUMN IF NOT EXISTS evidence_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.spot_corrections ADD COLUMN IF NOT EXISTS evidence_photos text[] NOT NULL DEFAULT '{}';

-- 개수와 주소 모양만 막는다(링크는 http(s), 사진은 R2 공개 주소). CHECK 안에는 하위 질의를 못 써서 함수로 뺀다
CREATE OR REPLACE FUNCTION public.okbm_all_match(arr text[], pattern text, max_len int)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(bool_and(u ~ pattern AND length(u) <= max_len), true) FROM unnest(arr) u
$$;

ALTER TABLE public.spot_corrections DROP CONSTRAINT IF EXISTS spot_corrections_evidence_urls_chk;
ALTER TABLE public.spot_corrections ADD CONSTRAINT spot_corrections_evidence_urls_chk CHECK (
  cardinality(evidence_urls) <= 5
  AND public.okbm_all_match(evidence_urls, '^https?://[^\s<>"''\\]+$', 1000)
);
ALTER TABLE public.spot_corrections DROP CONSTRAINT IF EXISTS spot_corrections_evidence_photos_chk;
ALTER TABLE public.spot_corrections ADD CONSTRAINT spot_corrections_evidence_photos_chk CHECK (
  cardinality(evidence_photos) <= 3
  AND public.okbm_all_match(evidence_photos, '^https://pub-13ec7c39d2394ecc879bb2ed4b86a43c\.r2\.dev/[A-Za-z0-9._/-]+$', 500)
);

NOTIFY pgrst, 'reload schema';
