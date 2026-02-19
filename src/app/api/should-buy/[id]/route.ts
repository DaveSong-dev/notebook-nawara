import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        priceStats: true,
        analysis: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    const monthsOld = product.releaseDate
      ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : null

    const factors: Array<{ factor: string; positive: boolean; weight: number }> = []
    let score = 50

    // 가격 요인
    const stats = product.priceStats
    if (stats) {
      if (stats.avg30d && stats.currentLowest < stats.avg30d * 0.9) {
        factors.push({ factor: `현재가가 30일 평균보다 ${(((stats.avg30d - stats.currentLowest) / stats.avg30d) * 100).toFixed(0)}% 저렴`, positive: true, weight: 25 })
        score += 25
      } else if (stats.avg30d && stats.currentLowest > stats.avg30d * 1.05) {
        factors.push({ factor: '현재가가 최근 평균보다 높음', positive: false, weight: 15 })
        score -= 15
      }

      if (stats.priceTrend === 'falling') {
        factors.push({ factor: '가격 하락 추세 진행 중', positive: false, weight: 10 })
        score -= 10
      } else if (stats.priceTrend === 'rising') {
        factors.push({ factor: '가격 상승 추세 - 빠른 결정 추천', positive: true, weight: 10 })
        score += 10
      }

      if (stats.priceDropFlag) {
        factors.push({ factor: '가격 급락 감지', positive: true, weight: 15 })
        score += 15
      }
    }

    // 출시일 요인
    if (monthsOld !== null) {
      if (monthsOld < 6) {
        factors.push({ factor: '신제품 (6개월 이내 출시)', positive: true, weight: 15 })
        score += 15
      } else if (monthsOld > 24) {
        factors.push({ factor: `출시 ${monthsOld}개월 경과 - 구형 모델`, positive: false, weight: 20 })
        score -= 20
      }
    }

    const shouldBuy = score >= 55
    const verdict = score >= 75 ? '적극 추천' : score >= 55 ? '구매 가능' : score >= 40 ? '보류 추천' : '비추천'
    const reason = buildVerdict(factors, shouldBuy, stats, monthsOld)

    return NextResponse.json({
      shouldBuy,
      score: Math.max(0, Math.min(100, score)),
      verdict,
      reason,
      factors,
      monthsOld,
    })
  } catch (error) {
    console.error('Should-buy API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

function buildVerdict(
  factors: Array<{ factor: string; positive: boolean }>,
  shouldBuy: boolean,
  stats: { currentLowest: number; avg30d?: number | null } | null,
  monthsOld: number | null,
): string {
  if (!shouldBuy) {
    if (monthsOld && monthsOld > 24) {
      return `출시된 지 ${monthsOld}개월이 지난 구형 모델입니다. 후속 신제품 출시 가능성이 높으니 최신 모델을 먼저 확인해 보세요.`
    }
    return '현재 시점에서는 구매를 잠시 보류하는 것을 추천합니다. 가격이 더 내려갈 가능성이 있습니다.'
  }

  const positiveFactors = factors.filter((f) => f.positive)
  if (positiveFactors.length > 0) {
    return `${positiveFactors[0].factor}. 지금이 구매하기 좋은 시점입니다.`
  }
  return '가격과 출시일을 종합했을 때 구매를 고려해 볼 만합니다.'
}
