import "server-only";
import { APP_VERSION } from "./version";

// Update check: compares the running version against the latest git tag on
// GitHub (we push tags like v1.0.0). No GitHub Release needed. Result is cached
// for 6h via the Next data cache, so at most one API call per 6h per instance.
const REPO = "CubeZeero/Tally";
const TAGS_URL = `https://api.github.com/repos/${REPO}/tags?per_page=100`;
const REVALIDATE = 60 * 60 * 6; // 6 hours
export const UPDATE_TAG = "update-check"; // cache tag for revalidateTag

export type UpdateInfo = {
  current: string; // e.g. "1.0.0"
  latest: string | null; // e.g. "1.1.0" (null if unknown / disabled)
  updateAvailable: boolean;
};

function parseVersion(value: string) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim());
  if (!match) return null;
  return { numbers: match.slice(1, 4).map(Number), prerelease: Boolean(match[4]) };
}

function isNewerStable(candidate: string, current: string): boolean {
  const stable = parseVersion(candidate);
  const installed = parseVersion(current);
  if (!stable || stable.prerelease || !installed) return false;
  for (let i = 0; i < stable.numbers.length; i++) {
    if (stable.numbers[i] !== installed.numbers[i]) {
      return stable.numbers[i] > installed.numbers[i];
    }
  }
  return installed.prerelease;
}

/** Self-hosters can disable the check entirely with UPDATE_CHECK=0. */
export function updateCheckEnabled(): boolean {
  const v = (process.env.UPDATE_CHECK ?? "").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

async function getLatestVersion(force = false): Promise<string | null> {
  if (!updateCheckEnabled()) return null;
  try {
    const res = await fetch(TAGS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "tally-update-check",
      },
      // Manual check bypasses the cache; automatic check is cached for 6h and
      // tagged so a manual check can refresh it for everyone (revalidateTag).
      ...(force
        ? { cache: "no-store" as const }
        : { next: { revalidate: REVALIDATE, tags: [UPDATE_TAG] } }),
    });
    if (!res.ok) return null;
    const tags = (await res.json()) as { name?: string }[];
    let latest: string | null = null;
    for (const t of tags) {
      if (!t.name || parseVersion(t.name)?.prerelease !== false) continue;
      if (!latest || isNewerStable(t.name, latest)) latest = t.name;
    }
    return latest ? latest.replace(/^v/, "") : null;
  } catch {
    return null; // network / rate-limit — silently no update
  }
}

export async function getUpdateInfo(force = false): Promise<UpdateInfo> {
  const latest = await getLatestVersion(force);
  return {
    current: APP_VERSION,
    latest,
    updateAvailable: !!latest && isNewerStable(latest, APP_VERSION),
  };
}
