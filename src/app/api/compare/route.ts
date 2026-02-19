import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateWithFallback } from '@/lib/llm/client'
import { buildComparisonPrompt } from '@/lib/llm/prompts'
import { calculateUsageScores } from '@/lib/analysis/performance'
import { analyzePrices } from '@/lib/analysis/price'
import type { ParsedSpec } from '@/types/product'

export async function POST(req: NextRequest) {
  try {
    const { ids } = (await req.json()) as { ids: string[] }

    if (!ids || ids.length < 2 || ids.length > 3) {
      return NextResponse.json({ error: '2~3개 상품 ID를 전달해 주세요' }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        specs: true,
        priceStats: true,
        prices: { orderBy: { date: 'asc' }, take: 90 },
        analysis: true,
      },
    })

    if (products.length < 2) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    const productData = products.map((p) => {
      const specs: ParsedSpec | null = p.specs
        ? {
            cpu: p.specs.cpu,
            cpuGen: p.specs.cpuGen ?? undefined,
            gpu: p.specs.gpu ?? undefined,
            gpuTier: p.specs.gpuTier ?? undefined,
            ramGb: p.specs.ramGb,
            ramType: p.specs.ramType ?? undefined,
            ssdGb: p.specs.ssdGb,
            screenSize: p.specs.screenSize ?? undefined,
            refreshRate: p.specs.refreshRate ?? undefined,
            weightKg: p.specs.weightKg ?? undefined,
            batteryWh: p.specs.batteryWh ?? undefined,
            panelType: p.specs.panelType ?? undefined,
          }
        : null

      const currentLowest = p.priceStats?.currentLowest ?? p.prices[p.prices.length - 1]?.price ?? 0
      const priceHistory = p.prices.map((ph) => ({ price: ph.price, date: ph.date }))
      const priceAnalysis = analyzePrices(priceHistory, currentLowest)

      const scores = specs
        ? calculateUsageScores(specs, currentLowest)
        : { gaming: 0, work: 0, student: 0, video: 0, portable: 0, overall: 0 }

      return { name: p.name, specs, priceAnalysis, scores }
    })

    // LLM 비교 생성
    const cacheKey = `compare:${ids.sort().join(':')}`
    const validProducts = productData.filter((p) => p.specs) as Parameters<typeof buildComparisonPrompt>[0]

    let llmComparison = null
    if (validProducts.length >= 2) {
      try {
        const prompt = buildComparisonPrompt(validProducts)
        const result = await generateWithFallback(prompt, cacheKey, 'comparison')
        const parsed = JSON.parse(result.text)
        llmComparison = { ...parsed, provider: result.provider, cached: result.cached }
      } catch {
        // LLM 실패시 무시
      }
    }

    return NextResponse.json({
      products: products.map((p, i) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        imageUrl: p.imageUrl,
        mallUrl: p.mallUrl,
        specs: productData[i].specs,
        priceAnalysis: productData[i].priceAnalysis,
        scores: productData[i].scores,
      })),
      llmComparison,
    })
  } catch (error) {
    console.error('Compare API error:', error)
    return NextResponse.json({ error: '비교 중 오류가 발생했습니다' }, { status: 500 })
  }
}
