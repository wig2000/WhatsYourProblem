// Static meme template library — Phase 1 starter set (5 templates).
// Images are fetched from Imgflip CDN for MVP. Phase 3: self-host ~50 templates.

export interface TemplateDefinition {
  id: string
  name: string
  url: string         // source image URL
  // Where to place top/bottom text as fractions of image dimensions
  topArea:    { yFraction: number }
  bottomArea: { yFraction: number }
}

export const TEMPLATES: Record<string, TemplateDefinition> = {
  'drake': {
    id: 'drake',
    name: 'Drake Pointing',
    url: 'https://i.imgflip.com/30b1gx.jpg',
    topArea:    { yFraction: 0.25 },
    bottomArea: { yFraction: 0.75 },
  },
  'distracted-boyfriend': {
    id: 'distracted-boyfriend',
    name: 'Distracted Boyfriend',
    url: 'https://i.imgflip.com/1ur9b0.jpg',
    topArea:    { yFraction: 0.08 },
    bottomArea: { yFraction: 0.88 },
  },
  'two-buttons': {
    id: 'two-buttons',
    name: 'Two Buttons',
    url: 'https://i.imgflip.com/1g8my4.jpg',
    topArea:    { yFraction: 0.15 },
    bottomArea: { yFraction: 0.75 },
  },
  'this-is-fine': {
    id: 'this-is-fine',
    name: 'This Is Fine',
    url: 'https://i.imgflip.com/wxica.jpg',
    topArea:    { yFraction: 0.08 },
    bottomArea: { yFraction: 0.88 },
  },
  'change-my-mind': {
    id: 'change-my-mind',
    name: 'Change My Mind',
    url: 'https://i.imgflip.com/24y43o.jpg',
    topArea:    { yFraction: 0.08 },
    bottomArea: { yFraction: 0.75 },
  },
}

export function getTemplate(id: string): TemplateDefinition | null {
  return TEMPLATES[id] ?? null
}

export async function fetchTemplateBuffer(template: TemplateDefinition): Promise<Buffer> {
  const response = await fetch(template.url)
  if (!response.ok) throw new Error(`Failed to fetch template ${template.id}: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
