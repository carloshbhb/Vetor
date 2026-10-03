import { config } from 'dotenv';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_AI_API_KEY missing in .env.local');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
});

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];

const SYSTEM_PROMPT = `Você é o principal especialista e editor de tecnologia do Vetor.blog, portal brasileiro de reviews e guias de compra de alta autoridade.
Sua missão é criar o review ou guia de compra mais completo, detalhado, aprofundado, honesto e útil da internet brasileira sobre o produto fornecido.

O conteúdo DEVE ser longo e detalhado o suficiente para atingir as diretrizes de qualidade do Google (E-E-A-T, Helpful Content) e vencer nos snippets de IA (GEO - Generative Engine Optimization).

REGRAS DE EXTENSÃO E QUALIDADE:
1. TOTAL DE PALAVRAS DO REVIEW: Mínimo absoluto de 1.800 a 2.200 palavras no corpo das seções (cerca de 11.000 a 15.000 caracteres de texto puro de seções).
2. Não use enrolação vazia. Adicione dados técnicos reais, cenários reais de uso no dia a dia brasileiro, detalhes de ergonomia, durabilidade, materiais, testes práticos e comparativos detalhados.
3. Formato de formatação interna de cada seção:
   - Divida o texto em múltiplos parágrafos separados pela sequência literal "\\n\\n".
   - Use negrito ("**termo**") em pontos-chave para facilitar a leitura rápida (escaneabilidade).
   - Use listas com marcadores ("- item") onde for relevante detalhar recursos ou especificações.
   - Use citações/destaques ("\\n\\n> Frase de destaque ou observação importante sobre o uso real\\n\\n") em seções apropriadas.
   - NÃO use títulos markdown (# ou ##) dentro de "content" (o heading já é renderizado pelo sistema).
   - NUNCA use emojis no texto de "content" (apenas em tocEmoji se desejar).

4. REGRAS CRÍTICAS DE VALIDADE JSON (MUITO IMPORTANTE):
   - Responda ESTRITAMENTE com um objeto JSON válido, sem texto antes ou depois.
   - NUNCA use aspas duplas desprotegidas no interior do texto (use aspas simples 'termo' ou negrito **termo** para enfatizar ou citar palavras).
   - NUNCA use quebras de linha literais (bytes 0x0A/0x0D) dentro das strings de JSON. Todas as quebras de linha DEVEM ser representadas pela sequência "\\n".

5. SEÇÕES OBRIGATÓRIAS (8 a 10 seções, cada uma com 180 a 280 palavras):
   - id "visao-geral": Visão Geral e Posicionamento de Mercado (contexto no Brasil em 2026, a quem se destina, proposta da marca)
   - id "design-construcao": Design, Acabamento e Conforto no Uso Contínuo (materiais, peso, encaixe, durabilidade percebida, acabamento)
   - id "desempenho-pratica": Desempenho e Performance na Prática (comportamento em tarefas reais, estabilidade, precisão ou potência)
   - id "experiencia-dia-a-dia": Experiência de Uso no Cotidiano Brasileiro (facilidade de rotina, praticidade, ruído/temperatura/ergonomia)
   - id "bateria-ou-recurso-chave": Bateria, Autonomia ou Recurso Tecnológico Chave (tempo real de duração, recarga, ou sistema sonoro/motor/tela)
   - id "conectividade-software": Conectividade, Aplicativo e Ecossistema (Bluetooth, Wi-Fi, app no Brasil, compatibilidade com iOS/Android/Windows/Alexa)
   - id "comparativo-concorrentes": Análise Comparativa com Concorrentes Diretos (confronto textual profundo contra os 2 principais concorrentes no Brasil)
   - id "mercado-brasil-custo-beneficio": Preço, Disponibilidade e Custo-Benefício no Brasil (faixa de preço em R$, lojas confiáveis como Mercado Livre e Amazon, garantia nacional vs importação, voltagem bivolt se aplicável)
   - id "para-quem-vale-a-pena": Perfil de Compra: Para Quem Vale a Pena e Quem Deve Evitar (análise de público-alvo)
   - id "veredito-final-analise": Veredito e Considerações Finais (conclusão técnica assertiva)

IMPORTANTE: NUNCA use os seguintes IDs de seção, pois eles já existem na página:
"resumo", "criterios", "ficha-tecnica", "preco", "comparativo", "publico", "faq".

6. ESTRUTURA DO JSON RETORNADO:
{
  "meta_title": "String com no máximo 60 caracteres (ex: 'Produto X Vale a Pena em 2026? Análise Completa')",
  "meta_description": "String com no máximo 155 caracteres resumindo a análise com nota e recomendação",
  "hero_lead": "Resumo executivo em 2 a 3 frases densas (150 a 220 caracteres)",
  "verdict_score": 8.5,
  "verdict_label": "EXCELENTE CUSTO-BENEFÍCIO EM 2026",
  "verdict_text": "Parágrafo de veredito final com 3 a 4 frases sólidas justificando a nota técnica.",
  "hero_bars": [
    {"label": "Desempenho", "value": 8.5, "pct": 85},
    {"label": "Construção", "value": 8.0, "pct": 80},
    {"label": "Facilidade de Uso", "value": 9.0, "pct": 90},
    {"label": "Recursos", "value": 8.5, "pct": 85},
    {"label": "Custo-Benefício", "value": 9.0, "pct": 90}
  ],
  "specs": [
    {"label": "Item 1", "value": "Valor 1", "highlight": true},
    {"label": "Item 2", "value": "Valor 2", "highlight": true},
    {"label": "Item 3", "value": "Valor 3", "highlight": false},
    {"label": "Item 4", "value": "Valor 4", "highlight": false},
    {"label": "Item 5", "value": "Valor 5", "highlight": false},
    {"label": "Garantia Brasil", "value": "12 meses oficial", "highlight": true}
  ],
  "pros": [
    "Pró 1 objetivo e mensurável",
    "Pró 2 objetivo e mensurável",
    "Pró 3 objetivo e mensurável",
    "Pró 4 objetivo e mensurável",
    "Pró 5 objetivo e mensurável"
  ],
  "cons": [
    "Contra 1 honesto e realista",
    "Contra 2 honesto e realista",
    "Contra 3 honesto e realista",
    "Contra 4 honesto e realista"
  ],
  "compare_table": {
    "columns": ["Critério", "Produto Principal", "Concorrente 1", "Concorrente 2"],
    "rows": [
      {"feature": "Faixa de Preço", "values": ["R$ X", "R$ Y", "R$ Z"], "winner": 0},
      {"feature": "Desempenho", "values": ["Alto", "Médio", "Alto"], "winner": 0},
      {"feature": "Recurso Chave", "values": ["Sim", "Não", "Sim"], "winner": 0}
    ],
    "caption": "Comparativo técnico atualizado no mercado brasileiro",
    "winnerCol": 0
  },
  "faq": [
    {"question": "Pergunta comum 1?", "answer": "Resposta direta e informativa de 2 a 3 frases."},
    {"question": "Pergunta sobre garantia no Brasil?", "answer": "Resposta com detalhes de suporte nacional."},
    {"question": "Vale a pena comprar em 2026?", "answer": "Veredito claro de recomendação."}
  ],
  "sections": [
    {
      "id": "visao-geral",
      "heading": "Visão Geral e Posicionamento no Mercado",
      "tocLabel": "Visão Geral",
      "tocEmoji": "🔍",
      "content": "Conteúdo com múltiplos parágrafos longos, separados por \\n\\n, com **negrito** e > callout..."
    }
  ]
}`;

function cleanAndParseJson(raw) {
  let str = raw.trim();
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // First try direct JSON.parse
  try {
    return JSON.parse(str);
  } catch (err1) {
    // Attempt cleaning control characters and syntax issues
    try {
      let cleaned = str.replace(/[\x00-\x1F\x7F]/g, (c) => {
        if (c === '\n') return '\\n';
        if (c === '\r') return '\\r';
        if (c === '\t') return '\\t';
        return '';
      });
      // Fix missing commas between quoted string items in arrays
      cleaned = cleaned.replace(/"\s*\\n\s*"/g, '",\\n"');
      // Fix trailing commas
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleaned);
    } catch (err2) {
      throw new Error(`JSON parse falhou: ${err1.message}`);
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateFullReview(productData) {
  const isGuia = productData.slug.includes('guia') || productData.slug.startsWith('melhores-') || productData.slug.startsWith('top-');
  
  let prompt = '';
  if (isGuia) {
    prompt = `Gere o Guia de Compra e Review Comparativo completo e aprofundado para os seguintes produtos / categoria:
Título/Produtos: ${productData.product}
Slug: ${productData.slug}
Categoria: ${productData.category}
Faixa de preço informada: ${productData.price || productData.price_new || 'Consulte preços atualizados'}

Este é um GUIA DE COMPRA COMPARATIVO oficial do Vetor.blog. Analise cada um dos modelos citados em detalhes, comparando prós, contras, faixas de preço no Brasil, custo-benefício e indicação de compra para cada perfil de usuário.
Lembre-se: O guia precisa ter entre 1.800 e 2.200 PALAVRAS no total das seções (entre 11.000 e 15.000 caracteres de texto em "sections"), com todas as 8 a 10 seções completas, ricas em detalhes técnicos para o público brasileiro.`;
  } else {
    prompt = `Gere o review completo e aprofundado para o seguinte produto:
Produto: ${productData.product}
Slug: ${productData.slug}
Categoria: ${productData.category}
Preço de referência informado: ${productData.price || productData.price_new || 'Consulte preço atualizado'}

Lembre-se: O review precisa ter entre 1.800 e 2.200 PALAVRAS no total das seções (entre 11.000 e 15.000 caracteres de texto em "sections"), com todas as 8 a 10 seções completas, ricas em detalhes técnicos para o público brasileiro.`;
  }

  const maxAttempts = 4;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentModel = MODELS[(attempt - 1) % MODELS.length];
    try {
      console.log(`[Gemini] Gerando com ${currentModel} para: ${productData.product} (${productData.slug}) [Tentativa ${attempt}/${maxAttempts}]...`);

      const response = await openai.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 16000,
        response_format: { type: 'json_object' }
      });

      const raw = response.choices[0].message.content;
      const parsed = cleanAndParseJson(raw);
      
      // Calculate total section characters
      let totalChars = 0;
      if (Array.isArray(parsed.sections)) {
        totalChars = parsed.sections.reduce((acc, s) => acc + (s.content ? s.content.length : 0), 0);
      }

      console.log(`[Gemini] Concluído: ${parsed.sections?.length || 0} seções geradas, ${totalChars} caracteres no total.`);

      return {
        ...parsed,
        slug: productData.slug,
        product: productData.product,
        category: productData.category,
        affiliate_url: productData.aff || productData.affiliate_url || '',
        image_url: productData.img || productData.image_url || '',
        price_new: productData.price || productData.price_new || '',
        status: 'published',
        marketplace: 'mercadolivre',
        ads_enabled: true,
        schema_rating_value: parsed.verdict_score ? Number((parsed.verdict_score / 2).toFixed(2)) : 4.25,
        schema_review_count: 1,
        totalChars
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Tentativa ${attempt} falhou para ${productData.slug}: ${err.message}`);
      if (attempt < maxAttempts) {
        await sleep(5000 * attempt);
      }
    }
  }

  throw lastError;
}
