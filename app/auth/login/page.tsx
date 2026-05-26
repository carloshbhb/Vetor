'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      if (data.session) {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession(data.session);
        if (error) throw error;
      }

      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.MouseEvent) {
    e.preventDefault()
    if (!email) { setError('Digite seu email primeiro.'); return }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess('Link mágico enviado! Verifique seu email.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg2 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Vetor Blog</h1>
          <p className="text-text-muted text-sm">Faça login para acessar o painel</p>
        </div>

        <form onSubmit={handleSignIn} className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-bg border border-red/20 rounded-lg px-3 py-2 text-red text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-bg border border-green/20 rounded-lg px-3 py-2 text-green text-sm">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-2 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-2 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg2 text-text text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-cta-gradient text-white font-syne font-bold text-sm uppercase tracking-wide shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-text-muted">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full text-center text-sm text-blue hover:underline disabled:opacity-50"
          >
            Enviar link mágico
          </button>
        </form>
      </div>
    </div>
  )
}
