import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { SubscriptionManager, type Sub } from "@/components/SubscriptionManager";
import { ensureRates, parseRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const userId = await requireAuth();
  await ensureRates(userId);
  const { new: isNew } = await searchParams;

  const [user, rows, cats, pms] = await Promise.all([
    getUser(userId),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.category.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
  ]);

  const subs: Sub[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    cost: s.cost,
    currency: s.currency,
    icon: s.icon,
    image: s.image,
    cycle: s.cycle,
    cycleCount: s.cycleCount,
    startDate: s.startDate.toISOString(),
    nextBillDate: s.nextBillDate ? s.nextBillDate.toISOString() : null,
    trialEndDate: s.trialEndDate ? s.trialEndDate.toISOString() : null,
    category: s.category,
    paymentMethod: s.paymentMethod,
    url: s.url,
    color: s.color,
    active: s.active,
  }));

  return (
    <Shell active="subscriptions">
      <SubscriptionManager
        subs={subs}
        mainCurrency={user?.currency ?? "JPY"}
        rates={parseRates(user?.ratesJson ?? null)}
        categories={cats.map((c) => c.name)}
        paymentMethods={pms.map((p) => p.name)}
        openNew={isNew === "1"}
      />
    </Shell>
  );
}
