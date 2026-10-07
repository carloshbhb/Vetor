import { getValidAccessToken } from "@/lib/mercadolivre-auth";
import { expandMercadoLivreCandidates } from "@/lib/mercadolivre-product-items";

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
  children_ids?: string[];
  buy_box_winner?: MLBuyBoxWinner | null;
};

type MLItemDetail = {
  id?: string;
  title?: string;
  permalink?: string;
  price?: number;
  sold_quantity?: number;
  category_id?: string;
  condition?: string;
  seller_id?: number;
  catalog_product_id?: string | null;
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

type MLItemSearchResponse = {
  results?: Array<{
    id?: string;
    title?: string;
    permalink?: string;
    price?: number;
    sold_quantity?: number;
    category_id?: string;
    condition?: string;
    seller?: { id?: number };
    catalog_product_id?: string | null;
  }>;
};

async function requestPublicItemSearch(
  query: string,
  accessToken: string
): Promise<MLMatchCandidate[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    sort: "relevance",
  });

  try {
    const response = await fetch(
      ML_API + "/sites/" + SITE_ID + "/search?" + params.toString(),
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return [];

    const payload = (await response.json()) as MLItemSearchResponse;
    return (Array.isArray(payload.results) ? payload.results : [])
      .map((item): MLMatchCandidate | null => {
        const itemId = String(item.id || "").trim();
        const title = String(item.title || "").trim();
        if (!itemId || !title) return null;

        return {
          productId: String(item.catalog_product_id || "").trim(),
          itemId,
          title,
          url: String(item.permalink || "").trim() ||
            ("https://produto.mercadolivre.com.br/" + itemId),
          soldQuantity: Number.isFinite(Number(item.sold_quantity))
            ? Number(item.sold_quantity)
            : 0,
          price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
          categoryId: item.category_id ? String(item.category_id) : null,
          condition: item.condition ? String(item.condition) : null,
          sellerId: item.seller?.id == null ? null : Number(item.seller.id),
          score: matchScore(query, title),
          isBuyBoxWinner: false,
        };
      })
      .filter((item): item is MLMatchCandidate => Boolean(item));
  } catch {
    return [];
  }
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

function extractMLBItemId(value: string): string | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  const patterns = [
    /\/(MLB[-_]\d{6,})(?:[^\d]|$)/i,
    /\b(MLB\d{6,})\b/i,
    /\b(MLB[-_]\d{6,})\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].replace("-", "");
    }
  }

  return null;
}

async function resolveToMLBItemId(sourceUrl: string): Promise<string | null> {
  const direct = extractMLBItemId(sourceUrl);
  if (direct) return direct;

  const url = String(sourceUrl || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; VetorBot/1.0; +https://www.vetor.blog/)",
      },
      cache: "no-store",
    });

    const finalUrl = response.url || "";
    const fromFinalUrl = extractMLBItemId(finalUrl);
    if (fromFinalUrl) return fromFinalUrl;

    const body = await response.text().catch(() => "");
    return extractMLBItemId(body);
  } catch {
    return null;
  }
}

async function findChildBuyBoxCandidate(
  detail: MLProductDetail,
  query: string,
  accessToken: string
): Promise<MLMatchCandidate | null> {
  const children = Array.isArray(detail.children_ids)
    ? detail.children_ids.filter(Boolean).slice(0, 12)
    : [];

  for (const childId of children) {
    try {
      const child = await requestProductDetail(childId, accessToken);
      const winner = child.buy_box_winner;
      if (!winner?.item_id) continue;

      const title = String(child.name || detail.name || "").trim();
      const url = String(winner.permalink || child.permalink || "").trim();
      if (!title || !url) continue;

      return {
        productId: String(child.id || childId).trim(),
        itemId: String(winner.item_id),
        title,
        url,
        soldQuantity: Number.isFinite(Number(winner.sold_quantity ?? child.sold_quantity))
          ? Number(winner.sold_quantity ?? child.sold_quantity)
          : 0,
        price: Number.isFinite(Number(winner.price)) ? Number(winner.price) : null,
        categoryId: winner.category_id ? String(winner.category_id) : null,
        condition: winner.condition ? String(winner.condition) : null,
        sellerId: winner.seller_id == null ? null : Number(winner.seller_id),
        score: matchScore(query, title),
        isBuyBoxWinner: true,
      };
    } catch {
      // Tenta o próximo produto filho.
    }
  }

  return null;
}

async function requestItemDetail(itemId: string, accessToken: string): Promise<MLItemDetail> {
  const response = await fetch(
    ML_API + "/items/" + encodeURIComponent(itemId),
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
    throw new Error(
      "Mercado Livre item " +
        response.status +
        (body ? ": " + body.slice(0, 300) : "")
    );
  }

  return response.json() as Promise<MLItemDetail>;
}

function candidateFromItem(
  item: MLItemDetail,
  query: string
): MLMatchCandidate | null {
  const itemId = String(item.id || "").trim();
  if (!itemId) return null;

  const title = String(item.title || "").trim();
  const url =
    String(item.permalink || "").trim() ||
    ("https://produto.mercadolivre.com.br/" + itemId);

  if (!title || !url) return null;

  return {
    productId: String(item.catalog_product_id || "").trim(),
    itemId,
    title,
    url,
    soldQuantity: Number.isFinite(Number(item.sold_quantity)) ? Number(item.sold_quantity) : 0,
    price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
    categoryId: item.category_id ? String(item.category_id) : null,
    condition: item.condition ? String(item.condition) : null,
    sellerId: item.seller_id == null ? null : Number(item.seller_id),
    score: matchScore(query, title),
    isBuyBoxWinner: false,
  };
}

export async function searchMercadoLivreProduct(
  rawQuery: string,
  sourceUrl?: string
): Promise<MLSearchResult> {
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

    // Prioridade máxima: quando a Central já guarda um link meli.la,
    // resolvemos o anúncio exato e consultamos /items/{ITEM_ID}.
    if (sourceUrl) {
      const directItemId = await resolveToMLBItemId(sourceUrl);
      if (directItemId) {
        try {
          const item = await requestItemDetail(directItemId, accessToken);
          const candidate = candidateFromItem(item, query);

          if (candidate) {
            const confident =
              candidate.score >= 0.78 ||
              normalize(item.title || "").includes(normalize(query));

            return {
              query,
              candidates: [candidate],
              selected: candidate,
              matchStatus: confident ? "matched" : "review",
              errorMessage: confident
                ? null
                : "Anúncio identificado pelo link existente, mas o título tem baixa similaridade; revisão manual recomendada.",
            };
          }
        } catch {
          // Link curto pode apontar para anúncio encerrado; use a busca atual.
        }
      }
    }

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

    const candidateGroups = await Promise.all(
      detailed.map(async ({ row, detail }) => {
        if (!detail) return [];

        if (detail.buy_box_winner?.item_id) {
          return expandMercadoLivreCandidates(
            row,
            detail,
            query,
            accessToken,
            matchScore
          );
        }

        const childWinner = await findChildBuyBoxCandidate(
          detail,
          query,
          accessToken
        );

        if (childWinner) return [childWinner];

        return expandMercadoLivreCandidates(
          row,
          detail,
          query,
          accessToken,
          matchScore
        );
      })
    );

    let candidates = candidateGroups.flat();

    // Último fallback: a busca pública de itens lista anúncios ativos diretamente.
    // É especialmente útil quando o catálogo não possui buy-box/children disponíveis.
    if (!candidates.length) {
      candidates = await requestPublicItemSearch(query, accessToken);
    }

    candidates = candidates
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (Number(b.isBuyBoxWinner) !== Number(a.isBuyBoxWinner)) {
          return Number(b.isBuyBoxWinner) - Number(a.isBuyBoxWinner);
        }
        if ((a.price ?? Number.POSITIVE_INFINITY) !== (b.price ?? Number.POSITIVE_INFINITY)) {
          return (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY);
        }
        return b.soldQuantity - a.soldQuantity;
      })
      .slice(0, 20);

    const eligible = candidates.filter((candidate) => candidate.score >= 0.62);
    const selected = eligible[0] || null;
    if (!selected) {
      return {
        query,
        candidates,
        selected: null,
        matchStatus: candidates.length ? "review" : "no_match",
        errorMessage: candidates.length
          ? "Resultados encontrados, mas a similaridade do produto ficou baixa."
          : "Nenhum anúncio atual foi encontrado: o link existente pode estar expirado e o catálogo consultado não apresentou vencedor ou publicação associada.",
      };
    }

    const normalizedQuery = normalize(query);
    const normalizedTitle = normalize(selected.title);
    const exactPhrase = normalizedTitle.includes(normalizedQuery);

    const queryTokens = tokens(query);
    const distinctiveTokens = queryTokens.filter(
      (token) =>
        token.length >= 3 &&
        !new Set([
          "air", "fryer", "forno", "fritadeira", "amazon", "alexa",
          "echo", "family", "smart", "plus", "com", "som", "inteligente",
          "preto", "preta", "branco", "branca"
        ]).has(token)
    );

    const titleTokens = new Set(tokens(selected.title));
    const distinctiveCoverage = distinctiveTokens.length
      ? distinctiveTokens.filter((token) => titleTokens.has(token)).length /
        distinctiveTokens.length
      : 0;

    const confident =
      Boolean(selected.itemId) &&
      (
        exactPhrase ||
        selected.score >= 0.78 ||
        (selected.score >= 0.70 && distinctiveCoverage >= 0.75)
      );

    return {
      query,
      candidates,
      selected,
      matchStatus: confident ? "matched" : "review",
      errorMessage: confident
        ? null
        : "Há correspondência relevante, mas a similaridade ainda não é suficiente para validação automática.",
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
