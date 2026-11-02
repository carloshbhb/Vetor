import { execFileSync, execSync, spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { buildCaptionEntries, buildCtaComment, buildVideoDescription, buildVideoTitle, resolveVideoFormat } from './video-format.mjs';

const SITE_URL = (process.env.VETOR_SITE_URL || 'https://www.vetor.blog').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET;

async function verifyYouTubeOAuth() {
  const result = await queueApi("youtubeOAuthCheck");
  if (result.authorized !== true || result.credentialSource !== "vercel-production") {
    throw new Error("YouTube OAuth Production não foi confirmado; nenhum item da fila foi reivindicado.");
  }
  console.log("[YOUTUBE_OAUTH] Credenciais Production confirmadas no Vercel.");
}

async function createYouTubeClient() {
  const result = await queueApi("youtubeAccessToken");
  if (typeof result.accessToken !== "string" || !result.accessToken) {
    throw new Error("API Production não retornou access token válido do YouTube.");
  }
  const { google } = await import("googleapis");
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: result.accessToken });
  return google.youtube({ version: "v3", auth: oauth2Client });
}

function extractYouTubeVideoId(video) {
  if (typeof video.youtube_video_id === 'string' && video.youtube_video_id.trim()) {
    return video.youtube_video_id.trim();
  }
  const value = typeof video.youtube_url === 'string' ? video.youtube_url : '';
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

async function insertCtaComment(youtube, videoId, text) {
  const response = await youtube.commentThreads.insert({
    part: ['snippet'],
    requestBody: {
      snippet: {
        videoId,
        topLevelComment: { snippet: { textOriginal: text } },
      },
    },
  });
  const commentId = response.data.id || response.data.snippet?.topLevelComment?.id || '';
  if (!commentId) throw new Error('YouTube não retornou ID para o comentário CTA.');
  return commentId;
}

async function queueApi(action, payload = {}) {
  if (!CRON_SECRET) throw new Error('CRON_SECRET ausente: o worker precisa acessar a fila autenticada do Vetor.');
  const response = await fetch(`${SITE_URL}/api/cron/video-queue-worker/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true) {
    throw new Error(`Queue API failure (HTTP ${response.status}): ${result.error || 'invalid response'}`);
  }
  return result;
}

async function getPendingVideos(
  limit = Number(process.env.MAX_VIDEOS || 1),
  manualOverride = process.env.MANUAL_RUN === 'true'
) {
  const result = await queueApi('next', { limit, manualOverride });
  return Array.isArray(result.videos) ? result.videos : [];
}

async function getVideoById(id) {
  const result = await queueApi('get', { id });
  return result.video || null;
}

async function updateVideoStatus(id, updates) {
  await queueApi('update', { id, updates });
}

async function retryPendingCtaComments() {
  let pending = [];
  try {
    const response = await queueApi('pendingComments', { limit: 5 });
    pending = Array.isArray(response.videos) ? response.videos : [];
  } catch (error) {
    console.warn('[CTA_COMMENT_RETRY] Não foi possível consultar comentários pendentes: ' +
      (error instanceof Error ? error.message : String(error)));
    return;
  }
  if (pending.length === 0) return;

  let youtube;
  try {
    youtube = await createYouTubeClient();
  } catch (error) {
    console.warn('[CTA_COMMENT_RETRY] Não foi possível autenticar para corrigir comentários pendentes: ' +
      (error instanceof Error ? error.message : String(error)));
    return;
  }

  for (const video of pending) {
    const videoId = extractYouTubeVideoId(video);
    const purchaseUrl = String(video.shortened_affiliate_url || video.affiliate_url || '').trim();
    const reviewUrl = String(video.review_url || '').trim();
    if (!videoId || !/^https?:\/\//i.test(purchaseUrl) || !/^https:\/\//i.test(reviewUrl)) {
      console.warn('[CTA_COMMENT_PENDING] queue_id=' + video.id + ' faltam ID do YouTube ou links válidos.');
      continue;
    }
    try {
      const commentId = await insertCtaComment(youtube, videoId, buildCtaComment({
        productTitle: String(video.product_title || 'este produto'),
        purchaseUrl,
        reviewUrl,
        format: resolveVideoFormat(video.media_assets),
      }));
      await updateVideoStatus(video.id, { error_message: null });
      console.log('[CTA_COMMENT_RETRIED] queue_id=' + video.id + ' comment_id=' + commentId);
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 3000);
      try {
        await updateVideoStatus(video.id, { error_message: '[CTA_COMMENT_PENDING] ' + message });
      } catch (updateError) {
        console.warn('[CTA_COMMENT_RETRY] Não foi possível salvar diagnóstico: ' +
          (updateError instanceof Error ? updateError.message : String(updateError)));
      }
      console.warn('[CTA_COMMENT_PENDING] queue_id=' + video.id + ' reason=' + message.slice(0, 700));
    }
  }
}

function getAudioDuration(filePath, provider) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1000) {
    throw new Error(provider + " não produziu um arquivo de áudio utilizável.");
  }
  const durationStr = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf-8', timeout: 10000 }
  ).trim();
  const duration = parseFloat(durationStr);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('ffprobe não conseguiu validar a duração de ' + provider + '.');
  return duration;
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function generateVoiceover(text, outputPath) {
  // Única voz de narração do Vetor: Edge TTS neural pt-BR-FranciscaNeural.
  const voice = 'pt-BR-FranciscaNeural';
  const tempFile = outputPath.replace(/\.mp3$/i, '-temp.mp3');
  const textFile = outputPath.replace(/\.mp3$/i, '-text.txt');
  const safeText = String(text || '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!safeText) throw new Error('[TTS] Não é possível gerar áudio de um roteiro vazio.');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(textFile, safeText, 'utf8');
  for (const stale of [tempFile, outputPath]) if (fs.existsSync(stale)) fs.unlinkSync(stale);

  try {
    execFileSync('edge-tts', ['--voice', voice, '--file', textFile, '--write-media', tempFile], {
      stdio: 'pipe',
      timeout: 120000,
    });
    if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size < 1000) {
      throw new Error('Edge TTS não produziu um MP3 utilizável.');
    }
    const duration = getAudioDuration(tempFile, 'Edge TTS neural');
    fs.renameSync(tempFile, outputPath);
    console.log('   [TTS] Provider=Edge TTS neural; voz=' + voice + '; duração=' + duration.toFixed(2) + 's.');
    return duration;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stderr = error && typeof error === 'object' && 'stderr' in error
      ? String(error.stderr || '').replace(/\s+/g, ' ').slice(-500) : '';
    throw new Error('[TTS] A única voz configurada (' + voice + ') falhou: ' + (stderr || message).slice(0, 700));
  } finally {
    for (const file of [textFile, tempFile]) if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}
async function combineAudioFiles(audioFiles, outputPath) {
  const existingFiles = audioFiles.filter(f => fs.existsSync(f));
  if (existingFiles.length === 0) {
    console.error('   ⚠️ No audio files to combine');
    return;
  }
  if (existingFiles.length === 1) {
    fs.copyFileSync(existingFiles[0], outputPath);
    return;
  }

  const concatList = audioFiles.map(f => `file '${f}'`).join('\n');
  const listPath = outputPath.replace('.mp3', '-list.txt');
  fs.writeFileSync(listPath, concatList);

  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`,
      { stdio: 'pipe', timeout: 60000 }
    );
  } finally {
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
  }
}

async function renderWithRemotion(videoData, outputPath) {
  const outputDir = path.dirname(outputPath);
  const dataPath = path.join(outputDir, 'remotion-input.json');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(videoData, null, 2));

  try {
    // Remove a saída de mesmo ID e exclui resultados antigos da lista de candidatos.
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    const renderedDir = path.resolve('video/out');
    const existingMp4 = new Set(
      fs.readdirSync(renderedDir).filter((name) => name.endsWith('.mp4'))
    );
    const renderStartedAt = Date.now();

    // Capturar stdout/stderr no erro permite registrar a causa real do Remotion.
    const tsxEntrypoint = path.resolve('video/node_modules/tsx/dist/cli.mjs');
    if (!fs.existsSync(tsxEntrypoint)) {
      throw new Error('tsx não encontrado em video/node_modules; execute npm ci no diretório video antes de renderizar.');
    }
    const videoProjectRoot = path.resolve(process.cwd(), 'video');
    console.log('   [Remotion] Executando no diretório do projeto para reutilizar o Chrome previamente instalado.');
    const renderOutput = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [tsxEntrypoint, 'src/utils/renderVideo.ts', String(videoData.type || 'review'), path.resolve(dataPath)],
        {
          cwd: videoProjectRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
          signal: AbortSignal.timeout(2700000),
        }
      );
      let outputTail = '';
      const collect = (target, chunk) => {
        const value = chunk.toString();
        target.write(value);
        outputTail = (outputTail + value).slice(-24000);
      };
      child.stdout.on('data', (chunk) => collect(process.stdout, chunk));
      child.stderr.on('data', (chunk) => collect(process.stderr, chunk));
      child.once('error', (error) => reject(new Error('Não foi possível iniciar o processo Remotion: ' + error.message)));
      child.once('close', (code, signal) => {
        if (code === 0) resolve(outputTail);
        else reject(new Error(
          'Processo Remotion encerrado (exit=' + code + ', signal=' + (signal || 'none') +
          '). Últimos logs:\\n' + outputTail
        ));
      });
    });
    if (String(renderOutput).trim()) {
      console.log('   [Remotion] Processo finalizado; logs transmitidos em tempo real.');
    }

    if (!fs.existsSync(renderedDir)) {
      throw new Error('Remotion finalizou sem criar o diretório de saída video/out.');
    }
    const candidates = fs.readdirSync(renderedDir)
      .filter((name) => name.endsWith('.mp4') && path.join(renderedDir, name) !== outputPath)
      .filter((name) => !existingMp4.has(name))
      .map((name) => ({
        path: path.join(renderedDir, name),
        mtime: fs.statSync(path.join(renderedDir, name)).mtimeMs,
      }))
      .filter((candidate) => candidate.mtime >= renderStartedAt - 1000)
      .sort((left, right) => right.mtime - left.mtime);

    if (!fs.existsSync(outputPath)) {
      if (candidates.length === 0) {
        throw new Error('Remotion terminou sem produzir um MP4 novo nesta execução.');
      }
      fs.renameSync(candidates[0].path, outputPath);
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      throw new Error('MP4 renderizado ausente ou pequeno demais.');
    }

    // Tamanho não prova integridade: confirme stream de vídeo, resolução e duração.
    const probeOutput = execFileSync(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height',
        '-of', 'json',
        outputPath,
      ],
      { encoding: 'utf8', stdio: 'pipe', timeout: 30000, maxBuffer: 1024 * 1024 }
    );
    const media = JSON.parse(probeOutput);
    const duration = Number(media.format?.duration);
    const videoStream = Array.isArray(media.streams)
      ? media.streams.find((stream) => stream.codec_type === 'video')
      : null;
    const width = Number(videoStream?.width || 0);
    const height = Number(videoStream?.height || 0);
    if (
      !Number.isFinite(duration) || duration <= 0 || !videoStream || !videoStream.codec_name ||
      width <= 0 || height <= 0 ||
      (videoData.type === "long" && width <= height) ||
      (videoData.type !== "long" && width >= height)
    ) {
      throw new Error('MP4 inválido: ffprobe não confirmou duração, stream e orientação compatível com o formato.');
    }
    console.log(
      '   [Remotion] MP4 validado pelo ffprobe: ' +
      duration.toFixed(2) + 's, ' + videoStream.width + 'x' + videoStream.height +
      ', codec=' + videoStream.codec_name + '.'
    );
  } finally {
    if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
  }
}

function runRemotionQualityGate(videoPath, captionEntries, videoFormat, videoId) {
  const safeId = safeVideoAssetId(videoId);
  const outputDir = path.dirname(videoPath);
  const beatsPath = path.join(outputDir, "video-" + safeId + "-beats.json");
  const framesDir = path.join(outputDir, "qa-" + safeId + "-frames");
  const channel = videoFormat === "long" ? "yt-landscape" : "yt-shorts";
  // The opening hook and final CTA are checked for safe-zone placement in the render,
  // while the timed scene captions are measured for reading speed and dead air.
  const captionList = Array.isArray(captionEntries) ? captionEntries : [];
  const beats = captionList.slice(1, -1)
    .map((entry) => ({
      start: Number(entry.start),
      end: Number(entry.end),
      text: String(entry.text || ""),
    }))
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end) && entry.end > entry.start && entry.text);
  fs.writeFileSync(beatsPath, JSON.stringify(beats, null, 2));

  const args = [
    "check", videoPath,
    "--beats", beatsPath,
    "--channel", channel,
    "--max-dead", "1",
    "--frames", framesDir,
    "--json",
  ];
  const options = {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 180000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    shell: process.platform === "win32",
  };

  let result = spawnSync(process.env.REMOTION_QA_BIN || "remotion-qa", args, options);
  if (result.error && result.error.code === "ENOENT") {
    result = spawnSync("npx", ["--yes", "remotion-qa@0.1.3", ...args], options);
  }
  if (result.error || result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .replace(/\s+/g, " ")
      .slice(-6500);
    throw new Error(
      "[VIDEO_QA_FAILED] " + channel + " rejeitou o render de " + videoId +
      ". O vídeo não será enviado ao YouTube. Diagnóstico: " +
      (output || (result.error ? result.error.message : "QA exit=" + result.status))
    );
  }

  console.log("[VIDEO_QA_PASS] queue_id=" + videoId + " channel=" + channel +
    " checks=caption-readability,dead-air,safe-zones");
  if (fs.existsSync(beatsPath)) fs.unlinkSync(beatsPath);
  if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
}

async function uploadToYouTube(videoPath, title, description, tags, commentText) {

  try {
    const youtube = await createYouTubeClient();

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags.slice(0, 30),
          categoryId: '28',
          defaultLanguage: 'pt',
          defaultAudioLanguage: 'pt',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('A API do YouTube não retornou ID para o vídeo enviado.');
    }

    // Confirma na API que o recurso existe e está público; não confiar apenas no upload request.
    let confirmedPublicVideo = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const listing = await youtube.videos.list({
        part: ['id', 'status'],
        id: [videoId],
      });
      confirmedPublicVideo = (listing.data.items || []).find(
        (item) => item.id === videoId && item.status?.privacyStatus === 'public'
      ) || null;
      if (confirmedPublicVideo) break;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!confirmedPublicVideo) {
      throw new Error(
        'Upload aceito, mas a API do YouTube não confirmou o vídeo ' + videoId +
        ' com privacyStatus=public após três consultas.'
      );
    }

    const videoUrl = 'https://youtube.com/watch?v=' + videoId;
    let commentId = null;
    let commentError = null;
    try {
      commentId = await insertCtaComment(youtube, videoId, commentText);
      console.log('[CTA_COMMENT_CONFIRMED] video_id=' + videoId + ' comment_id=' + commentId);
    } catch (error) {
      commentError = (error instanceof Error ? error.message : String(error)).slice(0, 3000);
      console.warn('[CTA_COMMENT_PENDING] video_id=' + videoId + ' reason=' + commentError.slice(0, 700));
    }
    console.log('   📤 YouTube confirmado como público: ' + videoUrl);
    return { videoId, videoUrl, commentId, commentError };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('   ❌ YouTube upload failed:', message);
    throw new Error(`YouTube upload failed: ${message}`);
  }
}

async function readResponseLimited(response, maxBytes) {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error("Arquivo remoto excedeu o limite permitido.");
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error("Arquivo remoto excedeu o limite permitido.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function safeVideoAssetId(value) {
  return String(value || "video").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "video";
}

async function downloadProductImage(sourceUrl, videoId, productTitle, options = {}) {
  const tempDir = path.resolve("video/public/tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const safeId = safeVideoAssetId(videoId);
  const suffix = String(options.suffix || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const allowFallback = options.allowFallback !== false;
  try {
    const parsed = new URL(String(sourceUrl || ""));
    const host = parsed.hostname.toLowerCase();
    const privateHost =
      host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
      host === "metadata.google.internal" || host === "169.254.169.254" ||
      host === "127.0.0.1" || host === "0.0.0.0" ||
      /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host);
    if (parsed.protocol !== "https:" || privateHost || parsed.username || parsed.password) {
      throw new Error("URL de imagem não HTTPS/pública.");
    }
    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "VetorBlog-VideoWorker/1.0", Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.5" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[type];
    if (!extension) throw new Error("Content-Type não suportado: " + type);
    if (Number(response.headers.get("content-length") || 0) > 10 * 1024 * 1024) throw new Error("Imagem acima de 10 MB.");
    const buffer = await readResponseLimited(response, 10 * 1024 * 1024);
    if (buffer.length < 1000) throw new Error("Imagem remota vazia.");
    const filename = "product-" + safeId + suffix + "." + extension;
    fs.writeFileSync(path.join(tempDir, filename), buffer);
    console.log("[MEDIA] Imagem " + (suffix ? "de galeria " : "principal ") + "baixada (" + buffer.length + " bytes).");
    return "tmp/" + filename;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!allowFallback) {
      console.warn("[MEDIA] Imagem de galeria ignorada: " + message.slice(0, 180));
      return null;
    }
    console.warn("[MEDIA] Imagem principal indisponível; gerado cartão visual local. " + message.slice(0, 180));
    const filename = "product-" + safeId + suffix + ".svg";
    const title = escapeXml(String(productTitle || "Produto").slice(0, 72));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d3155"/><stop offset="1" stop-color="#11141c"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="970" cy="120" r="260" fill="#55b9f2" opacity=".12"/><circle cx="120" cy="820" r="300" fill="#ff6848" opacity=".1"/><text x="600" y="410" text-anchor="middle" fill="#55b9f2" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="8">VETOR • REVIEW</text><text x="600" y="495" text-anchor="middle" fill="#f3f4f7" font-family="Arial,sans-serif" font-size="48" font-weight="700">' + title + '</text></svg>';
    fs.writeFileSync(path.join(tempDir, filename), svg, "utf8");
    return "tmp/" + filename;
  }
}

async function fetchPexelsBroll(scenes, category, videoId, videoFormat = "short") {
  const sceneList = Array.isArray(scenes) ? scenes : [];
  const alignedSources = Array(sceneList.length).fill("");
  const apiKey = (process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || "").trim();
  if (!apiKey) {
    console.warn("[BROLL] PEXELS_API_KEY ausente; sem B-roll externo.");
    return alignedSources;
  }

  const seenIds = new Set();
  const tempDir = path.resolve("video/public/tmp");
  fs.mkdirSync(tempDir, { recursive: true });
  const safeId = safeVideoAssetId(videoId);
  const orientation = videoFormat === "long" ? "landscape" : "portrait";
  let downloaded = 0;

  // Uma busca por cena, com teto de cinco clipes únicos por vídeo.
  for (let sceneIndex = 0; sceneIndex < sceneList.length && downloaded < 5; sceneIndex += 1) {
    const keywords = [...new Set((Array.isArray(sceneList[sceneIndex]?.brollKeywords)
      ? sceneList[sceneIndex].brollKeywords
      : []).map(value => String(value || "").trim()).filter(value => value.length >= 3))];
    if (!keywords.length) continue;

    const query = keywords.slice(0, 2).join(" ");
    try {
      const response = await fetch(
        "https://api.pexels.com/videos/search?query=" + encodeURIComponent(query) +
          "&per_page=8&orientation=" + orientation,
        { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(12000) }
      );
      if (!response.ok) {
        console.warn("[BROLL] Pexels HTTP " + response.status + " na cena " + (sceneIndex + 1));
        continue;
      }
      const payload = await response.json();
      const candidates = [];
      for (const item of (Array.isArray(payload.videos) ? payload.videos : [])) {
        if (!item || seenIds.has(String(item.id))) continue;
        const files = (Array.isArray(item.video_files) ? item.video_files : [])
          .filter(file => typeof file.link === "string" && file.link.startsWith("https://"))
          .sort((a, b) => {
            const aSize = Math.max(Number(a.width) || 0, Number(a.height) || 0);
            const bSize = Math.max(Number(b.width) || 0, Number(b.height) || 0);
            const aOrientation = orientation === "portrait"
              ? Number(Number(a.height) > Number(a.width))
              : Number(Number(a.width) > Number(a.height));
            const bOrientation = orientation === "portrait"
              ? Number(Number(b.height) > Number(b.width))
              : Number(Number(b.width) > Number(b.height));
            if (aOrientation !== bOrientation) return bOrientation - aOrientation;
            const aRank = aSize > 1280 ? 10000 + aSize : Math.abs(aSize - 1280);
            const bRank = bSize > 1280 ? 10000 + bSize : Math.abs(bSize - 1280);
            return aRank - bRank;
          });
        if (files.length) candidates.push({ id: String(item.id), url: files[0].link });
      }
      if (!candidates.length) continue;

      const selected = candidates[0];
      const clip = await fetch(selected.url, {
        headers: { "User-Agent": "VetorBlog-VideoWorker/1.0", Accept: "video/mp4,*/*;q=0.5" },
        signal: AbortSignal.timeout(16000),
      });
      if (!clip.ok) throw new Error("download HTTP " + clip.status);
      const contentType = (clip.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("video/") && !selected.url.toLowerCase().includes(".mp4")) {
        throw new Error("Resposta não é vídeo.");
      }
      if (Number(clip.headers.get("content-length") || 0) > 12 * 1024 * 1024) {
        throw new Error("Clip acima de 12 MB.");
      }
      const buffer = await readResponseLimited(clip, 12 * 1024 * 1024);
      if (buffer.length < 20000) throw new Error("Clip incompleto.");
      const filename = "broll-" + safeId + "-scene-" + sceneIndex + ".mp4";
      fs.writeFileSync(path.join(tempDir, filename), buffer);
      alignedSources[sceneIndex] = "tmp/" + filename;
      seenIds.add(selected.id);
      downloaded += 1;
      console.log("[BROLL] Cena " + (sceneIndex + 1) + " associada a clipe único para: " + query);
    } catch (error) {
      console.warn("[BROLL] Cena " + (sceneIndex + 1) + " sem clipe de apoio: " +
        (error instanceof Error ? error.message : String(error)).slice(0, 180));
    }
  }
  console.log("[BROLL] " + downloaded + " clipes únicos associados a cenas; limite=5.");
  return alignedSources;
}
async function processVideo(video) {
  console.log(`\n🎬 Processando: ${video.product_title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Hook: ${video.script_hook}`);

  await updateVideoStatus(video.id, { status: 'processing', started_at: new Date().toISOString(), error_message: null });
  const publicAudioPath = path.resolve('video/public/tmp', `video-${video.id}.mp3`);
  const videoFormat = resolveVideoFormat(video.media_assets);
  let temporaryVisualAssets = [];
  let processingStage = 'roteiro';
  console.log("   Formato: " + (videoFormat === "long" ? "vídeo longo 16:9" : "Short vertical"));

  try {
    let script = null;
    let productImageUrls = [];
    const siteUrl = (process.env.VETOR_SITE_URL || 'https://www.vetor.blog').replace(/\/$/, '');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) throw new Error('CRON_SECRET ausente: não é possível solicitar o roteiro de produção.');
    try {
      const response = await fetch(siteUrl + '/api/cron/generate-video-script/', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + cronSecret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: video.id }),
        signal: AbortSignal.timeout(55000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.script) {
        throw new Error('Falha na preparação do vídeo (HTTP ' + response.status + '): ' + (payload.error || 'resposta inválida'));
      }
      script = payload.script;
      productImageUrls = Array.isArray(payload.productImages) ? payload.productImages : [];
      if (!Array.isArray(script.scenes) || script.scenes.length < 5) {
        throw new Error('Roteiro retornado pela API não passou pela validação mínima de cenas.');
      }
      console.log("[MEDIA] Galeria vinculada ao produto: " + productImageUrls.length + " imagem(ns).");
    } catch (error) {
      // Use an already validated script and its stored gallery when the API is temporarily unavailable.
      try {
        const cached = JSON.parse(String(video.script_text || ""));
        if (cached?.generationVersion === 3 && cached.videoFormat === videoFormat &&
            Array.isArray(cached.scenes) && cached.scenes.length >= 6) {
          script = cached;
          productImageUrls = (Array.isArray(video.media_assets) ? video.media_assets : [])
            .filter(asset => asset?.type === "product-gallery-image" && typeof asset.url === "string")
            .map(asset => asset.url);
          console.warn("[MEDIA] API indisponível; usando roteiro validado e galeria persistida.");
        } else {
          throw error;
        }
      } catch {
        throw error;
      }
    }

    processingStage = 'narração';
    console.log('   [1/4] Gerando uma narração contínua para manter ritmo e entonação naturais...');
    console.log('[TTS] Voz única=Edge TTS neural pt-BR-FranciscaNeural.');
    const audioDir = path.resolve(`/tmp/video-${video.id}`);
    fs.mkdirSync(audioDir, { recursive: true });
    const combinedAudioPath = path.join(audioDir, 'combined.mp3');
    const narrationSegments = [
      { kind: 'hook', text: String(script.hook || '').trim() },
      ...script.scenes.map((scene) => ({ kind: 'scene', scene, text: String(scene.text || '').trim() })),
      { kind: 'cta', text: String(script.callToAction || '').trim() },
    ];
    const completeNarration = narrationSegments.map((segment) => segment.text).filter(Boolean).join('\n\n');
    const totalDuration = await generateVoiceover(completeNarration, combinedAudioPath);
    if (!fs.existsSync(combinedAudioPath) || fs.statSync(combinedAudioPath).size < 1000) {
      throw new Error('A narração contínua não foi produzida corretamente.');
    }
    fs.mkdirSync(path.dirname(publicAudioPath), { recursive: true });
    fs.copyFileSync(combinedAudioPath, publicAudioPath);

    // Proporcionalizar os intervalos por quantidade de palavras para sincronizar a narração única com cenas/legendas.
    const weights = narrationSegments.map((segment) => Math.max(1, segment.text.split(/\s+/).filter(Boolean).length));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let accumulatedSeconds = 0;
    const narrationTimings = narrationSegments.map((segment, index) => {
      const start = accumulatedSeconds;
      const duration = index === narrationSegments.length - 1
        ? Math.max(0.1, totalDuration - accumulatedSeconds)
        : totalDuration * weights[index] / totalWeight;
      accumulatedSeconds += duration;
      return { ...segment, start, end: accumulatedSeconds, duration };
    });
    const hookDuration = narrationTimings[0]?.duration || Math.min(3, totalDuration);

    processingStage = 'renderização Remotion';
    console.log('   [3/4] Renderizando vídeo com Remotion...');
    const outputDir = path.resolve('video/out');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const fps = 30;
    const scenesWithFrames = script.scenes.map((scene, index) => {
      const timing = narrationTimings[index + 1];
      const startFrame = Math.max(0, Math.round((timing?.start || 0) * fps));
      const endFrame = Math.max(startFrame + 1, Math.round((timing?.end || 0) * fps));
      return { ...scene, startFrame, endFrame };
    });
    const productImageSource = await downloadProductImage(video.product_image_url, video.id, video.product_title);
    temporaryVisualAssets.push(path.resolve("video/public", productImageSource));

    const gallerySources = [];
    const seenImageUrls = new Set([String(video.product_image_url || "").trim()]);
    for (let index = 0; index < productImageUrls.length && gallerySources.length < 4; index += 1) {
      const imageUrl = String(productImageUrls[index] || "").trim();
      if (!imageUrl || seenImageUrls.has(imageUrl)) continue;
      seenImageUrls.add(imageUrl);
      const localPath = await downloadProductImage(
        imageUrl, video.id, video.product_title,
        { suffix: "-gallery-" + (gallerySources.length + 1), allowFallback: false }
      );
      if (localPath) {
        gallerySources.push(localPath);
        temporaryVisualAssets.push(path.resolve("video/public", localPath));
      }
    }
    const productImages = [productImageSource, ...gallerySources].slice(0, 5);
    console.log("[MEDIA] Produto usa " + productImages.length + " imagem(ns) reais no storyboard.");

    const brollVideos = await fetchPexelsBroll(script.scenes, video.product_category, video.id, videoFormat);
    temporaryVisualAssets.push(...brollVideos.filter(Boolean).map(source => path.resolve("video/public", source)));

    const videoData = {
      type: videoFormat === "long" ? "long" : "review",
      title: video.product_title,
      imageUrl: productImageSource,
      score: Number.isFinite(Number(script.score)) && Number(script.score) > 0 && Number(script.score) <= 10 ? Number(script.score) : 0,
      category: video.product_category,
      hook: script.hook,
      scenes: scenesWithFrames,
      callToAction: script.callToAction,
      audioUrl: `tmp/video-${video.id}.mp3`,
      hookDuration,
      subtitleEntries: buildCaptionEntries(narrationTimings, videoFormat === "long" ? 18 : 100),
      productImages,
      brollVideos,
      totalDuration,
      fps,
    };

    const videoFileName = `video-${video.id}.mp4`;
    const videoPath = path.join(outputDir, videoFileName);
    await renderWithRemotion(videoData, videoPath);
    processingStage = 'controle de qualidade Remotion';
    runRemotionQualityGate(videoPath, videoData.subtitleEntries, videoFormat, video.id);

    processingStage = 'upload YouTube';
    console.log('   [4/4] Upload para YouTube...');
    const siteUrl = (process.env.VETOR_SITE_URL || 'https://www.vetor.blog').replace(/\/$/, '');
    const reviewUrl = (typeof video.review_url === 'string' && video.review_url.startsWith('https://'))
      ? video.review_url
      : '';
    const purchaseUrl = video.shortened_affiliate_url || video.affiliate_url;
    if (!reviewUrl) throw new Error('review_url ausente: não publicar vídeo sem link do review.');
    if (!purchaseUrl || !String(purchaseUrl).startsWith('http')) {
      throw new Error('Link de compra/afiliado ausente ou inválido; upload bloqueado.');
    }

    const ytTitle = buildVideoTitle({ format: videoFormat, productTitle: video.product_title, hook: script.hook });
    const chapters = videoFormat === "long"
      ? [
          { time: 0, title: "Introdução e decisão de compra" },
          ...script.scenes.map((scene, index) => ({
            time: narrationTimings[index + 1]?.start ?? 0,
            title: String(scene.visualCue || ("Ponto " + (index + 1))).replace(/[.!?]+$/, ""),
          })),
        ]
      : [];
    const ytDescription = buildVideoDescription({
      format: videoFormat,
      productTitle: video.product_title,
      category: video.product_category,
      purchaseUrl,
      reviewUrl,
      hook: script.hook,
      highlights: (script.scenes || []).map((scene) => scene.text),
      callToAction: script.callToAction,
      chapters,
    });
    const ytCommentText = buildCtaComment({
      format: videoFormat,
      productTitle: video.product_title,
      purchaseUrl,
      reviewUrl,
    });
    const terms = `${video.product_title} ${video.product_category} review análise vale a pena comprar desconto preço 2026`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter(term => term.length >= 3);
    const ytTags = [...new Set([
      'review', 'análise de produto', 'vale a pena', 'custo-benefício',
      'tecnologia', 'Vetor Blog', '2026',
      ...(videoFormat === "long" ? ["análise completa", "guia de compra"] : ["Shorts", "shorts de tecnologia"]),
      video.product_category,
      ...terms,
    ])].filter(Boolean).slice(0, 30);

    const ytResult = await uploadToYouTube(videoPath, ytTitle, ytDescription, ytTags, ytCommentText);
    if (!ytResult?.videoId || !ytResult?.videoUrl) {
      throw new Error('O YouTube não confirmou a criação do vídeo; item não marcado como concluído.');
    }

    const updates = {
      status: 'completed',
      video_url: `${siteUrl}/videos/${videoFileName}`,
      voiceover_url: combinedAudioPath,
      voiceover_duration: totalDuration,
      completed_at: new Date().toISOString(),
      youtube_video_id: ytResult.videoId,
      youtube_url: ytResult.videoUrl,
      error_message: ytResult.commentError
        ? ('[CTA_COMMENT_PENDING] ' + ytResult.commentError).slice(0, 4000)
        : null,
    };

    await updateVideoStatus(video.id, updates);
    console.log('[UPLOAD_CONFIRMED_THIS_RUN] queue_id=' + video.id + ' youtube_url=' + ytResult.videoUrl);
    console.log(`   ✅ Vídeo concluído: ${video.product_title}`);
    console.log(`   📝 Review: ${reviewUrl}`);
    console.log(`   🛒 Compra: ${purchaseUrl}`);
    console.log(`   📺 YouTube: ${ytResult.videoUrl}`);
    if (ytResult.commentId) {
      console.log('   💬 Comentário com links e chamada para ação publicado.');
    } else {
      console.warn('   💬 Vídeo publicado; comentário CTA salvo para nova tentativa automática.');
    }

    if (fs.existsSync(audioDir)) fs.rmSync(audioDir, { recursive: true });
    if (fs.existsSync(publicAudioPath)) fs.unlinkSync(publicAudioPath);
    for (const assetPath of temporaryVisualAssets) if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    const details = error && typeof error === 'object' ? error : {};
    const stderr = details.stderr ? String(details.stderr).slice(-1800) : '';
    const stdout = details.stdout ? String(details.stdout).slice(-1000) : '';
    const commandValue = details.command || details.cmd;
    const command = commandValue ? String(commandValue).slice(0, 500) : '';
    const diagnostic = [`Etapa: ${processingStage}`, message, command ? `Comando: ${command}` : '', stderr ? `stderr: ${stderr}` : '', stdout ? `stdout: ${stdout}` : ''].filter(Boolean).join(' | ').slice(0, 4000);
    console.error(`   ❌ Erro na etapa [${processingStage}]: ${message}`);
    if (stderr) console.error(`   [diagnóstico stderr] ${stderr}`);
    if (stdout) console.error(`   [diagnóstico stdout] ${stdout}`);
    await updateVideoStatus(video.id, {
      status: 'failed',
      error_message: diagnostic,
    });
    if (fs.existsSync(publicAudioPath)) fs.unlinkSync(publicAudioPath);
    const failedAudioDir = path.resolve(`/tmp/video-${video.id}`);
    if (fs.existsSync(failedAudioDir)) fs.rmSync(failedAudioDir, { recursive: true, force: true });
    for (const assetPath of temporaryVisualAssets) if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
    return false;
  }
  return true;
}


async function main() {
  console.log('🎬 Iniciando processamento de vídeos...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('[TTS] Voz única=Edge TTS neural pt-BR-FranciscaNeural.');

  // Test mode generates a short local sample and exits before touching the queue, Supabase or YouTube.
  if (process.env.TTS_SMOKE_TEST === 'true') {
    const smokePath = path.join('/tmp', 'vetor-tts-smoke-' + process.pid + '.mp3');
    try {
      const duration = await generateVoiceover(
        'Olá! Este é um teste de voz neural em português brasileiro para os vídeos do Vetor Blog.',
        smokePath
      );
      if (!fs.existsSync(smokePath) || fs.statSync(smokePath).size < 1000) {
        throw new Error('[TTS_SMOKE_TEST] Edge TTS não produziu um MP3 válido.');
      }
      console.log('[TTS_SMOKE_TEST] Edge TTS pt-BR-FranciscaNeural validado; duração=' + duration.toFixed(2) + 's. Nenhum vídeo foi publicado.');
    } finally {
      if (fs.existsSync(smokePath)) fs.unlinkSync(smokePath);
    }
    return;
  }
  // Check auth, retry CTA comments independently, and enforce the local daily cap.
  await verifyYouTubeOAuth();
  await retryPendingCtaComments();

  const manualRun = process.env.MANUAL_RUN === 'true';
  const quota = await queueApi('quota');
  if (!manualRun && Number(quota.remaining) <= 0) {
    console.log(`Limite automático diário atingido: ${quota.completedToday}/${quota.dailyLimit} publicações automáticas no horário de São Paulo. Execução encerrada sem reivindicar itens.`);
    return;
  }
  if (manualRun) {
    console.log(`[MANUAL_RUN] Execução manual autorizada; não consome a cota automática de 15/dia. Limite deste lote: 5 vídeos. Publicações automáticas hoje: ${quota.completedToday}/${quota.dailyLimit}.`);
  }

  const videoId = process.env.VIDEO_ID;
  const requestedLimit = videoId
    ? 1
    : Math.min(Math.max(Number(process.env.MAX_VIDEOS || 1), 1), 5, manualRun ? 5 : Number(quota.remaining));
  // Recover only render-timeout failures that definitely did not upload to YouTube.
  if (!videoId && requestedLimit > 0) {
    const remotionRecovery = await queueApi('retryRemotionTimeouts', { limit: requestedLimit });
    if (Number(remotionRecovery.retried) > 0) {
      console.log('[QUEUE_RECOVERY] Recolocados ' + Number(remotionRecovery.retried) + ' vídeo(s) que falharam por timeout no Remotion.');
    }

    // Restore TTS quota failures from the retired provider as before.
    const restored = await queueApi('retryQuotaFailures', { limit: requestedLimit });
    if (Number(restored.retried) > 0) {
      console.log('[QUEUE_RECOVERY] Recolocados ' + Number(restored.retried) + ' vídeo(s) que falharam por quota_exceeded.');
    }
  }

  let failures = 0;
  let processedCount = 0;
  if (videoId) {
    const video = await getVideoById(videoId);
    if (!video) throw new Error(`Vídeo ${videoId} não encontrado na fila autenticada do Supabase conectado ao Vetor.`);
    if (video.status === 'completed' && video.youtube_url) {
      console.log(`Vídeo ${videoId} já foi publicado; evitando upload duplicado. Comentários pendentes são tratados separadamente.`);
      return;
    }
    await updateVideoStatus(video.id, { publication_mode: manualRun ? 'manual' : 'automatic' });
    processedCount += 1;
    if (!(await processVideo(video))) failures += 1;
  } else {
    const limit = requestedLimit;
    let videos = await getPendingVideos(limit, manualRun);

    if (videos.length < limit && limit > 0) {
      const slotsNeeded = limit - videos.length;
      console.log('Fila abaixo do lote solicitado (' + videos.length + '/' + limit + '); completando com reviews e comparativos publicados.');
      let queuedFromReviews = 0;
      try {
        const refill = await queueApi('queueFromReviews', { limit: slotsNeeded });
        queuedFromReviews = Math.min(slotsNeeded, Math.max(0, Number(refill.queued) || 0));
        console.log(`Reposição da fila: ${queuedFromReviews} review(s) adicionado(s).`);
      } catch (error) {
        console.warn('[QUEUE_REFILL] Não foi possível adicionar reviews: ' +
          (error instanceof Error ? error.message : String(error)));
      }
      const comparisonLimit = Math.max(0, slotsNeeded - queuedFromReviews);
      if (comparisonLimit > 0) {
        try {
          const refill = await queueApi('queueFromComparatives', { limit: comparisonLimit });
          console.log(`Reposição da fila: ${Number(refill.queued) || 0} comparativo(s) adicionado(s).`);
        } catch (error) {
          console.warn('[QUEUE_REFILL] Não foi possível adicionar comparativos: ' +
            (error instanceof Error ? error.message : String(error)));
        }
      }
      videos = await getPendingVideos(limit, manualRun);
    }

    console.log(`   ${videos.length} vídeos pendentes encontrados (limite: ${limit}; cota automática restante: ${quota.remaining})`);
    for (const video of videos) {
      await updateVideoStatus(video.id, { publication_mode: manualRun ? 'manual' : 'automatic' });
      processedCount += 1;
      if (!(await processVideo(video))) failures += 1;
    }
  }
  if (failures > 0) {
    console.error(`[video-worker] ${failures} vídeo(s) falharam. Confira error_message no Supabase.`);
    process.exitCode = 1;
  } else if (processedCount === 0) {
    console.error('\n[NO_UPLOADS_THIS_RUN] Nenhum vídeo foi processado; encerrando com erro para não sinalizar sucesso sem upload.');
    process.exitCode = 2;
  } else {
    console.log(`\n✅ Processamento concluído sem falhas: ${processedCount} vídeo(s) processado(s); confira as URLs de upload registradas acima.`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
