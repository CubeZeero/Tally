import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { PieChart } from "@/components/PieChart";
import { LineChart } from "@/components/LineChart";
import { SubIcon } from "@/components/SubIcon";
import { colorAt } from "@/lib/colors";
import {
  type Cycle,
  convert,
  formatMoney,
  isInTrial,
  monthlyCost,
  occurrencesInRange,
} from "@/lib/money";
import { ensureRates, parseRates } from "@/lib/rates";
import { serverT } from "@/lib/server-lang";
import { fmtDate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await requireAuth();
  await ensureRates(userId);
  const { lang, t } = await serverT();

  const [user, subs] = await Promise.all([
    getUser(userId),
    prisma.subscription.findMany({ where: { userId } }),
  ]);
  const main = user?.currency ?? "JPY";
  const rates = parseRates(user?.ratesJson ?? null);
  const active = subs.filter((s) => s.active);

  const withMonthly = active
    .map((s) => {
      const converted = convert(s.cost, s.currency, main, rates);
      return {
        s,
        monthly:
          converted === null || isInTrial(s.trialEndDate)
            ? null
            : monthlyCost(converted, s.cycle as Cycle, s.cycleCount),
      };
    })
    .filter((x) => x.monthly !== null) as {
    s: (typeof active)[number];
    monthly: number;
  }[];

  const totalMonthly = withMonthly.reduce((a, b) => a + b.monthly, 0);
  const totalYearly = totalMonthly * 12;
  const avgMonthly = withMonthly.length
    ? totalMonthly / withMonthly.length
    : 0;
  const mostExpensive = withMonthly
    .slice()
    .sort((a, b) => b.monthly - a.monthly)[0];

  // Category pie (by monthly).
  const byCategory = new Map<string, number>();
  for (const { s, monthly } of withMonthly) {
    const k = s.category || t("common.uncategorized");
    byCategory.set(k, (byCategory.get(k) ?? 0) + monthly);
  }
  const catSlices = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: colorAt(i) }));

  // Payment-method pie (by monthly).
  const byPm = new Map<string, number>();
  for (const { s, monthly } of withMonthly) {
    const k = s.paymentMethod || t("stats.pmUnset");
    byPm.set(k, (byPm.get(k) ?? 0) + monthly);
  }
  const pmSlices = [...byPm.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: colorAt(i + 3) }));

  // Next-12-months actual scheduled spend (line chart).
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 12, 0, 23, 59, 59);
  const monthly12 = Array(12).fill(0);
  for (const s of active) {
    const anchor = s.trialEndDate ?? s.nextBillDate ?? s.startDate;
    const converted = convert(s.cost, s.currency, main, rates);
    if (converted === null) continue;
    for (const date of occurrencesInRange(
      anchor,
      s.cycle as Cycle,
      s.cycleCount,
      windowStart,
      windowEnd,
    )) {
      const idx =
        (date.getFullYear() - windowStart.getFullYear()) * 12 +
        (date.getMonth() - windowStart.getMonth());
      if (idx >= 0 && idx < 12) monthly12[idx] += converted;
    }
  }
  const linePoints = monthly12.map((value, i) => ({
    label: fmtDate(
      new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1),
      lang,
      { month: "short" },
    ),
    value,
  }));

  return (
    <Shell active="stats">
      <div className="px-6 md:px-12 py-10 space-y-12">
        <div>
          <p className="label label-soft">{t("stats.eyebrow")}</p>
          <h1 className="headline text-4xl md:text-5xl mt-2">
            {t("stats.title")}
          </h1>
        </div>

        {/* Key figures */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--color-line)] border-y border-[color:var(--color-line)]">
          <Figure label={t("stats.avgMonthly")} value={formatMoney(totalMonthly, main)} />
          <Figure label={t("stats.yearly")} value={formatMoney(totalYearly, main)} />
          <Figure
            label={t("stats.perItem")}
            value={formatMoney(avgMonthly, main)}
            sub={t("stats.itemsN", { n: withMonthly.length })}
          />
          <Figure
            label={t("stats.max")}
            value={mostExpensive ? formatMoney(mostExpensive.monthly, main) : "—"}
            sub={mostExpensive?.s.name}
          />
        </div>

        {/* Line chart */}
        <section>
          <p className="label mb-4">{t("stats.forecast")}</p>
          {totalMonthly > 0 ? (
            <div className="card p-5">
              <LineChart points={linePoints} />
            </div>
          ) : (
            <Empty t={t} />
          )}
        </section>

        {/* Most expensive ranking */}
        <section>
          <p className="label mb-4">{t("stats.ranking")}</p>
          {withMonthly.length === 0 ? (
            <Empty t={t} />
          ) : (
            <ul className="space-y-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden">
              {withMonthly
                .slice()
                .sort((a, b) => b.monthly - a.monthly)
                .slice(0, 8)
                .map(({ s, monthly }, i) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 bg-[color:var(--color-paper-soft)] px-4 py-3"
                  >
                    <span className="label label-soft w-5">{i + 1}</span>
                    <SubIcon icon={s.icon} image={s.image} color={s.color} />
                    <span className="text-sm truncate">{s.name}</span>
                    <span className="ml-auto text-sm tabular-nums">
                      {formatMoney(monthly, main)}
                      <span className="label label-soft ml-1">
                        {t("stats.perMonth")}
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* Two pies */}
        <div className="grid md:grid-cols-2 gap-12">
          <PieSection
            title={t("stats.byCategory")}
            slices={catSlices}
            total={totalMonthly}
            main={main}
            emptyLabel={t("dash.noData")}
          />
          <PieSection
            title={t("stats.byPayment")}
            slices={pmSlices}
            total={totalMonthly}
            main={main}
            emptyLabel={t("dash.noData")}
          />
        </div>
      </div>
    </Shell>
  );
}

function Figure({
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

function PieSection({
  title,
  slices,
  total,
  main,
  emptyLabel,
}: {
  title: string;
  slices: { label: string; value: number; color: string }[];
  total: number;
  main: string;
  emptyLabel: string;
}) {
  return (
    <section>
      <p className="label mb-4">{title}</p>
      {slices.length === 0 ? (
        <div className="card px-5 py-8 text-center">
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {emptyLabel}
          </p>
        </div>
      ) : (
        <div className="card p-5 flex flex-col sm:flex-row items-center gap-6">
          <PieChart data={slices} />
          <ul className="w-full sm:flex-1 space-y-2.5 min-w-0">
            {slices.map((s) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0;
              return (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-sm truncate">{s.label}</span>
                  <span className="ml-auto text-sm tabular-nums text-[color:var(--color-ink-soft)]">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="text-sm text-[color:var(--color-ink-soft)]">
        {t("dash.noData")}
      </p>
    </div>
  );
}
