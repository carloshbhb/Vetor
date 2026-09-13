"use client";

import { useEffect, useState } from "react";

interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export default function ProsCons({ pros, cons }: ProsConsProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {pros.length > 0 && (
        <div
          className={`bg-[var(--green)]/5 border border-[var(--green)]/20 rounded-xl p-5 transition-all duration-500 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h3 className="text-base font-bold text-[var(--green)] mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Vantagens
          </h3>
          <ul className="space-y-2">
            {pros.map((pro, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 text-sm text-[var(--muted)] transition-all duration-500 ${
                  visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <svg className="w-4 h-4 mt-0.5 text-[var(--green)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {pro}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cons.length > 0 && (
        <div
          className={`bg-[var(--red)]/5 border border-[var(--red)]/20 rounded-xl p-5 transition-all duration-500 delay-150 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h3 className="text-base font-bold text-[var(--red)] mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Desvantagens
          </h3>
          <ul className="space-y-2">
            {cons.map((con, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 text-sm text-[var(--muted)] transition-all duration-500 ${
                  visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                }`}
                style={{ transitionDelay: `${i * 80 + 150}ms` }}
              >
                <svg className="w-4 h-4 mt-0.5 text-[var(--red)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {con}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
