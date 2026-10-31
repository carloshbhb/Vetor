export interface VideoQueueProduct {
  name: string;
  imageUrl: string;
  slug?: string;
  product_url?: string;
}

export interface ActiveVideoAffiliateLink {
  name: string;
  slug: string;
  destination_url: string;
  total_clicks?: number | null;
}

export interface ComparativeArticlePublication {
  published_at?: string | null;
}

export interface ComparativeVideoAffiliateTarget {
  product: VideoQueueProduct;
  destinationUrl: string;
  trackedUrl: string;
  trackingMode: "managed" | "direct";
}

function normalizeName(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

function isVetorHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "vetor.blog" || host.endsWith(".vetor.blog");
}

export function isPublishedComparativeArticle(article: ComparativeArticlePublication): boolean {
  if (typeof article?.published_at !== "string" || !article.published_at.trim()) return false;
  return Number.isFinite(Date.parse(article.published_at));
}

export function resolveComparativeVideoAffiliateTarget(
  input: unknown,
  managedLinks: ActiveVideoAffiliateLink[]
): ComparativeVideoAffiliateTarget | null {
  let rawProducts: unknown = input;
  if (typeof rawProducts === "string") {
    try {
      rawProducts = JSON.parse(rawProducts);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(rawProducts) || rawProducts.length < 2) return null;

  const products = rawProducts.slice(0, 2).map((value): VideoQueueProduct | null => {
    if (!value || typeof value !== "object") return null;
    const product = value as Record<string, unknown>;
    const name = typeof product.name === "string" ? product.name.trim() : "";
    const imageUrl = typeof product.imageUrl === "string" ? product.imageUrl.trim() : "";
    if (!name || !parseHttpUrl(imageUrl)) return null;
    return {
      name,
      imageUrl,
      ...(typeof product.slug === "string" ? { slug: product.slug } : {}),
      ...(typeof product.product_url === "string" ? { product_url: product.product_url } : {}),
    };
  });
  if (products.some((product) => !product)) return null;
  const validProducts = products as VideoQueueProduct[];

  // Prefer a managed /go/ destination for either product so clicks reach affiliate_clicks.
  for (const product of validProducts) {
    const targetName = normalizeName(product.name);
    const managed = managedLinks.find((link) =>
      normalizeName(link.name) === targetName &&
      typeof link.slug === "string" && link.slug.trim() &&
      (() => {
        const destination = parseHttpUrl(link.destination_url);
        return Boolean(destination && !isVetorHost(destination.hostname));
      })()
    );
    if (managed) {
      const destination = parseHttpUrl(managed.destination_url);
      if (!destination) continue;
      return {
        product,
        destinationUrl: destination.toString(),
        trackedUrl: "https://www.vetor.blog/go/" + encodeURIComponent(managed.slug.trim()) + "/",
        trackingMode: "managed",
      };
    }
  }

  // When no central registry entry exists, keep the product CTA external rather than
  // sending a buyer to the comparison page and pretending it is a purchase link.
  for (const product of validProducts) {
    const direct = parseHttpUrl(product.product_url);
    if (direct && !isVetorHost(direct.hostname)) {
      return {
        product,
        destinationUrl: direct.toString(),
        trackedUrl: direct.toString(),
        trackingMode: "direct",
      };
    }
  }

  return null;
}
