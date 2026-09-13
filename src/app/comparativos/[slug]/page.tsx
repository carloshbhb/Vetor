import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import AuthorBox from '@/components/AuthorBox';
import ScoreBadge from '@/components/ScoreBadge';
import { OrganizationSchema, BreadcrumbSchema } from '@/components/SchemaMarkup';
import { fetchViralArticleBySlug, fetchAllViralArticles } from '@/lib/data';

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
        <main className="container" style={{ padding: '80px 0' }}>
          <h1 style={{ fontSize: '48px' }}>Comparativo não encontrado</h1>
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            O comparativo que você procura não existe.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <OrganizationSchema />
      <BreadcrumbSchema
        items={[
          { name: 'Comparativos', url: 'https://vetor.blog/comparativos' },
          { name: article.title, url: `https://vetor.blog/comparativos/${article.slug}` },
        ]}
      />
      <Navbar />
      <main className="container" style={{ padding: '40px 0 80px' }}>
        <Breadcrumbs
          items={[
            { label: 'Comparativos', href: '/comparativos' },
            { label: article.title, href: `/comparativos/${article.slug}` },
          ]}
        />

        <article style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span
            style={{
              display: 'inline-block',
              background: 'var(--blue)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '4px 12px',
              borderRadius: '999px',
              marginBottom: '16px',
            }}
          >
            {article.category}
          </span>

          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>{article.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '18px', marginBottom: '32px' }}>
            {article.description}
          </p>

          {article.hero?.imageUrl && (
            <div
              style={{
                width: '100%',
                height: '400px',
                borderRadius: '16px',
                background: `url(${article.hero.imageUrl}) center/cover no-repeat`,
                marginBottom: '32px',
              }}
            />
          )}

          {article.hero?.bars && article.hero.bars.length > 0 && (
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
              }}
            >
              <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Pontuação</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {article.hero.bars.map((bar) => {
                  const numericScore = parseFloat(bar.value);
                  return (
                    <div
                      key={bar.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <ScoreBadge score={numericScore} size="sm" />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '6px',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{bar.label}</span>
                          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                            {bar.value}
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            background: 'var(--surface2)',
                            borderRadius: '3px',
                          }}
                        >
                          <div
                            style={{
                              width: `${(numericScore / 10) * 100}%`,
                              height: '100%',
                              background: numericScore >= 9
                                ? '#22C55E'
                                : numericScore >= 7
                                  ? 'var(--blue)'
                                  : '#F59E0B',
                              borderRadius: '3px',
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
            <div
              style={{
                lineHeight: 1.8,
                fontSize: '16px',
                color: 'var(--text)',
              }}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}

          {article.products && article.products.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Produtos comparados</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                }}
              >
                {article.products.map((product) => (
                  <div
                    key={product.slug}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        style={{
                          height: '80px',
                          objectFit: 'contain',
                          margin: '0 auto 12px',
                        }}
                      />
                    )}
                    <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{product.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: '48px' }}>
            <AuthorBox
              name="Vetor Blog"
              bio="Reviews e comparativos independentes de tecnologia."
              date={article.published_at || article.created_at || new Date().toISOString()}
              readTime="5 min de leitura"
            />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
