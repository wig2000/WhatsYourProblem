'use client'

import { useEffect, useRef, useState } from 'react'
import MemeCard from './MemeCard'
import type { GeneratedMeme, SSEEvent } from '@/lib/types'

interface Props {
  complaint: string
  sessionId: string
  consentGiven: boolean
  onSelect: (meme: GeneratedMeme) => void
}

const STYLE_ORDER: GeneratedMeme['style'][] = [
  'surreal', 'realistic', 'template', 'illustration', 'text-only',
]

export default function MemeGrid({ complaint, sessionId, consentGiven, onSelect }: Props) {
  const [memes, setMemes] = useState<(GeneratedMeme | null)[]>(Array(5).fill(null))
  const [loadingSlots, setLoadingSlots] = useState<boolean[]>(Array(5).fill(true))
  const [selectedMeme, setSelectedMeme] = useState<GeneratedMeme | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    let controller: AbortController | null = new AbortController()

    const run = async () => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complaint, sessionId, consentGiven }),
          signal: controller?.signal,
        })

        if (!response.ok) {
          throw new Error(`Generation failed: ${response.status}`)
        }

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent

              if (event.type === 'meme') {
                const { index, data } = event
                const styleIndex = STYLE_ORDER.indexOf(data.style)
                const slot = styleIndex >= 0 ? styleIndex : index

                setMemes(prev => {
                  const next = [...prev]
                  next[slot] = data
                  return next
                })
                setLoadingSlots(prev => {
                  const next = [...prev]
                  next[slot] = false
                  return next
                })
              }

              if (event.type === 'complete') {
                setDone(true)
                setLoadingSlots(Array(5).fill(false))
              }

              if (event.type === 'error' && event.data.index === undefined) {
                setError(event.data.message)
              }
            } catch {
              // Malformed SSE line — skip
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Something went wrong')
        }
      }
    }

    run()

    return () => {
      controller?.abort()
      controller = null
    }
  }, [complaint, sessionId, consentGiven])

  const handleSelect = (meme: GeneratedMeme) => {
    setSelectedMeme(meme)
    onSelect(meme)
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-brand-red text-lg mb-4">Something went wrong</p>
        <p className="text-brand-muted text-sm">{error}</p>
      </div>
    )
  }

  const anyLoaded = memes.some(Boolean)
  const allLoaded = done

  return (
    <div className="w-full">
      {!anyLoaded && (
        <p className="text-brand-muted text-center mb-6 text-sm animate-pulse-slow">
          Turning your suffering into content…
        </p>
      )}

      {anyLoaded && !allLoaded && (
        <p className="text-brand-muted text-center mb-6 text-sm">
          {memes.filter(Boolean).length} of 5 ready — more loading…
        </p>
      )}

      {allLoaded && (
        <p className="text-center mb-6 text-sm text-white/60">
          Pick one to customise
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        {memes.map((meme, i) => (
          <div key={i} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}>
            <MemeCard
              meme={meme}
              isLoading={loadingSlots[i]}
              isSelected={selectedMeme?.id === meme?.id}
              onSelect={handleSelect}
            />
          </div>
        ))}
      </div>

      {selectedMeme && (
        <div className="mt-6 flex justify-center">
          <a
            href={`/customize/${selectedMeme.id}`}
            className="bg-brand-orange hover:bg-orange-500 text-white font-bold py-3 px-10 rounded-xl transition-all text-base active:scale-95"
          >
            Customise this one →
          </a>
        </div>
      )}
    </div>
  )
}
