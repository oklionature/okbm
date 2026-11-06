-- H54 낭만매거진에 '낭만루트 만든 이유와 사용방법' 카드 등록 (2026-11-06, 대표님)
-- 홈 백패커 라운지 아래 매거진 줄에 카드 하나로 뜨고, 누르면 시트 안에 영상 썸네일이 나와 한 번 더 누르면 그 자리에서 재생된다.
-- 표지는 영상 썸네일(youtube hqdefault). 본문 마지막 줄의 유튜브 주소는 lounge.js openNews에서 큰 썸네일로 자동 변환된다.
-- 여러 번 실행해도 안 겹치게 제목으로 선 삭제 후 다시 넣음.

DELETE FROM public.lounge_news
 WHERE kind = 'magazine'
   AND title = '낭만루트 만든 이유와 사용방법';

INSERT INTO public.lounge_news (kind, title, body, images, sort, is_active)
VALUES (
  'magazine',
  '낭만루트 만든 이유와 사용방법',
  E'낭만루트를 만든 이유와\n사용방법을\n자세히 확인해 보세요.\n\nhttps://youtu.be/B2ZgFTrZOyo',
  '["https://i.ytimg.com/vi/B2ZgFTrZOyo/hqdefault.jpg"]'::jsonb,
  -100,
  true
);

-- 확인
SELECT id, kind, title, is_active, sort, created_at
  FROM public.lounge_news
 WHERE kind = 'magazine'
 ORDER BY sort ASC, created_at DESC;
