import { readBody, BodyTooLargeError } from "@/lib/request-body";
import { allowRequest } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import {
  OAUTH_CORS,
  publicOrigin,
  verifyPkceS256,
  mintAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  sha256hex,
  authorizationCodeHash,
  mcpResource,
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
  const out: Record<string, string> = Object.create(null);
  const bytes = await readBody(req, 16_384);
  const text = new TextDecoder().decode(bytes);
  if (ct.includes("application/json")) {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return out;
    for (const [key, item] of Object.entries(value)) if (typeof item === "string") out[key] = item;
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    for (const [key, item] of new URLSearchParams(text)) out[key] = item;
  }
  return out;
}

export async function POST(req: Request) {
  if (!allowRequest("oauth-token", 180)) return err("temporarily_unavailable", "Too many requests", 429);
  let p: Record<string, string>;
  try {
    p = await parseBody(req);
  } catch (error) {
    return error instanceof BodyTooLargeError
      ? err("invalid_request", "Body is too large", 413)
      : err("invalid_request", "Invalid request body");
  }
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
    const row = await prisma.oAuthAuthCode.findUnique({ where: { code: authorizationCodeHash(p.code ?? "") } });
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
    if (row.resource !== mcpResource(req)) return err("invalid_grant", "Resource mismatch");
    const refreshToken = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const consumed = await tx.oAuthAuthCode.updateMany({
        where: { code: row.code, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      return consumed.count ? issueRefreshToken(row, tx) : null;
    });
    if (!refreshToken) return err("invalid_grant", "Invalid or expired authorization code");

    const { token, expiresIn } = await mintAccessToken({
      userId: row.userId,
      clientId,
      scope: row.scope,
      resource: row.resource,
      iss: origin,
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
    const rotated = await rotateRefreshToken(p.refresh_token ?? "", clientId, mcpResource(req));
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
