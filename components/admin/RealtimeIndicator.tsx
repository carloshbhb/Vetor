'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw } from 'lucide-react'

export default function RealtimeIndicator() {
  const [changes, setChanges] = useState(0)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        () => setChanges(c => c + 1),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setEnabled(true)
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (changes === 0) return null

  return (
    <button
      onClick={() => { window.location.reload() }}
      className="flex items-center gap-1.5 text-xs text-blue bg-blue-light/50 border border-blue-mid rounded-full px-2.5 py-1 hover:bg-blue-light transition-colors"
      title={`${changes} alteração(ões) detectada(s) — clique para recarregar`}
    >
      <RefreshCw size={12} />
      {changes} nova{changes > 1 ? 's' : ''}
    </button>
  )
}
