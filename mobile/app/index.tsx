import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { T } from '../lib/theme'

const MAX_CHARS = 500

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function GemDot({ color }: { color: string }) {
  return <View style={[styles.gem, { backgroundColor: color }]} />
}

function LipglossButton({
  label, onPress, disabled,
}: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{ width: '100%' }}
    >
      <LinearGradient
        colors={
          disabled
            ? ['#3A1040', '#2A0C30', '#1E0824']
            : ['#FF8FC2', '#FF2EC4', '#B8156A']
        }
        style={styles.lipBtn}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.lipBtnHighlight} />
        <Text style={[styles.lipBtnText, disabled && styles.lipBtnTextDisabled]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [complaint, setComplaint] = useState('')
  const canSubmit = complaint.trim().length >= 3

  const handleGenerate = useCallback(async () => {
    if (!canSubmit) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const sessionId = uuid()
    router.push({ pathname: '/feed', params: { complaint: complaint.trim(), sessionId } })
  }, [complaint, canSubmit, router])

  return (
    <LinearGradient
      colors={['#4A0E5B', '#1A0824', '#0B0410']}
      style={styles.root}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inner}>

            {/* Top: eyebrow + headline */}
            <View style={styles.top}>
              <View style={styles.eyebrowRow}>
                <Text style={styles.eyebrow}>WYP?</Text>
                <View style={styles.gemRow}>
                  <GemDot color={T.accent} />
                  <GemDot color={T.accent2} />
                  <GemDot color={T.accent} />
                </View>
              </View>

              <Text style={styles.headline}>
                {'Right\nbabe.\n'}<Text style={styles.headlineAccent}>What's the{'\n'}problem?</Text>
              </Text>
            </View>

            {/* Spacer — pushes input + CTA to the bottom */}
            <View style={styles.spacer} />

            {/* Bottom: input then CTA */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="My neighbour plays drum and bass at 3am on a Tuesday…"
                placeholderTextColor={T.inkSoft}
                multiline
                maxLength={MAX_CHARS}
                value={complaint}
                onChangeText={setComplaint}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{complaint.length}/{MAX_CHARS}</Text>
            </View>

            <LipglossButton
              label={canSubmit ? 'SHOW ME THE MEMES →' : 'SPILL THE TEA →'}
              onPress={handleGenerate}
              disabled={!canSubmit}
            />

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
  },

  top: {},

  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: 'Courier New',
    fontSize: 11,
    letterSpacing: 2.5,
    color: T.inkSoft,
  },
  gemRow: { flexDirection: 'row', gap: 6 },
  gem: { width: 9, height: 9, borderRadius: 5 },

  headline: {
    fontFamily: 'Anton_400Regular',
    fontSize: 52,
    lineHeight: 66,
    color: T.ink,
    letterSpacing: -0.5,
    textShadowColor: T.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  headlineAccent: {
    color: T.accent,
  },

  inputCard: {
    backgroundColor: T.surface,
    borderRadius: T.radius.gloss,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...T.shadow.gloss,
  },
  input: {
    fontSize: 17,
    color: T.ink,
    minHeight: 100,
    lineHeight: 26,
  },
  charCount: {
    color: T.inkSoft,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 8,
    fontFamily: 'Courier New',
  },

  spacer: { flex: 1, minHeight: 24 },

  lipBtn: {
    height: 62,
    borderRadius: 31,
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
  lipBtnHighlight: {
    position: 'absolute',
    top: 3,
    left: '8%',
    right: '8%',
    height: '38%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  lipBtnText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 17,
    letterSpacing: 1.5,
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lipBtnTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
})
