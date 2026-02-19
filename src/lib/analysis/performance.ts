import type { ParsedSpec, UsageScores } from '@/types/product'
import type { WorkSuitability } from '@/types/analysis'

// CPU 성능 점수 (0-100)
function getCpuScore(cpu: string): number {
  const lower = cpu.toLowerCase()
  // 인텔 Core Ultra
  if (lower.includes('ultra 9') || lower.includes('ultra 7')) return 90
  if (lower.includes('ultra 5')) return 80
  // 인텔 13/14세대 HX
  if (lower.match(/i9-1[34]\d{3}hx/)) return 95
  if (lower.match(/i9-1[34]\d{3}h/)) return 85
  if (lower.match(/i7-1[34]\d{3}hx/)) return 88
  if (lower.match(/i7-1[34]\d{3}h/)) return 78
  if (lower.match(/i5-1[34]\d{3}h/)) return 68
  if (lower.match(/i5-1[34]\d{3}u/)) return 60
  if (lower.match(/i3-1[34]\d{3}/)) return 45
  // AMD Ryzen
  if (lower.includes('ryzen 9') && lower.includes('7')) return 90
  if (lower.includes('ryzen 7') && lower.includes('7')) return 80
  if (lower.includes('ryzen 5') && lower.includes('7')) return 70
  if (lower.includes('ryzen 9') && lower.includes('5')) return 82
  if (lower.includes('ryzen 7') && lower.includes('5')) return 72
  if (lower.includes('ryzen 5') && lower.includes('5')) return 62
  // Apple
  if (lower.includes('m4 max')) return 98
  if (lower.includes('m4 pro')) return 92
  if (lower.includes('m4')) return 85
  if (lower.includes('m3 max')) return 95
  if (lower.includes('m3 pro')) return 90
  if (lower.includes('m3')) return 82
  if (lower.includes('m2')) return 75
  return 50
}

// GPU 티어 -> GPU 점수 (0-100)
function getGpuScore(tier: number): number {
  const scoreMap: Record<number, number> = {
    1: 10,
    2: 20,
    3: 35,
    4: 45,
    5: 55,
    6: 65,
    7: 75,
    8: 85,
    9: 92,
    10: 100,
  }
  return scoreMap[tier] ?? 10
}

// RAM 점수 (0-100)
function getRamScore(ramGb: number): number {
  if (ramGb >= 64) return 100
  if (ramGb >= 32) return 85
  if (ramGb >= 16) return 70
  if (ramGb >= 8) return 50
  return 25
}

// SSD 점수 (0-100)
function getSsdScore(ssdGb: number): number {
  if (ssdGb >= 2048) return 100
  if (ssdGb >= 1024) return 80
  if (ssdGb >= 512) return 60
  if (ssdGb >= 256) return 40
  return 20
}

// 배터리 점수 (0-100)
function getBatteryScore(batteryWh: number | undefined): number {
  if (!batteryWh) return 50
  if (batteryWh >= 90) return 100
  if (batteryWh >= 72) return 80
  if (batteryWh >= 60) return 65
  if (batteryWh >= 45) return 50
  return 30
}

// 무게 점수 (0-100, 가벼울수록 높음)
function getWeightScore(weightKg: number | undefined): number {
  if (!weightKg) return 50
  if (weightKg <= 1.0) return 100
  if (weightKg <= 1.3) return 90
  if (weightKg <= 1.5) return 80
  if (weightKg <= 1.8) return 65
  if (weightKg <= 2.0) return 55
  if (weightKg <= 2.5) return 40
  if (weightKg <= 3.0) return 25
  return 10
}

// 주사율 점수 (0-100)
function getRefreshRateScore(hz: number | undefined): number {
  if (!hz) return 50
  if (hz >= 240) return 100
  if (hz >= 165) return 85
  if (hz >= 144) return 75
  if (hz >= 120) return 65
  if (hz >= 90) return 55
  return 40
}

// 가격 점수 (낮을수록 학생에게 좋음)
function getPriceScore(price: number | undefined): number {
  if (!price) return 50
  if (price < 600000) return 100
  if (price < 800000) return 85
  if (price < 1000000) return 70
  if (price < 1300000) return 55
  if (price < 1600000) return 40
  if (price < 2000000) return 25
  return 10
}

export function calculateUsageScores(
  specs: ParsedSpec,
  currentPrice?: number,
): UsageScores {
  const cpuScore = getCpuScore(specs.cpu)
  const gpuScore = getGpuScore(specs.gpuTier ?? 1)
  const ramScore = getRamScore(specs.ramGb)
  const ssdScore = getSsdScore(specs.ssdGb)
  const weightScore = getWeightScore(specs.weightKg)
  const batteryScore = getBatteryScore(specs.batteryWh)
  const refreshScore = getRefreshRateScore(specs.refreshRate)
  const priceScore = getPriceScore(currentPrice)

  // 게임용: GPU 50% + CPU 25% + RAM 15% + 주사율 10%
  const gaming = Math.round(
    gpuScore * 0.5 + cpuScore * 0.25 + ramScore * 0.15 + refreshScore * 0.1,
  )

  // 작업용(코딩): CPU 35% + RAM 30% + SSD 20% + 해상도(기본) 15%
  const work = Math.round(
    cpuScore * 0.35 + ramScore * 0.3 + ssdScore * 0.2 + 60 * 0.15,
  )

  // 영상편집: GPU 30% + CPU 30% + RAM 25% + SSD 15%
  const video = Math.round(
    gpuScore * 0.3 + cpuScore * 0.3 + ramScore * 0.25 + ssdScore * 0.15,
  )

  // 학생용: 가격 30% + 무게 25% + 배터리 25% + 기본성능 20%
  const baseScore = Math.round(cpuScore * 0.5 + ramScore * 0.3 + ssdScore * 0.2)
  const student = Math.round(
    priceScore * 0.3 + weightScore * 0.25 + batteryScore * 0.25 + baseScore * 0.2,
  )

  // 휴대성: 무게 40% + 배터리 30% + 크기(화면 역비례) 30%
  const sizeScore = specs.screenSize
    ? specs.screenSize <= 13.3
      ? 100
      : specs.screenSize <= 14
        ? 85
        : specs.screenSize <= 15.6
          ? 65
          : 40
    : 60
  const portable = Math.round(
    weightScore * 0.4 + batteryScore * 0.3 + sizeScore * 0.3,
  )

  // 종합
  const overall = Math.round(
    gaming * 0.2 + work * 0.25 + video * 0.2 + student * 0.2 + portable * 0.15,
  )

  return {
    gaming: Math.min(100, gaming),
    work: Math.min(100, work),
    student: Math.min(100, student),
    video: Math.min(100, video),
    portable: Math.min(100, portable),
    overall: Math.min(100, overall),
  }
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return '매우 적합'
  if (score >= 60) return '적합'
  if (score >= 40) return '보통'
  return '부적합'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-500'
}

export function calculateWorkSuitability(specs: ParsedSpec): WorkSuitability {
  const cpuScore = getCpuScore(specs.cpu)
  const gpuScore = getGpuScore(specs.gpuTier ?? 1)
  const ramScore = getRamScore(specs.ramGb)
  const ssdScore = getSsdScore(specs.ssdGb)

  const getRating = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 75) return 'excellent'
    if (score >= 55) return 'good'
    if (score >= 35) return 'fair'
    return 'poor'
  }

  const codingScore = Math.round(cpuScore * 0.4 + ramScore * 0.35 + ssdScore * 0.25)
  const videoScore = Math.round(cpuScore * 0.3 + gpuScore * 0.3 + ramScore * 0.25 + ssdScore * 0.15)
  const photoScore = Math.round(gpuScore * 0.25 + cpuScore * 0.35 + ramScore * 0.25 + ssdScore * 0.15)
  const threeDScore = Math.round(gpuScore * 0.4 + cpuScore * 0.3 + ramScore * 0.2 + ssdScore * 0.1)

  const ratingLabels: Record<string, string> = {
    excellent: '이 정도면 충분',
    good: '문제없이 사용 가능',
    fair: '조금 아쉬움',
    poor: '추천하지 않음',
  }

  return {
    coding: getRating(codingScore),
    videoEdit: getRating(videoScore),
    photoshop: getRating(photoScore),
    threeD: getRating(threeDScore),
    summaries: {
      coding: ratingLabels[getRating(codingScore)],
      videoEdit: ratingLabels[getRating(videoScore)],
      photoshop: ratingLabels[getRating(photoScore)],
      threeD: ratingLabels[getRating(threeDScore)],
    },
  }
}

export function analyzeDisplaySuitability(specs: ParsedSpec) {
  const isHighRes = specs.resolution?.includes('2560') || specs.resolution?.includes('3840')
  const isHighRefresh = (specs.refreshRate ?? 60) >= 120
  const isOled = specs.panelType === 'OLED'
  const isHighBright = (specs.brightness ?? 0) >= 400

  return {
    forDoc: true, // 거의 모든 노트북
    forMedia: isOled || isHighBright || isHighRes || false,
    forGame: isHighRefresh,
    forDesign: isHighRes || isOled,
    summary: buildDisplaySummary(specs),
  }
}

function buildDisplaySummary(specs: ParsedSpec): string {
  const parts: string[] = []
  if (specs.panelType === 'OLED') parts.push('OLED 패널로 색감이 뛰어납니다')
  if ((specs.refreshRate ?? 60) >= 144) parts.push(`${specs.refreshRate}Hz 고주사율로 게임에 적합합니다`)
  if (specs.resolution?.includes('3840')) parts.push('4K 해상도로 선명한 화질을 제공합니다')
  else if (specs.resolution?.includes('2560')) parts.push('QHD 해상도로 작업에 적합합니다')
  if (!parts.length) parts.push('기본적인 문서 작업과 영상 감상에 적합합니다')
  return parts.join('. ') + '.'
}

export function analyzePortSuitability(specs: ParsedSpec) {
  const canDualMonitor =
    (specs.usbCCount ?? 0) >= 2 ||
    ((specs.hdmiVersion !== undefined) && (specs.usbCCount ?? 0) >= 1) ||
    specs.thunderbolt === true

  const canExternalGpu = specs.thunderbolt === true

  const portScore = calculatePortScore(specs)
  const details: string[] = []

  if (specs.thunderbolt) details.push('썬더볼트 지원 - 외장 GPU 연결 가능')
  if (canDualMonitor) details.push('모니터 2대 연결 가능')
  if (!specs.lanPort) details.push('유선 LAN 없음 (USB 허브 필요)')
  if ((specs.usbCCount ?? 0) === 0 && (specs.usbACount ?? 0) <= 1)
    details.push('포트 수가 적어 허브 추천')

  return {
    canDualMonitor,
    canExternalGpu,
    portScore,
    summary: buildPortSummary(specs, canDualMonitor),
    details,
  }
}

function calculatePortScore(specs: ParsedSpec): number {
  let score = 40
  score += (specs.usbACount ?? 0) * 10
  score += (specs.usbCCount ?? 0) * 15
  if (specs.thunderbolt) score += 20
  if (specs.hdmiVersion) score += 10
  if (specs.sdCard) score += 10
  if (specs.lanPort) score += 5
  return Math.min(100, score)
}

function buildPortSummary(specs: ParsedSpec, canDual: boolean): string {
  if (specs.thunderbolt && canDual) return '포트가 풍부합니다. 모니터 2대 연결과 외장 GPU도 지원합니다.'
  if (canDual) return '모니터 2대 연결이 가능합니다.'
  if ((specs.usbCCount ?? 0) === 0 && (specs.usbACount ?? 0) <= 1) return '포트가 부족합니다. USB 허브를 추천합니다.'
  return '기본적인 연결에 충분합니다.'
}

export function analyzeTechFeatures(specs: ParsedSpec) {
  const highlights: string[] = []

  const wifi6 = specs.wifiVersion?.includes('Wi-Fi 6') && !specs.wifiVersion?.includes('6E') && !specs.wifiVersion?.includes('7') || false
  const wifi6e = specs.wifiVersion?.includes('Wi-Fi 6E') || false
  const wifi7 = specs.wifiVersion?.includes('Wi-Fi 7') || false
  const bt5 = specs.btVersion === '5.0' || specs.btVersion === '5.1' || false
  const bt53 = specs.btVersion === '5.2' || specs.btVersion === '5.3' || false
  const ddr5 = specs.ramType?.includes('DDR5') || specs.ramType?.includes('LPDDR5') || false
  const pcieGen4 = specs.pcieGen?.includes('4') || false
  const pcieGen5 = specs.pcieGen?.includes('5') || false
  const npu = specs.hasNpu || false
  const oled = specs.panelType === 'OLED'
  const thunderbolt4 = specs.thunderbolt || false

  if (wifi7) highlights.push('Wi-Fi 7 최신 무선')
  else if (wifi6e) highlights.push('Wi-Fi 6E 고속 무선')
  if (ddr5) highlights.push('DDR5 최신 메모리')
  if (pcieGen5) highlights.push('PCIe 5.0 초고속 SSD')
  else if (pcieGen4) highlights.push('PCIe 4.0 고속 SSD')
  if (npu) highlights.push('NPU 탑재 AI 가속')
  if (oled) highlights.push('OLED 디스플레이')
  if (thunderbolt4) highlights.push('썬더볼트 4 지원')

  return {
    wifi6,
    wifi6e,
    wifi7,
    bt5,
    bt53,
    pcieGen4,
    pcieGen5,
    ddr5,
    npu,
    aiAccel: npu,
    oled,
    mini_led: specs.panelType === 'Mini-LED',
    thunderbolt4,
    usb4: thunderbolt4,
    highlights,
  }
}
