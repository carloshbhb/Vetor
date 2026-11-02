import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getValidAccessToken } from "@/lib/mercadolivre-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { diagnosePublicSocialList, fetchPublicSocialList, ML_SOCIAL_LIST_ID } from "@/lib/mercadolivre-social-list";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  if (request.nextUrl.searchParams.get("bookmarks") === "1") {
    try {
      const token = await getValidAccessToken();
      const response = await fetch("https://api.mercadolibre.com/users/me/bookmarks", {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        return NextResponse.json({
          ok: false,
          source: "official_bookmarks_api",
          status: response.status,
          error: "A API oficial de favoritos retornou HTTP " + response.status + ".",
          details,
        }, { status: 502 });
      }

      const payload: unknown = await response.json();
      const rows = Array.isArray(payload) ? payload as Array<{ item_id?: unknown }> : [];
      const rawItemIds = rows.map((row) => String(row?.item_id || "").trim().toUpperCase()).filter(Boolean);
      const allBookmarkIds = Array.from(new Set(rawItemIds.filter((id) => /^[A-Z]{3}\d+$/.test(id))));
      const bookmarkIds = allBookmarkIds.filter((id) => /^MLB\d+$/.test(id));
      const prefixCounts = allBookmarkIds.reduce((counts, id) => {
        const prefix = id.slice(0, 3);
        counts[prefix] = (counts[prefix] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const supabase = getSupabaseServiceKeyClient();
      if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

      const { data: stored, error: storedError } = await supabase
        .from("ml_social_list_items")
        .select("item_id")
        .eq("list_id", ML_SOCIAL_LIST_ID)
        .limit(1000);

      if (storedError) return NextResponse.json({ error: storedError.message }, { status: 500 });

      const storedIds = new Set((stored || []).map((row) => String(row.item_id).toUpperCase()));
      const matching = bookmarkIds.filter((id) => storedIds.has(id));
      const notInSocialImport = bookmarkIds.filter((id) => !storedIds.has(id));

      return NextResponse.json({
        ok: true,
        source: "official_bookmarks_api",
        scope: "all_bookmarks_for_authenticated_user",
        totalRows: rows.length,
        uniqueProductIds: allBookmarkIds.length,
        uniqueMLBProductIds: bookmarkIds.length,
        productIdPrefixCounts: prefixCounts,
        sampleProductIds: allBookmarkIds.slice(0, 10),
        invalidItemIdRows: rawItemIds.length - allBookmarkIds.length,
        importedSocialListIds: storedIds.size,
        overlapWithImportedList: matching.length,
        bookmarkIdsNotInSocialImport: notInSocialImport.length,
        sampleNotInSocialImport: notInSocialImport.slice(0, 50),
        note: "O endpoint oficial retorna favoritos da conta, não garante que os itens pertençam exclusivamente à lista social. Nenhum registro foi alterado.",
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao consultar favoritos oficiais.",
      }, { status: 502 });
    }
  }

  if (request.nextUrl.searchParams.get("diagnostics") === "1") {
    try {
      return NextResponse.json({ ok: true, diagnostics: await diagnosePublicSocialList() });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no diagnóstico." }, { status: 502 });
    }
  }

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(params.get("limit") || 50)));
  const queryText = String(params.get("q") || "").trim();
  const from = (page - 1) * limit;

  let query = supabase
    .from("ml_social_list_items")
    .select("item_id,product_id,title,product_url,image_url,price,original_price,rating,review_count,highlight,page_number,last_seen_at", { count: "exact" })
    .eq("list_id", ML_SOCIAL_LIST_ID)
    .order("title", { ascending: true })
    .range(from, from + limit - 1);

  if (queryText) query = query.ilike("title", "%" + queryText.replace(/[%_]/g, "") + "%");

  const [{ data, error, count }, { data: syncs, error: syncError }] = await Promise.all([
    query,
    supabase.from("ml_social_list_syncs").select("*").eq("list_id", ML_SOCIAL_LIST_ID).order("started_at", { ascending: false }).limit(1),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (syncError) return NextResponse.json({ error: syncError.message }, { status: 500 });

  return NextResponse.json({ items: data || [], total: count || 0, page, limit, sync: syncs?.[0] || null });
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data: sync, error: syncInsertError } = await supabase
    .from("ml_social_list_syncs")
    .insert({ list_id: ML_SOCIAL_LIST_ID, status: "running" })
    .select("id")
    .single();

  if (syncInsertError || !sync) return NextResponse.json({ error: syncInsertError?.message || "Não foi possível iniciar a sincronização." }, { status: 500 });

  try {
    const result = await fetchPublicSocialList();
    if (!result.items.length) throw new Error("A página pública não retornou produtos.");

    let saved = 0;
    for (let offset = 0; offset < result.items.length; offset += 50) {
      const batch = result.items.slice(offset, offset + 50);
      const { data, error } = await supabase
        .from("ml_social_list_items")
        .upsert(batch, { onConflict: "list_id,item_id" })
        .select("item_id");
      if (error) throw new Error("Falha ao gravar lote " + (Math.floor(offset / 50) + 1) + ": " + error.message);
      saved += data?.length || batch.length;
    }

    const missing = result.expectedTotal == null ? null : Math.max(0, result.expectedTotal - result.items.length);
    const status = missing == null || missing > 0 ? "partial" : "complete";
    const summary = {
      expected_total: result.expectedTotal,
      fetched_total: result.items.length,
      unique_total: result.items.length,
      missing_total: missing,
      pages_scanned: result.pagesScanned,
      status,
      error_message: missing == null ? "O contador total não foi localizado na página pública." : (missing > 0 ? "A página pública não expôs todos os produtos declarados no contador." : null),
      finished_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("ml_social_list_syncs").update(summary).eq("id", sync.id);
    if (updateError) throw new Error("Produtos gravados, mas não foi possível finalizar o histórico: " + updateError.message);

    return NextResponse.json({
      ok: true, saved, ...summary,
      message: result.expectedTotal == null
        ? "Sincronização parcial: produtos importados, mas o contador total da página não pôde ser validado."
        : (missing || 0) > 0
          ? "Sincronização parcial: o Mercado Livre informa " + result.expectedTotal + " resultados, mas a página pública expôs " + result.items.length + " produtos únicos."
          : "Lista pública sincronizada.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.";
    await supabase.from("ml_social_list_syncs").update({ status: "error", error_message: message, finished_at: new Date().toISOString() }).eq("id", sync.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
