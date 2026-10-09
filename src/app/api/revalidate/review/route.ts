import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateReviewSurfaces } from "@/lib/revalidate-content";
import { buildContentUrl, buildReviewIndexNowTargets, pingNewContent } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: { slug?: string | null; category?: string | null; status?: string | null } | null;
  old_record?: { slug?: string | null; category?: string | null; status?: string | null } | null;
};

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_WEBHOOK_SECRET;
  const received = request.headers.get("x-revalidate-secret");

  if (!expected || !received || expected.length < 32) return false;

  const expectedBytes = Buffer.from(expected, 'utf8');
  const receivedBytes = Buffer.from(received, 'utf8');
  if (expectedBytes.length !== receivedBytes.length) return false;

  return timingSafeEqual(expectedBytes, receivedBytes);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: ReviewWebhookPayload;

  try {
    payload = (await request.json()) as ReviewWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (payload.table !== "reviews" || payload.schema !== "public") {
    return NextResponse.json({ ok: false, error: "invalid_source" }, { status: 400 });
  }

  const currentSlug = payload.record?.slug?.trim();
  const previousSlug = payload.old_record?.slug?.trim();

  if (!currentSlug && !previousSlug) {
    return NextResponse.json({ ok: true, revalidated: false });
  }

  const slugs = Array.from(
    new Set([currentSlug, previousSlug].filter((slug): slug is string => Boolean(slug)))
  );

  const categories = Array.from(
    new Set(
      [payload.record?.category, payload.old_record?.category].filter(
        (category): category is string => Boolean(category?.trim())
      )
    )
  );

  revalidateReviewSurfaces(slugs, categories);

  // Supabase Database Webhooks also cover writes that bypass the admin UI.
  // Cache invalidation and search-engine notification are separate operations.
  const currentStatus = payload.record?.status?.toLowerCase();
  const previousStatus = payload.old_record?.status?.toLowerCase();
  const wasPublic = currentStatus === "published" || previousStatus === "published";
  let indexNowStatus: string | null = null;

  if (wasPublic) {
    const changedSlugs = Array.from(
      new Set([currentSlug, previousSlug].filter((slug): slug is string => Boolean(slug)))
    );
    const indexNowTargets = changedSlugs.length
      ? changedSlugs.flatMap((slug) => buildReviewIndexNowTargets(slug, categories))
      : [buildContentUrl("/reviews/")];

    const result = await pingNewContent(
      Array.from(new Set(indexNowTargets)),
      "supabase-review-webhook"
    );
    indexNowStatus = result.status;
  }

  return NextResponse.json({
    ok: true,
    revalidated: true,
    slugs,
    type: payload.type ?? null,
    indexNowStatus,
  });
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
