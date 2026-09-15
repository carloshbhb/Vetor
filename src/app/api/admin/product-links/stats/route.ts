import { NextResponse } from "next/server";
import { getProductLinksStats } from "@/lib/product-links";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getProductLinksStats();
  return NextResponse.json({ data: stats });
}
