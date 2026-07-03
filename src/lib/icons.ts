import "server-only";
import * as simpleIcons from "simple-icons";

export type Icon = { title: string; slug: string; hex: string; path: string };

// Build the slug -> icon map once per server process.
const ICONS: Map<string, Icon> = (() => {
  const map = new Map<string, Icon>();
  for (const v of Object.values(simpleIcons)) {
    const icon = v as Partial<Icon>;
    if (icon && icon.slug && icon.path) {
      map.set(icon.slug, {
        title: icon.title ?? icon.slug,
        slug: icon.slug,
        hex: icon.hex ?? "000000",
        path: icon.path,
      });
    }
  }
  return map;
})();

export function getIcon(slug?: string | null): Icon | null {
  if (!slug) return null;
  return ICONS.get(slug.toLowerCase()) ?? null;
}

/** Returns a complete <svg> string for the given slug, or null. */
export function iconSvg(slug?: string | null, color?: string): string | null {
  const icon = getIcon(slug);
  if (!icon) return null;
  const fill = color ?? `#${icon.hex}`;
  return `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${fill}"><title>${icon.title}</title><path d="${icon.path}"/></svg>`;
}

/** Lightweight search for the icon picker (returns up to `limit` matches). */
export function searchIcons(query: string, limit = 24): Icon[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: Icon[] = [];
  for (const icon of ICONS.values()) {
    if (icon.slug.includes(q) || icon.title.toLowerCase().includes(q)) {
      out.push(icon);
      if (out.length >= limit) break;
    }
  }
  return out;
}
