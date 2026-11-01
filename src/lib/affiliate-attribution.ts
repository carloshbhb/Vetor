export type AffiliateClickSourceType = "review" | "comparison_product" | "product_link" | "manual";
export type AffiliateClickContext = {
  requestUrl: string;
  referrerUrl?: string | null;
  productSlug?: string | null;
  sourceType?: AffiliateClickSourceType | null;
  destinationUrl?: string | null;
};
export type AffiliateClickMetadata = {
  request_path: string | null;
  referrer_path: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_source: string;
  click_medium: string | null;
  click_campaign: string | null;
  content_id: string | null;
  video_id: string | null;
  cta_position: string | null;
  product_slug: string | null;
  source_type: AffiliateClickSourceType | null;
  destination_host: string | null;
};
function parseUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try { return new URL(value); } catch { return null; }
}
function clean(value: string | null | undefined, max = 256): string | null {
  const normalized = String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, "");
  return normalized ? normalized.slice(0, max) : null;
}
function readParam(request: URL | null, referrer: URL | null, key: string): string | null {
  return clean(request?.searchParams.get(key) || referrer?.searchParams.get(key));
}
export function buildTrackedAffiliateUrl(base: string, params: {
  source: string; medium: string; campaign: string; contentId: string; term?: string; placement?: string;
}): string {
  const url = new URL(base);
  if (url.protocol !== "https:" || !["www.vetor.blog", "vetor.blog"].includes(url.hostname) || !url.pathname.startsWith("/go/")) {
    throw new Error("Affiliate links must use the Vetor HTTPS /go/ route.");
  }
  url.searchParams.set("utm_source", clean(params.source, 80) || "unknown");
  url.searchParams.set("utm_medium", clean(params.medium, 80) || "referral");
  url.searchParams.set("utm_campaign", clean(params.campaign, 160) || "vetor");
  url.searchParams.set("utm_content", clean(params.contentId, 160) || "unknown");
  if (params.term) url.searchParams.set("utm_term", clean(params.term, 80) || "");
  if (params.placement) url.searchParams.set("placement", clean(params.placement, 80) || "");
  return url.toString();
}
export function parseAffiliateClickMetadata(context: AffiliateClickContext): AffiliateClickMetadata {
  const request = parseUrl(context.requestUrl);
  const referrer = parseUrl(context.referrerUrl);
  const destination = parseUrl(context.destinationUrl);
  const host = clean(referrer?.hostname, 180);
  const normalizedHost = host?.replace(/^www\./i, "") || null;
  const requestSlug = request?.pathname.match(/^\/go\/([^/]+)/)?.[1] || null;
  let decodedSlug: string | null = requestSlug;
  try { if (requestSlug) decodedSlug = decodeURIComponent(requestSlug); } catch { /* keep raw slug */ }
  const utmSource = readParam(request, referrer, "utm_source");
  const utmMedium = readParam(request, referrer, "utm_medium");
  const utmCampaign = readParam(request, referrer, "utm_campaign");
  const utmContent = readParam(request, referrer, "utm_content");
  const utmTerm = readParam(request, referrer, "utm_term");
  const inferredMedium = normalizedHost === "youtube.com" || normalizedHost === "youtu.be"
    ? "video" : normalizedHost?.endsWith("vetor.blog") ? "internal" : normalizedHost ? "referral" : null;
  const referrerPath = referrer?.pathname || (context.referrerUrl?.startsWith("/") ? context.referrerUrl.split("?")[0] : null);
  return {
    request_path: clean(request?.pathname, 500),
    referrer_path: clean(referrerPath, 500),
    referrer_host: host,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    click_source: utmSource || normalizedHost || "direct_or_unknown",
    click_medium: utmMedium || inferredMedium,
    click_campaign: utmCampaign,
    content_id: utmContent,
    video_id: readParam(request, referrer, "video_id"),
    cta_position: readParam(request, referrer, "placement") || readParam(request, referrer, "position"),
    product_slug: clean(context.productSlug || decodedSlug, 180),
    source_type: context.sourceType || null,
    destination_host: clean(destination?.hostname, 180),
  };
}
