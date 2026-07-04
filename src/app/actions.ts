"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, prisma } from "@/lib/db";
import {
  anyUsers,
  createSession,
  createUser,
  destroySession,
  getSession,
  registrationAllowed,
  requireAuth,
  setLangCookie,
  setUserPassword,
  verifyLogin,
} from "@/lib/auth";
import { normalizeLang } from "@/lib/i18n";
import type { Cycle } from "@/lib/money";
import { refreshRates } from "@/lib/rates";
import { notifyUpcoming } from "@/lib/notify";
import { isDiscordWebhook } from "@/lib/discord";
import { parseImport } from "@/lib/data";
import { getT } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";

export type ActionState =
  | { error?: string; ok?: boolean; count?: number }
  | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/subscriptions");
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/stats");
}

// ---- Auth ----------------------------------------------------------------

export async function register(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const lang = normalizeLang(String(formData.get("lang") ?? ""));
  const t = getT(lang);
  if (!(await registrationAllowed())) {
    return { error: t("auth.err.registrationClosed") };
  }
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (username.length < 3) return { error: t("auth.err.usernameShort") };
  if (password.length < 8) return { error: t("auth.err.short") };
  if (password !== confirm) return { error: t("auth.err.mismatch") };

  const result = await createUser(username, password, lang);
  if ("error" in result) return { error: t("auth.err.taken") };

  await createSession(result.id);
  await setLangCookie(lang);
  redirect("/");
}

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await anyUsers())) redirect("/register");

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const userId = await verifyLogin(username, password);
  if (!userId) return { error: getT(await getLang())("auth.err.wrongLogin") };

  await createSession(userId);
  const user = await getUser(userId);
  if (user) await setLangCookie(user.lang);
  redirect("/");
}

export async function updateLanguage(lang: string): Promise<void> {
  const userId = await requireAuth();
  const normalized = normalizeLang(lang);
  await prisma.user.update({ where: { id: userId }, data: { lang: normalized } });
  await setLangCookie(normalized);
  revalidateAll();
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---- Settings ------------------------------------------------------------

export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireAuth();
  const currency = String(formData.get("currency") ?? "JPY");
  const discordWebhookUrl =
    String(formData.get("discordWebhookUrl") ?? "").trim() || null;

  if (discordWebhookUrl && !isDiscordWebhook(discordWebhookUrl)) {
    return { error: getT(await getLang())("set.err.badWebhook") };
  }
  const notifyEmail = String(formData.get("notifyEmail") ?? "").trim() || null;
  const notifyEmailEnabled = formData.get("notifyEmailEnabled") === "true";
  const notifyDaysBefore = Math.max(
    0,
    parseInt(String(formData.get("notifyDaysBefore") ?? "3"), 10) || 0,
  );
  const notifyEnabled = formData.get("notifyEnabled") === "true";
  const notifyHour = Math.min(
    23,
    Math.max(0, parseInt(String(formData.get("notifyHour") ?? "9"), 10) || 0),
  );

  if (notifyEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(notifyEmail)) {
    return { error: getT(await getLang())("set.err.badEmail") };
  }

  const before = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.user.update({
    where: { id: userId },
    data: {
      currency,
      discordWebhookUrl,
      notifyEmail,
      notifyEmailEnabled,
      notifyDaysBefore,
      notifyEnabled,
      notifyHour,
    },
  });

  const newPassword = String(formData.get("password") ?? "");
  if (newPassword) {
    if (newPassword.length < 8) {
      return { error: getT(await getLang())("set.err.passwordShort") };
    }
    await setUserPassword(userId, newPassword);
  }

  if (before && before.currency !== currency) {
    await refreshRates(userId);
  }

  revalidateAll();
  return { ok: true };
}

export async function refreshRatesAction(): Promise<ActionState> {
  const userId = await requireAuth();
  const ok = await refreshRates(userId);
  revalidateAll();
  return ok ? { ok: true } : { error: getT(await getLang())("set.ratesFailed") };
}

export async function testDiscord(): Promise<ActionState> {
  const userId = await requireAuth();
  const result = await notifyUpcoming(userId);
  return result.ok ? { ok: true } : { error: `${result.error ?? result.status}` };
}

// ---- Categories & payment methods ---------------------------------------

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
    color: String(formData.get("color") ?? "#ff7a00"),
    active: formData.get("active") === "true",
  };
}

export async function createSubscription(formData: FormData) {
  const userId = await requireAuth();
  const data = parseSubscription(formData);
  if (!data.name) return;
  await prisma.subscription.create({ data: { ...data, userId } });
  revalidateAll();
}

export async function updateSubscription(id: string, formData: FormData) {
  const userId = await requireAuth();
  const data = parseSubscription(formData);
  if (!data.name) return;
  await prisma.subscription.updateMany({ where: { id, userId }, data });
  revalidateAll();
}

export async function deleteSubscription(id: string) {
  const userId = await requireAuth();
  await prisma.subscription.deleteMany({ where: { id, userId } });
  revalidateAll();
}

export async function toggleSubscription(id: string, active: boolean) {
  const userId = await requireAuth();
  await prisma.subscription.updateMany({ where: { id, userId }, data: { active } });
  revalidateAll();
}

// ---- Import --------------------------------------------------------------

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
  if (replace) await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.subscription.createMany({
    data: rows.map((r) => ({ ...r, userId })),
  });

  revalidateAll();
  return { ok: true, count: rows.length };
}
