import type { VideoScript } from '@/lib/video-script';

export interface ThumbnailPrompt {
  composition: 'close-up' | 'side-by-side' | 'countdown' | 'face-reaction' | 'product-hero';
  subject: string;
  textOverlay: string;
  textColor: string;
  backgroundColor: string;
  focalPoint: 'top-left' | 'center' | 'bottom-right';
  aspectRatio: '16:9' | '9:16';
  width: number;
  height: number;
  elements: ThumbnailElement[];
  rules: string[];
}

export interface ThumbnailElement {
  type: 'text' | 'image' | 'shape' | 'emoji';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: Record<string, string>;
}

const DESIGN_RULES = [
  'Rule of thirds: subject off-center',
  'Mobile-first: readable at 320×180px',
  'Max 6 words on thumbnail',
  '2 font sizes max (headline + supporting)',
  'White/black stroke on text for readability',
  'ONE clear focal point',
  'Subject fills 30-40% of frame minimum',
];

export function determineComposition(script: VideoScript): ThumbnailPrompt['composition'] {
  const title = script.title.toLowerCase();
  const hook = script.hook.toLowerCase();
  const combined = `${title} ${hook}`;

  const pricePatterns = ['r$', 'preço', 'custa', 'por apenas', 'desconto', 'oferta', 'barato'];
  const isPriceFocused = pricePatterns.some((p) => combined.includes(p));

  const comparisonPatterns = ['compar', 'versus', 'vs', 'melhor que', 'compara'];
  const isComparison = comparisonPatterns.some((p) => combined.includes(p));

  const urgencyPatterns = ['último', 'acaba', 'só hoje', 'urgente', 'corre', 'rápido', 'restam'];
  const isUrgency = urgencyPatterns.some((p) => combined.includes(p));

  const surprisePatterns = ['incrível', 'surpreend', 'impossível', 'não acredito', 'olha isso'];
  const isSurprise = surprisePatterns.some((p) => combined.includes(p));

  if (isPriceFocused) return 'product-hero';
  if (isComparison) return 'side-by-side';
  if (isUrgency) return 'countdown';
  if (isSurprise) return 'face-reaction';
  return 'close-up';
}

export function extractTextOverlay(title: string, hook: string): string {
  const combined = `${title} ${hook}`;

  const priceMatch = combined.match(/r\$\s*\d+[\.,]?\d*/i);
  if (priceMatch) {
    const words = priceMatch[0].trim().split(/\s+/).slice(0, 3);
    return words.join(' ').toUpperCase();
  }

  const highlightPatterns = [
    /(\d+\s*(?:dias?|horas?|anos?|meses?))/i,
    /(\d+x\s*(?:mais|melhor|faster))/i,
    /((?:melior|pior|igual)\s*(?:que|a))/i,
  ];

  for (const pattern of highlightPatterns) {
    const match = combined.match(pattern);
    if (match) {
      const words = match[1].trim().split(/\s+/).slice(0, 4);
      return words.join(' ').toUpperCase();
    }
  }

  const words = combined
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  if (words.length <= 6) return words.join(' ').toUpperCase();
  return words.slice(0, 6).join(' ').toUpperCase();
}

export function getColorScheme(
  composition: ThumbnailPrompt['composition']
): { text: string; background: string } {
  switch (composition) {
    case 'product-hero':
      return { text: '#FF3D00', background: '#FFFFFF' };
    case 'side-by-side':
      return { text: '#1565C0', background: '#F5F5F5' };
    case 'countdown':
      return { text: '#FFD600', background: '#1A1A1A' };
    case 'face-reaction':
      return { text: '#FFFFFF', background: '#D32F2F' };
    case 'close-up':
    default:
      return { text: '#FFFFFF', background: 'transparent' };
  }
}

function buildElements(
  prompt: Omit<ThumbnailPrompt, 'elements' | 'rules'>,
  script: VideoScript
): ThumbnailElement[] {
  const elements: ThumbnailElement[] = [];

  if (prompt.composition === 'product-hero' || prompt.composition === 'close-up') {
    elements.push({
      type: 'image',
      content: script.scenes[0]?.images?.[0] || 'product-main',
      position: prompt.composition === 'product-hero' ? { x: 50, y: 50 } : { x: 60, y: 50 },
      size: prompt.composition === 'product-hero' ? { width: 40, height: 40 } : { width: 50, height: 50 },
    });
  }

  if (prompt.composition === 'side-by-side') {
    elements.push({
      type: 'image',
      content: script.scenes[0]?.images?.[0] || 'product-a',
      position: { x: 25, y: 50 },
      size: { width: 30, height: 30 },
    });
    elements.push({
      type: 'image',
      content: script.scenes[0]?.images?.[1] || 'product-b',
      position: { x: 75, y: 50 },
      size: { width: 30, height: 30 },
    });
    elements.push({
      type: 'text',
      content: 'VS',
      position: { x: 50, y: 50 },
      size: { width: 10, height: 8 },
      style: { fontSize: '48px', fontWeight: '900', color: prompt.textColor },
    });
  }

  if (prompt.composition === 'countdown') {
    elements.push({
      type: 'emoji',
      content: '⏳',
      position: { x: 50, y: 30 },
      size: { width: 20, height: 20 },
    });
    elements.push({
      type: 'shape',
      content: 'gradient-overlay',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      style: { background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)' },
    });
  }

  if (prompt.composition === 'face-reaction') {
    elements.push({
      type: 'emoji',
      content: '😱',
      position: { x: 70, y: 40 },
      size: { width: 25, height: 25 },
    });
  }

  elements.push({
    type: 'text',
    content: prompt.textOverlay,
    position: prompt.focalPoint === 'top-left' ? { x: 15, y: 15 } :
      prompt.focalPoint === 'bottom-right' ? { x: 85, y: 85 } : { x: 50, y: 50 },
    size: { width: 60, height: 15 },
    style: {
      fontSize: '36px',
      fontWeight: '900',
      color: prompt.textColor,
      stroke: '2px #000000',
      textTransform: 'uppercase',
    },
  });

  return elements;
}

export function generateThumbnailPrompt(
  script: VideoScript,
  type: 'short' | 'long' = 'short'
): ThumbnailPrompt {
  const composition = determineComposition(script);
  const textOverlay = extractTextOverlay(script.title, script.hook);
  const colorScheme = getColorScheme(composition);

  const focalPoint: ThumbnailPrompt['focalPoint'] =
    composition === 'product-hero' ? 'center' :
    composition === 'face-reaction' ? 'bottom-right' : 'top-left';

  const aspectRatio = type === 'short' ? '9:16' : '16:9';
  const width = type === 'short' ? 1080 : 1920;
  const height = type === 'short' ? 1920 : 1080;

  const base: Omit<ThumbnailPrompt, 'elements' | 'rules'> = {
    composition,
    subject: script.title,
    textOverlay,
    textColor: colorScheme.text,
    backgroundColor: colorScheme.background,
    focalPoint,
    aspectRatio,
    width,
    height,
  };

  const elements = buildElements(base, script);

  return {
    ...base,
    elements,
    rules: DESIGN_RULES,
  };
}

export function validateThumbnail(prompt: ThumbnailPrompt): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  const wordCount = prompt.textOverlay.split(/\s+/).filter(Boolean).length;
  if (wordCount > 6) {
    issues.push(`Text overlay has ${wordCount} words, max 6`);
  }

  const textReadableAtSmallSize = prompt.textOverlay.length <= 20;
  if (!textReadableAtSmallSize) {
    issues.push('Text may not be readable at 320px wide');
  }

  if (prompt.elements.length > 5) {
    issues.push(`Too many elements (${prompt.elements.length}), max 5 recommended`);
  }

  const hasImage = prompt.elements.some((e) => e.type === 'image');
  if (!hasImage && prompt.composition !== 'countdown') {
    issues.push('No image element found');
  }

  const hasText = prompt.elements.some((e) => e.type === 'text');
  if (!hasText) {
    issues.push('No text element found');
  }

  const textEl = prompt.elements.find((e) => e.type === 'text' && e.content === prompt.textOverlay);
  if (textEl) {
    const contrastRatio = calculateContrastRatio(prompt.textColor, prompt.backgroundColor);
    if (contrastRatio < 4.5) {
      issues.push(`Low contrast ratio: ${contrastRatio.toFixed(2)}:1 (min 4.5:1)`);
    }
  }

  return { valid: issues.length === 0, issues };
}

function calculateContrastRatio(fg: string, bg: string): number {
  const hexToRgb = (hex: string): [number, number, number] => {
    const cleaned = hex.replace('#', '');
    const bigint = parseInt(cleaned, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  const relativeLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  if (bg === 'transparent') {
    return 7.0;
  }

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const l1 = relativeLuminance(...fgRgb);
  const l2 = relativeLuminance(...bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
