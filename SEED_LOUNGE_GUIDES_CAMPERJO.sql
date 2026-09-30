-- 백패커 라운지 초보 가이드
-- 캠퍼조이 https://youtu.be/9TPkBxnQuqQ
-- 장비 이름은 영상 설명의 목록이다. 설명에 없는 2.5P, 4P, 라이트닝 45, 라이너, 핫팩만 말에서 더했다.
-- 한 카드에 장비 30개가 한계라 텐트·배낭·잠자리 / 캠프 / 조리 세 장으로 나눈다.
-- 가격·무게는 영상에서 말한 것만. 골제로 53,000원. 레딕스 약 1.7kg. 플래닛 1.1kg. 프리즘 750g. 래티튜드 1.5kg.
-- 구매 주소는 설명에 있는 쿠팡 링크만.
-- 본문 맨 끝 주소는 화면에서 글자로 보이지 않는다.
--
-- 아직 운영 DB에는 실행하지 않은 초안이다.
-- 다시 실행하면 아래 제목을 지우고 같은 내용으로 다시 넣는다.

BEGIN;

DELETE FROM public.lounge_guides
WHERE title IN (
  '처음이면 어떤 영상을 보면 좋아요?',
  '혼자 첫 박',
  '같이 갈 때',
  '영상 속 다른 모델은 언제 보나요?',
  '캠퍼 조의 첫 박',
  '캠퍼조이의 첫 박',
  '캠퍼조이의 첫 백패킹',
  '같이 앉을 때',
  '겨울에는 뭘 더 챙기나요?',
  '겨울 바로쿡은 따뜻한 물과 함께',
  '데크 팩은 판 사이에 넣으세요',
  '배낭은 이렇게 고르세요',
  '불 없는 날은 따뜻한 물을 챙기세요',
  '조명은 두 개면 됩니다',
  '혼자 가면 작은 테이블이면 됩니다',
  '물, 쓰레기, 구급은 기본입니다',
  '폴과 타프는 나중에 사도 됩니다',
  '캠퍼조이의 캠프 장비',
  '캠퍼조이의 조리 장비',
  '배낭 세 가지',
  '비화식은 따뜻한 물로 쓰세요',
  '혼자 다닐 때는 미니 테이블만 듭니다',
  '데크 간격이 좁으면 판 사이에',
  '보냉파우치와 물통',
  '폴과 실타프는 추가입니다'
);

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES
(
  'kit',
  '캠퍼조이의 첫 백패킹',
  '텐트·배낭·잠자리',
  $k1$캠퍼조이 렌탈 장비입니다. 오래 쓴 것과 많이 나가는 것을 모아 두었습니다.

처음 텐트는 재너두 2 DAC 익스패디션이 비바람에 편합니다. 노란 코오롱 에어로라이트 2도 있습니다. 두 명이면 재너두 2.5P, 여럿이면 4P가 나갑니다.
https://youtu.be/9TPkBxnQuqQ$k1$,
  $j1$[
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 2 DAC 익스패디션","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcrcf"},
    {"gear_id":"","category_id":"shelter","name":"코오롱 에어로라이트 2","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 2.5P","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 4P","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"pack","name":"미스테리랜치 레딕스 57","weight_g":1700,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"pack","name":"그라나이트기어 블레이즈 60","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcsnp"},
    {"gear_id":"","category_id":"pack","name":"그라나이트기어 블레이즈 60 여성용","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcrRn"},
    {"gear_id":"","category_id":"pack","name":"엑스패드 라이트닝 60","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"pack","name":"엑스패드 라이트닝 45","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"반고 플래닛 100","weight_g":1100,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"제알기어 프리즘 200","weight_g":750,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcsWN"},
    {"gear_id":"","category_id":"sleep","name":"반고 래티튜드 프로 200","weight_g":1500,"price_krw":0,"link_url":"https://link.coupang.com/a/cActar"},
    {"gear_id":"","category_id":"sleep","name":"꼴로르 스탠다드 850","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"침낭 라이너","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"핫팩 150g","weight_g":150,"price_krw":0,"link_url":""},
    {"gear_id":"gear_2360","category_id":"sleep","name":"니모 스위치백 레귤러","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cActn0"},
    {"gear_id":"","category_id":"sleep","name":"니모 올시즌 롱보우 롱와이드","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cActK5"}
  ]$j1$::jsonb,
  0,
  true
),
(
  'kit',
  '캠퍼조이의 캠프 장비',
  '의자·조명·물',
  $k2$같은 영상의 의자, 테이블, 랜턴, 물통입니다.
https://youtu.be/9TPkBxnQuqQ$k2$,
  $j2$[
    {"gear_id":"","category_id":"camp","name":"헬리녹스 체어제로","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAct0O"},
    {"gear_id":"","category_id":"camp","name":"라이프스포츠 울트라 테이블 테트라","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcunQ"},
    {"gear_id":"","category_id":"camp","name":"케스캐이드 와일드 울트라 라이트 테이블","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"electronics","name":"골제로 마이크로 플래쉬","weight_g":0,"price_krw":53000,"link_url":"https://link.coupang.com/a/cAcu3P"},
    {"gear_id":"","category_id":"electronics","name":"나이트코어 NU25UL","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcvAq"},
    {"gear_id":"gear_2757","category_id":"electronics","name":"크레모아 헤디2","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"electronics","name":"엠펙스 써모맥스 50","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcwlG"},
    {"gear_id":"","category_id":"electronics","name":"알리 라이트 스탠드","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcwJ5"},
    {"gear_id":"","category_id":"camp","name":"빅스카이 인터내셔널 보냉 파우치 라지","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"날진 1L","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcw8d"}
  ]$j2$::jsonb,
  1,
  true
),
(
  'kit',
  '캠퍼조이의 조리 장비',
  '불·팩·타프',
  $k3$같은 영상의 조리도구, 팩, 폴, 타프입니다.
https://youtu.be/9TPkBxnQuqQ$k3$,
  $j3$[
    {"gear_id":"","category_id":"camp","name":"바로쿡 850","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcxj4"},
    {"gear_id":"","category_id":"camp","name":"클렘 반합 세트","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcxtl"},
    {"gear_id":"","category_id":"camp","name":"소토 ST-340","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"스노우피크 티탄시에라컵","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAczEP"},
    {"gear_id":"","category_id":"camp","name":"스노우피크 티탄머그","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcyYT"},
    {"gear_id":"","category_id":"camp","name":"오피넬 클래식 8","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcAJe"},
    {"gear_id":"","category_id":"camp","name":"카이지루시 가위","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcA0Y"},
    {"gear_id":"","category_id":"camp","name":"AMG 티타늄 집게","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcBfJ"},
    {"gear_id":"","category_id":"camp","name":"씨투써밋 퍼스트 에이드 드라이백 1L","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcBnJ"},
    {"gear_id":"","category_id":"camp","name":"수사 망치 MH-1","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcB83"},
    {"gear_id":"","category_id":"camp","name":"쏘울트레커 데크팩","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"쏘울트레커 나사팩","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"어썸홀리데이 클린백","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"블랙다이아몬드 트레일백","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcCEk"},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 실타프 3 사각","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcCTP"},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 업라이트 폴 180","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcC4R"}
  ]$j3$::jsonb,
  2,
  true
),
(
  'tip',
  '겨울에는 뭘 더 챙기나요?',
  '팁',
  $t1$핫팩을 두 장 챙기세요. 발에 하나, 가슴에 하나입니다. 150g에 18시간이라고 적힌 것이면, 열 시간은 갑니다.

침낭을 제일 비싼 것으로 사지 마세요. 그 돈은 우모복에 쓰세요. 텐트 안에서 밥을 먹을 때도 춥습니다. 침낭과 우모복은 체온을 지키고, 열은 핫팩이 냅니다.

여름은 반고 플래닛 100입니다. 컴포트는 약 8도, 무게는 1.1kg입니다. 제알기어 프리즘 200은 컴포트 약 9도, 750g입니다. 둘 다 솜입니다.
봄가을은 반고 래티튜드 프로 200입니다. 컴포트는 약 2도, 무게는 1.5kg입니다.
겨울은 꼴로르 스탠다드 850에 라이너를 넣습니다.

평소 매트는 니모 스위치백 레귤러입니다. 겨울 옵션은 니모 올시즌 롱보우 롱와이드이고, R값은 5.6입니다.
겨울에는 엠펙스 써모맥스 50으로 기온을 보세요.$t1$,
  '[]'::jsonb,
  0,
  true
),
(
  'tip',
  '배낭 세 가지',
  '팁',
  $t2$엑스패드 라이트닝 60이 제일 가볍습니다. 앞주머니는 없고, 가벼운 옷은 플래시백에 넣습니다.
그라나이트기어 블레이즈 60은 겉주머니와 옆주머니가 크고, 등판이 떠 있습니다. 몸통이 짧으면 여성용이 있습니다.
미스테리랜치 레딕스 57은 약 1.7kg으로 셋 중 제일 무겁습니다. 원단이 튼튼하고, 허리벨트에 주머니가 있으며, 몸통 길이를 조절합니다.
두 명이 가면 라이트닝 45가 하나 더 나갑니다.$t2$,
  '[]'::jsonb,
  1,
  true
),
(
  'tip',
  '비화식은 따뜻한 물로 쓰세요',
  '주의점',
  $t3$비화식은 바로쿡 850입니다. 라면 하나에는 그 하나로 됩니다. 발열팩은 두 장입니다.
겨울에는 따뜻한 물을 보냉병에 챙기세요. 물이 차가우면 발열팩이 잘 안 붙습니다.
화식이 되는 곳은 클렘 반합 세트와 소토 ST-340이 나갑니다.$t3$,
  '[]'::jsonb,
  2,
  true
),
(
  'tip',
  '혼자 다닐 때는 미니 테이블만 듭니다',
  '팁',
  $t4$헬리녹스 체어제로와 울트라 테이블 테트라는 여러 명이 앉을 때 높이가 맞습니다.
혼자 다닐 때는 그 둘을 두지 않고, 케스캐이드 와일드 울트라 라이트 테이블만 둡니다. 텐트 안에서도 씁니다.$t4$,
  '[]'::jsonb,
  3,
  true
),
(
  'tip',
  '데크 간격이 좁으면 판 사이에',
  '기본상식',
  $t5$데크에 팩을 박으면 힘들게 들어갑니다. 간격이 좁으면 쏘울트레커 나사팩을 판과 판 사이에 넣으세요. 잘 들어가고 잘 빠지지 않습니다.$t5$,
  '[]'::jsonb,
  4,
  true
),
(
  'tip',
  '보냉파우치와 물통',
  '기본상식',
  $t6$빅스카이 보냉 파우치 라지는 가볍고 넓습니다. 도시락이 들어갑니다. 보냉과 내구는 약하고, 쓰면 접어 가져옵니다.
날진 1L는 튼튼해서 하나 두면 오래 씁니다.
어썸홀리데이 클린백 안에는 비닐을 넣어, 국물이 새지 않게 가져오세요.$t6$,
  '[]'::jsonb,
  5,
  true
),
(
  'tip',
  '폴과 실타프는 추가입니다',
  '팁',
  $t7$블랙다이아몬드 트레일백, 백컨트리 실타프 3 사각, 업라이트 폴 180은 추가 옵션입니다.
이 목록만으로 백패킹을 나갈 수 있습니다. 맞는지 모르겠으면 한 번 빌려 보고 사세요.$t7$,
  '[]'::jsonb,
  6,
  true
);

COMMIT;
