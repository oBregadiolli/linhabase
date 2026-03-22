'use client'

interface PasswordStrengthProps {
  password: string
}

function getScore(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  // Map 0-5 → 0-4 segments
  if (score === 0) return 0
  if (score <= 2) return 1
  if (score === 3) return 2
  if (score === 4) return 3
  return 4
}

const segmentColors = [
  'bg-gray-200', // 0 — empty
  'bg-red-500',  // 1 — fraca
  'bg-orange-400', // 2 — razoável
  'bg-yellow-400', // 3 — boa
  'bg-green-500',  // 4 — forte
]

const labels = ['', 'Muito fraca', 'Fraca', 'Boa', 'Forte']

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null
  const score = getScore(password)

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              score >= i ? segmentColors[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className="text-xs text-gray-500">
          Força da senha: <span className="font-medium">{labels[score]}</span>
        </p>
      )}
    </div>
  )
}
