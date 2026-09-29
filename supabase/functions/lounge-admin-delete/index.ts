// 백패커 라운지 관리자 삭제 (2026-09-29): 행사를 지우고, 그 행사가 쓰던 우리 R2 포스터도 지운다.
//
// 권한: 호출한 사람의 JWT로 읽고 지운다 → RLS(lounge_events_admin_write = okbm_is_admin())가 판단한다.
//       예전 클라이언트 삭제(okbmDeleteRowsConfirmed)와 같은 기준이고, 이 함수가 더 하는 일은
//       "방금 지운 행사의 포스터 1장을 R2에서 지우기"뿐이다. Worker 삭제 비밀값은 서버에만 있다.
// 포스터: 우리 R2의 lounge/ 아래이고, 다른 행사·글이 같은 주소를 안 쓸 때만 지운다.
//         주최 측 사이트를 링크한 외부 포스터는 건드리지 않는다.
//
// 요청: POST { "kind": "event", "id": "<uuid>" }
// 응답: 200 { ok: true, poster: "deleted" | "kept" | "external" | "none" | "failed" }
//       400 bad_request · 401 missing_authorization/invalid_session · 403 forbidden · 404 not_found · 500 delete_failed
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAnonKey, getServiceRoleKey, getSupabaseUrl, handleOptions, jsonResponse } from "../_shared/social-session.ts";

const R2_PUBLIC_BASE = "https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev/";
const LOUNGE_PREFIX = R2_PUBLIC_BASE + "lounge/";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_SESSION = { persistSession: false, autoRefreshToken: false };

// delete-account와 같은 방식으로 Worker /delete를 부른다. 실패하면 0.
async function deleteR2(urls: string[]): Promise<number> {
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
      console.error("[lounge-admin-delete] r2 delete", res.status);
      return 0;
    }
    const data = await res.json();
    return Number(data?.deleted || 0);
  } catch (e) {
    console.error("[lounge-admin-delete] r2 delete", e);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonResponse(req, { error: "method_not_allowed" }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse(req, { error: "missing_authorization" }, 401);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "bad_request" }, 400);
    }
    const kind = String(body?.kind || "");
    const id = String(body?.id || "").trim();
    if (kind !== "event" || !UUID_RE.test(id)) return jsonResponse(req, { error: "bad_request" }, 400);

    const supabaseUrl = getSupabaseUrl();
    const serviceKey = getServiceRoleKey();
    const anonKey = getAnonKey();
    if (!serviceKey || !anonKey) throw new Error("supabase keys missing");

    const admin = createClient(supabaseUrl, serviceKey, { auth: NO_SESSION });
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user?.id) return jsonResponse(req, { error: "invalid_session" }, 401);

    // 호출한 사람 권한으로 읽고 지운다 (관리자가 아니면 RLS가 0행으로 막는다)
    const asUser = createClient(supabaseUrl, anonKey, {
      auth: NO_SESSION,
      global: { headers: { Authorization: "Bearer " + jwt } },
    });
    const { data: row, error: readError } = await asUser
      .from("lounge_events").select("id,poster_url").eq("id", id).maybeSingle();
    if (readError) {
      console.error("[lounge-admin-delete] read", readError);
      return jsonResponse(req, { error: "delete_failed" }, 500);
    }
    if (!row) return jsonResponse(req, { error: "not_found" }, 404);

    const { data: gone, error: deleteError } = await asUser
      .from("lounge_events").delete().eq("id", id).select("id");
    if (deleteError) {
      console.error("[lounge-admin-delete] delete", deleteError);
      return jsonResponse(req, { error: "delete_failed" }, 500);
    }
    if (!Array.isArray(gone) || !gone.length) return jsonResponse(req, { error: "forbidden" }, 403);

    // 행은 지워졌다. 포스터는 최선 노력 (실패해도 삭제는 완료)
    const poster = String((row as Record<string, unknown>).poster_url || "").trim();
    let result = "none";
    if (poster) {
      if (!poster.startsWith(LOUNGE_PREFIX)) {
        result = "external";
      } else {
        const [events, posts] = await Promise.all([
          admin.from("lounge_events").select("id").eq("poster_url", poster).limit(1),
          admin.from("lounge_posts").select("id").contains("photos", [poster]).limit(1),
        ]);
        if (events.error || posts.error) {
          // 다른 곳에서 쓰는지 확인하지 못하면 지우지 않는다
          console.error("[lounge-admin-delete] reference check", events.error || posts.error);
          result = "kept";
        } else if ((events.data || []).length || (posts.data || []).length) {
          result = "kept";
        } else {
          result = (await deleteR2([poster])) > 0 ? "deleted" : "failed";
        }
      }
    }
    return jsonResponse(req, { ok: true, poster: result }, 200);
  } catch (err) {
    console.error("[lounge-admin-delete]", err);
    return jsonResponse(req, { error: "delete_failed" }, 500);
  }
});
