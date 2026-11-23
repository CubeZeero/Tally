import { protectedResourceMetadata, OAUTH_CORS } from "@/lib/oauth";

// RFC 9728 Protected Resource Metadata. Served at the root; the identical
// path-variant (/.well-known/oauth-protected-resource/api/mcp) is handled by
// the [...seg] route so header-parsing and well-known-probing clients both work.

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: OAUTH_CORS });
}

export function GET(req: Request) {
  return Response.json(protectedResourceMetadata(req), {
    headers: { ...OAUTH_CORS, "Cache-Control": "no-store" },
  });
}
