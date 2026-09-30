-- 백패커 라운지 입문 장비: 캠퍼조이 https://youtu.be/9TPkBxnQuqQ
-- 영상 하나 = 게시물 하나. 제목은 유튜브 제목, note는 채널 이름.
-- body는 「본문 --- 채널 소개」, 맨 끝 주소는 화면에서 썸네일이 되고 글자로는 안 보인다.
-- 장비 이름은 영상 설명 목록과 진행자가 부른 표기. 2.5P, 4P, 라이트닝 45, 라이너, 핫팩은 말에서 더했다.
-- 가격과 구매 링크는 2026-09-30에 판매 페이지에서 확인한 것. 못 찾으면 비우고, 링크는 설명의 쿠팡 주소를 둔다.
-- 무게는 영상에서 말했거나 판매·제조사 페이지에 적힌 것만.
--
-- 2026-09-30 운영 DB에 넣었다. 다시 실행하면 아래 제목을 지우고 다시 넣는다.

BEGIN;

DELETE FROM public.lounge_guides
WHERE title IN (
  '초보 백패킹 장비 추천 / 초보지만 어디 가서 꿀리진 않아',
  '캠퍼조이의 첫 백패킹',
  '캠퍼조이의 캠프 장비',
  '캠퍼조이의 조리 장비',
  '겨울에는 뭘 더 챙기나요?',
  '배낭 세 가지',
  '비화식은 따뜻한 물로 쓰세요',
  '혼자 다닐 때는 미니 테이블만 듭니다',
  '데크 간격이 좁으면 판 사이에',
  '보냉파우치와 물통',
  '폴과 실타프는 추가입니다'
);

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'kit',
  '초보 백패킹 장비 추천 / 초보지만 어디 가서 꿀리진 않아',
  '캠핑 즐기는 남자 캠퍼조이',
  $b$처음 장비를 살 때 제일 아까운 건 두 번 사는 돈입니다. 캠퍼조이가 렌탈로 내보내는 장비는 본인이 오래 쓴 것과 많은 사람이 쓰는 것들이라, 이 목록대로 맞추면 중복 투자를 꽤 줄일 수 있습니다.

텐트
처음이면 백컨트리 재너두 2 DAC 익스패디션이 무난합니다. 노란 코오롱 에어로라이트 2도 찾는 사람이 많지만, 사계절 두루 쓰기엔 재너두 쪽이 낫습니다. 둘이 가면 재너두 2.5P, 가족 넷이면 4P가 있습니다.

배낭
가장 가벼운 건 엑스패드 라이트닝 60입니다. 프레임이 가운데 하나뿐이고 앞주머니가 없어 조금 불편한데, 플래시백을 달아 가벼운 옷을 넣으면 됩니다.
그라나이트기어 블레이즈 60은 캠퍼조이가 겨울에 주력으로 메던 배낭입니다. 60L에 비교적 가볍고, 앞·옆 주머니가 크고, 등판이 떠 있어 땀이 덜 찹니다. 몸통이 짧으면 여성용이 맞습니다.
미스테리랜치 레딕스 57은 셋 중 제일 무거운 약 1.7kg이지만 원단이 튼튼하고 착용감이 좋습니다. 허리벨트에 주머니가 있고 몸통 길이도 조절됩니다.
둘이 가면 라이트닝 45를 하나 더 챙깁니다.

침낭과 매트
여름은 솜 침낭이면 됩니다. 반고 플래닛 100은 컴포트 약 8도에 1.1kg, 제알기어 프리즘 200은 약 9도에 750g입니다. 봄가을은 반고 래티튜드 프로 200(컴포트 약 2도, 1.5kg)인데 부피가 좀 큽니다. 겨울은 꼴로르 스탠다드 850에 침낭 라이너를 넣습니다.
매트는 니모 스위치백 레귤러가 기본이고, 겨울엔 R값 5.6인 니모 올시즌 롱보우 롱와이드로 올립니다.

겨울 침낭은 이렇게 고르세요
「침낭에 돈 아끼지 마라」는 말은 맞습니다. 그래도 캠퍼조이는 침낭을 한 단계 낮추고 그 돈을 우모복에 쓰라고 합니다. 산에 가면 바로 침낭에 들어가지 않습니다. 텐트 치고 밥 먹고, 여럿이면 쉘터에서 한잔도 합니다. 그때 우모복이 없으면 정말 춥습니다.
핫팩은 꼭 챙기세요. 침낭과 우모복은 체온을 지킬 뿐 열을 내지 못합니다. 핫팩이 있고 없고는 하늘과 땅 차이입니다. 발에 하나, 가슴에 하나. 150g에 18시간이라고 적힌 제품이면 10시간은 충분히 갑니다.

의자와 테이블
헬리녹스 체어제로는 들고 가면 어디 가서 무시 안 당하는 의자입니다. 라이프스포츠 울트라 테이블 테트라는 많은 백패커가 써서, 여럿이 모이면 높이가 맞아 편합니다.
혼자 다닐 때는 의자와 큰 테이블 없이 케스캐이드 와일드 울트라 라이트 테이블 같은 작은 테이블 하나면 됩니다. 텐트 안에서도 씁니다.

불빛과 온도
골제로 마이크로 플래쉬는 가볍고 튼튼합니다. 직구나 구매대행, 할인 행사 때 사면 더 쌉니다.
헤드랜턴은 가벼운 나이트코어 NU25UL, 그리고 크레모아 헤디2입니다. 헤디2는 집중광과 확산광이 둘 다 나오고 걸 고리가 있어서, 랜턴이 하나뿐이면 텐트에 걸어 두고 밥 먹을 때 쓰면 됩니다.
겨울엔 엠펙스 써모맥스 50 같은 온도계로 기온을 보면서 지내세요. 랜턴 스탠드는 알리에서 산 1~2만 원대 제품으로, 만듦새보다 가볍고 싼 맛에 씁니다.

먹고 마시기
빅스카이 보냉 파우치 라지는 보냉력이 세진 않지만 가볍고 생각보다 넓어서 편의점 도시락이나 초밥이 들어갑니다. 다 쓰면 접어서 부피가 줄고, 내구성은 약한 편입니다.
날진 1L는 BPA 프리에 튼튼해서 하나 사 두면 언제든 씁니다.
불을 못 쓰는 곳은 비화식으로 바로쿡 850 하나면 혼자 라면 하나는 충분합니다. 겨울엔 따뜻한 물을 보온병에 담아 가세요. 물이 너무 차가우면 발열팩이 잘 작동하지 않습니다.
화식이 되는 곳이면 클렘 반합 세트와 소토 ST-340입니다. 식기는 스노우피크 티탄시에라컵과 티탄머그, 조리도구는 오피넬 클래식 8, 카이지루시 가위, AMG 티타늄 집게입니다. 카이지루시 가위는 날이 분리돼서 씻기 좋습니다.

팩과 정리
데크에 팩을 그냥 박으면 생각보다 힘듭니다. 쏘울트레커 나사팩을 판과 판 사이에 넣으면 잘 들어가고 잘 빠지지도 않습니다. 망치는 수사 MH-1 미니 망치입니다.
쓰레기는 어썸홀리데이 클린백에 담되, 안에 비닐을 한 번 더 넣어 국물이 새지 않게 싸 오세요. 구급 파우치는 씨투써밋 퍼스트 에이드 드라이백 1L에 밴드와 알코올솜 정도 넣으면 됩니다.
블랙다이아몬드 트레일백 스틱, 백컨트리 실타프 3, 업라이트 폴 180은 있으면 좋은 추가 장비입니다.

이 목록만으로 바로 백패킹을 나갈 수 있습니다. 나랑 맞는지 모르겠으면 한 번 빌려 써 보고 사도 늦지 않습니다.
---
캠핑 즐기는 남자 캠퍼조이. 백패킹 장비 렌탈을 직접 운영하면서, 렌탈 장비가 바뀌면 하나씩 꺼내 설명해 주는 채널입니다. 이 편은 장비를 새로 맞추는 초보가 참고하라고 렌탈 장비 전체를 다시 소개한 편입니다.
https://youtu.be/9TPkBxnQuqQ$b$,
  $j$[
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 2 DAC 익스패디션","about":"비바람에 강한 2인용 돔 텐트. 처음 사기 무난한 사계절용","weight_g":1590,"price_krw":580000,"link_url":"https://backcountry.co.kr/product/%EC%9E%AC%EB%84%88%EB%91%90-xanadu-2p-%EC%9D%B5%EC%8A%A4%ED%8C%A8%EB%94%94%EC%85%98/331/"},
    {"gear_id":"","category_id":"shelter","name":"코오롱 에어로라이트 2","about":"노란색으로 인기 많은 코오롱 2인용 경량 텐트","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 2.5P","about":"둘이 갈 때 쓰는 조금 더 넓은 재너두","weight_g":1400,"price_krw":640000,"link_url":"https://www.11st.co.kr/products/2551478461"},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 재너두 4P","about":"가족 넷이 들어가는 재너두 4인용","weight_g":3500,"price_krw":690000,"link_url":"https://backcountry.co.kr/product/%EC%9E%AC%EB%84%88%EB%91%90-xanadu-4p-%EC%9D%B5%EC%8A%A4%ED%8C%A8%EB%94%94%EC%85%98/275/"},
    {"gear_id":"","category_id":"pack","name":"엑스패드 라이트닝 60","about":"셋 중 가장 가벼운 60L 롤탑 배낭. 앞주머니는 없음","weight_g":1200,"price_krw":280000,"link_url":"https://exped.co.kr/product/%EB%9D%BC%EC%9D%B4%ED%8A%B8%EB%8B%9D-60/291/"},
    {"gear_id":"","category_id":"pack","name":"엑스패드 라이트닝 45","about":"둘이 갈 때 하나 더 챙기는 45L 배낭","weight_g":0,"price_krw":240000,"link_url":"https://ocamp.co.kr/product/%EC%97%91%EC%8A%A4%ED%8C%A8%EB%93%9C-%EB%9D%BC%EC%9D%B4%ED%8A%B8%EB%8B%9D-%EB%B0%B0%EB%82%AD-45lexpedex34b12/17228/"},
    {"gear_id":"","category_id":"pack","name":"그라나이트기어 블레이즈 60","about":"겉주머니와 옆주머니가 큰 60L 배낭. 등판이 떠서 땀이 덜 참","weight_g":1360,"price_krw":450000,"link_url":"https://www.rock8848.com/goods/goods_view.php?goodsNo=1000005293"},
    {"gear_id":"","category_id":"pack","name":"그라나이트기어 블레이즈 60 여성용","about":"몸통이 짧은 사람에게 맞춘 블레이즈 60","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcrRn"},
    {"gear_id":"","category_id":"pack","name":"미스테리랜치 레딕스 57","about":"원단이 튼튼하고 착용감 좋은 57L 배낭. 허리벨트 주머니 있음","weight_g":1700,"price_krw":377000,"link_url":"https://www.rock8848.com/goods/goods_view.php?goodsNo=1000016069"},
    {"gear_id":"","category_id":"sleep","name":"반고 플래닛 100","about":"여름용 솜 침낭. 컴포트 약 8도","weight_g":1100,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"제알기어 프리즘 200","about":"가벼운 여름용 솜 침낭. 컴포트 약 9도","weight_g":750,"price_krw":195200,"link_url":"https://mgear.kr/product/%EC%A0%9C%EC%9D%B4%EC%95%8C%EA%B8%B0%EC%96%B4-%ED%94%84%EB%A6%AC%EC%A6%98-200-%ED%94%84%EB%A6%AC%EB%A7%88%EB%A1%9C%ED%94%84%ED%8A%B8-%EC%97%90%EC%BD%94-%EC%B9%A8%EB%82%AD/644/"},
    {"gear_id":"","category_id":"sleep","name":"반고 래티튜드 프로 200","about":"봄가을용 솜 침낭. 컴포트 약 2도, 부피는 큰 편","weight_g":1500,"price_krw":96300,"link_url":"https://www.netpx.co.kr/app/product/detail/143467/0"},
    {"gear_id":"","category_id":"sleep","name":"꼴로르 스탠다드 850","about":"겨울용 구스다운 침낭. 라이너와 같이 씀","weight_g":0,"price_krw":328000,"link_url":"https://ccolore.com/product/%EC%8A%A4%ED%83%A0%EB%8B%A4%EB%93%9C-850-%EB%B8%94%EB%9E%99/166/"},
    {"gear_id":"","category_id":"sleep","name":"침낭 라이너","about":"침낭 안에 한 겹 더 넣어 보온을 올리는 속주머니","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"sleep","name":"핫팩 150g","about":"겨울엔 발과 가슴에 하나씩. 18시간 표기면 10시간은 감","weight_g":150,"price_krw":0,"link_url":""},
    {"gear_id":"gear_2360","category_id":"sleep","name":"니모 스위치백 레귤러","about":"접어서 펴는 발포 매트. 바람 넣을 일이 없어 편함","weight_g":0,"price_krw":55800,"link_url":"https://atozcamping.co.kr/product/%EB%8B%88%EB%AA%A8-%EC%8A%A4%EC%9C%84%EC%B9%98%EB%B0%B1-%EB%B0%B1%ED%8C%A8%ED%82%B9-%EB%B0%9C%ED%8F%AC%EB%A7%A4%ED%8A%B8/1202/"},
    {"gear_id":"","category_id":"sleep","name":"니모 올시즌 롱보우 롱와이드","about":"겨울용 넓은 에어매트(64x193cm). R값 5.6","weight_g":0,"price_krw":295200,"link_url":"https://www.kolonmall.com/Product/K1714457506848003BR01"},
    {"gear_id":"","category_id":"camp","name":"헬리녹스 체어제로","about":"500g대 초경량 접이식 의자","weight_g":510,"price_krw":125000,"link_url":"https://atozcamping.co.kr/product/%ED%97%AC%EB%A6%AC%EB%85%B9%EC%8A%A4-%EC%B2%B4%EC%96%B4%EC%A0%9C%EB%A1%9C/148/"},
    {"gear_id":"","category_id":"camp","name":"라이프스포츠 울트라 테이블 테트라","about":"상판 네 장을 끼우는 백패킹 테이블. 여럿이 모이면 높이가 맞음","weight_g":580,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcunQ"},
    {"gear_id":"","category_id":"camp","name":"케스캐이드 와일드 울트라 라이트 테이블","about":"배낭 옆주머니에 들어가는 작은 테이블. 혼자일 때와 텐트 안용","weight_g":0,"price_krw":22000,"link_url":"https://ocamp.co.kr/product/%EC%BA%90%EC%8A%A4%EC%BC%80%EC%9D%B4%EB%93%9C-%EC%99%80%EC%9D%BC%EB%93%9C-%EC%9A%B8%ED%8A%B8%EB%9D%BC-%EB%9D%BC%EC%9D%B4%ED%8A%B8-%ED%85%8C%EC%9D%B4%EB%B8%94-ver3-%EB%B0%B1%ED%8C%A8%ED%82%B9-%ED%85%8C%EC%9D%B4%EB%B8%94whitecascade-wildc5zj50000/10346/"},
    {"gear_id":"","category_id":"electronics","name":"골제로 마이크로 플래쉬","about":"손바닥만 한 충전식 랜턴. 최대 150루멘","weight_g":0,"price_krw":56000,"link_url":"https://goalzero.co.kr/product/%EA%B3%A8%EC%A0%9C%EB%A1%9C-%EB%9D%BC%EC%9D%B4%ED%8A%B8%ED%95%98%EC%9A%B0%EC%8A%A4-%EB%A7%88%EC%9D%B4%ED%81%AC%EB%A1%9C-%ED%94%8C%EB%9E%98%EC%89%AC-%EB%9E%9C%ED%84%B4-%EB%B8%94%EB%9E%99/14/"},
    {"gear_id":"","category_id":"electronics","name":"나이트코어 NU25UL","about":"50g이 안 되는 충전식 헤드랜턴. 400루멘","weight_g":47,"price_krw":51000,"link_url":"https://www.nitecore.co.kr/goods/goods_view.php?goodsNo=1000000053"},
    {"gear_id":"gear_2757","category_id":"electronics","name":"크레모아 헤디2","about":"집중광과 확산광이 되는 헤드랜턴. 고리로 걸어 랜턴처럼도 씀","weight_g":60,"price_krw":59000,"link_url":"https://ocamp.co.kr/product/%ED%81%AC%EB%A0%88%EB%AA%A8%EC%95%84-%ED%97%A4%EB%94%942usb-c%ED%83%80%EC%9E%85claymore/1388/"},
    {"gear_id":"","category_id":"electronics","name":"엠펙스 써모맥스 50","about":"배낭에 거는 작은 아날로그 온도계. 겨울에 기온 확인용","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcwlG"},
    {"gear_id":"","category_id":"electronics","name":"알리 라이트 스탠드","about":"안테나처럼 뽑아 쓰는 가벼운 랜턴 스탠드. 1~2만 원대","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcwJ5"},
    {"gear_id":"","category_id":"camp","name":"빅스카이 인터내셔널 보냉 파우치 라지","about":"도시락이 들어가는 납작한 보냉 파우치. 가볍고 접힘","weight_g":65,"price_krw":50000,"link_url":"https://ocamp.co.kr/category/%EB%B9%85%EC%8A%A4%EC%B9%B4%EC%9D%B4-big-sky/633/"},
    {"gear_id":"","category_id":"camp","name":"날진 1L","about":"튼튼한 BPA 프리 물통. 하나 사 두면 오래 씀","weight_g":178,"price_krw":18400,"link_url":"https://www.rock8848.com/goods/goods_view.php?goodsNo=1000009876"},
    {"gear_id":"","category_id":"kitchen","name":"바로쿡 850","about":"불 없이 발열팩으로 데우는 비화식 용기. 라면 하나 크기","weight_g":0,"price_krw":30000,"link_url":"https://m.gocamp.co.kr/goods/goods_view.php?goodsNo=186793064"},
    {"gear_id":"","category_id":"kitchen","name":"클렘 반합 세트","about":"사각 반합에 조리도구가 포개 들어가는 코펠 세트","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcxtl"},
    {"gear_id":"","category_id":"kitchen","name":"소토 ST-340","about":"추워도 불이 덜 약해지는 레귤레이터 부탄가스 버너","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"kitchen","name":"스노우피크 티탄시에라컵","about":"불에 바로 올려도 되는 310ml 티타늄 컵","weight_g":0,"price_krw":40600,"link_url":"https://www.ssg.com/item/itemView.ssg?itemId=1000655529196&salestrNo=6005&siteNo=7024"},
    {"gear_id":"","category_id":"kitchen","name":"스노우피크 티탄머그","about":"손잡이가 접히는 티타늄 머그","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcyYT"},
    {"gear_id":"","category_id":"kitchen","name":"오피넬 클래식 8","about":"나무 손잡이 접이식 칼. 날 길이 8.5cm","weight_g":0,"price_krw":18000,"link_url":"https://www.henckelkorea.com/goods/goods_view.php?goodsNo=1000008130"},
    {"gear_id":"","category_id":"kitchen","name":"카이지루시 가위","about":"날이 둘로 분리돼 씻기 쉬운 주방 가위","weight_g":0,"price_krw":0,"link_url":"https://link.coupang.com/a/cAcA0Y"},
    {"gear_id":"","category_id":"kitchen","name":"AMG 티타늄 집게","about":"가벼운 국산 티타늄 캠핑 집게. 20cm 기준 가격","weight_g":0,"price_krw":18000,"link_url":"https://www.allcoss.com/goods/goods_view.php?goodsNo=1000021134"},
    {"gear_id":"","category_id":"camp","name":"씨투써밋 퍼스트 에이드 드라이백 1L","about":"상비약을 물기 없이 담는 방수 구급 파우치","weight_g":0,"price_krw":17850,"link_url":"https://ocamp.co.kr/product/%EC%94%A8%ED%88%AC%EC%8D%A8%EB%B0%8B-%ED%8D%BC%EC%8A%A4%ED%8A%B8-%EC%97%90%EC%9D%B4%EB%93%9C-%EB%93%9C%EB%9D%BC%EC%9D%B4-%EB%B0%B1-1l-%EC%8A%A4%ED%8C%8C%EC%9D%B4%EC%8B%9C-%EC%98%A4%EB%A0%8C%EC%A7%80seatosummitcn2u302or/10980/"},
    {"gear_id":"","category_id":"camp","name":"수사 망치 MH-1","about":"팩 박을 때 쓰는 작고 가벼운 망치","weight_g":210,"price_krw":17600,"link_url":"https://www.sunil09.kr/goods/goods_view.php?goodsNo=19292"},
    {"gear_id":"","category_id":"camp","name":"쏘울트레커 데크팩","about":"나무 데크에 텐트를 고정하는 가벼운 팩","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"쏘울트레커 나사팩","about":"데크 판 사이에 돌려 넣는 나사형 팩","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"어썸홀리데이 클린백","about":"배낭 밖에 매다는 쓰레기 봉투. 안에 비닐을 한 겹 더","weight_g":0,"price_krw":0,"link_url":""},
    {"gear_id":"","category_id":"camp","name":"블랙다이아몬드 트레일백","about":"길이 조절되는 알루미늄 트레킹 스틱 한 쌍","weight_g":0,"price_krw":81000,"link_url":"https://blackdiamondequipment.co.kr/goods/view?no=9038"},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 실타프 3 사각","about":"백패킹용 사각 타프. 폴은 따로 챙김","weight_g":772,"price_krw":176000,"link_url":"https://www.lfmall.co.kr/app/product/D9TVXX00050"},
    {"gear_id":"","category_id":"shelter","name":"백컨트리 업라이트 폴 180","about":"실타프를 세우는 180cm 타프 폴","weight_g":0,"price_krw":21000,"link_url":"https://backcountry.co.kr/product/%EC%A2%85%ED%95%A9-%EC%8B%A4%ED%83%80%ED%94%84-%EA%B7%B8%EB%9E%80%EB%8D%B0/171/"}
  ]$j$::jsonb,
  0,
  true
);

COMMIT;
