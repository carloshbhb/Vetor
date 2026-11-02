import { JSDOM } from "jsdom";

export const ML_SOCIAL_LIST_ID = "870a18f7-4b8b-422b-b3e1-043d83e0c314";
export const ML_SOCIAL_LIST_URL = "https://www.mercadolivre.com.br/social/carloshbhb/lists/" + ML_SOCIAL_LIST_ID;

export type MLSocialListItem = {
  list_id: string;
  item_id: string;
  product_id: string | null;
  title: string;
  product_url: string;
  image_url: string | null;
  price: number | null;
  original_price: number | null;
  rating: number | null;
  review_count: number | null;
  highlight: string | null;
  page_number: number;
  last_seen_at: string;
  updated_at: string;
};

function moneyFrom(element: Element | null): number | null {
  if (!element) return null;
  const fraction = element.querySelector(".andes-money-amount__fraction")?.textContent?.replace(/\D/g, "");
  if (!fraction) return null;
  const cents = element.querySelector(".andes-money-amount__cents")?.textContent?.replace(/\D/g, "") || "00";
  const value = Number(fraction) + Number(cents.padStart(2, "0").slice(0, 2)) / 100;
  return Number.isFinite(value) ? value : null;
}

function parseCount(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractItemId(href: string): string {
  try {
    const url = new URL(href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const productId = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1] || null;
    return (url.searchParams.get("wid") || hashParams.get("wid") || productId || href.match(/\bMLB\d{6,}\b/i)?.[0] || "").toUpperCase();
  } catch {
    return "";
  }
}

export function parseSocialListPage(html: string, pageNumber: number): MLSocialListItem[] {
  const document = new JSDOM(html).window.document;
  const cards = Array.from(document.querySelectorAll(".aff-social-polycard__container .poly-card"));
  const now = new Date().toISOString();
  const items: MLSocialListItem[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const anchor = card.querySelector<HTMLAnchorElement>("a.poly-component__title") ||
      card.querySelector<HTMLAnchorElement>('a[href*="MLB"]');
    const title = anchor?.textContent?.trim() || anchor?.getAttribute("aria-label")?.trim() || "";
    const href = anchor?.href || "";
    if (!title || !href) continue;

    const itemId = extractItemId(href);
    if (!/^MLB\d+$/i.test(itemId) || seen.has(itemId)) continue;
    seen.add(itemId);

    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }

    const productId = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1] || null;
    const image = card.querySelector<HTMLImageElement>(".poly-component__picture") ||
      card.querySelector<HTMLImageElement>("img");
    const currentPrice = card.querySelector(".poly-price__current");
    const previousPrice = card.querySelector(".poly-price__previous");
    const ratingText = card.querySelector(".poly-reviews__rating")?.textContent?.trim() || "";
    const reviewText = card.querySelector(".poly-reviews__total")?.textContent || "";
    const rating = Number(ratingText.replace(",", "."));

    items.push({
      list_id: ML_SOCIAL_LIST_ID,
      item_id: itemId,
      product_id: productId?.toUpperCase() || null,
      title,
      product_url: url.toString(),
      image_url: image?.getAttribute("src") || image?.getAttribute("data-src") || image?.getAttribute("data-lazy") || null,
      price: moneyFrom(currentPrice),
      original_price: moneyFrom(previousPrice),
      rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      review_count: parseCount(reviewText),
      highlight: card.querySelector(".poly-component__highlight")?.textContent?.trim() || null,
      page_number: pageNumber,
      last_seen_at: now,
      updated_at: now,
    });
  }

  return items;
}

export function parseSocialListTotal(html: string): number | null {
  const match = html.match(/total_results["']?\s*:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

async function fetchListPage(pageNumber: number): Promise<{ status: number; html: string; finalUrl: string }> {
  const url = new URL(ML_SOCIAL_LIST_URL);
  if (pageNumber > 1) url.searchParams.set("page", String(pageNumber));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; VetorBlogProductCatalog/1.0)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  return { status: response.status, html: response.ok ? await response.text() : "", finalUrl: response.url };
}

export async function diagnosePublicSocialList(): Promise<{
  expectedTotal: number | null;
  pages: Array<{
    page: number;
    status: number;
    finalUrl: string;
    htmlLength: number;
    pageTitle: string;
    cards: number;
    titleAnchors: number;
    mlAnchors: number;
    parsed: number;
    paginationLinks: string[];
    paginationText: string;
    pageMarkers: string[];
    sampleUnmatchedLinks: string[];
    scriptSources: string[];
    scriptMarkers: string[];
  }>;
}> {
  const pages: Array<{
    page: number;
    status: number;
    finalUrl: string;
    htmlLength: number;
    pageTitle: string;
    cards: number;
    titleAnchors: number;
    mlAnchors: number;
    parsed: number;
    paginationLinks: string[];
    paginationText: string;
    pageMarkers: string[];
    sampleUnmatchedLinks: string[];
    scriptSources: string[];
    scriptMarkers: string[];
  }> = [];
  let expectedTotal: number | null = null;

  for (let page = 1; page <= 30; page += 1) {
    const response = await fetchListPage(page);
    if (response.status !== 200) {
      pages.push({
        page, status: response.status, finalUrl: response.finalUrl, htmlLength: response.html.length,
        pageTitle: "", cards: 0, titleAnchors: 0, mlAnchors: 0, parsed: 0,
        paginationLinks: [], paginationText: "", pageMarkers: [], sampleUnmatchedLinks: [], scriptSources: [], scriptMarkers: [],
      });
      if (page > 1 && response.status === 404) break;
      if (response.status !== 404) break;
      continue;
    }

    if (page === 1) expectedTotal = parseSocialListTotal(response.html);
    const document = new JSDOM(response.html).window.document;
    const cards = Array.from(document.querySelectorAll(".aff-social-polycard__container .poly-card"));
    const titleAnchors = document.querySelectorAll("a.poly-component__title").length;
    const mlAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="MLB"]'));
    const parsed = parseSocialListPage(response.html, page);
    const parsedIds = new Set(parsed.map((item) => item.item_id));
    const sampleUnmatchedLinks = mlAnchors
      .filter((anchor) => {
        const id = extractItemId(anchor.href);
        return /^MLB\d+$/i.test(id) && !parsedIds.has(id);
      })
      .slice(0, 8)
      .map((anchor) => (anchor.textContent || anchor.getAttribute("aria-label") || "").trim().slice(0, 100) + " | " + anchor.href.slice(0, 240));
    const paginationLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => anchor.href)
      .filter((href) => /(?:[?&](?:page|offset|limit)=|\/page\/\d+)/i.test(href))
      .filter((href, index, all) => all.indexOf(href) === index)
      .slice(0, 30);
    const paginationText = Array.from(document.querySelectorAll("nav, [class*='pagination'], [class*='Pagination']"))
      .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" | ")
      .slice(0, 500);
    const pageMarkers = Array.from(response.html.matchAll(/.{0,80}(?:total_results|offset|limit|page_number|pageSize|page_size|pagination).{0,120}/gi))
      .slice(0, 12)
      .map((match) => (match[0] || "").replace(/\s+/g, " ").slice(0, 220));
    const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script"));
    const scriptSources = scripts
      .map((script) => script.src)
      .filter(Boolean)
      .filter((src, index, all) => all.indexOf(src) === index)
      .slice(0, 60);
    const scriptMarkers = scripts
      .filter((script) => !script.src && script.textContent)
      .flatMap((script) => Array.from((script.textContent || "").matchAll(/.{0,100}(?:total_results|polycard|items|results|list_id|listId|pagination|offset|limit|cursor|__NEXT_DATA__).{0,180}/gi))
        .slice(0, 8)
        .map((match) => (match[0] || "").replace(/\\s+/g, " ").slice(0, 280)))
      .filter((value, index, all) => all.indexOf(value) === index)
      .slice(0, 24);

    pages.push({
      page, status: response.status, finalUrl: response.finalUrl, htmlLength: response.html.length,
      pageTitle: document.title, cards: cards.length, titleAnchors, mlAnchors: mlAnchors.length,
      parsed: parsed.length, paginationLinks, paginationText, pageMarkers, sampleUnmatchedLinks, scriptSources, scriptMarkers,
    });
    if (page > 1 && parsed.length === 0 && cards.length === 0 && mlAnchors.length === 0) break;
  }

  return { expectedTotal, pages };
}

export async function fetchPublicSocialList(): Promise<{
  items: MLSocialListItem[];
  expectedTotal: number | null;
  pagesScanned: number;
}> {
  const byItemId = new Map<string, MLSocialListItem>();
  let expectedTotal: number | null = null;
  let pagesScanned = 0;

  for (let page = 1; page <= 30; page += 1) {
    const response = await fetchListPage(page);
    if (response.status === 404 && page > 1) break;
    if (response.status !== 200) {
      throw new Error("Mercado Livre retornou HTTP " + response.status + " na página " + page + ".");
    }

    pagesScanned += 1;
    if (page === 1) expectedTotal = parseSocialListTotal(response.html);
    const parsed = parseSocialListPage(response.html, page);
    for (const item of parsed) {
      const existing = byItemId.get(item.item_id);
      if (!existing || item.page_number < existing.page_number) byItemId.set(item.item_id, item);
    }

    if (page > 1 && parsed.length === 0) break;
  }

  return { items: Array.from(byItemId.values()), expectedTotal, pagesScanned };
}
