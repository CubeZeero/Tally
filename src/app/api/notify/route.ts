import { prisma } from "@/lib/db";
import { notifyUpcoming } from "@/lib/notify";
import { hashApiToken } from "@/lib/token-hash";

// Compatibility endpoint for existing external schedulers. Send the
// existing notification token in the Authorization header.
export async function POST(req: Request) {
  const token = /^Bearer ([^\s,]+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const headers = { "Cache-Control": "no-store" };
  if (!token || token.length < 16 || token.length > 128) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const user = await prisma.user.findFirst({
    where: { notifyToken: hashApiToken(token) }, select: { id: true },
  });
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401, headers });

  const result = await notifyUpcoming(user.id);
  return Response.json(result, { status: result.ok ? 200 : 502, headers });
}
