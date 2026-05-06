import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import { shareToFinal } from '../../lib/api'

const W = Dimensions.get('window').width

export default function MemeDetailScreen() {
  const { id, url, caption, style } = useLocalSearchParams<{
    id: string; url: string; caption: string; style: string
  }>()
  const router = useRouter()
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      await shareToFinal(id)
      const available = await Sharing.isAvailableAsync()
      if (available) {
        const localUri = FileSystem.cacheDirectory + `meme_share_${id}.webp`
        await FileSystem.downloadAsync(url, localUri)
        await Sharing.shareAsync(localUri, { mimeType: 'image/webp', dialogTitle: 'Share your meme' })
      }
    } catch {
      Alert.alert('Error', 'Failed to share meme.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCustomise = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({
      pathname: '/customise/[id]',
      params: { id, url, caption, style },
    })
  }

  return (
    <View style={styles.root}>
      <Image source={{ uri: url }} style={styles.image} contentFit="contain" />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleShare}
          disabled={isSharing}
        >
          {isSharing
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.btnPrimaryText}>🔗 Share</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={handleCustomise}>
        <Text style={styles.editText}>✏️ Edit before sharing</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.anotherBtn} onPress={() => router.push('/')}>
        <Text style={styles.anotherText}>Got another problem? 😤</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: W - 32,
    height: W - 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  actions: { width: '100%', marginBottom: 12 },
  btn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnPrimary: { backgroundColor: '#FF6B35' },
  btnPrimaryText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  editBtn: { paddingVertical: 12 },
  editText: { color: '#888', fontSize: 15 },
  anotherBtn: { paddingVertical: 12, marginTop: 4 },
  anotherText: { color: '#555', fontSize: 14 },
})
