import assert from "node:assert/strict";
import { inspectProductModelAsset } from "./product-model-verification.mjs";

const base = {
  url: "https://storage.example.com/models/product.glb",
  sha256: "a".repeat(64),
  review: {
    status: "verified",
    verifiedBy: "Vetor QA",
    verifiedAt: "2026-11-23T12:00:00.000Z",
    sourceReferences: ["https://merchant.example.com/product"],
  },
};

const verified = inspectProductModelAsset(base);
assert.equal(verified.available, true);
assert.equal(verified.verified, true);
assert.equal(verified.status, "verified");
assert.equal(verified.sha256, "a".repeat(64));

const pending = inspectProductModelAsset({
  url: base.url,
  sha256: base.sha256,
  review: { status: "pending-human-review" },
});
assert.equal(pending.available, true);
assert.equal(pending.verified, false);
assert.equal(pending.status, "unverified");
assert.match(pending.reason, /revisão humana/);

const incomplete = inspectProductModelAsset({
  ...base,
  review: { ...base.review, sourceReferences: [] },
});
assert.equal(incomplete.verified, false);
assert.match(incomplete.reason, /referências/);

const http = inspectProductModelAsset({ ...base, url: "http://storage.example.com/model.glb" });
assert.equal(http.available, false);
assert.equal(http.verified, false);

const invalidDigest = inspectProductModelAsset({ ...base, sha256: "not-a-digest" });
assert.equal(invalidDigest.verified, false);
assert.match(invalidDigest.reason, /SHA-256/);

const nested = inspectProductModelAsset({
  url: base.url,
  manifest: { sha256: base.sha256, review: base.review },
});
assert.equal(nested.verified, true);

console.log("[product-model-verification] URL, review, references, timestamp and SHA-256 contract passed.");
