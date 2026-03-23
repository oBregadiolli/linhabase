'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-gray-200 p-10 max-w-sm w-full text-center space-y-4 shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Algo deu errado</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ocorreu um erro ao carregar o dashboard.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-gray-400 font-mono">{error.digest}</p>
          )}
        </div>
        <Button onClick={reset} className="bg-[#3730A3] hover:bg-[#312E81] w-full">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
