import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  // 순서 중요: 외래키 제약 조건 때문에 자식 테이블부터 삭제
  const llmCache = await prisma.llmCache.deleteMany()
  const gamePerf = await prisma.gamePerformance.deleteMany()
  const techFlag = await prisma.techFeatureFlag.deleteMany()
  const display = await prisma.displayAnalysis.deleteMany()
  const port = await prisma.portAnalysis.deleteMany()
  const analysis = await prisma.productAnalysis.deleteMany()
  const priceStats = await prisma.priceStatistics.deleteMany()
  const priceHist = await prisma.priceHistory.deleteMany()
  const specs = await prisma.productSpec.deleteMany()
  const products = await prisma.product.deleteMany()

  return NextResponse.json({
    success: true,
    deleted: {
      products: products.count,
      specs: specs.count,
      priceHistory: priceHist.count,
      priceStats: priceStats.count,
      analysis: analysis.count,
      gamePerformance: gamePerf.count,
      techFlags: techFlag.count,
      display: display.count,
      port: port.count,
      llmCache: llmCache.count,
    },
  })
}
