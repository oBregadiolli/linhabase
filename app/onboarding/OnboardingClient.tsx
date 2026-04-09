'use client'

import { useState, useTransition } from 'react'
import { Building2, ArrowRight, Loader2, Clock, Users, LayoutDashboard, CheckCircle2 } from 'lucide-react'
import { createCompanyAction } from './actions'

export default function OnboardingClient({ userName }: { userName: string }) {
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const firstName = userName.split(' ')[0] || 'usuário'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!companyName.trim() || companyName.trim().length < 2) {
      setError('Nome da empresa deve ter pelo menos 2 caracteres.')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('companyName', companyName.trim())
      const result = await createCompanyAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const steps = [
    {
      icon: Building2,
      title: 'Crie sua empresa',
      description: 'Defina o nome da organização',
      active: true,
    },
    {
      icon: Users,
      title: 'Convide o time',
      description: 'Adicione membros à equipe',
      active: false,
    },
    {
      icon: Clock,
      title: 'Aponte horas',
      description: 'Comece a registrar apontamentos',
      active: false,
    },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Branding */}
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
          {/* Grid pattern */}
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
          {/* Logo */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white tracking-tight">LinhaBase</h2>
            <div className="mt-1 h-0.5 w-8 rounded-full bg-blue-400/60" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Configure seu<br />
            <span className="text-blue-300">espaço de trabalho</span>
          </h1>
          <p className="text-blue-200/80 text-lg max-w-md leading-relaxed">
            Em poucos segundos você terá tudo pronto para gerenciar
            apontamentos e acompanhar a produtividade da sua equipe.
          </p>

          {/* Steps preview */}
          <div className="mt-12 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    step.active
                      ? 'bg-white/20 text-white ring-1 ring-white/30 shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 text-blue-300/50'
                  }`}
                >
                  {step.active ? (
                    <step.icon className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      step.active ? 'text-white' : 'text-blue-300/50'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p
                    className={`text-xs ${
                      step.active ? 'text-blue-200/60' : 'text-blue-300/30'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
                {step.active && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-200 ring-1 ring-white/10">
                      Passo atual
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer on branded panel */}
        <div className="relative z-10 px-12 xl:px-16 pb-8">
          <p className="text-xs text-blue-300/40">
            © {new Date().getFullYear()} LinhaBase · Apontamento inteligente
          </p>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center bg-[#FAFBFC] px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">LinhaBase</h2>
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Bem-vindo, {firstName}! 👋
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Crie sua empresa para começar a gerenciar apontamentos de horas e projetos.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="company-name" className="text-sm font-semibold text-gray-700">
                  Nome da empresa
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
                  <input
                    id="company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      setError('')
                    }}
                    placeholder="Ex: Tech Solutions Ltda"
                    autoFocus
                    autoComplete="organization"
                    maxLength={100}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200
                      text-sm text-gray-900 bg-gray-50/50
                      focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white
                      placeholder:text-gray-400 transition-all duration-200"
                  />
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              {/* What you get */}
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-blue-50/30 border border-gray-100 px-4 py-3.5">
                <p className="text-xs font-semibold text-gray-600 mb-2.5">Ao criar sua empresa, você poderá:</p>
                <ul className="space-y-2">
                  {[
                    { icon: LayoutDashboard, text: 'Acessar o painel de apontamentos' },
                    { icon: Users, text: 'Convidar membros e gerenciar equipes' },
                    { icon: Clock, text: 'Registrar e acompanhar horas por projeto' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm border border-gray-100">
                        <item.icon className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-xs text-gray-600">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="submit"
                disabled={isPending || !companyName.trim()}
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
                    Criando empresa...
                  </>
                ) : (
                  <>
                    Criar empresa e continuar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Você poderá alterar o nome depois nas configurações.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
