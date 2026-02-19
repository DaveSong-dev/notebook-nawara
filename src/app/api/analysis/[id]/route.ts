import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateUsageScores, calculateWorkSuitability, analyzeDisplaySuitability, analyzePortSuitability, analyzeTechFeatures } from '@/lib/analysis/performance'
import { estimateGameFps } from '@/lib/analysis/game-fps'
import { analyzePrices } from '@/lib/analysis/price'
import { generateWithFallback } from '@/lib/llm/client'
import { buildAnalysisPrompt } from '@/lib/llm/prompts'
import type { ParsedSpec } from '@/types/product'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        specs: true,
        prices: { orderBy: { date: 'asc' } },
        priceStats: true,
        analysis: true,
        gameEstimates: true,
        techFeatures: true,
        displayInfo: true,
        portInfo: true,
      },
    })

    if (!product || !product.specs) {
      return NextResponse.json({ error: '상품 또는 스펙 정보가 없습니다' }, { status: 404 })
    }

    const specs: ParsedSpec = {
      cpu: product.specs.cpu,
      cpuGen: product.specs.cpuGen ?? undefined,
      gpu: product.specs.gpu ?? undefined,
      gpuVram: product.specs.gpuVram ?? undefined,
      gpuTier: product.specs.gpuTier ?? undefined,
      ramGb: product.specs.ramGb,
      ramType: product.specs.ramType ?? undefined,
      ssdGb: product.specs.ssdGb,
      screenSize: product.specs.screenSize ?? undefined,
      resolution: product.specs.resolution ?? undefined,
      refreshRate: product.specs.refreshRate ?? undefined,
      panelType: product.specs.panelType ?? undefined,
      brightness: product.specs.brightness ?? undefined,
      weightKg: product.specs.weightKg ?? undefined,
      batteryWh: product.specs.batteryWh ?? undefined,
      usbCCount: product.specs.usbCCount ?? undefined,
      thunderbolt: product.specs.thunderbolt,
      hdmiVersion: product.specs.hdmiVersion ?? undefined,
      sdCard: product.specs.sdCard,
      lanPort: product.specs.lanPort,
      audioJack: product.specs.audioJack,
      wifiVersion: product.specs.wifiVersion ?? undefined,
      btVersion: product.specs.btVersion ?? undefined,
      pcieGen: product.specs.pcieGen ?? undefined,
      hasNpu: product.specs.hasNpu,
    }

    const currentLowest = product.priceStats?.currentLowest ?? parseInt(product.prices[product.prices.length - 1]?.price?.toString() ?? '0')

    const priceHistory = product.prices.map((p) => ({ price: p.price, date: p.date }))
    const priceAnalysis = analyzePrices(priceHistory, currentLowest)

    const usageScores = calculateUsageScores(specs, currentLowest)
    const workSuitability = calculateWorkSuitability(specs)
    const displaySuitability = analyzeDisplaySuitability(specs)
    const portSuitability = analyzePortSuitability(specs)
    const techFeatures = analyzeTechFeatures(specs)
    const gameEstimates = estimateGameFps(specs.gpuTier ?? 1, specs.refreshRate)

    const monthsSinceRelease = product.releaseDate
      ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : undefined

    // LLM 분석
    const prompt = buildAnalysisPrompt({
      name: product.name,
      brand: product.brand,
      specs,
      priceAnalysis,
      scores: usageScores,
      gameEstimates,
      monthsSinceRelease,
    })

    const llmResult = await generateWithFallback(
      prompt,
      `analysis:${id}`,
      'analysis',
      id,
    )

    let llmAdvice = null
    try {
      const parsed = JSON.parse(llmResult.text)
      llmAdvice = { ...parsed, provider: llmResult.provider, cached: llmResult.cached }
    } catch {
      llmAdvice = null
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        releaseDate: product.releaseDate,
        mallUrl: product.mallUrl,
        monthsSinceRelease,
      },
      specs,
      priceAnalysis,
      usageScores,
      workSuitability,
      displaySuitability,
      portSuitability,
      techFeatures,
      gameEstimates,
      llmAdvice,
    })
  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json({ error: '분석 중 오류가 발생했습니다' }, { status: 500 })
  }
}
