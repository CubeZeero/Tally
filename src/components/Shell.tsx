import Link from "next/link";
import { SignOut, User } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { NavGlyph } from "./NavGlyph";
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

const NAV: { key: NavKey; href: string }[] = [
  { key: "dashboard", href: "/" },
  { key: "subscriptions", href: "/subscriptions" },
  { key: "calendar", href: "/calendar" },
  { key: "stats", href: "/stats" },
  { key: "settings", href: "/settings" },
  { key: "about", href: "/about" },
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
                  ? "text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-ink-soft)] hover:text-ink"
              }
            >
              <NavGlyph name={n.key} size={20} />
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
              <SignOut size={20} />
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
                <User size={14} />
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
