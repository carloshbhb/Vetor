import { NextResponse } from 'next/server';
import { validateComment, sanitizeComment, sanitizeAuthor } from '@/lib/commentValidation';
import { getComments, createComment } from '@/lib/db-comments';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reviewId = searchParams.get('reviewId');
  const sort = searchParams.get('sort') || 'newest';

  if (!reviewId) {
    return NextResponse.json({ comments: [] });
  }

  const comments = await getComments(reviewId, sort);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

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

    const newComment = await createComment({
      reviewId: body.reviewId,
      reviewSlug: body.reviewSlug,
      author: sanitizedAuthor,
      content: sanitizedContent,
      rating: body.rating,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}