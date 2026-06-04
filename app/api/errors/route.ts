import { NextResponse } from 'next/server';
import { getErrors, createErrorLog } from '@/lib/db-comments';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await createErrorLog({
      message: body.message || 'Unknown error',
      stack: body.stack,
      componentStack: body.componentStack,
      url: body.url,
      timestamp: body.timestamp || new Date().toISOString(),
      type: body.type || 'client',
      severity: body.severity || 'error',
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  const { errors, total } = await getErrors(50);
  return NextResponse.json({ errors, total });
}