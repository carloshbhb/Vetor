// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Video Script Generator (Review → Shorts + Carrossel)
// Gera roteiro de 45-55s (~130 palavras) pronto para montar MP4 9:16
// com carrossel de imagens por cena (2-3 imagens por cena, enquadramentos variados).
// YouTube Create não tem API, então o fluxo é: gerar MP4 aqui → abrir no Create ou subir direto.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReviewData } from '@/lib/types';

// Safely extract first JSON object from AI text (non-greedy, validates parsing)
function extractJson(text: string): any | null {
  // Try to find JSON by scanning for balanced braces
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(i, j + 1));
        } catch {
          break; // Not valid JSON, try next `{`
        }
      }
    }
  }
  // Fallback: non-greedy regex
  const m = text.match(/\{[\s\S]*?\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

export interface VideoScene {
  narration: string; // fala da cena (pt-BR)
  onScreenText: string; // texto grande na tela (máx 6 palavras)
  durationSec: number;
  images?: string[]; // URLs das imagens para carrossel (2-3 por cena)
}

export interface VideoScript {
  title: string; // até 100 chars (Shorts)
  description: string; // com link do review + afiliado
  tags: string[];
  hook: string; // primeiros 3s
  scenes: VideoScene[];
  fullNarration: string; // junção das narrações
  estimatedSeconds: number;
  cta: string;
  priceHighlight: string; // ex: "R$ 279 (antes R$ 329)"
  offerBadge: string; // "OFERTA" ou "" — nunca % inventado
  finalCta: string; // frase curta de ação: "Link da oferta na descrição"
}

export function buildVideoScriptPrompt(review: ReviewData, siteUrl: string): string {
  const pros = (review.pros || []).slice(0, 4).join('; ');
  const cons = (review.cons || []).slice(0, 3).join('; ');
  const specs = (review.specs || [])
    .slice(0, 8)
    .map((s) => `${s.label}: ${s.value}`)
    .join(' | ');

  return `Você é um roteirista de YouTube Shorts especialista em copy de VENDAS para reviews de produtos no Brasil.
Gere um roteiro de vídeo vertical 9:16 de 45 A 55 SEGUNDOS (~125-140 palavras faladas em pt-BR) que CONVERTE clique em compra.

PRODUTO: ${review.product}
CATEGORIA: ${review.category}
PREÇO: ${review.priceNew} (antes ${review.priceOld})
NOTA: ${review.hero?.overallScore ?? review.verdict?.score}/10
RESUMO: ${review.hero?.lead || ''}
PRÓS: ${pros}
CONTRAS: ${cons}
SPECS: ${specs}
VEREDITO: ${review.verdict?.text || ''}
URL REVIEW: ${siteUrl}/review/${review.slug}
LINK OFERTA: ${review.affiliateUrl || ''}

ESTRUTURA DE VENDAS (obrigatória):
1. Hook (0-3s): dor ou desejo + preço. Ex: "Cansado de pagar caro? Esse aqui custa R$X".
2. Solução: 3 benefícios práticos (não specs frias — traduza specs em vantagem de uso).
3. Prova: nota + "testado/aprovado" + 1 contra honesto (credibilidade vende).
4. Fechamento: preço atual + CTA direto para a oferta.

REGRAS:
1. 5 a 6 cenas. Cada cena: narration (1-2 frases curtas, tom de recomendação de amigo) + onScreenText (CAIXA ALTA, máx 5 palavras, foco em BENEFÍCIO ou PREÇO) + durationSec (7-10s). NÃO inclua campo images — o worker usa a imagem real do review.
2. Linguagem falada, natural, sem emoji, sem markdown.
3. NUNCA invente desconto, % off, brinde ou garantia que não estão nos dados. Urgência permitida só genérica ("link na descrição").
4. priceHighlight: "PREÇO_ATUAL (antes PREÇO_ANTIGO)" usando exatamente os preços acima; se não houver preço antigo, só o atual.
5. offerBadge: "OFERTA" se houver preço antigo menor que... (apenas "OFERTA" ou string vazia).
6. finalCta: frase curta de ação com a palavra "descrição" (ex: "O link da oferta tá na descrição").
7. title: até 100 chars, produto + preço + gancho + #shorts.
8. description: 1 frase de benefício + preço + "Link da oferta: ..." + "Review completo: ..." + "(link afiliado)" + 3 hashtags.
9. tags: 8-12 tags pt-BR com intenção de compra ("comprar", "vale a pena", "preço", "review").
10. Soma de durationSec entre 45 e 58. fullNarration = narrações unidas com espaço.

Retorne APENAS JSON válido nesta estrutura exata:
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "hook": "string",
  "scenes": [{ "narration": "string", "onScreenText": "string", "durationSec": number }],
  "fullNarration": "string",
  "estimatedSeconds": number,
  "cta": "string",
  "priceHighlight": "string",
  "offerBadge": "string",
  "finalCta": "string"
}`;
}

// Cache em memória da lista de modelos free (1h) p/ não hitar /models a cada roteiro
let cachedFreeModels: { list: string[]; at: number } | null = null;
const FALLBACK_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3.5-lightning:free',
  'google/gemma-4-31b-it:free',
];

// Busca todos os modelos :free texto→texto disponíveis no OpenRouter,
// em rodízio diário para não esgotar sempre o mesmo modelo primeiro.
async function getOpenRouterFreeModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedFreeModels && now - cachedFreeModels.at < 3600_000) return cachedFreeModels.list;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`models: ${res.status}`);
    const json = (await res.json()) as any;
    const all = Array.isArray(json?.data) ? json.data : [];
    const free = all
      .filter((m: any) => typeof m?.id === 'string' && m.id.endsWith(':free'))
      .filter((m: any) => String(m?.architecture?.modality || '').includes('text->text'))
      .map((m: any) => m.id as string);
    if (!free.length) throw new Error('nenhum modelo :free texto');
    // Rodízio pelo dia do ano: distribui o uso entre os modelos
    const day = Math.floor(now / 86400000);
    const rotated = [...free.slice(day % free.length), ...free.slice(0, day % free.length)];
    // Limita a 12 tentativas p/ não estourar o tempo da serverless no pior caso
    cachedFreeModels = { list: rotated.slice(0, 12), at: now };
    console.log(`[VideoScript] ${free.length} modelos :free encontrados, tentando até 12`);
    return cachedFreeModels.list;
  } catch (e: any) {
    console.warn('[VideoScript] Falha ao listar modelos OpenRouter, usando lista fixa:', e.message);
    return FALLBACK_FREE_MODELS;
  }
}

async function callAI(prompt: string): Promise<any> {  // 1. Tenta Veo 3.1 (Google AI Studio, grátis com quota diária)
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': googleKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
          }),
        }
      );
      if (!res.ok) {
        const errTxt = await res.text();
        // 403 ou 429 = quota zerada -> cai para Gemini/OpenRouter automaticamente
        if (res.status === 403 || res.status === 429) {
          console.warn('[VideoScript] Veo quota zerada, tentando Gemini/OpenRouter');
        } else {
          console.warn('[VideoScript] Veo error: ', res.status, errTxt);
        }
        // Não throwing: continua para o fallback
      } else {
        const data = await res.json();
        // Veo retorna: { result: { asset: { uri: 'gs://...' } } }
        const videoUri = data?.result?.asset?.uri || data?.video?.uri;
        if (videoUri) {
          console.log('[VideoScript] Veo gerou vídeo:', videoUri.slice(0, 80));
          // Retorna o URI do vídeo para o worker baixar
          return { videoUri, provider: 'Veo 3.1' };
        }
        // Se não veio vídeo, avisa e cai para Gemini
        console.warn('[VideoScript] Veo não retornou URI de vídeo, tentando Gemini');
      }
    } catch (e: any) {
      console.warn('[VideoScript] Veo falhou ou quota zerada:', e.message, '-> tentando Gemini');
    }
  }

  // 2. Tenta Gemini (modelo padrão, usando GEMINI_API_KEY)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.8 },
      });
      const text = result.response.text();
      if (!text) throw new Error('Empty Gemini response');
      const parsed = extractJson(text);
      if (parsed) {
        console.log('[VideoScript] Gemini gerou roteiro');
        return parsed;
      }
      throw new Error('Could not parse JSON from Gemini');
    } catch (geminiErr: any) {
      console.warn('[VideoScript] Gemini falhou:', geminiErr.message, '-> fallback OpenRouter');
    }
  }

  // 3. Tenta Groq (free 14.4k/dia, sem 429) antes do OpenRouter
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== 'your-groq-api-key') {
    const groqModels = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini', 'allam-2-7b'];
    for (const gModel of groqModels) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: gModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          console.warn(`[VideoScript] Groq ${gModel}: ${res.status} ${txt.slice(0,120)}`);
          continue;
        }
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content || '';
        const parsed = extractJson(content);
        if (!parsed) continue;
        console.log(`[VideoScript] Groq ${gModel} gerou roteiro`);
        return parsed;
      } catch (e: any) {
        console.warn(`[VideoScript] Groq ${gModel} falhou:`, e.message);
      }
    }
    console.warn('[VideoScript] Groq falhou em todos modelos, tentando OpenRouter');
  }

  // 4. Fallback: OpenRouter — descobre dinamicamente TODOS os modelos :free
  // via /api/v1/models e tenta em rodízio até um responder
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Configure GEMINI_API_KEY ou OPENROUTER_API_KEY');
  const models = await getOpenRouterFreeModels(apiKey);
  let lastErr = '';
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
          'X-Title': 'Vetor Blog Video',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        lastErr = `OpenRouter ${model}: ${res.status}`;
        console.warn(`[VideoScript] ${lastErr}, tentando próximo...`);
        continue;
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '';
      const parsed = extractJson(content);
      if (!parsed) {
        lastErr = `OpenRouter ${model}: sem JSON`;
        continue;
      }
      return parsed;
    } catch (err: any) {
      lastErr = err.message;
      console.warn(`[VideoScript] OpenRouter ${model} falhou:`, err.message);
    }
  }
  throw new Error(`OpenRouter falhou (${lastErr})`);
}

// Gate anti-roteiro-vazio: LLM às vezes retorna JSON vazio/truncado e os
// fallbacks acima mascaram (title/estimatedSeconds sempre parecem válidos).
// Chamar antes de marcar script_ready — joga erro p/ errors[] em vez de
// deixar o worker rodar edge-tts num fullNarration de 0 bytes.
export function assertValidVideoScript(s: any): void {
  // fullNarration precisa ter conteúdo falável (~45-55s ≈ 125-140 palavras)
  const narration = typeof s?.fullNarration === 'string' ? s.fullNarration.trim() : '';
  if (narration.length < 200) {
    throw new Error(`VideoScript inválido: fullNarration curta (${narration.length} chars, mínimo 200)`);
  }
  // Precisa de cenas suficientes para o carrossel 9:16
  if (!Array.isArray(s?.scenes) || s.scenes.length < 3) {
    throw new Error(`VideoScript inválido: scenes precisa de ao menos 3 (recebido ${Array.isArray(s?.scenes) ? s.scenes.length : 'não-array'})`);
  }
  // Toda cena precisa de fala — sem narration o TTS gera trecho mudo
  for (let i = 0; i < s.scenes.length; i++) {
    const n = typeof s.scenes[i]?.narration === 'string' ? s.scenes[i].narration.trim() : '';
    if (!n) {
      throw new Error(`VideoScript inválido: cena ${i} sem narration`);
    }
  }
  // Título é obrigatório p/ Shorts/upload
  if (typeof s?.title !== 'string' || !s.title.trim()) {
    throw new Error('VideoScript inválido: title vazio');
  }
  // Duração total precisa caber no formato Shorts (soma dos durationSec)
  const total = s.scenes.reduce((a: number, sc: any) => a + (Number(sc?.durationSec) || 0), 0);
  if (total < 35 || total > 70) {
    throw new Error(`VideoScript inválido: soma durationSec fora do range (recebido ${total}s, esperado 35-70s)`);
  }
}

export async function generateVideoScript(review: ReviewData): Promise<VideoScript> {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const siteUrl = raw.startsWith('http') ? raw : `https://${raw}`;
  const prompt = buildVideoScriptPrompt(review, siteUrl);
  const data = await callAI(prompt);

  // Sanitização: usa SEMPRE a imagem real do review (não inventa URLs)
  const realImage = review.imageUrl || '';
  const scenes: VideoScene[] = Array.isArray(data.scenes) ? data.scenes.slice(0, 7).map((s: any) => ({
    ...s,
    images: realImage ? [realImage] : [],
  })) : [];
  const estimatedSeconds =
    scenes.reduce((a: number, s: any) => a + (Number(s.durationSec) || 8), 0) || 50;

  return {
    title: String(data.title || `${review.product} vale a pena? #shorts`).slice(0, 100),
    description: String(data.description || ''),
    tags: Array.isArray(data.tags) ? data.tags : [],
    hook: String(data.hook || ''),
    scenes,
    fullNarration: String(data.fullNarration || scenes.map((s: any) => s.narration).join(' ')),
    estimatedSeconds,
    cta: String(data.cta || 'Link da oferta na descrição'),
    priceHighlight: String(data.priceHighlight || review.priceNew || '').slice(0, 60),
    offerBadge: String(data.offerBadge || '').slice(0, 20),
    finalCta: String(data.finalCta || data.cta || 'O link da oferta tá na descrição'),
  };
}
