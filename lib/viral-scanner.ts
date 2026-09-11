import { generateText } from './ai';

export interface ViralOutlier {
  videoId: string;
  title: string;
  channel: string;
  subs: number;
  views: number;
  viewRatio: number;
  format: string;
  hookStyle: string;
  thumbnailPattern: string;
  category: string;
  adaptedAngle?: string;
}

export interface AdaptationSuggestion {
  outlier: ViralOutlier;
  adaptedConcept: {
    angle: string;
    hook: string;
    thumbnailStyle: string;
    targetProduct?: string;
  };
  crossNichePotential: number;
}

export interface ViralScanResult {
  outliers: ViralOutlier[];
  scannedAt: string;
  categoriesScanned: string[];
  adaptationSuggestions: AdaptationSuggestion[];
}

const VIRAL_CATEGORIES = [
  'tecnologia',
  'smartphones',
  'wearables',
  'fones de ouvido',
  'gaming',
  'casa inteligente',
  'notebooks',
  'comparativo',
];

const FORMAT_TECH_MAP: Record<string, { angle: string; hook: string; potential: number }> = {
  desafio: {
    angle: 'Testei o {product} por {X} dias',
    hook: 'Sobreviveu a tudo que eu fiz com ele',
    potential: 85,
  },
  comparativo: {
    angle: '{Product A} vs {Product B}: o que ninguém conta',
    hook: 'Um deles é furada',
    potential: 90,
  },
  lista: {
    angle: '5 motivos para não comprar {product}',
    hook: 'O motivo #3 vai te surpreender',
    potential: 75,
  },
  react: {
    angle: 'Reagindo às reviews do {product}',
    hook: 'Ninguém está contando a verdade',
    potential: 70,
  },
  unboxing: {
    angle: 'O que ninguém mostra do {product}',
    hook: 'A embalagem esconde isso',
    potential: 60,
  },
  review: {
    angle: '{product}: vale o preço depois de {X} dias?',
    hook: 'Minha opinião mudou completamente',
    potential: 80,
  },
};

export function classifyHookStyle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('r$') || /\d+[\.,]\d{2}/.test(title)) return 'dor+preco';
  if (lower.includes('vs') || lower.includes('comparativo')) return 'quebra-expectativa';
  if (/\d+\s*(dias?|horas?|semanas?|meses?)/i.test(title)) return 'countdown';
  if (lower.includes('melhor') || lower.includes('pior')) return 'dados-brutais';
  if (title.includes('?')) return 'pergunta-direta';
  return 'pergunta-direta';
}

export function classifyThumbnailPattern(title: string, format: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('r$') || lower.includes('vs') || format === 'comparativo') return 'lado-a-lado';
  if (format === 'desafio' || /\d+\s*(dias?|horas?)/i.test(title)) return 'timer';
  if (format === 'review' || lower.includes('vale a pena') || lower.includes('análise')) return 'produto-destaque';
  if (format === 'react' || lower.includes('reagindo')) return 'rosto-emocao';
  return 'close-up';
}

export function analyzeOutlier(outlier: ViralOutlier): {
  hookStyle: string;
  thumbnailPattern: string;
  format: string;
} {
  const hookStyle = classifyHookStyle(outlier.title);
  const thumbnailPattern = classifyThumbnailPattern(outlier.title, outlier.format);
  return { hookStyle, thumbnailPattern, format: outlier.format };
}

export async function detectOutliersViaAI(category: string): Promise<ViralOutlier[]> {
  const prompt =
    `Find 5 YouTube videos from channels with less than 10K subscribers that got over 100K views in the last 30 days about ${category}. ` +
    'For each, provide: videoId, title, channel name, estimated subs, estimated views, format type (one of: desafio, comparativo, lista, react, unboxing, review), hook style, thumbnail pattern. ' +
    'Response must be a JSON array of objects.';

  try {
    const response = await generateText({
      prompt,
      responseJson: true,
      temperature: 0.5,
      maxOutputTokens: 3000,
    });

    const parsed = JSON.parse(response);
    const items: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : parsed?.videos ?? parsed?.outliers ?? [];

    return items
      .filter((item) => item.videoId && item.title && item.channel)
      .map((item) => {
        const subs = typeof item.subs === 'number' ? item.subs : parseInt(String(item.subs ?? '5000'), 10);
        const views = typeof item.views === 'number' ? item.views : parseInt(String(item.views ?? '100000'), 10);
        const viewRatio = subs > 0 ? Math.round((views / Math.max(subs * 10, 1)) * 10) / 10 : 10;
        const title = String(item.title ?? '');
        const format = String(item.format ?? 'review');
        const hookStyle = String(item.hookStyle ?? classifyHookStyle(title));
        const thumbnailPattern = String(item.thumbnailPattern ?? classifyThumbnailPattern(title, format));

        return {
          videoId: String(item.videoId ?? ''),
          title,
          channel: String(item.channel ?? ''),
          subs,
          views,
          viewRatio,
          format,
          hookStyle,
          thumbnailPattern,
          category,
        };
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[ViralScanner] AI detection failed for ${category}: ${msg}`);
    return [];
  }
}

export function generateAdaptations(outliers: ViralOutlier[]): AdaptationSuggestion[] {
  return outliers.map((outlier) => {
    const mapping = FORMAT_TECH_MAP[outlier.format] ?? FORMAT_TECH_MAP.review;
    const angle = mapping.angle
      .replace('{product}', '[product]')
      .replace('{Product A}', '[Product A]')
      .replace('{Product B}', '[Product B]')
      .replace('{X}', '7');

    return {
      outlier,
      adaptedConcept: {
        angle,
        hook: mapping.hook,
        thumbnailStyle: classifyThumbnailPattern(outlier.title, outlier.format),
      },
      crossNichePotential: mapping.potential,
    };
  });
}

export async function scanViralOutliers(
  options?: { categories?: string[]; minViewRatio?: number; maxResults?: number }
): Promise<ViralScanResult> {
  const categories = options?.categories ?? VIRAL_CATEGORIES;
  const minViewRatio = options?.minViewRatio ?? 10;
  const maxResults = options?.maxResults ?? 15;

  console.log(`[ViralScanner] Scanning ${categories.length} categories...`);

  const allOutliers: ViralOutlier[] = [];

  for (const category of categories) {
    try {
      const outliers = await detectOutliersViaAI(category);
      allOutliers.push(...outliers);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ViralScanner] Failed to scan ${category}: ${msg}`);
    }
  }

  const filtered = allOutliers
    .filter((o) => o.viewRatio >= minViewRatio)
    .sort((a, b) => b.viewRatio - a.viewRatio)
    .slice(0, maxResults);

  const adaptationSuggestions = generateAdaptations(filtered);

  console.log(
    `[ViralScanner] Found ${filtered.length} outliers, ${adaptationSuggestions.length} adaptations`
  );

  return {
    outliers: filtered,
    scannedAt: new Date().toISOString(),
    categoriesScanned: categories,
    adaptationSuggestions,
  };
}
