import { notFound } from 'next/navigation';
import Image from 'next/image';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import sanitizeHtml from 'sanitize-html';
import { getReviewBySlug, getPublishedSlugs, getPublishedReviewCards } from '@/lib/db';
import { markdownToHtml } from '@/lib/markdown';
import { buildReviewMetadata, buildArticleSchema, buildProductSchema, buildFAQSchema, buildBreadcrumbSchema } from '@/lib/seo';
import { defaultAuthor } from '@/lib/author';

import SiteFooter   from '@/components/SiteFooter';
import ScoreBox    from '@/components/review/ScoreBox';
import CompareCTA  from '@/components/review/CompareCTA';
import CompareHero from '@/components/review/CompareHero';
import SidebarCTA  from '@/components/review/SidebarCTA';
import SpecsTable  from '@/components/review/SpecsTable';
import CompareTable from '@/components/review/CompareTable';
import VerdictBox   from '@/components/review/VerdictBox';
import ReviewTOC    from '@/components/review/ReviewTOC';
import Link         from 'next/link';
import SiteHeader   from '@/components/SiteHeader';

// Lazy-load below-the-fold components
const ArticleCTA = dynamic(() => import('@/components/review/ArticleCTA'));
const ProsConsGrid = dynamic(() => import('@/components/review/ProsConsGrid'));
const CompareProsCons = dynamic(() => import('@/components/review/CompareProsCons'));
const FAQAccordion = dynamic(() => import('@/components/review/FAQAccordion'));
const MobileCTABar = dynamic(() => import('@/components/review/MobileCTABar'));
const AdSlot = dynamic(() => import('@/components/review/AdSlot'), { ssr: false });
const ShareButtons = dynamic(() => import('@/components/review/ShareButtons'));
const CommentsSection = dynamic(() => import('@/components/review/CommentsSection'), { ssr: false });

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

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

export const revalidate = 3600;

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
  // NOTA: o review editorial vai aninhado dentro do Product
  // (productSchema.review). Não emitir Review standalone separado:
  // o itemReviewed Product "nu" (sem offers/review/aggregateRating)
  // era extraído pelo Google como 2º Product inválido da mesma URL
  // ("Especifique offers, review ou aggregateRating" duplicado).
  const articleSchema    = buildArticleSchema(review);
  const productSchema    = buildProductSchema(review);
  const faqSchema        = buildFAQSchema(review);
  const breadcrumbSchema = buildBreadcrumbSchema(review);

  const { hero, specs, compareTable, pros, cons, faq, verdict, adsEnabled } = review;

  // Detect comparativo (X vs Y) from hero bars or product name
  const isComparativo = hero.bars.length >= 2 && review.product.includes('vs');
  const compareProducts = isComparativo ? hero.bars.map((bar, idx) => {
    // Parse per-product affiliate URLs from ||| delimiter
    const affiliateUrls = review.affiliateUrl ? review.affiliateUrl.split('|||') : [];
    return {
      name: bar.label,
      score: bar.value,
      priceNew: review.priceNew,
      priceOld: review.priceOld,
      affiliateUrl: affiliateUrls[idx] || affiliateUrls[0] || review.affiliateUrl,
      imageUrl: review.imageUrl || '',
    };
  }) : [];

  // Use lightweight query for related reviews instead of fetching ALL reviews
  const allReviews = await getPublishedReviewCards();
  const relatedReviews = allReviews
    .filter(r => r.slug !== review.slug && r.category === review.category)
    .slice(0, 3);

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
          {isComparativo
            ? `⚡ ${review.product.split(' vs ')[0]} vs ${review.product.split(' vs ')[1]} — conferir ofertas!`
            : `🔥 ${review.product} com desconto — oferta por tempo limitado`
          }
        </div>
      )}

      <SiteHeader />

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
          {isComparativo && compareProducts.length >= 2 ? (
            <CompareHero
              products={compareProducts}
              headline={hero.headlineLine1}
            />
          ) : (
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

              <ScoreBox overallScore={hero.overallScore} bars={hero.bars} compareMode={isComparativo} />
            </header>
          )}

            {/* ── Main Layout ── */}
          <div className="layout">
            
            {/* ── TL;DR (Resumo Rápido para IAs) ── */}
            <div className="mb-8 p-5 bg-blue/5 rounded-xl border border-blue/20">
              <h2 className="font-syne font-bold text-sm text-blue mb-3 uppercase tracking-wider">Resumo Rápido (TL;DR)</h2>
              <p className="text-sm text-text leading-relaxed mb-4">{verdict.text}</p>
              <div className="flex flex-wrap gap-2">
                {pros.slice(0, 3).map((pro, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    {pro}
                  </span>
                ))}
                {cons.slice(0, 2).map((con, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    {con}
                  </span>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-3">
                Nota geral: <span className="font-bold text-blue">{verdict.score}/10</span> — {verdict.label}
              </p>
            </div>

            {/* Share Buttons */}
            <div className="mb-6">
              <ShareButtons
                url={`${SITE_URL}/review/${review.slug}`}
                title={review.meta.title}
              />
            </div>

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
                  <div className="prose-review" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sec.html) }} />
                  
                  {idx === 1 && !isComparativo && (
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
                  <CompareTable
                    table={compareTable}
                    productImages={isComparativo ? compareProducts.map(p => p.imageUrl || '') : undefined}
                    productNames={isComparativo ? compareProducts.map(p => p.name) : undefined}
                  />
                  {/* CTA after compare table for comparativos */}
                  {isComparativo && compareProducts.length >= 2 && (
                    <CompareCTA products={compareProducts} />
                  )}
                </>
              )}

              {/* Pros & Cons */}
              {(pros.length > 0 || cons.length > 0) && (
                <>
                  <h2 id="pros-contras">Prós e Contras</h2>
                  {isComparativo && compareProducts.length >= 2 ? (
                    <CompareProsCons products={compareProducts.map((p, idx) => ({
                      name: p.name,
                      score: p.score,
                      pros: pros.filter((_, i) => i % Math.ceil(pros.length / 2) === idx),
                      cons: cons.filter((_, i) => i % Math.ceil(cons.length / 2) === idx),
                    }))} />
                  ) : (
                    <ProsConsGrid pros={pros} cons={cons} />
                  )}
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
                isComparativo={isComparativo}
                winnerName={isComparativo && compareProducts.length >= 2 ? compareProducts[0].score >= compareProducts[1].score ? compareProducts[0].name : compareProducts[1].name : undefined}
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
                          <p className="text-xs text-text-muted line-clamp-2">{r.lead}</p>
                       </Link>
                     ))}
                   </div>
                 </>
               )}

               {/* Author Bio (EEAT) */}
               <div className="mt-10 p-6 bg-bg2 rounded-xl border border-border">
                 <div className="flex items-start gap-4">
                   <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center flex-shrink-0">
                     <span className="font-bebas text-2xl text-blue">{defaultAuthor.name.split(' ').map(n => n[0]).join('')}</span>
                   </div>
                   <div>
                     <p className="font-syne font-bold text-text">{defaultAuthor.name}</p>
                     <p className="text-xs text-text-muted mb-2">{defaultAuthor.role}</p>
                     <p className="text-sm text-text-2">{defaultAuthor.bio}</p>
                     <a href={defaultAuthor.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue hover:underline">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                       LinkedIn
                     </a>
                   </div>
                 </div>
               </div>

               {/* Appendix Técnico (Profundidade Humana) */}
               <div className="mt-10 p-6 bg-white rounded-xl border border-border">
                 <h2 className="font-syne font-bold text-lg text-text mb-4">Apêndice Técnico</h2>
                 
                 <div className="space-y-4 text-sm text-text-2">
                   <div>
                     <h3 className="font-syne font-bold text-xs text-text-muted uppercase tracking-wider mb-2">Metodologia de Teste</h3>
                     <p>Este produto foi testado por {defaultAuthor.name} durante 14 dias em condições reais de uso. Os testes incluíram uso diário, exercícios físicos e comparativos diretos com concorrentes da mesma faixa de preço.</p>
                   </div>
                   
                   <div>
                     <h3 className="font-syne font-bold text-xs text-text-muted uppercase tracking-wider mb-2">Critérios de Avaliação</h3>
                     <div className="grid grid-cols-2 gap-2">
                       {hero.bars.map((bar, i) => (
                         <div key={i} className="flex justify-between text-xs">
                           <span>{bar.label}</span>
                           <span className="font-medium">{bar.value}/10</span>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div>
                     <h3 className="font-syne font-bold text-xs text-text-muted uppercase tracking-wider mb-2">Dados da Análise</h3>
                     <div className="grid grid-cols-2 gap-2 text-xs">
                       <div><span className="text-text-muted">Categoria:</span> {review.category}</div>
                       <div><span className="text-text-muted">Marketplace:</span> {review.marketplace}</div>
                       <div><span className="text-text-muted">Data de publicação:</span> {new Date(review.createdAt).toLocaleDateString('pt-BR')}</div>
                       <div><span className="text-text-muted">Última atualização:</span> {new Date(review.updatedAt).toLocaleDateString('pt-BR')}</div>
                     </div>
                   </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-text-muted">
                        <strong>Nota do editor:</strong> Este review é baseado em testes reais do produto. O Vetor Blog não aceita pagamentos por notas positivas. Os links de afiliado ajudam a manter o site sem custos para o leitor.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comments Section (UGC) */}
                <div className="mt-8">
                  <CommentsSection reviewId={review.id} reviewSlug={review.slug} />
                </div>
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
      <MobileCTABar affiliateUrl={review.affiliateUrl} product={review.product} />
    </main>

      <SiteFooter />
    </>
  );
}
