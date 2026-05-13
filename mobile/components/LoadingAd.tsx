// ─── LoadingAd — full-screen overlay shown while memes generate ──────────────
// Strategy:
//   1. Show a "loading…" overlay immediately (memes are building in background)
//   2. Kick off a RewardedInterstitialAd request simultaneously
//   3. As soon as the ad is ready (~1–3s), call .show() — it takes over fullscreen
//   4. When the ad is dismissed (watched or skipped), call onDismiss to reveal the feed
//   5. Fallback: if the ad fails to load or takes >8s, dismiss the overlay anyway

import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
// react-native-google-mobile-ads requires a custom native build (EAS / bare workflow).
// It is NOT available in Expo Go. We lazy-require it inside the effect so the module
// is never imported unless adsEnabled() is true AND the native binary is present.
import { T } from '../lib/theme'
import { adsEnabled, isPersonalizedAdsAllowed, AD_UNITS } from '../lib/ads'

// Hard cap: dismiss after this many ms even if the ad never loaded
const FALLBACK_MS = 8_000

interface Props {
  onDismiss: () => void
}

export function LoadingAd({ onDismiss }: Props) {
  const [visible, setVisible] = useState(true)
  const dismissedRef = useRef(false)

  // Idempotent dismiss — safe to call from multiple listeners
  const dismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    setVisible(false)
    onDismiss()
  }

  useEffect(() => {
    // Ads disabled → skip straight to feed (also covers Expo Go dev mode)
    if (!adsEnabled()) {
      dismiss()
      return
    }

    // Lazy require: only executed when adsEnabled() is true.
    // Catches TurboModuleRegistry errors if the native binary isn't present.
    let RewardedInterstitialAd: any, AdEventType: any, RewardedAdEventType: any
    try {
      const mod = require('react-native-google-mobile-ads')
      RewardedInterstitialAd = mod.RewardedInterstitialAd
      AdEventType           = mod.AdEventType
      RewardedAdEventType   = mod.RewardedAdEventType
    } catch {
      // Native module not available (Expo Go, simulator without custom build)
      dismiss()
      return
    }

    const ad = RewardedInterstitialAd.createForAdRequest(
      AD_UNITS.rewardedInterstitial,
      { requestNonPersonalizedAdsOnly: !isPersonalizedAdsAllowed() }
    )

    const fallback = setTimeout(dismiss, FALLBACK_MS)

    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(fallback)
      // Show the video ad — it takes over the screen natively
      ad.show().catch(dismiss)
    })

    // User finished watching or dismissed the ad
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      clearTimeout(fallback)
      dismiss()
    })

    // Network error / no fill / unit not configured
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      clearTimeout(fallback)
      dismiss()
    })

    ad.load()

    return () => {
      clearTimeout(fallback)
      unsubLoaded()
      unsubClosed()
      unsubError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing to render when ads are off or already dismissed
  if (!adsEnabled() || !visible) return null

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <LinearGradient
        colors={['#2A0A3B', '#0B0410']}
        style={styles.overlay}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <ActivityIndicator size="large" color={T.accent} style={styles.spinner} />
        <Text style={styles.loadingText}>your memes are loading…</Text>
        <Text style={styles.subText}>a quick message from our sponsor</Text>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  spinner: {
    marginBottom: 8,
  },
  loadingText: {
    fontFamily: 'Courier New',
    fontSize: 13,
    letterSpacing: 1.5,
    color: T.ink,
  },
  subText: {
    fontFamily: 'Courier New',
    fontSize: 10,
    letterSpacing: 1,
    color: T.inkSoft,
    opacity: 0.5,
  },
})
