import "server-only";

const builtInOrigins = new Set([
  "https://discord.com",
  "https://discordapp.com",
  "https://hooks.slack.com",
  "https://ntfy.sh",
]);

function allowlist(name: string): Set<string> {
  return new Set((process.env[name] ?? "").split(",").map((item) => item.trim()).filter(Boolean));
}

export function allowedNotificationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.hash) return false;
    return builtInOrigins.has(url.origin) || allowlist("TALLY_NOTIFICATION_ORIGINS").has(url.origin);
  } catch {
    return false;
  }
}

export function allowedUserSmtp(host: string, port: number): boolean {
  return allowlist("TALLY_SMTP_DESTINATIONS").has(`${host.toLowerCase()}:${port}`);
}
