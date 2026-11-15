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
const GOOGLE_AI_API_KEY = String(process.env.GOOGLE_AI_API_KEY || "").trim();
const MODEL = process.env.THUMBNAIL_IMAGE_MODEL || "gemini-3.1-flash-image";
const MAX_VIDEOS = Math.max(1, Math.min(500, Number(process.env.MAX_VIDEOS || 53)));
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

export function buildThumbnailPrompt(productTitle, category = "") {
  const title = String(productTitle || "produto").slice(0, 180);
  const categoryText = String(category || "tecnologia").slice(0, 80);
  return [
    "Create a premium, high-click-through YouTube thumbnail BACKGROUND image for a Brazilian product review channel.",
    "FORMAT: landscape 16:9, designed to be cropped and exported at exactly 1280x720.",
    "PRODUCT FIDELITY IS THE TOP PRIORITY: the attached reference is the exact product being reviewed. Reproduce that exact physical product, silhouette, proportions, color, button layout, camera arrangement, screen shape, ports, controls, material, and visible brand marks. Do not substitute a similar product, redesign it, invent extra accessories, or alter the product's identity.",
    "COMPOSITION: one dominant hero product, large and tack-sharp, occupying the RIGHT 58 percent of the frame. Give it premium commercial product-photography treatment, dramatic three-quarter angle where consistent with the reference, rich realistic material detail, strong rim lighting, dimensional depth, controlled reflections, and a restrained electric-blue light source.",
    "LEFT 42 percent: clean dark midnight-navy negative space with a subtle blue gradient and very low visual detail. This area must remain empty for a separately typeset headline. Keep the product away from the left text-safe area.",
    "ART DIRECTION: bold, modern Brazilian tech-review channel; cinematic studio lighting; deep navy #080C14, electric blue #1428A0 and vivid blue accents; energetic but premium, crisp subject separation, rich contrast that remains clear on a phone-sized feed.",
    "BACKGROUND: visually interesting layered studio environment, subtle radial glow and depth, never cluttered. No collage, no split panels, no extra products, no people, no hands.",
    "STRICTLY NO TEXT OR GRAPHICS: no words, letters, numbers, captions, logos, watermarks, fake interface elements, badges, stars, arrows, or price tags anywhere. We add the headline and channel branding afterward with clean typography.",
    "The item is " + title + ". Product category: " + categoryText + ". Use the attached image as the visual source of truth."
  ].join(" ");
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
  await productionApi("youtubeOAuthCheck");
  const auth = await productionApi("youtubeAccessToken");
  if (auth.credentialSource !== "vercel-production" || !auth.accessToken) {
    throw new Error("OAuth Production do YouTube não foi confirmado.");
  }
  return String(auth.accessToken);
}

async function fetchYouTubeSnippets(videoIds, accessToken) {
  const found = new Map();
  for (let start = 0; start < videoIds.length; start += 50) {
    const ids = videoIds.slice(start, start + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,status");
    url.searchParams.set("id", ids.join(","));
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + accessToken },
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error("YouTube videos.list HTTP " + response.status + ": " +
        String(data?.error?.message || "falha ao ler metadados").slice(0, 500));
    }
    for (const video of data.items || []) found.set(String(video.id), video);
  }
  return found;
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

async function generateBackground(productTitle, category, reference) {
  if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY ausente nos secrets do GitHub.");
  const prompt = buildThumbnailPrompt(productTitle, category);
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(MODEL) + ":generateContent";
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": GOOGLE_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: reference.mimeType, data: reference.buffer.toString("base64") } },
          ],
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
        },
      }),
      signal: AbortSignal.timeout(180000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = String(payload?.error?.message || "falha na geração de imagem").slice(0, 700);
      lastError = new Error("Gemini image HTTP " + response.status + ": " + message);
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) throw lastError;
      const retryAfter = Number(response.headers.get("retry-after") || 0);
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : attempt * 15000;
      console.warn("[thumbnail] Gemini temporariamente indisponível; retry " + attempt + "/3 em " + waitMs + "ms.");
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const parts = payload?.candidates?.[0]?.content?.parts || [];
    const image = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);
    const base64 = image?.inlineData?.data || image?.inline_data?.data;
    if (!base64) {
      const blockReason = payload?.promptFeedback?.blockReason || payload?.candidates?.[0]?.finishReason || "imagem ausente";
      throw new Error("Gemini não retornou imagem para a thumbnail: " + String(blockReason));
    }
    return Buffer.from(base64, "base64");
  }
  throw lastError || new Error("Falha desconhecida na geração da thumbnail.");
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

async function uploadThumbnail(videoId, imageBuffer, accessToken) {
  const url = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("uploadType", "media");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "image/jpeg",
    },
    body: imageBuffer,
    signal: AbortSignal.timeout(60000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error("YouTube thumbnails.set HTTP " + response.status + ": " +
      String(data?.error?.message || "upload rejeitado").slice(0, 600));
  }
  const thumbnailUrl = data?.items?.[0]?.default?.url ||
    data?.items?.[0]?.medium?.url || data?.items?.[0]?.high?.url || "";
  if (!thumbnailUrl) throw new Error("YouTube não confirmou a URL da thumbnail após o upload.");
  return String(thumbnailUrl);
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
    model: MODEL,
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

  const accessToken = await getAccessToken();
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
    const youtubeVideos = await fetchYouTubeSnippets(ids, accessToken);

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
        console.log("[thumbnail] generating " + videoId + " — " + productTitle.slice(0, 90));

        const reference = await downloadReferenceImage(video.product_image_url);
        const background = await generateBackground(productTitle, video.product_category, reference);
        const hook = thumbnailHook(productTitle, videoTitle, videoId);
        const outputPath = path.join(OUTPUT_DIR, videoId + ".jpg");
        const jpeg = await composeThumbnail(background, outputPath, hook, productTitle);
        report.generated += 1;

        const thumbnailUrl = await uploadThumbnail(videoId, jpeg, accessToken);
        const marker = {
          type: "youtube_custom_thumbnail",
          url: thumbnailUrl,
          model: MODEL,
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
