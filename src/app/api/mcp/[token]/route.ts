import { mcpHandler, MCP_STREAMABLE_PATH } from "@/lib/mcp/server";

// Token-in-URL MCP endpoint for clients that can't send a static Authorization
// header (claude.ai / Desktop custom connectors accept only a URL + optional
// OAuth). The per-user apiKey is embedded in the path, mirroring Tally's iCal /
// notify feed tokens. We rewrite the request onto the base streamable endpoint
// and inject the Authorization header, then delegate to the shared handler so
// tools and auth stay identical to /api/mcp.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await ctx.params;

  const url = new URL(req.url);
  url.pathname = MCP_STREAMABLE_PATH;

  const headers = new Headers(req.headers);
  headers.set("authorization", `Bearer ${token}`);

  const bodyless = req.method === "GET" || req.method === "HEAD";
  const init: RequestInit & { duplex?: "half" } = { method: req.method, headers };
  if (!bodyless) {
    init.body = req.body;
    init.duplex = "half"; // required by undici when passing a streaming body
  }

  return mcpHandler(new Request(url, init));
}

export { handle as GET, handle as POST, handle as DELETE };
