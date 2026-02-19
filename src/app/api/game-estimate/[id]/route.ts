import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { estimateGameFps } from '@/lib/analysis/game-fps'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        specs: true,
        gameEstimates: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    // 캐시된 데이터가 있으면 반환
    if (product.gameEstimates.length > 0) {
      return NextResponse.json({ estimates: product.gameEstimates, cached: true })
    }

    // 없으면 실시간 계산
    const gpuTier = product.specs?.gpuTier ?? 1
    const refreshRate = product.specs?.refreshRate ?? 60
    const estimates = estimateGameFps(gpuTier, refreshRate)

    // DB 저장
    await prisma.gamePerformance.createMany({
      data: estimates.map((e) => ({
        productId: id,
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

    return NextResponse.json({ estimates, cached: false })
  } catch (error) {
    console.error('Game estimate API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
