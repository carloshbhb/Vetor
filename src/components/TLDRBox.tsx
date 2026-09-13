import ScoreBadge from "./ScoreBadge";

interface TLDRBoxProps {
  score: number;
  price: string;
  forWhom: string;
  notForWhom: string;
  verdict: string;
  pros: string[];
  cons: string[];
}

export default function TLDRBox({
  score,
  price,
  forWhom,
  notForWhom,
  verdict,
  pros,
  cons,
}: TLDRBoxProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--surface)] overflow-hidden">
      <div className="bg-[var(--surface2)] px-6 py-4 border-b border-white/8">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <svg className="w-5 h-5 text-[var(--blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          TL;DR — Resumo Rápido
        </h2>
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 pb-6 border-b border-white/8">
          <ScoreBadge score={score} size="lg" />
          <div className="text-center sm:text-left">
            <div className="text-2xl font-bold text-[var(--green)]">{price}</div>
            <p className="text-sm text-[var(--muted)] mt-1 max-w-md">{verdict}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--green)]/5 border border-[var(--green)]/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--green)] mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Para quem é
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{forWhom}</p>
          </div>
          <div className="bg-[var(--red)]/5 border border-[var(--red)]/20 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--red)] mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Evite se
            </h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{notForWhom}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pros.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--green)] mb-2">Pros</h3>
              <ul className="space-y-1.5">
                {pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted)]">
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
            <div>
              <h3 className="text-sm font-semibold text-[var(--red)] mb-2">Contras</h3>
              <ul className="space-y-1.5">
                {cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted)]">
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
      </div>
    </div>
  );
}
