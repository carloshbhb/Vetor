import { getValidAccessToken } from "@/lib/mercadolivre-auth";

const ML_API = "https://api.mercadolibre.com";
const SITE_ID = "MLB";

type MLProductSearchItem = {
  id?: string;
  name?: string;
  permalink?: string;
};

type MLProductSearchResponse = {
  results?: MLProductSearchItem[];
  paging?: { total?: number };
};

type MLBuyBoxWinner = {
  item_id?: string;
  category_id?: string;
  seller_id?: number;
  price?: number;
  sold_quantity?: number;
  condition?: string;
  permalink?: string;
};

type MLProductDetail = {
  id?: string;
  name?: string;
  permalink?: string;
  sold_quantity?: number;
  domain_id?: string;
  buy_box_winner?: MLBuyBoxWinner | null;
};

export type MLMatchCandidate = {
  productId: string;
  itemId: string | null;
  title: string;
  url: string;
  soldQuantity: number;
  price: number | null;
  categoryId: string | null;
  condition: string | null;
  sellerId: number | null;
  score: number;
  isBuyBoxWinner: boolean;
};

export type MLSearchResult = {
  query: string;
  candidates: MLMatchCandidate[];
  selected: MLMatchCandidate | null;
  matchStatus: "matched" | "review" | "no_match" | "error";
  errorMessage: string | null;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "de","da","do","das","dos","e","em","para","por","com","sem","a","o","as","os",
  "um","uma","kit","original","novo","nova","cor","preto","preta","branco","branca"
]);

function tokens(value: string): string[] {
  return Array.from(new Set(
    normalize(value)
      .split(/\s+/)
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
  ));
}

function matchScore(query: string, title: string): number {
  const q = tokens(query);
  const t = new Set(tokens(title));
  if (!q.length || !t.size) return 0;

  let overlap = 0;
  for (const token of q) if (t.has(token)) overlap += 1;
  const coverage = overlap / q.length;

  const nq = normalize(query);
  const nt = normalize(title);
  let score = coverage * 0.72;

  if (nt.includes(nq)) score += 0.18;
  else {
    const compactQ = q.join(" ");
    if (compactQ.length >= 8 && nt.includes(compactQ)) score += 0.10;
  }

  const queryNumbers = nq.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
  const titleNumbers = new Set(nt.match(/\b\d+(?:[.,]\d+)?\b/g) || []);
  if (queryNumbers.length) {
    const matchingNumbers = queryNumbers.filter((value) => titleNumbers.has(value)).length;
    score += (matchingNumbers / queryNumbers.length) * 0.10;
  }

  return Math.min(1, Number(score.toFixed(5)));
}

function stableQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

async function requestProductSearch(query: string, accessToken: string): Promise<MLProductSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    site_id: SITE_ID,
    status: "active",
    limit: "20",
  });

  const response = await fetch(
    ML_API + "/products/search?" + params.toString(),
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error("Mercado Livre " + response.status + (body ? ": " + body.slice(0, 300) : ""));
  }

  return response.json() as Promise<MLProductSearchResponse>;
}

async function requestProductDetail(productId: string, accessToken: string): Promise<MLProductDetail> {
  const response = await fetch(
    ML_API + "/products/" + encodeURIComponent(productId),
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error("Mercado Livre product " + response.status + (body ? ": " + body.slice(0, 240) : ""));
  }

  return response.json() as Promise<MLProductDetail>;
}

export async function searchMercadoLivreProduct(rawQuery: string): Promise<MLSearchResult> {
  const query = stableQuery(rawQuery);
  if (!query) {
    return {
      query,
      candidates: [],
      selected: null,
      matchStatus: "no_match",
      errorMessage: "Busca vazia.",
    };
  }

  try {
    const accessToken = await getValidAccessToken();
    const payload = await requestProductSearch(query, accessToken);
    const rows = Array.isArray(payload.results) ? payload.results : [];

    // /sites/MLB/search is returning 403 for this integration. The supported
    // Product Search API returns catalog products; their detail exposes the
    // current buy-box item, sold quantity and permalink when available.
    const productRows = rows
      .map((item) => ({
        productId: String(item.id || "").trim(),
        title: String(item.name || "").trim(),
        productUrl: String(item.permalink || "").trim(),
      }))
      .filter((item) => item.productId && item.title);

    const detailed = await Promise.all(
      productRows.slice(0, 12).map(async (row) => {
        try {
          return { row, detail: await requestProductDetail(row.productId, accessToken) };
        } catch {
          return { row, detail: null };
        }
      })
    );

    const candidates = detailed
      .map(({ row, detail }): MLMatchCandidate | null => {
        if (!detail) return null;

        const title = String(detail.name || row.title).trim();
        const winner = detail.buy_box_winner || null;
        const itemId = winner?.item_id ? String(winner.item_id) : null;
        const itemUrl = winner?.permalink ? String(winner.permalink) : "";
        const productUrl = String(detail.permalink || row.productUrl).trim();
        const url = itemUrl || productUrl;
        if (!url) return null;

        return {
          productId: row.productId,
          itemId,
          title,
          url,
          soldQuantity: Number.isFinite(Number(winner?.sold_quantity ?? detail.sold_quantity))
            ? Number(winner?.sold_quantity ?? detail.sold_quantity)
            : 0,
          price: Number.isFinite(Number(winner?.price)) ? Number(winner?.price) : null,
          categoryId: winner?.category_id ? String(winner.category_id) : null,
          condition: winner?.condition ? String(winner.condition) : null,
          sellerId: winner?.seller_id == null ? null : Number(winner.seller_id),
          score: matchScore(query, title),
          isBuyBoxWinner: Boolean(winner?.item_id),
        };
      })
      .filter((item): item is MLMatchCandidate => Boolean(item))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.soldQuantity !== a.soldQuantity) return b.soldQuantity - a.soldQuantity;
        return Number(b.isBuyBoxWinner) - Number(a.isBuyBoxWinner);
      })
      .slice(0, 10);

    const eligible = candidates
      .filter((candidate) => candidate.score >= 0.62)
      .sort((a, b) => {
        if (b.soldQuantity !== a.soldQuantity) return b.soldQuantity - a.soldQuantity;
        if (Number(b.isBuyBoxWinner) !== Number(a.isBuyBoxWinner)) {
          return Number(b.isBuyBoxWinner) - Number(a.isBuyBoxWinner);
        }
        return b.score - a.score;
      });

    const selected = eligible[0] || null;
    if (!selected) {
      return {
        query,
        candidates,
        selected: null,
        matchStatus: candidates.length ? "review" : "no_match",
        errorMessage: candidates.length
          ? "Resultados encontrados, mas a similaridade do produto ficou baixa."
          : "Nenhum produto ativo encontrado.",
      };
    }

    const second = eligible[1];
    const closeAlternative =
      second &&
      Math.abs(second.soldQuantity - selected.soldQuantity) <
        Math.max(10, selected.soldQuantity * 0.10);

    // A catalog product without a buy-box item is useful as a lead, but is not
    // enough to call an individual marketplace ad "confiável".
    const confident =
      selected.score >= 0.78 &&
      Boolean(selected.itemId) &&
      !closeAlternative;

    return {
      query,
      candidates,
      selected,
      matchStatus: confident ? "matched" : "review",
      errorMessage: confident
        ? null
        : selected.itemId
          ? "Há ambiguidade entre produtos semelhantes; revisão manual recomendada."
          : "Produto de catálogo encontrado, mas o Mercado Livre não retornou um anúncio vencedor para confirmar automaticamente.",
    };
  } catch (error) {
    return {
      query,
      candidates: [],
      selected: null,
      matchStatus: "error",
      errorMessage: error instanceof Error ? error.message : "Falha na consulta ao Mercado Livre.",
    };
  }
}
