// 인라인 이벤트 핸들러(onclick= 등)와 인라인 <script>를 소스에서 뽑아 CSP 해시를 만든다.
//
// 사용:
//   node scripts/csp-extract.mjs            → 동적 핸들러 목록/요약 출력 (dynamic > 0 이면 exit 1)
//   node scripts/csp-extract.mjs --write    → 각 HTML의 CSP meta 갱신
//   node scripts/csp-extract.mjs --check    → 생성물이 최신인지 확인 (CI용, 다르면 exit 1)
//
// 원리: 핸들러 속성 값은 반드시 "정적 문자열" 하나 안에서 열리고 닫혀야 한다.
//   ${...}나 + 연결로 값이 만들어지면 해시를 미리 알 수 없으므로 dynamic으로 보고한다.
//   값은 this.dataset.* 로 읽게 바꾸면 정적 문자열이 된다.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(import.meta.url);
let acorn;
try { acorn = require("acorn"); } catch { acorn = require(path.join(ROOT, "promo/node_modules/acorn")); }

const JS_FILES = ["romantic-sync.js", "romantic-history.js", "romantic-plan.js", "templates.js"];
const HTML_FILES = ["index.html", "map.html", "feed-register.html", "naver-callback.html"];
const HANDLER_OPEN = /\bon[a-z]+\s*=\s*(["'])/gi;
const ENT = { "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&amp;": "&", "&lt;": "<", "&gt;": ">" };

const decode = (s) => s.replace(/&(quot|#39|#x27|apos|amp|lt|gt);/g, (m) => ENT[m]);
const sha = (s) => "sha256-" + crypto.createHash("sha256").update(s, "utf8").digest("base64");

const handlers = new Map(); // value → first location
const dynamic = [];
const handlersBySource = {}; // 파일 → Set(value)
let currentSource = "";

// 한 덩어리(정적 문자열) 안의 핸들러 속성 수집. 안 닫힌 여는 따옴표는 dynamic.
function addHandler(value, where) {
  if (!handlers.has(value)) handlers.set(value, where);
  (handlersBySource[currentSource] ||= new Set()).add(value);
}

function scanChunk(text, where) {
  HANDLER_OPEN.lastIndex = 0;
  let m;
  while ((m = HANDLER_OPEN.exec(text))) {
    // 속성 이름 앞은 공백/따옴표/< 여야 진짜 속성 (예: "window.onclick = " 같은 JS 코드 제외)
    const before = text[m.index - 1];
    if (m.index > 0 && !/[\s"'<\/]/.test(before)) continue;
    const q = m[1];
    const start = m.index + m[0].length;
    const end = text.indexOf(q, start);
    if (end === -1) {
      dynamic.push({ where, snippet: text.slice(m.index, m.index + 90).replace(/\s+/g, " ") });
      break;
    }
    addHandler(decode(text.slice(start, end)), where);
    HANDLER_OPEN.lastIndex = end + 1;
  }
}

function walk(node, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, fn));
    else if (v && typeof v.type === "string") walk(v, fn);
  }
}

function scanJs(code, label, lineOffset = 0) {
  const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", locations: true, allowHashBang: true });
  walk(ast, (n) => {
    const line = (n.loc ? n.loc.start.line : 0) + lineOffset;
    if (n.type === "Literal" && typeof n.value === "string") scanChunk(n.value, `${label}:${line}`);
    else if (n.type === "TemplateElement") scanChunk(n.value.cooked ?? n.value.raw, `${label}:${line}`);
    else if (n.type === "CallExpression" && n.callee.type === "MemberExpression" &&
             n.callee.property.name === "setAttribute" && n.arguments[0]?.type === "Literal" &&
             /^on/i.test(String(n.arguments[0].value))) {
      const v = n.arguments[1];
      if (v && v.type === "Literal" && typeof v.value === "string") {
        addHandler(v.value, `${label}:${line}`);
      } else dynamic.push({ where: `${label}:${line}`, snippet: "setAttribute('" + n.arguments[0].value + "', <동적 값>)" });
    }
  });
}

const inlineScripts = {}; // html → [hash]
for (const f of JS_FILES) { currentSource = f; scanJs(fs.readFileSync(path.join(ROOT, f), "utf8"), f); }
for (const f of HTML_FILES) {
  currentSource = f;
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  inlineScripts[f] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  let markup = "";
  let last = 0;
  while ((m = re.exec(html))) {
    markup += html.slice(last, m.index);
    last = m.index + m[0].length;
    if (/\bsrc\s*=/.test(m[1])) continue;
    // JSON-LD 같은 데이터 블록은 실행되지 않으므로 CSP 해시 대상이 아니다
    if (/\btype\s*=\s*["']?application\/(ld\+)?json/i.test(m[1])) continue;
    const line = html.slice(0, m.index).split("\n").length;
    scanJs(m[2], f, line - 1);
    inlineScripts[f].push(sha(m[2]));
  }
  markup += html.slice(last);
  // 스크립트 밖 정적 HTML의 핸들러
  markup.split("\n").forEach((ln, i) => scanChunk(ln, `${f}:(markup ${i + 1})`));
}

const mode = process.argv[2] || "";
const handlerHashes = [...new Set([...handlers.keys()].map(sha))].sort();

if (!mode) {
  console.log(`handlers: ${handlers.size} distinct, dynamic: ${dynamic.length}`);
  for (const d of dynamic) console.log(`  DYNAMIC ${d.where}  ${d.snippet}`);
  for (const [f, h] of Object.entries(inlineScripts)) console.log(`  ${f}: ${h.length} inline scripts`);
  process.exit(dynamic.length ? 1 : 0);
}
if (dynamic.length) {
  console.error(`dynamic handlers remain (${dynamic.length}); run without flags to list`);
  process.exit(1);
}

// --- 생성물 ---
const SCRIPT_HOSTS = [
  "https://cdn.jsdelivr.net",
  "https://dapi.kakao.com",
  "https://t1.daumcdn.net",
  "https://t1.kakaocdn.net",
  "https://developers.kakao.com",
  "https://openapi.naver.com",
  "https://static.nid.naver.com",
];
// 페이지가 불러오는 JS 파일의 핸들러만 그 페이지 CSP에 넣는다.
const PAGE_SOURCES = {
  "index.html": ["index.html", ...JS_FILES],
  "map.html": ["map.html", ...JS_FILES],
  "feed-register.html": ["feed-register.html"],
  "naver-callback.html": ["naver-callback.html"],
};
function cspFor(file) {
  const vals = new Set();
  for (const src of PAGE_SOURCES[file]) for (const v of handlersBySource[src] || []) vals.add(v);
  const pageHandlerHashes = [...new Set([...vals].map(sha))].sort();
  const scriptSrc = ["'self'", ...(pageHandlerHashes.length ? ["'unsafe-hashes'"] : []),
    ...inlineScripts[file].map((h) => `'${h}'`), ...pageHandlerHashes.map((h) => `'${h}'`), ...SCRIPT_HOSTS];
  // worker-src: supabase-js 등이 blob: 워커를 만든다 (없으면 script-src로 대체되어 막힘)
  return `script-src ${scriptSrc.join(" ")}; worker-src 'self' blob:; object-src 'none'; base-uri 'self'`;
}

const outputs = {};
for (const f of HTML_FILES) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${cspFor(f)}">`;
  const re = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;
  if (!re.test(html)) { console.error(`${f}: CSP meta not found`); process.exit(1); }
  outputs[f] = html.replace(re, meta);
}

let stale = 0;
for (const [f, content] of Object.entries(outputs)) {
  const p = path.join(ROOT, f);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  if (cur === content) continue;
  if (mode === "--write") { fs.writeFileSync(p, content); console.log("wrote", f); }
  else { stale++; console.error("stale:", f); }
}
console.log(`handlers ${handlerHashes.length}, inline scripts ${Object.values(inlineScripts).flat().length}`);
if (mode === "--check" && stale) {
  console.error("CSP 해시가 최신이 아닙니다. node scripts/csp-extract.mjs --write 실행 후 커밋하세요.");
  process.exit(1);
}
