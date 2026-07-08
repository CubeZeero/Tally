import "server-only";
import { prisma } from "./db";
import { notifyUpcoming } from "./notify";
import { backupIntervalHours, backupsEnabled, runBackup } from "./backup";

let started = false;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function tick() {
  try {
    const now = new Date();
    const today = localDateString(now);
    const hour = now.getHours();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { notifyEnabled: true },
          { notifyEmailEnabled: true },
          { webhookEnabled: true },
          { slackEnabled: true },
          { ntfyEnabled: true },
        ],
      },
    });
    for (const u of users) {
      if (u.lastNotifiedOn === today) continue;
      if (hour < u.notifyHour) continue;

      const res = await notifyUpcoming(u.id);
      // Mark sent regardless of result so a failing webhook is not retried
      // every minute; the user can re-test from settings.
      await prisma.user.update({
        where: { id: u.id },
        data: { lastNotifiedOn: today },
      });
      if (!res.ok) {
        console.warn(
          `[scheduler] notification failed for ${u.username}:`,
          res.error ?? res.status,
        );
      } else {
        console.log(`[scheduler] daily notification sent to ${u.username}`);
      }
    }
  } catch (e) {
    console.warn("[scheduler] tick error:", e);
  }
}

async function backupTick() {
  try {
    const res = await runBackup();
    if (res.ok) console.log(`[backup] wrote ${res.name}`);
    else console.warn(`[backup] failed: ${res.error}`);
  } catch (e) {
    console.warn("[backup] tick error:", e);
  }
}

/** Starts the daily notification scheduler + periodic backups (idempotent). */
export function startScheduler() {
  if (started) return;
  started = true;
  setInterval(tick, 60_000);
  setTimeout(tick, 8_000);
  console.log("[scheduler] started");

  if (backupsEnabled()) {
    const everyMs = backupIntervalHours() * 60 * 60 * 1000;
    setInterval(backupTick, everyMs);
    setTimeout(backupTick, 20_000); // initial backup shortly after startup
    console.log(`[backup] enabled (every ${backupIntervalHours()}h)`);
  }
}
