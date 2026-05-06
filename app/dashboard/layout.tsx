import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'

// Phase 5 MVP gate: simple password protection until Clerk is wired up.
// Set DASHBOARD_PASSWORD in env. Access via /dashboard/login.

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('wyp_dash_token')?.value
  return token === process.env.DASHBOARD_PASSWORD
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated()
  if (!authed) redirect('/dashboard/login')

  return (
    <div className="min-h-screen">
      <nav className="border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-brand-muted text-sm hover:text-white transition-colors">
            ← App
          </Link>
          <span className="text-white font-bold">😤 Analytics</span>
          <Link href="/dashboard" className="text-brand-muted text-sm hover:text-white transition-colors">Overview</Link>
          <Link href="/dashboard/trends" className="text-brand-muted text-sm hover:text-white transition-colors">Trends</Link>
          <Link href="/dashboard/categories" className="text-brand-muted text-sm hover:text-white transition-colors">Categories</Link>
        </div>
        <form action="/api/dashboard/logout" method="POST">
          <button type="submit" className="text-xs text-brand-muted hover:text-white transition-colors">
            Sign out
          </button>
        </form>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
