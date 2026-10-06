import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { syncPublishedReviewAffiliateLinks } from "@/lib/affiliate-links";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const changed = await syncPublishedReviewAffiliateLinks();
    const response = NextResponse.json({
      ok: true,
      changed,
      message: changed
        ? String(changed) + " registro(s) sincronizado(s)."
        : "O registro central já está sincronizado.",
      source: "public.affiliate_links",
      generatedAt: new Date().toISOString(),
    });
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao sincronizar.",
      },
      { status: 500 }
    );
  }
}
