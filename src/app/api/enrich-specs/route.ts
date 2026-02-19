import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateWithFallback } from '@/lib/llm/client'
import { buildSpecEnrichPrompt } from '@/lib/llm/prompts'
import { parseSpec } from '@/lib/spec-parser'
import { calculateUsageScores, analyzeDisplaySuitability, analyzePortSuitability, analyzeTechFeatures } from '@/lib/analysis/performance'
import { estimateGameFps } from '@/lib/analysis/game-fps'
import { analyzePrices } from '@/lib/analysis/price'
import type { ParsedSpec } from '@/types/product'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limitParam = parseInt(searchParams.get('limit') || '20')
  const forceParam = searchParams.get('force') === 'true'

  // 스펙이 부실한 제품 찾기 (LLM 보강이 안 된 제품)
  const products = await prisma.product.findMany({
    include: { specs: true },
    where: forceParam ? {} : {
      OR: [
        { specs: null },
        { specs: { resolution: null } },
        { specs: { weightKg: null } },
        { specs: { brightness: null } },
        { specs: { batteryWh: null } },
      ],
    },
    take: limitParam,
    orderBy: { createdAt: 'desc' },
  })

  let enriched = 0
  let failed = 0
  const errors: string[] = []

  for (const product of products) {
    try {
      // LLM 호출로 스펙 추론
      const prompt = buildSpecEnrichPrompt(product.name, product.brand)
      const llmResult = await generateWithFallback(
        prompt, `spec:${product.id}`, 'spec-enrich', product.id
      )
      const llmSpec = JSON.parse(llmResult.text) as Partial<ParsedSpec>

      // 이름 파싱 기본값
      const nameParsed = parseSpec(product.name)

      const spec: ParsedSpec = {
        cpu: llmSpec.cpu || nameParsed.cpu,
        cpuGen: llmSpec.cpuGen || nameParsed.cpuGen,
        gpu: llmSpec.gpu || nameParsed.gpu,
        gpuVram: llmSpec.gpuVram ?? nameParsed.gpuVram,
        gpuTier: nameParsed.gpuTier,
        ramGb: llmSpec.ramGb || nameParsed.ramGb,
        ramType: llmSpec.ramType || nameParsed.ramType,
        ssdGb: llmSpec.ssdGb || nameParsed.ssdGb,
        screenSize: llmSpec.screenSize ?? nameParsed.screenSize,
        resolution: llmSpec.resolution || nameParsed.resolution,
        refreshRate: llmSpec.refreshRate ?? nameParsed.refreshRate,
        panelType: llmSpec.panelType || nameParsed.panelType,
        brightness: llmSpec.brightness ?? nameParsed.brightness,
        colorGamut: llmSpec.colorGamut || nameParsed.colorGamut,
        weightKg: llmSpec.weightKg ?? nameParsed.weightKg,
        batteryWh: llmSpec.batteryWh ?? nameParsed.batteryWh,
        usbCCount: llmSpec.usbCCount ?? nameParsed.usbCCount,
        thunderbolt: llmSpec.thunderbolt ?? nameParsed.thunderbolt,
        hdmiVersion: llmSpec.hdmiVersion || nameParsed.hdmiVersion,
        sdCard: llmSpec.sdCard ?? nameParsed.sdCard,
        lanPort: llmSpec.lanPort ?? nameParsed.lanPort,
        audioJack: llmSpec.audioJack ?? nameParsed.audioJack,
        wifiVersion: llmSpec.wifiVersion || nameParsed.wifiVersion,
        btVersion: llmSpec.btVersion || nameParsed.btVersion,
        pcieGen: llmSpec.pcieGen || nameParsed.pcieGen,
        hasNpu: llmSpec.hasNpu ?? nameParsed.hasNpu,
      }

      // DB 업데이트 (upsert)
      await prisma.productSpec.upsert({
        where: { productId: product.id },
        update: {
          cpu: spec.cpu,
          cpuGen: spec.cpuGen,
          gpu: spec.gpu,
          gpuVram: spec.gpuVram,
          gpuTier: spec.gpuTier,
          ramGb: spec.ramGb,
          ramType: spec.ramType,
          ssdGb: spec.ssdGb,
          screenSize: spec.screenSize,
          resolution: spec.resolution,
          refreshRate: spec.refreshRate,
          panelType: spec.panelType,
          brightness: spec.brightness,
          weightKg: spec.weightKg,
          batteryWh: spec.batteryWh,
          usbCCount: spec.usbCCount,
          thunderbolt: spec.thunderbolt ?? false,
          hdmiVersion: spec.hdmiVersion,
          sdCard: spec.sdCard ?? false,
          lanPort: spec.lanPort ?? false,
          audioJack: spec.audioJack ?? true,
          wifiVersion: spec.wifiVersion,
          btVersion: spec.btVersion,
          pcieGen: spec.pcieGen,
          hasNpu: spec.hasNpu ?? false,
        },
        create: {
          productId: product.id,
          cpu: spec.cpu,
          cpuGen: spec.cpuGen,
          gpu: spec.gpu,
          gpuVram: spec.gpuVram,
          gpuTier: spec.gpuTier,
          ramGb: spec.ramGb,
          ramType: spec.ramType,
          ssdGb: spec.ssdGb,
          screenSize: spec.screenSize,
          resolution: spec.resolution,
          refreshRate: spec.refreshRate,
          panelType: spec.panelType,
          brightness: spec.brightness,
          weightKg: spec.weightKg,
          batteryWh: spec.batteryWh,
          usbCCount: spec.usbCCount,
          thunderbolt: spec.thunderbolt ?? false,
          hdmiVersion: spec.hdmiVersion,
          sdCard: spec.sdCard ?? false,
          lanPort: spec.lanPort ?? false,
          audioJack: spec.audioJack ?? true,
          wifiVersion: spec.wifiVersion,
          btVersion: spec.btVersion,
          pcieGen: spec.pcieGen,
          hasNpu: spec.hasNpu ?? false,
        },
      })

      // 관련 분석 데이터도 갱신
      const gameEstimates = estimateGameFps(spec.gpuTier ?? 1, spec.refreshRate)
      await prisma.gamePerformance.deleteMany({ where: { productId: product.id } })
      await prisma.gamePerformance.createMany({
        data: gameEstimates.map((e) => ({
          productId: product.id,
          gameName: e.gameName,
          gameSlug: e.gameSlug,
          fpsLow: e.fpsLow,
          fpsMid: e.fpsMid,
          fpsHigh: e.fpsHigh,
          playability: e.playability,
          summary: e.summary,
        })),
      })

      const techRaw = analyzeTechFeatures(spec)
      const { highlights: _h, ...tech } = techRaw
      await prisma.techFeatureFlag.upsert({
        where: { productId: product.id },
        update: tech,
        create: { productId: product.id, ...tech },
      })

      const display = analyzeDisplaySuitability(spec)
      await prisma.displayAnalysis.upsert({
        where: { productId: product.id },
        update: { suitableDoc: display.forDoc, suitableMedia: display.forMedia, suitableGame: display.forGame, suitableDesign: display.forDesign, summary: display.summary },
        create: { productId: product.id, suitableDoc: display.forDoc, suitableMedia: display.forMedia, suitableGame: display.forGame, suitableDesign: display.forDesign, summary: display.summary },
      })

      const port = analyzePortSuitability(spec)
      await prisma.portAnalysis.upsert({
        where: { productId: product.id },
        update: { canDualMonitor: port.canDualMonitor, canExternalGpu: port.canExternalGpu, portScore: port.portScore, summary: port.summary },
        create: { productId: product.id, canDualMonitor: port.canDualMonitor, canExternalGpu: port.canExternalGpu, portScore: port.portScore, summary: port.summary },
      })

      const allPrices = await prisma.priceHistory.findMany({ where: { productId: product.id }, orderBy: { date: 'asc' } })
      const currentLowest = allPrices[allPrices.length - 1]?.price ?? 0
      if (currentLowest > 0) {
        const scores = calculateUsageScores(spec, currentLowest)
        const monthsSinceRelease = product.releaseDate
          ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
          : null

        await prisma.productAnalysis.upsert({
          where: { productId: product.id },
          update: { scoreGaming: scores.gaming, scoreWork: scores.work, scoreStudent: scores.student, scoreVideo: scores.video, scorePortable: scores.portable, scoreOverall: scores.overall, monthsSinceRelease, isNew: (monthsSinceRelease ?? 999) < 6, isOld: (monthsSinceRelease ?? 0) > 24 },
          create: { productId: product.id, scoreGaming: scores.gaming, scoreWork: scores.work, scoreStudent: scores.student, scoreVideo: scores.video, scorePortable: scores.portable, scoreOverall: scores.overall, monthsSinceRelease, isNew: (monthsSinceRelease ?? 999) < 6, isOld: (monthsSinceRelease ?? 0) > 24 },
        })
      }

      enriched++
      // LLM 호출 간 딜레이
      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      failed++
      errors.push(`${product.name}: ${String(err).slice(0, 100)}`)
    }
  }

  return NextResponse.json({
    success: true,
    total: products.length,
    enriched,
    failed,
    errors: errors.slice(0, 10),
  })
}
