import { PLAYABILITY_LABELS, PLAYABILITY_COLORS } from '@/lib/analysis/game-fps'

interface GameFpsTableProps {
  estimates: Array<{
    gameName: string
    gameSlug: string
    fpsLow: number
    fpsMid: number
    fpsHigh: number
    playability: string
    summary: string
  }>
}

const GAME_ICONS: Record<string, string> = {
  lol: '⚔️',
  valorant: '🎯',
  overwatch2: '🦸',
  pubg: '🪖',
  gtav: '🚗',
  cyberpunk2077: '🌆',
  eldenring: '⚔️',
  diablo4: '🔥',
  lostark: '🗡️',
  fc25: '⚽',
  maple: '🍁',
}

export default function GameFpsTable({ estimates }: GameFpsTableProps) {
  const sorted = [...estimates].sort((a, b) => {
    const order = { excellent: 0, good: 1, fair: 2, poor: 3 }
    return (order[a.playability as keyof typeof order] ?? 4) - (order[b.playability as keyof typeof order] ?? 4)
  })

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 text-gray-500 font-medium">게임</th>
            <th className="text-center py-2 px-2 text-gray-500 font-medium">낮음</th>
            <th className="text-center py-2 px-2 text-gray-500 font-medium">보통</th>
            <th className="text-center py-2 px-2 text-gray-500 font-medium">높음</th>
            <th className="text-center py-2 px-2 text-gray-500 font-medium">평가</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((est) => (
            <tr key={est.gameSlug} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2.5 px-2 font-medium text-gray-800">
                <span className="mr-1.5">{GAME_ICONS[est.gameSlug] || '🎮'}</span>
                {est.gameName}
              </td>
              <td className="py-2.5 px-2 text-center text-gray-600">{est.fpsLow}fps</td>
              <td className="py-2.5 px-2 text-center font-semibold text-gray-800">{est.fpsMid}fps</td>
              <td className="py-2.5 px-2 text-center text-gray-600">{est.fpsHigh}fps</td>
              <td className="py-2.5 px-2 text-center">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAYABILITY_COLORS[est.playability] || 'text-gray-600 bg-gray-100'}`}
                >
                  {PLAYABILITY_LABELS[est.playability] || est.playability}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
