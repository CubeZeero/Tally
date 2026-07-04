import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { CalendarView, type CalEvent } from "@/components/CalendarView";
import {
  type Cycle,
  convert,
  formatMoney,
  occurrencesInRange,
} from "@/lib/money";
import { ensureRates, parseRates } from "@/lib/rates";
import { serverT } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

function parseYM(ym?: string): { year: number; month: number } {
  const now = new Date();
  if (ym && /^\d{4}-\d{1,2}$/.test(ym)) {
    const [y, m] = ym.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function ymString(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const userId = await requireAuth();
  await ensureRates(userId);
  const { lang, t } = await serverT();
  const { ym } = await searchParams;
  const { year, month } = parseYM(ym);

  const [user, subs] = await Promise.all([
    getUser(userId),
    prisma.subscription.findMany({ where: { userId, active: true } }),
  ]);
  const main = user?.currency ?? "JPY";
  const rates = parseRates(user?.ratesJson ?? null);

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const leading = monthStart.getDay();

  const eventsByDay: Record<string, CalEvent[]> = {};
  let monthTotal = 0;
  for (const s of subs) {
    const anchor = s.trialEndDate ?? s.nextBillDate ?? s.startDate;
    const occ = occurrencesInRange(
      anchor,
      s.cycle as Cycle,
      s.cycleCount,
      monthStart,
      monthEnd,
    );
    const own = s.currency || main;
    const converted = convert(s.cost, s.currency, main, rates);
    for (const date of occ) {
      const key = String(date.getDate());
      (eventsByDay[key] ??= []).push({
        name: s.name,
        color: s.color,
        icon: s.icon,
        image: s.image,
        amount: formatMoney(s.cost, own),
        convertedNum: converted,
        ownCurrency: own,
      });
      if (converted !== null) monthTotal += converted;
    }
  }

  const today = new Date();
  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : null;

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const nextM = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <Shell active="calendar">
      <div className="px-6 md:px-12 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="label label-soft">{t("cal.eyebrow")}</p>
            <h1 className="headline text-4xl md:text-5xl mt-2">
              {t("cal.monthTitle", { y: year, m: month })}
            </h1>
            <p className="text-sm text-[color:var(--color-ink-soft)] mt-2">
              {t("cal.monthTotal")} {formatMoney(monthTotal, main)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?ym=${ymString(prev.y, prev.m)}`}
              className="btn btn-ghost"
            >
              {t("cal.prev")}
            </Link>
            <Link href="/calendar" className="btn btn-ghost">
              {t("cal.thisMonth")}
            </Link>
            <Link
              href={`/calendar?ym=${ymString(nextM.y, nextM.m)}`}
              className="btn btn-ghost"
            >
              {t("cal.next")}
            </Link>
          </div>
        </div>

        <CalendarView
          year={year}
          month={month}
          daysInMonth={daysInMonth}
          leading={leading}
          eventsByDay={eventsByDay}
          todayDay={todayDay}
          main={main}
          lang={lang}
        />
      </div>
    </Shell>
  );
}
