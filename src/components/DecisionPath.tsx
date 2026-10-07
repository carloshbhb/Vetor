import Link from 'next/link';

export type DecisionPathItem = {
  href: string;
  label: string;
  title: string;
  description: string;
  external?: boolean;
};

export default function DecisionPath({
  product,
  items,
}: {
  product: string;
  items: DecisionPathItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="decision-path" aria-labelledby="decision-path-heading">
      <div className="section-kicker">Próximo passo</div>
      <h2 id="decision-path-heading">Escolha o próximo passo para decidir sobre {product}</h2>
      <p>Em vez de terminar no review, o Vetor conecta a análise à próxima decisão que você precisa tomar.</p>

      <div className="decision-path-grid">
        {items.slice(0, 3).map((item) =>
          item.external ? (
            <a
              key={item.href}
              className="decision-path-card"
              href={item.href}
              target="_blank"
              rel="noopener"
            >
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              <b>Continuar →</b>
            </a>
          ) : (
            <Link key={item.href} className="decision-path-card" href={item.href}>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
              <b>Continuar →</b>
            </Link>
          )
        )}
      </div>
    </section>
  );
}
