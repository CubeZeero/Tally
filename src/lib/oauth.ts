import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { oauthSigningKey } from "@/lib/auth";

// OAuth 2.1 authorization server + resource-server helpers for the MCP endpoint.
// Access tokens are stateless HS256 JWTs (aud = MCP resource URI). Refresh
// tokens are opaque, stored hashed, and rotated on use.

export const SCOPES = ["tally:read", "tally:write"] as const;
export const DEFAULT_SCOPE = "tally:read";

/**
 * Granted scope for an authorization request: the client's requested scopes
 * intersected with what we support; if the client requested none, grant all
 * supported (the consent screen shows exactly what is granted).
 */
export function grantScopes(requested: string | undefined): string {
  const req = (requested ?? "").split(/\s+/).filter(Boolean);
  const granted = req.filter((s) => (SCOPES as readonly string[]).includes(s));
  return (granted.length ? granted : [...SCOPES]).join(" ");
}

const ACCESS_TTL_SEC = 60 * 60; // 1 hour
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
export const CODE_TTL_SEC = 10 * 60; // 10 minutes

/**
 * Public-facing origin, honoring reverse-proxy headers, without trailing slash.
 * Used consistently for the token audience so the AS and RS agree on the
 * canonical resource URI. Works from both a Request and next/headers().
 */
export function originFromHeaders(h: Headers): string {
  const first = (v: string | null) => v?.split(",")[0]?.trim() || undefined;
  let fProto: string | undefined;
  let fHost: string | undefined;
  const fwd = h.get("forwarded");
  if (fwd) {
    const seg = fwd.split(",")[0];
    fProto = /proto=([^;]+)/i.exec(seg)?.[1]?.replace(/"/g, "").trim();
    fHost = /host=([^;]+)/i.exec(seg)?.[1]?.replace(/"/g, "").trim();
  }
  const host = first(h.get("x-forwarded-host")) || fHost || h.get("host") || "localhost:6400";
  const proto =
    first(h.get("x-forwarded-proto")) ||
    fProto ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export function publicOrigin(req: Request): string {
  return originFromHeaders(req.headers);
}

/** Canonical MCP resource URI (RFC 8707 audience) for this deployment. */
export function mcpResource(req: Request): string {
  return `${publicOrigin(req)}/api/mcp`;
}

/** OAuth issuer (this server acts as its own authorization server). */
export function issuer(req: Request): string {
  return publicOrigin(req);
}

export const OAUTH_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version",
};

/** RFC 9728 Protected Resource Metadata for the MCP endpoint. */
export function protectedResourceMetadata(req: Request) {
  return {
    resource: mcpResource(req),
    authorization_servers: [issuer(req)],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ["header"],
  };
}

/** RFC 8414 Authorization Server Metadata (this server is its own AS). */
export function authServerMetadata(req: Request) {
  const o = issuer(req);
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    registration_endpoint: `${o}/oauth/register`,
    scopes_supported: [...SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  };
}

export function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Verify a PKCE code_verifier against an S256 code_challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = b64url(createHash("sha256").update(verifier).digest());
  return computed === challenge;
}

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Redirect URIs allowed at registration (OAuth 2.1 for native apps): HTTPS,
 * HTTP loopback, or a private-use (custom) scheme. Plain HTTP to a non-loopback
 * host is rejected.
 */
export function isAllowedRedirectUri(u: string): boolean {
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return LOOPBACK_HOSTS.has(url.hostname);
  // Private-use URI scheme for native apps (e.g. "cursor:", "com.example.app:").
  return url.protocol.length > 1 && url.protocol.endsWith(":");
}

// ---- Access tokens (JWT) --------------------------------------------------

export async function mintAccessToken(opts: {
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
  iss: string;
}): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({ scope: opts.scope, client_id: opts.clientId })
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt" })
    .setIssuer(opts.iss)
    .setSubject(opts.userId)
    .setAudience(opts.resource)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(oauthSigningKey());
  return { token, expiresIn: ACCESS_TTL_SEC };
}

export type AccessClaims = { userId: string; clientId: string; scopes: string[] };

/** Verify an access token was issued by us for this exact MCP resource. */
export async function verifyAccessToken(
  token: string,
  expectedResource: string,
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, oauthSigningKey(), {
      audience: expectedResource, // RFC 8707 audience binding
    });
    if (typeof payload.sub !== "string") return null;
    const scope = typeof payload.scope === "string" ? payload.scope : "";
    const clientId = typeof payload.client_id === "string" ? payload.client_id : "";
    return { userId: payload.sub, clientId, scopes: scope ? scope.split(" ") : [] };
  } catch {
    return null;
  }
}

// ---- Refresh tokens (opaque, hashed, rotating) ----------------------------

export async function issueRefreshToken(opts: {
  userId: string;
  clientId: string;
  scope: string;
  resource: string;
}): Promise<string> {
  const raw = randomToken(48);
  await prisma.oAuthRefreshToken.create({
    data: {
      tokenHash: sha256hex(raw),
      clientId: opts.clientId,
      userId: opts.userId,
      scope: opts.scope,
      resource: opts.resource,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    },
  });
  return raw;
}

/**
 * Validate a refresh token, revoke it, and issue a replacement (rotation).
 * Returns the grant details plus the new refresh token, or null if invalid.
 */
export async function rotateRefreshToken(
  raw: string,
  clientId: string,
): Promise<
  | { userId: string; clientId: string; scope: string; resource: string; refreshToken: string }
  | null
> {
  const hash = sha256hex(raw);
  const row = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash: hash } });
  if (!row || row.revokedAt || row.clientId !== clientId || row.expiresAt < new Date()) {
    return null;
  }
  // Revoke the presented token, then mint a fresh one (rotation).
  await prisma.oAuthRefreshToken.update({
    where: { tokenHash: hash },
    data: { revokedAt: new Date() },
  });
  const refreshToken = await issueRefreshToken({
    userId: row.userId,
    clientId: row.clientId,
    scope: row.scope,
    resource: row.resource,
  });
  return {
    userId: row.userId,
    clientId: row.clientId,
    scope: row.scope,
    resource: row.resource,
    refreshToken,
  };
}
