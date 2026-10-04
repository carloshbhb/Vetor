import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { archiveAffiliateLink, getAffiliateLinkById, updateAffiliateLink } from "@/lib/affiliate-links";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const { id } = await params;
  // id may also be a slug, which is useful for direct administration/debugging.
  const result = await updateLookup(id);
  if (!result) return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
  return NextResponse.json({ data: result });
}

async function updateLookup(id: string) {
  return getAffiliateLinkById(id);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const { id } = await params;
  try {
    const body = await request.json();
    for (const field of ["product_url", "image_url", "destination_url"] as const) {
      if (body[field] === undefined || !body[field]) continue;
      try {
        const parsed = new URL(String(body[field]));
        if (parsed.protocol !== "https:") throw new Error();
      } catch {
        return NextResponse.json({ error: `${field} precisa ser uma URL HTTPS válida.` }, { status: 400 });
      }
    }
    if (body.affiliate_tag !== undefined && String(body.affiliate_tag).length > 30) {
      return NextResponse.json({ error: "A etiqueta da Central aceita até 30 caracteres." }, { status: 400 });
    }
    if (body.price !== undefined && body.price !== null && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) {
      return NextResponse.json({ error: "O preço precisa ser um número igual ou maior que zero." }, { status: 400 });
    }
    const result = await updateAffiliateLink(id, {
      ...(body.slug !== undefined ? { slug: String(body.slug) } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.marketplace !== undefined ? { marketplace: String(body.marketplace) } : {}),
      ...(body.category !== undefined ? { category: String(body.category) } : {}),
      ...(body.source_type !== undefined ? { source_type: body.source_type } : {}),
      ...(body.source_ref !== undefined ? { source_ref: String(body.source_ref) } : {}),
      ...(body.destination_url !== undefined ? { destination_url: String(body.destination_url) } : {}),
      ...(body.product_url !== undefined ? { product_url: String(body.product_url) } : {}),
      ...(body.affiliate_tag !== undefined ? { affiliate_tag: String(body.affiliate_tag) } : {}),
      ...(body.affiliate_checked_at !== undefined ? { affiliate_checked_at: body.affiliate_checked_at ? String(body.affiliate_checked_at) : null } : {}),
      ...(body.image_url !== undefined ? { image_url: String(body.image_url) } : {}),
      ...(body.price !== undefined ? { price: body.price == null || body.price === "" ? null : Number(body.price) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.priority !== undefined ? { priority: Number(body.priority) } : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes) } : {}),
      ...(body.tags !== undefined ? { tags: Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [] } : {}),
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ data: result.data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const { id } = await params;
  const result = await archiveAffiliateLink(id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ data: result.data });
}
