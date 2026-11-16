-- I19: 고봉(바위틈 비박지, 36번) 대표님 GPX 선의 들머리 이름을 고친다 (2026-11-16)
-- 대표님 11-16: 수리재 가기 전에 차 한두 대 댈 수 있는 갓길에서 출발한 길이다. 이름은 '수리재 전 갓길 (1~2대)'.
UPDATE public.spot_gpx_tracks SET trailhead = '수리재 전 갓길 (1~2대)' WHERE id = 58 AND spot_id = '36';
