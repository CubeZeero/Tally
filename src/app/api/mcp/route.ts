import { mcpHandler } from "@/lib/mcp/server";

// Stateless Streamable HTTP. Use OAuth or an API key in the Bearer header.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
