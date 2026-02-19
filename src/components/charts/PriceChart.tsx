'use client'

import dynamic from 'next/dynamic'

const PriceChartInner = dynamic(() => import('./PriceChartInner'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-xl skeleton flex items-center justify-center">
      <p className="text-sm text-gray-400">차트 로딩 중...</p>
    </div>
  ),
})

interface PriceChartProps {
  data: Array<{ date: string; price: number }>
  avg30d: number | null
}

export default function PriceChart({ data, avg30d }: PriceChartProps) {
  return <PriceChartInner data={data} avg30d={avg30d} />
}
