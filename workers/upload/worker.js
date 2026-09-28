// =========================================================================
// romantic-upload-worker (C1)
//
// 응답 계약 (클라이언트 okbmUploadImageBlob / feed-register uploadToR2와 동일):
//   업로드 성공: 200 { "status": "SUCCESS", "url": "https://<공개도메인>/<key>" }
//   실패:        4xx/5xx { "status": "ERROR", "error": "<code>" }
//
// 바인딩/변수:
//   MY_BUCKET                R2 버킷 바인딩 (운영 이름. 예전 참고 구현의 BUCKET도 허용)
//   PUBLIC_BASE_URL          https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev
//   SUPABASE_URL             https://qnumfecythtqtrxeasys.supabase.co
//   SUPABASE_PUBLISHABLE_KEY Supabase publishable 키 (공개 값)
//   REQUIRE_AUTH             "false"(전환기: 토큰 있으면 검증, 없으면 통과) / "true"(토큰 필수)
//   DELETE_SECRET            (secret) delete-account Edge Function이 사진 삭제를 요청할 때 쓰는 비밀값
//
// 사진 삭제: POST /delete  Authorization: Bearer <DELETE_SECRET>  { "urls": ["https://pub-.../key", ...] }
//   공개 도메인 아래의 키만 지운다. 최대 200개.
// =========================================================================

const ALLOWED_ORIGINS = new Set([
  "https://romanticroute.kr",
  "https://www.romanticroute.kr",
  "https://okbm.kr",
  "https://www.okbm.kr",
  "capacitor://localhost",
  "ionic://localhost",
  "https://localhost",
  // 2026-09-27 Worker 로그 기준 실제 업로드가 들어오던 예전 Pages 주소
  "https://oklionature.github.io",
]);

// 로컬 개발 서버(휴대폰에서 같은 와이파이로 접속하는 사설 IP 포함)
function isLocalDevHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

const ALLOWED_PREFIXES = new Set(["okbm", "feed", "photo", "trip", "cover", "master_cover", "readyshot"]);
const MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_PUBLIC_BASE = "https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev";

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    return (u.protocol === "http:" || u.protocol === "https:") && isLocalDevHost(u.hostname);
  } catch {
    return false;
  }
}

function corsHeaders(req) {
  const origin = req.headers.get("Origin") || "";
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function reply(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(req, code, status) {
  return reply(req, { status: "ERROR", error: code }, status);
}

function bucketOf(env) {
  return env.MY_BUCKET || env.BUCKET;
}

function publicBase(env) {
  return String(env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
}

function bearer(req) {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function verifyUser(req, env) {
  const jwt = bearer(req);
  if (!jwt) return { present: false, user: null };
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return { present: true, user: null };
  try {
    const res = await fetch(env.SUPABASE_URL + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + jwt, apikey: env.SUPABASE_PUBLISHABLE_KEY },
    });
    if (!res.ok) return { present: true, user: null };
    const user = await res.json();
    return { present: true, user: user && user.id ? user : null };
  } catch {
    return { present: true, user: null };
  }
}

// 앞 바이트로 실제 이미지 형식 확인 (Content-Type 헤더는 믿지 않음)
function sniffImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return "";
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// 클라이언트가 보낸 file 이름은 앞부분(prefix)만 참고하고 키는 서버가 만든다.
function prefixFrom(url) {
  const raw = String(url.searchParams.get("prefix") || url.searchParams.get("file") || "");
  if (raw.toLowerCase().startsWith("master_cover")) return "master_cover";
  const head = raw.split(/[_./\\]/)[0].replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
  return ALLOWED_PREFIXES.has(head) ? head : "okbm";
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || !a) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handleDelete(req, env) {
  if (!env.DELETE_SECRET || !timingSafeEqual(bearer(req), String(env.DELETE_SECRET))) {
    return fail(req, "forbidden", 403);
  }
  let body = {};
  try { body = await req.json(); } catch { return fail(req, "invalid_json", 400); }
  const base = publicBase(env) + "/";
  const keys = [];
  for (const u of (Array.isArray(body.urls) ? body.urls : []).slice(0, 200)) {
    const s = String(u || "").trim();
    if (!s.startsWith(base)) continue;
    const key = decodeURIComponent(s.slice(base.length).split(/[?#]/)[0]);
    if (!key || key.includes("..") || key.startsWith("/")) continue;
    keys.push(key);
  }
  const unique = [...new Set(keys)];
  if (unique.length) await bucketOf(env).delete(unique);
  return reply(req, { status: "SUCCESS", deleted: unique.length });
}

// 사이트의 CSP 위반 신고(csp-report.js)를 Worker 로그에 남긴다. 저장·응답 내용 없음.
async function handleCspReport(req) {
  const origin = req.headers.get("Origin") || "";
  if (origin && !isAllowedOrigin(origin)) return new Response(null, { status: 204 });
  let text = "";
  try { text = (await req.text()).slice(0, 1000); } catch { /* ignore */ }
  let report = null;
  try { report = JSON.parse(text); } catch { /* ignore */ }
  if (report && typeof report === "object") {
    console.log("csp-violation", JSON.stringify({
      page: String(report.page || "").slice(0, 80),
      directive: String(report.directive || "").slice(0, 60),
      blocked: String(report.blocked || "").slice(0, 200),
      sample: String(report.sample || "").slice(0, 120),
      source: String(report.source || "").slice(0, 100),
    }));
  }
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return fail(req, "method_not_allowed", 405);

    const url = new URL(req.url);
    if (url.pathname === "/delete") return handleDelete(req, env);
    if (url.pathname === "/csp-report") return handleCspReport(req);

    const origin = req.headers.get("Origin") || "";
    if (origin && !isAllowedOrigin(origin)) return fail(req, "origin_not_allowed", 403);

    const requireAuth = String(env.REQUIRE_AUTH || "false").toLowerCase() === "true";
    const { present, user } = await verifyUser(req, env);
    if (present && !user) return fail(req, "invalid_session", 401);
    if (requireAuth && !user) return fail(req, "login_required", 401);

    const declared = Number(req.headers.get("Content-Length") || "0");
    if (declared > MAX_BYTES) return fail(req, "too_large", 413);

    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length) return fail(req, "empty_body", 400);
    if (buf.length > MAX_BYTES) return fail(req, "too_large", 413);

    const type = sniffImageType(buf);
    if (!type) return fail(req, "unsupported_type", 415);

    const owner = user ? String(user.id).replace(/[^A-Za-z0-9-]/g, "") : "anon";
    const key = `${prefixFrom(url)}/${owner}/${crypto.randomUUID()}.${EXT[type]}`;
    const bucket = bucketOf(env);

    // UUID라 충돌 가능성은 사실상 없지만, 기존 객체는 절대 덮어쓰지 않는다.
    if (await bucket.head(key)) return fail(req, "conflict", 409);

    await bucket.put(key, buf, {
      httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { owner, uploadedAt: new Date().toISOString() },
    });

    return reply(req, { status: "SUCCESS", url: `${publicBase(env)}/${key}` });
  },
};
