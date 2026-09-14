"use client";

export type ScoreBarData = {
  label: string;
  score: number;
};

type ScoreBarsProps = {
  bars: ScoreBarData[];
};

function barClass(score: number) {
  if (score >= 8) return "excellent";
  if (score >= 6) return "good";
  return "fair";
}

function barColor(score: number) {
  if (score >= 8) return "linear-gradient(90deg, #F59E0B, #FCD34D)";
  if (score >= 6) return "linear-gradient(90deg, #3B82F6, #60A5FA)";
  return "linear-gradient(90deg, #8B5CF6, #A78BFA)";
}

export default function ScoreBars({ bars }: ScoreBarsProps) {
  return (
    <div className="flex flex-col gap-4 my-8">
      {bars.map((bar, i) => (
        <div key={bar.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between items-baseline">
            <span className="font-heading text-[0.82rem] font-bold text-text">{bar.label}</span>
            <span className="font-display text-amber" style={{ fontSize: "1.4rem", lineHeight: 1 }}>{bar.score.toFixed(1)}</span>
          </div>
          <div className="h-1.5 rounded bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-[3px] transition-all duration-1000"
              style={{
                width: `${bar.score * 10}%`,
                background: barColor(bar.score),
                transitionDelay: `${i * 0.12}s`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}