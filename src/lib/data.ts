import "server-only";
import type { Cycle } from "./money";

// Columns used for both CSV and JSON import/export (no id/timestamps).
export const FIELDS = [
  "name",
  "description",
  "cost",
  "currency",
  "icon",
  "cycle",
  "cycleCount",
  "startDate",
  "nextBillDate",
  "category",
  "paymentMethod",
  "url",
  "color",
  "active",
] as const;

type SubLike = {
  name: string;
  description: string | null;
  cost: number;
  currency: string | null;
  icon: string | null;
  cycle: string;
  cycleCount: number;
  startDate: Date;
  nextBillDate: Date | null;
  category: string | null;
  paymentMethod: string | null;
  url: string | null;
  color: string;
  active: boolean;
};

export function ymd(d: Date | null): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Plain serialisable objects (dates → YYYY-MM-DD). */
export function toPlain(subs: SubLike[]) {
  return subs.map((s) => ({
    name: s.name,
    description: s.description ?? "",
    cost: s.cost,
    currency: s.currency ?? "",
    icon: s.icon ?? "",
    cycle: s.cycle,
    cycleCount: s.cycleCount,
    startDate: ymd(s.startDate),
    nextBillDate: ymd(s.nextBillDate),
    category: s.category ?? "",
    paymentMethod: s.paymentMethod ?? "",
    url: s.url ?? "",
    color: s.color,
    active: s.active,
  }));
}

export function toJSON(subs: SubLike[]): string {
  return JSON.stringify(toPlain(subs), null, 2);
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(subs: SubLike[]): string {
  const rows = toPlain(subs);
  const lines = [FIELDS.join(",")];
  for (const r of rows) {
    lines.push(FIELDS.map((f) => csvEscape((r as Record<string, unknown>)[f])).join(","));
  }
  return lines.join("\r\n");
}

/** Parse CSV text into an array of cell arrays (handles quotes/commas/newlines). */
export function parseCSV(text: string, strict = false): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let closedQuote = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += c;
      }
    } else if (strict && closedQuote && c !== "," && c !== "\n") {
      throw new Error("Unexpected content after CSV quote");
    } else if (c === '"') {
      if (strict && field) throw new Error("Unexpected CSV quote");
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
    } else {
      field += c;
    }
  }
  if (strict && inQuotes) throw new Error("Unterminated CSV field");
  if (field.length > 0 || row.length > 0 || (strict && closedQuote)) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const VALID_CYCLES = ["day", "week", "month", "year"];

/** Normalise an arbitrary record into a Prisma Subscription create input. */
function normalize(obj: Record<string, unknown>) {
  const name = String(obj.name ?? "").trim();
  const cost = parseFloat(String(obj.cost ?? ""));
  if (!name || !Number.isFinite(cost)) return null;

  const str = (v: unknown) => {
    const t = String(v ?? "").trim();
    return t === "" ? null : t;
  };
  const cycleRaw = String(obj.cycle ?? "month").trim();
  const cycle = (VALID_CYCLES.includes(cycleRaw) ? cycleRaw : "month") as Cycle;
  const cycleCount = Math.max(
    1,
    parseInt(String(obj.cycleCount ?? "1"), 10) || 1,
  );
  const startDateRaw = String(obj.startDate ?? "").trim();
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const nextRaw = String(obj.nextBillDate ?? "").trim();
  const nextBillDate = nextRaw ? new Date(nextRaw) : null;
  const activeRaw = String(obj.active ?? "true").trim().toLowerCase();
  const active = !["false", "0", "no", ""].includes(activeRaw);

  return {
    name,
    description: str(obj.description),
    cost,
    currency: str(obj.currency),
    icon: str(obj.icon)?.toLowerCase() ?? null,
    cycle,
    cycleCount,
    startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
    nextBillDate:
      nextBillDate && !isNaN(nextBillDate.getTime()) ? nextBillDate : null,
    category: str(obj.category),
    paymentMethod: str(obj.paymentMethod),
    url: str(obj.url),
    color: str(obj.color) ?? "#ff7a00",
    active,
  };
}

export type ImportRow = NonNullable<ReturnType<typeof normalize>>;

/** Parse JSON or CSV text into validated create inputs. */
export function parseImport(text: string, format: "json" | "csv"): ImportRow[] {
  let records: Record<string, unknown>[] = [];

  if (format === "json") {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.subscriptions) ? data.subscriptions : [];
    records = arr as Record<string, unknown>[];
  } else {
    const rows = parseCSV(text);
    if (rows.length < 2) return [];
    const header = rows[0].map((h) => h.trim());
    records = rows.slice(1).map((cells) => {
      const obj: Record<string, unknown> = {};
      header.forEach((h, i) => (obj[h] = cells[i]));
      return obj;
    });
  }

  return records.map(normalize).filter((r): r is ImportRow => r !== null);
}
