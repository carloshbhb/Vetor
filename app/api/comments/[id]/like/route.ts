import { NextResponse } from 'next/server';

// In-memory store (in production, use database)
const commentsStore: Array<{ id: string; likes: number }> = [];

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;

    // Find or create comment in store
    let comment = commentsStore.find((c) => c.id === commentId);
    if (!comment) {
      comment = { id: commentId, likes: 0 };
      commentsStore.push(comment);
    }

    comment.likes++;

    return NextResponse.json({ success: true, likes: comment.likes });
  } catch (error) {
    console.error('Failed to like comment:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}