'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ScoreBar from '@/components/ui/ScoreBar'
import { formatPrice } from '@/lib/analysis/price'

type Step = 'budget' | 'usage' | 'priority' | 'result'

const BUDGET_OPTIONS = [
  { label: '70만원 이하', min: 0, max: 700000 },
  { label: '70~100만원', min: 700000, max: 1000000 },
  { label: '100~150만원', min: 1000000, max: 1500000 },
  { label: '150~200만원', min: 1500000, max: 2000000 },
  { label: '200만원 이상', min: 2000000, max: 9999999 },
  { label: '제한 없음', min: 0, max: 9999999 },
]

const USAGE_OPTIONS = [
  { value: 'gaming', label: '🎮 게임', desc: '롤, 배그, 발로란트 등' },
  { value: 'work', label: '💼 작업·코딩', desc: '개발, 문서 작업' },
  { value: 'student', label: '🎒 학교·공부', desc: '강의, 과제, 인터넷' },
  { value: 'video', label: '✂️ 영상편집', desc: '유튜브, 유프리미어' },
  { value: 'portable', label: '🪶 휴대성', desc: '가볍고 배터리 오래' },
]

const PRIORITY_OPTIONS = [
  { value: 'value', label: '💰 가성비', desc: '같은 돈으로 최고 성능' },
  { value: 'performance', label: '⚡ 성능', desc: '돈이 좀 더 들어도 성능' },
  { value: 'portable', label: '🪶 가벼움', desc: '무조건 가볍고 오래가야' },
  { value: 'latest', label: '🆕 최신', desc: '최신 기술을 원함' },
]

interface RecommendResult {
  recommendations: Array<{
    product: {
      id: string
      name: string
      brand: string
      imageUrl: string | null
      mallUrl: string
      analysis: { gaming: number; work: number; student: number; video: number; portable: number; overall: number } | null
      priceStats: { currentLowest: number } | null
    }
    matchScore: number
    reasons: string[]
    warnings: string[]
    shouldBuy: boolean
    shouldBuyReason: string
  }>
  llmExplanation: {
    intro?: string
    recommendations?: Array<{ rank: number; name: string; reason: string; highlight: string }>
    tip?: string
    provider: string
  } | null
}

export default function RecommendWizard() {
  const [step, setStep] = useState<Step>('budget')
  const [budget, setBudget] = useState<{ min: number; max: number } | null>(null)
  const [usage, setUsage] = useState<string[]>([])
  const [priority, setPriority] = useState<string>('')
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleBudgetSelect = (opt: { min: number; max: number }) => {
    setBudget(opt)
    setStep('usage')
  }

  const toggleUsage = (value: string) => {
    setUsage((prev) =>
      prev.includes(value) ? prev.filter((u) => u !== value) : [...prev, value],
    )
  }

  const handleUsageNext = () => {
    if (usage.length === 0) return
    setStep('priority')
  }

  const handlePrioritySelect = async (value: string) => {
    setPriority(value)
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: budget ?? undefined,
          usage: usage.length > 0 ? usage : undefined,
          priority: value,
        }),
      })

      if (!res.ok) throw new Error('추천 요청 실패')
      const data = await res.json() as RecommendResult
      setResult(data)
      setStep('result')
    } catch {
      setError('추천을 불러오는 데 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep('budget')
    setBudget(null)
    setUsage([])
    setPriority('')
    setResult(null)
    setError('')
  }

  const USAGE_LABEL: Record<string, string> = { gaming: '게임', work: '작업', student: '학생', video: '영상편집', portable: '휴대성' }
  const PRIORITY_LABEL: Record<string, string> = { value: '가성비', performance: '성능', portable: '가벼움', latest: '최신' }

  // 진행 단계 표시
  const steps = ['예산', '용도', '우선순위', '결과']
  const stepIdx = { budget: 0, usage: 1, priority: 2, result: 3 }[step]

  return (
    <div>
      {/* 진행 표시기 */}
      <div className="flex items-center justify-center mb-8 gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i <= stepIdx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < stepIdx ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === stepIdx ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < stepIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: 예산 */}
      {step === 'budget' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">예산이 얼마인가요?</h2>
          <p className="text-sm text-gray-500 text-center mb-6">노트북에 쓸 수 있는 금액을 알려주세요</p>
          <div className="grid grid-cols-2 gap-3">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleBudgetSelect(opt)}
                className="bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-800 font-semibold py-4 rounded-xl transition-all text-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: 용도 */}
      {step === 'usage' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">어디에 쓸 건가요?</h2>
          <p className="text-sm text-gray-500 text-center mb-6">여러 개 선택해도 됩니다</p>
          <div className="space-y-2">
            {USAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleUsage(opt.value)}
                className={`w-full flex items-center gap-4 px-4 py-3 border-2 rounded-xl transition-all text-left ${
                  usage.includes(opt.value)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{opt.label.split(' ')[0]}</span>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{opt.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
                {usage.includes(opt.value) && <span className="ml-auto text-blue-600">✓</span>}
              </button>
            ))}
          </div>
          <button
            onClick={handleUsageNext}
            disabled={usage.length === 0}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            다음 →
          </button>
        </div>
      )}

      {/* Step 3: 우선순위 */}
      {step === 'priority' && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">가장 중요한 게 뭔가요?</h2>
          <p className="text-sm text-gray-500 text-center mb-6">하나만 선택해 주세요</p>
          <div className="grid grid-cols-2 gap-3">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePrioritySelect(opt.value)}
                disabled={loading}
                className="bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 transition-all text-left disabled:opacity-50"
              >
                <p className="text-2xl mb-1">{opt.label.split(' ')[0]}</p>
                <p className="font-semibold text-gray-800 text-sm">{opt.label.split(' ').slice(1).join(' ')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {loading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin text-3xl">🤖</div>
              <p className="text-sm text-gray-500 mt-2">AI가 분석 중입니다...</p>
            </div>
          )}
          {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* Step 4: 결과 */}
      {step === 'result' && result && (
        <div>
          {/* 조건 요약 */}
          <div className="bg-blue-50 rounded-xl p-3 mb-6 text-sm text-blue-800">
            <span className="font-medium">선택 조건: </span>
            {budget?.max === 9999999 ? '예산 제한 없음' : BUDGET_OPTIONS.find((b) => b.min === budget?.min && b.max === budget?.max)?.label}
            {' · '}
            {usage.map((u) => USAGE_LABEL[u]).join(', ')}
            {' · '}
            {PRIORITY_LABEL[priority]}
          </div>

          {/* LLM 설명 */}
          {result.llmExplanation?.intro && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-indigo-700 mb-1">🤖 AI 한마디</p>
              <p className="text-sm text-gray-700">{result.llmExplanation.intro}</p>
              {result.llmExplanation.tip && (
                <p className="text-xs text-gray-500 mt-2">💡 {result.llmExplanation.tip}</p>
              )}
            </div>
          )}

          {/* 추천 상품 */}
          {result.recommendations.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">😅</div>
              <p className="text-gray-600">조건에 맞는 상품이 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">조건을 바꿔서 다시 시도해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.recommendations.map((rec, idx) => {
                const llmRec = result.llmExplanation?.recommendations?.find((r) => r.rank === idx + 1)
                const usageScore = usage[0] ? rec.product.analysis?.[usage[0] as keyof typeof rec.product.analysis] as number : rec.product.analysis?.overall

                return (
                  <div key={rec.product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 text-sm font-bold">
                      <span>{['🥇', '🥈', '🥉'][idx] || `${idx + 1}위`}</span>
                      <span className="ml-1">추천 {idx + 1}</span>
                      <span className="ml-auto text-blue-200 text-xs font-normal">매칭 {rec.matchScore}점</span>
                    </div>
                    <div className="p-4 flex gap-3">
                      {rec.product.imageUrl && (
                        <div className="relative w-20 h-20 shrink-0 bg-gray-100 rounded-xl overflow-hidden">
                          <Image src={rec.product.imageUrl} alt={rec.product.name} fill className="object-contain p-1" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">{rec.product.brand}</p>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5">{rec.product.name}</h3>
                        {rec.product.priceStats && (
                          <p className="text-base font-bold text-blue-600 mt-1">{formatPrice(rec.product.priceStats.currentLowest)}</p>
                        )}
                        {typeof usageScore === 'number' && (
                          <div className="mt-2">
                            <ScoreBar score={usageScore} label={USAGE_LABEL[usage[0]] || '종합'} size="sm" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* LLM 추천 이유 */}
                    {llmRec?.reason && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5">{llmRec.reason}</p>
                        {llmRec.highlight && (
                          <p className="text-xs text-blue-600 font-medium mt-1.5">✨ {llmRec.highlight}</p>
                        )}
                      </div>
                    )}

                    {/* 경고 */}
                    {rec.warnings.length > 0 && (
                      <div className="px-4 pb-3">
                        {rec.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-orange-600">⚠️ {w}</p>
                        ))}
                      </div>
                    )}

                    <div className="px-4 pb-4 flex gap-2">
                      <Link href={`/products/${rec.product.id}`} className="flex-1 text-center text-sm font-semibold text-blue-600 border border-blue-200 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                        상세 보기
                      </Link>
                      <a href={rec.product.mallUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        구매하기
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button onClick={reset} className="mt-6 w-full text-sm text-gray-500 hover:text-gray-700 py-2">
            ← 다시 추천 받기
          </button>
        </div>
      )}
    </div>
  )
}
