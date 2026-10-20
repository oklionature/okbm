// 운영자 카카오톡 신고 알림 (2026-10-20): 새 신고를 운영자 카카오톡 「나와의 채팅」으로 보낸다.
//
// 연결: 운영 화면(ops.html)에서 관리자가 카카오로 talk_message에 동의하면 code가 돌아온다.
//       action=link로 code를 토큰으로 바꿔 okbm_admin_alert_settings에 저장하고 확인 메시지를 보낸다.
// 알림: feed_reports 트리거(SUPABASE_H11_ADMIN_KAKAO_ALERT.sql)가 action=report로 부른다.
//       매일 한국 오전 9시 cron이 action=daily로 불러 토큰을 갱신하고, 미처리 신고가 있으면 알린다.
// 권한: link·status는 관리자 JWT(okbm_is_admin), report·daily는 x-okbm-hook 비밀값.
//       pg_net이 JWT 없이 부르므로 대시보드에서 「Verify JWT」를 끈다.
// 비밀값: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET(카카오 로그인 클라이언트 시크릿)
// 대시보드 편집기로도 배포할 수 있게 다른 파일을 가져오지 않는다.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const OPS_URL = "https://romanticroute.kr/ops.html";
const NO_SESSION = { persistSession: false, autoRefreshToken: false };
const ALLOWED_ORIGINS = ["https://romanticroute.kr", "https://www.romanticroute.kr", "http://localhost:5178"];
const TARGET_LABEL: Record<string, string> = {
  feed: "피드",
  lounge_post: "라운지 글",
  lounge_comment: "라운지 댓글",
  spot_review: "박지 후기",
};

function corsHeaders(req: Request): Record<string, string> {
  const origin = String(req.headers.get("Origin") || "").replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (ALLOWED_ORIGINS.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function firstKey(raw: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    return String(parsed.default || Object.values(parsed)[0] || "");
  } catch {
    return raw;
  }
}

const serviceKey = () =>
  firstKey(Deno.env.get("SUPABASE_SECRET_KEYS") || "") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = () =>
  firstKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const restKey = () => String(Deno.env.get("KAKAO_REST_API_KEY") || "").trim();
const clientSecret = () => String(Deno.env.get("KAKAO_CLIENT_SECRET") || "").trim();

type Settings = {
  hook_secret: string;
  kakao_access_token: string | null;
  kakao_access_expires_at: string | null;
  kakao_refresh_token: string | null;
  kakao_refresh_expires_at: string | null;
  linked_at: string | null;
};

async function loadSettings(admin: SupabaseClient): Promise<Settings | null> {
  const { data } = await admin.from("okbm_admin_alert_settings").select("*").eq("id", 1).maybeSingle();
  return data as Settings | null;
}

const inSeconds = (s: unknown) => (Number(s) > 0 ? new Date(Date.now() + Number(s) * 1000).toISOString() : null);

// code 또는 refresh_token으로 카카오 토큰을 받는다. 새 refresh_token은 남은 기간이 한 달 아래일 때만 온다.
async function kakaoToken(params: Record<string, string>): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({ client_id: restKey(), ...params });
  if (clientSecret()) form.set("client_secret", clientSecret());
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("kakao_token " + res.status + " " + String(data?.error_code || data?.error || ""));
  return data;
}

async function saveTokens(admin: SupabaseClient, t: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const patch: Record<string, unknown> = {
    kakao_access_token: t.access_token,
    kakao_access_expires_at: inSeconds(t.expires_in),
    ...extra,
  };
  if (t.refresh_token) {
    patch.kakao_refresh_token = t.refresh_token;
    patch.kakao_refresh_expires_at = inSeconds(t.refresh_token_expires_in);
  }
  await admin.from("okbm_admin_alert_settings").update(patch).eq("id", 1);
}

// 저장된 access 토큰을 돌려준다. 10분 안에 끝나거나 force면 refresh로 새로 받는다.
async function accessToken(admin: SupabaseClient, s: Settings, force = false): Promise<string> {
  if (!s.kakao_refresh_token) throw new Error("not_linked");
  const exp = s.kakao_access_expires_at ? Date.parse(s.kakao_access_expires_at) : 0;
  if (!force && s.kakao_access_token && exp - Date.now() > 10 * 60 * 1000) return s.kakao_access_token;
  const t = await kakaoToken({ grant_type: "refresh_token", refresh_token: s.kakao_refresh_token });
  await saveTokens(admin, t);
  return String(t.access_token);
}

async function sendMemo(token: string, text: string): Promise<void> {
  const template = {
    object_type: "text",
    text: text.slice(0, 200),
    link: { web_url: OPS_URL, mobile_web_url: OPS_URL },
    button_title: "운영 화면 열기",
  };
  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(template) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error("kakao_memo " + res.status + " " + String(data?.code || ""));
  }
}

async function pendingCount(admin: SupabaseClient): Promise<number> {
  const { count } = await admin.from("feed_reports").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count || 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "bad_request" }, 400);
    }
    const action = String(body?.action || "");

    const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
    const sKey = serviceKey();
    if (!supabaseUrl || !sKey) throw new Error("supabase keys missing");
    const admin = createClient(supabaseUrl, sKey, { auth: NO_SESSION });
    const settings = await loadSettings(admin);
    if (!settings) return json(req, { error: "not_installed" }, 500);

    // ── 트리거·cron 호출 (비밀값 확인)
    if (action === "report" || action === "daily") {
      if (req.headers.get("x-okbm-hook") !== settings.hook_secret) return json(req, { error: "forbidden" }, 403);
      if (!settings.kakao_refresh_token || !restKey()) return json(req, { ok: true, skipped: "not_linked" });

      if (action === "daily") {
        const token = await accessToken(admin, settings, true);
        const pending = await pendingCount(admin);
        if (pending > 0) await sendMemo(token, `[낭만루트] 아직 처리하지 않은 신고가 ${pending}건 있어요.\n운영 화면에서 확인해 주세요.`);
        return json(req, { ok: true, pending });
      }

      const reportId = body?.report_id;
      const { data: report } = await admin
        .from("feed_reports")
        .select("target_type,reason_label,reason")
        .eq("id", reportId as string)
        .maybeSingle();
      const kind = TARGET_LABEL[String(report?.target_type || "feed")] || "글";
      const reason = String(report?.reason_label || report?.reason || "사유 없음").slice(0, 60);
      const pending = await pendingCount(admin);
      const token = await accessToken(admin, settings);
      await sendMemo(token, `[낭만루트] 새 신고가 들어왔어요.\n종류: ${kind}\n사유: ${reason}\n처리 대기: ${pending}건`);
      return json(req, { ok: true });
    }

    // ── 운영 화면 호출 (관리자만)
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json(req, { error: "missing_authorization" }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user?.id) return json(req, { error: "invalid_session" }, 401);
    const asUser = createClient(supabaseUrl, anonKey(), {
      auth: NO_SESSION,
      global: { headers: { Authorization: "Bearer " + jwt } },
    });
    const { data: isAdmin } = await asUser.rpc("okbm_is_admin");
    if (isAdmin !== true) return json(req, { error: "forbidden" }, 403);

    if (action === "status") {
      if (!restKey()) return json(req, { ok: true, configured: false });
      const authorizeUrl = "https://kauth.kakao.com/oauth/authorize?" + new URLSearchParams({
        client_id: restKey(),
        redirect_uri: OPS_URL,
        response_type: "code",
        scope: "talk_message",
        state: "kakao_alert",
      });
      return json(req, {
        ok: true,
        configured: true,
        linked: !!settings.kakao_refresh_token,
        linked_at: settings.linked_at,
        refresh_expires_at: settings.kakao_refresh_expires_at,
        authorize_url: authorizeUrl,
      });
    }

    if (action === "link") {
      const code = String(body?.code || "").trim();
      if (!code || !restKey()) return json(req, { error: "bad_request" }, 400);
      const t = await kakaoToken({ grant_type: "authorization_code", redirect_uri: OPS_URL, code });
      const scopes = String(t.scope || "");
      if (scopes && !scopes.split(" ").includes("talk_message")) return json(req, { error: "no_talk_message_scope" }, 400);
      const { data: me } = await asUser.rpc("okbm_uid");
      await saveTokens(admin, t, { linked_by: me || null, linked_at: new Date().toISOString() });
      await sendMemo(String(t.access_token), "[낭만루트] 카카오톡 신고 알림이 연결됐어요.\n새 신고가 들어오면 여기로 알려 드릴게요.");
      return json(req, { ok: true });
    }

    if (action === "test") {
      const token = await accessToken(admin, settings);
      await sendMemo(token, "[낭만루트] 신고 알림 테스트예요. 이 메시지가 보이면 잘 연결된 거예요.");
      return json(req, { ok: true });
    }

    return json(req, { error: "bad_request" }, 400);
  } catch (e) {
    console.error("[admin-kakao-alert]", e);
    const msg = String((e as Error)?.message || "");
    return json(req, { error: msg.startsWith("not_linked") ? "not_linked" : "failed", detail: msg.slice(0, 80) }, 500);
  }
});
