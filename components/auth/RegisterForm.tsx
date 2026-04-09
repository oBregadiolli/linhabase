'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InputField from '@/components/ui/InputField'
import PasswordField from '@/components/ui/PasswordField'
import PasswordStrength from '@/components/ui/PasswordStrength'
import { createClient } from '@/lib/supabase/client'
import { sanitizeRedirectTo } from '@/lib/utils/url'

export default function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = sanitizeRedirectTo(searchParams.get('redirectTo'))
  const invitedEmail = searchParams.get('email') || ''
  const isInvite = !!invitedEmail

  const [name, setName] = useState('')
  const [email, setEmail] = useState(invitedEmail)
  const [password, setPassword] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nome é obrigatório'
    if (!email.trim()) e.email = 'E-mail é obrigatório'
    if (password.length < 8) e.password = 'Senha deve ter pelo menos 8 dígitos'
    if (!/[A-Z]/.test(password)) e.password = 'A senha deve conter ao menos 1 letra maiúscula'
    if (!/[a-z]/.test(password)) e.password = 'A senha deve conter ao menos 1 letra minúscula'
    if (!/[0-9]/.test(password)) e.password = 'A senha deve conter ao menos 1 número'
    if (!/[^A-Za-z0-9]/.test(password)) e.password = 'A senha deve conter ao menos 1 caracter especial'
    if (!accepted) e.accepted = 'Aceite os termos de uso para continuar'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (authError) {
      setServerError(authError.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Criar conta</h2>
        <p className="text-sm text-gray-500 mt-1">
          Já possui uma conta?{' '}
          <Link href={`/login${redirectTo !== '/dashboard' ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} className="text-[#3B82F6] hover:underline font-medium">
            Acesse aqui
          </Link>
        </p>
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <InputField
        id="name"
        label="Seu nome"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="João Silva"
        autoComplete="name"
        error={errors.name}
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      />

      <InputField
        id="email"
        label="E-mail de acesso"
        type="email"
        value={email}
        onChange={isInvite ? undefined : (e => setEmail(e.target.value))}
        placeholder="seu@email.com"
        autoComplete="email"
        readOnly={isInvite}
        tabIndex={isInvite ? -1 : undefined}
        style={isInvite ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed', opacity: 0.7 } : undefined}
        error={errors.email}
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        rightIcon={isInvite ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="Email definido pelo convite">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : undefined}
      />

      <div className="space-y-2">
        <PasswordField
          id="password"
          label="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password}
        />
        <p className="text-xs text-gray-500">
          Sua senha deve conter ao menos 1 letra maiúscula e 1 minúscula, 1 número, 1 caracter especial e ter pelo menos 8 dígitos.
        </p>
        <PasswordStrength password={password} />
      </div>

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={accepted}
          onChange={e => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#3B82F6]"
        />
        <span className="text-sm text-gray-600">
          Eu aceito os{' '}
          <Link href="/terms" className="text-[#3B82F6] hover:underline">
            termos de uso e política de privacidade
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={!accepted || loading}
        className="w-full rounded-lg bg-[#3730A3] py-2.5 text-sm font-semibold text-white transition hover:bg-[#312E81] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>
    </form>
  )
}
