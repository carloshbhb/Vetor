import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import SafeImage from "@/components/SafeImage";
import { listAffiliateLinksPage, type AffiliateLink } from "@/lib/affiliate-links";
import { safeImageSrc } from "@/lib/images";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ofertas: preços e disponibilidade",
  description:
    "Ofertas acompanhadas pelo Vetor.blog, com preço consultado, marketplace e link para a análise completa quando existir.",
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
  if (price === null || price === undefined || !Number.isFinite(price)) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getReviewSlug(offer: AffiliateLink): string | null {
  if (offer.source_type === "review" && offer.source_ref) return offer.source_ref;
  return null;
}

function OfferCard({ offer }: { offer: AffiliateLink }) {
  const price = brl(offer.price);
  const reviewSlug = getReviewSlug(offer);

  return (
    <article className="offer-card">
      <div className="offer-card-media">
        {offer.image_url ? (
          <SafeImage
            src={safeImageSrc(offer.image_url)}
            width={600}
            height={400}
            alt={offer.name}
            loading="lazy"
            sizes="(max-width: 720px) 100vw, 33vw"
          />
        ) : (
          <div aria-hidden="true" className="offer-card-media-placeholder" />
        )}
        <span className="offer-card-badge">{offer.category || offer.marketplace}</span>
      </div>
      <div className="offer-card-body">
        <h2>{offer.name}</h2>
        <p className="offer-card-meta">{offer.marketplace}</p>
        {price ? (
          <div className="offer-price">{price}</div>
        ) : (
          <div className="offer-price offer-price-muted">Preço variável</div>
        )}
        <p className="offer-card-note">
          Confira valor final, frete, disponibilidade e condições na loja.
        </p>
        <div className="offer-card-actions">
          <a
            className="cta"
            href={"/go/" + offer.slug + "/"}
            data-aff-pos="ofertas"
            target="_blank"
            rel="sponsored nofollow noopener"
          >
            Ver oferta →
          </a>
          {reviewSlug && (
            <Link href={"/reviews/" + reviewSlug + "/"} className="offer-review-link">
              Ler review completo
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function OfertasPage() {
  const { data: offers } = await listAffiliateLinksPage({
    status: "active",
    limit: 60,
  });

  const publicOffers = offers.filter(
    (offer) => offer.source_type === "review" || offer.source_type === "comparison_product"
  );

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.vetor.blog/" },
          { name: "Ofertas", url: "https://www.vetor.blog/ofertas/" },
        ]}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]} />
            <span className="eyebrow">Ofertas Vetor</span>
            <h1>Ofertas acompanhadas de perto</h1>
            <p className="hero-lead">
              Ofertas vinculadas ao registro central de afiliados do Vetor.blog, com preço consultado
              quando disponível e acesso direto à análise ou comparação correspondente.
              Confirme sempre o valor final, frete e condições na loja.
            </p>
            <Link className="cta" href="/melhores/">Comparar antes de comprar →</Link>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            {publicOffers.length > 0 ? (
              <div className="offer-card-grid">
                {publicOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <div className="article">
                <h2>Sem ofertas no momento</h2>
                <p>
                  Estamos atualizando a lista. Enquanto isso, explore os{" "}
                  <Link href="/reviews/">reviews</Link> e{" "}
                  <Link href="/comparativos/">comparativos</Link>.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
