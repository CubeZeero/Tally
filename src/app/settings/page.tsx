import { cookies, headers } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { SettingsForm } from "@/components/SettingsForm";
import { ListManager } from "@/components/ListManager";
import { DataManager } from "@/components/DataManager";
import { McpKeyManager } from "@/components/McpKeyManager";
import { serverT } from "@/lib/server-lang";
import { ACCENT_KEYS, DEFAULT_ACCENT } from "@/lib/accents";
import {
  backupIntervalHours,
  backupsEnabled,
  listBackups,
} from "@/lib/backup";
import {
  addCategory,
  addPaymentMethod,
  deleteCategory,
  deletePaymentMethod,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireAuth();
  const { t } = await serverT();

  const [user, cats, pms, backupList] = await Promise.all([
    getUser(userId),
    prisma.category.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
    listBackups(),
  ]);
  if (!user) return null;

  // Animations / page fade default on; each toggle stores its choice in a cookie.
  const cookieStore = await cookies();
  const animEnabled = cookieStore.get("tally_anim")?.value !== "off";
  const fadeEnabled = cookieStore.get("tally_fade")?.value !== "off";
  const accentCookie = cookieStore.get("tally_accent")?.value ?? "";
  const accent = ACCENT_KEYS.includes(accentCookie) ? accentCookie : DEFAULT_ACCENT;

  // Absolute origin for the iCal subscription URL.
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "http";
  const host = h.get("host") ?? "localhost:6400";
  const icalUrl = user.icalToken
    ? `${proto}://${host}/api/calendar/${user.icalToken}`
    : null;
  const mcpUrl = `${proto}://${host}/api/mcp`;

  const latest = backupList[0]
    ? new Date(backupList[0].mtime).toLocaleString(
        user.lang === "en" ? "en-US" : "ja-JP",
      )
    : null;
  const backups = {
    enabled: backupsEnabled(),
    keep: parseInt(process.env.BACKUP_KEEP ?? "7", 10) || 7,
    intervalHours: backupIntervalHours(),
    count: backupList.length,
    latest,
  };

  return (
    <Shell active="settings">
      <div className="px-6 md:px-12 py-10">
        <p className="label label-soft">{t("set.eyebrow")}</p>
        <h1 className="headline text-4xl md:text-5xl mt-2 mb-10">
          {t("set.title")}
        </h1>

        <div className="grid lg:grid-cols-2 gap-6 items-start max-w-5xl">
          <SettingsForm
            username={user.displayName || user.username}
            currency={user.currency}
            discordWebhookUrl={user.discordWebhookUrl ?? ""}
            notifyEmail={user.notifyEmail ?? ""}
            notifyEmailEnabled={user.notifyEmailEnabled}
            notifyDaysBefore={user.notifyDaysBefore}
            notifyEnabled={user.notifyEnabled}
            notifyHour={user.notifyHour}
            webhookUrl={user.webhookUrl ?? ""}
            webhookEnabled={user.webhookEnabled}
            slackWebhookUrl={user.slackWebhookUrl ?? ""}
            slackEnabled={user.slackEnabled}
            ntfyUrl={user.ntfyUrl ?? ""}
            ntfyEnabled={user.ntfyEnabled}
            hasNtfyToken={Boolean(user.ntfyToken)}
            monthlyBudget={user.monthlyBudget}
            smtpHost={user.smtpHost ?? ""}
            smtpPort={user.smtpPort}
            smtpUser={user.smtpUser ?? ""}
            smtpFrom={user.smtpFrom ?? ""}
            hasSmtpPass={Boolean(user.smtpPass)}
            ratesUpdatedAt={user.ratesUpdatedAt?.toISOString() ?? null}
            icalUrl={icalUrl}
            backups={backups}
            animEnabled={animEnabled}
            fadeEnabled={fadeEnabled}
            accent={accent}
          />

          <div className="space-y-6">
            <section className="card p-6">
              <ListManager
                title={t("set.categories")}
                items={cats.map((c) => ({ id: c.id, name: c.name }))}
                addAction={addCategory}
                deleteAction={deleteCategory}
              />
            </section>
            <section className="card p-6">
              <ListManager
                title={t("set.paymentMethods")}
                items={pms.map((p) => ({ id: p.id, name: p.name }))}
                addAction={addPaymentMethod}
                deleteAction={deletePaymentMethod}
              />
            </section>
            <section className="card p-6">
              <DataManager />
            </section>
            <McpKeyManager apiKey={user.apiKey} mcpUrl={mcpUrl} restWriteKey={user.restWriteApiKey} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
