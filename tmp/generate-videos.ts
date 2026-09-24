import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

config({ path: '../.env.local' });

interface Review {
  id: string;
  slug: string;
  title: string;
  image: string;
  score: number;
  pros: string[];
  cons: string[];
  category: string;
  price_new?: string;
  product_url?: string;
}

interface ViralArticle {
  id: string;
  slug: string;
  title: string;
  products: Array<{ name: string; slug: string; imageUrl: string }>;
}

interface VideoManifest {
  generatedAt: string;
  videos: Array<{
    type: 'review' | 'comparison';
    slug: string;
    title: string;
    videoUrl: string;
    status: 'success' | 'failed';
    error?: string;
    videoId?: string;
  }>;
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error('❌ Missing Supabase URL in .env.local');
    process.exit(1);
  }

  return createClient(url, serviceKey || anonKey!);
}

async function getRecentReviews(supabase: ReturnType<typeof createClient>): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching reviews:', error.message);
    return [];
  }

  return (data ?? []) as Review[];
}

async function getRecentViralArticles(supabase: ReturnType<typeof createClient>): Promise<ViralArticle[]> {
  const { data, error } = await supabase
    .from('viral_articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching viral articles:', error.message);
    return [];
  }

  return (data ?? []) as ViralArticle[];
}

async function createVideoJob(supabase: ReturnType<typeof createClient>, review: Review): Promise<string | null> {
  const productUrl = review.product_url || review.image || '';
  const { data, error } = await supabase
    .from('video_queue')
    .insert({
      product_url: productUrl,
      product_title: review.title,
      product_category: review.category,
      product_price: review.price_new || 'R$0',
      product_image_url: review.image,
      affiliate_url: productUrl,
      shortened_affiliate_url: productUrl,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating video job:', error.message);
    return null;
  }

  return data.id;
}

async function generateReviewVideo(supabase: ReturnType<typeof createClient>, review: Review): Promise<{ url: string; videoId?: string; status: string }> {
  const videoId = await createVideoJob(supabase, review);

  if (!videoId) {
    return { url: '', status: 'failed', error: 'Failed to create video job' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  return {
    url: `${baseUrl}/videos/review-${review.slug}.mp4`,
    videoId,
    status: 'pending',
  };
}

async function generateComparisonVideo(supabase: ReturnType<typeof createClient>, article: ViralArticle): Promise<{ url: string; videoId?: string; status: string }> {
  const products = Array.isArray(article.products) ? article.products : [];
  if (products.length < 2) {
    throw new Error('Not enough products for comparison');
  }

  const firstProduct = products[0];
  const secondProduct = products[1];

  const { data, error } = await supabase
    .from('video_queue')
    .insert({
      product_url: firstProduct.imageUrl,
      product_title: `${firstProduct.name} vs ${secondProduct.name}`,
      product_category: 'Comparação',
      product_price: '',
      product_image_url: firstProduct.imageUrl,
      affiliate_url: firstProduct.imageUrl,
      shortened_affiliate_url: firstProduct.imageUrl,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating comparison video job:', error.message);
    return { url: '', status: 'failed', error: 'Failed to create video job' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  return {
    url: `${baseUrl}/videos/comparison-${article.slug}.mp4`,
    videoId: data.id,
    status: 'pending',
  };
}

async function generateVideos() {
  const supabase = getSupabaseClient();
  const manifest: VideoManifest = {
    generatedAt: new Date().toISOString(),
    videos: [],
  };

  console.log('🎬 Starting video generation pipeline...\n');

  const reviews = await getRecentReviews(supabase);
  console.log(`📋 Found ${reviews.length} recent reviews\n`);

  for (const review of reviews) {
    console.log(`\n🎥 Generating review video: ${review.title}`);

    try {
      const result = await generateReviewVideo(supabase, review);

      manifest.videos.push({
        type: 'review',
        slug: review.slug,
        title: review.title,
        videoUrl: result.url,
        status: result.status === 'pending' ? 'success' : 'failed',
        videoId: result.videoId,
        error: result.status !== 'pending' ? (result as any).error : undefined,
      });

      console.log(`  ✅ Video queued: ${result.url}`);
      if (result.videoId) {
        console.log(`  📋 Video ID: ${result.videoId} (will be rendered by pipeline)`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed: ${message}`);

      manifest.videos.push({
        type: 'review',
        slug: review.slug,
        title: review.title,
        videoUrl: '',
        status: 'failed',
        error: message,
      });
    }
  }

  const viralArticles = await getRecentViralArticles(supabase);
  console.log(`\n📋 Found ${viralArticles.length} recent viral articles\n`);

  for (const article of viralArticles) {
    console.log(`\n🎥 Generating comparison video: ${article.title}`);

    try {
      const products = Array.isArray(article.products) ? article.products : [];
      if (products.length < 2) {
        throw new Error('Not enough products for comparison');
      }

      console.log(`  📦 Products: ${products.map((p) => p.name).join(' vs ')}`);

      const result = await generateComparisonVideo(supabase, article);

      manifest.videos.push({
        type: 'comparison',
        slug: article.slug,
        title: article.title,
        videoUrl: result.url,
        status: result.status === 'pending' ? 'success' : 'failed',
        videoId: result.videoId,
        error: result.status !== 'pending' ? (result as any).error : undefined,
      });

      console.log(`  ✅ Video queued: ${result.url}`);
      if (result.videoId) {
        console.log(`  📋 Video ID: ${result.videoId} (will be rendered by pipeline)`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed: ${message}`);

      manifest.videos.push({
        type: 'comparison',
        slug: article.slug,
        title: article.title,
        videoUrl: '',
        status: 'failed',
        error: message,
      });
    }
  }

  const manifestPath = path.resolve(__dirname, '../../video/out/manifest.json');
  const manifestDir = path.dirname(manifestPath);

  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest saved to: ${manifestPath}`);

  const successCount = manifest.videos.filter((v) => v.status === 'success').length;
  const failedCount = manifest.videos.filter((v) => v.status === 'failed').length;
  const pendingCount = manifest.videos.filter((v) => v.videoId).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 VIDEO GENERATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Queued: ${pendingCount}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('='.repeat(50));

  return manifest;
}

generateVideos().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
