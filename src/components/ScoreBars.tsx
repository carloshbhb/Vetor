"use client";

import { useEffect, useRef } from "react";

export type ScoreBarData = {
  label: string;
  score: number;
};

type ScoreBarsProps = {
  bars: ScoreBarData[];
};

function barColor(score: number) {
  if (score >= 8) return "linear-gradient(90deg, #F59E0B, #FCD34D)";
  if (score >= 6) return "linear-gradient(90deg, #3B82F6, #60A5FA)";
  return "linear-gradient(90deg, #8B5CF6, #A78BFA)";
}

export default function ScoreBars({ bars }: ScoreBarsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fills = el.querySelectorAll<HTMLElement>(".score-fill");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fills.forEach((fill, i) => {
              const w = fill.dataset.w;
              if (!w) return;
              setTimeout(() => {
                fill.style.width = w;
              }, 100 + i * 80);
            });
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-4 my-8">
      {bars.map((bar, i) => (
        <div key={bar.label} className="flex flex-col gap-1.5">
          <div className="flex justify-between items-baseline">
            <span className="font-heading text-[0.82rem] font-bold text-text">{bar.label}</span>
            <span className="font-display text-amber" style={{ fontSize: "1.4rem", lineHeight: 1 }}>{bar.score.toFixed(1)}</span>
          </div>
          <div className="h-1.5 rounded bg-white/5 overflow-hidden">
            <div
              className="score-fill h-full rounded-[3px]"
              data-w={`${bar.score * 10}%`}
              style={{
                width: 0,
                background: barColor(bar.score),
                transition: "width 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}