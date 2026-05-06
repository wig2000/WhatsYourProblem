'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  data: { category: string; count: string; avg_sentiment: string }[]
}

function sentimentColour(s: number): string {
  if (s < -0.5) return '#E5173F'
  if (s < 0)    return '#FF7043'
  if (s < 0.3)  return '#FFB300'
  return '#00BFA5'
}

export default function CategoryBreakdown({ data }: Props) {
  const chartData = data.map(d => ({
    category: d.category,
    count: Number(d.count),
    sentiment: Number(d.avg_sentiment),
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-12 text-center text-brand-muted">
        No data yet.
      </div>
    )
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-6">Volume by category (colour = sentiment)</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis
              dataKey="category"
              stroke="#6B6B6B"
              tick={{ fontSize: 11, fill: '#6B6B6B' }}
              angle={-35}
              textAnchor="end"
            />
            <YAxis stroke="#6B6B6B" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', borderRadius: 12 }}
              labelStyle={{ color: '#fff' }}
              formatter={(val: number, name: string) => [
                name === 'count' ? val.toLocaleString() : val.toFixed(2),
                name === 'count' ? 'Complaints' : 'Avg sentiment',
              ]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={sentimentColour(entry.sentiment)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
