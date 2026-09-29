-- =========================================================================
-- F1: 백패커 라운지 (행사 · 초보 가이드 · 자유게시판 · 박지 후기)
-- 전제: SUPABASE_RLS_POLICIES_MASTER.sql 적용 완료
--       (okbm_uid, okbm_is_admin, okbm_rpc_rate_limit, okbm_delete_account_data 있음)
--
-- 내용
--   lounge_events        행사. 관리자만 쓰기, 공개 조회(숨김 행사는 관리자만)
--   lounge_guides        초보 가이드(장비 세트 kit / 첫 박 준비 tip). 관리자만 쓰기
--   comments (기존)      박지 후기로 재사용: 1인 1박지 1후기, 평점 1~5 필수, 수정 가능
--                        직접 조회는 본인·관리자만. 남의 후기는 get_spot_reviews(회원은 글까지,
--                        비회원은 평균·개수만), 평점 순위는 get_top_reviewed_spots
--   lounge_posts         자유게시판. 건의(suggestion)는 작성자·관리자만 보임(is_private 생성 칼럼)
--   lounge_post_comments 댓글. 부모 글이 보이는 사람만 보고 쓴다
--   lounge_post_likes    좋아요. 본인 것만 보인다(개수는 lounge_posts.likes_count)
--   feed_reports         target_type 추가(feed | lounge_post | lounge_comment | spot_review)
--   알림                 댓글이 달리면 글쓴이에게 user_notifications (트리거, 결정적 id)
--   탈퇴                 okbm_delete_account_data에 라운지 테이블 추가
--
-- 원칙
--   · 닉네임은 users에서 채운다(클라이언트 값 무시). 작성자·박지·글 id는 수정으로 못 바꾼다.
--   · 좋아요·댓글 수는 클라이언트가 못 바꾼다(feeds.likes_count 가드와 같은 방식).
--   · 도배 방지: 글 분당 5, 댓글 분당 20, 후기 분당 10 (okbm_rpc_rate_limit).
--   · 스키마 첫 FK(라운지 내부 + 행사→박지 SET NULL). 모두 ON DELETE 규칙을 명시한다.
--
-- 적용: 단독 실행 안전(IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
--       마스터는 실행 때마다 public 정책을 전부 지우므로 같은 내용을 마스터 7절에도 둔다.
-- 되돌리기: 맨 아래 주석 참고.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 0. 공통 트리거 함수
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_lounge_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 작성자 닉네임 (users 기준). SECURITY DEFINER: 관리자가 남의 글을 고칠 때도 읽을 수 있게.
CREATE OR REPLACE FUNCTION public.okbm_lounge_author_nickname(p_user_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(btrim(COALESCE(u.nickname, '')), '') FROM public.users u WHERE u.id = p_user_id LIMIT 1),
    '낭만백패커'
  );
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_author_nickname(text) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------------------
-- 1. lounge_events (관리자 게시)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 80),
  start_date date NOT NULL,
  end_date date,
  place text NOT NULL DEFAULT '' CHECK (char_length(place) <= 80),
  spot_id text REFERENCES public.spots(id) ON DELETE SET NULL,
  host text NOT NULL DEFAULT '' CHECK (char_length(host) <= 60),
  fee text NOT NULL DEFAULT '' CHECK (char_length(fee) <= 60),
  apply_url text NOT NULL DEFAULT ''
    CHECK (apply_url = '' OR (apply_url ~ '^https://' AND apply_url !~ '[[:space:]<>"'']')),
  poster_url text NOT NULL DEFAULT ''
    CHECK (poster_url = '' OR (poster_url ~ '^https://' AND poster_url !~ '[[:space:]<>"'']')),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lounge_events_dates_chk CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS lounge_events_start_idx ON public.lounge_events (start_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS lounge_events_spot_idx ON public.lounge_events (spot_id) WHERE spot_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_lounge_events_touch ON public.lounge_events;
CREATE TRIGGER trg_lounge_events_touch
  BEFORE UPDATE ON public.lounge_events
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_touch_updated_at();

-- -------------------------------------------------------------------------
-- 2. lounge_guides (관리자 게시: 장비 세트 kit / 첫 박 준비 tip)
--    items: [{ "gear_id": "gear_1644", "category_id": "pack", "name": "...", "weight_g": 1600, "link_url": "https://..." }]
--    link_url(선택): 관리자가 거는 구매·상세 링크. 화면은 okbmSafeExternalUrl + noopener로만 연다.
--    가격은 여기 두지 않는다(나중에 별도 파일로, 2026-09-29 사용자 결정).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('kit', 'tip')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  items jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 30),
  sort integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_guides_kind_sort_idx ON public.lounge_guides (kind, sort) WHERE is_active;

DROP TRIGGER IF EXISTS trg_lounge_guides_touch ON public.lounge_guides;
CREATE TRIGGER trg_lounge_guides_touch
  BEFORE UPDATE ON public.lounge_guides
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_touch_updated_at();

-- -------------------------------------------------------------------------
-- 3. 박지 후기 = 기존 comments (2026-09-26 백업 기준 0행, 클라이언트 사용처 없음)
--    spots FK는 걸지 않는다: 관리자 도구가 박지를 자유롭게 지우므로 RESTRICT면 삭제가 막히고
--    CASCADE면 후기가 조용히 사라진다. 박지가 없어진 후기는 화면에 안 나올 뿐 해가 없다.
-- -------------------------------------------------------------------------
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.comments ALTER COLUMN rating DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_rating_chk') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_rating_chk CHECK (rating IS NOT NULL AND rating BETWEEN 1 AND 5) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_text_len_chk') THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_text_len_chk CHECK (char_length(text) <= 1000) NOT VALID;
  END IF;
END $$;

-- 1인 1박지 1후기 (클라이언트는 on_conflict=spot_id,user_id 로 upsert). 중복 행이 있으면 여기서 실패하고 전체 롤백.
CREATE UNIQUE INDEX IF NOT EXISTS comments_spot_user_uidx ON public.comments (spot_id, user_id);
CREATE INDEX IF NOT EXISTS comments_created_idx ON public.comments (created_at DESC);

CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.spot_id := OLD.spot_id;
    NEW.created_at := OLD.created_at;
  ELSE
    IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      PERFORM public.okbm_rpc_rate_limit('lounge_review', 10);
    END IF;
    NEW.created_at := now();
  END IF;
  NEW.text := btrim(COALESCE(NEW.text, ''));
  NEW.updated_at := now();
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_review() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_comments_guard ON public.comments;
CREATE TRIGGER trg_lounge_comments_guard
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_review();

-- 후기 직접 조회는 본인·관리자만(수정용). 남의 후기는 아래 RPC로만 본다.
-- 마스터 5절의 comments_select_public(USING true)도 P1 적용 때 이것으로 바꿔야 한다
-- (마스터는 실행 때마다 정책을 다시 만든다).
DROP POLICY IF EXISTS comments_select_public ON public.comments;
DROP POLICY IF EXISTS comments_select_own ON public.comments;
CREATE POLICY comments_select_own ON public.comments
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 박지 후기 조회 (지도 정보창·라운지 공용, 요청 1번).
--   회원(로그인, 익명 로그인 제외): 요약 + 후기 글 + 내 후기
--   비회원: 요약(평균·개수)만. E1(들머리·코스는 회원 전용)과 같은 기준.
--   p_spot_id NULL = 모든 박지의 최근 후기(라운지 "최근 후기"). 이때 요약·내 후기는 없음.
--   p_before = 더 보기 커서(이 시각 이전), p_limit 1~20.
--   차단·신고한 사용자의 후기는 클라이언트가 isFeedHiddenByUgc로 거른다(user_id를 돌려줌).
CREATE OR REPLACE FUNCTION public.get_spot_reviews(
  p_spot_id text DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_before timestamptz DEFAULT NULL
)
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
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
  v_summary jsonb := NULL;
  v_reviews jsonb := '[]'::jsonb;
  v_mine jsonb := NULL;
BEGIN
  v_member := v_is_service
    OR (
      auth.uid() IS NOT NULL
      AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );

  IF NOT v_is_service THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_spot_reviews', CASE WHEN v_member THEN 60 ELSE 120 END) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  IF v_spot IS NOT NULL THEN
    SELECT jsonb_build_object(
             'avg_rating', round(avg(c.rating)::numeric, 1),
             'review_count', count(*)::integer
           )
      INTO v_summary
    FROM public.comments c
    WHERE c.spot_id = v_spot AND c.rating BETWEEN 1 AND 5;
  END IF;

  IF v_member THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC, r.id DESC), '[]'::jsonb)
      INTO v_reviews
    FROM (
      SELECT c.id, c.spot_id, c.user_id, c.nickname, c.rating, c.text, c.created_at, c.updated_at
      FROM public.comments c
      WHERE c.rating BETWEEN 1 AND 5
        AND (v_spot IS NOT NULL AND c.spot_id = v_spot
             OR v_spot IS NULL AND EXISTS (SELECT 1 FROM public.spots s WHERE s.id = c.spot_id))
        AND (p_before IS NULL OR c.created_at < p_before)
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT v_limit
    ) r;

    v_uid := public.okbm_uid();
    IF v_spot IS NOT NULL AND v_uid IS NOT NULL AND btrim(v_uid) <> '' THEN
      SELECT to_jsonb(m) INTO v_mine
      FROM (
        SELECT c.id, c.rating, c.text, c.updated_at
        FROM public.comments c
        WHERE c.spot_id = v_spot AND c.user_id = v_uid
        LIMIT 1
      ) m;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'tier', CASE WHEN v_member THEN 'member' ELSE 'guest' END,
    'spot_id', v_spot,
    'summary', v_summary,
    'reviews', v_reviews,
    'mine', v_mine
  );
END;
$$;

-- 평점 높은 박지 (누구나). 후기가 p_min_count개 이상인 박지만, 지워진 박지는 제외.
CREATE OR REPLACE FUNCTION public.get_top_reviewed_spots(
  p_min_count integer DEFAULT 3,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    v_actor := COALESCE(NULLIF(auth.uid()::text, ''), 'ip:' || public.okbm_request_ip());
    IF NOT public.okbm_actor_rate_limit(v_actor, 'get_top_reviewed_spots', 60) THEN
      RAISE EXCEPTION 'rate limit exceeded';
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.avg_rating DESC, t.review_count DESC, t.spot_id), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT c.spot_id,
           round(avg(c.rating)::numeric, 1) AS avg_rating,
           count(*)::integer AS review_count
    FROM public.comments c
    JOIN public.spots s ON s.id = c.spot_id
    WHERE c.rating BETWEEN 1 AND 5
    GROUP BY c.spot_id
    HAVING count(*) >= GREATEST(COALESCE(p_min_count, 3), 1)
    ORDER BY avg_rating DESC, review_count DESC, c.spot_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  ) t;
  RETURN v_result;
END;
$$;

-- -------------------------------------------------------------------------
-- 4. lounge_posts (자유게시판)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('backpacking', 'life', 'suggestion')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 3000),
  photos jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) <= 5),
  is_private boolean GENERATED ALWAYS AS (category = 'suggestion') STORED,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_posts_created_idx ON public.lounge_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_posts_category_created_idx ON public.lounge_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_posts_user_idx ON public.lounge_posts (user_id);

-- 작성자·카테고리·작성 시각은 수정으로 못 바꿈. 닉네임은 users에서. 사진은 https 문자열만.
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.category := OLD.category;
    NEW.created_at := OLD.created_at;
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.photos IS DISTINCT FROM OLD.photos THEN
      NEW.updated_at := now();
    ELSE
      NEW.updated_at := OLD.updated_at;
    END IF;
  ELSE
    IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      PERFORM public.okbm_rpc_rate_limit('lounge_post', 5);
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(NEW.photos, '[]'::jsonb)) AS e(v)
    WHERE jsonb_typeof(e.v) <> 'string'
       OR (e.v #>> '{}') !~ '^https://'
       OR (e.v #>> '{}') ~ '[[:space:]<>"'']'
  ) THEN
    RAISE EXCEPTION 'invalid_photos' USING ERRCODE = 'P0001';
  END IF;
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post() FROM PUBLIC, anon, authenticated;

-- 좋아요·댓글 수: 클라이언트 임의 설정 금지. SECURITY DEFINER 동기화 트리거(postgres)와 service_role만.
-- (이 함수는 DEFINER가 아니어야 current_user로 호출자를 구분할 수 있다.)
CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NOT DISTINCT FROM 'service_role' THEN
    RETURN NEW;
  END IF;
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.likes_count := 0;
    NEW.comments_count := 0;
  ELSE
    NEW.likes_count := OLD.likes_count;
    NEW.comments_count := OLD.comments_count;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_post_counts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_posts_guard ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post();
DROP TRIGGER IF EXISTS trg_lounge_posts_guard_counts ON public.lounge_posts;
CREATE TRIGGER trg_lounge_posts_guard_counts
  BEFORE INSERT OR UPDATE ON public.lounge_posts
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_post_counts();

-- -------------------------------------------------------------------------
-- 5. lounge_post_comments (+ 댓글 수, 알림)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lounge_post_comments_post_idx ON public.lounge_post_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS lounge_post_comments_user_idx ON public.lounge_post_comments (user_id);

CREATE OR REPLACE FUNCTION public.okbm_lounge_guard_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM public.okbm_rpc_rate_limit('lounge_comment', 20);
  END IF;
  NEW.body := btrim(NEW.body);
  NEW.created_at := now();
  NEW.nickname := public.okbm_lounge_author_nickname(NEW.user_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_guard_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_comments_guard ON public.lounge_post_comments;
CREATE TRIGGER trg_lounge_post_comments_guard
  BEFORE INSERT ON public.lounge_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_guard_comment();

-- 댓글 수 +1/−1, 글쓴이(본인 제외)에게 알림. 알림 id는 댓글 id로 정해져 중복되지 않는다.
CREATE OR REPLACE FUNCTION public.okbm_lounge_after_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
  v_owner text;
  v_title text;
  v_category text;
  v_kind text;
  v_is_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.lounge_posts
      SET comments_count = GREATEST(0, comments_count - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  UPDATE public.lounge_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id
    RETURNING id, user_id, title, category INTO v_post_id, v_owner, v_title, v_category;
  IF NOT FOUND OR v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users u WHERE u.id = NEW.user_id AND u.is_admin IS TRUE)
    INTO v_is_admin;
  v_kind := CASE WHEN v_category = 'suggestion' AND v_is_admin THEN 'lounge_reply' ELSE 'lounge_comment' END;

  INSERT INTO public.user_notifications (
    id, user_id, kind, title, body, related_id, related_spot_id, related_spot_name, is_read
  ) VALUES (
    left('ln_c_' || NEW.id::text, 180),
    v_owner,
    v_kind,
    CASE WHEN v_kind = 'lounge_reply' THEN '건의에 운영팀 답변이 달렸습니다' ELSE '내 글에 댓글이 달렸습니다' END,
    '[' || left(COALESCE(v_title, ''), 40) || '] ' || left(NEW.body, 80),
    v_post_id::text,
    '',
    '',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_after_comment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_comments_after ON public.lounge_post_comments;
CREATE TRIGGER trg_lounge_post_comments_after
  AFTER INSERT OR DELETE ON public.lounge_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_after_comment();

-- -------------------------------------------------------------------------
-- 6. lounge_post_likes (+ 좋아요 수)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lounge_post_likes (
  post_id uuid NOT NULL REFERENCES public.lounge_posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS lounge_post_likes_user_idx ON public.lounge_post_likes (user_id);

CREATE OR REPLACE FUNCTION public.okbm_lounge_after_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.lounge_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  UPDATE public.lounge_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.okbm_lounge_after_like() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lounge_post_likes_after ON public.lounge_post_likes;
CREATE TRIGGER trg_lounge_post_likes_after
  AFTER INSERT OR DELETE ON public.lounge_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.okbm_lounge_after_like();

-- -------------------------------------------------------------------------
-- 7. RLS · 권한
--    Supabase 기본 권한은 새 테이블에 anon까지 전부 준다 → 먼저 회수하고 필요한 것만 준다.
-- -------------------------------------------------------------------------
ALTER TABLE public.lounge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_post_likes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts,
  public.lounge_post_comments, public.lounge_post_likes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts,
  public.lounge_post_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lounge_events, public.lounge_guides, public.lounge_posts TO authenticated;
GRANT INSERT, DELETE ON TABLE public.lounge_post_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.lounge_post_likes TO authenticated;

REVOKE ALL ON FUNCTION public.get_spot_reviews(text, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_spot_reviews(text, integer, timestamptz) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_top_reviewed_spots(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_reviewed_spots(integer, integer) TO anon, authenticated, service_role;

-- RLS를 우회하는 TRUNCATE는 클라이언트 역할에 필요 없음 (기존 comments·talks·feed_reports 포함, 9/29 점검에서 남아 있음 확인)
REVOKE TRUNCATE ON TABLE public.comments, public.talks, public.feed_reports FROM anon, authenticated;

-- 행사·가이드: 공개(숨김은 관리자만), 쓰기는 관리자
DROP POLICY IF EXISTS lounge_events_select ON public.lounge_events;
CREATE POLICY lounge_events_select ON public.lounge_events
  FOR SELECT USING (is_active OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_events_admin_write ON public.lounge_events;
CREATE POLICY lounge_events_admin_write ON public.lounge_events
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

DROP POLICY IF EXISTS lounge_guides_select ON public.lounge_guides;
CREATE POLICY lounge_guides_select ON public.lounge_guides
  FOR SELECT USING (is_active OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_guides_admin_write ON public.lounge_guides;
CREATE POLICY lounge_guides_admin_write ON public.lounge_guides
  FOR ALL USING ((SELECT public.okbm_is_admin())) WITH CHECK ((SELECT public.okbm_is_admin()));

-- 글: 건의는 작성자·관리자만 보임
DROP POLICY IF EXISTS lounge_posts_select ON public.lounge_posts;
CREATE POLICY lounge_posts_select ON public.lounge_posts
  FOR SELECT USING (
    NOT is_private
    OR user_id = (SELECT public.okbm_uid())
    OR (SELECT public.okbm_is_admin())
  );
DROP POLICY IF EXISTS lounge_posts_insert_own ON public.lounge_posts;
CREATE POLICY lounge_posts_insert_own ON public.lounge_posts
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT public.okbm_uid()));
DROP POLICY IF EXISTS lounge_posts_update_own ON public.lounge_posts;
CREATE POLICY lounge_posts_update_own ON public.lounge_posts
  FOR UPDATE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()))
  WITH CHECK (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));
DROP POLICY IF EXISTS lounge_posts_delete_own ON public.lounge_posts;
CREATE POLICY lounge_posts_delete_own ON public.lounge_posts
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 댓글: 부모 글이 보이는 사람만 보고 쓴다 (하위 쿼리에 lounge_posts RLS가 적용됨)
DROP POLICY IF EXISTS lounge_post_comments_select ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_select ON public.lounge_post_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id));
DROP POLICY IF EXISTS lounge_post_comments_insert_own ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_insert_own ON public.lounge_post_comments
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT public.okbm_uid())
    AND EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id)
  );
DROP POLICY IF EXISTS lounge_post_comments_delete_own ON public.lounge_post_comments;
CREATE POLICY lounge_post_comments_delete_own ON public.lounge_post_comments
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()) OR (SELECT public.okbm_is_admin()));

-- 좋아요: 본인 것만. 건의 글에는 좋아요 없음
DROP POLICY IF EXISTS lounge_post_likes_select_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_select_own ON public.lounge_post_likes
  FOR SELECT USING (user_id = (SELECT public.okbm_uid()));
DROP POLICY IF EXISTS lounge_post_likes_insert_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_insert_own ON public.lounge_post_likes
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT public.okbm_uid())
    AND EXISTS (SELECT 1 FROM public.lounge_posts p WHERE p.id = post_id AND NOT p.is_private)
  );
DROP POLICY IF EXISTS lounge_post_likes_delete_own ON public.lounge_post_likes;
CREATE POLICY lounge_post_likes_delete_own ON public.lounge_post_likes
  FOR DELETE USING (user_id = (SELECT public.okbm_uid()));

-- -------------------------------------------------------------------------
-- 8. 신고: 대상 종류 구분. 피드 신고는 기본값 'feed'라 기존 코드 그대로 동작.
--    고유 키 (feed_id, reporter_id) → (target_type, feed_id, reporter_id). 피드끼리는 의미가 같다.
-- -------------------------------------------------------------------------
ALTER TABLE public.feed_reports ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'feed';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_reports_target_type_chk') THEN
    ALTER TABLE public.feed_reports
      ADD CONSTRAINT feed_reports_target_type_chk
      CHECK (target_type IN ('feed', 'lounge_post', 'lounge_comment', 'spot_review'));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS feed_reports_target_reporter_uidx
  ON public.feed_reports (target_type, feed_id, reporter_id)
  WHERE reporter_id IS NOT NULL AND reporter_id <> '';
DROP INDEX IF EXISTS public.feed_reports_feed_reporter_uidx;

-- -------------------------------------------------------------------------
-- 9. 탈퇴: 라운지 데이터도 한 트랜잭션에서 삭제 (마스터 6-6과 같은 함수, 라운지 3줄 추가)
--    내가 남의 글에 누른 좋아요·단 댓글을 지우면 AFTER 트리거가 개수를 맞춘다.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.okbm_delete_account_data(p_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids text[];
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT btrim(x) FROM unnest(COALESCE(p_ids, ARRAY[]::text[])) AS x
    WHERE btrim(COALESCE(x, '')) <> ''
  ) INTO v_ids;
  IF COALESCE(array_length(v_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  DELETE FROM public.feed_likes WHERE user_id = ANY (v_ids);
  DELETE FROM public.feeds WHERE user_id = ANY (v_ids);
  DELETE FROM public.proposals WHERE user_id = ANY (v_ids);
  DELETE FROM public.spot_corrections WHERE user_id = ANY (v_ids);
  DELETE FROM public.trips WHERE host_id = ANY (v_ids);
  DELETE FROM public.user_notifications WHERE user_id = ANY (v_ids);
  DELETE FROM public.user_blocks WHERE blocker_id = ANY (v_ids) OR blocked_id = ANY (v_ids);
  DELETE FROM public.feed_reports WHERE reporter_id = ANY (v_ids);
  DELETE FROM public.comments WHERE user_id = ANY (v_ids);
  DELETE FROM public.talks WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_post_likes WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_post_comments WHERE user_id = ANY (v_ids);
  DELETE FROM public.lounge_posts WHERE user_id = ANY (v_ids);
  DELETE FROM public.direct_threads WHERE user_a = ANY (v_ids) OR user_b = ANY (v_ids);
  DELETE FROM public.spot_media_contributions WHERE actor_id = ANY (v_ids);
  DELETE FROM public.users WHERE id = ANY (v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.okbm_delete_account_data(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.okbm_delete_account_data(text[]) TO service_role;

COMMIT;

-- =========================================================================
-- 검증 (SQL Editor는 마지막 결과만 보여 주므로 한 칸으로 모음)
-- =========================================================================
SELECT jsonb_pretty(jsonb_build_object(
  'tables_rls', (SELECT jsonb_object_agg(c.relname, c.relrowsecurity)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'lounge\_%'),
  'policies', (SELECT jsonb_object_agg(t.tablename, t.names) FROM (
    SELECT tablename, jsonb_agg(policyname ORDER BY policyname) AS names
    FROM pg_policies WHERE schemaname = 'public' AND (tablename LIKE 'lounge\_%' OR tablename = 'comments')
    GROUP BY tablename) t),
  'triggers', (SELECT jsonb_agg(DISTINCT event_object_table || '.' || trigger_name)
    FROM information_schema.triggers WHERE trigger_schema = 'public'
      AND (event_object_table LIKE 'lounge\_%' OR event_object_table = 'comments')),
  'functions', (SELECT jsonb_agg(DISTINCT p.proname ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (p.proname LIKE 'okbm\_lounge\_%'
      OR p.proname IN ('get_spot_reviews', 'get_top_reviewed_spots'))),
  'anon_grants', (SELECT jsonb_object_agg(g.table_name, g.privs) FROM (
    SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'
      AND (table_name LIKE 'lounge\_%' OR table_name IN ('comments', 'talks', 'feed_reports'))
    GROUP BY table_name) g),
  'truncate_left', (SELECT COALESCE(jsonb_agg(table_name || ':' || grantee), '[]'::jsonb)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND privilege_type = 'TRUNCATE' AND grantee IN ('anon', 'authenticated')
      AND (table_name LIKE 'lounge\_%' OR table_name IN ('comments', 'talks', 'feed_reports'))),
  'feed_reports', jsonb_build_object(
    'target_types', (SELECT jsonb_object_agg(target_type, n) FROM (
      SELECT target_type, count(*) AS n FROM public.feed_reports GROUP BY target_type) x),
    'indexes', (SELECT jsonb_agg(indexname ORDER BY indexname)
      FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'feed_reports')),
  'comments_has_updated_at', EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'updated_at'),
  'delete_fn_has_lounge', position('lounge_posts' IN pg_get_functiondef('public.okbm_delete_account_data(text[])'::regprocedure)) > 0,
  'anon_can_call', jsonb_build_object(
    'get_spot_reviews', has_function_privilege('anon', 'public.get_spot_reviews(text,integer,timestamptz)', 'execute'),
    'get_top_reviewed_spots', has_function_privilege('anon', 'public.get_top_reviewed_spots(integer,integer)', 'execute'),
    'okbm_lounge_author_nickname', has_function_privilege('anon', 'public.okbm_lounge_author_nickname(text)', 'execute')),
  'row_counts', jsonb_build_object(
    'spots', (SELECT count(*) FROM public.spots),
    'users', (SELECT count(*) FROM public.users),
    'comments', (SELECT count(*) FROM public.comments),
    'feed_reports', (SELECT count(*) FROM public.feed_reports))
)) AS apply_result;

-- =========================================================================
-- 되돌리기 (필요할 때만, 데이터가 지워짐 — 실행 전 백업)
-- BEGIN;
--   DROP TABLE IF EXISTS public.lounge_post_likes, public.lounge_post_comments,
--     public.lounge_posts, public.lounge_guides, public.lounge_events;
--   DROP FUNCTION IF EXISTS public.get_spot_reviews(text, integer, timestamptz);
--   DROP FUNCTION IF EXISTS public.get_top_reviewed_spots(integer, integer);
--   DROP POLICY IF EXISTS comments_select_own ON public.comments;
--   CREATE POLICY comments_select_public ON public.comments FOR SELECT USING (true);
--   DROP TRIGGER IF EXISTS trg_lounge_comments_guard ON public.comments;
--   DROP INDEX IF EXISTS public.comments_spot_user_uidx;
--   ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_rating_chk,
--     DROP CONSTRAINT IF EXISTS comments_text_len_chk;
--   CREATE UNIQUE INDEX IF NOT EXISTS feed_reports_feed_reporter_uidx ON public.feed_reports (feed_id, reporter_id)
--     WHERE reporter_id IS NOT NULL AND reporter_id <> '';
--   DROP INDEX IF EXISTS public.feed_reports_target_reporter_uidx;
--   -- okbm_delete_account_data는 마스터 6-6 원본으로 다시 실행
-- COMMIT;
-- =========================================================================
