import assert from "node:assert/strict";
import { resolveSearchConsoleMetrics } from "../src/lib/search-console";
const propertyAggregate = resolveSearchConsoleMetrics(
  { clicks: 5, impressions: 50, ctr: 0.1, position: 7.5 },
  [
    { keys: ["/reviews/a/"], clicks: 3, impressions: 30, ctr: 0.1, position: 5 },
    { keys: ["/reviews/b/"], clicks: 2, impressions: 15, ctr: 0.1333, position: 9 },
  ],
  [
    { keys: ["consulta A", "/reviews/a/"], clicks: 1, impressions: 8, ctr: 0.125, position: 4 },
    { keys: ["consulta B", "/reviews/b/"], clicks: 1, impressions: 7, ctr: 0.1428, position: 8 },
  ]
);
assert.equal(propertyAggregate.totalImpressions, 50);
assert.equal(propertyAggregate.totalClicks, 5);
assert.equal(propertyAggregate.averageCtr, 10);
assert.equal(propertyAggregate.averagePosition, 7.5);
assert.equal(propertyAggregate.queryVisibleImpressions, 15);
assert.equal(propertyAggregate.unlistedImpressions, 35);
assert.equal(propertyAggregate.totalsSource, "property_aggregate");
const pageFallback = resolveSearchConsoleMetrics(null,
  [{ keys: ["/reviews/a/"], clicks: 2, impressions: 20, ctr: 0.1, position: 6 }],
  [{ keys: ["consulta A", "/reviews/a/"], clicks: 1, impressions: 8, ctr: 0.125, position: 4 }]
);
assert.equal(pageFallback.totalImpressions, 20);
assert.equal(pageFallback.totalClicks, 2);
assert.equal(pageFallback.totalsSource, "page_rows_fallback");
const queryFallback = resolveSearchConsoleMetrics(null, [],
  [{ keys: ["consulta A", "/reviews/a/"], clicks: 1, impressions: 8, ctr: 0.125, position: 4 }]
);
assert.equal(queryFallback.totalImpressions, 8);
assert.equal(queryFallback.totalsSource, "query_page_fallback");
console.log("Search Console aggregation: all assertions passed");
