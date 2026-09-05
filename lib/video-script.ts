// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Video Script Generator (Review → Shorts)
// Gera roteiro de 45-55s (~130 palavras) pronto para montar MP4 9:16
// e publicar via YouTube Data API v3. YouTube Create não tem API,
// então o fluxo é: gerar MP4 aqui → abrir no Create ou subir direto.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReviewData } from '@/lib/types';

export interface VideoScene {
  narration: string; // fala da cena (pt-BR)
  onScreenText: string; // texto grande na tela (máx 6 palavras)
  durationSec: number;
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
1. 5 a 6 cenas. Cada cena: narration (1-2 frases curtas, tom de recomendação de amigo) + onScreenText (CAIXA ALTA, máx 5 palavras, foco em BENEFÍCIO ou PREÇO) + durationSec (7-10s).
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

async function callAI(prompt: string): Promise<any> {
  // 1. Tenta Veo 3.1 (Google AI Studio, grátis com quota diária)
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateContent?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        console.log('[VideoScript] Gemini gerou roteiro');
        return JSON.parse(m[0]);
      }
      throw new Error('Could not parse JSON from Gemini');
    } catch (geminiErr: any) {
      console.warn('[VideoScript] Gemini falhou:', geminiErr.message, '-> fallback OpenRouter');
    }
  }

  // 3. Fallback: OpenRouter (modelos free, já existentes)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Configure GEMINI_API_KEY ou OPENROUTER_API_KEY');
  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'nvidia/nemotron-3.5-lightning:free',
    'google/gemma-4-31b-it:free',
  ];
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
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) {
        lastErr = `OpenRouter ${model}: sem JSON`;
        continue;
      }
      return JSON.parse(m[0]);
    } catch (err: any) {
      lastErr = err.message;
      console.warn(`[VideoScript] OpenRouter ${model} falhou:`, err.message);
    }
  }
  throw new Error(`OpenRouter falhou (${lastErr})`);
}

export async function generateVideoScript(review: ReviewData): Promise<VideoScript> {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const siteUrl = raw.startsWith('http') ? raw : `https://${raw}`;
  const prompt = buildVideoScriptPrompt(review, siteUrl);
  const data = await callAI(prompt);

  // Sanitização mínima
  const scenes: VideoScene[] = Array.isArray(data.scenes) ? data.scenes.slice(0, 7) : [];
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
