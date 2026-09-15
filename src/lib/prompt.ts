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
Imagem: ${product.image}
URL do Produto: ${product.product_url || 'N/A'}
Marketplace: ${product.marketplace || 'mercadolivre'}

Estrutura obrigatória:
1. Título SEO otimizado com a palavra-chave principal
2. Introdução envolvente (2-3 parágrafos)
3. Design e construção
4. Desempenho e funcionalidades
5. Bateria e duração
6. Câmera e sensores (se aplicável)
7. Prós e contras detalhados
8. Comparativo com concorrentes diretos
9. Veredicto final com nota de 0 a 10
10. Perguntas frequentes (FAQ)
11. Onde comprar e link de afiliado

Tom: profissional, objetivo, confiável.
Idioma: português brasileiro.
Estilo: artigo de blog otimizado para SEO com schema markup.
Inclua dados fictícios realistas quando necessário para enriquecer o conteúdo.
`;
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

Estrutura obrigatória:
1. Título viral e SEO otimizado (ex: "O Melhor X de 2026? Comparativo Completo")
2. Hero section com imagem destacada e resumo executivo
3. Introdução com hook impactante
4. Tabela comparativa detalhada (preço, performance, bateria, design, etc.)
5. Análise individual de cada produto com pros e contras
6. Score bars para cada produto
7. Verditos por categoria
8. Melhor custo-benefício
9. Recomendação final
10. FAQ section
11. CTA de compra para cada produto

Tom: envolvente, persuasivo, urgente.
Idioma: português brasileiro.
Estilo: artigo viral otimizado para SEO com schema markup de comparativo.
Cada produto deve ter sua imagem própria no hero section (hero.bars com imageUrl por produto).
Inclua dados fictícios realistas.
`;
}
