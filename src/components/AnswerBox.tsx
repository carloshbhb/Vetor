type AnswerBoxProps = {
  product: string;
  question?: string;
  verdictLabel: string;
  verdictText: string;
  score: number;
  affiliateSlug?: string;
  price?: string;
};

const br = (n: number) => String(n).replace('.', ',');

export default function AnswerBox({ product, question, verdictLabel, verdictText, score, affiliateSlug, price }: AnswerBoxProps) {
  return (
    <div className="answer" id="resposta">
      <h2>Resposta rápida: {question ?? `${product} vale a pena?`}</h2>
      <p>
        <strong>{verdictLabel}</strong>. {verdictText} Nota: <strong>{br(score)}/10</strong>.
        {price && <> Preço consultado: <strong>{price}</strong>.</>}
      </p>
      {affiliateSlug && (
        <a
          className="answer-next"
          href="#onde-comprar"
          data-aff-pos="resposta-rapida"
          aria-label={`Ir para as ofertas de ${product}`}
        >
          Comparar ofertas e lojas →
        </a>
      )}
    </div>
  );
}
