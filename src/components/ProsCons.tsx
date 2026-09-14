type ProsConsProps = {
  pros: string[];
  cons: string[];
};

export default function ProsCons({ pros, cons }: ProsConsProps) {
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <div className="proscons-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 36 }}>
      {pros.length > 0 && (
        <div className="pc-box pros" style={{ borderRadius: 10, padding: 28, background: "#F0FDF4", border: "1.5px solid #BBF7D0" }}>
          <div className="pc-head" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.06em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#15803D" }}>
            ✓ &nbsp;Pontos Positivos
          </div>
          <ul className="pc-list" style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {pros.map((pro, i) => (
              <li key={i} style={{ fontSize: "0.9rem", color: "var(--body)", fontWeight: 300, lineHeight: 1.5, paddingLeft: 22, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, fontWeight: 700, fontSize: "0.85rem", color: "#16A34A" }}>✓</span>
                {pro}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div className="pc-box cons" style={{ borderRadius: 10, padding: 28, background: "#FFF1F2", border: "1.5px solid #FECDD3" }}>
          <div className="pc-head" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.06em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#BE123C" }}>
            ✗ &nbsp;Pontos Negativos
          </div>
          <ul className="pc-list" style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {cons.map((con, i) => (
              <li key={i} style={{ fontSize: "0.9rem", color: "var(--body)", fontWeight: 300, lineHeight: 1.5, paddingLeft: 22, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, fontWeight: 700, fontSize: "0.85rem", color: "#DC2626" }}>✗</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
