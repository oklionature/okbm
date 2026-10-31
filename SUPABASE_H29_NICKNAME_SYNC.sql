-- H29: 닉네임을 바꾸면 지난 기록의 이름도 따라 바뀌게 (2026-10-31)
-- 왜: 닉네임을 바꾸면 users.nickname만 바뀌고, 피드·박지·팁·후기·댓글 등은 글을 쓸 때 이름을 글자로 적어 둬서
--     예전 이름이 그대로 보였다(10-31 기준 피드 38개·5명, 박지 3곳, 팁 4개, 후기 4개. 예: 슈퍼뚱땡이 → 김병진, 오렌지그린 → PL).
-- 어떻게:
--   · okbm_sync_user_nickname(user_id): 그 사람이 쓴 기록의 이름 칸을 users.nickname으로 맞춘다. 다른 것만 고친다.
--     feeds.author, spots.author, trips.author_name(host_id), okbm_spot_tips·comments·talks·lounge_posts·lounge_post_comments·feed_comments.nickname,
--     feed_comments.reply_to_nickname(reply_to_user_id), direct_threads.nick_a/nick_b, user_blocks.blocked_nickname(blocked_id),
--     spot_creator_links.author.
--     제보(proposals·spot_corrections)는 뺐다: 처리 끝난 제보는 잠금(proposal_locked)이 걸려 있고, 제보는 그때 이름 그대로 둔다.
--   · users.nickname이 바뀌면 트리거가 위 함수를 부른다(빈 닉네임이면 아무것도 안 함).
--   · 마지막에 지금 어긋난 사람 전부를 한 번 맞춘다.
--   후기(comments)는 검사 트리거가 updated_at을 지금으로 바꾸지만, 후기는 쓴 시각(created_at)으로만 정렬·표시해서 화면엔 차이가 없다.
--   관심루터 목록(users.following)은 모두 아이디로 저장돼 있어 영향 없음(10-31 확인).
-- 적용: Supabase 대시보드 SQL 편집기에서 이 파일 전체를 한 번 실행. 여러 번 실행해도 안전.
-- 되돌리기: DROP TRIGGER trg_okbm_users_nickname_sync ON public.users; DROP FUNCTION public.okbm_users_nickname_sync(); DROP FUNCTION public.okbm_sync_user_nickname(text);
--   (이미 바뀐 이름은 되돌아가지 않는다)

CREATE OR REPLACE FUNCTION public.okbm_sync_user_nickname(p_user_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := NULLIF(btrim(COALESCE(p_user_id, '')), '');
  v_nick text;
  v_n integer := 0;
  v_c integer;
BEGIN
  IF v_id IS NULL THEN RETURN 0; END IF;
  SELECT NULLIF(btrim(COALESCE(u.nickname, '')), '') INTO v_nick FROM public.users u WHERE u.id = v_id;
  IF v_nick IS NULL THEN RETURN 0; END IF;

  UPDATE public.feeds SET author = v_nick WHERE user_id = v_id AND author IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.spots SET author = v_nick WHERE user_id = v_id AND author IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.trips SET author_name = v_nick WHERE host_id = v_id AND author_name IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.okbm_spot_tips SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.comments SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.talks SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.lounge_posts SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.lounge_post_comments SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.feed_comments SET nickname = v_nick WHERE user_id = v_id AND nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.feed_comments SET reply_to_nickname = v_nick WHERE reply_to_user_id = v_id AND reply_to_nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.direct_threads SET nick_a = v_nick WHERE user_a = v_id AND nick_a IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.direct_threads SET nick_b = v_nick WHERE user_b = v_id AND nick_b IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.user_blocks SET blocked_nickname = v_nick WHERE blocked_id = v_id AND blocked_nickname IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;
  UPDATE public.spot_creator_links SET author = v_nick WHERE user_id = v_id AND author IS DISTINCT FROM v_nick;
  GET DIAGNOSTICS v_c = ROW_COUNT; v_n := v_n + v_c;

  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_sync_user_nickname(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.okbm_users_nickname_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.okbm_sync_user_nickname(NEW.id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_users_nickname_sync() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_okbm_users_nickname_sync ON public.users;
CREATE TRIGGER trg_okbm_users_nickname_sync
  AFTER UPDATE OF nickname ON public.users
  FOR EACH ROW
  WHEN (NEW.nickname IS DISTINCT FROM OLD.nickname)
  EXECUTE FUNCTION public.okbm_users_nickname_sync();

-- 지금 어긋난 기록 한 번 맞추기(고친 줄 수를 돌려준다)
SELECT COALESCE(sum(public.okbm_sync_user_nickname(u.id)), 0) AS synced_rows
FROM public.users u
WHERE NULLIF(btrim(COALESCE(u.nickname, '')), '') IS NOT NULL;
