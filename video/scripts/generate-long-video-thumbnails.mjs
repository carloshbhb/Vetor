import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "video", "out", "youtube-thumbnails");
const SITE_URL = (process.env.VETOR_SITE_URL || "https://www.vetor.blog").replace(/\/$/, "");
const CRON_SECRET = String(process.env.CRON_SECRET || "").trim();
const MAX_VIDEOS = Math.max(1, Math.min(500, Number(process.env.MAX_VIDEOS || 500)));
const START_OFFSET = Math.max(0, Number(process.env.START_OFFSET || 0));
const FORCE = process.env.FORCE_THUMBNAILS === "true";
const REPORT_PATH = path.join(ROOT, "video", "youtube-thumbnail-report.json");

function hashIndex(value, length) {
  return crypto.createHash("sha256").update(String(value)).digest().readUInt32BE(0) % length;
}

export function thumbnailHook(productTitle, videoTitle, videoId) {
  const title = String(videoTitle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const product = String(productTitle || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const combined = product + " " + title;
  let options;

  if (/fone|headphone|earbud|melobuds|qcy|jbl tune|soundcore/.test(combined)) {
    options = ["SOM DE VERDADE?", "CANCELA O RUÍDO?", "COMPENSA MESMO?"];
  } else if (/smart ?tv|televis|qled|oled|4k|projetor/.test(combined)) {
    options = ["IMAGEM DE CINEMA?", "VALE O PREÇO?", "SURPREENDEU?"];
  } else if (/notebook|laptop|pc gamer|mouse gamer|teclado gamer|controle|playstation|xbox/.test(combined)) {
    options = ["DESEMPENHO REAL", "VALE O PREÇO?", "SURPREENDEU?"];
  } else if (/camera|câmera|seguranca|segurança|roteador|wifi|smart home/.test(combined)) {
    options = ["FUNCIONA MESMO?", "VALE O PREÇO?", "TESTE REAL"];
  } else if (/tablet|ipad|smartphone|celular|galaxy|iphone|redmi|moto g|poco/.test(combined)) {
    options = ["VALE A PENA?", "COMPENSA MESMO?", "TESTE REAL"];
  } else {
    options = ["VALE A PENA?", "COMPENSA MESMO?", "BOM DE VERDADE?", "SURPREENDEU?"];
  }

  const noOverlap = options.filter((candidate) => {
    const tokens = candidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .split(/[^a-z0-9]+/).filter((token) => token.length > 2);
    return tokens.every((token) => !title.split(/[^a-z0-9]+/).includes(token));
  });
  const available = noOverlap.length ? noOverlap : options;
  return available[hashIndex(videoId, available.length)];
}

async function productionApi(action, payload = {}) {
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success !== true) {
    throw new Error("Production API " + action + " HTTP " + response.status + ": " + (data.error || "resposta inválida"));
  }
  return data;
}

async function getAccessToken() {
  const auth = await productionApi("youtubeAccessToken");
  if (auth.credentialSource !== "vercel-production" || !auth.accessToken) {
    throw new Error("OAuth Production do YouTube não foi confirmado.");
  }
  return String(auth.accessToken);
}

async function fetchYouTubeSnippets(videoIds, initialAccessToken) {
  const found = new Map();
  let accessToken = initialAccessToken;
  for (let start = 0; start < videoIds.length; start += 50) {
    const ids = videoIds.slice(start, start + 50);
    let response;
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet,status");
      url.searchParams.set("id", ids.join(","));
      response = await fetch(url, {
        headers: { Authorization: "Bearer " + accessToken },
        signal: AbortSignal.timeout(30000),
      });
      data = await response.json().catch(() => ({}));
      if (response.status === 401 && attempt === 0) {
        console.warn("[thumbnail] access token expirou durante videos.list; renovando OAuth Production.");
        accessToken = await getAccessToken();
        continue;
      }
      break;
    }
    if (!response?.ok) {
      throw new Error("YouTube videos.list HTTP " + response?.status + ": " +
        String(data?.error?.message || "falha ao ler metadados").slice(0, 500));
    }
    for (const video of data.items || []) found.set(String(video.id), video);
  }
  return { found, accessToken };
}

async function downloadReferenceImage(url) {
  if (!/^https:\/\//i.test(String(url || ""))) throw new Error("Imagem real do produto ausente ou não HTTPS.");
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), redirect: "follow" });
  if (!response.ok) throw new Error("Imagem de referência HTTP " + response.status);
  const mimeType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("Tipo de imagem de referência não suportado: " + (mimeType || "desconhecido"));
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new Error("Imagem de produto vazia ou maior que 12 MB.");
  return { buffer, mimeType };
}


async function composeThumbnail(backgroundBuffer, outputPath, hook, productTitle) {
  const inputPath = outputPath.replace(/\.jpg$/i, "-background.png");
  await fs.writeFile(inputPath, backgroundBuffer);
  try {
    await execFileAsync("python", [
      path.join(ROOT, "video", "scripts", "compose-youtube-thumbnail.py"),
      "--input", inputPath,
      "--output", outputPath,
      "--hook", hook,
      "--product", String(productTitle || "").slice(0, 120),
    ], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  } finally {
    await fs.rm(inputPath, { force: true });
  }
  const result = await fs.readFile(outputPath);
  if (result.length < 20000 || result.length > 2 * 1024 * 1024) {
    throw new Error("Thumbnail final não passou no gate de tamanho: " + result.length + " bytes.");
  }
  return result;
}

async function uploadThumbnail(videoId, imageBuffer, initialAccessToken) {
  let accessToken = initialAccessToken;
  let response;
  let data;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const url = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set");
    url.searchParams.set("videoId", videoId);
    url.searchParams.set("uploadType", "media");
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "image/jpeg",
      },
      body: imageBuffer,
      signal: AbortSignal.timeout(60000),
    });
    data = await response.json().catch(() => ({}));
    if (response.status === 401 && attempt === 0) {
      console.warn("[thumbnail] access token expirou durante thumbnails.set; renovando OAuth Production.");
      accessToken = await getAccessToken();
      continue;
    }
    break;
  }
  if (!response?.ok) {
    throw new Error("YouTube thumbnails.set HTTP " + response?.status + ": " +
      String(data?.error?.message || "upload rejeitado").slice(0, 600));
  }
  const thumbnailUrl = data?.items?.[0]?.default?.url ||
    data?.items?.[0]?.medium?.url || data?.items?.[0]?.high?.url || "";
  if (!thumbnailUrl) throw new Error("YouTube não confirmou a URL da thumbnail após o upload.");
  return { thumbnailUrl: String(thumbnailUrl), accessToken };
}

function alreadyHasCustomThumbnail(mediaAssets) {
  return Array.isArray(mediaAssets) && mediaAssets.some((asset) =>
    asset?.type === "youtube_custom_thumbnail" && asset?.appliedAt
  );
}

async function main() {
  const startedAt = new Date().toISOString();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const report = {
    startedAt,
    renderer: "vetor-native-product-composition-v2",
    requested: MAX_VIDEOS,
    offset: START_OFFSET,
    force: FORCE,
    totalLongVideos: 0,
    generated: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };

  let accessToken = await getAccessToken();
  let offset = START_OFFSET;
  let remaining = MAX_VIDEOS;
  let total = null;

  while (remaining > 0) {
    const batchLimit = Math.min(50, remaining);
    const batch = await productionApi("longVideoThumbnailBatch", { offset, limit: batchLimit });
    if (total === null) {
      total = Number(batch.total || 0);
      report.totalLongVideos = total;
      console.log("[thumbnail] long_form_queue_records=" + total);
    }
    const videos = Array.isArray(batch.videos) ? batch.videos : [];
    if (!videos.length) break;

    const ids = videos.map((video) => String(video.youtube_video_id || "")).filter(Boolean);
    const youtubeResult = await fetchYouTubeSnippets(ids, accessToken);
    const youtubeVideos = youtubeResult.found;
    accessToken = youtubeResult.accessToken;

    for (const video of videos) {
      const id = String(video.id || "");
      const videoId = String(video.youtube_video_id || "");
      const productTitle = String(video.product_title || "Produto em análise");
      const mediaAssets = Array.isArray(video.media_assets) ? video.media_assets : [];
      const existingMarker = mediaAssets.find((asset) => asset?.type === "youtube_custom_thumbnail");
      if (alreadyHasCustomThumbnail(mediaAssets) && !FORCE) {
        report.skipped += 1;
        report.results.push({ queueId: id, videoId, productTitle, status: "skipped", reason: "thumbnail já registrada" });
        continue;
      }

      try {
        const youtubeVideo = youtubeVideos.get(videoId);
        const videoTitle = String(youtubeVideo?.snippet?.title || productTitle);
        if (!youtubeVideo?.id || !youtubeVideo?.snippet) {
          throw new Error("Vídeo não encontrado no canal autenticado do YouTube.");
        }
        if (!video.product_image_url) throw new Error("A fila não tem imagem original validada do produto.");
        console.log("[thumbnail] composing " + videoId + " — " + productTitle.slice(0, 90));

        const reference = await downloadReferenceImage(video.product_image_url);
        const background = reference.buffer;
        const hook = thumbnailHook(productTitle, videoTitle, videoId);
        const outputPath = path.join(OUTPUT_DIR, videoId + ".jpg");
        const jpeg = await composeThumbnail(background, outputPath, hook, productTitle);
        report.generated += 1;

        const upload = await uploadThumbnail(videoId, jpeg, accessToken);
        const thumbnailUrl = upload.thumbnailUrl;
        accessToken = upload.accessToken;
        const marker = {
          type: "youtube_custom_thumbnail",
          url: thumbnailUrl,
          model: "vetor-native-product-composition-v2",
          hook,
          appliedAt: new Date().toISOString(),
        };
        const nextAssets = [
          ...mediaAssets.filter((asset) => asset?.type !== "youtube_custom_thumbnail"),
          marker,
        ];
        await productionApi("update", {
          id,
          updates: { media_assets: nextAssets },
        });
        report.applied += 1;
        report.results.push({
          queueId: id,
          videoId,
          productTitle,
          videoTitle,
          hook,
          status: "applied",
          thumbnailUrl,
          bytes: jpeg.length,
        });
        console.log("[thumbnail] applied " + videoId + " — \"" + hook + "\"");
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 1200);
        report.failed += 1;
        report.results.push({ queueId: id, videoId, productTitle, status: "failed", error: message });
        console.error("[thumbnail] failed " + videoId + ": " + message);
      }
    }

    offset += videos.length;
    remaining -= videos.length;
    if (videos.length < batchLimit) break;
  }

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log("[thumbnail] finished total=" + report.totalLongVideos +
    " generated=" + report.generated + " applied=" + report.applied +
    " skipped=" + report.skipped + " failed=" + report.failed);
  if (report.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(async (error) => {
    console.error("[thumbnail] fatal: " + String(error?.message || error));
    process.exitCode = 1;
  });
}
