import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import ProductCard from '@/components/product/ProductCard'
import ProductFilters from '@/components/product/ProductFilters'
import type { Metadata } from 'next'

interface SearchParams {
  [key: string]: string | undefined
  q?: string
  brand?: string
  usage?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: string
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const params = await searchParams
  const q = params.q || ''
  return {
    title: q ? `"${q}" 노트북 검색 결과` : '전체 노트북 목록',
    description: '실시간 최저가와 AI 분석으로 최적의 노트북을 찾아보세요.',
  }
}

async function getProducts(params: SearchParams) {
  const query = params.q || ''
  const brand = params.brand || ''
  const usage = params.usage || ''
  const minPrice = parseInt(params.minPrice || '0')
  const maxPrice = parseInt(params.maxPrice || '99999999')
  const sort = params.sort || 'relevance'
  const page = parseInt(params.page || '1')
  const limit = 20
  const skip = (page - 1) * limit

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

  if (minPrice > 0 || maxPrice < 99999999) {
    where.priceStats = {
      currentLowest: { gte: minPrice, lte: maxPrice },
    }
  }

  const orderBy = (() => {
    switch (sort) {
      case 'price_asc': return { priceStats: { currentLowest: 'asc' as const } }
      case 'price_desc': return { priceStats: { currentLowest: 'desc' as const } }
      case 'newest': return { releaseDate: 'desc' as const }
      case 'value': return { priceStats: { valueScore: 'desc' as const } }
      default: return { updatedAt: 'desc' as const }
    }
  })()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let products: any[] = await prisma.product.findMany({
    where,
    include: { specs: true, priceStats: true, analysis: true },
    orderBy,
    skip,
    take: limit * 2, // 용도 필터를 위해 2배 가져옴
  })

  // 용도 필터 (DB 레벨에서 처리 불가한 경우)
  if (usage) {
    const scoreField = {
      gaming: 'scoreGaming',
      work: 'scoreWork',
      student: 'scoreStudent',
      video: 'scoreVideo',
      portable: 'scorePortable',
    }[usage]

    if (scoreField) {
      products = products.filter((p) => {
        const analysis = p.analysis as Record<string, unknown> | null
        const score = analysis?.[scoreField] as number | undefined
        return (score ?? 0) >= 60
      })
    }
  }

  const total = await prisma.product.count({ where })

  return { products: products.slice(0, limit), total, page }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { products, total, page } = await getProducts(params)

  const q = params.q || ''
  const usage = params.usage || ''

  const usageLabels: Record<string, string> = {
    gaming: '게임용',
    work: '작업·코딩용',
    student: '학생용',
    video: '영상편집용',
    portable: '휴대용',
  }

  const validHighlights = ['gaming', 'work', 'student', 'portable', 'overall']
  const highlighted = (validHighlights.includes(usage) ? usage : undefined) as 'gaming' | 'work' | 'student' | 'portable' | 'overall' | undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {q ? `"${q}" 검색 결과` : usage ? `${usageLabels[usage] || usage} 노트북` : '전체 노트북'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()}개 상품</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 필터 사이드바 */}
        <aside className="lg:w-56 shrink-0">
          <Suspense>
            <ProductFilters currentParams={params} />
          </Suspense>
        </aside>

        {/* 상품 그리드 */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🔍</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">검색 결과가 없습니다</h2>
              <p className="text-gray-500 text-sm">다른 검색어나 필터를 사용해 보세요.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p as Parameters<typeof ProductCard>[0]['product']}
                      highlighted={highlighted}
                    />
                  ))}
              </div>

              {/* 페이지네이션 */}
              {total > 20 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: Math.min(Math.ceil(total / 20), 5) }, (_, i) => i + 1).map(
                    (p) => (
                      <a
                        key={p}
                        href={`/products?${new URLSearchParams({ ...params, page: String(p) })}`}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </a>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
