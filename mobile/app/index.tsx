import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import ConsentModal from '../components/ConsentModal'
import { getConsent, setConsent } from '../lib/consent'

const MAX_CHARS = 500

export default function HomeScreen() {
  const router = useRouter()
  const [complaint, setComplaint] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  useEffect(() => {
    getConsent().then((val) => {
      setConsentGiven(val)
      setConsentChecked(true)
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    if (complaint.trim().length < 3) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (!consentChecked) return

    if (!consentGiven) {
      setShowConsent(true)
      return
    }

    const sessionId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2)}`
    router.push({
      pathname: '/generating',
      params: { complaint: complaint.trim(), sessionId, consentGiven: 'true' },
    })
  }, [complaint, consentGiven, consentChecked, router])

  const handleAccept = async () => {
    await setConsent(true)
    setConsentGiven(true)
    setShowConsent(false)
    const sessionId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2)}`
    router.push({
      pathname: '/generating',
      params: { complaint: complaint.trim(), sessionId, consentGiven: 'true' },
    })
  }

  const handleDecline = async () => {
    await setConsent(false)
    setConsentGiven(false)
    setShowConsent(false)
    const sessionId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2)}`
    router.push({
      pathname: '/generating',
      params: { complaint: complaint.trim(), sessionId, consentGiven: 'false' },
    })
  }

  const canSubmit = complaint.trim().length >= 3

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.emoji}>😤</Text>
          <Text style={styles.headline}>What's your problem?</Text>
          <Text style={styles.sub}>Tell us what's annoying you. We'll turn it into a meme.</Text>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="My neighbour's dog barks at 6am every single morning…"
            placeholderTextColor="#555"
            multiline
            maxLength={MAX_CHARS}
            value={complaint}
            onChangeText={setComplaint}
            textAlignVertical="top"
            returnKeyType="done"
          />
          <Text style={styles.charCount}>
            {complaint.length}/{MAX_CHARS}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Make My Memes 🔥</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConsentModal
        visible={showConsent}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  inner: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputWrapper: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 200,
  },
  charCount: {
    color: '#555',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
})
