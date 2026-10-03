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
    const result = await updateAffiliateLink(id, {
      ...(body.slug !== undefined ? { slug: String(body.slug) } : {}),
      ...(body.name !== undefined ? { name: String(body.name) } : {}),
      ...(body.marketplace !== undefined ? { marketplace: String(body.marketplace) } : {}),
      ...(body.category !== undefined ? { category: String(body.category) } : {}),
      ...(body.source_type !== undefined ? { source_type: body.source_type } : {}),
      ...(body.source_ref !== undefined ? { source_ref: String(body.source_ref) } : {}),
      ...(body.destination_url !== undefined ? { destination_url: String(body.destination_url) } : {}),
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
