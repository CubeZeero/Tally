// Runs once when the Next.js server process starts (including the standalone
// production server). Used to launch the built-in notification scheduler so
// users do not need to configure an external cron job.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}
