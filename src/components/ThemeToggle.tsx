"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react/dist/ssr";
import { useLang } from "./LangProvider";

export function ThemeToggle() {
  const { t } = useLang();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    // 1 year cookie so the server renders the right theme on next load.
    document.cookie = `tally_theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      onClick={toggle}
      className="text-[color:var(--color-ink-soft)] hover:text-ink"
      title={t("nav.themeToggle")}
      aria-label={t("nav.themeToggle")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
