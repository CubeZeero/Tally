"use client";

import { useState, useTransition } from "react";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import { useLang } from "./LangProvider";
import { checkForUpdates } from "@/app/actions";
import type { UpdateInfo } from "@/lib/update";

/**
 * Version pill + update status with a manual "check for updates" button. The
 * button bypasses the 6h cache (server action) and updates the shown status.
 */
export function UpdateCheck({
  initial,
  url,
}: {
  initial: UpdateInfo;
  url: string;
}) {
  const { t } = useLang();
  const [info, setInfo] = useState(initial);
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();

  function onCheck() {
    start(async () => {
      const fresh = await checkForUpdates();
      setInfo(fresh);
      setChecked(true);
    });
  }

  return (
    <div className="mt-5">
      {/* Version + current status */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center rounded-full border border-[color:var(--color-line)] px-3 py-1 text-sm font-medium tabular-nums">
          v{info.current}
        </span>
        {info.latest &&
          (info.updateAvailable ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[color:var(--color-accent)] hover:underline"
            >
              {t("about.updateAvailable", { latest: info.latest })} →
            </a>
          ) : (
            <span className="text-sm text-[color:var(--color-ink-soft)]">
              {t("about.upToDate")}
            </span>
          ))}
      </div>

      {/* Clear, outlined action button on its own line */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={pending}
          className="btn btn-ghost disabled:opacity-60"
        >
          <ArrowClockwise
            size={15}
            weight="bold"
            className={pending ? "animate-spin" : ""}
          />
          {pending ? t("update.checking") : t("update.check")}
        </button>
        {checked && !pending && (
          <span className="text-xs text-[color:var(--color-ink-faint)]">
            {t("update.checkedNow")}
          </span>
        )}
      </div>
    </div>
  );
}
