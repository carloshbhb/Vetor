import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const orderStatuses = ["reported_unverified","pending","approved","rejected","cancelled","returned"] as const;
const attributionStatuses = ["pending_verification","unknown","attributed","unattributed"] as const;
const attributionSources = ["unknown","website_review","youtube_video","other","user_reported"] as const;

function parseDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
function parseAmount(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const db = getSupabaseServiceKeyClient();
  if (!db) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50;
  const { data, error } = await db.from("affiliate_sales").select("*")
    .order("reported_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: data?.length || 0 });
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const db = getSupabaseServiceKeyClient();
  if (!db) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }

  const productTitle = String(body.productTitle || body.product_title || "").trim().slice(0, 300);
  if (productTitle.length < 3) return NextResponse.json({ error: "Informe o produto vendido." }, { status: 400 });
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });

  const soldAt = parseDate(body.soldAt ?? body.sold_at);
  const saleAmount = parseAmount(body.saleAmount ?? body.sale_amount);
  const commissionAmount = parseAmount(body.commissionAmount ?? body.commission_amount);
  if (soldAt === undefined || saleAmount === undefined || commissionAmount === undefined) return NextResponse.json({ error: "Data ou valor inválido." }, { status: 400 });

  const marketplace = String(body.marketplace || "Mercado Livre").trim().slice(0, 100);
  const orderId = String(body.externalOrderId || body.external_order_id || "").trim().slice(0, 160) || null;
  const reference = String(body.sourceReference || body.source_reference || "").trim().slice(0, 200) || null;
  const id = String(body.id || "").trim() || null;
  if (!id && !orderId && !reference) return NextResponse.json({ error: "Informe o ID do pedido ou referência única do relatório para evitar duplicações." }, { status: 400 });

  const orderStatus = String(body.orderStatus || body.order_status || "pending");
  const attributionStatus = String(body.attributionStatus || body.attribution_status || "pending_verification");
  const attributionSource = String(body.attributionSource || body.attribution_source || "unknown");
  const sourceSystem = String(body.sourceSystem || body.source_system || "marketplace_portal");
  if (!orderStatuses.includes(orderStatus as typeof orderStatuses[number])) return NextResponse.json({ error: "Status de venda inválido." }, { status: 400 });
  if (!attributionStatuses.includes(attributionStatus as typeof attributionStatuses[number])) return NextResponse.json({ error: "Status de atribuição inválido." }, { status: 400 });
  if (!attributionSources.includes(attributionSource as typeof attributionSources[number])) return NextResponse.json({ error: "Canal de atribuição inválido." }, { status: 400 });
  if (!["marketplace_portal","marketplace_export","user_reported","manual"].includes(sourceSystem)) return NextResponse.json({ error: "Fonte do registro inválida." }, { status: 400 });

  const confidence = Number(body.attributionConfidence ?? body.attribution_confidence ?? 0);
  const row = {
    marketplace, external_order_id: orderId, source_reference: reference, product_title: productTitle,
    marketplace_item_id: String(body.marketplaceItemId || body.marketplace_item_id || "").trim().slice(0, 100) || null,
    quantity, sold_at: soldAt, sale_amount: saleAmount, commission_amount: commissionAmount,
    currency: String(body.currency || "BRL").trim().slice(0, 3).toUpperCase(),
    order_status: orderStatus, attribution_status: attributionStatus, attribution_source: attributionSource,
    attribution_confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, Math.round(confidence))) : 0,
    video_id: String(body.videoId || body.video_id || "").trim().slice(0, 80) || null,
    review_slug: String(body.reviewSlug || body.review_slug || "").trim().slice(0, 180) || null,
    source_system: sourceSystem, notes: String(body.notes || "").trim().slice(0, 2000),
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
    updated_at: new Date().toISOString(),
  };

  let existingId = id;
  if (!existingId && orderId) {
    const result = await db.from("affiliate_sales").select("id").eq("marketplace", marketplace).eq("external_order_id", orderId).maybeSingle();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    existingId = result.data?.id || null;
  }
  if (!existingId && reference) {
    const result = await db.from("affiliate_sales").select("id").eq("marketplace", marketplace).eq("source_reference", reference).maybeSingle();
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    existingId = result.data?.id || null;
  }

  const columns = "id,marketplace,external_order_id,source_reference,product_title,quantity,sold_at,reported_at,sale_amount,commission_amount,currency,order_status,attribution_status,attribution_source,attribution_confidence,video_id,review_slug,source_system,notes";
  const result = existingId
    ? await db.from("affiliate_sales").update(row).eq("id", existingId).select(columns).single()
    : await db.from("affiliate_sales").insert(row).select(columns).single();
  if (result.error || !result.data) return NextResponse.json({ error: result.error?.message || "Não foi possível salvar a venda." }, { status: 400 });
  return NextResponse.json({ data: result.data, updated: Boolean(existingId) }, { status: existingId ? 200 : 201 });
}
