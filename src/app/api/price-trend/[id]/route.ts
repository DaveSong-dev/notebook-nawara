import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { analyzePrices } from '@/lib/analysis/price'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '90')

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [product, prices] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: { priceStats: true },
      }),
      prisma.priceHistory.findMany({
        where: {
          productId: id,
          date: { gte: since },
        },
        orderBy: { date: 'asc' },
      }),
    ])

    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    const currentLowest = product.priceStats?.currentLowest ?? prices[prices.length - 1]?.price ?? 0
    const analysis = analyzePrices(
      prices.map((p) => ({ price: p.price, date: p.date })),
      currentLowest,
    )

    const chartData = prices.map((p) => ({
      date: p.date.toISOString().split('T')[0],
      price: p.price,
      mallName: p.mallName,
    }))

    return NextResponse.json({
      chartData,
      analysis,
      stats: product.priceStats,
    })
  } catch (error) {
    console.error('Price trend API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
