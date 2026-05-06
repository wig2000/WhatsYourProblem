// ─── PostSendAd — brief interstitial shown after the share sheet closes ──────
// Auto-dismisses after POST_SEND_DURATION seconds.
// User can also tap anywhere to dismiss early.

import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { T } from '../lib/theme'
import { adsEnabled } from '../lib/ads'

const POST_SEND_DURATION = 4   // seconds

interface Props {
  visible: boolean
  onDismiss: () => void
}

export function PostSendAd({ visible, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(POST_SEND_DURATION)
  const progressAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!visible) {
      setRemaining(POST_SEND_DURATION)
      progressAnim.setValue(1)
      return
    }

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: POST_SEND_DURATION * 1000,
      useNativeDriver: false,
    }).start()

    setRemaining(POST_SEND_DURATION)
    const autoTimer  = setTimeout(() => onDismiss(), POST_SEND_DURATION * 1000)
    const countTimer = setInterval(() =>
      setRemaining(r => Math.max(0, r - 1)), 1000)

    return () => {
      clearTimeout(autoTimer)
      clearInterval(countTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!adsEnabled() || !visible) return null

  const barWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} onPress={onDismiss} activeOpacity={1}>
        <LinearGradient
          colors={['#2A0A3B', '#0B0410']}
          style={styles.inner}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: barWidth }]} />
          </View>

          {/* Dismiss hint */}
          <View style={styles.topRow}>
            <Text style={styles.tapToDismiss}>Tap anywhere to dismiss · {remaining}s</Text>
          </View>

          {/* Ad content */}
          <View style={styles.adArea}>
            <Text style={styles.sponsoredLabel}>SPONSORED</Text>

            {/* ── Replace with real AdMob unit when configured ───────────── */}
            <View style={styles.adPlaceholder}>
              <Text style={styles.adPlaceholderText}>Ad</Text>
            </View>
            {/*
            <BannerAd
              unitId={AD_UNITS.banner}
              size={BannerAdSize.MEDIUM_RECTANGLE}
              requestOptions={{ requestNonPersonalizedAdsOnly: false }}
            />
            */}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
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
  topRow: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
  tapToDismiss: {
    fontFamily: 'Courier New',
    fontSize: 10,
    letterSpacing: 1,
    color: T.inkSoft,
    opacity: 0.5,
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
    width: 300,
    height: 250,
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
})
