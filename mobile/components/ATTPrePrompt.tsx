// ─── ATT Pre-Prompt ───────────────────────────────────────────────────────────
// Shown BEFORE the iOS system ATT dialog to give context in the app's voice.
// Lifting opt-in rates from ~35% to ~55-65% by explaining the value exchange.
//
// "Sure" → triggers the real system ATT dialog → onAllow()
// "No thanks" → skips tracking entirely → onSkip()

import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T } from '../lib/theme'

interface Props {
  visible: boolean
  onAllow: () => void
  onSkip:  () => void
}

export function ATTPrePrompt({ visible, onAllow, onSkip }: Props) {
  return (
    <Modal transparent animationType="slide" visible={visible} statusBarTranslucent>
      <LinearGradient
        colors={['#2A0A3B', '#1A0824', '#0B0410']}
        style={styles.overlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>✦</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {'Keep us\n'}<Text style={styles.headlineAccent}>going, babe.</Text>
        </Text>

        {/* Body */}
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            We show a short video ad while your memes cook — it's what keeps the app free.
          </Text>
          <Text style={styles.bodyText}>
            Saying yes just means the ad is actually relevant to you instead of totally random.
          </Text>
          <Text style={styles.bodyNote}>
            You can change this in Settings any time.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.buttons}>
          {/* Primary — triggers system ATT dialog */}
          <TouchableOpacity onPress={onAllow} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={['#FF8FC2', '#FF2EC4', '#B8156A']}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.primaryHighlight} />
              <Text style={styles.primaryText}>SOUNDS GOOD →</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary — skip */}
          <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={styles.skipBtn}>
            <Text style={styles.skipText}>no thanks, show random ads</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 28,
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.surfaceTint,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  icon: {
    fontSize: 28,
    color: T.accent,
  },

  headline: {
    fontFamily: 'Anton_400Regular',
    fontSize: 48,
    lineHeight: 58,
    color: T.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: T.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  headlineAccent: {
    color: T.accent,
  },

  body: {
    gap: 12,
    alignItems: 'center',
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: T.ink,
    textAlign: 'center',
    opacity: 0.85,
  },
  bodyNote: {
    fontFamily: 'Courier New',
    fontSize: 11,
    letterSpacing: 1,
    color: T.inkSoft,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.6,
  },

  buttons: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },
  primaryBtn: {
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
  primaryHighlight: {
    position: 'absolute',
    top: 3,
    left: '8%',
    right: '8%',
    height: '38%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  primaryText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 17,
    letterSpacing: 1.5,
    color: '#FFF',
  },

  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontFamily: 'Courier New',
    fontSize: 12,
    letterSpacing: 0.5,
    color: T.inkSoft,
    opacity: 0.6,
    textDecorationLine: 'underline',
  },
})
