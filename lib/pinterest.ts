// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Pinterest Integration Service
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

let _supabase: SupabaseClient | null = null;
let _supabaseChecked = false;

function getSupabase(): SupabaseClient | null {
  if (_supabaseChecked) return _supabase;
  _supabaseChecked = true;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  return _supabase;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PinterestConfig {
  accessToken: string;
  boardId: string;
  boardName?: string;
  expiresAt?: string;
}

export interface PinCreateParams {
  boardId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  altText?: string;
  publishAt?: string;
}

export interface PinResponse {
  id: string;
  link: string;
  title: string;
  description: string;
  boardId: string;
  imageUrl: string;
  createdAt: string;
}

// ─── Config Storage ─────────────────────────────────────────────────────────

export async function getPinterestConfig(): Promise<PinterestConfig | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('pinterest_config')
      .select('*')
      .single();

    if (error || !data) return null;

    return {
      accessToken: data.access_token,
      boardId: data.board_id,
      boardName: data.board_name,
      expiresAt: data.expires_at,
    };
  } catch {
    return null;
  }
}

export async function savePinterestConfig(config: PinterestConfig): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('pinterest_config')
    .upsert({
      id: 'default',
      access_token: config.accessToken,
      board_id: config.boardId,
      board_name: config.boardName,
      expires_at: config.expiresAt,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

// ─── Pinterest API ──────────────────────────────────────────────────────────

export async function getPinterestBoards(accessToken: string): Promise<Array<{ id: string; name: string; pinCount: number }>> {
  const response = await fetch(`${PINTEREST_API_BASE}/boards`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Pinterest boards');
  }

  const data = await response.json();
  return (data.items || []).map((board: any) => ({
    id: board.id,
    name: board.name,
    pinCount: board.pin_count || 0,
  }));
}

export async function createPin(params: PinCreateParams, accessToken: string): Promise<PinResponse> {
  const response = await fetch(`${PINTEREST_API_BASE}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: params.boardId,
      title: params.title.substring(0, 100),
      description: params.description.substring(0, 500),
      link: params.link,
      media_source: {
        source_type: 'image_url',
        url: params.imageUrl,
      },
      alt_text: params.altText?.substring(0, 500),
      publish_at: params.publishAt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Pinterest pin');
  }

  const data = await response.json();
  return {
    id: data.id,
    link: data.link,
    title: data.title,
    description: data.description,
    boardId: data.board_id,
    imageUrl: data.media_source?.url || params.imageUrl,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function deletePin(pinId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${PINTEREST_API_BASE}/pins/${pinId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete Pinterest pin');
  }
}

// ─── Pin Generation from Reviews ────────────────────────────────────────────

export function generatePinTitle(product: string, category: string, score: number): string {
  const templates = [
    `Review ${product}: Nota ${score}/10 - Vale a Pena?`,
    `${product} Review Completo - Nota ${score}/10`,
    `${product}: Análise Detalhada (${category})`,
    `Melhor ${category}? ${product} Review ${score}/10`,
  ];
  return templates[Math.floor(Math.random() * templates.length)].substring(0, 100);
}

export function generatePinDescription(
  product: string,
  category: string,
  score: number,
  pros: string[],
  cons: string[],
  slug: string
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const proList = pros.slice(0, 3).join(', ');
  const conList = cons.slice(0, 2).join(', ');

  let desc = `Review completo do ${product} (${category}). Nota: ${score}/10.`;
  
  if (proList) desc += ` Prós: ${proList}.`;
  if (conList) desc += ` Contras: ${conList}.`;
  
  desc += ` Leia a análise completa no Vetor Blog.`;

  return desc.substring(0, 500);
}

export function generatePinImageUrl(
  product: string,
  score: number,
  heroImageUrl?: string
): string {
  // If there's a hero image, use it
  if (heroImageUrl && heroImageUrl.startsWith('http')) {
    return heroImageUrl;
  }

  // Generate a placeholder image URL (could integrate with image generation API)
  const encodedProduct = encodeURIComponent(product);
  return `https://placehold.co/1000x1500/0f1f8a/white?text=${encodedProduct}%0A${score}%2F10`;
}

// ─── Scheduled Pins ─────────────────────────────────────────────────────────

export interface ScheduledPin {
  id: string;
  reviewId: string;
  reviewSlug: string;
  title: string;
  description: string;
  imageUrl: string;
  scheduledAt: string;
  status: 'pending' | 'published' | 'failed';
  pinId?: string;
  error?: string;
  createdAt: string;
}

const scheduledPinsMemory: ScheduledPin[] = [];

export async function getScheduledPins(): Promise<ScheduledPin[]> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pinterest_scheduled_pins')
        .select('*')
        .order('scheduled_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        reviewId: row.review_id,
        reviewSlug: row.review_slug,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        scheduledAt: row.scheduled_at,
        status: row.status,
        pinId: row.pin_id,
        error: row.error,
        createdAt: row.created_at,
      }));
    } catch {
      // Fallback to memory
    }
  }

  return scheduledPinsMemory;
}

export async function schedulePin(pin: Omit<ScheduledPin, 'id' | 'status' | 'createdAt'>): Promise<ScheduledPin> {
  const supabase = getSupabase();
  const newPin: ScheduledPin = {
    id: `pin-${Date.now()}`,
    ...pin,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('pinterest_scheduled_pins')
        .insert({
          id: newPin.id,
          review_id: pin.reviewId,
          review_slug: pin.reviewSlug,
          title: pin.title,
          description: pin.description,
          image_url: pin.imageUrl,
          scheduled_at: pin.scheduledAt,
          status: 'pending',
          created_at: newPin.createdAt,
        })
        .select()
        .single();

      if (error) throw error;
      return newPin;
    } catch {
      // Fallback to memory
    }
  }

  scheduledPinsMemory.unshift(newPin);
  return newPin;
}

export async function updateScheduledPin(id: string, updates: Partial<ScheduledPin>): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('pinterest_scheduled_pins')
        .update({
          status: updates.status,
          pin_id: updates.pinId,
          error: updates.error,
        })
        .eq('id', id);

      if (error) throw error;
      return;
    } catch {
      // Fallback to memory
    }
  }

  const pin = scheduledPinsMemory.find(p => p.id === id);
  if (pin) {
    Object.assign(pin, updates);
  }
}
