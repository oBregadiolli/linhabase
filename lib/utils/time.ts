export function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '0h'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6)
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function periodLabel(view: 'table' | 'month' | 'week' | 'day', date: Date): string {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const weekdays = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

  if (view === 'month' || view === 'table') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }
  if (view === 'week') {
    const start = startOfWeek(date)
    const end = endOfWeek(date)
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} de ${months[start.getMonth()]} ${start.getFullYear()}`
    }
    return `${start.getDate()} ${months[start.getMonth()].slice(0,3)} – ${end.getDate()} ${months[end.getMonth()].slice(0,3)} ${end.getFullYear()}`
  }
  return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

const COLORS = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', badge: 'bg-blue-100 text-blue-700', block: '#3B82F6' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D', badge: 'bg-green-100 text-green-700', block: '#22C55E' },
  { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE', badge: 'bg-purple-100 text-purple-700', block: '#A855F7' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', badge: 'bg-orange-100 text-orange-700', block: '#F97316' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C', badge: 'bg-rose-100 text-rose-700', block: '#F43F5E' },
  { bg: '#ECFDF5', border: '#10B981', text: '#065F46', badge: 'bg-emerald-100 text-emerald-700', block: '#10B981' },
  { bg: '#FFFBEB', border: '#F59E0B', text: '#B45309', badge: 'bg-amber-100 text-amber-700', block: '#F59E0B' },
  { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1', badge: 'bg-sky-100 text-sky-700', block: '#0EA5E9' },
]

const colorCache: Record<string, number> = {}

export function getProjectColorIndex(project: string): number {
  if (colorCache[project] !== undefined) return colorCache[project]
  let hash = 0
  for (let i = 0; i < project.length; i++) {
    hash = (hash * 31 + project.charCodeAt(i)) & 0xffff
  }
  colorCache[project] = Math.abs(hash) % COLORS.length
  return colorCache[project]
}

export function getProjectColor(project: string) {
  return COLORS[getProjectColorIndex(project)]
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Rascunho',
    submitted: 'Enviado',
    approved: 'Aprovado',
  }
  return map[status] ?? status
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}
