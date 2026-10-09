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

function compactNormalized(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

function explicitModelMatch(query: string, title: string): boolean {
  const queryTokens = tokens(query);
  const titleTokens = new Set(tokens(title));
  const compactQuery = compactNormalized(query);
  const compactTitle = compactNormalized(title);

  // Modelos normalmente aparecem como um token alfanumérico (AF30, AFN40BI,
  // AFO101D, NitroV15) mesmo quando o anúncio usa hífens/espaços.
  const modelTokens = queryTokens.filter((token) =>
    /^(?:af|afn|afo)\d+[a-z0-9]*$/i.test(token) ||
    /^nitro[a-z]*v?\d+[a-z0-9]*$/i.test(token) ||
    /^[a-z]{2,8}\d{2,}[a-z0-9]*$/i.test(token)
  );

  for (const model of modelTokens) {
    if (titleTokens.has(model) || compactTitle.includes(model)) return true;
  }

  // Trata também consultas em que o modelo foi separado por pontuação,
  // por exemplo "AF-30", "AFN-40-BI" ou "Nitro V 15".
  const compactModels = compactQuery.match(/(?:af|afn|afo)\d+[a-z0-9]*|nitrov\d+[a-z0-9]*/gi) || [];
  return compactModels.some((model) => compactTitle.includes(model.toLowerCase()));
}

function capacityMatches(query: string, title: string): boolean {
  const q = normalize(query).match(/\b(\d+(?:[.,]\d+)?)\s*l\b/i);
  if (!q?.[1]) return true;

  const t = normalize(title).match(/\b(\d+(?:[.,]\d+)?)\s*l\b/i);
  if (!t?.[1]) return false;

  return Math.abs(Number(q[1].replace(",", ".")) - Number(t[1].replace(",", "."))) < 0.01;
}

function brandMatches(query: string, title: string): boolean {
  const qTokens = tokens(query);
  const tTokens = new Set(tokens(title));
  const brand = qTokens.find((token) =>
    [
      "acer", "akko", "amazon", "anker", "apple", "arno", "asus", "audient",
      "behringer", "bose", "brastemp", "britania", "consul", "dell", "dji",
      "dt3sports", "dreame", "easysmx", "edifier", "elgin", "elsys",
      "electrolux", "ezviz", "focusrite", "gamesir", "geonav", "google",
      "haylou", "hp", "hyperx", "i2go", "intelbras", "jbl", "lenovo",
      "liectroux", "logitech", "mondial", "motorola", "midea", "microsoft",
      "m-audio", "nintendo", "oster", "philco", "philips", "pichau", "positivo",
      "powera", "pulsar", "qcy", "razer", "redragon", "roborock", "rode",
      "royal", "scuf", "samsung", "sonoff", "sony", "soundpeats", "steelseries",
      "thunderx3", "tp", "link", "xiaomi", "yeelight", "xbox", "ipega", "irobot"
    ].includes(token)
  );
  return !brand || tTokens.has(brand);
}

const ACCESSORY_MARKERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcarregadores?\b/, label: "carregador" },
  { pattern: /\bcabos?\b/, label: "cabo" },
  { pattern: /\bcapas?\b|\bcapinhas?\b|\bcases?\b/, label: "capa/case" },
  { pattern: /\bpeliculas?\b/, label: "película" },
  { pattern: /\bpecas?\b|\breposicao\b|\bkit de reparo\b|\breparo\b/, label: "peça ou item de reposição" },
  { pattern: /\bdobradicas?\b|\bconectores?\b|\bconector de carga\b|\bpower jack\b/, label: "componente" },
  { pattern: /\bescovas?\b|\bcestos?\b|\bfiltros?\b/, label: "peça de reposição" },
  { pattern: /\bsuportes?\b|\bbase de mesa\b|\bbraco articulado\b/, label: "suporte" },
  { pattern: /\bcanetas?\b|\bstylus\b/, label: "caneta/acessório" },
  { pattern: /\btransmissores?\b/, label: "transmissor avulso" },
  { pattern: /\bcopos? (?:de|para) liquidificador\b|\bcopos? liquidificador\b/, label: "peça de liquidificador" },
  { pattern: /\bbotoes? (?:para|de)\b/, label: "botão de reposição" },
  { pattern: /\bmouse para\b|\bteclado para\b|\bmicrofone para fones\b/, label: "acessório compatível" },
  { pattern: /\bcompat[ií]vel com\b|\bcompativel com\b/, label: "item compatível/acessório" },
  { pattern: /\bkit\s+\d+\s+(?:lampadas?|unidades?)\b/, label: "kit com várias unidades" },
];

const VARIANT_MARKERS = [
  "neo", "pro", "plus", "max", "mini", "lite", "ultra", "fe", "se", "kids", "x",
  "mkii", "mk2", "gen2", "gen3", "gen4", "gen5",
];

function isPlaceholderQuery(query: string): boolean {
  const q = normalize(query);
  return [
    "nome deste produto",
    "nome do produto",
    "produto sem nome",
    "produto exemplo",
    "produto teste",
    "item sem nome",
  ].includes(q);
}

function accessoryMismatchReason(query: string, title: string): string | null {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);

  for (const marker of ACCESSORY_MARKERS) {
    if (marker.pattern.test(normalizedTitle) && !marker.pattern.test(normalizedQuery)) {
      return 'o título parece descrever "' + marker.label + '", não o produto completo solicitado';
    }
  }

  return null;
}

function variantMismatchReason(query: string, title: string): string | null {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);

  const queryGeneration = normalizedQuery.match(
    /\b(\d+)(?:a|o|st|nd|rd|th)?\s*(?:geracao|gen|generation)\b|\b(?:gen|generation)\s*(\d+)\b/
  );
  const titleGeneration = normalizedTitle.match(
    /\b(\d+)(?:a|o|st|nd|rd|th)?\s*(?:geracao|gen|generation)\b|\b(?:gen|generation)\s*(\d+)\b/
  );
  const queryGen = queryGeneration ? Number(queryGeneration[1] || queryGeneration[2]) : null;
  const titleGen = titleGeneration ? Number(titleGeneration[1] || titleGeneration[2]) : null;
  if (queryGen !== null && titleGen !== null && queryGen !== titleGen) {
    return "a geração indicada no anúncio é " + titleGen + ", mas a pesquisa pede a geração " + queryGen;
  }

  const queryMarkers = VARIANT_MARKERS.filter((marker) =>
    new RegExp("\\b" + marker + "\\b", "i").test(normalizedQuery)
  );
  const titleMarkers = VARIANT_MARKERS.filter((marker) =>
    new RegExp("\\b" + marker + "\\b", "i").test(normalizedTitle)
  );

  const missingRequested = queryMarkers.find((marker) => !titleMarkers.includes(marker));
  if (missingRequested) {
    return 'a variante "' + missingRequested + '" solicitada não aparece no título do anúncio';
  }

  const unexpectedVariant = titleMarkers.find((marker) => !queryMarkers.includes(marker));
  if (unexpectedVariant) {
    return 'o anúncio indica a variante "' + unexpectedVariant + '", que não consta no nome pesquisado';
  }

  return null;
}

function candidateMismatchReason(query: string, title: string): string | null {
  const accessoryReason = accessoryMismatchReason(query, title);
  if (accessoryReason) return accessoryReason;

  const variantReason = variantMismatchReason(query, title);
  if (variantReason) return variantReason;

  if (!brandMatches(query, title)) {
    return "a marca do anúncio não coincide claramente com a marca pesquisada";
  }

  if (!capacityMatches(query, title)) {
    return "a capacidade indicada no anúncio difere da capacidade solicitada";
  }

  const modelIds = tokens(query).filter((token) =>
    /^(?=.*[a-z])(?=.*\d)[a-z0-9]{3,}$/i.test(token)
  );
  const titleTokens = new Set(tokens(title));
  const missingModelId = modelIds.find((model) => !titleTokens.has(model));
  if (missingModelId) {
    return 'o código/modelo "' + missingModelId + '" não aparece como código completo no título do anúncio';
  }

  // Evita confundir modelos com sufixo explícito, por exemplo NT1 e NT1-A.
  // Um sufixo de uma letra separado por hífen passa a ser um token após a normalização.
  const normalizedTitle = normalize(title);
  for (const model of modelIds) {
    const suffixMatch = normalizedTitle.match(
      new RegExp("\\b" + model + "\\s+([a-z])\\b", "i")
    );
    const suffix = suffixMatch?.[1];
    if (suffix && !modelIds.includes(model + suffix)) {
      return 'o anúncio parece usar o modelo "' + model.toUpperCase() + "-" + suffix.toUpperCase() +
        '", diferente do código pesquisado';
    }
  }

  return null;
}

function catalogRelevanceScore(query: string, title: string): number {
  let score = matchScore(query, title);
  if (accessoryMismatchReason(query, title)) score -= 0.65;
  if (variantMismatchReason(query, title)) score -= 0.28;
  if (!brandMatches(query, title)) score -= 0.25;
  if (!capacityMatches(query, title)) score -= 0.25;
  return score;
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
  return value
    .replace(/\s*\(?\s*concorrente\s*\d+\s*\)?/ig, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

let lastMLRequestAt = 0;

async function waitForMLRateLimit(): Promise<void> {
  const minimumGapMs = 1200;
  const elapsed = Date.now() - lastMLRequestAt;

  if (elapsed < minimumGapMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, minimumGapMs - elapsed)
    );
  }

  lastMLRequestAt = Date.now();
}

async function fetchMercadoLivre(
  input: RequestInfo | URL,
  init: RequestInit,
  label: string
): Promise<Response> {
  let delayMs = 1500;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await waitForMLRateLimit();

    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro de rede não identificado";
      throw new Error("Falha de rede na consulta Mercado Livre (" + label + "): " + message.slice(0, 180));
    }

    if (response.status !== 429 || attempt === 3) {
      return response;
    }

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : NaN;
    const retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : 0;
    const jitterMs = Math.floor(Math.random() * 500);
    const waitMs = Math.max(delayMs, retryAfterMs) + jitterMs;

    console.warn(
      "[MercadoLivre] 429 on " +
        label +
        "; retrying in " +
        waitMs +
        "ms"
    );

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    delayMs *= 2;
  }

  throw new Error("Mercado Livre rate limit persistente.");
}

async function requestProductSearch(query: string, accessToken: string): Promise<MLProductSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    site_id: SITE_ID,
    status: "active",
    limit: "20",
  });

  const response = await fetchMercadoLivre(
    ML_API + "/products/search?" + params.toString(),
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    },
    "catalog search"
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = "";
    try {
      const payload = JSON.parse(body) as Record<string, unknown>;
      detail = [
        payload.message,
        payload.error,
        payload.code,
        payload.blocked_by,
      ].filter((value) => typeof value === "string" && value.trim()).join(" / ");
    } catch {
      detail = body.slice(0, 160);
    }
    throw new Error(
      "Mercado Livre catálogo /products/search HTTP " +
        response.status +
        (detail ? " (" + detail.slice(0, 180) + ")" : "")
    );
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

function catalogSearchVariants(query: string): string[] {
  const variants = new Set<string>();
  const normalized = stableQuery(query);
  variants.add(normalized);

  if (/\b5[.,]5\s*l\b/i.test(normalized) && /\bmondial\b/i.test(normalized)) {
    variants.add("Mondial AF55I 5,5L");
    variants.add("Mondial AF-55I 5,5L");
  }

  if (/\bnitro\s+v\s*15\b/i.test(normalized)) {
    variants.add("Acer Nitro V15");
    variants.add("Acer Nitro V 15");
  }

  const withoutEditorialCategory = normalized
    .replace(/\b(?:air fryer|fritadeira sem oleo|fritadeira|aspirador robo|smart lampada|lampada inteligente)\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (withoutEditorialCategory.length >= 4 && withoutEditorialCategory !== normalized) {
    variants.add(withoutEditorialCategory);
  }

  return Array.from(variants).slice(0, 4);
}



type CatalogSearchBatch = {
  results: MLProductSearchItem[];
  diagnostics: string[];
};

async function requestCatalogSearchVariants(
  query: string,
  accessToken: string
): Promise<CatalogSearchBatch> {
  const unique = new Map<string, MLProductSearchItem>();
  const diagnostics: string[] = [];
  let successfulVariants = 0;

  for (const variant of catalogSearchVariants(query)) {
    try {
      const payload = await requestProductSearch(variant, accessToken);
      successfulVariants += 1;
      for (const item of Array.isArray(payload.results) ? payload.results : []) {
        const id = String(item.id || "").trim();
        if (id && !unique.has(id)) unique.set(id, item);
      }
    } catch (error) {
      diagnostics.push(
        error instanceof Error ? error.message : "Falha não identificada na busca de catálogo."
      );
    }
  }

  if (successfulVariants === 0) {
    throw new Error(
      diagnostics.length
        ? Array.from(new Set(diagnostics)).join(" | ").slice(0, 500)
        : "Nenhuma variante de busca pôde ser consultada no catálogo do Mercado Livre."
    );
  }

  return {
    results: Array.from(unique.values())
      .sort((a, b) =>
        catalogRelevanceScore(query, String(b.name || "")) -
        catalogRelevanceScore(query, String(a.name || ""))
      )
      .slice(0, 12),
    diagnostics: Array.from(new Set(diagnostics)),
  };
}

async function requestProductDetail(productId: string, accessToken: string): Promise<MLProductDetail> {
  const response = await fetchMercadoLivre(
    ML_API + "/products/" + encodeURIComponent(productId),
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    },
    "product detail"
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
    ? detail.children_ids.filter(Boolean).slice(0, 4)
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
  const response = await fetchMercadoLivre(
    ML_API + "/items/" + encodeURIComponent(itemId),
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    },
    "item detail"
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
      errorMessage: "Busca vazia; nenhum pedido foi enviado à API.",
    };
  }

  if (isPlaceholderQuery(query)) {
    return {
      query,
      candidates: [],
      selected: null,
      matchStatus: "review",
      errorMessage: 'Cadastro genérico ("' + query + '"). Corrija o nome do produto antes de buscar.',
    };
  }

  try {
    const accessToken = await getValidAccessToken();

    // Link existente: resolve e consulta o ITEM_ID, mas nunca ignora a validação
    // de acessórios, variante, marca, capacidade e modelo.
    if (sourceUrl) {
      const directItemId = await resolveToMLBItemId(sourceUrl);
      if (directItemId) {
        try {
          const item = await requestItemDetail(directItemId, accessToken);
          const candidate = candidateFromItem(item, query);

          if (candidate) {
            const mismatch = candidateMismatchReason(query, candidate.title);
            const confident =
              !mismatch &&
              candidate.score >= 0.84 &&
              Boolean(candidate.itemId);

            return {
              query,
              candidates: [candidate],
              selected: candidate,
              matchStatus: confident ? "matched" : "review",
              errorMessage: confident
                ? null
                : "O anúncio do link existente não foi validado automaticamente: " +
                  (mismatch || "similaridade insuficiente; revisão manual recomendada."),
            };
          }
        } catch (error) {
          // Um link antigo/encerrado não impede a pesquisa por catálogo.
          console.warn(
            "[MercadoLivre] Não foi possível confirmar link de origem:",
            error instanceof Error ? error.message : "erro não identificado"
          );
        }
      }
    }

    const catalogBatch = await requestCatalogSearchVariants(query, accessToken);
    const catalogRows = catalogBatch.results;

    if (!catalogRows.length) {
      const diagnostic = catalogBatch.diagnostics.length
        ? " Algumas variantes falharam: " + catalogBatch.diagnostics.join(" | ")
        : "";
      return {
        query,
        candidates: [],
        selected: null,
        matchStatus: catalogBatch.diagnostics.length ? "error" : "no_match",
        errorMessage:
          (catalogBatch.diagnostics.length
            ? "A busca ficou incompleta por erro em uma ou mais consultas da API. "
            : "A busca oficial de catálogo respondeu sem produto ativo para esta consulta. ") +
          "Isso não prova que não existam anúncios tradicionais fora do catálogo; confira a busca manual e os identificadores." +
          diagnostic,
      };
    }

    const productRows = catalogRows
      .map((item) => ({
        productId: String(item.id || "").trim(),
        title: String(item.name || "").trim(),
        productUrl: String(item.permalink || "").trim(),
      }))
      .filter((item) => item.productId && item.title)
      .sort((a, b) =>
        catalogRelevanceScore(query, b.title) -
        catalogRelevanceScore(query, a.title)
      );

    // Sequencial e limitado: evita bursts de 12 chamadas simultâneas que
    // podem disparar throttling e produzir falsos "sem resultado".
    const detailed: Array<{
      row: { productId: string; title: string; productUrl: string };
      detail: MLProductDetail;
    }> = [];
    const detailErrors: string[] = [];

    for (const row of productRows.slice(0, 6)) {
      try {
        detailed.push({ row, detail: await requestProductDetail(row.productId, accessToken) });
      } catch (error) {
        detailErrors.push(
          error instanceof Error ? error.message : "Falha ao consultar detalhes de produto do catálogo."
        );
      }
    }

    const candidates: MLMatchCandidate[] = [];
    for (const { row, detail } of detailed) {
      try {
        let expanded: MLMatchCandidate[] = [];

        if (detail.buy_box_winner?.item_id) {
          expanded = await expandMercadoLivreCandidates(
            row,
            detail,
            query,
            accessToken,
            matchScore
          );
        } else {
          const childWinner = await findChildBuyBoxCandidate(detail, query, accessToken);
          expanded = childWinner
            ? [childWinner]
            : await expandMercadoLivreCandidates(
                row,
                detail,
                query,
                accessToken,
                matchScore
              );
        }

        candidates.push(...expanded);
      } catch (error) {
        detailErrors.push(
          error instanceof Error ? error.message : "Falha ao verificar anúncios associados ao catálogo."
        );
      }
    }

    const rankedCandidates = candidates
      .map((candidate) => ({
        candidate,
        relevance: catalogRelevanceScore(query, candidate.title),
        mismatch: candidateMismatchReason(query, candidate.title),
      }))
      .sort((a, b) => {
        if (Boolean(a.mismatch) !== Boolean(b.mismatch)) {
          return a.mismatch ? 1 : -1;
        }
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        if (Number(b.candidate.isBuyBoxWinner) !== Number(a.candidate.isBuyBoxWinner)) {
          return Number(b.candidate.isBuyBoxWinner) - Number(a.candidate.isBuyBoxWinner);
        }
        if ((a.candidate.price ?? Infinity) !== (b.candidate.price ?? Infinity)) {
          return (a.candidate.price ?? Infinity) - (b.candidate.price ?? Infinity);
        }
        return b.candidate.soldQuantity - a.candidate.soldQuantity;
      });

    const selectedEntry = rankedCandidates.find((entry) => entry.candidate.score >= 0.55)
      || rankedCandidates[0]
      || null;
    const selected = selectedEntry?.candidate || null;

    const diagnostics = [
      ...catalogBatch.diagnostics,
      ...detailErrors,
    ];
    const hasApiWarnings = diagnostics.length > 0;

    if (!selected) {
      const catalogDetailMessage = detailErrors.length
        ? " A API encontrou produtos de catálogo, mas houve falha ao confirmar seus anúncios: " +
          Array.from(new Set(detailErrors)).join(" | ").slice(0, 320)
        : " O catálogo retornou produtos, mas nenhum anúncio ativo pôde ser confirmado.";
      return {
        query,
        candidates: [],
        selected: null,
        matchStatus: hasApiWarnings ? "error" : "review",
        errorMessage:
          "Não foi possível confirmar um anúncio ativo. Isso não significa necessariamente que o produto não exista no Mercado Livre." +
          catalogDetailMessage,
      };
    }

    const mismatch = selectedEntry?.mismatch || candidateMismatchReason(query, selected.title);
    const exactPhrase = normalize(selected.title).includes(normalize(query));
    const modelMatch = explicitModelMatch(query, selected.title);
    const confident =
      !mismatch &&
      !hasApiWarnings &&
      Boolean(selected.itemId) &&
      brandMatches(query, selected.title) &&
      capacityMatches(query, selected.title) &&
      (
        exactPhrase ||
        selected.score >= 0.86 ||
        (modelMatch && selected.score >= 0.72)
      );

    const warnings = [
      mismatch ? "Não aprovado automaticamente: " + mismatch + "." : "",
      hasApiWarnings
        ? "A pesquisa ficou incompleta por falha em parte das consultas da API: " +
          Array.from(new Set(diagnostics)).join(" | ").slice(0, 320)
        : "",
    ].filter(Boolean);

    return {
      query,
      candidates: rankedCandidates.map((entry) => entry.candidate).slice(0, 20),
      selected,
      matchStatus: confident ? "matched" : "review",
      errorMessage: confident
        ? null
        : warnings.join(" ") ||
          "Candidato encontrado, mas não há evidências suficientes para validação automática; revise título e variante.",
    };
  } catch (error) {
    return {
      query,
      candidates: [],
      selected: null,
      matchStatus: "error",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Falha não identificada na API do Mercado Livre; não classificar como produto inexistente.",
    };
  }
}
