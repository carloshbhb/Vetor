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
}

export function buildVideoScriptPrompt(review: ReviewData, siteUrl: string): string {
  const pros = (review.pros || []).slice(0, 4).join('; ');
  const cons = (review.cons || []).slice(0, 3).join('; ');
  const specs = (review.specs || [])
    .slice(0, 8)
    .map((s) => `${s.label}: ${s.value}`)
    .join(' | ');

  return `Você é um roteirista de YouTube Shorts focado em reviews de produtos no Brasil.
Gere um roteiro de vídeo vertical 9:16 de 45 A 55 SEGUNDOS (~125-140 palavras faladas em pt-BR).

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

REGRAS:
1. Hook nos primeiros 3s com pergunta ou afirmação forte + preço ("Vale R$X?").
2. 5 a 6 cenas. Cada cena: narration (1-2 frases curtas) + onScreenText (máx 6 palavras, CAIXA ALTA) + durationSec (7-10s).
3. Linguagem falada, natural, sem emoji, sem markdown, sem "cena 1:" na narração.
4. Incluir 1 contra honesto para manter credibilidade (review sincero).
5. CTA final: "Link da oferta + review completo na descrição".
6. title: até 100 chars, com nome do produto + gancho + #shorts.
7. description: 2-3 frases + URL do review + aviso de link afiliado + 3 hashtags.
8. tags: 8-12 tags pt-BR.
9. Soma de durationSec entre 45 e 58. fullNarration = narrações unidas com espaço.

Retorne APENAS JSON válido nesta estrutura exata:
{
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "hook": "string",
  "scenes": [{ "narration": "string", "onScreenText": "string", "durationSec": number }],
  "fullNarration": "string",
  "estimatedSeconds": number,
  "cta": "string"
}`;
}

async function callAI(prompt: string): Promise<any> {
  // Tenta Gemini primeiro, fallback OpenRouter (mesmo padrão de lib/generate.ts)
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
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
    } catch (e: any) {
      console.warn('[VideoScript] Gemini falhou, usando OpenRouter:', e.message);
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Configure GEMINI_API_KEY ou OPENROUTER_API_KEY');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog',
      'X-Title': 'Vetor Blog Video',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter falhou: ${res.status}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('IA não retornou JSON válido');
  return JSON.parse(m[0]);
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
  };
}
