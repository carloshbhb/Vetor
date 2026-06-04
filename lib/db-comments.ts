import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  } else {
    _supabase = null;
  }

  return _supabase;
}

// ─── Comments ───────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  reviewId: string;
  reviewSlug: string;
  author: string;
  content: string;
  rating?: number;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

// In-memory fallback
const commentsMemory: Comment[] = [];

export async function getComments(reviewId: string, sort: string = 'newest'): Promise<Comment[]> {
  const supabase = getSupabase();
  
  if (supabase) {
    try {
      let query = supabase
        .from('comments')
        .select('*')
        .eq('review_id', reviewId);

      switch (sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('likes', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        reviewId: row.review_id,
        reviewSlug: row.review_slug,
        author: row.author,
        content: row.content,
        rating: row.rating,
        createdAt: row.created_at,
        likes: row.likes || 0,
      }));
    } catch (error) {
      console.error('[DB] Failed to fetch comments from Supabase:', error);
    }
  }

  // Fallback to memory
  let filtered = commentsMemory.filter(c => c.reviewId === reviewId);
  switch (sort) {
    case 'oldest':
      filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'popular':
      filtered.sort((a, b) => b.likes - a.likes);
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return filtered;
}

export async function createComment(comment: Omit<Comment, 'id' | 'likes'>): Promise<Comment> {
  const supabase = getSupabase();
  const newComment: Comment = {
    id: `comment-${Date.now()}`,
    ...comment,
    likes: 0,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          id: newComment.id,
          review_id: comment.reviewId,
          review_slug: comment.reviewSlug,
          author: comment.author,
          content: comment.content,
          rating: comment.rating,
          created_at: comment.createdAt,
          likes: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        reviewId: data.review_id,
        reviewSlug: data.review_slug,
        author: data.author,
        content: data.content,
        rating: data.rating,
        createdAt: data.created_at,
        likes: data.likes || 0,
      };
    } catch (error) {
      console.error('[DB] Failed to create comment in Supabase:', error);
    }
  }

  // Fallback to memory
  commentsMemory.unshift(newComment);
  if (commentsMemory.length > 1000) commentsMemory.pop();
  return newComment;
}

export async function likeComment(commentId: string): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { error } = await supabase.rpc('increment_likes', { comment_id: commentId });
      if (error) {
        // Fallback: manual update
        const { data } = await supabase
          .from('comments')
          .select('likes')
          .eq('id', commentId)
          .single();
        
        if (data) {
          await supabase
            .from('comments')
            .update({ likes: (data.likes || 0) + 1 })
            .eq('id', commentId);
        }
      }
      return;
    } catch (error) {
      console.error('[DB] Failed to like comment in Supabase:', error);
    }
  }

  // Fallback to memory
  const comment = commentsMemory.find(c => c.id === commentId);
  if (comment) comment.likes++;
}

// ─── Error Logs ─────────────────────────────────────────────────────────────

export interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp: string;
  type: 'client' | 'server';
  severity?: 'error' | 'warning' | 'info';
}

// In-memory fallback
const errorsMemory: ErrorLog[] = [];
const MAX_ERRORS = 1000;

export async function getErrors(limit: number = 50): Promise<{ errors: ErrorLog[]; total: number }> {
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error, count } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        errors: (data || []).map(row => ({
          message: row.message,
          stack: row.stack,
          componentStack: row.component_stack,
          url: row.url,
          timestamp: row.timestamp,
          type: row.type,
          severity: row.severity,
        })),
        total: count || 0,
      };
    } catch (error) {
      console.error('[DB] Failed to fetch errors from Supabase:', error);
    }
  }

  // Fallback to memory
  return {
    errors: errorsMemory.slice(0, limit),
    total: errorsMemory.length,
  };
}

export async function createErrorLog(errorLog: Omit<ErrorLog, 'timestamp'> & { timestamp?: string }): Promise<void> {
  const supabase = getSupabase();
  const log: ErrorLog = {
    ...errorLog,
    timestamp: errorLog.timestamp || new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { error } = await supabase
        .from('error_logs')
        .insert({
          message: log.message,
          stack: log.stack,
          component_stack: log.componentStack,
          url: log.url,
          timestamp: log.timestamp,
          type: log.type,
          severity: log.severity || 'error',
        });

      if (error) throw error;
      return;
    } catch (error) {
      console.error('[DB] Failed to create error log in Supabase:', error);
    }
  }

  // Fallback to memory
  errorsMemory.unshift(log);
  if (errorsMemory.length > MAX_ERRORS) errorsMemory.pop();
}
