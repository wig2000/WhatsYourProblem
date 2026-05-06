import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { streamGenerate } from '../lib/sse'
import { shareToFinal } from '../lib/api'
import { T, randomLoadingLine } from '../lib/theme'
import { adsEnabled } from '../lib/ads'
import { LoadingAd } from '../components/LoadingAd'
import { AdSlot } from '../components/AdSlot'
import { PostSendAd } from '../components/PostSendAd'
import type { GeneratedMeme, MemeStyle, ParsedComplaint } from '../lib/types'

const W = Dimensions.get('window').width
const CARD_SIZE = W - 36

// Display order — image types first, text-only last
const FEED_ORDER: MemeStyle[] = ['template', 'illustration', 'realistic', 'surreal', 'text-only']

const STYLE_LABELS: Record<MemeStyle, string> = {
  'text-only': 'Text',
  template: 'Template',
  illustration: 'Illustration',
  realistic: 'Realistic',
  surreal: 'Surreal',
}

const STYLE_LOADING: Record<MemeStyle, string> = {
  'text-only': 'writing the caption…',
  template: 'finding the right format…',
  illustration: 'sketching babe…',
  realistic: 'finding the light…',
  surreal: 'painting nails…',
}

// ── Shimmer skeleton card — all pending cards pulse equally ──────────────────
function SkeletonCard({ style }: { style: MemeStyle }) {
  const pulse = useRef(new Animated.Value(0.25)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [pulse])

  return (
    <View style={[sk.card, { width: CARD_SIZE, height: CARD_SIZE }]}>
      <Animated.View style={[sk.shimmer, { opacity: pulse }]} />
      <View style={sk.inner}>
        <Text style={sk.label}>{STYLE_LABELS[style].toUpperCase()}</Text>
        <Text style={sk.sub}>{STYLE_LOADING[style]}</Text>
      </View>
    </View>
  )
}

const sk = StyleSheet.create({
  card: {
    borderRadius: T.radius.card,
    overflow: 'hidden',
    backgroundColor: T.surfaceTint,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: T.border,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.accent2,
    opacity: 0.3,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'Anton_400Regular',
    fontSize: 14,
    letterSpacing: 1.5,
    color: T.ink,
  },
  sub: {
    fontSize: 12,
    color: T.inkSoft,
    letterSpacing: 0.5,
  },
})

// ── Action row (shown when card is ready) ────────────────────────────────────
function ActionRow({
  meme,
  onShare,
  onEdit,
  onSave,
  sharing,
}: {
  meme: GeneratedMeme
  onShare: () => void
  onEdit: () => void
  onSave: () => void
  sharing: boolean
}) {
  return (
    <View style={ar.row}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onShare} disabled={sharing} activeOpacity={0.85}>
        <LinearGradient
          colors={['#FF8FC2', '#FF2EC4', '#B8156A']}
          style={ar.sendBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={ar.sendHighlight} />
          {sharing
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={ar.sendText}>SEND IT →</Text>
          }
        </LinearGradient>
      </TouchableOpacity>

      {[
        { label: 'SAVE', onPress: onSave },
        { label: 'EDIT', onPress: onEdit },
      ].map((a) => (
        <TouchableOpacity key={a.label} style={ar.circle} onPress={a.onPress} activeOpacity={0.75}>
          <Text style={ar.circleText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const ar = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  sendBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  sendHighlight: {
    position: 'absolute',
    top: 2,
    left: '10%',
    right: '10%',
    height: '38%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sendText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 15,
    letterSpacing: 1.2,
    color: '#FFF',
  },
  circle: {
    width: 56,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,46,196,0.2)',
  },
  circleText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 11,
    letterSpacing: 1,
    color: T.inkSoft,
  },
})

// ── Main feed screen ──────────────────────────────────────────────────────────
export default function FeedScreen() {
  const { complaint, sessionId } = useLocalSearchParams<{
    complaint: string
    sessionId: string
  }>()
  const router = useRouter()

  const [_parsed, setParsed] = useState<ParsedComplaint | null>(null)
  const [memes, setMemes] = useState<Record<MemeStyle, GeneratedMeme | null>>({
    surreal: null,
    realistic: null,
    illustration: null,
    template: null,
    'text-only': null,
  })
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [loadingAdDismissed, setLoadingAdDismissed] = useState(false)
  const [postSendAdVisible, setPostSendAdVisible] = useState(false)
  const [loadingLine] = useState(randomLoadingLine)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!complaint || !sessionId) return

    const ac = new AbortController()
    abortRef.current = ac

    streamGenerate(
      complaint,
      sessionId,
      true, // consent via inline disclosure
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
  }, [complaint, sessionId])

  const readyCount = FEED_ORDER.filter((s) => !!memes[s]).length

  const handleShare = useCallback(async (meme: GeneratedMeme) => {
    setSharingId(meme.id)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await shareToFinal(meme.id)
      const available = await Sharing.isAvailableAsync()
      if (available) {
        const localUri = FileSystem.cacheDirectory + `meme_share_${meme.id}.webp`
        await FileSystem.downloadAsync(meme.compositeUrl, localUri)
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/webp',
          dialogTitle: 'Send it to the group chat',
        })
      }
      // Show post-send ad after share sheet closes
      if (adsEnabled()) setPostSendAdVisible(true)
    } catch {
      Alert.alert('Something went weird.', 'Slap it again.')
    } finally {
      setSharingId(null)
    }
  }, [])

  const handleSave = useCallback(async (meme: GeneratedMeme) => {
    setSavingId(meme.id)
    try {
      // Dynamic import to keep bundle lean
      const MediaLibrary = await import('expo-media-library')
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to save memes.')
        return
      }
      const localUri = FileSystem.cacheDirectory + `meme_save_${meme.id}.webp`
      await FileSystem.downloadAsync(meme.compositeUrl, localUri)
      await MediaLibrary.saveToLibraryAsync(localUri)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Something went weird.', 'Slap it again.')
    } finally {
      setSavingId(null)
    }
  }, [])

  const handleEdit = useCallback(async (meme: GeneratedMeme) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: '/customise/[id]',
      params: {
        id: meme.id,
        url: meme.compositeUrl,
        caption: meme.captionText,
        style: meme.style,
      },
    })
  }, [router])

  return (
    <LinearGradient
      colors={['#2A0A3B', '#1A0824', '#0B0410']}
      style={styles.root}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {/* ── Placement 1: full-screen loading ad (memes load in background) ── */}
      <LoadingAd onDismiss={() => setLoadingAdDismissed(true)} />

      {/* ── Placement 4: post-send interstitial ────────────────────────────── */}
      <PostSendAd
        visible={postSendAdVisible}
        onDismiss={() => setPostSendAdVisible(false)}
      />
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerLink}>← EDIT RANT</Text>
          </TouchableOpacity>
          <Text style={styles.headerStatus}>
            {done
              ? 'ALL 5 READY ✦'
              : error
              ? 'SOMETHING WENT WEIRD'
              : readyCount > 0
              ? `${readyCount}/5 READY · COOKING…`
              : 'COOKING ✦'
            }
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {'Tap '}
          <Text style={styles.titleAccent}>send</Text>
          {' on the\none that nails it.'}
        </Text>
        <Text style={styles.titleSub}>
          quickest one's at the top — others are still {loadingLine}
        </Text>

        {/* Progress strip */}
        <View style={styles.progressStrip}>
          {FEED_ORDER.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                !!memes[s] && styles.progressDotReady,
              ]}
            />
          ))}
        </View>

        {/* Error state */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>Something's gone weird. Slap it again.</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.errorLink}>Go back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Meme cards — vertical feed */}
        <View style={styles.feed}>
          {FEED_ORDER.map((style, index) => {
            const meme = memes[style]

            return (
              <View key={style}>
                <View style={styles.cardWrapper}>
                  {/* Style tag */}
                  <View style={[
                    styles.styleTag,
                    meme ? styles.styleTagReady : styles.styleTagPending,
                  ]}>
                    {!meme && <View style={styles.styleTagDot} />}
                    <Text style={[
                      styles.styleTagText,
                      !meme && styles.styleTagTextPending,
                    ]}>
                      {STYLE_LABELS[style]}
                    </Text>
                  </View>

                  {/* Card — surreal skeleton shows an ad while waiting */}
                  {meme ? (
                    <Image
                      source={{ uri: meme.compositeUrl }}
                      style={[styles.image, { width: CARD_SIZE, height: CARD_SIZE }]}
                      contentFit="cover"
                    />
                  ) : style === 'surreal' && adsEnabled() ? (
                    // ── Placement 2: ad inside a pending tile ──────────────
                    <View style={[sk.card, { width: CARD_SIZE, height: CARD_SIZE }]}>
                      <View style={sk.inner}>
                        <Text style={sk.label}>SPONSORED</Text>
                        {/* Replace View below with BannerAd when AdMob is configured */}
                        <View style={styles.tileAdPlaceholder}>
                          <Text style={styles.tileAdText}>Ad</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <SkeletonCard style={style} />
                  )}

                  {/* Action row */}
                  {meme ? (
                    <ActionRow
                      meme={meme}
                      onShare={() => handleShare(meme)}
                      onEdit={() => handleEdit(meme)}
                      onSave={() => handleSave(meme)}
                      sharing={sharingId === meme.id || savingId === meme.id}
                    />
                  ) : (
                    <View style={styles.pendingRow}>
                      <Text style={styles.pendingText}>almost ready…</Text>
                    </View>
                  )}
                </View>

                {/* ── Placement 3: banner between tiles at positions 2 and 4 ── */}
                {(index === 1 || index === 3) && <AdSlot />}
              </View>
            )
          })}
        </View>

        {/* Try again */}
        <TouchableOpacity style={styles.tryAgainBtn} onPress={() => router.back()}>
          <Text style={styles.tryAgainText}>None of these — try again</Text>
        </TouchableOpacity>

        {/* Disclosure */}
        <Text style={styles.disclosure}>
          Complaints are anonymised and used to track trends.
        </Text>

      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { padding: 18, paddingTop: 60, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLink: {
    fontFamily: 'Courier New',
    fontSize: 10,
    letterSpacing: 1.5,
    color: T.inkSoft,
  },
  headerStatus: {
    fontFamily: 'Courier New',
    fontSize: 10,
    letterSpacing: 1.5,
    color: T.inkSoft,
  },

  title: {
    fontFamily: 'Anton_400Regular',
    fontSize: 34,
    lineHeight: 44,
    color: T.ink,
    letterSpacing: -0.5,
    textShadowColor: T.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    marginBottom: 8,
  },
  titleAccent: {
    color: T.accent,
  },
  titleSub: {
    fontSize: 13,
    fontStyle: 'italic',
    color: T.inkSoft,
    marginBottom: 16,
  },

  progressStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,46,196,0.15)',
  },
  progressDotReady: {
    backgroundColor: T.accent,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },

  errorCard: {
    backgroundColor: T.surface,
    borderRadius: T.radius.card,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    gap: 10,
  },
  errorText: { color: T.ink, fontSize: 14, textAlign: 'center' },
  errorLink: {
    color: T.accent,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  feed: { gap: 28 },

  cardWrapper: { position: 'relative' },

  styleTag: {
    position: 'absolute',
    top: -10,
    left: 14,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  styleTagReady: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  styleTagPending: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,46,196,0.2)',
    opacity: 0.7,
  },
  styleTagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.accent,
  },
  styleTagText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 10,
    letterSpacing: 1.4,
    color: T.ink,
    textTransform: 'uppercase',
  },
  styleTagTextPending: {
    color: T.inkSoft,
  },

  image: {
    borderRadius: T.radius.card,
    backgroundColor: T.surfaceTint,
  },

  tileAdPlaceholder: {
    width: 300,
    height: 180,
    borderRadius: T.radius.card,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileAdText: {
    color: T.inkSoft,
    opacity: 0.3,
    fontFamily: 'Anton_400Regular',
    fontSize: 14,
    letterSpacing: 2,
  },

  pendingRow: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 10,
  },
  pendingText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: T.inkSoft,
    letterSpacing: 1,
  },

  tryAgainBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 16,
    marginBottom: 16,
  },
  tryAgainText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 13,
    letterSpacing: 1,
    color: T.ink,
  },

  disclosure: {
    textAlign: 'center',
    fontSize: 11,
    color: T.inkSoft,
    opacity: 0.6,
    lineHeight: 16,
    paddingBottom: 8,
  },
})
