type ProsConsProps = {
  pros: string[];
  cons: string[];
};

export default function ProsCons({ pros, cons }: ProsConsProps) {
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <div className="quick-summary">
      {pros.length > 0 && (
        <div className="pros">
          <h3>✓ Pontos positivos</h3>
          <ul>
            {pros.map((pro, i) => (
              <li key={i}>{pro}</li>
            ))}
          </ul>
        </div>
      )}

      {cons.length > 0 && (
        <div className="cons">
          <h3>✕ Pontos negativos</h3>
          <ul>
            {cons.map((con, i) => (
              <li key={i}>{con}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
