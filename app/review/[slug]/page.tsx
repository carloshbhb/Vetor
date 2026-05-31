import { notFound } from 'next/navigation';
import Image from 'next/image';
import Script from 'next/script';
import { getReviewBySlug, getPublishedSlugs } from '@/lib/db';
import { markdownToHtml } from '@/lib/markdown';
import { buildReviewMetadata, buildArticleSchema, buildProductSchema, buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo';

import Logo         from '@/components/Logo';
import ScoreBox    from '@/components/review/ScoreBox';
import ArticleCTA  from '@/components/review/ArticleCTA';
import SidebarCTA  from '@/components/review/SidebarCTA';
import SpecsTable  from '@/components/review/SpecsTable';
import CompareTable from '@/components/review/CompareTable';
import ProsConsGrid from '@/components/review/ProsConsGrid';
import FAQAccordion from '@/components/review/FAQAccordion';
import VerdictBox   from '@/components/review/VerdictBox';
import ReviewTOC    from '@/components/review/ReviewTOC';
import AdSlot       from '@/components/review/AdSlot';
import Link         from 'next/link';
import { getPublishedReviews } from '@/lib/db';

// Helper to safely highlight search terms within headlines
function renderWithHighlight(text: string, highlight: string) {
  if (!text) return '';
  if (!highlight || !text.toLowerCase().includes(highlight.toLowerCase())) {
    return text;
  }
  const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === highlight.toLowerCase() 
          ? <em key={index}>{part}</em> 
          : part
      )}
    </>
  );
}

export const dynamic = 'force-dynamic';

// ── SSG params ────────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map(slug => ({ slug }));
}

// ── Dynamic Metadata ─────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const review = await getReviewBySlug(params.slug);
  if (!review) return {};
  return buildReviewMetadata(review);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ReviewPage({ params }: { params: { slug: string } }) {
  const review = await getReviewBySlug(params.slug);
  if (!review) notFound();

  // Render each section's Markdown to HTML on the server
  const renderedSections = await Promise.all(
    review.sections.map(async sec => ({
      ...sec,
      html: await markdownToHtml(sec.content),
    })),
  );

  // JSON-LD schemas
  const articleSchema    = buildArticleSchema(review);
  const productSchema    = buildProductSchema(review);
  const faqSchema        = buildFAQSchema(review);
  const breadcrumbSchema = buildBreadcrumbSchema(review);

  const { hero, specs, compareTable, pros, cons, faq, verdict, adsEnabled } = review;
  const adSlotId = process.env.NEXT_PUBLIC_AD_SLOT;

  const allReviews = await getPublishedReviews();
  const relatedReviews = allReviews.filter(r => r.slug !== review.slug && r.category === review.category).slice(0, 3);

  return (
    <>
      {/* JSON-LD Schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* AdSense script (only if ads enabled) */}
      {adsEnabled && process.env.NEXT_PUBLIC_AD_CLIENT && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_AD_CLIENT}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}

      {/* Page structure */}
      
      {/* Alert Strip (Optional) */}
      {review.priceOld && (
        <div className="alert-strip">
          🔥 {review.product} com desconto — oferta por tempo limitado
        </div>
      )}

      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/">
            <Logo />
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
            <a href="/" className="text-text font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>Reviews</a>
          </nav>
        </div>
      </header>

      <main>
        <div className="container">
          
          {/* ── Breadcrumb ── */}
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span aria-hidden="true">›</span>
            <a href="/">Reviews</a>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{review.product}</span>
          </nav>

          {/* ── Hero ── */}
          <header className="article-hero">
            <div className="hero-meta">
              <span className="meta-tag">Review</span>
              <span className="meta-tag">{review.category || 'Geral'}</span>
              <div className="meta-info">
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {new Date(review.updatedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {review.meta.readingTime} min de leitura
                </span>
              </div>
            </div>

            <h1>
              {renderWithHighlight(hero.headlineLine1, hero.headlineEm)}<br/>
              {renderWithHighlight(hero.headlineLine2, hero.headlineEm)}
            </h1>

            <p className="hero-lead">{hero.lead}</p>

            <ScoreBox overallScore={hero.overallScore} bars={hero.bars} />
          </header>

          {/* ── Main Layout ── */}
          <div className="layout">
            
            {/* ── Article Body ── */}
            <article className="article-body" itemScope itemType="https://schema.org/Article">
              
              {/* Image if any */}
              {review.imageUrl && (
                <div style={{ marginBottom: '40px', textAlign: 'center', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15, 23, 42, .06)' }}>
                  <Image src={review.imageUrl} alt={review.product} width={800} height={600} priority className="rounded-xl object-contain" style={{ maxHeight: '400px', width: 'auto', margin: '0 auto' }} />
                </div>
              )}

              {/* Ad slot 1 */}
              {adsEnabled && <AdSlot className="mb-8" />}

              {/* Specs */}
              {specs.length > 0 && (
                <>
                  <h2 id="ficha-tecnica">Ficha Técnica</h2>
                  <SpecsTable specs={specs} />
                </>
              )}

              {/* Ad slot 2 */}
              {adsEnabled && <AdSlot className="mb-8" />}

              {/* Sections */}
              {renderedSections.map((sec, idx) => (
                <div key={sec.id}>
                  <h2 id={sec.id}>{sec.heading}</h2>
                  <div className="prose-review" dangerouslySetInnerHTML={{ __html: sec.html }} />
                  
                  {idx === 1 && (
                    <ArticleCTA
                      priceOld={review.priceOld}
                      priceNew={review.priceNew}
                      affiliateUrl={review.affiliateUrl}
                      product={review.product}
                    />
                  )}
                  {idx === 2 && adsEnabled && <AdSlot className="mb-8" />}
                </div>
              ))}

              {/* Compare table */}
              {compareTable?.rows?.length > 0 && (
                <>
                  <h2 id="comparativo">Comparativo</h2>
                  <CompareTable table={compareTable} />
                </>
              )}

              {/* Pros & Cons */}
              {(pros.length > 0 || cons.length > 0) && (
                <>
                  <h2 id="pros-contras">Prós e Contras</h2>
                  <ProsConsGrid pros={pros} cons={cons} />
                </>
              )}

              {/* Verdict */}
              <h2 id="veredicto">Veredicto Final</h2>
              <VerdictBox
                score={verdict.score}
                label={verdict.label}
                text={verdict.text}
                note={verdict.note}
                affiliateUrl={review.affiliateUrl}
                priceNew={review.priceNew}
              />

{/* FAQ */}
               {faq.length > 0 && (
                 <>
                   <h2 id="faq">Perguntas Frequentes</h2>
                   <FAQAccordion faq={faq} />
                 </>
               )}

               {/* Related Reviews - Internal Links */}
               {relatedReviews.length > 0 && (
                 <>
                   <h2>Reviews Relacionados</h2>
                   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                     {relatedReviews.map(r => (
                       <Link key={r.id} href={`/review/${r.slug}`} className="group bg-bg2 rounded-xl p-4 border border-border hover:shadow-md transition-all">
                         <h3 className="font-syne font-bold text-sm text-text group-hover:text-blue transition-colors line-clamp-2 mb-2">
                           {r.product}
                         </h3>
                         <p className="text-xs text-text-muted line-clamp-2">{r.hero.lead}</p>
                       </Link>
                     ))}
                   </div>
                 </>
               )}
             </article>

            {/* ── Sidebar ── */}
            <aside className="sidebar" aria-label="Navegação do artigo e oferta">
              <ReviewTOC 
                sections={review.sections} 
                hasSpecs={specs.length > 0}
                hasCompare={compareTable?.rows?.length > 0}
                hasProsCons={pros.length > 0 || cons.length > 0}
                hasFAQ={faq.length > 0}
              />
              {adsEnabled && <AdSlot format="rectangle" className="mb-4" />}
              <SidebarCTA
                priceOld={review.priceOld}
                priceNew={review.priceNew}
                affiliateUrl={review.affiliateUrl}
                product={review.product}
              />
            </aside>

          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer>
        <div className="footer-logo">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="36" height="36" rx="9" fill="#1428A0" />
            <polygon points="8,10 14.5,10 18,22 21.5,10 28,10 19.5,27 16.5,27" fill="#4285F4" />
          </svg>
          vetor.blog
        </div>
        <p>Vetor.blog participa do programa de afiliados. Os preços e condições apresentados são promocionais e podem ser alterados sem aviso prévio.</p>
      </footer>
    </>
  );
}
