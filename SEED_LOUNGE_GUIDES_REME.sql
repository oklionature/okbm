-- 백패커 라운지 입문 장비: camper reme https://youtu.be/p08x3cRpiKI
-- 영상 하나 = 게시물 하나. 제목은 유튜브 제목, note는 채널 이름.
-- 장비 이름은 영상 설명 목록 표기. 배낭 야마토미치 미니2는 설명에 리스트 제외라 장비 줄에 없다.
-- 다이소쿡 링크는 설명의 https://youtu.be/5w4qc9xYfmA. 2026-09-30 링크를 설명 목록으로 맞췄다.
-- 무게는 제조사 페이지에 적힌 것만. 란샨 1은 팩 포함 920g, CW280은 570g, 미니2는 사이즈별로 달라 비움.
-- 가격은 2026-09-30에 원화 판매 페이지에서 확인한 것만. 확인된 원화 금액이 없어 비움.
-- 아직 DB에 넣지 않은 초안.

BEGIN;

DELETE FROM public.lounge_guides
WHERE title IN (
  '2년 동안 사용한 가성비 경량 백패킹 세팅 다 말씀드립니다 (feat 장비는 거들 뿐)'
);

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'kit',
  '2년 동안 사용한 가성비 경량 백패킹 세팅 다 말씀드립니다 (feat 장비는 거들 뿐)',
  'camper reme',
  $b$처음 경량을 맞출 때 제일 아까운 건, 싸게 사서 곧 다시 사는 돈이에요. 이 세팅은 배낭을 빼고 64만 원 정도, 4.1kg예요. 다른 짐이 무거우면 잠자리와 집부터 줄이세요. 돈을 더 쓰면 무게가 내려가고, 돈을 아끼면 무게가 다시 올라와요.

텐트
1인용은 3F UL GEAR Lanshan 1로 시작하세요. 설치가 아주 쉽진 않고 거주성도 떨어지지만, 1kg 아래로 값을 보면 이만한 게 없어요. 엑스돔은 60만 원대, 이 텐트는 14만 원대, 다이니마로 가면 100만 원이 넘어요. 텐트는 취향 차이가 크니 1kg 아래에서 고르면 돼요. 폴이 없는 텐트라 하이킹 폴로 세워요.

배낭
금액에는 배낭이 빠져 있어요. 싸다고 집으면 옆이 터지는 경우가 많아요. 야마토미치 미니2는 어깨로 지는 초경량이고, 살 때 30만 원 중후반이었어요. 경량 배낭은 보통 1kg 아래를 말해요. 그 아래에서 눈에 드는 걸 고르되, 배낭은 조금 투자하세요. 의자까지 넣으면 등판과 허리벨트가 있는 배낭이 나아요.

매트
Promonte PMT135를 두세요. 잠자리가 예민하면 숏 매트는 불편해요. 그래도 무게를 줄이려면 숏이 유리해요. 서머레스트 지라이트 솔 410g보다 가볍게, 400g 아래로 고르면 돼요. 니모나 조르 숏이 구하기 쉬우면 그걸로 가도 되고, 더 싸게 가려면 프로몬테예요.

침낭
네이처하이크 CW280을 쓰세요. 10만 원 안쪽, 570g으로 봄가을에 충분하고 아주 추운 날에는 부족할 수 있어요. 여름에 침낭을 빼는 사람은 라이너를 쓰기도 하는데, 포근한 쪽을 원하면 침낭을 그대로 두세요. 500g대에 충전 280g 근처면 3계절에 맞아요.

베개
베개는 빼지 마세요. 옷을 말아 베도 되지만, 잠자리가 예민하면 베개가 나아요. 국내에서 사기 쉬운 데카트론 백패킹 베개 MT500 v2를 두세요.

테이블
단프라로 가세요. 슬로우아웃도어 초경량 백패킹 테이블이 값이고, 직접 쓰는 판은 케스케이드 와일드 단프라예요. 판이 더 탄탄한 쪽을 원하면 케스케이드를 고르세요. 베르네 트래킹 패드는 230g, 단프라는 70g이에요. 여기서 더 무거운 테이블로 가면 경량에서 멀어져요.

방석
의자는 빼고 방석에 앉아요. 알리 발포방석은 6,000원대라 가볍지만, 살이 없으면 엉덩이가 아파요. 그러면 쿠션이 있는 방석으로 바꾸세요.

의자
혼자 갈 때는 의자를 두지 마세요. 나만 바닥에 앉기 멋쩍으면 접이식 의자를 하나 둘 수 있어요. 만 원대인데 오래 앉으면 아파요. 돈을 쓸 거면 헬리녹스 체어원으로 가세요.

랜턴
텐트 불은 짭제로 (블랙독)으로 시작하세요. 만 원대이고 아직 쓸 만해요. 오래 쓸 거면 골제로가 손이 가요. 불이 없으면 잠이 안 오는 사람은 약한 불로 켜 두면 밤새 가요. 헤드랜턴과 텐트 랜턴, 두 개를 챙기세요.

음식
비화식은 다이소쿡이면 돼요. 바로쿡보다 훨씬 싸고, 편의점 음식을 봉투째 데워 먹어도 돼요.

조리
화식 프라이팬은 티에라 프라이팬을 쓰세요. 제트보일 라면팬과 같은 쪽에서 나오고 더 싸요. 뚜껑이 있어요. 불은 캠핑문 XD-2F로 두세요. 무게는 조금 더 나가도 값이 제일 낮아요.

컵
컵은 스노우라인 티타늄 시에라컵 300ml를 두세요. 이게 없으면 벨락 티타늄 컵으로 바꿔도 돼요.

수저
수저는 티타늄 수저세트를 쓰세요. 만 원 안쪽이에요.

헤드랜턴
야간에 걷거나 길을 잃으면 헤드랜턴이 필요해요. NITECORE NU25 UL이면 가성비로 충분하고, 더 좋은 걸 사도 보조로 남아요.

폴
비자립 텐트는 폴로 세워요. 산에서는 폴이 필수예요. 원더와이드가 써 본 것 중 싼 쪽이에요. 오래 쓸 거면 레키나 블랙다이아몬드를 사세요. 가성비로 맞출 때는 원더와이드면 돼요.

보냉백
여름에는 보냉백을 챙기세요. 커스터브 보냉백이 가볍고 싸요.

물통
에버뉴 워터 캐리 900ml를 두세요. 작게 접히고, 900ml 하나와 얼린 작은 물통을 같이 가면 돼요. 물을 많이 마시면 900ml를 두 개 챙기세요.

이 목록이 정답은 아니에요. 내가 만족하면 그 장비가 제일 좋은 거예요. 경량은 불편한 백패킹을 한 번 더 불편하게 만드는 쪽이에요. 바닥에 앉는 걸 감수할 수 있으면 이렇게 가고, 스트레스면 억지로 하지 마세요.
---
camper reme. 레가 직접 메고 자는 경량 세팅을 보여 주는 채널이에요. 이 편은 2년 쓴 가성비 세팅을, 배낭 값은 빼고 풀어 둔 편이에요.
https://youtu.be/p08x3cRpiKI$b$,
  $j$
[
    {
        "gear_id": "",
        "category_id": "shelter",
        "name": "3F UL GEAR Lanshan 1",
        "about": "폴로 세우는 1인용. 본체 775g, 팩 포함 920g.",
        "weight_g": 920,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c2waQZFB"
    },
    {
        "gear_id": "",
        "category_id": "sleep",
        "name": "Promonte PMT135",
        "about": "숏 길이 매트. 400g 아래로 맞출 때 쓰는 쪽.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://amzn.to/4ipRVkW"
    },
    {
        "gear_id": "",
        "category_id": "sleep",
        "name": "네이처하이크 CW280",
        "about": "충전 280g 덕다운. 봄가을에 쓰는 침낭.",
        "weight_g": 570,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c4qelEIp"
    },
    {
        "gear_id": "",
        "category_id": "sleep",
        "name": "데카트론 백패킹 베개 MT500 v2",
        "about": "국내에서 사기 쉬운 가벼운 백패킹 베개.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://link.coupang.com/a/c860hT"
    },
    {
        "gear_id": "",
        "category_id": "camp",
        "name": "슬로우아웃도어 초경량 백패킹 테이블",
        "about": "단프라 초경량 테이블. 판이 약하면 케스케이드로.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://bit.ly/48qDsAT"
    },
    {
        "gear_id": "",
        "category_id": "camp",
        "name": "알리 발포방석",
        "about": "바닥에 앉을 때 까는 얇은 방석. 쿠션은 적어요.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c3kA9e77"
    },
    {
        "gear_id": "",
        "category_id": "camp",
        "name": "접이식 의자",
        "about": "무게를 더 줄일 때의 접이식 의자. 오래 앉으면 아파요.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c36MvY2h"
    },
    {
        "gear_id": "",
        "category_id": "electronics",
        "name": "짭제로 (블랙독)",
        "about": "골제로를 줄인 텐트용 랜턴.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c3gBfYCl"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "다이소쿡",
        "about": "비화식 용기. 봉투 음식을 데울 때 써요.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://youtu.be/5w4qc9xYfmA"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "티에라 프라이팬",
        "about": "뚜껑 있는 백패킹 프라이팬. 라면팬보다 싼 쪽.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://naver.me/xslvQByG"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "캠핑문 XD-2F",
        "about": "화식용 가스 스토브. 값은 낮고 무게는 조금 더 나가요.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c3wwK1l7"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "스노우라인 티타늄 시에라컵 300ml",
        "about": "300ml 티타늄 시에라컵. 없으면 벨락으로.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://link.coupang.com/a/c864Lu"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "티타늄 수저세트",
        "about": "젓가락까지 있는 티타늄 수저.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c383GApf"
    },
    {
        "gear_id": "",
        "category_id": "electronics",
        "name": "NITECORE NU25 UL",
        "about": "야간 이동용 헤드랜턴. 더 좋은 걸 사도 보조로 남아요.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://s.click.aliexpress.com/e/_c4BYbysl"
    },
    {
        "gear_id": "",
        "category_id": "other",
        "name": "원더와이드",
        "about": "산행과 비자립 텐트에 쓰는 하이킹 폴.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://bit.ly/49NpR98"
    },
    {
        "gear_id": "",
        "category_id": "camp",
        "name": "커스터브 보냉백",
        "about": "여름에 음식 온도를 지키는 가벼운 보냉백.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://link.coupang.com/a/c86577"
    },
    {
        "gear_id": "",
        "category_id": "kitchen",
        "name": "에버뉴 워터 캐리 900ml",
        "about": "접히는 900ml 물통. 하나와 얼린 작은 통을 같이.",
        "weight_g": 0,
        "price_krw": 0,
        "link_url": "https://link.coupang.com/a/c866oF"
    }
]
$j$::jsonb,
  0,
  true
);

COMMIT;
