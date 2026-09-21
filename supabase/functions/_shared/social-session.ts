import { createClient, type User } from "npm:@supabase/supabase-js@2";

export type SocialProfile = {
  provider: "naver" | "kakao";
  providerId: string;
  email: string;
  nickname: string;
  name: string;
  photo: string;
};

export type SocialSessionOptions = {
  linkTo?: User;
};

export type IssuedSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
  linked?: boolean;
  profile: {
    id: string;
    email: string;
    nickname: string;
    photo: string;
    name: string;
    provider: string;
  };
};

export class SocialAuthError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "SocialAuthError";
    this.code = code;
    this.status = status;
  }
}

function envOrThrow(name: string): string {
  const value = Deno.env.get(name) || "";
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function parseSecretKeys(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    return String(parsed.default || parsed.service_role || parsed.serviceRole || Object.values(parsed)[0] || "");
  } catch {
    return raw;
  }
}

export function getServiceRoleKey(): string {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SB_SECRET_KEY") ||
    parseSecretKeys()
  );
}

export function getAnonKey(): string {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SB_PUBLISHABLE_KEY") || "";
}

export function getSupabaseUrl(): string {
  return envOrThrow("SUPABASE_URL");
}

const DEFAULT_ALLOWED_ORIGINS = [
  "https://oklionature.github.io",
  "https://okbm.kr",
  "https://www.okbm.kr",
];

function extraAllowedOrigins(): string[] {
  return String(Deno.env.get("OKBM_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin: string): boolean {
  const normalized = String(origin || "").trim().replace(/\/+$/, "");
  if (!normalized) return false;
  if (DEFAULT_ALLOWED_ORIGINS.indexOf(normalized) !== -1) return true;
  if (extraAllowedOrigins().indexOf(normalized) !== -1) return true;
  if (normalized === "capacitor://localhost" || normalized === "ionic://localhost") return true;
  return isLoopbackOrigin(normalized);
}

export function isAllowedNaverRedirectUri(value: string): boolean {
  try {
    const url = new URL(String(value || "").trim());
    if (url.search || url.hash) return false;
    if (!/\/naver-callback\.html$/i.test(url.pathname)) return false;
    return isAllowedOrigin(url.origin);
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request): Record<string, string> {
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

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  return null;
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function sanitizeNick(value: string): string {
  const nick = String(value || "").replace(/\s+/g, " ").trim();
  return nick.slice(0, 24);
}

function syntheticEmail(provider: string, providerId: string): string {
  const safe = String(providerId || "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
  return `${provider}.${safe || "user"}@users.noreply.okbm.app`;
}

function scopedId(provider: string, providerId: string): string {
  const id = String(providerId || "").trim();
  if (id.startsWith(`${provider}_`)) return id;
  return `${provider}_${id}`;
}

function asMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function mergeProviders(existing: unknown, incoming: string): string[] {
  const list = Array.isArray(existing) ? existing.map((v) => String(v || "").trim()).filter(Boolean) : [];
  if (incoming && list.indexOf(incoming) === -1) list.push(incoming);
  return list;
}

function bearerToken(req: Request): string {
  return String(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

export function createAdminClient() {
  const serviceKey = getServiceRoleKey();
  if (!serviceKey) throw new Error("service role key missing");
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient() {
  const anonKey = getAnonKey();
  if (!anonKey) throw new Error("anon key missing");
  return createClient(getSupabaseUrl(), anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readBearerAuthUser(req: Request): Promise<User | null> {
  const jwt = bearerToken(req);
  if (!jwt) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user?.id) return null;
  return data.user;
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  const { data, error } = await admin.rpc("okbm_find_auth_user_id", { p_email: normalized });
  if (error) throw new Error(error.message || "auth user lookup failed");
  return String(data || "").trim();
}

async function findAuthUserIdByProvider(
  admin: ReturnType<typeof createClient>,
  provider: string,
  providerId: string,
): Promise<string> {
  const { data, error } = await admin.rpc("okbm_find_auth_user_by_provider", {
    p_provider: provider,
    p_provider_id: providerId,
  });
  if (error) throw new Error(error.message || "provider lookup failed");
  return String(data || "").trim();
}

async function issueSessionForEmail(
  admin: ReturnType<typeof createClient>,
  anon: ReturnType<typeof createClient>,
  email: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}> {
  const loginEmail = normalizeEmail(email);
  if (!loginEmail) throw new Error("session email missing");

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: loginEmail,
  });
  const hashedToken = String(linkData?.properties?.hashed_token || "").trim();
  if (linkError || !hashedToken) {
    throw new Error(linkError?.message || "session link failed");
  }

  let verified = await anon.auth.verifyOtp({
    token_hash: hashedToken,
    type: "email",
  });
  if (verified.error || !verified.data?.session?.access_token) {
    verified = await anon.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    });
  }
  const session = verified.data?.session;
  if (verified.error || !session?.access_token || !session.refresh_token) {
    throw new Error(verified.error?.message || "session verify failed");
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in || 3600,
    token_type: session.token_type || "bearer",
    user: verified.data.user || session.user,
  };
}

export async function issueSocialSession(
  profile: SocialProfile,
  options: SocialSessionOptions = {},
): Promise<IssuedSession> {
  const admin = createAdminClient();
  const anon = createAnonClient();

  const providerId = String(profile.providerId || "").trim();
  if (!providerId) throw new Error("provider id missing");

  const scoped = scopedId(profile.provider, providerId);
  const realEmail = normalizeEmail(profile.email);
  const loginEmail = syntheticEmail(profile.provider, providerId);
  const nickname = sanitizeNick(profile.nickname || profile.name) || "낭만백패커";
  const photo = String(profile.photo || "").trim();
  const linkTo = options.linkTo || null;

  if (linkTo?.id) {
    const currentMeta = asMeta(linkTo.app_metadata);
    const currentOkbm = String(currentMeta.okbm_user_id || "").trim();
    if (!currentOkbm) {
      throw new SocialAuthError("okbm_user_id_missing", "현재 세션에 연결할 계정이 없습니다.", 401);
    }

    const taken = await findAuthUserIdByProvider(admin, profile.provider, providerId);
    if (taken && taken !== linkTo.id) {
      throw new SocialAuthError("social_identity_taken", "이미 다른 계정에 연결된 소셜 로그인입니다.", 409);
    }

    const linkedMeta = {
      ...currentMeta,
      providers: mergeProviders(currentMeta.providers, profile.provider),
      okbm_user_id: currentOkbm,
      [`${profile.provider}_id`]: providerId,
    };
    const { error: linkUpdateError } = await admin.auth.admin.updateUserById(linkTo.id, {
      app_metadata: linkedMeta,
    });
    if (linkUpdateError) throw new Error(linkUpdateError.message);

    const session = await issueSessionForEmail(admin, anon, String(linkTo.email || ""));
    return {
      ...session,
      linked: true,
      profile: {
        id: currentOkbm,
        email: realEmail || String(linkTo.email || ""),
        nickname: sanitizeNick(String(linkTo.user_metadata?.nickname || nickname)) || nickname,
        photo: photo || String(linkTo.user_metadata?.avatar_url || ""),
        name: sanitizeNick(profile.name) || nickname,
        provider: profile.provider,
      },
    };
  }

  let authUserId = await findAuthUserIdByProvider(admin, profile.provider, providerId);
  if (!authUserId) authUserId = await findAuthUserIdByEmail(admin, loginEmail);
  if (!authUserId && realEmail) {
    const byReal = await findAuthUserIdByEmail(admin, realEmail);
    if (byReal) {
      const { data: found } = await admin.auth.admin.getUserById(byReal);
      const planted = String(asMeta(found?.user?.app_metadata)[`${profile.provider}_id`] || "").trim();
      if (planted === providerId || planted === scoped) {
        authUserId = byReal;
      }
    }
  }

  let existingAuth: User | null = null;
  if (authUserId) {
    const { data: found } = await admin.auth.admin.getUserById(authUserId);
    existingAuth = found?.user || null;
  }

  const existingMeta = asMeta(existingAuth?.app_metadata);
  const okbmUserId = String(existingMeta.okbm_user_id || scoped).trim() || scoped;

  const appMetadata = {
    ...existingMeta,
    provider: profile.provider,
    providers: mergeProviders(existingMeta.providers, profile.provider),
    okbm_user_id: okbmUserId,
    [`${profile.provider}_id`]: providerId,
  };
  const userMetadata = {
    nickname,
    full_name: sanitizeNick(profile.name) || nickname,
    avatar_url: photo,
    email: realEmail || null,
    provider: profile.provider,
    okbm_user_id: okbmUserId,
  };

  if (!authUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (createError || !created?.user?.id) {
      const foundId = await findAuthUserIdByEmail(admin, loginEmail);
      if (!foundId) throw new Error(createError?.message || "auth user create failed");
      authUserId = foundId;
      const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
        email_confirm: true,
        app_metadata: appMetadata,
        user_metadata: userMetadata,
      });
      if (updateError) throw new Error(updateError.message);
    } else {
      authUserId = created.user.id;
    }
  } else {
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (updateError) throw new Error(updateError.message);
  }

  const { data: existingRow } = await admin
    .from("users")
    .select("id,email,nickname,photo_url,hero_cover_url")
    .eq("id", okbmUserId)
    .maybeSingle();

  const { error: upsertError } = await admin.from("users").upsert({
    id: okbmUserId,
    nickname: existingRow?.nickname && existingRow.nickname !== "낭만백패커" ? existingRow.nickname : nickname,
    email: realEmail || existingRow?.email || null,
    photo_url: photo || existingRow?.photo_url || null,
    hero_cover_url: photo || existingRow?.hero_cover_url || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (upsertError) throw new Error(upsertError.message);

  const { data: authAfter } = await admin.auth.admin.getUserById(authUserId);
  const sessionEmail = String(authAfter?.user?.email || loginEmail);
  const session = await issueSessionForEmail(admin, anon, sessionEmail);

  return {
    ...session,
    linked: false,
    profile: {
      id: okbmUserId,
      email: realEmail,
      nickname: existingRow?.nickname && existingRow.nickname !== "낭만백패커" ? existingRow.nickname : nickname,
      photo: photo || existingRow?.hero_cover_url || existingRow?.photo_url || "",
      name: sanitizeNick(profile.name) || nickname,
      provider: profile.provider,
    },
  };
}
