import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import SafeImage from "@/components/SafeImage";
import { getAllProductLinks, type ProductLink } from "@/lib/product-links";
import { safeImageSrc } from "@/lib/images";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ofertas: preços e disponibilidade",
  description:
    "Ofertas acompanhadas pelo Vetor.blog, com preço, loja e link para o review completo quando existir.",
  alternates: { canonical: "https://www.vetor.blog/ofertas/" },
  openGraph: {
    title: "Ofertas: preços e disponibilidade",
    description: "Preços acompanhados pelo Vetor.blog.",
    url: "https://www.vetor.blog/ofertas/",
    type: "website",
    images: ["https://www.vetor.blog/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

function brl(price: number | null): string | null {
  if (price === null || price === undefined) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OfferCard({ offer }: { offer: ProductLink }) {
  const price = brl(offer.price);
  return (
    <article className="offer-card">
      <div className="offer-card-media">
        <SafeImage
          src={safeImageSrc(offer.image_url)}
          width={600}
          height={400}
          alt={offer.product_name}
          loading="lazy"
          sizes="(max-width: 720px) 100vw, 33vw"
        />
        <span className="offer-card-badge">{offer.category || offer.marketplace}</span>
      </div>
      <div className="offer-card-body">
        <h2>{offer.product_name}</h2>
        {price ? <div className="offer-price">{price}</div> : <div className="offer-price offer-price-muted">Preço variável</div>}
        <p className="offer-card-note">Confira o valor final, prazo e condições na loja.</p>
        <div className="offer-card-actions">
          {offer.affiliate_url ? (
            <a
              className="cta"
              href={"/go/" + offer.slug + "/"}
              data-aff-pos="ofertas"
              target="_blank"
              rel="sponsored nofollow noopener"
            >
              Ver oferta →
            </a>
          ) : (
            offer.product_url && (
              <a className="cta" href={offer.product_url} target="_blank" rel="nofollow noopener">
                Ver na loja →
              </a>
            )
          )}
          {offer.has_review && offer.review_slug && (
            <Link href={"/reviews/" + offer.review_slug + "/"} className="offer-review-link">
              Ler review completo
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function OfertasPage() {
  const offers = await getAllProductLinks({ status: 'reviewed', has_review: true, limit: 60 });

  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]} />
          <span className="eyebrow">Ofertas Vetor</span>
          <h1>Ofertas acompanhadas de perto</h1>
          <p className="hero-lead">
            Ofertas vinculadas a reviews publicados pelo Vetor.blog, com o preço disponível no momento do acompanhamento.
            Confirme sempre o valor final, frete e condições na loja antes de fechar a compra.
          </p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          {offers.length > 0 ? (
            <div className="offer-card-grid">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
          ) : (
            <div className="article">
              <h2>Sem ofertas no momento</h2>
              <p>
                Estamos atualizando a lista. Enquanto isso, explore os{" "}
                <Link href="/reviews/">reviews</Link> e <Link href="/comparativos/">comparativos</Link>.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
