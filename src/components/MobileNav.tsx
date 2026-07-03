"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { useLang } from "./LangProvider";
import { logout } from "@/app/actions";

export function MobileNav({
  items,
  active,
  username,
}: {
  items: { key: string; href: string; label: string; icon: string }[];
  active: string;
  username?: string;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <button
        aria-label="menu"
        onClick={() => setOpen(true)}
        className="text-ink"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-64 max-w-[80vw] bg-[color:var(--color-paper)] border-l border-[color:var(--color-line)] p-6 float-in flex flex-col">
            <button
              className="self-end text-[color:var(--color-ink-soft)] hover:text-ink"
              onClick={() => setOpen(false)}
              aria-label="close"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {username && (
              <div className="mt-4 flex items-center gap-2 label label-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {username}
              </div>
            )}

            <nav className="mt-6 flex flex-col gap-1">
              {items.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="py-3 border-b border-[color:var(--color-line)] label flex items-center gap-3"
                  style={{
                    color:
                      active === n.key
                        ? "var(--color-accent)"
                        : "var(--color-ink)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d={n.icon}
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {n.label}
                </Link>
              ))}
            </nav>

            <form action={logout} className="mt-auto pt-6">
              <button
                type="submit"
                className="label text-[color:var(--color-ink-soft)] hover:text-ink flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 12H4m0 0l4-4m-4 4l4 4M14 4h5v16h-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("nav.logout")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
