const OFFENSIVE_PATTERNS = [
  /\b(fd[p]?|put[ae]?|c[ao]d[eao]|buc[eé]t[ae]?|arromb[ao]|cuz[ao]|piranha?|vagabund[ao]|desgra[cç][ad]?|caralho|merd[ae]|porra|fod[ae]|bosta|punheta|babaqu[ae]|otári[oa]|imbecil|idiota|burro|lixo)\b/i,
  /(?:https?:\/\/)?(?:www\.)?[^\s]+\.(com|net|org|info|xyz|tk|ml|ga|cf|gq)[^\s]*/gi,
  /(.)\1{4,}/g,
];

const SPAM_PATTERNS = [
  /(.)\1{4,}/g,
  /https?:\/\/[^\s]+/gi,
  /\b(compre|comprar|desconto|cupom|promo[cç][ao]|gratuito|clique|link|whatsapp|telegram)\b/gi,
];

export const MAX_LENGTH = 1000;
const MIN_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MIN_NAME_LENGTH = 2;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateComment(content: string, author: string): ValidationResult {
  const trimmedContent = content.trim();
  const trimmedAuthor = author.trim();

  if (trimmedAuthor.length < MIN_NAME_LENGTH) {
    return { valid: false, error: 'O nome deve ter pelo menos 2 caracteres.' };
  }

  if (trimmedAuthor.length > MAX_NAME_LENGTH) {
    return { valid: false, error: 'O nome deve ter no máximo 50 caracteres.' };
  }

  if (trimmedContent.length < MIN_LENGTH) {
    return { valid: false, error: 'O comentário deve ter pelo menos 3 caracteres.' };
  }

  if (trimmedContent.length > MAX_LENGTH) {
    return { valid: false, error: `O comentário deve ter no máximo ${MAX_LENGTH} caracteres.` };
  }

  for (const pattern of OFFENSIVE_PATTERNS) {
    if (pattern.test(trimmedContent) || pattern.test(trimmedAuthor)) {
      return { valid: false, error: 'O comentário contém linguagem inadequada.' };
    }
  }

  const spamScore = SPAM_PATTERNS.reduce((score, pattern) => {
    const matches = trimmedContent.match(pattern);
    return score + (matches?.length || 0);
  }, 0);

  if (spamScore >= 3) {
    return { valid: false, error: 'O comentário parece ser spam.' };
  }

  if (/(.)\1{4,}/g.test(trimmedContent)) {
    return { valid: false, error: 'O comentário contém caracteres repetidos excessivamente.' };
  }

  const words = trimmedContent.split(/\s+/);
  if (words.length > 0) {
    const capsCount = words.filter(w => w === w.toUpperCase() && w.length > 2).length;
    if (capsCount / words.length > 0.5 && words.length > 3) {
      return { valid: false, error: 'Evite usar muitas letras maiúsculas.' };
    }
  }

  return { valid: true };
}

export function sanitizeComment(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '');
}

export function sanitizeAuthor(author: string): string {
  return author
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, MAX_NAME_LENGTH);
}
