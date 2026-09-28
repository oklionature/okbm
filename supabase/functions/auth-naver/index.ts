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
const NAVER_REVOKE_URL = "https://nid.naver.com/oauth2.0/revoke";
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

// 로그인 세션 사용자에 묶인 네이버 ID. 네이버 로그인 가입자는 okbm_user_id가 naver_<id>,
// 다른 소셜로 가입 후 네이버를 연결한 사용자는 app_metadata.naver_id에 들어 있다.
function linkedNaverIds(user: { app_metadata?: Record<string, unknown> } | null): string[] {
  const meta = (user?.app_metadata || {}) as Record<string, unknown>;
  const ids: string[] = [];
  const direct = String(meta.naver_id || "").trim();
  if (direct) ids.push(direct.replace(/^naver_/, ""));
  const okbm = String(meta.okbm_user_id || "").trim();
  if (okbm.startsWith("naver_")) ids.push(okbm.slice("naver_".length));
  return ids.filter(Boolean);
}

// 네이버 Token Revocation. 200이면 폐기 완료(이미 폐기된 토큰 포함).
// 신규 /oauth2.0/revoke가 없는 환경이면 예전 grant_type=delete로 한 번 더 시도한다.
async function revokeNaverAccessToken(accessToken: string): Promise<boolean> {
  const clientId = String(Deno.env.get("NAVER_CLIENT_ID") || NAVER_CLIENT_ID).trim();
  const clientSecret = String(Deno.env.get("NAVER_CLIENT_SECRET") || "").trim();
  if (!clientSecret || !accessToken) return false;
  try {
    const res = await fetch(NAVER_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: accessToken,
        token_type_hint: "access_token",
      }),
    });
    if (res.status === 200) return true;
    if (res.status !== 404 && res.status !== 405) {
      console.error("[auth-naver] revoke failed", res.status);
      return false;
    }
  } catch (err) {
    console.error("[auth-naver] revoke network", err);
    return false;
  }
  try {
    const legacy = await fetch(NAVER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "delete",
        client_id: clientId,
        client_secret: clientSecret,
        access_token: accessToken,
        service_provider: "NAVER",
      }),
    });
    const map = parseTokenMap(await legacy.text());
    return legacy.ok && String(map.result || "").toLowerCase() === "success";
  } catch (err) {
    console.error("[auth-naver] legacy revoke network", err);
    return false;
  }
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

    const mode = String(body.mode || "").trim().toLowerCase();
    const isLink = mode === "link";
    // revoke: 회원 탈퇴 직전 네이버 재인증으로 받은 code를 교환해 연동을 해제한다. 세션은 발급하지 않는다.
    const isRevoke = mode === "revoke";
    let linkTo = undefined;
    let revokeUser: Awaited<ReturnType<typeof readBearerAuthUser>> = null;
    if (isLink) {
      const authUser = await readBearerAuthUser(req);
      if (!authUser) return jsonResponse(req, { error: "login_required" }, 401);
      linkTo = authUser;
    }
    if (isRevoke) {
      revokeUser = await readBearerAuthUser(req);
      if (!revokeUser) return jsonResponse(req, { error: "login_required" }, 401);
      if (!linkedNaverIds(revokeUser).length) return jsonResponse(req, { error: "naver_not_linked" }, 400);
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

    if (isRevoke) {
      // 탈퇴하는 계정에 연결된 네이버와 방금 인증한 네이버가 같을 때만 해제한다.
      if (linkedNaverIds(revokeUser).indexOf(naverId) === -1) {
        return jsonResponse(req, { error: "naver_account_mismatch" }, 403);
      }
      const revoked = await revokeNaverAccessToken(accessToken);
      if (!revoked) return jsonResponse(req, { error: "naver_revoke_failed" }, 502);
      return jsonResponse(req, { ok: true, revoked: true }, 200);
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
