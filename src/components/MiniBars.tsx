"use client";

export type MiniBarData = {
  label: string;
  score: number;
};

type MiniBarsProps = {
  bars: MiniBarData[];
};

function barColor(score: number) {
  if (score >= 8) return "var(--amber)";
  if (score >= 6) return "var(--blue)";
  return "var(--purple)";
}

export default function MiniBars({ bars }: MiniBarsProps) {
  return (
    <div className="flex flex-col gap-2.5 mb-5">
      {bars.map((bar, i) => (
        <div key={bar.label} className="flex items-center gap-2.5">
          <span className="font-heading text-[0.7rem] font-bold text-muted whitespace-nowrap min-w-[88px]">{bar.label}</span>
          <div className="flex-1 h-1 bg-white/[0.06] rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-1000"
              style={{
                width: `${bar.score * 10}%`,
                background: barColor(bar.score),
                transitionDelay: `${i * 0.12}s`,
              }}
            />
          </div>
          <span className="font-heading text-[0.72rem] font-bold min-w-[24px] text-right" style={{ color: barColor(bar.score) }}>
            {bar.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}