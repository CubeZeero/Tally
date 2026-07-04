"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X, SignOut, User } from "@phosphor-icons/react/dist/ssr";
import { ThemeToggle } from "./ThemeToggle";
import { NavGlyph } from "./NavGlyph";
import { useLang } from "./LangProvider";
import { logout } from "@/app/actions";

export function MobileNav({
  items,
  active,
  username,
}: {
  items: { key: string; href: string; label: string }[];
  active: string;
  username?: string;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <button aria-label="menu" onClick={() => setOpen(true)} className="text-ink">
        <List size={22} />
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
              <X size={22} />
            </button>

            {username && (
              <div className="mt-4 flex items-center gap-2 label label-soft">
                <User size={14} />
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
                  <NavGlyph name={n.key} size={18} />
                  {n.label}
                </Link>
              ))}
            </nav>

            <form action={logout} className="mt-auto pt-6">
              <button
                type="submit"
                className="label text-[color:var(--color-ink-soft)] hover:text-ink flex items-center gap-2"
              >
                <SignOut size={18} />
                {t("nav.logout")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
