import type { GameEstimate } from '@/types/product'

// 게임별 GPU 티어 -> FPS 룩업 테이블 (낮음/보통/높음 옵션, 1080p 기준)
const GAME_FPS_TABLE: Record<
  string,
  { name: string; fpsTable: Record<number, [number, number, number]> }
> = {
  lol: {
    name: '리그 오브 레전드',
    fpsTable: {
      1: [80, 50, 30],
      2: [144, 90, 60],
      3: [200, 144, 100],
      4: [300, 200, 144],
      5: [360, 300, 200],
      6: [360, 360, 300],
      7: [360, 360, 360],
      8: [360, 360, 360],
      9: [360, 360, 360],
      10: [360, 360, 360],
    },
  },
  valorant: {
    name: '발로란트',
    fpsTable: {
      1: [60, 40, 25],
      2: [120, 80, 50],
      3: [165, 120, 80],
      4: [240, 165, 120],
      5: [360, 240, 165],
      6: [360, 360, 240],
      7: [360, 360, 360],
      8: [360, 360, 360],
      9: [360, 360, 360],
      10: [360, 360, 360],
    },
  },
  overwatch2: {
    name: '오버워치 2',
    fpsTable: {
      1: [35, 20, 12],
      2: [70, 45, 30],
      3: [120, 80, 55],
      4: [165, 120, 80],
      5: [200, 165, 120],
      6: [240, 200, 165],
      7: [300, 240, 200],
      8: [360, 300, 240],
      9: [360, 360, 300],
      10: [360, 360, 360],
    },
  },
  pubg: {
    name: '배틀그라운드',
    fpsTable: {
      1: [20, 12, 7],
      2: [40, 25, 15],
      3: [60, 40, 25],
      4: [90, 60, 40],
      5: [120, 90, 60],
      6: [144, 120, 90],
      7: [165, 144, 120],
      8: [200, 165, 144],
      9: [240, 200, 165],
      10: [300, 240, 200],
    },
  },
  gtav: {
    name: 'GTA V',
    fpsTable: {
      1: [30, 18, 10],
      2: [60, 40, 25],
      3: [90, 65, 45],
      4: [120, 90, 65],
      5: [144, 120, 90],
      6: [165, 144, 120],
      7: [200, 165, 144],
      8: [240, 200, 165],
      9: [300, 240, 200],
      10: [360, 300, 240],
    },
  },
  cyberpunk2077: {
    name: '사이버펑크 2077',
    fpsTable: {
      1: [10, 6, 3],
      2: [20, 12, 7],
      3: [35, 22, 13],
      4: [50, 35, 22],
      5: [65, 50, 35],
      6: [80, 65, 45],
      7: [100, 80, 60],
      8: [120, 100, 75],
      9: [144, 120, 90],
      10: [165, 144, 110],
    },
  },
  eldenring: {
    name: '엘든링',
    fpsTable: {
      1: [20, 12, 8],
      2: [40, 28, 18],
      3: [60, 45, 30],
      4: [80, 60, 45],
      5: [100, 80, 60],
      6: [120, 100, 80],
      7: [144, 120, 100],
      8: [144, 144, 120],
      9: [144, 144, 144],
      10: [144, 144, 144],
    },
  },
  diablo4: {
    name: '디아블로 4',
    fpsTable: {
      1: [25, 15, 8],
      2: [50, 30, 20],
      3: [80, 55, 35],
      4: [100, 80, 55],
      5: [120, 100, 80],
      6: [144, 120, 100],
      7: [165, 144, 120],
      8: [200, 165, 144],
      9: [240, 200, 165],
      10: [300, 240, 200],
    },
  },
  lostark: {
    name: '로스트아크',
    fpsTable: {
      1: [50, 30, 20],
      2: [100, 70, 45],
      3: [144, 100, 70],
      4: [200, 144, 100],
      5: [240, 200, 144],
      6: [300, 240, 200],
      7: [360, 300, 240],
      8: [360, 360, 300],
      9: [360, 360, 360],
      10: [360, 360, 360],
    },
  },
  fc25: {
    name: 'EA FC 25 (피파)',
    fpsTable: {
      1: [40, 25, 15],
      2: [80, 55, 35],
      3: [120, 85, 60],
      4: [144, 120, 85],
      5: [165, 144, 120],
      6: [200, 165, 144],
      7: [240, 200, 165],
      8: [300, 240, 200],
      9: [360, 300, 240],
      10: [360, 360, 300],
    },
  },
  maple: {
    name: '메이플스토리',
    fpsTable: {
      1: [60, 40, 25],
      2: [120, 80, 55],
      3: [200, 144, 100],
      4: [300, 200, 144],
      5: [360, 300, 200],
      6: [360, 360, 300],
      7: [360, 360, 360],
      8: [360, 360, 360],
      9: [360, 360, 360],
      10: [360, 360, 360],
    },
  },
}

function getPlayability(fpsMid: number, refreshRate: number): 'excellent' | 'good' | 'fair' | 'poor' {
  const targetFps = Math.min(refreshRate, 60)
  if (fpsMid >= targetFps * 2) return 'excellent'
  if (fpsMid >= targetFps) return 'good'
  if (fpsMid >= targetFps * 0.6) return 'fair'
  return 'poor'
}

function buildFpsSummary(
  gameName: string,
  fpsLow: number,
  fpsMid: number,
  fpsHigh: number,
  playability: string,
): string {
  if (playability === 'excellent') {
    return `최상 옵션에서도 ${fpsHigh}fps로 매우 쾌적하게 즐길 수 있습니다.`
  }
  if (playability === 'good') {
    if (fpsMid >= 60) {
      return `보통 옵션에서 ${fpsMid}fps로 원활하게 플레이 가능합니다.`
    }
    return `낮은 옵션에서 ${fpsLow}fps로 플레이 가능합니다.`
  }
  if (playability === 'fair') {
    return `낮은 옵션에서 ${fpsLow}fps로 간신히 플레이 가능합니다. 옵션 타협이 필요합니다.`
  }
  return `${gameName}을 원활하게 즐기기 어렵습니다.`
}

export function estimateGameFps(gpuTier: number, refreshRate = 60): GameEstimate[] {
  const tier = Math.max(1, Math.min(10, gpuTier))

  return Object.entries(GAME_FPS_TABLE).map(([slug, game]) => {
    const fpsList = game.fpsTable[tier] ?? game.fpsTable[1]
    const [fpsHigh, fpsMid, fpsLow] = fpsList
    const playability = getPlayability(fpsMid, refreshRate)

    return {
      gameName: game.name,
      gameSlug: slug,
      fpsLow: Math.min(fpsLow, 360),
      fpsMid: Math.min(fpsMid, 360),
      fpsHigh: Math.min(fpsHigh, 360),
      playability,
      summary: buildFpsSummary(game.name, fpsLow, fpsMid, fpsHigh, playability),
    }
  })
}

export const PLAYABILITY_LABELS: Record<string, string> = {
  excellent: '매우 쾌적',
  good: '원활',
  fair: '간신히 가능',
  poor: '권장 안 함',
}

export const PLAYABILITY_COLORS: Record<string, string> = {
  excellent: 'text-green-600 bg-green-50',
  good: 'text-blue-600 bg-blue-50',
  fair: 'text-yellow-600 bg-yellow-50',
  poor: 'text-red-500 bg-red-50',
}
