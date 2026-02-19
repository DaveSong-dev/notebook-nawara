import Link from 'next/link'
import { prisma } from '@/lib/db'
import ProductCard from '@/components/product/ProductCard'
import HeroSearch from '@/components/ui/HeroSearch'
import { unstable_cache } from 'next/cache'

const getHomeData = unstable_cache(
  async () => {
    try {
    const [latestProducts, popularGaming, popularStudent, popularPortable, totalCount] =
      await Promise.all([
        // 최신 등록 상품
        prisma.product.findMany({
          include: { specs: true, priceStats: true, analysis: true },
          orderBy: { updatedAt: 'desc' },
          take: 8,
        }),
        // 게임 TOP 4
        prisma.product.findMany({
          include: { specs: true, priceStats: true, analysis: true },
          where: { analysis: { scoreGaming: { gte: 70 } } },
          orderBy: { analysis: { scoreGaming: 'desc' } },
          take: 4,
        }),
        // 학생 TOP 4
        prisma.product.findMany({
          include: { specs: true, priceStats: true, analysis: true },
          where: { analysis: { scoreStudent: { gte: 65 } } },
          orderBy: { analysis: { scoreStudent: 'desc' } },
          take: 4,
        }),
        // 휴대성 TOP 4
        prisma.product.findMany({
          include: { specs: true, priceStats: true, analysis: true },
          where: { analysis: { scorePortable: { gte: 70 } } },
          orderBy: { analysis: { scorePortable: 'desc' } },
          take: 4,
        }),
        prisma.product.count(),
      ])

    return { latestProducts, popularGaming, popularStudent, popularPortable, totalCount }
    } catch {
      return { latestProducts: [], popularGaming: [], popularStudent: [], popularPortable: [], totalCount: 0 }
    }
  },
  ['home-data'],
  { revalidate: 1800 }, // 30분
)

export default async function HomePage() {
  const { latestProducts, popularGaming, popularStudent, popularPortable, totalCount } =
    await getHomeData()

  const isEmpty = totalCount === 0

  return (
    <div className="min-h-screen">
      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-14 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-100 text-sm px-3 py-1 rounded-full mb-4">
            <span>💡</span>
            <span>AI 기반 노트북 의사결정 플랫폼</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight">
            어떤 노트북을 사야 할지<br />
            <span className="text-yellow-300">모르겠다면?</span>
          </h1>
          <p className="text-base sm:text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            가격 히스토리, 게임 FPS 예측, 용도별 분석, AI 추천까지<br className="hidden sm:block" />
            초등학생도 이해할 수 있는 쉬운 설명으로 제공합니다
          </p>

          <HeroSearch />

          {/* 용도별 빠른 진입 */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              { label: '🎮 게임용', href: '/products?usage=gaming' },
              { label: '💼 작업·코딩', href: '/products?usage=work' },
              { label: '🎒 학생용', href: '/products?usage=student' },
              { label: '✂️ 영상편집', href: '/products?usage=video' },
              { label: '🪶 가볍고 오래가는', href: '/products?usage=portable' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors backdrop-blur-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 통계 배너 */}
      {!isEmpty && (
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalCount.toLocaleString()}+</p>
              <p className="text-xs text-gray-500">등록된 노트북</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">매일</p>
              <p className="text-xs text-gray-500">가격 업데이트</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">11개</p>
              <p className="text-xs text-gray-500">게임 FPS 예측</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">AI</p>
              <p className="text-xs text-gray-500">맞춤 추천</p>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {isEmpty ? (
          /* 데이터 없을 때 */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">데이터 수집 중...</h2>
            <p className="text-gray-500 mb-6">
              아직 노트북 데이터가 없습니다. 관리자가 데이터를 수집하면 곧 표시됩니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/recommend"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                🤖 AI 추천 받기
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 게임용 추천 */}
            {popularGaming.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      🎮 게임 잘 되는 노트북
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">롤, 발로란트, 배그 다 돌아갑니다</p>
                  </div>
                  <Link href="/products?usage=gaming" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    더 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {popularGaming.map((product) => (
                    <ProductCard key={product.id} product={product} highlighted="gaming" />
                  ))}
                </div>
              </section>
            )}

            {/* 학생용 추천 */}
            {popularStudent.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      🎒 학생에게 딱 맞는 노트북
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">가성비, 무게, 배터리 다 잡았습니다</p>
                  </div>
                  <Link href="/products?usage=student" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    더 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {popularStudent.map((product) => (
                    <ProductCard key={product.id} product={product} highlighted="student" />
                  ))}
                </div>
              </section>
            )}

            {/* 휴대성 추천 */}
            {popularPortable.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      🪶 가볍고 오래가는 노트북
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">들고 다니기 편하고 배터리도 오래</p>
                  </div>
                  <Link href="/products?usage=portable" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    더 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {popularPortable.map((product) => (
                    <ProductCard key={product.id} product={product} highlighted="portable" />
                  ))}
                </div>
              </section>
            )}

            {/* 최신 등록 */}
            {latestProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900">🆕 최근 업데이트</h2>
                  <Link href="/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    전체 보기 →
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {latestProducts.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}

            {/* AI 추천 CTA */}
            <section className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-100">
              <div className="text-4xl mb-3">🤖</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                아직도 결정 못 하셨나요?
              </h2>
              <p className="text-gray-600 mb-6">
                예산과 용도를 알려주시면 AI가 맞춤 추천을 해드립니다
              </p>
              <Link
                href="/recommend"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors text-lg"
              >
                🤖 AI 추천 받기
              </Link>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
