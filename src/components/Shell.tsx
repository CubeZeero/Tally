import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { logout } from "@/app/actions";
import { serverT } from "@/lib/server-lang";
import { getSession } from "@/lib/auth";
import { getUser } from "@/lib/db";

export type NavKey =
  | "dashboard"
  | "subscriptions"
  | "calendar"
  | "stats"
  | "settings"
  | "about";

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV: { key: NavKey; href: string; icon: string }[] = [
  { key: "dashboard", href: "/", icon: "M4 13h7V4H4v9zm0 7h7v-5H4v5zm9 0h7v-9h-7v9zm0-16v5h7V4h-7z" },
  { key: "subscriptions", href: "/subscriptions", icon: "M3 7h18M3 12h18M3 17h18" },
  { key: "calendar", href: "/calendar", icon: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" },
  { key: "stats", href: "/stats", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { key: "settings", href: "/settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM4 12h2m12 0h2M12 4v2m0 12v2" },
  { key: "about", href: "/about", icon: "M12 16v-5M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z" },
];

export async function Shell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  const { t } = await serverT();
  const userId = await getSession();
  const username = userId ? (await getUser(userId))?.username ?? "" : "";
  return (
    <div className="min-h-screen flex">
      {/* Left rail */}
      <aside className="hidden md:flex flex-col items-center justify-between w-[72px] shrink-0 border-r border-[color:var(--color-line)] py-7 sticky top-0 h-screen self-start">
        <Link href="/" className="block">
          <span className="label" style={{ writingMode: "vertical-rl" }}>
            TALLY · SUBSCRIPTIONS
          </span>
        </Link>

        <nav className="flex flex-col items-center gap-6">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              title={t(`nav.${n.key}`)}
              className={
                active === n.key
                  ? "text-ink"
                  : "text-[color:var(--color-ink-soft)] hover:text-ink"
              }
            >
              <NavIcon d={n.icon} />
            </Link>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-6">
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              className="text-[color:var(--color-ink-soft)] hover:text-ink"
              title={t("nav.logout")}
            >
              <NavIcon d="M15 12H4m0 0l4-4m-4 4l4 4M14 4h5v16h-5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-8 px-6 md:px-12 h-[84px] border-b border-[color:var(--color-line)]">
          <Logo />
          <nav className="hidden xl:flex items-center gap-8 ml-2">
            {NAV.filter((n) => n.key !== "about").map((n) => (
              <TopLink
                key={n.key}
                href={n.href}
                label={t(`nav.${n.key}`)}
                sub={t(`nav.${n.key}.sub`)}
                active={active === n.key}
              />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {username && (
              <span className="hidden xl:inline-flex items-center gap-1.5 label label-soft">
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
              </span>
            )}
            <div className="xl:hidden">
              <MobileNav
                active={active}
                username={username}
                items={NAV.map((n) => ({
                  key: n.key,
                  href: n.href,
                  label: t(`nav.${n.key}`),
                  icon: n.icon,
                }))}
              />
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function TopLink({
  href,
  label,
  sub,
  active,
}: {
  href: string;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="group">
      <span className={`label block ${active ? "nav-title-active" : "nav-title"}`}>
        {label}
      </span>
      <span className="block text-[0.64rem] leading-tight mt-1 tracking-normal text-[color:var(--color-ink-faint)]">
        {sub}
      </span>
    </Link>
  );
}
