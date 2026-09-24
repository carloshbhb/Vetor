import { buildViralPrompt } from './prompt';
import { seo } from './seo';
import { chatCompletion } from './llm-provider';

interface ViralArticleOutput {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  hero: { imageUrl: string; bars: Array<{ label: string; value: string; imageUrl: string }> };
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
  seo_title: string;
  seo_description: string;
}

function deterministicScore(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return 7 + (hash % 3);
}

function buildHeroBars(topic: {
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Array<{ label: string; value: string; imageUrl: string; product_url?: string }> {
  return topic.comparisonProducts.map((p) => ({
    label: p.name,
    value: `${deterministicScore(p.name)}/10`,
    imageUrl: p.imageUrl,
    product_url: p.product_url,
  }));
}

export async function generateViralArticle(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Promise<ViralArticleOutput> {
  try {
    const prompt = buildViralPrompt(topic);

    const content = await chatCompletion({
      systemPrompt: 'Você é um gerador de artigos virais para vetor.blog. Responda APENAS em JSON válido, sem texto adicional.',
      userPrompt: prompt,
      temperature: 0.9,
      maxTokens: 5000,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : content;

    const generatedTitle = parsed.title || topic.title;
    const generatedDescription = parsed.description || `Comparativo completo de ${topic.category} em 2026.`;
    const generatedContent = parsed.content || generateDefaultViralContent(topic);

    const { title: seoTitle, description: seoDesc } = seo(generatedTitle, generatedDescription);

    const heroBars = buildHeroBars(topic);

    return {
      slug: generatedTitle.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').replace(/\s+/g, '-'),
      title: generatedTitle,
      description: generatedDescription,
      content: generatedContent,
      category: topic.category,
      hero: {
        imageUrl: topic.comparisonProducts[0].imageUrl,
        bars: heroBars,
      },
      products: topic.comparisonProducts,
      seo_title: seoTitle,
      seo_description: seoDesc,
    };
  } catch {
    const heroBars = buildHeroBars(topic);

    return {
      slug: topic.title.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').replace(/\s+/g, '-'),
      title: topic.title,
      description: `Comparativo completo de ${topic.category} em 2026.`,
      content: generateDefaultViralContent(topic),
      category: topic.category,
      hero: {
        imageUrl: topic.comparisonProducts[0].imageUrl,
        bars: heroBars,
      },
      products: topic.comparisonProducts,
      seo_title: topic.title,
      seo_description: `Comparativo completo de ${topic.category} em 2026.`,
    };
  }
}

function generateDefaultViralContent(topic: { title: string; category: string }): string {
  return `<h2>Introdução</h2><p>O ${topic.category} está em ebulição em 2026. Neste comparativo viral, vamos analisar os melhores contenders do mercado para você tomar a melhor decisão de compra.</p>
<h2>Comparativo Detalhado</h2><p>A tabela abaixo mostra os pontos fortes e fracos de cada produto, ajudando você a identificar o melhor custo-benefício.</p>
<h2>Veredicto Final</h2><p>Após análise completa, temos um claro vencedor para a categoria de ${topic.category} que oferece o melhor equilíbrio entre preço e performance.</p>`;
}

export async function generateViralArticles(topics: Array<{
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}>): Promise<ViralArticleOutput[]> {
  const results = await Promise.all(
    topics.map((topic) => generateViralArticle(topic))
  );
  return results;
}
