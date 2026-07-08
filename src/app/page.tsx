import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { SubIcon } from "@/components/SubIcon";
import {
  type Cycle,
  daysUntil,
  effectiveNextBill,
  formatMoney,
  isInTrial,
  monthlyCost,
} from "@/lib/money";
import { convert, ensureRates, parseRates } from "@/lib/rates";
import { PieChart } from "@/components/PieChart";
import { colorAt } from "@/lib/colors";
import { cycleLabel, fmtDate, relDays } from "@/lib/i18n";
import { serverT } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireAuth();
  await ensureRates(userId);
  const { lang, t } = await serverT();

  const [user, subs] = await Promise.all([
    getUser(userId),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const main = user?.currency ?? "JPY";
  const rates = parseRates(user?.ratesJson ?? null);

  const active = subs.filter((s) => s.active);

  const monthlyMain = (s: (typeof active)[number]): number | null => {
    const converted = convert(s.cost, s.currency, main, rates);
    if (converted === null) return null;
    return monthlyCost(converted, s.cycle as Cycle, s.cycleCount);
  };

  let totalMonthly = 0;
  let unconvertible = 0;
  for (const s of active) {
    if (isInTrial(s.trialEndDate)) continue; // free during trial
    const m = monthlyMain(s);
    if (m === null) unconvertible++;
    else totalMonthly += m;
  }
  const totalYearly = totalMonthly * 12;

  const upcoming = active
    .map((s) => ({
      ...s,
      next: effectiveNextBill(
        s.startDate,
        s.trialEndDate ?? s.nextBillDate,
        s.cycle as Cycle,
        s.cycleCount,
      ),
    }))
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 5);

  const byCategory = new Map<string, number>();
  for (const s of active) {
    if (isInTrial(s.trialEndDate)) continue;
    const m = monthlyMain(s);
    if (m === null) continue;
    const key = s.category || t("common.uncategorized");
    byCategory.set(key, (byCategory.get(key) ?? 0) + m);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const slices = categories.map(([name, amount], i) => ({
    label: name,
    value: amount,
    color: colorAt(i),
  }));

  return (
    <Shell active="dashboard">
      <section className="relative overflow-hidden">
        <div
          className="blob hidden sm:block"
          style={{ width: 460, height: 460, right: "-80px", top: "-90px" }}
          aria-hidden
        />

        <div className="relative px-6 md:px-12 pt-12 pb-10">
          <p className="label label-soft">{t("dash.monthlySpend")}</p>
          <h1 className="headline text-[15vw] md:text-[7.5rem] leading-[0.92] mt-2 float-in">
            {formatMoney(totalMonthly, main)}
          </h1>
          <p className="text-sm md:text-base text-[color:var(--color-ink-soft)] mt-5 max-w-md leading-relaxed">
            {t("dash.managingPre")}{" "}
            <strong className="text-ink">{active.length}</strong>{" "}
            {t("dash.managingPost")}{" "}
            <strong className="text-ink">{formatMoney(totalYearly, main)}</strong>{" "}
            {t("dash.managingEnd")}
            {unconvertible > 0 && (
              <span className="block mt-1 text-[color:var(--color-accent)]">
                {unconvertible} {t("dash.unconvertible")}
              </span>
            )}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/subscriptions" className="btn">
              {t("dash.manage")}
            </Link>
            <Link href="/subscriptions?new=1" className="btn btn-ghost">
              {t("dash.addNew")}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-line)] border-y border-[color:var(--color-line)]">
        <Stat label={t("stat.monthlyTotal")} value={formatMoney(totalMonthly, main)} />
        <Stat label={t("stat.yearlyTotal")} value={formatMoney(totalYearly, main)} />
        <Stat
          label={t("stat.count")}
          value={`${active.length}`}
          sub={t("stat.countAll", { n: subs.length })}
        />
        <Stat
          label={t("stat.nextPayment")}
          value={upcoming[0] ? relDays(Math.max(0, daysUntil(upcoming[0].next)), lang) : "—"}
          sub={upcoming[0]?.name}
        />
      </section>

      {user?.monthlyBudget != null && (
        <section className="px-6 md:px-12 pt-8">
          <BudgetBar
            spent={totalMonthly}
            budget={user.monthlyBudget}
            main={main}
            t={t}
          />
        </section>
      )}

      <section className="px-6 md:px-12 py-10 grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <p className="label">{t("dash.upcoming")}</p>
            <Link href="/subscriptions" className="label label-soft hover:text-ink">
              {t("dash.viewAll")}
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Empty t={t} />
          ) : (
            <ul className="space-y-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden">
              {upcoming.map((s) => {
                const d = daysUntil(s.next);
                const own = s.currency || main;
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 bg-[color:var(--color-paper-soft)] px-4 py-3"
                  >
                    <SubIcon icon={s.icon} image={s.image} color={s.color} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="label label-soft truncate">
                        {fmtDate(s.next, lang, { month: "long", day: "numeric" })}
                        {" · "}
                        {relDays(d, lang)}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      {formatMoney(s.cost, own)}
                      <span className="label label-soft block">
                        /{cycleLabel(s.cycle, s.cycleCount, lang)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <p className="label mb-4">{t("dash.byCategory")}</p>
          {categories.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <PieChart data={slices} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="label label-soft">{t("common.total")}</span>
                  <span className="text-sm tabular-nums">
                    {formatMoney(totalMonthly, main)}
                  </span>
                </div>
              </div>
              <ul className="w-full sm:flex-1 space-y-2.5 min-w-0">
                {slices.map((s) => {
                  const pct =
                    totalMonthly > 0 ? (s.value / totalMonthly) * 100 : 0;
                  return (
                    <li key={s.label} className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: s.color }}
                      />
                      <span className="text-sm truncate">{s.label}</span>
                      <span className="ml-auto text-sm tabular-nums text-[color:var(--color-ink-soft)]">
                        {formatMoney(s.value, main)}
                        <span className="label label-soft ml-2">
                          {pct.toFixed(0)}%
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[color:var(--color-paper)] px-5 md:px-7 py-6">
      <p className="label label-soft">{label}</p>
      <p className="text-2xl md:text-3xl mt-2 tabular-nums tracking-tight">
        {value}
      </p>
      {sub && <p className="label label-soft mt-1 truncate">{sub}</p>}
    </div>
  );
}

function BudgetBar({
  spent,
  budget,
  main,
  t,
}: {
  spent: number;
  budget: number;
  main: string;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const over = spent > budget;
  const remaining = budget - spent;
  const barColor = over ? "var(--color-accent)" : "var(--color-ink)";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-4">
        <p className="label">{t("dash.budget")}</p>
        <p className="label label-soft tabular-nums">
          {formatMoney(spent, main)} / {formatMoney(budget, main)}
        </p>
      </div>
      <div className="h-2.5 rounded-full bg-[color:var(--color-line)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: barColor }}
        />
      </div>
      <p className="label label-soft mt-2 tabular-nums">
        {over
          ? t("dash.budgetOver", { amount: formatMoney(-remaining, main) })
          : t("dash.budgetLeft", { amount: formatMoney(remaining, main) })}
      </p>
    </div>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {t("dash.noData")}
      </p>
      <Link
        href="/subscriptions?new=1"
        className="label hover:text-ink mt-2 inline-block"
      >
        {t("dash.addFirst")}
      </Link>
    </div>
  );
}
