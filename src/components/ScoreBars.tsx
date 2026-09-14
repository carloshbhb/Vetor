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
  if (score >= 8) return "linear-gradient(90deg, #10B981, #34D399)";
  if (score >= 5) return "linear-gradient(90deg, #D97706, #FCD34D)";
  return "linear-gradient(90deg, #3B82F6, #60A5FA)";
}

function barClass(score: number) {
  if (score >= 8) return "great";
  if (score >= 5) return "good";
  return "ok";
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
    <div ref={ref} className="flex flex-col gap-5 my-8">
      {bars.map((bar) => (
        <div key={bar.label} className="grid items-center gap-4" style={{ gridTemplateColumns: "160px 1fr 48px" }}>
          <span className="font-heading text-[0.8rem] font-bold text-white/70">{bar.label}</span>
          <div className="h-2 bg-white/[0.08] rounded overflow-hidden">
            <div
              className={`score-fill h-full rounded ${barClass(bar.score)}`}
              data-w={`${bar.score * 10}%`}
              style={{
                width: 0,
                background: barColor(bar.score),
                transition: "width 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <span className="font-display text-[1.6rem] text-white text-right">{bar.score.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
