export interface GenerateInput {
  product: string;
  category?: string;
  price?: string;
  old_price?: string;
  affiliate_url: string;
  image_url?: string;           // Real product image URL sourced from ML API
  marketplace?: string;
  specs?: string;
  competitors?: string;
  tone?: 'tecnico' | 'popular' | 'misto';
  site_name: string;
  site_url: string;
  author: string;
  existingCategories?: string[];
}

export function buildPrompt(input: GenerateInput): string {
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  return `Você é um Especialista em Copywriting de Alta Conversão, Auditor de Readability Sênior e Especialista em SEO Técnico. 
Sua missão é gerar um review completo, altamente persuasivo, 100% otimizado para SEO em Português do Brasil para o produto especificado abaixo, seguindo RIGOROSAMENTE as métricas de conforto visual e legibilidade textual de mercado (experiência de leitura premium estilo Medium, com legibilidade fácil).

DADOS FORNECIDOS DE ENTRADA:
- PRODUTO: ${input.product}
- LINK DE AFILIADO: ${input.affiliate_url}
- CATEGORIA SUGERIDA: ${input.category || 'Não fornecido (deduza com base no produto)'}
- CATEGORIAS JÁ EXISTENTES NO SITE: ${input.existingCategories && input.existingCategories.length > 0 ? input.existingCategories.join(', ') : 'Nenhuma'}
- PREÇO SUGERIDO: ${input.price || 'Não fornecido (deduza/estime um valor de mercado realista em Reais R$)'}
- PREÇO ANTIGO SUGERIDO: ${input.old_price || 'Não fornecido (deduza/estime um preço de "De" realista em Reais R$)'}
- IMAGEM DO PRODUTO: ${input.image_url ? `URL REAL DISPONÍVEL: ${input.image_url} — NÃO sugira nem invente URLs de imagem; use somente esta.` : 'Não fornecida (o sistema buscará automaticamente)'}
- MARKETPLACE: ${input.marketplace || 'Mercado Livre'}
- CONCORRENTES: ${input.competitors || 'Não fornecido (identifique os 2 principais concorrentes diretos no mercado brasileiro)'}
- ESPECIFICAÇÕES ADICIONAIS: ${input.specs || 'Não fornecido (use seu conhecimento para listar especificações reais do produto)'}

DIRETRIZES CRÍTICAS DE LEGIBILIDADE TEXTUAL (READABILITY & COPYWRITING):
Para garantir uma leitura fluida, rápida e sem esforço cognitivo (alcançando Índice Gulpease superior a 70 e Flesch superior a 75 em Português), você deve obedecer às seguintes regras sintáticas em todo o texto gerado:
1. ORDEM DIRETA E SENTENÇAS EQUILIBRADAS: Nenhuma frase deve ter mais de 25 palavras (tente manter a média abaixo de 18 palavras). Prefira a ordem direta (Sujeito + Verbo + Objeto). Divida períodos longos ou subordinados em sentenças curtas e pontuais quando necessário, mas garanta que o texto flua de forma natural e explicativa.
2. PARÁGRAFOS ESCANEÁVEIS (ESCANEABILIDADE MOBILE): Cada parágrafo deve ter entre 2 a 4 sentenças (limite de 80 a 90 palavras por parágrafo). Nunca crie blocos excessivamente densos de texto corrido. Use listas (bullets) ou subtópicos H3 para quebrar o ritmo de leitura.
3. VOZ ATIVA PREFERENCIAL: Evite a voz passiva excessiva ou verbos de ligação enfadonhos. Escreva de forma enérgica e direta (exemplo: em vez de "A tela é caracterizada por ter 1000 nits que são emitidos", use "A tela atinge 1.000 nits de brilho").
4. EVITE O EXCESSO DE ADVÉRBIOS E PALAVRAS DE PREENCHIMENTO:
   - Evite o uso excessivo de advérbios terminados em "-mente" (como "significativamente", "perfeitamente", "normalmente"). Use-os apenas quando estritamente necessário ou substitua-os por adjetivos diretos.
   - Evite palavras de preenchimento desnecessárias (como "praticamente", "disparado", "na verdade") que enfraquecem o argumento de venda. Seja assertivo e preciso.
5. SIMPLIFICAÇÃO DE JARGÃO E ESTRANGEIRISMO: Sempre que for necessário usar um termo técnico complexo ou estrangeirismo (ex: "fluoroelastômero", "oximetria SpO2"), simplifique ou explique imediatamente com analogias cotidianas simples (ex: "pulseira de silicone médico confortável (fluoroelastômero)" ou "sensor de oxigênio no sangue (SpO2)").
6. RIGOR GRAMATICAL EXTREMO: Garanta concordância verbal e nominal perfeita (exemplo: "A falta de GPS e NFC é a única limitação", e NUNCA "A falta de GPS e NFC são as únicas limitações"). Erros gramaticais destroem a autoridade e a conversão do blog.

INSTRUÇÕES CRÍTICAS DE PESQUISA & CONHECIMENTO:
1. Se campos de preço, especificações, concorrentes ou categoria estiverem em branco ou ausentes, autopreencha-os com precisão cirúrgica e de forma altamente realista para o mercado atual brasileiro.
2. Identifique concorrentes diretos reais e fortes para a tabela comparativa (ex: se o produto for Galaxy Fit3, use Mi Band 8 e Huawei Band 9).
3. DIRETRIZ DE VOLUME & CONCORRÊNCIA SEO: O volume de conteúdo deve garantir o ranqueamento no topo do Google. Garanta que o review AGREGUE muito mais valor prático do que a concorrência superficial. Forneça análises de usabilidade real, cenários de uso prático, durabilidade e segredos técnicos de forma acessível e direta.
4. ANÁLISE DE CATEGORIAS EXISTENTES: Verifique se o produto se encaixa em alguma das "CATEGORIAS JÁ EXISTENTES NO SITE". Se sim, use exatamente a mesma categoria para manter a consistência da taxonomia. Se for nova, crie uma curta e apropriada em português (1 ou 2 palavras no máximo).
5. DIRETRIZ DE TAMANHO DE CARACTERES & LEGIBILIDADE DO TÍTULO (CRÍTICO PARA SEO E CRO):
   - TÍTULO DE SEO ("meta.title"): Deve conter a palavra-chave principal logo no início e ter RIGOROSAMENTE entre 50 e 60 caracteres no total para evitar truncamento no Google.
   - TÍTULO DO HERO DO ARTIGO (headline_line1 e headline_line2):
     - "headline_line1": Nome curto e comercial do produto de até 25 caracteres (ex: "DUALSENSE MIDNIGHT BLACK").
     - "headline_line2": Uma frase de impacto ou ângulo rápido de no máximo 35 caracteres (ex: "AINDA É O REI DA IMERSÃO EM ${year}?").
     - "headline_em": A palavra ou termo exato dentro de "headline_line1" ou "headline_line2" que ficará destacado em cor azul.

ESTRUTURA DO CONTEÚDO (FOCO EM SEO & CONVERSÃO):
- **Hero Title**: Crie um título dinâmico em 2 partes conforme as diretrizes de legibilidade acima.
- **Lead**: Uma introdução rápida de 3 frases curtas com forte gancho de copywriting, instigando o leitor sobre os prós e contras principais.
- **Score Bars**: Distribua notas realistas (0 a 10) baseadas em análises de mercado para 5 atributos importantes.
- **Specs**: Mínimo de 6 especificações detalhadas do produto.
- **Sections**: Mínimo de 6 seções detalhadas de texto, abordando múltiplos aspectos cruciais do produto (ex: Design e Ergonomia, Qualidade de Tela/Display, Performance e Recursos Inteligentes, Sensores e Monitoramento de Saúde, Autonomia de Bateria no uso real, e Análise Prática de Custo-Benefício). Cada seção DEVE ser rica, completa e aprofundada, contendo entre 300 a 500 palavras de texto altamente analítico e explicativo (respeitando as diretrizes de escaneabilidade, voz ativa e tom persuasivo). Escreva de forma extensiva e detalhada, usando múltiplos parágrafos, listas estruturadas (bullets), exemplos práticos de uso diário, comparações físicas e formatação Markdown rica (negrito, itálicos e caixas de destaque 💡). NÃO use títulos H1 ou H2 dentro das seções! Use apenas tags H3 se precisar criar subtópicos dentro do texto.
- **Compare Table**: Uma tabela comparando o produto com pelo menos 2 principais concorrentes da mesma categoria.
- **Prós e Contras**: Mínimo de 5 prós fortes e 4 contras reais (honestidade aumenta as vendas!).
- **Verdict**: Um veredicto poderoso, dando a nota final, a recomendação de público-alvo e resumindo a decisão de compra de forma fluida.
- **FAQ**: Mínimo de 5 perguntas e respostas otimizadas para as buscas reais dos usuários no Google (People Also Ask).

FORMATO DE RETORNO (OBRIGATÓRIO):
Retorne APENAS um objeto JSON válido, sem qualquer texto introdutório, sem blocos de código com marcação markdown (como \`\`\`json ... \`\`\`), apenas o JSON cru e puro seguindo a estrutura exata abaixo:

{
  "meta": {
    "title": "string (Título SEO ideal de até 60 caracteres contendo o nome do produto e o ano ${year})",
    "description": "string (Meta description otimizada de 150 a 160 caracteres com CTA)",
    "keywords": "string (5 a 8 tags separadas por vírgula)",
    "slug": "string (slug amigável baseado no nome do produto, sem acentos ou caracteres especiais)",
    "reading_time": 8
  },
  "product": "string (Nome oficial e completo do produto)",
  "category": "string (Categoria do produto seguindo a diretriz descrita acima)",
  "priceOld": "string (Preço anterior realista formatado como R$ X.XXX,XX)",
  "priceNew": "string (Preço atual realista formatado como R$ X.XXX,XX)",
  "hero": {
    "headline_line1": "string (ex: SAMSUNG GALAXY FIT3)",
    "headline_line2": "string (ex: VALE A PENA EM ${year}?)",
    "headline_em": "string (palavra em destaque azul, ex: GALAXY FIT3)",
    "lead": "string (Introdução persuasiva de até 3 frases curtas)",
    "overall_score": 9.2,
    "bars": [
      {"label": "Tela", "value": 9.0, "pct": 90},
      {"label": "Bateria", "value": 9.5, "pct": 95},
      {"label": "Saúde", "value": 8.0, "pct": 80},
      {"label": "Recursos", "value": 8.5, "pct": 85},
      {"label": "Custo-benefício", "value": 9.2, "pct": 92}
    ]
  },
  "specs": [
    {"label": "string", "value": "string", "highlight": true}
  ],
  "sections": [
    {
      "id": "string-slug",
      "heading": "string (título curto e chamativo para H2)",
      "toc_label": "string (rótulo amigável para o sumário)",
      "toc_emoji": "string (um emoji condizente com a seção)",
      "content": "string (conteúdo rico em Markdown para a seção, usando negrito, listas e tags H3)"
    }
  ],
  "compare": {
    "caption": "string (ex: Tabela Comparativa de Smartbands)",
    "columns": ["Característica", "Nome deste produto", "Concorrente 1", "Concorrente 2"],
    "winner_col": 1,
    "rows": [
      {
        "feature": "string (Ex: Tela)",
        "values": ["string (Ex: AMOLED 1.6\\\")", "string", "string"],
        "winner": 1
      }
    ]
  },
  "pros": ["string"],
  "cons": ["string"],
  "testimonials": [
    {
      "name": "string (nome fictício realista)",
      "city": "string (cidade brasileira)",
      "state": "string (sigla do estado)",
      "month_year": "string (ex: mai/${year})",
      "text": "string (depoimento focado em algum benefício prático)",
      "stars": 5
    }
  ],
  "verdict": {
    "score": 9.2,
    "label": "EXCELENTE CUSTO-BENEFÍCIO",
    "text": "string (Texto de conclusão resumido e persuasivo)",
    "note": "string (Indicação de público-alvo)"
  },
  "faq": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "schemas": {
    "aggregate_rating": {
      "rating_value": 4.8,
      "review_count": 8450,
      "best_rating": 5,
      "worst_rating": 1
    },
    "product_sku": "string",
    "date_published": "${today}",
    "date_modified": "${today}"
  }
}`;
}
