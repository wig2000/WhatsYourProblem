'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface Props {
  data: { created_date: string; count: string; avg_sentiment: string }[]
}

export default function TrendChart({ data }: Props) {
  const chartData = data.map(d => ({
    date: d.created_date.slice(5),   // MM-DD
    complaints: Number(d.count),
    sentiment: Number(d.avg_sentiment),
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-brand-muted">
        No trend data yet — check back after the nightly batch runs.
      </div>
    )
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis dataKey="date" stroke="#6B6B6B" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" stroke="#6B6B6B" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" domain={[-1, 1]} stroke="#6B6B6B" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#141414', border: '1px solid #2A2A2A', borderRadius: 12 }}
            labelStyle={{ color: '#fff' }}
            itemStyle={{ color: '#6B6B6B' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#6B6B6B' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="complaints"
            stroke="#FF4D00"
            strokeWidth={2}
            dot={false}
            name="Complaints"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="sentiment"
            stroke="#00BFA5"
            strokeWidth={2}
            dot={false}
            name="Avg sentiment"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
