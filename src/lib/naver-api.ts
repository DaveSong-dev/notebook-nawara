import type { NaverSearchResponse, NaverProduct } from '@/types/product'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!
const BASE_URL = 'https://openapi.naver.com/v1/search/shop.json'

export async function searchNaverLaptops(
  query: string,
  start = 1,
  display = 100,
  sort: 'sim' | 'date' | 'asc' | 'dsc' = 'sim',
): Promise<NaverSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: String(Math.min(display, 100)),
    start: String(Math.min(start, 1000)),
    sort,
  })

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Naver API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<NaverSearchResponse>
}

// 페이지네이션으로 최대한 많은 결과 수집
export async function searchNaverLaptopsAll(
  query: string,
  maxPages = 5,
  sort: 'sim' | 'date' | 'asc' | 'dsc' = 'sim',
): Promise<NaverProduct[]> {
  const allItems: NaverProduct[] = []
  const seenIds = new Set<string>()

  for (let page = 0; page < maxPages; page++) {
    const start = page * 100 + 1
    if (start > 1000) break

    try {
      const result = await searchNaverLaptops(query, start, 100, sort)
      if (!result.items || result.items.length === 0) break

      for (const item of result.items) {
        if (!seenIds.has(item.productId)) {
          seenIds.add(item.productId)
          allItems.push(item)
        }
      }

      if (result.items.length < 100) break
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      break
    }
  }

  return allItems
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

// 대량 수집용 쿼리 - 브랜드+라인별로 세분화하여 최대한 많은 카탈로그 제품 수집
export const LAPTOP_SEARCH_QUERIES = [
  // 삼성
  '삼성 갤럭시북4', '삼성 갤럭시북4 프로', '삼성 갤럭시북4 울트라', '삼성 갤럭시북4 360',
  '삼성 갤럭시북3', '삼성 갤럭시북3 프로', '삼성 갤럭시북3 울트라',
  '삼성 갤럭시북2', '삼성 갤럭시북2 프로', '삼성 갤럭시북 이온',
  // LG
  'LG 그램 2024', 'LG 그램 2023', 'LG 그램 프로', 'LG 그램 16', 'LG 그램 17', 'LG 그램 14', 'LG 그램 15',
  'LG 그램 360', 'LG 그램 스타일',
  // 애플
  '애플 맥북 에어 M4', '애플 맥북 에어 M3', '애플 맥북 에어 M2', '애플 맥북 에어 M1',
  '애플 맥북 프로 M4', '애플 맥북 프로 M4 Pro', '애플 맥북 프로 M4 Max',
  '애플 맥북 프로 M3', '애플 맥북 프로 M3 Pro', '애플 맥북 프로 M3 Max',
  '애플 맥북 프로 M2', '애플 맥북 프로 14인치', '애플 맥북 프로 16인치',
  // ASUS
  'ASUS ROG 스트릭스', 'ASUS ROG 제피러스', 'ASUS ROG 플로우', 'ASUS TUF 게이밍',
  'ASUS 젠북', 'ASUS 젠북 프로', 'ASUS 젠북 14', 'ASUS 비보북', 'ASUS 비보북 프로',
  'ASUS ProArt',
  // 레노버
  '레노버 씽크패드', '레노버 씽크패드 X1', '레노버 씽크패드 T14', '레노버 씽크패드 E14',
  '레노버 리전', '레노버 리전 프로', '레노버 리전 슬림',
  '레노버 아이디어패드', '레노버 아이디어패드 슬림', '레노버 요가',
  // 델
  '델 XPS 13', '델 XPS 14', '델 XPS 15', '델 XPS 16',
  '델 인스피론 14', '델 인스피론 15', '델 인스피론 16',
  '델 알리엔웨어', '델 래티튜드', '델 보스트로',
  // HP
  'HP 엔비', 'HP 엔비 x360', 'HP 오멘', 'HP 오멘 16', 'HP 오멘 17',
  'HP 파빌리온', 'HP 파빌리온 플러스', 'HP 스펙터', 'HP 스펙터 x360',
  'HP 빅터스', 'HP 드래곤플라이', 'HP 엘리트북',
  // MSI
  'MSI 스텔스', 'MSI 레이더', 'MSI 벡터', 'MSI 크로스헤어', 'MSI 프레스티지',
  'MSI 모던', 'MSI 사이보그', 'MSI 씬',
  // 에이서
  '에이서 나이트로', '에이서 나이트로 V', '에이서 스위프트', '에이서 스위프트 고',
  '에이서 프레데터', '에이서 프레데터 헬리오스', '에이서 아스파이어',
  // 기타 브랜드
  '한성컴퓨터 TFG', '한성컴퓨터 올데이롱', '한성컴퓨터 보스몬스터',
  '주연테크 캐리북', '마이크로소프트 서피스 프로', '마이크로소프트 서피스 랩탑',
  '기가바이트 AERO', '기가바이트 AORUS', '기가바이트 G5',
  '레이저 블레이드 14', '레이저 블레이드 15', '레이저 블레이드 16',
  '프레임워크 노트북',
  // GPU별 (다양한 제품 커버)
  '노트북 RTX 4050', '노트북 RTX 4060', '노트북 RTX 4070', '노트북 RTX 4080', '노트북 RTX 4090',
  '노트북 RTX 5070', '노트북 RTX 5080',
  // CPU별
  '노트북 i7-13700H', '노트북 i7-14700HX', '노트북 i9-14900HX',
  '노트북 라이젠7 7840HS', '노트북 라이젠9',
  // 용도별
  '게이밍 노트북 2024', '게이밍 노트북 2025',
  '사무용 노트북', '대학생 노트북', '영상편집 노트북', '3D 작업 노트북',
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
