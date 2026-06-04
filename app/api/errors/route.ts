import { NextResponse } from 'next/server';

interface ErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  timestamp: string;
  type: 'client' | 'server';
  severity?: 'error' | 'warning' | 'info';
}

// In-memory store for errors (in production, use a database or external service)
const errorLogs: ErrorLog[] = [];
const MAX_LOGS = 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const errorLog: ErrorLog = {
      message: body.message || 'Unknown error',
      stack: body.stack,
      componentStack: body.componentStack,
      url: body.url,
      timestamp: body.timestamp || new Date().toISOString(),
      type: body.type || 'client',
      severity: body.severity || 'error',
    };

    // Add to logs (with max limit)
    errorLogs.unshift(errorLog);
    if (errorLogs.length > MAX_LOGS) {
      errorLogs.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', errorLog);
    }

    // In production, you would:
    // 1. Send to Sentry, LogRocket, or similar service
    // 2. Store in database
    // 3. Send alert via email/Slack

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  // Return recent errors (protected endpoint)
  return NextResponse.json({
    errors: errorLogs.slice(0, 50),
    total: errorLogs.length,
  });
}