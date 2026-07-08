import "server-only";

export type SendResult = { ok: boolean; status: number; error?: string };

/**
 * Accepts any well-formed http(s) URL. Self-hosted destinations on the LAN are
 * a legitimate use case here (n8n, ntfy, Gotify …), so private addresses are
 * intentionally allowed — each user configures their own destination.
 */
export function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const SLACK_HOSTS = new Set(["hooks.slack.com"]);

/** Only allow real Slack incoming-webhook URLs. */
export function isSlackWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      SLACK_HOSTS.has(u.hostname.toLowerCase()) &&
      u.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}

async function post(url: string, init: RequestInit): Promise<SendResult> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text.slice(0, 300) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e) };
  }
}

/** Generic webhook: POST a structured JSON payload for automation platforms. */
export async function sendGenericWebhook(
  url: string,
  payload: unknown,
): Promise<SendResult> {
  if (!isHttpUrl(url)) return { ok: false, status: 0, error: "invalid URL" };
  return post(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Slack incoming webhook: a header + a bulleted section. */
export async function sendSlack(
  url: string,
  title: string,
  lines: string[],
): Promise<SendResult> {
  if (!isSlackWebhook(url)) {
    return { ok: false, status: 0, error: "invalid Slack webhook URL" };
  }
  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: title.slice(0, 150) } },
  ];
  if (lines.length) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines.map((l) => `• ${l}`).join("\n") },
    });
  }
  return post(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: title, blocks }),
  });
}

/**
 * ntfy: publish via the JSON format posted to the server root, so UTF-8 titles
 * and messages are handled correctly (unlike the ASCII-only Title header).
 * The topic is taken from the last path segment of the given topic URL.
 */
export async function sendNtfy(
  topicUrl: string,
  token: string | null,
  title: string,
  message: string,
): Promise<SendResult> {
  if (!isHttpUrl(topicUrl)) {
    return { ok: false, status: 0, error: "invalid ntfy URL" };
  }
  let base: string;
  let topic: string;
  try {
    const u = new URL(topicUrl);
    const segs = u.pathname.split("/").filter(Boolean);
    topic = segs.pop() ?? "";
    base = `${u.origin}${segs.length ? "/" + segs.join("/") : ""}`;
  } catch {
    return { ok: false, status: 0, error: "invalid ntfy URL" };
  }
  if (!topic) return { ok: false, status: 0, error: "ntfy topic missing" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return post(base, {
    method: "POST",
    headers,
    body: JSON.stringify({ topic, title, message, tags: ["bell"] }),
  });
}
