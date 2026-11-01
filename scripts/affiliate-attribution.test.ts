import assert from "node:assert/strict";
import { buildSiteTrackedAffiliateUrl, buildTrackedAffiliateUrl, parseAffiliateClickMetadata } from "../src/lib/affiliate-attribution";

const url = buildTrackedAffiliateUrl("https://www.vetor.blog/go/redmi/", {
  source: "youtube", medium: "video", campaign: "review-redmi",
  contentId: "queue-123", term: "long", placement: "description",
});
const parsedUrl = new URL(url);
assert.equal(parsedUrl.searchParams.get("utm_source"), "youtube");
assert.equal(parsedUrl.searchParams.get("utm_medium"), "video");
assert.equal(parsedUrl.searchParams.get("utm_campaign"), "review-redmi");
assert.equal(parsedUrl.searchParams.get("utm_content"), "queue-123");
assert.equal(parsedUrl.searchParams.get("placement"), "description");
assert.throws(() => buildTrackedAffiliateUrl("https://meli.la/abc", {
  source: "youtube", medium: "video", campaign: "x", contentId: "y",
}));

const siteUrl = buildSiteTrackedAffiliateUrl("/go/headphones/", { pageSlug: "headphones", placement: "hero", contentId: "headphones:hero" });
const siteParsed = new URL(siteUrl);
assert.equal(siteParsed.searchParams.get("utm_source"), "vetor.blog");
assert.equal(siteParsed.searchParams.get("utm_medium"), "site");
assert.equal(siteParsed.searchParams.get("utm_campaign"), "review-headphones");
assert.equal(siteParsed.searchParams.get("utm_content"), "headphones:hero");
assert.equal(siteParsed.searchParams.get("placement"), "hero");
assert.equal(buildSiteTrackedAffiliateUrl("https://external.example/out", { pageSlug: "headphones", placement: "hero" }), "https://external.example/out");
const parsedSiteClick = parseAffiliateClickMetadata({ requestUrl: siteUrl, referrerUrl: "https://www.vetor.blog/reviews/headphones/", productSlug: "headphones", sourceType: "review", destinationUrl: "https://meli.la/offer" });
assert.equal(parsedSiteClick.click_source, "vetor.blog");
assert.equal(parsedSiteClick.click_medium, "site");
assert.equal(parsedSiteClick.click_campaign, "review-headphones");
assert.equal(parsedSiteClick.cta_position, "hero");
const youtubeClick = parseAffiliateClickMetadata({
  requestUrl: url,
  referrerUrl: "https://www.youtube.com/watch?v=abc123",
  productSlug: "redmi",
  sourceType: "review",
  destinationUrl: "https://meli.la/offer",
});
assert.equal(youtubeClick.request_path, "/go/redmi/");
assert.equal(youtubeClick.click_source, "youtube");
assert.equal(youtubeClick.click_medium, "video");
assert.equal(youtubeClick.content_id, "queue-123");
assert.equal(youtubeClick.product_slug, "redmi");
assert.equal(youtubeClick.destination_host, "meli.la");

const siteClick = parseAffiliateClickMetadata({
  requestUrl: "https://www.vetor.blog/go/headphones/",
  referrerUrl: "https://www.vetor.blog/reviews/headphones/",
  productSlug: "headphones",
  sourceType: "review",
  destinationUrl: "https://meli.la/offer",
});
assert.equal(siteClick.referrer_path, "/reviews/headphones/");
assert.equal(siteClick.click_source, "vetor.blog");
assert.equal(siteClick.click_medium, "internal");
assert.equal(siteClick.utm_source, null);

console.log("affiliate attribution contract: all assertions passed");
