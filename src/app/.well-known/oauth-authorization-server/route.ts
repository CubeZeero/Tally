import { authServerMetadata, OAUTH_CORS } from "@/lib/oauth";

// RFC 8414 Authorization Server Metadata. Tally is its own authorization server.

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}

export function GET(req: Request) {
  return Response.json(authServerMetadata(req), {
    headers: { ...OAUTH_CORS, "Cache-Control": "no-store" },
  });
}
