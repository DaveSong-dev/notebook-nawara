import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        specs: true,
        priceStats: true,
        analysis: true,
        gameEstimates: true,
        techFeatures: true,
        displayInfo: true,
        portInfo: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
