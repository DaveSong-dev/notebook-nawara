export interface DisplaySuitability {
  forDoc: boolean
  forMedia: boolean
  forGame: boolean
  forDesign: boolean
  summary: string
}

export interface PortSuitability {
  canDualMonitor: boolean
  canExternalGpu: boolean
  portScore: number
  summary: string
  details: string[]
}

export interface TechFeatures {
  wifi6: boolean
  wifi6e: boolean
  wifi7: boolean
  bt5: boolean
  bt53: boolean
  pcieGen4: boolean
  pcieGen5: boolean
  ddr5: boolean
  npu: boolean
  aiAccel: boolean
  oled: boolean
  mini_led: boolean
  thunderbolt4: boolean
  usb4: boolean
  highlights: string[]
}

export interface WorkSuitability {
  coding: 'excellent' | 'good' | 'fair' | 'poor'
  videoEdit: 'excellent' | 'good' | 'fair' | 'poor'
  photoshop: 'excellent' | 'good' | 'fair' | 'poor'
  threeD: 'excellent' | 'good' | 'fair' | 'poor'
  summaries: {
    coding: string
    videoEdit: string
    photoshop: string
    threeD: string
  }
}

export interface FullProductAnalysis {
  priceAnalysis: import('./product').PriceAnalysis
  usageScores: import('./product').UsageScores
  gameEstimates: import('./product').GameEstimate[]
  displaySuitability: DisplaySuitability
  portSuitability: PortSuitability
  techFeatures: TechFeatures
  workSuitability: WorkSuitability
  shouldBuy: boolean
  shouldBuyReason: string
  llmAdvice?: LlmAdvice
}

export interface LlmAdvice {
  provider: string
  pros: string[]
  cons: string[]
  usageSummaries: Record<string, string>
  shouldBuyConclusion: string
  bestFor: string
  cached: boolean
}

export interface ComparisonResult {
  products: import('./product').ProductWithDetails[]
  llmComparison?: string
  cached: boolean
}
