import { NextRequest, NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/recommend/engine'
import { generateWithFallback } from '@/lib/llm/client'
import { buildRecommendPrompt } from '@/lib/llm/prompts'
import type { RecommendRequest } from '@/types/product'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RecommendRequest

    const recommendations = await getRecommendations(body, 5)

    if (!recommendations.length) {
      return NextResponse.json({ recommendations: [], message: '조건에 맞는 제품이 없습니다' })
    }

    // LLM 추천 설명 생성
    const cacheKey = `recommend:${JSON.stringify(body)}`
    const topProducts = recommendations.slice(0, 3).map((r) => ({
      name: r.product.name,
      specs: r.product.specs!,
      priceAnalysis: r.product.priceStats!,
      scores: r.product.analysis!,
      matchScore: r.matchScore,
    })).filter((p) => p.specs && p.priceAnalysis && p.scores)

    let llmExplanation = null
    if (topProducts.length > 0) {
      try {
        const prompt = buildRecommendPrompt(body, topProducts as Parameters<typeof buildRecommendPrompt>[1])
        const result = await generateWithFallback(prompt, cacheKey, 'recommend')
        const parsed = JSON.parse(result.text)
        llmExplanation = { ...parsed, provider: result.provider, cached: result.cached }
      } catch {
        // LLM 실패시 무시
      }
    }

    return NextResponse.json({
      recommendations,
      llmExplanation,
      total: recommendations.length,
    })
  } catch (error) {
    console.error('Recommend API error:', error)
    return NextResponse.json({ error: '추천 중 오류가 발생했습니다' }, { status: 500 })
  }
}
