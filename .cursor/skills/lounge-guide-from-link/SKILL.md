---
name: lounge-guide-from-link
description: >-
  Turns a YouTube or blog URL into a draft SQL seed for public.lounge_guides.
  Use when the user gives a youtu.be, youtube.com, or blog link and asks for a
  초보 가이드, 입문 장비, 백패킹 팁, 큐레이션, or SQL 초안.
---

# 링크를 초보 가이드 SQL로

운영 DB에는 넣지 않는다. `SEED_LOUNGE_GUIDES_*.sql` 초안만 쓴다.

## 읽기

1. 주소를 연다. 유튜브는 제목·설명·고정 댓글, 블로그는 본문을 읽는다.
2. 장비 이름, 무게(g), 가격(원), 구매 주소는 그 글이나 이어서 연 판매 페이지에 있는 것만 쓴다.
3. 없는 값은 비운다. 본문에 「못 찾음」「영상에서는」「양식」을 쓰지 않는다.

## 나누기

- 장비를 고르는 글은 `kind = kit` 하나. 제목은 「첫 백패킹」처럼 붙인다. `note`는 누구를 위한 한 줄.
- 팁·주의점·기본상식은 `kind = tip`. `note`는 `팁`, `주의점`, `기본상식` 중 하나. 제목은 질문이 아니다.
- 한 링크에 장비와 주의가 같이 있으면 kit과 tip을 나눠 넣는다. 같이 가는 장비는 넣지 않는다.

## 문장

초보가 읽고 바로 사는 문장이다. 운영자에게 보고하는 문장이 아니다.

kit 본문은 소개만 쓰고, 맨 끝에 원문 주소를 한 줄 둔다. 화면은 소개, 유튜브면 썸네일, 블로그면 글 링크, 그 다음 장비 순이다. 주소는 글자로 보이지 않는다.

## 장비 JSON

`name`, `weight_g`, `price_krw`, `link_url`, `category_id`, `gear_id`. 가격은 이름에 붙이지 않는다. `link_url`은 `https://`만. 없으면 `""`. `gear_id`를 모르면 `""`. `category_id`는 `shelter` `pack` `sleep` `electronics` `camp` `other` 중 맞음.

## SQL

파일 머리에 실행하지 않은 초안이라고 적는다. 같은 제목을 지운 뒤 넣는다. `is_active = true`.

```sql
DELETE FROM public.lounge_guides
WHERE title IN ('제목');

INSERT INTO public.lounge_guides (kind, title, note, body, items, sort, is_active)
VALUES (
  'kit',
  '제목',
  '첫 백패킹',
  $k$소개 글.
https://원문$k$,
  $j$[{"gear_id":"","category_id":"shelter","name":"이름","weight_g":0,"price_krw":0,"link_url":"https://"}]$j$::jsonb,
  0,
  true
);
```

캠퍼조이 `https://youtu.be/9TPkBxnQuqQ` 는 `SEED_LOUNGE_GUIDES_CAMPERJO.sql` 을 이 형식으로 고친다. 다른 글은 `SEED_LOUNGE_GUIDES_짧은이름.sql` 로 새로 만든다.
