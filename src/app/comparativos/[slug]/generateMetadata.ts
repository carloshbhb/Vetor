import type { Metadata } from 'next';
import { fetchViralArticleBySlug } from '@/lib/data';

export default async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchViralArticleBySlug(slug);
  if (!article) return { title: 'Comparativo não encontrado' };

  return {
    title: article.seo_title || article.title,
    description: article.seo_description || article.description,
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.description,
      type: 'article',
      url: `https://vetor.blog/comparativos/${article.slug}`,
      images: article.hero?.imageUrl
        ? [{ url: article.hero.imageUrl, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seo_title || article.title,
      description: article.seo_description || article.description,
    },
    alternates: {
      canonical: `https://vetor.blog/comparativos/${article.slug}`,
    },
  };
}
