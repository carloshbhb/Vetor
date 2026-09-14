"use client";

import { useEffect, useRef } from "react";

export type MiniBarData = {
  label: string;
  score: number;
};

type MiniBarsProps = {
  bars: MiniBarData[];
};

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
    <div ref={ref} className="flex flex-col gap-2.5 mb-[22px]">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2.5">
          <span className="font-heading text-[0.7rem] font-bold text-muted whitespace-nowrap min-w-[72px]">{bar.label}</span>
          <div className="flex-1 h-2 bg-border rounded overflow-hidden">
            <div
              className="mini-bar-fill h-full rounded"
              data-w={`${bar.score * 10}%`}
              style={{
                background: bar.score >= 8 ? "var(--green)" : bar.score >= 5 ? "var(--amber)" : "var(--blue)",
                transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <span className="font-heading text-[0.72rem] font-bold min-w-[24px] text-right text-ink">
            {bar.score.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}
