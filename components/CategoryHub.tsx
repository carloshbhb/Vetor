// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Category Hub Component
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';

interface CategoryHubProps {
  categories: { name: string; count: number; slug: string }[];
}

const categoryMeta: Record<string, { icon: string; desc: string }> = {
  'Wearables / Smartbands': { icon: '⌚', desc: 'Smartbands e smartwatches para saúde e estilo' },
  'Acessórios para Games': { icon: '🎮', desc: 'Controles, headsets e acessórios gamers' },
  'Notebooks': { icon: '💻', desc: 'Notebooks para trabalho, estudo e jogos' },
  'Áudio Profissional': { icon: '🎧', desc: 'Microfones, fones e equipamentos de áudio' },
  'Geral': { icon: '📦', desc: 'Reviews de diversos produtos' },
};

export default function CategoryHub({ categories }: CategoryHubProps) {
  return (
    <section className="mb-12">
      <h2 className="font-syne font-bold text-xl text-text mb-6">Categorias</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const meta = categoryMeta[cat.name] || categoryMeta['Geral'];
          return (
            <Link
              key={cat.slug}
              href={`/categoria/${cat.slug}`}
              className="group bg-white rounded-xl border border-border p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h3 className="font-syne font-bold text-text group-hover:text-blue transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">{meta.desc}</p>
                  <p className="text-xs text-blue mt-2 font-medium">{cat.count} review{cat.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
