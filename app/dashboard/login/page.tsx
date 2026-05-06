'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/dashboard/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-brand-card border border-brand-border rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-white mb-6">😤 Analytics Dashboard</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-brand-dark border border-brand-border rounded-xl px-4 py-3 text-white placeholder-brand-muted focus:outline-none focus:border-brand-orange/60"
            autoFocus
          />
          {error && <p className="text-brand-red text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
          >
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  )
}
