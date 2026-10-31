import assert from "node:assert/strict";
import { summarizeAffiliateLinkStats } from "../src/lib/affiliate-stats";

const stats = summarizeAffiliateLinkStats([
  { status: "active", health_status: "unknown", total_clicks: 1, destination_url: "", last_checked_at: null, http_status: null },
  { status: "active", health_status: "unknown", total_clicks: 2, destination_url: "https://meli.la/example", last_checked_at: "2026-10-31T10:00:00Z", http_status: 403 },
  { status: "active", health_status: "error", total_clicks: 3, destination_url: "https://example.com", last_checked_at: "2026-10-31T10:00:00Z", http_status: 500 },
  { status: "active", health_status: "healthy", total_clicks: 4, destination_url: "https://example.org", last_checked_at: "2026-10-31T10:00:00Z", http_status: 200 },
  { status: "paused", health_status: "unknown", total_clicks: 0, destination_url: "", last_checked_at: "2026-10-10T10:00:00Z", http_status: null },
]);

assert.equal(stats.total, 5);
assert.equal(stats.active, 4);
assert.equal(stats.paused, 1);
assert.equal(stats.unchecked, 1, "only links never checked belong in the pending count");
assert.equal(stats.blockedChecks, 1, "HTTP 403 should be separated from broken links");
assert.equal(stats.healthErrors, 1);
assert.equal(stats.pendingLinks, 2);
assert.equal(stats.clicks, 10);

console.log("affiliate health stats tests passed");
