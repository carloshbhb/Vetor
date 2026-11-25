import type { EditorialScene, EditorialSubtitle } from '../compositions/EditorialReview';
import type { ComparisonSceneData, SubtitleEntry } from '../compositions/ComparisonVideo';
import { resolveSceneTimings } from './timing';
import { planVetorSceneMixes } from '../../scripts/visual-sequence-planner.mjs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, ensureBrowser } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type InputProps = Record<string, unknown>;

interface ReviewVideoData {
  type: 'review' | 'long';
  templateId?: string;
  title: string;
  imageUrl: string;
  score: number;
  category: string;
  hook: string;
  hookDuration: number;
  scenes: EditorialScene[];
  callToAction: string;
  audioUrl: string;
  subtitleEntries: EditorialSubtitle[];
  productImages: string[];
  productModelUrl?: string;
  brollVideos: string[];
  totalDuration: number;
  fps: number;
  reviewUrl?: string;
  musicUrl?: string;
  visualTemplateId?: string;
  openingCreativeDirection?: import('../compositions/SceneCreativeTreatment').SceneCreativeDirection;
  closingCreativeDirection?: import('../compositions/SceneCreativeTreatment').SceneCreativeDirection;
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
  openingCreativeDirection?: import('../compositions/SceneCreativeTreatment').SceneCreativeDirection;
  closingCreativeDirection?: import('../compositions/SceneCreativeTreatment').SceneCreativeDirection;
}

type VideoData = ReviewVideoData | ComparisonVideoData;

async function renderVideo(data: VideoData, outputPath: string): Promise<string> {
  const projectRoot = path.resolve(__dirname, '../..');
  // REMOTION_CHROME_PATH aponta para um Chrome já instalado (ex.: setup-chrome no CI);
  // sem ele o Remotion usa/baixa o Chrome Headless Shell do cache do projeto.
  const browserExecutable = process.env.REMOTION_CHROME_PATH || null;
  // 'chrome-for-testing' para um Chrome comum; vazio = Chrome Headless Shell do Remotion.
  const chromeMode = process.env.REMOTION_CHROME_MODE === 'chrome-for-testing' ? 'chrome-for-testing' : undefined;
  if (browserExecutable) {
    console.log('[Remotion] Usando Chrome em ' + browserExecutable + '.');
  } else {
    console.log('[Remotion] Confirmando Chrome Headless Shell local no cache do projeto...');
    await ensureBrowser({ logLevel: 'info' });
  }
  console.log('[Remotion] Chrome pronto. Verificando bundle reutilizável...');

  // Each queue item runs in a fresh Node process. Keep one deterministic bundle
  // in video/out so all 15 Shorts in the same GitHub Actions job avoid rebuilding
  // the identical React/Remotion application for every product.
  const fingerprint = createHash('sha256');
  const hashDirectory = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    const visit = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const absolute = path.join(current, entry.name);
        const relative = path.relative(projectRoot, absolute).split(path.sep).join('/');
        fingerprint.update(relative + '\\0');
        if (entry.isDirectory()) visit(absolute);
        else if (entry.isFile()) fingerprint.update(fs.readFileSync(absolute));
      }
    };
    visit(directory);
  };
  hashDirectory(path.resolve(projectRoot, 'src'));
  hashDirectory(path.resolve(projectRoot, 'public'));
  for (const file of ['package-lock.json', 'remotion.config.ts', 'tsconfig.json']) {
    const absolute = path.resolve(projectRoot, file);
    if (fs.existsSync(absolute)) {
      fingerprint.update(file + '\\0');
      fingerprint.update(fs.readFileSync(absolute));
    }
  }

  const bundleFingerprint = fingerprint.digest('hex').slice(0, 20);
  const bundleCacheRoot = path.resolve(projectRoot, 'out', '.remotion-bundle-cache');
  const bundleLocation = path.join(bundleCacheRoot, bundleFingerprint);
  const bundleIndex = path.join(bundleLocation, 'index.html');
  const bundleStartedAt = Date.now();

  if (fs.existsSync(bundleIndex)) {
    console.log('[Remotion] Bundle cache HIT (' + bundleFingerprint + '); pulando webpack.');
  } else {
    console.log('[Remotion] Bundle cache MISS (' + bundleFingerprint + '); compilando uma vez para este lote.');
    fs.rmSync(bundleCacheRoot, { recursive: true, force: true });
    fs.mkdirSync(bundleCacheRoot, { recursive: true });
    await bundle({
      entryPoint: path.resolve(projectRoot, 'src/Root.tsx'),
      outDir: bundleLocation,
      webpackOverride: (config) => config,
      publicDir: path.resolve(projectRoot, 'public'),
    });
    if (!fs.existsSync(bundleIndex)) {
      throw new Error('[Remotion] Webpack terminou sem gerar index.html no bundle persistente.');
    }
    console.log('[Remotion] Bundle compilado em ' + ((Date.now() - bundleStartedAt) / 1000).toFixed(1) + 's.');
  }

  const compositionId = data.type === 'comparison'
    ? 'ComparisonVideo'
    : data.templateId === 'stickman-review'
      ? 'StickmanReviewLandscape'
      : data.type === 'long' ? 'LongReviewVideo' : 'ReviewVideo';
  // selectComposition avalia calculateMetadata com as props reais, então a duração do MP4
  // acompanha totalDuration (a narração) em vez do valor fixo do <Composition>.
  const selectStartedAt = Date.now();
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: data as unknown as InputProps,
    browserExecutable,
    chromeMode,
  });
  console.log('[Remotion] Composição selecionada em ' + ((Date.now() - selectStartedAt) / 1000).toFixed(1) + 's.');

  const timestamp = Date.now();
  const prefix = data.type === 'long' ? 'long-review' : data.type === 'review' ? 'review' : 'comparison';
  const outputLocation = path.resolve(outputPath, `${prefix}-${timestamp}.mp4`);

  const renderStartedAt = Date.now();
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps: data as unknown as InputProps,
    browserExecutable,
    chromeMode,
    crf: 18,
    // yuv420p + bt709: faixa limitada, o que o YouTube e os celulares decodificam corretamente.
    pixelFormat: 'yuv420p',
    colorSpace: 'bt709',
    // "fast" preserves CRF 18 visual quality while reducing CPU spent in x264
    // on GitHub-hosted runners; frame rendering and visual QA remain unchanged.
    x264Preset: 'fast',
    audioBitrate: '192k',
    enforceAudioTrack: true,
    imageFormat: 'jpeg',
    jpegQuality: 95,
    concurrency: Math.max(1, Number(process.env.REMOTION_CONCURRENCY) || 2),
    timeoutInMilliseconds: 90000,
    onStart: ({ frameCount, resolvedConcurrency }) => {
      console.log('[Remotion] Render iniciado: ' + frameCount + ' frames; concorrência=' + resolvedConcurrency + '.');
    },
  });
  console.log('[Remotion] Render concluído em ' + ((Date.now() - renderStartedAt) / 1000).toFixed(1) +
    's; bundle=' + (fs.existsSync(bundleIndex) ? 'persistente' : 'temporário') + '.');

  return outputLocation;
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
  const type = args[0] as 'review' | 'long' | 'comparison';
  const dataPath = args[1];

  if (!type || !['review', 'long', 'comparison'].includes(type)) {
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
    
    if (type === 'review' || type === 'long') {
      // O worker envia startFrame/endFrame medidos na narração real e totalDuration = duração
      // do áudio. Esses valores têm prioridade; as durações nominais do roteiro só valem
      // quando não há tempo exato (amostras e execuções manuais).
      const timings = resolveSceneTimings<EditorialScene>(
        { scenes: rawData.scenes, totalDuration: rawData.totalDuration, hookDuration: rawData.hookDuration },
        fps,
        { defaultHookSeconds: 3, tailSeconds: 8 },
      );
      console.log('[Remotion] Tempos de cena: ' + (timings.exact ? 'exatos da narração' : 'nominais do roteiro (sem tempo exato)') + '.');

      videoData = {
        type,
        templateId: typeof rawData.templateId === 'string' ? rawData.templateId : undefined,
        visualTemplateId: typeof rawData.visualTemplateId === 'string' ? rawData.visualTemplateId : undefined,
        openingCreativeDirection: rawData.openingCreativeDirection,
        closingCreativeDirection: rawData.closingCreativeDirection,
        title: rawData.title,
        imageUrl: rawData.imageUrl,
        score: rawData.score,
        category: rawData.category,
        hook: rawData.hook,
        hookDuration: timings.hookDuration,
        scenes: timings.scenes,
        callToAction: rawData.callToAction,
        audioUrl: rawData.audioUrl,
        subtitleEntries: rawData.subtitleEntries,
        reviewUrl: typeof rawData.reviewUrl === 'string' ? rawData.reviewUrl : 'https://www.vetor.blog/reviews/',
        productImages: rawData.productImages || [rawData.imageUrl],
        productModelUrl: typeof rawData.productModelUrl === 'string' ? rawData.productModelUrl : undefined,
        brollVideos: rawData.brollVideos || [],
        musicUrl: typeof rawData.musicUrl === 'string' && rawData.musicUrl ? rawData.musicUrl : undefined,
        totalDuration: timings.totalDuration,
        fps,
      };
    } else {
      const scenesWithFrames = calculateComparisonFrameTimings(rawData.scenes, fps, hookFrames);
      const category = String(rawData.category || "Comparativos");
      const images = rawData.productImages || [rawData.product1.imageUrl, rawData.product2.imageUrl];
      const clips = Array.isArray(rawData.brollVideos) ? rawData.brollVideos : [];
      const visualSequence = planVetorSceneMixes({
        scenes: scenesWithFrames,
        title: rawData.title,
        category,
        hasProductGallery: images.length > 2,
        hasBroll: clips.some(Boolean),
      });
      const scenesWithVisualDirection = scenesWithFrames.map((scene, index) => ({
        ...scene,
        creativeDirection: visualSequence[index],
      }));
      const openingCreativeDirection = planVetorSceneMixes({
        scenes: [{ id: "comparison-hook", text: rawData.hook, visualCue: "Duelo de abertura" }],
        title: rawData.title,
        category,
        hasProductGallery: images.length > 2,
        hasBroll: clips.some(Boolean),
      })[0];
      const closingCreativeDirection = planVetorSceneMixes({
        scenes: [{ id: "comparison-verdict", text: rawData.callToAction, visualCue: "Veredito comparativo" }],
        title: rawData.title,
        category,
        hasProductGallery: images.length > 2,
        hasBroll: clips.some(Boolean),
      })[0];
      console.log('[Remotion] Direção criativa comparativa: ' + visualSequence.map((item, index) =>
        'cena-' + (index + 1) + '=' + item.templateIds.join('+')
      ).join(' | '));
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
        scenes: scenesWithVisualDirection,
        openingCreativeDirection,
        closingCreativeDirection,
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
      const sampleScenes: EditorialScene[] = [
        { id: 1, text: 'Chegou o Samsung Galaxy S24 Ultra, será que vale o investimento?', duration: 5, visualCue: 'Produto em destaque com zoom dramático', brollKeywords: ['product reveal', 'tech unboxing'], startFrame: 0, endFrame: 0 },
        { id: 2, text: 'Confira preço, condições e a ficha técnica do modelo exato antes de comprar.', duration: 7, visualCue: 'Preço aparecendo na tela, transição para produto em mãos', brollKeywords: ['price tag', 'money', 'shopping'], startFrame: 0, endFrame: 0 },
        { id: 3, text: 'Design premium, construção sólida. Na mão passa confiança.', duration: 8, visualCue: 'Close nos detalhes, materiais, acabamento', brollKeywords: ['product close up', 'premium design', 'hands on'], startFrame: 0, endFrame: 0 },
        { id: 4, text: 'Compare os recursos documentados com as tarefas que você pretende realizar.', duration: 8, visualCue: 'Produto em uso real: apps, jogos, multitarefa', brollKeywords: ['performance test', 'gaming', 'multitasking'], startFrame: 0, endFrame: 0 },
        { id: 5, text: 'Confirme autonomia e carregamento na ficha técnica oficial da versão exata.', duration: 7, visualCue: 'Ícone de bateria, carregador, uso contínuo', brollKeywords: ['battery life', 'charging', 'all day'], startFrame: 0, endFrame: 0 },
        { id: 6, text: 'Confira o preço total e confirme o conteúdo da embalagem no anúncio.', duration: 7, visualCue: 'Lista de contras aparecendo, expressão de decepção leve', brollKeywords: ['cons list', 'disappointed', 'expensive'], startFrame: 0, endFrame: 0 },
        { id: 7, text: 'Veredito: decida com base nos recursos documentados e nas suas necessidades.', duration: 8, visualCue: 'Nota final na tela, produto ao lado de concorrentes', brollKeywords: ['verdict', 'rating', 'comparison'], startFrame: 0, endFrame: 0 },
      ];

      const sampleTimings = resolveSceneTimings<EditorialScene>({ scenes: sampleScenes }, fps, { defaultHookSeconds: 3, tailSeconds: 8 });
      const scenesWithFrames = sampleTimings.scenes;
      const totalDuration = sampleTimings.totalDuration;

      const subtitleEntries: EditorialSubtitle[] = [
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
        hookDuration: sampleTimings.hookDuration,
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
        categories: [],
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