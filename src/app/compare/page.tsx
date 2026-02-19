import type { Metadata } from 'next'
import CompareClient from '@/components/recommend/CompareClient'

export const metadata: Metadata = {
  title: '노트북 비교하기',
  description: '2~3개 노트북을 선택해서 성능, 가격, 용도를 비교해보세요.',
}

export default function ComparePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">↔️ 노트북 비교하기</h1>
        <p className="text-gray-500 text-sm">2~3개 제품을 골라서 AI가 비교 분석해드립니다</p>
      </div>
      <CompareClient />
    </div>
  )
}
