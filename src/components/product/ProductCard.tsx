import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/analysis/price'
import ScoreBar from '@/components/ui/ScoreBar'

interface ProductCardProps {
  product: {
    id: string
    name: string
    brand: string
    imageUrl: string | null
    mallUrl: string
    specs?: {
      cpu: string
      gpu: string | null
      ramGb: number
      ssdGb: number
      screenSize: number | null
      weightKg: number | null
    } | null
    priceStats?: {
      currentLowest: number
      avg30d: number | null
      priceTrend: string | null
      priceDropFlag: boolean
      valueScore: number
    } | null
    analysis?: {
      scoreGaming: number
      scoreWork: number
      scoreStudent: number
      scorePortable: number
      scoreOverall: number
      isNew: boolean
      isOld: boolean
    } | null
  }
  showScores?: boolean
  highlighted?: 'gaming' | 'work' | 'student' | 'portable' | 'overall'
}

export default function ProductCard({ product, showScores = true, highlighted }: ProductCardProps) {
  const { priceStats, analysis, specs } = product

  const mainScore = highlighted
    ? {
        gaming: analysis?.scoreGaming,
        work: analysis?.scoreWork,
        student: analysis?.scoreStudent,
        portable: analysis?.scorePortable,
        overall: analysis?.scoreOverall,
      }[highlighted]
    : analysis?.scoreOverall

  const scoreLabel = {
    gaming: '게임 점수',
    work: '작업 점수',
    student: '학생 점수',
    portable: '휴대성',
    overall: '종합 점수',
  }[highlighted ?? 'overall']

  const priceVsAvg =
    priceStats?.avg30d && priceStats.currentLowest
      ? (((priceStats.avg30d - priceStats.currentLowest) / priceStats.avg30d) * 100).toFixed(1)
      : null

  return (
    <Link href={`/products/${product.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden card-hover">
        {/* 이미지 */}
        <div className="relative bg-gray-100 aspect-[4/3] overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-3"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">💻</div>
          )}
          {/* 배지 */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {analysis?.isNew && <span className="badge-new">NEW</span>}
            {priceStats?.priceDropFlag && <span className="badge-hot">🔥 가격 급락</span>}
            {analysis?.isOld && <span className="badge-old">구형</span>}
          </div>
        </div>

        {/* 정보 */}
        <div className="p-3 sm:p-4">
          {/* 브랜드 & 이름 */}
          <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2">
            {product.name}
          </h3>

          {/* 핵심 스펙 */}
          {specs && (
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {specs.cpu.split(' ').slice(0, 3).join(' ')}
              </span>
              {specs.gpu && (
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  {specs.gpu.replace('NVIDIA ', '')}
                </span>
              )}
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                RAM {specs.ramGb}GB
              </span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                SSD {specs.ssdGb >= 1024 ? `${specs.ssdGb / 1024}TB` : `${specs.ssdGb}GB`}
              </span>
              {specs.weightKg && (
                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                  {specs.weightKg}kg
                </span>
              )}
            </div>
          )}

          {/* 가격 */}
          {priceStats && (
            <div className="mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-blue-600">
                  {formatPrice(priceStats.currentLowest)}
                </span>
                {priceVsAvg && parseFloat(priceVsAvg) > 0 && (
                  <span className="text-xs text-green-600 font-medium">평균 대비 {priceVsAvg}% 저렴</span>
                )}
              </div>
              {priceStats.priceTrend === 'rising' && (
                <p className="text-xs text-orange-500 mt-0.5">📈 가격 상승 추세</p>
              )}
              {priceStats.priceTrend === 'falling' && (
                <p className="text-xs text-blue-500 mt-0.5">📉 가격 하락 추세</p>
              )}
            </div>
          )}

          {/* 점수 */}
          {showScores && mainScore !== undefined && (
            <ScoreBar score={mainScore} label={scoreLabel} size="sm" />
          )}
        </div>
      </div>
    </Link>
  )
}
