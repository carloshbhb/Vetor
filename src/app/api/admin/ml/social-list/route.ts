import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getValidAccessToken, getSessionInfo } from "@/lib/mercadolivre-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ML_API = "https://api.mercadolibre.com";
// Stable identifier for the public recommendation list shared by the user.
const LIST_ID = "2AB7vfL";
const BULK_SIZE = 20;
const UPSERT_BATCH_SIZE = 100;

type Bookmark = { item_id?: string; bookmarked_date?: string };
type MLItem = {
  id?: string;
  title?: string;
  permalink?: string;
  price?: number;
  original_price?: number | null;
  thumbnail?: string;
  pictures?: Array<{ secure_url?: string; url?: string }>;
  category_id?: string;
};
type BulkEntry = { code?: number; status_code?: number; body?: MLItem; id?: string } & MLItem;

function jsonError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function mlGet<T>(path: string, token: string): Promise<T> {
  const response = await fetch(ML_API + path, {
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1200);
    throw new Error(`Mercado Livre API ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

function normalizeItem(entry: BulkEntry): MLItem | null {
  const item = entry.body || entry;
  const id = String(item.id || entry.id || "");
  if (!id || !(entry.code === undefined || entry.code === 200 || entry.status_code === 200)) return null;
  return { ...item, id };
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return jsonError("Supabase Service Role não configurado.", 503);

  let syncId: string | null = null;
  try {
    const session = await getSessionInfo();
    const token = await getValidAccessToken();
    const bookmarks = await mlGet<Bookmark[]>("/users/me/bookmarks", token);
    if (!Array.isArray(bookmarks)) {
      throw new Error("A API de favoritos retornou um formato inesperado.");
    }

    const uniqueIds = [...new Set(bookmarks.map((item) => String(item.item_id || "").trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      throw new Error("A lista de favoritos retornou vazia; nenhuma alteração foi feita.");
    }

    const { data: syncRow, error: syncInsertError } = await supabase
      .from("ml_social_list_syncs")
      .insert({
        list_id: LIST_ID,
        expected_total: uniqueIds.length,
        fetched_total: 0,
        unique_total: uniqueIds.length,
        missing_total: 0,
        pages_scanned: 1,
        status: "running",
      })
      .select("id")
      .single();
    if (syncInsertError || !syncRow) {
      throw new Error("Não foi possível iniciar o registro de sincronização: " + (syncInsertError?.message || "sem ID"));
    }
    syncId = String(syncRow.id);

    const details: MLItem[] = [];
    const failures: string[] = [];
    for (let offset = 0; offset < uniqueIds.length; offset += BULK_SIZE) {
      const ids = uniqueIds.slice(offset, offset + BULK_SIZE);
      const query = new URLSearchParams({ ids: ids.join(",") });
      query.set("attributes", "body.id,body.title,body.permalink,body.price,body.original_price,body.thumbnail,body.pictures,body.category_id");
      const entries = await mlGet<BulkEntry[]>(`/items/bulk?${query.toString()}`, token);
      if (!Array.isArray(entries)) throw new Error("Resposta inesperada ao consultar detalhes em lote do Mercado Livre.");

      for (const entry of entries) {
        const item = normalizeItem(entry);
        if (item) details.push(item);
        else if (entry.id) failures.push(String(entry.id));
      }
    }

    const detailById = new Map(details.map((item) => [String(item.id), item]));
    const resolved = uniqueIds.flatMap((id, index) => {
      const item = detailById.get(id);
      if (!item?.title) {
        failures.push(id);
        return [];
      }
      const image = item.pictures?.find((picture) => picture.secure_url || picture.url);
      return [{
        list_id: LIST_ID,
        item_id: id,
        product_id: id,
        title: item.title,
        product_url: item.permalink || `https://www.mercadolivre.com.br/p/${encodeURIComponent(id)}`,
        image_url: image?.secure_url || image?.url || item.thumbnail || null,
        price: Number.isFinite(Number(item.price)) ? Number(item.price) : null,
        original_price: item.original_price == null ? null : Number(item.original_price),
        page_number: Math.floor(index / 50) + 1,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }];
    });

    if (resolved.length === 0) {
      throw new Error("Nenhum produto teve seus detalhes recuperados; os dados existentes foram preservados.");
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("ml_social_list_items")
      .select("id,item_id")
      .eq("list_id", LIST_ID);
    if (existingError) throw new Error("Falha ao consultar itens já importados: " + existingError.message);

    const existingIds = new Map((existingRows || []).map((row: { id: string; item_id: string }) => [row.item_id, row.id]));
    const rows = resolved.map((row) => {
      const existingId = existingIds.get(row.item_id);
      return existingId ? { ...row, id: existingId } : row;
    });

    for (let offset = 0; offset < rows.length; offset += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + UPSERT_BATCH_SIZE);
      const { error } = await supabase.from("ml_social_list_items").upsert(batch, { onConflict: "id" });
      if (error) throw new Error("Falha ao salvar lote de produtos: " + error.message);
    }

    const missingIds = [...new Set(failures)];
    const complete = resolved.length === uniqueIds.length;
    const { error: syncUpdateError } = await supabase
      .from("ml_social_list_syncs")
      .update({
        expected_total: bookmarks.length,
        fetched_total: resolved.length,
        unique_total: uniqueIds.length,
        missing_total: missingIds.length,
        pages_scanned: 1,
        status: complete ? "complete" : "partial",
        error_message: complete ? null : `Detalhes não recuperados para ${missingIds.length} produto(s).`,
        finished_at: new Date().toISOString(),
      })
      .eq("id", syncId);
    if (syncUpdateError) throw new Error("Produtos salvos, mas não foi possível finalizar o histórico: " + syncUpdateError.message);

    return NextResponse.json({
      success: complete,
      status: complete ? "complete" : "partial",
      source: "GET /users/me/bookmarks",
      publicList: "https://meli.la/" + LIST_ID,
      mercadoLivreUserId: session?.userId || null,
      expected: bookmarks.length,
      unique: uniqueIds.length,
      imported: resolved.length,
      missing: missingIds.length,
      syncId,
      message: complete
        ? "Lista sincronizada e produtos atualizados no Supabase."
        : "Sincronização parcial. Produtos recuperados foram salvos; os itens ausentes foram preservados para nova tentativa.",
    }, { status: complete ? 200 : 207 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar a lista.";
    if (syncId) {
      await supabase.from("ml_social_list_syncs").update({
        status: "error",
        error_message: message.slice(0, 2000),
        finished_at: new Date().toISOString(),
      }).eq("id", syncId);
    }
    console.error("[ML social list sync]", error);
    return jsonError(message, 502);
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return jsonError("Supabase Service Role não configurado.", 503);

  const [{ data: items, error: itemsError }, { data: syncs, error: syncsError }] = await Promise.all([
    supabase.from("ml_social_list_items").select("item_id,title,product_url,image_url,price,original_price,page_number,last_seen_at").eq("list_id", LIST_ID).order("page_number").order("title"),
    supabase.from("ml_social_list_syncs").select("id,expected_total,fetched_total,unique_total,missing_total,pages_scanned,status,error_message,started_at,finished_at").eq("list_id", LIST_ID).order("started_at", { ascending: false }).limit(10),
  ]);

  if (itemsError || syncsError) return jsonError(itemsError?.message || syncsError?.message || "Falha ao consultar a lista.", 500);
  return NextResponse.json({
    success: true,
    listId: LIST_ID,
    publicList: "https://meli.la/" + LIST_ID,
    total: items?.length || 0,
    items: items || [],
    syncs: syncs || [],
  });
}
