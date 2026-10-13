import { config } from 'dotenv';
import { getAllProductLinks, markProductLinkReviewed, getProductLinkById, type ProductLink } from '../src/lib/product-links';
import { createReview, getSupabaseServiceKeyClient } from '../src/lib/supabase';
import { slugifyEditorialTitle } from '../src/lib/slug';
import { buildContentUrl, pingNewContent } from '../src/lib/indexnow';

config({ path: '.env.local' });

type LandingResult = {
  slug: string;
  status: 'success' | 'failed' | 'skipped';
  url: string;
  type: 'landing';
  visibility?: 'draft' | 'published';
  error?: string;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function generateLandingPage(link: ProductLink): Promise<LandingResult> {
  const productName = link.product_name;
  const slug = slugifyEditorialTitle(productName);

  // Verificar se já existe review com esse slug
  const supabase = getSupabaseServiceKeyClient();
  if (supabase) {
    const { data: existing } = await supabase
      .from('reviews')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      return { slug, status: 'skipped', url: buildContentUrl('/reviews/' + slug), type: 'landing', visibility: 'published', error: 'Review já existe.' };
    }
  }

  // Construir landing page usando o formato do super prompt
  const landingPage = {
    slug,
    status: 'draft',
    product: productName,
    category: link.category || 'Geral',
    price_new: link.price ? `R$${link.price.toFixed(2)}` : 'Consulte o preço',
    meta_title: `${productName} — Vale a Pena? Análise Completa 2026`,
    meta_description: `Descubra se ${productName} vale a compra. Análise de mercado, diferenciais, cards de concorrentes e guia de compra completo no Vetor Blog.`,
    // REF LAYOUT (do usuário — SF Symbols banner, liquid-glass CSS/GSAP, compare_table ReviewCompareTable):
    // - Banner hero: SF Symbols (smartphone, star.fill) + gradiente liquid-glass (backdrop-filter blur, rgba).
    // - Seção compare_table: usar ReviewCompareTable com columns=['Produto','Nota','Ideal para'] e winnerCol.
    // - Cards concorrentes: grid responsivo com glassmorphism, animação GSAP fade-up.
    content: `
<!-- LAYOUT REFERENCE: SF Symbols banner + liquid-glass CSS + GSAP animations + compare_table schema -->
<h2>O que é ${productName} e para quem ele é indicado?</h2><p>Este produto resolve necessidades específicas do público-alvo.</p>

<h2>Principais Dores Resolvidas</h2><p>Identificamos as 3 maiores frustrações que levam à busca por este tipo de produto.</p>

<h2>Por que o ${productName} Se Destaca</h2><p>Com base na análise da SERP, cobrimos lacunas que os concorrentes deixam de fora.</p>

<h2>Comparativo — ${productName} vs Concorrentes</h2><p>Cards comparativos com prós, contras e links de afiliado (preencha manualmente se ausente).</p>

<h2>FAQ — Perguntas Frequentes</h2><p>Perguntas profundas sobre uso, compatibilidade, garantia e valor.</p>
    `.trim(),
    hero_overall_score: 0,
    verdict_score: 0,
    verdict_label: 'Análise em andamento',
    verdict_text: `Revisão completa do ${productName} e alternativas de mercado.`,
    verdict_note: 'Landing page gerada automaticamente pelo pipeline.',
    pros: ['Análise completa de mercado', 'Cards comparativos de concorrentes', 'SEO otimizado para SERP'],
    cons: ['Requer verificação manual do link de afiliado', 'Conteúdo ainda em rascunho'],
    hero_lead: `Análise completa de ${productName} — vale a pena comprar em 2026?`,
    hero_headline_line1: 'Análise Completa do',
    hero_headline_line2: productName,
    hero_headline_em: 'Vale a Pena?',
    affiliate_url: link.affiliate_url || '',
    image_url: link.image_url || '',
    marketplace: link.marketplace || 'mercadolivre',
    faq: [
      { question: `O ${productName} é bom?`, answer: 'Depende do perfil de uso; consulte a análise completa.' },
      { question: 'Qual a melhor alternativa?', answer: 'Veja os cards comparativos no artigo.' },
      { question: 'Vale a pena comprar agora?', answer: 'Depende das necessidades específicas do uso.' },
    ],
    hero_bars: [{ pct: 80, label: 'Nota Técnica', value: 8 }],
    specs: [{ label: 'Categoria', value: link.category || 'Geral', highlight: true }],
    sections: [{ id: 'analise', heading: 'Análise do Produto', tocEmoji: '📊', tocLabel: 'Análise', content: `<h2>Análise de Mercado</h2>` }],
    compare_table: { columns: ['Produto', 'Nota', 'Ideal para'], rows: [[productName, 'Em análise', 'Ver análise']], caption: 'Comparativo de alternativas', winnerCol: 1 },
  };

  // Salvar como review (draft)
  const dbResult = await createReview(landingPage, { insertOnly: true });
  if (dbResult.error || !dbResult.data) {
    return {
      slug,
      status: 'failed',
      url: '',
      type: 'landing',
      error: dbResult.error || 'Erro ao salvar landing page.',
    };
  }

  // Marcar product_link como com review (mesmo que seja landing page)
  if (link.id) {
    await markProductLinkReviewed(link.id, slug);
  }

  // Notificar IndexNow (opcional)
  if (supabase) {
    try {
      await pingNewContent(buildContentUrl('/reviews/' + slug), 'generate-2-landing-pages');
    } catch (e) {
      console.warn('IndexNow ping failed:', e);
    }
  }

  return {
    slug,
    status: 'success',
    url: buildContentUrl('/reviews/' + slug),
    type: 'landing',
    visibility: 'draft',
  };
}

async function main() {
  console.log('[landing-generation] Iniciando geração de 2 landing pages...');

  const allLinks = await getAllProductLinks({ limit: 100 });
  const eligibleLinks = allLinks
    .filter(link => 
      link.status !== 'archived' && 
      link.product_name?.trim() && 
      isHttpUrl(link.product_url) && 
      isHttpUrl(link.affiliate_url) && 
      isHttpUrl(link.image_url) && 
      !link.has_review // Apenas produtos SEM review
    );

  console.log(`[landing-generation] ${allLinks.length} produtos totais; ${eligibleLinks.length} elegíveis para landing page (sem review e com links válidos)`);

  // Pegar apenas os primeiros 2
  const toProcess = eligibleLinks.slice(0, 2);
  console.log(`[landing-generation] Processando ${toProcess.length} landing pages`);

  const results: LandingResult[] = [];

  for (const link of toProcess) {
    try {
      const result = await generateLandingPage(link);
      results.push(result);
      console.log(`[landing-generation] landing ${result.status}: ${result.slug}${result.error ? ' — ' + result.error : ''}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ 
        slug: link.slug || link.product_name, 
        status: 'failed', 
        url: '', 
        type: 'landing', 
        error: message 
      });
    }
  }

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(`[landing-generation] Finalizado: ${successful} sucesso, ${failed} falha, ${skipped} ignorados.`);

  if (failed > 0 || results.length < 2) {
    console.error('[landing-generation] Falha ao gerar número suficiente de landing pages');
    process.exitCode = 1;
  }

  return results;
}

main().catch((error) => {
  console.error('[landing-generation] Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});