import type { MemeBrief, GeneratedMeme } from './types'

// In dev: point at local Next.js. In prod: set EXPO_PUBLIC_API_URL in .env
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://whats-your-problem.vercel.app'

export async function generateSurreal(sessionId: string, brief: MemeBrief): Promise<GeneratedMeme> {
  const res = await fetch(`${API_URL}/api/generate-surreal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, brief }),
  })
  if (!res.ok) throw new Error(`Surreal generation failed: ${res.status}`)
  return res.json()
}

export async function shareToFinal(memeId: string): Promise<{ url: string }> {
  const res = await fetch(`${API_URL}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memeId }),
  })
  if (!res.ok) throw new Error(`Share failed: ${res.status}`)
  return res.json()
}
