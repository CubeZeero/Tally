"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANGUAGES, LANGUAGE_LABELS, type Lang } from "@/lib/i18n";
import { updateLanguage } from "@/app/actions";
import { useLang } from "./LangProvider";

export function LangSwitcher() {
  const router = useRouter();
  const { lang } = useLang();
  const [pending, start] = useTransition();

  function change(next: Lang) {
    document.cookie = `tally_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    start(async () => {
      await updateLanguage(next);
      router.refresh();
    });
  }

  return (
    <select
      className="field"
      value={lang}
      disabled={pending}
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
