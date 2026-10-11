import { buildReviewPrompt } from './prompt';
import { seo } from './seo';
import { chatCompletion } from './llm-provider';
import { validateGeneratedReview } from './content-quality';
import { slugifyEditorialTitle } from './slug';
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
  editorialBrief?: import('./prompt').EditorialBrief;
}): Promise<ReviewOutput> {
  try {
    const prompt = buildReviewPrompt(product);
    const response = await chatCompletion({
      systemPrompt: 'Você é um editor de reviews profissionais para vetor.blog. Responda APENAS em JSON válido e completo, sem texto adicional.',
      userPrompt: prompt,
      temperature: 0.45,
      maxTokens: 6500,
      responseFormat: { type: 'json_object' },
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('O provedor não retornou um objeto JSON completo.');
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, any>;

    const generatedTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    let generatedDescription = typeof parsed.description === 'string' ? parsed.description.trim() : '';
    let generatedContent = typeof parsed.content === 'string' ? parsed.content.trim() : '';

    let sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    let specs = Array.isArray(parsed.specs) ? parsed.specs : [];
    let heroBars = Array.isArray(parsed.hero_bars) ? parsed.hero_bars : [];
    let pros = Array.isArray(parsed.pros) ? parsed.pros : [];
    let cons = Array.isArray(parsed.cons) ? parsed.cons : [];
    let faq = Array.isArray(parsed.faq) ? parsed.faq : [];
    let comparison = parsed.compare_table;

    // Reject deficient model output before legacy fallback code can pad it with generic prose.
    const visibleText = (value: string) => value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const visibleContent = visibleText(generatedContent);
    const visibleWordCount = visibleContent ? visibleContent.split(/\s+/).length : 0;
    const headingCount = (generatedContent.match(/<h[23]\b/gi) ?? []).length;
    const paragraphCount = (generatedContent.match(/<p\b/gi) ?? []).length;
    const preflightIssues: string[] = [];

    if (generatedContent.length < 5000) preflightIssues.push('HTML do review tem menos de 5.000 caracteres; não será alongado com texto genérico');
    if (visibleContent.length < 4500) preflightIssues.push(`texto visível tem ${visibleContent.length} caracteres (mínimo 4.500)`);
    if (visibleWordCount < 1500) preflightIssues.push(`texto visível tem ${visibleWordCount} palavras (mínimo 1.500)`);
    if (headingCount < 6) preflightIssues.push(`conteúdo tem ${headingCount} subtítulos H2/H3 (mínimo 6)`);
    if (paragraphCount < 8) preflightIssues.push(`conteúdo tem ${paragraphCount} parágrafos (mínimo 8)`);
    if (sections.length < 4) preflightIssues.push('sections deve conter pelo menos 4 seções substantivas');
    if (sections.some((section: any) => typeof section?.heading !== 'string' || visibleText(String(section.content ?? '')).length < 120)) {
      preflightIssues.push('cada seção precisa de título e pelo menos 120 caracteres de texto');
    }
    if (specs.length < 4) preflightIssues.push('specs deve conter pelo menos 4 itens');
    if (heroBars.length < 3 || heroBars.length > 5) preflightIssues.push('hero_bars deve conter de 3 a 5 itens');
    if (pros.length < 3) preflightIssues.push('pros deve conter pelo menos 3 itens');
    if (cons.length < 3) preflightIssues.push('cons deve conter pelo menos 3 itens');
    if (faq.length < 3) preflightIssues.push('faq deve conter pelo menos 3 perguntas');
    if (!comparison || !Array.isArray(comparison.columns) || comparison.columns.length < 2 || comparison.columns.length > 4) {
      preflightIssues.push('compare_table precisa de 2 a 4 colunas');
    } else {
      if (!Array.isArray(comparison.rows) || comparison.rows.length < 3) {
        preflightIssues.push('compare_table precisa de pelo menos 3 linhas');
      } else if (comparison.rows.some((row: any) => !Array.isArray(row?.values) || row.values.length !== comparison.columns.length - 1)) {
        preflightIssues.push('cada linha da comparação deve ter um valor para cada produto');
      }
      const winnerCol = comparison.winnerCol;
      if (!Number.isInteger(winnerCol) || (winnerCol !== -1 && winnerCol < 1) || winnerCol >= comparison.columns.length) {
        preflightIssues.push('compare_table.winnerCol deve ser -1 (sem vencedor) ou apontar para uma coluna de produto existente');
      }
    }

    if (preflightIssues.length > 0) {
      throw new Error(`quality gate prévio reprovou o review: ${preflightIssues.join('; ')}`);
    }

    // Normalize field lengths and repair omitted editorial scaffolding only with
    // explicitly qualified purchase guidance, never with made-up product specifications.
    if (generatedDescription.length > 160) {
      const clipped = generatedDescription.slice(0, 160);
      generatedDescription = clipped.slice(0, Math.max(clipped.lastIndexOf(" "), 100)).replace(/[.,;:\s]+$/, "");
    }

    const qualityIssues: string[] = [];
    if (generatedTitle.length < 10) qualityIssues.push(`title curto (${generatedTitle.length} caracteres)`);
    if (generatedDescription.length < 100 || generatedDescription.length > 160) qualityIssues.push(`description tem ${generatedDescription.length} caracteres (esperado 100–160)`);
    if (generatedContent.length < 5000) qualityIssues.push(`content tem ${generatedContent.length} caracteres (mínimo 5000)`);
    if (sections.length < 4) qualityIssues.push(`sections tem ${sections.length} itens (mínimo 4)`);
    const shortSection = sections.findIndex((item: any) =>
      typeof item.content !== 'string' || item.content.replace(/<[^>]+>/g, ' ').trim().length < 120
    );
    if (shortSection >= 0) qualityIssues.push(`section ${shortSection + 1} tem menos de 120 caracteres`);
    if (specs.length < 4) qualityIssues.push(`specs tem ${specs.length} itens (mínimo 4)`);
    if (heroBars.length < 3) qualityIssues.push(`hero_bars tem ${heroBars.length} itens (mínimo 3)`);
    if (pros.length < 3) qualityIssues.push(`pros tem ${pros.length} itens (mínimo 3)`);
    if (cons.length < 3) qualityIssues.push(`cons tem ${cons.length} itens (mínimo 3)`);
    if (faq.length < 3) qualityIssues.push(`faq tem ${faq.length} itens (mínimo 3)`);
    if (!comparison) qualityIssues.push('compare_table ausente');
    else {
      if (!Array.isArray(comparison.columns) || comparison.columns.length < 2) qualityIssues.push('compare_table.columns ausente ou incompleto');
      if (!Array.isArray(comparison.rows) || comparison.rows.length < 3) qualityIssues.push('compare_table.rows tem menos de 3 itens');
    }

    if (qualityIssues.length > 0) {
      throw new Error(`A IA retornou um review incompleto: ${qualityIssues.join('; ')}. Não será publicado conteúdo genérico.`);
    }

    const seoOutput = seo(generatedTitle, generatedDescription);
    const proposedMetaTitle = String(parsed.meta_title || parsed.seo_title || seoOutput.title).trim();
    const fallbackMetaTitle = `Review ${product.title}: vale a pena?`;
    const finalMetaTitle = proposedMetaTitle.length >= 35 && proposedMetaTitle.length <= 65
      ? proposedMetaTitle
      : fallbackMetaTitle.slice(0, 65);
    const proposedMetaDescription = String(parsed.meta_description || parsed.seo_description || generatedDescription).trim();
    const fallbackMetaDescription = `Review de ${product.title}: conheça recursos, limitações e alternativas. Veja para quais perfis de uso faz sentido e o que conferir antes de comprar.`;
    const finalMetaDescription = proposedMetaDescription.length >= 100 && proposedMetaDescription.length <= 160
      ? proposedMetaDescription
      : fallbackMetaDescription.slice(0, 160);

    const qualityValidation = validateGeneratedReview({
      product: product.title,
      category: product.category || 'Não informada',
      content: generatedContent,
      sections,
      hero_lead: parsed.hero_lead,
      specs,
      hero_bars: heroBars,
      pros,
      cons,
      faq,
      meta_title: finalMetaTitle,
      meta_description: finalMetaDescription,
      hero_overall_score: parsed.hero_overall_score,
      verdict_score: parsed.verdict_score,
      verdict_label: parsed.verdict_label,
      verdict_text: parsed.verdict_text,
      verdict_note: parsed.verdict_note,
      compare_table: comparison,
    }, { source: 'cron', slug: generatedTitle });

    if (!qualityValidation.ok) {
      throw new Error(`quality gate editorial reprovou o review: ${qualityValidation.issues.join('; ')}`);
    }

    return {
      slug: slugifyEditorialTitle(product.title),
      title: generatedTitle,
      description: generatedDescription,
      content: generatedContent,
      price: product.price,
      category: product.category,
      image: product.image,
      product_url: product.product_url,
      marketplace: product.marketplace,
      seo_title: finalMetaTitle,
      seo_description: finalMetaDescription,
      hero_overall_score: parsed.hero_overall_score,
      hero_bars: heroBars,
      specs,
      sections,
      pros,
      cons,
      compare_table: comparison,
      verdict_score: parsed.verdict_score,
      verdict_label: parsed.verdict_label,
      verdict_text: parsed.verdict_text,
      verdict_note: parsed.verdict_note,
      hero_lead: parsed.hero_lead,
      hero_headline_line1: parsed.hero_headline_line1 || 'Review completo do',
      hero_headline_line2: parsed.hero_headline_line2 || product.title,
      hero_headline_em: parsed.hero_headline_em || 'Vale a pena?',
      faq,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[review-generator] failed:', message);
    throw new Error(`[review-generator] ${message}`);
  }
}

export async function generateReviews(products: Array<{ title: string; category: string; price: string; image: string; product_url?: string; marketplace?: string; editorialBrief?: import('./prompt').EditorialBrief }>): Promise<ReviewOutput[]> {
  const results = await Promise.all(
    products.map((product) => generateReview(product))
  );
  return results;
}
