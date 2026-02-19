'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ScoreBar from '@/components/ui/ScoreBar'
import { formatPrice } from '@/lib/analysis/price'

interface ProductSummary {
  id: string
  name: string
  brand: string
  imageUrl: string | null
  mallUrl: string
}

interface CompareResult {
  products: Array<{
    id: string
    name: string
    brand: string
    imageUrl: string | null
    mallUrl: string
    specs: Record<string, unknown> | null
    priceAnalysis: { currentLowest: number; summary: string }
    scores: { gaming: number; work: number; student: number; video: number; portable: number; overall: number }
  }>
  llmComparison: {
    summary: string
    winner: Record<string, string>
    recommendations: Array<{ persona: string; product: string; reason: string }>
    conclusion: string
    provider: string
  } | null
}

export default function CompareClient() {
  const searchParams = useSearchParams()
  const initialIds = searchParams.get('ids')?.split(',').filter(Boolean) ?? []

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([])
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialIds.length >= 2) {
      handleCompare(initialIds)
    }
  }, [])

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 1) {
      setSearchResults([])
      return
    }
    const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=5`)
    const data = await res.json() as { products: ProductSummary[] }
    setSearchResults(data.products || [])
  }

  const addProduct = (product: ProductSummary) => {
    if (selectedIds.includes(product.id) || selectedIds.length >= 3) return
    setSelectedIds((prev) => [...prev, product.id])
    setSearchQuery('')
    setSearchResults([])
    setCompareResult(null)
  }

  const removeProduct = (id: string) => {
    setSelectedIds((prev) => prev.filter((i) => i !== id))
    setCompareResult(null)
  }

  const handleCompare = async (ids: string[]) => {
    if (ids.length < 2) return
    setLoading(true)
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json() as CompareResult
      setCompareResult(data)
    } catch {
      // 에러 처리
    } finally {
      setLoading(false)
    }
  }

  const SCORE_LABELS = [
    { key: 'gaming', label: '🎮 게임' },
    { key: 'work', label: '💼 작업' },
    { key: 'student', label: '🎒 학생' },
    { key: 'video', label: '✂️ 영상' },
    { key: 'portable', label: '🪶 휴대성' },
  ]

  return (
    <div>
      {/* 제품 선택 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          비교할 제품 선택 ({selectedIds.length}/3)
        </h2>

        {/* 검색 */}
        {selectedIds.length < 3 && (
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="노트북 이름 검색..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    disabled={selectedIds.includes(p.id)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-40 flex items-center gap-3 border-b border-gray-100 last:border-0"
                  >
                    {p.imageUrl && (
                      <div className="relative w-8 h-8 shrink-0 bg-gray-100 rounded">
                        <Image src={p.imageUrl} alt={p.name} fill className="object-contain" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.brand}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 선택된 제품 */}
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const product = compareResult?.products.find((p) => p.id === id)
            return (
              <div key={id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                <span className="text-sm text-blue-700 font-medium truncate max-w-32">
                  {product?.name || `제품 ${id.slice(0, 8)}`}
                </span>
                <button onClick={() => removeProduct(id)} className="text-blue-400 hover:text-red-500 text-xs">✕</button>
              </div>
            )
          })}
          {selectedIds.length === 0 && (
            <p className="text-sm text-gray-400">위에서 노트북을 검색해서 추가하세요</p>
          )}
        </div>

        {selectedIds.length >= 2 && !compareResult && (
          <button
            onClick={() => handleCompare(selectedIds)}
            disabled={loading}
            className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '🤖 AI가 비교 중...' : '↔️ 비교 시작'}
          </button>
        )}
      </div>

      {/* 비교 결과 */}
      {compareResult && (
        <div className="space-y-6">
          {/* 가격 비교 */}
          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <h2 className="text-sm font-semibold text-gray-700 px-4 py-3 bg-gray-50 border-b">💰 가격 비교</h2>
            <div className={`grid grid-cols-${compareResult.products.length} divide-x`}>
              {compareResult.products.map((p) => (
                <div key={p.id} className="p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">{p.brand}</p>
                  <p className="text-xs font-medium text-gray-700 line-clamp-2 mb-2">{p.name}</p>
                  <p className="text-lg font-bold text-blue-600">{formatPrice(p.priceAnalysis.currentLowest)}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.priceAnalysis.summary.slice(0, 30)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 점수 비교 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📊 성능 비교</h2>
            <div className="space-y-4">
              {SCORE_LABELS.map(({ key, label }) => {
                const scores = compareResult.products.map((p) => p.scores[key as keyof typeof p.scores] as number)
                const maxScore = Math.max(...scores)
                return (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
                    <div className="space-y-1">
                      {compareResult.products.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-20 truncate">{p.name.split(' ')[0]}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${scores[i] === maxScore ? 'bg-blue-600' : 'bg-gray-300'}`}
                              style={{ width: `${scores[i]}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${scores[i] === maxScore ? 'text-blue-600' : 'text-gray-400'}`}>
                            {scores[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* AI 비교 */}
          {compareResult.llmComparison && (
            <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                🤖 AI 비교 분석
                <span className="text-xs font-normal text-gray-400">by {compareResult.llmComparison.provider}</span>
              </h2>
              <p className="text-sm text-gray-700 mb-4">{compareResult.llmComparison.summary}</p>

              {/* 용도별 우승자 */}
              {compareResult.llmComparison.winner && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {Object.entries(compareResult.llmComparison.winner).map(([category, winner]) => {
                    const catLabel: Record<string, string> = { gaming: '🎮 게임', work: '💼 작업', student: '🎒 학생', portable: '🪶 휴대', value: '💰 가성비' }
                    return (
                      <div key={category} className="bg-white/70 rounded-lg p-2.5 text-center">
                        <p className="text-xs text-gray-500">{catLabel[category] || category}</p>
                        <p className="text-xs font-bold text-blue-700 mt-0.5 line-clamp-1">{winner}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-sm text-gray-700">{compareResult.llmComparison.conclusion}</p>
            </section>
          )}

          {/* 구매 링크 */}
          <div className={`grid grid-cols-${compareResult.products.length} gap-3`}>
            {compareResult.products.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <Link href={`/products/${p.id}`} className="text-center text-xs border border-gray-200 bg-white py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  상세 보기
                </Link>
                <a href={p.mallUrl} target="_blank" rel="noopener noreferrer" className="text-center text-xs bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  구매하기
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
