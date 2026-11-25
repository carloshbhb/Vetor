import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const route = read("src/app/api/cron/video-queue-worker/route.ts");
const workflow = read(".github/workflows/process-video-queue.yml");
const shortsWorkflow = read(".github/workflows/publish-daily-shorts.yml");
const processVideo = read("video/scripts/process-video.mjs");
const scriptRoute = read("src/app/api/cron/generate-video-script/route.ts");

assert.ok(route.includes('const DAILY_PUBLICATION_LIMITS = { short: 15, long: 10 } as const;'));
assert.ok(route.includes('getDailyPublicationLimit(format: "short" | "long")'));
assert.ok(!route.includes("MAX_DAILY_PUBLICATIONS"));
assert.match(route, /function normalizeMercadoLivreItemId/);
assert.match(route, /function getPublicationFormat/);
assert.match(route, /function isSafePublicNewsUrl/);

const quota = route.slice(route.indexOf("async function getDailyPublicationQuota"), route.indexOf("const UPDATABLE_FIELDS"));
assert.ok(quota.includes('.contains("media_assets", JSON.stringify([{ type: "publication_format", format }]))'));
assert.ok(quota.includes("dailyLimit - completedToday"));
assert.ok(quota.includes("format,"));

const longStart = route.indexOf('if (action === "queueFromSocialList")');
const longEnd = route.indexOf('if (action === "queueFromProductCatalog")', longStart);
assert.ok(longStart >= 0 && longEnd > longStart, "independent Social List long queue exists");
const longBlock = route.slice(longStart, longEnd);
assert.match(longBlock, /from\("ml_social_list_items"\)/);
assert.match(longBlock, /from\("product_links"\)/);
assert.match(longBlock, /independentOfReviews: true/);
assert.match(longBlock, /review_url: null/);
assert.match(longBlock, /format: "long"/);
assert.match(longBlock, /DAILY_PUBLICATION_LIMITS\.long/);
assert.match(longBlock, /ml-social-list-item/);
assert.match(longBlock, /isSafeMercadoLivreAffiliateUrl/);
assert.match(longBlock, /titleAlreadyHasVideo/);
assert.match(longBlock, /batchProductLinkIds/);
assert.match(longBlock, /batchItemIds/);
assert.match(longBlock, /batchProductTitles/);
assert.match(longBlock, /publication_mode: manualOverride \? "manual" : "automatic"/);
assert.doesNotMatch(longBlock, /from\("reviews"\)/);

const catalogStart = route.indexOf('if (action === "queueFromProductCatalog")');
const catalogEnd = route.indexOf('if (action === "queueTrendingShorts" || action === "queueTrendingVideos")', catalogStart);
assert.ok(catalogStart >= 0 && catalogEnd > catalogStart, "verified catalog fallback action exists");
const catalogBlock = route.slice(catalogStart, catalogEnd);
assert.ok(catalogBlock.includes('const format = body.format === "short" ? "short" : "long";'));
assert.ok(catalogBlock.includes("DAILY_PUBLICATION_LIMITS[format]"));
assert.ok(catalogBlock.includes("isSafeMercadoLivreAffiliateUrl"));
assert.ok(catalogBlock.includes("isSafeMercadoLivreProductUrl"));
assert.ok(catalogBlock.includes('format, fallback: true'));
assert.match(catalogBlock, /publication_mode: manualOverride \? "manual" : "automatic"/);

const trendingStart = route.indexOf('if (action === "queueTrendingShorts" || action === "queueTrendingVideos")');
const trendingEnd = route.indexOf('if (action === "queueFromSocialListShorts")', trendingStart);
assert.ok(trendingStart >= 0 && trendingEnd > trendingStart);
const trendingBlock = route.slice(trendingStart, trendingEnd);
assert.ok(trendingBlock.includes("entry?.news"));
assert.ok(trendingBlock.includes("isSafePublicNewsUrl"));
assert.ok(trendingBlock.includes('type: "trend-topic"'));
assert.ok(trendingBlock.includes("relevanceScore"));
assert.ok(trendingBlock.includes("const dailyLimit = getDailyPublicationLimit(format)"));
assert.ok(trendingBlock.includes("dailyLimit - completed - pending"));
assert.ok(trendingBlock.includes("publication_mode: manualOverride ? \"manual\" : \"automatic\""));
assert.ok(trendingBlock.includes('source: "google-trends-brazil-related-news+ml-social-list"'));
assert.ok(trendingBlock.includes("fallbackRequired: queued.length === 0"));

const shortsStart = route.indexOf('if (action === "queueFromSocialListShorts")');
const shortsEnd = route.indexOf('if (action === "queueFromComparatives")', shortsStart);
assert.ok(shortsStart >= 0 && shortsEnd > shortsStart);
const shortsBlock = route.slice(shortsStart, shortsEnd);
assert.ok(shortsBlock.includes("DAILY_PUBLICATION_LIMITS.short"));
assert.ok(shortsBlock.includes('format: "short"'));
assert.ok(shortsBlock.includes("publication_mode: manualOverride ? \"manual\" : \"automatic\""));

assert.ok(route.includes('pendingQuery = pendingQuery\n        .contains("media_assets", JSON.stringify([{ type: "publication_format", format }]))'));
assert.ok(route.includes('.eq("publication_mode", manualOverride ? "manual" : "automatic");'));
assert.equal(route.split('.contains("media_assets", JSON.stringify').length - 1, 11,
  "all JSONB media_assets filters serialize the array marker explicitly");

const retryStart = route.indexOf('if (action === "retrySafeFailed")');
const retryEnd = route.indexOf('if (action === "retryRemotionTimeouts")', retryStart);
assert.ok(retryStart >= 0 && retryEnd > retryStart);
assert.match(route.slice(retryStart, retryEnd), /getPublicationFormat\(item\.media_assets\) !== "long"/);
assert.match(route.slice(retryStart, retryEnd), /completedKeys/);
assert.match(route.slice(retryStart, retryEnd), /getPublicationFormat\(row\.media_assets\) !== "long"/);

assert.equal((workflow.match(/^\s+- cron:/gm) || []).length, 2, "long-form workflow runs two daily batches");
assert.match(workflow, /MAX_VIDEOS: '5'/);
assert.match(workflow, /PUBLICATION_FORMAT: long/);
assert.match(workflow, /queueTrendingVideos/);
assert.match(workflow, /fetch-trending-news\.py --output trend-news\.json/);
assert.match(workflow, /daily cap=10 long videos/);
assert.match(workflow, /queueFromSocialList/);
assert.doesNotMatch(workflow, /workflow_run/);
assert.doesNotMatch(workflow, /queueFromReviews/);
assert.doesNotMatch(workflow, /Generate Daily Review/);

assert.equal((shortsWorkflow.match(/^\s+- cron:/gm) || []).length, 1, "Shorts workflow runs one campaign per day");
assert.match(shortsWorkflow, /for batch in 1 2 3/);
assert.match(shortsWorkflow, /fetch-trending-news\.py --output trends\.json/);
assert.match(shortsWorkflow, /queueTrendingShorts/);
assert.match(shortsWorkflow, /PUBLICATION_FORMAT=short/);
assert.match(shortsWorkflow, /attempted=\$attempted/);
assert.match(shortsWorkflow, /manual_run=/);

assert.match(processVideo, /queueApi\('quota', \{ format: publicationFormat \}\)/);
assert.match(processVideo, /queueApi\('next', \{ limit, manualOverride, format \}\)/);
assert.match(processVideo, /trendSources,/);
assert.match(processVideo, /queueApi\('queueFromSocialList', \{ limit: slotsNeeded, manualOverride: manualRun \}\)/);
assert.doesNotMatch(processVideo, /queueApi\('queueFromReviews'/);

assert.match(scriptRoute, /PAUTA JORNALÍSTICA EM ALTA/);
assert.match(scriptRoute, /PESQUISA DO PRODUTO/);
assert.match(scriptRoute, /trendSources: trendNews/);
assert.match(scriptRoute, /!existingMediaAssets\.some/);
assert.match(scriptRoute, /recomendação relacionada/);
assert.match(scriptRoute, /ml_social_list_items/);
assert.doesNotMatch(scriptRoute, /URL da fila não corresponde a um review/);

console.log("independent short and long quotas + news-led video queue tests passed");
