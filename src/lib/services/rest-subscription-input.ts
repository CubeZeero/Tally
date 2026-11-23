import { z } from "zod";

const date = z.iso.date();
const shortText = z.string().trim().min(1).max(200);
export const subscriptionInput = z.strictObject({
  name: shortText,
  cost: z.number().min(0).max(1e12),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  cycle: z.enum(["day", "week", "month", "year"]).optional(),
  cycleCount: z.number().int().min(1).max(365).optional(),
  startDate: date.optional(),
  nextBillDate: date.nullable().optional(),
  trialEndDate: date.nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  category: shortText.nullable().optional(),
  paymentMethod: shortText.nullable().optional(),
  url: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
  cancelReminderDays: z.number().int().min(0).max(365).nullable().optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  active: z.boolean().optional(),
  icon: z.string().regex(/^[a-z0-9]+$/).max(100).nullable().optional(),
});

const dateValue = date.transform((value) => new Date(value));
const writeInput = subscriptionInput.extend({
  startDate: dateValue.optional(),
  nextBillDate: dateValue.nullable().optional(),
  trialEndDate: dateValue.nullable().optional(),
});

export const updateSubscriptionInput = subscriptionInput.partial();
export const createInput = writeInput;
export const patchInput = writeInput.partial().refine((value) => Object.keys(value).length > 0);
