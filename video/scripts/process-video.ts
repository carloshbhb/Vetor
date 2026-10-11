import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { generateVideoScript, generateComparisonVideoScript, type VideoScript, type ComparisonVideoScript } from '../../src/lib/script-generator';

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

interface ComparisonArticleForVideo {
  slug: string;
  title: string;
  category: string;
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}

async function loadComparisonArticle(videoData: VideoQueueItem): Promise<ComparisonArticleForVideo> {
  let canonical: URL;
  try {
    canonical = new URL(String(videoData.review_url || ''));
  } catch {
    throw new Error('URL do comparativo inválida na fila de vídeos.');
  }
  if (canonical.protocol !== 'https:' || canonical.hostname !== 'www.vetor.blog' || !canonical.pathname.startsWith('/comparativos/')) {
    throw new Error('O worker de comparativos só aceita URLs canônicas HTTPS do Vetor.blog.');
  }
  const slug = canonical.pathname.slice('/comparativos/'.length).split('/')[0];
  if (!slug) throw new Error('Slug do comparativo ausente na URL canônica.');

  const { data, error } = await supabase
    .from('viral_articles')
    .select('slug,title,category,products')
    .eq('slug', decodeURIComponent(slug))
    .maybeSingle();
  if (error) throw new Error('Não foi possível carregar o comparativo: ' + error.message);
  if (!data) throw new Error('O artigo comparativo não existe mais no Supabase.');

  let rawProducts: unknown = data.products;
  if (typeof rawProducts === 'string') {
    try { rawProducts = JSON.parse(rawProducts); } catch { rawProducts = []; }
  }
  if (!Array.isArray(rawProducts) || rawProducts.length < 2) {
    throw new Error('O comparativo precisa ter pelo menos dois produtos.');
  }
  const products = rawProducts.slice(0, 2).map((product: any) => {
    let imageUrl = '';
    try {
      const parsed = new URL(String(product?.imageUrl || ''));
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') imageUrl = parsed.toString();
    } catch { /* invalid images are rejected below */ }
    const productUrl = typeof product?.product_url === 'string' ? product.product_url : '';
    return {
      name: typeof product?.name === 'string' ? product.name.trim() : '',
      slug: typeof product?.slug === 'string' ? product.slug : '',
      imageUrl,
      ...(productUrl ? { product_url: productUrl } : {}),
    };
  });
  if (products.some((product: ComparisonArticleForVideo['products'][number]) => !product.name || !product.imageUrl)) {
    throw new Error('O comparativo contém um produto sem nome ou imagem HTTP(S) válida.');
  }

  return {
    slug: String(data.slug),
    title: typeof data.title === 'string' ? data.title : videoData.product_title,
    category: typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'Tecnologia',
    products,
  };
}

async function generateComparisonScript(
  videoData: VideoQueueItem,
  article: ComparisonArticleForVideo
): Promise<ComparisonVideoScript> {
  return generateComparisonVideoScript({
    title: article.title || videoData.product_title,
    category: article.category || videoData.product_category || 'Tecnologia',
    product1: { name: article.products[0].name },
    product2: { name: article.products[1].name },
    comparisonUrl: String(videoData.review_url),
  });
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

async function prepareComparisonRemotionProps(
  videoData: VideoQueueItem,
  article: ComparisonArticleForVideo,
  script: ComparisonVideoScript,
  productImage1Path: string,
  productImage2Path: string,
  brollPaths: string[],
  videoId: string
): Promise<any> {
  const fps = 30;
  const hookFrames = 3 * fps;
  const sceneSeconds = script.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const scenesWithFrames = script.scenes.map((scene, index) => {
    const previousFrames = script.scenes.slice(0, index).reduce((sum, previous) => sum + previous.duration * fps, 0);
    return {
      ...scene,
      startFrame: hookFrames + previousFrames,
      endFrame: hookFrames + previousFrames + scene.duration * fps,
    };
  });
  const subtitleEntries = [
    { start: 0, end: 3, text: script.hook },
    ...script.scenes.map((scene, index) => {
      const previousSeconds = script.scenes.slice(0, index).reduce((sum, previous) => sum + previous.duration, 0);
      return { start: 3 + previousSeconds, end: 3 + previousSeconds + scene.duration, text: scene.text };
    }),
    { start: 3 + sceneSeconds, end: 3 + sceneSeconds + 5, text: script.callToAction },
  ];
  const image1Extension = path.extname(productImage1Path) || '.webp';
  const image2Extension = path.extname(productImage2Path) || '.webp';
  const image1Url = '/assets/product-' + videoId + '-1' + image1Extension;
  const image2Url = '/assets/product-' + videoId + '-2' + image2Extension;
  return {
    type: 'comparison',
    title: videoData.product_title || article.title,
    product1: { name: article.products[0].name, imageUrl: image1Url, score: 0 },
    product2: { name: article.products[1].name, imageUrl: image2Url, score: 0 },
    categories: [],
    winner: 0,
    comparisonUrl: videoData.review_url,
    hook: script.hook,
    scenes: scenesWithFrames,
    callToAction: script.callToAction,
    audioUrl: '/assets/voiceover-' + videoId + '.mp3',
    subtitleEntries,
    productImages: [image1Url, image2Url],
    brollVideos: brollPaths,
    totalDuration: 3 + sceneSeconds + 5,
    fps,
  };
}

async function renderVideo(propsPath: string, outputPath: string, type: 'review' | 'comparison'): Promise<string> {
  const videoRoot = path.resolve(__dirname, '..');
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const scriptName = type === 'comparison' ? 'render-comparison' : 'render-review';
    const child = spawn('npm', ['run', scriptName, '--', propsPath], {
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
        .filter((name) => {
          const suffix = name.slice(type.length + 1);
          return name.startsWith(type + '-') && /^\d+\.mp4$/i.test(suffix);
        })
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
    console.error('Usage: tsx process-video.ts <video-id> <video-json-path>');
    process.exit(1);
  }
  if (!fs.existsSync(videoJsonPath)) {
    console.error(`Video JSON file not found: ${videoJsonPath}`);
    process.exit(1);
  }

  const videoData: VideoQueueItem = JSON.parse(fs.readFileSync(videoJsonPath, 'utf-8'));
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(String(videoData.review_url || ''));
  } catch {
    throw new Error('URL canônica do conteúdo inválida na fila.');
  }
  if (sourceUrl.protocol !== 'https:' || sourceUrl.hostname !== 'www.vetor.blog') {
    throw new Error('O worker aceita apenas URLs HTTPS canônicas do Vetor.blog.');
  }
  const isComparison = sourceUrl.pathname.startsWith('/comparativos/');
  if (!isComparison && !sourceUrl.pathname.startsWith('/reviews/')) {
    throw new Error('O tipo de conteúdo da URL deve ser review ou comparativo.');
  }
  console.log(`Processing ${isComparison ? 'comparison' : 'review'} video: ${videoData.product_title} (${videoId})`);

  const workDir = path.resolve(__dirname, `../temp/${videoId}`);
  const assetsDir = path.join(workDir, 'assets');
  const outputPath = path.join(workDir, 'output.mp4');
  const propsPath = path.join(workDir, 'props.json');
  fs.mkdirSync(assetsDir, { recursive: true });

  try {
    const comparisonArticle = isComparison ? await loadComparisonArticle(videoData) : null;

    console.log('📝 Generating fact-safe script...');
    const script: VideoScript | ComparisonVideoScript = comparisonArticle
      ? await generateComparisonScript(videoData, comparisonArticle)
      : await generateScript(videoData);
    await updateVideoStatus(videoId, { script_text: JSON.stringify(script), script_hook: script.hook });

    console.log('📸 Downloading product image(s)...');
    const productImage1Url = comparisonArticle ? comparisonArticle.products[0].imageUrl : videoData.product_image_url;
    const productImage1Path = await downloadProductImage(productImage1Url, assetsDir);
    const productImage2Path = comparisonArticle
      ? await downloadProductImage(comparisonArticle.products[1].imageUrl, assetsDir)
      : null;

    console.log('🎙️ Generating voiceover...');
    const voiceover = await generateVoiceover(script, assetsDir);
    await updateVideoStatus(videoId, { voiceover_url: voiceover.audioPath, voiceover_duration: voiceover.duration });

    console.log('🎬 Fetching B-roll videos...');
    const allKeywords = script.scenes.flatMap((scene: any) => scene.brollKeywords);
    const brollPaths = await fetchBrollVideos(allKeywords, assetsDir);

    const publicAssetsDir = path.resolve(__dirname, '../public/assets');
    const publicBrollDir = path.join(publicAssetsDir, 'broll');
    fs.mkdirSync(publicAssetsDir, { recursive: true });
    fs.mkdirSync(publicBrollDir, { recursive: true });

    const product1Extension = path.extname(productImage1Path) || '.webp';
    const product1AssetName = isComparison
      ? `product-${videoId}-1${product1Extension}`
      : `product-${videoId}${product1Extension}`;
    fs.copyFileSync(productImage1Path, path.join(publicAssetsDir, product1AssetName));

    if (productImage2Path) {
      const product2Extension = path.extname(productImage2Path) || '.webp';
      fs.copyFileSync(productImage2Path, path.join(publicAssetsDir, `product-${videoId}-2${product2Extension}`));
    }
    fs.copyFileSync(voiceover.audioPath, path.join(publicAssetsDir, `voiceover-${videoId}.mp3`));
    const publicBrollPaths = brollPaths.map((broll, index) => {
      const extension = path.extname(broll) || '.mp4';
      const filename = `broll-${videoId}-${index}${extension}`;
      fs.copyFileSync(broll, path.join(publicBrollDir, filename));
      return `/assets/broll/${filename}`;
    });

    console.log('⚙️ Preparing Remotion props...');
    const props = comparisonArticle && script && productImage2Path
      ? await prepareComparisonRemotionProps(videoData, comparisonArticle, script as ComparisonVideoScript, productImage1Path, productImage2Path, publicBrollPaths, videoId)
      : await prepareRemotionProps(videoData, script as VideoScript, voiceover, productImage1Path, publicBrollPaths, videoId);
    fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));

    console.log('🎞️ Rendering video with Remotion...');
    const finalVideoPath = await renderVideo(propsPath, outputPath, isComparison ? 'comparison' : 'review');

    console.log('📤 Uploading to YouTube...');
    const canonicalContentUrl = isComparison
      ? `https://www.vetor.blog/comparativos/${comparisonArticle?.slug || ''}/`
      : `https://www.vetor.blog/reviews/${sourceUrl.pathname.split('/reviews/')[1]?.split('/')[0] || ''}/`;
    const purchaseLinks = comparisonArticle
      ? comparisonArticle.products.map((product, index) => {
          const productUrl = product.product_url || '';
          return productUrl.startsWith('https://') || productUrl.startsWith('http://')
            ? `Produto ${index + 1} — ${product.name}: ${productUrl}`
            : '';
        }).filter(Boolean)
      : [videoData.shortened_affiliate_url || videoData.affiliate_url || videoData.product_url]
          .filter((url): url is string => {
            if (typeof url !== 'string') return false;
            try {
              const parsed = new URL(url);
              return parsed.protocol === 'https:' || parsed.protocol === 'http:';
            } catch {
              return false;
            }
          })
          .map((url) => `Confira preço e condições atuais: ${url}`);
    const description = [
      script.hook,
      ...script.scenes.map((scene: any) => scene.text),
      script.callToAction,
      `Conteúdo completo: ${canonicalContentUrl}`,
      ...purchaseLinks,
      'Preço, estoque e condições podem mudar. Confirme as informações nos anúncios antes de comprar.',
    ].filter(Boolean).join('\n\n');
    const youtubeTitle = isComparison
      ? `${comparisonArticle?.title || videoData.product_title} — comparativo e como escolher #Shorts`
      : `${videoData.product_title} — review e vale a pena? #Shorts`;
    const categoryTag = (videoData.product_category || 'tecnologia').toLowerCase();
    const youtubeId = await uploadToYouTube(
      finalVideoPath,
      youtubeTitle,
      description,
      ['review', 'tech', categoryTag, isComparison ? 'comparativo' : 'vale a pena', 'shorts']
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
    try {
      await updateVideoStatus(videoId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
      });
    } catch (statusError) {
      console.error('[video-worker] Could not persist failed status:', statusError);
    }
    process.exit(1);
  } finally {
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch { /* best-effort cleanup */ }
  }
}

main();
