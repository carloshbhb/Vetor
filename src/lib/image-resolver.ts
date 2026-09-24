const IMAGE_CACHE: Record<string, string> = {};

export async function resolveProductImage(url: string): Promise<string> {
  if (IMAGE_CACHE[url]) return IMAGE_CACHE[url];

  try {
    if (!url || url === 'unknown') {
      const fallback = `https://www.vetor.blog/images/placeholder.webp`;
      IMAGE_CACHE[url] = fallback;
      return fallback;
    }

    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      IMAGE_CACHE[url] = url;
      return url;
    }
  } catch {
    // ignore
  }

  const fallback = `https://www.vetor.blog/images/placeholder.webp`;
  IMAGE_CACHE[url] = fallback;
  return fallback;
}

export async function resolveProductImages(
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>
): Promise<Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>> {
  const resolved = await Promise.all(
    products.map(async (p) => ({
      ...p,
      imageUrl: await resolveProductImage(p.imageUrl),
    }))
  );
  return resolved;
}
