import assert from "node:assert/strict";
import {
  MATCH_ERROR_RETRY_COOLDOWN_MS,
  selectBatchCandidates,
} from "../src/lib/mercadolivre-match-batch";

// Regression for the 2026-11-04 refill: candidates whose match_status is
// "error" were never treated as checked, so every batch re-selected the same
// failing subset and the queue never advanced (remaining stuck at 425).
const NOW = Date.parse("2026-11-04T22:00:00Z");
const MINUTE = 60 * 1000;

const links = [
  {
    id: "a",
    name: "Produto A",
    marketplace: "Mercado Livre",
    category: "Teste",
    slug: "produto-a",
    status: "active",
    destination_url: "",
    product_url: "",
    final_url: "",
    source_type: "product_link",
    priority: 50,
  },
  {
    id: "b",
    name: "Produto B",
    marketplace: "Mercado Livre",
    category: "Teste",
    slug: "produto-b",
    status: "active",
    destination_url: "",
    product_url: "",
    final_url: "",
    source_type: "product_link",
    priority: 90,
  },
  {
    id: "c",
    name: "Produto C",
    marketplace: "Mercado Livre",
    category: "Teste",
    slug: "produto-c",
    status: "active",
    destination_url: "",
    product_url: "",
    final_url: "",
    source_type: "product_link",
    priority: 10,
  },
];

const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);

// Final statuses are already resolved and must not be selected again.
const resolved = selectBatchCandidates(
  links,
  [{ affiliate_link_id: "a", checked_at: new Date(NOW - 60 * MINUTE).toISOString(), match_status: "matched" }],
  { limit: 10, now: NOW }
);
assert.deepEqual(ids(resolved.selected), ["b", "c"]);

// A recent failure is skipped so the batch moves to the next candidates.
const recentError = selectBatchCandidates(
  links,
  [{ affiliate_link_id: "a", checked_at: new Date(NOW - 10 * MINUTE).toISOString(), match_status: "error" }],
  { limit: 10, now: NOW }
);
assert.deepEqual(ids(recentError.selected), ["b", "c"]);
assert.equal(recentError.errorIds.has("a"), true, "recent error must be tracked as errored");

// Once the cooldown expires the candidate is eligible again for a later run.
const oldError = selectBatchCandidates(
  links,
  [
    {
      affiliate_link_id: "a",
      checked_at: new Date(NOW - MATCH_ERROR_RETRY_COOLDOWN_MS - MINUTE).toISOString(),
      match_status: "error",
    },
  ],
  { limit: 10, now: NOW }
);
assert.deepEqual(ids(oldError.selected), ["b", "a", "c"]);
assert.equal(oldError.errorIds.has("a"), false, "expired error must be eligible again");

// Without any history every candidate is eligible, ordered by priority.
const fresh = selectBatchCandidates(links, [], { limit: 10, now: NOW });
assert.deepEqual(ids(fresh.selected), ["b", "a", "c"]);

// Refresh mode reprocesses everything, oldest check first (never checked first).
const refreshed = selectBatchCandidates(
  links,
  [
    { affiliate_link_id: "b", checked_at: new Date(NOW - 90 * MINUTE).toISOString(), match_status: "matched" },
    { affiliate_link_id: "a", checked_at: new Date(NOW - 10 * MINUTE).toISOString(), match_status: "review" },
  ],
  { limit: 10, refresh: true, now: NOW }
);
assert.deepEqual(ids(refreshed.selected), ["c", "b", "a"]);

// Rows created without a valid checked_at used to stay eligible forever. The
// fallback to updated_at keeps the cooldown working for them.
const invalidCheckedAt = selectBatchCandidates(
  links,
  [
    {
      affiliate_link_id: "a",
      checked_at: "not-a-date",
      updated_at: new Date(NOW - 10 * MINUTE).toISOString(),
      match_status: "error",
    },
    {
      affiliate_link_id: "b",
      checked_at: null,
      updated_at: new Date(NOW - 10 * MINUTE).toISOString(),
      match_status: "error",
    },
  ],
  { limit: 10, now: NOW }
);
assert.deepEqual(
  ids(invalidCheckedAt.selected),
  ["c"],
  "error rows with an unusable checked_at must still respect the cooldown"
);
assert.equal(invalidCheckedAt.errorIds.has("a"), true);
assert.equal(invalidCheckedAt.errorIds.has("b"), true);

// Without checked_at or updated_at there is no timestamp to trust; the row
// must become eligible instead of being skipped forever.
const undatedError = selectBatchCandidates(
  links,
  [{ affiliate_link_id: "a", checked_at: null, match_status: "error" }],
  { limit: 10, now: NOW }
);
assert.deepEqual(ids(undatedError.selected), ["b", "a", "c"]);
assert.equal(undatedError.errorIds.has("a"), false);

// Old error rows whose checked_at is invalid but updated_at is stale also
// become eligible again.
const staleInvalidCheckedAt = selectBatchCandidates(
  links,
  [
    {
      affiliate_link_id: "a",
      checked_at: "invalid",
      updated_at: new Date(
        NOW - MATCH_ERROR_RETRY_COOLDOWN_MS - MINUTE
      ).toISOString(),
      match_status: "error",
    },
  ],
  { limit: 10, now: NOW }
);
assert.deepEqual(ids(staleInvalidCheckedAt.selected), ["b", "a", "c"]);

console.log("Mercado Livre match batch selection: OK");
