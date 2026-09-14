"use client";

type ScoreDialProps = {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_MAP = {
  sm: { box: 72, stroke: 5, text: "text-lg" },
  md: { box: 112, stroke: 6, text: "text-2xl" },
  lg: { box: 168, stroke: 8, text: "text-4xl" },
} as const;

function scoreColor(score: number) {
  if (score >= 8) return "var(--color-pine)";
  if (score >= 5) return "var(--color-brass)";
  return "var(--color-clay)";
}

export function ScoreDial({ score, label, size = "md" }: ScoreDialProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const { box, stroke, text } = SIZE_MAP[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75;
  const sweep = circumference * arcFraction;
  const filled = sweep * (clamped / 10);
  const color = scoreColor(clamped);

  return (
    <div
      className="inline-flex flex-col items-center gap-2"
      role="img"
      aria-label={`${label ? label + ": " : ""}nota ${clamped.toFixed(1)} de 10`}
    >
      <div className="relative" style={{ width: box, height: box }}>
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          className="-rotate-[225deg]"
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={stroke}
            strokeDasharray={`${sweep} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 500ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-display font-semibold tabular-nums ${text}`}
            style={{ color }}
          >
            {clamped.toFixed(1)}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-sm text-ink-soft text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}