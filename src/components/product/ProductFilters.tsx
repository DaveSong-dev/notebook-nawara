'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

interface ProductFiltersProps {
  currentParams: Record<string, string | undefined>
}

const USAGE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'gaming', label: '🎮 게임용' },
  { value: 'work', label: '💼 작업·코딩' },
  { value: 'student', label: '🎒 학생용' },
  { value: 'video', label: '✂️ 영상편집' },
  { value: 'portable', label: '🪶 휴대용' },
]

const SORT_OPTIONS = [
  { value: 'relevance', label: '관련순' },
  { value: 'price_asc', label: '가격 낮은순' },
  { value: 'price_desc', label: '가격 높은순' },
  { value: 'newest', label: '최신순' },
  { value: 'value', label: '가성비순' },
]

const PRICE_RANGES = [
  { label: '전체', min: '', max: '' },
  { label: '~70만원', min: '', max: '700000' },
  { label: '70~100만원', min: '700000', max: '1000000' },
  { label: '100~150만원', min: '1000000', max: '1500000' },
  { label: '150~200만원', min: '1500000', max: '2000000' },
  { label: '200만원~', min: '2000000', max: '' },
]

export default function ProductFilters({ currentParams }: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (updates: Record<string, string | undefined>) => {
    const newParams = { ...currentParams, ...updates, page: '1' }
    const query = Object.entries(newParams)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join('&')
    router.push(`${pathname}?${query}`)
  }

  const currentUsage = currentParams.usage || ''
  const currentSort = currentParams.sort || 'relevance'
  const currentMin = currentParams.minPrice || ''
  const currentMax = currentParams.maxPrice || ''

  const filterContent = (
    <div className="space-y-6">
      {/* 정렬 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">정렬</h3>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter({ sort: opt.value })}
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                currentSort === opt.value
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 용도 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">용도</h3>
        <div className="flex flex-col gap-1">
          {USAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilter({ usage: opt.value || undefined })}
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                currentUsage === opt.value
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 가격대 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">가격대</h3>
        <div className="flex flex-col gap-1">
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() =>
                updateFilter({
                  minPrice: range.min || undefined,
                  maxPrice: range.max || undefined,
                })
              }
              className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                currentMin === range.min && currentMax === range.max
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* 모바일: 필터 토글 */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 px-4 py-2 rounded-lg w-full justify-between"
        >
          <span>필터 & 정렬</span>
          <span>{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4">{filterContent}</div>
        )}
      </div>

      {/* 데스크톱: 사이드바 */}
      <div className="hidden lg:block bg-white border border-gray-200 rounded-xl p-4">
        {filterContent}
      </div>
    </>
  )
}
