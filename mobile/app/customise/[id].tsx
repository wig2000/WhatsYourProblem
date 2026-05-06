import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, ActivityIndicator, Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import { API_URL, shareToFinal } from '../../lib/api'
import type { FontChoice, ColourChoice, GridPosition } from '../../lib/types'
import { FONT_LABELS, COLOUR_HEX, GRID_ARROWS } from '../../lib/types'

const W = Dimensions.get('window').width
const PREVIEW_SIZE = W - 32

const FONTS: FontChoice[] = ['bebas', 'inter-bold', 'caveat', 'inter']
const COLOURS: ColourChoice[] = ['white-stroke', 'black', 'yellow', 'red', 'teal', 'purple']
const GRID: GridPosition[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Tab = 'text' | 'style' | 'position'

export default function CustomiseScreen() {
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
  const [currentMemeId, setCurrentMemeId] = useState(id)
  const [isCompositing, setIsCompositing] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recomposite = useCallback(async (
    f: FontChoice, c: ColourChoice, p: GridPosition, cap: string, mid: string
  ) => {
    setIsCompositing(true)
    try {
      const res = await fetch(`${API_URL}/api/composite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeId: mid, font: f, colour: c, placement: p, captionText: cap }),
      })
      if (!res.ok) throw new Error('Composite failed')
      const data = await res.json() as { compositeUrl: string; memeId: string }
      setCompositeUrl(data.compositeUrl)
      setCurrentMemeId(data.memeId)
    } catch (err) {
      console.error('[recomposite]', err)
    } finally {
      setIsCompositing(false)
    }
  }, [])

  // Debounce recomposite on any param change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      recomposite(font, colour, placement, caption, currentMemeId)
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
        body: JSON.stringify({ memeId: currentMemeId, currentCaption: caption }),
      })
      if (!res.ok) throw new Error('Suggestion failed')
      const data = await res.json() as { caption: string }
      setCaption(data.caption)
    } catch {
      Alert.alert('Error', 'Could not generate a new caption.')
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to save memes.')
        return
      }
      const localUri = FileSystem.cacheDirectory + `meme_save_${currentMemeId}.webp`
      await FileSystem.downloadAsync(compositeUrl, localUri)
      await MediaLibrary.saveToLibraryAsync(localUri)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Saved!', 'Meme saved to your photo library.')
    } catch {
      Alert.alert('Error', 'Failed to save meme.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await shareToFinal(currentMemeId)
      const available = await Sharing.isAvailableAsync()
      if (available) {
        const localUri = FileSystem.cacheDirectory + `meme_share_${currentMemeId}.webp`
        await FileSystem.downloadAsync(compositeUrl, localUri)
        await Sharing.shareAsync(localUri, { mimeType: 'image/webp', dialogTitle: "Share your meme" })
      }
    } catch {
      Alert.alert('Error', 'Failed to share meme.')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>

        {/* Preview */}
        <View style={styles.previewWrapper}>
          <Image source={{ uri: compositeUrl }} style={styles.preview} contentFit="cover" />
          {isCompositing && (
            <View style={styles.previewOverlay}>
              <ActivityIndicator color="#FF6B35" size="large" />
            </View>
          )}
        </View>

        {/* Tab bar */}
        {!isTemplate && (
          <View style={styles.tabs}>
            {(['text', 'style', 'position'] as Tab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'text' ? 'Caption' : tab === 'style' ? 'Style' : 'Position'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Caption tab (always shown for template) */}
        {(activeTab === 'text' || isTemplate) && (
          <View style={styles.section}>
            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Edit your caption…"
              placeholderTextColor="#555"
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={suggestCaption}
              disabled={isSuggesting}
            >
              {isSuggesting
                ? <ActivityIndicator color="#FF6B35" size="small" />
                : <Text style={styles.suggestText}>✨ Suggest another caption</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Style tab */}
        {activeTab === 'style' && !isTemplate && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Font</Text>
            <View style={styles.fontGrid}>
              {FONTS.map(f => (
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

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Text Colour</Text>
            <View style={styles.colourRow}>
              {COLOURS.map(c => (
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
            <View style={styles.gridWrapper}>
              <View style={styles.posGrid}>
                {GRID.map(pos => (
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
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={handleSave}
          disabled={isSaving || isCompositing}
        >
          {isSaving
            ? <ActivityIndicator color="#FF6B35" size="small" />
            : <Text style={styles.actionBtnSecondaryText}>💾 Save</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleShare}
          disabled={isSharing || isCompositing}
        >
          {isSharing
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={styles.actionBtnPrimaryText}>🔗 Share</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
  inner: { padding: 16, paddingBottom: 100 },
  previewWrapper: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
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
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#FF6B35' },
  tabText: { color: '#666', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  section: { marginBottom: 8 },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  captionInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    marginBottom: 12,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  suggestText: { color: '#FF6B35', fontSize: 14, fontWeight: '600' },
  fontGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fontChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  fontChipActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.1)' },
  fontChipText: { color: '#888', fontSize: 14, fontWeight: '600' },
  fontChipTextActive: { color: '#FFF' },
  colourRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  colourDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colourDotActive: { borderColor: '#FFF', transform: [{ scale: 1.15 }] },
  gridWrapper: { alignItems: 'flex-start' },
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
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCellActive: { borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,0.15)' },
  posCellText: { color: '#666', fontSize: 18 },
  posCellTextActive: { color: '#FF6B35' },
  spacer: { height: 20 },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  actionBtnPrimary: { backgroundColor: '#FF6B35' },
  actionBtnPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  actionBtnSecondary: { backgroundColor: '#1A1A1A' },
  actionBtnSecondaryText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
})
