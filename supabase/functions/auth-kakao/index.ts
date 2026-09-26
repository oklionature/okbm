import {
  handleOptions,
  issueSocialSession,
  jsonResponse,
  readBearerAuthUser,
  SocialAuthError,
} from "./social-session.ts";

const KAKAO_TOKEN_INFO_URL = "https://kapi.kakao.com/v1/user/access_token_info";
const KAKAO_ME_URL = "https://kapi.kakao.com/v2/user/me";

function trustedKakaoEmail(account: Record<string, unknown>): string {
  if (account.is_email_verified !== true) return "";
  return String(account.email || "").trim();
}

function expectedKakaoAppId(): string {
  return String(Deno.env.get("KAKAO_APP_ID") || "").trim();
}

function sameKakaoAppId(left: unknown, right: unknown): boolean {
  const a = String(left ?? "").trim();
  const b = String(right ?? "").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const nA = Number(a);
  const nB = Number(b);
  return Number.isFinite(nA) && Number.isFinite(nB) && nA === nB;
}

async function assertKakaoTokenApp(
  req: Request,
  accessToken: string,
): Promise<Response | null> {
  const expectedAppId = expectedKakaoAppId();
  if (!expectedAppId) {
    console.error("[auth-kakao] KAKAO_APP_ID missing");
    return jsonResponse(req, { error: "kakao_app_id_missing" }, 500);
  }

  let infoRes: Response;
  try {
    infoRes = await fetch(KAKAO_TOKEN_INFO_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
  } catch (networkErr) {
    console.error("[auth-kakao] token info network", networkErr);
    return jsonResponse(req, { error: "kakao_network_failed" }, 502);
  }

  if (infoRes.status === 401 || infoRes.status === 403) {
    return jsonResponse(req, { error: "invalid_kakao_token" }, 401);
  }
  if (!infoRes.ok) {
    return jsonResponse(req, { error: "kakao_token_info_failed", status: infoRes.status }, 502);
  }

  const info = await infoRes.json();
  const appId = info?.app_id ?? info?.appId;
  if (!sameKakaoAppId(appId, expectedAppId)) {
    return jsonResponse(req, { error: "kakao_app_mismatch" }, 401);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  try {
    let body: { access_token?: string; mode?: string } = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "invalid_json" }, 400);
    }

    const accessToken = String(body.access_token || "").trim();
    if (!accessToken) {
      return jsonResponse(req, { error: "missing_access_token" }, 400);
    }

    const isLink = String(body.mode || "").trim().toLowerCase() === "link";
    let linkTo = undefined;
    if (isLink) {
      const authUser = await readBearerAuthUser(req);
      if (!authUser) return jsonResponse(req, { error: "login_required" }, 401);
      linkTo = authUser;
    }

    const tokenGuard = await assertKakaoTokenApp(req, accessToken);
    if (tokenGuard) return tokenGuard;

    let kakaoRes: Response;
    try {
      kakaoRes = await fetch(KAKAO_ME_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });
    } catch (networkErr) {
      console.error("[auth-kakao] kakao network", networkErr);
      return jsonResponse(req, { error: "kakao_network_failed" }, 502);
    }

    if (kakaoRes.status === 401 || kakaoRes.status === 403) {
      return jsonResponse(req, { error: "invalid_kakao_token" }, 401);
    }
    if (!kakaoRes.ok) {
      return jsonResponse(req, { error: "kakao_profile_failed", status: kakaoRes.status }, 502);
    }

    const kakaoJson = await kakaoRes.json();
    const kakaoId = String(kakaoJson?.id || "").trim();
    if (!kakaoId) {
      return jsonResponse(req, { error: "invalid_kakao_profile" }, 401);
    }

    const account = kakaoJson.kakao_account || {};
    const profile = account.profile || {};
    const properties = kakaoJson.properties || {};

    const session = await issueSocialSession({
      provider: "kakao",
      providerId: kakaoId,
      email: trustedKakaoEmail(account),
      nickname: String(profile.nickname || properties.nickname || ""),
      name: String(profile.nickname || properties.nickname || ""),
      photo: String(
        profile.profile_image_url ||
          profile.thumbnail_image_url ||
          properties.profile_image ||
          properties.thumbnail_image ||
          "",
      ),
    }, { linkTo });

    return jsonResponse(req, session, 200);
  } catch (err) {
    if (err instanceof SocialAuthError) {
      return jsonResponse(req, { error: err.code, message: err.message }, err.status);
    }
    // 내부 오류 문구는 로그에만 남기고 클라이언트에는 코드만 보낸다.
    console.error("[auth-kakao]", err);
    return jsonResponse(req, { error: "auth_bridge_failed" }, 500);
  }
});
