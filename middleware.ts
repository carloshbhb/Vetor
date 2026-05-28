import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const adminRoutes = ['/admin/:path*']
const apiRoutes = ['/api/generate', '/api/upload', '/api/reviews/:path*']
const publicRoutes = ['/auth/login', '/auth/callback', '/auth/logout']

export async function middleware(req: NextRequest) {
  let supabase = null
  let supabaseResponse = NextResponse.next({ request: req })

  try {
    const client = createClient(req)
    supabase = client.supabase
    supabaseResponse = client.supabaseResponse
  } catch (e) {
    // Supabase client initialization failed (missing env vars, etc.)
    // Continue with supabase = null; will rely on fallback or public routes
    console.warn('[Middleware] Supabase client initialization failed:', e)
  }

  const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true'
  const adminSession = req.cookies.get('vetor_admin_session')?.value

  let user = null
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    } catch (err) {
      console.warn('[Middleware] Failed to get user:', err)
      user = null
    }
  }

  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return req.nextUrl.pathname.startsWith(route.replace('/:path*', ''))
    }
    return req.nextUrl.pathname === route
  })

  // Allow public routes
  if (isPublicRoute) {
    return supabaseResponse
  }

  // In fallback mode, allow admin routes if admin session cookie present
  const isAdminRoute = adminRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return req.nextUrl.pathname.startsWith(route.replace('/:path*', ''))
    }
    return req.nextUrl.pathname === route
  })

  if (fallbackToFile && isAdminRoute && adminSession) {
    return supabaseResponse // bypass auth
  }

  // Protected routes - redirect to login if not authenticated
  if (!user) {
    const isApiRoute = apiRoutes.some(route => {
      if (route.endsWith(':path*')) {
        return req.nextUrl.pathname.startsWith(route.replace(':path*', ''))
      }
      return req.nextUrl.pathname === route
    })

    if (isApiRoute) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/api/generate', '/api/upload', '/api/reviews/:path*', '/auth/:path*'],
}
