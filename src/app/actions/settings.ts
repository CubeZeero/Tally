"use server";

import { revalidatePath } from "next/cache";
import { prisma, randomToken } from "@/lib/db";
import { requireAuth, setUserPassword } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { refreshRates } from "@/lib/rates";
import { notifyUpcoming } from "@/lib/notify";
import { isHttpUrl, isSlackWebhook } from "@/lib/channels";
import { revalidateAll, type ActionState } from "./shared";

export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireAuth();
  const currency = String(formData.get("currency") ?? "JPY");
  const discordWebhookUrl =
    String(formData.get("discordWebhookUrl") ?? "").trim() || null;

  // Only require a well-formed http(s) URL (the strict Discord-host check is
  // intentionally relaxed so proxies / compatible endpoints work too).
  if (discordWebhookUrl && !isHttpUrl(discordWebhookUrl)) {
    return { error: getT(await getLang())("set.err.badUrl") };
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

  // Additional notification channels.
  const webhookUrl = String(formData.get("webhookUrl") ?? "").trim() || null;
  const webhookEnabled = formData.get("webhookEnabled") === "true";
  if (webhookUrl && !isHttpUrl(webhookUrl)) {
    return { error: getT(await getLang())("set.err.badUrl") };
  }
  const slackWebhookUrl =
    String(formData.get("slackWebhookUrl") ?? "").trim() || null;
  const slackEnabled = formData.get("slackEnabled") === "true";
  if (slackWebhookUrl && !isSlackWebhook(slackWebhookUrl)) {
    return { error: getT(await getLang())("set.err.badSlack") };
  }
  const ntfyUrl = String(formData.get("ntfyUrl") ?? "").trim() || null;
  const ntfyEnabled = formData.get("ntfyEnabled") === "true";
  if (ntfyUrl && !isHttpUrl(ntfyUrl)) {
    return { error: getT(await getLang())("set.err.badUrl") };
  }
  const ntfyTokenInput = String(formData.get("ntfyToken") ?? "");

  const budgetRaw = String(formData.get("monthlyBudget") ?? "").trim();
  const monthlyBudget = budgetRaw
    ? Math.max(0, parseFloat(budgetRaw) || 0)
    : null;

  // Per-user SMTP. The password is only updated when a new value is provided,
  // so the stored one is never echoed back to the browser.
  const smtpHost = String(formData.get("smtpHost") ?? "").trim() || null;
  const smtpPort = Math.min(
    65535,
    Math.max(1, parseInt(String(formData.get("smtpPort") ?? "587"), 10) || 587),
  );
  const smtpUser = String(formData.get("smtpUser") ?? "").trim() || null;
  const smtpFrom = String(formData.get("smtpFrom") ?? "").trim() || null;
  const smtpPassInput = String(formData.get("smtpPass") ?? "");

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
      webhookUrl,
      webhookEnabled,
      slackWebhookUrl,
      slackEnabled,
      ntfyUrl,
      ntfyEnabled,
      monthlyBudget,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpFrom,
      // keep existing secrets if the field was left blank
      ...(smtpPassInput ? { smtpPass: smtpPassInput } : {}),
      ...(ntfyTokenInput ? { ntfyToken: ntfyTokenInput } : {}),
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

// ---- iCal feed -----------------------------------------------------------

export async function generateIcalToken(): Promise<ActionState> {
  const userId = await requireAuth();
  await prisma.user.update({
    where: { id: userId },
    data: { icalToken: randomToken() },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function disableIcal(): Promise<ActionState> {
  const userId = await requireAuth();
  await prisma.user.update({
    where: { id: userId },
    data: { icalToken: null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// ---- API key (MCP / read API) -------------------------------------------

export async function generateApiKey(): Promise<ActionState> {
  const userId = await requireAuth();
  await prisma.user.update({
    where: { id: userId },
    data: { apiKey: randomToken() },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function revokeApiKey(): Promise<ActionState> {
  const userId = await requireAuth();
  await prisma.user.update({
    where: { id: userId },
    data: { apiKey: null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function setRestWriteApiKey(enabled: boolean): Promise<ActionState> {
  const userId = await requireAuth();
  await prisma.user.update({
    where: { id: userId },
    data: { restWriteApiKey: enabled === true ? randomToken() : null },
  });
  revalidatePath("/settings");
  return { ok: true };
}
