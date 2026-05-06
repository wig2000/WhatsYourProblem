'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ConsentModal from './ConsentModal'

const PROMPTS = [
  "What's your problem?",
  "Go on then. What happened?",
  "Vent. We're listening.",
  "What's doing your head in?",
  "Tell us what went wrong.",
]

function getConsent(): boolean | null {
  try {
    const v = localStorage.getItem('wyp_consent')
    if (v === 'granted') return true
    if (v === 'declined') return false
  } catch {}
  return null
}

function setConsent(granted: boolean) {
  try {
    localStorage.setItem('wyp_consent', granted ? 'granted' : 'declined')
  } catch {}
}

export default function ComplaintInput() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [showConsent, setShowConsent] = useState(false)
  const [placeholder] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
  const pendingSubmit = useRef(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || text.trim().length < 3) return

    const consent = getConsent()
    if (consent === null) {
      setShowConsent(true)
      return
    }

    submit(consent)
  }

  const submit = (consentGiven: boolean) => {
    if (pendingSubmit.current) return
    pendingSubmit.current = true

    const sessionId = crypto.randomUUID()
    try {
      sessionStorage.setItem(`wyp_session_${sessionId}`, JSON.stringify({
        complaint: text.trim(),
        consentGiven,
      }))
    } catch {}

    router.push(`/generate?session=${sessionId}`)
  }

  const onAccept = () => {
    setConsent(true)
    setShowConsent(false)
    submit(true)
  }

  const onDecline = () => {
    setConsent(false)
    setShowConsent(false)
    submit(false)
  }

  const charCount = text.length
  const isReady = text.trim().length >= 3

  return (
    <>
      {showConsent && <ConsentModal onAccept={onAccept} onDecline={onDecline} />}

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div className="relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={placeholder}
            rows={5}
            maxLength={1000}
            className="w-full bg-brand-card border border-brand-border rounded-2xl px-6 py-5 text-white text-lg placeholder-brand-muted resize-none focus:outline-none focus:border-brand-orange/60 transition-colors leading-relaxed"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
            }}
          />
          {charCount > 0 && (
            <span className="absolute bottom-4 right-4 text-xs text-brand-muted/60">
              {charCount}/1000
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-brand-muted">
            Your words are anonymised before anything is stored.
          </span>
          <button
            type="submit"
            disabled={!isReady}
            className="bg-brand-orange hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl transition-all text-base active:scale-95"
          >
            Make my meme →
          </button>
        </div>
      </form>
    </>
  )
}
