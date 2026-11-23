import { protectedResourceMetadata, OAUTH_CORS } from "@/lib/oauth";

// Path-variant of the Protected Resource Metadata, e.g.
// /.well-known/oauth-protected-resource/api/mcp — RFC 9728 §3.1. Returns the
// same document as the root; there is a single MCP resource per deployment.

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}

export function GET(req: Request) {
  return Response.json(protectedResourceMetadata(req), {
    headers: { ...OAUTH_CORS, "Cache-Control": "no-store" },
  });
}
