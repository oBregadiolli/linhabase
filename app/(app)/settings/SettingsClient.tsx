'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, Camera, Mail, Phone, Shield, Building2,
  Calendar, Check, Loader2, Lock, Eye, EyeOff, Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Sidebar from '@/components/timesheets/Sidebar'
import { updateProfile, updateAvatar, updatePassword } from './actions'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  created_at: string
}

interface SettingsClientProps {
  profile: ProfileData
  companyName: string | null
  companyRole: string | null
  isAdmin: boolean
  userEmail: string
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

function roleLabel(role: string | null): string {
  const map: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gerente',
    member: 'Membro',
  }
  return role ? map[role] ?? role : 'Sem função'
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export default function SettingsClient({
  profile,
  companyName,
  companyRole,
  isAdmin,
  userEmail,
}: SettingsClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile states
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  // Feedback
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [isPendingProfile, startProfileTransition] = useTransition()
  const [isPendingPassword, startPasswordTransition] = useTransition()

  const supabase = createClient()

  const joinedDate = new Date(profile.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  // ── Avatar upload ───────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setProfileError('A imagem deve ter no máximo 2MB.')
      return
    }

    setUploadingAvatar(true)
    setProfileError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${profile.id}/avatar.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setProfileError(`Erro no upload: ${uploadError.message}`)
      setUploadingAvatar(false)
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Add cache-busting query param
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    // Save URL to profile
    const result = await updateAvatar(urlWithCacheBust)
    if (result.success) {
      setAvatarUrl(urlWithCacheBust)
    } else {
      setProfileError(result.error ?? 'Erro ao salvar avatar.')
    }

    setUploadingAvatar(false)
  }

  // ── Remove avatar ───────────────────────────────────────────
  async function handleRemoveAvatar() {
    setUploadingAvatar(true)
    setProfileError(null)

    const result = await updateAvatar(null)
    if (result.success) {
      setAvatarUrl(null)
    } else {
      setProfileError(result.error ?? 'Erro ao remover avatar.')
    }

    setUploadingAvatar(false)
  }

  // ── Save profile ────────────────────────────────────────────
  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSaved(false)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('phone', phone)

    startProfileTransition(async () => {
      const result = await updateProfile(formData)
      if (result.success) {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
        router.refresh()
      } else {
        setProfileError(result.error ?? 'Erro ao salvar.')
      }
    })
  }

  // ── Change password ─────────────────────────────────────────
  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não conferem.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    startPasswordTransition(async () => {
      const result = await updatePassword(currentPassword, newPassword)
      if (result.success) {
        setPasswordSaved(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordSaved(false), 3000)
      } else {
        setPasswordError(result.error ?? 'Erro ao alterar senha.')
      }
    })
  }

  return (
    <div className="flex h-screen bg-[#F3F4F6] overflow-hidden">
      <Sidebar userName={profile.name} userEmail={userEmail} avatarUrl={avatarUrl} isAdmin={isAdmin} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center gap-4 bg-white border-b border-gray-200 px-6 h-14">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Configurações</h1>
            <p className="text-xs text-gray-400">Gerencie seu perfil e preferências</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

            {/* ── Avatar / Profile Header ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Banner gradient */}
              <div className="h-20 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6]" />

              <div className="px-6 pb-6 pt-5">
                {/* Avatar + Info row */}
                <div className="flex items-start gap-5">
                  <div className="relative group shrink-0 -mt-14">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile.name}
                        className="h-20 w-20 rounded-xl border-4 border-white shadow-lg object-cover bg-white"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl border-4 border-white shadow-lg bg-[#1D4ED8] flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{initials(profile.name)}</span>
                      </div>
                    )}

                    {/* Upload overlay */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold text-gray-900 truncate">{profile.name}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{userEmail}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {avatarUrl && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={uploadingAvatar}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            Remover foto
                          </button>
                        )}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="text-xs font-medium text-[#1D4ED8] hover:text-[#1e40af] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {companyName && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      {companyName}
                    </span>
                  )}
                  {companyRole && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] bg-blue-50 rounded-full px-3 py-1">
                      <Shield className="h-3 w-3" />
                      {roleLabel(companyRole)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-3 py-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    Membro desde {joinedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Profile Form ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  Informações pessoais
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Atualize seu nome e telefone.</p>
              </div>

              <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="settings-name" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nome completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        id="settings-name"
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1D4ED8] transition-colors"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="settings-phone" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Telefone <span className="text-gray-400">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        id="settings-phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(maskPhone(e.target.value))}
                        maxLength={15}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1D4ED8] transition-colors"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    E-mail <span className="text-gray-400">(não editável)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-100 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Feedback */}
                {profileError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                    {profileError}
                  </div>
                )}

                {profileSaved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                    <Check className="h-4 w-4" />
                    Perfil atualizado com sucesso!
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPendingProfile || !name.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isPendingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isPendingProfile ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            </div>

            {/* ── Password ── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  Alterar senha
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Defina uma nova senha para sua conta.</p>
              </div>

              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New password */}
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Nova senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        id="new-password"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#1D4ED8] transition-colors"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-600 mb-1.5">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={cn(
                          "w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors",
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-300 focus:border-red-400'
                            : 'border-gray-200 focus:border-[#1D4ED8]'
                        )}
                        placeholder="Repita a senha"
                        required
                      />
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-[11px] text-red-500 mt-1">As senhas não conferem.</p>
                    )}
                  </div>
                </div>

                {/* Feedback */}
                {passwordError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                    {passwordError}
                  </div>
                )}

                {passwordSaved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                    <Check className="h-4 w-4" />
                    Senha alterada com sucesso!
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPendingPassword || !newPassword || newPassword !== confirmPassword}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isPendingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {isPendingPassword ? 'Alterando...' : 'Alterar senha'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
