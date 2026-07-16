"use client";

import { useState, type ReactNode } from "react";

/**
 * Instant on/off switch backed by a cookie + a `data-*` attribute on <html>
 * (same pattern as the theme toggle). Used for the animation / page-fade
 * preferences. Initialised from the server-known value so it renders in the
 * right state immediately.
 */
export function CookieSwitch({
  label,
  cookieName,
  attr,
  initialOn,
}: {
  label: ReactNode;
  cookieName: string;
  /** the `data-<attr>` name on <html>, e.g. "anim" or "fade" */
  attr: string;
  initialOn: boolean;
}) {
  const [on, setOn] = useState(initialOn);

  function set(next: boolean) {
    setOn(next);
    document.documentElement.setAttribute(`data-${attr}`, next ? "on" : "off");
    document.cookie = `${cookieName}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="tally-switch"
        checked={on}
        onChange={(e) => {
          // Instant (cookie-backed) — don't bubble to the settings form's
          // onChange, so it isn't counted as an unsaved form change.
          e.stopPropagation();
          set(e.target.checked);
        }}
      />
    </label>
  );
}
