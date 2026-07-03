import "server-only";

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
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Tally",
        content: content ?? undefined,
        embeds,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16) || 0xff7a00;
}
