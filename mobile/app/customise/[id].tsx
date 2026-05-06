import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import { API_URL, shareToFinal } from '../../lib/api'
import { T } from '../../lib/theme'
import type { FontChoice, ColourChoice, GridPosition } from '../../lib/types'
import { FONT_LABELS, COLOUR_HEX, GRID_ARROWS } from '../../lib/types'

const W = Dimensions.get('window').width
const PREVIEW_SIZE = W - 36

const FONTS: FontChoice[] = ['bebas', 'inter-bold', 'caveat', 'inter']
const COLOURS: ColourChoice[] = ['white-stroke', 'black', 'yellow', 'red', 'teal', 'purple']
const GRID: GridPosition[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Tab = 'text' | 'style' | 'position'

export default function CustomiseScreen() {
  const insets = useSafeAreaInsets()
  const { id, url, caption: initialCaption, style } = useLocalSearchParams<{
    id: string; url: string; caption: string; style: string
  }>()
  const router = useRouter()
  const isTemplate = style === 'template'

  const [activeTab, setActiveTab] = useState<Tab>('text')
  const [caption, setCaption] = useState(initialCaption ?? '')
  const [font, setFont] = useState<FontChoice>('bebas')
  const [colour, setColour] = useState<ColourChoice>('white-stroke')
  const [placement, setPlacement] = useState<GridPosition>(9)
  const [compositeUrl, setCompositeUrl] = useState(url)
  const [shareMemeId, setShareMemeId] = useState(id)
  const originalMemeId = id
  const [isCompositing, setIsCompositing] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recomposite = useCallback(async (
    f: FontChoice, c: ColourChoice, p: GridPosition, cap: string
  ) => {
    setIsCompositing(true)
    try {
      const res = await fetch(`${API_URL}/api/composite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memeId: originalMemeId,
          font: f, colour: c, placement: p, captionText: cap,
        }),
      })
      if (!res.ok) throw new Error('Composite failed')
      const data = await res.json() as { compositeUrl: string; memeId: string }
      setCompositeUrl(data.compositeUrl)
      setShareMemeId(data.memeId)
    } catch (err) {
      console.error('[recomposite]', err)
    } finally {
      setIsCompositing(false)
    }
  }, [originalMemeId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      recomposite(font, colour, placement, caption)
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font, colour, placement, caption])

  const suggestCaption = async () => {
    setIsSuggesting(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const res = await fetch(`${API_URL}/api/suggest-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeId: originalMemeId, currentCaption: caption }),
      })
      if (!res.ok) throw new Error('Suggestion failed')
      const data = await res.json() as { caption: string }
      setCaption(data.caption)
    } catch {
      Alert.alert('Something went weird.', 'Slap it again.')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to save memes.')
        return
      }
      const localUri = FileSystem.cacheDirectory + `meme_save_${shareMemeId}.webp`
      await FileSystem.downloadAsync(compositeUrl, localUri)
      await MediaLibrary.saveToLibraryAsync(localUri)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch {
      Alert.alert('Something went weird.', 'Slap it again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await shareToFinal(shareMemeId)
      const available = await Sharing.isAvailableAsync()
      if (available) {
        const localUri = FileSystem.cacheDirectory + `meme_share_${shareMemeId}.webp`
        await FileSystem.downloadAsync(compositeUrl, localUri)
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/webp',
          dialogTitle: 'Send it to the group chat',
        })
      }
    } catch {
      Alert.alert('Something went weird.', 'Slap it again.')
    } finally {
      setIsSharing(false)
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'text', label: 'Caption' },
    { id: 'style', label: 'Style' },
    { id: 'position', label: 'Position' },
  ]

  return (
    <View style={styles.root}>

      {/* Scrollable content — flex:1 so it fills space above the action bar */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={styles.previewWrapper}>
          <Image source={{ uri: compositeUrl }} style={styles.preview} contentFit="cover" />
          {isCompositing && (
            <View style={styles.previewOverlay}>
              <ActivityIndicator color={T.accent} size="large" />
            </View>
          )}
        </View>

        {/* Tab bar */}
        {!isTemplate && (
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Caption tab */}
        {(activeTab === 'text' || isTemplate) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Caption</Text>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Edit your caption…"
              placeholderTextColor={T.inkSoft}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={suggestCaption}
              disabled={isSuggesting}
            >
              {isSuggesting
                ? <ActivityIndicator color={T.accent} size="small" />
                : <Text style={styles.suggestText}>suggest another →</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Style tab */}
        {activeTab === 'style' && !isTemplate && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Font</Text>
            <View style={styles.fontGrid}>
              {FONTS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.fontChip, font === f && styles.fontChipActive]}
                  onPress={() => setFont(f)}
                >
                  <Text style={[styles.fontChipText, font === f && styles.fontChipTextActive]}>
                    {FONT_LABELS[f]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Colour</Text>
            <View style={styles.colourRow}>
              {COLOURS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colourDot,
                    { backgroundColor: COLOUR_HEX[c].fill },
                    colour === c && styles.colourDotActive,
                  ]}
                  onPress={() => setColour(c)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Position tab */}
        {activeTab === 'position' && !isTemplate && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Text Position</Text>
            <View style={styles.posGrid}>
              {GRID.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.posCell, placement === pos && styles.posCellActive]}
                  onPress={() => setPlacement(pos)}
                >
                  <Text style={[styles.posCellText, placement === pos && styles.posCellTextActive]}>
                    {GRID_ARROWS[pos]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action bar — normal flex child, sits below ScrollView, never overlaps it */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={isSaving || isCompositing}
        >
          {isSaving
            ? <ActivityIndicator color={T.accent} size="small" />
            : <Text style={styles.saveBtnText}>↓ Save</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={handleShare}
          disabled={isSharing || isCompositing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              isSharing || isCompositing
                ? ['#3A1040', '#2A0C30', '#1E0824']
                : ['#FF8FC2', '#FF2EC4', '#B8156A']
            }
            style={styles.shareBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.shareBtnHighlight} />
            {isSharing
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.shareBtnText}>SHARE IT ↗</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  inner: { padding: 18, paddingBottom: 8 },

  previewWrapper: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: T.radius.card,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: T.surfaceTint,
  },
  preview: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: T.surfaceTint,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: T.accent,
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: { color: T.inkSoft, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFF', fontFamily: 'Anton_400Regular', letterSpacing: 0.5 },

  section: { marginBottom: 8 },
  sectionLabel: {
    fontFamily: 'Courier New',
    color: T.inkSoft,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  captionInput: {
    backgroundColor: T.surfaceTint,
    borderRadius: T.radius.input,
    padding: 16,
    color: T.ink,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  suggestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  suggestText: {
    color: T.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  fontGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fontChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceTint,
  },
  fontChipActive: {
    borderColor: T.accent,
    backgroundColor: 'rgba(255,46,196,0.12)',
  },
  fontChipText: { color: T.inkSoft, fontSize: 14, fontWeight: '600' },
  fontChipTextActive: { color: T.ink },

  colourRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colourDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourDotActive: {
    borderColor: T.accent,
    transform: [{ scale: 1.2 }],
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },

  posGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 156,
    gap: 6,
  },
  posCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surfaceTint,
  },
  posCellActive: {
    borderColor: T.accent,
    backgroundColor: 'rgba(255,46,196,0.15)',
  },
  posCellText: { color: T.inkSoft, fontSize: 18 },
  posCellTextActive: { color: T.accent },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  saveBtn: {
    width: 80,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surfaceTint,
    borderWidth: 1,
    borderColor: T.border,
  },
  saveBtnText: { color: T.ink, fontSize: 14, fontWeight: '700' },
  shareBtn: {
    height: 56,
    borderRadius: 28,
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
  shareBtnHighlight: {
    position: 'absolute',
    top: 2,
    left: '10%',
    right: '10%',
    height: '38%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  shareBtnText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 16,
    letterSpacing: 1.2,
    color: '#FFF',
  },
})
