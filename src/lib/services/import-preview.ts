import "server-only";
import { prisma } from "@/lib/db";
import { parseCSV } from "@/lib/data";
import { createInput } from "./rest-subscription-input";

function readRecords(format: "csv" | "json", content: string): unknown[] | null {
  try {
    if (format === "json") {
      const value = JSON.parse(content);
      if (Array.isArray(value)) return value;
      return Array.isArray(value?.subscriptions) ? value.subscriptions : null;
    }
    const [header, ...rows] = parseCSV(content, true);
    const names = header?.map((field) => field.trim()) ?? [];
    if (!names.includes("name") || !names.includes("cost") || new Set(names).size !== names.length) return null;
    return rows.map((row) => row.length === names.length
      ? Object.fromEntries(names.map((name, i) => [name, row[i]]))
      : null);
  } catch {
    return null;
  }
}

function normalizeRecord(record: unknown, csv: boolean): unknown {
  if (typeof record !== "object" || !record || Array.isArray(record)) return record;
  const row = { ...record } as Record<string, unknown>;
  for (const field of ["currency", "nextBillDate", "trialEndDate", "category", "paymentMethod", "url", "icon"]) {
    if (row[field] === "") row[field] = null;
  }
  for (const field of ["startDate", "cycle", "cycleCount", "color", "active"]) {
    if (row[field] === "") delete row[field];
  }
  if (csv) {
    for (const field of ["cost", "cycleCount", "cancelReminderDays"]) {
      const value = row[field];
      if (typeof value === "string" && value.trim()) row[field] = Number(value);
    }
    if (row.cancelReminderDays === "") row.cancelReminderDays = null;
    if (typeof row.active === "string") {
      const active = row.active.trim().toLowerCase();
      if (["true", "false", "1", "0"].includes(active)) row.active = ["true", "1"].includes(active);
    }
  }
  return row;
}

export async function previewSubscriptionImport(userId: string, format: "csv" | "json", content: string) {
  const records = readRecords(format, content.replace(/^\uFEFF/, ""));
  if (!records) return { error: "invalid_import" } as const;
  if (records.length > 500) return { error: "too_many_rows" } as const;

  const existing = await prisma.subscription.findMany({ where: { userId }, select: { id: true, name: true } });
  const known = new Map<string, string[]>();
  for (const s of existing) {
    const key = s.name.trim().toLowerCase();
    const ids = known.get(key) ?? [];
    ids.push(s.id);
    known.set(key, ids);
  }
  const firstRows = new Map<string, number>();
  const rows = records.map((record, i) => {
    const row = i + 1;
    const parsed = createInput.safeParse(normalizeRecord(record, format === "csv"));
    if (!parsed.success) {
      return { row, status: "invalid" as const,
        issues: parsed.error.issues.map(({ path, code }) => ({ field: path.join("."), code })) };
    }
    const { name } = parsed.data;
    const key = name.toLowerCase();
    const matchingIds = known.get(key) ?? [];
    const matchingRow = firstRows.get(key) ?? null;
    if (matchingRow === null) firstRows.set(key, row);
    if (matchingIds.length || matchingRow !== null) {
      return { row, name, status: "duplicate" as const, matchingIds, matchingRow };
    }
    return { row, name, status: "ready" as const };
  });
  return {
    count: rows.length,
    wouldCreate: rows.filter((row) => row.status === "ready").length,
    duplicateCount: rows.filter((row) => row.status === "duplicate").length,
    invalidCount: rows.filter((row) => row.status === "invalid").length,
    rows,
  };
}
