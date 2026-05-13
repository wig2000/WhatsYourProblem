'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import type { FontChoice, ColourChoice, GridPosition } from '@/lib/types'
import { FONT_LABELS, COLOUR_LABELS, COLOUR_HEX } from '@/lib/constants'

interface Props {
  memeId: string
  initialCompositeUrl: string
  initialCaption: string
  style: string
}

const FONTS: FontChoice[] = ['bebas', 'bangers', 'marker', 'oswald']
const COLOURS: ColourChoice[] = ['white-stroke', 'black', 'yellow', 'red', 'teal', 'purple']

const GRID: GridPosition[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const GRID_LABELS: Record<GridPosition, string> = {
  1: '↖', 2: '↑', 3: '↗',
  4: '←', 5: '·', 6: '→',
  7: '↙', 8: '↓', 9: '↘',
}

export default function CustomisationPanel({ memeId, initialCompositeUrl, initialCaption, style }: Props) {
  const [font, setFont] = useState<FontChoice>('bebas')
  const [colour, setColour] = useState<ColourChoice>('white-stroke')
  const [placement, setPlacement] = useState<GridPosition>(9)
  const [caption, setCaption] = useState(initialCaption)
  const [compositeUrl, setCompositeUrl] = useState(initialCompositeUrl)
  const [currentMemeId, setCurrentMemeId] = useState(memeId)
  const [isCompositing, setIsCompositing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const recomposite = useCallback(async (
    f: FontChoice, c: ColourChoice, p: GridPosition, cap: string, mid: string
  ) => {
    setIsCompositing(true)
    try {
      const res = await fetch('/api/composite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeId: mid, font: f, colour: c, placement: p, captionText: cap }),
      })
      if (!res.ok) throw new Error('Composite failed')
      const data = await res.json() as { compositeUrl: string; memeId: string }
      setCompositeUrl(data.compositeUrl)
      setCurrentMemeId(data.memeId)
    } catch (err) {
      console.error(err)
    } finally {
      setIsCompositing(false)
    }
  }, [])

  // Debounce re-compositing on param change
  useEffect(() => {
    const t = setTimeout(() => {
      recomposite(font, colour, placement, caption, currentMemeId)
    }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font, colour, placement, caption])

  const handleShare = async () => {
    setSharing(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeId: currentMemeId }),
      })
      if (!res.ok) throw new Error('Share failed')
      const data = await res.json() as { shareUrl: string }
      setShareUrl(data.shareUrl)
      try { await navigator.clipboard.writeText(data.shareUrl) } catch {}
    } catch (err) {
      console.error(err)
    } finally {
      setSharing(false)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = compositeUrl
    a.download = `whats-your-problem-${style}.webp`
    a.click()
  }

  const isTemplate = style === 'template'

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl mx-auto">
      {/* Preview */}
      <div className="flex-1">
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-brand-card border border-brand-border">
          <Image
            src={compositeUrl}
            alt="Meme preview"
            fill
            className={`object-cover transition-opacity ${isCompositing ? 'opacity-60' : 'opacity-100'}`}
            unoptimized
          />
          {isCompositing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-brand-orange/40 border-t-brand-orange rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6 w-full lg:w-72">

        {/* Caption */}
        <div>
          <label className="text-xs text-brand-muted uppercase tracking-wider mb-2 block">Caption</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={3}
            className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-brand-orange/60"
          />
        </div>

        {/* Font */}
        {!isTemplate && (
          <div>
            <label className="text-xs text-brand-muted uppercase tracking-wider mb-2 block">Font</label>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(f => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={`py-2 px-3 rounded-xl text-sm border transition-all ${
                    font === f
                      ? 'border-brand-orange bg-brand-orange/10 text-white'
                      : 'border-brand-border text-brand-muted hover:border-white/30 hover:text-white'
                  }`}
                >
                  {FONT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Colour */}
        {!isTemplate && (
          <div>
            <label className="text-xs text-brand-muted uppercase tracking-wider mb-2 block">Text Colour</label>
            <div className="flex gap-2 flex-wrap">
              {COLOURS.map(c => (
                <button
                  key={c}
                  onClick={() => setColour(c)}
                  title={COLOUR_LABELS[c]}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    colour === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'
                  }`}
                  style={{ backgroundColor: COLOUR_HEX[c].fill }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Placement */}
        {!isTemplate && (
          <div>
            <label className="text-xs text-brand-muted uppercase tracking-wider mb-2 block">Text Position</label>
            <div className="grid grid-cols-3 gap-1 w-32">
              {GRID.map(pos => (
                <button
                  key={pos}
                  onClick={() => setPlacement(pos)}
                  className={`aspect-square rounded-lg text-lg border transition-all ${
                    placement === pos
                      ? 'border-brand-orange bg-brand-orange/20 text-white'
                      : 'border-brand-border text-brand-muted hover:border-white/30 hover:text-white'
                  }`}
                >
                  {GRID_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-auto">
          {shareUrl ? (
            <div className="bg-brand-card border border-brand-border rounded-xl p-4 text-center">
              <p className="text-xs text-brand-muted mb-2">Link copied to clipboard</p>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-orange text-sm break-all hover:underline"
              >
                {shareUrl}
              </a>
            </div>
          ) : (
            <button
              onClick={handleShare}
              disabled={sharing || isCompositing}
              className="w-full bg-brand-orange hover:bg-orange-500 disabled:opacity-40 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              {sharing ? 'Saving…' : 'Share'}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="w-full bg-transparent border border-brand-border hover:border-white/40 text-brand-muted hover:text-white py-3 px-6 rounded-xl transition-all text-sm"
          >
            Download
          </button>
          <a
            href="/generate"
            className="w-full text-center text-brand-muted hover:text-white text-sm py-2 transition-colors"
          >
            ← Try again
          </a>
        </div>
      </div>
    </div>
  )
}
