import type { ParsedSpec, PriceAnalysis, UsageScores, GameEstimate } from '@/types/product'

interface AnalysisPromptData {
  name: string
  brand: string
  specs: ParsedSpec
  priceAnalysis: PriceAnalysis
  scores: UsageScores
  gameEstimates: GameEstimate[]
  monthsSinceRelease?: number
}

export function buildAnalysisPrompt(data: AnalysisPromptData): string {
  const { name, specs, priceAnalysis, scores, gameEstimates, monthsSinceRelease } = data

  const topGames = gameEstimates
    .filter((g) => g.playability !== 'poor')
    .slice(0, 4)
    .map((g) => `${g.gameName}: 보통 옵션 ${g.fpsMid}fps`)
    .join(', ')

  const releaseInfo = monthsSinceRelease
    ? `출시 ${monthsSinceRelease}개월 경과`
    : '출시일 미상'

  return `당신은 노트북 전문가입니다. 아래 노트북 정보를 바탕으로 초등학생도 이해할 수 있는 쉬운 한국어로 분석해 주세요.
응답은 반드시 JSON 형식으로만 해주세요. 설명은 짧고 명확하게, 전문 용어는 쉽게 풀어서 작성하세요.

## 제품 정보
- 이름: ${name}
- CPU: ${specs.cpu}${specs.cpuGen ? ` (${specs.cpuGen})` : ''}
- GPU: ${specs.gpu || '내장 그래픽'}${specs.gpuVram ? ` ${specs.gpuVram}GB` : ''}
- RAM: ${specs.ramGb}GB${specs.ramType ? ` ${specs.ramType}` : ''}
- SSD: ${specs.ssdGb}GB
- 화면: ${specs.screenSize || '?'}인치 ${specs.resolution || ''} ${specs.refreshRate || 60}Hz ${specs.panelType || ''}
- 무게: ${specs.weightKg || '?'}kg
- ${releaseInfo}

## 현재 가격
- 최저가: ${priceAnalysis.currentLowest.toLocaleString()}원
- 30일 평균: ${priceAnalysis.avg30d ? priceAnalysis.avg30d.toLocaleString() : '?'}원
- 가격 상태: ${priceAnalysis.summary}

## 분석 점수 (100점 만점)
- 게임용: ${scores.gaming}점
- 작업/코딩용: ${scores.work}점
- 학생용: ${scores.student}점
- 영상편집: ${scores.video}점
- 휴대성: ${scores.portable}점

## 게임 성능 (주요 게임)
${topGames || '게임 성능 낮음'}

## 응답 형식 (JSON)
{
  "pros": ["장점1", "장점2", "장점3"],
  "cons": ["단점1", "단점2", "단점3"],
  "usageSummaries": {
    "gaming": "게임 용도 한 줄 평가",
    "work": "작업/코딩 한 줄 평가",
    "student": "학생 사용 한 줄 평가",
    "video": "영상편집 한 줄 평가",
    "portable": "휴대성 한 줄 평가"
  },
  "shouldBuyConclusion": "지금 사도 되는지 판단 (2~3문장)",
  "bestFor": "이런 분께 추천합니다 (1문장)"
}`
}

export function buildComparisonPrompt(
  products: Array<{
    name: string
    specs: ParsedSpec
    priceAnalysis: PriceAnalysis
    scores: UsageScores
  }>,
): string {
  const productInfos = products
    .map(
      (p, i) => `
### 제품 ${i + 1}: ${p.name}
- CPU: ${p.specs.cpu}, GPU: ${p.specs.gpu || '내장 그래픽'}
- RAM: ${p.specs.ramGb}GB, SSD: ${p.specs.ssdGb}GB
- 화면: ${p.specs.screenSize || '?'}인치 ${p.specs.refreshRate || 60}Hz
- 무게: ${p.specs.weightKg || '?'}kg
- 최저가: ${p.priceAnalysis.currentLowest.toLocaleString()}원
- 점수: 게임 ${p.scores.gaming}점 / 작업 ${p.scores.work}점 / 학생 ${p.scores.student}점 / 휴대 ${p.scores.portable}점`,
    )
    .join('\n')

  return `당신은 노트북 전문가입니다. 아래 ${products.length}개 노트북을 비교 분석해 주세요.
쉬운 한국어로, 각 제품의 강점과 약점을 비교하고 어떤 사용자에게 어떤 제품이 맞는지 추천해 주세요.
응답은 JSON 형식으로만 해주세요.

${productInfos}

## 응답 형식 (JSON)
{
  "summary": "전체 비교 요약 (2~3문장)",
  "winner": {
    "gaming": "게임 최고 제품명",
    "work": "작업 최고 제품명",
    "student": "학생 최고 제품명",
    "portable": "휴대성 최고 제품명",
    "value": "가성비 최고 제품명"
  },
  "recommendations": [
    {"persona": "어떤 사람", "product": "추천 제품명", "reason": "이유"}
  ],
  "conclusion": "최종 결론 (3~4문장)"
}`
}

export function buildSpecEnrichPrompt(productName: string, brand: string): string {
  return `당신은 노트북 하드웨어 전문가입니다. 아래 노트북의 **공식 사양**을 정확하게 알려주세요.

제품명: ${productName}
브랜드: ${brand}

반드시 JSON 형식으로만 응답하세요. 모르는 항목은 null로 적어주세요.
추측하지 말고, 공식 스펙시트 기준으로만 답해주세요.

{
  "cpu": "CPU 정확한 모델명 (예: Apple M3, Intel Core i7-13700H, AMD Ryzen 7 7840HS)",
  "cpuGen": "CPU 세대 (예: 13th Gen, Zen 4, M3)",
  "gpu": "GPU 모델명 (내장이면 null, 예: NVIDIA GeForce RTX 4060 Laptop)",
  "gpuVram": GPU VRAM GB 숫자 (예: 8, 내장이면 null),
  "ramGb": RAM 용량 GB 숫자 (예: 16),
  "ramType": "RAM 규격 (예: DDR5, LPDDR5X, LPDDR5)",
  "ssdGb": SSD 용량 GB 숫자 (예: 512, 1TB면 1024),
  "screenSize": 화면 크기 인치 숫자 (예: 14.2, 15.6, 16),
  "resolution": "해상도 (예: 2560x1600, 1920x1080, 2880x1864)",
  "refreshRate": 주사율 Hz 숫자 (예: 60, 120, 165),
  "panelType": "패널 종류 (예: IPS, OLED, Mini-LED, VA)",
  "brightness": 밝기 nit 숫자 (예: 300, 500, 1000, 모르면 null),
  "colorGamut": "색재현율 (예: 100% sRGB, 100% DCI-P3, 모르면 null)",
  "weightKg": 무게 kg 숫자 (예: 1.24, 1.55, 2.1),
  "batteryWh": 배터리 Wh 숫자 (예: 66.5, 72, 100, 모르면 null),
  "usbCCount": USB-C 포트 개수 숫자 (예: 2),
  "thunderbolt": 썬더볼트 지원 여부 true/false,
  "hdmiVersion": "HDMI 버전 (예: 2.1, 2.0, 없으면 null)",
  "sdCard": SD카드 슬롯 여부 true/false,
  "lanPort": 유선 LAN 포트 여부 true/false,
  "audioJack": 이어폰 잭 여부 true/false,
  "wifiVersion": "Wi-Fi 버전 (예: Wi-Fi 6, Wi-Fi 6E, Wi-Fi 7)",
  "btVersion": "블루투스 버전 (예: 5.3, 5.2, 5.0)",
  "pcieGen": "PCIe 세대 (예: Gen4, Gen5, 모르면 null)",
  "hasNpu": NPU 탑재 여부 true/false
}`
}

export function buildRecommendPrompt(
  request: { budget?: { min: number; max: number }; usage?: string[]; priority?: string },
  topProducts: Array<{
    name: string
    specs: ParsedSpec
    priceAnalysis: PriceAnalysis
    scores: UsageScores
    matchScore: number
  }>,
): string {
  const usageLabels: Record<string, string> = {
    gaming: '게임',
    work: '작업/코딩',
    student: '학생',
    video: '영상편집',
    portable: '휴대성',
  }

  const usageText = request.usage?.map((u) => usageLabels[u] || u).join(', ') || '일반'
  const budgetText = request.budget
    ? `${request.budget.min.toLocaleString()}원 ~ ${request.budget.max.toLocaleString()}원`
    : '제한 없음'

  const productList = topProducts
    .slice(0, 3)
    .map(
      (p, i) => `
${i + 1}. ${p.name}
   - 가격: ${p.priceAnalysis.currentLowest.toLocaleString()}원
   - 용도 점수: 게임 ${p.scores.gaming}점 / 작업 ${p.scores.work}점
   - 매칭 점수: ${p.matchScore}점`,
    )
    .join('\n')

  return `당신은 노트북 구매 컨설턴트입니다. 사용자 조건에 맞는 추천 이유를 쉬운 한국어로 설명해 주세요.

## 사용자 조건
- 예산: ${budgetText}
- 용도: ${usageText}
- 우선순위: ${request.priority || '없음'}

## 추천 후보 제품
${productList}

## 응답 형식 (JSON)
{
  "intro": "사용자 상황 이해 한 줄",
  "recommendations": [
    {
      "rank": 1,
      "name": "제품명",
      "reason": "이 제품을 추천하는 이유 (2~3문장)",
      "highlight": "핵심 강점 한 줄"
    }
  ],
  "tip": "구매 팁 또는 주의사항 (1~2문장)"
}`
}
