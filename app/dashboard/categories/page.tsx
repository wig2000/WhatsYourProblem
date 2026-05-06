import { getCategoryBreakdown } from '@/lib/db/queries'
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown'

export const revalidate = 3600

export default async function CategoriesPage() {
  const data = await getCategoryBreakdown(30)

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Category breakdown — last 30 days</h1>
      <CategoryBreakdown data={data as { category: string; count: string; avg_sentiment: string }[]} />
    </div>
  )
}
