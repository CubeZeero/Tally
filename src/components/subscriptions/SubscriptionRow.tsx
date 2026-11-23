"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowSquareOut, DotsThreeVertical } from "@phosphor-icons/react/dist/ssr";
import { deleteSubscription, duplicateSubscription, toggleSubscription } from "@/app/actions";
import {
  type Cycle, type Rates, billingProgress, convert, daysUntil, nextSubscriptionBill, subscriptionBillingAnchor,
  formatMoney, isInTrial, monthlyCost,
} from "@/lib/money";
import { cycleLabel, fmtDate, relDays } from "@/lib/i18n";
import { SubIcon } from "../SubIcon";
import { useConfirm } from "../ConfirmProvider";
import { useLang } from "../LangProvider";
import type { Sub } from "./types";

export function SubscriptionRow({
  s,
  mainCurrency,
  rates,
  onEdit,
  onChanged,
}: {
  s: Sub;
  mainCurrency: string;
  rates: Rates;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { lang, t } = useLang();
  const confirm = useConfirm();
  const trial = isInTrial(s.trialEndDate);

  // Close the mobile action menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const doToggle = () =>
    start(async () => {
      await toggleSubscription(s.id, !s.active);
      onChanged();
    });
  const doDuplicate = () =>
    start(async () => {
      await duplicateSubscription(s.id);
      onChanged();
    });
  const doDelete = async () => {
    const ok = await confirm({
      title: t("dlg.deleteTitle"),
      message: t("dlg.deleteMsg", { name: s.name }),
      confirmLabel: t("common.deleteDo"),
      danger: true,
    });
    if (ok)
      start(async () => {
        await deleteSubscription(s.id);
        onChanged();
      });
  };

  const actions: {
    key: string;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }[] = [
    { key: "toggle", label: s.active ? t("subs.pause") : t("subs.resume"), onClick: doToggle },
    { key: "edit", label: t("common.edit"), onClick: onEdit },
    { key: "duplicate", label: t("subs.duplicate"), onClick: doDuplicate },
    { key: "delete", label: t("common.delete"), onClick: doDelete, danger: true },
  ];
  const anchor = subscriptionBillingAnchor(s);
  const next = nextSubscriptionBill(s);
  const d = daysUntil(next);
  const progress = billingProgress(anchor, s.cycle as Cycle, s.cycleCount);
  const own = s.currency || mainCurrency;
  const convertedMonthly = (() => {
    const c = convert(s.cost, own, mainCurrency, rates);
    if (c === null) return null;
    return monthlyCost(c, s.cycle as Cycle, s.cycleCount);
  })();
  // Dim only the presentational cells when paused — NOT the whole row, because
  // opacity on the <li> creates a stacking context that would trap the action
  // menu behind the next row (making its items unclickable) and fade it.
  const dim = s.active ? "" : "opacity-45";

  return (
    <li
      className={`group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_1fr_auto] items-center gap-4 px-6 md:px-12 py-4 border-b border-[color:var(--color-line)] transition-opacity ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span
        className="anim-bar absolute left-0 bottom-0 h-[2px]"
        style={{
          width: `${Math.round(progress * 100)}%`,
          background: s.color,
          opacity: s.active ? 0.9 : 0.3,
        }}
        title={`${relDays(d, lang)}`}
      />

      <div className={dim}>
        <SubIcon icon={s.icon} image={s.image} color={s.color} size={26} />
      </div>

      <div className={`min-w-0 ${dim}`}>
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{s.name}</p>
          {trial && (
            <span
              className="shrink-0 label px-1.5 py-0.5 rounded"
              style={{
                color: "var(--color-accent)",
                border: "1px solid var(--color-accent)",
              }}
            >
              {t("subs.trial")}
            </span>
          )}
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="label-soft hover:text-ink shrink-0 inline-flex"
            >
              <ArrowSquareOut size={14} />
            </a>
          )}
        </div>
        <p className="label label-soft truncate">
          {s.category || t("common.uncategorized")}
          {s.paymentMethod ? ` · ${s.paymentMethod}` : ""}
        </p>
        {/* Mobile-only: price + next payment (hidden on md+, shown as columns) */}
        <p className="md:hidden text-xs text-[color:var(--color-ink-soft)] truncate mt-1 tabular-nums">
          <span className="text-ink">{formatMoney(s.cost, own)}</span>
          <span> /{cycleLabel(s.cycle, s.cycleCount, lang)}</span>
          <span> · {fmtDate(next, lang, { month: "short", day: "numeric" })}</span>
          <span> · {relDays(d, lang)}</span>
        </p>
      </div>

      <div className={`hidden md:block text-sm ${dim}`}>
        {formatMoney(s.cost, own)}
        <span className="label label-soft ml-1">
          /{cycleLabel(s.cycle, s.cycleCount, lang)}
        </span>
        <p className="label label-soft mt-0.5">
          {convertedMonthly !== null
            ? `${t("subs.monthly")} ${formatMoney(convertedMonthly, mainCurrency)}`
            : t("subs.rateMissing")}
        </p>
      </div>

      <div className={`hidden md:block text-sm ${dim}`}>
        {fmtDate(next, lang, { month: "short", day: "numeric" })}
        <p className="label label-soft mt-0.5">{relDays(d, lang)}</p>
      </div>

      <div className="justify-self-end">
        {/* Inline buttons on larger screens */}
        <div className="hidden sm:flex items-center gap-1 justify-end">
          {actions.map((a) => (
            <button
              key={a.key}
              className={`btn-ghost label px-3 py-2 rounded-full ${
                a.danger ? "hover:text-[color:var(--color-accent)]" : ""
              }`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Kebab menu on mobile */}
        <div className="sm:hidden relative" ref={menuRef}>
          <button
            type="button"
            aria-label={t("common.actions")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="btn-ghost p-2 rounded-full"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <DotsThreeVertical size={20} weight="bold" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-20 min-w-[9rem] py-1 bg-[color:var(--color-paper)] border border-[color:var(--color-line)] rounded-xl shadow-lg float-in"
            >
              {actions.map((a) => (
                <button
                  key={a.key}
                  role="menuitem"
                  className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-[color:var(--color-paper-soft)] ${
                    a.danger ? "text-[color:var(--color-accent)]" : ""
                  }`}
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick();
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
