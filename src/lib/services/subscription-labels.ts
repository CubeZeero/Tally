import "server-only";
import { prisma } from "@/lib/db";
import type { LabelChange } from "./integration-input";

type LabelKey = { userId_name: { userId: string; name: string } };
type NameOnly = { name: string };
type LabelDelegate = {
  findUnique(args: { where: LabelKey }): Promise<NameOnly | null>;
  aggregate(args: { where: { userId: string }; _max: { sort: true } }): Promise<{ _max: { sort: number | null } }>;
  create(args: { data: NameOnly & { userId: string; sort: number }; select: { name: true } }): Promise<NameOnly>;
  update(args: { where: LabelKey; data: NameOnly; select: { name: true } }): Promise<NameOnly>;
  delete(args: { where: LabelKey }): Promise<NameOnly>;
};

export async function changeSubscriptionLabel(
  userId: string,
  field: "category" | "paymentMethod",
  change: LabelChange,
) {
  return prisma.$transaction(async (tx) => {
    const labels: LabelDelegate = tx[field];
    const where = { userId_name: { userId, name: change.name } };
    const existing = await labels.findUnique({ where });
    if (change.action === "create") {
      if (existing) return { error: "name_taken" } as const;
      const { _max } = await labels.aggregate({ where: { userId }, _max: { sort: true } });
      const label = await labels.create({
        data: { userId, name: change.name, sort: (_max.sort ?? 0) + 1 },
        select: { name: true },
      });
      return { label, reassignedCount: 0 } as const;
    }

    if (!existing) return { error: "not_found" } as const;
    const match = { userId, [field]: change.name };
    if (change.action === "rename") {
      if (change.newName === change.name) return { label: { name: change.name }, reassignedCount: 0 } as const;
      const duplicate = await labels.findUnique({
        where: { userId_name: { userId, name: change.newName } },
      });
      if (duplicate) return { error: "name_taken" } as const;
      const label = await labels.update({ where, data: { name: change.newName }, select: { name: true } });
      const { count } = await tx.subscription.updateMany({ where: match, data: { [field]: change.newName } });
      return { label, reassignedCount: count } as const;
    }

    const replacement = change.replacement;
    let reassignedCount = 0;
    if (replacement) {
      const target = await labels.findUnique({
        where: { userId_name: { userId, name: replacement } },
      });
      if (!target || replacement === change.name) return { error: "invalid_replacement" } as const;
      const { count } = await tx.subscription.updateMany({ where: match, data: { [field]: replacement } });
      reassignedCount = count;
    } else if (await tx.subscription.count({ where: match })) {
      return { error: "label_in_use" } as const;
    }
    await labels.delete({ where });
    return { label: { name: change.name }, reassignedCount } as const;
  });
}
