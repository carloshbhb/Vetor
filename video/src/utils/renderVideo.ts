import { bundle } from '@remotion/bundler';
import { renderMedia, getCompositions } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type InputProps = Record<string, unknown>;

interface ReviewVideoData {
  type: 'review';
  title: string;
  imageUrl: string;
  score: number;
  category: string;
  hook: string;
  scenes: VideoScene[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: SubtitleEntry[];
  productImages: string[];
  brollVideos: string[];
  totalDuration: number;
  fps: number;
  reviewUrl?: string;
}

interface ComparisonVideoData {
  type: 'comparison';
  title: string;
  product1: { name: string; imageUrl: string; score: number };
  product2: { name: string; imageUrl: string; score: number };
  categories: Array<{ label: string; score1: number; score2: number }>;
  winner: 0 | 1 | 2;
  hook: string;
  scenes: ComparisonSceneData[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: SubtitleEntry[];
  productImages: string[];
  brollVideos: string[];
  totalDuration: number;
  fps: number;
  comparisonUrl?: string;
}

type VideoData = ReviewVideoData | ComparisonVideoData;

async function renderVideo(data: VideoData, outputPath: string): Promise<string> {
  const projectRoot = path.resolve(__dirname, '../..');
  const bundleLocation = await bundle({
    entryPoint: path.resolve(projectRoot, 'src/Root.tsx'),
    webpackOverride: (config) => config,
    publicDir: path.resolve(projectRoot, 'public'),
  });

  // Copy all public directory contents recursively to bundle root
  function copyDirRecursive(src: string, dest: string) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  const publicDir = path.resolve(projectRoot, 'public');
  if (fs.existsSync(publicDir)) {
    copyDirRecursive(publicDir, bundleLocation);
  }

  const compositions = await getCompositions(bundleLocation, {
    inputProps: data as unknown as InputProps,
  });

  const compositionId = data.type === 'review' ? 'ReviewVideo' : 'ComparisonVideo';
  const composition = compositions.find((c) => c.id === compositionId);
  
  if (!composition) {
    throw new Error(`${compositionId} composition not found`);
  }

  const timestamp = Date.now();
  const prefix = data.type === 'review' ? 'review' : 'comparison';
  const outputLocation = path.resolve(outputPath, `${prefix}-${timestamp}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps: data as unknown as InputProps,
    crf: 18,
    codecOptions: {
      preset: 'slow',
      profile: 'high',
      level: '4.2',
      pix_fmt: 'yuv420p',
    },
    onStart: ({ command }) => {
      if (command) {
        console.log('FFmpeg command:', command.join(' '));
      }
    },
  });

  return outputLocation;
}

function calculateFrameTimings(scenes: VideoScene[], fps: number, hookFrames: number): VideoScene[] {
  let currentFrame = hookFrames;
  return scenes.map((scene) => {
    const startFrame = currentFrame;
    const endFrame = currentFrame + scene.duration * fps;
    currentFrame = endFrame;
    return { ...scene, startFrame, endFrame };
  });
}

function calculateComparisonFrameTimings(scenes: ComparisonSceneData[], fps: number, hookFrames: number): ComparisonSceneData[] {
  let currentFrame = hookFrames;
  return scenes.map((scene) => {
    const startFrame = currentFrame;
    const endFrame = currentFrame + scene.duration * fps;
    currentFrame = endFrame;
    return { ...scene, startFrame, endFrame };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] as 'review' | 'comparison';
  const dataPath = args[1];

  if (!type || !['review', 'comparison'].includes(type)) {
    console.error('Usage: tsx renderVideo.ts <review|comparison> [data-json-path]');
    process.exit(1);
  }

  const outputPath = path.resolve(process.env.VIDEO_OUTPUT_DIR || path.resolve(__dirname, '../../out'));
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const fps = 30;
  const hookFrames = 3 * fps;

  let videoData: VideoData;

  if (dataPath && fs.existsSync(dataPath)) {
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    if (type === 'review') {
      const scenesWithFrames = calculateFrameTimings(rawData.scenes, fps, hookFrames);
      const contentFrames = scenesWithFrames.reduce((max, s) => Math.max(max, s.endFrame), hookFrames) - hookFrames;
      const scoreFrames = 4 * fps;
      const ctaFrames = 4 * fps;
      const totalDuration = (hookFrames + contentFrames + scoreFrames + ctaFrames) / fps;

      videoData = {
        type: 'review',
        title: rawData.title,
        imageUrl: rawData.imageUrl,
        score: rawData.score,
        category: rawData.category,
        hook: rawData.hook,
        scenes: scenesWithFrames,
        callToAction: rawData.callToAction,
        audioUrl: rawData.audioUrl,
        subtitleEntries: rawData.subtitleEntries,
        reviewUrl: typeof rawData.reviewUrl === 'string' ? rawData.reviewUrl : 'https://www.vetor.blog/reviews/',
        productImages: rawData.productImages || [rawData.imageUrl],
        brollVideos: rawData.brollVideos || [],
        totalDuration,
        fps,
      };
    } else {
      const scenesWithFrames = calculateComparisonFrameTimings(rawData.scenes, fps, hookFrames);
      const contentFrames = scenesWithFrames.reduce((max, s) => Math.max(max, s.endFrame), hookFrames) - hookFrames;
      const verdictFrames = 5 * fps;
      const totalDuration = (hookFrames + contentFrames + verdictFrames) / fps;

      videoData = {
        type: 'comparison',
        title: rawData.title,
        product1: rawData.product1,
        product2: rawData.product2,
        categories: rawData.categories,
        winner: rawData.winner,
        comparisonUrl: typeof rawData.comparisonUrl === 'string' ? rawData.comparisonUrl : 'https://www.vetor.blog/comparativos/',
        hook: rawData.hook,
        scenes: scenesWithFrames,
        callToAction: rawData.callToAction,
        audioUrl: rawData.audioUrl,
        subtitleEntries: rawData.subtitleEntries,
        productImages: rawData.productImages || [rawData.product1.imageUrl, rawData.product2.imageUrl],
        brollVideos: rawData.brollVideos || [],
        totalDuration,
        fps,
      };
    }
  } else {
    console.log(`\n🎬 Rendering ${type} video with sample data...`);

    if (type === 'review') {
      const sampleScenes: VideoScene[] = [
        { id: 1, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?', duration: 5, visualCue: 'Produto em destaque com zoom dramático', brollKeywords: ['product reveal', 'tech unboxing'], startFrame: 0, endFrame: 0 },
        { id: 2, text: 'Confira preço, condições e a ficha técnica do modelo exato antes de comprar.', duration: 7, visualCue: 'Preço aparecendo na tela, transição para produto em mãos', brollKeywords: ['price tag', 'money', 'shopping'], startFrame: 0, endFrame: 0 },
        { id: 3, text: 'Design premium, construção sólida. Na mão passa confiança.', duration: 8, visualCue: 'Close nos detalhes, materiais, acabamento', brollKeywords: ['product close up', 'premium design', 'hands on'], startFrame: 0, endFrame: 0 },
        { id: 4, text: 'Compare os recursos documentados com as tarefas que você pretende realizar.', duration: 8, visualCue: 'Produto em uso real: apps, jogos, multitarefa', brollKeywords: ['performance test', 'gaming', 'multitasking'], startFrame: 0, endFrame: 0 },
        { id: 5, text: 'Confirme autonomia e carregamento na ficha técnica oficial da versão exata.', duration: 7, visualCue: 'Ícone de bateria, carregador, uso contínuo', brollKeywords: ['battery life', 'charging', 'all day'], startFrame: 0, endFrame: 0 },
        { id: 6, text: 'Confira o preço total e confirme o conteúdo da embalagem no anúncio.', duration: 7, visualCue: 'Lista de contras aparecendo, expressão de decepção leve', brollKeywords: ['cons list', 'disappointed', 'expensive'], startFrame: 0, endFrame: 0 },
        { id: 7, text: 'Veredito: decida com base nos recursos documentados e nas suas necessidades.', duration: 8, visualCue: 'Nota final na tela, produto ao lado de concorrentes', brollKeywords: ['verdict', 'rating', 'comparison'], startFrame: 0, endFrame: 0 },
      ];

      const scenesWithFrames = calculateFrameTimings(sampleScenes, fps, hookFrames);
      const contentFrames = scenesWithFrames[scenesWithFrames.length - 1].endFrame - hookFrames;
      const scoreFrames = 4 * fps;
      const ctaFrames = 4 * fps;
      const totalDuration = (hookFrames + contentFrames + scoreFrames + ctaFrames) / fps;

      const subtitleEntries: SubtitleEntry[] = [
        { start: 0, end: 3, text: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!' },
        ...sampleScenes.map((s, i) => {
          const start = 3 + sampleScenes.slice(0, i).reduce((sum, sc) => sum + sc.duration, 0);
          return { start, end: start + s.duration, text: s.text };
        }),
        { start: 3 + sampleScenes.reduce((sum, s) => sum + s.duration, 0), end: 3 + sampleScenes.reduce((sum, s) => sum + s.duration, 0) + 3, text: 'Confira preço e condições atuais no link da descrição.' },
      ];

      videoData = {
        type: 'review',
        title: 'Samsung Galaxy S24 Ultra',
        imageUrl: '/images/samsung-s24.png',
        score: 0,
        category: 'Smartphones',
        hook: 'Pare! Antes de comprar o Galaxy S24 Ultra, veja isso!',
        scenes: scenesWithFrames,
        callToAction: 'Confira preço e condições atuais no link da descrição.',
        audioUrl: '/audio/sample-review.mp3',
        subtitleEntries,
        productImages: ['/images/samsung-s24.png'],
        brollVideos: [],
        totalDuration,
        fps,
      };
    } else {
      const sampleScenes: ComparisonSceneData[] = [
        { id: 1, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?', duration: 4, visualCue: 'Dois produtos lado a lado', brollKeywords: ['smartphone comparison'], startFrame: 0, endFrame: 0, type: 'intro' },
        { id: 2, text: 'Confira na ficha oficial os recursos de tela, câmera e acessórios de cada modelo.', duration: 8, visualCue: 'Galaxy S24 em close, demonstrando features', brollKeywords: ['samsung galaxy', 'android phone'], startFrame: 0, endFrame: 0, type: 'product1' },
        { id: 3, text: 'Compare a compatibilidade e os recursos listados pelo fabricante para cada modelo.', duration: 8, visualCue: 'iPhone 15 em uso, demonstrando ecossistema', brollKeywords: ['iphone', 'apple ecosystem'], startFrame: 0, endFrame: 0, type: 'product2' },
        { id: 4, text: '', duration: 10, visualCue: 'Barras comparativas lado a lado', brollKeywords: ['comparison chart', 'vs'], startFrame: 0, endFrame: 0, type: 'comparison' },
        { id: 5, text: '', duration: 5, visualCue: 'Cartela final com critérios de escolha', brollKeywords: ['comparison verdict'], startFrame: 0, endFrame: 0, type: 'verdict' },
      ];

      const scenesWithFrames = calculateComparisonFrameTimings(sampleScenes, fps, hookFrames);
      const contentFrames = scenesWithFrames[scenesWithFrames.length - 1].endFrame - hookFrames;
      const verdictFrames = 5 * fps;
      const totalDuration = (hookFrames + contentFrames + verdictFrames) / fps;

      const subtitleEntries: SubtitleEntry[] = [
        { start: 0, end: 3, text: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?' },
        { start: 3, end: 11, text: 'Confira na ficha oficial os recursos de tela, câmera e acessórios de cada modelo.' },
        { start: 11, end: 19, text: 'Compare a compatibilidade e os recursos listados pelo fabricante para cada modelo.' },
        { start: 19, end: 29, text: 'Comparando design, câmera, desempenho, bateria e custo-benefício.' },
        { start: 29, end: 34, text: 'A escolha depende dos critérios documentados e do seu perfil de uso.' },
        { start: 34, end: 37, text: 'Confira preço e condições atuais no link da descrição.' },
      ];

      videoData = {
        type: 'comparison',
        title: 'Galaxy S24 vs iPhone 15: Qual Comprar em 2026?',
        product1: { name: 'Galaxy S24', imageUrl: '/images/samsung-s24.png', score: 0 },
        product2: { name: 'iPhone 15', imageUrl: '/images/iphone15.png', score: 0 },
        categories: []
        winner: 0,
        comparisonUrl: 'https://www.vetor.blog/comparativos/',
        hook: 'Galaxy S24 vs iPhone 15 - qual comprar em 2026?',
        scenes: scenesWithFrames,
        callToAction: 'Confira a análise completa!',
        audioUrl: '/audio/sample-comparison.mp3',
        subtitleEntries,
        productImages: ['/images/samsung-s24.png', '/images/iphone15.png'],
        brollVideos: [],
        totalDuration,
        fps,
      };
    }
  }

  try {
    console.log(`\n🎬 Rendering ${type} video...`);
    console.log(`   Title: ${videoData.title}`);
    console.log(`   Duration: ${videoData.totalDuration.toFixed(1)}s`);
    console.log(`   Scenes: ${videoData.scenes.length}`);
    console.log(`   B-roll videos: ${videoData.brollVideos.length}`);
    console.log(`   Audio: ${videoData.audioUrl}`);

    const outputLocation = await renderVideo(videoData, outputPath);

    console.log(`✅ Video rendered successfully: ${outputLocation}`);
  } catch (error) {
    console.error('❌ Error rendering video:', error);
    process.exit(1);
  }
}

main();