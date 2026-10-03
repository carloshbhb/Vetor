import { buildViralPrompt } from './prompt';
import { seo } from './seo';
import { chatCompletion } from './llm-provider';
import { validateGeneratedViralArticle } from './content-quality';

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

function buildHeroBars(topic: {
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Array<{ label: string; value: string; imageUrl: string; product_url?: string }> {
  return topic.comparisonProducts.map((p) => ({
    label: p.name,
    value: '—',
    imageUrl: p.imageUrl,
    product_url: p.product_url,
  }));
}

export async function generateViralArticle(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Promise<ViralArticleOutput> {
  if (topic.comparisonProducts.length < 2) {
    throw new Error('[viral-generator] comparison requires at least 2 products');
  }

  let parsed: Record<string, any>;
  try {
    const prompt = buildViralPrompt(topic);
    const response = await chatCompletion({
      systemPrompt:
        'Você é um editor de comparativos do vetor.blog. Responda APENAS em JSON válido, sem texto adicional.',
      userPrompt: prompt,
      temperature: 0.8,
      maxTokens: 6500,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM did not return a JSON object');

    const candidate = JSON.parse(jsonMatch[0]);
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('LLM returned an invalid JSON object');
    }
    parsed = candidate;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[viral-generator] generation failed: ${message}`);
  }

  const generatedTitle =
    typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : topic.title;
  const generatedDescription =
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : `Comparativo de ${topic.category} com critérios claros para pesquisar antes da compra.`;
  const generatedContent = typeof parsed.content === 'string' ? parsed.content.trim() : '';
  const { title: seoTitle, description: seoDesc } = seo(generatedTitle, generatedDescription);

  const output: ViralArticleOutput = {
    slug: generatedTitle
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .replace(/\\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, ''),
    title: generatedTitle,
    description: generatedDescription,
    content: generatedContent,
    category: topic.category,
    hero: {
      imageUrl: topic.comparisonProducts[0].imageUrl,
      bars: buildHeroBars(topic),
    },
    products: topic.comparisonProducts,
    seo_title: seoTitle,
    seo_description: seoDesc,
  };

  const validation = validateGeneratedViralArticle(output, {
    source: 'generator',
    slug: output.slug,
  });
  if (!validation.ok) {
    throw new Error(`[viral-generator] quality validation failed: ${validation.issues.join(' | ')}`);
  }

  return output;
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
