// =========================================================================
// romantic-upload-worker (참고 구현, C1)
//
// 운영 중인 Worker 소스가 저장소에 없어 응답 형식만 맞춰 새로 작성한 버전이다.
// 배포 전에 Cloudflare 대시보드의 현재 소스와 비교해서 R2 바인딩 이름·공개 도메인을 확인할 것.
//
// 응답 계약 (클라이언트 okbmUploadImageBlob / feed-register uploadToR2와 동일):
//   성공: 200 { "status": "SUCCESS", "url": "https://<공개도메인>/<key>" }
//   실패: 4xx/5xx { "status": "ERROR", "error": "<code>" }
//
// 필요한 바인딩/변수 (wrangler.toml 참고):
//   BUCKET                   R2 버킷 바인딩
//   PUBLIC_BASE_URL          예: https://pub-13ec7c39d2394ecc879bb2ed4b86a43c.r2.dev
//   SUPABASE_URL             예: https://qnumfecythtqtrxeasys.supabase.co
//   SUPABASE_PUBLISHABLE_KEY Supabase publishable(anon) 키 (공개 값)
//   REQUIRE_AUTH             "false"(전환기: 토큰 있으면 검증, 없으면 통과) / "true"(토큰 필수)
//   UPLOAD_LIMITER           (선택) Workers Rate Limiting 바인딩
// =========================================================================

const ALLOWED_ORIGINS = new Set([
  "https://romanticroute.kr",
  "https://www.romanticroute.kr",
  "https://okbm.kr",
  "https://www.okbm.kr",
  "capacitor://localhost",
  "ionic://localhost",
]);

const ALLOWED_PREFIXES = new Set(["okbm", "feed", "photo", "trip", "cover", "master_cover", "readyshot"]);
const MAX_BYTES = 5 * 1024 * 1024;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    return (u.protocol === "http:" || u.protocol === "https:") &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1");
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

async function verifyUser(req, env) {
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { present: false, user: null };
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
  const head = raw.split(/[_./\\]/)[0].replace(/[^A-Za-z0-9-]/g, "").toLowerCase();
  if (raw.toLowerCase().startsWith("master_cover")) return "master_cover";
  return ALLOWED_PREFIXES.has(head) ? head : "okbm";
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return fail(req, "method_not_allowed", 405);

    const origin = req.headers.get("Origin") || "";
    if (origin && !isAllowedOrigin(origin)) return fail(req, "origin_not_allowed", 403);

    const requireAuth = String(env.REQUIRE_AUTH || "false").toLowerCase() === "true";
    const { present, user } = await verifyUser(req, env);
    if (present && !user) return fail(req, "invalid_session", 401);
    if (requireAuth && !user) return fail(req, "login_required", 401);

    // 사용자(없으면 IP) 기준 rate limit. 바인딩이 없으면 대시보드 WAF Rate Limiting 규칙으로 대신.
    if (env.UPLOAD_LIMITER && typeof env.UPLOAD_LIMITER.limit === "function") {
      const key = user ? "u:" + user.id : "ip:" + (req.headers.get("cf-connecting-ip") || "unknown");
      const { success } = await env.UPLOAD_LIMITER.limit({ key });
      if (!success) return fail(req, "rate_limited", 429);
    }

    const declared = Number(req.headers.get("Content-Length") || "0");
    if (declared > MAX_BYTES) return fail(req, "too_large", 413);

    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length) return fail(req, "empty_body", 400);
    if (buf.length > MAX_BYTES) return fail(req, "too_large", 413);

    const type = sniffImageType(buf);
    if (!type) return fail(req, "unsupported_type", 415);

    const url = new URL(req.url);
    const owner = user ? String(user.id).replace(/[^A-Za-z0-9-]/g, "") : "anon";
    const key = `${prefixFrom(url)}/${owner}/${crypto.randomUUID()}.${EXT[type]}`;

    // UUID라 충돌 가능성은 사실상 없지만, 기존 객체는 절대 덮어쓰지 않는다.
    const existing = await env.BUCKET.head(key);
    if (existing) return fail(req, "conflict", 409);

    await env.BUCKET.put(key, buf, {
      httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { owner, uploadedAt: new Date().toISOString() },
    });

    const base = String(env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    return reply(req, { status: "SUCCESS", url: `${base}/${key}` });
  },
};
