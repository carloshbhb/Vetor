import { NextResponse } from "next/server";
import { createProductLink } from "@/lib/product-links";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const items: Array<Record<string, unknown>> = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "Provide an 'items' array with at least one product link" },
      { status: 400 }
    );
  }

  const results: { index: number; error: string | null }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { error } = await createProductLink({
      slug: (item.slug as string) ?? "",
      product_name: (item.product_name as string) ?? "",
      category: (item.category as string) ?? "",
      product_url: (item.product_url as string) ?? "",
      affiliate_url: (item.affiliate_url as string) ?? "",
      image_url: (item.image_url as string) ?? "",
      marketplace: (item.marketplace as string) ?? "mercadolivre",
      status: (item.status as string) ?? "pending",
      source: (item.source as string) ?? "manual",
      has_review: (item.has_review as boolean) ?? false,
      has_video: (item.has_video as boolean) ?? false,
      review_slug: (item.review_slug as string) ?? null,
      video_id: (item.video_id as string) ?? null,
      price: (item.price as number) ?? null,
      score: (item.score as number) ?? null,
      priority: (item.priority as number) ?? 0,
      notes: (item.notes as string) ?? "",
      tags: (item.tags as string[]) ?? [],
    });

    results.push({ index: i, error });
  }

  const created = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    data: { created, failed, total: items.length },
    errors: results.filter((r) => r.error),
  });
}
