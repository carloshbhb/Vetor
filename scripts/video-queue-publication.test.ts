import assert from "node:assert/strict";
import {
  isPublishedComparativeArticle,
  resolveComparativeVideoAffiliateTarget,
} from "../src/lib/video-queue-guards";

assert.equal(isPublishedComparativeArticle({ published_at: null }), false);
assert.equal(isPublishedComparativeArticle({ published_at: "" }), false);
assert.equal(isPublishedComparativeArticle({ published_at: "not-a-date" }), false);
assert.equal(isPublishedComparativeArticle({ published_at: "2026-10-31T10:00:00.000Z" }), true);

const products = [
  { name: "Robô aspirador WAP W400", imageUrl: "https://www.vetor.blog/images/wap.webp", product_url: "https://www.mercadolivre.com.br/wap-w400" },
  { name: "Robô aspirador Xiaomi S20+", imageUrl: "https://www.vetor.blog/images/xiaomi.webp", product_url: "https://www.mercadolivre.com.br/xiaomi-s20" },
];
const managed = resolveComparativeVideoAffiliateTarget(products, [
  { name: "ROBO ASPIRADOR WAP W400", slug: "wap-w400", destination_url: "https://meli.la/abc123", total_clicks: 12 },
]);
assert.equal(managed?.trackingMode, "managed");
assert.equal(managed?.product.name, "Robô aspirador WAP W400");
assert.equal(managed?.destinationUrl, "https://meli.la/abc123");
assert.equal(managed?.trackedUrl, "https://www.vetor.blog/go/wap-w400/");

const direct = resolveComparativeVideoAffiliateTarget(products, []);
assert.equal(direct?.trackingMode, "direct");
assert.equal(direct?.trackedUrl, "https://www.mercadolivre.com.br/wap-w400");

const internalOnly = resolveComparativeVideoAffiliateTarget([
  { name: "Produto A", imageUrl: "https://www.vetor.blog/a.webp", product_url: "https://www.vetor.blog/comparativos/teste/" },
  { name: "Produto B", imageUrl: "https://www.vetor.blog/b.webp", product_url: "https://www.vetor.blog/reviews/b/" },
], []);
assert.equal(internalOnly, null, "internal article URLs must never masquerade as purchase CTAs");

const missingAffiliate = resolveComparativeVideoAffiliateTarget([
  { name: "Produto A", imageUrl: "https://www.vetor.blog/a.webp" },
  { name: "Produto B", imageUrl: "https://www.vetor.blog/b.webp" },
], []);
assert.equal(missingAffiliate, null, "comparisons without an external purchase destination must not be queued");

console.log("video queue publication and affiliate guard tests passed");
