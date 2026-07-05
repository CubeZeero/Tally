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

type Transporter = ReturnType<typeof NodemailerType.createTransport>;
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }
  const nm = loadNodemailer();
  if (!nm) {
    transporter = null;
    return null;
  }
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  transporter = nm.createTransport({
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
