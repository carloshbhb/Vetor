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

function normalizeMercadoLivreItemId(value: unknown): string {
  const match = String(value || '').match(/MLB-?(\d+)/i);
  return match ? 'MLB' + match[1] : '';
}

function getPublicationFormat(mediaAssets: unknown): 'long' | 'short' | 'unknown' {
  if (!Array.isArray(mediaAssets)) return 'unknown';
  const marker = mediaAssets.find((item: any) => item?.type === 'publication_format');
  return marker?.format === 'long' || marker?.format === 'short' ? marker.format : 'unknown';
}

function isSocialListProductLink(row: { tags?: unknown; notes?: unknown }): boolean {
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const notes = String(row.notes || '');
  return tags.includes('ml-social-list') || /ml_social_list:|Origem:\s*ml-lista-/i.test(notes);
}

function socialListItemIdFromProductLink(row: { tags?: unknown; notes?: unknown }): string {
  const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
  const tagged = tags.find((tag) => /^ml-social-item:MLB-?\d+$/i.test(tag));
  if (tagged) return normalizeMercadoLivreItemId(tagged);
  const matches = Array.from(String(row.notes || '').matchAll(/MLB-?\d+/gi));
  return matches.length ? normalizeMercadoLivreItemId(matches[matches.length - 1][0]) : '';
}

function socialListMarker(mediaAssets: unknown): { itemId: string; productLinkId: string } | null {
  if (!Array.isArray(mediaAssets)) return null;
  const marker = mediaAssets.find((item: any) => item?.type === 'ml-social-list-item');
  if (!marker) return null;
  const itemId = normalizeMercadoLivreItemId(marker.itemId);
  const productLinkId = typeof marker.productLinkId === 'string' ? marker.productLinkId : '';
  return itemId ? { itemId, productLinkId } : null;
}

function normalizeVideoProductTitle(value: unknown): string {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isSafeMercadoLivreAffiliateUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      (host === 'meli.la' || host.endsWith('.meli.la') ||
       host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br') ||
       host === 'mercadolibre.com' || host.endsWith('.mercadolibre.com'));
  } catch {
    return false;
  }
}

function isSafeMercadoLivreProductUrl(value: unknown): boolean {
  return isSafeMercadoLivreAffiliateUrl(value);
}
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
    .contains("media_assets", [{ type: "publication_format", format: "long" }])
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
  "publish_at",
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

async function getProductionYouTubeAccessToken(supabase: SupabaseServiceClient): Promise<string> {
  const { data: savedCredential, error: credentialError } = await supabase
    .from("youtube_oauth_credentials")
    .select("refresh_token")
    .eq("provider", "youtube")
    .maybeSingle();
  if (credentialError) throw credentialError;

  // Use the latest consented token saved by the admin OAuth callback. Keep the
  // Vercel environment variable as a one-time migration fallback only.
  const refreshToken = String(savedCredential?.refresh_token || process.env.YOUTUBE_REFRESH_TOKEN || "").trim();
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube OAuth Production credentials are incomplete. Reconnect the channel in /admin/videos.");
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
    throw new Error("YouTube OAuth Production failed (" + reason + "). Reconnect the channel in /admin/videos.");
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



    if (action === "youtubeChannelInfo") {
      const { data: savedChannel, error: channelError } = await supabase
        .from("youtube_oauth_credentials")
        .select("channel_id,channel_title")
        .eq("provider", "youtube")
        .maybeSingle();
      if (channelError) throw channelError;
      if (!savedChannel?.channel_id) {
        throw new Error("Canal do YouTube não encontrado. Reconecte o canal em /admin/videos.");
      }
      return NextResponse.json({
        success: true,
        channel: {
          id: String(savedChannel.channel_id),
          title: String(savedChannel.channel_title || ""),
        },
      });
    }

    if (action === "youtubeOAuthCheck") {
      await getProductionYouTubeAccessToken(supabase);
      return NextResponse.json({ success: true, authorized: true, credentialSource: "vercel-production" });
    }

    if (action === "youtubeAccessToken") {
      const accessToken = await getProductionYouTubeAccessToken(supabase);
      return NextResponse.json({ success: true, accessToken, credentialSource: "vercel-production" });
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

      const accessToken = await getProductionYouTubeAccessToken(supabase);
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

        if (searchListing) {
          results.push({
            videoId,
            status: "skipped",
            reason: "Affiliate destination is a Mercado Livre search listing; an item-specific meli.la link is required.",
          });
          continue;
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
        success: true,
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
      });
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

    if (action === "queueFromSocialList") {
      const limit = Math.min(Math.max(Number(body.limit || 1), 1), 5);
      const [
        { data: listItems, error: listError },
        { data: productLinks, error: productLinksError },
        { data: existing, error: existingError },
        { count: doneToday, error: doneError },
        { count: pendingCount, error: pendingError },
      ] = await Promise.all([
        supabase.from("ml_social_list_items")
          .select("item_id,title,product_url,image_url,price,original_price,rating,review_count,highlight,last_seen_at")
          .order("last_seen_at", { ascending: false }).limit(1000),
        supabase.from("product_links")
          .select("id,slug,product_name,category,product_url,affiliate_url,image_url,marketplace,status,has_video,video_id,price,priority,tags,notes,updated_at")
          .neq("status", "archived")
          .order("priority", { ascending: false }).order("updated_at", { ascending: false }).limit(2000),
        supabase.from("video_queue")
          .select("product_title,product_url,affiliate_url,media_assets,status,youtube_video_id")
          .in("status", ["pending", "processing", "completed"]).limit(5000),
        supabase.from("video_queue").select("id", { count: "exact", head: true })
          .eq("status", "completed").eq("publication_mode", "automatic")
          .contains("media_assets", [{ type: "publication_format", format: "long" }])
          .gte("completed_at", getSaoPauloDayStartIso()),
        supabase.from("video_queue").select("id", { count: "exact", head: true })
          .in("status", ["pending", "processing"]).eq("publication_mode", "automatic")
          .contains("media_assets", [{ type: "publication_format", format: "long" }]),
      ]);
      if (listError) throw listError;
      if (productLinksError) throw productLinksError;
      if (existingError) throw existingError;
      if (doneError) throw doneError;
      if (pendingError) throw pendingError;

      const completed = doneToday || 0;
      const pending = pendingCount || 0;
      const dailySlots = Math.max(0, MAX_DAILY_PUBLICATIONS - completed - pending);
      if (dailySlots <= 0) {
        return NextResponse.json({ success: true, queued: 0, videos: [], quotaReached: true, completedToday: completed, pendingAutomaticLong: pending });
      }

      const linksByItemId = new Map<string, any>();
      const linksByTitle = new Map<string, any[]>();
      for (const link of productLinks || []) {
        if (!isSocialListProductLink(link)) continue;
        const linkedItemId = socialListItemIdFromProductLink(link);
        if (linkedItemId && !linksByItemId.has(linkedItemId)) linksByItemId.set(linkedItemId, link);
        const titleKey = normalizeVideoProductTitle(link.product_name);
        if (titleKey) {
          const current = linksByTitle.get(titleKey) || [];
          current.push(link);
          linksByTitle.set(titleKey, current);
        }
      }

      const queuedOrPublishedItemIds = new Set<string>();
      const queuedOrPublishedTitles = new Set<string>();
      for (const row of existing || []) {
        const marker = socialListMarker(row.media_assets);
        const itemId = marker?.itemId ||
          normalizeMercadoLivreItemId(row.product_url) ||
          normalizeMercadoLivreItemId(row.affiliate_url);
        if (itemId) queuedOrPublishedItemIds.add(itemId);
        const titleKey = normalizeVideoProductTitle(row.product_title);
        if (titleKey) queuedOrPublishedTitles.add(titleKey);
      }

      const rankedItems = [...(listItems || [])].sort((a: any, b: any) => {
        const aHighlight = String(a.highlight || "").toUpperCase() === "MAIS VENDIDO" ? 1 : 0;
        const bHighlight = String(b.highlight || "").toUpperCase() === "MAIS VENDIDO" ? 1 : 0;
        if (aHighlight !== bHighlight) return bHighlight - aHighlight;
        const reviewsDiff = Number(b.review_count || 0) - Number(a.review_count || 0);
        if (reviewsDiff) return reviewsDiff;
        return Date.parse(String(b.last_seen_at || "")) - Date.parse(String(a.last_seen_at || ""));
      });

      const candidates: Array<{ item: any; link: any; itemId: string; title: string; imageUrl: string; affiliateUrl: string; productUrl: string }> = [];
      let skippedUnmatched = 0;
      let skippedUnsafe = 0;
      let skippedAlreadyPublished = 0;
      for (const item of rankedItems) {
        const itemId = normalizeMercadoLivreItemId(item.item_id);
        if (!itemId) { skippedUnsafe += 1; continue; }
        let link = linksByItemId.get(itemId) || null;
        if (!link) {
          const titleMatches = linksByTitle.get(normalizeVideoProductTitle(item.title)) || [];
          if (titleMatches.length === 1) link = titleMatches[0];
        }
        if (!link) { skippedUnmatched += 1; continue; }

        const title = String(item.title || link.product_name || "").trim();
        const titleKey = normalizeVideoProductTitle(title);
        const affiliateUrl = String(link.affiliate_url || "").trim();
        const productUrl = String(item.product_url || link.product_url || "").trim();
        const imageUrl = String(item.image_url || link.image_url || "").trim();

        if (link.has_video === true || link.video_id || queuedOrPublishedItemIds.has(itemId) ||
            (titleKey && queuedOrPublishedTitles.has(titleKey))) {
          skippedAlreadyPublished += 1;
          continue;
        }
        if (!title || !isSafeMercadoLivreProductUrl(productUrl) ||
            !isSafeMercadoLivreAffiliateUrl(affiliateUrl) ||
            !/^https:\/\//i.test(imageUrl) || /vetor\.blog|\/og\.png(?:$|\?)/i.test(imageUrl)) {
          skippedUnsafe += 1;
          continue;
        }
        candidates.push({ item, link, itemId, title, imageUrl, affiliateUrl, productUrl });
        if (candidates.length >= limit) break;
      }

      const queued = [];
      for (const candidate of candidates) {
        if (completed + pending + queued.length >= MAX_DAILY_PUBLICATIONS) break;
        const queueId = randomUUID();
        const priceValue = Number(candidate.item.price ?? candidate.link.price);
        const price = Number.isFinite(priceValue) && priceValue > 0
          ? "R$" + priceValue.toFixed(2).replace(".", ",")
          : "Consulte o preço atual";
        const categoryValue = String(candidate.link.category || "").trim();
        const category = !categoryValue || /^lista social$/i.test(categoryValue) ? "Tecnologia" : categoryValue;
        const purchase = new URL(candidate.affiliateUrl);
        purchase.searchParams.set("utm_source", "youtube");
        purchase.searchParams.set("utm_medium", "video");
        purchase.searchParams.set("utm_campaign", "ml-social-list-long");
        purchase.searchParams.set("utm_content", queueId);
        purchase.searchParams.set("utm_term", "long");
        purchase.searchParams.set("placement", "description");
        const trackedPurchaseUrl = purchase.toString();

        const { data: inserted, error: insertError } = await supabase
          .from("video_queue")
          .insert({
            id: queueId,
            product_url: candidate.productUrl,
            product_title: candidate.title,
            product_category: category,
            product_price: price,
            product_image_url: candidate.imageUrl,
            affiliate_url: candidate.affiliateUrl,
            shortened_affiliate_url: trackedPurchaseUrl,
            script_text: "",
            script_hook: "Análise completa: " + candidate.title + ".",
            voiceover_url: "",
            voiceover_duration: 0,
            media_assets: [
              { type: "publication_format", format: "long" },
              { type: "ml-social-list-item", itemId: candidate.itemId, productLinkId: candidate.link.id },
            ],
            status: "pending",
            publication_mode: "automatic",
            review_url: null,
            scheduled_at: new Date().toISOString(),
          })
          .select("id,product_title,status,review_url,affiliate_url,product_url,media_assets")
          .single();
        if (insertError) throw insertError;
        queued.push(inserted);
        queuedOrPublishedItemIds.add(candidate.itemId);
        const titleKey = normalizeVideoProductTitle(candidate.title);
        if (titleKey) queuedOrPublishedTitles.add(titleKey);
      }

      return NextResponse.json({
        success: true,
        queued: queued.length,
        videos: queued,
        source: "ml_social_list_items+verified_product_links",
        format: "long",
        independentOfReviews: true,
        eligibleMatches: candidates.length,
        skippedUnmatched,
        skippedUnsafe,
        skippedAlreadyPublished,
        dailyLimit: MAX_DAILY_PUBLICATIONS,
        completedToday: completed,
        pendingAutomaticLong: pending,
      });
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
          callToAction: "Veja o comparativo completo e confira os anúncios dos produtos no link da descrição.",
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
            media_assets: [{ type: "publication_format", format: "short" }],
            status: "pending",
            publication_mode: "automatic",
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

    if (action === "retrySafeFailed") {
      const limit = Math.min(Math.max(Number(body.limit || 5), 1), 5);
      const retryBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [
        { data: failed, error: failedError },
        { data: completedRows, error: completedError },
      ] = await Promise.all([
        supabase.from("video_queue")
          .select("id,product_title,review_url,affiliate_url,shortened_affiliate_url,product_url,product_image_url,youtube_video_id,youtube_url,media_assets,publication_mode,updated_at")
          .eq("publication_mode", "automatic").eq("status", "failed")
          .is("youtube_video_id", null).is("youtube_url", null)
          .lte("updated_at", retryBefore).order("updated_at", { ascending: true }).limit(100),
        supabase.from("video_queue")
          .select("id,product_title,product_url,affiliate_url,media_assets")
          .eq("status", "completed").not("youtube_video_id", "is", null).limit(5000),
      ]);
      if (failedError) throw failedError;
      if (completedError) throw completedError;

      const completedKeys = new Set<string>();
      for (const row of completedRows || []) {
        const marker = socialListMarker(row.media_assets);
        const itemId = marker?.itemId || normalizeMercadoLivreItemId(row.product_url) || normalizeMercadoLivreItemId(row.affiliate_url);
        if (itemId) completedKeys.add("item:" + itemId);
        const titleKey = normalizeVideoProductTitle(row.product_title);
        if (titleKey) completedKeys.add("title:" + titleKey);
      }

      const eligible = [];
      const seenKeys = new Set<string>();
      for (const item of failed || []) {
        if (getPublicationFormat(item.media_assets) !== "long") continue;
        const marker = socialListMarker(item.media_assets);
        const itemId = marker?.itemId || normalizeMercadoLivreItemId(item.product_url) || normalizeMercadoLivreItemId(item.affiliate_url);
        const titleKey = normalizeVideoProductTitle(item.product_title);
        const key = itemId ? "item:" + itemId : titleKey ? "title:" + titleKey : String(item.review_url || "").trim();
        if (!key || seenKeys.has(key) || completedKeys.has(key) ||
            (titleKey && completedKeys.has("title:" + titleKey))) continue;
        seenKeys.add(key);

        const purchaseUrl = String(item.shortened_affiliate_url || item.affiliate_url || "").trim();
        const imageUrl = String(item.product_image_url || "").trim();
        const safePurchase = isSafeMercadoLivreAffiliateUrl(purchaseUrl);
        let image: URL | null = null;
        try { image = new URL(imageUrl); } catch {}
        const safeImage = Boolean(image && image.protocol === "https:" &&
          !image.hostname.endsWith("vetor.blog") && !/\/og\.png(?:$|\?)/i.test(image.pathname));
        if (!safePurchase || !safeImage) continue;
        eligible.push(item);
        if (eligible.length >= limit) break;
      }

      const retried = [];
      for (const item of eligible) {
        const { data, error } = await supabase.from("video_queue")
          .update({
            status: "pending",
            error_message: null,
            started_at: null,
            scheduled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id).eq("status", "failed")
          .is("youtube_video_id", null).is("youtube_url", null)
          .select("id,product_title,status,review_url,product_url")
          .maybeSingle();
        if (error) throw error;
        if (data) retried.push(data);
      }
      return NextResponse.json({
        success: true,
        retried: retried.length,
        videos: retried,
        policy: "one failed item per Social List product; no completed YouTube upload of the same product; safe Mercado Livre affiliate URL and external HTTPS image; 24-hour cooldown",
      });
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
      let pendingQuery = supabase
        .from("video_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString());
      if (!manualOverride) {
        pendingQuery = pendingQuery.contains("media_assets", [{ type: "publication_format", format: "long" }]);
      }
      const { data, error } = await pendingQuery
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
      if (data.status === "completed" && data.youtube_video_id && data.youtube_url) {
        const assets = Array.isArray(data.media_assets) ? data.media_assets : [];
        const marker = socialListMarker(assets);
        if (marker) {
          let productUpdate = supabase.from("product_links")
            .update({ has_video: true, video_id: data.youtube_video_id, updated_at: new Date().toISOString() });
          if (marker.productLinkId) productUpdate = productUpdate.eq("id", marker.productLinkId);
          else productUpdate = productUpdate.contains("tags", ["ml-social-item:" + marker.itemId]);
          const { data: updatedProducts, error: productUpdateError } = await productUpdate.select("id");
          if (productUpdateError) assetSyncWarning = productUpdateError.message;
          else linkedProducts += (updatedProducts || []).length;
        }

        if (data.review_url) {
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
                else linkedProducts += 1;
              }
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

    if (action === "publishSlots") {
      const dayStart = getSaoPauloDayStartIso();
      const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("video_queue")
        .select("publish_at")
        .gte("publish_at", dayStart)
        .lt("publish_at", dayEnd);
      if (error) throw error;
      const slots = (data || []).map((row: any) => row.publish_at).filter(Boolean);
      return NextResponse.json({ success: true, publish_at: slots });
    }

    if (action === "getReviewResearch" || action === "reviewResearchGet") {
      const slug = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!slug) return NextResponse.json({ success: false, error: "slug é obrigatório." }, { status: 400 });
      const { data, error } = await supabase
        .from("reviews")
        .select("research")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ success: true, research: data?.research ?? null });
    }

    if (action === "setReviewResearch" || action === "reviewResearchSet") {
      const slug = typeof body.slug === "string" ? body.slug.trim() : "";
      if (!slug) return NextResponse.json({ success: false, error: "slug é obrigatório." }, { status: 400 });
      const research = body.research ?? null;
      const { error } = await supabase
        .from("reviews")
        .update({ research })
        .eq("slug", slug);
      if (error) throw error;
      return NextResponse.json({ success: true });
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

    return NextResponse.json({ success: false, error: "Ação inválida. Use quota, queueFromSocialList, queueFromComparatives, retryRemotionTimeouts, retryQuotaFailures, next, get, update, pendingComments ou recent." }, { status: 400 });
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
