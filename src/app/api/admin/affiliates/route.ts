import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  createAffiliateLink,
  getAffiliateLinkStats,
  getAffiliateMarketplaceOptions,
  listAffiliateLinksPage,
  type AffiliateHealthStatus,
  type AffiliateLinkStatus,
  type AffiliateSourceType,
} from "@/lib/affiliate-links";

const statusValues: AffiliateLinkStatus[] = ["active", "paused", "broken", "archived"];
const sourceValues: AffiliateSourceType[] = ["review", "comparison_product", "product_link", "manual"];
const healthValues: AffiliateHealthStatus[] = ["unknown", "healthy", "redirect", "error"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AffiliateLinkStatus | null;
  const source_type = searchParams.get("source_type") as AffiliateSourceType | null;
  const health_status = searchParams.get("health_status") as AffiliateHealthStatus | null;
  const marketplace = searchParams.get("marketplace") || undefined;
  const search = searchParams.get("search") || undefined;

  const limitRaw = Number(searchParams.get("limit") || 50);
  const offsetRaw = Number(searchParams.get("offset") || 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  const filters: Parameters<typeof listAffiliateLinksPage>[0] = {
    ...(status && statusValues.includes(status) ? { status } : {}),
    ...(source_type && sourceValues.includes(source_type) ? { source_type } : {}),
    ...(health_status && healthValues.includes(health_status) ? { health_status } : {}),
    marketplace,
    search,
    limit: Number.isFinite(limitRaw) ? limitRaw : 50,
    offset,
  };

  const [page, stats, marketplaces] = await Promise.all([
    listAffiliateLinksPage(filters),
    getAffiliateLinkStats(),
    getAffiliateMarketplaceOptions(),
  ]);

  const response = NextResponse.json({
    data: page.data,
    total: page.total,
    offset,
    limit: Math.min(Math.max(filters.limit || 50, 1), 200),
    hasMore: offset + page.data.length < page.total,
    stats,
    marketplaces,
    source: "public.affiliate_links",
    generatedAt: new Date().toISOString(),
  });

  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return response;
}

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = await createAffiliateLink({
      slug: String(body.slug || body.name || ""),
      name: String(body.name || ""),
      marketplace: String(body.marketplace || "Outro"),
      category: String(body.category || ""),
      source_type: sourceValues.includes(body.source_type) ? body.source_type : "manual",
      source_ref: String(body.source_ref || ""),
      destination_url: String(body.destination_url || ""),
      product_url: String(body.product_url || ""),
      affiliate_tag: String(body.affiliate_tag || ""),
      affiliate_checked_at: body.affiliate_checked_at ? String(body.affiliate_checked_at) : null,
      image_url: String(body.image_url || ""),
      price: body.price == null || body.price === "" ? null : Number(body.price),
      status: statusValues.includes(body.status) ? body.status : "active",
      priority: Number(body.priority || 0),
      notes: String(body.notes || ""),
      tags: Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [],
    });

    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível criar o link." },
      { status: 400 }
    );
  }
}
