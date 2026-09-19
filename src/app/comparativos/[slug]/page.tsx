import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import AuthorBox from "@/components/AuthorBox";
import ScoreBadge from "@/components/ScoreBadge";
import { OrganizationSchema, BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchViralArticleBySlug, fetchAllViralArticles } from "@/lib/data";
import type { ViralArticle } from '@/lib/types';

export default async function ViralArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchViralArticleBySlug(slug);

  if (!article) {
    return (
      <>
        <Navbar />
        <main className="container py-20">
          <h1 className="font-display text-3xl">Comparativo não encontrado</h1>
          <p className="text-[var(--muted)] mt-2">O comparativo que você procura não existe.</p>
        </main>
        <Footer />
      </>
    );
  }

  const related = await fetchAllViralArticles();
  const relatedFiltered = related.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: 'Comparativos', url: 'https://www.vetor.blog/comparativos' },
          { name: article.title, url: `https://www.vetor.blog/comparativos/${article.slug}` },
        ]}
      />
      <Navbar />
      <main className="container" style={{ padding: '40px 0 80px' }}>
        <Breadcrumbs
          items={[
            { label: 'Comparativos', href: '/comparativos' },
            { label: article.title },
          ]}
        />

        <article className="max-w-[680px] mx-auto">
          <span className="inline-block bg-[var(--blue)] text-white text-[0.68rem] font-heading font-bold px-3 py-1 rounded-full tracking-wider mb-4">
            {article.category}
          </span>

          <h1 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)' }}>
            {article.title}
          </h1>
          <p className="text-[var(--muted)] font-light text-lg mb-8">
            {article.description}
          </p>

          {article.hero?.imageUrl && (
            <div className="relative h-[300px] rounded-2xl overflow-hidden mb-8">
              <Image
                src={article.hero.imageUrl}
                alt={article.title}
                fill
                className="object-cover"
                style={{ objectPosition: 'center 30%' }}
              />
            </div>
          )}

          {article.hero?.bars && article.hero.bars.length > 0 && (
            <div className="bg-[var(--surface)] border border-border rounded-2xl p-6 mb-8">
              <h2 className="font-heading font-extrabold text-lg text-[var(--text)] mb-4 tracking-wider uppercase">
                Pontuação
              </h2>
              <div className="flex flex-col gap-4">
                {article.hero.bars.map((bar) => {
                  const numericScore = parseFloat(bar.value);
                  return (
                    <div key={bar.label} className="flex items-center gap-4">
                      <ScoreBadge score={numericScore} size="md" />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm text-[var(--text)] font-heading font-bold">{bar.label}</span>
                          <span className="text-sm text-[var(--muted)]">{bar.value}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${(numericScore / 10) * 100}%`,
                              background: numericScore >= 8
                                ? 'linear-gradient(90deg, #F59E0B, #FCD34D)'
                                : numericScore >= 6
                                  ? 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                                  : '#F59E0B',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {article.content && (
            <div className="prose mb-8" dangerouslySetInnerHTML={{ __html: article.content }} />
          )}

          {article.products && article.products.length > 0 && (
            <div className="mb-8">
              <h2 className="font-heading font-extrabold text-lg text-[var(--text)] tracking-wider uppercase mb-4">
                Produtos Comparados
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {article.products.map((product) => (
                  <div key={product.slug} className="bg-[var(--surface)] border border-border rounded-xl p-5 text-center">
                    {product.imageUrl && (
                      <Image src={product.imageUrl} alt={product.name} className="h-16 object-contain mx-auto mb-3" />
                    )}
                    <p className="text-sm font-heading font-bold text-[var(--text)]">{product.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AuthorBox
            name="Vetor Blog"
            bio="Reviews e comparativos independentes de tecnologia."
            date={article.published_at || article.created_at || new Date().toISOString()}
            readTime="5 min de leitura"
          />
        </article>

        {relatedFiltered.length > 0 && (
          <section className="bg-[var(--surface)] border-t border-border py-16 mt-16">
            <div className="max-w-[680px] mx-auto">
              <p className="font-heading text-sm font-bold text-[var(--amber)] mb-2 tracking-wider uppercase">
                Continue lendo
              </p>
              <h2 className="font-display leading-none mb-8" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                OUTROS COMPARATIVOS
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {relatedFiltered.map((r) => (
                  <a
                    key={r.slug}
                    href={`/comparativos/${r.slug}`}
                    className="group bg-[var(--bg)] border border-border rounded-2xl overflow-hidden transition-all hover:border-[var(--amber)]/30 hover:-translate-y-1 block"
                  >
                    {r.hero?.imageUrl && (
                      <div className="relative h-[180px] overflow-hidden">
                        <Image src={r.hero.imageUrl} alt={r.title} fill className="object-cover transition-transform duration-400 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-heading font-extrabold text-[0.95rem] text-[var(--text)] mb-2 leading-snug group-hover:text-[var(--amber)] transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-[var(--muted)] font-light text-sm">{r.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
