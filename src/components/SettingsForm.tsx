"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRinging,
  CalendarBlank,
  CaretDown,
  Database,
  DiscordLogo,
  EnvelopeSimple,
  SlackLogo,
  WebhooksLogo,
} from "@phosphor-icons/react/dist/ssr";
import {
  updateSettings,
  refreshRatesAction,
  testDiscord,
  generateIcalToken,
  disableIcal,
  backupNowAction,
  type ActionState,
} from "@/app/actions";
import { CURRENCIES } from "@/lib/money";
import { useLang } from "./LangProvider";
import { LangSwitcher } from "./LangSwitcher";
import { CookieSwitch } from "./CookieSwitch";
import { Switch } from "./Switch";

export function SettingsForm({
  username,
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
  hasNtfyToken,
  monthlyBudget,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpFrom,
  hasSmtpPass,
  ratesUpdatedAt,
  icalUrl,
  backups,
  animEnabled,
  fadeEnabled,
}: {
  username: string;
  currency: string;
  discordWebhookUrl: string;
  notifyEmail: string;
  notifyEmailEnabled: boolean;
  notifyDaysBefore: number;
  notifyEnabled: boolean;
  notifyHour: number;
  webhookUrl: string;
  webhookEnabled: boolean;
  slackWebhookUrl: string;
  slackEnabled: boolean;
  ntfyUrl: string;
  ntfyEnabled: boolean;
  hasNtfyToken: boolean;
  monthlyBudget: number | null;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpFrom: string;
  hasSmtpPass: boolean;
  ratesUpdatedAt: string | null;
  icalUrl: string | null;
  backups: {
    enabled: boolean;
    keep: number;
    intervalHours: number;
    count: number;
    latest: string | null;
  };
  animEnabled: boolean;
  fadeEnabled: boolean;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateSettings,
    undefined,
  );
  const saved = state?.ok;

  // Unsaved-changes guard: warn before navigating away with pending edits.
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSaving, setLeaveSaving] = useState(false);

  // A successful save clears the dirty flag.
  useEffect(() => {
    if (state?.ok) setDirty(false);
  }, [state]);

  // Native prompt for tab close / reload / external navigation.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Intercept in-app link clicks (nav rail, top nav, mobile menu) while dirty.
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("/settings")) return;
      if (a.target && a.target !== "_self") return;
      e.preventDefault();
      // stopImmediatePropagation is required: Next's <Link> navigates from its
      // own React click handler (delegated on document), which plain
      // stopPropagation does not reliably prevent.
      e.stopImmediatePropagation();
      e.stopPropagation();
      setLeaveError(null);
      setLeaveTo(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  async function saveAndLeave() {
    if (!formRef.current || !leaveTo) return;
    setLeaveSaving(true);
    setLeaveError(null);
    const res = await updateSettings(undefined, new FormData(formRef.current));
    setLeaveSaving(false);
    if (res?.error) {
      setLeaveError(res.error);
      return;
    }
    const to = leaveTo;
    setDirty(false);
    setLeaveTo(null);
    router.push(to);
  }

  function leaveWithoutSaving() {
    const to = leaveTo;
    // Discard the edits: reset the fields to their saved values so the stale
    // DOM state can't persist (and look "saved") via the router cache.
    formRef.current?.reset();
    setDirty(false);
    setLeaveTo(null);
    if (to) router.push(to);
  }

  // A slightly inset panel used for the Discord / email channel groups.
  const channel =
    "rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper)] p-4 space-y-4";

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={action}
        onChange={() => setDirty(true)}
        className="space-y-6"
      >
        {/* General */}
        <section className="card p-6 space-y-5">
          <h2 className="label">{t("set.basic")}</h2>

          <label className="block">
            <span className="label label-soft block mb-1">
              {t("set.language")}
            </span>
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

          <label className="block">
            <span className="label label-soft block mb-1">
              {t("set.monthlyBudget")}
            </span>
            <input
              className="field"
              name="monthlyBudget"
              type="number"
              min="0"
              step="1"
              defaultValue={monthlyBudget ?? ""}
              placeholder={t("set.monthlyBudgetPh")}
            />
            <span className="label label-soft block mt-1">
              {t("set.monthlyBudgetHint")}
            </span>
          </label>

          <CookieSwitch
            label={t("set.animations")}
            cookieName="tally_anim"
            attr="anim"
            initialOn={animEnabled}
          />
          <CookieSwitch
            label={t("set.pageFade")}
            cookieName="tally_fade"
            attr="fade"
            initialOn={fadeEnabled}
          />
        </section>

        {/* Notifications — collapsible card */}
        <section className="card p-6">
          <button
            type="button"
            onClick={() => setNotifyOpen((o) => !o)}
            aria-expanded={notifyOpen}
            className="label flex items-center justify-between gap-2 w-full text-left hover:text-ink"
          >
            {t("set.notify")}
            <CaretDown
              size={14}
              className="transition-transform duration-200"
              style={{ transform: notifyOpen ? "rotate(180deg)" : "none" }}
            />
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: notifyOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="space-y-5 pt-5">
                {/* Shared schedule */}
                <div className="grid grid-cols-2 gap-5">
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.sendTime")}
                    </span>
                    <select
                      className="field"
                      name="notifyHour"
                      defaultValue={notifyHour}
                    >
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
                <span className="label label-soft block -mt-2">
                  {t("set.tzHint")}
                </span>

                {/* Discord channel */}
                <div className={channel}>
                  <div className="label flex items-center gap-2">
                    <DiscordLogo size={16} /> {t("set.discordNotify")}
                  </div>
                  <Switch
                    name="notifyEnabled"
                    label={t("set.notifyEnabled")}
                    defaultChecked={notifyEnabled}
                  />
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.webhook")}
                    </span>
                    <input
                      className="field"
                      name="discordWebhookUrl"
                      type="url"
                      defaultValue={discordWebhookUrl}
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  </label>
                </div>

                {/* Email channel */}
                <div className={channel}>
                  <div className="label flex items-center gap-2">
                    <EnvelopeSimple size={16} /> {t("set.emailNotify")}
                  </div>
                  <Switch
                    name="notifyEmailEnabled"
                    label={t("set.emailEnabled")}
                    defaultChecked={notifyEmailEnabled}
                  />
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.email")}
                    </span>
                    <input
                      className="field"
                      name="notifyEmail"
                      type="email"
                      defaultValue={notifyEmail}
                      placeholder="you@example.com"
                    />
                  </label>

                  <div className="pt-3 border-t border-[color:var(--color-line)] space-y-4">
                    <div>
                      <span className="label block">{t("set.smtp")}</span>
                      <span className="label label-soft block mt-1">
                        {t("set.smtpNote")}
                      </span>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr] gap-4">
                      <label className="block">
                        <span className="label label-soft block mb-1">
                          {t("set.smtpHost")}
                        </span>
                        <input
                          className="field"
                          name="smtpHost"
                          defaultValue={smtpHost}
                          placeholder="smtp.example.com"
                        />
                      </label>
                      <label className="block">
                        <span className="label label-soft block mb-1">
                          {t("set.smtpPort")}
                        </span>
                        <input
                          className="field"
                          name="smtpPort"
                          type="number"
                          min="1"
                          defaultValue={smtpPort}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="label label-soft block mb-1">
                        {t("set.smtpUser")}
                      </span>
                      <input
                        className="field"
                        name="smtpUser"
                        defaultValue={smtpUser}
                        autoComplete="off"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="block">
                      <span className="label label-soft block mb-1">
                        {t("set.smtpPass")}
                      </span>
                      <input
                        className="field"
                        name="smtpPass"
                        type="password"
                        autoComplete="new-password"
                        placeholder={hasSmtpPass ? t("set.smtpPassSet") : ""}
                      />
                    </label>
                    <label className="block">
                      <span className="label label-soft block mb-1">
                        {t("set.smtpFrom")}
                      </span>
                      <input
                        className="field"
                        name="smtpFrom"
                        defaultValue={smtpFrom}
                        placeholder="Tally <you@example.com>"
                      />
                    </label>
                  </div>
                </div>

                {/* Generic webhook channel */}
                <div className={channel}>
                  <div className="label flex items-center gap-2">
                    <WebhooksLogo size={16} /> {t("set.webhookNotify")}
                  </div>
                  <Switch
                    name="webhookEnabled"
                    label={t("set.webhookEnabled")}
                    defaultChecked={webhookEnabled}
                  />
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.webhookUrl")}
                    </span>
                    <input
                      className="field"
                      name="webhookUrl"
                      type="url"
                      defaultValue={webhookUrl}
                      placeholder="https://example.com/hook"
                    />
                  </label>
                  <span className="label label-soft block">
                    {t("set.webhookNote")}
                  </span>
                </div>

                {/* Slack channel */}
                <div className={channel}>
                  <div className="label flex items-center gap-2">
                    <SlackLogo size={16} /> {t("set.slackNotify")}
                  </div>
                  <Switch
                    name="slackEnabled"
                    label={t("set.slackEnabled")}
                    defaultChecked={slackEnabled}
                  />
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.slackWebhook")}
                    </span>
                    <input
                      className="field"
                      name="slackWebhookUrl"
                      type="url"
                      defaultValue={slackWebhookUrl}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </label>
                </div>

                {/* ntfy channel */}
                <div className={channel}>
                  <div className="label flex items-center gap-2">
                    <BellRinging size={16} /> {t("set.ntfyNotify")}
                  </div>
                  <Switch
                    name="ntfyEnabled"
                    label={t("set.ntfyEnabled")}
                    defaultChecked={ntfyEnabled}
                  />
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.ntfyUrl")}
                    </span>
                    <input
                      className="field"
                      name="ntfyUrl"
                      type="url"
                      defaultValue={ntfyUrl}
                      placeholder="https://ntfy.sh/your-topic"
                    />
                  </label>
                  <label className="block">
                    <span className="label label-soft block mb-1">
                      {t("set.ntfyToken")}
                    </span>
                    <input
                      className="field"
                      name="ntfyToken"
                      type="password"
                      autoComplete="new-password"
                      placeholder={hasNtfyToken ? t("set.ntfyTokenSet") : ""}
                    />
                  </label>
                  <span className="label label-soft block">
                    {t("set.ntfyNote")}
                  </span>
                </div>

                {/* Test all configured channels */}
                <div className="pt-1">
                  <ActionButton
                    run={testDiscord}
                    label={t("set.testSend")}
                    okMessage={t("set.testSent")}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="card p-6 space-y-5">
          <h2 className="label">{t("set.security")}</h2>

          <div>
            <span className="label label-soft block mb-1">
              {t("set.account")}
            </span>
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
        </section>

        {/* Footer: messages + save */}
        <div className="flex items-center gap-4 flex-wrap">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? t("common.saving") : t("set.saveButton")}
          </button>
          {state?.error && (
            <span className="text-sm text-[color:var(--color-accent)]">
              {state.error}
            </span>
          )}
          {saved && (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              {t("common.saved")}
            </span>
          )}
        </div>
      </form>

      {/* Exchange rates */}
      <section className="card p-6 space-y-3">
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

      {/* iCal feed */}
      <section className="card p-6 space-y-3">
        <h2 className="label flex items-center gap-2">
          <CalendarBlank size={16} /> {t("set.ical")}
        </h2>
        <p className="label label-soft">{t("set.icalNote")}</p>
        {icalUrl ? (
          <>
            <div className="flex items-center gap-2">
              <input className="field flex-1" readOnly value={icalUrl} />
              <button
                type="button"
                className="btn btn-ghost shrink-0"
                onClick={() => navigator.clipboard?.writeText(icalUrl)}
              >
                {t("set.icalCopy")}
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <ActionButton
                run={generateIcalToken}
                label={t("set.icalRegen")}
                okMessage={t("common.saved")}
              />
              <ActionButton
                run={disableIcal}
                label={t("set.icalDisable")}
                okMessage={t("common.saved")}
              />
            </div>
          </>
        ) : (
          <ActionButton
            run={generateIcalToken}
            label={t("set.icalEnable")}
            okMessage={t("common.saved")}
          />
        )}
      </section>

      {/* Backups */}
      <section className="card p-6 space-y-3">
        <h2 className="label flex items-center gap-2">
          <Database size={16} /> {t("set.backup")}
        </h2>
        <p className="label label-soft">
          {backups.enabled
            ? t("set.backupOn", {
                hours: backups.intervalHours,
                keep: backups.keep,
              })
            : t("set.backupOff")}
        </p>
        <p className="label label-soft">
          {t("set.backupStatus", {
            count: backups.count,
            latest: backups.latest ?? "—",
          })}
        </p>
        <ActionButton
          run={backupNowAction}
          label={t("set.backupNow")}
          okMessage={t("set.backupDone")}
        />
      </section>

      {leaveTo && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setLeaveTo(null)}
          />
          <div className="relative w-full max-w-sm bg-[color:var(--color-paper)] border border-[color:var(--color-line)] rounded-2xl p-6 float-in">
            <h2 className="headline text-xl mb-2">{t("set.unsavedTitle")}</h2>
            <p className="text-sm text-[color:var(--color-ink-soft)] leading-relaxed">
              {t("set.unsavedMsg")}
            </p>
            {leaveError && (
              <p className="text-sm text-[color:var(--color-accent)] mt-3">
                {leaveError}
              </p>
            )}
            <div className="flex flex-col gap-2 mt-6">
              <button
                type="button"
                className="btn"
                disabled={leaveSaving}
                onClick={saveAndLeave}
              >
                {leaveSaving ? t("common.saving") : t("set.unsavedSave")}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={leaveWithoutSaving}
                >
                  {t("set.unsavedDiscard")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setLeaveTo(null)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
