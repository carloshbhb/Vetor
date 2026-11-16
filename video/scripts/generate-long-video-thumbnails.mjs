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
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY || "").trim();
const IMAGE_MODEL = String(process.env.THUMBNAIL_IMAGE_MODEL || "openai/gpt-image-2.5-flare").trim();
const IMAGE_API_URL = "https://openrouter.ai/api/v1/images";
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

async function fetchYouTubeVideos(videoIds, initialAccessToken, parts = "snippet,status") {
  const found = new Map();
  let accessToken = initialAccessToken;
  for (let start = 0; start < videoIds.length; start += 50) {
    const ids = videoIds.slice(start, start + 50);
    let response;
    let data;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", parts);
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


function backgroundPrompt(productTitle, videoTitle, hook, videoId) {
  const title = String(productTitle || "produto de tecnologia").replace(/\s+/g, " ").trim().slice(0, 115);
  const video = String(videoTitle || "").replace(/\s+/g, " ").trim().slice(0, 110);
  const normalized = (title + " " + video).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let environment = "luxury technology product studio with an elegant reflective display stage";
  if (/fone|headphone|earbud|microfone|audio|som|caixa de som|qcy|jbl/.test(normalized)) {
    environment = "premium sound studio, acoustic architectural textures, subtle waveform-inspired light trails, professional recording atmosphere";
  } else if (/notebook|laptop|mouse|teclado|playstation|xbox|controle|game|console/.test(normalized)) {
    environment = "premium gaming and workstation studio, cinematic desk lighting, refined blue edge lights, subtle performance-inspired visual energy";
  } else if (/tablet|ipad/.test(normalized)) {
    environment = "minimal premium mobile-tech studio, glass architecture, layered light planes and a refined display pedestal";
  } else if (/smartwatch|watch|relogio|pulseira|band|fit3/.test(normalized)) {
    environment = "modern active-lifestyle technology studio, sleek kinetic light ribbons, premium dark reflective surfaces";
  } else if (/tv|televis|projetor|cinema/.test(normalized)) {
    environment = "cinematic home-theater environment, deep atmospheric blue light, elegant architectural surfaces, soft projected light";
  } else if (/camera|seguranca|sensor|tapo|intelbras/.test(normalized)) {
    environment = "premium smart-home and security technology environment, modern architectural lines, controlled blue accent lighting";
  } else if (/esteira|fitness|academia|sport/.test(normalized)) {
    environment = "premium modern fitness studio, dramatic directional lighting, dark architectural surfaces and subtle electric-blue accents";
  } else if (/perfume|fragrance|rabanne|rayhaan/.test(normalized)) {
    environment = "luxury fragrance campaign set, elegant dark stone, soft metallic highlights and cinematic blue-gold lighting";
  } else if (/mala|viagem|bagagem/.test(normalized)) {
    environment = "premium travel editorial set, modern airport lounge architecture, refined reflective surfaces and cool cinematic lighting";
  }

  return [
    "Create one publish-ready visual BACKGROUND PLATE for a premium Brazilian technology-review YouTube thumbnail.",
    "Landscape 16:9 composition, cinematic commercial photography, high-end product advertising art direction.",
    "The product being reviewed is: " + title + ". Video context: " + (video || title) + ".",
    "Build the environment around this product category: " + environment + ".",
    "CRITICAL LAYOUT: keep the LEFT 55 percent very dark, clean, low-detail negative space for bold white and electric-blue headline typography that will be added later.",
    "On the RIGHT half, create a luminous but uncluttered presentation zone with an empty glossy pedestal / architectural light stage where a real product photo will be placed later.",
    "Color system: midnight navy, near-black, cobalt blue and restrained electric-blue highlights; controlled bloom, volumetric rays, elegant reflections, deep contrast and subtle depth.",
    "No product, no device, no object, no people, no hands, no packaging, no silhouettes, no logos, no brand marks, no text, no letters, no numbers, no UI, no watermarks.",
    "Do not write or render the hook text: " + String(hook || "") + ". The final typography is composited separately.",
    "No collage, no split panels, no borders, no noisy cyberpunk clutter. Strong readable composition at small YouTube thumbnail size."
  ].join(" ");
}

async function generateAiBackground(productTitle, videoTitle, hook, videoId) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY ausente no GitHub Actions.");
  const prompt = backgroundPrompt(productTitle, videoTitle, hook, videoId);
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(IMAGE_API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + OPENROUTER_API_KEY,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-Title": "Vetor Blog YouTube Thumbnail Pipeline",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        aspect_ratio: "16:9",
        quality: "medium",
        output_format: "jpeg",
      }),
      signal: AbortSignal.timeout(180000),
    });
    const bodyText = await response.text();
    if (!response.ok) {
      lastError = "OpenRouter image API HTTP " + response.status + ": " + bodyText.slice(0, 1000);
      if (![408, 409, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw new Error(lastError);
      }
      await new Promise((resolve) => setTimeout(resolve, 2500 * (attempt + 1)));
      continue;
    }
    let result;
    try { result = JSON.parse(bodyText); } catch {
      throw new Error("OpenRouter image API retornou JSON inválido.");
    }
    const image = Array.isArray(result.data) ? result.data[0] : null;
    if (!image?.b64_json) {
      throw new Error("OpenRouter não retornou data[0].b64_json: " + JSON.stringify(result).slice(0, 700));
    }
    const buffer = Buffer.from(image.b64_json, "base64");
    if (buffer.length < 12000 || buffer.length > 20 * 1024 * 1024) {
      throw new Error("Imagem gerada vazia ou fora do limite: " + buffer.length + " bytes.");
    }
    return {
      buffer,
      mediaType: String(image.media_type || "image/jpeg"),
      cost: Number.isFinite(Number(result.usage?.cost)) ? Number(result.usage.cost) : null,
      prompt,
    };
  }
  throw new Error(lastError || "Falha na geração de background por IA.");
}

async function composeThumbnail(backgroundBuffer, productBuffer, productMimeType, outputPath, hook, productTitle) {
  const backgroundPath = outputPath.replace(/\.jpg$/i, "-ai-background.jpg");
  const extension = productMimeType === "image/png" ? "png" : productMimeType === "image/webp" ? "webp" : "jpg";
  const productPath = outputPath.replace(/\.jpg$/i, "-product." + extension);
  await fs.writeFile(backgroundPath, backgroundBuffer);
  await fs.writeFile(productPath, productBuffer);
  try {
    await execFileAsync("python", [
      path.join(ROOT, "video", "scripts", "compose-youtube-thumbnail.py"),
      "--input", productPath,
      "--background", backgroundPath,
      "--output", outputPath,
      "--hook", hook,
      "--product", String(productTitle || "").slice(0, 120),
    ], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  } finally {
    await fs.rm(backgroundPath, { force: true });
    await fs.rm(productPath, { force: true });
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

async function probeHostedVideo(videoUrl) {
  const rawUrl = String(videoUrl || "");
  let parsedUrl;
  try { parsedUrl = new URL(rawUrl); } catch { return null; }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "www.vetor.blog") return null;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
      "-of", "json",
      rawUrl,
    ], { timeout: 45000, maxBuffer: 1024 * 1024 });
    const probe = JSON.parse(stdout || "{}");
    const stream = Array.isArray(probe.streams) ? probe.streams[0] : null;
    if (!stream) return null;
    let width = Number(stream.width || 0);
    let height = Number(stream.height || 0);
    const sideRotation = Number(stream.side_data_list?.find((item) => Number.isFinite(Number(item.rotation)))?.rotation);
    const tagRotation = Number(stream.tags?.rotate || 0);
    const rotation = Number.isFinite(sideRotation) && sideRotation !== 0 ? sideRotation : tagRotation;
    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) [width, height] = [height, width];
    if (!(width > 0 && height > 0)) return null;
    return { width, height, rotation: rotation || 0, method: "hosted-mp4-ffprobe" };
  } catch (error) {
    const message = String(error?.message || error).slice(0, 180);
    console.warn("[thumbnail] ffprobe could not inspect hosted MP4: " + message);
    return null;
  }
}

async function applyThumbnailBatch(videos, youtubeVideos, initialAccessToken, report) {
  let accessToken = initialAccessToken;
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
        const hook = thumbnailHook(productTitle, videoTitle, videoId);
        const aiBackground = await generateAiBackground(productTitle, videoTitle, hook, videoId);
        const outputPath = path.join(OUTPUT_DIR, videoId + ".jpg");
        const jpeg = await composeThumbnail(
          aiBackground.buffer,
          reference.buffer,
          reference.mimeType,
          outputPath,
          hook,
          productTitle
        );
        report.generated += 1;
        if (aiBackground.cost !== null) report.estimatedImageCost += aiBackground.cost;

        const upload = await uploadThumbnail(videoId, jpeg, accessToken);
        const thumbnailUrl = upload.thumbnailUrl;
        accessToken = upload.accessToken;
        const marker = {
          type: "youtube_custom_thumbnail",
          url: thumbnailUrl,
          model: IMAGE_MODEL + "+vetor-product-composition-v3",
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
  return accessToken;
}

async function main() {
  const startedAt = new Date().toISOString();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const report = {
    startedAt,
    renderer: "openai-gpt-image-2.5-flare+vetor-product-composition-v3",
    imageModel: IMAGE_MODEL,
    estimatedImageCost: 0,
    requested: MAX_VIDEOS,
    offset: START_OFFSET,
    force: FORCE,
    totalLongVideos: 0,
    explicitLongVideos: 0,
    unclassifiedCandidates: 0,
    legacyLandscapeVideos: 0,
    legacyFfprobeSuccess: 0,
    legacySkipped: 0,
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
      report.explicitLongVideos = total;
      console.log("[thumbnail] long_form_queue_records=" + total);
    }
    const videos = Array.isArray(batch.videos) ? batch.videos : [];
    if (!videos.length) break;

    const ids = videos.map((video) => String(video.youtube_video_id || "")).filter(Boolean);
    const youtubeResult = await fetchYouTubeVideos(ids, accessToken, "snippet,status");
    accessToken = await applyThumbnailBatch(videos, youtubeResult.found, youtubeResult.accessToken, report);

    offset += videos.length;
    remaining -= videos.length;
    if (videos.length < batchLimit) break;
  }

  // Older published videos predate publication_format markers. Inspect the actual
  // uploaded stream dimensions and process only verified landscape videos.
  let legacyOffset = 0;
  let legacyTotal = null;
  while (remaining > 0) {
    const legacyLimit = Math.min(50, remaining);
    const legacyBatch = await productionApi("unclassifiedCompletedVideoThumbnailBatch", {
      offset: legacyOffset,
      limit: legacyLimit,
    });
    if (legacyTotal === null) {
      legacyTotal = Number(legacyBatch.total || 0);
      report.unclassifiedCandidates = legacyTotal;
      console.log("[thumbnail] legacy_unclassified_candidates=" + legacyTotal);
    }
    const legacyVideos = Array.isArray(legacyBatch.videos) ? legacyBatch.videos : [];
    if (!legacyVideos.length) break;

    const ids = legacyVideos.map((video) => String(video.youtube_video_id || "")).filter(Boolean);
    const details = await fetchYouTubeVideos(ids, accessToken, "snippet,status,fileDetails,processingDetails");
    accessToken = details.accessToken;
    const confirmedLandscape = [];

    for (const video of legacyVideos) {
      const videoId = String(video.youtube_video_id || "");
      const youtubeVideo = details.found.get(videoId);
      const snippet = youtubeVideo?.snippet || {};
      const titleAndTags = [snippet.title || "", ...(Array.isArray(snippet.tags) ? snippet.tags : [])].join(" ");
      const explicitlyShort = /#shorts?\b|youtube shorts/i.test(titleAndTags);
      const streams = Array.isArray(youtubeVideo?.fileDetails?.videoStreams)
        ? youtubeVideo.fileDetails.videoStreams
        : [];
      const stream = streams
        .filter((item) => Number(item?.widthPixels) > 0 && Number(item?.heightPixels) > 0)
        .sort((a, b) =>
          (Number(b.widthPixels) * Number(b.heightPixels)) -
          (Number(a.widthPixels) * Number(a.heightPixels))
        )[0];

      let width = Number(stream?.widthPixels || 0);
      let height = Number(stream?.heightPixels || 0);
      let dimensionMethod = stream ? "youtube-fileDetails" : "";
      if (["clockwise", "counterClockwise"].includes(String(stream?.rotation || ""))) {
        [width, height] = [height, width];
      }

      if (!stream && video.video_url) {
        const hostedProbe = await probeHostedVideo(video.video_url);
        if (hostedProbe) {
          width = hostedProbe.width;
          height = hostedProbe.height;
          dimensionMethod = hostedProbe.method;
          report.legacyFfprobeSuccess += 1;
        }
      }

      if (!youtubeVideo?.id || explicitlyShort || !(width > 0 && height > 0) || width <= height) {
        report.legacySkipped += 1;
        report.skipped += 1;
        report.results.push({
          queueId: String(video.id || ""),
          videoId,
          productTitle: String(video.product_title || "Produto em análise"),
          status: "skipped",
          reason: explicitlyShort
            ? "marcado como YouTube Shorts"
            : !stream
              ? "resolução original indisponível para confirmar formato"
              : "arquivo vertical ou quadrado; preservado sem alteração",
          dimensions: width > 0 && height > 0 ? { width, height } : null,
        });
        continue;
      }

      report.legacyLandscapeVideos += 1;
      confirmedLandscape.push(video);
      console.log("[thumbnail] legacy landscape confirmed " + videoId + " (" + width + "x" + height + ") via " + dimensionMethod);
    }

    report.totalLongVideos = report.explicitLongVideos + report.legacyLandscapeVideos;
    if (confirmedLandscape.length) {
      accessToken = await applyThumbnailBatch(confirmedLandscape, details.found, accessToken, report);
    }

    legacyOffset += legacyVideos.length;
    remaining -= legacyVideos.length;
    if (legacyVideos.length < legacyLimit) break;
  }

  report.totalLongVideos = report.explicitLongVideos + report.legacyLandscapeVideos;

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
