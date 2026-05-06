import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import type { GeneratedMeme, MemeStyle } from '../lib/types'

const CARD_SIZE = (Dimensions.get('window').width - 48) / 2

const STYLE_LABELS: Record<MemeStyle, string> = {
  surreal: '🌀 Surreal',
  realistic: '📸 Realistic',
  template: '🐸 Template',
  illustration: '🎨 Illustration',
  'text-only': '✍️ Text',
}

interface Props {
  meme: GeneratedMeme | null
  style: MemeStyle
  loading?: boolean
  fullWidth?: boolean
}

export default function MemeCard({ meme, style, loading, fullWidth }: Props) {
  const router = useRouter()
  const size = fullWidth ? Dimensions.get('window').width - 32 : CARD_SIZE

  return (
    <TouchableOpacity
      style={[styles.card, { width: size, height: size }]}
      disabled={!meme}
      onPress={() => meme && router.push({ pathname: '/meme/[id]', params: { id: meme.id, url: meme.compositeUrl, caption: meme.captionText, style: meme.style } })}
      activeOpacity={0.85}
    >
      {meme ? (
        <>
          <Image source={{ uri: meme.compositeUrl }} style={styles.image} contentFit="cover" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{STYLE_LABELS[style]}</Text>
          </View>
        </>
      ) : loading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator color="#FF6B35" />
          <Text style={styles.loadingLabel}>{STYLE_LABELS[style]}</Text>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.loadingLabel}>{STYLE_LABELS[style]}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    margin: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingLabel: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
})
