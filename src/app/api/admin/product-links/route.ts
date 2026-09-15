import { NextResponse } from "next/server";
import { getAllProductLinks, createProductLink } from "@/lib/product-links";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const hasReview = searchParams.get("has_review");
  const hasVideo = searchParams.get("has_video");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  const filters: Parameters<typeof getAllProductLinks>[0] = {};
  if (category) filters.category = category;
  if (status) filters.status = status;
  if (search) filters.search = search;
  if (hasReview !== null) filters.has_review = hasReview === "true";
  if (hasVideo !== null) filters.has_video = hasVideo === "true";
  if (limit) filters.limit = parseInt(limit, 10);
  if (offset) filters.offset = parseInt(offset, 10);

  const links = await getAllProductLinks(filters);
  return NextResponse.json({ data: links, total: links.length });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await createProductLink({
    slug: body.slug ?? "",
    product_name: body.product_name ?? "",
    category: body.category ?? "",
    product_url: body.product_url ?? "",
    affiliate_url: body.affiliate_url ?? "",
    image_url: body.image_url ?? "",
    marketplace: body.marketplace ?? "mercadolivre",
    status: body.status ?? "pending",
    source: body.source ?? "manual",
    has_review: body.has_review ?? false,
    has_video: body.has_video ?? false,
    review_slug: body.review_slug ?? null,
    video_id: body.video_id ?? null,
    price: body.price ?? null,
    score: body.score ?? null,
    priority: body.priority ?? 0,
    notes: body.notes ?? "",
    tags: body.tags ?? [],
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
