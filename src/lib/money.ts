export type Cycle = "day" | "week" | "month" | "year";

export const CYCLES: { value: Cycle; label: string }[] = [
  { value: "day", label: "日ごと" },
  { value: "week", label: "週ごと" },
  { value: "month", label: "月ごと" },
  { value: "year", label: "年ごと" },
];

const DAYS_PER_MONTH = 365.25 / 12;

/** Length of one billing period expressed in months. */
export function periodInMonths(cycle: Cycle, count: number): number {
  const n = Math.max(1, count);
  switch (cycle) {
    case "day":
      return (n) / DAYS_PER_MONTH;
    case "week":
      return (n * 7) / DAYS_PER_MONTH;
    case "month":
      return n;
    case "year":
      return n * 12;
  }
}

export function monthlyCost(cost: number, cycle: Cycle, count: number): number {
  return cost / periodInMonths(cycle, count);
}

export function yearlyCost(cost: number, cycle: Cycle, count: number): number {
  return monthlyCost(cost, cycle, count) * 12;
}

function addPeriod(date: Date, cycle: Cycle, count: number): Date {
  const d = new Date(date);
  const n = Math.max(1, count);
  switch (cycle) {
    case "day":
      d.setDate(d.getDate() + n);
      break;
    case "week":
      d.setDate(d.getDate() + n * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + n);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + n);
      break;
  }
  return d;
}

/** Next billing date on or after `from`, rolling forward from startDate. */
export function nextBillDate(
  startDate: Date,
  cycle: Cycle,
  count: number,
  from: Date = new Date(),
): Date {
  let d = new Date(startDate);
  const ref = new Date(from);
  ref.setHours(0, 0, 0, 0);
  // Guard against pathological loops.
  let guard = 0;
  while (d < ref && guard < 10000) {
    d = addPeriod(d, cycle, count);
    guard++;
  }
  return d;
}

/**
 * Effective upcoming bill date: rolls forward from the explicit override when
 * provided, otherwise from startDate. Always returns a date on/after `from`.
 */
export function effectiveNextBill(
  startDate: Date,
  override: Date | null | undefined,
  cycle: Cycle,
  count: number,
  from: Date = new Date(),
): Date {
  return nextBillDate(override ?? startDate, cycle, count, from);
}

function subPeriod(date: Date, cycle: Cycle, count: number): Date {
  const d = new Date(date);
  const n = Math.max(1, count);
  switch (cycle) {
    case "day":
      d.setDate(d.getDate() - n);
      break;
    case "week":
      d.setDate(d.getDate() - n * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() - n);
      break;
    case "year":
      d.setFullYear(d.getFullYear() - n);
      break;
  }
  return d;
}

/** Fraction (0..1) of the current billing period that has elapsed. */
export function billingProgress(
  anchor: Date,
  cycle: Cycle,
  count: number,
  from: Date = new Date(),
): number {
  const next = nextBillDate(anchor, cycle, count, from);
  const prev = subPeriod(next, cycle, count);
  const total = next.getTime() - prev.getTime();
  if (total <= 0) return 0;
  const elapsed = from.getTime() - prev.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

/** All billing occurrences within [start, end] (inclusive). */
export function occurrencesInRange(
  anchor: Date,
  cycle: Cycle,
  count: number,
  start: Date,
  end: Date,
): Date[] {
  const result: Date[] = [];
  let d = nextBillDate(anchor, cycle, count, start);
  let guard = 0;
  while (d.getTime() <= end.getTime() && guard < 2000) {
    result.push(new Date(d));
    d = addPeriod(d, cycle, count);
    guard++;
  }
  return result;
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const a = new Date(date);
  a.setHours(0, 0, 0, 0);
  const b = new Date(from);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

const currencyFractionDigits: Record<string, number> = {
  JPY: 0,
  KRW: 0,
};

export function formatMoney(amount: number, currency: string): string {
  const digits = currencyFractionDigits[currency] ?? 2;
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}

export const CURRENCIES = [
  "JPY",
  "USD",
  "EUR",
  "GBP",
  "KRW",
  "CNY",
  "AUD",
  "CAD",
];

// ---- Currency conversion (pure, client-safe) ----------------------------

export type Rates = Record<string, number>; // code -> units of `code` per 1 main currency

export function parseRates(json: string | null | undefined): Rates {
  if (!json) return {};
  try {
    return JSON.parse(json) as Rates;
  } catch {
    return {};
  }
}

/**
 * Convert `amount` from `from` currency into `main`.
 * rates[code] = how many `code` per 1 main unit → main = amount / rates[from].
 * Returns null when the rate is unknown.
 */
export function convert(
  amount: number,
  from: string | null | undefined,
  main: string,
  rates: Rates,
): number | null {
  const code = from || main;
  if (code === main) return amount;
  const r = rates[code];
  if (!r || !Number.isFinite(r) || r <= 0) return null;
  return amount / r;
}

export function cycleLabel(cycle: Cycle, count: number): string {
  const base = CYCLES.find((c) => c.value === cycle)?.label ?? cycle;
  if (count <= 1) return base;
  const unit = { day: "日", week: "週", month: "ヶ月", year: "年" }[cycle];
  return `${count}${unit}ごと`;
}
