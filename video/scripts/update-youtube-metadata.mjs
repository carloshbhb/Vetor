import { google } from "googleapis";
import { buildVideoDescription, resolveVideoFormat } from "./video-format.mjs";

const SITE_URL = (process.env.VETOR_SITE_URL || "https://www.vetor.blog").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET;
const APPLY = process.env.APPLY_UPDATES === "true";
const MARKER = "LINK PARA CONFERIR PREÇO E OFERTA";

function cleanText(value, max = 220) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseScript(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getContentSlug(urlValue) {
  try {
    const url = new URL(urlValue);
    const match = url.pathname.match(/^\/(reviews|comparativos)\/([^/]+)\/?$/);
    return match ? { type: match[1] === "comparativos" ? "comparison" : "review", slug: match[2] } : null;
  } catch {
    return null;
  }
}

function normalizedDestination(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return "";
  }
}

function resolveManagedAffiliate(record, affiliateLinks) {
  const content = getContentSlug(record.review_url);
  const oldDestinations = new Set([
    normalizedDestination(record.affiliate_url),
    normalizedDestination(record.shortened_affiliate_url),
  ].filter(Boolean));

  let matches = [];
  if (content?.type === "review") {
    matches = affiliateLinks.filter((link) =>
      link.status === "active" &&
      link.source_type === "review" &&
      link.source_ref === content.slug
    );
  } else if (content?.type === "comparison") {
    matches = affiliateLinks.filter((link) =>
      link.status === "active" &&
      link.source_type === "comparison_product" &&
      String(link.source_ref || "").startsWith("comparativo:" + content.slug + "#")
    );
  }

  const exact = matches.find((link) => oldDestinations.has(normalizedDestination(link.destination_url)));
  const chosen = exact || matches[0] || affiliateLinks.find((link) =>
    link.status === "active" && oldDestinations.has(normalizedDestination(link.destination_url))
  );
  if (!chosen || !/^https:\/\//i.test(String(chosen.destination_url || ""))) return null;
  return chosen;
}

function makeTrackedUrl(record, affiliate, format) {
  const slug = encodeURIComponent(String(affiliate.slug || "").trim());
  if (!slug) return "";
  const content = getContentSlug(record.review_url);
  const url = new URL("https://www.vetor.blog/go/" + slug + "/");
  url.searchParams.set("utm_source", "youtube");
  url.searchParams.set("utm_medium", "video");
  url.searchParams.set("utm_campaign", (content?.type === "comparison" ? "comparison-" : "review-") + (content?.slug || "product"));
  url.searchParams.set("utm_content", String(record.youtube_video_id || record.id).slice(0, 160));
  url.searchParams.set("utm_term", format);
  url.searchParams.set("placement", "description");
  return url.toString();
}

function choosePurchaseTarget(record, affiliateLinks, format) {
  const managed = resolveManagedAffiliate(record, affiliateLinks);
  if (managed) {
    const trackedUrl = makeTrackedUrl(record, managed, format);
    if (trackedUrl) {
      return {
        purchaseUrl: trackedUrl,
        affiliateUrl: managed.destination_url,
        shortenedAffiliateUrl: trackedUrl,
        managed: true,
        managedSlug: managed.slug,
      };
    }
  }

  const existing = String(record.shortened_affiliate_url || record.affiliate_url || "").trim();
  if (/^https:\/\/meli\.la\//i.test(existing)) {
    return {
      purchaseUrl: existing,
      affiliateUrl: /^https:\/\/meli\.la\//i.test(record.affiliate_url || "") ? record.affiliate_url : existing,
      shortenedAffiliateUrl: existing,
      managed: false,
      managedSlug: null,
    };
  }

  return {
    purchaseUrl: existing,
    affiliateUrl: record.affiliate_url || existing,
    shortenedAffiliateUrl: record.shortened_affiliate_url || existing,
    managed: false,
    managedSlug: null,
  };
}

async function queueApi(action, payload = {}) {
  if (!CRON_SECRET) throw new Error("CRON_SECRET ausente.");
  const response = await fetch(SITE_URL + "/api/cron/video-queue-worker/", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + CRON_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true) {
    throw new Error("Queue API HTTP " + response.status + ": " + (result.error || "resposta inválida"));
  }
  return result;
}

async function createYouTubeClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Credenciais OAuth do YouTube incompletas.");
  }
  const oauth = new google.auth.OAuth2(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  const auth = await oauth.getAccessToken();
  if (!auth.token) throw new Error("OAuth do YouTube não retornou access token.");
  return google.youtube({ version: "v3", auth: oauth });
}

function buildDescription(record, target, currentSnippet) {
  const parsed = parseScript(record.script_text);
  const format = resolveVideoFormat(record.media_assets);
  return buildVideoDescription({
    format,
    productTitle: cleanText(record.product_title, 180),
    category: cleanText(record.product_category || "Tecnologia", 100),
    purchaseUrl: target.purchaseUrl,
    reviewUrl: record.review_url,
    hook: cleanText(parsed.hook || record.script_hook || currentSnippet.title, 260),
    highlights: Array.isArray(parsed.scenes) ? parsed.scenes.map((scene) => cleanText(scene?.text, 220)).filter(Boolean) : [],
    callToAction: cleanText(parsed.callToAction, 350),
    chapters: [],
  });
}

async function fetchVideoSnippets(youtube, ids) {
  const found = new Map();
  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50);
    const response = await youtube.videos.list({ part: ["snippet"], id: batch.join(",") });
    for (const video of response.data.items || []) {
      if (video.id && video.snippet) found.set(video.id, video.snippet);
    }
  }
  return found;
}

async function main() {
  console.log("[youtube-metadata] mode=" + (APPLY ? "APPLY" : "DRY-RUN"));
  const batch = await queueApi("metadataBatch", { limit: 500 });
  const records = Array.isArray(batch.videos) ? batch.videos : [];
  const affiliateLinks = Array.isArray(batch.affiliateLinks) ? batch.affiliateLinks : [];
  const eligible = records.filter((record) =>
    record.youtube_video_id && record.review_url && /^https:\/\//i.test(record.review_url)
  );
  console.log("[youtube-metadata] queue_records=" + records.length + " eligible=" + eligible.length + " affiliate_registry=" + affiliateLinks.length);

  const youtube = await createYouTubeClient();
  const snippets = await fetchVideoSnippets(youtube, eligible.map((record) => record.youtube_video_id));
  const plan = [];
  const skipped = [];
  for (const record of eligible) {
    const snippet = snippets.get(record.youtube_video_id);
    if (!snippet || !snippet.title || !snippet.categoryId) {
      skipped.push({ videoId: record.youtube_video_id, reason: "snippet/title/categoryId não encontrado" });
      continue;
    }
    const format = resolveVideoFormat(record.media_assets);
    const target = choosePurchaseTarget(record, affiliateLinks, format);
    if (!target.purchaseUrl || !/^https:\/\//i.test(target.purchaseUrl)) {
      skipped.push({ videoId: record.youtube_video_id, reason: "sem link de compra HTTPS válido" });
      continue;
    }
    const description = buildDescription(record, target, snippet);
    const descriptionBytes = Buffer.byteLength(description, "utf8");
    if (descriptionBytes > 5000) {
      skipped.push({ videoId: record.youtube_video_id, reason: "descrição excede 5.000 bytes" });
      continue;
    }
    const linkChanged = target.shortenedAffiliateUrl !== record.shortened_affiliate_url ||
      target.affiliateUrl !== record.affiliate_url;
    const descriptionChanged = description !== String(snippet.description || "");
    plan.push({
      record,
      snippet,
      target,
      format,
      description,
      descriptionChanged,
      linkChanged,
      descriptionBytes,
    });
  }

  const todo = plan.filter((item) => item.descriptionChanged || item.linkChanged);
  const tracked = todo.filter((item) => item.target.managed).length;
  const untracked = todo.length - tracked;
  console.log("[youtube-metadata] plan=" + todo.length + " descriptions_to_update=" + todo.filter((item) => item.descriptionChanged).length +
    " managed_tracked_links=" + tracked + " preserved_existing_links=" + untracked + " skipped=" + skipped.length);
  for (const item of todo) {
    console.log("[youtube-metadata] plan_item video=" + item.record.youtube_video_id +
      " format=" + item.format +
      " description_bytes=" + item.descriptionBytes +
      " tracked=" + item.target.managed +
      " affiliate_slug=" + (item.target.managedSlug || "preservado"));
  }

  if (!APPLY) {
    console.log("[youtube-metadata] Dry-run concluído; nenhum vídeo ou registro do Supabase foi alterado.");
    return;
  }

  const results = [];
  for (const item of todo) {
    const videoId = item.record.youtube_video_id;
    try {
      const snippet = item.snippet;
      const preservedSnippet = {
        title: snippet.title,
        categoryId: snippet.categoryId,
        description: item.description,
        tags: Array.isArray(snippet.tags) ? snippet.tags : [],
      };
      if (snippet.defaultLanguage) preservedSnippet.defaultLanguage = snippet.defaultLanguage;
      if (snippet.defaultAudioLanguage) preservedSnippet.defaultAudioLanguage = snippet.defaultAudioLanguage;

      await youtube.videos.update({
        part: ["snippet"],
        requestBody: { id: videoId, snippet: preservedSnippet },
      });

      const queueUpdates = {};
      if (item.linkChanged) {
        queueUpdates.affiliate_url = item.target.affiliateUrl;
        queueUpdates.shortened_affiliate_url = item.target.shortenedAffiliateUrl;
      }
      if (Object.keys(queueUpdates).length) {
        await queueApi("update", { id: item.record.id, updates: queueUpdates });
      }
      results.push({
        videoId,
        status: "updated",
        descriptionChanged: item.descriptionChanged,
        linkChanged: item.linkChanged,
        tracked: item.target.managed,
      });
      console.log("[youtube-metadata] updated=" + videoId + " description=" + item.descriptionChanged + " links=" + item.linkChanged);
    } catch (error) {
      const message = String(error?.response?.data?.error?.message || error?.message || error).slice(0, 600);
      results.push({ videoId, status: "failed", error: message });
      console.error("[youtube-metadata] failed=" + videoId + " reason=" + message);
    }
  }

  const updated = results.filter((item) => item.status === "updated").length;
  const failed = results.filter((item) => item.status === "failed").length;
  console.log("[youtube-metadata] finished updated=" + updated + " failed=" + failed + " skipped=" + skipped.length);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "apply",
    total: records.length,
    eligible: eligible.length,
    planned: todo.length,
    updated,
    failed,
    skipped,
    results,
  };
  const fs = await import("node:fs/promises");
  await fs.writeFile("youtube-metadata-report.json", JSON.stringify(report, null, 2));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("[youtube-metadata] fatal: " + String(error?.message || error));
  process.exitCode = 1;
});
