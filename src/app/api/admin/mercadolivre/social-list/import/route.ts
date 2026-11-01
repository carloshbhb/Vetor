import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { ML_SOCIAL_LIST_ID } from "@/lib/mercadolivre-social-list";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const { data: products, error: productsError } = await supabase
    .from("ml_social_list_items")
    .select("item_id,title,product_url,image_url,price")
    .eq("list_id", ML_SOCIAL_LIST_ID)
    .order("title", { ascending: true })
    .limit(1000);

  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });
  if (!products?.length) return NextResponse.json({ error: "A lista ainda não foi sincronizada." }, { status: 409 });

  const { data: existing, error: existingError } = await supabase
    .from("affiliate_links")
    .select("source_ref")
    .eq("source_type", "social_list")
    .like("source_ref", "ml_social_list:" + ML_SOCIAL_LIST_ID + ":%");

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const existingRefs = new Set((existing || []).map((row) => String(row.source_ref)));
  const toInsert = products
    .filter((item) => !existingRefs.has("ml_social_list:" + ML_SOCIAL_LIST_ID + ":" + item.item_id))
    .map((item) => ({
      slug: "ml-lista-" + slugify(item.title) + "-" + item.item_id.toLowerCase(),
      name: item.title,
      marketplace: "Mercado Livre",
      category: "Lista social",
      source_type: "social_list",
      source_ref: "ml_social_list:" + ML_SOCIAL_LIST_ID + ":" + item.item_id,
      destination_url: "",
      product_url: item.product_url,
      status: "active",
      priority: 5,
      notes: "Importado da lista pública Minhas recomendações do perfil Vetor Blog. Link de afiliado ainda não gerado.",
      tags: ["lista-social", "mercado-livre"],
      health_status: "unknown",
      image_url: item.image_url || "",
      price: item.price,
      affiliate_tag: "",
    }));

  let inserted = 0;
  for (let offset = 0; offset < toInsert.length; offset += 50) {
    const { data, error } = await supabase
      .from("affiliate_links")
      .insert(toInsert.slice(offset, offset + 50))
      .select("id");

    if (error) {
      return NextResponse.json({
        error: "Importação interrompida após " + inserted + " produtos: " + error.message,
        inserted,
        existing: existingRefs.size,
      }, { status: 500 });
    }
    inserted += data?.length || 0;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    alreadyImported: existingRefs.size,
    catalogTotal: products.length,
    message: inserted
      ? inserted + " produto(s) enviado(s) à fila de pesquisa do Mercado Livre. Nenhum link de afiliado foi gerado ou aplicado."
      : "Todos os produtos sincronizados já estavam na fila de pesquisa.",
  });
}
