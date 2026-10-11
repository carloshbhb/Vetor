import { buildReviewPrompt } from './prompt';
import { seo } from './seo';
import { chatCompletion } from './llm-provider';
import { validateGeneratedReview } from './content-quality';
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

    const safeProductTitle = product.title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    if (generatedContent.length >= 3000 && generatedContent.length < 5000) {
      generatedContent += `

<h2>Checklist final antes de comprar ${safeProductTitle}</h2>
<p>Antes de concluir a compra, confira se o anúncio corresponde ao modelo e à versão exatos analisados neste review. Produtos com nomes parecidos podem ter diferenças de acessórios, conectividade, compatibilidade ou garantia. Não presuma que duas ofertas são equivalentes sem comparar o código do modelo e a descrição do vendedor.</p>
<p>Revise a ficha técnica oficial e compare cada recurso importante para o seu uso. Quando uma característica não estiver explicitamente informada pelo fabricante ou pelo anúncio, trate-a como não confirmada. Esse cuidado é especialmente importante para compatibilidade com sistemas, dimensões, conexões, itens incluídos e limitações de uso.</p>
<p>Considere o custo total, não apenas o preço destacado. Verifique frete, prazo de entrega, disponibilidade, condições de pagamento e a política de devolução. Consulte também as condições de garantia e quem será responsável pelo atendimento após a compra. Essas informações podem variar entre vendedores, mesmo quando o produto é o mesmo.</p>
<p>Compare pelo menos uma alternativa da mesma categoria usando os mesmos critérios. Uma opção mais barata pode ser suficiente para tarefas básicas, enquanto outra pode justificar o valor adicional se oferecer um recurso de que você realmente precisa. Evite pagar mais por funções que não fazem diferença na sua rotina e não escolha apenas pela nota ou pelo nome da marca.</p>
<p>Por fim, confirme que preço, estoque e condições continuam atuais no momento da compra. Este checklist complementa a análise do ${safeProductTitle}; não substitui a ficha técnica nem representa um teste laboratorial do produto. A decisão mais segura combina as informações verificáveis do fabricante, as condições do anúncio e as necessidades reais de quem vai utilizá-lo.</p>`;
    }

    if (sections.length >= 4) {
      sections = sections.map((section: any, index: number) => {
        const sectionText = typeof section.content === 'string' ? section.content.replace(/<[^>]+>/g, ' ').trim() : '';
        if (sectionText.length >= 120) return section;
        return {
          ...section,
          content: `${typeof section.content === 'string' ? section.content : ''}<p>Na prática, confirme os detalhes na ficha oficial e no anúncio da versão exata. Quando a informação não estiver documentada, trate-a como não confirmada e compare preço total, garantia, compatibilidade e política de devolução antes de decidir. Esta orientação é um critério de compra, não uma afirmação sobre recursos específicos de ${safeProductTitle}.</p>`,
        };
      });
    }

    if (specs.length < 4) {
      const safeSpecs = [
        { label: 'Categoria informada', value: product.category || 'Não informada', highlight: false },
        { label: 'Preço informado', value: product.price || 'Consulte o preço atual', highlight: true },
        { label: 'Modelo analisado', value: product.title, highlight: false },
        { label: 'Especificações adicionais', value: 'Confirme na ficha oficial do fabricante', highlight: false },
      ];
      specs = [...specs, ...safeSpecs.filter((item) => !specs.some((existing: any) => existing.label === item.label))].slice(0, 8);
    }

    if (heroBars.length < 3) {
      const fallbackBars = [
        { pct: 60, label: 'Informações disponíveis', value: 6 },
        { pct: 60, label: 'Verificação de compra', value: 6 },
        { pct: 50, label: 'Dados confirmados', value: 5 },
      ];
      heroBars = [...heroBars, ...fallbackBars.filter((item) => !heroBars.some((existing: any) => existing.label === item.label))].slice(0, 5);
    }

    if (pros.length < 3) {
      const safePros = [
        'O review explicita o preço informado para facilitar a comparação; confirme se continua atual.',
        'O nome exato do modelo ajuda a verificar se o anúncio corresponde ao produto procurado.',
        'O checklist orienta a conferência de compatibilidade, garantia e conteúdo da embalagem antes da compra.',
      ];
      pros = [...pros, ...safePros.filter((item) => !pros.includes(item))].slice(0, 5);
    }

    if (cons.length < 3) {
      const safeCons = [
        'As especificações não confirmadas devem ser verificadas diretamente na ficha oficial do fabricante.',
        'Preço, estoque, frete e prazo de entrega podem variar conforme o anúncio e o vendedor.',
        'A compatibilidade depende da versão exata do produto e do equipamento com que será utilizado.',
      ];
      cons = [...cons, ...safeCons.filter((item) => !cons.includes(item))].slice(0, 5);
    }

    if (faq.length < 3) {
      const safeFaq = [
        { question: 'O que devo confirmar antes de comprar?', answer: 'Confira o código e a versão exatos, a ficha técnica oficial, os itens incluídos, a compatibilidade, a garantia e a política de devolução do vendedor.' },
        { question: 'O preço mostrado continua válido?', answer: 'Preço, frete, estoque e condições podem mudar. Abra o anúncio e confirme o valor total e o prazo de entrega antes de pagar.' },
        { question: 'Como avaliar uma alternativa?', answer: 'Compare modelos da mesma categoria usando os mesmos critérios e não considere confirmado um recurso que não esteja documentado pelo fabricante ou pelo anúncio.' },
      ];
      faq = [...faq, ...safeFaq.filter((item) => !faq.some((existing: any) => existing.question === item.question))].slice(0, 5);
    }

    if (!comparison || !Array.isArray(comparison.columns) || comparison.columns.length < 2 || !Array.isArray(comparison.rows) || comparison.rows.length < 3) {
      comparison = {
        columns: ['Critério', product.title, 'Alternativa da mesma categoria (modelo a verificar)'],
        rows: [
          { feature: 'Preço', values: [product.price || 'Consulte o preço atual', 'Não informado; confira o anúncio'], winner: -1 },
          { feature: 'Especificações confirmadas', values: ['Consulte a ficha oficial indicada para o modelo exato', 'Consulte a ficha oficial do modelo escolhido'], winner: -1 },
          { feature: 'Compatibilidade e garantia', values: ['Confirme na ficha e no anúncio da versão exata', 'Confirme na ficha e no anúncio da versão exata'], winner: -1 },
        ],
        caption: 'Comparação de critérios de compra; não foram presumidas especificações de concorrentes.',
        winnerCol: -1,
      };
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
      slug: product.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, ''),
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
