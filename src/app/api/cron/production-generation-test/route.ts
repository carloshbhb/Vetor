import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getNextReviewProductLink, markProductLinkReviewed } from "@/lib/product-links";
import { productLinkToPipelineInput, runReviewPipeline } from "@/lib/content-pipeline";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;
// The LLM client is time-bounded and falls back to the next configured provider.

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;
  try {
    // Read-only, authenticated version probe for CI. It returns before any queue
    // or AI work so the smoke test can wait for this exact commit in Production.
    const requestBody = await request.json().catch(() => null);
    if (
      requestBody &&
      typeof requestBody === "object" &&
      !Array.isArray(requestBody) &&
      (requestBody as { action?: unknown }).action === "deploymentInfo"
    ) {
      return NextResponse.json(
        {
          success: true,
          deploymentCommit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
          deploymentUrl: process.env.VERCEL_URL?.trim() || null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const link = await getNextReviewProductLink();
    if (!link) {
      return NextResponse.json(
        { error: "Nenhum produto elegível em product_links. Verifique a migração de restauração da fila." },
        { status: 409 }
      );
    }
    const input = productLinkToPipelineInput(link);
    if (!input.title || !input.product_url || !input.affiliate_url || !input.image) {
      return NextResponse.json({ error: "Produto sem URL real, afiliado ou imagem; sem dados de fallback." }, { status: 422 });
    }
    const outcome = await runReviewPipeline(input, "cron");
    if (outcome.status !== "created") {
      const message = outcome.status === "validation_failed"
        ? `Review recusado pelo controle editorial: ${outcome.issues.join(" | ")}`
        : outcome.status === "db_error" || outcome.status === "generation_error"
          ? outcome.error
          : "Não foi possível gerar o review.";
      return NextResponse.json({ error: message, details: outcome }, { status: 422 });
    }

    const supabase = getSupabaseServiceKeyClient();
    if (!supabase) return NextResponse.json({ error: "Supabase service client não configurado." }, { status: 500 });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vetor.blog";
    const reviewUrl = new URL(`/reviews/${outcome.slug}/`, siteUrl).toString();

    const { data: existingVideo, error: existingError } = await supabase
      .from("video_queue")
      .select("id,status,youtube_url")
      .eq("review_url", reviewUrl)
      .in("status", ["pending", "processing", "completed"])
      .limit(1)
      .maybeSingle();
    if (existingError) return NextResponse.json({ error: `Falha ao verificar duplicidade: ${existingError.message}` }, { status: 500 });
    if (existingVideo) {
      return NextResponse.json({
        success: true, reused: true, videoId: existingVideo.id,
        videoStatus: existingVideo.status, youtubeUrl: existingVideo.youtube_url,
        reviewUrl, slug: outcome.slug, title: outcome.title,
      });
    }

    const { error: publishError } = await supabase
      .from("reviews")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("slug", outcome.slug);
    if (publishError) {
      return NextResponse.json({ error: `Review criado, mas publicação falhou: ${publishError.message}`, reviewUrl, slug: outcome.slug }, { status: 500 });
    }

    const { data: video, error: queueError } = await supabase
      .from("video_queue")
      .insert({
        product_url: input.product_url,
        product_title: input.title,
        product_category: input.category || "Tecnologia",
        product_price: String(input.price || "Consulte o preço"),
        product_image_url: input.image,
        affiliate_url: input.affiliate_url,
        shortened_affiliate_url: input.affiliate_url,
        review_url: reviewUrl,
        status: "pending",
        scheduled_at: new Date().toISOString(),
      })
      .select("id,product_title,status,review_url,affiliate_url")
      .single();
    if (queueError || !video) {
      await supabase.from("reviews").update({ status: "draft", updated_at: new Date().toISOString() }).eq("slug", outcome.slug);
      return NextResponse.json({ error: `Review salvo, mas a fila falhou: ${queueError?.message || "registro não retornado"}` }, { status: 500 });
    }

    const linkUpdate = await markProductLinkReviewed(link.id, outcome.slug);
    if (linkUpdate.error) console.warn("[production-generation-test] product link update failed:", linkUpdate.error);
    return NextResponse.json({
      success: true, videoId: video.id, videoStatus: video.status,
      reviewUrl, purchaseUrl: video.affiliate_url, slug: outcome.slug, title: outcome.title,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[production-generation-test] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
