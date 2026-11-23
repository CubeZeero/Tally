"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type Cycle, type Rates, convert, nextSubscriptionBill, isInTrial, monthlyCost } from "@/lib/money";
import { useLang } from "./LangProvider";
import { SubscriptionDialog } from "./subscriptions/SubscriptionDialog";
import { SubscriptionRow } from "./subscriptions/SubscriptionRow";
import type { Sub } from "./subscriptions/types";
export type { Sub } from "./subscriptions/types";

type SortKey = "next" | "priceDesc" | "priceAsc" | "name" | "created";

export function SubscriptionManager({
  subs,
  mainCurrency,
  rates,
  categories,
  paymentMethods,
  openNew,
}: {
  subs: Sub[];
  mainCurrency: string;
  rates: Rates;
  categories: string[];
  paymentMethods: string[];
  openNew: boolean;
}) {
  const router = useRouter();
  const { lang, t } = useLang();
  const [editing, setEditing] = useState<Sub | null>(null);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>("next");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "trial"
  >("all");

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setOpen(true);
    }
  }, [openNew]);

  const sorted = useMemo(() => {
    const monthly = (s: Sub) => {
      const c = convert(s.cost, s.currency, mainCurrency, rates);
      return c === null ? -Infinity : monthlyCost(c, s.cycle as Cycle, s.cycleCount);
    };
    const nextTime = (s: Sub) => nextSubscriptionBill(s).getTime();
    const arr = [...subs];
    arr.sort((a, b) => {
      // Active first regardless of sort key.
      if (a.active !== b.active) return a.active ? -1 : 1;
      switch (sort) {
        case "next":
          return nextTime(a) - nextTime(b);
        case "priceDesc":
          return monthly(b) - monthly(a);
        case "priceAsc":
          return monthly(a) - monthly(b);
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return 0;
      }
    });
    return arr;
  }, [subs, sort, mainCurrency, rates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((s) => {
      if (statusFilter === "active" && !s.active) return false;
      if (statusFilter === "paused" && s.active) return false;
      if (statusFilter === "trial" && !isInTrial(s.trialEndDate)) return false;
      if (!q) return true;
      return [s.name, s.category, s.paymentMethod]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [sorted, query, statusFilter]);

  function startNew() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(s: Sub) {
    setEditing(s);
    setOpen(true);
  }
  function close() {
    setOpen(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between px-6 md:px-12 pt-10 pb-6 gap-4 flex-wrap">
        <div>
          <p className="label label-soft">{t("subs.registered")}</p>
          <h1 className="headline text-4xl md:text-5xl mt-2">
            {t("subs.countTitle", { n: subs.length })}
          </h1>
        </div>
        <button className="btn" onClick={startNew}>
          {t("subs.add")}
        </button>
      </div>

      {subs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-6 md:px-12 pb-5">
          <input
            className="field !py-1.5 flex-1 min-w-[160px] max-w-xs"
            placeholder={t("subs.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="field !py-1.5 w-auto"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            <option value="all">{t("subs.filterAll")}</option>
            <option value="active">{t("subs.filterActive")}</option>
            <option value="paused">{t("subs.filterPaused")}</option>
            <option value="trial">{t("subs.filterTrial")}</option>
          </select>
          <label className="flex items-center gap-2 ml-auto">
            <span className="label label-soft">{t("subs.sortBy")}</span>
            <select
              className="field !py-1.5 w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="next">{t("sort.next")}</option>
              <option value="priceDesc">{t("sort.priceDesc")}</option>
              <option value="priceAsc">{t("sort.priceAsc")}</option>
              <option value="name">{t("sort.name")}</option>
              <option value="created">{t("sort.created")}</option>
            </select>
          </label>
        </div>
      )}

      {subs.length === 0 ? (
        <div className="px-6 md:px-12 py-16 text-center">
          <p className="text-[color:var(--color-ink-soft)]">{t("subs.empty")}</p>
          <button className="btn mt-4" onClick={startNew}>
            {t("subs.addFirstOne")}
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-6 md:px-12 py-16 text-center border-t border-[color:var(--color-line)]">
          <p className="text-[color:var(--color-ink-soft)]">
            {t("subs.noMatch")}
          </p>
        </div>
      ) : (
        <ul className="border-t border-[color:var(--color-line)]">
          {visible.map((s) => (
            <SubscriptionRow
              key={s.id}
              s={s}
              mainCurrency={mainCurrency}
              rates={rates}
              onEdit={() => startEdit(s)}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      {open && (
        <SubscriptionDialog
          sub={editing}
          mainCurrency={mainCurrency}
          categories={categories}
          paymentMethods={paymentMethods}
          onClose={close}
        />
      )}
    </div>
  );
}
