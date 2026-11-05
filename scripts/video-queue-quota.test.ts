import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const route = read("src/app/api/cron/video-queue-worker/route.ts");

// 1. Daily limit lowered to 10 long videos.
assert.match(route, /const MAX_DAILY_PUBLICATIONS = 10;/);

const start = route.indexOf('if (action === "queueFromReviews")');
const end = route.indexOf('if (action === "queueFromComparatives")');
assert.ok(start >= 0 && end > start, "queueFromReviews action exists");
const block = route.slice(start, end);

// 2. No Shorts: videoFormat is always "long".
assert.match(block, /const videoFormat = "long";/);
assert.doesNotMatch(block, /"short"/, "queueFromReviews must not create short videos");

// 3. Quota gate: pending count query has no scheduled_at filter.
assert.match(block, /\.in\("status", \["pending", "processing"\]\)\.eq\("publication_mode", "automatic"\)/);
assert.doesNotMatch(block, /\.lte\("scheduled_at"/, "pending count must not filter by scheduled_at");

// 4. Quota gate skips all when doneToday + pendingCount >= 10.
assert.match(block, /\(doneToday \|\| 0\) \+ \(pendingCount \|\| 0\) >= MAX_DAILY_PUBLICATIONS/);

// 5. safePurchase check on the generated tracked go/ URL.
assert.match(block, /const safePurchase = Boolean\(/);
assert.match(block, /trackedPurchase/);

// 6. Per-candidate break when quota full (10/day).
assert.match(block, /\(doneToday \|\| 0\) \+ \(pendingCount \|\| 0\) \+ queued\.length >= MAX_DAILY_PUBLICATIONS/);

// 7. Only long format media asset.
assert.match(block, /media_assets: \[\{ type: "publication_format", format: videoFormat \}\]/);

console.log("video queue quota tests passed");