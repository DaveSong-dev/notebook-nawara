import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const brand = searchParams.get('brand') || ''
  const minPrice = parseInt(searchParams.get('minPrice') || '0')
  const maxPrice = parseInt(searchParams.get('maxPrice') || '99999999')
  const usage = searchParams.get('usage') || ''
  const sort = searchParams.get('sort') || 'relevance'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  try {
    const where: Record<string, unknown> = {}

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
      ]
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' }
    }

    if (minPrice || maxPrice < 99999999) {
      where.priceStats = {
        currentLowest: {
          gte: minPrice,
          lte: maxPrice,
        },
      }
    }

    const orderBy = buildOrderBy(sort)

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          specs: true,
          priceStats: true,
          analysis: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // 용도 필터 (클라이언트 사이드 필터링)
    const filtered = usage
      ? products.filter((p) => {
          if (!p.analysis) return true
          const score =
            usage === 'gaming'
              ? p.analysis.scoreGaming
              : usage === 'work'
                ? p.analysis.scoreWork
                : usage === 'student'
                  ? p.analysis.scoreStudent
                  : usage === 'video'
                    ? p.analysis.scoreVideo
                    : usage === 'portable'
                      ? p.analysis.scorePortable
                      : 0
          return score >= 60
        })
      : products

    return NextResponse.json({
      products: filtered,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

function buildOrderBy(sort: string) {
  switch (sort) {
    case 'price_asc':
      return { priceStats: { currentLowest: 'asc' as const } }
    case 'price_desc':
      return { priceStats: { currentLowest: 'desc' as const } }
    case 'newest':
      return { releaseDate: 'desc' as const }
    case 'value':
      return { priceStats: { valueScore: 'desc' as const } }
    default:
      return { updatedAt: 'desc' as const }
  }
}
