import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const route = read("src/app/api/cron/video-queue-worker/route.ts");
const workflow = read(".github/workflows/process-video-queue.yml");
const processVideo = read("video/scripts/process-video.mjs");
const scriptRoute = read("src/app/api/cron/generate-video-script/route.ts");

assert.match(route, /const MAX_DAILY_PUBLICATIONS = 15;/);
assert.match(route, /function normalizeMercadoLivreItemId/);
assert.match(route, /function getPublicationFormat/);

const quota = route.slice(route.indexOf("async function getDailyPublicationQuota"), route.indexOf("const UPDATABLE_FIELDS"));
assert.match(quota, /\.contains\("media_assets", \[\{ type: "publication_format", format: "long" \}\]\)/);

const start = route.indexOf('if (action === "queueFromSocialList")');
const end = route.indexOf('if (action === "queueFromComparatives")', start);
assert.ok(start >= 0 && end > start, "independent Social List queue action exists");
const block = route.slice(start, end);
assert.match(block, /from\("ml_social_list_items"\)/);
assert.match(block, /from\("product_links"\)/);
assert.match(block, /independentOfReviews: true/);
assert.match(block, /review_url: null/);
assert.match(block, /format: "long"/);
assert.match(block, /ml-social-list-item/);
assert.match(block, /isSafeMercadoLivreAffiliateUrl/);
assert.match(route, /function isLikelySameVideoProductTitle/);
assert.match(block, /titleAlreadyHasVideo/);
assert.doesNotMatch(block, /from\("reviews"\)/);

assert.match(route, /pendingQuery = pendingQuery\.contains\("media_assets", \[\{ type: "publication_format", format: "long" \}\]\)/);
assert.match(route, /\.contains\("media_assets", \[\{ type: "publication_format", format: "long" \}\]\)/);

const retryStart = route.indexOf('if (action === "retrySafeFailed")');
const retryEnd = route.indexOf('if (action === "retryRemotionTimeouts")', retryStart);
assert.ok(retryStart >= 0 && retryEnd > retryStart);
assert.match(route.slice(retryStart, retryEnd), /getPublicationFormat\(item\.media_assets\) !== "long"/);
assert.match(route.slice(retryStart, retryEnd), /completedKeys/);

assert.equal((workflow.match(/^\s+- cron:/gm) || []).length, 3);
assert.match(workflow, /MAX_VIDEOS: '5'/);
assert.match(workflow, /queueFromSocialList/);
assert.doesNotMatch(workflow, /workflow_run/);
assert.doesNotMatch(workflow, /queueFromReviews/);
assert.doesNotMatch(workflow, /Generate Daily Review/);

assert.match(processVideo, /queueApi\('queueFromSocialList'/);
assert.doesNotMatch(processVideo, /queueApi\('queueFromReviews'/);
assert.doesNotMatch(processVideo, /review_url ausente/);
assert.match(processVideo, /Pesquisa independente gerada para item da Lista Social/);
assert.doesNotMatch(scriptRoute, /URL da fila não corresponde a um review/);
assert.match(scriptRoute, /ml_social_list_items/);

console.log("independent long-form video queue quota tests passed");
