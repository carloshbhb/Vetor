import Link from 'next/link';
import type { Metadata } from 'next';
import { ItemListSchema } from '@/components/SchemaMarkup';
import { fetchAllReviews, fetchAllViralArticles, fetchGuias } from '@/lib/data';
import NewsletterForm from '@/components/NewsletterForm';
import GuideCard from '@/components/GuideCard';
import AdPlacement from '@/components/AdPlacement';
import SafeImage from '@/components/SafeImage';
import { safeImageSrc } from '@/lib/images';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Reviews, Comparativos e Guias de Compra',
  description:
    'Reviews, comparativos e guias de compra para pesquisar produtos, entender diferenças e escolher com mais clareza.',
  alternates: { canonical: '/' },
};

export default async function Home() {
  const [reviews, viralArticles, guias] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    fetchGuias(),
  ]);

  const latestReviews = reviews.slice(0, 8);
  const topReviews = reviews.filter((r) => r.verdict_score >= 9);
  const featured = topReviews[0] ?? latestReviews[0];
  const picks = (topReviews.length >= 3 ? topReviews : latestReviews).slice(0, 3);
  const mainReview = latestReviews[0];
  const smallReviews = latestReviews.slice(1, 3);
  const compares = viralArticles.slice(0, 4);
  const guideCards = guias.slice(0, 4);
  const categoryCounts = Array.from(
    reviews.reduce((map, review) => {
      map.set(review.category, (map.get(review.category) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const listItems = [...latestReviews.slice(0, 6).map((r) => ({
    name: r.product,
    url: `https://www.vetor.blog/reviews/${r.slug}`,
  })), ...guideCards.slice(0, 3).map((g) => ({
    name: g.product,
    url: `https://www.vetor.blog/reviews/${g.slug}`,
  }))];

  return (
    <main id="conteudo">
      <section className="home-hero">
        <div className="container home-hero-grid">
          <div>
            <span className="eyebrow">Vetor.blog</span>
            <h1>
              Antes de comprar,
              <br />
              <span>entenda o que vale.</span>
            </h1>
            <p className="home-lead">
              Reviews, comparativos e guias para ajudar você a pesquisar produtos e serviços com mais clareza —
              antes de tomar uma decisão.
            </p>

            <div className="home-actions">
              <Link className="cta" href="/reviews/">
                Explorar reviews
              </Link>
              <Link className="home-secondary" href="/comparativos/">
                Ver comparativos
              </Link>
            </div>

            <p className="home-disclosure">
              Alguns links podem ser de afiliado. Quando isso acontecer, identificamos a relação comercial sem
              alterar a análise editorial.
            </p>
          </div>

          {featured && (
            <aside className="home-feature">
              <span className="feature-label">Análise em destaque</span>
              <SafeImage
                src={safeImageSrc(featured.image_url)}
                width={600}
                height={338}
                alt={`${featured.product}: foto do produto analisado`}
                sizes="(max-width: 900px) 100vw, 40vw"
                className="home-feature-img"
              />
              <h2>{featured.product}: vale a pena? Review completo</h2>
              <p>{featured.hero_lead}</p>

              <div className="home-feature-list">
                <span>✓ Prós e contras</span>
                <span>✓ Preço</span>
                <span>✓ Alternativas</span>
                <span>✓ Perguntas frequentes</span>
              </div>

              <Link className="cta" href={`/reviews/${featured.slug}/`}>
                Ler análise completa
              </Link>
            </aside>
          )}
        </div>
      </section>

      <ItemListSchema items={listItems} />

      <div className="home-strip">
        <div className="container home-strip-grid">
          <div className="home-strip-item">
            <strong>Reviews</strong>
            <span>Análises detalhadas</span>
          </div>
          <div className="home-strip-item">
            <strong>Comparativos</strong>
            <span>Diferenças lado a lado</span>
          </div>
          <div className="home-strip-item">
            <strong>Guias</strong>
            <span>Critérios para escolher</span>
          </div>
          <div className="home-strip-item">
            <strong>Transparência</strong>
            <span>Afiliados identificados</span>
          </div>
        </div>
      </div>

      <section className="home-section">
        <div className="container">
          <div className="home-section-head">
            <span className="eyebrow-small">Comece por uma intenção</span>
            <h2>O que você precisa descobrir?</h2>
            <p>O Vetor.blog organiza o conteúdo pela dúvida que aparece antes da compra.</p>
          </div>

          <div className="home-card-grid">
            <Link className="home-card" href="/reviews/">
              <span className="home-card-label">01 · Reviews</span>
              <h3>“Esse produto é bom?”</h3>
              <p>Análises completas com recursos, pontos fortes, limitações, preço e perfil indicado.</p>
              <div className="home-card-bottom">Ver reviews →</div>
            </Link>

            <Link className="home-card" href="/comparativos/">
              <span className="home-card-label">02 · Comparativos</span>
              <h3>“Qual dos dois faz mais sentido?”</h3>
              <p>Compare alternativas considerando diferenças práticas, não apenas especificações.</p>
              <div className="home-card-bottom">Comparar opções →</div>
            </Link>

            <Link className="home-card" href="/guias/">
              <span className="home-card-label">03 · Guias</span>
              <h3>“Qual devo escolher?”</h3>
              <p>Guias para diferentes necessidades, orçamentos e critérios de compra.</p>
              <div className="home-card-bottom">Ver guias →</div>
            </Link>
          </div>
        </div>
      </section>

      {categoryCounts.length > 0 && (
        <section className="home-section home-categories">
          <div className="container">
            <div className="home-section-head">
              <span className="eyebrow-small">Explore por categoria</span>
              <h2>Pesquise pelo tipo de produto</h2>
              <p>Encontre reviews relacionados sem depender de uma busca específica.</p>
            </div>
            <div className="home-category-grid">
              {categoryCounts.map(([category, count]) => (
                <Link
                  key={category}
                  className="home-category"
                  href={`/reviews/categoria/${encodeURIComponent(category)}/`}
                >
                  <span>{category}</span>
                  <strong>{count} {count === 1 ? 'análise' : 'análises'}</strong>
                  <b>Explorar →</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <AdPlacement
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP}
        className="ad-slot"
        aria-label="Publicidade"
        wrapperClassName="container"
      />

      {mainReview && (
        <section className="home-section home-dark">
          <div className="container">
            <div className="home-section-head">
              <span className="eyebrow-small">Reviews recentes</span>
              <h2>Conteúdo para pesquisar antes de comprar</h2>
              <p>
                Cada review deve responder às principais dúvidas do leitor e apontar alternativas quando elas
                forem relevantes.
              </p>
            </div>

            <div className="home-review-grid">
              <Link className="home-review-main" href={`/reviews/${mainReview.slug}/`}>
                <SafeImage
                  src={safeImageSrc(mainReview.image_url)}
                  width={600}
                  height={338}
                  alt={`${mainReview.product}: foto do produto analisado`}
                  sizes="(max-width: 768px) 100vw, 55vw"
                  className="home-review-img"
                />
                <span className="tag">Review completo</span>
                <h3>{mainReview.meta_title || `${mainReview.product}: review completo`}</h3>
                <p>{mainReview.hero_lead}</p>
              </Link>

              <div className="home-small-stack">
                {smallReviews.map((r) => (
                  <Link key={r.slug} className="home-review-small" href={`/reviews/${r.slug}/`}>
                    <SafeImage
                      src={safeImageSrc(r.image_url)}
                      width={96}
                      height={72}
                      alt={`${r.product}: foto do produto`}
                      sizes="96px"
                      className="home-thumb"
                    />
                    <div className="home-review-small-body">
                      <span className="tag">Review</span>
                      <h3>{r.meta_title || r.product}</h3>
                      <p>O que observar antes de comprar.</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {compares.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="home-section-head">
              <span className="eyebrow-small">Comparativos</span>
              <h2>Veja as diferenças antes de escolher</h2>
              <p>
                Comparações são uma extensão natural dos reviews: depois de conhecer um produto, o próximo passo
                é entender como ele se posiciona diante das alternativas.
              </p>
            </div>

            <div className="home-compare-grid">
              {compares.map((a) => (
                <Link key={a.slug} className="home-compare" href={`/comparativos/${a.slug}/`}>
                  <div>
                    <span className="tag">Comparativo</span>
                    <h3>{a.title}</h3>
                    <p>{a.description}</p>
                  </div>
                  <span className="home-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <AdPlacement
        slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP}
        className="ad-slot"
        ariaLabel="Publicidade"
        wrapperClassName="container"
      />

      {guideCards.length > 0 && (
        <section className="home-section home-dark">
          <div className="container">
            <div className="home-section-head">
              <span className="eyebrow-small">Guias Vetor</span>
              <h2>Quando você ainda não sabe qual comprar</h2>
              <p>
                Conteúdo mais amplo para capturar pesquisas de descoberta e levar o leitor naturalmente aos
                reviews e comparativos.
              </p>
            </div>

            <div className="home-guide-grid">
              {guideCards.map((g, i) => (
                <GuideCard key={g.slug} guia={g} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {picks.length > 0 && (
        <section className="home-section">
          <div className="container">
            <div className="home-section-head">
              <span className="eyebrow-small">Escolhas rápidas</span>
              <h2>Sem tempo? Comece por aqui</h2>
              <p>Nossas indicações por perfil de compra. Cada uma leva ao review completo, com preço e alternativas.</p>
            </div>
            <div className="pick-grid">
              {picks.map((p) => (
                <Link key={p.slug} className="pick" href={`/reviews/${p.slug}/`}>
                  <SafeImage
                    src={safeImageSrc(p.image_url)}
                    width={600}
                    height={400}
                    alt={`${p.product}: foto do produto recomendado`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="pick-img"
                  />
                  <span className="tag">{p.category}</span>
                  <h3>{p.product}</h3>
                  <p>{p.hero_lead}</p>
                  <strong>Ler review →</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <NewsletterForm />

      <section className="home-section">
        <div className="container">
          <div className="home-cta">
            <div>
              <h2>
                Pesquise melhor.
                <br />
                Compre com mais clareza.
              </h2>
              <p>Comece por um review, compare as alternativas e só então confira a oferta.</p>
            </div>
            <Link className="cta" href="/reviews/">
              Explorar o Vetor.blog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
