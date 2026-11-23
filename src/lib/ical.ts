import "server-only";
import {
  type Cycle,
  nextSubscriptionBill,
  formatMoney,
  isInTrial,
} from "./money";

type IcalSub = {
  id: string;
  name: string;
  cost: number;
  currency: string | null;
  cycle: string;
  cycleCount: number;
  startDate: Date;
  nextBillDate: Date | null;
  trialEndDate: Date | null;
  active: boolean;
};

const FREQ: Record<Cycle, string> = {
  day: "DAILY",
  week: "WEEKLY",
  month: "MONTHLY",
  year: "YEARLY",
};

/** Escape a value for an iCalendar TEXT field (RFC 5545 §3.3.11). */
function esc(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** All-day DATE value (local calendar date, no time). */
function dateValue(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Fold long lines to 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

/**
 * Build a subscribable iCalendar feed: one recurring all-day event per active
 * subscription, anchored at its next billing date, with an optional reminder
 * alarm `alarmDays` before each occurrence.
 */
export function buildIcs(
  subs: IcalSub[],
  opts: { mainCurrency: string; alarmDays: number; calName: string },
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tally//Subscriptions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.calName)}`,
  ];

  for (const s of subs) {
    if (!s.active) continue;
    const next = nextSubscriptionBill(s);
    const price = formatMoney(s.cost, s.currency || opts.mainCurrency);
    const trial = isInTrial(s.trialEndDate);
    const summary = `${s.name} — ${price}${trial ? " (trial)" : ""}`;
    const interval = Math.max(1, s.cycleCount);
    const rrule = `FREQ=${FREQ[s.cycle as Cycle] ?? "MONTHLY"}${
      interval > 1 ? `;INTERVAL=${interval}` : ""
    }`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@tally`,
      `DTSTAMP:${dateValue(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${dateValue(next)}`,
      `RRULE:${rrule}`,
      `SUMMARY:${esc(summary)}`,
      "TRANSP:TRANSPARENT",
    );
    if (opts.alarmDays > 0) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `TRIGGER:-P${opts.alarmDays}D`,
        `DESCRIPTION:${esc(summary)}`,
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
