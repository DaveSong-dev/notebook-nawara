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

// 노트북 전용 검색 쿼리 목록 - 브랜드별 + 용도별 + 가격대별
export const LAPTOP_SEARCH_QUERIES = [
  // 브랜드별
  '삼성 갤럭시북4',
  '삼성 갤럭시북4 프로',
  '삼성 갤럭시북4 울트라',
  '삼성 갤럭시북3',
  'LG 그램 2024',
  'LG 그램 프로',
  'LG 그램 17',
  '애플 맥북 에어 M3',
  '애플 맥북 에어 M4',
  '애플 맥북 프로 M3',
  '애플 맥북 프로 M4',
  'ASUS ROG 스트릭스',
  'ASUS ROG 제피러스',
  'ASUS 젠북',
  'ASUS 비보북',
  'ASUS TUF',
  '레노버 씽크패드',
  '레노버 리전',
  '레노버 아이디어패드',
  '레노버 요가',
  '델 XPS',
  '델 인스피론',
  '델 알리엔웨어',
  '델 래티튜드',
  'HP 엔비',
  'HP 오멘',
  'HP 파빌리온',
  'HP 스펙터',
  'MSI 게이밍 노트북',
  'MSI 스텔스',
  'MSI 레이더',
  'MSI 프레스티지',
  '에이서 나이트로',
  '에이서 스위프트',
  '에이서 프레데터',
  '한성컴퓨터 TFG',
  '한성컴퓨터 올데이롱',
  '주연테크 캐리북',
  '마이크로소프트 서피스',
  '기가바이트 AERO',
  '기가바이트 AORUS',
  '레이저 블레이드',
  // 용도별
  '게이밍 노트북 RTX 4060',
  '게이밍 노트북 RTX 4070',
  '게이밍 노트북 RTX 4080',
  '사무용 노트북 경량',
  '대학생 노트북 2024',
  '영상편집 노트북',
  '코딩 개발 노트북',
  // 가격대별
  '노트북 50만원',
  '노트북 70만원',
  '노트북 100만원',
  '노트북 150만원',
  '노트북 200만원',
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
