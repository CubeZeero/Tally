"use client";

import { useState, useTransition } from "react";
import { createSubscription, updateSubscription } from "@/app/actions";
import { CURRENCIES, CYCLES } from "@/lib/money";
import { cycleLabel } from "@/lib/i18n";
import { useLang } from "../LangProvider";
import { IconPicker } from "./IconPicker";
import type { Sub } from "./types";

const SWATCHES = [
  "#ff7a00",
  "#e63946",
  "#9b5de5",
  "#3a86ff",
  "#06d6a0",
  "#ffbe0b",
  "#118ab2",
  "#111111",
];

export function SubscriptionDialog({
  sub,
  mainCurrency,
  categories,
  paymentMethods,
  onClose,
}: {
  sub: Sub | null;
  mainCurrency: string;
  categories: string[];
  paymentMethods: string[];
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [pending, start] = useTransition();
  const [color, setColor] = useState(sub?.color ?? SWATCHES[0]);
  const [icon, setIcon] = useState(sub?.icon ?? "");
  const [image, setImage] = useState(sub?.image ?? "");

  const todayISO = (sub ? new Date(sub.startDate) : new Date())
    .toISOString()
    .slice(0, 10);
  const nextISO = sub?.nextBillDate
    ? new Date(sub.nextBillDate).toISOString().slice(0, 10)
    : "";
  const trialISO = sub?.trialEndDate
    ? new Date(sub.trialEndDate).toISOString().slice(0, 10)
    : "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    fd.set("icon", icon);
    fd.set("image", image);
    start(async () => {
      if (sub) {
        await updateSubscription(sub.id, fd);
      } else {
        await createSubscription(fd);
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full md:max-w-lg max-h-[92vh] overflow-y-auto bg-[color:var(--color-paper)] border border-[color:var(--color-line)] rounded-t-2xl md:rounded-2xl p-7 float-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="headline text-2xl">
            {sub ? t("dlg.editTitle") : t("dlg.newTitle")}
          </h2>
          <button className="label label-soft hover:text-ink" onClick={onClose}>
            {t("common.close")} ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t("dlg.name")} required>
            <input
              className="field"
              name="name"
              defaultValue={sub?.name}
              placeholder="Netflix"
              autoFocus
              required
            />
          </Field>

          <IconPicker
            icon={icon}
            image={image}
            onIcon={setIcon}
            onImage={setImage}
          />

          <div className="grid grid-cols-[2fr_1fr] gap-5">
            <Field label={t("dlg.cost")} required>
              <input
                className="field"
                name="cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={sub?.cost}
                placeholder={lang === "en" ? "9.99" : "1490"}
                required
              />
            </Field>
            <Field label={t("dlg.currency")}>
              <select
                className="field"
                name="currency"
                defaultValue={sub?.currency ?? ""}
              >
                <option value="">{t("dlg.currencyMain", { c: mainCurrency })}</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label={t("dlg.cycle")}>
              <select className="field" name="cycle" defaultValue={sub?.cycle ?? "month"}>
                {CYCLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {cycleLabel(c.value, 1, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("dlg.interval")}>
              <input
                className="field"
                name="cycleCount"
                type="number"
                min="1"
                defaultValue={sub?.cycleCount ?? 1}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label={t("dlg.startDate")} required>
              <input
                className="field"
                name="startDate"
                type="date"
                defaultValue={todayISO}
                required
              />
            </Field>
            <Field label={t("dlg.nextDate")}>
              <input
                className="field"
                name="nextBillDate"
                type="date"
                defaultValue={nextISO}
              />
            </Field>
          </div>
          <p className="label label-soft -mt-2">{t("dlg.nextHint")}</p>

          <Field label={t("dlg.trialEnd")}>
            <input
              className="field"
              name="trialEndDate"
              type="date"
              defaultValue={trialISO}
            />
          </Field>
          <p className="label label-soft -mt-2">{t("dlg.trialHint")}</p>

          <Field label={t("dlg.cancelReminder")}>
            <input
              className="field"
              name="cancelReminderDays"
              type="number"
              min="0"
              defaultValue={sub?.cancelReminderDays ?? ""}
              placeholder={t("common.optional")}
            />
          </Field>
          <p className="label label-soft -mt-2">{t("dlg.cancelReminderHint")}</p>

          <div className="grid grid-cols-2 gap-5">
            <Field label={t("dlg.category")}>
              <select
                className="field"
                name="category"
                defaultValue={sub?.category ?? ""}
              >
                <option value="">{t("common.unselected")}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {sub?.category && !categories.includes(sub.category) && (
                  <option value={sub.category}>
                    {sub.category}
                    {t("dlg.notInList")}
                  </option>
                )}
              </select>
            </Field>
            <Field label={t("dlg.paymentMethod")}>
              <select
                className="field"
                name="paymentMethod"
                defaultValue={sub?.paymentMethod ?? ""}
              >
                <option value="">{t("common.unselected")}</option>
                {paymentMethods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                {sub?.paymentMethod &&
                  !paymentMethods.includes(sub.paymentMethod) && (
                    <option value={sub.paymentMethod}>
                      {sub.paymentMethod}
                      {t("dlg.notInList")}
                    </option>
                  )}
              </select>
            </Field>
          </div>

          <Field label={t("dlg.url")}>
            <input
              className="field"
              name="url"
              type="url"
              defaultValue={sub?.url ?? ""}
              placeholder="https://"
            />
          </Field>

          <Field label={t("dlg.memo")}>
            <input
              className="field"
              name="description"
              defaultValue={sub?.description ?? ""}
              placeholder={t("common.optional")}
            />
          </Field>

          <div>
            <span className="label label-soft block mb-2">{t("dlg.accent")}</span>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid var(--color-ink)" : "none",
                    outlineOffset: 2,
                    transform: color === c ? "scale(1.1)" : "none",
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {sub && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="active"
                value="true"
                defaultChecked={sub.active}
              />
              {t("dlg.active")}
            </label>
          )}
          {!sub && <input type="hidden" name="active" value="true" />}

          <div className="flex gap-3 pt-2">
            <button className="btn flex-1" type="submit" disabled={pending}>
              {pending
                ? t("common.saving")
                : sub
                  ? t("dlg.update")
                  : t("dlg.create")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label label-soft block mb-1">
        {label}
        {required && <span className="text-[color:var(--color-accent)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
