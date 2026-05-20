interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export default function ProsConsGrid({ pros, cons }: ProsConsProps) {
  return (
    <div className="pros-cons">
      <div className="pros-box" role="region" aria-label="Pontos positivos">
        <h4>✓ Prós</h4>
        <ul>
          {pros.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="cons-box" role="region" aria-label="Pontos negativos">
        <h4>× Contras</h4>
        <ul>
          {cons.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
