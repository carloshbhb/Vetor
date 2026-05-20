interface VerdictBoxProps {
  score: number;
  label: string;
  text: string;
  note?: string;
  affiliateUrl: string;
  priceNew: string;
}

export default function VerdictBox({
  score,
  label,
  text,
  note,
  affiliateUrl,
  priceNew,
}: VerdictBoxProps) {
  return (
    <div className="verdict-box">
      <div className="verdict-label">Nota Vetor Blog</div>
      <div className="verdict-score">{score.toFixed(1)}<sup>/10</sup></div>
      <h3>{label}</h3>
      <p>{text}</p>
      {affiliateUrl && (
        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <a
            href={affiliateUrl}
            className="btn-white"
            target="_blank"
            rel="noopener sponsored nofollow"
          >
            Ver Preço de Hoje ({priceNew || 'Oferta'}) →
          </a>
        </div>
      )}
      {note && <p className="verdict-note">★ {note}</p>}
    </div>
  );
}
