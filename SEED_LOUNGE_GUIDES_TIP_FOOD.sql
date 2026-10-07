-- 백패킹 팁: 쇼츠 「백패킹 가면 뭘 먹을까?」 (오라네의 낭만루트)
-- 출처: https://youtube.com/shorts/HiN4TCmfvE8
-- 본문은 영상 설명란을 옮긴 것. 맨 끝 줄 주소는 화면에서 쇼츠 재생기가 되고 글자로는 안 보인다.
-- 2026-10-07 운영 DB에 넣음.

BEGIN;

DELETE FROM public.lounge_guides WHERE kind = 'tip' AND title = '백패킹 가면 뭘 먹을까?';

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'tip',
  '백패킹 가면 뭘 먹을까?',
  '팁',
  $b$백패킹 하면 산 정상에서 음식을 해 먹는 장면이 먼저 떠오르지만, 우리나라 산에서는 화식이 모두 금지예요. 작은 불씨 하나가 산불로 번질 수 있어서 불 자체를 쓰면 안 돼요.

그래서 백패커들은 불로 요리하는 화식 대신 불 없이 먹는 비화식을 해요.

비화식은 이렇게 준비해요
- 발열 도시락: 물만 부으면 알아서 데워져요
- 발열팩과 발열용기: 라면이나 다른 음식을 불 없이 데울 수 있어요
- 마트 즉석식품: 매운 닭발, 편육, 초밥, 샌드위치처럼 바로 먹는 음식이면 충분해요

남은 음식과 국물은 모두 되가져와요. 절대 버리면 안 돼요.
https://youtube.com/shorts/HiN4TCmfvE8$b$,
  '[]'::jsonb,
  0,
  true
);

COMMIT;
