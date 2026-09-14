import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VideoQueueItem {
  id: string;
  product_url: string;
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
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
}

async function updateVideoStatus(id: string, updates: Partial<VideoQueueItem>) {
  await supabase
    .from('video_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}

async function generateScript(productData: any): Promise<any> {
  const prompt = `Crie um roteiro de vídeo curto (60-90 segundos) para o produto "${productData.product_title}" focado em conversão para YouTube Shorts/Reels/TikTok.

PRODUTO:
- Título: ${productData.product_title}
- Categoria: ${productData.product_category}
- Preço: ${productData.product_price}
- Marketplace: ${productData.product_url.includes('amazon') ? 'Amazon' : productData.product_url.includes('shopee') ? 'Shopee' : 'Mercado Livre'}

ESTRUTURA OBRIGATÓRIA (JSON):
{
  "hook": "Frase de impacto nos primeiros 3 segundos (máx 20 palavras)",
  "scenes": [
    {
      "id": 1,
      "text": "Narração da cena 1 (máx 30 palavras)",
      "duration": 5,
      "visualCue": "Descrição visual",
      "brollKeywords": ["palavra-chave1", "palavra-chave2"]
    }
  ],
  "totalDuration": 60,
  "callToAction": "Link na bio/Descrição para comprar com desconto!"
}

REGRAS:
1. Hook deve ser irresistível: problema, curiosidade ou benefício imediato
2. 5-7 cenas no total, cada uma com 5-10 segundos
3. Texto conversacional, direto, tom de especialista
4. visualCue deve sugerir: produto em uso, detalhes, comparação, lifestyle
5. brollKeywords para buscar vídeos de estoque no Pexels
6. callToAction direto para link de afiliado
7. Total entre 60-90 segundos
8. Responda APENAS o JSON válido`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: 'Você é um roteirista especialista em vídeos virais de review tech. Responda APENAS em JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
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

async function prepareRemotionProps(videoData: any, script: any, voiceover: any, productImagePath: string, brollPaths: string[]): Promise<any> {
  const fps = 30;
  const hookFrames = 3 * fps;

  const subtitleEntries = [
    { start: 0, end: 3, text: script.hook },
    ...script.scenes.map((s: any, i: number) => {
      const prevDuration = script.scenes.slice(0, i).reduce((sum: number, sc: any) => sum + sc.duration, 0);
      return { start: 3 + prevDuration, end: 3 + prevDuration + s.duration, text: s.text };
    }),
    { start: 3 + script.scenes.reduce((sum: number, s: any) => sum + s.duration, 0), end: 3 + script.scenes.reduce((sum: number, s: any) => sum + s.duration, 0) + 3, text: script.callToAction },
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
  const totalDuration = (hookFrames + contentFrames + scoreFrames + ctaFrames) / fps;

  return {
    type: 'review',
    title: videoData.product_title,
    imageUrl: videoData.product_image_url,
    score: 8.5,
    category: videoData.product_category,
    hook: script.hook,
    scenes: scenesWithFrames,
    callToAction: script.callToAction,
    audioUrl: `/assets/voiceover.mp3`,
    subtitleEntries,
    productImages: [productImagePath],
    brollVideos: brollPaths,
    totalDuration,
    fps,
  };
}

async function renderVideo(propsPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['remotion', 'render', 'ReviewVideo', outputPath, `--props=${propsPath}`], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Remotion render failed with code ${code}`));
        return;
      }
      resolve(outputPath);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn remotion: ${err.message}`));
    });
  });
}

async function uploadToYouTube(videoPath: string, title: string, description: string, tags: string[]): Promise<string> {
  const { google } = await import('googleapis');
  const { OAuth2Client } = google.auth;

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

  return response.data.id || '';
}

async function main() {
  const videoId = process.argv[2];
  const videoJson = process.argv[3];

  if (!videoId || !videoJson) {
    console.error('Usage: node process-video.js <video-id> <video-json>');
    process.exit(1);
  }

  const videoData: VideoQueueItem = JSON.parse(videoJson);
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

    // Step 5: Prepare Remotion props
    console.log('⚙️ Preparing Remotion props...');
    const props = await prepareRemotionProps(videoData, script, voiceover, productImagePath, brollPaths);
    fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

    // Copy assets to public folder for Remotion
    const publicAssetsDir = path.resolve(__dirname, '../../public/assets');
    fs.mkdirSync(publicAssetsDir, { recursive: true });
    fs.mkdirSync(path.join(publicAssetsDir, 'broll'), { recursive: true });
    
    fs.copyFileSync(productImagePath, path.join(publicAssetsDir, `product-${videoId}.webp`));
    fs.copyFileSync(voiceover.audioPath, path.join(publicAssetsDir, `voiceover-${videoId}.mp3`));
    
    brollPaths.forEach((broll, i) => {
      fs.copyFileSync(broll, path.join(publicAssetsDir, 'broll', `broll-${videoId}-${i}.mp4`));
    });

    // Step 6: Render video
    console.log('🎞️ Rendering video with Remotion...');
    const finalVideoPath = await renderVideo(propsPath, outputPath);

    // Step 7: Upload to YouTube
    console.log('📤 Uploading to YouTube...');
    const youtubeId = await uploadToYouTube(
      finalVideoPath,
      `${videoData.product_title} - Review Completo`,
      `${script.hook}\n\n${script.scenes.map((s: any) => s.text).join('\n\n')}\n\n${script.callToAction}\n\nCompre aqui: ${videoData.shortened_affiliate_url || videoData.affiliate_url}`,
      ['review', 'tech', videoData.product_category.toLowerCase(), 'unboxing', 'vale a pena']
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