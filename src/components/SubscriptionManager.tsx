"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createSubscription,
  deleteSubscription,
  toggleSubscription,
  updateSubscription,
} from "@/app/actions";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { SubIcon } from "./SubIcon";
import { useConfirm } from "./ConfirmProvider";
import { useLang } from "./LangProvider";
import {
  type Cycle,
  CYCLES,
  CURRENCIES,
  type Rates,
  billingProgress,
  convert,
  daysUntil,
  effectiveNextBill,
  formatMoney,
  monthlyCost,
} from "@/lib/money";
import { cycleLabel, fmtDate, relDays } from "@/lib/i18n";

export type Sub = {
  id: string;
  name: string;
  description: string | null;
  cost: number;
  currency: string | null;
  icon: string | null;
  image: string | null;
  cycle: string;
  cycleCount: number;
  startDate: string;
  nextBillDate: string | null;
  category: string | null;
  paymentMethod: string | null;
  url: string | null;
  color: string;
  active: boolean;
};

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

type SortKey = "next" | "priceDesc" | "priceAsc" | "name" | "created";

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  // Downscale to keep the stored data URL small.
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 128;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

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
    const nextTime = (s: Sub) =>
      effectiveNextBill(
        new Date(s.startDate),
        s.nextBillDate ? new Date(s.nextBillDate) : null,
        s.cycle as Cycle,
        s.cycleCount,
      ).getTime();
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
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="label label-soft">{t("subs.sortBy")}</span>
            <select
              className="field !py-1"
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
          <button className="btn" onClick={startNew}>
            {t("subs.add")}
          </button>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="px-6 md:px-12 py-16 text-center">
          <p className="text-[color:var(--color-ink-soft)]">{t("subs.empty")}</p>
          <button className="btn mt-4" onClick={startNew}>
            {t("subs.addFirstOne")}
          </button>
        </div>
      ) : (
        <ul className="border-t border-[color:var(--color-line)]">
          {sorted.map((s) => (
            <Row
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

function Row({
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
  const { lang, t } = useLang();
  const confirm = useConfirm();
  const anchor = s.nextBillDate ? new Date(s.nextBillDate) : new Date(s.startDate);
  const next = effectiveNextBill(
    new Date(s.startDate),
    s.nextBillDate ? new Date(s.nextBillDate) : null,
    s.cycle as Cycle,
    s.cycleCount,
  );
  const d = daysUntil(next);
  const progress = billingProgress(anchor, s.cycle as Cycle, s.cycleCount);
  const own = s.currency || mainCurrency;
  const convertedMonthly = (() => {
    const c = convert(s.cost, own, mainCurrency, rates);
    if (c === null) return null;
    return monthlyCost(c, s.cycle as Cycle, s.cycleCount);
  })();

  return (
    <li
      className={`group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_1fr_auto] items-center gap-4 px-6 md:px-12 py-4 border-b border-[color:var(--color-line)] transition-opacity ${
        s.active ? "" : "opacity-45"
      } ${pending ? "opacity-50" : ""}`}
    >
      <span
        className="absolute left-0 bottom-0 h-[2px] transition-[width]"
        style={{
          width: `${Math.round(progress * 100)}%`,
          background: s.color,
          opacity: s.active ? 0.9 : 0.3,
        }}
        title={`${relDays(d, lang)}`}
      />

      <SubIcon icon={s.icon} image={s.image} color={s.color} size={26} />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{s.name}</p>
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
      </div>

      <div className="hidden md:block text-sm">
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

      <div className="hidden md:block text-sm">
        {fmtDate(next, lang, { month: "short", day: "numeric" })}
        <p className="label label-soft mt-0.5">{relDays(d, lang)}</p>
      </div>

      <div className="flex items-center gap-1 justify-end">
        <button
          className="btn-ghost label px-3 py-2 rounded-full"
          onClick={() =>
            start(async () => {
              await toggleSubscription(s.id, !s.active);
              onChanged();
            })
          }
        >
          {s.active ? t("subs.pause") : t("subs.resume")}
        </button>
        <button
          className="btn-ghost label px-3 py-2 rounded-full"
          onClick={onEdit}
        >
          {t("common.edit")}
        </button>
        <button
          className="btn-ghost label px-3 py-2 rounded-full hover:text-[color:var(--color-accent)]"
          onClick={async () => {
            const ok = await confirm({
              title: t("dlg.deleteTitle"),
              message: t("dlg.deleteMsg", { name: s.name }),
              confirmLabel: t("common.deleteDo"),
              danger: true,
            });
            if (ok) {
              start(async () => {
                await deleteSubscription(s.id);
                onChanged();
              });
            }
          }}
        >
          {t("common.delete")}
        </button>
      </div>
    </li>
  );
}

function IconPicker({
  icon,
  image,
  onIcon,
  onImage,
}: {
  icon: string;
  image: string;
  onIcon: (slug: string) => void;
  onImage: (dataUrl: string) => void;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { slug: string; title: string; hex: string }[]
  >([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/icons?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } catch {
        setResults([]);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div>
      <span className="label label-soft block mb-1">{t("dlg.icon")}</span>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center shrink-0 rounded-md border border-[color:var(--color-line)]"
          style={{ width: 38, height: 38 }}
        >
          <SubIcon icon={icon || null} image={image || null} color="#999" size={22} />
        </span>
        <input
          className="field flex-1"
          placeholder={t("dlg.iconSearch")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {(icon || image) && (
          <button
            type="button"
            className="label label-soft hover:text-ink"
            onClick={() => {
              onIcon("");
              onImage("");
              setQuery("");
            }}
          >
            {t("dlg.iconClear")}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.slug}
              type="button"
              title={r.title}
              onClick={() => {
                onIcon(r.slug);
                onImage("");
                setQuery("");
                setResults([]);
              }}
              className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
              style={{ width: 36, height: 36 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/icon/${encodeURIComponent(r.slug)}`}
                alt={r.title}
                width={22}
                height={22}
              />
            </button>
          ))}
        </div>
      )}

      <label className="label label-soft mt-2 inline-block cursor-pointer hover:text-ink">
        {t("dlg.iconImage")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const url = await fileToDataUrl(f);
              onImage(url);
              onIcon("");
            }
          }}
        />
      </label>
    </div>
  );
}

function SubscriptionDialog({
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
                placeholder="1490"
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
