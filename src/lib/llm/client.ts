import { prisma } from '@/lib/db'
import { generateWithGeminiFlash, generateWithGeminiLite, isGeminiConfigured } from './gemini'
import { generateWithGroq, isGroqConfigured } from './groq'

export type LlmProvider = 'gemini-flash' | 'gemini-lite' | 'groq-llama' | 'template'

interface LlmResult {
  text: string
  provider: LlmProvider
  cached: boolean
}

const CACHE_TTL_MS = {
  analysis: 7 * 24 * 60 * 60 * 1000,    // 7일
  comparison: 14 * 24 * 60 * 60 * 1000,  // 14일
  recommend: 24 * 60 * 60 * 1000,         // 1일
}

function extractJson(text: string): string {
  // 마크다운 코드 블록 제거
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (match) return match[1].trim()

  // JSON 시작 찾기
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1) return text.slice(start, end + 1)

  return text
}

export async function generateWithFallback(
  prompt: string,
  cacheKey: string,
  cacheType: keyof typeof CACHE_TTL_MS = 'analysis',
  productId?: string,
): Promise<LlmResult> {
  // 캐시 확인
  const cached = await prisma.llmCache.findUnique({
    where: { cacheKey },
  })

  if (cached && cached.expiresAt > new Date()) {
    return {
      text: cached.response,
      provider: cached.provider as LlmProvider,
      cached: true,
    }
  }

  const providers: Array<{
    name: LlmProvider
    fn: (p: string) => Promise<string>
    available: () => boolean
  }> = [
    { name: 'gemini-flash', fn: generateWithGeminiFlash, available: isGeminiConfigured },
    { name: 'gemini-lite', fn: generateWithGeminiLite, available: isGeminiConfigured },
    { name: 'groq-llama', fn: generateWithGroq, available: isGroqConfigured },
  ]

  for (const provider of providers) {
    if (!provider.available()) continue
    try {
      const raw = await provider.fn(prompt)
      const text = extractJson(raw)

      // JSON 파싱 검증
      JSON.parse(text)

      // 캐시 저장
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS[cacheType])
      await prisma.llmCache.upsert({
        where: { cacheKey },
        update: {
          provider: provider.name,
          response: text,
          expiresAt,
          ...(productId ? { productId } : {}),
        },
        create: {
          cacheKey,
          provider: provider.name,
          response: text,
          expiresAt,
          ...(productId ? { productId } : {}),
        },
      })

      return { text, provider: provider.name, cached: false }
    } catch (err) {
      console.error(`LLM provider ${provider.name} failed:`, err)
      continue
    }
  }

  // 모든 LLM 실패 시 템플릿 폴백 반환
  const fallbackText = JSON.stringify({
    pros: ['분석 데이터를 기반으로 합리적인 성능을 제공합니다', '현재 가격대에서 적절한 선택입니다'],
    cons: ['AI 분석이 일시적으로 불가합니다', '상세 분석은 잠시 후 다시 확인해 주세요'],
    usageSummaries: {
      gaming: '게임 성능 점수를 참고하세요',
      work: '작업 성능 점수를 참고하세요',
      student: '학생 적합도 점수를 참고하세요',
      video: '영상편집 점수를 참고하세요',
      portable: '휴대성 점수를 참고하세요',
    },
    shouldBuyConclusion: '현재 가격과 스펙을 종합적으로 고려하여 판단하세요.',
    bestFor: '용도에 맞는 점수를 확인하고 결정하세요.',
  })

  await prisma.llmCache.upsert({
    where: { cacheKey },
    update: { provider: 'template', response: fallbackText, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    create: {
      cacheKey,
      provider: 'template',
      response: fallbackText,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ...(productId ? { productId } : {}),
    },
  })

  return { text: fallbackText, provider: 'template', cached: false }
}

export async function invalidateCache(cacheKey: string): Promise<void> {
  await prisma.llmCache.deleteMany({ where: { cacheKey } })
}

export async function cleanExpiredCache(): Promise<void> {
  await prisma.llmCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
}
