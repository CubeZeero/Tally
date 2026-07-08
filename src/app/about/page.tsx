import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Logo } from "@/components/Logo";
import { serverT } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

const VERSION = "0.4.0";
const REPO = "https://github.com/CubeZeero/Tally";
const LICENSE_URL = `${REPO}/blob/main/LICENSE`;
const DEVELOPER = "CubeZeero";

const CREDITS: { name: string; license: string; url: string }[] = [
  { name: "Next.js", license: "MIT", url: "https://nextjs.org" },
  { name: "React", license: "MIT", url: "https://react.dev" },
  { name: "Prisma", license: "Apache-2.0", url: "https://www.prisma.io" },
  { name: "Tailwind CSS", license: "MIT", url: "https://tailwindcss.com" },
  { name: "Phosphor Icons", license: "MIT", url: "https://phosphoricons.com" },
  { name: "Simple Icons", license: "CC0-1.0", url: "https://simpleicons.org" },
  { name: "jose", license: "MIT", url: "https://github.com/panva/jose" },
  { name: "bcryptjs", license: "MIT", url: "https://github.com/dcodeIO/bcrypt.js" },
  { name: "Nodemailer", license: "MIT", url: "https://nodemailer.com" },
];

export default async function AboutPage() {
  const userId = await requireAuth();
  const { t } = await serverT();
  const [subs, active] = await Promise.all([
    prisma.subscription.count({ where: { userId } }),
    prisma.subscription.count({ where: { userId, active: true } }),
  ]);

  return (
    <Shell active="about">
      <section className="relative overflow-hidden">
        <div
          className="blob hidden sm:block"
          style={{ width: 380, height: 380, right: "-60px", top: "-80px" }}
          aria-hidden
        />
        <div className="relative px-6 md:px-12 pt-12 pb-8">
          <Logo size={40} />
          <p className="label label-soft mt-8">{t("about.eyebrow")}</p>
          <h1 className="headline text-5xl md:text-6xl mt-2">TALLY</h1>
          <p className="text-sm md:text-base text-[color:var(--color-ink-soft)] mt-4 max-w-xl leading-relaxed">
            {t("about.desc")}
          </p>
          <p className="label label-soft mt-4">
            {t("about.version", { v: VERSION })}
          </p>
        </div>
      </section>

      <div className="px-6 md:px-12 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-8 items-start">
          {/* Left column: status + details */}
          <div className="space-y-8">
            <div>
              <p className="label mb-4">{t("about.status")}</p>
              <div className="grid grid-cols-2 gap-px bg-[color:var(--color-line)] border border-[color:var(--color-line)] rounded-xl overflow-hidden">
                <div className="bg-[color:var(--color-paper-soft)] p-5">
                  <p className="label label-soft">{t("about.registered")}</p>
                  <p className="text-3xl mt-1 tabular-nums">{subs}</p>
                </div>
                <div className="bg-[color:var(--color-paper-soft)] p-5">
                  <p className="label label-soft">{t("about.active")}</p>
                  <p className="text-3xl mt-1 tabular-nums">{active}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="label mb-4">{t("about.details")}</p>
              <dl className="border border-[color:var(--color-line)] rounded-xl overflow-hidden divide-y divide-[color:var(--color-line)]">
                <InfoRow label={t("about.developer")}>
                  <span className="text-sm">{DEVELOPER}</span>
                </InfoRow>
                <InfoRow label={t("about.repository")}>
                  <a
                    href={REPO}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm hover:text-[color:var(--color-accent)] break-all text-right"
                  >
                    github.com/CubeZeero/Tally
                  </a>
                </InfoRow>
                <InfoRow label={t("about.license")}>
                  <a
                    href={LICENSE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm hover:text-[color:var(--color-accent)]"
                  >
                    AGPL-3.0
                  </a>
                </InfoRow>
              </dl>
            </div>
          </div>

          {/* Right column: credits */}
          <div>
            <p className="label mb-2">{t("about.credits")}</p>
            <p className="label label-soft mb-4">{t("about.creditsNote")}</p>
            <ul className="border border-[color:var(--color-line)] rounded-xl overflow-hidden divide-y divide-[color:var(--color-line)]">
              {CREDITS.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-4 bg-[color:var(--color-paper-soft)] px-4 py-2.5"
                >
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm hover:text-[color:var(--color-accent)]"
                  >
                    {c.name}
                  </a>
                  <span className="label label-soft tabular-nums">{c.license}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-10">
          <Link href="/" className="btn">
            {t("about.toDashboard")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[color:var(--color-paper-soft)] px-4 py-3">
      <span className="label label-soft">{label}</span>
      {children}
    </div>
  );
}
