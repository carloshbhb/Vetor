import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 0 } },
});

async function getPendingVideos(limit = 16) {
  const { data, error } = await supabase
    .from('video_queue')
    .select('*')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

async function updateVideoStatus(id, updates) {
  await supabase
    .from('video_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function generateVoiceover(text, outputPath) {
  const voice = 'pt-BR-ThiagoNeural';
  const tempFile = outputPath.replace('.mp3', '-temp.mp3');

  try {
    execSync(
      `edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tempFile}"`,
      { stdio: 'pipe', timeout: 30000 }
    );

    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    const duration = parseFloat(durationStr) || 5;
    fs.renameSync(tempFile, outputPath);
    return duration;
  } catch (error) {
    console.error('TTS error:', error);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return 5;
  }
}

async function combineAudioFiles(audioFiles, outputPath) {
  if (audioFiles.length === 0) return;
  if (audioFiles.length === 1) {
    fs.copyFileSync(audioFiles[0], outputPath);
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
  const dataPath = path.resolve(outputPath, '../remotion-input.json');
  fs.writeFileSync(dataPath, JSON.stringify(videoData, null, 2));

  try {
    execSync(
      `npx tsx video/src/utils/renderVideo.ts review "${dataPath}"`,
      {
        stdio: 'pipe',
        timeout: 300000,
        cwd: path.resolve(process.cwd()),
      }
    );
  } finally {
    if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
  }
}

async function uploadToYouTube(videoPath, title, description, tags) {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('   ⚠️ YouTube credentials not configured, skipping upload');
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const { OAuth2Client } = google.auth;
    const oauth2Client = new OAuth2Client(clientId, clientSecret);
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
    console.error('   ❌ YouTube upload failed:', error.message);
    return null;
  }
}

async function processVideo(video) {
  console.log(`\n🎬 Processando: ${video.product_title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Hook: ${video.script_hook}`);

  await updateVideoStatus(video.id, { status: 'processing', started_at: new Date().toISOString() });

  try {
    let script;
    try {
      script = JSON.parse(video.script_text);
    } catch {
      script = {
        hook: video.script_hook,
        scenes: [
          { id: 1, text: `Conheça o ${video.product_title}`, duration: 8, visualCue: 'Produto em destaque', brollKeywords: ['product'] },
          { id: 2, text: `Vale a pena? Descubra agora!`, duration: 8, visualCue: 'Análise', brollKeywords: ['review'] },
          { id: 3, text: `Link na descrição!`, duration: 5, visualCue: 'CTA', brollKeywords: ['link'] },
        ],
        totalDuration: 21,
        callToAction: 'Link na descrição para comprar com desconto!',
      };
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

    console.log('   [3/4] Renderizando vídeo com Remotion...');
    const outputDir = path.resolve('out');
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
      audioUrl: combinedAudioPath,
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
    const ytTitle = `${video.product_title} - Review Completo 2026 | Vetor Blog`;
    const ytDescription = `${script.hook}\n\n${script.scenes.map(s => s.text).join('\n\n')}\n\n${script.callToAction}\n\n🔗 Links na descrição do vídeo no site: https://vetor.blog`;
    const ytTags = ['review', 'tech', 'produto', video.product_category, 'vetor blog', '2026'];

    const ytResult = await uploadToYouTube(videoPath, ytTitle, ytDescription, ytTags);

    const updates = {
      status: 'completed',
      video_url: `/videos/${videoFileName}`,
      voiceover_url: combinedAudioPath,
      voiceover_duration: totalDuration,
      completed_at: new Date().toISOString(),
    };

    if (ytResult) {
      updates.youtube_video_id = ytResult.videoId;
      updates.youtube_url = ytResult.videoUrl;
    }

    await updateVideoStatus(video.id, updates);

    console.log(`   ✅ Vídeo concluído: ${video.product_title}`);
    if (ytResult) console.log(`   📺 YouTube: ${ytResult.videoUrl}`);

    if (fs.existsSync(audioDir)) fs.rmSync(audioDir, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`   ❌ Erro: ${message}`);
    await updateVideoStatus(video.id, {
      status: 'failed',
      error_message: message,
    });
  }
}

async function main() {
  const videoId = process.env.VIDEO_ID;

  console.log('🎬 Iniciando processamento de vídeos...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  if (videoId) {
    const { data, error } = await supabase
      .from('video_queue')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !data) {
      console.error(`   Vídeo ${videoId} não encontrado`);
      process.exit(1);
    }

    await processVideo(data);
  } else {
    const videos = await getPendingVideos(16);
    console.log(`   ${videos.length} vídeos pendentes encontrados`);

    for (const video of videos) {
      await processVideo(video);
    }
  }

  console.log('\n✅ Processamento concluído!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
