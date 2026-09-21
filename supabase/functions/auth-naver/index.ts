import { handleOptions, issueSocialSession, jsonResponse } from "./social-session.ts";

const NAVER_ME_URL = "https://openapi.naver.com/v1/nid/me";

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
      email: String(row.email || ""),
      nickname: String(row.nickname || row.name || ""),
      name: String(row.name || row.nickname || ""),
      photo: String(row.profile_image || ""),
    });

    return jsonResponse(req, session, 200);
  } catch (err) {
    console.error("[auth-naver]", err);
    return jsonResponse(req, {
      error: "auth_bridge_failed",
      message: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
