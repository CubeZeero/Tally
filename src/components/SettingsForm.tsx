"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import {
  updateSettings,
  refreshRatesAction,
  testDiscord,
  type ActionState,
} from "@/app/actions";
import { CURRENCIES } from "@/lib/money";
import { useLang } from "./LangProvider";
import { LangSwitcher } from "./LangSwitcher";

export function SettingsForm({
  username,
  currency,
  discordWebhookUrl,
  notifyDaysBefore,
  notifyEnabled,
  notifyHour,
  ratesUpdatedAt,
}: {
  username: string;
  currency: string;
  discordWebhookUrl: string;
  notifyDaysBefore: number;
  notifyEnabled: boolean;
  notifyHour: number;
  ratesUpdatedAt: string | null;
}) {
  const { t, lang } = useLang();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSettings,
    undefined,
  );
  const saved = state?.ok;

  return (
    <div className="max-w-xl space-y-12">
      <form action={action} className="space-y-7">
        <h2 className="label">{t("set.basic")}</h2>

        <label className="block">
          <span className="label label-soft block mb-1">{t("set.language")}</span>
          <LangSwitcher />
        </label>

        <label className="block">
          <span className="label label-soft block mb-1">
            {t("set.mainCurrency")}
          </span>
          <select className="field" name="currency" defaultValue={currency}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="label label-soft block mt-1">
            {t("set.mainCurrencyHint")}
          </span>
        </label>

        <h2 className="label pt-2">{t("set.notify")}</h2>

        <label className="block">
          <span className="label label-soft block mb-1">{t("set.webhook")}</span>
          <input
            className="field"
            name="discordWebhookUrl"
            type="url"
            defaultValue={discordWebhookUrl}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="notifyEnabled"
            value="true"
            defaultChecked={notifyEnabled}
          />
          {t("set.notifyEnabled")}
        </label>

        <div className="grid grid-cols-2 gap-5">
          <label className="block">
            <span className="label label-soft block mb-1">{t("set.sendTime")}</span>
            <select className="field" name="notifyHour" defaultValue={notifyHour}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label label-soft block mb-1">
              {t("set.daysBefore")}
            </span>
            <input
              className="field"
              name="notifyDaysBefore"
              type="number"
              min="0"
              defaultValue={notifyDaysBefore}
            />
          </label>
        </div>
        <span className="label label-soft block -mt-3">{t("set.tzHint")}</span>

        <div className="pt-2">
          <ActionButton
            run={testDiscord}
            label={t("set.testSend")}
            okMessage={t("set.testSent")}
          />
        </div>

        <h2 className="label pt-2">{t("set.security")}</h2>

        <div>
          <span className="label label-soft block mb-1">{t("set.account")}</span>
          <p className="text-sm">{username}</p>
        </div>

        <label className="block">
          <span className="label label-soft block mb-1">
            {t("set.changePassword")}
          </span>
          <input
            className="field"
            type="password"
            name="password"
            placeholder={t("set.newPasswordPh")}
            autoComplete="new-password"
          />
        </label>

        {state?.error && (
          <p className="text-sm text-[color:var(--color-accent)]">
            {state.error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {t("common.saved")}
          </p>
        )}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("set.saveButton")}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="label">{t("set.rates")}</h2>
        <p className="label label-soft">
          {t("set.ratesUpdated")}{" "}
          {ratesUpdatedAt
            ? new Date(ratesUpdatedAt).toLocaleString(
                lang === "en" ? "en-US" : "ja-JP",
              )
            : t("set.ratesNever")}
        </p>
        <ActionButton
          run={refreshRatesAction}
          label={t("set.refreshRates")}
          okMessage={t("set.refreshed")}
        />
      </section>
    </div>
  );
}

function ActionButton({
  run,
  label,
  okMessage,
}: {
  run: () => Promise<ActionState>;
  label: string;
  okMessage: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await run();
            if (res?.error) setMsg({ ok: false, text: res.error });
            else setMsg({ ok: true, text: okMessage });
          })
        }
      >
        {pending ? "…" : label}
      </button>
      {msg && (
        <span
          className={`text-sm ${msg.ok ? "text-[color:var(--color-ink-soft)]" : "text-[color:var(--color-accent)]"}`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}
