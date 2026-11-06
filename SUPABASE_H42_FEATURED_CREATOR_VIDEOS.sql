-- H42: 홈 '크리에이터의 그 장소' 줄 (대표님 11-06)
-- 크리에이터 등록(spot_creator_links) 유튜브 많이 올린 순 1~4위(친절한 마리오·날아라손형·김희웅·딸기공주세연)의
-- 가장 최근 영상을 하나씩 앞에 두고, 예전에 넣은 영상 3개는 뒤로 보낸다.
-- 박지는 이름이 아니라 spot_id로 잇는다. 줄 순서는 sort_order 작은 순.

ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS spot_id text;
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS creator text NOT NULL DEFAULT '';
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 100;

UPDATE public.featured_videos SET sort_order = 100 + id WHERE creator = '';

INSERT INTO public.featured_videos (title, spot_name, spot_id, creator, view_desc, video_url, video_id, thumb_url, is_active, sort_order)
SELECT v.title, v.spot_name, v.spot_id, v.creator, '', v.url, v.vid, 'https://img.youtube.com/vi/' || v.vid || '/hqdefault.jpg', true, v.ord
FROM (VALUES
  ('무의도 백패킹. 대한민국 누구나 갈수있는 한국의 세렝게티', '무의도', '264', '친절한 마리오', 'https://youtu.be/Hxk52r_aMPM', 'Hxk52r_aMPM', 1),
  ('밀양 영산정사 거대 와불상 직관 후 영축산 백패킹', '영축산', '437', '날아라손형', 'https://youtu.be/aoR4FpsWXp0', 'aoR4FpsWXp0', 2),
  ('[고대산 백패킹] 북한뷰&은하수가 펼쳐진 고대산', '고대산', '340', '김희웅', 'https://youtu.be/V-2kDXNprbo', 'V-2kDXNprbo', 3),
  ('인천 자월도 섬 백패킹 / 대실패 하고 온 그녀들의 사정', '자월도', '49', '딸기공주세연', 'https://youtu.be/pg_A4DthqmQ', 'pg_A4DthqmQ', 4)
) AS v(title, spot_name, spot_id, creator, url, vid, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.featured_videos f WHERE f.video_id = v.vid);

-- 영상 창 아래: 유튜브 채널 사진·이름·소개글 (대표님 11-06: 장비·음식·의류 안내 대신)
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS channel_name text NOT NULL DEFAULT '';
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS channel_url text NOT NULL DEFAULT '';
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS channel_img text NOT NULL DEFAULT '';
ALTER TABLE public.featured_videos ADD COLUMN IF NOT EXISTS channel_desc text NOT NULL DEFAULT '';
UPDATE public.featured_videos SET channel_name = $c$행복한 마리오$c$, channel_url = $c$https://www.youtube.com/channel/UCYmQ5G_uxUXQr5EWioPvi8w$c$, channel_img = $c$https://yt3.googleusercontent.com/lrgpq30P4VnK6viumOI3Sie5E0jq098YISt889Hq7ZtnnYpJ_hMWbeeve2UxFjYCRzyW771AvA=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$마리오의 캠핑일지$c$ WHERE video_id = 'Hxk52r_aMPM';
UPDATE public.featured_videos SET channel_name = $c$날아라 손형$c$, channel_url = $c$https://www.youtube.com/channel/UC08HyLEUf5Pn8ZnMKZHCmtA$c$, channel_img = $c$https://yt3.googleusercontent.com/mDCF6rRepT8FLD4Hbn6I1MN6G5GAn5Ja8bGu66bU3aH76ygivu5CJ3fowAf3QdZ1YI9jdTM3Tw0=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$암이라는 파도를 넘어, 다시 배낭을 멥니다! ⛰️
다발골수종 투병 중에도 포기할 수 없었던 저의 활력소, 등산과 백패킹 이야기입니다.
​'21. 12월: 다발골수종 진단 및 척추 압박 골절
​'22. 05월: 조혈모세포 자가이식 완료
​현재: 유지요법 진행 중 및 기적 같은 필드 복귀!
​4개월마다 병원을 오가며 유지요법 중인 평범하지만 특별한 백패커의 힐링 영상입니다. 구독과 응원은 제게 큰 힘이 됩니다!
​완벽한 건강은 아닐지라도, 오늘이 가장 젊은 날이기에 저는 다시 걷습니다. 재발을 늦추는 최고의 약은 '행복'이라고 믿으니까요. 다발이와 함께하는 특별한 동행, 그 힐링의 여정에 함께해 주세요!$c$ WHERE video_id = 'aoR4FpsWXp0';
UPDATE public.featured_videos SET channel_name = $c$노마로드 Backpacking$c$, channel_url = $c$https://www.youtube.com/channel/UCmKjlYMgVB1up561hTaMTCg$c$, channel_img = $c$https://yt3.googleusercontent.com/eEy-sOo1EjIWcypKSY2Mog_Tf2IbHPfTufVBJDWNUnNRxvYk5jeAxPvHCVh5hCtHt--oox9j=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$안녕하세요! 길 위에서 가장 자유로운 백패커, [노마로드 NomaRoad]입니다.

자연이 좋아 무작정 배낭 하나 메고 떠나고, 신상 장비 소식만 들리면 가슴이 뛰는 평범한 아웃도어인의 노마드 라이프를 담는 채널입니다.

☞진짜 다녀온 백패킹 & 캠핑
제가 직접 가보고 좋았던 박지, 계절별 꿀팁과 소소한 노하우

☞내돈내산 & 꼼꼼 장비 리뷰
텐트, 배낭, 침낭, 소소한 장비까지! 가성비템부터 지름신 강림하는 하이엔드 기어까지 털어보는 솔직 리뷰

☞발길 닿는 등산 이야기
초보자도 쉽게 갈 수 있는 산부터 풍경 멋진 코스 추천

백패킹에 막 입문하셨거나, 다음 주말엔 어디로 떠날지, 어떤 장비를 살지 고민 중이시라면 [노마로드]와 함께해요!$c$ WHERE video_id = 'V-2kDXNprbo';
UPDATE public.featured_videos SET channel_name = $c$육육오사$c$, channel_url = $c$https://www.youtube.com/channel/UC3Tf-D5UqT9V2o3TvX9newg$c$, channel_img = $c$https://yt3.googleusercontent.com/ZCtS337-26dzqoFH88OZKQeWxLH6p57H0WBx6Yib5VRtysJQurye_6y06TGuaS5_pp3ECH_q=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$"머리 하나 차이, 술 냄새 나는 감자 캠퍼들 이야기 [166cm154cm 육육오사]"$c$ WHERE video_id = 'pg_A4DthqmQ';
UPDATE public.featured_videos SET channel_name = $c$오지브로$c$, channel_url = $c$https://www.youtube.com/channel/UCBceEfaJXaaBeBT-uttLzkA$c$, channel_img = $c$https://yt3.googleusercontent.com/auspnlscvRQ4sZ3p1aEeH07S1DxoS5xi3rHA64PugiZ9dsTipQ3dB6mC_wCniHQ7Sy5mkNoQ=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$낯선 곳에서 하룻밤,
고생스러운 여행은 낭만과 추억이 있다.
자연의 소리를 담아요.

A night spent in an unfamiliar place,
Contains the sounds of nature$c$ WHERE video_id = 'WXAxnGCm_f8';
UPDATE public.featured_videos SET channel_name = $c$오라네의 낭만루트$c$, channel_url = $c$https://www.youtube.com/channel/UC5RhQK0kZEK9nTaVsUjY_ug$c$, channel_img = $c$https://yt3.googleusercontent.com/bToK9LNNxFchDU8kO3VLEJxi6X4158bnX4c55u_QpZigPiSmQYu4KRjINyUKI0NkXcmbTgsv=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$조금 불편해도, 자연에 머물다.
오라네의 낭만루트 백패킹 이야기 

박지 찾기부터 패킹, 기록, 장비 관리까지
백패커를 위한 아웃도어 앱 '낭만루트 앱을 '직접 만들었습니다. 
영상 속 장소와 장비는 모두 낭만루트에 정리해 둡니다.

 박지 지도 · 영상 속 그 장소 → romanticroute.kr
 인스타그램 → @romanticroutekr
문의 → (ggumfree@kakao.com)$c$ WHERE video_id = '4JQHNctHibg';
UPDATE public.featured_videos SET channel_name = $c$오라네의 낭만루트$c$, channel_url = $c$https://www.youtube.com/channel/UC5RhQK0kZEK9nTaVsUjY_ug$c$, channel_img = $c$https://yt3.googleusercontent.com/bToK9LNNxFchDU8kO3VLEJxi6X4158bnX4c55u_QpZigPiSmQYu4KRjINyUKI0NkXcmbTgsv=s900-c-k-c0x00ffffff-no-rj$c$, channel_desc = $c$조금 불편해도, 자연에 머물다.
오라네의 낭만루트 백패킹 이야기 

박지 찾기부터 패킹, 기록, 장비 관리까지
백패커를 위한 아웃도어 앱 '낭만루트 앱을 '직접 만들었습니다. 
영상 속 장소와 장비는 모두 낭만루트에 정리해 둡니다.

 박지 지도 · 영상 속 그 장소 → romanticroute.kr
 인스타그램 → @romanticroutekr
문의 → (ggumfree@kakao.com)$c$ WHERE video_id = 'gH3yAInFJDs';

-- 11-06 대표님: 오지브로(단양 올산) 영상은 뺀다. 지우지 않고 숨김 (실행 완료)
UPDATE public.featured_videos SET is_active = false WHERE video_id = 'WXAxnGCm_f8';
