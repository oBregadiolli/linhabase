'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Period navigator skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="py-3 flex justify-center">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        {/* Grid cells */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7 divide-x divide-gray-100">
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} className="min-h-[100px] p-2 border-b border-gray-100 flex flex-col gap-1.5">
                <Skeleton className="h-5 w-5 rounded-full" />
                {col % 3 !== 2 && <Skeleton className="h-5 w-full rounded" />}
                {col % 5 === 0 && <Skeleton className="h-5 w-4/5 rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex gap-6">
          {['Data', 'Projeto', 'Início', 'Fim', 'Duração', 'Status', 'Ações'].map(h => (
            <Skeleton key={h} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimelineSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="p-4 space-y-3" style={{ minHeight: 400 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
