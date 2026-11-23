import { mcpHandler } from "@/lib/mcp/server";

// Streamable HTTP MCP endpoint, stateless. Auth is a per-user bearer API key in
// the Authorization header (Claude Code / mcp-remote). For clients whose UI has
// no header field (claude.ai / Desktop custom connector), use the token-in-URL
// variant at /api/mcp/[token]. Tools and auth live in @/lib/mcp/server.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
