import Link from 'next/link';
import Image from 'next/image';
import { getPublishedReviews } from '@/lib/db';
import Logo from '@/components/Logo';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const reviews = await getPublishedReviews();

  return (
    <div className="bg-bg2 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
            <Link href="/" className="text-text font-bold">Reviews</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-cta-gradient py-16 px-4 mb-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="font-bebas text-6xl md:text-7xl tracking-wide mb-4">
            Reviews Sinceros para<br/>Compradores Inteligentes
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Descubra os melhores produtos do mercado com nossas análises detalhadas, prós, contras e notas rigorosas.
          </p>
        </div>
      </section>

      {/* Reviews Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        {reviews.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-syne font-bold text-text-muted text-lg mb-2">Nenhum review publicado ainda.</p>
            <Link href="/admin" className="text-blue hover:underline">Ir para o Painel Admin</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map(r => (
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
    </div>
  );
}
