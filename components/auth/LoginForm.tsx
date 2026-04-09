'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/InputField'
import PasswordField from '@/components/ui/PasswordField'
import { createClient } from '@/lib/supabase/client'
import { sanitizeRedirectTo } from '@/lib/utils/url'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectTo(searchParams.get('redirectTo'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Boas-Vindas de volta!</h2>
        <p className="text-sm text-gray-500 mt-1">
          Novo aqui?{' '}
          <Link href={`/register${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#3B82F6] hover:underline font-medium">
            Crie sua conta
          </Link>
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <InputField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="seu@email.com"
        autoComplete="email"
        required
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />

      <div className="space-y-1">
        <PasswordField
          id="password"
          label="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-[#3B82F6] hover:underline">
            Esqueceu sua senha?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#3730A3] py-2.5 text-sm font-semibold text-white transition hover:bg-[#312E81] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Entrando...' : 'Login'}
      </button>
    </form>
  )
}
