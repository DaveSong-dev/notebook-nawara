'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatPrice } from '@/lib/analysis/price'

interface PriceChartInnerProps {
  data: Array<{ date: string; price: number }>
  avg30d: number | null
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm text-xs">
        <p className="text-gray-500 mb-0.5">{label}</p>
        <p className="font-bold text-blue-600">{formatPrice(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function PriceChartInner({ data, avg30d }: PriceChartInnerProps) {
  if (!data.length) return null

  const minPrice = Math.min(...data.map((d) => d.price))
  const maxPrice = Math.max(...data.map((d) => d.price))
  const padding = (maxPrice - minPrice) * 0.1

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.slice(5)} // MM-DD
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            domain={[minPrice - padding, maxPrice + padding]}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          {avg30d && (
            <ReferenceLine
              y={avg30d}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: '30일 평균', position: 'right', fontSize: 10, fill: '#94a3b8' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
