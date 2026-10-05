import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: { slug?: string | null; category?: string | null } | null;
  old_record?: { slug?: string | null; category?: string | null } | null;
};

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.REVALIDATE_WEBHOOK_SECRET;
  const received = request.headers.get("x-revalidate-secret");

  if (!expected || !received || expected.length < 32) return false;

  return received === expected;
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

  for (const slug of slugs) {
    revalidatePath(`/reviews/${slug}`);
  }

  revalidatePath("/reviews");

  const categories = Array.from(
    new Set(
      [payload.record?.category, payload.old_record?.category].filter(
        (category): category is string => Boolean(category?.trim())
      )
    )
  );

  for (const category of categories) {
    revalidatePath(`/reviews/categoria/${encodeURIComponent(category)}`);
  }

  return NextResponse.json({
    ok: true,
    revalidated: true,
    slugs,
    type: payload.type ?? null,
  });
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
