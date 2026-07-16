"use client";

import { useState } from "react";
import { X, ArrowUp } from "@phosphor-icons/react/dist/ssr";
import { useLang } from "./LangProvider";

/**
 * Dismissible "a new version is available" banner. The server only renders this
 * when an update exists and the current latest wasn't already dismissed; the ×
 * records the dismissed version in a cookie so it stays hidden until a newer
 * one appears.
 */
export function UpdateBanner({
  current,
  latest,
  url,
}: {
  current: string;
  latest: string;
  url: string;
}) {
  const { t } = useLang();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    document.cookie = `tally_update_seen=${latest}; path=/; max-age=31536000; samesite=lax`;
    setHidden(true);
  }

  return (
    <div className="flex items-center gap-3 px-6 md:px-12 py-2.5 bg-[color:var(--color-accent)] text-white text-sm">
      <ArrowUp size={16} weight="bold" className="shrink-0" />
      <p className="min-w-0 flex-1">
        {t("update.available", { latest, current })}{" "}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 font-medium whitespace-nowrap"
        >
          {t("update.how")}
        </a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("update.dismiss")}
        className="shrink-0 opacity-80 hover:opacity-100"
      >
        <X size={16} weight="bold" />
      </button>
    </div>
  );
}
