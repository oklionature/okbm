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

    return jsonResponse(req, { ok: true, deleted_user_id: okbmUserId || authUser.id }, 200);
  } catch (err) {
    // 내부 오류 문구는 로그에만 남긴다.
    console.error("[delete-account]", err);
    return jsonResponse(req, { error: "delete_failed" }, 500);
  }
});
