import Image from "next/image";
import Link from "next/link";
import { getProductLinkBySlug } from "@/lib/product-links";

const PRODUCT_LINK_SLUG = "8bitdo-ultimate-2c-controle-gamepad";
const EDITORIAL_REVIEW_URL = "/reviews/8bitdo-ultimate-2c-controle-gamepad/";

function formatPrice(price: number | null | undefined): string | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

export default async function CommercialLandingPage() {
  const product = await getProductLinkBySlug(PRODUCT_LINK_SLUG);
  const purchaseUrl = product?.affiliate_url || product?.product_url || "https://meli.la/2XeTKW8";
  const imageUrl = product?.image_url || "https://http2.mlstatic.com/D_NQ_NP_693701-MLU75102925193_032024-O.webp";
  const productName = product?.product_name || "Controle 8BitDo Ultimate 2C";
  const price = formatPrice(product?.price);

  return (
    <main className="container" style={{ paddingTop: 28, paddingBottom: 64 }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 14, marginBottom: 24 }}>
        <Link href="/">Início</Link> <span aria-hidden="true">/</span>{" "}
        <Link href="/reviews/">Reviews</Link> <span aria-hidden="true">/</span>{" "}
        <span>{productName}</span>
      </nav>

      <section className="hero" aria-labelledby="commercial-landing-title">
        <div className="hero-grid" style={{ alignItems: "center" }}>
          <div>
            <p className="verdict-label">GUIA DE COMPRA · CONTROLES PARA GAMES</p>
            <h1 id="commercial-landing-title">{productName}: ofertas e onde comprar</h1>
            <p className="hero-lead">
              Encontre a oferta disponível e confira nossa análise editorial antes de decidir.
              Compare o preço final, a versão do controle, o prazo de entrega e as condições do vendedor.
            </p>
            {price && (
              <p className="price-line">
                <span>Preço consultado</span>
                <strong>{price}</strong>
              </p>
            )}
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              O preço e a disponibilidade podem mudar conforme a loja e o momento da consulta.
            </p>
            <a className="cta cta--primary-buy" href={purchaseUrl} target="_blank" rel="sponsored nofollow noopener" data-aff-pos="commercial-landing-hero">
              Conferir oferta no Mercado Livre →
            </a>
            <p style={{ marginTop: 14 }}>
              <Link href={EDITORIAL_REVIEW_URL}>Ler o review editorial completo →</Link>
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
            <Image
              src={imageUrl}
              alt={productName}
              width={520}
              height={420}
              priority
              unoptimized
              style={{ width: "100%", maxWidth: 420, height: "auto", objectFit: "contain", borderRadius: 16 }}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="buying-checklist" style={{ marginTop: 36 }}>
        <h2 id="buying-checklist">O que conferir antes de comprar</h2>
        <div className="buying-choice-grid">
          <article className="buying-choice">
            <h3>Versão correta</h3>
            <p>Confira se o anúncio corresponde à versão e à plataforma que você pretende usar.</p>
          </article>
          <article className="buying-choice">
            <h3>Preço final</h3>
            <p>Considere frete, prazo de entrega e eventuais descontos exibidos no checkout.</p>
          </article>
          <article className="buying-choice">
            <h3>Vendedor e condições</h3>
            <p>Verifique reputação do vendedor, garantia, política de devolução e conteúdo da embalagem.</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>Vale a pena escolher o 8BitDo Ultimate 2C?</h2>
        <p>
          A decisão depende da compatibilidade, dos recursos da versão anunciada e do preço encontrado.
          Use a análise editorial para entender os pontos fortes, limitações e perfil de jogador indicado,
          e só então compare a oferta com alternativas.
        </p>
        <p><Link className="answer-next" href={EDITORIAL_REVIEW_URL}>Ver análise, prós e contras →</Link></p>
      </section>

      <aside aria-label="Aviso de afiliados" style={{ marginTop: 36, fontSize: 13, opacity: 0.8 }}>
        O Vetor.blog pode receber comissão por compras feitas por links de afiliados, sem custo adicional
        para você. Isso não altera nossa análise editorial.
      </aside>
    </main>
  );
}
