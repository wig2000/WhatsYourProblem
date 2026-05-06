import { getDailySummary, getCategoryBreakdown } from '@/lib/db/queries'

export const revalidate = 3600 // Revalidate hourly

export default async function DashboardPage() {
  const [, categories] = await Promise.all([
    getDailySummary(30),
    getCategoryBreakdown(30),
  ])

  const totalComplaints = (categories as { count: string }[]).reduce((sum, c) => sum + Number(c.count), 0)
  const avgSentiment = (categories as { avg_sentiment: string; count: string }[]).length > 0
    ? (categories as { avg_sentiment: string; count: string }[])
        .reduce((sum, c) => sum + Number(c.avg_sentiment) * Number(c.count), 0) / (totalComplaints || 1)
    : 0

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Overview — last 30 days</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total complaints" value={totalComplaints.toLocaleString()} />
        <StatCard label="Avg sentiment" value={avgSentiment.toFixed(2)} subtitle="-1 (angry) to +1 (fine)" />
        <StatCard label="Categories tracked" value={String((categories as unknown[]).length)} />
        <StatCard label="Days of data" value="30" />
      </div>

      {/* Category table */}
      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border">
          <h2 className="font-semibold text-white">Complaints by category</h2>
        </div>
        <div className="divide-y divide-brand-border">
          {(categories as { category: string; count: string; avg_sentiment: string }[]).map((row) => (
            <div key={row.category} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{ backgroundColor: sentimentColour(Number(row.avg_sentiment)) }}
                />
                <div>
                  <span className="text-white capitalize">{row.category}</span>
                  <p className="text-xs text-brand-muted">avg sentiment {Number(row.avg_sentiment).toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-white font-mono">{Number(row.count).toLocaleString()}</span>
                <p className="text-xs text-brand-muted">
                  {((Number(row.count) / (totalComplaints || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
          {(categories as unknown[]).length === 0 && (
            <div className="px-6 py-12 text-center text-brand-muted">
              No data yet — complaints appear here after the nightly batch runs.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
      <p className="text-brand-muted text-xs mb-2">{label}</p>
      <p className="text-white text-2xl font-bold font-mono">{value}</p>
      {subtitle && <p className="text-brand-muted/60 text-xs mt-1">{subtitle}</p>}
    </div>
  )
}

function sentimentColour(sentiment: number): string {
  if (sentiment < -0.5) return '#E5173F'
  if (sentiment < 0)    return '#FF7043'
  if (sentiment < 0.3)  return '#FFB300'
  return '#00BFA5'
}
