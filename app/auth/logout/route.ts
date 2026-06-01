import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('[Logout] signOut failed:', err)
  }

  const response = NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog'))
  response.cookies.delete('vetor_admin_session')
  return response
}
