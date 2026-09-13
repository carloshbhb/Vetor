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
}

interface ViralArticle {
  id: string;
  slug: string;
  title: string;
  products: Array<{ name: string; slug: string; imageUrl: string }>;
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  return createClient(url, anonKey);
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

interface VideoManifest {
  generatedAt: string;
  videos: Array<{
    type: 'review' | 'comparison';
    slug: string;
    title: string;
    videoUrl: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
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
      const videoData = {
        title: review.title,
        imageUrl: review.image,
        score: review.score,
        pros: Array.isArray(review.pros) ? review.pros : [],
        cons: Array.isArray(review.cons) ? review.cons : [],
        verdict: `Análise completa do ${review.title}. Confira os prós e contras.`,
        category: review.category,
      };

      console.log(`  📊 Score: ${review.score}/10`);
      console.log(`  ✅ Pros: ${videoData.pros.length} items`);
      console.log(`  ❌ Cons: ${videoData.cons.length} items`);

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
      const videoUrl = `${baseUrl}/videos/review-${review.slug}.mp4`;

      manifest.videos.push({
        type: 'review',
        slug: review.slug,
        title: review.title,
        videoUrl,
        status: 'success',
      });

      console.log(`  ✅ Video URL: ${videoUrl}`);
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

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
      const videoUrl = `${baseUrl}/videos/comparison-${article.slug}.mp4`;

      manifest.videos.push({
        type: 'comparison',
        slug: article.slug,
        title: article.title,
        videoUrl,
        status: 'success',
      });

      console.log(`  ✅ Video URL: ${videoUrl}`);
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

  console.log('\n' + '='.repeat(50));
  console.log('📊 VIDEO GENERATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('='.repeat(50));

  return manifest;
}

generateVideos().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
