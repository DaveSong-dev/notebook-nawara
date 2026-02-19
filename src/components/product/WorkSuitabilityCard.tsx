import type { WorkSuitability } from '@/types/analysis'

const RATING_STYLES: Record<string, { color: string; label: string; icon: string }> = {
  excellent: { color: 'text-green-700 bg-green-50 border-green-200', label: '이 정도면 충분', icon: '✅' },
  good: { color: 'text-blue-700 bg-blue-50 border-blue-200', label: '문제없이 사용 가능', icon: '👍' },
  fair: { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', label: '조금 아쉬움', icon: '△' },
  poor: { color: 'text-red-600 bg-red-50 border-red-200', label: '추천하지 않음', icon: '✗' },
}

interface WorkSuitabilityCardProps {
  suitability: WorkSuitability
  llmSummaries?: Record<string, string>
}

export default function WorkSuitabilityCard({ suitability, llmSummaries }: WorkSuitabilityCardProps) {
  const items = [
    { label: '코딩 · 개발', rating: suitability.coding, icon: '💻', key: 'work' },
    { label: '영상 편집', rating: suitability.videoEdit, icon: '🎬', key: 'video' },
    { label: '포토샵 · 디자인', rating: suitability.photoshop, icon: '🎨', key: 'work' },
    { label: '3D · CAD', rating: suitability.threeD, icon: '🧊', key: 'work' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const style = RATING_STYLES[item.rating] ?? RATING_STYLES.fair
        return (
          <div
            key={item.label}
            className={`border rounded-xl p-3 ${style.color.split(' ').slice(1).join(' ')}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            <p className={`text-xs font-medium ${style.color.split(' ')[0]}`}>
              {style.icon} {style.label}
            </p>
            {llmSummaries?.[item.key] && (
              <p className="text-xs text-gray-600 mt-1">{llmSummaries[item.key]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
