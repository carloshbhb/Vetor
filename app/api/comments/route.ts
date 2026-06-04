import { NextResponse } from 'next/server';
import { validateComment, sanitizeComment, sanitizeAuthor } from '@/lib/commentValidation';

interface Comment {
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

// In-memory store (in production, use database)
const commentsStore: Comment[] = [];

// Rate limiting: store timestamps per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 comments per minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get('reviewId');
  const sort = searchParams.get('sort') || 'newest';

  let filteredComments = commentsStore;

  if (reviewId) {
    filteredComments = commentsStore.filter((c) => c.reviewId === reviewId);
  }

  // Sort
  switch (sort) {
    case 'oldest':
      filteredComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case 'popular':
      filteredComments.sort((a, b) => b.likes - a.likes);
      break;
    case 'newest':
    default:
      filteredComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return NextResponse.json({ comments: filteredComments });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Rate limiting
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    const recentTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (recentTimestamps.length >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { success: false, error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
        { status: 429 }
      );
    }
    rateLimitMap.set(ip, [...recentTimestamps, now]);

    // Validate required fields
    if (!body.reviewId || !body.reviewSlug || !body.author || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios não preenchidos.' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Avaliação deve ser entre 1 e 5.' },
        { status: 400 }
      );
    }

    // Validate and sanitize content
    const validation = validateComment(body.content, body.author);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const sanitizedContent = sanitizeComment(body.content);
    const sanitizedAuthor = sanitizeAuthor(body.author);

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      reviewId: body.reviewId,
      reviewSlug: body.reviewSlug,
      author: sanitizedAuthor,
      content: sanitizedContent,
      rating: body.rating,
      createdAt: new Date().toISOString(),
      likes: 0,
      replies: [],
    };

    commentsStore.push(newComment);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}