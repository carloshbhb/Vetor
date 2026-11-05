/**
 * Shared canonical form for a product name.
 *
 * The daily review discovery and the queue refill must agree on what "the same
 * product" means, otherwise the refill promotes the same product twice and the
 * discovery creates two reviews for it.
 */
export function canonicalProductName(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^\s*(?:(?:review|an[aá]lise(?:\s+completa)?|avaliação|avaliacao)\s+)+/i, '');
  normalized = normalized.replace(/^\s*(?:notebook|laptop|controle|controlador)\s+/i, '');
  normalized = normalized.replace(/\s*[:–—-]\s*(?:an[aá]lise|review|vale\s+a\s+pena)\b[\s\S]*$/i, '');
  normalized = normalized.replace(/\s+(?:an[aá]lise\s+completa|review|vale\s+a\s+pena)\??\s*$/i, '');
  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
