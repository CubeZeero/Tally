import "server-only";
import { prisma } from "./db";

export { type Rates, parseRates, convert } from "./money";

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Fetch fresh rates for a user's base currency from open.er-api.com (no key).
 */
export async function refreshRates(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  const base = user.currency;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== "success" || !data.rates) return false;
    await prisma.user.update({
      where: { id: userId },
      data: {
        ratesJson: JSON.stringify(data.rates),
        ratesUpdatedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Refresh a user's rates only if missing or older than 6h. */
export async function ensureRates(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const stale =
    !user.ratesUpdatedAt ||
    Date.now() - user.ratesUpdatedAt.getTime() > SIX_HOURS;
  if (stale) await refreshRates(userId);
}
