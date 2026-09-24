import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { extractProductData, fetchBestSellers, generateAffiliateUrl, type ProductData } from './product-extractor';
import { generateVideoScript, type VideoScript } from './script-generator';
import { generateVoiceover, generateVoiceoverFromScript, combineAudioFiles, type TTSResult } from './tts';
import { fetchMediaAssets, prepareMediaForRemotion, type MediaFetchResult } from './media-fetcher';
import { scriptToSubtitles, type SubtitleEntry } from './script-generator';

export interface VideoQueueInput {
  productUrl: string;
  scheduledAt?: string;
}

export interface VideoQueueItem {
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
  media_assets: MediaFetchResult;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  video_url: string | null;
  youtube_video_id: string | null;
  youtube_url: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SERVICE_SUPABASE = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

export async function createVideoJob(input: VideoQueueInput): Promise<VideoQueueItem> {
  const productData = await extractProductData(input.productUrl);
  const affiliateUrl = generateAffiliateUrl(input.productUrl, productData.marketplace);
  const shortenedUrl = await shortenUrl(affiliateUrl);

  const { data, error } = await SERVICE_SUPABASE
    .from('video_queue')
    .insert({
      product_url: input.productUrl,
      product_title: productData.title,
      product_category: productData.category,
      product_price: productData.price,
      product_image_url: productData.imageUrl,
      affiliate_url: affiliateUrl,
      shortened_affiliate_url: shortenedUrl,
      status: 'pending',
      scheduled_at: input.scheduledAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as VideoQueueItem;
}

export async function getPendingVideos(limit = 5): Promise<VideoQueueItem[]> {
  const { data, error } = await SERVICE_SUPABASE
    .from('video_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as VideoQueueItem[];
}

export async function getVideoById(id: string): Promise<VideoQueueItem | null> {
  const { data, error } = await SERVICE_SUPABASE
    .from('video_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as VideoQueueItem;
}

export async function updateVideoStatus(
  id: string,
  updates: Partial<VideoQueueItem>
): Promise<void> {
  await SERVICE_SUPABASE
    .from('video_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processVideoPipeline(videoId: string): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
  const video = await getVideoById(videoId);
  if (!video) return { success: false, error: 'Video not found' };

  await updateVideoStatus(videoId, { status: 'processing', started_at: new Date().toISOString() });

  try {
    // Step 1: Generate script
    console.log('[1/6] Generating video script...');
    const productInfo = {
      title: video.product_title,
      category: video.product_category,
      price: video.product_price,
      specifications: {},
      marketplace: (video.product_url || '').includes('amazon') ? 'Amazon' :
                   (video.product_url || '').includes('shopee') ? 'Shopee' : 'Mercado Livre',
    };
    const script = await generateVideoScript(productInfo);
    
    await updateVideoStatus(videoId, {
      script_text: JSON.stringify(script),
      script_hook: script.hook,
    });

    // Step 2: Generate voiceover
    console.log('[2/6] Generating voiceover...');
    const audioDir = `/tmp/video-${videoId}/audio`;
    const voiceoverResults = await generateVoiceoverFromScript(script, audioDir);
    const combinedAudioPath = `/tmp/video-${videoId}/voiceover-combined.mp3`;
    
    await combineAudioFiles(
      voiceoverResults.map(r => r.audioPath),
      combinedAudioPath
    );

    const totalDuration = voiceoverResults.reduce((sum, r) => sum + r.duration, 0);
    
    await updateVideoStatus(videoId, {
      voiceover_url: combinedAudioPath,
      voiceover_duration: totalDuration,
    });

    // Step 3: Fetch media assets
    console.log('[3/6] Fetching media assets...');
    const brollKeywords = script.scenes.flatMap(s => s.brollKeywords);
    const mediaAssets = await fetchMediaAssets(
      video.product_image_url,
      brollKeywords
    );
    
    await updateVideoStatus(videoId, {
      media_assets: mediaAssets,
    });

    const publicBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const mediaForRemotion = await prepareMediaForRemotion(mediaAssets, publicBaseUrl);
const subtitles = scriptToSubtitles(script);

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

const contentFrames = scenesWithFrames[scenesWithFrames.length - 1]?.endFrame - hookFrames || 0;
const scoreFrames = 4 * fps;
const ctaFrames = 4 * fps;
const totalDurationFrames = hookFrames + contentFrames + scoreFrames + ctaFrames;
const totalDurationSec = totalDurationFrames / fps;

const remotionData = {
  type: 'review' as const,
  title: video.product_title,
  imageUrl: video.product_image_url,
  score: 8.5,
  category: video.product_category,
  hook: script.hook,
  scenes: scenesWithFrames,
  callToAction: script.callToAction,
  audioUrl: `${publicBaseUrl}/api/audio/${video.id}`,
  subtitleEntries: subtitles,
  productImages: mediaForRemotion.productImages.length > 0 ? mediaForRemotion.productImages : [video.product_image_url],
  brollVideos: mediaForRemotion.brollVideos,
  totalDuration: totalDurationSec,
  fps,
};

    // Step 5: Mark as processing - Remotion rendering handled by GitHub Actions workflow
    await updateVideoStatus(videoId, {
      status: 'processing',
    });

    return { success: true };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pipeline error:', error);
    await updateVideoStatus(videoId, {
      status: 'failed',
      error_message: message,
    });
    return { success: false, error: message };
  }
}

async function shortenUrl(url: string): Promise<string> {
  try {
    const response = await fetch(`https://api.tinyurl.com/create?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    return data.data?.tiny_url || url;
  } catch {
    return url;
  }
}

export async function processPendingVideos(limit = 3): Promise<void> {
  const videos = await getPendingVideos(limit);
  console.log(`Found ${videos.length} pending videos`);

  for (const video of videos) {
    console.log(`Processing: ${video.product_title} (${video.id})`);
    await processVideoPipeline(video.id);
    
    // Small delay between videos
    await new Promise(r => setTimeout(r, 2000));
  }
}

export async function retryFailedVideos(limit = 3): Promise<void> {
  const { data, error } = await SERVICE_SUPABASE
    .from('video_queue')
    .select('*')
    .eq('status', 'failed')
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error || !data) return;

  for (const video of data) {
    console.log(`Retrying: ${video.product_title} (${video.id})`);
    await updateVideoStatus(video.id, { status: 'pending', error_message: null });
    await processVideoPipeline(video.id);
    await new Promise(r => setTimeout(r, 2000));
  }
}

export async function createVideoJobsFromBestSellers(limit = 5): Promise<number> {
  const bestSellers = await fetchBestSellers();
  const selected = bestSellers.slice(0, limit);
  let created = 0;

  for (const item of selected) {
    try {
      await createVideoJob({ productUrl: item.product_url });
      created++;
    } catch (err) {
      console.error(`Failed to create video job for ${item.product_name}:`, err);
    }
  }

  return created;
}