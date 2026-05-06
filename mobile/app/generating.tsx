import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { streamGenerate } from '../lib/sse'
import MemeCard from '../components/MemeCard'
import type { GeneratedMeme, MemeStyle, ParsedComplaint } from '../lib/types'

const SLOT_ORDER: MemeStyle[] = ['text-only', 'template', 'surreal', 'realistic', 'illustration']

export default function GeneratingScreen() {
  const { complaint, sessionId, consentGiven } = useLocalSearchParams<{
    complaint: string
    sessionId: string
    consentGiven: string
  }>()
  const router = useRouter()

  const [parsed, setParsed] = useState<ParsedComplaint | null>(null)
  const [memes, setMemes] = useState<Record<MemeStyle, GeneratedMeme | null>>({
    surreal: null,
    realistic: null,
    illustration: null,
    template: null,
    'text-only': null,
  })
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!complaint || !sessionId) return

    const ac = new AbortController()
    abortRef.current = ac

    streamGenerate(
      complaint,
      sessionId,
      consentGiven === 'true',
      (event) => {
        if (event.type === 'parsed') setParsed(event.data)
        if (event.type === 'meme') {
          setMemes((prev) => ({ ...prev, [event.data.style]: event.data }))
        }
        if (event.type === 'complete') setDone(true)
        if (event.type === 'error' && !event.data.index) {
          setError(event.data.message)
        }
      },
      ac.signal
    ).catch((err) => {
      if (err.name !== 'AbortError') setError(err.message)
    })

    return () => ac.abort()
  }, [complaint, sessionId, consentGiven])

  const readyMemes = SLOT_ORDER.map((style) => memes[style]).filter(Boolean) as GeneratedMeme[]
  const totalReady = readyMemes.length

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
      {parsed && (
        <View style={styles.parsedCard}>
          <Text style={styles.parsedLabel}>Your rant, summarised</Text>
          <Text style={styles.parsedPremise}>{parsed.premise}</Text>
          <Text style={styles.parsedMeta}>
            {parsed.category} · {parsed.emotionalRegister}
          </Text>
        </View>
      )}

      {!parsed && !error && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Analysing your problem…</Text>
        </View>
      )}

      {parsed && !done && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {totalReady}/5 memes ready{totalReady < 5 ? '…' : ''}
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Something went wrong: {error}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorLink}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2-column grid */}
      <View style={styles.grid}>
        {SLOT_ORDER.slice(0, 4).reduce<React.ReactNode[]>((rows, style, i) => {
          if (i % 2 === 0) {
            const nextStyle = SLOT_ORDER[i + 1]
            rows.push(
              <View style={styles.row} key={style}>
                <MemeCard meme={memes[style]} style={style} loading={!memes[style] && !done} />
                {nextStyle && (
                  <MemeCard meme={memes[nextStyle]} style={nextStyle} loading={!memes[nextStyle] && !done} />
                )}
              </View>
            )
          }
          return rows
        }, [])}

        {/* Text-only — full width at bottom */}
        <MemeCard
          meme={memes['text-only']}
          style="text-only"
          loading={!memes['text-only'] && !done}
          fullWidth
        />
      </View>

      {done && totalReady === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No memes generated — check the API is reachable.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.errorLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  inner: {
    padding: 16,
    paddingBottom: 40,
  },
  parsedCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  parsedLabel: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  parsedPremise: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  parsedMeta: {
    color: '#666',
    fontSize: 13,
  },
  statusBar: {
    marginBottom: 16,
  },
  statusText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#2A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#FF6B35',
    fontSize: 14,
    textAlign: 'center',
  },
  errorLink: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
})
