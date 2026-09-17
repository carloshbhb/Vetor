export function buildReviewPrompt(product: {
  title: string;
  category: string;
  price: string;
  image: string;
  product_url?: string;
  marketplace?: string;
}): string {
  return `Gere uma review profissional e completa para o produto "${product.title}" no site vetor.blog.

Produto: ${product.title}
Categoria: ${product.category}
Preço: ${product.price}
URL do Produto: ${product.product_url || 'N/A'}
Marketplace: ${product.marketplace || 'mercadolivre'}

Responda APENAS em JSON válido com esta estrutura exata:
{
  "title": "Título SEO otimizado",
  "description": "Descrição curta (max 160 chars)",
  "content": "HTML completo do artigo com h2, p, ul/li, table. Use <h2> para seções, <p> para parágrafos, <ul><li> para listas",
  "hero_overall_score": 8.5,
  "hero_bars": [
    { "pct": 90, "label": "Qualidade", "value": 9 },
    { "pct": 85, "label": "Custo-Benefício", "value": 8.5 },
    { "pct": 80, "label": "Design", "value": 8 }
  ],
  "specs": [
    { "label": "Marca", "value": "Samsung", "highlight": false },
    { "label": "Modelo", "value": "Galaxy Fit3", "highlight": true }
  ],
  "sections": [
    {
      "id": "design",
      "heading": "Design e Construção",
      "tocEmoji": "🎨",
      "tocLabel": "Design",
      "content": "<p>Conteúdo da seção...</p>"
    }
  ],
  "pros": ["Ponto forte 1", "Ponto forte 2"],
  "cons": ["Ponto fraco 1", "Ponto fraco 2"],
  "compare_table": {
    "columns": ["Produto", "Preço", "Nota"],
    "rows": [
      { "feature": "${product.title}", "values": ["${product.price}", "8.5"], "winner": 0 }
    ],
    "caption": "Comparativo",
    "winnerCol": 1
  },
  "verdict_score": 8.5,
  "verdict_label": "Excelente",
  "verdict_text": "O ${product.title} é uma excelente opção...",
  "verdict_note": "Recomendado para quem busca qualidade.",
  "faq": [
    { "question": "Vale a pena comprar?", "answer": "Sim, pelo preço é uma ótima opção." }
  ],
  "hero_lead": "Parágrafo de introdução envolvente",
  "hero_headline_line1": "Análise Completa do",
  "hero_headline_line2": "${product.title}",
  "hero_headline_em": "Vale a Pena?"
}

Regras:
- content deve ser HTML válido com <h2>, <p>, <ul>, <li>, <table>
- hero_bars deve ter 3-5 barras com pct (0-100) e value (0-10)
- specs deve ter 4-8 especificações
- sections deve ter 4-6 seções com conteúdo HTML
- pros e cons devem ter 3-5 itens cada
- compare_table deve comparar com 1-2 concorrentes
- faq deve ter 3-5 perguntas
- Tom: profissional, objetivo, confiável
- Idioma: português brasileiro`;
}

export function buildViralPrompt(topic: {
  title: string;
  category: string;
  comparisonProducts: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): string {
  const productsList = topic.comparisonProducts
    .map((p) => `- ${p.name} (slug: ${p.slug}, URL: ${p.product_url || 'N/A'})`)
    .join('\n');

  return `Gere um artigo viral de comparativo para o tema "${topic.title}" no site vetor.blog.

Categoria: ${topic.category}
Produtos comparados:
${productsList}

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

Tom: envolvente, persuasivo, urgente.
Idioma: português brasileiro.`;
}
