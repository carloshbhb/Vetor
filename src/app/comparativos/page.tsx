import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScoreBadge from '@/components/ScoreBadge';
import { fetchAllViralArticles } from '@/lib/data';

export default async function ComparativosPage() {
  const articles = await fetchAllViralArticles();

  return (
    <>
      <Navbar />
      <main className="container">
        <h1 style={{ margin: '60px 0', fontSize: '48px' }}>Comparativos</h1>

        {articles.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '18px' }}>
            Nenhum comparativo disponível no momento.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {articles.map((article) => (
              <a
                key={article.slug}
                href={`/comparativos/${article.slug}`}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'block',
                }}
              >
                {article.hero?.imageUrl && (
                  <div
                    style={{
                      width: '100%',
                      height: '200px',
                      background: `url(${article.hero.imageUrl}) center/cover no-repeat`,
                    }}
                  />
                )}
                <div style={{ padding: '24px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'var(--blue)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      marginBottom: '12px',
                    }}
                  >
                    {article.category}
                  </span>
                  <h2 style={{ marginBottom: '8px', fontSize: '20px' }}>
                    {article.title}
                  </h2>
                  <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
                    {article.description}
                  </p>
                  {article.hero?.bars && article.hero.bars.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {article.hero.bars.slice(0, 3).map((bar) => (
                        <div
                          key={bar.label}
                          style={{
                            background: 'var(--surface2)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ color: 'var(--muted)' }}>{bar.label}</span>
                          <span style={{ fontWeight: 'bold' }}>{bar.value}</span>
                        </div>
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
