type AnswerBoxProps = {
  product: string;
  question?: string;
  verdictLabel: string;
  verdictText: string;
  score: number;
  affiliateSlug?: string;
};

const br = (n: number) => String(n).replace('.', ',');

export default function AnswerBox({ product, question, verdictLabel, verdictText, score, affiliateSlug }: AnswerBoxProps) {
  return (
    <div className="answer" id="resposta">
      <h2>Resposta rápida: {question ?? `${product} vale a pena?`}</h2>
      <p>
        <strong>{verdictLabel}</strong>. {verdictText} Nota: <strong>{br(score)}/10</strong>.
      </p>
      {affiliateSlug && (
        <a
          className="cta"
          href={`/go/${affiliateSlug}/`}
          data-aff-pos="resposta-rapida"
          target="_blank"
          rel="sponsored nofollow noopener"
        >
          Ver preço atualizado
        </a>
      )}
    </div>
  );
}
