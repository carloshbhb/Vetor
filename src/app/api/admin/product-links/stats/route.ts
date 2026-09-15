import { NextResponse } from "next/server";
import { getProductLinksStats } from "@/lib/product-links";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const stats = await getProductLinksStats();
  return NextResponse.json({ data: stats });
}
