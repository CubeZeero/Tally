import "server-only";
import type { Subscription } from "@prisma/client";
import { ymd } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ensureRates } from "@/lib/rates";
import type { SubscriptionSearch } from "./integration-input";
import {
  type Cycle,
  type Rates,
  convert,
  CYCLES,
  parseRates,
  monthlyCost,
  yearlyCost,
  nextSubscriptionBill,
  isInTrial,
  daysUntil,
  occurrencesInRange,
  subscriptionBillingAnchor,
} from "@/lib/money";

// Service layer shared by the UI's server actions and the MCP endpoint.
// Functions take a plain userId (no request/cookie context). Reads convert
// amounts to the user's main currency (mirroring lib/notify.ts); writes are
// user-scoped via { id, userId } filters.

async function loadContext(userId: string) {
  await ensureRates(userId);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("user not found");
  return { user, main: user.currency, rates: parseRates(user.ratesJson) };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type SubscriptionView = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  currency: string; // effective currency (own, else main)
  monthlyCostMain: number | null; // null when the FX rate is unavailable
  yearlyCostMain: number | null;
  cycle: string;
  cycleCount: number;
  nextBillDate: string; // YYYY-MM-DD
  daysUntilNextBill: number;
  inTrial: boolean;
  trialEndDate: string | null;
  category: string | null;
  paymentMethod: string | null;
  url: string | null;
  active: boolean;
};

function toView(s: Subscription, main: string, rates: Rates): SubscriptionView {
  const own = s.currency || main;
  const cycle = s.cycle as Cycle;
  const inMain = convert(s.cost, own, main, rates);
  const next = nextSubscriptionBill(s);
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    cost: s.cost,
    currency: own,
    monthlyCostMain: inMain === null ? null : monthlyCost(inMain, cycle, s.cycleCount),
    yearlyCostMain: inMain === null ? null : yearlyCost(inMain, cycle, s.cycleCount),
    cycle: s.cycle,
    cycleCount: s.cycleCount,
    nextBillDate: isoDate(next),
    daysUntilNextBill: daysUntil(next),
    inTrial: isInTrial(s.trialEndDate),
    trialEndDate: s.trialEndDate ? isoDate(s.trialEndDate) : null,
    category: s.category,
    paymentMethod: s.paymentMethod,
    url: s.url,
    active: s.active,
  };
}

export async function listSubscriptions(userId: string, opts: SubscriptionSearch = {}) {
  const { main, rates } = await loadContext(userId);
  const subs = await prisma.subscription.findMany({
    where: {
      userId,
      active: opts.activeOnly || opts.status === "active" ? true : opts.status === "paused" ? false : undefined,
      category: opts.category,
      paymentMethod: opts.paymentMethod,
    },
    orderBy: [{ active: "desc" }, { name: "asc" }, { id: "asc" }],
  });
  const search = opts.q?.toLowerCase();
  const filtered = subs
    .filter((s) => !search || s.name.toLowerCase().includes(search))
    .map((s) => toView(s, main, rates))
    .filter((s) => {
      if (opts.minMonthlyCost === undefined && opts.maxMonthlyCost === undefined) return true;
      const cost = s.monthlyCostMain;
      return cost !== null && cost >= (opts.minMonthlyCost ?? 0) && cost <= (opts.maxMonthlyCost ?? Infinity);
    });
  if (opts.sort === "name") filtered.sort((a, b) => a.name.localeCompare(b.name));
  if (opts.sort === "next_payment") filtered.sort((a, b) => a.nextBillDate.localeCompare(b.nextBillDate));
  if (opts.sort === "monthly_cost_asc" || opts.sort === "monthly_cost_desc") {
    const direction = opts.sort === "monthly_cost_asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (a.monthlyCostMain === null) return b.monthlyCostMain === null ? 0 : 1;
      if (b.monthlyCostMain === null) return -1;
      return direction * (a.monthlyCostMain - b.monthlyCostMain);
    });
  }
  return { mainCurrency: main, count: filtered.length, subscriptions: filtered };
}

export async function getSubscription(userId: string, id: string) {
  const { main, rates } = await loadContext(userId);
  const s = await prisma.subscription.findFirst({ where: { id, userId } });
  return s ? toView(s, main, rates) : null;
}

export async function getTotals(userId: string) {
  const { user, main, rates } = await loadContext(userId);
  const subs = await prisma.subscription.findMany({
    where: { userId, active: true },
  });
  let monthlyTotal = 0;
  let unconvertedCount = 0;
  for (const s of subs) {
    if (isInTrial(s.trialEndDate)) continue; // trials excluded, matching notify.ts
    const inMain = convert(s.cost, s.currency || main, main, rates);
    if (inMain === null) {
      unconvertedCount++;
      continue;
    }
    monthlyTotal += monthlyCost(inMain, s.cycle as Cycle, s.cycleCount);
  }
  const budget = user.monthlyBudget ?? null;
  return {
    mainCurrency: main,
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    monthlyBudget: budget,
    overBudget: budget != null && monthlyTotal > budget,
    activeCount: subs.length,
    unconvertedCount,
  };
}

export async function getUpcomingPayments(userId: string, days = 30) {
  const { main, rates } = await loadContext(userId);
  const subs = await prisma.subscription.findMany({
    where: { userId, active: true },
  });
  const now = new Date();
  const payments = subs
    .map((s) => {
      const next = nextSubscriptionBill(s);
      return {
        id: s.id,
        name: s.name,
        date: isoDate(next),
        daysUntil: daysUntil(next, now),
        cost: s.cost,
        currency: s.currency || main,
        costMain: convert(s.cost, s.currency || main, main, rates),
        inTrial: isInTrial(s.trialEndDate),
      };
    })
    .filter((p) => p.daysUntil >= 0 && p.daysUntil <= days)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return { mainCurrency: main, days, count: payments.length, payments };
}

export async function getPaymentSchedule(userId: string, start: string, end: string) {
  const { main, rates } = await loadContext(userId);
  const subs = await prisma.subscription.findMany({ where: { userId, active: true } });
  const from = new Date(`${start}T00:00:00`);
  const through = new Date(`${end}T23:59:59.999`);
  const payments = subs.flatMap((s) => {
    if (!CYCLES.some(({ value }) => value === s.cycle)) return [];
    const currency = s.currency || main;
    const costMain = convert(s.cost, currency, main, rates);
    return occurrencesInRange(subscriptionBillingAnchor(s),
      s.cycle as Cycle, s.cycleCount, from, through)
      .map(ymd)
      .filter((date) => date >= start && date <= end)
      .map((date) => ({ id: s.id, name: s.name, date, cost: s.cost, currency, costMain }));
  }).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return {
    start, end, mainCurrency: main, count: payments.length, payments,
    totalMain: payments.reduce((total, p) => total + (p.costMain ?? 0), 0),
    unconvertedCount: payments.filter((p) => p.costMain === null).length,
  };
}

export async function getSubscriptionReminders(userId: string, days = 30, kind?: "trial" | "review") {
  const subs = await prisma.subscription.findMany({
    where: { userId, active: true, OR: [{ trialEndDate: { not: null } }, { cancelReminderDays: { not: null } }] },
  });
  const now = new Date();
  const reminders = subs.flatMap((s) => {
    const items: { kind: "trial" | "review"; id: string; name: string; date: string; paymentDate: string; daysUntil: number }[] = [];
    const next = nextSubscriptionBill(s, now);
    const add = (type: "trial" | "review", date: Date, paymentDate: Date, includeOverdue = false) => {
      const remaining = daysUntil(date, now);
      if ((!kind || kind === type) && (includeOverdue || remaining >= 0) && remaining <= days) {
        items.push({ kind: type, id: s.id, name: s.name, date: ymd(date),
          paymentDate: ymd(paymentDate), daysUntil: remaining });
      }
    };
    if (s.trialEndDate) add("trial", s.trialEndDate, s.trialEndDate);
    if (s.cancelReminderDays !== null) {
      const review = new Date(next);
      review.setDate(review.getDate() - s.cancelReminderDays);
      add("review", review, next, daysUntil(next, now) >= 0);
    }
    return items;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return { days, count: reminders.length, reminders };
}

export async function getSpendBreakdown(userId: string, groupBy: "category" | "paymentMethod" = "category") {
  const { main, rates } = await loadContext(userId);
  const subs = await prisma.subscription.findMany({ where: { userId, active: true } });
  const groups = new Map<string | null, {
    name: string | null; count: number; monthlyTotal: number; yearlyTotal: number; unconvertedCount: number;
  }>();
  for (const s of subs) {
    if (isInTrial(s.trialEndDate)) continue;
    const name = s[groupBy] || null;
    const group = groups.get(name) ?? { name, count: 0, monthlyTotal: 0, yearlyTotal: 0, unconvertedCount: 0 };
    const amount = convert(s.cost, s.currency, main, rates);
    group.count++;
    if (amount === null) group.unconvertedCount++;
    else group.monthlyTotal += monthlyCost(amount, s.cycle as Cycle, s.cycleCount);
    group.yearlyTotal = group.monthlyTotal * 12;
    groups.set(name, group);
  }
  return {
    groupBy, mainCurrency: main,
    groups: [...groups.values()].sort((a, b) => b.monthlyTotal - a.monthlyTotal ||
      (a.name ?? "").localeCompare(b.name ?? "")),
  };
}

export async function listCategories(userId: string): Promise<string[]> {
  const cats = await prisma.category.findMany({
    where: { userId },
    orderBy: { sort: "asc" },
  });
  return cats.map((c) => c.name);
}

export async function listPaymentMethods(userId: string): Promise<string[]> {
  const pms = await prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: { sort: "asc" },
  });
  return pms.map((p) => p.name);
}

// ---- Writes (additive: create / update / toggle / duplicate) --------------

/** Full write shape, matching the columns the UI form and MCP tools set. */
export type SubscriptionWrite = {
  name: string;
  cost: number;
  currency: string | null;
  icon: string | null;
  image: string | null;
  cycle: Cycle;
  cycleCount: number;
  startDate: Date;
  nextBillDate: Date | null;
  trialEndDate: Date | null;
  description: string | null;
  category: string | null;
  paymentMethod: string | null;
  url: string | null;
  cancelReminderDays: number | null;
  color: string;
  active: boolean;
};

export function subscriptionWriteDefaults(): Omit<SubscriptionWrite, "name" | "cost"> {
  return {
    currency: null,
    icon: null,
    image: null,
    cycle: "month",
    cycleCount: 1,
    startDate: new Date(),
    nextBillDate: null,
    trialEndDate: null,
    description: null,
    category: null,
    paymentMethod: null,
    url: null,
    cancelReminderDays: null,
    color: "#ff7a00",
    active: true,
  };
}

export async function createSubscription(
  userId: string,
  data: SubscriptionWrite,
): Promise<SubscriptionView> {
  const { main, rates } = await loadContext(userId);
  const created = await prisma.subscription.create({ data: { ...data, userId } });
  return toView(created, main, rates);
}

/** Partial update; returns the updated view, or null if not found/owned. */
export async function updateSubscription(
  userId: string,
  id: string,
  data: Partial<SubscriptionWrite>,
): Promise<SubscriptionView | null> {
  const res = await prisma.subscription.updateMany({ where: { id, userId }, data });
  if (res.count === 0) return null;
  return getSubscription(userId, id);
}

export async function toggleSubscription(
  userId: string,
  id: string,
  active: boolean,
): Promise<SubscriptionView | null> {
  const res = await prisma.subscription.updateMany({ where: { id, userId }, data: { active } });
  if (res.count === 0) return null;
  return getSubscription(userId, id);
}

export async function duplicateSubscription(
  userId: string,
  id: string,
  suffix = " (copy)",
): Promise<SubscriptionView | null> {
  const s = await prisma.subscription.findFirst({ where: { id, userId } });
  if (!s) return null;
  const { main, rates } = await loadContext(userId);
  const created = await prisma.subscription.create({
    data: {
      userId,
      name: `${s.name}${suffix}`,
      description: s.description,
      cost: s.cost,
      currency: s.currency,
      icon: s.icon,
      image: s.image,
      cycle: s.cycle,
      cycleCount: s.cycleCount,
      startDate: s.startDate,
      nextBillDate: s.nextBillDate,
      trialEndDate: s.trialEndDate,
      category: s.category,
      paymentMethod: s.paymentMethod,
      url: s.url,
      cancelReminderDays: s.cancelReminderDays,
      color: s.color,
      active: s.active,
    },
  });
  return toView(created, main, rates);
}

export async function deleteSubscription(userId: string, id: string): Promise<boolean> {
  const result = await prisma.subscription.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
