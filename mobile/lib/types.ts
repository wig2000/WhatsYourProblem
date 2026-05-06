export type MemeStyle = 'surreal' | 'realistic' | 'illustration' | 'template' | 'text-only'

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
