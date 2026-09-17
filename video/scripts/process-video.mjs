import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface VideoQueueItem {
  id: string;
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
  product_url: string;
  script_text: string;
  script_hook: string;
  status: string;
}

interface VideoScript {
  hook: string;
  scenes: Array<{
    id: number;
    text: string;
    duration: number;
    visualCue: string;
    brollKeywords: string[];
  }>;
  totalDuration: number;
  callToAction: string;
}

async function getPendingVideos(limit = 5): Promise<VideoQueueItem[]> {
  const { data, error } = await supabase
    .from('video_queue')
    .select('*')
    .eq('status', 'pending')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as VideoQueueItem[];
}

async function updateVideoStatus(id: string, updates: Record<string, unknown>) {
  await supabase
    .from('video_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function generateVoiceover(text: string, outputPath: string): Promise<number> {
  const voice = 'pt-BR-ThiagoNeural';
  const tempFile = outputPath.replace('.mp3', '-temp.mp3');

  try {
    execSync(
      `edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tempFile}"`,
      { stdio: 'pipe', timeout: 30000 }
    );

    // Get audio duration using ffprobe
    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tempFile}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();

    const duration = parseFloat(durationStr) || 5;

    // Rename temp to final
    fs.renameSync(tempFile, outputPath);
    return duration;
  } catch (error) {
    console.error('TTS error:', error);
    // Cleanup temp file if it exists
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    return 5;
  }
}

async function combineAudioFiles(audioFiles: string[], outputPath: string) {
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

async function renderWithRemotion(videoData: unknown, outputPath: string) {
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

async function processVideo(video: VideoQueueItem) {
  console.log(`\n🎬 Processando: ${video.product_title}`);
  console.log(`   ID: ${video.id}`);
  console.log(`   Hook: ${video.script_hook}`);

  await updateVideoStatus(video.id, { status: 'processing', started_at: new Date().toISOString() });

  try {
    // Parse script
    let script: VideoScript;
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

    // Step 1: Generate voiceover
    console.log('   [1/3] Gerando voiceover...');
    const audioDir = path.resolve(`/tmp/video-${video.id}`);
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const audioFiles: string[] = [];
    let totalDuration = 0;

    // Generate hook audio
    const hookAudioPath = path.join(audioDir, 'hook.mp3');
    const hookDuration = await generateVoiceover(script.hook, hookAudioPath);
    audioFiles.push(hookAudioPath);
    totalDuration += hookDuration;

    // Generate scene audio
    for (const scene of script.scenes) {
      const sceneAudioPath = path.join(audioDir, `scene-${scene.id}.mp3`);
      const duration = await generateVoiceover(scene.text, sceneAudioPath);
      audioFiles.push(sceneAudioPath);
      totalDuration += duration;
    }

    // Generate CTA audio
    const ctaAudioPath = path.join(audioDir, 'cta.mp3');
    const ctaDuration = await generateVoiceover(script.callToAction, ctaAudioPath);
    audioFiles.push(ctaAudioPath);
    totalDuration += ctaDuration;

    // Combine audio
    console.log('   [2/3] Combinando áudio...');
    const combinedAudioPath = path.join(audioDir, 'combined.mp3');
    await combineAudioFiles(audioFiles, combinedAudioPath);

    // Step 3: Render video
    console.log('   [3/3] Renderizando vídeo com Remotion...');
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
            const sceneAudio = audioFiles[i + 1];
            const sceneDuration = fs.existsSync(sceneAudio) ? 5 : s.duration;
            return sum + sceneDuration;
          }, 0);
          return { start, end: start + 5, text: scene.text };
        }),
      ],
      productImages: [video.product_image_url],
      brollVideos: [],
      totalDuration,
      fps,
    };

    await renderWithRemotion(videoData, path.join(outputDir, `video-${video.id}.mp4`));

    // Update status
    await updateVideoStatus(video.id, {
      status: 'completed',
      video_url: `/videos/video-${video.id}.mp4`,
      voiceover_url: combinedAudioPath,
      voiceover_duration: totalDuration,
      completed_at: new Date().toISOString(),
    });

    console.log(`   ✅ Vídeo concluído: ${video.product_title}`);

    // Cleanup
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
    // Process specific video
    const { data, error } = await supabase
      .from('video_queue')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !data) {
      console.error(`   Vídeo ${videoId} não encontrado`);
      process.exit(1);
    }

    await processVideo(data as VideoQueueItem);
  } else {
    // Process all pending videos
    const videos = await getPendingVideos(5);
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
