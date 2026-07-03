import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { Logo } from "@/components/Logo";
import { serverT } from "@/lib/server-lang";

export const dynamic = "force-dynamic";

const VERSION = "0.4.0";

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

      <div className="px-6 md:px-12 py-8 space-y-8 max-w-md">
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

        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn">
            {t("about.toDashboard")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}
