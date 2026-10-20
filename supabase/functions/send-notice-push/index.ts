// 운영자 공지 푸시 (2026-10-20): 운영 화면(ops.html)에서 쓴 공지를 아이폰 앱 전체에 보낸다.
//
// 권한: 호출한 사람의 JWT로 okbm_is_admin()을 물어 관리자만 보낸다.
// 토큰: push_tokens(SUPABASE_H10_PUSH_TOKENS.sql)를 service_role로 읽는다.
// APNs: 토큰 방식(.p8). 비밀값 APNS_KEY_P8(키 파일 내용 전체)·APNS_KEY_ID를 함수 Secrets에 넣는다.
//       운영 서버(api.push.apple.com)에 먼저 보내고, BadDeviceToken이면 개발용 서버(Xcode로 설치한 앱)에 다시 보낸다.
//       두 곳 다 받지 않는 토큰(Unregistered·BadDeviceToken)은 지운다.
// 대시보드 편집기로도 배포할 수 있게 다른 파일을 가져오지 않는다.
//
// 요청: POST { "title": "...", "body": "...", "url": "/notice/...", "dry": true }
//       dry=true면 보내지 않고 받을 기기 수만 돌려준다.
// 응답: 200 { ok: true, total, sent, failed, removed } · { ok: true, total } (dry)
//       400 bad_request · 401 missing_authorization/invalid_session · 403 forbidden · 500 apns_not_configured/send_failed
import { createClient } from "npm:@supabase/supabase-js@2";

const TEAM_ID = "7KUQL7S5Q4";
const TOPIC = "com.romanticroute.app";
const APNS_HOSTS = ["https://api.push.apple.com", "https://api.sandbox.push.apple.com"];
const NO_SESSION = { persistSession: false, autoRefreshToken: false };
const ALLOWED_ORIGINS = ["https://romanticroute.kr", "https://www.romanticroute.kr", "http://localhost:5178", "http://127.0.0.1:5500"];

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

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlText = (text: string) => b64url(new TextEncoder().encode(text));

// APNs 인증 JWT. 애플은 20~60분마다 새로 만들라고 하므로 한 번 만든 값을 40분 쓴다.
let cachedJwt = { value: "", at: 0 };
async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt.value && now - cachedJwt.at < 40 * 60) return cachedJwt.value;
  const pem = String(Deno.env.get("APNS_KEY_P8") || "");
  const keyId = String(Deno.env.get("APNS_KEY_ID") || "").trim();
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const input = b64urlText(JSON.stringify({ alg: "ES256", kid: keyId })) + "." + b64urlText(JSON.stringify({ iss: TEAM_ID, iat: now }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(input)));
  cachedJwt = { value: input + "." + b64url(sig), at: now };
  return cachedJwt.value;
}

type SendResult = "sent" | "gone" | "failed";

async function sendOne(token: string, payload: string): Promise<SendResult> {
  const jwt = await apnsJwt();
  let gone = false;
  for (const host of APNS_HOSTS) {
    try {
      const res = await fetch(`${host}/3/device/${token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": TOPIC,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        },
        body: payload,
      });
      if (res.ok) return "sent";
      const reason = String((await res.json().catch(() => ({})))?.reason || "");
      if (res.status === 410 || reason === "Unregistered") return "gone";
      if (reason === "BadDeviceToken") {
        gone = true;
        continue; // 개발용 앱 토큰일 수 있으니 다음 서버로
      }
      console.error("[send-notice-push] apns", host, res.status, reason);
      return "failed";
    } catch (e) {
      console.error("[send-notice-push] apns fetch", host, e);
      return "failed";
    }
  }
  return gone ? "gone" : "failed";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  try {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json(req, { error: "missing_authorization" }, 401);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json(req, { error: "bad_request" }, 400);
    }
    const title = String(body?.title || "").trim().slice(0, 60);
    const text = String(body?.body || "").trim().slice(0, 200);
    const url = String(body?.url || "").trim();
    const dry = body?.dry === true;
    if (!dry && (!title || !text)) return json(req, { error: "bad_request" }, 400);
    if (url && !/^\/(?!\/)[^\s]{0,300}$/.test(url)) return json(req, { error: "bad_request" }, 400);

    const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "");
    const sKey = serviceKey();
    const aKey = anonKey();
    if (!supabaseUrl || !sKey || !aKey) throw new Error("supabase keys missing");

    const admin = createClient(supabaseUrl, sKey, { auth: NO_SESSION });
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user?.id) return json(req, { error: "invalid_session" }, 401);

    const asUser = createClient(supabaseUrl, aKey, {
      auth: NO_SESSION,
      global: { headers: { Authorization: "Bearer " + jwt } },
    });
    const { data: isAdmin } = await asUser.rpc("okbm_is_admin");
    if (isAdmin !== true) return json(req, { error: "forbidden" }, 403);

    const { data: rows, error: tokenError } = await admin.from("push_tokens").select("token").eq("platform", "ios");
    if (tokenError) throw tokenError;
    const tokens = (rows || []).map((r: { token: string }) => r.token);
    if (dry) return json(req, { ok: true, total: tokens.length });

    if (!Deno.env.get("APNS_KEY_P8") || !Deno.env.get("APNS_KEY_ID")) return json(req, { error: "apns_not_configured" }, 500);

    const payload = JSON.stringify({ aps: { alert: { title, body: text }, sound: "default" }, ...(url ? { url } : {}) });
    let sent = 0, failed = 0;
    const goneTokens: string[] = [];
    for (let i = 0; i < tokens.length; i += 20) {
      const batch = tokens.slice(i, i + 20);
      const results = await Promise.all(batch.map((t: string) => sendOne(t, payload)));
      results.forEach((r, j) => {
        if (r === "sent") sent++;
        else if (r === "gone") goneTokens.push(batch[j]);
        else failed++;
      });
    }
    if (goneTokens.length) await admin.from("push_tokens").delete().in("token", goneTokens);

    const { data: me } = await asUser.rpc("okbm_uid");
    await admin.from("push_notices").insert({
      title, body: text, url: url || null, sent_count: sent, failed_count: failed + goneTokens.length, created_by: me || null,
    });

    return json(req, { ok: true, total: tokens.length, sent, failed, removed: goneTokens.length });
  } catch (e) {
    console.error("[send-notice-push]", e);
    return json(req, { error: "send_failed" }, 500);
  }
});
