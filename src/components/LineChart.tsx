export type Point = { label: string; value: number };

/** Simple responsive line+area chart drawn as inline SVG. */
export function LineChart({
  points,
}: {
  points: Point[];
  /** kept for API compatibility; the chart now scales to its container */
  height?: number;
  format?: (v: number) => string;
}) {
  // Fixed internal coordinate space; the SVG scales uniformly to its container.
  // A moderately wide aspect + larger label font keeps month labels legible.
  // On phones the chart keeps a minimum width and scrolls horizontally so the
  // months stay readable instead of shrinking to a few pixels.
  const W = 1000;
  const H = 220;
  const padX = 16;
  const padTop = 18;
  const padBottom = 42;

  const max = Math.max(1, ...points.map((p) => p.value));
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const x = (i: number) =>
    points.length <= 1 ? padX : padX + (i / (points.length - 1)) * innerW;
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${padX},${padTop + innerH} ${line} ${padX + innerW},${padTop + innerH}`;

  return (
    <div className="overflow-x-auto sm:overflow-visible">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        className="min-w-[560px] sm:min-w-0"
        style={{
          width: "100%",
          height: "auto",
          maxHeight: "300px",
          display: "block",
        }}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <polygon points={area} fill="url(#lc-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r="3" fill="var(--color-accent)" />
            <text
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize="18"
              fill="var(--color-ink-soft)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
