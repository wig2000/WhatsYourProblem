export type MemeStyle = 'surreal' | 'realistic' | 'illustration' | 'template' | 'text-only'
export type FontChoice = 'bebas' | 'inter-bold' | 'caveat' | 'inter'
export type ColourChoice = 'white-stroke' | 'black' | 'yellow' | 'red' | 'teal' | 'purple'
export type GridPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface MemeBrief {
  style: MemeStyle
  imagePrompt?: string
  captionText: string
  templateId?: string
  topText?: string
  bottomText?: string
}

export interface GeneratedMeme {
  id: string
  sessionId: string
  style: MemeStyle
  brief: MemeBrief
  baseImagePath: string | null
  compositePath: string
  compositeUrl: string
  captionText: string
}

export interface ParsedComplaint {
  premise: string
  category: string
  emotionalRegister: string
  piiStripped: boolean
  originalLength: number
}

export type SSEEvent =
  | { type: 'parsed'; data: ParsedComplaint }
  | { type: 'meme'; index: number; data: GeneratedMeme }
  | { type: 'error'; data: { message: string; index?: number } }
  | { type: 'complete'; data: { sessionId: string } }

export const FONT_LABELS: Record<FontChoice, string> = {
  bebas: 'Classic',
  'inter-bold': 'Bold',
  caveat: 'Handwritten',
  inter: 'Clean',
}

export const COLOUR_HEX: Record<ColourChoice, { fill: string; stroke: string }> = {
  'white-stroke': { fill: '#FFFFFF', stroke: '#000000' },
  black:          { fill: '#000000', stroke: '#FFFFFF' },
  yellow:         { fill: '#FFE500', stroke: '#000000' },
  red:            { fill: '#E5173F', stroke: '#FFFFFF' },
  teal:           { fill: '#00BFA5', stroke: '#000000' },
  purple:         { fill: '#9B51E0', stroke: '#FFFFFF' },
}

export const GRID_ARROWS: Record<GridPosition, string> = {
  1: '↖', 2: '↑', 3: '↗',
  4: '←', 5: '·', 6: '→',
  7: '↙', 8: '↓', 9: '↘',
}
