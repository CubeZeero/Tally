import Link from "next/link";
import { cookies } from "next/headers";
import { SignOut, User } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { NavGlyph } from "./NavGlyph";
import { PageFade } from "./PageFade";
import { UpdateBanner } from "./UpdateBanner";
import { logout } from "@/app/actions";
import { serverT } from "@/lib/server-lang";
import { getSession } from "@/lib/auth";
import { getUser } from "@/lib/db";
import { getUpdateInfo } from "@/lib/update";

// Where the banner's "how to update" link points (wiki self-hosting page).
const UPDATE_URL = "https://tally.cubezeero.com/self-hosting/";

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
  const u = userId ? await getUser(userId) : null;
  const username = u ? u.displayName || u.username : "";

  // Show an "update available" banner unless the user already dismissed this
  // exact latest version.
  const update = await getUpdateInfo();
  const cookieStore = await cookies();
  const dismissed = cookieStore.get("tally_update_seen")?.value;
  // Page-transition fade preference (default on) — passed per navigation so
  // toggling it never re-animates the page currently on screen.
  const fadeOn = cookieStore.get("tally_fade")?.value !== "off";
  const showUpdate =
    update.updateAvailable && !!update.latest && dismissed !== update.latest;

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
        {showUpdate && update.latest && (
          <UpdateBanner
            current={update.current}
            latest={update.latest}
            url={UPDATE_URL}
          />
        )}
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
                <span style={{ textTransform: "none" }}>{username}</span>
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

        <main className="flex-1">
          <PageFade fade={fadeOn}>{children}</PageFade>
        </main>
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
