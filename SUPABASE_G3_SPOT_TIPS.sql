-- =========================================================================
-- G3 박지 "다녀왔음" 팁 칩 (2026-10-14)
-- 정보창에서 다녀왔음을 누른 회원이 팁 칩(풍경·박지 크기·분위기·알아 둘 것)과 한 줄을 남긴다.
-- 피드 글이 아니라 박지 정보로만 쌓는다(사진 없이 피드에 오르는 길을 만들지 않는다).
--
-- · 표 okbm_spot_tips: 박지마다 한 사람 한 줄(고쳐 쓰면 덮어씀). 직접 읽기·쓰기는 막고 함수로만.
-- · okbm_save_spot_tips(spot, tips[], note): 회원만, 분당 10회, 허용된 칩만, 박지 크기·분위기는 하나씩.
-- · okbm_spot_tips_summary(spot): 누구나. "N명 다녀옴"(다녀왔음 표시 + 팁 남긴 사람), 칩별 수.
--   한 줄은 회원에게만 최근 3개. 내가 남긴 것(mine)도 함께.
-- · okbm_admin_delete_spot_tip(spot, user): 관리자만.
-- · 회원 탈퇴(users 삭제)·박지 삭제 시 함께 지워진다(FK cascade).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.okbm_spot_tips (
  spot_id text NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nickname text NOT NULL DEFAULT '',
  tips text[] NOT NULL DEFAULT '{}',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, user_id),
  CONSTRAINT okbm_spot_tips_note_len CHECK (char_length(note) <= 60),
  CONSTRAINT okbm_spot_tips_count CHECK (cardinality(tips) <= 14)
);
CREATE INDEX IF NOT EXISTS okbm_spot_tips_spot_updated ON public.okbm_spot_tips (spot_id, updated_at DESC);

ALTER TABLE public.okbm_spot_tips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.okbm_spot_tips FROM PUBLIC, anon, authenticated;

-- 허용 칩 (화면 spot-tips.js GROUPS와 같아야 한다)
CREATE OR REPLACE FUNCTION public.okbm_spot_tip_allowed()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    '일출 명소', '일몰 명소', '운해', '야경', '별이 잘 보임',
    '텐트 1~2동', '텐트 3~5동', '텐트 6동 이상',
    '조용함', '사람 많음',
    '바람 셈', '그늘 없음', '벌레 많음', '통신 약함'
  ]::text[];
$$;

-- 요약 (누구나)
CREATE OR REPLACE FUNCTION public.okbm_spot_tips_summary(p_spot_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_member boolean;
  v_actor text;
  v_uid text;
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_visits integer := 0;
  v_tips jsonb := '{}'::jsonb;
  v_notes jsonb := '[]'::jsonb;
  v_mine jsonb := NULL;
BEGIN
  IF v_spot IS NULL THEN
    RAISE EXCEPTION 'spot required' USING ERRCODE = '22023';
  END IF;
  v_member := v_is_service OR (auth.uid() IS NOT NULL AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'spot_tips_summary', 120) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  SELECT count(*)::integer INTO v_visits FROM (
    SELECT u.id FROM public.users u
    WHERE jsonb_typeof(u.visited) = 'array'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(u.visited) e(v) WHERE btrim(e.v) = v_spot)
    UNION
    SELECT t.user_id FROM public.okbm_spot_tips t WHERE t.spot_id = v_spot
  ) x;

  SELECT COALESCE(jsonb_object_agg(tip, n), '{}'::jsonb) INTO v_tips FROM (
    SELECT tip, count(*)::integer AS n
    FROM public.okbm_spot_tips t, unnest(t.tips) AS tip
    WHERE t.spot_id = v_spot
    GROUP BY tip
  ) c;

  IF v_member THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.updated_at DESC), '[]'::jsonb) INTO v_notes FROM (
      SELECT t.user_id, t.nickname, t.note, t.updated_at
      FROM public.okbm_spot_tips t
      WHERE t.spot_id = v_spot AND t.note <> ''
      ORDER BY t.updated_at DESC
      LIMIT 3
    ) r;
    v_uid := public.okbm_uid();
    IF v_uid IS NOT NULL AND btrim(v_uid) <> '' THEN
      SELECT jsonb_build_object('tips', t.tips, 'note', t.note, 'updated_at', t.updated_at) INTO v_mine
      FROM public.okbm_spot_tips t WHERE t.spot_id = v_spot AND t.user_id = v_uid;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'spot_id', v_spot,
    'tier', CASE WHEN v_member THEN 'member' ELSE 'guest' END,
    'visits', v_visits,
    'tips', v_tips,
    'notes', v_notes,
    'mine', v_mine
  );
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_spot_tips_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_spot_tips_summary(text) TO anon, authenticated;

-- 남기기 (회원만)
CREATE OR REPLACE FUNCTION public.okbm_save_spot_tips(p_spot_id text, p_tips text[], p_note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := NULLIF(btrim(COALESCE(p_spot_id, '')), '');
  v_tips text[];
  v_note text := left(btrim(regexp_replace(COALESCE(p_note, ''), '\s+', ' ', 'g')), 60);
  v_nick text;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('spot_tips', 10);
  IF v_spot IS NULL OR NOT EXISTS (SELECT 1 FROM public.spots s WHERE s.id = v_spot) THEN
    RAISE EXCEPTION 'unknown spot' USING ERRCODE = '22023';
  END IF;

  -- 허용된 칩만, 중복 없이
  SELECT COALESCE(array_agg(DISTINCT t), '{}') INTO v_tips
  FROM unnest(COALESCE(p_tips, '{}'::text[])) AS t
  WHERE t = ANY (public.okbm_spot_tip_allowed());
  -- 박지 크기·분위기는 하나만
  IF (SELECT count(*) FROM unnest(v_tips) t WHERE t LIKE '텐트 %') > 1
     OR (SELECT count(*) FROM unnest(v_tips) t WHERE t IN ('조용함', '사람 많음')) > 1 THEN
    RAISE EXCEPTION 'one choice only' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_tips) = 0 AND v_note = '' THEN
    RAISE EXCEPTION 'empty' USING ERRCODE = '22023';
  END IF;

  v_nick := COALESCE(public.okbm_lounge_author_nickname(v_uid), '');
  INSERT INTO public.okbm_spot_tips AS m (spot_id, user_id, nickname, tips, note)
  VALUES (v_spot, v_uid, v_nick, v_tips, v_note)
  ON CONFLICT (spot_id, user_id) DO UPDATE SET
    tips = EXCLUDED.tips, note = EXCLUDED.note, nickname = EXCLUDED.nickname, updated_at = now();

  RETURN public.okbm_spot_tips_summary(v_spot);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_save_spot_tips(text, text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_save_spot_tips(text, text[], text) TO authenticated;

-- 관리자 삭제
CREATE OR REPLACE FUNCTION public.okbm_admin_delete_spot_tip(p_spot_id text, p_user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE(public.okbm_is_admin(), false) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  DELETE FROM public.okbm_spot_tips WHERE spot_id = p_spot_id AND user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_admin_delete_spot_tip(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_admin_delete_spot_tip(text, text) TO authenticated;

-- 확인
SELECT public.okbm_spot_tips_summary('282') AS sample;
