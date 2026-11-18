// 공개 표만, 비회원 열쇠로만 받아 담아 둔다. 사용자 로그인 정보는 Supabase로 넘기지 않으므로
// 누가 불러도 비회원이 보는 내용과 같다(관리자는 이 Worker를 거치지 않고 Supabase를 바로 본다).
const TABLES = new Set(['lounge_guides', 'lounge_deals', 'lounge_events', 'lounge_news', 'featured_videos', 'spots', 'feeds']);
const PURGEABLE = new Set(['lounge_guides', 'lounge_deals', 'lounge_events', 'lounge_news', 'featured_videos']);
// feeds는 사진지도처럼 공개 글만 묻는 요청만 받는다(비회원 열쇠라 어차피 공개 글만 나오지만, 아무 피드 조회나 담아 두지 않게)
function allowed(table, url) {
  if (!TABLES.has(table)) return false;
  if (table === 'feeds') return url.searchParams.get('is_published') === 'eq.true';
  return true;
}

// 박지 목록은 박지가 바뀔 때마다 바뀌는 판 번호(H14 get_spots_version)를 열쇠에 넣는다.
// 박지를 고치면 열쇠가 바로 달라져서 예전 목록이 나갈 일이 없다.
async function spotsVersion(env) {
  const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/get_spots_version', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' },
    body: '{}',
  });
  const v = r.ok ? await r.json() : '';
  return typeof v === 'string' && v ? v : '';
}
const GEN_HOST = 'https://gen.romantic-public-cache.internal/';

function cors(h) {
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'authorization, content-type');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}
function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: cors(new Headers({ 'content-type': 'application/json' })) });
}

async function readGen(cache, table) {
  const hit = await cache.match(GEN_HOST + table);
  return hit ? await hit.text() : '0';
}

async function serveTable(req, env, ctx, table, search) {
  const cache = caches.default;
  let gen, ttl = env.TTL_SECONDS;
  if (table === 'spots') {
    gen = await spotsVersion(env);
    ttl = '86400';
  } else {
    gen = await readGen(cache, table);
  }
  const key = new Request('https://cache.romantic-public-cache.internal/' + table + search + '#g' + gen);
  const hit = gen === '' ? null : await cache.match(key);
  if (hit) {
    const h = cors(new Headers(hit.headers));
    h.set('x-okbm-cache', 'HIT');
    return new Response(hit.body, { status: hit.status, headers: h });
  }
  const upstream = await fetch(env.SUPABASE_URL + '/rest/v1/' + table + search, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' },
  });
  const body = await upstream.arrayBuffer();
  const h = new Headers({ 'content-type': upstream.headers.get('content-type') || 'application/json' });
  if (upstream.ok && gen !== '') {
    h.set('Cache-Control', 'public, max-age=' + ttl);
    ctx.waitUntil(cache.put(key, new Response(body, { status: 200, headers: h })));
  }
  const out = cors(new Headers(h));
  out.set('Cache-Control', 'no-store');
  out.set('x-okbm-cache', 'MISS');
  return new Response(body, { status: upstream.status, headers: out });
}

// 관리자가 라운지를 고친 뒤 부른다. 판 번호만 바꾸면 이전에 담아 둔 것은 다시 쓰이지 않는다.
async function purge(req, env) {
  const auth = req.headers.get('authorization') || '';
  if (!auth) return json({ error: 'no_auth' }, 401);
  const check = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/okbm_is_admin', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: auth, 'content-type': 'application/json' },
    body: '{}',
  });
  if (!check.ok || (await check.json()) !== true) return json({ error: 'not_admin' }, 403);
  const { tables } = await req.json().catch(() => ({}));
  const list = (Array.isArray(tables) ? tables : []).filter((t) => PURGEABLE.has(t));
  const gen = String(Date.now());
  await Promise.all(list.map((t) => caches.default.put(GEN_HOST + t,
    new Response(gen, { headers: { 'Cache-Control': 'public, max-age=86400' } }))));
  return json({ purged: list, gen }, 200);
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(new Headers()) });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/purge') return purge(req, env);
    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (req.method !== 'GET' || !m || !allowed(m[1], url)) return json({ error: 'not_allowed' }, 404);
    return serveTable(req, env, ctx, m[1], url.search);
  },
};
