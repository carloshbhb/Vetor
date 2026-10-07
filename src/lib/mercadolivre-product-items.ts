import type { MLMatchCandidate } from "@/lib/mercadolivre-search";

type ProductDetail = {
  name?: string;
  permalink?: string;
  sold_quantity?: number;
  buy_box_winner?: {
    item_id?: string;
    category_id?: string;
    seller_id?: number;
    price?: number;
    sold_quantity?: number;
    condition?: string;
    permalink?: string;
  } | null;
};

type ProductRow = {
  productId: string;
  title: string;
  productUrl: string;
};

type ProductItemsResponse = {
  results?: Array<{
    item_id?: string;
    title?: string;
    price?: number;
    sold_quantity?: number;
    category_id?: string;
    condition?: string;
    seller_id?: number;
    permalink?: string;
  }>;
};

const ML_API = "https://api.mercadolibre.com";

async function requestProductItems(productId: string, accessToken: string): Promise<ProductItemsResponse> {
  const response = await fetch(
    ML_API + "/products/" + encodeURIComponent(productId) + "/items?limit=50",
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Mercado Livre product items " + response.status);
  }

  return response.json() as Promise<ProductItemsResponse>;
}

export async function expandMercadoLivreCandidates(
  row: ProductRow,
  detail: ProductDetail,
  query: string,
  accessToken: string,
  scoreFn: (query: string, title: string) => number
): Promise<MLMatchCandidate[]> {
  const winner = detail.buy_box_winner || null;

  if (winner?.item_id) {
    const title = String(detail.name || row.title).trim();
    const url = String(winner.permalink || detail.permalink || row.productUrl).trim();
    return url
      ? [{
          productId: row.productId,
          itemId: String(winner.item_id),
          title,
          url,
          soldQuantity: Number.isFinite(Number(winner.sold_quantity ?? detail.sold_quantity))
            ? Number(winner.sold_quantity ?? detail.sold_quantity)
            : 0,
          price: Number.isFinite(Number(winner.price)) ? Number(winner.price) : null,
          categoryId: winner.category_id ? String(winner.category_id) : null,
          condition: winner.condition ? String(winner.condition) : null,
          sellerId: winner.seller_id == null ? null : Number(winner.seller_id),
          score: scoreFn(query, title),
          isBuyBoxWinner: true,
        }]
      : [];
  }

  try {
    const payload = await requestProductItems(row.productId, accessToken);
    return (Array.isArray(payload.results) ? payload.results : [])
      .slice(0, 12)
      .map((item): MLMatchCandidate | null => {
        const itemId = item.item_id ? String(item.item_id) : null;
        const title = String(item.title || detail.name || row.title).trim();
        const url = String(item.permalink || "").trim();
        if (!itemId || !url) return null;

        return {
          productId: row.productId,
          itemId,
          title,
          url,
          soldQuantity: Number.isFinite(Number(item.sold_quantity)) ? Number(item.sold_quantity) : 0,
          price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
          categoryId: item.category_id ? String(item.category_id) : null,
          condition: item.condition ? String(item.condition) : null,
          sellerId: item.seller_id == null ? null : Number(item.seller_id),
          score: scoreFn(query, title),
          isBuyBoxWinner: false,
        };
      })
      .filter((item): item is MLMatchCandidate => Boolean(item));
  } catch {
    return [];
  }
}
