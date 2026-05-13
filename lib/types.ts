export type MemeStyle = 'surreal' | 'realistic' | 'template' | 'illustration' | 'text-only'

export type EmotionalRegister =
  | 'frustrated'
  | 'defeated'
  | 'outraged'
  | 'self-deprecating'
  | 'resigned'
  | 'amused'

export type ComplaintCategory =
  | 'work'
  | 'relationships'
  | 'tech'
  | 'transport'
  | 'health'
  | 'food'
  | 'money'
  | 'government'
  | 'weather'
  | 'retail'
  | 'housing'
  | 'other'

// 1=top-left … 5=centre … 9=bottom-right (reading order)
export type GridPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type FontChoice = 'bebas' | 'bangers' | 'marker' | 'oswald'

export type ColourChoice =
  | 'white-stroke'
  | 'black'
  | 'yellow'
  | 'red'
  | 'teal'
  | 'purple'

// ─── LLM outputs ─────────────────────────────────────────────────────────────

export interface ParsedComplaint {
  premise: string
  category: ComplaintCategory
  secondaryCategories: ComplaintCategory[]
  sentiment: number // -1.0 to 1.0
  emotionalRegister: EmotionalRegister
}

export interface MemeBrief {
  style: MemeStyle
  imagePrompt: string | null // null for text-only
  captionText: string
  templateId?: string // for 'template' style only
  topText?: string    // for 'template' style
  bottomText?: string // for 'template' style
}

// ─── Image generation ─────────────────────────────────────────────────────────

export interface ImageGenResult {
  buffer: Buffer
  model: string
  inputTokens?: number  // gpt-image-2 only
  outputTokens?: number // gpt-image-2 only
  costCents?: number    // flat-rate models only
}

// ─── Compositing ─────────────────────────────────────────────────────────────

export interface CompositeParams {
  font: FontChoice
  colour: ColourChoice
  placement: GridPosition
  captionText: string
}

// ─── Generated meme (post-composite) ─────────────────────────────────────────

export interface GeneratedMeme {
  id: string
  sessionId: string
  style: MemeStyle
  brief: MemeBrief
  baseImagePath: string | null // Supabase storage path; null for text-only
  compositePath: string        // Supabase storage path
  compositeUrl: string         // public URL for display
  captionText: string          // default caption (editable)
}

// ─── SSE event types ─────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'parsed'; data: ParsedComplaint }
  | { type: 'meme'; index: number; data: GeneratedMeme }
  | { type: 'brief'; data: MemeBrief }           // surreal brief — client generates on demand
  | { type: 'complete'; data: { sessionId: string } }
  | { type: 'error'; data: { message: string; index?: number } }

// ─── Share ────────────────────────────────────────────────────────────────────

export interface SharedMeme {
  id: string
  memeId: string
  sessionId: string
  storagePath: string
  publicUrl: string
  style: MemeStyle
  createdAt: string
}

// ─── B2B dashboard ────────────────────────────────────────────────────────────

export interface AnalyticsRow {
  id: string
  category: ComplaintCategory
  secondaryCategories: ComplaintCategory[]
  sentiment: number
  emotionalRegister: EmotionalRegister
  geoCountry: string | null
  geoRegion: string | null
  weekNumber: number
  year: number
  month: number
  createdDate: string
  topicClusterId: number | null
}

export interface TrendDataPoint {
  date: string
  count: number
  avgSentiment: number
}

export interface CategoryBreakdown {
  category: ComplaintCategory
  count: number
  percentage: number
  avgSentiment: number
}
