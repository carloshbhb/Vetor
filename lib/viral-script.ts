import { generateText } from './ai';
import { assertValidVideoScript, type VideoScript, type VideoScene } from './video-script';
import type { ViralOutlier } from './viral-scanner';

export interface ViralScriptInput {
  outlier: ViralOutlier;
  product?: string;
  category?: string;
  siteUrl: string;
}

export interface ViralScriptResult {
  script: VideoScript;
  sourceOutlier: string;
  adaptedFormat: string;
  hookScore: number;
  viralPotential: number;
}

const HOOK_MAP: Record<string, string> = {
  'dor+preco':
    'dor ou desejo + preço. Ex: "Cansado de pagar caro? Esse aqui custa R$X"',
  'quebra-expectativa':
    'expectativa → realidade. Ex: "Parece premium. Custa R$99. Mas tem um problema."',
  'countdown':
    'desafio temporal. Ex: "Testei por 30 dias. Aqui tá o que ninguém fala."',
  'dados-brutais':
    'comparação de dados. Ex: "Essa tela tem 1.000 nits. O concorrente tem 400."',
  'pergunta-direta':
    'pergunta que instiga. Ex: "Vale a pena trocar sua Mi Band por isso?"',
};

const FORMAT_MAP: Record<string, string> = {
  desafio: 'Testei o {product} por {days} dias sem parar',
  comparativo: '{product} vs {competitor}: o que ninguém conta',
  lista: '5 motivos para não comprar {product}',
  react: 'Reagindo às reviews do {product}',
  unboxing: 'Desembalando o {product}: vale o preço?',
  review: 'Review completo do {product}: nota {score}/10',
};

const POWER_WORDS = [
  'nunca', 'ninguém', 'melhor', 'pior', 'surpreendente',
  'verdade', 'honesto', 'testado', 'aprovado', 'rejeitado',
  'furada', 'vale a pena', 'compensa', 'trocar', 'problema',
  'segredo', 'real', 'verdadeiro', 'obrigatório', 'essencial',
];

function extractJson(text: string): Record<string, unknown> | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(i, j + 1)) as Record<string, unknown>;
        } catch {
          break;
        }
      }
    }
  }
  const m = text.match(/\{[\s\S]*?\}/);
  if (m) {
    try {
      return JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      /* empty */
    }
  }
  return null;
}

export function adaptFormatToReview(outlier: ViralOutlier, product?: string): string {
  const fmt = FORMAT_MAP[outlier.format] ?? FORMAT_MAP.review;
  const p = product ?? '[product]';

  return fmt
    .replace(/\{product\}/g, p)
    .replace('{days}', '30')
    .replace('{competitor}', '[concorrente]')
    .replace('{score}', '8');
}

export function buildViralPrompt(input: ViralScriptInput): string {
  const { outlier, product, siteUrl } = input;
  const concept = adaptFormatToReview(outlier, product);
  const hookDesc = HOOK_MAP[outlier.hookStyle] ?? HOOK_MAP['pergunta-direta'];
  const cat = input.category ?? outlier.category;

  return `Você é um roteirista de YouTube Shorts especialista em reviews virais de tecnologia no Brasil.
Gere um roteiro de vídeo vertical 9:16 de 45 A 55 SEGUNDOS (~125-140 palavras faladas em pt-BR) adaptado de um formato viral.

FORMATO VIRAL ORIGINAL: ${outlier.format}
CONCEITO ADAPTADO: ${concept}
CATEGORIA: ${cat}
HOOK STYLE: ${outlier.hookStyle} → ${hookDesc}
TÍTULO ORIGINAL DO VIRAL: ${outlier.title}
CANAL ORIGINAL: ${outlier.channel} (${outlier.subs} inscritos, ${outlier.views} views, viewRatio: ${outlier.viewRatio}x)
THUMBNAIL PATTERN: ${outlier.thumbnailPattern}
${outlier.adaptedAngle ? `ÂNGULO SUGERIDO: ${outlier.adaptedAngle}` : ''}

URL DO SITE: ${siteUrl}

REGRA DE PACING (obrigatória):
- 5 a 6 cenas (scenes).
- Cada cena: 7-10 segundos. Soma total entre 45 e 55 segundos.
- Cena 1: hook nos primeiros 3 segundos (obrigatório ser impactante).
- Cena 2-3: apresentação do produto + benefícios práticos.
- Cena 4-5: prova social, nota ou comparação honesta.
- Cena 6: CTA direto + preço.

REGRAS DE CONTEÚDO:
1. Narration: tom de recomendação de amigo, sem emoji, sem markdown, 1-2 frases curtas por cena.
2. onScreenText: CAIXA ALTA, máx 5 palavras, foco em BENEFÍCIO ou PREÇO.
3. title: até 100 chars, incluir #shorts e gancho viral.
4. description: 1 frase de benefício + "Link na descrição" + hashtags.
5. tags: 8-12 tags pt-BR com intenção de compra.
6. hook: frase dos primeiros 3 segundos do vídeo.
7. CTA e finalCta: sempre mencionar "link na descrição".
8. fullNarration = junção de todas as narrações com espaço.
9. NUNCA inventar dados não fornecidos.

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

export function scoreViralPotential(script: VideoScript, outlier: ViralOutlier): number {
  let score = 0;

  // viewRatio contribution (30%): max at viewRatio 50+
  const viewScore = Math.min(outlier.viewRatio / 50, 1) * 30;
  score += Math.round(viewScore);

  // Hook matches outlier hook style (25%)
  const hookLower = (script.hook ?? '').toLowerCase();
  let hookMatch = 0;
  if (outlier.hookStyle === 'dor+preco' && /\d+[.,]?\d*/.test(hookLower)) hookMatch = 25;
  else if (outlier.hookStyle === 'quebra-expectativa' && (hookLower.includes('mas') || hookLower.includes('problema'))) hookMatch = 25;
  else if (outlier.hookStyle === 'countdown' && /\d+\s*(dia|hora|semana|mes|semana)/i.test(hookLower)) hookMatch = 25;
  else if (outlier.hookStyle === 'dados-brutais' && /\d/.test(hookLower)) hookMatch = 25;
  else if (outlier.hookStyle === 'pergunta-direta' && hookLower.includes('?')) hookMatch = 25;
  if (hookMatch === 0 && hookLower.length > 5) hookMatch = 10;
  score += hookMatch;

  // Pacing matches format (20%): 5-6 scenes, each 7-10s, total 45-55s
  const sceneCount = script.scenes.length;
  const totalSec = script.scenes.reduce((a, s) => a + (s.durationSec ?? 0), 0);
  const pacingScore =
    (sceneCount >= 5 && sceneCount <= 6 ? 10 : sceneCount >= 3 ? 5 : 0) +
    (totalSec >= 45 && totalSec <= 55 ? 10 : totalSec >= 35 && totalSec <= 60 ? 5 : 0);
  score += pacingScore;

  // Title has power words (15%)
  const titleLower = (script.title ?? '').toLowerCase();
  const titlePowerCount = POWER_WORDS.filter((w) => titleLower.includes(w)).length;
  score += Math.min(titlePowerCount * 5, 15);

  // Description has CTA (10%)
  const descLower = (script.description ?? '').toLowerCase();
  if (descLower.includes('link') || descLower.includes('descrição') || descLower.includes('oferta')) {
    score += 10;
  }

  return Math.min(Math.max(score, 0), 100);
}

function sanitizeScript(raw: Record<string, unknown>): VideoScript {
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  const scenes: VideoScene[] = rawScenes.map((s: Record<string, unknown>) => ({
    narration: String(s?.narration ?? ''),
    onScreenText: String(s?.onScreenText ?? ''),
    durationSec: Number(s?.durationSec ?? 8),
  }));

  return {
    title: String(raw.title ?? 'Video viral tech #shorts').slice(0, 100),
    description: String(raw.description ?? ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    hook: String(raw.hook ?? ''),
    scenes,
    fullNarration: String(raw.fullNarration ?? scenes.map((s) => s.narration).join(' ')),
    estimatedSeconds: scenes.reduce((a, s) => a + s.durationSec, 0) || 50,
    cta: String(raw.cta ?? 'Link na descrição'),
    priceHighlight: String(raw.priceHighlight ?? ''),
    offerBadge: String(raw.offerBadge ?? ''),
    finalCta: String(raw.finalCta ?? raw.cta ?? 'Link da oferta na descrição'),
  };
}

export async function generateViralScript(input: ViralScriptInput): Promise<ViralScriptResult> {
  const prompt = buildViralPrompt(input);
  const raw = await generateText({
    prompt,
    responseJson: true,
    temperature: 0.8,
    maxOutputTokens: 4096,
  });

  const parsed = extractJson(raw);
  if (!parsed) {
    throw new Error('[ViralScript] AI returned non-parsable JSON');
  }

  const script = sanitizeScript(parsed);
  assertValidVideoScript(script);

  const viralPotential = scoreViralPotential(script, input.outlier);
  const adaptedFormat = adaptFormatToReview(input.outlier, input.product);

  let hookScore = 0;
  const hookLower = (script.hook ?? '').toLowerCase();
  if (hookLower.length >= 10) hookScore = 40;
  if (hookLower.length >= 20) hookScore = 60;
  if (hookLower.includes(input.product?.toLowerCase() ?? '')) hookScore = Math.max(hookScore, 70);
  if (hookLower.includes('?') || hookLower.includes('!')) hookScore = Math.max(hookScore, 80);

  return {
    script,
    sourceOutlier: input.outlier.videoId,
    adaptedFormat,
    hookScore: Math.min(hookScore, 100),
    viralPotential,
  };
}
