import "server-only";
import { createHash } from "node:crypto";

export function hashApiToken(token: string): string {
  return "sha256:" + createHash("sha256").update(token).digest("hex");
}
