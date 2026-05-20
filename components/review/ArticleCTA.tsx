interface ArticleCTAProps {
  priceOld?: string;
  priceNew: string;
  affiliateUrl: string;
  product: string;
  eyebrow?: string;
  title?: string;
}

export default function ArticleCTA({
  priceOld,
  priceNew,
  affiliateUrl,
  product,
  eyebrow = 'Oferta Atual',
  title = `COMPRAR ${product.toUpperCase()}`,
}: ArticleCTAProps) {
  return (
    <div className="article-cta">
      <div className="cta-eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
      <p className="price-line">
        {priceOld && <span>De <s>{priceOld}</s> por apenas </span>}
        <strong>{priceNew}</strong>
      </p>
      <a
        href={affiliateUrl}
        className="btn-white"
        target="_blank"
        rel="noopener sponsored nofollow"
      >
        Ver Oferta no Mercado Livre →
      </a>
      <p className="cta-note">✓ Compra segura · Frete grátis · Parcele em 12x</p>
    </div>
  );
}
