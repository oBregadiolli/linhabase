'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Mail, LogIn, UserPlus } from 'lucide-react'
import { acceptInvitationAction } from './actions'

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
  const registerUrl = token
    ? `/register?redirectTo=${encodeURIComponent(`/invite?token=${token}`)}`
    : '/register'

  function handleAccept() {
    if (!token) return
    setError(null)

    startTransition(async () => {
      const result = await acceptInvitationAction(token)
      if (result.success) {
        setAccepted(true)
        setAcceptedCompany(result.companyName ?? companyName ?? null)
        // Redirect to dashboard after 2s
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
          <div className="h-full bg-[#3730A3] animate-[grow_2s_ease-in-out_forwards]" />
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

  if (status === 'needs_auth') {
    return (
      <InviteShell>
        <StatusIcon type="mail" />
        <h1 className="text-xl font-bold text-gray-900">Você foi convidado!</h1>
        <p className="text-sm text-gray-500 mt-2">
          <strong className="text-gray-700">{companyName}</strong> convidou{' '}
          <strong className="text-gray-700">{email}</strong> para se juntar como{' '}
          <RoleBadge role={role ?? 'member'} />.
        </p>
        <p className="text-sm text-gray-500 mt-3">
          Para aceitar, faça login ou crie uma conta com o email <strong className="text-gray-700">{email}</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2 mt-5 w-full">
          <Link
            href={loginUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3730A3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <Link
            href={registerUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Criar conta
          </Link>
        </div>
      </InviteShell>
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
        className="w-full mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3730A3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    mail: { bg: 'bg-[#EEF2FF]', color: 'text-[#3730A3]', Icon: Mail },
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
      className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#3730A3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#312E81] transition-colors"
    >
      {label}
    </Link>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#3730A3]">
      {role === 'admin' ? 'Administrador' : 'Membro'}
    </span>
  )
}
