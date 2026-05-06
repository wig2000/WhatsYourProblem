import { getTrendTimeSeries } from '@/lib/db/queries'
import TrendChart from '@/components/dashboard/TrendChart'

export const revalidate = 3600

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; days?: string }>
}) {
  const { category, days } = await searchParams
  const daysNum = Math.min(365, Math.max(7, Number(days) || 90))
  const data = await getTrendTimeSeries(category, daysNum)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">
        Complaint trends — last {daysNum} days
        {category && <span className="text-brand-muted font-normal text-lg"> / {category}</span>}
      </h1>
      <div className="bg-brand-card border border-brand-border rounded-2xl p-6">
        <TrendChart data={data as { created_date: string; count: string; avg_sentiment: string }[]} />
      </div>
    </div>
  )
}
