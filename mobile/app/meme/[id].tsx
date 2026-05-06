import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'
import * as Haptics from 'expo-haptics'
import * as FileSystem from 'expo-file-system/legacy'
import { shareToFinal } from '../../lib/api'

const W = Dimensions.get('window').width

export default function MemeDetailScreen() {
  const { id, url } = useLocalSearchParams<{ id: string; url: string }>()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to save memes.')
        return
      }
      const localUri = FileSystem.cacheDirectory + `meme_${id}.jpg`
      await FileSystem.downloadAsync(url, localUri)
      await MediaLibrary.saveToLibraryAsync(localUri)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Saved!', 'Meme saved to your photo library.')
    } catch (e) {
      Alert.alert('Error', 'Failed to save meme.')
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    setSharing(true)
    try {
      const { url: finalUrl } = await shareToFinal(id)
      const available = await Sharing.isAvailableAsync()
      if (available) {
        const localUri = FileSystem.cacheDirectory + `meme_share_${id}.jpg`
        await FileSystem.downloadAsync(url, localUri)
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your meme',
        })
      } else {
        Alert.alert('Share link', finalUrl)
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch (e) {
      Alert.alert('Error', 'Failed to share meme.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: url }}
        style={styles.image}
        contentFit="contain"
      />

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FF6B35" />
          ) : (
            <Text style={styles.btnSecondaryText}>💾 Save</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary]}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnPrimaryText}>🔗 Share</Text>
          )}
        </TouchableOpacity>
      </View>

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
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPrimary: {
    backgroundColor: '#FF6B35',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#1A1A1A',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  anotherBtn: {
    paddingVertical: 12,
  },
  anotherText: {
    color: '#888',
    fontSize: 15,
  },
})
