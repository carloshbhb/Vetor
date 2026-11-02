import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getValidAccessToken } from "@/lib/mercadolivre-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { ML_SOCIAL_LIST_ID } from "@/lib/mercadolivre-social-list";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type JsonRecord = Record<string, unknown>;

type RecoveryRow = {
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
  highlight: string;
  page_number: number;
  last_seen_at: string;
  updated_at: string;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : (typeof value === "string" ? Number(value) : NaN);
  return Number.isFinite(number) ? number : null;
}

async function requestMlJson(url: string, token?: string): Promise<{ ok: boolean; status: number; data: unknown; details: string | null }> {
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let data: unknown = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
    return { ok: response.ok, status: response.status, data, details: response.ok ? null : raw.slice(0, 400) };
  } catch (error) {
    return { ok: false, status: 0, data: null, details: error instanceof Error ? error.message : "Falha de rede" };
  }
}

function getCoveredBookmarkIds(
  bookmarkIds: string[],
  rows: Array<{ item_id?: unknown; product_id?: unknown }>,
): Set<string> {
  const bookmarkSet = new Set(bookmarkIds);
  const covered = new Set<string>();
  for (const row of rows) {
    const itemId = String(row.item_id || "").trim().toUpperCase();
    const productId = String(row.product_id || "").trim().toUpperCase();
    if (bookmarkSet.has(itemId)) covered.add(itemId);
    if (bookmarkSet.has(productId)) covered.add(productId);
  }
  return covered;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      results[index] = await callback(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function firstPicture(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    const picture = asRecord(entry);
    const url = asString(picture?.secure_url) || asString(picture?.url);
    if (url) return url;
  }
  return null;
}

async function getProductData(productId: string, token: string): Promise<{ product: JsonRecord | null; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const direct = await requestMlJson("https://api.mercadolibre.com/products/" + encodeURIComponent(productId), token);
  if (direct.ok) {
    const product = asRecord(direct.data);
    if (product) return { product, diagnostics };
  } else {
    diagnostics.push("products=" + direct.status + (direct.details ? ":" + direct.details : ""));
  }

  // Search also accepts a Product ID and can resolve records that are not returned
  // by the direct detail endpoint (for example, catalog lifecycle edge cases).
  const searchUrl = "https://api.mercadolibre.com/products/search?site_id=MLB&q=" + encodeURIComponent(productId);
  const search = await requestMlJson(searchUrl, token);
  if (search.ok) {
    const searchRecord = asRecord(search.data);
    const results = Array.isArray(searchRecord?.results) ? searchRecord.results : [];
    const exact = results.map(asRecord).find((candidate) =>
      String(candidate?.id || "").toUpperCase() === productId,
    ) || null;
    if (exact) return { product: exact, diagnostics };
  } else {
    diagnostics.push("products/search=" + search.status + (search.details ? ":" + search.details : ""));
  }
  return { product: null, diagnostics };
}

async function searchListingByCatalogProduct(productId: string, token: string): Promise<{ item: JsonRecord | null; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const url = "https://api.mercadolibre.com/sites/MLB/search?q=" + encodeURIComponent(productId) + "&limit=50";
  let response = await requestMlJson(url, token);
  if (!response.ok && response.status === 403) {
    diagnostics.push("sites/search autenticado=403");
    response = await requestMlJson(url);
  }
  if (!response.ok) {
    diagnostics.push("sites/search=" + response.status + (response.details ? ":" + response.details : ""));
    return { item: null, diagnostics };
  }
  const payload = asRecord(response.data);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const exact = results.map(asRecord).find((candidate) =>
    String(candidate?.catalog_product_id || "").toUpperCase() === productId ||
    String(candidate?.id || "").toUpperCase() === productId,
  ) || null;
  return { item: exact, diagnostics };
}

async function getItemData(itemId: string, token: string): Promise<{ item: JsonRecord | null; diagnostics: string[] }> {
  const diagnostics: string[] = [];
  const bulkUrl = "https://api.mercadolibre.com/items/bulk?ids=" + encodeURIComponent(itemId);

  const tryBulk = async (accessToken?: string): Promise<JsonRecord | null> => {
    const bulk = await requestMlJson(bulkUrl, accessToken);
    if (!bulk.ok) {
      diagnostics.push("items/bulk" + (accessToken ? " autenticado" : " público") + "=" + bulk.status);
      return null;
    }
    if (!Array.isArray(bulk.data)) {
      diagnostics.push("items/bulk sem array de resposta");
      return null;
    }
    for (const entryValue of bulk.data) {
      const entry = asRecord(entryValue);
      const status = Number(entry?.status_code ?? entry?.code ?? 0);
      const body = asRecord(entry?.body);
      if (status === 200 && body) return body;
      if (status) diagnostics.push("items/bulk item status=" + status);
    }
    return null;
  };

  let item = await tryBulk(token);
  if (!item && diagnostics.some((message) => message.includes("403"))) {
    item = await tryBulk();
  }
  if (item) return { item, diagnostics };

  let single = await requestMlJson("https://api.mercadolibre.com/items/" + encodeURIComponent(itemId), token);
  if (!single.ok && single.status === 403) {
    diagnostics.push("items autenticado=403; repetindo sem OAuth");
    single = await requestMlJson("https://api.mercadolibre.com/items/" + encodeURIComponent(itemId));
  }
  if (single.ok) {
    const parsed = asRecord(single.data);
    if (parsed) return { item: parsed, diagnostics };
  } else {
    diagnostics.push("items=" + single.status + (single.details ? ":" + single.details : ""));
  }
  return { item: null, diagnostics };
}
async function recoverFromPublicProductPage(productId: string): Promise<RecoveryRow | null> {
  try {
    const response = await fetch("https://www.mercadolivre.com.br/p/" + encodeURIComponent(productId), {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; VetorBlogProductCatalog/1.0)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const document = new JSDOM(html).window.document;
    const title = asString(document.querySelector('meta[property="og:title"]')?.getAttribute("content")) ||
      asString(document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"));
    const image = asString(document.querySelector('meta[property="og:image"]')?.getAttribute("content")) ||
      asString(document.querySelector('meta[name="twitter:image"]')?.getAttribute("content"));
    const canonical = asString(document.querySelector('link[rel="canonical"]')?.getAttribute("href"));
    if (!title || /mercado livre/i.test(title) && title.length < 24) return null;
    const now = new Date().toISOString();
    return {
      list_id: ML_SOCIAL_LIST_ID,
      item_id: productId,
      product_id: productId,
      title,
      product_url: canonical || "https://www.mercadolivre.com.br/p/" + productId,
      image_url: image,
      price: null,
      original_price: null,
      rating: null,
      review_count: null,
      highlight: "Catálogo recuperado da página pública · anúncio não confirmado",
      page_number: 0,
      last_seen_at: now,
      updated_at: now,
    };
  } catch {
    return null;
  }
}

async function recoverOneProduct(productId: string, token: string): Promise<
  { row: RecoveryRow; source: "catalog_product" | "direct_item" | "catalog_only" | "public_page" } |
  { error: string; productId: string }
> {
  const productResult = await getProductData(productId, token);
  const product = productResult.product;
  const winner = asRecord(product?.buy_box_winner);
  const winnerItemId = asString(winner?.item_id);
  const itemResult = await getItemData(winnerItemId || productId, token);
  let item = itemResult.item;
  let listingSearchDiagnostics: string[] = [];
  if (!item) {
    const listingSearch = await searchListingByCatalogProduct(productId, token);
    item = listingSearch.item;
    listingSearchDiagnostics = listingSearch.diagnostics;
    if (item && !asString(item.id)) item = null;
  }

  if (item) {
    const itemId = asString(item.id);
    if (itemId && /^MLB\d+$/.test(itemId)) {
      const now = new Date().toISOString();
      return {
        source: product ? "catalog_product" : "direct_item",
        row: {
          list_id: ML_SOCIAL_LIST_ID,
          item_id: itemId,
          product_id: asString(item.catalog_product_id) || (product ? productId : null),
          title: asString(item.title) || asString(product?.name) || ("Produto Mercado Livre " + productId),
          product_url: asString(item.permalink) || asString(product?.permalink) || ("https://www.mercadolivre.com.br/p/" + productId),
          image_url: firstPicture(item.pictures) || asString(item.thumbnail) || firstPicture(product?.pictures),
          price: asNumber(item.price) ?? asNumber(winner?.price),
          original_price: asNumber(item.original_price),
          rating: null,
          review_count: null,
          highlight: "Recuperado via API oficial do Mercado Livre",
          page_number: 0,
          last_seen_at: now,
          updated_at: now,
        },
      };
    }
  }

  // A catalog PDP can be valid even when the API says buy_box_winner=null.
  // Preserve its catalog identity and clearly label that no active offer was resolved.
  if (product && asString(product.name)) {
    const now = new Date().toISOString();
    return {
      source: "catalog_only",
      row: {
        list_id: ML_SOCIAL_LIST_ID,
        item_id: productId,
        product_id: productId,
        title: asString(product.name) || ("Produto Mercado Livre " + productId),
        product_url: asString(product.permalink) || ("https://www.mercadolivre.com.br/p/" + productId),
        image_url: firstPicture(product.pictures),
        price: asNumber(winner?.price),
        original_price: null,
        rating: null,
        review_count: null,
        highlight: "Produto de catálogo · sem anúncio vencedor ativo",
        page_number: 0,
        last_seen_at: now,
        updated_at: now,
      },
    };
  }

  const publicRow = await recoverFromPublicProductPage(productId);
  if (publicRow) return { row: publicRow, source: "public_page" };

  const details = [...productResult.diagnostics, ...itemResult.diagnostics, ...listingSearchDiagnostics].join(" | ");
  return {
    productId,
    error: details || "A API não retornou detalhes de catálogo, anúncio ou página pública.",
  };
}
export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  let syncId: string | null = null;
  try {
    const token = await getValidAccessToken();
    const bookmarksResponse = await requestMlJson("https://api.mercadolibre.com/users/me/bookmarks", token);
    if (!bookmarksResponse.ok || !Array.isArray(bookmarksResponse.data)) {
      return NextResponse.json({
        ok: false,
        error: "Não foi possível obter os favoritos oficiais do Mercado Livre.",
        status: bookmarksResponse.status,
      }, { status: 502 });
    }

    const bookmarkRows = bookmarksResponse.data as Array<{ item_id?: unknown }>;
    const bookmarkIds = Array.from(new Set(
      bookmarkRows
        .map((row) => String(row?.item_id || "").trim().toUpperCase())
        .filter((id) => /^MLB\d+$/.test(id)),
    ));

    const [{ data: latestSync, error: syncReadError }, { data: storedRows, error: storedError }] = await Promise.all([
      supabase.from("ml_social_list_syncs")
        .select("expected_total,pages_scanned")
        .eq("list_id", ML_SOCIAL_LIST_ID)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("ml_social_list_items")
        .select("item_id,product_id")
        .eq("list_id", ML_SOCIAL_LIST_ID)
        .limit(1000),
    ]);

    if (syncReadError) throw new Error("Falha ao validar histórico da lista: " + syncReadError.message);
    if (storedError) throw new Error("Falha ao validar produtos já salvos: " + storedError.message);

    const expectedTotal = asNumber(latestSync?.expected_total);
    const currentRows = storedRows || [];
    const bookmarkSet = new Set(bookmarkIds);
    const allExistingRowsMatch = currentRows.every((row) =>
      bookmarkSet.has(String(row.item_id || "").toUpperCase()) ||
      (row.product_id && bookmarkSet.has(String(row.product_id).toUpperCase())),
    );

    // Guard against importing unrelated account-wide favorites: proceed only when the
    // official unique bookmark count equals the public list's own declared total and
    // every previously scraped social-list row is represented in those bookmarks.
    if (!expectedTotal || bookmarkIds.length !== expectedTotal || !allExistingRowsMatch) {
      return NextResponse.json({
        ok: false,
        blocked: true,
        error: "A origem não passou pela validação de integridade; nenhum produto foi alterado.",
        publicListExpectedTotal: expectedTotal,
        officialUniqueBookmarks: bookmarkIds.length,
        existingSocialRows: currentRows.length,
        allExistingRowsMatch,
      }, { status: 409 });
    }

    const representedIds = getCoveredBookmarkIds(bookmarkIds, currentRows);
    const missingIds = bookmarkIds.filter((id) => !representedIds.has(id));

    const { data: sync, error: syncInsertError } = await supabase
      .from("ml_social_list_syncs")
      .insert({
        list_id: ML_SOCIAL_LIST_ID,
        expected_total: expectedTotal,
        fetched_total: currentRows.length,
        unique_total: representedIds.size,
        missing_total: missingIds.length,
        pages_scanned: latestSync?.pages_scanned || 0,
        status: "running",
        error_message: "Recuperação complementar pela API oficial do Mercado Livre em andamento.",
      })
      .select("id")
      .single();

    if (syncInsertError || !sync) throw new Error(syncInsertError?.message || "Não foi possível iniciar o histórico da recuperação.");
    syncId = sync.id;

    const outcomes = await mapWithConcurrency(missingIds, 5, (id) => recoverOneProduct(id, token));
    const errors = outcomes.filter((result): result is { error: string; productId: string } => "error" in result);
    const recovered = outcomes.filter((result): result is {
      row: RecoveryRow;
      source: "catalog_product" | "direct_item" | "catalog_only" | "public_page";
    } => "row" in result);

    const existingByItemId = new Map(currentRows.map((row) => [String(row.item_id).toUpperCase(), row]));
    const deduped = new Map<string, RecoveryRow>();
    const conflicts: string[] = [];
    for (const result of recovered) {
      const row = result.row;
      const existing = existingByItemId.get(row.item_id.toUpperCase());
      if (existing) {
        if (existing.product_id && String(existing.product_id).toUpperCase() === row.product_id) continue;
        conflicts.push(row.product_id + " (anúncio " + row.item_id + " já pertence a outro registro" +
          (existing.product_id ? " vinculado a " + existing.product_id : " sem vínculo de catálogo") + ")");
        continue;
      }
      const duplicate = deduped.get(row.item_id);
      if (duplicate && duplicate.product_id !== row.product_id) {
        conflicts.push(row.product_id + " (anúncio duplicado " + row.item_id + ")");
        continue;
      }
      deduped.set(row.item_id, row);
    }

    const rowsToSave = Array.from(deduped.values());
    let saved = 0;
    for (let offset = 0; offset < rowsToSave.length; offset += 20) {
      const batch = rowsToSave.slice(offset, offset + 20);
      const { data, error } = await supabase
        .from("ml_social_list_items")
        .upsert(batch, { onConflict: "list_id,item_id" })
        .select("item_id");
      if (error) throw new Error("Falha ao salvar lote da recuperação: " + error.message);
      saved += data?.length || batch.length;
    }

    const { data: finalRows, error: finalReadError } = await supabase
      .from("ml_social_list_items")
      .select("item_id,product_id")
      .eq("list_id", ML_SOCIAL_LIST_ID)
      .limit(1000);
    if (finalReadError) throw new Error("Produtos salvos, mas a conferência final falhou: " + finalReadError.message);

    const finalTotal = (finalRows || []).length;
    const finalCoveredIds = getCoveredBookmarkIds(bookmarkIds, finalRows || []);
    const stillMissingIds = bookmarkIds.filter((id) => !finalCoveredIds.has(id));
    const stillMissing = stillMissingIds.length;
    const status = stillMissing === 0 ? "complete" : "partial";
    const issueLines = [
      ...errors.map((entry) => entry.productId + ": " + entry.error),
      ...conflicts,
    ];
    const summaryMessage = issueLines.length
      ? "Recuperação via API oficial com pendências: " + issueLines.slice(0, 12).join("; ")
      : "Complemento concluído via API oficial do Mercado Livre. Registros recuperados foram identificados no catálogo.";

    const { error: finishError } = await supabase
      .from("ml_social_list_syncs")
      .update({
        expected_total: expectedTotal,
        fetched_total: finalTotal,
        unique_total: finalCoveredIds.size,
        missing_total: stillMissing,
        pages_scanned: latestSync?.pages_scanned || 0,
        status,
        error_message: issueLines.length ? summaryMessage.slice(0, 2000) : null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncId);
    if (finishError) throw new Error("Produtos gravados, mas o histórico não foi finalizado: " + finishError.message);

    return NextResponse.json({
      ok: true,
      source: "official_bookmarks_plus_catalog_api",
      publicListExpectedTotal: expectedTotal,
      officialUniqueBookmarks: bookmarkIds.length,
      alreadyStoredBefore: currentRows.length,
      missingBefore: missingIds.length,
      recoveredFromCatalogApi: recovered.filter((result) => result.source === "catalog_product").length,
      recoveredFromDirectItemApi: recovered.filter((result) => result.source === "direct_item").length,
      recoveredCatalogOnly: recovered.filter((result) => result.source === "catalog_only").length,
      recoveredFromPublicPage: recovered.filter((result) => result.source === "public_page").length,
      saved,
      finalTotal,
      coveredProductIds: finalCoveredIds.size,
      stillMissing,
      missingProductIds: stillMissingIds,
      unresolvedCount: issueLines.length,
      unresolved: issueLines.slice(0, 50),
      status,
      message: status === "complete"
        ? "Lista completada: os " + finalCoveredIds.size + " IDs únicos da lista estão representados no catálogo. Existem " + finalTotal + " registros de anúncio/catálogo."
        : "Recuperação parcial: " + finalCoveredIds.size + " de " + expectedTotal + " IDs únicos cobertos (" + finalTotal + " registros no banco). " + stillMissing + " IDs ainda precisam de resolução.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido na recuperação da lista.";
    if (syncId) {
      await supabase.from("ml_social_list_syncs").update({
        status: "error",
        error_message: message.slice(0, 2000),
        finished_at: new Date().toISOString(),
      }).eq("id", syncId);
    }
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
