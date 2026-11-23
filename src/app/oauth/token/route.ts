import { prisma } from "@/lib/db";
import {
  OAUTH_CORS,
  publicOrigin,
  verifyPkceS256,
  mintAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  sha256hex,
} from "@/lib/oauth";

// OAuth 2.1 token endpoint: authorization_code (with PKCE) + refresh_token.

export const dynamic = "force-dynamic";

function err(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: { ...OAUTH_CORS, "Cache-Control": "no-store" } },
  );
}

function ok(data: Record<string, unknown>) {
  return Response.json(data, { headers: { ...OAUTH_CORS, "Cache-Control": "no-store" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (ct.includes("application/json")) {
    try {
      const j = (await req.json()) as Record<string, unknown>;
      for (const k of Object.keys(j)) out[k] = String(j[k]);
    } catch {
      /* empty */
    }
    return out;
  }
  try {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) out[k] = String(v);
  } catch {
    /* empty */
  }
  return out;
}

export async function POST(req: Request) {
  const p = await parseBody(req);
  const grantType = p.grant_type;
  const clientId = p.client_id ?? "";

  const client = clientId
    ? await prisma.oAuthClient.findUnique({ where: { id: clientId } })
    : null;
  if (!client) return err("invalid_client", "Unknown client", 401);

  if (client.tokenEndpointAuthMethod === "client_secret_post") {
    if (!p.client_secret || sha256hex(p.client_secret) !== client.clientSecretHash) {
      return err("invalid_client", "Invalid client credentials", 401);
    }
  }

  const origin = publicOrigin(req);

  if (grantType === "authorization_code") {
    const row = await prisma.oAuthAuthCode.findUnique({ where: { code: p.code ?? "" } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return err("invalid_grant", "Invalid or expired authorization code");
    }
    if (row.clientId !== clientId) return err("invalid_grant", "Code issued to another client");
    if (row.redirectUri !== (p.redirect_uri ?? "")) {
      return err("invalid_grant", "redirect_uri mismatch");
    }
    if (!verifyPkceS256(p.code_verifier ?? "", row.codeChallenge)) {
      return err("invalid_grant", "PKCE verification failed");
    }
    // Single-use: burn the code before issuing tokens.
    await prisma.oAuthAuthCode.update({ where: { code: row.code }, data: { usedAt: new Date() } });

    const { token, expiresIn } = await mintAccessToken({
      userId: row.userId,
      clientId,
      scope: row.scope,
      resource: row.resource,
      iss: origin,
    });
    const refreshToken = await issueRefreshToken({
      userId: row.userId,
      clientId,
      scope: row.scope,
      resource: row.resource,
    });
    return ok({
      access_token: token,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: row.scope,
    });
  }

  if (grantType === "refresh_token") {
    const rotated = await rotateRefreshToken(p.refresh_token ?? "", clientId);
    if (!rotated) return err("invalid_grant", "Invalid or expired refresh token");
    const { token, expiresIn } = await mintAccessToken({
      userId: rotated.userId,
      clientId,
      scope: rotated.scope,
      resource: rotated.resource,
      iss: origin,
    });
    return ok({
      access_token: token,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: rotated.refreshToken,
      scope: rotated.scope,
    });
  }

  return err("unsupported_grant_type", `Unsupported grant_type: ${grantType}`);
}
