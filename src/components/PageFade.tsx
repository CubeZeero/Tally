"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades the main content in on each route change (re-keyed by pathname).
 *
 * Whether to fade is decided per navigation via the `fade` prop (read from the
 * cookie on the server), NOT a live attribute — so flipping the preference in
 * settings never re-runs the animation on the page that's currently on screen.
 * The animation itself is still gated by prefers-reduced-motion in CSS.
 */
export function PageFade({
  children,
  fade,
}: {
  children: ReactNode;
  fade: boolean;
}) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={fade ? "page-fade" : undefined}>
      {children}
    </div>
  );
}
