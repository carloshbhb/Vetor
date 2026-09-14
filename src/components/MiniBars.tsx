"use client";

import { useEffect, useRef } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fills = el.querySelectorAll<HTMLElement>(".mini-bar-fill");
    fills.forEach((fill, i) => {
      const w = fill.dataset.w;
      if (!w) return;
      fill.style.width = "0";
      setTimeout(() => {
        fill.style.width = w;
      }, 100 + i * 80);
    });
  }, []);

  return (
    <div ref={ref} className="flex flex-col gap-2.5 mb-5">
      {bars.map((bar, i) => (
        <div key={bar.label} className="flex items-center gap-2.5">
          <span className="font-heading text-[0.7rem] font-bold text-muted whitespace-nowrap min-w-[88px]">{bar.label}</span>
          <div className="flex-1 h-1 bg-white/[0.06] rounded overflow-hidden">
            <div
              className="mini-bar-fill h-full rounded transition-all duration-1000"
              data-w={`${bar.score * 10}%`}
              style={{
                background: barColor(bar.score),
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