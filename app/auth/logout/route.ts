import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.warn('[Logout] signOut failed:', err)
  }

  const response = NextResponse.redirect(`${origin}/auth/login`)
  response.cookies.delete('vetor_admin_session')
  return response
}
