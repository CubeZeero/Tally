"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades the main content in on each route change (re-keyed by pathname).
 * Gated in CSS by data-anim="on" + prefers-reduced-motion, so it's instant
 * when animations are disabled.
 */
export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}
