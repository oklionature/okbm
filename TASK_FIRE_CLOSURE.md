# 산불조심기간 입산통제 안내 (대표님 11-05 결정)

## 정한 것
- 보이는 곳: 박지 정보창 띠만. 지도 핀·홈·목록은 건드리지 않는다.
- 대상: 통제구역 안·경계(2026 가을 118곳)는 강한 띠, 200m 안 가까움(44곳)은 약한 띠. 간월재(19번)는 이미 야영금지라 뺀다.
- 갱신: 앱이 산림청에 직접 묻지 않는다. 봄·가을 산림청 공고가 나오면 점검 스크립트로 다시 재서 DB에 저장한다.
- 말투: 단정하지 않고 알리고 확인 길로 잇는다. 단추는 산림청 지도(https://hiking.kworks.co.kr/)로 간다.
- 색: 야영금지(빨강)와 헷갈리지 않게 다른 색. 이모티콘 없음.

## 문구·모양 (11-05 확정, 시안 .claude/mockups/fire-band/ v5·v4)
강한 띠 (안·경계) — 강한띠_정선백운산_v5.png
- 1줄: 노란 점 + **입산통제구역**(노랑 14px 굵게) + (산불조심기간)(노랑 12.5px) … 오른쪽 **11월 1일 ~ 12월 15일**(흰색 12px 굵게)
- 2줄: 산림청 지도에서 이 박지가 입산통제구역으로 나와요.
- 3줄: 들어가면 과태료 10만 원이에요. … 오른쪽 링크 '산림청 지도 보기 ›'(노랑)

약한 띠 (가까움) — 약한띠_용문산_v4.png
- 1줄: 노란 점 + **근처가 입산통제구역이에요**(흰색 13.5px)
- 2줄(회색): 12월 15일까지 오르는 길이 막혔을 수 있어요.
- 3줄(회색): 들머리에서 가는 길을 확인하세요. … 오른쪽 '산림청 지도 보기 ›'

공통: 카드 바탕 #17171b, 테두리 rgba(255,255,255,0.08), 둥글기 12px, 안쪽 여백 10px 12px, 본문 12.5px, word-break:keep-all, 이모티콘 없음.
자리: 정보창 이름 줄(.sheet-title-row) 바로 아래, 야영금지 띠와 같은 자리. 야영금지 박지에는 안 띄움.
날짜는 저장된 기간에서 만든다(위 날짜는 2026 가을).
링크는 앱에서 바깥 브라우저(Capacitor Browser)로 연다.

## 배포
- 11-05 map-main.js 1.0.103으로 배포(c35cbcc), 실제 사이트 정선 백운산에서 띠 확인.

## 저장
- 새 표 `spot_fire_closures`: spot_id, season(예: 2026-가을), starts_on, ends_on, level(in·edge·near), checked_at.
- 정보창은 오늘이 starts_on~ends_on 안일 때만 띠를 보인다. 기간이 지나면 저절로 사라진다.

## 점검 방법 (2026-11-05 결과: audit/fire-closure-2026-autumn.md)
- 스크립트: `scripts/fire-closure-check.py` (바깥 패키지 없이 돈다. 오늘 결과와 454곳 모두 같게 나옴 확인)
- 새 박지 하나: `python3 scripts/fire-closure-check.py --point 번호 위도 경도 --sql` → 찍힌 SQL을 SQL 편집기에서 실행. 박지 조사 스킬(spot-research) 5-1에 넣어 등록 때마다 돌린다.
- 철이 바뀌면(봄·가을 산림청 공고): 스크립트 맨 위 `SEASON`(이름·시작·끝)을 고치고, 산림청 지도가 새 철로 바뀐 걸 첫 화면 문구로 확인한 뒤 전체를 돈다.
  - 박지 좌표 받기: SQL 편집기에서 `select json_agg(json_build_object('id', id, 'campsite_lat', campsite_lat, 'campsite_lng', campsite_lng)) from public.spots;` 결과를 spots.json으로 저장
  - `python3 scripts/fire-closure-check.py --json spots.json --sql > out.sql` → out.sql 실행(30초쯤)
- 원리: 산림청 지도 입산통제구역 타일 `https://new_timg3.kworks.co.kr:8443/05_overlay/04_crtlmtn/v_fix/L{zz}/R{row:08x}/C{col:08x}.png`, 좌표계 EPSG:5179, 원점 (254440, 2827543), 타일 256px.
  L10(2.01 m/px)에서 둘레 200m 안 칠해진 칸을 찾고, L12(0.50 m/px)에서 둘레 10m가 90% 넘게 덮이면 안, 일부면 경계, 아니면 가까움.
- 파이썬 urllib는 이 서버와 SSL이 안 맞아 curl로 받는다.

## 새 박지는?
- 저절로 안 들어간다(좌표는 회원만 읽을 수 있고, 타일 판정은 서버 SQL로 못 한다). 등록할 때 위 '새 박지 하나'를 돌린다.
