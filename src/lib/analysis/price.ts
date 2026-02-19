import type { PriceAnalysis } from '@/types/product'

interface PriceRecord {
  price: number
  date: Date
}

export function analyzePrices(history: PriceRecord[], currentLowest: number): PriceAnalysis {
  const now = new Date()
  const days7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const prices7d = history.filter((h) => h.date >= days7).map((h) => h.price)
  const prices30d = history.filter((h) => h.date >= days30).map((h) => h.price)
  const prices90d = history.filter((h) => h.date >= days90).map((h) => h.price)
  const allPrices = history.map((h) => h.price)

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

  const avg7d = avg(prices7d)
  const avg30d = avg(prices30d)
  const avg90d = avg(prices90d)
  const allTimeAvg = avg(allPrices)
  const allTimeMin = allPrices.length ? Math.min(...allPrices) : null
  const allTimeMax = allPrices.length ? Math.max(...allPrices) : null

  // 가격 급락 감지: 7일 평균 대비 현재가 10% 이상 낮으면
  const priceDropDetected = avg7d !== null && currentLowest < avg7d * 0.9
  const dropPercent = avg7d ? ((avg7d - currentLowest) / avg7d) * 100 : null

  // 추세 분석: 최근 7일 평균 vs 이전 30일 평균
  let priceTrend: 'rising' | 'falling' | 'stable' | null = null
  if (avg7d && avg30d) {
    const diff = ((avg7d - avg30d) / avg30d) * 100
    if (diff > 3) priceTrend = 'rising'
    else if (diff < -3) priceTrend = 'falling'
    else priceTrend = 'stable'
  }

  // 30일 평균 대비 현재가 비율
  const vsAvg30dPercent = avg30d ? ((avg30d - currentLowest) / avg30d) * 100 : null

  // 가성비 점수 (임시 - 실제는 비슷한 스펙 제품들과 비교)
  const valueScore = calculateValueScore(currentLowest, avg30d, allTimeMin, allTimeMax)

  // 가성비 티어
  const valueTier: 'high' | 'mid' | 'low' =
    valueScore >= 70 ? 'low' : valueScore >= 40 ? 'mid' : 'high'

  // 한 줄 요약
  const summary = buildPriceSummary(vsAvg30dPercent, priceDropDetected, priceTrend, allTimeMin, currentLowest)

  // 가격 이상 감지
  const { priceAnomalyWarning, priceAnomalyLevel } = detectPriceAnomaly(
    currentLowest, avg7d, avg30d, allTimeAvg, dropPercent
  )

  return {
    currentLowest,
    avg7d,
    avg30d,
    avg90d,
    allTimeMin,
    allTimeMax,
    allTimeAvg,
    priceDropDetected,
    dropPercent,
    priceTrend,
    valueScore,
    valueTier,
    summary,
    vsAvg30dPercent,
    priceAnomalyWarning,
    priceAnomalyLevel,
  }
}

function detectPriceAnomaly(
  current: number,
  avg7d: number | null,
  avg30d: number | null,
  allTimeAvg: number | null,
  dropPercent: number | null,
): { priceAnomalyWarning: string | null; priceAnomalyLevel: 'none' | 'caution' | 'danger' } {
  const refPrice = avg30d ?? avg7d ?? allTimeAvg

  if (!refPrice || !dropPercent) {
    return { priceAnomalyWarning: null, priceAnomalyLevel: 'none' }
  }

  // 20% 이상 급락 → 위험 (잘못 연동 가능성 높음)
  if (dropPercent >= 20) {
    return {
      priceAnomalyLevel: 'danger',
      priceAnomalyWarning:
        `가격이 평균 대비 ${Math.round(dropPercent)}% 급락했습니다. ` +
        '이 경우 행사가로 저렴해졌거나, 병행수입 제품이 잘못 연동되어 가격이 저렴하거나, ' +
        '완전히 다른 제품이 연동되었을 수 있으니 구매 전 반드시 확인하세요.',
    }
  }

  // 10~20% 급락 → 주의
  if (dropPercent >= 10) {
    return {
      priceAnomalyLevel: 'caution',
      priceAnomalyWarning:
        `가격이 평균 대비 ${Math.round(dropPercent)}% 하락했습니다. ` +
        '행사 할인일 수 있지만, 병행수입 제품이나 다른 제품이 잘못 연동된 경우도 있으니 ' +
        '판매처와 상품 정보를 꼭 확인하세요.',
    }
  }

  return { priceAnomalyWarning: null, priceAnomalyLevel: 'none' }
}

function calculateValueScore(
  current: number,
  avg30d: number | null,
  allTimeMin: number | null,
  allTimeMax: number | null,
): number {
  if (!avg30d) return 50

  // 30일 평균 대비 현재가 위치 (낮을수록 가성비 좋음)
  const ratio = current / avg30d
  if (ratio <= 0.85) return 85 + Math.min(15, (0.85 - ratio) * 100)
  if (ratio <= 0.95) return 70 + (0.95 - ratio) * 150
  if (ratio <= 1.0) return 50 + (1.0 - ratio) * 200
  if (ratio <= 1.1) return 30 + (1.1 - ratio) * 200
  return Math.max(0, 30 - (ratio - 1.1) * 100)
}

function buildPriceSummary(
  vsAvg30d: number | null,
  dropDetected: boolean,
  trend: 'rising' | 'falling' | 'stable' | null,
  allTimeMin: number | null,
  current: number,
): string {
  if (dropDetected) {
    return `🔥 가격 급락! 최근 7일 평균보다 ${Math.abs(vsAvg30d ?? 0).toFixed(0)}% 저렴합니다.`
  }
  if (allTimeMin && current <= allTimeMin * 1.02) {
    return '📉 역대 최저가 수준입니다. 지금이 구매 적기입니다.'
  }
  if (vsAvg30d !== null) {
    if (vsAvg30d > 0) {
      return `최근 30일 평균보다 ${vsAvg30d.toFixed(1)}% 저렴합니다.`
    } else if (vsAvg30d < -5) {
      return `최근 30일 평균보다 ${Math.abs(vsAvg30d).toFixed(1)}% 비쌉니다. 조금 기다리는 것도 좋습니다.`
    }
  }
  if (trend === 'rising') return '📈 가격이 오르는 추세입니다. 빠른 결정을 추천합니다.'
  if (trend === 'falling') return '📉 가격이 내리는 추세입니다. 조금 더 기다리면 좋을 수 있습니다.'
  return '가격이 안정적입니다.'
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}

export function getPriceBudgetLabel(price: number): string {
  if (price < 500000) return '50만원 미만'
  if (price < 700000) return '50-70만원'
  if (price < 1000000) return '70-100만원'
  if (price < 1500000) return '100-150만원'
  if (price < 2000000) return '150-200만원'
  if (price < 3000000) return '200-300만원'
  return '300만원 이상'
}
