"use server";

import { allowRequest } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { getUser, prisma } from "@/lib/db";
import {
  anyUsers, createSession, createUser, destroySession, registrationAllowed,
  requireAuth, setLangCookie, setUserPassword, verifyLogin,
} from "@/lib/auth";
import { getT, normalizeLang } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { revalidateAll, type ActionState } from "./shared";

export async function register(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const lang = normalizeLang(String(formData.get("lang") ?? ""));
  const t = getT(lang);
  if (!allowRequest("register", 15)) return { error: t("auth.err.rateLimit") };
  if (!(await registrationAllowed())) {
    return { error: t("auth.err.registrationClosed") };
  }
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (username.length < 3) return { error: t("auth.err.usernameShort") };
  if (username.length > 100) return { error: t("auth.err.usernameLong") };
  if (password.length < 8) return { error: t("auth.err.short") };
  if (new TextEncoder().encode(password).length > 72) return { error: t("auth.err.passwordLong") };
  if (password !== confirm) return { error: t("auth.err.mismatch") };

  const result = await createUser(username, password, lang);
  if ("error" in result) return { error: t(result.error === "closed" ? "auth.err.registrationClosed" : "auth.err.taken") };

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
  const t = getT(await getLang());
  if (username.length > 100 || password.length > 4096) return { error: t("auth.err.wrongLogin") };
  if (!allowRequest("login", 120) || !allowRequest(`login:${username.trim().toLowerCase()}`, 12)) {
    return { error: t("auth.err.rateLimit") };
  }
  const userId = await verifyLogin(username, password);
  if (!userId) return { error: t("auth.err.wrongLogin") };

  await createSession(userId);
  const user = await getUser(userId);
  if (user) await setLangCookie(user.lang);

  // Return to a same-origin destination when present (e.g. the OAuth consent page).
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") && !/[\\\u0000-\u001f]/.test(next) ? next : "/");
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

/** Change the account password. Separate from auto-saved settings. */
export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireAuth();
  const pw = String(formData.get("password") ?? "");
  if (!pw) return {};
  if (new TextEncoder().encode(pw).length > 72) {
    return { error: getT(await getLang())("auth.err.passwordLong") };
  }
  if (pw.length < 8) {
    return { error: getT(await getLang())("set.err.passwordShort") };
  }
  await setUserPassword(userId, pw);
  return { ok: true };
}
