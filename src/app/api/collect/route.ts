import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { searchNaverLaptops, sanitizeProductName, extractBrand, estimateReleaseDate } from '@/lib/naver-api'
import { parseSpec } from '@/lib/spec-parser'
import { calculateUsageScores, analyzeDisplaySuitability, analyzePortSuitability, analyzeTechFeatures } from '@/lib/analysis/performance'
import { estimateGameFps } from '@/lib/analysis/game-fps'
import { analyzePrices } from '@/lib/analysis/price'
import { cleanExpiredCache, generateWithFallback } from '@/lib/llm/client'
import { buildSpecEnrichPrompt } from '@/lib/llm/prompts'
import { LAPTOP_SEARCH_QUERIES } from '@/lib/naver-api'
import type { ParsedSpec } from '@/types/product'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  // 인증 확인
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const queryParam = searchParams.get('query')
  const queries = queryParam ? [queryParam] : LAPTOP_SEARCH_QUERIES

  let totalCollected = 0
  let totalUpdated = 0
  const errors: string[] = []

  for (let qi = 0; qi < queries.length; qi++) {
    const query = queries[qi]
    try {
      // API 속도 제한 준수 (쿼리 간 500ms 딜레이)
      if (qi > 0) await new Promise((r) => setTimeout(r, 500))
      const result = await searchNaverLaptops(query, 1, 100)

      for (const item of result.items) {
        try {
          // 카탈로그(가격비교) 상품만 수집 - 개별 판매자 상품 제외
          if (item.productType !== '2') continue

          const name = sanitizeProductName(item.title)
          const brand = extractBrand(name, item.maker)
          const price = parseInt(item.lprice) || 0

          if (!price || price < 100000) continue

          const catalogUrl = `https://search.shopping.naver.com/catalog/${item.productId}`

          const product = await prisma.product.upsert({
            where: { naverId: item.productId },
            update: {
              name,
              brand,
              imageUrl: item.image,
              mallUrl: catalogUrl,
              updatedAt: new Date(),
            },
            create: {
              naverId: item.productId,
              name,
              brand,
              imageUrl: item.image,
              mallUrl: catalogUrl,
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
            // 1) 이름 기반 기본 파싱
            const nameParsed = parseSpec(name)

            // 2) LLM으로 상세 스펙 보강
            let spec: ParsedSpec = nameParsed
            try {
              const prompt = buildSpecEnrichPrompt(name, brand)
              const llmResult = await generateWithFallback(
                prompt, `spec:${product.id}`, 'spec-enrich', product.id
              )
              const llmSpec = JSON.parse(llmResult.text) as Partial<ParsedSpec>

              // LLM 결과가 있으면 이름 파싱보다 우선 사용
              spec = {
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
            } catch {
              // LLM 실패 시 이름 파싱만 사용
            }

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
