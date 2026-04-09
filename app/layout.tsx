import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { ToastProvider } from '@/components/ui/toast'

// Single font with CSS variable — used by Tailwind's font-sans and shadcn
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'LinhaBase — Timesheet',
  description: 'Apontamento inteligente e controle de horas simplificado para equipes e projetos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(inter.variable, 'font-sans')}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
