import { requireAuth } from "@/lib/auth";
import { getUser, prisma } from "@/lib/db";
import { Shell } from "@/components/Shell";
import { SettingsForm } from "@/components/SettingsForm";
import { ListManager } from "@/components/ListManager";
import { DataManager } from "@/components/DataManager";
import { serverT } from "@/lib/server-lang";
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

  const [user, cats, pms] = await Promise.all([
    getUser(userId),
    prisma.category.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
    prisma.paymentMethod.findMany({ where: { userId }, orderBy: { sort: "asc" } }),
  ]);
  if (!user) return null;

  return (
    <Shell active="settings">
      <div className="px-6 md:px-12 py-10">
        <p className="label label-soft">{t("set.eyebrow")}</p>
        <h1 className="headline text-4xl md:text-5xl mt-2 mb-10">
          {t("set.title")}
        </h1>

        <div className="grid lg:grid-cols-2 gap-14 max-w-5xl">
          <SettingsForm
            username={user.username}
            currency={user.currency}
            discordWebhookUrl={user.discordWebhookUrl ?? ""}
            notifyDaysBefore={user.notifyDaysBefore}
            notifyEnabled={user.notifyEnabled}
            notifyHour={user.notifyHour}
            ratesUpdatedAt={user.ratesUpdatedAt?.toISOString() ?? null}
          />

          <div className="space-y-12">
            <ListManager
              title={t("set.categories")}
              items={cats.map((c) => ({ id: c.id, name: c.name }))}
              addAction={addCategory}
              deleteAction={deleteCategory}
            />
            <ListManager
              title={t("set.paymentMethods")}
              items={pms.map((p) => ({ id: p.id, name: p.name }))}
              addAction={addPaymentMethod}
              deleteAction={deletePaymentMethod}
            />
            <DataManager />
          </div>
        </div>
      </div>
    </Shell>
  );
}
