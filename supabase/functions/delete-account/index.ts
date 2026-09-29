import { createClient, type User } from "npm:@supabase/supabase-js@2";
import { getServiceRoleKey, getSupabaseUrl, handleOptions, jsonResponse } from "./social-session.ts";

type AdminClient = ReturnType<typeof createClient>;

function uniqueIds(...values: string[]): string[] {
  const ids: string[] = [];
  for (const value of values) {
    const s = String(value || "").trim();
    if (s && ids.indexOf(s) === -1) ids.push(s);
  }
  return ids;
}

function plantedOkbmUserId(authUser: User): string {
  const appMeta = (authUser.app_metadata || {}) as Record<string, unknown>;
  return String(appMeta.okbm_user_id || "").trim();
}

function collectAccountIds(okbmUserId: string, authUserId: string): string[] {
  return uniqueIds(okbmUserId, authUserId);
}

async function canDeletePublicUserRow(
  admin: AdminClient,
  authUser: User,
  candidateId: string,
): Promise<boolean> {
  const id = String(candidateId || "").trim();
  if (!id) return false;

  const planted = plantedOkbmUserId(authUser);
  if (id !== authUser.id && id !== planted) return false;

  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    console.error("[delete-account] users ownership lookup", error);
    return false;
  }
  return String(data?.id || "").trim() === id;
}

async function deleteDirectThreadsForUser(admin: AdminClient, userId: string) {
  const id = String(userId || "").trim();
  if (!id) return;

  const { data: asA, error: errA } = await admin
    .from("direct_threads")
    .select("id")
    .eq("user_a", id);
  if (errA && errA.code !== "PGRST116" && errA.code !== "42P01") {
    console.error("[delete-account] direct_threads.user_a", errA);
  }

  const { data: asB, error: errB } = await admin
    .from("direct_threads")
    .select("id")
    .eq("user_b", id);
  if (errB && errB.code !== "PGRST116" && errB.code !== "42P01") {
    console.error("[delete-account] direct_threads.user_b", errB);
  }

  const threadIds = uniqueIds(
    ...(Array.isArray(asA) ? asA.map((row) => String(row.id || "")) : []),
    ...(Array.isArray(asB) ? asB.map((row) => String(row.id || "")) : []),
  );
  for (const threadId of threadIds) {
    const { error } = await admin.from("direct_threads").delete().eq("id", threadId);
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      console.error("[delete-account] direct_threads.id", error);
    }
  }
}

const R2_PUBLIC_BASE = "https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/";

function pushPhoto(out: Set<string>, value: unknown) {
  if (typeof value === "string") {
    const s = value.trim();
    if (s.startsWith(R2_PUBLIC_BASE)) out.add(s);
  } else if (Array.isArray(value)) {
    for (const v of value) pushPhoto(out, v);
  }
}

// 본인 피드·원정대·프로필·라운지 글에 저장된 R2 사진 URL만 모은다 (최대 200개, Worker 한도).
async function collectUserPhotoUrls(admin: AdminClient, ids: string[]): Promise<string[]> {
  const out = new Set<string>();
  if (!ids.length) return [];
  try {
    const [feeds, trips, users, loungePosts] = await Promise.all([
      admin.from("feeds").select("photos,photo,ready_shot_photo").in("user_id", ids),
      admin.from("trips").select("photos").in("host_id", ids),
      admin.from("users").select("photo_url,hero_cover_url").in("id", ids),
      admin.from("lounge_posts").select("photos").in("user_id", ids),
    ]);
    for (const r of (feeds.data || []) as Record<string, unknown>[]) {
      pushPhoto(out, r.photos);
      pushPhoto(out, r.photo);
      pushPhoto(out, r.ready_shot_photo);
    }
    for (const r of (trips.data || []) as Record<string, unknown>[]) pushPhoto(out, r.photos);
    for (const r of (users.data || []) as Record<string, unknown>[]) {
      pushPhoto(out, r.photo_url);
      pushPhoto(out, r.hero_cover_url);
    }
    for (const r of (loungePosts.data || []) as Record<string, unknown>[]) pushPhoto(out, r.photos);
  } catch (e) {
    console.error("[delete-account] collect photos", e);
  }
  return Array.from(out).slice(0, 200);
}

async function deleteR2Photos(urls: string[]): Promise<number> {
  const secret = String(Deno.env.get("UPLOAD_DELETE_SECRET") || "").trim();
  const workerUrl = String(Deno.env.get("UPLOAD_WORKER_URL") || "https://romantic-upload-worker.ggumfree.workers.dev").replace(/\/+$/, "");
  if (!urls.length || !secret) return 0;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(workerUrl + "/delete", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + secret },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      console.error("[delete-account] r2 delete", res.status);
      return 0;
    }
    const data = await res.json();
    return Number(data?.deleted || 0);
  } catch (e) {
    console.error("[delete-account] r2 delete", e);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// okbm_delete_account_data RPC가 아직 없을 때만 쓰는 예전 삭제 경로 (트랜잭션 아님).
async function legacyDeleteAccountRows(admin: AdminClient, authUser: User, accountIds: string[]) {
  const deleteByColumn = async (table: string, column: string) => {
    for (const id of accountIds) {
      const { error } = await admin.from(table).delete().eq(column, id);
      if (error && error.code !== "PGRST116" && error.code !== "42P01") {
        console.error(`[delete-account] ${table}.${column}`, error);
      }
    }
  };

  await deleteByColumn("feed_likes", "user_id");
  await deleteByColumn("feeds", "user_id");
  await deleteByColumn("proposals", "user_id");
  await deleteByColumn("spot_corrections", "user_id");
  await deleteByColumn("trips", "host_id");
  await deleteByColumn("user_notifications", "user_id");
  await deleteByColumn("user_blocks", "blocker_id");
  await deleteByColumn("user_blocks", "blocked_id");
  await deleteByColumn("feed_reports", "reporter_id");
  await deleteByColumn("comments", "user_id");
  await deleteByColumn("talks", "user_id");
  await deleteByColumn("lounge_post_likes", "user_id");
  await deleteByColumn("lounge_post_comments", "user_id");
  await deleteByColumn("lounge_posts", "user_id");

  for (const id of accountIds) {
    await deleteDirectThreadsForUser(admin, id);
  }

  for (const id of accountIds) {
    if (!(await canDeletePublicUserRow(admin, authUser, id))) continue;
    const { error } = await admin.from("users").delete().eq("id", id);
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      console.error("[delete-account] users.id", error);
    }
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();
    if (!serviceKey) throw new Error("service role key missing");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse(req, { error: "missing_authorization" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user?.id) {
      return jsonResponse(req, { error: "invalid_session" }, 401);
    }

    const authUser = userData.user;
    const okbmUserId = plantedOkbmUserId(authUser);
    const accountIds = collectAccountIds(okbmUserId, authUser.id);

    // 데이터를 지우기 전에 이 사용자가 올린 사진 URL을 모아 둔다 (지운 뒤엔 찾을 수 없음)
    const photoUrls = await collectUserPhotoUrls(admin, accountIds);

    // accountIds는 검증된 JWT의 auth id와 서버가 app_metadata에 심은 okbm_user_id뿐이다
    // (클라이언트 입력 없음). 1순위: 한 트랜잭션으로 전부 삭제 (마스터 SQL 6-6).
    const { error: rpcError } = await admin.rpc("okbm_delete_account_data", { p_ids: accountIds });
    if (rpcError) {
      if (rpcError.code === "PGRST202") {
        // 함수가 아직 DB에 없을 때(마스터 SQL 적용 전)만 예전 방식으로 삭제
        console.warn("[delete-account] okbm_delete_account_data missing, legacy path");
        await legacyDeleteAccountRows(admin, authUser, accountIds);
      } else {
        // 데이터가 남은 채 auth 계정만 지워지지 않도록 여기서 멈춘다. 재시도 가능.
        console.error("[delete-account] okbm_delete_account_data", rpcError);
        return jsonResponse(req, { error: "delete_failed" }, 500);
      }
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUser.id);
    if (authDeleteError) {
      console.error("[delete-account] auth.users", authDeleteError);
      return jsonResponse(req, { error: "auth_user_delete_failed" }, 500);
    }

    // 사진 삭제는 계정 삭제가 끝난 뒤 최선 노력으로 한다 (실패해도 탈퇴는 완료).
    const photosDeleted = await deleteR2Photos(photoUrls);

    return jsonResponse(req, { ok: true, deleted_user_id: okbmUserId || authUser.id, photos_deleted: photosDeleted }, 200);
  } catch (err) {
    // 내부 오류 문구는 로그에만 남긴다.
    console.error("[delete-account]", err);
    return jsonResponse(req, { error: "delete_failed" }, 500);
  }
});
