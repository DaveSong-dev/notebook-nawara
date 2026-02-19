interface ScoreBarProps {
  score: number
  label: string
  showNumber?: boolean
  size?: 'sm' | 'md'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-red-400'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return '매우 적합'
  if (score >= 60) return '적합'
  if (score >= 40) return '보통'
  return '부적합'
}

export default function ScoreBar({ score, label, showNumber = true, size = 'md' }: ScoreBarProps) {
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className={`${textSize} font-medium text-gray-700`}>{label}</span>
        {showNumber && (
          <span className={`${textSize} font-bold text-gray-900`}>
            {score}점 <span className="font-normal text-gray-500">({getScoreLabel(score)})</span>
          </span>
        )}
      </div>
      <div className={`w-full bg-gray-200 rounded-full ${barHeight} overflow-hidden`}>
        <div
          className={`${barHeight} rounded-full score-bar ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
