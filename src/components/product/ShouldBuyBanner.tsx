import type { PriceAnalysis } from '@/types/product'

interface ShouldBuyBannerProps {
  productId: string
  priceAnalysis: PriceAnalysis
  monthsSinceRelease?: number
}

export default function ShouldBuyBanner({ priceAnalysis, monthsSinceRelease }: ShouldBuyBannerProps) {
  let shouldBuy: boolean | null = null
  let verdict = ''
  let reason = ''
  let bgColor = 'bg-gray-50 border-gray-200'

  // 구형 모델
  if (monthsSinceRelease && monthsSinceRelease > 24) {
    shouldBuy = false
    verdict = '구매 보류 추천'
    reason = `출시 ${monthsSinceRelease}개월 경과. 후속 모델을 먼저 확인해보세요.`
    bgColor = 'bg-yellow-50 border-yellow-200'
  } else if (priceAnalysis.priceDropDetected) {
    shouldBuy = true
    verdict = '지금이 적기!'
    reason = priceAnalysis.summary
    bgColor = 'bg-green-50 border-green-200'
  } else if (priceAnalysis.priceTrend === 'falling') {
    shouldBuy = false
    verdict = '조금 더 기다려요'
    reason = '가격이 내리는 추세입니다. 조금 기다리면 더 저렴하게 살 수 있습니다.'
    bgColor = 'bg-blue-50 border-blue-200'
  } else if (priceAnalysis.vsAvg30dPercent !== null && priceAnalysis.vsAvg30dPercent > 5) {
    shouldBuy = true
    verdict = '지금이 싸요'
    reason = `30일 평균보다 ${priceAnalysis.vsAvg30dPercent.toFixed(1)}% 저렴합니다.`
    bgColor = 'bg-green-50 border-green-200'
  } else if (priceAnalysis.priceTrend === 'rising') {
    shouldBuy = true
    verdict = '빠른 결정 추천'
    reason = '가격이 오르는 추세입니다.'
    bgColor = 'bg-orange-50 border-orange-200'
  } else {
    verdict = '적당한 시기'
    reason = '현재 가격이 평균 수준입니다.'
    bgColor = 'bg-gray-50 border-gray-200'
  }

  const icon =
    shouldBuy === true ? '✅' : shouldBuy === false ? '⏳' : '⚖️'

  return (
    <div className={`border rounded-xl p-3 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold text-gray-800">지금 사도 될까요? → {verdict}</span>
      </div>
      <p className="text-xs text-gray-600 pl-7">{reason}</p>
    </div>
  )
}
