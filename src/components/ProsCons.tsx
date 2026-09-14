type ProsConsProps = {
  pros: string[];
  cons: string[];
};

export default function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      <div className="rounded-[10px] p-7" style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0" }}>
        <p className="font-heading font-extrabold text-[0.8rem] tracking-[0.06em] mb-4 flex items-center gap-2" style={{ color: "#15803D" }}>
          ✓ &nbsp;Pontos Positivos
        </p>
        <ul className="flex flex-col gap-2.5">
          {pros.map((pro, i) => (
            <li key={i} className="text-[0.9rem] text-body font-light leading-[1.5] pl-[22px] relative">
              <span className="absolute left-0 top-0 font-bold text-[0.85rem]" style={{ color: "#16A34A" }}>✓</span>
              {pro}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[10px] p-7" style={{ background: "#FFF1F2", border: "1.5px solid #FECDD3" }}>
        <p className="font-heading font-extrabold text-[0.8rem] tracking-[0.06em] mb-4 flex items-center gap-2" style={{ color: "#BE123C" }}>
          ✗ &nbsp;Pontos Negativos
        </p>
        <ul className="flex flex-col gap-2.5">
          {cons.map((con, i) => (
            <li key={i} className="text-[0.9rem] text-body font-light leading-[1.5] pl-[22px] relative">
              <span className="absolute left-0 top-0 font-bold text-[0.85rem]" style={{ color: "#DC2626" }}>✗</span>
              {con}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
