import { readBody, BodyTooLargeError } from "@/lib/request-body";
import { allowRequest } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import {
  OAUTH_CORS,
  grantScopes,
  isAllowedRedirectUri,
  randomToken,
  sha256hex,
} from "@/lib/oauth";

// OAuth 2.0 Dynamic Client Registration (RFC 7591). Required by strict clients
// (e.g. ChatGPT). Public clients (PKCE) get token_endpoint_auth_method "none".

export const dynamic = "force-dynamic";

function err(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: { ...OAUTH_CORS, "Cache-Control": "no-store" } },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}

export async function POST(req: Request) {
  if (!allowRequest("oauth-register", 30)) return err("temporarily_unavailable", "Too many registrations", 429);
  let body: Record<string, unknown>;
  try {
    const data = JSON.parse(new TextDecoder().decode(await readBody(req, 16_384)));
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return err("invalid_client_metadata", "Body must be a JSON object");
    }
    body = data;
  } catch (error) {
    return error instanceof BodyTooLargeError
      ? err("invalid_client_metadata", "Body is too large", 413)
      : err("invalid_client_metadata", "Body must be JSON");
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
  if (redirectUris.length === 0 || redirectUris.length > 10) {
    return err("invalid_redirect_uri", "redirect_uris is required");
  }
  for (const u of redirectUris) {
    if (typeof u !== "string" || u.length > 2048 || !isAllowedRedirectUri(u)) {
      return err("invalid_redirect_uri", "Disallowed redirect_uri");
    }
  }

  const tokenAuth =
    body.token_endpoint_auth_method === "client_secret_post"
      ? "client_secret_post"
      : "none";
  const clientName =
    typeof body.client_name === "string" ? body.client_name.slice(0, 200) : null;
  const scope = grantScopes(typeof body.scope === "string" ? body.scope : undefined);

  const clientSecret = tokenAuth === "client_secret_post" ? randomToken(32) : null;

  const client = await prisma.oAuthClient.create({
    data: {
      clientName,
      redirectUris: JSON.stringify(redirectUris),
      grantTypes: "authorization_code,refresh_token",
      tokenEndpointAuthMethod: tokenAuth,
      clientSecretHash: clientSecret ? sha256hex(clientSecret) : null,
      scope,
    },
  });

  return Response.json(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: tokenAuth,
      ...(clientName ? { client_name: clientName } : {}),
      scope,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    },
    { status: 201, headers: { ...OAUTH_CORS, "Cache-Control": "no-store" } },
  );
}
