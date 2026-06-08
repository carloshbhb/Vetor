import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'
import { verifySession } from '@/lib/session'

const adminRoutes = ['/admin/:path*']
const publicRoutes = ['/auth/login', '/auth/callback', '/auth/logout']

// API routes that require authentication
const protectedApiRoutes = [
  '/api/generate',
  '/api/upload',
  '/api/reviews',
  '/api/comments',
  '/api/errors',
  '/api/web-vitals',
  '/api/ai-citations',
  '/api/google-indexing',
  '/api/serp-tracker',
  '/api/pinterest',
  '/api/cron',
  '/api/trends',
  '/api/admin',
  '/api/debug',
  '/api/sync-price',
  '/api/ml-enrich',
]

// API routes that are public (read-only, no sensitive data)
const publicApiRoutes = [
  '/api/sitemap',
]

// Public pages that don't need auth
const publicPages = [
  '/',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/research',
  '/sobre',
  '/privacidade',
  '/termos',
]

function isProtectedApiRoute(pathname: string): boolean {
  return protectedApiRoutes.some(route => pathname.startsWith(route))
}

function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some(route => pathname.startsWith(route))
}

function isPublicPage(pathname: string): boolean {
  return publicPages.some(page => pathname === page) ||
    pathname.startsWith('/review/') ||
    pathname.startsWith('/categoria/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/')
}

export async function middleware(req: NextRequest) {
  let supabase = null
  let supabaseResponse = NextResponse.next({ request: req })

  try {
    const client = createClient(req)
    supabase = client.supabase
    supabaseResponse = client.supabaseResponse
  } catch (e) {
    console.warn('[Middleware] Supabase client initialization failed:', e)
  }

  const fallbackToFile = process.env.SUPABASE_FALLBACK_TO_FILE === 'true'
  const rawSession = req.cookies.get('vetor_admin_session')?.value
  const pathname = req.nextUrl.pathname

  // Verify the signed session cookie
  const adminSession = rawSession ? verifySession(rawSession) !== null : false

  // Public routes - always allow
  const isPublicRoute = publicRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return pathname.startsWith(route.replace('/:path*', ''))
    }
    return pathname === route
  })

  if (isPublicRoute) {
    return supabaseResponse
  }

  // Public API routes - always allow
  if (isPublicApiRoute(pathname)) {
    return supabaseResponse
  }

  // Public pages - always allow
  if (isPublicPage(pathname)) {
    return supabaseResponse
  }

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

  const isAdminRoute = adminRoutes.some(route => {
    if (route.endsWith(':path*')) {
      return pathname.startsWith(route.replace('/:path*', ''))
    }
    return pathname === route
  })

  const isProtectedApi = isProtectedApiRoute(pathname)

  // Fallback to file mode with valid signed session cookie
  if (fallbackToFile && (isAdminRoute || isProtectedApi) && adminSession) {
    return supabaseResponse
  }

  // No user authenticated
  if (!user) {
    // Allow if valid signed admin session cookie exists for protected routes
    if (adminSession && (isProtectedApi || isAdminRoute)) {
      return supabaseResponse
    }

    // API routes return 401
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    // Admin pages redirect to login
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
    '/auth/:path*',
  ],
}
