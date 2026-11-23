"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import type { Cycle } from "@/lib/money";
import {
  createSubscription as createSub,
  deleteSubscription as deleteSub,
  updateSubscription as updateSub,
  toggleSubscription as toggleSub,
  duplicateSubscription as duplicateSub,
} from "@/lib/services/subscriptions";
import { revalidateAll } from "./shared";

export async function addCategory(formData: FormData) {
  const userId = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const max = await prisma.category.aggregate({
    where: { userId },
    _max: { sort: true },
  });
  await prisma.category.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name, sort: (max._max.sort ?? 0) + 1 },
  });
  revalidateAll();
}

export async function deleteCategory(id: string) {
  const userId = await requireAuth();
  await prisma.category.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function addPaymentMethod(formData: FormData) {
  const userId = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const max = await prisma.paymentMethod.aggregate({
    where: { userId },
    _max: { sort: true },
  });
  await prisma.paymentMethod.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name, sort: (max._max.sort ?? 0) + 1 },
  });
  revalidateAll();
}

export async function deletePaymentMethod(id: string) {
  const userId = await requireAuth();
  await prisma.paymentMethod.deleteMany({ where: { id, userId } });
  revalidateAll();
}

// ---- Subscriptions -------------------------------------------------------

function parseSubscription(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const cost = parseFloat(String(formData.get("cost") ?? "0"));
  const cycle = String(formData.get("cycle") ?? "month") as Cycle;
  const cycleCount = Math.max(
    1,
    parseInt(String(formData.get("cycleCount") ?? "1"), 10) || 1,
  );
  const startDateRaw = String(formData.get("startDate") ?? "");
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const nextBillRaw = String(formData.get("nextBillDate") ?? "").trim();
  const nextBillDate = nextBillRaw ? new Date(nextBillRaw) : null;
  const trialRaw = String(formData.get("trialEndDate") ?? "").trim();
  const trialEndDate = trialRaw ? new Date(trialRaw) : null;

  return {
    name,
    cost: Number.isFinite(cost) ? cost : 0,
    currency: String(formData.get("currency") ?? "").trim() || null,
    icon: String(formData.get("icon") ?? "").trim().toLowerCase() || null,
    image: (() => {
      const v = String(formData.get("image") ?? "").trim();
      return v.startsWith("data:image/") ? v : null;
    })(),
    cycle,
    cycleCount,
    startDate,
    nextBillDate,
    trialEndDate,
    description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim() || null,
    url: String(formData.get("url") ?? "").trim() || null,
    cancelReminderDays: (() => {
      const raw = String(formData.get("cancelReminderDays") ?? "").trim();
      if (!raw) return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })(),
    color: String(formData.get("color") ?? "#ff7a00"),
    active: formData.get("active") === "true",
  };
}

export async function createSubscription(formData: FormData) {
  const userId = await requireAuth();
  const data = parseSubscription(formData);
  if (!data.name) return;
  await createSub(userId, data);
  revalidateAll();
}

export async function updateSubscription(id: string, formData: FormData) {
  const userId = await requireAuth();
  const data = parseSubscription(formData);
  if (!data.name) return;
  await updateSub(userId, id, data);
  revalidateAll();
}

export async function deleteSubscription(id: string) {
  const userId = await requireAuth();
  await deleteSub(userId, id);
  revalidateAll();
}

export async function duplicateSubscription(id: string) {
  const userId = await requireAuth();
  const suffix = getT(await getLang())("subs.copySuffix");
  await duplicateSub(userId, id, suffix);
  revalidateAll();
}

export async function toggleSubscription(id: string, active: boolean) {
  const userId = await requireAuth();
  await toggleSub(userId, id, active);
  revalidateAll();
}
