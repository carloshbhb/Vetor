interface VerdictBoxProps {
  score: number;
  label: string;
  text: string;
  note?: string;
  affiliateUrl: string;
  priceNew: string;
  isComparativo?: boolean;
  winnerName?: string;
}

export default function VerdictBox({
  score,
  label,
  text,
  note,
  affiliateUrl,
  priceNew,
  isComparativo,
  winnerName,
}: VerdictBoxProps) {
  return (
    <div className="verdict-box">
      {isComparativo && winnerName && (
        <div className="verdict-winner-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15l-3 3 1-4-3-2h4L12 8l1 4h4l-3 2 1 4z" />
          </svg>
          <span>Vencedor: {winnerName}</span>
        </div>
      )}
      <div className="verdict-label">Nota Vetor Blog</div>
      <div className="verdict-score">{score.toFixed(1)}<sup>/10</sup></div>
      <h3>{label}</h3>
      <p>{text}</p>
      {affiliateUrl && (
        <div className="verdict-cta-wrapper">
          <a
            href={affiliateUrl}
            className="btn-white"
            target="_blank"
            rel="noopener sponsored nofollow"
          >
            {isComparativo ? `Comprar ${winnerName || 'Produto'} (${priceNew || 'Oferta'}) →` : `Ver Preço de Hoje (${priceNew || 'Oferta'}) →`}
          </a>
          <p className="verdict-affiliate-note">
            Link de afiliado — ao comprar por aqui, você apoia o Vetor Blog sem custo adicional.
          </p>
        </div>
      )}
      {note && <p className="verdict-note">★ {note}</p>}
    </div>
  );
}
