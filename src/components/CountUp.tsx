"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";

// useLayoutEffect on the client, useEffect during SSR (avoids the warning).
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Money value that counts up ("slot machine") from 0 to `value` on mount, so it
 * re-animates on every page transition. Renders the final value immediately
 * when animations are disabled (data-anim="off") or reduced motion is set.
 */
export function CountUp({
  value,
  currency,
  className,
}: {
  value: number;
  currency: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  // Decide once, before paint, whether to start from 0 (avoids a final→0 flash).
  useIso(() => {
    if (typeof window === "undefined") return;
    const enabled =
      document.documentElement.dataset.anim !== "off" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (enabled) setDisplay(0);
  }, []);

  useEffect(() => {
    const enabled =
      document.documentElement.dataset.anim !== "off" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!enabled) {
      setDisplay(value);
      return;
    }
    const duration = 900;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span className={className}>{formatMoney(display, currency)}</span>;
}
