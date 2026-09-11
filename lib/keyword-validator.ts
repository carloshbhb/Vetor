import type { TrendSignal } from './trend-scanner';
import { getLightweightReviews } from './db';

export interface ValidatedKeyword {
  product: string;
  category: string;
  keywordScore: number;
  searchVolume?: string;
  seoDifficulty?: string;
  recommendation: 'prioritize' | 'consider' | 'skip';
  reasons: string[];
}

export interface ValidationReport {
  validated: ValidatedKeyword[];
  summary: {
    total: number;
    prioritize: number;
    consider: number;
    skip: number;
    avgScore: number;
  };
  validatedAt: string;
}

const CATEGORY_DIFFICULTY: Record<string, { difficulty: string; volume: string }> = {
  'Notebooks': { difficulty: 'alta', volume: 'alto' },
  'Tablets': { difficulty: 'alta', volume: 'medio' },
  'Fones de Ouvido': { difficulty: 'media', volume: 'alto' },
  'Wearables / Smartbands': { difficulty: 'media', volume: 'medio' },
  'Casa Inteligente': { difficulty: 'media', volume: 'medio' },
  'Câmeras de Segurança': { difficulty: 'baixa', volume: 'baixo' },
  'Robôs Aspiradores': { difficulty: 'baixa', volume: 'baixo' },
  'Eletroportáteis': { difficulty: 'baixa', volume: 'medio' },
  'Acessórios para Games': { difficulty: 'media', volume: 'alto' },
};

function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function deduplicateKeywords(
  keywords: ValidatedKeyword[],
  existingProducts: string[],
): ValidatedKeyword[] {
  const normalizedExisting = existingProducts.map(normalizeText);
  return keywords.filter((kw) => {
    const normalizedKw = normalizeText(kw.product);
    return !normalizedExisting.some(
      (existing) =>
        existing === normalizedKw ||
        normalizedKw.includes(existing) ||
        existing.includes(normalizedKw),
    );
  });
}

export async function estimateSEODifficulty(
  category: string,
  product: string,
): Promise<{ difficulty: string; reasons: string[] }> {
  const mapped = CATEGORY_DIFFICULTY[category];
  const reasons: string[] = [];

  if (!mapped) {
    reasons.push(`Categoria "${category}" não mapeada, assumindo dificuldade média`);
    return { difficulty: 'media', reasons };
  }

  let difficulty = mapped.difficulty;
  reasons.push(`Categoria "${category}" possui dificuldade "${difficulty}"`);

  const wordCount = product.split(/\s+/).length;
  if (wordCount >= 5) {
    if (difficulty === 'alta') {
      difficulty = 'media';
      reasons.push('Produto é long-tail (5+ palavras), reduzindo dificuldade');
    } else if (difficulty === 'media') {
      difficulty = 'baixa';
      reasons.push('Produto é long-tail (5+ palavras), reduzindo dificuldade');
    } else {
      reasons.push('Produto é long-tail (5+ palavras), já é competitivo');
    }
  } else if (wordCount <= 2) {
    if (difficulty === 'baixa') {
      difficulty = 'media';
      reasons.push('Produto curto (2 palavras), aumentando competitividade');
    } else if (difficulty === 'media') {
      difficulty = 'alta';
      reasons.push('Produto curto (2 palavras), aumentando competitividade');
    }
  }

  return { difficulty, reasons };
}

export async function estimateSearchVolume(
  category: string,
): Promise<{ volume: string; reasons: string[] }> {
  const mapped = CATEGORY_DIFFICULTY[category];
  const reasons: string[] = [];

  if (!mapped) {
    reasons.push(`Categoria "${category}" não mapeada, assumindo volume médio`);
    return { volume: 'medio', reasons };
  }

  reasons.push(`Categoria "${category}" possui volume "${mapped.volume}"`);
  return { volume: mapped.volume, reasons };
}

export async function validateSingleKeyword(
  signal: TrendSignal,
): Promise<ValidatedKeyword> {
  const reasons: string[] = [];

  const trendScore = signal.score;
  reasons.push(`Score de tendência: ${trendScore}/100`);

  const { difficulty, reasons: difficultyReasons } = await estimateSEODifficulty(
    signal.category,
    signal.product,
  );
  reasons.push(...difficultyReasons);

  const { volume, reasons: volumeReasons } = await estimateSearchVolume(signal.category);
  reasons.push(...volumeReasons);

  const difficultyScore =
    difficulty === 'baixa' ? 30 : difficulty === 'media' ? 20 : 10;

  const volumeScore = volume === 'alto' ? 30 : volume === 'medio' ? 20 : 10;

  const keywordScore = Math.round(trendScore * 0.4 + difficultyScore + volumeScore);

  let recommendation: 'prioritize' | 'consider' | 'skip';
  if (keywordScore >= 70) {
    recommendation = 'prioritize';
  } else if (keywordScore >= 40) {
    recommendation = 'consider';
  } else {
    recommendation = 'skip';
  }

  return {
    product: signal.product,
    category: signal.category,
    keywordScore,
    searchVolume: volume,
    seoDifficulty: difficulty,
    recommendation,
    reasons,
  };
}

export async function validateKeywords(
  signals: TrendSignal[],
): Promise<ValidationReport> {
  const existingReviews = await getLightweightReviews();
  const existingProducts = existingReviews.map((r) => r.product);

  const validated: ValidatedKeyword[] = [];
  for (const signal of signals) {
    const result = await validateSingleKeyword(signal);
    validated.push(result);
  }

  const deduped = deduplicateKeywords(validated, existingProducts);

  const sorted = [...deduped].sort((a, b) => b.keywordScore - a.keywordScore);

  const prioritize = sorted.filter((k) => k.recommendation === 'prioritize').length;
  const consider = sorted.filter((k) => k.recommendation === 'consider').length;
  const skip = sorted.filter((k) => k.recommendation === 'skip').length;
  const avgScore =
    sorted.length > 0
      ? Math.round(sorted.reduce((acc, k) => acc + k.keywordScore, 0) / sorted.length)
      : 0;

  return {
    validated: sorted,
    summary: {
      total: sorted.length,
      prioritize,
      consider,
      skip,
      avgScore,
    },
    validatedAt: new Date().toISOString(),
  };
}
