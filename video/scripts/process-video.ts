import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { generateVideoScript } from '../../src/lib/script-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para processar vídeos.');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

interface VideoQueueItem {
  id: string;
  product_url: string;
  review_url?: string;
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
  score?: number;
  affiliate_url: string;
  shortened_affiliate_url: string;
  script_text: string;
  script_hook: string;
  voiceover_url: string;
  voiceover_duration: number;
  media_assets: any;
  status: string;
  error_message: string;
  video_url: string;
  youtube_video_id: string;
  youtube_url: string;
  completed_at?: string;
}

async function updateVideoStatus(id: string, updates: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase
    .from('video_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Falha ao atualizar a fila do vídeo ${id}: ${error.message}`);
  if (!data) throw new Error(`A fila não retornou a linha ${id} após atualizar o status.`);
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}

async function loadReviewFacts(productData: VideoQueueItem): Promise<{ specifications: Record<string, string>; score?: number }> {
  const reviewUrl = typeof productData.review_url === 'string' ? productData.review_url : '';
  const slugPart = reviewUrl.includes('/reviews/') ? reviewUrl.split('/reviews/')[1] : '';
  const slug = slugPart.split('/')[0].split('?')[0].split('#')[0];
  if (!slug) return { specifications: {} };

  const { data, error } = await supabase
    .from('reviews')
    .select('specs,hero_overall_score')
    .eq('slug', slug)
    .maybeSingle();
  if (error) {
    console.warn('[video] Could not load verified review specifications; avoiding unsupported product claims:', error.message);
    return { specifications: {} };
  }

  let specs: unknown = data?.specs;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch { specs = []; }
  }
  const specifications: Record<string, string> = {};
  if (Array.isArray(specs)) {
    for (const item of specs) {
      if (!item || typeof item !== 'object') continue;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const value = typeof item.value === 'string' ? item.value.trim() : '';
      if (label && value && !/^não informado$/i.test(value)) specifications[label] = value;
    }
  }
  const score = Number(data?.hero_overall_score);
  return { specifications, ...(Number.isFinite(score) && score > 0 ? { score } : {}) };
}

async function generateScript(productData: VideoQueueItem): Promise<any> {
  const { specifications, score } = await loadReviewFacts(productData);
  if (score) productData.score = score;
  const url = (productData.product_url || '').toLowerCase();
  const marketplace = url.includes('amazon') ? 'Amazon' : url.includes('shopee') ? 'Shopee' : 'Mercado Livre';
  return generateVideoScript({
    title: productData.product_title,
    category: productData.product_category || 'Tecnologia',
    price: productData.product_price || 'consulte o preço atual',
    marketplace,
    specifications,
  });
}

async function generateVoiceover(script: any, outputDir: string): Promise<{ audioPath: string; duration: number }> {
  const fullText = [
    script.hook,
    ...script.scenes.map((s: any) => s.text),
    script.callToAction,
  ].join(' ');

  const outputPath = path.join(outputDir, 'voiceover.mp3');
  
  return new Promise((resolve, reject) => {
    const child = spawn('edge-tts', [
      '--text', fullText,
      '--voice', 'pt-BR-ThiagoNeural',
      '--rate', '+0%',
      '--write-media', outputPath,
    ]);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`edge-tts failed with code ${code}`));
        return;
      }
      const stats = fs.statSync(outputPath);
      const duration = Math.ceil(fullText.split(/\s+/).length / 150 * 60);
      resolve({ audioPath: outputPath, duration });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn edge-tts: ${err.message}`));
    });
  });
}

async function fetchBrollVideos(keywords: string[], outputDir: string): Promise<string[]> {
  if (!process.env.PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not set, skipping B-roll');
    return [];
  }

  const videos: string[] = [];
  
  for (const keyword of keywords.slice(0, 5)) {
    try {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=2&orientation=portrait`,
        { headers: { 'Authorization': process.env.PEXELS_API_KEY! } }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      for (const video of data.videos || []) {
        const videoFile = video.video_files?.find((f: any) => f.quality === 'hd') || video.video_files?.[0];
        if (!videoFile) continue;

        const ext = videoFile.file_type?.split('/')[1] || 'mp4';
        const filename = `broll-${keyword.replace(/\s+/g, '-')}-${Date.now()}.${ext}`;
        const localPath = path.join(outputDir, filename);
        
        await downloadFile(videoFile.link, localPath);
        videos.push(localPath);
      }
    } catch (err) {
      console.warn(`Failed to fetch B-roll for ${keyword}:`, err);
    }
  }

  return videos;
}

async function downloadProductImage(imageUrl: string, outputDir: string): Promise<string> {
  const ext = path.extname(new URL(imageUrl).pathname) || '.webp';
  const filename = `product-${Date.now()}${ext}`;
  const localPath = path.join(outputDir, filename);
  await downloadFile(imageUrl, localPath);
  return localPath;
}

async function prepareRemotionProps(videoData: any, script: any, voiceover: any, productImagePath: string, brollPaths: string[], videoId: string): Promise<any> {
  const fps = 30;
  const hookFrames = 3 * fps;

  const sceneSeconds = script.scenes.reduce((sum: number, scene: any) => sum + scene.duration, 0);
  const ctaStart = 3 + sceneSeconds + 4; // 3 s hook + scenes + 4 s score card

  const subtitleEntries = [
    { start: 0, end: 3, text: script.hook },
    ...script.scenes.map((scene: any, index: number) => {
      const previousSeconds = script.scenes.slice(0, index).reduce((sum: number, previous: any) => sum + previous.duration, 0);
      return { start: 3 + previousSeconds, end: 3 + previousSeconds + scene.duration, text: scene.text };
    }),
    { start: ctaStart, end: ctaStart + 4, text: script.callToAction },
  ];

  const scenesWithFrames = script.scenes.map((scene: any, index: number) => {
    const prevFrames = script.scenes.slice(0, index).reduce((sum: number, s: any) => sum + s.duration * fps, 0);
    return {
      ...scene,
      startFrame: hookFrames + prevFrames,
      endFrame: hookFrames + prevFrames + scene.duration * fps,
    };
  });

  const contentFrames = scenesWithFrames[scenesWithFrames.length - 1]?.endFrame - hookFrames || 0;
  const scoreFrames = 4 * fps;
  const ctaFrames = 4 * fps;
  const totalDurationFrames = hookFrames + contentFrames + scoreFrames + ctaFrames;
  const totalDuration = totalDurationFrames / fps;

  return {
    type: 'review',
    title: videoData.product_title,
    imageUrl: `/assets/product-${videoId}${path.extname(productImagePath) || '.webp'}`,
    score: typeof videoData.score === 'number' && Number.isFinite(videoData.score) && videoData.score > 0 ? videoData.score : 0,
    category: videoData.product_category,
    hook: script.hook,
    scenes: scenesWithFrames,
    callToAction: script.callToAction,
    audioUrl: '/assets/voiceover-' + videoId + '.mp3',
    reviewUrl: videoData.review_url || 'https://www.vetor.blog/reviews/',
    subtitleEntries,
    productImages: [`/assets/product-${videoId}${path.extname(productImagePath) || '.webp'}`],
    brollVideos: brollPaths,
    totalDuration,
    fps,
  };
}

async function renderVideo(propsPath: string, outputPath: string): Promise<string> {
  const videoRoot = path.resolve(__dirname, '..');
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'render-review', '--', propsPath], {
      cwd: videoRoot,
      env: { ...process.env, VIDEO_OUTPUT_DIR: outputDir },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Remotion render script exited with code ${code ?? 'unknown'}`));
        return;
      }

      const renderedFiles = fs.readdirSync(outputDir)
        .filter((name) => /^review-\d+\.mp4$/i.test(name))
        .map((name) => ({ path: path.join(outputDir, name), modified: fs.statSync(path.join(outputDir, name)).mtimeMs }))
        .sort((a, b) => b.modified - a.modified);
      const rendered = renderedFiles[0]?.path;
      if (!rendered || !fs.existsSync(rendered) || fs.statSync(rendered).size === 0) {
        reject(new Error('Remotion terminou sem produzir um arquivo MP4 válido.'));
        return;
      }
      try {
        if (rendered !== outputPath) fs.renameSync(rendered, outputPath);
        resolve(outputPath);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function uploadToYouTube(videoPath: string, title: string, description: string, tags: string[]): Promise<string> {
  const { google } = await import('googleapis');
  const { OAuth2Client } = await import('google-auth-library');

  const oauth2Client = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: description.slice(0, 5000),
        tags: tags.slice(0, 30),
        categoryId: '28',
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

  const uploadedId = response.data.id;
  if (!uploadedId) throw new Error('YouTube não retornou um ID para o vídeo enviado.');
  return uploadedId;
}

async function main() {
  const videoId = process.argv[2];
  const videoJsonPath = process.argv[3];

  if (!videoId || !videoJsonPath) {
    console.error('Usage: node process-video.js <video-id> <video-json-path>');
    process.exit(1);
  }

  if (!fs.existsSync(videoJsonPath)) {
    console.error(`Video JSON file not found: ${videoJsonPath}`);
    process.exit(1);
  }

  const videoData: VideoQueueItem = JSON.parse(fs.readFileSync(videoJsonPath, 'utf-8'));
  console.log(`Processing video: ${videoData.product_title} (${videoId})`);

  const workDir = path.resolve(__dirname, `../temp/${videoId}`);
  const assetsDir = path.join(workDir, 'assets');
  const outputPath = path.join(workDir, 'output.mp4');
  const propsPath = path.join(workDir, 'props.json');

  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(path.join(workDir, 'out'), { recursive: true });

  try {
    // Step 1: Generate script
    console.log('📝 Generating script...');
    const script = await generateScript(videoData);
    await updateVideoStatus(videoId, { script_text: JSON.stringify(script), script_hook: script.hook });

    // Step 2: Download product image
    console.log('📸 Downloading product image...');
    const productImagePath = await downloadProductImage(videoData.product_image_url, assetsDir);

    // Step 3: Generate voiceover
    console.log('🎙️ Generating voiceover...');
    const voiceover = await generateVoiceover(script, assetsDir);
    await updateVideoStatus(videoId, { voiceover_url: voiceover.audioPath, voiceover_duration: voiceover.duration });

    // Step 4: Fetch B-roll videos
    console.log('🎬 Fetching B-roll videos...');
    const allKeywords = script.scenes.flatMap((s: any) => s.brollKeywords);
    const brollPaths = await fetchBrollVideos(allKeywords, assetsDir);

    // Copy generated assets into the public directory bundled by Remotion.
    const publicAssetsDir = path.resolve(__dirname, '../public/assets');
    const publicBrollDir = path.join(publicAssetsDir, 'broll');
    fs.mkdirSync(publicAssetsDir, { recursive: true });
    fs.mkdirSync(publicBrollDir, { recursive: true });

    const productExtension = path.extname(productImagePath) || '.webp';
    const productAssetName = `product-${videoId}${productExtension}`;
    fs.copyFileSync(productImagePath, path.join(publicAssetsDir, productAssetName));
    fs.copyFileSync(voiceover.audioPath, path.join(publicAssetsDir, `voiceover-${videoId}.mp3`));
    const publicBrollPaths = brollPaths.map((broll, index) => {
      const extension = path.extname(broll) || '.mp4';
      const filename = `broll-${videoId}-${index}${extension}`;
      fs.copyFileSync(broll, path.join(publicBrollDir, filename));
      return `/assets/broll/${filename}`;
    });

    // Remotion reads assets from video/public, so props use the copied public paths.
    console.log('⚙️ Preparing Remotion props...');
    const props = await prepareRemotionProps(videoData, script, voiceover, productImagePath, publicBrollPaths, videoId);
    fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

    // Step 6: Render video
    console.log('🎞️ Rendering video with Remotion...');
    const finalVideoPath = await renderVideo(propsPath, outputPath);

    // Step 7: Upload to YouTube with the canonical review and actual purchase URL.
    console.log('📤 Uploading to YouTube...');
    const reviewUrl = typeof videoData.review_url === 'string' && videoData.review_url.startsWith('https://www.vetor.blog/reviews/')
      ? videoData.review_url
      : 'https://www.vetor.blog/reviews/';
    const purchaseUrl = videoData.shortened_affiliate_url || videoData.affiliate_url || videoData.product_url;
    const description = [
      script.hook,
      ...script.scenes.map((scene: any) => scene.text),
      script.callToAction,
      `Review completo: ${reviewUrl}`,
      purchaseUrl ? `Confira preço e condições: ${purchaseUrl}` : '',
      'Preço, estoque e condições podem mudar. Confirme as informações no anúncio antes de comprar.',
    ].filter(Boolean).join('\n\n');
    const youtubeId = await uploadToYouTube(
      finalVideoPath,
      `${videoData.product_title} - Review e vale a pena? #Shorts`,
      description,
      ['review', 'tech', videoData.product_category.toLowerCase(), 'vale a pena', 'shorts']
    );

    const youtubeUrl = `https://youtube.com/watch?v=${youtubeId}`;
    
    await updateVideoStatus(videoId, {
      status: 'completed',
      video_url: youtubeUrl,
      youtube_video_id: youtubeId,
      youtube_url: youtubeUrl,
      completed_at: new Date().toISOString(),
    });

    console.log(`✅ Video published: ${youtubeUrl}`);

  } catch (error) {
    console.error('❌ Error:', error);
    await updateVideoStatus(videoId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();