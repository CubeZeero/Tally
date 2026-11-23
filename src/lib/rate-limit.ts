import "server-only";

const windowMs = 60_000;
let resetAt = 0;
const counts = new Map<string, number>();

/** Per-process fixed window, bounded even when request identifiers vary. */
export function allowRequest(bucket: string, limit: number): boolean {
  const now = Date.now();
  if (now >= resetAt) {
    resetAt = now + windowMs;
    counts.clear();
  }
  const count = counts.get(bucket) ?? 0;
  if ((!count && counts.size >= 4096) || count >= limit) return false;
  counts.set(bucket, count + 1);
  return true;
}
