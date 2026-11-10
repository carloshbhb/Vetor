import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const route = read("src/app/api/cron/video-queue-worker/route.ts");
const workflow = read(".github/workflows/process-video-queue.yml");
const processVideo = read("video/scripts/process-video.mjs");

assert.match(route, /const MAX_DAILY_PUBLICATIONS = 15;/);
assert.match(route, /function normalizeMercadoLivreItemId/);
assert.match(route, /function getPublicationFormat/);

const start = route.indexOf('if (action === "queueFromReviews")');
const end = route.indexOf('if (action === "queueFromComparatives")');
assert.ok(start >= 0 && end > start, "queueFromReviews action exists");
const block = route.slice(start, end);

assert.match(block, /from\("ml_social_list_items"\)/);
assert.match(block, /socialReviewSlugs/);
assert.match(block, /const videoFormat = "long";/);
assert.match(block, /getPublicationFormat\(row\.media_assets\) === 'long'/);
assert.match(block, /media_assets: \[\{ type: "publication_format", format: videoFormat \}\]/);
assert.doesNotMatch(block, /const videoFormat = "short"/);

assert.match(block, /\.in\("status", \["pending", "processing"\]\)\.eq\("publication_mode", "automatic"\)/);
assert.doesNotMatch(block, /\.lte\("scheduled_at"/);
assert.match(block, /\(doneToday \|\| 0\) \+ \(pendingCount \|\| 0\) >= MAX_DAILY_PUBLICATIONS/);
assert.match(block, /\(doneToday \|\| 0\) \+ \(pendingCount \|\| 0\) \+ queued\.length >= MAX_DAILY_PUBLICATIONS/);
assert.match(block, /const safePurchase = Boolean\(/);
assert.match(block, /trackedPurchase/);

const retryStart = route.indexOf('if (action === "retrySafeFailed")');
const retryEnd = route.indexOf('if (action === "retryRemotionTimeouts")', retryStart);
assert.ok(retryStart >= 0 && retryEnd > retryStart);
const retryBlock = route.slice(retryStart, retryEnd);
assert.match(retryBlock, /\.eq\("publication_mode", "automatic"\)/);
assert.match(retryBlock, /if \(format !== "long"\)/);

assert.match(route, /seenFormatKeys/);
assert.match(route, /getPublicationFormat\(record\.media_assets\) === format/);
assert.match(route, /media_assets: \[\{ type: "publication_format", format: "short" \}\]/);

assert.equal((workflow.match(/^\s+- cron:/gm) || []).length, 3);
assert.match(workflow, /MAX_VIDEOS: '5'/);
assert.match(workflow, /retrySafeFailed/);
assert.doesNotMatch(workflow, /queueFromComparatives/);
assert.doesNotMatch(processVideo, /queueApi\('queueFromComparatives'/);

console.log("video queue quota tests passed");
