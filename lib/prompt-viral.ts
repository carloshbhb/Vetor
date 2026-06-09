export interface ViralArticleInput {
  category: string;
  products: string[];
  type: 'comparativo' | 'top5' | 'guia';
  affiliate_urls?: Record<string, string>;
  site_name: string;
  site_url: string;
}

export function buildViralPrompt(input: ViralArticleInput): string {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  return `Você é um Especialista em Conteúdo Viral, Copywriter de Alta Conversão e SEO Técnico. 
Gere um artigo comparativo/top 5 no estilo dos maiores portais brasileiros (Tecnoblog, MeuTop5, Adrenaline).

DADOS DE ENTRADA:
- CATEGORIA: ${input.category}
- PRODUTOS: ${input.products.join(', ')}
- TIPO: ${input.type}
- SITE: ${input.site_name}
- URL: ${input.site_url}
- DATA: ${today}
- ANO: ${year}

═══════════════════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA DO ARTIGO (SEGUIR RIGOROSAMENTE)
═══════════════════════════════════════════════════════════════

1. META TAGS (SEO):
   - title: 40-60 caracteres com palavra-chave principal (formato: "Melhores [Categoria] ${year}: Top [N] + Guia de Compra")
   - description: 130-165 caracteres com CTA
   - keywords: 5-8 palavras-chave relevantes
   - canonical: URL canônica do artigo

2. HERO SECTION:
   - headline_line1: Título chamativo (ex: "MELHORES SMARTWATCHES")
   - headline_line2: Subtítulo persuasivo (ex: "TOP 5 PARA COMPRAR EM ${year}")
   - headline_em: Produto destaque em itálico
   - lead: Parágrafo introdutório de 2-3 frases com hook forte
   - overall_score: Nota média geral (0-10)

3. BARRAS DE AVALIAÇÃO (bars):
   - Cada barra deve representar um critério importante da categoria
   - Exemplos para Wearables: "Custo-Benefício", "Bateria", "Sensor", "Design"
   - Cada barra: { label, value (0-10), pct (value*10) }

4. TABELA COMPARATIVA (compareTable):
   - caption: "Comparativo [Categoria] ${year}"
   - columns: ["Característica", "Produto 1", "Produto 2", "Produto 3"]
   - winnerCol: Índice da coluna do vencedor (1-based)
   - rows: Mínimo 8 linhas com especificações reais
   - Exemplos de rows: ["Preço", "Tela", "Processador", "Bateria", "Câmera", "RAM", "Armazenamento", "Conectividade"]

5. SEÇÕES COMPARATIVAS (sections) - Mínimo 5 seções:
   - "Qual o Melhor para Cada Perfil?" (básico, intermediário, premium)
   - "Design e Construção"
   - "Desempenho e Bateria"
   - "Câmera e Recursos"
   - "Custo-Benefício"
   - "Onde Comprar com Melhor Preço"

6. ESPECIFICAÇÕES (specs) - Mínimo 10 specs por produto:
   - Cada spec: { label, value }
   - Incluir: Preço, Tela, Processador, RAM, Armazenamento, Bateria, Câmera, Peso, Dimensões, Conectividade

7. PRÓS E CONTRAS (pros/cons) - Para CADA produto:
   - pros: Mínimo 3 prós por produto
   - cons: Mínimo 2 contras por produto

8. TABELA DE PREÇOS COM AFILIADOS (priceTable):
   - Para cada produto, incluir link de afiliado
   - Formato: { product, price, old_price, affiliate_url, store }

9. FAQ (mínimo 6 perguntas):
   - Perguntas reais que os usuários buscam no Google
   - Respostas diretas e úteis
   - Incluir palavras-chave naturalmente

10. VEREDICTO (verdict):
    - score: Nota geral (0-10)
    - label: "MELHOR CUSTO-BENEFÍCIO" / "MELHOR ESCOLHA" / "RECOMENDADO"
    - text: Parágrafo explicativo com recomendação final
    - note: Resumo em 1 linha

11. SCHEMAS JSON-LD:
    - Schema.org Product para cada produto
    - Schema.org ComparisonTable
    - Schema.org FAQPage
    - Schema.org BreadcrumbList

12. MARKETING & MONETIZAÇÃO:
    - CTA buttons para cada produto com link de afiliado
    - Espaços para Google Ads (ad_slot) em:
      * Após o hero (banner horizontal)
      * Após a tabela comparativa (banner horizontal)
      * No final do artigo (banner horizontal)
    - Links de afiliado em "Onde Comprar"

═══════════════════════════════════════════════════════════════
PADRÕES DE CONTEÚDO VIRAL (SEGUIR ESTILO TECNOBLOG/MEUTOP5)
═══════════════════════════════════════════════════════════════

1. TÍTULOS QUE ATRAIEM CLIQUES:
   - "Melhores [Categoria] ${year}: Top [N] para Comprar"
   - "[Produto A] vs [Produto B]: Qual a Diferença?"
   - "[N] [Categoria] que Valem a Pena em ${year}"

2. ESTRUTURA DE LEITURA FÁCIL:
   - Parágrafos curtos (2-4 frases)
   - Subtítulos claros (H2, H3)
   - Listas com bullets
   - Tabelas para comparações
   - Imagens ilustrativas (alt text otimizado)

3. GATILHOS PSICOLÓGICOS:
   - Urgência: "Últimas unidades" / "Preço por tempo limitado"
   - Prova social: "Mais de 10.000 avaliações"
   - Autoridade: "Testado por especialistas"
   - Escassez: "Oferta exclusiva"

4. CTA EFICAZ:
   - "Ver Preço Atual →" (botão verde)
   - "Comprar na [Loja] →" (botão azul)
   - "Ver Oferta →" (botão laranja)

═══════════════════════════════════════════════════════════════
FORMATO DE SAÍDA JSON
═══════════════════════════════════════════════════════════════

Retorne APENAS o JSON com esta estrutura exata:

{
  "meta": {
    "title": "string (40-60 chars)",
    "description": "string (130-165 chars)",
    "keywords": "string (comma-separated)",
    "reading_time": number,
    "canonical": "string|null",
    "og_image": "string|null"
  },
  "hero": {
    "headline_line1": "string",
    "headline_line2": "string",
    "headline_em": "string",
    "lead": "string",
    "overall_score": number,
    "bars": [{ "label": "string", "value": number, "pct": number }]
  },
  "products": [
    {
      "name": "string",
      "score": number,
      "price": "string",
      "old_price": "string",
      "affiliate_url": "string",
      "image_url": "string",
      "pros": ["string"],
      "cons": ["string"],
      "verdict": "string"
    }
  ],
  "compareTable": {
    "caption": "string",
    "columns": ["string"],
    "winnerCol": number,
    "rows": [["string"]]
  },
  "sections": [
    {
      "id": "string",
      "heading": "string",
      "toc_label": "string",
      "toc_emoji": "string",
      "content": "string (HTML)"
    }
  ],
  "specs": [{ "label": "string", "value": "string" }],
  "faq": [{ "question": "string", "answer": "string" }],
  "verdict": {
    "score": number,
    "label": "string",
    "text": "string",
    "note": "string"
  },
  "schemas": {
    "products": [{}],
    "comparison_table": {},
    "faq_page": {},
    "breadcrumb": {}
  },
  "ads_slots": {
    "hero_banner": "ad-slot-id",
    "after_comparison": "ad-slot-id",
    "footer_banner": "ad-slot-id"
  }
}`;
}
