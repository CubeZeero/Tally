import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  return transporter;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<{ ok: boolean; error?: string }> {
  const tp = getTransporter();
  if (!tp) return { ok: false, error: "SMTP not configured" };
  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "tally@localhost";
  try {
    await tp.sendMail({ from, to, subject, text, html });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
