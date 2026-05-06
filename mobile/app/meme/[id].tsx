import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'

const W = Dimensions.get('window').width

export default function MemeDetailScreen() {
  const { id, url, caption, style } = useLocalSearchParams<{
    id: string; url: string; caption: string; style: string
  }>()
  const router = useRouter()

  const handleCustomise = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push({
      pathname: '/customise/[id]',
      params: { id, url, caption, style },
    })
  }

  return (
    <View style={styles.root}>
      <Image source={{ uri: url }} style={styles.image} contentFit="contain" />

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleCustomise}>
          <Text style={styles.btnPrimaryText}>✏️ Customise & Share</Text>
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
    width: '100%',
    marginBottom: 16,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#FF6B35' },
  btnPrimaryText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  anotherBtn: { paddingVertical: 12 },
  anotherText: { color: '#888', fontSize: 15 },
})
