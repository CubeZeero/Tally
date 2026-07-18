"use client";

import { useState } from "react";
import { ACCENTS } from "@/lib/accents";

/**
 * Accent color swatches. Instant (cookie + data-accent on <html>, same pattern
 * as the theme toggle); does not mark the settings form dirty.
 */
export function AccentPicker({
  label,
  initial,
}: {
  label: string;
  initial: string;
}) {
  const [sel, setSel] = useState(initial);

  function choose(key: string) {
    setSel(key);
    document.documentElement.setAttribute("data-accent", key);
    document.cookie = `tally_accent=${key}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-label={a.key}
            aria-pressed={sel === a.key}
            onClick={(e) => {
              e.stopPropagation();
              choose(a.key);
            }}
            className="h-6 w-6 rounded-full transition hover:scale-110"
            style={{
              background: a.color,
              boxShadow:
                sel === a.key
                  ? `0 0 0 2px var(--color-paper-soft), 0 0 0 4px ${a.color}`
                  : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}
