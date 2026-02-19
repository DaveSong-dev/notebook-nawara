export interface NaverProduct {
  title: string
  link: string
  image: string
  lprice: string
  hprice: string
  mallName: string
  productId: string
  productType: string
  brand: string
  maker: string
  category1: string
  category2: string
  category3: string
  category4: string
}

export interface NaverSearchResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverProduct[]
}

export interface ParsedSpec {
  cpu: string
  cpuGen?: string
  gpu?: string
  gpuVram?: number
  gpuTier?: number
  ramGb: number
  ramType?: string
  ssdGb: number
  screenSize?: number
  resolution?: string
  refreshRate?: number
  panelType?: string
  brightness?: number
  colorGamut?: string
  weightKg?: number
  batteryWh?: number
  usbACount?: number
  usbCCount?: number
  thunderbolt?: boolean
  hdmiVersion?: string
  sdCard?: boolean
  lanPort?: boolean
  audioJack?: boolean
  wifiVersion?: string
  btVersion?: string
  pcieGen?: string
  hasNpu?: boolean
}

export interface PriceAnalysis {
  currentLowest: number
  avg7d: number | null
  avg30d: number | null
  avg90d: number | null
  allTimeMin: number | null
  allTimeMax: number | null
  allTimeAvg: number | null
  priceDropDetected: boolean
  dropPercent: number | null
  priceTrend: 'rising' | 'falling' | 'stable' | null
  valueScore: number
  valueTier: 'high' | 'mid' | 'low'
  summary: string
  vsAvg30dPercent: number | null
}

export interface UsageScores {
  gaming: number
  work: number
  student: number
  video: number
  portable: number
  overall: number
}

export interface GameEstimate {
  gameName: string
  gameSlug: string
  fpsLow: number
  fpsMid: number
  fpsHigh: number
  playability: 'excellent' | 'good' | 'fair' | 'poor'
  summary: string
}

export interface ProductWithDetails {
  id: string
  naverId: string
  name: string
  brand: string
  imageUrl: string | null
  releaseDate: Date | null
  mallUrl: string
  specs: ParsedSpec | null
  priceStats: PriceAnalysis | null
  analysis: UsageScores | null
  gameEstimates: GameEstimate[]
  shouldBuy: boolean | null
  shouldBuyReason: string | null
}

export interface RecommendRequest {
  budget?: { min: number; max: number }
  usage?: Array<'gaming' | 'work' | 'student' | 'video' | 'portable'>
  priority?: 'value' | 'performance' | 'portable' | 'latest'
}

export interface Recommendation {
  product: ProductWithDetails
  matchScore: number
  reasons: string[]
  warnings: string[]
  shouldBuy: boolean
  shouldBuyReason: string
  llmAdvice?: string
}

export type UserMode = 'beginner' | 'expert'
