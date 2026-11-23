import { en } from "./i18n/en";
import { ja } from "./i18n/ja";

export const LANGUAGES = ["ja", "en"] as const;
export type Lang = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
};

export function normalizeLang(v: string | undefined | null): Lang {
  // Default to English when no explicit preference is set.
  return v === "ja" ? "ja" : "en";
}

type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = { ja, en };

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function getT(lang: Lang): TFunc {
  const d = DICTS[lang];
  return (key, vars) => {
    let s = d[key] ?? DICTS.ja[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}

export function locale(lang: Lang): string {
  return lang === "en" ? "en-US" : "ja-JP";
}

/** Locale-aware date formatting. */
export function fmtDate(
  date: Date,
  lang: Lang,
  opts: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(locale(lang), opts);
}

/** "Today" / "in N days" style relative label. */
export function relDays(d: number, lang: Lang): string {
  if (d <= 0) return lang === "en" ? "Today" : "本日";
  return lang === "en" ? `in ${d}d` : `${d}日後`;
}

export function cycleLabel(
  cycle: string,
  count: number,
  lang: Lang,
): string {
  const t = getT(lang);
  const base = t(`cycle.${cycle}`);
  if (count <= 1) return base;
  if (lang === "en") {
    const unit = { day: "days", week: "weeks", month: "months", year: "years" }[
      cycle
    ];
    return `every ${count} ${unit}`;
  }
  const unit = { day: "日", week: "週", month: "ヶ月", year: "年" }[cycle];
  return `${count}${unit}ごと`;
}
