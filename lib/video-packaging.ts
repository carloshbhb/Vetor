import type { VideoScript } from '@/lib/video-script';
import {
  generateThumbnailPrompt,
  validateThumbnail,
  type ThumbnailPrompt,
} from '@/lib/thumbnail-generator';

export interface PackagedVideo {
  script: VideoScript;
  title: string;
  fullTitle: string;
  thumbnailPrompt: ThumbnailPrompt;
  tags: string[];
  hookScore: number;
  ctrScore: number;
  retentionScore: number;
  packagingNotes: string[];
}

export interface PackagingRules {
  titleMaxChars: number;
  titleYouTubeMaxChars: number;
  maxTags: number;
  minTags: number;
  hookMaxSeconds: number;
  powerWords: string[];
  prohibitedWords: string[];
}

const RULES: PackagingRules = {
  titleMaxChars: 60,
  titleYouTubeMaxChars: 100,
  maxTags: 12,
  minTags: 8,
  hookMaxSeconds: 3,
  powerWords: ['vs', 'testado', 'comparativo', 'verdade', 'surpreendeu'],
  prohibitedWords: ['clique aqui', 'assista', 'incrível'],
};

const PURCHASE_INTENT_KEYWORDS = ['comprar', 'vale a pena', 'preço', 'review', 'análise'];
const GENERIC_INTROS = ['oi', 'beleza', 'galera', 'fala', 'e aí'];

function extractKeyword(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  return words[0] || '';
}

function titleHasPowerWord(title: string): boolean {
  const lower = title.toLowerCase();
  return RULES.powerWords.some((w) => lower.includes(w));
}

function titleHasNumber(title: string): boolean {
  return /\d/.test(title);
}

function titleHasQuestion(title: string): boolean {
  return title.includes('?');
}

function hookHasPriceOrNumber(hook: string): boolean {
  return /r\$|\d+|preço/.test(hook.toLowerCase());
}

function hookHasQuestionOrChallenge(hook: string): boolean {
  return /\?|!|test|desafio/.test(hook);
}

function hookHasGenericIntro(hook: string): boolean {
  const firstWords = hook.toLowerCase().split(/[\s,]+/).slice(0, 3);
  return firstWords.some((w) => GENERIC_INTROS.includes(w));
}

function hookMatchesTitlePromise(hook: string, title: string): boolean {
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const hookLower = hook.toLowerCase();
  return titleWords.some((w) => hookLower.includes(w));
}

export function optimizeTitle(
  script: VideoScript
): { title: string; fullTitle: string; notes: string[] } {
  const notes: string[] = [];
  let title = script.title.trim();
  const original = title;

  for (const word of RULES.prohibitedWords) {
    const regex = new RegExp(word, 'gi');
    if (regex.test(title)) {
      title = title.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
      notes.push(`Removed prohibited word "${word}"`);
    }
  }

  if (!titleHasPowerWord(title)) {
    const firstWord = extractKeyword(title);
    if (firstWord) {
      title = `${firstWord} testado: ${title.replace(firstWord, '').trim()}`.trim();
      notes.push('Added power word "testado" for CTR');
    }
  }

  const yearMatch = /20\d{2}/.test(title);
  if (!yearMatch && title.length + 6 <= RULES.titleMaxChars) {
    title = `${title} 2026`;
    notes.push('Added year 2026 for freshness');
  }

  if (title.length > RULES.titleMaxChars) {
    const shortened = title.slice(0, RULES.titleMaxChars - 3).trim();
    const lastSpace = shortened.lastIndexOf(' ');
    title = (lastSpace > 20 ? shortened.slice(0, lastSpace) : shortened) + '...';
    notes.push(`Shortened title from ${original.length} to ${title.length} chars`);
  }

  let fullTitle = script.title.trim();
  if (fullTitle.length > RULES.titleYouTubeMaxChars) {
    fullTitle = fullTitle.slice(0, RULES.titleYouTubeMaxChars - 3).trim();
    const lastSpace = fullTitle.lastIndexOf(' ');
    fullTitle = (lastSpace > 20 ? fullTitle.slice(0, lastSpace) : fullTitle) + '...';
    notes.push(`Shortened full title for YouTube upload limit`);
  }

  if (title !== original) {
    notes.push(`Original: "${original}" → Optimized: "${title}"`);
  }

  return { title, fullTitle, notes };
}

export function optimizeTags(tags: string[]): string[] {
  const lowerTags = tags.map((t) => t.toLowerCase().trim());
  const filtered = lowerTags.filter(
    (t) => t.length > 2 && !['shorts', 'youtube', 'vídeo', 'video'].includes(t)
  );

  const hasIntent = filtered.some((t) =>
    PURCHASE_INTENT_KEYWORDS.some((k) => t.includes(k))
  );
  if (!hasIntent && filtered.length > 0) {
    filtered.push('vale a pena');
  }

  const unique = Array.from(new Set(filtered));

  unique.sort((a, b) => {
    const aHasIntent = PURCHASE_INTENT_KEYWORDS.some((k) => a.includes(k)) ? 1 : 0;
    const bHasIntent = PURCHASE_INTENT_KEYWORDS.some((k) => b.includes(k)) ? 1 : 0;
    return bHasIntent - aHasIntent || b.length - a.length;
  });

  return unique.slice(0, RULES.maxTags);
}

export function scoreHook(script: VideoScript): number {
  let score = 0;

  const hookSec = script.scenes[0]?.durationSec ?? 10;
  if (hookSec <= RULES.hookMaxSeconds) score += 30;
  else if (hookSec <= 5) score += 15;

  if (hookHasPriceOrNumber(script.hook)) score += 20;
  if (hookHasQuestionOrChallenge(script.hook)) score += 20;
  if (!hookHasGenericIntro(script.hook)) score += 15;
  if (hookMatchesTitlePromise(script.hook, script.title)) score += 15;

  return Math.min(100, score);
}

export function scoreCTR(
  title: string,
  thumbnailPrompt: ThumbnailPrompt
): number {
  let score = 0;

  if (titleHasPowerWord(title)) score += 20;
  if (titleHasNumber(title)) score += 15;
  if (titleHasQuestion(title)) score += 15;

  const thumbValidation = validateThumbnail(thumbnailPrompt);
  if (thumbValidation.valid) {
    score += 20;
    score += 15;
  } else {
    const hasContrast = !thumbValidation.issues.some((i) => i.includes('contrast'));
    if (hasContrast) score += 20;
    const hasFocalPoint = thumbnailPrompt.elements.some((e) => e.type === 'image');
    if (hasFocalPoint) score += 15;
  }

  const wordCount = thumbnailPrompt.textOverlay.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 6) score += 15;

  return Math.min(100, score);
}

export function scoreRetention(script: VideoScript): number {
  let score = 0;

  const sceneCount = script.scenes.length;
  if (sceneCount >= 5 && sceneCount <= 6) score += 25;
  else if (sceneCount >= 4 && sceneCount <= 7) score += 12;

  const allScenesOk = script.scenes.every((s) => s.durationSec >= 7 && s.durationSec <= 10);
  if (allScenesOk) score += 20;
  else {
    const inRange = script.scenes.filter((s) => s.durationSec >= 7 && s.durationSec <= 10).length;
    score += Math.round((inRange / sceneCount) * 20);
  }

  const durations = script.scenes.map((s) => s.durationSec);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((a, d) => a + (d - avg) ** 2, 0) / durations.length;
  if (variance > 1) score += 20;
  else if (variance > 0.5) score += 10;

  if (script.cta && script.cta.length > 5) score += 15;

  if (script.estimatedSeconds >= 45 && script.estimatedSeconds <= 55) score += 20;
  else if (script.estimatedSeconds >= 40 && script.estimatedSeconds <= 60) score += 10;

  return Math.min(100, score);
}

export function validatePackaging(packaged: PackagedVideo): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (packaged.title.length > RULES.titleMaxChars) {
    issues.push(`Title exceeds ${RULES.titleMaxChars} chars (${packaged.title.length})`);
  }

  if (packaged.fullTitle.length > RULES.titleYouTubeMaxChars) {
    issues.push(`Full title exceeds ${RULES.titleYouTubeMaxChars} chars (${packaged.fullTitle.length})`);
  }

  if (packaged.tags.length < RULES.minTags) {
    issues.push(`Too few tags: ${packaged.tags.length} (min ${RULES.minTags})`);
  }
  if (packaged.tags.length > RULES.maxTags) {
    issues.push(`Too many tags: ${packaged.tags.length} (max ${RULES.maxTags})`);
  }

  if (packaged.hookScore < 50) {
    issues.push(`Hook score too low: ${packaged.hookScore} (min 50)`);
  }

  if (packaged.ctrScore < 40) {
    issues.push(`CTR score too low: ${packaged.ctrScore} (min 40)`);
  }

  const thumbResult = validateThumbnail(packaged.thumbnailPrompt);
  if (!thumbResult.valid) {
    issues.push(...thumbResult.issues.map((i) => `Thumbnail: ${i}`));
  }

  return { valid: issues.length === 0, issues };
}

export function packageVideo(script: VideoScript): PackagedVideo {
  const notes: string[] = [];

  const { title, fullTitle, notes: titleNotes } = optimizeTitle(script);
  notes.push(...titleNotes);

  const thumbnailPrompt = generateThumbnailPrompt(script);
  const thumbValidation = validateThumbnail(thumbnailPrompt);
  if (!thumbValidation.valid) {
    notes.push(`Thumbnail issues: ${thumbValidation.issues.join('; ')}`);
  }

  const tags = optimizeTags(script.tags);
  if (tags.length !== script.tags.length) {
    notes.push(`Tags optimized: ${script.tags.length} → ${tags.length}`);
  }

  const hookScore = scoreHook(script);
  const ctrScore = scoreCTR(title, thumbnailPrompt);
  const retentionScore = scoreRetention(script);

  if (hookScore < 50) {
    notes.push(`Hook score ${hookScore} — consider shorter hook or adding price/number`);
  }
  if (ctrScore < 40) {
    notes.push(`CTR score ${ctrScore} — add power words or question to title`);
  }

  const optimizedScript: VideoScript = {
    ...script,
    title,
    tags,
  };

  const packaged: PackagedVideo = {
    script: optimizedScript,
    title,
    fullTitle,
    thumbnailPrompt,
    tags,
    hookScore,
    ctrScore,
    retentionScore,
    packagingNotes: notes,
  };

  const validation = validatePackaging(packaged);
  if (!validation.valid) {
    notes.push(`Validation issues: ${validation.issues.join('; ')}`);
  }

  return packaged;
}
