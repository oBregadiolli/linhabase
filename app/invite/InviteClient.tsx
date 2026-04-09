'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Mail, LogIn, UserPlus, User, Lock, Eye, EyeOff, ArrowRight, Building2, Loader2, Users, Shield } from 'lucide-react'
import { acceptInvitationAction, registerAndAcceptAction } from './actions'

type InviteStatus =
  | 'missing_token'
  | 'invalid'
  | 'expired'
  | 'accepted'
  | 'revoked'
  | 'needs_auth'
  | 'email_mismatch'
  | 'ready'

interface InviteClientProps {
  status: InviteStatus
  email?: string
  companyName?: string
  role?: string
  token?: string
  userEmail?: string
}

export default function InviteClient({ status, email, companyName, role, token, userEmail }: InviteClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [acceptedCompany, setAcceptedCompany] = useState<string | null>(null)

  const loginUrl = token
    ? `/login?redirectTo=${encodeURIComponent(`/invite?token=${token}`)}`
    : '/login'

  function handleAccept() {
    if (!token) return
    setError(null)

    startTransition(async () => {
      const result = await acceptInvitationAction(token)
      if (result.success) {
        setAccepted(true)
        setAcceptedCompany(result.companyName ?? companyName ?? null)
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  // ── Accepted state (after clicking accept) ──
  if (accepted) {
    return (
      <InviteShell>
        <StatusIcon type="success" />
        <h1 className="text-xl font-bold text-gray-900">Bem-vindo à equipe!</h1>
        <p className="text-sm text-gray-500 mt-1">
          Você agora faz parte de <strong className="text-gray-700">{acceptedCompany}</strong>.
        </p>
        <p className="text-xs text-gray-400 mt-3">Redirecionando para o dashboard...</p>
        <div className="mt-3 h-1 w-32 bg-gray-200 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-[#1D4ED8] animate-[grow_2s_ease-in-out_forwards]" />
        </div>
      </InviteShell>
    )
  }

  // ── State-based renders ──

  if (status === 'missing_token') {
    return (
      <InviteShell>
        <StatusIcon type="warning" />
        <h1 className="text-xl font-bold text-gray-900">Link incompleto</h1>
        <p className="text-sm text-gray-500 mt-1">
          Este link de convite não contém um token válido.
          Solicite um novo convite ao administrador da empresa.
        </p>
        <LinkButton href="/login" label="Ir para Login" />
      </InviteShell>
    )
  }

  if (status === 'invalid') {
    return (
      <InviteShell>
        <StatusIcon type="error" />
        <h1 className="text-xl font-bold text-gray-900">Convite não encontrado</h1>
        <p className="text-sm text-gray-500 mt-1">
          Este token de convite não existe ou é inválido.
          Verifique com o administrador da empresa.
        </p>
        <LinkButton href="/login" label="Ir para Login" />
      </InviteShell>
    )
  }

  if (status === 'expired') {
    return (
      <InviteShell>
        <StatusIcon type="warning" />
        <h1 className="text-xl font-bold text-gray-900">Convite expirado</h1>
        <p className="text-sm text-gray-500 mt-1">
          O convite para <strong className="text-gray-700">{email}</strong> em{' '}
          <strong className="text-gray-700">{companyName}</strong> expirou.
          Solicite um novo convite ao administrador.
        </p>
        <LinkButton href="/login" label="Ir para Login" />
      </InviteShell>
    )
  }

  if (status === 'accepted') {
    return (
      <InviteShell>
        <StatusIcon type="info" />
        <h1 className="text-xl font-bold text-gray-900">Convite já utilizado</h1>
        <p className="text-sm text-gray-500 mt-1">
          Este convite para <strong className="text-gray-700">{companyName}</strong> já foi aceito anteriormente.
        </p>
        <LinkButton href="/dashboard" label="Ir para Dashboard" />
      </InviteShell>
    )
  }

  if (status === 'revoked') {
    return (
      <InviteShell>
        <StatusIcon type="error" />
        <h1 className="text-xl font-bold text-gray-900">Convite revogado</h1>
        <p className="text-sm text-gray-500 mt-1">
          O convite para <strong className="text-gray-700">{email}</strong> em{' '}
          <strong className="text-gray-700">{companyName}</strong> foi revogado pelo administrador.
          Solicite um novo convite se necessário.
        </p>
        <LinkButton href="/login" label="Ir para Login" />
      </InviteShell>
    )
  }

  // ── NEEDS AUTH: Premium split-screen with inline registration ──
  if (status === 'needs_auth') {
    return (
      <InviteRegistration
        email={email ?? ''}
        companyName={companyName ?? ''}
        role={role ?? 'member'}
        token={token ?? ''}
        loginUrl={loginUrl}
      />
    )
  }

  if (status === 'email_mismatch') {
    return (
      <InviteShell>
        <StatusIcon type="warning" />
        <h1 className="text-xl font-bold text-gray-900">Email não corresponde</h1>
        <p className="text-sm text-gray-500 mt-1">
          Este convite foi enviado para <strong className="text-gray-700">{email}</strong>,
          mas você está logado como <strong className="text-gray-700">{userEmail}</strong>.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Faça login com o email correto para aceitar o convite.
        </p>
        <LinkButton href={loginUrl} label="Trocar de conta" />
      </InviteShell>
    )
  }

  // ── Ready to accept ──
  return (
    <InviteShell>
      <StatusIcon type="success" />
      <h1 className="text-xl font-bold text-gray-900">Aceitar Convite</h1>
      <p className="text-sm text-gray-500 mt-2">
        <strong className="text-gray-700">{companyName}</strong> convidou você para se juntar como{' '}
        <RoleBadge role={role ?? 'member'} />.
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Email: {email}
      </p>

      {error && (
        <div className="flex items-center gap-2 w-full rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mt-4">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={isPending}
        className="w-full mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        {isPending ? 'Processando...' : 'Aceitar Convite'}
      </button>
    </InviteShell>
  )
}

// ── Premium inline registration for invited users ────────────────

function InviteRegistration({
  email,
  companyName,
  role,
  token,
  loginUrl,
}: {
  email: string
  companyName: string
  role: string
  token: string
  loginUrl: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const isValid = name.trim().length >= 2 && password.length >= 8

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError('')

    startTransition(async () => {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('email', email)
      formData.set('password', password)
      formData.set('token', token)

      const result = await registerAndAcceptAction(formData)
      if (result.success) {
        setAccepted(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  // ── Success state ──
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-white to-[#F0FDFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo à equipe!</h1>
          <p className="text-sm text-gray-500 mt-2">
            Sua conta foi criada e você já faz parte de <strong className="text-gray-700">{companyName}</strong>.
          </p>
          <p className="text-xs text-gray-400 mt-4">Redirecionando para o dashboard...</p>
          <div className="mt-3 h-1 w-40 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-[#1D4ED8] animate-[grow_2s_ease-in-out_forwards]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — Branding ──────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #1D4ED8 50%, #2563EB 100%)',
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)' }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-12 xl:px-16">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">LinhaBase</h2>
            <div className="mt-1 h-0.5 w-8 rounded-full bg-blue-400/60" />
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Você foi<br />
            <span className="text-blue-300">convidado!</span>
          </h1>
          <p className="text-blue-200/80 text-lg max-w-md leading-relaxed">
            <strong className="text-white">{companyName}</strong> convidou você para
            fazer parte da equipe. Crie sua conta para começar.
          </p>

          {/* Info cards */}
          <div className="mt-12 space-y-4">
            {[
              { icon: Building2, title: companyName, desc: 'Sua nova empresa', active: true },
              { icon: Shield, title: role === 'admin' ? 'Administrador' : 'Membro', desc: 'Seu papel na equipe', active: true },
              { icon: Mail, title: email, desc: 'Email do convite', active: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 shadow-lg shadow-blue-500/20">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-blue-200/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-12 xl:px-16 pb-8">
          <p className="text-xs text-blue-300/40">
            © {new Date().getFullYear()} LinhaBase · Apontamento inteligente
          </p>
        </div>
      </div>

      {/* ── Right panel — Form ──────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-[#FAFBFC] px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">LinhaBase</h2>
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Aceite o convite 🎉
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Defina seu nome e senha para criar sua conta e entrar em <strong className="text-gray-700">{companyName}</strong>.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email — locked */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    tabIndex={-1}
                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200
                      text-sm text-gray-500 bg-gray-50 cursor-not-allowed
                      focus:outline-none"
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="invite-name" className="text-sm font-semibold text-gray-700">Seu nome</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="invite-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como você se chama?"
                    autoFocus
                    autoComplete="name"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200
                      text-sm text-gray-900 bg-gray-50/50
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white
                      placeholder:text-gray-400 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="invite-password" className="text-sm font-semibold text-gray-700">Defina uma senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="invite-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200
                      text-sm text-gray-900 bg-gray-50/50
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white
                      placeholder:text-gray-400 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                            level <= passwordStrength.level
                              ? passwordStrength.color
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[10px] font-medium ${passwordStrength.textColor}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending || !isValid}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white
                  transition-all duration-200 cursor-pointer
                  bg-gradient-to-r from-[#1D4ED8] to-[#2563EB]
                  hover:from-[#1e40af] hover:to-[#1D4ED8] hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5
                  active:translate-y-0
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Criar conta e entrar na equipe
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Already have account */}
          <div className="mt-5 text-center">
            <p className="text-xs text-gray-400">
              Já tem uma conta?{' '}
              <Link href={loginUrl} className="text-[#1D4ED8] font-semibold hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Password strength helper ──────────────────────────────────

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const configs = [
    { level: 0, label: '', color: '', textColor: '' },
    { level: 1, label: 'Fraca', color: 'bg-red-400', textColor: 'text-red-500' },
    { level: 2, label: 'Razoável', color: 'bg-amber-400', textColor: 'text-amber-500' },
    { level: 3, label: 'Boa', color: 'bg-blue-400', textColor: 'text-blue-500' },
    { level: 4, label: 'Forte', color: 'bg-emerald-400', textColor: 'text-emerald-500' },
  ]
  return configs[score] || configs[0]
}

// ── Layout shell ──────────────────────────────────────────────

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}

// ── Status icon ───────────────────────────────────────────────

function StatusIcon({ type }: { type: 'success' | 'error' | 'warning' | 'info' | 'mail' }) {
  const config = {
    success: { bg: 'bg-emerald-50', color: 'text-emerald-600', Icon: CheckCircle2 },
    error: { bg: 'bg-red-50', color: 'text-red-500', Icon: XCircle },
    warning: { bg: 'bg-amber-50', color: 'text-amber-500', Icon: AlertTriangle },
    info: { bg: 'bg-blue-50', color: 'text-blue-500', Icon: Clock },
    mail: { bg: 'bg-[#EEF2FF]', color: 'text-[#1D4ED8]', Icon: Mail },
  }
  const c = config[type]
  return (
    <div className={`h-14 w-14 rounded-2xl ${c.bg} flex items-center justify-center ${c.color} mb-4`}>
      <c.Icon className="h-7 w-7" />
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
    >
      {label}
    </Link>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#1D4ED8]">
      {role === 'admin' ? 'Administrador' : 'Membro'}
    </span>
  )
}
