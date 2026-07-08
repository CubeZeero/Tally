import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/ical";

// Read-only iCalendar feed, subscribable in any calendar app:
//   webcal://host:6400/api/calendar/<icalToken>
// The token is per-user and can be regenerated (revoking old links) in settings.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return new Response("not found", { status: 404 });

  const user = await prisma.user.findFirst({ where: { icalToken: token } });
  if (!user) return new Response("not found", { status: 404 });

  const subs = await prisma.subscription.findMany({
    where: { userId: user.id, active: true },
  });

  const ics = buildIcs(subs, {
    mainCurrency: user.currency ?? "JPY",
    alarmDays: user.notifyDaysBefore ?? 3,
    calName: "Tally",
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tally.ics"',
      "Cache-Control": "no-store",
    },
  });
}
