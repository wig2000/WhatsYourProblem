'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import MemeGrid from '@/components/MemeGrid'
import type { GeneratedMeme } from '@/lib/types'

function GenerateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')

  const [complaint, setComplaint] = useState<string | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [, setSelectedMeme] = useState<GeneratedMeme | null>(null)

  useEffect(() => {
    if (!sessionId) {
      router.replace('/')
      return
    }
    try {
      const raw = sessionStorage.getItem(`wyp_session_${sessionId}`)
      if (!raw) { router.replace('/'); return }
      const data = JSON.parse(raw) as { complaint: string; consentGiven: boolean }
      setComplaint(data.complaint)
      setConsentGiven(data.consentGiven)
    } catch {
      router.replace('/')
    }
  }, [sessionId, router])

  if (!complaint || !sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-orange/40 border-t-brand-orange rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-brand-muted text-sm hover:text-white transition-colors">
            ← What&apos;s Your Problem?
          </Link>
          <h2 className="text-2xl font-bold text-white mt-4 mb-2">
            Pick your meme
          </h2>
          <p className="text-brand-muted text-sm max-w-md mx-auto line-clamp-2">
            &ldquo;{complaint}&rdquo;
          </p>
        </div>

        <MemeGrid
          complaint={complaint}
          sessionId={sessionId}
          consentGiven={consentGiven}
          onSelect={setSelectedMeme}
        />

        {/* Try again */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-brand-muted text-sm hover:text-white transition-colors">
            Start over with a different complaint
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-orange/40 border-t-brand-orange rounded-full animate-spin" />
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}
