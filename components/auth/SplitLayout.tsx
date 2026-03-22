'use client'

import React from 'react'

interface SplitLayoutProps {
  children: React.ReactNode
}

export default function SplitLayout({ children }: SplitLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center bg-[#F3F4F6] px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md px-8 py-10">
          {children}
        </div>
      </div>

      {/* Right panel — branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#1D4ED8] px-10">
        <div className="text-center max-w-sm">
          <h1 className="text-4xl font-bold text-white mb-4">LinhaBase</h1>
          <p className="text-white/90 text-lg leading-relaxed">
            <span className="text-[#F59E0B] font-semibold">Orçamentos precisos</span>{' '}
            e gestão de projetos simplificada para consultores e empresas.
          </p>
        </div>
      </div>
    </div>
  )
}
