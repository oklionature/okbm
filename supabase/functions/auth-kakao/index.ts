import { handleOptions, issueSocialSession, jsonResponse } from "./social-session.ts";

const KAKAO_ME_URL = "https://kapi.kakao.com/v2/user/me";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  try {
    let body: { access_token?: string } = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "invalid_json" }, 400);
    }

    const accessToken = String(body.access_token || "").trim();
    if (!accessToken) {
      return jsonResponse(req, { error: "missing_access_token" }, 400);
    }

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
      email: String(account.email || ""),
      nickname: String(profile.nickname || properties.nickname || ""),
      name: String(profile.nickname || properties.nickname || ""),
      photo: String(
        profile.profile_image_url ||
          profile.thumbnail_image_url ||
          properties.profile_image ||
          properties.thumbnail_image ||
          "",
      ),
    });

    return jsonResponse(req, session, 200);
  } catch (err) {
    console.error("[auth-kakao]", err);
    return jsonResponse(req, {
      error: "auth_bridge_failed",
      message: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
