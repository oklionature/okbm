-- =========================================================================
-- D3: 사용자 데이터 "바뀐 항목만" 저장
-- 기존: 클라이언트가 users 행 전체를 upsert → 다른 기기의 최신 값을 덮어씀
-- 변경: 바뀐 칸만 갱신하고, my_gears는 하위 키 단위로 합친다(|| 병합).
--
-- SECURITY INVOKER: 호출자 권한으로 실행되므로 기존 RLS(users_update_own)가 그대로 적용된다.
-- 본인 행(id = okbm_uid())만 갱신되고, is_admin 등 다른 칸은 건드리지 않는다.
-- 반환: {"ok": true, "updated_at": ...} / 행이 없으면 {"ok": false, "reason": "no_row"}
-- 적용: Supabase SQL Editor에서 이 파일 전체 실행. 여러 번 실행해도 안전(CREATE OR REPLACE).
-- =========================================================================

CREATE OR REPLACE FUNCTION public.okbm_patch_user_data(
  p_columns jsonb DEFAULT '{}'::jsonb,
  p_my_gears jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid text := public.okbm_uid();
  v_cols jsonb := COALESCE(p_columns, '{}'::jsonb);
  v_gears jsonb := COALESCE(p_my_gears, '{}'::jsonb);
  v_updated timestamptz;
BEGIN
  IF auth.uid() IS NULL OR v_uid IS NULL OR btrim(v_uid) = '' THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;
  IF jsonb_typeof(v_cols) <> 'object' OR jsonb_typeof(v_gears) <> 'object' THEN
    RAISE EXCEPTION 'invalid payload' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users u SET
    bookmarks = CASE WHEN jsonb_typeof(v_cols -> 'bookmarks') = 'array' THEN v_cols -> 'bookmarks' ELSE u.bookmarks END,
    visited = CASE WHEN jsonb_typeof(v_cols -> 'visited') = 'array' THEN v_cols -> 'visited' ELSE u.visited END,
    memos = CASE WHEN jsonb_typeof(v_cols -> 'memos') = 'object' THEN v_cols -> 'memos' ELSE u.memos END,
    saved_feeds = CASE WHEN jsonb_typeof(v_cols -> 'saved_feeds') = 'array' THEN v_cols -> 'saved_feeds' ELSE u.saved_feeds END,
    following = CASE WHEN jsonb_typeof(v_cols -> 'following') = 'array' THEN v_cols -> 'following' ELSE u.following END,
    bio = CASE WHEN v_cols ? 'bio' THEN COALESCE(v_cols ->> 'bio', '') ELSE u.bio END,
    hero_cover_url = CASE WHEN v_cols ? 'hero_cover_url' THEN NULLIF(btrim(COALESCE(v_cols ->> 'hero_cover_url', '')), '') ELSE u.hero_cover_url END,
    photo_url = CASE WHEN v_cols ? 'photo_url' THEN NULLIF(btrim(COALESCE(v_cols ->> 'photo_url', '')), '') ELSE u.photo_url END,
    my_gears = CASE WHEN v_gears = '{}'::jsonb THEN u.my_gears ELSE COALESCE(u.my_gears, '{}'::jsonb) || v_gears END,
    updated_at = now()
  WHERE u.id = v_uid
  RETURNING u.updated_at INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_row');
  END IF;
  RETURN jsonb_build_object('ok', true, 'updated_at', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_patch_user_data(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.okbm_patch_user_data(jsonb, jsonb) TO authenticated, service_role;
