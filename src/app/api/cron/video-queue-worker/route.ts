import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { getSupabaseServiceKeyClient } from "@/lib/supabase";
import { buildTrackedAffiliateUrl } from "@/lib/affiliate-attribution";
import { isPublishedComparativeArticle, resolveComparativeVideoAffiliateTarget } from "@/lib/video-queue-guards";
import { buildVideoDescription, resolveVideoFormat } from "../../../../../video/scripts/video-format.mjs";

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
  "affiliate_url",
  "shortened_affiliate_url",
]);


type VideoAffiliateLink = {
  slug: string;
  name: string;
  source_type: string;
  source_ref: string;
  destination_url: string;
  marketplace?: string | null;
  status: string;
};

function parseVideoScript(value: unknown): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function getVideoContentRef(value: unknown): { type: "review" | "comparison"; slug: string } | null {
  if (typeof value !== "string") return null;
  try {
    const pathname = new URL(value).pathname;
    const match = pathname.match(/^\/(reviews|comparativos)\/([^/]+)\/?$/);
    if (!match) return null;
    return { type: match[1] === "comparativos" ? "comparison" : "review", slug: match[2] };
  } catch {
    return null;
  }
}

function normalizeAffiliateDestination(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return "";
  }
}

function resolveVideoAffiliate(
  record: Record<string, any>,
  affiliateLinks: VideoAffiliateLink[]
): VideoAffiliateLink | null {
  const content = getVideoContentRef(record.review_url);
  if (!content) return null;
  const existingDestinations = new Set([
    normalizeAffiliateDestination(record.affiliate_url),
    normalizeAffiliateDestination(record.shortened_affiliate_url),
  ].filter(Boolean));
  let matches: VideoAffiliateLink[] = [];
  if (content.type === "review") {
    matches = affiliateLinks.filter((link) =>
      link.source_type === "review" && link.source_ref === content.slug
    );
  } else {
    matches = affiliateLinks.filter((link) =>
      link.source_type === "comparison_product" &&
      link.source_ref.startsWith("comparativo:" + content.slug + "#")
    );
  }
  const exact = matches.find((link) => existingDestinations.has(normalizeAffiliateDestination(link.destination_url)));
  if (exact) return exact;
  if (matches.length === 1) return matches[0];
  if (matches.length > 1 && content.type === "comparison") {
    const firstProduct = matches.find((link) => link.source_ref.endsWith("#1"));
    return firstProduct || matches[0];
  }
  return matches[0] || null;
}

function makeYouTubeTrackedUrl(record: Record<string, any>, affiliate: VideoAffiliateLink, format: string): string {
  const slug = String(affiliate.slug || "").trim();
  if (!slug) return "";
  const content = getVideoContentRef(record.review_url);
  const base = "https://www.vetor.blog/go/" + encodeURIComponent(slug) + "/";
  const url = new URL(buildTrackedAffiliateUrl(base, {
    source: "youtube",
    medium: "video",
    campaign: (content && content.type === "comparison" ? "comparison-" : "review-") + (content?.slug || "product"),
    contentId: String(record.id || record.youtube_video_id || ""),
    term: format,
    placement: "description",
  }));
  url.searchParams.set("video_id", String(record.youtube_video_id || ""));
  return url.toString();
}

async function getProductionYouTubeAccessToken(): Promise<string> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube OAuth Production credentials are incomplete.");
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok || typeof data.access_token !== "string" || !data.access_token) {
    const reason = typeof data.error === "string" ? data.error : "HTTP " + response.status;
    throw new Error("YouTube OAuth Production failed (" + reason + ").");
  }
  return data.access_token;
}

async function youtubeApiRequest(
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<Record<string, any>> {
  const response = await fetch("https://www.googleapis.com/youtube/v3/" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + accessToken,
      ...(init?.headers || {}),
      ...(init?.method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || data?.error?.message || "HTTP " + response.status;
    throw Object.assign(new Error("YouTube API " + response.status + ": " + String(reason).slice(0, 240)), {
      status: response.status,
      reason,
    });
  }
  return data;
}

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



    if (action === "youtubeOAuthCheck") {
      await getProductionYouTubeAccessToken();
      return NextResponse.json({ success: true, authorized: true, credentialSource: "vercel-production" });
    }

    if (action === "refreshYouTubeMetadata") {
      const offset = Math.max(0, Math.floor(Number(body.offset || 0)));
      const limit = Math.min(Math.max(Math.floor(Number(body.limit || 5)), 1), 5);
      const [{ data: records, error: recordsError, count }, { data: affiliateLinks, error: linksError }] = await Promise.all([
        supabase.from("video_queue")
          .select("id,product_title,product_category,affiliate_url,shortened_affiliate_url,script_text,script_hook,media_assets,review_url,youtube_video_id,youtube_url,completed_at", { count: "exact" })
          .eq("status", "completed")
          .not("youtube_video_id", "is", null)
          .order("completed_at", { ascending: true })
          .range(offset, offset + limit - 1),
        supabase.from("affiliate_links")
          .select("slug,name,source_type,source_ref,destination_url,marketplace,status")
          .eq("status", "active")
          .limit(2000),
      ]);
      if (recordsError) throw recordsError;
      if (linksError) throw linksError;
      const total = count || 0;
      const batch = records || [];
      if (!batch.length) {
        return NextResponse.json({ success: true, offset, total, updated: 0, failed: 0, skipped: 0, done: true });
      }

      const accessToken = await getProductionYouTubeAccessToken();
      const ids = batch.map((record) => String(record.youtube_video_id || "")).filter(Boolean);
      const listParams = new URLSearchParams({ part: "snippet", id: ids.join(",") });
      const videoData = await youtubeApiRequest("videos?" + listParams.toString(), accessToken);
      const snippets = new Map<string, Record<string, any>>();
      for (const video of videoData.items || []) {
        if (video.id && video.snippet) snippets.set(String(video.id), video.snippet);
      }

      const results: Array<Record<string, any>> = [];
      for (const record of batch) {
        const videoId = String(record.youtube_video_id || "");
        const snippet = snippets.get(videoId);
        if (!videoId || !snippet || !snippet.title || !snippet.categoryId) {
          results.push({ videoId, status: "skipped", reason: "YouTube snippet/title/categoryId not found" });
          continue;
        }

        const format = resolveVideoFormat(record.media_assets);
        const affiliate = resolveVideoAffiliate(record, (affiliateLinks || []) as VideoAffiliateLink[]);
        let purchaseUrl = "";
        let nextAffiliateUrl = String(record.affiliate_url || "");
        let nextShortenedUrl = String(record.shortened_affiliate_url || "");
        let managed = false;
        let searchListing = false;
        if (affiliate && /^https:\/\//i.test(affiliate.destination_url || "")) {
          purchaseUrl = makeYouTubeTrackedUrl(record, affiliate, format);
          nextAffiliateUrl = affiliate.destination_url;
          nextShortenedUrl = purchaseUrl;
          managed = true;
          searchListing = /(^|\.)lista\.mercadolivre\.com\.br$/i.test(new URL(affiliate.destination_url).hostname);
        } else {
          const existing = String(record.shortened_affiliate_url || record.affiliate_url || "").trim();
          if (/^https:\/\/meli\.la\//i.test(existing) || /^https:\/\/www\.vetor\.blog\/go\//i.test(existing)) {
            purchaseUrl = existing;
            nextShortenedUrl = existing;
            if (!/^https:\/\//i.test(nextAffiliateUrl)) nextAffiliateUrl = existing;
          }
        }

        if (!purchaseUrl) {
          results.push({ videoId, status: "skipped", reason: "No safe product purchase link" });
          continue;
        }

        const parsed = parseVideoScript(record.script_text);
        const description = buildVideoDescription({
          format,
          productTitle: String(record.product_title || "Produto"),
          category: String(record.product_category || "Tecnologia"),
          purchaseUrl,
          reviewUrl: String(record.review_url || ""),
          hook: String(parsed.hook || record.script_hook || snippet.title),
          highlights: Array.isArray(parsed.scenes)
            ? parsed.scenes.map((scene: any) => String(scene?.text || "")).filter(Boolean)
            : [],
          callToAction: String(parsed.callToAction || ""),
          chapters: [],
        });
        if (Buffer.byteLength(description, "utf8") > 5000) {
          results.push({ videoId, status: "skipped", reason: "Description exceeds YouTube 5,000-byte limit" });
          continue;
        }

        const updatedSnippet: Record<string, any> = {
          title: snippet.title,
          categoryId: snippet.categoryId,
          description,
          tags: Array.isArray(snippet.tags) ? snippet.tags : [],
        };
        if (snippet.defaultLanguage) updatedSnippet.defaultLanguage = snippet.defaultLanguage;
        if (snippet.defaultAudioLanguage) updatedSnippet.defaultAudioLanguage = snippet.defaultAudioLanguage;
        try {
          await youtubeApiRequest("videos?part=snippet", accessToken, {
            method: "PUT",
            body: JSON.stringify({ id: videoId, snippet: updatedSnippet }),
          });
        } catch (error: any) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({ videoId, status: "failed", error: message.slice(0, 500) });
          if (Number(error?.status) === 403 || /insufficientPermissions|quotaExceeded/i.test(message)) {
            break;
          }
          continue;
        }

        let linkWarning: string | null = null;
        if (nextAffiliateUrl !== record.affiliate_url || nextShortenedUrl !== record.shortened_affiliate_url) {
          const { error: updateError } = await supabase.from("video_queue")
            .update({
              affiliate_url: nextAffiliateUrl,
              shortened_affiliate_url: nextShortenedUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", record.id);
          if (updateError) linkWarning = updateError.message;
        }
        results.push({
          videoId,
          status: "updated",
          tracked: managed,
          searchListing,
          linkWarning,
          descriptionBytes: Buffer.byteLength(description, "utf8"),
        });
      }

      const updated = results.filter((item) => item.status === "updated").length;
      const failed = results.filter((item) => item.status === "failed").length;
      const skipped = results.filter((item) => item.status === "skipped").length;
      const stopped = results.some((item) => item.status === "failed" && /403|insufficientPermissions|quotaExceeded/i.test(String(item.error || "")));
      return NextResponse.json({
        success: failed === 0,
        offset,
        limit,
        total,
        updated,
        failed,
        skipped,
        searchListingLinks: results.filter((item) => item.searchListing).length,
        results,
        nextOffset: offset + batch.length,
        done: offset + batch.length >= total || stopped,
        stopped,
      }, { status: failed > 0 ? 207 : 200 });
    }

    if (action === "metadataBatch") {
      const [{ data: videos, error: videosError }, { data: affiliateLinks, error: linksError }] = await Promise.all([
        supabase.from("video_queue")
          .select("id,product_title,product_category,affiliate_url,shortened_affiliate_url,script_text,script_hook,media_assets,review_url,youtube_video_id,youtube_url,completed_at")
          .eq("status", "completed")
          .not("youtube_video_id", "is", null)
          .order("completed_at", { ascending: true })
          .limit(500),
        supabase.from("affiliate_links")
          .select("slug,name,source_type,source_ref,destination_url,marketplace,status")
          .eq("status", "active")
          .limit(2000),
      ]);
      if (videosError) throw videosError;
      if (linksError) throw linksError;
      return NextResponse.json({
        success: true,
        videos: videos || [],
        affiliateLinks: affiliateLinks || [],
      });
    }

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
