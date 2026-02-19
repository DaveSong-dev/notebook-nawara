import type { Metadata } from 'next'
import RecommendWizard from '@/components/recommend/RecommendWizard'

export const metadata: Metadata = {
  title: 'AI 노트북 추천',
  description: '예산과 용도를 알려주시면 AI가 최적의 노트북을 추천해드립니다.',
}

export default function RecommendPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🤖</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI 노트북 추천</h1>
        <p className="text-gray-500">
          몇 가지 질문에 답해주시면<br />
          딱 맞는 노트북을 추천해드립니다
        </p>
      </div>
      <RecommendWizard />
    </div>
  )
}
