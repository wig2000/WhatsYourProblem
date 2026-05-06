'use client'

import { useState } from 'react'

interface Props {
  onAccept: () => void
  onDecline: () => void
}

export default function ConsentModal({ onAccept, onDecline }: Props) {
  const [loading, setLoading] = useState(false)

  const handle = (accept: boolean) => {
    setLoading(true)
    if (accept) onAccept()
    else onDecline()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-brand-card border border-brand-border rounded-2xl max-w-md w-full p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-3">Before you vent…</h2>
        <p className="text-brand-muted text-sm leading-relaxed mb-4">
          Your complaint text is anonymised before it ever touches a database &mdash; all names, companies,
          and personal details are stripped by AI before storage.
        </p>
        <p className="text-brand-muted text-sm leading-relaxed mb-6">
          With your permission, we&apos;d like to use the anonymised data to identify complaint trends
          (e.g. &ldquo;commuters are really unhappy this month&rdquo;). This data feeds our B2B analytics product.
          You can still use the app without consenting.
        </p>
        <div className="flex flex-col gap-3">
          <button
            disabled={loading}
            onClick={() => handle(true)}
            className="w-full bg-brand-orange hover:bg-orange-500 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            Yes, include my data in trend analysis
          </button>
          <button
            disabled={loading}
            onClick={() => handle(false)}
            className="w-full bg-transparent border border-brand-border hover:border-white/40 text-brand-muted hover:text-white py-3 px-6 rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            No thanks — just generate my meme
          </button>
        </div>
        <p className="text-xs text-brand-muted/60 mt-4 text-center">
          You can change this anytime. We never store your original complaint text.
        </p>
      </div>
    </div>
  )
}
