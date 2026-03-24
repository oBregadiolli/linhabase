import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"

// Single font with CSS variable — used by Tailwind's font-sans and shadcn
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'LinhaBase — Timesheet',
  description: 'Orçamentos precisos e gestão de projetos simplificada para consultores e empresas.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn(inter.variable, 'font-sans')}>
      <body>{children}</body>
    </html>
  )
}
