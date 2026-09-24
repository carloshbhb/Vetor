import { getSupabaseServiceKeyClient } from './supabase';

export interface ProductLink {
  id: string;
  slug: string;
  product_name: string;
  category: string;
  product_url: string;
  affiliate_url: string;
  image_url: string;
  marketplace: string;
  status: string;
  source: string;
  has_review: boolean;
  has_video: boolean;
  review_slug: string | null;
  video_id: string | null;
  price: number | null;
  score: number | null;
  priority: number;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export async function getAllProductLinks(filters?: {
  category?: string;
  status?: string;
  has_review?: boolean;
  has_video?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductLink[]> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];

  try {
    let query = supabase
      .from('product_links')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.has_review !== undefined) {
      query = query.eq('has_review', filters.has_review);
    }
    if (filters?.has_video !== undefined) {
      query = query.eq('has_video', filters.has_video);
    }
    if (filters?.search) {
      query = query.or(`product_name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
    }

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      tags: parseJsonArray(row.tags),
    })) as ProductLink[];
  } catch {
    return [];
  }
}

export async function getProductLinkById(id: string): Promise<ProductLink | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('product_links')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return { ...data, tags: parseJsonArray(data.tags) } as ProductLink;
  } catch {
    return null;
  }
}

export async function getProductLinkBySlug(slug: string): Promise<ProductLink | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('product_links')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    return { ...data, tags: parseJsonArray(data.tags) } as ProductLink;
  } catch {
    return null;
  }
}

export async function createProductLink(
  data: Omit<ProductLink, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: ProductLink | null; error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    const now = new Date().toISOString();
    return {
      data: { ...data, id: 'mock-' + Date.now(), created_at: now, updated_at: now } as ProductLink,
      error: null,
    };
  }

  const now = new Date().toISOString();
  const row = {
    slug: data.slug,
    product_name: data.product_name,
    category: data.category,
    product_url: data.product_url,
    affiliate_url: data.affiliate_url,
    image_url: data.image_url,
    marketplace: data.marketplace,
    status: data.status,
    source: data.source,
    has_review: data.has_review,
    has_video: data.has_video,
    review_slug: data.review_slug,
    video_id: data.video_id,
    price: data.price,
    score: data.score,
    priority: data.priority,
    notes: data.notes,
    tags: data.tags,
    created_at: now,
    updated_at: now,
  };

  const { data: result, error } = await supabase
    .from('product_links')
    .insert(row)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: result as ProductLink, error: null };
}

export async function updateProductLink(
  id: string,
  data: Partial<ProductLink>
): Promise<{ error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { error: null };

  try {
    const updateData = { ...data, updated_at: new Date().toISOString() };
    delete updateData.id;
    delete updateData.created_at;

    const { error } = await supabase
      .from('product_links')
      .update(updateData)
      .eq('id', id);

    return { error: error?.message ?? null };
  } catch {
    return { error: null };
  }
}

export async function deleteProductLink(id: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('product_links')
      .delete()
      .eq('id', id);

    return { error: error?.message ?? null };
  } catch {
    return { error: null };
  }
}

export async function getNextReviewProductLink(): Promise<ProductLink | null> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('product_links')
      .select('*')
      .eq('has_review', false)
      .neq('status', 'reviewed')
      .neq('status', 'archived')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return { ...data, tags: parseJsonArray(data.tags) } as ProductLink;
  } catch {
    return null;
  }
}

export async function markProductLinkReviewed(
  id: string,
  reviewSlug: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('product_links')
      .update({
        has_review: true,
        status: 'reviewed',
        review_slug: reviewSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function markProductLinksForReview(
  reviewSlug: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return { error: null };

  try {
    const { error } = await supabase
      .from('product_links')
      .update({
        has_review: true,
        status: 'reviewed',
        review_slug: reviewSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('review_slug', reviewSlug);

    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getProductLinksStats(): Promise<{
  total: number;
  active: number;
  pending: number;
  reviewed: number;
  video_generated: number;
  archived: number;
}> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    return { total: 0, active: 0, pending: 0, reviewed: 0, video_generated: 0, archived: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('product_links')
      .select('status, has_review, has_video');

    if (error || !data) {
      return { total: 0, active: 0, pending: 0, reviewed: 0, video_generated: 0, archived: 0 };
    }

    const stats = {
      total: data.length,
      active: 0,
      pending: 0,
      reviewed: 0,
      video_generated: 0,
      archived: 0,
    };

    for (const row of data) {
      if (row.status === 'active') stats.active++;
      if (row.status === 'pending') stats.pending++;
      if (row.status === 'archived') stats.archived++;
      if (row.has_review) stats.reviewed++;
      if (row.has_video) stats.video_generated++;
    }

    return stats;
  } catch {
    return { total: 0, active: 0, pending: 0, reviewed: 0, video_generated: 0, archived: 0 };
  }
}

export async function getProductLinksByCategory(): Promise<
  { category: string; count: number }[]
> {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('product_links')
      .select('category');

    if (error || !data) return [];

    const counts: Record<string, number> = {};
    for (const row of data) {
      const cat = row.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

function parseJsonArray(val: unknown): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return [];
}
