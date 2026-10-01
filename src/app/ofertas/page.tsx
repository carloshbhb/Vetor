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
  alternates: { canonical: "https://www.vetor.blog/ofertas" },
  openGraph: {
    title: "Ofertas: preços e disponibilidade",
    description: "Preços acompanhados pelo Vetor.blog.",
    url: "https://www.vetor.blog/ofertas",
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
    <div className="home-card" style={{ minHeight: 0 }}>
      <SafeImage
        src={safeImageSrc(offer.image_url)}
        width={600}
        height={400}
        alt={offer.product_name}
        loading="lazy"
        style={{ width: "100%", height: "auto", aspectRatio: "3/2", objectFit: "contain", background: "#f4f6f8", borderRadius: 12, marginBottom: 14 }}
      />
      <span className="home-card-label">{offer.category || offer.marketplace}</span>
      <h3>{offer.product_name}</h3>
      {price && (
        <p>
          <strong>{price}</strong>
        </p>
      )}
      <div className="home-card-bottom" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {offer.affiliate_url ? (
          <a
            href={`/go/${offer.slug}/`}
            data-aff-pos="ofertas"
            target="_blank"
            rel="sponsored nofollow noopener"
          >
            Ver oferta →
          </a>
        ) : (
          offer.product_url && (
            <a href={offer.product_url} target="_blank" rel="nofollow noopener">
              Ver na loja →
            </a>
          )
        )}
        {offer.has_review && offer.review_slug && (
          <Link href={`/reviews/${offer.review_slug}/`}>
            <span>Ler review</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function OfertasPage() {
  const offers = await getAllProductLinks({ limit: 60 });

  return (
    <main id="conteudo">
      <section className="hero">
        <div className="container">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Ofertas" }]} />
          <span className="eyebrow">Ofertas Vetor</span>
          <h1>Ofertas acompanhadas de perto</h1>
          <p className="hero-lead">
            Preços e disponibilidade monitorados pelo Vetor.blog. Confirme sempre o valor final na loja antes
            de fechar a compra.
          </p>
        </div>
      </section>

      <section className="content-wrap">
        <div className="container">
          {offers.length > 0 ? (
            <div className="home-card-grid">
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
