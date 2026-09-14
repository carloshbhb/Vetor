"use client";

type ScoreRingProps = {
  score: number;
  label?: string;
  size?: number;
};

export default function ScoreRing({ score, label, size = 140 }: ScoreRingProps) {
  const clamped = Math.min(10, Math.max(0, score));
  const pct = (clamped / 10) * 100;

  return (
    <div className="inline-flex flex-col items-center gap-2" role="img" aria-label={`${label ? label + ": " : ""}nota ${clamped.toFixed(1)} de 10`}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="w-full h-full rounded-full flex items-center justify-center relative"
          style={{
            background: `conic-gradient(var(--amber) ${pct}%, rgba(255,255,255,0.06) 0%)`,
          }}
        >
          <div
            className="absolute rounded-full bg-surface"
            style={{ inset: 8 }}
          />
          <div className="relative z-10 text-center">
            <span className="font-display text-amber block" style={{ fontSize: size * 0.24, lineHeight: 1 }}>
              {clamped.toFixed(1)}
            </span>
            <span className="font-heading text-muted block" style={{ fontSize: size * 0.046, fontWeight: 700, letterSpacing: "0.08em" }}>
              de 10
            </span>
          </div>
        </div>
      </div>
      {label && (
        <span className="text-sm text-muted text-center leading-tight font-heading font-bold" style={{ fontSize: "0.7rem", letterSpacing: "0.06em" }}>
          {label}
        </span>
      )}
    </div>
  );
}