import "server-only";
import { prisma } from "./db";

// Load Node's fs/path via a runtime require hidden from the bundler. backup.ts
// is transitively reachable from instrumentation.ts, which Next also compiles
// for the edge runtime where these builtins don't resolve; hiding the require
// keeps that compilation happy while still working at runtime (nodejs only).
type FsPromises = typeof import("fs/promises");
type PathMod = typeof import("path");
function nodeRequire<T>(mod: string): T {
  const req = eval("require") as NodeRequire;
  return req(mod) as T;
}
const { mkdir, readdir, stat, unlink } = nodeRequire<FsPromises>("fs/promises");
const { dirname, join } = nodeRequire<PathMod>("path");

const PREFIX = "tally-";
const SUFFIX = ".db";

/** Resolve the SQLite file path from DATABASE_URL (file:./data/tally.db). */
function dbPath(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  const m = url.match(/^file:(.+)$/);
  if (!m) return null;
  return m[1];
}

/** Directory where timestamped backups are written (alongside the DB, in the volume). */
export function backupDir(): string | null {
  if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
  const db = dbPath();
  return db ? join(dirname(db), "backups") : null;
}

export function backupsEnabled(): boolean {
  return (process.env.BACKUP_ENABLED ?? "true").toLowerCase() !== "false";
}

export function backupIntervalHours(): number {
  const n = parseInt(process.env.BACKUP_INTERVAL_HOURS ?? "24", 10);
  return Number.isFinite(n) && n > 0 ? n : 24;
}

function keepCount(): number {
  const n = parseInt(process.env.BACKUP_KEEP ?? "7", 10);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export type BackupInfo = { name: string; size: number; mtime: number };

/** List existing backups, newest first. */
export async function listBackups(): Promise<BackupInfo[]> {
  const dir = backupDir();
  if (!dir) return [];
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const files = names.filter((n) => n.startsWith(PREFIX) && n.endsWith(SUFFIX));
  const infos: BackupInfo[] = [];
  for (const name of files) {
    try {
      const s = await stat(join(dir, name));
      infos.push({ name, size: s.size, mtime: s.mtimeMs });
    } catch {
      // ignore vanished files
    }
  }
  return infos.sort((a, b) => b.mtime - a.mtime);
}

/**
 * Take a consistent hot backup using SQLite's `VACUUM INTO`, then prune old
 * backups beyond the retention count. Returns the new file name.
 */
export async function runBackup(): Promise<{ ok: boolean; name?: string; error?: string }> {
  const dir = backupDir();
  if (!dir) return { ok: false, error: "no DATABASE_URL file path" };
  try {
    await mkdir(dir, { recursive: true });
    const name = `${PREFIX}${stamp(new Date())}${SUFFIX}`;
    const target = join(dir, name);
    // VACUUM INTO requires the target not to exist; timestamped names avoid clashes.
    await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);

    // Prune oldest beyond the retention count.
    const all = await listBackups();
    const keep = keepCount();
    for (const old of all.slice(keep)) {
      try {
        await unlink(join(dir, old.name));
      } catch {
        // ignore
      }
    }
    return { ok: true, name };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
