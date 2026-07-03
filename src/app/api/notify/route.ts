import { prisma } from "@/lib/db";
import { notifyUpcoming } from "@/lib/notify";

// Optional cron-friendly endpoint (the built-in scheduler covers this too).
//   curl "http://host:6400/api/notify?token=XXXX"   (token is per-user)
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findFirst({ where: { notifyToken: token } });
  if (!user) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await notifyUpcoming(user.id);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
