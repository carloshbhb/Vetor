import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MediaAsset {
  type: 'product-image' | 'broll-video';
  url: string;
  localPath: string;
  keywords?: string[];
  duration?: number;
}

export interface MediaFetchResult {
  productImages: MediaAsset[];
  brollVideos: MediaAsset[];
}

const PEXELS_API_URL = 'https://api.pexels.com/videos/search';

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, buffer);
}

async function fetchPexelsVideos(query: string, count: number = 3): Promise<MediaAsset[]> {
  const apiKey = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY;
  if (!apiKey) {
    console.warn('PEXELS_API_KEY not set, skipping B-roll fetch');
    return [];
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`,
      {
        headers: {
          'Authorization': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Pexels API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const videos = data.videos || [];

    const assets: MediaAsset[] = [];
    const outputDir = path.resolve(__dirname, '../../../public/assets/broll');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < Math.min(videos.length, count); i++) {
      const video = videos[i];
      const videoFile = video.video_files?.find((f: any) => f.quality === 'hd' || f.quality === 'sd') 
        || video.video_files?.[0];
      
      if (!videoFile) continue;

      const ext = videoFile.file_type?.split('/')[1] || 'mp4';
      const filename = `broll-${query.replace(/\s+/g, '-')}-${i}-${Date.now()}.${ext}`;
      const localPath = path.join(outputDir, filename);

      try {
        await downloadFile(videoFile.link, localPath);
        assets.push({
          type: 'broll-video',
          url: videoFile.link,
          localPath,
          keywords: [query],
          duration: video.duration,
        });
      } catch (err) {
        console.warn(`Failed to download B-roll ${i}:`, err);
      }
    }

    return assets;
  } catch (error) {
    console.error('Error fetching Pexels videos:', error);
    return [];
  }
}

async function fetchProductImages(imageUrls: string[], outputDir: string): Promise<MediaAsset[]> {
  const assets: MediaAsset[] = [];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    if (!url) continue;

    try {
      const ext = path.extname(new URL(url).pathname) || '.webp';
      const filename = `product-${i}-${Date.now()}${ext}`;
      const localPath = path.join(outputDir, filename);

      await downloadFile(url, localPath);
      assets.push({
        type: 'product-image',
        url,
        localPath,
      });
    } catch (err) {
      console.warn(`Failed to download product image ${i}:`, err);
    }
  }

  return assets;
}

export async function fetchMediaAssets(
  productImageUrl: string,
  brollKeywords: string[],
  outputDir: string = path.resolve(__dirname, '../../../public/assets')
): Promise<MediaFetchResult> {
  const productImagesDir = path.join(outputDir, 'product-images');
  const brollDir = path.join(outputDir, 'broll');

  const productImages = await fetchProductImages([productImageUrl], productImagesDir);

  const brollVideos: MediaAsset[] = [];
  for (const keyword of brollKeywords.slice(0, 5)) {
    const videos = await fetchPexelsVideos(keyword, 2);
    brollVideos.push(...videos);
  }

  return { productImages, brollVideos };
}

export function getLocalAssetPath(asset: MediaAsset, publicBaseUrl: string): string {
  const relativePath = path.relative(path.resolve(__dirname, '../../../public'), asset.localPath);
  return `${publicBaseUrl}/${relativePath.replace(/\\/g, '/')}`;
}

export async function prepareMediaForRemotion(
  result: MediaFetchResult,
  publicBaseUrl: string
): Promise<{ productImages: string[]; brollVideos: string[] }> {
  return {
    productImages: result.productImages.map(a => getLocalAssetPath(a, publicBaseUrl)),
    brollVideos: result.brollVideos.map(a => getLocalAssetPath(a, publicBaseUrl)),
  };
}