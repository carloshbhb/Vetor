export type MercadoLivreListCandidate = {
  item_id?: string | null;
  product_id?: string | null;
  title?: string | null;
  product_url?: string | null;
  image_url?: string | null;
  last_seen_at?: string | null;
};

export type MercadoLivreMatch = {
  candidate: MercadoLivreListCandidate;
  confidence: number;
  matchedTokens: string[];
};

const STOPWORDS = new Set([
  "com","para","por","sem","de","da","do","das","dos","e","em","na","no","nas","nos",
  "novo","nova","original","preto","preta","branco","branca","azul","grafite","cinza",
  "rosa","verde","vermelho","vermelha","bivolt","127v","220v","voltagem",
]);

export function normalizeProductTokens(value: unknown): string[] {
  return [...new Set(
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/^(\\d+)(?:st|nd|rd|th)$/i, "$1"))\n      .filter((token) => (token.length >= 2 || /^\\d+$/.test(token)) && !STOPWORDS.has(token))
  )];
}

export function extractMercadoLivreItemId(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value.toUpperCase().match(/\bMLB-?(\d{6,})\b/);
  return match ? "MLB" + match[1] : null;
}

export function scoreProductTitleMatch(query: unknown, candidateTitle: unknown): MercadoLivreMatch | null {
  const queryTokens = normalizeProductTokens(query);
  const candidateTokens = new Set(normalizeProductTokens(candidateTitle));
  if (queryTokens.length < 2 || candidateTokens.size < 2) return null;

  const matchedTokens = queryTokens.filter((token) => candidateTokens.has(token));
  const confidence = matchedTokens.length / queryTokens.length;
  const modelTokens = queryTokens.filter((token) => /\d/.test(token));
  const allModelTokensMatched = modelTokens.every((token) => candidateTokens.has(token));

  if (matchedTokens.length < 2 || confidence < 0.8 || !allModelTokensMatched) return null;
  return {
    candidate: { title: String(candidateTitle || "") },
    confidence,
    matchedTokens,
  };
}

/**
 * Match only when the product/model tokens are strongly represented.
 * Variants from the same catalog product may share a product_id; ties across
 * distinct catalog products are deliberately rejected to prevent wrong media.
 */
export function findBestMercadoLivreItemMatch(
  productTitle: string,
  candidates: MercadoLivreListCandidate[],
): MercadoLivreMatch | null {
  const matches = (Array.isArray(candidates) ? candidates : [])
    .filter((item) => extractMercadoLivreItemId(item.item_id || item.product_url))
    .map((candidate) => {
      const scored = scoreProductTitleMatch(productTitle, candidate.title);
      return scored ? { ...scored, candidate } : null;
    })
    .filter((item): item is MercadoLivreMatch => Boolean(item))
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aDate = Date.parse(String(a.candidate.last_seen_at || "")) || 0;
      const bDate = Date.parse(String(b.candidate.last_seen_at || "")) || 0;
      return bDate - aDate;
    });

  const best = matches[0];
  if (!best) return null;
  const tied = matches.filter((item) => Math.abs(item.confidence - best.confidence) < 0.0001);
  const productIds = new Set(tied.map((item) => String(item.candidate.product_id || item.candidate.item_id)));
  if (productIds.size > 1) return null;
  return best;
}

export function normalizeMercadoLivreImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const allowedHost =
      host === "mlstatic.com" || host.endsWith(".mlstatic.com") ||
      host === "mlcdn.com" || host.endsWith(".mlcdn.com");
    if (!allowedHost || !["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.toString().replace(/-I\.(jpg|jpeg|webp)(?=($|\?))/i, "-O.$1");
  } catch {
    return null;
  }
}

export function dedupeMercadoLivreImages(values: unknown[], limit = 5): string[] {
  const max = Math.max(1, Math.min(8, Math.floor(Number(limit) || 5)));
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeMercadoLivreImageUrl(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= max) break;
  }
  return result;
}
