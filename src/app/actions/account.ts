"use server";

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

  // Return to a same-origin destination when present (e.g. the OAuth consent page).
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
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
  if (pw.length < 8) {
    return { error: getT(await getLang())("set.err.passwordShort") };
  }
  await setUserPassword(userId, pw);
  return { ok: true };
}
