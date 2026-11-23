import "server-only";
import { revalidatePath } from "next/cache";

export type ActionState =
  | { error?: string; ok?: boolean; count?: number }
  | undefined;

export function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/subscriptions");
  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/stats");
}
