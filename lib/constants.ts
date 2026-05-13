import type { ColourChoice, FontChoice, GridPosition } from './types'

export const COMPLAINT_CATEGORIES = [
  'work', 'relationships', 'tech', 'transport', 'health',
  'food', 'money', 'government', 'weather', 'retail', 'housing', 'other',
] as const

export const EMOTIONAL_REGISTERS = [
  'frustrated', 'defeated', 'outraged', 'self-deprecating', 'resigned', 'amused',
] as const

export const FONT_LABELS: Record<FontChoice, string> = {
  'bebas':   'Block',
  'bangers': 'Comic',
  'marker':  'Marker',
  'oswald':  'Bold',
}

export const COLOUR_LABELS: Record<ColourChoice, string> = {
  'white-stroke': 'White',
  'black': 'Black',
  'yellow': 'Yellow',
  'red': 'Red',
  'teal': 'Teal',
  'purple': 'Purple',
}

export const COLOUR_HEX: Record<ColourChoice, { fill: string; stroke: string }> = {
  'white-stroke': { fill: '#FFFFFF', stroke: '#000000' },
  'black':        { fill: '#000000', stroke: '#FFFFFF' },
  'yellow':       { fill: '#FFE500', stroke: '#000000' },
  'red':          { fill: '#E5173F', stroke: '#FFFFFF' },
  'teal':         { fill: '#00BFA5', stroke: '#000000' },
  'purple':       { fill: '#9B51E0', stroke: '#FFFFFF' },
}

// 9-point grid: position → { xFraction, yFraction, textAnchor, baseline }
export const GRID_POSITIONS: Record<
  GridPosition,
  { x: number; y: number; anchor: 'start' | 'middle' | 'end'; baseline: string; padding: number }
> = {
  1: { x: 0.05, y: 0.10, anchor: 'start',  baseline: 'hanging',    padding: 20 },
  2: { x: 0.50, y: 0.10, anchor: 'middle', baseline: 'hanging',    padding: 20 },
  3: { x: 0.95, y: 0.10, anchor: 'end',    baseline: 'hanging',    padding: 20 },
  4: { x: 0.05, y: 0.50, anchor: 'start',  baseline: 'middle',     padding: 20 },
  5: { x: 0.50, y: 0.50, anchor: 'middle', baseline: 'middle',     padding: 20 },
  6: { x: 0.95, y: 0.50, anchor: 'end',    baseline: 'middle',     padding: 20 },
  7: { x: 0.05, y: 0.90, anchor: 'start',  baseline: 'auto',       padding: 20 },
  8: { x: 0.50, y: 0.90, anchor: 'middle', baseline: 'auto',       padding: 20 },
  9: { x: 0.95, y: 0.90, anchor: 'end',    baseline: 'auto',       padding: 20 },
}

export const DEFAULT_COMPOSITE_PARAMS = {
  font: 'bebas' as FontChoice,
  colour: 'white-stroke' as ColourChoice,
  placement: 9 as GridPosition,
} as const

export const IMAGE_SIZE = 1024 // px — all generated images are square 1024×1024

// Staging TTL — complaints purged after this many days
export const STAGING_TTL_DAYS = 30

// Temp meme assets expire after 24 hours
export const TEMP_ASSET_TTL_HOURS = 24

export const SUPABASE_BUCKETS = {
  MEMES: 'memes',
} as const

export const STORAGE_PATHS = {
  temp: (sessionId: string, style: string) => `temp/${sessionId}/${style}.webp`,
  final: (shareId: string) => `final/${shareId}.webp`,
}
