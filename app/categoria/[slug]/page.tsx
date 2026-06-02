import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getPublishedReviews } from '@/lib/db';
import Logo from '@/components/Logo';
import type { Metadata } from 'next';

export const revalidate = 3600;

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

const categoryMeta: Record<string, { icon: string; desc: string; title: string }> = {
  'wearables-smartbands': { icon: '⌚', desc: 'Smartbands e smartwatches para saúde, fitness e estilo.', title: 'Wearables e Smartbands' },
  'acessorios-para-games': { icon: '🎮', desc: 'Controles, headsets, cadeiras e acessórios gamers.', title: 'Acessórios para Games' },
  'notebooks': { icon: '💻', desc: 'Notebooks para trabalho, estudo, games e produção.', title: 'Notebooks' },
  'audio-profissional': { icon: '🎧', desc: 'Microfones, fones e equipamentos de áudio profissional.', title: 'Áudio Profissional' },
  'smartphones': { icon: '📱', desc: 'Reviews de smartphones, celulares e acessórios.', title: 'Smartphones' },
  'tablets': { icon: '📟', desc: 'Reviews de tablets para trabalho, estudo e lazer.', title: 'Tablets' },
  'eletroportateis': { icon: '🏠', desc: 'Liquidificadores, air fryers, aspiradores e eletrodomésticos.', title: 'Eletroportáteis' },
  'casa-inteligente': { icon: '🏡', desc: 'Dispositivos smart home, interruptores e lâmpadas inteligentes.', title: 'Casa Inteligente' },
  'cameras-de-seguranca': { icon: '📷', desc: 'Câmeras de segurança, IP e monitoramento.', title: 'Câmeras de Segurança' },
  'fones-de-ouvido': { icon: '🎵', desc: 'Fones de ouvido, earbuds e headsets.', title: 'Fones de Ouvido' },
  'geral': { icon: '📦', desc: 'Reviews diversos de produtos de tecnologia.', title: 'Geral' },
};

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function generateStaticParams() {
  const reviews = await getPublishedReviews();
  const dynamicSlugs = Array.from(new Set(reviews.map(r => slugify(r.category || 'Geral'))));
  const predefinedSlugs = Object.keys(categoryMeta);
  return Array.from(new Set([...dynamicSlugs, ...predefinedSlugs])).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const meta = categoryMeta[params.slug] || categoryMeta['geral'];
  const url = `${SITE_URL}/categoria/${params.slug}`;

  return {
    title: `${meta.title} | Reviews e Análises`,
    description: meta.desc,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${meta.title} | Vetor Blog`,
      description: meta.desc,
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const reviews = await getPublishedReviews();

  // Filtrar por slug da categoria
  const filteredReviews = reviews.filter(r => slugify(r.category || 'Geral') === params.slug);
  const meta = categoryMeta[params.slug] || categoryMeta['geral'];

  if (filteredReviews.length === 0 && !categoryMeta[params.slug]) {
    notFound();
  }

  // Schema.org CollectionPage
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${meta.title} | Vetor Blog`,
    description: meta.desc,
    url: `${SITE_URL}/categoria/${params.slug}`,
    hasPart: filteredReviews.slice(0, 10).map(r => ({
      '@type': 'Review',
      name: r.product,
      url: `${SITE_URL}/review/${r.slug}`,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.hero.overallScore,
        bestRating: 10,
      },
    })),
  };

  return (
    <div className="bg-bg2 min-h-screen">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />

      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
            <Link href="/" className="hover:text-text transition-colors">Reviews</Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-blue transition-colors">Home</Link>
          <span>›</span>
          <Link href="/" className="hover:text-blue transition-colors">Reviews</Link>
          <span>›</span>
          <span className="text-text font-medium">{meta.title}</span>
        </nav>
      </div>

      {/* Hero da Categoria */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="bg-white rounded-2xl border border-border p-8">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{meta.icon}</span>
            <div>
              <h1 className="font-syne font-bold text-3xl text-text">{meta.title}</h1>
              <p className="text-text-muted mt-2">{meta.desc}</p>
              <p className="text-xs text-blue mt-3 font-medium">
                {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} publicado{filteredReviews.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-syne font-bold text-text-muted text-lg mb-2">Nenhum review nesta categoria ainda.</p>
            <Link href="/" className="text-blue hover:underline">Ver todos os reviews</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map(r => (
              <Link key={r.id} href={`/review/${r.slug}`} className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col">
                <div className="aspect-[4/3] bg-bg2 relative border-b border-border p-6 flex items-center justify-center">
                  <span className="absolute top-3 right-3 bg-white px-2.5 py-1 rounded-lg text-xs font-syne font-bold text-blue shadow-sm">
                    ★ {r.hero.overallScore.toFixed(1)}
                  </span>
                  {r.imageUrl && (
                    <Image src={r.imageUrl} alt={r.product} fill className="object-contain p-6" />
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">{r.category}</p>
                  <h2 className="font-syne font-bold text-lg text-text leading-tight mb-2 group-hover:text-blue transition-colors">
                    {r.meta.title}
                  </h2>
                  <p className="text-sm text-text-2 line-clamp-2 mb-4 flex-1">
                    {r.hero.lead}
                  </p>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-medium text-text-muted">Ler Review</span>
                    <span className="font-bebas text-xl text-text tracking-wide">{r.priceNew}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-text-muted">
            Vetor.blog — Reviews sinceros para compradores inteligentes.
          </p>
        </div>
      </footer>
    </div>
  );
}
