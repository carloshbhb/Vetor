import { NextResponse } from 'next/server';
import { likeComment } from '@/lib/db-comments';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const commentId = params.id;
    await likeComment(commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to like comment:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}