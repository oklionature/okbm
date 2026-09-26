const DEFAULT_ALLOWED_ORIGINS = [
  "https://romanticroute.kr",
  "https://www.romanticroute.kr",
  "https://okbm.kr",
  "https://www.okbm.kr",
];

const NCP_API_KEY_ID = "b3pgdton9r";

type Item = { url: string; blogId: string; title: string; postdate: string };

function isAllowedOrigin(origin: string): boolean {
  const normalized = String(origin || "").trim().replace(/\/+$/, "");
  if (!normalized) return false;
  if (DEFAULT_ALLOWED_ORIGINS.indexOf(normalized) !== -1) return true;
  const extra = String(Deno.env.get("OKBM_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (extra.indexOf(normalized) !== -1) return true;
  if (normalized === "capacitor://localhost" || normalized === "ionic://localhost") return true;
  try {
    const url = new URL(normalized);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = String(req.headers.get("Origin") || "").trim();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

const rateBuckets = new Map<string, { window: number; count: number }>();
let rateBucketsMinute = 0;

function rateLimitOk(actor: string, maxPerMinute: number): boolean {
  const minute = Math.floor(Date.now() / 60000);
  if (minute !== rateBucketsMinute) {
    rateBuckets.clear();
    rateBucketsMinute = minute;
  }
  const key = actor + ":" + minute;
  const cur = rateBuckets.get(key);
  if (!cur || cur.window !== minute) {
    rateBuckets.set(key, { window: minute, count: 1 });
    return true;
  }
  if (cur.count >= maxPerMinute) return false;
  cur.count += 1;
  return true;
}

function clientIp(req: Request): string {
  return String(req.headers.get("cf-connecting-ip") || "").trim() ||
    String(req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
}

function cleanQuery(raw: string): string {
  return String(raw || "").replace(/[^\w가-힣\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function decodeText(raw: string): string {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const INTENT_TOKENS = new Set(["백패킹", "야영", "캠핑", "장소", "등산", "비박", "후기", "산행"]);

function placeTokens(query: string): string[] {
  const out: string[] = [];
  for (const raw of query.split(/\s+/)) {
    const token = raw.trim();
    if (token.length < 2 || INTENT_TOKENS.has(token) || out.indexOf(token) !== -1) continue;
    out.push(token);
  }
  return out;
}

function titleHasTokens(title: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const compact = title.replace(/\s+/g, "");
  return tokens.every((token) => compact.indexOf(token) !== -1);
}

function addItem(map: Map<string, Item>, blogId: string, logNo: string, title: string, postdate: string) {
  if (!blogId || !/^\d{8,}$/.test(logNo)) return;
  if (/^(PostView|PostList|prologue|scratchpad)$/i.test(blogId)) return;
  const key = blogId + "/" + logNo;
  const clean = decodeText(title);
  const date = /^\d{8}$/.test(postdate) ? postdate : "";
  const prev = map.get(key);
  if (!prev) {
    map.set(key, {
      url: "https://blog.naver.com/" + blogId + "/" + logNo,
      blogId,
      title: clean.length >= 6 ? clean : "",
      postdate: date,
    });
    return;
  }
  if (clean.length > prev.title.length) prev.title = clean;
  if (date && date > prev.postdate) prev.postdate = date;
}

function addFromUrl(map: Map<string, Item>, url: string, title: string, postdate: string) {
  const m = String(url || "").match(/blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d{8,})/);
  if (m) addItem(map, m[1], m[2], title, postdate);
}

async function searchOpenApi(query: string, map: Map<string, Item>): Promise<boolean> {
  const secret = String(Deno.env.get("NCP_APIGW_API_KEY") || "").trim();
  const keyId = String(Deno.env.get("NCP_APIGW_API_KEY_ID") || NCP_API_KEY_ID).trim();
  if (!secret || !keyId) return false;
  const res = await fetch(
    "https://naverapihub.apigw.ntruss.com/search/v1/blog?display=30&start=1&sort=date&format=json&query=" + encodeURIComponent(query),
    {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": keyId,
        "X-NCP-APIGW-API-KEY": secret,
      },
    },
  );
  if (!res.ok) return false;
  const data = await res.json();
  const items = Array.isArray(data && data.items) ? data.items : [];
  const tokens = placeTokens(query);
  for (const item of items) {
    const title = decodeText(item && item.title);
    if (!titleHasTokens(title, tokens)) continue;
    addFromUrl(map, item && item.link, title, String((item && item.postdate) || ""));
  }
  return map.size > 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const origin = String(req.headers.get("Origin") || "").trim();
  if (origin && !isAllowedOrigin(origin)) return json(req, { error: "origin_not_allowed" }, 403);
  if (!rateLimitOk(clientIp(req), 40)) return json(req, { error: "rate_limited" }, 429);

  let body: { query?: string; queries?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }

  const queries: string[] = [];
  for (const raw of (Array.isArray(body.queries) ? body.queries : [body.query || ""])) {
    const q = cleanQuery(raw);
    if (q.length >= 2 && queries.indexOf(q) === -1) queries.push(q);
    if (queries.length >= 4) break;
  }
  if (!queries.length) return json(req, { error: "query_required" }, 400);

  const found = new Map<string, Item>();
  await searchOpenApi(queries[0], found);

  const items = Array.from(found.values())
    .sort((a, b) => (b.postdate || "").localeCompare(a.postdate || "") || b.title.length - a.title.length)
    .slice(0, 30);
  return json(req, { ok: true, items });
});
