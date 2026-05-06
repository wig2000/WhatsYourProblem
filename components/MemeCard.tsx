'use client'

import Image from 'next/image'
import type { GeneratedMeme } from '@/lib/types'

interface Props {
  meme: GeneratedMeme | null
  isLoading: boolean
  isSelected: boolean
  onSelect: (meme: GeneratedMeme) => void
}

const STYLE_LABELS: Record<string, string> = {
  'surreal':      'Surreal',
  'realistic':    'Realistic',
  'template':     'Classic',
  'illustration': 'Illustration',
  'text-only':    'Text Only',
}

export default function MemeCard({ meme, isLoading, isSelected, onSelect }: Props) {
  if (isLoading && !meme) {
    return (
      <div className="relative aspect-square rounded-2xl bg-brand-card border border-brand-border overflow-hidden animate-pulse-slow">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-orange/40 border-t-brand-orange rounded-full animate-spin" />
          <span className="text-brand-muted text-xs">Generating…</span>
        </div>
      </div>
    )
  }

  if (!meme) return null

  return (
    <button
      onClick={() => onSelect(meme)}
      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 group animate-fade-in ${
        isSelected
          ? 'border-brand-orange scale-[1.02] shadow-lg shadow-brand-orange/20'
          : 'border-brand-border hover:border-white/30 hover:scale-[1.01]'
      }`}
    >
      <Image
        src={meme.compositeUrl}
        alt={`${STYLE_LABELS[meme.style]} meme`}
        fill
        className="object-cover"
        unoptimized
      />

      {/* Style badge */}
      <div className="absolute top-2 left-2">
        <span className="bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
          {STYLE_LABELS[meme.style]}
        </span>
      </div>

      {/* Selected ring */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <span className="bg-brand-orange text-white text-xs font-bold px-2 py-1 rounded-full">
            ✓ Selected
          </span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-brand-orange/0 group-hover:bg-brand-orange/10 transition-colors" />
    </button>
  )
}
