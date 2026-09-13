import { fetchAllViralArticles } from '@/lib/data';

export default async function generateStaticParams() {
  const articles = await fetchAllViralArticles();
  return articles.map((article) => ({ slug: article.slug }));
}
