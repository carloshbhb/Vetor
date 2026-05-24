import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

const adminRoutes = ['/admin/:path*']
const apiRoutes = ['/api/generate', '/api/upload', '/api/reviews/:path*']
const publicRoutes = ['/auth/login', '/auth/callback', '/auth/logout']

export async function middleware(req: NextRequest) {
  const { supabase, supabaseResponse } = createClient(req)

  const { data: { user } } = await supabase.auth.getUser()

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

  // Protected routes - redirect to login if not authenticated
  if (!user) {
    const isApiRoute = apiRoutes.some(route => {
      if (route.endsWith(':path*')) {
        return req.nextUrl.pathname.startsWith(route.replace('/:path*', ''))
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
