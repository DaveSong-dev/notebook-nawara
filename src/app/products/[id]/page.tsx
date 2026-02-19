import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { calculateUsageScores, calculateWorkSuitability, analyzeDisplaySuitability, analyzePortSuitability, analyzeTechFeatures } from '@/lib/analysis/performance'
import { estimateGameFps } from '@/lib/analysis/game-fps'
import { analyzePrices, formatPrice } from '@/lib/analysis/price'
import { generateWithFallback } from '@/lib/llm/client'
import { buildAnalysisPrompt } from '@/lib/llm/prompts'
import type { ParsedSpec } from '@/types/product'
import ScoreBar from '@/components/ui/ScoreBar'
import GameFpsTable from '@/components/product/GameFpsTable'
import ModeToggle from '@/components/ui/ModeToggle'
import PriceChart from '@/components/charts/PriceChart'
import WorkSuitabilityCard from '@/components/product/WorkSuitabilityCard'
import TechBadges from '@/components/product/TechBadges'
import ShouldBuyBanner from '@/components/product/ShouldBuyBanner'
import PriceAnomalyBanner from '@/components/product/PriceAnomalyBanner'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return { title: '상품 없음' }
  return {
    title: product.name,
    description: `${product.name} 가격비교, 성능분석, 게임 FPS 예측, AI 추천 - 노트북 나와라`,
    openGraph: {
      title: product.name,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      specs: true,
      prices: { orderBy: { date: 'asc' } },
      priceStats: true,
      analysis: true,
      gameEstimates: true,
    },
  })

  if (!product) notFound()

  const specs: ParsedSpec | null = product.specs
    ? {
        cpu: product.specs.cpu,
        cpuGen: product.specs.cpuGen ?? undefined,
        gpu: product.specs.gpu ?? undefined,
        gpuVram: product.specs.gpuVram ?? undefined,
        gpuTier: product.specs.gpuTier ?? undefined,
        ramGb: product.specs.ramGb,
        ramType: product.specs.ramType ?? undefined,
        ssdGb: product.specs.ssdGb,
        screenSize: product.specs.screenSize ?? undefined,
        resolution: product.specs.resolution ?? undefined,
        refreshRate: product.specs.refreshRate ?? undefined,
        panelType: product.specs.panelType ?? undefined,
        brightness: product.specs.brightness ?? undefined,
        weightKg: product.specs.weightKg ?? undefined,
        batteryWh: product.specs.batteryWh ?? undefined,
        usbCCount: product.specs.usbCCount ?? undefined,
        thunderbolt: product.specs.thunderbolt,
        hdmiVersion: product.specs.hdmiVersion ?? undefined,
        sdCard: product.specs.sdCard,
        lanPort: product.specs.lanPort,
        audioJack: product.specs.audioJack,
        wifiVersion: product.specs.wifiVersion ?? undefined,
        btVersion: product.specs.btVersion ?? undefined,
        pcieGen: product.specs.pcieGen ?? undefined,
        hasNpu: product.specs.hasNpu,
      }
    : null

  const currentLowest = product.priceStats?.currentLowest ?? product.prices[product.prices.length - 1]?.price ?? 0
  const priceHistory = product.prices.map((p) => ({ price: p.price, date: p.date }))
  const priceAnalysis = analyzePrices(priceHistory, currentLowest)

  const usageScores = specs ? calculateUsageScores(specs, currentLowest) : null
  const workSuitability = specs ? calculateWorkSuitability(specs) : null
  const displaySuitability = specs ? analyzeDisplaySuitability(specs) : null
  const portSuitability = specs ? analyzePortSuitability(specs) : null
  const techFeatures = specs ? analyzeTechFeatures(specs) : null

  const gameEstimates: import('@/types/product').GameEstimate[] =
    product.gameEstimates.length > 0
      ? product.gameEstimates.map((g) => ({
          gameName: g.gameName,
          gameSlug: g.gameSlug,
          fpsLow: g.fpsLow,
          fpsMid: g.fpsMid,
          fpsHigh: g.fpsHigh,
          playability: g.playability as 'excellent' | 'good' | 'fair' | 'poor',
          summary: g.summary,
        }))
      : specs
        ? estimateGameFps(specs.gpuTier ?? 1, specs.refreshRate)
        : []

  const monthsSinceRelease = product.releaseDate
    ? Math.floor((Date.now() - product.releaseDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
    : undefined

  // LLM 분석 (캐시 우선)
  type LlmAdvice = {
    pros?: string[]
    cons?: string[]
    usageSummaries?: Record<string, string>
    shouldBuyConclusion?: string
    bestFor?: string
    provider: string
    cached: boolean
  }
  let llmAdvice: LlmAdvice | null = null
  if (specs && usageScores) {
    try {
      const prompt = buildAnalysisPrompt({
        name: product.name,
        brand: product.brand,
        specs,
        priceAnalysis,
        scores: usageScores,
        gameEstimates,
        monthsSinceRelease,
      })
      const result = await generateWithFallback(prompt, `analysis:${id}`, 'analysis', id)
      const parsed = JSON.parse(result.text) as LlmAdvice
      llmAdvice = { ...parsed, provider: result.provider, cached: result.cached }
    } catch {}
  }

  const chartData = priceHistory.map((p) => ({
    date: p.date.toISOString().split('T')[0],
    price: p.price,
  }))

  const vsAvg30dPercent = priceAnalysis.vsAvg30dPercent

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* 브레드크럼 */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">홈</Link>
        <span className="mx-2">›</span>
        <Link href="/products" className="hover:text-blue-600">전체 노트북</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 line-clamp-1">{product.name}</span>
      </nav>

      {/* 상단: 이미지 + 기본 정보 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* 이미지 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="relative aspect-square">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-8xl">💻</div>
            )}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">{product.brand}</p>
            <h1 className="text-xl font-bold text-gray-900 mt-1 leading-snug">{product.name}</h1>
            {monthsSinceRelease !== undefined && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {monthsSinceRelease < 6 && <span className="badge-new">신제품</span>}
                {monthsSinceRelease > 24 && <span className="badge-old">출시 {monthsSinceRelease}개월</span>}
              </div>
            )}
          </div>

          {/* 가격 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">현재 최저가</p>
            <p className="text-3xl font-bold text-blue-700">{formatPrice(currentLowest)}</p>
            {priceAnalysis.avg30d && (
              <p className="text-sm text-gray-600 mt-1">
                30일 평균: {formatPrice(Math.round(priceAnalysis.avg30d))}
                {vsAvg30dPercent !== null && vsAvg30dPercent > 0 && (
                  <span className="ml-2 text-green-600 font-medium">({vsAvg30dPercent.toFixed(1)}% 저렴)</span>
                )}
              </p>
            )}
            <p className="text-sm mt-2 text-gray-700">{priceAnalysis.summary}</p>
          </div>

          {/* 가격 이상 경고 */}
          <PriceAnomalyBanner
            level={priceAnalysis.priceAnomalyLevel}
            warning={priceAnalysis.priceAnomalyWarning}
          />

          {/* 구매 판단 */}
          <ShouldBuyBanner productId={id} priceAnalysis={priceAnalysis} monthsSinceRelease={monthsSinceRelease} />

          {/* 구매 버튼 */}
          <a
            href={product.mallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-bold transition-colors"
          >
            최저가로 구매하기 →
          </a>

          {/* 기술 배지 */}
          {techFeatures && techFeatures.highlights.length > 0 && (
            <TechBadges features={techFeatures} />
          )}
        </div>
      </div>

      {/* 초보자/전문가 모드 토글 */}
      <ModeToggle />

      {/* 용도별 점수 */}
      {usageScores && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📊 용도별 적합도</h2>
          {llmAdvice?.usageSummaries && (
            <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 mb-4">
              💡 {llmAdvice.usageSummaries.gaming || llmAdvice.bestFor}
            </p>
          )}
          <div className="space-y-3">
            <ScoreBar score={usageScores.gaming} label="🎮 게임용" />
            <ScoreBar score={usageScores.work} label="💼 작업·코딩용" />
            <ScoreBar score={usageScores.student} label="🎒 학생용" />
            <ScoreBar score={usageScores.video} label="✂️ 영상편집" />
            <ScoreBar score={usageScores.portable} label="🪶 휴대성" />
          </div>
        </section>
      )}

      {/* AI 어드바이스 */}
      {llmAdvice && (
        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            🤖 AI 분석
            <span className="text-xs font-normal text-gray-400">by {llmAdvice.provider}</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {llmAdvice.pros && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 mb-2">✅ 장점</h3>
                <ul className="space-y-1">
                  {llmAdvice.pros.map((pro: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-green-500 shrink-0">•</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {llmAdvice.cons && (
              <div>
                <h3 className="text-sm font-semibold text-red-600 mb-2">⚠️ 단점</h3>
                <ul className="space-y-1">
                  {llmAdvice.cons.map((con: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-red-400 shrink-0">•</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {llmAdvice.shouldBuyConclusion && (
            <div className="mt-4 bg-white/70 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">💬 지금 사도 될까요?</h3>
              <p className="text-sm text-gray-700">{llmAdvice.shouldBuyConclusion}</p>
            </div>
          )}
          {llmAdvice.bestFor && (
            <p className="mt-3 text-sm text-blue-700 font-medium">👤 {llmAdvice.bestFor}</p>
          )}
        </section>
      )}

      {/* 가격 히스토리 차트 */}
      {chartData.length > 1 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📈 가격 추이</h2>
          <PriceChart data={chartData} avg30d={priceAnalysis.avg30d} />
        </section>
      )}

      {/* 게임 성능 */}
      {gameEstimates.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">🎮 게임 성능 예측</h2>
          <p className="text-sm text-gray-500 mb-4">1080p 해상도 기준, GPU 성능으로 추정한 예상값입니다</p>
          <GameFpsTable estimates={gameEstimates} />
        </section>
      )}

      {/* 작업 적합도 */}
      {workSuitability && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💼 작업별 적합도</h2>
          <WorkSuitabilityCard suitability={workSuitability} llmSummaries={llmAdvice?.usageSummaries} />
        </section>
      )}

      {/* 스펙 상세 (전문가 모드) */}
      {specs && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 expert-only">
          <h2 className="text-lg font-bold text-gray-900 mb-2">🔧 상세 스펙</h2>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            ℹ️ 스펙 정보는 AI가 모델명을 기반으로 추정한 값이며, 실제 제품과 다를 수 있습니다. 정확한 사양은 제조사 공식 사이트를 확인하세요.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'CPU', value: specs.cpu === '알 수 없음' ? '확인 중' : specs.cpu },
              { label: 'GPU', value: specs.gpu || '내장 그래픽' },
              { label: 'RAM', value: `${specs.ramGb}GB${specs.ramType ? ` ${specs.ramType}` : ''}` },
              { label: 'SSD', value: `${specs.ssdGb >= 1024 ? `${specs.ssdGb / 1024}TB` : `${specs.ssdGb}GB`}` },
              { label: '화면', value: specs.screenSize ? `${specs.screenSize}인치` : '-' },
              { label: '해상도', value: specs.resolution || '-' },
              { label: '주사율', value: specs.refreshRate ? `${specs.refreshRate}Hz` : '-' },
              { label: '패널', value: specs.panelType || '-' },
              { label: '밝기', value: specs.brightness ? `${specs.brightness}nit` : '-' },
              { label: '색재현', value: specs.colorGamut || '-' },
              { label: '무게', value: specs.weightKg ? `${specs.weightKg}kg` : '-' },
              { label: '배터리', value: specs.batteryWh ? `${specs.batteryWh}Wh` : '-' },
              { label: 'Wi-Fi', value: specs.wifiVersion || '-' },
              { label: 'Bluetooth', value: specs.btVersion ? `BT ${specs.btVersion}` : '-' },
              { label: 'PCIe', value: specs.pcieGen || '-' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 포트 분석 */}
      {portSuitability && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">🔌 포트 & 연결성</h2>
          <p className="text-xs text-gray-400 mb-3">ℹ️ AI 추정 기반 정보입니다. 실제와 다를 수 있습니다.</p>
          <p className="text-sm text-gray-700 mb-3">{portSuitability.summary}</p>
          <div className="flex flex-wrap gap-2">
            {portSuitability.details.map((d, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
                {d}
              </span>
            ))}
          </div>
          {specs && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
              {[
                { label: 'USB-C', value: specs.usbCCount ?? 0, icon: '⚡' },
                { label: 'USB-A', value: specs.usbACount ?? 0, icon: '🔌' },
                { label: 'HDMI', value: specs.hdmiVersion ? `v${specs.hdmiVersion}` : '없음', icon: '📺' },
                { label: 'SD카드', value: specs.sdCard ? '있음' : '없음', icon: '💾' },
                { label: 'LAN', value: specs.lanPort ? '있음' : '없음', icon: '🌐' },
                { label: '이어폰', value: specs.audioJack !== false ? '있음' : '없음', icon: '🎵' },
              ].map((port) => (
                <div key={port.label} className="text-center bg-gray-50 rounded-xl p-2">
                  <p className="text-lg">{port.icon}</p>
                  <p className="text-xs text-gray-500">{port.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{port.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 디스플레이 분석 */}
      {displaySuitability && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">🖥️ 디스플레이 분석</h2>
          <p className="text-sm text-gray-600 mb-3">{displaySuitability.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: '문서 작업', suitable: displaySuitability.forDoc },
              { label: '영상 감상', suitable: displaySuitability.forMedia },
              { label: '게임', suitable: displaySuitability.forGame },
              { label: '디자인·사진', suitable: displaySuitability.forDesign },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-center p-3 rounded-xl ${
                  item.suitable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <p className="text-xl mb-1">{item.suitable ? '✅' : '△'}</p>
                <p className="text-xs font-medium text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 비교하기 / 관련 상품 CTA */}
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <Link
          href={`/compare?ids=${id}`}
          className="flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
        >
          ↔️ 다른 제품과 비교
        </Link>
        <Link
          href="/recommend"
          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          🤖 AI에게 추천 받기
        </Link>
      </div>
    </div>
  )
}
