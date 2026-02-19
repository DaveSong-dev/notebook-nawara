import type { RecommendRequest, Recommendation } from '@/types/product'
import { prisma } from '@/lib/db'
import { calculateUsageScores } from '@/lib/analysis/performance'
import { analyzePrices } from '@/lib/analysis/price'

export async function getRecommendations(
  request: RecommendRequest,
  limit = 5,
): Promise<Recommendation[]> {
  const where: Record<string, unknown> = {}

  // 예산 필터
  if (request.budget) {
    where.priceStats = {
      currentLowest: {
        gte: request.budget.min,
        lte: request.budget.max,
      },
    }
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      specs: true,
      priceStats: true,
      analysis: true,
    },
    take: 100,
  })

  const scored = products
    .filter((p) => p.specs && p.priceStats)
    .map((p) => {
      const scores = p.analysis
        ? {
            gaming: p.analysis.scoreGaming,
            work: p.analysis.scoreWork,
            student: p.analysis.scoreStudent,
            video: p.analysis.scoreVideo,
            portable: p.analysis.scorePortable,
            overall: p.analysis.scoreOverall,
          }
        : calculateUsageScores(
            {
              cpu: p.specs!.cpu,
              cpuGen: p.specs!.cpuGen ?? undefined,
              gpu: p.specs!.gpu ?? undefined,
              gpuVram: p.specs!.gpuVram ?? undefined,
              gpuTier: p.specs!.gpuTier ?? undefined,
              ramGb: p.specs!.ramGb,
              ramType: p.specs!.ramType ?? undefined,
              ssdGb: p.specs!.ssdGb,
              screenSize: p.specs!.screenSize ?? undefined,
              resolution: p.specs!.resolution ?? undefined,
              refreshRate: p.specs!.refreshRate ?? undefined,
              panelType: p.specs!.panelType ?? undefined,
              brightness: p.specs!.brightness ?? undefined,
              weightKg: p.specs!.weightKg ?? undefined,
              batteryWh: p.specs!.batteryWh ?? undefined,
              usbCCount: p.specs!.usbCCount ?? undefined,
              thunderbolt: p.specs!.thunderbolt,
              hdmiVersion: p.specs!.hdmiVersion ?? undefined,
              sdCard: p.specs!.sdCard,
              lanPort: p.specs!.lanPort,
              audioJack: p.specs!.audioJack,
              wifiVersion: p.specs!.wifiVersion ?? undefined,
              btVersion: p.specs!.btVersion ?? undefined,
              pcieGen: p.specs!.pcieGen ?? undefined,
              hasNpu: p.specs!.hasNpu,
            },
            p.priceStats?.currentLowest,
          )

      const matchScore = calculateMatchScore(scores, request)
      const reasons = buildReasons(p, scores, request)
      const warnings = buildWarnings(p, scores)
      const { shouldBuy, shouldBuyReason } = determineShouldBuy(p)

      return {
        product: {
          id: p.id,
          naverId: p.naverId,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          releaseDate: p.releaseDate,
          mallUrl: p.mallUrl,
          specs: null,
          priceStats: null,
          analysis: scores,
          gameEstimates: [],
          shouldBuy,
          shouldBuyReason,
        },
        matchScore,
        reasons,
        warnings,
        shouldBuy,
        shouldBuyReason,
      } as Recommendation
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)

  return scored
}

function calculateMatchScore(
  scores: { gaming: number; work: number; student: number; video: number; portable: number; overall: number },
  request: RecommendRequest,
): number {
  if (!request.usage?.length) return scores.overall

  const usageWeights: Record<string, number> = {
    gaming: scores.gaming,
    work: scores.work,
    student: scores.student,
    video: scores.video,
    portable: scores.portable,
  }

  const selectedScores = request.usage.map((u) => usageWeights[u] ?? 0)
  const base = selectedScores.reduce((a, b) => a + b, 0) / selectedScores.length

  // 우선순위 보정
  let bonus = 0
  if (request.priority === 'performance' && Math.max(scores.gaming, scores.work) > 80) bonus += 10
  if (request.priority === 'portable' && scores.portable > 75) bonus += 10
  if (request.priority === 'value') bonus += 5 // 가성비는 가격 필터로 처리됨
  if (request.priority === 'latest') bonus += 3

  return Math.min(100, base + bonus)
}

function buildReasons(
  product: { name: string; analysis?: { scoreGaming: number; scoreWork: number; scoreStudent: number } | null; priceStats?: { currentLowest: number; priceDropFlag: boolean } | null },
  scores: { gaming: number; work: number; student: number; video: number; portable: number },
  request: RecommendRequest,
): string[] {
  const reasons: string[] = []

  if (request.usage?.includes('gaming') && scores.gaming >= 70) {
    reasons.push(`게임 성능 점수 ${scores.gaming}점으로 우수합니다`)
  }
  if (request.usage?.includes('work') && scores.work >= 70) {
    reasons.push(`작업/코딩 성능 점수 ${scores.work}점으로 적합합니다`)
  }
  if (request.usage?.includes('portable') && scores.portable >= 75) {
    reasons.push(`휴대성 점수 ${scores.portable}점으로 가볍고 오래 쓸 수 있습니다`)
  }
  if (product.priceStats?.priceDropFlag) {
    reasons.push('현재 가격이 최근 평균보다 저렴합니다')
  }

  return reasons.slice(0, 3)
}

function buildWarnings(
  product: { releaseDate?: Date | null; analysis?: { isOld: boolean } | null },
  scores: { gaming: number; video: number },
): string[] {
  const warnings: string[] = []

  if (product.analysis?.isOld) {
    warnings.push('출시된 지 2년이 넘은 모델입니다')
  }
  if (scores.gaming < 30) {
    warnings.push('게임 성능이 낮습니다')
  }
  if (scores.video < 30) {
    warnings.push('영상편집에는 적합하지 않습니다')
  }

  return warnings
}

function determineShouldBuy(
  product: {
    releaseDate?: Date | null
    priceStats?: { currentLowest: number; avg30d?: number | null; priceTrend?: string | null } | null
  }
): { shouldBuy: boolean; shouldBuyReason: string } {
  const monthsOld = product.releaseDate
    ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    : null

  // 구형 모델 (2년 초과)
  if (monthsOld && monthsOld > 24) {
    return {
      shouldBuy: false,
      shouldBuyReason: `출시된 지 ${monthsOld}개월이 지났습니다. 후속 모델 출시 가능성이 높으니 신제품을 확인해 보세요.`,
    }
  }

  // 가격이 30일 평균 대비 10% 이상 저렴
  const stats = product.priceStats
  if (stats?.avg30d && stats.currentLowest < stats.avg30d * 0.9) {
    return {
      shouldBuy: true,
      shouldBuyReason: `현재 가격이 30일 평균보다 ${(((stats.avg30d - stats.currentLowest) / stats.avg30d) * 100).toFixed(0)}% 저렴합니다. 지금이 구매 적기입니다.`,
    }
  }

  // 가격 상승 추세
  if (stats?.priceTrend === 'rising') {
    return {
      shouldBuy: true,
      shouldBuyReason: '가격이 오르는 추세입니다. 더 늦기 전에 구매를 고려해 보세요.',
    }
  }

  // 가격 하락 추세
  if (stats?.priceTrend === 'falling') {
    return {
      shouldBuy: false,
      shouldBuyReason: '가격이 내리는 추세입니다. 조금 더 기다리면 더 저렴하게 살 수 있을 수 있습니다.',
    }
  }

  return {
    shouldBuy: true,
    shouldBuyReason: '가격이 안정적입니다. 필요하다면 지금 구매해도 좋습니다.',
  }
}
