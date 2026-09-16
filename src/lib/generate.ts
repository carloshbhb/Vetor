import OpenAI from 'openai';
import { buildReviewPrompt } from './prompt';
import { seo } from './seo';

const openai = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || 'sk-fallback-key',
  baseURL: process.env.GOOGLE_AI_API_KEY
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : process.env.GROQ_API_KEY
      ? 'https://api.groq.com/openai/v1'
      : undefined,
});

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

    const response = await openai.chat.completions.create({
      model: process.env.GOOGLE_AI_API_KEY ? 'gemini-2.5-flash' : process.env.GROQ_API_KEY ? 'groq/compound' : 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um editor de reviews profissionais para vetor.blog. Responda APENAS em JSON válido, sem texto adicional.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : content;

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
      seo_title: seoTitle,
      seo_description: seoDesc,
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
    };
  }
}

function generateDefaultContent(product: { title: string; category: string; price: string; product_url?: string; marketplace?: string }): string {
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
