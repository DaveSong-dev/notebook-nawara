import type { ParsedSpec } from '@/types/product'

// GPU 모델 -> 성능 티어 (1=저사양, 10=최고사양)
const GPU_TIER_MAP: Record<string, number> = {
  // 내장 그래픽
  'iris xe': 1,
  'iris plus': 1,
  uhd: 1,
  'radeon 890m': 2,
  'radeon 780m': 2,
  'radeon 760m': 1,
  'radeon 680m': 1,

  // 엔비디아 MX 시리즈
  'mx550': 2,
  'mx450': 2,
  'mx350': 1,

  // 엔비디아 RTX 40 시리즈 (모바일)
  'rtx 4090': 10,
  'rtx 4080': 9,
  'rtx 4070': 8,
  'rtx 4060': 7,
  'rtx 4050': 6,

  // 엔비디아 RTX 30 시리즈 (모바일)
  'rtx 3080 ti': 8,
  'rtx 3080': 7,
  'rtx 3070 ti': 7,
  'rtx 3070': 6,
  'rtx 3060': 6,
  'rtx 3050 ti': 5,
  'rtx 3050': 4,

  // 엔비디아 RTX 20 시리즈 (모바일)
  'rtx 2080': 6,
  'rtx 2070': 5,
  'rtx 2060': 5,

  // 엔비디아 GTX 시리즈
  'gtx 1660 ti': 4,
  'gtx 1650 ti': 3,
  'gtx 1650': 3,
  'gtx 1050 ti': 2,
  'gtx 1050': 2,

  // AMD RX 시리즈 (모바일)
  'rx 7900m': 9,
  'rx 7700s': 7,
  'rx 7600m': 6,
  'rx 6850m': 7,
  'rx 6800m': 6,
  'rx 6700m': 5,
  'rx 6600m': 5,
  'rx 6500m': 3,
}

export function getGpuTier(gpuString: string): number {
  if (!gpuString) return 1
  const lower = gpuString.toLowerCase()
  for (const [key, tier] of Object.entries(GPU_TIER_MAP)) {
    if (lower.includes(key)) return tier
  }
  // 기본: 내장 그래픽으로 간주
  return 1
}

export function parseSpec(productName: string, description?: string): ParsedSpec {
  const text = `${productName} ${description || ''}`.toLowerCase()

  return {
    cpu: parseCpu(text),
    cpuGen: parseCpuGen(text),
    gpu: parseGpu(text),
    gpuVram: parseGpuVram(text),
    gpuTier: getGpuTier(parseGpu(text) || ''),
    ramGb: parseRam(text),
    ramType: parseRamType(text),
    ssdGb: parseSsd(text),
    screenSize: parseScreenSize(text),
    resolution: parseResolution(text),
    refreshRate: parseRefreshRate(text),
    panelType: parsePanelType(text),
    brightness: parseBrightness(text),
    weightKg: parseWeight(text),
    batteryWh: parseBattery(text),
    usbACount: parseUsbACount(text),
    usbCCount: parseUsbCCount(text),
    thunderbolt: text.includes('thunderbolt') || text.includes('썬더볼트'),
    hdmiVersion: parseHdmi(text),
    sdCard: text.includes('sd카드') || text.includes('sd card') || text.includes('sdcard'),
    lanPort: text.includes('lan') || text.includes('이더넷') || text.includes('rj45'),
    audioJack: !text.includes('오디오 없음'),
    wifiVersion: parseWifi(text),
    btVersion: parseBluetooth(text),
    pcieGen: parsePcie(text),
    hasNpu: text.includes('npu') || text.includes('ai 가속') || text.includes('neural'),
  }
}

function parseCpu(text: string): string {
  // 인텔 패턴
  const intelPatterns = [
    /intel\s+core\s+(ultra\s+)?\d+[\w-]+/i,
    /core\s+(ultra\s+)?[i\d][\w-]+/i,
    /i[3579]-\d{4,5}[a-z]*/i,
    /ultra\s+[579]-\d{3}[a-z]*/i,
  ]
  for (const p of intelPatterns) {
    const m = text.match(p)
    if (m) return m[0].trim()
  }

  // AMD 패턴
  const amdPatterns = [
    /ryzen\s+[379]\s+\d{4}[a-z]*/i,
    /ryzen\s+ai\s+\d+/i,
    /amd\s+ryzen[\w\s-]+/i,
  ]
  for (const p of amdPatterns) {
    const m = text.match(p)
    if (m) return m[0].trim()
  }

  // Apple
  if (text.includes('m4 pro')) return 'Apple M4 Pro'
  if (text.includes('m4 max')) return 'Apple M4 Max'
  if (text.includes('m4')) return 'Apple M4'
  if (text.includes('m3 pro')) return 'Apple M3 Pro'
  if (text.includes('m3 max')) return 'Apple M3 Max'
  if (text.includes('m3')) return 'Apple M3'
  if (text.includes('m2 pro')) return 'Apple M2 Pro'
  if (text.includes('m2')) return 'Apple M2'

  return '알 수 없음'
}

function parseCpuGen(text: string): string | undefined {
  if (text.includes('ultra') || text.includes('arrow lake') || text.includes('lunar lake')) return '인텔 14세대 이상'
  if (text.includes('meteor lake') || text.includes('raptor lake') || text.includes('13세대')) return '인텔 13세대'
  if (text.includes('alder lake') || text.includes('12세대')) return '인텔 12세대'
  if (text.includes('tiger lake') || text.includes('11세대')) return '인텔 11세대'
  if (text.includes('ryzen ai 300') || text.includes('strix point')) return 'AMD Zen 5'
  if (text.includes('ryzen 7000') || text.includes('ryzen ai 7') || text.includes('phoenix')) return 'AMD Zen 4'
  if (text.includes('ryzen 6000') || text.includes('rembrandt')) return 'AMD Zen 3+'
  if (text.includes('ryzen 5000') || text.includes('cezanne')) return 'AMD Zen 3'
  if (text.includes('m4')) return 'Apple M4'
  if (text.includes('m3')) return 'Apple M3'
  if (text.includes('m2')) return 'Apple M2'
  return undefined
}

function parseGpu(text: string): string | undefined {
  // 엔비디아
  const nvidiaMatch = text.match(/(?:rtx|gtx)\s*\d{3,4}(?:\s*(?:ti|super|m))?/i)
  if (nvidiaMatch) return `NVIDIA ${nvidiaMatch[0].toUpperCase()}`

  // AMD Radeon
  const amdMatch = text.match(/(?:radeon\s*(?:rx\s*)?\d{3,4}[ms]?|radeon\s+\w+\d+[ms]?)/i)
  if (amdMatch) return amdMatch[0]

  // 내장 그래픽
  if (text.includes('iris xe')) return 'Intel Iris Xe'
  if (text.includes('iris plus')) return 'Intel Iris Plus'
  if (text.includes('uhd graphics')) return 'Intel UHD Graphics'

  return undefined
}

function parseGpuVram(text: string): number | undefined {
  const match = text.match(/(\d+)\s*gb\s*(?:gddr|vram|그래픽|그램)/i)
  if (match) return parseInt(match[1])
  return undefined
}

function parseRam(text: string): number {
  const patterns = [
    /(\d+)\s*gb\s*(?:ddr[45]?|lpddr[45]?|ram|메모리)/i,
    /(?:ram|메모리)\s*(\d+)\s*gb/i,
    /(\d+)\s*gb\s*x\s*\d+/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const val = parseInt(m[1])
      if (val >= 4 && val <= 256) return val
    }
  }
  return 16 // 기본값
}

function parseRamType(text: string): string | undefined {
  if (text.includes('lpddr5x')) return 'LPDDR5X'
  if (text.includes('lpddr5')) return 'LPDDR5'
  if (text.includes('lpddr4x')) return 'LPDDR4X'
  if (text.includes('lpddr4')) return 'LPDDR4'
  if (text.includes('ddr5')) return 'DDR5'
  if (text.includes('ddr4')) return 'DDR4'
  return undefined
}

function parseSsd(text: string): number {
  const patterns = [
    /(\d+)\s*(?:tb|테라)\s*(?:ssd|nvme|저장)/i,
    /(\d+)\s*gb\s*(?:ssd|nvme|저장)/i,
    /(?:ssd|nvme|저장)\s*(\d+)\s*(?:gb|tb|테라)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const val = parseInt(m[1])
      if (text.match(new RegExp(m[1] + '\\s*(?:tb|테라)', 'i'))) {
        return val * 1024 // TB -> GB
      }
      if (val >= 128) return val
    }
  }
  return 512 // 기본값
}

function parseScreenSize(text: string): number | undefined {
  const m = text.match(/(\d{1,2}(?:\.\d)?)\s*(?:인치|inch|")/i)
  if (m) {
    const val = parseFloat(m[1])
    if (val >= 11 && val <= 18) return val
  }
  return undefined
}

function parseResolution(text: string): string | undefined {
  if (text.includes('4k') || text.includes('3840') || text.includes('uhd')) return '3840x2160'
  if (text.includes('2.8k') || text.includes('2880')) return '2880x1800'
  if (text.includes('2.5k') || text.includes('2560x1600')) return '2560x1600'
  if (text.includes('2k') || text.includes('qhd') || text.includes('2560x1440')) return '2560x1440'
  if (text.includes('wuxga') || text.includes('1920x1200')) return '1920x1200'
  if (text.includes('fhd') || text.includes('1920x1080') || text.includes('full hd')) return '1920x1080'
  if (text.includes('hd+') || text.includes('1366')) return '1366x768'
  return undefined
}

function parseRefreshRate(text: string): number | undefined {
  const m = text.match(/(\d+)\s*hz/i)
  if (m) {
    const val = parseInt(m[1])
    if ([60, 90, 120, 144, 165, 240, 360].includes(val)) return val
  }
  return 60
}

function parsePanelType(text: string): string | undefined {
  if (text.includes('oled') || text.includes('amoled')) return 'OLED'
  if (text.includes('mini-led') || text.includes('mini led')) return 'Mini-LED'
  if (text.includes('ips')) return 'IPS'
  if (text.includes('va panel') || text.includes('va형')) return 'VA'
  if (text.includes('tn')) return 'TN'
  return undefined
}

function parseBrightness(text: string): number | undefined {
  const m = text.match(/(\d{3,4})\s*(?:nit|cd)/i)
  if (m) {
    const val = parseInt(m[1])
    if (val >= 200 && val <= 2000) return val
  }
  return undefined
}

function parseWeight(text: string): number | undefined {
  const m = text.match(/(?:무게|중량|weight)?\s*(\d+(?:\.\d+)?)\s*kg/i)
  if (m) {
    const val = parseFloat(m[1])
    if (val >= 0.5 && val <= 5) return val
  }
  return undefined
}

function parseBattery(text: string): number | undefined {
  const m = text.match(/(\d+(?:\.\d+)?)\s*wh/i)
  if (m) {
    const val = parseFloat(m[1])
    if (val >= 20 && val <= 200) return val
  }
  return undefined
}

function parseUsbACount(text: string): number | undefined {
  const m = text.match(/usb[-\s]?a?\s*(?:type[-\s]?a)?\s*x?\s*(\d)/i)
  if (m) return parseInt(m[1])
  if (text.includes('usb-a') || text.includes('usb type-a')) return 1
  return undefined
}

function parseUsbCCount(text: string): number | undefined {
  const m = text.match(/usb[-\s]?c\s*x?\s*(\d)/i)
  if (m) return parseInt(m[1])
  if (text.includes('usb-c') || text.includes('usb type-c')) return 1
  return undefined
}

function parseHdmi(text: string): string | undefined {
  if (text.includes('hdmi 2.1')) return '2.1'
  if (text.includes('hdmi 2.0')) return '2.0'
  if (text.includes('hdmi 1.4')) return '1.4'
  if (text.includes('hdmi')) return '2.0'
  return undefined
}

function parseWifi(text: string): string | undefined {
  if (text.includes('wi-fi 7') || text.includes('wifi 7') || text.includes('802.11be')) return 'Wi-Fi 7'
  if (text.includes('wi-fi 6e') || text.includes('wifi 6e') || text.includes('6ghz')) return 'Wi-Fi 6E'
  if (text.includes('wi-fi 6') || text.includes('wifi 6') || text.includes('802.11ax')) return 'Wi-Fi 6'
  if (text.includes('802.11ac') || text.includes('wi-fi 5')) return 'Wi-Fi 5'
  return undefined
}

function parseBluetooth(text: string): string | undefined {
  if (text.includes('bluetooth 5.3') || text.includes('bt 5.3')) return '5.3'
  if (text.includes('bluetooth 5.2') || text.includes('bt 5.2')) return '5.2'
  if (text.includes('bluetooth 5.1') || text.includes('bt 5.1')) return '5.1'
  if (text.includes('bluetooth 5.0') || text.includes('bt 5.0') || text.includes('블루투스 5')) return '5.0'
  if (text.includes('bluetooth 4.2')) return '4.2'
  return undefined
}

function parsePcie(text: string): string | undefined {
  if (text.includes('pcie 5') || text.includes('pci-e 5') || text.includes('gen 5')) return 'PCIe 5.0'
  if (text.includes('pcie 4') || text.includes('pci-e 4') || text.includes('gen 4')) return 'PCIe 4.0'
  if (text.includes('pcie 3') || text.includes('pci-e 3') || text.includes('gen 3')) return 'PCIe 3.0'
  return undefined
}

export function estimateReleaseDate(productName: string): Date | undefined {
  // 연도 추출 시도
  const yearMatch = productName.match(/20(2[0-9])/i)
  if (yearMatch) {
    return new Date(`20${yearMatch[1]}-01-01`)
  }
  return undefined
}
