"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAuth, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseImport } from "@/lib/data";
import { runBackup } from "@/lib/backup";
import { getT } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { getUpdateInfo, UPDATE_TAG, type UpdateInfo } from "@/lib/update";
import { revalidateAll, type ActionState } from "./shared";

/** Manual "check for updates" — bypasses the 6h cache and refreshes it. */
export async function checkForUpdates(): Promise<UpdateInfo> {
  await requireAuth();
  const info = await getUpdateInfo(true); // force a fresh fetch
  revalidateTag(UPDATE_TAG); // refresh the cached value the banner uses too
  return info;
}

export async function backupNowAction(): Promise<ActionState> {
  await requireAuth();
  const res = await runBackup();
  revalidatePath("/settings");
  return res.ok ? { ok: true } : { error: res.error ?? "backup failed" };
}

export async function importData(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const t = getT(await getLang());
  const userId = await getSession();
  if (!userId) return { error: t("data.err.auth") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t("data.err.noFile") };
  }

  const text = await file.text();
  const lower = file.name.toLowerCase();
  let format: "json" | "csv";
  if (lower.endsWith(".csv")) format = "csv";
  else if (lower.endsWith(".json")) format = "json";
  else format = text.trim().startsWith("[") || text.trim().startsWith("{") ? "json" : "csv";

  let rows;
  try {
    rows = parseImport(text, format);
  } catch (e) {
    return { error: `${t("data.err.parse")}: ${String(e)}` };
  }
  if (rows.length === 0) return { error: t("data.err.empty") };

  const replace = formData.get("replace") === "true";
  await prisma.$transaction(async (tx) => {
    if (replace) await tx.subscription.deleteMany({ where: { userId } });
    await tx.subscription.createMany({
      data: rows.map((row) => ({ ...row, userId })),
    });
  });

  revalidateAll();
  return { ok: true, count: rows.length };
}
