/**
 * Turns an LLM `visualCue` into a short, viewer-facing headline.
 *
 * The script generator asks for a "visual chapter", but models often return a
 * shot direction ("Imagem estática do produto em ângulo de 45 graus"). Showing
 * that verbatim in the video looks like leaked production notes, so direction
 * prefixes are stripped and directions fall back to a phrase from the narration.
 */

const DIRECTION_PREFIXES: RegExp[] = [
  /^imagem est[áa]tica(?:\s+(?:do|da|de|dos|das))?\s*/i,
  /^close[- ]?up(?:\s+(?:em|no|na|nos|nas|do|da|de))?\s*/i,
  /^close(?:\s+(?:em|no|na|nos|nas|do|da|de))?\s+/i,
  /^plano(?:\s+(?:aberto|fechado|m[ée]dio|geral|detalhe))?(?:\s+(?:do|da|de))?\s*/i,
  /^(?:tela|divis[ãa]o de tela)\s+(?:dividida\s+)?(?:mostrando|com)\s+/i,
  /^foto(?:\s+(?:do|da|de))?\s+/i,
  /^[íi]cones?\s+gen[ée]ricos?(?:\s+(?:de|do|da))?\s*/i,
  /^[íi]cone(?:\s+(?:de|do|da))?\s+/i,
  /^produto em destaque(?:\s+com)?\s*/i,
];

const DIRECTION_MARKERS =
  /\b(?:zoom|close[- ]?up|enquadramento|[âa]ngulo|graus|tela dividida|divis[ãa]o de tela|mostrando|exibindo|aparecendo|lado a lado|[íi]cones?|fundo branco|fundo neutro|c[âa]mera|transi[çc][ãa]o|fade|corte seco)\b/i;

const LEADING_CONNECTORS = /^(?:e|mas|j[áa]|ent[ãa]o|por[ée]m|al[ée]m disso|depois)\s+/i;

const normalize = (value: unknown): string => String(value || '').replace(/\s+/g, ' ').trim();

const trimEdges = (value: string): string =>
  value.replace(/^[\s:;,.!?–—-]+/, '').replace(/[\s:;,.!?–—-]+$/, '');

const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

/** Cuts at a word boundary so a headline never ends in the middle of a word. */
export function truncateHeadline(value: string, maxChars = 48): string {
  const text = trimEdges(normalize(value));
  if (text.length <= maxChars) return capitalize(text);

  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const clipped = lastSpace >= 8 ? cut.slice(0, lastSpace) : cut;
  return capitalize(trimEdges(clipped));
}

/** Short headline derived from narration, used when the cue is a shot direction. */
export function headlineFromText(text: string, fallback = '', maxChars = 48): string {
  const source = trimEdges(normalize(text).replace(LEADING_CONNECTORS, '').replace(/^(?:o|a|os|as)\s+/i, ''));
  const sentence = (source.split(/(?<=[.!?])\s+/)[0] || source).trim();
  const clause = sentence.split(/[,;:]/)[0].trim();
  const candidate = clause.length >= 16 ? clause : sentence;

  return truncateHeadline(candidate, maxChars) || truncateHeadline(fallback, maxChars);
}

export function toHeadline(cue: string, fallback = ''): string {
  let text = normalize(cue);

  for (const prefix of DIRECTION_PREFIXES) {
    const next = text.replace(prefix, '');
    if (next !== text) {
      text = next;
      break;
    }
  }

  text = text.replace(/\s*\([^)]*\)\s*$/, '');
  text = (text.split(/\s+[—–|]\s+/)[0] || text);
  text = trimEdges(text);

  if (!text || DIRECTION_MARKERS.test(text)) {
    const fallbackHeadline = truncateHeadline(fallback);
    if (fallbackHeadline) return fallbackHeadline;
  }

  return truncateHeadline(text) || truncateHeadline(fallback) || 'Análise Vetor';
}

export type HeadlineFitOptions = {
  width: number;
  maxHeight: number;
  maxSize: number;
  minSize: number;
  lineHeight?: number;
  /** Conservative average glyph width, relative to the font size. */
  charWidthRatio?: number;
};

export function estimateHeadlineLines(
  text: string,
  fontSize: number,
  width: number,
  charWidthRatio = 0.55,
): number {
  const charsPerLine = Math.max(1, Math.floor(width / Math.max(1, fontSize * charWidthRatio)));
  return Math.max(1, Math.ceil(normalize(text).length / charsPerLine));
}

/**
 * Picks the largest font size whose estimated line count still fits the header
 * band. Remotion has no DOM measurement, so the estimate is deliberately
 * conservative (wider glyphs) and the result is validated on real frames.
 */
export function fitHeadlineSize(text: string, options: HeadlineFitOptions): number {
  const {
    width,
    maxHeight,
    maxSize,
    minSize,
    lineHeight = 1.02,
    charWidthRatio = 0.55,
  } = options;
  const content = normalize(text);

  for (let size = Math.round(maxSize); size >= minSize; size -= 2) {
    const lines = estimateHeadlineLines(content, size, width, charWidthRatio);
    if (lines * size * lineHeight <= maxHeight) return size;
  }

  return minSize;
}
