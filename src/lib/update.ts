import "server-only";
import { APP_VERSION } from "./version";

// Update check: compares the running version against the latest git tag on
// GitHub (we push tags like v1.0.0). No GitHub Release needed. Result is cached
// for 6h via the Next data cache, so at most one API call per 6h per instance.
const REPO = "CubeZeero/Tally";
const TAGS_URL = `https://api.github.com/repos/${REPO}/tags?per_page=100`;
const REVALIDATE = 60 * 60 * 6; // 6 hours

export type UpdateInfo = {
  current: string; // e.g. "1.0.0"
  latest: string | null; // e.g. "1.1.0" (null if unknown / disabled)
  updateAvailable: boolean;
};

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Returns > 0 if a is newer than b, < 0 if older, 0 if equal/unparseable. */
function compare(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Self-hosters can disable the check entirely with UPDATE_CHECK=0. */
export function updateCheckEnabled(): boolean {
  const v = (process.env.UPDATE_CHECK ?? "").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

async function getLatestVersion(): Promise<string | null> {
  if (!updateCheckEnabled()) return null;
  try {
    const res = await fetch(TAGS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "tally-update-check",
      },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const tags = (await res.json()) as { name?: string }[];
    let latest: string | null = null;
    for (const t of tags) {
      if (!t.name || !parseSemver(t.name)) continue;
      if (!latest || compare(t.name, latest) > 0) latest = t.name;
    }
    return latest ? latest.replace(/^v/, "") : null;
  } catch {
    return null; // network / rate-limit — silently no update
  }
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
  const latest = await getLatestVersion();
  return {
    current: APP_VERSION,
    latest,
    updateAvailable: !!latest && compare(latest, APP_VERSION) > 0,
  };
}
