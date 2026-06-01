import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true';

    if (fallbackToFile) {
      const expectedUser = process.env.ADMIN_USER || 'admin';
      const expectedPwd = process.env.ADMIN_PASSWORD || 'vetor123';

      const isUserMatch = 
        email === expectedUser || 
        email === 'admin@vetor.blog' || 
        email === 'admin';

      if (isUserMatch && password === expectedPwd) {
        const response = NextResponse.json({ success: true, isFallback: true });
        // Set standard admin session cookie
        response.cookies.set('vetor_admin_session', 'true', {
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
      return NextResponse.json({ error: 'Credenciais do Supabase não configuradas no servidor.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, session: data.session });
    // Also set admin session cookie so middleware can use it as fallback
    response.cookies.set('vetor_admin_session', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
