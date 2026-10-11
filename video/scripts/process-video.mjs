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

async function getPendingVideos(limit = Number(process.env.MAX_VIDEOS || 1)) {
  const result = await queueApi('next', { limit });
  return Array.isArray(result.videos) ? result.videos : [];
}

async function getVideoById(id) {
  const result = await queueApi('get', { id });
  return result.video || null;
}

async function updateVideoStatus(id, updates) {
  await queueApi('update', { id, updates });
}

async function generateVoiceover(text, outputPath) {
  // Prefer neural voices, with short timeouts; use offline Brazilian Portuguese TTS
  // when Edge TTS is unavailable so a temporary network failure doesn't block the video.
  const voices = ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural'];
  const tempFile = outputPath.replace('.mp3', '-temp.mp3');
  const textFile = outputPath.replace('.mp3', '-text.txt');
  const wavPath = outputPath.replace('.mp3', '-espeak.wav');
  const safeText = text
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\n/g, ' ')
    .trim();

  if (!safeText) throw new Error('[TTS] Não é possível gerar áudio de uma cena vazia.');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(textFile, safeText, 'utf8');
  const failures = [];

  for (const voice of voices) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      execFileSync(
        'edge-tts',
        ['--voice', voice, '--file', textFile, '--write-media', tempFile],
        { stdio: 'pipe', timeout: 10000 }
      );

      if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size < 1000) {
        throw new Error('TTS terminou sem gerar um MP3 utilizável.');
      }

      const durationStr = execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', tempFile],
        { encoding: 'utf-8', timeout: 10000 }
      ).trim();
      const duration = parseFloat(durationStr);
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error('ffprobe não conseguiu ler a duração do MP3 gerado.');
      }

      fs.renameSync(tempFile, outputPath);
      if (fs.existsSync(textFile)) fs.unlinkSync(textFile);
      console.log(`   [TTS] Voz neural selecionada: ${voice}`);
      return duration;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stderr = error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr || '').slice(0, 400)
        : '';
      failures.push(`${voice}: ${message}${stderr ? ` | stderr: ${stderr}` : ''}`);
      console.warn(`   [TTS] ${voice} falhou; tentando fallback. ${stderr || message}`);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  try {
    execFileSync(
      'espeak-ng',
      ['-v', 'pt-br', '-s', '150', '-f', textFile, '-w', wavPath],
      { stdio: 'pipe', timeout: 15000 }
    );
    if (!fs.existsSync(wavPath) || fs.statSync(wavPath).size < 1000) {
      throw new Error('espeak-ng não produziu WAV utilizável.');
    }
    execFileSync(
      'ffmpeg',
      ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', outputPath],
      { stdio: 'pipe', timeout: 15000 }
    );
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error('ffmpeg não conseguiu converter a locução offline para MP3.');
    }
    const durationStr = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputPath],
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    const duration = parseFloat(durationStr);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Duração do áudio offline inválida.');
    console.warn('   [TTS] Usando voz offline espeak-ng pt-br como fallback.');
    return duration;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stderr = error && typeof error === 'object' && 'stderr' in error
      ? String(error.stderr || '').slice(0, 400)
      : '';
    throw new Error(`[TTS] Nenhuma voz conseguiu gerar áudio. ${failures.join(' || ')} || espeak-ng: ${message}${stderr ? ` | stderr: ${stderr}` : ''}`);
  } finally {
    for (const file of [textFile, tempFile, wavPath]) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
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
    execSync(
      `npx tsx video/src/utils/renderVideo.ts review "${dataPath}"`,
      {
        stdio: 'inherit',
        timeout: 600000,
        cwd: path.resolve(process.cwd()),
      }
    );

    // Remotion writes timestamped files into video/out. Normalize the newest
    // result to this queue item's ID so uploads cannot accidentally use old output.
    const renderedDir = path.resolve('video/out');
    const candidates = fs.readdirSync(renderedDir)
      .filter((name) => name.endsWith('.mp4') && path.join(renderedDir, name) !== outputPath)
      .map((name) => ({
        path: path.join(renderedDir, name),
        mtime: fs.statSync(path.join(renderedDir, name)).mtimeMs,
      }))
      .sort((left, right) => right.mtime - left.mtime);

    if (!fs.existsSync(outputPath)) {
      if (candidates.length === 0) throw new Error('Remotion finished without producing an MP4 file.');
      fs.renameSync(candidates[0].path, outputPath);
    }
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      throw new Error('Rendered MP4 is missing or unexpectedly small.');
    }
  } finally {
    if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
  }
}
async function uploadToYouTube(videoPath, title, description, tags) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciais de upload do YouTube incompletas (YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN).');
  }

  try {
    const { google } = await import('googleapis');
    // googleapis exposes OAuth2 through google.auth.OAuth2; OAuth2Client is
    // a separate google-auth-library export and is not a constructor here.
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

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
    const videoUrl = `https://youtube.com/watch?v=${videoId}`;
    console.log(`   📤 YouTube: ${videoUrl}`);
    return { videoId, videoUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('   ❌ YouTube upload failed:', message);
    throw new Error(`YouTube upload failed: ${message}`);
  }
}

async function processVideo(video) {
  console.log(`\n🎬 Processando: ${video.product_title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Hook: ${video.script_hook}`);

  await updateVideoStatus(video.id, { status: 'processing', started_at: new Date().toISOString() });
  const publicAudioPath = path.resolve('video/public/tmp', `video-${video.id}.mp3`);

  try {
    let script = null;
    if (typeof video.script_text === 'string' && video.script_text.trim()) {
      try {
        const candidate = JSON.parse(video.script_text);
        if (candidate && typeof candidate === 'object' && Array.isArray(candidate.scenes) && candidate.scenes.length >= 5) {
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

    console.log('   [1/4] Gerando voiceover...');
    const audioDir = path.resolve(`/tmp/video-${video.id}`);
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const audioFiles = [];
    let totalDuration = 0;

    const hookAudioPath = path.join(audioDir, 'hook.mp3');
    const hookDuration = await generateVoiceover(script.hook, hookAudioPath);
    audioFiles.push(hookAudioPath);
    totalDuration += hookDuration;

    for (const scene of script.scenes) {
      const sceneAudioPath = path.join(audioDir, `scene-${scene.id}.mp3`);
      const duration = await generateVoiceover(scene.text, sceneAudioPath);
      audioFiles.push(sceneAudioPath);
      totalDuration += duration;
    }

    const ctaAudioPath = path.join(audioDir, 'cta.mp3');
    const ctaDuration = await generateVoiceover(script.callToAction, ctaAudioPath);
    audioFiles.push(ctaAudioPath);
    totalDuration += ctaDuration;

    console.log('   [2/4] Combinando áudio...');
    const combinedAudioPath = path.join(audioDir, 'combined.mp3');
    await combineAudioFiles(audioFiles, combinedAudioPath);
    if (!fs.existsSync(combinedAudioPath) || fs.statSync(combinedAudioPath).size < 1000) {
      throw new Error('A locução combinada não foi produzida corretamente.');
    }
    fs.mkdirSync(path.dirname(publicAudioPath), { recursive: true });
    fs.copyFileSync(combinedAudioPath, publicAudioPath);

    console.log('   [3/4] Renderizando vídeo com Remotion...');
    const outputDir = path.resolve('video/out');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const fps = 30;
    const hookFrames = 3 * fps;
    const scenesWithFrames = script.scenes.map((scene, index) => {
      const prevFrames = script.scenes.slice(0, index).reduce((sum, s) => sum + s.duration * fps, 0);
      return {
        ...scene,
        startFrame: hookFrames + prevFrames,
        endFrame: hookFrames + prevFrames + scene.duration * fps,
      };
    });

    const videoData = {
      type: 'review',
      title: video.product_title,
      imageUrl: video.product_image_url,
      score: 8.5,
      category: video.product_category,
      hook: script.hook,
      scenes: scenesWithFrames,
      callToAction: script.callToAction,
      audioUrl: `tmp/video-${video.id}.mp3`,
      subtitleEntries: [
        { start: 0, end: hookDuration, text: script.hook },
        ...script.scenes.map((scene, i) => {
          const start = hookDuration + script.scenes.slice(0, i).reduce((sum, s) => {
            return sum + s.duration;
          }, 0);
          return { start, end: start + 5, text: scene.text };
        }),
      ],
      productImages: [video.product_image_url],
      brollVideos: [],
      totalDuration,
      fps,
    };

    const videoFileName = `video-${video.id}.mp4`;
    const videoPath = path.join(outputDir, videoFileName);
    await renderWithRemotion(videoData, videoPath);

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
    const productName = String(video.product_title || 'Produto').trim();
    const categoryName = String(video.product_category || 'tecnologia').trim();
    const editorialSummary = script.scenes
      .map(s => String(s.text || '').trim())
      .filter(Boolean)
      .slice(0, 8);
    const ytDescription = [
      `Está pensando em comprar ${productName}? Neste review, veja os principais pontos para avaliar antes de decidir.`,
      '',
      `📝 REVIEW COMPLETO E DETALHES: ${reviewUrl}`,
      `🛒 VER PREÇO E OFERTA: ${purchaseUrl}`,
      '',
      'O QUE VOCÊ VAI VER NESTE VÍDEO',
      ...editorialSummary.map(line => `• ${line}`),
      '',
      `Analisamos os pontos relevantes de ${productName}, incluindo recursos, vantagens, limitações e custo-benefício na categoria ${categoryName}. Confira as especificações e as condições atuais no review antes de comprar.`,
      '',
      'Os preços e a disponibilidade podem mudar. Consulte a página de compra para verificar as condições vigentes.',
      'Aviso: podemos receber comissão por compras realizadas através de links de afiliado, sem custo adicional para você.',
      '',
      '#Review #ValeApena #CustoBeneficio #Tecnologia #VetorBlog',
    ].join('\n').slice(0, 5000);
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

    const ytResult = await uploadToYouTube(videoPath, ytTitle, ytDescription, ytTags);
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
      error_message: null,
    };

    await updateVideoStatus(video.id, updates);
    console.log(`   ✅ Vídeo concluído: ${video.product_title}`);
    console.log(`   📝 Review: ${reviewUrl}`);
    console.log(`   🛒 Compra: ${purchaseUrl}`);
    console.log(`   📺 YouTube: ${ytResult.videoUrl}`);

    if (fs.existsSync(audioDir)) fs.rmSync(audioDir, { recursive: true });
    if (fs.existsSync(publicAudioPath)) fs.unlinkSync(publicAudioPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Erro: ${message}`);
    await updateVideoStatus(video.id, {
      status: 'failed',
      error_message: message,
    });
    if (fs.existsSync(publicAudioPath)) fs.unlinkSync(publicAudioPath);
    return false;
  }
  return true;
}

async function main() {
  console.log('🎬 Iniciando processamento de vídeos...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  // Never claim a queue item if the destination channel cannot accept uploads.
  await verifyYouTubeOAuth();
  const videoId = process.env.VIDEO_ID;
  let failures = 0;
  if (videoId) {
    const video = await getVideoById(videoId);
    if (!video) throw new Error(`Vídeo ${videoId} não encontrado na fila autenticada do Supabase conectado ao Vetor.`);
    if (!(await processVideo(video))) failures += 1;
  } else {
    const limit = Math.min(Math.max(Number(process.env.MAX_VIDEOS || 1), 1), 10);
    const videos = await getPendingVideos(limit);
    console.log(`   ${videos.length} vídeos pendentes encontrados (limite: ${limit})`);
    for (const video of videos) {
      if (!(await processVideo(video))) failures += 1;
    }
  }
  if (failures > 0) {
    console.error(`[video-worker] ${failures} vídeo(s) falharam. Confira error_message no Supabase.`);
    process.exitCode = 1;
  } else {
    console.log('\n✅ Processamento concluído e uploads confirmados!');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
