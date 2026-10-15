-- 백패킹 팁: 쇼츠 「산에서 제대로 똥 싸는 법.」 (오라네의 낭만루트)
-- 출처: https://youtube.com/shorts/rRtzM9yEBZQ
-- 본문은 영상 설명란과 자막을 옮긴 것. 맨 끝 줄 주소는 화면에서 쇼츠 재생기가 되고 글자로는 안 보인다.
-- 2026-10-08 운영 DB에 넣음.

BEGIN;

DELETE FROM public.lounge_guides WHERE kind = 'tip' AND title = '산에서 제대로 똥 싸는 법';

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'tip',
  '산에서 제대로 똥 싸는 법',
  '기본상식',
  $b$산에는 화장실이 없어서 미리 준비하는 게 답이에요.

화장실 준비
- 음식은 적당히: 산에서는 과식하지 않기
- 출발 전 미리 비우기: 올라가기 전에 해결하고 가기
- 일회용 소변봉투: 응고제가 들어 있어 소변이 굳어요
- 큰일은 정 급할 때만: 땅을 깊게 파고 본 뒤 흙으로 덮기
- 쓴 휴지는 챙겨 오기: 절대 두고 오지 않기

아니 온 듯 다녀가기
백패커들 사이엔 '아니 온 듯 다녀가라'라는 말이 있어요. 흔적을 남기지 않는다는 뜻으로 LNT라고 불러요. 쓰레기는 물론 음식물과 국물까지 전부 들고 내려오고, 귤껍질 하나도 그냥 버리면 안 돼요. 음식 냄새를 맡은 야생동물이 내려오고, 사람 음식에 길들면 먹이 찾는 힘이 약해져요.

꽃 한 송이, 돌멩이 하나도 가져오지 않아요. 자연 곁에서 감사히 쉬고, 흔적은 남기지 않기.
https://youtube.com/shorts/rRtzM9yEBZQ$b$,
  '[]'::jsonb,
  0,
  true
);

COMMIT;
