export interface EditorialBrief {
  primaryKeyword: string;
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  searchQuestion?: string;
  relatedKeywords?: string[];
  verifiedFacts?: Array<{ claim: string; sourceName: string; sourceUrl?: string }>;
  internalLinks?: Array<{ title: string; url: string; anchorText?: string }>;
  callToAction?: string;
  keywordEvidence?: Array<{
    keyword: string;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    position?: number | null;
    opportunityScore?: number;
    sources?: string[];
    period?: string;
  }>;
}

export function buildDefaultReviewEditorialBrief(input: { title: string; category: string }): EditorialBrief {
  const title = input.title.trim();
  return {
    primaryKeyword: title,
    searchIntent: 'commercial',
    searchQuestion: title + ' vale a pena?',
    relatedKeywords: [title + ' preço', title + ' ficha técnica', title + ' prós e contras', title + ' review', 'alternativas ao ' + title],
    internalLinks: [
      { title: 'Reviews de produtos do Vetor.blog', url: 'https://www.vetor.blog/reviews/', anchorText: 'reviews de produtos' },
      { title: 'Comparativos do Vetor.blog', url: 'https://www.vetor.blog/comparativos/', anchorText: 'comparativos de produtos' },
    ],
    callToAction: 'Compare os recursos documentados, confira as condições atuais do anúncio e escolha conforme seu uso.',
  };
}

export function buildDefaultComparativeEditorialBrief(input: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string }>;
}): EditorialBrief {
  const title = input.title.trim();
  const names = input.comparisonProducts.map((product) => product.name.trim()).filter(Boolean);
  const pair = names.slice(0, 2);
  const category = input.category.trim() || 'Tecnologia';
  return {
    primaryKeyword: title,
    searchIntent: 'commercial',
    searchQuestion: pair.length === 2 ? 'Qual escolher entre ' + pair[0] + ' e ' + pair[1] + '?' : title + ' vale a pena?',
    relatedKeywords: [title + ' comparação', ...(pair.length === 2 ? [pair[0] + ' vs ' + pair[1], pair[0] + ' ou ' + pair[1]] : []), 'melhores opções de ' + category, 'qual ' + category + ' escolher'],
    internalLinks: [
      { title: 'Comparativos do Vetor.blog', url: 'https://www.vetor.blog/comparativos/', anchorText: 'comparativos de produtos' },
      { title: 'Reviews de produtos do Vetor.blog', url: 'https://www.vetor.blog/reviews/', anchorText: 'análises individuais de produtos' },
    ],
    callToAction: 'Compare as características documentadas e confira preço, estoque e condições atuais antes de comprar.',
  };
}

export function buildReviewPrompt(product: {
  title: string;
  category: string;
  price: string;
  image: string;
  product_url?: string;
  marketplace?: string;
  editorialBrief?: EditorialBrief;
}): string {
  const brief = product.editorialBrief;
  const intentLabels = {
    informational: 'informacional: explicar e orientar antes da decisão',
    commercial: 'investigação comercial: comparar opções e ajudar a escolher',
    transactional: 'transacional: ajudar a concluir uma compra informada',
    navigational: 'navegacional: ajudar a encontrar a página ou produto certo',
  } as const;
  const seoBrief = brief
    ? [
        `Palavra-chave principal: ${brief.primaryKeyword}`,
        `Intenção de busca: ${intentLabels[brief.searchIntent]}`,
        brief.searchQuestion ? `Pergunta principal: ${brief.searchQuestion}` : '',
        brief.relatedKeywords?.length
          ? `Sugestões de consultas/termos editoriais (não são dados verificados de volume, tendência ou posição):\n${brief.relatedKeywords.map((keyword) => `- ${keyword}`).join('\n')}`
          : '',
        brief.keywordEvidence?.length
          ? `SINAIS DE PESQUISA REAL DO VETOR (usar só para priorizar ângulo/estrutura; nunca apresentar como volume geral de busca nem inserir números no artigo):\n${brief.keywordEvidence.map((item) => `- ${item.keyword}: impressões no Search Console=${item.impressions ?? 'n/d'}, cliques=${item.clicks ?? 'n/d'}, CTR=${item.ctr ?? 'n/d'}, posição média=${item.position ?? 'n/d'}, score interno de oportunidade=${item.opportunityScore ?? 'n/d'}, fontes=${item.sources?.join(', ') || 'n/d'}${item.period ? `, período=${item.period}` : ''}`).join('\n')}`
          : '',
        brief.verifiedFacts?.length
          ? `FATOS COM FONTES — não extrapole além deles:\n${brief.verifiedFacts.map((fact) => `- ${fact.claim} | Fonte: ${fact.sourceName}${fact.sourceUrl ? ` | ${fact.sourceUrl}` : ''}`).join('\n')}`
          : 'Nenhum fato adicional com fonte foi fornecido. Não invente especificações, medições ou experiência prática.',
        brief.internalLinks?.length
          ? `Links internos permitidos (somente se relevantes):\n${brief.internalLinks.map((link) => `- ${link.title}: ${link.url}${link.anchorText ? ` (âncora: ${link.anchorText})` : ''}`).join('\n')}`
          : 'Não invente URLs internas. Use somente links fornecidos pelo sistema.',
        brief.callToAction ? `Objetivo do CTA: ${brief.callToAction}` : '',
      ].filter(Boolean).join('\n')
    : 'Briefing de pesquisa não fornecido. Não invente volume de busca, posições, tendências nem ações de concorrentes. Evite repetição artificial de palavras-chave.';

  return `Produza um review editorial completo para o Vetor.blog, em português brasileiro, sobre o produto abaixo.

PRODUTO: ${product.title}
CATEGORIA: ${product.category}
PREÇO INFORMADO: ${product.price}
URL DO PRODUTO: ${product.product_url || 'N/A'}
MARKETPLACE: ${product.marketplace || 'mercadolivre'}

BRIEFING SEO E EVIDÊNCIAS:
${seoBrief}

Retorne somente JSON válido, sem markdown fora do JSON, com esta estrutura:
{
  "title": "Review [nome do produto]: análise e vale a pena?",
  "description": "descrição informativa de 100–160 caracteres",
  "meta_title": "título SEO com 35–65 caracteres",
  "meta_description": "meta description com 100–160 caracteres",
  "content": "<h2>HTML integral do review</h2>",
  "hero_overall_score": 7.5,
  "hero_bars": [
    {"pct": 80, "label": "Recursos", "value": 8},
    {"pct": 70, "label": "Custo-benefício", "value": 7},
    {"pct": 80, "label": "Usabilidade", "value": 8}
  ],
  "specs": [
    {"label": "Categoria", "value": "${product.category}", "highlight": false},
    {"label": "Preço informado", "value": "${product.price}", "highlight": true},
    {"label": "Marca/modelo", "value": "informação verificável", "highlight": false},
    {"label": "Recurso principal", "value": "informação verificável", "highlight": false}
  ],
  "sections": [
    {"id": "overview", "heading": "Visão geral", "tocEmoji": "📝", "tocLabel": "Visão geral", "content": "<p>...</p>"},
    {"id": "design", "heading": "Design e construção", "tocEmoji": "🎨", "tocLabel": "Design", "content": "<p>...</p>"},
    {"id": "features", "heading": "Recursos e funcionamento", "tocEmoji": "⚙️", "tocLabel": "Recursos", "content": "<p>...</p>"},
    {"id": "value", "heading": "Preço e alternativas", "tocEmoji": "💰", "tocLabel": "Preço", "content": "<p>...</p>"}
  ],
  "pros": ["vantagem específica 1", "vantagem específica 2", "vantagem específica 3"],
  "cons": ["limitação específica 1", "limitação específica 2", "ponto que deve ser verificado antes da compra"],
  "compare_table": {
    "columns": ["Critério", "${product.title}", "concorrente real da categoria"],
    "rows": [
      {"feature": "Preço", "values": ["${product.price}", "não informado"], "winner": -1},
      {"feature": "Recursos principais", "values": ["recurso confirmado", "recurso confirmado ou não informado"], "winner": -1},
      {"feature": "Perfil de uso", "values": ["perfil sustentado pelo review", "perfil sustentado ou não informado"], "winner": -1}
    ],
    "caption": "Comparação de características conhecidas; dados indisponíveis são identificados",
    "winnerCol": 1
  },
  "verdict_score": 7.5,
  "verdict_label": "Depende do perfil de uso",
  "verdict_text": "veredito explicado pelos fatos descritos no artigo",
  "verdict_note": "limitação ou condição importante para decidir",
  "hero_lead": "introdução editorial com pelo menos 80 caracteres",
  "hero_headline_line1": "Review completo do",
  "hero_headline_line2": "${product.title}",
  "hero_headline_em": "Vale a pena?",
  "faq": [
    {"question": "O produto vale a pena?", "answer": "Resposta contextual com pelo menos 30 caracteres."},
    {"question": "Quais são as principais limitações?", "answer": "Resposta contextual com pelo menos 30 caracteres."},
    {"question": "O que conferir antes de comprar?", "answer": "Resposta contextual com pelo menos 30 caracteres."}
  ]
}

REGRAS OBRIGATÓRIAS:
- "content" deve conter no mínimo 1.500 palavras visíveis e 5.000 caracteres de texto (desconsiderando tags HTML), com pelo menos 8 parágrafos e 6 subtítulos <h2>/<h3>, análise de recursos, limitações, preço, público indicado, comparação e conclusão. Não use repetição ou conteúdo genérico para atingir tamanho; desenvolva critérios úteis e específicos. Não encerre antes de retornar o JSON completo.
- "sections" deve incluir 4–6 seções substantivas, cada uma com pelo menos 120 caracteres de HTML.
- Inclua 4–8 "specs", 3–5 "hero_bars", 3–5 "pros", 3–5 "cons" e 3–5 perguntas em "faq".
- Em "hero_bars", pct deve ser exatamente value multiplicado por 10. Justifique notas usando critérios observáveis; não as apresente como medições laboratoriais.
- "meta_title" deve ter 35–65 caracteres. "meta_description" e "description" devem ter 100–160 caracteres.
- "compare_table.columns" deve ter 2–4 colunas. A primeira é "Critério"; as restantes são os nomes dos produtos. Cada linha contém em "values" uma célula para cada produto (número de colunas menos um). Inclua pelo menos 3 linhas. Use winner=-1 se não existir base factual para apontar um vencedor. Não invente preços.
- Use apenas especificações e fatos sustentáveis por dados confiáveis/conhecimento verificável. Se houver dúvida, escreva "não informado" e recomende consultar a ficha oficial; não invente números, autonomia, testes, benchmarks, defeitos recorrentes ou avaliações de compradores.
- Não afirme experiência prática ("testamos", "em nossos testes", "medimos") nem invente citações ou análises de clientes.
- Não use clichês vazios como "bom custo-benefício", "design moderno", "boa qualidade de construção" ou "recomendado para quem busca qualidade". Explique vantagens e limitações específicas.
- Se houver palavra-chave principal no briefing, use-a no título e em um subtítulo quando natural; responda à pergunta principal logo no início e use termos relacionados apenas quando ajudarem o leitor.
- Não persiga densidade fixa de palavras-chave, não repita frases para SEO e não garanta ranqueamento.
- Só cite fontes e inclua links internos fornecidos no briefing. Não invente URLs, volume de busca ou posições de concorrentes.
- Não force um vencedor. Compare o que é verificável e informe quando faltam dados.
- Tom profissional, objetivo e confiável. O link de compra fica nos componentes comerciais do site; não invente links.
`;
}

export function buildViralPrompt(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
  editorialBrief?: EditorialBrief;
}): string {
  const brief = topic.editorialBrief;
  const intentLabels = {
    informational: 'informacional: explicar e orientar antes da decisão',
    commercial: 'investigação comercial: comparar opções e ajudar a escolher',
    transactional: 'transacional: ajudar a concluir uma compra informada',
    navigational: 'navegacional: ajudar a encontrar a página ou produto certo',
  } as const;
  const seoBrief = brief
    ? [
        `Palavra-chave principal: ${brief.primaryKeyword}`,
        `Intenção de busca: ${intentLabels[brief.searchIntent]}`,
        brief.searchQuestion ? `Pergunta principal: ${brief.searchQuestion}` : '',
        brief.relatedKeywords?.length ? `Sugestões de consultas/termos editoriais (não são dados verificados de volume, tendência ou posição):\\n${brief.relatedKeywords.map((keyword) => `- ${keyword}`).join('\\n')}` : '',
        brief.keywordEvidence?.length ? `SINAIS DE PESQUISA REAL DO VETOR (só para orientar o ângulo; não apresentar números no artigo):\\n${brief.keywordEvidence.map((item) => `- ${item.keyword}: impressões=${item.impressions ?? 'n/d'}, cliques=${item.clicks ?? 'n/d'}, CTR=${item.ctr ?? 'n/d'}, posição média=${item.position ?? 'n/d'}, score interno=${item.opportunityScore ?? 'n/d'}${item.period ? `, período=${item.period}` : ''}`).join('\\n')}` : '',
        brief.verifiedFacts?.length ? `FATOS COM FONTES — não extrapole além deles:\\n${brief.verifiedFacts.map((fact) => `- ${fact.claim} | Fonte: ${fact.sourceName}${fact.sourceUrl ? ` | ${fact.sourceUrl}` : ''}`).join('\\n')}` : 'Nenhum fato adicional com fonte foi fornecido. Não invente especificações, medições ou experiência prática.',
        brief.internalLinks?.length ? `Links internos permitidos (somente se relevantes):\\n${brief.internalLinks.map((link) => `- ${link.title}: ${link.url}${link.anchorText ? ` (âncora: ${link.anchorText})` : ''}`).join('\\n')}` : 'Não invente URLs internas. Use somente links fornecidos pelo sistema.',
        brief.callToAction ? `Objetivo do CTA: ${brief.callToAction}` : '',
      ].filter(Boolean).join('\\n')
    : 'Briefing SEO não fornecido. Não invente volume de busca, posições, tendências nem URLs.';
  const productsList = topic.comparisonProducts
    .map((p) => `- ${p.name} (slug: ${p.slug}, URL: ${p.product_url || 'N/A'})`)
    .join('\n');

  return `Gere um artigo viral de comparativo para o tema "${topic.title}" no site vetor.blog.

Categoria: ${topic.category}
Produtos comparados:
${productsList}

BRIEFING SEO E EVIDÊNCIAS:
${seoBrief}

Responda APENAS em JSON válido com esta estrutura:
{
  "title": "Título viral e SEO otimizado",
  "description": "Descrição curta (max 160 chars)",
  "content": "HTML completo do artigo comparativo com h2, p, ul/li, table",
  "seo_title": "Título SEO (max 60 chars)",
  "seo_description": "Descrição SEO (max 160 chars)"
}

O content HTML deve incluir:
1. Introdução com hook impactante
2. Tabela comparativa detalhada
3. Análise individual de cada produto
4. Score bars para cada produto
5. Veredicto final
6. FAQ section
7. CTA de compra

Tom: claro, informativo e comparativo. Persuasão somente quando sustentada pelos dados fornecidos.
- Não invente testes presenciais, benchmarks, medições, autonomia, defeitos recorrentes, avaliações de compradores ou especificações.
- Não use "testamos", "em nossos testes" ou equivalentes sem experiência explícita fornecida.
- Só declare vencedor quando a evidência apresentada permitir uma conclusão clara; caso contrário, compare perfis de uso e limitações sem fabricar um vencedor.
- content deve ter pelo menos 6 seções com <h2>/<h3>, 8 parágrafos, uma tabela comparativa, análises individuais dos produtos, pelo menos 3 perguntas frequentes e uma CTA objetiva de preço/oferta.
- Mencione os nomes reais de todos os produtos comparados.
- Se houver palavra-chave principal, use-a no título e naturalmente em um subtítulo; responda à pergunta principal cedo.
- Trate termos relacionados como sugestões editoriais, não como dados de volume ou ranking. Não repita palavras-chave nem garanta posicionamento.
- Só cite fontes e inclua URLs internas que tenham sido fornecidas no briefing.
- Não use conteúdo genérico ou texto de preenchimento.
Idioma: português brasileiro.`;
}
