export type Slice = { label: string; value: number; color: string };

function polar(cx: number, cy: number, r: number, frac: number) {
  const a = 2 * Math.PI * frac - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Donut chart. Renders nothing meaningful when total is 0. */
export function PieChart({
  data,
  size = 168,
  thickness = 26,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - thickness / 2;

  let acc = 0;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = acc / total;
      acc += d.value;
      const end = acc / total;
      const [x1, y1] = polar(cx, cy, r, start);
      const [x2, y2] = polar(cx, cy, r, end);
      const large = end - start > 0.5 ? 1 : 0;
      // Full circle needs a tiny nudge to avoid the path collapsing.
      const sweep = end - start >= 0.9999 ? 0.9999 : end - start;
      const [ex, ey] = polar(cx, cy, r, start + sweep);
      return {
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${end - start >= 0.9999 ? ex : x2} ${end - start >= 0.9999 ? ey : y2}`,
        color: d.color,
      };
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={thickness}
      />
      {total > 0 &&
        arcs.map((a, i) => (
          <path
            key={i}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
          />
        ))}
    </svg>
  );
}
