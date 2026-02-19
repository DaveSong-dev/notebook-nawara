'use client'

interface PriceAnomalyBannerProps {
  level: 'none' | 'caution' | 'danger'
  warning: string | null
}

export default function PriceAnomalyBanner({ level, warning }: PriceAnomalyBannerProps) {
  if (level === 'none' || !warning) return null

  const isDanger = level === 'danger'

  return (
    <div
      className={`rounded-2xl border-2 p-4 mb-6 ${
        isDanger
          ? 'bg-red-50 border-red-300'
          : 'bg-yellow-50 border-yellow-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{isDanger ? '🚨' : '⚠️'}</span>
        <div>
          <h3
            className={`text-sm font-bold mb-1 ${
              isDanger ? 'text-red-700' : 'text-yellow-700'
            }`}
          >
            {isDanger ? '가격 이상 감지 - 주의 필요!' : '가격 변동 감지'}
          </h3>
          <p
            className={`text-sm leading-relaxed ${
              isDanger ? 'text-red-600' : 'text-yellow-700'
            }`}
          >
            {warning}
          </p>
          <div
            className={`mt-3 text-xs font-medium rounded-lg inline-block px-3 py-1.5 ${
              isDanger
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            구매 전 판매처에서 정확한 상품 정보를 반드시 확인하세요
          </div>
        </div>
      </div>
    </div>
  )
}
