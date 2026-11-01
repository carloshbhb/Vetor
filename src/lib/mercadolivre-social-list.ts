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

export function parseSocialListPage(html: string, pageNumber: number): MLSocialListItem[] {
  const document = new JSDOM(html).window.document;
  const cards = Array.from(document.querySelectorAll(".aff-social-polycard__container .poly-card"));
  const now = new Date().toISOString();
  const items: MLSocialListItem[] = [];

  for (const card of cards) {
    const anchor = card.querySelector<HTMLAnchorElement>("a.poly-component__title");
    const title = anchor?.textContent?.trim() || "";
    const href = anchor?.href || "";
    if (!title || !href) continue;

    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }

    const itemId = url.searchParams.get("wid") || href.match(/\bMLB\d{6,}\b/i)?.[0] || "";
    if (!/^MLB\d+$/i.test(itemId)) continue;
    const productId = url.pathname.match(/\/p\/(MLB\d+)/i)?.[1] || null;
    const image = card.querySelector<HTMLImageElement>(".poly-component__picture");
    const currentPrice = card.querySelector(".poly-price__current");
    const previousPrice = card.querySelector(".poly-price__previous");
    const ratingText = card.querySelector(".poly-reviews__rating")?.textContent?.trim() || "";
    const reviewText = card.querySelector(".poly-reviews__total")?.textContent || "";
    const rating = Number(ratingText.replace(",", "."));

    items.push({
      list_id: ML_SOCIAL_LIST_ID,
      item_id: itemId.toUpperCase(),
      product_id: productId?.toUpperCase() || null,
      title,
      product_url: url.toString(),
      image_url: image?.getAttribute("src") || image?.getAttribute("data-src") || null,
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

async function fetchListPage(pageNumber: number): Promise<{ status: number; html: string }> {
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

  return { status: response.status, html: response.ok ? await response.text() : "" };
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

    // O endpoint público pagina a lista; uma página sem cards encerra a leitura.
    if (page > 1 && parsed.length === 0) break;
  }

  return { items: Array.from(byItemId.values()), expectedTotal, pagesScanned };
}
