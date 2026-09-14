type VerdictBoxProps = {
  score: number;
  label: string;
  text: string;
  note?: string;
  affiliateUrl?: string;
};

export default function VerdictBox({ score, label, text, note, affiliateUrl }: VerdictBoxProps) {
  const badgeBg = score >= 8 ? "rgba(16,185,129,0.15)" : score >= 5 ? "rgba(217,119,6,0.15)" : "rgba(220,38,38,0.15)";
  const badgeBorder = score >= 8 ? "rgba(16,185,129,0.4)" : score >= 5 ? "rgba(217,119,6,0.4)" : "rgba(220,38,38,0.4)";
  const badgeColor = score >= 8 ? "#6EE7B7" : score >= 5 ? "#FCD34D" : "#FCA5A5";

  return (
    <section className="bg-ink text-white py-[72px] px-8">
      <div className="max-w-[1100px] mx-auto">
        <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Análise final</span>
        <h2 className="sec-h text-white mb-0" style={{ fontSize: "clamp(2rem,4vw,3.4rem)" }}>Veredicto</h2>
        <div className="grid gap-14 mt-9 items-start" style={{ gridTemplateColumns: "auto 1fr" }}>
          <div className="text-center">
            <span className="font-display text-amber block" style={{ fontSize: "9rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {score.toFixed(1)}
            </span>
            <div
              className="inline-block font-heading font-extrabold text-[0.7rem] tracking-[0.08em] px-4 py-1.5 rounded mt-2"
              style={{ background: badgeBg, border: `1.5px solid ${badgeBorder}`, color: badgeColor }}
            >
              ✓ {label}
            </div>
          </div>
          <div>
            <p className="text-white/65 font-light leading-[1.9] max-w-[620px] mb-7">
              {text}
            </p>
            {note && (
              <p className="text-white/45 text-[0.88rem] font-light leading-[1.8] max-w-[620px] mb-7">
                {note}
              </p>
            )}
            {affiliateUrl && (
              <a
                href={affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2.5 bg-cta text-white font-heading font-extrabold text-[0.9rem] tracking-[0.03em] px-8 py-4 rounded-md transition-colors hover:bg-cta-dk"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                Ver preço e comprar
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
