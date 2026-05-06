import { API_URL } from './api'
import type { SSEEvent } from './types'

export async function streamGenerate(
  complaint: string,
  sessionId: string,
  consentGiven: boolean,
  onEvent: (event: SSEEvent) => void,
  signal: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ complaint, sessionId, consentGiven }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Generation request failed: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const json = line.slice(6).trim()
        if (!json) continue
        try {
          const event = JSON.parse(json) as SSEEvent
          onEvent(event)
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
