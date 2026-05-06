import { API_URL } from './api'
import type { SSEEvent } from './types'

export function streamGenerate(
  complaint: string,
  sessionId: string,
  consentGiven: boolean,
  onEvent: (event: SSEEvent) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}/api/generate`)
    xhr.setRequestHeader('Content-Type', 'application/json')

    let cursor = 0

    function parseChunk(chunk: string) {
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const json = line.slice(6).trim()
        if (!json) continue
        try {
          const event = JSON.parse(json) as SSEEvent
          onEvent(event)
        } catch {
          // malformed line — skip
        }
      }
    }

    xhr.onprogress = () => {
      const newText = xhr.responseText.slice(cursor)
      cursor = xhr.responseText.length
      parseChunk(newText)
    }

    xhr.onload = () => {
      // parse any final chunk not caught by onprogress
      const remaining = xhr.responseText.slice(cursor)
      if (remaining) parseChunk(remaining)
      resolve()
    }

    xhr.onerror = () => reject(new Error(`Request failed: ${xhr.status}`))
    xhr.ontimeout = () => reject(new Error('Request timed out'))
    xhr.timeout = 120_000

    signal.addEventListener('abort', () => {
      xhr.abort()
      const err = new Error('Aborted')
      err.name = 'AbortError'
      reject(err)
    })

    xhr.send(JSON.stringify({ complaint, sessionId, consentGiven }))
  })
}
