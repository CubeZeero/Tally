import "server-only";
import type NodemailerType from "nodemailer";

// Load nodemailer via a runtime require hidden from the bundler, so its Node-only
// deps (e.g. 'stream') are never pulled into the webpack graph (incl. instrumentation).
function loadNodemailer(): typeof NodemailerType | null {
  try {
    const req = eval("require") as NodeRequire;
    return req("nodemailer");
  } catch {
    return null;
  }
}

export type SmtpConfig = {
  host: string | null;
  port: number;
  user: string | null;
  pass: string | null;
  from: string | null;
};

type UserSmtp = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  smtpFrom?: string | null;
};

/** Resolve effective SMTP config: per-user settings, falling back to env. */
export function resolveSmtp(user: UserSmtp): SmtpConfig {
  return {
    host: user.smtpHost || process.env.SMTP_HOST || null,
    port: user.smtpHost
      ? user.smtpPort || 587
      : parseInt(process.env.SMTP_PORT ?? "587", 10),
    user: user.smtpHost ? user.smtpUser ?? null : process.env.SMTP_USER ?? null,
    pass: user.smtpHost ? user.smtpPass ?? null : process.env.SMTP_PASS ?? null,
    from: user.smtpHost ? user.smtpFrom ?? null : process.env.SMTP_FROM ?? null,
  };
}

export function isMailConfigured(cfg: SmtpConfig): boolean {
  return Boolean(cfg.host);
}

export async function sendMail(
  cfg: SmtpConfig,
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!cfg.host) return { ok: false, error: "SMTP not configured" };
  const nm = loadNodemailer();
  if (!nm) return { ok: false, error: "mailer unavailable" };
  const transporter = nm.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass ?? undefined } : undefined,
  });
  const from = cfg.from || cfg.user || "tally@localhost";
  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
