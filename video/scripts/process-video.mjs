import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SITE_URL = (process.env.VETOR_SITE_URL || 'https://www.vetor.blog').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET;

async function verifyYouTubeOAuth() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('YouTube OAuth preflight failed: required client ID, client secret or refresh token is missing.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== 'string' || !result.access_token) {
    const reason = typeof result.error === 'string' ? result.error : `HTTP ${response.status}`;
    throw new Error(`YouTube OAuth preflight failed (${reason}). No queue item was claimed or changed.`);
  }
  console.log('YouTube OAuth preflight passed.');
}

async function createYouTubeClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciais YouTube incompletas para comentários/upload.');
  }
  const { google } = await import('googleapis');
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

function buildCtaComment({ productTitle, purchaseUrl, reviewUrl }) {
  return [
    `👇 Quer conferir o preço e analisar ${productTitle} antes de comprar?`,
    '',
    `🛒 Link de compra: ${purchaseUrl}`,
    `📝 Review completo no Vetor.blog: ${reviewUrl}`,
    '',
    'Confira preço, frete, disponibilidade e condições atuais no anúncio.',
    'Se o vídeo ajudou, deixe o like e inscreva-se no canal para mais reviews!',
  ].join('\n');
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
  const elevenKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  const elevenVoiceId = (process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL').trim();
  const azureVoice = (process.env.AZURE_SPEECH_VOICE || 'pt-BR-AntonioNeural').trim();
  const azureKey = (process.env.AZURE_SPEECH_KEY || '').trim();
  const azureRegion = (process.env.AZURE_SPEECH_REGION || '').trim();
  const edgeVoices = ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural'];
  const tempFile = outputPath.replace(/\.mp3$/i, '-temp.mp3');
  const textFile = outputPath.replace(/\.mp3$/i, '-text.txt');
  const wavPath = outputPath.replace(/\.mp3$/i, '-espeak.wav');
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
  for (const stale of [tempFile, wavPath]) if (fs.existsSync(stale)) fs.unlinkSync(stale);

  const finishFromTemp = (provider, voice) => {
    const duration = getAudioDuration(tempFile, provider);
    fs.renameSync(tempFile, outputPath);
    console.log('   [TTS] Provider=' + provider + '; voz=' + voice + '; duração=' + duration.toFixed(2) + 's.');
    return duration;
  };

  const strictAzure = process.env.TTS_TEST_REQUIRE_AZURE === 'true';
  const strictEdge = process.env.TTS_TEST_REQUIRE_EDGE === 'true';
  const forceFallback = process.env.TTS_FORCE_FALLBACK === 'true';

  try {
    // One continuous narration per video preserves natural cadence and avoids audible cuts between every sentence.
    if (!strictAzure && !strictEdge && !forceFallback && elevenKey) {
      try {
        const response = await fetch(
          'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(elevenVoiceId) + '?output_format=mp3_44100_128',
          {
            method: 'POST',
            headers: {
              'xi-api-key': elevenKey,
              'Content-Type': 'application/json',
              Accept: 'audio/mpeg',
            },
            body: JSON.stringify({
              text: safeText,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.38, similarity_boost: 0.78, style: 0.32, use_speaker_boost: true },
            }),
            signal: AbortSignal.timeout(55000),
          }
        );
        if (!response.ok) {
          const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260);
          throw new Error('ElevenLabs HTTP ' + response.status + (detail ? ': ' + detail : ''));
        }
        const audio = Buffer.from(await response.arrayBuffer());
        if (audio.length < 1000) throw new Error('ElevenLabs retornou áudio vazio.');
        fs.writeFileSync(tempFile, audio);
        return finishFromTemp('ElevenLabs / eleven_multilingual_v2', elevenVoiceId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('   [TTS_FAILOVER] ElevenLabs indisponível; tentando Azure/Edge. ' + message);
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    } else if (!strictAzure && !strictEdge && !forceFallback && !elevenKey) {
      console.warn('   [TTS_FAILOVER] ELEVENLABS_API_KEY ausente; priorizando Azure/Edge.');
    }

    if (!strictEdge && !forceFallback && azureKey && azureRegion) {
      try {
        const endpoint = 'https://' + encodeURIComponent(azureRegion) + '.tts.speech.microsoft.com/cognitiveservices/v1';
        const ssmlText = safeText.split(/\n\s*\n/).map(escapeXml).join('<break time="260ms"/>');
        const ssml = '<?xml version="1.0" encoding="utf-8"?>' +
          '<speak version="1.0" xml:lang="pt-BR"><voice name="' + escapeXml(azureVoice) + '">' +
          ssmlText + '</voice></speak>';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'User-Agent': 'VetorBlog-VideoWorker',
          },
          body: ssml,
          signal: AbortSignal.timeout(40000),
        });
        if (!response.ok) {
          const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 240);
          throw new Error('Azure Speech HTTP ' + response.status + (detail ? ': ' + detail : ''));
        }
        const audio = Buffer.from(await response.arrayBuffer());
        if (audio.length < 1000) throw new Error('Azure Speech retornou áudio vazio.');
        fs.writeFileSync(tempFile, audio);
        return finishFromTemp('Azure Speech neural', azureVoice);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('   [TTS_FAILOVER] Azure Speech indisponível; tentando Edge TTS. ' + message);
        if (strictAzure) throw new Error('[TTS_SMOKE_TEST] Azure obrigatório falhou: ' + message);
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    } else if (strictAzure && (!azureKey || !azureRegion)) {
      throw new Error('[TTS_SMOKE_TEST] AZURE_SPEECH_KEY/AZURE_SPEECH_REGION não configurados para o teste estrito.');
    } else if (!azureKey || !azureRegion) {
      console.warn('   [TTS_FAILOVER] Azure não configurado; tentando Edge TTS gratuito.');
    }

    for (const voice of edgeVoices) {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        execFileSync('edge-tts', ['--voice', voice, '--file', textFile, '--write-media', tempFile], {
          stdio: 'pipe', timeout: 45000,
        });
        return finishFromTemp('Edge TTS neural (fallback gratuito)', voice);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stderr = error && typeof error === 'object' && 'stderr' in error
          ? String(error.stderr || '').replace(/\s+/g, ' ').slice(-250) : '';
        console.warn('   [TTS_FAILOVER] Edge TTS ' + voice + ' falhou: ' + (stderr || message).slice(0, 360));
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    }

    if (strictEdge) throw new Error('[TTS_SMOKE_TEST] As vozes Edge TTS falharam; fallback offline omitido no teste estrito.');

    execFileSync('espeak-ng', ['-v', 'pt-br', '-s', '150', '-f', textFile, '-w', wavPath], {
      stdio: 'pipe', timeout: 20000,
    });
    if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 1000) throw new Error('espeak-ng não produziu WAV utilizável.');
    execFileSync('ffmpeg', ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', tempFile], {
      stdio: 'pipe', timeout: 20000,
    });
    return finishFromTemp('espeak-ng offline (último recurso)', 'pt-br');
  } finally {
    for (const file of [textFile, tempFile, wavPath]) if (fs.existsSync(file)) fs.unlinkSync(file);
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
    const renderOutput = execFileSync(
      process.execPath,
      [tsxEntrypoint, 'video/src/utils/renderVideo.ts', String(videoData.type || 'review'), dataPath],
      {
        encoding: 'utf8',
        stdio: 'pipe',
        // Chrome is prepared before the queue is touched. Twenty minutes leaves headroom for complex scenes.
        timeout: 1200000,
        maxBuffer: 32 * 1024 * 1024,
        cwd: path.resolve(process.cwd()),
      }
    );
    if (renderOutput.trim()) {
      console.log('   [Remotion] ' + renderOutput.trim().slice(-1600));
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
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !videoStream ||
      !videoStream.codec_name ||
      Number(videoStream.width) <= 0 ||
      Number(videoStream.height) <= 0
    ) {
      throw new Error('MP4 inválido: ffprobe não encontrou stream de vídeo com resolução e duração válidas.');
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
async function uploadToYouTube(videoPath, title, description, tags, commentText) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciais de upload do YouTube incompletas (YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN).');
  }

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

async function fetchPexelsBroll(scenes, category, videoId) {
  const apiKey = (process.env.PEXELS_API_KEY || process.env.PEXELS_KEY || '').trim();
  if (!apiKey) {
    console.warn('[BROLL] PEXELS_API_KEY ausente; render seguirá sem footage de apoio.');
    return [];
  }

  const keywords = [];
  for (const scene of (Array.isArray(scenes) ? scenes : [])) {
    for (const keyword of (Array.isArray(scene.brollKeywords) ? scene.brollKeywords : [])) {
      const normalized = String(keyword || '').trim();
      if (normalized.length >= 3 && !keywords.includes(normalized)) keywords.push(normalized);
    }
  }
  const queries = keywords.slice(0, 3);
  const candidates = [];
  const seenIds = new Set();

  for (const keyword of queries) {
    try {
      const response = await fetch(
        'https://api.pexels.com/videos/search?query=' + encodeURIComponent(keyword) +
          '&per_page=8&orientation=portrait',
        { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(12000) }
      );
      if (!response.ok) {
        console.warn('[BROLL] Pexels HTTP ' + response.status + ' para consulta visual.');
        continue;
      }
      const payload = await response.json();
      for (const video of (Array.isArray(payload.videos) ? payload.videos : [])) {
        if (!video || seenIds.has(video.id)) continue;
        const files = (Array.isArray(video.video_files) ? video.video_files : [])
          .filter((file) => typeof file.link === 'string' && file.link.startsWith('https://'))
          .sort((a, b) => {
            const aVertical = Number(Number(a.height) > Number(a.width));
            const bVertical = Number(Number(b.height) > Number(b.width));
            if (aVertical !== bVertical) return bVertical - aVertical;

            // OffthreadVideo downloads its sources before extracting frames. Prefer the largest
            // portrait file at or below 1280px to avoid fetching 1080p/4K stock clips unnecessarily.
            const resolutionRank = (file) => {
              const longSide = Math.max(Number(file.height) || 0, Number(file.width) || 0);
              if (!longSide) return Number.MAX_SAFE_INTEGER;
              return longSide <= 1280 ? -longSide : 10000 + longSide;
            };
            const aRank = resolutionRank(a);
            const bRank = resolutionRank(b);
            if (aRank !== bRank) return aRank - bRank;

            const aHd = a.quality === 'hd' ? 1 : 0;
            const bHd = b.quality === 'hd' ? 1 : 0;
            if (aHd !== bHd) return bHd - aHd;
            return (Number(b.width) || 0) - (Number(a.width) || 0);
          });
        if (!files.length) continue;
        seenIds.add(video.id);
        candidates.push({ id: String(video.id), url: files[0].link, query: keyword });
      }
    } catch (error) {
      console.warn('[BROLL] Busca de footage falhou: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // Reordenar deterministicamente por ID do item evita que todos os vídeos escolham sempre os primeiros resultados do Pexels.
  const seed = String(videoId || category || 'vetor');
  const hash = (value) => Array.from(String(value)).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  candidates.sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
  // OffthreadVideo extracts frames outside Chromium but needs the source clip downloaded.
  // Four distinct clips preserve variety while keeping source downloads predictable.
  const selected = candidates.slice(0, 4).map((item) => item.url);
  console.log('[BROLL] ' + selected.length + ' clipes exclusivos (preferência até 1280px) selecionados em ' + queries.length + ' buscas de apoio.');
  return selected;
}

async function processVideo(video) {
  console.log(`\n🎬 Processando: ${video.product_title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Hook: ${video.script_hook}`);

  await updateVideoStatus(video.id, { status: 'processing', started_at: new Date().toISOString(), error_message: null });
  const publicAudioPath = path.resolve('video/public/tmp', `video-${video.id}.mp3`);
  let processingStage = 'roteiro';

  try {
    let script = null;
    if (typeof video.script_text === 'string' && video.script_text.trim()) {
      try {
        const candidate = JSON.parse(video.script_text);
        if (
          candidate &&
          typeof candidate === 'object' &&
          candidate.generationVersion === 2 &&
          typeof candidate.creativeAngle === 'string' &&
          candidate.creativeAngle.trim() &&
          Array.isArray(candidate.scenes) &&
          candidate.scenes.length >= 6
        ) {
          script = candidate;
        }
      } catch {
        script = null;
      }
    }
    if (!script) {
      const siteUrl = (process.env.VETOR_SITE_URL || 'https://www.vetor.blog').replace(/\/$/, '');
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) throw new Error('CRON_SECRET ausente: não é possível solicitar o roteiro de produção.');
      const response = await fetch(`${siteUrl}/api/cron/generate-video-script/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: video.id }),
        signal: AbortSignal.timeout(60000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.script) {
        throw new Error(`Falha na geração do roteiro em produção (HTTP ${response.status}): ${payload.error || 'resposta inválida'}`);
      }
      script = payload.script;
      if (!Array.isArray(script.scenes) || script.scenes.length < 5) {
        throw new Error('Roteiro retornado pela API não passou pela validação mínima de cenas.');
      }
    }

    processingStage = 'narração';
    console.log('   [1/4] Gerando uma narração contínua para manter ritmo e entonação naturais...');
    console.log('[TTS] Preferência=ElevenLabs multilingual v2; fallback=Azure Speech neural, Edge TTS neural e espeak-ng.');
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
    const brollVideos = await fetchPexelsBroll(script.scenes, video.product_category, video.id);

    const videoData = {
      type: 'review',
      title: video.product_title,
      imageUrl: video.product_image_url,
      score: Number.isFinite(Number(script.score)) && Number(script.score) > 0 && Number(script.score) <= 10 ? Number(script.score) : 0,
      category: video.product_category,
      hook: script.hook,
      scenes: scenesWithFrames,
      callToAction: script.callToAction,
      audioUrl: `tmp/video-${video.id}.mp3`,
      hookDuration,
      subtitleEntries: narrationTimings.map((segment) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
      })),
      productImages: [video.product_image_url],
      brollVideos,
      totalDuration,
      fps,
    };

    const videoFileName = `video-${video.id}.mp4`;
    const videoPath = path.join(outputDir, videoFileName);
    await renderWithRemotion(videoData, videoPath);

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

    const ytTitle = `${video.product_title} - Review Completo | Vetor Blog`.slice(0, 100);
    const ytDescription = [
      `🛒 LINK DE COMPRA: ${purchaseUrl}`,
      `📝 REVIEW COMPLETO: ${reviewUrl}`,
      '',
      'Confira preço, frete, disponibilidade e condições atualizadas antes de comprar.',
      '',
      script.hook,
      '',
      script.scenes.map(s => s.text).join('\n\n'),
      '',
      script.callToAction,
      '',
      '#Review #Tecnologia #CustoBeneficio #VetorBlog',
    ].join('\n').slice(0, 5000);
    const ytCommentText = buildCtaComment({
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
      'tecnologia', 'comprar com desconto', 'Vetor Blog', '2026',
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
    return false;
  }
  return true;
}


async function main() {
  console.log('🎬 Iniciando processamento de vídeos...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('[TTS] Principal=ElevenLabs multilingual v2; fallback=Azure Speech, Edge TTS e espeak-ng. ' +
    (process.env.ELEVENLABS_API_KEY ? 'Chave ElevenLabs configurada.' : 'Chave ElevenLabs ausente; será usado o próximo provider disponível.'));

  // Test mode generates a short local sample and exits before touching the queue, Supabase or YouTube.
  if (process.env.TTS_SMOKE_TEST === 'true') {
    if (process.env.TTS_TEST_REQUIRE_AZURE === 'true' &&
        (!(process.env.AZURE_SPEECH_KEY || '').trim() || !(process.env.AZURE_SPEECH_REGION || '').trim())) {
      throw new Error('[TTS_SMOKE_TEST] AZURE_SPEECH_KEY e AZURE_SPEECH_REGION são necessários para validar o provedor principal.');
    }
    const smokePath = path.join('/tmp', 'vetor-tts-smoke-' + process.pid + '.mp3');
    try {
      const duration = await generateVoiceover(
        'Olá! Este é um teste de voz em português brasileiro para os vídeos do Vetor Blog.',
        smokePath
      );
      if (!fs.existsSync(smokePath) || fs.statSync(smokePath).size < 1000) {
        throw new Error('[TTS_SMOKE_TEST] O provedor não produziu um MP3 válido.');
      }
      console.log('[TTS_SMOKE_TEST] Áudio válido gerado; duração=' + duration.toFixed(2) + 's. Nenhum vídeo foi publicado.');
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
    console.log('\nℹ️ Nenhum vídeo foi processado nesta execução; nenhum upload novo foi realizado.');
  } else {
    console.log(`\n✅ Processamento concluído sem falhas: ${processedCount} vídeo(s) processado(s); confira as URLs de upload registradas acima.`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
