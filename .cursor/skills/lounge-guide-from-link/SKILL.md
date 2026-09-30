---
name: lounge-guide-from-link
description: >-
  Turns a YouTube or blog URL into a draft SQL seed for public.lounge_guides.
  Use when the user gives a youtu.be, youtube.com, or blog link and asks for a
  초보 가이드, 입문 장비, 백패킹 팁, 큐레이션, or SQL 초안.
---

# 링크 하나를 입문 장비 게시물 하나로

링크 하나는 `kind = 'kit'` 게시물 하나다. 쪼개지 않고, 팁 게시판(`kind = 'tip'`)에는 아무것도 만들지 않는다. 팁 게시판은 관리자가 직접 쓰는 곳이다.

`SEED_LOUNGE_GUIDES_짧은이름.sql` 초안만 쓴다. 사용자가 넣으라고 하기 전에는 DB에 실행하지 않는다.

카드를 연 초보가 두 가지를 알게 하는 것이 목적이다. 진행자가 무슨 이야기를 했는지, 목록의 물건이 무엇이고 얼마인지.

## 읽기

1. 유튜브는 제목, 채널 이름, 설명의 장비 목록, 자막을 읽는다. 블로그는 본문을 읽는다.
2. 자막은 yt-dlp로 받는다. timedtext API는 비어 오는 일이 많다.

```bash
python3 -m venv /tmp/ytv && /tmp/ytv/bin/pip install -q yt-dlp
/tmp/ytv/bin/yt-dlp --skip-download --write-auto-subs --sub-langs ko --sub-format json3 \
  --write-info-json -o '/tmp/yt/%(id)s' 'https://youtu.be/ID'
```

`.info.json`에서 `title`, `channel`, `description`을, `.ko.json3`에서 자막 글자를 모은다.

## 행

- `title`: 영상·글 제목 그대로. 한 글자도 고치지 않는다.
- `note`: 채널 이름(블로그면 블로그 이름).
- `body`: `본문\n---\n채널 소개\n원문 주소`. 맨 끝 주소는 화면에서 썸네일이나 글 링크가 되고 글자로는 안 보인다. 4000자 이하.
- `items`: 장비 목록. 80개 이하.
- `sort = 0`, `is_active = true`.

## 본문

10년차 큐레이터가 처음 가는 사람에게 건네는 말투로 쓴다. 보고서나 요약 머리말 투가 아니다.

- 진행자가 실제로 한 말과 팁만 골라 읽기 좋게 잇는다. 텐트는 뭘 보고 고르는지, 배낭은 뭐가 다른지, 겨울엔 무엇을 더하는지 같은 것.
- 영상에 없는 상황이나 장비는 만들지 않는다. 용어도 영상 것을 쓴다(비화식·화식 등).
- 종류별로 짧은 소제목 줄(텐트, 배낭, 침낭과 매트 …)을 두고 단락을 나눠도 된다.
- 쓰지 않는 말: 「영상에서는」「정리하면」「핵심은」「못 찾음」「양식」.

채널 소개는 `---` 아래 두세 문장. 채널에 있는 사실만 쓰고, 구독자 수나 경력처럼 확인 안 된 숫자는 쓰지 않는다.

## 장비 줄

```json
{"gear_id":"","category_id":"shelter","name":"영상 표기 그대로","about":"한 줄 설명","weight_g":0,"price_krw":0,"link_url":""}
```

- `name`: 설명 목록이나 진행자가 부른 표기 그대로. 줄이거나 다른 모델명으로 바꾸지 않는다. 말로만 나온 장비도 넣는다.
- `about`: 80자 이하. 초보가 「이런 물건이구나」 알 정도. 예: 혼자 쓰는 2인용 돔 텐트.
- `price_krw`: 검색해서 연 판매 페이지에 적힌 금액만. 못 찾으면 0. 어림하지 않는다. 가격은 이름에 붙이지 않는다.
- `link_url`: 그 가격이 적힌 `https://` 판매 페이지. 판매 페이지가 없으면 설명에 있던 구매 링크, 그것도 없으면 `""`.
- `weight_g`: 영상에서 말했거나 판매·제조사 페이지에 적힌 것만. 없으면 0(화면에 안 찍힌다).
- `category_id`: `shelter` `pack` `sleep` `kitchen` `electronics` `camp` `other`. 같은 종류끼리 붙여 두면 화면이 종류가 바뀔 때마다 소제목을 단다.
- `gear_id`: 장비 사전에 있는 걸 알 때만. 모르면 `""`.

쿠팡(`link.coupang.com`, `coupang.com`)은 curl과 브라우저 모두 막혀서 가격 확인이 안 된다. 브랜드 공식몰이나 국내 아웃도어몰에서 찾는다. `http://` 페이지나 목록·가격비교 페이지의 금액은 쓰지 않는다.

## SQL

```sql
-- 파일 머리: 출처 주소, 가격 확인 날짜, 아직 DB에 넣지 않은 초안이라는 것

BEGIN;

DELETE FROM public.lounge_guides WHERE title IN ('영상 제목 그대로');

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'kit',
  '영상 제목 그대로',
  '채널 이름',
  $b$본문 …
---
채널 소개 …
https://youtu.be/ID$b$,
  $j$[ … ]$j$::jsonb,
  0,
  true
);

COMMIT;
```

다 쓰면 python으로 `items` JSON이 읽히는지, 본문 길이, 금지어, `link_url`이 `https://`거나 빈칸인지 확인한다.

예시: 캠퍼조이 `https://youtu.be/9TPkBxnQuqQ` → `SEED_LOUNGE_GUIDES_CAMPERJO.sql`.
