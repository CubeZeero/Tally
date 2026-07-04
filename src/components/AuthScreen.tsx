"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { useLang } from "./LangProvider";
import { LANGUAGES, LANGUAGE_LABELS, type Lang } from "@/lib/i18n";
import type { ActionState } from "@/app/actions";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

export function AuthScreen({
  mode,
  action,
}: {
  mode: "register" | "login";
  action: Action;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  const isRegister = mode === "register";

  function changeLang(next: Lang) {
    document.cookie = `tally_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  const titleLines = t(
    isRegister ? "auth.registerTitle" : "auth.loginTitle",
  ).split("\n");

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center">
      <div className="blob auth-blob" aria-hidden />

      <div className="relative w-full max-w-md px-8 md:pl-24">
        <Logo />

        <p className="label label-soft mt-12">
          {t(isRegister ? "auth.welcome" : "auth.welcomeBack")}
        </p>
        <h1 className="headline text-5xl md:text-6xl mt-3">
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        <p className="text-sm text-[color:var(--color-ink-soft)] mt-5 max-w-sm leading-relaxed">
          {t(isRegister ? "auth.registerDesc" : "auth.loginDesc")}
        </p>

        <form action={formAction} className="mt-10 space-y-6">
          <div>
            <label className="label label-soft">{t("auth.username")}</label>
            <input
              className="field"
              type="text"
              name="username"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              placeholder="tally"
              required
            />
          </div>

          <div>
            <label className="label label-soft">{t("auth.password")}</label>
            <input
              className="field"
              type="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="••••••••"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="label label-soft">
                {t("auth.passwordConfirm")}
              </label>
              <input
                className="field"
                type="password"
                name="confirm"
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {isRegister && (
            <div>
              <label className="label label-soft">{t("auth.language")}</label>
              <select
                className="field"
                name="lang"
                value={lang}
                onChange={(e) => changeLang(e.target.value as Lang)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-[color:var(--color-accent)]">
              {state.error}
            </p>
          )}

          <button className="btn w-full" type="submit" disabled={pending}>
            {pending
              ? t("auth.processing")
              : t(isRegister ? "auth.registerButton" : "auth.loginButton")}
          </button>
        </form>

        <p className="text-sm text-[color:var(--color-ink-soft)] mt-6">
          {t(isRegister ? "auth.haveAccount" : "auth.noAccount")}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="text-[color:var(--color-accent)] hover:underline"
          >
            {t(isRegister ? "auth.toLogin" : "auth.toRegister")}
          </Link>
        </p>
      </div>
    </div>
  );
}
