import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchNaverLaptops, sanitizeProductName, extractBrand, estimateReleaseDate } from '@/lib/naver-api'
import { parseSpec } from '@/lib/spec-parser'
import { calculateUsageScores, analyzeDisplaySuitability, analyzePortSuitability, analyzeTechFeatures } from '@/lib/analysis/performance'
import { estimateGameFps } from '@/lib/analysis/game-fps'
import { analyzePrices } from '@/lib/analysis/price'
import { cleanExpiredCache } from '@/lib/llm/client'
import { LAPTOP_SEARCH_QUERIES } from '@/lib/naver-api'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  // 인증 확인
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const queryParam = searchParams.get('query')
  const queries = queryParam ? [queryParam] : LAPTOP_SEARCH_QUERIES.slice(0, 3) // 기본: 처음 3개

  let totalCollected = 0
  let totalUpdated = 0
  const errors: string[] = []

  for (const query of queries) {
    try {
      const result = await searchNaverLaptops(query, 1, 20)

      for (const item of result.items) {
        try {
          const name = sanitizeProductName(item.title)
          const brand = extractBrand(name, item.maker)
          const price = parseInt(item.lprice) || 0

          if (!price || price < 100000) continue // 가격 없거나 비정상

          // 제품 생성 또는 업데이트
          const product = await prisma.product.upsert({
            where: { naverId: item.productId },
            update: {
              name,
              brand,
              imageUrl: item.image,
              mallUrl: item.link,
              updatedAt: new Date(),
            },
            create: {
              naverId: item.productId,
              name,
              brand,
              imageUrl: item.image,
              mallUrl: item.link,
              releaseDate: estimateReleaseDate(name) ?? null,
              category: `${item.category2} > ${item.category3}`.trim(),
            },
          })

          // 가격 히스토리 기록 (오늘 기록 없을 때만)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const existingPrice = await prisma.priceHistory.findFirst({
            where: {
              productId: product.id,
              date: { gte: today },
            },
          })

          if (!existingPrice) {
            await prisma.priceHistory.create({
              data: {
                productId: product.id,
                price,
                mallName: item.mallName,
              },
            })
            totalCollected++
          } else {
            totalUpdated++
          }

          // 스펙 파싱 및 저장 (없을 때만)
          const existingSpec = await prisma.productSpec.findUnique({
            where: { productId: product.id },
          })

          if (!existingSpec) {
            const spec = parseSpec(name)
            await prisma.productSpec.create({
              data: {
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

            // 게임 성능 추정 저장
            const gameEstimates = estimateGameFps(spec.gpuTier ?? 1, spec.refreshRate)
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
              skipDuplicates: true,
            })

            // 기술 특징 저장
            const tech = analyzeTechFeatures(spec)
            await prisma.techFeatureFlag.upsert({
              where: { productId: product.id },
              update: tech,
              create: { productId: product.id, ...tech },
            })

            // 디스플레이 분석
            const display = analyzeDisplaySuitability(spec)
            await prisma.displayAnalysis.upsert({
              where: { productId: product.id },
              update: {
                suitableDoc: display.forDoc,
                suitableMedia: display.forMedia,
                suitableGame: display.forGame,
                suitableDesign: display.forDesign,
                summary: display.summary,
              },
              create: {
                productId: product.id,
                suitableDoc: display.forDoc,
                suitableMedia: display.forMedia,
                suitableGame: display.forGame,
                suitableDesign: display.forDesign,
                summary: display.summary,
              },
            })

            // 포트 분석
            const port = analyzePortSuitability(spec)
            await prisma.portAnalysis.upsert({
              where: { productId: product.id },
              update: {
                canDualMonitor: port.canDualMonitor,
                canExternalGpu: port.canExternalGpu,
                portScore: port.portScore,
                summary: port.summary,
              },
              create: {
                productId: product.id,
                canDualMonitor: port.canDualMonitor,
                canExternalGpu: port.canExternalGpu,
                portScore: port.portScore,
                summary: port.summary,
              },
            })

            // 분석 점수 저장
            const allPrices = await prisma.priceHistory.findMany({ where: { productId: product.id } })
            const priceAnalysis = analyzePrices(allPrices.map((p) => ({ price: p.price, date: p.date })), price)
            const scores = calculateUsageScores(spec, price)

            const monthsSinceRelease = product.releaseDate
              ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
              : null

            await prisma.productAnalysis.upsert({
              where: { productId: product.id },
              update: {
                scoreGaming: scores.gaming,
                scoreWork: scores.work,
                scoreStudent: scores.student,
                scoreVideo: scores.video,
                scorePortable: scores.portable,
                scoreOverall: scores.overall,
                monthsSinceRelease,
                isNew: (monthsSinceRelease ?? 999) < 6,
                isOld: (monthsSinceRelease ?? 0) > 24,
              },
              create: {
                productId: product.id,
                scoreGaming: scores.gaming,
                scoreWork: scores.work,
                scoreStudent: scores.student,
                scoreVideo: scores.video,
                scorePortable: scores.portable,
                scoreOverall: scores.overall,
                monthsSinceRelease,
                isNew: (monthsSinceRelease ?? 999) < 6,
                isOld: (monthsSinceRelease ?? 0) > 24,
              },
            })
          }

          // 가격 통계 업데이트 (항상)
          const allPrices = await prisma.priceHistory.findMany({
            where: { productId: product.id },
            orderBy: { date: 'asc' },
          })

          const priceAnalysis = analyzePrices(allPrices.map((p) => ({ price: p.price, date: p.date })), price)

          await prisma.priceStatistics.upsert({
            where: { productId: product.id },
            update: {
              currentLowest: price,
              avg7d: priceAnalysis.avg7d,
              avg30d: priceAnalysis.avg30d,
              avg90d: priceAnalysis.avg90d,
              allTimeMin: priceAnalysis.allTimeMin,
              allTimeMax: priceAnalysis.allTimeMax,
              allTimeAvg: priceAnalysis.allTimeAvg,
              priceDropFlag: priceAnalysis.priceDropDetected,
              dropPercent: priceAnalysis.dropPercent,
              priceTrend: priceAnalysis.priceTrend,
              valueScore: priceAnalysis.valueScore,
              valueTier: priceAnalysis.valueTier,
            },
            create: {
              productId: product.id,
              currentLowest: price,
              avg7d: priceAnalysis.avg7d,
              avg30d: priceAnalysis.avg30d,
              avg90d: priceAnalysis.avg90d,
              allTimeMin: priceAnalysis.allTimeMin,
              allTimeMax: priceAnalysis.allTimeMax,
              allTimeAvg: priceAnalysis.allTimeAvg,
              priceDropFlag: priceAnalysis.priceDropDetected,
              dropPercent: priceAnalysis.dropPercent,
              priceTrend: priceAnalysis.priceTrend,
              valueScore: priceAnalysis.valueScore,
              valueTier: priceAnalysis.valueTier,
            },
          })
        } catch (itemErr) {
          errors.push(`${item.title}: ${String(itemErr)}`)
        }
      }
    } catch (queryErr) {
      errors.push(`Query "${query}": ${String(queryErr)}`)
    }
  }

  // 만료된 LLM 캐시 정리
  try {
    await cleanExpiredCache()
  } catch {}

  return NextResponse.json({
    success: true,
    collected: totalCollected,
    updated: totalUpdated,
    errors: errors.slice(0, 10),
    queriesRun: queries.length,
  })
}
