import { z } from "zod";

export const searchFields = {
  activeOnly: z.boolean().optional(),
  q: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(200).optional(),
  paymentMethod: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["active", "paused"]).optional(),
  sort: z.enum(["name", "monthly_cost_asc", "monthly_cost_desc", "next_payment"]).optional(),
  minMonthlyCost: z.number().min(0).optional(),
  maxMonthlyCost: z.number().min(0).optional(),
};
export const searchInput = z.strictObject(searchFields).refine(
  ({ activeOnly, status, minMonthlyCost, maxMonthlyCost }) =>
    !(activeOnly && status === "paused") &&
    (minMonthlyCost ?? 0) <= (maxMonthlyCost ?? Infinity),
);
export type SubscriptionSearch = z.infer<typeof searchInput>;

export const rangeFields = { start: z.iso.date(), end: z.iso.date() };
export const rangeInput = z.strictObject(rangeFields).refine(({ start, end }) => {
  const span = Date.parse(end) - Date.parse(start);
  return span >= 0 && span <= 365 * 86_400_000;
});

export const reminderFields = {
  days: z.number().int().min(0).max(365).optional(),
  kind: z.enum(["trial", "review"]).optional(),
};

export const groupField = z.enum(["category", "paymentMethod"]);
export const labelName = z.string().trim().min(1).max(200);
export const labelCreate = z.strictObject({ name: labelName });
export const labelRename = z.strictObject({ name: labelName });
export const labelDelete = z.strictObject({ replacement: labelName.optional() });
export const labelChange = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), name: labelName }),
  z.strictObject({ action: z.literal("rename"), name: labelName, newName: labelName }),
  z.strictObject({ action: z.literal("delete"), name: labelName, replacement: labelName.optional() }),
]);
export type LabelChange = z.infer<typeof labelChange>;

export const previewFields = {
  format: z.enum(["csv", "json"]),
  content: z.string().max(512_000),
};
export const previewInput = z.strictObject(previewFields);
