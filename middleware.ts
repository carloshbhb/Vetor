import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const adminRoutes = ['/admin/:path*']
const apiRoutes = ['/api/generate', '/api/upload', '/api/reviews/:path*']
const publicRoutes = ['/auth/login', '/auth/callback', '/auth/logout']

export async function middleware(req: NextRequest) {
  const { supabase, supabaseResponse } = createClient(req);

  const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true';
  const adminSession = req.cookies.get('vetor_admin_session')?.value;

  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };

  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return req.nextUrl.pathname.startsWith(route.replace('/:path*', ''));
    }
    return req.nextUrl.pathname === route;
  });

  // Allow public routes
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // In fallback mode, allow admin routes if admin session cookie present
  const isAdminRoute = adminRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return req.nextUrl.pathname.startsWith(route.replace('/:path*', ''));
    }
    return req.nextUrl.pathname === route;
  });

  if (fallbackToFile && isAdminRoute && adminSession) {
    return supabaseResponse; // bypass auth
  }

  // Protected routes - redirect to login if not authenticated
  if (!user) {
    const isApiRoute = apiRoutes.some(route => {
      if (route.endsWith(':path*')) {
        return req.nextUrl.pathname.startsWith(route.replace(':path*', ''));
      }
      return req.nextUrl.pathname === route;
    });

    if (isApiRoute) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/api/generate', '/api/upload', '/api/reviews/:path*', '/auth/:path*'],
}
