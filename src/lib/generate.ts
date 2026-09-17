import { buildReviewPrompt } from './prompt';
import { seo } from './seo';
import { chatCompletion } from './llm-provider';
import type { ReviewHeroBar, ReviewSpec, ReviewSection, ReviewCompareTable, ReviewFaq } from './types';

interface ReviewOutput {
  slug: string;
  title: string;
  description: string;
  content: string;
  price: string;
  category: string;
  image: string;
  product_url?: string;
  marketplace?: string;
  seo_title: string;
  seo_description: string;
  hero_overall_score: number;
  hero_bars: ReviewHeroBar[];
  specs: ReviewSpec[];
  sections: ReviewSection[];
  pros: string[];
  cons: string[];
  compare_table: ReviewCompareTable;
  verdict_score: number;
  verdict_label: string;
  verdict_text: string;
  verdict_note: string;
  hero_lead: string;
  hero_headline_line1: string;
  hero_headline_line2: string;
  hero_headline_em: string;
  faq: ReviewFaq[];
}

export async function generateReview(product: {
  title: string;
  category: string;
  price: string;
  image: string;
  product_url?: string;
  marketplace?: string;
}): Promise<ReviewOutput> {
  try {
    const prompt = buildReviewPrompt(product);

    const content = await chatCompletion({
      systemPrompt: 'Você é um editor de reviews profissionais para vetor.blog. Responda APENAS em JSON válido, sem texto adicional.',
      userPrompt: prompt,
      temperature: 0.8,
      maxTokens: 6000,
      responseFormat: { type: 'json_object' },
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const generatedTitle = parsed.title || `${product.title} - Vale a Pena?`;
    const generatedDescription = parsed.description || `Review completo do ${product.title}.`;
    const generatedContent = parsed.content || generateDefaultContent(product);

    const { title: seoTitle, description: seoDesc } = seo(generatedTitle, generatedDescription);

    return {
      slug: product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
      title: generatedTitle,
      description: generatedDescription,
      content: generatedContent,
      price: product.price,
      category: product.category,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace,
      seo_title: parsed.seo_title || seoTitle,
      seo_description: parsed.seo_description || seoDesc,
      hero_overall_score: parsed.hero_overall_score ?? 8,
      hero_bars: parsed.hero_bars ?? [
        { pct: 85, label: 'Qualidade', value: 8.5 },
        { pct: 80, label: 'Custo-Benefício', value: 8 },
        { pct: 75, label: 'Design', value: 7.5 },
      ],
      specs: parsed.specs ?? [
        { label: 'Categoria', value: product.category, highlight: false },
        { label: 'Preço', value: product.price, highlight: true },
      ],
      sections: parsed.sections ?? [
        { id: 'intro', heading: 'Introdução', tocEmoji: '📝', tocLabel: 'Intro', content: `<p>Análise completa do ${product.title}.</p>` },
      ],
      pros: parsed.pros ?? ['Bom custo-benefício', 'Design moderno', 'Boa qualidade de construção'],
      cons: parsed.cons ?? ['Preço poderia ser menor', 'Poucas opções de cor'],
      compare_table: parsed.compare_table ?? { rows: [], caption: '', columns: [], winnerCol: 0 },
      verdict_score: parsed.verdict_score ?? parsed.hero_overall_score ?? 8,
      verdict_label: parsed.verdict_label ?? 'Excelente',
      verdict_text: parsed.verdict_text ?? `O ${product.title} é uma excelente opção na categoria ${product.category}.`,
      verdict_note: parsed.verdict_note ?? 'Recomendado para quem busca qualidade.',
      hero_lead: parsed.hero_lead ?? `Análise completa do ${product.title} pelo preço de ${product.price}.`,
      hero_headline_line1: parsed.hero_headline_line1 ?? 'Análise Completa do',
      hero_headline_line2: parsed.hero_headline_line2 ?? product.title,
      hero_headline_em: parsed.hero_headline_em ?? 'Vale a Pena?',
      faq: parsed.faq ?? [
        { question: `O ${product.title} vale a pena?`, answer: `Sim, pelo preço de ${product.price} é uma ótima opção.` },
      ],
    };
  } catch {
    return {
      slug: product.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
      title: `${product.title} - Vale a Pena em 2026?`,
      description: `Review completo do ${product.title} pelo preço de ${product.price}.`,
      content: generateDefaultContent(product),
      price: product.price,
      category: product.category,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace,
      seo_title: `${product.title} - Vale a Pena em 2026?`,
      seo_description: `Review honesto do ${product.title}. Compare com concorrentes e veja se vale a pena.`,
      hero_overall_score: 8,
      hero_bars: [
        { pct: 85, label: 'Qualidade', value: 8.5 },
        { pct: 80, label: 'Custo-Benefício', value: 8 },
        { pct: 75, label: 'Design', value: 7.5 },
      ],
      specs: [
        { label: 'Categoria', value: product.category, highlight: false },
        { label: 'Preço', value: product.price, highlight: true },
      ],
      sections: [
        { id: 'intro', heading: 'Introdução', tocEmoji: '📝', tocLabel: 'Intro', content: `<p>Análise completa do ${product.title}.</p>` },
      ],
      pros: ['Bom custo-benefício', 'Design moderno'],
      cons: ['Preço poderia ser menor'],
      compare_table: { rows: [], caption: '', columns: [], winnerCol: 0 },
      verdict_score: 8,
      verdict_label: 'Excelente',
      verdict_text: `O ${product.title} é uma excelente opção.`,
      verdict_note: 'Recomendado.',
      hero_lead: `Análise do ${product.title}.`,
      hero_headline_line1: 'Análise Completa do',
      hero_headline_line2: product.title,
      hero_headline_em: 'Vale a Pena?',
      faq: [],
    };
  }
}

function generateDefaultContent(product: { title: string; category: string; price: string }): string {
  return `<h2>Introdução</h2><p>Chegou a hora de analisar o ${product.title} em profundidade. Neste review completo, vamos avaliar cada aspecto deste produto na categoria de ${product.category} pelo preço de ${product.price}.</p>
<h2>Design e Construção</h2><p>O ${product.title} impressiona pelo acabamento e construção robusta, mantendo um design moderno que agrada tanto para uso diário quanto para situações mais exigentes.</p>
<h2>Desempenho</h2><p>O desempenho do ${product.title} é sólido e atende às expectativas para sua categoria. Os processos internos são eficientes e a experiência do usuário é fluida.</p>
<h2>Bateria e Autonomia</h2><p>A bateria do ${product.title} oferece excelente duração para o dia a dia, mantendo o dispositivo funcionando por horas sem necessidade de recarga.</p>
<h2>Veredicto Final</h2><p>O ${product.title} é uma excelente opção na categoria de ${product.category}, entregando bom custo-benefício pelo preço de ${product.price}. Recomendado para quem busca qualidade e confiabilidade.</p>`;
}

export async function generateReviews(products: Array<{ title: string; category: string; price: string; image: string; product_url?: string; marketplace?: string }>): Promise<ReviewOutput[]> {
  const results = await Promise.all(
    products.map((product) => generateReview(product))
  );
  return results;
}
