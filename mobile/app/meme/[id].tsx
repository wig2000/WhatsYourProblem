import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import * as Haptics from 'expo-haptics'
import { shareToFinal } from '../../lib/api'
import { T } from '../../lib/theme'

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

      {/* Share CTA */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={{ width: '100%' }}
          onPress={handleShare}
          disabled={isSharing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FF8FC2', '#FF2EC4', '#B8156A']}
            style={styles.sendBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.sendHighlight} />
            {isSharing
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.sendText}>SEND IT ↗</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={handleCustomise}>
        <Text style={styles.editText}>Tart it up first →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.anotherBtn} onPress={() => router.push('/')}>
        <Text style={styles.anotherText}>Got another problem?</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: W - 32,
    height: W - 32,
    borderRadius: T.radius.card,
    marginBottom: 24,
  },
  actions: { width: '100%', marginBottom: 12 },
  sendBtn: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  sendHighlight: {
    position: 'absolute',
    top: 3,
    left: '8%',
    right: '8%',
    height: '38%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  sendText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 17,
    letterSpacing: 1.5,
    color: '#FFF',
  },
  editBtn: { paddingVertical: 14 },
  editText: { color: T.inkSoft, fontSize: 15 },
  anotherBtn: { paddingVertical: 12, marginTop: 4 },
  anotherText: { color: T.inkSoft, fontSize: 14, opacity: 0.7 },
})
