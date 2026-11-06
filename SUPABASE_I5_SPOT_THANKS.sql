-- I5 고마워요 단추 (2026-11-07, 대표님. 설계는 TASK_CONTRIBUTOR_LNT.md E)
-- 박지를 알려 준 사람(박지 등록자 spots.user_id)과 GPX를 올린 사람(지금 박지에 붙은 승인 GPX의 주인)에게
-- 로그인 회원이 '고마워요'를 보낸다. 같은 박지·같은 사람에게 한 번, 본인에겐 못 보낸다. 낭만 포인트는 없다.
-- 관리자·공식 계정이 받는 사람이면 단추를 띄우지 않는다(관리자 등록 박지가 많아서).
-- 받은 사람에게만 보낸 사람이 알림으로 간다(user_notifications 'thanks_received'). 남에게는 숫자만.
-- 프로필 숫자 줄의 '고마워요'는 그 사람이 받은 합계(okbm_user_thanks_count).
-- 적용: Supabase SQL 편집기에서 전체 실행. 여러 번 실행해도 안전. 화면 배포 전에 먼저 실행한다.

CREATE TABLE IF NOT EXISTS public.spot_thanks (
  spot_id text NOT NULL,
  to_user text NOT NULL,
  from_user text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('spot', 'gpx')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spot_id, to_user, from_user)
);
CREATE INDEX IF NOT EXISTS spot_thanks_to ON public.spot_thanks (to_user);
ALTER TABLE public.spot_thanks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spot_thanks FROM PUBLIC, anon, authenticated;

-- 이 박지에서 고마워요를 받을 수 있는 사람: [{user_id, nick, kind}] (한 사람이 둘 다면 'spot' 하나)
CREATE OR REPLACE FUNCTION public.okbm_thanks_people(p_spot_id text)
RETURNS TABLE (user_id text, nick text, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT btrim(sp.user_id) AS uid, 'spot'::text AS kind, 1 AS ord
      FROM public.spots sp WHERE sp.id = btrim(p_spot_id) AND COALESCE(btrim(sp.user_id), '') <> ''
    UNION ALL
    SELECT g.user_id, 'gpx', 2 FROM (
      SELECT g2.user_id FROM public.spots sp
        JOIN public.spot_gpx_submissions g2 ON g2.spot_id = sp.id AND g2.gpx_url = sp.gpx_url AND g2.status = '승인'
       WHERE sp.id = btrim(p_spot_id) AND COALESCE(sp.gpx_url, '') <> ''
       ORDER BY g2.reviewed_at DESC NULLS LAST LIMIT 1
    ) g
  )
  SELECT DISTINCT ON (c.uid) c.uid, COALESCE(NULLIF(btrim(u.nickname), ''), '낭만루터'), c.kind
    FROM c JOIN public.users u ON u.id = c.uid
   WHERE c.uid <> 'official_romanticroute' AND NOT COALESCE(u.is_admin, false)
   ORDER BY c.uid, c.ord
$$;
REVOKE ALL ON FUNCTION public.okbm_thanks_people(text) FROM PUBLIC, anon, authenticated;

-- 정보창·후기 창·프로필이 쓰는 것: 받을 사람마다 이 박지에서 받은 수, 내가 보냈는지
CREATE OR REPLACE FUNCTION public.okbm_spot_thanks_info(p_spot_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := CASE WHEN auth.uid() IS NOT NULL AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
                     THEN public.okbm_uid() END;
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
             'user_id', p.user_id, 'nick', p.nick, 'kind', p.kind,
             'n', (SELECT count(*) FROM public.spot_thanks t WHERE t.spot_id = btrim(p_spot_id) AND t.to_user = p.user_id),
             'sent', v_uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.spot_thanks t
                       WHERE t.spot_id = btrim(p_spot_id) AND t.to_user = p.user_id AND t.from_user = v_uid),
             'self', v_uid IS NOT NULL AND p.user_id = v_uid)
           ORDER BY CASE p.kind WHEN 'spot' THEN 1 ELSE 2 END)
      FROM public.okbm_thanks_people(p_spot_id) p
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_spot_thanks_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_spot_thanks_info(text) TO anon, authenticated;

-- 보내기: 받을 사람이 맞는지·본인 아닌지 보고 한 번만 넣는다. 처음 보낼 때만 받는 사람에게 알림
CREATE OR REPLACE FUNCTION public.okbm_send_thanks(p_spot_id text, p_to_user text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_spot text := btrim(COALESCE(p_spot_id, ''));
  v_to text := btrim(COALESCE(p_to_user, ''));
  v_kind text;
  v_nick text;
  v_spot_name text;
  v_rows integer;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = ''
     OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  PERFORM public.okbm_rpc_rate_limit('send_thanks', 30);
  SELECT p.kind INTO v_kind FROM public.okbm_thanks_people(v_spot) p WHERE p.user_id = v_to;
  IF v_kind IS NULL THEN RAISE EXCEPTION 'not a contributor' USING ERRCODE = '22023'; END IF;
  IF v_to = v_uid THEN RAISE EXCEPTION 'self' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.spot_thanks (spot_id, to_user, from_user, kind) VALUES (v_spot, v_to, v_uid, v_kind)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    SELECT NULLIF(btrim(u.nickname), '') INTO v_nick FROM public.users u WHERE u.id = v_uid;
    SELECT COALESCE(NULLIF(btrim(regexp_replace(COALESCE(sp.spot_main, ''), '\s*\(.*?\)', '', 'g')), ''), '박지')
      INTO v_spot_name FROM public.spots sp WHERE sp.id = v_spot;
    INSERT INTO public.user_notifications (id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read, actor_id)
    VALUES (left('pn_thanks_rcv_' || md5(v_spot || ':' || v_to || ':' || v_uid), 180), v_to, 'thanks_received',
            COALESCE(v_nick, '낭만루터') || '님이 ' || v_spot_name || (CASE WHEN v_kind = 'gpx' THEN ' GPX에' ELSE ' 제보에' END) || ' 고마워했어요',
            '', v_spot, v_spot, v_spot_name, false, v_uid)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'new', v_rows > 0,
    'n', (SELECT count(*) FROM public.spot_thanks t WHERE t.spot_id = v_spot AND t.to_user = v_to));
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_send_thanks(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_send_thanks(text, text) TO authenticated;

-- 프로필 숫자 줄: 그 사람이 받은 고마워요 합계
CREATE OR REPLACE FUNCTION public.okbm_user_thanks_count(p_user_id text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.spot_thanks WHERE to_user = btrim(COALESCE(p_user_id, ''))
$$;
REVOKE ALL ON FUNCTION public.okbm_user_thanks_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.okbm_user_thanks_count(text) TO anon, authenticated;

-- 탈퇴: 보낸 것·받은 것 모두 지운다
CREATE OR REPLACE FUNCTION public.okbm_thanks_on_user_del()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.spot_thanks WHERE to_user = OLD.id OR from_user = OLD.id;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_okbm_thanks_user_del ON public.users;
CREATE TRIGGER trg_okbm_thanks_user_del AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.okbm_thanks_on_user_del();
