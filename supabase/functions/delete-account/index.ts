import { createClient } from "npm:@supabase/supabase-js@2";
import { getServiceRoleKey, getSupabaseUrl, handleOptions, jsonResponse } from "./social-session.ts";

function collectAccountIds(okbmUserId: string, authUserId: string): string[] {
  const ids: string[] = [];
  const push = (value: string) => {
    const s = String(value || "").trim();
    if (s && ids.indexOf(s) === -1) ids.push(s);
  };
  push(okbmUserId);
  push(authUserId);
  const plain = okbmUserId.replace(/^(kakao_|naver_|apple_|google_)/, "");
  push(plain);
  if (okbmUserId.indexOf("kakao_") === 0 && plain) push("kakao_" + plain);
  if (okbmUserId.indexOf("naver_") === 0 && plain) push("naver_" + plain);
  return ids;
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
    const appMeta = (authUser.app_metadata || {}) as Record<string, unknown>;
    const okbmUserId = String(appMeta.okbm_user_id || authUser.id).trim();
    const accountIds = collectAccountIds(okbmUserId, authUser.id);

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
      const { data: threads } = await admin
        .from("direct_threads")
        .select("id")
        .or(`user_a.eq.${id},user_b.eq.${id}`);
      if (Array.isArray(threads)) {
        for (const thread of threads) {
          await admin.from("direct_threads").delete().eq("id", thread.id);
        }
      }
    }

    for (const id of accountIds) {
      await admin.from("users").delete().eq("id", id);
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(authUser.id);
    if (authDeleteError) {
      console.error("[delete-account] auth.users", authDeleteError);
      return jsonResponse(req, { error: "auth_user_delete_failed", message: authDeleteError.message }, 500);
    }

    return jsonResponse(req, { ok: true, deleted_user_id: okbmUserId }, 200);
  } catch (err) {
    console.error("[delete-account]", err);
    return jsonResponse(req, {
      error: "delete_failed",
      message: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
