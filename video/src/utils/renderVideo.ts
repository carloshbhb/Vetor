import { bundle } from '@remotion/bundler';
import { renderMedia, getCompositions } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

interface ReviewData {
  title: string;
  imageUrl: string;
  score: number;
  pros: string[];
  cons: string[];
  verdict: string;
  category: string;
}

interface ComparisonData {
  title: string;
  product1: { name: string; imageUrl: string; score: number };
  product2: { name: string; imageUrl: string; score: number };
  categories: Array<{ label: string; score1: number; score2: number }>;
  winner: 1 | 2;
}

async function renderReviewVideo(data: ReviewData, outputPath: string): Promise<string> {
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../Root.tsx'),
    webpackOverride: (config) => config,
  });

  const compositions = await getCompositions(bundleLocation, {
    inputProps: data,
  });

  const composition = compositions.find((c) => c.id === 'ReviewVideo');
  if (!composition) {
    throw new Error('ReviewVideo composition not found');
  }

  const outputLocation = path.resolve(outputPath, `review-${Date.now()}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
  });

  return outputLocation;
}

async function renderComparisonVideo(data: ComparisonData, outputPath: string): Promise<string> {
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../Root.tsx'),
    webpackOverride: (config) => config,
  });

  const compositions = await getCompositions(bundleLocation, {
    inputProps: data,
  });

  const composition = compositions.find((c) => c.id === 'ComparisonVideo');
  if (!composition) {
    throw new Error('ComparisonVideo composition not found');
  }

  const outputLocation = path.resolve(outputPath, `comparison-${Date.now()}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
  });

  return outputLocation;
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] as 'review' | 'comparison';

  if (!type || !['review', 'comparison'].includes(type)) {
    console.error('Usage: tsx renderVideo.ts <review|comparison>');
    process.exit(1);
  }

  const outputPath = path.resolve(__dirname, '../../out');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const sampleReviewData: ReviewData = {
    title: 'Samsung Galaxy S24 Ultra',
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp',
    score: 9.2,
    pros: [
      'Câmera excepcional',
      'Tela AMOLED impressionante',
      'Desempenho top de linha',
      'S Pen integrada',
      'Bateria de longa duração',
    ],
    cons: [
      'Preço muito alto',
      'Pesa bastante',
      'Carregador não incluído',
    ],
    verdict:
      'O Galaxy S24 Ultra é o melhor smartphone Android do mercado. Para quem busca o máximo em tecnologia e não ligam para o preço, é a escolha perfeita.',
    category: 'Smartphones',
  };

  const sampleComparisonData: ComparisonData = {
    title: 'Galaxy S24 vs iPhone 15',
    product1: {
      name: 'Galaxy S24',
      imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_galaxy-s24.webp',
      score: 8.8,
    },
    product2: {
      name: 'iPhone 15',
      imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_iphone-15.webp',
      score: 8.5,
    },
    categories: [
      { label: 'Design', score1: 8.5, score2: 9.0 },
      { label: 'Câmera', score1: 9.0, score2: 8.5 },
      { label: 'Desempenho', score1: 9.0, score2: 9.0 },
      { label: 'Bateria', score1: 8.5, score2: 7.5 },
      { label: 'Custo-Benefício', score1: 8.0, score2: 7.0 },
    ],
    winner: 1,
  };

  try {
    console.log(`\n🎬 Rendering ${type} video...`);

    let outputLocation: string;

    if (type === 'review') {
      outputLocation = await renderReviewVideo(sampleReviewData, outputPath);
    } else {
      outputLocation = await renderComparisonVideo(sampleComparisonData, outputPath);
    }

    console.log(`✅ Video rendered successfully: ${outputLocation}`);
  } catch (error) {
    console.error('❌ Error rendering video:', error);
    process.exit(1);
  }
}

main();
