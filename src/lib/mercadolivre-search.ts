import { getValidAccessToken } from "@/lib/mercadolivre-auth";

const ML_API = "https://api.mercadolibre.com";
const SITE_ID = "MLB";

type MLSearchItem = {
  id?: string;
  title?: string;
  price?: number;
  sold_quantity?: number;
  permalink?: string;
  category_id?: string;
  condition?: string;
  seller?: { id?: number; nickname?: string };
};

type MLSearchResponse = {
  results?: MLSearchItem[];
  available_sorts?: Array<{ id?: string | Record<string, unknown>; name?: string }>;
  paging?: { total?: number };
};

export type MLMatchCandidate = {
  itemId: string;
  title: string;
  url: string;
  soldQuantity: number;
  price: number | null;
  categoryId: string | null;
  condition: string | null;
  sellerId: number | null;
  sellerNickname: string | null;
  score: number;
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
    .replace(/[\\u0300-\\u036f]/g, "")
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
      .split(/\\s+/)
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

  const queryNumbers = nq.match(/\\b\\d+(?:[.,]\\d+)?\\b/g) || [];
  const titleNumbers = new Set(nt.match(/\\b\\d+(?:[.,]\\d+)?\\b/g) || []);
  if (queryNumbers.length) {
    const matchingNumbers = queryNumbers.filter((value) => titleNumbers.has(value)).length;
    score += (matchingNumbers / queryNumbers.length) * 0.10;
  }

  return Math.min(1, Number(score.toFixed(5)));
}

function stableQuery(value: string): string {
  return value.replace(/\\s+/g, " ").trim().slice(0, 180);
}

async function requestSearch(query: string, accessToken: string, sort?: string): Promise<MLSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
  });
  if (sort) params.set("sort", sort);

  const response = await fetch(
    ML_API + "/sites/" + SITE_ID + "/search?" + params.toString(),
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

  return response.json() as Promise<MLSearchResponse>;
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

    let payload: MLSearchResponse;
    try {
      payload = await requestSearch(query, accessToken, "sold_quantity_desc");
    } catch {
      payload = await requestSearch(query, accessToken);
    }

    const rows = Array.isArray(payload.results) ? payload.results : [];
    const candidates = rows
      .map((item): MLMatchCandidate | null => {
        const itemId = String(item.id || "").trim();
        const title = String(item.title || "").trim();
        const url = String(item.permalink || "").trim();
        if (!itemId || !title || !url) return null;

        return {
          itemId,
          title,
          url,
          soldQuantity: Number.isFinite(Number(item.sold_quantity)) ? Number(item.sold_quantity) : 0,
          price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
          categoryId: item.category_id ? String(item.category_id) : null,
          condition: item.condition ? String(item.condition) : null,
          sellerId: item.seller?.id == null ? null : Number(item.seller.id),
          sellerNickname: item.seller?.nickname ? String(item.seller.nickname) : null,
          score: matchScore(query, title),
        };
      })
      .filter((item): item is MLMatchCandidate => Boolean(item))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.soldQuantity - a.soldQuantity;
      })
      .slice(0, 10);

    const eligible = candidates
      .filter((candidate) => candidate.score >= 0.62)
      .sort((a, b) => {
        if (b.soldQuantity !== a.soldQuantity) return b.soldQuantity - a.soldQuantity;
        return b.score - a.score;
      });

    const selected = eligible[0] || null;
    if (!selected) {
      return {
        query,
        candidates,
        selected: null,
        matchStatus: candidates.length ? "review" : "no_match",
        errorMessage: candidates.length ? "Resultados encontrados, mas a similaridade do produto ficou baixa." : "Nenhum resultado encontrado.",
      };
    }

    const second = eligible[1];
    const closeAlternative = second && Math.abs(second.soldQuantity - selected.soldQuantity) < Math.max(10, selected.soldQuantity * 0.10);
    const confident = selected.score >= 0.78 && !closeAlternative;

    return {
      query,
      candidates,
      selected,
      matchStatus: confident ? "matched" : "review",
      errorMessage: confident
        ? null
        : "Há ambiguidade entre produtos semelhantes; revisão manual recomendada.",
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
