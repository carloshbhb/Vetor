import { NextResponse } from 'next/server';

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

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      reviewId: body.reviewId,
      reviewSlug: body.reviewSlug,
      author: body.author,
      content: body.content,
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