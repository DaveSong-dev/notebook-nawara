import type { NaverSearchResponse, NaverProduct } from '@/types/product'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!
const BASE_URL = 'https://openapi.naver.com/v1/search/shop.json'

export async function searchNaverLaptops(
  query: string,
  start = 1,
  display = 100,
): Promise<NaverSearchResponse> {
  const params = new URLSearchParams({
    query: `노트북 ${query}`,
    display: String(display),
    start: String(start),
    sort: 'sim',
    filter: 'naverpay',
  })

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 1800 }, // 30분 캐시
  })

  if (!res.ok) {
    throw new Error(`Naver API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<NaverSearchResponse>
}

export async function getNaverProductDetail(productId: string): Promise<NaverProduct | null> {
  const params = new URLSearchParams({
    query: productId,
    display: '1',
    filter: 'naverpay',
  })

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 1800 },
  })

  if (!res.ok) return null

  const data = (await res.json()) as NaverSearchResponse
  return data.items?.[0] ?? null
}

// 노트북 전용 검색 쿼리 목록
export const LAPTOP_SEARCH_QUERIES = [
  '삼성 갤럭시북',
  'LG 그램',
  '애플 맥북',
  'ASUS ROG',
  'ASUS 젠북',
  '레노버 씽크패드',
  '레노버 리전',
  '델 XPS',
  '델 알리엔웨어',
  'HP 엔비',
  'HP 오멘',
  'MSI 게이밍',
  '에이서 나이트로',
  '에이서 스위프트',
  '한성컴퓨터',
  '주연테크',
]

export function estimateReleaseDate(productName: string): Date | undefined {
  const yearMatch = productName.match(/20(2[0-9])/i)
  if (yearMatch) {
    return new Date(`20${yearMatch[1]}-01-01`)
  }
  return undefined
}

export function sanitizeProductName(title: string): string {
  // HTML 태그 및 특수 문자 제거
  return title
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function extractBrand(name: string, maker: string): string {
  const brandMap: Record<string, string> = {
    삼성: '삼성',
    갤럭시북: '삼성',
    lg: 'LG',
    그램: 'LG',
    애플: '애플',
    맥북: '애플',
    apple: '애플',
    macbook: '애플',
    asus: 'ASUS',
    에이수스: 'ASUS',
    레노버: '레노버',
    lenovo: '레노버',
    델: '델',
    dell: '델',
    hp: 'HP',
    msi: 'MSI',
    에이서: '에이서',
    acer: '에이서',
    한성: '한성컴퓨터',
    주연: '주연테크',
    마이크로소프트: '마이크로소프트',
    microsoft: '마이크로소프트',
    surface: '마이크로소프트',
  }

  const combined = `${name} ${maker}`.toLowerCase()
  for (const [key, value] of Object.entries(brandMap)) {
    if (combined.includes(key)) return value
  }
  return maker || '기타'
}
