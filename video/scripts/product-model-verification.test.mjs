import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  inspectProductModelAsset,
  verifyProductModelAssetIntegrity,
} from "./product-model-verification.mjs";

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

const payload = Buffer.from("glTF exact product asset");
const payloadSha = createHash("sha256").update(payload).digest("hex");
const exactAsset = {
  ...base,
  sha256: payloadSha,
};
const exact = await verifyProductModelAssetIntegrity(exactAsset, {
  fetchImpl: async () => new Response(payload, {
    status: 200,
    headers: { "content-length": String(payload.length) },
  }),
});
assert.equal(exact.verified, true);
assert.equal(exact.integrityVerified, true);
assert.equal(exact.actualSha256, payloadSha);
assert.equal(exact.bytes, payload.length);

const replaced = await verifyProductModelAssetIntegrity(exactAsset, {
  fetchImpl: async () => new Response("different GLB bytes", { status: 200 }),
});
assert.equal(replaced.verified, false);
assert.equal(replaced.integrityVerified, false);
assert.match(replaced.reason, /não corresponde/);

const oversized = await verifyProductModelAssetIntegrity(exactAsset, {
  maxBytes: 4,
  fetchImpl: async () => new Response(payload, { status: 200 }),
});
assert.equal(oversized.verified, false);
assert.match(oversized.reason, /excede o limite/);

const unavailable = await verifyProductModelAssetIntegrity(exactAsset, {
  fetchImpl: async () => new Response("", { status: 503 }),
});
assert.equal(unavailable.verified, false);
assert.match(unavailable.reason, /HTTP 503/);

console.log("[product-model-verification] metadata, source evidence and downloaded GLB SHA-256 integrity passed.");
