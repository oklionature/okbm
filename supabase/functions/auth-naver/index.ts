import {
  handleOptions,
  isAllowedNaverRedirectUri,
  issueSocialSession,
  jsonResponse,
  readBearerAuthUser,
  SocialAuthError,
} from "./social-session.ts";

const NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
const NAVER_ME_URL = "https://openapi.naver.com/v1/nid/me";
const NAVER_CLIENT_ID = "FKh1hhDec4_gsz8O90Fm";

function trustedNaverEmail(row: Record<string, unknown> | null): string {
  if (!row) return "";
  const email = String(row.email || "").trim();
  if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return "";

  const flag = row.email_verified ?? row.is_email_verified;
  const flagFalse = flag === false || flag === "N" || flag === "false" || flag === 0;
  const flagTrue = flag === true || flag === "Y" || flag === "true" || flag === 1;
  if (flagFalse) return "";
  if (/^[A-Za-z0-9._%+-]+@naver\.com$/i.test(email)) return email;
  if (flagTrue) return email;
  return "";
}

function parseTokenMap(raw: string): Record<string, string> {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object" && !Array.isArray(json)) {
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
        out[key] = String(value ?? "");
      }
      return out;
    }
  } catch {
    // Naver may return application/x-www-form-urlencoded.
  }
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

async function exchangeNaverAuthorizationCode(opts: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<{ accessToken: string } | { error: string; status: number }> {
  const clientId = String(Deno.env.get("NAVER_CLIENT_ID") || NAVER_CLIENT_ID).trim();
  const clientSecret = String(Deno.env.get("NAVER_CLIENT_SECRET") || "").trim();
  if (!clientSecret) {
    console.error("[auth-naver] NAVER_CLIENT_SECRET missing");
    return { error: "naver_client_secret_missing", status: 500 };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: opts.code,
    state: opts.state,
    redirect_uri: opts.redirectUri,
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(NAVER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        Accept: "application/json",
      },
      body,
    });
  } catch (networkErr) {
    console.error("[auth-naver] token network", networkErr);
    return { error: "naver_token_network_failed", status: 502 };
  }

  const tokenMap = parseTokenMap(await tokenRes.text());
  const accessToken = String(tokenMap.access_token || "").trim();
  if (!tokenRes.ok || !accessToken || tokenMap.error) {
    console.error("[auth-naver] code exchange failed", tokenRes.status, tokenMap.error || tokenMap.error_description || "");
    return { error: "naver_code_exchange_failed", status: 401 };
  }
  return { accessToken };
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  try {
    let body: {
      code?: string;
      state?: string;
      redirect_uri?: string;
      mode?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "invalid_json" }, 400);
    }

    const code = String(body.code || "").trim();
    const state = String(body.state || "").trim();
    const redirectUri = String(body.redirect_uri || "").trim();
    if (!code) return jsonResponse(req, { error: "missing_authorization_code" }, 400);
    if (!state) return jsonResponse(req, { error: "missing_oauth_state" }, 400);
    if (!isAllowedNaverRedirectUri(redirectUri)) {
      return jsonResponse(req, { error: "invalid_redirect_uri" }, 400);
    }

    const isLink = String(body.mode || "").trim().toLowerCase() === "link";
    let linkTo = undefined;
    if (isLink) {
      const authUser = await readBearerAuthUser(req);
      if (!authUser) return jsonResponse(req, { error: "login_required" }, 401);
      linkTo = authUser;
    }

    const exchanged = await exchangeNaverAuthorizationCode({ code, state, redirectUri });
    if ("error" in exchanged) {
      return jsonResponse(req, { error: exchanged.error }, exchanged.status);
    }
    const accessToken = exchanged.accessToken;

    let naverRes: Response;
    try {
      naverRes = await fetch(NAVER_ME_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
    } catch (networkErr) {
      console.error("[auth-naver] naver network", networkErr);
      return jsonResponse(req, { error: "naver_network_failed" }, 502);
    }

    if (naverRes.status === 401 || naverRes.status === 403) {
      return jsonResponse(req, { error: "invalid_naver_token" }, 401);
    }
    if (!naverRes.ok) {
      return jsonResponse(req, { error: "naver_profile_failed", status: naverRes.status }, 502);
    }

    const naverJson = await naverRes.json();
    const row = naverJson && naverJson.response ? naverJson.response : null;
    const naverId = String(row?.id || "").trim();
    if (!naverId || String(naverJson?.resultcode || "") !== "00") {
      return jsonResponse(req, { error: "invalid_naver_profile" }, 401);
    }

    const session = await issueSocialSession({
      provider: "naver",
      providerId: naverId,
      email: trustedNaverEmail(row),
      nickname: String(row.nickname || row.name || ""),
      name: String(row.name || row.nickname || ""),
      photo: String(row.profile_image || ""),
    }, { linkTo });

    return jsonResponse(req, session, 200);
  } catch (err) {
    if (err instanceof SocialAuthError) {
      return jsonResponse(req, { error: err.code, message: err.message }, err.status);
    }
    // 내부 오류 문구는 로그에만 남기고 클라이언트에는 코드만 보낸다.
    console.error("[auth-naver]", err);
    return jsonResponse(req, { error: "auth_bridge_failed" }, 500);
  }
});
