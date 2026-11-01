import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { buildTrackedAffiliateUrl } from "@/lib/affiliate-attribution";
import { isPublishedComparativeArticle, resolveComparativeVideoAffiliateTarget } from "@/lib/video-queue-guards";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_DAILY_PUBLICATIONS = 15;
type SupabaseServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceKeyClient>>;

function getSaoPauloDayStartIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) throw new Error("Não foi possível determinar a data local de São Paulo.");
  // São Paulo currently observes UTC-03:00 year-round.
  return new Date(`${year}-${month}-${day}T00:00:00-03:00`).toISOString();
}

async function getDailyPublicationQuota(supabase: SupabaseServiceClient) {
  const { count, error } = await supabase
    .from("video_queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .eq("publication_mode", "automatic")
    .gte("completed_at", getSaoPauloDayStartIso());
  if (error) throw error;
  const completedToday = count || 0;
  return {
    dailyLimit: MAX_DAILY_PUBLICATIONS,
    completedToday,
    remaining: Math.max(0, MAX_DAILY_PUBLICATIONS - completedToday),
  };
}

const UPDATABLE_FIELDS = new Set([
  "status",
  "error_message",
  "started_at",
  "completed_at",
  "script_text",
  "script_hook",
  "voiceover_url",
  "voiceover_duration",
  "media_assets",
  "video_url",
  "youtube_video_id",
  "youtube_url",
  "publication_mode",
]);

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return NextResponse.json({ success: false, error: "Supabase service client não configurado no Vetor." }, { status: 500 });
  }

  let action = "unknown";
  try {
    const body = await request.json().catch(() => ({}));
    action = typeof body.action === "string" ? body.action : "";

    if (action === "quota") {
      const quota = await getDailyPublicationQuota(supabase);
      return NextResponse.json({ success: true, ...quota, canPublish: quota.remaining > 0 });
    }

    if (action === "queueFromReviews") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 15);
      const { data: reviews, error: reviewError } = await supabase
        .from("reviews")
        .select("slug,product,category,price_new,image_url,affiliate_url,updated_at")
        .eq("status", "published")
        .eq("content_type", "review")
        .not("affiliate_url", "is", null)
        .not("image_url", "is", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (reviewError) throw reviewError;

      const { data: existing, error: existingError } = await supabase
        .from("video_queue")
        .select("review_url,status")
        .in("status", ["pending", "processing", "completed", "failed"]);
      if (existingError) throw existingError;

      const existingUrls = new Set((existing || []).map((item) => item.review_url).filter(Boolean));
      const candidates = (reviews || []).filter((item) =>
        typeof item.slug === "string" &&
        typeof item.product === "string" && item.product.trim().length > 0 &&
        typeof item.affiliate_url === "string" && /^https?:\/\//i.test(item.affiliate_url) &&
        typeof item.image_url === "string" && /^https?:\/\//i.test(item.image_url) &&
        !existingUrls.has(`https://www.vetor.blog/reviews/${item.slug}/`)
      ).slice(0, limit);

      // Reserve 5 long-form slots and 10 Shorts in each day of 15 automatic slots.
      const [{ count: doneToday, error: doneError }, { count: pendingCount, error: pendingError }] = await Promise.all([
        supabase.from("video_queue").select("id", { count: "exact", head: true })
          .eq("status", "completed").eq("publication_mode", "automatic")
          .gte("completed_at", getSaoPauloDayStartIso()),
        supabase.from("video_queue").select("id", { count: "exact", head: true })
          .in("status", ["pending", "processing"]).eq("publication_mode", "automatic")
          .lte("scheduled_at", new Date().toISOString()),
      ]);
      if (doneError) throw doneError;
      if (pendingError) throw pendingError;
      let slotCursor = (doneToday || 0) + (pendingCount || 0);

      const { data: managedLinks, error: managedError } = await supabase
        .from("affiliate_links").select("slug,source_ref")
        .eq("source_type", "review").eq("status", "active").limit(500);
      if (managedError) console.warn("[video-queue-worker] affiliate registry lookup failed:", managedError.message);
      const managedSlugByReview = new Map(
        (managedLinks || [])
          .filter((link) => typeof link.source_ref === "string" && typeof link.slug === "string")
          .map((link) => [link.source_ref, link.slug])
      );

      const queued = [];
      for (const item of candidates) {
        const category = typeof item.category === "string" && item.category.trim()
          ? item.category.trim()
          : "Tecnologia";
        const title = item.product.trim();
        const reviewUrl = `https://www.vetor.blog/reviews/${item.slug}/`;
        const batch = Math.floor(slotCursor / 5);
        const position = slotCursor % 5;
        const videoFormat = position < (batch >= 2 ? 1 : 2) ? "long" : "short";
        slotCursor += 1;
        const queueId = randomUUID();
        const managedSlug = managedSlugByReview.get(item.slug) || item.slug;
        const trackedPurchaseUrl = buildTrackedAffiliateUrl(
          `https://www.vetor.blog/go/${encodeURIComponent(managedSlug)}/`,
          {
            source: "youtube", medium: "video", campaign: `review-${item.slug}`,
            contentId: queueId, term: videoFormat, placement: "description",
          }
        );

        const { data: inserted, error: insertError } = await supabase
          .from("video_queue")
          .insert({
            id: queueId,
            product_url: item.affiliate_url,
            product_title: title,
            product_category: category,
            product_price: item.price_new || "Consulte o preço atual",
            product_image_url: item.image_url,
            affiliate_url: item.affiliate_url,
            shortened_affiliate_url: trackedPurchaseUrl,
            script_text: "",
            script_hook: `Preparando vídeo ${videoFormat === "long" ? "completo" : "curto"} para ${title}`,
            voiceover_url: "",
            voiceover_duration: 0,
            media_assets: [{ type: "publication_format", format: videoFormat }],
            status: "pending",
            review_url: reviewUrl,
            scheduled_at: new Date().toISOString(),
          })
          .select("id,product_title,status,review_url,affiliate_url")
          .single();
        if (insertError) throw insertError;
        queued.push(inserted);
        existingUrls.add(reviewUrl);
      }
      return NextResponse.json({ success: true, queued: queued.length, videos: queued });
    }

    if (action === "queueFromComparatives") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 15);
      const { data: articles, error: articlesError } = await supabase
        .from("viral_articles")
        .select("slug,title,category,products,published_at,updated_at")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(200);
      if (articlesError) throw articlesError;

      const { data: managedLinks, error: managedLinksError } = await supabase
        .from("affiliate_links")
        .select("slug,name,destination_url,total_clicks")
        .eq("status", "active")
        .order("total_clicks", { ascending: false })
        .limit(1000);
      if (managedLinksError) throw managedLinksError;

      const { data: existing, error: existingError } = await supabase
        .from("video_queue")
        .select("review_url,status")
        .in("status", ["pending", "processing", "completed", "failed"]);
      if (existingError) throw existingError;
      const existingUrls = new Set((existing || []).map((item) => item.review_url).filter(Boolean));

      const candidates = (articles || []).filter((article) => {
        if (!isPublishedComparativeArticle(article)) return false;
        if (typeof article.slug !== "string" || !article.slug.trim()) return false;
        if (typeof article.title !== "string" || !article.title.trim()) return false;
        if (!article.published_at) return false;
        let products: unknown = article.products;
        if (typeof products === "string") {
          try { products = JSON.parse(products); } catch { return false; }
        }
        if (!Array.isArray(products) || products.length < 2) return false;
        const affiliateTarget = resolveComparativeVideoAffiliateTarget(products, managedLinks || []);
        if (!affiliateTarget) return false;
        return !existingUrls.has(`https://www.vetor.blog/comparativos/${article.slug}/`);
      }).slice(0, limit);

      const queued = [];
      for (const article of candidates) {
        let products: any[] = Array.isArray(article.products) ? article.products : [];
        if (typeof article.products === "string") {
          try { products = JSON.parse(article.products); } catch { products = []; }
        }
        if (products.length < 2) continue;
        const first = products[0];
        const second = products[1];
        const category = typeof article.category === "string" && article.category.trim()
          ? article.category.trim()
          : "Tecnologia";
        const title = `${first.name} vs ${second.name}`;
        const comparisonUrl = `https://www.vetor.blog/comparativos/${article.slug}/`;
        const purchaseTarget = resolveComparativeVideoAffiliateTarget(products, managedLinks || []);
        if (!purchaseTarget) continue;
        const queueId = randomUUID();
        const productIndex = Math.max(0, products.indexOf(purchaseTarget.product));
        const purchaseBaseUrl = purchaseTarget.trackingMode === "managed"
          ? purchaseTarget.trackedUrl
          : `https://www.vetor.blog/go/${article.slug}-p${productIndex + 1}/`;
        const purchaseUrl = buildTrackedAffiliateUrl(purchaseBaseUrl, {
          source: "youtube", medium: "video", campaign: `comparison-${article.slug}`,
          contentId: queueId, term: "short", placement: "description",
        });
        const script = {
          type: "comparison",
          hook: `Antes de escolher entre ${first.name} e ${second.name}, compare os recursos documentados e as condições atuais.`,
          callToAction: `Veja o comparativo completo em ${comparisonUrl} e confira os anúncios dos produtos.`,
        };

        const { data: inserted, error: insertError } = await supabase
          .from("video_queue")
          .insert({
            id: queueId,
            product_url: purchaseTarget.destinationUrl,
            product_title: title,
            product_category: category,
            product_price: "Consulte os preços atuais dos anúncios",
            product_image_url: purchaseTarget.product.imageUrl,
            affiliate_url: purchaseTarget.destinationUrl,
            shortened_affiliate_url: purchaseUrl,
            script_text: JSON.stringify(script),
            script_hook: script.hook,
            voiceover_url: "",
            voiceover_duration: 0,
            media_assets: [],
            status: "pending",
            review_url: comparisonUrl,
            scheduled_at: new Date().toISOString(),
          })
          .select("id,product_title,status,review_url,affiliate_url")
          .single();
        if (insertError) throw insertError;
        queued.push({ ...inserted, type: "comparison" });
        existingUrls.add(comparisonUrl);
      }
      return NextResponse.json({ success: true, queued: queued.length, videos: queued });
    }

    if (action === "retryRemotionTimeouts") {
      const limit = Math.min(Math.max(Number(body.limit || 5), 1), 5);
      const { data: failed, error: failedError } = await supabase
        .from("video_queue")
        .select("id,product_title,error_message,updated_at")
        .eq("status", "failed")
        .is("youtube_url", null)
        .or("error_message.ilike.%ETIMEDOUT%,error_message.ilike.%delayRender%,error_message.ilike.%not cleared after%,error_message.ilike.%operation was aborted due to timeout%,error_message.ilike.%Browser failed to load%")
        .order("updated_at", { ascending: true })
        .limit(limit);
      if (failedError) throw failedError;

      const retried = [];
      for (const item of failed || []) {
        const { data, error } = await supabase
          .from("video_queue")
          .update({
            status: "pending",
            error_message: null,
            started_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("status", "failed")
          .is("youtube_url", null)
          .select("id,product_title,status")
          .maybeSingle();
        if (error) throw error;
        if (data) retried.push(data);
      }
      return NextResponse.json({ success: true, retried: retried.length, videos: retried });
    }

    if (action === "retryQuotaFailures") {
      const limit = Math.min(Math.max(Number(body.limit || 15), 1), 15);
      const { data: failed, error: failedError } = await supabase
        .from("video_queue")
        .select("id,product_title,error_message,updated_at")
        .eq("status", "failed")
        .ilike("error_message", "%quota_exceeded%")
        .order("updated_at", { ascending: true })
        .limit(limit);
      if (failedError) throw failedError;

      const retried = [];
      for (const item of failed || []) {
        const { data, error } = await supabase
          .from("video_queue")
          .update({
            status: "pending",
            error_message: null,
            started_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("status", "failed")
          .select("id,product_title,status")
          .maybeSingle();
        if (error) throw error;
        if (data) retried.push(data);
      }
      return NextResponse.json({ success: true, retried: retried.length, videos: retried });
    }

    if (action === "next") {
      const manualOverride = body.manualOverride === true;
      const quota = await getDailyPublicationQuota(supabase);
      if (!manualOverride && quota.remaining <= 0) {
        return NextResponse.json({ success: true, videos: [], ...quota, dailyLimitReached: true, manualOverride: false });
      }
      // Automatic and manual runs are always limited to five videos per invocation.
      const requestedLimit = Math.min(Math.max(Number(body.limit || 1), 1), manualOverride ? 5 : 15);
      const limit = manualOverride ? requestedLimit : Math.min(requestedLimit, quota.remaining);
      const { data, error } = await supabase
        .from("video_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({
        success: true,
        videos: data || [],
        ...quota,
        dailyLimitReached: !manualOverride && quota.remaining <= 0,
        manualOverride,
      });
    }

    if (action === "get") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) return NextResponse.json({ success: false, error: "id é obrigatório." }, { status: 400 });
      const { data, error } = await supabase.from("video_queue").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return NextResponse.json({ success: true, video: data || null });
    }

    if (action === "update") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      const updates = body.updates && typeof body.updates === "object" && !Array.isArray(body.updates)
        ? body.updates as Record<string, unknown>
        : null;
      if (!id || !updates) return NextResponse.json({ success: false, error: "id e updates são obrigatórios." }, { status: 400 });
      const safeUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (UPDATABLE_FIELDS.has(key)) safeUpdates[key] = value;
      }
      if (Object.keys(safeUpdates).length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum campo permitido para atualização." }, { status: 400 });
      }
      safeUpdates.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("video_queue")
        .update(safeUpdates)
        .eq("id", id)
        .select("id,status,updated_at,review_url,youtube_video_id,youtube_url,media_assets,completed_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: "Vídeo não encontrado na fila." }, { status: 404 });

      let linkedProducts = 0;
      let assetSyncWarning: string | null = null;
      if (data.status === "completed" && data.youtube_video_id && data.youtube_url && data.review_url) {
        let reviewSlug: string | null = null;
        try {
          const reviewPath = new URL(data.review_url).pathname;
          reviewSlug = reviewPath.match(/^\/reviews\/([^/]+)\/?$/)?.[1] || null;
        } catch {}
        if (reviewSlug) {
          const { data: product, error: productError } = await supabase
            .from("product_links").select("id").eq("review_slug", reviewSlug)
            .neq("status", "archived").order("updated_at", { ascending: false })
            .limit(1).maybeSingle();
          if (productError) assetSyncWarning = productError.message;
          else if (product) {
            const assets = Array.isArray(data.media_assets) ? data.media_assets : [];
            const format = assets.find((asset: any) => asset?.type === "publication_format")?.format;
            const videoType = format === "long" || format === "short" ? format : "unknown";
            const { error: assetError } = await supabase.from("product_video_assets").upsert({
              product_link_id: product.id, review_slug: reviewSlug,
              youtube_video_id: data.youtube_video_id, youtube_url: data.youtube_url,
              video_type: videoType, source_table: "video_queue", source_record_id: data.id,
              published_at: data.completed_at || new Date().toISOString(),
            }, { onConflict: "youtube_video_id" });
            if (assetError) assetSyncWarning = assetError.message;
            else {
              const { error: productUpdateError } = await supabase.from("product_links")
                .update({ has_video: true, video_id: data.youtube_video_id, updated_at: new Date().toISOString() })
                .eq("id", product.id);
              if (productUpdateError) assetSyncWarning = productUpdateError.message;
              else linkedProducts = 1;
            }
          }
        }
      }
      return NextResponse.json({
        success: true, video: data, linkedProducts,
        ...(assetSyncWarning ? { assetSyncWarning } : {}),
      });
    }

    if (action === "pendingComments") {
      const limit = Math.min(Math.max(Number(body.limit || 5), 1), 10);
      const { data, error } = await supabase
        .from("video_queue")
        .select("id,product_title,review_url,affiliate_url,shortened_affiliate_url,youtube_video_id,youtube_url,error_message,media_assets")
        .eq("status", "completed")
        .like("error_message", "[CTA_COMMENT_PENDING]%")
        .order("completed_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return NextResponse.json({ success: true, videos: data || [] });
    }

    if (action === "recent") {
      const { data, error } = await supabase
        .from("video_queue")
        .select("id,product_title,status,review_url,affiliate_url,youtube_url,error_message,updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return NextResponse.json({ success: true, videos: data || [] });
    }

    return NextResponse.json({ success: false, error: "Ação inválida. Use quota, queueFromReviews, queueFromComparatives, retryRemotionTimeouts, retryQuotaFailures, next, get, update, pendingComments ou recent." }, { status: 400 });
  } catch (error: unknown) {
    const message = formatVideoQueueError(error);
    console.error(`[video-queue-worker] failed: action=${action} ${message}`);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function formatVideoQueueError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const detail = error as Record<string, unknown>;
    const message = typeof detail.message === "string" ? detail.message : "";
    const code = typeof detail.code === "string" ? ` [${detail.code}]` : "";
    const hint = typeof detail.hint === "string" && detail.hint.trim() ? ` Hint: ${detail.hint.trim()}` : "";
    const details = typeof detail.details === "string" && detail.details.trim() ? ` Details: ${detail.details.trim()}` : "";
    if (message) return `${message}${code}${details}${hint}`;
    try {
      return JSON.stringify(detail);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}
