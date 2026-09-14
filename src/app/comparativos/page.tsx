import Image from "next/image";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import ScoreBadge from '@/components/ScoreBadge';
import { fetchAllViralArticles } from '@/lib/data';

export default async function ComparativosPage() {
  const articles = await fetchAllViralArticles();

  return (
    <>
      <Navbar />
      <main className="container">
        <Breadcrumbs items={[{ label: 'Início', href: '/' }, { label: 'Comparativos' }]} />
        <div className="pt-4 pb-16">
          <p className="font-heading text-sm font-bold text-[var(--amber)] mb-2 tracking-wider uppercase">
            Comparativos
          </p>
          <h1 className="font-display leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>
            COMPARATIVOS
          </h1>
          <p className="text-[var(--muted)] font-light text-lg max-w-xl">
            Veja qual produto leva vantagem em cada categoria.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--muted)] text-lg">Nenhum comparativo disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-16">
            {articles.map((article) => (
              <a
                key={article.slug}
                href={`/comparativos/${article.slug}`}
                className="group bg-[var(--surface)] border border-border rounded-2xl overflow-hidden transition-all hover:border-[var(--amber)]/30 hover:-translate-y-1 block"
              >
                {article.hero?.imageUrl && (
                  <div className="relative h-[200px] overflow-hidden">
                    <Image
                      src={article.hero.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform duration-400 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-6">
                  <span className="inline-block bg-[var(--blue)] text-white text-[0.68rem] font-heading font-bold px-3 py-1 rounded-full tracking-wider mb-3">
                    {article.category}
                  </span>
                  <h2 className="font-heading font-extrabold text-[1.1rem] text-[var(--text)] mb-2 leading-snug group-hover:text-[var(--amber)] transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-[var(--muted)] font-light text-sm leading-relaxed mb-4">
                    {article.description}
                  </p>
                  {article.hero?.bars && article.hero.bars.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {article.hero.bars.slice(0, 3).map((bar) => (
                        <span key={bar.label} className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-1.5 text-xs font-heading font-bold text-[var(--text)]">
                          {bar.label} {bar.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
