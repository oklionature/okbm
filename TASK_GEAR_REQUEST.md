# 장비 데이터베이스 추가 요청 (2026-11-27 대표님과 정함)

## 들어오는 길
- 낭만플랜 내 장비 '직접 등록'에서 '장비 데이터베이스에 추가 요청'(기본 꺼짐)을 켜고 등록하면 들어온다. 공식 링크 한 칸만 더 받는다.
- 라운지 장비 후기·질문의 장비 찾기 맨 아래 '장비 데이터베이스 추가 요청' 창(직접 등록이 없는 곳이라 따로 둠).
- 사용자가 적는 것: 브랜드·장비 이름·분류·무게(g)·공식 링크(필수). 메모는 라운지 창에만.
- 막는 것: 데이터베이스에 이름이 똑같은 장비(앱·서버 `gear_request_exists`), 같은 요청이 검토 중(`gear_request_duplicate`), 공식 링크 없음(`gear_request_link_required`), 한 사람 하루 5건.
- 비슷한 장비가 있으면 그 이름을 `similar_names`에 남긴다(검수 때 같은 장비인지 비교).

## 저장
- 표 `public.gear_requests` (SUPABASE_I35·I37·I38·I39). 상태: 검토중 / 승인 / 반려.
- 승인하면 `public.gears`에 `gear_r<번호>`로 들어가고 앱은 장비 파일(gears/*.json) 뒤에 이 줄을 더해 보여 준다(romantic-plan.js `okbmFetchUserGears`).
- 요청한 분에게 30포인트(`gear_req`). 오늘 받은 점수(하루 최대)에는 넣지 않는다.

## 자동 검수 순서 (자동화가 이대로 한다)
1. 검토 중인 요청 받기
   `select id, category_id, brand, item_name, weight_g, link, note, similar_names from public.gear_requests where status = '검토중' order by created_at;`
2. 요청마다 공식 링크(`link`)를 열어 확인한다.
   - 링크가 그 장비의 제조사(또는 공식 판매) 페이지가 아니면, 또는 장비가 백패킹 장비가 아니면 반려.
   - `similar_names`에 있는 장비와 같은 제품(이름만 다르게 적음)이면 반려. 사유: '장비 데이터베이스에 이미 있는 장비입니다(○○).'
   - 무게가 공식 페이지와 다르면 공식 값으로 고친다.
3. 사양 채우기: 데이터베이스와 같은 형식으로.
   - 영문 브랜드·영문 이름: 공식 페이지 표기 그대로.
   - 무게 기준: 공식이 '패킹 무게(Packaged/Packed weight)'면 '패킹 무게', 본체만이면 '본체 무게'. 최소 무게(Trail/Minimum weight)가 있으면 `weight_min_g`.
   - 사양 항목 이름은 종류별로 아래 것만, 순서도 이대로(gear-request.js `SPEC_KEYS`와 같음). 모르는 항목은 넣지 않는다.
     - 텐트·타프(shelter): 인원, 구조, 시즌, 형태, 소재, 이너 사이즈, 수납 사이즈, 전실
     - 침낭·매트(sleep): 종류, 형태, 충전재, 충전량, 필파워, 컴포트 온도, 리밋 온도, R-Value, 두께, 사이즈, 수납 사이즈
     - 배낭(pack): 용량, 프레임, 소재, 최대 하중, 토르소 길이
     - 취사(kitchen): 종류, 용량, 연료, 출력, 연결 방식, 소재, 구성, 사이즈, 수납 사이즈
     - 식량(food): 용량, 구성, 소재
     - 의류(wear): 종류, 소재, 충전재, 사이즈 기준
     - 전자·조명(electronics): 종류, 밝기, 배터리, 충전, 방수, 사이즈
     - 테이블·체어(camp): 사용 사이즈, 수납 사이즈, 내하중, 좌면 높이, 소재
     - 기타·소품(other): 종류, 소재, 사이즈, 수납 사이즈, 구성
   - 값 표기는 gears_master.json의 같은 종류 장비를 본보기로(예: '1P', '3시즌', '240 × 65cm', '-8℃', '50L').
   - 장비 이름은 데이터베이스처럼 '브랜드 + 이름'(예: '니모 호넷 오스모 1P')으로 맞춘다.
   ```sql
   select public.okbm_gear_request_fill(
     p_id => 12, p_brand_en => 'NEMO', p_name_en => 'Hornet OSMO 1P',
     p_weight_type => '패킹 무게', p_weight_min_g => 879,
     p_specs => '[["인원","1P"],["구조","반자립형"],["시즌","3시즌"]]'::jsonb,
     p_name => '니모 호넷 오스모 1P', p_weight => 1020);
   ```
4. 승인: `select public.okbm_gear_request_review(12, true);`
   반려: `select public.okbm_gear_request_review(12, false, p_reason => '사유');` (사유는 요청한 분이 볼 수 있게 짧게)
5. 처리한 건 `audit/`에 날짜별로 남긴다(요청 번호·장비·한 일·근거 링크).

## 사람이 볼 곳
- 지도 관리자 도구 '검수함' → '장비 요청' 칸. 카드에 영문 이름·무게 기준·사양·비슷한 장비가 보이고, 승인·반려를 손으로도 할 수 있다.
