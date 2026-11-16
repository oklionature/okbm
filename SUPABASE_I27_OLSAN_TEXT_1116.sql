-- I27: 올산(24번) 박지 소개·피드 글을 607m 바위박지에 맞게 고친다 (2026-11-16, 대표님 B안)
-- 지도 목록 짧은 소개(view_brief_short)는 view_brief에서 저절로 만들어진다. '해발 858m'을 빼고 '정상부'를 빼고, 접근/코스를 새 GPX(미노교~박지 4.7km, 오르막 합계 약 390m)에 맞춘다. 피드 해발 칸 858m→607m.
UPDATE public.spots SET
  view_brief = replace(replace(view_brief, '해발 858m 높이의 기암괴석으로', '기암괴석으로'), '정상부 천연 바위 테라스에', '천연 바위 테라스에'),
  desc_summary = replace(replace(replace(replace(replace(desc_summary,
    '해발 858m 높이의 기암괴석으로', '기암괴석으로'),
    '정상부 천연 바위 테라스에', '천연 바위 테라스에'),
    '편도 약 4.5km 거리로', '편도 약 4.7km 거리로'),
    '누적상승 약 ▲700m 이상의 고강도 산행이 요구되는 상급자 코스입니다.', '누적상승 약 ▲400m에 험한 구간이 많은 상급자 코스입니다.'),
    '정상부 바위 지형으로 1~2동', '바위 지형으로 1~2동'),
  distance_km = 4.7
WHERE id = '24';

UPDATE public.feeds SET memo = replace(memo, '해발 858m, 기암괴석이 빚은 올산 정상 바위 테라스.', '기암괴석이 빚은 올산 바위 테라스.'), elevation = '607m'
WHERE id = 'pack_4ialubn0_fleo4';
UPDATE public.feeds SET memo = replace(memo, '해발 858m 기암괴석 정상부 천연 바위 테라스에서', '기암괴석 사이 천연 바위 테라스에서'), elevation = '607m'
WHERE id = 'feed_insta_1669004400_314';

SELECT json_build_object('spot', (SELECT row_to_json(s) FROM (SELECT view_brief, view_brief_short, desc_summary, distance_km, elevation FROM public.spots WHERE id = '24') s),
  'feeds', (SELECT json_agg(json_build_object('id', id, 'elevation', elevation, 'memo', memo)) FROM public.feeds WHERE id IN ('pack_4ialubn0_fleo4', 'feed_insta_1669004400_314')));
