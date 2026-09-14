type ProsConsProps = {
  pros: string[];
  cons: string[];
};

export default function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
      <div className="bg-surface rounded-2xl p-5 border border-border" style={{ borderTop: "3px solid var(--green)" }}>
        <p className="font-heading font-extrabold text-[0.76rem] tracking-wider uppercase mb-3.5 flex items-center gap-1.5" style={{ color: "var(--green)" }}>
          ✓ Pontos Positivos
        </p>
        <ul className="flex flex-col gap-2">
          {pros.map((pro, i) => (
            <li key={i} className="text-[0.86rem] text-[#9AA8C4] font-light leading-relaxed pl-[18px] relative">
              <span className="absolute left-0 top-0 text-[0.75rem] font-bold" style={{ color: "var(--green)" }}>✓</span>
              {pro}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-surface rounded-2xl p-5 border border-border" style={{ borderTop: "3px solid var(--red)" }}>
        <p className="font-heading font-extrabold text-[0.76rem] tracking-wider uppercase mb-3.5 flex items-center gap-1.5" style={{ color: "var(--red)" }}>
          ✗ Pontos Negativos
        </p>
        <ul className="flex flex-col gap-2">
          {cons.map((con, i) => (
            <li key={i} className="text-[0.86rem] text-[#9AA8C4] font-light leading-relaxed pl-[18px] relative">
              <span className="absolute left-0 top-0 text-[0.75rem] font-bold" style={{ color: "var(--red)" }}>✗</span>
              {con}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}