// ─── LoadingAd — full-screen overlay shown while memes generate ──────────────
// Memes load immediately in the background.
// This overlay appears for up to AD_DURATION seconds.
// Skip button appears after SKIP_DELAY seconds.
// Auto-dismisses when timer hits zero.

import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T } from '../lib/theme'
import { adsEnabled } from '../lib/ads'

const AD_DURATION  = 5   // seconds before auto-dismiss
const SKIP_DELAY   = 3   // seconds before skip button appears

interface Props {
  onDismiss: () => void
}

export function LoadingAd({ onDismiss }: Props) {
  const [visible,    setVisible]    = useState(true)
  const [canSkip,    setCanSkip]    = useState(false)
  const [remaining,  setRemaining]  = useState(AD_DURATION)
  const progressAnim = useRef(new Animated.Value(1)).current

  const dismiss = () => {
    setVisible(false)
    onDismiss()
  }

  useEffect(() => {
    if (!adsEnabled()) { onDismiss(); return }

    // Animate progress bar left→right
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: AD_DURATION * 1000,
      useNativeDriver: false,
    }).start()

    const skipTimer  = setTimeout(() => setCanSkip(true),    SKIP_DELAY   * 1000)
    const autoTimer  = setTimeout(() => dismiss(),            AD_DURATION  * 1000)
    const countTimer = setInterval(() =>
      setRemaining(r => Math.max(0, r - 1)), 1000)

    return () => {
      clearTimeout(skipTimer)
      clearTimeout(autoTimer)
      clearInterval(countTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!adsEnabled() || !visible) return null

  const barWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <LinearGradient
        colors={['#2A0A3B', '#0B0410']}
        style={styles.overlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Progress bar — drains while ad plays */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: barWidth }]} />
        </View>

        {/* Ad content */}
        <View style={styles.adArea}>
          <Text style={styles.sponsoredLabel}>SPONSORED</Text>

          {/* ── Replace with real AdMob unit when configured ─────────────── */}
          <View style={styles.adPlaceholder}>
            <Text style={styles.adPlaceholderText}>Ad</Text>
          </View>
          {/*
          <BannerAd
            unitId={AD_UNITS.banner}
            size={BannerAdSize.LEADERBOARD}
            requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          />
          */}
        </View>

        {/* Footer — loading message + skip/countdown */}
        <View style={styles.footer}>
          <Text style={styles.loadingText}>your memes are loading…</Text>
          {canSkip ? (
            <TouchableOpacity onPress={dismiss} style={styles.skipBtn} activeOpacity={0.75}>
              <Text style={styles.skipText}>Skip  →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.countdown}>
              <Text style={styles.countdownText}>{remaining}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },

  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,46,196,0.15)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: T.accent,
  },

  adArea: {
    alignItems: 'center',
    gap: 8,
  },
  sponsoredLabel: {
    fontFamily: 'Courier New',
    fontSize: 9,
    letterSpacing: 2,
    color: T.inkSoft,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  adPlaceholder: {
    width: 320,
    height: 180,
    borderRadius: T.radius.card,
    backgroundColor: T.surfaceTint,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adPlaceholderText: {
    color: T.inkSoft,
    opacity: 0.4,
    fontFamily: 'Anton_400Regular',
    fontSize: 14,
    letterSpacing: 2,
  },

  footer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    letterSpacing: 1.5,
    color: T.inkSoft,
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skipText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 13,
    letterSpacing: 1.2,
    color: T.ink,
  },
  countdown: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontFamily: 'Anton_400Regular',
    fontSize: 16,
    color: T.inkSoft,
  },
})
