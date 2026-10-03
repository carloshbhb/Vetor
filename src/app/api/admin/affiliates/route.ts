import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  createAffiliateLink,
  getAffiliateLinkStats,
  getAffiliateMarketplaceOptions,
  listAffiliateLinks,
  syncPublishedReviewAffiliateLinks,
  type AffiliateHealthStatus,
  type AffiliateLinkStatus,
  type AffiliateSourceType,
} from "@/lib/affiliate-links";

const statusValues: AffiliateLinkStatus[] = ["active", "paused", "broken", "archived"];
const sourceValues: AffiliateSourceType[] = ["review", "comparison_product", "product_link", "manual"];
const healthValues: AffiliateHealthStatus[] = ["unknown", "healthy", "redirect", "error"];

export async function GET(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status") as AffiliateLinkStatus | null;
  const source_type = searchParams.get("source_type") as AffiliateSourceType | null;
  const health_status = searchParams.get("health_status") as AffiliateHealthStatus | null;
  const marketplace = searchParams.get("marketplace") || undefined;
  const search = searchParams.get("search") || undefined;
  const limitRaw = Number(searchParams.get("limit") || 120);
  const offsetRaw = Number(searchParams.get("offset") || 0);

  const filters: Parameters<typeof listAffiliateLinks>[0] = {
    ...(status && statusValues.includes(status) ? { status } : {}),
    ...(source_type && sourceValues.includes(source_type) ? { source_type } : {}),
    ...(health_status && healthValues.includes(health_status) ? { health_status } : {}),
    marketplace,
    search,
    limit: Number.isFinite(limitRaw) ? limitRaw : 120,
    offset: Number.isFinite(offsetRaw) ? offsetRaw : 0,
  };

  await syncPublishedReviewAffiliateLinks();

  const [links, stats, marketplaces] = await Promise.all([
    listAffiliateLinks(filters),
    getAffiliateLinkStats(),
    getAffiliateMarketplaceOptions(),
  ]);

  return NextResponse.json({ data: links, stats, marketplaces });
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
