interface SidebarCTAProps {
  priceOld?: string;
  priceNew: string;
  affiliateUrl: string;
  product: string;
}

export default function SidebarCTA({
  priceOld,
  priceNew,
  affiliateUrl,
}: SidebarCTAProps) {
  return (
    <div className="sidebar-cta" role="complementary" aria-label="Oferta Especial">
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", opacity: .7, marginBottom: "10px" }}>
        Melhor Preço
      </div>
      {priceOld && <div className="s-price-old">De {priceOld}</div>}
      <div className="s-price">{priceNew}</div>
      <div className="s-badge">Frete Grátis</div>
      <a 
        href={affiliateUrl} 
        className="btn-cta" 
        target="_blank" 
        rel="noopener sponsored nofollow"
      >
        Comprar Agora →
      </a>
      <a 
        href={affiliateUrl} 
        className="btn-cta-outline" 
        target="_blank" 
        rel="noopener sponsored nofollow"
      >
        Ver Oferta
      </a>
      <div className="s-guarantee">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Compra 100% segura
      </div>
    </div>
  );
}
