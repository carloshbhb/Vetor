import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { fetchPublicSocialList, ML_SOCIAL_LIST_ID } from "@/lib/mercadolivre-social-list";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

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

  return NextResponse.json({
    items: data || [],
    total: count || 0,
    page,
    limit,
    sync: syncs?.[0] || null,
  });
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

  if (syncInsertError || !sync) {
    return NextResponse.json({ error: syncInsertError?.message || "Não foi possível iniciar a sincronização." }, { status: 500 });
  }

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

    const missing = result.expectedTotal == null
      ? 0
      : Math.max(0, result.expectedTotal - result.items.length);
    const status = result.expectedTotal == null || missing > 0 ? "partial" : "complete";
    const summary = {
      expected_total: result.expectedTotal,
      fetched_total: result.items.length,
      unique_total: result.items.length,
      missing_total: missing,
      pages_scanned: result.pagesScanned,
      status,
      error_message: result.expectedTotal == null ? "O contador total não foi localizado na página pública." : (missing > 0 ? "A página pública não expôs todos os produtos declarados no contador." : null),
      finished_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("ml_social_list_syncs")
      .update(summary)
      .eq("id", sync.id);

    if (updateError) throw new Error("Produtos gravados, mas não foi possível finalizar o histórico: " + updateError.message);

    return NextResponse.json({
      ok: true,
      saved,
      ...summary,
      message: result.expectedTotal == null
        ? "Sincronização parcial: produtos importados, mas o contador total da página não pôde ser validado."
        : missing > 0
          ? "Sincronização parcial: o Mercado Livre informa " + result.expectedTotal + " resultados, mas a página pública expôs " + result.items.length + " produtos únicos."
          : "Lista pública sincronizada.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.";
    await supabase
      .from("ml_social_list_syncs")
      .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
      .eq("id", sync.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
