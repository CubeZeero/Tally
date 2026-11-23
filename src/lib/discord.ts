import "server-only";
import { postNotification } from "./channels";

export type Embed = {
  title?: string;
  description?: string;
  color?: number; // decimal RGB
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

export async function sendDiscordEmbed(
  webhookUrl: string,
  embeds: Embed[],
  content?: string,
): Promise<{ ok: boolean; status: number; error?: string }> {
  return postNotification(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Tally", content, embeds }),
  });
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16) || 0xff7a00;
}
