import { NextResponse } from "next/server";
import {
  getProductLinkById,
  updateProductLink,
  deleteProductLink,
} from "@/lib/product-links";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const link = await getProductLinkById(id);
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: link });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();

  const { error } = await updateProductLink(id, body);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const { error } = await deleteProductLink(id);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
