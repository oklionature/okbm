const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const SKIP =
  /구독|광고|클릭|해시태그|gpx|파일 공유|연말정산|결산|Happy New Year|좋아요|댓글|이웃추가|블로그홈|저작권|내돈내산/;

type Source = { title: string; url: string; text: string };

const DEFAULT_ALLOWED_ORIGINS = [
  "https://romanticroute.kr",
  "https://www.romanticroute.kr",
  "https://okbm.kr",
  "https://www.okbm.kr",
];

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
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function bearerToken(req: Request): string {
  const raw = String(req.headers.get("Authorization") || "").trim();
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? String(m[1] || "").trim() : "";
}

function publishableKey(): string {
  const raw = String(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const named = typeof parsed === "string"
        ? parsed
        : String(parsed.default || Object.values(parsed)[0] || "");
      if (named) return named.trim();
    } catch {
      return raw;
    }
  }
  return String(
    Deno.env.get("SB_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    ""
  ).trim();
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

async function requireAuthUser(req: Request): Promise<{ id: string } | null> {
  const jwt = bearerToken(req);
  if (!jwt) return null;
  const anon = publishableKey();
  const url = String(Deno.env.get("SUPABASE_URL") || "").trim();
  if (!anon || !url) return null;
  try {
    const res = await fetch(url + "/auth/v1/user", {
      headers: {
        Authorization: "Bearer " + jwt,
        apikey: anon,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    const id = String(user && user.id || "").trim();
    return id ? { id } : null;
  } catch {
    return null;
  }
}

function stripHtml(raw: string): string {
  return String(raw || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function decode(s: string): string {
  return stripHtml(s).trim();
}

async function fetchText(url: string, ms = 8000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.4",
        "Accept-Encoding": "gzip, deflate, identity",
        Referer: "https://m.search.naver.com/",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function queryTokens(q: string): string[] {
  return String(q || "")
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !/^(산|등산|백패킹|야영|캠핑|코스|후기|정상)$/.test(t));
}

function parseNaverBlogSearch(html: string): Source[] {
  const titles = Array.from(
    html.matchAll(/sds-comps-text-ellipsis-2[^>]*>([\s\S]*?)<\/span>/g),
  ).map((m) => decode(m[1])).filter(Boolean);

  const urls: string[] = [];
  const seen = new Set<string>();
  const urlRe = /https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d+)/g;
  for (const m of html.matchAll(urlRe)) {
    const url = `https://m.blog.naver.com/${m[1]}/${m[2]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  const n = Math.max(titles.length, urls.length);
  const out: Source[] = [];
  for (let i = 0; i < n && i < 20; i++) {
    const url = urls[i] || "";
    const title = titles[i] || titles[0] || url;
    if (!url && !title) continue;
    out.push({ title, url: url || title, text: title });
  }
  return out;
}

function parseDuckDuckGo(html: string): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  const blogRe = /https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d+)/g;
  const tistoryRe = /https?:\/\/[a-z0-9-]+\.tistory\.com\/\d+/gi;

  function normalize(url: string): string {
    const bm = url.match(/blog\.naver\.com\/([A-Za-z0-9._-]+)\/(\d+)/);
    if (bm) return `https://m.blog.naver.com/${bm[1]}/${bm[2]}`;
    return url;
  }
  function push(title: string, url: string, text: string) {
    url = url ? normalize(url) : "";
    const key = url || title;
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ title: title || url, url: url || "", text: text || title });
  }

  for (const m of html.matchAll(/uddg=([^&"]+)[^>]*>\s*([^<]{6,160})\s*</g)) {
    let url = "";
    try { url = decodeURIComponent(m[1]); } catch { url = m[1]; }
    push(decode(m[2]), url, decode(m[2]));
  }

  for (const m of html.matchAll(blogRe)) {
    push("", `https://m.blog.naver.com/${m[1]}/${m[2]}`, "");
  }
  for (const m of html.matchAll(tistoryRe)) {
    push("", m[0], "");
  }
  return out;
}

async function searchDuckDuckGo(q: string): Promise<Source[]> {
  const form = new URLSearchParams({ q, kl: "kr-kr" });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept-Encoding": "gzip, deflate, identity",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) return [];
    return parseDuckDuckGo(await res.text());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function extractPageTitle(html: string, fallback: string): string {
  const og =
    html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const raw = og ? og[1] : (html.match(/<title>([^<]+)<\/title>/i) || [])[1];
  if (!raw) return fallback;
  return decode(raw).replace(/\s*[:|]\s*네이버 블로그.*$/i, "").trim() || fallback;
}

function extractPostText(html: string): string {
  const paras = Array.from(
    html.matchAll(/se-text-paragraph[^>]*>([\s\S]*?)<\/p>/g),
  ).map((m) => decode(m[1]));
  const lines = paras.filter((t) => t.length >= 6 && !SKIP.test(t));
  if (lines.length) return lines.slice(0, 80).join("\n");

  const tistory = html.match(/tt_article_useless_p_margin[\s\S]{0,20000}<\/div>/) ||
    html.match(/class="entry-content"[\s\S]{0,20000}<\/div>/) ||
    html.match(/<article[^>]*>[\s\S]{0,20000}<\/article>/i);
  if (tistory) {
    const t = decode(tistory[0]);
    if (t.length > 40) return t.slice(0, 5000);
  }
  const main = html.match(/se-main-container[\s\S]*?(<div class="se-component-area"|<\/div><\/div><\/div>)/);
  const fallback = decode(main ? main[0] : "");
  return fallback.slice(0, 4000);
}

function stripCoords(text: string): string {
  return String(text || "")
    .replace(/\(?\s*-?\d{2,3}\.\d{3,}\s*,\s*-?\d{2,3}\.\d{3,}\s*\)?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function clip(text: string, max = 120): string {
  let s = stripCoords(String(text || "").replace(/\s+/g, " ").trim());
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const da = cut.lastIndexOf("다.");
  if (da > 70) return cut.slice(0, da + 2).trim();
  const dot = cut.lastIndexOf(".");
  if (dot > 70) return cut.slice(0, dot + 1).trim();
  const sp = cut.lastIndexOf(" ");
  return (sp > 70 ? cut.slice(0, sp) : cut).trim();
}

function cleanAddr(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+\d+\.\s.*$/, "")
    .replace(/\s+[12]$/, "")
    .trim();
}

function extractAddr(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const labeled = t.match(
    /주소[:\s]*((?:경기(?:도)?\s*)?[가-힣0-9\s]{4,48}(?:로|길)\s*\d*(?:번길)?\s*\d+(?:-\d+)?)/,
  );
  if (labeled) return cleanAddr(labeled[1]);
  const patterns = [
    /(?:경기(?:도)?|서울(?:특별시)?|인천(?:광역시)?|강원(?:특별자치도|도)?|충북|충청북도|충남|충청남도|전북|전라북도|전남|전라남도|경북|경상북도|경남|경상남도|제주(?:특별자치도)?)[가-힣0-9\s]{2,40}(?:로|길)\s*\d*(?:번길)?\s*\d+(?:\s*-\s*\d+)?/,
    /[가-힣]+(?:시)?\s*[가-힣]+(?:구|군)\s*[가-힣]+(?:읍|면|동|리)\s*[가-힣0-9]+(?:로|길)\s*\d*(?:번길)?\s*\d+(?:\s*-\s*\d+)?/,
    /[가-힣]+(?:읍|면|동)\s*[가-힣0-9]+(?:로|길)\s*\d*(?:번길)?\s*\d+(?:-\d+)?/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return cleanAddr(m[0]);
  }
  return "";
}

function extractElev(text: string): string {
  const named = String(text || "").match(/(?:높이|해발|고도)[^\d]{0,8}(\d{2,4})\s*m/i);
  if (named) return `${named[1]}m`;
  const m = String(text || "").match(/(\d{3,4})\s*m/);
  if (m && Number(m[1]) >= 200 && Number(m[1]) <= 2000) return `${m[1]}m`;
  return "";
}

function extractTrailName(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const named = t.match(/([가-힣]{2,12}(?:유아숲체험원|숲체험원|휴양림|탐방지원센터|등산로입구))/) ||
    t.match(/(유아숲체험원|휴양림|탐방지원센터|등산로입구)/);
  if (named) return named[1].replace(/\s+/g, "");
  return "";
}

function extractKm(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const m = t.match(/편도[^\d]{0,10}(\d+(?:\.\d+)?)\s*km/i) ||
    t.match(/(\d+(?:\.\d+)?)\s*km[^\.]{0,10}(?:코스|산행|정상|지점)/i) ||
    t.match(/(?:정상까지|들머리|숏컷)[^\d]{0,10}(\d+(?:\.\d+)?)\s*km/i);
  return m ? m[1] : "";
}

function extractHikeMin(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const m = t.match(/(?:산행|정상|코스|오르|편도)[^\d]{0,12}(\d+)\s*분/) ||
    t.match(/(\d+)\s*분(?:\s*(?:산행|소요|정도))/);
  if (!m) return "";
  const n = Number(m[1]);
  return n >= 10 && n <= 240 ? String(n) : "";
}

function extractDeckCount(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const m = t.match(/(\d+)\s*개(?:의)?\s*(?:목재\s*)?데크/) || t.match(/데크\s*(\d+)\s*개/);
  return m ? m[1] : "";
}

function extractTentCount(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ");
  const m = t.match(/(\d+)\s*(?:~|∼|-)\s*(\d+)\s*동/) || t.match(/(\d+)\s*동/);
  if (!m) return "";
  return m[2] ? `${m[1]}~${m[2]}` : m[1];
}

function dePersonal(s: string): string {
  return String(s || "")
    .replace(/(저는|나는|제가|내가|우리는|우리가|저희는)\s*/g, "")
    .replace(/다녀왔어요\.?|다녀왔다\.?|갔다왔어요\.?|갔어요\.?/g, "")
    .replace(/위 사진과 같은\s*/g, "")
    .replace(/위 사진의\s*/g, "")
    .replace(/[ㅎㅋ]+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toGuide(s: string): string {
  let t = dePersonal(s).replace(/\s+/g, " ").trim();
  t = t.replace(/하면 안된다/g, "하면 안 됩니다");
  t = t.replace(/해야 한다\.?/g, "해야 합니다.");
  t = t.replace(/하세요\.?/g, "하십시오.");
  t = t.replace(/했어요/g, "합니다");
  t = t.replace(/했습니다/g, "합니다");
  t = t.replace(/가능하다\.?/g, "가능합니다.");
  t = t.replace(/필수다\.?/g, "필수입니다.");
  t = t.replace(/된다\.?$/g, "됩니다.");
  t = t.replace(/한다\.?$/g, "합니다.");
  t = t.replace(/이다\.?$/g, "입니다.");
  t = t.replace(/있다\.?$/g, "있습니다.");
  t = t.replace(/없다\.?$/g, "없습니다.");
  t = t.replace(/같다\.?$/g, "같습니다.");
  t = t.replace(/좋다\.?$/g, "좋습니다.");
  t = t.replace(/돼요\.?$/g, "됩니다.");
  t = t.replace(/해요\.?$/g, "합니다.");
  t = t.replace(/이에요\.?$/g, "입니다.");
  t = t.replace(/예요\.?$/g, "입니다.");
  t = t.replace(/는데$/g, "습니다").replace(/는데\.$/g, "습니다.");
  t = t.replace(/지만$/g, "습니다").replace(/지만\.$/g, "습니다.");
  if (!t) return "";
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

function isDiary(s: string): boolean {
  return /꼬였|고민하|집갈까|욕심을|절묘하게|에버라인|지내고 있는|쳐야겠다|힘들다|휴지|고인물|모르겠고|끝내줬|당연히|구매한|잠자리|첫 테스트|근데 |후다닥|배가 별로|이 날 |올라 오셔|닫아 놓고|가볍게 한 잔|들어간다 아주|보온병|있겠지|아 이제|피칭 완료|낼도|예쁘다|녹지 않|자리잡고 있었|강아지|다녀왔|다녀오|줄 알았|네이버에|ㅋㅋ|ㅎㅎ|퇴근하고|우리말고|무서웠|남겨 달라|이렇게 갔다/.test(s);
}

function isPlaceFact(s: string): boolean {
  return /들머리|주차|데크|테크|전망|조망|해발|고도|km|피칭|텐트|동수|평탄|임도|갈림길|번길|주소|화기|화장실|비화식|체험원|탐방|입구|휴양림|포장|능선|바위|말아가리|헬기장|노지|경사|소요/.test(s);
}

type Unit = { s: string; src: number };

function unitsFromSources(sources: Source[]): Unit[] {
  const out: Unit[] = [];
  sources.forEach((src, i) => {
    const parts = String(src.text || "")
      .replace(/[•·○]/g, "\n")
      .split(/\n+|(?<=다\.|요\.|이다\.|한다\.|[.!?])\s+/);
    parts.forEach((p) => {
      const s = toGuide(p);
      if (s.length < 12 || s.length > 140) return;
      if (isDiary(s) || SKIP.test(s) || /https?:/.test(s) || /#/.test(s)) return;
      if (!isPlaceFact(s)) return;
      if ((s.match(/\//g) || []).length >= 2) return;
      if (/[?？~]/.test(s) || /_뷰는|3th|퇴근박|백패킹\(|가는방법|주차 장소\s*:|\/.+(백패킹|트레킹|후기)|-->|→/.test(s)) return;
      if (/나는|내가|저는|제가/.test(s)) return;
      out.push({ s, src: i });
    });
  });
  return out;
}

function pack(parts: string[], min = 80, max = 120): string {
  const used = new Set<string>();
  let out = "";
  for (const p of parts) {
    const t = String(p || "").replace(/\s+/g, " ").trim();
    if (!t || used.has(t) || out.indexOf(t) !== -1) continue;
    const next = out ? `${out} ${t}` : t;
    if (next.length > max) {
      if (!out) return clip(t, max);
      if (out.length >= min) break;
      out = clip(`${out} ${t}`, max);
      break;
    }
    used.add(t);
    out = next;
    if (out.length >= min) break;
  }
  return clip(out, max);
}

function pickField(units: Unit[], re: RegExp, tokens: string[]): string[] {
  const scored = units
    .map((u) => {
      let n = 0;
      if (re.test(u.s)) n += 5;
      for (const t of tokens) if (u.s.indexOf(t) !== -1) n += 2;
      return { ...u, n };
    })
    .filter((u) => u.n > 0)
    .sort((a, b) => b.n - a.n || a.src - b.src);
  const bySrc: string[] = [];
  const seenSrc = new Set<number>();
  const rest: string[] = [];
  for (const u of scored) {
    if (!seenSrc.has(u.src)) {
      seenSrc.add(u.src);
      bySrc.push(u.s);
    } else {
      rest.push(u.s);
    }
  }
  return bySrc.concat(rest);
}

function accessLead(corpus: string, trailName: string, addr: string): string[] {
  const km = extractKm(corpus);
  const min = extractHikeMin(corpus);
  const out: string[] = [];
  if (trailName && addr) out.push(`${trailName}에서 이동하여 도착합니다. ${addr}.`);
  else if (addr) out.push(`${addr}에서 들머리로 이동합니다.`);
  else if (trailName) out.push(`${trailName}에서 출발합니다.`);
  if (km && min) out.push(`편도 ${km}km(약 ${min}분 산행).`);
  else if (km) out.push(`편도 ${km}km.`);
  else if (min) out.push(`약 ${min}분 산행.`);
  return out;
}

function pitchLead(corpus: string): string[] {
  const deck = extractDeckCount(corpus);
  const tents = extractTentCount(corpus);
  const wood = /목재\s*데크/.test(corpus);
  const squid = /오징어\s*팩|오징어팩/.test(corpus);
  const out: string[] = [];
  if (deck && tents) {
    out.push(`${deck}개의 데크를 활용하며, 각 데크당 ${tents}동의 텐트 피칭이 가능합니다.`);
  } else if (tents) {
    out.push(`텐트 ${tents}동 피칭이 가능합니다.`);
  } else if (deck) {
    out.push(`${deck}개의 데크를 활용합니다.`);
  }
  if (wood && squid) out.push("바닥이 목재 데크이므로 반드시 오징어팩을 사용하여 고정하십시오.");
  else if (wood) out.push("바닥은 목재 데크입니다.");
  return out;
}

function synthesize(query: string, sources: Source[]) {
  const three = sources.slice(0, 3);
  const corpus = three.map((s) => `${s.title}\n${s.text}`).join("\n");
  const units = unitsFromSources(three);
  const tokens = queryTokens(query);
  const addr = extractAddr(corpus);
  const trailName = extractTrailName(corpus);

  return {
    view: pack(pickField(units, /전망|조망|오션|바다|최고봉|데크|테크|경관|일출|일몰|파노라마|바위|능선|말아가리|뷰|야간|사방/, tokens)),
    access: pack(accessLead(corpus, trailName, addr).concat(
      pickField(units, /들머리|주차|항|선착|차도선|코스|km|소요|임도|포장|등산로|거리|시간|입구|휴양림/, tokens),
    )),
    pitch: pack(pitchLead(corpus).concat(
      pickField(units, /피칭|텐트|데크|테크|자리|평탄|바닥|동수|노지|헬기장|박지|오징어/, tokens),
    )),
    tip: pack(pickField(units, /주의|주말|화장실|바람|방풍|물|금지|유명|혼잡|화기|잠겨|벌레|비화식|철수|등산객|매너|주차/, tokens)),
    trailName,
    trailAddr: addr,
    elevation: extractElev(corpus),
  };
}

function rankSources(items: Source[], tokens: string[]): Source[] {
  return items
    .map((item) => {
      const t = `${item.title} ${item.url} ${item.text}`;
      let n = 0;
      for (const tok of tokens) if (t.indexOf(tok) !== -1) n += 4;
      if (/blog\.naver\.com|\.tistory\.com/.test(item.url)) n += 3;
      if (/백패킹|야영|퇴근박|박지|들머리|데크|피칭|주차|가는방법|주소/.test(t)) n += 5;
      if (/결산|연말정산|Happy New Year/.test(t)) n -= 8;
      if (/종주|태화산|마미종주/.test(t) && tokens.length && !tokens.some((tok) => t.indexOf(tok) !== -1)) n -= 4;
      return { item, n };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.item);
}

async function searchNaverBlogs(q: string): Promise<Source[]> {
  const url =
    "https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&query=" +
    encodeURIComponent(q);
  const html = await fetchText(url, 9000);
  if (!html) return [];
  return parseNaverBlogSearch(html);
}

function sourceScore(s: Source): number {
  const t = `${s.title}\n${s.text}`;
  let n = 0;
  if (extractAddr(t)) n += 16;
  if (/들머리|주차/.test(t)) n += 6;
  if (/데크|피칭|텐트|박지/.test(t)) n += 5;
  if (/백패킹|야영/.test(t)) n += 3;
  if (/가는방법|주소/.test(s.title)) n += 4;
  n -= Math.min(8, (t.match(/나는|내가|ㅋㅋ|ㅎㅎ|강아지|다녀왔/g) || []).length);
  return n;
}

async function fillBodies(items: Source[]): Promise<Source[]> {
  const http = items.filter((s) => /^https?:\/\//.test(s.url)).slice(0, 8);
  const bodies = await Promise.all(http.map((s) => fetchText(s.url, 9000)));
  const filled = http.map((s, i) => {
    const html = bodies[i] || "";
    return {
      title: extractPageTitle(html, s.title),
      url: s.url,
      text: extractPostText(html) || s.text || s.title,
    };
  }).filter((s) => String(s.text || "").length > 40);
  filled.sort((a, b) => sourceScore(b) - sourceScore(a));
  return filled.slice(0, 3);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const origin = String(req.headers.get("Origin") || "").trim();
  if (origin && !isAllowedOrigin(origin)) {
    return json(req, { error: "origin_not_allowed" }, 403);
  }

  const user = await requireAuthUser(req);
  if (!user) return json(req, { error: "login_required" }, 401);
  if (!rateLimitOk(user.id, 12)) {
    return json(req, { error: "rate_limited" }, 429);
  }

  let body: { query?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }
  const query = String(body.query || "").replace(/\s+/g, " ").trim();
  if (query.length < 2) return json(req, { error: "query_required" }, 400);

  const core = query.replace(/\s*백패킹\s*/g, " ").replace(/\s+/g, " ").trim() || query;
  const q = `${core} 백패킹`;
  const [naver, extra] = await Promise.all([
    searchNaverBlogs(q),
    searchDuckDuckGo(q),
  ]);
  const merged: Source[] = [];
  const seen = new Set<string>();
  for (const item of naver.concat(extra)) {
    const key = item.url || item.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  const ranked = rankSources(merged, queryTokens(core));
  const withBody = await fillBodies(ranked.length ? ranked : merged);
  const fields = synthesize(core, withBody);

  return json(req, {
    ok: true,
    query: q,
    sourceCount: withBody.length,
    fetched: withBody.length,
    sources: withBody.map((s) => ({ title: s.title, url: s.url })),
    ...fields,
  });
});
