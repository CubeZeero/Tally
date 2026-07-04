import type { ComponentType } from "react";
import {
  SquaresFour,
  ListBullets,
  CalendarBlank,
  ChartBar,
  GearSix,
  Info,
} from "@phosphor-icons/react/dist/ssr";

const MAP: Record<string, ComponentType<{ size?: number }>> = {
  dashboard: SquaresFour,
  subscriptions: ListBullets,
  calendar: CalendarBlank,
  stats: ChartBar,
  settings: GearSix,
  about: Info,
};

export function NavGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const IconComp = MAP[name] ?? SquaresFour;
  return <IconComp size={size} />;
}
