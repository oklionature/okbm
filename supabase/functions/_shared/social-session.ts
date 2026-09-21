import { createClient, type User } from "npm:@supabase/supabase-js@2";

export type SocialProfile = {
  provider: "naver" | "kakao";
  providerId: string;
  email: string;
  nickname: string;
  name: string;
  photo: string;
};

export type IssuedSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
  profile: {
    id: string;
    email: string;
    nickname: string;
    photo: string;
    name: string;
    provider: string;
  };
};

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

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
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

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function sanitizeNick(value: string): string {
  const nick = String(value || "").replace(/\s+/g, " ").trim();
  return nick.slice(0, 24);
}

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return `Nk!${out}`;
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

export async function issueSocialSession(profile: SocialProfile): Promise<IssuedSession> {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  const anonKey = getAnonKey();
  if (!serviceKey) throw new Error("service role key missing");
  if (!anonKey) throw new Error("anon key missing");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providerId = String(profile.providerId || "").trim();
  if (!providerId) throw new Error("provider id missing");

  const scoped = scopedId(profile.provider, providerId);
  const realEmail = normalizeEmail(profile.email);
  const loginEmail = realEmail || syntheticEmail(profile.provider, providerId);
  const nickname = sanitizeNick(profile.nickname || profile.name) || "낭만백패커";
  const photo = String(profile.photo || "").trim();

  let okbmUserId = scoped;

  const { data: byScoped } = await admin
    .from("users")
    .select("id,email,nickname,photo_url,hero_cover_url")
    .eq("id", scoped)
    .maybeSingle();

  let existing = byScoped;
  if (!existing && realEmail) {
    const { data: byEmail } = await admin
      .from("users")
      .select("id,email,nickname,photo_url,hero_cover_url")
      .eq("email", realEmail)
      .limit(1)
      .maybeSingle();
    existing = byEmail;
  }

  if (existing?.id) okbmUserId = String(existing.id);

  const appMetadata = {
    provider: profile.provider,
    providers: [profile.provider],
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

  const password = randomPassword();
  let authUserId = "";

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });

  if (createError || !created?.user?.id) {
    const { data: foundId, error: lookupError } = await admin.rpc("okbm_find_auth_user_id", {
      p_email: loginEmail,
    });
    if (lookupError) {
      throw new Error(createError?.message || lookupError.message || "auth user lookup failed");
    }
    authUserId = String(foundId || "");
    if (!authUserId) {
      throw new Error(createError?.message || "auth user create failed");
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (updateError) throw new Error(updateError.message);
  } else {
    authUserId = created.user.id;
  }

  const { error: upsertError } = await admin.from("users").upsert({
    id: okbmUserId,
    nickname: existing?.nickname && existing.nickname !== "낭만백패커" ? existing.nickname : nickname,
    email: realEmail || existing?.email || null,
    photo_url: photo || existing?.photo_url || null,
    hero_cover_url: photo || existing?.hero_cover_url || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (upsertError) throw new Error(upsertError.message);

  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email: loginEmail,
    password,
  });
  if (signInError || !signedIn?.session?.access_token || !signedIn.session.refresh_token) {
    throw new Error(signInError?.message || "session issue failed");
  }

  return {
    access_token: signedIn.session.access_token,
    refresh_token: signedIn.session.refresh_token,
    expires_in: signedIn.session.expires_in || 3600,
    token_type: signedIn.session.token_type || "bearer",
    user: signedIn.user || signedIn.session.user,
    profile: {
      id: okbmUserId,
      email: realEmail,
      nickname: existing?.nickname && existing.nickname !== "낭만백패커" ? existing.nickname : nickname,
      photo: photo || existing?.hero_cover_url || existing?.photo_url || "",
      name: sanitizeNick(profile.name) || nickname,
      provider: profile.provider,
    },
  };
}
