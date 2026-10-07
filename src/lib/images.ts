// Domínios permitidos em next.config.ts — fora deles, next/image rejeita o src
// e a página quebra. Centralizar aqui evita 500 em conteúdo do CMS.
const ALLOWED_IMAGE_HOSTS = new Set([
  'http2.mlstatic.com',
  'www.vetor.blog',
  'images.unsplash.com',
  'images3.kabum.com.br',
  'www.tupi.com.py',
  'www.tmt.my',
  'images.tcdn.com.br',
  'xiaomistoreph.com',
  'bfasset.costco-static.com',
  'resources.claroshop.com',
]);

export const IMAGE_PLACEHOLDER = '/images/placeholder.svg';

export function safeImageSrc(src: string | null | undefined): string {
  if (!src || !src.trim()) return IMAGE_PLACEHOLDER;
  try {
    const host = new URL(src, 'https://www.vetor.blog').hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.has(host) ? src : IMAGE_PLACEHOLDER;
  } catch {
    return IMAGE_PLACEHOLDER;
  }
}

export function formatScoreBR(score: number | null | undefined): string | null {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return null;
  return score.toFixed(1).replace('.', ',');
}
