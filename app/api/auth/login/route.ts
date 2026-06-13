import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// In-memory rate limiter (resets per serverless invocation, but better than nothing)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }, { status: 429 });
    }

    const { email, password } = await req.json();

    const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true';

    if (fallbackToFile) {
      const expectedUser = process.env.ADMIN_USER;
      const expectedPwd = process.env.ADMIN_PASSWORD;

      if (!expectedUser || !expectedPwd) {
        return NextResponse.json({ error: 'ADMIN_USER e ADMIN_PASSWORD devem ser configurados nas variaveis de ambiente.' }, { status: 500 });
      }

      if (email === expectedUser && password === expectedPwd) {
        const response = NextResponse.json({ success: true, isFallback: true });
        // Set signed admin session cookie
        const signedSession = signSession('authenticated');
        response.cookies.set('vetor_admin_session', signedSession, {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
        });
        return response;
      } else {
        return NextResponse.json({ error: 'Credenciais de administrador incorretas (modo fallback).' }, { status: 401 });
      }
    }

    // Normal Supabase sign in
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Credenciais do Supabase nao configuradas no servidor.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    // Set signed admin session cookie
    const signedSession = signSession('authenticated');
    response.cookies.set('vetor_admin_session', signedSession, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
