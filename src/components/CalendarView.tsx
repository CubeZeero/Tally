"use client";

import { useState } from "react";
import { SubIcon } from "./SubIcon";
import { formatMoney } from "@/lib/money";
import { useLang } from "./LangProvider";
import type { Lang } from "@/lib/i18n";

export type CalEvent = {
  name: string;
  color: string;
  icon: string | null;
  image: string | null;
  amount: string; // formatted in the subscription's own currency
  convertedNum: number | null; // amount in main currency, or null if unknown
  ownCurrency: string;
};

const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarView({
  year,
  month,
  daysInMonth,
  leading,
  eventsByDay,
  todayDay,
  main,
  lang,
}: {
  year: number;
  month: number;
  daysInMonth: number;
  leading: number;
  eventsByDay: Record<string, CalEvent[]>;
  todayDay: number | null;
  main: string;
  lang: Lang;
}) {
  const { t } = useLang();
  const WEEKDAYS = lang === "en" ? WEEKDAYS_EN : WEEKDAYS_JA;
  const [selected, setSelected] = useState<number | null>(
    todayDay && (eventsByDay[String(todayDay)]?.length ?? 0) > 0
      ? todayDay
      : null,
  );

  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = selected ? (eventsByDay[String(selected)] ?? []) : [];
  const selectedTotal = selectedEvents.reduce(
    (sum, e) => sum + (e.convertedNum ?? 0),
    0,
  );

  return (
    <>
      <div className="grid grid-cols-7 gap-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`bg-[color:var(--color-paper-soft)] py-2 text-center label ${
              i === 0 ? "text-[color:var(--color-accent)]" : "label-soft"
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={idx}
                className="bg-[color:var(--color-paper)] min-h-[88px] md:min-h-[104px]"
              />
            );
          }
          const events = eventsByDay[String(day)] ?? [];
          const isToday = day === todayDay;
          const isSelected = day === selected;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelected(isSelected ? null : day)}
              className={`text-left bg-[color:var(--color-paper)] min-h-[88px] md:min-h-[104px] p-2 align-top transition-colors hover:bg-[color:var(--color-paper-soft)] ${
                isSelected ? "ring-2 ring-inset ring-[color:var(--color-accent)]" : ""
              } ${events.length ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`inline-flex items-center justify-center text-xs w-6 h-6 rounded-full ${
                  isToday
                    ? "bg-[color:var(--color-accent)] text-[color:var(--color-paper)]"
                    : "text-[color:var(--color-ink-soft)]"
                }`}
              >
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {events.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 min-w-0">
                    <SubIcon icon={e.icon} image={e.image} color={e.color} size={14} />
                    <span className="text-[11px] truncate">{e.name}</span>
                  </div>
                ))}
                {events.length > 3 && (
                  <span className="label label-soft">+{events.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail */}
      {selected && (
        <div className="mt-6 card p-5 float-in">
          <div className="flex items-baseline justify-between mb-4">
            <p className="label">
              {t("cal.dayPayments", { y: year, m: month, d: selected })}
            </p>
            {selectedEvents.length > 0 && (
              <p className="text-sm tabular-nums">
                {t("common.total")} {formatMoney(selectedTotal, main)}
              </p>
            )}
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)]">
              {t("cal.noPayments")}
            </p>
          ) : (
            <ul className="space-y-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden">
              {selectedEvents.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-4 bg-[color:var(--color-paper)] px-4 py-3"
                >
                  <SubIcon icon={e.icon} image={e.image} color={e.color} />
                  <span className="text-sm font-medium truncate">{e.name}</span>
                  <span className="ml-auto text-sm tabular-nums text-right">
                    {e.amount}
                    {e.ownCurrency !== main && e.convertedNum !== null && (
                      <span className="label label-soft block">
                        ≈ {formatMoney(e.convertedNum, main)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
