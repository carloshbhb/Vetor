import { NextResponse } from "next/server";
import { getProductLinksWaitingForAffiliate } from "@/lib/product-links";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "0", 10) || 0;
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50;

  const result = await getProductLinksWaitingForAffiliate(page, limit);
  return NextResponse.json({ data: result.data, total: result.total });
}