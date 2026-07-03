"use client";

import { useRouter } from "next/navigation";
import { LANGUAGES, LANGUAGE_LABELS, type Lang } from "@/lib/i18n";
import { useLang } from "./LangProvider";

export function LangSwitcher() {
  const router = useRouter();
  const { lang } = useLang();

  function change(next: Lang) {
    document.cookie = `tally_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      className="field"
      value={lang}
      onChange={(e) => change(e.target.value as Lang)}
    >
      {LANGUAGES.map((l) => (
        <option key={l} value={l}>
          {LANGUAGE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
