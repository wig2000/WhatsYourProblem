// Sugar Hut Neon — dark club floor, magenta neon, gold trim, croc-skin texture
export const T = {
  bg:          '#0B0410',
  bgDeep:      '#1A0824',
  surface:     '#15071F',
  surfaceTint: '#220C30',
  ink:         '#FFE9F3',
  inkSoft:     '#E2A6C7',
  accent:      '#FF2EC4',   // hot magenta neon — primary action, glow
  accent2:     '#FFD24A',   // gold — trim, gems
  border:      'rgba(255,46,196,0.2)',
  radius: {
    card:  18,
    gloss: 28,
    input: 14,
    pill:  999,
  },
  shadow: {
    gloss: {
      shadowColor: '#FF2EC4',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 24,
      elevation: 8,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
  },
} as const

// Loading microcopy — rotate during generation
export const LOADING_LINES = [
  'ringing the girls…',
  'lining the lips…',
  'painting nails…',
  'finding the light…',
  'topping up the spray tan…',
  'warming up the hoops…',
  'cracking open a milkshake…',
  'sketching babe…',
]

export function randomLoadingLine() {
  return LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)]
}
